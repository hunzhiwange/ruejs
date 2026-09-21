// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { _$template as compiledTemplate } from '../src/compiler-internal'
import { withDOMHostOperations } from '../src/compiler-runtime/dom.browser'

describe('compiled static template helper', () => {
  it('creates the template lazily and reuses the HTML cache', () => {
    const createElement = vi.spyOn(document, 'createElement')
    const getTemplate = compiledTemplate('<span>static</span>')
    expect(createElement).not.toHaveBeenCalled()
    const first = getTemplate()
    expect(getTemplate()).toBe(first)
    expect(first.innerHTML).toBe('<span>static</span>')
    expect(createElement.mock.calls.filter(([tag]) => tag === 'template')).toHaveLength(1)
  })

  it('keeps HTML and SVG caches isolated', () => {
    const getTemplate = compiledTemplate('<path data-kind="cached"></path>')
    const html = getTemplate()
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const svgTemplate = withDOMHostOperations(svg, getTemplate)
    expect(getTemplate()).toBe(html)
    expect(withDOMHostOperations(svg, getTemplate)).toBe(svgTemplate)
    expect(html.content.firstElementChild?.namespaceURI).toBe('http://www.w3.org/1999/xhtml')
    expect(svgTemplate.content.firstElementChild?.namespaceURI).toBe('http://www.w3.org/2000/svg')
  })
})
