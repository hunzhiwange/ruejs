import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { PAGES_FIXTURE_DIR } from './helpers.js'
import {
  createElement,
  renderAppServerElementToHtml,
  renderAppServerElementToHtmlAsync,
} from './app-server-protocol-test-utils.js'
import {
  createElement as createRueElement,
  renderToString as renderRueToString,
} from './rue-ssr-test-utils.js'
import { isExternalUrl, isHashOnlyChange } from '../src/shims/router.js?text-ssr'
import { extractTextTextDataJson } from '../src/client/text-text-data.js'
import { isValidModulePath } from '../src/client/validate-module-path.js'
import text from '../src/index.js'
import { safeJsonStringify } from '../src/server/html.js'
import { buildPagesTextDataScript } from '../src/server/pages-page-response.js'
import type { Plugin } from 'vite-plus'
import type { TextRouter } from '../src/shims/router.js?text-ssr'
import type { CacheHandler, CacheHandlerValue, IncrementalCacheValue } from '../src/shims/cache.js'

const FIXTURE_DIR = PAGES_FIXTURE_DIR
describe('cacheComponents config (Text.js 16)', () => {
  it('resolveTextConfig defaults cacheComponents to false', async () => {
    const { resolveTextConfig } = await import('../src/config/text-config.js')
    const config = await resolveTextConfig({})
    expect(config.cacheComponents).toBe(false)
  })

  it('resolveTextConfig reads cacheComponents: true', async () => {
    const { resolveTextConfig } = await import('../src/config/text-config.js')
    const config = await resolveTextConfig({ cacheComponents: true })
    expect(config.cacheComponents).toBe(true)
  })

  it('resolveTextConfig reads cacheComponents: false', async () => {
    const { resolveTextConfig } = await import('../src/config/text-config.js')
    const config = await resolveTextConfig({ cacheComponents: false })
    expect(config.cacheComponents).toBe(false)
  })

  it('resolveTextConfig handles null input with cacheComponents default', async () => {
    const { resolveTextConfig } = await import('../src/config/text-config.js')
    const config = await resolveTextConfig(null)
    expect(config.cacheComponents).toBe(false)
  })

  it('resolveTextConfig defaults mdx to null', async () => {
    const { resolveTextConfig } = await import('../src/config/text-config.js')
    const config = await resolveTextConfig({})
    expect(config.mdx).toBeNull()
  })

  it('resolveTextConfig returns null mdx for null input', async () => {
    const { resolveTextConfig } = await import('../src/config/text-config.js')
    const config = await resolveTextConfig(null)
    expect(config.mdx).toBeNull()
  })

  it('resolveTextConfig resolves serverActionsAllowedOrigins from experimental.serverActions', async () => {
    const { resolveTextConfig } = await import('../src/config/text-config.js')
    const config = await resolveTextConfig({
      experimental: {
        serverActions: {
          allowedOrigins: ['my-proxy.com', '*.my-domain.com'],
        },
      },
    })
    expect(config.serverActionsAllowedOrigins).toEqual(['my-proxy.com', '*.my-domain.com'])
  })

  it('resolveTextConfig resolves allowedDevOrigins from top-level config', async () => {
    const { resolveTextConfig } = await import('../src/config/text-config.js')
    const config = await resolveTextConfig({
      allowedDevOrigins: ['staging.example.com', '*.preview.dev'],
    })
    expect(config.allowedDevOrigins).toEqual(['staging.example.com', '*.preview.dev'])
  })

  it('resolveTextConfig keeps allowedDevOrigins separate from serverActionsAllowedOrigins', async () => {
    const { resolveTextConfig } = await import('../src/config/text-config.js')
    const config = await resolveTextConfig({
      allowedDevOrigins: ['dev.example.com'],
      experimental: {
        serverActions: {
          allowedOrigins: ['actions.example.com'],
        },
      },
    })
    expect(config.allowedDevOrigins).toEqual(['dev.example.com'])
    expect(config.serverActionsAllowedOrigins).toEqual(['actions.example.com'])
  })

  it('resolveTextConfig defaults allowedDevOrigins to empty array', async () => {
    const { resolveTextConfig } = await import('../src/config/text-config.js')
    const config = await resolveTextConfig({})
    expect(config.allowedDevOrigins).toEqual([])
  })

  it('resolveTextConfig handles null input with empty allowedDevOrigins', async () => {
    const { resolveTextConfig } = await import('../src/config/text-config.js')
    const config = await resolveTextConfig(null)
    expect(config.allowedDevOrigins).toEqual([])
  })

  it('resolveTextConfig defaults serverActionsAllowedOrigins to empty array', async () => {
    const { resolveTextConfig } = await import('../src/config/text-config.js')
    const config = await resolveTextConfig({})
    expect(config.serverActionsAllowedOrigins).toEqual([])
  })

  it('resolveTextConfig handles null input with empty serverActionsAllowedOrigins', async () => {
    const { resolveTextConfig } = await import('../src/config/text-config.js')
    const config = await resolveTextConfig(null)
    expect(config.serverActionsAllowedOrigins).toEqual([])
  })
})
describe('loadTextConfig CJS support', () => {
  let tmpDir: string

  beforeEach(async () => {
    const os = await import('node:os')
    const fsp = await import('node:fs/promises')
    tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'text-cjs-cfg-'))
  })

  afterEach(async () => {
    const fsp = await import('node:fs/promises')
    await fsp.rm(tmpDir, { recursive: true, force: true })
  })

  it('loads a CJS text.config.js that uses module.exports', async () => {
    const fsp = await import('node:fs/promises')
    const { loadTextConfig } = await import('../src/config/text-config.js')

    await fsp.writeFile(
      path.join(tmpDir, 'text.config.js'),
      `module.exports = { basePath: "/cjs-app", trailingSlash: true };`,
    )

    const config = await loadTextConfig(tmpDir)
    expect(config).not.toBeNull()
    expect(config!.basePath).toBe('/cjs-app')
    expect(config!.trailingSlash).toBe(true)
  })

  it('loads a CJS text.config.js with require() plugin wrapper', async () => {
    const fsp = await import('node:fs/promises')
    const { loadTextConfig } = await import('../src/config/text-config.js')

    // Simulate a CJS plugin wrapper like textra/text-intl/etc.
    // Create a fake plugin module that wraps the config
    await fsp.mkdir(path.join(tmpDir, 'node_modules', 'fake-plugin'), {
      recursive: true,
    })
    await fsp.writeFile(
      path.join(tmpDir, 'node_modules', 'fake-plugin', 'index.js'),
      `module.exports = function fakePlugin(pluginOpts) {
        return function withPlugin(textConfig) {
          return Object.assign({}, textConfig, { env: { PLUGIN: "loaded" } });
        };
      };`,
    )
    await fsp.writeFile(
      path.join(tmpDir, 'node_modules', 'fake-plugin', 'package.json'),
      JSON.stringify({ name: 'fake-plugin', version: '1.0.0', main: 'index.js' }),
    )

    // Write a text.config.js that uses require() — this is the pattern that fails
    await fsp.writeFile(
      path.join(tmpDir, 'text.config.js'),
      `const withPlugin = require('fake-plugin')({ theme: 'docs' });
module.exports = withPlugin({ basePath: "/wrapped" });`,
    )

    const config = await loadTextConfig(tmpDir)
    expect(config).not.toBeNull()
    expect(config!.basePath).toBe('/wrapped')
    expect(config!.env).toEqual({ PLUGIN: 'loaded' })
  })

  it('loads a CJS function-form text.config.js', async () => {
    const fsp = await import('node:fs/promises')
    const { loadTextConfig } = await import('../src/config/text-config.js')

    await fsp.writeFile(
      path.join(tmpDir, 'text.config.js'),
      `module.exports = function(phase, { defaultConfig }) {
        return { basePath: "/fn-" + phase.split("-")[1] };
      };`,
    )

    const config = await loadTextConfig(tmpDir)
    expect(config).not.toBeNull()
    // phase is "phase-development-server", split("-")[1] = "development"
    expect(config!.basePath).toBe('/fn-development')
  })

  it('loads a .cjs config file', async () => {
    const fsp = await import('node:fs/promises')
    const { loadTextConfig } = await import('../src/config/text-config.js')

    await fsp.writeFile(
      path.join(tmpDir, 'text.config.cjs'),
      `module.exports = { basePath: "/cjs-ext" };`,
    )

    const config = await loadTextConfig(tmpDir)
    expect(config).not.toBeNull()
    expect(config!.basePath).toBe('/cjs-ext')
  })

  it('loads an ESM text.config.mjs normally', async () => {
    const fsp = await import('node:fs/promises')
    const { loadTextConfig } = await import('../src/config/text-config.js')

    await fsp.writeFile(
      path.join(tmpDir, 'text.config.mjs'),
      `export default { basePath: "/esm-app" };`,
    )

    const config = await loadTextConfig(tmpDir)
    expect(config).not.toBeNull()
    expect(config!.basePath).toBe('/esm-app')
  })

  it('loads text.config.ts with extensionless local imports', async () => {
    const fsp = await import('node:fs/promises')
    const { loadTextConfig } = await import('../src/config/text-config.js')

    await fsp.writeFile(path.join(tmpDir, 'env.ts'), `export const BASE_PATH = "/from-env";`)
    await fsp.writeFile(
      path.join(tmpDir, 'text.config.ts'),
      `import { BASE_PATH } from "./env";

export default {
  basePath: BASE_PATH,
  trailingSlash: true,
};`,
    )

    const config = await loadTextConfig(tmpDir)
    expect(config).not.toBeNull()
    expect(config!.basePath).toBe('/from-env')
    expect(config!.trailingSlash).toBe(true)
  })

  it('returns null when no config file exists', async () => {
    const { loadTextConfig } = await import('../src/config/text-config.js')

    const config = await loadTextConfig(tmpDir)
    expect(config).toBeNull()
  })
})

describe('extractMdxOptions', () => {
  it('returns null when no webpack function', async () => {
    const { extractMdxOptions } = await import('../src/config/text-config.js')
    await expect(extractMdxOptions({})).resolves.toBeNull()
    await expect(extractMdxOptions({ webpack: 'not a function' })).resolves.toBeNull()
  })

  it('extracts remarkPlugins from webpack rule', async () => {
    const { extractMdxOptions } = await import('../src/config/text-config.js')
    const fakeRemarkPlugin = () => {}
    const config = {
      webpack: (webpackConfig: any) => {
        webpackConfig.module.rules.push({
          test: /\.mdx$/,
          use: [
            {
              loader: '@text/mdx/mdx-js-loader',
              options: {
                remarkPlugins: [[fakeRemarkPlugin, { option: true }]],
                rehypePlugins: [],
              },
            },
          ],
        })
        return webpackConfig
      },
    }
    const result = await extractMdxOptions(config)
    expect(result).not.toBeNull()
    expect(result!.remarkPlugins).toHaveLength(1)
    expect(result!.remarkPlugins![0]).toEqual([fakeRemarkPlugin, { option: true }])
    expect(result!.rehypePlugins).toBeUndefined()
  })

  it('extracts rehypePlugins from webpack rule', async () => {
    const { extractMdxOptions } = await import('../src/config/text-config.js')
    const fakeRehypePlugin = () => {}
    const config = {
      webpack: (webpackConfig: any) => {
        webpackConfig.module.rules.push({
          test: /\.mdx$/,
          use: [
            {
              loader: '@text/mdx/mdx-js-loader',
              options: {
                remarkPlugins: [],
                rehypePlugins: [fakeRehypePlugin],
              },
            },
          ],
        })
        return webpackConfig
      },
    }
    const result = await extractMdxOptions(config)
    expect(result).not.toBeNull()
    expect(result!.rehypePlugins).toHaveLength(1)
    expect(result!.remarkPlugins).toBeUndefined()
  })

  it('extracts recmaPlugins from webpack rule', async () => {
    const { extractMdxOptions } = await import('../src/config/text-config.js')
    const fakeRecmaPlugin = () => {}
    const config = {
      webpack: (webpackConfig: any) => {
        webpackConfig.module.rules.push({
          test: /\.mdx$/,
          use: [
            {
              loader: '@text/mdx/mdx-js-loader',
              options: {
                recmaPlugins: [fakeRecmaPlugin],
              },
            },
          ],
        })
        return webpackConfig
      },
    }
    const result = await extractMdxOptions(config)
    expect(result).not.toBeNull()
    expect(result!.recmaPlugins).toHaveLength(1)
  })

  it('handles oneOf nested rules', async () => {
    const { extractMdxOptions } = await import('../src/config/text-config.js')
    const fakeRemarkPlugin = () => {}
    const config = {
      webpack: (webpackConfig: any) => {
        webpackConfig.module.rules.push({
          oneOf: [
            {
              test: /\.mdx$/,
              use: [
                {
                  loader: '@text/mdx/mdx-js-loader',
                  options: {
                    remarkPlugins: [fakeRemarkPlugin],
                  },
                },
              ],
            },
          ],
        })
        return webpackConfig
      },
    }
    const result = await extractMdxOptions(config)
    expect(result).not.toBeNull()
    expect(result!.remarkPlugins).toHaveLength(1)
  })

  it('returns null when webpack throws', async () => {
    const { extractMdxOptions } = await import('../src/config/text-config.js')
    const config = {
      webpack: () => {
        throw new Error('some webpack error')
      },
    }
    await expect(extractMdxOptions(config)).resolves.toBeNull()
  })

  it('returns null when webpack has no MDX loader', async () => {
    const { extractMdxOptions } = await import('../src/config/text-config.js')
    const config = {
      webpack: (webpackConfig: any) => {
        webpackConfig.module.rules.push({
          test: /\.css$/,
          use: [{ loader: 'css-loader' }],
        })
        return webpackConfig
      },
    }
    await expect(extractMdxOptions(config)).resolves.toBeNull()
  })

  it('returns null when MDX loader has empty plugin arrays', async () => {
    const { extractMdxOptions } = await import('../src/config/text-config.js')
    const config = {
      webpack: (webpackConfig: any) => {
        webpackConfig.module.rules.push({
          test: /\.mdx$/,
          use: [
            {
              loader: '@text/mdx/mdx-js-loader',
              options: {
                remarkPlugins: [],
                rehypePlugins: [],
              },
            },
          ],
        })
        return webpackConfig
      },
    }
    await expect(extractMdxOptions(config)).resolves.toBeNull()
  })

  it('resolveTextConfig extracts mdx from webpack closure', async () => {
    const { resolveTextConfig } = await import('../src/config/text-config.js')
    const fakeRemarkPlugin = () => {}
    const config = await resolveTextConfig({
      webpack: (webpackConfig: any) => {
        webpackConfig.module.rules.push({
          test: /\.mdx$/,
          use: [
            {
              loader: '@text/mdx/mdx-js-loader',
              options: {
                remarkPlugins: [fakeRemarkPlugin],
              },
            },
          ],
        })
        return webpackConfig
      },
    })
    expect(config.mdx).not.toBeNull()
    expect(config.mdx!.remarkPlugins).toHaveLength(1)
  })
})

describe('text/web-vitals shim', () => {
  it('exports useReportWebVitals as a hook function', async () => {
    const { useReportWebVitals } = await import('../src/shims/web-vitals.js')
    expect(typeof useReportWebVitals).toBe('function')
  })
})

describe('text/amp shim', () => {
  it('exports useAmp and isInAmpMode as no-op functions', async () => {
    const { useAmp, isInAmpMode } = await import('../src/shims/amp.js')
    expect(typeof useAmp).toBe('function')
    expect(typeof isInAmpMode).toBe('function')
    // Both always return false
    expect(useAmp()).toBe(false)
    expect(isInAmpMode()).toBe(false)
  })
})

describe('text/compat/router shim', () => {
  it('exports useRouter as a function', async () => {
    const mod = await import('../src/shims/compat-router.js?text-ssr')
    // useRouter should be a named export, not a default export (unlike text/router).
    // Returns null in App Router context instead of throwing.
    expect(typeof mod.useRouter).toBe('function')
    expect((mod as Record<string, unknown>).default).toBeUndefined()
  })

  it('useRouter returns null when no RouterContext.Provider wraps the tree', async () => {
    const { useRouter } = await import('../src/shims/compat-router.js?text-ssr')

    let captured: unknown = 'NOT_SET'
    function Probe() {
      captured = useRouter()
      return createElement('div', null, 'probe')
    }

    await renderAppServerElementToHtmlAsync(createElement(Probe))
    expect(captured).toBeNull()
  })

  it('useRouter returns the router when wrapWithRouterContext wraps the tree', async () => {
    const { useRouter: useCompatRouter } = await import('../src/shims/compat-router.js?text-ssr')
    const { wrapWithRouterContext } = await import('../src/shims/router.js?text-ssr')

    let captured: unknown = 'NOT_SET'
    function Probe() {
      captured = useCompatRouter()
      return createElement('div', null, 'probe')
    }

    const element = wrapWithRouterContext(createElement(Probe))
    await renderAppServerElementToHtmlAsync(element)
    expect(captured).not.toBeNull()
    expect(typeof (captured as any).pathname).toBe('string')
    expect(typeof (captured as any).push).toBe('function')
    expect(typeof (captured as any).replace).toBe('function')
    expect(typeof (captured as any).back).toBe('function')
    expect(typeof (captured as any).reload).toBe('function')
  })

  it('useRouter returns router reflecting SSR context when set', async () => {
    const { useRouter: useCompatRouter } = await import('../src/shims/compat-router.js?text-ssr')
    const { setSSRContext } = await import('../src/shims/router.js?text-ssr')
    const previousWindow = globalThis.window

    setSSRContext({
      pathname: '/posts/42',
      query: { id: '42' },
      asPath: '/posts/42?tab=comments',
    })

    let captured: unknown = 'NOT_SET'
    function Probe() {
      captured = useCompatRouter()
      return createElement('div', null, 'probe')
    }

    try {
      ;(globalThis as any).window = undefined
      await renderAppServerElementToHtmlAsync(createElement(Probe))
    } finally {
      ;(globalThis as any).window = previousWindow
      setSSRContext(null)
    }

    expect(captured).not.toBeNull()
    expect((captured as any).pathname).toBe('/posts/42')
    expect((captured as any).asPath).toBe('/posts/42?tab=comments')
    expect((captured as any).query.id).toBe('42')
  })

  it('preserves array query values from SSR context', async () => {
    const { useRouter: useCompatRouter } = await import('../src/shims/compat-router.js?text-ssr')
    const { setSSRContext } = await import('../src/shims/router.js?text-ssr')
    const previousWindow = globalThis.window

    setSSRContext({
      pathname: '/docs/a/b',
      query: { slug: ['a', 'b'] },
      asPath: '/docs/a/b',
    })

    let captured: unknown = 'NOT_SET'
    function Probe() {
      captured = useCompatRouter()
      return createElement('div', null, 'probe')
    }

    try {
      ;(globalThis as any).window = undefined
      await renderAppServerElementToHtmlAsync(createElement(Probe))
    } finally {
      ;(globalThis as any).window = previousWindow
      setSSRContext(null)
    }

    expect(captured).not.toBeNull()
    expect((captured as any).query.slug).toEqual(['a', 'b'])
  })

  it('preserves route param arrays, repeated search params, and hash in client router state', async () => {
    const { useRouter: useCompatRouter } = await import('../src/shims/compat-router.js?text-ssr')
    const { wrapWithRouterContext } = await import('../src/shims/router.js?text-ssr')

    const previousWindow = (globalThis as any).window
    ;(globalThis as any).window = {
      location: {
        pathname: '/docs/a/b',
        search: '?tag=a&tag=b',
        hash: '#section',
      },
      __TEXT_DATA__: {
        page: '/docs/[...slug]',
        query: { slug: ['a', 'b'] },
        isFallback: false,
      },
      __TEXT_LOCALE__: undefined,
      __TEXT_LOCALES__: undefined,
      __TEXT_DEFAULT_LOCALE__: undefined,
    }

    try {
      let captured: unknown = 'NOT_SET'
      function Probe() {
        captured = useCompatRouter()
        return createElement('div', null, 'probe')
      }

      const element = wrapWithRouterContext(createElement(Probe))
      await renderAppServerElementToHtmlAsync(element)

      expect(captured).not.toBeNull()
      expect((captured as any).query.slug).toEqual(['a', 'b'])
      expect((captured as any).query.tag).toEqual(['a', 'b'])
      expect((captured as any).asPath).toBe('/docs/a/b?tag=a&tag=b#section')
    } finally {
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
    }
  })

  it('prefers dynamic route params over same-key search params in client router state', async () => {
    const { useRouter: useCompatRouter } = await import('../src/shims/compat-router.js?text-ssr')
    const { wrapWithRouterContext } = await import('../src/shims/router.js?text-ssr')

    const previousWindow = (globalThis as any).window
    ;(globalThis as any).window = {
      location: {
        pathname: '/docs/a/b',
        search: '?slug=c',
        hash: '',
      },
      __TEXT_DATA__: {
        page: '/docs/[...slug]',
        query: { slug: ['a', 'b'] },
        isFallback: false,
      },
      __TEXT_LOCALE__: undefined,
      __TEXT_LOCALES__: undefined,
      __TEXT_DEFAULT_LOCALE__: undefined,
    }

    try {
      let captured: unknown = 'NOT_SET'
      function Probe() {
        captured = useCompatRouter()
        return createElement('div', null, 'probe')
      }

      const element = wrapWithRouterContext(createElement(Probe))
      await renderAppServerElementToHtmlAsync(element)

      expect(captured).not.toBeNull()
      expect((captured as any).query.slug).toEqual(['a', 'b'])
      expect((captured as any).asPath).toBe('/docs/a/b?slug=c')
    } finally {
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
    }
  })

  it('treats prototype property names as ordinary query keys in client router state', async () => {
    const { useRouter: useCompatRouter } = await import('../src/shims/compat-router.js?text-ssr')
    const { wrapWithRouterContext } = await import('../src/shims/router.js?text-ssr')

    const previousWindow = (globalThis as any).window
    ;(globalThis as any).window = {
      location: {
        pathname: '/shallow-test',
        search: '?toString=a&constructor=b&__proto__=c',
        hash: '',
      },
      __TEXT_DATA__: {
        page: '/shallow-test',
        query: {},
        isFallback: false,
      },
      __TEXT_LOCALE__: undefined,
      __TEXT_LOCALES__: undefined,
      __TEXT_DEFAULT_LOCALE__: undefined,
    }

    try {
      let captured: unknown = 'NOT_SET'
      function Probe() {
        captured = useCompatRouter()
        return createElement('div', null, 'probe')
      }

      const element = wrapWithRouterContext(createElement(Probe))
      await renderAppServerElementToHtmlAsync(element)

      expect(captured).not.toBeNull()
      expect((captured as any).query.toString).toBe('a')
      expect((captured as any).query.constructor).toBe('b')
      expect((captured as any).query.__proto__).toBe('c')
      expect(Object.getPrototypeOf((captured as any).query)).toBe(Object.prototype)
    } finally {
      if (previousWindow === undefined) {
        delete (globalThis as any).window
      } else {
        ;(globalThis as any).window = previousWindow
      }
    }
  })
})
