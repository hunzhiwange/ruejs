import type { ReactiveNodeId } from './graph.js'
import * as effects from './effect-core.js'
import { graphCreateDependencyNode } from './graph-core.js'
import type { ReactiveEffectRuntimeStorage } from './effect-core.js'

const scalarBridge = globalThis as typeof globalThis & {
  __rue_s__?: (source: object, trigger?: boolean) => void
}

export type EqualityComparator<T> = (previous: T, next: T) => boolean

export interface SignalOptions<T> {
  readonly equals?: EqualityComparator<T>
}

/** Root signal operations shared by compiler handles and path-aware public handles. */
export class SignalBase<T> {
  declare private readonly _equals: EqualityComparator<T>
  declare protected _value: T
  declare protected disposed: boolean
  declare protected readonly kernel: ReactiveEffectRuntimeStorage
  declare protected readonly node: ReactiveNodeId
  declare readonly __rue_signal_id__: number
  constructor(
    kernel: ReactiveEffectRuntimeStorage,
    initial: T,
    options: SignalOptions<T> = {},
    node: ReactiveNodeId = graphCreateDependencyNode(kernel.graph),
    __rue_signal_id__: number = effects.effectAllocateSignalId(kernel),
  ) {
    this.kernel = kernel
    this.node = node
    this.__rue_signal_id__ = __rue_signal_id__
    this.disposed = false
    this._value = initial
    this._equals = options.equals ?? Object.is
  }

  get value(): T {
    return this._value
  }

  set value(next: T) {
    this.set(next)
  }

  get(): T {
    effects.effectTrackDependency(this.kernel, this.node)
    scalarBridge.__rue_s__?.(this)
    return this._value
  }

  peek(): T {
    return this._value
  }

  set(next: T): void {
    const previous = this._value
    this._value = next
    let equal = false
    try {
      equal = this._equals(previous, next)
    } catch {}
    if (!this.disposed && !equal) this.notify(previous, next)
  }

  update(updater: (current: T) => T): void {
    this.set(updater(this._value))
  }
  trigger(): void {
    if (!this.disposed) this.notify(this._value, this._value)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    effects.effectRemoveReactiveNode(this.kernel, this.node)
  }
  free(): void {
    this.dispose()
  }

  [Symbol.dispose](): void {
    this.dispose()
  }

  protected notify(oldValue: T, newValue: T): void {
    scalarBridge.__rue_s__?.(this, true)
    effects.effectTriggerDependency(this.kernel, this.node, {
      key: 'value',
      newValue,
      oldValue,
      path: [],
      target: this,
      type: 'set',
    })
  }
}

export type RootSignalHandle<T> = Pick<SignalBase<T>, keyof SignalBase<T>>

/** Compiler ABI value cache; subscriptions and lifetime use the same kernel nodes. */
export const createRootSignal = <T>(
  runtime: ReactiveEffectRuntimeStorage,
  initial: T,
  options?: SignalOptions<T> | null,
): RootSignalHandle<T> => {
  let value = initial
  let disposed = false
  const node = graphCreateDependencyNode(runtime.graph)
  const equals = options?.equals ?? Object.is
  const notify = (oldValue: T, newValue: T) => {
    if (!disposed) {
      scalarBridge.__rue_s__?.(handle, true)
      effects.effectTriggerDependency(runtime, node, {
        key: 'value',
        oldValue,
        newValue,
        path: [],
        target: handle,
        type: 'set',
      })
    }
  }
  const handle: RootSignalHandle<T> = {
    __rue_signal_id__: effects.effectAllocateSignalId(runtime),
    get value() {
      return value
    },
    set value(next) {
      handle.set(next)
    },
    get() {
      effects.effectTrackDependency(runtime, node)
      scalarBridge.__rue_s__?.(handle)
      return value
    },
    peek: () => value,
    set(next) {
      const previous = value
      value = next
      let equal = false
      try {
        equal = equals(previous, next)
      } catch {}
      if (!equal) notify(previous, next)
    },
    update(updater) {
      handle.set(updater(value))
    },
    trigger() {
      notify(value, value)
    },
    dispose() {
      if (disposed) return
      disposed = true
      effects.effectRemoveReactiveNode(runtime, node)
    },
    free() {
      handle.dispose()
    },
    [Symbol.dispose]() {
      handle.dispose()
    },
  }
  return handle
}
