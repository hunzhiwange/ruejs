import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import HeroPage from '../../../app/pages/design/Hero'
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

describe('Hero actual page', () => {
  it('renders hero demos and restores the centered preview after toggling code', async () => {
    setEnabledPreviews('Centered hero', 'Hero with overlay image')

    const container = mountContainer()
    resetActiveRuntime()
    render(<HeroPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Hero 主视觉区')
      expect(container.querySelectorAll('.component-preview').length).toBeGreaterThan(0)
    })

    const centeredDemo = findDemo(container, '# Centered hero') as HTMLElement | null
    const overlayDemo = findDemo(container, '# Hero with overlay image') as HTMLElement | null
    expect(centeredDemo).not.toBeNull()
    expect(overlayDemo).not.toBeNull()

    await waitForContent(() => {
      expect(centeredDemo!.querySelector('.hero-content')).not.toBeNull()
      expect(overlayDemo!.querySelector('.hero-overlay')).not.toBeNull()
    })

    await click(findTabButton(centeredDemo!, 'JSX代码'))
    const centeredDemoInCode = findDemo(container, '# Centered hero') as HTMLElement | null
    expect(centeredDemoInCode!.querySelector('.hero')).toBeNull()

    await click(findTabButton(centeredDemoInCode!, '预览'))

    await waitForContent(() => {
      const restoredDemo = findDemo(container, '# Centered hero') as HTMLElement | null
      expect(restoredDemo!.querySelector('.hero')).not.toBeNull()
    })
  })
})
