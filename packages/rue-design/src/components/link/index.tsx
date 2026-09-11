/*
Link 组件概述
- 保留 Rue 当前 link/link-* 视觉基底，同时补齐 Typography.Link 风格的文本能力。
- 支持 href/to、disabled、ellipsis、copyable、editable、文本修饰与安全外链 rel。
- to 链接在点击时复用 RouterLink 的导航逻辑，避免无 Router 环境下渲染期报错。
*/
import type { FC } from '@rue-js/rue'
import { onMounted, onUnmounted, ref, watch } from '@rue-js/rue'
import { useRouter } from '@rue-js/router'

/** LinkVariant 视觉或语义变体类型。 */
export type LinkVariant =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'success'
  | 'info'
  | 'warning'
  | 'error'

/** LinkColor 语义色类型。 */
export type LinkColor = LinkVariant | 'danger'
/** LinkType 视觉或语义变体类型。 */
export type LinkType = 'secondary' | 'success' | 'warning' | 'danger'
/** LinkIconPlacement 位置或方向类型。 */
export type LinkIconPlacement = 'start' | 'end'

/** LinkCopyConfig 配置对象。 */
export interface LinkCopyConfig {
  /** text 区域配置。 */
  text?: string | (() => string | Promise<string>)
  /** onCopy 事件回调。 */
  onCopy?: (event?: MouseEvent) => void
  /** 图标内容。 */
  icon?: any
  /** tooltips 配置项。 */
  tooltips?: any
  /** format 配置项。 */
  format?: 'text/plain' | 'text/html'
  /** tabIndex 配置项。 */
  tabIndex?: number
}

/** LinkEditAutoSizeConfig 配置对象。 */
export interface LinkEditAutoSizeConfig {
  /** minRows 配置项。 */
  minRows?: number
  /** maxRows 配置项。 */
  maxRows?: number
}

/** LinkEditConfig 配置对象。 */
export interface LinkEditConfig {
  /** text 区域配置。 */
  text?: string
  /** editing 配置项。 */
  editing?: boolean
  /** 图标内容。 */
  icon?: any
  /** tooltip 配置项。 */
  tooltip?: any
  /** onStart 事件回调。 */
  onStart?: () => void
  /** 值或状态变化时触发的回调。 */
  onChange?: (value: string) => void
  /** onCancel 事件回调。 */
  onCancel?: () => void
  /** onEnd 事件回调。 */
  onEnd?: () => void
  /** maxLength 配置项。 */
  maxLength?: number
  /** autoSize 尺寸。 */
  autoSize?: boolean | LinkEditAutoSizeConfig
  /** triggerType 配置项。 */
  triggerType?: ('icon' | 'text')[]
  /** enterIcon 图标内容。 */
  enterIcon?: any
  /** tabIndex 配置项。 */
  tabIndex?: number
}

/** LinkEllipsisExpandInfo 接口。 */
export interface LinkEllipsisExpandInfo {
  /** expanded 配置项。 */
  expanded: boolean
}

/** LinkEllipsisConfig 配置对象。 */
export interface LinkEllipsisConfig {
  /** rows 配置项。 */
  rows?: number
  /** tooltip 配置项。 */
  tooltip?: boolean | string
  /** expandable 配置项。 */
  expandable?: boolean | 'collapsible'
  /** 后缀内容。 */
  suffix?: string
  /** symbol 配置项。 */
  symbol?: string | ((expanded: boolean) => string)
  /** defaultExpanded 配置项。 */
  defaultExpanded?: boolean
  /** expanded 配置项。 */
  expanded?: boolean
  /** onExpand 事件回调。 */
  onExpand?: (event: MouseEvent, info: LinkEllipsisExpandInfo) => void
  /** onEllipsis 事件回调。 */
  onEllipsis?: (ellipsis: boolean) => void
}

/** LinkProps 组件属性。 */
export interface LinkProps {
  /** 链接地址。 */
  href?: string
  /** 链接或定位目标。 */
  target?: string
  /** 链接 rel 属性。 */
  rel?: string
  /** to 配置项。 */
  to?: string
  /** replace 配置项。 */
  replace?: boolean
  /** 点击时触发的回调。 */
  onClick?: (e: MouseEvent) => void
  /** 组件视觉变体。 */
  variant?: LinkVariant
  /** 组件语义色。 */
  color?: LinkColor
  /** 组件类型或语义类型。 */
  type?: LinkType
  /** hover 配置项。 */
  hover?: boolean
  /** 是否禁用交互。 */
  disabled?: boolean
  /** ellipsis 配置项。 */
  ellipsis?: boolean | LinkEllipsisConfig
  /** copyable 配置项。 */
  copyable?: boolean | LinkCopyConfig
  /** editable 配置项。 */
  editable?: boolean | LinkEditConfig
  /** mark 配置项。 */
  mark?: boolean
  /** code 配置项。 */
  code?: boolean
  /** keyboard 配置项。 */
  keyboard?: boolean
  /** underline 配置项。 */
  underline?: boolean
  /** delete 配置项。 */
  delete?: boolean
  /** strong 配置项。 */
  strong?: boolean
  /** italic 配置项。 */
  italic?: boolean
  /** 图标内容。 */
  icon?: any
  /** iconPlacement 配置项。 */
  iconPlacement?: LinkIconPlacement
  /** block 配置项。 */
  block?: boolean
  /** 根节点附加类名。 */
  className?: string
  /** 根节点内联样式。 */
  style?: any
  /** 标题内容。 */
  title?: string
  /** 组件子内容。 */
  children?: any
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface NormalizedCopyConfig extends LinkCopyConfig {
  enabled: boolean
}

interface NormalizedEditConfig extends LinkEditConfig {
  enabled: boolean
  triggerType: ('icon' | 'text')[]
}

interface NormalizedEllipsisConfig extends LinkEllipsisConfig {
  enabled: boolean
  rows: number
  tooltip: boolean | string
  expandable: boolean | 'collapsible'
}

interface DecoratedContentProps {
  mark?: boolean
  code?: boolean
  keyboard?: boolean
  children?: any
}

/** merge Class Names 的内部工具函数。 */
const mergeClassNames = (...parts: Array<string | undefined | false>) => {
  return parts.filter(Boolean).join(' ')
}

/** merge Styles 的内部工具函数。 */
const mergeStyles = (...parts: Array<Record<string, any> | undefined>) => {
  const merged: Record<string, any> = {}
  parts.forEach(part => {
    if (part) Object.assign(merged, part)
  })
  return Object.keys(merged).length > 0 ? merged : undefined
}

/** 转换为 Text 的内部工具函数。 */
const toText = (value: any): string => {
  if (value == null || value === false || value === true) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(item => toText(item)).join('')
  if (typeof value === 'function' && value.length === 0) return toText(value())
  if (typeof value === 'object') {
    if ('props' in value && (value as any).props?.children !== undefined) {
      return toText((value as any).props.children)
    }
    if ('children' in value) return toText((value as any).children)
  }
  return ''
}

/** stop Event 的内部工具函数。 */
const stopEvent = (event?: MouseEvent | KeyboardEvent) => {
  if (!event) return
  if (typeof (event as any).preventDefault === 'function') {
    ;(event as any).preventDefault()
  }
  if (typeof (event as any).stopPropagation === 'function') {
    ;(event as any).stopPropagation()
  }
}

/** 归一化 Copy Config 的内部工具函数。 */
const normalizeCopyConfig = (copyable?: boolean | LinkCopyConfig): NormalizedCopyConfig => {
  if (!copyable) return { enabled: false }
  return typeof copyable === 'object' ? { ...copyable, enabled: true } : { enabled: true }
}

/** 归一化 Edit Config 的内部工具函数。 */
const normalizeEditConfig = (editable?: boolean | LinkEditConfig): NormalizedEditConfig => {
  if (!editable) return { enabled: false, triggerType: ['icon'] }
  const config = typeof editable === 'object' ? editable : {}
  return {
    ...config,
    enabled: true,
    triggerType: config.triggerType ?? ['icon'],
  }
}

/** 解析 Color Class 的内部工具函数。 */
const resolveColorClass = (color?: LinkColor) => {
  if (!color) return undefined
  return `link-${color === 'danger' ? 'error' : color}`
}

/** 解析 Type Class 的内部工具函数。 */
const resolveTypeClass = (type?: LinkType) => {
  switch (type) {
    case 'secondary':
      return 'text-base-content/65'
    case 'success':
      return 'link-success'
    case 'warning':
      return 'link-warning'
    case 'danger':
      return 'link-error'
    default:
      return undefined
  }
}

/** 解析 Router Href 的内部工具函数。 */
const resolveRouterHref = (to: string, router: ReturnType<typeof useRouter> | undefined) => {
  const resolvedHref = router?.history.createHref?.(to) ?? `#${to || '/'}`
  if (!resolvedHref) {
    return '#/'
  }
  if (resolvedHref === to && to && !to.startsWith('#')) {
    return `#${to}`
  }
  return resolvedHref
}

/** 解析 Ellipsis 的内部工具函数。 */
const resolveEllipsis = (ellipsis?: boolean | LinkEllipsisConfig): NormalizedEllipsisConfig => {
  if (!ellipsis) {
    return { enabled: false, rows: 1, tooltip: false, expandable: false }
  }
  if (typeof ellipsis === 'object') {
    return {
      ...ellipsis,
      enabled: true,
      rows: Math.max(1, ellipsis.rows ?? 1),
      tooltip: ellipsis.tooltip ?? true,
      expandable: ellipsis.expandable ?? false,
    }
  }
  return { enabled: true, rows: 1, tooltip: true, expandable: false }
}

/** 构建 Link Class Name 的内部工具函数。 */
const buildLinkClassName = ({
  variant,
  color,
  type,
  hover,
  disabled,
  underline,
  deleted,
  strong,
  italic,
  block,
  hasIcon,
  ellipsis,
  className,
}: {
  variant?: LinkVariant
  color?: LinkColor
  type?: LinkType
  hover?: boolean
  disabled?: boolean
  underline?: boolean
  deleted?: boolean
  strong?: boolean
  italic?: boolean
  block?: boolean
  hasIcon?: boolean
  ellipsis?: { enabled: boolean }
  className?: string
}) => {
  const resolvedColor = color ?? variant
  const needsInlineLayout = hasIcon || ellipsis?.enabled
  const displayClass = block
    ? 'flex w-full items-center gap-1.5'
    : needsInlineLayout
      ? 'inline-flex max-w-full items-center gap-1.5 align-baseline'
      : undefined

  return mergeClassNames(
    'link',
    resolvedColor ? resolveColorClass(resolvedColor) : resolveTypeClass(type),
    hover ? 'link-hover' : undefined,
    disabled ? 'cursor-not-allowed opacity-45 no-underline hover:no-underline' : undefined,
    underline ? 'underline decoration-current underline-offset-4' : undefined,
    deleted ? 'line-through' : undefined,
    strong ? 'font-semibold' : undefined,
    italic ? 'italic' : undefined,
    displayClass,
    className,
  )
}

/** 构建 Ellipsis Style 的内部工具函数。 */
const buildEllipsisStyle = (rows: number) => {
  if (rows <= 1) return undefined
  return {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: rows,
  }
}

/** 解析 Title Value 的内部工具函数。 */
const resolveTitleValue = (
  title: string | undefined,
  ellipsis: NormalizedEllipsisConfig,
  text: string,
) => {
  if (title !== undefined) return title
  if (!ellipsis.enabled || ellipsis.tooltip === false) return undefined
  if (typeof ellipsis.tooltip === 'string') return ellipsis.tooltip
  return text
}

/** 解析 Expand Symbol 的内部工具函数。 */
const resolveExpandSymbol = (ellipsis: NormalizedEllipsisConfig, expanded: boolean) => {
  if (typeof ellipsis.symbol === 'function') return ellipsis.symbol(expanded)
  if (ellipsis.symbol != null) return ellipsis.symbol
  return expanded ? '收起' : '展开'
}

/** 归一化 Rows Value 的内部工具函数。 */
const normalizeRowsValue = (autoSize?: boolean | LinkEditAutoSizeConfig) => {
  if (!autoSize) return undefined
  const config = typeof autoSize === 'object' ? autoSize : undefined
  const minRows = typeof config?.minRows === 'number' && config.minRows > 0 ? config.minRows : 2
  return String(minRows)
}

/** sync Textarea Auto Size 的内部工具函数。 */
const syncTextareaAutoSize = (
  element: HTMLTextAreaElement | undefined,
  autoSize?: boolean | LinkEditAutoSizeConfig,
) => {
  if (!element) return
  if (!autoSize) {
    element.style.height = ''
    element.style.overflowY = ''
    return
  }

  const config = typeof autoSize === 'object' ? autoSize : undefined
  const computedStyle = window.getComputedStyle(element)
  const lineHeightValue = Number.parseFloat(computedStyle.lineHeight)
  const fontSizeValue = Number.parseFloat(computedStyle.fontSize)
  const lineHeight = Number.isFinite(lineHeightValue)
    ? lineHeightValue
    : Number.isFinite(fontSizeValue)
      ? fontSizeValue * 1.5
      : 24
  const borderHeight =
    Number.parseFloat(computedStyle.borderTopWidth || '0') +
    Number.parseFloat(computedStyle.borderBottomWidth || '0')
  const paddingHeight =
    Number.parseFloat(computedStyle.paddingTop || '0') +
    Number.parseFloat(computedStyle.paddingBottom || '0')
  const minRows = typeof config?.minRows === 'number' && config.minRows > 0 ? config.minRows : 2
  const maxRows =
    typeof config?.maxRows === 'number' && config.maxRows > 0
      ? Math.max(config.maxRows, minRows)
      : undefined

  element.style.height = 'auto'
  let nextHeight = element.scrollHeight

  if (typeof minRows === 'number') {
    nextHeight = Math.max(nextHeight, minRows * lineHeight + borderHeight + paddingHeight)
  }

  if (typeof maxRows === 'number') {
    const maxHeight = maxRows * lineHeight + borderHeight + paddingHeight
    element.style.overflowY = nextHeight > maxHeight ? 'auto' : 'hidden'
    nextHeight = Math.min(nextHeight, maxHeight)
  } else {
    element.style.overflowY = 'hidden'
  }

  element.style.height = `${nextHeight}px`
}

/** read Copy Text 的内部工具函数。 */
const readCopyText = async (config: NormalizedCopyConfig, children: any) => {
  const source = config.text
  const value = typeof source === 'function' ? await source() : source
  return value ?? toText(children)
}

/** fallback Copy Text 的内部工具函数。 */
const fallbackCopyText = (text: string) => {
  if (typeof document === 'undefined') return false
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    if (typeof document.execCommand !== 'function') return true
    return document.execCommand('copy') !== false
  } finally {
    document.body.removeChild(textarea)
  }
}

/** write Clipboard 的内部工具函数。 */
const writeClipboard = async (text: string, format?: LinkCopyConfig['format']) => {
  const clipboard = (globalThis as any).navigator?.clipboard
  if (format === 'text/html' && clipboard?.write && (globalThis as any).ClipboardItem) {
    try {
      const item = new (globalThis as any).ClipboardItem({
        'text/html': new Blob([text], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      })
      await clipboard.write([item])
      return true
    } catch {
      // Fall through to plain text/fallback copy when browser permission rejects rich writes.
    }
  }
  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(text)
      return true
    } catch {
      // Permission can be denied in dev/browser automation; keep the user gesture fallback alive.
    }
  }
  return fallbackCopyText(text)
}

const expandableEllipsisStyleId = 'rue-link-expandable-ellipsis-style'
const expandableEllipsisStyle = `
[data-rue-link-actions][data-rue-link-expanded="true"] [data-rue-link-ellipsis-text] {
  display: inline !important;
  overflow: visible !important;
  white-space: normal !important;
  text-overflow: clip !important;
  -webkit-box-orient: initial !important;
  -webkit-line-clamp: unset !important;
}
`

const ensureExpandableEllipsisStyle = () => {
  if (typeof document === 'undefined' || document.getElementById(expandableEllipsisStyleId)) return
  const styleElement = document.createElement('style')
  styleElement.id = expandableEllipsisStyleId
  styleElement.textContent = expandableEllipsisStyle
  document.head.appendChild(styleElement)
}

/** DecoratedContent 的内部工具组件。 */
const DecoratedContent: FC<DecoratedContentProps> = ({ mark, code, keyboard, children }) => (
  <>
    {mark ? (
      <mark className="rounded bg-warning/20 px-1 py-0.5 text-inherit">
        {code ? (
          <code className="rounded bg-base-200 px-1.5 py-0.5 text-[0.9em]">
            {keyboard ? <kbd className="kbd kbd-sm align-middle">{children}</kbd> : children}
          </code>
        ) : keyboard ? (
          <kbd className="kbd kbd-sm align-middle">{children}</kbd>
        ) : (
          children
        )}
      </mark>
    ) : code ? (
      <code className="rounded bg-base-200 px-1.5 py-0.5 text-[0.9em]">
        {keyboard ? <kbd className="kbd kbd-sm align-middle">{children}</kbd> : children}
      </code>
    ) : keyboard ? (
      <kbd className="kbd kbd-sm align-middle">{children}</kbd>
    ) : (
      children
    )}
  </>
)

/** Copy Icon 的内部工具函数。 */
const CopyIcon: FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-[1em]"
    aria-hidden="true"
  >
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
    />
  </svg>
)

/** Check Icon 的内部工具函数。 */
const CheckIcon: FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-[1em]"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
  </svg>
)

/** Edit Icon 的内部工具函数。 */
const EditIcon: FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-[1em]"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"
    />
  </svg>
)

/** Close Icon 的内部工具函数。 */
const CloseIcon: FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-[1em]"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
  </svg>
)

/** Link 的内部工具函数。 */
const Link: FC<LinkProps> = ({
  href = '#',
  target,
  rel,
  to,
  replace,
  onClick,
  variant,
  color,
  type,
  hover,
  disabled,
  ellipsis,
  copyable,
  editable,
  mark,
  code,
  keyboard,
  underline,
  delete: deleted,
  strong,
  italic,
  icon,
  iconPlacement = 'start',
  block,
  className,
  style,
  title,
  children,
  ...rest
}) => {
  let linkRouter: ReturnType<typeof useRouter> | undefined
  if (to) {
    try {
      linkRouter = useRouter()
    } catch {
      /* Plain hash links also work without an installed router. */
    }
  }
  const copyConfig = normalizeCopyConfig(copyable)
  const editConfig = normalizeEditConfig(editable)
  const ellipsisConfig = resolveEllipsis(ellipsis)
  if (ellipsisConfig.expandable) ensureExpandableEllipsisStyle()
  const copied = ref(false)
  const uncontrolledEditing = ref(!!editConfig.editing)
  const uncontrolledExpanded = ref(!!ellipsisConfig.defaultExpanded)
  const isTextEllipsed = ref(false)
  const editValue = ref(editConfig.text ?? toText(children))
  let ellipsisTextElement: HTMLElement | undefined
  let editorElement: HTMLInputElement | HTMLTextAreaElement | undefined
  let resizeObserver: ResizeObserver | undefined
  let ellipsisTimer = 0
  let copyFeedbackTimer = 0

  const hasIcon = icon != null
  const linkText = toText(children)
  const displayText = `${linkText}${ellipsisConfig.suffix ?? ''}`
  const anchorRel = target === '_blank' && !rel ? 'noopener noreferrer' : rel
  const hasInlineActions =
    !!ellipsisConfig.expandable ||
    copyConfig.enabled ||
    (editConfig.enabled && editConfig.triggerType.includes('icon'))
  const linkClassName = buildLinkClassName({
    variant,
    color,
    type,
    hover,
    disabled,
    underline,
    deleted,
    strong,
    italic,
    block,
    hasIcon,
    ellipsis: ellipsisConfig,
    className,
  })
  const titleValue = resolveTitleValue(title, ellipsisConfig, displayText)

  const setEditorRef = (element: HTMLInputElement | HTMLTextAreaElement | null) => {
    editorElement = element ?? undefined
  }

  const syncEditorAutoSize = () => {
    if (!editConfig.autoSize || !(editorElement instanceof HTMLTextAreaElement)) return
    syncTextareaAutoSize(editorElement, editConfig.autoSize)
  }

  const getIsEditing = () => editConfig.editing ?? uncontrolledEditing.value

  const getIsExpanded = () => ellipsisConfig.expanded ?? uncontrolledExpanded.value

  const isEllipsisActive = () => ellipsisConfig.enabled && !getIsExpanded()

  const scheduleEditorAutoSize = () => {
    if (typeof window === 'undefined') return
    window.setTimeout(syncEditorAutoSize, 0)
  }

  const emitEllipsisChange = (nextValue: boolean) => {
    if (isTextEllipsed.value === nextValue) return
    isTextEllipsed.value = nextValue
    if (ellipsisConfig.onEllipsis) ellipsisConfig.onEllipsis(nextValue)
  }

  const syncEllipsisState = () => {
    if (!isEllipsisActive()) {
      emitEllipsisChange(false)
      return
    }
    const element = ellipsisTextElement
    if (!element) {
      emitEllipsisChange(false)
      return
    }

    const nextEllipsis =
      ellipsisConfig.rows > 1
        ? element.scrollHeight - element.clientHeight > 1
        : element.scrollWidth - element.clientWidth > 1

    emitEllipsisChange(nextEllipsis)
  }

  const scheduleEllipsisMeasure = () => {
    if (typeof window === 'undefined') return
    window.clearTimeout(ellipsisTimer)
    ellipsisTimer = window.setTimeout(syncEllipsisState, 0)
  }

  const setEllipsisTextRef = (element: HTMLElement | null) => {
    ellipsisTextElement = element ?? undefined
    if (element && title === undefined && ellipsisConfig.tooltip !== false) {
      Promise.resolve().then(() => {
        const fallbackTitle = element.textContent ?? ''
        if (fallbackTitle) element.setAttribute('title', fallbackTitle)
      })
    }

    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = undefined
    }

    if (element && typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        scheduleEllipsisMeasure()
      })
      observer.observe(element)
      resizeObserver = observer
    }

    scheduleEllipsisMeasure()
  }

  const showCopiedFeedback = () => {
    copied.value = true
    if (typeof window === 'undefined') return
    window.clearTimeout(copyFeedbackTimer)
    copyFeedbackTimer = window.setTimeout(() => {
      copied.value = false
    }, 1500)
  }

  const startEdit = (event?: MouseEvent) => {
    if (disabled) return
    stopEvent(event)
    editValue.value = editConfig.text ?? linkText
    if (editConfig.onStart) editConfig.onStart()
    if (editConfig.editing === undefined) uncontrolledEditing.value = true
    scheduleEditorAutoSize()
  }

  const cancelEdit = (event?: MouseEvent | KeyboardEvent) => {
    stopEvent(event)
    if (editConfig.onCancel) editConfig.onCancel()
    if (editConfig.editing === undefined) uncontrolledEditing.value = false
  }

  const finishEdit = (event?: MouseEvent | KeyboardEvent) => {
    stopEvent(event)
    if (editConfig.onChange) editConfig.onChange(editValue.value)
    if (editConfig.onEnd) editConfig.onEnd()
    if (editConfig.editing === undefined) uncontrolledEditing.value = false
  }

  const toggleExpanded = (event: MouseEvent) => {
    stopEvent(event)
    const canCollapse = ellipsisConfig.expandable === 'collapsible'
    const currentExpanded = getIsExpanded()
    const nextExpanded = currentExpanded ? (canCollapse ? false : true) : true
    if (nextExpanded === currentExpanded) return
    if (ellipsisConfig.onExpand) ellipsisConfig.onExpand(event, { expanded: nextExpanded })
    if (ellipsisConfig.expanded === undefined) uncontrolledExpanded.value = nextExpanded
    scheduleEllipsisMeasure()
  }

  const handleBaseClick = (event: MouseEvent) => {
    if (disabled) {
      stopEvent(event)
      return
    }
    if (editConfig.enabled && editConfig.triggerType.includes('text')) {
      startEdit(event)
      return
    }
    if (onClick) onClick(event)
  }

  const handleRouterClick = (event: MouseEvent) => {
    handleBaseClick(event)
    if (
      disabled ||
      event.defaultPrevented ||
      target === '_blank' ||
      editConfig.triggerType.includes('text')
    ) {
      return
    }
    if (
      linkRouter &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      event.preventDefault()
      if (to !== undefined) void (replace ? linkRouter.replace : linkRouter.push)(to)
    }
  }

  const handleCopyClick = (event: MouseEvent) => {
    if (disabled) {
      stopEvent(event)
      return
    }

    stopEvent(event)
    showCopiedFeedback()
    readCopyText(copyConfig, children)
      .then(text => writeClipboard(String(text), copyConfig.format))
      .then(copiedToClipboard => {
        if (!copiedToClipboard) {
          copied.value = false
          return
        }
        if (copyConfig.onCopy) copyConfig.onCopy(event)
      })
      .catch(() => {
        copied.value = false
      })
  }

  onMounted(() => {
    scheduleEllipsisMeasure()
    scheduleEditorAutoSize()
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', scheduleEllipsisMeasure)
    }
  })

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.clearTimeout(ellipsisTimer)
      window.clearTimeout(copyFeedbackTimer)
      window.removeEventListener('resize', scheduleEllipsisMeasure)
    }
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = undefined
    }
  })

  watch(
    () => [
      linkText,
      ellipsisConfig.rows,
      ellipsisConfig.expandable,
      ellipsisConfig.expanded,
      uncontrolledExpanded.value,
      getIsEditing(),
    ],
    () => {
      scheduleEllipsisMeasure()
      scheduleEditorAutoSize()
    },
    { immediate: true },
  )

  watch(
    () => [editValue.value, editConfig.autoSize],
    () => {
      scheduleEditorAutoSize()
    },
    { immediate: true },
  )

  const EditorView: FC = () => {
    const editorClassName = editConfig.autoSize
      ? 'textarea textarea-bordered textarea-sm min-h-24 min-w-56 leading-6'
      : 'input input-bordered input-xs min-w-36'

    return (
      <span
        className={mergeClassNames(
          block
            ? 'flex w-full items-start gap-1 align-middle'
            : 'inline-flex max-w-full items-start gap-1 align-middle',
        )}
      >
        {editConfig.autoSize ? (
          <textarea
            ref={setEditorRef}
            data-rue-link-editor="true"
            className={editorClassName}
            value={editValue.value}
            rows={normalizeRowsValue(editConfig.autoSize)}
            maxLength={editConfig.maxLength}
            autoFocus
            onInput={(event: Event) => {
              editValue.value = (event.target as HTMLTextAreaElement | null)?.value ?? ''
              syncEditorAutoSize()
            }}
            onKeyDown={(event: KeyboardEvent) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') finishEdit(event)
              if (event.key === 'Escape') cancelEdit(event)
            }}
          />
        ) : (
          <input
            ref={setEditorRef}
            data-rue-link-editor="true"
            className={editorClassName}
            value={editValue.value}
            maxLength={editConfig.maxLength}
            autoFocus
            onInput={(event: Event) => {
              editValue.value = (event.target as HTMLInputElement | null)?.value ?? ''
            }}
            onKeyDown={(event: KeyboardEvent) => {
              if (event.key === 'Enter') finishEdit(event)
              if (event.key === 'Escape') cancelEdit(event)
            }}
          />
        )}
        <button
          type="button"
          data-rue-link-edit-confirm="true"
          className="btn btn-ghost btn-xs"
          aria-label="确认编辑"
          onClick={(event: MouseEvent) => finishEdit(event as any)}
        >
          {editConfig.enterIcon ? <span>{String(editConfig.enterIcon)}</span> : <CheckIcon />}
        </button>
        <button
          type="button"
          data-rue-link-edit-cancel="true"
          className="btn btn-ghost btn-xs"
          aria-label="取消编辑"
          onClick={(event: MouseEvent) => cancelEdit(event as any)}
        >
          <CloseIcon />
        </button>
      </span>
    )
  }

  const TextNode: FC = () => {
    if (!ellipsisConfig.enabled) {
      return (
        <span className="min-w-0">
          <DecoratedContent mark={mark} code={code} keyboard={keyboard}>
            {children}
          </DecoratedContent>
        </span>
      )
    }

    const resolveTextClassName = () =>
      getIsExpanded()
        ? 'min-w-0 max-w-full whitespace-normal break-words align-bottom'
        : ellipsisConfig.rows > 1
          ? 'min-w-0 max-w-full overflow-hidden align-bottom'
          : 'min-w-0 max-w-full truncate align-bottom'
    const resolveTextStyle = () =>
      getIsExpanded()
        ? {
            minWidth: 0,
            whiteSpace: 'normal',
            overflow: 'visible',
            textOverflow: 'clip',
          }
        : buildEllipsisStyle(ellipsisConfig.rows)

    if (ellipsisConfig.rows === 1 && ellipsisConfig.suffix) {
      return (
        <span className="inline-flex min-w-0 max-w-full items-baseline align-bottom">
          <span
            ref={setEllipsisTextRef}
            data-rue-link-ellipsis-text="true"
            data-rue-link-ellipsis-rows={String(ellipsisConfig.rows)}
            className={resolveTextClassName()}
            style={mergeStyles(resolveTextStyle(), { minWidth: 0 })}
            title={titleValue}
          >
            <DecoratedContent mark={mark} code={code} keyboard={keyboard}>
              {children}
            </DecoratedContent>
          </span>
          <span data-rue-link-ellipsis-suffix="true" className="shrink-0">
            {ellipsisConfig.suffix}
          </span>
        </span>
      )
    }

    return (
      <span
        ref={setEllipsisTextRef}
        data-rue-link-ellipsis-text="true"
        data-rue-link-ellipsis-rows={String(ellipsisConfig.rows)}
        className={resolveTextClassName()}
        style={resolveTextStyle()}
        title={titleValue}
      >
        <DecoratedContent mark={mark} code={code} keyboard={keyboard}>
          {children}
        </DecoratedContent>
        {ellipsisConfig.suffix ? <span>{ellipsisConfig.suffix}</span> : null}
      </span>
    )
  }

  const AnchorIcon: FC = () => (
    <>
      {hasIcon ? (
        <span className="inline-flex shrink-0 items-center" aria-hidden="true">
          {icon}
        </span>
      ) : null}
    </>
  )

  const AnchorChildren: FC = () => {
    return (
      <>
        {iconPlacement === 'end' ? (
          <>
            <TextNode />
            <AnchorIcon />
          </>
        ) : (
          <>
            <AnchorIcon />
            <TextNode />
          </>
        )}
      </>
    )
  }

  const AnchorView: FC = () => {
    const anchorStyle = ellipsisConfig.enabled ? mergeStyles(style, { minWidth: 0 }) : style
    const anchorTitleProps =
      !ellipsisConfig.enabled && titleValue !== undefined ? { title: titleValue } : {}

    if (disabled) {
      return (
        <span
          {...rest}
          role={rest.role ?? 'link'}
          className={linkClassName}
          style={anchorStyle}
          {...anchorTitleProps}
          aria-disabled="true"
          onClick={handleBaseClick}
        >
          <AnchorChildren />
        </span>
      )
    }

    if (to) {
      return (
        <a
          {...rest}
          href={resolveRouterHref(to, linkRouter)}
          target={target}
          rel={anchorRel}
          className={linkClassName}
          style={anchorStyle}
          {...anchorTitleProps}
          tabIndex={rest.tabIndex}
          tabindex={rest.tabIndex}
          onClick={handleRouterClick}
        >
          <AnchorChildren />
        </a>
      )
    }

    return (
      <a
        {...rest}
        href={href}
        target={target}
        rel={anchorRel}
        className={linkClassName}
        style={anchorStyle}
        {...anchorTitleProps}
        tabIndex={rest.tabIndex}
        tabindex={rest.tabIndex}
        onClick={handleBaseClick}
      >
        <AnchorChildren />
      </a>
    )
  }

  const ContentView: FC = () => {
    const shouldShowExpandButton = () =>
      !!ellipsisConfig.expandable &&
      (!getIsExpanded() || ellipsisConfig.expandable === 'collapsible')

    if (!hasInlineActions && !shouldShowExpandButton()) {
      return <AnchorView />
    }

    return (
      <span
        data-rue-link-actions="true"
        data-rue-link-expanded={
          ellipsisConfig.enabled ? (getIsExpanded() ? 'true' : 'false') : undefined
        }
        className={mergeClassNames(
          'rue-link-inline-actions',
          block
            ? 'flex w-full flex-wrap items-start gap-1 align-baseline'
            : 'inline-flex max-w-full flex-wrap items-start gap-1 align-baseline',
        )}
      >
        <AnchorView />
        {shouldShowExpandButton() ? (
          <button
            type="button"
            data-rue-link-expand="true"
            className="link link-hover text-xs no-underline opacity-70"
            aria-label={getIsExpanded() ? '收起全文' : '展开全文'}
            onClick={toggleExpanded}
          >
            {String(resolveExpandSymbol(ellipsisConfig, getIsExpanded()))}
          </button>
        ) : null}
        {copyConfig.enabled ? (
          <button
            type="button"
            data-rue-link-copy="true"
            className="btn btn-ghost btn-xs"
            aria-label={copied.value ? '已复制' : '复制链接文本'}
            title={copyConfig.tooltips ?? (copied.value ? '已复制' : '复制')}
            tabIndex={copyConfig.tabIndex}
            disabled={disabled}
            onClick={handleCopyClick}
          >
            {copied.value ? (
              <span>✓</span>
            ) : copyConfig.icon ? (
              <span>{String(copyConfig.icon)}</span>
            ) : (
              <CopyIcon />
            )}
          </button>
        ) : null}
        {editConfig.enabled && editConfig.triggerType.includes('icon') ? (
          <button
            type="button"
            data-rue-link-edit="true"
            className="btn btn-ghost btn-xs"
            aria-label="编辑链接文本"
            title={editConfig.tooltip ?? '编辑'}
            tabIndex={editConfig.tabIndex}
            disabled={disabled}
            onClick={(event: MouseEvent) => startEdit(event as any)}
          >
            {editConfig.icon ? <span>{String(editConfig.icon)}</span> : <EditIcon />}
          </button>
        ) : null}
      </span>
    )
  }

  return (
    <span className="contents">
      {editConfig.enabled && getIsEditing() ? <EditorView /> : <ContentView />}
    </span>
  )
}

/** 默认导出链接组件。 */
export default Link
