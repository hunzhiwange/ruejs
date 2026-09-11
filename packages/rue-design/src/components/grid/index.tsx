/*
Grid 组件概述
- 提供 Grid 的 24 栅格 Row / Col API，同时保持 Rue 当前轻量的 className + style 组合方式。
- Row 负责 gutter、主轴/交叉轴对齐、换行与响应式 gutter；Col 负责 span、offset、push/pull、flex 与断点覆盖。
- 默认导出可直接当作 Row 使用，并挂载 Row / Col 子组件，便于业务代码在简写与显式写法之间切换。
*/
import type { FC } from '@rue-js/rue'
import { computed, onMounted, onUnmounted, ref } from '@rue-js/rue'

/** GridBreakpoint 类型。 */
export type GridBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
/** GridGutterSize 尺寸类型。 */
export type GridGutterSize = number | string
/** GridAlign 对齐方式类型。 */
export type GridAlign = 'top' | 'middle' | 'bottom' | 'stretch'
/** GridJustify 对齐方式类型。 */
export type GridJustify =
  | 'start'
  | 'end'
  | 'center'
  | 'space-around'
  | 'space-between'
  | 'space-evenly'

/** GridResponsiveValue 值类型。 */
export type GridResponsiveValue<T> = Partial<Record<GridBreakpoint, T>>
/** GridResponsiveGutter 类型。 */
export type GridResponsiveGutter = GridGutterSize | GridResponsiveValue<GridGutterSize>
/** GridGutter 类型。 */
export type GridGutter = GridResponsiveGutter | [GridResponsiveGutter, GridResponsiveGutter]
/** GridStyle 样式值类型。 */
export type GridStyle = string | Record<string, any>

/** GridColConfig 配置对象。 */
export interface GridColConfig {
  /** span 配置项。 */
  span?: number
  /** order 配置项。 */
  order?: number
  /** offset 配置项。 */
  offset?: number
  /** push 配置项。 */
  push?: number
  /** pull 配置项。 */
  pull?: number
  /** flex 配置项。 */
  flex?: number | string
}

/** GridColResponsive 类型。 */
export type GridColResponsive = number | GridColConfig

/** GridRowProps 组件属性。 */
export interface GridRowProps {
  /** 栅格间距。 */
  gutter?: GridGutter
  /** 交叉轴或内容对齐方式。 */
  align?: GridAlign
  /** 主轴分布方式。 */
  justify?: GridJustify
  /** wrap 配置项。 */
  wrap?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: GridStyle
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** GridColProps 组件属性。 */
export interface GridColProps extends GridColConfig {
  /** xs 配置项。 */
  xs?: GridColResponsive
  /** sm 配置项。 */
  sm?: GridColResponsive
  /** md 配置项。 */
  md?: GridColResponsive
  /** lg 配置项。 */
  lg?: GridColResponsive
  /** xl 配置项。 */
  xl?: GridColResponsive
  /** xxl 配置项。 */
  xxl?: GridColResponsive
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: GridStyle
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** GridCompound 接口。 */
export interface GridCompound extends FC<GridRowProps> {
  /** Row 配置项。 */
  Row: FC<GridRowProps>
  /** Col 配置项。 */
  Col: FC<GridColProps>
}

/** BREAKPOINT_SEQUENCE 内部常量。 */
const BREAKPOINT_SEQUENCE: GridBreakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl']
/** BREAKPOINT_MIN_WIDTH 内部常量。 */
const BREAKPOINT_MIN_WIDTH: Record<GridBreakpoint, number> = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600,
}
const viewportSubscribers = /*#__PURE__*/ new Set<() => void>()

/** append Class Name 的内部工具函数。 */
const appendClassName = (base?: string, className?: string) => {
  if (!base) return className ?? ''
  return className ? `${base} ${className}` : base
}

/** as Css Size 的内部工具函数。 */
const asCssSize = (value?: GridGutterSize) => {
  if (typeof value === 'number') return `${value}px`
  return value
}

/** 转换为 Kebab Case 的内部工具函数。 */
const toKebabCase = (value: string) => value.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)

/** serialize Style 的内部工具函数。 */
const serializeStyle = (style?: GridStyle) => {
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

/** merge Style 的内部工具函数。 */
const mergeStyle = (...styles: Array<GridStyle | undefined>) => {
  return styles
    .map(style => serializeStyle(style))
    .filter(Boolean)
    .join('; ')
}

/** assign Forwarded Ref 的内部工具函数。 */
const assignForwardedRef = (forwardedRef: any, element: HTMLElement | null) => {
  if (typeof forwardedRef === 'function') {
    forwardedRef(element)
  } else if (forwardedRef && typeof forwardedRef === 'object' && 'current' in forwardedRef) {
    forwardedRef.current = element ?? undefined
  }
}

/** 读取 Viewport Width 的内部工具函数。 */
const getViewportWidth = () => {
  if (typeof window === 'undefined') return BREAKPOINT_MIN_WIDTH.xl
  return window.innerWidth || document.documentElement?.clientWidth || BREAKPOINT_MIN_WIDTH.xl
}

const viewportWidth = ref(getViewportWidth())

/** notify Viewport Subscribers 的内部工具函数。 */
const notifyViewportSubscribers = () => {
  viewportSubscribers.forEach(notify => notify())
}

/**
 * 响应式断点计算统一走一个全局窗口监听，避免每个 Col/Row 都注册一份 resize handler。
 * 返回值是卸载函数，供组件在 onUnmounted 中回收订阅计数。
 */
const subscribeViewport = (notify: () => void) => {
  if (typeof window === 'undefined') {
    return () => {}
  }

  if (viewportSubscribers.size === 0) {
    window.addEventListener('resize', notifyViewportSubscribers)
  }

  viewportSubscribers.add(notify)

  return () => {
    viewportSubscribers.delete(notify)
    if (viewportSubscribers.size === 0) {
      window.removeEventListener('resize', notifyViewportSubscribers)
    }
  }
}

/** 判断 Responsive Map 的内部工具函数。 */
const isResponsiveMap = <T,>(value: unknown): value is GridResponsiveValue<T> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.keys(value).some(key => BREAKPOINT_SEQUENCE.includes(key as GridBreakpoint))
}

/**
 * 按当前 viewport 取到最贴近且不超过当前宽度的断点值。
 * 例如 md 屏优先取 md，没有则回退到 sm/xs。
 */
const resolveResponsiveValue = <T,>(
  value: T | GridResponsiveValue<T> | undefined,
  width: number,
) => {
  if (!isResponsiveMap<T>(value)) {
    return value as T | undefined
  }

  let resolved: T | undefined
  for (const breakpoint of BREAKPOINT_SEQUENCE) {
    if (width >= BREAKPOINT_MIN_WIDTH[breakpoint] && value[breakpoint] !== undefined) {
      resolved = value[breakpoint]
    }
  }
  return resolved
}

/** 判断是否存在 Responsive Gutter 的内部工具函数。 */
const hasResponsiveGutter = (gutter?: GridGutter) => {
  if (!gutter) return false
  if (Array.isArray(gutter)) {
    return gutter.some(part => isResponsiveMap<GridGutterSize>(part))
  }
  return isResponsiveMap<GridGutterSize>(gutter)
}

/** 判断是否存在 Responsive Col Props 的内部工具函数。 */
const hasResponsiveColProps = (props: GridColProps) => {
  return BREAKPOINT_SEQUENCE.some(breakpoint => props[breakpoint] !== undefined)
}

/** 解析 Half Size 的内部工具函数。 */
const resolveHalfSize = (value?: GridGutterSize, negative = false) => {
  if (value === undefined || value === null || value === 0 || value === '0') return undefined
  if (typeof value === 'number') {
    const half = value / 2
    return `${negative ? -half : half}px`
  }
  return `calc(${value} / ${negative ? '-2' : '2'})`
}

/** 解析 Row Justify 的内部工具函数。 */
const resolveRowJustify = (justify?: GridJustify) => {
  switch (justify) {
    case 'end':
      return 'flex-end'
    case 'center':
      return 'center'
    case 'space-around':
      return 'space-around'
    case 'space-between':
      return 'space-between'
    case 'space-evenly':
      return 'space-evenly'
    default:
      return 'flex-start'
  }
}

/** 解析 Row Align 的内部工具函数。 */
const resolveRowAlign = (align?: GridAlign) => {
  switch (align) {
    case 'middle':
      return 'center'
    case 'bottom':
      return 'flex-end'
    case 'stretch':
      return 'stretch'
    default:
      return 'flex-start'
  }
}

/** 解析 Gutter Pair 的内部工具函数。 */
const resolveGutterPair = (
  gutter: GridGutter | undefined,
  width: number,
): [GridGutterSize?, GridGutterSize?] => {
  if (!gutter) return [undefined, undefined]
  if (Array.isArray(gutter)) {
    return [resolveResponsiveValue(gutter[0], width), resolveResponsiveValue(gutter[1], width)]
  }
  return [resolveResponsiveValue(gutter, width), undefined]
}

/** 归一化 Col Config 的内部工具函数。 */
const normalizeColConfig = (value?: GridColResponsive) => {
  if (value === undefined) return undefined
  if (typeof value === 'number') {
    return { span: value } satisfies GridColConfig
  }
  return value
}

/**
 * Col 的基础配置来自顶层 props，断点配置按 xs -> xxl 逐步覆盖。
 * 这样能保留常见栅格列在不同 viewport 下的优先级规则。
 */
const resolveColConfig = (props: GridColProps, width: number): GridColConfig => {
  const resolved: GridColConfig = {
    span: props.span,
    order: props.order,
    offset: props.offset,
    push: props.push,
    pull: props.pull,
    flex: props.flex,
  }

  for (const breakpoint of BREAKPOINT_SEQUENCE) {
    if (width < BREAKPOINT_MIN_WIDTH[breakpoint]) continue
    const config = normalizeColConfig(props[breakpoint])
    if (!config) continue
    if (config.span !== undefined) resolved.span = config.span
    if (config.order !== undefined) resolved.order = config.order
    if (config.offset !== undefined) resolved.offset = config.offset
    if (config.push !== undefined) resolved.push = config.push
    if (config.pull !== undefined) resolved.pull = config.pull
    if (config.flex !== undefined) resolved.flex = config.flex
  }

  return resolved
}

/** span To Percent 的内部工具函数。 */
const spanToPercent = (span?: number) => {
  if (span === undefined) return undefined
  const normalized = Math.min(24, Math.max(0, span))
  return `${(normalized / 24) * 100}%`
}

/**
 * 与常见 flex 简写语义保持一致：
 * - number: 等比分配剩余空间
 * - 具体长度: 视为固定 basis
 * - auto / none: 使用常见 flex 简写
 */
const resolveFlexValue = (flex?: number | string) => {
  if (flex === undefined || flex === null) return undefined
  if (typeof flex === 'number') return `${flex} ${flex} auto`

  const normalized = flex.trim()
  if (!normalized) return undefined
  if (normalized === 'auto') return '1 1 auto'
  if (normalized === 'none') return '0 0 auto'
  if (/^\d+(\.\d+)?(px|em|rem|vw|vh|%)$/.test(normalized)) {
    return `0 0 ${normalized}`
  }
  return normalized
}

/** 构建 Row Style 的内部工具函数。 */
const buildRowStyle = (
  gutterX: GridGutterSize | undefined,
  gutterY: GridGutterSize | undefined,
  justify: GridJustify | undefined,
  align: GridAlign | undefined,
  wrap: boolean | undefined,
) => {
  const merged: Record<string, any> = {
    display: 'flex',
    flexWrap: wrap === false ? 'nowrap' : 'wrap',
    minWidth: 0,
    justifyContent: resolveRowJustify(justify),
    alignItems: resolveRowAlign(align),
    '--rue-grid-gutter-x': asCssSize(gutterX) ?? '0px',
    '--rue-grid-gutter-y': asCssSize(gutterY) ?? '0px',
  }

  const horizontalHalf = resolveHalfSize(gutterX, true)
  const verticalHalf = resolveHalfSize(gutterY, true)
  if (horizontalHalf || verticalHalf) {
    merged.margin = `${verticalHalf ?? '0px'} ${horizontalHalf ?? '0px'}`
  }

  return merged
}

/** 构建 Col Style 的内部工具函数。 */
const buildColStyle = (config: GridColConfig) => {
  const merged: Record<string, any> = {
    boxSizing: 'border-box',
    minWidth: 0,
    padding: 'calc(var(--rue-grid-gutter-y, 0px) / 2) calc(var(--rue-grid-gutter-x, 0px) / 2)',
  }

  if (config.order !== undefined) {
    merged.order = config.order
  }

  if (config.offset) {
    merged.marginLeft = spanToPercent(config.offset)
  }

  if (config.push) {
    merged.position = 'relative'
    merged.left = spanToPercent(config.push)
  }

  if (config.pull) {
    merged.position = 'relative'
    merged.right = spanToPercent(config.pull)
  }

  if (config.span === 0) {
    merged.display = 'none'
  }

  const flexValue = resolveFlexValue(config.flex)
  if (flexValue) {
    merged.flex = flexValue
  } else if (config.span !== undefined && config.span > 0) {
    const width = spanToPercent(config.span)
    merged.flex = `0 0 ${width}`
    merged.maxWidth = width
  }

  return merged
}

/**
 * Row 负责整个栅格行的布局上下文：
 * 1. 解析 gutter 的水平/垂直值。
 * 2. 把 gutter 通过负 margin 下沉给 Col padding。
 * 3. 暴露常见的主轴/交叉轴对齐语义。
 */
const Row: FC<GridRowProps> = ({
  gutter,
  align,
  justify,
  wrap = true,
  className,
  style,
  children,
  ref: forwardedRef,
  ...rest
}) => {
  const requiresViewport = hasResponsiveGutter(gutter)
  let stopTracking: (() => void) | undefined

  if (requiresViewport) {
    onMounted(() => {
      stopTracking = subscribeViewport(() => {
        viewportWidth.value = getViewportWidth()
      })
      viewportWidth.value = getViewportWidth()
    })
    onUnmounted(() => {
      if (stopTracking) stopTracking()
    })
  }

  const applyRef = (element: HTMLDivElement | null) => {
    assignForwardedRef(forwardedRef, element)
  }
  const resolvedClassName = computed(() => appendClassName('rue-grid rue-grid-row', className))
  const resolvedStyle = computed(() => {
    const [gutterX, gutterY] = resolveGutterPair(
      gutter,
      requiresViewport ? viewportWidth.value : getViewportWidth(),
    )
    return mergeStyle(buildRowStyle(gutterX, gutterY, justify, align, wrap), style)
  })

  return (
    <div
      {...rest}
      ref={applyRef}
      data-rue-grid-row
      className={resolvedClassName.get()}
      style={resolvedStyle.get()}
    >
      {children}
    </div>
  )
}

/**
 * Col 在 24 栅格体系里负责具体占位。
 * 基础 props 定义默认形态，各断点配置在命中时覆盖默认值。
 */
const Col: FC<GridColProps> = ({
  span,
  order,
  offset,
  push,
  pull,
  flex,
  xs,
  sm,
  md,
  lg,
  xl,
  xxl,
  className,
  style,
  children,
  gutter: _gutter,
  ref: forwardedRef,
  ...domProps
}) => {
  const gridProps: GridColProps = { span, order, offset, push, pull, flex, xs, sm, md, lg, xl, xxl }
  const requiresViewport = hasResponsiveColProps(gridProps)
  let stopTracking: (() => void) | undefined

  if (requiresViewport) {
    onMounted(() => {
      stopTracking = subscribeViewport(() => {
        viewportWidth.value = getViewportWidth()
      })
      viewportWidth.value = getViewportWidth()
    })
    onUnmounted(() => {
      if (stopTracking) stopTracking()
    })
  }

  const applyRef = (element: HTMLDivElement | null) => {
    assignForwardedRef(forwardedRef, element)
  }
  const resolvedClassName = computed(() => appendClassName('rue-grid-col', className))
  const resolvedStyle = computed(() => {
    const resolvedConfig = resolveColConfig(
      gridProps,
      requiresViewport ? viewportWidth.value : getViewportWidth(),
    )
    return mergeStyle(buildColStyle(resolvedConfig), style)
  })

  return (
    <div
      {...domProps}
      ref={applyRef}
      data-rue-grid-col
      className={resolvedClassName.get()}
      style={resolvedStyle.get()}
    >
      {children}
    </div>
  )
}

const GridCompound: GridCompound = /*#__PURE__*/ Object.assign(Row, {
  Row,
  Col,
})

/** 默认导出栅格组件。 */
export default GridCompound
