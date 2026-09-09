import type { ReactiveRuntimeServices as ReactiveEffectRuntime } from './runtime-services.js'
import { type ComputedEffectBinding, type EffectHandle } from './effect.js'
import { SignalHandle } from './signal.js'

export type ComputedGetter<T> = () => T
export type ComputedSetter<T> = (value: T) => void

export interface ComputedOptions<T> {
  readonly get: ComputedGetter<T>
  readonly set?: ComputedSetter<T>
}

export type ComputedInput<T> = ComputedGetter<T> | ComputedOptions<T>

const normalizeComputed = <T>(input: ComputedInput<T>): ComputedOptions<T> =>
  typeof input === 'function' ? { get: input } : input

/**
 * Lazy derived signal driven by a hidden graph effect.
 *
 * Source writes only mark this node pending. A read validates upstream computed
 * nodes, executes the getter at most once per dirty version, and commits a new
 * value version only when the cached result actually changes. That version gate
 * prevents downstream effects from running for equal derived results. Writes
 * delegate only when a setter exists; readonly writes retain the public error.
 */
export class ComputedHandle<T> extends SignalHandle<T> implements ComputedEffectBinding {
  readonly #effect: EffectHandle
  readonly #getter: ComputedGetter<T>
  readonly #setter: ComputedSetter<T> | undefined
  #evaluating = false
  #initialized = false

  constructor(runtime: ReactiveEffectRuntime, input: ComputedInput<T>) {
    const options = normalizeComputed(input)
    const node = runtime.graph.createComputedNode()
    super(runtime, undefined as T, {}, node)
    this.#getter = options.get
    this.#setter = options.set
    this.#effect = runtime.createComputedEffect(node, this.#getter, this)
  }

  override get __isReadonly__(): boolean {
    return this.#setter === undefined
  }

  override get __rue_ref__(): boolean {
    return true
  }

  override set(next: T): void {
    if (this.#setter !== undefined) this.#setter(next)
    else super.set(next)
  }

  override update(updater: (current: T) => T): void {
    this.set(updater(this.peek()))
  }

  override dispose(): void {
    this.#effect.dispose()
    super.dispose()
  }

  override __rueInvalidateComputed(): boolean {
    this.runtime.invalidateComputed(this.node)
    return true
  }

  beginEvaluation(): boolean {
    if (this.#evaluating) return false
    this.#evaluating = true
    return true
  }

  commit(value: unknown): boolean {
    const next = value as T
    const changed = !this.#initialized || !Object.is(this.readCachedValue(), next)
    this.replaceCachedValue(next)
    this.#initialized = true
    this.#evaluating = false
    return changed
  }

  abort(): void {
    this.#evaluating = false
  }

  protected override beforeRead(): void {
    if (!this.#evaluating) this.runtime.runEffect(this.#effect.id)
  }

  protected override shouldTrackValueRead(): boolean {
    return true
  }
}

export const createComputed = <T>(
  runtime: ReactiveEffectRuntime,
  input: ComputedInput<T>,
): ComputedHandle<T> => new ComputedHandle(runtime, input)
