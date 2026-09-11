import { createComment, appendChild } from './dom.browser'
import {
  getCurrentOwner,
  getOwnerParent,
  onOwnerCleanup,
  type CompiledOwner,
} from '../runtime-core/compiled'
import { _$compiledRoot } from './block'
import { _$mountCompiledSlotAt, type BlockFactory } from './block-factory'
import type { CompiledComponentFactory } from './component'

export interface ContextProviderProps<T> {
  value: T
  children?: BlockFactory<any>
}
export interface RueContext<T> {
  defaultValue: T
  Provider: CompiledComponentFactory<ContextProviderProps<T>>
  values: Map<CompiledOwner, () => T>
}
export function provideContext<T>(context: RueContext<T>, read: () => T): void {
  const owner = getCurrentOwner()
  if (!owner) throw new Error('[rue] context requires an owner')
  context.values.set(owner, read)
  onOwnerCleanup(() => context.values.delete(owner))
}
export function createContext<T>(defaultValue: T): RueContext<T> {
  const context: RueContext<T> = {
    defaultValue,
    values: new Map(),
    Provider: (props, slots) => {
      provideContext(context, () => props.value)
      return _$compiledRoot(parent => {
        if (!parent) throw new Error('[rue] Provider requires a mount parent')
        const start = createComment('rue:context')
        const end = createComment('/rue:context')
        appendChild(parent, start)
        appendChild(parent, end)
        _$mountCompiledSlotAt(
          { parent, before: end },
          () => slots.default,
          () => ({}),
        )
        return [start, end]
      })
    },
  }
  return context
}
export function useContext<T>(context: RueContext<T>): T {
  let owner = getCurrentOwner()
  while (owner) {
    const read = context.values.get(owner)
    if (read) return read()
    owner = getOwnerParent(owner)
  }
  return context.defaultValue
}
