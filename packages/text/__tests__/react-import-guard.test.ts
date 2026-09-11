import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workspaceRoot = path.resolve(packageRoot, '../..')

const SCAN_ROOTS = ['src', '__tests__', '__tests__/fixtures'] as const
const CODE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx'])
const IGNORED_DIRECTORIES = new Set(['.git', '.test-tmp', 'coverage', 'dist', 'node_modules'])

const LEGACY_RUNTIME_PACKAGE = ['re', 'act'].join('')
const LEGACY_DOM_PACKAGE = `${LEGACY_RUNTIME_PACKAGE}-dom`
const LEGACY_TYPES_PACKAGE = `@types/${LEGACY_RUNTIME_PACKAGE}`
const LEGACY_TYPES_DOM_PACKAGE = `@types/${LEGACY_DOM_PACKAGE}`
const LEGACY_RUNTIME_IMPORT_RE = new RegExp(
  `import\\s+${LEGACY_RUNTIME_PACKAGE}(?:\\s*,[^;]*)?\\s+from\\s+["']${LEGACY_RUNTIME_PACKAGE}["']|` +
    `import\\s+\\*\\s+as\\s+${LEGACY_RUNTIME_PACKAGE}\\s+from\\s+["']${LEGACY_RUNTIME_PACKAGE}["']`,
  'i',
)

type RueImportHit = {
  file: string
  line: number
  source: string
}

type SourceHit = {
  file: string
  line: number
  source: string
}

const RUE_RUNTIME_SOURCE_RE = new RegExp(
  `from\\s+["']${LEGACY_RUNTIME_PACKAGE}["']|` +
    `from\\s+["']${LEGACY_DOM_PACKAGE}(?:\\/[^"']*)?["']|` +
    `import\\(["']${LEGACY_RUNTIME_PACKAGE}["']\\)|` +
    `import\\(["']${LEGACY_DOM_PACKAGE}(?:\\/[^"']*)?["']\\)|` +
    `\\b${LEGACY_RUNTIME_PACKAGE}\\.`,
  'i',
)
const REMOVED_TEXT_COMPAT_PACKAGE = ['@rue-js/text', 'rue-compat'].join('-')
const REMOVED_TEXT_COMPAT_DIRECTORY = ['text', 'rue', 'compat'].join('-')

async function collectSourceFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async entry => {
      const absolutePath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) {
          return []
        }
        return collectSourceFiles(absolutePath)
      }

      if (entry.isFile() && CODE_EXTENSIONS.has(path.extname(entry.name))) {
        return [absolutePath]
      }

      return []
    }),
  )

  return files.flat()
}

async function collectFilesNamed(dir: string, fileName: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async entry => {
      const absolutePath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) {
          return []
        }
        return collectFilesNamed(absolutePath, fileName)
      }

      if (entry.isFile() && entry.name === fileName) {
        return [absolutePath]
      }

      return []
    }),
  )

  return files.flat()
}

async function collectRueImportHits(): Promise<RueImportHit[]> {
  const files = [
    ...new Set(
      (
        await Promise.all(SCAN_ROOTS.map(root => collectSourceFiles(path.join(packageRoot, root))))
      ).flat(),
    ),
  ].sort()
  const hits: RueImportHit[] = []

  for (const file of files) {
    const relativeFile = path.relative(packageRoot, file).split(path.sep).join('/')
    const lines = (await fs.readFile(file, 'utf8')).split(/\r?\n/)

    lines.forEach((line, index) => {
      if (line.trimStart().startsWith('//')) {
        return
      }
      if (!LEGACY_RUNTIME_IMPORT_RE.test(line)) {
        return
      }

      hits.push({
        file: relativeFile,
        line: index + 1,
        source: line.trim(),
      })
    })
  }

  return hits
}

async function collectSourceHits(dir: string, pattern: RegExp): Promise<SourceHit[]> {
  const files = (await collectSourceFiles(path.join(packageRoot, dir))).sort()
  const hits: SourceHit[] = []

  for (const file of files) {
    const relativeFile = path.relative(packageRoot, file).split(path.sep).join('/')
    const lines = (await fs.readFile(file, 'utf8')).split(/\r?\n/)

    lines.forEach((line, index) => {
      if (line.trimStart().startsWith('//')) {
        return
      }
      if (!pattern.test(line)) {
        return
      }

      hits.push({
        file: relativeFile,
        line: index + 1,
        source: line.trim(),
      })
    })
  }

  return hits
}

describe('Rue import guard', () => {
  it('keeps default and namespace imports from the legacy runtime at zero', async () => {
    const hits = await collectRueImportHits()
    expect(
      hits.map(hit => `${hit.file}:${hit.line}: ${hit.source}`),
      'Default/namespace imports from the legacy runtime are intentionally kept at zero.',
    ).toEqual([])
  })

  it('keeps Pages SSR entrypoints off legacy DOM server rendering', async () => {
    const guardedFiles = [
      'src/server/dev-server.ts',
      'src/entries/pages-server-entry.ts',
      'src/server/pages-page-response.ts',
      'src/server/pages-renderer-adapter.ts',
    ]

    const hits: string[] = []
    for (const file of guardedFiles) {
      const source = await fs.readFile(path.join(packageRoot, file), 'utf8')
      if (new RegExp(`${LEGACY_DOM_PACKAGE}\\/server(?:\\.edge)?`).test(source)) {
        hits.push(file)
      }
    }

    expect(hits, 'Pages SSR must route through the Rue render adapter.').toEqual([])
  })

  it('keeps Pages SSR adapter on the compiled writer entry', async () => {
    const source = await fs.readFile(
      path.join(packageRoot, 'src/server/pages-renderer-adapter.ts'),
      'utf8',
    )

    expect(source).toContain('@rue-js/runtime/server')
    expect(source).not.toMatch(/rue-legacy-renderer/)
  })

  it('keeps server legacy runtime imports at zero', async () => {
    const hits = await collectSourceHits(
      'src/server',
      new RegExp(
        `from\\s+["']${LEGACY_RUNTIME_PACKAGE}["']|` +
          `import\\(["']${LEGACY_RUNTIME_PACKAGE}["']\\)|` +
          `${LEGACY_DOM_PACKAGE}\\/(?:["']\\s*\\+\\s*["'])?server(?:\\.edge)?`,
      ),
    )

    expect(
      hits.map(hit => hit.file),
      'Server legacy runtime usage must stay outside text core.',
    ).toEqual([])
  })

  it('keeps shim legacy runtime imports at zero', async () => {
    const hits = await collectSourceHits(
      'src/shims',
      new RegExp(
        `from\\s+["']${LEGACY_RUNTIME_PACKAGE}["']|` +
          `import\\(["']${LEGACY_RUNTIME_PACKAGE}["']\\)|` +
          `${LEGACY_DOM_PACKAGE}|@unpic\\/${LEGACY_RUNTIME_PACKAGE}`,
      ),
    )

    expect(
      hits.map(hit => hit.file),
      'Shim legacy runtime usage must stay outside text core.',
    ).toEqual([])
  })

  it('does not import the removed text compat package from source', async () => {
    const hits = await collectSourceHits('src', new RegExp(REMOVED_TEXT_COMPAT_PACKAGE))

    expect(
      hits.map(hit => `${hit.file}:${hit.line}: ${hit.source}`),
      'text core should use Rue-native protocol implementations.',
    ).toEqual([])
  })

  it('keeps test legacy runtime usage at zero', async () => {
    const hits = (await collectSourceHits('__tests__', RUE_RUNTIME_SOURCE_RE)).filter(
      hit => hit.file !== '__tests__/rue-import-guard.test.ts',
    )

    expect(
      hits.map(hit => `${hit.file}: ${hit.source}`),
      'Legacy runtime usage in tests must stay out of fixtures and inline test inputs.',
    ).toEqual([])
  })

  it('keeps client chunking based on Rue runtime packages', async () => {
    const source = await fs.readFile(
      path.join(packageRoot, 'src/build/client-build-config.ts'),
      'utf8',
    )

    expect(source).not.toMatch(new RegExp(`pkg\\s*===\\s*["']${LEGACY_RUNTIME_PACKAGE}["']`))
    expect(source).not.toMatch(new RegExp(`pkg\\s*===\\s*["']${LEGACY_DOM_PACKAGE}["']`))
    expect(source).not.toMatch(/pkg\s*===\s*["']scheduler["']/)
    expect(source).toContain('CLIENT_FRAMEWORK_PACKAGES')
  })

  it('keeps internal shim adapter imports on neutral paths', async () => {
    const hits = await collectSourceHits(
      'src',
      /["'][^"']*rue-(?:component|context|hooks)-adapter\.js["']/,
    )

    expect(hits, 'Internal source should import component/context/hooks adapters.').toEqual([])
  })

  it('keeps internal shim adapter usage on TextCompat names', async () => {
    const hits = await collectSourceHits(
      'src',
      /\b(?:RueCompat(?:ClassComponentType|ComponentType|Component|Fragment|Suspense|Element|Node|Context)|createRueCompatElement|createRequiredRueCompatContext|getOrCreateRueCompatContext|useOptionalRueCompatContext|useRueCompatContext|isRueCompatRenderRuntime|isRueCompatServerRender|startRueCompatTransition|RueHookDependencyList)\b/,
    )
    const allowedFiles = new Set([
      'src/shims/component-adapter.ts',
      'src/shims/context-adapter.ts',
      'src/shims/hooks-adapter.ts',
      'src/shims/text-compat-types.ts',
      'src/shims/react-component-adapter.ts',
      'src/shims/react-context-adapter.ts',
      'src/shims/react-hooks-adapter.ts',
    ])
    const unexpectedHits = hits.filter(hit => !allowedFiles.has(hit.file))

    expect(
      unexpectedHits.map(hit => `${hit.file}:${hit.line}: ${hit.source}`),
      'Text internals should use TextCompat names; RueCompat is only a compatibility alias.',
    ).toEqual([])
  })

  it('keeps neutral source helpers off stale Rue-specific names', async () => {
    const hits = await collectSourceHits(
      'src',
      /\bhasRueDirective\b|\bRueDynamic(?:Inner|Component)?\b|\bcreateRueDynamicComponent\b|_rueServerShims\b|\brueServerShim\b/,
    )

    expect(
      hits.map(hit => `${hit.file}:${hit.line}: ${hit.source}`),
      'Neutral helpers should keep payload/RSC/Text names instead of stale Rue helper names.',
    ).toEqual([])
  })

  it('keeps internal safe element helper usage on Text names', async () => {
    const hits = await collectSourceHits('src', /\bcreateSafeRueElement\b/)
    const unexpectedHits = hits.filter(hit => hit.file !== 'src/shims/rue-element-compat.ts')

    expect(
      unexpectedHits.map(hit => `${hit.file}:${hit.line}: ${hit.source}`),
      'Internal source should call createSafeTextElement; createSafeRueElement is a compat alias.',
    ).toEqual([])
  })

  it('keeps internal compat runtime helper usage on Text names', async () => {
    const hits = await collectSourceHits(
      'src',
      /\b(?:readRue(?:CreateElement|RuntimeExport|Fragment|Suspense|ComponentBase)|isRue(?:RenderActive|ServerRenderActive)|canCallRueCreateElement|createRueProtocolElement|isRueProtocolElement)\b/,
    )
    const allowedFiles = new Set([
      'src/shims/rue-element-compat.ts',
      'src/shims/rue-runtime-protocol.ts',
    ])
    const unexpectedHits = hits.filter(hit => !allowedFiles.has(hit.file))

    expect(
      unexpectedHits.map(hit => `${hit.file}:${hit.line}: ${hit.source}`),
      'Internal source should call TextCompat helper names; Rue helper names are compat aliases only.',
    ).toEqual([])
  })

  it('keeps neutral shim runtime helpers on Text names', async () => {
    const files = [
      'src/shims/component-adapter.ts',
      'src/shims/context-adapter.ts',
      'src/shims/hooks-adapter.ts',
      'src/shims/link.tsx',
    ]
    const hits: string[] = []

    for (const file of files) {
      const source = await fs.readFile(path.join(packageRoot, file), 'utf8')
      if (
        /\b(?:RueContextRuntime|LinkRueContextRuntime|getRueContextRuntime|getActiveRueContextRuntime|isCompleteRueContextRuntime|isRueContextRuntime|getOrCreateRuntimeRueContext)\b/.test(
          source,
        )
      ) {
        hits.push(file)
      }
    }

    expect(hits).toEqual([])
  })

  it('keeps neutral shim adapter internals off Rue runtime state names', async () => {
    const files = ['src/shims/context-adapter.ts', 'src/shims/hooks-adapter.ts']
    const hits: string[] = []

    for (const file of files) {
      const source = await fs.readFile(path.join(packageRoot, file), 'utf8')
      if (
        /\b(?:rueContext|rueContexts|rueProviders|RueContextGlobal|getRueRenderRuntime|isRueProtocolNode|createRueContext|rueProvider|rueStartTransition)\b/.test(
          source,
        )
      ) {
        hits.push(file)
      }
    }

    expect(hits).toEqual([])
  })

  it('has no server element dispatcher or fallback protocol imports', async () => {
    const hits = await collectSourceHits(
      'src/server',
      /rue-element-compat|rue-runtime-protocol|app-element-runtime-protocol|server-element-runtime/,
    )
    expect(hits).toEqual([])
  })

  it('requires compiled factories in the App server tree', async () => {
    const source = await fs.readFile(
      path.join(packageRoot, 'src/server/app-server-tree.ts'),
      'utf8',
    )

    expect(source).toContain('Text requires a compiled component factory')
    expect(source).not.toMatch(/isRueComponent/)
  })

  it('keeps App SSR thenable protocol naming neutral', async () => {
    const source = await fs.readFile(
      path.join(packageRoot, 'src/server/app-ssr-thenable-protocol.ts'),
      'utf8',
    )

    expect(source).toMatch(/appSsrThenableReader/)
    expect(source).not.toMatch(/rueAppSsrThenableReader/)
  })

  it('does not declare Rue plugin or RSDW package dependencies', async () => {
    const pkg = JSON.parse(await fs.readFile(path.join(packageRoot, 'package.json'), 'utf8'))
    const dependencyFields = [
      pkg.dependencies ?? {},
      pkg.devDependencies ?? {},
      pkg.peerDependencies ?? {},
      pkg.peerDependenciesMeta ?? {},
    ]

    for (const field of dependencyFields) {
      expect(field).not.toHaveProperty(`@vitejs/plugin-${LEGACY_RUNTIME_PACKAGE}`)
      expect(field).not.toHaveProperty(`${LEGACY_RUNTIME_PACKAGE}-server-dom-webpack`)
      expect(field).not.toHaveProperty(LEGACY_TYPES_PACKAGE)
      expect(field).not.toHaveProperty(LEGACY_TYPES_DOM_PACKAGE)
    }
  })

  it('does not expose Rue runtime packages as text peer dependencies', async () => {
    const pkg = JSON.parse(await fs.readFile(path.join(packageRoot, 'package.json'), 'utf8'))

    expect(pkg.peerDependencies ?? {}).not.toHaveProperty(LEGACY_RUNTIME_PACKAGE)
    expect(pkg.peerDependencies ?? {}).not.toHaveProperty(LEGACY_DOM_PACKAGE)
    expect(pkg.peerDependenciesMeta ?? {}).not.toHaveProperty(LEGACY_RUNTIME_PACKAGE)
    expect(pkg.peerDependenciesMeta ?? {}).not.toHaveProperty(LEGACY_DOM_PACKAGE)
  })

  it('keeps App Router RSC support internal to text package metadata', async () => {
    const pkg = JSON.parse(await fs.readFile(path.join(packageRoot, 'package.json'), 'utf8'))

    expect(pkg.dependencies ?? {}).toHaveProperty('@rue-js/rsc')
    expect(pkg.dependencies ?? {}).not.toHaveProperty('@vitejs/plugin-rsc')
    expect(pkg.devDependencies ?? {}).not.toHaveProperty('@vitejs/plugin-rsc')
    expect(pkg.peerDependencies ?? {}).not.toHaveProperty('@vitejs/plugin-rsc')
    expect(pkg.peerDependenciesMeta ?? {}).not.toHaveProperty('@vitejs/plugin-rsc')
  })

  it('does not keep the removed plugin-rsc catalog entry', async () => {
    const workspace = await fs.readFile(path.join(workspaceRoot, 'pnpm-workspace.yaml'), 'utf8')

    expect(workspace).not.toMatch(/^\s*['"]?@vitejs\/plugin-rsc['"]?\s*:/m)
  })

  it('does not keep the removed text compat package metadata', async () => {
    await expect(
      fs.access(
        path.join(workspaceRoot, 'packages', REMOVED_TEXT_COMPAT_DIRECTORY, 'package.json'),
      ),
    ).rejects.toThrow()
  })

  it('keeps @rue-js/rsc public peers free of Rue Flight packages', async () => {
    const pkg = JSON.parse(
      await fs.readFile(path.join(workspaceRoot, 'packages/rue-rsc/package.json'), 'utf8'),
    )

    expect(pkg.peerDependencies ?? {}).not.toHaveProperty(LEGACY_RUNTIME_PACKAGE)
    expect(pkg.peerDependencies ?? {}).not.toHaveProperty(LEGACY_DOM_PACKAGE)
    expect(pkg.peerDependencies ?? {}).not.toHaveProperty(
      `${LEGACY_RUNTIME_PACKAGE}-server-dom-webpack`,
    )
    expect(pkg.peerDependenciesMeta ?? {}).not.toHaveProperty(LEGACY_RUNTIME_PACKAGE)
    expect(pkg.peerDependenciesMeta ?? {}).not.toHaveProperty(LEGACY_DOM_PACKAGE)
    expect(pkg.peerDependenciesMeta ?? {}).not.toHaveProperty(
      `${LEGACY_RUNTIME_PACKAGE}-server-dom-webpack`,
    )
    expect(pkg.dependencies ?? {}).not.toHaveProperty(
      `${LEGACY_RUNTIME_PACKAGE}-server-dom-webpack`,
    )
    expect(pkg.dependencies ?? {}).not.toHaveProperty(LEGACY_RUNTIME_PACKAGE)
    expect(pkg.dependencies ?? {}).not.toHaveProperty(LEGACY_DOM_PACKAGE)
  })

  it('keeps Rue-native @rue-js/rsc entrypoints off Rue Flight imports', async () => {
    const guardedFiles = [
      'src/browser.ts',
      'src/core/browser.ts',
      'src/core/payload.ts',
      'src/core/rsc.ts',
      'src/core/ssr.ts',
      'src/rsc.tsx',
      'src/ssr.tsx',
      'src/utils/encryption-runtime.ts',
    ]
    const hits: string[] = []

    for (const file of guardedFiles) {
      const source = await fs.readFile(path.join(workspaceRoot, 'packages/rue-rsc', file), 'utf8')
      if (
        new RegExp(`@vitejs\\/plugin-rsc|${LEGACY_RUNTIME_PACKAGE}-server-dom-webpack`).test(source)
      ) {
        hits.push(`${file}: Rue Flight package reference`)
      }
      if (
        new RegExp(
          `from\\s+["']${LEGACY_RUNTIME_PACKAGE}(?:\\/|["'])|import\\(["']${LEGACY_RUNTIME_PACKAGE}(?:\\/|["'])`,
        ).test(source)
      ) {
        hits.push(`${file}: Rue runtime import`)
      }
      if (
        new RegExp(
          `from\\s+["']${LEGACY_DOM_PACKAGE}(?:\\/|["'])|import\\(["']${LEGACY_DOM_PACKAGE}(?:\\/|["'])`,
        ).test(source)
      ) {
        hits.push(`${file}: RueDOM runtime import`)
      }
      if (
        new RegExp(`@rue-js\\/rsc\\/vendor\\/${LEGACY_RUNTIME_PACKAGE}-server-dom`).test(source)
      ) {
        hits.push(`${file}: vendored Rue Flight import`)
      }
    }

    expect(hits).toEqual([])
  })

  it('keeps plugin-rsc protocol imports behind audited adapters', async () => {
    const hits = await collectSourceHits(
      'src',
      /from\s+["']@vitejs\/plugin-rsc\/(?:browser|rsc|ssr|rue\/rsc)["']|import\(["']@vitejs\/plugin-rsc\/(?:browser|rsc|ssr|rue\/rsc)["']\)/,
    )

    expect(
      hits.map(hit => hit.file),
      'RSC protocol imports must stay on Rue-native implementations.',
    ).toEqual([])
  })

  it('keeps plugin-rsc SSR payload decoding behind a lazy loader', async () => {
    const staticHits = await collectSourceHits(
      'src/server',
      /from\s+["']@vitejs\/plugin-rsc\/ssr["']/,
    )
    const dynamicHits = await collectSourceHits(
      'src/server',
      /import\(["']@vitejs\/plugin-rsc\/ssr["']\)/,
    )

    expect(staticHits).toEqual([])
    expect(dynamicHits).toEqual([])
  })

  it('uses the Rue browser payload facade without plugin-rsc or compat-package fallback', async () => {
    const source = await fs.readFile(
      path.join(packageRoot, 'src/server/app-rsc-browser-payload-protocol.ts'),
      'utf8',
    )

    expect(source).toMatch(/decodeRuePayloadFetch/)
    expect(source).toMatch(/decodeRuePayloadReadableStream/)
    expect(source).not.toMatch(/@vitejs\/plugin-rsc/)
    expect(source).not.toContain(REMOVED_TEXT_COMPAT_PACKAGE)
  })

  it('keeps RSC protocol types local and plugin-private-type-free', async () => {
    const guardedFiles = [
      'src/server/app-rsc-browser-action-protocol-core.ts',
      'src/server/app-rsc-browser-action-protocol.ts',
      'src/server/app-rsc-browser-action-protocol-compat.ts',
      'src/server/app-rsc-server-action-protocol-core.ts',
      'src/server/app-rsc-server-action-protocol.ts',
      'src/server/app-rsc-server-action-protocol-compat.ts',
      'src/server/app-rsc-browser-payload-protocol-core.ts',
      'src/server/app-rsc-browser-payload-protocol.ts',
      'src/server/app-rsc-ssr-runtime-protocol-core.ts',
      'src/server/app-rsc-server-payload-protocol-core.ts',
      'src/server/app-rsc-server-payload-protocol.ts',
      'src/server/app-rsc-ssr-payload-protocol-core.ts',
      'src/server/app-rsc-ssr-payload-protocol.ts',
      'src/server/app-ssr-payload-protocol-core.ts',
      'src/server/app-ssr-payload-protocol.ts',
      'src/shims/cache-rsc-protocol-core.ts',
      'src/shims/cache-rsc-protocol.ts',
    ]
    const hits: string[] = []

    for (const file of guardedFiles) {
      const source = await fs.readFile(path.join(packageRoot, file), 'utf8')
      const pluginImports = source.matchAll(
        /import\s*{([\s\S]*?)}\s*from\s*["']@vitejs\/plugin-rsc\/(?:browser|rsc|ssr|rue\/rsc)["']/g,
      )
      for (const pluginImport of pluginImports) {
        if (/\btype\s+\w+/.test(pluginImport[1] ?? '')) {
          hits.push(`${file}: type import from plugin-rsc`)
        }
      }
      if (/typeof\s+\w*Plugin\w+/.test(source)) {
        hits.push(`${file}: typeof plugin export`)
      }
    }

    expect(hits).toEqual([])
  })

  it('keeps RSC protocol core files plugin and Rue runtime free', async () => {
    const coreFiles = [
      'src/server/app-rsc-browser-action-protocol-core.ts',
      'src/server/app-rsc-browser-payload-protocol-core.ts',
      'src/server/app-rsc-client-reference-protocol-core.ts',
      'src/server/app-rsc-plugin-runtime.ts',
      'src/server/app-rsc-ssr-runtime-protocol-core.ts',
      'src/server/app-rsc-server-action-protocol-core.ts',
      'src/server/app-rsc-server-payload-protocol-core.ts',
      'src/server/app-rsc-ssr-payload-protocol-core.ts',
      'src/server/app-ssr-inline-payload-protocol.ts',
      'src/server/app-ssr-payload-protocol-core.ts',
      'src/server/app-ssr-payload-protocol.ts',
      'src/server/app-ssr-payload-reader.ts',
      'src/server/app-ssr-wire-payload-protocol.ts',
      'src/shims/cache-rsc-protocol-core.ts',
    ]
    const hits: string[] = []

    for (const file of coreFiles) {
      const source = await fs.readFile(path.join(packageRoot, file), 'utf8')
      if (/@vitejs\/plugin-rsc/.test(source)) {
        hits.push(`${file}: plugin-rsc reference`)
      }
      if (
        new RegExp(
          `from\\s+["']${LEGACY_RUNTIME_PACKAGE}(?:\\/|["'])|import\\(["']${LEGACY_RUNTIME_PACKAGE}(?:\\/|["'])`,
        ).test(source)
      ) {
        hits.push(`${file}: Rue runtime import`)
      }
      if (
        new RegExp(
          `from\\s+["']${LEGACY_DOM_PACKAGE}(?:\\/|["'])|import\\(["']${LEGACY_DOM_PACKAGE}(?:\\/|["'])`,
        ).test(source)
      ) {
        hits.push(`${file}: RueDOM runtime import`)
      }
    }

    expect(hits).toEqual([])
  })

  it('keeps injectable App protocol core factories on App-oriented names', async () => {
    const guardedPatterns = new Map<string, RegExp>([
      [
        'src/server/app-rsc-browser-action-protocol-core.ts',
        /\b(?:BrowserRsc|createBrowserRscActionProtocol)\b/,
      ],
      [
        'src/server/app-rsc-browser-payload-protocol-core.ts',
        /\b(?:BrowserRsc|createBrowserRscPayloadProtocol)\b/,
      ],
      [
        'src/server/app-rsc-server-action-protocol-core.ts',
        /\b(?:RscServerAction|RscServerTemporaryReferenceSet|createRscServerActionProtocol)\b/,
      ],
      [
        'src/server/app-rsc-server-payload-protocol-core.ts',
        /\b(?:RscServerPayload|createRscServerPayloadProtocol|createLazyRscServerPayloadProtocol)\b/,
      ],
    ])
    const hits: string[] = []

    for (const [file, pattern] of guardedPatterns) {
      const source = await fs.readFile(path.join(packageRoot, file), 'utf8')
      if (pattern.test(source)) {
        hits.push(file)
      }
    }

    expect(hits).toEqual([])
  })

  it('keeps the App browser entry on protocol objects instead of legacy BrowserRsc helpers', async () => {
    const source = await fs.readFile(
      path.join(packageRoot, 'src/server/app-browser-entry.ts'),
      'utf8',
    )

    expect(source).toMatch(/appBrowserPayloadProtocol/)
    expect(source).toMatch(/appBrowserActionProtocol/)
    expect(source).not.toMatch(
      /\b(?:decodeBrowserRscFetch|decodeBrowserRscReadableStream|createBrowserRscTemporaryReferenceSet|encodeBrowserRscReply|setBrowserRscServerCallback)\b/,
    )
  })

  it('keeps App SSR payload reader off implicit plugin-rsc SSR fallback', async () => {
    const source = await fs.readFile(
      path.join(packageRoot, 'src/server/app-ssr-payload-reader.ts'),
      'utf8',
    )

    expect(source).not.toMatch(/app-rsc-ssr-payload-protocol/)
    expect(source).not.toMatch(/@vitejs\/plugin-rsc\/ssr/)
    expect(source).toMatch(/app-ssr-inline-payload-protocol/)
    expect(source).toMatch(/app-ssr-wire-payload-protocol/)
  })

  it('keeps App SSR entry on explicit payload decoder injection', async () => {
    const source = await fs.readFile(path.join(packageRoot, 'src/server/app-ssr-entry.ts'), 'utf8')

    expect(source).toMatch(/ssrPayloadDecoder/)
    expect(source).toMatch(/decodePayload: options\?\.ssrPayloadDecoder/)
    expect(source).toMatch(/normalizeTextChunk: normalizeRscPreloadHintText/)
    expect(source).not.toMatch(/compatRscSsrPayloadProtocol/)
    expect(source).not.toMatch(/decodeCompatRscSsrPayload/)
    expect(source).not.toMatch(/@vitejs\/plugin-rsc\/ssr/)
    expect(source).not.toMatch(/TextFlightRoot|flightRootElement/)
  })

  it('keeps App SSR stream embedding free of Rue Flight-specific normalization', async () => {
    const source = await fs.readFile(path.join(packageRoot, 'src/server/app-ssr-stream.ts'), 'utf8')

    expect(source).toMatch(/normalizeTextChunk/)
    expect(source).not.toMatch(/fixFlightHints/)
    expect(source).not.toMatch(/Rue Flight|Flight hint/)
  })

  it('keeps RSC preload hint normalizer exports on neutral names', async () => {
    const source = await fs.readFile(
      path.join(packageRoot, 'src/server/rsc-stream-hints.ts'),
      'utf8',
    )

    expect(source).toMatch(/normalizeRscPreloadHintText/)
    expect(source).toMatch(/normalizeRscPreloadHints/)
    expect(source).not.toMatch(/normalizeRueFlightPreload/)
  })

  it('keeps redirect payload helper naming neutral', async () => {
    const files = [
      'src/server/app-render-adapter.ts',
      'src/server/app-page-execution.ts',
      'src/server/app-page-dispatch.ts',
      'src/entries/app-rsc-entry.ts',
      '__tests__/app-page-dispatch.test.ts',
      '__tests__/app-page-execution.test.ts',
    ]
    const hits: string[] = []

    for (const file of files) {
      const source = await fs.readFile(path.join(packageRoot, file), 'utf8')
      if (
        /RedirectFlight|FlightThrower|buildRscRedirectFlightStream|createRedirectFlightThrower|text-redirect-flight|flight payload|flight stream/.test(
          source,
        )
      ) {
        hits.push(file)
      }
    }

    expect(hits).toEqual([])
  })

  it('keeps navigation planner result/work naming payload-oriented', async () => {
    const files = [
      'src/server/navigation-planner.ts',
      'src/server/app-browser-state.ts',
      '__tests__/navigation-planner.test.ts',
    ]
    const hits: string[] = []

    for (const file of files) {
      const source = await fs.readFile(path.join(packageRoot, file), 'utf8')
      if (
        /FlightResultV0|flightResponseArrived|traverseFlight|kind: ['"]flight['"]|planFlightResponse|flight responses/.test(
          source,
        )
      ) {
        hits.push(file)
      }
    }

    expect(hits).toEqual([])
  })

  it('keeps Flight terminology isolated to audited compat and security boundaries', async () => {
    const allowedFiles = new Set([
      'src/server/request-pipeline.ts',
      'src/server/rsc-stream-hints.ts',
    ])
    const files = (await collectSourceFiles(path.join(packageRoot, 'src'))).sort()
    const hits: string[] = []

    for (const file of files) {
      const relativeFile = path.relative(packageRoot, file).split(path.sep).join('/')
      if (allowedFiles.has(relativeFile)) continue
      const source = await fs.readFile(file, 'utf8')
      if (
        /Flight|flight payload|flight stream|flight response|flight body|flight format|flight headers|flightRedirect|flightResponseArrived|traverseFlight/.test(
          source,
        )
      ) {
        hits.push(relativeFile)
      }
    }

    expect(hits).toEqual([])
  })

  it('keeps neutral App SSR payload reader terminology free of RSC/Flight names', async () => {
    const files = [
      'src/server/app-ssr-payload-reader-core.ts',
      'src/server/app-ssr-payload-reader.ts',
      'src/server/app-ssr-payload-protocol-core.ts',
      'src/server/app-ssr-payload-protocol.ts',
    ]
    const hits: string[] = []

    for (const file of files) {
      const source = await fs.readFile(path.join(packageRoot, file), 'utf8')
      if (/\bRSC\b|Flight|flightRoot|RSC stream/.test(source)) {
        hits.push(file)
      }
    }

    expect(hits).toEqual([])
  })

  it('keeps the App SSR entry on the neutral payload reader facade', async () => {
    const source = await fs.readFile(path.join(packageRoot, 'src/server/app-ssr-entry.ts'), 'utf8')

    expect(source).toMatch(/\.\/app-ssr-payload-reader\.js/)
    expect(source).not.toMatch(/\.\/app-rsc-ssr-payload-reader\.js/)
  })

  it('does not keep the removed RSC SSR compat payload adapter', async () => {
    await expect(
      fs.access(path.join(packageRoot, 'src/server/app-rsc-ssr-payload-protocol-compat.ts')),
    ).rejects.toThrow()
  })

  it('keeps the RSC-named SSR payload protocol as a compatibility alias', async () => {
    const source = await fs.readFile(
      path.join(packageRoot, 'src/server/app-rsc-ssr-payload-protocol-core.ts'),
      'utf8',
    )

    expect(source).toMatch(/app-ssr-payload-protocol-core/)
    expect(source).toMatch(/createAppSsrPayloadProtocol as createRscSsrPayloadProtocol/)
    expect(source).not.toMatch(/configured RSC SSR payload protocol/)
  })

  it('does not keep removed plugin-rsc payload compat adapters', async () => {
    for (const file of [
      'src/server/app-rsc-browser-payload-protocol-compat.ts',
      'src/server/app-rsc-server-payload-protocol-compat.ts',
    ]) {
      await expect(fs.access(path.join(packageRoot, file))).rejects.toThrow()
    }
  })

  it('keeps neutral payload protocol facades plugin-free', async () => {
    const files = [
      'src/server/app-rsc-browser-payload-protocol.ts',
      'src/server/app-rsc-server-payload-protocol.ts',
      'src/server/app-rsc-ssr-payload-protocol.ts',
      'src/server/app-ssr-payload-protocol.ts',
    ]
    const hits: string[] = []

    for (const file of files) {
      const source = await fs.readFile(path.join(packageRoot, file), 'utf8')
      if (/@vitejs\/plugin-rsc/.test(source)) {
        hits.push(`${file}: plugin-rsc reference`)
      }
      if (/compat\w*Rsc\w*PayloadProtocol/.test(source)) {
        hits.push(`${file}: compat payload protocol in neutral facade`)
      }
    }

    expect(hits).toEqual([])
  })

  it('uses the Rue server payload renderer without plugin-rsc or compat-package fallback', async () => {
    const source = await fs.readFile(
      path.join(packageRoot, 'src/server/app-rsc-runtime-compat.ts'),
      'utf8',
    )

    expect(source).toMatch(/renderRuePayloadToReadableStream/)
    expect(source).not.toMatch(/@vitejs\/plugin-rsc/)
    expect(source).not.toContain(REMOVED_TEXT_COMPAT_PACKAGE)
  })

  it('keeps plugin-rsc action adapters named as explicit compat adapters', async () => {
    const files = [
      'src/server/app-rsc-browser-action-protocol-compat.ts',
      'src/server/app-rsc-server-action-protocol-compat.ts',
    ]
    const hits: string[] = []

    for (const file of files) {
      const source = await fs.readFile(path.join(packageRoot, file), 'utf8')
      if (!/compat\w*Rsc\w*ActionProtocol/.test(source)) {
        hits.push(`${file}: missing compat action protocol name`)
      }
      if (/default\w*Rsc\w*ActionProtocol/.test(source)) {
        hits.push(`${file}: default action protocol name`)
      }
      if (/plugin\w*Rsc\w*ActionProtocol/.test(source)) {
        hits.push(`${file}: plugin action protocol name`)
      }
    }

    expect(hits).toEqual([])
  })

  it('keeps neutral action protocol facades plugin-free', async () => {
    const files = [
      'src/server/app-rsc-browser-action-protocol.ts',
      'src/server/app-rsc-server-action-protocol.ts',
    ]
    const hits: string[] = []

    for (const file of files) {
      const source = await fs.readFile(path.join(packageRoot, file), 'utf8')
      if (/@vitejs\/plugin-rsc/.test(source)) {
        hits.push(`${file}: plugin-rsc reference`)
      }
      if (/compat\w*Rsc\w*ActionProtocol/.test(source)) {
        hits.push(`${file}: compat action protocol in neutral facade`)
      }
    }

    expect(hits).toEqual([])
  })

  it('keeps use cache RSC serialization on the Rue payload protocol', async () => {
    const source = await fs.readFile(
      path.join(packageRoot, 'src/shims/cache-rsc-protocol.ts'),
      'utf8',
    )

    expect(source).toMatch(/useCacheRscProtocolLoader/)
    expect(source).toMatch(/renderRuePayloadToReadableStream/)
    expect(source).toMatch(/decodeRuePayloadReadableStream/)
    expect(source).not.toContain(REMOVED_TEXT_COMPAT_PACKAGE)
    expect(source).not.toMatch(/pluginUseCacheRscProtocolLoader/)
    expect(source).not.toMatch(/loadPluginUseCacheRscProtocol/)
  })

  it('does not import the plugin-rsc package API from source code', async () => {
    const hits = await collectSourceHits(
      'src',
      /from\s+["']@vitejs\/plugin-rsc["']|import\(["']@vitejs\/plugin-rsc["']\)/,
    )

    expect(hits).toEqual([])
  })

  it('keeps plugin-rsc SSR runtime hooks behind an audited compat adapter', async () => {
    const hits = await collectSourceHits(
      'src/server',
      /virtual:(?:vite|text)-rsc\/client-references|readAppRscPluginRuntime\(import\.meta\)|import\.meta\.viteRsc\.(?:loadModule|loadBootstrapScriptContent)/,
    )
    const hitFiles = [...new Set(hits.map(hit => hit.file))]

    expect(
      hitFiles,
      'SSR entrypoints should consume a local RSC runtime adapter instead of plugin-rsc globals.',
    ).toEqual(['src/server/app-rsc-ssr-plugin-runtime-compat.ts'])
  })

  it('keeps server runtime code off the legacy vite-rsc client-reference virtual id', async () => {
    const hits = await collectSourceHits('src/server', /virtual:vite-rsc\/client-references/)

    expect(hits).toEqual([])
  })

  it('keeps client-reference loader core independent from Vite and vite-rsc virtual ids', async () => {
    const source = await fs.readFile(
      path.join(packageRoot, 'src/plugins/rsc-client-reference-loaders-core.ts'),
      'utf8',
    )

    expect(source).not.toMatch(/from\s+["']vite["']/)
    expect(source).not.toMatch(/virtual:vite-rsc/)
    expect(source).not.toMatch(/virtual:text-rsc/)
    expect(source).not.toMatch(/serverChunk/)
    expect(source).not.toMatch(/groupChunkId/)
    expect(source).not.toMatch(/renderedExports/)
  })

  it('keeps SSR consumers on the neutral App RSC SSR runtime facade', async () => {
    const guardedFiles = ['src/server/app-ssr-entry.ts', 'src/server/app-rsc-ssr-module-loader.ts']
    const hits: string[] = []

    for (const file of guardedFiles) {
      const source = await fs.readFile(path.join(packageRoot, file), 'utf8')
      if (!source.includes('./app-rsc-ssr-runtime.js')) {
        hits.push(`${file}: missing neutral runtime facade`)
      }
      if (source.includes('./app-rsc-ssr-plugin-runtime')) {
        hits.push(`${file}: imports plugin runtime directly`)
      }
    }

    expect(hits).toEqual([])
  })

  it('keeps the Rue client-reference symbol behind the compat client-reference protocol', async () => {
    const hits = await collectSourceHits('src/server', /rue\.client\.reference/)

    expect([...new Set(hits.map(hit => hit.file))].sort()).toEqual([
      'src/server/app-rsc-client-reference-protocol-compat.ts',
      'src/server/app-rsc-client-reference-protocol-core.ts',
    ])
  })

  it('keeps the native client-reference protocol on the Rue tag', async () => {
    const source = await fs.readFile(
      path.join(packageRoot, 'src/server/app-rsc-client-reference-protocol-core.ts'),
      'utf8',
    )

    expect(source).toMatch(/rue\.client\.reference/)
    expect(source).not.toMatch(/text\.client\.reference/)
  })

  it('does not depend on plugin-rsc ambient runtime types in source code', async () => {
    const hits = await collectSourceHits('src', /@vitejs\/plugin-rsc\/types/)

    expect(hits).toEqual([])
  })

  it('keeps Rue/RSC compatibility package literals behind audited compat files', async () => {
    const hits = await collectSourceHits(
      'src',
      new RegExp(
        `${LEGACY_RUNTIME_PACKAGE}\\/jsx-runtime|` +
          `${LEGACY_RUNTIME_PACKAGE}\\/jsx-dev-runtime|` +
          `${LEGACY_DOM_PACKAGE}\\/client|` +
          `${LEGACY_DOM_PACKAGE}\\/server(?:\\.edge)?|` +
          `${LEGACY_DOM_PACKAGE}\\/static\\.edge|` +
          `(?:@vitejs\\/plugin-rsc|@rue-js\\/rsc)\\/vendor\\/${LEGACY_RUNTIME_PACKAGE}-server-dom\\/(?:client|server)\\.edge`,
      ),
    )
    const allowedFiles = new Set([
      'src/plugins/middleware-server-only.ts',
      'src/plugins/server-externals-manifest.ts',
    ])
    const unexpectedHits = hits.filter(hit => !allowedFiles.has(hit.file))

    expect(unexpectedHits).toEqual([])
  })

  it('keeps generated RSC entries off direct viteRsc module loading', async () => {
    const hits = await collectSourceHits('src/entries', /import\.meta\.viteRsc/)

    expect(
      hits,
      'Generated entries should call source-level protocol helpers for plugin-rsc runtime hooks.',
    ).toEqual([])
  })

  it('does not keep removed RSC or Rue build packages in fixture metadata', async () => {
    const packageJsonFiles = await collectFilesNamed(
      path.join(packageRoot, '__tests__', 'fixtures'),
      'package.json',
    )
    const tsconfigFiles = await collectFilesNamed(
      path.join(packageRoot, '__tests__', 'fixtures'),
      'tsconfig.json',
    )
    const hits: string[] = []

    for (const file of packageJsonFiles) {
      const pkg = JSON.parse(await fs.readFile(file, 'utf8'))
      const dependencyFields = [
        pkg.dependencies ?? {},
        pkg.devDependencies ?? {},
        pkg.peerDependencies ?? {},
        pkg.peerDependenciesMeta ?? {},
      ]

      for (const field of dependencyFields) {
        for (const dependencyName of [
          '@vitejs/plugin-rsc',
          `@vitejs/plugin-${LEGACY_RUNTIME_PACKAGE}`,
          `${LEGACY_RUNTIME_PACKAGE}-server-dom-webpack`,
          LEGACY_TYPES_PACKAGE,
          LEGACY_TYPES_DOM_PACKAGE,
        ]) {
          if (Object.prototype.hasOwnProperty.call(field, dependencyName)) {
            hits.push(`${path.relative(packageRoot, file)}: ${dependencyName}`)
          }
        }
      }
    }

    for (const file of tsconfigFiles) {
      const source = await fs.readFile(file, 'utf8')
      for (const dependencyName of [
        '@vitejs/plugin-rsc/types',
        `@vitejs/plugin-${LEGACY_RUNTIME_PACKAGE}`,
        `${LEGACY_RUNTIME_PACKAGE}-server-dom-webpack`,
        LEGACY_TYPES_PACKAGE,
        LEGACY_TYPES_DOM_PACKAGE,
      ]) {
        if (source.includes(dependencyName)) {
          hits.push(`${path.relative(packageRoot, file)}: ${dependencyName}`)
        }
      }
    }

    expect(hits).toEqual([])
  })

  it('keeps fixture legacy runtime dependencies at zero', async () => {
    const packageJsonFiles = await collectFilesNamed(
      path.join(packageRoot, '__tests__', 'fixtures'),
      'package.json',
    )
    const hits: string[] = []

    for (const file of packageJsonFiles) {
      const relativeFile = path.relative(packageRoot, file).split(path.sep).join('/')
      const pkg = JSON.parse(await fs.readFile(file, 'utf8'))
      const dependencyFields = [
        pkg.dependencies ?? {},
        pkg.devDependencies ?? {},
        pkg.peerDependencies ?? {},
        pkg.peerDependenciesMeta ?? {},
      ]

      for (const field of dependencyFields) {
        for (const dependencyName of [LEGACY_RUNTIME_PACKAGE, LEGACY_DOM_PACKAGE]) {
          if (Object.prototype.hasOwnProperty.call(field, dependencyName)) {
            hits.push(`${relativeFile}: ${dependencyName}`)
          }
        }
      }
    }

    expect(hits).toEqual([])
  })

  it('does not require legacy runtime packages in Rue-native fixture metadata', async () => {
    const fixturePackageFiles = [
      'app-basic',
      'app-cjs-violation',
      'app-with-src',
      'cf-app-basic',
      'ecosystem/validator',
      'font-google-multiple',
      'global-not-found-basic',
      'pages-basic',
      'standalone-output',
      'static-export',
    ].map(fixture => path.join(packageRoot, '__tests__', 'fixtures', fixture, 'package.json'))
    const hits: string[] = []

    for (const file of fixturePackageFiles) {
      const pkg = JSON.parse(await fs.readFile(file, 'utf8'))
      const dependencyFields = [
        pkg.dependencies ?? {},
        pkg.devDependencies ?? {},
        pkg.peerDependencies ?? {},
        pkg.peerDependenciesMeta ?? {},
      ]

      for (const field of dependencyFields) {
        for (const dependencyName of [LEGACY_RUNTIME_PACKAGE, LEGACY_DOM_PACKAGE]) {
          if (Object.prototype.hasOwnProperty.call(field, dependencyName)) {
            hits.push(`${path.relative(packageRoot, file)}: ${dependencyName}`)
          }
        }
      }
    }

    expect(hits).toEqual([])
  })

  it('does not ship a Rue canary rewrite virtual module', async () => {
    const hits = await collectSourceHits(
      'src',
      /text:rue-canary|virtual:text-rue-canary|from\s+["']virtual:text-rue-canary["']/,
    )

    expect(hits).toEqual([])
  })
})
