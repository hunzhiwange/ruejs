import { APP_ROUTE_KEY, isAppElementsRecord, type AppElements } from '../src/server/app-elements.js'
import {
  AppServerFragment,
  type AppServerComponent,
  type AppServerRenderable,
} from '../src/server/app-server-tree.js'
import { createElement, renderToString } from './rue-ssr-test-utils.js'
import {
  beginCurrentSsrAppElements,
  clearCurrentSsrAppElements,
  setCurrentSsrAppElements,
} from '../src/shims/slot-core.js'

export { createElement }
export const Fragment = AppServerFragment
export type TestServerComponent<P = Record<string, unknown>> = AppServerComponent<P>
export type TestServerNode = AppServerRenderable

export function createStreamFromMarkup(markup: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(markup))
      controller.close()
    },
  })
}
function enter(element: AppServerRenderable | AppElements) {
  const global = globalThis as Record<string, unknown>
  const previous = global.__rue_is_server_rendering__
  global.__rue_is_server_rendering__ = typeof previous === 'number' ? previous + 1 : 1
  beginCurrentSsrAppElements()
  let plan = element as AppServerRenderable
  if (isAppElementsRecord(element)) {
    setCurrentSsrAppElements(element)
    plan = element[element[APP_ROUTE_KEY] as string] as AppServerRenderable
  }
  return {
    plan,
    exit() {
      clearCurrentSsrAppElements()
      if (previous === undefined) delete global.__rue_is_server_rendering__
      else global.__rue_is_server_rendering__ = previous
    },
  }
}
export async function renderAppServerElementToHtml(
  element: AppServerRenderable | AppElements,
): Promise<string> {
  const scope = enter(element)
  try {
    if (typeof scope.plan !== 'function') throw new Error('Expected a compiled App SSR plan')
    return await renderToString(() => scope.plan)
  } finally {
    scope.exit()
  }
}
export const renderAppServerElementToHtmlAsync = renderAppServerElementToHtml
export function renderAppServerElementToStream(
  element: AppServerRenderable | AppElements,
): ReadableStream<Uint8Array> {
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  return new ReadableStream({
    async start(controller) {
      const scope = enter(element)
      try {
        if (typeof scope.plan !== 'function') throw new Error('Expected a compiled App SSR plan')
        const { renderToReadableStream } = await import('@rue-js/runtime/server')
        const stream = await renderToReadableStream(() => scope.plan)
        reader = stream.getReader()
        for (;;) {
          const next = await reader.read()
          if (next.done) break
          controller.enqueue(next.value)
        }
        controller.close()
      } catch (error) {
        controller.error(error)
      } finally {
        reader?.releaseLock()
        scope.exit()
      }
    },
    cancel(reason) {
      return reader?.cancel(reason)
    },
  })
}
export const renderAppServerElementToStreamAsync = renderAppServerElementToStream
