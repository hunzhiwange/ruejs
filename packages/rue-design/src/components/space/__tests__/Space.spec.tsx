import { mountTestApp } from '../../__tests__/app-lifecycle'
import { SpaceCompactItem, SpaceItem } from '..'
import { afterEach, describe, expect, it } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import Space from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Space', () => {
  it('renders a horizontal space container with preset gap', async () => {
    const container = mountContainer()

    mountTestApp(container, () =>
      render(
        <Space className="custom-space" data-testid="space-root">
          <button className="btn">One</button>
          <button className="btn">Two</button>
        </Space>,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="space-root"]') as HTMLElement
      expect(element.classList.contains('rue-space')).toBe(true)
      expect(element.classList.contains('custom-space')).toBe(true)
      expect(element.style.columnGap).toBe('var(--rue-theme-space-sm, 8px)')
      expect(element.style.alignItems).toBe('center')
      expect(element.children.length).toBe(2)
    })
  })

  it('supports vertical orientation, tuple gap and wrapping', async () => {
    const container = mountContainer()

    mountTestApp(container, () =>
      render(
        <Space vertical size={[24, 12]} wrap data-testid="space-vertical">
          <span>Alpha</span>
          <span>Beta</span>
        </Space>,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="space-vertical"]') as HTMLElement
      expect(element.style.flexDirection).toBe('column')
      expect(element.style.columnGap).toBe('24px')
      expect(element.style.rowGap).toBe('12px')
      expect(element.style.flexWrap).toBe('wrap')
      expect(element.getAttribute('aria-orientation')).toBe('vertical')
    })
  })

  it('renders separators between items', async () => {
    const container = mountContainer()

    mountTestApp(container, () =>
      render(
        <Space data-testid="space-separator">
          <SpaceItem showSeparator separator="/">
            Docs
          </SpaceItem>
          <SpaceItem showSeparator separator="/">
            API
          </SpaceItem>
          <SpaceItem>Theme</SpaceItem>
        </Space>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="space-separator"]') as HTMLElement
      expect(root.textContent).toContain('Docs')
      expect(root.textContent).toContain('Theme')
      expect(container.querySelectorAll('.rue-space-separator').length).toBe(2)
    })
  })

  it('supports custom tags and block layout', async () => {
    const container = mountContainer()

    mountTestApp(container, () =>
      render(<Space as="section" block id="space-block" data-testid="space-block" />, container),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="space-block"]') as HTMLElement
      expect(element.tagName.toLowerCase()).toBe('section')
      expect(element.id).toBe('space-block')
      expect(element.style.display).toBe('flex')
      expect(element.style.width).toBe('100%')
    })
  })
})

describe('Space.Compact', () => {
  it('merges adjacent child radii in horizontal groups', async () => {
    const container = mountContainer()

    mountTestApp(container, () =>
      render(
        <Space.Compact data-testid="compact-root">
          <SpaceCompactItem index={0} total={3}>
            <button className="btn">Left</button>
          </SpaceCompactItem>
          <SpaceCompactItem index={1} total={3}>
            <button className="btn">Middle</button>
          </SpaceCompactItem>
          <SpaceCompactItem index={2} total={3}>
            <button className="btn">Right</button>
          </SpaceCompactItem>
        </Space.Compact>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="compact-root"]') as HTMLElement
      const items = root.querySelectorAll('[data-rue-space-compact-item]')
      expect(root.getAttribute('aria-orientation')).toBe('horizontal')
      expect(items[0].className).toContain('rounded-r-none')
      expect(items[1].className).toContain('rounded-l-none')
      expect(items[1].className).toContain('rounded-r-none')
      expect(items[2].className).toContain('rounded-l-none')
    })
  })

  it('supports vertical block groups and compact wrappers', async () => {
    const container = mountContainer()

    mountTestApp(container, () =>
      render(
        <Space.Compact vertical block size="small" data-testid="compact-vertical">
          <SpaceCompactItem index={0} total={2}>
            <input className="input" value="Search" />
          </SpaceCompactItem>
          <SpaceCompactItem index={1} total={2}>
            <button className="btn">Run</button>
          </SpaceCompactItem>
        </Space.Compact>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="compact-vertical"]') as HTMLElement
      const items = root.querySelectorAll('[data-rue-space-compact-item]')
      expect(root.style.flexDirection).toBe('column')
      expect(root.style.width).toBe('100%')
      expect(items[0].className).toContain('w-full')
      expect(items[1].className).toContain('w-full')
      expect((items[0] as HTMLElement).style.fontSize).toBe('0.875rem')
    })
  })
})
