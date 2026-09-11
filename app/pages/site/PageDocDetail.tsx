import { Component, type FC, computed, useState, useEffect, useRef } from '@rue-js/rue'
import { useRoute, useRouter } from '@rue-js/router'
import { readStaticRenderRoute, useStaticRenderContext } from '../../staticRenderContext'
import SidebarPlayground from './SidebarPlaygroundPage'
import {
  type DocDetailContent,
  loadCachedDocContent,
  readStaticDocContentByRoute,
} from './docDetailCache'
import { readDocRouteSegment } from './docRouteSegment'

function getContext(): {
  uiBase: string
  docBase: string
} {
  const uiBase = '/page'
  const docBase = '/docs'
  return { uiBase, docBase }
}

type PageDocDetailProps = {
  params?: {
    path?: string
  }
}

const PageDocDetail: FC<PageDocDetailProps> = props => {
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

  useEffect(() => {
    const loadRouteContent = async (seg: string) => {
      const currentRequest = (requestVersionRef.current ?? 0) + 1
      requestVersionRef.current = currentRequest
      if (!seg) {
        setRenderedDocContent({ type: 'html', html: '' })
        return
      }

      try {
        const out = await loadCachedDocContent('page', context.docBase, seg)
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
            <Component is="mdx" registry={{ mdx: readMdxComponent() }} />
          </div>
        ) : (
          <div
            className="max-w-none prose prose-sm md:prose-base"
            id="doc-body"
            dangerouslySetInnerHTML={{ __html: html }}
          ></div>
        )}
      </div>
    </SidebarPlayground>
  )
}

export default PageDocDetail
