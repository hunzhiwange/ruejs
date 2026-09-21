import { afterEach, describe, expect, it, vi } from 'vitest'
import { setReactiveScheduling } from '../src'
import StepsPage from '../../../app/pages/design/Steps'
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

describe('Steps actual page', () => {
  it('renders steps demos and restores the horizontal preview after toggling code', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<StepsPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Steps 步骤条')
      expect(container.querySelectorAll('.component-preview').length).toBeGreaterThan(0)
    })

    const horizontalDemo = findDemo(container, '# Horizontal') as HTMLElement | null
    const iconDemo = findDemo(container, '# With custom content in step-icon') as HTMLElement | null
    expect(horizontalDemo).not.toBeNull()
    expect(iconDemo).not.toBeNull()

    await waitForContent(() => {
      expect(horizontalDemo!.querySelectorAll('.step').length).toBe(4)
      expect(iconDemo!.querySelectorAll('.step-icon').length).toBe(3)
    })

    await click(findTabButton(horizontalDemo!, 'JSX代码'))
    const horizontalDemoInCode = findDemo(container, '# Horizontal') as HTMLElement | null
    expect(horizontalDemoInCode!.querySelectorAll('.steps').length).toBe(0)

    await click(findTabButton(horizontalDemoInCode!, '预览'))

    await waitForContent(() => {
      const restoredDemo = findDemo(container, '# Horizontal') as HTMLElement | null
      expect(restoredDemo!.querySelectorAll('.step').length).toBe(4)
    })
  })
})
