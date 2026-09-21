import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import ToastPage from '../../../app/pages/design/Toast'
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

describe('Toast actual page', () => {
  it('renders toast demos and restores the placements preview after toggling code', async () => {
    setEnabledPreviews('Toast placements', 'Stacked toasts', 'Inset and layer control')

    const container = mountContainer()
    resetActiveRuntime()
    render(<ToastPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Toast 轻提示')
      expect(container.querySelectorAll('.component-preview').length).toBeGreaterThan(0)
    })

    const placementsDemo = findDemo(container, '# Toast placements') as HTMLElement | null
    const stackedDemo = findDemo(container, '# Stacked toasts') as HTMLElement | null
    const insetDemo = findDemo(container, '# Inset and layer control') as HTMLElement | null
    expect(placementsDemo).not.toBeNull()
    expect(stackedDemo).not.toBeNull()
    expect(insetDemo).not.toBeNull()

    await waitForContent(() => {
      const currentPlacementsDemo = findDemo(container, '# Toast placements') as HTMLElement | null
      const currentStackedDemo = findDemo(container, '# Stacked toasts') as HTMLElement | null
      const currentInsetDemo = findDemo(
        container,
        '# Inset and layer control',
      ) as HTMLElement | null

      expect(currentPlacementsDemo!.querySelectorAll('.toast').length).toBe(9)
      expect(currentStackedDemo!.querySelectorAll('.toast').length).toBe(2)
      expect(currentStackedDemo!.querySelectorAll('.alert').length).toBe(4)
      expect(currentInsetDemo!.querySelectorAll('.toast').length).toBe(1)
      expect(currentInsetDemo!.querySelectorAll('.alert').length).toBe(2)
    })

    await click(findTabButton(placementsDemo!, 'JSX代码'))
    const placementsDemoInCode = findDemo(container, '# Toast placements') as HTMLElement | null
    expect(placementsDemoInCode!.querySelectorAll('.toast').length).toBe(0)

    await click(findTabButton(placementsDemoInCode!, '预览'))

    await waitForContent(() => {
      const restoredPlacementsDemo = findDemo(container, '# Toast placements') as HTMLElement | null
      expect(restoredPlacementsDemo!.querySelectorAll('.toast').length).toBe(9)
    })
  })
})
