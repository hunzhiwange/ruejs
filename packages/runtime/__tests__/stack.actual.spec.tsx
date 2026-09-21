import { afterEach, describe, expect, it, vi } from 'vitest'
import { setReactiveScheduling } from '../src'
import StackPage from '../../../app/pages/design/Stack'
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

describe('Stack actual page', () => {
  it('renders stack demos and restores the alignment preview after toggling code', async () => {
    setEnabledPreviews('基础堆叠', '对齐与 Placement')

    const container = mountContainer()
    resetActiveRuntime()
    render(<StackPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Stack 堆叠容器')
      expect(container.querySelectorAll('.component-preview').length).toBeGreaterThan(0)
    })

    const basicDemo = findDemo(container, '# 基础堆叠') as HTMLElement | null
    const alignmentDemo = findDemo(container, '# 对齐与 Placement') as HTMLElement | null
    expect(basicDemo).not.toBeNull()
    expect(alignmentDemo).not.toBeNull()

    await waitForContent(() => {
      expect(basicDemo!.querySelector('[data-testid="stack-basic"]')?.children.length).toBe(3)
      expect(alignmentDemo!.querySelectorAll('.stack').length).toBe(4)
    })

    await click(findTabButton(alignmentDemo!, 'JSX代码'))
    const alignmentDemoInCode = findDemo(container, '# 对齐与 Placement') as HTMLElement | null
    expect(alignmentDemoInCode!.querySelectorAll('.stack').length).toBe(0)

    await click(findTabButton(alignmentDemoInCode!, '预览'))

    await waitForContent(() => {
      const restoredDemo = findDemo(container, '# 对齐与 Placement') as HTMLElement | null
      expect(restoredDemo!.querySelectorAll('.stack').length).toBe(4)
    })
  })
})
