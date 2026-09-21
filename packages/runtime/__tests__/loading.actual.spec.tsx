import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import LoadingPage from '../../../app/pages/design/Loading'
import { render, click, mountContainer, waitForContent } from './page-test-utils'

vi.mock('../../../app/pages/site/SidebarPlaygroundDesign', () => ({
  default: (props: { children?: unknown }) => (
    <div data-testid="mock-sidebar-design">{props.children}</div>
  ),
}))

vi.mock('../../../app/pages/site/components/Code', () => ({
  default: (props: { code?: string }) => (
    <pre data-testid="mock-loading-code">{props.code ?? ''}</pre>
  ),
}))

vi.mock('@rue-js/design', async () => {
  const Loading = await import('../../rue-design/src/components/loading')
  const Tabs = await import('../../rue-design/src/components/tabs')
  return {
    Loading: Loading.default,
    Tabs: Tabs.default,
  }
})

setReactiveScheduling('sync')

const setEnabledPreviews = (...titles: string[]) => {
  ;(
    globalThis as { __RUE_TEST_ENABLED_DESIGN_PREVIEWS__?: Set<string> }
  ).__RUE_TEST_ENABLED_DESIGN_PREVIEWS__ = new Set(titles)
}

const normalize = (value: string | null | undefined) => value?.replace(/\s+/g, ' ').trim() ?? ''

const findTabButton = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button[role="tab"]')).find(
    button => button.textContent?.trim() === label,
  ) ?? null

const findDemo = (root: ParentNode, title: string) =>
  Array.from(root.querySelectorAll('.component-preview')).find(
    node => normalize(node.querySelector('h2')?.textContent) === title,
  ) ?? null

afterEach(() => {
  delete (globalThis as { __RUE_TEST_ENABLED_DESIGN_PREVIEWS__?: Set<string> })
    .__RUE_TEST_ENABLED_DESIGN_PREVIEWS__
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('Loading actual page', () => {
  it('replaces preview and code branches without retaining previous content', async () => {
    setEnabledPreviews('Loading spinner')

    const container = mountContainer()
    render(<LoadingPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Loading 加载指示器')
      expect(container.querySelectorAll('.component-preview').length).toBe(15)
    })

    const spinnerDemo = findDemo(container, '# Loading spinner') as HTMLElement | null

    expect(spinnerDemo).not.toBeNull()

    await waitForContent(() => {
      expect(
        spinnerDemo?.querySelectorAll('[data-testid="loading-spinner-demo"] .loading-spinner')
          .length,
      ).toBe(5)
    })

    for (let turn = 0; turn < 3; turn += 1) {
      const currentDemo = findDemo(container, '# Loading spinner')!
      await click(findTabButton(currentDemo, 'JSX代码'))
      expect(currentDemo.querySelectorAll('.loading-spinner')).toHaveLength(0)
      expect(currentDemo.querySelectorAll('[data-testid="mock-loading-code"]')).toHaveLength(1)

      await click(findTabButton(currentDemo, '预览'))
      await waitForContent(() => {
        expect(currentDemo.querySelectorAll('.loading-spinner')).toHaveLength(5)
      })
      expect(currentDemo.querySelectorAll('[data-testid="mock-loading-code"]')).toHaveLength(0)
    }
  })

  it('updates the delayed loading state and reveals it after the configured delay', async () => {
    setEnabledPreviews('Delay')

    const container = mountContainer()
    render(<LoadingPage />, container)

    await waitForContent(() => {
      expect(findDemo(container, '# Delay')).not.toBeNull()
    })

    const delayDemo = findDemo(container, '# Delay')!
    const requestButton = Array.from(delayDemo.querySelectorAll('button')).find(
      button => button.textContent?.trim() === '模拟请求',
    )
    await click(requestButton ?? null)

    await waitForContent(() => {
      expect(delayDemo.textContent).toContain('结束请求')
      const section = delayDemo.querySelector('[data-rue-loading-section="true"]')
      expect(section).not.toBeNull()
      expect(section?.classList.contains('opacity-0')).toBe(true)
    })

    await new Promise(resolve => setTimeout(resolve, 650))
    await waitForContent(() => {
      expect(
        delayDemo
          .querySelector('[data-rue-loading-section="true"]')
          ?.classList.contains('opacity-0'),
      ).toBe(false)
    })
  })

  it('opens fullscreen loading and closes it when the mask is clicked', async () => {
    setEnabledPreviews('Fullscreen')

    const container = mountContainer()
    render(<LoadingPage />, container)

    await waitForContent(() => {
      expect(findDemo(container, '# Fullscreen')).not.toBeNull()
    })

    const fullscreenDemo = findDemo(container, '# Fullscreen')!
    const openButton = Array.from(fullscreenDemo.querySelectorAll('button')).find(
      button => button.textContent?.trim() === 'Show fullscreen',
    )
    await click(openButton ?? null)

    let mask: HTMLElement | null = null
    await waitForContent(() => {
      mask = document.querySelector('[role="status"].fixed.inset-0') as HTMLElement | null
      expect(mask).not.toBeNull()
      expect(mask?.textContent).toContain('同步全局配置')
    })

    await click(mask)
    await waitForContent(() => {
      expect(document.querySelectorAll('[role="status"].fixed.inset-0')).toHaveLength(0)
    })
  })
})
