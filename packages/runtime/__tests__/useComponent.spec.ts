import { afterEach, describe, expect, it } from 'vitest'
import { h, render, setReactiveScheduling, useComponent, type FC } from '../src'

type AsyncLabelModule = { default: FC<{ label: string }> }

setReactiveScheduling('sync')

const flushAsyncComponent = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

afterEach(() => {
  document.body.innerHTML = ''
})

// 验证 useComponent：同一 loader 下的不同实例应共享加载状态，但各自拥有独立的容器与副作用
describe('useComponent', () => {
  it('renders same-loader instances with independent props and mount ranges', async () => {
    const deferred: { resolve?: (value: AsyncLabelModule) => void } = {}
    const Async = useComponent<{ label: string }>(
      () =>
        new Promise<AsyncLabelModule>(resolve => {
          deferred.resolve = resolve
        }),
    )

    const container = document.createElement('div')
    document.body.appendChild(container)

    render(h('fragment', null, h(Async, { label: 'A' }), h(Async, { label: 'B' })), container)
    await flushAsyncComponent()

    deferred.resolve?.({
      default: (props: any) => h('section', { 'data-label': props.label }, props.label),
    })
    await flushAsyncComponent()

    expect(Array.from(container.querySelectorAll('section'), el => el.textContent)).toEqual(['A', 'B'])
    expect(Array.from(container.querySelectorAll('section'), el => el.getAttribute('data-label'))).toEqual([
      'A',
      'B',
    ])
  })

  it('removes the previous async wrapper subtree when switching loaders', async () => {
    const deferredA: { resolve?: (value: AsyncLabelModule) => void } = {}
    const deferredB: { resolve?: (value: AsyncLabelModule) => void } = {}

    const AsyncA = useComponent<{ label: string }>(
      () =>
        new Promise<AsyncLabelModule>(resolve => {
          deferredA.resolve = resolve
        }),
    )
    const AsyncB = useComponent<{ label: string }>(
      () =>
        new Promise<AsyncLabelModule>(resolve => {
          deferredB.resolve = resolve
        }),
    )

    const container = document.createElement('div')
    document.body.appendChild(container)

    render(h(AsyncA, { label: 'A' }), container)
    await flushAsyncComponent()
    deferredA.resolve?.({
      default: (props: any) => h('section', { id: 'page-a' }, props.label),
    })
    await flushAsyncComponent()

    expect(container.querySelector('#page-a')?.textContent).toBe('A')

    render(h(AsyncB, { label: 'B' }), container)
    await flushAsyncComponent()
    deferredB.resolve?.({
      default: (props: any) => h('section', { id: 'page-b' }, props.label),
    })
    await flushAsyncComponent()

    expect(container.querySelector('#page-a')).toBeNull()
    expect(container.querySelectorAll('#page-b')).toHaveLength(1)
    expect(container.querySelector('#page-b')?.textContent).toBe('B')
  })
})
