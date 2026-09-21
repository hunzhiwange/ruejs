/*
Mentions 组件概述
- 以 textarea 为输入基座，补齐 mentions 场景常用的触发词识别、候选面板、键盘导航与插入替换。
- 保持 Rue 当前表单视觉体系：尺寸、状态、变体、allowClear、autoSize 与原生 textarea 语义继续兼容。
- API 参考成熟 mentions 组件的核心能力，但不引入额外依赖与 portal，便于在 Rue 设计页直接演示与复用。
*/
import type { FC } from '@rue-js/rue'
import { onMounted, onUnmounted, ref, watch } from '@rue-js/rue'

/** MentionPlacement 位置或方向类型。 */
export type MentionPlacement = 'top' | 'bottom'
/** MentionsSize 尺寸类型。 */
export type MentionsSize =
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | 'small'
  | 'middle'
  | 'medium'
  | 'large'
/** MentionsStatus 状态类型。 */
export type MentionsStatus = 'success' | 'warning' | 'error' | 'validating'
/** MentionsVariant 视觉或语义变体类型。 */
export type MentionsVariant = 'outlined' | 'filled' | 'ghost' | 'borderless' | 'underlined'

/** MentionsAutoSizeConfig 配置对象。 */
export interface MentionsAutoSizeConfig {
  /** minRows 配置项。 */
  minRows?: number
  /** maxRows 配置项。 */
  maxRows?: number
}

/** MentionsAllowClearConfig 配置对象。 */
export interface MentionsAllowClearConfig {
  /** 清空图标。 */
  clearIcon?: any
}

/** MentionsOption 选项配置。 */
export interface MentionsOption {
  /** 数据项唯一标识。 */
  key?: string
  /** 受控值。 */
  value: string
  /** 展示标签。 */
  label?: any
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** MentionsClassNames 局部类名配置。 */
export interface MentionsClassNames {
  /** 根节点区域配置。 */
  root?: string
  /** textarea 配置项。 */
  textarea?: string
  /** popup 区域配置。 */
  popup?: string
  /** option 配置项。 */
  option?: string
  /** empty 配置项。 */
  empty?: string
  /** clear 配置项。 */
  clear?: string
}

/** MentionsStyles 局部样式配置。 */
export interface MentionsStyles {
  /** 根节点区域配置。 */
  root?: any
  /** textarea 配置项。 */
  textarea?: any
  /** popup 区域配置。 */
  popup?: any
}

/** MentionsRef 对外暴露的实例引用。 */
export interface MentionsRef {
  /** nativeElement 配置项。 */
  nativeElement?: HTMLTextAreaElement
  /** focus 配置项。 */
  focus: () => void
  /** blur 配置项。 */
  blur: () => void
}

/** MentionsConfig 配置对象。 */
export interface MentionsConfig {
  /** 前缀内容。 */
  prefix?: string | string[]
  /** split 配置项。 */
  split?: string
}

/** MentionsEntity 接口。 */
export interface MentionsEntity {
  /** 前缀内容。 */
  prefix: string
  /** 受控值。 */
  value: string
}

/** MentionsProps 组件属性。 */
export interface MentionsProps {
  /** 受控值。 */
  value?: string
  /** 非受控初始值。 */
  defaultValue?: string
  /** 可选项数据。 */
  options?: MentionsOption[]
  /** 前缀内容。 */
  prefix?: string | string[]
  /** split 配置项。 */
  split?: string
  /** searchDebounce 配置项。 */
  searchDebounce?: number
  /** 弹出层或内容展示位置。 */
  placement?: MentionPlacement
  /** 组件尺寸。 */
  size?: MentionsSize
  /** 组件状态。 */
  status?: MentionsStatus
  /** 组件视觉变体。 */
  variant?: MentionsVariant
  /** 是否允许一键清空。 */
  allowClear?: boolean | MentionsAllowClearConfig
  /** autoSize 尺寸。 */
  autoSize?: boolean | MentionsAutoSizeConfig
  /** 是否展示加载态。 */
  loading?: boolean
  /** 是否禁用交互。 */
  disabled?: boolean
  /** readOnly 配置项。 */
  readOnly?: boolean
  /** notFoundContent 配置项。 */
  notFoundContent?: any
  /** filterOption 配置项。 */
  filterOption?: false | ((input: string, option: MentionsOption) => boolean)
  /** validateSearch 配置项。 */
  validateSearch?: (text: string, props: MentionsProps) => boolean
  /** 值或状态变化时触发的回调。 */
  onChange?: (text: string) => void
  /** onInput 事件回调。 */
  onInput?: (event: Event) => void
  /** onNativeChange 事件回调。 */
  onNativeChange?: (event: Event) => void
  /** 搜索文本变化时触发的回调。 */
  onSearch?: (text: string, prefix: string) => void
  /** 选中项时触发的回调。 */
  onSelect?: (option: MentionsOption, prefix: string) => void
  /** 获得焦点时触发的回调。 */
  onFocus?: (event: FocusEvent) => void
  /** 失去焦点时触发的回调。 */
  onBlur?: (event: FocusEvent) => void
  /** onKeyDown 事件回调。 */
  onKeyDown?: (event: KeyboardEvent) => void
  /** onCompositionStart 事件回调。 */
  onCompositionStart?: (event: CompositionEvent) => void
  /** onCompositionEnd 事件回调。 */
  onCompositionEnd?: (event: CompositionEvent) => void
  /** onResize 事件回调。 */
  onResize?: (size: { width: number; height: number }) => void
  /** onPopupScroll 事件回调。 */
  onPopupScroll?: (event: Event) => void
  /** 根节点附加类名。 */
  rootClassName?: string
  /** textareaClassName 附加类名。 */
  textareaClassName?: string
  /** popupClassName 附加类名。 */
  popupClassName?: string
  /** popupStyle 内联样式。 */
  popupStyle?: any
  /** 按局部区域覆盖的类名集合。 */
  classNames?: MentionsClassNames
  /** 按局部区域覆盖的内联样式集合。 */
  styles?: MentionsStyles
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: any
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface MentionTriggerState {
  start: number
  end: number
  prefix: string
  search: string
  key: string
}

let mentionsIdSeed = 0

/** append Class Name 的内部工具函数。 */
const appendClassName = (base: string, className?: string) => {
  return className ? `${base} ${className}` : base
}

/** 解析 Text Value 的内部工具函数。 */
const resolveTextValue = (value?: string) => {
  if (value == null) return ''
  return String(value)
}

/** 归一化 Prefix List 的内部工具函数。 */
const normalizePrefixList = (prefix?: string | string[]) => {
  const list = Array.isArray(prefix) ? prefix : [prefix ?? '@']
  return list
    .filter(item => typeof item === 'string' && item.length > 0)
    .sort((left, right) => right.length - left.length)
}

/** 解析 Size Class 的内部工具函数。 */
const resolveSizeClass = (size?: MentionsSize) => {
  switch (size) {
    case 'small':
      return 'sm'
    case 'middle':
    case 'medium':
      return 'md'
    case 'large':
      return 'lg'
    default:
      return size
  }
}

/** 解析 Status Tone 的内部工具函数。 */
const resolveStatusTone = (status?: MentionsStatus) => {
  switch (status) {
    case 'success':
      return 'success'
    case 'warning':
      return 'warning'
    case 'error':
      return 'error'
    case 'validating':
      return 'info'
    default:
      return undefined
  }
}

/** 解析 Variant Class Name 的内部工具函数。 */
const resolveVariantClassName = (variant?: MentionsVariant) => {
  switch (variant) {
    case 'filled':
      return 'border-transparent bg-base-200/70 shadow-none focus:bg-base-100'
    case 'ghost':
      return 'textarea-ghost'
    case 'borderless':
      return 'bg-transparent border-transparent shadow-none'
    case 'underlined':
      return 'rounded-none border-x-0 border-t-0 border-b-base-300 bg-transparent px-0 shadow-none focus:border-b-primary'
    default:
      return undefined
  }
}

/** 构建 Textarea Class Name 的内部工具函数。 */
const buildTextareaClassName = ({
  size,
  status,
  variant,
  allowClear,
  className,
}: Pick<MentionsProps, 'size' | 'status' | 'variant' | 'className' | 'allowClear'>) => {
  let cls = 'textarea w-full'
  const resolvedSize = resolveSizeClass(size)
  const resolvedTone = resolveStatusTone(status)
  const resolvedVariant = resolveVariantClassName(variant)

  if (resolvedSize) cls += ` textarea-${resolvedSize}`
  if (resolvedTone) cls += ` textarea-${resolvedTone}`
  if (resolvedVariant) cls += ` ${resolvedVariant}`
  if (allowClear) cls += ' pr-10'
  if (className) cls += ` ${className}`

  return cls
}

/** validateSearchText 导出函数。 */
export const validateSearchText = (text: string, split = ' ') => {
  if (/\r|\n/.test(text)) return false
  return !split || text.indexOf(split) === -1
}

/** 判断是否存在 Boundary Before Prefix 的内部工具函数。 */
const hasBoundaryBeforePrefix = (value: string, start: number, split: string) => {
  if (start <= 0) return true
  if (split && start >= split.length && value.slice(start - split.length, start) === split) {
    return true
  }
  return /\s/.test(value[start - 1] ?? '')
}

/** find Mention Boundary End 的内部工具函数。 */
const findMentionBoundaryEnd = (value: string, start: number, split: string) => {
  let cursor = start

  while (cursor < value.length) {
    if (split && value.slice(cursor, cursor + split.length) === split) {
      break
    }

    if (/\s/.test(value[cursor] ?? '')) {
      break
    }

    cursor += 1
  }

  return cursor
}

/** find Previous Prefix Index 的内部工具函数。 */
const findPreviousPrefixIndex = (value: string, token: string, searchIndex: number) => {
  if (searchIndex <= 0) {
    return -1
  }

  return value.lastIndexOf(token, searchIndex - 1)
}

/** find Active Trigger 的内部工具函数。 */
const findActiveTrigger = (
  value: string,
  caretPosition: number,
  prefixList: string[],
  split: string,
  validator: (text: string) => boolean,
): MentionTriggerState | null => {
  if (caretPosition < 0) return null

  let matchedTrigger: MentionTriggerState | null = null

  prefixList.forEach(token => {
    let searchIndex = value.lastIndexOf(token, Math.max(caretPosition - token.length, 0))

    while (searchIndex >= 0) {
      if (searchIndex + token.length > caretPosition) {
        searchIndex = findPreviousPrefixIndex(value, token, searchIndex)
        continue
      }

      if (!hasBoundaryBeforePrefix(value, searchIndex, split)) {
        searchIndex = findPreviousPrefixIndex(value, token, searchIndex)
        continue
      }

      const searchText = value.slice(searchIndex + token.length, caretPosition)
      if (!validator(searchText)) {
        searchIndex = findPreviousPrefixIndex(value, token, searchIndex)
        continue
      }

      const candidate: MentionTriggerState = {
        start: searchIndex,
        end: caretPosition,
        prefix: token,
        search: searchText,
        key: `${searchIndex}:${caretPosition}:${token}:${searchText}`,
      }

      if (!matchedTrigger || candidate.start > matchedTrigger.start) {
        matchedTrigger = candidate
      }

      break
    }
  })

  return matchedTrigger
}

/** stringify Option Label 的内部工具函数。 */
const stringifyOptionLabel = (option: MentionsOption) => {
  if (typeof option.label === 'string' || typeof option.label === 'number') {
    return String(option.label)
  }
  return String(option.value ?? '')
}

/** filter Mention Options 的内部工具函数。 */
const filterMentionOptions = (
  options: MentionsOption[],
  searchText: string,
  filterOption?: MentionsProps['filterOption'],
) => {
  if (filterOption === false) {
    return options
  }

  const normalizedSearch = searchText.trim().toLowerCase()

  return options.filter(option => {
    if (typeof filterOption === 'function') {
      return filterOption(searchText, option)
    }

    if (!normalizedSearch) {
      return true
    }

    const valueText = String(option.value ?? '').toLowerCase()
    const labelText = stringifyOptionLabel(option).toLowerCase()
    return valueText.includes(normalizedSearch) || labelText.includes(normalizedSearch)
  })
}

/** 创建 Option View 的内部工具函数。 */
const createOptionView = (source?: MentionsOption[]) => {
  if (!source || typeof (source as any).length !== 'number') {
    return [] as MentionsOption[]
  }

  const list: MentionsOption[] = []
  const length = Number((source as any).length) || 0

  for (let index = 0; index < length; index += 1) {
    const option = (source as any)[index] as MentionsOption | undefined
    if (option !== undefined) {
      list.push(option)
    }
  }

  return list
}

/** 解析 Search Debounce 的内部工具函数。 */
const resolveSearchDebounce = (value?: number) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return 0
  }

  return Math.round(value)
}

const createCell = <T,>(current?: T): { current: T | undefined } => ({ current })

/** find First Enabled Index 的内部工具函数。 */
const findFirstEnabledIndex = (options: MentionsOption[]) => {
  return options.findIndex(option => !option.disabled)
}

/** find Next Enabled Index 的内部工具函数。 */
const findNextEnabledIndex = (
  options: MentionsOption[],
  currentIndex: number,
  direction: 1 | -1,
) => {
  if (!options.length) return -1
  const maxLoop = options.length
  let nextIndex = currentIndex

  for (let step = 0; step < maxLoop; step += 1) {
    nextIndex = (nextIndex + direction + options.length) % options.length
    if (!options[nextIndex]?.disabled) {
      return nextIndex
    }
  }

  return -1
}

/** assign Forwarded Ref 的内部工具函数。 */
const assignForwardedRef = (forwardedRef: any, value: MentionsRef | null) => {
  if (typeof forwardedRef === 'function') {
    forwardedRef(value)
    return
  }

  if (forwardedRef && typeof forwardedRef === 'object') {
    ;(forwardedRef as any).current = value ?? undefined
  }
}

/** trigger Synthetic Input 的内部工具函数。 */
const triggerSyntheticInput = (element: HTMLTextAreaElement) => {
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

/** Default Clear Icon 的内部工具函数。 */
const DefaultClearIcon: FC = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m7 7 10 10M17 7 7 17" />
    </svg>
  )
}

/** Loading Option 的内部工具函数。 */
const LoadingOption: FC = () => {
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-sm text-base-content/65">
      <span className="loading loading-spinner loading-xs" aria-hidden="true" />
      正在检索候选项
    </div>
  )
}

const MentionsContent: FC<{ render: () => any }> = ({ render }) => <>{render()}</>

/** Empty Option 的内部工具函数。 */
const EmptyOption: FC<{ content: any; className?: string }> = ({ content, className }) => {
  return (
    <div className={appendClassName('px-3 py-2 text-sm text-base-content/55', className)}>
      <MentionsContent render={() => content} />
    </div>
  )
}

/** Mentions Root 的内部工具函数。 */
const MentionsRoot: FC<MentionsProps> = ({
  value,
  defaultValue,
  options,
  prefix = '@',
  split = ' ',
  searchDebounce,
  placement = 'bottom',
  size,
  status,
  variant,
  allowClear,
  autoSize,
  loading,
  disabled,
  readOnly,
  notFoundContent = '未找到匹配项',
  filterOption,
  validateSearch,
  onChange,
  onInput,
  onNativeChange,
  onSearch,
  onSelect,
  onFocus,
  onBlur,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  onResize,
  onPopupScroll,
  rootClassName,
  textareaClassName,
  popupClassName,
  popupStyle,
  classNames,
  styles,
  className,
  style,
  ...rest
}) => {
  const CompiledRow1 = ({ rowArg0, rowArg1 }: { rowArg0: any; rowArg1: any }) => {
    const option = rowArg0
    const index = rowArg1

    const popupId = resolvePopupId()
    const selected = index === highlightedIndex.value

    return (
      <button
        key={option.key ?? `${option.value}-${index}`}
        id={popupId ? `${popupId}-option-${index}` : undefined}
        type="button"
        role="option"
        aria-selected={selected ? 'true' : 'false'}
        disabled={option.disabled}
        className={appendClassName(
          appendClassName(
            appendClassName(
              'mx-2 flex w-[calc(100%-1rem)] items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition',
              selected
                ? 'bg-primary/10 text-primary ring-1 ring-primary/10'
                : 'text-base-content hover:bg-base-200/75',
            ),
            option.disabled ? 'cursor-not-allowed opacity-45 hover:bg-transparent' : undefined,
          ),
          appendClassName(classNames?.option ?? '', option.className),
        )}
        style={option.style}
        onMouseDown={(event: MouseEvent) => {
          if (typeof (event as any).preventDefault === 'function') {
            ;(event as any).preventDefault()
          }
        }}
        onMouseEnter={() => {
          highlightedIndex.value = option.disabled ? highlightedIndex.value : index
        }}
        onClick={() => {
          selectMentionOption(option)
        }}
      >
        <span className="min-w-0 flex-1 truncate">
          <MentionsContent render={() => option.label ?? option.value} />
        </span>
        <span className={selected ? 'text-primary/55' : 'text-base-content/35'}>
          {String(activeTrigger.value?.prefix ?? '')}
        </span>
      </button>
    )
  }

  // Keep each identity-bearing value visible to the compiler's setup analysis. Grouping refs in
  // an object makes the whole literal look props-derived and can recreate observers/state during
  // reactive branch refreshes.
  const textareaRef = createCell<HTMLTextAreaElement>()
  const rootRef = createCell<HTMLDivElement>()
  const resizeObserverRef = createCell<ResizeObserver>()
  const triggerSyncTimerRef = createCell<ReturnType<typeof setTimeout>>()
  const lastResizeRef = createCell<{ width: number; height: number }>()
  const currentValue = ref(resolveTextValue(value !== undefined ? value : defaultValue))
  const focused = ref(false)
  const composing = ref(false)
  const selectionStart = ref(0)
  const selectionEnd = ref(0)
  const highlightedIndex = ref(-1)
  const dismissedTriggerKey = ref('')
  const activeTrigger = ref<MentionTriggerState | null>(null)
  const lastSearchKey = ref('')
  const optionSource = ref(createOptionView(options))
  const visibleOptions = ref<MentionsOption[]>([])
  const lastCompositionCommittedValue = createCell<string | null>(null)
  const lastNativeInputValue = createCell('')
  const lastNativeTrigger = createCell<MentionTriggerState | null>(null)
  const lastNativeOptions = createCell<MentionsOption[]>([])
  const suppressNextNativeInput = createCell(false)
  const instanceId = ref('')
  const didInitOptionsWatch = createCell(false)
  const lastOptionsSourceRef = createCell<MentionsOption[] | undefined>(undefined)
  const didInitConfigWatch = createCell(false)
  const lastConfigSignatureRef = createCell('')
  const forwardedRef = rest.ref
  const isControlled = value !== undefined
  const clearConfig = allowClear && typeof allowClear === 'object' ? allowClear : undefined
  const clearable = !!allowClear
  const prefixList = normalizePrefixList(prefix)
  const searchDebounceMs = resolveSearchDebounce(searchDebounce)
  const triggerConfigSignature = `${loading ? 1 : 0}:${Array.isArray(prefix) ? prefix.join('|') : (prefix ?? '@')}:${split}:${searchDebounceMs}`
  const validator = (text: string) => {
    if (typeof validateSearch === 'function') {
      return validateSearch(text, {
        value,
        defaultValue,
        options,
        prefix,
        split,
        searchDebounce,
        placement,
        size,
        status,
        variant,
        allowClear,
        autoSize,
        loading,
        disabled,
        readOnly,
        notFoundContent,
        filterOption,
        validateSearch,
        onChange,
        onInput,
        onNativeChange,
        onSearch,
        onSelect,
        onFocus,
        onBlur,
        onKeyDown,
        onResize,
        onPopupScroll,
        rootClassName,
        textareaClassName,
        popupClassName,
        popupStyle,
        classNames,
        styles,
        className,
        style,
        ...rest,
      })
    }

    return validateSearchText(text, split)
  }

  if ('ref' in rest) {
    delete rest.ref
  }

  const createApi = (): MentionsRef => ({
    nativeElement: textareaRef.current,
    focus: () => {
      textareaRef.current?.focus()
    },
    blur: () => {
      textareaRef.current?.blur()
    },
  })

  const syncForwardedRef = () => {
    assignForwardedRef(forwardedRef, textareaRef.current ? createApi() : null)
  }

  const syncNativeDataTestId = () => {
    const element = textareaRef.current
    if (!element) return

    if (dataTestId === undefined || dataTestId === null) {
      element.removeAttribute('data-testid')
      return
    }

    element.setAttribute('data-testid', String(dataTestId))
  }

  const syncValueState = () => {
    const elementValue = textareaRef.current?.value

    currentValue.value = resolveTextValue(
      isControlled
        ? composing.value
          ? (elementValue ?? currentValue.value)
          : value
        : (elementValue ?? defaultValue),
    )
  }

  const syncSelectionState = () => {
    const element = textareaRef.current
    const nextStart = element?.selectionStart ?? currentValue.value.length
    const nextEnd = element?.selectionEnd ?? nextStart
    selectionStart.value = nextStart
    selectionEnd.value = nextEnd
  }

  const isCompositionActive = (event?: { isComposing?: boolean } | null) => {
    return composing.value || !!event?.isComposing
  }

  const getResolvedOptions = (
    trigger: MentionTriggerState | null = activeTrigger.value,
  ): MentionsOption[] => {
    if (!trigger) {
      return []
    }

    return filterMentionOptions(optionSource.value, trigger.search, filterOption)
  }

  const syncHighlightState = (resolvedOptions: MentionsOption[]) => {
    if (!resolvedOptions.length) {
      highlightedIndex.value = -1
      return
    }

    if (highlightedIndex.value < 0 || highlightedIndex.value >= resolvedOptions.length) {
      highlightedIndex.value = findFirstEnabledIndex(resolvedOptions)
      return
    }

    if (resolvedOptions[highlightedIndex.value]?.disabled) {
      highlightedIndex.value = findNextEnabledIndex(resolvedOptions, highlightedIndex.value, 1)
    }
  }

  const clearPendingTriggerSync = () => {
    if (triggerSyncTimerRef.current === undefined) {
      return
    }

    clearTimeout(triggerSyncTimerRef.current)
    triggerSyncTimerRef.current = undefined
  }

  const syncTriggerStateNow = () => {
    if (composing.value) {
      activeTrigger.value = null
      visibleOptions.value = []
      highlightedIndex.value = -1
      lastSearchKey.value = ''
      return
    }

    const nextTrigger =
      disabled || readOnly
        ? null
        : findActiveTrigger(currentValue.value, selectionStart.value, prefixList, split, validator)

    if (!nextTrigger) {
      activeTrigger.value = null
      visibleOptions.value = []
      highlightedIndex.value = -1
      lastSearchKey.value = ''
      dismissedTriggerKey.value = ''
      return
    }

    if (dismissedTriggerKey.value && dismissedTriggerKey.value !== nextTrigger.key) {
      dismissedTriggerKey.value = ''
    }

    const previousTriggerKey = activeTrigger.value?.key
    activeTrigger.value = nextTrigger

    if (lastSearchKey.value !== `${nextTrigger.prefix}:${nextTrigger.search}`) {
      lastSearchKey.value = `${nextTrigger.prefix}:${nextTrigger.search}`
      if (onSearch) {
        onSearch(nextTrigger.search, nextTrigger.prefix)
      }
    }

    const resolvedOptions = getResolvedOptions(nextTrigger)
    visibleOptions.value = resolvedOptions
    if (previousTriggerKey !== nextTrigger.key) {
      highlightedIndex.value = findFirstEnabledIndex(resolvedOptions)
      return
    }

    syncHighlightState(resolvedOptions)
  }

  const syncTriggerState = (immediate = false) => {
    clearPendingTriggerSync()

    if (immediate || searchDebounceMs <= 0) {
      syncTriggerStateNow()
      return
    }

    triggerSyncTimerRef.current = setTimeout(() => {
      triggerSyncTimerRef.current = undefined
      syncTriggerStateNow()
    }, searchDebounceMs)
  }

  const syncAutoSize = () => {
    const element = textareaRef.current
    if (!element) return

    if (!autoSize) {
      element.style.height = ''
      element.style.overflowY = ''
      return
    }

    const config = typeof autoSize === 'object' ? autoSize : undefined
    const computedStyle = window.getComputedStyle(element)
    const lineHeightValue = Number.parseFloat(computedStyle.lineHeight)
    const fontSizeValue = Number.parseFloat(computedStyle.fontSize)
    const lineHeight = Number.isFinite(lineHeightValue)
      ? lineHeightValue
      : Number.isFinite(fontSizeValue)
        ? fontSizeValue * 1.5
        : 24
    const borderHeight =
      Number.parseFloat(computedStyle.borderTopWidth || '0') +
      Number.parseFloat(computedStyle.borderBottomWidth || '0')
    const paddingHeight =
      Number.parseFloat(computedStyle.paddingTop || '0') +
      Number.parseFloat(computedStyle.paddingBottom || '0')
    const minRows =
      typeof config?.minRows === 'number' && config.minRows > 0
        ? config.minRows
        : typeof rest.rows === 'number'
          ? rest.rows
          : undefined
    const maxRows =
      typeof config?.maxRows === 'number' && config.maxRows > 0
        ? Math.max(config.maxRows, minRows ?? 1)
        : undefined

    element.style.height = 'auto'
    let nextHeight = element.scrollHeight

    if (typeof minRows === 'number') {
      nextHeight = Math.max(nextHeight, minRows * lineHeight + borderHeight + paddingHeight)
    }

    if (typeof maxRows === 'number') {
      const maxHeight = maxRows * lineHeight + borderHeight + paddingHeight
      element.style.overflowY = nextHeight > maxHeight ? 'auto' : 'hidden'
      nextHeight = Math.min(nextHeight, maxHeight)
    } else {
      element.style.overflowY = 'hidden'
    }

    element.style.height = `${nextHeight}px`
  }

  const observeResize = () => {
    const element = textareaRef.current
    if (!element || typeof ResizeObserver === 'undefined' || !onResize) {
      lastResizeRef.current = undefined
      return
    }

    if (!resizeObserverRef.current) {
      resizeObserverRef.current = new ResizeObserver(entries => {
        const entry = entries[0]
        if (!entry) return
        const nextSize = {
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        }
        const previousSize = lastResizeRef.current

        if (
          previousSize &&
          previousSize.width === nextSize.width &&
          previousSize.height === nextSize.height
        ) {
          return
        }

        lastResizeRef.current = nextSize
        onResize(nextSize)
      })
    }

    resizeObserverRef.current.disconnect()
    resizeObserverRef.current.observe(element)
  }

  const assignTextareaRef = (element: HTMLTextAreaElement | null) => {
    textareaRef.current = element ?? undefined

    if (element && element.value !== currentValue.value) {
      element.value = currentValue.value
    }

    syncNativeDataTestId()
    syncForwardedRef()
  }

  const setCaretPosition = (position: number) => {
    const element = textareaRef.current
    if (!element) return
    element.focus()
    if (typeof element.setSelectionRange === 'function') {
      element.setSelectionRange(position, position)
    }
    syncSelectionState()
  }

  const selectMentionOption = (
    option: MentionsOption,
    fallbackElement?: HTMLTextAreaElement | null,
  ) => {
    const trigger = activeTrigger.value
    const element = textareaRef.current ?? fallbackElement

    if (!trigger || !element || option.disabled) {
      return
    }

    const before = currentValue.value.slice(0, trigger.start)
    const after = currentValue.value.slice(trigger.end)
    const triggerPrefix = trigger.prefix
    const splitIsWhitespace = split.trim() === ''
    const needsSplit =
      !!split && (!after || (!after.startsWith(split) && !(splitIsWhitespace && /^\s/.test(after))))
    const insertedText = `${triggerPrefix}${option.value}${needsSplit ? split : ''}`
    const nextValue = `${before}${insertedText}${after}`
    const nextCaretPosition = before.length + insertedText.length

    element.value = nextValue
    lastNativeInputValue.current = nextValue
    currentValue.value = nextValue
    lastCompositionCommittedValue.current = null
    dismissedTriggerKey.value = ''
    if (typeof element.setSelectionRange === 'function') {
      element.setSelectionRange(nextCaretPosition, nextCaretPosition)
    }

    syncSelectionState()
    syncAutoSize()
    syncTriggerState(true)

    if (onChange) {
      onChange(nextValue)
    }

    if (onSelect) {
      onSelect(option, triggerPrefix)
    }
  }

  const handleInput = (event: Event) => {
    const element = event.target as HTMLTextAreaElement | null
    const nextValue = element?.value ?? ''
    const nextSelectionStart = element?.selectionStart ?? nextValue.length
    const nextSelectionEnd = element?.selectionEnd ?? nextSelectionStart
    const suppressCommittedInput = suppressNextNativeInput.current
    suppressNextNativeInput.current = false
    lastNativeInputValue.current = nextValue
    currentValue.value = nextValue
    selectionStart.value = nextSelectionStart
    selectionEnd.value = nextSelectionEnd
    focused.value = true
    syncAutoSize()
    const composingNow = isCompositionActive(event as InputEvent)

    if (!composingNow) {
      syncSelectionState()
      syncTriggerState()
      const trigger = findActiveTrigger(nextValue, nextSelectionStart, prefixList, split, validator)
      if (trigger) {
        const resolvedOptions = filterMentionOptions(
          createOptionView(options),
          trigger.search,
          filterOption,
        )
        lastNativeTrigger.current = trigger
        lastNativeOptions.current = resolvedOptions
        activeTrigger.value = trigger
        visibleOptions.value = resolvedOptions
        highlightedIndex.value = findFirstEnabledIndex(resolvedOptions)
      }
    }

    if (onInput) {
      onInput(event)
    }

    const restoreInputValue = () => {
      if (element) {
        element.value = nextValue
        element.setSelectionRange?.(nextSelectionStart, nextSelectionEnd)
      }
    }
    restoreInputValue()

    if (composingNow) {
      return
    }

    if (suppressCommittedInput || lastCompositionCommittedValue.current === nextValue) {
      lastCompositionCommittedValue.current = null
      return
    }

    lastCompositionCommittedValue.current = null

    if (onChange) {
      onChange(nextValue)
    }
    restoreInputValue()
  }

  const handleNativeChange = (event: Event) => {
    lastCompositionCommittedValue.current = null
    syncValueState()
    syncSelectionState()
    syncAutoSize()
    syncTriggerState()
    if (onNativeChange) {
      onNativeChange(event)
    }
  }

  const handleFocus = (event: FocusEvent) => {
    const wasFocused = focused.value
    focused.value = true
    syncSelectionState()
    syncTriggerState(!wasFocused)
    if (onFocus) {
      onFocus(event)
    }
  }

  const handleBlur = (event: FocusEvent) => {
    focused.value = false
    clearPendingTriggerSync()
    if (onBlur) {
      onBlur(event)
    }
  }

  const handleSelectionRefresh = () => {
    if (composing.value) {
      return
    }

    syncSelectionState()
    syncTriggerState(searchDebounceMs <= 0)
  }

  const moveHighlight = (direction: 1 | -1) => {
    const resolvedOptions = getResolvedOptions()
    if (!resolvedOptions.length) return

    if (highlightedIndex.value < 0) {
      highlightedIndex.value =
        direction === 1
          ? findFirstEnabledIndex(resolvedOptions)
          : findNextEnabledIndex(resolvedOptions, 0, -1)
      return
    }

    highlightedIndex.value = findNextEnabledIndex(
      resolvedOptions,
      highlightedIndex.value,
      direction,
    )
  }

  const handleKeyDownInternal = (event: KeyboardEvent) => {
    if (isCompositionActive(event)) {
      if (onKeyDown) {
        onKeyDown(event)
      }
      return
    }

    const resolvedOptions = getResolvedOptions()
    const popupVisible =
      focused.value &&
      !!activeTrigger.value &&
      dismissedTriggerKey.value !== activeTrigger.value.key &&
      (loading || resolvedOptions.length > 0 || notFoundContent !== null)

    if (popupVisible) {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        moveHighlight(1)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        moveHighlight(-1)
      } else if (event.key === 'Enter') {
        const fallbackIndex = findFirstEnabledIndex(resolvedOptions)
        const optionIndex = highlightedIndex.value >= 0 ? highlightedIndex.value : fallbackIndex
        const option =
          optionIndex >= 0 && optionIndex < resolvedOptions.length
            ? resolvedOptions[optionIndex]
            : undefined
        if (option && !option.disabled) {
          event.preventDefault()
          selectMentionOption(option)
        }
      } else if (event.key === 'Escape') {
        dismissedTriggerKey.value = activeTrigger.value?.key ?? ''
        highlightedIndex.value = -1
      }
    }

    if (onKeyDown) {
      onKeyDown(event)
    }
  }

  const handleKeyUp = (event: KeyboardEvent) => {
    if (
      !isCompositionActive(event) &&
      !['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'].includes(event.key)
    ) {
      syncSelectionState()
      syncTriggerState()
    }
  }

  const handleCompositionStartInternal = (event: CompositionEvent) => {
    composing.value = true
    lastCompositionCommittedValue.current = null
    activeTrigger.value = null
    highlightedIndex.value = -1
    lastSearchKey.value = ''

    if (onCompositionStart) {
      onCompositionStart(event)
    }
  }

  const handleCompositionEndInternal = (event: CompositionEvent) => {
    composing.value = false
    const eventElement = event.target as HTMLTextAreaElement | null
    const nextValue =
      lastNativeInputValue.current ||
      eventElement?.value ||
      textareaRef.current?.value ||
      currentValue.value

    currentValue.value = nextValue
    syncSelectionState()
    syncAutoSize()
    syncTriggerState()
    const trigger = findActiveTrigger(nextValue, nextValue.length, prefixList, split, validator)
    if (trigger) {
      const resolvedOptions = filterMentionOptions(
        createOptionView(options),
        trigger.search,
        filterOption,
      )
      lastNativeTrigger.current = trigger
      lastNativeOptions.current = resolvedOptions
      activeTrigger.value = trigger
      visibleOptions.value = resolvedOptions
      highlightedIndex.value = findFirstEnabledIndex(resolvedOptions)
    }
    lastCompositionCommittedValue.current = nextValue
    suppressNextNativeInput.current = true

    if (onChange) {
      onChange(nextValue)
    }

    if (onCompositionEnd) {
      onCompositionEnd(event)
    }
  }

  const handleClear = (event: MouseEvent) => {
    const element = textareaRef.current
    if (!element || disabled || readOnly) {
      return
    }

    if (typeof (event as any).preventDefault === 'function') {
      ;(event as any).preventDefault()
    }
    if (typeof (event as any).stopPropagation === 'function') {
      ;(event as any).stopPropagation()
    }

    element.value = ''
    currentValue.value = ''
    lastCompositionCommittedValue.current = null
    dismissedTriggerKey.value = ''
    highlightedIndex.value = -1
    syncAutoSize()
    setCaretPosition(0)
    syncTriggerState(true)

    triggerSyntheticInput(element)

    if (typeof rest.onClear === 'function') {
      rest.onClear(event)
    }
  }

  onMounted(() => {
    if (!instanceId.value) {
      mentionsIdSeed += 1
      instanceId.value = `rue-mentions-${mentionsIdSeed}`
    }

    if (textareaRef.current && textareaRef.current.value !== currentValue.value) {
      textareaRef.current.value = currentValue.value
    }

    syncValueState()
    syncSelectionState()
    syncAutoSize()
    syncTriggerState()
    observeResize()
    syncForwardedRef()
  })

  onUnmounted(() => {
    clearPendingTriggerSync()
    resizeObserverRef.current?.disconnect()
    lastResizeRef.current = undefined
    assignForwardedRef(forwardedRef, null)
  })

  watch(
    () => value,
    () => {
      if (isControlled && textareaRef.current && !composing.value) {
        textareaRef.current.value = resolveTextValue(value)
      }
      syncValueState()
      syncSelectionState()
      syncAutoSize()
      syncTriggerState()
      observeResize()
    },
    { immediate: true },
  )

  watch(
    () => autoSize,
    () => {
      syncAutoSize()
      observeResize()
    },
    { immediate: true },
  )

  watch(
    () => options,
    (nextOptions: MentionsOption[] | undefined) => {
      const isSameOptionsRef =
        didInitOptionsWatch.current && lastOptionsSourceRef.current === nextOptions
      didInitOptionsWatch.current = true
      lastOptionsSourceRef.current = nextOptions
      if (isSameOptionsRef) {
        return
      }

      optionSource.value = createOptionView(nextOptions)
      syncTriggerState(true)
    },
    { immediate: true },
  )

  watch(
    () => triggerConfigSignature,
    (nextSignature: string) => {
      const isSameSignature =
        didInitConfigWatch.current && lastConfigSignatureRef.current === nextSignature
      didInitConfigWatch.current = true
      lastConfigSignatureRef.current = nextSignature
      if (isSameSignature) {
        return
      }

      syncTriggerState(true)
    },
    { immediate: true },
  )

  if (rest.rows !== undefined && rest.rows !== null) {
    rest.rows = String(rest.rows)
  }

  if (autoSize && (rest.rows === undefined || rest.rows === null)) {
    const minRows =
      typeof autoSize === 'object' && typeof autoSize.minRows === 'number'
        ? autoSize.minRows
        : undefined
    if (minRows) {
      rest.rows = String(minRows)
    }
  }

  const dataTestId = rest['data-testid']

  const nativeValueProps: Record<string, any> = {}

  const nativeTextareaOptionalProps: Record<string, any> = {}
  if (readOnly) {
    nativeTextareaOptionalProps.readOnly = true
  }

  const resolvePopupId = () => {
    return instanceId.value ? `${instanceId.value}-popup` : undefined
  }

  const isPopupVisible = () => {
    return (
      !composing.value &&
      focused.value &&
      !!activeTrigger.value &&
      dismissedTriggerKey.value !== activeTrigger.value.key &&
      (loading || visibleOptions.value.length > 0 || notFoundContent !== null)
    )
  }

  const resolveActiveOptionId = () => {
    const popupId = resolvePopupId()

    if (!popupId || !isPopupVisible() || highlightedIndex.value < 0) {
      return undefined
    }

    return `${popupId}-option-${highlightedIndex.value}`
  }

  const popupId = isPopupVisible() ? resolvePopupId() : undefined
  if (popupId !== undefined) {
    nativeTextareaOptionalProps['aria-controls'] = popupId
  }

  const activeOptionId = resolveActiveOptionId()
  if (activeOptionId !== undefined) {
    nativeTextareaOptionalProps['aria-activedescendant'] = activeOptionId
  }

  const ariaInvalid = status === 'error' ? 'true' : rest['aria-invalid']
  if (ariaInvalid !== undefined && ariaInvalid !== null) {
    nativeTextareaOptionalProps['aria-invalid'] = ariaInvalid
  }

  return (
    <div
      ref={(element: HTMLDivElement | null) => {
        rootRef.current = element ?? undefined
      }}
      className={appendClassName(
        appendClassName('rue-mentions relative block w-full', classNames?.root),
        appendClassName(className ?? '', rootClassName),
      )}
      style={{ ...styles?.root, ...style }}
    >
      <div className="relative">
        <textarea
          {...rest}
          {...nativeValueProps}
          {...nativeTextareaOptionalProps}
          ref={assignTextareaRef}
          disabled={disabled}
          aria-expanded={isPopupVisible() ? 'true' : 'false'}
          aria-autocomplete="list"
          data-rue-mentions-input="true"
          className={appendClassName(
            appendClassName(
              buildTextareaClassName({
                size,
                status,
                variant,
                allowClear: clearable,
                className: textareaClassName,
              }),
              classNames?.textarea,
            ),
            styles?.textarea ? undefined : undefined,
          )}
          style={styles?.textarea}
          onInput={handleInput}
          onChange={handleNativeChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onClick={handleSelectionRefresh}
          onSelect={handleSelectionRefresh}
          onKeyDown={handleKeyDownInternal}
          onKeyUp={handleKeyUp}
          onCompositionStart={handleCompositionStartInternal}
          onCompositionEnd={handleCompositionEndInternal}
        />
        {clearable && !disabled && !readOnly ? (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Clear mentions"
            className={appendClassName(
              appendClassName(
                appendClassName(
                  'btn btn-ghost btn-xs absolute right-2 top-2 h-7 min-h-0 w-7 rounded-full p-0 text-base-content/55 hover:text-base-content',
                  currentValue.value ? undefined : 'hidden',
                ),
                classNames?.clear,
              ),
              rootRef.current ? undefined : undefined,
            )}
            onMouseDown={(event: MouseEvent) => {
              if (typeof (event as any).preventDefault === 'function') {
                ;(event as any).preventDefault()
              }
            }}
            onClick={handleClear}
          >
            <>
              {clearConfig?.clearIcon ? (
                <span>
                  <MentionsContent render={() => clearConfig.clearIcon} />
                </span>
              ) : (
                <DefaultClearIcon />
              )}
            </>
          </button>
        ) : null}
      </div>
      {isPopupVisible() ? (
        <div
          id={resolvePopupId()}
          role="listbox"
          className={appendClassName(
            appendClassName(
              appendClassName(
                appendClassName(
                  `absolute left-0 z-20 w-full overflow-hidden rounded-2xl border border-base-300 bg-base-100/95 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.55)] backdrop-blur ${placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`,
                  popupClassName,
                ),
                classNames?.popup,
              ),
              rootClassName ? undefined : undefined,
            ),
            focused.value ? undefined : undefined,
          )}
          style={{ ...styles?.popup, ...popupStyle }}
          onScroll={(event: Event) => {
            if (onPopupScroll) {
              onPopupScroll(event)
            }
          }}
        >
          <div className="max-h-72 overflow-y-auto py-2">
            {loading ? (
              <LoadingOption />
            ) : visibleOptions.value.length ? (
              <>
                {' '}
                {visibleOptions.value.map((rowArg0: any, rowArg1: number) => (
                  <CompiledRow1
                    key={rowArg0.key ?? rowArg0.value}
                    rowArg0={rowArg0}
                    rowArg1={rowArg1}
                  />
                ))}{' '}
              </>
            ) : (
              <EmptyOption className={classNames?.empty} content={notFoundContent} />
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

type CompoundedComponent = typeof MentionsRoot & {
  getMentions: (value: string, config?: MentionsConfig) => MentionsEntity[]
}

const Mentions = MentionsRoot as CompoundedComponent

Mentions.getMentions = (value = '', config: MentionsConfig = {}): MentionsEntity[] => {
  const { prefix = '@', split = ' ' } = config
  const prefixList = normalizePrefixList(prefix)
  const entities: MentionsEntity[] = []
  let index = 0

  while (index < value.length) {
    const matchedPrefix = prefixList.find(token => value.startsWith(token, index))

    if (!matchedPrefix || !hasBoundaryBeforePrefix(value, index, split)) {
      index += 1
      continue
    }

    const mentionStart = index + matchedPrefix.length
    const mentionEnd = findMentionBoundaryEnd(value, mentionStart, split)
    const mentionValue = value.slice(mentionStart, mentionEnd)

    if (mentionValue) {
      entities.push({
        prefix: matchedPrefix,
        value: mentionValue,
      })
    }

    if (split && value.slice(mentionEnd, mentionEnd + split.length) === split) {
      index = mentionEnd + split.length
      continue
    }

    index = mentionEnd > index ? mentionEnd : index + matchedPrefix.length
  }

  return entities
}

/** 默认导出提及输入组件。 */
export default Mentions
