import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import Indicator from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Indicator', () => {
  it('renders the root container with the base class', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Indicator className="max-w-xs" data-testid="indicator-root">
          content
        </Indicator>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="indicator-root"]') as HTMLElement
      expect(root.classList.contains('indicator')).toBe(true)
      expect(root.classList.contains('max-w-xs')).toBe(true)
    })
  })

  it('renders indicator-item with placement modifiers', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Indicator>
          <Indicator.Item horizontal="center" vertical="bottom" data-testid="indicator-item">
            Apply
          </Indicator.Item>
        </Indicator>,
        container,
      ),
    )

    await waitForContent(() => {
      const item = container.querySelector('[data-testid="indicator-item"]') as HTMLElement
      expect(item.classList.contains('indicator-item')).toBe(true)
      expect(item.classList.contains('indicator-center')).toBe(true)
      expect(item.classList.contains('indicator-bottom')).toBe(true)
    })
  })

  it('supports placement shorthand and lets explicit props override it', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Indicator>
          <Indicator.Item
            placement="bottom-start"
            horizontal="center"
            data-testid="indicator-item-placement"
          >
            Review
          </Indicator.Item>
        </Indicator>,
        container,
      ),
    )

    await waitForContent(() => {
      const item = container.querySelector(
        '[data-testid="indicator-item-placement"]',
      ) as HTMLElement
      expect(item.classList.contains('indicator-item')).toBe(true)
      expect(item.classList.contains('indicator-center')).toBe(true)
      expect(item.classList.contains('indicator-bottom')).toBe(true)
      expect(item.classList.contains('indicator-start')).toBe(false)
    })
  })

  it('renders root shorthand item and applies offset through CSS variables', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Indicator
          item="9"
          itemProps={{
            'data-testid': 'indicator-shortcut-content',
            placement: 'top-end',
            offset: [10, 6],
            className: 'badge badge-primary',
          }}
        >
          <button data-testid="indicator-shortcut-target" className="btn">
            Inbox
          </button>
        </Indicator>,
        container,
      ),
    )

    await waitForContent(() => {
      const item = container.querySelector('.indicator-item.badge.badge-primary') as HTMLElement
      const content = container.querySelector(
        '[data-testid="indicator-shortcut-content"]',
      ) as HTMLElement
      const target = container.querySelector(
        '[data-testid="indicator-shortcut-target"]',
      ) as HTMLElement

      expect(item).toBeTruthy()
      expect(content.textContent).toBe('9')
      expect(target.textContent).toContain('Inbox')
      expect(item.style.getPropertyValue('--indicator-e')).toBe('calc(0px - 10px)')
      expect(item.style.getPropertyValue('--indicator-t')).toBe('calc(0px + 6px)')
    })
  })

  it('supports multiple shorthand items', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Indicator
          items={[
            {
              key: 'presence',
              text: 'live',
              'data-testid': 'indicator-presence',
              className: 'badge badge-success',
            },
            {
              key: 'cta',
              as: 'div',
              placement: 'bottom-center',
              text: 'Apply',
              'data-testid': 'indicator-cta',
            },
          ]}
        >
          <div className="card" data-testid="indicator-card">
            Card
          </div>
        </Indicator>,
        container,
      ),
    )

    await waitForContent(() => {
      const items = container.querySelectorAll('.indicator-item')
      const cta = container.querySelector('[data-testid="indicator-cta"]') as HTMLElement
      expect(items).toHaveLength(2)
      expect(container.querySelector('[data-testid="indicator-presence"]')?.textContent).toBe(
        'live',
      )
      expect(cta.closest('.indicator-bottom')).not.toBeNull()
      expect(cta.closest('.indicator-center')).not.toBeNull()
    })
  })
})
