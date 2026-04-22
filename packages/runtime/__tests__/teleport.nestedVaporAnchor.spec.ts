import { afterEach, describe, expect, it } from 'vitest'

import {
  Teleport,
  Transition,
  h,
  render,
  renderAnchor,
  setReactiveScheduling,
  vapor,
  watchEffect,
  _$vaporCreateVNode,
} from '../src'
import type { FC } from '../src'

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
})

const flushEffects = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const collectBodyCommentValues = () => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_COMMENT)
  const values: string[] = []
  let node = walker.nextNode()
  while (node) {
    values.push((node as Comment).nodeValue ?? '')
    node = walker.nextNode()
  }
  return values.filter(value => value.startsWith('rue-teleport') || value === 'rue:slot:anchor')
}

describe('Teleport nested vapor anchor', () => {
  it('keeps nested vapor anchor inside teleport range and shows updated content', async () => {
    const ModalLike: FC<{ visible: boolean }> = props => {
      const content = h(
        'fragment',
        null,
        props.visible ? h('div', { className: 'modal-mask' }, 'OPEN') : null,
      )

      return vapor(() => {
        const root = document.createDocumentFragment()
        const componentAnchor = document.createComment('rue:component:anchor')
        root.appendChild(componentAnchor)

        const child = vapor(() => {
          const childRoot = document.createDocumentFragment()
          const slotAnchor = document.createComment('rue:slot:anchor')
          childRoot.appendChild(slotAnchor)

          watchEffect(() => {
            const vnode = _$vaporCreateVNode(content)
            renderAnchor(vnode as any, childRoot as any, slotAnchor as any)
          })

          return { vaporElement: childRoot as any }
        })

        watchEffect(() => {
          renderAnchor(
            h(Teleport, { to: 'body' }, child as any),
            root as any,
            componentAnchor as any,
          )
        })

        return { vaporElement: root as any }
      }) as any
    }

    const container = document.createElement('div')
    document.body.appendChild(container)

    render(h(ModalLike, { visible: false }), container)
    await flushEffects()

    const initialTeleportComments = collectBodyCommentValues()

    expect(initialTeleportComments).toEqual([
      'rue-teleport-start',
      'rue:slot:anchor',
      'rue-teleport-end',
    ])

    render(h(ModalLike, { visible: true }), container)
    await flushEffects()

    expect(document.querySelector('.modal-mask')?.textContent).toBe('OPEN')
  })

  it('shows updated content when nested vapor child contains Transition', async () => {
    const ModalLike: FC<{ visible: boolean }> = props => {
      const content = h(
        'fragment',
        null,
        props.visible
          ? h(
              Transition,
              {
                name: 'modal',
                type: 'transition',
                duration: { enter: 1, leave: 1 },
                appear: true,
              },
              h('div', { className: 'modal-mask' }, 'OPEN'),
            )
          : null,
      )

      return vapor(() => {
        const root = document.createDocumentFragment()
        const componentAnchor = document.createComment('rue:component:anchor')
        root.appendChild(componentAnchor)

        const child = vapor(() => {
          const childRoot = document.createDocumentFragment()
          const slotAnchor = document.createComment('rue:slot:anchor')
          childRoot.appendChild(slotAnchor)

          watchEffect(() => {
            const vnode = _$vaporCreateVNode(content)
            renderAnchor(vnode as any, childRoot as any, slotAnchor as any)
          })

          return { vaporElement: childRoot as any }
        })

        watchEffect(() => {
          renderAnchor(
            h(Teleport, { to: 'body' }, child as any),
            root as any,
            componentAnchor as any,
          )
        })

        return { vaporElement: root as any }
      }) as any
    }

    const container = document.createElement('div')
    document.body.appendChild(container)

    render(h(ModalLike, { visible: false }), container)
    await flushEffects()

    render(h(ModalLike, { visible: true }), container)
    await flushEffects()

    expect(document.querySelector('.modal-mask')?.textContent).toBe('OPEN')
  })

  it('shows updated content when nested vapor content keeps a leading style node', async () => {
    const ModalLike: FC<{ visible: boolean }> = props => {
      const content = h(
        'fragment',
        null,
        h('style', null, '.modal-mask{display:block;}'),
        props.visible
          ? h(
              Transition,
              {
                name: 'modal',
                type: 'transition',
                duration: { enter: 1, leave: 1 },
                appear: true,
              },
              h('div', { className: 'modal-mask' }, 'OPEN'),
            )
          : null,
      )

      return vapor(() => {
        const root = document.createDocumentFragment()
        const componentAnchor = document.createComment('rue:component:anchor')
        root.appendChild(componentAnchor)

        const child = vapor(() => {
          const childRoot = document.createDocumentFragment()
          const slotAnchor = document.createComment('rue:slot:anchor')
          childRoot.appendChild(slotAnchor)

          watchEffect(() => {
            const vnode = _$vaporCreateVNode(content)
            renderAnchor(vnode as any, childRoot as any, slotAnchor as any)
          })

          return { vaporElement: childRoot as any }
        })

        watchEffect(() => {
          renderAnchor(
            h(Teleport, { to: 'body' }, child as any),
            root as any,
            componentAnchor as any,
          )
        })

        return { vaporElement: root as any }
      }) as any
    }

    const container = document.createElement('div')
    document.body.appendChild(container)

    render(h(ModalLike, { visible: false }), container)
    await flushEffects()

    render(h(ModalLike, { visible: true }), container)
    await flushEffects()

    expect(document.querySelector('.modal-mask')?.textContent).toBe('OPEN')
    expect(document.querySelector('style')?.textContent).toContain('.modal-mask')
  })
})
