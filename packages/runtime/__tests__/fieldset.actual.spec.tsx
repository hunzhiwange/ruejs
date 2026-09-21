import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import FieldsetPage from '../../../app/pages/design/Fieldset'
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

describe('Fieldset actual page', () => {
  it('renders fieldset demos and restores the multiple inputs preview after toggling code', async () => {
    const container = mountContainer()
    const multiDemoTitle = '# Fieldset with multiple inputs'
    const loginDemoTitle = '# Login form with fieldset'

    resetActiveRuntime()
    render(<FieldsetPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Fieldset 字段集')
      expect(container.querySelectorAll('.component-preview').length).toBeGreaterThan(0)
    })

    await waitForContent(() => {
      const currentMultiDemo = findDemo(container, multiDemoTitle) as HTMLElement | null
      const currentLoginDemo = findDemo(container, loginDemoTitle) as HTMLElement | null
      expect(currentMultiDemo).not.toBeNull()
      expect(currentLoginDemo).not.toBeNull()
      expect(currentMultiDemo!.querySelectorAll('input.input').length).toBe(3)
      expect(currentLoginDemo!.querySelector('button')).not.toBeNull()
    })

    const multiDemo = findDemo(container, multiDemoTitle) as HTMLElement | null
    expect(multiDemo).not.toBeNull()

    await click(findTabButton(multiDemo!, 'JSX代码'))
    const multiDemoInCode = findDemo(container, multiDemoTitle) as HTMLElement | null
    expect(multiDemoInCode!.querySelectorAll('input.input').length).toBe(0)

    await click(findTabButton(multiDemoInCode!, '预览'))

    await waitForContent(() => {
      const restoredDemo = findDemo(container, multiDemoTitle) as HTMLElement | null
      expect(restoredDemo!.querySelectorAll('input.input').length).toBe(3)
    })
  })
})
