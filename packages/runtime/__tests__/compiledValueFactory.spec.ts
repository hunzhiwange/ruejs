// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { _$compiledRoot } from '../src/compiler-runtime/block'
import { _$compiledStaticRoot } from '../src/compiler-runtime/compact-root'
import {
  _$mountCompiledSlotFactory,
  _$compiledValueFactory,
  _$mountCompiledSlotAt,
  type BlockFactory,
} from '../src/compiler-runtime/block-factory'
import { createOwner, setReactiveScheduling, signal } from '../src/runtime-core/compiled'
import { onMounted, onUnmounted } from '../src/compiler-runtime/compact-reactivity'

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

  it('mounts compiled slot factories nested inside child arrays instead of stringifying them', () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('end')
    parent.appendChild(anchor)
    const slotFactory: BlockFactory = (target, _props, owner) =>
      _$mountCompiledSlotFactory(target, owner, () =>
        _$compiledRoot(host => {
          const node = document.createElement('span')
          node.textContent = 'slot child'
          host?.appendChild(node)
          return [node, node]
        }),
      )

    const mounted = _$compiledValueFactory([slotFactory])(
      { parent, before: anchor },
      {},
      createOwner(),
    )

    expect(parent.textContent).toBe('slot child')
    expect(parent.textContent).not.toContain('slotFactory')

    mounted.dispose()
    expect(parent.childNodes).toHaveLength(1)
    expect(parent.firstChild).toBe(anchor)
  })

  it('unwraps an opaque children value wrapper instead of stringifying the wrapper object', () => {
    const parent = document.createElement('div')
    const child = _$compiledRoot(host => {
      const node = document.createElement('span')
      node.textContent = 'wrapped child'
      host?.appendChild(node)
      return [node, node]
    })

    const mounted = _$compiledValueFactory({ children: [child, ' tail'] })(
      { parent, before: null },
      {},
      createOwner(),
    )

    expect(parent.innerHTML).toBe('<span>wrapped child</span> tail')
    expect(parent.textContent).not.toContain('[object Object]')

    mounted.dispose()
    expect(parent.childNodes).toHaveLength(0)
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

  it('does not remount a one-shot root when mounting synchronously invalidates the slot', () => {
    const parent = document.createElement('div')
    const revision = signal(0)
    const child = _$compiledRoot(host => {
      const node = document.createElement('span')
      node.textContent = 'mounted once'
      host?.appendChild(node)
      revision.set(1)
      return [node, node]
    })

    expect(() =>
      _$mountCompiledSlotAt(
        { parent, before: null },
        () => {
          revision.get()
          return child
        },
        () => ({}),
      ),
    ).not.toThrow()

    expect(parent.innerHTML).toBe('<span>mounted once</span>')
  })

  it('recreates a compiled JSX value when the same portable value is mounted again', () => {
    const parent = document.createElement('div')
    const child = _$compiledRoot(host => {
      const node = document.createElement('span')
      node.textContent = 'portable child'
      host?.appendChild(node)
      return [node, node]
    })
    const factory = _$compiledValueFactory(child)

    const first = factory({ parent, before: null }, {}, createOwner())
    expect(parent.innerHTML).toBe('<span>portable child</span>')
    first.dispose()

    const second = factory({ parent, before: null }, {}, createOwner())
    expect(parent.innerHTML).toBe('<span>portable child</span>')
    second.dispose()
    expect(parent.childNodes).toHaveLength(0)
  })

  it('recreates a compiler-proven static JSX value when mounted again', () => {
    const parent = document.createElement('div')
    const child = _$compiledStaticRoot(host => {
      const node = document.createElement('span')
      node.textContent = 'portable static child'
      host?.appendChild(node)
      return [node, node]
    })
    const factory = _$compiledValueFactory(child)

    const first = factory({ parent, before: null }, {}, createOwner())
    expect(parent.innerHTML).toBe('<span>portable static child</span>')
    first.dispose()

    const second = factory({ parent, before: null }, {}, createOwner())
    expect(parent.innerHTML).toBe('<span>portable static child</span>')
    second.dispose()
    expect(parent.childNodes).toHaveLength(0)
  })

  it('normalizes raw compiled block values at opaque slot boundaries', () => {
    const parent = document.createElement('div')
    const child = _$compiledRoot(host => {
      const node = document.createElement('span')
      node.textContent = 'child'
      host?.appendChild(node)
      return [node, node]
    })

    _$mountCompiledSlotAt(
      { parent, before: null },
      () => child,
      () => ({}),
    )

    expect(parent.innerHTML).toBe('<span>child</span>')
  })

  it('runs lifecycle hooks registered by an opaque slot factory', () => {
    const parent = document.createElement('div')
    const visible = signal(true)
    const events: string[] = []
    const preview: BlockFactory = (target, _props, owner) => {
      onMounted(() => {
        events.push('mounted')
        onUnmounted(() => events.push('unmounted'))
      })
      const node = document.createElement('span')
      node.textContent = 'preview'
      return _$compiledValueFactory(node)(target, {}, owner)
    }

    _$mountCompiledSlotAt(
      { parent, before: null },
      () => (visible.get() ? preview : null),
      () => ({}),
    )

    expect(parent.innerHTML).toBe('<span>preview</span>')
    expect(events).toEqual(['mounted'])

    visible.set(false)
    expect(parent.childNodes).toHaveLength(0)
    expect(events).toEqual(['mounted', 'unmounted'])
  })
})
