import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import Layout from '..'
import type { LayoutSiderTriggerRenderMeta } from '../index'
import {
  click,
  mountContainer,
  waitForContent,
} from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

const setViewportWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  })
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  setViewportWidth(1440)
})

describe('Layout', () => {
  it('renders a hasSider shell and semantic sections', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Layout hasSider className="rounded-box" data-testid="layout-root">
          <Layout.Sider data-testid="layout-sider">nav</Layout.Sider>
          <Layout>
            <Layout.Header data-testid="layout-header">header</Layout.Header>
            <Layout.Content data-testid="layout-content">content</Layout.Content>
            <Layout.Footer data-testid="layout-footer">footer</Layout.Footer>
          </Layout>
        </Layout>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="layout-root"]') as HTMLElement
      const header = container.querySelector('[data-testid="layout-header"]') as HTMLElement
      const content = container.querySelector('[data-testid="layout-content"]') as HTMLElement
      const footer = container.querySelector('[data-testid="layout-footer"]') as HTMLElement

      expect(root.getAttribute('data-rue-layout-has-sider')).toBe('true')
      expect(root.classList.contains('flex-row')).toBe(true)
      expect(root.classList.contains('rounded-box')).toBe(true)
      expect(header.tagName.toLowerCase()).toBe('header')
      expect(content.tagName.toLowerCase()).toBe('main')
      expect(footer.tagName.toLowerCase()).toBe('footer')
    })
  })

  it('toggles an uncontrolled sider and syncs footer visibility through the default trigger', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const onCollapse = vi.fn()

    mountTestApp(container, () =>
      render(
        <Layout hasSider>
          <Layout.Sider
            collapsible
            defaultCollapsed
            collapsedWidth={72}
            footer="Auto save every 24s"
            data-testid="layout-sider"
            onCollapse={onCollapse}
          >
            aside
          </Layout.Sider>
          <Layout>
            <Layout.Content>content</Layout.Content>
          </Layout>
        </Layout>,
        container,
      ),
    )

    await waitForContent(() => {
      const sider = container.querySelector('[data-testid="layout-sider"]') as HTMLElement
      const footer = sider.querySelector('.rue-layout-sider-footer') as HTMLElement
      const trigger = sider.querySelector(
        '[data-rue-layout-sider-trigger="default"]',
      ) as HTMLElement

      expect(sider.getAttribute('data-collapsed')).toBe('true')
      expect(sider.style.width).toBe('72px')
      expect(footer.getAttribute('aria-hidden')).toBe('true')
      expect(footer.style.display).toBe('none')
      expect(trigger.getAttribute('aria-label')).toBe('展开侧边栏')
      expect(trigger.textContent).toContain('展开')
    })

    const trigger = container.querySelector(
      '[data-rue-layout-sider-trigger="default"]',
    ) as HTMLElement | null
    await click(trigger)

    await waitForContent(() => {
      const sider = container.querySelector('[data-testid="layout-sider"]') as HTMLElement
      const footer = sider.querySelector('.rue-layout-sider-footer') as HTMLElement
      const triggerButton = sider.querySelector(
        '[data-rue-layout-sider-trigger="default"]',
      ) as HTMLElement

      expect(sider.getAttribute('data-collapsed')).toBe('false')
      expect(sider.style.width).toBe('240px')
      expect(footer.getAttribute('aria-hidden')).toBe('false')
      expect(footer.style.display).toBe('')
      expect(footer.textContent).toContain('Auto save every 24s')
      expect(triggerButton.getAttribute('aria-label')).toBe('收起侧边栏')
      expect(triggerButton.textContent).toContain('收起')
      expect(onCollapse).toHaveBeenCalledWith(false, 'clickTrigger')
    })
  })

  it('supports function trigger metadata and zero-width responsive collapse', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    setViewportWidth(720)
    const onBreakpoint = vi.fn()
    const onCollapse = vi.fn()

    mountTestApp(container, () =>
      render(
        <Layout hasSider>
          <Layout.Sider
            collapsible
            breakpoint="md"
            collapsedWidth={0}
            width={280}
            data-testid="responsive-sider"
            onBreakpoint={onBreakpoint}
            onCollapse={onCollapse}
            triggerFormatter={({ collapsed, below, zeroWidth }: LayoutSiderTriggerRenderMeta) =>
              `${collapsed ? 'closed' : 'open'}-${below ? 'below' : 'above'}-${zeroWidth ? 'zero' : 'solid'}`
            }
          >
            responsive
          </Layout.Sider>
          <Layout>
            <Layout.Content>content</Layout.Content>
          </Layout>
        </Layout>,
        container,
      ),
    )

    await waitForContent(() => {
      const sider = container.querySelector('[data-testid="responsive-sider"]') as HTMLElement
      const trigger = container.querySelector(
        '[data-rue-layout-trigger-custom="true"]',
      ) as HTMLElement
      const triggerButton = sider.querySelector(
        '[data-rue-layout-sider-trigger="zero"]',
      ) as HTMLElement

      expect(sider.getAttribute('data-collapsed')).toBe('true')
      expect(sider.getAttribute('data-below')).toBe('true')
      expect(sider.getAttribute('data-zero-width')).toBe('true')
      expect(sider.style.width).toBe('0px')
      expect(trigger.textContent).toContain('closed-below-zero')
      expect(triggerButton.getAttribute('aria-label')).toBe('展开侧边栏')
      expect(onBreakpoint).toHaveBeenCalledWith(true)
      expect(onCollapse).toHaveBeenCalledWith(true, 'responsive')
    })
  })

  it('honors controlled collapsed state updates', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const state = { value: true }

    const ControlledLayout = () => {
      return (
        <Layout hasSider>
          <Layout.Sider
            collapsed={state.value}
            width={300}
            collapsedWidth={96}
            data-testid="controlled-sider"
          >
            controlled
          </Layout.Sider>
          <Layout>
            <Layout.Content>content</Layout.Content>
          </Layout>
        </Layout>
      )
    }

    mountTestApp(container, () => render(<ControlledLayout />, container))

    await waitForContent(() => {
      const sider = container.querySelector('[data-testid="controlled-sider"]') as HTMLElement
      expect(sider.getAttribute('data-collapsed')).toBe('true')
      expect(sider.style.width).toBe('96px')
    })

    state.value = false
    mountTestApp(container, () => render(<ControlledLayout />, container))

    await waitForContent(() => {
      const sider = container.querySelector('[data-testid="controlled-sider"]') as HTMLElement
      expect(sider.getAttribute('data-collapsed')).toBe('false')
      expect(sider.style.width).toBe('300px')
    })
  })
})
