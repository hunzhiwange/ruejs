import { expect } from 'vitest'

import { createReactiveKernel } from '../src/runtime-core/reactive-kernel/index'

export const REACTIVE_KERNEL_EXPORT_NAMES = [
  'EffectHandle',
  'SignalHandle',
  '__rueActivateEffectOwnerTracking',
  '__rueActivateRenderTriggered',
  '__rueBeginRenderDebugOwner',
  '__rueCreateDetachedEffectScope',
  '__rueCurrentEffectId',
  '__rueDisposeEffectScope',
  '__rueEndRenderDebugOwner',
  '__rueGetCurrentEffectScope',
  '__ruePopEffectScope',
  '__ruePushEffectScope',
  'batch',
  'createComputed',
  'createCustomRef',
  'createEffect',
  'createRef',
  'createResource',
  'createSignal',
  'nextTick',
  'onCleanup',
  'onScopeDispose',
  'onWatcherCleanup',
  'setReactiveScheduling',
  'toValue',
  'untrack',
  'watch',
  'watchDeepSignal',
  'watchEffect',
  'watchFn',
  'watchPath',
  'watchSignal',
] as const

const SIGNAL_METHOD_NAMES = [
  'get',
  'getPath',
  'peek',
  'peekPath',
  'set',
  'setPath',
  'toJSON',
  'toString',
  'trigger',
  'triggerPath',
  'update',
  'updatePath',
  'valueOf',
] as const

const EFFECT_METHOD_NAMES = ['dispose'] as const

type KernelExportName = (typeof REACTIVE_KERNEL_EXPORT_NAMES)[number]
type KernelFunction = (...args: unknown[]) => unknown

export interface KernelSignalHandle {
  get(): unknown
  peek(): unknown
  set(value: unknown): void
  [key: PropertyKey]: unknown
}

export interface KernelEffectHandle {
  dispose(): void
  [key: PropertyKey]: unknown
}

export type ReactiveKernelOracle = Record<KernelExportName, unknown> & {
  createComputed(getter: () => unknown): KernelSignalHandle
  createEffect(callback: () => void, options?: unknown): KernelEffectHandle
  createSignal(initial: unknown, options?: unknown): KernelSignalHandle
  setReactiveScheduling(mode: string): void
}

export interface ReactiveKernelContractAudit {
  exportCount: number
  effectMethods: string[]
  signalMethods: string[]
}

export type NormalizedKernelValue =
  | null
  | boolean
  | number
  | string
  | NormalizedKernelValue[]
  | { [key: string]: NormalizedKernelValue }

const isObjectLike = (value: unknown): value is Record<PropertyKey, unknown> =>
  (typeof value === 'object' && value !== null) || typeof value === 'function'

const assertObjectLike: (
  value: unknown,
  description: string,
) => asserts value is Record<PropertyKey, unknown> = (value, description) => {
  if (!isObjectLike(value)) throw new TypeError(`${description} must be an object`)
}

const assertMethods = (
  value: unknown,
  methodNames: readonly string[],
  description: string,
): void => {
  assertObjectLike(value, description)
  const missing = methodNames.filter(name => typeof value[name] !== 'function')
  if (missing.length > 0) {
    throw new TypeError(`${description} is missing methods: ${missing.join(', ')}`)
  }
}

export const createReactiveKernelReference = (): ReactiveKernelOracle => {
  const kernel: unknown = createReactiveKernel()
  assertObjectLike(kernel, 'reactive kernel reference')
  return kernel as ReactiveKernelOracle
}

export const assertReactiveKernelContract = (kernel: unknown): ReactiveKernelContractAudit => {
  assertObjectLike(kernel, 'reactive kernel')
  const actualExports = Object.keys(kernel).sort()
  const missingExports = REACTIVE_KERNEL_EXPORT_NAMES.filter(name => !(name in kernel))
  const unexpectedExports = actualExports.filter(
    name => !REACTIVE_KERNEL_EXPORT_NAMES.includes(name as KernelExportName),
  )
  if (missingExports.length > 0 || unexpectedExports.length > 0) {
    throw new TypeError(
      `reactive kernel export mismatch; missing: ${missingExports.join(', ') || 'none'}; unexpected: ${unexpectedExports.join(', ') || 'none'}`,
    )
  }

  for (const name of REACTIVE_KERNEL_EXPORT_NAMES) {
    if (typeof kernel[name] !== 'function') {
      throw new TypeError(`reactive kernel export ${name} must be a function`)
    }
  }

  const createSignal = kernel.createSignal as KernelFunction
  const createComputed = kernel.createComputed as KernelFunction
  const createEffect = kernel.createEffect as KernelFunction
  const signal = Reflect.apply(createSignal, undefined, [0])
  const computed = Reflect.apply(createComputed, undefined, [() => 1])
  const effect = Reflect.apply(createEffect, undefined, [() => undefined, { lazy: true }])

  assertMethods(signal, SIGNAL_METHOD_NAMES, 'Signal handle')
  assertMethods(computed, ['get', 'peek'], 'Computed handle')
  assertMethods(effect, EFFECT_METHOD_NAMES, 'Effect handle')
  Reflect.apply((effect as Record<string, KernelFunction>).dispose, effect, [])

  return {
    exportCount: actualExports.length,
    effectMethods: [...EFFECT_METHOD_NAMES],
    signalMethods: [...SIGNAL_METHOD_NAMES],
  }
}

const normalizeValue = (value: unknown, seen: WeakSet<object>): NormalizedKernelValue => {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return '[NaN]'
    if (value === Number.POSITIVE_INFINITY) return '[Infinity]'
    if (value === Number.NEGATIVE_INFINITY) return '[-Infinity]'
    if (Object.is(value, -0)) return '[-0]'
    return value
  }
  if (typeof value === 'undefined') return '[undefined]'
  if (typeof value === 'bigint') return `${value}n`
  if (typeof value === 'symbol') return String(value)
  if (typeof value === 'function') return `[Function:${value.name || 'anonymous'}]`

  if (!isObjectLike(value)) return String(value)

  if (seen.has(value)) return '[Circular]'
  seen.add(value)
  if (Array.isArray(value)) return value.map(entry => normalizeValue(entry, seen))
  if (value instanceof Error) {
    return { message: value.message, name: value.name }
  }

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map(key => [key, normalizeValue(value[key], seen)]),
  )
}

export const normalizeKernelResult = (value: unknown): NormalizedKernelValue =>
  normalizeValue(value, new WeakSet<object>())

export const expectKernelScenarioParity = (
  candidateResult: unknown,
  oracleResult: unknown,
  assertBehavior: (result: NormalizedKernelValue) => void,
): { candidate: NormalizedKernelValue; oracle: NormalizedKernelValue } => {
  const candidate = normalizeKernelResult(candidateResult)
  const oracle = normalizeKernelResult(oracleResult)

  assertBehavior(candidate)
  assertBehavior(oracle)
  expect(candidate).toEqual(oracle)
  return { candidate, oracle }
}
