import type { ReactiveRuntimeServices as ReactiveEffectRuntime } from './runtime-services.js'
import { effectCreateEffect } from './effect-core.js'
import { createSignal, type SignalHandle } from './signal.js'

export interface Resource<TData = unknown> {
  readonly data: SignalHandle<TData | undefined>
  readonly error: SignalHandle<unknown>
  readonly loading: SignalHandle<boolean>
}

/**
 * Three-signal asynchronous state driven by a reactive source.
 *
 * Each source change clears the previous payload and starts a new generation.
 * Only the latest request may publish a result, so a slower stale request cannot
 * overwrite data loaded for the current source.
 */
export const createResource = <TSource, TData>(
  runtime: ReactiveEffectRuntime,
  source: Pick<SignalHandle<TSource>, 'get'>,
  fetcher: (source: TSource) => Promise<TData> | unknown,
): Resource<TData> => {
  const data = createSignal<TData | undefined>(runtime, undefined)
  const error = createSignal<unknown>(runtime, undefined)
  const loading = createSignal(runtime, false)
  let requestVersion = 0

  effectCreateEffect(runtime.storage, () => {
    const value = source.get()
    const version = ++requestVersion
    data.set(undefined)
    loading.set(true)
    error.set(undefined)

    let result: unknown
    try {
      result = fetcher(value)
    } catch {
      result = undefined
    }
    const request = result instanceof Promise ? result : Promise.resolve(undefined)
    request
      .then(next => {
        if (version !== requestVersion) return
        data.set(next as TData)
        loading.set(false)
      })
      .catch(reason => {
        if (version !== requestVersion) return
        error.set(reason)
        loading.set(false)
      })
  })

  return { data, error, loading }
}
