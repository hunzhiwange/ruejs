import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  h,
  onBeforeUnmount,
  onUnmounted,
  render,
  renderAnchor,
  renderBetween,
  setReactiveScheduling,
  signal,
  watchEffect,
  type BlockInstance,
  type RenderTarget,
  type SignalHandle,
} from '../src'

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
})

const flushEffects = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const insertNodeAtTarget = (target: RenderTarget, node: Node) => {
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
}

const createCleanupBlock = (
  label: string,
  onCleanup: () => void,
  onUnmount: () => void,
): BlockInstance => {
  const node = document.createTextNode(label)

  return {
    kind: 'block',
    cleanupBucket: [onCleanup],
    mount(target) {
      insertNodeAtTarget(target, node)
    },
    unmount() {
      node.parentNode?.removeChild(node)
      onUnmount()
    },
  }
}

const createReactiveEffectBlock = (
  source: SignalHandle<number>,
  onCleanup: () => void,
  onUnmount: () => void,
  onRun: (value: number) => void,
): BlockInstance => {
  const node = document.createTextNode('')
  const block: BlockInstance = {
    kind: 'block',
    cleanupBucket: [],
    mount(target) {
      insertNodeAtTarget(target, node)

      const effect = watchEffect(() => {
        const value = source.get()
        node.textContent = String(value)
        onRun(value)
      })

      block.cleanupBucket?.push(() => {
        effect.dispose()
        onCleanup()
      })
    },
    unmount() {
      node.parentNode?.removeChild(node)
      onUnmount()
    },
  }

  return block
}

const createUnmountTrackedComponent = (
  label: string,
  beforeUnmount: () => void,
  unmounted: () => void,
) => {
  return () => {
    onBeforeUnmount(beforeUnmount)
    onUnmounted(unmounted)
    return h('div', { 'data-testid': label }, label)
  }
}

describe('renderable block lifecycle owner', () => {
  it('runs block cleanup bucket and unmount once when the owner is replaced', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const nestedCleanup = vi.fn()
    const nestedUnmount = vi.fn()
    const siblingCleanup = vi.fn()
    const siblingUnmount = vi.fn()

    const nestedBlock = createCleanupBlock('nested', nestedCleanup, nestedUnmount)

    const siblingBlock = createCleanupBlock('sibling', siblingCleanup, siblingUnmount)

    render([nestedBlock, siblingBlock] as any, container as any)
    await flushEffects()

    render('done', container as any)
    await flushEffects()

    expect(nestedCleanup).toHaveBeenCalledTimes(1)
    expect(nestedUnmount).toHaveBeenCalledTimes(1)
    expect(siblingCleanup).toHaveBeenCalledTimes(1)
    expect(siblingUnmount).toHaveBeenCalledTimes(1)
    expect(container.textContent).toBe('done')
  })

  it('runs block cleanup when renderAnchor replaces the previous owner on the same anchor', async () => {
    const parent = document.createElement('div')
    const anchor = document.createComment('anchor')
    parent.appendChild(anchor)

    const cleanup = vi.fn()
    const unmount = vi.fn()
    const block = createCleanupBlock('anchor-block', cleanup, unmount)

    renderAnchor(block as any, parent as any, anchor as any)
    await flushEffects()

    renderAnchor('next' as any, parent as any, anchor as any)
    await flushEffects()

    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(unmount).toHaveBeenCalledTimes(1)
    expect(parent.textContent).toBe('next')
  })

  it('runs component unmount hooks when render switches from a mount-handle owner to null', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const beforeUnmount = vi.fn()
    const unmounted = vi.fn()
    const Component = createUnmountTrackedComponent('container-owner', beforeUnmount, unmounted)

    render(h(Component, null) as any, container as any)
    await flushEffects()

    expect(container.querySelector('[data-testid="container-owner"]')?.textContent).toBe(
      'container-owner',
    )

    render(null as any, container as any)
    await flushEffects()

    expect(beforeUnmount).toHaveBeenCalledTimes(1)
    expect(unmounted).toHaveBeenCalledTimes(1)
    expect(container.textContent).toBe('')
  })

  it('runs component unmount hooks when renderBetween switches from a mount-handle owner to null', async () => {
    const parent = document.createElement('div')
    const start = document.createComment('start')
    const end = document.createComment('end')
    parent.append(start, end)

    const beforeUnmount = vi.fn()
    const unmounted = vi.fn()
    const Component = createUnmountTrackedComponent('range-owner', beforeUnmount, unmounted)

    renderBetween(h(Component, null) as any, parent as any, start as any, end as any)
    await flushEffects()

    expect(parent.querySelector('[data-testid="range-owner"]')?.textContent).toBe('range-owner')

    renderBetween(null as any, parent as any, start as any, end as any)
    await flushEffects()

    expect(beforeUnmount).toHaveBeenCalledTimes(1)
    expect(unmounted).toHaveBeenCalledTimes(1)
    expect(parent.querySelector('[data-testid="range-owner"]')).toBeNull()
    expect(parent.childNodes[0]).toBe(start)
    expect(parent.childNodes[1]).toBe(end)
  })

  it('disposes block-owned watchEffect when owners are replaced repeatedly', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const runs = vi.fn<(value: number) => void>()
    const cleanupA = vi.fn()
    const unmountA = vi.fn()
    const cleanupB = vi.fn()
    const unmountB = vi.fn()

    const sourceA = signal(0)
    render(createReactiveEffectBlock(sourceA, cleanupA, unmountA, runs) as any, container as any)
    await flushEffects()

    expect(runs).toHaveBeenCalledTimes(1)
    expect(container.textContent).toBe('0')

    sourceA.set(1)
    await flushEffects()

    expect(runs).toHaveBeenCalledTimes(2)
    expect(container.textContent).toBe('1')

    const sourceB = signal(10)
    render(createReactiveEffectBlock(sourceB, cleanupB, unmountB, runs) as any, container as any)
    await flushEffects()

    expect(cleanupA).toHaveBeenCalledTimes(1)
    expect(unmountA).toHaveBeenCalledTimes(1)
    expect(runs).toHaveBeenCalledTimes(3)
    expect(container.textContent).toBe('10')

    sourceA.set(2)
    await flushEffects()

    expect(runs).toHaveBeenCalledTimes(3)
    expect(container.textContent).toBe('10')

    sourceB.set(11)
    await flushEffects()

    expect(runs).toHaveBeenCalledTimes(4)
    expect(container.textContent).toBe('11')

    render('done', container as any)
    await flushEffects()

    expect(cleanupB).toHaveBeenCalledTimes(1)
    expect(unmountB).toHaveBeenCalledTimes(1)
    expect(container.textContent).toBe('done')

    sourceB.set(12)
    await flushEffects()

    expect(runs).toHaveBeenCalledTimes(4)
    expect(container.textContent).toBe('done')
  })
})
