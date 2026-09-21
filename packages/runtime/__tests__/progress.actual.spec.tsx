import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import ProgressPage from '../../../app/pages/design/Progress'
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

describe('Progress actual page', () => {
  it('renders progress demos and restores preview after toggling code', async () => {
    setEnabledPreviews('Progress', 'Progress colors', 'Indeterminate')

    const container = mountContainer()
    resetActiveRuntime()
    render(<ProgressPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Progress 进度条')
      expect(container.querySelectorAll('.component-preview').length).toBeGreaterThan(0)
    })

    const basicDemo = findDemo(container, '# Progress') as HTMLElement | null
    const colorsDemo = findDemo(container, '# Progress colors') as HTMLElement | null
    const indeterminateDemo = findDemo(container, '# Indeterminate') as HTMLElement | null

    expect(basicDemo).not.toBeNull()
    expect(colorsDemo).not.toBeNull()
    expect(indeterminateDemo).not.toBeNull()

    await waitForContent(() => {
      expect(basicDemo!.querySelectorAll('progress.progress').length).toBe(5)
      expect(colorsDemo!.querySelectorAll('progress.progress').length).toBe(8)
      expect(
        indeterminateDemo!.querySelector('[data-testid="progress-indeterminate"]'),
      ).not.toBeNull()
    })

    await click(findTabButton(basicDemo!, 'JSX代码'))
    const basicDemoInCode = findDemo(container, '# Progress') as HTMLElement | null
    expect(basicDemoInCode!.querySelectorAll('progress.progress').length).toBe(0)

    await click(findTabButton(basicDemoInCode!, '预览'))

    await waitForContent(() => {
      const restored = findDemo(container, '# Progress') as HTMLElement | null
      expect(restored!.querySelectorAll('progress.progress').length).toBe(5)
    })
  })

  it('renders Dynamic success indicator without object-object text', async () => {
    setEnabledPreviews('Dynamic')

    const container = mountContainer()
    resetActiveRuntime()
    render(<ProgressPage />, container)

    await waitForContent(() => {
      expect(findDemo(container, '# Dynamic')).not.toBeNull()
    })

    const dynamicDemo = findDemo(container, '# Dynamic') as HTMLElement
    const setFullButton = Array.from(dynamicDemo.querySelectorAll('button')).find(
      button => button.textContent?.trim() === '100%',
    )

    await click(setFullButton ?? null)

    await waitForContent(() => {
      expect(dynamicDemo.textContent).toContain('100%')
      expect(dynamicDemo.textContent).not.toContain('[object Object]')
      expect(dynamicDemo.querySelector('.text-success svg')).toBeTruthy()
    })
  })

  it('keeps Dynamic preview stable across repeated range updates', async () => {
    setEnabledPreviews('Dynamic')

    const container = mountContainer()
    resetActiveRuntime()
    render(<ProgressPage />, container)

    await waitForContent(() => {
      expect(findDemo(container, '# Dynamic')).not.toBeNull()
    })

    const dynamicDemo = findDemo(container, '# Dynamic') as HTMLElement
    const range = dynamicDemo.querySelector('input[type="range"]') as HTMLInputElement | null
    expect(range).not.toBeNull()

    const initialProgressCount = dynamicDemo.querySelectorAll('.rue-progress').length
    const initialRangeCount = dynamicDemo.querySelectorAll('input[type="range"]').length

    for (let index = 0; index < 80; index += 1) {
      range!.value = String((index * 7) % 101)
      range!.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))
    }

    await waitForContent(() => {
      expect(dynamicDemo.textContent).toContain('48%')
      expect(dynamicDemo.textContent).not.toContain('[object Object]')
      expect(dynamicDemo.querySelectorAll('.rue-progress').length).toBe(initialProgressCount)
      expect(dynamicDemo.querySelectorAll('input[type="range"]').length).toBe(initialRangeCount)
    })
  })
})
