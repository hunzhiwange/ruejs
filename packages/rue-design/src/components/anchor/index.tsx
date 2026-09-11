/*
Anchor 模块概述
- 汇总锚点组件的公开类型、渲染入口和局部工具逻辑。
- 导出注释用于 API 文档生成，内部注释标明状态归一化、样式映射与 DOM 交互边界。
*/
import type { FC } from '@rue-js/rue'
import { computed, onMounted, onUnmounted, ref, useRef, watch } from '@rue-js/rue'

/** AnchorKey 标识键类型。 */
export type AnchorKey = string | number
/** AnchorDirection 位置或方向类型。 */
export type AnchorDirection = 'vertical' | 'horizontal'
/** AnchorContainer 类型。 */
export type AnchorContainer = HTMLElement | Window

/** AnchorItem 数据项结构。 */
export interface AnchorItem {
  /** 数据项唯一标识。 */
  key?: AnchorKey
  /** 链接地址。 */
  href: string
  /** 标题内容。 */
  title: any
  /** 链接或定位目标。 */
  target?: string
  /** replace 配置项。 */
  replace?: boolean
  /** 描述内容。 */
  description?: string | number
  /** 根节点附加类名。 */
  className?: string
  /** 是否禁用交互。 */
  disabled?: boolean
  /** 组件子内容。 */
  children?: AnchorItem[]
}

/** AnchorLinkProps 组件属性。 */
export interface AnchorLinkProps extends Omit<AnchorItem, 'children'> {
  /** 组件子内容。 */
  children?: any
}

/** AnchorClassNames 局部类名配置。 */
export interface AnchorClassNames {
  /** 根节点区域配置。 */
  root?: string
  /** list 区域配置。 */
  list?: string
  /** item 区域配置。 */
  item?: string
  /** link 配置项。 */
  link?: string
  /** 标题内容。 */
  title?: string
  /** 描述内容。 */
  description?: string
  /** indicator 配置项。 */
  indicator?: string
}

/** AnchorStyles 局部样式配置。 */
export interface AnchorStyles {
  /** 根节点区域配置。 */
  root?: Record<string, any>
  /** list 区域配置。 */
  list?: Record<string, any>
  /** item 区域配置。 */
  item?: Record<string, any>
  /** link 配置项。 */
  link?: Record<string, any>
  /** 标题内容。 */
  title?: Record<string, any>
  /** 描述内容。 */
  description?: Record<string, any>
  /** indicator 配置项。 */
  indicator?: Record<string, any>
}

/** AnchorProps 组件属性。 */
export interface AnchorProps {
  /** 根节点附加类名。 */
  className?: string
  /** 根节点附加类名。 */
  rootClassName?: string
  /** 根节点内联样式。 */
  style?: Record<string, any>
  /** 组件子内容。 */
  children?: any
  /** offsetTop 配置项。 */
  offsetTop?: number
  /** bounds 配置项。 */
  bounds?: number
  /** affix 配置项。 */
  affix?: boolean
  /** showInkInFixed 配置项。 */
  showInkInFixed?: boolean
  /** getContainer 配置项。 */
  getContainer?: () => AnchorContainer | undefined
  /** getCurrentAnchor 配置项。 */
  getCurrentAnchor?: (activeLink: string) => string
  /** 点击时触发的回调。 */
  onClick?: (event: MouseEvent, link: { title: any; href: string }) => void
  /** targetOffset 配置项。 */
  targetOffset?: number
  /** 值或状态变化时触发的回调。 */
  onChange?: (currentActiveLink: string) => void
  /** 数据驱动渲染项。 */
  items?: AnchorItem[]
  /** 布局方向。 */
  direction?: AnchorDirection
  /** replace 配置项。 */
  replace?: boolean
  /** 按局部区域覆盖的类名集合。 */
  classNames?: AnchorClassNames
  /** 按局部区域覆盖的内联样式集合。 */
  styles?: AnchorStyles
  /** 允许透传原生属性或扩展字段。 */
  [key: string]: any
}

interface NormalizedAnchorItem extends Omit<AnchorItem, 'children'> {
  keyText: string
  level: number
  children?: NormalizedAnchorItem[]
}

/** append Class Name 的内部工具函数。 */
const appendClassName = (base?: string, className?: string) => {
  if (base && className) return `${base} ${className}`
  return base ?? className ?? ''
}

/** 归一化 Children 的内部工具函数。 */

/** 创建 Key Text 的内部工具函数。 */
const createKeyText = (key: AnchorKey | undefined, href: string, level: number, index: number) => {
  const fallback = `${href || 'anchor'}:${level}:${index}`
  return key == null ? fallback : `${typeof key}:${String(key)}`
}

/** 判断 Renderable Node 的内部工具函数。 */

/** 判断 Anchor Link Node 的内部工具函数。 */

/** extract Href Target Id 的内部工具函数。 */
const extractHrefTargetId = (href?: string) => {
  if (!href) return ''
  const hashIndex = href.lastIndexOf('#')
  if (hashIndex < 0) return ''
  const targetId = href.slice(hashIndex + 1).trim()
  if (!targetId || targetId.startsWith('/')) return ''
  try {
    return decodeURIComponent(targetId)
  } catch {
    return targetId
  }
}

/** 解析 Item Title 的内部工具函数。 */
const resolveItemTitle = (item: Pick<AnchorItem, 'title' | 'href'>) => {
  return item.title ?? item.href
}

/** parse Link Children 的内部工具函数。 */

/** 归一化 Items 的内部工具函数。 */
const normalizeItems = (
  items: AnchorItem[] | undefined,
  children: any,
  level = 0,
): NormalizedAnchorItem[] => {
  const sourceItems = items

  return (sourceItems ?? []).flatMap((item, index) => {
    if (!item || !item.href) return []

    return [
      {
        ...item,
        title: resolveItemTitle(item),
        keyText: createKeyText(item.key, item.href, level, index),
        level,
        children: item.children?.length
          ? normalizeItems(item.children, undefined, level + 1)
          : undefined,
      },
    ]
  })
}

/** flatten Items 的内部工具函数。 */
const flattenItems = (
  items: NormalizedAnchorItem[],
  includeChildren = true,
): NormalizedAnchorItem[] => {
  return items.flatMap(item => {
    if (!includeChildren || !item.children?.length) return [item]
    return [item, ...flattenItems(item.children, includeChildren)]
  })
}

/** 读取 Default Container 的内部工具函数。 */
const getDefaultContainer = (): AnchorContainer | undefined => {
  return typeof window === 'undefined' ? undefined : window
}

/** 判断 Window Container 的内部工具函数。 */
const isWindowContainer = (container?: AnchorContainer): container is Window => {
  return typeof window !== 'undefined' && container === window
}

/** 读取 Container Scroll Top 的内部工具函数。 */
const getContainerScrollTop = (container?: AnchorContainer) => {
  if (!container) return 0
  if (isWindowContainer(container)) {
    return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
  }
  return container.scrollTop
}

/** 读取 Container Viewport Height 的内部工具函数。 */
const getContainerViewportHeight = (container?: AnchorContainer) => {
  if (!container) return 0
  if (isWindowContainer(container)) {
    return (
      window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 0
    )
  }
  return container.clientHeight
}

/** 读取 Container Scroll Height 的内部工具函数。 */
const getContainerScrollHeight = (container?: AnchorContainer) => {
  if (!container) return 0
  if (isWindowContainer(container)) {
    return Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      document.documentElement.offsetHeight,
      document.body.offsetHeight,
    )
  }
  return container.scrollHeight
}

/** 设置 Container Scroll Top 的内部工具函数。 */
const setContainerScrollTop = (container: AnchorContainer | undefined, top: number) => {
  const nextTop = Math.max(0, top)
  if (!container) return

  if (isWindowContainer(container)) {
    try {
      window.scrollTo({ top: nextTop, behavior: 'smooth' })
    } catch {
      window.scrollTo(0, nextTop)
    }
    return
  }

  try {
    container.scrollTo({ top: nextTop, behavior: 'smooth' })
  } catch {
    container.scrollTop = nextTop
  }

  if (container.scrollTop !== nextTop) {
    container.scrollTop = nextTop
  }
}

/** 读取 Offset Top 的内部工具函数。 */
const getOffsetTop = (element: HTMLElement, container?: AnchorContainer) => {
  const rect = element.getBoundingClientRect()
  if (!container || isWindowContainer(container)) {
    return rect.top + getContainerScrollTop(getDefaultContainer())
  }

  const containerRect = container.getBoundingClientRect()
  return rect.top - containerRect.top + container.scrollTop
}

/** 读取 Scoped Target Element 的内部工具函数。 */
const getScopedTargetElement = (targetId: string, container: HTMLElement) => {
  if (container.id === targetId) return container

  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return container.querySelector<HTMLElement>(`#${CSS.escape(targetId)}`)
  }

  const elements = container.querySelectorAll<HTMLElement>('[id]')
  for (const element of Array.from(elements)) {
    if (element.id === targetId) return element
  }
  return null
}

/** 读取 Target Element 的内部工具函数。 */
const getTargetElement = (href?: string, container?: AnchorContainer) => {
  if (typeof document === 'undefined') return null
  const targetId = extractHrefTargetId(href)
  if (!targetId) return null

  if (container && !isWindowContainer(container)) {
    return getScopedTargetElement(targetId, container)
  }

  return document.getElementById(targetId)
}

/** 判断 Near Container Bottom 的内部工具函数。 */
const isNearContainerBottom = (container: AnchorContainer | undefined, tolerance = 1) => {
  if (!container) return false
  const viewportHeight = getContainerViewportHeight(container)
  const scrollHeight = getContainerScrollHeight(container)

  if (viewportHeight <= 0 || scrollHeight <= viewportHeight) return false

  return getContainerScrollTop(container) + viewportHeight >= scrollHeight - tolerance
}

/** 判断 External Href 的内部工具函数。 */
const isExternalHref = (href: string) => /^(https?:)?\/\//.test(href)

/** update Hash Safely 的内部工具函数。 */
const updateHashSafely = (href: string, replace?: boolean) => {
  if (typeof window === 'undefined') return
  if (!href.startsWith('#')) return

  const currentHash = window.location.hash || ''
  if (currentHash.startsWith('#/')) return

  const method = replace ? 'replaceState' : 'pushState'
  if (typeof window.history?.[method] === 'function') {
    window.history[method](null, '', href)
  }
}

/** 解析 Sticky Style 的内部工具函数。 */
const resolveStickyStyle = (affix?: boolean, offsetTop?: number) => {
  if (!affix) return undefined
  return {
    position: 'sticky',
    top: `${Math.max(0, offsetTop ?? 0)}px`,
  }
}

/** Anchor Link 的内部工具函数。 */
const AnchorLink: FC<AnchorLinkProps> = ({
  href,
  title,
  target,
  replace,
  description,
  className,
  disabled,
  children,
  ...rest
}) => {
  const hasNestedSlot = title != null && children != null

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <a
        {...rest}
        href={disabled ? undefined : href}
        target={target}
        aria-disabled={disabled ? 'true' : undefined}
        data-rue-anchor-link-placeholder="true"
        data-rue-anchor-link-replace={replace ? 'true' : undefined}
        className={appendClassName('link inline-flex flex-col items-start gap-0.5', className)}
      >
        <span>{title != null ? String(title) : children ? <>{children}</> : String(href)}</span>
        {description ? <span className="text-xs opacity-70">{String(description)}</span> : null}
      </a>
      {hasNestedSlot ? (
        <span className="ml-4 flex flex-col items-start gap-1 text-sm opacity-85">{children}</span>
      ) : null}
    </span>
  )
}

/** Anchor Base 的内部工具函数。 */
const AnchorBase: FC<AnchorProps> = ({
  className,
  rootClassName,
  style,
  children,
  offsetTop,
  bounds = 5,
  affix = true,
  showInkInFixed = false,
  getContainer,
  getCurrentAnchor,
  onClick,
  targetOffset,
  onChange,
  items,
  direction = 'vertical',
  replace,
  classNames,
  styles,
  ...rest
}) => {
  const rootRef = useRef<HTMLElement>()
  const normalizedItems = normalizeItems(items, children)
  const visibleItems = direction === 'horizontal' ? normalizedItems : normalizedItems
  const flatItems = flattenItems(normalizedItems, direction !== 'horizontal')
  const shouldRenderChildrenFallback = !items && normalizedItems.length === 0 && children != null
  const activeHrefRef = ref('')
  const rawActiveHrefRef = useRef('')
  const hasInitializedActiveRef = useRef(false)
  const scrollContainerRef = useRef<AnchorContainer>()
  const cleanupScrollRef = useRef<(() => void) | undefined>(undefined)
  const frameRef = useRef<number | undefined>(undefined)
  const activeOffset = targetOffset ?? offsetTop ?? 0
  const itemSignature = flatItems.map(item => item.href).join('|')
  const showIndicator = affix || showInkInFixed || direction === 'horizontal'

  const resolveContainer = () => getContainer?.() ?? getDefaultContainer()

  const clearFrame = () => {
    if (typeof window === 'undefined') return
    if (frameRef.current == null) return
    window.cancelAnimationFrame(frameRef.current)
    frameRef.current = undefined
  }

  const setActiveHref = (href: string, emitChange = true) => {
    if (rawActiveHrefRef.current === href) {
      const resolved = typeof getCurrentAnchor === 'function' ? getCurrentAnchor(href) : href
      if (activeHrefRef.value !== resolved) {
        activeHrefRef.value = resolved
      }

      return
    }

    rawActiveHrefRef.current = href
    activeHrefRef.value = typeof getCurrentAnchor === 'function' ? getCurrentAnchor(href) : href

    if (!hasInitializedActiveRef.current) {
      hasInitializedActiveRef.current = true
      return
    }

    if (emitChange && onChange) onChange(href)
  }

  const syncActiveHref = () => {
    const container = resolveContainer()
    const scrollTop = getContainerScrollTop(container)
    let nextHref = ''
    let maxTop = Number.NEGATIVE_INFINITY

    flatItems.forEach(item => {
      const targetElement = getTargetElement(item.href, container)
      if (!targetElement) return
      const top = getOffsetTop(targetElement, container)
      if (top <= scrollTop + activeOffset + bounds && top >= maxTop) {
        maxTop = top
        nextHref = item.href
      }
    })

    const lastItem = flatItems[flatItems.length - 1]
    if (
      lastItem &&
      nextHref !== lastItem.href &&
      isNearContainerBottom(container, Math.max(bounds, 1))
    ) {
      const lastTargetElement = getTargetElement(lastItem.href, container)
      if (lastTargetElement) {
        nextHref = lastItem.href
      }
    }

    if (!nextHref && flatItems.length > 0) {
      nextHref = flatItems[0]?.href ?? ''
    }

    setActiveHref(nextHref)
  }

  const scheduleActiveSync = () => {
    syncActiveHref()

    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      return
    }

    clearFrame()
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = undefined
      syncActiveHref()
    })
  }

  const bindContainerListener = () => {
    if (typeof window === 'undefined') return

    const nextContainer = resolveContainer()
    if (!nextContainer) return
    if (scrollContainerRef.current === nextContainer && cleanupScrollRef.current) return

    cleanupScrollRef.current?.()

    const handleContainerChange = () => {
      scheduleActiveSync()
    }

    nextContainer.addEventListener('scroll', handleContainerChange)
    window.addEventListener('resize', handleContainerChange)

    scrollContainerRef.current = nextContainer
    cleanupScrollRef.current = () => {
      nextContainer.removeEventListener('scroll', handleContainerChange)
      window.removeEventListener('resize', handleContainerChange)
      scrollContainerRef.current = undefined
      cleanupScrollRef.current = undefined
    }
  }

  const scrollToHref = (href: string) => {
    const container = resolveContainer()
    const targetElement = getTargetElement(href, container)
    if (!targetElement) return

    const top = getOffsetTop(targetElement, container) - activeOffset
    setActiveHref(href)
    setContainerScrollTop(container, top)
    scheduleActiveSync()
  }

  onMounted(() => {
    bindContainerListener()
    scheduleActiveSync()
  })

  onUnmounted(() => {
    cleanupScrollRef.current?.()
    clearFrame()
  })

  watch(
    () => `${direction}|${itemSignature}|${activeOffset}|${bounds}`,
    () => {
      bindContainerListener()
      scheduleActiveSync()
    },
    { immediate: true },
  )

  const RenderItem: FC<{ item: NormalizedAnchorItem }> = ({ item }) => {
    const active = computed(() => activeHrefRef.value === item.href)
    const nestedVisible = direction !== 'horizontal' && !!item.children?.length
    const effectiveReplace = item.replace ?? replace
    const effectiveHref = item.disabled ? undefined : item.href

    return (
      <li
        key={item.keyText}
        data-rue-anchor-item={item.keyText}
        className={appendClassName(
          appendClassName(
            'list-none',
            direction === 'horizontal' ? 'shrink-0' : item.level > 0 ? 'pl-0' : undefined,
          ),
          classNames?.item,
        )}
        style={styles?.item}
      >
        <a
          href={effectiveHref}
          target={item.target}
          rel={item.target === '_blank' ? 'noreferrer' : undefined}
          aria-disabled={item.disabled ? 'true' : undefined}
          aria-current={active.get() ? 'location' : undefined}
          data-rue-anchor-href={item.href}
          data-active={active.get() ? 'true' : 'false'}
          className={appendClassName(
            appendClassName(
              appendClassName(
                direction === 'horizontal'
                  ? 'inline-flex min-w-0 items-center gap-2 rounded-full border px-3 py-2 text-sm transition duration-200 ease-out'
                  : 'group flex min-w-0 items-start gap-3 rounded-2xl border px-3 py-2.5 transition duration-200 ease-out',
                active
                  ? 'border-primary/35 bg-primary/8 text-primary shadow-[0_12px_30px_-24px_rgba(59,130,246,0.85)]'
                  : 'border-transparent bg-base-100/65 text-base-content/78 hover:border-base-300 hover:bg-base-100',
              ),
              item.disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer',
            ),
            appendClassName(classNames?.link, item.className),
          )}
          style={styles?.link}
          onClick={(event: MouseEvent) => {
            if (item.disabled) {
              event.preventDefault()
              event.stopPropagation()
              return
            }

            if (onClick) onClick(event, { title: item.title, href: item.href })
            if (event.defaultPrevented) return

            const targetElement = getTargetElement(item.href, resolveContainer())
            if (targetElement) {
              event.preventDefault()
              scrollToHref(item.href)
              updateHashSafely(item.href, effectiveReplace)
              return
            }

            if (effectiveReplace && isExternalHref(item.href)) {
              event.preventDefault()
              window.location.replace(item.href)
            }
          }}
        >
          {showIndicator ? (
            <span
              aria-hidden="true"
              data-rue-anchor-indicator="true"
              className={appendClassName(
                appendClassName(
                  direction === 'horizontal'
                    ? 'h-2 w-2 rounded-full border transition-colors'
                    : 'mt-1 h-2.5 w-2.5 shrink-0 rounded-full border transition-colors',
                  active.get() ? 'border-primary bg-primary' : 'border-base-300 bg-base-100',
                ),
                classNames?.indicator,
              )}
              style={styles?.indicator}
            />
          ) : null}
          <span className="min-w-0 flex-1">
            <span
              data-rue-anchor-title="true"
              className={appendClassName(
                appendClassName(
                  'block truncate text-sm font-medium leading-6',
                  active.get() ? 'text-primary' : 'text-base-content',
                ),
                classNames?.title,
              )}
              style={styles?.title}
            >
              {String(resolveItemTitle(item))}
            </span>
            {item.description && direction !== 'horizontal' ? (
              <span
                className={appendClassName(
                  'mt-0.5 block text-xs leading-5 text-base-content/58',
                  classNames?.description,
                )}
                style={styles?.description}
              >
                {String(item.description)}
              </span>
            ) : null}
          </span>
        </a>
        {nestedVisible ? (
          <ul className="mt-2 space-y-1.5 border-l border-base-300/70 pl-4">
            {item.children!.map(child => (
              <RenderItem key={child.keyText} item={child} />
            ))}
          </ul>
        ) : null}
      </li>
    )
  }

  const mergedRootClassName = appendClassName(
    appendClassName(
      appendClassName(
        appendClassName(
          direction === 'horizontal'
            ? 'rue-anchor overflow-x-auto rounded-[1.5rem] border border-base-300/70 bg-gradient-to-r from-base-100 via-base-100 to-base-200/50 p-3 shadow-[0_20px_45px_-36px_rgba(15,23,42,0.45)]'
            : 'rue-anchor rounded-[1.5rem] border border-base-300/70 bg-gradient-to-b from-base-100 via-base-100 to-base-200/40 p-4 shadow-[0_20px_45px_-36px_rgba(15,23,42,0.45)]',
          affix ? 'z-[1]' : undefined,
        ),
        classNames?.root,
      ),
      rootClassName,
    ),
    className,
  )

  return (
    <nav
      ref={rootRef}
      {...rest}
      aria-label="页内导航"
      className={mergedRootClassName}
      style={{ ...resolveStickyStyle(affix, offsetTop), ...styles?.root, ...style }}
      data-rue-anchor="true"
      data-rue-anchor-direction={direction}
    >
      {shouldRenderChildrenFallback ? (
        <div
          className={appendClassName(
            direction === 'horizontal'
              ? 'flex flex-wrap items-center gap-2'
              : 'flex flex-col items-stretch gap-2',
            classNames?.list,
          )}
          style={styles?.list}
          data-rue-anchor-children="true"
        >
          {children}
        </div>
      ) : (
        <ul
          className={appendClassName(
            direction === 'horizontal' ? 'flex items-center gap-2' : 'space-y-1.5',
            classNames?.list,
          )}
          style={styles?.list}
        >
          {visibleItems.map(item => (
            <RenderItem key={item.keyText} item={item} />
          ))}
        </ul>
      )}
    </nav>
  )
}

type AnchorComponent = FC<AnchorProps> & {
  Link: typeof AnchorLink
}

const Anchor = AnchorBase as AnchorComponent

Anchor.Link = AnchorLink

/** 导出 Anchor 复合组件类型，包含 Link 子组件。 */
export type { AnchorComponent }

/** 默认导出锚点组件。 */
export default Anchor

export { AnchorLink }
