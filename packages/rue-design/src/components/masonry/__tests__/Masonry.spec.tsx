import { MasonryItem } from '../index'
import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import Masonry from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

const initialViewportWidth = window.innerWidth

const setViewportWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  })
  window.dispatchEvent(new Event('resize'))
}

class ResizeObserverMock {
  callback: ResizeObserverCallback
  element?: Element
  static instances: ResizeObserverMock[] = []

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    ResizeObserverMock.instances.push(this)
  }

  observe = vi.fn((element: Element) => {
    this.element = element
  })

  disconnect = vi.fn()

  trigger() {
    this.callback(
      [
        {
          target: this.element!,
          contentRect:
            (this.element as HTMLElement)?.getBoundingClientRect?.() ?? DOMRect.fromRect(),
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    )
  }
}

afterEach(() => {
  document.body.innerHTML = ''
  setViewportWidth(initialViewportWidth)
  vi.restoreAllMocks()
  ResizeObserverMock.instances = []
})

describe('Masonry', () => {
  it('renders the base masonry container and renders explicit item shells', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Masonry
          columns={3}
          columnGap={20}
          rowGap={12}
          className="rounded-box"
          data-testid="masonry-root"
        >
          <MasonryItem>A</MasonryItem>
          <MasonryItem>B</MasonryItem>
        </Masonry>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="masonry-root"]') as HTMLElement
      const items = container.querySelectorAll('[data-rue-masonry-item]')

      expect(root.classList.contains('rue-masonry')).toBe(true)
      expect(root.classList.contains('rounded-box')).toBe(true)
      expect(root.getAttribute('data-rue-masonry-columns')).toBe('3')
      expect(root.getAttribute('style')).toContain('column-count:3')
      expect(root.getAttribute('style')).toContain('column-gap:20px')
      expect(root.style.getPropertyValue('--rue-masonry-row-gap')).toBe('12px')
      expect(items).toHaveLength(2)
      expect((items[0] as HTMLElement).style.width).toBe('100%')
      expect(container.textContent).toContain('A')
      expect(container.textContent).toContain('B')
    })
  })

  it('applies item layout to direct compiled child roots', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Masonry columns={2} rowGap={18} data-testid="masonry-direct-children">
          <article data-testid="direct-item-a">A</article>
          <article data-testid="direct-item-b">B</article>
        </Masonry>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="masonry-direct-children"]') as HTMLElement
      const first = container.querySelector('[data-testid="direct-item-a"]') as HTMLElement
      const second = container.querySelector('[data-testid="direct-item-b"]') as HTMLElement
      const stylesheet = root.querySelector('style')

      expect(first).toBeTruthy()
      expect(second).toBeTruthy()
      expect(stylesheet?.textContent).toContain(':not([data-rue-masonry-item])')
      expect(stylesheet?.textContent).toContain('margin-bottom: var(--rue-masonry-row-gap, 16px)')
      expect(root.style.getPropertyValue('--rue-masonry-row-gap')).toBe('18px')
    })
  })

  it('supports explicit title and description data', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Masonry
          items={[
            { id: 'a', title: 'North star', description: 'Fast path' },
            { id: 'b', title: 'Queue depth', description: 'Background sync' },
          ]}
          itemKey="id"
          itemAs="article"
          itemClassName="card border border-base-300 bg-base-100 p-4"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const items = container.querySelectorAll('[data-rue-masonry-item]')
      expect(items).toHaveLength(2)
      expect(container.textContent).toContain('North star')
      expect(container.textContent).toContain('Queue depth')
    })
  })

  it('renders the empty fallback for an empty items collection', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Masonry items={[]} empty={<div data-testid="masonry-empty">Nothing here</div>} />,
        container,
      ),
    )

    await waitForContent(() => {
      const fallback = container.querySelector('[data-testid="masonry-empty"]')

      expect(fallback).toBeTruthy()
      expect(fallback?.textContent).toBe('Nothing here')
      expect(container.querySelectorAll('[data-rue-masonry-item]')).toHaveLength(0)
    })
  })

  it('derives column count from minColumnWidth and updates after resize observer notifications', async () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock as unknown as typeof ResizeObserver)

    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Masonry minColumnWidth={220} maxColumns={4} gap={20} data-testid="masonry-auto">
          <MasonryItem>Alpha</MasonryItem>
          <MasonryItem>Beta</MasonryItem>
          <MasonryItem>Gamma</MasonryItem>
        </Masonry>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="masonry-auto"]') as HTMLElement
      expect(root).toBeTruthy()
    })

    const root = container.querySelector('[data-testid="masonry-auto"]') as HTMLElement
    Object.defineProperty(root, 'clientWidth', {
      configurable: true,
      value: 720,
    })
    ResizeObserverMock.instances[0]?.trigger()

    await waitForContent(() => {
      expect(root.getAttribute('data-rue-masonry-columns')).toBe('3')
    })

    Object.defineProperty(root, 'clientWidth', {
      configurable: true,
      value: 1100,
    })
    ResizeObserverMock.instances[0]?.trigger()

    await waitForContent(() => {
      expect(root.getAttribute('data-rue-masonry-columns')).toBe('4')
    })
  })

  it('updates responsive columns after viewport resize', async () => {
    setViewportWidth(480)

    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Masonry columns={{ xs: 1, md: 3 }} data-testid="masonry-responsive">
          <MasonryItem>One</MasonryItem>
          <MasonryItem>Two</MasonryItem>
        </Masonry>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="masonry-responsive"]') as HTMLElement
      expect(root.getAttribute('data-rue-masonry-columns')).toBe('1')
    })

    setViewportWidth(960)

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="masonry-responsive"]') as HTMLElement
      expect(root.getAttribute('data-rue-masonry-columns')).toBe('3')
    })
  })
})
