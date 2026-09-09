/// <reference lib="esnext.disposable" preserve="true" />

import type {
  PortableComponentHandle as ProtocolPortableComponentHandle,
  PortableMountHandle as ProtocolPortableMountHandle,
} from '../protocol.js'

interface KernelReadonlySignal<T> {
  get(): T
  peek(): T
}

interface KernelWritableSignal<T> extends KernelReadonlySignal<T> {
  set(value: T): void
  update?(updater: (current: T) => T): void
}

type KernelSignalPath = import('../reactive-kernel/signal.js').SignalPath

interface KernelSignalHandle<T> extends KernelWritableSignal<T> {
  readonly __isReadonly__: boolean
  readonly __rue_ref__: boolean
  readonly __rue_signal_id__: number
  value: T
  [Symbol.dispose](): void
  dispose(): void
  free(): void
  resolvePath(path: KernelSignalPath): import('../reactive-kernel/signal.js').SignalPathToken
  mutatePath(path: KernelSignalPath, mutator: (currentAtPath: unknown) => void): void
  getPath(path: KernelSignalPath): unknown
  peekPath(path: KernelSignalPath): unknown
  setPath(path: KernelSignalPath, value: unknown): void
  toJSON(): T
  toString(): string
  trigger(): void
  triggerPath(path: KernelSignalPath): void
  update(updater: (current: T) => T): void
  updatePath(path: KernelSignalPath, updater: (currentAtPath: unknown) => unknown): void
  valueOf(): T
}

interface KernelEffectHandle {
  [Symbol.dispose](): void
  dispose(): void
  free(): void
}

export type ObjectLike = Record<PropertyKey, unknown>

export interface HookHost extends ObjectLike {
  __hooks?: unknown
}

export interface HookContainer extends ObjectLike {
  states: unknown[]
  index: number
  __forcedIndex?: number
  __idMap?: Map<unknown, unknown>
}

export interface HookFrame {
  instance: unknown
  hooks?: HookContainer
}

export interface HookCarrier {
  getCurrentInstance(): unknown
  renderHooks<T>(instance: unknown, render: () => T): T
  withCurrentInstance?<T>(instance: unknown, run: () => T): T
}

export interface HookContext extends HookCarrier {
  setCurrentInstance(instance: unknown): void
  vaporWithHookId<T>(id: unknown, runner: () => T): T
  withHookSlot<T>(factory: () => T): T
}

export type ComputedGetter<T> = () => T

export interface ComputedOptions<T> {
  get: ComputedGetter<T>
  set?: (value: T) => void
}

export type ComputedInput<T> = ComputedGetter<T> | ComputedOptions<T>

export interface ReadableSignalHandle<T> extends KernelReadonlySignal<T>, ObjectLike {}

export interface ComputedHandle<T> extends KernelWritableSignal<T>, ObjectLike {
  __rueInvalidateComputed?: () => void
}

export interface ComputedHolder<T> {
  arg: ComputedInput<T>
}

export interface ComputedSlot<T> {
  handle: ComputedHandle<T>
  holder: ComputedHolder<T>
}

export type EffectScopeHandle = number

export interface CreateComputedHooksOptions {
  context: HookContext
  reactiveRuntime: unknown
  createComputed: unknown
}

export type EqualityComparator<T> = (previous: T, next: T) => boolean

export interface EqualityOptions<T> {
  equals?: EqualityComparator<T>
}

export interface RefLike<T> extends ObjectLike {
  value: T
  __rue_ref__?: true
}

export interface ReadonlyRefLike<T> extends ObjectLike {
  readonly value: T
  __rue_ref__?: true
}

export type PortableMountHandle = ProtocolPortableMountHandle & ObjectLike

export interface PortableNodeCollection extends ObjectLike {
  nodes: readonly unknown[]
}

export type PortableComponentLike = ProtocolPortableComponentHandle & ObjectLike

export interface PortableBlockInstance extends ObjectLike {
  kind: 'block'
  mount: (...args: unknown[]) => unknown
}

export type PortableBlockFactory = ((...args: unknown[]) => unknown) & {
  kind: 'block-factory'
}

export type PortableRenderable =
  | Node
  | PortableMountHandle
  | PortableNodeCollection
  | PortableComponentLike
  | PortableBlockInstance
  | PortableBlockFactory
  | readonly PortableRenderable[]

export interface SignalHandle<T> extends KernelSignalHandle<T>, ObjectLike {}

export interface RefState<T> extends RefLike<T> {}

export type StateInitializer<T> = T | (() => T)

export type SetStateAction<T> = T | ((previous: T) => T)

export type Dispatch<TAction> = (action: TAction) => void

export type StateSetter<T> = Dispatch<SetStateAction<T>>

export type StateTuple<T> = [T, StateSetter<T>]

export interface StateSlot<T> {
  signal: SignalHandle<T>
  setter: StateSetter<T>
}

export interface RefSlot<T> {
  current: T
}

export interface CreateStateHooksOptions {
  context: HookContext
  reactiveRuntime: unknown
}

export type EffectCleanup = () => void

export type EffectCallback = () => void | EffectCleanup

export type EffectEquals = (previous: unknown, next: unknown) => boolean

export type EffectScheduler = (run: () => void) => void

export interface EffectOptions {
  equals?: EffectEquals
  scheduler?: EffectScheduler
}

export interface EffectHandle extends KernelEffectHandle, ObjectLike {}

export interface EffectSlot {
  type?: symbol
  effect: EffectCallback
  cleanup?: EffectCleanup
  handle?: unknown
  deps?: unknown[]
  equals?: EffectEquals
  scheduler?: EffectScheduler
}

export interface EffectWatchOptions extends EffectOptions {
  immediate: true
}

export interface CreateEffectHooksOptions {
  context: HookContext
  reactiveRuntime: unknown
}

export interface SetupSlot<T> {
  type: symbol
  initialized: boolean
  value: T | undefined
}

export type CustomRefFactory<T> = (
  track: () => void,
  trigger: () => void,
) =>
  | {
      get?: () => T
      set?: (value: T) => void
      [key: PropertyKey]: unknown
    }
  | null
  | undefined

export interface CreateValueHooksOptions {
  reactiveRuntime: unknown
  useSetup<T>(factory: () => T): T
}

export interface ValueFacade extends ObjectLike {
  computed<T>(arg: ComputedInput<T>): ComputedHandle<T>
  customRef<T>(factory: CustomRefFactory<T>, forceGlobal?: boolean): RefLike<T>
  createComputed<T>(arg: ComputedInput<T>): ComputedHandle<T>
  isReadonly(value: unknown): boolean
  isRef(value: unknown): value is RefLike<unknown>
  shallowRef<T>(initial: T, options?: EqualityOptions<T>, forceGlobal?: boolean): RefLike<T>
  triggerRef(refValue: unknown): void
}

export interface ValueHooks extends ObjectLike {
  customRef<T>(factory: CustomRefFactory<T>, forceGlobal?: boolean): RefLike<T>
  isReactive(value: unknown): boolean
  isReadonly(value: unknown): boolean
  isRef(value: unknown): value is RefLike<unknown>
  ref<T>(initial: T, options?: unknown, forceGlobal?: boolean): RefLike<T>
  unref<T>(value: T | RefLike<T>): T
}

export interface ValueHookBundle {
  facade: ValueFacade
  hooks: ValueHooks
}

export type SchedulerRun = () => void

export type WatchFlush = 'pre' | 'post' | 'sync'

export interface WatchEffectOptions {
  scheduler?: (run: SchedulerRun) => void
  debounce?: number
  flush?: WatchFlush
}

export interface KernelEffectOptions extends WatchEffectOptions {
  lazy?: boolean
  watcher?: boolean
}

export interface WatchOptions<T = unknown> extends WatchEffectOptions {
  immediate?: boolean
  equals?: EqualityComparator<T>
}

export type WatchCallback<T = unknown> = {
  bivarianceHack(newValue: T, oldValue: T): void
}['bivarianceHack']

export type WatchSource<T = unknown> =
  | ReadableSignalHandle<T>
  | RefLike<T>
  | ReadonlyRefLike<T>
  | (() => T)

export type WatchSourceValue<T> = T extends WatchSource<infer TValue> ? TValue : T

export type WatchMultiSource = Array<WatchSource<unknown> | unknown>

export type WatchMultiValues<TSources extends readonly unknown[]> = {
  -readonly [K in keyof TSources]: WatchSourceValue<TSources[K]>
}

export interface WatchFunction {
  <TSources extends readonly unknown[]>(
    source: readonly [...TSources],
    handler: WatchCallback<WatchMultiValues<TSources>>,
    options?: WatchOptions<WatchMultiValues<TSources>> | null,
  ): EffectHandle
  <T>(
    source: WatchSource<T>,
    handler: WatchCallback<T>,
    options?: WatchOptions<T> | null,
  ): EffectHandle
  <T>(source: T, handler: WatchCallback<T>, options?: WatchOptions<T> | null): EffectHandle
}

export interface WatchEffectFunction {
  (callback: () => void, options?: WatchEffectOptions | null): EffectHandle
}

export interface Resource<TData = unknown> {
  data: SignalHandle<TData | undefined>
  error: SignalHandle<unknown>
  loading: SignalHandle<boolean>
}

export interface WatchFlushEffectFunction {
  (callback: () => void, options?: Pick<WatchEffectOptions, 'scheduler'> | null): EffectHandle
}

export interface EffectScope {
  readonly active: boolean
  run<T>(fn: () => T): T | undefined
  stop(): void
  dispose(): void
}

export interface EffectScopeDebugState {
  activeScopeHandles: number
  cachedScopeHandles: number
  stoppedScopeIds: number
}

export interface SignalWrapperRegistryDebugState {
  registryKeys: number
  liveWrappers: number
  hasFinalizationRegistry: boolean
}

export interface DebuggerEvent<TType extends PropertyKey = PropertyKey> {
  effect: unknown
  target: unknown
  type: TType
  key: unknown
}

export type DebuggerHook = (event: DebuggerEvent<'get'>) => void

export interface SignalWrapperRegistryEntry<TSignal extends ObjectLike = ObjectLike> {
  ref: TSignal | WeakRef<TSignal>
  token: object
}

export interface SignalHandleConstructorLike {
  prototype?: ObjectLike
}

export interface ReactiveKernelEffectCapabilities {
  batch<T>(callback: () => T): T
  createEffect(callback: () => void, options?: KernelEffectOptions | null): EffectHandle
  watchEffect(callback: () => void, options?: WatchEffectOptions | null): EffectHandle
  watch(
    source: unknown,
    handler: WatchCallback<unknown>,
    options?: WatchOptions<unknown> | null,
  ): EffectHandle
  watchFn<T>(
    getter: () => T,
    handler: WatchCallback<T>,
    options?: WatchOptions<T> | null,
  ): EffectHandle
  watchSignal<T>(
    source: SignalHandle<T>,
    handler: WatchCallback<T>,
    options?: WatchOptions<T> | null,
  ): EffectHandle
  watchDeepSignal<T>(
    source: SignalHandle<T>,
    handler: WatchCallback<T>,
    options?: WatchOptions<T> | null,
  ): EffectHandle
  watchPath(
    source: SignalHandle<unknown>,
    path: KernelSignalPath,
    handler: WatchCallback<unknown>,
    options?: WatchOptions<unknown> | null,
  ): EffectHandle
  onCleanup(cleanup: EffectCleanup): void
  onWatcherCleanup(cleanup: EffectCleanup, failSilently?: boolean): void
  untrack<T>(callback: () => T): T
}

export interface ReactiveKernelResourceCapabilities {
  createResource<TSource, TData>(
    source: SignalHandle<TSource>,
    fetcher: (source: TSource) => Promise<TData>,
  ): Resource<TData>
}

export interface ReactiveKernelScopeCapabilities {
  __rueCreateDetachedEffectScope(): EffectScopeHandle
  __ruePushEffectScope(scopeId: EffectScopeHandle): void
  __ruePopEffectScope(): void
  __rueDisposeEffectScope(scopeId: EffectScopeHandle): void
  __rueGetCurrentEffectScope(): EffectScopeHandle | undefined
  onScopeDispose(cleanup: EffectCleanup, failSilently?: boolean): void
}

export interface ReactiveKernelSignalCapabilities {
  SignalHandle?: SignalHandleConstructorLike
  createSignal<T>(
    initial: T,
    options?: EqualityOptions<T> | null,
    forceGlobal?: boolean,
  ): SignalHandle<T>
  createComputed<T>(input: ComputedInput<T>): ComputedHandle<T>
  __rueCurrentEffectId(): number | undefined
}

export interface ReactiveKernelValueCapabilities {
  createCustomRef<T>(factory: CustomRefFactory<T>): RefLike<T>
  createRef<T>(initial: T, options?: EqualityOptions<T> | null): RefLike<T>
}

export interface ReactiveKernelSchedulingCapabilities {
  nextTick<T = void>(callback?: () => T | Promise<T>): Promise<T | void>
  setReactiveScheduling(mode: string): void
}

export type ReactiveKernel = object &
  Partial<
    ReactiveKernelEffectCapabilities &
      ReactiveKernelScopeCapabilities &
      ReactiveKernelSignalCapabilities &
      ReactiveKernelValueCapabilities &
      ReactiveKernelResourceCapabilities &
      ReactiveKernelSchedulingCapabilities
  >

export interface ComputedFunction {
  <T>(getter: ComputedGetter<T>, forceGlobal?: boolean): ComputedHandle<T>
  <T>(options: ComputedOptions<T>, forceGlobal?: boolean): ComputedHandle<T>
}

export interface CreateComputedFunction {
  <T>(getter: ComputedGetter<T>): ComputedHandle<T>
  <T>(options: ComputedOptions<T>): ComputedHandle<T>
}

export interface CreateSignalFunction {
  <T>(initial: T, options?: EqualityOptions<T> | null, forceGlobal?: boolean): SignalHandle<T>
}

export interface SignalFunction extends CreateSignalFunction {}

export interface CustomRefFunction {
  <T>(factory: CustomRefFactory<T>, forceGlobal?: boolean): RefLike<T>
}

export interface UseEffectFunction {
  (
    effect: EffectCallback,
    dependencies?: readonly unknown[] | null,
    options?: EffectOptions | null,
  ): void
}

export interface UseRefFunction {
  <T = undefined>(initial?: T): RefSlot<T | undefined>
}

export interface UseStateFunction {
  <T>(initial: StateInitializer<T>): StateTuple<T>
}

export interface ReactiveFacadeRuntime {
  __rueCurrentEffectId(): number | undefined
  __rueGetEffectScopeDebugState(): EffectScopeDebugState
  computed: ComputedFunction
  customRef: CustomRefFunction
  createSignal: CreateSignalFunction
  createComputed: CreateComputedFunction
  effectScope(detached?: boolean): EffectScope
  getCurrentScope(): EffectScope | undefined
  __rueDisposeEffectScope(scopeId: EffectScopeHandle): void
  isRef(value: unknown): value is RefLike<unknown>
  isReadonly(value: unknown): boolean
  nextTick<T = void>(callback?: () => T | Promise<T>): Promise<T | void>
  onWatcherCleanup(cleanup: EffectCleanup, failSilently?: boolean): void
  onRenderTracked(callback: DebuggerHook): (() => void) | undefined
  onScopeDispose(cleanup: EffectCleanup, failSilently?: boolean): void
  shallowRef<T>(initial: T, options?: EqualityOptions<T> | null, forceGlobal?: boolean): RefLike<T>
  signal: SignalFunction
  triggerRef: ValueFacade['triggerRef']
  watch: WatchFunction
  watchEffect: WatchEffectFunction
  watchPostEffect: WatchFlushEffectFunction
  watchSyncEffect: WatchFlushEffectFunction
}

export interface ReactiveHookRuntime {
  __rueDisposeHookScopeForInstance(instance: unknown): void
  computed: ComputedFunction
  customRef: CustomRefFunction
  getCurrentInstance(): unknown
  setCurrentInstance(instance: unknown): void
  isReactive(value: unknown): boolean
  isReadonly(value: unknown): boolean
  isRef(value: unknown): value is RefLike<unknown>
  ref<T>(initial: T, options?: unknown, forceGlobal?: boolean): RefLike<T>
  unref<T>(value: T | RefLike<T>): T
  useEffect: UseEffectFunction
  useRef: UseRefFunction
  useSetup<T>(factory: () => T): T
  useState: UseStateFunction
  vaporWithHookId<T>(id: unknown, runner: () => T): T
  withHookSlot<T>(factory: () => T): T
}

export interface ReactiveFacade<
  TRuntime extends object = ReactiveKernel,
> extends ReactiveFacadeRuntime {
  hooks: ReactiveHookRuntime
  __rueGetSignalWrapperRegistryDebugState(): SignalWrapperRegistryDebugState
  normalizeRenderTriggeredEvent(event: unknown): DebuggerEvent
  useEffect: UseEffectFunction
  useRef: UseRefFunction
  useState: UseStateFunction
  default: TRuntime & ReactiveFacadeRuntime
}
