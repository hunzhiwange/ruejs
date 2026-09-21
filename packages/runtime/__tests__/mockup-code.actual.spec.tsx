import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import MockupCodePage from '../../../app/pages/design/MockupCode'
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

describe('MockupCode actual page', () => {
  it('renders code mockup demos and restores preview after tab toggling', async () => {
    const container = mountContainer()
    render(<MockupCodePage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Mockup Code 代码外框')
      expect(container.querySelectorAll('.component-preview').length).toBe(9)
    })

    const itemsDemo = findDemo(container, '# 推荐：items 数据驱动') as HTMLElement | null
    const lineDemo = findDemo(container, '# 组合子项') as HTMLElement | null
    const numbersDemo = findDemo(container, '# 自动行号') as HTMLElement | null

    expect(itemsDemo).not.toBeNull()
    expect(lineDemo).not.toBeNull()
    expect(numbersDemo).not.toBeNull()

    await waitForContent(() => {
      const itemLines = itemsDemo?.querySelectorAll('[data-testid="mockup-code-items"] pre') ?? []
      const lineRows =
        lineDemo?.querySelectorAll('[data-testid="mockup-code-line-component"] pre') ?? []
      const numberedRows =
        numbersDemo?.querySelectorAll('[data-testid="mockup-code-line-numbers"] pre') ?? []

      expect(itemLines).toHaveLength(3)
      expect(itemLines[0]?.getAttribute('data-prefix')).toBe('$')
      expect(itemLines[0]?.textContent).toContain('pnpm add @rue-js/design')
      expect(itemLines[1]?.getAttribute('data-prefix')).toBe('>')
      expect(itemLines[2]?.classList.contains('text-primary')).toBe(false)

      expect(lineRows).toHaveLength(4)
      expect(lineRows[0]?.getAttribute('data-prefix')).toBe('21')
      expect(lineRows[0]?.textContent).toContain("import { MockupCode } from '@rue-js/design'")
      expect(lineRows[3]?.classList.contains('bg-primary')).toBe(true)

      expect(numberedRows).toHaveLength(5)
      expect(numberedRows[0]?.getAttribute('data-prefix')).toBe('37')
      expect(numberedRows[3]?.getAttribute('data-prefix')).toBe('40')
      expect(numberedRows[3]?.classList.contains('text-primary')).toBe(true)
    })

    await click(findTabButton(itemsDemo!, 'JSX代码'))
    expect(findDemo(container, '# 推荐：items 数据驱动')?.querySelector('.mockup-code')).toBeNull()
    await click(findTabButton(findDemo(container, '# 推荐：items 数据驱动')!, '预览'))

    await waitForContent(() => {
      expect(
        findDemo(container, '# 推荐：items 数据驱动')?.querySelector('.mockup-code'),
      ).not.toBeNull()
    })
  })
})
