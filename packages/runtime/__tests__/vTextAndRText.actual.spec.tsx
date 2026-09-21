import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import VTextAndRText from '../../../app/pages/jsx/VTextAndRText'
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

describe('VTextAndRText actual page', () => {
  it('updates directive-rendered text content after input and explicit sync action', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<VTextAndRText />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('v-text / r-text')
      expect(findTab(container, '代码')?.className).toContain('tab-active')
    })

    await click(findTab(container, '效果'))

    const input = container.querySelector('input.input') as HTMLInputElement | null
    expect(input).not.toBeNull()
    expect(container.querySelector('.rounded-box h2')?.textContent).toBe('Rue 文本指令')
    expect(container.querySelector('.alert.alert-info')?.textContent).toBe('等待同步')

    input!.value = 'Rue 已同步'
    input!.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))

    await waitForContent(() => {
      expect(container.querySelector('.rounded-box h2')?.textContent).toBe('Rue 已同步')
      expect(container.querySelector('.alert.alert-info')?.textContent).toBe('等待同步')
    })

    await click(findButton(container, '同步状态'))

    await waitForContent(() => {
      expect(container.querySelector('.alert.alert-info')?.textContent).toBe('已同步：Rue 已同步')
    })

    await click(findTab(container, '代码'))

    expect(container.querySelector('input.input')).toBeNull()
  })
})
