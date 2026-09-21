import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import LayoutPage from '../../../app/pages/design/Layout'
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

const setEnabledPreviews = (...titles: string[]) => {
  ;(
    globalThis as { __RUE_TEST_ENABLED_DESIGN_PREVIEWS__?: Set<string> }
  ).__RUE_TEST_ENABLED_DESIGN_PREVIEWS__ = new Set(titles)
}

afterEach(() => {
  delete (globalThis as { __RUE_TEST_ENABLED_DESIGN_PREVIEWS__?: Set<string> })
    .__RUE_TEST_ENABLED_DESIGN_PREVIEWS__
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('Layout actual page', () => {
  it('renders layout demos and preserves preview after toggling code', async () => {
    setEnabledPreviews(
      'Basic structure',
      'Collapsible sider',
      'Responsive zero-width sider',
      'Nested workbench',
    )

    const container = mountContainer()
    resetActiveRuntime()
    render(<LayoutPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Layout 布局')
      expect(container.querySelectorAll('.component-preview').length).toBe(6)
    })

    const basicDemo = findDemo(container, '# Basic structure') as HTMLElement | null
    const collapseDemo = findDemo(container, '# Collapsible sider') as HTMLElement | null
    const responsiveDemo = findDemo(
      container,
      '# Responsive zero-width sider',
    ) as HTMLElement | null
    const nestedDemo = findDemo(container, '# Nested workbench') as HTMLElement | null

    expect(basicDemo).not.toBeNull()
    expect(collapseDemo).not.toBeNull()
    expect(responsiveDemo).not.toBeNull()
    expect(nestedDemo).not.toBeNull()

    await waitForContent(() => {
      const basicRoot = basicDemo!.querySelector('[data-testid="layout-basic-root"]') as HTMLElement
      const collapsibleSider = collapseDemo!.querySelector(
        '[data-testid="layout-collapsible-sider"]',
      ) as HTMLElement
      const collapsibleFooter = collapseDemo!.querySelector(
        '.rue-layout-sider-footer',
      ) as HTMLElement
      const collapseStatus = collapseDemo!.querySelector(
        '[data-testid="layout-collapse-status"]',
      ) as HTMLElement
      const responsiveSider = responsiveDemo!.querySelector(
        '[data-testid="layout-responsive-sider"]',
      ) as HTMLElement
      const nestedRail = nestedDemo!.querySelector(
        '[data-testid="layout-nested-rail"]',
      ) as HTMLElement

      expect(basicRoot.getAttribute('data-rue-layout-has-sider')).toBe('false')
      expect(collapsibleSider.getAttribute('data-collapsed')).toBe('true')
      expect(collapsibleFooter.getAttribute('aria-hidden')).toBe('true')
      expect(collapsibleFooter.style.display).toBe('none')
      expect(collapseStatus.textContent).toContain('ready')
      expect(responsiveSider.getAttribute('data-zero-width')).toBe('false')
      expect(nestedRail.getAttribute('data-rue-layout-sider')).toBe('true')
    })

    const collapseTrigger = collapseDemo!.querySelector(
      '[data-rue-layout-sider-trigger="default"]',
    ) as HTMLElement | null
    await click(collapseTrigger)

    await waitForContent(() => {
      const collapsibleSider = collapseDemo!.querySelector(
        '[data-testid="layout-collapsible-sider"]',
      ) as HTMLElement
      const collapsibleFooter = collapseDemo!.querySelector(
        '.rue-layout-sider-footer',
      ) as HTMLElement
      const collapseStatus = collapseDemo!.querySelector(
        '[data-testid="layout-collapse-status"]',
      ) as HTMLElement

      expect(collapsibleSider.getAttribute('data-collapsed')).toBe('false')
      expect(collapsibleFooter.getAttribute('aria-hidden')).toBe('false')
      expect(collapsibleFooter.style.display).toBe('')
      expect(collapsibleFooter.textContent).toContain('Auto save every 24s')
      expect(collapseStatus.textContent).toContain('expanded')
    })

    await click(findTabButton(responsiveDemo!, 'JSX代码'))
    const responsiveDemoInCode = findDemo(
      container,
      '# Responsive zero-width sider',
    ) as HTMLElement | null
    expect(responsiveDemoInCode!.querySelectorAll('[data-rue-layout-sider="true"]').length).toBe(0)

    await click(findTabButton(responsiveDemoInCode!, '预览'))

    await waitForContent(() => {
      const restored = findDemo(container, '# Responsive zero-width sider') as HTMLElement | null
      expect(restored!.querySelectorAll('[data-rue-layout-sider="true"]').length).toBe(1)
    })
  })
})
