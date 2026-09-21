import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import StatPage from '../../../app/pages/design/Stat'
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

const getDemoTitles = (root: ParentNode) =>
  Array.from(root.querySelectorAll('.component-preview h2')).map(node =>
    normalize(node.textContent),
  )

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('Stat actual page', () => {
  it('keeps demos and API module together on the page', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<StatPage />, container)

    await waitForContent(() => {
      const titles = getDemoTitles(container)

      expect(container.textContent).toContain('Stat 统计')
      expect(container.textContent).toContain('功能概览')
      expect(container.textContent).toContain('API')

      expect(titles).toContain('# 基础用法')
      expect(titles).toContain('# 数据驱动')
      expect(titles).toContain('# 带图标或头像')
      expect(titles).toContain('# 居中布局')
      expect(titles).toContain('# 纵向布局')
      expect(titles).toContain('# 响应式布局')
      expect(titles).toContain('# 带操作按钮')
      expect(titles).toContain('# 数值格式化')
      expect(titles).toContain('# Timer / Countdown')

      expect(container.textContent).toContain('Stat.Timer / Stat.Countdown')
      expect(container.querySelectorAll('table.table').length).toBeGreaterThanOrEqual(4)
    })
  })
})
