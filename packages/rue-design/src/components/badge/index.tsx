/*
Badge 组件概述
- 保留 Rue 现有 badge 视觉语义：variant / size / outline / dash / soft / ghost。
- 补齐常用能力：count、dot、showZero、overflowCount、status、color、offset。
- 当需要角标包裹时输出 indicator 结构；普通标签场景仍保持轻量 badge 输出。
*/
import type { FC } from '@rue-js/rue'

/** BadgeVariant 视觉或语义变体类型。 */
export type BadgeVariant =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'

/** BadgeStatus 状态类型。 */
export type BadgeStatus = BadgeVariant | 'default' | 'processing'
/** BadgeSize 尺寸类型。 */
export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'medium'
/** BadgeRibbonPlacement 位置或方向类型。 */
export type BadgeRibbonPlacement = 'start' | 'end'

/** BadgeProps 组件属性。 */
export interface BadgeProps {
  /** 组件视觉变体。 */
  variant?: BadgeVariant
  /** 组件尺寸。 */
  size?: BadgeSize
  /** outline 配置项。 */
  outline?: boolean
  /** dash 配置项。 */
  dash?: boolean
  /** soft 配置项。 */
  soft?: boolean
  /** ghost 配置项。 */
  ghost?: boolean
  /** count 配置项。 */
  count?: number | string
  /** overflowCount 配置项。 */
  overflowCount?: number
  /** showZero 配置项。 */
  showZero?: boolean
  /** dot 配置项。 */
  dot?: boolean
  /** 组件状态。 */
  status?: BadgeStatus
  /** 组件语义色。 */
  color?: string
  /** text 区域配置。 */
  text?: string | number
  /** offset 配置项。 */
  offset?: [number | string, number | string]
  /** 标题内容。 */
  title?: string
  /** 根节点内联样式。 */
  style?: Record<string, any>
  /** indicatorClassName 附加类名。 */
  indicatorClassName?: string
  /** indicatorStyle 内联样式。 */
  indicatorStyle?: Record<string, any>
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
}

/** BadgeRibbonProps 组件属性。 */
export interface BadgeRibbonProps {
  /** text 区域配置。 */
  text?: string | number
  /** 组件语义色。 */
  color?: string
  /** 弹出层或内容展示位置。 */
  placement?: BadgeRibbonPlacement
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: Record<string, any>
  /** 组件子内容。 */
  children?: any
}

type BadgeCompound = FC<BadgeProps> & {
  Ribbon: FC<BadgeRibbonProps>
}

interface BadgeStatusDotProps extends Pick<
  BadgeProps,
  'size' | 'status' | 'color' | 'offset' | 'title' | 'indicatorClassName' | 'indicatorStyle'
> {
  variant: BadgeVariant
  indicatorItem?: boolean
}

interface BadgeCountNodeProps extends Pick<
  BadgeProps,
  | 'size'
  | 'outline'
  | 'dash'
  | 'soft'
  | 'ghost'
  | 'color'
  | 'offset'
  | 'indicatorClassName'
  | 'indicatorStyle'
> {
  variant: BadgeVariant
  displayCount: any
  countTitle?: string
  indicatorItem?: boolean
}

interface BadgeIndicatorContainerProps {
  className?: string
  style?: Record<string, any>
  indicatorNode?: any
  children?: any
}

/** PRESET_VARIANTS 内部常量。 */
const PRESET_VARIANTS: BadgeVariant[] = [
  'neutral',
  'primary',
  'secondary',
  'accent',
  'info',
  'success',
  'warning',
  'error',
]

/** 判断 Preset Variant 的内部工具函数。 */
const isPresetVariant = (value?: string): value is BadgeVariant => {
  return !!value && PRESET_VARIANTS.includes(value as BadgeVariant)
}

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (...parts: Array<string | false | null | undefined>) => {
  return parts.filter(Boolean).join(' ')
}

/** 解析 Size Class 的内部工具函数。 */
const resolveSizeClass = (size?: BadgeSize) => {
  switch (size) {
    case 'small':
      return 'sm'
    case 'medium':
      return 'md'
    default:
      return size
  }
}

/** 解析 Status Tone 的内部工具函数。 */
const resolveStatusTone = (status?: BadgeStatus): BadgeVariant | undefined => {
  switch (status) {
    case 'default':
      return 'neutral'
    case 'processing':
      return 'info'
    default:
      return status
  }
}

/** 解析 Primitive Number 的内部工具函数。 */
const resolvePrimitiveNumber = (value: any) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    const parsed = Number(trimmed)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }
  return null
}

/** 判断 Empty Value 的内部工具函数。 */
const isEmptyValue = (value: any) => {
  return value === null || value === undefined || value === false || value === ''
}

/** 判断是否存在 Renderable Content 的内部工具函数。 */
const hasRenderableContent = (value: any): boolean =>
  value != null && value !== false && value !== ''

/** negate Offset 的内部工具函数。 */
const negateOffset = (value: number | string) => {
  if (typeof value === 'number') {
    return `${-value}px`
  }
  return value.startsWith('-') ? value.slice(1) : `-${value}`
}

/** 归一化 Offset Value 的内部工具函数。 */
const normalizeOffsetValue = (value: number | string) => {
  if (typeof value === 'number') {
    return `${value}px`
  }
  return value
}

/** 创建 Badge Class Name 的内部工具函数。 */
const createBadgeClassName = ({
  variant,
  size,
  outline,
  dash,
  soft,
  ghost,
  className,
}: {
  variant?: BadgeVariant
  size?: BadgeSize
  outline?: boolean
  dash?: boolean
  soft?: boolean
  ghost?: boolean
  className?: string
}) => {
  const resolvedSize = resolveSizeClass(size)
  let cls = 'badge'
  if (variant) cls += ` badge-${variant}`
  if (resolvedSize) cls += ` badge-${resolvedSize}`
  if (outline) cls += ' badge-outline'
  if (dash) cls += ' badge-dash'
  if (soft) cls += ' badge-soft'
  if (ghost) cls += ' badge-ghost'
  if (className) cls += ` ${className}`
  return cls
}

/** 解析 Count Display 的内部工具函数。 */
const resolveCountDisplay = (count: any, overflowCount: number) => {
  const numericValue = resolvePrimitiveNumber(count)
  if (numericValue !== null && numericValue > overflowCount) {
    return `${overflowCount}+`
  }
  return count
}

/** should Show Text 的内部工具函数。 */
const shouldShowText = (text: any) => {
  return !(text === null || text === undefined || text === false || text === '')
}

/** 判断 Count 是否应展示的内部工具函数。 */
const resolveHasCount = (count: any, showZero?: boolean) => {
  const primitiveCount = resolvePrimitiveNumber(count)
  return !isEmptyValue(count) && !(primitiveCount === 0 && !showZero)
}

/** 判断 Dot 是否应展示的内部工具函数。 */
const resolveShowDot = (dot?: boolean, count?: number | string) => {
  return !!dot && resolvePrimitiveNumber(count) !== 0
}

/** 判断 Status 是否应展示的内部工具函数。 */
const resolveHasStatus = ({
  dot,
  count,
  showZero,
  status,
  color,
}: Pick<BadgeProps, 'dot' | 'count' | 'showZero' | 'status' | 'color'>) => {
  return !resolveShowDot(dot, count) && !resolveHasCount(count, showZero) && (!!status || !!color)
}

/** 判断是否存在角标内容的内部工具函数。 */
const resolveHasIndicator = ({
  dot,
  count,
  showZero,
  status,
  color,
}: Pick<BadgeProps, 'dot' | 'count' | 'showZero' | 'status' | 'color'>) => {
  return (
    resolveShowDot(dot, count) ||
    resolveHasCount(count, showZero) ||
    resolveHasStatus({ dot, count, showZero, status, color })
  )
}

/** 判断是否进入 Indicator 模式的内部工具函数。 */
const resolveUsesIndicatorMode = ({
  count,
  dot,
  status,
  color,
  text,
  offset,
  indicatorClassName,
  indicatorStyle,
}: Pick<
  BadgeProps,
  'count' | 'dot' | 'status' | 'color' | 'text' | 'offset' | 'indicatorClassName' | 'indicatorStyle'
>) => {
  return (
    count !== undefined ||
    !!dot ||
    !!status ||
    !!color ||
    !!text ||
    !!offset ||
    !!indicatorClassName ||
    !!indicatorStyle
  )
}

/** 解析 Indicator Variant 的内部工具函数。 */
const resolveIndicatorVariant = ({
  variant,
  status,
  color,
}: Pick<BadgeProps, 'variant' | 'status' | 'color'>) => {
  if (isPresetVariant(color)) {
    return color
  }
  return resolveStatusTone(status) ?? variant ?? 'error'
}

/** 解析 Indicator Offset Style 的内部工具函数。 */
const resolveIndicatorOffsetStyle = (offset?: [number | string, number | string]) => {
  if (!offset) {
    return undefined
  }
  return {
    insetInlineEnd: negateOffset(offset[0]),
    marginTop: normalizeOffsetValue(offset[1]),
  }
}

/** 解析 Count Indicator Style 的内部工具函数。 */
const resolveCountIndicatorStyle = ({
  color,
  offset,
  indicatorStyle,
}: Pick<BadgeProps, 'color' | 'offset' | 'indicatorStyle'>) => {
  const offsetStyle = resolveIndicatorOffsetStyle(offset)
  if (color && !isPresetVariant(color)) {
    return {
      ...offsetStyle,
      backgroundColor: color,
      borderColor: color,
      color: '#fff',
      ...indicatorStyle,
    }
  }
  return {
    ...offsetStyle,
    ...indicatorStyle,
  }
}

/** 解析 Dot Indicator Style 的内部工具函数。 */
const resolveDotIndicatorStyle = ({
  color,
  offset,
  indicatorStyle,
}: Pick<BadgeProps, 'color' | 'offset' | 'indicatorStyle'>) => {
  const offsetStyle = resolveIndicatorOffsetStyle(offset)
  if (color && !isPresetVariant(color)) {
    return {
      ...offsetStyle,
      backgroundColor: color,
      color,
      ...indicatorStyle,
    }
  }
  return {
    ...offsetStyle,
    ...indicatorStyle,
  }
}

/** 解析 Status Size Class 的内部工具函数。 */
const resolveStatusSizeClass = (size?: BadgeSize) => {
  switch (resolveSizeClass(size)) {
    case 'xs':
      return 'status-xs'
    case 'sm':
      return 'status-sm'
    case 'lg':
      return 'status-lg'
    case 'xl':
      return 'status-xl'
    default:
      return 'status-md'
  }
}

/** 解析 Standalone Indicator Content Class Name 的内部工具函数。 */
const resolveStandaloneIndicatorContentClassName = ({
  dot,
  displayCount,
}: {
  dot: boolean
  displayCount: any
}) => {
  if (dot) {
    return 'pe-3.5'
  }

  const countText = `${displayCount ?? ''}`
  if (countText.length >= 3) {
    return 'pe-8'
  }

  if (countText.length === 2) {
    return 'pe-7'
  }

  return 'pe-6'
}

/** 解析 Badge Title 的内部工具函数。 */
const resolveBadgeTitle = (title: string | undefined, count: any, overflowCount: number) => {
  if (title !== undefined) {
    return title
  }
  const displayCount = resolveCountDisplay(count, overflowCount)
  return typeof displayCount === 'string' || typeof displayCount === 'number'
    ? `${String(displayCount ?? '')}`
    : undefined
}

/** 解析 Ribbon Preset Variant 的内部工具函数。 */
const resolveRibbonPresetVariant = (color?: string) => {
  return isPresetVariant(color) ? color : 'primary'
}

/** 判断 Ribbon 是否使用预设色的内部工具函数。 */
const resolveUsesPresetRibbonTone = (color?: string) => {
  return !color || isPresetVariant(color)
}

/** 创建 Ribbon Class Name 的内部工具函数。 */
const createRibbonClassName = ({
  color,
  placement,
  className,
}: Pick<BadgeRibbonProps, 'color' | 'placement' | 'className'>) => {
  const presetVariant = resolveRibbonPresetVariant(color)
  const usesPresetRibbonTone = resolveUsesPresetRibbonTone(color)
  return mergeClassName(
    'badge badge-sm pointer-events-none absolute top-4 z-10 min-w-[9rem] justify-center rounded-none px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] shadow-lg',
    usesPresetRibbonTone ? `badge-${presetVariant}` : 'text-white',
    placement === 'start' ? 'left-[-3.25rem] -rotate-45' : 'right-[-3.25rem] rotate-45',
    className,
  )
}

/** 解析 Ribbon Style 的内部工具函数。 */
const resolveRibbonStyle = ({ color, style }: Pick<BadgeRibbonProps, 'color' | 'style'>) => {
  if (color && !isPresetVariant(color)) {
    return {
      backgroundColor: color,
      borderColor: color,
      color: '#fff',
      ...style,
    }
  }
  return style
}

/** Badge Status Dot 的内部工具函数。 */
const BadgeStatusDot: FC<BadgeStatusDotProps> = ({
  variant,
  size,
  status,
  color,
  offset,
  title,
  indicatorClassName,
  indicatorStyle,
  indicatorItem,
}) => {
  return (
    <span
      className={mergeClassName(
        indicatorItem
          ? 'indicator-item indicator-top indicator-end status ring-2 ring-base-100 shadow-sm'
          : 'status ring-2 ring-base-100 shadow-sm',
        `status-${variant}`,
        resolveStatusSizeClass(size),
        status === 'processing' && 'animate-pulse',
        indicatorClassName,
      )}
      style={resolveDotIndicatorStyle({ color, offset, indicatorStyle })}
      title={title}
    />
  )
}

/** Badge Count Node 的内部工具函数。 */
const BadgeCountNode: FC<BadgeCountNodeProps> = ({
  variant,
  size,
  outline,
  dash,
  soft,
  ghost,
  color,
  offset,
  indicatorClassName,
  indicatorStyle,
  displayCount,
  countTitle,
  indicatorItem,
}) => {
  return (
    <span
      className={
        indicatorItem
          ? mergeClassName(
              'indicator-item indicator-top indicator-end border-none shadow-sm ring-2 ring-base-100',
              createBadgeClassName({
                variant,
                size,
                outline,
                dash,
                soft,
                ghost,
                className: indicatorClassName,
              }),
            )
          : createBadgeClassName({
              variant,
              size,
              outline,
              dash,
              soft,
              ghost,
              className: mergeClassName('border-none shadow-sm', indicatorClassName),
            })
      }
      style={resolveCountIndicatorStyle({ color, offset, indicatorStyle })}
      title={countTitle}
    >
      {String(displayCount ?? '')}
    </span>
  )
}

/** Badge Indicator Container 的内部工具函数。 */

/** Badge Base 的内部工具函数。 */
const BadgeBase: FC<BadgeProps> = ({
  variant,
  size,
  outline,
  dash,
  soft,
  ghost,
  count,
  overflowCount = 99,
  showZero,
  dot,
  status,
  color,
  text,
  offset,
  title,
  style,
  indicatorClassName,
  indicatorStyle,
  className,
  children,
}) => {
  const displayCount = resolveCountDisplay(count, overflowCount)
  const hasCount = resolveHasCount(count, showZero)
  const showDot = resolveShowDot(dot, count)
  const hasStatus = resolveHasStatus({ dot, count, showZero, status, color })
  const hasIndicator = resolveHasIndicator({ dot, count, showZero, status, color })
  const usesIndicatorMode = resolveUsesIndicatorMode({
    count,
    dot,
    status,
    color,
    text,
    offset,
    indicatorClassName,
    indicatorStyle,
  })
  const indicatorVariant = resolveIndicatorVariant({ variant, status, color })
  const hasText = shouldShowText(text)
  const hasChildren = hasRenderableContent(children)
  const badgeTitle = resolveBadgeTitle(title, count, overflowCount)

  if (!hasChildren && usesIndicatorMode && hasStatus) {
    return (
      <span
        className={mergeClassName('inline-flex items-center gap-2 align-middle', className)}
        style={style}
      >
        <BadgeStatusDot
          variant={indicatorVariant}
          size={size}
          status={status}
          color={color}
          offset={offset}
          title={title}
          indicatorClassName={indicatorClassName}
          indicatorStyle={indicatorStyle}
        />
        {hasText ? <span>{String(text ?? '')}</span> : null}
      </span>
    )
  }

  if (!hasChildren && usesIndicatorMode && (showDot || hasCount)) {
    if (hasText) {
      return (
        <span
          className={mergeClassName('indicator inline-flex align-middle', className)}
          style={style}
        >
          {showDot ? (
            <BadgeStatusDot
              indicatorItem
              variant={indicatorVariant}
              size={size}
              status={status}
              color={color}
              offset={offset}
              title={title}
              indicatorClassName={indicatorClassName}
              indicatorStyle={indicatorStyle}
            />
          ) : (
            <BadgeCountNode
              indicatorItem
              variant={indicatorVariant}
              size={size}
              outline={outline}
              dash={dash}
              soft={soft}
              ghost={ghost}
              color={color}
              offset={offset}
              indicatorClassName={indicatorClassName}
              indicatorStyle={indicatorStyle}
              displayCount={String(displayCount ?? '')}
              countTitle={badgeTitle}
            />
          )}
          <span
            className={mergeClassName(
              'inline-flex align-middle',
              resolveStandaloneIndicatorContentClassName({ dot: showDot, displayCount }),
            )}
          >
            {String(text ?? '')}
          </span>
        </span>
      )
    }

    return (
      <span className={mergeClassName('inline-flex align-middle', className)} style={style}>
        {showDot ? (
          <BadgeStatusDot
            variant={indicatorVariant}
            size={size}
            status={status}
            color={color}
            offset={offset}
            title={title}
            indicatorClassName={indicatorClassName}
            indicatorStyle={indicatorStyle}
          />
        ) : (
          <BadgeCountNode
            variant={indicatorVariant}
            size={size}
            outline={outline}
            dash={dash}
            soft={soft}
            ghost={ghost}
            color={color}
            offset={offset}
            indicatorClassName={indicatorClassName}
            indicatorStyle={indicatorStyle}
            displayCount={String(displayCount ?? '')}
            countTitle={badgeTitle}
          />
        )}
      </span>
    )
  }

  if (!hasChildren && usesIndicatorMode) {
    if (!hasText) {
      return <></>
    }
    return (
      <span
        className={mergeClassName('inline-flex items-center gap-2 align-middle', className)}
        style={style}
      >
        <span>{String(text ?? '')}</span>
      </span>
    )
  }

  if (hasChildren && usesIndicatorMode) {
    if (hasText) {
      return (
        <span className="inline-flex items-center gap-2 align-middle">
          <span
            className={mergeClassName('indicator inline-flex align-middle', className)}
            style={style}
          >
            {!hasIndicator ? null : showDot || hasStatus ? (
              <BadgeStatusDot
                indicatorItem
                variant={indicatorVariant}
                size={size}
                status={status}
                color={color}
                offset={offset}
                title={title}
                indicatorClassName={indicatorClassName}
                indicatorStyle={indicatorStyle}
              />
            ) : (
              <BadgeCountNode
                indicatorItem
                variant={indicatorVariant}
                size={size}
                outline={outline}
                dash={dash}
                soft={soft}
                ghost={ghost}
                color={color}
                offset={offset}
                indicatorClassName={indicatorClassName}
                indicatorStyle={indicatorStyle}
                displayCount={String(displayCount ?? '')}
                countTitle={badgeTitle}
              />
            )}
            <span className="inline-flex align-middle">{children}</span>
          </span>
          <span>{String(text ?? '')}</span>
        </span>
      )
    }

    return (
      <span
        className={mergeClassName('indicator inline-flex align-middle', className)}
        style={style}
      >
        {!hasIndicator ? null : showDot || hasStatus ? (
          <BadgeStatusDot
            indicatorItem
            variant={indicatorVariant}
            size={size}
            status={status}
            color={color}
            offset={offset}
            title={title}
            indicatorClassName={indicatorClassName}
            indicatorStyle={indicatorStyle}
          />
        ) : (
          <BadgeCountNode
            indicatorItem
            variant={indicatorVariant}
            size={size}
            outline={outline}
            dash={dash}
            soft={soft}
            ghost={ghost}
            color={color}
            offset={offset}
            indicatorClassName={indicatorClassName}
            indicatorStyle={indicatorStyle}
            displayCount={String(displayCount ?? '')}
            countTitle={badgeTitle}
          />
        )}
        <span className="inline-flex align-middle">{children}</span>
      </span>
    )
  }

  return (
    <span
      className={createBadgeClassName({
        variant,
        size,
        outline,
        dash,
        soft,
        ghost,
        className,
      })}
      style={style}
      title={title}
    >
      {children}
    </span>
  )
}

/** Badge Ribbon 的内部工具函数。 */
const BadgeRibbon: FC<BadgeRibbonProps> = ({
  text,
  color,
  placement = 'end',
  className,
  style,
  children,
}) => {
  return (
    <div className="relative inline-block overflow-hidden align-middle">
      <span
        className={createRibbonClassName({ color, placement, className })}
        style={resolveRibbonStyle({ color, style })}
      >
        {String(text ?? '')}
      </span>
      {children}
    </div>
  )
}

const Badge: BadgeCompound = /*#__PURE__*/ Object.assign(BadgeBase, {
  Ribbon: BadgeRibbon,
})

/** 默认导出徽标组件。 */
export default Badge
