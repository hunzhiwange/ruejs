import {
  createSignal as createPathSignal,
  type SignalHandle,
  type SignalPathToken,
} from './reactive-kernel/signal.js'
import { getSharedReactiveRuntime } from './reactive-kernel/shared-runtime.js'
import { createSelectorSubscriptions } from './reactive-kernel/selector.js'
import * as effects from './reactive-kernel/effect-core.js'
import {
  schedulerEnqueue,
  schedulerScheduleMicrotaskDrain,
} from './reactive-kernel/scheduler-core.js'
import { graphDebugStats } from './reactive-kernel/graph-core.js'
import {
  getSharedReactiveStorage,
  peekSharedReactiveStorage,
} from './reactive-kernel/shared-runtime.js'
import {
  createRootSignal as createSignal,
  type RootSignalHandle,
} from './reactive-kernel/signal-base.js'

export type CompiledOwner = number
export type ReactiveSchedulingMode = 'sync' | 'microtask' | 'frame'
export type EffectCleanup = () => void
export type EffectCallback = () => unknown
export type EffectScheduler = (runner: () => void) => void

export interface EffectOptions {
  readonly onTrigger?: (event: effects.ReactiveTriggerEvent) => void
  readonly lazy?: boolean
  readonly scheduler?: EffectScheduler
  readonly onDispose?: EffectCleanup
}

export interface SignalOptions<T> {
  readonly equals?: (previous: T, next: T) => boolean
}

export type CompiledSignalHandle<T> = RootSignalHandle<T>

export interface EffectHandle {
  readonly id: number
  dispose(): void
  free(): void
  [Symbol.dispose](): void
}

export type CompiledLifecyclePhase =
  | 'beforeMount'
  | 'mounted'
  | 'beforeUpdate'
  | 'updated'
  | 'activated'
  | 'deactivated'
  | 'beforeUnmount'
  | 'unmounted'

type DisposeAttempt = <T>(cleanup: (value: T) => unknown, value: T) => void
type OwnerLifecycle = Partial<Record<CompiledLifecyclePhase, EffectCleanup[]>> & {
  dispose?: (
    owner: CompiledOwner,
    phase: 'beforeUnmount' | 'unmounted',
    attempt: DisposeAttempt,
  ) => void
}

const enum OwnerField {
  Parent,
  Children,
  Scope,
  Cleanups,
  Disposed,
  Lifecycle,
  Effects,
  SetupValues,
  EffectBoundary,
}
type OwnerRecord = [
  CompiledOwner | undefined,
  Set<CompiledOwner>,
  number | undefined,
  EffectCleanup[],
  boolean,
  OwnerLifecycle?,
  Set<EffectHandle>?,
  Map<string, unknown>?,
  ((run: () => void) => void)?,
]

let currentOwner: CompiledOwner | undefined
let currentOwnerCleanupCollector: EffectCleanup[] | undefined
let ownerDisposalDepth = 0
let nextOwnerId = 1
const ownerFrames: { record: OwnerRecord; entered: boolean }[] = []
const enterOwnerScopes = (runtime: ReturnType<typeof getSharedReactiveStorage>) => {
  const scopeOps = runtime.scopeOps
  if (!scopeOps) return
  for (const frame of ownerFrames) {
    if (frame.entered) continue
    frame.record[OwnerField.Scope] ??= scopeOps.create()
    frame.entered = scopeOps.push(frame.record[OwnerField.Scope])
  }
}
const reactiveRuntime = () => {
  const runtime = getSharedReactiveStorage()
  enterOwnerScopes(runtime)
  return runtime
}
const owners = new Map<CompiledOwner, OwnerRecord>()
let pendingRootLifecycle: OwnerLifecycle | undefined

export interface CompiledReactiveDebugState {
  nodeCount: number
  linkCount: number
  activeOwners: number
  activeEffects: number
}

/** Test/development-only visibility into compact reactive resource retention. */
export const __rueGetCompiledReactiveDebugState = (): CompiledReactiveDebugState => ({
  nodeCount: peekSharedReactiveStorage()
    ? graphDebugStats(peekSharedReactiveStorage()!.graph).nodeCount
    : 0,
  linkCount: peekSharedReactiveStorage()
    ? graphDebugStats(peekSharedReactiveStorage()!.graph).linkCount
    : 0,
  activeOwners: owners.size,
  activeEffects: Array.from(owners.values()).reduce(
    (count, owner) => count + (owner[OwnerField.Effects]?.size ?? 0),
    0,
  ),
})

export const setReactiveScheduling = (mode: ReactiveSchedulingMode): void => {
  effects.effectSetScheduling(reactiveRuntime(), mode)
}

export const signal = <T>(
  initial: T,
  options?: SignalOptions<T> | null,
): CompiledSignalHandle<T> => {
  const runtime = reactiveRuntime()
  const handle = createSignal(runtime, initial, options)
  const dispose = () => handle.dispose()
  if (!runtime.scopeOps?.cleanup(dispose) && currentOwner !== undefined)
    owners.get(currentOwner)?.[OwnerField.Cleanups].push(dispose)
  return handle
}

/** Path-aware state shares the public signal trie and the compiler's owner lifetime. */
export const _$compiledStateSignal = <T>(
  initial: T,
  options?: SignalOptions<T>,
): SignalHandle<T> => {
  const handle = createPathSignal(getSharedReactiveRuntime(), initial, options)
  const runtime = reactiveRuntime()
  const dispose = () => handle.dispose()
  if (!runtime.scopeOps?.cleanup(dispose) && currentOwner !== undefined)
    owners.get(currentOwner)?.[OwnerField.Cleanups].push(dispose)
  return handle
}

export interface CompiledPath {
  readonly keys: readonly PropertyKey[]
  readonly optional: readonly boolean[]
  readonly tokens: WeakMap<object, SignalPathToken>
}

export const _$compiledPath = (
  keys: readonly PropertyKey[],
  optional: readonly boolean[],
): CompiledPath => ({ keys, optional, tokens: new WeakMap() })

export const _$compiledReadPath = (state: SignalHandle<unknown>, path: CompiledPath): any => {
  let token = path.tokens.get(state)
  if (token === undefined) {
    token = state.resolvePath(path.keys)
    path.tokens.set(state, token)
  }
  state.trackPath(token)
  let value: any = state.peek()
  for (let index = 0; index < path.keys.length; index++) {
    if (value == null && path.optional[index]) return undefined
    value = value[path.keys[index]!]
  }
  return value
}

/** A captured JS reference: parent and key are evaluated once, before the RHS. */
interface CompiledStateReference {
  state: SignalHandle<unknown>
  path: readonly PropertyKey[]
  value: any
  parent?: any
  key?: PropertyKey
}
export const _$compiledStateRoot = (state: SignalHandle<unknown>): CompiledStateReference => ({
  state,
  path: [],
  value: state.peek(),
})

const statePropertyKey = (key: PropertyKey): PropertyKey =>
  typeof key === 'symbol' || typeof key === 'string'
    ? key
    : typeof key === 'number'
      ? String(key)
      : Reflect.ownKeys({ [key]: 0 })[0]!
export const _$compiledStateMember = (reference: CompiledStateReference) => {
  // Resolve the parent before the next computed-key expression runs.
  const parent = reference.value
  return (inputKey: PropertyKey): CompiledStateReference => {
    let key: PropertyKey
    return {
      state: reference.state,
      parent,
      get key() {
        return inputKey
      },
      get path() {
        return [...reference.path, key]
      },
      get value() {
        if (parent == null) return parent[inputKey]
        key = statePropertyKey(inputKey)
        return parent[key]
      },
      set value(next: any) {
        if (parent == null) {
          parent[inputKey] = next
          return
        }
        key = statePropertyKey(inputKey)
        const path = [...reference.path, key]
        const descriptor = Object.getOwnPropertyDescriptor(parent, key)
        const length = Array.isArray(parent) ? parent.length : undefined
        if (length !== undefined && key === 'length') {
          reference.state.mutateObservedPath(
            reference.path,
            () => {
              parent[key] = next
            },
            parent,
          )
          return
        }
        parent[key] = next
        if (descriptor && 'value' in descriptor && Object.is(descriptor.value, next)) return
        batch(() => {
          reference.state.notifyPathMutation(path, descriptor?.value, next)
          if (length !== undefined && parent.length !== length)
            reference.state.notifyPathMutation([...reference.path, 'length'], length, parent.length)
        })
      },
    }
  }
}
export const _$compiledStateDelete = (reference: CompiledStateReference): boolean => {
  const parent = reference.parent
  if (parent == null) return delete parent[reference.key!]
  const key = statePropertyKey(reference.key!)
  const existed = Object.prototype.hasOwnProperty.call(parent, key)
  const result = delete parent[key]
  if (existed && result) {
    const path = reference.path.slice(0, -1)
    reference.state.notifyPathMutation([...path, key], undefined, undefined)
  }
  return result
}
export const _$compiledStateMutator = (reference: CompiledStateReference, method: string) => {
  const target = reference.value
  const fn = target[method]
  if (!Array.isArray(target) || fn !== (Array.prototype as any)[method])
    throw new TypeError('array')
  return (...args: any[]) =>
    reference.state.mutateObservedPath(
      reference.path,
      () => Reflect.apply(fn, target, args),
      target,
    )
}

export const effect = (callback: EffectCallback, options?: EffectOptions | null): EffectHandle => {
  const runtime = reactiveRuntime()
  const owner = currentOwner
  const record = owner === undefined ? undefined : owners.get(owner)
  const ownedEffects = record === undefined ? undefined : (record[OwnerField.Effects] ??= new Set())
  const scopedAtCreation = runtime.scopeOps !== undefined
  const run = () => {
    const cleanup = callback()
    if (typeof cleanup === 'function') effects.effectOnCleanup(runtime, cleanup as EffectCleanup)
  }
  const id = effects.effectCreateEffectId(
    runtime,
    () => {
      const previous = currentOwner
      currentOwner = owner
      try {
        const invoke = () => {
          if (owner !== undefined && !scopedAtCreation && runtime.scopeOps)
            withOwnerContext(owner, run)
          else run()
        }
        let boundaryOwner = owner
        let boundary: ((run: () => void) => void) | undefined
        while (boundaryOwner !== undefined) {
          const boundaryRecord = owners.get(boundaryOwner)
          boundary = boundaryRecord?.[OwnerField.EffectBoundary]
          if (boundary) break
          boundaryOwner = boundaryRecord?.[OwnerField.Parent]
        }
        if (boundary) boundary(invoke)
        else invoke()
      } finally {
        currentOwner = previous
      }
    },
    options ?? {},
  )
  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    try {
      effects.effectDisposeEffect(runtime, id)
    } finally {
      ownedEffects?.delete(result)
      options?.onDispose?.()
    }
  }
  const result: EffectHandle = {
    id,
    dispose,
    free: dispose,
    [Symbol.dispose]: dispose,
  }
  ownedEffects?.add(result)
  runtime.scopeOps?.cleanup(dispose)
  if (!options?.lazy) {
    try {
      const runner = () => effects.effectRunEffect(runtime, id)
      if (options?.scheduler !== undefined) options.scheduler(runner)
      else runner()
    } catch (error) {
      dispose()
      throw error
    }
  }
  return result
}

const renderTriggeredCallbacks = new Map<
  CompiledOwner,
  Set<(event: effects.ReactiveTriggerEvent) => void>
>()

export const onRenderTriggered = (
  callback: (event: effects.ReactiveTriggerEvent) => void,
): (() => void) => {
  const owner = currentOwner
  if (owner === undefined) return () => {}
  let callbacks = renderTriggeredCallbacks.get(owner)
  if (!callbacks) {
    callbacks = new Set()
    renderTriggeredCallbacks.set(owner, callbacks)
    onOwnerCleanup(() => renderTriggeredCallbacks.delete(owner))
  }
  callbacks.add(callback)
  return () => {
    callbacks.delete(callback)
  }
}

/** Render subscriptions report triggers without tracking reads made by debug hooks. */
export const renderEffect = (
  callback: EffectCallback,
  options?: EffectOptions | null,
): EffectHandle => {
  const owner = currentOwner
  return effect(callback, {
    ...options,
    onTrigger: event => {
      if (renderTriggeredCallbacks.size === 0) return
      let cursor = owner
      while (cursor !== undefined) {
        const callbacks = renderTriggeredCallbacks.get(cursor)
        if (callbacks) {
          untrack(() => {
            for (const callback of [...callbacks]) callback(event)
          })
          break
        }
        cursor = owners.get(cursor)?.[OwnerField.Parent]
      }
    },
  })
}

/**
 * Run compiler-generated DOM/list work synchronously once, then coalesce invalidations into the
 * next microtask. Public effects continue to use the configured (frame by default) scheduler.
 */
export const _$compiledRenderEffect = (callback: EffectCallback): EffectHandle => {
  let initialized = false
  let handle: EffectHandle | undefined
  const scheduler = reactiveRuntime().scheduler
  handle = renderEffect(callback, {
    scheduler: runner => {
      if (!initialized) {
        initialized = true
        runner()
        return
      }
      if (handle === undefined) return
      // Share the flush barrier with public effects: list patches can enqueue attribute work
      // that must finish before nextTick resolves.
      schedulerEnqueue(scheduler, handle.id, runner)
      schedulerScheduleMicrotaskDrain(scheduler)
    },
  })
  return handle
}

type CompiledTextTarget = {
  textContent: string | null
}

/** Bind a compiler-proven scalar expression to a text node without repeating update boilerplate. */
export const _$compiledText = (node: CompiledTextTarget, read: () => unknown): EffectHandle => {
  let previous: string | undefined
  return renderEffect(() => {
    const raw = read()
    const next = raw == null || typeof raw === 'boolean' ? '' : String(raw)
    if (Object.is(previous, next)) return
    previous = next
    node.textContent = next
  })
}

export const batch = <T>(callback: () => T): T => effects.effectBatch(reactiveRuntime(), callback)
export const untrack = <T>(callback: () => T): T => {
  const runtime = peekSharedReactiveStorage()
  return runtime === undefined ? callback() : runtime.untrack(callback)
}

export const onCleanup = (cleanup: EffectCleanup): void => {
  if (
    !(
      peekSharedReactiveStorage() && effects.effectOnCleanup(peekSharedReactiveStorage()!, cleanup)
    ) &&
    currentOwner !== undefined
  ) {
    owners.get(currentOwner)?.[OwnerField.Cleanups].push(cleanup)
  }
}

export const onOwnerCleanup = (cleanup: EffectCleanup): void => {
  if (currentOwnerCleanupCollector !== undefined) currentOwnerCleanupCollector.push(cleanup)
  else if (currentOwner !== undefined) owners.get(currentOwner)?.[OwnerField.Cleanups].push(cleanup)
}

/** Collect compiler-proven row disposers without allocating a general reactive owner. */
export const _$collectCompiledOwnerCleanups = <T>(
  cleanups: EffectCleanup[],
  callback: () => T,
): T => {
  const previous = currentOwnerCleanupCollector
  currentOwnerCleanupCollector = cleanups
  try {
    return callback()
  } finally {
    currentOwnerCleanupCollector = previous
  }
}

export const createOwner = (): CompiledOwner => {
  const owner = nextOwnerId++
  owners.set(owner, [currentOwner, new Set(), undefined, [], false, pendingRootLifecycle])
  pendingRootLifecycle = undefined
  if (currentOwner !== undefined) owners.get(currentOwner)?.[OwnerField.Children].add(owner)
  return owner
}

/** Feature-owned effect boundary; the owner kernel does not import component handling. */
export const setOwnerEffectBoundary = (
  owner: CompiledOwner,
  run: (callback: () => void) => void,
): void => {
  const record = owners.get(owner)
  if (record) record[OwnerField.EffectBoundary] = run
}

export const getCurrentOwner = (): CompiledOwner | undefined => currentOwner

export const getOwnerParent = (owner: CompiledOwner): CompiledOwner | undefined =>
  owners.get(owner)?.[OwnerField.Parent]

export const isDisposingOwnerTree = (): boolean => ownerDisposalDepth > 0

export const adoptOwner = (owner: CompiledOwner, parent: CompiledOwner | undefined): void => {
  if (owner === parent) return
  const record = owners.get(owner)
  if (record === undefined || record[OwnerField.Disposed] || record[OwnerField.Parent] === parent)
    return
  if (record[OwnerField.Parent] !== undefined)
    owners.get(record[OwnerField.Parent])?.[OwnerField.Children].delete(owner)
  record[OwnerField.Parent] = parent
  if (parent !== undefined) owners.get(parent)?.[OwnerField.Children].add(owner)
}

const withOwnerContext = <T>(owner: CompiledOwner, callback: () => T): T | undefined => {
  const record = owners.get(owner)
  if (record === undefined || record[OwnerField.Disposed]) return undefined
  const previous = currentOwner
  currentOwner = owner
  const frame = { record, entered: false }
  ownerFrames.push(frame)
  try {
    const runtime = peekSharedReactiveStorage()
    if (runtime !== undefined) enterOwnerScopes(runtime)
    return callback()
  } finally {
    if (frame.entered) peekSharedReactiveStorage()!.scopeOps!.pop()
    ownerFrames.pop()
    currentOwner = previous
  }
}

export const runWithOwner = <T>(owner: CompiledOwner, callback: () => T): T | undefined =>
  withOwnerContext(owner, () => untrack(callback))

export const registerOwnerLifecycle = (
  phase: CompiledLifecyclePhase,
  callback: EffectCleanup,
): boolean => {
  if (currentOwner === undefined) {
    const lifecycle = (pendingRootLifecycle ??= {})
    lifecycle.dispose = disposeLifecycle
    ;(lifecycle[phase] ??= []).push(callback)
    return true
  }
  const record = owners.get(currentOwner)
  if (record === undefined || record[OwnerField.Disposed]) return false
  const lifecycle = (record[OwnerField.Lifecycle] ??= {})
  lifecycle.dispose = disposeLifecycle
  ;(lifecycle[phase] ??= []).push(callback)
  return true
}

const disposeLifecycle = (
  owner: CompiledOwner,
  phase: 'beforeUnmount' | 'unmounted',
  attempt: DisposeAttempt,
): void => {
  const callbacks = owners.get(owner)?.[OwnerField.Lifecycle]?.[phase]
  if (!callbacks?.length) return
  const run = () => {
    for (const callback of callbacks.slice()) attempt(callback, undefined)
  }
  if (phase === 'beforeUnmount') runWithOwner(owner, run)
  else {
    const previous = currentOwner
    currentOwner = owner
    try {
      run()
    } finally {
      currentOwner = previous
    }
  }
}

export const runOwnerLifecycle = (
  owner: CompiledOwner,
  phase: Exclude<CompiledLifecyclePhase, 'beforeUnmount' | 'unmounted'>,
): void => {
  const callbacks = owners.get(owner)?.[OwnerField.Lifecycle]?.[phase]
  if (callbacks === undefined) return
  runWithOwner(owner, () => callbacks.slice().forEach(callback => callback()))
}

export const runOwnerLifecycleTree = (
  owner: CompiledOwner,
  phase: 'activated' | 'deactivated',
): void => {
  const pending = [owner]
  const visited = new Set<CompiledOwner>()
  while (pending.length > 0) {
    const current = pending.shift()!
    if (visited.has(current)) continue
    visited.add(current)
    const record = owners.get(current)
    if (record === undefined || record[OwnerField.Disposed]) continue
    runOwnerLifecycle(current, phase)
    pending.push(...record[OwnerField.Children])
  }
}

/** Cache compiler-proven setup work once per compiled owner and stable region id. */
export const _$compiledSetup = <T>(id: string, factory: () => T): T => {
  if (currentOwner === undefined) return factory()
  const record = owners.get(currentOwner)
  if (record === undefined) return factory()
  const setupValues = (record[OwnerField.SetupValues] ??= new Map())
  if (setupValues.has(id)) return setupValues.get(id) as T
  const value = untrack(factory)
  setupValues.set(id, value)
  return value
}

export const disposeOwner = (owner: CompiledOwner): boolean => {
  const record = owners.get(owner)
  if (record === undefined || record[OwnerField.Disposed]) return false
  let errors: unknown[] | undefined
  const attempt = <T>(cleanup: (value: T) => unknown, value: T) => {
    try {
      cleanup(value)
    } catch (error) {
      ;(errors ??= []).push(error)
    }
  }
  ownerDisposalDepth += 1
  try {
    record[OwnerField.Lifecycle]?.dispose?.(owner, 'beforeUnmount', attempt)
    record[OwnerField.Disposed] = true
    // eslint-disable-next-line unicorn/no-useless-spread -- disposal mutates the iterated owner set
    for (const child of [...record[OwnerField.Children]]) attempt(disposeOwner, child)
    // eslint-disable-next-line unicorn/no-useless-spread -- disposal mutates the iterated owner set
    for (const ownedEffect of [...(record[OwnerField.Effects] ?? [])])
      attempt(effect => effect.dispose(), ownedEffect)
    if (record[OwnerField.Scope] !== undefined)
      peekSharedReactiveStorage()!.scopeOps!.dispose(record[OwnerField.Scope])
    for (const cleanup of record[OwnerField.Cleanups].splice(0)) attempt(cleanup, undefined)
    record[OwnerField.Lifecycle]?.dispose?.(owner, 'unmounted', attempt)
    if (record[OwnerField.Parent] !== undefined)
      owners.get(record[OwnerField.Parent])?.[OwnerField.Children].delete(owner)
    owners.delete(owner)
    if (errors?.length === 1) throw errors[0]
    if (errors !== undefined && errors.length > 1) throw new AggregateError(errors, 'cleanup')
    return true
  } finally {
    ownerDisposalDepth -= 1
  }
}

export type Selector<T> = ((key: T) => boolean) & {
  /** @internal Compiler-only direct subscription used by proven keyed-row bindings. */
  subscribe(callback: EffectCallback): EffectCleanup
  /** @internal Compiler-only fixed-key subscription for ownerless keyed rows. */
  subscribeKey(key: T, callback: EffectCallback): EffectCleanup
  /** @internal Compiler-only fixed unique-key subscription for keyed rows. */
  subscribeKeyUnique(key: T, callback: EffectCallback): EffectCleanup
}

export const createSelector = <T>(source: () => T): Selector<T> => {
  const flags = new Map<T, CompiledSignalHandle<boolean>>()
  const subscriptions = createSelectorSubscriptions<T>(untrack)
  let selected: T
  effect(() => {
    const next = source()
    const previous = selected
    selected = next
    if (Object.is(previous, next)) return
    batch(() => {
      flags.get(previous)?.set(false)
      flags.get(next)?.set(true)
      subscriptions.notify(previous, next)
    })
  })
  onOwnerCleanup(() => {
    for (const flag of flags.values()) flag.dispose()
    flags.clear()
    subscriptions.dispose()
  })
  const read = (key: T): boolean => {
    if (subscriptions.track(key)) return Object.is(key, selected)
    let flag = flags.get(key)
    if (flag === undefined) {
      flag = signal(Object.is(key, selected))
      flags.set(key, flag)
    }
    return flag.get()
  }
  return Object.assign(read, {
    subscribe: subscriptions.subscribe,
    subscribeKey: subscriptions.subscribeKey,
    subscribeKeyUnique: subscriptions.subscribeKeyUnique,
  })
}
