import { describe, expect, it } from 'vitest'

import { normalizeRenderable, type BlockFactory, type BlockInstance } from '../src'

describe('normalizeRenderable', () => {
  it('normalizes text, DOM nodes, arrays, and blocks into renderable values', () => {
    const element = document.createElement('div')
    const fragment = document.createDocumentFragment()
    const block: BlockInstance = {
      kind: 'block',
      mount() {},
    }
    const factory: BlockFactory = Object.assign(() => block, {
      kind: 'block-factory' as const,
    })

    const result = normalizeRenderable([
      null,
      'hello',
      42,
      element,
      fragment,
      false,
      block,
      factory,
      ['nested'],
    ])

    expect(result.kind).toBe('renderable')
    if (result.kind !== 'renderable') {
      return
    }

    expect(Array.isArray(result.value)).toBe(true)

    const values = result.value as any[]
    expect(values).toHaveLength(7)
    expect(values[0]?.nodeType).toBe(Node.TEXT_NODE)
    expect(values[0]?.textContent).toBe('hello')
    expect(values[1]?.nodeType).toBe(Node.TEXT_NODE)
    expect(values[1]?.textContent).toBe('42')
    expect(values[2]).toBe(element)
    expect(values[3]).toBe(fragment)
    expect(values[4]).toBe(block)
    expect(values[5]).toBe(factory)
    expect(values[6]?.nodeType).toBe(Node.TEXT_NODE)
    expect(values[6]?.textContent).toBe('nested')
  })

  it('flags plain object inputs as unsupported default objects', () => {
    const legacyObject = { type: 'div', props: null, children: [] }
    const single = normalizeRenderable(legacyObject)
    const nested = normalizeRenderable(['ok', legacyObject])

    expect(single).toEqual({ kind: 'unsupported-object', value: legacyObject })
    expect(nested).toEqual({ kind: 'unsupported-object', value: legacyObject })
  })
})
