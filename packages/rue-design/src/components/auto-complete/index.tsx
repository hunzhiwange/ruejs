/*
AutoComplete 组件概述
- 面向“输入辅助”而不是“受限选择”，允许用户自由输入，同时在输入过程中提供分组建议、键盘导航与清空能力。
- API 参考成熟输入建议组件的核心心智，覆盖 options、受控 open、本地过滤、backfill、popupRender 与语义化 classNames/styles。
- 视觉上延续 Rue 当前 input 体系，不引入预转换文件头，交由编译器参与 TSX 优化。
*/
import type { FC } from '@rue-js/rue'
import { computed, onMounted, onUnmounted, ref, useRef, watch } from '@rue-js/rue'

/** AutoCompleteValue 值类型。 */
export type AutoCompleteValue = string | number
/** AutoCompletePlacement 位置或方向类型。 */
export type AutoCompletePlacement = 'top' | 'bottom'
/** AutoCompleteSize 尺寸类型。 */
export type AutoCompleteSize =
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | 'small'
  | 'middle'
  | 'medium'
  | 'large'
/** AutoCompleteStatus 状态类型。 */
export type AutoCompleteStatus = 'warning' | 'error'
/** AutoCompleteVariant 视觉或语义变体类型。 */
export type AutoCompleteVariant = 'outlined' | 'filled' | 'ghost' | 'borderless' | 'underlined'

/** AutoCompleteAllowClearConfig 配置对象。 */
export interface AutoCompleteAllowClearConfig {
  /** 清空图标。 */
  clearIcon?: any
}

/** AutoCompleteOption 选项配置。 */
export interface AutoCompleteOption {
  /** 数据项唯一标识。 */
  key?: string | number
  /** 受控值。 */
  value: AutoCompleteValue
  /** 展示标签。 */
  label?: any
  /** 描述内容。 */
  description?: any
  /** 是否禁用交互。 */
  disabled?: boolean
  /** keywords 配置项。 */
  keywords?: Array<string | number>
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: any
  /** 标题内容。 */
  title?: string
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** AutoCompleteOptionGroup 接口。 */
export interface AutoCompleteOptionGroup {
  /** 数据项唯一标识。 */
  key?: string | number
  /** 展示标签。 */
  label: any
  /** 可选项数据。 */
  options: AutoCompleteOption[]
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** AutoCompleteOptionData 类型。 */
export type AutoCompleteOptionData = AutoCompleteOption | AutoCompleteOptionGroup

/** AutoCompleteClassNames 局部类名配置。 */
export interface AutoCompleteClassNames {
  /** 根节点区域配置。 */
  root?: string
  /** control 配置项。 */
  control?: string
  /** input 区域配置。 */
  input?: string
  /** popup 区域配置。 */
  popup?: string
  /** list 区域配置。 */
  list?: string
  /** item 区域配置。 */
  item?: string
  /** group 配置项。 */
  group?: string
  /** empty 配置项。 */
  empty?: string
  /** clear 配置项。 */
  clear?: string
  /** 是否展示加载态。 */
  loading?: string
}

/** AutoCompleteStyles 局部样式配置。 */
export interface AutoCompleteStyles {
  /** 根节点区域配置。 */
  root?: any
  /** control 配置项。 */
  control?: any
  /** input 区域配置。 */
  input?: any
  /** popup 区域配置。 */
  popup?: any
  /** list 区域配置。 */
  list?: any
  /** item 区域配置。 */
  item?: any
  /** group 配置项。 */
  group?: any
  /** empty 配置项。 */
  empty?: any
  /** clear 配置项。 */
  clear?: any
  /** 是否展示加载态。 */
  loading?: any
}

/** AutoCompleteRef 对外暴露的实例引用。 */
export interface AutoCompleteRef {
  /** nativeElement 配置项。 */
  nativeElement?: HTMLInputElement
  /** focus 配置项。 */
  focus: () => void
  /** blur 配置项。 */
  blur: () => void
}

/** AutoCompleteProps 组件属性。 */
export interface AutoCompleteProps {
  /** 受控值。 */
  value?: AutoCompleteValue
  /** 非受控初始值。 */
  defaultValue?: AutoCompleteValue
  /** 可选项数据。 */
  options?: AutoCompleteOptionData[]
  /** 受控打开状态。 */
  open?: boolean
  /** 非受控初始打开状态。 */
  defaultOpen?: boolean
  /** 是否禁用交互。 */
  disabled?: boolean
  /** readOnly 配置项。 */
  readOnly?: boolean
  /** 是否展示加载态。 */
  loading?: boolean
  /** 占位内容。 */
  placeholder?: string
  /** 是否允许一键清空。 */
  allowClear?: boolean | AutoCompleteAllowClearConfig
  /** backfill 配置项。 */
  backfill?: boolean
  /** defaultActiveFirstOption 配置项。 */
  defaultActiveFirstOption?: boolean
  /** filterOption 配置项。 */
  filterOption?: boolean | ((inputValue: string, option: AutoCompleteOption) => boolean)
  /** notFoundContent 配置项。 */
  notFoundContent?: any
  /** popupMatchSelectWidth 配置项。 */
  popupMatchSelectWidth?: boolean | number
  /** popupRender 自定义渲染函数。 */
  popupRender?: (panel: any) => any

  /** optionLabelProp 配置项。 */
  optionLabelProp?: string
  /** 弹出层或内容展示位置。 */
  placement?: AutoCompletePlacement
  /** 组件尺寸。 */
  size?: AutoCompleteSize
  /** 组件状态。 */
  status?: AutoCompleteStatus
  /** 组件视觉变体。 */
  variant?: AutoCompleteVariant
  /** 前缀内容。 */
  prefix?: any
  /** 后缀内容。 */
  suffix?: any
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: any
  /** 根节点附加类名。 */
  rootClassName?: string
  /** controlClassName 附加类名。 */
  controlClassName?: string
  /** inputClassName 附加类名。 */
  inputClassName?: string
  /** popupClassName 附加类名。 */
  popupClassName?: string
  /** clearButtonClassName 附加类名。 */
  clearButtonClassName?: string
  /** popupStyle 内联样式。 */
  popupStyle?: any
  /** 按局部区域覆盖的类名集合。 */
  classNames?: AutoCompleteClassNames
  /** 按局部区域覆盖的内联样式集合。 */
  styles?: AutoCompleteStyles
  /** 值或状态变化时触发的回调。 */
  onChange?: (value: string) => void
  /** 搜索文本变化时触发的回调。 */
  onSearch?: (value: string) => void
  /** 选中项时触发的回调。 */
  onSelect?: (value: AutoCompleteValue, option: AutoCompleteOption) => void
  /** 打开状态变化时触发的回调。 */
  onOpenChange?: (open: boolean) => void
  /** 清空时触发的回调。 */
  onClear?: (event: MouseEvent) => void
  /** 获得焦点时触发的回调。 */
  onFocus?: (event: FocusEvent) => void
  /** 失去焦点时触发的回调。 */
  onBlur?: (event: FocusEvent) => void
  /** onKeyDown 事件回调。 */
  onKeyDown?: (event: KeyboardEvent) => void
  /** onInputKeyDown 事件回调。 */
  onInputKeyDown?: (event: KeyboardEvent) => void
  /** onPressEnter 事件回调。 */
  onPressEnter?: (event: KeyboardEvent) => void
  /** onPopupScroll 事件回调。 */
  onPopupScroll?: (event: Event) => void
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** DEFAULT_INPUT_FOCUS_RESTORE_SNAPSHOT 内部常量。 */
const DEFAULT_INPUT_FOCUS_RESTORE_SNAPSHOT = {
  shouldRestore: false,
  selectionStart: null,
  selectionEnd: null,
} as const

interface NormalizedOption {
  key: string
  value: AutoCompleteValue
  label: any
  description?: any
  disabled: boolean
  className?: string
  style?: any
  title?: string
  searchText: string
  raw: AutoCompleteOption
}

interface NormalizedGroup {
  key: string
  label?: any
  className?: string
  style?: any
  options: NormalizedOption[]
}

let autoCompleteIdSeed = 0

const sizeClassMap = {
  xs: 'xs',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
  small: 'sm',
  middle: 'md',
  medium: 'md',
  large: 'lg',
} as const

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (...classNames: Array<string | undefined | false | null>) => {
  return classNames.filter(Boolean).join(' ')
}

/** 解析 Input Value 的内部工具函数。 */
const resolveInputValue = (value?: AutoCompleteValue) => {
  if (value == null) return ''
  return String(value)
}

/** 解析 Size Class 的内部工具函数。 */
const resolveSizeClass = (size?: AutoCompleteSize) => {
  if (!size) return undefined
  return sizeClassMap[size]
}

/** 解析 Variant Class Name 的内部工具函数。 */
const resolveVariantClassName = (variant?: AutoCompleteVariant) => {
  switch (variant) {
    case 'filled':
      return 'border-transparent bg-base-200/70 shadow-none focus-within:bg-base-100'
    case 'ghost':
      return 'input-ghost'
    case 'borderless':
      return 'bg-transparent border-transparent shadow-none'
    case 'underlined':
      return 'rounded-none border-x-0 border-t-0 border-b-base-300 bg-transparent px-0 shadow-none focus-within:border-b-primary'
    default:
      return undefined
  }
}

/** 构建 Control Class Name 的内部工具函数。 */
const buildControlClassName = ({
  size,
  status,
  variant,
  className,
}: {
  size?: AutoCompleteSize
  status?: AutoCompleteStatus
  variant?: AutoCompleteVariant
  className?: string
}) => {
  let cls = 'input flex w-full items-center gap-2'
  const resolvedSize = resolveSizeClass(size)
  const resolvedVariant = resolveVariantClassName(variant)

  if (resolvedSize) cls += ` input-${resolvedSize}`
  if (status) cls += ` input-${status}`
  if (resolvedVariant) cls += ` ${resolvedVariant}`
  if (className) cls += ` ${className}`
  return cls
}

/** 创建 Array View 的内部工具函数。 */
const createArrayView = <T,>(source?: T[]) => {
  if (!source || typeof (source as any).length !== 'number') {
    return [] as T[]
  }

  const list: T[] = []
  const length = Number((source as any).length) || 0

  for (let index = 0; index < length; index += 1) {
    const item = (source as any)[index] as T | undefined
    if (item !== undefined) {
      list.push(item)
    }
  }

  return list
}

/** stringify Search Part 的内部工具函数。 */
const stringifySearchPart = (value: any): string => {
  if (value == null || typeof value === 'boolean') return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) {
    return value
      .map(item => stringifySearchPart(item))
      .filter(Boolean)
      .join(' ')
  }
  if (typeof value === 'object') {
    const candidateFields = ['value', 'label', 'title', 'description', 'name', 'text', 'children']
    return candidateFields
      .map(field => stringifySearchPart(value[field]))
      .filter(Boolean)
      .join(' ')
  }
  return ''
}

/** 判断 Option Group 的内部工具函数。 */
const isOptionGroup = (item: AutoCompleteOptionData): item is AutoCompleteOptionGroup => {
  return (
    !!item && typeof item === 'object' && 'options' in item && Array.isArray((item as any).options)
  )
}

/** 归一化 Option 的内部工具函数。 */
const normalizeOption = (
  item: AutoCompleteOption,
  groupKey: string,
  groupIndex: number,
  optionIndex: number,
): NormalizedOption => {
  const keyCandidate =
    item.key ?? `${groupKey}:${groupIndex}:${optionIndex}:${resolveInputValue(item.value)}`

  return {
    key: String(keyCandidate),
    value: item.value,
    label: item.label ?? item.value,
    description: item.description,
    disabled: !!item.disabled,
    className: item.className,
    style: item.style,
    title: item.title,
    searchText: [
      stringifySearchPart(item.value),
      stringifySearchPart(item.label),
      stringifySearchPart(item.description),
      stringifySearchPart(item.keywords),
      stringifySearchPart(item.title),
    ]
      .filter(Boolean)
      .join(' '),
    raw: item,
  }
}

/** 归一化 Groups 的内部工具函数。 */
const normalizeGroups = (options?: AutoCompleteOptionData[]) => {
  const source = createArrayView(options)
  const groups: NormalizedGroup[] = []
  const ungroupedOptions: NormalizedOption[] = []

  source.forEach((item, groupIndex) => {
    if (isOptionGroup(item)) {
      const nextGroupOptions = createArrayView(item.options).map((option, optionIndex) =>
        normalizeOption(
          option,
          String(item.key ?? item.label ?? `group-${groupIndex}`),
          groupIndex,
          optionIndex,
        ),
      )

      groups.push({
        key: String(item.key ?? `group-${groupIndex}`),
        label: item.label,
        className: item.className,
        style: item.style,
        options: nextGroupOptions,
      })
      return
    }

    ungroupedOptions.push(normalizeOption(item, 'root', 0, ungroupedOptions.length))
  })

  if (ungroupedOptions.length > 0) {
    groups.unshift({
      key: '__root__',
      options: ungroupedOptions,
    })
  }

  return groups
}

/** filter Groups 的内部工具函数。 */
const filterGroups = (
  groups: NormalizedGroup[],
  inputValue: string,
  filterOption?: AutoCompleteProps['filterOption'],
) => {
  if (filterOption === false) {
    return groups
  }

  const normalizedInput = inputValue.trim().toLowerCase()
  if (!normalizedInput) {
    return groups
  }

  return groups
    .map(group => {
      const nextOptions = group.options.filter(option => {
        if (typeof filterOption === 'function') {
          return filterOption(inputValue, option.raw)
        }

        return option.searchText.toLowerCase().includes(normalizedInput)
      })

      return {
        ...group,
        options: nextOptions,
      }
    })
    .filter(group => group.options.length > 0)
}

/** flatten Groups 的内部工具函数。 */
const flattenGroups = (groups: NormalizedGroup[]) => {
  return groups.flatMap(group => group.options)
}

/** find First Enabled Index 的内部工具函数。 */
const findFirstEnabledIndex = (options: NormalizedOption[]) => {
  return options.findIndex(option => !option.disabled)
}

/** 解析 Active Index 的内部工具函数。 */
const resolveActiveIndex = (
  options: NormalizedOption[],
  candidateIndex: number,
  defaultActiveFirstOption?: boolean,
) => {
  if (!options.length) return -1
  if (
    candidateIndex >= 0 &&
    candidateIndex < options.length &&
    !options[candidateIndex]?.disabled
  ) {
    return candidateIndex
  }
  if (defaultActiveFirstOption === false) {
    return -1
  }
  return findFirstEnabledIndex(options)
}

/** find Next Enabled Index 的内部工具函数。 */
const findNextEnabledIndex = (
  options: NormalizedOption[],
  currentIndex: number,
  direction: 1 | -1,
) => {
  if (!options.length) return -1

  let nextIndex = currentIndex
  const maxLoop = options.length

  for (let step = 0; step < maxLoop; step += 1) {
    nextIndex = (nextIndex + direction + options.length) % options.length
    if (!options[nextIndex]?.disabled) {
      return nextIndex
    }
  }

  return -1
}

/** 解析 Option Text 的内部工具函数。 */
const resolveOptionText = (option: AutoCompleteOption, optionLabelProp?: string) => {
  if (optionLabelProp && optionLabelProp !== 'value') {
    const candidate = option[optionLabelProp]
    if (typeof candidate === 'string' || typeof candidate === 'number') {
      return String(candidate)
    }
  }

  return resolveInputValue(option.value)
}

/** assign Forwarded Ref 的内部工具函数。 */
const assignForwardedRef = (forwardedRef: any, value: AutoCompleteRef | null) => {
  if (typeof forwardedRef === 'function') {
    forwardedRef(value)
    return
  }

  if (forwardedRef && typeof forwardedRef === 'object') {
    ;(forwardedRef as any).current = value ?? undefined
  }
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

/** Default Loading Content 的内部工具函数。 */
const DefaultLoadingContent: FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={mergeClassName(
        'flex items-center gap-2 px-3 py-2 text-sm text-base-content/65',
        className,
      )}
    >
      <span className="loading loading-spinner loading-xs" aria-hidden="true" />
      正在检索候选项
    </div>
  )
}

/** Auto Complete Root 的内部工具函数。 */
const AutoCompleteRoot: FC<AutoCompleteProps> = (
  {
    value,
    defaultValue,
    options,
    open,
    defaultOpen,
    disabled,
    readOnly,
    loading,
    placeholder,
    allowClear,
    backfill,
    defaultActiveFirstOption = true,
    filterOption,
    notFoundContent = '暂无匹配建议',
    popupMatchSelectWidth = true,
    optionLabelProp,
    placement = 'bottom',
    size,
    status,
    variant,
    prefix,
    suffix,
    className,
    style,
    rootClassName,
    controlClassName,
    inputClassName,
    popupClassName,
    clearButtonClassName,
    popupStyle,
    classNames,
    styles,
    onChange,
    onSearch,
    onSelect,
    onOpenChange,
    onClear,
    onFocus,
    onBlur,
    onKeyDown,
    onInputKeyDown,
    onPressEnter,
    onPopupScroll,
    ...rest
  },
  slots: Record<string, any> = {},
) => {
  const CompiledRow3 = ({ rowArg0, rowArg1 }: { rowArg0: any; rowArg1: any }) => {
    const CompiledRow4 = ({ rowArg0, rowArg1 }: { rowArg0: any; rowArg1: any }) => {
      const option = rowArg0
      const optionIndex = rowArg1

      const globalIndex = itemBaseIndex + optionIndex
      const active = computed(() => globalIndex === getResolvedActiveIndex())

      return (
        <button
          key={option.key}
          id={instanceId.value ? `${instanceId.value}-option-${option.key}` : undefined}
          type="button"
          role="option"
          data-rue-auto-complete-value={resolveOptionText(option.raw, optionLabelProp)}
          aria-selected={active.get() ? 'true' : 'false'}
          disabled={option.disabled}
          title={option.title}
          className={buildOptionButtonClassName(option)}
          style={{
            ...styles?.item,
            ...option.style,
          }}
          onMouseDown={(event: MouseEvent) => {
            if (typeof (event as any).preventDefault === 'function') {
              ;(event as any).preventDefault()
            }
          }}
          onMouseEnter={() => {
            highlightedIndex.value = globalIndex
            applyPreview(option)
            schedulePopupOptionStateSync()
          }}
          onClick={() => {
            selectOption(option)
          }}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{option.label}</span>
            {option.description !== undefined ? (
              <span className="mt-1 block truncate text-xs text-base-content/55">
                {option.description}
              </span>
            ) : null}
          </span>
        </button>
      )
    }

    const group = rowArg0
    const groupIndex = rowArg1

    let itemBaseIndex = 0
    const previousGroups = filteredGroupsState.value.slice(0, groupIndex)
    previousGroups.forEach(previousGroup => {
      itemBaseIndex += previousGroup.options.length
    })

    return (
      <div
        key={group.key}
        className={mergeClassName(
          group.label !== undefined ? 'px-2 pb-2 pt-1' : undefined,
          classNames?.group,
          group.className,
        )}
        style={{
          ...styles?.group,
          ...group.style,
        }}
      >
        {group.label !== undefined ? (
          <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-base-content/40">
            {group.label}
          </div>
        ) : null}
        <div className="space-y-1">
          {group.options.map((rowArg0: any, rowArg1: number) => (
            <CompiledRow4 rowArg0={rowArg0} rowArg1={rowArg1} />
          ))}
        </div>
      </div>
    )
  }

  const rootRef = useRef<HTMLDivElement>()
  const inputRef = useRef<HTMLInputElement>()
  const popupListRef = useRef<HTMLDivElement>()
  const inputFocusRestoreSnapshot = useRef<{
    shouldRestore: boolean
    selectionStart: number | null
    selectionEnd: number | null
  }>({
    ...DEFAULT_INPUT_FOCUS_RESTORE_SNAPSHOT,
  })
  const inputFocusRestoreRequestId = useRef(0)
  const componentDisposed = useRef(false)
  const forwardedRef = rest.ref
  const isControlled = value !== undefined
  const isOpenControlled = open !== undefined

  const getInputFocusRestoreSnapshot = () => {
    return inputFocusRestoreSnapshot.current ?? DEFAULT_INPUT_FOCUS_RESTORE_SNAPSHOT
  }

  const bumpInputFocusRestoreRequestId = () => {
    inputFocusRestoreRequestId.current = (inputFocusRestoreRequestId.current ?? 0) + 1
    return inputFocusRestoreRequestId.current
  }
  const suppressNextFocusOpen = useRef(false)
  const clearConfig = allowClear && typeof allowClear === 'object' ? allowClear : undefined
  const clearable = !!allowClear
  const dataTestId = rest['data-testid']
  const valueState = ref(resolveInputValue(isControlled ? value : defaultValue))
  const previewValue = ref<string | null>(null)
  const popupOpenState = ref(!!defaultOpen)
  const focused = ref(false)
  const composing = ref(false)
  const highlightedIndex = ref(-1)
  const instanceId = ref('')
  const normalizedGroupsState = ref<NormalizedGroup[]>(normalizeGroups(options))
  const filteredGroupsState = ref<NormalizedGroup[]>([])
  const filteredOptionsState = ref<NormalizedOption[]>([])
  const emptyStateVisible = ref(false)
  const popupVisibleState = ref(false)
  const lastControlledValue = ref<string | undefined>(undefined)
  const controlledValueSynced = ref(false)

  if ('ref' in rest) {
    delete rest.ref
  }

  const createApi = (): AutoCompleteRef => ({
    nativeElement: inputRef.current,
    focus: () => {
      inputRef.current?.focus()
    },
    blur: () => {
      inputRef.current?.blur()
    },
  })

  const syncForwardedRef = () => {
    assignForwardedRef(forwardedRef, inputRef.current ? createApi() : null)
  }

  const getDisplayedValue = () => previewValue.value ?? valueState.value

  const isClearButtonVisible = () => {
    return clearable && !disabled && !readOnly && getDisplayedValue().length > 0
  }

  const syncNativeValue = () => {
    const element = inputRef.current
    if (!element) return
    const nextValue = getDisplayedValue()
    if (element.value !== nextValue) {
      element.value = nextValue
    }
  }

  const syncNativeDataTestId = () => {
    const element = inputRef.current
    if (!element) return

    if (dataTestId === undefined || dataTestId === null) {
      element.removeAttribute('data-testid')
      return
    }

    element.setAttribute('data-testid', String(dataTestId))
  }

  const captureInputFocusSnapshot = (element: HTMLInputElement | null | undefined) => {
    if (!element) {
      inputFocusRestoreSnapshot.current = {
        ...DEFAULT_INPUT_FOCUS_RESTORE_SNAPSHOT,
      }
      return
    }

    const shouldRestore = element.ownerDocument.activeElement === element
    inputFocusRestoreSnapshot.current = {
      shouldRestore,
      selectionStart: element.selectionStart,
      selectionEnd: element.selectionEnd,
    }

    if (shouldRestore) {
      bumpInputFocusRestoreRequestId()
    }
  }

  const clearInputFocusSnapshot = () => {
    inputFocusRestoreSnapshot.current = {
      ...DEFAULT_INPUT_FOCUS_RESTORE_SNAPSHOT,
    }
  }

  const captureInputFocusIntent = (element: HTMLInputElement | null | undefined) => {
    if (!element) {
      return
    }

    inputFocusRestoreSnapshot.current = {
      shouldRestore: true,
      selectionStart: element.selectionStart,
      selectionEnd: element.selectionEnd,
    }
    bumpInputFocusRestoreRequestId()
  }

  const queueInputFocusRestore = ({
    selectionStart,
    selectionEnd,
    suppressOpen,
  }: {
    selectionStart: number | null
    selectionEnd: number | null
    suppressOpen?: boolean
  }) => {
    inputFocusRestoreSnapshot.current = {
      shouldRestore: true,
      selectionStart,
      selectionEnd,
    }
    bumpInputFocusRestoreRequestId()

    if (suppressOpen) {
      suppressNextFocusOpen.current = true
    }
  }

  const restoreInputFocusSnapshot = (element: HTMLInputElement | null | undefined) => {
    const snapshot = getInputFocusRestoreSnapshot()
    if (!element || !snapshot.shouldRestore) {
      return false
    }

    if (element.ownerDocument.activeElement !== element) {
      element.focus()
    }

    if (
      snapshot.selectionStart !== null &&
      snapshot.selectionEnd !== null &&
      typeof element.setSelectionRange === 'function'
    ) {
      const nextStart = Math.min(snapshot.selectionStart, element.value.length)
      const nextEnd = Math.min(snapshot.selectionEnd, element.value.length)
      element.setSelectionRange(nextStart, nextEnd)
    }

    return element.ownerDocument.activeElement === element
  }

  const scheduleInputFocusRestore = (
    requestId = inputFocusRestoreRequestId.current ?? 0,
    attempts = 8,
  ) => {
    setTimeout(() => {
      if (componentDisposed.current) {
        return
      }

      if (requestId !== (inputFocusRestoreRequestId.current ?? 0)) {
        return
      }

      restoreInputFocusSnapshot(inputRef.current)
      if (attempts > 1 && getInputFocusRestoreSnapshot().shouldRestore) {
        scheduleInputFocusRestore(requestId, attempts - 1)
        return
      }

      if (getInputFocusRestoreSnapshot().shouldRestore) {
        clearInputFocusSnapshot()
      }
    }, 16)
  }

  const clearPreview = () => {
    if (previewValue.value == null) return
    previewValue.value = null

    syncNativeValue()
  }

  const shouldIgnoreOpenTarget = (target: EventTarget | null) => {
    return (target as HTMLElement | null)?.closest('[data-rue-auto-complete-ignore-open="true"]')
  }

  const isInputOpenTarget = (target: EventTarget | null) => {
    const element = target as HTMLElement | null
    if (!element) {
      return false
    }

    return (
      element === inputRef.current || element.closest('input[role="combobox"]') === inputRef.current
    )
  }

  const isPopupRequestedOpen = () => {
    return isOpenControlled ? !!open : popupOpenState.value
  }

  const syncFilteredState = () => {
    normalizedGroupsState.value = normalizeGroups(options)
    filteredGroupsState.value = filterGroups(
      normalizedGroupsState.value,
      valueState.value,
      filterOption,
    )
    filteredOptionsState.value = flattenGroups(filteredGroupsState.value)

    const allOptionsCount = flattenGroups(normalizedGroupsState.value).length
    emptyStateVisible.value =
      !loading &&
      notFoundContent !== null &&
      ((allOptionsCount > 0 && filteredOptionsState.value.length === 0) ||
        (allOptionsCount === 0 && valueState.value.trim().length > 0))

    schedulePopupOptionStateSync()
  }

  const syncPopupVisibility = (requestedOpen = isPopupRequestedOpen()) => {
    popupVisibleState.value =
      !disabled &&
      !readOnly &&
      requestedOpen &&
      (loading || filteredOptionsState.value.length > 0 || emptyStateVisible.value)
  }

  const findSelectedOptionIndex = (options: NormalizedOption[]) => {
    if (!options.length || !valueState.value) {
      return -1
    }

    return options.findIndex(option => {
      return !option.disabled && resolveOptionText(option.raw, optionLabelProp) === valueState.value
    })
  }

  const resolveNavigableIndex = (options: NormalizedOption[]) => {
    if (
      highlightedIndex.value >= 0 &&
      highlightedIndex.value < options.length &&
      !options[highlightedIndex.value]?.disabled
    ) {
      return highlightedIndex.value
    }

    const selectedIndex = findSelectedOptionIndex(options)
    if (selectedIndex >= 0) {
      return selectedIndex
    }

    return resolveActiveIndex(options, highlightedIndex.value, defaultActiveFirstOption)
  }

  const buildOptionButtonClassName = (option: NormalizedOption) => {
    return mergeClassName(
      'flex w-full items-start gap-3 rounded-2xl px-3 py-2 text-left transition',
      option.disabled
        ? 'cursor-not-allowed text-base-content/35'
        : 'text-base-content/85 hover:bg-base-200/80 aria-selected:bg-primary/10 aria-selected:text-primary',
      classNames?.item,
      option.className,
    )
  }

  const syncPopupOptionState = () => {
    const resolvedActiveIndex = popupVisibleState.value
      ? resolveNavigableIndex(filteredOptionsState.value)
      : -1
    const popupListElement = popupListRef.current
    if (!popupListElement) {
      return
    }

    const optionNodes = Array.from(
      popupListElement.querySelectorAll<HTMLElement>('[role="option"]'),
    )
    if (resolvedActiveIndex >= 0) {
      optionNodes[resolvedActiveIndex]?.scrollIntoView?.({ block: 'nearest' })
    }
  }

  const schedulePopupOptionStateSync = () => {
    setTimeout(() => {
      if (componentDisposed.current) {
        return
      }

      syncPopupOptionState()
    }, 0)
  }

  const getResolvedActiveIndex = () => {
    return resolveNavigableIndex(filteredOptionsState.value)
  }

  const setPopupOpen = (nextOpen: boolean) => {
    const currentOpen = isPopupRequestedOpen()
    if (!isOpenControlled) {
      popupOpenState.value = nextOpen
    }

    if (currentOpen !== nextOpen && onOpenChange) {
      onOpenChange(nextOpen)
    }
    if (!nextOpen) {
      highlightedIndex.value = -1

      clearPreview()
    }
    syncPopupVisibility(nextOpen)
    schedulePopupOptionStateSync()
  }

  const applyPreview = (option: NormalizedOption | undefined) => {
    if (!backfill || !option || option.disabled) {
      clearPreview()
      return
    }

    const nextValue = resolveOptionText(option.raw, optionLabelProp)
    previewValue.value = nextValue

    syncNativeValue()

    const element = inputRef.current
    if (!element || document.activeElement !== element) return

    const selectionStart = Math.min(valueState.value.length, nextValue.length)
    element.setSelectionRange(selectionStart, nextValue.length)
  }

  const requestPopupOpen = () => {
    captureInputFocusSnapshot(inputRef.current)

    if (disabled || readOnly) {
      syncPopupVisibility(false)
      return
    }

    syncFilteredState()

    if (popupVisibleState.value || isPopupRequestedOpen()) {
      syncPopupVisibility(true)
      if (getInputFocusRestoreSnapshot().shouldRestore) {
        scheduleInputFocusRestore()
      }
      return
    }

    setPopupOpen(true)
    if (getInputFocusRestoreSnapshot().shouldRestore) {
      scheduleInputFocusRestore()
    }
  }

  const commitValue = (nextValue: string, options?: { emitSearch?: boolean }) => {
    valueState.value = nextValue
    previewValue.value = null

    syncNativeValue()
    syncFilteredState()
    syncPopupVisibility()
    if (onChange) {
      onChange(nextValue)
    }
    if (options?.emitSearch && onSearch && !composing.value) {
      onSearch(nextValue)
    }
  }

  const selectOption = (option: NormalizedOption) => {
    if (option.disabled) return

    const nextText = resolveOptionText(option.raw, optionLabelProp)
    queueInputFocusRestore({
      selectionStart: nextText.length,
      selectionEnd: nextText.length,
      suppressOpen: true,
    })
    commitValue(nextText)
    highlightedIndex.value = -1

    setPopupOpen(false)
    scheduleInputFocusRestore()
    if (onSelect) {
      onSelect(option.value, option.raw)
    }
  }

  const handleDocumentMouseDown = (event: MouseEvent) => {
    const rootElement = rootRef.current
    const target = event.target as Node | null
    if (rootElement && target && rootElement.contains(target)) {
      return
    }

    setPopupOpen(false)
  }

  const handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement | null
    const nextValue = target?.value ?? ''
    captureInputFocusSnapshot(target)
    previewValue.value = null
    valueState.value = nextValue
    highlightedIndex.value = -1

    syncFilteredState()
    if (!disabled && !readOnly) {
      setPopupOpen(true)
    } else {
      syncPopupVisibility(false)
    }
    if (!composing.value && onSearch) {
      onSearch(nextValue)
    }
    if (onChange) {
      onChange(nextValue)
    }
    scheduleInputFocusRestore()
  }

  const handleFocus = (event: FocusEvent) => {
    focused.value = true

    if (suppressNextFocusOpen.current) {
      suppressNextFocusOpen.current = false
    } else {
      requestPopupOpen()
    }
    if (onFocus) {
      onFocus(event)
    }
  }

  const handleControlMouseDown = (event: MouseEvent) => {
    if (shouldIgnoreOpenTarget(event.target)) {
      return
    }

    if (isInputOpenTarget(event.target)) {
      suppressNextFocusOpen.current = false
      captureInputFocusIntent(inputRef.current)
      setTimeout(() => {
        if (componentDisposed.current) {
          return
        }

        if (disabled || readOnly) {
          return
        }

        requestPopupOpen()
        if (getInputFocusRestoreSnapshot().shouldRestore) {
          scheduleInputFocusRestore()
        }
      }, 0)
      return
    }

    if ((event as any).button !== undefined && (event as any).button !== 0) {
      return
    }

    requestPopupOpen()
  }

  const handleControlClick = (event: MouseEvent) => {
    if (shouldIgnoreOpenTarget(event.target)) {
      return
    }

    if (isInputOpenTarget(event.target)) {
      return
    }

    requestPopupOpen()
  }

  const handleClick = (event: MouseEvent) => {
    requestPopupOpen()
    if (typeof rest.onClick === 'function') {
      rest.onClick(event)
    }
  }

  const handleBlur = (event: FocusEvent) => {
    const nextTarget = event.relatedTarget as Node | null

    if (
      !nextTarget &&
      (getInputFocusRestoreSnapshot().shouldRestore ||
        popupVisibleState.value ||
        isPopupRequestedOpen())
    ) {
      captureInputFocusIntent(inputRef.current)
      scheduleInputFocusRestore()
      return
    }

    focused.value = false

    if (!rootRef.current || !nextTarget || !rootRef.current.contains(nextTarget)) {
      setPopupOpen(false)
    }
    if (onBlur) {
      onBlur(event)
    }
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (onKeyDown) {
      onKeyDown(event)
    }
    if (onInputKeyDown) {
      onInputKeyDown(event)
    }

    const key = (event as any).key
    const flatOptions = filteredOptionsState.value
    const resolvedActiveIndex = resolveNavigableIndex(flatOptions)

    if (key === 'ArrowDown' || key === 'ArrowUp') {
      if (typeof (event as any).preventDefault === 'function') {
        ;(event as any).preventDefault()
      }

      if (!isPopupRequestedOpen()) {
        setPopupOpen(true)
      }

      const direction = key === 'ArrowDown' ? 1 : -1
      const baseIndex = resolvedActiveIndex < 0 ? (direction === 1 ? -1 : 0) : resolvedActiveIndex
      const nextIndex = findNextEnabledIndex(flatOptions, baseIndex, direction)
      highlightedIndex.value = nextIndex

      applyPreview(flatOptions[nextIndex])
      schedulePopupOptionStateSync()
      return
    }

    if (key === 'Enter') {
      const option = resolvedActiveIndex >= 0 ? flatOptions[resolvedActiveIndex] : undefined
      if (popupVisibleState.value && option) {
        if (typeof (event as any).preventDefault === 'function') {
          ;(event as any).preventDefault()
        }
        selectOption(option)
        return
      }

      if (onPressEnter) {
        onPressEnter(event)
      }
      return
    }

    if (key === 'Escape') {
      clearPreview()
      setPopupOpen(false)
      return
    }

    if (key === 'Tab') {
      clearPreview()
      setPopupOpen(false)
      return
    }
  }

  const handleCompositionStart = () => {
    composing.value = true
  }

  const handleCompositionEnd = (event: CompositionEvent) => {
    composing.value = false
    const target = event.target as HTMLInputElement | null
    const nextValue = target?.value ?? valueState.value
    captureInputFocusSnapshot(target)
    valueState.value = nextValue
    previewValue.value = null

    syncFilteredState()
    syncPopupVisibility()
    if (onSearch) {
      onSearch(nextValue)
    }
    scheduleInputFocusRestore()
  }

  const handleClear = (event: MouseEvent) => {
    if (typeof (event as any).preventDefault === 'function') {
      ;(event as any).preventDefault()
    }
    if (typeof (event as any).stopPropagation === 'function') {
      ;(event as any).stopPropagation()
    }

    commitValue('', { emitSearch: true })
    highlightedIndex.value = -1
    setPopupOpen(false)
    inputRef.current?.focus()
    if (onClear) {
      onClear(event)
    }
  }

  onMounted(() => {
    componentDisposed.current = false
    if (!instanceId.value) {
      autoCompleteIdSeed += 1
      instanceId.value = `rue-auto-complete-${autoCompleteIdSeed}`
    }
    syncFilteredState()
    syncPopupVisibility()
    syncForwardedRef()
    syncNativeValue()
    syncNativeDataTestId()
    document.addEventListener('mousedown', handleDocumentMouseDown)
  })

  onUnmounted(() => {
    componentDisposed.current = true
    bumpInputFocusRestoreRequestId()
    document.removeEventListener('mousedown', handleDocumentMouseDown)
    assignForwardedRef(forwardedRef, null)
  })

  watch(
    () => value,
    () => {
      const nextControlledValue = value === undefined ? undefined : resolveInputValue(value)
      const controlledValueChanged =
        !controlledValueSynced.value || nextControlledValue !== lastControlledValue.value

      controlledValueSynced.value = true
      lastControlledValue.value = nextControlledValue

      if (controlledValueChanged) {
        valueState.value =
          nextControlledValue === undefined ? valueState.value : nextControlledValue
        previewValue.value = null
        syncFilteredState()
      }

      syncPopupVisibility()
      syncNativeValue()
      syncNativeDataTestId()
    },
  )

  watch(
    () => options,
    () => {
      syncFilteredState()
      syncPopupVisibility()
    },
  )

  watch(
    () => filterOption,
    () => {
      syncFilteredState()
      syncPopupVisibility()
    },
  )

  watch(
    () => loading,
    () => {
      syncFilteredState()
      syncPopupVisibility()
    },
  )

  watch(
    () => open,
    () => {
      if (open === false) {
        clearPreview()
      }
      syncPopupVisibility()
    },
  )

  const resolvedActiveIndex = getResolvedActiveIndex()
  const popupId = instanceId.value ? `${instanceId.value}-listbox` : undefined
  const controlOptionalProps: Record<string, any> = {}
  if (disabled) {
    controlOptionalProps['aria-disabled'] = 'true'
  }

  const inputOptionalProps: Record<string, any> = {}
  if (disabled) {
    inputOptionalProps.disabled = true
  }
  if (readOnly) {
    inputOptionalProps.readOnly = true
  }
  if (placeholder !== undefined) {
    inputOptionalProps.placeholder = placeholder
  }
  if (popupVisibleState.value) {
    inputOptionalProps['aria-controls'] = popupId
  }
  if (popupVisibleState.value && resolvedActiveIndex >= 0 && instanceId.value) {
    inputOptionalProps['aria-activedescendant'] =
      `${instanceId.value}-option-${filteredOptionsState.value[resolvedActiveIndex]?.key}`
  }
  if (status === 'error') {
    inputOptionalProps['aria-invalid'] = 'true'
  } else if (rest['aria-invalid'] !== undefined) {
    inputOptionalProps['aria-invalid'] = rest['aria-invalid']
  }

  const popupWidthStyle =
    popupMatchSelectWidth === false
      ? undefined
      : typeof popupMatchSelectWidth === 'number'
        ? { width: `${popupMatchSelectWidth}px` }
        : { width: '100%' }

  return (
    <div
      ref={(element: HTMLDivElement | null) => {
        rootRef.current = element ?? undefined
      }}
      className={mergeClassName('relative w-full', className, rootClassName, classNames?.root)}
      style={{
        ...style,
        ...styles?.root,
      }}
      data-rue-auto-complete-root="true"
    >
      <label
        className={buildControlClassName({
          size,
          status,
          variant,
          className: mergeClassName(controlClassName, classNames?.control),
        })}
        style={styles?.control}
        {...controlOptionalProps}
        data-rue-auto-complete-control="true"
        onMouseDown={handleControlMouseDown}
        onClick={handleControlClick}
      >
        {prefix !== undefined ? (
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center self-center text-sm leading-none text-base-content/60">
            {String(prefix ?? '')}
          </span>
        ) : null}
        <input
          {...rest}
          {...inputOptionalProps}
          ref={(element: HTMLInputElement | null) => {
            inputRef.current = element ?? undefined
            if (element) {
              element.onkeydown = handleKeyDown
            }
            syncForwardedRef()
            syncNativeDataTestId()
            restoreInputFocusSnapshot(element ?? undefined)
          }}
          type={rest.type ?? 'text'}
          value={getDisplayedValue()}
          role="combobox"
          aria-activedescendant={
            popupVisibleState.value && getResolvedActiveIndex() >= 0 && instanceId.value
              ? `${instanceId.value}-option-${filteredOptionsState.value[getResolvedActiveIndex()]?.key}`
              : undefined
          }
          aria-autocomplete="list"
          aria-expanded={popupVisibleState.value ? 'true' : 'false'}
          className={mergeClassName(
            'min-w-0 w-0 flex-1 border-0 bg-transparent p-0 text-inherit outline-none placeholder:text-base-content/40',
            inputClassName,
            classNames?.input,
          )}
          style={styles?.input}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onClick={handleClick}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
        />
        {clearable ? (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Clear text"
            aria-hidden={isClearButtonVisible() ? undefined : 'true'}
            className={mergeClassName(
              'btn btn-ghost btn-xs btn-circle h-7 min-h-0 w-7 shrink-0 p-0 text-base-content/55 hover:text-base-content',
              !isClearButtonVisible() && 'pointer-events-none opacity-0',
              clearButtonClassName,
              classNames?.clear,
            )}
            style={styles?.clear}
            data-rue-auto-complete-ignore-open="true"
            onMouseDown={(event: MouseEvent) => {
              if (!isClearButtonVisible()) {
                return
              }

              if (typeof (event as any).preventDefault === 'function') {
                ;(event as any).preventDefault()
              }
            }}
            onClick={(event: MouseEvent) => {
              if (!isClearButtonVisible()) {
                return
              }

              handleClear(event)
            }}
          >
            {clearConfig?.clearIcon ? (
              <span>{String(clearConfig.clearIcon)}</span>
            ) : (
              <DefaultClearIcon />
            )}
          </button>
        ) : null}
        {suffix !== undefined ? (
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center self-center text-sm leading-none text-base-content/60">
            {String(suffix ?? '')}
          </span>
        ) : null}
      </label>
      {popupVisibleState.value ? (
        <div
          className={mergeClassName(
            'absolute z-30 overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-xl',
            !popupVisibleState.value && 'hidden',
            placement === 'top' ? 'bottom-[calc(100%+0.5rem)]' : 'top-[calc(100%+0.5rem)]',
            popupClassName,
            classNames?.popup,
          )}
          style={{
            ...popupWidthStyle,
            ...popupStyle,
            ...styles?.popup,
          }}
          data-rue-auto-complete-popup="true"
        >
          <div
            ref={(element: HTMLDivElement | null) => {
              popupListRef.current = element ?? undefined
              schedulePopupOptionStateSync()
            }}
            id={popupId}
            role="listbox"
            className={mergeClassName('max-h-80 overflow-y-auto py-2', classNames?.list)}
            style={styles?.list}
            onScroll={(event: Event) => {
              if (onPopupScroll) {
                onPopupScroll(event as Event)
              }
            }}
          >
            {popupVisibleState.value ? (
              loading ? (
                <DefaultLoadingContent className={classNames?.loading} />
              ) : filteredOptionsState.value.length > 0 ? (
                <>
                  {' '}
                  {filteredGroupsState.value.map((rowArg0: any, rowArg1: number) => (
                    <CompiledRow3 rowArg0={rowArg0} rowArg1={rowArg1} />
                  ))}{' '}
                </>
              ) : emptyStateVisible.value ? (
                <div
                  className={mergeClassName(
                    'px-3 py-2 text-sm text-base-content/55',
                    classNames?.empty,
                  )}
                  style={styles?.empty}
                >
                  {String(notFoundContent ?? '')}
                </div>
              ) : null
            ) : null}
          </div>
          {slots.footer ? <div>{slots.footer}</div> : null}
        </div>
      ) : null}
    </div>
  )
}

const AutoComplete = AutoCompleteRoot as FC<AutoCompleteProps>

/** 默认导出自动完成组件。 */
export default AutoComplete
