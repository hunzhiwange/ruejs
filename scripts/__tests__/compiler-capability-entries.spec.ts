import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { parseSync } from '@swc/core'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const categories = [
  'app',
  'dom',
  'reactive',
  'block',
  'component',
  'list',
  'events',
  'builtin',
  'teleport',
  'transition',
  'transitiongroup',
  'keepalive',
  'suspense',
  'hydrate',
  'ssr',
]
const source = (pkg: string, category: string) =>
  path.join(root, 'packages', pkg, 'src/compiler-runtime/entries', `${category}.ts`)

function exportsIn(file: string): Set<string> {
  const ast = parseSync(readFileSync(file, 'utf8'), { syntax: 'typescript' })
  const names = new Set<string>()
  for (const item of ast.body) {
    if (item.type === 'ExportDeclaration') {
      const declaration = item.declaration
      if (declaration.type === 'VariableDeclaration') {
        for (const declarator of declaration.declarations) {
          if (declarator.id.type === 'Identifier') names.add(declarator.id.value)
        }
      } else if (
        declaration.type === 'FunctionDeclaration' ||
        declaration.type === 'ClassDeclaration'
      ) {
        if (declaration.identifier) names.add(declaration.identifier.value)
      }
    }
    if (item.type !== 'ExportNamedDeclaration' || item.typeOnly) continue
    for (const specifier of item.specifiers) {
      if (specifier.type === 'ExportSpecifier' && !specifier.isTypeOnly)
        names.add((specifier.exported ?? specifier.orig).value)
    }
  }
  return names
}

describe('compiler capability package entries', () => {
  it('publishes every compiler helper from exactly one matching entry', () => {
    const table = readFileSync(
      path.join(root, 'packages/swc-plugin-rue/src/compiled_capabilities.rs'),
      'utf8',
    )
    const runtime = new Map(
      categories.map(category => [category, exportsIn(source('runtime', category))]),
    )
    const rue = new Map(categories.map(category => [category, exportsIn(source('rue', category))]))
    const capabilities = [
      ...table.matchAll(/capability\(\s*"([^"]+)",\s*RuntimeImportEntry::(\w+),/g),
    ]
    expect(capabilities.length).toBeGreaterThan(100)
    const seen = new Set<string>()
    for (const [, helper, entry] of capabilities) {
      const category = entry.toLowerCase()
      expect(seen.has(helper), helper).toBe(false)
      seen.add(helper)
      expect(runtime.get(category)?.has(helper), `${category}: ${helper}`).toBe(true)
      expect(rue.get(category)?.has(helper), `rue ${category}: ${helper}`).toBe(true)
      expect(
        [...runtime.values()].filter(names => names.has(helper)),
        helper,
      ).toHaveLength(1)
    }
  })

  it('connects source, development and published exports to build subentries', () => {
    for (const pkg of ['runtime', 'rue']) {
      const dir = path.join(root, 'packages', pkg)
      const manifest = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8'))
      for (const category of categories) {
        const entry = manifest.exports[`./internal/${category}`]
        expect(path.resolve(dir, entry.types)).toBe(source(pkg, category))
        expect(entry.development).toBe(entry.types)
        expect(entry.import).toBe(`./dist/compiler-runtime/entries/${category}.js`)
        expect(
          manifest.buildOptions.subEntries.some(
            (value: { entry: string }) => value.entry === entry.types.slice(2),
          ),
        ).toBe(true)
        expect(existsSync(path.resolve(dir, entry.import)), `${pkg}/${category} built file`).toBe(
          true,
        )
      }
    }
  })

  it.each(categories)(
    '%s has resolvable named implementation exports without aggregate entry forwarding',
    category => {
      const file = source('runtime', category)
      const content = readFileSync(file, 'utf8')
      expect(content).not.toMatch(/export\s+\*/)
      expect(content).not.toMatch(
        /from ['"][^'"]*(?:compiler-internal|component-internal|builtins-internal|\/entries\/|\.\.\/\.\.\/index|reactivity\/index)/,
      )
      // esbuild must run in Node's realm, not Vitest's jsdom Uint8Array realm.
      expect(() =>
        execFileSync(
          process.execPath,
          [
            '--input-type=module',
            '-e',
            "import { build } from 'esbuild'; await build({entryPoints:[process.argv[1]],bundle:true,write:false,platform:'browser',format:'esm',external:['@rue-js/*'],logLevel:'silent'});",
            file,
          ],
          { cwd: root, stdio: 'pipe' },
        ),
      ).not.toThrow()
    },
  )
})
