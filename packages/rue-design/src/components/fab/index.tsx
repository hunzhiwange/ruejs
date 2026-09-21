import { computed, Template } from '@rue-js/rue'
/*
Fab 模块概述
- 汇总悬浮按钮组件的公开类型、渲染入口和局部工具逻辑。
- 导出注释用于 API 文档生成，内部注释标明状态归一化、样式映射与 DOM 交互边界。
*/
import { onMounted, onUnmounted, ref, type FC, watch } from '@rue-js/rue'
import Badge from '../badge'
import type { BadgeProps } from '../badge'
import Button from '../button'
import type { ButtonColor, ButtonHTMLType } from '../button'
import Tooltip from '../tooltip'
import type { TooltipPlacement, TooltipProps } from '../tooltip'

/** FabType 视觉或语义变体类型。 */
export type FabType = 'default' | 'primary'
/** FabShape 类型。 */
export type FabShape = 'circle' | 'square'
/** FabTriggerMode 类型。 */
export type FabTriggerMode = 'click' | 'hover'
/** FabPlacement 位置或方向类型。 */
export type FabPlacement = 'top' | 'bottom' | 'left' | 'right'

/** FabBadgeProps 组件属性。 */
export interface FabBadgeProps extends Omit<BadgeProps, 'children'> {}

/** FabActionProps 组件属性。 */
export interface FabActionProps {
  /** 数据项唯一标识。 */
  key?: string | number
  /** 图标内容。 */
  icon?: any
  /** 主体内容。 */
  content?: any
  /** 描述内容。 */
  description?: any
  /** tooltip 配置项。 */
  tooltip?: any
  /** badge 配置项。 */
  badge?: FabBadgeProps
  /** 组件类型或语义类型。 */
  type?: FabType
  /** 组件语义色。 */
  color?: ButtonColor
  /** 组件形状。 */
  shape?: FabShape
  /** 链接地址。 */
  href?: string
  /** 链接或定位目标。 */
  target?: string
  /** 原生 button type 属性。 */
  htmlType?: ButtonHTMLType
  /** 是否禁用交互。 */
  disabled?: boolean
  /** closeOnClick 配置项。 */
  closeOnClick?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 点击时触发的回调。 */
  onClick?: (event: MouseEvent) => void
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

/** FabProps 组件属性。 */
export interface FabProps extends FabActionProps {
  /** flower 配置项。 */
  flower?: boolean
  /** 数据驱动渲染项。 */
  items?: FabActionProps[]
  /** trigger 区域配置。 */
  trigger?: FabTriggerMode
  /** 受控打开状态。 */
  open?: boolean
  /** 非受控初始打开状态。 */
  defaultOpen?: boolean
  /** 弹出层或内容展示位置。 */
  placement?: FabPlacement
  /** closeIcon 图标内容。 */
  closeIcon?: any
  /** menuIcon 图标内容。 */
  menuIcon?: any
  /** panelClassName 附加类名。 */
  panelClassName?: string
  /** 打开状态变化时触发的回调。 */
  onOpenChange?: (open: boolean) => void
}

interface FabPartProps {
  as?: string
  className?: string
  children?: any
  tabIndex?: number
  role?: string
  [key: string]: any
}

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (...parts: Array<string | undefined | false | null>) =>
  parts.filter(Boolean).join(' ')

/** 判断是否存在 Renderable Content 的内部工具函数。 */
const hasRenderableContent = (value: any): boolean =>
  value != null && value !== false && value !== ''

/** 判断是否存在 Structured Fab Props 的内部工具函数。 */
const hasStructuredFabProps = (props: FabProps) => {
  return (
    props.items !== undefined ||
    props.trigger !== undefined ||
    props.open !== undefined ||
    props.defaultOpen !== undefined ||
    props.icon !== undefined ||
    props.content !== undefined ||
    props.description !== undefined ||
    props.tooltip !== undefined ||
    props.badge !== undefined ||
    props.type !== undefined ||
    props.color !== undefined ||
    props.shape !== undefined ||
    props.href !== undefined ||
    props.target !== undefined ||
    props.htmlType !== undefined ||
    props.closeIcon !== undefined ||
    props.menuIcon !== undefined ||
    props.panelClassName !== undefined ||
    props.onOpenChange !== undefined
  )
}

/** 解析 Action Color 的内部工具函数。 */
const resolveActionColor = (type?: FabType, color?: ButtonColor): ButtonColor | undefined => {
  if (color) return color
  return type === 'primary' ? 'primary' : 'default'
}

/** 解析 Shape 的内部工具函数。 */
const resolveShape = (shape: FabShape | undefined, content: any) => {
  if (shape) return shape
  return hasRenderableContent(content) ? 'square' : 'circle'
}

/** 判断 Tooltip Config 的内部工具函数。 */
const isTooltipConfig = (tooltip: any): tooltip is TooltipProps => {
  if (!tooltip || typeof tooltip !== 'object' || Array.isArray(tooltip)) return false
  return [
    'title',
    'content',
    'overlay',
    'tip',
    'placement',
    'color',
    'trigger',
    'open',
    'defaultOpen',
    'disabled',
  ].some(key => key in tooltip)
}

/** Maybe Tooltip 的内部工具函数。 */
const MaybeTooltip: FC<{ tooltip?: any; placement: TooltipPlacement; children?: any }> = ({
  tooltip,
  placement,
  children,
}) => {
  if (tooltip == null || tooltip === false) return <>{children}</>
  if (isTooltipConfig(tooltip)) {
    return (
      <Tooltip placement={tooltip.placement ?? placement} {...tooltip}>
        {children}
      </Tooltip>
    )
  }
  return (
    <Tooltip title={tooltip} placement={placement}>
      {children}
    </Tooltip>
  )
}

/** Maybe Badge 的内部工具函数。 */
const MaybeBadge: FC<{ badge?: FabBadgeProps; children?: any }> = ({ badge, children }) => {
  if (!badge) return <>{children}</>
  return <Badge {...badge}>{children}</Badge>
}

/** Default Menu Icon 的内部工具函数。 */
const DefaultMenuIcon: FC = () => (
  <span aria-hidden="true" className="text-xl leading-none">
    +
  </span>
)

/** Default Close Icon 的内部工具函数。 */
const DefaultCloseIcon: FC = () => (
  <span aria-hidden="true" className="text-lg leading-none">
    x
  </span>
)

/** 读取 Menu Open Icon 的内部工具函数。 */
const RenderMenuOpenIcon = ({ arg0: menuIcon, arg1: icon }: { arg0: any; arg1: any }) => {
  if (menuIcon != null) return <span>{menuIcon}</span>
  if (icon != null) return <span>{icon}</span>
  return <DefaultMenuIcon />
}

/** Fab Toggle Icon 的内部工具函数。 */
const FabToggleIcon: FC<{
  open?: boolean
  icon?: any
  closeIcon?: any
  menuIcon?: any
}> = ({ open, icon, closeIcon, menuIcon }) => {
  return (
    <span data-rue-fab-toggle-icon="true" className="inline-flex items-center justify-center">
      <span data-rue-fab-open-icon="true" className={open ? 'hidden' : undefined}>
        <RenderMenuOpenIcon arg0={menuIcon} arg1={icon} />
      </span>
      <span data-rue-fab-close-icon="true" className={open ? undefined : 'hidden'}>
        {closeIcon != null ? <span>{closeIcon}</span> : <DefaultCloseIcon />}
      </span>
    </span>
  )
}

/** 渲染 Fab Toggle Icon 的内部工具函数。 */
const RenderFabToggleIcon = ({
  arg0: open,
  arg1: icon,
  arg2: closeIcon,
  arg3: menuIcon,
}: {
  arg0: boolean | undefined
  arg1: any
  arg2: any
  arg3: any
}) => {
  return <FabToggleIcon open={open} icon={icon} closeIcon={closeIcon} menuIcon={menuIcon} />
}

/** Action Button 的内部工具函数。 */
const ActionButton: FC<
  FabActionProps & {
    tooltipPlacement?: TooltipPlacement
    menuAction?: boolean
    open?: boolean
    closeIcon?: any
    menuIcon?: any
    onActionClick?: (event: MouseEvent, item: FabActionProps) => void
  }
> = ({
  icon,
  content,
  description,
  tooltip,
  badge,
  type,
  color,
  shape,
  href,
  target,
  htmlType,
  disabled,
  className,
  children,
  closeOnClick,
  onClick,
  tooltipPlacement = 'left',
  menuAction,
  open,
  closeIcon,
  menuIcon,
  onActionClick,
  ...rest
}) => {
  const mergedContent = hasRenderableContent(children) ? children : (content ?? description)
  const resolvedShape = resolveShape(shape, mergedContent)
  const actionClassName = mergeClassName(
    'shadow-lg transition-all duration-200',
    resolvedShape === 'circle'
      ? 'size-14 p-0'
      : 'h-auto min-h-20 w-20 rounded-3xl px-3 py-3 text-center text-xs leading-tight',
    className,
  )

  const handleClick = (event: MouseEvent) => {
    if (onClick) onClick(event)
    if (onActionClick)
      onActionClick(event, {
        ...rest,
        icon,
        content,
        description,
        tooltip,
        badge,
        type,
        color,
        shape,
        href,
        target,
        htmlType,
        disabled,
        className,
        children,
        closeOnClick,
        onClick,
      })
  }

  const buttonProps = {
    ...rest,
    href,
    target,
    htmlType,
    size: 'large' as const,
    color: resolveActionColor(type, color),
    shape: resolvedShape === 'circle' ? ('circle' as const) : undefined,
    iconPlacement: 'start' as const,
    disabled,
    className: actionClassName,
    'aria-label':
      rest['aria-label'] ?? (typeof mergedContent === 'string' ? mergedContent : undefined),
    onClick: menuAction ? undefined : handleClick,
    ref: menuAction
      ? (element: HTMLElement | null) => {
          if (element) element.onclick = handleClick
        }
      : undefined,
  }

  if (menuAction) {
    return (
      <span style={{ display: 'contents' }}>
        <MaybeTooltip tooltip={tooltip} placement={tooltipPlacement}>
          <MaybeBadge badge={badge}>
            <Button {...buttonProps}>
              <Template slot="icon">
                <RenderFabToggleIcon arg0={open} arg1={icon} arg2={closeIcon} arg3={menuIcon} />
              </Template>
              {resolvedShape === 'circle' ? null : <span>{mergedContent ?? ''}</span>}
            </Button>
          </MaybeBadge>
        </MaybeTooltip>
      </span>
    )
  }

  return (
    <span style={{ display: 'contents' }}>
      <MaybeTooltip tooltip={tooltip} placement={tooltipPlacement}>
        <MaybeBadge badge={badge}>
          <Button {...buttonProps}>
            <Template slot="icon">
              <span data-rue-fab-icon="true">{icon ?? ''}</span>
            </Template>
            {resolvedShape === 'circle' ? null : <span>{mergedContent ?? ''}</span>}
          </Button>
        </MaybeBadge>
      </MaybeTooltip>
    </span>
  )
}

/** 读取 Linear Panel Position 的内部工具函数。 */
const getLinearPanelPosition = (placement: FabPlacement) => {
  switch (placement) {
    case 'bottom':
      return {
        wrapper: 'top-full pt-3 right-0',
        list: 'flex-col',
        tooltipPlacement: 'leftTop' as TooltipPlacement,
      }
    case 'left':
      return {
        wrapper: 'right-full pr-3 top-1/2 -translate-y-1/2',
        list: 'flex-row-reverse',
        tooltipPlacement: 'top' as TooltipPlacement,
      }
    case 'right':
      return {
        wrapper: 'left-full pl-3 top-1/2 -translate-y-1/2',
        list: 'flex-row',
        tooltipPlacement: 'top' as TooltipPlacement,
      }
    default:
      return {
        wrapper: 'bottom-full pb-3 right-0',
        list: 'flex-col-reverse',
        tooltipPlacement: 'leftTop' as TooltipPlacement,
      }
  }
}

/** 读取 Flower Offset 的内部工具函数。 */
const getFlowerOffset = (index: number, count: number) => {
  const steps = Math.max(Math.min(count, 4), 1) - 1
  const start = 180
  const end = 270
  const angle = steps === 0 ? 225 : start + ((end - start) / steps) * index
  const radius = 84
  const radians = (angle * Math.PI) / 180
  return {
    x: Math.round(Math.cos(radians) * radius),
    y: Math.round(Math.sin(radians) * radius),
  }
}

/** Item 的内部工具函数。 */
const Item: FC<FabActionProps> = props => {
  return <ActionButton {...props} />
}

/** Fab 的内部工具函数。 */
const Fab: FC<FabProps> = props => {
  const CompiledRow1 = ({ rowArg0, rowArg1 }: { rowArg0: any; rowArg1: any }) => {
    const item = rowArg0
    const index = rowArg1

    const key = item.key ?? `${placement}-${index}`
    if (flower) {
      const offset = getFlowerOffset(index, items.length)
      return (
        <div
          className={mergeClassName(
            'absolute right-0 top-0 transition-all duration-200',
            mergedOpen.get()
              ? 'pointer-events-auto opacity-100 scale-100'
              : 'pointer-events-none opacity-0 scale-75',
          )}
          style={{
            transform: mergedOpen.get()
              ? `translate(${offset.x}px, ${offset.y}px)`
              : 'translate(0px, 0px)',
          }}
        >
          <ActionButton
            {...item}
            tooltipPlacement={
              item.tooltip && item.shape !== 'square' ? 'left' : linearPanel.tooltipPlacement
            }
            onActionClick={handleItemClick}
          />
        </div>
      )
    }

    return (
      <ActionButton
        {...item}
        tooltipPlacement={
          item.tooltip && item.shape !== 'square' ? 'left' : linearPanel.tooltipPlacement
        }
        onActionClick={handleItemClick}
      />
    )
  }

  if (!hasStructuredFabProps(props)) {
    const { flower, className, children, ...rest } = props
    let cls = 'fab'
    if (flower) cls += ' fab-flower'
    if (className) cls += ` ${className}`

    return (
      <div {...rest} className={cls}>
        {children}
      </div>
    )
  }

  const {
    flower,
    items = [],
    trigger,
    open,
    defaultOpen = false,
    placement = 'top',
    closeIcon,
    menuIcon,
    panelClassName,
    onOpenChange,
    className,
    children,
    onClick,
    onMouseEnter,
    onMouseLeave,
    ...actionProps
  } = props
  const mergedTrigger = trigger ?? (items.length ? 'click' : undefined)
  const rootProps = { ...actionProps }
  delete rootProps.icon
  delete rootProps.content
  delete rootProps.description
  delete rootProps.tooltip
  delete rootProps.badge
  delete rootProps.type
  delete rootProps.color
  delete rootProps.shape
  delete rootProps.href
  delete rootProps.target
  delete rootProps.htmlType
  delete rootProps.disabled
  delete rootProps.closeOnClick

  const isControlled = typeof open === 'boolean'
  const uncontrolledOpen = ref(defaultOpen)
  const currentOpenState = ref(isControlled ? !!open : uncontrolledOpen.value)
  const setCurrentOpen = (value: boolean) => {
    currentOpenState.value = value
  }
  const currentTrigger = ref(mergedTrigger)
  const mergedOpen = computed(() => currentOpenState.value)
  let rootElement: HTMLDivElement | null = null

  const requestOpenChange = (nextOpen: boolean) => {
    if (currentOpenState.value === nextOpen) return
    setCurrentOpen(nextOpen)
    if (onOpenChange) onOpenChange(nextOpen)
  }

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
    () => mergedTrigger,
    (nextTrigger: FabTriggerMode | undefined) => {
      currentTrigger.value = nextTrigger
    },
    { immediate: true },
  )

  onMounted(() => {
    if (typeof window === 'undefined') return

    const outsideClickCandidates = new WeakSet<Event>()
    const captureWindowClick = (event: MouseEvent) => {
      const isOpen =
        rootElement?.querySelector('[aria-expanded]')?.getAttribute('aria-expanded') === 'true'
      if (!isOpen || currentTrigger.value !== 'click') return
      const eventTarget = event.target as Element | null
      const eventFabRoot = eventTarget?.closest?.('[data-rue-fab-root="true"]')
      if (rootElement ? rootElement.contains(eventTarget as Node) : eventFabRoot) return
      outsideClickCandidates.add(event)
    }

    const handleWindowClick = (event: MouseEvent) => {
      if (!outsideClickCandidates.has(event)) return
      requestOpenChange(false)
    }

    const handleWindowKeydown = (event: KeyboardEvent) => {
      if (!currentOpenState.value || currentTrigger.value !== 'click' || event.key !== 'Escape')
        return
      requestOpenChange(false)
    }

    window.addEventListener('click', captureWindowClick, true)
    window.addEventListener('click', handleWindowClick)
    window.addEventListener('keydown', handleWindowKeydown)

    onUnmounted(() => {
      window.removeEventListener('click', captureWindowClick, true)
      window.removeEventListener('click', handleWindowClick)
      window.removeEventListener('keydown', handleWindowKeydown)
    })
  })

  const isMenuMode = !!items.length || !!trigger
  const panelStateClassName = () =>
    mergedOpen.get()
      ? 'pointer-events-auto opacity-100 scale-100'
      : 'pointer-events-none opacity-0 scale-95'
  const linearPanel = getLinearPanelPosition(placement)

  const handleSingleButtonClick = (event: MouseEvent) => {
    if (onClick) onClick(event)
  }

  const handleMenuButtonClick = (event: MouseEvent) => {
    if (currentTrigger.value === 'click') {
      requestOpenChange(!currentOpenState.value)
    }
    if (onClick) onClick(event)
  }

  const handleItemClick = (event: MouseEvent, item: FabActionProps) => {
    if (mergedTrigger === 'click' && item.closeOnClick !== false) {
      requestOpenChange(false)
    }
  }

  return (
    <div
      {...rootProps}
      ref={(element: HTMLDivElement | null) => {
        rootElement = element
      }}
      className={mergeClassName(
        'rue-fab pointer-events-none relative inline-flex items-end justify-end',
        flower ? 'min-h-[14rem] min-w-[14rem]' : undefined,
        className,
      )}
      onMouseEnter={(event: MouseEvent) => {
        if (mergedTrigger === 'hover') requestOpenChange(true)
        if (onMouseEnter) onMouseEnter(event)
      }}
      onMouseLeave={(event: MouseEvent) => {
        if (mergedTrigger === 'hover') requestOpenChange(false)
        if (onMouseLeave) onMouseLeave(event)
      }}
      data-rue-fab-root="true"
    >
      {isMenuMode ? (
        flower ? (
          <div
            className={mergeClassName('pointer-events-none absolute inset-0', panelClassName)}
            aria-hidden={mergedOpen.get() ? 'false' : 'true'}
          >
            {items.map((rowArg0: any, rowArg1: number) => (
              <CompiledRow1 rowArg0={rowArg0} rowArg1={rowArg1} />
            ))}
          </div>
        ) : (
          <div
            data-rue-fab-panel="true"
            className={mergeClassName(
              'absolute transition-all duration-200',
              linearPanel.wrapper,
              panelStateClassName(),
              panelClassName,
            )}
            aria-hidden={mergedOpen.get() ? 'false' : 'true'}
          >
            <div className={mergeClassName('flex gap-3', linearPanel.list)}>
              {items.map((rowArg0: any, rowArg1: number) => (
                <CompiledRow1 rowArg0={rowArg0} rowArg1={rowArg1} />
              ))}
            </div>
          </div>
        )
      ) : null}
      <div className="pointer-events-auto relative z-1">
        <ActionButton
          content={actionProps.content}
          description={actionProps.description}
          tooltip={actionProps.tooltip}
          badge={actionProps.badge}
          type={actionProps.type}
          color={actionProps.color}
          shape={actionProps.shape}
          href={actionProps.href}
          target={actionProps.target}
          htmlType={actionProps.htmlType}
          disabled={actionProps.disabled}
          className={actionProps.className}
          style={actionProps.style}
          size={actionProps.size}
          aria-label={actionProps['aria-label']}
          icon={actionProps.icon}
          onClick={isMenuMode ? handleMenuButtonClick : handleSingleButtonClick}
          tooltipPlacement={linearPanel.tooltipPlacement}
          menuAction={isMenuMode}
          open={mergedOpen.get()}
          closeIcon={closeIcon}
          menuIcon={menuIcon}
          aria-expanded={isMenuMode ? (mergedOpen.get() ? 'true' : 'false') : undefined}
        />
      </div>
    </div>
  )
}

/** Trigger 的内部工具函数。 */
const Trigger: FC<FabPartProps> = ({ as = 'div', className, children, ...rest }) => {
  const Component = as as any
  const triggerProps: Record<string, any> = { ...rest }

  if (as === 'div') {
    if (typeof triggerProps.tabindex !== 'string') {
      const tabIndex = triggerProps.tabIndex
      triggerProps.tabindex = typeof tabIndex === 'number' ? String(tabIndex) : '0'
    }
    delete triggerProps.tabIndex
    if (!triggerProps.role) {
      triggerProps.role = 'button'
    }
  }

  return Component === 'div' ? (
    <div {...triggerProps} className={className}>
      {children}
    </div>
  ) : Component === 'span' ? (
    <span {...triggerProps} className={className}>
      {children}
    </span>
  ) : Component === 'button' ? (
    <button {...triggerProps} className={className}>
      {children}
    </button>
  ) : (
    <></>
  )
}

/** Close 的内部工具函数。 */
const Close: FC<FabPartProps> = ({ as = 'div', className, children, ...rest }) => {
  const Component = as as any
  return Component === 'div' ? (
    <div {...rest} className={mergeClassName('fab-close', className)}>
      {children}
    </div>
  ) : Component === 'span' ? (
    <span {...rest} className={mergeClassName('fab-close', className)}>
      {children}
    </span>
  ) : Component === 'button' ? (
    <button {...rest} className={mergeClassName('fab-close', className)}>
      {children}
    </button>
  ) : (
    <></>
  )
}

/** Main Action 的内部工具函数。 */
const MainAction: FC<FabPartProps> = ({ as = 'div', className, children, ...rest }) => {
  const Component = as as any
  return Component === 'div' ? (
    <div {...rest} className={mergeClassName('fab-main-action', className)}>
      {children}
    </div>
  ) : Component === 'span' ? (
    <span {...rest} className={mergeClassName('fab-main-action', className)}>
      {children}
    </span>
  ) : Component === 'button' ? (
    <button {...rest} className={mergeClassName('fab-main-action', className)}>
      {children}
    </button>
  ) : (
    <></>
  )
}

type FabCompound = FC<FabProps> & {
  Trigger: FC<FabPartProps>
  Close: FC<FabPartProps>
  MainAction: FC<FabPartProps>
  Item: FC<FabActionProps>
}

const FabCompound: FabCompound = /*#__PURE__*/ Object.assign(Fab, {
  Trigger,
  Close,
  MainAction,
  Item,
})

/** 默认导出悬浮按钮组件。 */
export default FabCompound
