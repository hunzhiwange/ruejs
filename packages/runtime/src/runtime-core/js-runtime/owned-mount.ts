import { hostForRender, removeMounted } from './render/helpers.js'
import type {
  OwnedMountAliasKey,
  OwnedMountAnchorEntry,
  OwnedMountCollector,
  OwnedMountGeneration,
  OwnedMountHandle,
  OwnedMountManager,
  OwnedMountSlot,
  OwnedMountSlotId,
  OwnedMountToken,
  RuntimeState,
} from './types.js'

const SLOT_KEY = '__rue_owned_mount_slot'
const GENERATION_KEY = '__rue_owned_mount_generation'
const MAX_GENERATION = (1n << 64n) - 1n
const HYDRATION_FALLBACK_DEPTH_KEY = Symbol.for('rue.owned-mount-hydration-fallback-depth')

const sameToken = (
  left: OwnedMountToken | undefined,
  right: OwnedMountToken | undefined,
): boolean => left?.slot === right?.slot && left?.generation === right?.generation
const tokenKey = (token: OwnedMountToken): OwnedMountAliasKey =>
  `${token.slot}:${token.generation}` as OwnedMountAliasKey

const createToken = (slot: number, generation: string): OwnedMountToken =>
  ({
    slot: slot as OwnedMountSlotId,
    generation: generation as OwnedMountGeneration,
  }) as OwnedMountToken

const asCollector = (token: OwnedMountToken): OwnedMountCollector => token as OwnedMountCollector

/**
 * 解析 JS 侧只透传、不解释的 owned mount 句柄。
 * `slot` 允许复用存储槽，`generation` 确保旧 token 不会命中新资源。
 */
const tokenFromValue = (value: unknown): OwnedMountToken | undefined => {
  if ((typeof value !== 'object' && typeof value !== 'function') || value == null) {
    return undefined
  }
  let slot: unknown
  let generation: unknown
  try {
    slot = Reflect.get(value, SLOT_KEY)
    generation = Reflect.get(value, GENERATION_KEY)
  } catch {
    return undefined
  }
  if (typeof slot !== 'number' || !Number.isFinite(slot) || slot < 0 || !Number.isInteger(slot)) {
    return undefined
  }
  if (typeof generation !== 'string' || !/^[1-9]\d*$/.test(generation)) return undefined
  return createToken(slot, generation)
}

const tokenToValue = (token: OwnedMountToken): OwnedMountHandle =>
  ({
    [SLOT_KEY]: token.slot,
    [GENERATION_KEY]: token.generation,
  }) as OwnedMountHandle

const clearOwnedAnchor = <HostNode>(
  state: RuntimeState<HostNode>,
  entry: OwnedMountAnchorEntry<HostNode>,
): void => {
  const host = hostForRender(state)
  if (!host) {
    entry.mounted = undefined
    return
  }
  const parent = host.getParentNode(entry.anchor)
  if (parent) removeMounted(host, parent, entry.mounted)
  else entry.mounted?.dispose?.()
  entry.mounted = undefined
}

/** 创建按 owner 隔离的 mounted snapshot 管理器。 */
export const createOwnedMountManager = <HostNode>(
  state: RuntimeState<HostNode>,
): OwnedMountManager<HostNode> => {
  const slots: Array<OwnedMountSlot<HostNode> | undefined> = []
  const freeSlots: OwnedMountSlotId[] = []

  // collector 支持重入；嵌套 build 会登记为父 token 的 child。
  const collectors: OwnedMountCollector[] = []
  const tokenAliases = new Map<OwnedMountAliasKey, OwnedMountToken>()
  let nextGeneration = 1n

  const hydrationGlobal = globalThis as typeof globalThis & Record<symbol, unknown>

  type HydrationContainer = {
    __rue_hydrated_adopted?: unknown
    __rue_hydrated_adopted_target?: unknown
    parentNode?: unknown
  }

  const hydrationContainer = (value: unknown): HydrationContainer | undefined =>
    (typeof value === 'object' || typeof value === 'function') && value != null
      ? (value as HydrationContainer)
      : undefined

  const isHydrationFallback = (): boolean => {
    let current = hydrationContainer(state.lastContainer)
    for (let depth = 0; current && depth < 64; depth += 1) {
      if (current.__rue_hydrated_adopted || current.__rue_hydrated_adopted_target) return true
      current = hydrationContainer(current.parentNode)
    }
    return false
  }

  const getSlot = (token: OwnedMountToken | undefined): OwnedMountSlot<HostNode> | undefined => {
    if (!token) return undefined
    const slot = slots[token.slot]
    return slot?.generation === token.generation ? slot : undefined
  }

  const parseLiveToken = (value: unknown, resolveAliases = true): OwnedMountToken | undefined => {
    let token = tokenFromValue(value)
    if (!token) return undefined
    const seen = new Set<OwnedMountAliasKey>()
    while (resolveAliases && !getSlot(token) && !seen.has(tokenKey(token))) {
      seen.add(tokenKey(token))
      token = tokenAliases.get(tokenKey(token))
      if (!token) return undefined
    }
    return getSlot(token) ? token : undefined
  }

  // JS 回调可能在 inner 被可变借用期间重入查询 owned mount 状态。
  // 单独镜像 collector 栈，避免 RefCell trap，同时保持查询语义准确。
  const currentToken = (): OwnedMountCollector | undefined => collectors[collectors.length - 1]

  const flushSlotLifecycle = (token: OwnedMountToken, slot: OwnedMountSlot<HostNode>): void => {
    if (slot.pendingLifecycle.length === 0) return
    collectors.push(asCollector(token))
    try {
      state.pendingComponentLifecycle.push(...slot.pendingLifecycle.splice(0))
      state.flushPendingComponentLifecycle?.()
    } finally {
      for (let index = collectors.length - 1; index >= 0; index -= 1) {
        if (sameToken(collectors[index], token)) {
          collectors.splice(index, 1)
          break
        }
      }
    }
  }

  const takeSlot = (token: OwnedMountToken): OwnedMountSlot<HostNode> | undefined => {
    const slot = getSlot(token)
    if (!slot) return undefined
    for (let index = collectors.length - 1; index >= 0; index -= 1) {
      if (sameToken(collectors[index], token)) collectors.splice(index, 1)
    }
    slots[token.slot] = undefined
    freeSlots.push(token.slot)
    tokenAliases.delete(tokenKey(token))
    for (const [key, target] of tokenAliases) {
      if (sameToken(target, token)) tokenAliases.delete(key)
    }
    return slot
  }

  /** 递归销毁 token：先处理 child，再按注册逆序释放当前 snapshot。 */
  const disposeToken = (token: OwnedMountToken): boolean => {
    const slot = takeSlot(token)
    if (!slot) return false
    for (let index = slot.children.length - 1; index >= 0; index -= 1) {
      disposeToken(slot.children[index]!)
    }
    for (let index = slot.anchors.length - 1; index >= 0; index -= 1) {
      clearOwnedAnchor(state, slot.anchors[index]!)
    }
    slot.pendingLifecycle.length = 0
    slot.children.length = 0
    slot.anchors.length = 0
    return true
  }

  const manager: OwnedMountManager<HostNode> = {
    abortOwnedMount(value: unknown): boolean {
      const token = parseLiveToken(value, false)
      return token ? disposeToken(token) : false
    },
    /** 分配并激活 owned collector；返回值对 JS 是不透明 token。 */
    buildOwnedMount(): OwnedMountHandle | undefined {
      if (isHydrationFallback() || Number(hydrationGlobal[HYDRATION_FALLBACK_DEPTH_KEY] ?? 0) > 0) {
        return undefined
      }
      if (nextGeneration > MAX_GENERATION) {
        throw new Error('Rue runtime: owned mount generation exhausted')
      }
      const generation = nextGeneration.toString() as OwnedMountGeneration
      nextGeneration += 1n
      const slotIndex = freeSlots.pop() ?? (slots.length as OwnedMountSlotId)
      const token = createToken(slotIndex, generation)

      // anchor 按列表行存储；嵌套 token 记录为 children，
      // 使 dispose/abort 无需扫描全局映射即可递归回收。
      slots[slotIndex] = {
        generation,
        phase: 'building',
        anchors: [],
        children: [],
        pendingLifecycle: [],
      }
      const parent = currentToken()
      const parentSlot = getSlot(parent)
      if (parentSlot) parentSlot.children.push(token)
      collectors.push(asCollector(token))
      return tokenToValue(token)
    },
    /** 完成 build/update；token 不是当前栈顶或 generation 已过期时拒绝。 */
    commitMounted(value: unknown, deferMounted = false): boolean {
      const token = parseLiveToken(value)
      if (!token || !sameToken(currentToken(), token)) return false
      const slot = getSlot(token)
      if (!slot) return false
      slot.phase = 'committed'
      collectors.pop()
      const parent = currentToken()
      const parentSlot = getSlot(parent)
      const hasTransitiveResources =
        slot.anchors.length > 0 || slot.pendingLifecycle.length > 0 || slot.children.length > 0
      if (parent && parentSlot && !sameToken(parent, token) && hasTransitiveResources) {
        parentSlot.anchors.push(...slot.anchors.splice(0))
        parentSlot.pendingLifecycle.push(...slot.pendingLifecycle.splice(0))
        parentSlot.children = parentSlot.children.filter(child => !sameToken(child, token))
        parentSlot.children.push(...slot.children.splice(0))
        slots[token.slot] = undefined
        freeSlots.push(token.slot)
        tokenAliases.set(tokenKey(token), parent)
        return true
      }
      if (!deferMounted) flushSlotLifecycle(token, slot)
      return true
    },
    currentOwnedMountToken(): OwnedMountHandle | undefined {
      const token = currentToken()
      return token ? tokenToValue(token) : undefined
    },
    currentLifecycleEntries() {
      return getSlot(currentToken())?.pendingLifecycle
    },
    currentAnchorEntries(): OwnedMountAnchorEntry<HostNode>[] | undefined {
      return getSlot(currentToken())?.anchors
    },
    findAnchor(anchor: HostNode): OwnedMountAnchorEntry<HostNode> | undefined {
      for (const slot of slots) {
        const found = slot?.anchors.find(entry => entry.anchor === anchor)
        if (found) return found
      }
      return undefined
    },
    disposeOwnedMount(value: unknown): boolean {
      const token = parseLiveToken(value, false)
      return token ? disposeToken(token) : false
    },
    flushMounted(value: unknown): boolean {
      const rawToken = tokenFromValue(value)
      const token = parseLiveToken(value)
      const slot = token && getSlot(token)
      if (!slot) return false
      if (rawToken && !sameToken(rawToken, token)) return true
      flushSlotLifecycle(token, slot)
      return true
    },
    free(): void {
      for (let index = slots.length - 1; index >= 0; index -= 1) {
        const slot = slots[index]
        if (slot) disposeToken(createToken(index, slot.generation))
      }
      collectors.length = 0
      freeSlots.length = 0
      tokenAliases.clear()
    },
    ownedMountCollecting(): boolean {
      return collectors.length > 0
    },
    ownedMountCount(): number {
      let count = 0
      for (const slot of slots) if (slot) count += 1
      return count
    },
    ownedMountEntryCount(): number {
      let count = 0
      for (const slot of slots) if (slot) count += slot.anchors.length
      return count
    },
    pendingLifecycleCount(): number {
      let count = 0
      for (const slot of slots) if (slot) count += slot.pendingLifecycle.length
      return count
    },
    /** 更新顶层 anchor 前，精确回收同一 token 中其余传递式 anchor。 */
    prepareAnchorUpdate(anchor: HostNode): boolean {
      const slot = getSlot(currentToken())
      if (!slot) return false
      const keepIndex = slot.anchors.findIndex(entry => entry.anchor === anchor)
      if (keepIndex < 0) return false
      const kept = slot.anchors[keepIndex]!
      for (let index = slot.anchors.length - 1; index >= 0; index -= 1) {
        if (index !== keepIndex) clearOwnedAnchor(state, slot.anchors[index]!)
      }
      slot.anchors.splice(0, slot.anchors.length, kept)
      return true
    },
    /** 激活既有 token 进行同 owner 更新。 */
    updateOwnedMount(value: unknown): boolean {
      const token = parseLiveToken(value)
      const slot = token && getSlot(token)
      if (!token || !slot || slot.phase !== 'committed') return false
      if (sameToken(currentToken(), token)) {
        collectors.push(asCollector(token))
        return true
      }

      // 更新前回收上一代嵌套 token；保留父槽以命中相同的 anchor/range。
      const children = slot.children.splice(0)
      for (let index = children.length - 1; index >= 0; index -= 1) {
        disposeToken(children[index]!)
      }
      collectors.push(asCollector(token))
      return true
    },
  }

  return manager
}
