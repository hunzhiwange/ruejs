import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import MockupBrowser from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('MockupBrowser', () => {
  it('renders the root with base class and custom className', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <MockupBrowser className="w-full border border-base-300" data-testid="browser-root">
          <div>Hello</div>
        </MockupBrowser>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="browser-root"]') as HTMLElement
      expect(root.classList.contains('mockup-browser')).toBe(true)
      expect(root.classList.contains('w-full')).toBe(true)
      expect(root.textContent).toContain('Hello')
    })
  })

  it('renders the toolbar part and forwards attrs', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <MockupBrowser>
          <MockupBrowser.Toolbar data-testid="toolbar" className="text-sm">
            <div className="input">https://daisyui.com</div>
          </MockupBrowser.Toolbar>
        </MockupBrowser>,
        container,
      ),
    )

    await waitForContent(() => {
      const toolbar = container.querySelector('[data-testid="toolbar"]') as HTMLElement
      expect(toolbar.classList.contains('mockup-browser-toolbar')).toBe(true)
      expect(toolbar.classList.contains('text-sm')).toBe(true)
      expect(toolbar.textContent).toContain('https://daisyui.com')
    })
  })

  it('renders the enhanced shortcut API with generated toolbar and content', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <MockupBrowser
          bordered
          background
          url="https://app.ruejs.org"
          toolbarEnd="LIVE"
          contentClassName="min-h-32"
          contentBackground
          contentPadding="md"
          data-testid="browser-root"
        >
          <div data-testid="browser-content">Overview</div>
        </MockupBrowser>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="browser-root"]') as HTMLElement
      const toolbar = root.querySelector('.mockup-browser-toolbar') as HTMLElement
      const addressBar = toolbar.querySelector('.input') as HTMLElement
      const content = root.querySelector('[data-testid="browser-content"]')
        ?.parentElement as HTMLElement

      expect(root.classList.contains('mockup-browser')).toBe(true)
      expect(root.classList.contains('border')).toBe(true)
      expect(root.classList.contains('bg-base-100')).toBe(true)
      expect(toolbar).not.toBeNull()
      expect(addressBar.textContent).toContain('https://app.ruejs.org')
      expect(toolbar.textContent).toContain('LIVE')
      expect(content.classList.contains('border-t')).toBe(true)
      expect(content.classList.contains('min-h-32')).toBe(true)
      expect(content.classList.contains('p-4')).toBe(true)
      expect(content.textContent).toContain('Overview')
    })
  })

  it('renders AddressBar as a link and Content with semantic classes', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <MockupBrowser bordered>
          <MockupBrowser.Toolbar start="Docs">
            <MockupBrowser.AddressBar
              href="https://ruejs.org/docs"
              status="success"
              prefix="200"
              suffix="OK"
            />
          </MockupBrowser.Toolbar>
          <MockupBrowser.Content background padding="lg" data-testid="content">
            <div>Ready</div>
          </MockupBrowser.Content>
        </MockupBrowser>,
        container,
      ),
    )

    await waitForContent(() => {
      const toolbar = container.querySelector('.mockup-browser-toolbar') as HTMLElement
      const addressBar = toolbar.querySelector('a') as HTMLAnchorElement
      const content = container.querySelector('[data-testid="content"]') as HTMLElement

      expect(toolbar.textContent).toContain('Docs')
      expect(addressBar.getAttribute('href')).toBe('https://ruejs.org/docs')
      expect(addressBar.className).toContain('text-success')
      expect(addressBar.textContent).toContain('200')
      expect(addressBar.textContent).toContain('OK')
      expect(content.classList.contains('border-t')).toBe(true)
      expect(content.classList.contains('bg-base-100')).toBe(true)
      expect(content.classList.contains('p-6')).toBe(true)
      expect(content.textContent).toContain('Ready')
    })
  })
})
