import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import RefsPage from '../../../app/pages/jsx/Refs'
import { createMountedCompiledTestComponent } from './compiler-capability-test-runtime'
import { click, mountContainer, waitForContent } from './page-test-utils'

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

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

const findTab = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button[role="tab"]')).find(
    button => button.textContent?.trim() === label,
  ) ?? null

const findButton = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button')).find(
    button => button.textContent?.trim() === label,
  ) ?? null

describe('Refs actual page', () => {
  it('binds the DOM ref in preview mode and focuses the input through useRef', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const container = mountContainer()
    resetActiveRuntime()
    const mounted = createMountedCompiledTestComponent(RefsPage as any, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Refs 基础')
      expect(container.querySelector('input')).toBeNull()
    })

    await click(findTab(container, '效果'))

    const input = container.querySelector('input') as HTMLInputElement | null
    expect(input).not.toBeNull()
    expect(input?.placeholder).toBe('点击按钮自动聚焦')

    await click(findButton(container, '聚焦'))

    expect(infoSpy).toHaveBeenCalled()
    expect(document.activeElement).toBe(input)

    await click(findTab(container, '代码'))

    expect(container.querySelector('input')).toBeNull()
    mounted.dispose()
  })
})
