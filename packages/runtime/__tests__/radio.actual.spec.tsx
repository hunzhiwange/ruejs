import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import RadioPage from '../../../app/pages/design/Radio'
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

describe('Radio actual page', () => {
  it('renders radio demos, updates same-name selection, and restores preview after code toggle', async () => {
    setEnabledPreviews('基础用法', '尺寸')

    const container = mountContainer()
    resetActiveRuntime()
    render(<RadioPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Radio 单选框')
      expect(container.querySelectorAll('.component-preview').length).toBeGreaterThan(0)
    })

    const basicDemo = findDemo(container, '# 基础用法') as HTMLElement | null
    const sizesDemo = findDemo(container, '# 尺寸') as HTMLElement | null

    expect(basicDemo).not.toBeNull()
    expect(sizesDemo).not.toBeNull()

    const business = basicDemo!.querySelector('input[value="business"]') as HTMLInputElement
    business.checked = true
    business.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      const updatedBasicDemo = findDemo(container, '# 基础用法') as HTMLElement | null
      expect(updatedBasicDemo!.textContent).toContain('当前选择：business')
      expect(sizesDemo!.querySelectorAll('input.radio').length).toBe(5)
    })

    await click(findTabButton(sizesDemo!, 'JSX代码'))
    const sizesDemoInCode = findDemo(container, '# 尺寸') as HTMLElement | null
    expect(sizesDemoInCode!.querySelectorAll('input.radio').length).toBe(0)

    await click(findTabButton(sizesDemoInCode!, '预览'))

    await waitForContent(() => {
      const restored = findDemo(container, '# 尺寸') as HTMLElement | null
      expect(restored!.querySelectorAll('input.radio').length).toBe(5)
    })
  })
})
