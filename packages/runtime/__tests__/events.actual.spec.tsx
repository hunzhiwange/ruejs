import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import Events from '../../../app/pages/jsx/Events'
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

const previewButton = (root: ParentNode) => root.querySelector('button.btn.btn-primary.btn-sm')

const stopPreventLink = (root: ParentNode) => root.querySelector('a.link.link-primary')

const selfOnlyPanel = (root: ParentNode) =>
  root.querySelector('div.rounded-box.border.border-base-300.p-4')

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('Events actual page', () => {
  it('updates the native event counters for click, prevent/default, enter, and self checks', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const container = mountContainer()
    resetActiveRuntime()
    render(<Events />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('事件处理')
      expect(findTab(container, '效果')).not.toBeNull()
    })

    await click(findTab(container, '效果'))

    await waitForContent(() => {
      expect(container.textContent).toContain('事件处理')
      expect(container.textContent).toContain('onClick')
      expect(container.textContent).toContain('onClick + stopPropagation + preventDefault')
      expect(container.querySelectorAll('.badge.badge-lg')[0]?.textContent?.trim()).toBe('0')
      expect(stopPreventLink(container)).not.toBeNull()
    })

    await click(previewButton(container))
    await click(stopPreventLink(container))

    const keyInput = container.querySelector(
      'input[placeholder="按 Enter"]',
    ) as HTMLInputElement | null
    expect(keyInput).not.toBeNull()
    keyInput!.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true }))
    keyInput!.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }))

    const selfContainer = selfOnlyPanel(container)
    expect(selfContainer).not.toBeNull()

    const childButton = selfContainer!.querySelector('button')
    await click(childButton)
    await click(selfContainer)

    const counters = Array.from(container.querySelectorAll('.badge.badge-lg')).map(node =>
      node.textContent?.trim(),
    )
    expect(counters).toEqual(['1', '1', '1', '1'])
    expect(infoSpy).toHaveBeenCalled()

    await click(findTab(container, '代码'))

    expect(container.querySelector('input[placeholder="按 Enter"]')).toBeNull()
  })
})
