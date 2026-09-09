/*
Notification 模块概述
- 汇总通知提醒组件的公开类型、渲染入口和局部工具逻辑。
- 导出注释用于 API 文档生成，内部注释标明状态归一化、样式映射与 DOM 交互边界。
*/
import type { FC } from '@rue-js/rue'
import {
  Component as DynamicComponent,
  onUnmounted,
  ref,
  render,
  useRef,
  useState,
  watch,
} from '@rue-js/rue'

/** NotificationPlacements 常量。 */
export const NotificationPlacements = [
  'top',
  'topLeft',
  'topRight',
  'bottom',
  'bottomLeft',
  'bottomRight',
] as const

/** NotificationPlacement 位置或方向类型。 */
export type NotificationPlacement = (typeof NotificationPlacements)[number]
/** NotificationType 视觉或语义变体类型。 */
export type NotificationType = 'success' | 'info' | 'warning' | 'error'
/** NotificationVariant 视觉或语义变体类型。 */
export type NotificationVariant = 'soft' | 'solid' | 'outline'
/** NotificationCloseSource 类型。 */
export type NotificationCloseSource = 'close' | 'timeout'
/** NotificationKey 标识键类型。 */
export type NotificationKey = string | number
/** NotificationMountTarget 类型。 */
export type NotificationMountTarget =
  | string
  | HTMLElement
  | ShadowRoot
  | (() => HTMLElement | ShadowRoot | null | undefined)
  | false

type NotificationTone = NotificationType | 'neutral'

/** NotificationClassNames 局部类名配置。 */
export interface NotificationClassNames {
  /** 根节点区域配置。 */
  root?: string
  /** 图标内容。 */
  icon?: string
  /** 标题内容。 */
  title?: string
  /** 描述内容。 */
  description?: string
  /** 操作区内容。 */
  actions?: string
  /** progress 配置项。 */
  progress?: string
  /** 关闭按钮区域配置。 */
  close?: string
}

/** NotificationStyles 局部样式配置。 */
export interface NotificationStyles {
  /** 根节点区域配置。 */
  root?: Record<string, any>
  /** 图标内容。 */
  icon?: Record<string, any>
  /** 标题内容。 */
  title?: Record<string, any>
  /** 描述内容。 */
  description?: Record<string, any>
  /** 操作区内容。 */
  actions?: Record<string, any>
  /** progress 配置项。 */
  progress?: Record<string, any>
  /** 关闭按钮区域配置。 */
  close?: Record<string, any>
}

/** NotificationCloseMeta 接口。 */
export interface NotificationCloseMeta {
  /** source 配置项。 */
  source: NotificationCloseSource
  /** event 配置项。 */
  event?: Event
}

/** NotificationClosableConfig 配置对象。 */
export interface NotificationClosableConfig {
  /** 图标内容。 */
  icon?: any
  /** 展示标签。 */
  label?: string
  /** 关闭时触发的回调。 */
  onClose?: (meta: NotificationCloseMeta) => void
}

/** NotificationClosable 类型。 */
export type NotificationClosable = boolean | NotificationClosableConfig

/** NotificationProps 组件属性。 */
export interface NotificationProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** inline 配置项。 */
  inline?: boolean
  /** 弹出层或内容展示位置。 */
  placement?: NotificationPlacement
  /** top 配置项。 */
  top?: number | string
  /** bottom 配置项。 */
  bottom?: number | string
  /** 元素间距。 */
  gap?: number | string
  /** zIndex 配置项。 */
  zIndex?: number | string
  /** maxWidth 配置项。 */
  maxWidth?: number | string
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: Record<string, any>
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** NotificationItemProps 组件属性。 */
export interface NotificationItemProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** 受控打开状态。 */
  open?: boolean
  /** 非受控初始打开状态。 */
  defaultOpen?: boolean
  /** 组件类型或语义类型。 */
  type?: NotificationType
  /** 组件视觉变体。 */
  variant?: NotificationVariant
  /** 图标内容。 */
  icon?: any
  /** showIcon 图标内容。 */
  showIcon?: boolean
  /** 标题内容。 */
  title?: any
  /** message 配置项。 */
  message?: any
  /** 描述内容。 */
  description?: any
  /** 操作区内容。 */
  actions?: any
  /** btn 配置项。 */
  btn?: any
  /** closable 配置项。 */
  closable?: NotificationClosable
  /** closeIcon 图标内容。 */
  closeIcon?: any
  /** duration 配置项。 */
  duration?: number | false | null
  /** pauseOnHover 配置项。 */
  pauseOnHover?: boolean
  /** showProgress 配置项。 */
  showProgress?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: Record<string, any>
  /** 按局部区域覆盖的类名集合。 */
  classNames?: NotificationClassNames
  /** 按局部区域覆盖的内联样式集合。 */
  styles?: NotificationStyles
  /** props 配置项。 */
  props?: Record<string, any>
  /** 组件子内容。 */
  children?: any
  /** 关闭时触发的回调。 */
  onClose?: (meta: NotificationCloseMeta) => void
  /** 打开状态变化时触发的回调。 */
  onOpenChange?: (open: boolean, meta: NotificationCloseMeta) => void
  /** 点击时触发的回调。 */
  onClick?: (event: MouseEvent) => void
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** NotificationArgsProps 组件属性。 */
export interface NotificationArgsProps extends Omit<NotificationItemProps, 'open' | 'defaultOpen'> {
  /** 数据项唯一标识。 */
  key?: NotificationKey
  /** 弹出层或内容展示位置。 */
  placement?: NotificationPlacement
}

/** NotificationUseOptions 选项配置。 */
export interface NotificationUseOptions extends Omit<NotificationProps, 'children'> {
  /** getContainer 配置项。 */
  getContainer?: NotificationMountTarget
  /** maxCount 配置项。 */
  maxCount?: number
  /** duration 配置项。 */
  duration?: number | false | null
  /** closable 配置项。 */
  closable?: NotificationClosable
  /** pauseOnHover 配置项。 */
  pauseOnHover?: boolean
  /** showProgress 配置项。 */
  showProgress?: boolean
  /** showIcon 图标内容。 */
  showIcon?: boolean
  /** 组件视觉变体。 */
  variant?: NotificationVariant
  /** 组件类型或语义类型。 */
  type?: NotificationType
  /** closeIcon 图标内容。 */
  closeIcon?: any
  /** 按局部区域覆盖的类名集合。 */
  classNames?: NotificationClassNames
  /** 按局部区域覆盖的内联样式集合。 */
  styles?: NotificationStyles
  /** props 配置项。 */
  props?: Record<string, any>
}

/** NotificationGlobalConfig 配置对象。 */
export interface NotificationGlobalConfig extends NotificationUseOptions {}

/** NotificationInstance 对外暴露的实例能力。 */
export interface NotificationInstance {
  /** 受控打开状态。 */
  open: (config: NotificationArgsProps) => () => void
  /** success 配置项。 */
  success: (config: Omit<NotificationArgsProps, 'type'>) => () => void
  /** info 配置项。 */
  info: (config: Omit<NotificationArgsProps, 'type'>) => () => void
  /** warning 配置项。 */
  warning: (config: Omit<NotificationArgsProps, 'type'>) => () => void
  /** error 配置项。 */
  error: (config: Omit<NotificationArgsProps, 'type'>) => () => void
  /** destroy 配置项。 */
  destroy: (key?: NotificationKey) => void
}

interface NotificationRecord {
  key: NotificationKey
  config: NotificationArgsProps
}

interface NotificationViewportProps extends NotificationUseOptions {
  records: NotificationRecord[]
  inline?: boolean
  onDestroy: (key?: NotificationKey) => void
}

interface MutableCell<T> {
  value: T
}

interface NotificationHookStore {
  api?: NotificationInstance
  records: NotificationRecord[]
  holderElement?: HTMLDivElement
  viewportElement?: HTMLDivElement
  options: NotificationUseOptions
}

const createCell = <T,>(value: T): MutableCell<T> => ({ value })

/** DEFAULT_PLACEMENT 内部常量。 */
const DEFAULT_PLACEMENT: NotificationPlacement = 'topRight'
/** DEFAULT_DURATION 内部常量。 */
const DEFAULT_DURATION = 4.5
/** DEFAULT_TOP 内部常量。 */
const DEFAULT_TOP = 24
/** DEFAULT_BOTTOM 内部常量。 */
const DEFAULT_BOTTOM = 24
/** DEFAULT_GAP 内部常量。 */
const DEFAULT_GAP = 14

let notificationSeed = 0
let globalOptions: NotificationGlobalConfig = {}
let globalRecords: NotificationRecord[] = []
let globalViewportElement: HTMLDivElement | undefined

/** merge Class Names 的内部工具函数。 */
const mergeClassNames = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ')

/** 转换为 Child Array 的内部工具函数。 */
const toChildArray = (children: any): any[] => {
  if (Array.isArray(children)) return children.flatMap(item => toChildArray(item))
  if (children == null || children === false) return []
  return [children]
}

/** 判断是否存在 Renderable Content 的内部工具函数。 */
const hasRenderableContent = (value: any) => toChildArray(value).length > 0

/** 归一化 Space Value 的内部工具函数。 */
const normalizeSpaceValue = (value?: number | string) => {
  if (typeof value === 'number') return `${value}px`
  return value
}

/** 解析 Duration Ms 的内部工具函数。 */
const resolveDurationMs = (duration?: number | false | null) => {
  if (typeof duration !== 'number' || duration <= 0) return null
  return duration * 1000
}

/** 解析 Tone 的内部工具函数。 */
const resolveTone = (type?: NotificationType): NotificationTone => type ?? 'neutral'
/** 解析 Role 的内部工具函数。 */
const resolveRole = (type?: NotificationType) =>
  type === 'warning' || type === 'error' ? 'alert' : 'status'
/** 解析 Aria Live 的内部工具函数。 */
const resolveAriaLive = (type?: NotificationType) =>
  type === 'warning' || type === 'error' ? 'assertive' : 'polite'

/** merge Semantic Class Names 的内部工具函数。 */
const mergeSemanticClassNames = (
  base?: NotificationClassNames,
  override?: NotificationClassNames,
): NotificationClassNames | undefined => {
  if (!base && !override) return undefined
  return {
    root: mergeClassNames(base?.root, override?.root),
    icon: mergeClassNames(base?.icon, override?.icon),
    title: mergeClassNames(base?.title, override?.title),
    description: mergeClassNames(base?.description, override?.description),
    actions: mergeClassNames(base?.actions, override?.actions),
    progress: mergeClassNames(base?.progress, override?.progress),
    close: mergeClassNames(base?.close, override?.close),
  }
}

/** merge Semantic Styles 的内部工具函数。 */
const mergeSemanticStyles = (
  base?: NotificationStyles,
  override?: NotificationStyles,
): NotificationStyles | undefined => {
  if (!base && !override) return undefined
  return {
    root: { ...base?.root, ...override?.root },
    icon: { ...base?.icon, ...override?.icon },
    title: { ...base?.title, ...override?.title },
    description: { ...base?.description, ...override?.description },
    actions: { ...base?.actions, ...override?.actions },
    progress: { ...base?.progress, ...override?.progress },
    close: { ...base?.close, ...override?.close },
  }
}

/** trim Records 的内部工具函数。 */
const trimRecords = (records: NotificationRecord[], maxCount?: number) => {
  if (typeof maxCount !== 'number' || maxCount <= 0 || records.length <= maxCount) return records
  return records.slice(records.length - maxCount)
}

/** 解析 Mount Target 的内部工具函数。 */
const resolveMountTarget = (
  getContainer: NotificationMountTarget | undefined,
  holderElement?: HTMLElement | null,
  fallbackToBody = false,
) => {
  if (typeof document === 'undefined') return null
  const resolved = typeof getContainer === 'function' ? getContainer() : getContainer
  if (resolved === false) return holderElement ?? null
  if (typeof resolved === 'string') return document.querySelector(resolved) as HTMLElement | null
  if (resolved && typeof resolved === 'object' && 'appendChild' in resolved) {
    return resolved as HTMLElement | ShadowRoot
  }
  return fallbackToBody ? document.body : null
}

const placementLayoutMap: Record<
  NotificationPlacement,
  { align: string; justify: string; top: boolean }
> = {
  top: { align: 'items-center', justify: 'justify-start', top: true },
  topLeft: { align: 'items-start', justify: 'justify-start', top: true },
  topRight: { align: 'items-end', justify: 'justify-start', top: true },
  bottom: { align: 'items-center', justify: 'justify-end', top: false },
  bottomLeft: { align: 'items-start', justify: 'justify-end', top: false },
  bottomRight: { align: 'items-end', justify: 'justify-end', top: false },
}

const toneStyleMap: Record<
  NotificationTone,
  {
    soft: string
    solid: string
    outline: string
    icon: string
    close: string
    progress: string
    accent: string
  }
> = {
  neutral: {
    soft: 'border-base-300 bg-base-100/92 text-base-content supports-[backdrop-filter]:bg-base-100/78',
    solid: 'border-neutral bg-neutral text-neutral-content',
    outline: 'border-neutral/60 bg-base-100/90 text-base-content',
    icon: 'bg-base-200 text-base-content/75',
    close: 'text-base-content/45 hover:bg-base-200 hover:text-base-content',
    progress: 'bg-base-content/25',
    accent: 'bg-gradient-to-r from-base-content/10 via-base-content/25 to-base-content/5',
  },
  info: {
    soft: 'border-info/25 bg-base-100/92 text-base-content supports-[backdrop-filter]:bg-base-100/78',
    solid: 'border-info bg-info text-info-content',
    outline: 'border-info bg-base-100/90 text-base-content',
    icon: 'bg-info/10 text-info',
    close: 'text-info/80 hover:bg-info/10 hover:text-info',
    progress: 'bg-info/70',
    accent: 'bg-gradient-to-r from-info/35 via-info/80 to-info/20',
  },
  success: {
    soft: 'border-success/25 bg-base-100/92 text-base-content supports-[backdrop-filter]:bg-base-100/78',
    solid: 'border-success bg-success text-success-content',
    outline: 'border-success bg-base-100/90 text-base-content',
    icon: 'bg-success/10 text-success',
    close: 'text-success/80 hover:bg-success/10 hover:text-success',
    progress: 'bg-success/70',
    accent: 'bg-gradient-to-r from-success/35 via-success/80 to-success/20',
  },
  warning: {
    soft: 'border-warning/30 bg-base-100/92 text-base-content supports-[backdrop-filter]:bg-base-100/78',
    solid: 'border-warning bg-warning text-warning-content',
    outline: 'border-warning bg-base-100/90 text-base-content',
    icon: 'bg-warning/15 text-warning',
    close: 'text-warning/85 hover:bg-warning/15 hover:text-warning',
    progress: 'bg-warning/70',
    accent: 'bg-gradient-to-r from-warning/35 via-warning/80 to-warning/20',
  },
  error: {
    soft: 'border-error/28 bg-base-100/92 text-base-content supports-[backdrop-filter]:bg-base-100/78',
    solid: 'border-error bg-error text-error-content',
    outline: 'border-error bg-base-100/90 text-base-content',
    icon: 'bg-error/10 text-error',
    close: 'text-error/80 hover:bg-error/10 hover:text-error',
    progress: 'bg-error/70',
    accent: 'bg-gradient-to-r from-error/35 via-error/80 to-error/20',
  },
}

/** ITEM_BASE_CLASS 内部常量。 */
const ITEM_BASE_CLASS =
  'pointer-events-auto relative w-full max-w-full overflow-hidden rounded-[1.5rem] border px-4 py-4 text-left shadow-[0_24px_80px_-40px_rgba(15,23,42,0.65)] backdrop-blur transition sm:w-[26rem]'

interface GlyphProps {
  className?: string
}

/** Notice Icon 的内部工具函数。 */
const NoticeIcon: FC<GlyphProps> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path
      d="M12 4a5 5 0 0 0-5 5v2.35c0 .6-.18 1.18-.53 1.67L5 15h14l-1.47-1.98A2.8 2.8 0 0 1 17 11.35V9a5 5 0 0 0-5-5Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M9.75 18a2.25 2.25 0 0 0 4.5 0" strokeLinecap="round" />
  </svg>
)
/** Info Icon 的内部工具函数。 */
const InfoIcon: FC<GlyphProps> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 10v6" />
    <path d="M12 7.5h.01" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
/** Success Icon 的内部工具函数。 */
const SuccessIcon: FC<GlyphProps> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12 2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
/** Warning Icon 的内部工具函数。 */
const WarningIcon: FC<GlyphProps> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="M12 4 3.8 18.2a1 1 0 0 0 .87 1.5h14.66a1 1 0 0 0 .87-1.5z" strokeLinejoin="round" />
    <path d="M12 9v4" strokeLinecap="round" />
    <path d="M12 16.5h.01" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
/** Error Icon 的内部工具函数。 */
const ErrorIcon: FC<GlyphProps> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6" strokeLinecap="round" />
    <path d="m15 9-6 6" strokeLinecap="round" />
  </svg>
)
/** Close Icon 的内部工具函数。 */
const CloseIcon: FC<GlyphProps> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="m7 7 10 10" strokeLinecap="round" />
    <path d="M17 7 7 17" strokeLinecap="round" />
  </svg>
)

/** 渲染 Default Icon 的内部工具函数。 */
const renderDefaultIcon = (type?: NotificationType) => {
  const className = 'h-5 w-5'
  switch (type) {
    case 'info':
      return <InfoIcon className={className} />
    case 'success':
      return <SuccessIcon className={className} />
    case 'warning':
      return <WarningIcon className={className} />
    case 'error':
      return <ErrorIcon className={className} />
    default:
      return <NoticeIcon className={className} />
  }
}

/** 解析 Closable 的内部工具函数。 */
const resolveClosable = (closable?: NotificationClosable, closeIcon?: any) => {
  if (!closable)
    return { enabled: false, icon: closeIcon, label: '关闭通知', onClose: undefined as any }
  if (typeof closable === 'object') {
    return {
      enabled: true,
      icon: closable.icon ?? closeIcon,
      label: closable.label ?? '关闭通知',
      onClose: closable.onClose,
    }
  }
  return { enabled: true, icon: closeIcon, label: '关闭通知', onClose: undefined as any }
}

const NotificationSlot: FC<{ children?: any }> = ({ children }) => <>{children}</>

/** Notification Item 的内部工具函数。 */
const NotificationItem: FC<NotificationItemProps> = ({
  as = 'div',
  open,
  defaultOpen = true,
  type,
  variant = 'soft',
  icon,
  showIcon,
  title,
  message,
  description,
  actions,
  btn,
  closable,
  closeIcon,
  duration,
  pauseOnHover = true,
  showProgress = false,
  className,
  style,
  classNames,
  styles,
  props: itemProps,
  children,
  onClose,
  onOpenChange,
  onClick,
  ...rest
}) => {
  const Component = as as any
  const uncontrolledOpen = ref(!!defaultOpen)
  const lastDefaultOpen = ref(!!defaultOpen)
  const isControlled = typeof open === 'boolean'
  const [currentOpen, setCurrentOpen] = useState(isControlled ? !!open : uncontrolledOpen.value)
  const hovered = ref(false)
  const closeTimerRef = createCell<number | undefined>(undefined)
  const timerStartedAtRef = createCell<number | undefined>(undefined)
  const remainingDurationRef = createCell<number | null>(resolveDurationMs(duration))
  const {
    onMouseEnter: userOnMouseEnter,
    onMouseLeave: userOnMouseLeave,
    onClick: userOnClick,
    role: providedRole,
    'aria-live': providedAriaLive,
    'data-rue-notification-item': providedNotificationMarker,
    'data-rue-notification-type': providedNotificationType,
    ...forwardedComponentProps
  }: Record<string, any> = { ...itemProps, ...rest }
  const rootElement = createCell<HTMLElement | null>(null)
  const visible = isControlled ? !!open : currentOpen

  const tone = resolveTone(type)
  const toneStyles = toneStyleMap[tone]
  const rootToneClass =
    variant === 'solid'
      ? toneStyles.solid
      : variant === 'outline'
        ? toneStyles.outline
        : toneStyles.soft
  const resolvedTitle = title ?? message
  const resolvedActions = actions ?? btn
  const resolvedClosable = resolveClosable(closable, closeIcon)
  const resolvedClosableEnabled = !!resolvedClosable?.enabled
  const resolvedClosableLabel = resolvedClosable?.label ?? '关闭通知'
  const resolvedClosableIcon = resolvedClosable?.icon
  const resolvedClosableOnClose = resolvedClosable?.onClose
  const resolvedShowIcon = showIcon ?? (icon !== undefined || type !== undefined)
  const resolvedIcon = resolvedShowIcon ? (icon ?? renderDefaultIcon(type)) : null
  const notificationMarker = providedNotificationMarker ?? 'true'
  const notificationType = providedNotificationType ?? tone
  const componentProps: Record<string, any> = {
    ...forwardedComponentProps,
    role: providedRole ?? resolveRole(type),
    'aria-live': providedAriaLive ?? resolveAriaLive(type),
    'data-rue-notification-item': notificationMarker,
    'data-rue-notification-type': notificationType,
  }

  const notificationTestId = componentProps['data-testid']

  const syncItemDom = (nextOpen: boolean) => {
    const element = rootElement.value
    if (!element) return
    element.style.display = nextOpen ? '' : 'none'
    if (nextOpen) {
      element.removeAttribute('aria-hidden')
      element.setAttribute('data-rue-notification-item', String(notificationMarker))
      element.setAttribute('data-rue-notification-type', String(notificationType))
      if (notificationTestId != null)
        element.setAttribute('data-testid', String(notificationTestId))
      return
    }
    element.setAttribute('aria-hidden', 'true')
    element.removeAttribute('data-rue-notification-item')
    element.removeAttribute('data-rue-notification-type')
    if (notificationTestId != null) element.removeAttribute('data-testid')
  }

  const clearAutoCloseTimer = (captureRemaining = false) => {
    if (closeTimerRef.value == null) return
    if (captureRemaining && remainingDurationRef.value != null && timerStartedAtRef.value != null) {
      const elapsed = Date.now() - timerStartedAtRef.value
      remainingDurationRef.value = Math.max(0, remainingDurationRef.value - elapsed)
    }
    window.clearTimeout(closeTimerRef.value)
    closeTimerRef.value = undefined
    timerStartedAtRef.value = undefined
  }

  const requestClose = (source: NotificationCloseSource, event?: Event) => {
    clearAutoCloseTimer()
    remainingDurationRef.value = 0
    if (!currentOpen) return
    setCurrentOpen(false)
    syncItemDom(false)
    if (!isControlled) uncontrolledOpen.value = false
    const meta = { source, event }
    if (source === 'close' && resolvedClosableOnClose) resolvedClosableOnClose(meta)
    if (onOpenChange) onOpenChange(false, meta)
    if (onClose) onClose(meta)
  }

  const startAutoCloseTimer = () => {
    clearAutoCloseTimer()
    if (!currentOpen) return
    if (pauseOnHover && hovered.value) return
    if (remainingDurationRef.value == null || remainingDurationRef.value <= 0) return
    timerStartedAtRef.value = Date.now()
    closeTimerRef.value = window.setTimeout(() => {
      closeTimerRef.value = undefined
      timerStartedAtRef.value = undefined
      remainingDurationRef.value = 0
      requestClose('timeout')
    }, remainingDurationRef.value)
  }

  const refreshAutoCloseTimer = (resetRemaining = true) => {
    clearAutoCloseTimer()
    if (resetRemaining) remainingDurationRef.value = resolveDurationMs(duration)
    startAutoCloseTimer()
  }

  onUnmounted(() => {
    clearAutoCloseTimer()
  })

  watch(
    () => open,
    nextOpen => {
      if (typeof nextOpen === 'boolean') setCurrentOpen(nextOpen)
    },
    { immediate: true },
  )

  watch(
    () => defaultOpen,
    nextDefaultOpen => {
      const normalizedDefaultOpen = !!nextDefaultOpen
      if (!isControlled && normalizedDefaultOpen !== lastDefaultOpen.value) {
        lastDefaultOpen.value = normalizedDefaultOpen
        uncontrolledOpen.value = normalizedDefaultOpen
        setCurrentOpen(normalizedDefaultOpen)
      }
    },
    { immediate: true },
  )

  watch(
    () => (isControlled ? !!open : currentOpen),
    nextOpen => {
      if (!nextOpen) {
        clearAutoCloseTimer()
        syncItemDom(false)
        return
      }
      syncItemDom(true)
      refreshAutoCloseTimer(true)
    },
    { immediate: true },
  )

  watch(
    () => duration,
    () => {
      if (!currentOpen) {
        remainingDurationRef.value = resolveDurationMs(duration)
        return
      }
      refreshAutoCloseTimer(true)
    },
  )

  watch(
    () => pauseOnHover,
    () => {
      if (!currentOpen) return
      refreshAutoCloseTimer(false)
    },
  )

  if (!visible) return null

  const mergedRootStyle: Record<string, any> = {
    maxWidth: 'var(--rue-notification-max-width, 26rem)',
    ...styles?.root,
    ...style,
  }

  return (
    <div style={{ display: 'contents' }}>
      <DynamicComponent
        is={Component}
        {...componentProps}
        className={mergeClassNames(ITEM_BASE_CLASS, rootToneClass, classNames?.root, className)}
        style={mergedRootStyle}
        ref={(element: HTMLElement | null) => {
          rootElement.value = element
          syncItemDom(!!currentOpen)
        }}
        onClick={(event: MouseEvent) => {
          if (typeof userOnClick === 'function') userOnClick(event)
          if (event.defaultPrevented) return
          if (typeof onClick === 'function') onClick(event)
        }}
        onMouseEnter={(event: MouseEvent) => {
          hovered.value = true
          if (pauseOnHover) clearAutoCloseTimer(true)
          if (typeof userOnMouseEnter === 'function') userOnMouseEnter(event)
        }}
        onMouseLeave={(event: MouseEvent) => {
          hovered.value = false
          if (pauseOnHover) startAutoCloseTimer()
          if (typeof userOnMouseLeave === 'function') userOnMouseLeave(event)
        }}
      >
        <div className={mergeClassNames('absolute inset-x-0 top-0 h-1', toneStyles.accent)} />
        <div className="flex items-start gap-3">
          {hasRenderableContent(resolvedIcon) ? (
            <div
              className={mergeClassNames(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                toneStyles.icon,
                classNames?.icon,
              )}
              style={styles?.icon}
            >
              <NotificationSlot>{resolvedIcon}</NotificationSlot>
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                {hasRenderableContent(resolvedTitle) ? (
                  <div
                    className={mergeClassNames(
                      'text-sm font-semibold leading-6',
                      classNames?.title,
                    )}
                    style={styles?.title}
                  >
                    <NotificationSlot>{resolvedTitle}</NotificationSlot>
                  </div>
                ) : null}
                {hasRenderableContent(description) ? (
                  <div
                    className={mergeClassNames(
                      hasRenderableContent(resolvedTitle)
                        ? 'mt-1 text-sm leading-6 opacity-75'
                        : 'text-sm leading-6 opacity-80',
                      classNames?.description,
                    )}
                    style={styles?.description}
                  >
                    <NotificationSlot>{description}</NotificationSlot>
                  </div>
                ) : null}
              </div>
              {resolvedClosableEnabled ? (
                <button
                  type="button"
                  aria-label={resolvedClosableLabel}
                  className={mergeClassNames(
                    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl transition',
                    toneStyles.close,
                    classNames?.close,
                  )}
                  style={styles?.close}
                  onClick={(event: MouseEvent) => requestClose('close', event)}
                >
                  <NotificationSlot>
                    {resolvedClosableIcon ?? <CloseIcon className="h-4 w-4" />}
                  </NotificationSlot>
                </button>
              ) : null}
            </div>
            {hasRenderableContent(children) ? (
              <div
                className={mergeClassNames(
                  hasRenderableContent(resolvedTitle) || hasRenderableContent(description)
                    ? 'mt-3'
                    : '',
                )}
              >
                {children}
              </div>
            ) : null}
            {hasRenderableContent(resolvedActions) ? (
              <div
                className={mergeClassNames(
                  hasRenderableContent(resolvedTitle) ||
                    hasRenderableContent(description) ||
                    hasRenderableContent(children)
                    ? 'mt-4 flex flex-wrap items-center gap-2'
                    : 'flex flex-wrap items-center gap-2',
                  classNames?.actions,
                )}
                style={styles?.actions}
              >
                <NotificationSlot>{resolvedActions}</NotificationSlot>
              </div>
            ) : null}
          </div>
        </div>
        {showProgress && resolveDurationMs(duration) != null ? (
          <div
            className={mergeClassNames(
              'mt-4 h-1 overflow-hidden rounded-full bg-base-content/10',
              classNames?.progress,
            )}
            style={styles?.progress}
          >
            <div className={mergeClassNames('h-full w-full rounded-full', toneStyles.progress)} />
          </div>
        ) : null}
      </DynamicComponent>
    </div>
  )
}

/** Notification Root 的内部工具函数。 */
const NotificationRoot: FC<NotificationProps> = ({
  as = 'div',
  inline = false,
  placement = DEFAULT_PLACEMENT,
  top = DEFAULT_TOP,
  bottom = DEFAULT_BOTTOM,
  gap = DEFAULT_GAP,
  zIndex = 70,
  maxWidth,
  className,
  style,
  children,
  ...rest
}) => {
  const Component = as as any
  const layout = placementLayoutMap[placement]
  const mergedStyle: Record<string, any> = {
    ...style,
    ...(gap != null ? { gap: normalizeSpaceValue(gap) } : {}),
    ...(zIndex != null ? { zIndex } : {}),
    ...(layout.top && top != null ? { paddingTop: normalizeSpaceValue(top) } : {}),
    ...(!layout.top && bottom != null ? { paddingBottom: normalizeSpaceValue(bottom) } : {}),
    ...(maxWidth != null ? { '--rue-notification-max-width': normalizeSpaceValue(maxWidth) } : {}),
  }

  return (
    <DynamicComponent
      is={Component}
      {...rest}
      className={mergeClassNames(
        inline ? 'absolute' : 'fixed',
        'pointer-events-none inset-0 flex flex-col p-4 sm:p-6',
        layout.align,
        layout.justify,
        className,
      )}
      style={mergedStyle}
    >
      {toChildArray(children)}
    </DynamicComponent>
  )
}

/** group Records 的内部工具函数。 */
const groupRecords = (records: NotificationRecord[], fallbackPlacement: NotificationPlacement) => {
  const grouped: Record<NotificationPlacement, NotificationRecord[]> = {
    top: [],
    topLeft: [],
    topRight: [],
    bottom: [],
    bottomLeft: [],
    bottomRight: [],
  }
  records.forEach(record => {
    const placement = record.config.placement ?? fallbackPlacement
    grouped[placement].push(record)
  })
  return grouped
}

/** Notification Viewport 的内部工具函数。 */
const NotificationViewport: FC<NotificationViewportProps> = ({
  records,
  inline = false,
  onDestroy,
  placement = DEFAULT_PLACEMENT,
  duration = DEFAULT_DURATION,
  closable = true,
  pauseOnHover = true,
  showProgress = false,
  showIcon,
  variant = 'soft',
  type,
  closeIcon,
  classNames,
  styles,
  props,
  ...containerProps
}) => {
  if (records.length === 0) return <div style={{ display: 'contents' }} />
  const grouped = groupRecords(records, placement)

  return (
    <>
      {NotificationPlacements.map(currentPlacement => {
        const placementRecords = grouped[currentPlacement]
        if (placementRecords.length === 0) return null
        const ordered = placementLayoutMap[currentPlacement].top
          ? [...placementRecords].reverse()
          : placementRecords
        return (
          <NotificationRoot
            key={currentPlacement}
            {...containerProps}
            inline={inline}
            placement={currentPlacement}
          >
            {ordered.map(record => {
              const {
                key: _key,
                placement: _placement,
                duration: itemDuration = duration,
                closable: itemClosable = closable,
                pauseOnHover: itemPauseOnHover = pauseOnHover,
                showProgress: itemShowProgress = showProgress,
                showIcon: itemShowIcon = showIcon,
                variant: itemVariant = variant,
                type: itemType = type,
                closeIcon: itemCloseIcon = closeIcon,
                classNames: itemClassNames,
                styles: itemStyles,
                props: itemProps,
                onClose,
                onOpenChange,
                ...itemConfig
              } = record.config

              return (
                <NotificationItem
                  key={record.key}
                  {...itemConfig}
                  props={{ ...props, ...itemProps }}
                  duration={itemDuration}
                  closable={itemClosable}
                  pauseOnHover={itemPauseOnHover}
                  showProgress={itemShowProgress}
                  showIcon={itemShowIcon}
                  variant={itemVariant}
                  type={itemType}
                  closeIcon={itemCloseIcon}
                  classNames={mergeSemanticClassNames(classNames, itemClassNames)}
                  styles={mergeSemanticStyles(styles, itemStyles)}
                  onClose={(meta: NotificationCloseMeta) => {
                    if (onClose) onClose(meta)
                  }}
                  onOpenChange={(nextOpen: boolean, meta: NotificationCloseMeta) => {
                    if (!nextOpen) onDestroy(record.key)
                    if (onOpenChange) onOpenChange(nextOpen, meta)
                  }}
                />
              )
            })}
          </NotificationRoot>
        )
      })}
    </>
  )
}

/** useNotification 组合式能力入口。 */
export const useNotification = (options: NotificationUseOptions = {}) => {
  const storeRef = useRef<NotificationHookStore>()
  if (storeRef.current == null) {
    storeRef.current = {
      records: [],
      options,
    }
  }
  const store = storeRef.current
  store.options = options

  const ensureViewportElement = () => {
    const target = resolveMountTarget(
      (store.options ?? {}).getContainer,
      store.holderElement ?? null,
      true,
    )
    if (!target) return null
    if (store.viewportElement == null) {
      const element = document.createElement('div')
      element.style.display = 'contents'
      element.dataset.rueNotificationViewport = 'true'
      store.viewportElement = element
    }
    if (typeof target.appendChild !== 'function') return null
    if (store.viewportElement.parentNode !== target) target.appendChild(store.viewportElement)
    return store.viewportElement
  }

  const destroy = (key?: NotificationKey) => {
    const current = store.records ?? []
    if (key == null) {
      if (current.length > 0) {
        store.records = []
        syncViewport()
      }
      return
    }
    const next = current.filter(record => record.key !== key)
    if (next.length !== current.length) {
      store.records = next
      syncViewport()
    }
  }

  const syncViewport = () => {
    const currentRecords = store.records ?? []
    if (currentRecords.length === 0 && store.viewportElement == null) return
    const viewportElement = ensureViewportElement()
    if (!viewportElement) return
    render(
      <NotificationViewport
        records={currentRecords}
        onDestroy={destroy}
        inline={(store.options ?? {}).getContainer === false}
        {...(store.options ?? {})}
      />,
      viewportElement,
    )
  }

  const open = (config: NotificationArgsProps) => {
    const nextKey = config.key ?? `rue-notification-${notificationSeed++}`
    const nextRecord: NotificationRecord = { key: nextKey, config: { ...config, key: nextKey } }
    const current = store.records ?? []
    const currentIndex = current.findIndex(record => record.key === nextKey)
    let next =
      currentIndex === -1
        ? [...current, nextRecord]
        : [...current.slice(0, currentIndex), nextRecord, ...current.slice(currentIndex + 1)]
    next = trimRecords(next, (store.options ?? {}).maxCount)
    store.records = next
    syncViewport()
    return () => destroy(nextKey)
  }

  if (store.api == null) {
    const createTypedOpen =
      (nextType: NotificationType) => (config: Omit<NotificationArgsProps, 'type'>) =>
        open({ ...config, type: nextType })
    store.api = {
      open,
      success: createTypedOpen('success'),
      info: createTypedOpen('info'),
      warning: createTypedOpen('warning'),
      error: createTypedOpen('error'),
      destroy,
    }
  }

  onUnmounted(() => {
    store.records = []
    if (store.viewportElement) {
      store.viewportElement.remove()
      store.viewportElement = undefined
    }
    store.holderElement = undefined
  })

  const contextHolder = (
    <div
      style={{ display: 'contents' }}
      ref={(element: HTMLDivElement | null) => {
        store.holderElement = element ?? undefined
        if (
          (store.options ?? {}).getContainer === false &&
          element &&
          (store.records ?? []).length > 0
        )
          syncViewport()
      }}
    />
  )

  return [store.api!, contextHolder] as const
}

/** ensure Global Viewport 的内部工具函数。 */
const ensureGlobalViewport = () => {
  const target = resolveMountTarget(globalOptions.getContainer, null, true)
  if (!target) return null
  if (globalViewportElement == null) {
    const element = document.createElement('div')
    element.style.display = 'contents'
    element.dataset.rueNotificationGlobalViewport = 'true'
    globalViewportElement = element
  }
  if (typeof target.appendChild !== 'function') return null
  if (globalViewportElement.parentNode !== target) target.appendChild(globalViewportElement)
  return globalViewportElement
}

/** destroy Global Notifications 的内部工具函数。 */
const destroyGlobalNotifications = (key?: NotificationKey) => {
  if (key == null) {
    if (globalRecords.length > 0) {
      globalRecords = []
      syncGlobalViewport()
    }
    return
  }
  const next = globalRecords.filter(record => record.key !== key)
  if (next.length !== globalRecords.length) {
    globalRecords = next
    syncGlobalViewport()
  }
}

/** sync Global Viewport 的内部工具函数。 */
const syncGlobalViewport = () => {
  if (typeof document === 'undefined') return
  if (globalRecords.length === 0 && globalViewportElement == null) return
  const viewportElement = ensureGlobalViewport()
  if (!viewportElement) return
  render(
    <NotificationViewport
      records={globalRecords}
      onDestroy={destroyGlobalNotifications}
      {...globalOptions}
    />,
    viewportElement,
  )
}

/** open Global Notification 的内部工具函数。 */
const openGlobalNotification = (config: NotificationArgsProps) => {
  const nextKey = config.key ?? `rue-notification-${notificationSeed++}`
  const nextRecord: NotificationRecord = { key: nextKey, config: { ...config, key: nextKey } }
  const currentIndex = globalRecords.findIndex(record => record.key === nextKey)
  let next =
    currentIndex === -1
      ? [...globalRecords, nextRecord]
      : [
          ...globalRecords.slice(0, currentIndex),
          nextRecord,
          ...globalRecords.slice(currentIndex + 1),
        ]
  next = trimRecords(next, globalOptions.maxCount)
  globalRecords = next
  syncGlobalViewport()
  return () => destroyGlobalNotifications(nextKey)
}

/** config Global Notification 的内部工具函数。 */
const configGlobalNotification = (options: NotificationGlobalConfig) => {
  globalOptions = { ...globalOptions, ...options }
  syncGlobalViewport()
}

type NotificationCompound = FC<NotificationProps> & {
  Item: FC<NotificationItemProps>
  useNotification: (options?: NotificationUseOptions) => readonly [NotificationInstance, any]
  open: NotificationInstance['open']
  success: NotificationInstance['success']
  info: NotificationInstance['info']
  warning: NotificationInstance['warning']
  error: NotificationInstance['error']
  destroy: NotificationInstance['destroy']
  config: (options: NotificationGlobalConfig) => void
}

const NotificationCompound: NotificationCompound = /*#__PURE__*/ Object.assign(NotificationRoot, {
  Item: NotificationItem,
  useNotification,
  open: openGlobalNotification,
  success: (config: Omit<NotificationArgsProps, 'type'>) =>
    openGlobalNotification({ ...config, type: 'success' }),
  info: (config: Omit<NotificationArgsProps, 'type'>) =>
    openGlobalNotification({ ...config, type: 'info' }),
  warning: (config: Omit<NotificationArgsProps, 'type'>) =>
    openGlobalNotification({ ...config, type: 'warning' }),
  error: (config: Omit<NotificationArgsProps, 'type'>) =>
    openGlobalNotification({ ...config, type: 'error' }),
  destroy: destroyGlobalNotifications,
  config: configGlobalNotification,
})

/** 默认导出通知提醒组件。 */
export default NotificationCompound
