import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import ListPage from '../../../app/pages/design/List'
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

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

const normalize = (value: string | null | undefined) => value?.replace(/\s+/g, ' ').trim() ?? ''

const findDemo = (root: ParentNode, title: string) =>
  Array.from(root.querySelectorAll('.component-preview')).find(
    node => normalize(node.querySelector('h2')?.textContent) === title,
  ) ?? null

const findTabButton = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button[role="tab"]')).find(
    button => button.textContent?.trim() === label,
  ) ?? null

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('List actual page', () => {
  it('renders every item from the manual array demo on the preview tab', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<ListPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('List 列表')
    })

    const demo = findDemo(container, '# List 通过数据渲染（数组）') as HTMLElement | null
    expect(demo).not.toBeNull()

    await click(findTabButton(demo!, '预览'))

    await waitForContent(() => {
      const list = demo!.querySelector('ul.list')
      const rowTexts = Array.from(demo!.querySelectorAll('ul.list > li')).map(row =>
        normalize(row.textContent),
      )
      expect(list).not.toBeNull()
      expect(rowTexts).toHaveLength(4)
      expect(rowTexts[0]).toContain('Most played songs this week')
      expect(rowTexts[1]).toContain('Dio Lupa')
      expect(rowTexts[2]).toContain('Ellie Beilish')
      expect(rowTexts[3]).toContain('Sabrino Gardener')
    })
  })
})
