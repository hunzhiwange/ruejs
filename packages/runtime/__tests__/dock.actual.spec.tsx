import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import DockPage from '../../../app/pages/design/Dock'
import { render, click, mountContainer, waitForContent } from './page-test-utils'
import { findDemo, resetActiveRuntime } from './design-page-test-utils'

vi.mock('../../../app/pages/site/SidebarPlaygroundDesign', () => ({
  default: (props: { children?: unknown }) => (
    <div data-testid="mock-sidebar-design">{props.children}</div>
  ),
}))

vi.mock('../../../app/pages/site/components/Code', () => ({
  default: () => null,
}))

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('Dock actual page', () => {
  it('keeps the size comparison and updates active items from page clicks', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<DockPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Dock 底部栏')
    })

    const basicDemo = findDemo(container, '# 基础导航') as HTMLElement | null
    const keyedDemo = findDemo(container, '# Key 模式与禁用项') as HTMLElement | null
    const sizesDemo = findDemo(container, '# 尺寸体系') as HTMLElement | null

    expect(basicDemo).not.toBeNull()
    expect(keyedDemo).not.toBeNull()
    expect(sizesDemo).not.toBeNull()

    await click(basicDemo!.querySelectorAll('.dock button')[2] ?? null)

    await waitForContent(() => {
      const buttons = basicDemo!.querySelectorAll('.dock button')
      expect(buttons[2]?.classList.contains('dock-active')).toBe(true)
      expect(buttons[1]?.classList.contains('dock-active')).toBe(false)
    })

    await click(keyedDemo!.querySelector('.dock button') ?? null)

    await waitForContent(() => {
      const refreshedKeyedDemo = findDemo(container, '# Key 模式与禁用项') as HTMLElement | null
      expect(refreshedKeyedDemo!.textContent).toContain('当前选中：home')
      expect(
        refreshedKeyedDemo!.querySelector('.dock button')?.classList.contains('dock-active'),
      ).toBe(true)
    })

    await waitForContent(() => {
      const refreshedSizesDemo = findDemo(container, '# 尺寸体系') as HTMLElement | null
      expect(refreshedSizesDemo!.querySelector('.dock-xs')).not.toBeNull()
      expect(refreshedSizesDemo!.querySelector('.dock-sm')).not.toBeNull()
      expect(refreshedSizesDemo!.querySelector('.dock-md')).not.toBeNull()
      expect(refreshedSizesDemo!.querySelector('.dock-lg')).not.toBeNull()
      expect(refreshedSizesDemo!.querySelector('.dock-xl')).not.toBeNull()
      expect(refreshedSizesDemo!.querySelectorAll('.dock')).toHaveLength(5)
    })

    const refreshedSizesDemo = findDemo(container, '# 尺寸体系') as HTMLElement | null
    const sizeDocks = Array.from(refreshedSizesDemo!.querySelectorAll('.dock'))
    expect(sizeDocks).toHaveLength(5)

    for (const dock of sizeDocks) {
      const buttons = dock.querySelectorAll('button')
      expect(buttons[1]?.classList.contains('dock-active')).toBe(true)
      await click(buttons[2] ?? null)
    }

    await waitForContent(() => {
      const latestSizesDemo = findDemo(container, '# 尺寸体系') as HTMLElement | null
      const latestSizeDocks = Array.from(latestSizesDemo!.querySelectorAll('.dock'))

      for (const dock of latestSizeDocks) {
        const buttons = dock.querySelectorAll('button')
        expect(buttons[1]?.classList.contains('dock-active')).toBe(false)
        expect(buttons[2]?.classList.contains('dock-active')).toBe(true)
      }
    })
  })
})
