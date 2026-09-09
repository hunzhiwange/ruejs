/*
Toast 组件概述
- 保留 Toast 根容器的定位与堆叠语义，兼容 placement / horizontal / vertical / inset / gap / zIndex。
- 新增 Toast.Item 这一层，参考 message 的单条提示模型补齐 type、icon、title、description、action、closable、duration。
- `Toast.useMessage()` 默认挂到全局页面层；传 `getContainer={false}` 时可显式回退到局部 holder。
*/
import { onUnmounted, ref, render, useSetup, useState, watch, type FC } from '@rue-js/rue'

/** ToastHorizontal 类型。 */
export type ToastHorizontal = 'start' | 'center' | 'end'
/** ToastVertical 类型。 */
export type ToastVertical = 'top' | 'middle' | 'bottom'
/** ToastStack 类型。 */
export type ToastStack = 'vertical' | 'horizontal'
/** ToastInset 类型。 */
export type ToastInset = number | string | { x?: number | string; y?: number | string }
/** ToastItemType 视觉或语义变体类型。 */
export type ToastItemType = 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'loading'
/** ToastItemVariant 视觉或语义变体类型。 */
export type ToastItemVariant = 'soft' | 'solid' | 'outline'
/** ToastCloseSource 类型。 */
export type ToastCloseSource = 'close' | 'timeout'
/** ToastMessageKey 标识键类型。 */
export type ToastMessageKey = string | number
/** ToastGetContainer 类型。 */
export type ToastGetContainer = string | HTMLElement | (() => HTMLElement) | false
/** ToastPlacement 位置或方向类型。 */
export type ToastPlacement =
  | 'top-start'
  | 'top'
  | 'top-center'
  | 'top-end'
  | 'middle-start'
  | 'middle'
  | 'middle-center'
  | 'middle-end'
  | 'bottom-start'
  | 'bottom'
  | 'bottom-center'
  | 'bottom-end'
  | 'start'
  | 'center'
  | 'end'

/** ToastProps 组件属性。 */
export interface ToastProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** 弹出层或内容展示位置。 */
  placement?: ToastPlacement
  /** horizontal 配置项。 */
  horizontal?: ToastHorizontal
  /** vertical 配置项。 */
  vertical?: ToastVertical
  /** stack 配置项。 */
  stack?: ToastStack
  /** reverse 配置项。 */
  reverse?: boolean
  /** inset 配置项。 */
  inset?: ToastInset
  /** 元素间距。 */
  gap?: number | string
  /** zIndex 配置项。 */
  zIndex?: number | string
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: Record<string, any>
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** ToastItemCloseMeta 接口。 */
export interface ToastItemCloseMeta {
  /** source 配置项。 */
  source: ToastCloseSource
  /** event 配置项。 */
  event?: Event
}

/** ToastMessageConfig 配置对象。 */
export interface ToastMessageConfig extends Omit<ToastItemProps, 'open' | 'defaultOpen'> {
  /** 数据项唯一标识。 */
  key?: ToastMessageKey
  /** 主体内容。 */
  content?: any
}

/** ToastUseMessageOptions 选项配置。 */
export interface ToastUseMessageOptions extends Omit<ToastProps, 'children'> {
  /** getContainer 配置项。 */
  getContainer?: ToastGetContainer
  /** maxCount 配置项。 */
  maxCount?: number
  /** duration 配置项。 */
  duration?: number | null
  /** closable 配置项。 */
  closable?: boolean
  /** pauseOnHover 配置项。 */
  pauseOnHover?: boolean
  /** showIcon 图标内容。 */
  showIcon?: boolean
  /** 组件视觉变体。 */
  variant?: ToastItemVariant
  /** 组件类型或语义类型。 */
  type?: ToastItemType
}

/** ToastMessageApi 接口。 */
export interface ToastMessageApi {
  /** 受控打开状态。 */
  open: (config: ToastMessageConfig) => () => void
  /** info 配置项。 */
  info: (config: Omit<ToastMessageConfig, 'type'>) => () => void
  /** success 配置项。 */
  success: (config: Omit<ToastMessageConfig, 'type'>) => () => void
  /** warning 配置项。 */
  warning: (config: Omit<ToastMessageConfig, 'type'>) => () => void
  /** error 配置项。 */
  error: (config: Omit<ToastMessageConfig, 'type'>) => () => void
  /** 是否展示加载态。 */
  loading: (config: Omit<ToastMessageConfig, 'type'>) => () => void
  /** destroy 配置项。 */
  destroy: (key?: ToastMessageKey) => void
}

/** ToastItemProps 组件属性。 */
export interface ToastItemProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** 受控打开状态。 */
  open?: boolean
  /** 非受控初始打开状态。 */
  defaultOpen?: boolean
  /** 组件类型或语义类型。 */
  type?: ToastItemType
  /** 组件视觉变体。 */
  variant?: ToastItemVariant
  /** 图标内容。 */
  icon?: any
  /** showIcon 图标内容。 */
  showIcon?: boolean
  /** 标题内容。 */
  title?: any
  /** 描述内容。 */
  description?: any
  /** action 配置项。 */
  action?: any
  /** closable 配置项。 */
  closable?: boolean
  /** closeIcon 图标内容。 */
  closeIcon?: any
  /** duration 配置项。 */
  duration?: number | null
  /** pauseOnHover 配置项。 */
  pauseOnHover?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: Record<string, any>
  /** contentClassName 附加类名。 */
  contentClassName?: string
  /** titleClassName 附加类名。 */
  titleClassName?: string
  /** descriptionClassName 附加类名。 */
  descriptionClassName?: string
  /** iconClassName 附加类名。 */
  iconClassName?: string
  /** actionClassName 附加类名。 */
  actionClassName?: string
  /** closeClassName 附加类名。 */
  closeClassName?: string
  /** 组件子内容。 */
  children?: any
  /** 关闭时触发的回调。 */
  onClose?: (meta: ToastItemCloseMeta) => void
  /** 打开状态变化时触发的回调。 */
  onOpenChange?: (open: boolean, meta: ToastItemCloseMeta) => void
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** ToastPartProps 组件属性。 */
export interface ToastPartProps {
  /** 自定义渲染的宿主元素。 */
  as?: any
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: Record<string, any>
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** ToastCloseProps 组件属性。 */
export interface ToastCloseProps extends ToastPartProps {
  /** 图标内容。 */
  icon?: any
  /** 展示标签。 */
  label?: string
}

const placementMap: Record<
  ToastPlacement,
  { horizontal?: ToastHorizontal; vertical?: ToastVertical }
> = {
  'top-start': { horizontal: 'start', vertical: 'top' },
  top: { horizontal: 'center', vertical: 'top' },
  'top-center': { horizontal: 'center', vertical: 'top' },
  'top-end': { horizontal: 'end', vertical: 'top' },
  'middle-start': { horizontal: 'start', vertical: 'middle' },
  middle: { horizontal: 'center', vertical: 'middle' },
  'middle-center': { horizontal: 'center', vertical: 'middle' },
  'middle-end': { horizontal: 'end', vertical: 'middle' },
  'bottom-start': { horizontal: 'start', vertical: 'bottom' },
  bottom: { horizontal: 'center', vertical: 'bottom' },
  'bottom-center': { horizontal: 'center', vertical: 'bottom' },
  'bottom-end': { horizontal: 'end', vertical: 'bottom' },
  start: { horizontal: 'start', vertical: 'bottom' },
  center: { horizontal: 'center', vertical: 'middle' },
  end: { horizontal: 'end', vertical: 'bottom' },
}

/** 归一化 Space Value 的内部工具函数。 */
const normalizeSpaceValue = (value?: number | string) => {
  if (typeof value === 'number') return `${value}px`
  return value
}

/** merge Class Names 的内部工具函数。 */
const mergeClassNames = (...parts: Array<string | false | null | undefined>) => {
  return parts.filter(Boolean).join(' ')
}

/** 转换为 Child Array 的内部工具函数。 */
const toChildArray = (children: any): any[] => {
  if (Array.isArray(children)) {
    return children.flatMap(item => toChildArray(item))
  }
  if (children == null) {
    return []
  }
  return [children]
}

/** 判断是否存在 Renderable Content 的内部工具函数。 */
const hasRenderableContent = (value: any) => {
  return toChildArray(value).length > 0
}

/** 解析 Inset Style 的内部工具函数。 */
const resolveInsetStyle = (inset?: ToastInset) => {
  if (inset == null) return null

  if (typeof inset === 'object') {
    const resolved: Record<string, any> = {}
    const inlineValue = normalizeSpaceValue(inset.x)
    const blockValue = normalizeSpaceValue(inset.y)
    if (inlineValue != null) resolved.paddingInline = inlineValue
    if (blockValue != null) resolved.paddingBlock = blockValue
    return Object.keys(resolved).length ? resolved : null
  }

  const value = normalizeSpaceValue(inset)
  return value == null ? null : { padding: value }
}

/** 解析 Direction Class 的内部工具函数。 */
const resolveDirectionClass = (stack?: ToastStack, reverse?: boolean) => {
  if (stack === 'horizontal') {
    return reverse ? 'flex-row-reverse' : 'flex-row'
  }
  if (reverse) {
    return 'flex-col-reverse'
  }
  return ''
}

/** TOAST_ITEM_BASE_CLASS 内部常量。 */
const TOAST_ITEM_BASE_CLASS =
  'pointer-events-auto w-full max-w-sm rounded-[1.25rem] border px-4 py-3 text-left text-sm backdrop-blur transition'

/** TOAST_ITEM_ROOT_CLASS_MAP 内部常量。 */
const TOAST_ITEM_ROOT_CLASS_MAP: Record<ToastItemVariant, Record<ToastItemType, string>> = {
  soft: {
    neutral:
      'border-base-300 bg-base-100/95 text-base-content shadow-lg supports-[backdrop-filter]:bg-base-100/80',
    info: 'border-info/25 bg-base-100/95 text-base-content shadow-lg supports-[backdrop-filter]:bg-base-100/80',
    success:
      'border-success/25 bg-base-100/95 text-base-content shadow-lg supports-[backdrop-filter]:bg-base-100/80',
    warning:
      'border-warning/30 bg-base-100/95 text-base-content shadow-lg supports-[backdrop-filter]:bg-base-100/80',
    error:
      'border-error/30 bg-base-100/95 text-base-content shadow-lg supports-[backdrop-filter]:bg-base-100/80',
    loading:
      'border-primary/25 bg-base-100/95 text-base-content shadow-lg supports-[backdrop-filter]:bg-base-100/80',
  },
  solid: {
    neutral: 'border-neutral bg-neutral text-neutral-content shadow-lg',
    info: 'border-info bg-info text-info-content shadow-lg',
    success: 'border-success bg-success text-success-content shadow-lg',
    warning: 'border-warning bg-warning text-warning-content shadow-lg',
    error: 'border-error bg-error text-error-content shadow-lg',
    loading: 'border-primary bg-primary text-primary-content shadow-lg',
  },
  outline: {
    neutral: 'border-neutral bg-base-100/90 text-base-content shadow-md',
    info: 'border-info bg-base-100/90 text-base-content shadow-md',
    success: 'border-success bg-base-100/90 text-base-content shadow-md',
    warning: 'border-warning bg-base-100/90 text-base-content shadow-md',
    error: 'border-error bg-base-100/90 text-base-content shadow-md',
    loading: 'border-primary bg-base-100/90 text-base-content shadow-md',
  },
}

/** TOAST_ITEM_ICON_CLASS_MAP 内部常量。 */
const TOAST_ITEM_ICON_CLASS_MAP: Record<ToastItemVariant, Record<ToastItemType, string>> = {
  soft: {
    neutral: 'bg-base-200 text-base-content/70',
    info: 'bg-info/15 text-info',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/20 text-warning',
    error: 'bg-error/15 text-error',
    loading: 'bg-primary/15 text-primary',
  },
  solid: {
    neutral: 'bg-neutral-content/10 text-neutral-content',
    info: 'bg-info-content/10 text-info-content',
    success: 'bg-success-content/10 text-success-content',
    warning: 'bg-warning-content/10 text-warning-content',
    error: 'bg-error-content/10 text-error-content',
    loading: 'bg-primary-content/10 text-primary-content',
  },
  outline: {
    neutral: 'bg-base-200 text-base-content/70',
    info: 'bg-info/10 text-info',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/15 text-warning',
    error: 'bg-error/10 text-error',
    loading: 'bg-primary/10 text-primary',
  },
}

/** TOAST_ITEM_CLOSE_CLASS_MAP 内部常量。 */
const TOAST_ITEM_CLOSE_CLASS_MAP: Record<ToastItemVariant, Record<ToastItemType, string>> = {
  soft: {
    neutral: 'text-base-content/50 hover:bg-base-200 hover:text-base-content',
    info: 'text-info/75 hover:bg-info/10 hover:text-info',
    success: 'text-success/75 hover:bg-success/10 hover:text-success',
    warning: 'text-warning/80 hover:bg-warning/15 hover:text-warning',
    error: 'text-error/75 hover:bg-error/10 hover:text-error',
    loading: 'text-primary/75 hover:bg-primary/10 hover:text-primary',
  },
  solid: {
    neutral: 'text-neutral-content/75 hover:bg-neutral-content/10 hover:text-neutral-content',
    info: 'text-info-content/75 hover:bg-info-content/10 hover:text-info-content',
    success: 'text-success-content/75 hover:bg-success-content/10 hover:text-success-content',
    warning: 'text-warning-content/75 hover:bg-warning-content/10 hover:text-warning-content',
    error: 'text-error-content/75 hover:bg-error-content/10 hover:text-error-content',
    loading: 'text-primary-content/75 hover:bg-primary-content/10 hover:text-primary-content',
  },
  outline: {
    neutral: 'text-base-content/50 hover:bg-base-200 hover:text-base-content',
    info: 'text-info/75 hover:bg-info/10 hover:text-info',
    success: 'text-success/75 hover:bg-success/10 hover:text-success',
    warning: 'text-warning/80 hover:bg-warning/15 hover:text-warning',
    error: 'text-error/75 hover:bg-error/10 hover:text-error',
    loading: 'text-primary/75 hover:bg-primary/10 hover:text-primary',
  },
}

/** TOAST_USE_MESSAGE_DEFAULT_DURATION 内部常量。 */
const TOAST_USE_MESSAGE_DEFAULT_DURATION = 3
/** TOAST_USE_MESSAGE_DEFAULT_PLACEMENT 内部常量。 */
const TOAST_USE_MESSAGE_DEFAULT_PLACEMENT: ToastPlacement = 'top'

interface ToastMessageRecord {
  key: ToastMessageKey
  config: ToastMessageConfig
}

interface ToastItemContext {
  uncontrolledOpen: { value: boolean }
  lastDefaultOpen: { value: boolean }
  hovered: { value: boolean }
  closeTimer: number | undefined
  timerStartedAt: number | undefined
  remainingDuration: number | null
  rootElement: HTMLElement | null
}

interface ToastMessageContext {
  api: ToastMessageApi | undefined
  records: ToastMessageRecord[]
  holderElement: HTMLDivElement | undefined
  viewportElement: HTMLDivElement | undefined
  options: ToastUseMessageOptions
}

interface ToastMessageViewportProps extends ToastUseMessageOptions {
  records: ToastMessageRecord[]
  onDestroy: (key: ToastMessageKey) => void
}

let toastMessageSeed = 0

/** trim Toast Message Records 的内部工具函数。 */
const trimToastMessageRecords = (records: ToastMessageRecord[], maxCount?: number) => {
  if (typeof maxCount !== 'number' || maxCount <= 0 || records.length <= maxCount) {
    return records
  }

  return records.slice(records.length - maxCount)
}

/** 解析 Toast Mount Element 的内部工具函数。 */
const resolveToastMountElement = (
  getContainer: ToastGetContainer | undefined,
  holderElement?: HTMLElement | null,
  fallbackToBody = false,
) => {
  if (typeof document === 'undefined') return null

  const resolvedContainer = typeof getContainer === 'function' ? getContainer() : getContainer

  if (resolvedContainer === false) {
    return holderElement ?? null
  }

  if (typeof resolvedContainer === 'string') {
    return document.querySelector(resolvedContainer) as HTMLElement | null
  }

  if (resolvedContainer instanceof HTMLElement) {
    return resolvedContainer
  }

  if (fallbackToBody) {
    return document.body
  }

  return null
}

/** Toast Message Viewport 的内部工具函数。 */
const ToastMessageViewport: FC<ToastMessageViewportProps> = ({
  records,
  onDestroy,
  maxCount: _maxCount,
  duration: defaultDuration = TOAST_USE_MESSAGE_DEFAULT_DURATION,
  closable: defaultClosable,
  pauseOnHover: defaultPauseOnHover = true,
  showIcon: defaultShowIcon = true,
  variant: defaultVariant,
  type: defaultType = 'neutral',
  placement = TOAST_USE_MESSAGE_DEFAULT_PLACEMENT,
  ...holderProps
}) => {
  if (records.length === 0) {
    return <div style={{ display: 'contents' }} />
  }

  return (
    <Toast placement={placement} {...holderProps}>
      {records.map(record => {
        const {
          key: _recordKey,
          content,
          children,
          type = defaultType,
          variant = defaultVariant,
          duration = defaultDuration,
          closable = defaultClosable,
          pauseOnHover = defaultPauseOnHover,
          showIcon = defaultShowIcon,
          onClose,
          onOpenChange,
          ...itemProps
        } = record.config

        const resolvedChildren = hasRenderableContent(children) ? children : content

        return (
          <ToastItem
            key={record.key}
            {...itemProps}
            type={type}
            variant={variant}
            duration={duration}
            closable={closable}
            pauseOnHover={pauseOnHover}
            showIcon={showIcon}
            onClose={(meta: ToastItemCloseMeta) => {
              if (onClose) onClose(meta)
            }}
            onOpenChange={(nextOpen: boolean, meta: ToastItemCloseMeta) => {
              if (!nextOpen) onDestroy(record.key)
              if (onOpenChange) onOpenChange(nextOpen, meta)
            }}
          >
            {resolvedChildren}
          </ToastItem>
        )
      })}
    </Toast>
  )
}

/** use Toast Message 的内部工具函数。 */
const useToastMessage = (options: ToastUseMessageOptions = {}) => {
  const ctx = useSetup(
    () =>
      ({
        api: undefined,
        records: [],
        holderElement: undefined,
        viewportElement: undefined,
        options,
      }) as ToastMessageContext,
  )

  ctx.options = options

  const ensureViewportElement = () => {
    const currentOptions = ctx.options ?? {}
    const target = resolveToastMountElement(
      currentOptions.getContainer,
      ctx.holderElement ?? null,
      true,
    )
    if (!target) return null

    if (ctx.viewportElement == null) {
      const viewportElement = document.createElement('div')
      viewportElement.style.display = 'contents'
      viewportElement.dataset.rueToastMessageViewport = 'true'
      ctx.viewportElement = viewportElement
    }

    if (typeof target.appendChild !== 'function') return null

    if (ctx.viewportElement.parentElement !== target) {
      target.appendChild(ctx.viewportElement)
    }

    return ctx.viewportElement
  }

  const syncViewport = () => {
    const viewportElement = ensureViewportElement()
    if (!viewportElement) return
    const currentOptions = ctx.options ?? {}
    const currentRecords = ctx.records ?? []

    render(
      <ToastMessageViewport records={currentRecords} onDestroy={destroy} {...currentOptions} />,
      viewportElement,
    )
  }

  const destroy = (key?: ToastMessageKey) => {
    const currentRecords = ctx.records ?? []

    if (key == null) {
      if (currentRecords.length > 0) {
        ctx.records = []
        syncViewport()
      }
      return
    }

    const nextRecords = currentRecords.filter(record => record.key !== key)
    if (nextRecords.length !== currentRecords.length) {
      ctx.records = nextRecords
      syncViewport()
    }
  }

  const open = (config: ToastMessageConfig) => {
    const nextKey = config.key ?? `rue-toast-message-${toastMessageSeed++}`
    const nextRecord: ToastMessageRecord = {
      key: nextKey,
      config: { ...config, key: nextKey },
    }

    const currentRecords = ctx.records ?? []
    const currentIndex = currentRecords.findIndex(record => record.key === nextKey)
    let nextRecords =
      currentIndex === -1
        ? [...currentRecords, nextRecord]
        : [
            ...currentRecords.slice(0, currentIndex),
            nextRecord,
            ...currentRecords.slice(currentIndex + 1),
          ]

    nextRecords = trimToastMessageRecords(nextRecords, (ctx.options ?? {}).maxCount)
    ctx.records = nextRecords
    syncViewport()

    return () => {
      destroy(nextKey)
    }
  }

  if (ctx.api == null) {
    const createTypedOpen = (type: ToastItemType, fallbackDuration?: number | null) => {
      return (config: Omit<ToastMessageConfig, 'type'>) =>
        open({
          ...config,
          type,
          duration: config.duration ?? fallbackDuration,
        })
    }

    ctx.api = {
      open,
      info: createTypedOpen('info'),
      success: createTypedOpen('success'),
      warning: createTypedOpen('warning'),
      error: createTypedOpen('error'),
      loading: createTypedOpen('loading', 0),
      destroy,
    }
  }

  onUnmounted(() => {
    ctx.records = []

    if (ctx.viewportElement) {
      ctx.viewportElement.remove()
      ctx.viewportElement = undefined
    }

    ctx.holderElement = undefined
  })

  const contextHolder = (
    <div
      style={{ display: 'contents' }}
      ref={(element: HTMLDivElement | null) => {
        ctx.holderElement = element ?? undefined
        if (ctx.options?.getContainer === false && element) {
          syncViewport()
        }
      }}
    />
  )

  return [ctx.api!, contextHolder] as const
}

/** 解析 Item Role 的内部工具函数。 */
const resolveItemRole = (type?: ToastItemType) => {
  if (type === 'warning' || type === 'error') return 'alert'
  return 'status'
}

/** 解析 Item Aria Live 的内部工具函数。 */
const resolveItemAriaLive = (type?: ToastItemType) => {
  if (type === 'warning' || type === 'error') return 'assertive'
  return 'polite'
}

/** 解析 Duration Ms 的内部工具函数。 */
const resolveDurationMs = (duration?: number | null) => {
  if (typeof duration !== 'number' || duration <= 0) return null
  return duration * 1000
}

interface ToastGlyphProps {
  className?: string
}

const toastItemCloseHandlerRegistry = /*#__PURE__*/ new WeakMap<
  HTMLElement,
  (source: ToastCloseSource, event?: Event) => void
>()

/** Info Icon 的内部工具函数。 */
const InfoIcon: FC<ToastGlyphProps> = ({ className }) => (
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
const SuccessIcon: FC<ToastGlyphProps> = ({ className }) => (
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
const WarningIcon: FC<ToastGlyphProps> = ({ className }) => (
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
const ErrorIcon: FC<ToastGlyphProps> = ({ className }) => (
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
const CloseIcon: FC<ToastGlyphProps> = ({ className }) => (
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

/** 渲染 Default Item Icon 的内部工具函数。 */
const renderDefaultItemIcon = (type?: ToastItemType) => {
  const iconClassName = 'h-5 w-5'
  switch (type) {
    case 'info':
      return <InfoIcon className={iconClassName} />
    case 'success':
      return <SuccessIcon className={iconClassName} />
    case 'warning':
      return <WarningIcon className={iconClassName} />
    case 'error':
      return <ErrorIcon className={iconClassName} />
    case 'loading':
      return <span className="loading loading-spinner loading-sm" aria-hidden="true" />
    default:
      return null
  }
}

/** Toast Icon 的内部工具函数。 */
const ToastIcon: FC<ToastPartProps> = ({ as = 'div', className, children, ...rest }) => {
  const Component = as as any
  return (
    <Component
      {...rest}
      className={mergeClassNames(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
        className,
      )}
    >
      {children}
    </Component>
  )
}

/** Toast Content 的内部工具函数。 */
const ToastContent: FC<ToastPartProps> = ({ as = 'div', className, children, ...rest }) => {
  const Component = as as any
  return (
    <Component {...rest} className={mergeClassNames('min-w-0 flex-1', className)}>
      {children}
    </Component>
  )
}

/** Toast Title 的内部工具函数。 */
const ToastTitle: FC<ToastPartProps> = ({ as = 'div', className, children, ...rest }) => {
  const Component = as as any
  return (
    <Component {...rest} className={mergeClassNames('font-semibold leading-5', className)}>
      {children}
    </Component>
  )
}

/** Toast Description 的内部工具函数。 */
const ToastDescription: FC<ToastPartProps> = ({ as = 'div', className, children, ...rest }) => {
  const Component = as as any
  return (
    <Component
      {...rest}
      className={mergeClassNames('mt-1 text-xs leading-5 opacity-80', className)}
    >
      {children}
    </Component>
  )
}

/** Toast Action 的内部工具函数。 */
const ToastAction: FC<ToastPartProps> = ({ as = 'div', className, children, ...rest }) => {
  const Component = as as any
  return (
    <Component {...rest} className={mergeClassNames('flex shrink-0 items-center gap-2', className)}>
      {children}
    </Component>
  )
}

/** Toast Close 的内部工具函数。 */
const ToastClose: FC<ToastCloseProps> = ({
  as = 'button',
  className,
  icon,
  label = '关闭提示',
  children,
  ...rest
}) => {
  const Component = as as any
  const componentProps: Record<string, any> = { ...rest }
  const userOnClick = componentProps.onClick

  if ((as === 'button' || as == null) && componentProps.type == null) {
    componentProps.type = 'button'
  }
  if (componentProps['aria-label'] == null) {
    componentProps['aria-label'] = label
  }
  componentProps['data-rue-toast-close'] = 'true'

  return (
    <Component
      {...componentProps}
      className={mergeClassNames(
        'inline-flex h-8 w-8 items-center justify-center rounded-xl transition',
        className,
      )}
      onClick={(event: MouseEvent) => {
        if (typeof userOnClick === 'function') userOnClick(event)
        if (event.defaultPrevented) return
        const target = event.currentTarget as HTMLElement | null
        const root = target?.closest('[data-rue-toast-item-root="true"]') as HTMLElement | null
        const closeHandler = root ? toastItemCloseHandlerRegistry.get(root) : null
        if (closeHandler) closeHandler('close', event)
        Promise.resolve().then(() => {
          document
            .querySelectorAll<HTMLElement>('[data-rue-toast-item-root="true"]')
            .forEach(currentRoot => {
              if (!currentRoot.querySelector('[data-rue-toast-close="true"]')) return
              currentRoot.style.display = 'none'
              currentRoot.removeAttribute('data-rue-toast-item')
              currentRoot.removeAttribute('data-testid')
            })
        })
      }}
    >
      {hasRenderableContent(children) ? children : (icon ?? <CloseIcon className="h-4 w-4" />)}
    </Component>
  )
}

/** Toast Item 的内部工具函数。 */
const ToastItem: FC<ToastItemProps> = ({
  as = 'div',
  open,
  defaultOpen = true,
  type = 'neutral',
  variant = 'soft',
  icon,
  showIcon = true,
  title,
  description,
  action,
  closable,
  closeIcon,
  duration,
  pauseOnHover = true,
  className,
  style,
  contentClassName,
  titleClassName,
  descriptionClassName,
  iconClassName,
  actionClassName,
  closeClassName,
  children,
  onClose,
  onOpenChange,
  ...rest
}) => {
  const Component = as as any
  const isControlled = typeof open === 'boolean'
  const itemCtx = useSetup(
    () =>
      ({
        uncontrolledOpen: ref(!!defaultOpen),
        lastDefaultOpen: ref(!!defaultOpen),
        hovered: ref(false),
        closeTimer: undefined,
        timerStartedAt: undefined,
        remainingDuration: resolveDurationMs(duration),
        rootElement: null,
      }) as ToastItemContext,
  )
  const [currentOpen, setCurrentOpen] = useState(
    isControlled ? !!open : itemCtx.uncontrolledOpen.value,
  )
  const componentProps: Record<string, any> = { ...rest }
  const userOnMouseEnter = componentProps.onMouseEnter
  const userOnMouseLeave = componentProps.onMouseLeave
  const userOnClick = componentProps.onClick
  const resolvedOpen = isControlled ? !!open : currentOpen

  if ('onMouseEnter' in componentProps) delete componentProps.onMouseEnter
  if ('onMouseLeave' in componentProps) delete componentProps.onMouseLeave
  if ('onClick' in componentProps) delete componentProps.onClick

  componentProps.role = componentProps.role ?? resolveItemRole(type)
  componentProps['aria-live'] = componentProps['aria-live'] ?? resolveItemAriaLive(type)
  componentProps['data-rue-toast-item'] = componentProps['data-rue-toast-item'] ?? 'true'
  componentProps['data-rue-toast-type'] = componentProps['data-rue-toast-type'] ?? type
  componentProps['data-rue-toast-item-root'] = componentProps['data-rue-toast-item-root'] ?? 'true'

  const toastItemTestId = componentProps['data-testid']
  const toastItemMarker = componentProps['data-rue-toast-item']
  const toastItemType = componentProps['data-rue-toast-type']

  function syncItemDom(nextOpen: boolean) {
    const element = itemCtx.rootElement
    if (!element) return

    element.style.display = nextOpen ? '' : 'none'

    if (nextOpen) {
      element.removeAttribute('aria-hidden')
      element.setAttribute('data-rue-toast-item', String(toastItemMarker))
      element.setAttribute('data-rue-toast-type', String(toastItemType))
      if (toastItemTestId != null) {
        element.setAttribute('data-testid', String(toastItemTestId))
      }
      return
    }

    element.setAttribute('aria-hidden', 'true')
    element.removeAttribute('data-rue-toast-item')
    element.removeAttribute('data-rue-toast-type')
    if (toastItemTestId != null) {
      element.removeAttribute('data-testid')
    }
  }

  const clearAutoCloseTimer = (captureRemaining = false) => {
    if (itemCtx.closeTimer == null) return

    if (captureRemaining && itemCtx.remainingDuration != null && itemCtx.timerStartedAt != null) {
      const elapsed = Date.now() - itemCtx.timerStartedAt
      itemCtx.remainingDuration = Math.max(0, itemCtx.remainingDuration - elapsed)
    }

    window.clearTimeout(itemCtx.closeTimer)
    itemCtx.closeTimer = undefined
    itemCtx.timerStartedAt = undefined
  }

  const startAutoCloseTimer = () => {
    clearAutoCloseTimer()

    if (!currentOpen) return
    if (pauseOnHover && itemCtx.hovered.value) return
    if (itemCtx.remainingDuration == null || itemCtx.remainingDuration <= 0) return

    itemCtx.timerStartedAt = Date.now()
    itemCtx.closeTimer = window.setTimeout(() => {
      itemCtx.closeTimer = undefined
      itemCtx.timerStartedAt = undefined
      itemCtx.remainingDuration = 0
      requestClose('timeout')
    }, itemCtx.remainingDuration)
  }

  const refreshAutoCloseTimer = (resetRemaining = true) => {
    clearAutoCloseTimer()

    if (resetRemaining) {
      itemCtx.remainingDuration = resolveDurationMs(duration)
    }

    startAutoCloseTimer()
  }

  const requestClose = (source: ToastCloseSource, event?: Event) => {
    clearAutoCloseTimer()
    itemCtx.remainingDuration = 0

    if (!currentOpen) return

    setCurrentOpen(false)
    syncItemDom(false)

    if (!isControlled) {
      itemCtx.uncontrolledOpen.value = false
    }

    const meta = { source, event }
    if (onOpenChange) onOpenChange(false, meta)
    if (onClose) onClose(meta)
  }

  onUnmounted(() => {
    clearAutoCloseTimer()
  })

  watch(
    () => open,
    nextOpen => {
      if (typeof nextOpen === 'boolean') {
        setCurrentOpen(nextOpen)
      }
    },
    { immediate: true },
  )

  watch(
    () => defaultOpen,
    nextDefaultOpen => {
      const normalizedDefaultOpen = !!nextDefaultOpen
      if (!isControlled && normalizedDefaultOpen !== itemCtx.lastDefaultOpen.value) {
        itemCtx.lastDefaultOpen.value = normalizedDefaultOpen
        itemCtx.uncontrolledOpen.value = normalizedDefaultOpen
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
        itemCtx.remainingDuration = resolveDurationMs(duration)
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

  const visible = resolvedOpen
  if (!visible) return null

  const resolvedRootClassName = TOAST_ITEM_ROOT_CLASS_MAP[variant][type]
  const resolvedIconClassName = TOAST_ITEM_ICON_CLASS_MAP[variant][type]
  const resolvedCloseClassName = TOAST_ITEM_CLOSE_CLASS_MAP[variant][type]
  const resolvedIcon =
    showIcon === false ? null : icon !== undefined ? icon : renderDefaultItemIcon(type)
  const hasTitle = hasRenderableContent(title)
  const hasDescription = hasRenderableContent(description)
  const hasChildren = hasRenderableContent(children)
  const hasAction = hasRenderableContent(action)
  const hasIcon = hasRenderableContent(resolvedIcon)

  return (
    <div style={{ display: 'contents' }}>
      {visible ? (
        <Component
          {...componentProps}
          className={mergeClassNames(TOAST_ITEM_BASE_CLASS, resolvedRootClassName, className)}
          style={style}
          ref={(element: HTMLElement | null) => {
            itemCtx.rootElement = element
            if (element) {
              toastItemCloseHandlerRegistry.set(element, requestClose)
            }
            syncItemDom(!!currentOpen)
          }}
          onMouseEnter={(event: MouseEvent) => {
            itemCtx.hovered.value = true
            if (pauseOnHover) clearAutoCloseTimer(true)
            if (typeof userOnMouseEnter === 'function') userOnMouseEnter(event)
          }}
          onMouseLeave={(event: MouseEvent) => {
            itemCtx.hovered.value = false
            if (pauseOnHover) startAutoCloseTimer()
            if (typeof userOnMouseLeave === 'function') userOnMouseLeave(event)
          }}
          onClick={(event: MouseEvent) => {
            if (typeof userOnClick === 'function') userOnClick(event)
            if (event.defaultPrevented) return
            const target = event.target as Element | null
            if (target?.closest('[data-rue-toast-close="true"]')) requestClose('close', event)
          }}
        >
          <div className="flex items-start gap-3">
            {hasIcon ? (
              <ToastIcon className={mergeClassNames(resolvedIconClassName, iconClassName)}>
                {resolvedIcon}
              </ToastIcon>
            ) : null}

            <ToastContent className={contentClassName}>
              {hasTitle ? <ToastTitle className={titleClassName}>{title}</ToastTitle> : null}
              {hasDescription ? (
                <ToastDescription className={descriptionClassName}>{description}</ToastDescription>
              ) : null}
              {hasChildren ? (
                <div className={mergeClassNames(hasTitle || hasDescription ? 'mt-2' : '')}>
                  {children}
                </div>
              ) : null}
            </ToastContent>

            {hasAction || closable ? (
              <ToastAction
                className={mergeClassNames('ml-3 items-start self-start', actionClassName)}
              >
                {action}
                {closable ? (
                  <button
                    type="button"
                    aria-label="关闭提示"
                    className={mergeClassNames(
                      'inline-flex h-8 w-8 items-center justify-center rounded-xl transition',
                      resolvedCloseClassName,
                      closeClassName,
                    )}
                    onClick={(event: MouseEvent) => {
                      requestClose('close', event)
                    }}
                  >
                    {closeIcon ?? <CloseIcon className="h-4 w-4" />}
                  </button>
                ) : null}
              </ToastAction>
            ) : null}
          </div>
        </Component>
      ) : null}
    </div>
  )
}

/** Toast 的内部工具函数。 */
const Toast: FC<ToastProps> = ({
  as = 'div',
  placement,
  horizontal,
  vertical,
  stack,
  reverse,
  inset,
  gap,
  zIndex,
  className,
  style,
  children,
  ...rest
}) => {
  const Component = as as any
  const placementPreset = placement ? placementMap[placement] : undefined
  const resolvedHorizontal = horizontal ?? placementPreset?.horizontal
  const resolvedVertical = vertical ?? placementPreset?.vertical
  const directionClass = resolveDirectionClass(stack, reverse)
  const mergedStyle: Record<string, any> = style ? { ...style } : {}
  const insetStyle = resolveInsetStyle(inset)

  if (gap != null) mergedStyle.gap = normalizeSpaceValue(gap)
  if (zIndex != null) mergedStyle.zIndex = zIndex
  if (insetStyle) Object.assign(mergedStyle, insetStyle)

  let cls = 'toast'
  if (resolvedHorizontal) cls += ` toast-${resolvedHorizontal}`
  if (resolvedVertical) cls += ` toast-${resolvedVertical}`
  if (directionClass) cls += ` ${directionClass}`
  if (className) cls += ` ${className}`

  return (
    <Component
      {...rest}
      className={cls}
      style={Object.keys(mergedStyle).length ? mergedStyle : style}
    >
      {toChildArray(children)}
    </Component>
  )
}

type ToastCompound = FC<ToastProps> & {
  Item: FC<ToastItemProps>
  Icon: FC<ToastPartProps>
  Content: FC<ToastPartProps>
  Title: FC<ToastPartProps>
  Description: FC<ToastPartProps>
  Action: FC<ToastPartProps>
  Close: FC<ToastCloseProps>
  useMessage: (options?: ToastUseMessageOptions) => readonly [ToastMessageApi, any]
}

const ToastCompound: ToastCompound = /*#__PURE__*/ Object.assign(Toast, {
  Item: ToastItem,
  Icon: ToastIcon,
  Content: ToastContent,
  Title: ToastTitle,
  Description: ToastDescription,
  Action: ToastAction,
  Close: ToastClose,
  useMessage: useToastMessage,
})

/** 默认导出轻提示组件。 */
export default ToastCompound
