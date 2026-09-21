import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import MaskPage from '../../../app/pages/design/Mask'
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

describe('Mask actual page', () => {
  it('renders mask demos and restores the core shapes preview after toggling code', async () => {
    const container = mountContainer()
    render(<MaskPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Mask 形状裁切')
      expect(container.querySelectorAll('.component-preview').length).toBeGreaterThan(0)
    })

    const shapesDemo = findDemo(container, '# Core shapes') as HTMLElement | null
    const halfDemo = findDemo(
      container,
      '# Half modifiers and arbitrary host',
    ) as HTMLElement | null

    expect(shapesDemo).not.toBeNull()
    expect(halfDemo).not.toBeNull()

    await waitForContent(() => {
      expect(shapesDemo?.querySelectorAll('[data-testid="mask-shapes-demo"] .mask').length).toBe(9)
      expect(halfDemo?.querySelector('[data-testid="mask-host-demo"]')).not.toBeNull()
    })

    await click(findTabButton(shapesDemo!, 'JSX代码'))
    expect(findDemo(container, '# Core shapes')?.querySelectorAll('.mask').length).toBe(0)
    await click(findTabButton(findDemo(container, '# Core shapes')!, '预览'))

    await waitForContent(() => {
      expect(findDemo(container, '# Core shapes')?.querySelectorAll('.mask').length).toBe(9)
    })
  })
})
