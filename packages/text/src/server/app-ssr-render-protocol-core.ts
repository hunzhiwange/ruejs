import type { TextCompatNode } from '../shims/text-compat-types.js'
import type { AppRscFormState } from './app-rsc-form-state.js'

export type AppSsrReadableStream = ReadableStream<Uint8Array> & {
  allReady?: Promise<void>
}

export type AppSsrRenderOptions = {
  bootstrapModules?: string[]
  formState?: AppRscFormState | null
  nonce?: string
  onError?: (error: unknown) => Promise<string> | undefined
}

export type AppSsrRenderProtocol = {
  renderToReadableStream: (
    node: TextCompatNode,
    options: AppSsrRenderOptions,
  ) => Promise<AppSsrReadableStream>
  renderToStaticMarkup: (node: TextCompatNode) => Promise<string>
}

export function createAppSsrRenderProtocol(protocol: AppSsrRenderProtocol): AppSsrRenderProtocol {
  return protocol
}
