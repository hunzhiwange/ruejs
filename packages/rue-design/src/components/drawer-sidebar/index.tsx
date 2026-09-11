/*
DrawerSidebar 模块概述
- 汇总抽屉侧栏组件的公开类型、渲染入口和局部工具逻辑。
- 导出注释用于 API 文档生成，内部注释标明状态归一化、样式映射与 DOM 交互边界。
*/
import type { FC } from '@rue-js/rue'
import { Teleport, computed, onMounted, onUnmounted, ref, watch } from '@rue-js/rue'

/** DrawerSidebarPlacement 位置或方向类型。 */
export type DrawerSidebarPlacement = 'left' | 'right' | 'top' | 'bottom'
/** DrawerSidebarSize 尺寸类型。 */
export type DrawerSidebarSize = 'default' | 'large' | number | string
/** DrawerSidebarInlineStyle 样式值类型。 */
export type DrawerSidebarInlineStyle = string | Record<string, string | number | null | undefined>
/** DrawerSidebarGetContainer 类型。 */
export type DrawerSidebarGetContainer = string | HTMLElement | (() => HTMLElement) | false
/** DrawerSidebarClosePlacement 位置或方向类型。 */
export type DrawerSidebarClosePlacement = 'start' | 'end'

/** DrawerSidebarMaskConfig 配置对象。 */
export interface DrawerSidebarMaskConfig {
  /** enabled 配置项。 */
  enabled?: boolean
  /** closable 配置项。 */
  closable?: boolean
  /** blur 配置项。 */
  blur?: boolean
}

/** DrawerSidebarClosableConfig 配置对象。 */
export interface DrawerSidebarClosableConfig {
  /** 弹出层或内容展示位置。 */
  placement?: DrawerSidebarClosePlacement
  /** closeIcon 图标内容。 */
  closeIcon?: any
  /** 是否禁用交互。 */
  disabled?: boolean
}

/** DrawerSidebarClassNames 局部类名配置。 */
export interface DrawerSidebarClassNames {
  /** 根节点区域配置。 */
  root?: string
  /** 遮罩层区域配置。 */
  mask?: string
  /** 外层包裹区域配置。 */
  wrapper?: string
  /** panel 区域配置。 */
  panel?: string
  /** 头部区域内容。 */
  header?: string
  /** 标题内容。 */
  title?: string
  /** 主体区域配置。 */
  body?: string
  /** 底部区域内容。 */
  footer?: string
  /** 关闭按钮区域配置。 */
  close?: string
}

/** DrawerSidebarStyles 局部样式配置。 */
export interface DrawerSidebarStyles {
  /** 根节点区域配置。 */
  root?: DrawerSidebarInlineStyle
  /** 遮罩层区域配置。 */
  mask?: DrawerSidebarInlineStyle
  /** 外层包裹区域配置。 */
  wrapper?: DrawerSidebarInlineStyle
  /** panel 区域配置。 */
  panel?: DrawerSidebarInlineStyle
  /** 头部区域内容。 */
  header?: DrawerSidebarInlineStyle
  /** 标题内容。 */
  title?: DrawerSidebarInlineStyle
  /** 主体区域配置。 */
  body?: DrawerSidebarInlineStyle
  /** 底部区域内容。 */
  footer?: DrawerSidebarInlineStyle
  /** 关闭按钮区域配置。 */
  close?: DrawerSidebarInlineStyle
}

/** DrawerSidebarProps 组件属性。 */
export interface DrawerSidebarProps {
  /** end 配置项。 */
  end?: boolean
  /** 受控打开状态。 */
  open?: boolean
  /** 非受控初始打开状态。 */
  defaultOpen?: boolean
  /** 弹出层或内容展示位置。 */
  placement?: DrawerSidebarPlacement
  /** 组件尺寸。 */
  size?: DrawerSidebarSize
  /** width 配置项。 */
  width?: number | string
  /** height 配置项。 */
  height?: number | string
  /** 标题内容。 */
  title?: any
  /** 额外操作或补充内容。 */
  extra?: any
  /** 底部区域内容。 */
  footer?: any
  /** 是否展示加载态。 */
  loading?: boolean
  /** closable 配置项。 */
  closable?: boolean | DrawerSidebarClosableConfig
  /** closeIcon 图标内容。 */
  closeIcon?: any
  /** keyboard 配置项。 */
  keyboard?: boolean
  /** 遮罩层区域配置。 */
  mask?: boolean | DrawerSidebarMaskConfig
  /** maskClosable 配置项。 */
  maskClosable?: boolean
  /** inline 配置项。 */
  inline?: boolean
  /** forceRender 自定义渲染函数。 */
  forceRender?: boolean
  /** destroyOnClose 配置项。 */
  destroyOnClose?: boolean
  /** destroyOnHidden 配置项。 */
  destroyOnHidden?: boolean
  /** zIndex 配置项。 */
  zIndex?: number
  /** 根节点附加类名。 */
  className?: string
  /** 根节点附加类名。 */
  rootClassName?: string
  /** panelClassName 附加类名。 */
  panelClassName?: string
  /** bodyClassName 附加类名。 */
  bodyClassName?: string
  /** headerClassName 附加类名。 */
  headerClassName?: string
  /** footerClassName 附加类名。 */
  footerClassName?: string
  /** maskClassName 附加类名。 */
  maskClassName?: string
  /** 按局部区域覆盖的类名集合。 */
  classNames?: DrawerSidebarClassNames
  /** 按局部区域覆盖的内联样式集合。 */
  styles?: DrawerSidebarStyles
  /** 根节点内联样式。 */
  style?: DrawerSidebarInlineStyle
  /** 根节点内联样式。 */
  rootStyle?: DrawerSidebarInlineStyle
  /** panelStyle 内联样式。 */
  panelStyle?: DrawerSidebarInlineStyle
  /** bodyStyle 内联样式。 */
  bodyStyle?: DrawerSidebarInlineStyle
  /** headerStyle 内联样式。 */
  headerStyle?: DrawerSidebarInlineStyle
  /** footerStyle 内联样式。 */
  footerStyle?: DrawerSidebarInlineStyle
  /** maskStyle 内联样式。 */
  maskStyle?: DrawerSidebarInlineStyle
  /** getContainer 配置项。 */
  getContainer?: DrawerSidebarGetContainer
  /** drawerRender 自定义渲染函数。 */
  /** 组件子内容。 */
  children?: any
  /** 关闭时触发的回调。 */
  onClose?: (event?: MouseEvent | KeyboardEvent) => void
  /** 打开状态变化时触发的回调。 */
  onOpenChange?: (open: boolean) => void
  /** afterOpenChange 配置项。 */
  afterOpenChange?: (open: boolean) => void
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** DrawerSidebarToggleProps 组件属性。 */
export interface DrawerSidebarToggleProps {
  /** 根节点附加类名。 */
  className?: string
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** DrawerSidebarPartProps 组件属性。 */
export interface DrawerSidebarPartProps {
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

type DrawerSidebarPartComponent<T> = FC<T> & {
  __rueDrawerSidebarPart?: string
}

/** COMPOUND_PART_FLAG 内部常量。 */
const COMPOUND_PART_FLAG = '__rueDrawerSidebarPart'
/** DEFAULT_PANEL_SIZE 内部常量。 */
const DEFAULT_PANEL_SIZE = 378
/** LARGE_PANEL_SIZE 内部常量。 */
const LARGE_PANEL_SIZE = 736
/** DEFAULT_ROOT_Z_INDEX 内部常量。 */
const DEFAULT_ROOT_Z_INDEX = 1000

let activeDrawerCount = 0
let previousDocumentOverflow = ''

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (...parts: Array<string | undefined | false | null>) =>
  parts.filter(Boolean).join(' ')

/** flatten Children 的内部工具函数。 */

/** 判断是否存在 Compound Children 的内部工具函数。 */

/** 归一化 Style Key 的内部工具函数。 */
const normalizeStyleKey = (key: string) => {
  if (key.startsWith('--')) return key
  return key.includes('-')
    ? key.replace(/-([a-z])/g, (_, segment: string) => segment.toUpperCase())
    : key
}

/** 转换为 Style Object 的内部工具函数。 */
const toStyleObject = (style?: DrawerSidebarInlineStyle) => {
  if (!style) return undefined
  const normalized: Record<string, string | number> = {}

  if (typeof style === 'string') {
    style
      .split(';')
      .map(part => part.trim())
      .filter(Boolean)
      .forEach(part => {
        const separatorIndex = part.indexOf(':')
        if (separatorIndex === -1) return
        const rawKey = part.slice(0, separatorIndex).trim()
        const rawValue = part.slice(separatorIndex + 1).trim()
        if (!rawKey || !rawValue) return
        normalized[normalizeStyleKey(rawKey)] = rawValue
      })

    return Object.keys(normalized).length > 0 ? normalized : undefined
  }

  Object.entries(style).forEach(([key, value]) => {
    if (value == null) return
    normalized[normalizeStyleKey(key)] = value
  })

  return Object.keys(normalized).length > 0 ? normalized : undefined
}

/** merge Style Value 的内部工具函数。 */
const mergeStyleValue = (...styles: Array<DrawerSidebarInlineStyle | undefined>) => {
  const merged: Record<string, string | number> = {}

  styles.forEach(style => {
    const normalizedStyle = toStyleObject(style)
    if (normalizedStyle) Object.assign(merged, normalizedStyle)
  })

  return Object.keys(merged).length > 0 ? merged : undefined
}

/** 解析 Numeric Style 的内部工具函数。 */
const resolveNumericStyle = (value?: number | string) => {
  if (value == null) return undefined
  if (typeof value === 'number') return `${value}px`
  if (/^\d+(\.\d+)?$/.test(value)) return `${value}px`
  return value
}

/** 解析 Drawer Size 的内部工具函数。 */
const resolveDrawerSize = (
  size: DrawerSidebarSize | undefined,
  placement: DrawerSidebarPlacement,
  width?: number | string,
  height?: number | string,
) => {
  if (size === 'large') return `${LARGE_PANEL_SIZE}px`
  if (size === 'default') return `${DEFAULT_PANEL_SIZE}px`
  if (size != null) return resolveNumericStyle(size)

  if (placement === 'left' || placement === 'right') {
    return resolveNumericStyle(width) ?? `${DEFAULT_PANEL_SIZE}px`
  }

  return resolveNumericStyle(height) ?? `${DEFAULT_PANEL_SIZE}px`
}

/** 解析 Mask Config 的内部工具函数。 */
const resolveMaskConfig = (
  mask: DrawerSidebarProps['mask'],
  maskClosable?: boolean,
): Required<DrawerSidebarMaskConfig> => {
  if (mask === false) {
    return { enabled: false, closable: false, blur: false }
  }

  if (mask && typeof mask === 'object') {
    return {
      enabled: mask.enabled ?? true,
      closable: mask.closable ?? maskClosable ?? true,
      blur: mask.blur ?? false,
    }
  }

  return {
    enabled: true,
    closable: maskClosable ?? true,
    blur: false,
  }
}

/** 解析 Closable Config 的内部工具函数。 */
const resolveClosableConfig = (closable: DrawerSidebarProps['closable'], closeIcon: any) => {
  if (closable === false) {
    return {
      enabled: false,
      placement: 'end' as DrawerSidebarClosePlacement,
      disabled: false,
      icon: closeIcon,
    }
  }

  if (closable && typeof closable === 'object') {
    return {
      enabled: true,
      placement: closable.placement ?? 'end',
      disabled: closable.disabled ?? false,
      icon: closable.closeIcon ?? closeIcon,
    }
  }

  return {
    enabled: true,
    placement: 'end' as DrawerSidebarClosePlacement,
    disabled: false,
    icon: closeIcon,
  }
}

/** 读取 Wrapper Class Name 的内部工具函数。 */
const getWrapperClassName = (placement: DrawerSidebarPlacement) => {
  switch (placement) {
    case 'left':
      return 'items-stretch justify-start'
    case 'right':
      return 'items-stretch justify-end'
    case 'top':
      return 'items-start justify-stretch'
    case 'bottom':
      return 'items-end justify-stretch'
    default:
      return 'items-stretch justify-end'
  }
}

/** 读取 Panel Base Class Name 的内部工具函数。 */
const getPanelBaseClassName = (placement: DrawerSidebarPlacement) => {
  switch (placement) {
    case 'left':
      return 'h-full max-h-full border-r border-base-300 rounded-r-3xl'
    case 'right':
      return 'h-full max-h-full border-l border-base-300 rounded-l-3xl'
    case 'top':
      return 'w-full border-b border-base-300 rounded-b-3xl'
    case 'bottom':
      return 'w-full border-t border-base-300 rounded-t-3xl'
    default:
      return 'h-full max-h-full border-l border-base-300 rounded-l-3xl'
  }
}

/** 读取 Panel Transform Class Name 的内部工具函数。 */
const getPanelTransformClassName = (placement: DrawerSidebarPlacement, open: boolean) => {
  switch (placement) {
    case 'left':
      return open ? 'translate-x-0' : '-translate-x-full'
    case 'right':
      return open ? 'translate-x-0' : 'translate-x-full'
    case 'top':
      return open ? 'translate-y-0' : '-translate-y-full'
    case 'bottom':
      return open ? 'translate-y-0' : 'translate-y-full'
    default:
      return open ? 'translate-x-0' : 'translate-x-full'
  }
}

/** 读取 Panel Size Style 的内部工具函数。 */
const getPanelSizeStyle = (placement: DrawerSidebarPlacement, size: string | undefined) => {
  if (!size) return undefined
  return placement === 'left' || placement === 'right' ? { width: size } : { height: size }
}

/** 读取 Managed Mode Signature 的内部工具函数。 */
const getManagedModeSignature = (props: DrawerSidebarProps) => {
  return [
    props.defaultOpen,
    props.placement,
    props.size,
    props.width,
    props.height,
    props.title,
    props.extra,
    props.footer,
    props.loading,
    props.closable,
    props.closeIcon,
    props.keyboard,
    props.mask,
    props.maskClosable,
    props.inline,
    props.forceRender,
    props.destroyOnClose,
    props.destroyOnHidden,
    props.rootClassName,
    props.panelClassName,
    props.bodyClassName,
    props.headerClassName,
    props.footerClassName,
    props.maskClassName,
    props.classNames,
    props.styles,
    props.style,
    props.rootStyle,
    props.panelStyle,
    props.bodyStyle,
    props.headerStyle,
    props.footerStyle,
    props.maskStyle,
    props.getContainer,
    props.onClose,
    props.onOpenChange,
    props.afterOpenChange,
    props.zIndex,
  ].some(value => value !== undefined)
}

/** lock Document Scroll 的内部工具函数。 */
const lockDocumentScroll = () => {
  if (typeof document === 'undefined') return
  if (activeDrawerCount === 0) {
    previousDocumentOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
  }
  activeDrawerCount += 1
}

/** unlock Document Scroll 的内部工具函数。 */
const unlockDocumentScroll = () => {
  if (typeof document === 'undefined' || activeDrawerCount === 0) return
  activeDrawerCount -= 1
  if (activeDrawerCount === 0) {
    document.documentElement.style.overflow = previousDocumentOverflow
  }
}

/** 渲染 Loading Body 的内部工具函数。 */
const RenderLoadingBody = () => {
  return (
    <div className="space-y-3" data-rue-drawer-sidebar-loading="true">
      <div className="skeleton h-4 w-1/3" />
      <div className="skeleton h-4 w-full" />
      <div className="skeleton h-4 w-5/6" />
      <div className="skeleton h-24 w-full" />
    </div>
  )
}

/** Default Close Icon 的内部工具函数。 */
const DefaultCloseIcon: FC = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="size-4"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

interface DrawerSidebarCloseButtonProps {
  className?: string
  style?: DrawerSidebarInlineStyle
  disabled?: boolean
  icon?: any
  onRequestClose?: (event: MouseEvent) => void
}

type DrawerSidebarReadableSignal<T> = {
  get: () => T
}

/** DrawerSidebarCloseButton 的内部工具函数。 */
const DrawerSidebarCloseButton: FC<DrawerSidebarCloseButtonProps> = ({
  className,
  style,
  disabled,
  icon,
  onRequestClose,
}) => {
  return (
    <button
      type="button"
      aria-label="关闭"
      disabled={disabled}
      className={mergeClassName(
        'btn btn-sm btn-circle btn-ghost shrink-0',
        disabled ? 'btn-disabled pointer-events-none opacity-50' : undefined,
        className,
      )}
      style={mergeStyleValue(style)}
      onClick={(event: MouseEvent) => {
        event.stopPropagation()
        if (disabled) return
        if (onRequestClose) onRequestClose(event)
      }}
      data-rue-drawer-sidebar-close="true"
    >
      {icon != null ? <span>{String(icon)}</span> : <DefaultCloseIcon />}
    </button>
  )
}

interface DrawerSidebarManagedPanelProps {
  managedRest?: Record<string, any>
  mergedOpen: DrawerSidebarReadableSignal<boolean>
  placement: DrawerSidebarReadableSignal<DrawerSidebarPlacement>
  resolvedSize: DrawerSidebarReadableSignal<string | undefined>
  resolvedClosable: DrawerSidebarReadableSignal<ReturnType<typeof resolveClosableConfig>>
  showHeader: DrawerSidebarReadableSignal<boolean>
  className?: string
  panelClassName?: string
  bodyClassName?: string
  headerClassName?: string
  footerClassName?: string
  classNames?: DrawerSidebarClassNames
  styles?: DrawerSidebarStyles
  style?: DrawerSidebarInlineStyle
  panelStyle?: DrawerSidebarInlineStyle
  bodyStyle?: DrawerSidebarInlineStyle
  headerStyle?: DrawerSidebarInlineStyle
  footerStyle?: DrawerSidebarInlineStyle
  title?: any
  extra?: any
  footer?: any
  loading?: boolean
  inline?: boolean
  children?: any
  setPanelElement?: (element: HTMLDivElement | null) => void
  onRequestClose?: (event: MouseEvent) => void
}

/** DrawerSidebarManagedPanel 的内部工具函数。 */
const DrawerSidebarManagedPanel: FC<DrawerSidebarManagedPanelProps> = ({
  managedRest,
  mergedOpen,
  placement,
  resolvedSize,
  resolvedClosable,
  showHeader,
  className,
  panelClassName,
  bodyClassName,
  headerClassName,
  footerClassName,
  classNames,
  styles,
  style,
  panelStyle,
  bodyStyle,
  headerStyle,
  footerStyle,
  title,
  extra,
  footer,
  loading,
  inline,
  children,
  setPanelElement,
  onRequestClose,
}) => {
  const readFooterSlot = () => footer
  const readExtraSlot = () => extra

  return (
    <div
      {...managedRest}
      role="dialog"
      aria-modal={mergedOpen.get() && !inline ? 'true' : 'false'}
      aria-hidden={mergedOpen.get() ? undefined : 'true'}
      className={mergeClassName(
        'bg-base-100 text-base-content relative flex min-h-0 min-w-0 max-w-full max-h-full flex-col overflow-hidden shadow-2xl transition-transform duration-300 ease-out',
        getPanelBaseClassName(placement.get()),
        getPanelTransformClassName(placement.get(), mergedOpen.get()),
        className,
        panelClassName,
        classNames?.panel,
      )}
      style={mergeStyleValue(
        styles?.panel,
        style,
        panelStyle,
        getPanelSizeStyle(placement.get(), resolvedSize.get()),
      )}
      onClick={(event: MouseEvent) => event.stopPropagation()}
      ref={setPanelElement}
      data-rue-drawer-sidebar-panel="true"
      data-rue-drawer-sidebar-placement={placement.get()}
    >
      {showHeader.get() ? (
        <div
          className={mergeClassName(
            'flex shrink-0 items-start gap-3 border-b border-base-300 px-5 py-4',
            headerClassName,
            classNames?.header,
          )}
          style={mergeStyleValue(styles?.header, headerStyle)}
          data-rue-drawer-sidebar-header="true"
        >
          {resolvedClosable.get().placement === 'start' ? (
            <DrawerSidebarCloseButton
              disabled={resolvedClosable.get().disabled}
              className={classNames?.close}
              style={styles?.close}
              icon={resolvedClosable.get().icon}
              onRequestClose={onRequestClose}
            />
          ) : null}
          <div
            className={mergeClassName('min-w-0 flex-1', classNames?.title)}
            style={mergeStyleValue(styles?.title)}
          >
            {title ? <div className="text-lg font-semibold leading-6">{String(title)}</div> : null}
          </div>
          {extra ? <div className="shrink-0">{readExtraSlot()}</div> : null}
          {resolvedClosable.get().placement === 'end' ? (
            <DrawerSidebarCloseButton
              disabled={resolvedClosable.get().disabled}
              className={classNames?.close}
              style={styles?.close}
              icon={resolvedClosable.get().icon}
              onRequestClose={onRequestClose}
            />
          ) : null}
        </div>
      ) : null}
      <div
        className={mergeClassName(
          'min-h-0 flex-1 overflow-y-auto px-5 py-5',
          bodyClassName,
          classNames?.body,
        )}
        style={mergeStyleValue(styles?.body, bodyStyle)}
        aria-busy={loading ? 'true' : undefined}
        data-rue-drawer-sidebar-body="true"
      >
        {loading ? <RenderLoadingBody /> : children}
      </div>
      {footer !== undefined && footer !== null && footer !== false ? (
        <div
          className={mergeClassName(
            'shrink-0 border-t border-base-300 px-5 py-4',
            footerClassName,
            classNames?.footer,
          )}
          style={mergeStyleValue(styles?.footer, footerStyle)}
          data-rue-drawer-sidebar-footer="true"
        >
          {readFooterSlot()}
        </div>
      ) : null}
    </div>
  )
}

/** render Managed Panel 的内部工具函数。 */

interface DrawerSidebarManagedFrameProps extends DrawerSidebarManagedPanelProps {
  resolvedMaskConfig: DrawerSidebarReadableSignal<Required<DrawerSidebarMaskConfig>>
  rootClassName?: string
  maskClassName?: string
  rootStyle?: DrawerSidebarInlineStyle
  maskStyle?: DrawerSidebarInlineStyle
  zIndex?: number
  setRootElement?: (element: HTMLDivElement | null) => void
  setMaskElement?: (element: HTMLDivElement | null) => void
}

/** DrawerSidebarManagedFrame 的内部工具函数。 */
const DrawerSidebarManagedFrame: FC<DrawerSidebarManagedFrameProps> = ({
  mergedOpen,
  placement,
  resolvedMaskConfig,
  rootClassName,
  maskClassName,
  classNames,
  styles,
  rootStyle,
  maskStyle,
  zIndex,
  inline,
  setRootElement,
  setMaskElement,
  ...panelProps
}) => {
  return (
    <div
      className={mergeClassName(
        inline ? 'absolute inset-0 overflow-hidden' : 'fixed inset-0 overflow-hidden',
        mergedOpen.get() ? 'pointer-events-auto' : 'pointer-events-none',
        rootClassName,
        classNames?.root,
      )}
      style={mergeStyleValue(styles?.root, rootStyle, { zIndex: zIndex ?? DEFAULT_ROOT_Z_INDEX })}
      ref={setRootElement}
      data-rue-drawer-sidebar-root="true"
      data-rue-drawer-sidebar-mode="panel"
      data-rue-drawer-sidebar-open={mergedOpen.get() ? 'true' : 'false'}
    >
      {resolvedMaskConfig.get().enabled ? (
        <div
          aria-hidden="true"
          className={mergeClassName(
            'absolute inset-0 bg-base-content/35 transition-opacity duration-300',
            resolvedMaskConfig.get().blur ? 'backdrop-blur-sm' : undefined,
            mergedOpen.get() ? 'opacity-100' : 'opacity-0',
            maskClassName,
            classNames?.mask,
          )}
          style={mergeStyleValue(styles?.mask, maskStyle)}
          ref={setMaskElement}
          data-rue-drawer-sidebar-mask="true"
        />
      ) : null}
      <div
        className={mergeClassName(
          'absolute inset-0 flex min-h-0 min-w-0',
          getWrapperClassName(placement.get()),
          classNames?.wrapper,
        )}
        style={mergeStyleValue(styles?.wrapper)}
        onClick={(event: MouseEvent) => {
          if (!resolvedMaskConfig.get().enabled || !resolvedMaskConfig.get().closable) return
          if (event.target !== event.currentTarget) return
          if (panelProps.onRequestClose) panelProps.onRequestClose(event)
        }}
        data-rue-drawer-sidebar-wrapper="true"
      >
        <DrawerSidebarManagedPanel
          {...panelProps}
          mergedOpen={mergedOpen}
          placement={placement}
          classNames={classNames}
          styles={styles}
          inline={inline}
        />
      </div>
    </div>
  )
}

/** CompoundRoot 的内部工具函数。 */
const CompoundRoot: FC<DrawerSidebarProps> = ({ end, open, className, children, ...rest }) => {
  const rootClassName = computed(() =>
    mergeClassName('drawer', end ? 'drawer-end' : undefined, open ? 'drawer-open' : undefined),
  )

  return (
    <div
      {...rest}
      className={mergeClassName(rootClassName.get(), className)}
      data-rue-drawer-sidebar-mode="compound"
    >
      {children}
    </div>
  )
}

/** ManagedRoot 的内部工具函数。 */
const ManagedRoot: FC<DrawerSidebarProps> = ({
  end,
  open,
  defaultOpen = false,
  placement: placementProp,
  size,
  width,
  height,
  title,
  extra,
  footer,
  loading = false,
  closable = true,
  closeIcon,
  keyboard = true,
  mask = true,
  maskClosable,
  inline = false,
  forceRender = false,
  destroyOnClose,
  destroyOnHidden = true,
  zIndex,
  className,
  rootClassName,
  panelClassName,
  bodyClassName,
  headerClassName,
  footerClassName,
  maskClassName,
  classNames,
  styles,
  style,
  rootStyle,
  panelStyle,
  bodyStyle,
  headerStyle,
  footerStyle,
  maskStyle,
  getContainer,
  children,
  onClose,
  onOpenChange,
  afterOpenChange,
  ...managedRest
}) => {
  const uncontrolledOpen = ref(defaultOpen)
  const lastDefaultOpen = ref(!!defaultOpen)
  const hasOpened = ref(defaultOpen)
  const locked = ref(false)
  const currentOpen = ref(typeof open === 'boolean' ? open : uncontrolledOpen.value)
  const currentKeyboard = ref(keyboard)
  const isControlled = computed(() => typeof open === 'boolean')
  const mergedOpen = computed(() => currentOpen.value)
  const placement = computed(() => placementProp ?? (end ? 'right' : 'right'))
  const mergedDestroyOnHidden = computed(() => destroyOnHidden ?? destroyOnClose ?? true)
  const resolvedMaskConfig = computed(() => resolveMaskConfig(mask, maskClosable))
  const resolvedClosable = computed(() => resolveClosableConfig(closable, closeIcon))
  const resolvedSize = computed(() => resolveDrawerSize(size, placement.get(), width, height))
  const shouldMount = computed(
    () => mergedOpen.get() || forceRender || (!mergedDestroyOnHidden.get() && hasOpened.value),
  )
  const showHeader = computed(
    () => title != null || extra != null || resolvedClosable.get().enabled,
  )
  const resolvedContainer = computed(() =>
    typeof getContainer === 'function' ? getContainer() : getContainer,
  )
  const requestOpenChange = (nextOpen: boolean) => {
    if (currentOpen.value === nextOpen) return
    currentOpen.value = nextOpen
    if (!isControlled.get()) {
      uncontrolledOpen.value = nextOpen
    }
    if (onOpenChange) onOpenChange(nextOpen)
  }

  const emitClose = (event?: MouseEvent | KeyboardEvent) => {
    if (onClose) onClose(event)
    if (event && event.defaultPrevented) return
    requestOpenChange(false)
  }

  onMounted(() => {
    if (mergedOpen.get() && !inline) {
      lockDocumentScroll()
      locked.value = true
    }

    if (typeof window === 'undefined') return

    const handleWindowKeydown = (event: KeyboardEvent) => {
      if (!currentOpen.value || !currentKeyboard.value || event.key !== 'Escape') return
      emitClose(event)
    }

    window.addEventListener('keydown', handleWindowKeydown)

    onUnmounted(() => {
      window.removeEventListener('keydown', handleWindowKeydown)
    })
  })

  watch(
    () => currentOpen.value,
    (nextOpen: boolean) => {
      if (nextOpen) {
        hasOpened.value = true
        if (!inline && !locked.value) {
          lockDocumentScroll()
          locked.value = true
        }
      } else if (locked.value) {
        unlockDocumentScroll()
        locked.value = false
      }

      if (afterOpenChange) afterOpenChange(nextOpen)
    },
  )

  watch(
    () => open,
    nextOpen => {
      if (typeof nextOpen === 'boolean') {
        currentOpen.value = nextOpen
      }
    },
    { immediate: true },
  )

  watch(
    () => keyboard,
    (nextKeyboard: boolean) => {
      currentKeyboard.value = nextKeyboard
    },
    { immediate: true },
  )

  watch(
    () => defaultOpen,
    nextDefaultOpen => {
      const normalizedDefaultOpen = !!nextDefaultOpen
      if (!isControlled.get() && normalizedDefaultOpen !== lastDefaultOpen.value) {
        lastDefaultOpen.value = normalizedDefaultOpen
        uncontrolledOpen.value = normalizedDefaultOpen
        currentOpen.value = normalizedDefaultOpen
      }
    },
  )

  onUnmounted(() => {
    if (locked.value) {
      unlockDocumentScroll()
      locked.value = false
    }
  })

  return (
    <>
      {shouldMount.get() ? (
        inline || resolvedContainer.get() === false || resolvedContainer.get() == null ? (
          <DrawerSidebarManagedFrame
            managedRest={managedRest}
            mergedOpen={mergedOpen}
            placement={placement}
            resolvedSize={resolvedSize}
            resolvedMaskConfig={resolvedMaskConfig}
            resolvedClosable={resolvedClosable}
            showHeader={showHeader}
            className={className}
            rootClassName={rootClassName}
            panelClassName={panelClassName}
            bodyClassName={bodyClassName}
            headerClassName={headerClassName}
            footerClassName={footerClassName}
            maskClassName={maskClassName}
            classNames={classNames}
            styles={styles}
            style={style}
            rootStyle={rootStyle}
            panelStyle={panelStyle}
            bodyStyle={bodyStyle}
            headerStyle={headerStyle}
            footerStyle={footerStyle}
            maskStyle={maskStyle}
            title={title}
            extra={extra}
            footer={footer}
            loading={loading}
            inline={inline}
            zIndex={zIndex}
            onRequestClose={emitClose}
          >
            {children}
          </DrawerSidebarManagedFrame>
        ) : (
          <Teleport to={resolvedContainer.get() || undefined}>
            <DrawerSidebarManagedFrame
              managedRest={managedRest}
              mergedOpen={mergedOpen}
              placement={placement}
              resolvedSize={resolvedSize}
              resolvedMaskConfig={resolvedMaskConfig}
              resolvedClosable={resolvedClosable}
              showHeader={showHeader}
              className={className}
              rootClassName={rootClassName}
              panelClassName={panelClassName}
              bodyClassName={bodyClassName}
              headerClassName={headerClassName}
              footerClassName={footerClassName}
              maskClassName={maskClassName}
              classNames={classNames}
              styles={styles}
              style={style}
              rootStyle={rootStyle}
              panelStyle={panelStyle}
              bodyStyle={bodyStyle}
              headerStyle={headerStyle}
              footerStyle={footerStyle}
              maskStyle={maskStyle}
              title={title}
              extra={extra}
              footer={footer}
              loading={loading}
              inline={inline}
              zIndex={zIndex}
              onRequestClose={emitClose}
            >
              {children}
            </DrawerSidebarManagedFrame>
          </Teleport>
        )
      ) : null}
    </>
  )
}

/** Root 的内部工具函数。 */
const Root: FC<DrawerSidebarProps> = (props, slots: Record<string, any> = {}) => {
  const shouldUseManagedMode = computed(() => getManagedModeSignature(props))

  return (
    <>
      {shouldUseManagedMode.get() ? (
        <ManagedRoot {...props} extra={slots.extra} footer={slots.footer} />
      ) : (
        <CompoundRoot {...props} />
      )}
    </>
  )
}

/** Toggle 的内部工具函数。 */
const Toggle: DrawerSidebarPartComponent<DrawerSidebarToggleProps> = ({ className, ...rest }) => {
  return (
    <input
      {...rest}
      type="checkbox"
      autoComplete={rest.autoComplete ?? 'off'}
      className={mergeClassName('drawer-toggle', className)}
    />
  )
}
Toggle[COMPOUND_PART_FLAG] = 'Toggle'

/** Content 的内部工具函数。 */
const Content: DrawerSidebarPartComponent<DrawerSidebarPartProps> = ({
  className,
  children,
  ...rest
}) => {
  return (
    <div {...rest} className={mergeClassName('drawer-content', className)}>
      {children}
    </div>
  )
}
Content[COMPOUND_PART_FLAG] = 'Content'

/** Side 的内部工具函数。 */
const Side: DrawerSidebarPartComponent<DrawerSidebarPartProps> = ({
  className,
  children,
  ...rest
}) => {
  return (
    <div {...rest} className={mergeClassName('drawer-side', className)}>
      {children}
    </div>
  )
}
Side[COMPOUND_PART_FLAG] = 'Side'

/** Overlay 的内部工具函数。 */
const Overlay: DrawerSidebarPartComponent<DrawerSidebarPartProps> = ({
  className,
  children,
  ...rest
}) => {
  return (
    <label {...rest} className={mergeClassName('drawer-overlay', className)}>
      {children}
    </label>
  )
}
Overlay[COMPOUND_PART_FLAG] = 'Overlay'

/** DrawerSidebarCompound 类型。 */
export type DrawerSidebarCompound = FC<DrawerSidebarProps> & {
  Toggle: FC<DrawerSidebarToggleProps>
  Content: FC<DrawerSidebarPartProps>
  Side: FC<DrawerSidebarPartProps>
  Overlay: FC<DrawerSidebarPartProps>
}

const DrawerSidebar: DrawerSidebarCompound = /*#__PURE__*/ Object.assign(Root, {
  Toggle,
  Content,
  Side,
  Overlay,
})

/** 默认导出抽屉侧栏组件。 */
export default DrawerSidebar
