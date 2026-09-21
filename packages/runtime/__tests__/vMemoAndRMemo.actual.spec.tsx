import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import VMemoAndRMemo from '../../../app/pages/jsx/VMemoAndRMemo'
import { click, mountContainer, render, waitForContent } from './page-test-utils'

vi.mock('../../../app/pages/site/SidebarPlaygroundExample', () => ({
  default: (props: { children?: unknown }) => (
    <div data-testid="mock-sidebar-example">{props.children}</div>
  ),
}))

vi.mock('../../../app/pages/site/components/Code', () => ({
  default: () => <></>,
}))

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

const normalizeText = (value: string | null | undefined) => value?.replace(/\s+/g, ' ').trim() ?? ''

const findTab = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button[role="tab"]')).find(
    button => button.textContent?.trim() === label,
  ) ?? null

const findButton = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button')).find(
    button => button.textContent?.trim() === label,
  ) ?? null

const findRow = (root: ParentNode, name: string) =>
  Array.from(
    root.querySelectorAll('div.rounded-box.border.border-base-300.p-4.grid.gap-3 > div'),
  ).find(node => normalizeText(node.textContent).includes(name)) ?? null

const memoBadgeText = (root: ParentNode) =>
  normalizeText(root.querySelector('.badge.badge-outline.badge-lg')?.textContent)

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('VMemoAndRMemo actual page', () => {
  it('keeps memoized refresh text stable until the selected dependency actually changes', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<VMemoAndRMemo />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('v-memo / r-memo')
      expect(findTab(container, '代码')?.className).toContain('tab-active')
    })

    await click(findTab(container, '效果'))

    await waitForContent(() => {
      expect(container.textContent).toContain('每行的 v-memo 依赖是 [row.id === selectedId.value]')
      expect(container.textContent).toContain('只有旧选中行和新选中行会刷新')
      expect(container.textContent).toContain('r-memo 依赖 [selectedId.value]')
      expect(normalizeText(findRow(container, 'Alpha')?.textContent)).toContain('选中：是')
      expect(normalizeText(findRow(container, 'Alpha')?.textContent)).toContain('刷新：0')
      expect(normalizeText(findRow(container, 'Beta')?.textContent)).toContain('选中：否')
      expect(normalizeText(findRow(container, 'Gamma')?.textContent)).toContain('刷新：0')
      expect(memoBadgeText(container)).toContain('selected id: 1')
      expect(memoBadgeText(container)).toContain('refresh: 0')
    })

    await click(findButton(container, '无关刷新'))

    await waitForContent(() => {
      expect(normalizeText(findRow(container, 'Alpha')?.textContent)).toContain('刷新：0')
      expect(normalizeText(findRow(container, 'Beta')?.textContent)).toContain('刷新：0')
      expect(normalizeText(findRow(container, 'Gamma')?.textContent)).toContain('刷新：0')
      expect(memoBadgeText(container)).toContain('selected id: 1')
      expect(memoBadgeText(container)).toContain('refresh: 0')
    })

    await click(findButton(container, 'Beta'))

    await waitForContent(() => {
      expect(normalizeText(findRow(container, 'Alpha')?.textContent)).toContain('选中：否')
      expect(normalizeText(findRow(container, 'Alpha')?.textContent)).toContain('刷新：1')
      expect(normalizeText(findRow(container, 'Beta')?.textContent)).toContain('选中：是')
      expect(normalizeText(findRow(container, 'Beta')?.textContent)).toContain('刷新：1')
      expect(normalizeText(findRow(container, 'Gamma')?.textContent)).toContain('选中：否')
      expect(normalizeText(findRow(container, 'Gamma')?.textContent)).toContain('刷新：0')
      expect(memoBadgeText(container)).toContain('selected id: 2')
      expect(memoBadgeText(container)).toContain('refresh: 1')
    })

    await click(findTab(container, '代码'))

    expect(container.querySelectorAll('.alert')).toHaveLength(0)
  })
})
