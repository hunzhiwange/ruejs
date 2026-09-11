import { Template } from '@rue-js/rue'
import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import DrawerSidebar from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('DrawerSidebar', () => {
  it('renders root with modifier classes', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <DrawerSidebar end={true} open={true} className="h-56">
          body
        </DrawerSidebar>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('.drawer') as HTMLElement
      expect(root.classList.contains('drawer-end')).toBe(true)
      expect(root.classList.contains('drawer-open')).toBe(true)
      expect(root.classList.contains('h-56')).toBe(true)
    })
  })

  it('renders toggle with default checkbox type', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(<DrawerSidebar.Toggle id="drawer-a" className="sr-only" />, container),
    )

    await waitForContent(() => {
      const toggle = container.querySelector('input.drawer-toggle') as HTMLInputElement
      expect(toggle.type).toBe('checkbox')
      expect(toggle.id).toBe('drawer-a')
      expect(toggle.classList.contains('sr-only')).toBe(true)
    })
  })

  it('renders content, side, and overlay parts', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <DrawerSidebar>
          <DrawerSidebar.Content data-testid="content">Content</DrawerSidebar.Content>
          <DrawerSidebar.Side data-testid="side">
            <DrawerSidebar.Overlay
              data-testid="overlay"
              for="drawer-b"
              aria-label="close sidebar"
            />
          </DrawerSidebar.Side>
        </DrawerSidebar>,
        container,
      ),
    )

    await waitForContent(() => {
      const content = container.querySelector('[data-testid="content"]') as HTMLElement
      const side = container.querySelector('[data-testid="side"]') as HTMLElement
      const overlay = container.querySelector('[data-testid="overlay"]') as HTMLLabelElement
      expect(content.classList.contains('drawer-content')).toBe(true)
      expect(side.classList.contains('drawer-side')).toBe(true)
      expect(overlay.tagName.toLowerCase()).toBe('label')
      expect(overlay.classList.contains('drawer-overlay')).toBe(true)
      expect(overlay.getAttribute('for')).toBe('drawer-b')
    })
  })

  it('renders managed drawer panel with semantic sections', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <DrawerSidebar
          open={true}
          title="用户详情"
          placement="left"
          size="large"
          className="panel-prop"
          rootClassName="root-prop"
          bodyClassName="body-prop"
          headerClassName="header-prop"
          footerClassName="footer-prop"
          maskClassName="mask-prop"
          classNames={{
            panel: 'panel-slot',
            body: 'body-slot',
            close: 'close-slot',
          }}
        >
          <Template slot="extra">
            <button id="drawer-extra">更多</button>
          </Template>
          <Template slot="footer">
            <button id="drawer-save">保存</button>
          </Template>
          Drawer body
        </DrawerSidebar>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-rue-drawer-sidebar-root="true"]') as HTMLElement
      const wrapper = container.querySelector(
        '[data-rue-drawer-sidebar-wrapper="true"]',
      ) as HTMLElement
      const panel = container.querySelector('[data-rue-drawer-sidebar-panel="true"]') as HTMLElement
      const header = container.querySelector(
        '[data-rue-drawer-sidebar-header="true"]',
      ) as HTMLElement
      const body = container.querySelector('[data-rue-drawer-sidebar-body="true"]') as HTMLElement
      const footer = container.querySelector(
        '[data-rue-drawer-sidebar-footer="true"]',
      ) as HTMLElement
      const mask = container.querySelector('[data-rue-drawer-sidebar-mask="true"]') as HTMLElement
      const close = container.querySelector('.close-slot') as HTMLElement

      expect(root.getAttribute('data-rue-drawer-sidebar-mode')).toBe('panel')
      expect(root.style.zIndex).toBe('1000')
      expect(root.classList.contains('root-prop')).toBe(true)
      expect(wrapper.classList.contains('min-h-0')).toBe(true)
      expect(wrapper.classList.contains('min-w-0')).toBe(true)
      expect(panel.classList.contains('panel-prop')).toBe(true)
      expect(panel.classList.contains('panel-slot')).toBe(true)
      expect(panel.classList.contains('min-h-0')).toBe(true)
      expect(panel.classList.contains('overflow-hidden')).toBe(true)
      expect(panel.getAttribute('data-rue-drawer-sidebar-placement')).toBe('left')
      expect(panel.style.width).toBe('736px')
      expect(header.classList.contains('header-prop')).toBe(true)
      expect(header.classList.contains('shrink-0')).toBe(true)
      expect(body.classList.contains('body-prop')).toBe(true)
      expect(body.classList.contains('body-slot')).toBe(true)
      expect(body.classList.contains('min-h-0')).toBe(true)
      expect(body.classList.contains('overflow-y-auto')).toBe(true)
      expect(body.textContent).toContain('Drawer body')
      expect(footer.classList.contains('footer-prop')).toBe(true)
      expect(footer.classList.contains('shrink-0')).toBe(true)
      expect(footer.textContent).toContain('保存')
      expect(mask.classList.contains('mask-prop')).toBe(true)
      expect(container.querySelector('#drawer-extra')?.textContent).toBe('更多')
      expect(close).toBeTruthy()
    })
  })

  it('allows overriding the default root z-index', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <DrawerSidebar open={true} title="层级覆盖" zIndex={1200}>
          内容
        </DrawerSidebar>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-rue-drawer-sidebar-root="true"]') as HTMLElement
      expect(root.style.zIndex).toBe('1200')
    })
  })

  it('supports uncontrolled close via mask click', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const onClose = vi.fn()
    const onOpenChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <DrawerSidebar
          defaultOpen={true}
          title="待办"
          onClose={onClose}
          onOpenChange={onOpenChange}
        >
          内容
        </DrawerSidebar>,
        container,
      ),
    )

    await waitForContent(() => {
      const wrapper = container.querySelector(
        '[data-rue-drawer-sidebar-wrapper="true"]',
      ) as HTMLElement
      expect(wrapper).toBeTruthy()
    })

    const wrapper = container.querySelector(
      '[data-rue-drawer-sidebar-wrapper="true"]',
    ) as HTMLElement
    wrapper.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      const root = container.querySelector(
        '[data-rue-drawer-sidebar-root="true"]',
      ) as HTMLElement | null
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onOpenChange).toHaveBeenCalledWith(false)
      if (root) {
        expect(root.getAttribute('data-rue-drawer-sidebar-open')).toBe('false')
        expect(root.classList.contains('pointer-events-none')).toBe(true)
      } else {
        expect(root).toBeNull()
      }
    })
  })

  it('keeps hidden managed panel mounted when forceRender and destroyOnHidden are enabled together', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <DrawerSidebar
          open={false}
          forceRender={true}
          destroyOnHidden={false}
          inline={true}
          placement="top"
          title="加载中"
          loading={true}
          closable={{ placement: 'start' }}
        >
          内容
        </DrawerSidebar>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-rue-drawer-sidebar-root="true"]') as HTMLElement
      const panel = container.querySelector('[data-rue-drawer-sidebar-panel="true"]') as HTMLElement
      const loadingBody = container.querySelector(
        '[data-rue-drawer-sidebar-loading="true"]',
      ) as HTMLElement
      const body = container.querySelector('[data-rue-drawer-sidebar-body="true"]') as HTMLElement

      expect(root.getAttribute('data-rue-drawer-sidebar-open')).toBe('false')
      expect(panel.getAttribute('data-rue-drawer-sidebar-placement')).toBe('top')
      expect(loadingBody).toBeTruthy()
      expect(body.getAttribute('aria-busy')).toBe('true')
      expect(container.querySelector('[data-rue-drawer-sidebar-close="true"]')).toBeTruthy()
    })
  })

  it('teleports managed drawer panel to a custom container', async () => {
    const container = mountContainer()
    const target = document.createElement('div')
    target.id = 'drawer-target'
    document.body.appendChild(target)
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <DrawerSidebar open={true} title="Portal Drawer" getContainer={target}>
          内容
        </DrawerSidebar>,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-drawer-sidebar-root="true"]')).toBeNull()
      const teleportedRoot = target.querySelector(
        '[data-rue-drawer-sidebar-root="true"]',
      ) as HTMLElement
      expect(teleportedRoot).toBeTruthy()
      expect(teleportedRoot.getAttribute('data-rue-drawer-sidebar-open')).toBe('true')
      expect(target.textContent).toContain('Portal Drawer')
      expect(target.textContent).toContain('内容')
    })
  })
})
