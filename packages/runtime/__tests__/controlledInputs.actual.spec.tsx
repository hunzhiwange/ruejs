import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import ControlledInputs from '../../../app/pages/jsx/ControlledInputs'
import { click, flush, mountContainer, render, waitForContent } from './page-test-utils'

vi.mock('../../../app/pages/site/SidebarPlaygroundExample', () => ({
  default: (props: { children?: unknown }) => (
    <div data-testid="mock-sidebar-example">{props.children}</div>
  ),
}))

vi.mock('../../../app/pages/site/components/Code', () => ({
  default: () => <></>,
}))

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('ControlledInputs actual page', () => {
  it('switches between code and preview while keeping controlled input state reactive', async () => {
    const container = mountContainer()
    render(<ControlledInputs />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('受控输入')
      expect(container.textContent).toContain('效果')
      expect(container.textContent).toContain('代码')
    })

    expect(container.querySelector('input.input')).toBeNull()

    const previewTab = Array.from(container.querySelectorAll('button[role="tab"]')).find(
      button => button.textContent?.trim() === '效果',
    )

    await click(previewTab ?? null)

    const input = container.querySelector('input.input') as HTMLInputElement | null
    expect(input).not.toBeNull()

    input!.value = 'Rue controlled input'
    input!.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))
    await flush()

    expect(container.textContent).toContain('当前：Rue controlled input')

    const codeTab = Array.from(container.querySelectorAll('button[role="tab"]')).find(
      button => button.textContent?.trim() === '代码',
    )

    await click(codeTab ?? null)

    expect(container.querySelector('input.input')).toBeNull()
  })
})
