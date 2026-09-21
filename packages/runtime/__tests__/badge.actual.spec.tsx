import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import BadgePage from '../../../app/pages/design/Badge'
import { render, click, mountContainer, waitForContent } from './page-test-utils'

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

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

const normalize = (value: string | null | undefined) => value?.replace(/\s+/g, ' ').trim() ?? ''

const findTabButton = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button[role="tab"]')).find(
    button => button.textContent?.trim() === label,
  ) ?? null

const findDemo = (root: ParentNode, title: string) =>
  Array.from(root.querySelectorAll('.component-preview')).find(
    node => normalize(node.querySelector('h2')?.textContent) === title,
  ) ?? null

afterEach(() => {
  delete (globalThis as { __RUE_TEST_ENABLED_DESIGN_PREVIEWS__?: Set<string> })
    .__RUE_TEST_ENABLED_DESIGN_PREVIEWS__
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('Badge actual page', () => {
  it('renders badge demos in preview mode and restores the basic demo after toggling code', async () => {
    setEnabledPreviews('Badge', 'Badge sizes')

    const container = mountContainer()
    resetActiveRuntime()
    render(<BadgePage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Badge 徽标')
      expect(container.querySelector('.component-preview')).not.toBeNull()
    })

    const basicDemo = findDemo(container, '# Badge') as HTMLElement | null
    const sizesDemo = findDemo(container, '# Badge sizes') as HTMLElement | null
    expect(basicDemo).not.toBeNull()
    expect(sizesDemo).not.toBeNull()

    await waitForContent(() => {
      const sizeBadges = Array.from(sizesDemo!.querySelectorAll('.card .badge')).map(node =>
        normalize(node.textContent),
      )
      expect(normalize(basicDemo?.textContent)).toContain('Badge')
      expect(sizeBadges).toEqual(['Xsmall', 'Small', 'Medium', 'Large', 'Xlarge'])
      expect(findTabButton(basicDemo!, '预览')?.classList.contains('tab-active')).toBe(true)
    })

    await click(findTabButton(basicDemo!, 'JSX代码'))

    expect(findDemo(container, '# Badge')?.querySelectorAll('.card .badge').length).toBe(0)

    await click(findTabButton(findDemo(container, '# Badge')!, '预览'))

    await waitForContent(() => {
      expect(normalize(findDemo(container, '# Badge')?.textContent)).toContain('Badge')
    })
  })
})
