import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import RadialProgressPage from '../../../app/pages/design/RadialProgress'
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

describe('RadialProgress actual page', () => {
  it('renders radial progress demos and restores preview after toggling code', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<RadialProgressPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Radial Progress 环形进度')
      expect(container.querySelectorAll('.component-preview').length).toBe(7)
    })

    const basicDemo = findDemo(container, '# Radial progress') as HTMLElement | null
    const valuesDemo = findDemo(container, '# Different values') as HTMLElement | null
    const statusDemo = findDemo(container, '# Status and formatting') as HTMLElement | null
    const dashboardDemo = findDemo(
      container,
      '# Dashboard and custom content',
    ) as HTMLElement | null
    const stepsDemo = findDemo(container, '# Steps and split success') as HTMLElement | null
    const sizeDemo = findDemo(container, '# Custom size and thickness') as HTMLElement | null

    expect(basicDemo).not.toBeNull()
    expect(valuesDemo).not.toBeNull()
    expect(statusDemo).not.toBeNull()
    expect(dashboardDemo).not.toBeNull()
    expect(stepsDemo).not.toBeNull()
    expect(sizeDemo).not.toBeNull()

    await waitForContent(() => {
      const basic = basicDemo!.querySelector('[data-testid="radial-basic"]') as HTMLElement
      const format = statusDemo!.querySelector('[data-testid="radial-format"]') as HTMLElement
      const dashboard = dashboardDemo!.querySelector(
        '[data-testid="radial-dashboard"]',
      ) as HTMLElement
      const steps = stepsDemo!.querySelector('[data-testid="radial-steps"]') as HTMLElement
      const thin = sizeDemo!.querySelector('[data-testid="radial-thin"]') as HTMLElement

      expect(basic.getAttribute('aria-valuenow')).toBe('70')
      expect(valuesDemo!.querySelectorAll('.radial-progress').length).toBe(5)
      expect(format.textContent).toContain('部署中 72%')
      expect(dashboard.getAttribute('data-progress-type')).toBe('dashboard')
      expect(steps.querySelectorAll('svg path').length).toBe(9)
      expect(thin.style.getPropertyValue('--size')).toBe('12rem')
      expect(thin.style.getPropertyValue('--thickness')).toBe('2px')
    })

    await click(findTabButton(sizeDemo!, 'JSX代码'))
    const sizeDemoInCode = findDemo(container, '# Custom size and thickness') as HTMLElement | null
    expect(sizeDemoInCode!.querySelectorAll('.radial-progress').length).toBe(0)

    await click(findTabButton(sizeDemoInCode!, '预览'))

    await waitForContent(() => {
      const restored = findDemo(container, '# Custom size and thickness') as HTMLElement | null
      expect(restored!.querySelectorAll('.radial-progress').length).toBe(2)
    })
  })
})
