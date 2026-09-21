import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import VHtmlAndRHtml from '../../../app/pages/jsx/VHtmlAndRHtml'
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

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('VHtmlAndRHtml actual page', () => {
  it('renders raw html into both block content and badge content after update', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<VHtmlAndRHtml />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('v-html / r-html')
      expect(findTab(container, '代码')?.className).toContain('tab-active')
    })

    await click(findTab(container, '效果'))

    const article = container.querySelector('.alert.alert-info') as HTMLElement | null
    const badge = container.querySelector('.badge.badge-success.badge-lg') as HTMLElement | null
    expect(article).not.toBeNull()
    expect(badge).not.toBeNull()
    expect(article!.innerHTML).toContain('<strong>草稿</strong>')
    expect(article!.textContent).toContain('文档仍在编辑中。')
    expect(badge!.innerHTML).toContain('<strong>Pro</strong>')
    expect(badge!.textContent).toContain('专业版在线')

    await click(findButton(container, '更新 HTML'))

    await waitForContent(() => {
      expect(article!.innerHTML).toContain('<strong>已发布</strong>')
      expect(article!.textContent).toContain('文档已经公开。')
      expect(badge!.innerHTML).toContain('<strong>Basic</strong>')
      expect(badge!.textContent).toContain('标准版在线')
    })

    await click(findTab(container, '代码'))

    expect(container.querySelector('.alert.alert-info')).toBeNull()
  })
})
