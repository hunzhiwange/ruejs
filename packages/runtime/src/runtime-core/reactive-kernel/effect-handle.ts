import { effectDisposeEffect, type ReactiveEffectRuntimeStorage } from './effect-core.js'
export class EffectHandle {
  declare private readonly runtime: ReactiveEffectRuntimeStorage
  declare readonly id: number
  constructor(runtime: ReactiveEffectRuntimeStorage, id: number) {
    this.runtime = runtime
    this.id = id
  }

  dispose(): void {
    effectDisposeEffect(this.runtime, this.id)
  }

  free(): void {
    this.dispose()
  }

  [Symbol.dispose](): void {
    this.dispose()
  }
}
