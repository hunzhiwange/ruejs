import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import TogglePage from '../../../app/pages/design/Toggle'
import { render, click, mountContainer, waitForContent } from './page-test-utils'
import { findDemo, findTabButton, resetActiveRuntime } from './design-page-test-utils'

vi.mock('../../../app/pages/site/SidebarPlaygroundDesign', () => ({
  default: (props: { children?: unknown }) => (
    <div data-testid="mock-sidebar-design">{props.children}</div>
  ),
}))

vi.mock('../../../app/pages/site/components/Code', () => ({
  default: () => null,
}))

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('Toggle actual page', () => {
  it('renders toggle demos, updates the basic status, and restores the colors preview after toggling code', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<TogglePage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Toggle 开关')
      expect(container.querySelectorAll('.component-preview').length).toBeGreaterThan(0)
    })

    const basicDemo = findDemo(container, '# 基础受控') as HTMLElement | null
    const colorsDemo = findDemo(container, '# Toggle colors') as HTMLElement | null
    expect(basicDemo).not.toBeNull()
    expect(colorsDemo).not.toBeNull()

    await waitForContent(() => {
      expect(basicDemo!.textContent).toContain('当前状态：已启用')
      expect(colorsDemo!.querySelectorAll('input.toggle').length).toBe(8)
    })

    const toggleInput = basicDemo!.querySelector('[data-testid="toggle-basic"]') as HTMLInputElement
    toggleInput.checked = false
    toggleInput.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      const updatedBasicDemo = findDemo(container, '# 基础受控') as HTMLElement | null
      expect(updatedBasicDemo!.textContent).toContain('当前状态：已关闭')
    })

    await click(findTabButton(colorsDemo!, 'JSX代码'))
    const colorsDemoInCode = findDemo(container, '# Toggle colors') as HTMLElement | null
    expect(colorsDemoInCode!.querySelectorAll('input.toggle').length).toBe(0)

    await click(findTabButton(colorsDemoInCode!, '预览'))

    await waitForContent(() => {
      const restoredColorsDemo = findDemo(container, '# Toggle colors') as HTMLElement | null
      expect(restoredColorsDemo!.querySelectorAll('input.toggle').length).toBe(8)
    })
  })
})
