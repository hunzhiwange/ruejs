import { type FC, onMounted, onUnmounted, ref, useRef } from '@rue-js/rue'
import { Anchor } from '@rue-js/design'
type PageContentAnchorItem = {
  key: string
  href: string
  title: string
  children?: PageContentAnchorItem[]
}

type PageContentAnchorProps = {
  containerRef: {
    current?: HTMLElement | null
  }
}

const HEADING_SELECTOR = 'h2, h3'
const MAX_ANCHOR_ITEMS = 48

const normalizeHeadingText = (value: string) => {
  return value.replace(/^#\s*/, '').replace(/\s+/g, ' ').trim()
}

const slugifyHeading = (value: string) => {
  const slug = value
    .toLowerCase()
    .replace(/[`~!@#$%^&*()+=[\]{};:'",.<>/?\\|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'section'
}

const shouldSkipHeading = (heading: HTMLHeadingElement) => {
  if (heading.closest('[data-rue-anchor="true"]')) {
    return true
  }

  const notProseRoot = heading.closest('.not-prose')
  return !!notProseRoot && !heading.classList.contains('component-preview-title')
}

const ensureHeadingId = (heading: HTMLHeadingElement, title: string, usedIds: Set<string>) => {
  const existingId = heading.getAttribute('id')?.trim()
  if (existingId) {
    usedIds.add(existingId)
    return existingId
  }

  const baseId = `page-nav-${slugifyHeading(title)}`
  let id = baseId
  let index = 2

  while (
    (document.getElementById(id) && document.getElementById(id) !== heading) ||
    usedIds.has(id)
  ) {
    id = `${baseId}-${index}`
    index += 1
  }

  heading.id = id
  usedIds.add(id)
  return id
}

const buildAnchorItems = (container: HTMLElement): PageContentAnchorItem[] => {
  const usedIds = new Set<string>()
  const roots: PageContentAnchorItem[] = []
  let currentRoot: PageContentAnchorItem | null = null

  const headings = Array.from(container.querySelectorAll<HTMLHeadingElement>(HEADING_SELECTOR))
    .filter(heading => !shouldSkipHeading(heading))
    .slice(0, MAX_ANCHOR_ITEMS)

  headings.forEach(heading => {
    const title = normalizeHeadingText(heading.textContent || '')
    if (!title) {
      return
    }

    const id = ensureHeadingId(heading, title, usedIds)
    const item: PageContentAnchorItem = {
      key: id,
      href: `#${id}`,
      title,
    }

    if (heading.tagName.toLowerCase() === 'h3' && currentRoot) {
      currentRoot.children = [...(currentRoot.children || []), item]
      return
    }

    roots.push(item)
    currentRoot = item
  })

  return roots
}

const flattenSignature = (items: PageContentAnchorItem[]): string => {
  return items
    .map(item => {
      const childSignature = item.children?.length ? `(${flattenSignature(item.children)})` : ''
      return `${item.href}:${item.title}${childSignature}`
    })
    .join('|')
}

const PageContentAnchor: FC<PageContentAnchorProps> = ({ containerRef }) => {
  const shellRef = useRef<HTMLElement>()
  const scrollPanelRef = useRef<HTMLDivElement>()
  const collectTaskRef = useRef<{ kind: 'idle' | 'timeout'; id: number } | undefined>()
  const observerRef = useRef<MutationObserver | undefined>()
  const signatureRef = useRef('')
  const anchorItems = ref<PageContentAnchorItem[]>([])

  const scrollAnchorLinkIntoView = (href?: string) => {
    const scrollPanel = scrollPanelRef.current
    if (!scrollPanel) {
      return
    }

    const links = Array.from(
      scrollPanel.querySelectorAll<HTMLAnchorElement>('[data-rue-anchor-href]'),
    )
    const activeLink = href
      ? links.find(link => link.getAttribute('data-rue-anchor-href') === href)
      : links.find(link => link.getAttribute('data-active') === 'true')

    if (!activeLink) {
      return
    }

    const padding = 12
    const panelRect = scrollPanel.getBoundingClientRect()
    const linkRect = activeLink.getBoundingClientRect()
    const topOverflow = linkRect.top - panelRect.top - padding
    const bottomOverflow = linkRect.bottom - panelRect.bottom + padding

    if (topOverflow < 0) {
      scrollPanel.scrollTop += topOverflow
      return
    }

    if (bottomOverflow > 0) {
      scrollPanel.scrollTop += bottomOverflow
    }
  }

  const scheduleAnchorLinkScroll = (href?: string) => {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      scrollAnchorLinkIntoView(href)
      return
    }

    window.requestAnimationFrame(() => {
      scrollAnchorLinkIntoView(href)
    })
  }

  const collectItems = () => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const nextItems = buildAnchorItems(container)
    const nextSignature = flattenSignature(nextItems)
    if (nextSignature === signatureRef.current) {
      return
    }

    signatureRef.current = nextSignature
    anchorItems.value = nextItems
  }

  const cancelScheduledCollect = () => {
    const task = collectTaskRef.current
    if (!task || typeof window === 'undefined') {
      return
    }

    const idleWindow = window as typeof window & {
      cancelIdleCallback?: (id: number) => void
    }
    if (task.kind === 'idle' && typeof idleWindow.cancelIdleCallback === 'function') {
      idleWindow.cancelIdleCallback(task.id)
    } else {
      window.clearTimeout(task.id)
    }
    collectTaskRef.current = undefined
  }

  const scheduleCollect = () => {
    if (typeof window === 'undefined') {
      collectItems()
      return
    }

    cancelScheduledCollect()

    const idleWindow = window as typeof window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number
    }
    if (typeof idleWindow.requestIdleCallback === 'function') {
      const id = idleWindow.requestIdleCallback(
        () => {
          collectTaskRef.current = undefined
          collectItems()
        },
        { timeout: 250 },
      )
      collectTaskRef.current = { kind: 'idle', id }
      return
    }

    const id = window.setTimeout(() => {
      collectTaskRef.current = undefined
      collectItems()
    }, 16)
    collectTaskRef.current = { kind: 'timeout', id }
  }

  onMounted(() => {
    scheduleCollect()

    const container = containerRef.current
    if (!container || typeof MutationObserver === 'undefined') {
      return
    }

    observerRef.current = new MutationObserver(() => {
      scheduleCollect()
    })
    observerRef.current.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    })
  })

  onUnmounted(() => {
    observerRef.current?.disconnect()
    observerRef.current = undefined

    cancelScheduledCollect()
    anchorItems.value = []
  })

  return (
    <aside
      ref={shellRef}
      className="hidden xl:block w-60 shrink-0"
      aria-hidden={anchorItems.value.length === 0 ? 'true' : undefined}
      style={{ visibility: anchorItems.value.length === 0 ? 'hidden' : '' }}
    >
      <div
        ref={scrollPanelRef}
        className="fixed top-24 w-60 max-h-[calc(100vh-7rem)] overflow-auto"
        style={{
          right: 'max(1.5rem, calc((100vw - 1400px) / 2 + 1.5rem))',
        }}
      >
        <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/45">
          页内导航
        </div>
        {anchorItems.value.length ? (
          <Anchor
            affix={false}
            targetOffset={96}
            items={anchorItems.value}
            onChange={href => {
              scheduleAnchorLinkScroll(href)
            }}
            classNames={{
              root: 'rounded-box border-base-300/60 bg-base-100/95 p-3 shadow-sm backdrop-blur',
              list: 'space-y-1',
              link: 'rounded-xl px-2.5 py-1.5',
              title: 'text-xs',
              description: 'hidden',
            }}
          />
        ) : null}
      </div>
    </aside>
  )
}

export default PageContentAnchor
