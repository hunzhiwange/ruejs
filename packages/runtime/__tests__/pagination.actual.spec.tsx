import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import PaginationPage from '../../../app/pages/design/Pagination'
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

describe('Pagination actual page', () => {
  it('renders pagination demos and restores preview after tab toggling', async () => {
    const container = mountContainer()
    render(<PaginationPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Pagination 分页')
      expect(container.querySelectorAll('.component-preview').length).toBeGreaterThan(0)
    })

    const basicDemo = findDemo(container, '# Basic pagination') as HTMLElement | null
    const verticalDemo = findDemo(container, '# Vertical pagination') as HTMLElement | null
    const statefulDemo = findDemo(container, '# Current and disabled items') as HTMLElement | null

    expect(basicDemo).not.toBeNull()
    expect(verticalDemo).not.toBeNull()
    expect(statefulDemo).not.toBeNull()

    await waitForContent(() => {
      expect(
        basicDemo?.querySelectorAll('[data-testid="pagination-basic"] .join-item').length,
      ).toBe(5)
      expect(
        verticalDemo?.querySelector('[data-testid="pagination-vertical"].join-vertical'),
      ).not.toBeNull()
      expect(
        statefulDemo?.querySelector('[data-testid="pagination-stateful"] .btn-active'),
      ).not.toBeNull()
      expect(
        statefulDemo?.querySelector('[data-testid="pagination-stateful"] button[disabled]'),
      ).not.toBeNull()
    })

    await click(findTabButton(basicDemo!, 'JSX代码'))
    expect(findDemo(container, '# Basic pagination')?.querySelector('.join')).toBeNull()
    await click(findTabButton(findDemo(container, '# Basic pagination')!, '预览'))

    await waitForContent(() => {
      expect(findDemo(container, '# Basic pagination')?.querySelector('.join')).not.toBeNull()
    })
  })
})
