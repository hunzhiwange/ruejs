import { AppElementsWire, type AppElements, type AppWireElements } from './app-elements.js'
export type AppSsrPayloadDecoder = (
  stream: ReadableStream<Uint8Array>,
) => AppWireElements | PromiseLike<AppWireElements>
export type AppSsrPayloadThenableReader = <T>(thenable: PromiseLike<T>) => T
export type AppSsrPayloadReaderOptions = {
  decodePayload: AppSsrPayloadDecoder
  primePageForHtmlSsr?: boolean
  readThenable: AppSsrPayloadThenableReader
}
export function createAppSsrPayloadReader(
  stream: ReadableStream<Uint8Array>,
  options: AppSsrPayloadReaderOptions,
): () => AppElements {
  const decoded = options.decodePayload(stream)
  if (typeof (decoded as PromiseLike<AppWireElements>).then !== 'function') {
    const elements = AppElementsWire.decode(decoded as AppWireElements)
    return () => elements
  }
  const pending = Promise.resolve(decoded).then(AppElementsWire.decode)
  // The caller can delay its first read; keep errors observable without an unhandled rejection.
  void pending.catch(() => {})
  return () => options.readThenable(pending)
}
export async function resolveAppSsrPayloadElements(
  stream: ReadableStream<Uint8Array>,
  options: AppSsrPayloadReaderOptions,
): Promise<AppElements> {
  return AppElementsWire.decode(await options.decodePayload(stream))
}
