// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import { _$template as compiledTemplate } from '../src/internal'
import { _$template as vaporTemplate } from './legacy-test-render'
import { withDOMHostOperations } from '../src/compiler-runtime/dom.browser'
import { getDOMAdapter, setDOMAdapter, type DOMAdapter } from '../src/dom'

const defaultDOMAdapter = getDOMAdapter()

afterEach(() => {
  setDOMAdapter(defaultDOMAdapter)
})

describe('compiled static template helper', () => {
  it('creates the template lazily and reuses it across getter calls', () => {
    const createElement = vi.spyOn(document, 'createElement')
    const getTemplate = compiledTemplate('<span>span 元素</span>')

    expect(createElement).not.toHaveBeenCalled()

    const first = getTemplate()
    const second = getTemplate()

    expect(first).toBe(second)
    expect(first.innerHTML).toBe('<span>span 元素</span>')
    expect(createElement.mock.calls.filter(([tag]) => tag === 'template')).toHaveLength(1)
  })

  it('is available from both compiled runtime entry points', () => {
    expect(vaporTemplate).toBe(compiledTemplate)
  })

  it('keeps HTML, SVG, and foreignObject caches isolated', () => {
    const getTemplate = compiledTemplate('<path data-kind="cached" />')
    const html = getTemplate()
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject')

    const svgTemplate = withDOMHostOperations(svg, getTemplate)
    const foreignTemplate = withDOMHostOperations(foreignObject, getTemplate)

    expect(getTemplate()).toBe(html)
    expect(withDOMHostOperations(svg, getTemplate)).toBe(svgTemplate)
    expect(withDOMHostOperations(foreignObject, getTemplate)).toBe(foreignTemplate)
    expect(html.content.firstElementChild?.namespaceURI).toBe('http://www.w3.org/1999/xhtml')
    expect(svgTemplate.content.firstElementChild?.namespaceURI).toBe('http://www.w3.org/2000/svg')
    expect(foreignTemplate.content.firstElementChild?.namespaceURI).toBe(
      'http://www.w3.org/1999/xhtml',
    )
  })

  it('preserves template parsing for an existing custom adapter', () => {
    const calls: string[] = []
    const customAdapter = new Proxy(defaultDOMAdapter, {
      get(target, key: keyof DOMAdapter) {
        if (key === ('cloneTemplate' as keyof DOMAdapter)) {
          return (html: string) => {
            calls.push('cloneTemplate')
            const template = document.createElement('template')
            template.innerHTML = html
            return template.content.cloneNode(true)
          }
        }
        const value = Reflect.get(target, key, target)
        if (typeof value !== 'function') return value
        return (...args: unknown[]) => {
          calls.push(String(key))
          return Reflect.apply(value, target, args)
        }
      },
    }) as DOMAdapter
    setDOMAdapter(customAdapter)

    const getTemplate = compiledTemplate(
      '<div title="Rue &amp; friends">hello&nbsp;Rue<!--marker--><br></div>',
    )
    const template = withDOMHostOperations({ appendChild() {} } as unknown as Node, getTemplate)
    const first = template.content.cloneNode(true) as DocumentFragment
    const second = template.content.cloneNode(true) as DocumentFragment

    expect(first).not.toBe(second)
    expect(first.firstElementChild?.getAttribute('title')).toBe('Rue & friends')
    expect(first.firstElementChild?.textContent).toBe('hello\u00a0Rue')
    expect(first.firstElementChild?.childNodes[1]).toMatchObject({
      nodeType: Node.COMMENT_NODE,
      data: 'marker',
    })
    expect(first.querySelector('br')).not.toBeNull()
    expect(calls).toContain('cloneTemplate')
  })
})
