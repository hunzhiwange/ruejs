import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref, render, setReactiveScheduling } from '@rue-js/rue'
import Rating from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

const mockRect = (element: HTMLElement, width = 20) => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: width,
      bottom: width,
      width,
      height: width,
      toJSON: () => ({}),
    }),
  })
}

describe('Rating', () => {
  it('renders manual mode with size and half modifiers', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Rating size="lg" half={true} className="gap-1">
          <Rating.Item
            name="score"
            className="mask mask-star-2 mask-half-1"
            aria-label="0.5 star"
          />
        </Rating>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('.rating') as HTMLElement
      expect(root.classList.contains('rating-lg')).toBe(true)
      expect(root.classList.contains('rating-half')).toBe(true)
      expect(root.classList.contains('gap-1')).toBe(true)
    })
  })

  it('syncs manual item checked state after parent value changes', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const score = ref('2')

    const Demo = () => (
      <Rating>
        <Rating.Item name="manual-rating" value="1" checked={score.value === '1'} />
        <Rating.Item name="manual-rating" value="2" checked={score.value === '2'} />
        <Rating.Item name="manual-rating" value="3" checked={score.value === '3'} />
      </Rating>
    )

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      const items = Array.from(
        container.querySelectorAll<HTMLInputElement>('input[name="manual-rating"]'),
      )
      expect(items.map(item => item.checked)).toEqual([false, true, false])
    })

    score.value = '3'

    await waitForContent(() => {
      const items = Array.from(
        container.querySelectorAll<HTMLInputElement>('input[name="manual-rating"]'),
      )
      expect(items.map(item => item.checked)).toEqual([false, false, true])
    })
  })

  it('renders auto items from count and allows clearing the current value', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Rating count={4} defaultValue={3} name="score" itemClassName="text-primary" />,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-rating-mode="auto"]') as HTMLElement
      const items = container.querySelectorAll('button[data-rating-index]')
      const firstButton = container.querySelector(
        'button[data-rating-index="0"]',
      ) as HTMLButtonElement
      const hidden = container.querySelector(
        'input[type="hidden"][name="score"]',
      ) as HTMLInputElement
      const defaultStar = container.querySelector('.mask.mask-star') as HTMLElement
      expect(items).toHaveLength(4)
      expect(root.getAttribute('data-rating-value')).toBe('3')
      expect(firstButton.classList.contains('opacity-100')).toBe(true)
      expect(hidden.value).toBe('3')
      expect(defaultStar).not.toBeNull()
      expect(defaultStar.classList.contains('opacity-100')).toBe(true)
      expect(defaultStar.classList.contains('bg-orange-400')).toBe(true)
    })

    const third = container.querySelector('button[data-rating-index="2"]') as HTMLButtonElement
    third.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      const root = container.querySelector('[data-rating-mode="auto"]') as HTMLElement
      const hidden = container.querySelector(
        'input[type="hidden"][name="score"]',
      ) as HTMLInputElement
      expect(root.getAttribute('data-rating-value')).toBe('0')
      expect(hidden.value).toBe('0')
    })
  })

  it('keeps legacy auto mask opacity in sync when the value changes', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () => render(<Rating defaultValue={3} allowClear={false} />, container))

    await waitForContent(() => {
      expect(container.querySelectorAll('button[data-rating-index]').length).toBe(5)
    })

    const fifth = container.querySelector('button[data-rating-index="4"]') as HTMLButtonElement
    fifth.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      const root = container.querySelector('[data-rating-mode="auto"]') as HTMLElement
      const masks = Array.from(
        container.querySelectorAll('[data-rating-legacy-mask="true"]'),
      ) as HTMLElement[]
      expect(root.getAttribute('data-rating-value')).toBe('5')
      expect(masks).toHaveLength(5)
      expect(masks[4].style.opacity).toBe('1')
      expect(masks[0].style.opacity).toBe('1')
      expect(masks[4].classList.contains('bg-orange-400')).toBe(true)
    })
  })

  it('supports controlled half values, tooltips and custom characters', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()
    const handleHoverChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <Rating
          value={2.5}
          allowHalf={true}
          tooltips={['terrible', 'bad', 'okay', 'good', 'wonderful']}
          character="A"
          onChange={handleChange}
          onHoverChange={handleHoverChange}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-rating-mode="auto"]') as HTMLElement
      const third = container.querySelector('button[data-rating-index="2"]') as HTMLButtonElement
      const firstShell = container.querySelector(
        'button[data-rating-index="0"] > span',
      ) as HTMLElement
      const activeLayer = container.querySelector(
        '[data-rating-active-layer="true"] span',
      ) as HTMLElement
      expect(root.getAttribute('data-rating-value')).toBe('2.5')
      expect(third.title).toBe('okay')
      expect(firstShell.children).toHaveLength(2)
      expect(container.querySelectorAll('[data-rating-character="custom"]')).toHaveLength(10)
      expect(activeLayer.classList.contains('text-orange-400')).toBe(true)
    })

    const third = container.querySelector('button[data-rating-index="2"]') as HTMLButtonElement
    const root = container.querySelector('[data-rating-mode="auto"]') as HTMLElement
    mockRect(third, 20)

    third.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 1 }))
    await waitForContent(() => {
      expect(root.getAttribute('data-rating-hover')).toBe('2.5')
      expect(handleHoverChange).toHaveBeenLastCalledWith(2.5)
    })

    third.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 18 }))
    expect(handleChange).toHaveBeenCalledWith(3)
    expect(root.getAttribute('data-rating-value')).toBe('2.5')

    root.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    await waitForContent(() => {
      expect(root.getAttribute('data-rating-hover')).toBe('')
      expect(handleHoverChange).toHaveBeenLastCalledWith(0)
    })
  })

  it('syncs controlled half-step visuals after the parent value updates', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const score = ref(3.5)

    const Demo = () => (
      <Rating
        value={score.value}
        allowHalf={true}
        onChange={next => {
          score.value = next
        }}
      />
    )

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      expect(container.querySelectorAll('button[data-rating-index]').length).toBe(5)
    })

    const fifth = container.querySelector('button[data-rating-index="4"]') as HTMLButtonElement
    mockRect(fifth, 20)
    fifth.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 1 }))

    await waitForContent(() => {
      const root = container.querySelector('[data-rating-mode="auto"]') as HTMLElement
      const activeLayers = Array.from(
        container.querySelectorAll('[data-rating-active-layer="true"]'),
      ) as HTMLElement[]
      const activeLayerSpans = Array.from(
        container.querySelectorAll('[data-rating-active-layer="true"] > span'),
      ) as HTMLElement[]
      expect(root.getAttribute('data-rating-value')).toBe('4.5')
      expect(activeLayers[4].style.width).toBe('50%')
      expect(activeLayers[3].style.width).toBe('100%')
      expect(activeLayerSpans[4].classList.contains('text-orange-400')).toBe(true)
    })
  })

  it('supports hidden radio items and read-only node tags in manual mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Rating>
          <Rating.Item data-testid="clear-item" hidden={true} name="score" aria-label="clear" />
          <Rating.Item
            as="div"
            data-testid="display-item"
            className="mask mask-heart bg-red-400"
            aria-label="1 star"
          />
        </Rating>,
        container,
      ),
    )

    await waitForContent(() => {
      const clearItem = container.querySelector('[data-testid="clear-item"]') as HTMLInputElement
      const displayItem = container.querySelector('[data-testid="display-item"]') as HTMLElement
      expect(clearItem.classList.contains('rating-hidden')).toBe(true)
      expect(displayItem.tagName.toLowerCase()).toBe('div')
      expect(displayItem.classList.contains('mask-heart')).toBe(true)
    })
  })
})
