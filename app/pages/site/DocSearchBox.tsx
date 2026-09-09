import { type FC, computed, useEffect, useRef, useState } from '@rue-js/rue'
import { useRouter } from '@rue-js/router'
import type { DocSearchResult } from './docSearch'

const blockTypeLabel: Record<DocSearchResult['type'], string> = {
  heading: '标题',
  paragraph: '段落',
  list: '列表',
  code: '代码',
  blockquote: '引用',
  table: '表格',
}

const SEARCH_DEBOUNCE_MS = 300

const scrollToCurrentHash = () => {
  const hash = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : ''
  if (!hash) {
    return
  }

  const target = document.getElementById(hash)
  if (target) {
    target.scrollIntoView({ block: 'start' })
  }
}

const navigateToResult = (
  event: MouseEvent,
  result: DocSearchResult,
  openResult: (result: DocSearchResult) => Promise<void>,
) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return
  }

  event.preventDefault()
  void openResult(result)
}

const DocSearch: FC = () => {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<DocSearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const composingRef = useRef(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const resultsScrollRef = useRef<HTMLDivElement | null>(null)
  const requestVersionRef = useRef(0)
  const searchDebounceTimerRef = useRef<number | null>(null)
  const trimmedQuery = computed(() => query.trim())
  const hasQuery = computed(() => trimmedQuery.get().length > 0)

  const focusInput = () => {
    window.setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  const openSearch = () => {
    setOpen(true)
    focusInput()
  }

  const clearSearchDebounce = () => {
    if (searchDebounceTimerRef.current != null) {
      window.clearTimeout(searchDebounceTimerRef.current)
      searchDebounceTimerRef.current = null
    }
  }

  const scrollResultIntoView = (index: number) => {
    window.requestAnimationFrame(() => {
      const container = resultsScrollRef.current
      const result = container?.querySelector<HTMLElement>(
        `[data-doc-search-result-index="${index}"]`,
      )

      if (!container || !result) {
        return
      }

      const containerRect = container.getBoundingClientRect()
      const resultRect = result.getBoundingClientRect()

      if (resultRect.top < containerRect.top) {
        container.scrollTop -= containerRect.top - resultRect.top
      } else if (resultRect.bottom > containerRect.bottom) {
        container.scrollTop += resultRect.bottom - containerRect.bottom
      }
    })
  }

  const resetResultsScroll = () => {
    window.requestAnimationFrame(() => {
      if (resultsScrollRef.current) {
        resultsScrollRef.current.scrollTop = 0
      }
    })
  }

  const runSearch = async (nextQuery: string, requestVersion: number) => {
    try {
      const { searchDocBlocks } = await import('./docSearch')
      if (requestVersion !== requestVersionRef.current) {
        return
      }

      const nextResults = await searchDocBlocks(nextQuery)
      if (requestVersion !== requestVersionRef.current) {
        return
      }

      setResults(nextResults)
      setSelectedIndex(0)
      resetResultsScroll()
    } catch {
      if (requestVersion === requestVersionRef.current) {
        setResults([])
        setSelectedIndex(0)
        resetResultsScroll()
      }
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setSearching(false)
      }
    }
  }

  const scheduleSearch = (nextQuery: string) => {
    const requestVersion = (requestVersionRef.current ?? 0) + 1
    requestVersionRef.current = requestVersion
    setQuery(nextQuery)
    setOpen(true)
    clearSearchDebounce()

    if (nextQuery.trim().length < 2) {
      setResults([])
      setSelectedIndex(0)
      resetResultsScroll()
      setSearching(false)
      return
    }

    setSearching(true)
    searchDebounceTimerRef.current = window.setTimeout(() => {
      searchDebounceTimerRef.current = null
      void runSearch(nextQuery, requestVersion)
    }, SEARCH_DEBOUNCE_MS)
  }

  const closeSearch = () => {
    requestVersionRef.current = (requestVersionRef.current ?? 0) + 1
    clearSearchDebounce()
    setOpen(false)
    setSearching(false)
  }

  const openResult = async (result: DocSearchResult) => {
    const targetUrl = new URL(result.href, window.location.origin)
    const currentPath = window.location.pathname.replace(/\/$/, '') || '/'
    const targetPath = targetUrl.pathname.replace(/\/$/, '') || '/'

    if (currentPath !== targetPath) {
      await router.push(result.route)
    }

    window.history.replaceState(null, '', result.href)
    window.setTimeout(scrollToCurrentHash, 80)
    window.setTimeout(scrollToCurrentHash, 240)
  }

  const commitSelectedResult = () => {
    const selected = results[selectedIndex]
    if (!selected) {
      return
    }

    closeSearch()
    void openResult({ ...selected })
  }

  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        openSearch()
      }

      if (event.key === 'Escape' && open) {
        event.preventDefault()
        closeSearch()
      }
    }

    window.addEventListener('keydown', onKeydown)
    return () => {
      clearSearchDebounce()
      window.removeEventListener('keydown', onKeydown)
    }
  }, [])

  return (
    <>
      <button
        type="button"
        className="hidden h-10 w-48 items-center gap-3 rounded border border-base-300/80 bg-base-100/80 px-3 text-left text-base-content/65 shadow-sm transition hover:border-emerald-400 hover:text-base-content md:inline-flex"
        aria-label="打开文档搜索"
        onClick={openSearch}
      >
        <span className="relative inline-block h-5 w-5 shrink-0 rounded-full border-2 border-current after:absolute after:-bottom-1 after:-right-1 after:h-2 after:w-0.5 after:rotate-[-45deg] after:rounded after:bg-current" />
        <span className="min-w-0 flex-1 text-base">Search</span>
        <kbd className="kbd kbd-sm border-base-300 bg-base-200 text-base-content/55">⌘ K</kbd>
      </button>

      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square md:hidden"
        aria-label="打开文档搜索"
        onClick={openSearch}
      >
        <span className="relative inline-block h-5 w-5 rounded-full border-2 border-current after:absolute after:-bottom-1 after:-right-1 after:h-2 after:w-0.5 after:rotate-[-45deg] after:rounded after:bg-current" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[120] bg-slate-900/55 px-4 pb-8 pt-16 backdrop-blur-[1px] md:pt-24">
          <div
            aria-hidden="true"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={closeSearch}
          />
          <div className="relative mx-auto flex max-h-[min(44rem,calc(100vh-6rem))] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-base-300 bg-base-100 shadow-2xl md:max-h-[min(44rem,calc(100vh-8rem))]">
            <div className="p-4">
              <label className="flex h-16 items-center gap-4 rounded border border-emerald-400 bg-base-100 px-5 text-base-content shadow-sm focus-within:ring-2 focus-within:ring-emerald-400/20">
                <span className="relative inline-block h-8 w-8 shrink-0 rounded-full border-[3px] border-emerald-400 after:absolute after:-bottom-1 after:-right-1 after:h-3 after:w-1 after:rotate-[-45deg] after:rounded after:bg-emerald-400" />
                <input
                  ref={(element: HTMLInputElement | null) => {
                    inputRef.current = element
                  }}
                  className="h-full min-w-0 flex-1 bg-transparent text-2xl outline-none placeholder:text-base-content/35"
                  type="search"
                  value={query}
                  placeholder="Search docs"
                  aria-label="搜索文档块"
                  onInput={(event: any) => {
                    const inputType =
                      typeof event.inputType === 'string' ? event.inputType.toLowerCase() : ''

                    if (
                      composingRef.current ||
                      !!event.isComposing ||
                      inputType.includes('composition')
                    ) {
                      return
                    }

                    scheduleSearch((event.target as HTMLInputElement).value)
                  }}
                  onCompositionStart={() => {
                    composingRef.current = true
                  }}
                  onCompositionEnd={(event: any) => {
                    composingRef.current = false
                    scheduleSearch((event.target as HTMLInputElement).value)
                  }}
                  onKeydown={(event: KeyboardEvent) => {
                    if (event.key === 'Escape') {
                      event.preventDefault()
                      closeSearch()
                      return
                    }

                    if (event.key === 'ArrowDown') {
                      event.preventDefault()
                      const nextIndex = Math.min(selectedIndex + 1, Math.max(results.length - 1, 0))
                      setSelectedIndex(nextIndex)
                      scrollResultIntoView(nextIndex)
                      return
                    }

                    if (event.key === 'ArrowUp') {
                      event.preventDefault()
                      const nextIndex = Math.max(selectedIndex - 1, 0)
                      setSelectedIndex(nextIndex)
                      scrollResultIntoView(nextIndex)
                      return
                    }

                    if (event.key === 'Enter') {
                      event.preventDefault()
                      commitSelectedResult()
                    }
                  }}
                />
              </label>
            </div>

            <div
              ref={(element: HTMLDivElement | null) => {
                resultsScrollRef.current = element
              }}
              className="min-h-0 flex-1 overflow-auto px-4 pb-4"
            >
              {hasQuery.get() ? (
                searching ? (
                  <div className="px-1 py-8 text-sm text-base-content/60">正在搜索文档块...</div>
                ) : results.length ? (
                  <div className="space-y-3">
                    {results.map((result, index) => (
                      <a
                        key={result.id}
                        data-doc-search-result-index={index}
                        className={`block rounded-md border px-5 py-4 shadow-sm transition focus:outline-none ${
                          index === selectedIndex
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-base-300 bg-base-100 hover:border-emerald-400 hover:bg-base-200'
                        }`}
                        href={result.href}
                        onMouseEnter={() => setSelectedIndex(index)}
                        onClick={(event: MouseEvent) => {
                          closeSearch()
                          navigateToResult(event, result, openResult)
                        }}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0 truncate text-lg font-semibold">
                            {result.sectionTitle}
                          </div>
                          <span
                            className={`badge badge-sm shrink-0 ${
                              index === selectedIndex
                                ? 'border-white/40 bg-white/20 text-white'
                                : 'badge-ghost'
                            }`}
                          >
                            {blockTypeLabel[result.type]}
                          </span>
                        </div>
                        <div
                          className={`mt-1 truncate text-sm ${
                            index === selectedIndex ? 'text-white/80' : 'text-base-content/50'
                          }`}
                        >
                          {result.title}
                        </div>
                        <p
                          className={`mt-2 line-clamp-2 text-sm leading-6 ${
                            index === selectedIndex ? 'text-white/85' : 'text-base-content/70'
                          }`}
                        >
                          {result.snippet}
                        </p>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-base-300 px-5 py-8 text-sm text-base-content/60">
                    没有找到匹配的文档块
                  </div>
                )
              ) : (
                <div className="rounded-md border border-dashed border-base-300 px-5 py-8 text-sm text-base-content/60">
                  输入至少 2 个字符，搜索 docs 目录里的标题、段落、列表和代码块
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-base-300 bg-base-200/80 px-5 py-3 text-sm text-base-content/60">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-2">
                  <kbd className="kbd kbd-xs">↵</kbd>
                  <span>选择</span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex items-center gap-1">
                    <kbd className="kbd kbd-xs">↑</kbd>
                    <kbd className="kbd kbd-xs">↓</kbd>
                  </span>
                  <span>导航</span>
                </span>
                <span className="inline-flex items-center gap-2">
                  <kbd className="kbd kbd-xs">esc</kbd>
                  <span>关闭</span>
                </span>
              </div>
              <span className="hidden sm:inline">Rue docs</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default DocSearch
