import { describe, it, expect } from 'vite-plus/test'
import type { Plugin } from 'vite'
import text from '../src/index.js'
import {
  extractPackageName,
  extractPackageImportSpecifier,
  clientReferenceDedupPlugin,
} from '../src/plugins/client-reference-dedup.js'

describe('extractPackageName', () => {
  it('extracts a regular package name', () => {
    expect(extractPackageName('/project/node_modules/rue/index.js')).toBe('rue')
  })

  it('extracts a scoped package name', () => {
    expect(extractPackageName('/project/node_modules/@mantine/core/esm/MantineProvider.mjs')).toBe(
      '@mantine/core',
    )
  })

  it('handles nested node_modules (uses last segment)', () => {
    expect(extractPackageName('/project/node_modules/foo/node_modules/@bar/baz/lib/index.js')).toBe(
      '@bar/baz',
    )
  })

  it('handles package name with no subpath', () => {
    expect(extractPackageName('/project/node_modules/lodash')).toBe('lodash')
  })

  it('returns null for paths without node_modules', () => {
    expect(extractPackageName('/project/src/components/Foo.tsx')).toBeNull()
  })

  it('returns null for incomplete scoped package', () => {
    expect(extractPackageName('/project/node_modules/@org')).toBeNull()
  })

  it('handles deeply nested submodule paths', () => {
    expect(
      extractPackageName(
        '/project/node_modules/@mantine/core/esm/components/TextInput/TextInput.mjs',
      ),
    ).toBe('@mantine/core')
  })
})

describe('extractPackageImportSpecifier', () => {
  it('preserves exported package subpaths instead of collapsing them to the package root', async () => {
    const result = await extractPackageImportSpecifier(
      '/project/node_modules/widget-lib/client/button.js',
      async () =>
        JSON.stringify({
          name: 'widget-lib',
          exports: {
            '.': './index.js',
            './client/button': './client/button.js',
          },
        }),
    )

    expect(result).toEqual({
      packageName: 'widget-lib',
      specifier: 'widget-lib/client/button',
    })
  })

  it('preserves scoped exported package subpaths', async () => {
    const result = await extractPackageImportSpecifier(
      '/project/node_modules/@scope/widget/client/button.js',
      async () =>
        JSON.stringify({
          name: '@scope/widget',
          exports: {
            '.': './index.js',
            './client/button': './client/button.js',
          },
        }),
    )

    expect(result).toEqual({
      packageName: '@scope/widget',
      specifier: '@scope/widget/client/button',
    })
  })

  it('preserves package subpaths declared with export patterns', async () => {
    const result = await extractPackageImportSpecifier(
      '/project/node_modules/widget-lib/dist/client/button.js',
      async () =>
        JSON.stringify({
          name: 'widget-lib',
          exports: {
            '.': './dist/index.js',
            './client/*': './dist/client/*.js',
          },
        }),
    )

    expect(result).toEqual({
      packageName: 'widget-lib',
      specifier: 'widget-lib/client/button',
    })
  })

  it('preserves package subpaths declared with conditional exports', async () => {
    const result = await extractPackageImportSpecifier(
      '/project/node_modules/widget-lib/dist/client/button.js',
      async () =>
        JSON.stringify({
          name: 'widget-lib',
          exports: {
            '.': {
              import: './dist/index.mjs',
              default: './dist/index.js',
            },
            './client/button': {
              import: './dist/client/button.mjs',
              default: './dist/client/button.js',
            },
          },
        }),
    )

    expect(result).toEqual({
      packageName: 'widget-lib',
      specifier: 'widget-lib/client/button',
    })
  })

  it('keeps private package internals on the package root when exports block deep imports', async () => {
    const result = await extractPackageImportSpecifier(
      '/project/node_modules/fake-context-lib/internal/context.js',
      async () =>
        JSON.stringify({
          name: 'fake-context-lib',
          exports: {
            '.': './index.js',
          },
        }),
    )

    expect(result).toEqual({
      packageName: 'fake-context-lib',
      specifier: 'fake-context-lib',
    })
  })

  it('preserves legacy deep imports when package exports do not restrict subpaths', async () => {
    const result = await extractPackageImportSpecifier(
      '/project/node_modules/legacy-lib/client/button.js',
      async () =>
        JSON.stringify({
          name: 'legacy-lib',
          main: 'index.js',
        }),
    )

    expect(result).toEqual({
      packageName: 'legacy-lib',
      specifier: 'legacy-lib/client/button.js',
    })
  })

  it('maps extensionless legacy main entries back to the package root', async () => {
    const result = await extractPackageImportSpecifier(
      '/project/node_modules/legacy-lib/dist/index.js',
      async () =>
        JSON.stringify({
          name: 'legacy-lib',
          main: 'dist/index',
        }),
    )

    expect(result).toEqual({
      packageName: 'legacy-lib',
      specifier: 'legacy-lib',
    })
  })
})

describe('clientReferenceDedupPlugin', () => {
  const plugin = clientReferenceDedupPlugin()
  const resolveId = (plugin.resolveId as any).handler
  const load = (plugin.load as any).handler

  function createContext(envName: string) {
    return { environment: { name: envName } }
  }

  describe('resolveId', () => {
    it('redirects absolute node_modules imports from proxy modules in client env', async () => {
      const ctx = createContext('client')
      const result = await resolveId.call(
        ctx,
        '/project/node_modules/@mantine/core/esm/MantineProvider.mjs',
        '\0virtual:vite-rsc/client-in-server-package-proxy/abc123',
      )
      expect(result).toBe('\0text:dedup/@mantine/core')
    })

    it('preserves package subpaths when package exports map them', async () => {
      const subpathPlugin = clientReferenceDedupPlugin({
        readFile: async () =>
          JSON.stringify({
            name: 'widget-lib',
            exports: {
              '.': './index.js',
              './client/button': './client/button.js',
            },
          }),
      })
      const subpathResolveId = (subpathPlugin.resolveId as any).handler
      const ctx = createContext('client')
      const result = await subpathResolveId.call(
        ctx,
        '/project/node_modules/widget-lib/client/button.js',
        '\0virtual:vite-rsc/client-in-server-package-proxy/abc123',
      )

      expect(result).toBe('\0text:dedup/widget-lib/client/button')
    })

    it('keeps blocked private internals on the package root', async () => {
      const privateInternalPlugin = clientReferenceDedupPlugin({
        readFile: async () =>
          JSON.stringify({
            name: 'fake-context-lib',
            exports: {
              '.': './index.js',
            },
          }),
      })
      const privateInternalResolveId = (privateInternalPlugin.resolveId as any).handler
      const ctx = createContext('client')
      const result = await privateInternalResolveId.call(
        ctx,
        '/project/node_modules/fake-context-lib/internal/context.js',
        '\0virtual:vite-rsc/client-in-server-package-proxy/abc123',
      )

      expect(result).toBe('\0text:dedup/fake-context-lib')
    })

    it('redirects aliased package internals outside node_modules through the package root', async () => {
      const aliasedPackagePlugin = clientReferenceDedupPlugin({
        readFile: async path => {
          if (path === '/project/__test_packages__/fake-context-lib/package.json') {
            return JSON.stringify({
              name: 'fake-context-lib',
              exports: {
                '.': './index.js',
              },
            })
          }
          throw new Error('missing package.json')
        },
      })
      ;(aliasedPackagePlugin.configResolved as any)({
        root: '/project',
        environments: {
          client: { optimizeDeps: { exclude: [] } },
        },
        optimizeDeps: {},
      })
      const aliasedPackageResolveId = (aliasedPackagePlugin.resolveId as any).handler
      const ctx = createContext('client')
      const result = await aliasedPackageResolveId.call(
        ctx,
        '/project/__test_packages__/fake-context-lib/internal/context.js',
        '\0virtual:vite-rsc/client-in-server-package-proxy/abc123',
      )

      expect(result).toBe('\0text:dedup/fake-context-lib')
    })

    it('redirects SSR client-reference loader imports through the package root', async () => {
      const ssrLoaderPlugin = clientReferenceDedupPlugin({
        readFile: async path => {
          if (path === '/project/__test_packages__/fake-context-lib/package.json') {
            return JSON.stringify({
              name: 'fake-context-lib',
              exports: {
                '.': './index.js',
              },
            })
          }
          throw new Error('missing package.json')
        },
      })
      ;(ssrLoaderPlugin.configResolved as any)({
        root: '/project',
        environments: {
          client: { optimizeDeps: { exclude: [] } },
        },
        optimizeDeps: {},
      })
      const ssrLoaderResolveId = (ssrLoaderPlugin.resolveId as any).handler
      const ctx = createContext('ssr')
      const result = await ssrLoaderResolveId.call(
        ctx,
        '/project/__test_packages__/fake-context-lib/internal/context.js',
        '\0virtual:text-rsc/client-references',
      )

      expect(result).toBe('\0text:dedup/fake-context-lib')
    })

    it('redirects root-relative SSR client-reference loader imports through the package root', async () => {
      const rootRelativePlugin = clientReferenceDedupPlugin({
        readFile: async path => {
          if (path === '/project/__test_packages__/fake-context-lib/package.json') {
            return JSON.stringify({
              name: 'fake-context-lib',
              exports: {
                '.': './index.js',
              },
            })
          }
          throw new Error('missing package.json')
        },
      })
      ;(rootRelativePlugin.configResolved as any)({
        root: '/project',
        environments: {
          client: { optimizeDeps: { exclude: [] } },
        },
        optimizeDeps: {},
      })
      const rootRelativeResolveId = (rootRelativePlugin.resolveId as any).handler
      const ctx = createContext('ssr')
      const result = await rootRelativeResolveId.call(
        ctx,
        '/__test_packages__/fake-context-lib/internal/context.js',
        '\0virtual:text-rsc/client-references',
      )

      expect(result).toBe('\0text:dedup/fake-context-lib')
    })

    it('redirects RSC client-reference loader imports through the package root', async () => {
      const rscLoaderPlugin = clientReferenceDedupPlugin({
        readFile: async path => {
          if (path === '/project/__test_packages__/fake-context-lib/package.json') {
            return JSON.stringify({
              name: 'fake-context-lib',
              exports: {
                '.': './index.js',
              },
            })
          }
          throw new Error('missing package.json')
        },
      })
      ;(rscLoaderPlugin.configResolved as any)({
        root: '/project',
        environments: {
          client: { optimizeDeps: { exclude: [] } },
        },
        optimizeDeps: {},
      })
      const rscLoaderResolveId = (rscLoaderPlugin.resolveId as any).handler
      const ctx = createContext('rsc')
      const result = await rscLoaderResolveId.call(
        ctx,
        '/__test_packages__/fake-context-lib/internal/context.js$$cache=abc123',
        '\0virtual:text-rsc/client-references',
      )

      expect(result).toBe('\0text:dedup/fake-context-lib')
    })

    it('redirects client-environment client-reference loader imports through the package root', async () => {
      const clientLoaderPlugin = clientReferenceDedupPlugin({
        readFile: async path => {
          if (path === '/project/__test_packages__/fake-context-lib/package.json') {
            return JSON.stringify({
              name: 'fake-context-lib',
              exports: {
                '.': './index.js',
              },
            })
          }
          throw new Error('missing package.json')
        },
      })
      ;(clientLoaderPlugin.configResolved as any)({
        root: '/project',
        environments: {
          client: { optimizeDeps: { exclude: [] } },
        },
        optimizeDeps: {},
      })
      const clientLoaderResolveId = (clientLoaderPlugin.resolveId as any).handler
      const ctx = createContext('client')
      const result = await clientLoaderResolveId.call(
        ctx,
        '/__test_packages__/fake-context-lib/internal/context.js$$cache=abc123',
        '\0virtual:vite-rsc/client-references',
      )

      expect(result).toBe('\0text:dedup/fake-context-lib')
    })

    it('redirects cached root-relative SSR imports from the vite-rsc client-reference module', async () => {
      const rootRelativePlugin = clientReferenceDedupPlugin({
        readFile: async path => {
          if (path === '/project/__test_packages__/fake-context-lib/package.json') {
            return JSON.stringify({
              name: 'fake-context-lib',
              exports: {
                '.': './index.js',
              },
            })
          }
          throw new Error('missing package.json')
        },
      })
      ;(rootRelativePlugin.configResolved as any)({
        root: '/project',
        environments: {
          client: { optimizeDeps: { exclude: [] } },
        },
        optimizeDeps: {},
      })
      const rootRelativeResolveId = (rootRelativePlugin.resolveId as any).handler
      const ctx = createContext('ssr')
      const result = await rootRelativeResolveId.call(
        ctx,
        '/__test_packages__/fake-context-lib/internal/context.js$$cache=abc123',
        '\0virtual:vite-rsc/client-references',
      )

      expect(result).toBe('\0text:dedup/fake-context-lib')
    })

    it('does not redirect app source files under the Vite root package', async () => {
      const appSourcePlugin = clientReferenceDedupPlugin({
        readFile: async path => {
          if (path === '/project/package.json') {
            return JSON.stringify({
              name: 'project-app',
            })
          }
          throw new Error('missing package.json')
        },
      })
      ;(appSourcePlugin.configResolved as any)({
        root: '/project',
        environments: {
          client: { optimizeDeps: { exclude: [] } },
        },
        optimizeDeps: {},
      })
      const appSourceResolveId = (appSourcePlugin.resolveId as any).handler
      const ctx = createContext('client')
      const result = await appSourceResolveId.call(
        ctx,
        '/project/app/client-widget.tsx',
        '\0virtual:vite-rsc/client-in-server-package-proxy/abc123',
      )

      expect(result).toBeUndefined()
    })

    it('skips non-client environments', async () => {
      const ctx = createContext('rsc')
      const result = await resolveId.call(
        ctx,
        '/project/node_modules/@mantine/core/esm/MantineProvider.mjs',
        '\0virtual:vite-rsc/client-in-server-package-proxy/abc123',
      )
      expect(result).toBeUndefined()
    })

    it('skips imports not from proxy modules', async () => {
      const ctx = createContext('client')
      const result = await resolveId.call(
        ctx,
        '/project/node_modules/@mantine/core/esm/MantineProvider.mjs',
        '/project/src/App.tsx',
      )
      expect(result).toBeUndefined()
    })

    it('skips non-absolute paths', async () => {
      const ctx = createContext('client')
      const result = await resolveId.call(
        ctx,
        '@mantine/core',
        '\0virtual:vite-rsc/client-in-server-package-proxy/abc123',
      )
      expect(result).toBeUndefined()
    })

    it('skips paths without node_modules', async () => {
      const ctx = createContext('client')
      const result = await resolveId.call(
        ctx,
        '/project/src/components/Foo.tsx',
        '\0virtual:vite-rsc/client-in-server-package-proxy/abc123',
      )
      expect(result).toBeUndefined()
    })

    it('skips when importer is undefined', async () => {
      const ctx = createContext('client')
      const result = await resolveId.call(ctx, '/project/node_modules/rue/index.js', undefined)
      expect(result).toBeUndefined()
    })

    it('respects optimizeDeps.exclude from resolved config', async () => {
      const excludePlugin = clientReferenceDedupPlugin()
      // Simulate configResolved with @mantine/core excluded
      ;(excludePlugin.configResolved as any)({
        environments: {
          client: { optimizeDeps: { exclude: ['@mantine/core'] } },
        },
        optimizeDeps: {},
      })
      const excludeResolveId = (excludePlugin.resolveId as any).handler
      const ctx = createContext('client')
      const result = await excludeResolveId.call(
        ctx,
        '/project/node_modules/@mantine/core/esm/MantineProvider.mjs',
        '\0virtual:vite-rsc/client-in-server-package-proxy/abc123',
      )
      expect(result).toBeUndefined()
    })

    it('falls back to top-level optimizeDeps.exclude', async () => {
      const excludePlugin = clientReferenceDedupPlugin()
      ;(excludePlugin.configResolved as any)({
        optimizeDeps: { exclude: ['some-pkg'] },
      })
      const excludeResolveId = (excludePlugin.resolveId as any).handler
      const ctx = createContext('client')
      const result = await excludeResolveId.call(
        ctx,
        '/project/node_modules/some-pkg/dist/index.mjs',
        '\0virtual:vite-rsc/client-in-server-package-proxy/abc123',
      )
      expect(result).toBeUndefined()
    })
  })

  describe('load', () => {
    it('re-exports from the bare specifier for scoped packages', () => {
      const result = load.call({}, '\0text:dedup/@mantine/core')
      expect(result).toContain('"@mantine/core"')
    })

    it('re-exports from the bare specifier for unscoped packages', () => {
      const result = load.call({}, '\0text:dedup/rue')
      expect(result).toContain('"rue"')
    })

    it('re-exports from preserved package subpaths', () => {
      const result = load.call({}, '\0text:dedup/widget-lib/client/button')
      expect(result).toContain('"widget-lib/client/button"')
    })

    it('skips non-dedup module IDs', () => {
      const result = load.call({}, '\0some-other-virtual-module')
      expect(result).toBeUndefined()
    })
  })

  it('leaves component compilation and Rue imports to the compiler plugin', () => {
    expect(plugin.transform).toBeUndefined()
  })

  describe('plugin metadata', () => {
    it('has correct name', () => {
      expect(plugin.name).toBe('text:client-reference-dedup')
    })

    it('enforces pre', () => {
      expect(plugin.enforce).toBe('pre')
    })

    it('applies only in serve mode', () => {
      expect(plugin.apply).toBe('serve')
    })
  })
})

describe('text experimental.clientReferenceDedup', () => {
  function getPluginNames(options?: Parameters<typeof text>[0]) {
    return ((text(options) as Plugin[]).flat(Infinity) as Plugin[])
      .map(plugin => plugin?.name)
      .filter(Boolean)
  }

  it('does not register clientReferenceDedupPlugin by default', () => {
    expect(getPluginNames()).not.toContain('text:client-reference-dedup')
  })

  it('registers clientReferenceDedupPlugin when explicitly enabled', () => {
    expect(
      getPluginNames({
        experimental: { clientReferenceDedup: true },
      }),
    ).toContain('text:client-reference-dedup')
  })
})
