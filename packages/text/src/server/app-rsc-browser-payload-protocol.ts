import { decodeRuePayloadFetch, decodeRuePayloadReadableStream } from '@rue-js/rsc/core/payload'
import type { AppBrowserActionCodecOptions } from './app-rsc-browser-action-protocol-core.js'
import {
  createAppBrowserPayloadProtocol as createAppBrowserPayloadProtocolCore,
  type AppBrowserPayloadProtocol,
} from './app-rsc-browser-payload-protocol-core.js'

export {
  createAppBrowserPayloadProtocol,
  type AppBrowserPayloadProtocol,
  type AppBrowserPayloadProtocolLoader,
  type CreateAppBrowserPayloadProtocolOptions,
} from './app-rsc-browser-payload-protocol-core.js'
export {
  createAppBrowserPayloadProtocol as createBrowserRscPayloadProtocol,
  type AppBrowserPayloadProtocol as BrowserRscPayloadProtocol,
  type AppBrowserPayloadProtocolLoader as BrowserRscPayloadProtocolLoader,
  type CreateAppBrowserPayloadProtocolOptions as CreateBrowserRscPayloadProtocolOptions,
} from './app-rsc-browser-payload-protocol-core.js'

export const appBrowserPayloadProtocol: AppBrowserPayloadProtocol =
  createAppBrowserPayloadProtocolCore({
    async load() {
      return {
        decodeFetch<T>(response: Promise<Response>, _options?: AppBrowserActionCodecOptions) {
          return decodeRuePayloadFetch<T>(response, {})
        },
        decodeReadableStream<T>(
          stream: ReadableStream<Uint8Array>,
          _options?: AppBrowserActionCodecOptions,
        ) {
          return decodeRuePayloadReadableStream<T>(stream, {})
        },
      }
    },
  })

export function decodeBrowserRscFetch<T>(
  response: Promise<Response>,
  options?: AppBrowserActionCodecOptions,
): Promise<T> {
  return appBrowserPayloadProtocol.decodeFetch<T>(response, options)
}

export function decodeBrowserRscReadableStream<T>(
  stream: ReadableStream<Uint8Array>,
  options?: AppBrowserActionCodecOptions,
): Promise<T> {
  return appBrowserPayloadProtocol.decodeReadableStream<T>(stream, options)
}
