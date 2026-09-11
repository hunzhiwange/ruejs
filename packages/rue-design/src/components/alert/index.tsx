/*
Alert 组件概述
- 在 daisyUI 的 alert 视觉基础上，补齐更完整的 Rue 语义 API。
- 兼容旧版 variant/outline/dash/soft 写法，并补齐常用的 type、message、description、closable 等能力。
- 组件默认保持轻量结构；只有在出现标题、描述、图标、操作区时才渲染增强布局。
*/
import { ref, type FC } from '@rue-js/rue'

/** AlertTone 语义色类型。 */
export type AlertTone = 'default' | 'info' | 'success' | 'warning' | 'error'
/** AlertType 视觉或语义变体类型。 */
export type AlertType = Exclude<AlertTone, 'default'>
/** AlertDirection 位置或方向类型。 */
export type AlertDirection = 'vertical' | 'horizontal'

/** AlertProps 组件属性。 */
export interface AlertProps {
  /** 组件类型或语义类型。 */
  type?: AlertType
  /** 组件视觉变体。 */
  variant?: AlertType
  /** 组件语义色。 */
  color?: AlertTone
  /** outline 配置项。 */
  outline?: boolean
  /** dash 配置项。 */
  dash?: boolean
  /** soft 配置项。 */
  soft?: boolean
  /** 布局方向。 */
  direction?: AlertDirection
  /** 标题内容。 */
  title?: any
  /** message 配置项。 */
  message?: any
  /** 描述内容。 */
  description?: any
  /** showIcon 图标内容。 */
  showIcon?: boolean
  /** 图标内容。 */
  icon?: any
  /** banner 配置项。 */
  banner?: boolean
  /** closable 配置项。 */
  closable?: boolean
  /** closeText 文本内容。 */
  closeText?: any
  /** closeIcon 图标内容。 */
  closeIcon?: any
  /** action 配置项。 */
  /** 关闭时触发的回调。 */
  onClose?: (event: MouseEvent) => void
  /** afterClose 配置项。 */
  afterClose?: () => void
  /** role 配置项。 */
  role?: string
  /** 根节点附加类名。 */
  className?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface _GlyphIconProps {
  className?: string
}

/** 解析 Tone 的内部工具函数。 */
const resolveTone = ({
  type,
  variant,
  color,
  banner,
}: Pick<AlertProps, 'type' | 'variant' | 'color' | 'banner'>) => {
  if (type) return type
  if (variant) return variant
  if (color && color !== 'default') return color
  if (banner) return 'warning'
  return undefined
}

/** Alert 的内部工具函数。 */
const Alert: FC<AlertProps> = (
  {
    type,
    variant,
    color,
    outline,
    dash,
    soft,
    direction,
    title,
    message,
    description,
    showIcon,
    icon,
    banner,
    closable,
    closeText,
    closeIcon,
    onClose,
    afterClose,
    role = 'alert',
    className,
    children,
    ...rest
  },
  slots: Record<string, any> = {},
) => {
  const resolvedTone = resolveTone({ type, variant, color, banner })
  const resolvedTitle = title ?? message
  const hasDescription = description != null
  const hasStructuredText = resolvedTitle != null || hasDescription
  const isClosable = closable ?? (closeText != null || closeIcon != null)
  const shouldShowIcon = showIcon ?? !!(banner || hasStructuredText)
  const contentAlignment = hasStructuredText ? 'items-start' : 'items-center'
  const plainContentClass = hasStructuredText
    ? 'min-w-0 flex-1'
    : 'min-w-0 flex flex-1 items-center gap-2'
  const actionAlignment = hasStructuredText ? 'items-start' : 'items-center'
  const alertRole = role ?? 'alert'
  const defaultIconGlyph =
    resolvedTone === 'success'
      ? '✓'
      : resolvedTone === 'warning'
        ? '!'
        : resolvedTone === 'error'
          ? '×'
          : 'i'

  let cls = 'alert'
  if (resolvedTone) cls += ` alert-${resolvedTone}`
  if (outline) cls += ' alert-outline'
  if (dash) cls += ' alert-dash'
  if (soft) cls += ' alert-soft'
  if (direction) cls += ` alert-${direction}`
  if (hasStructuredText || shouldShowIcon) cls += ` ${contentAlignment} gap-3`
  if (banner) cls += ' rounded-box border border-current/10'
  if (className) cls += ` ${className}`
  const actionGroup = slots.action != null || isClosable
  const closed = ref(false)
  const handleClose = (event: MouseEvent) => {
    closed.value = true
    if (onClose) onClose(event)
    if (afterClose) afterClose()
  }

  return (
    <>
      {!closed.value ? (
        <div role={alertRole} className={cls} {...rest}>
          {shouldShowIcon ? (
            <span
              className="inline-flex size-5 shrink-0 self-center items-center justify-center rounded-full border border-current/15 text-[0.7rem] font-semibold"
              aria-hidden="true"
            >
              {slots.icon ? slots.icon : <span>{String(icon ?? defaultIconGlyph)}</span>}
            </span>
          ) : null}

          {hasStructuredText ? (
            <div className="min-w-0 flex-1">
              {resolvedTitle != null ? (
                <div className="font-semibold leading-6">{resolvedTitle}</div>
              ) : null}
              {hasDescription ? (
                <div className="mt-1 text-sm leading-6 opacity-80">{description}</div>
              ) : null}
              {children != null ? (
                <div className={hasDescription || resolvedTitle != null ? 'mt-3' : ''}>
                  {children}
                </div>
              ) : null}
            </div>
          ) : (
            <div className={plainContentClass}>{children}</div>
          )}

          {actionGroup ? (
            <div
              className={`flex shrink-0 ${actionAlignment} gap-2${direction === 'vertical' ? ' w-full justify-end sm:w-auto' : ''}`}
            >
              {slots.action}
              {isClosable ? (
                <button
                  type="button"
                  className={`btn btn-ghost btn-xs shrink-0 text-current/70 hover:text-current${closeText != null ? ' px-2' : ' btn-circle'}`}
                  aria-label="Close alert"
                  onClick={handleClose}
                >
                  {closeText ?? closeIcon ?? '×'}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  )
}

/** 默认导出警告提示组件。 */
export default Alert
