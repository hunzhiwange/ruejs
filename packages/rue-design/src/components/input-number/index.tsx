/*
InputNumber 组件概述
- 基于 Rue Input 的视觉壳层扩展数值输入语义，复用 prefix/suffix、addon、状态与变体能力。
- 补齐核心交互：受控/非受控、formatter/parser、precision、步进按钮、键盘与滚轮、blur 归一化。
- 默认保持文本输入，不依赖原生 type=number，避免浏览器内建步进与格式化行为干扰。
*/
import type { FC } from '@rue-js/rue'
import { computed, ref } from '@rue-js/rue'
import type {
  InputAllowClearConfig,
  InputColor,
  InputProps,
  InputShowCountConfig,
  InputShowCountInfo,
  InputSize,
  InputStatus,
  InputTone,
  InputVariant,
} from '../input'

/** InputNumberValue 值类型。 */
export type InputNumberValue = number | string
/** InputNumberEmitter 类型。 */
export type InputNumberEmitter = 'handler' | 'keydown' | 'wheel'

/** InputNumberFormatterInfo 接口。 */
export interface InputNumberFormatterInfo {
  /** userTyping 配置项。 */
  userTyping: boolean
  /** input 区域配置。 */
  input: string
}

/** InputNumberControlsConfig 配置对象。 */
export interface InputNumberControlsConfig {
  /** upIcon 图标内容。 */
  upIcon?: any
  /** downIcon 图标内容。 */
  downIcon?: any
}

/** InputNumberStepInfo 接口。 */
export interface InputNumberStepInfo {
  /** offset 配置项。 */
  offset: number
  /** 组件类型或语义类型。 */
  type: 'up' | 'down'
  /** emitter 配置项。 */
  emitter: InputNumberEmitter
}

/** InputNumberProps 组件属性。 */
export interface InputNumberProps extends Omit<
  InputProps,
  'type' | 'value' | 'defaultValue' | 'onChange'
> {
  /** 受控值。 */
  value?: InputNumberValue | null
  /** 非受控初始值。 */
  defaultValue?: InputNumberValue
  /** min 配置项。 */
  min?: InputNumberValue
  /** max 配置项。 */
  max?: InputNumberValue
  /** step 配置项。 */
  step?: InputNumberValue
  /** precision 配置项。 */
  precision?: number
  /** stringMode 配置项。 */
  stringMode?: boolean
  /** keyboard 配置项。 */
  keyboard?: boolean
  /** changeOnWheel 配置项。 */
  changeOnWheel?: boolean
  /** changeOnBlur 配置项。 */
  changeOnBlur?: boolean
  /** controls 配置项。 */
  controls?: boolean | InputNumberControlsConfig
  /** decimalSeparator 配置项。 */
  decimalSeparator?: string
  /** 组件语义色。 */
  color?: InputColor
  /** 组件尺寸。 */
  size?: InputSize
  /** 组件状态。 */
  status?: InputStatus
  /** 组件视觉变体。 */
  variant?: InputVariant
  /** readOnly 配置项。 */
  readOnly?: boolean
  /** formatter 配置项。 */
  formatter?: (value: InputNumberValue | null, info: InputNumberFormatterInfo) => string
  /** parser 配置项。 */
  parser?: (input: string) => number | string | null | undefined
  /** 值或状态变化时触发的回调。 */
  onChange?: (value: InputNumberValue | null) => void
  /** onStep 事件回调。 */
  onStep?: (value: InputNumberValue, info: InputNumberStepInfo) => void
  /** 失去焦点时触发的回调。 */
  onBlur?: (event: FocusEvent) => void
  /** 获得焦点时触发的回调。 */
  onFocus?: (event: FocusEvent) => void
  /** onWheel 事件回调。 */
  onWheel?: (event: WheelEvent) => void
  /** onCompositionStart 事件回调。 */
  onCompositionStart?: (event: CompositionEvent) => void
  /** onCompositionEnd 事件回调。 */
  onCompositionEnd?: (event: CompositionEvent) => void
}

interface ParsedInputNumberValue {
  display: string
  normalized: string
  numeric?: number
  empty: boolean
  transient: boolean
}

interface InputNumberControlVisualConfig {
  buttonClassName: string
  iconClassName: string
  groupClassName: string
  suffixClassName: string
}

type InputNumberStepHandler = (
  type: InputNumberStepInfo['type'],
  emitter: InputNumberEmitter,
  event?: Event,
) => void

const STEP_REPEAT_START_DELAY = 450
const STEP_REPEAT_INTERVAL = 80
const activeControlStepRepeats = /*#__PURE__*/ new WeakMap<Window, () => void>()
const controlStepRepeatWindows = /*#__PURE__*/ new WeakSet<Window>()

const registerControlStepRepeat = (targetWindow: Window, stop: () => void) => {
  activeControlStepRepeats.set(targetWindow, stop)
  if (controlStepRepeatWindows.has(targetWindow)) return

  const stopActiveRepeat = () => {
    const activeStop = activeControlStepRepeats.get(targetWindow)
    activeControlStepRepeats.delete(targetWindow)
    activeStop?.()
  }
  targetWindow.addEventListener('pointerup', stopActiveRepeat)
  targetWindow.addEventListener('pointercancel', stopActiveRepeat)
  targetWindow.addEventListener('mouseup', stopActiveRepeat)
  targetWindow.addEventListener('blur', stopActiveRepeat)
  controlStepRepeatWindows.add(targetWindow)
}

interface InputNumberControlsProps {
  controlsConfig?: InputNumberControlsConfig
  visualConfig: InputNumberControlVisualConfig
  onPointerStepStart: (type: InputNumberStepInfo['type'], event: PointerEvent) => void
  onMouseStepStart: (type: InputNumberStepInfo['type'], event: MouseEvent) => void
  onClickStep: (type: InputNumberStepInfo['type'], event: MouseEvent) => void
}

interface InputNumberSuffixProps extends InputNumberControlsProps {
  suffix?: any
  showControls: boolean
}

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (...classNames: Array<string | undefined | false | null>) => {
  return classNames.filter(Boolean).join(' ')
}

/** 解析 Control Size 的内部工具函数。 */
const resolveControlSize = (size?: InputSize) => {
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

/** 解析 Input Size Class 的内部工具函数。 */
const resolveInputSizeClass = (size?: InputSize) => {
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

/** 解析 Input Status Tone 的内部工具函数。 */
const resolveInputStatusTone = (status?: InputStatus) => {
  switch (status) {
    case 'warning':
      return 'warning' as InputTone
    case 'error':
      return 'error' as InputTone
    default:
      return undefined
  }
}

/** 解析 Input Variant Class Name 的内部工具函数。 */
const resolveInputVariantClassName = (variant?: InputVariant, ghost?: boolean) => {
  const resolvedVariant = ghost ? 'ghost' : variant
  switch (resolvedVariant) {
    case 'filled':
      return 'border-transparent bg-base-200/70 shadow-none focus-within:bg-base-100'
    case 'borderless':
      return 'input-ghost bg-transparent border-transparent shadow-none'
    case 'ghost':
      return 'input-ghost'
    default:
      return undefined
  }
}

/** 构建 Input Class Name 的内部工具函数。 */
const buildInputClassName = ({
  color,
  status,
  size,
  variant,
  ghost,
  className,
  shell,
}: {
  color?: InputColor
  status?: InputStatus
  size?: InputSize
  variant?: InputVariant
  ghost?: boolean
  className?: string
  shell?: boolean
}) => {
  let cls = 'input'
  const resolvedTone = color && color !== 'default' ? color : resolveInputStatusTone(status)
  const resolvedSize = resolveInputSizeClass(size)
  const variantClassName = resolveInputVariantClassName(variant, ghost)

  if (resolvedTone) cls += ` input-${resolvedTone}`
  if (resolvedSize) cls += ` input-${resolvedSize}`
  if (variantClassName) cls += ` ${variantClassName}`
  if (shell) cls += ' flex items-center gap-2'
  if (className) cls += ` ${className}`
  return cls
}

/** 渲染 Count Content 的内部工具函数。 */
const renderCountContent = (
  showCount: boolean | InputShowCountConfig | undefined,
  info: InputShowCountInfo,
) => {
  if (showCount && typeof showCount === 'object' && typeof showCount.formatter === 'function') {
    return showCount.formatter(info)
  }
  if (typeof info.maxLength === 'number') {
    return `${info.count} / ${info.maxLength}`
  }
  return String(info.count)
}

/** stringify Content 的内部工具函数。 */
const stringifyContent = (content: any) => {
  if (content == null) return ''
  return typeof content === 'string' ? content : String(content)
}

/** read Max Length 的内部工具函数。 */
const readMaxLength = (props: Record<string, any>) => {
  if (typeof props.maxLength === 'number') return props.maxLength
  if (typeof props.maxlength === 'number') return props.maxlength
  return undefined
}

/** 解析 Control Visual Config 的内部工具函数。 */
const resolveControlVisualConfig = (size?: InputSize): InputNumberControlVisualConfig => {
  switch (resolveControlSize(size)) {
    case 'xs':
      return {
        buttonClassName: 'btn-xs w-3.5 rounded-[4px] px-0 text-[10px]',
        iconClassName: 'size-2',
        groupClassName: 'gap-0',
        suffixClassName: 'gap-1',
      }
    case 'sm':
      return {
        buttonClassName: 'btn-xs w-4.5 rounded',
        iconClassName: 'size-2.5',
        groupClassName: 'gap-px',
        suffixClassName: 'gap-1.5',
      }
    case 'lg':
      return {
        buttonClassName: 'btn-sm w-7 rounded-md',
        iconClassName: 'size-3',
        groupClassName: 'gap-px',
        suffixClassName: 'gap-2',
      }
    case 'xl':
      return {
        buttonClassName: 'btn-sm w-8 rounded-lg',
        iconClassName: 'size-3',
        groupClassName: 'gap-px',
        suffixClassName: 'gap-2',
      }
    default:
      return {
        buttonClassName: 'btn-xs w-6 rounded-md',
        iconClassName: 'size-3',
        groupClassName: 'gap-px',
        suffixClassName: 'gap-2',
      }
  }
}

/** 转换为 Finite Number 的内部工具函数。 */
const toFiniteNumber = (value: any) => {
  const nextValue = Number(value)
  return Number.isFinite(nextValue) ? nextValue : undefined
}

/** 归一化 Negative Zero 的内部工具函数。 */
const normalizeNegativeZero = (value: number) => {
  return Object.is(value, -0) ? 0 : value
}

/** round With Precision 的内部工具函数。 */
const roundWithPrecision = (value: number, precision?: number) => {
  if (typeof precision !== 'number' || precision < 0) {
    return normalizeNegativeZero(value)
  }
  const factor = 10 ** precision
  return normalizeNegativeZero(Math.round(value * factor) / factor)
}

/** count Fraction Digits 的内部工具函数。 */
const countFractionDigits = (value: string | number | undefined) => {
  if (value == null) return 0
  const text = String(value).toLowerCase()
  if (text.includes('e-')) {
    const [coefficient, exponentText] = text.split('e-')
    const exponent = Number(exponentText)
    const fractionLength = coefficient.includes('.')
      ? coefficient.length - coefficient.indexOf('.') - 1
      : 0
    return fractionLength + exponent
  }
  return text.includes('.') ? text.length - text.indexOf('.') - 1 : 0
}

/** 解析 Bounds 的内部工具函数。 */
const resolveBounds = (min?: InputNumberValue, max?: InputNumberValue) => {
  const resolvedMin = toFiniteNumber(min) ?? Number.MIN_SAFE_INTEGER
  const resolvedMax = toFiniteNumber(max) ?? Number.MAX_SAFE_INTEGER

  if (resolvedMax < resolvedMin) {
    return {
      min: resolvedMax,
      max: resolvedMin,
    }
  }

  return {
    min: resolvedMin,
    max: resolvedMax,
  }
}

/** 解析 Step 的内部工具函数。 */
const resolveStep = (step?: InputNumberValue) => {
  const resolved = toFiniteNumber(step) ?? 1
  return resolved > 0 ? resolved : 1
}

/** clamp 的内部工具函数。 */
const clamp = (value: number, min: number, max: number) => {
  if (value < min) return min
  if (value > max) return max
  return value
}

/** 转换为 Display Decimal 的内部工具函数。 */
const toDisplayDecimal = (value: string, decimalSeparator?: string) => {
  if (decimalSeparator && decimalSeparator !== '.') {
    return value.replace('.', decimalSeparator)
  }
  return value
}

/** sanitize Numeric Input 的内部工具函数。 */
const sanitizeNumericInput = (input: string, decimalSeparator?: string) => {
  const separator = decimalSeparator === ',' ? ',' : '.'
  const normalizedInput = typeof input.normalize === 'function' ? input.normalize('NFKC') : input
  const trimmed = normalizedInput.trim()

  if (!trimmed) return ''

  let sign = ''
  let body = trimmed
  if (body.startsWith('-')) {
    sign = '-'
    body = body.slice(1)
  }

  body = body.replace(/-/g, '')

  if (separator === ',') {
    body = body.replace(/\./g, '')
  } else {
    body = body.replace(/,/g, '')
  }

  body = body.replace(separator === ',' ? /[^0-9,]/g : /[^0-9.]/g, '')

  const parts = body.split(separator)
  const integerPart = parts.shift() ?? ''
  const fractionPart = parts.join('')
  const hasSeparator = body.includes(separator)

  return `${sign}${integerPart}${hasSeparator ? `.${fractionPart}` : ''}`
}

/** 判断 Transient Numeric Text 的内部工具函数。 */
const isTransientNumericText = (value: string) => {
  return value === '-' || value === '.' || value === '-.'
}

/** 归一化 Committed Value 的内部工具函数。 */
const normalizeCommittedValue = (
  value: InputNumberValue | null | undefined,
  stringMode: boolean,
  decimalSeparator?: string,
): InputNumberValue | null => {
  if (value == null || value === '') return null

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    return stringMode ? String(normalizeNegativeZero(value)) : normalizeNegativeZero(value)
  }

  const normalized = sanitizeNumericInput(String(value), decimalSeparator)
  if (!normalized || isTransientNumericText(normalized)) return null

  const numeric = toFiniteNumber(normalized)
  if (numeric === undefined) return null

  return stringMode ? normalized : normalizeNegativeZero(numeric)
}

/** serialize Numeric Value 的内部工具函数。 */
const serializeNumericValue = (
  numeric: number,
  stringMode: boolean,
  precision?: number,
  preserveText?: string,
): InputNumberValue => {
  const rounded = roundWithPrecision(numeric, precision)

  if (stringMode) {
    if (typeof precision === 'number' && precision >= 0) {
      return rounded.toFixed(precision)
    }
    if (
      preserveText &&
      !isTransientNumericText(preserveText) &&
      toFiniteNumber(preserveText) !== undefined
    ) {
      return preserveText
    }
    return String(rounded)
  }

  return rounded
}

/** format Committed Text 的内部工具函数。 */
const formatCommittedText = (
  value: InputNumberValue | null,
  precision?: number,
  decimalSeparator?: string,
) => {
  if (value == null) return ''

  let nextText: string
  if (typeof value === 'string') {
    if (typeof precision === 'number' && precision >= 0) {
      const numeric = toFiniteNumber(value)
      nextText =
        numeric === undefined ? value : roundWithPrecision(numeric, precision).toFixed(precision)
    } else {
      nextText = value
    }
  } else {
    const rounded = roundWithPrecision(value, precision)
    nextText =
      typeof precision === 'number' && precision >= 0 ? rounded.toFixed(precision) : String(rounded)
  }

  return toDisplayDecimal(nextText, decimalSeparator)
}

/** parse Input Value 的内部工具函数。 */
const parseInputValue = (
  input: string,
  parser: InputNumberProps['parser'],
  decimalSeparator: string | undefined,
): ParsedInputNumberValue => {
  const parsed = parser ? parser(input) : input

  if (parsed == null || parsed === '') {
    return {
      display: '',
      normalized: '',
      empty: true,
      transient: false,
    }
  }

  if (typeof parsed === 'number') {
    if (!Number.isFinite(parsed)) {
      return {
        display: '',
        normalized: '',
        empty: true,
        transient: false,
      }
    }
    const normalized = String(normalizeNegativeZero(parsed))
    return {
      display: toDisplayDecimal(normalized, decimalSeparator),
      normalized,
      numeric: normalizeNegativeZero(parsed),
      empty: false,
      transient: false,
    }
  }

  const normalized = sanitizeNumericInput(String(parsed), decimalSeparator)
  if (!normalized) {
    return {
      display: '',
      normalized: '',
      empty: true,
      transient: false,
    }
  }

  const transient = isTransientNumericText(normalized)
  if (transient) {
    return {
      display: toDisplayDecimal(normalized, decimalSeparator),
      normalized,
      empty: false,
      transient: true,
    }
  }

  const numeric = toFiniteNumber(normalized)
  return {
    display: toDisplayDecimal(normalized, decimalSeparator),
    normalized,
    numeric: numeric === undefined ? undefined : normalizeNegativeZero(numeric),
    empty: false,
    transient: false,
  }
}

/** 渲染 Formatted Value 的内部工具函数。 */
const renderFormattedValue = (
  formatter: InputNumberProps['formatter'],
  value: InputNumberValue | null,
  input: string,
  userTyping: boolean,
) => {
  if (typeof formatter !== 'function') return input
  const formatted = formatter(value, { userTyping, input })
  return formatted == null ? input : String(formatted)
}

/** 构建 Step Value 的内部工具函数。 */
const buildStepValue = (current: number, offset: number, step: number, precision?: number) => {
  const scale =
    10 ** Math.max(countFractionDigits(current), countFractionDigits(step), precision ?? 0)
  const nextValue = (Math.round(current * scale) + Math.round(step * scale) * offset) / scale
  return roundWithPrecision(nextValue, precision)
}

/** 解析 Step Base Value 的内部工具函数。 */
const resolveStepBaseValue = (currentValue: InputNumberValue | null, min: number, max: number) => {
  const currentNumeric = currentValue == null ? undefined : toFiniteNumber(currentValue)
  if (currentNumeric !== undefined) {
    return currentNumeric
  }
  if (min > 0) return min
  if (max < 0) return max
  return 0
}

/** Default Up Icon 的内部工具函数。 */
const DefaultUpIcon: FC<{ className?: string }> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className ?? 'size-3'}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m7 14 5-5 5 5" />
    </svg>
  )
}

/** Default Down Icon 的内部工具函数。 */
const DefaultDownIcon: FC<{ className?: string }> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className ?? 'size-3'}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m7 10 5 5 5-5" />
    </svg>
  )
}

/** Addon 的内部工具函数。 */
const InputNumberAddon: FC<{ children: any; className?: string }> = ({ children, className }) => {
  return (
    <span
      className={mergeClassName(
        'join-item inline-flex items-center border border-base-300 bg-base-200 px-3 text-sm text-base-content/65',
        className,
      )}
    >
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

/** InputNumber 控制按钮图标容器。 */
const InputNumberControlIcon: FC<{ children: any }> = ({ children }) => {
  return (
    <span className="pointer-events-none inline-flex items-center justify-center">{children}</span>
  )
}

/** InputNumber 步进控制按钮。 */
const InputNumberControls: FC<InputNumberControlsProps> = ({
  controlsConfig,
  visualConfig,
  onPointerStepStart,
  onMouseStepStart,
  onClickStep,
}) => {
  const handlePointerDown = (type: InputNumberStepInfo['type'], event: PointerEvent) => {
    if ((event as any).pointerType === 'mouse') return
    onPointerStepStart(type, event)
  }

  return (
    <span
      className={mergeClassName(
        'inline-flex shrink-0 self-stretch flex-col',
        visualConfig.groupClassName,
      )}
      data-rue-input-number-controls="true"
    >
      <button
        type="button"
        aria-label="Increase value"
        className={mergeClassName(
          'btn btn-ghost flex-1 min-h-0 border border-base-300/65 bg-base-100/75 p-0 text-base-content/70 hover:border-base-300 hover:bg-base-100 hover:text-base-content',
          visualConfig.buttonClassName,
        )}
        onMouseDown={(event: MouseEvent) => onMouseStepStart('up', event)}
        onPointerDown={(event: PointerEvent) => handlePointerDown('up', event)}
        onClick={(event: MouseEvent) => onClickStep('up', event)}
      >
        <InputNumberControlIcon>
          {controlsConfig?.upIcon != null ? (
            <>{String(controlsConfig.upIcon)}</>
          ) : (
            <DefaultUpIcon className={visualConfig.iconClassName} />
          )}
        </InputNumberControlIcon>
      </button>
      <button
        type="button"
        aria-label="Decrease value"
        className={mergeClassName(
          'btn btn-ghost flex-1 min-h-0 border border-base-300/65 bg-base-100/75 p-0 text-base-content/70 hover:border-base-300 hover:bg-base-100 hover:text-base-content',
          visualConfig.buttonClassName,
        )}
        onMouseDown={(event: MouseEvent) => onMouseStepStart('down', event)}
        onPointerDown={(event: PointerEvent) => handlePointerDown('down', event)}
        onClick={(event: MouseEvent) => onClickStep('down', event)}
      >
        <InputNumberControlIcon>
          {controlsConfig?.downIcon != null ? (
            <>{String(controlsConfig.downIcon)}</>
          ) : (
            <DefaultDownIcon className={visualConfig.iconClassName} />
          )}
        </InputNumberControlIcon>
      </button>
    </span>
  )
}

/** InputNumber 后缀区域，合并业务 suffix 和步进控件。 */
const InputNumberSuffix: FC<InputNumberSuffixProps> = ({
  suffix,
  showControls,
  controlsConfig,
  visualConfig,
  onPointerStepStart,
  onMouseStepStart,
  onClickStep,
}) => {
  const resolvedVisualConfig = visualConfig ?? resolveControlVisualConfig()

  return (
    <span
      className={mergeClassName('inline-flex items-center', resolvedVisualConfig.suffixClassName)}
    >
      {suffix}
      {showControls ? (
        <InputNumberControls
          controlsConfig={controlsConfig}
          visualConfig={resolvedVisualConfig}
          onPointerStepStart={onPointerStepStart}
          onMouseStepStart={onMouseStepStart}
          onClickStep={onClickStep}
        />
      ) : null}
    </span>
  )
}

/** Input Number 的内部工具函数。 */
const InputNumber: FC<InputNumberProps> = ({
  value,
  defaultValue,
  min,
  max,
  step = 1,
  precision,
  stringMode = false,
  keyboard = true,
  changeOnWheel,
  changeOnBlur = true,
  controls = true,
  decimalSeparator,
  formatter,
  parser,
  color,
  status,
  variant,
  ghost,
  prefix,
  addonBefore,
  addonAfter,
  addonBeforeBare,
  addonAfterBare,
  showCount,
  allowClear,
  rootClassName,
  inputClassName,
  countClassName,
  clearButtonClassName,
  className,
  readOnly,
  disabled,
  size,
  suffix,
  onClear,
  onChange,
  onStep,
  onInput,
  onKeyDown,
  onPressEnter,
  onBlur,
  onFocus,
  onWheel,
  onCompositionStart,
  onCompositionEnd,
  ...rest
}) => {
  let inputElement: HTMLInputElement | null = null
  const forwardedRef = rest.ref
  const inputProps = { ...rest }
  const draftText = ref('')
  const userTyping = ref(false)
  const composing = ref(false)
  const controlled = value !== undefined
  const resolvedBounds = computed(() => resolveBounds(min, max))
  const stepValue = computed(() => resolveStep(step))
  const initialControlledValue = normalizeCommittedValue(value, stringMode, decimalSeparator)
  let lastControlledValue = initialControlledValue
  const optimisticControlledValue = ref<InputNumberValue | null | undefined>(undefined)
  const internalValue = ref<InputNumberValue | null>(
    normalizeCommittedValue(controlled ? value : defaultValue, stringMode, decimalSeparator),
  )
  const committedValue = computed(() => {
    if (!controlled) return internalValue.value
    const externalValue = normalizeCommittedValue(value, stringMode, decimalSeparator)
    if (externalValue !== lastControlledValue) {
      lastControlledValue = externalValue
      optimisticControlledValue.value = undefined
      return externalValue
    }
    const optimisticValue = optimisticControlledValue.value
    if (optimisticValue !== undefined) {
      if (optimisticValue === externalValue) {
        optimisticControlledValue.value = undefined
        return externalValue
      }
      return optimisticValue
    }
    return externalValue
  })

  if ('ref' in inputProps) {
    delete inputProps.ref
  }

  const syncForwardedRef = (element: HTMLInputElement | null) => {
    inputElement = element
    if (typeof forwardedRef === 'function') {
      forwardedRef(element)
      return
    }
    if (forwardedRef && typeof forwardedRef === 'object') {
      ;(forwardedRef as any).current = element ?? undefined
    }
  }

  let repeatDelayTimer: ReturnType<typeof setTimeout> | null = null
  let repeatIntervalTimer: ReturnType<typeof setInterval> | null = null
  const repeatWindows = /*#__PURE__*/ new Set<Window>()
  let repeatTarget: HTMLButtonElement | null = null
  let suppressNextControlClick = false

  const clearRepeatTimers = () => {
    if (repeatDelayTimer !== null) {
      clearTimeout(repeatDelayTimer)
      repeatDelayTimer = null
    }
    if (repeatIntervalTimer !== null) {
      clearInterval(repeatIntervalTimer)
      repeatIntervalTimer = null
    }
  }

  const stopControlStepRepeat = (event?: Event) => {
    clearRepeatTimers()
    repeatWindows.forEach(repeatWindow => {
      if (activeControlStepRepeats.get(repeatWindow) === stopControlStepRepeat) {
        activeControlStepRepeats.delete(repeatWindow)
      }
    })
    repeatWindows.clear()
    if (event?.type === 'pointercancel' || event?.type === 'blur') {
      suppressNextControlClick = false
    }
    repeatTarget = null
  }

  const resolveInputElementFromEvent = (event?: Event) => {
    const target = event?.target as HTMLInputElement | null
    if (target?.tagName === 'INPUT') {
      return target
    }

    const currentTarget = event?.currentTarget as HTMLElement | null
    const shellElement = currentTarget?.closest(
      '[data-rue-input-shell="true"]',
    ) as HTMLElement | null
    return shellElement?.querySelector('input') as HTMLInputElement | null
  }

  const rememberInputElement = (element: HTMLInputElement | null | undefined) => {
    if (element && element !== inputElement) {
      syncForwardedRef(element)
    }
  }

  const blurExternalActiveElementAfterPointerStep = (event?: Event) => {
    const isPointerStep =
      event?.type === 'pointerdown' ||
      event?.type === 'mousedown' ||
      ((event as MouseEvent | undefined)?.detail ?? 0) > 0
    if (!isPointerStep) return

    const activeElement = document.activeElement as HTMLElement | null
    if (!activeElement || activeElement === document.body) return

    activeElement.blur?.()
  }

  const getCommittedValue = () => {
    return committedValue.get()
  }

  const renderValue = (valueSnapshot = getCommittedValue()) => {
    const committedValue = valueSnapshot

    if (userTyping.value) {
      const parsedDraft = parseInputValue(draftText.value, parser, decimalSeparator)
      const formatterValue =
        parsedDraft.numeric === undefined
          ? committedValue
          : serializeNumericValue(
              parsedDraft.numeric,
              stringMode,
              undefined,
              parsedDraft.normalized,
            )

      return renderFormattedValue(formatter, formatterValue, draftText.value, true)
    }

    const formattedText = formatCommittedText(committedValue, precision, decimalSeparator)
    return renderFormattedValue(formatter, committedValue, formattedText, false)
  }

  const inputDisplay = computed(() => renderValue())
  const ariaValueNow = computed(() => {
    const committedValue = getCommittedValue()
    const currentNumeric = committedValue == null ? undefined : toFiniteNumber(committedValue)
    return currentNumeric == null ? undefined : String(currentNumeric)
  })
  const ariaValueText = computed(() => inputDisplay.get() || undefined)
  const syncInputElement = (valueSnapshot = getCommittedValue()) => {
    const element = inputElement
    if (!element) return

    const displayValue = renderValue(valueSnapshot)
    if (element.value !== displayValue) {
      element.value = displayValue
    }

    const committedValue = valueSnapshot
    const currentNumeric = committedValue == null ? undefined : toFiniteNumber(committedValue)
    const valueNow = currentNumeric == null ? undefined : String(currentNumeric)
    if (valueNow !== undefined) {
      element.setAttribute('aria-valuenow', valueNow)
    } else {
      element.removeAttribute('aria-valuenow')
    }

    const valueText = displayValue || undefined
    if (valueText !== undefined) {
      element.setAttribute('aria-valuetext', valueText)
    } else {
      element.removeAttribute('aria-valuetext')
    }
  }

  const updateInternalValue = (nextValue: InputNumberValue | null) => {
    if (!controlled) {
      internalValue.value = nextValue
      return
    }

    optimisticControlledValue.value = nextValue
  }

  const emitNormalizedChange = (nextValue: InputNumberValue | null) => {
    if (onChange) {
      onChange(nextValue)
    }
  }

  const syncComposingDraft = (rawInput: string) => {
    userTyping.value = true
    draftText.value = rawInput
    syncInputElement()
  }

  const handleDraftInput = (rawInput: string) => {
    const parsed = parseInputValue(rawInput, parser, decimalSeparator)
    let valueSnapshot = getCommittedValue()

    userTyping.value = true
    draftText.value = parsed.display

    if (parsed.empty) {
      updateInternalValue(null)
      emitNormalizedChange(null)
      valueSnapshot = null
    } else if (parsed.numeric !== undefined) {
      const nextValue = serializeNumericValue(
        parsed.numeric,
        stringMode,
        undefined,
        parsed.normalized,
      )
      updateInternalValue(nextValue)
      emitNormalizedChange(nextValue)
      valueSnapshot = nextValue
    }
    syncInputElement(valueSnapshot)
  }

  const commitParsedValue = (parsed: ParsedInputNumberValue, clampToRange: boolean) => {
    if (parsed.empty) {
      updateInternalValue(null)
      emitNormalizedChange(null)
      syncInputElement()
      return null
    }

    if (parsed.numeric === undefined) {
      syncInputElement()
      return getCommittedValue()
    }

    let nextNumeric = parsed.numeric
    nextNumeric = roundWithPrecision(nextNumeric, precision)
    if (clampToRange) {
      const bounds = resolvedBounds.get()
      nextNumeric = clamp(nextNumeric, bounds.min, bounds.max)
      nextNumeric = roundWithPrecision(nextNumeric, precision)
    }

    const nextValue = serializeNumericValue(nextNumeric, stringMode, precision, parsed.normalized)
    const committedValue = getCommittedValue()
    updateInternalValue(nextValue)

    if (nextValue !== committedValue) {
      emitNormalizedChange(nextValue)
    }
    syncInputElement(nextValue)

    return nextValue
  }

  const stepValueBy: InputNumberStepHandler = (type, emitter, event) => {
    if (disabled || readOnly) return

    rememberInputElement(resolveInputElementFromEvent(event))
    blurExternalActiveElementAfterPointerStep(event)
    const parsedDraft = parseInputValue(
      inputElement?.value ?? draftText.value,
      parser,
      decimalSeparator,
    )
    const committedValue = getCommittedValue()
    const bounds = resolvedBounds.get()
    const resolvedStepValue = stepValue.get()
    const baseValue =
      parsedDraft.numeric ?? resolveStepBaseValue(committedValue, bounds.min, bounds.max)
    const nextNumeric = clamp(
      buildStepValue(baseValue, type === 'up' ? 1 : -1, resolvedStepValue, precision),
      bounds.min,
      bounds.max,
    )
    const nextValue = serializeNumericValue(nextNumeric, stringMode, precision)

    userTyping.value = false
    draftText.value = formatCommittedText(nextValue, precision, decimalSeparator)
    updateInternalValue(nextValue)

    if (nextValue !== committedValue) {
      emitNormalizedChange(nextValue)
    }
    syncInputElement(nextValue)

    onStep?.(nextValue, {
      offset: type === 'up' ? resolvedStepValue : -resolvedStepValue,
      type,
      emitter,
    })
  }

  const startControlStepRepeat = (
    type: InputNumberStepInfo['type'],
    event: MouseEvent | PointerEvent,
  ) => {
    if (event.button !== 0) return

    event.preventDefault?.()
    if (repeatTarget) return

    suppressNextControlClick = true
    stopControlStepRepeat()

    const target = event.currentTarget as HTMLButtonElement
    repeatTarget = target
    const ownerWindow = target.ownerDocument?.defaultView
    if (ownerWindow) repeatWindows.add(ownerWindow)
    if (typeof window !== 'undefined') repeatWindows.add(window)

    repeatWindows.forEach(repeatWindow =>
      registerControlStepRepeat(repeatWindow, stopControlStepRepeat),
    )

    rememberInputElement(resolveInputElementFromEvent(event))
    blurExternalActiveElementAfterPointerStep(event)

    const runStep = () => stepValueBy(type, 'handler')

    runStep()

    repeatDelayTimer = setTimeout(() => {
      runStep()
      repeatIntervalTimer = setInterval(() => {
        runStep()
      }, STEP_REPEAT_INTERVAL)
    }, STEP_REPEAT_START_DELAY)
  }

  const handleControlClickStep = (type: InputNumberStepInfo['type'], event: MouseEvent) => {
    if (suppressNextControlClick) {
      suppressNextControlClick = false
      event.preventDefault?.()
      event.stopPropagation?.()
      return
    }

    stepValueBy(type, 'handler', event)
  }

  const controlsConfig = controls && typeof controls === 'object' ? controls : undefined
  const showControls = controls !== false && !disabled && !readOnly
  const controlVisualConfig = computed(() => resolveControlVisualConfig(size))
  const currentBounds = resolvedBounds.get() ?? resolveBounds(min, max)
  const currentMin = currentBounds?.min ?? Number.MIN_SAFE_INTEGER
  const currentMax = currentBounds?.max ?? Number.MAX_SAFE_INTEGER
  const currentStepValue = stepValue.get() ?? resolveStep(step)
  const clearable = !!allowClear
  const clearConfig = allowClear && typeof allowClear === 'object' ? allowClear : undefined
  const usesShell = prefix !== undefined || suffix !== undefined || showControls || clearable
  const usesAddonGroup = addonBefore !== undefined || addonAfter !== undefined
  const addonControlClassName = usesAddonGroup ? 'join-item min-w-0 flex-1' : undefined
  const nativeReadOnlyProps: Record<string, any> = {}
  if (readOnly !== undefined) {
    nativeReadOnlyProps.readOnly = readOnly
  }
  const nativeAriaInvalid = status === 'error' ? 'true' : inputProps['aria-invalid']
  const nativeAriaInvalidProps: Record<string, any> = {}
  if (nativeAriaInvalid !== undefined && nativeAriaInvalid !== null) {
    nativeAriaInvalidProps['aria-invalid'] = nativeAriaInvalid
  }
  if ('aria-invalid' in inputProps) {
    delete inputProps['aria-invalid']
  }
  const rawInputClassName = buildInputClassName({
    color,
    status,
    size,
    variant,
    ghost,
    className: mergeClassName(className, addonControlClassName),
  })
  const shellClassName = buildInputClassName({
    color,
    status,
    size,
    variant,
    ghost,
    shell: true,
    className: mergeClassName(className, addonControlClassName),
  })
  const displayText = inputDisplay.get()
  const clearButtonClass = mergeClassName(
    'btn btn-ghost btn-xs btn-circle h-7 min-h-0 w-7 shrink-0 p-0 text-base-content/55 hover:text-base-content',
    displayText.length > 0 && !disabled && !readOnly ? undefined : 'hidden',
    clearButtonClassName,
  )
  const countContent = stringifyContent(
    renderCountContent(showCount, {
      value: displayText,
      count: displayText.length,
      maxLength: readMaxLength(inputProps),
    }),
  )
  const RenderSuffix = () => {
    if (suffix === undefined && !showControls) {
      return <></>
    }

    return (
      <InputNumberSuffix
        suffix={suffix}
        showControls={showControls}
        controlsConfig={controlsConfig}
        visualConfig={controlVisualConfig.get()}
        onPointerStepStart={startControlStepRepeat}
        onMouseStepStart={startControlStepRepeat}
        onClickStep={handleControlClickStep}
      />
    )
  }

  const handleClear = (event: MouseEvent) => {
    const element = resolveInputElementFromEvent(event)
    rememberInputElement(element)
    if (!inputElement || disabled || readOnly) return

    if (typeof (event as any).preventDefault === 'function') {
      ;(event as any).preventDefault()
    }
    if (typeof (event as any).stopPropagation === 'function') {
      ;(event as any).stopPropagation()
    }

    composing.value = false
    userTyping.value = false
    draftText.value = ''
    updateInternalValue(null)
    emitNormalizedChange(null)
    syncInputElement()
    inputElement.focus()
    onClear?.(event)
  }

  const handleShellMouseDown = (event: MouseEvent) => {
    if (disabled) return

    const target = event.target as HTMLElement | null
    if (target?.closest?.('button,input,textarea,select,a')) {
      return
    }

    if (typeof (event as any).preventDefault === 'function') {
      ;(event as any).preventDefault()
    }

    rememberInputElement(resolveInputElementFromEvent(event))
    inputElement?.focus()
  }

  const handleNativeWheel = (event: WheelEvent) => {
    rememberInputElement(resolveInputElementFromEvent(event))
    onWheel?.(event)
    if (
      (event as any).defaultPrevented ||
      !changeOnWheel ||
      disabled ||
      readOnly ||
      document.activeElement !== inputElement
    ) {
      return
    }

    if ((event as any).deltaY === 0) return

    ;(event as any).preventDefault?.()
    stepValueBy((event as any).deltaY < 0 ? 'up' : 'down', 'wheel', event)
  }

  const handleNativeBlur = (event: FocusEvent) => {
    rememberInputElement(resolveInputElementFromEvent(event))
    const target = event.target as HTMLInputElement | null
    const parsed = parseInputValue(target?.value ?? draftText.value, parser, decimalSeparator)

    composing.value = false
    userTyping.value = false
    draftText.value = parsed.display
    commitParsedValue(parsed, changeOnBlur)
    syncInputElement()
    onBlur?.(event)
  }

  const handleNativeCompositionEnd = (event: CompositionEvent) => {
    rememberInputElement(resolveInputElementFromEvent(event))
    composing.value = false
    handleDraftInput((event.target as HTMLInputElement | null)?.value ?? draftText.value)
    onCompositionEnd?.(event)
  }

  const handleNativeCompositionStart = (event: CompositionEvent) => {
    rememberInputElement(resolveInputElementFromEvent(event))
    composing.value = true
    syncComposingDraft((event.target as HTMLInputElement | null)?.value ?? draftText.value)
    onCompositionStart?.(event)
  }

  const handleNativeFocus = (event: FocusEvent) => {
    rememberInputElement(resolveInputElementFromEvent(event))
    syncInputElement()
    onFocus?.(event)
  }

  const handleNativeKeyDown = (event: KeyboardEvent) => {
    rememberInputElement(resolveInputElementFromEvent(event))
    onKeyDown?.(event)
    if ((event as any).key === 'Enter') {
      onPressEnter?.(event)
    }
    if ((event as any).defaultPrevented || !keyboard) return

    if ((event as any).key === 'ArrowUp') {
      ;(event as any).preventDefault?.()
      stepValueBy('up', 'keydown', event)
      return
    }

    if ((event as any).key === 'ArrowDown') {
      ;(event as any).preventDefault?.()
      stepValueBy('down', 'keydown', event)
    }
  }

  const handleNativeInput = (event: Event) => {
    const target = event.target as HTMLInputElement | null
    rememberInputElement(target)
    const rawInput = target?.value ?? ''

    if (composing.value || !!(event as any).isComposing) {
      syncComposingDraft(rawInput)
      onInput?.(event)
      return
    }

    handleDraftInput(rawInput)

    onInput?.(event)
  }

  const RenderInputNode = ({ arg0: shell = false }: { arg0?: any }) => {
    return (
      <input
        {...inputProps}
        {...nativeReadOnlyProps}
        {...nativeAriaInvalidProps}
        type="text"
        inputMode={
          inputProps.inputMode ??
          (countFractionDigits(currentStepValue) > 0 || precision !== undefined
            ? 'decimal'
            : 'numeric')
        }
        disabled={disabled}
        className={
          shell
            ? mergeClassName(
                'min-w-0 grow border-0 bg-transparent p-0 text-inherit outline-none placeholder:text-base-content/40',
                inputClassName,
              )
            : rawInputClassName
        }
        role="spinbutton"
        aria-valuemin={String(currentMin)}
        aria-valuemax={String(currentMax)}
        value={displayText}
        aria-valuenow={ariaValueNow.get()}
        aria-valuetext={ariaValueText.get()}
        onInput={handleNativeInput}
        onKeyDown={handleNativeKeyDown}
        onFocus={handleNativeFocus}
        onCompositionStart={handleNativeCompositionStart}
        onCompositionEnd={handleNativeCompositionEnd}
        onBlur={handleNativeBlur}
        onWheel={handleNativeWheel}
      />
    )
  }

  const RenderControlNode = () => {
    if (!usesShell) {
      return <RenderInputNode />
    }

    return (
      <div
        className={shellClassName}
        aria-disabled={disabled ? 'true' : undefined}
        data-rue-input-shell="true"
        onMouseDown={handleShellMouseDown}
      >
        {prefix !== undefined ? (
          <span className="shrink-0 text-sm text-base-content/60">{prefix}</span>
        ) : null}
        <RenderInputNode arg0={true} />
        {clearable && !disabled && !readOnly ? (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Clear text"
            className={clearButtonClass}
            onMouseDown={(event: MouseEvent) => {
              if (typeof event.preventDefault === 'function') event.preventDefault()
            }}
            onClick={handleClear}
          >
            <DefaultClearIcon />
          </button>
        ) : null}
        <RenderSuffix />
      </div>
    )
  }

  const RenderGroupedControlNode = () => {
    if (!usesAddonGroup) return <RenderControlNode />
    return (
      <div className="join w-full items-stretch">
        {addonBefore !== undefined ? (
          addonBeforeBare ? (
            addonBefore
          ) : (
            <InputNumberAddon>{addonBefore}</InputNumberAddon>
          )
        ) : null}
        <RenderControlNode />
        {addonAfter !== undefined ? (
          addonAfterBare ? (
            addonAfter
          ) : (
            <InputNumberAddon>{addonAfter}</InputNumberAddon>
          )
        ) : null}
      </div>
    )
  }

  return (
    <>
      {!showCount && !rootClassName ? (
        <RenderGroupedControlNode />
      ) : (
        <div
          className={mergeClassName(showCount ? 'flex flex-col gap-2' : undefined, rootClassName)}
          data-rue-input-root="true"
        >
          <RenderGroupedControlNode />
          {showCount ? (
            <div
              className={mergeClassName(
                'flex justify-end text-xs leading-5 text-base-content/60',
                countClassName,
              )}
              data-rue-input-count="true"
            >
              {countContent}
            </div>
          ) : null}
        </div>
      )}
    </>
  )
}

/** 默认导出数字输入框组件。 */
export default InputNumber
