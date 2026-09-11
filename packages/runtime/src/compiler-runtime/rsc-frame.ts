/** A compiled server fragment. UI is already written; only registered client factories cross the boundary. */
export interface ServerFrame {
  version: 1
  html: string
  references: ClientBoundary[]
}
export interface ClientBoundary {
  actionStates?: unknown[]
  id: string
  identity?: string
  referenceKey: string
  exportName: string
  props: Record<string, unknown>
  children?: ServerFrame
}
export type ComponentResolver<T> = (referenceKey: string, exportName: string) => T | PromiseLike<T>
