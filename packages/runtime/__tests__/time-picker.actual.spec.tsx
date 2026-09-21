import { type FC, ref } from '@rue-js/rue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'

vi.mock('../../../app/pages/site/SidebarPlaygroundDesign', () => ({
  default: (props: { children?: unknown }) => (
    <div data-testid="mock-sidebar-design">{props.children}</div>
  ),
}))

vi.mock('../../../app/pages/site/components/Code', () => ({
  default: () => null,
}))

import TimePicker from '../../../packages/rue-design/src/components/time-picker/index'
import { BasicControlledPreview } from '../../../app/pages/design/TimePicker'
import { render, click, flush, mountContainer, waitForContent } from './page-test-utils'
import { resetActiveRuntime } from './design-page-test-utils'

setReactiveScheduling('sync')

const mountedContainers: HTMLDivElement[] = []
const slowTestTimeout = 30_000
const MinimalControlledPreview: FC<{ initialValue?: string }> = props => {
  const initialValue = props.initialValue ?? '09:30:15'
  const value = ref(initialValue)
  const liveValue = ref(initialValue)

  return (
    <div className="grid gap-4">
      <TimePicker
        value={value}
        minuteStep={15}
        secondStep={15}
        onChange={(nextValue, timeString) => {
          value.value = nextValue ?? ''
          liveValue.value = timeString || '未选择'
        }}
      />
      <div data-testid="time-picker-live-value">{liveValue.value}</div>
    </div>
  )
}

const mountTestContainer = () => {
  const container = mountContainer()
  mountedContainers.push(container)
  return container
}

afterEach(async () => {
  resetActiveRuntime()
  for (const container of mountedContainers) {
    render(null as any, container)
  }
  mountedContainers.length = 0
  await flush(2)
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.restoreAllMocks()
})

beforeEach(() => {
  setReactiveScheduling('sync')
  resetActiveRuntime()
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const openPicker = async (input: HTMLInputElement) => {
  input.dispatchEvent(new FocusEvent('focus', { bubbles: true }))
  await click(input)
}

const clickPanelOption = async (
  container: HTMLDivElement,
  column: 'hour' | 'minute' | 'second' | 'meridiem',
  option: string,
) => {
  const button = container.querySelector(
    `button[data-rue-time-column="${column}"][data-rue-time-option="${option}"]`,
  ) as HTMLButtonElement
  const pointerDownEvent = new PointerEvent('pointerdown', { bubbles: true, cancelable: true })
  button.dispatchEvent(pointerDownEvent)
  expect(pointerDownEvent.defaultPrevented).toBe(true)
  const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  button.dispatchEvent(mouseDownEvent)
  expect(mouseDownEvent.defaultPrevented).toBe(true)
  await click(button)
}

const popupIsOpen = (popup: HTMLDivElement) => {
  return (
    !popup.hidden &&
    popup.getAttribute('aria-hidden') === 'false' &&
    !popup.classList.contains('hidden')
  )
}

describe('TimePicker actual page', () => {
  it('cancels deferred scroll restoration when unmounted', async () => {
    vi.useFakeTimers()
    const container = mountTestContainer()
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 42)
    const cancelAnimationFrame = vi.spyOn(window, 'cancelAnimationFrame')

    render(<MinimalControlledPreview />, container)
    await vi.advanceTimersByTimeAsync(0)

    const input = container.querySelector('input') as HTMLInputElement
    await openPicker(input)
    await vi.advanceTimersByTimeAsync(0)
    await clickPanelOption(container, 'minute', '45')

    render(null as any, container)

    expect(cancelAnimationFrame).toHaveBeenCalledWith(42)
    expect(vi.getTimerCount()).toBe(0)
  })

  it(
    'updates the basic live value after selecting a panel option',
    async () => {
      const container = mountTestContainer()
      resetActiveRuntime()
      render(<MinimalControlledPreview />, container)

      await flush(4)

      const initialInput = container.querySelector('input') as HTMLInputElement
      const initialLiveValue = container.querySelector(
        '[data-testid="time-picker-live-value"]',
      ) as HTMLDivElement
      expect(initialInput.value).toBe('09:30:15')
      expect(initialLiveValue.textContent).toBe('09:30:15')

      await openPicker(initialInput)

      await flush(4)

      const popup = container.querySelector('[data-rue-time-picker-popup="true"]') as HTMLDivElement
      const minuteButton = container.querySelector(
        'button[data-rue-time-column="minute"][data-rue-time-option="45"]',
      ) as HTMLButtonElement | null
      expect(popup).toBeTruthy()
      expect(minuteButton).toBeTruthy()

      await clickPanelOption(container, 'minute', '45')

      await flush(4)

      await waitForContent(() => {
        const updatedInput = container.querySelector('input') as HTMLInputElement
        const updatedLiveValue = container.querySelector(
          '[data-testid="time-picker-live-value"]',
        ) as HTMLDivElement
        const popups = Array.from(
          container.querySelectorAll('[data-rue-time-picker-popup="true"]'),
        ) as HTMLDivElement[]
        expect(updatedInput.value).toBe('09:45:15')
        expect(updatedLiveValue.textContent).toBe('09:45:15')
        expect(popups.some(popupIsOpen)).toBe(true)
      })
    },
    slowTestTimeout,
  )

  it(
    'keeps the basic controlled preview popup open after selecting an hour option',
    async () => {
      const container = mountTestContainer()
      resetActiveRuntime()
      render(<MinimalControlledPreview />, container)

      const assertPopupOpen = () => {
        const popups = Array.from(
          container.querySelectorAll('[data-rue-time-picker-popup="true"]'),
        ) as HTMLDivElement[]
        expect(popups.some(popupIsOpen)).toBe(true)
      }

      await flush(4)

      const initialInput = container.querySelector('input') as HTMLInputElement
      const initialLiveValue = container.querySelector(
        '[data-testid="time-picker-live-value"]',
      ) as HTMLDivElement
      expect(initialInput.value).toBe('09:30:15')
      expect(initialLiveValue.textContent).toBe('09:30:15')

      await openPicker(initialInput)

      await flush(4)

      expect(
        container.querySelector('button[data-rue-time-column="hour"][data-rue-time-option="10"]'),
      ).toBeTruthy()

      await clickPanelOption(container, 'hour', '10')

      await flush(4)

      await waitForContent(() => {
        const updatedInput = container.querySelector('input') as HTMLInputElement
        const updatedLiveValue = container.querySelector(
          '[data-testid="time-picker-live-value"]',
        ) as HTMLDivElement
        expect(updatedInput.value).toBe('10:30:15')
        expect(updatedLiveValue.textContent).toBe('10:30:15')
        assertPopupOpen()
      })
    },
    slowTestTimeout,
  )

  it(
    'keeps the basic controlled preview popup open after selecting a second option',
    async () => {
      const container = mountTestContainer()
      resetActiveRuntime()
      render(<MinimalControlledPreview initialValue="10:45:15" />, container)

      const assertPopupOpen = () => {
        const popups = Array.from(
          container.querySelectorAll('[data-rue-time-picker-popup="true"]'),
        ) as HTMLDivElement[]
        expect(popups.some(popupIsOpen)).toBe(true)
      }

      await flush(4)

      const initialInput = container.querySelector('input') as HTMLInputElement
      const initialLiveValue = container.querySelector(
        '[data-testid="time-picker-live-value"]',
      ) as HTMLDivElement
      expect(initialInput.value).toBe('10:45:15')
      expect(initialLiveValue.textContent).toBe('10:45:15')

      await openPicker(initialInput)

      await flush(4)

      expect(
        container.querySelector('button[data-rue-time-column="second"][data-rue-time-option="30"]'),
      ).toBeTruthy()

      await clickPanelOption(container, 'second', '30')

      await flush(4)

      await waitForContent(() => {
        const updatedInput = container.querySelector('input') as HTMLInputElement
        const updatedLiveValue = container.querySelector(
          '[data-testid="time-picker-live-value"]',
        ) as HTMLDivElement
        expect(updatedInput.value).toBe('10:45:30')
        expect(updatedLiveValue.textContent).toBe('10:45:30')
        assertPopupOpen()
      })
    },
    slowTestTimeout,
  )

  it(
    'keeps the documented basic controlled preview open while selecting hour minute and second',
    async () => {
      const container = mountTestContainer()
      resetActiveRuntime()
      render(<BasicControlledPreview />, container)

      await flush(4)

      const input = container.querySelector('input') as HTMLInputElement
      expect(input.value).toBe('09:30:15')
      expect(input.readOnly).toBe(false)
      expect(input.hasAttribute('readonly')).toBe(false)

      input.focus()
      input.dispatchEvent(new FocusEvent('focus', { bubbles: true }))
      input.value = '21:30:15'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

      await waitForContent(() => {
        const liveValue = container.querySelector(
          '.mt-2.text-2xl.font-semibold.text-base-content',
        ) as HTMLDivElement
        expect(input.value).toBe('21:30:15')
        expect(liveValue.textContent).toBe('21:30:15')
      })

      const currentInputBeforePanel = container.querySelector('input') as HTMLInputElement
      await openPicker(currentInputBeforePanel)
      await flush(4)

      await clickPanelOption(container, 'hour', '10')
      await flush(4)

      await waitForContent(() => {
        const currentInput = container.querySelector('input') as HTMLInputElement
        expect(currentInput.value).toBe('10:30:15')
      })

      await openPicker(container.querySelector('input') as HTMLInputElement)
      await flush(4)
      await clickPanelOption(container, 'minute', '45')
      await flush(4)

      await waitForContent(() => {
        const currentInput = container.querySelector('input') as HTMLInputElement
        expect(currentInput.value).toBe('10:45:15')
      })

      await openPicker(container.querySelector('input') as HTMLInputElement)
      await flush(4)
      await clickPanelOption(container, 'second', '30')
      await flush(4)

      await waitForContent(() => {
        const currentInput = container.querySelector('input') as HTMLInputElement
        const liveValue = container.querySelector(
          '.mt-2.text-2xl.font-semibold.text-base-content',
        ) as HTMLDivElement
        expect(currentInput.value).toBe('10:45:30')
        expect(liveValue.textContent).toBe('10:45:30')
      })
    },
    slowTestTimeout,
  )
})
