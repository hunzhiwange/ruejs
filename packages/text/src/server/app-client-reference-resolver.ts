import { isAppRscServerClientReference } from './app-rsc-client-reference-protocol.js'
export type AppClientReferenceResolver = (
  referenceKey: string,
  exportName: string,
) => unknown | PromiseLike<unknown>
const KEY = Symbol.for('text.compiled.ssr.reference.resolver')
const state = globalThis as unknown as Record<symbol, AppClientReferenceResolver | undefined>
export function setAppClientReferenceResolver(resolver: AppClientReferenceResolver | null): void {
  if (resolver) state[KEY] = resolver
  else delete state[KEY]
}
export function hasAppClientReferenceResolver(): boolean {
  return typeof state[KEY] === 'function'
}
export function isUnresolvedAppClientReferenceExport(value: unknown): boolean {
  return isAppRscServerClientReference(value)
}
export async function resolveAppClientReferenceExport(key: string, name: string): Promise<unknown> {
  const resolver = state[KEY]
  if (!resolver) throw new Error('Text compiled SSR reference manifest is not installed')
  const value = await resolver(key, name)
  if (typeof value !== 'function' || isUnresolvedAppClientReferenceExport(value))
    throw new Error(`Text missing compiled SSR export ${key}#${name}`)
  return value
}
export function resolveAppClientReference(value: unknown): Promise<unknown> | null {
  if (!isAppRscServerClientReference(value)) return null
  const id = (value as { $$id: string }).$$id
  const position = id.lastIndexOf('#')
  if (position < 1) throw new Error('Text invalid compiled client reference')
  return resolveAppClientReferenceExport(id.slice(0, position), id.slice(position + 1))
}
