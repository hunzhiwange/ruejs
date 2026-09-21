import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import VPreAndRPre from '../../../app/pages/jsx/VPreAndRPre'
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

const findSection = (root: ParentNode, heading: string) =>
  Array.from(root.querySelectorAll('section.space-y-3')).find(section =>
    section.querySelector('h2')?.textContent?.includes(heading),
  ) ?? null

const literalPanels = (root: ParentNode) =>
  Array.from(root.querySelectorAll('div.rounded-box.border.border-dashed.border-base-300.p-4')).map(
    node => node.textContent?.trim(),
  )

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('VPreAndRPre actual page', () => {
  it('preserves literal directive markup inside pre blocks while the comparison panel still rues', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<VPreAndRPre />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('v-pre / r-pre')
      expect(findTab(container, '效果')?.className).toContain('tab-active')
    })

    await waitForContent(() => {
      expect(literalPanels(container)).toEqual(['{phase.value}', '{plan.value}'])
      expect(findSection(container, '对照渲染')?.textContent).toContain('当前阶段：draft')
      expect(container.textContent).toContain('当前套餐：pro')
    })

    await click(findButton(container, '发布'))
    await click(findButton(container, 'Basic'))

    await waitForContent(() => {
      expect(literalPanels(container)).toEqual(['{phase.value}', '{plan.value}'])
      expect(findSection(container, '对照渲染')?.textContent).toContain('当前阶段：published')
      expect(container.textContent).toContain('当前套餐：basic')
    })

    await click(findTab(container, '代码'))

    expect(
      container.querySelectorAll('div.rounded-box.border.border-dashed.border-base-300.p-4'),
    ).toHaveLength(0)
  })
})
