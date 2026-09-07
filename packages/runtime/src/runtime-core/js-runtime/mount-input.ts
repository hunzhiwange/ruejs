import {
  PORTABLE_HANDLE_KEYS,
  PORTABLE_PROTOCOL_KEYS,
  RUE_CLEANUP_BUCKET_KEY,
  RUE_COMPONENT_UPDATE_MODE_KEY,
  RUE_EFFECT_SCOPE_ID_KEY,
  RUE_MOUNT_ID_KEY,
  RUE_PORTABLE_COMPONENT_TYPE_KEY,
  RUE_PORTABLE_VAPOR_SETUP_KEY,
  RUE_REPEATABLE_MOUNT_FACTORY_KEY,
} from '../protocol.js'
import { unwrapDisplayRef } from '../../display-value.js'
import { isObjectLike } from './types.js'
import type {
  ComponentProps,
  ComponentUpdateMode,
  ComponentType,
  EffectScopeId,
  KernelBridge,
  MountChild,
  MountInput,
  MountInputType,
  MountKey,
  ObjectLike,
  PortableHandle,
  PortableMountHandle,
  RuntimeEntry,
  RuntimeState,
  VaporSetup,
} from './types.js'

const entryErrors: Record<RuntimeEntry, string> = {
  render: 'Rue runtime: render input not supported on the default path',
  renderAnchor: 'Rue runtime: renderAnchor input not supported on the default path',
  renderStatic: 'Rue runtime: renderStatic input not supported on the default path',
}

const protocolError = (entry: RuntimeEntry, detail?: string): TypeError => {
  const prefix = entryErrors[entry] ?? `Rue runtime: ${entry} input not supported`
  return new TypeError(detail ? `${prefix}: ${detail}` : prefix)
}

const hasOwnOrInherited = (value: object, key: PropertyKey): boolean => {
  try {
    return Reflect.has(value, key)
  } catch {
    return false
  }
}

const read = (value: object, key: PropertyKey): unknown => {
  try {
    return Reflect.get(value, key)
  } catch {
    return undefined
  }
}

const copyProps = (value: unknown): ComponentProps => {
  if (!isObjectLike(value) || Array.isArray(value)) {
    return {}
  }
  const props: ComponentProps = {}
  for (const key of Object.keys(value)) {
    props[key] = read(value, key)
  }
  return props
}

const normalizeKey = (value: unknown): MountKey | undefined => {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return undefined
}

const normalizeScopeId = (value: unknown): EffectScopeId | undefined =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined

const normalizeComponentUpdateMode = (value: unknown): ComponentUpdateMode =>
  value === 'fine-grained' || value === 'rerender' ? value : 'rerender'

interface MountMetadata {
  key: MountKey | undefined
  mountCleanupBucket: unknown[] | undefined
  mountEffectScopeId: EffectScopeId | undefined
}

const extractMetadata = (source: unknown, props: ComponentProps): MountMetadata => {
  const sourceCleanup = isObjectLike(source) ? read(source, RUE_CLEANUP_BUCKET_KEY) : undefined
  const propsCleanup = read(props, RUE_CLEANUP_BUCKET_KEY)
  const sourceScope = isObjectLike(source) ? read(source, RUE_EFFECT_SCOPE_ID_KEY) : undefined
  const propsScope = read(props, RUE_EFFECT_SCOPE_ID_KEY)
  const sourceKey = isObjectLike(source) ? normalizeKey(read(source, 'key')) : undefined
  const propsKey = normalizeKey(read(props, 'key'))

  delete props[RUE_CLEANUP_BUCKET_KEY]
  delete props[RUE_EFFECT_SCOPE_ID_KEY]

  return {
    key: sourceKey ?? propsKey,
    mountCleanupBucket: Array.isArray(sourceCleanup)
      ? sourceCleanup
      : Array.isArray(propsCleanup)
        ? propsCleanup
        : undefined,
    mountEffectScopeId: normalizeScopeId(sourceScope) ?? normalizeScopeId(propsScope),
  }
}

const copyPortableKeys = (source: object): PortableHandle => {
  const portable: PortableHandle = {}
  for (const key of PORTABLE_HANDLE_KEYS) {
    if (hasOwnOrInherited(source, key)) {
      portable[key] = read(source, key)
    }
  }
  return portable
}

interface CreateInputOptions<HostNode> {
  type: MountInputType<HostNode>
  props?: unknown
  children?: MountChild<HostNode>[]
  source?: object
  strictComponentReturns?: boolean
  mountEffectScopeId?: EffectScopeId
}

const createInput = <HostNode>({
  type,
  props = {},
  children = [],
  source,
  strictComponentReturns = false,
  mountEffectScopeId,
}: CreateInputOptions<HostNode>): MountInput<HostNode> => {
  const normalizedProps = copyProps(props)
  const metadata = extractMetadata(source, normalizedProps)
  return {
    type,
    props: normalizedProps,
    children,
    key: metadata.key,
    strictComponentReturns,
    mountCleanupBucket: metadata.mountCleanupBucket,
    mountEffectScopeId: mountEffectScopeId ?? metadata.mountEffectScopeId,
    elHint: undefined,
    ...(source ? { portable: copyPortableKeys(source) } : {}),
  } as MountInput<HostNode>
}

const normalizeChildren = <HostNode>(
  state: RuntimeState<HostNode>,
  value: unknown,
): MountChild<HostNode>[] => {
  const children: MountChild<HostNode>[] = []
  const push = (child: unknown): void => {
    const displayed = unwrapDisplayRef(child)
    if (displayed !== child) {
      push(displayed)
      return
    }
    if (Array.isArray(child)) {
      child.forEach(push)
      return
    }
    if (typeof child === 'string' || typeof child === 'number') {
      children.push({ kind: 'text', value: String(child) })
      return
    }
    if (isObjectLike(child)) {
      const input = normalizeMountInput(state, child, 'render')
      if (input) children.push({ kind: 'input', value: input })
    }
  }
  push(value)
  return children
}

const effectiveChildren = (props: ComponentProps, children: unknown): unknown => {
  if (Array.isArray(children)) {
    return children.length === 0 ? (props.children ?? children) : children
  }
  return children == null ? (props.children ?? children) : children
}

export const createElementMountInput = <HostNode = unknown>(
  state: RuntimeState<HostNode>,
  typeTag: unknown,
  propsValue: unknown,
  childrenValue: unknown,
  options: {
    strictComponentReturns?: boolean
  } = {},
): MountInput<HostNode> => {
  const props = copyProps(propsValue)
  if (Array.isArray(childrenValue)) {
    props.children = childrenValue
  } else if (childrenValue != null) {
    props.children = [childrenValue]
  }
  const children = normalizeChildren(state, effectiveChildren(props, childrenValue))
  let type: MountInputType<HostNode>
  if (typeof typeTag === 'function') {
    type = {
      kind: 'component',
      component: typeTag as ComponentType,
      updateMode: 'rerender',
    }
  } else if (typeTag === 'fragment') {
    type = { kind: 'fragment' }
  } else if (typeTag === 'vapor') {
    const setup =
      typeof props.setup === 'function' ? (props.setup as VaporSetup<HostNode>) : undefined
    type = setup ? { kind: 'vapor', setup } : { kind: 'vapor' }
  } else {
    type = { kind: 'element', tag: typeof typeTag === 'string' ? typeTag : 'div' }
  }
  return createInput<HostNode>({
    type,
    props,
    children,
    strictComponentReturns: options.strictComponentReturns === true,
  })
}

export const createVaporMountInput = (setup: unknown, kernel: KernelBridge): MountInput => {
  const hasSetup = typeof setup === 'function'
  return createInput({
    type: hasSetup ? { kind: 'vapor', setup: setup as VaporSetup } : { kind: 'vapor' },
    mountEffectScopeId: hasSetup ? kernel.createEffectScope() : undefined,
  })
}

export const storeMountInput = (state: RuntimeState, input: MountInput): PortableMountHandle => {
  const id = state.nextMountInputId++
  state.mountInputs.set(id, input)
  const handle: PortableMountHandle = { [RUE_MOUNT_ID_KEY]: id }
  if (input.key !== undefined) {
    handle.key = input.key
  }
  return handle
}

const mountHandleId = (value: unknown): number | undefined => {
  const candidate = isObjectLike(value) ? read(value, RUE_MOUNT_ID_KEY) : value
  const number =
    typeof candidate === 'string' && candidate.trim() !== '' ? Number(candidate) : candidate
  return typeof number === 'number' && Number.isSafeInteger(number) && number >= 0
    ? number
    : undefined
}

const takeTaggedMountInput = <HostNode>(
  state: RuntimeState<HostNode>,
  value: unknown,
  entry: RuntimeEntry,
): MountInput<HostNode> => {
  const id = mountHandleId(value)
  if (id === undefined) {
    throw protocolError(entry, 'invalid mount handle id')
  }
  if (!state.mountInputs.has(id)) {
    throw protocolError(entry, `stale or unknown mount handle ${id}`)
  }
  const input = state.mountInputs.get(id)
  state.mountInputs.delete(id)
  if (!input) {
    throw protocolError(entry, `stale or unknown mount handle ${id}`)
  }

  if (isObjectLike(value)) {
    const metadataProps = {
      key: read(value, 'key'),
      [RUE_CLEANUP_BUCKET_KEY]: read(value, RUE_CLEANUP_BUCKET_KEY),
      [RUE_EFFECT_SCOPE_ID_KEY]: read(value, RUE_EFFECT_SCOPE_ID_KEY),
    }
    const metadata = extractMetadata(value, metadataProps)
    if (metadata.key !== undefined) input.key = metadata.key
    if (
      hasOwnOrInherited(value, RUE_CLEANUP_BUCKET_KEY) &&
      metadata.mountCleanupBucket !== undefined
    ) {
      input.mountCleanupBucket = metadata.mountCleanupBucket
    }
    if (hasOwnOrInherited(value, RUE_EFFECT_SCOPE_ID_KEY)) {
      input.mountEffectScopeId = metadata.mountEffectScopeId
    }
  }
  return input
}

const portableComponentInput = <HostNode>(
  state: RuntimeState<HostNode>,
  source: ObjectLike,
  entry: RuntimeEntry,
): MountInput<HostNode> => {
  const component = read(source, RUE_PORTABLE_COMPONENT_TYPE_KEY)
  if (typeof component === 'string') {
    const props = copyProps(read(source, 'props'))
    return createInput<HostNode>({
      type: { kind: 'element', tag: component },
      props,
      children: normalizeChildren(state, props.children),
      source,
    })
  }
  if (typeof component !== 'function') {
    throw protocolError(entry, `${RUE_PORTABLE_COMPONENT_TYPE_KEY} must be a function or string`)
  }
  return createInput<HostNode>({
    type: {
      kind: 'component',
      component: component as ComponentType,
      updateMode: normalizeComponentUpdateMode(read(source, RUE_COMPONENT_UPDATE_MODE_KEY)),
    },
    props: read(source, 'props'),
    source,
  })
}

const portableVaporInput = <HostNode>(source: ObjectLike): MountInput<HostNode> => {
  const setup = read(source, RUE_PORTABLE_VAPOR_SETUP_KEY)
  return createInput<HostNode>({
    type:
      typeof setup === 'function'
        ? { kind: 'vapor', setup: setup as VaporSetup<HostNode> }
        : { kind: 'vapor' },
    source,
  })
}

const normalizeMountInputValue = <HostNode>(
  state: RuntimeState<HostNode>,
  value: unknown,
  entry: RuntimeEntry,
  allowRepeatableReplay: boolean,
): MountInput<HostNode> | null => {
  if (value == null) {
    return null
  }

  if (isObjectLike(value) && !Array.isArray(value)) {
    // Optimized components may build and return a native host node directly.
    // Model it as an already-created vapor host instead of treating every
    // untagged object as a malformed protocol handle.
    if (typeof read(value, 'nodeType') === 'number') {
      const input = createInput<HostNode>({
        type: { kind: 'vapor' },
        source: value,
      })
      input.elHint = value as HostNode
      return input
    }
    if (hasOwnOrInherited(value, RUE_MOUNT_ID_KEY)) {
      const id = mountHandleId(value)
      if (allowRepeatableReplay && id !== undefined && !state.mountInputs.has(id)) {
        const replayFactory = read(value, RUE_REPEATABLE_MOUNT_FACTORY_KEY)
        if (typeof replayFactory === 'function') {
          // default handle 仍是一次性令牌；只有显式声明为 repeatable 的结果在令牌
          // 已消费后才重新生产输入。工厂结果本轮不再递归 replay，避免错误工厂自循环。
          const replayed = Reflect.apply(replayFactory, undefined, [])
          return normalizeMountInputValue(state, replayed, entry, false)
        }
      }
      return takeTaggedMountInput(state, value, entry)
    }
    if (hasOwnOrInherited(value, RUE_PORTABLE_COMPONENT_TYPE_KEY)) {
      return portableComponentInput(state, value, entry)
    }
    if (hasOwnOrInherited(value, RUE_PORTABLE_VAPOR_SETUP_KEY)) {
      return portableVaporInput(value)
    }
    throw protocolError(entry)
  }

  if (typeof value === 'number' || typeof value === 'string') {
    return takeTaggedMountInput(state, value, entry)
  }

  throw protocolError(entry)
}

export const normalizeMountInput = <HostNode>(
  state: RuntimeState<HostNode>,
  value: unknown,
  entry: RuntimeEntry = 'render',
): MountInput<HostNode> | null => normalizeMountInputValue(state, value, entry, true)

export const portableProtocolKeys = PORTABLE_PROTOCOL_KEYS
