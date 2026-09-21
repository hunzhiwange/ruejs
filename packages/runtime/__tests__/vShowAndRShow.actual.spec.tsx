import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import VShowAndRShow from '../../../app/pages/jsx/VShowAndRShow'
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

describe('VShowAndRShow actual page', () => {
  it('toggles display while keeping both show-controlled nodes mounted in preview mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<VShowAndRShow />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('v-show / r-show')
      expect(findTab(container, '代码')?.className).toContain('tab-active')
    })

    await click(findTab(container, '效果'))

    let sections: Element[] = []
    await waitForContent(() => {
      sections = Array.from(container.querySelectorAll('section.space-y-3'))
      expect(sections).toHaveLength(2)
    })

    const chartSection = sections[0]
    const noticeSection = sections[1]
    const chartAlert = chartSection.querySelector('.alert-info') as HTMLElement | null
    const noticeAlert = noticeSection.querySelector('.alert-success') as HTMLElement | null
    expect(chartAlert).not.toBeNull()
    expect(noticeAlert).not.toBeNull()
    expect(chartSection.textContent).toContain('当前状态：显示')
    expect(noticeSection.textContent).toContain('当前状态：隐藏')
    expect(chartAlert!.style.display).toBe('')
    expect(noticeAlert!.style.display).toBe('none')

    await click(findButton(chartSection, '隐藏面板'))

    await waitForContent(() => {
      expect(chartSection.textContent).toContain('当前状态：隐藏')
      expect(chartAlert!.style.display).toBe('none')
      expect(chartSection.querySelector('.alert-info')).toBe(chartAlert)
    })

    await click(findButton(noticeSection, '显示通知'))

    await waitForContent(() => {
      expect(noticeSection.textContent).toContain('当前状态：显示')
      expect(noticeAlert!.style.display).toBe('')
      expect(noticeSection.querySelector('.alert-success')).toBe(noticeAlert)
    })

    await click(findTab(container, '代码'))

    expect(findTab(container, '代码')?.className).toContain('tab-active')
    expect(container.querySelectorAll('section.space-y-3')).toHaveLength(0)
  })
})
