import { provideContext } from '@rue-js/rue/internal/app'
/*
Space 模块概述
- 汇总间距组件的公开类型、渲染入口和局部工具逻辑。
- 导出注释用于 API 文档生成，内部注释标明状态归一化、样式映射与 DOM 交互边界。
*/
import { createContext, useContext, type FC } from '@rue-js/rue'

/** SpaceDirection 位置或方向类型。 */
export type SpaceDirection = 'horizontal' | 'vertical'
/** SpaceAlign 对齐方式类型。 */
export type SpaceAlign = 'start' | 'end' | 'center' | 'baseline' | 'stretch'
/** SpaceSize 尺寸类型。 */
export type SpaceSize = 'small' | 'middle' | 'large' | number | string

/** SpaceProps 组件属性。 */
export interface SpaceProps {
  /** 自定义渲染的宿主元素。 */
  as?: 'div' | 'span' | 'section'
  /** 组件尺寸。 */
  size?: SpaceSize | [SpaceSize, SpaceSize]
  /** 布局方向。 */
  direction?: SpaceDirection
  /** orientation 配置项。 */
  orientation?: SpaceDirection
  /** vertical 配置项。 */
  vertical?: boolean
  /** 交叉轴或内容对齐方式。 */
  align?: SpaceAlign
  /** wrap 配置项。 */
  wrap?: boolean
  /** block 配置项。 */
  block?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: Record<string, any>
  /** itemClassName 附加类名。 */
  itemClassName?: string
  /** itemStyle 内联样式。 */
  itemStyle?: Record<string, any>
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** SpaceCompactProps 组件属性。 */
export interface SpaceCompactProps {
  /** 自定义渲染的宿主元素。 */
  as?: 'div' | 'span' | 'section'
  /** 组件尺寸。 */
  size?: SpaceSize
  /** 布局方向。 */
  direction?: SpaceDirection
  /** orientation 配置项。 */
  orientation?: SpaceDirection
  /** vertical 配置项。 */
  vertical?: boolean
  /** block 配置项。 */
  block?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: Record<string, any>
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

export interface SpaceItemProps {
  children?: any
  direction?: SpaceDirection
  align?: SpaceAlign
  itemClassName?: string
  itemStyle?: Record<string, any>
  showSeparator?: boolean
  separator?: string | number
  separatorGap?: string
}

export interface SpaceCompactItemProps {
  children?: any
  direction?: SpaceDirection
  index: number
  total: number
  block?: boolean
  blockItemStyle?: Record<string, any>
  compactShellStyle?: Record<string, any>
}

/** SPACE_SIZE_TOKENS 内部常量。 */
const SPACE_SIZE_TOKENS: Record<'small' | 'middle' | 'large', string> = {
  small: 'var(--rue-theme-space-sm, 8px)',
  middle: 'var(--rue-theme-space-md, 16px)',
  large: 'var(--rue-theme-space-lg, 24px)',
}

/** merge Class Names 的内部工具函数。 */
const mergeClassNames = (...classNames: Array<string | undefined | false>) => {
  return classNames.filter(Boolean).join(' ')
}

/** merge Style 的内部工具函数。 */
const mergeStyle = (...styles: Array<Record<string, any> | undefined>) => {
  const nextStyle: Record<string, any> = {}

  styles.forEach(style => {
    if (!style || typeof style !== 'object' || Array.isArray(style)) {
      return
    }
    Object.assign(nextStyle, style)
  })

  return Object.keys(nextStyle).length > 0 ? nextStyle : undefined
}

/** 归一化 Space Value 的内部工具函数。 */
const normalizeSpaceValue = (value?: SpaceSize) => {
  if (value == null) {
    return undefined
  }
  if (typeof value === 'number') {
    return `${value}px`
  }
  if (value === 'small' || value === 'middle' || value === 'large') {
    return SPACE_SIZE_TOKENS[value]
  }
  return value
}

/** 解析 Gap 的内部工具函数。 */
const resolveGap = (size?: SpaceSize | [SpaceSize, SpaceSize]) => {
  if (Array.isArray(size)) {
    return {
      columnGap: normalizeSpaceValue(size[0]),
      rowGap: normalizeSpaceValue(size[1]),
    }
  }

  const value = normalizeSpaceValue(size ?? 'small')
  return {
    columnGap: value,
    rowGap: value,
  }
}

/** 解析 Direction 的内部工具函数。 */
const resolveDirection = (
  orientation?: SpaceDirection,
  direction?: SpaceDirection,
  vertical?: boolean,
): SpaceDirection => {
  if (vertical) {
    return 'vertical'
  }
  return orientation ?? direction ?? 'horizontal'
}

/** resolve Compact Size Class Name 的内部工具函数。 */

/** 解析 Compact Item Class Name 的内部工具函数。 */
const resolveCompactItemClassName = (direction: SpaceDirection, index: number, total: number) => {
  const isFirst = index === 0
  const isLast = index === total - 1

  if (direction === 'vertical') {
    return mergeClassNames(
      'rue-space-compact-item relative overflow-hidden',
      !isFirst && '-mt-px rounded-t-none',
      !isLast && 'rounded-b-none',
    )
  }

  return mergeClassNames(
    'rue-space-compact-item relative overflow-hidden',
    !isFirst && '-ml-px rounded-l-none',
    !isLast && 'rounded-r-none',
  )
}

/** 解析 Compact Shell Style 的内部工具函数。 */
const resolveCompactShellStyle = (size?: SpaceSize) => {
  if (size == null) {
    return undefined
  }

  if (typeof size === 'number') {
    return { minHeight: `${size}px` }
  }

  if (size === 'small') {
    return { fontSize: '0.875rem' }
  }

  if (size === 'large') {
    return { fontSize: '1rem' }
  }

  if (/^\d/.test(size)) {
    return { minHeight: size }
  }

  return undefined
}

/** 渲染 Space Separator 的内部工具函数。 */
const RenderSpaceSeparator = ({
  arg0: separator,
  arg1: direction,
}: {
  arg0: string | number
  arg1: SpaceDirection
}) => {
  return (
    <span
      aria-hidden="true"
      className={mergeClassNames(
        'rue-space-separator shrink-0 select-none text-base-content/45',
        direction === 'vertical' && 'leading-none',
      )}
    >
      {String(separator)}
    </span>
  )
}

/** Space Item 的内部工具函数。 */
export const SpaceItem: FC<SpaceItemProps> = ({
  children,
  direction = 'horizontal',
  align,
  itemClassName,
  itemStyle,
  showSeparator,
  separator,
  separatorGap,
}) => {
  return (
    <div
      className={mergeClassNames('rue-space-item min-w-0 max-w-full', itemClassName)}
      style={mergeStyle(
        {
          display: 'flex',
          flexDirection: direction === 'vertical' ? 'column' : 'row',
          alignItems: align,
          minWidth: 0,
          maxWidth: '100%',
          ...(showSeparator
            ? direction === 'vertical'
              ? { rowGap: separatorGap }
              : { columnGap: separatorGap }
            : {}),
        },
        itemStyle,
      )}
    >
      {children}
      {showSeparator ? <RenderSpaceSeparator arg0={separator ?? ''} arg1={direction} /> : null}
    </div>
  )
}

const CompactContext = createContext<{
  direction: SpaceDirection
  block: boolean
  size?: SpaceSize
}>({ direction: 'horizontal', block: false })

/** Space Compact Item 的内部工具函数。 */
export const SpaceCompactItem: FC<SpaceCompactItemProps> = ({
  children,
  direction: itemDirection,
  index,
  total,
  block: itemBlock,
  blockItemStyle,
  compactShellStyle,
}) => {
  const context = useContext(CompactContext)
  const direction = itemDirection ?? context.direction
  const block = itemBlock ?? context.block
  return (
    <div
      data-rue-space-compact-item=""
      className={mergeClassNames(
        resolveCompactItemClassName(direction, index, total),
        block && (direction === 'vertical' ? 'w-full' : 'flex-1'),
      )}
      style={mergeStyle(
        {
          display: 'flex',
          minWidth: 0,
          maxWidth: '100%',
        },
        blockItemStyle,
        resolveCompactShellStyle(context.size),
        compactShellStyle,
      )}
    >
      {children}
    </div>
  )
}

/** Space Root 的内部工具函数。 */
const SpaceRoot: FC<SpaceProps> = ({
  as = 'div',
  size,
  direction,
  orientation,
  vertical,
  align,
  wrap = false,
  block = false,
  className,
  style,
  itemClassName,
  itemStyle,
  children,
  ...rest
}) => {
  const Component = as
  const resolvedDirection = resolveDirection(orientation, direction, vertical)
  const resolvedAlign = align ?? (resolvedDirection === 'horizontal' ? 'center' : undefined)
  const gap = resolveGap(size)

  return Component === 'div' ? (
    <div
      {...rest}
      className={mergeClassNames('rue-space min-w-0 max-w-full', className)}
      style={mergeStyle(
        {
          display: block ? 'flex' : 'inline-flex',
          flexDirection: resolvedDirection === 'vertical' ? 'column' : 'row',
          flexWrap: wrap ? 'wrap' : 'nowrap',
          alignItems: resolvedAlign,
          width: block ? '100%' : undefined,
          maxWidth: '100%',
          columnGap: gap.columnGap,
          rowGap: gap.rowGap,
        },
        style,
      )}
      data-rue-space=""
      data-rue-space-direction={resolvedDirection}
      aria-orientation={resolvedDirection}
    >
      {children}
    </div>
  ) : Component === 'span' ? (
    <span
      {...rest}
      className={mergeClassNames('rue-space min-w-0 max-w-full', className)}
      style={mergeStyle(
        {
          display: block ? 'flex' : 'inline-flex',
          flexDirection: resolvedDirection === 'vertical' ? 'column' : 'row',
          flexWrap: wrap ? 'wrap' : 'nowrap',
          alignItems: resolvedAlign,
          width: block ? '100%' : undefined,
          maxWidth: '100%',
          columnGap: gap.columnGap,
          rowGap: gap.rowGap,
        },
        style,
      )}
      data-rue-space=""
      data-rue-space-direction={resolvedDirection}
      aria-orientation={resolvedDirection}
    >
      {children}
    </span>
  ) : Component === 'section' ? (
    <section
      {...rest}
      className={mergeClassNames('rue-space min-w-0 max-w-full', className)}
      style={mergeStyle(
        {
          display: block ? 'flex' : 'inline-flex',
          flexDirection: resolvedDirection === 'vertical' ? 'column' : 'row',
          flexWrap: wrap ? 'wrap' : 'nowrap',
          alignItems: resolvedAlign,
          width: block ? '100%' : undefined,
          maxWidth: '100%',
          columnGap: gap.columnGap,
          rowGap: gap.rowGap,
        },
        style,
      )}
      data-rue-space=""
      data-rue-space-direction={resolvedDirection}
      aria-orientation={resolvedDirection}
    >
      {children}
    </section>
  ) : (
    <></>
  )
}

/** Space Compact 的内部工具函数。 */
const SpaceCompact: FC<SpaceCompactProps> = ({
  as = 'div',
  size,
  direction,
  orientation,
  vertical,
  block = false,
  className,
  style,
  children,
  ...rest
}) => {
  const Component = as
  const resolvedDirection = resolveDirection(orientation, direction, vertical)
  const blockItemStyle = block
    ? resolvedDirection === 'vertical'
      ? { width: '100%' }
      : { flex: '1 1 0%' }
    : undefined
  const compactShellStyle = resolveCompactShellStyle(size)

  provideContext(CompactContext, () => ({ direction: resolvedDirection, block, size }))

  return Component === 'div' ? (
    <div
      {...rest}
      className={mergeClassNames('rue-space-compact max-w-full', className)}
      style={mergeStyle(
        {
          display: 'flex',
          flexDirection: resolvedDirection === 'vertical' ? 'column' : 'row',
          width: block ? '100%' : undefined,
          maxWidth: '100%',
        },
        style,
      )}
      data-rue-space-compact=""
      data-rue-space-direction={resolvedDirection}
      aria-orientation={resolvedDirection}
    >
      {children}
    </div>
  ) : Component === 'span' ? (
    <span
      {...rest}
      className={mergeClassNames('rue-space-compact max-w-full', className)}
      style={mergeStyle(
        {
          display: 'flex',
          flexDirection: resolvedDirection === 'vertical' ? 'column' : 'row',
          width: block ? '100%' : undefined,
          maxWidth: '100%',
        },
        style,
      )}
      data-rue-space-compact=""
      data-rue-space-direction={resolvedDirection}
      aria-orientation={resolvedDirection}
    >
      {children}
    </span>
  ) : (
    <></>
  )
}

type SpaceCompound = FC<SpaceProps> & {
  Compact: FC<SpaceCompactProps>
}

const Space: SpaceCompound = /*#__PURE__*/ Object.assign(SpaceRoot, {
  Compact: SpaceCompact,
})

/** 默认导出间距组件。 */
export default Space
