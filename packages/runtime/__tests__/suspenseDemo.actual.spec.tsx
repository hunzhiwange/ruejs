import { afterEach, describe, expect, it, vi } from 'vitest'
import { setReactiveScheduling } from '../src'
import compiledBoundary from '../src/compiler-runtime/builtins/suspense'
import { createCompiledBlock, type CompiledSlotFactory } from '../src/compiler-runtime/mount'
import SuspenseDemo from '../../../app/pages/jsx/SuspenseDemo'
import { createMountedCompiledTestComponent } from './compiler-capability-test-runtime'

vi.mock('../../../app/pages/site/SidebarPlaygroundExample', () => ({
  default: (props: { children?: unknown }) => (
    <div data-testid="mock-sidebar">{props.children}</div>
  ),
}))

vi.mock('../../../app/pages/site/components/Code', () => ({
  default: () => <></>,
}))

setReactiveScheduling('sync')

const flushAsyncWork = async () => {
  for (let turn = 0; turn < 8; turn += 1) await Promise.resolve()
}

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

const textSlot =
  (text: string): CompiledSlotFactory =>
  (target, _props, owner) => {
    const node = document.createTextNode(text)
    target.parent.insertBefore(node, target.before)
    return createCompiledBlock(target, owner, { first: node, last: node })
  }

describe('compiled Suspense integration', () => {
  it('replaces every real-page fallback with resolved async panels', async () => {
    vi.useFakeTimers()
    ;(globalThis as any).__rue_active = (globalThis as any).__rue
    const host = document.createElement('div')
    document.body.appendChild(host)

    const mounted = createMountedCompiledTestComponent(SuspenseDemo as any, host)
    await flushAsyncWork()

    expect(host.textContent).toContain('正在加载销售看板')
    expect(host.textContent).toContain('默认：内层 fallback 正在加载')
    expect(host.textContent).toContain('父级 fallback 接管整块外层内容')
    expect(host.textContent).toContain('本地 loading：这个异步组件设置了 suspensible: false')
    expect(host.textContent).not.toContain('Q2 转化收入')

    await vi.advanceTimersByTimeAsync(3200)
    await vi.dynamicImportSettled()
    await vi.runAllTimersAsync()
    await flushAsyncWork()

    expect(host.textContent).toContain('Q2 转化收入')
    expect(host.textContent).toContain('统一边界内的活动流')
    expect(host.textContent).toContain('默认异步内容已解析')
    expect(host.textContent).toContain('交给父边界的活动流')
    expect(host.textContent).toContain('本地 loading 控制的活动流')
    expect(host.textContent).not.toContain('正在加载销售看板')
    expect(host.textContent).not.toContain('默认：内层 fallback 正在加载')
    expect(host.textContent).not.toContain('父级 fallback 接管整块外层内容')
    expect(host.textContent).not.toContain('本地 loading：这个异步组件设置了 suspensible: false')
    expect(host.querySelectorAll('[style="display: contents;"]')).toHaveLength(5)
    mounted.dispose()
  })

  it('mounts nested resolved boundaries and releases both owner ranges', () => {
    const host = document.createElement('div')
    const nested: CompiledSlotFactory = (target, _props, owner) => {
      const inner = compiledBoundary(() => ({ children: textSlot('nested') }))
      const staging = document.createDocumentFragment()
      inner.__rue_compiled_mount(staging)
      const first = staging.firstChild!
      const last = staging.lastChild!
      target.parent.insertBefore(staging, target.before)
      return createCompiledBlock(target, owner, { first, last }, () => inner.dispose())
    }
    const outer = compiledBoundary(() => ({ children: nested }))
    outer.__rue_compiled_mount(host)
    expect(host.textContent).toBe('nested')
    outer.dispose()
    expect(host.textContent).toBe('')
  })
})
