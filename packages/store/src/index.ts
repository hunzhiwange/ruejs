import type { CompiledSignalHandle as SignalHandle } from '@rue-js/rue/internal/reactive'
import {
  onOwnerCleanup,
  createOwner,
  adoptOwner,
  runWithOwner,
  disposeOwner,
} from '@rue-js/rue/internal/reactive'
import { getCurrentAppTarget } from '@rue-js/rue/internal/app'
/*
Store 架构概述
- 根实例：createStore 创建应用级 store root，并像 Router 一样按容器绑定，支持 install/useStoreRoot。
- 定义方式：defineStore 支持函数式 store 与对象配置式 store，分别适合组合逻辑与集中组织状态。
- 响应式：底层直接复用 Rue 现有 signal/computed/watchEffect，避免重复造轮子。
- 变更入口：提供 $patch/$set/$reset/$subscribe，既保留集中管理体验，也补上细粒度路径更新能力。
*/
import { batch, computed, signal, watchEffect } from '@rue-js/rue'

/** Store 状态树，要求顶层是可枚举的对象结构。 */
export type StateTree = Record<string, any>

/** Store 字段路径，支持单层 key、数组下标或多段路径。 */
export type StorePath = string | number | Array<string | number>

/** Store 订阅回调，接收本次变更元信息和状态快照。 */
export type StoreSubscription = (mutation: { storeId: string }, state: StateTree) => void

/** Store 插件函数，可读取 root/store/id，并返回要混入 store 的扩展属性。 */
export type StorePlugin = (context: {
  /** 当前正在安装插件的 store 实例。 */
  store: StoreInstance
  /** 当前 store 所属的根实例。 */
  root: StoreRoot
  /** 当前 store 的唯一 id。 */
  id: string
}) => void | Record<string, unknown>

/** defineStore 创建出的运行时 store 实例。 */
export type StoreInstance = {
  /** 当前 store 的唯一 id。 */
  get: () => StateTree
  getPath: (path: StorePath) => any
  set: (path: StorePath, value: unknown) => void
  update: (path: StorePath, updater: (value: any) => unknown) => void
  mutatePath: (path: StorePath, mutator: (value: any) => void) => void
  subscribe: (callback: StoreSubscription, options?: { immediate?: boolean }) => () => void
  $id: string
  /** 当前 store 的状态快照；写入使用显式路径 API。 */
  $state: StateTree
  /** 批量更新状态；对象 patch 会深度合并普通对象，函数 patch 可直接修改 state。 */
  $patch: (patch: Partial<StateTree> | ((state: StateTree) => void)) => void
  /** 按路径更新状态值，value 可传入基于旧值计算新值的函数。 */
  $set: (path: StorePath, value: unknown | ((prev: unknown) => unknown)) => void
  /** 将状态恢复到 store 创建时的初始快照。 */
  $reset: () => void
  /** 订阅状态变化，返回取消订阅函数。 */
  $subscribe: (callback: StoreSubscription, options?: { immediate?: boolean }) => () => void
  /** 停止当前 store 的订阅副作用，并从 root 中移除实例。 */
  $dispose: () => void
  /** state、getter、action 和插件扩展会挂载到实例自身。 */
  [key: string]: any
}

/** 应用级 store 根实例，负责持有所有 store 和插件。 */
export type StoreRoot = {
  /** Rue 插件安装入口，会把 root 绑定到当前容器。 */
  install: (app: unknown, options: unknown[]) => void
  /** 注册 store 插件，并立即应用到已创建的 store。 */
  use: (plugin: StorePlugin) => StoreRoot
  /** 释放 root 下所有 store，并清理活动 root 引用。 */
  dispose: () => void
  /** 已创建的 store 实例表，key 为 store id。 */
  _s: Map<string, StoreInstance>
  /** 已注册的 store 插件列表。 */
  _p: StorePlugin[]
}

/** 对象配置式 defineStore 的配置。 */
export type DefineStoreOptions = {
  /** 创建初始状态；每个 store 实例只在创建时调用一次。 */
  state?: () => StateTree
  /** 派生状态表，函数接收 Store，可用 getPath 精确追踪依赖。 */
  getters?: Record<string, (store: StoreInstance) => unknown>
  /** 动作方法表，调用时会绑定 store 作为 this。 */
  actions?: Record<string, (...args: any[]) => unknown>
}

/** URL query 写入历史记录的方式。 */
export type QueryHistoryMode = 'replace' | 'push'

/** URL query 写入限流策略。 */
export type QueryRateLimitMode = 'debounce' | 'throttle'

/** URL query 写入限流配置。 */
export type QueryRateLimit = {
  /** debounce 表示等待静默窗口，throttle 表示按固定间隔最多写入一次。 */
  mode: QueryRateLimitMode
  /** 限流等待时间，单位毫秒。 */
  wait: number
}

/** URL query 字符串与 store 状态值之间的双向解析器。 */
export type QueryParser<T> = {
  /** 从 URLSearchParams 的字符串值解析为状态值。 */
  parse: (value: string | null) => T | null | undefined
  /** 将状态值序列化为 URL query 字符串；null/undefined 表示删除该参数。 */
  serialize: (value: T) => string | null | undefined
  /** 自定义相等判断，用于避免重复写入 URL 或状态。 */
  equals?: (left: T, right: T) => boolean
  /** query 缺失或解析失败时使用的默认值。 */
  defaultValue?: T
  /** 基于当前 parser 派生带默认值的新 parser。 */
  withDefault: (defaultValue: T) => QueryParser<T>
}

/** 单个 query 字段的同步配置。 */
export type QueryFieldConfig<T = unknown> =
  | QueryParser<T>
  | {
      /** 映射到 store.$state 的字段路径，默认使用 query key。 */
      path?: StorePath
      /** 该字段使用的 query parser，默认 parseAsString。 */
      parser?: QueryParser<T>
      /** 该字段的历史记录写入方式。 */
      history?: QueryHistoryMode
      /** 值等于 parser.defaultValue 时是否仍写入 URL。 */
      writeDefault?: boolean
      /** 该字段的 URL 写入限流配置。 */
      limitUrlUpdates?: QueryRateLimit
    }

/** 单个 store 的 query 同步字段表，key 即 URL query 参数名。 */
export type QuerySyncStoreConfig = Record<string, QueryFieldConfig<any>>

/** createQuerySync 的插件配置。 */
export type QuerySyncPluginOptions = {
  /** 默认历史记录写入方式，未指定时使用 replace。 */
  history?: QueryHistoryMode
  /** 全局默认是否写入默认值。 */
  writeDefaults?: boolean
  /** 全局默认 URL 写入限流配置。 */
  limitUrlUpdates?: QueryRateLimit
  /** 按 store id 配置需要同步到 URL query 的字段。 */
  stores: Record<string, QuerySyncStoreConfig>
}

/** Rue ref-like 值，用于统一函数式 store 中的 ref/computed 读取。 */
type RefLike<T = unknown> = { value: T }

/** Store 状态字段访问器，读写会代理到真实响应式来源。 */
type StateAccessor = {
  get: () => unknown
  set?: (value: unknown) => void
}

/** 函数式 store 的工厂函数。 */
type SetupStoreFactory = () => Record<string, unknown>

/** 兼容 Rue computed/ref 的只读读取结构。 */
type GetterLike<T = unknown> = { get?: () => T; value?: T }

/** watchEffect 返回的可释放副作用句柄。 */
type EffectHandle = { dispose: () => void }

/** 规范化后的多段 store 路径。 */
type NormalizedStorePath = Array<string | number>

/** 创建 query parser 时的原始定义。 */
type QueryParserDefinition<T> = {
  parse: (value: string | null) => T | null | undefined
  serialize: (value: T) => string | null | undefined
  equals?: (left: T, right: T) => boolean
  defaultValue?: T
}

/** 单个 query 字段的限流调度状态。 */
type QueryFieldScheduleState = {
  dueAt: number | null
  lastFlushedAt: number
}

/** 编译后的 query 字段配置，填充了默认值并规范化 path。 */
type CompiledQueryField = {
  queryKey: string
  path: NormalizedStorePath
  parser: QueryParser<any>
  history: QueryHistoryMode
  writeDefault: boolean
  limitUrlUpdates: QueryRateLimit | null
}

/** 单个 store 与 URL query 同步插件之间的运行时绑定。 */
type QueryStoreBinding = {
  store: StoreInstance
  fields: CompiledQueryField[]
  unsubscribe: (() => void) | null
  lastSerializedByKey: Map<string, string | null>
  observedSerializedByKey: Map<string, string | null>
  scheduleStateByKey: Map<string, QueryFieldScheduleState>
  skipNextSubscription: boolean
}

// 按 Rue 渲染容器隔离 store root，保证多应用挂载时不会互相串用状态。
const storeOwners = new WeakMap<StoreRoot, ReturnType<typeof createOwner>>()
const __storeRootByContainer = new WeakMap<HTMLElement, StoreRoot>()
// 进程级活动 root：没有当前容器时，useStoreRoot 会回退到最近 install 的 root。
let __activeStoreRoot: StoreRoot | null = null

const isObjectLike = (value: unknown): value is Record<PropertyKey, unknown> =>
  (typeof value === 'object' || typeof value === 'function') && value != null

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  // 只把普通对象作为可递归 patch/clone 的状态结构；类实例等对象按引用保留。
  if (!isObjectLike(value) || Array.isArray(value)) {
    return false
  }
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

const isRefLike = (value: unknown): value is RefLike => isObjectLike(value) && 'value' in value

const readReactiveValue = <T>(value: GetterLike<T>): T =>
  // Rue computed 暴露 get()，ref 暴露 value；统一入口方便 storeToRefs/setup store 复用。
  typeof value.get === 'function' ? value.get() : (value.value as T)

const createQueryParser = <T>(definition: QueryParserDefinition<T>): QueryParser<T> => {
  // parser 是不可变风格的轻量对象；withDefault 会派生新 parser，避免修改原定义。
  const parser = {
    parse: definition.parse,
    serialize: definition.serialize,
    equals: definition.equals,
    defaultValue: definition.defaultValue,
    withDefault(defaultValue: T) {
      return createQueryParser({
        ...definition,
        defaultValue,
      })
    },
  } satisfies QueryParser<T>

  return parser
}

/** 创建自定义 URL query parser。 */
export const createParser = createQueryParser

/** 创建 debounce 风格的 URL query 写入限流配置。 */
export const debounce = (wait: number): QueryRateLimit => ({
  mode: 'debounce',
  wait,
})

/** 创建 throttle 风格的 URL query 写入限流配置。 */
export const throttle = (wait: number): QueryRateLimit => ({
  mode: 'throttle',
  wait,
})

/** 字符串 query parser，保留 URL 中的原始字符串值。 */
export const parseAsString = createQueryParser<string>({
  parse: value => (value == null ? null : String(value)),
  serialize: value => String(value),
})

/** 整数 query parser，只接受完整的十进制整数字符串。 */
export const parseAsInteger = createQueryParser<number>({
  parse: value => {
    if (value == null || !/^-?\d+$/.test(value)) {
      return null
    }
    const next = Number.parseInt(value, 10)
    return Number.isFinite(next) ? next : null
  },
  serialize: value => (Number.isFinite(value) ? String(Math.trunc(value)) : null),
})

/** 浮点数 query parser，接受能被 Number 正常解析的有限数字。 */
export const parseAsFloat = createQueryParser<number>({
  parse: value => {
    if (value == null || value.trim() === '') {
      return null
    }
    const next = Number(value)
    return Number.isFinite(next) ? next : null
  },
  serialize: value => (Number.isFinite(value) ? String(value) : null),
})

/** 布尔 query parser，支持 1/0、true/false、yes/no。 */
export const parseAsBoolean = createQueryParser<boolean>({
  parse: value => {
    if (value == null) {
      return null
    }
    const normalized = value.trim().toLowerCase()
    if (normalized === '1' || normalized === 'true' || normalized === 'yes') {
      return true
    }
    if (normalized === '0' || normalized === 'false' || normalized === 'no') {
      return false
    }
    return null
  },
  serialize: value => (value ? '1' : '0'),
  equals: (left, right) => left === right,
})

/** JSON query parser，适合数组或对象等结构化 query 值。 */
export const parseAsJson = <T>() =>
  createQueryParser<T>({
    parse: value => {
      if (value == null) {
        return null
      }

      try {
        return JSON.parse(value) as T
      } catch {
        return null
      }
    },
    serialize: value => {
      try {
        return JSON.stringify(value)
      } catch {
        return null
      }
    },
  })

const getPropertyDescriptor = (value: object, key: PropertyKey): PropertyDescriptor | undefined => {
  // setup store 需要识别 ref.value 是否可写；descriptor 可能定义在原型链上。
  let current: object | null = value
  while (current) {
    const descriptor = Object.getOwnPropertyDescriptor(current, key)
    if (descriptor) {
      return descriptor
    }
    current = Object.getPrototypeOf(current)
  }
  return undefined
}

const isWritableRefLike = (value: RefLike): boolean => {
  const descriptor = getPropertyDescriptor(value as object, 'value')
  // computed 通常只有 getter，ref 则有 setter 或 writable descriptor。
  return !!descriptor && (typeof descriptor.set === 'function' || descriptor.writable === true)
}

const cloneValue = <T>(value: T, seen = new WeakMap<object, unknown>()): T => {
  // 深拷贝用于初始状态快照、订阅快照和 patch 隔离，避免外部引用反向修改 store。
  if (!isObjectLike(value)) {
    return value
  }

  if (seen.has(value as object)) {
    // 支持循环引用，保证 clone 过程不会无限递归。
    return seen.get(value as object) as T
  }

  if (Array.isArray(value)) {
    const next: unknown[] = []
    seen.set(value as object, next)
    value.forEach(item => {
      next.push(cloneValue(item, seen))
    })
    return next as T
  }

  if (value instanceof Date) {
    // Date 是常见状态值，复制时间戳即可保留语义。
    return new Date(value.getTime()) as T
  }

  if (!isPlainObject(value)) {
    // 非普通对象按引用保留，避免破坏类实例、Map、Set 等对象的行为。
    return value
  }

  const next = Object.create(Object.getPrototypeOf(value)) as Record<string, unknown>
  seen.set(value as object, next)
  Object.keys(value).forEach(key => {
    next[key] = cloneValue((value as Record<string, unknown>)[key], seen)
  })
  return next as T
}

const readPath = (value: any, keys: Array<string | number>): any =>
  keys.reduce((current, key) => current?.[key], value)
const writePath = (
  source: SignalHandle<any>,
  keys: Array<string | number>,
  value: unknown,
): void => {
  if (!keys.length) {
    source.set(value)
    return
  }
  const root = cloneValue(source.peek()) ?? (typeof keys[0] === 'number' ? [] : {})
  let current = root
  for (let index = 0; index < keys.length - 1; index++) {
    const key = keys[index]!
    current[key] ??= typeof keys[index + 1] === 'number' ? [] : {}
    current = current[key]
  }
  current[keys[keys.length - 1]!] = value
  source.set(root)
}

const normalizePath = (path: StorePath): Array<string | number> =>
  // 单个 key 统一包装成数组，后续读写逻辑只处理多段路径。
  Array.isArray(path) ? path.slice() : [path]

const normalizeQueryRateLimit = (value?: QueryRateLimit | null) => {
  // 非正数等待时间等同于不启用限流，避免创建无意义的 timer。
  if (!value) {
    return null
  }

  const wait = Number.isFinite(value.wait) ? Math.max(0, Math.trunc(value.wait)) : 0
  if (wait <= 0) {
    return null
  }

  return {
    mode: value.mode,
    wait,
  } satisfies QueryRateLimit
}

const isQueryParser = (value: unknown): value is QueryParser<any> =>
  isObjectLike(value) &&
  typeof (value as QueryParser<any>).parse === 'function' &&
  typeof (value as QueryParser<any>).serialize === 'function' &&
  typeof (value as QueryParser<any>).withDefault === 'function'

const safelySerializeQueryValue = (parser: QueryParser<any>, value: unknown) => {
  // parser 由用户提供，序列化失败时按无法写入处理，避免打断状态更新。
  try {
    const serialized = parser.serialize(value)
    return serialized == null ? null : String(serialized)
  } catch {
    return null
  }
}

const areQueryValuesEqual = (parser: QueryParser<any>, left: unknown, right: unknown): boolean => {
  // 优先使用严格相等，其次使用 parser 自带 equals，最后退化为序列化结果比较。
  if (left === right) {
    return true
  }

  if (typeof parser.equals === 'function') {
    try {
      return parser.equals(left, right)
    } catch {
      return false
    }
  }

  return safelySerializeQueryValue(parser, left) === safelySerializeQueryValue(parser, right)
}

const getQueryDefaultValue = (parser: QueryParser<any>) => {
  if (parser.defaultValue === undefined) {
    return undefined
  }
  // 默认值会写进 store 状态，因此返回副本，避免共享引用被后续修改。
  return cloneValue(parser.defaultValue)
}

const readQueryValue = (parser: QueryParser<any>, rawValue: string | null) => {
  // query 缺失、解析失败或 parser 返回空值时，统一尝试使用 parser 默认值。
  if (rawValue == null) {
    const fallback = getQueryDefaultValue(parser)
    return fallback === undefined ? { hasValue: false } : { hasValue: true, value: fallback }
  }

  try {
    const parsed = parser.parse(rawValue)
    if (parsed !== undefined && parsed !== null) {
      return { hasValue: true, value: parsed }
    }
  } catch {}

  const fallback = getQueryDefaultValue(parser)
  return fallback === undefined ? { hasValue: false } : { hasValue: true, value: fallback }
}

const resolveQueryFieldSerializedValue = (field: CompiledQueryField, value: unknown) => {
  // 默认值不写入 URL 是常见 query 状态约定，除非字段显式开启 writeDefault。
  if (!field.writeDefault && field.parser.defaultValue !== undefined) {
    if (areQueryValuesEqual(field.parser, value, field.parser.defaultValue)) {
      return null
    }
  }

  return safelySerializeQueryValue(field.parser, value)
}

const compileQuerySyncFields = (
  config: QuerySyncStoreConfig,
  defaults: QuerySyncPluginOptions,
): CompiledQueryField[] => {
  // 把简写 parser 和完整字段配置统一编译成运行时结构，后续同步逻辑无需分支。
  return Object.keys(config).map(queryKey => {
    const rawField = config[queryKey]
    const normalized = isQueryParser(rawField) ? { parser: rawField } : rawField
    const parser = normalized.parser || parseAsString

    return {
      queryKey,
      path: normalizePath(normalized.path ?? queryKey),
      parser,
      history: normalized.history || defaults.history || 'replace',
      writeDefault: normalized.writeDefault ?? defaults.writeDefaults ?? false,
      limitUrlUpdates: normalizeQueryRateLimit(
        normalized.limitUrlUpdates ?? defaults.limitUrlUpdates ?? null,
      ),
    }
  })
}

const computeQueryFieldDueAt = (
  field: CompiledQueryField,
  scheduleState: QueryFieldScheduleState,
  now: number,
) => {
  // debounce 每次推迟到最新变更后；throttle 在窗口内复用下一次允许写入的时间点。
  const rateLimit = field.limitUrlUpdates
  if (!rateLimit) {
    return now
  }

  if (rateLimit.mode === 'debounce') {
    return now + rateLimit.wait
  }

  if (scheduleState.lastFlushedAt <= 0 || now - scheduleState.lastFlushedAt >= rateLimit.wait) {
    return now
  }

  return scheduleState.lastFlushedAt + rateLimit.wait
}

/** Query 同步插件：
 * - stores：按 store id 声明需要映射到 URL query 的字段集合。
 * - query key：配置对象的键名即最终写入 URL 的参数名。
 * - path：默认与 query key 同名；若 store 字段名不同，可显式指定 path。
 * - parser：借鉴 nuqs 的 parser 思路，负责字符串与状态值之间的双向转换。
 * - history：默认 replace；需要保留后退栈时可切到 push。
 * - limitUrlUpdates：借鉴 nuqs，支持 debounce/throttle 控制 URL 写入频率，不影响本地 state 的即时更新。
 */
export const createQuerySync = (options: QuerySyncPluginOptions): StorePlugin => {
  // 插件实例内维护所有已绑定 store，多个 store 可以共同参与同一份 URL query。
  const activeBindings = new Map<StoreInstance, QueryStoreBinding>()
  // globalThis 可能运行在 SSR/测试环境，所有浏览器能力都要延迟检测。
  const browser = globalThis as typeof globalThis & {
    addEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void
    removeEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void
    location?: Location
    history?: History
  }
  let listening = false
  let flushQueued = false
  let flushTimer: ReturnType<typeof setTimeout> | null = null
  let flushTimerDueAt: number | null = null

  const canUseBrowser = () =>
    // SSR 环境没有 location/history 或事件监听能力时，插件保持静默。
    !!browser.location &&
    !!browser.history &&
    typeof URLSearchParams !== 'undefined' &&
    typeof browser.addEventListener === 'function' &&
    typeof browser.removeEventListener === 'function'

  const readCurrentUrl = () => {
    // 每次读 URL 都重新创建 URL 对象，避免复用旧对象造成 search/hash 不一致。
    if (!browser.location) {
      return null
    }
    return new URL(browser.location.href)
  }

  const buildRelativeUrl = (url: URL) => `${url.pathname}${url.search}${url.hash}`

  const clearScheduledFlush = () => {
    // 统一清理 timer 和记录的 dueAt，防止 dispose/popstate 后还有旧任务写 URL。
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
    flushTimerDueAt = null
  }

  const queueImmediateFlush = () => {
    // 同一 tick 内的多次 store 变更合并成一次 URL 写入。
    if (flushQueued) {
      return
    }
    flushQueued = true
    queueMicrotask(() => {
      flushQueued = false
      flushBindingsToUrl()
    })
  }

  const resetPendingWrites = (binding: QueryStoreBinding) => {
    // popstate 或 dispose 时丢弃尚未 flush 的本地写入计划。
    binding.scheduleStateByKey.forEach(scheduleState => {
      scheduleState.dueAt = null
    })
  }

  const applyLocationToStore = (binding: QueryStoreBinding) => {
    // URL -> store：读取当前 query，把可解析字段批量 patch 到 store 状态。
    const currentUrl = readCurrentUrl()
    if (!currentUrl) {
      return
    }

    const params = new URLSearchParams(currentUrl.search)
    const updates: Array<{ path: NormalizedStorePath; value: unknown }> = []

    binding.fields.forEach(field => {
      const next = readQueryValue(field.parser, params.get(field.queryKey))
      if (!next.hasValue) {
        // 没有 query 值且 parser 没有默认值时，不主动修改 store。
        return
      }

      const currentValue = binding.store.getPath(field.path)
      if (areQueryValuesEqual(field.parser, currentValue, next.value)) {
        // 状态已与 URL 一致，只刷新序列化记录，避免后续误判为脏字段。
        binding.lastSerializedByKey.set(
          field.queryKey,
          resolveQueryFieldSerializedValue(field, currentValue),
        )
        return
      }

      updates.push({
        path: field.path,
        value: cloneValue(next.value),
      })
      binding.lastSerializedByKey.set(
        field.queryKey,
        resolveQueryFieldSerializedValue(field, next.value),
      )
    })

    if (updates.length === 0) {
      // 没有需要写入 state 的字段时，仍同步观测值，建立 URL 和 store 的基线。
      binding.fields.forEach(field => {
        const currentValue = binding.store.getPath(field.path)
        const serialized = resolveQueryFieldSerializedValue(field, currentValue)
        binding.lastSerializedByKey.set(field.queryKey, serialized)
        binding.observedSerializedByKey.set(field.queryKey, serialized)
      })
      return
    }

    if (binding.unsubscribe) {
      // 由 URL 回写 store 时会触发订阅；标记后让订阅跳过反向写 URL。
      binding.skipNextSubscription = true
    }
    batch(() => {
      updates.forEach(update => binding.store.set(update.path, update.value))
    })

    binding.fields.forEach(field => {
      // patch 完成后以真实 state 为准刷新提交值和观测值。
      const currentValue = binding.store.getPath(field.path)
      const serialized = resolveQueryFieldSerializedValue(field, currentValue)
      binding.lastSerializedByKey.set(field.queryKey, serialized)
      binding.observedSerializedByKey.set(field.queryKey, serialized)
      binding.scheduleStateByKey.get(field.queryKey)!.dueAt = null
    })
  }

  const getNextFlushDueAt = () => {
    // 查找所有绑定中最早需要写入 URL 的字段，用于安排单个共享 timer。
    let nextDueAt: number | null = null

    activeBindings.forEach(binding => {
      binding.fields.forEach(field => {
        const scheduleState = binding.scheduleStateByKey.get(field.queryKey)
        if (!scheduleState || scheduleState.dueAt == null) {
          return
        }

        const nextValue = binding.store.getPath(field.path)
        const nextSerialized = resolveQueryFieldSerializedValue(field, nextValue)
        const committed = binding.lastSerializedByKey.get(field.queryKey) ?? null
        if (nextSerialized === committed) {
          // 字段又变回已提交值时，取消该字段的待写入计划。
          scheduleState.dueAt = null
          return
        }

        nextDueAt =
          nextDueAt == null ? scheduleState.dueAt : Math.min(nextDueAt, scheduleState.dueAt)
      })
    })

    return nextDueAt
  }

  const scheduleFlush = () => {
    // 根据限流结果决定立即微任务写入，还是用 timer 延后写入。
    if (!canUseBrowser()) {
      return
    }

    const nextDueAt = getNextFlushDueAt()
    if (nextDueAt == null) {
      clearScheduledFlush()
      return
    }

    const now = Date.now()
    if (nextDueAt <= now) {
      clearScheduledFlush()
      queueImmediateFlush()
      return
    }

    if (flushTimer && flushTimerDueAt === nextDueAt) {
      return
    }

    clearScheduledFlush()
    flushTimerDueAt = nextDueAt
    flushTimer = setTimeout(
      () => {
        flushTimer = null
        flushTimerDueAt = null
        flushBindingsToUrl()
      },
      Math.max(0, nextDueAt - now),
    )
  }

  const flushBindingsToUrl = () => {
    // store -> URL：收集所有到期的脏字段，一次性写回当前地址栏。
    clearScheduledFlush()
    const currentUrl = readCurrentUrl()
    if (!currentUrl || !browser.history) {
      return
    }

    const params = new URLSearchParams(currentUrl.search)
    let shouldPush = false
    let changed = false
    const now = Date.now()

    activeBindings.forEach(binding => {
      binding.fields.forEach(field => {
        const scheduleState = binding.scheduleStateByKey.get(field.queryKey)
        if (!scheduleState) {
          return
        }

        const nextValue = binding.store.getPath(field.path)
        const nextSerialized = resolveQueryFieldSerializedValue(field, nextValue)
        const previousSerialized = binding.lastSerializedByKey.get(field.queryKey) ?? null
        if (nextSerialized === previousSerialized) {
          scheduleState.dueAt = null
          binding.observedSerializedByKey.set(field.queryKey, nextSerialized)
          return
        }

        if (scheduleState.dueAt != null && scheduleState.dueAt > now) {
          // 字段仍在 debounce/throttle 等待窗口内，留给下一轮 flush。
          return
        }

        const currentSerialized = params.get(field.queryKey)

        if (nextSerialized === null) {
          if (currentSerialized !== null) {
            params.delete(field.queryKey)
            changed = true
          }
        } else if (currentSerialized !== nextSerialized) {
          params.set(field.queryKey, nextSerialized)
          changed = true
        }

        if (previousSerialized !== nextSerialized && field.history === 'push') {
          // 只要本轮任一字段要求 push，就保留浏览器后退栈。
          shouldPush = true
        }

        binding.lastSerializedByKey.set(field.queryKey, nextSerialized)
        binding.observedSerializedByKey.set(field.queryKey, nextSerialized)
        scheduleState.dueAt = null
        scheduleState.lastFlushedAt = now
      })
    })

    if (changed) {
      currentUrl.search = params.toString() ? `?${params.toString()}` : ''
      const nextHref = buildRelativeUrl(currentUrl)

      // replace 是默认策略，避免高频状态变更污染历史栈；push 由字段显式要求。
      if (shouldPush) {
        browser.history.pushState(browser.history.state, '', nextHref)
      } else {
        browser.history.replaceState(browser.history.state, '', nextHref)
      }
    }

    scheduleFlush()

    if (!changed) {
      return
    }
  }

  const handlePopState = () => {
    // 浏览器前进/后退时，以 URL 为准回灌所有绑定 store。
    clearScheduledFlush()
    activeBindings.forEach(binding => {
      resetPendingWrites(binding)
      applyLocationToStore(binding)
    })
  }

  const ensureListener = () => {
    // 同时监听浏览器回退和 Router 的程序化 History API 导航。
    if (!canUseBrowser() || listening) {
      return
    }
    browser.addEventListener?.('popstate', handlePopState)
    browser.addEventListener?.('rue:history-change', handlePopState)
    listening = true
  }

  const cleanupListener = () => {
    // 所有绑定都释放后移除全局监听和 timer。
    if (!listening || activeBindings.size > 0) {
      return
    }
    browser.removeEventListener?.('popstate', handlePopState)
    browser.removeEventListener?.('rue:history-change', handlePopState)
    listening = false
    clearScheduledFlush()
  }

  return ({ store, id }) => {
    // 插件按 store id 选择配置；未配置的 store 不做任何扩展。
    const config = options.stores[id]
    if (!config) {
      return undefined
    }

    const fields = compileQuerySyncFields(config, options)
    if (fields.length === 0) {
      return undefined
    }

    const binding: QueryStoreBinding = {
      store,
      fields,
      unsubscribe: null,
      lastSerializedByKey: new Map(),
      observedSerializedByKey: new Map(),
      scheduleStateByKey: new Map(),
      skipNextSubscription: false,
    }

    fields.forEach(field => {
      // 每个 query key 独立维护限流窗口和上次 flush 时间。
      binding.scheduleStateByKey.set(field.queryKey, {
        dueAt: null,
        lastFlushedAt: 0,
      })
    })

    activeBindings.set(store, binding)
    ensureListener()

    // 插件安装时先用当前 URL 初始化 store，再建立订阅基线。
    applyLocationToStore(binding)

    fields.forEach(field => {
      const serialized = resolveQueryFieldSerializedValue(field, store.getPath(field.path))
      binding.lastSerializedByKey.set(field.queryKey, serialized)
      binding.observedSerializedByKey.set(field.queryKey, serialized)
    })

    binding.unsubscribe = store.subscribe(() => {
      if (binding.skipNextSubscription) {
        // URL 回写造成的订阅只同步观测值，不再触发 URL 写入。
        binding.skipNextSubscription = false
        binding.fields.forEach(field => {
          const serialized = resolveQueryFieldSerializedValue(field, store.getPath(field.path))
          binding.observedSerializedByKey.set(field.queryKey, serialized)
          binding.scheduleStateByKey.get(field.queryKey)!.dueAt = null
        })
        return
      }

      const now = Date.now()
      let sawDirtyField = false

      binding.fields.forEach(field => {
        // 订阅触发时比较当前序列化值与上次观测值，只调度真正变化的字段。
        const nextSerialized = resolveQueryFieldSerializedValue(field, store.getPath(field.path))
        const observed = binding.observedSerializedByKey.get(field.queryKey) ?? null
        if (observed === nextSerialized) {
          return
        }

        binding.observedSerializedByKey.set(field.queryKey, nextSerialized)

        const committed = binding.lastSerializedByKey.get(field.queryKey) ?? null
        const scheduleState = binding.scheduleStateByKey.get(field.queryKey)!
        if (committed === nextSerialized) {
          scheduleState.dueAt = null
          return
        }

        scheduleState.dueAt = computeQueryFieldDueAt(field, scheduleState, now)
        sawDirtyField = true
      })

      if (!sawDirtyField) {
        return
      }

      scheduleFlush()
    })

    const originalDispose = store.$dispose
    const extension = Object.create(null)
    Object.defineProperty(extension, '$dispose', {
      enumerable: false,
      configurable: true,
      value: () => {
        // query 插件包装 $dispose，先清理自身绑定，再调用 store 原始释放逻辑。
        binding.unsubscribe?.()
        activeBindings.delete(store)
        resetPendingWrites(binding)
        if (activeBindings.size === 0) {
          cleanupListener()
        } else {
          scheduleFlush()
        }
        originalDispose.call(store)
      },
    })

    return extension
  }
}

const applyStorePlugin = (
  root: StoreRoot,
  store: StoreInstance,
  id: string,
  plugin: StorePlugin,
) => {
  // 插件可以返回属性描述符对象；这里按 descriptor 原样混入，保留 getter/setter。
  const extension = plugin({ store, root, id })
  if (!isObjectLike(extension)) {
    return
  }

  Reflect.ownKeys(extension).forEach(key => {
    const descriptor = Object.getOwnPropertyDescriptor(extension, key)
    if (!descriptor) {
      return
    }
    Object.defineProperty(store, key, {
      ...descriptor,
      configurable: true,
    })
  })
}

/** 把 store root 绑定到当前 Rue 渲染容器，并设为活动 root。 */
export const attachStoreRoot = (root: StoreRoot) => {
  const container = getCurrentAppTarget() as HTMLElement | null
  if (container) {
    // 容器绑定让同一页面上的多个 Rue 应用可以拥有独立 store root。
    __storeRootByContainer.set(container, root)
    onOwnerCleanup(() => __storeRootByContainer.delete(container))
  } else __activeStoreRoot = root
}

/** 获取当前组件/容器可用的 store root。 */
export const useStoreRoot = (): StoreRoot => {
  const container = getCurrentAppTarget() as HTMLElement | null
  const root = container ? __storeRootByContainer.get(container) : __activeStoreRoot
  if (!root) {
    // store 必须先通过 createStore().install() 或 attachStoreRoot() 建立 root。
    throw new Error('Store root not installed for current application/container')
  }
  return root
}

/** 创建一个应用级 store root。 */
export const createStore = (): StoreRoot => {
  const owner = createOwner()
  adoptOwner(owner, undefined)
  const stores = new Map<string, StoreInstance>()
  const plugins: StorePlugin[] = []

  const root: StoreRoot = {
    _s: stores,
    _p: plugins,
    install: (_app: unknown, _options: unknown[]) => {
      // install 保持轻量，只负责把 root 放进当前 Rue 容器上下文。
      attachStoreRoot(root)
    },
    use: (plugin: StorePlugin) => {
      if (typeof plugin !== 'function') {
        return root
      }
      plugins.push(plugin)
      // 后注册的插件也要补装到已创建的 store，保持 root.use 的顺序语义。
      Array.from(stores.entries()).forEach(([id, store]) => {
        applyStorePlugin(root, store, id, plugin)
      })
      return root
    },
    dispose: () => {
      // dispose root 时逐个释放 store，订阅和插件包装的清理逻辑会跟随触发。
      Array.from(stores.values()).forEach(store => {
        store.$dispose()
      })
      disposeOwner(owner)
      storeOwners.delete(root)
      if (__activeStoreRoot === root) {
        __activeStoreRoot = null
      }
    },
  }

  storeOwners.set(root, owner)
  return root
}

const createStoreInstance = (
  root: StoreRoot,
  id: string,
  input: DefineStoreOptions | SetupStoreFactory,
): StoreInstance => {
  const store = Object.create(null) as StoreInstance
  const stateAccessors = new Map<string, StateAccessor>()
  const stops = new Set<EffectHandle>()
  const state = signal<StateTree>({})
  const sources = new Map<string, SignalHandle<any>>()
  const owned = new Set<{ dispose(): void }>([state])
  const defineStateProperty = (key: string, accessor: StateAccessor) => {
    stateAccessors.set(key, accessor)
    Object.defineProperty(store, key, {
      enumerable: true,
      configurable: true,
      get: accessor.get,
      set: accessor.set,
    })
  }
  const ensureStateKeys = () => {
    for (const key of stateAccessors.keys()) {
      if (!sources.has(key) && !Object.hasOwn(state.peek(), key)) {
        delete store[key]
        stateAccessors.delete(key)
      }
    }
    Object.keys(state.peek()).forEach(key => {
      if (stateAccessors.has(key)) return
      defineStateProperty(key, {
        get: () => readPath(state.get(), [key]),
        set: value => writePath(state, [key], value),
      })
    })
  }
  const get = (): StateTree => {
    const snapshot = { ...state.get() }
    sources.forEach((source, key) => {
      snapshot[key] = source.get()
    })
    return snapshot
  }
  const pathValues = new Map<string, ReturnType<typeof computed>>()
  const getPath = (path: StorePath): any => {
    const keys = normalizePath(path)
    if (!keys.length) return get()
    const source = sources.get(String(keys[0]))
    const cacheKey = JSON.stringify(keys)
    let value = pathValues.get(cacheKey)
    if (!value) {
      value = runWithOwner(storeOwners.get(root)!, () =>
        computed(() =>
          source ? readPath(source.get(), keys.slice(1)) : readPath(state.get(), keys),
        ),
      )!
      pathValues.set(cacheKey, value)
      owned.add(value)
    }
    return value.get()
  }
  const peekPath = (keys: Array<string | number>): any => {
    if (!keys.length) {
      const snapshot = { ...state.peek() }
      sources.forEach((source, key) => {
        snapshot[key] = source.peek()
      })
      return snapshot
    }
    const source = sources.get(String(keys[0]))
    return source ? readPath(source.peek(), keys.slice(1)) : readPath(state.peek(), keys)
  }
  const set = (path: StorePath, value: unknown) => {
    const keys = normalizePath(path)
    if (!keys.length) {
      batch(() => {
        const next = { ...(value as StateTree) }
        sources.forEach((source, key) => {
          source.set(next[key])
          delete next[key]
        })
        state.set(next)
        ensureStateKeys()
      })
      return
    }
    const source = sources.get(String(keys[0]))
    if (source) writePath(source, keys.slice(1), value)
    else {
      writePath(state, keys, value)
      ensureStateKeys()
    }
  }
  const update = (path: StorePath, updater: (value: any) => unknown) => {
    const keys = normalizePath(path)
    set(keys, updater(peekPath(keys)))
  }
  const mutatePath = (path: StorePath, mutator: (value: any) => void) => {
    const keys = normalizePath(path)
    const draft = cloneValue(peekPath(keys))
    mutator(draft)
    set(keys, draft)
    ensureStateKeys()
  }

  Object.defineProperties(store, {
    get: { value: get },
    getPath: { value: getPath },
    set: { value: set },
    update: { value: update },
    mutatePath: { value: mutatePath },
  })

  if (typeof input === 'function') {
    // 函数式 store：函数返回的 method 作为 action，ref-like 值作为 state/getter，其余值作为可写 state。
    const setupStore = input()
    Object.keys(setupStore).forEach(key => {
      const value = setupStore[key]
      if (typeof value === 'function') {
        // action 调用时绑定 this 到 store，保持两种 defineStore 形式的调用体验一致。
        Object.defineProperty(store, key, {
          enumerable: true,
          configurable: true,
          value: (...args: any[]) => value.apply(store, args),
        })
        return
      }

      if (isRefLike(value)) {
        const writable = isWritableRefLike(value)
        if (typeof (value as SignalHandle<unknown>).dispose === 'function')
          owned.add(value as SignalHandle<unknown>)
        const descriptor: PropertyDescriptor = {
          enumerable: true,
          configurable: true,
          get: () => readReactiveValue(value),
        }
        if (writable) {
          sources.set(key, value as SignalHandle<unknown>)
          // 可写 Signal/ref 进入状态；computed 只作为 getter。
          descriptor.set = nextValue => {
            value.value = nextValue
          }
          stateAccessors.set(key, {
            get: () => readReactiveValue(value),
            set: nextValue => {
              value.value = nextValue
            },
          })
        }
        Object.defineProperty(store, key, descriptor)
        return
      }

      writePath(state, [key], value)
      ensureStateKeys()
    })
  } else {
    // 对象配置式 store：state 先转为 Signal，再依次挂载 getter 和 action。
    const options = input
    const sourceState = (options.state ? options.state() : {}) as StateTree
    state.set(sourceState)
    ensureStateKeys()

    Object.keys(options.getters || {}).forEach(key => {
      const getter = options.getters?.[key]
      if (!getter) {
        return
      }
      // getter 用 computed 包装，保持 Rue 响应式依赖追踪与缓存语义。
      const value = computed(() => getter.call(store, store))
      owned.add(value as unknown as EffectHandle)
      Object.defineProperty(store, key, {
        enumerable: true,
        configurable: true,
        get: () => readReactiveValue(value),
      })
    })

    Object.keys(options.actions || {}).forEach(key => {
      const action = options.actions?.[key]
      if (!action) {
        return
      }
      // action 与函数式 store 一致，调用时以 store 作为 this。
      Object.defineProperty(store, key, {
        enumerable: true,
        configurable: true,
        value: (...args: any[]) => action.apply(store, args),
      })
    })
  }

  const initialState = cloneValue(get())
  const patch = (value: Partial<StateTree> | ((state: StateTree) => void)) =>
    batch(() => {
      if (typeof value === 'function') {
        mutatePath([], value as (state: StateTree) => void)
      } else if (isPlainObject(value)) {
        const apply = (object: Record<string, unknown>, prefix: Array<string | number> = []) => {
          Object.keys(object).forEach(key => {
            const path = [...prefix, key]
            if (isPlainObject(object[key]) && isPlainObject(peekPath(path)))
              apply(object[key] as Record<string, unknown>, path)
            else set(path, cloneValue(object[key]))
          })
        }
        apply(value)
      }
    })
  const subscribe = (callback: StoreSubscription, options?: { immediate?: boolean }) => {
    let initialized = false
    const stop = watchEffect(() => {
      const snapshot = cloneValue(get())
      if (initialized || options?.immediate) callback({ storeId: id }, snapshot)
      initialized = true
    }) as EffectHandle
    stops.add(stop)
    return () => {
      stops.delete(stop)
      stop.dispose()
    }
  }
  Object.defineProperties(store, {
    $id: { enumerable: true, get: () => id },
    $state: { get, set: patch },
    $patch: { value: patch },
    $set: {
      value: (path: StorePath, value: unknown) =>
        typeof value === 'function' ? update(path, value as (v: any) => unknown) : set(path, value),
    },
    $reset: {
      value: () =>
        batch(() => {
          if (typeof input !== 'function') {
            state.set(cloneValue(initialState))
            for (const key of stateAccessors.keys()) {
              if (!(key in initialState)) {
                delete store[key]
                stateAccessors.delete(key)
              }
            }
            ensureStateKeys()
          } else {
            Object.keys(initialState).forEach(key => set([key], cloneValue(initialState[key])))
          }
        }),
    },
    subscribe: { value: subscribe },
    $subscribe: { value: subscribe },
    $dispose: {
      configurable: true,
      value: () => {
        stops.forEach(stop => stop.dispose())
        stops.clear()
        owned.forEach(handle => handle.dispose())
        owned.clear()
        root._s.delete(id)
      },
    },
  })

  root._p.forEach(plugin => {
    // store 创建完成后安装 root 上已有的全部插件。
    applyStorePlugin(root, store, id, plugin)
  })

  return store
}

/** 定义函数式 store，返回可在组件或外部调用的 useStore 函数。 */
export function defineStore<TStore extends StoreInstance = StoreInstance>(
  id: string,
  setup: SetupStoreFactory,
): (root?: StoreRoot) => TStore

/** 定义对象配置式 store，返回可在组件或外部调用的 useStore 函数。 */
export function defineStore<TStore extends StoreInstance = StoreInstance>(
  id: string,
  options: DefineStoreOptions,
): (root?: StoreRoot) => TStore

/**
 * 定义一个 store。
 *
 * 返回的 useStore 会按 root 缓存实例：同一个 root 和 id 只创建一次 store；
 * 未显式传入 root 时，会从当前 Rue 容器或活动 root 中解析。
 */
export function defineStore<TStore extends StoreInstance = StoreInstance>(
  id: string,
  input: DefineStoreOptions | SetupStoreFactory,
) {
  const useDefinedStore = (root?: StoreRoot): TStore => {
    const targetRoot = root || useStoreRoot()
    const existing = targetRoot._s.get(id)
    if (existing) {
      // 同一个 root 下的 store 是单例，重复调用 useStore 复用已有实例。
      return existing as TStore
    }

    const owner = storeOwners.get(targetRoot)
    if (owner === undefined) throw new Error('Store root has been disposed')
    const store = runWithOwner(owner, () => createStoreInstance(targetRoot, id, input))!
    targetRoot._s.set(id, store)
    return store as TStore
  }

  Object.defineProperty(useDefinedStore, '$id', {
    enumerable: false,
    configurable: true,
    // 暴露给调试/插件场景识别 useStore 对应的 store id。
    value: id,
  })

  return useDefinedStore
}

/** 将 store 上的 state/getter 转成 ref-like 对象，方便解构后保持响应式读取。 */
export const storeToRefs = <TStore extends StoreInstance>(store: TStore) => {
  const refs = Object.create(null) as Record<string, RefLike>
  Object.keys(store).forEach(key => {
    if (key.startsWith('$')) {
      // 内置方法和元属性不参与转换。
      return
    }

    const descriptor = Object.getOwnPropertyDescriptor(store, key)
    if (!descriptor) {
      return
    }

    if ('value' in descriptor && typeof descriptor.value === 'function') {
      // action 是普通函数值，storeToRefs 只返回状态/getter。
      return
    }

    const refValue = Object.create(null) as RefLike
    Object.defineProperty(refValue, 'value', {
      enumerable: true,
      configurable: true,
      get: () => store[key],
      set:
        typeof descriptor.set === 'function'
          ? nextValue => {
              // 只有原 store 属性可写时，生成的 ref 才允许反向写回。
              ;(store as Record<string, unknown>)[key] = nextValue
            }
          : undefined,
    })
    refs[key] = refValue
  })
  return refs as {
    [K in keyof TStore as K extends `$${string}`
      ? never
      : TStore[K] extends (...args: any[]) => any
        ? never
        : K]: RefLike<TStore[K]>
  }
}
