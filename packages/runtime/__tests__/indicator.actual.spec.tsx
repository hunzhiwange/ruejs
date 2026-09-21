import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import IndicatorPage from '../../../app/pages/design/Indicator'
import { render, click, mountContainer, waitForContent } from './page-test-utils'
import { findDemo, findTabButton, resetActiveRuntime } from './design-page-test-utils'

vi.mock('@rue-js/design', async () => {
  const [badgeModule, indicatorModule, inputModule, statusModule, tabsModule] = await Promise.all([
    import('../../../packages/rue-design/src/components/badge'),
    import('../../../packages/rue-design/src/components/indicator'),
    import('../../../packages/rue-design/src/components/input'),
    import('../../../packages/rue-design/src/components/status'),
    import('../../../packages/rue-design/src/components/tabs'),
  ])

  return {
    Badge: badgeModule.default,
    Indicator: indicatorModule.default,
    Input: inputModule.default,
    Status: statusModule.default,
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

describe('Indicator actual page', () => {
  it('renders indicator demos and restores the card preview after toggling code', async () => {
    setEnabledPreviews(
      'A button as an indicator for a card',
      'In center of an image',
      'Props-driven shorthand',
      'Placement shorthand and offset',
    )

    const container = mountContainer()
    resetActiveRuntime()
    render(<IndicatorPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Indicator 指示器')
      expect(container.querySelectorAll('.component-preview').length).toBe(11)
      expect(container.textContent).toContain('API')
    })

    const cardDemo = findDemo(
      container,
      '# A button as an indicator for a card',
    ) as HTMLElement | null
    const centerDemo = findDemo(container, '# In center of an image') as HTMLElement | null
    const shortcutDemo = findDemo(container, '# Props-driven shorthand') as HTMLElement | null
    const placementDemo = findDemo(
      container,
      '# Placement shorthand and offset',
    ) as HTMLElement | null
    expect(cardDemo).not.toBeNull()
    expect(centerDemo).not.toBeNull()
    expect(shortcutDemo).not.toBeNull()
    expect(placementDemo).not.toBeNull()

    await waitForContent(() => {
      expect(cardDemo!.querySelector('.indicator-item.indicator-bottom')).not.toBeNull()
      expect(centerDemo!.querySelector('.indicator-center.indicator-middle')).not.toBeNull()
      expect(shortcutDemo!.querySelector('.indicator-item .badge')).not.toBeNull()
      expect(placementDemo!.querySelectorAll('.indicator').length).toBe(3)
    })

    await click(findTabButton(cardDemo!, 'JSX代码'))
    const cardDemoInCode = findDemo(
      container,
      '# A button as an indicator for a card',
    ) as HTMLElement | null
    expect(cardDemoInCode!.querySelector('.indicator')).toBeNull()

    await click(findTabButton(cardDemoInCode!, '预览'))

    await waitForContent(() => {
      const restoredDemo = findDemo(
        container,
        '# A button as an indicator for a card',
      ) as HTMLElement | null
      expect(restoredDemo!.querySelector('.indicator')).not.toBeNull()
    })
  })
})
