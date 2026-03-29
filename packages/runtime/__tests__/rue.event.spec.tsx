import { describe, expect, it, vi } from 'vitest'
import { h, render, type FC } from '../src/rue'

describe('DOM event binding and trigger', () => {
  it('attaches and triggers onClick', async () => {
    // 测试点：DOM 事件绑定与触发
    const c = document.createElement('div')
    const spy = vi.fn()

    // 渲染按钮并绑定 onClick
    render(h('button', { onClick: spy }, 'btn'), c)

    // 等待微任务：await Promise.resolve().then(() => {})
    // 等价于“下一轮微任务再继续”，确保异步渲染与事件绑定已经完成。
    // Rue 渲染节拍：Rue 在内部会把渲染/补丁操作放入微任务队列（Promise.then）。
    // 这一步等待可以避免在 DOM 尚未完成更新或监听器尚未挂载时就去 querySelector
    // 或 dispatchEvent，导致偶发的未绑定或未更新问题。
    await Promise.resolve().then(() => {})

    const btn = c.querySelector('button')!
    // 触发点击事件（模拟用户点击）
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    // 断言回调被调用一次
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('updates handler and removes when absent', async () => {
    // 测试点：事件处理函数的替换与移除
    const c = document.createElement('div')
    const spy1 = vi.fn()
    const spy2 = vi.fn()

    // 初次绑定 spy1
    render(h('button', { onClick: spy1 }, 'btn'), c)
    await Promise.resolve().then(() => {})
    const btn1 = c.querySelector('button')!
    btn1.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(spy1).toHaveBeenCalledTimes(1)

    // 替换为 spy2：点击只触发新处理器
    render(h('button', { onClick: spy2 }, 'btn'), c)
    await Promise.resolve().then(() => {})
    const btn2 = c.querySelector('button')!
    btn2.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(spy2).toHaveBeenCalledTimes(1)
    expect(spy1).toHaveBeenCalledTimes(1)

    // 移除处理器：点击不触发任何回调
    render(h('button', null, 'btn'), c)
    await Promise.resolve().then(() => {})
    const btn3 = c.querySelector('button')!
    btn3.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(spy2).toHaveBeenCalledTimes(1)
  })
})

describe('emitted in component with camelCase and lowercase handler', () => {
  const Emitter: FC<{
    onChange?: (v: number) => void
    onchange?: (v: number) => void
  }> = props => {
    const emit = (evt: string, ...args: any[]) => {
      const lower = `on${evt.toLowerCase()}`
      const camel = `on${evt
        .split(/[-_ ]+/)
        .map(s => (s ? s[0].toUpperCase() + s.slice(1) : ''))
        .join('')}`
      const h1 = (props as any)[camel]
      const h2 = (props as any)[lower]
      if (typeof h1 === 'function') h1(...args)
      if (typeof h2 === 'function') h2(...args)
    }
    return (
      <button id="em" onClick={() => emit('change', 42)}>
        emit
      </button>
    )
  }

  it('calls onChange when provided', async () => {
    const c = document.createElement('div')
    const handler = vi.fn()
    render(h(Emitter, { onChange: handler } as any), c)
    await Promise.resolve().then(() => {})
    const btn = c.querySelector('#em')!
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(42)
  })

  it('calls onchange (lowercase) when provided', async () => {
    const c = document.createElement('div')
    const handler = vi.fn()
    render(h(Emitter, { onchange: handler } as any), c)
    await Promise.resolve().then(() => {})
    const btn = c.querySelector('#em')!
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(42)
  })
})

describe('patchProps: remove and re-add event listeners correctly', () => {
  it('removes old listener and adds new one during diff', async () => {
    // 测试点：补丁阶段正确移除旧监听并添加新监听
    const c = document.createElement('div')
    const a = vi.fn()
    const b = vi.fn()

    // 初次绑定 a
    render(h('button', { onClick: a }, 'x'), c)
    await Promise.resolve().then(() => {})
    const btnA = c.querySelector('button')!
    btnA.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(a).toHaveBeenCalledTimes(1)

    // 替换为 b：后续点击只调用 b
    render(h('button', { onClick: b }, 'x'), c)
    await Promise.resolve().then(() => {})
    const btnB = c.querySelector('button')!
    btnB.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(b).toHaveBeenCalledTimes(1)
    expect(a).toHaveBeenCalledTimes(1)

    // 不变更：保持 b，点击累计调用次数
    render(h('button', { onClick: b }, 'x'), c)
    await Promise.resolve().then(() => {})
    const btnC = c.querySelector('button')!
    btnC.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(b).toHaveBeenCalledTimes(2)
  })
})
