/*
Modal 组件概述
- 保留 Rue 当前的 daisyUI 风格视觉，同时补齐受控/非受控、默认 footer、遮罩与键盘关闭等常用能力。
- 保留现有 `actions/onClose/className` 等写法，并统一使用 `open` 控制显隐。
*/
import type { FC } from '@rue-js/rue'
import { Teleport, computed, onMounted, onUnmounted, ref, render, watch } from '@rue-js/rue'
import Button from '../button'
import type { ButtonProps, ButtonType } from '../button'

/** ModalWidth 类型。 */
export type ModalWidth = string | number
/** ModalInlineStyle 样式值类型。 */
export type ModalInlineStyle = string | Record<string, string | number | null | undefined>
/** ModalGetContainer 类型。 */
export type ModalGetContainer = string | HTMLElement | (() => HTMLElement) | false

/** ModalButtonProps 组件属性。 */
export interface ModalButtonProps extends ButtonProps {}

/** ModalClassNames 局部类名配置。 */
export interface ModalClassNames {
  /** 根节点区域配置。 */
  root?: string
  /** 遮罩层区域配置。 */
  mask?: string
  /** 外层包裹区域配置。 */
  wrapper?: string
  /** 内容容器区域配置。 */
  container?: string
  /** box 配置项。 */
  box?: string
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

/** ModalStyles 局部样式配置。 */
export interface ModalStyles {
  /** 根节点区域配置。 */
  root?: ModalInlineStyle
  /** 遮罩层区域配置。 */
  mask?: ModalInlineStyle
  /** 外层包裹区域配置。 */
  wrapper?: ModalInlineStyle
  /** 内容容器区域配置。 */
  container?: ModalInlineStyle
  /** box 配置项。 */
  box?: ModalInlineStyle
  /** 头部区域内容。 */
  header?: ModalInlineStyle
  /** 标题内容。 */
  title?: ModalInlineStyle
  /** 主体区域配置。 */
  body?: ModalInlineStyle
  /** 底部区域内容。 */
  footer?: ModalInlineStyle
  /** 关闭按钮区域配置。 */
  close?: ModalInlineStyle
}

/** ModalProps 组件属性。 */
export interface ModalProps {
  /** 受控打开状态。 */
  open?: boolean
  /** 非受控初始打开状态。 */
  defaultOpen?: boolean
  /** 标题内容。 */
  title?: any
  /** 组件子内容。 */
  children?: any
  /** 操作区内容。 */
  actions?: any
  /** 底部区域内容。 */
  footer?: string | number | null | false | ((originNode?: any) => any)
  /** 根节点附加类名。 */
  className?: string
  /** 根节点附加类名。 */
  rootClassName?: string
  /** 根节点内联样式。 */
  rootStyle?: ModalInlineStyle
  /** wrapClassName 附加类名。 */
  wrapClassName?: string
  /** wrapProps 透传属性。 */
  wrapProps?: Record<string, any>
  /** bodyClassName 附加类名。 */
  bodyClassName?: string
  /** headerClassName 附加类名。 */
  headerClassName?: string
  /** footerClassName 附加类名。 */
  footerClassName?: string
  /** maskClassName 附加类名。 */
  maskClassName?: string
  /** 按局部区域覆盖的类名集合。 */
  classNames?: ModalClassNames
  /** 按局部区域覆盖的内联样式集合。 */
  styles?: ModalStyles
  /** width 配置项。 */
  width?: ModalWidth
  /** 根节点内联样式。 */
  style?: ModalInlineStyle
  /** bodyStyle 内联样式。 */
  bodyStyle?: ModalInlineStyle
  /** maskStyle 内联样式。 */
  maskStyle?: ModalInlineStyle
  /** centered 配置项。 */
  centered?: boolean
  /** closable 配置项。 */
  closable?: boolean
  /** closeIcon 图标内容。 */
  closeIcon?: any
  /** keyboard 配置项。 */
  keyboard?: boolean
  /** 遮罩层区域配置。 */
  mask?: boolean
  /** maskClosable 配置项。 */
  maskClosable?: boolean
  /** forceRender 自定义渲染函数。 */
  forceRender?: boolean
  /** destroyOnClose 配置项。 */
  destroyOnClose?: boolean
  /** destroyOnHidden 配置项。 */
  destroyOnHidden?: boolean
  /** confirmLoading 配置项。 */
  confirmLoading?: boolean
  /** okText 文本内容。 */
  okText?: any
  /** cancelText 文本内容。 */
  cancelText?: any
  /** okType 配置项。 */
  okType?: ButtonType
  /** okButtonProps 透传属性。 */
  okButtonProps?: ModalButtonProps
  /** cancelButtonProps 透传属性。 */
  cancelButtonProps?: ModalButtonProps
  /** zIndex 配置项。 */
  zIndex?: number
  /** getContainer 配置项。 */
  getContainer?: ModalGetContainer
  /** 是否展示加载态。 */
  loading?: boolean
  /** onOk 事件回调。 */
  onOk?: (event: MouseEvent) => void
  /** onCancel 事件回调。 */
  onCancel?: (event: MouseEvent | KeyboardEvent) => void
  /** 关闭时触发的回调。 */
  onClose?: (event?: MouseEvent | KeyboardEvent) => void
  /** 打开状态变化时触发的回调。 */
  onOpenChange?: (open: boolean) => void
  /** afterClose 配置项。 */
  afterClose?: () => void
  /** afterOpenChange 配置项。 */
  afterOpenChange?: (open: boolean) => void
  /** modalRender 自定义渲染函数。 */

  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** ModalApiType 命令式弹窗类型。 */
export type ModalApiType = 'open' | 'info' | 'success' | 'warning' | 'error' | 'confirm'
/** ModalKey 标识键类型。 */
export type ModalKey = string | number
/** ModalActionClose 关闭函数类型。 */
export type ModalActionClose = () => void

/** ModalFuncProps 命令式调用配置。 */
export interface ModalFuncProps extends Omit<
  ModalProps,
  'open' | 'defaultOpen' | 'children' | 'onOk' | 'onCancel' | 'onClose' | 'onOpenChange'
> {
  /** 数据项唯一标识。 */
  key?: ModalKey
  /** 主体内容。 */
  content?: any
  /** 组件子内容。 */
  children?: any
  /** 图标内容。 */
  icon?: any
  /** onOk 事件回调。 */
  onOk?: (close: ModalActionClose, event?: MouseEvent) => void | boolean | PromiseLike<any>
  /** onCancel 事件回调。 */
  onCancel?: (
    close: ModalActionClose,
    event?: MouseEvent | KeyboardEvent,
  ) => void | boolean | PromiseLike<any>
  /** 关闭时触发的回调。 */
  onClose?: (event?: MouseEvent | KeyboardEvent) => void
}

/** ModalUpdateConfig 更新配置类型。 */
export type ModalUpdateConfig =
  | Partial<ModalFuncProps>
  | ((prevConfig: ModalFuncProps) => Partial<ModalFuncProps> | ModalFuncProps)

/** ModalFuncHandle 命令式弹窗引用。 */
export interface ModalFuncHandle extends PromiseLike<boolean> {
  /** 销毁当前弹窗。 */
  destroy: () => void
  /** 更新当前弹窗。 */
  update: (config: ModalUpdateConfig) => void
  /** promise 配置项。 */
  promise: Promise<boolean>
}

/** ModalUseOptions 组合式命令弹窗配置。 */
export interface ModalUseOptions extends Partial<
  Omit<
    ModalFuncProps,
    'key' | 'title' | 'content' | 'children' | 'icon' | 'onOk' | 'onCancel' | 'onClose'
  >
> {}

/** ModalGlobalConfig 全局命令弹窗配置。 */
export interface ModalGlobalConfig extends ModalUseOptions {}

/** ModalInstance 对外暴露的实例能力。 */
export interface ModalInstance {
  /** 受控打开状态。 */
  open: (config: ModalFuncProps) => ModalFuncHandle
  /** info 配置项。 */
  info: (config: ModalFuncProps) => ModalFuncHandle
  /** success 配置项。 */
  success: (config: ModalFuncProps) => ModalFuncHandle
  /** warning 配置项。 */
  warning: (config: ModalFuncProps) => ModalFuncHandle
  /** error 配置项。 */
  error: (config: ModalFuncProps) => ModalFuncHandle
  /** confirm 配置项。 */
  confirm: (config: ModalFuncProps) => ModalFuncHandle
  /** destroyAll 配置项。 */
  destroyAll: () => void
}

interface ModalRecord {
  key: ModalKey
  type: ModalApiType
  config: ModalFuncProps
  confirmLoading: boolean
  promise: Promise<boolean>
  resolve: (confirmed: boolean) => void
  resolved: boolean
}

interface ModalStore {
  revision?: { value: number }
  viewportApp?: { dispose(): void }
  api?: ModalInstance
  records: ModalRecord[]
  holderElement?: HTMLDivElement
  viewportElement?: HTMLDivElement
  options: ModalUseOptions
  syncViewport?: () => void
}

interface ModalApiViewportProps {
  records: ModalRecord[]
  options: ModalUseOptions
  onDestroy: (key: ModalKey, confirmed?: boolean) => void
  onUpdate: (key: ModalKey, patch: Partial<ModalRecord>) => void
}

let activeModalCount = 0
let previousDocumentOverflow = ''
let modalSeed = 0
let globalOptions: ModalGlobalConfig = {}
const globalModalStore: ModalStore = {
  records: [],
  options: globalOptions,
}
const THEN_KEY = ['th', 'en'].join('')

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (...classNames: Array<string | undefined | false | null>) =>
  classNames.filter(Boolean).join(' ')

/** 转换为 Camel Case 的内部工具函数。 */
const toCamelCase = (value: string) =>
  value.replace(/-([a-z])/g, (_, match: string) => match.toUpperCase())

/** 归一化 Style Key 的内部工具函数。 */
const normalizeStyleKey = (key: string) => {
  if (key.startsWith('--')) return key
  return key.includes('-') ? toCamelCase(key) : key
}

/** 转换为 Style Object 的内部工具函数。 */
const toStyleObject = (style?: ModalInlineStyle) => {
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
const mergeStyleValue = (...styles: Array<ModalInlineStyle | undefined>) => {
  const merged: Record<string, string | number> = {}

  styles.forEach(style => {
    const normalizedStyle = toStyleObject(style)
    if (normalizedStyle) Object.assign(merged, normalizedStyle)
  })

  return Object.keys(merged).length > 0 ? merged : undefined
}

/** 转换为 Child Array 的内部工具函数。 */

/** 判断是否存在 Renderable Content 的内部工具函数。 */

/** 物化 compiled JSX 生成的动态子插槽，避免将 block factory 传入默认渲染路径。 */

/** 解析 Width Style 的内部工具函数。 */
const resolveWidthStyle = (width?: ModalWidth) => {
  if (width == null) return undefined
  return typeof width === 'number' ? `${width}px` : width
}

/** 渲染 Loading Body 的内部工具函数。 */
const RenderLoadingBody = () => {
  return (
    <div className="space-y-3" data-rue-modal-loading="true">
      <div className="skeleton h-4 w-2/5" />
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

/** lock Document Scroll 的内部工具函数。 */
const lockDocumentScroll = () => {
  if (typeof document === 'undefined') return
  if (activeModalCount === 0) {
    previousDocumentOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
  }
  activeModalCount += 1
}

/** unlock Document Scroll 的内部工具函数。 */
const unlockDocumentScroll = () => {
  if (typeof document === 'undefined' || activeModalCount === 0) return
  activeModalCount -= 1
  if (activeModalCount === 0) {
    document.documentElement.style.overflow = previousDocumentOverflow
  }
}

interface ModalApiIconProps {
  className?: string
}

/** Modal Info Icon 的内部工具函数。 */
const ModalInfoIcon: FC<ModalApiIconProps> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 10v6" strokeLinecap="round" />
    <path d="M12 7.5h.01" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** Modal Success Icon 的内部工具函数。 */
const ModalSuccessIcon: FC<ModalApiIconProps> = ({ className }) => (
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

/** Modal Warning Icon 的内部工具函数。 */
const ModalWarningIcon: FC<ModalApiIconProps> = ({ className }) => (
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

/** Modal Error Icon 的内部工具函数。 */
const ModalErrorIcon: FC<ModalApiIconProps> = ({ className }) => (
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

/** render Default Api Icon 的内部工具函数。 */
const RenderDefaultApiIcon = ({ arg0: type }: { arg0: ModalApiType }) => {
  const className = 'h-5 w-5'
  return type === 'info' ? (
    <ModalInfoIcon className={className} />
  ) : type === 'success' ? (
    <ModalSuccessIcon className={className} />
  ) : type === 'error' ? (
    <ModalErrorIcon className={className} />
  ) : type === 'warning' || type === 'confirm' ? (
    <ModalWarningIcon className={className} />
  ) : (
    <></>
  )
}

const apiIconToneMap: Record<ModalApiType, string> = {
  open: 'bg-base-200 text-base-content/70',
  info: 'bg-info/10 text-info',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning',
  error: 'bg-error/10 text-error',
  confirm: 'bg-warning/15 text-warning',
}

/** 解析 Api Icon 的内部工具函数。 */

/** 解析 Api Ok Button Props 的内部工具函数。 */
const resolveApiOkButtonProps = (type: ModalApiType): ModalButtonProps | undefined => {
  switch (type) {
    case 'success':
      return { color: 'success' }
    case 'warning':
    case 'confirm':
      return { color: 'warning' }
    case 'error':
      return { color: 'error' }
    default:
      return undefined
  }
}

/** 判断 Promise Like 的内部工具函数。 */
const isPromiseLike = (value: any): value is PromiseLike<any> => {
  return value != null && typeof value === 'object' && typeof value.then === 'function'
}

const ModalActionButtons: FC<{
  showCancel: boolean
  showOk: boolean
  cancelText?: string
  okText?: string
  okType?: ModalProps['okType']
  confirmLoading?: boolean
  cancelButtonProps?: Record<string, any>
  okButtonProps?: Record<string, any>
  onCancel: (event: MouseEvent) => void
  onOk: (event: MouseEvent) => void
}> = ({
  showCancel,
  showOk,
  cancelText,
  okText,
  okType,
  confirmLoading,
  cancelButtonProps,
  okButtonProps,
  onCancel,
  onOk,
}) => (
  <>
    {showCancel ? (
      <Button
        {...cancelButtonProps}
        onClick={(event: MouseEvent) => {
          cancelButtonProps?.onClick?.(event)
          if (!event.defaultPrevented) onCancel(event)
        }}
      >
        {String(cancelText ?? '取消')}
      </Button>
    ) : null}
    {showOk ? (
      <Button
        {...okButtonProps}
        type={okButtonProps?.type ?? okType}
        loading={okButtonProps?.loading ?? confirmLoading}
        onClick={(event: MouseEvent) => {
          okButtonProps?.onClick?.(event)
          if (!event.defaultPrevented) onOk(event)
        }}
      >
        {String(okText ?? '确定')}
      </Button>
    ) : null}
  </>
)

/** 模态框组件：保留现有 API，并补齐常见的 Modal 交互能力。 */
const Modal: FC<ModalProps> = (
  {
    open,
    defaultOpen = false,
    title,
    children,
    actions,
    footer,
    className,
    rootClassName,
    rootStyle,
    wrapClassName,
    wrapProps,
    bodyClassName,
    headerClassName,
    footerClassName,
    maskClassName,
    classNames,
    styles,
    width,
    style,
    bodyStyle,
    maskStyle,
    centered = false,
    closable = true,
    closeIcon,
    keyboard = true,
    mask = true,
    maskClosable = true,
    forceRender = false,
    destroyOnClose,
    destroyOnHidden = true,
    confirmLoading = false,
    okText = '确定',
    cancelText,
    okType = 'primary',
    okButtonProps,
    cancelButtonProps,
    zIndex,
    getContainer,
    loading = false,
    onOk,
    onCancel,
    onClose,
    onOpenChange,
    afterClose,
    afterOpenChange,

    ...rest
  },
  slots: Record<string, any> = {},
) => {
  const uncontrolledOpen = ref(defaultOpen)
  const hasOpened = ref(defaultOpen || open === true)
  const locked = ref(false)

  const isControlled = computed(() => typeof open === 'boolean')
  const mergedOpen = computed(() => (isControlled.get() ? open : uncontrolledOpen.value))
  const currentOpen = ref(mergedOpen.get())
  const currentKeyboard = ref(keyboard)

  const requestOpenChange = (nextOpen: boolean) => {
    if (!isControlled.get()) {
      uncontrolledOpen.value = nextOpen
    }
    if (onOpenChange) onOpenChange(nextOpen)
  }

  const notifyCancel = (event?: MouseEvent | KeyboardEvent) => {
    if (event && typeof (event as any).preventDefault === 'function') {
      ;(event as any).preventDefault()
    }
    if (onCancel && event) onCancel(event)
    if (onClose) onClose(event)
    requestOpenChange(false)
  }

  const handleOk = (event: MouseEvent) => {
    if (confirmLoading) return
    if (onOk) onOk(event)
  }

  onMounted(() => {
    if (mergedOpen.get()) {
      lockDocumentScroll()
      locked.value = true
    }

    if (typeof window === 'undefined') return

    const handleDocumentKeydown = (event: KeyboardEvent) => {
      if (!currentOpen.value || !currentKeyboard.value || event.key !== 'Escape') return
      notifyCancel(event)
    }

    window.addEventListener('keydown', handleDocumentKeydown)
    onUnmounted(() => {
      window.removeEventListener('keydown', handleDocumentKeydown)
    })
  })

  watch(
    () => !!mergedOpen.value,
    (nextOpen: boolean) => {
      currentOpen.value = nextOpen
      if (nextOpen) {
        hasOpened.value = true
        if (!locked.value) {
          lockDocumentScroll()
          locked.value = true
        }
      } else if (locked.value) {
        unlockDocumentScroll()
        locked.value = false
        if (afterClose) afterClose()
      }
      if (afterOpenChange) afterOpenChange(nextOpen)
    },
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
      if (!isControlled.get()) {
        uncontrolledOpen.value = !!nextDefaultOpen
      }
    },
    { immediate: true },
  )

  onUnmounted(() => {
    if (locked.value) {
      unlockDocumentScroll()
      locked.value = false
    }
  })

  const mergedDestroyOnHidden = destroyOnHidden ?? destroyOnClose ?? true
  const shouldMount = mergedOpen.get() || forceRender || (!mergedDestroyOnHidden && hasOpened.value)
  if (!shouldMount) return <></>

  const wrapperProps = wrapProps ?? {}
  const {
    className: wrapperPropsClassName,
    style: wrapperPropsStyle,
    onClick: wrapperPropsOnClick,
    ...wrapperRestProps
  } = wrapperProps

  const defaultCancelText = cancelText ?? (onOk || okButtonProps ? '取消' : '关闭')
  const showLegacyActionFooter = footer === undefined && actions != null
  const showOkButton = !showLegacyActionFooter && (onOk != null || okButtonProps != null)
  const showCancelButton =
    showLegacyActionFooter || onCancel != null || onClose != null || showOkButton

  const showFooter = !loading && footer !== null && footer !== false

  const handleWrapperClick = (event: MouseEvent) => {
    if (wrapperPropsOnClick) wrapperPropsOnClick(event)
    if (event.defaultPrevented) return
    if (!mask || !maskClosable || event.target !== event.currentTarget) return
    notifyCancel(event)
  }

  const ModalBox = () => (
    <div
      {...rest}
      aria-hidden={mergedOpen.get() ? undefined : 'true'}
      className={mergeClassName(
        `modal ${mergedOpen.get() ? 'modal-open' : ''} bg-transparent`.trim(),
        mergeClassName(
          rootClassName,
          mergeClassName(classNames?.root, mergedOpen.get() ? undefined : 'pointer-events-none'),
        ),
      )}
      style={mergeStyleValue(styles?.root, rootStyle, zIndex != null ? { zIndex } : undefined)}
      data-rue-modal-root="true"
    >
      {mask ? (
        <div
          {...{ style: mergeStyleValue(styles?.mask, maskStyle) }}
          aria-hidden="true"
          className={mergeClassName(
            'absolute inset-0 bg-base-content/40',
            mergeClassName(maskClassName, classNames?.mask),
          )}
          data-rue-modal-mask="true"
        />
      ) : null}
      <div
        {...wrapperRestProps}
        className={mergeClassName(
          mergeClassName(
            `absolute inset-0 overflow-y-auto px-4 py-6 sm:px-6 ${centered ? 'flex items-center justify-center' : 'flex items-start justify-center sm:items-center'}`,
            wrapClassName,
          ),
          mergeClassName(wrapperPropsClassName, classNames?.wrapper),
        )}
        style={mergeStyleValue(styles?.wrapper, wrapperPropsStyle)}
        onClick={handleWrapperClick}
        data-rue-modal-wrapper="true"
      >
        <div
          className={mergeClassName('relative flex w-full justify-center', classNames?.container)}
          style={mergeStyleValue(styles?.container)}
          data-rue-modal-container="true"
        >
          <div
            role="dialog"
            aria-modal={mergedOpen.get() ? 'true' : 'false'}
            aria-hidden={mergedOpen.get() ? undefined : 'true'}
            className={mergeClassName(
              mergeClassName('modal-box relative', className),
              mergeClassName(classNames?.box, mergedOpen.get() ? undefined : 'pointer-events-none'),
            )}
            style={mergeStyleValue(
              styles?.box,
              style,
              width != null ? { width: resolveWidthStyle(width) } : undefined,
            )}
            onClick={(event: MouseEvent) => {
              event.stopPropagation()
            }}
            data-rue-modal-box="true"
          >
            {closable ? (
              <button
                {...{ style: mergeStyleValue(styles?.close) }}
                type="button"
                aria-label="关闭"
                className={mergeClassName(
                  'btn btn-sm btn-circle btn-ghost absolute right-4 top-4 z-10',
                  classNames?.close,
                )}
                onClick={(event: MouseEvent) => notifyCancel(event)}
              >
                {closeIcon ?? <DefaultCloseIcon />}
              </button>
            ) : null}
            {title ? (
              <div
                {...{ style: mergeStyleValue(styles?.header) }}
                className={mergeClassName(
                  'mb-4 pr-10',
                  mergeClassName(headerClassName, classNames?.header),
                )}
              >
                <div
                  {...{ style: mergeStyleValue(styles?.title) }}
                  className={mergeClassName('text-lg font-semibold leading-6', classNames?.title)}
                >
                  {title}
                </div>
              </div>
            ) : null}
            <div
              className={mergeClassName(
                'space-y-4',
                mergeClassName(bodyClassName, classNames?.body),
              )}
              style={mergeStyleValue(styles?.body, bodyStyle)}
              aria-busy={loading ? 'true' : undefined}
            >
              {loading ? <RenderLoadingBody /> : children}
            </div>
            {showFooter ? (
              <div
                {...{ style: mergeStyleValue(styles?.footer) }}
                className={mergeClassName(
                  'modal-action mt-6 flex flex-wrap items-center justify-end gap-2',
                  mergeClassName(footerClassName, classNames?.footer),
                )}
              >
                {slots.footer ? (
                  <>{slots.footer}</>
                ) : footer != null ? (
                  <>{String(footer)}</>
                ) : (
                  <ModalActionButtons
                    showCancel={showCancelButton}
                    showOk={showOkButton}
                    cancelText={defaultCancelText}
                    okText={okText}
                    okType={okType as ButtonType}
                    confirmLoading={confirmLoading}
                    cancelButtonProps={cancelButtonProps}
                    okButtonProps={okButtonProps}
                    onCancel={notifyCancel}
                    onOk={handleOk}
                  />
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )

  const resolvedContainer = typeof getContainer === 'function' ? getContainer() : getContainer
  return resolvedContainer === false || !resolvedContainer ? (
    <ModalBox />
  ) : (
    <Teleport to={resolvedContainer}>
      <ModalBox />
    </Teleport>
  )
}

/** render Api Body 的内部工具函数。 */
const RenderApiBody: FC<{ arg0: ModalFuncProps; arg1: ModalApiType }> = ({
  arg0: config,
  arg1: type,
}) => (
  <div className="flex items-start gap-3">
    {config.icon !== null ? (
      <div
        className={mergeClassName(
          'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
          apiIconToneMap[type],
        )}
      >
        {config.icon !== undefined ? (
          <>{String(config.icon)}</>
        ) : (
          <RenderDefaultApiIcon arg0={type} />
        )}
      </div>
    ) : null}
    <div className="min-w-0 flex-1">
      {config.title != null ? (
        <div className="text-base font-semibold leading-6 text-base-content">
          {String(config.title)}
        </div>
      ) : null}
      {config.content != null ? (
        <div className="mt-2 text-sm leading-6 text-base-content/75">{String(config.content)}</div>
      ) : null}
    </div>
  </div>
)

/** resolve Modal Api Config 的内部工具函数。 */
const resolveModalApiConfig = (record: ModalRecord, options: ModalUseOptions): ModalFuncProps => {
  return {
    ...options,
    ...record.config,
  }
}

/** Modal Api Item 的内部工具函数。 */
const ModalApiItem: FC<{
  record: ModalRecord
  options: ModalUseOptions
  onDestroy: (key: ModalKey, confirmed?: boolean) => void
  onUpdate: (key: ModalKey, patch: Partial<ModalRecord>) => void
}> = ({ record, options, onDestroy, onUpdate }) => {
  const config = computed(() => resolveModalApiConfig(record, options))
  const {
    key: _key,
    content: _content,
    children: _children,
    icon: _icon,
    title: _title,
    footer: _footer,
    onOk: apiOnOk,
    onCancel: apiOnCancel,
    onClose: apiOnClose,
    afterClose: _afterClose,
    confirmLoading,
    width,
    closable,
    maskClosable,
    okButtonProps,
    bodyClassName,
    ...modalProps
  } = config.get()

  const closeAsOk = () => onDestroy(record.key, true)
  const closeAsCancel = () => onDestroy(record.key, false)

  const runAction = (action: 'ok' | 'cancel', event?: MouseEvent | KeyboardEvent) => {
    const close = action === 'ok' ? closeAsOk : closeAsCancel
    const callback = action === 'ok' ? apiOnOk : apiOnCancel
    const finish = () => {
      if (action === 'cancel' && apiOnClose) apiOnClose(event)
      close()
    }

    if (!callback) {
      finish()
      return
    }

    const result = callback(close, event as any)
    if (result === false) return

    if (isPromiseLike(result)) {
      if (action === 'ok') onUpdate(record.key, { confirmLoading: true })
      result.then(
        () => {
          if (action === 'ok') onUpdate(record.key, { confirmLoading: false })
          finish()
        },
        () => {
          if (action === 'ok') onUpdate(record.key, { confirmLoading: false })
        },
      )
      return
    }

    finish()
  }

  const defaultOkButtonProps = resolveApiOkButtonProps(record.type)
  const mergedOkButtonProps =
    defaultOkButtonProps || okButtonProps
      ? {
          ...defaultOkButtonProps,
          ...okButtonProps,
        }
      : undefined

  return (
    <Modal
      {...config.get()}
      open
      title={undefined}
      width={config.get().width ?? 416}
      closable={closable ?? record.type === 'open'}
      maskClosable={maskClosable ?? record.type === 'open'}
      confirmLoading={record.confirmLoading || !!config.get().confirmLoading}
      okButtonProps={mergedOkButtonProps}
      bodyClassName={mergeClassName('py-1', bodyClassName)}
      footer={config.get().footer}
      onOk={(event: MouseEvent) => runAction('ok', event)}
      onCancel={(event: MouseEvent | KeyboardEvent) => runAction('cancel', event)}
      data-rue-modal-api-type={record.type}
    >
      <RenderApiBody arg0={config.get()} arg1={record.type} />
    </Modal>
  )
}

/** Modal Api Viewport 的内部工具函数。 */
const ModalApiViewport: FC<ModalApiViewportProps> = ({ records, options, onDestroy, onUpdate }) => {
  return (
    <>
      {records.map(record => (
        <ModalApiItem
          key={record.key}
          record={record}
          options={options}
          onDestroy={onDestroy}
          onUpdate={onUpdate}
        />
      ))}
    </>
  )
}

/** resolve Modal Api Mount Target 的内部工具函数。 */
const resolveModalApiMountTarget = (
  getContainer: ModalGetContainer | undefined,
  holderElement?: HTMLElement | null,
  fallbackToBody = false,
) => {
  if (typeof document === 'undefined') return null
  const resolved = typeof getContainer === 'function' ? getContainer() : getContainer
  if (resolved === false) return holderElement ?? (fallbackToBody ? document.body : null)
  if (typeof resolved === 'string') return document.querySelector(resolved) as HTMLElement | null
  if (resolved && typeof resolved === 'object' && 'appendChild' in resolved) {
    return resolved as HTMLElement
  }
  return fallbackToBody ? document.body : null
}

/** ensure Modal Viewport Element 的内部工具函数。 */
const ensureModalViewportElement = (store: ModalStore) => {
  const target = resolveModalApiMountTarget(
    (store.options ?? {}).getContainer,
    store.holderElement ?? null,
    true,
  )
  if (!target) return null
  if (store.viewportElement == null) {
    const element = document.createElement('div')
    element.style.display = 'contents'
    element.dataset.rueModalViewport = 'true'
    store.viewportElement = element
  }
  if (store.viewportElement.parentNode !== target) target.appendChild(store.viewportElement)
  return store.viewportElement
}

/** resolve Modal Record 的内部工具函数。 */
const resolveModalRecord = (record: ModalRecord, confirmed: boolean) => {
  if (record.resolved) return
  record.resolved = true
  record.resolve(confirmed)
}

const readModalRecords = (store: ModalStore) => {
  void store.revision?.value
  return store.records
}
const readModalOptions = (store: ModalStore) => {
  void store.revision?.value
  return store.options
}

/** sync Modal Store 的内部工具函数。 */
const syncModalStore = (store: ModalStore) => {
  if (typeof document === 'undefined') return
  if (store.records.length === 0 && store.viewportElement == null) return
  const viewportElement = ensureModalViewportElement(store)
  if (!viewportElement) return
  store.revision ??= ref(0)
  store.revision.value += 1
  if (store.viewportApp) return
  store.viewportApp = render(
    <ModalApiViewport
      records={readModalRecords(store)}
      options={readModalOptions(store)}
      onDestroy={(key: ModalKey, confirmed = false) => destroyModalRecord(store, key, confirmed)}
      onUpdate={(key: ModalKey, patch: Partial<ModalRecord>) => patchModalRecord(store, key, patch)}
    />,
    viewportElement,
  )
}

/** notify Modal Store Change 的内部工具函数。 */
const notifyModalStoreChange = (store: ModalStore) => {
  if (store.syncViewport) {
    store.syncViewport()
    return
  }
  syncModalStore(store)
}

/** destroy Modal Record 的内部工具函数。 */
const destroyModalRecord = (store: ModalStore, key: ModalKey, confirmed = false) => {
  const target = store.records.find(record => record.key === key)
  if (!target) return

  store.records = store.records.filter(record => record.key !== key)
  notifyModalStoreChange(store)

  if (target.config.afterOpenChange) target.config.afterOpenChange(false)
  if (target.config.afterClose) target.config.afterClose()
  resolveModalRecord(target, confirmed)
}

/** destroy All Modal Records 的内部工具函数。 */
const destroyAllModalRecords = (store: ModalStore) => {
  if (store.records.length === 0) return
  const currentRecords = store.records
  store.records = []
  notifyModalStoreChange(store)

  currentRecords.forEach(record => {
    if (record.config.afterOpenChange) record.config.afterOpenChange(false)
    if (record.config.afterClose) record.config.afterClose()
    resolveModalRecord(record, false)
  })
}

/** patch Modal Record 的内部工具函数。 */
const patchModalRecord = (store: ModalStore, key: ModalKey, patch: Partial<ModalRecord>) => {
  const currentIndex = store.records.findIndex(record => record.key === key)
  if (currentIndex === -1) return
  store.records = store.records.map(record =>
    record.key === key
      ? {
          ...record,
          ...patch,
          config: patch.config ? { ...patch.config, key: record.key } : record.config,
        }
      : record,
  )
  notifyModalStoreChange(store)
}

/** update Modal Record 的内部工具函数。 */
const updateModalRecord = (store: ModalStore, key: ModalKey, update: ModalUpdateConfig) => {
  const target = store.records.find(record => record.key === key)
  if (!target) return
  const nextConfig = typeof update === 'function' ? update(target.config) : update
  patchModalRecord(store, key, {
    config: {
      ...target.config,
      ...nextConfig,
      key,
    },
  })
}

/** attach Modal Handle Promise 的内部工具函数。 */
const createModalHandle = (
  promise: Promise<boolean>,
  destroy: () => void,
  update: (config: ModalUpdateConfig) => void,
): ModalFuncHandle => {
  const handle = {
    destroy,
    update,
    promise,
  } as ModalFuncHandle
  Object.defineProperty(handle, THEN_KEY, {
    configurable: true,
    writable: true,
    value: promise.then.bind(promise),
  })
  return handle
}

/** open Modal Record 的内部工具函数。 */
const openModalRecord = (
  store: ModalStore,
  type: ModalApiType,
  config: ModalFuncProps,
): ModalFuncHandle => {
  const nextKey = config.key ?? `rue-modal-${modalSeed++}`
  const currentIndex = store.records.findIndex(record => record.key === nextKey)
  const currentRecord = currentIndex === -1 ? undefined : store.records[currentIndex]
  let resolvePromise: (confirmed: boolean) => void = () => {}
  const promise =
    currentRecord?.promise ??
    new Promise<boolean>(resolve => {
      resolvePromise = resolve
    })

  const nextRecord: ModalRecord = {
    key: nextKey,
    type,
    config: {
      ...config,
      key: nextKey,
    },
    confirmLoading: false,
    promise,
    resolve: currentRecord?.resolve ?? resolvePromise,
    resolved: currentRecord?.resolved ?? false,
  }

  store.records =
    currentIndex === -1
      ? [...store.records, nextRecord]
      : [
          ...store.records.slice(0, currentIndex),
          nextRecord,
          ...store.records.slice(currentIndex + 1),
        ]
  notifyModalStoreChange(store)

  return createModalHandle(
    promise,
    () => destroyModalRecord(store, nextKey, false),
    (update: ModalUpdateConfig) => updateModalRecord(store, nextKey, update),
  )
}

/** 创建 Modal Instance 的内部工具函数。 */
const createModalInstance = (store: ModalStore): ModalInstance => {
  const createTypedOpen = (type: ModalApiType) => (config: ModalFuncProps) =>
    openModalRecord(store, type, config)

  return {
    open: createTypedOpen('open'),
    info: createTypedOpen('info'),
    success: createTypedOpen('success'),
    warning: createTypedOpen('warning'),
    error: createTypedOpen('error'),
    confirm: createTypedOpen('confirm'),
    destroyAll: () => destroyAllModalRecords(store),
  }
}

/** useModal 组合式能力入口。 */
export const useModal = (options: ModalUseOptions = {}) => {
  const storeState = ref<ModalStore | undefined>(undefined)
  if (storeState.value == null) {
    storeState.value = {
      records: [],
      options,
    }
  }
  const store = storeState.value
  store.options = options
  store.syncViewport = () => syncModalStore(store)

  if (store.api == null) {
    store.api = createModalInstance(store)
  }

  onUnmounted(() => {
    destroyAllModalRecords(store)
    store.viewportApp?.dispose()
    store.viewportApp = undefined
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
          syncModalStore(store)
      }}
    />
  )

  return [store.api, contextHolder] as const
}

/** sync Global Modal Viewport 的内部工具函数。 */
const syncGlobalModalViewport = () => {
  globalModalStore.options = globalOptions
  syncModalStore(globalModalStore)
}

globalModalStore.syncViewport = syncGlobalModalViewport

/** open Global Modal 的内部工具函数。 */
const openGlobalModal = (type: ModalApiType, config: ModalFuncProps) => {
  globalModalStore.options = globalOptions
  return openModalRecord(globalModalStore, type, config)
}

/** config Global Modal 的内部工具函数。 */
const configGlobalModal = (options: ModalGlobalConfig) => {
  globalOptions = { ...globalOptions, ...options }
  syncGlobalModalViewport()
}

type ModalCompound = FC<ModalProps> &
  ModalInstance & {
    useModal: (options?: ModalUseOptions) => readonly [ModalInstance, any]
    config: (options: ModalGlobalConfig) => void
  }

const ModalCompound: ModalCompound = /*#__PURE__*/ Object.assign(Modal, {
  useModal,
  open: (config: ModalFuncProps) => openGlobalModal('open', config),
  info: (config: ModalFuncProps) => openGlobalModal('info', config),
  success: (config: ModalFuncProps) => openGlobalModal('success', config),
  warning: (config: ModalFuncProps) => openGlobalModal('warning', config),
  error: (config: ModalFuncProps) => openGlobalModal('error', config),
  confirm: (config: ModalFuncProps) => openGlobalModal('confirm', config),
  destroyAll: () => destroyAllModalRecords(globalModalStore),
  config: configGlobalModal,
})

/** 默认导出模态框组件。 */
export default ModalCompound
