/*
TimePicker 组件概述
- 在 Rue 现有 input 视觉语义上补齐时间面板、12 小时制、步进、禁用时间、确认按钮与 RangePicker。
- 单值选择器优先保持表单输入心智：支持受控/非受控、手输校验、清空和自定义页脚。
- RangePicker 复用同一套内核，只组合两个时间输入并在输出阶段处理顺序与范围语义。
*/
import type { FC } from '@rue-js/rue'
import {
  Template,
  computed,
  effect,
  onMounted,
  onUnmounted,
  onUpdated,
  ref,
  toValue,
  useRef,
  watch,
} from '@rue-js/rue'

/** TimePickerSize 尺寸类型。 */
export type TimePickerSize =
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | 'small'
  | 'middle'
  | 'medium'
  | 'large'

/** TimePickerStatus 状态类型。 */
export type TimePickerStatus = 'warning' | 'error'
/** TimePickerVariant 视觉或语义变体类型。 */
export type TimePickerVariant = 'outlined' | 'filled' | 'ghost' | 'borderless'
/** TimePickerPlacement 位置或方向类型。 */
export type TimePickerPlacement = 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight'
/** TimePickerPanelColumn 类型。 */
export type TimePickerPanelColumn = 'hour' | 'minute' | 'second' | 'meridiem'
/** TimePickerChangeSource 类型。 */
export type TimePickerChangeSource = 'panel' | 'input' | 'clear' | 'now' | 'confirm'
/** TimeMeridiem 类型。 */
export type TimeMeridiem = 'am' | 'pm'
type MaybeReactiveValue<T> = T | { value: T }

interface InternalTimeSelection {
  hour: number
  minute: number
  second: number
}

interface TimePanelOption<T = string | number> {
  key: string
  value: T
  label: string
  disabled?: boolean
}

interface ScrollSnapshot {
  elements: Array<{
    left: number
    target: Element
    top: number
  }>
  view?: {
    left: number
    top: number
    window: Window
  }
}

type RuntimeGlobalRecord = typeof globalThis & {
  __rue?: unknown
}

interface TimePickerRuntimeConfig {
  format: string
  use12Hours: boolean
  hourStep: number
  minuteStep: number
  secondStep: number
  hideDisabledOptions: boolean
  disabledTime?: (selection: TimePickerValue | null) => TimePickerDisabledConfig | undefined
}

/** TimePickerValue 接口。 */
export interface TimePickerValue {
  /** hour 配置项。 */
  hour: number
  /** minute 配置项。 */
  minute: number
  /** second 配置项。 */
  second: number
  /** meridiem 配置项。 */
  meridiem: TimeMeridiem
  /** text 区域配置。 */
  text: string
}

/** TimePickerDisabledConfig 配置对象。 */
export interface TimePickerDisabledConfig {
  /** disabledHours 配置项。 */
  disabledHours?: () => number[]
  /** disabledMinutes 配置项。 */
  disabledMinutes?: (selectedHour: number) => number[]
  /** disabledSeconds 配置项。 */
  disabledSeconds?: (selectedHour: number, selectedMinute: number) => number[]
}

/** TimePickerCellRenderInfo 接口。 */
export interface TimePickerCellRenderInfo {
  /** subType 配置项。 */
  subType: TimePickerPanelColumn
  /** selected 配置项。 */
  selected: boolean
  /** 是否禁用交互。 */
  disabled: boolean
  /** 展示标签。 */
  label: string
}

/** TimePickerChangeInfo 接口。 */
export interface TimePickerChangeInfo {
  /** selection 配置项。 */
  selection: TimePickerValue | null
  /** source 配置项。 */
  source: TimePickerChangeSource
}

/** TimePickerAllowClearConfig 配置对象。 */
export interface TimePickerAllowClearConfig {
  /** 清空图标。 */
  clearIcon?: any
}

/** TimePickerProps 组件属性。 */
export interface TimePickerProps {
  /** 受控值。 */
  value?: MaybeReactiveValue<string | null>
  /** 非受控初始值。 */
  defaultValue?: string | null
  /** defaultOpenValue 值。 */
  defaultOpenValue?: string | null
  /** 受控打开状态。 */
  open?: boolean
  /** 非受控初始打开状态。 */
  defaultOpen?: boolean
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 是否允许一键清空。 */
  allowClear?: boolean | TimePickerAllowClearConfig
  /** clearLabel 标签内容。 */
  clearLabel?: string
  /** format 配置项。 */
  format?: string
  /** use12Hours 配置项。 */
  use12Hours?: boolean
  /** hourStep 配置项。 */
  hourStep?: number
  /** minuteStep 配置项。 */
  minuteStep?: number
  /** secondStep 配置项。 */
  secondStep?: number
  /** hideDisabledOptions 选项配置。 */
  hideDisabledOptions?: boolean
  /** inputReadOnly 配置项。 */
  inputReadOnly?: boolean
  /** needConfirm 配置项。 */
  needConfirm?: boolean
  /** showNow 配置项。 */
  showNow?: boolean
  /** nowLabel 标签内容。 */
  nowLabel?: string
  /** confirmLabel 标签内容。 */
  confirmLabel?: string
  /** changeOnScroll 配置项。 */
  changeOnScroll?: boolean
  /** 占位内容。 */
  placeholder?: string
  /** 弹出层或内容展示位置。 */
  placement?: TimePickerPlacement
  /** 组件状态。 */
  status?: TimePickerStatus
  /** 组件视觉变体。 */
  variant?: TimePickerVariant
  /** 组件尺寸。 */
  size?: TimePickerSize
  /** 前缀内容。 */
  prefix?: any
  /** suffixIcon 图标内容。 */
  suffixIcon?: any
  /** 输入前置附加内容。 */
  addonBefore?: any
  /** 输入后置附加内容。 */
  addonAfter?: any
  /** disabledTime 配置项。 */
  disabledTime?: (selection: TimePickerValue | null) => TimePickerDisabledConfig | undefined
  /** 根节点附加类名。 */
  rootClassName?: string
  /** popupClassName 附加类名。 */
  popupClassName?: string
  /** panelClassName 附加类名。 */
  panelClassName?: string
  /** inputClassName 附加类名。 */
  inputClassName?: string
  /** 根节点附加类名。 */
  className?: string
  /** 值或状态变化时触发的回调。 */
  onChange?: (value: string | null, timeString: string, info: TimePickerChangeInfo) => void
  /** onCalendarChange 事件回调。 */
  onCalendarChange?: (value: string | null, timeString: string, info: TimePickerChangeInfo) => void
  /** 打开状态变化时触发的回调。 */
  onOpenChange?: (open: boolean) => void
  /** onInput 事件回调。 */
  onInput?: (event: Event) => void
  /** 获得焦点时触发的回调。 */
  onFocus?: (event: FocusEvent) => void
  /** 失去焦点时触发的回调。 */
  onBlur?: (event: FocusEvent) => void
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** TimeRangePickerChangeInfo 接口。 */
export interface TimeRangePickerChangeInfo {
  /** range 配置项。 */
  range: 'start' | 'end' | 'clear'
  /** values 配置项。 */
  values: [TimePickerValue | null, TimePickerValue | null]
}

/** TimeRangePickerProps 组件属性。 */
export interface TimeRangePickerProps {
  /** 受控值。 */
  value?: MaybeReactiveValue<[string | null, string | null]>
  /** 非受控初始值。 */
  defaultValue?: [string | null, string | null]
  /** defaultOpenValue 值。 */
  defaultOpenValue?: [string | null, string | null] | string | null
  /** 是否禁用交互。 */
  disabled?: boolean | [boolean, boolean]
  /** 占位内容。 */
  placeholder?: string | [string, string]
  /** 是否允许一键清空。 */
  allowClear?: boolean | TimePickerAllowClearConfig
  /** order 配置项。 */
  order?: boolean
  /** separator 配置项。 */
  separator?: any
  /** format 配置项。 */
  format?: string
  /** use12Hours 配置项。 */
  use12Hours?: boolean
  /** hourStep 配置项。 */
  hourStep?: number
  /** minuteStep 配置项。 */
  minuteStep?: number
  /** secondStep 配置项。 */
  secondStep?: number
  /** hideDisabledOptions 选项配置。 */
  hideDisabledOptions?: boolean
  /** inputReadOnly 配置项。 */
  inputReadOnly?: boolean
  /** needConfirm 配置项。 */
  needConfirm?: boolean
  /** showNow 配置项。 */
  showNow?: boolean
  /** nowLabel 标签内容。 */
  nowLabel?: string
  /** confirmLabel 标签内容。 */
  confirmLabel?: string
  /** changeOnScroll 配置项。 */
  changeOnScroll?: boolean
  /** 组件状态。 */
  status?: TimePickerStatus
  /** 组件视觉变体。 */
  variant?: TimePickerVariant
  /** 组件尺寸。 */
  size?: TimePickerSize
  /** disabledTime 配置项。 */
  disabledTime?: (
    selection: TimePickerValue | null,
    type: 'start' | 'end',
  ) => TimePickerDisabledConfig | undefined
  /** 根节点附加类名。 */
  rootClassName?: string
  /** 根节点附加类名。 */
  className?: string
  /** pickerClassName 附加类名。 */
  pickerClassName?: string
  /** startPickerClassName 附加类名。 */
  startPickerClassName?: string
  /** endPickerClassName 附加类名。 */
  endPickerClassName?: string
  /** 值或状态变化时触发的回调。 */
  onChange?: (
    values: [string | null, string | null],
    timeStrings: [string, string],
    info: TimeRangePickerChangeInfo,
  ) => void
  /** onCalendarChange 事件回调。 */
  onCalendarChange?: (
    values: [string | null, string | null],
    timeStrings: [string, string],
    info: Exclude<TimeRangePickerChangeInfo['range'], 'clear'> extends never
      ? never
      : {
          range: 'start' | 'end'
          values: [TimePickerValue | null, TimePickerValue | null]
        },
  ) => void
}

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (...classNames: Array<string | undefined | null | false>) => {
  return classNames.filter(Boolean).join(' ')
}

/** clamp Number 的内部工具函数。 */
const clampNumber = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) return min
  return Math.min(Math.max(value, min), max)
}

/** 归一化 Step 的内部工具函数。 */
const normalizeStep = (value?: number) => {
  if (!value || !Number.isFinite(value) || value <= 0) return 1
  return Math.max(1, Math.floor(value))
}

/** pad Number 的内部工具函数。 */
const padNumber = (value: number, length = 2) => {
  return String(value).padStart(length, '0')
}

/** escape Reg Exp 的内部工具函数。 */
const escapeRegExp = (value: string) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 解析 Active Runtime 的内部工具函数。 */

/** 解析 Size Class 的内部工具函数。 */
const resolveSizeClass = (size?: TimePickerSize) => {
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

/** 解析 Variant Class Name 的内部工具函数。 */
const resolveVariantClassName = (variant?: TimePickerVariant) => {
  switch (variant) {
    case 'filled':
      return 'border-transparent bg-base-200/70 shadow-none focus-within:bg-base-100'
    case 'borderless':
      return 'input-ghost border-transparent bg-transparent shadow-none'
    case 'ghost':
      return 'input-ghost'
    default:
      return undefined
  }
}

/** 解析 Status Class Name 的内部工具函数。 */
const resolveStatusClassName = (status?: TimePickerStatus) => {
  switch (status) {
    case 'warning':
      return 'input-warning'
    case 'error':
      return 'input-error'
    default:
      return undefined
  }
}

/** 构建 Shell Class Name 的内部工具函数。 */
const buildShellClassName = ({
  status,
  size,
  variant,
  className,
}: {
  status?: TimePickerStatus
  size?: TimePickerSize
  variant?: TimePickerVariant
  className?: string
}) => {
  let cls = 'input flex w-full items-center gap-2'
  const resolvedSize = resolveSizeClass(size)
  const variantClassName = resolveVariantClassName(variant)
  const statusClassName = resolveStatusClassName(status)

  if (resolvedSize) cls += ` input-${resolvedSize}`
  if (variantClassName) cls += ` ${variantClassName}`
  if (statusClassName) cls += ` ${statusClassName}`
  if (className) cls += ` ${className}`
  return cls
}

/** 构建 Popup Class Name 的内部工具函数。 */
const buildPopupClassName = (placement: TimePickerPlacement, className?: string) => {
  const vertical = placement.startsWith('top') ? 'bottom-full mb-2' : 'top-full mt-2'
  const horizontal = placement.endsWith('Right') ? 'right-0' : 'left-0'
  return mergeClassName(
    'absolute z-30 min-w-[20rem] max-w-[min(92vw,30rem)] rounded-2xl border border-base-300 bg-base-100 p-3 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.55)]',
    vertical,
    horizontal,
    className,
  )
}

/** 解析 Format 的内部工具函数。 */
const resolveFormat = (format?: string, use12Hours?: boolean) => {
  if (format && format.trim()) return format
  return use12Hours ? 'h:mm:ss a' : 'HH:mm:ss'
}

/** 判断是否存在 Token 的内部工具函数。 */
const hasToken = (format: string, tokenPattern: RegExp) => {
  return tokenPattern.test(format)
}

/** 读取 Visible Columns 的内部工具函数。 */
const getVisibleColumns = (format: string, use12Hours?: boolean): TimePickerPanelColumn[] => {
  const columns: TimePickerPanelColumn[] = ['hour']
  if (hasToken(format, /m/)) columns.push('minute')
  if (hasToken(format, /s/)) columns.push('second')
  if (use12Hours || hasToken(format, /a|A/)) columns.push('meridiem')
  return columns
}

/** 读取 Meridiem 的内部工具函数。 */
const getMeridiem = (hour: number): TimeMeridiem => {
  return hour >= 12 ? 'pm' : 'am'
}

/** display Hour 的内部工具函数。 */
const displayHour = (hour: number) => {
  const value = hour % 12
  return value === 0 ? 12 : value
}

/** apply Meridiem To Hour 的内部工具函数。 */
const applyMeridiemToHour = (hour: number, meridiem: TimeMeridiem) => {
  const baseHour = displayHour(hour)
  if (meridiem === 'am') {
    return baseHour === 12 ? 0 : baseHour
  }
  return baseHour === 12 ? 12 : baseHour + 12
}

/** 归一化 Selection 的内部工具函数。 */
const normalizeSelection = (selection: InternalTimeSelection): InternalTimeSelection => {
  return {
    hour: clampNumber(selection.hour, 0, 23),
    minute: clampNumber(selection.minute, 0, 59),
    second: clampNumber(selection.second, 0, 59),
  }
}

/** selections Equal 的内部工具函数。 */
const selectionsEqual = (
  left: InternalTimeSelection | null | undefined,
  right: InternalTimeSelection | null | undefined,
) => {
  if (!left && !right) return true
  if (!left || !right) return false
  return left.hour === right.hour && left.minute === right.minute && left.second === right.second
}

/** selection To Comparable 的内部工具函数。 */
const selectionToComparable = (selection: InternalTimeSelection) => {
  return selection.hour * 3600 + selection.minute * 60 + selection.second
}

/** 构建 Parser 的内部工具函数。 */
const buildParser = (format: string) => {
  const tokenRegex = /(HH|H|hh|h|mm|m|ss|s|A|a)/g
  const parts: string[] = []
  const tokens: string[] = []
  let cursor = 0
  let matched: RegExpExecArray | null = null

  matched = tokenRegex.exec(format)
  while (matched) {
    const [token] = matched
    parts.push(escapeRegExp(format.slice(cursor, matched.index)))
    switch (token) {
      case 'HH':
      case 'hh':
        parts.push('(\\d{2})')
        break
      case 'H':
      case 'h':
      case 'mm':
      case 'm':
      case 'ss':
      case 's':
        parts.push('(\\d{1,2})')
        break
      case 'A':
      case 'a':
        parts.push('([aApP][mM])')
        break
      default:
        parts.push(escapeRegExp(token))
        break
    }
    tokens.push(token)
    cursor = matched.index + token.length
    matched = tokenRegex.exec(format)
  }

  parts.push(escapeRegExp(format.slice(cursor)))
  return {
    regex: new RegExp(`^${parts.join('')}$`, 'i'),
    tokens,
  }
}

/** parse Time String 的内部工具函数。 */
const parseTimeString = (
  rawValue: string | null | undefined,
  format: string,
  use12Hours?: boolean,
): InternalTimeSelection | null => {
  const value = rawValue == null ? '' : String(rawValue).trim()
  if (!value) return null

  const { regex, tokens } = buildParser(format)
  const match = regex.exec(value)
  if (!match) return null

  let hour = 0
  let minute = 0
  let second = 0
  let meridiem: TimeMeridiem | null = null

  tokens.forEach((token, index) => {
    const groupValue = match[index + 1] ?? ''
    switch (token) {
      case 'HH':
      case 'H':
        hour = Number(groupValue)
        break
      case 'hh':
      case 'h':
        hour = Number(groupValue)
        break
      case 'mm':
      case 'm':
        minute = Number(groupValue)
        break
      case 'ss':
      case 's':
        second = Number(groupValue)
        break
      case 'A':
      case 'a':
        meridiem = groupValue.toLowerCase() === 'pm' ? 'pm' : 'am'
        break
      default:
        break
    }
  })

  if (!Number.isFinite(hour) || !Number.isFinite(minute) || !Number.isFinite(second)) {
    return null
  }

  if (use12Hours || tokens.includes('hh') || tokens.includes('h') || meridiem) {
    if (hour < 1 || hour > 12) return null
    const normalizedMeridiem = meridiem ?? 'am'
    hour = applyMeridiemToHour(hour, normalizedMeridiem)
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
    return null
  }

  return {
    hour,
    minute,
    second,
  }
}

/** 将外部 value/defaultValue 规范化成输入框展示文本，避免受 format/use12Hours 差异影响。 */
const normalizeInputTextFromValue = (
  rawValue: string | null | undefined,
  format: string,
  use12Hours?: boolean,
) => {
  const parsed = parseTimeString(rawValue, format, use12Hours)
  return parsed ? formatTimeSelection(parsed, format) : ''
}

/** format Time Selection 的内部工具函数。 */
const formatTimeSelection = (selection: InternalTimeSelection, format: string) => {
  return format.replace(/HH|H|hh|h|mm|m|ss|s|A|a/g, token => {
    switch (token) {
      case 'HH':
        return padNumber(selection.hour)
      case 'H':
        return String(selection.hour)
      case 'hh':
        return padNumber(displayHour(selection.hour))
      case 'h':
        return String(displayHour(selection.hour))
      case 'mm':
        return padNumber(selection.minute)
      case 'm':
        return String(selection.minute)
      case 'ss':
        return padNumber(selection.second)
      case 's':
        return String(selection.second)
      case 'A':
        return getMeridiem(selection.hour).toUpperCase()
      case 'a':
        return getMeridiem(selection.hour)
      default:
        return token
    }
  })
}

/** 转换为 Time Picker Value 的内部工具函数。 */
const toTimePickerValue = (
  selection: InternalTimeSelection | null,
  format: string,
): TimePickerValue | null => {
  if (!selection) return null
  return {
    hour: selection.hour,
    minute: selection.minute,
    second: selection.second,
    meridiem: getMeridiem(selection.hour),
    text: formatTimeSelection(selection, format),
  }
}

/** 构建 Step Values 的内部工具函数。 */
const buildStepValues = (max: number, step: number) => {
  const resolvedStep = normalizeStep(step)
  const values: number[] = []
  for (let index = 0; index <= max; index += resolvedStep) {
    values.push(index)
  }
  if (!values.includes(max) && max === 59 && resolvedStep > 1 && 60 % resolvedStep !== 0) {
    values.push(max)
  }
  return values
}

/** find First Enabled Option 的内部工具函数。 */
const findFirstEnabledOption = <T,>(options: TimePanelOption<T>[]) => {
  return options.find(option => !option.disabled)
}

/** filter Disabled Options 的内部工具函数。 */
const filterDisabledOptions = <T,>(options: TimePanelOption<T>[], hideDisabledOptions: boolean) => {
  return hideDisabledOptions ? options.filter(option => !option.disabled) : options
}

/** 解析 Disabled Config 的内部工具函数。 */
const resolveDisabledConfig = (
  selection: InternalTimeSelection,
  config: TimePickerRuntimeConfig,
) => {
  return config.disabledTime?.(toTimePickerValue(selection, config.format))
}

/** 构建 Meridiem Options 的内部工具函数。 */
const buildMeridiemOptions = (
  selection: InternalTimeSelection,
  config: TimePickerRuntimeConfig,
  honorHideDisabled = true,
) => {
  const disabledConfig = resolveDisabledConfig(selection, config)
  const disabledHours = /*#__PURE__*/ new Set(disabledConfig?.disabledHours?.() ?? [])
  const steppedHours = buildStepValues(23, config.hourStep)
  const options: TimePanelOption<TimeMeridiem>[] = [
    {
      key: 'am',
      value: 'am',
      label: 'AM',
      disabled: !steppedHours.some(hour => hour < 12 && !disabledHours.has(hour)),
    },
    {
      key: 'pm',
      value: 'pm',
      label: 'PM',
      disabled: !steppedHours.some(hour => hour >= 12 && !disabledHours.has(hour)),
    },
  ]
  return filterDisabledOptions(options, honorHideDisabled && config.hideDisabledOptions)
}

/** 构建 Hour Options 的内部工具函数。 */
const buildHourOptions = (
  selection: InternalTimeSelection,
  config: TimePickerRuntimeConfig,
  honorHideDisabled = true,
) => {
  const disabledConfig = resolveDisabledConfig(selection, config)
  const disabledHours = /*#__PURE__*/ new Set(disabledConfig?.disabledHours?.() ?? [])
  const steppedHours = buildStepValues(23, config.hourStep)
  const currentMeridiem = getMeridiem(selection.hour)
  const visibleHours = config.use12Hours
    ? steppedHours.filter(hour => getMeridiem(hour) === currentMeridiem)
    : steppedHours
  const options = visibleHours.map(hour => ({
    key: `hour-${hour}`,
    value: hour,
    label: config.use12Hours ? padNumber(displayHour(hour)) : padNumber(hour),
    disabled: disabledHours.has(hour),
  }))
  return filterDisabledOptions(options, honorHideDisabled && config.hideDisabledOptions)
}

/** 构建 Minute Options 的内部工具函数。 */
const buildMinuteOptions = (
  selection: InternalTimeSelection,
  config: TimePickerRuntimeConfig,
  honorHideDisabled = true,
) => {
  const disabledConfig = resolveDisabledConfig(selection, config)
  const disabledMinutes = /*#__PURE__*/ new Set(
    disabledConfig?.disabledMinutes?.(selection.hour) ?? [],
  )
  const options = buildStepValues(59, config.minuteStep).map(value => ({
    key: `minute-${value}`,
    value,
    label: padNumber(value),
    disabled: disabledMinutes.has(value),
  }))
  return filterDisabledOptions(options, honorHideDisabled && config.hideDisabledOptions)
}

/** 构建 Second Options 的内部工具函数。 */
const buildSecondOptions = (
  selection: InternalTimeSelection,
  config: TimePickerRuntimeConfig,
  honorHideDisabled = true,
) => {
  const disabledConfig = resolveDisabledConfig(selection, config)
  const disabledSeconds = /*#__PURE__*/ new Set(
    disabledConfig?.disabledSeconds?.(selection.hour, selection.minute) ?? [],
  )
  const options = buildStepValues(59, config.secondStep).map(value => ({
    key: `second-${value}`,
    value,
    label: padNumber(value),
    disabled: disabledSeconds.has(value),
  }))
  return filterDisabledOptions(options, honorHideDisabled && config.hideDisabledOptions)
}

/** 读取 Column Options 的内部工具函数。 */
const getColumnOptions = (
  column: TimePickerPanelColumn,
  selection: InternalTimeSelection,
  config: TimePickerRuntimeConfig,
  honorHideDisabled = true,
) => {
  switch (column) {
    case 'hour':
      return buildHourOptions(selection, config, honorHideDisabled)
    case 'minute':
      return buildMinuteOptions(selection, config, honorHideDisabled)
    case 'second':
      return buildSecondOptions(selection, config, honorHideDisabled)
    case 'meridiem':
      return buildMeridiemOptions(selection, config, honorHideDisabled)
    default:
      return []
  }
}

/** sanitize Selection 的内部工具函数。 */
const sanitizeSelection = (
  rawSelection: InternalTimeSelection,
  config: TimePickerRuntimeConfig,
) => {
  const nextSelection = normalizeSelection(rawSelection)

  if (config.use12Hours) {
    const meridiemOptions = buildMeridiemOptions(nextSelection, config, false)
    const currentMeridiem = getMeridiem(nextSelection.hour)
    const activeMeridiem =
      meridiemOptions.find(option => option.value === currentMeridiem && !option.disabled) ??
      findFirstEnabledOption(meridiemOptions)

    if (activeMeridiem) {
      nextSelection.hour = applyMeridiemToHour(nextSelection.hour, activeMeridiem.value)
    }
  }

  const hourOption =
    buildHourOptions(nextSelection, config, false).find(
      option => option.value === nextSelection.hour && !option.disabled,
    ) ?? findFirstEnabledOption(buildHourOptions(nextSelection, config, false))

  if (hourOption) {
    nextSelection.hour = hourOption.value
  }

  const minuteOption =
    buildMinuteOptions(nextSelection, config, false).find(
      option => option.value === nextSelection.minute && !option.disabled,
    ) ?? findFirstEnabledOption(buildMinuteOptions(nextSelection, config, false))

  if (minuteOption) {
    nextSelection.minute = minuteOption.value
  }

  const secondOption =
    buildSecondOptions(nextSelection, config, false).find(
      option => option.value === nextSelection.second && !option.disabled,
    ) ?? findFirstEnabledOption(buildSecondOptions(nextSelection, config, false))

  if (secondOption) {
    nextSelection.second = secondOption.value
  }

  return nextSelection
}

/** now Selection 的内部工具函数。 */
const nowSelection = (): InternalTimeSelection => {
  const currentDate = new Date()
  return {
    hour: currentDate.getHours(),
    minute: currentDate.getMinutes(),
    second: currentDate.getSeconds(),
  }
}

/** apply Column Value 的内部工具函数。 */
const applyColumnValue = (
  selection: InternalTimeSelection,
  column: TimePickerPanelColumn,
  value: number | string,
) => {
  if (column === 'meridiem') {
    return {
      ...selection,
      hour: applyMeridiemToHour(selection.hour, value as TimeMeridiem),
    }
  }

  return {
    ...selection,
    [column]: Number(value),
  } as InternalTimeSelection
}

/** 解析 Column Heading 的内部工具函数。 */
const resolveColumnHeading = (column: TimePickerPanelColumn) => {
  switch (column) {
    case 'hour':
      return '时'
    case 'minute':
      return '分'
    case 'second':
      return '秒'
    case 'meridiem':
      return '时段'
    default:
      return ''
  }
}

const internalBlurCloseDelay = 32
const internalBlurPreserveWindow = 160
const internalSelectionScrollRestoreDelays = [0, internalBlurCloseDelay + 8, 120, 320, 720, 1200]
const focusWithoutScroll = (element: HTMLElement) => {
  element.focus({ preventScroll: true })
}

/** 解析 Current Column Value 的内部工具函数。 */
const resolveCurrentColumnValue = (
  column: TimePickerPanelColumn,
  selection: InternalTimeSelection,
) => {
  if (column === 'meridiem') {
    return getMeridiem(selection.hour)
  }
  return selection[column]
}

/** 解析 Default Selection 的内部工具函数。 */
const resolveDefaultSelection = (
  currentSelection: InternalTimeSelection | null,
  defaultOpenValue: string | null | undefined,
  config: TimePickerRuntimeConfig,
) => {
  const parsedDefaultOpen = parseTimeString(defaultOpenValue, config.format, config.use12Hours)
  return sanitizeSelection(parsedDefaultOpen ?? currentSelection ?? nowSelection(), config)
}

/** compare Range Values 的内部工具函数。 */
const compareRangeValues = (
  left: string | null,
  right: string | null,
  format: string,
  use12Hours?: boolean,
) => {
  const leftSelection = parseTimeString(left, format, use12Hours)
  const rightSelection = parseTimeString(right, format, use12Hours)
  if (!leftSelection || !rightSelection) return 0
  return selectionToComparable(leftSelection) - selectionToComparable(rightSelection)
}

/** 归一化 Range Value 的内部工具函数。 */
const normalizeRangeValue = (
  value?: [string | null, string | null],
): [string | null, string | null] => {
  if (!Array.isArray(value)) return [null, null]
  return [value[0] ?? null, value[1] ?? null]
}

/** range Values Equal 的内部工具函数。 */
const rangeValuesEqual = (
  left: [string | null, string | null],
  right: [string | null, string | null],
) => {
  return left[0] === right[0] && left[1] === right[1]
}

/** 归一化 Range Disabled 的内部工具函数。 */
const normalizeRangeDisabled = (disabled?: boolean | [boolean, boolean]): [boolean, boolean] => {
  if (Array.isArray(disabled)) {
    return [!!disabled[0], !!disabled[1]]
  }
  return [!!disabled, !!disabled]
}

/** 归一化 Range Placeholders 的内部工具函数。 */
const normalizeRangePlaceholders = (placeholder?: string | [string, string]): [string, string] => {
  if (Array.isArray(placeholder)) {
    return [placeholder[0] ?? '开始时间', placeholder[1] ?? '结束时间']
  }
  if (placeholder) {
    return [placeholder, placeholder]
  }
  return ['开始时间', '结束时间']
}

/** 归一化 Default Open Values 的内部工具函数。 */
const normalizeDefaultOpenValues = (
  defaultOpenValue?: [string | null, string | null] | string | null,
): [string | null, string | null] => {
  if (Array.isArray(defaultOpenValue)) {
    return [defaultOpenValue[0] ?? null, defaultOpenValue[1] ?? null]
  }
  return [defaultOpenValue ?? null, defaultOpenValue ?? null]
}

/** Addon 的内部工具函数。 */
const Addon: FC<{ children: any }> = ({ children }) => {
  return (
    <span className="join-item inline-flex items-center border border-base-300 bg-base-200 px-3 text-sm text-base-content/65">
      {children}
    </span>
  )
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

/** Clock Icon 的内部工具函数。 */
const ClockIcon: FC<{ iconRef?: { current?: SVGSVGElement } }> = ({ iconRef }) => {
  return (
    <svg
      ref={iconRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-4 transition-transform duration-150"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5v5l3 1.8" />
    </svg>
  )
}

/** Time Picker Root 的内部工具函数。 */
const TimePickerRoot: FC<TimePickerProps> = (props, slots: Record<string, any> = {}) => {
  const {
    defaultValue,
    defaultOpenValue,
    open,
    defaultOpen = false,
    disabled,
    allowClear,
    clearLabel = '清空时间',
    format,
    use12Hours = false,
    hourStep = 1,
    minuteStep = 1,
    secondStep = 1,
    hideDisabledOptions = false,
    inputReadOnly = false,
    needConfirm = false,
    showNow = true,
    nowLabel = '此刻',
    confirmLabel = '确定',
    changeOnScroll = false,
    placeholder = '请选择时间',
    placement = 'bottomLeft',
    status,
    variant,
    size,
    prefix,
    suffixIcon,
    addonBefore,
    addonAfter,
    disabledTime,
    rootClassName,
    popupClassName,
    panelClassName,
    inputClassName,
    className,
    onChange,
    onCalendarChange,
    onOpenChange,
    onInput,
    onFocus,
    onBlur,
    ...rest
  } = props
  const readControlledValue = () => toValue(props.value as any) as string | null | undefined
  const rootRef = useRef<HTMLDivElement>()
  const shellRef = useRef<HTMLLabelElement>()
  const inputRef = useRef<HTMLInputElement>()
  const popupRef = useRef<HTMLDivElement>()
  /** fast popup 模式下单独承载 renderExtraFooter 的 Rue 子树。 */
  const clearButtonRef = useRef<HTMLButtonElement>()
  const defaultSuffixIconRef = useRef<SVGSVGElement>()
  const preservePopupOnInternalBlur = useRef(false)
  const suppressNextFocusOpen = useRef(false)
  const forwardedRef = rest.ref
  const isControlledOpen = open !== undefined
  const allowClearConfig = allowClear && typeof allowClear === 'object' ? allowClear : undefined
  const resolvedFormatValue = resolveFormat(format, use12Hours)
  const visibleColumns = getVisibleColumns(resolvedFormatValue, use12Hours)
  const initialInputText = normalizeInputTextFromValue(
    readControlledValue() !== undefined ? readControlledValue() : defaultValue,
    resolvedFormatValue,
    use12Hours,
  )
  const popupOpen = ref(isControlledOpen ? !!open : !!defaultOpen)
  const inputText = ref(initialInputText)
  const lastSyncedPropInputText = useRef(initialInputText)
  const committedSelection = ref<InternalTimeSelection | null>(null)
  const draftSelection = ref<InternalTimeSelection | null>(null)
  const blurTimer = useRef<ReturnType<typeof setTimeout>>()
  const internalBlurPreserveTimer = useRef<ReturnType<typeof setTimeout>>()
  const suppressFocusOpenTimer = useRef<ReturnType<typeof setTimeout>>()
  const popupRefocusTimer = useRef<ReturnType<typeof setTimeout>>()
  const scrollRestoreFrames = /*#__PURE__*/ new Map<Window, Set<number>>()
  const scrollRestoreTimers = /*#__PURE__*/ new Map<Window, Set<number>>()
  const runtimeConfig = (): TimePickerRuntimeConfig => ({
    format: resolvedFormatValue,
    use12Hours,
    hourStep,
    minuteStep,
    secondStep,
    hideDisabledOptions,
    disabledTime,
  })
  const withCallbackRuntime = <T,>(runner: () => T) => runner()

  if ('ref' in rest) {
    delete rest.ref
  }

  const clearPopupInternalInteraction = () => {
    preservePopupOnInternalBlur.current = false
    if (internalBlurPreserveTimer.current) {
      clearTimeout(internalBlurPreserveTimer.current)
      internalBlurPreserveTimer.current = undefined
    }
  }

  const markPopupInternalInteraction = () => {
    preservePopupOnInternalBlur.current = true
    if (internalBlurPreserveTimer.current) {
      clearTimeout(internalBlurPreserveTimer.current)
    }
    internalBlurPreserveTimer.current = setTimeout(() => {
      preservePopupOnInternalBlur.current = false
      internalBlurPreserveTimer.current = undefined
    }, internalBlurPreserveWindow)
  }

  const focusInputWithoutOpeningPopup = () => {
    const input = inputRef.current
    if (!input) return

    if (input.ownerDocument.activeElement === input) {
      return
    }

    suppressNextFocusOpen.current = true
    if (suppressFocusOpenTimer.current) {
      clearTimeout(suppressFocusOpenTimer.current)
    }
    suppressFocusOpenTimer.current = setTimeout(() => {
      suppressNextFocusOpen.current = false
      suppressFocusOpenTimer.current = undefined
    }, 0)
    focusWithoutScroll(input)
  }

  const captureDocumentScroll = (): ScrollSnapshot | null => {
    const ownerDocument = rootRef.current?.ownerDocument ?? inputRef.current?.ownerDocument
    if (!ownerDocument) {
      return null
    }

    const elements: ScrollSnapshot['elements'] = []
    const addTarget = (target?: Element | null) => {
      if (!target || elements.some(item => item.target === target)) return
      elements.push({
        target,
        top: target.scrollTop,
        left: target.scrollLeft,
      })
    }

    let current: Element | null = rootRef.current ?? inputRef.current ?? null
    while (current) {
      addTarget(current)
      current = current.parentElement
    }

    addTarget(ownerDocument.scrollingElement)
    addTarget(ownerDocument.documentElement)
    addTarget(ownerDocument.body)

    const ownerWindow = ownerDocument.defaultView
    return {
      elements,
      view: ownerWindow
        ? {
            window: ownerWindow,
            top: ownerWindow.scrollY,
            left: ownerWindow.scrollX,
          }
        : undefined,
    }
  }

  const restoreDocumentScroll = (snapshot: ScrollSnapshot | null) => {
    if (!snapshot) return
    snapshot.elements.forEach(item => {
      item.target.scrollLeft = item.left
      item.target.scrollTop = item.top
    })
    if (
      snapshot.view &&
      (snapshot.view.window.scrollX !== snapshot.view.left ||
        snapshot.view.window.scrollY !== snapshot.view.top)
    ) {
      snapshot.view.window.scrollTo(snapshot.view.left, snapshot.view.top)
    }
  }

  const keepPopupRootInView = () => {
    const root = rootRef.current
    if (!root || !root.isConnected || !popupOpen.value) return
    if (typeof root.scrollIntoView !== 'function') return

    const ownerWindow = root.ownerDocument.defaultView
    const viewportHeight =
      ownerWindow?.innerHeight ?? root.ownerDocument.documentElement.clientHeight
    const rect = root.getBoundingClientRect()
    if (rect.top < 0 || rect.bottom > viewportHeight) {
      root.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
  }

  const restoreDocumentScrollAroundPopup = (snapshot: ScrollSnapshot | null) => {
    restoreDocumentScroll(snapshot)
    keepPopupRootInView()
  }

  const preserveDocumentScrollAfterInternalSelection = (snapshot: ScrollSnapshot | null) => {
    if (!snapshot) return
    const ownerWindow =
      snapshot.view?.window ?? (typeof window === 'undefined' ? undefined : window)

    restoreDocumentScrollAroundPopup(snapshot)
    const frameId = ownerWindow?.requestAnimationFrame?.(() => {
      if (frameId !== undefined) {
        scrollRestoreFrames.get(ownerWindow)?.delete(frameId)
      }
      restoreDocumentScrollAroundPopup(snapshot)
    })
    if (ownerWindow && frameId !== undefined) {
      const frames = scrollRestoreFrames.get(ownerWindow) ?? new Set<number>()
      frames.add(frameId)
      scrollRestoreFrames.set(ownerWindow, frames)
    }
    internalSelectionScrollRestoreDelays.forEach(delay => {
      const timerId = ownerWindow?.setTimeout(() => {
        if (timerId !== undefined) {
          scrollRestoreTimers.get(ownerWindow)?.delete(timerId)
        }
        restoreDocumentScrollAroundPopup(snapshot)
      }, delay)
      if (ownerWindow && timerId !== undefined) {
        const timers = scrollRestoreTimers.get(ownerWindow) ?? new Set<number>()
        timers.add(timerId)
        scrollRestoreTimers.set(ownerWindow, timers)
      }
    })
  }

  const syncInputText = (selection: InternalTimeSelection | null) => {
    inputText.value = selection ? formatTimeSelection(selection, resolvedFormatValue) : ''
  }

  const assignInputRef = (element: HTMLInputElement | null) => {
    inputRef.current = element ?? undefined
    if (element) element.readOnly = !!inputReadOnly

    if (typeof forwardedRef === 'function') {
      forwardedRef(element)
      return
    }
    if (forwardedRef && typeof forwardedRef === 'object') {
      ;(forwardedRef as any).current = element ?? undefined
    }
  }

  const assignPopupRef = (element: HTMLDivElement | null) => {
    popupRef.current = element ?? undefined
    if (!element) return
    effect(() => {
      element.hidden = !popupOpen.value || !!disabled
    })
  }

  const setPopupOpen = (nextOpen: boolean) => {
    if (disabled) return
    if (!isControlledOpen && popupOpen.value === nextOpen) {
      return
    }
    if (!isControlledOpen) {
      popupOpen.value = nextOpen
    }
    if (nextOpen) {
      draftSelection.value = resolveDefaultSelection(
        committedSelection.value ?? null,
        defaultOpenValue,
        runtimeConfig(),
      )
    }

    if (onOpenChange) {
      withCallbackRuntime(() => {
        onOpenChange(nextOpen)
      })
    }
  }

  const emitCalendarChange = (
    selection: InternalTimeSelection | null,
    source: Extract<TimePickerChangeSource, 'panel' | 'input' | 'now'>,
  ) => {
    if (!onCalendarChange) return
    const timeString = selection ? formatTimeSelection(selection, resolvedFormatValue) : ''
    withCallbackRuntime(() => {
      onCalendarChange(timeString ? timeString : null, timeString, {
        selection: toTimePickerValue(selection, resolvedFormatValue),
        source,
      })
    })
  }

  const schedulePopupRefocus = () => {
    if (popupRefocusTimer.current !== undefined) {
      clearTimeout(popupRefocusTimer.current)
    }
    popupRefocusTimer.current = setTimeout(() => {
      popupRefocusTimer.current = undefined
      if (!inputRef.current || disabled) {
        return
      }

      setPopupOpen(true)

      if (inputRef.current.ownerDocument.activeElement !== inputRef.current) {
        focusWithoutScroll(inputRef.current)
      }
    }, 0)
  }

  const commitSelection = (
    selection: InternalTimeSelection | null,
    source: TimePickerChangeSource,
  ) => {
    const nextSelection = selection ? sanitizeSelection(selection, runtimeConfig()) : null
    const previousSelection = committedSelection.value ?? null
    const previousText = previousSelection
      ? formatTimeSelection(previousSelection, resolvedFormatValue)
      : ''
    const nextText = nextSelection ? formatTimeSelection(nextSelection, resolvedFormatValue) : ''

    committedSelection.value = nextSelection ? { ...nextSelection } : null
    syncInputText(nextSelection)

    if (popupOpen.value && (source === 'panel' || source === 'now')) {
    }

    if (previousText === nextText && source !== 'clear') {
      return
    }

    if (onChange) {
      withCallbackRuntime(() => {
        onChange(nextText ? nextText : null, nextText, {
          selection: toTimePickerValue(nextSelection, resolvedFormatValue),
          source,
        })
      })
    }
  }

  const syncFromProps = () => {
    const controlledValue = readControlledValue()
    const sourceValue = controlledValue !== undefined ? controlledValue : defaultValue
    const parsed = parseTimeString(sourceValue, resolvedFormatValue, use12Hours)
    const nextSelection = parsed ? sanitizeSelection(parsed, runtimeConfig()) : null
    const nextInputText = nextSelection
      ? formatTimeSelection(nextSelection, resolvedFormatValue)
      : ''
    const shouldSyncDraft = controlledValue !== undefined || !popupOpen.value || !needConfirm
    const nextDraftSelection = shouldSyncDraft
      ? resolveDefaultSelection(nextSelection, defaultOpenValue, runtimeConfig())
      : null
    const committedChanged = !selectionsEqual(committedSelection.value ?? null, nextSelection)
    const inputChanged = (inputText.value ?? '') !== nextInputText
    const draftChanged =
      shouldSyncDraft && !selectionsEqual(draftSelection.value ?? null, nextDraftSelection)
    const shouldPreserveFocusedControlledInput =
      controlledValue !== undefined &&
      inputRef.current?.ownerDocument.activeElement === inputRef.current &&
      lastSyncedPropInputText.current === nextInputText

    if (committedChanged) {
      committedSelection.value = nextSelection ? { ...nextSelection } : null
    }

    if (inputChanged && !shouldPreserveFocusedControlledInput) {
      inputText.value = nextInputText
    }

    if (draftChanged) {
      draftSelection.value = nextDraftSelection ? { ...nextDraftSelection } : null
    }

    if (controlledValue !== undefined) {
      lastSyncedPropInputText.current = nextInputText
    }

    if (committedChanged || inputChanged || draftChanged || popupOpen.value) {
    } else {
    }
  }

  const getActiveSelection = () => {
    return (
      draftSelection.value ??
      resolveDefaultSelection(committedSelection.value ?? null, defaultOpenValue, runtimeConfig())
    )
  }

  const RenderPopupContent = () => {
    const activeSelection = computed(() => getActiveSelection())
    const CompiledRow1 = ({ rowArg0 }: { rowArg0: any }) => {
      const CompiledRow2 = ({ rowArg0 }: { rowArg0: any }) => {
        const option = rowArg0

        const selected = option.value === selectedValue.get()
        return (
          <button
            key={option.key}
            type="button"
            disabled={option.disabled}
            aria-selected={selected ? 'true' : 'false'}
            data-rue-time-selected={selected ? 'true' : 'false'}
            data-rue-time-column={column}
            data-rue-time-option={String(option.value)}
            className={mergeClassName(
              'flex w-full items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors duration-150',
              option.disabled
                ? 'cursor-not-allowed border-transparent opacity-35'
                : selected
                  ? 'border-primary bg-primary text-primary-content shadow-[0_14px_28px_-20px_rgba(59,130,246,0.95)]'
                  : 'border-transparent text-base-content/75 hover:bg-base-200',
            )}
            onPointerDown={preventPopupButtonBlur}
            onMouseDown={preventPopupButtonBlur}
            onClick={() => handlePanelSelection(column, option.value)}
          >
            {String(option.label)}
          </button>
        )
      }

      const column = rowArg0

      const options = computed(() =>
        getColumnOptions(column, activeSelection.get(), runtimeConfig(), true),
      )
      const selectedValue = computed(() => resolveCurrentColumnValue(column, activeSelection.get()))

      return (
        <div
          key={column}
          className="min-w-0 rounded-xl border border-base-300/70 bg-base-100/85 p-2"
        >
          <div className="mb-2 px-2 text-[11px] uppercase tracking-[0.2em] text-base-content/45">
            {String(resolveColumnHeading(column))}
          </div>
          <div
            className="max-h-56 space-y-1 overflow-y-auto pr-1"
            onWheel={(event: WheelEvent) => {
              if (!changeOnScroll) return
              event.preventDefault()
              stepColumn(column, event.deltaY > 0 ? 1 : -1)
            }}
          >
            {options.get().length ? (
              <>
                {' '}
                {options.get().map((rowArg0: any, rowIndex: number) => (
                  <CompiledRow2 rowArg0={rowArg0} />
                ))}{' '}
              </>
            ) : (
              <div className="px-2 py-6 text-center text-sm text-base-content/40">暂无可选项</div>
            )}
          </div>
        </div>
      )
    }

    return (
      <div
        className={mergeClassName(
          'rounded-[1.1rem] bg-gradient-to-br from-base-100 via-base-100 to-base-200/55 p-1',
          panelClassName,
        )}
        data-rue-time-picker-popup-content="true"
      >
        <div
          className="grid gap-2 px-2 pt-2"
          style={{ gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(0, 1fr))` }}
        >
          {visibleColumns.map((rowArg0: any, rowIndex: number) => (
            <CompiledRow1 rowArg0={rowArg0} />
          ))}
        </div>

        <div className="mt-3 border-t border-base-300/70 px-2 pt-3">
          {slots.footer ? (
            <div className="mb-3 text-sm text-base-content/65">{slots.footer}</div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-base-content/45">
              {changeOnScroll ? '支持滚轮快速切换' : '点击列表项完成选择'}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {showNow ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onPointerDown={preventPopupButtonBlur}
                  onMouseDown={preventPopupButtonBlur}
                  onClick={handleNowClick}
                >
                  {String(nowLabel)}
                </button>
              ) : null}
              {needConfirm ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  data-rue-time-confirm="true"
                  onPointerDown={preventPopupButtonBlur}
                  onMouseDown={preventPopupButtonBlur}
                  onClick={handleConfirm}
                >
                  {String(confirmLabel)}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handlePanelSelection = (
    column: TimePickerPanelColumn,
    optionValue: number | string,
    source: Extract<TimePickerChangeSource, 'panel' | 'now'> = 'panel',
  ) => {
    const scrollSnapshot = captureDocumentScroll()
    markPopupInternalInteraction()
    const currentSelection = getActiveSelection()
    const nextSelection = sanitizeSelection(
      applyColumnValue(currentSelection, column, optionValue),
      runtimeConfig(),
    )
    draftSelection.value = { ...nextSelection }
    if (needConfirm) {
    }
    emitCalendarChange(nextSelection, source)

    if (!needConfirm) {
      commitSelection(nextSelection, source)
      if (source === 'panel') {
        schedulePopupRefocus()
      }
    }

    preserveDocumentScrollAfterInternalSelection(scrollSnapshot)
  }

  const handleNowClick = () => {
    const scrollSnapshot = captureDocumentScroll()
    markPopupInternalInteraction()
    const nextSelection = sanitizeSelection(nowSelection(), runtimeConfig())
    draftSelection.value = { ...nextSelection }
    if (needConfirm) {
    }
    emitCalendarChange(nextSelection, 'now')

    if (!needConfirm) {
      commitSelection(nextSelection, 'now')
    }

    preserveDocumentScrollAfterInternalSelection(scrollSnapshot)
  }

  const resetDraftSelection = () => {
    draftSelection.value = resolveDefaultSelection(
      committedSelection.value ?? null,
      defaultOpenValue,
      runtimeConfig(),
    )
  }

  const applyInputTextValue = () => {
    const trimmedText = (inputText.value ?? '').trim()

    if (!trimmedText) {
      draftSelection.value = resolveDefaultSelection(null, defaultOpenValue, runtimeConfig())
      commitSelection(null, 'clear')
      return
    }

    const parsed = parseTimeString(trimmedText, resolvedFormatValue, use12Hours)
    if (!parsed) {
      syncInputText(committedSelection.value ?? null)
      resetDraftSelection()

      return
    }

    const nextSelection = sanitizeSelection(parsed, runtimeConfig())
    draftSelection.value = { ...nextSelection }
    emitCalendarChange(nextSelection, 'input')
    commitSelection(nextSelection, 'input')
  }

  const handleClear = (event: MouseEvent) => {
    if (typeof event.preventDefault === 'function') {
      event.preventDefault()
    }
    if (typeof event.stopPropagation === 'function') {
      event.stopPropagation()
    }
    commitSelection(null, 'clear')
    resetDraftSelection()
    clearPopupInternalInteraction()
    setPopupOpen(false)
    focusInputWithoutOpeningPopup()
  }

  const handleConfirm = () => {
    clearPopupInternalInteraction()
    commitSelection(draftSelection.value ?? null, 'confirm')
    setPopupOpen(false)
  }

  const preventPopupButtonBlur = (event: MouseEvent | PointerEvent) => {
    markPopupInternalInteraction()
    if (typeof (event as any).preventDefault === 'function') {
      ;(event as any).preventDefault()
    }
  }

  const handleInput = (event: Event) => {
    inputText.value = (event.target as HTMLInputElement | null)?.value ?? ''

    if (onInput) {
      withCallbackRuntime(() => {
        onInput(event)
      })
    }
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' && !popupOpen.value) {
      event.preventDefault()
      setPopupOpen(true)
      return
    }

    if (event.key === 'Escape') {
      syncInputText(committedSelection.value ?? null)
      resetDraftSelection()
      clearPopupInternalInteraction()
      setPopupOpen(false)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (needConfirm && popupOpen.value) {
        handleConfirm()
        return
      }
      applyInputTextValue()
      clearPopupInternalInteraction()
      setPopupOpen(false)
    }
  }

  const handleFocus = (event: FocusEvent) => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current)
      blurTimer.current = undefined
    }
    if (suppressNextFocusOpen.current) {
      suppressNextFocusOpen.current = false
      if (suppressFocusOpenTimer.current) {
        clearTimeout(suppressFocusOpenTimer.current)
        suppressFocusOpenTimer.current = undefined
      }
    } else {
      setPopupOpen(true)
    }
    if (onFocus) {
      withCallbackRuntime(() => {
        onFocus(event)
      })
    }
  }

  const handleBlur = (event: FocusEvent) => {
    if (onBlur) {
      withCallbackRuntime(() => {
        onBlur(event)
      })
    }
    blurTimer.current = setTimeout(() => {
      if (preservePopupOnInternalBlur.current) {
        if (!popupOpen.value) {
          setPopupOpen(true)
        }
        if (inputRef.current) {
          focusWithoutScroll(inputRef.current)
        }
        return
      }
      if (rootRef.current?.contains(document.activeElement)) {
        return
      }
      applyInputTextValue()
      setPopupOpen(false)
    }, internalBlurCloseDelay)
  }

  const stepColumn = (column: TimePickerPanelColumn, direction: 1 | -1) => {
    if (!changeOnScroll) return
    const selection = getActiveSelection()
    const options = getColumnOptions(column, selection, runtimeConfig(), true).filter(
      option => !option.disabled,
    )
    if (!options.length) return

    const currentValue = resolveCurrentColumnValue(column, selection)
    const currentIndex = options.findIndex(option => option.value === currentValue)
    const baseIndex = currentIndex >= 0 ? currentIndex : 0
    const nextIndex = (baseIndex + direction + options.length) % options.length
    handlePanelSelection(column, options[nextIndex].value)
  }

  onMounted(() => {
    syncFromProps()

    if (typeof window === 'undefined') return

    const handleWindowPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.isConnected) {
        window.removeEventListener('pointerdown', handleWindowPointerDown, true)
        window.removeEventListener('keydown', handleWindowKeyDown)
        return
      }
      if (!popupOpen.value) return
      const target = event.target as Node | null
      if (!target) return
      if (rootRef.current?.contains(target)) return
      clearPopupInternalInteraction()
      applyInputTextValue()
      setPopupOpen(false)
    }

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (rootRef.current && !rootRef.current.isConnected) {
        window.removeEventListener('pointerdown', handleWindowPointerDown, true)
        window.removeEventListener('keydown', handleWindowKeyDown)
        return
      }
      if (!popupOpen.value || event.key !== 'Escape') return
      syncInputText(committedSelection.value ?? null)
      resetDraftSelection()
      clearPopupInternalInteraction()
      setPopupOpen(false)
    }

    window.addEventListener('pointerdown', handleWindowPointerDown, true)
    window.addEventListener('keydown', handleWindowKeyDown)

    onUnmounted(() => {
      if (blurTimer.current) {
        clearTimeout(blurTimer.current)
      }
      if (internalBlurPreserveTimer.current) {
        clearTimeout(internalBlurPreserveTimer.current)
      }
      if (suppressFocusOpenTimer.current) {
        clearTimeout(suppressFocusOpenTimer.current)
      }
      if (popupRefocusTimer.current !== undefined) {
        clearTimeout(popupRefocusTimer.current)
        popupRefocusTimer.current = undefined
      }
      scrollRestoreFrames.forEach((frameIds, ownerWindow) => {
        frameIds.forEach(frameId => ownerWindow.cancelAnimationFrame?.(frameId))
      })
      scrollRestoreFrames.clear()
      scrollRestoreTimers.forEach((timerIds, ownerWindow) => {
        timerIds.forEach(timerId => ownerWindow.clearTimeout(timerId))
      })
      scrollRestoreTimers.clear()
      window.removeEventListener('pointerdown', handleWindowPointerDown, true)
      window.removeEventListener('keydown', handleWindowKeyDown)
    })
  })

  onUpdated(() => {
    syncFromProps()
  })

  watch(
    () => readControlledValue(),
    () => {
      syncFromProps()
    },
    { immediate: true },
  )

  watch(
    () => defaultValue,
    () => {
      if (readControlledValue() === undefined) {
        syncFromProps()
      }
    },
  )

  watch(
    () => open,
    () => {
      if (open !== undefined) {
        popupOpen.value = !!open
      }
    },
    { immediate: true },
  )

  const hasAddons = addonBefore !== undefined || addonAfter !== undefined
  return (
    <div ref={rootRef} className={mergeClassName('relative', rootClassName)}>
      <div className={hasAddons ? 'join w-full items-stretch' : undefined}>
        {addonBefore !== undefined ? <Addon>{addonBefore}</Addon> : null}
        <label
          ref={shellRef}
          className={buildShellClassName({
            status,
            size,
            variant,
            className: mergeClassName(
              className,
              hasAddons ? 'join-item min-w-0 flex-1' : undefined,
            ),
          })}
          aria-disabled={disabled ? 'true' : undefined}
          data-rue-time-picker="true"
        >
          {prefix !== undefined ? (
            <span className="shrink-0 text-sm text-base-content/60">{prefix}</span>
          ) : null}
          <input
            {...rest}
            ref={assignInputRef}
            type="text"
            data-testid={rest['data-testid']}
            value={inputText.value ?? ''}
            disabled={disabled ? true : undefined}
            placeholder={placeholder}
            aria-invalid={status === 'error' ? 'true' : rest['aria-invalid']}
            className={mergeClassName(
              'min-w-0 w-0 flex-1 border-0 bg-transparent p-0 text-inherit outline-none placeholder:text-base-content/40',
              inputClassName,
            )}
            onClick={() => {
              if (!popupOpen.value) {
                setPopupOpen(true)
              }
            }}
            onInput={handleInput}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
          <button
            ref={clearButtonRef}
            type="button"
            tabIndex={-1}
            aria-label={clearLabel}
            className={mergeClassName(
              'btn btn-ghost btn-xs btn-circle h-7 min-h-0 w-7 shrink-0 p-0 text-base-content/55 hover:text-base-content',
              !(allowClear && !disabled && inputText.value?.length) && 'hidden',
            )}
            data-rue-time-clear="true"
            onClick={handleClear}
          >
            {allowClearConfig?.clearIcon ? (
              String(allowClearConfig.clearIcon)
            ) : (
              <DefaultClearIcon />
            )}
          </button>
          <span className="shrink-0 text-base-content/55">
            {suffixIcon ? String(suffixIcon) : <ClockIcon iconRef={defaultSuffixIconRef} />}
          </span>
        </label>
        {addonAfter !== undefined ? <Addon>{addonAfter}</Addon> : null}
      </div>
      <div
        ref={assignPopupRef}
        role="dialog"
        aria-label="Time picker panel"
        aria-hidden={popupOpen.value && !disabled ? 'false' : 'true'}
        className={mergeClassName(
          buildPopupClassName(placement, popupClassName),
          popupOpen.value && !disabled ? undefined : 'hidden',
        )}
        data-rue-time-picker-popup="true"
      >
        <RenderPopupContent />
      </div>
    </div>
  )
}

/** Range Picker 的内部工具函数。 */
const RangePicker: FC<TimeRangePickerProps> = ({
  value,
  defaultValue,
  defaultOpenValue,
  disabled,
  placeholder,
  allowClear,
  order = true,
  separator,
  format,
  use12Hours,
  hourStep,
  minuteStep,
  secondStep,
  hideDisabledOptions,
  inputReadOnly,
  needConfirm,
  showNow,
  nowLabel,
  confirmLabel,
  changeOnScroll,
  status,
  variant,
  size,
  disabledTime,
  rootClassName,
  className,
  pickerClassName,
  startPickerClassName,
  endPickerClassName,
  onChange,
  onCalendarChange,
}) => {
  const mergedFormat = resolveFormat(format, use12Hours)
  const placeholders = normalizeRangePlaceholders(placeholder)
  const disabledFlags = normalizeRangeDisabled(disabled)
  const defaultOpenValues = normalizeDefaultOpenValues(defaultOpenValue)
  const renderVersion = ref(0)
  const internalValues = ref<[string | null, string | null]>(normalizeRangeValue(defaultValue))
  const readControlledRangeValue = () =>
    toValue(value as any) as [string | null, string | null] | undefined

  const requestRender = () => {
    renderVersion.value += 1
  }

  const getCurrentValues = () => {
    return internalValues.value
  }

  watch(
    () => readControlledRangeValue(),
    () => {
      const controlledValue = readControlledRangeValue()
      if (controlledValue !== undefined) {
        const nextValues = normalizeRangeValue(controlledValue)
        if (!rangeValuesEqual(internalValues.value, nextValues)) {
          internalValues.value = nextValues
          requestRender()
        }
      }
    },
    { immediate: true },
  )

  const commitRangeChange = (
    index: 0 | 1,
    nextValue: string | null,
    source: 'start' | 'end' | 'clear',
    emitCalendarOnly = false,
  ) => {
    const nextValues = [...getCurrentValues()] as [string | null, string | null]
    nextValues[index] = nextValue

    if (order && nextValues[0] && nextValues[1]) {
      if (compareRangeValues(nextValues[0], nextValues[1], mergedFormat, use12Hours) > 0) {
        nextValues.reverse()
      }
    }

    if (!emitCalendarOnly) {
      internalValues.value = nextValues
      requestRender()
    }

    const selectionValues: [TimePickerValue | null, TimePickerValue | null] = [
      toTimePickerValue(parseTimeString(nextValues[0], mergedFormat, use12Hours), mergedFormat),
      toTimePickerValue(parseTimeString(nextValues[1], mergedFormat, use12Hours), mergedFormat),
    ]

    if (emitCalendarOnly) {
      if (onCalendarChange) {
        onCalendarChange(nextValues, [nextValues[0] ?? '', nextValues[1] ?? ''], {
          range: index === 0 ? 'start' : 'end',
          values: selectionValues,
        })
      }
      return
    }

    if (onChange) {
      onChange(nextValues, [nextValues[0] ?? '', nextValues[1] ?? ''], {
        range: source,
        values: selectionValues,
      })
    }
  }

  const currentValues = getCurrentValues()

  return (
    <div
      className={mergeClassName(
        'flex w-full max-w-full items-center gap-2',
        rootClassName,
        className,
      )}
      data-rue-time-range-picker-version={String(renderVersion.value)}
    >
      <TimePickerRoot
        value={currentValues[0]}
        defaultOpenValue={defaultOpenValues[0]}
        disabled={disabledFlags[0]}
        placeholder={placeholders[0]}
        allowClear={allowClear}
        format={mergedFormat}
        use12Hours={use12Hours}
        hourStep={hourStep}
        minuteStep={minuteStep}
        secondStep={secondStep}
        hideDisabledOptions={hideDisabledOptions}
        inputReadOnly={inputReadOnly}
        needConfirm={needConfirm}
        showNow={showNow}
        nowLabel={String(nowLabel)}
        confirmLabel={String(confirmLabel)}
        changeOnScroll={changeOnScroll}
        status={status}
        variant={variant}
        size={size}
        disabledTime={selection => disabledTime?.(selection, 'start')}
        rootClassName="min-w-0 flex-1"
        className={mergeClassName(pickerClassName, startPickerClassName)}
        onChange={nextValue => {
          commitRangeChange(0, nextValue, nextValue ? 'start' : 'clear')
        }}
        onCalendarChange={nextValue => {
          commitRangeChange(0, nextValue, 'start', true)
        }}
      />
      <span className="shrink-0 text-sm text-base-content/45">{separator ?? '至'}</span>
      <TimePickerRoot
        value={currentValues[1]}
        defaultOpenValue={defaultOpenValues[1]}
        disabled={disabledFlags[1]}
        placeholder={placeholders[1]}
        allowClear={allowClear}
        format={mergedFormat}
        use12Hours={use12Hours}
        hourStep={hourStep}
        minuteStep={minuteStep}
        secondStep={secondStep}
        hideDisabledOptions={hideDisabledOptions}
        inputReadOnly={inputReadOnly}
        needConfirm={needConfirm}
        showNow={showNow}
        nowLabel={String(nowLabel)}
        confirmLabel={String(confirmLabel)}
        changeOnScroll={changeOnScroll}
        status={status}
        variant={variant}
        size={size}
        disabledTime={selection => disabledTime?.(selection, 'end')}
        rootClassName="min-w-0 flex-1"
        className={mergeClassName(pickerClassName, endPickerClassName)}
        onChange={nextValue => {
          commitRangeChange(1, nextValue, nextValue ? 'end' : 'clear')
        }}
        onCalendarChange={nextValue => {
          commitRangeChange(1, nextValue, 'end', true)
        }}
      />
    </div>
  )
}

type TimePickerCompound = FC<TimePickerProps> & {
  RangePicker: FC<TimeRangePickerProps>
}

const TimePickerComponent: FC<TimePickerProps> = (props, slots: Record<string, any> = {}) => {
  return (
    <div className="contents">
      <TimePickerRoot {...props}>
        <Template slot="footer">{slots.footer}</Template>
      </TimePickerRoot>
    </div>
  )
}

const TimePicker: TimePickerCompound = TimePickerComponent as TimePickerCompound

TimePicker.RangePicker = RangePicker

/** 默认导出时间选择器组件。 */
export default TimePicker

export { RangePicker as TimePickerRangePicker }
