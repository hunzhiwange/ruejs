export {
  createAppSsrRenderProtocol,
  type AppSsrReadableStream,
  type AppSsrRenderOptions,
  type AppSsrRenderProtocol,
} from './app-ssr-render-protocol-core.js'
import type { TextCompatNode } from '../shims/text-compat-types.js'
import { renderAppSsrToReadableStream, renderAppSsrToStaticMarkup } from './app-ssr-renderer.js'
import {
  createAppSsrRenderProtocol,
  type AppSsrRenderOptions,
} from './app-ssr-render-protocol-core.js'

export const appSsrRenderProtocol = createAppSsrRenderProtocol({
  renderToReadableStream(node, options) {
    return renderAppSsrToReadableStream(node, options)
  },
  renderToStaticMarkup(node) {
    return renderAppSsrToStaticMarkup(node)
  },
})

export function renderAppSsrNodeToStaticMarkup(node: TextCompatNode): Promise<string> {
  return appSsrRenderProtocol.renderToStaticMarkup(node)
}

export function renderAppSsrNodeToReadableStream(
  node: TextCompatNode,
  options: AppSsrRenderOptions,
): ReturnType<typeof appSsrRenderProtocol.renderToReadableStream> {
  return appSsrRenderProtocol.renderToReadableStream(node, options)
}
