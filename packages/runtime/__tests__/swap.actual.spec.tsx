import { afterEach, describe, expect, it, vi } from 'vitest'
import { setReactiveScheduling } from '../src'
import SwapPage from '../../../app/pages/design/Swap'
import { render, click, mountContainer, waitForContent } from './page-test-utils'
import { findDemo, findTabButton, normalize, resetActiveRuntime } from './design-page-test-utils'

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

describe('Swap actual page', () => {
  it('renders swap demos, rues to checkbox and class mode, and restores preview after toggling code', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<SwapPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Swap 切换容器')
      expect(container.querySelectorAll('.component-preview').length).toBeGreaterThan(0)
    })

    const textDemo = findDemo(container, '# Swap text') as HTMLElement | null
    const classDemo = findDemo(container, '# Activate using class name') as HTMLElement | null
    expect(textDemo).not.toBeNull()
    expect(classDemo).not.toBeNull()

    await waitForContent(() => {
      expect(normalize(textDemo?.textContent)).toContain('Current: OFF')
      expect(normalize(classDemo?.textContent)).toContain('当前状态：inactive')
    })

    const input = textDemo!.querySelector('[data-testid="swap-text-input"]') as HTMLInputElement
    input.checked = true
    input.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      const currentDemo = findDemo(container, '# Swap text') as HTMLElement | null
      expect(normalize(currentDemo?.textContent)).toContain('Current: ON')
    })

    await click(classDemo!.querySelector('[data-testid="swap-class-toggle"]') as HTMLElement)

    await waitForContent(() => {
      const classDemoCurrent = findDemo(
        container,
        '# Activate using class name',
      ) as HTMLElement | null
      expect(normalize(classDemoCurrent?.textContent)).toContain('当前状态：active')
      expect(
        classDemoCurrent!
          .querySelector('[data-testid="swap-class-demo"]')
          ?.classList.contains('swap-active'),
      ).toBe(true)
    })

    const textDemoBeforeCode = findDemo(container, '# Swap text') as HTMLElement | null
    await click(findTabButton(textDemoBeforeCode!, 'JSX代码'))
    const textDemoInCode = findDemo(container, '# Swap text') as HTMLElement | null
    expect(textDemoInCode!.querySelectorAll('.swap').length).toBe(0)

    await click(findTabButton(textDemoInCode!, '预览'))

    await waitForContent(() => {
      const restoredDemo = findDemo(container, '# Swap text') as HTMLElement | null
      expect(restoredDemo!.querySelector('[data-testid="swap-text-input"]')).not.toBeNull()
    })
  })
})
