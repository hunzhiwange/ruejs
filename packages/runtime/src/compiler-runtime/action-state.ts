import {
  _$compiledSetup,
  getCurrentOwner,
  getOwnerParent,
  runWithOwner,
  onOwnerCleanup,
  _$compiledStateSignal,
  type CompiledOwner,
} from '../runtime-core/compiled'

export interface ActionFormState {
  version: 1
  key: string
  actionId: string
  state: unknown
}
export interface ActionStateEnvironment {
  scope: string
  next: number
  formState?: ActionFormState
  initial?: unknown[]
  states: unknown[]
}
const environments = new Map<CompiledOwner, ActionStateEnvironment>()
export function installActionStateEnvironment(
  owner: CompiledOwner,
  environment: ActionStateEnvironment,
): void {
  environments.set(owner, environment)
  runWithOwner(owner, () => {
    onOwnerCleanup(() => {
      environments.delete(owner)
    })
  })
}
export function readActionStateEnvironment(): ActionStateEnvironment | undefined {
  for (let owner = getCurrentOwner(); owner !== undefined; owner = getOwnerParent(owner)) {
    const environment = environments.get(owner)
    if (environment) return environment
  }
  return undefined
}
export function useActionState<S, P>(
  _action: (state: S, payload: P) => S | Promise<S>,
  _initial: S,
): [S, (payload: P) => Promise<void>, boolean] {
  throw new Error('Rue useActionState requires compilation to an owner slot')
}
export function _$compiledUseActionState<S, P>(
  slot: string,
  action: (state: S, payload: P) => S | Promise<S>,
  initial: S,
) {
  return _$compiledSetup(slot, () => {
    const environment = readActionStateEnvironment()
    const index = environment ? environment.next++ : 0
    const actionId = (action as Function & { $$id?: string }).$$id
    const key = `${environment?.scope ?? slot}:${index}`
    const submitted = environment?.formState
    const value =
      environment?.initial && index < environment.initial.length
        ? (environment.initial[index] as S)
        : submitted?.key === key && submitted.actionId === actionId
          ? (submitted.state as S)
          : initial
    const state = _$compiledStateSignal(value),
      pending = _$compiledStateSignal(false)
    if (environment) environment.states[index] = value
    let disposed = false
    onOwnerCleanup(() => {
      disposed = true
    })
    let queue = Promise.resolve()
    const dispatch = (payload: P): Promise<void> => {
      const run = queue.then(async () => {
        if (disposed) return
        pending.set(true)
        try {
          const result = await action(state.peek(), payload)
          if (!disposed) state.set(result)
        } finally {
          if (!disposed) pending.set(false)
        }
      })
      queue = run.catch(() => {})
      return run
    }
    if (actionId)
      Object.defineProperty(dispatch, '$$FORM_ACTION', {
        value: () => {
          const data = new FormData()
          data.set(
            '$RUE_ACTION_STATE',
            JSON.stringify({ version: 1, key, actionId, state: state.peek() }),
          )
          return {
            name: `$RUE_ACTION_ID_${actionId}`,
            action: '',
            method: 'POST',
            encType: 'multipart/form-data',
            data,
          }
        },
      })
    return [state, dispatch, pending] as const
  })
}
