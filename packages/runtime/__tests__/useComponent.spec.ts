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
  it('keeps a stable vaporElement and effect per instance', async () => {
    // 通过 useComponent 构造异步组件；内部返回简单的 div VNode
    const Async = useComponent(async () => {
      return (props: any) => ({ type: 'div', props, children: [] }) as any
    })

    // 同一 loader 下创建两个实例（不同 props）
    const v1: any = Async({ n: 1 })
    const v2: any = Async({ n: 2 })

    // 不同实例的容器应互不影响
    const c1a = v1.props.setup().vaporElement
    const c1b = v1.props.setup().vaporElement
    const c2a = v2.props.setup().vaporElement
    const c2b = v2.props.setup().vaporElement

    expect(c1a).toBe(c1b)
    expect(c2a).toBe(c2b)
    expect(c1a).not.toBe(c2a)
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
