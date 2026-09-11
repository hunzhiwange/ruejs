import { describe, expect, it } from 'vitest'

import { createElement, createTextWrapper } from '../src/compiler-runtime/dom.browser'

const SVG_NS = 'http://www.w3.org/2000/svg'
const HTML_NS = 'http://www.w3.org/1999/xhtml'

describe('createTextWrapper', () => {
  // 这个测试专门锁 SVG 文本包装行为，防止以后又退回“在 <text> 里嵌套 <text>”的旧问题。
  it('uses text for generic SVG containers and tspan for SVG text containers', () => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject')

    // 普通 SVG 容器下，动态文本需要先起一个 <text> 容器。
    expect(createTextWrapper(group).tagName.toLowerCase()).toBe('text')
    // 已经在 <text> 里时，再包一层必须是 <tspan>，否则会出现 <text><text>...</text></text>。
    expect(createTextWrapper(text).tagName.toLowerCase()).toBe('tspan')
    // <tspan> 内继续细分动态文本时，也应该递归保持 <tspan>。
    expect(createTextWrapper(tspan).tagName.toLowerCase()).toBe('tspan')
    // foreignObject 会重新切回 HTML 上下文，动态文本不能误建成 SVG <text>。
    expect(createTextWrapper(foreignObject).tagName.toLowerCase()).toBe('span')
  })
})

describe('createElement', () => {
  const svgElementNames = [
    'animate',
    'animateMotion',
    'animateTransform',
    'circle',
    'clipPath',
    'defs',
    'desc',
    'ellipse',
    'feBlend',
    'feColorMatrix',
    'feComponentTransfer',
    'feComposite',
    'feConvolveMatrix',
    'feDiffuseLighting',
    'feDisplacementMap',
    'feDistantLight',
    'feDropShadow',
    'feFlood',
    'feFuncA',
    'feFuncB',
    'feFuncG',
    'feFuncR',
    'feGaussianBlur',
    'feImage',
    'feMerge',
    'feMergeNode',
    'feMorphology',
    'feOffset',
    'fePointLight',
    'feSpecularLighting',
    'feSpotLight',
    'feTile',
    'feTurbulence',
    'filter',
    'foreignObject',
    'g',
    'image',
    'line',
    'linearGradient',
    'marker',
    'mask',
    'metadata',
    'mpath',
    'path',
    'pattern',
    'polygon',
    'polyline',
    'radialGradient',
    'rect',
    'set',
    'stop',
    'svg',
    'switch',
    'symbol',
    'text',
    'textPath',
    'tspan',
    'use',
    'view',
  ] as const
  const sharedHtmlTagNames = ['a', 'script', 'style', 'title'] as const

  // 这份清单对齐 MDN 当前 SVG element reference 中“不与 HTML 同名”的元素，
  // 避免遗漏整类元素后回退到 HTML createElement。
  it('creates the full supported SVG element set in the SVG namespace', () => {
    for (const tag of svgElementNames) {
      const element = createElement(tag) as Element
      expect(element.namespaceURI, tag).toBe(SVG_NS)
      expect(element.tagName.toLowerCase()).toBe(tag.toLowerCase())
    }
  })

  it('keeps plain HTML tags on the HTML namespace', () => {
    const element = createElement('div') as Element

    expect(element.namespaceURI).toBe(HTML_NS)
    expect(element.tagName.toLowerCase()).toBe('div')
  })

  it('defaults shared HTML/SVG tag names to the HTML namespace without parent context', () => {
    for (const tag of sharedHtmlTagNames) {
      const element = createElement(tag) as Element

      expect(element.namespaceURI, tag).toBe(HTML_NS)
      expect(element.tagName.toLowerCase()).toBe(tag)
    }
  })

  it('uses the SVG namespace for shared tag names under SVG parents and resets in foreignObject', () => {
    const svg = document.createElementNS(SVG_NS, 'svg')
    const foreignObject = document.createElementNS(SVG_NS, 'foreignObject')

    for (const tag of sharedHtmlTagNames) {
      const svgElement = createElement(tag, svg) as Element
      const foreignObjectElement = createElement(tag, foreignObject) as Element

      expect(svgElement.namespaceURI, `${tag}:svg`).toBe(SVG_NS)
      expect(foreignObjectElement.namespaceURI, `${tag}:foreignObject`).toBe(HTML_NS)
    }
  })
})
