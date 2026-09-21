import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import ConditionalsAndLoops from '../../../app/pages/examples/ConditionalsAndLoops'
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

const findButton = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button')).find(
    button => button.textContent?.trim() === label,
  ) ?? null

const readList = (root: ParentNode) =>
  Array.from(root.querySelectorAll('li')).map(item => item.textContent?.trim())

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('ConditionalsAndLoops actual page', () => {
  it('toggles list visibility and updates the sequence through push, pop, and reverse', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const container = mountContainer()
    resetActiveRuntime()
    render(<ConditionalsAndLoops />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('条件与循环（移植自 Vue）')
      expect(readList(container)).toEqual(['1', '2', '3'])
    })

    await click(findButton(container, 'Push Number'))
    await waitForContent(() => {
      expect(readList(container)).toEqual(['1', '2', '3', '4'])
    })

    await click(findButton(container, 'Reverse List'))
    await waitForContent(() => {
      expect(readList(container)).toEqual(['4', '3', '2', '1'])
    })

    await click(findButton(container, 'Toggle List'))
    await waitForContent(() => {
      expect(container.textContent).toContain('List is not empty, but hidden.')
      expect(container.querySelectorAll('li')).toHaveLength(0)
    })

    await click(findButton(container, 'Toggle List'))
    await click(findButton(container, 'Pop Number'))
    await click(findButton(container, 'Pop Number'))
    await click(findButton(container, 'Pop Number'))
    await click(findButton(container, 'Pop Number'))

    await waitForContent(() => {
      expect(container.textContent).toContain('List is empty.')
      expect(container.querySelectorAll('li')).toHaveLength(0)
    })

    await click(findTab(container, '代码'))

    expect(findButton(container, 'Toggle List')).toBeNull()
    expect(logSpy).toHaveBeenCalled()
  })
})
