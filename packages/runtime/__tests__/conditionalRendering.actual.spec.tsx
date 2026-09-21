import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import ConditionalRendering from '../../../app/pages/jsx/ConditionalRendering'
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

const findTab = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button[role="tab"]')).find(
    button => button.textContent?.trim() === label,
  ) ?? null

const normalize = (value: string | null | undefined) => value?.replace(/\s+/g, ' ').trim() ?? ''

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('ConditionalRendering actual page', () => {
  it('renders only truthy expression output on the preview tab', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<ConditionalRendering />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('条件渲染')
      expect(findTab(container, '代码')?.className).toContain('tab-active')
    })

    await click(findTab(container, '效果'))

    await waitForContent(() => {
      const lines = Array.from(container.querySelectorAll('.card-body.grid.gap-2 > div')).map(
        node => normalize(node.textContent),
      )
      expect(lines).toEqual([
        'A 显示（?:）',
        '--[]--',
        '',
        '',
        '--[]--',
        '--[]--',
        '--[]--',
        '--[]--',
        '--[1]--',
        '--[0]--',
      ])
    })

    await click(findTab(container, '代码'))

    expect(container.querySelectorAll('.card-body.grid.gap-2 > div')).toHaveLength(0)
  })
})
