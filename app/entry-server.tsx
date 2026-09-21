import { type FC, setReactiveScheduling } from '@rue-js/rue'
import { renderToString } from '@rue-js/server-renderer'
import SiteLayout from './pages/site/components/Layout'
import { readStaticRenderRoute } from './staticRenderContext'

const staticDocHtmlByRouteKey = '__RUE_STATIC_DOC_HTML_BY_ROUTE__'

const readStaticDocHtml = () => {
  const route = readStaticRenderRoute()
  const htmlByRoute = (globalThis as Record<string, unknown>)[staticDocHtmlByRouteKey] as
    | Record<string, unknown>
    | undefined
  const html = htmlByRoute?.[route]
  return typeof html === 'string' ? html : ''
}

const StaticDocument: FC = () => (
  <SiteLayout>
    <article
      class="prose prose-slate mx-auto w-full max-w-5xl dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: readStaticDocHtml() }}
    />
  </SiteLayout>
)

// Static SSR only owns pre-generated document HTML. Interactive application routes are rendered
// by the client snapshot pipeline and therefore never pull the client route/component graph into
// the server compiler.
setReactiveScheduling('microtask')

export const render = async (_url: string) => renderToString(StaticDocument)
