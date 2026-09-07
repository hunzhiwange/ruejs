import {
  _$appendChild as _$compiledAppendChild,
  _$createComment as _$compiledCreateComment,
  _$createElement as _$compiledCreateElement,
  _$spreadAttributes as _$compiledSpreadAttributes,
  renderAnchor as _$compiledRenderAnchor,
  vapor as _$compiledVapor,
  watchEffect as _$compiledWatchEffect,
} from './legacy-test-render'
import { _$createDynamic, _$createFragment } from './legacy-test-render'
import { afterEach, describe, expect, it } from 'vitest'

import {
  render,
  renderAnchor,
  renderStatic,
  setReactiveScheduling,
  watchEffect,
  type FC,
} from '../src'
import { vapor } from './legacy-test-render'
import { vaporKeyedList as _$compiledKeyedList } from './legacy-test-render'
import type { BlockInstance } from './legacy-test-render'
import { createTestCompiledBlock } from './legacy-test-render'

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
  _expectedKind: 'container' | 'between' | 'anchor' | 'static',
): BlockInstance =>
  createTestCompiledBlock({
    kind: 'block',
    mount(target) {
      expect(target.kind).toBe('container')
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

const createStrongVapor = (text: string) =>
  vapor(() => {
    const root = document.createDocumentFragment()
    const strong = document.createElement('strong')

    strong.textContent = text
    root.appendChild(strong)

    return root as any
  }) as any

const createAnchoredTextVapor = (text: string) =>
  vapor(() => {
    const root = document.createElement('div')
    const anchor = document.createComment('anchor')

    root.appendChild(anchor)

    _$compiledWatchEffect(() => {
      renderAnchor(text, root as any, anchor as any)
    })

    return root as any
  }) as any

const createNestedVaporArray = (labels: string[]) =>
  vapor(() => {
    const root = document.createElement('div')
    const anchor = document.createComment('anchor')

    root.appendChild(anchor)

    _$compiledWatchEffect(() => {
      renderAnchor(labels.map(label => createStrongVapor(label)) as any, root as any, anchor as any)
    })

    return root as any
  }) as any

const InlineStrong: FC<{ label: string }> = props =>
  _$compiledVapor(_$parentContext => {
    const _$root = _$compiledCreateElement('strong', _$parentContext)
    const _$anchor = _$compiledCreateComment('rue:children:anchor')
    _$compiledAppendChild(_$root, _$anchor)
    _$compiledWatchEffect(() => {
      const { children: _$children, ..._$attributes } = { children: props.label } as Record<
        string,
        any
      >
      _$compiledSpreadAttributes(_$root, _$attributes)
      _$compiledRenderAnchor(_$children, _$root, _$anchor)
    })
    return _$root
  })

const ForwardRenderable: FC<{ value: any }> = props =>
  vapor(() => {
    const root = document.createDocumentFragment()
    const anchor = document.createComment('rue:forward-renderable')
    root.appendChild(anchor)
    watchEffect(() => renderAnchor(props.value, root as any, anchor as any))
    return root as any
  }) as any

const createAnchoredComponentVapor = (label: string) =>
  vapor(() => {
    const root = document.createElement('div')
    const anchor = document.createComment('anchor')

    root.appendChild(anchor)

    _$compiledWatchEffect(() => {
      renderAnchor(_$createDynamic(InlineStrong, { label }) as any, root as any, anchor as any)
    })

    return root as any
  }) as any

const createKeyedButtonsVapor = (title: string, labels: string[]) =>
  vapor(() => {
    const root = document.createElement('div')
    const heading = document.createElement('h3')
    const buttons = document.createElement('div')
    const start = document.createComment('list:start')
    const end = document.createComment('list:end')
    let elements = new Map()

    heading.textContent = title
    buttons.append(start, end)
    root.append(heading, buttons)

    _$compiledWatchEffect(() => {
      elements = _$compiledKeyedList({
        items: labels,
        getKey: label => label,
        elements,
        parent: buttons as any,
        before: end as any,
        singleRoot: true,
        renderItem: (label, parent, startAnchor) => {
          renderAnchor(createStrongVapor(label) as any, parent as any, startAnchor as any)
        },
      })
    })

    return root as any
  }) as any

describe('render entry Renderable bridge', () => {
  it('throws a descriptive error for reentrant container renders on the same target', () => {
    const container = document.createElement('div')

    document.body.appendChild(container)

    const Recursive: FC = () => {
      render(_$createDynamic(Recursive, null), container)
      return _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('span', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = { children: 'never' } as Record<
            string,
            any
          >
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })
    }

    expect(() => render(_$createDynamic(Recursive, null), container)).toThrow(
      /Maximum call stack size exceeded/,
    )
  })

  it('bridges container renderables with mixed DOM nodes and blocks', async () => {
    const container = document.createElement('div')
    const strong = document.createElement('strong')
    strong.textContent = 'dom'

    document.body.appendChild(container)
    render(['head-', strong, createTextBlock('tail', 'container')] as any, container as any)

    await flushEffects()

    expect(container.textContent).toBe('head-domtail')
  })

  it('rejects inline unsupported child objects when rendering compiled fragment handles', () => {
    const container = document.createElement('div')
    expect(() =>
      render(_$createFragment([{ type: 'strong', props: {}, children: ['A'] } as any]), container),
    ).toThrow(/compiled value is not mountable/)
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

    renderAnchor(
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('div', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            id: 'preview-panel',
            children: 'Preview panel',
          } as Record<string, any>
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      }) as any,
      parent as any,
      anchor as any,
    )
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

    renderAnchor(
      [
        _$compiledVapor(_$parentContext => {
          const _$root = _$compiledCreateElement('strong', _$parentContext)
          const _$anchor = _$compiledCreateComment('rue:children:anchor')
          _$compiledAppendChild(_$root, _$anchor)
          _$compiledWatchEffect(() => {
            const { children: _$children, ..._$attributes } = { children: 'A' } as Record<
              string,
              any
            >
            _$compiledSpreadAttributes(_$root, _$attributes)
            _$compiledRenderAnchor(_$children, _$root, _$anchor)
          })
          return _$root
        }),
      ] as any,
      parent as any,
      anchor as any,
    )
    await flushEffects()

    expect(parent.textContent).toBe('A')
    expect(parent.querySelectorAll('strong')).toHaveLength(1)

    renderAnchor(
      [
        _$compiledVapor(_$parentContext => {
          const _$root = _$compiledCreateElement('strong', _$parentContext)
          const _$anchor = _$compiledCreateComment('rue:children:anchor')
          _$compiledAppendChild(_$root, _$anchor)
          _$compiledWatchEffect(() => {
            const { children: _$children, ..._$attributes } = { children: 'B' } as Record<
              string,
              any
            >
            _$compiledSpreadAttributes(_$root, _$attributes)
            _$compiledRenderAnchor(_$children, _$root, _$anchor)
          })
          return _$root
        }),
      ] as any,
      parent as any,
      anchor as any,
    )
    await flushEffects()

    expect(parent.textContent).toBe('B')
    expect(parent.querySelectorAll('strong')).toHaveLength(1)
  })

  it('updates a component-handle child array inside renderAnchor', async () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('anchor')

    parent.append(anchor)

    renderAnchor(
      [
        _$createDynamic(InlineStrong, { label: 'A' }),
        _$createDynamic(InlineStrong, { label: 'B' }),
      ] as any,
      parent as any,
      anchor as any,
    )
    await flushEffects()

    expect(parent.textContent).toBe('AB')
    expect(parent.querySelectorAll('strong')).toHaveLength(2)

    renderAnchor(
      [
        _$createDynamic(InlineStrong, { label: 'C' }),
        _$createDynamic(InlineStrong, { label: 'D' }),
      ] as any,
      parent as any,
      anchor as any,
    )
    await flushEffects()

    expect(parent.textContent).toBe('CD')
    expect(parent.querySelectorAll('strong')).toHaveLength(2)
    expect(parent.childNodes[parent.childNodes.length - 1]).toBe(anchor)
  })

  it('updates renderAnchor from a component handle to a vapor handle', async () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('anchor')

    parent.append(anchor)

    renderAnchor(_$createDynamic(InlineStrong, { label: 'A' }) as any, parent as any, anchor as any)
    await flushEffects()

    expect(parent.textContent).toBe('A')
    expect(parent.querySelectorAll('strong')).toHaveLength(1)

    renderAnchor(createStrongVapor('B') as any, parent as any, anchor as any)
    await flushEffects()

    expect(parent.textContent).toBe('B')
    expect(parent.querySelectorAll('strong')).toHaveLength(1)
    expect(parent.childNodes[parent.childNodes.length - 1]).toBe(anchor)
  })

  it('updates renderAnchor when a component directly returns a renderable prop value', async () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('anchor')

    parent.append(anchor)

    renderAnchor(
      _$createDynamic(ForwardRenderable, {
        value: _$createDynamic(InlineStrong, { label: 'A' }),
      }) as any,
      parent as any,
      anchor as any,
    )
    await flushEffects()

    expect(parent.textContent).toBe('A')
    expect(parent.querySelectorAll('strong')).toHaveLength(1)

    renderAnchor(
      _$createDynamic(ForwardRenderable, { value: createStrongVapor('B') }) as any,
      parent as any,
      anchor as any,
    )
    await flushEffects()

    expect(parent.textContent).toBe('B')
    expect(parent.querySelectorAll('strong')).toHaveLength(1)
    expect(parent.childNodes[parent.childNodes.length - 1]).toBe(anchor)
  })

  it('updates a vapor child array inside renderAnchor', async () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('anchor')

    parent.append(anchor)

    renderAnchor(
      [createStrongVapor('A'), createStrongVapor('B'), createStrongVapor('C')] as any,
      parent as any,
      anchor as any,
    )
    await flushEffects()

    expect(parent.textContent).toBe('ABC')
    expect(parent.querySelectorAll('strong')).toHaveLength(3)

    renderAnchor([createStrongVapor('D')] as any, parent as any, anchor as any)
    await flushEffects()

    expect(parent.textContent).toBe('D')
    expect(parent.querySelectorAll('strong')).toHaveLength(1)
  })

  it('updates a vapor child array with nested renderAnchor text', async () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('anchor')

    parent.append(anchor)

    renderAnchor(
      [createAnchoredTextVapor('A'), createAnchoredTextVapor('B')] as any,
      parent as any,
      anchor as any,
    )
    await flushEffects()

    expect(parent.textContent).toBe('AB')

    renderAnchor([createAnchoredTextVapor('C')] as any, parent as any, anchor as any)
    await flushEffects()

    expect(parent.textContent).toBe('C')
  })

  it('updates a vapor child array with nested vapor child arrays', async () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('anchor')

    parent.append(anchor)

    renderAnchor([createNestedVaporArray(['A', 'B'])] as any, parent as any, anchor as any)
    await flushEffects()

    expect(parent.textContent).toBe('AB')
    expect(parent.querySelectorAll('strong')).toHaveLength(2)

    renderAnchor([createNestedVaporArray(['C'])] as any, parent as any, anchor as any)
    await flushEffects()

    expect(parent.textContent).toBe('C')
    expect(parent.querySelectorAll('strong')).toHaveLength(1)
  })

  it('updates a vapor child array with nested component anchors', async () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('anchor')

    parent.append(anchor)

    renderAnchor(
      [createAnchoredComponentVapor('A'), createAnchoredComponentVapor('B')] as any,
      parent as any,
      anchor as any,
    )
    await flushEffects()

    expect(parent.textContent).toBe('AB')
    expect(parent.querySelectorAll('strong')).toHaveLength(2)

    renderAnchor([createAnchoredComponentVapor('C')] as any, parent as any, anchor as any)
    await flushEffects()

    expect(parent.textContent).toBe('C')
    expect(parent.querySelectorAll('strong')).toHaveLength(1)
  })

  it('updates a vapor child array with nested keyed vapor lists', async () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('anchor')

    parent.append(anchor)

    renderAnchor(
      [createKeyedButtonsVapor('Title', ['A', 'B'])] as any,
      parent as any,
      anchor as any,
    )
    await flushEffects()

    expect(parent.textContent).toBe('TitleAB')
    expect(parent.querySelectorAll('strong')).toHaveLength(2)

    renderAnchor([createKeyedButtonsVapor('Next', ['C'])] as any, parent as any, anchor as any)
    await flushEffects()

    expect(parent.textContent).toBe('NextC')
    expect(parent.querySelectorAll('strong')).toHaveLength(1)
  })

  it('ignores a renderAnchor update when the anchor is no longer under the parent', async () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('anchor')

    parent.append(anchor)

    renderAnchor(
      [
        _$compiledVapor(_$parentContext => {
          const _$root = _$compiledCreateElement('strong', _$parentContext)
          const _$anchor = _$compiledCreateComment('rue:children:anchor')
          _$compiledAppendChild(_$root, _$anchor)
          _$compiledWatchEffect(() => {
            const { children: _$children, ..._$attributes } = { children: 'A' } as Record<
              string,
              any
            >
            _$compiledSpreadAttributes(_$root, _$attributes)
            _$compiledRenderAnchor(_$children, _$root, _$anchor)
          })
          return _$root
        }),
      ] as any,
      parent as any,
      anchor as any,
    )
    await flushEffects()

    while (parent.firstChild) {
      parent.removeChild(parent.firstChild)
    }

    expect(() =>
      renderAnchor(
        [
          _$compiledVapor(_$parentContext => {
            const _$root = _$compiledCreateElement('strong', _$parentContext)
            const _$anchor = _$compiledCreateComment('rue:children:anchor')
            _$compiledAppendChild(_$root, _$anchor)
            _$compiledWatchEffect(() => {
              const { children: _$children, ..._$attributes } = { children: 'B' } as Record<
                string,
                any
              >
              _$compiledSpreadAttributes(_$root, _$attributes)
              _$compiledRenderAnchor(_$children, _$root, _$anchor)
            })
            return _$root
          }),
        ] as any,
        parent as any,
        anchor as any,
      ),
    ).not.toThrow()
    await flushEffects()

    expect(parent.textContent).toBe('')
  })

  it('updates a mount-handle fragment inside renderAnchor', async () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('anchor')

    parent.append(anchor)

    renderAnchor(
      _$createFragment([
        _$compiledVapor(_$parentContext => {
          const _$root = _$compiledCreateElement('strong', _$parentContext)
          const _$anchor = _$compiledCreateComment('rue:children:anchor')
          _$compiledAppendChild(_$root, _$anchor)
          _$compiledWatchEffect(() => {
            const { children: _$children, ..._$attributes } = { children: 'A' } as Record<
              string,
              any
            >
            _$compiledSpreadAttributes(_$root, _$attributes)
            _$compiledRenderAnchor(_$children, _$root, _$anchor)
          })
          return _$root
        }),
      ]) as any,
      parent as any,
      anchor as any,
    )
    await flushEffects()

    expect(parent.textContent).toBe('A')
    expect(parent.querySelectorAll('strong')).toHaveLength(1)

    renderAnchor(
      _$createFragment([
        _$compiledVapor(_$parentContext => {
          const _$root = _$compiledCreateElement('strong', _$parentContext)
          const _$anchor = _$compiledCreateComment('rue:children:anchor')
          _$compiledAppendChild(_$root, _$anchor)
          _$compiledWatchEffect(() => {
            const { children: _$children, ..._$attributes } = { children: 'B' } as Record<
              string,
              any
            >
            _$compiledSpreadAttributes(_$root, _$attributes)
            _$compiledRenderAnchor(_$children, _$root, _$anchor)
          })
          return _$root
        }),
      ]) as any,
      parent as any,
      anchor as any,
    )
    await flushEffects()

    expect(parent.textContent).toBe('B')
    expect(parent.querySelectorAll('strong')).toHaveLength(1)
  })

  it('bridges renderStatic blocks and retains the compiled anchor', async () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('static-anchor')

    parent.appendChild(anchor)

    renderStatic(createTextBlock('static', 'static') as any, parent as any, anchor as any)

    await flushEffects()

    expect(parent.textContent).toBe('static')
    expect(parent.contains(anchor)).toBe(true)
  })
})
