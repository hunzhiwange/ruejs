import clientReferences from 'virtual:text-rsc/client-references'
import { setAppClientReferenceResolver } from './app-client-reference-resolver.js'
import {
  createAppRscSsrRuntimeProtocol,
  type AppRscSsrRuntimeProtocol,
} from './app-rsc-ssr-runtime-protocol-core.js'
import type { AppRscPluginRuntime } from './app-rsc-plugin-runtime.js'
function assertCompatEntry(entry: string): void {
  if (entry !== 'index') {
    throw new Error(`[text] Unsupported App RSC compat runtime entry "${entry}".`)
  }
}

function normalizeResolvedClientReferenceExport(exportName: string, value: unknown): unknown {
  if (
    typeof value === 'function' &&
    APP_SSR_ERROR_BOUNDARY_EXPORT_NAMES.has(exportName) &&
    !(value as { displayName?: unknown }).displayName
  ) {
    Object.defineProperty(value, 'displayName', {
      configurable: true,
      enumerable: false,
      value: exportName,
      writable: true,
    })
  }
  return value
}

function isServerClientReferenceStub(value: unknown): boolean {
  if (typeof value !== 'function') return false
  try {
    return Function.prototype.toString.call(value).includes('Unexpectedly client reference export')
  } catch {
    return false
  }
}

const compatAppRscPluginRuntime: AppRscPluginRuntime = {
  loadBootstrapScriptContent(entry) {
    assertCompatEntry(entry)
    // @ts-expect-error - plugin-rsc rewrites this compat hook at transform time.
    return import.meta.viteRsc.loadBootstrapScriptContent('index')
  },
  loadModule(environment, entry) {
    assertCompatEntry(entry)
    if (environment === 'rsc') {
      // @ts-expect-error - plugin-rsc rewrites this compat hook at transform time.
      return import.meta.viteRsc.loadModule('rsc', 'index')
    }
    // @ts-expect-error - plugin-rsc rewrites this compat hook at transform time.
    return import.meta.viteRsc.loadModule('ssr', 'index')
  },
}

export function installCompatAppClientReferenceResolver(): void {
  setAppClientReferenceResolver(async (key, name) => {
    const load = clientReferences[key]
    if (!load) throw new Error(`Text missing compiled reference module ${key}`)
    const module = await load()
    if (!Object.hasOwn(module, name))
      throw new Error(`Text missing compiled reference export ${key}#${name}`)
    return module[name]
  })
}
export function createCompatAppRscSsrRuntimeProtocol(): AppRscSsrRuntimeProtocol {
  return createAppRscSsrRuntimeProtocol({
    getClientReferences() {
      return clientReferences
    },
    getClientRequire() {
      return undefined
    },
    getRuntime() {
      return compatAppRscPluginRuntime
    },
    onPreloadError(id, error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[text] failed to preload client ref:', id, error)
      }
    },
  })
}

export const compatAppRscSsrRuntimeProtocol = createCompatAppRscSsrRuntimeProtocol()
