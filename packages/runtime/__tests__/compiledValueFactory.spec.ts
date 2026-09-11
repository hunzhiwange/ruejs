// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { _$compiledRoot } from '../src/compiler-runtime/block'
import {
  _$compiledValueFactory,
  _$mountCompiledSlotAt,
} from '../src/compiler-runtime/block-factory'
import { createOwner, setReactiveScheduling, signal } from '../src/runtime-core/compiled'

setReactiveScheduling('sync')

describe('_$compiledValueFactory', () => {
  it('mounts and disposes mixed compiled blocks, text, nodes, and nested arrays', () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('end')
    parent.appendChild(anchor)
    const strong = _$compiledRoot(host => {
      const node = document.createElement('strong')
      node.textContent = 'block'
      host?.appendChild(node)
      return [node, node]
    })
    const emphasis = document.createElement('em')
    emphasis.textContent = 'node'

    const factory = _$compiledValueFactory([strong, ' / ', [emphasis, 7], false, null])
    const mounted = factory({ parent, before: anchor }, {}, createOwner())

    expect(parent.textContent).toBe('block / node7')
    expect(mounted.first).toBe(parent.firstChild)
    expect(mounted.last).toBe(anchor.previousSibling)

    mounted.dispose()
    expect(parent.childNodes).toHaveLength(1)
    expect(parent.firstChild).toBe(anchor)
  })

  it('creates a stable empty range for empty-like values', () => {
    const parent = document.createElement('div')
    const mounted = _$compiledValueFactory([null, undefined, true])(
      { parent, before: null },
      {},
      createOwner(),
    )

    expect(mounted.first).toBe(mounted.last)
    expect(mounted.first.nodeType).toBe(Node.COMMENT_NODE)
    mounted.dispose()
    expect(parent.childNodes).toHaveLength(0)
  })

  it('keeps object value factories stable across reactive slot reads', () => {
    const parent = document.createElement('div')
    const revision = signal(0)
    const child = _$compiledRoot(host => {
      const node = document.createElement('span')
      node.textContent = 'child'
      host?.appendChild(node)
      return [node, node]
    })

    _$mountCompiledSlotAt(
      { parent, before: null },
      () => {
        revision.get()
        return _$compiledValueFactory(child)
      },
      () => ({}),
    )

    const mountedChild = parent.firstChild
    revision.set(1)

    expect(parent.textContent).toBe('child')
    expect(parent.firstChild).toBe(mountedChild)
  })
})
