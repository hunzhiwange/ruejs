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
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Teleport, Transition, setReactiveScheduling, watchEffect } from '../src'
import { render, renderAnchor } from '../src'
import type { FC } from '../src'
import { Teleport as CompiledTeleport } from '../src/compiler-runtime/builtins'
import { createCompiledBlock, type CompiledSlotFactory } from '../src/compiler-runtime/mount'
import { vapor } from './legacy-test-render'

void watchEffect

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
})

const flushEffects = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const collectBodySlotAnchors = () => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_COMMENT)
  const anchors: Comment[] = []
  let node = walker.nextNode()
  while (node) {
    if ((node as Comment).nodeValue === 'rue:slot:anchor') anchors.push(node as Comment)
    node = walker.nextNode()
  }
  return anchors
}

describe('Teleport nested vapor anchor', () => {
  it('moves one owned compiled range between targets and removes it on dispose', () => {
    const host = document.createElement('main')
    const firstTarget = document.createElement('aside')
    const secondTarget = document.createElement('aside')
    const cleanup = vi.fn()
    document.body.append(host, firstTarget, secondTarget)

    const children: CompiledSlotFactory = (target, _props, owner) => {
      const node = document.createElement('output')
      node.dataset.teleported = 'owned'
      node.textContent = 'teleported'
      target.parent.insertBefore(node, target.before)
      return createCompiledBlock(target, owner, { first: node, last: node }, cleanup)
    }
    const handle = CompiledTeleport({ to: firstTarget, children })
    handle.__rue_compiled_mount(host)
    const teleported = firstTarget.querySelector('[data-teleported="owned"]')

    expect(teleported).not.toBeNull()
    expect(document.querySelectorAll('[data-teleported="owned"]')).toHaveLength(1)
    expect(
      Array.from(host.childNodes).filter(
        node => node.nodeType === Node.COMMENT_NODE && node.nodeValue === 'rue:compiled-teleport',
      ),
    ).toHaveLength(1)

    handle.__rue_compiled_update_props__({ to: secondTarget, children })

    expect(firstTarget.querySelector('[data-teleported="owned"]')).toBeNull()
    expect(secondTarget.querySelector('[data-teleported="owned"]')).toBe(teleported)
    expect(document.querySelectorAll('[data-teleported="owned"]')).toHaveLength(1)
    expect(cleanup).not.toHaveBeenCalled()

    handle.dispose()
    handle.dispose()

    expect(document.querySelector('[data-teleported="owned"]')).toBeNull()
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('keeps nested vapor anchor inside teleport range and shows updated content', async () => {
    const ModalLike: FC<{ visible: boolean }> = props => {
      const content = _$createFragment([
        props.visible
          ? _$compiledVapor(_$parentContext => {
              const _$root = _$compiledCreateElement('div', _$parentContext)
              const _$anchor = _$compiledCreateComment('rue:children:anchor')
              _$compiledAppendChild(_$root, _$anchor)
              _$compiledWatchEffect(() => {
                const { children: _$children, ..._$attributes } = {
                  className: 'modal-mask',
                  children: 'OPEN',
                } as Record<string, any>
                _$compiledSpreadAttributes(_$root, _$attributes)
                _$compiledRenderAnchor(_$children, _$root, _$anchor)
              })
              return _$root
            })
          : null,
      ])

      return vapor(() => {
        const root = document.createDocumentFragment()
        const componentAnchor = document.createComment('rue:component:anchor')
        root.appendChild(componentAnchor)

        const child = vapor(() => {
          const childRoot = document.createDocumentFragment()
          const slotAnchor = document.createComment('rue:slot:anchor')
          childRoot.appendChild(slotAnchor)

          _$compiledWatchEffect(() => {
            renderAnchor(content as any, childRoot as any, slotAnchor as any)
          })

          return childRoot as any
        })

        _$compiledWatchEffect(() => {
          renderAnchor(
            _$createDynamic(Teleport, {
              to: 'body',
              children: child as any,
            }),
            root as any,
            componentAnchor as any,
          )
        })

        return root as any
      }) as any
    }

    const container = document.createElement('div')
    document.body.appendChild(container)

    render(_$createDynamic(ModalLike, { visible: false }), container)
    await flushEffects()

    const [teleportedSlotAnchor] = collectBodySlotAnchors()

    expect(collectBodySlotAnchors()).toHaveLength(1)
    expect(teleportedSlotAnchor.parentNode).toBe(document.body)
    expect(container.contains(teleportedSlotAnchor)).toBe(false)
    expect(document.querySelector('.modal-mask')).toBeNull()

    render(_$createDynamic(ModalLike, { visible: true }), container)
    await flushEffects()

    expect(document.querySelector('.modal-mask')?.textContent).toBe('OPEN')
    expect(collectBodySlotAnchors()).toEqual([teleportedSlotAnchor])
  })

  it('shows updated content when nested vapor child contains Transition', async () => {
    const ModalLike: FC<{ visible: boolean }> = props => {
      const content = _$createFragment([
        props.visible
          ? _$createDynamic(Transition, {
              name: 'modal',
              type: 'transition',
              duration: {
                enter: 1,
                leave: 1,
              },
              appear: true,
              children: _$compiledVapor(_$parentContext => {
                const _$root = _$compiledCreateElement('div', _$parentContext)
                const _$anchor = _$compiledCreateComment('rue:children:anchor')
                _$compiledAppendChild(_$root, _$anchor)
                _$compiledWatchEffect(() => {
                  const { children: _$children, ..._$attributes } = {
                    className: 'modal-mask',
                    children: 'OPEN',
                  } as Record<string, any>
                  _$compiledSpreadAttributes(_$root, _$attributes)
                  _$compiledRenderAnchor(_$children, _$root, _$anchor)
                })
                return _$root
              }),
            })
          : null,
      ])

      return vapor(() => {
        const root = document.createDocumentFragment()
        const componentAnchor = document.createComment('rue:component:anchor')
        root.appendChild(componentAnchor)

        const child = vapor(() => {
          const childRoot = document.createDocumentFragment()
          const slotAnchor = document.createComment('rue:slot:anchor')
          childRoot.appendChild(slotAnchor)

          _$compiledWatchEffect(() => {
            renderAnchor(content as any, childRoot as any, slotAnchor as any)
          })

          return childRoot as any
        })

        _$compiledWatchEffect(() => {
          renderAnchor(
            _$createDynamic(Teleport, {
              to: 'body',
              children: child as any,
            }),
            root as any,
            componentAnchor as any,
          )
        })

        return root as any
      }) as any
    }

    const container = document.createElement('div')
    document.body.appendChild(container)

    render(_$createDynamic(ModalLike, { visible: false }), container)
    await flushEffects()

    render(_$createDynamic(ModalLike, { visible: true }), container)
    await flushEffects()

    expect(document.querySelector('.modal-mask')?.textContent).toBe('OPEN')
  })

  it('shows updated content when nested vapor content keeps a leading style node', async () => {
    const ModalLike: FC<{ visible: boolean }> = props => {
      const content = _$createFragment([
        _$compiledVapor(_$parentContext => {
          const _$root = _$compiledCreateElement('style', _$parentContext)
          const _$anchor = _$compiledCreateComment('rue:children:anchor')
          _$compiledAppendChild(_$root, _$anchor)
          _$compiledWatchEffect(() => {
            const { children: _$children, ..._$attributes } = {
              children: '.modal-mask{display:block;}',
            } as Record<string, any>
            _$compiledSpreadAttributes(_$root, _$attributes)
            _$compiledRenderAnchor(_$children, _$root, _$anchor)
          })
          return _$root
        }),
        props.visible
          ? _$createDynamic(Transition, {
              name: 'modal',
              type: 'transition',
              duration: {
                enter: 1,
                leave: 1,
              },
              appear: true,
              children: _$compiledVapor(_$parentContext => {
                const _$root = _$compiledCreateElement('div', _$parentContext)
                const _$anchor = _$compiledCreateComment('rue:children:anchor')
                _$compiledAppendChild(_$root, _$anchor)
                _$compiledWatchEffect(() => {
                  const { children: _$children, ..._$attributes } = {
                    className: 'modal-mask',
                    children: 'OPEN',
                  } as Record<string, any>
                  _$compiledSpreadAttributes(_$root, _$attributes)
                  _$compiledRenderAnchor(_$children, _$root, _$anchor)
                })
                return _$root
              }),
            })
          : null,
      ])

      return vapor(() => {
        const root = document.createDocumentFragment()
        const componentAnchor = document.createComment('rue:component:anchor')
        root.appendChild(componentAnchor)

        const child = vapor(() => {
          const childRoot = document.createDocumentFragment()
          const slotAnchor = document.createComment('rue:slot:anchor')
          childRoot.appendChild(slotAnchor)

          _$compiledWatchEffect(() => {
            renderAnchor(content as any, childRoot as any, slotAnchor as any)
          })

          return childRoot as any
        })

        _$compiledWatchEffect(() => {
          renderAnchor(
            _$createDynamic(Teleport, {
              to: 'body',
              children: child as any,
            }),
            root as any,
            componentAnchor as any,
          )
        })

        return root as any
      }) as any
    }

    const container = document.createElement('div')
    document.body.appendChild(container)

    render(_$createDynamic(ModalLike, { visible: false }), container)
    await flushEffects()

    render(_$createDynamic(ModalLike, { visible: true }), container)
    await flushEffects()

    expect(document.querySelector('.modal-mask')?.textContent).toBe('OPEN')
    expect(document.querySelector('style')?.textContent).toContain('.modal-mask')
  })
})
