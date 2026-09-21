import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import RangePage from '../../../app/pages/design/Range'
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

describe('Range actual page', () => {
  it('renders range demos, updates the linked value, and restores preview after code toggle', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<RangePage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Range Slider 范围选择')
      expect(container.querySelectorAll('.component-preview').length).toBeGreaterThan(0)
    })

    const basicDemo = findDemo(container, '# Range') as HTMLElement | null
    const sizesDemo = findDemo(container, '# Sizes') as HTMLElement | null

    expect(basicDemo).not.toBeNull()
    expect(sizesDemo).not.toBeNull()

    const input = basicDemo!.querySelector('[data-testid="range-basic"]') as HTMLInputElement
    input.value = '65'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      const updatedBasicDemo = findDemo(container, '# Range') as HTMLElement | null
      expect(updatedBasicDemo!.textContent).toContain('当前值：65')
      expect(sizesDemo!.querySelectorAll('input.range').length).toBe(8)
    })

    await click(findTabButton(sizesDemo!, 'JSX代码'))
    const sizesDemoInCode = findDemo(container, '# Sizes') as HTMLElement | null
    expect(sizesDemoInCode!.querySelectorAll('input.range').length).toBe(0)

    await click(findTabButton(sizesDemoInCode!, '预览'))

    await waitForContent(() => {
      const restored = findDemo(container, '# Sizes') as HTMLElement | null
      expect(restored!.querySelectorAll('input.range').length).toBe(8)
    })
  })
})
