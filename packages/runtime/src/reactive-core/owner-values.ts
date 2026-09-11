import { onOwnerCleanup, runWithOwner, type CompiledOwner } from '../runtime-core/compiled'
const stores = new Map<CompiledOwner, Map<PropertyKey, unknown>>()
export const getOwnerValue = <T>(owner: CompiledOwner, key: PropertyKey): T | undefined =>
  stores.get(owner)?.get(key) as T | undefined
export const setOwnerValue = (owner: CompiledOwner, key: PropertyKey, value: unknown): void => {
  let store = stores.get(owner)
  if (!store) {
    store = new Map()
    stores.set(owner, store)
    runWithOwner(owner, () => onOwnerCleanup(() => stores.delete(owner)))
  }
  store.set(key, value)
}
