import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import MockupBrowserPage from '../../../app/pages/design/MockupBrowser'
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

describe('MockupBrowser actual page', () => {
  it('renders browser mockup demos and restores the first preview after toggling code', async () => {
    setEnabledPreviews('browser mockup with border', '推荐用法')

    const container = mountContainer()
    render(<MockupBrowserPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Mockup Browser 浏览器外框')
      expect(container.querySelectorAll('.component-preview').length).toBe(7)
    })

    const borderDemo = findDemo(container, '# browser mockup with border') as HTMLElement | null

    expect(borderDemo).not.toBeNull()

    await waitForContent(() => {
      expect(container.querySelectorAll('.mockup-browser-toolbar').length).toBeGreaterThanOrEqual(2)
      expect(borderDemo?.querySelector('[data-testid="mockup-browser-border"]')).not.toBeNull()
      expect(findDemo(container, '# 推荐用法')?.querySelectorAll('.mockup-browser').length).toBe(1)
    })

    await click(findTabButton(borderDemo!, 'JSX代码'))
    expect(
      findDemo(container, '# browser mockup with border')?.querySelectorAll('.mockup-browser')
        .length,
    ).toBe(0)
    await click(findTabButton(findDemo(container, '# browser mockup with border')!, '预览'))
    expect(
      findDemo(container, '# browser mockup with border')?.querySelectorAll('.mockup-browser')
        .length,
    ).toBe(1)
  })
})
