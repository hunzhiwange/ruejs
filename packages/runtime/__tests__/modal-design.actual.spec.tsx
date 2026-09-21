import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import ModalPage from '../../../app/pages/design/Modal'
import { render, click, mountContainer, waitForContent } from './page-test-utils'
import { findDemo, findTabButton, resetActiveRuntime } from './design-page-test-utils'

vi.mock('@rue-js/design', async () => {
  const [buttonModule, modalModule, tabsModule] = await Promise.all([
    import('../../../packages/rue-design/src/components/button'),
    import('../../../packages/rue-design/src/components/modal'),
    import('../../../packages/rue-design/src/components/tabs'),
  ])

  return {
    Button: buttonModule.default,
    Modal: modalModule.default,
    Tabs: tabsModule.default,
  }
})

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

describe('Modal design actual page', () => {
  it('renders the selected modal demos and restores the controlled preview after toggling code', async () => {
    setEnabledPreviews(
      'Controlled modal',
      'Modal with custom actions',
      'Default footer with async confirm',
    )

    const container = mountContainer()
    resetActiveRuntime()
    render(<ModalPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Modal 模态框')
      expect(container.querySelectorAll('.component-preview').length).toBeGreaterThan(0)
      expect(container.textContent).toContain('API')
    })

    const basicDemo = findDemo(container, '# Controlled modal') as HTMLElement | null
    const actionsDemo = findDemo(container, '# Modal with custom actions') as HTMLElement | null
    const asyncDemo = findDemo(
      container,
      '# Default footer with async confirm',
    ) as HTMLElement | null
    expect(basicDemo).not.toBeNull()
    expect(actionsDemo).not.toBeNull()
    expect(asyncDemo).not.toBeNull()

    await waitForContent(() => {
      expect(basicDemo!.querySelector('[data-testid="modal-basic-open"]')).not.toBeNull()
      expect(actionsDemo!.querySelector('[data-testid="modal-actions-open"]')).not.toBeNull()
      expect(asyncDemo!.querySelector('[data-testid="modal-async-open"]')).not.toBeNull()
      expect(actionsDemo!.textContent).toContain('Review actions')
      expect(asyncDemo!.textContent).toContain('Launch publish flow')
    })

    await click(findTabButton(basicDemo!, 'JSX代码'))
    const basicDemoInCode = findDemo(container, '# Controlled modal') as HTMLElement | null
    expect(basicDemoInCode!.querySelector('.modal')).toBeNull()

    await click(findTabButton(basicDemoInCode!, '预览'))

    await waitForContent(() => {
      const restoredDemo = findDemo(container, '# Controlled modal') as HTMLElement | null
      expect(restoredDemo!.querySelector('[data-testid="modal-basic-open"]')).not.toBeNull()
    })
  })
})
