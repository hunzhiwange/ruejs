import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import VIfAndRIf from '../../../app/pages/jsx/VIfAndRIf'
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

describe('VIfAndRIf actual page', () => {
  it('switches both v-if and r-if branches so only the active branch content remains mounted', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<VIfAndRIf />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('v-if / r-if')
      expect(findTab(container, '代码')?.className).toContain('tab-active')
    })

    await click(findTab(container, '效果'))

    const sections = Array.from(container.querySelectorAll('section.space-y-3'))
    expect(sections).toHaveLength(2)

    await waitForContent(() => {
      expect(sections[0].querySelector('.alert')?.textContent?.trim()).toBe('文档仍在草稿阶段。')
      expect(sections[1].querySelector('.badge')?.textContent?.trim()).toBe('专业版在线')
    })

    await click(findButton(sections[0], '审核'))
    await click(findButton(sections[1], 'Basic'))

    await waitForContent(() => {
      expect(sections[0].querySelectorAll('.alert')).toHaveLength(1)
      expect(sections[0].querySelector('.alert')?.textContent?.trim()).toBe('文档正在审核中。')
      expect(sections[1].querySelectorAll('.badge')).toHaveLength(1)
      expect(sections[1].querySelector('.badge')?.textContent?.trim()).toBe('标准版在线')
    })

    await click(findButton(sections[0], '发布'))
    await click(findButton(sections[1], 'Offline'))

    await waitForContent(() => {
      expect(sections[0].querySelectorAll('.alert')).toHaveLength(1)
      expect(sections[0].querySelector('.alert')?.textContent?.trim()).toBe('文档已经发布。')
      expect(sections[1].querySelectorAll('.badge')).toHaveLength(1)
      expect(sections[1].querySelector('.badge')?.textContent?.trim()).toBe('当前离线')
    })

    await click(findTab(container, '代码'))

    expect(container.querySelectorAll('section.space-y-3')).toHaveLength(0)
  })
})
