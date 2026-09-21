import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import ThemeControllerPage from '../../../app/pages/design/ThemeController'
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

describe('ThemeController actual page', () => {
  it('renders theme controller demos, updates the toggle label, and restores the checkbox preview after toggling code', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<ThemeControllerPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Theme 主题系统')
      expect(container.querySelectorAll('.component-preview').length).toBeGreaterThan(0)
    })

    const toggleDemo = findDemo(
      container,
      '# Theme Controller using a toggle',
    ) as HTMLElement | null
    const checkboxDemo = findDemo(
      container,
      '# Theme Controller using a checkbox',
    ) as HTMLElement | null
    const swapDemo = findDemo(container, '# Theme Controller using a swap') as HTMLElement | null
    const radioDemo = findDemo(
      container,
      '# Theme Controller using radio inputs',
    ) as HTMLElement | null
    const buttonsDemo = findDemo(
      container,
      '# Theme Controller using button group',
    ) as HTMLElement | null
    expect(toggleDemo).not.toBeNull()
    expect(checkboxDemo).not.toBeNull()
    expect(swapDemo).not.toBeNull()
    expect(radioDemo).not.toBeNull()
    expect(buttonsDemo).not.toBeNull()

    await waitForContent(() => {
      expect(toggleDemo!.textContent).toContain('当前 controller 值：未激活')
      expect(radioDemo!.querySelectorAll('input.theme-controller').length).toBe(3)
    })

    const retroRadioInput = radioDemo!.querySelector(
      '[data-testid="theme-radio-retro"]',
    ) as HTMLInputElement
    retroRadioInput.checked = true
    retroRadioInput.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      const updatedRadioDemo = findDemo(
        container,
        '# Theme Controller using radio inputs',
      ) as HTMLElement | null
      const radioScope = updatedRadioDemo!.querySelector(
        '[data-testid="theme-radio-scope"]',
      ) as HTMLElement
      const updatedRetroRadioInput = updatedRadioDemo!.querySelector(
        '[data-testid="theme-radio-retro"]',
      ) as HTMLInputElement

      expect(updatedRadioDemo!.textContent).toContain('当前 controller 值：retro')
      expect(radioScope.getAttribute('data-rue-theme')).toBe('retro')
      expect(radioScope.getAttribute('data-theme')).toBe('retro')
      expect(updatedRetroRadioInput.checked).toBe(true)
    })

    const toggleInput = toggleDemo!.querySelector(
      '[data-testid="theme-toggle"]',
    ) as HTMLInputElement
    toggleInput.checked = true
    toggleInput.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      const updatedToggleDemo = findDemo(
        container,
        '# Theme Controller using a toggle',
      ) as HTMLElement | null
      const toggleScope = updatedToggleDemo!.querySelector(
        '[data-testid="theme-toggle-scope"]',
      ) as HTMLElement

      expect(updatedToggleDemo!.textContent).toContain('当前 controller 值：synthwave')
      expect(toggleScope.getAttribute('data-rue-theme')).toBe('synthwave')
      expect(toggleScope.getAttribute('data-theme')).toBe('synthwave')
    })

    await click(findTabButton(checkboxDemo!, 'JSX代码'))
    const checkboxDemoInCode = findDemo(
      container,
      '# Theme Controller using a checkbox',
    ) as HTMLElement | null
    expect(checkboxDemoInCode!.querySelectorAll('input.theme-controller').length).toBe(0)

    await click(findTabButton(checkboxDemoInCode!, '预览'))

    await waitForContent(() => {
      const restoredCheckboxDemo = findDemo(
        container,
        '# Theme Controller using a checkbox',
      ) as HTMLElement | null
      expect(restoredCheckboxDemo!.querySelectorAll('input.theme-controller').length).toBe(1)
    })

    const restoredCheckboxDemo = findDemo(
      container,
      '# Theme Controller using a checkbox',
    ) as HTMLElement | null
    const checkboxInput = restoredCheckboxDemo!.querySelector(
      '[data-testid="theme-checkbox"]',
    ) as HTMLInputElement
    checkboxInput.checked = true
    checkboxInput.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      const updatedCheckboxDemo = findDemo(
        container,
        '# Theme Controller using a checkbox',
      ) as HTMLElement | null
      const checkboxScope = updatedCheckboxDemo!.querySelector(
        '[data-testid="theme-checkbox-scope"]',
      ) as HTMLElement

      expect(updatedCheckboxDemo!.textContent).toContain('当前 controller 值：synthwave')
      expect(checkboxScope.getAttribute('data-rue-theme')).toBe('synthwave')
      expect(checkboxScope.getAttribute('data-theme')).toBe('synthwave')
    })

    const swapInput = swapDemo!.querySelector('[data-testid="theme-swap"]') as HTMLInputElement
    swapInput.checked = true
    swapInput.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      const updatedSwapDemo = findDemo(
        container,
        '# Theme Controller using a swap',
      ) as HTMLElement | null
      const swapScope = updatedSwapDemo!.querySelector(
        '[data-testid="theme-swap-scope"]',
      ) as HTMLElement

      expect(updatedSwapDemo!.textContent).toContain('当前 controller 值：synthwave')
      expect(swapScope.getAttribute('data-rue-theme')).toBe('synthwave')
      expect(swapScope.getAttribute('data-theme')).toBe('synthwave')
    })

    const nightButtonInput = buttonsDemo!.querySelector(
      '[data-testid="theme-button-night"]',
    ) as HTMLInputElement
    nightButtonInput.checked = true
    nightButtonInput.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      const updatedButtonsDemo = findDemo(
        container,
        '# Theme Controller using button group',
      ) as HTMLElement | null
      const buttonsScope = updatedButtonsDemo!.querySelector(
        '[data-testid="theme-buttons-scope"]',
      ) as HTMLElement

      expect(updatedButtonsDemo!.textContent).toContain('当前 controller 值：night')
      expect(buttonsScope.getAttribute('data-rue-theme')).toBe('night')
      expect(buttonsScope.getAttribute('data-theme')).toBe('night')
    })
  })
})
