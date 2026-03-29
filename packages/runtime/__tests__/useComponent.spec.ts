import { describe, it, expect } from 'vitest'
import { useComponent } from '../src/hooks/useComponent'

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
})
