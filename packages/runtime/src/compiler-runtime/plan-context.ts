import {
  getCurrentOwner,
  getOwnerParent,
  runWithOwner,
  onOwnerCleanup,
  type CompiledOwner,
} from '../runtime-core/compiled'

export interface PlanContext<T> {
  defaultValue: T
  values: Map<CompiledOwner, () => T>
  Provider: (props: { value: T; children?: (context: any) => unknown }) => (context: any) => unknown
}
/** Context for writer/claim components. Values belong to explicit component owners. */
export const _$planContext = <T>(defaultValue: T): PlanContext<T> => {
  const context: PlanContext<T> = {
    defaultValue,
    values: new Map(),
    Provider: props => target => {
      const owner = getCurrentOwner()
      if (owner === undefined) throw new Error('Rue compiled Provider requires a component owner')
      context.values.set(owner, () => props.value)
      onOwnerCleanup(() => context.values.delete(owner))
      return props.children?.(target)
    },
  }
  return context
}
export const _$planUseContext = <T>(context: PlanContext<T>): T => {
  let owner = getCurrentOwner()
  while (owner !== undefined) {
    const value = context.values.get(owner)
    if (value) return value()
    owner = getOwnerParent(owner)
  }
  return context.defaultValue
}

/** The imported loader resolves a compiled function, never a renderable value. */
export const _$planAsyncComponent = (loader: () => Promise<{ default: (props: any) => any }>) => {
  let pending: ReturnType<typeof loader> | undefined
  return async (props: any) => {
    const owner = getCurrentOwner()
    const module = await (pending ??= loader())
    return owner === undefined
      ? module.default(props)
      : runWithOwner(owner, () => module.default(props))
  }
}
