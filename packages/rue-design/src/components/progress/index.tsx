/*
Progress 模块概述
- 汇总进度条组件的公开类型、渲染入口和局部工具逻辑。
- 导出注释用于 API 文档生成，内部注释标明状态归一化、样式映射与 DOM 交互边界。
*/
import type { FC } from '@rue-js/rue'
import { computed } from '@rue-js/rue'

/** ProgressColor 语义色类型。 */
export type ProgressColor =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'

/** ProgressType 视觉或语义变体类型。 */
export type ProgressType = 'line' | 'circle' | 'dashboard'
/** ProgressStatus 状态类型。 */
export type ProgressStatus = 'normal' | 'exception' | 'active' | 'success'
/** ProgressLinecap 类型。 */
export type ProgressLinecap = 'round' | 'square' | 'butt'
/** ProgressSize 尺寸类型。 */
export type ProgressSize =
  | number
  | [number | string, number]
  | { width?: number | string; height?: number }
  | 'small'
  | 'default'
  | 'medium'
/** ProgressStrokeColor 语义色类型。 */
export type ProgressStrokeColor =
  | string
  | string[]
  | { from: string; to: string; direction?: string }
/** ProgressSteps 类型。 */
export type ProgressSteps = number | { count: number; gap: number }
/** ProgressGapPlacement 位置或方向类型。 */
export type ProgressGapPlacement = 'top' | 'bottom' | 'start' | 'end'
/** ProgressMaybeRef 允许高频状态以 Rue ref/computed 传入，避免父组件反复重建。 */
export type ProgressMaybeRef<T> = T | (() => T) | { value?: T; get?: () => T }

/** ProgressSuccessProps 组件属性。 */
export interface ProgressSuccessProps {
  /** percent 配置项。 */
  percent?: number
  /** strokeColor 颜色。 */
  strokeColor?: string
}

/** ProgressPercentPosition 接口。 */
export interface ProgressPercentPosition {
  /** 交叉轴或内容对齐方式。 */
  align?: 'start' | 'center' | 'end'
  /** 组件类型或语义类型。 */
  type?: 'inner' | 'outer'
}

/** ProgressProps 组件属性。 */
export interface ProgressProps {
  /** 组件语义色。 */
  color?: ProgressColor
  /** 根节点附加类名。 */
  className?: string
  /** 组件类型或语义类型。 */
  type?: ProgressType
  /** percent 配置项。 */
  percent?: ProgressMaybeRef<number | undefined>
  /** max 配置项。 */
  max?: ProgressMaybeRef<number | undefined>
  /** 受控值。 */
  value?: ProgressMaybeRef<number | undefined>
  /** 组件状态。 */
  status?: ProgressMaybeRef<ProgressStatus | undefined>
  /** showInfo 配置项。 */
  showInfo?: boolean
  /** format 配置项。 */
  format?: (percent?: number, successPercent?: number) => string
  /** 组件尺寸。 */
  size?: ProgressSize
  /** strokeWidth 配置项。 */
  strokeWidth?: number
  /** strokeLinecap 配置项。 */
  strokeLinecap?: ProgressLinecap
  /** strokeColor 颜色。 */
  strokeColor?: ProgressStrokeColor
  /** trailColor 颜色。 */
  trailColor?: string
  /** railColor 颜色。 */
  railColor?: string
  /** success 配置项。 */
  success?: ProgressMaybeRef<ProgressSuccessProps | undefined>
  /** steps 配置项。 */
  steps?: ProgressSteps
  /** gapDegree 配置项。 */
  gapDegree?: number
  /** gapPlacement 配置项。 */
  gapPlacement?: ProgressGapPlacement
  /** gapPosition 配置项。 */
  gapPosition?: 'top' | 'bottom' | 'left' | 'right'
  /** percentPosition 配置项。 */
  percentPosition?: ProgressPercentPosition
  /** rounding 配置项。 */
  rounding?: (step: number) => number
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface NormalizedLineSize {
  width?: number | string
  height: number
}

interface NormalizedSteps {
  count: number
  gap: number
}

interface LineProgressBarProps {
  lineSize: NormalizedLineSize
  lineStyle?: Record<string, any>
  linecapClass: string
  resolvedRailColor?: string
  stepsConfig: NormalizedSteps | null
  resolvedPercent?: ProgressMaybeRef<number | undefined>
  successPercent: ProgressMaybeRef<number>
  rounding: (step: number) => number
  strokeColor?: ProgressStrokeColor
  success?: ProgressMaybeRef<ProgressSuccessProps | undefined>
  toneClass: ProgressMaybeRef<string>
  resolvedStatus: ProgressMaybeRef<ProgressStatus>
  indicatorPosition: 'inner' | 'outer'
  indicatorAlign: 'start' | 'center' | 'end'
  indicator: ProgressMaybeRef<any>
}

interface LineProgressStepItemsProps {
  index: number
  stepsConfig: NormalizedSteps
  completedCount: number
  successCount: number
  linecapClass: string
  strokeColor?: ProgressStrokeColor
  success?: ProgressSuccessProps
  toneClass: string
  resolvedRailColor?: string
}

interface CircleProgressStepItemsProps {
  index: number
  stepsConfig: NormalizedSteps
  startAngle: number
  sweepAngle: number
  radius: number
  normalizedStrokeWidth: number
  circleLinecap: ProgressLinecap
  resolvedPercent?: number
  successPercent: number
  rounding: (step: number) => number
  strokeColor?: ProgressStrokeColor
  success?: ProgressSuccessProps
  resolvedRailColor?: string
}

/** clamp 的内部工具函数。 */
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** 解析 MaybeRef 的内部工具函数。 */
const resolveMaybeRef = <T,>(value: ProgressMaybeRef<T> | undefined): T | undefined => {
  if (typeof value === 'function') return (value as () => T)()
  if (value && typeof value === 'object') {
    if ('get' in value && typeof value.get === 'function') return value.get()
    if ('value' in value) return value.value as T
  }
  return value as T | undefined
}

/** 格式化 aria-valuenow 的内部工具函数。 */
const formatAriaValue = (percent?: number) =>
  percent == null ? undefined : String(Math.round(percent))

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (base: string, className?: string) =>
  className ? `${base} ${className}` : base

/** polar To Cartesian 的内部工具函数。 */
const polarToCartesian = (cx: number, cy: number, radius: number, angle: number) => {
  const radians = ((angle - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  }
}

/** describe Arc Path 的内部工具函数。 */
const describeArcPath = (
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) => {
  const start = polarToCartesian(cx, cy, radius, startAngle)
  const end = polarToCartesian(cx, cy, radius, endAngle)
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`
}

/** 解析 Color Class 的内部工具函数。 */
const resolveColorClass = (color?: ProgressColor, status?: ProgressStatus) => {
  const resolved =
    color ??
    (status === 'success' ? 'success' : status === 'exception' ? 'error' : undefined) ??
    'primary'
  switch (resolved) {
    case 'neutral':
      return 'text-neutral'
    case 'secondary':
      return 'text-secondary'
    case 'accent':
      return 'text-accent'
    case 'info':
      return 'text-info'
    case 'success':
      return 'text-success'
    case 'warning':
      return 'text-warning'
    case 'error':
      return 'text-error'
    default:
      return 'text-primary'
  }
}

/** 解析 Status 的内部工具函数。 */
const resolveStatus = (
  status: ProgressStatus | undefined,
  percent: number | undefined,
): ProgressStatus => {
  if (status) return status
  if ((percent ?? 0) >= 100) return 'success'
  return 'normal'
}

/** 解析 Percent 的内部工具函数。 */
const resolvePercent = (percent?: number, value?: number, max?: number) => {
  if (typeof percent === 'number') return clamp(percent, 0, 100)
  if (typeof value === 'number') {
    if (typeof max === 'number' && max > 0) {
      return clamp((value / max) * 100, 0, 100)
    }
    return clamp(value, 0, 100)
  }
  return undefined
}

/** 解析 Success Percent 的内部工具函数。 */
const resolveSuccessPercent = (success?: ProgressSuccessProps) => {
  if (typeof success?.percent !== 'number') return 0
  return clamp(success.percent, 0, 100)
}

/** 解析 Line Size 的内部工具函数。 */
const resolveLineSize = (size?: ProgressSize, strokeWidth?: number): NormalizedLineSize => {
  if (Array.isArray(size)) {
    return {
      width: size[0],
      height: typeof size[1] === 'number' ? size[1] : 10,
    }
  }
  if (typeof size === 'object' && size) {
    return {
      width: size.width,
      height: typeof size.height === 'number' ? size.height : 10,
    }
  }
  if (typeof size === 'number') {
    return {
      width: undefined,
      height: size,
    }
  }
  if (typeof strokeWidth === 'number' && strokeWidth > 0) {
    return {
      width: undefined,
      height: strokeWidth,
    }
  }
  if (size === 'small') {
    return {
      width: undefined,
      height: 6,
    }
  }
  return {
    width: undefined,
    height: 10,
  }
}

/** 解析 Circle Size 的内部工具函数。 */
const resolveCircleSize = (size?: ProgressSize) => {
  if (typeof size === 'number') return size
  if (typeof size === 'string') {
    return size === 'small' ? 84 : 120
  }
  return 120
}

/** 归一化 Steps 的内部工具函数。 */
const normalizeSteps = (steps?: ProgressSteps): NormalizedSteps | null => {
  if (typeof steps === 'number' && steps > 0) {
    return {
      count: Math.floor(steps),
      gap: 4,
    }
  }
  if (typeof steps === 'object' && steps && steps.count > 0) {
    return {
      count: Math.floor(steps.count),
      gap: steps.gap >= 0 ? steps.gap : 4,
    }
  }
  return null
}

/** 解析 Linecap Class 的内部工具函数。 */
const resolveLinecapClass = (strokeLinecap?: ProgressLinecap) => {
  switch (strokeLinecap) {
    case 'butt':
      return 'rounded-none'
    case 'square':
      return 'rounded-sm'
    default:
      return 'rounded-full'
  }
}

/** 解析 Line Fill Style 的内部工具函数。 */
const resolveLineFillStyle = (strokeColor?: ProgressStrokeColor) => {
  if (!strokeColor || Array.isArray(strokeColor)) return undefined
  if (typeof strokeColor === 'string') {
    return { backgroundColor: strokeColor }
  }
  const direction = strokeColor.direction ?? 'to right'
  return {
    backgroundImage: `linear-gradient(${direction}, ${strokeColor.from}, ${strokeColor.to})`,
  }
}

/** 解析 Circle Stroke 的内部工具函数。 */
const resolveCircleStroke = (strokeColor?: ProgressStrokeColor) => {
  if (!strokeColor) return undefined
  if (typeof strokeColor === 'string') return strokeColor
  if (Array.isArray(strokeColor)) return strokeColor[0]
  return strokeColor.from
}

/** 解析 Step Color Style 的内部工具函数。 */
const resolveStepColorStyle = (strokeColor: ProgressStrokeColor | undefined, index: number) => {
  if (!Array.isArray(strokeColor) || !strokeColor.length) return undefined
  return {
    backgroundColor: strokeColor[Math.min(index, strokeColor.length - 1)],
  }
}

/** 解析 Gap Placement 的内部工具函数。 */
const resolveGapPlacement = (
  gapPlacement?: ProgressGapPlacement,
  gapPosition?: 'top' | 'bottom' | 'left' | 'right',
) => {
  if (gapPlacement) return gapPlacement
  switch (gapPosition) {
    case 'left':
      return 'start'
    case 'right':
      return 'end'
    default:
      return gapPosition ?? 'bottom'
  }
}

/** 解析 Gap Center 的内部工具函数。 */
const resolveGapCenter = (placement: ProgressGapPlacement) => {
  switch (placement) {
    case 'top':
      return 0
    case 'start':
      return 270
    case 'end':
      return 90
    default:
      return 180
  }
}

/** Default Status Icon 的内部工具函数。 */
const DefaultStatusIcon: FC<{ status: ProgressStatus }> = ({ status }) => {
  if (status === 'success') {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-success/15 text-success">
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-3.5 w-3.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m5 10 3 3 7-7" />
        </svg>
      </span>
    )
  }
  if (status === 'exception') {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-error/15 text-error">
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-3.5 w-3.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 8 8M14 6l-8 8" />
        </svg>
      </span>
    )
  }
  return <></>
}

/** 渲染 Indicator 的内部工具函数。 */
const renderIndicator = ({
  children,
  showInfo,
  format,
  percent,
  successPercent,
  status,
  type,
  inner,
}: {
  children?: any
  showInfo?: boolean
  format?: (percent?: number, successPercent?: number) => string
  percent?: number
  successPercent: number
  status: ProgressStatus
  type: ProgressType
  inner: boolean
}) => {
  if (children) return ''
  if (showInfo === false) return null
  if (format) return format(percent, successPercent)
  if (!inner && (status === 'success' || status === 'exception')) {
    return ''
  }
  if (percent == null) return type === 'line' ? '加载中' : '--'
  return `${Math.round(percent)}%`
}

/** LineProgressStepItems 的内部工具组件。 */
const LineProgressStepItems: FC<LineProgressStepItemsProps> = ({
  index,
  stepsConfig,
  completedCount,
  successCount,
  linecapClass,
  strokeColor,
  success,
  toneClass,
  resolvedRailColor,
}) => {
  if (index >= stepsConfig.count) return <></>

  const isSuccess = index < successCount
  const isActive = index >= successCount && index < completedCount
  const stepColorStyle = isActive ? resolveStepColorStyle(strokeColor, index) : undefined

  return (
    <>
      <span
        key={index}
        className={mergeClassName(
          `block h-full flex-1 ${linecapClass}`,
          isSuccess
            ? 'bg-success'
            : isActive
              ? mergeClassName('bg-current', toneClass)
              : 'bg-base-300/70',
        )}
        style={
          isSuccess
            ? success?.strokeColor
              ? { backgroundColor: success.strokeColor }
              : undefined
            : isActive
              ? stepColorStyle
              : resolvedRailColor
                ? { backgroundColor: resolvedRailColor }
                : undefined
        }
      />
      <LineProgressStepItems
        index={index + 1}
        stepsConfig={stepsConfig}
        completedCount={completedCount}
        successCount={successCount}
        linecapClass={linecapClass}
        strokeColor={strokeColor}
        success={success}
        toneClass={toneClass}
        resolvedRailColor={resolvedRailColor}
      />
    </>
  )
}

/** CircleProgressStepItems 的内部工具组件。 */
const CircleProgressStepItems: FC<CircleProgressStepItemsProps> = ({
  index,
  stepsConfig,
  startAngle,
  sweepAngle,
  radius,
  normalizedStrokeWidth,
  circleLinecap,
  resolvedPercent,
  successPercent,
  rounding,
  strokeColor,
  success,
  resolvedRailColor,
}) => {
  if (index >= stepsConfig.count) return <></>

  const gap = clamp(stepsConfig.gap, 0, sweepAngle / Math.max(stepsConfig.count * 2, 1))
  const segmentSweep = Math.max(
    (sweepAngle - gap * (stepsConfig.count - 1)) / stepsConfig.count,
    0.01,
  )
  const segmentStart = startAngle + index * (segmentSweep + gap)
  const segmentEnd = segmentStart + segmentSweep
  const completedCount =
    resolvedPercent == null
      ? 0
      : clamp(rounding((resolvedPercent / 100) * stepsConfig.count), 0, stepsConfig.count)
  const successCount = clamp(
    rounding((successPercent / 100) * stepsConfig.count),
    0,
    stepsConfig.count,
  )
  const isSuccess = index < successCount
  const isActive = index >= successCount && index < completedCount
  const path = describeArcPath(50, 50, radius, segmentStart, segmentEnd)
  const segmentStroke = isSuccess
    ? (success?.strokeColor ?? '#22c55e')
    : isActive
      ? (resolveCircleStroke(strokeColor) ?? 'currentColor')
      : (resolvedRailColor ?? 'currentColor')

  return (
    <>
      <path
        key={index}
        d={path}
        fill="none"
        stroke={segmentStroke}
        strokeWidth={normalizedStrokeWidth}
        strokeLinecap={circleLinecap}
        className={!isSuccess && !isActive && !resolvedRailColor ? 'text-base-300/70' : undefined}
      />
      <CircleProgressStepItems
        index={index + 1}
        stepsConfig={stepsConfig}
        startAngle={startAngle}
        sweepAngle={sweepAngle}
        radius={radius}
        normalizedStrokeWidth={normalizedStrokeWidth}
        circleLinecap={circleLinecap}
        resolvedPercent={resolvedPercent}
        successPercent={successPercent}
        rounding={rounding}
        strokeColor={strokeColor}
        success={success}
        resolvedRailColor={resolvedRailColor}
      />
    </>
  )
}

/** LineProgressBar 的内部工具组件。 */
const LineProgressBar: FC<LineProgressBarProps> = ({
  lineSize,
  lineStyle,
  linecapClass,
  resolvedRailColor,
  stepsConfig,
  resolvedPercent,
  successPercent,
  rounding,
  strokeColor,
  success,
  toneClass,
  resolvedStatus,
  indicatorPosition,
  indicatorAlign,
  indicator,
}) => {
  const currentResolvedPercent = computed(() => resolveMaybeRef(resolvedPercent))
  const currentSuccessPercent = computed(() => resolveMaybeRef(successPercent) ?? 0)
  const currentSuccess = computed(() => resolveMaybeRef(success))
  const currentToneClass = computed(() => resolveMaybeRef(toneClass) ?? '')
  const currentResolvedStatus = computed(() => resolveMaybeRef(resolvedStatus) ?? 'normal')
  const currentIndicator = computed(() => resolveMaybeRef(indicator))
  const completedCount = computed(() => {
    const percentValue = currentResolvedPercent.get()
    return stepsConfig && percentValue != null
      ? clamp(rounding((percentValue / 100) * stepsConfig.count), 0, stepsConfig.count)
      : 0
  })
  const successCount = computed(() =>
    stepsConfig
      ? clamp(
          rounding((currentSuccessPercent.get() / 100) * stepsConfig.count),
          0,
          stepsConfig.count,
        )
      : 0,
  )

  return (
    <div
      className={mergeClassName(`relative w-full overflow-hidden bg-base-300/70 ${linecapClass}`)}
      style={{
        ...lineStyle,
        ...(resolvedRailColor ? { backgroundColor: resolvedRailColor } : {}),
        height: `${lineSize.height}px`,
      }}
    >
      {stepsConfig ? (
        <div className="flex h-full w-full" style={{ gap: `${stepsConfig.gap}px` }}>
          <LineProgressStepItems
            index={0}
            stepsConfig={stepsConfig}
            completedCount={completedCount.get()}
            successCount={successCount.get()}
            linecapClass={linecapClass}
            strokeColor={strokeColor}
            success={currentSuccess.get()}
            toneClass={currentToneClass.get()}
            resolvedRailColor={resolvedRailColor}
          />
        </div>
      ) : currentResolvedPercent.get() == null ? (
        <span
          className={mergeClassName(
            `absolute inset-y-0 left-0 animate-pulse bg-current ${linecapClass}`,
            currentToneClass.get(),
          )}
          style={{
            width: '38%',
            ...resolveLineFillStyle(strokeColor),
          }}
        />
      ) : (
        <>
          {currentSuccessPercent.get() > 0 ? (
            <span
              className={mergeClassName(
                `absolute inset-y-0 left-0 ${linecapClass}`,
                currentSuccess.get()?.strokeColor ? undefined : 'bg-success',
              )}
              style={{
                width: `${currentSuccessPercent.get()}%`,
                ...(currentSuccess.get()?.strokeColor
                  ? { backgroundColor: currentSuccess.get()?.strokeColor }
                  : {}),
              }}
            />
          ) : null}
          {(currentResolvedPercent.get() ?? 0) > currentSuccessPercent.get() ? (
            <span
              className={mergeClassName(
                `absolute inset-y-0 ${linecapClass} bg-current`,
                currentToneClass.get(),
              )}
              style={{
                left: `${currentSuccessPercent.get()}%`,
                width: `${Math.max((currentResolvedPercent.get() ?? 0) - currentSuccessPercent.get(), 0)}%`,
                ...resolveLineFillStyle(strokeColor),
              }}
            />
          ) : null}
          {currentResolvedStatus.get() === 'active' ? (
            <span
              className={mergeClassName(
                `absolute inset-y-0 left-0 animate-pulse bg-white/20 ${linecapClass}`,
              )}
              style={{
                width: `${currentResolvedPercent.get() ?? 0}%`,
                backgroundImage:
                  'repeating-linear-gradient(120deg, rgba(255,255,255,0.15) 0 10px, rgba(255,255,255,0.32) 10px 20px)',
              }}
            />
          ) : null}
        </>
      )}
      {indicatorPosition === 'inner' && currentIndicator.get() != null && !stepsConfig ? (
        <span
          className={`absolute inset-0 flex items-center px-3 text-xs font-medium ${indicatorAlign === 'center' ? 'justify-center text-white' : indicatorAlign === 'start' ? 'justify-start text-white' : 'justify-end text-white'}`}
        >
          {String(currentIndicator.get() ?? '')}
        </span>
      ) : null}
    </div>
  )
}

/** Progress 的内部工具函数。 */
const Progress: FC<ProgressProps> = ({
  color,
  className,
  type = 'line',
  percent,
  max,
  value,
  status,
  showInfo = true,
  format,
  size,
  strokeWidth,
  strokeLinecap = 'round',
  strokeColor,
  trailColor,
  railColor,
  success,
  steps,
  gapDegree,
  gapPlacement,
  gapPosition,
  percentPosition,
  rounding = Math.round,
  children,
  ...rest
}) => {
  const hasCustomChildren = children !== undefined
  const hasEnhancedProps =
    percent !== undefined ||
    type !== 'line' ||
    status !== undefined ||
    showInfo !== true ||
    format !== undefined ||
    size !== undefined ||
    strokeWidth !== undefined ||
    strokeLinecap !== 'round' ||
    strokeColor !== undefined ||
    trailColor !== undefined ||
    railColor !== undefined ||
    success !== undefined ||
    steps !== undefined ||
    gapDegree !== undefined ||
    gapPlacement !== undefined ||
    gapPosition !== undefined ||
    percentPosition !== undefined ||
    hasCustomChildren

  if (!hasEnhancedProps) {
    let cls = 'progress'
    if (color) cls += ` progress-${color}`
    if (className) cls += ` ${className}`

    const progressProps = {
      ...rest,
      ...(max === undefined ? {} : { max: String(max) }),
      ...(value === undefined ? {} : { value }),
    }

    return <progress {...progressProps} className={cls} />
  }

  const resolvedPercent = computed(() =>
    resolvePercent(resolveMaybeRef(percent), resolveMaybeRef(value), resolveMaybeRef(max)),
  )
  const resolvedSuccess = computed(() => resolveMaybeRef(success))
  const successPercent = computed(() =>
    Math.min(resolveSuccessPercent(resolvedSuccess.get()), resolvedPercent.get() ?? 100),
  )
  const resolvedStatus = computed(() =>
    resolveStatus(resolveMaybeRef(status), resolvedPercent.get()),
  )
  const resolvedRailColor = railColor ?? trailColor
  const toneClass = computed(() => resolveColorClass(color, resolvedStatus.get()))
  const indicatorPosition = percentPosition?.type ?? 'outer'
  const indicatorAlign = percentPosition?.align ?? 'end'
  const indicator = computed(() =>
    renderIndicator({
      children,
      showInfo,
      format,
      percent: resolvedPercent.get(),
      successPercent: successPercent.get(),
      status: resolvedStatus.get(),
      type,
      inner: type === 'line' && indicatorPosition === 'inner' && !steps,
    }),
  )

  const IndicatorView = () => (
    <span>
      {children ? (
        children
      ) : !format &&
        !(type === 'line' && indicatorPosition === 'inner' && !steps) &&
        (resolvedStatus.get() === 'success' || resolvedStatus.get() === 'exception') ? (
        <DefaultStatusIcon status={resolvedStatus.get()} />
      ) : (
        <span>{String(indicator.get() ?? '')}</span>
      )}
    </span>
  )

  if (type === 'line') {
    const lineSize = resolveLineSize(size, strokeWidth)
    const linecapClass = resolveLinecapClass(strokeLinecap)
    const lineStyle = lineSize.width
      ? { width: typeof lineSize.width === 'number' ? `${lineSize.width}px` : lineSize.width }
      : undefined
    const stepsConfig = normalizeSteps(steps)

    return (
      <div
        {...rest}
        className={mergeClassName('rue-progress w-full', className)}
        data-progress-type="line"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={formatAriaValue(resolvedPercent.get())}
      >
        {indicatorPosition === 'outer' && indicatorAlign === 'end' && indicator.get() != null ? (
          <div className="flex items-center gap-3">
            <div className={mergeClassName('min-w-0 flex-1', toneClass.get())}>
              <LineProgressBar
                lineSize={lineSize}
                lineStyle={lineStyle}
                linecapClass={linecapClass}
                resolvedRailColor={resolvedRailColor}
                stepsConfig={stepsConfig}
                resolvedPercent={resolvedPercent}
                successPercent={successPercent}
                rounding={rounding}
                strokeColor={strokeColor}
                success={resolvedSuccess}
                toneClass={toneClass}
                resolvedStatus={resolvedStatus}
                indicatorPosition={indicatorPosition}
                indicatorAlign={indicatorAlign}
                indicator={indicator}
              />
            </div>
            <div className="shrink-0 text-sm">
              <IndicatorView />
            </div>
          </div>
        ) : (
          <div className={mergeClassName('space-y-2', toneClass.get())}>
            <LineProgressBar
              lineSize={lineSize}
              lineStyle={lineStyle}
              linecapClass={linecapClass}
              resolvedRailColor={resolvedRailColor}
              stepsConfig={stepsConfig}
              resolvedPercent={resolvedPercent}
              successPercent={successPercent}
              rounding={rounding}
              strokeColor={strokeColor}
              success={resolvedSuccess}
              toneClass={toneClass}
              resolvedStatus={resolvedStatus}
              indicatorPosition={indicatorPosition}
              indicatorAlign={indicatorAlign}
              indicator={indicator}
            />
            {indicatorPosition === 'outer' && indicator.get() != null ? (
              <div
                className={`text-sm ${indicatorAlign === 'center' ? 'text-center' : indicatorAlign === 'start' ? 'text-left' : 'text-right'}`}
              >
                <IndicatorView />
              </div>
            ) : null}
          </div>
        )}
      </div>
    )
  }

  const circleSize = resolveCircleSize(size)
  const normalizedStrokeWidth = clamp(strokeWidth ?? 8, 2, 20)
  const radius = 50 - normalizedStrokeWidth / 2
  const safeGapDegree = clamp(type === 'dashboard' ? (gapDegree ?? 75) : (gapDegree ?? 0), 0, 295)
  const placement = resolveGapPlacement(gapPlacement, gapPosition)
  const gapCenter = resolveGapCenter(placement)
  const startAngle = gapCenter + safeGapDegree / 2
  const sweepAngle = 360 - safeGapDegree
  const endAngle = startAngle + (type === 'circle' && safeGapDegree === 0 ? 359.999 : sweepAngle)
  const progressEndAngle = computed(
    () => startAngle + ((resolvedPercent.get() ?? 0) / 100) * sweepAngle,
  )
  const successEndAngle = computed(() => startAngle + (successPercent.get() / 100) * sweepAngle)
  const circleStroke = resolveCircleStroke(strokeColor)
  const stepsConfig = normalizeSteps(steps)
  const circleLinecap =
    strokeLinecap === 'square' ? 'square' : strokeLinecap === 'butt' ? 'butt' : 'round'
  const trackPath = describeArcPath(50, 50, radius, startAngle, endAngle)

  return (
    <div
      {...rest}
      className={mergeClassName(
        `rue-progress inline-flex flex-col items-center gap-3 ${toneClass.get()}`,
        className,
      )}
      data-progress-type={type}
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={formatAriaValue(resolvedPercent.get())}
    >
      <div className="relative" style={{ width: `${circleSize}px`, height: `${circleSize}px` }}>
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 overflow-visible">
          <path
            d={trackPath}
            fill="none"
            stroke={resolvedRailColor ?? 'currentColor'}
            strokeWidth={normalizedStrokeWidth}
            strokeLinecap={circleLinecap}
            className={resolvedRailColor ? undefined : 'text-base-300/70'}
          />
          {stepsConfig ? (
            <CircleProgressStepItems
              index={0}
              stepsConfig={stepsConfig}
              startAngle={startAngle}
              sweepAngle={sweepAngle}
              radius={radius}
              normalizedStrokeWidth={normalizedStrokeWidth}
              circleLinecap={circleLinecap}
              resolvedPercent={resolvedPercent.get()}
              successPercent={successPercent.get()}
              rounding={rounding}
              strokeColor={strokeColor}
              success={resolvedSuccess.get()}
              resolvedRailColor={resolvedRailColor}
            />
          ) : null}
          {!stepsConfig && successPercent.get() > 0 ? (
            <path
              d={describeArcPath(50, 50, radius, startAngle, successEndAngle.get())}
              fill="none"
              stroke={resolvedSuccess.get()?.strokeColor ?? '#22c55e'}
              strokeWidth={normalizedStrokeWidth}
              strokeLinecap={circleLinecap}
            />
          ) : null}
          {!stepsConfig && (resolvedPercent.get() ?? 0) > successPercent.get() ? (
            <path
              d={describeArcPath(50, 50, radius, successEndAngle.get(), progressEndAngle.get())}
              fill="none"
              stroke={circleStroke ?? 'currentColor'}
              strokeWidth={normalizedStrokeWidth}
              strokeLinecap={circleLinecap}
            />
          ) : null}
        </svg>
        {indicator.get() != null ? (
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm font-medium text-base-content">
            <IndicatorView />
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** 默认导出进度条组件。 */
export default Progress
