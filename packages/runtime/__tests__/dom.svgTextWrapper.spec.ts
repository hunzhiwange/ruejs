import { describe, expect, it } from 'vitest'

import { BrowserDOMAdapter } from '../src/dom'

describe('BrowserDOMAdapter.createTextWrapper', () => {
  const adapter = new BrowserDOMAdapter()

  // 这个测试专门锁 SVG 文本包装行为，防止以后又退回“在 <text> 里嵌套 <text>”的旧问题。
  it('uses text for generic SVG containers and tspan for SVG text containers', () => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')

    // 普通 SVG 容器下，动态文本需要先起一个 <text> 容器。
    expect(adapter.createTextWrapper(group).tagName.toLowerCase()).toBe('text')
    // 已经在 <text> 里时，再包一层必须是 <tspan>，否则会出现 <text><text>...</text></text>。
    expect(adapter.createTextWrapper(text).tagName.toLowerCase()).toBe('tspan')
    // <tspan> 内继续细分动态文本时，也应该递归保持 <tspan>。
    expect(adapter.createTextWrapper(tspan).tagName.toLowerCase()).toBe('tspan')
  })
})
