import {
  renderToString as writeToString,
  renderToReadableStream as writeToReadableStream,
  type RenderToStringOptions,
  type ServerStream,
} from './compiler-runtime/ssr-writer'
import type { FC } from './runtime-types'

// Source components acquire their writer ABI when compiled for the server target.
// Keep the private writer types strict; this public boundary also accepts source JSX.
export const renderToString = writeToString as typeof writeToString &
  ((component: FC<any>, options?: RenderToStringOptions) => Promise<string>)
export const renderToReadableStream = writeToReadableStream as typeof writeToReadableStream &
  ((component: FC<any>, options?: RenderToStringOptions) => Promise<ServerStream>)
export {
  type RenderToStringOptions,
  type ServerPlan,
  type ServerComponent,
} from './compiler-runtime/ssr-writer'

export { createCompiledClientReference } from './compiler-runtime/ssr-writer'
export type { Writer, ClientReferenceWriter } from './compiler-runtime/ssr-writer'
export { CompiledIsland, CompiledServerIsland } from './ssr/island-writer'
