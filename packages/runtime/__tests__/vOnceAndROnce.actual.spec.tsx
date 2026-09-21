import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import VOnceAndROnce from '../../../app/pages/jsx/VOnceAndROnce'
import { click, mountContainer, render, waitForContent } from './page-test-utils'

vi.mock('../../../app/pages/site/SidebarPlaygroundExample', () => ({
  default: (props: { children?: unknown }) => (
    <div data-testid="mock-sidebar-example">{props.children}</div>
  ),
}))

vi.mock('../../../app/pages/site/components/Code', () => ({
  default: () => <></>,
}))

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

const findTab = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button[role="tab"]')).find(
    button => button.textContent?.trim() === label,
  ) ?? null

const findButton = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button')).find(
    button => button.textContent?.trim() === label,
  ) ?? null

const badgeTexts = (root: ParentNode) =>
  Array.from(root.querySelectorAll('.badge.badge-lg')).map(node => node.textContent?.trim())

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('VOnceAndROnce actual page', () => {
  it('keeps once-rendered badges frozen while adjacent live summaries continue updating', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<VOnceAndROnce />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('v-once / r-once')
      expect(findTab(container, '代码')?.className).toContain('tab-active')
    })

    await click(findTab(container, '效果'))

    await waitForContent(() => {
      expect(badgeTexts(container)).toEqual(['首次渲染', 'count: 0'])
      expect(container.textContent).toContain('当前值：首次渲染')
      expect(container.textContent).toContain('当前计数：0')
      expect(container.textContent).toContain('仅在当前组件挂载期间保持首次渲染值')
      expect(container.textContent).toContain('离开路由后再次返回会重新取值')
    })

    await click(findButton(container, '更新数据'))

    await waitForContent(() => {
      expect(badgeTexts(container)).toEqual(['首次渲染', 'count: 0'])
      expect(container.textContent).toContain('当前值：已更新 1 次')
      expect(container.textContent).toContain('当前计数：1')
    })

    await click(findTab(container, '代码'))

    expect(container.querySelectorAll('.badge.badge-lg')).toHaveLength(0)
  })
})
