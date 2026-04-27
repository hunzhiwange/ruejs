import { type FC, useState, watch, useEffect } from '@rue-js/rue'
import { useRoute } from '@rue-js/router'
import SidebarPlayground from './SidebarPlaygroundPage'
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

function getContext(): {
  uiBase: string
  docBase: string
} {
  const uiBase = '/page'
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

const PageDocDetail: FC = () => {
  const route = useRoute()
  const [html, setHtml] = useState<string>('')
  const [_results, _setResults] = useState<{ id: string; title: string; snippet: string }[]>([])

  watch(
    route,
    async (data: any) => {
      const ctx = getContext()
      const seg = (data?.params?.path as string) || ''
      if (!seg) return
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
    </SidebarPlayground>
  )
}

export default PageDocDetail
