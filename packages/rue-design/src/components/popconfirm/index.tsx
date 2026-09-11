/*
Popconfirm 组件概述
- 提供确认型浮层，覆盖点击确认、异步确认、受控 / 非受控开关与常用文案定制。
- 交互心智参考成熟组件库，但视觉仍沿用 Rue 当前卡片与按钮体系，不直接复刻特定组件库皮肤。
- 保持为原生 TSX 源文件，让 Rue 编译器参与优化，而不是手写 transformed 结果。
*/
import type { FC } from '@rue-js/rue'
import { onMounted, onUnmounted, ref, watch } from '@rue-js/rue'

/** PopconfirmPlacement 位置或方向类型。 */
export type PopconfirmPlacement =
  | 'top'
  | 'topLeft'
  | 'topRight'
  | 'bottom'
  | 'bottomLeft'
  | 'bottomRight'
  | 'left'
  | 'leftTop'
  | 'leftBottom'
  | 'right'
  | 'rightTop'
  | 'rightBottom'

/** PopconfirmTrigger 类型。 */
export type PopconfirmTrigger = 'hover' | 'focus' | 'click' | 'contextMenu'
/** PopconfirmOkType 视觉或语义变体类型。 */
export type PopconfirmOkType =
  | 'solid'
  | 'filled'
  | 'outlined'
  | 'dashed'
  | 'text'
  | 'link'
  | 'default'
  | 'primary'
  | 'danger'
/** PopconfirmArrow 类型。 */
export type PopconfirmArrow = boolean | { pointAtCenter?: boolean }

/** PopconfirmButtonProps 组件属性。 */
export interface PopconfirmButtonProps {
  /** 组件子内容。 */
  children?: any
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: Record<string, any>
  /** 组件类型或语义类型。 */
  type?: 'solid' | 'filled' | 'outlined' | 'dashed' | 'text' | 'link'
  /** 组件语义色。 */
  color?:
    | 'default'
    | 'danger'
    | 'neutral'
    | 'primary'
    | 'secondary'
    | 'accent'
    | 'info'
    | 'success'
    | 'warning'
    | 'error'
  /** 组件尺寸。 */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'medium' | 'middle' | 'large'
  /** 组件形状。 */
  shape?: 'default' | 'square' | 'circle' | 'round'
  /** block 配置项。 */
  block?: boolean
  /** wide 配置项。 */
  wide?: boolean
  /** danger 配置项。 */
  danger?: boolean
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 原生 button type 属性。 */
  htmlType?: 'button' | 'submit' | 'reset'
  /** 图标内容。 */
  icon?: string | number | false
  /** iconPlacement 配置项。 */
  iconPlacement?: 'start' | 'end'
  /** 是否展示加载态。 */
  loading?: boolean | { delay?: number; icon?: string | number | false }
  /** 点击时触发的回调。 */
  onClick?: (event: MouseEvent) => void
}

/** PopconfirmClassNames 局部类名配置。 */
export interface PopconfirmClassNames {
  /** 根节点区域配置。 */
  root?: string
  /** trigger 区域配置。 */
  trigger?: string
  /** overlay 配置项。 */
  overlay?: string
  /** panel 区域配置。 */
  panel?: string
  /** arrow 配置项。 */
  arrow?: string
  /** 图标内容。 */
  icon?: string
  /** 主体区域配置。 */
  body?: string
  /** 标题内容。 */
  title?: string
  /** 描述内容。 */
  description?: string
  /** 底部区域内容。 */
  footer?: string
  /** cancelButton 配置项。 */
  cancelButton?: string
  /** okButton 配置项。 */
  okButton?: string
}

/** PopconfirmStyles 局部样式配置。 */
export interface PopconfirmStyles {
  /** 根节点区域配置。 */
  root?: Record<string, any>
  /** trigger 区域配置。 */
  trigger?: Record<string, any>
  /** overlay 配置项。 */
  overlay?: Record<string, any>
  /** panel 区域配置。 */
  panel?: Record<string, any>
  /** arrow 配置项。 */
  arrow?: Record<string, any>
  /** 图标内容。 */
  icon?: Record<string, any>
  /** 主体区域配置。 */
  body?: Record<string, any>
  /** 标题内容。 */
  title?: Record<string, any>
  /** 描述内容。 */
  description?: Record<string, any>
  /** 底部区域内容。 */
  footer?: Record<string, any>
  /** cancelButton 配置项。 */
  cancelButton?: Record<string, any>
  /** okButton 配置项。 */
  okButton?: Record<string, any>
}

/** PopconfirmProps 组件属性。 */
export interface PopconfirmProps {
  /** 标题内容。 */
  title?: string | number
  /** 描述内容。 */
  description?: string | number
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 弹出层或内容展示位置。 */
  placement?: PopconfirmPlacement
  /** trigger 区域配置。 */
  trigger?: PopconfirmTrigger | PopconfirmTrigger[]
  /** arrow 配置项。 */
  arrow?: PopconfirmArrow
  /** 受控打开状态。 */
  open?: boolean
  /** 非受控初始打开状态。 */
  defaultOpen?: boolean
  /** 图标内容。 */
  icon?: string | number | false
  /** okText 文本内容。 */
  okText?: any
  /** cancelText 文本内容。 */
  cancelText?: any
  /** okType 配置项。 */
  okType?: PopconfirmOkType
  /** okButtonProps 透传属性。 */
  okButtonProps?: PopconfirmButtonProps
  /** cancelButtonProps 透传属性。 */
  cancelButtonProps?: PopconfirmButtonProps
  /** showCancel 配置项。 */
  showCancel?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: string | Record<string, any>
  /** overlayClassName 附加类名。 */
  overlayClassName?: string
  /** overlayStyle 内联样式。 */
  overlayStyle?: Record<string, any>
  /** 按局部区域覆盖的类名集合。 */
  classNames?: PopconfirmClassNames
  /** 按局部区域覆盖的内联样式集合。 */
  styles?: PopconfirmStyles
  /** onConfirm 事件回调。 */
  onConfirm?: (event?: MouseEvent) => void | boolean | Promise<unknown>
  /** onCancel 事件回调。 */
  onCancel?: (event?: MouseEvent) => void
  /** 打开状态变化时触发的回调。 */
  onOpenChange?: (open: boolean) => void
  /** onPopupClick 事件回调。 */
  onPopupClick?: (event: MouseEvent) => void
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface PlacementLayout {
  direction: 'top' | 'bottom' | 'left' | 'right'
  align: 'start' | 'center' | 'end'
}

let popconfirmIdSeed = 0
/** HOVER_CLOSE_DELAY_MS 内部常量。 */
const HOVER_CLOSE_DELAY_MS = 120

/** merge Class Names 的内部工具函数。 */
const mergeClassNames = (...parts: Array<string | undefined | false | null>) => {
  return parts.filter(Boolean).join(' ')
}

/** merge Styles 的内部工具函数。 */
const mergeStyles = (...parts: Array<Record<string, any> | undefined>) => {
  const merged: Record<string, any> = {}
  parts.forEach(part => {
    if (part) Object.assign(merged, part)
  })
  return merged
}

/** 转换为 Kebab Case 的内部工具函数。 */
const toKebabCase = (value: string) => value.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)

/** serialize Style 的内部工具函数。 */
const serializeStyle = (style?: string | Record<string, any>) => {
  if (!style) return undefined
  if (typeof style === 'string') return style.trim() || undefined
  const serialized = Object.entries(style)
    .filter(([, value]) => value != null)
    .map(([key, value]) => `${key.startsWith('--') ? key : toKebabCase(key)}:${String(value)}`)
    .join('; ')
  return serialized || undefined
}

/** 判断 Renderable 的内部工具函数。 */
const isRenderable = (value: any) => value != null && value !== false && value !== ''

/** 解析 Node 的内部工具函数。 */

/** 判断 Promise Like 的内部工具函数。 */
const isPromiseLike = (value: unknown): value is PromiseLike<unknown> => {
  return !!value && typeof (value as PromiseLike<unknown>).then === 'function'
}

/** call Handler 的内部工具函数。 */
const callHandler = (handler: ((event: any) => void) | undefined, event: any) => {
  if (typeof handler === 'function') handler(event)
}

/** 归一化 Trigger 的内部工具函数。 */
const normalizeTrigger = (trigger?: PopconfirmTrigger | PopconfirmTrigger[]) => {
  const source = Array.isArray(trigger) ? trigger : trigger ? [trigger] : ['click']
  return Array.from(new Set(source)) as PopconfirmTrigger[]
}

/** 解析 Placement Layout 的内部工具函数。 */
const resolvePlacementLayout = (placement: PopconfirmPlacement): PlacementLayout => {
  switch (placement) {
    case 'top':
      return { direction: 'top', align: 'center' }
    case 'topLeft':
      return { direction: 'top', align: 'start' }
    case 'topRight':
      return { direction: 'top', align: 'end' }
    case 'bottom':
      return { direction: 'bottom', align: 'center' }
    case 'bottomRight':
      return { direction: 'bottom', align: 'end' }
    case 'left':
      return { direction: 'left', align: 'center' }
    case 'leftTop':
      return { direction: 'left', align: 'start' }
    case 'leftBottom':
      return { direction: 'left', align: 'end' }
    case 'right':
      return { direction: 'right', align: 'center' }
    case 'rightTop':
      return { direction: 'right', align: 'start' }
    case 'rightBottom':
      return { direction: 'right', align: 'end' }
    case 'bottomLeft':
    default:
      return { direction: 'bottom', align: 'start' }
  }
}

/** 读取 Overlay Placement Class 的内部工具函数。 */
const getOverlayPlacementClass = (placement: PopconfirmPlacement) => {
  switch (placement) {
    case 'top':
      return 'bottom-full left-1/2 mb-3 -translate-x-1/2'
    case 'topLeft':
      return 'bottom-full left-0 mb-3'
    case 'topRight':
      return 'bottom-full right-0 mb-3'
    case 'bottom':
      return 'top-full left-1/2 mt-3 -translate-x-1/2'
    case 'bottomRight':
      return 'top-full right-0 mt-3'
    case 'left':
      return 'right-full top-1/2 me-3 -translate-y-1/2'
    case 'leftTop':
      return 'right-full top-0 me-3'
    case 'leftBottom':
      return 'right-full bottom-0 me-3'
    case 'right':
      return 'left-full top-1/2 ms-3 -translate-y-1/2'
    case 'rightTop':
      return 'left-full top-0 ms-3'
    case 'rightBottom':
      return 'left-full bottom-0 ms-3'
    case 'bottomLeft':
    default:
      return 'top-full left-0 mt-3'
  }
}

/** 读取 Transform Origin Class 的内部工具函数。 */
const getTransformOriginClass = (placement: PopconfirmPlacement) => {
  switch (placement) {
    case 'top':
    case 'topLeft':
    case 'topRight':
      return 'origin-bottom'
    case 'left':
    case 'leftTop':
    case 'leftBottom':
      return 'origin-right'
    case 'right':
    case 'rightTop':
    case 'rightBottom':
      return 'origin-left'
    case 'bottom':
    case 'bottomLeft':
    case 'bottomRight':
    default:
      return 'origin-top'
  }
}

/** 解析 Arrow Class Name 的内部工具函数。 */
const resolveArrowClassName = (placement: PopconfirmPlacement, pointAtCenter: boolean) => {
  const layout = resolvePlacementLayout(placement)
  if (layout.direction === 'top') {
    return mergeClassNames(
      'bottom-[-6px] border-r border-b',
      pointAtCenter || layout.align === 'center'
        ? 'left-1/2 -translate-x-1/2'
        : layout.align === 'end'
          ? 'right-5'
          : 'left-5',
    )
  }

  if (layout.direction === 'bottom') {
    return mergeClassNames(
      'top-[-6px] border-l border-t',
      pointAtCenter || layout.align === 'center'
        ? 'left-1/2 -translate-x-1/2'
        : layout.align === 'end'
          ? 'right-5'
          : 'left-5',
    )
  }

  if (layout.direction === 'left') {
    return mergeClassNames(
      'right-[-6px] border-r border-t',
      pointAtCenter || layout.align === 'center'
        ? 'top-1/2 -translate-y-1/2'
        : layout.align === 'end'
          ? 'bottom-5'
          : 'top-5',
    )
  }

  return mergeClassNames(
    'left-[-6px] border-l border-b',
    pointAtCenter || layout.align === 'center'
      ? 'top-1/2 -translate-y-1/2'
      : layout.align === 'end'
        ? 'bottom-5'
        : 'top-5',
  )
}

/** 解析 Button Size Class Name 的内部工具函数。 */
const resolveButtonSizeClassName = (size?: PopconfirmButtonProps['size']) => {
  switch (size) {
    case 'xs':
      return 'btn-xs'
    case 'sm':
    case 'small':
      return 'btn-sm'
    case 'lg':
    case 'large':
      return 'btn-lg'
    case 'xl':
      return 'btn-xl'
    case 'md':
    case 'middle':
    case 'medium':
    default:
      return 'btn-md'
  }
}

/** 解析 Button Tone Class Name 的内部工具函数。 */
const resolveButtonToneClassName = (color?: PopconfirmButtonProps['color'], danger?: boolean) => {
  const resolved = danger ? 'danger' : color
  if (!resolved || resolved === 'default') return ''
  return `btn-${resolved === 'danger' ? 'error' : resolved}`
}

/** 解析 Button Type Class Name 的内部工具函数。 */
const resolveButtonTypeClassName = (type?: PopconfirmButtonProps['type']) => {
  switch (type) {
    case 'outlined':
      return 'btn-outline'
    case 'dashed':
      return 'btn-dash'
    case 'filled':
      return 'btn-soft'
    case 'text':
      return 'btn-ghost'
    case 'link':
      return 'btn-link'
    default:
      return ''
  }
}

/** 解析 Ok Button Preset 的内部工具函数。 */
const resolveOkButtonPreset = (okType?: PopconfirmOkType): Partial<PopconfirmButtonProps> => {
  switch (okType) {
    case 'default':
      return {}
    case 'danger':
      return { color: 'danger' }
    case 'primary':
      return { color: 'primary' }
    case 'filled':
    case 'outlined':
    case 'dashed':
    case 'text':
    case 'link':
    case 'solid':
      return { type: okType }
    default:
      return { color: 'primary' }
  }
}

/** 解析 Action Button Class Name 的内部工具函数。 */
const resolveActionButtonClassName = (
  props: PopconfirmButtonProps | undefined,
  fallbackClassName: string,
  extraClassName?: string,
) => {
  return mergeClassNames(
    'btn',
    resolveButtonSizeClassName(props?.size),
    resolveButtonToneClassName(props?.color, props?.danger),
    resolveButtonTypeClassName(props?.type),
    props?.shape === 'circle' ? 'btn-circle' : '',
    props?.shape === 'square' ? 'btn-square' : '',
    props?.shape === 'round' ? 'rounded-full' : '',
    props?.block ? 'btn-block' : '',
    props?.wide ? 'btn-wide' : '',
    fallbackClassName,
    extraClassName,
    props?.className,
  )
}

/** 解析 Button Loading 的内部工具函数。 */
const resolveButtonLoading = (loading?: PopconfirmButtonProps['loading']) => {
  if (!loading) return { active: false, icon: undefined as any }
  if (typeof loading === 'object') {
    return { active: true, icon: loading.icon }
  }
  return { active: true, icon: undefined as any }
}

/** 渲染 Button Content 的内部工具函数。 */
const RenderButtonContent = ({
  arg0: props,
  arg1: fallbackLabel,
  arg2: loading,
}: {
  arg0: PopconfirmButtonProps | undefined
  arg1: any
  arg2?: boolean
}) => {
  const hasChildren = isRenderable(props?.children)
  const loadingConfig = resolveButtonLoading(props?.loading)
  const shouldShowIcon = !!loading || !!props?.icon

  if (props?.iconPlacement === 'end') {
    return (
      <>
        <span>{String(hasChildren ? props?.children : fallbackLabel)}</span>
        {shouldShowIcon ? (
          <span className="inline-flex items-center justify-center">
            {loading ? (
              <span aria-hidden="true" className="loading loading-spinner loading-xs" />
            ) : (
              <span>{String(props?.icon ?? '')}</span>
            )}
          </span>
        ) : null}
      </>
    )
  }

  return (
    <>
      {shouldShowIcon ? (
        <span className="inline-flex items-center justify-center">
          {loading ? (
            <span aria-hidden="true" className="loading loading-spinner loading-xs" />
          ) : (
            <span>{String(props?.icon ?? '')}</span>
          )}
        </span>
      ) : null}
      <span>{String(hasChildren ? props?.children : fallbackLabel)}</span>
    </>
  )
}

/** Popconfirm 的内部工具函数。 */
const Popconfirm: FC<PopconfirmProps> = ({
  title,
  description,
  disabled,
  placement = 'top',
  trigger,
  arrow = true,
  open,
  defaultOpen = false,
  icon,
  okText = '确认',
  cancelText = '取消',
  okType = 'primary',
  okButtonProps,
  cancelButtonProps,
  showCancel = true,
  className,
  style,
  overlayClassName,
  overlayStyle,
  classNames,
  styles,
  onConfirm,
  onCancel,
  onOpenChange,
  onPopupClick,
  children,
  ...rest
}) => {
  const uncontrolledOpen = ref(defaultOpen)
  const currentOpenRef = ref(open ?? defaultOpen)
  const currentTriggers = ref(normalizeTrigger(trigger))
  const confirmLoading = ref(false)
  const titleId = ref(`rue-popconfirm-title-${popconfirmIdSeed++}`)
  const descriptionId = ref(`rue-popconfirm-desc-${popconfirmIdSeed++}`)
  const isControlled = open !== undefined
  const resolvedTitle = title
  const resolvedDescription = description
  const resolvedIcon = icon
  const okPreset = resolveOkButtonPreset(okType)
  const pointAtCenter = typeof arrow === 'object' && !!arrow.pointAtCenter
  const showArrow = arrow !== false
  const resolvedOkLoading = resolveButtonLoading(okButtonProps?.loading)
  const isOkLoading = () => confirmLoading.value || resolvedOkLoading.active
  const hasTrigger = (type: PopconfirmTrigger) => currentTriggers.value.includes(type)
  let rootElement: HTMLElement | null = null
  let hoverCloseTimer: ReturnType<typeof setTimeout> | null = null

  const setRootElement = (element: HTMLElement | null) => {
    if (rootElement === element) return
    if (rootElement && typeof rootElement.removeEventListener === 'function') {
      rootElement.removeEventListener('focusin', handleNativeFocusIn)
      rootElement.removeEventListener('focusout', handleNativeFocusOut)
    }
    rootElement = element
    if (rootElement && typeof rootElement.addEventListener === 'function') {
      rootElement.addEventListener('focusin', handleNativeFocusIn)
      rootElement.addEventListener('focusout', handleNativeFocusOut)
    }
  }

  const clearHoverCloseTimer = () => {
    if (!hoverCloseTimer) return
    clearTimeout(hoverCloseTimer)
    hoverCloseTimer = null
  }

  watch(
    () => open,
    nextOpen => {
      if (typeof nextOpen === 'boolean') {
        currentOpenRef.value = nextOpen
        if (!nextOpen) confirmLoading.value = false
        return
      }
      currentOpenRef.value = uncontrolledOpen.value
    },
    { immediate: true },
  )

  watch(
    () => defaultOpen,
    nextDefaultOpen => {
      if (isControlled) return
      uncontrolledOpen.value = !!nextDefaultOpen
      currentOpenRef.value = !!nextDefaultOpen
    },
    { immediate: true },
  )

  watch(
    () => trigger,
    (nextTrigger: PopconfirmTrigger | PopconfirmTrigger[] | undefined) => {
      currentTriggers.value = normalizeTrigger(nextTrigger)
    },
    { immediate: true },
  )

  const requestOpenChange = (nextOpen: boolean) => {
    clearHoverCloseTimer()
    if (disabled) return
    const currentPanel = (rootElement?.parentElement ?? document).querySelector(
      '[role="alertdialog"]',
    ) as HTMLElement | null
    const actualOpen = currentPanel?.getAttribute('data-rue-popconfirm-panel') === 'true'
    if (nextOpen === actualOpen) return
    if (!isControlled) uncontrolledOpen.value = nextOpen
    currentOpenRef.value = nextOpen
    if (!nextOpen) confirmLoading.value = false
    onOpenChange?.(nextOpen)
    const syncPanel = () => {
      const scope = rootElement?.parentElement ?? document
      const overlay = scope.querySelector(
        '[data-rue-popconfirm-overlay="true"]',
      ) as HTMLElement | null
      const panel = overlay?.querySelector('[role="alertdialog"]') as HTMLElement | null
      overlay?.setAttribute('aria-hidden', nextOpen ? 'false' : 'true')
      if (panel) {
        if (nextOpen) panel.setAttribute('data-rue-popconfirm-panel', 'true')
        else panel.removeAttribute('data-rue-popconfirm-panel')
      }
    }
    syncPanel()
    queueMicrotask(syncPanel)
  }

  const scheduleHoverClose = () => {
    clearHoverCloseTimer()
    hoverCloseTimer = setTimeout(() => {
      hoverCloseTimer = null
      requestOpenChange(false)
    }, HOVER_CLOSE_DELAY_MS)
  }

  const handleWindowClick = (event: MouseEvent) => {
    if (!currentOpenRef.value) return
    if (!(hasTrigger('click') || hasTrigger('contextMenu'))) return
    if (rootElement?.contains(event.target as Node)) return
    requestOpenChange(false)
  }

  const handleWindowKeyDown = (event: KeyboardEvent) => {
    if (!currentOpenRef.value || event.key !== 'Escape') return
    requestOpenChange(false)
  }

  const handleNativeFocusIn = (event: FocusEvent) => {
    if (!hasTrigger('focus')) return
    onFocus?.(event as any)
    if (!event.defaultPrevented) requestOpenChange(true)
  }

  const handleNativeFocusOut = (event: FocusEvent) => {
    if (!hasTrigger('focus')) return
    onBlur?.(event as any)
    if (event.defaultPrevented) return
    const nextTarget = event.relatedTarget as Node | null
    if (nextTarget && rootElement?.contains(nextTarget)) return
    requestOpenChange(false)
  }

  onMounted(() => {
    if (typeof window === 'undefined') return
    window.addEventListener('click', handleWindowClick, true)
    window.addEventListener('keydown', handleWindowKeyDown)
  })

  onUnmounted(() => {
    clearHoverCloseTimer()
    setRootElement(null)
    if (typeof window === 'undefined') return
    window.removeEventListener('click', handleWindowClick, true)
    window.removeEventListener('keydown', handleWindowKeyDown)
  })

  const handleCancel = (event: MouseEvent) => {
    callHandler(cancelButtonProps?.onClick, event)
    if ((event as Event).defaultPrevented) return
    requestOpenChange(false)
    onCancel?.(event)
  }

  const handleConfirm = async (event: MouseEvent) => {
    if (confirmLoading.value) return
    callHandler(okButtonProps?.onClick, event)
    if ((event as Event).defaultPrevented) return

    const result = onConfirm?.(event)
    if (result === false) return

    if (isPromiseLike(result)) {
      confirmLoading.value = true
      currentOpenRef.value = true
      try {
        const settled = await result
        if (settled !== false) requestOpenChange(false)
      } catch {
        // 保持浮层打开，交给业务决定如何反馈失败。
      } finally {
        confirmLoading.value = false
      }
      return
    }

    requestOpenChange(false)
  }

  const { onMouseEnter, onMouseLeave, onFocus, onBlur, onClick, onContextMenu, ...domProps } = rest

  const rootClassName = mergeClassNames(
    'relative inline-flex max-w-full align-top',
    classNames?.root,
    className,
  )
  const triggerClassName = mergeClassNames(
    'inline-flex max-w-full items-stretch',
    classNames?.trigger,
  )
  const overlayClass = mergeClassNames(
    'absolute z-50 w-max max-w-[min(24rem,calc(100vw-2rem))] transform-gpu transition duration-150 ease-out',
    getOverlayPlacementClass(placement),
    getTransformOriginClass(placement),
    classNames?.overlay,
    overlayClassName,
  )
  const arrowClassName = mergeClassNames(
    'absolute block h-3 w-3 rotate-45 border-base-300/80 bg-base-100/95',
    resolveArrowClassName(placement, pointAtCenter),
    classNames?.arrow,
  )

  return (
    <div
      {...domProps}
      ref={setRootElement}
      className={rootClassName}
      style={serializeStyle(
        mergeStyles(typeof style === 'string' ? undefined : style, styles?.root),
      )}
      onMouseEnter={(event: any) => {
        callHandler(onMouseEnter, event)
        if (!event?.defaultPrevented && hasTrigger('hover')) requestOpenChange(true)
      }}
      onMouseLeave={(event: any) => {
        callHandler(onMouseLeave, event)
        if (!event?.defaultPrevented && hasTrigger('hover')) scheduleHoverClose()
      }}
      onFocus={(event: any) => {
        callHandler(onFocus, event)
      }}
      onBlur={(event: any) => {
        callHandler(onBlur, event)
      }}
    >
      <div
        className={triggerClassName}
        style={serializeStyle(styles?.trigger)}
        aria-haspopup="dialog"
        aria-expanded={String(currentOpenRef.value)}
        onClick={(event: any) => {
          callHandler(onClick, event)
          if (!event?.defaultPrevented && hasTrigger('click')) {
            requestOpenChange(!currentOpenRef.value)
          }
        }}
        onContextMenu={(event: any) => {
          callHandler(onContextMenu, event)
          if (!event?.defaultPrevented && hasTrigger('contextMenu')) {
            if (typeof event.preventDefault === 'function') event.preventDefault()
            requestOpenChange(!currentOpenRef.value)
          }
        }}
      >
        {children}
      </div>

      <div
        data-rue-popconfirm-overlay="true"
        className={overlayClass}
        style={serializeStyle(mergeStyles(styles?.overlay, overlayStyle))}
        aria-hidden={currentOpenRef.value ? 'false' : 'true'}
      >
        {showArrow ? (
          <span className={arrowClassName} style={serializeStyle(styles?.arrow)} />
        ) : null}
        <div
          data-rue-popconfirm-panel={currentOpenRef.value ? 'true' : undefined}
          role="alertdialog"
          aria-modal="false"
          aria-labelledby={isRenderable(resolvedTitle) ? titleId.value : undefined}
          aria-describedby={isRenderable(resolvedDescription) ? descriptionId.value : undefined}
          className={mergeClassNames(
            'space-y-4 rounded-[1.15rem] border border-base-300/80 bg-base-100/95 p-4 shadow-[0_20px_48px_-28px_rgba(15,23,42,0.55)] backdrop-blur',
            classNames?.panel,
          )}
          style={serializeStyle(styles?.panel)}
          onClick={(event: MouseEvent) => {
            onPopupClick?.(event)
          }}
        >
          <div
            className={mergeClassNames('flex items-start gap-3', classNames?.body)}
            style={serializeStyle(styles?.body)}
          >
            {isRenderable(resolvedIcon) ? (
              <div
                className={mergeClassNames('mt-0.5 shrink-0', classNames?.icon)}
                style={serializeStyle(styles?.icon)}
              >
                {String(resolvedIcon)}
              </div>
            ) : icon === undefined ? (
              <div
                className={mergeClassNames('mt-0.5 shrink-0', classNames?.icon)}
                style={serializeStyle(styles?.icon)}
              >
                <span
                  aria-hidden="true"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-warning/12 text-warning ring-1 ring-inset ring-warning/25"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.5v4.75" />
                    <circle cx="12" cy="16.3" r="0.75" fill="currentColor" stroke="none" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.04 3.77 3.9 14.08A2 2 0 0 0 5.63 17h12.74a2 2 0 0 0 1.72-2.92L13.96 3.77a2.25 2.25 0 0 0-3.92 0Z"
                    />
                  </svg>
                </span>
              </div>
            ) : null}
            <div className="min-w-0 flex-1 space-y-1.5">
              {isRenderable(resolvedTitle) ? (
                <div
                  id={titleId.value}
                  className={mergeClassNames(
                    'text-sm font-semibold leading-5 text-base-content',
                    classNames?.title,
                  )}
                  style={serializeStyle(styles?.title)}
                >
                  {String(resolvedTitle)}
                </div>
              ) : null}
              {isRenderable(resolvedDescription) ? (
                <div
                  id={descriptionId.value}
                  className={mergeClassNames(
                    'text-xs leading-5 text-base-content/70',
                    classNames?.description,
                  )}
                  style={serializeStyle(styles?.description)}
                >
                  {String(resolvedDescription)}
                </div>
              ) : null}
            </div>
          </div>

          <div
            className={mergeClassNames(
              'flex items-center justify-end gap-2 border-t border-base-200/80 pt-3',
              classNames?.footer,
            )}
            style={serializeStyle(styles?.footer)}
          >
            {showCancel ? (
              <button
                data-rue-popconfirm-action="cancel"
                type={cancelButtonProps?.htmlType ?? 'button'}
                className={resolveActionButtonClassName(
                  {
                    ...cancelButtonProps,
                    type: cancelButtonProps?.type ?? 'text',
                    size: cancelButtonProps?.size ?? 'small',
                  },
                  '',
                  classNames?.cancelButton,
                )}
                style={serializeStyle(mergeStyles(styles?.cancelButton, cancelButtonProps?.style))}
                disabled={cancelButtonProps?.disabled}
                aria-disabled={String(!!cancelButtonProps?.disabled)}
                onClick={handleCancel}
              >
                <RenderButtonContent arg0={cancelButtonProps} arg1={cancelText} />
              </button>
            ) : null}

            <button
              data-rue-popconfirm-action="ok"
              type={okButtonProps?.htmlType ?? 'button'}
              className={resolveActionButtonClassName(
                {
                  ...okPreset,
                  ...okButtonProps,
                  size: okButtonProps?.size ?? 'small',
                },
                okType === 'default' ? '' : 'btn-primary',
                classNames?.okButton,
              )}
              style={serializeStyle(mergeStyles(styles?.okButton, okButtonProps?.style))}
              disabled={!!okButtonProps?.disabled || isOkLoading()}
              aria-disabled={String(!!okButtonProps?.disabled || isOkLoading())}
              aria-busy={String(isOkLoading())}
              onClick={handleConfirm}
            >
              <RenderButtonContent arg0={okButtonProps} arg1={okText} arg2={isOkLoading()} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** 默认导出气泡确认组件。 */
export default Popconfirm
