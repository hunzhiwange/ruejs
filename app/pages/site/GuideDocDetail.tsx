import { type FC, useState, watch, computed, signal, useEffect } from '@rue-js/rue'
import { RouterLink, useRoute } from '@rue-js/router'
import SidebarPlayground, { SECTIONS_BY_TYPE } from './SidebarPlaygroundGuide'
// @ts-ignore
import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
// @ts-expect-error
import container from 'markdown-it-container'
// @ts-expect-error
import attrs from 'markdown-it-attrs'
// @ts-expect-error
import tasklists from 'markdown-it-task-lists'
// @ts-expect-error
import footnote from 'markdown-it-footnote'
import { createHighlighterCoreSync } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import js from '@shikijs/langs/javascript'
import ts from '@shikijs/langs/typescript'
import tsx from '@shikijs/langs/tsx'
import rust from '@shikijs/langs/rust'
import html from '@shikijs/langs/html'
import css from '@shikijs/langs/css'
import tokyoNight from '@shikijs/themes/tokyo-night'

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
function getContext(pathname: string): {
  uiBase: string
  docBase: string
} {
  const uiBase = '/guide'
  const docBase = '/docs'
  return { uiBase, docBase }
}

let __mdParser: MarkdownIt | null = null
async function ensureMd() {
  if (!__mdParser) {
    const md = new MarkdownIt({
      html: true,
      typographer: true,
    })
    md.use(anchor)
    md.use(tasklists)
    md.use(footnote)
    md.use(attrs)
    md.use(container, 'tip')
    md.use(container, 'info')
    md.use(container, 'warning')
    md.use(container, 'danger')
    __mdParser = md
  }
}
let __hl: any | null = null
function getHighlighter() {
  if (__hl) return __hl
  __hl = createHighlighterCoreSync({
    themes: [tokyoNight],
    langs: [html, css, js, ts, tsx, rust],
    engine: createJavaScriptRegexEngine(),
  })
  return __hl
}
async function mdToHtml(md: string): Promise<string> {
  await ensureMd()
  let html = __mdParser!.render(md)
  const re = /<pre><code class="language-([^"]*)">([\s\S]*?)<\/code><\/pre>/g
  const blocks = [...html.matchAll(re)]
  if (!blocks.length) return html
  for (const m of blocks) {
    const lang = (m[1] || '').trim().toLowerCase()
    const escaped = m[2]
    const code = escaped
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
    try {
      const hl = getHighlighter()
      const theme = tokyoNight
      const allow = new Set(['html', 'css', 'ts', 'tsx', 'rust', 'js', 'javascript', 'typescript'])
      const useLang = allow.has(lang) ? lang : 'javascript'
      const normalized = useLang === 'js' ? 'javascript' : useLang === 'ts' ? 'typescript' : useLang
      const out =
        typeof (hl as any).highlight === 'function'
          ? (hl as any).highlight(code, { lang: normalized, theme })
          : (hl as any).codeToHtml
            ? (hl as any).codeToHtml(code, { lang: normalized, theme })
            : `<pre><code>${code}</code></pre>`
      const wrapped = `<div class="relative group doc-code-wrapper">
  <button class="copy-code-btn absolute top-2 right-2 z-50 px-2 py-1 bg-black/70 text-white rounded text-xs opacity-80 hover:opacity-100 focus:opacity-100 transition" aria-label="复制代码">复制</button>
  ${out}
</div>`
      html = html.replace(m[0], wrapped)
    } catch {}
  }
  return html
}

const GuideDocDetail: FC = () => {
  const route = useRoute()
  const [_title, setTitle] = useState<string>('')
  const [html, setHtml] = useState<string>('')
  const [_results, _setResults] = useState<{ id: string; title: string; snippet: string }[]>([])
  const [docPath, setDocPath] = useState<string>('')
  const [uiBase, setUiBase] = useState<string>('')
  const [docBase, setDocBase] = useState<string>('/docs')

  watch(
    route,
    async (data: any) => {
      const p = route.get()?.path || ''
      const ctx = getContext(p)
      setUiBase(ctx.uiBase)
      setDocBase(ctx.docBase)
      const seg = (data?.params?.path as string) || ''
      if (!seg) return
      setDocPath(seg)
      const docsMeta = SECTIONS_BY_TYPE['guide'].flatMap(sec => flatten(sec.items))
      const meta = docsMeta.find(d => d.id === seg)
      setTitle(meta?.title || seg.split('/').pop() || seg)
      const base = ctx.docBase
      const url = import.meta.env.DEV
        ? new URL(`${base}/${seg}.md?id=${Math.random()}`, import.meta.url)
        : `${base}/${seg}.md`
      try {
        const res = await fetch(url as any)
        if (!res.ok) {
          setHtml(`<p class="text-base-content/70">文档未找到：${seg}</p>`)
          return
        }
        const md = await res.text()
        const out = await mdToHtml(md)
        setHtml(out)
      } catch {
        setHtml(`<p class="text-base-content/70">加载文档失败</p>`)
      }
    },
    { immediate: true },
  )

  const DOCS_META = computed(() => {
    return SECTIONS_BY_TYPE['guide'].flatMap(sec => flatten(sec.items))
  })
  const currentIndex = computed(() => {
    const list = DOCS_META.get()
    const seg = docPath.value || ''
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
    return () => document.removeEventListener('click', onClick)
  }, [])

  return (
    <SidebarPlayground>
      <div
        className="prose prose-sm md:prose-base"
        id="doc-body"
        dangerouslySetInnerHTML={{ __html: html.value }}
      ></div>
      {currentIndex.get() >= 0 && (
        <div className="mt-8 flex justify-between">
          {prev.get() ? (
            <RouterLink
              to={`${uiBase.value}/${prev?.get()?.id}`}
              className="btn btn-outline btn-sm"
            >
              ← 上一页：{prev?.get()?.title}
            </RouterLink>
          ) : (
            <span />
          )}
          {next.get() ? (
            <RouterLink
              to={`${uiBase.value}/${next?.get()?.id}`}
              className="btn btn-outline btn-sm"
            >
              下一页：{next?.get()?.title} →
            </RouterLink>
          ) : (
            <span />
          )}
        </div>
      )}
    </SidebarPlayground>
  )
}

export default GuideDocDetail
