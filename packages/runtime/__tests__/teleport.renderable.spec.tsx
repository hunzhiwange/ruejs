import { afterEach, describe, expect, it } from 'vitest'

import {
  Teleport,
  h,
  onMounted,
  onUnmounted,
  render,
  renderAnchor,
  setReactiveScheduling,
  signal,
  vapor,
  watchEffect,
  type FC,
} from '../src'

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
})

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const TeleportHarness: FC<{ to: HTMLElement; label: string; visible: boolean }> = props =>
  vapor(() => {
    const root = document.createDocumentFragment()
    const anchor = document.createComment('rue:component:anchor')
    root.appendChild(anchor)

    watchEffect(() => {
      renderAnchor(
        props.visible
          ? h(Teleport, { to: props.to }, h('strong', null, props.label))
          : null,
        root as any,
        anchor as any,
      )
    })

    return root as any
  }) as any

const ExternalTextBridge: FC<{ to: HTMLElement; label: string }> = props => {
  let current: HTMLElement | null = null

  onMounted(() => {
    const effect = watchEffect(() => {
      if (current && current !== props.to) {
        current.textContent = ''
      }
      current = props.to
      current.textContent = props.label
    })

    onUnmounted(() => {
      effect.dispose()
      if (current) current.textContent = ''
    })
  })

  return null as any
}

describe('Teleport renderable boundary', () => {
  it('mounts compat child content into the target from an anchored parent', async () => {
    const host = document.createElement('div')
    const targetA = document.createElement('div')

    targetA.id = 'target-a'
    document.body.append(host, targetA)

    render(h(TeleportHarness, { to: targetA, label: 'A', visible: true }), host)
    await flush()

    expect(targetA.textContent).toBe('A')
    expect(host.textContent).toBe('')
  })

  it('updates teleported child content in place within the same target', async () => {
    const host = document.createElement('div')
    const target = document.createElement('div')

    document.body.append(host, target)

    const label = signal('A')

    const App: FC = () =>
      vapor(() => {
        const root = document.createDocumentFragment()
        const anchor = document.createComment('rue:component:anchor')
        root.appendChild(anchor)

        watchEffect(() => {
          renderAnchor(h(Teleport, { to: target }, h('strong', null, label.get())), root as any, anchor as any)
        })

        return root as any
      }) as any

    render(h(App, null), host)
    await flush()

    expect(target.textContent).toBe('A')
    expect(host.textContent).toBe('')

    label.set('B')
    await flush()

    expect(target.textContent).toBe('B')
    expect(target.querySelectorAll('strong')).toHaveLength(1)
    expect(host.textContent).toBe('')
  })

  it('keeps mounted external watchEffect state alive across same-instance target updates', async () => {
    const host = document.createElement('div')
    const targetA = document.createElement('div')
    const targetB = document.createElement('div')

    document.body.append(host, targetA, targetB)

    const to = signal<HTMLElement>(targetA)
    const label = signal('A')

    const App: FC = () =>
      vapor(() => {
        const root = document.createDocumentFragment()
        const anchor = document.createComment('rue:component:anchor')
        root.appendChild(anchor)

        watchEffect(() => {
          renderAnchor(h(ExternalTextBridge, { to: to.get(), label: label.get() }), root as any, anchor as any)
        })

        return root as any
      }) as any

    render(h(App, null), host)
    await flush()

    expect(targetA.textContent).toBe('A')
    expect(targetB.textContent).toBe('')

    to.set(targetB)
    label.set('B')
    await flush()

    expect(targetA.textContent).toBe('')
    expect(targetB.textContent).toBe('B')
  })

  it('updates target and disabled state within the same teleport instance', async () => {
    const host = document.createElement('div')
    const targetA = document.createElement('div')
    const targetB = document.createElement('div')

    document.body.append(host, targetA, targetB)

    const to = signal<HTMLElement>(targetA)
    const disabled = signal(false)
    const label = signal('A')

    const App: FC = () =>
      vapor(() => {
        const root = document.createDocumentFragment()
        const anchor = document.createComment('rue:component:anchor')
        root.appendChild(anchor)

        watchEffect(() => {
          renderAnchor(
            h(Teleport, { to: to.get(), disabled: disabled.get() }, h('strong', null, label.get())),
            root as any,
            anchor as any,
          )
        })

        return root as any
      }) as any

    render(h(App, null), host)
    await flush()

    expect(targetA.textContent).toBe('A')
    expect(targetB.textContent).toBe('')
    expect(host.textContent).toBe('')

    to.set(targetB)
    label.set('B')
    await flush()

    expect(targetA.textContent).toBe('')
    expect(targetB.textContent).toBe('B')
    expect(host.textContent).toBe('')

    disabled.set(true)
    label.set('LOCAL')
    await flush()

    expect(targetA.textContent).toBe('')
    expect(targetB.textContent).toBe('')
    expect(host.textContent).toBe('LOCAL')
  })
})