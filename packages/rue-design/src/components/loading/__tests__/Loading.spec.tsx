import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Template, ref, render, setReactiveScheduling } from '@rue-js/rue'

import Loading from '../index'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
  Loading.setDefaultIndicator(undefined)
})

describe('Loading', () => {
  it('renders the base loading host', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () => render(<Loading data-testid="loading-base" />, container))

    await waitForContent(() => {
      const el = container.querySelector('[data-testid="loading-base"]') as HTMLElement
      expect(el.tagName.toLowerCase()).toBe('span')
      expect(el.classList.contains('loading')).toBe(true)
      expect(el.classList.contains('loading-spinner')).toBe(true)
      expect(el.classList.contains('loading-md')).toBe(true)
      expect(el.getAttribute('role')).toBe('status')
      expect(el.getAttribute('aria-busy')).toBe('true')
    })
  })

  it('applies style and size modifiers with custom className', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(<Loading style="spinner" size="lg" className="text-primary" />, container),
    )

    await waitForContent(() => {
      const el = container.querySelector('.loading') as HTMLElement
      expect(el.classList.contains('loading-spinner')).toBe(true)
      expect(el.classList.contains('loading-lg')).toBe(true)
      expect(el.classList.contains('text-primary')).toBe(true)
    })
  })

  it('supports rendering as another lightweight host', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(<Loading as="div" style="dots" data-testid="loading-div" />, container),
    )

    await waitForContent(() => {
      const el = container.querySelector('[data-testid="loading-div"]') as HTMLElement
      expect(el.tagName.toLowerCase()).toBe('div')
      expect(el.classList.contains('loading-dots')).toBe(true)
    })
  })

  it('wraps children with a busy overlay and description', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Loading spinning description="Fetching workspace" data-testid="loading-wrap">
          <article data-testid="loading-content">Workspace card</article>
        </Loading>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="loading-wrap"]') as HTMLElement
      expect(root.getAttribute('aria-busy')).toBe('true')
      expect(root.querySelector('[data-rue-loading-section="true"]')).toBeTruthy()
      expect(root.querySelector('[data-rue-loading-container="true"]')?.textContent).toContain(
        'Workspace card',
      )
      expect(root.textContent).toContain('Fetching workspace')
    })
  })

  it('keeps nested content mounted when spinning is false', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Loading spinning={false} data-testid="loading-idle">
          <span data-testid="idle-content">Ready</span>
        </Loading>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="loading-idle"]') as HTMLElement
      expect(root.getAttribute('aria-busy')).toBe('false')
      expect(root.querySelector('[data-rue-loading-section="true"]')).toBeNull()
      expect(root.querySelector('[data-testid="idle-content"]')).toBeTruthy()
    })
  })

  it('renders custom indicators with percent feedback', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Loading percent={42} description="Uploading">
          <Template slot="indicator">
            <span data-testid="custom-indicator">42</span>
          </Template>
        </Loading>,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="custom-indicator"]')?.textContent).toBe('42')
      expect(container.querySelector('progress')?.getAttribute('value')).toBe('42')
      expect(container.textContent).toContain('Uploading')
    })
  })

  it('renders an indicator JSX prop without stringifying its compiled factory', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Loading
          indicator={<span data-testid="indicator-node">Spark</span>}
          description="Mapping"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="indicator-node"]')?.textContent).toBe('Spark')
      expect(container.textContent).not.toContain('_$compiledComponent')
    })
  })

  it('invokes an indicator render prop with loading state', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Loading
          percent={64}
          size="large"
          indicatorStyle="ring"
          indicator={({ percent, size, style, spinning }) => (
            <span data-testid="indicator-render">
              {`${percent}-${size}-${style}-${String(spinning)}`}
            </span>
          )}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="indicator-render"]')?.textContent).toBe(
        '64-lg-ring-true',
      )
    })
  })

  it('supports a global default indicator', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    Loading.setDefaultIndicator('G')
    mountTestApp(container, () => render(<Loading description="Global" />, container))

    await waitForContent(() => {
      expect(container.textContent).toContain('G')
      expect(container.textContent).toContain('Global')
    })
  })

  it('delays standalone loading visibility', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(<Loading delay={80} data-testid="delayed-loading" />, container),
    )

    await new Promise(resolve => setTimeout(resolve, 10))
    const delayed = container.querySelector('[data-testid="delayed-loading"]') as HTMLElement
    expect(delayed.classList.contains('loading')).toBe(true)
    expect(delayed.classList.contains('opacity-0')).toBe(true)

    await new Promise(resolve => setTimeout(resolve, 90))

    await waitForContent(() => {
      expect(
        container.querySelector('[data-testid="delayed-loading"]')?.classList.contains('opacity-0'),
      ).toBe(false)
    })
  })

  it('shows delayed nested loading after a controlled prop turns on', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const spinning = ref(false)

    mountTestApp(container, () =>
      render(
        <Loading spinning={spinning.value} delay={40} description="Fetching">
          <span>Content</span>
        </Loading>,
        container,
      ),
    )

    expect(container.querySelector('[data-rue-loading-section="true"]')).toBeNull()
    spinning.value = true
    await new Promise(resolve => setTimeout(resolve, 60))

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-loading-section="true"]')?.textContent).toContain(
        'Fetching',
      )
    })
  })

  it('opens and closes fullscreen loading from a controlled prop', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const spinning = ref(false)

    mountTestApp(container, () =>
      render(
        <Loading
          fullscreen
          spinning={spinning.value}
          description="Syncing"
          data-testid="fullscreen-loading"
          onClick={() => (spinning.value = false)}
        />,
        container,
      ),
    )

    const fullscreen = container.querySelector('[data-testid="fullscreen-loading"]') as HTMLElement
    expect(fullscreen.classList.contains('hidden')).toBe(true)
    expect(fullscreen.getAttribute('aria-busy')).toBe('false')
    spinning.value = true

    await waitForContent(() => {
      expect(fullscreen.classList.contains('hidden')).toBe(false)
      expect(fullscreen.getAttribute('aria-busy')).toBe('true')
      expect(fullscreen.textContent).toContain('Syncing')
    })

    fullscreen.click()

    await waitForContent(() => {
      expect(fullscreen.classList.contains('hidden')).toBe(true)
      expect(fullscreen.getAttribute('aria-busy')).toBe('false')
    })
  })
})
