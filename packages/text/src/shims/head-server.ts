import { parseFragment, serialize } from 'parse5'
import type { ServerPlan } from '@rue-js/runtime/internal/ssr'
import { _getSSRHeadChildren, headElementRecord } from './head-records.js'

/** Execute the compiled head slot in its component owner, outside the body output. */
export default function ServerHead({ children }: { children?: ServerPlan }): ServerPlan {
  return async writer => {
    if (!children) return
    const chunks: string[] = []
    const keys: unknown[] = []
    await children({
      ...writer,
      chunks,
      stream: undefined,
      onElement: (_tag, props) => keys.push(props.key),
    })
    const parsed = parseFragment(chunks.join(''))
    let index = 0
    const text = (node: any): string =>
      node.nodeName === '#text' ? node.value : (node.childNodes ?? []).map(text).join('')
    const visit = (node: any, top: boolean) => {
      if (!node.tagName) return
      const key = keys[index++]
      if (top)
        _getSSRHeadChildren().push(
          headElementRecord(node.tagName, node.attrs, serialize(node), text(node), key),
        )
      for (const child of node.childNodes ?? []) visit(child, false)
    }
    for (const node of parsed.childNodes) visit(node, true)
  }
}
