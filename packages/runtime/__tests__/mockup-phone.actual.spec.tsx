import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import MockupPhonePage from '../../../app/pages/design/MockupPhone'
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

describe('MockupPhone actual page', () => {
  it('renders phone mockup demos and restores preview after tab toggling', async () => {
    setEnabledPreviews('iPhone mockup', 'With color and wallpaper')

    const container = mountContainer()
    render(<MockupPhonePage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Mockup Phone 手机外框')
      expect(container.querySelectorAll('.component-preview').length).toBeGreaterThan(0)
    })

    const basicDemo = findDemo(container, '# iPhone mockup') as HTMLElement | null
    const wallpaperDemo = findDemo(container, '# With color and wallpaper') as HTMLElement | null

    expect(basicDemo).not.toBeNull()
    expect(wallpaperDemo).not.toBeNull()

    await waitForContent(() => {
      expect(
        basicDemo?.querySelector('[data-testid="mockup-phone-basic"] .mockup-phone-camera'),
      ).not.toBeNull()
      expect(
        basicDemo?.querySelector('[data-testid="mockup-phone-basic"] .mockup-phone-display'),
      ).not.toBeNull()
      expect(
        wallpaperDemo?.querySelector('[data-testid="mockup-phone-wallpaper"] img[alt="wallpaper"]'),
      ).not.toBeNull()
    })

    await click(findTabButton(basicDemo!, 'JSX代码'))
    expect(findDemo(container, '# iPhone mockup')?.querySelector('.mockup-phone')).toBeNull()
    await click(findTabButton(findDemo(container, '# iPhone mockup')!, '预览'))

    expect(findDemo(container, '# iPhone mockup')?.querySelector('.mockup-phone')).not.toBeNull()
  })
})
