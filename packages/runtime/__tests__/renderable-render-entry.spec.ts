import { afterEach, describe, expect, it } from 'vitest'

import {
  h,
  render,
  renderAnchor,
  renderBetween,
  renderStatic,
  setReactiveScheduling,
  type BlockInstance,
} from '../src'

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
})

const flushEffects = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const createTextBlock = (
  text: string,
  expectedKind: 'container' | 'between' | 'anchor' | 'static',
): BlockInstance => ({
  kind: 'block',
  mount(target) {
    expect(target.kind).toBe(expectedKind)
    const node = document.createTextNode(text)

    switch (target.kind) {
      case 'container':
        ;(target.container as Node).appendChild(node)
        return
      case 'between':
        ;(target.parent as Node).insertBefore(node, target.end as Node)
        return
      case 'anchor':
      case 'static':
        ;(target.parent as Node).insertBefore(node, target.anchor as Node)
        return
    }
  },
})

describe('render entry Renderable bridge', () => {
  it('bridges container renderables with mixed DOM nodes and blocks', async () => {
    const container = document.createElement('div')
    const strong = document.createElement('strong')
    strong.textContent = 'dom'

    document.body.appendChild(container)
    render(['head-', strong, createTextBlock('tail', 'container')] as any, container as any)

    await flushEffects()

    expect(container.textContent).toBe('head-domtail')
  })

  it('bridges renderBetween blocks through a temporary range target', async () => {
    const parent = document.createElement('div')
    const start = document.createComment('start')
    const end = document.createComment('end')

    parent.appendChild(start)
    parent.appendChild(end)

    renderBetween(createTextBlock('between', 'between') as any, parent as any, start as any, end as any)

    await flushEffects()

    expect(parent.childNodes[0]).toBe(start)
    expect(parent.childNodes[1]?.textContent).toBe('between')
    expect(parent.childNodes[2]).toBe(end)
  })

  it('updates a moved renderBetween range after its anchors are reparented', async () => {
    const parentA = document.createElement('div')
    const parentB = document.createElement('div')
    const start = document.createComment('start')
    const end = document.createComment('end')

    parentA.appendChild(start)
    parentA.appendChild(end)

    renderBetween('A' as any, parentA as any, start as any, end as any)
    await flushEffects()

    expect(parentA.textContent).toBe('A')
    expect(parentB.textContent).toBe('')

    const block = document.createDocumentFragment()
    while (start.nextSibling && start.nextSibling !== end) {
      block.appendChild(start.nextSibling)
    }
    parentA.removeChild(start)
    parentA.removeChild(end)
    parentB.appendChild(start)
    parentB.appendChild(end)
    parentB.insertBefore(block, end)

    renderBetween('B' as any, parentB as any, start as any, end as any)
    await flushEffects()

    expect(parentA.textContent).toBe('')
    expect(parentB.textContent).toBe('B')
  })

  it('updates a moved fragment-handle renderBetween range after its anchors are reparented', async () => {
    const parentA = document.createElement('div')
    const parentB = document.createElement('div')
    const start = document.createComment('start')
    const end = document.createComment('end')

    parentA.appendChild(start)
    parentA.appendChild(end)

    renderBetween(
      h('fragment', null, h('strong', null, 'A')) as any,
      parentA as any,
      start as any,
      end as any,
    )
    await flushEffects()

    const block = document.createDocumentFragment()
    while (start.nextSibling && start.nextSibling !== end) {
      block.appendChild(start.nextSibling)
    }
    parentA.removeChild(start)
    parentA.removeChild(end)
    parentB.appendChild(start)
    parentB.appendChild(end)
    parentB.insertBefore(block, end)

    renderBetween(
      h('fragment', null, h('strong', null, 'B')) as any,
      parentB as any,
      start as any,
      end as any,
    )
    await flushEffects()

    expect(parentA.textContent).toBe('')
    expect(parentB.textContent).toBe('B')
    expect(parentB.querySelectorAll('strong')).toHaveLength(1)
  })

  it('updates a moved fragment-handle range again after an intermediate same-content move', async () => {
    const parentA = document.createElement('div')
    const parentB = document.createElement('div')
    const start = document.createComment('start')
    const end = document.createComment('end')

    parentA.appendChild(start)
    parentA.appendChild(end)

    renderBetween(
      h('fragment', null, h('strong', null, 'A')) as any,
      parentA as any,
      start as any,
      end as any,
    )
    await flushEffects()

    const block = document.createDocumentFragment()
    while (start.nextSibling && start.nextSibling !== end) {
      block.appendChild(start.nextSibling)
    }
    parentA.removeChild(start)
    parentA.removeChild(end)
    parentB.appendChild(start)
    parentB.appendChild(end)
    parentB.insertBefore(block, end)

    renderBetween(
      h('fragment', null, h('strong', null, 'A')) as any,
      parentB as any,
      start as any,
      end as any,
    )
    await flushEffects()

    expect(parentA.textContent).toBe('')
    expect(parentB.textContent).toBe('A')
    expect(parentB.querySelectorAll('strong')).toHaveLength(1)

    renderBetween(
      h('fragment', null, h('strong', null, 'B')) as any,
      parentB as any,
      start as any,
      end as any,
    )
    await flushEffects()

    expect(parentB.textContent).toBe('B')
    expect(parentB.querySelectorAll('strong')).toHaveLength(1)
  })

  it('rejects inline compat child objects while building default handles', () => {
    expect(() =>
      h('fragment', null, { type: 'strong', props: {}, children: ['A'] } as any),
    ).toThrow(/Unsupported object inputs are no longer accepted/)
  })

  it('updates a mount-handle child inside renderBetween', async () => {
    const parent = document.createElement('div')
    const start = document.createComment('start')
    const end = document.createComment('end')

    parent.append(start, end)

    renderBetween(
      h('fragment', null, h('strong', null, 'A')) as any,
      parent as any,
      start as any,
      end as any,
    )
    await flushEffects()

    expect(parent.textContent).toBe('A')
    expect(parent.querySelectorAll('strong')).toHaveLength(1)

    renderBetween(
      h('fragment', null, h('strong', null, 'B')) as any,
      parent as any,
      start as any,
      end as any,
    )
    await flushEffects()

    expect(parent.textContent).toBe('B')
    expect(parent.querySelectorAll('strong')).toHaveLength(1)
  })

  it('updates a raw mount-handle child array inside renderBetween', async () => {
    const parent = document.createElement('div')
    const start = document.createComment('start')
    const end = document.createComment('end')

    parent.append(start, end)

    renderBetween([h('strong', null, 'A')] as any, parent as any, start as any, end as any)
    await flushEffects()

    expect(parent.textContent).toBe('A')
    expect(parent.querySelectorAll('strong')).toHaveLength(1)

    renderBetween([h('strong', null, 'B')] as any, parent as any, start as any, end as any)
    await flushEffects()

    expect(parent.textContent).toBe('B')
    expect(parent.querySelectorAll('strong')).toHaveLength(1)
  })

  it('bridges renderAnchor blocks through a temporary anchor target', async () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('anchor')

    parent.appendChild(anchor)

    renderAnchor(createTextBlock('anchor', 'anchor') as any, parent as any, anchor as any)

    await flushEffects()

    expect(parent.childNodes[0]?.textContent).toBe('anchor')
    expect(parent.childNodes[1]).toBe(anchor)
  })

  it('clears a mount-handle anchor subtree when the next renderable is null', async () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('anchor')

    parent.append(anchor)

    renderAnchor(h('div', { id: 'preview-panel' }, 'Preview panel') as any, parent as any, anchor as any)
    await flushEffects()

    expect(parent.querySelector('#preview-panel')?.textContent).toBe('Preview panel')

    renderAnchor(null as any, parent as any, anchor as any)
    await flushEffects()

    expect(parent.querySelector('#preview-panel')).toBeNull()
    expect(parent.childNodes).toHaveLength(1)
    expect(parent.childNodes[0]).toBe(anchor)
  })

  it('updates a raw mount-handle child array inside renderAnchor', async () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('anchor')

    parent.append(anchor)

    renderAnchor([h('strong', null, 'A')] as any, parent as any, anchor as any)
    await flushEffects()

    expect(parent.textContent).toBe('A')
    expect(parent.querySelectorAll('strong')).toHaveLength(1)

    renderAnchor([h('strong', null, 'B')] as any, parent as any, anchor as any)
    await flushEffects()

    expect(parent.textContent).toBe('B')
    expect(parent.querySelectorAll('strong')).toHaveLength(1)
  })

  it('ignores a renderAnchor update when the anchor is no longer under the parent', async () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('anchor')

    parent.append(anchor)

    renderAnchor([h('strong', null, 'A')] as any, parent as any, anchor as any)
    await flushEffects()

    while (parent.firstChild) {
      parent.removeChild(parent.firstChild)
    }

    expect(() =>
      renderAnchor([h('strong', null, 'B')] as any, parent as any, anchor as any),
    ).not.toThrow()
    await flushEffects()

    expect(parent.textContent).toBe('')
  })

  it('updates a compat fragment inside renderAnchor', async () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('anchor')

    parent.append(anchor)

    renderAnchor(h('fragment', null, h('strong', null, 'A')) as any, parent as any, anchor as any)
    await flushEffects()

    expect(parent.textContent).toBe('A')
    expect(parent.querySelectorAll('strong')).toHaveLength(1)

    renderAnchor(h('fragment', null, h('strong', null, 'B')) as any, parent as any, anchor as any)
    await flushEffects()

    expect(parent.textContent).toBe('B')
    expect(parent.querySelectorAll('strong')).toHaveLength(1)
  })

  it('ignores a renderBetween update when the range markers are no longer under the parent', async () => {
    const parent = document.createElement('div')
    const start = document.createComment('start')
    const end = document.createComment('end')

    parent.append(start, end)

    renderBetween([h('strong', null, 'A')] as any, parent as any, start as any, end as any)
    await flushEffects()

    while (parent.firstChild) {
      parent.removeChild(parent.firstChild)
    }

    expect(() =>
      renderBetween([h('strong', null, 'B')] as any, parent as any, start as any, end as any),
    ).not.toThrow()
    await flushEffects()

    expect(parent.textContent).toBe('')
  })

  it('bridges renderStatic blocks and still removes the runtime anchor', async () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('static-anchor')

    parent.appendChild(anchor)

    renderStatic(createTextBlock('static', 'static') as any, parent as any, anchor as any)

    await flushEffects()

    expect(parent.textContent).toBe('static')
    expect(parent.contains(anchor)).toBe(false)
  })
})