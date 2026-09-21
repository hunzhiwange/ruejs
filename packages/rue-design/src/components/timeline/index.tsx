/*
Timeline 组件概述
- 保留 Rue 当前基于 daisyUI timeline 的视觉结构，不额外引入样式文件。
- 同时提供两套使用方式：
  1. 现有的 Start / Middle / End 复合槽位写法。
  2. 更接近数据驱动 items API。
- 数据驱动模式补齐了常用能力：mode、reverse、pending、icon、loading、color、title/content。
*/
import type { FC } from '@rue-js/rue'

/** TimelineDirection 位置或方向类型。 */
export type TimelineDirection = 'horizontal' | 'vertical'
/** TimelinePlacement 位置或方向类型。 */
export type TimelinePlacement = 'start' | 'end'
/** TimelineLegacyPosition 位置或方向类型。 */
export type TimelineLegacyPosition = 'left' | 'right' | TimelinePlacement
/** TimelineMode 类型。 */
export type TimelineMode = TimelinePlacement | 'alternate'

/** TimelineProps 组件属性。 */
export interface TimelineProps {
  /** 布局方向。 */
  direction?: TimelineDirection
  /** orientation 配置项。 */
  orientation?: TimelineDirection
  /** mode 配置项。 */
  mode?: TimelineMode
  /** snapIcon 图标内容。 */
  snapIcon?: boolean
  /** compact 配置项。 */
  compact?: boolean
  /** reverse 配置项。 */
  reverse?: boolean
  /** pending 配置项。 */
  pending?: any
  /** pendingDot 配置项。 */
  pendingDot?: any
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 数据驱动渲染项。 */
  items?: ReadonlyArray<TimelineItemProps>
}

/** TimelineItemPart 接口。 */
export interface TimelineItemPart {
  id?: string
  /** box 配置项。 */
  box?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 主体内容。 */
  content?: string | number
}

/** TimelineMiddlePart 接口。 */
export interface TimelineMiddlePart {
  id?: string
  kind?: 'dot' | 'loading'
  color?: string
  /** 根节点附加类名。 */
  className?: string
  /** 主体内容。 */
  content?: string | number
}

/** TimelineItemProps 组件属性。 */
export interface TimelineItemProps {
  contentId?: string
  titleId?: string
  /** 数据项唯一标识。 */
  key?: string | number
  /** beforeLine 配置项。 */
  beforeLine?: boolean
  /** afterLine 配置项。 */
  afterLine?: boolean
  /** start 配置项。 */
  start?: TimelineItemPart
  /** middle 配置项。 */
  middle?: TimelineMiddlePart
  /** end 配置项。 */
  end?: TimelineItemPart
  /** liClassName 附加类名。 */
  liClassName?: string
  /** 根节点附加类名。 */
  className?: string
  /** 标题内容。 */
  title?: string | number
  /** 主体内容。 */
  content?: string | number
  /** 展示标签。 */
  label?: string | number
  /** 组件子内容。 */
  children?: any
  /** 弹出层或内容展示位置。 */
  placement?: TimelinePlacement
  /** position 配置项。 */
  position?: TimelineLegacyPosition
  /** 组件语义色。 */
  color?: string
  /** 图标内容。 */
  icon?: string | number
  /** dot 配置项。 */
  dot?: string | number
  /** 是否展示加载态。 */
  loading?: boolean
  /** box 配置项。 */
  box?: boolean
  /** titleBox 配置项。 */
  titleBox?: boolean
  /** contentBox 配置项。 */
  contentBox?: boolean
  /** titleClassName 附加类名。 */
  titleClassName?: string
  /** contentClassName 附加类名。 */
  contentClassName?: string
  /** iconClassName 附加类名。 */
  iconClassName?: string
  /** lineClassName 附加类名。 */
  lineClassName?: string
}

interface TimelinePartProps {
  box?: boolean
  className?: string
  children?: any
}

interface TimelineRenderedItem {
  key?: string | number
  beforeLine: boolean
  afterLine: boolean
  start?: TimelineItemPart
  middle?: TimelineMiddlePart
  end?: TimelineItemPart
  liClassName?: string
  lineClassName?: string
  lineStyle?: Record<string, string>
}

/** SEMANTIC_TEXT_CLASS_MAP 内部常量。 */
const SEMANTIC_TEXT_CLASS_MAP: Record<string, string> = {
  neutral: 'text-neutral',
  primary: 'text-primary',
  secondary: 'text-secondary',
  accent: 'text-accent',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
}

/** SEMANTIC_LINE_CLASS_MAP 内部常量。 */
const SEMANTIC_LINE_CLASS_MAP: Record<string, string> = {
  neutral: 'bg-neutral border-neutral',
  primary: 'bg-primary border-primary',
  secondary: 'bg-secondary border-secondary',
  accent: 'bg-accent border-accent',
  info: 'bg-info border-info',
  success: 'bg-success border-success',
  warning: 'bg-warning border-warning',
  error: 'bg-error border-error',
}

/** join Class Name 的内部工具函数。 */
const joinClassName = (...values: Array<string | undefined | false>) => {
  return values.filter(Boolean).join(' ')
}

/** 判断 Defined 的内部工具函数。 */
const isDefined = (value: any) => value !== undefined && value !== null

/** 归一化 Direction 的内部工具函数。 */
const normalizeDirection = (
  direction?: TimelineDirection,
  orientation?: TimelineDirection,
): TimelineDirection | undefined => {
  return direction ?? orientation
}

/** 归一化 Position 的内部工具函数。 */
const normalizePosition = (position?: TimelineLegacyPosition): TimelinePlacement | undefined => {
  if (!position) return undefined
  if (position === 'left') return 'start'
  if (position === 'right') return 'end'
  return position
}

/** 解析 Placement 的内部工具函数。 */
const resolvePlacement = (item: TimelineItemProps, index: number, mode?: TimelineMode) => {
  const explicitPlacement = item.placement ?? normalizePosition(item.position)
  if (explicitPlacement) return explicitPlacement
  if (mode === 'alternate') {
    return index % 2 === 0 ? 'start' : 'end'
  }
  return mode === 'start' ? 'start' : 'end'
}

/** Default Dot 的内部工具函数。 */
const DefaultDot: FC<{ className?: string }> = ({ className }) => {
  return (
    <span
      className={joinClassName(
        'inline-block size-3 rounded-full border-2 border-current bg-base-100 align-middle',
        className,
      )}
    />
  )
}

/** Loading Dot 的内部工具函数。 */
const LoadingDot: FC<{ className?: string }> = ({ className }) => {
  return <span className={joinClassName('loading loading-spinner loading-xs', className)} />
}

/** 解析 Line Class Name 的内部工具函数。 */
const resolveLineClassName = (item: TimelineItemProps) => {
  return joinClassName(
    item.lineClassName,
    item.color ? SEMANTIC_LINE_CLASS_MAP[item.color] : undefined,
  )
}

/** 解析 Line Style 的内部工具函数。 */
const resolveLineStyle = (item: TimelineItemProps) => {
  if (!item.color || SEMANTIC_LINE_CLASS_MAP[item.color]) return undefined
  return {
    backgroundColor: item.color,
    borderColor: item.color,
  }
}

/** 解析 Middle Presentation 的内部工具函数。 */
const resolveMiddlePresentation = (
  item: TimelineItemProps,
  autoMode: boolean,
): TimelineMiddlePart | undefined => {
  const semanticColorClass = item.color ? SEMANTIC_TEXT_CLASS_MAP[item.color] : undefined
  const middleClassName = joinClassName(item.iconClassName, semanticColorClass)

  if (item.middle) {
    return {
      ...item.middle,
      className: joinClassName(item.middle.className, semanticColorClass),
      content: item.middle.content,
    }
  }

  if (isDefined(item.icon)) {
    return { className: middleClassName, content: item.icon }
  }
  if (isDefined(item.dot)) {
    return { className: middleClassName, content: item.dot }
  }
  if (item.loading) {
    return { className: middleClassName, kind: 'loading' }
  }
  if (item.color && !SEMANTIC_TEXT_CLASS_MAP[item.color]) {
    return {
      className: item.iconClassName,
      kind: 'dot',
      color: item.color,
    }
  }
  if (autoMode) {
    return { className: middleClassName, kind: 'dot' }
  }
  return undefined
}

/** 解析 Auto Parts 的内部工具函数。 */
const resolveAutoParts = (item: TimelineItemProps, placement: TimelinePlacement) => {
  const metaContent = item.title ?? item.label
  const bodyContent = item.content ?? item.title ?? item.label
  const hasIndependentMeta = isDefined(metaContent) && bodyContent !== metaContent

  if (!isDefined(bodyContent)) {
    return {
      start: item.start,
      end: item.end,
      autoMode: false,
    }
  }

  const mainPart: TimelineItemPart = {
    id: item.contentId,
    box: item.contentBox ?? item.box,
    className: item.contentClassName,
    content: bodyContent,
  }

  const metaPart = hasIndependentMeta
    ? {
        id: item.titleId,
        box: item.titleBox,
        className: item.titleClassName,
        content: metaContent,
      }
    : undefined

  if (placement === 'start') {
    return {
      start: item.start ?? mainPart,
      end: item.end ?? metaPart,
      autoMode: true,
    }
  }

  return {
    start: item.start ?? metaPart,
    end: item.end ?? mainPart,
    autoMode: true,
  }
}

/** 归一化 Pending Item 的内部工具函数。 */
const normalizePendingItem = (pending: any, pendingDot?: any): TimelineItemProps | null => {
  if (!pending) return null
  return {
    key: '__timeline_pending__',
    content: pending === true ? 'Pending' : pending,
    dot: pendingDot,
    loading: !isDefined(pendingDot),
    contentBox: true,
    liClassName: 'opacity-80',
  }
}

/** 归一化 Items 的内部工具函数。 */
const normalizeItems = (
  items: ReadonlyArray<TimelineItemProps>,
  mode?: TimelineMode,
  reverse?: boolean,
  pending?: any,
  pendingDot?: any,
) => {
  const merged = items.slice() as TimelineItemProps[]
  const pendingItem = normalizePendingItem(pending, pendingDot)
  if (pendingItem) merged.push(pendingItem)
  if (reverse) merged.reverse()

  return merged.map<TimelineRenderedItem>((item, index) => {
    const placement = resolvePlacement(item, index, mode)
    const hasExplicitParts = !!(item.start || item.end)
    const { start, end, autoMode } = hasExplicitParts
      ? {
          start: item.start,
          end: item.end,
          autoMode: false,
        }
      : resolveAutoParts(item, placement)

    return {
      key: item.key,
      beforeLine: item.beforeLine ?? index > 0,
      afterLine: item.afterLine ?? index < merged.length - 1,
      start,
      middle: resolveMiddlePresentation(item, autoMode),
      end,
      liClassName: joinClassName(item.liClassName, item.className),
      lineClassName: resolveLineClassName(item),
      lineStyle: resolveLineStyle(item),
    }
  })
}

/** 起始段：可选 box 样式。 */
const Start: FC<TimelinePartProps> = ({ box, className, children }) => {
  const cls = joinClassName('timeline-start', box && 'timeline-box', className)
  return <div className={cls}>{children}</div>
}

/** 中间段：承载默认圆点、图标或 loading。 */
const Middle: FC<TimelinePartProps> = ({ className, children }) => {
  const cls = joinClassName('timeline-middle', className)
  return <div className={cls}>{children}</div>
}

/** 结束段：通常承载主要内容卡片。 */
const End: FC<TimelinePartProps> = ({ box, className, children }) => {
  const cls = joinClassName('timeline-end', box && 'timeline-box', className)
  return <div className={cls}>{children}</div>
}

/** 渲染 Timeline Item 的内部工具函数。 */
const TimelineDataItem: FC<{ item: TimelineRenderedItem; index: number }> = ({ item, index }) => {
  return (
    <li className={item.liClassName} key={item.key ?? index}>
      {item.beforeLine ? <hr className={item.lineClassName} style={item.lineStyle} /> : null}
      {item.start ? (
        <Start box={item.start.box} className={item.start.className}>
          <span id={item.start.id}>{String(item.start.content ?? '')}</span>
        </Start>
      ) : null}
      {item.middle ? (
        <div
          className={joinClassName('timeline-middle', item.middle.className)}
          id={item.middle.id}
          style={{ color: item.middle.color }}
        >
          {item.middle.kind === 'loading' ? (
            <LoadingDot />
          ) : item.middle.kind === 'dot' ? (
            <DefaultDot />
          ) : (
            String(item.middle.content ?? '')
          )}
        </div>
      ) : null}
      {item.end ? (
        <End box={item.end.box} className={item.end.className}>
          <span id={item.end.id}>{String(item.end.content ?? '')}</span>
        </End>
      ) : null}
      {item.afterLine ? <hr className={item.lineClassName} style={item.lineStyle} /> : null}
    </li>
  )
}

/**
 * 时间轴组件。
 * - 当传入 items 时，组件负责把简化数据模型转换成 daisyUI 需要的 start/middle/end 结构。
 * - 当只传 children 时，维持旧版完全手写的自由布局能力。
 */
const Timeline: FC<TimelineProps> = ({
  direction,
  orientation,
  mode,
  snapIcon,
  compact,
  reverse,
  pending,
  pendingDot,
  className,
  children,
  items,
}) => {
  const resolvedDirection = normalizeDirection(direction, orientation)
  const isHorizontal = resolvedDirection !== 'vertical'
  const cls = joinClassName(
    'timeline',
    isHorizontal && 'overflow-x-auto',
    resolvedDirection && `timeline-${resolvedDirection}`,
    snapIcon && 'timeline-snap-icon',
    compact && 'timeline-compact',
    className,
  )

  const renderedItems =
    items && items.length
      ? normalizeItems(items, mode, reverse, pending, pendingDot)
      : pending
        ? normalizeItems([], mode, reverse, pending, pendingDot)
        : null

  return (
    <ul className={cls}>
      {renderedItems ? (
        <>
          {' '}
          {renderedItems.map((item, index) => (
            <TimelineDataItem key={item.key ?? index} item={item} index={index} />
          ))}{' '}
        </>
      ) : (
        children
      )}
    </ul>
  )
}

type TimelineCompound = FC<TimelineProps> & {
  Start: FC<TimelinePartProps>
  Middle: FC<TimelinePartProps>
  End: FC<TimelinePartProps>
}

const TimelineCompound: TimelineCompound = /*#__PURE__*/ Object.assign(Timeline, {
  Start,
  Middle,
  End,
})

/** 默认导出时间线组件。 */
export default TimelineCompound
