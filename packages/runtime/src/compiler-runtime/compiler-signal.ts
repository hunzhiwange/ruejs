import { signal } from '../runtime-core/compiled'

// Compiler slots also receive values from in-place state mutations. An unchanged
// object reference cannot establish that its fields are unchanged.
export const sameCompiledValue = (previous: unknown, next: unknown): boolean =>
  (next === null || typeof next !== 'object') && Object.is(previous, next)

export const _$compiledSignal = <T>(initial: T) => signal(initial, { equals: sameCompiledValue })
