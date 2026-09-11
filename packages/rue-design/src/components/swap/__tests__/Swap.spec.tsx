import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import Swap from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Swap', () => {
  it('renders the root with modifier classes and custom className', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Swap active rotate flip className="text-2xl" data-testid="swap-root">
          <Swap.On>ON</Swap.On>
          <Swap.Off>OFF</Swap.Off>
        </Swap>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="swap-root"]') as HTMLElement
      expect(root.tagName.toLowerCase()).toBe('label')
      expect(root.classList.contains('swap')).toBe(true)
      expect(root.classList.contains('swap-active')).toBe(true)
      expect(root.classList.contains('swap-rotate')).toBe(true)
      expect(root.classList.contains('swap-flip')).toBe(true)
      expect(root.classList.contains('text-2xl')).toBe(true)
    })
  })

  it('renders an automatic checkbox in props-driven mode and emits change callbacks', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const onCheckedChange = vi.fn()
    const onChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <Swap
          checked={true}
          effect="rotate"
          inputClassName="sr-only"
          inputProps={{ name: 'newsletter' }}
          data-testid="swap-auto"
          onChange={onChange}
          onCheckedChange={onCheckedChange}
        >
          <Swap.On>Subscribed</Swap.On>
          <Swap.Off>Unsubscribed</Swap.Off>
        </Swap>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="swap-auto"]') as HTMLElement
      const input = root.querySelector('input[type="checkbox"]') as HTMLInputElement
      expect(root.dataset.rueSwapMode).toBe('input')
      expect(root.classList.contains('swap-rotate')).toBe(true)
      expect(input.checked).toBe(true)
      expect(input.classList.contains('sr-only')).toBe(true)
      expect(input.name).toBe('newsletter')
      input.checked = false
      input.dispatchEvent(new Event('change', { bubbles: true }))
      expect(onCheckedChange).toHaveBeenCalledWith(false, expect.any(Event))
      expect(onChange).toHaveBeenCalledWith(
        expect.any(Event),
        expect.objectContaining({
          checked: false,
          indeterminate: false,
          mode: 'input',
        }),
      )
      expect(input.checked).toBe(true)
    })
  })

  it('renders checkbox mode parts', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Swap data-testid="swap-checkbox">
          <input type="checkbox" checked={true} />
          <Swap.On data-testid="swap-on">ON</Swap.On>
          <Swap.Off data-testid="swap-off">OFF</Swap.Off>
        </Swap>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="swap-checkbox"]') as HTMLElement
      const input = root.querySelector('input[type="checkbox"]') as HTMLInputElement
      expect(input.checked).toBe(true)
      expect(
        container.querySelector('[data-testid="swap-on"]')?.classList.contains('swap-on'),
      ).toBe(true)
      expect(
        container.querySelector('[data-testid="swap-off"]')?.classList.contains('swap-off'),
      ).toBe(true)
    })
  })

  it('supports class mode, indeterminate part, and custom tags', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Swap as="div" data-testid="swap-class-mode">
          <Swap.Indeterminate as="span" className="text-xs" data-testid="swap-indeterminate">
            Maybe
          </Swap.Indeterminate>
        </Swap>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="swap-class-mode"]') as HTMLElement
      const indeterminate = container.querySelector(
        '[data-testid="swap-indeterminate"]',
      ) as HTMLElement
      expect(root.tagName.toLowerCase()).toBe('div')
      expect(indeterminate.tagName.toLowerCase()).toBe('span')
      expect(indeterminate.classList.contains('swap-indeterminate')).toBe(true)
      expect(indeterminate.classList.contains('text-xs')).toBe(true)
    })
  })

  it('supports default indeterminate state in automatic input mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Swap defaultIndeterminate data-testid="swap-mixed">
          <Swap.On>ON</Swap.On>
          <Swap.Indeterminate>Maybe</Swap.Indeterminate>
          <Swap.Off>OFF</Swap.Off>
        </Swap>,
        container,
      ),
    )

    await waitForContent(() => {
      const input = container.querySelector(
        '[data-testid="swap-mixed"] input[type="checkbox"]',
      ) as HTMLInputElement
      expect(input.indeterminate).toBe(true)
      expect(input.getAttribute('aria-checked')).toBe('mixed')
    })
  })
})
