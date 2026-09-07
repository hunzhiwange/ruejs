/*
运行时输入与 mounted 类型体系
----------------------------
默认主路径现在围绕 MountInput 组织：
- MountInputType：默认挂载协议的节点语义（文本、片段、元素、组件、Vapor）
- MountInput：默认调度/挂载/bridge 运输的数据货币
- MountInputChild：默认 children 形状，文本直接保留为文本，不再要求先包装成额外树节点

关键点：
- el_hint: MountInput 可携带宿主提示节点，供内部 Vapor 输入直接复用
- key: 仍用于 keyed 更新稳定性判断
*/

import type { HookCarrier } from '../js-reactive/types.js'
import type { ComponentUpdateMode, PortableMountHandle } from '../protocol.js'

export type { ComponentUpdateMode, PortableMountHandle } from '../protocol.js'
export {
  PORTABLE_HANDLE_KEYS,
  RUE_CLEANUP_BUCKET_KEY as CLEANUP_BUCKET_KEY,
  RUE_COMPONENT_UPDATE_MODE_KEY as COMPONENT_UPDATE_MODE_KEY,
  RUE_EFFECT_SCOPE_ID_KEY as EFFECT_SCOPE_ID_KEY,
  RUE_KEEP_ALIVE_HOOK_TARGET_KEY as KEEP_ALIVE_HOOK_TARGET_KEY,
  RUE_MOUNT_ID_KEY as DEFAULT_MOUNT_HANDLE_KEY,
  RUE_PORTABLE_COMPONENT_ID_KEY as PORTABLE_COMPONENT_ID_KEY,
  RUE_PORTABLE_COMPONENT_TYPE_KEY as PORTABLE_COMPONENT_TYPE_KEY,
  RUE_PORTABLE_VAPOR_SETUP_KEY as PORTABLE_VAPOR_SETUP_KEY,
  RUE_REPEATABLE_MOUNT_FACTORY_KEY as REPEATABLE_MOUNT_FACTORY_KEY,
} from '../protocol.js'

export type ObjectLike = object
export type ComponentProps = Record<string, unknown>
export type DOMProps = Readonly<ComponentProps>
export type DOMStyle = Record<string, string>
export type MountKey = string
export type EffectScopeId = number
export type MountCleanupBucket = unknown[]
export type RuntimeEntry = 'render' | 'renderAnchor' | 'renderStatic'
export type ComponentType<Props extends ComponentProps = ComponentProps> = (props: Props) => unknown
export type VaporSetup<HostNode = unknown> = (parent?: HostNode) => HostNode | null | undefined

export interface PropsSignal {
  peekPath(path: readonly PropertyKey[]): unknown
  setPath(path: readonly PropertyKey[], value: unknown): void
}

export type StableComponentProps<Props extends ComponentProps = ComponentProps> = Props & {
  __signal__?: Partial<PropsSignal>
}

export interface ComponentHookHost<
  Props extends ComponentProps = ComponentProps,
> extends ObjectLike {
  __ci_index: number
  __hooks: { states: unknown[]; index: number }
  propsRO: StableComponentProps<Props>
  __rue_context_owner_parent__?: unknown
  __rue_context_parent_instance__?: unknown
  __rue_component_render_reactive__?: boolean
  __rue_component_render_invalidate__?: () => void
  __rue_runtime_lifecycle_hooks__?: LifecycleHookMap
}

export interface ComponentHookCarrier extends HookCarrier {
  setCurrentInstance(instance: unknown): void
  __rueDisposeHookScopeForInstance?(instance: unknown): void
}

export interface ComponentReactiveFacade extends ObjectLike {
  default?: ComponentReactiveFacade
  propsReactive?<Props extends ComponentProps>(source: Props, forceGlobal?: boolean): Props
}

export interface ComponentInstance<
  Props extends ComponentProps = ComponentProps,
  HostNode = unknown,
> {
  carrier: ComponentHookCarrier
  host: ComponentHookHost<Props>
  index: number
  input: ComponentMountInput<HostNode>
  isMounted: boolean
  hookScopeDisposed: boolean
  propsRO: StableComponentProps<Props>
  propsSource: Props
  parentOwner: ObjectLike | undefined
  type: ComponentType<Props>
}

export interface ComponentInstanceManager<HostNode = unknown> {
  count(): number
  current(): ComponentInstance<ComponentProps, HostNode> | undefined
  create(input: ComponentMountInput<HostNode>): ComponentInstance<ComponentProps, HostNode>
  dispose(instance: ComponentInstance<ComponentProps, HostNode> | undefined): boolean
  disposeScope(instance: ComponentInstance<ComponentProps, HostNode> | undefined): boolean
  free(): void
  has(instance: ComponentInstance<ComponentProps, HostNode> | undefined): boolean
  release(instance: ComponentInstance<ComponentProps, HostNode> | undefined): boolean
  render<T>(
    instance: ComponentInstance<ComponentProps, HostNode>,
    input: ComponentMountInput<HostNode>,
    run: (props: StableComponentProps) => T,
  ): T | undefined
  update(
    instance: ComponentInstance<ComponentProps, HostNode>,
    input: ComponentMountInput<HostNode>,
  ): void
  setState(state: RuntimeState<HostNode>): void
  withCurrent<T>(instance: ComponentInstance<ComponentProps, HostNode>, run: () => T): T
  wrapperCount(): number
}

export type LifecycleName =
  | 'activated'
  | 'before_create'
  | 'before_mount'
  | 'before_unmount'
  | 'before_update'
  | 'created'
  | 'deactivated'
  | 'mounted'
  | 'render_triggered'
  | 'server_prefetch'
  | 'unmounted'
  | 'updated'

export type PendingLifecycleName = Extract<LifecycleName, 'mounted' | 'updated'>
export type LifecycleCallback = () => unknown
export type LifecycleHookMap = Map<LifecycleName, LifecycleCallback[]>

export interface LifecycleController {
  call(instance: unknown, name: LifecycleName): void
  callGlobal(name: LifecycleName): void
  clear(): void
  onActivated(callback: unknown): (() => void) | undefined
  onBeforeCreate(callback: unknown): (() => void) | undefined
  onBeforeMount(callback: unknown): (() => void) | undefined
  onBeforeUnmount(callback: unknown): (() => void) | undefined
  onBeforeUpdate(callback: unknown): (() => void) | undefined
  onCreated(callback: unknown): (() => void) | undefined
  onDeactivated(callback: unknown): (() => void) | undefined
  onMounted(callback: unknown): (() => void) | undefined
  onRenderTriggered(callback: unknown): (() => void) | undefined
  onServerPrefetch(callback: unknown): (() => void) | undefined
  onUnmounted(callback: unknown): (() => void) | undefined
  onUpdated(callback: unknown): (() => void) | undefined
  runServerPrefetch(instance: unknown): Promise<unknown[]>
}

export type ErrorHandler = (error: unknown, instance: unknown) => unknown

export interface ErrorController {
  capture(error: unknown, instance: unknown, info: string): boolean
  clear(): void
  getLastError(): unknown
  isPropagating(error: unknown): boolean
  markPropagating(error: unknown): void
  notifyGlobal(error: unknown, instance: unknown): void
  onError(callback: unknown): (() => boolean) | undefined
}

export interface RuntimeController {
  __rueHandleComponentError?(error: unknown, instance: ComponentHookHost, info: string): undefined
}

export type RuntimeAssertActive = () => void
export type RuntimeLifecycleRegistrar = (callback: unknown) => unknown
export type RuntimeLifecycleRegistration = (callback: unknown) => undefined

export interface RuntimePluginController {
  clear(): void
  flush(): void
  use(plugin: unknown, options?: unknown): undefined
}

export interface RuntimeEmitter {
  (event: unknown, args: unknown): undefined
}

export interface RuntimeAppController<HostNode = unknown> {
  clear(): void
  getCurrentContainer(): HostNode | undefined
  mount<T>(app: unknown, container: HostNode, render: (app: unknown) => T): T
  onServerPrefetch(callback: unknown): undefined
  recordMountError(error: unknown): void
  runServerPrefetch(): Promise<unknown[]>
  unmount<T>(container: HostNode, dispose: () => T): T
  withCurrentContainer<T>(container: HostNode, run: () => T): T
}

export interface RuntimeAppMountTransaction<HostNode = unknown> {
  container: HostNode
  error: unknown
  owner: object
  status: 'mounting' | 'mounted' | 'failed'
}

export interface CreateRuntimeAppControllerOptions<HostNode = unknown> {
  state: RuntimeState<HostNode>
  plugins: RuntimePluginController
  lifecycle: LifecycleController
  currentInstance: () => ComponentInstance<ComponentProps, HostNode> | undefined
  assertActive: RuntimeAssertActive
}

/** Complete public method surface of one JavaScript Rue Runtime instance. */
export interface RueRuntime<HostNode = unknown> extends RuntimeController {
  __rtd(): undefined
  __rueActivateRange(start: HostNode): void
  __rueDeactivateRange(start: HostNode): void
  abortOwnedMount(value: unknown): boolean
  buildOwnedMount(): OwnedMountHandle | undefined
  commitMounted(value: unknown, deferMounted?: boolean): boolean
  componentInstanceCount(): number
  componentWrapperCount(): number
  createComponent(typeTag: unknown, props?: unknown): PortableMountHandle
  createElement(typeTag: unknown, props?: unknown, children?: unknown): PortableMountHandle
  currentOwnedMountToken(): OwnedMountHandle | undefined
  disposeOwnedMount(value: unknown): boolean
  effectScopeCount(): number
  emitted(props: unknown): RuntimeEmitter
  flushMounted(value: unknown): boolean
  free(): void
  getCurrentContainer(): HostNode | undefined
  globalAnchorMountCount(): number
  mount(app: unknown, container: HostNode): void
  onActivated: RuntimeLifecycleRegistration
  onBeforeCreate: RuntimeLifecycleRegistration
  onBeforeMount: RuntimeLifecycleRegistration
  onBeforeUnmount: RuntimeLifecycleRegistration
  onBeforeUpdate: RuntimeLifecycleRegistration
  onCreated: RuntimeLifecycleRegistration
  onDeactivated: RuntimeLifecycleRegistration
  onError: RuntimeLifecycleRegistration
  onMounted: RuntimeLifecycleRegistration
  onRenderTriggered: RuntimeLifecycleRegistration
  onServerPrefetch(callback: unknown): undefined
  onUnmounted: RuntimeLifecycleRegistration
  onUpdated: RuntimeLifecycleRegistration
  ownedMountCollecting(): boolean
  ownedMountCount(): number
  ownedMountEntryCount(): number
  pendingComponentMountedCount(): number
  render(value: unknown, container: HostNode): void
  renderAnchor(value: unknown, parent: HostNode, anchor: HostNode): void
  renderStatic(value: unknown, parent: HostNode, anchor: HostNode): void
  runServerPrefetch(): Promise<unknown[]>
  setDOMAdapter(adapter: unknown): void
  unmount(container: HostNode): void
  updateOwnedMount(value: unknown): boolean
  use(plugin: unknown, options?: unknown): undefined
  vapor(setup: unknown): PortableMountHandle
}

export interface TextMountInputType {
  kind: 'text'
  value: string
}

export interface FragmentMountInputType {
  kind: 'fragment'
}

export interface ElementMountInputType {
  kind: 'element'
  tag: string
}

export interface ComponentMountInputType {
  kind: 'component'
  component: ComponentType
  updateMode: ComponentUpdateMode
}

export interface VaporMountInputType<HostNode = unknown> {
  kind: 'vapor'
  setup?: VaporSetup<HostNode>
}

export type MountInputType<HostNode = unknown> =
  | TextMountInputType
  | FragmentMountInputType
  | ElementMountInputType
  | ComponentMountInputType
  | VaporMountInputType<HostNode>

export interface TextMountChild {
  kind: 'text'
  value: string
}

export interface InputMountChild<HostNode = unknown> {
  kind: 'input'
  value: MountInput<HostNode>
}

export type MountChild<HostNode = unknown> = TextMountChild | InputMountChild<HostNode>

interface MountInputBase<HostNode, Type extends MountInputType<HostNode>> {
  type: Type
  props: ComponentProps
  children: MountChild<HostNode>[]
  key: MountKey | undefined
  strictComponentReturns: boolean
  mountCleanupBucket: MountCleanupBucket | undefined
  mountEffectScopeId: EffectScopeId | undefined
  elHint: HostNode | undefined
  portable?: PortableHandle
}

export type TextMountInput<HostNode = unknown> = MountInputBase<HostNode, TextMountInputType>
export type FragmentMountInput<HostNode = unknown> = MountInputBase<
  HostNode,
  FragmentMountInputType
>
export type ElementMountInput<HostNode = unknown> = MountInputBase<HostNode, ElementMountInputType>
export type ComponentMountInput<HostNode = unknown> = MountInputBase<
  HostNode,
  ComponentMountInputType
>
export type VaporMountInput<HostNode = unknown> = MountInputBase<
  HostNode,
  VaporMountInputType<HostNode>
>

export type MountInput<HostNode = unknown> =
  | TextMountInput<HostNode>
  | FragmentMountInput<HostNode>
  | ElementMountInput<HostNode>
  | ComponentMountInput<HostNode>
  | VaporMountInput<HostNode>

export type PortableHandle = Record<PropertyKey, unknown>

export interface MountedBase<HostNode, Kind extends string> {
  kind: Kind
  host: HostNode | null | undefined
  fragmentNodes?: HostNode[]
  key?: MountKey
  dispose?: () => void
}

export interface MountedHostBase<HostNode, Kind extends string> extends MountedBase<
  HostNode,
  Kind
> {
  host: HostNode
}

export interface MountedText<HostNode = unknown> extends MountedHostBase<HostNode, 'text'> {
  value: string
}

export interface MountedElement<HostNode = unknown> extends MountedHostBase<HostNode, 'element'> {
  tag: string
  props: ComponentProps
  children: Mounted<HostNode>[]
  resetHostProps(): void
}

export interface MountedFragment<HostNode = unknown> extends MountedHostBase<HostNode, 'fragment'> {
  props: ComponentProps
  children: Mounted<HostNode>[]
  fragmentNodes: HostNode[]
}

export interface MountedComponent<HostNode = unknown> extends MountedBase<HostNode, 'component'> {
  type: ComponentType
  updateMode: ComponentUpdateMode
  instance: ComponentInstance<ComponentProps, HostNode>
  subtree: Mounted<HostNode> | undefined
  fragmentNodes: HostNode[]
  disposed: boolean
  renderEffect?: { dispose(): void; rerender(): void; revision(): number }
}

export interface MountedVapor<HostNode = unknown> extends MountedBase<HostNode, 'vapor'> {
  cleanupBucket: MountCleanupBucket | undefined
  effectScopeId: EffectScopeId | undefined
  fragmentNodes: HostNode[]
  props: ComponentProps
}

export type Mounted<HostNode = unknown> =
  | MountedText<HostNode>
  | MountedElement<HostNode>
  | MountedFragment<HostNode>
  | MountedComponent<HostNode>
  | MountedVapor<HostNode>

export type RenderRuntimeState<HostNode = unknown> = RuntimeState<HostNode> & {
  components: ComponentInstanceManager<HostNode>
  lifecycle: LifecycleController
}

export type MountFunction<HostNode = unknown> = (
  state: RenderRuntimeState<HostNode>,
  host: DOMHost<HostNode>,
  input: MountInput<HostNode> | null | undefined,
  parentContext: HostNode,
) => Mounted<HostNode> | undefined

export interface MountController<HostNode = unknown> {
  mountInput: MountFunction<HostNode>
  patchMountedInput(
    state: RenderRuntimeState<HostNode>,
    host: DOMHost<HostNode>,
    mounted: Mounted<HostNode> | undefined,
    input: MountInput<HostNode> | null,
    parentContext: HostNode,
  ): Mounted<HostNode> | undefined
}

export interface MountCompatibilityController<HostNode = unknown> {
  mountElement(
    state: RenderRuntimeState<HostNode>,
    host: DOMHost<HostNode>,
    input: ElementMountInput<HostNode>,
    parentContext: HostNode,
    controller: MountController<HostNode>,
  ): MountedElement<HostNode>
  mountFragment(
    state: RenderRuntimeState<HostNode>,
    host: DOMHost<HostNode>,
    input: FragmentMountInput<HostNode>,
    controller: MountController<HostNode>,
  ): MountedFragment<HostNode>
  patchElement(
    state: RenderRuntimeState<HostNode>,
    host: DOMHost<HostNode>,
    mounted: MountedElement<HostNode>,
    input: ElementMountInput<HostNode>,
    controller: MountController<HostNode>,
  ): MountedElement<HostNode>
  patchFragment(
    state: RenderRuntimeState<HostNode>,
    host: DOMHost<HostNode>,
    mounted: MountedFragment<HostNode>,
    input: FragmentMountInput<HostNode>,
    parentContext: HostNode,
    controller: MountController<HostNode>,
  ): MountedFragment<HostNode>
}

export type PatchSubtree<HostNode = unknown> = (
  input: MountInput<HostNode> | null,
) => Mounted<HostNode> | undefined

export interface AnchorMountState<HostNode = unknown> {
  anchor: HostNode
  mounted: Mounted<HostNode> | undefined
}

export interface PendingRuntimeInput<HostNode = unknown> {
  entry: RuntimeEntry
  input: MountInput<HostNode> | null
  args: readonly unknown[]
}

export interface PendingComponentLifecycle<HostNode = unknown> {
  instance: ComponentInstance<ComponentProps, HostNode>
  name: PendingLifecycleName
  subtree: Mounted<HostNode> | undefined
}

declare const OWNED_MOUNT_SLOT_BRAND: unique symbol
declare const OWNED_MOUNT_GENERATION_BRAND: unique symbol
declare const OWNED_MOUNT_TOKEN_BRAND: unique symbol
declare const OWNED_MOUNT_HANDLE_BRAND: unique symbol
declare const OWNED_MOUNT_COLLECTOR_BRAND: unique symbol
declare const OWNED_MOUNT_ALIAS_KEY_BRAND: unique symbol

export type OwnedMountSlotId = number & {
  readonly [OWNED_MOUNT_SLOT_BRAND]: 'OwnedMountSlotId'
}

export type OwnedMountGeneration = string & {
  readonly [OWNED_MOUNT_GENERATION_BRAND]: 'OwnedMountGeneration'
}

export interface OwnedMountToken {
  readonly slot: OwnedMountSlotId
  readonly generation: OwnedMountGeneration
  readonly [OWNED_MOUNT_TOKEN_BRAND]: true
}

export interface OwnedMountHandle {
  readonly __rue_owned_mount_slot: OwnedMountSlotId
  readonly __rue_owned_mount_generation: OwnedMountGeneration
  readonly [OWNED_MOUNT_HANDLE_BRAND]: true
}

export type OwnedMountCollector = OwnedMountToken & {
  readonly [OWNED_MOUNT_COLLECTOR_BRAND]: true
}

export type OwnedMountAliasKey = string & {
  readonly [OWNED_MOUNT_ALIAS_KEY_BRAND]: 'OwnedMountAliasKey'
}

export type OwnedMountPhase = 'building' | 'committed'

export interface OwnedMountAnchorEntry<HostNode = unknown> extends AnchorMountState<HostNode> {}

export interface OwnedMountLifecycleEntry<
  HostNode = unknown,
> extends PendingComponentLifecycle<HostNode> {}

export type OwnedMountResource<HostNode = unknown> =
  | { readonly kind: 'anchor'; readonly entry: OwnedMountAnchorEntry<HostNode> }
  | { readonly kind: 'lifecycle'; readonly entry: OwnedMountLifecycleEntry<HostNode> }
  | { readonly kind: 'child'; readonly token: OwnedMountToken }

export interface OwnedMountSlot<HostNode = unknown> {
  generation: OwnedMountGeneration
  phase: OwnedMountPhase
  anchors: OwnedMountAnchorEntry<HostNode>[]
  children: OwnedMountToken[]
  pendingLifecycle: OwnedMountLifecycleEntry<HostNode>[]
}

export interface OwnedMountManager<HostNode = unknown> {
  abortOwnedMount(value: unknown): boolean
  buildOwnedMount(): OwnedMountHandle | undefined
  commitMounted(value: unknown, deferMounted?: boolean): boolean
  currentAnchorEntries(): OwnedMountAnchorEntry<HostNode>[] | undefined
  currentLifecycleEntries(): OwnedMountLifecycleEntry<HostNode>[] | undefined
  currentOwnedMountToken(): OwnedMountHandle | undefined
  disposeOwnedMount(value: unknown): boolean
  findAnchor(anchor: HostNode): OwnedMountAnchorEntry<HostNode> | undefined
  flushMounted(value: unknown): boolean
  free(): void
  ownedMountCollecting(): boolean
  ownedMountCount(): number
  ownedMountEntryCount(): number
  pendingLifecycleCount(): number
  prepareAnchorUpdate(anchor: HostNode): boolean
  updateOwnedMount(value: unknown): boolean
}

export interface KeepAliveController<HostNode = unknown> {
  activate(anchor: HostNode): void
  deactivate(anchor: HostNode): void
}

export interface ReactiveKernelBoundary extends ObjectLike {
  untrack?<T>(callback: () => T): T
  __rueCreateDetachedEffectScope?: () => unknown
  __rueDisposeEffectScope?: (scopeId: EffectScopeId) => void
  __rueRecordRuntimeInput?: (
    entry: RuntimeEntry,
    input: MountInput | null,
    args: readonly unknown[],
  ) => void
  __ruePushEffectScope?: (scopeId: EffectScopeId) => void
  __ruePopEffectScope?: () => void
}

export interface KernelBridge {
  reactive: ReactiveKernelBoundary
  createEffectScope(): EffectScopeId | undefined
  disposeEffectScope(scopeId: EffectScopeId): void
  recordRuntimeInput(entry: RuntimeEntry, input: MountInput | null, args: readonly unknown[]): void
}

export interface RuntimeState<HostNode = unknown> {
  activeAppMount: RuntimeAppMountTransaction<HostNode> | undefined
  adapter: unknown
  appMounts: Map<HostNode, RuntimeAppMountTransaction<HostNode>>
  anchorMounts: Map<HostNode, AnchorMountState<HostNode>>
  containerMounts: Map<HostNode, Mounted<HostNode>>
  disposed: boolean
  effectScopeIds: Set<EffectScopeId>
  kernel: KernelBridge
  lastContainer: HostNode | undefined
  mountInputs: Map<number, MountInput<HostNode>>
  nextMountInputId: number
  pendingComponentLifecycle: PendingComponentLifecycle<HostNode>[]
  pendingInputs: PendingRuntimeInput<HostNode>[]
  renderDepth: number
  components?: ComponentInstanceManager<HostNode>
  errors?: ErrorController
  flushPendingComponentLifecycle?: () => void
  lifecycle?: LifecycleController
  ownedMounts?: OwnedMountManager<HostNode>
  runtime?: RueRuntime<HostNode>
}

export type RuntimeOrchestrationState<HostNode = unknown> = RuntimeState<HostNode> & {
  components: ComponentInstanceManager<HostNode>
  errors: ErrorController
  flushPendingComponentLifecycle: () => void
  lifecycle: LifecycleController
  ownedMounts: OwnedMountManager<HostNode>
}

export type CompleteRuntimeState<HostNode = unknown> = RuntimeOrchestrationState<HostNode> & {
  runtime: RueRuntime<HostNode>
}

export interface DOMHostAdapter<HostNode = unknown> extends ObjectLike {
  createElement(tag: string, parent?: HostNode): HostNode
  createTextNode(text: string): HostNode
  createDocumentFragment(): HostNode
  isFragment(node: HostNode): boolean
  collectFragmentChildren(node: HostNode): HostNode[]
  setTextContent(node: HostNode, text: string): void
  appendChild(parent: HostNode, child: HostNode): void
  insertBefore(parent: HostNode, child: HostNode, before: HostNode): void
  removeChild(parent: HostNode, child: HostNode): void
  contains(parent: HostNode, child: HostNode): boolean
  setClassName(node: HostNode, value: string): void
  patchStyle(node: HostNode, previous: ComponentProps, next: ComponentProps): void
  setInnerHTML(node: HostNode, html: string): void
  setValue(node: HostNode, value: unknown): void
  setChecked(node: HostNode, checked: boolean): void
  setDisabled(node: HostNode, disabled: boolean): void
  clearRef(ref: unknown): void
  applyRef(node: HostNode, ref: unknown): void
  setAttribute(node: HostNode, key: string, value: string): void
  removeAttribute(node: HostNode, key: string): void
  getTagName(node: HostNode): string
  addEventListener(node: HostNode, event: string, handler: unknown): void
  removeEventListener(node: HostNode, event: string, handler: unknown): void
  hasValueProperty(node: HostNode): boolean
  isSelectMultiple(node: HostNode): boolean
  getParentNode?: (node: HostNode) => HostNode | null
}

export type DOMHost<HostNode = unknown> = Omit<DOMHostAdapter<HostNode>, 'getParentNode'> & {
  getParentNode(node: HostNode): HostNode | null
}

export const JS_RUNTIME_CONTROL_METHOD_NAMES = Object.freeze(
  [
    'emitted',
    'getCurrentContainer',
    'mount',
    'onServerPrefetch',
    'runServerPrefetch',
    'unmount',
    'use',
  ].sort(),
)

/** Public method surface of the complete JavaScript Rue runtime. */
export const JS_RUNTIME_METHOD_NAMES = Object.freeze(
  [
    '__rtd',
    '__rueActivateRange',
    '__rueDeactivateRange',
    'abortOwnedMount',
    'buildOwnedMount',
    'commitMounted',
    'componentInstanceCount',
    'componentWrapperCount',
    'createComponent',
    'createElement',
    'currentOwnedMountToken',
    'disposeOwnedMount',
    'effectScopeCount',
    'emitted',
    'flushMounted',
    'getCurrentContainer',
    'globalAnchorMountCount',
    'mount',
    'onActivated',
    'onBeforeCreate',
    'onBeforeMount',
    'onBeforeUnmount',
    'onBeforeUpdate',
    'onCreated',
    'onDeactivated',
    'onError',
    'onMounted',
    'onRenderTriggered',
    'onServerPrefetch',
    'onUnmounted',
    'onUpdated',
    'ownedMountCollecting',
    'ownedMountCount',
    'ownedMountEntryCount',
    'pendingComponentMountedCount',
    'render',
    'renderAnchor',
    'renderStatic',
    'runServerPrefetch',
    'setDOMAdapter',
    'unmount',
    'updateOwnedMount',
    'use',
    'vapor',
  ].sort(),
)

export const isObjectLike = (value: unknown): value is ObjectLike =>
  (typeof value === 'object' || typeof value === 'function') && value != null
