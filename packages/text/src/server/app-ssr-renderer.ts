import { renderToString, renderToReadableStream, type ServerPlan } from '@rue-js/runtime/server'
import { isAppServerPlan, startAppServerPlan } from './app-server-tree.js'
import type { AppSsrReadableStream, AppSsrRenderOptions } from './app-ssr-render-protocol-core.js'
export type { AppSsrReadableStream, AppSsrRenderOptions }
export { readAppSsrThenableValue } from './app-ssr-thenable-protocol.js'

export async function renderAppSsrToReadableStream(
  plan: ServerPlan,
  options: AppSsrRenderOptions,
): Promise<AppSsrReadableStream> {
  try {
    if (isAppServerPlan(plan)) {
      const result = await startAppServerPlan(plan, {
        formState: options.formState as
          | import('@rue-js/runtime/internal/ssr').ActionFormState
          | undefined,
        nonce: options.nonce,
      })
      return result.stream as AppSsrReadableStream
    }
    return await renderToReadableStream(() => plan, { nonce: options.nonce })
  } catch (error) {
    options.onError?.(error)
    throw error
  }
}
export function renderAppSsrToStaticMarkup(plan: ServerPlan): Promise<string> {
  return renderToString(() => plan)
}
