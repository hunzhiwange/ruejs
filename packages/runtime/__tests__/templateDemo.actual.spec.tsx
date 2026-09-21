import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import TemplateDemo from '../../../app/pages/jsx/TemplateDemo'
import { createMountedCompiledTestComponent } from './compiler-capability-test-runtime'
import { click, mountContainer, waitForContent } from './page-test-utils'

vi.mock('../../../app/pages/site/SidebarPlaygroundExample', () => ({
  default: (props: { children?: unknown }) => (
    <div data-testid="mock-sidebar-example">{props.children}</div>
  ),
}))

vi.mock('../../../app/pages/site/components/Code', () => ({
  default: () => null,
}))

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

const findTab = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button[role="tab"]')).find(
    button => button.textContent?.trim() === label,
  ) ?? null

const findButton = (root: ParentNode, label: string, index = 0) =>
  Array.from(root.querySelectorAll('button')).filter(
    button => button.textContent?.trim() === label,
  )[index] ?? null

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('TemplateDemo actual page', () => {
  it('switches template-controlled cards, branch chains, named slots, and list fragments on the preview tab', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const mounted = createMountedCompiledTestComponent(TemplateDemo as any, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Template 内置组件')
      expect(container.textContent).toContain('直接网格项: 3')
      expect(container.textContent).toContain('直接网格项: 4')
      expect(container.textContent).toContain('当前分支: healthy')
      expect(container.textContent).toContain('运维场景面板')
      expect(container.textContent).toContain('命名插槽内摘要 A')
      expect(container.textContent).toContain('主库切换完成')
    })

    await click(findButton(container, '隐藏中间卡片'))

    await waitForContent(() => {
      expect(container.textContent).toContain('直接网格项: 2')
      expect(container.textContent).not.toContain('告警')
      expect(container.textContent).not.toContain('值班')
    })

    await click(findButton(container, '预警'))

    await waitForContent(() => {
      expect(container.textContent).toContain('当前分支: warning')
      expect(container.textContent).toContain('降级模式')
      expect(container.textContent).toContain('队列上涨')
    })

    await click(findButton(container, '故障'))

    await waitForContent(() => {
      expect(container.textContent).toContain('当前分支: critical')
      expect(container.textContent).toContain('故障切流')
      expect(container.textContent).toContain('人工接管')
    })

    await click(findButton(container, '增长', 0))

    await waitForContent(() => {
      expect(container.textContent).toContain('增长场景面板')
      expect(container.textContent).toContain('named slot')
      expect(container.textContent).toContain('命名插槽内摘要 A')
    })

    await click(findButton(container, '隐藏摘要'))

    await waitForContent(() => {
      expect(container.textContent).not.toContain('命名插槽内摘要 A')
      expect(container.textContent).not.toContain('命名插槽内摘要 B')
    })

    await click(findTab(container, '代码'))

    expect(container.textContent).not.toContain('增长场景面板')
    expect(container.textContent).not.toContain('命名插槽内摘要 A')
    mounted.dispose()
  })
})
