import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import TooltipPage from '../../../app/pages/design/Tooltip'
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

describe('Tooltip actual page', () => {
  it('renders tooltip demos and restores the force-open preview after toggling code', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<TooltipPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Tooltip 提示框')
      expect(container.querySelectorAll('.component-preview').length).toBe(6)
    })

    const basicDemo = findDemo(container, '# Tooltip') as HTMLElement | null
    const placementsDemo = findDemo(container, '# Tooltip placements') as HTMLElement | null
    const openDemo = findDemo(container, '# Force open') as HTMLElement | null
    expect(basicDemo).not.toBeNull()
    expect(placementsDemo).not.toBeNull()
    expect(openDemo).not.toBeNull()

    await waitForContent(() => {
      expect(
        (basicDemo!.querySelector('[data-testid="tooltip-basic"]') as HTMLElement).getAttribute(
          'data-tip',
        ),
      ).toBe('用于解释按钮含义')
      expect(placementsDemo!.querySelectorAll('.tooltip').length).toBe(4)
      expect(openDemo!.querySelector('.tooltip-open')).not.toBeNull()
    })

    await click(findTabButton(openDemo!, 'JSX代码'))
    const openDemoInCode = findDemo(container, '# Force open') as HTMLElement | null
    expect(openDemoInCode!.querySelectorAll('.tooltip').length).toBe(0)

    await click(findTabButton(openDemoInCode!, '预览'))

    await waitForContent(() => {
      const restoredOpenDemo = findDemo(container, '# Force open') as HTMLElement | null
      expect(restoredOpenDemo!.querySelector('.tooltip-open')).not.toBeNull()
    })
  })
})
