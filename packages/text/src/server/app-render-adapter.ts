import type { TextRenderable } from './renderable.js'
import { createAppServerElement } from './app-server-tree.js'

export type { TextRenderable } from './renderable.js'

type AppPageBoundaryOnError = (
  error: unknown,
  requestInfo: unknown,
  errorContext: unknown,
) => unknown

export type TextRscRenderOptions = {
  formState?: unknown
  nonce?: string
  onError: AppPageBoundaryOnError
}

export type TextRscRenderer = (
  element: TextRenderable | Readonly<Record<string, unknown>>,
  options: TextRscRenderOptions,
) => ReadableStream<Uint8Array>

export type TextRedirectPayloadThrowerFactory = (digest: string) => TextRenderable

export type TextRscRendererAdapter = {
  createRedirectPayloadThrower: TextRedirectPayloadThrowerFactory
  renderToReadableStream: TextRscRenderer
}

export function createRedirectPayloadThrower(digest: string): TextRenderable {
  return createAppServerElement(function TextRedirectPayloadThrower() {
    const err = new Error('TEXT_REDIRECT') as Error & { digest: string }
    err.digest = digest
    throw err
  })
}

export function createTextRscRendererAdapter(
  renderToReadableStream: TextRscRenderer,
): TextRscRendererAdapter {
  return {
    createRedirectPayloadThrower,
    renderToReadableStream,
  }
}
