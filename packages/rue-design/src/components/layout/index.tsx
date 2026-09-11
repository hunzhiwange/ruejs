/*
Layout 组件概述
- 提供常见后台布局所需的复合容器：Layout / Header / Sider / Content / Footer。
- 保留 Rue 现有的 className + style 组合方式，并补齐 Sider 的 collapsible、breakpoint、trigger、collapsedWidth 等核心能力。
- 默认视觉延续 Rue 的轻量面板体系：柔和边框、圆角、半透明底色与可叠加的 utility class，而不是照搬特定组件库的外观。
*/
import type { FC } from '@rue-js/rue'
import { computed, onMounted, onUnmounted, ref, watch } from '@rue-js/rue'

/** LayoutBreakpoint 类型。 */
export type LayoutBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
/** LayoutStyle 样式值类型。 */
export type LayoutStyle = string | Record<string, any>
/** LayoutCollapseType 视觉或语义变体类型。 */
export type LayoutCollapseType = 'clickTrigger' | 'responsive'
/** LayoutSiderTheme 类型。 */
export type LayoutSiderTheme = 'light' | 'dark'
/** LayoutSiderTriggerPosition 位置或方向类型。 */
export type LayoutSiderTriggerPosition = 'start' | 'end'

/** LayoutProps 组件属性。 */
export interface LayoutProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** hasSider 配置项。 */
  hasSider?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: LayoutStyle
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** LayoutSectionProps 组件属性。 */
export interface LayoutSectionProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: LayoutStyle
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** LayoutSiderTriggerRenderMeta 接口。 */
export interface LayoutSiderTriggerRenderMeta {
  /** collapsed 配置项。 */
  collapsed: boolean
  /** below 配置项。 */
  below: boolean
  /** zeroWidth 配置项。 */
  zeroWidth: boolean
  /** toggle 配置项。 */
  toggle: () => void
}

/** LayoutSiderTriggerProps 组件属性。 */
export interface LayoutSiderTriggerProps {
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: LayoutStyle
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** LayoutSiderProps 组件属性。 */
export interface LayoutSiderProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: LayoutStyle
  /** bodyClassName 附加类名。 */
  bodyClassName?: string
  /** bodyStyle 内联样式。 */
  bodyStyle?: LayoutStyle
  /** 底部区域内容。 */
  footer?: any
  /** footerClassName 附加类名。 */
  footerClassName?: string
  /** footerStyle 内联样式。 */
  footerStyle?: LayoutStyle
  /** triggerClassName 附加类名。 */
  triggerClassName?: string
  /** triggerStyle 内联样式。 */
  triggerStyle?: LayoutStyle
  /** theme 配置项。 */
  theme?: LayoutSiderTheme
  /** width 配置项。 */
  width?: number | string
  /** collapsedWidth 配置项。 */
  collapsedWidth?: number | string
  /** collapsed 配置项。 */
  collapsed?: boolean
  /** defaultCollapsed 配置项。 */
  defaultCollapsed?: boolean
  /** collapsible 配置项。 */
  collapsible?: boolean
  /** breakpoint 配置项。 */
  breakpoint?: LayoutBreakpoint
  /** reverseArrow 配置项。 */
  reverseArrow?: boolean
  /** trigger 区域配置。 */
  trigger?: string | null | false | ((meta: LayoutSiderTriggerRenderMeta) => any)
  triggerFormatter?: (meta: LayoutSiderTriggerRenderMeta) => string
  /** zeroWidthTriggerStyle 内联样式。 */
  zeroWidthTriggerStyle?: LayoutStyle
  /** triggerPosition 配置项。 */
  triggerPosition?: LayoutSiderTriggerPosition
  /** onCollapse 事件回调。 */
  onCollapse?: (collapsed: boolean, type: LayoutCollapseType) => void
  /** onBreakpoint 事件回调。 */
  onBreakpoint?: (broken: boolean) => void
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** LayoutCompound 接口。 */
export interface LayoutCompound extends FC<LayoutProps> {
  /** Header 配置项。 */
  Header: FC<LayoutSectionProps>
  /** Content 配置项。 */
  Content: FC<LayoutSectionProps>
  /** Footer 配置项。 */
  Footer: FC<LayoutSectionProps>
  /** Sider 配置项。 */
  Sider: FC<LayoutSiderProps>
  /** Trigger 配置项。 */
  Trigger: FC<LayoutSiderTriggerProps>
}

/** BREAKPOINT_MAX_WIDTH 内部常量。 */
const BREAKPOINT_MAX_WIDTH: Record<LayoutBreakpoint, number> = {
  xs: 479.98,
  sm: 575.98,
  md: 767.98,
  lg: 991.98,
  xl: 1199.98,
  xxl: 1599.98,
}

/** join Class Name 的内部工具函数。 */
const joinClassName = (...values: Array<string | undefined | false | null>) => {
  return values.filter(Boolean).join(' ')
}

/** 转换为 Kebab Case 的内部工具函数。 */
const toKebabCase = (value: string) => value.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)

/** serialize Style 的内部工具函数。 */
const serializeStyle = (style?: LayoutStyle) => {
  if (!style) return ''
  if (typeof style === 'string') return style.trim()

  return Object.entries(style)
    .filter(([, value]) => value != null)
    .map(([key, value]) => `${key.startsWith('--') ? key : toKebabCase(key)}:${String(value)}`)
    .join('; ')
}

/** merge Style 的内部工具函数。 */
const mergeStyle = (...styles: Array<LayoutStyle | undefined>) => {
  return styles
    .map(style => serializeStyle(style))
    .filter(Boolean)
    .join('; ')
}

/** flatten Children 的内部工具函数。 */

/** 判断是否存在 Renderable Content 的内部工具函数。 */
const hasRenderableContent = (value: any): boolean =>
  value != null && value !== false && value !== ''

/** 判断 Numeric 的内部工具函数。 */
const isNumeric = (value: any) => {
  if (value == null || value === '') return false
  return !Number.isNaN(Number.parseFloat(String(value))) && Number.isFinite(Number(value))
}

/** 解析 Size 的内部工具函数。 */
const resolveSize = (value: number | string | undefined, fallback: number) => {
  const resolved = value ?? fallback
  if (typeof resolved === 'number') return `${resolved}px`
  if (/^\d+(\.\d+)?$/.test(resolved)) return `${resolved}px`
  return resolved
}

/** 读取 Viewport Width 的内部工具函数。 */
const getViewportWidth = () => {
  if (typeof window === 'undefined') return BREAKPOINT_MAX_WIDTH.xl + 1
  return window.innerWidth || document.documentElement?.clientWidth || BREAKPOINT_MAX_WIDTH.xl + 1
}

/** 解析 Theme Class Name 的内部工具函数。 */
const resolveThemeClassName = (theme?: LayoutSiderTheme) => {
  if (theme === 'dark') {
    return 'border-base-content/10 bg-neutral text-neutral-content'
  }
  return 'border-base-300 bg-base-100 text-base-content'
}

/** 解析 Sider Body Class Name 的内部工具函数。 */
const resolveSiderBodyClassName = (theme?: LayoutSiderTheme) => {
  if (theme === 'dark') {
    return 'bg-neutral/90 text-neutral-content'
  }
  return 'bg-transparent text-base-content'
}

/** 解析 Chevron 的内部工具函数。 */
const resolveChevron = (collapsed: boolean, reverseArrow?: boolean) => {
  if (collapsed) {
    return reverseArrow ? '▶' : '◀'
  }
  return reverseArrow ? '◀' : '▶'
}

/** 判断 Sider Element 的内部工具函数。 */

/** 解析 Has Sider 的内部工具函数。 */

/** Basic Section 的内部工具函数。 */
const BasicSection = (
  suffix: string,
  defaultAs: any,
  extraClassName?: string,
  extraStyle?: LayoutStyle,
): FC<LayoutSectionProps> => {
  const Component: FC<LayoutSectionProps> = ({
    as = defaultAs,
    className,
    style,
    children,
    ...rest
  }) => {
    const Tag = as as any
    return Tag === 'div' ? (
      <div
        {...rest}
        className={joinClassName(`rue-layout-${suffix}`, extraClassName, className)}
        style={mergeStyle(extraStyle, style)}
      >
        {children}
      </div>
    ) : Tag === 'span' ? (
      <span
        {...rest}
        className={joinClassName(`rue-layout-${suffix}`, extraClassName, className)}
        style={mergeStyle(extraStyle, style)}
      >
        {children}
      </span>
    ) : Tag === 'header' ? (
      <header
        {...rest}
        className={joinClassName(`rue-layout-${suffix}`, extraClassName, className)}
        style={mergeStyle(extraStyle, style)}
      >
        {children}
      </header>
    ) : Tag === 'main' ? (
      <main
        {...rest}
        className={joinClassName(`rue-layout-${suffix}`, extraClassName, className)}
        style={mergeStyle(extraStyle, style)}
      >
        {children}
      </main>
    ) : Tag === 'footer' ? (
      <footer
        {...rest}
        className={joinClassName(`rue-layout-${suffix}`, extraClassName, className)}
        style={mergeStyle(extraStyle, style)}
      >
        {children}
      </footer>
    ) : Tag === 'section' ? (
      <section
        {...rest}
        className={joinClassName(`rue-layout-${suffix}`, extraClassName, className)}
        style={mergeStyle(extraStyle, style)}
      >
        {children}
      </section>
    ) : Tag === 'aside' ? (
      <aside
        {...rest}
        className={joinClassName(`rue-layout-${suffix}`, extraClassName, className)}
        style={mergeStyle(extraStyle, style)}
      >
        {children}
      </aside>
    ) : Tag === 'button' ? (
      <button
        {...rest}
        className={joinClassName(`rue-layout-${suffix}`, extraClassName, className)}
        style={mergeStyle(extraStyle, style)}
      >
        {children}
      </button>
    ) : (
      <></>
    )
  }

  return Component
}

const Header = BasicSection(
  'header',
  'header',
  'flex min-h-16 items-center gap-3 rounded-[1.5rem] border border-base-300/80 bg-base-100/92 px-5 py-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] backdrop-blur',
)

const Content = BasicSection(
  'content',
  'main',
  'min-h-0 flex-1 rounded-[1.5rem] border border-base-300/75 bg-base-100/90 p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)] backdrop-blur',
)

const Footer = BasicSection(
  'footer',
  'footer',
  'flex min-h-14 items-center justify-between gap-3 rounded-[1.5rem] border border-base-300/80 bg-base-200/75 px-5 py-4 text-sm text-base-content/75',
)

/** Trigger 的内部工具函数。 */
const Trigger: FC<LayoutSiderTriggerProps> = ({ className, style, children, ...rest }) => {
  return (
    <span
      {...rest}
      className={joinClassName(
        'rue-layout-sider-trigger inline-flex items-center gap-2 rounded-full border border-current/15 px-3 py-2 text-xs font-semibold tracking-wide transition duration-200 ease-out hover:bg-current/8',
        className,
      )}
      style={mergeStyle(style)}
    >
      {children}
    </span>
  )
}

/** Layout Root 的内部工具函数。 */
const LayoutRoot: FC<LayoutProps> = ({
  as = 'section',
  hasSider,
  className,
  style,
  children,
  ...rest
}) => {
  const Component = as as any
  const mergedHasSider = !!hasSider

  return Component === 'div' ? (
    <div
      {...rest}
      className={joinClassName(
        'rue-layout relative flex min-h-0 min-w-0 gap-4',
        mergedHasSider ? 'flex-row items-stretch' : 'flex-col',
        className,
      )}
      style={mergeStyle(
        {
          width: '100%',
          minWidth: 0,
          minHeight: 0,
        },
        style,
      )}
      data-rue-layout="true"
      data-rue-layout-has-sider={mergedHasSider ? 'true' : 'false'}
    >
      {children}
    </div>
  ) : Component === 'span' ? (
    <span
      {...rest}
      className={joinClassName(
        'rue-layout relative flex min-h-0 min-w-0 gap-4',
        mergedHasSider ? 'flex-row items-stretch' : 'flex-col',
        className,
      )}
      style={mergeStyle(
        {
          width: '100%',
          minWidth: 0,
          minHeight: 0,
        },
        style,
      )}
      data-rue-layout="true"
      data-rue-layout-has-sider={mergedHasSider ? 'true' : 'false'}
    >
      {children}
    </span>
  ) : Component === 'header' ? (
    <header
      {...rest}
      className={joinClassName(
        'rue-layout relative flex min-h-0 min-w-0 gap-4',
        mergedHasSider ? 'flex-row items-stretch' : 'flex-col',
        className,
      )}
      style={mergeStyle(
        {
          width: '100%',
          minWidth: 0,
          minHeight: 0,
        },
        style,
      )}
      data-rue-layout="true"
      data-rue-layout-has-sider={mergedHasSider ? 'true' : 'false'}
    >
      {children}
    </header>
  ) : Component === 'main' ? (
    <main
      {...rest}
      className={joinClassName(
        'rue-layout relative flex min-h-0 min-w-0 gap-4',
        mergedHasSider ? 'flex-row items-stretch' : 'flex-col',
        className,
      )}
      style={mergeStyle(
        {
          width: '100%',
          minWidth: 0,
          minHeight: 0,
        },
        style,
      )}
      data-rue-layout="true"
      data-rue-layout-has-sider={mergedHasSider ? 'true' : 'false'}
    >
      {children}
    </main>
  ) : Component === 'footer' ? (
    <footer
      {...rest}
      className={joinClassName(
        'rue-layout relative flex min-h-0 min-w-0 gap-4',
        mergedHasSider ? 'flex-row items-stretch' : 'flex-col',
        className,
      )}
      style={mergeStyle(
        {
          width: '100%',
          minWidth: 0,
          minHeight: 0,
        },
        style,
      )}
      data-rue-layout="true"
      data-rue-layout-has-sider={mergedHasSider ? 'true' : 'false'}
    >
      {children}
    </footer>
  ) : Component === 'section' ? (
    <section
      {...rest}
      className={joinClassName(
        'rue-layout relative flex min-h-0 min-w-0 gap-4',
        mergedHasSider ? 'flex-row items-stretch' : 'flex-col',
        className,
      )}
      style={mergeStyle(
        {
          width: '100%',
          minWidth: 0,
          minHeight: 0,
        },
        style,
      )}
      data-rue-layout="true"
      data-rue-layout-has-sider={mergedHasSider ? 'true' : 'false'}
    >
      {children}
    </section>
  ) : Component === 'aside' ? (
    <aside
      {...rest}
      className={joinClassName(
        'rue-layout relative flex min-h-0 min-w-0 gap-4',
        mergedHasSider ? 'flex-row items-stretch' : 'flex-col',
        className,
      )}
      style={mergeStyle(
        {
          width: '100%',
          minWidth: 0,
          minHeight: 0,
        },
        style,
      )}
      data-rue-layout="true"
      data-rue-layout-has-sider={mergedHasSider ? 'true' : 'false'}
    >
      {children}
    </aside>
  ) : Component === 'button' ? (
    <button
      {...rest}
      className={joinClassName(
        'rue-layout relative flex min-h-0 min-w-0 gap-4',
        mergedHasSider ? 'flex-row items-stretch' : 'flex-col',
        className,
      )}
      style={mergeStyle(
        {
          width: '100%',
          minWidth: 0,
          minHeight: 0,
        },
        style,
      )}
      data-rue-layout="true"
      data-rue-layout-has-sider={mergedHasSider ? 'true' : 'false'}
    >
      {children}
    </button>
  ) : (
    <></>
  )
}

/** Sider 的内部工具函数。 */
const Sider: FC<LayoutSiderProps> = ({
  as = 'aside',
  className,
  style,
  bodyClassName,
  bodyStyle,
  footer,
  footerClassName,
  footerStyle,
  triggerClassName,
  triggerStyle,
  theme = 'light',
  width = 240,
  collapsedWidth = 80,
  collapsed,
  defaultCollapsed = false,
  collapsible = false,
  breakpoint,
  reverseArrow = false,
  trigger,
  triggerFormatter,
  zeroWidthTriggerStyle,
  triggerPosition = 'end',
  onCollapse,
  onBreakpoint,
  children,
  ...rest
}) => {
  const Component = as as any
  const isControlled = typeof collapsed === 'boolean'
  const collapsedState = ref(isControlled ? !!collapsed : !!defaultCollapsed)
  const belowState = ref(false)
  const collapsedSize = resolveSize(collapsedWidth, 80)
  const expandedSize = resolveSize(width, 240)

  const isZeroWidthCollapsed = (nextCollapsed: boolean) => {
    return (
      nextCollapsed &&
      (isNumeric(collapsedWidth)
        ? Number(collapsedWidth) === 0
        : collapsedSize === '0px' || collapsedSize === '0')
    )
  }

  const handleCollapse = (nextCollapsed: boolean, type: LayoutCollapseType) => {
    if (!isControlled) {
      collapsedState.value = nextCollapsed
    }
    onCollapse?.(nextCollapsed, type)
  }

  const syncResponsiveState = () => {
    if (!breakpoint) return

    const broken = getViewportWidth() <= BREAKPOINT_MAX_WIDTH[breakpoint]
    if (broken === belowState.value) return

    belowState.value = broken
    onBreakpoint?.(broken)
    handleCollapse(broken, 'responsive')
  }

  const toggle = () => {
    handleCollapse(!collapsedState.value, 'clickTrigger')
  }

  onMounted(() => {
    syncResponsiveState()
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', syncResponsiveState)
    }
  })

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', syncResponsiveState)
    }
  })

  watch(
    () => collapsed,
    value => {
      if (typeof value === 'boolean') {
        collapsedState.value = value
      }
    },
    { immediate: true },
  )

  watch(
    () => breakpoint,
    () => {
      syncResponsiveState()
    },
    { immediate: true },
  )

  const getZeroWidthCollapsed = () => isZeroWidthCollapsed(collapsedState.value)
  const getCurrentWidth = () => (collapsedState.value ? collapsedSize : expandedSize)
  const shouldHideFooter = () => collapsedState.value && !getZeroWidthCollapsed()
  const hasDefaultTrigger = trigger === undefined && !triggerFormatter
  const hasCustomTrigger =
    !!triggerFormatter || (trigger !== null && trigger !== false && trigger !== '')
  const shouldRenderTrigger = collapsible && (hasDefaultTrigger || hasCustomTrigger)
  const triggerMeta = (): LayoutSiderTriggerRenderMeta => ({
    collapsed: collapsedState.value,
    below: belowState.value,
    zeroWidth: getZeroWidthCollapsed(),
    toggle,
  })

  const triggerText = computed(() =>
    triggerFormatter ? triggerFormatter(triggerMeta()) : typeof trigger === 'string' ? trigger : '',
  )
  const RenderSiderTrigger = () => (
    <span className="rue-layout-sider-trigger inline-flex items-center gap-2">
      {triggerFormatter || typeof trigger === 'string' ? (
        <span data-rue-layout-trigger-custom="true">{String(triggerText.get())}</span>
      ) : (
        <>
          <span data-rue-layout-trigger-arrow="true">
            {String(resolveChevron(collapsedState.value, reverseArrow))}
          </span>
          <span data-rue-layout-trigger-label="true">{collapsedState.value ? '展开' : '收起'}</span>
        </>
      )}
    </span>
  )

  return Component === 'div' ? (
    <div
      {...rest}
      className={joinClassName(
        'rue-layout-sider relative flex min-h-0 shrink-0 flex-col overflow-hidden rounded-[1.75rem] border shadow-[0_28px_70px_-42px_rgba(15,23,42,0.5)] transition-[width,flex-basis,max-width,min-width,transform,opacity] duration-300 ease-out',
        resolveThemeClassName(theme),
        getZeroWidthCollapsed() && 'pointer-events-none border-transparent shadow-none',
        className,
      )}
      style={mergeStyle(
        {
          flex: `0 0 ${getCurrentWidth()}`,
          width: getCurrentWidth(),
          minWidth: getCurrentWidth(),
          maxWidth: getCurrentWidth(),
          opacity: getZeroWidthCollapsed() ? 0 : 1,
        },
        style,
      )}
      data-rue-layout-sider="true"
      data-collapsed={collapsedState.value ? 'true' : 'false'}
      data-below={belowState.value ? 'true' : 'false'}
      data-zero-width={getZeroWidthCollapsed() ? 'true' : 'false'}
      data-theme={theme}
    >
      <div
        className={joinClassName(
          'rue-layout-sider-body flex min-h-0 flex-1 flex-col gap-4 p-4 transition-[padding] duration-300 ease-out',
          resolveSiderBodyClassName(theme),
          collapsedState.value && !getZeroWidthCollapsed() && 'items-center px-2',
          bodyClassName,
        )}
        style={mergeStyle(bodyStyle)}
      >
        {children}
      </div>

      {hasRenderableContent(footer) ? (
        <div
          className={joinClassName(
            'rue-layout-sider-footer border-t border-current/10 px-4 py-3 text-xs opacity-80',
            collapsedState.value && !getZeroWidthCollapsed() && 'px-2 text-center',
            footerClassName,
          )}
          style={mergeStyle({ display: shouldHideFooter() ? 'none' : undefined }, footerStyle)}
          aria-hidden={shouldHideFooter() ? 'true' : 'false'}
        >
          {footer}
        </div>
      ) : null}

      {shouldRenderTrigger ? (
        <button
          type="button"
          onClick={toggle}
          className={joinClassName(
            'rue-layout-sider-trigger-button absolute z-10 inline-flex items-center',
            triggerPosition === 'start'
              ? 'left-3 bottom-3 justify-start'
              : 'right-3 bottom-3 justify-end',
            getZeroWidthCollapsed() &&
              'pointer-events-auto right-0 top-6 bottom-auto translate-x-1/2 rounded-full',
            triggerClassName,
          )}
          style={mergeStyle(getZeroWidthCollapsed() ? zeroWidthTriggerStyle : triggerStyle)}
          aria-label={collapsedState.value ? '展开侧边栏' : '收起侧边栏'}
          data-rue-layout-sider-trigger={getZeroWidthCollapsed() ? 'zero' : 'default'}
        >
          <RenderSiderTrigger />
        </button>
      ) : null}
    </div>
  ) : Component === 'span' ? (
    <span
      {...rest}
      className={joinClassName(
        'rue-layout-sider relative flex min-h-0 shrink-0 flex-col overflow-hidden rounded-[1.75rem] border shadow-[0_28px_70px_-42px_rgba(15,23,42,0.5)] transition-[width,flex-basis,max-width,min-width,transform,opacity] duration-300 ease-out',
        resolveThemeClassName(theme),
        getZeroWidthCollapsed() && 'pointer-events-none border-transparent shadow-none',
        className,
      )}
      style={mergeStyle(
        {
          flex: `0 0 ${getCurrentWidth()}`,
          width: getCurrentWidth(),
          minWidth: getCurrentWidth(),
          maxWidth: getCurrentWidth(),
          opacity: getZeroWidthCollapsed() ? 0 : 1,
        },
        style,
      )}
      data-rue-layout-sider="true"
      data-collapsed={collapsedState.value ? 'true' : 'false'}
      data-below={belowState.value ? 'true' : 'false'}
      data-zero-width={getZeroWidthCollapsed() ? 'true' : 'false'}
      data-theme={theme}
    >
      <div
        className={joinClassName(
          'rue-layout-sider-body flex min-h-0 flex-1 flex-col gap-4 p-4 transition-[padding] duration-300 ease-out',
          resolveSiderBodyClassName(theme),
          collapsedState.value && !getZeroWidthCollapsed() && 'items-center px-2',
          bodyClassName,
        )}
        style={mergeStyle(bodyStyle)}
      >
        {children}
      </div>

      {hasRenderableContent(footer) ? (
        <div
          className={joinClassName(
            'rue-layout-sider-footer border-t border-current/10 px-4 py-3 text-xs opacity-80',
            collapsedState.value && !getZeroWidthCollapsed() && 'px-2 text-center',
            footerClassName,
          )}
          style={mergeStyle({ display: shouldHideFooter() ? 'none' : undefined }, footerStyle)}
          aria-hidden={shouldHideFooter() ? 'true' : 'false'}
        >
          {footer}
        </div>
      ) : null}

      {shouldRenderTrigger ? (
        <button
          type="button"
          onClick={toggle}
          className={joinClassName(
            'rue-layout-sider-trigger-button absolute z-10 inline-flex items-center',
            triggerPosition === 'start'
              ? 'left-3 bottom-3 justify-start'
              : 'right-3 bottom-3 justify-end',
            getZeroWidthCollapsed() &&
              'pointer-events-auto right-0 top-6 bottom-auto translate-x-1/2 rounded-full',
            triggerClassName,
          )}
          style={mergeStyle(getZeroWidthCollapsed() ? zeroWidthTriggerStyle : triggerStyle)}
          aria-label={collapsedState.value ? '展开侧边栏' : '收起侧边栏'}
          data-rue-layout-sider-trigger={getZeroWidthCollapsed() ? 'zero' : 'default'}
        >
          <RenderSiderTrigger />
        </button>
      ) : null}
    </span>
  ) : Component === 'header' ? (
    <header
      {...rest}
      className={joinClassName(
        'rue-layout-sider relative flex min-h-0 shrink-0 flex-col overflow-hidden rounded-[1.75rem] border shadow-[0_28px_70px_-42px_rgba(15,23,42,0.5)] transition-[width,flex-basis,max-width,min-width,transform,opacity] duration-300 ease-out',
        resolveThemeClassName(theme),
        getZeroWidthCollapsed() && 'pointer-events-none border-transparent shadow-none',
        className,
      )}
      style={mergeStyle(
        {
          flex: `0 0 ${getCurrentWidth()}`,
          width: getCurrentWidth(),
          minWidth: getCurrentWidth(),
          maxWidth: getCurrentWidth(),
          opacity: getZeroWidthCollapsed() ? 0 : 1,
        },
        style,
      )}
      data-rue-layout-sider="true"
      data-collapsed={collapsedState.value ? 'true' : 'false'}
      data-below={belowState.value ? 'true' : 'false'}
      data-zero-width={getZeroWidthCollapsed() ? 'true' : 'false'}
      data-theme={theme}
    >
      <div
        className={joinClassName(
          'rue-layout-sider-body flex min-h-0 flex-1 flex-col gap-4 p-4 transition-[padding] duration-300 ease-out',
          resolveSiderBodyClassName(theme),
          collapsedState.value && !getZeroWidthCollapsed() && 'items-center px-2',
          bodyClassName,
        )}
        style={mergeStyle(bodyStyle)}
      >
        {children}
      </div>

      {hasRenderableContent(footer) ? (
        <div
          className={joinClassName(
            'rue-layout-sider-footer border-t border-current/10 px-4 py-3 text-xs opacity-80',
            collapsedState.value && !getZeroWidthCollapsed() && 'px-2 text-center',
            footerClassName,
          )}
          style={mergeStyle({ display: shouldHideFooter() ? 'none' : undefined }, footerStyle)}
          aria-hidden={shouldHideFooter() ? 'true' : 'false'}
        >
          {footer}
        </div>
      ) : null}

      {shouldRenderTrigger ? (
        <button
          type="button"
          onClick={toggle}
          className={joinClassName(
            'rue-layout-sider-trigger-button absolute z-10 inline-flex items-center',
            triggerPosition === 'start'
              ? 'left-3 bottom-3 justify-start'
              : 'right-3 bottom-3 justify-end',
            getZeroWidthCollapsed() &&
              'pointer-events-auto right-0 top-6 bottom-auto translate-x-1/2 rounded-full',
            triggerClassName,
          )}
          style={mergeStyle(getZeroWidthCollapsed() ? zeroWidthTriggerStyle : triggerStyle)}
          aria-label={collapsedState.value ? '展开侧边栏' : '收起侧边栏'}
          data-rue-layout-sider-trigger={getZeroWidthCollapsed() ? 'zero' : 'default'}
        >
          <RenderSiderTrigger />
        </button>
      ) : null}
    </header>
  ) : Component === 'main' ? (
    <main
      {...rest}
      className={joinClassName(
        'rue-layout-sider relative flex min-h-0 shrink-0 flex-col overflow-hidden rounded-[1.75rem] border shadow-[0_28px_70px_-42px_rgba(15,23,42,0.5)] transition-[width,flex-basis,max-width,min-width,transform,opacity] duration-300 ease-out',
        resolveThemeClassName(theme),
        getZeroWidthCollapsed() && 'pointer-events-none border-transparent shadow-none',
        className,
      )}
      style={mergeStyle(
        {
          flex: `0 0 ${getCurrentWidth()}`,
          width: getCurrentWidth(),
          minWidth: getCurrentWidth(),
          maxWidth: getCurrentWidth(),
          opacity: getZeroWidthCollapsed() ? 0 : 1,
        },
        style,
      )}
      data-rue-layout-sider="true"
      data-collapsed={collapsedState.value ? 'true' : 'false'}
      data-below={belowState.value ? 'true' : 'false'}
      data-zero-width={getZeroWidthCollapsed() ? 'true' : 'false'}
      data-theme={theme}
    >
      <div
        className={joinClassName(
          'rue-layout-sider-body flex min-h-0 flex-1 flex-col gap-4 p-4 transition-[padding] duration-300 ease-out',
          resolveSiderBodyClassName(theme),
          collapsedState.value && !getZeroWidthCollapsed() && 'items-center px-2',
          bodyClassName,
        )}
        style={mergeStyle(bodyStyle)}
      >
        {children}
      </div>

      {hasRenderableContent(footer) ? (
        <div
          className={joinClassName(
            'rue-layout-sider-footer border-t border-current/10 px-4 py-3 text-xs opacity-80',
            collapsedState.value && !getZeroWidthCollapsed() && 'px-2 text-center',
            footerClassName,
          )}
          style={mergeStyle({ display: shouldHideFooter() ? 'none' : undefined }, footerStyle)}
          aria-hidden={shouldHideFooter() ? 'true' : 'false'}
        >
          {footer}
        </div>
      ) : null}

      {shouldRenderTrigger ? (
        <button
          type="button"
          onClick={toggle}
          className={joinClassName(
            'rue-layout-sider-trigger-button absolute z-10 inline-flex items-center',
            triggerPosition === 'start'
              ? 'left-3 bottom-3 justify-start'
              : 'right-3 bottom-3 justify-end',
            getZeroWidthCollapsed() &&
              'pointer-events-auto right-0 top-6 bottom-auto translate-x-1/2 rounded-full',
            triggerClassName,
          )}
          style={mergeStyle(getZeroWidthCollapsed() ? zeroWidthTriggerStyle : triggerStyle)}
          aria-label={collapsedState.value ? '展开侧边栏' : '收起侧边栏'}
          data-rue-layout-sider-trigger={getZeroWidthCollapsed() ? 'zero' : 'default'}
        >
          <RenderSiderTrigger />
        </button>
      ) : null}
    </main>
  ) : Component === 'footer' ? (
    <footer
      {...rest}
      className={joinClassName(
        'rue-layout-sider relative flex min-h-0 shrink-0 flex-col overflow-hidden rounded-[1.75rem] border shadow-[0_28px_70px_-42px_rgba(15,23,42,0.5)] transition-[width,flex-basis,max-width,min-width,transform,opacity] duration-300 ease-out',
        resolveThemeClassName(theme),
        getZeroWidthCollapsed() && 'pointer-events-none border-transparent shadow-none',
        className,
      )}
      style={mergeStyle(
        {
          flex: `0 0 ${getCurrentWidth()}`,
          width: getCurrentWidth(),
          minWidth: getCurrentWidth(),
          maxWidth: getCurrentWidth(),
          opacity: getZeroWidthCollapsed() ? 0 : 1,
        },
        style,
      )}
      data-rue-layout-sider="true"
      data-collapsed={collapsedState.value ? 'true' : 'false'}
      data-below={belowState.value ? 'true' : 'false'}
      data-zero-width={getZeroWidthCollapsed() ? 'true' : 'false'}
      data-theme={theme}
    >
      <div
        className={joinClassName(
          'rue-layout-sider-body flex min-h-0 flex-1 flex-col gap-4 p-4 transition-[padding] duration-300 ease-out',
          resolveSiderBodyClassName(theme),
          collapsedState.value && !getZeroWidthCollapsed() && 'items-center px-2',
          bodyClassName,
        )}
        style={mergeStyle(bodyStyle)}
      >
        {children}
      </div>

      {hasRenderableContent(footer) ? (
        <div
          className={joinClassName(
            'rue-layout-sider-footer border-t border-current/10 px-4 py-3 text-xs opacity-80',
            collapsedState.value && !getZeroWidthCollapsed() && 'px-2 text-center',
            footerClassName,
          )}
          style={mergeStyle({ display: shouldHideFooter() ? 'none' : undefined }, footerStyle)}
          aria-hidden={shouldHideFooter() ? 'true' : 'false'}
        >
          {footer}
        </div>
      ) : null}

      {shouldRenderTrigger ? (
        <button
          type="button"
          onClick={toggle}
          className={joinClassName(
            'rue-layout-sider-trigger-button absolute z-10 inline-flex items-center',
            triggerPosition === 'start'
              ? 'left-3 bottom-3 justify-start'
              : 'right-3 bottom-3 justify-end',
            getZeroWidthCollapsed() &&
              'pointer-events-auto right-0 top-6 bottom-auto translate-x-1/2 rounded-full',
            triggerClassName,
          )}
          style={mergeStyle(getZeroWidthCollapsed() ? zeroWidthTriggerStyle : triggerStyle)}
          aria-label={collapsedState.value ? '展开侧边栏' : '收起侧边栏'}
          data-rue-layout-sider-trigger={getZeroWidthCollapsed() ? 'zero' : 'default'}
        >
          <RenderSiderTrigger />
        </button>
      ) : null}
    </footer>
  ) : Component === 'section' ? (
    <section
      {...rest}
      className={joinClassName(
        'rue-layout-sider relative flex min-h-0 shrink-0 flex-col overflow-hidden rounded-[1.75rem] border shadow-[0_28px_70px_-42px_rgba(15,23,42,0.5)] transition-[width,flex-basis,max-width,min-width,transform,opacity] duration-300 ease-out',
        resolveThemeClassName(theme),
        getZeroWidthCollapsed() && 'pointer-events-none border-transparent shadow-none',
        className,
      )}
      style={mergeStyle(
        {
          flex: `0 0 ${getCurrentWidth()}`,
          width: getCurrentWidth(),
          minWidth: getCurrentWidth(),
          maxWidth: getCurrentWidth(),
          opacity: getZeroWidthCollapsed() ? 0 : 1,
        },
        style,
      )}
      data-rue-layout-sider="true"
      data-collapsed={collapsedState.value ? 'true' : 'false'}
      data-below={belowState.value ? 'true' : 'false'}
      data-zero-width={getZeroWidthCollapsed() ? 'true' : 'false'}
      data-theme={theme}
    >
      <div
        className={joinClassName(
          'rue-layout-sider-body flex min-h-0 flex-1 flex-col gap-4 p-4 transition-[padding] duration-300 ease-out',
          resolveSiderBodyClassName(theme),
          collapsedState.value && !getZeroWidthCollapsed() && 'items-center px-2',
          bodyClassName,
        )}
        style={mergeStyle(bodyStyle)}
      >
        {children}
      </div>

      {hasRenderableContent(footer) ? (
        <div
          className={joinClassName(
            'rue-layout-sider-footer border-t border-current/10 px-4 py-3 text-xs opacity-80',
            collapsedState.value && !getZeroWidthCollapsed() && 'px-2 text-center',
            footerClassName,
          )}
          style={mergeStyle({ display: shouldHideFooter() ? 'none' : undefined }, footerStyle)}
          aria-hidden={shouldHideFooter() ? 'true' : 'false'}
        >
          {footer}
        </div>
      ) : null}

      {shouldRenderTrigger ? (
        <button
          type="button"
          onClick={toggle}
          className={joinClassName(
            'rue-layout-sider-trigger-button absolute z-10 inline-flex items-center',
            triggerPosition === 'start'
              ? 'left-3 bottom-3 justify-start'
              : 'right-3 bottom-3 justify-end',
            getZeroWidthCollapsed() &&
              'pointer-events-auto right-0 top-6 bottom-auto translate-x-1/2 rounded-full',
            triggerClassName,
          )}
          style={mergeStyle(getZeroWidthCollapsed() ? zeroWidthTriggerStyle : triggerStyle)}
          aria-label={collapsedState.value ? '展开侧边栏' : '收起侧边栏'}
          data-rue-layout-sider-trigger={getZeroWidthCollapsed() ? 'zero' : 'default'}
        >
          <RenderSiderTrigger />
        </button>
      ) : null}
    </section>
  ) : Component === 'aside' ? (
    <aside
      {...rest}
      className={joinClassName(
        'rue-layout-sider relative flex min-h-0 shrink-0 flex-col overflow-hidden rounded-[1.75rem] border shadow-[0_28px_70px_-42px_rgba(15,23,42,0.5)] transition-[width,flex-basis,max-width,min-width,transform,opacity] duration-300 ease-out',
        resolveThemeClassName(theme),
        getZeroWidthCollapsed() && 'pointer-events-none border-transparent shadow-none',
        className,
      )}
      style={mergeStyle(
        {
          flex: `0 0 ${getCurrentWidth()}`,
          width: getCurrentWidth(),
          minWidth: getCurrentWidth(),
          maxWidth: getCurrentWidth(),
          opacity: getZeroWidthCollapsed() ? 0 : 1,
        },
        style,
      )}
      data-rue-layout-sider="true"
      data-collapsed={collapsedState.value ? 'true' : 'false'}
      data-below={belowState.value ? 'true' : 'false'}
      data-zero-width={getZeroWidthCollapsed() ? 'true' : 'false'}
      data-theme={theme}
    >
      <div
        className={joinClassName(
          'rue-layout-sider-body flex min-h-0 flex-1 flex-col gap-4 p-4 transition-[padding] duration-300 ease-out',
          resolveSiderBodyClassName(theme),
          collapsedState.value && !getZeroWidthCollapsed() && 'items-center px-2',
          bodyClassName,
        )}
        style={mergeStyle(bodyStyle)}
      >
        {children}
      </div>

      {hasRenderableContent(footer) ? (
        <div
          className={joinClassName(
            'rue-layout-sider-footer border-t border-current/10 px-4 py-3 text-xs opacity-80',
            collapsedState.value && !getZeroWidthCollapsed() && 'px-2 text-center',
            footerClassName,
          )}
          style={mergeStyle({ display: shouldHideFooter() ? 'none' : undefined }, footerStyle)}
          aria-hidden={shouldHideFooter() ? 'true' : 'false'}
        >
          {footer}
        </div>
      ) : null}

      {shouldRenderTrigger ? (
        <button
          type="button"
          onClick={toggle}
          className={joinClassName(
            'rue-layout-sider-trigger-button absolute z-10 inline-flex items-center',
            triggerPosition === 'start'
              ? 'left-3 bottom-3 justify-start'
              : 'right-3 bottom-3 justify-end',
            getZeroWidthCollapsed() &&
              'pointer-events-auto right-0 top-6 bottom-auto translate-x-1/2 rounded-full',
            triggerClassName,
          )}
          style={mergeStyle(getZeroWidthCollapsed() ? zeroWidthTriggerStyle : triggerStyle)}
          aria-label={collapsedState.value ? '展开侧边栏' : '收起侧边栏'}
          data-rue-layout-sider-trigger={getZeroWidthCollapsed() ? 'zero' : 'default'}
        >
          <RenderSiderTrigger />
        </button>
      ) : null}
    </aside>
  ) : Component === 'button' ? (
    <button
      {...rest}
      className={joinClassName(
        'rue-layout-sider relative flex min-h-0 shrink-0 flex-col overflow-hidden rounded-[1.75rem] border shadow-[0_28px_70px_-42px_rgba(15,23,42,0.5)] transition-[width,flex-basis,max-width,min-width,transform,opacity] duration-300 ease-out',
        resolveThemeClassName(theme),
        getZeroWidthCollapsed() && 'pointer-events-none border-transparent shadow-none',
        className,
      )}
      style={mergeStyle(
        {
          flex: `0 0 ${getCurrentWidth()}`,
          width: getCurrentWidth(),
          minWidth: getCurrentWidth(),
          maxWidth: getCurrentWidth(),
          opacity: getZeroWidthCollapsed() ? 0 : 1,
        },
        style,
      )}
      data-rue-layout-sider="true"
      data-collapsed={collapsedState.value ? 'true' : 'false'}
      data-below={belowState.value ? 'true' : 'false'}
      data-zero-width={getZeroWidthCollapsed() ? 'true' : 'false'}
      data-theme={theme}
    >
      <div
        className={joinClassName(
          'rue-layout-sider-body flex min-h-0 flex-1 flex-col gap-4 p-4 transition-[padding] duration-300 ease-out',
          resolveSiderBodyClassName(theme),
          collapsedState.value && !getZeroWidthCollapsed() && 'items-center px-2',
          bodyClassName,
        )}
        style={mergeStyle(bodyStyle)}
      >
        {children}
      </div>

      {hasRenderableContent(footer) ? (
        <div
          className={joinClassName(
            'rue-layout-sider-footer border-t border-current/10 px-4 py-3 text-xs opacity-80',
            collapsedState.value && !getZeroWidthCollapsed() && 'px-2 text-center',
            footerClassName,
          )}
          style={mergeStyle({ display: shouldHideFooter() ? 'none' : undefined }, footerStyle)}
          aria-hidden={shouldHideFooter() ? 'true' : 'false'}
        >
          {footer}
        </div>
      ) : null}

      {shouldRenderTrigger ? (
        <button
          type="button"
          onClick={toggle}
          className={joinClassName(
            'rue-layout-sider-trigger-button absolute z-10 inline-flex items-center',
            triggerPosition === 'start'
              ? 'left-3 bottom-3 justify-start'
              : 'right-3 bottom-3 justify-end',
            getZeroWidthCollapsed() &&
              'pointer-events-auto right-0 top-6 bottom-auto translate-x-1/2 rounded-full',
            triggerClassName,
          )}
          style={mergeStyle(getZeroWidthCollapsed() ? zeroWidthTriggerStyle : triggerStyle)}
          aria-label={collapsedState.value ? '展开侧边栏' : '收起侧边栏'}
          data-rue-layout-sider-trigger={getZeroWidthCollapsed() ? 'zero' : 'default'}
        >
          <RenderSiderTrigger />
        </button>
      ) : null}
    </button>
  ) : (
    <></>
  )
}

const Layout = /*#__PURE__*/ Object.assign(LayoutRoot, {
  Header,
  Content,
  Footer,
  Sider,
  Trigger,
}) as LayoutCompound

/** 默认导出布局组件。 */
export default Layout
