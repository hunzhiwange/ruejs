import { type FC, computed, onMounted, onUnmounted, ref, useRef, watchEffect } from '@rue-js/rue'
import { extend } from '@rue-js/shared'
import { RouterLink, useRoute } from '@rue-js/router'
import PageContentAnchor from './PageContentAnchor'

export type SidebarItem = {
  id: string
  title: string
  href?: string
  children?: SidebarItem[]
}

export type SidebarSection = {
  id: string
  title: string
  items: SidebarItem[]
}

type PreparedSidebarItem = SidebarItem & {
  children?: PreparedSidebarItem[]
  itemCount: number
  searchText: string
}

type PreparedSidebarSection = SidebarSection & {
  items: PreparedSidebarItem[]
  itemCount: number
  normalizedTitle: string
}

const countPreparedSidebarItems = (items: PreparedSidebarItem[]): number => {
  return items.reduce((total, item) => total + item.itemCount, 0)
}

const normalizeSidebarSearch = (value: string): string => {
  return value.trim().toLowerCase()
}

const prepareSidebarItems = (items: SidebarItem[]): PreparedSidebarItem[] => {
  return items.map(item => {
    const children = item.children?.length ? prepareSidebarItems(item.children) : undefined
    const itemCount = children?.length ? countPreparedSidebarItems(children) : 1

    return extend(item, {
      children,
      itemCount,
      searchText: normalizeSidebarSearch([item.title, item.id, item.href || ''].join(' ')),
    }) as PreparedSidebarItem
  })
}

const prepareSidebarSections = (sections: SidebarSection[]): PreparedSidebarSection[] => {
  return sections.map(section => {
    const items = prepareSidebarItems(section.items)

    return extend(section, {
      items,
      itemCount: countPreparedSidebarItems(items),
      normalizedTitle: normalizeSidebarSearch(section.title),
    }) as PreparedSidebarSection
  })
}

const filterSidebarItems = (items: PreparedSidebarItem[], query: string): PreparedSidebarItem[] => {
  if (!query) {
    return items
  }

  return items.reduce<PreparedSidebarItem[]>((matchedItems, item) => {
    const matchedChildren = item.children?.length
      ? filterSidebarItems(item.children, query)
      : undefined
    const isItemMatched = item.searchText.includes(query)

    if (matchedChildren?.length) {
      matchedItems.push(
        extend(item, {
          children: matchedChildren,
          itemCount: countPreparedSidebarItems(matchedChildren),
        }) as PreparedSidebarItem,
      )
      return matchedItems
    }

    if (isItemMatched) {
      matchedItems.push(
        item.children?.length
          ? (extend(item, {
              children: undefined,
              itemCount: 1,
            }) as PreparedSidebarItem)
          : item,
      )
    }

    return matchedItems
  }, [])
}

type PersistentSidebarPlaygroundOptions = {
  sections: SidebarSection[]
  wrapperClassName?: string
  showCounts?: boolean
  fallbackToRoute?: boolean
}

type SidebarPlaygroundProps = {
  currentPath?: string
  children?: any
}

const useOptionalRoute = () => {
  try {
    return useRoute()
  } catch {
    return null
  }
}

const normalizeCurrentPath = (path: string) => {
  if (!path) {
    return ''
  }

  const normalized = path.startsWith('/') ? path : `/${path}`
  return normalized.length > 1 ? normalized.replace(/\/+$/g, '') : normalized
}

const readCurrentLocationPath = () => {
  const location = globalThis.location
  if (!location) {
    return ''
  }

  const hash = location.hash || ''
  if (hash.startsWith('#')) {
    return normalizeCurrentPath(hash.slice(1) || '/')
  }

  return normalizeCurrentPath(location.pathname || '')
}

const updateSidebarActiveLinks = (root: HTMLElement, activePath: string) => {
  root.querySelectorAll<HTMLAnchorElement>('[data-rue-sidebar-href]').forEach(link => {
    const isActive = link.getAttribute('data-rue-sidebar-href') === activePath
    link.classList.toggle('active', isActive)
    if (isActive) {
      link.setAttribute('aria-current', 'page')
    } else {
      link.removeAttribute('aria-current')
    }
  })
}

const SidebarItemRow: FC<{
  item: SidebarItem
  getActivePath: () => string
  useRouterLinks: boolean
}> = props => {
  const isItemActive = () => props.getActivePath() === props.item.href
  return (
    <li key={props.item.id}>
      {props.item.children && props.item.children.length ? (
        <div>
          <div className="px-3 py-2 font-medium text-base-content/80">{props.item.title}</div>
          <ul className="menu menu-sm bg-transparent rounded-box w-full">
            <SidebarItemsList
              items={props.item.children}
              getActivePath={props.getActivePath}
              useRouterLinks={props.useRouterLinks}
            />
          </ul>
        </div>
      ) : props.item.href && props.useRouterLinks ? (
        <RouterLink
          to={props.item.href}
          aria-current={isItemActive() ? 'page' : undefined}
          className={`${isItemActive() ? 'active' : ''} w-full`}
          data-rue-sidebar-href={props.item.href}
        >
          {props.item.title}
        </RouterLink>
      ) : props.item.href ? (
        <a
          href={props.item.href}
          aria-current={isItemActive() ? 'page' : undefined}
          className={`${isItemActive() ? 'active' : ''} w-full`}
          data-rue-sidebar-href={props.item.href}
        >
          {props.item.title}
        </a>
      ) : (
        <span className="block w-full cursor-default rounded-btn px-3 py-2 text-base-content/45">
          {props.item.title}
        </span>
      )}
    </li>
  )
}

const SidebarItemsList: FC<{
  items: SidebarItem[]
  getActivePath: () => string
  useRouterLinks: boolean
}> = props => {
  return (
    <>
      {props.items.map(item => (
        <SidebarItemRow
          key={item.id}
          item={item}
          getActivePath={props.getActivePath}
          useRouterLinks={props.useRouterLinks}
        />
      ))}
    </>
  )
}

export const PersistentSidebarPlayground: FC<
  PersistentSidebarPlaygroundOptions & SidebarPlaygroundProps
> = ({
  sections,
  wrapperClassName,
  showCounts = false,
  fallbackToRoute = true,
  currentPath,
  children,
}) => {
  const preparedSections = prepareSidebarSections(sections)
  let sharedOpenSections: Record<string, boolean> | null = null
  let sharedSearchQuery: string | null = null

  const SidebarPlaygroundNavigation: FC<SidebarPlaygroundProps> = props => {
    const route = useOptionalRoute()
    const navRef = useRef<HTMLElement>()
    const activeWatcherRef = useRef<{ dispose?: () => void } | undefined>()
    const currentPath = computed(() => {
      if (props.currentPath !== undefined) {
        return normalizeCurrentPath(props.currentPath)
      }
      if (!fallbackToRoute || !route) {
        return ''
      }

      const routePath = normalizeCurrentPath(((route.get() as any)?.path || '') as string)
      return routePath || readCurrentLocationPath()
    })
    const searchQuery = ref(sharedSearchQuery ?? '')
    const searchComposingRef = useRef(false)

    const resolveInitialOpenSections = () => {
      if (sharedOpenSections) {
        return sharedOpenSections
      }

      const initialState: Record<string, boolean> = {}
      preparedSections.forEach(section => {
        initialState[section.id] = true
      })
      sharedOpenSections = initialState
      return initialState
    }
    const openSections = ref<Record<string, boolean>>(resolveInitialOpenSections())

    const toggleSection = (id: string) => {
      const current = openSections.value ?? resolveInitialOpenSections()
      const nextValue = !current[id]
      const next = extend(current, { [id]: nextValue })
      sharedOpenSections = next
      openSections.value = next
    }

    const normalizedSearchQuery = computed(() => normalizeSidebarSearch(searchQuery.value))
    const filteredSections = computed(() => {
      const query = normalizedSearchQuery.get()

      if (!query) {
        return preparedSections
      }

      return preparedSections.reduce<PreparedSidebarSection[]>((matchedSections, section) => {
        const matchedItems = filterSidebarItems(section.items, query)

        if (!matchedItems.length) {
          return matchedSections
        }

        matchedSections.push(
          extend(section, {
            items: matchedItems,
            itemCount: countPreparedSidebarItems(matchedItems),
          }) as PreparedSidebarSection,
        )
        return matchedSections
      }, [])
    })
    const visibleSectionItemCounts = computed(() => {
      if (!showCounts) {
        return {}
      }

      return filteredSections.get().reduce<Record<string, number>>((counts, section) => {
        counts[section.id] = section.itemCount
        return counts
      }, {})
    })
    const visibleTotalItemCount = computed(() => {
      if (!showCounts) {
        return 0
      }

      return filteredSections.get().reduce((total, section) => {
        return total + section.itemCount
      }, 0)
    })
    const isSearchActive = computed(() => normalizedSearchQuery.get().length > 0)

    const applyActivePath = (nextPath: string) => {
      if (navRef.current) {
        updateSidebarActiveLinks(navRef.current, nextPath)
      }
    }

    onMounted(() => {
      activeWatcherRef.current = watchEffect(() => {
        applyActivePath(currentPath.get())
      })
    })

    onUnmounted(() => {
      activeWatcherRef.current?.dispose?.()
      activeWatcherRef.current = undefined
    })

    const renderedSections = filteredSections.get() ?? preparedSections
    const renderedTotalItemCount =
      visibleTotalItemCount.get() ??
      countPreparedSidebarItems(preparedSections.flatMap(section => section.items))
    const renderedSearchActive = isSearchActive.get() ?? false
    const getRenderedActivePath = () => currentPath.get() ?? ''
    const getRenderedSectionItemCount = (section: PreparedSidebarSection) => {
      const counts = visibleSectionItemCounts.get()
      return counts?.[section.id] ?? section.itemCount
    }

    return (
      <aside className="w-full">
        <div className="sticky top-20">
          <nav ref={navRef} className="space-y-3 w-full">
            {showCounts ? (
              <div className="rounded-box border border-base-300/60 bg-base-100 px-4 py-3 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-base-content/45">
                  目录统计
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-sm text-base-content/70">总条目</span>
                  <span className="badge badge-neutral badge-lg">{renderedTotalItemCount}</span>
                </div>
                <label className="mt-3 block">
                  <span className="sr-only">搜索目录条目</span>
                  <input
                    className="input input-sm input-bordered w-full"
                    value={searchQuery.value}
                    onInput={(event: any) => {
                      const next = (event.target as HTMLInputElement).value
                      const inputType =
                        typeof event.inputType === 'string' ? event.inputType.toLowerCase() : ''

                      if (
                        searchComposingRef.current ||
                        !!event.isComposing ||
                        inputType.includes('composition')
                      ) {
                        return
                      }

                      sharedSearchQuery = next
                      searchQuery.value = next
                    }}
                    onCompositionStart={() => {
                      searchComposingRef.current = true
                    }}
                    onCompositionEnd={(event: any) => {
                      const next = (event.target as HTMLInputElement).value
                      searchComposingRef.current = false
                      sharedSearchQuery = next
                      searchQuery.value = next
                    }}
                    placeholder="搜索条目 / Search"
                  />
                </label>
              </div>
            ) : null}
            {renderedSections.length ? (
              renderedSections.map(section => (
                <div
                  key={section.id}
                  className={`collapse collapse-arrow bg-base-100 rounded-box shadow w-full ${
                    (openSections.value?.[section.id] ?? true) || renderedSearchActive
                      ? 'collapse-open'
                      : ''
                  }`}
                >
                  <button
                    className="collapse-title px-3 py-2 font-medium text-base-content w-full text-left"
                    onClick={() => toggleSection(section.id)}
                  >
                    {showCounts ? (
                      <span className="flex items-center justify-between gap-3 pr-6">
                        <span>{section.title}</span>
                        <span className="badge badge-ghost badge-sm shrink-0">
                          {getRenderedSectionItemCount(section)}
                        </span>
                      </span>
                    ) : (
                      section.title
                    )}
                  </button>
                  <div className="collapse-content px-0">
                    <ul className="menu menu-sm bg-transparent rounded-box w-full">
                      <SidebarItemsList
                        items={section.items}
                        getActivePath={getRenderedActivePath}
                        useRouterLinks={!!route}
                      />
                    </ul>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-box border border-dashed border-base-300/70 bg-base-100 px-4 py-5 text-sm text-base-content/60 shadow-sm">
                未找到匹配条目
              </div>
            )}
          </nav>
        </div>
      </aside>
    )
  }

  const contentRef = useRef<HTMLElement>()
  const rootClassName = [
    'sidebar-playground',
    wrapperClassName,
    'md:flex',
    'md:items-start',
    'md:gap-6',
    'xl:grid',
    'xl:grid-cols-[11.25rem_minmax(0,1fr)_15rem]',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootClassName}>
      <div className="md:w-45 shrink-0">
        <SidebarPlaygroundNavigation currentPath={currentPath} />
      </div>
      <article ref={contentRef} class="component-preview min-w-0">
        {children}
      </article>
      <PageContentAnchor containerRef={contentRef} />
    </div>
  )
}
