import type { DOMHostAdapter } from './dom-host-operations'

const SERVER_TEMPLATE_VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

const decodeTemplateText = (value: string): string =>
  value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_match, entity: string) => {
    const normalized = entity.toLowerCase()
    if (normalized === 'amp') return '&'
    if (normalized === 'lt') return '<'
    if (normalized === 'gt') return '>'
    if (normalized === 'quot') return '"'
    if (normalized === 'apos') return "'"
    if (normalized === 'nbsp') return '\u00a0'
    const radix = normalized.startsWith('#x') ? 16 : 10
    const digits = normalized.slice(radix === 16 ? 2 : 1)
    return String.fromCodePoint(Number.parseInt(digits, radix))
  })

export const cloneServerTemplate = (html: string, adapter: DOMHostAdapter): unknown => {
  const fragment = adapter.createDocumentFragment() as any
  const stack: any[] = [fragment]
  const tokens = html.match(/<!--[\s\S]*?-->|<![^>]*>|<\/?[^>]+>|[^<]+/g) ?? []
  for (const token of tokens) {
    if (token.startsWith('<!--')) {
      adapter.appendChild(stack.at(-1), adapter.createComment(token.slice(4, -3)))
      continue
    }
    if (token.startsWith('</')) {
      if (stack.length > 1) stack.pop()
      continue
    }
    if (token.startsWith('<!')) continue
    if (token.startsWith('<')) {
      const match = /^<\s*([^\s/>]+)([\s\S]*?)\/?\s*>$/.exec(token)
      if (!match) continue
      const tag = match[1]
      const element = adapter.createElement(tag, stack.at(-1)) as any
      const attributes = match[2]
      const attributePattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
      let attribute: RegExpExecArray | null
      while ((attribute = attributePattern.exec(attributes))) {
        element.setAttribute(
          attribute[1],
          decodeTemplateText(attribute[2] ?? attribute[3] ?? attribute[4] ?? ''),
        )
      }
      adapter.appendChild(stack.at(-1), element)
      if (!token.endsWith('/>') && !SERVER_TEMPLATE_VOID_TAGS.has(tag.toLowerCase())) {
        stack.push(element)
      }
      continue
    }
    if (token) adapter.appendChild(stack.at(-1), adapter.createTextNode(decodeTemplateText(token)))
  }
  return fragment
}
