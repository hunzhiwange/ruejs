import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import HandlingInput from '../../../app/pages/examples/HandlingInput'
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

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('HandlingInput actual page', () => {
  it('reverses and appends the preview message, then prevents link navigation', async () => {
    const alertSpy = vi.fn()
    vi.stubGlobal('alert', alertSpy)

    const container = mountContainer()
    resetActiveRuntime()
    render(<HandlingInput />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('处理输入（移植自 Vue）')
      expect(container.textContent).toContain('Hello World!')
    })

    await click(findButton(container, 'Reverse Message'))

    await waitForContent(() => {
      expect(container.textContent).toContain('!dlroW olleH')
    })

    await click(findButton(container, 'Append "!"'))

    await waitForContent(() => {
      expect(container.textContent).toContain('!dlroW olleH!')
    })

    await click(
      Array.from(container.querySelectorAll('a')).find(link =>
        link.textContent?.includes('A link with e.preventDefault()'),
      ) ?? null,
    )

    expect(alertSpy).toHaveBeenCalledWith('navigation was prevented.')

    await click(findTab(container, '代码'))

    expect(Array.from(container.querySelectorAll('a'))).toHaveLength(0)
    expect(findButton(container, 'Reverse Message')).toBeNull()
  })
})
