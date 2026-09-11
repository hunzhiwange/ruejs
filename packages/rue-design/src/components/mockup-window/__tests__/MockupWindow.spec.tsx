import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { Template, render, setReactiveScheduling } from '@rue-js/rue'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'
import MockupWindow from '..'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('MockupWindow', () => {
  it('renders the root with base class and custom className', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <MockupWindow className="w-full border border-base-300" data-testid="window-root">
          <div>Hello!</div>
        </MockupWindow>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="window-root"]') as HTMLElement
      expect(root.classList.contains('mockup-window')).toBe(true)
      expect(root.classList.contains('w-full')).toBe(true)
      expect(root.classList.contains('border')).toBe(true)
      expect(root.textContent).toContain('Hello!')
    })
  })

  it('forwards attrs and children unchanged', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <MockupWindow id="window-shell" aria-label="mock window">
          <div className="grid h-80 place-content-center">Dashboard</div>
        </MockupWindow>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('#window-shell') as HTMLElement
      expect(root.getAttribute('aria-label')).toBe('mock window')
      expect(root.querySelector('.grid')).not.toBeNull()
      expect(root.textContent).toContain('Dashboard')
    })
  })

  it('renders structured slots from root props', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <MockupWindow
          bordered
          background
          title="Deployment Preview"
          description="Generated with structured props"
          bodyClassName="grid gap-4"
          data-testid="window-structured"
        >
          <Template slot="toolbar">
            <button type="button">Share</button>
          </Template>
          <Template slot="actions">
            <button type="button">Publish</button>
          </Template>
          <div>Panel content</div>
        </MockupWindow>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="window-structured"]') as HTMLElement
      const header = root.querySelector('.rue-mockup-window-header') as HTMLElement
      const body = root.querySelector('.rue-mockup-window-body') as HTMLElement
      const actions = root.querySelector('.rue-mockup-window-actions') as HTMLElement

      expect(root.classList.contains('mockup-window')).toBe(true)
      expect(root.classList.contains('border')).toBe(true)
      expect(root.classList.contains('bg-base-100')).toBe(true)
      expect(header.textContent).toContain('Deployment Preview')
      expect(header.textContent).toContain('Generated with structured props')
      expect(header.textContent).toContain('Share')
      expect(body.classList.contains('grid')).toBe(true)
      expect(body.textContent).toContain('Panel content')
      expect(actions.textContent).toContain('Publish')
    })
  })

  it('renders compounded subcomponents', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <MockupWindow className="w-full">
          <MockupWindow.Header title="Analytics Snapshot" description="Custom layout">
            <Template slot="extra">
              <MockupWindow.Toolbar>
                <button type="button">Filter</button>
              </MockupWindow.Toolbar>
            </Template>
          </MockupWindow.Header>
          <MockupWindow.Body padding="lg">
            <div>Views 128k</div>
          </MockupWindow.Body>
          <MockupWindow.Actions>
            <button type="button">Open report</button>
          </MockupWindow.Actions>
        </MockupWindow>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('.mockup-window') as HTMLElement
      const toolbar = root.querySelector('.rue-mockup-window-toolbar') as HTMLElement
      const body = root.querySelector('.rue-mockup-window-body') as HTMLElement

      expect(root.classList.contains('w-full')).toBe(true)
      expect(root.textContent).toContain('Analytics Snapshot')
      expect(toolbar.textContent).toContain('Filter')
      expect(body.classList.contains('p-6')).toBe(true)
      expect(root.textContent).toContain('Views 128k')
      expect(root.textContent).toContain('Open report')
    })
  })
})
