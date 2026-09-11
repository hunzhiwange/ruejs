import { Component, type FC, useState, computed, useEffect, useRef } from '@rue-js/rue'
import { RouterLink, useRoute, useRouter } from '@rue-js/router'
import { readStaticRenderRoute, useStaticRenderContext } from '../../staticRenderContext'
import SidebarPlayground, { SECTIONS_BY_TYPE } from './SidebarPlaygroundApi'
import {
  type DocDetailContent,
  loadCachedDocContent,
  readStaticDocContentByRoute,
} from './docDetailCache'
import { readDocRouteSegment } from './docRouteSegment'

// 从 SidebarPlayground 的 SECTIONS_BY_TYPE 派生 DOCS_META，用于上一页/下一页
type MenuItem = { id: string; title: string; href?: string; children?: MenuItem[] }
function flatten(items: MenuItem[]): { id: string; title: string }[] {
  const out: { id: string; title: string }[] = []
  for (const it of items || []) {
    if (it.children && it.children.length) {
      out.push(...it.children.map(c => ({ id: c.id, title: c.title })))
    } else {
      out.push({ id: it.id, title: it.title })
    }
  }
  return out
}
function getContext(): {
  uiBase: string
  docBase: string
} {
  const uiBase = '/api'
  const docBase = '/docs'
  return { uiBase, docBase }
}

type ApiDocDetailProps = {
  params?: {
    path?: string
  }
}

const ApiDocDetail: FC<ApiDocDetailProps> = props => {
  const route = useRoute()
  const router = useRouter()
  const staticRenderContext = useStaticRenderContext()
  const [_results, _setResults] = useState<{ id: string; title: string; snippet: string }[]>([])
  const context = getContext()
  const routeSegment = computed<string>(() => {
    const routeData = route.get() as any
    return readDocRouteSegment({
      propPath: props.params?.path,
      routePath: routeData?.params?.path as string | undefined,
      currentRoutePath: routeData?.path as string | undefined,
      staticRenderUrl: staticRenderContext?.url || readStaticRenderRoute(),
      uiBase: context.uiBase,
    })
  })
  const requestVersionRef = useRef(0)
  const currentPath = computed<string>(() => {
    const seg = routeSegment.get()
    return seg ? `${context.uiBase}/${seg}` : ''
  })
  const initialContent = readStaticDocContentByRoute(currentPath.get())
  const initialMdxComponent = initialContent.type === 'mdx' ? initialContent.Component : null
  const mdxComponentRef = useRef<FC | null>(initialMdxComponent)
  const [docContentType, setDocContentType] = useState<DocDetailContent['type']>(
    initialContent.type,
  )
  const [html, setHtml] = useState(initialContent.type === 'html' ? initialContent.html : '')
  const setRenderedDocContent = (content: DocDetailContent) => {
    if (content.type === 'mdx') {
      mdxComponentRef.current = content.Component
      setHtml('')
      setDocContentType('mdx')
      return
    }
    mdxComponentRef.current = null
    setHtml(content.html)
    setDocContentType('html')
  }

  const DOCS_META = computed(() => {
    return SECTIONS_BY_TYPE['api'].flatMap(sec => flatten(sec.items))
  })
  const currentIndex = computed(() => {
    const list = DOCS_META.get()
    const seg = routeSegment.get()
    return list.findIndex(d => d.id === seg)
  })
  const prev = computed(() => {
    const idx = currentIndex.get()
    const list = DOCS_META.get()
    return idx > 0 ? list[idx - 1] : undefined
  })
  const next = computed(() => {
    const idx = currentIndex.get()
    const list = DOCS_META.get()
    return idx >= 0 && idx < list.length - 1 ? list[idx + 1] : undefined
  })
  useEffect(() => {
    const loadRouteContent = async (seg: string) => {
      const currentRequest = (requestVersionRef.current ?? 0) + 1
      requestVersionRef.current = currentRequest
      if (!seg) {
        setRenderedDocContent({ type: 'html', html: '' })
        return
      }
      try {
        const out = await loadCachedDocContent('api', context.docBase, seg)
        if (currentRequest !== requestVersionRef.current) {
          return
        }
        setRenderedDocContent(out)
      } catch {
        if (currentRequest !== requestVersionRef.current) {
          return
        }

        setRenderedDocContent({
          type: 'html',
          html: `<p class="text-base-content/70">加载文档失败</p>`,
        })
      }
    }
    void loadRouteContent(String((route.get() as any)?.params?.path || props.params?.path || ''))
    const removeAfterEach = router.afterEach(to => {
      void loadRouteContent(String((to as any)?.params?.path || props.params?.path || ''))
    })

    const onClick = (e: Event) => {
      const target = e.target as HTMLElement
      const btn = target.closest('.copy-code-btn') as HTMLElement | null
      if (!btn) return
      const wrapper = btn.closest('.doc-code-wrapper') as HTMLElement | null
      const pre = wrapper?.querySelector('pre.shiki') as HTMLElement | null
      const codeText = pre?.textContent || ''
      if (!codeText) return
      navigator.clipboard.writeText(codeText)
      const prevText = btn.textContent || '复制'
      btn.textContent = '已复制'
      setTimeout(() => {
        btn.textContent = prevText
      }, 1500)
    }
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('click', onClick)
      removeAfterEach()
    }
  }, [])

  const readMdxComponent = () => (docContentType === 'mdx' ? mdxComponentRef.current : null)

  return (
    <SidebarPlayground currentPath={currentPath.get()}>
      <div>
        {readMdxComponent() ? (
          <div className="max-w-none prose prose-sm md:prose-base" id="doc-body">
            <Component is={readMdxComponent()} />
          </div>
        ) : (
          <div
            className="max-w-none prose prose-sm md:prose-base"
            id="doc-body"
            dangerouslySetInnerHTML={{ __html: html }}
          ></div>
        )}
        {currentIndex.get() >= 0 && (
          <div className="mt-8 flex justify-between">
            {prev.get() ? (
              <RouterLink
                to={`${context.uiBase}/${prev?.get()?.id}`}
                className="btn btn-outline btn-sm"
              >
                ← 上一页：{prev?.get()?.title}
              </RouterLink>
            ) : (
              <span />
            )}
            {next.get() ? (
              <RouterLink
                to={`${context.uiBase}/${next.get()?.id}`}
                className="btn btn-outline btn-sm"
              >
                下一页：{next?.get()?.title} →
              </RouterLink>
            ) : (
              <span />
            )}
          </div>
        )}
      </div>
    </SidebarPlayground>
  )
}

export default ApiDocDetail
