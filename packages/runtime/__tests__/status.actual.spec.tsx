import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import StatusPage from '../../../app/pages/design/Status'
import { render, mountContainer, waitForContent } from './page-test-utils'

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

const findSpanWithClass = (root: ParentNode, className: string) =>
  Array.from(root.querySelectorAll('span')).find(node =>
    (node as HTMLSpanElement).classList.contains(className),
  ) ?? null

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('Status actual page', () => {
  it('renders status indicators and standalone label demos in preview mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<StatusPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Status')
      expect(container.querySelector('.component-preview')).not.toBeNull()
    })

    const scaleDemo = findDemo(container, '# 尺寸与色板') as HTMLElement | null
    const labelDemo = findDemo(container, '# 文案与 label 模式') as HTMLElement | null
    const badgeDemo = findDemo(container, '# 包裹内容的角标模式') as HTMLElement | null
    const motionDemo = findDemo(container, '# 动效状态') as HTMLElement | null
    expect(scaleDemo).not.toBeNull()
    expect(labelDemo).not.toBeNull()
    expect(badgeDemo).not.toBeNull()
    expect(motionDemo).not.toBeNull()

    await waitForContent(() => {
      expect(scaleDemo!.querySelectorAll('[aria-label]').length).toBe(13)
      expect(normalize(labelDemo?.textContent)).toContain('待审核')
      expect(normalize(badgeDemo?.textContent)).toContain('Pending review')
      expect(findSpanWithClass(labelDemo!, 'pe-6')).not.toBeNull()
      expect(findSpanWithClass(badgeDemo!, 'indicator-item')).not.toBeNull()
      expect(normalize(motionDemo?.textContent)).toContain('Server is down')
      expect(normalize(motionDemo?.textContent)).toContain('Unread messages')
      expect(labelDemo!.querySelector('.indicator .status')).not.toBeNull()
    })
  })
})
