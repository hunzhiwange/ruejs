import type { FC } from '@rue-js/rue'
import { mdToHtml } from './docMarkdown'
import { loadDocMdxComponent, readDocMdxComponent } from './docMdxModules'

export type DocDetailContent = { type: 'html'; html: string } | { type: 'mdx'; Component: FC }

const emptyDocContent: DocDetailContent = {
  type: 'html',
  html: '',
}

const createHtmlDocContent = (html: string): DocDetailContent => ({
  type: 'html',
  html,
})

const createMdxDocContent = (Component: FC): DocDetailContent => ({
  type: 'mdx',
  Component,
})

const docContentCache = new Map<string, DocDetailContent>()
const docPendingCache = new Map<string, Promise<DocDetailContent>>()
const staticDocHtmlByRouteKey = '__RUE_STATIC_DOC_HTML_BY_ROUTE__'

const normalizeStaticDocRoute = (route: string) => {
  const withoutHash = route.split('#')[0]
  const withoutSearch = withoutHash.split('?')[0]
  const normalized = withoutSearch.startsWith('/') ? withoutSearch : `/${withoutSearch}`
  return normalized.length > 1 ? normalized.replace(/\/+$/g, '') : '/'
}

const toDocIdFromRoute = (route: string) => {
  const normalized = normalizeStaticDocRoute(route)
  for (const prefix of ['/guide/', '/api/', '/page/']) {
    if (normalized.startsWith(prefix)) {
      return decodeURIComponent(normalized.slice(prefix.length))
    }
  }
  return ''
}

export const readStaticDocHtmlByRoute = (route: string) => {
  const staticDocHtmlByRoute = (globalThis as any)[staticDocHtmlByRouteKey] as
    | Record<string, unknown>
    | undefined
  const html = staticDocHtmlByRoute?.[normalizeStaticDocRoute(route)]
  return typeof html === 'string' ? html : ''
}

export const readStaticDocContentByRoute = (route: string): DocDetailContent => {
  const MdxComponent = readDocMdxComponent(toDocIdFromRoute(route))
  if (MdxComponent) return createMdxDocContent(MdxComponent)

  const html = readStaticDocHtmlByRoute(route)
  return html ? createHtmlDocContent(html) : emptyDocContent
}

export const createDocDetailUrl = (base: string, seg: string) => {
  return import.meta.env.DEV
    ? new URL(`${base}/${seg}.md?id=${Math.random()}`, import.meta.url)
    : `${base}/${seg}.md`
}

export const loadCachedDocContent = async (
  scope: string,
  base: string,
  seg: string,
): Promise<DocDetailContent> => {
  const cacheKey = `${scope}:${base}:${seg}`
  const cachedContent = docContentCache.get(cacheKey)

  if (cachedContent) {
    return cachedContent
  }

  const pendingContent = docPendingCache.get(cacheKey)
  if (pendingContent) {
    return pendingContent
  }

  const nextRequest = (async () => {
    const MdxComponent = await loadDocMdxComponent(seg)
    if (MdxComponent) {
      const content = createMdxDocContent(MdxComponent)
      docContentCache.set(cacheKey, content)
      return content
    }

    const res = await fetch(createDocDetailUrl(base, seg) as any)
    if (!res.ok) {
      throw new Error(`doc not found: ${seg}`)
    }

    const md = await res.text()
    const html = await mdToHtml(md)
    const content = createHtmlDocContent(html)
    docContentCache.set(cacheKey, content)
    return content
  })()

  docPendingCache.set(cacheKey, nextRequest)

  try {
    return await nextRequest
  } finally {
    docPendingCache.delete(cacheKey)
  }
}

export const loadCachedDocHtml = async (scope: string, base: string, seg: string) => {
  const content = await loadCachedDocContent(scope, base, seg)
  return content.type === 'html' ? content.html : ''
}
