/*
RadialProgress 模块概述
- 汇总环形进度组件的公开类型、渲染入口和局部工具逻辑。
- 导出注释用于 API 文档生成，内部注释标明状态归一化、样式映射与 DOM 交互边界。
*/
import type { FC } from '@rue-js/rue'

type StyleValue = string | number | null | undefined

interface StyleObject {
  [key: string]: StyleValue
}

/** RadialProgressType 视觉或语义变体类型。 */
export type RadialProgressType = 'circle' | 'dashboard'
/** RadialProgressStatus 状态类型。 */
export type RadialProgressStatus = 'normal' | 'exception' | 'success'
/** RadialProgressLinecap 类型。 */
export type RadialProgressLinecap = 'round' | 'square' | 'butt'
/** RadialProgressSize 尺寸类型。 */
export type RadialProgressSize = number | string | 'small' | 'default' | 'medium'
/** RadialProgressSteps 类型。 */
export type RadialProgressSteps = number | { count: number; gap: number }
/** RadialProgressGapPlacement 位置或方向类型。 */
export type RadialProgressGapPlacement = 'top' | 'bottom' | 'start' | 'end'

/** RadialProgressSuccessProps 组件属性。 */
export interface RadialProgressSuccessProps {
  /** percent 配置项。 */
  percent?: number
  /** 受控值。 */
  value?: string | number
  /** strokeColor 颜色。 */
  strokeColor?: string
}

/** RadialProgressProps 组件属性。 */
export interface RadialProgressProps {
  /** 受控值。 */
  value?: string | number
  /** percent 配置项。 */
  percent?: number
  /** max 配置项。 */
  max?: string | number
  /** 组件类型或语义类型。 */
  type?: RadialProgressType
  /** 组件状态。 */
  status?: RadialProgressStatus
  /** showInfo 配置项。 */
  showInfo?: boolean
  /** format 配置项。 */
  format?: (percent?: number, successPercent?: number) => string | number
  /** 组件尺寸。 */
  size?: RadialProgressSize
  /** thickness 配置项。 */
  thickness?: string | number
  /** strokeWidth 配置项。 */
  strokeWidth?: string | number
  /** strokeLinecap 配置项。 */
  strokeLinecap?: RadialProgressLinecap
  /** strokeColor 颜色。 */
  strokeColor?: string | string[]
  /** railColor 颜色。 */
  railColor?: string
  /** trailColor 颜色。 */
  trailColor?: string
  /** success 配置项。 */
  success?: RadialProgressSuccessProps
  /** steps 配置项。 */
  steps?: RadialProgressSteps
  /** gapDegree 配置项。 */
  gapDegree?: number
  /** gapPlacement 配置项。 */
  gapPlacement?: RadialProgressGapPlacement
  /** gapPosition 配置项。 */
  gapPosition?: 'top' | 'bottom' | 'left' | 'right'
  /** 根节点内联样式。 */
  style?: string | StyleObject
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface NormalizedSteps {
  count: number
  gap: number
}

/** 转换为 Kebab Case 的内部工具函数。 */
const toKebabCase = (value: string) => value.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)

/** clamp 的内部工具函数。 */
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (base: string, className?: string) =>
  className ? `${base} ${className}` : base

/** parse Numberish 的内部工具函数。 */
const parseNumberish = (value?: string | number) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

/** 归一化 Css Length 的内部工具函数。 */
const normalizeCssLength = (value?: string | number) => {
  if (value == null) {
    return undefined
  }

  return typeof value === 'number' ? `${value}px` : String(value)
}

/** 解析 Size 的内部工具函数。 */
const resolveSize = (size?: RadialProgressSize) => {
  if (size === 'small') {
    return '4rem'
  }
  if (size === 'medium') {
    return '6rem'
  }
  if (size === 'default' || size == null) {
    return '5rem'
  }

  return normalizeCssLength(size) ?? '5rem'
}

/** 解析 Thickness 的内部工具函数。 */
const resolveThickness = (
  thickness?: string | number,
  strokeWidth?: string | number,
  size?: string,
) => {
  return normalizeCssLength(thickness ?? strokeWidth) ?? `calc(${size ?? '5rem'} / 10)`
}

/** 解析 Percent 的内部工具函数。 */
const resolvePercent = (percent?: number, value?: string | number, max?: string | number) => {
  if (typeof percent === 'number') {
    return clamp(percent, 0, 100)
  }

  const resolvedValue = parseNumberish(value)
  if (resolvedValue == null) {
    return undefined
  }

  const resolvedMax = parseNumberish(max)
  if (resolvedMax != null && resolvedMax > 0) {
    return clamp((resolvedValue / resolvedMax) * 100, 0, 100)
  }

  return clamp(resolvedValue, 0, 100)
}

/** 解析 Success Percent 的内部工具函数。 */
const resolveSuccessPercent = (success?: RadialProgressSuccessProps, max?: string | number) => {
  if (!success) {
    return 0
  }
  if (typeof success.percent === 'number') {
    return clamp(success.percent, 0, 100)
  }

  const resolved = resolvePercent(undefined, success.value, max)
  return resolved ?? 0
}

/** 解析 Status 的内部工具函数。 */
const resolveStatus = (status: RadialProgressStatus | undefined, percent: number) => {
  if (status) {
    return status
  }

  return percent >= 100 ? 'success' : 'normal'
}

/** 解析 Status Tone Class 的内部工具函数。 */
const resolveStatusToneClass = (status: RadialProgressStatus) => {
  if (status === 'success') {
    return 'text-success'
  }
  if (status === 'exception') {
    return 'text-error'
  }
  return undefined
}

/** 解析 Gap Placement 的内部工具函数。 */
const resolveGapPlacement = (
  gapPlacement?: RadialProgressGapPlacement,
  gapPosition?: 'top' | 'bottom' | 'left' | 'right',
): RadialProgressGapPlacement => {
  if (gapPlacement) {
    return gapPlacement
  }

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
const resolveGapCenter = (placement: RadialProgressGapPlacement) => {
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

/** 归一化 Steps 的内部工具函数。 */
const normalizeSteps = (steps?: RadialProgressSteps): NormalizedSteps | null => {
  if (typeof steps === 'number' && steps > 0) {
    return {
      count: Math.floor(steps),
      gap: 2,
    }
  }
  if (typeof steps === 'object' && steps && steps.count > 0) {
    return {
      count: Math.floor(steps.count),
      gap: steps.gap >= 0 ? steps.gap : 2,
    }
  }

  return null
}

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

/** 判断是否存在 Renderable Children 的内部工具函数。 */
const hasRenderableChildren = (children: any) =>
  children != null && children !== false && children !== ''

/** Default Status Icon 的内部工具函数。 */
const DefaultStatusIcon: FC<{ status: RadialProgressStatus }> = ({ status }) => {
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
}: {
  children?: any
  showInfo?: boolean
  format?: (percent?: number, successPercent?: number) => string | number
  percent: number
  successPercent: number
  status: RadialProgressStatus
}) => {
  if (hasRenderableChildren(children)) {
    return children
  }
  if (showInfo === false) {
    return null
  }
  if (format) {
    return format(percent, successPercent)
  }
  if (status === 'success' || status === 'exception') {
    return <DefaultStatusIcon status={status} />
  }
  return `${Math.round(percent)}%`
}

/** serialize Style 的内部工具函数。 */
const serializeStyle = (style?: string | StyleObject) => {
  if (!style) {
    return ''
  }
  if (typeof style === 'string') {
    return style.trim()
  }

  return Object.entries(style)
    .filter(([, value]) => value != null)
    .map(([key, value]) => `${key.startsWith('--') ? key : toKebabCase(key)}:${String(value)}`)
    .join('; ')
}

/** 合并 Style 文本的内部工具函数。 */
const mergeSerializedStyles = (...styles: Array<string | undefined>) => {
  return styles
    .map(style => style?.trim())
    .filter(Boolean)
    .join('; ')
}

/** Radial Progress 的内部工具函数。 */
const RadialProgress: FC<RadialProgressProps> = ({
  value,
  percent,
  max,
  type = 'circle',
  status,
  showInfo = true,
  format,
  size,
  thickness,
  strokeWidth,
  strokeLinecap = 'round',
  strokeColor,
  railColor,
  trailColor,
  success,
  steps,
  gapDegree,
  gapPlacement,
  gapPosition,
  style,
  className,
  children,
  role,
  ...rest
}) => {
  const CompiledRow1 = ({ rowArg0 }: { rowArg0: any }) => {
    const index = rowArg0

    const gap = clamp(stepsConfig!.gap, 0, sweepAngle / Math.max(stepsConfig!.count * 2, 1))
    const segmentSweep = Math.max(
      (sweepAngle - gap * (stepsConfig!.count - 1)) / stepsConfig!.count,
      0.01,
    )
    const segmentStart = startAngle + index * (segmentSweep + gap)
    const segmentEnd = segmentStart + segmentSweep
    const completedCount = clamp(
      Math.round((resolvedPercent / 100) * stepsConfig!.count),
      0,
      stepsConfig!.count,
    )
    const successCount = clamp(
      Math.round((resolvedSuccessPercent / 100) * stepsConfig!.count),
      0,
      stepsConfig!.count,
    )
    const isSuccess = index < successCount
    const isActive = index >= successCount && index < completedCount
    const segmentStrokeColor = isSuccess
      ? success?.strokeColor
      : Array.isArray(strokeColor)
        ? strokeColor[Math.min(index, strokeColor.length - 1)]
        : progressStrokeColor

    return (
      <path
        key={index}
        d={describeArcPath(50, 50, 42, segmentStart, segmentEnd)}
        fill="none"
        stroke={segmentStrokeColor ?? 'currentColor'}
        strokeLinecap={strokeLinecap}
        vectorEffect="non-scaling-stroke"
        style={{ strokeWidth: 'var(--thickness)' }}
        className={
          isSuccess
            ? success?.strokeColor
              ? undefined
              : 'text-success'
            : isActive
              ? segmentStrokeColor
                ? undefined
                : progressToneClass
              : resolvedRailColor
                ? undefined
                : 'text-base-300/70'
        }
      />
    )
  }

  const ariaValueNow = rest['aria-valuenow']
  const ariaValueMin = rest['aria-valuemin']
  const ariaValueMax = rest['aria-valuemax']
  const forwardedRef = rest.ref
  if ('aria-valuenow' in rest) {
    delete rest['aria-valuenow']
  }
  if ('aria-valuemin' in rest) {
    delete rest['aria-valuemin']
  }
  if ('aria-valuemax' in rest) {
    delete rest['aria-valuemax']
  }
  if ('ref' in rest) {
    delete rest.ref
  }

  const resolvedPercent = resolvePercent(percent, value, max) ?? 0
  const resolvedSuccessPercent = Math.min(resolveSuccessPercent(success, max), resolvedPercent)
  const resolvedStatus = resolveStatus(status, resolvedPercent)
  const resolvedSize = resolveSize(size)
  const resolvedThickness = resolveThickness(thickness, strokeWidth, resolvedSize)
  const resolvedRailColor = railColor ?? trailColor
  const stepsConfig = normalizeSteps(steps)
  const resolvedGapDegree = clamp(
    type === 'dashboard' ? (gapDegree ?? 75) : (gapDegree ?? 0),
    0,
    295,
  )
  const resolvedGapPlacement = resolveGapPlacement(gapPlacement, gapPosition)
  const gapCenter = resolveGapCenter(resolvedGapPlacement)
  const startAngle = gapCenter + resolvedGapDegree / 2
  const sweepAngle = 360 - resolvedGapDegree
  const endAngle =
    startAngle + (type === 'circle' && resolvedGapDegree === 0 ? 359.999 : sweepAngle)
  const progressEndAngle = startAngle + (resolvedPercent / 100) * sweepAngle
  const successEndAngle = startAngle + (resolvedSuccessPercent / 100) * sweepAngle
  const progressToneClass = resolveStatusToneClass(resolvedStatus)
  const indicator = renderIndicator({
    children,
    showInfo,
    format,
    percent: resolvedPercent,
    successPercent: resolvedSuccessPercent,
    status: resolvedStatus,
  })
  const progressStrokeColor = Array.isArray(strokeColor) ? strokeColor[0] : strokeColor
  const rootStyle = mergeSerializedStyles(
    serializeStyle(style),
    serializeStyle({
      '--value': resolvedPercent,
      '--size': resolvedSize,
      '--thickness': resolvedThickness,
      width: resolvedSize,
      height: resolvedSize,
    }),
  )
  const trackPath = describeArcPath(50, 50, 42, startAngle, endAngle)
  const indicatorFontSize = `clamp(0.75rem, calc(${resolvedSize} / 4.5), 1.75rem)`
  const stepIndexes = stepsConfig
    ? Array.from({ length: stepsConfig!.count }, (_, index) => index)
    : []

  return (
    <div
      {...rest}
      ref={forwardedRef}
      role={role ?? 'progressbar'}
      aria-valuemin={ariaValueMin ?? '0'}
      aria-valuemax={ariaValueMax ?? '100'}
      aria-valuenow={String(ariaValueNow ?? Math.round(resolvedPercent))}
      style={rootStyle}
      className={mergeClassName(
        'rue-radial-progress relative inline-grid shrink-0 place-items-center align-middle',
        className,
      )}
      data-progress-type={type}
    >
      <div
        className="radial-progress invisible pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
      <svg
        viewBox="0 0 100 100"
        className="pointer-events-none absolute inset-0 h-full w-full -rotate-90 overflow-visible"
        aria-hidden="true"
      >
        <path
          d={trackPath}
          fill="none"
          stroke={resolvedRailColor ?? 'currentColor'}
          strokeLinecap={strokeLinecap}
          vectorEffect="non-scaling-stroke"
          style={{ strokeWidth: 'var(--thickness)' }}
          className={resolvedRailColor ? undefined : 'text-base-300/70'}
        />
        {stepsConfig ? (
          <>
            {' '}
            {stepIndexes.map((rowArg0: any, rowIndex: number) => (
              <CompiledRow1 rowArg0={rowArg0} />
            ))}{' '}
          </>
        ) : null}
        {!stepsConfig && resolvedSuccessPercent > 0 ? (
          <path
            d={describeArcPath(50, 50, 42, startAngle, successEndAngle)}
            fill="none"
            stroke={success?.strokeColor ?? 'currentColor'}
            strokeLinecap={strokeLinecap}
            vectorEffect="non-scaling-stroke"
            style={{ strokeWidth: 'var(--thickness)' }}
            className={success?.strokeColor ? undefined : 'text-success'}
          />
        ) : null}
        {!stepsConfig && resolvedPercent > resolvedSuccessPercent ? (
          <path
            d={describeArcPath(50, 50, 42, successEndAngle, progressEndAngle)}
            fill="none"
            stroke={progressStrokeColor ?? 'currentColor'}
            strokeLinecap={strokeLinecap}
            vectorEffect="non-scaling-stroke"
            style={{ strokeWidth: 'var(--thickness)' }}
            className={progressStrokeColor ? undefined : progressToneClass}
          />
        ) : null}
      </svg>
      {indicator != null ? (
        <div
          className="relative z-10 flex h-full w-full items-center justify-center px-[18%] text-center font-medium leading-tight"
          style={{ fontSize: indicatorFontSize }}
        >
          {indicator}
        </div>
      ) : null}
    </div>
  )
}

/** 默认导出环形进度组件。 */
export default RadialProgress
