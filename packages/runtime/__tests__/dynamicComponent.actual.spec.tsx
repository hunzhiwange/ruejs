import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import DynamicComponent from '../../../app/pages/jsx/DynamicComponent'
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

const findButton = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button')).find(
    button => button.textContent?.trim() === label,
  ) ?? null

const readText = (root: ParentNode) => (root.textContent ?? '').replace(/\s+/g, ' ').trim()

describe('DynamicComponent actual page', () => {
  it('switches between native, component, and registered-string targets while preserving children', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const mounted = createMountedCompiledTestComponent(DynamicComponent as any, container)

    await waitForContent(() => {
      expect(readText(container)).toContain('动态组件（Component）')
      expect(readText(container)).toContain('当前 is： article')
      expect(readText(container)).toContain('children 已透传')
      expect(readText(container)).toContain('CardView')
    })
    await click(findButton(container, 'SalesCard'))

    await waitForContent(() => {
      expect(readText(container)).toContain('当前 is： SalesCard')
      expect(readText(container)).toContain('今日成交额')
      expect(readText(container)).toContain('¥ 128,400')
    })

    await click(findButton(container, 'accent'))

    const salesCard = Array.from(container.querySelectorAll('article')).find(article =>
      article.textContent?.includes('今日成交额'),
    )
    expect(salesCard?.className).toContain('bg-accent/10')
    expect(salesCard?.textContent).toContain('children 已透传')

    await click(findButton(container, 'StatusStrip'))

    await waitForContent(() => {
      expect(readText(container)).toContain('当前 is： StatusStrip')
      expect(readText(container)).toContain('状态切换')
      expect(readText(container)).toContain('这里的 is 已从原生标签切到另一个组件定义')
    })

    await click(findButton(container, 'RegisteredNotice'))

    await waitForContent(() => {
      expect(readText(container)).toContain('运行时注册')
      expect(readText(container)).toContain(
        'notice 键在同一个有限 registry 中解析到 RegisteredNotice',
      )
      expect(readText(container)).toContain('children 一样会透传')
    })
    mounted.dispose()
  })
})
