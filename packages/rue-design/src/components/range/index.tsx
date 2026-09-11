/*
Range 组件概述
- 保留 Rue 当前的 range 视觉类，同时补齐常用的受控/非受控、值展示、marks 和辅助文案能力。
- 默认仍然直接输出原生 input[type=range]；只有在传入增强展示 props 时才会包裹结构，尽量不影响旧用法。
- 语义回调通过 onValueChange / onValueCommit 暴露，原生 onInput / onChange 仍然继续透传。
*/
import type { FC } from '@rue-js/rue'
import { batch, computed, onScopeDispose, ref, toValue, useRef } from '@rue-js/rue'

/** RangeColor 语义色类型。 */
export type RangeColor =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'info'
  | 'error'

/** RangeSize 尺寸类型。 */
export type RangeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'default' | 'medium' | 'large'
/** RangeValue 值类型。 */
export type RangeValue = string | number
/** RangeMaybeRef 允许父级把 ref/computed 直接传给高频变化的 value。 */
export type RangeMaybeRef<T> = T | (() => T) | { value?: T; get?: () => T }

/** RangeMark 接口。 */
export interface RangeMark {
  /** 受控值。 */
  value: RangeValue
  /** 展示标签。 */
  label?: any
}

/** RangeFormatterInfo 接口。 */
export interface RangeFormatterInfo {
  /** min 配置项。 */
  min: number
  /** max 配置项。 */
  max: number
  /** percent 配置项。 */
  percent: number
}

/** RangeValueDisplayConfig 配置对象。 */
export interface RangeValueDisplayConfig {
  /** formatter 配置项。 */
  formatter?: (value: number, info: RangeFormatterInfo) => string | number
  /** 弹出层或内容展示位置。 */
  placement?: 'inline' | 'below'
  /** 根节点附加类名。 */
  className?: string
}

/** RangeProps 组件属性。 */
export interface RangeProps {
  /** 元素或数据项标识。 */
  id?: string
  /** 组件语义色。 */
  color?: RangeColor
  /** 组件尺寸。 */
  size?: RangeSize
  /** 根节点附加类名。 */
  className?: string
  /** 根节点附加类名。 */
  rootClassName?: string
  /** 展示标签。 */
  label?: any
  /** hint 配置项。 */
  hint?: any
  /** helper 配置项。 */
  helper?: any
  /** labelClassName 附加类名。 */
  labelClassName?: string
  /** hintClassName 附加类名。 */
  hintClassName?: string
  /** helperClassName 附加类名。 */
  helperClassName?: string
  /** valueClassName 附加类名。 */
  valueClassName?: string
  /** marksClassName 附加类名。 */
  marksClassName?: string
  /** 根节点内联样式。 */
  style?: any
  /** 根节点内联样式。 */
  rootStyle?: any
  /** min 配置项。 */
  min?: RangeMaybeRef<RangeValue | undefined>
  /** max 配置项。 */
  max?: RangeMaybeRef<RangeValue | undefined>
  /** step 配置项。 */
  step?: RangeMaybeRef<RangeValue | undefined>
  /** 受控值。 */
  value?: RangeMaybeRef<RangeValue | undefined>
  /** 非受控初始值。 */
  defaultValue?: RangeMaybeRef<RangeValue | undefined>
  /** showValue 值。 */
  showValue?: boolean | RangeValueDisplayConfig
  /** formatter 配置项。 */
  formatter?: (value: number, info: RangeFormatterInfo) => string | number
  /** marks 配置项。 */
  marks?: Array<RangeMark | RangeValue>
  /** 是否禁用交互。 */
  disabled?: boolean
  /** onInput 事件回调。 */
  onInput?: (event: Event) => void
  /** 值或状态变化时触发的回调。 */
  onChange?: (event: Event) => void
  /** onValueChange 事件回调。 */
  onValueChange?: (value: number, event: Event) => void
  /** onValueCommit 事件回调。 */
  onValueCommit?: (value: number, event: Event) => void
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface NormalizedRangeMark {
  key: string
  value: number
  label: any
  percent: number
}

interface NormalizedValueDisplayConfig {
  visible: boolean
  placement: 'inline' | 'below'
  className?: string
  formatter?: (value: number, info: RangeFormatterInfo) => string | number
}

type ScheduledValueFlush =
  | { type: 'frame'; id: number }
  | { type: 'timeout'; id: ReturnType<typeof setTimeout> }

let rangeIdSeed = 0

const RANGE_COLOR_CLASS_NAMES: Record<RangeColor, string> = {
  neutral: 'range-neutral',
  primary: 'range-primary',
  secondary: 'range-secondary',
  accent: 'range-accent',
  success: 'range-success',
  warning: 'range-warning',
  info: 'range-info',
  error: 'range-error',
}

const RANGE_SIZE_CLASS_NAMES: Record<RangeSize, string> = {
  xs: 'range-xs',
  sm: 'range-sm',
  md: 'range-md',
  lg: 'range-lg',
  xl: 'range-xl',
  small: 'range-sm',
  default: 'range-md',
  medium: 'range-md',
  large: 'range-lg',
}

/** append Class Name 的内部工具函数。 */
const appendClassName = (base: string, className?: string) => {
  return className ? `${base} ${className}` : base
}

/** 转换为 Finite Number 的内部工具函数。 */
const toFiniteNumber = (value: any, fallback: number) => {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

/** clamp 的内部工具函数。 */
const clamp = (value: number, min: number, max: number) => {
  if (value < min) return min
  if (value > max) return max
  return value
}

/** 解析 MaybeRef 的内部工具函数。 */
const resolveMaybeRef = <T,>(value: RangeMaybeRef<T> | undefined): T | undefined => {
  if (value === undefined) return undefined
  if (typeof value === 'function') return (value as () => T)()
  if (value && typeof value === 'object') {
    const source = value as { get?: () => T; value?: T }
    if (typeof source.get === 'function') return source.get()
    if ('value' in source) return source.value
  }
  return value as T
}

/** 解析 Bounds 的内部工具函数。 */
const resolveBounds = (min?: RangeValue, max?: RangeValue) => {
  const resolvedMin = toFiniteNumber(min, 0)
  const resolvedMax = toFiniteNumber(max, 100)
  if (resolvedMax <= resolvedMin) {
    return { min: resolvedMin, max: resolvedMin + 1 }
  }
  return { min: resolvedMin, max: resolvedMax }
}

/** 解析 Step 的内部工具函数。 */
const resolveStep = (step?: RangeValue) => {
  const resolved = toFiniteNumber(step, 1)
  return resolved > 0 ? resolved : 1
}

/** 解析 Size Class 的内部工具函数。 */
const resolveSizeClass = (size?: RangeSize) => {
  return size ? RANGE_SIZE_CLASS_NAMES[size] : undefined
}

/** 解析 Value 的内部工具函数。 */
const resolveValue = (value: any, min: number, max: number, fallback: number) => {
  return clamp(toFiniteNumber(value, fallback), min, max)
}

/** 解析 Percent 的内部工具函数。 */
const resolvePercent = (value: number, min: number, max: number) => {
  return ((value - min) / (max - min)) * 100
}

/** 归一化 Value Display 的内部工具函数。 */
const normalizeValueDisplay = (
  showValue?: boolean | RangeValueDisplayConfig,
): NormalizedValueDisplayConfig => {
  if (!showValue) {
    return { visible: false, placement: 'inline' }
  }
  if (showValue === true) {
    return { visible: true, placement: 'inline' }
  }
  return {
    visible: true,
    placement: showValue.placement ?? 'inline',
    className: showValue.className,
    formatter: showValue.formatter,
  }
}

/** 判断 Range Mark Object 的内部工具函数。 */
const isRangeMarkObject = (mark: RangeMark | RangeValue): mark is RangeMark => {
  return typeof mark === 'object' && mark !== null && 'value' in mark
}

/** 归一化 Marks 的内部工具函数。 */
const normalizeMarks = (
  marks: Array<RangeMark | RangeValue> | undefined,
  min: number,
  max: number,
): NormalizedRangeMark[] => {
  if (!marks?.length) return []

  return marks
    .map((mark, index) => {
      const rawValue = isRangeMarkObject(mark) ? mark.value : mark
      const numericValue = resolveValue(rawValue, min, max, min)
      const label = isRangeMarkObject(mark)
        ? 'label' in mark
          ? mark.label
          : String(rawValue)
        : String(rawValue)

      return {
        key: `${index}-${String(rawValue)}`,
        value: numericValue,
        label,
        percent: resolvePercent(numericValue, min, max),
      }
    })
    .sort((first, second) => first.value - second.value)
}

/** format Range Value 的内部工具函数。 */
const formatRangeValue = (
  value: number,
  formatter: ((value: number, info: RangeFormatterInfo) => string | number) | undefined,
  info: RangeFormatterInfo,
) => {
  if (typeof formatter === 'function') {
    return formatter(value, info)
  }
  return String(value)
}

/** 构建 Input Class Name 的内部工具函数。 */
const buildInputClassName = (color?: RangeColor, size?: RangeSize, className?: string) => {
  let cls = 'range'
  if (color) cls += ` ${RANGE_COLOR_CLASS_NAMES[color]}`
  const resolvedSize = resolveSizeClass(size)
  if (resolvedSize) cls += ` ${resolvedSize}`
  if (className) cls += ` ${className}`
  return cls
}

/** 安排拖动值更新的内部工具函数。 */
const scheduleValueFlush = (callback: () => void): ScheduledValueFlush => {
  if (typeof requestAnimationFrame === 'function') {
    return { type: 'frame', id: requestAnimationFrame(callback) }
  }

  return { type: 'timeout', id: setTimeout(callback, 0) }
}

/** 取消拖动值更新的内部工具函数。 */
const cancelValueFlush = (flush: ScheduledValueFlush) => {
  if (flush.type === 'frame') {
    if (typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(flush.id)
    }
    return
  }

  clearTimeout(flush.id)
}

/** Range 的内部工具函数。 */
const Range: FC<RangeProps> = ({
  id,
  color,
  size,
  className,
  rootClassName,
  label,
  hint,
  helper,
  labelClassName,
  hintClassName,
  helperClassName,
  valueClassName,
  marksClassName,
  style,
  rootStyle,
  min,
  max,
  step,
  value,
  defaultValue,
  showValue,
  formatter,
  marks,
  disabled,
  onInput,
  onChange,
  onValueChange,
  onValueCommit,
  ...rest
}) => {
  const CompiledRow1 = ({ rowArg0 }: { rowArg0: any }) => {
    const mark = rowArg0

    const active = presentedValue.get() >= mark.value
    return (
      <span
        key={mark.key}
        className={appendClassName(
          `absolute top-0 flex -translate-x-1/2 flex-col items-center gap-1 text-[11px] ${active ? 'font-medium text-base-content' : 'text-base-content/55'}`,
        )}
        style={{ left: `${mark.percent}%` }}
        data-rue-range-mark={String(mark.value)}
      >
        <span className={`h-2 w-px ${active ? 'bg-base-content/80' : 'bg-base-content/25'}`} />
        {mark.label != null ? <span className="whitespace-nowrap">{mark.label}</span> : null}
      </span>
    )
  }

  const generatedId = `rue-range-${rangeIdSeed++}`
  const bounds = computed(() => resolveBounds(resolveMaybeRef(min), resolveMaybeRef(max)))
  const rangeStep = computed(() => resolveStep(resolveMaybeRef(step)))
  const controlled = computed(() => resolveMaybeRef(value) !== undefined)
  const uncontrolledValue = ref(
    resolveValue(
      resolveMaybeRef(defaultValue) ?? resolveMaybeRef(value) ?? bounds.get().min,
      bounds.get().min,
      bounds.get().max,
      bounds.get().min,
    ),
  )
  const currentValue = computed(() => {
    const currentBounds = bounds.get()
    const controlledValue = resolveMaybeRef(value)
    return controlledValue !== undefined
      ? resolveValue(controlledValue, currentBounds.min, currentBounds.max, uncontrolledValue.value)
      : resolveValue(
          uncontrolledValue.value,
          currentBounds.min,
          currentBounds.max,
          currentBounds.min,
        )
  })
  const interacting = ref(false)
  const interactionValue = ref(currentValue.get())
  const rootRef = useRef<HTMLDivElement>()
  const presentedValue = computed(() => {
    const currentBounds = bounds.get()
    return interacting.value
      ? resolveValue(
          interactionValue.value,
          currentBounds.min,
          currentBounds.max,
          currentValue.get(),
        )
      : currentValue.get()
  })
  const valueDisplay = computed(() => normalizeValueDisplay(showValue))
  const normalizedMarks = computed(() => {
    const currentBounds = bounds.get()
    return normalizeMarks(marks, currentBounds.min, currentBounds.max)
  })
  const inputId = computed(() => id ?? generatedId)
  const displayFormatter = computed(() => valueDisplay.get().formatter ?? formatter)
  const info = computed<RangeFormatterInfo>(() => {
    const currentBounds = bounds.get()
    return {
      min: currentBounds.min,
      max: currentBounds.max,
      percent: resolvePercent(presentedValue.get(), currentBounds.min, currentBounds.max),
    }
  })
  const displayValue = computed(() =>
    formatRangeValue(presentedValue.get(), displayFormatter.get(), info.get()),
  )
  const ariaValueText = computed(() => {
    const currentDisplayValue = displayValue.get()
    return typeof currentDisplayValue === 'string' || typeof currentDisplayValue === 'number'
      ? String(currentDisplayValue)
      : undefined
  })
  const needsWrapper = computed(
    () =>
      label != null ||
      hint != null ||
      helper != null ||
      valueDisplay.get().visible ||
      normalizedMarks.get().length > 0 ||
      !!rootClassName ||
      !!rootStyle ||
      !!labelClassName ||
      !!hintClassName ||
      !!helperClassName ||
      !!valueClassName ||
      !!marksClassName,
  )

  if ('ref' in rest) {
    delete rest.ref
  }

  let pendingValueChange: { value: number; event: Event } | null = null
  let valueChangeFlush: ScheduledValueFlush | null = null
  let lastEmittedValue: number | undefined
  let interactionHasEmittedValue = false

  const startInteraction = (nextValue: number) => {
    batch(() => {
      interactionValue.value = nextValue
      if (!interacting.value) {
        interactionHasEmittedValue = false
        interacting.value = true
      }
    })
  }

  const stopInteraction = () => {
    batch(() => {
      interactionValue.value = currentValue.get()
      interacting.value = false
    })
  }

  const flushValueChange = () => {
    valueChangeFlush = null

    if (!pendingValueChange) {
      return
    }

    const next = pendingValueChange
    pendingValueChange = null

    lastEmittedValue = next.value
    interactionHasEmittedValue = true
    onValueChange?.(next.value, next.event)
  }

  const scheduleValueChange = (nextValue: number, event: Event) => {
    pendingValueChange = { value: nextValue, event }

    if (valueChangeFlush) {
      return
    }

    valueChangeFlush = scheduleValueFlush(flushValueChange)
  }

  onScopeDispose(() => {
    if (valueChangeFlush) {
      cancelValueFlush(valueChangeFlush)
      valueChangeFlush = null
    }
    pendingValueChange = null
  })

  const handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement | null
    const currentBounds = bounds.get()
    const nextValue = resolveValue(
      target?.value,
      currentBounds.min,
      currentBounds.max,
      presentedValue.get(),
    )
    startInteraction(nextValue)
    onInput?.(event)
    if (!controlled.get() || onValueChange) {
      scheduleValueChange(nextValue, event)
    }
  }

  const handleChange = (event: Event) => {
    const target = event.target as HTMLInputElement | null
    const currentBounds = bounds.get()
    const nextValue = resolveValue(
      target?.value,
      currentBounds.min,
      currentBounds.max,
      presentedValue.get(),
    )
    startInteraction(nextValue)
    if (valueChangeFlush) {
      pendingValueChange = { value: nextValue, event }
      cancelValueFlush(valueChangeFlush)
      flushValueChange()
    } else if (!interactionHasEmittedValue || lastEmittedValue !== nextValue) {
      lastEmittedValue = nextValue
      interactionHasEmittedValue = true
      onValueChange?.(nextValue, event)
    }
    if (!controlled.get()) {
      uncontrolledValue.value = nextValue
    }
    onChange?.(event)
    onValueCommit?.(nextValue, event)
    stopInteraction()
  }

  if (!needsWrapper.get()) {
    return (
      <input
        {...rest}
        id={inputId.get()}
        type="range"
        className={buildInputClassName(color, size, className)}
        style={style}
        min={String(bounds.get().min)}
        max={String(bounds.get().max)}
        step={resolveMaybeRef(step) === undefined ? undefined : String(rangeStep.get())}
        value={String(presentedValue.get())}
        disabled={disabled}
        aria-valuemin={String(bounds.get().min)}
        aria-valuemax={String(bounds.get().max)}
        aria-valuenow={String(presentedValue.get())}
        aria-valuetext={ariaValueText.get()}
        onInput={handleInput}
        onChange={handleChange}
      />
    )
  }

  return (
    <div
      ref={(element: HTMLDivElement | null) => {
        rootRef.current = element ?? undefined
      }}
      className={appendClassName('w-full space-y-3', rootClassName)}
      style={rootStyle}
      data-rue-range-root="true"
    >
      {label != null ||
      hint != null ||
      (valueDisplay.get().visible && valueDisplay.get().placement === 'inline') ? (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            {label != null ? (
              <label
                htmlFor={inputId.get()}
                className={appendClassName(
                  'block text-sm font-medium text-base-content',
                  labelClassName,
                )}
              >
                {label}
              </label>
            ) : null}
            {hint != null ? (
              <p className={appendClassName('m-0 text-xs text-base-content/65', hintClassName)}>
                {hint}
              </p>
            ) : null}
          </div>
          {valueDisplay.get().visible && valueDisplay.get().placement === 'inline' ? (
            <output
              htmlFor={inputId.get()}
              className={appendClassName(
                appendClassName(
                  'shrink-0 rounded-full bg-base-200 px-3 py-1 text-xs font-medium text-base-content',
                  valueDisplay.get().className,
                ),
                valueClassName,
              )}
              data-rue-range-output="true"
            >
              {displayValue.get()}
            </output>
          ) : null}
        </div>
      ) : null}

      <div className="w-full">
        <input
          {...rest}
          id={inputId.get()}
          type="range"
          className={buildInputClassName(color, size, className)}
          style={style}
          min={String(bounds.get().min)}
          max={String(bounds.get().max)}
          step={resolveMaybeRef(step) === undefined ? undefined : String(rangeStep.get())}
          value={String(presentedValue.get())}
          disabled={disabled}
          aria-valuemin={String(bounds.get().min)}
          aria-valuemax={String(bounds.get().max)}
          aria-valuenow={String(presentedValue.get())}
          aria-valuetext={ariaValueText.get()}
          onInput={handleInput}
          onChange={handleChange}
        />
      </div>

      {valueDisplay.get().visible && valueDisplay.get().placement === 'below' ? (
        <div className="flex justify-end">
          <output
            htmlFor={inputId.get()}
            className={appendClassName(
              appendClassName(
                'rounded-full bg-base-200 px-3 py-1 text-xs font-medium text-base-content',
                valueDisplay.get().className,
              ),
              valueClassName,
            )}
            data-rue-range-output="true"
          >
            {displayValue.get()}
          </output>
        </div>
      ) : null}

      {normalizedMarks.get().length > 0 ? (
        <div
          className={appendClassName('relative h-10', marksClassName)}
          data-rue-range-marks="true"
        >
          {normalizedMarks.get().map((rowArg0: any, rowIndex: number) => (
            <CompiledRow1 rowArg0={rowArg0} />
          ))}
        </div>
      ) : null}

      {helper != null ? (
        <p className={appendClassName('m-0 text-xs text-base-content/60', helperClassName)}>
          {helper}
        </p>
      ) : null}
    </div>
  )
}

/** 默认导出范围滑块组件。 */
export default Range
