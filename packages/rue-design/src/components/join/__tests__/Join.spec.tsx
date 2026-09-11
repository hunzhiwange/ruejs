import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'
import Join from '../index'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Join', () => {
  it('renders the root with base class and children', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Join className="bg-base-100">
          <Join.Item>One</Join.Item>
          <Join.Item>Two</Join.Item>
        </Join>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('.join') as HTMLElement
      expect(root).toBeTruthy()
      expect(root.classList.contains('bg-base-100')).toBe(true)
      expect(root.querySelectorAll('.join-item').length).toBe(2)
      expect(root.textContent).toContain('One')
      expect(root.textContent).toContain('Two')
    })
  })

  it('applies root modifiers and supports rendering as a custom tag', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Join as="section" direction="vertical" wrap block data-testid="join-root">
          <Join.Item>A</Join.Item>
        </Join>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="join-root"]') as HTMLElement
      expect(root.tagName.toLowerCase()).toBe('section')
      expect(root.classList.contains('join')).toBe(true)
      expect(root.classList.contains('join-vertical')).toBe(true)
      expect(root.classList.contains('flex')).toBe(true)
      expect(root.classList.contains('flex-wrap')).toBe(true)
      expect(root.classList.contains('w-full')).toBe(true)
    })
  })

  it('renders join items with arbitrary host tags and forwards attrs', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Join>
          <Join.Item tag="input" className="input" placeholder="Search" data-testid="join-input" />
          <Join.Item tag="select" className="select" data-testid="join-select">
            <option>Filter</option>
          </Join.Item>
        </Join>,
        container,
      ),
    )

    await waitForContent(() => {
      const input = container.querySelector('[data-testid="join-input"]') as HTMLInputElement
      const select = container.querySelector('[data-testid="join-select"]') as HTMLSelectElement
      expect(input.tagName.toLowerCase()).toBe('input')
      expect(input.classList.contains('join-item')).toBe(true)
      expect(input.classList.contains('input')).toBe(true)
      expect(input.placeholder).toBe('Search')
      expect(select.tagName.toLowerCase()).toBe('select')
      expect(select.classList.contains('join-item')).toBe(true)
      expect(select.classList.contains('select')).toBe(true)
    })
  })

  it('renders items from the data-driven api', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Join
          itemClassName="btn btn-sm"
          items={[
            { key: 'back', label: 'Back' },
            { key: 'publish', label: 'Publish', className: 'btn-primary' },
          ]}
          data-testid="join-items"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="join-items"]') as HTMLElement
      const items = root.querySelectorAll('.join-item')
      expect(items.length).toBe(2)
      expect(items[0].textContent).toBe('Back')
      expect(items[0].classList.contains('btn')).toBe(true)
      expect(items[0].classList.contains('btn-sm')).toBe(true)
      expect(items[1].classList.contains('btn-primary')).toBe(true)
    })
  })

  it('supports active and disabled item semantics', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Join>
          <Join.Item active className="btn" data-testid="join-active">
            Active
          </Join.Item>
          <Join.Item
            as="a"
            href="#disabled"
            disabled
            className="btn"
            data-testid="join-disabled-link"
          >
            Disabled link
          </Join.Item>
          <Join.Item disabled data-testid="join-disabled-button">
            Disabled button
          </Join.Item>
        </Join>,
        container,
      ),
    )

    await waitForContent(() => {
      const active = container.querySelector('[data-testid="join-active"]') as HTMLButtonElement
      const disabledLink = container.querySelector(
        '[data-testid="join-disabled-link"]',
      ) as HTMLAnchorElement
      const disabledButton = container.querySelector(
        '[data-testid="join-disabled-button"]',
      ) as HTMLButtonElement
      expect(active.classList.contains('btn-active')).toBe(true)
      expect(disabledLink.classList.contains('btn-disabled')).toBe(true)
      expect(disabledLink.getAttribute('aria-disabled')).toBe('true')
      expect(disabledLink.getAttribute('href')).toBeNull()
      expect(disabledButton.disabled).toBe(true)
    })
  })
})
