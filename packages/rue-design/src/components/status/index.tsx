/*
Status 组件概述
- 保留 Rue 原有的 status dot 视觉，同时融合 badge 的 dot / count / text / offset / wrapper 能力。
- 默认仍可作为单个状态点使用；传入 children 后会切换为包裹内容的角标模式。
*/
import type { FC } from '@rue-js/rue'

type StatusAs = 'span' | 'div'
type StatusSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'default' | 'medium' | 'large'
type StatusTone =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
type StatusSemantic = 'default' | 'processing' | 'success' | 'warning' | 'error'
type StatusColor = StatusTone | string
type StatusOffset = [number | string, number | string]

/** StatusProps 组件属性。 */
export interface StatusProps {
  /** 自定义渲染的宿主元素。 */
  as?: StatusAs
  /** ariaLabel 标签内容。 */
  ariaLabel?: string
  /** 组件尺寸。 */
  size?: StatusSize
  /** 组件语义色。 */
  color?: StatusColor
  /** 组件状态。 */
  status?: StatusSemantic | StatusTone
  /** text 区域配置。 */
  text?: any
  /** count 配置项。 */
  count?: any
  /** showZero 配置项。 */
  showZero?: boolean
  /** overflowCount 配置项。 */
  overflowCount?: number
  /** dot 配置项。 */
  dot?: boolean
  /** offset 配置项。 */
  offset?: StatusOffset
  /** 标题内容。 */
  title?: string
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: any
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface StatusRootProps {
  as?: StatusAs
  ariaLabel?: string
  rootClassName?: string
  rootStyle?: any
  className?: string
  style?: any
  restProps?: Record<string, any>
  children?: any
}

interface StatusDotProps {
  size?: StatusSize
  dotClass?: string
  processingClassName?: string
  className?: string
  style?: any
  title?: string
  customColor?: string
}

interface StatusCountProps {
  size?: StatusSize
  badgeClass?: string
  className?: string
  style?: any
  title?: string
  customColor?: string
  displayCount?: any
}

interface StatusTextProps {
  text?: any
  usesTone?: boolean
  textClass?: string
  customColor?: string
}

/** STATUS_TONES 内部常量。 */
const STATUS_TONES: StatusTone[] = [
  'neutral',
  'primary',
  'secondary',
  'accent',
  'info',
  'success',
  'warning',
  'error',
]

/** merge Class Names 的内部工具函数。 */
const mergeClassNames = (...values: Array<string | undefined | false | null>) => {
  return values.filter(Boolean).join(' ')
}

/** 判断是否存在 Renderable Content 的内部工具函数。 */
const hasRenderableContent = (value: any): boolean =>
  value != null && value !== false && value !== ''

/** 判断 Status Tone 的内部工具函数。 */
const isStatusTone = (value?: string): value is StatusTone => {
  return !!value && STATUS_TONES.includes(value as StatusTone)
}

/** 解析 Semantic Tone 的内部工具函数。 */
const resolveSemanticTone = (status?: StatusSemantic | StatusTone): StatusTone | undefined => {
  switch (status) {
    case 'default':
      return 'neutral'
    case 'processing':
      return 'info'
    case 'success':
    case 'warning':
    case 'error':
      return status
    default:
      return isStatusTone(status) ? status : undefined
  }
}

/** 解析 Size 的内部工具函数。 */
const resolveSize = (size?: StatusSize) => {
  switch (size) {
    case 'small':
      return 'sm'
    case 'default':
    case 'medium':
      return 'md'
    case 'large':
      return 'lg'
    default:
      return size
  }
}

/** 解析 Count Size Class 的内部工具函数。 */
const resolveCountSizeClass = (size?: StatusSize) => {
  switch (resolveSize(size) ?? 'md') {
    case 'xs':
      return 'min-h-4 min-w-4 px-1 text-[10px]'
    case 'sm':
      return 'min-h-5 min-w-5 px-1 text-[10px]'
    case 'lg':
      return 'min-h-6 min-w-6 px-2 text-sm'
    case 'xl':
      return 'min-h-7 min-w-7 px-2.5 text-sm'
    default:
      return 'min-h-5 min-w-5 px-1.5 text-[11px]'
  }
}

/** 解析 Tone Classes 的内部工具函数。 */
const resolveToneClasses = (tone?: StatusTone) => {
  switch (tone) {
    case 'primary':
      return {
        dotClass: 'status-primary',
        badgeClass: 'bg-primary text-primary-content',
        textClass: 'text-primary',
      }
    case 'secondary':
      return {
        dotClass: 'status-secondary',
        badgeClass: 'bg-secondary text-secondary-content',
        textClass: 'text-secondary',
      }
    case 'accent':
      return {
        dotClass: 'status-accent',
        badgeClass: 'bg-accent text-accent-content',
        textClass: 'text-accent',
      }
    case 'info':
      return {
        dotClass: 'status-info',
        badgeClass: 'bg-info text-info-content',
        textClass: 'text-info',
      }
    case 'success':
      return {
        dotClass: 'status-success',
        badgeClass: 'bg-success text-success-content',
        textClass: 'text-success',
      }
    case 'warning':
      return {
        dotClass: 'status-warning',
        badgeClass: 'bg-warning text-warning-content',
        textClass: 'text-warning',
      }
    case 'error':
      return {
        dotClass: 'status-error',
        badgeClass: 'bg-error text-error-content',
        textClass: 'text-error',
      }
    case 'neutral':
      return {
        dotClass: 'status-neutral',
        badgeClass: 'bg-neutral text-neutral-content',
        textClass: 'text-neutral',
      }
    default:
      return {
        dotClass: '',
        badgeClass: 'bg-neutral text-neutral-content',
        textClass: 'text-base-content',
      }
  }
}

/** to Css Length 的内部工具函数。 */

/** 归一化 Offset Value 的内部工具函数。 */
const normalizeOffsetValue = (value: number | string) => {
  return typeof value === 'number' ? `${Math.abs(value)}px` : String(value).trim().replace(/^-/, '')
}

/** negate Offset 的内部工具函数。 */
const negateOffset = (value: number | string) => {
  if (typeof value === 'number') {
    return `${value * -1}px`
  }

  const normalized = String(value).trim()
  return normalized.startsWith('-') ? normalized.slice(1) : `-${normalized}`
}

/** 解析 Indicator Offset Style 的内部工具函数。 */
const resolveIndicatorOffsetStyle = (offset?: StatusOffset) => {
  if (!offset) {
    return undefined
  }

  return {
    insetInlineEnd: negateOffset(offset[0]),
    marginTop: normalizeOffsetValue(offset[1]),
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

/** 归一化 Count 的内部工具函数。 */
const normalizeCount = (count: any, overflowCount: number) => {
  if (typeof count === 'number' && count > overflowCount) {
    return `${overflowCount}+`
  }
  return count
}

const resolveRootStyle = (style: any, rootStyle: any) => {
  return style || rootStyle ? { ...style, ...rootStyle } : undefined
}

const StatusRoot: FC<StatusRootProps> = ({
  as = 'span',
  ariaLabel,
  rootClassName,
  rootStyle,
  className,
  style,
  restProps,
  children,
}) => {
  const common = {
    ...restProps,
    ...(ariaLabel !== undefined ? { 'aria-label': ariaLabel } : {}),
    className: mergeClassNames(rootClassName, className),
    style: resolveRootStyle(style, rootStyle),
  }

  if (as === 'div') {
    return <div {...common}>{children}</div>
  }

  return <span {...common}>{children}</span>
}

const StatusDot: FC<StatusDotProps> = ({
  size,
  dotClass,
  processingClassName,
  className,
  style,
  title,
  customColor,
}) => {
  const resolvedSize = resolveSize(size)

  return (
    <span
      className={mergeClassNames(
        'status',
        resolvedSize ? `status-${resolvedSize}` : undefined,
        dotClass,
        processingClassName,
        className,
      )}
      style={customColor ? { backgroundColor: customColor, color: customColor, ...style } : style}
      title={title}
    />
  )
}

const StatusCount: FC<StatusCountProps> = ({
  size,
  badgeClass,
  className,
  style,
  title,
  customColor,
  displayCount,
}) => {
  return (
    <span
      className={mergeClassNames(
        'inline-flex items-center justify-center whitespace-nowrap rounded-full font-medium leading-none shadow-sm',
        resolveCountSizeClass(size),
        badgeClass,
        className,
      )}
      style={customColor ? { backgroundColor: customColor, color: '#fff', ...style } : style}
      title={title}
    >
      {displayCount}
    </span>
  )
}

const StatusText: FC<StatusTextProps> = ({ text, usesTone, textClass, customColor }) => {
  return (
    <span
      className={mergeClassNames(
        'text-sm leading-none',
        usesTone && !customColor ? textClass : undefined,
      )}
      style={usesTone && customColor ? { color: customColor } : undefined}
    >
      {text}
    </span>
  )
}

/** Status 的内部工具函数。 */
const Status: FC<StatusProps> = ({
  as = 'span',
  ariaLabel,
  size,
  color,
  status,
  text,
  count = null,
  showZero = false,
  overflowCount = 99,
  dot = false,
  offset,
  title,
  className,
  style,
  children,
  ...rest
}) => {
  const resolvedSize = resolveSize(size)
  const hasChildren = hasRenderableContent(children)
  const hasExplicitCount = count !== null && count !== undefined
  const semanticTone = resolveSemanticTone(status)
  const fallbackTone = hasChildren || hasExplicitCount || dot ? 'error' : undefined
  const mergedColor = color ?? semanticTone ?? fallbackTone
  const presetTone = isStatusTone(mergedColor) ? mergedColor : undefined
  const customColor = typeof mergedColor === 'string' && !presetTone ? mergedColor : undefined
  const toneClasses = resolveToneClasses(presetTone)
  const toneDotClass = toneClasses?.dotClass ?? ''
  const toneBadgeClass = toneClasses?.badgeClass ?? 'bg-neutral text-neutral-content'
  const toneTextClass = toneClasses?.textClass ?? 'text-base-content'
  const displayCount = dot ? '' : normalizeCount(count, overflowCount)
  const isZeroCount = displayCount === 0 || displayCount === '0'
  const ignoreCount = !hasExplicitCount || (isZeroCount && !showZero)
  const showAsDot = dot && !isZeroCount
  const hasText = text === 0 || (!!text && text !== true)
  const showText = hasText && (!hasExplicitCount || showAsDot || !ignoreCount)
  const usesStatusLabelMode = !hasExplicitCount && !dot
  const showLeadingStatusDot =
    !hasChildren &&
    hasText &&
    hasExplicitCount &&
    !showAsDot &&
    !ignoreCount &&
    (status !== undefined || color !== undefined)
  const showStandaloneIndicator = !hasChildren && hasText && (showAsDot || !ignoreCount)
  const processingClassName = status === 'processing' ? 'animate-pulse' : undefined
  const indicatorTitle =
    title ??
    (typeof displayCount === 'number' || typeof displayCount === 'string'
      ? `${displayCount}`
      : undefined)

  const simpleStandaloneDot = !hasChildren && !showText && (showAsDot || !hasExplicitCount)
  if (simpleStandaloneDot) {
    return (
      <StatusRoot
        as={as}
        ariaLabel={ariaLabel}
        rootClassName={mergeClassNames(
          'status',
          resolvedSize ? `status-${resolvedSize}` : undefined,
          toneDotClass,
          processingClassName,
        )}
        rootStyle={customColor ? { backgroundColor: customColor, color: customColor } : undefined}
        className={className}
        style={style}
        restProps={rest}
      />
    )
  }

  const indicatorOffsetStyle = resolveIndicatorOffsetStyle(offset)

  if (!hasChildren && (showAsDot || !hasExplicitCount)) {
    if (showStandaloneIndicator) {
      return (
        <StatusRoot
          as={as}
          ariaLabel={ariaLabel}
          className={className}
          style={style}
          restProps={rest}
        >
          <span className="indicator inline-flex align-middle">
            <StatusDot
              size={size}
              dotClass={toneDotClass}
              processingClassName={processingClassName}
              className="indicator-item ring-2 ring-base-100 shadow-sm"
              style={indicatorOffsetStyle}
              title={indicatorTitle}
              customColor={customColor}
            />
            <span
              className={mergeClassNames(
                'inline-flex items-center text-sm leading-none text-base-content',
                resolveStandaloneIndicatorContentClassName({ dot: showAsDot, displayCount }),
              )}
            >
              {showLeadingStatusDot ? (
                <span className="inline-flex items-center gap-2">
                  <StatusDot
                    size={size}
                    dotClass={toneDotClass}
                    processingClassName={processingClassName}
                    className="shrink-0"
                    customColor={customColor}
                  />
                  <span className="text-sm leading-none">{text}</span>
                </span>
              ) : (
                text
              )}
            </span>
          </span>
        </StatusRoot>
      )
    }

    return (
      <StatusRoot
        as={as}
        ariaLabel={ariaLabel}
        rootClassName="inline-flex items-center gap-2 align-middle"
        className={className}
        style={style}
        restProps={rest}
      >
        <StatusDot
          size={size}
          dotClass={toneDotClass}
          processingClassName={processingClassName}
          customColor={customColor}
        />
        {showText ? (
          <StatusText
            text={text}
            usesTone={usesStatusLabelMode}
            textClass={toneTextClass}
            customColor={customColor}
          />
        ) : null}
      </StatusRoot>
    )
  }

  if (!hasChildren) {
    if (ignoreCount) {
      return <></>
    }

    if (showStandaloneIndicator) {
      return (
        <StatusRoot
          as={as}
          ariaLabel={ariaLabel}
          className={className}
          style={style}
          restProps={rest}
        >
          <span className="indicator inline-flex align-middle">
            <StatusCount
              size={size}
              badgeClass={toneBadgeClass}
              className="indicator-item"
              style={indicatorOffsetStyle}
              title={indicatorTitle}
              customColor={customColor}
              displayCount={displayCount}
            />
            <span
              className={mergeClassNames(
                'inline-flex items-center text-sm leading-none text-base-content',
                resolveStandaloneIndicatorContentClassName({ dot: showAsDot, displayCount }),
              )}
            >
              {showLeadingStatusDot ? (
                <span className="inline-flex items-center gap-2">
                  <StatusDot
                    size={size}
                    dotClass={toneDotClass}
                    processingClassName={processingClassName}
                    className="shrink-0"
                    customColor={customColor}
                  />
                  <span className="text-sm leading-none">{text}</span>
                </span>
              ) : (
                text
              )}
            </span>
          </span>
        </StatusRoot>
      )
    }

    return (
      <StatusRoot
        as={as}
        ariaLabel={ariaLabel}
        rootClassName="inline-flex items-center gap-2 align-middle"
        className={className}
        style={style}
        restProps={rest}
      >
        <StatusCount
          size={size}
          badgeClass={toneBadgeClass}
          title={indicatorTitle}
          customColor={customColor}
          displayCount={displayCount}
        />
        {showText ? (
          <StatusText
            text={text}
            usesTone={usesStatusLabelMode}
            textClass={toneTextClass}
            customColor={customColor}
          />
        ) : null}
      </StatusRoot>
    )
  }

  return (
    <StatusRoot
      as={as}
      ariaLabel={ariaLabel}
      rootClassName="inline-flex items-center gap-2 align-middle"
      className={className}
      style={style}
      restProps={rest}
    >
      <span className="indicator inline-flex w-fit shrink-0 align-middle">
        {showAsDot ? (
          <StatusDot
            size={size}
            dotClass={toneDotClass}
            processingClassName={processingClassName}
            className="indicator-item ring-2 ring-base-100 shadow-sm"
            style={indicatorOffsetStyle}
            title={indicatorTitle}
            customColor={customColor}
          />
        ) : !ignoreCount ? (
          <StatusCount
            size={size}
            badgeClass={toneBadgeClass}
            className="indicator-item ring-2 ring-base-100"
            style={indicatorOffsetStyle}
            title={indicatorTitle}
            customColor={customColor}
            displayCount={displayCount}
          />
        ) : null}
        <span className="inline-flex w-fit shrink-0 align-middle">{children}</span>
      </span>
      {showText ? (
        <StatusText
          text={text}
          usesTone={usesStatusLabelMode}
          textClass={toneTextClass}
          customColor={customColor}
        />
      ) : null}
    </StatusRoot>
  )
}

/** 默认导出状态点组件。 */
export default Status
