import { type FC, ref, watchEffect, useState } from 'rue-js'
import { createHighlighterCoreSync } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import jsLang from '@shikijs/langs/javascript'
import tsLang from '@shikijs/langs/typescript'
import tsxLang from '@shikijs/langs/tsx'
import rustLang from '@shikijs/langs/rust'
import htmlLang from '@shikijs/langs/html'
import cssLang from '@shikijs/langs/css'
import tokyoNight from '@shikijs/themes/tokyo-night'

let hl: any | null = null
function getHl() {
  if (hl) return hl
  hl = createHighlighterCoreSync({
    themes: [tokyoNight],
    langs: [htmlLang, cssLang, jsLang, tsLang, tsxLang, rustLang],
    engine: createJavaScriptRegexEngine(),
  })
  return hl
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const Code: FC<{ code: string; lang?: string; className?: string; title?: string }> = p => {
  const html = ref<string>('')
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(p.code || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  watchEffect(() => {
    const allow = new Set(['html', 'css', 'ts', 'tsx', 'rust', 'js', 'javascript', 'typescript'])
    const lang = (p.lang || '').toLowerCase()
    const useLang = allow.has(lang) ? lang : 'javascript'
    const normalized = useLang === 'js' ? 'javascript' : useLang === 'ts' ? 'typescript' : useLang
    const highlighter = getHl()
    setTimeout(() => {
      let out = ''
      if (typeof (highlighter as any).highlight === 'function') {
        out = (highlighter as any).highlight(p.code, { lang: normalized, theme: tokyoNight })
      } else if (typeof (highlighter as any).codeToHtml === 'function') {
        out = (highlighter as any).codeToHtml(p.code, { lang: normalized, theme: tokyoNight })
      } else {
        out = `<pre><code>${escapeHtml(p.code)}</code></pre>`
      }
      html.value = out
    }, 0)
  })

  return (
    <div className={p.className}>
      <div className="relative group">
        <button
          className="absolute top-2 right-2 z-50 px-2 py-1 bg-black/70 text-white rounded text-xs opacity-80 hover:opacity-100 focus:opacity-100 transition"
          onClick={handleCopy}
          aria-label="复制代码"
        >
          {copied.value ? '已复制' : '复制'}
        </button>
        {p.title ? (
          <div className="absolute top-2 left-2 text-[11px] px-2 py-0.5 rounded bg-base-100/70 text-base-content">
            {p.title}
          </div>
        ) : null}
        <div dangerouslySetInnerHTML={{ __html: html.value }}></div>
      </div>
    </div>
  )
}

export default Code
