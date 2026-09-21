import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import MockupWindowPage from '../../../app/pages/design/MockupWindow'
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
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('MockupWindow actual page', () => {
  it('renders window mockup demos and restores preview after tab toggling', async () => {
    const container = mountContainer()
    render(<MockupWindowPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Mockup Window 窗口外框')
      expect(container.querySelectorAll('.component-preview').length).toBeGreaterThan(0)
    })

    const borderDemo = findDemo(container, '# window mockup with border') as HTMLElement | null
    const backgroundDemo = findDemo(
      container,
      '# window mockup with background color',
    ) as HTMLElement | null

    expect(borderDemo).not.toBeNull()
    expect(backgroundDemo).not.toBeNull()

    await waitForContent(() => {
      expect(borderDemo?.querySelector('[data-testid="mockup-window-border"]')).not.toBeNull()
      expect(
        backgroundDemo?.querySelector('[data-testid="mockup-window-background"]'),
      ).not.toBeNull()
    })

    await click(findTabButton(borderDemo!, 'JSX代码'))
    expect(
      findDemo(container, '# window mockup with border')?.querySelector('.mockup-window'),
    ).toBeNull()
    await click(findTabButton(findDemo(container, '# window mockup with border')!, '预览'))

    await waitForContent(() => {
      expect(
        findDemo(container, '# window mockup with border')?.querySelector('.mockup-window'),
      ).not.toBeNull()
    })
  })
})
