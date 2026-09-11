import type { BlockFactory } from '@rue-js/rue/internal/block'
import { _$compiledComponent } from '@rue-js/rue/internal/component'
import { createContext, ref, useRef, useContext, type FC } from '@rue-js/rue'
import { useSetup } from '@rue-js/rue/internal/reactive'
import { getCurrentAppTarget, provideContext } from '@rue-js/rue/internal/app'

type Awaitable<T> = T | Promise<T>

/** 语言标识，例如 `en`、`zh-CN`、`ja-JP`。 */
export type Locale = string

/** 兜底语言配置，`false` 表示禁用兜底，数组表示按顺序查找多个兜底语言。 */
export type FallbackLocale = Locale | Locale[] | false

/** 命名插值参数，用于替换消息里的 `{name}` 这类占位符。 */
export type NamedInterpolationValues = Record<string, unknown>

/** 列表插值参数，用于替换消息里的 `{0}`、`{1}` 这类占位符。 */
export type ListInterpolationValues = readonly unknown[]

/** 插值参数集合，支持命名对象或列表数组两种形态。 */
export type InterpolationValues = NamedInterpolationValues | ListInterpolationValues

/** 函数式消息的上下文，提供当前语言、原始消息和插值读取能力。 */
export type MessageContext = {
  /** 当前命中的消息语言，可能是请求语言，也可能是 fallback 语言。 */
  locale: Locale
  /** 调用 `_()` 时传入的原始消息 key。 */
  message: string
  /** 调用 `_()` 时传入的原始插值参数。 */
  values?: InterpolationValues
  /** 按名称读取命名插值参数。 */
  named: (name: string) => unknown
  /** 按下标读取列表插值参数。 */
  list: (index: number) => unknown
}

/** 函数式消息，适合根据插值参数或 locale 动态生成文案。 */
export type MessageFunction = (context: MessageContext) => unknown

/** 消息允许的基础值类型。 */
export type LocaleMessagePrimitive = string | number | boolean | null | undefined

/** 单条消息值，支持基础值或函数式消息。 */
export type LocaleMessageValue = LocaleMessagePrimitive | MessageFunction

/** 单个 locale 下的消息字典，key 通常是源文案或业务自定义 key。 */
export type LocaleMessageDictionary = Record<string, LocaleMessageValue>

/** 多语言消息表，按 locale 分组。 */
export type LocaleMessages = Record<Locale, LocaleMessageDictionary>

/** 单个 locale 下的日期/时间格式预设表。 */
export type DateTimeFormatSchema = Record<string, Intl.DateTimeFormatOptions>

/** 单个 locale 下的数字格式预设表。 */
export type NumberFormatSchema = Record<string, Intl.NumberFormatOptions>

/** 多语言日期/时间格式表，按 locale 分组。 */
export type DateTimeFormats = Record<Locale, DateTimeFormatSchema>

/** 多语言数字格式表，按 locale 分组。 */
export type NumberFormats = Record<Locale, NumberFormatSchema>

/** 消息缺失时的回调；返回字符串会作为自定义兜底文案。 */
export type MissingHandler = (locale: Locale, message: string) => string | void

/** 懒加载消息结果，兼容直接返回字典或动态 import 的 default 导出形态。 */
export type LocaleMessageLoaderResult =
  | LocaleMessageDictionary
  | { default: LocaleMessageDictionary }

/** 指定 locale 的消息懒加载函数。 */
export type LocaleMessageLoader = (locale: Locale) => Awaitable<LocaleMessageLoaderResult>

/** 消息加载器配置：可以是通用加载函数，也可以是按 locale 注册的加载函数表。 */
export type LocaleMessageLoaders =
  | LocaleMessageLoader
  | Partial<Record<string, LocaleMessageLoader>>

/** 加载 locale 消息时的控制选项。 */
export type LocaleMessageLoadOptions = {
  /** 是否忽略缓存并强制重新调用 loader。 */
  force?: boolean
  /** 是否与已有消息合并；设为 false 时会整包替换该 locale 的消息。 */
  merge?: boolean
}

/** 可写的 Rue ref-like 值信号。 */
export type WritableValueSignal<T> = { value: T }

/** 只读的 Rue ref-like 值信号。 */
export type ReadonlyValueSignal<T> = { readonly value: T }

/** 创建 composer 或 i18n 实例时的基础配置。 */
export type ComposerOptions = {
  /** 当前活动语言，未传入时默认为 `en`。 */
  locale?: Locale
  /** 消息和命名格式的兜底语言配置，未传入时默认禁用兜底。 */
  fallbackLocale?: FallbackLocale
  /** 初始消息表。 */
  messages?: LocaleMessages
  /** 初始日期/时间格式预设表。 */
  datetimeFormats?: DateTimeFormats
  /** 初始数字格式预设表。 */
  numberFormats?: NumberFormats
  /** 消息懒加载器，用于按需加载 locale 消息。 */
  messageLoader?: LocaleMessageLoaders
  /** 消息缺失时的自定义处理函数。 */
  missing?: MissingHandler
  /** 是否在消息缺失时打印警告。 */
  missingWarn?: boolean
  /** 是否在消息命中 fallback 语言时打印警告。 */
  fallbackWarn?: boolean
}

/** useI18n 的入参配置。 */
export type UseI18nOptions = ComposerOptions & {
  /** 显式指定 i18n 实例，优先级高于 context 和全局实例。 */
  i18n?: I18n
  /** 使用全局 composer 还是组件本地 composer。 */
  useScope?: 'global' | 'local'
}

/** I18nProvider 组件属性。 */
export type I18nProviderProps = ComposerOptions & {
  /** 通过 i18n 实例提供全局 composer。 */
  i18n?: I18n
  /** 直接提供 composer，优先级高于 i18n。 */
  composer?: Composer
  /** Provider 包裹的子节点。 */
  children?: unknown
}

/** i18n 的核心能力对象，负责语言状态、消息查找、格式化和懒加载。 */
export type Composer = {
  /** 当前活动语言。 */
  locale: WritableValueSignal<Locale>
  /** 当前兜底语言配置。 */
  fallbackLocale: WritableValueSignal<FallbackLocale>
  /** 当前所有 locale 的消息表。 */
  messages: WritableValueSignal<LocaleMessages>
  /** 当前所有 locale 的日期/时间格式预设。 */
  datetimeFormats: WritableValueSignal<DateTimeFormats>
  /** 当前所有 locale 的数字格式预设。 */
  numberFormats: WritableValueSignal<NumberFormats>
  /** 当前已注册消息的 locale 列表，会随 messages 更新自动同步。 */
  availableLocales: ReadonlyValueSignal<Locale[]>
  /** 当前正在懒加载消息的 locale 列表。 */
  loadingLocales: ReadonlyValueSignal<Locale[]>
  /** 翻译消息；message 同时作为查找 key 和缺失时的兜底文本。 */
  _: (message: string, values?: InterpolationValues, locale?: Locale) => string
  /** 格式化日期/时间，format 可传命名格式或 Intl.DateTimeFormatOptions。 */
  d: (
    value: Date | number | string,
    format?: string | Intl.DateTimeFormatOptions,
    locale?: Locale,
  ) => string
  /** 格式化数字，format 可传命名格式或 Intl.NumberFormatOptions。 */
  n: (value: number, format?: string | Intl.NumberFormatOptions, locale?: Locale) => string
  /** 判断指定 locale 是否正在懒加载消息。 */
  isLocaleLoading: (locale: Locale) => boolean
  /** 按需加载指定 locale 的消息，默认会合并到已有消息中。 */
  loadLocaleMessages: (
    locale: Locale,
    options?: LocaleMessageLoadOptions,
  ) => Promise<LocaleMessageDictionary>
  /** 切换当前活动语言。 */
  setLocale: (locale: Locale) => void
  /** 获取指定 locale 的消息副本。 */
  getLocaleMessage: (locale: Locale) => LocaleMessageDictionary
  /** 整包替换指定 locale 的消息。 */
  setLocaleMessage: (locale: Locale, message: LocaleMessageDictionary) => void
  /** 合并指定 locale 的消息，同名 key 会被新消息覆盖。 */
  mergeLocaleMessage: (locale: Locale, message: LocaleMessageDictionary) => void
  /** 获取指定 locale 的日期/时间格式配置副本。 */
  getDateTimeFormat: (locale: Locale) => DateTimeFormatSchema
  /** 整包替换指定 locale 的日期/时间格式配置。 */
  setDateTimeFormat: (locale: Locale, format: DateTimeFormatSchema) => void
  /** 合并指定 locale 的日期/时间格式配置，同名格式会被新配置覆盖。 */
  mergeDateTimeFormat: (locale: Locale, format: DateTimeFormatSchema) => void
  /** 获取指定 locale 的数字格式配置副本。 */
  getNumberFormat: (locale: Locale) => NumberFormatSchema
  /** 整包替换指定 locale 的数字格式配置。 */
  setNumberFormat: (locale: Locale, format: NumberFormatSchema) => void
  /** 合并指定 locale 的数字格式配置，同名格式会被新配置覆盖。 */
  mergeNumberFormat: (locale: Locale, format: NumberFormatSchema) => void
}

/** createI18n 返回的插件实例，包含全局 composer 和 install 注册方法。 */
export type I18n = {
  /** 全局 composer，供 provider、install 后的 useI18n 或手动调用使用。 */
  global: Composer
  /** 注册全局 i18n 实例；当前实现只负责记录活动实例和 composer。 */
  install: (app: unknown, options: unknown[]) => void
}

/** Rue context，用于在组件树中向下传递当前 i18n composer。 */
export const I18nContext = createContext<Composer | null>(null)

// 进程级活动实例：createI18n().install() 后，未显式传入 provider 的 useI18n()
// 也可以解析到全局 composer。
let activeI18n: I18n | null = null
let activeComposer: Composer | null = null
// 没有 install、provider 或入参时使用的兜底 composer，避免 useI18n() 返回空值。
let fallbackComposer: Composer | null = null

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

const isDictionary = (value: unknown): value is LocaleMessageDictionary => {
  return isRecord(value)
}

const normalizeLocale = (locale?: string): Locale => {
  // 统一清理空白，并给空语言提供稳定默认值。
  const nextLocale = String(locale ?? '').trim()
  return nextLocale || 'en'
}

// 区域语言可以回退到基础语言，例如 "en-US" 会尝试 "en-US" 和 "en"。
// 这个候选列表用于查找 messageLoader，不等同于完整的 fallbackLocale 链。
const getLocaleCandidates = (locale: Locale): Locale[] => {
  const normalizedLocale = normalizeLocale(locale)
  const localeCandidates = [normalizedLocale]
  const baseLocale = normalizedLocale.split('-')[0]

  if (baseLocale && baseLocale !== normalizedLocale) {
    localeCandidates.push(baseLocale)
  }

  return localeCandidates
}

const cloneMessageValue = (value: LocaleMessageValue): LocaleMessageValue => {
  // 消息值只允许基础类型或函数，本身不需要深拷贝。
  return value
}

const cloneLocaleMessage = (message?: LocaleMessageDictionary): LocaleMessageDictionary => {
  // 返回新对象，避免外部持有的消息字典被 composer 内部写入影响。
  return { ...message }
}

const cloneLocaleMessages = (messages?: LocaleMessages): LocaleMessages => {
  // 每个 locale 的消息字典单独克隆，保证顶层和语言层都是新引用。
  const cloned: LocaleMessages = {}
  const source = messages ?? {}

  Object.keys(source).forEach(locale => {
    cloned[locale] = cloneLocaleMessage(source[locale])
  })

  return cloned
}

const cloneDateTimeFormats = (formats?: DateTimeFormats): DateTimeFormats => {
  // Intl 格式配置是按 locale 分组的普通对象，这里只需要克隆到 schema 层。
  const cloned: DateTimeFormats = {}
  const source = formats ?? {}

  Object.keys(source).forEach(locale => {
    cloned[locale] = { ...source[locale] }
  })

  return cloned
}

const cloneNumberFormats = (formats?: NumberFormats): NumberFormats => {
  // 与日期格式一致，数字格式也保持按 locale 分组的新对象引用。
  const cloned: NumberFormats = {}
  const source = formats ?? {}

  Object.keys(source).forEach(locale => {
    cloned[locale] = { ...source[locale] }
  })

  return cloned
}

const mergeLocaleMessage = (
  base: LocaleMessageDictionary,
  patch: LocaleMessageDictionary,
): LocaleMessageDictionary => {
  // 消息合并采用浅合并：已有 key 保留，patch 中同名 key 覆盖 base。
  // 不直接修改 base，是为了让 ref 收到新对象引用并触发依赖更新。
  const merged = cloneLocaleMessage(base)

  Object.keys(patch).forEach(key => {
    // 单个消息值是基础类型或函数，只需按值/引用赋给新的字典。
    merged[key] = cloneMessageValue(patch[key])
  })

  return merged
}

const mergeFormatSchema = <T extends Record<string, unknown>>(base: T, patch: T): T => {
  // 日期/数字格式预设也是浅合并，patch 中同名格式覆盖旧格式。
  return {
    ...(base ?? ({} as T)),
    ...(patch ?? ({} as T)),
  }
}

const resolveLocaleMessageLoader = (loaders: LocaleMessageLoaders | undefined, locale: Locale) => {
  // messageLoader 可以是一个通用函数，也可以是按 locale 注册的函数表。
  if (!loaders) {
    return null
  }

  if (typeof loaders === 'function') {
    return loaders
  }

  const localeCandidates = getLocaleCandidates(locale)

  // 先找完整 locale，再找基础 locale，允许少量复用区域语言包加载器。
  for (let index = 0; index < localeCandidates.length; index += 1) {
    const loader = loaders[localeCandidates[index]]
    if (loader) {
      return loader
    }
  }

  return null
}

const normalizeLocaleMessageLoaderResult = (result: LocaleMessageLoaderResult) => {
  // 动态 import 常见返回 `{ default: messages }`，这里兼容该形态；
  // 如果直接返回消息字典，也按同样逻辑克隆后使用。
  if (
    result &&
    isDictionary((result as { default?: unknown }).default) &&
    Object.keys(result as Record<string, unknown>).length === 1
  ) {
    return cloneLocaleMessage((result as { default: LocaleMessageDictionary }).default)
  }

  if (isDictionary(result)) {
    return cloneLocaleMessage(result)
  }

  return {}
}

const resolveLocaleChain = (locale: Locale, fallbackLocale: FallbackLocale): Locale[] => {
  const chain: Locale[] = []
  const append = (value?: Locale) => {
    const nextLocale = normalizeLocale(value)

    // 去重能避免 fallbackLocale 中重复配置导致重复查找和重复警告。
    if (!chain.includes(nextLocale)) {
      chain.push(nextLocale)
    }
  }

  // 查找链始终从当前请求语言开始。
  append(locale)

  // false 表示显式禁用兜底，但仍保留当前请求语言。
  if (fallbackLocale === false) {
    return chain
  }

  if (Array.isArray(fallbackLocale)) {
    fallbackLocale.forEach(item => append(item))
    return chain
  }

  append(fallbackLocale)
  return chain
}

const isNamedInterpolation = (values?: InterpolationValues): values is NamedInterpolationValues => {
  // 数组插值和对象插值分开处理，对象形态对应 `{name}`。
  return isRecord(values)
}

const stringifyInterpolationValue = (value: unknown): string => {
  // null/undefined 在插值中渲染为空字符串，避免把占位值直接暴露给用户。
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'string') {
    return value
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint' ||
    typeof value === 'symbol'
  ) {
    return String(value)
  }

  if (value instanceof Date) {
    // 插值中的 Date 使用稳定的 ISO 字符串；本地化日期应使用 d()。
    return value.toISOString()
  }

  if (Array.isArray(value)) {
    // 数组作为单个插值值时递归拼接，允许传入简单片段组合。
    return value.map(item => stringifyInterpolationValue(item)).join('')
  }

  return String(value)
}

const interpolate = (template: string, values?: InterpolationValues): string => {
  // 支持 `{name}` 命名插值和 `{0}` 列表插值。
  // 缺失插值时保留原 token，方便开发阶段暴露遗漏参数。
  return template.replace(/\{([^}]+)\}/g, (token, rawKey) => {
    const key = String(rawKey).trim()

    if (Array.isArray(values) && /^\d+$/.test(key)) {
      const item = values[Number(key)]
      return item === undefined ? token : stringifyInterpolationValue(item)
    }

    if (isNamedInterpolation(values) && key in values) {
      return stringifyInterpolationValue(values[key])
    }

    return token
  })
}

const getFallbackComposer = (): Composer => {
  // 延迟创建兜底 composer，只有真正调用 useI18n() 且没有任何上下文时才分配。
  if (!fallbackComposer) {
    fallbackComposer = createComposer({})
  }

  return fallbackComposer
}

// 抽取 composer 相关配置，避免 provider/useI18n 把 i18n、composer、children 等外层属性
// 误传给 createComposer。
const extractComposerOptions = (options?: ComposerOptions): ComposerOptions => ({
  locale: options?.locale,
  fallbackLocale: options?.fallbackLocale,
  messages: options?.messages,
  datetimeFormats: options?.datetimeFormats,
  numberFormats: options?.numberFormats,
  messageLoader: options?.messageLoader,
  missing: options?.missing,
  missingWarn: options?.missingWarn,
  fallbackWarn: options?.fallbackWarn,
})

const hasComposerOptions = (options?: ComposerOptions): boolean => {
  // useI18n 只要传了 composer 配置，就默认创建组件本地 composer。
  if (!options) {
    return false
  }

  return (
    options.locale !== undefined ||
    options.fallbackLocale !== undefined ||
    options.messages !== undefined ||
    options.datetimeFormats !== undefined ||
    options.numberFormats !== undefined ||
    options.messageLoader !== undefined ||
    options.missing !== undefined ||
    options.missingWarn !== undefined ||
    options.fallbackWarn !== undefined
  )
}

const syncComposer = (composer: Composer, options: ComposerOptions) => {
  // Provider 自己持有 composer 时，需要把响应式 props 同步进 composer 状态。
  if (options.locale !== undefined) {
    composer.setLocale(options.locale)
  }

  if (options.fallbackLocale !== undefined) {
    composer.fallbackLocale.value = options.fallbackLocale
  }

  if (options.messages !== undefined) {
    // 替换整份 messages 后同步 availableLocales，保证公开列表和字典一致。
    composer.messages.value = cloneLocaleMessages(options.messages)
    ;(composer.availableLocales as WritableValueSignal<Locale[]>).value = Object.keys(
      composer.messages.value,
    ).sort()
  }

  if (options.datetimeFormats !== undefined) {
    composer.datetimeFormats.value = cloneDateTimeFormats(options.datetimeFormats)
  }

  if (options.numberFormats !== undefined) {
    composer.numberFormats.value = cloneNumberFormats(options.numberFormats)
  }
}

const trackComposer = (composer: Composer) => {
  // 在 setup 中读取这些 ref，让组件订阅 composer 状态；
  // 即使模板里只调用返回方法，也能在 locale/messages 变化时重新渲染。
  void composer.locale.value
  void composer.fallbackLocale.value
  void composer.messages.value
  void composer.datetimeFormats.value
  void composer.numberFormats.value
  void composer.loadingLocales.value
}

/**
 * 创建一个独立的 i18n composer。
 *
 * composer 持有 locale、messages、格式化配置和懒加载状态，适合全局复用，
 * 也可以通过 useI18n({ useScope: 'local' }) 创建组件级实例。
 */
export const createComposer = (options: ComposerOptions = {}): Composer => {
  // composer 是 i18n 的核心状态容器，所有状态都用 ref 包装以接入 Rue 响应式。
  const locale = ref<Locale>(normalizeLocale(options.locale))
  const fallbackLocale = ref<FallbackLocale>(options.fallbackLocale ?? false)
  const messages = ref<LocaleMessages>(cloneLocaleMessages(options.messages))
  const datetimeFormats = ref<DateTimeFormats>(cloneDateTimeFormats(options.datetimeFormats))
  const numberFormats = ref<NumberFormats>(cloneNumberFormats(options.numberFormats))
  const availableLocales = ref<Locale[]>(Object.keys(messages.value).sort())
  const loadingLocales = ref<Locale[]>([])
  // pendingLocaleLoads 用来合并同一 locale 的并发加载请求；
  // loadedLocaleLoads 用来跳过已完成的懒加载，除非调用方显式 force。
  const pendingLocaleLoads = new Map<Locale, Promise<LocaleMessageDictionary>>()
  const loadedLocaleLoads = new Set<Locale>()

  const syncAvailableLocales = () => {
    // availableLocales 是派生状态，每次替换或合并消息后都要重新计算。
    availableLocales.value = Object.keys(messages.value).sort()
  }

  const getLocaleMessageValue = (targetLocale: Locale) => {
    // 对外返回克隆结果，避免调用方直接修改 composer 内部 messages。
    return cloneLocaleMessage(messages.value[normalizeLocale(targetLocale)])
  }

  const setLocaleMessageValue = (targetLocale: Locale, message: LocaleMessageDictionary) => {
    const localeKey = normalizeLocale(targetLocale)
    // set 是整包替换，适合初始化或强制刷新某个 locale 的消息。
    messages.value = cloneLocaleMessages({
      ...messages.value,
      [localeKey]: cloneLocaleMessage(message),
    })
    syncAvailableLocales()
  }

  const mergeLocaleMessageValue = (targetLocale: Locale, message: LocaleMessageDictionary) => {
    const localeKey = normalizeLocale(targetLocale)
    // merge 会保留当前 locale 下已有 key，仅覆盖传入消息中出现的 key。
    messages.value = cloneLocaleMessages({
      ...messages.value,
      [localeKey]: mergeLocaleMessage(messages.value[localeKey] ?? {}, message),
    })
    syncAvailableLocales()
  }

  const updateLocaleLoading = (targetLocale: Locale, nextLoading: boolean) => {
    const localeKey = normalizeLocale(targetLocale)

    if (nextLoading) {
      // 防止同一 locale 被重复加入 loadingLocales。
      if (loadingLocales.value.includes(localeKey)) {
        return
      }

      loadingLocales.value = [...loadingLocales.value, localeKey]
      return
    }

    if (!loadingLocales.value.includes(localeKey)) {
      // 如果加载已被其他 finally 清理过，这里直接跳过。
      return
    }

    loadingLocales.value = loadingLocales.value.filter(candidate => candidate !== localeKey)
  }

  const loadLocaleMessages = async (
    targetLocale: Locale,
    loadOptions: LocaleMessageLoadOptions = {},
  ) => {
    const localeKey = normalizeLocale(targetLocale)
    const loader = resolveLocaleMessageLoader(options.messageLoader, localeKey)

    if (!loader) {
      // 没有 loader 时仍返回当前已有消息，调用方无需额外判断。
      return getLocaleMessageValue(localeKey)
    }

    if (!loadOptions.force) {
      // 默认共享同一 locale 的进行中任务，并复用已完成结果；
      // 需要重新拉取时可以传入 force。
      const pendingLoad = pendingLocaleLoads.get(localeKey)
      if (pendingLoad) {
        return pendingLoad
      }

      if (loadedLocaleLoads.has(localeKey)) {
        return getLocaleMessageValue(localeKey)
      }
    }

    updateLocaleLoading(localeKey, true)

    // 统一把同步/异步 loader 转成 Promise，并在加载完成后写回 messages。
    const loadTask = Promise.resolve(loader(localeKey))
      .then(result => normalizeLocaleMessageLoaderResult(result))
      .then(message => {
        if (loadOptions.merge === false) {
          // merge 为 false 时表示整包替换该 locale 的消息。
          setLocaleMessageValue(localeKey, message)
        } else {
          // 默认合并，适合按需加载补充局部消息。
          mergeLocaleMessageValue(localeKey, message)
        }

        loadedLocaleLoads.add(localeKey)
        return getLocaleMessageValue(localeKey)
      })
      .finally(() => {
        // 无论成功或失败，都清理 pending/loading 状态，避免 loading 卡住。
        pendingLocaleLoads.delete(localeKey)
        updateLocaleLoading(localeKey, false)
      })

    pendingLocaleLoads.set(localeKey, loadTask)
    return loadTask
  }

  const resolveMessageRecord = (key: string, targetLocale?: Locale) => {
    // 先查请求语言，再按 fallbackLocale 生成的链路查找兜底消息。
    const requestLocale = normalizeLocale(targetLocale ?? locale.value)
    const chain = resolveLocaleChain(requestLocale, fallbackLocale.value)

    for (let index = 0; index < chain.length; index += 1) {
      const candidateLocale = chain[index]
      const value = messages.value[candidateLocale]?.[key]

      if (value !== undefined) {
        if (candidateLocale !== requestLocale && options.fallbackWarn) {
          // 只有真正走到兜底语言时才打印 fallback 警告。
          console.warn(
            `[rue-i18n] Message "${key}" fell back from locale "${requestLocale}" to "${candidateLocale}".`,
          )
        }

        return {
          locale: candidateLocale,
          value,
        }
      }
    }

    return null
  }

  const renderMessageValue = (
    value: unknown,
    messageLocale: Locale,
    message: string,
    interpolation?: InterpolationValues,
  ): string | null => {
    if (value === null || value === undefined) {
      // null/undefined 被视为存在但为空的消息。
      return ''
    }

    if (typeof value === 'function') {
      // 函数式消息可能继续返回字符串、数字、数组等受支持值，
      // 因此结果仍然交回同一套渲染流程。
      const nextValue = (value as MessageFunction)({
        locale: messageLocale,
        message,
        values: interpolation,
        named: name => (isNamedInterpolation(interpolation) ? interpolation[name] : undefined),
        list: index => (Array.isArray(interpolation) ? interpolation[index] : undefined),
      })
      return renderMessageValue(nextValue, messageLocale, message, interpolation)
    }

    if (typeof value === 'string') {
      // 字符串消息在最终输出前进行插值替换。
      return interpolate(value, interpolation)
    }

    if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint' ||
      typeof value === 'symbol'
    ) {
      return String(value)
    }

    if (Array.isArray(value)) {
      // 数组消息会逐项渲染并拼接，允许函数式消息组合多个片段。
      return value
        .map(item => {
          const rendered = renderMessageValue(item, messageLocale, message, interpolation)
          return rendered ?? ''
        })
        .join('')
    }

    if (isDictionary(value)) {
      // 嵌套对象不是最终可渲染消息，返回 null 让调用方回退到原始文案。
      return null
    }

    return String(value)
  }

  const resolveDateTimeOptions = (
    requestLocale: Locale,
    format?: string | Intl.DateTimeFormatOptions,
  ): Intl.DateTimeFormatOptions => {
    if (typeof format !== 'string') {
      // 直接传入 Intl 配置时无需查表。
      return format ?? {}
    }

    // 命名日期格式沿用消息的 locale fallback 链。
    const chain = resolveLocaleChain(requestLocale, fallbackLocale.value)

    for (let index = 0; index < chain.length; index += 1) {
      const candidateLocale = chain[index]
      const optionsForLocale = datetimeFormats.value[candidateLocale]?.[format]

      if (optionsForLocale) {
        return optionsForLocale
      }
    }

    return {}
  }

  const resolveNumberOptions = (
    requestLocale: Locale,
    format?: string | Intl.NumberFormatOptions,
  ): Intl.NumberFormatOptions => {
    if (typeof format !== 'string') {
      // 直接传入 Intl 配置时无需查表。
      return format ?? {}
    }

    // 命名数字格式沿用消息的 locale fallback 链。
    const chain = resolveLocaleChain(requestLocale, fallbackLocale.value)

    for (let index = 0; index < chain.length; index += 1) {
      const candidateLocale = chain[index]
      const optionsForLocale = numberFormats.value[candidateLocale]?.[format]

      if (optionsForLocale) {
        return optionsForLocale
      }
    }

    return {}
  }

  return {
    locale,
    fallbackLocale,
    messages,
    datetimeFormats,
    numberFormats,
    availableLocales,
    loadingLocales,
    _(message, values, targetLocale) {
      // `_` 是消息翻译入口：message 既是查找 key，也是缺失时的最终兜底文本。
      const interpolatedSourceMessage = interpolate(message, values)
      const record = resolveMessageRecord(message, targetLocale)

      if (record) {
        // 找到消息后根据消息类型渲染；如果遇到不可渲染对象，则回退到原始文本。
        const rendered = renderMessageValue(record.value, record.locale, message, values)
        return rendered ?? interpolatedSourceMessage
      }

      const requestLocale = normalizeLocale(targetLocale ?? locale.value)
      const missingResult = options.missing?.(requestLocale, message)

      if (typeof missingResult === 'string') {
        // missing handler 可以返回自定义兜底文本，同样支持插值。
        return interpolate(missingResult, values)
      }

      if (options.missingWarn) {
        // 未命中且没有自定义兜底时，根据配置输出缺失警告。
        console.warn(`[rue-i18n] Missing message "${message}" for locale "${requestLocale}".`)
      }

      return interpolatedSourceMessage
    },
    d(value, format, targetLocale) {
      // d() 负责日期/时间格式化；字符串和时间戳会先转成 Date。
      const requestLocale = normalizeLocale(targetLocale ?? locale.value)
      const normalizedDate = value instanceof Date ? value : new Date(value)

      try {
        return new Intl.DateTimeFormat(
          requestLocale,
          resolveDateTimeOptions(requestLocale, format),
        ).format(normalizedDate)
      } catch {
        // Intl 可能因为非法 locale、日期或配置抛错；失败时返回原始值字符串。
        return String(value)
      }
    },
    n(value, format, targetLocale) {
      // n() 负责数字格式化，支持直接传 Intl 配置或传命名格式。
      const requestLocale = normalizeLocale(targetLocale ?? locale.value)

      try {
        return new Intl.NumberFormat(
          requestLocale,
          resolveNumberOptions(requestLocale, format),
        ).format(value)
      } catch {
        // 与日期格式化一致，格式化失败不能中断组件渲染。
        return String(value)
      }
    },
    isLocaleLoading(targetLocale) {
      // 暴露给 UI 判断某个 locale 的懒加载状态。
      return loadingLocales.value.includes(normalizeLocale(targetLocale))
    },
    loadLocaleMessages,
    setLocale(nextLocale) {
      // 切换当前 composer 的活动语言。
      locale.value = normalizeLocale(nextLocale)
    },
    getLocaleMessage(targetLocale) {
      // 读取指定 locale 的消息副本。
      return getLocaleMessageValue(targetLocale)
    },
    setLocaleMessage(targetLocale, message) {
      // 整包替换指定 locale 的消息。
      setLocaleMessageValue(targetLocale, message)
    },
    mergeLocaleMessage(targetLocale, message) {
      // 合并指定 locale 的消息，常用于按需补充局部文案。
      mergeLocaleMessageValue(targetLocale, message)
    },
    getDateTimeFormat(targetLocale) {
      // 读取指定 locale 的日期格式配置副本。
      return { ...datetimeFormats.value[normalizeLocale(targetLocale)] }
    },
    setDateTimeFormat(targetLocale, format) {
      // 整包替换指定 locale 的日期格式配置。
      const localeKey = normalizeLocale(targetLocale)
      datetimeFormats.value = {
        ...datetimeFormats.value,
        [localeKey]: { ...format },
      }
    },
    mergeDateTimeFormat(targetLocale, format) {
      // 合并指定 locale 的日期格式配置。
      const localeKey = normalizeLocale(targetLocale)
      datetimeFormats.value = {
        ...datetimeFormats.value,
        [localeKey]: mergeFormatSchema(datetimeFormats.value[localeKey] ?? {}, format ?? {}),
      }
    },
    getNumberFormat(targetLocale) {
      // 读取指定 locale 的数字格式配置副本。
      return { ...numberFormats.value[normalizeLocale(targetLocale)] }
    },
    setNumberFormat(targetLocale, format) {
      // 整包替换指定 locale 的数字格式配置。
      const localeKey = normalizeLocale(targetLocale)
      numberFormats.value = {
        ...numberFormats.value,
        [localeKey]: { ...format },
      }
    },
    mergeNumberFormat(targetLocale, format) {
      // 合并指定 locale 的数字格式配置。
      const localeKey = normalizeLocale(targetLocale)
      numberFormats.value = {
        ...numberFormats.value,
        [localeKey]: mergeFormatSchema(numberFormats.value[localeKey] ?? {}, format ?? {}),
      }
    },
  }
}

/**
 * 创建 i18n 插件实例。
 *
 * 返回值里的 global 是全局 composer；调用 install 后，未包裹 Provider 的
 * useI18n() 也能解析到该全局 composer。
 */
export const createI18n = (options: ComposerOptions = {}): I18n => {
  const global = createComposer(options)

  const i18n: I18n = {
    global,
    install() {
      // Rue 的安装逻辑保持轻量：记录全局 composer 后，useI18n() 即可解析到它。
      if (getCurrentAppTarget()) provideContext(I18nContext, () => global)
      else {
        activeI18n = i18n
        activeComposer = global
      }
    },
  }

  return i18n
}

/**
 * i18n Provider 组件。
 *
 * 可通过 composer、i18n 或 props 配置提供 composer；优先级为
 * composer > i18n.global > Provider 自建 composer。
 */
export const I18nProvider: FC<I18nProviderProps> = props => {
  const localComposer = useSetup(() => createComposer(extractComposerOptions(props)))

  if (!props.composer && !props.i18n) {
    // Provider 自己持有 composer 时，需要跟随 props 变化同步配置。
    syncComposer(localComposer, extractComposerOptions(props))
  }

  const composer = props.composer ?? props.i18n?.global ?? localComposer

  return _$compiledComponent(I18nContext.Provider, () => ({
    value: composer,
    children: props.children as BlockFactory<any> | undefined,
  })) as any
}

/**
 * 在组件中获取 i18n composer。
 *
 * 默认优先使用显式传入的 i18n、Provider context、已 install 的全局 composer；
 * 当传入 composer 配置或 useScope 为 local 时，会创建组件本地 composer。
 */
export const useI18n = (options: UseI18nOptions = {}): Composer => {
  const contextComposer = useContext(I18nContext)
  const globalComposer =
    options.i18n?.global ?? contextComposer ?? activeComposer ?? getFallbackComposer()
  const shouldUseLocalComposer = options.useScope === 'local' || hasComposerOptions(options)

  if (!shouldUseLocalComposer || options.useScope === 'global') {
    trackComposer(globalComposer)
    return globalComposer
  }

  const localComposerRef = useRef<Composer>()
  if (!localComposerRef.current) {
    // 组件级 composer 需要跨重渲染保持稳定，避免每次渲染都重建状态。
    localComposerRef.current = createComposer(extractComposerOptions(options))
  }
  const localComposer = localComposerRef.current
  trackComposer(localComposer)
  return localComposer
}

/** 获取当前通过 install 注册的活动 i18n 实例；未注册时返回 null。 */
export const getActiveI18n = (): I18n | null => activeI18n
