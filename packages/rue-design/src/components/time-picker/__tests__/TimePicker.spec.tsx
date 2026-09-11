import { Template } from '@rue-js/rue'
import { TimePickerRangePicker } from '..'
import { mountTestApp, disposeTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, render, setReactiveScheduling } from '@rue-js/rue'
import TimePicker from '../index'
import {
  click,
  flush,
  mountContainer,
  waitForContent,
  waitForMacrotask,
} from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const mountedContainers: HTMLDivElement[] = []

const mountTestContainer = () => {
  const container = mountContainer()
  mountedContainers.push(container)
  return container
}

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

const slowTestTimeout = 30_000
const fastPickerProps = {
  minuteStep: 15,
  secondStep: 15,
} as const

afterEach(async () => {
  resetActiveRuntime()
  for (const container of mountedContainers) {
    disposeTestApp(container)
  }
  mountedContainers.length = 0
  await flush(4)
  await waitForMacrotask()
  await waitForMacrotask()
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

const waitForPickerContent = async (assertion: () => void) => {
  await waitForContent(assertion, 12)
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

const expectPopupOpen = (popup: HTMLDivElement) => {
  expect(popup.hidden).toBe(false)
  expect(popup.getAttribute('aria-hidden')).toBe('false')
  expect(popup.classList.contains('hidden')).toBe(false)
}

const expectPopupClosed = (popup: HTMLDivElement) => {
  expect(popup.hidden).toBe(true)
  expect(popup.getAttribute('aria-hidden')).toBe('true')
  expect(popup.classList.contains('hidden')).toBe(true)
}

describe('TimePicker', () => {
  it('opens only once for a single click that also focuses the input', async () => {
    const container = mountTestContainer()
    resetActiveRuntime()
    const handleOpenChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <TimePicker
          {...fastPickerProps}
          onOpenChange={handleOpenChange}
          data-testid="open-once-picker"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const input = container.querySelector('[data-testid="open-once-picker"]') as HTMLInputElement
      expect(input).toBeTruthy()
    })

    const input = container.querySelector('[data-testid="open-once-picker"]') as HTMLInputElement
    await openPicker(input)

    await waitForContent(() => {
      expect(handleOpenChange).toHaveBeenCalledTimes(1)
      expect(handleOpenChange).toHaveBeenLastCalledWith(true)
    })
  })

  it('renders the default value and updates after clicking a panel option', async () => {
    const container = mountTestContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <TimePicker
          {...fastPickerProps}
          defaultValue="09:15:15"
          onChange={handleChange}
          data-testid="time-picker-input"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const input = container.querySelector('[data-testid="time-picker-input"]') as HTMLInputElement
      expect(input.value).toBe('09:15:15')
    })

    const input = container.querySelector('[data-testid="time-picker-input"]') as HTMLInputElement
    await openPicker(input)

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-time-picker-popup="true"]') as HTMLDivElement
      const minuteButton = container.querySelector(
        'button[data-rue-time-column="minute"][data-rue-time-option="30"]',
      ) as HTMLButtonElement | null
      expect(popup).toBeTruthy()
      expect(minuteButton).toBeTruthy()
    })

    const minuteButton = container.querySelector(
      'button[data-rue-time-column="minute"][data-rue-time-option="30"]',
    ) as HTMLButtonElement
    const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
    minuteButton.dispatchEvent(mouseDownEvent)
    expect(mouseDownEvent.defaultPrevented).toBe(true)
    minuteButton.click()

    await waitForContent(() => {
      const popups = Array.from(
        container.querySelectorAll('[data-rue-time-picker-popup="true"]'),
      ) as HTMLDivElement[]
      expect(input.value).toBe('09:30:15')
      expect(popups.some(popupIsOpen)).toBe(true)
      expect(handleChange).toHaveBeenCalledTimes(1)
      expect(handleChange.mock.calls[0]?.[0]).toBe('09:30:15')
    })
  })

  it('keeps the draft selection until confirm when needConfirm is enabled', async () => {
    const container = mountTestContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <TimePicker
          {...fastPickerProps}
          defaultValue="08:00:00"
          needConfirm
          onChange={handleChange}
          data-testid="confirm-picker"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const input = container.querySelector('[data-testid="confirm-picker"]') as HTMLInputElement
      expect(input).toBeTruthy()
    })

    const input = container.querySelector('[data-testid="confirm-picker"]') as HTMLInputElement
    await openPicker(input)

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-time-picker-popup="true"]') as HTMLDivElement
      const hourButton = container.querySelector(
        'button[data-rue-time-column="hour"][data-rue-time-option="10"]',
      ) as HTMLButtonElement | null
      expect(popup).toBeTruthy()
      expect(hourButton).toBeTruthy()
    })

    const hourButton = container.querySelector(
      'button[data-rue-time-column="hour"][data-rue-time-option="10"]',
    ) as HTMLButtonElement
    hourButton.click()

    await waitForContent(() => {
      expect(input.value).toBe('08:00:00')
      expect(handleChange).toHaveBeenCalledTimes(0)
    })

    const confirmButton = container.querySelector(
      'button[data-rue-time-confirm="true"]',
    ) as HTMLButtonElement
    confirmButton.click()

    await waitForContent(() => {
      expect(input.value).toBe('10:00:00')
      expect(handleChange).toHaveBeenCalledTimes(1)
      expect(handleChange.mock.calls[0]?.[2]).toMatchObject({ source: 'confirm' })
    })
  })

  it('syncs the popup draft when a controlled value changes during needConfirm mode', async () => {
    const container = mountTestContainer()
    resetActiveRuntime()

    const ControlledCase = () => {
      const currentValue = ref('08:00:00')

      return (
        <div>
          <TimePicker
            {...fastPickerProps}
            value={currentValue}
            needConfirm
            data-testid="controlled-confirm-picker"
          />
          <button
            type="button"
            data-testid="switch-controlled-value"
            onClick={() => {
              currentValue.value = '10:30:00'
            }}
          >
            切换
          </button>
        </div>
      )
    }

    mountTestApp(container, () => render(<ControlledCase />, container))

    await waitForPickerContent(() => {
      const input = container.querySelector(
        '[data-testid="controlled-confirm-picker"]',
      ) as HTMLInputElement
      expect(input.value).toBe('08:00:00')
    })

    const input = container.querySelector(
      '[data-testid="controlled-confirm-picker"]',
    ) as HTMLInputElement
    await openPicker(input)

    await waitForPickerContent(() => {
      const hourButton = container.querySelector(
        'button[data-rue-time-column="hour"][data-rue-time-option="8"]',
      ) as HTMLButtonElement
      const minuteButton = container.querySelector(
        'button[data-rue-time-column="minute"][data-rue-time-option="0"]',
      ) as HTMLButtonElement
      expect(hourButton.getAttribute('aria-selected')).toBe('true')
      expect(hourButton.getAttribute('data-rue-time-selected')).toBe('true')
      expect(hourButton.className).toContain('bg-primary')
      expect(minuteButton.getAttribute('data-rue-time-selected')).toBe('true')
    })

    const switchButton = container.querySelector(
      '[data-testid="switch-controlled-value"]',
    ) as HTMLButtonElement
    switchButton.click()

    await waitForPickerContent(() => {
      expect(input.value).toBe('10:30:00')
      const hourButton = container.querySelector(
        'button[data-rue-time-column="hour"][data-rue-time-option="10"]',
      ) as HTMLButtonElement
      const minuteButton = container.querySelector(
        'button[data-rue-time-column="minute"][data-rue-time-option="30"]',
      ) as HTMLButtonElement
      expect(hourButton.getAttribute('aria-selected')).toBe('true')
      expect(hourButton.getAttribute('data-rue-time-selected')).toBe('true')
      expect(hourButton.className).toContain('text-primary-content')
      expect(minuteButton.getAttribute('aria-selected')).toBe('true')
      expect(minuteButton.className).toContain('bg-primary')
    })
  })

  it('hides disabled options and clears the input', async () => {
    const container = mountTestContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <TimePicker
          {...fastPickerProps}
          defaultValue="09:20:00"
          allowClear
          hideDisabledOptions
          disabledTime={() => ({
            disabledHours: () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 19, 20, 21, 22, 23],
            disabledMinutes: selectedHour => (selectedHour === 9 ? [0, 15, 30, 45] : []),
          })}
          data-testid="disabled-picker"
        />,
        container,
      ),
    )

    await waitForPickerContent(() => {
      const input = container.querySelector('[data-testid="disabled-picker"]') as HTMLInputElement
      expect(input).toBeTruthy()
    })

    const input = container.querySelector('[data-testid="disabled-picker"]') as HTMLInputElement
    await openPicker(input)

    await waitForPickerContent(() => {
      expect(
        container.querySelector('button[data-rue-time-column="hour"][data-rue-time-option="8"]'),
      ).toBeNull()
      expect(
        container.querySelector('button[data-rue-time-column="minute"][data-rue-time-option="15"]'),
      ).toBeNull()
    })

    const clearButton = container.querySelector(
      'button[aria-label="清空时间"]',
    ) as HTMLButtonElement
    clearButton.click()

    await waitForPickerContent(() => {
      expect(input.value).toBe('')
    })
  })

  it(
    'allows manual input for controlled values and restores the last valid value on invalid submit',
    async () => {
      const container = mountTestContainer()
      resetActiveRuntime()
      const handleChange = vi.fn()

      const ControlledCase = () => {
        const currentValue = ref('09:30:15')

        return (
          <TimePicker
            {...fastPickerProps}
            value={currentValue}
            onChange={nextValue => {
              currentValue.value = nextValue ?? ''
              handleChange(nextValue)
            }}
            data-testid="controlled-manual-picker"
          />
        )
      }

      mountTestApp(container, () => render(<ControlledCase />, container))

      await waitForPickerContent(() => {
        const input = container.querySelector(
          '[data-testid="controlled-manual-picker"]',
        ) as HTMLInputElement
        expect(input.value).toBe('09:30:15')
      })

      const input = container.querySelector(
        '[data-testid="controlled-manual-picker"]',
      ) as HTMLInputElement
      expect(input.readOnly).toBe(false)
      expect(input.hasAttribute('readonly')).toBe(false)
      input.value = '10:45:30'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

      await waitForPickerContent(() => {
        expect(input.value).toBe('10:45:30')
        expect(handleChange).toHaveBeenCalledTimes(1)
        expect(handleChange.mock.calls[0]?.[0]).toBe('10:45:30')
      })

      input.value = '25:61:61'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

      await waitForPickerContent(() => {
        expect(input.value).toBe('10:45:30')
        expect(handleChange).toHaveBeenCalledTimes(1)
      })
    },
    slowTestTimeout,
  )

  it(
    'keeps renderExtraFooter on the fast popup path while selecting panel options',
    async () => {
      const container = mountTestContainer()
      resetActiveRuntime()

      mountTestApp(container, () =>
        render(
          <TimePicker
            {...fastPickerProps}
            defaultValue="21:15:00"
            data-testid="manual-footer-picker"
          >
            <Template slot="footer">
              <span data-testid="time-picker-extra-footer">Manual hint</span>
            </Template>
          </TimePicker>,
          container,
        ),
      )

      await waitForPickerContent(() => {
        const input = container.querySelector(
          '[data-testid="manual-footer-picker"]',
        ) as HTMLInputElement
        expect(input.value).toBe('21:15:00')
      })

      const input = container.querySelector(
        '[data-testid="manual-footer-picker"]',
      ) as HTMLInputElement
      await openPicker(input)

      await waitForPickerContent(() => {
        expect(container.querySelector('[data-testid="time-picker-extra-footer"]')).toBeTruthy()
        expect(
          container.querySelector(
            'button[data-rue-time-column="minute"][data-rue-time-option="45"]',
          ),
        ).toBeTruthy()
      })

      await clickPanelOption(container, 'minute', '45')

      await waitForPickerContent(() => {
        const popup = container.querySelector(
          '[data-rue-time-picker-popup="true"]',
        ) as HTMLDivElement
        expect(input.value).toBe('21:45:00')
        expect(container.querySelector('[data-testid="time-picker-extra-footer"]')).toBeTruthy()
        expectPopupOpen(popup)
      })
    },
    slowTestTimeout,
  )

  it(
    'propagates panel selections to external reactive text in controlled mode',
    async () => {
      const container = mountTestContainer()
      resetActiveRuntime()

      const ControlledCase = () => {
        const currentValue = ref('09:30:15')
        const liveValue = ref('09:30:15')

        return (
          <div>
            <TimePicker
              {...fastPickerProps}
              value={currentValue}
              onChange={(nextValue, timeString) => {
                currentValue.value = nextValue ?? ''
                liveValue.value = timeString || '未选择'
              }}
              data-testid="controlled-live-picker"
            />
            <div data-testid="controlled-live-value">{liveValue.value}</div>
          </div>
        )
      }

      mountTestApp(container, () => render(<ControlledCase />, container))

      await waitForPickerContent(() => {
        const input = container.querySelector(
          '[data-testid="controlled-live-picker"]',
        ) as HTMLInputElement
        const live = container.querySelector(
          '[data-testid="controlled-live-value"]',
        ) as HTMLDivElement
        expect(input.value).toBe('09:30:15')
        expect(live.textContent).toBe('09:30:15')
      })

      const input = container.querySelector(
        '[data-testid="controlled-live-picker"]',
      ) as HTMLInputElement
      await openPicker(input)

      await waitForPickerContent(() => {
        const popup = container.querySelector(
          '[data-rue-time-picker-popup="true"]',
        ) as HTMLDivElement
        const minuteButton = container.querySelector(
          'button[data-rue-time-column="minute"][data-rue-time-option="45"]',
        ) as HTMLButtonElement | null
        expect(popup).toBeTruthy()
        expect(minuteButton).toBeTruthy()
      })

      const minuteButton = container.querySelector(
        'button[data-rue-time-column="minute"][data-rue-time-option="45"]',
      ) as HTMLButtonElement
      const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
      minuteButton.dispatchEvent(mouseDownEvent)
      expect(mouseDownEvent.defaultPrevented).toBe(true)
      minuteButton.click()

      await waitForPickerContent(() => {
        const popups = Array.from(
          container.querySelectorAll('[data-rue-time-picker-popup="true"]'),
        ) as HTMLDivElement[]
        const live = container.querySelector(
          '[data-testid="controlled-live-value"]',
        ) as HTMLDivElement
        expect(input.value).toBe('09:45:15')
        expect(live.textContent).toBe('09:45:15')
        expect(popups.some(popupIsOpen)).toBe(true)
      })
    },
    slowTestTimeout,
  )

  it(
    'keeps the popup open after selecting an hour option in controlled mode',
    async () => {
      const container = mountTestContainer()
      resetActiveRuntime()

      const ControlledCase = () => {
        const currentValue = ref('09:30:15')
        const liveValue = ref('09:30:15')

        return (
          <div>
            <TimePicker
              {...fastPickerProps}
              value={currentValue}
              onChange={(nextValue, timeString) => {
                currentValue.value = nextValue ?? ''
                liveValue.value = timeString || '未选择'
              }}
              data-testid="controlled-sequence-picker"
            />
            <div data-testid="controlled-sequence-live-value">{liveValue.value}</div>
          </div>
        )
      }

      mountTestApp(container, () => render(<ControlledCase />, container))

      await waitForPickerContent(() => {
        const input = container.querySelector(
          '[data-testid="controlled-sequence-picker"]',
        ) as HTMLInputElement
        expect(input.value).toBe('09:30:15')
      })

      const input = container.querySelector(
        '[data-testid="controlled-sequence-picker"]',
      ) as HTMLInputElement
      await openPicker(input)

      await waitForPickerContent(() => {
        expect(
          container.querySelector('button[data-rue-time-column="hour"][data-rue-time-option="10"]'),
        ).toBeTruthy()
      })

      await clickPanelOption(container, 'hour', '10')

      await waitForPickerContent(() => {
        const updatedInput = container.querySelector(
          '[data-testid="controlled-sequence-picker"]',
        ) as HTMLInputElement
        const updatedLive = container.querySelector(
          '[data-testid="controlled-sequence-live-value"]',
        ) as HTMLDivElement
        const popups = Array.from(
          container.querySelectorAll('[data-rue-time-picker-popup="true"]'),
        ) as HTMLDivElement[]
        expect(updatedInput.value).toBe('10:30:15')
        expect(updatedLive.textContent).toBe('10:30:15')
        expect(popups.some(popupIsOpen)).toBe(true)
      })
    },
    slowTestTimeout,
  )

  it(
    'keeps the popup open after selecting a minute option in controlled mode',
    async () => {
      const container = mountTestContainer()
      resetActiveRuntime()

      const ControlledCase = () => {
        const currentValue = ref('10:30:15')
        const liveValue = ref('10:30:15')

        return (
          <div>
            <TimePicker
              {...fastPickerProps}
              value={currentValue}
              onChange={(nextValue, timeString) => {
                currentValue.value = nextValue ?? ''
                liveValue.value = timeString || '未选择'
              }}
              data-testid="controlled-sequence-picker"
            />
            <div data-testid="controlled-sequence-live-value">{liveValue.value}</div>
          </div>
        )
      }

      mountTestApp(container, () => render(<ControlledCase />, container))

      await waitForPickerContent(() => {
        const input = container.querySelector(
          '[data-testid="controlled-sequence-picker"]',
        ) as HTMLInputElement
        expect(input.value).toBe('10:30:15')
      })

      const input = container.querySelector(
        '[data-testid="controlled-sequence-picker"]',
      ) as HTMLInputElement
      await openPicker(input)

      await waitForPickerContent(() => {
        expect(
          container.querySelector(
            'button[data-rue-time-column="minute"][data-rue-time-option="45"]',
          ),
        ).toBeTruthy()
      })

      await clickPanelOption(container, 'minute', '45')

      await waitForPickerContent(() => {
        const updatedInput = container.querySelector(
          '[data-testid="controlled-sequence-picker"]',
        ) as HTMLInputElement
        const updatedLive = container.querySelector(
          '[data-testid="controlled-sequence-live-value"]',
        ) as HTMLDivElement
        const popups = Array.from(
          container.querySelectorAll('[data-rue-time-picker-popup="true"]'),
        ) as HTMLDivElement[]
        expect(updatedInput.value).toBe('10:45:15')
        expect(updatedLive.textContent).toBe('10:45:15')
        expect(popups.some(popupIsOpen)).toBe(true)
      })
    },
    slowTestTimeout,
  )

  it(
    'keeps the popup open after selecting a second option in controlled mode',
    async () => {
      const container = mountTestContainer()
      resetActiveRuntime()

      const ControlledCase = () => {
        const currentValue = ref('10:45:00')
        const liveValue = ref('10:45:00')

        return (
          <div>
            <TimePicker
              {...fastPickerProps}
              secondStep={30}
              value={currentValue}
              onChange={(nextValue, timeString) => {
                currentValue.value = nextValue ?? ''
                liveValue.value = timeString || '未选择'
              }}
              data-testid="controlled-sequence-picker"
            />
            <div data-testid="controlled-sequence-live-value">{liveValue.value}</div>
          </div>
        )
      }

      mountTestApp(container, () => render(<ControlledCase />, container))

      await waitForPickerContent(() => {
        const input = container.querySelector(
          '[data-testid="controlled-sequence-picker"]',
        ) as HTMLInputElement
        expect(input.value).toBe('10:45:00')
      })

      const input = container.querySelector(
        '[data-testid="controlled-sequence-picker"]',
      ) as HTMLInputElement
      await openPicker(input)

      await waitForPickerContent(() => {
        expect(
          container.querySelector(
            'button[data-rue-time-column="second"][data-rue-time-option="30"]',
          ),
        ).toBeTruthy()
      })

      await clickPanelOption(container, 'second', '30')

      await waitForPickerContent(() => {
        const updatedInput = container.querySelector(
          '[data-testid="controlled-sequence-picker"]',
        ) as HTMLInputElement
        const updatedLive = container.querySelector(
          '[data-testid="controlled-sequence-live-value"]',
        ) as HTMLDivElement
        const popups = Array.from(
          container.querySelectorAll('[data-rue-time-picker-popup="true"]'),
        ) as HTMLDivElement[]
        expect(updatedInput.value).toBe('10:45:30')
        expect(updatedLive.textContent).toBe('10:45:30')
        expect(popups.some(popupIsOpen)).toBe(true)
      })
    },
    slowTestTimeout,
  )

  it(
    'keeps the basic controlled popup open when panel click follows an input blur',
    async () => {
      const container = mountTestContainer()
      resetActiveRuntime()

      const ControlledCase = () => {
        const currentValue = ref('09:30:15')
        const liveValue = ref('09:30:15')

        return (
          <div>
            <TimePicker
              {...fastPickerProps}
              value={currentValue}
              onInput={event => {
                liveValue.value =
                  ((event.target as HTMLInputElement | null)?.value ?? '').trim() || '未选择'
              }}
              onBlur={() => {
                setTimeout(() => {
                  liveValue.value = currentValue.value || '未选择'
                }, 0)
              }}
              onChange={(nextValue, timeString) => {
                currentValue.value = nextValue ?? ''
                liveValue.value = timeString || '未选择'
              }}
              data-testid="controlled-blur-picker"
            />
            <div data-testid="controlled-blur-live-value">{liveValue.value}</div>
          </div>
        )
      }

      mountTestApp(container, () => render(<ControlledCase />, container))

      await waitForPickerContent(() => {
        const input = container.querySelector(
          '[data-testid="controlled-blur-picker"]',
        ) as HTMLInputElement
        expect(input.value).toBe('09:30:15')
      })

      const input = container.querySelector(
        '[data-testid="controlled-blur-picker"]',
      ) as HTMLInputElement
      await openPicker(input)

      await waitForPickerContent(() => {
        expect(
          container.querySelector('button[data-rue-time-column="hour"][data-rue-time-option="10"]'),
        ).toBeTruthy()
      })

      const hourButton = container.querySelector(
        'button[data-rue-time-column="hour"][data-rue-time-option="10"]',
      ) as HTMLButtonElement
      input.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
      hourButton.click()
      input.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
      await new Promise(resolve => setTimeout(resolve, 50))

      await waitForPickerContent(() => {
        const popups = Array.from(
          container.querySelectorAll('[data-rue-time-picker-popup="true"]'),
        ) as HTMLDivElement[]
        expect(popups.some(popupIsOpen)).toBe(true)
        expect(
          container.querySelector(
            'button[data-rue-time-column="minute"][data-rue-time-option="45"]',
          ),
        ).toBeTruthy()
      })

      const minuteButton = container.querySelector(
        'button[data-rue-time-column="minute"][data-rue-time-option="45"]',
      ) as HTMLButtonElement
      input.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
      minuteButton.click()
      await new Promise(resolve => setTimeout(resolve, 50))

      await waitForPickerContent(() => {
        const popups = Array.from(
          container.querySelectorAll('[data-rue-time-picker-popup="true"]'),
        ) as HTMLDivElement[]
        expect(popups.some(popupIsOpen)).toBe(true)
        expect(
          container.querySelector(
            'button[data-rue-time-column="second"][data-rue-time-option="30"]',
          ),
        ).toBeTruthy()
      })

      const secondButton = container.querySelector(
        'button[data-rue-time-column="second"][data-rue-time-option="30"]',
      ) as HTMLButtonElement
      input.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
      secondButton.click()
      await new Promise(resolve => setTimeout(resolve, 50))

      await waitForPickerContent(() => {
        const updatedInput = container.querySelector(
          '[data-testid="controlled-blur-picker"]',
        ) as HTMLInputElement
        const updatedLive = container.querySelector(
          '[data-testid="controlled-blur-live-value"]',
        ) as HTMLDivElement
        const popups = Array.from(
          container.querySelectorAll('[data-rue-time-picker-popup="true"]'),
        ) as HTMLDivElement[]
        expect(updatedInput.value).toBe('10:45:30')
        expect(updatedLive.textContent).toBe('10:45:30')
        expect(popups.some(popupIsOpen)).toBe(true)
      })
    },
    slowTestTimeout,
  )

  it(
    'reopens after the popup is closed by an outside click',
    async () => {
      const container = mountTestContainer()
      resetActiveRuntime()

      mountTestApp(container, () =>
        render(
          <TimePicker {...fastPickerProps} defaultValue="09:30:15" data-testid="reopen-picker" />,
          container,
        ),
      )

      await waitForPickerContent(() => {
        const input = container.querySelector('[data-testid="reopen-picker"]') as HTMLInputElement
        expect(input.value).toBe('09:30:15')
      })

      const input = container.querySelector('[data-testid="reopen-picker"]') as HTMLInputElement
      await openPicker(input)

      await waitForPickerContent(() => {
        const popup = container.querySelector(
          '[data-rue-time-picker-popup="true"]',
        ) as HTMLDivElement
        expectPopupOpen(popup)
      })

      const outsideTarget = document.createElement('button')
      document.body.appendChild(outsideTarget)
      outsideTarget.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      await new Promise(resolve => setTimeout(resolve, 50))

      await waitForPickerContent(() => {
        const popup = container.querySelector(
          '[data-rue-time-picker-popup="true"]',
        ) as HTMLDivElement
        expectPopupClosed(popup)
      })

      await click(input)

      await waitForPickerContent(() => {
        const popup = container.querySelector(
          '[data-rue-time-picker-popup="true"]',
        ) as HTMLDivElement
        expectPopupOpen(popup)
        expect(
          container.querySelector('button[data-rue-time-column="hour"][data-rue-time-option="10"]'),
        ).toBeTruthy()
      })
    },
    slowTestTimeout,
  )

  it(
    'reopens after closing from keyboard and clear actions',
    async () => {
      const container = mountTestContainer()
      resetActiveRuntime()

      mountTestApp(container, () =>
        render(
          <TimePicker
            {...fastPickerProps}
            defaultValue="09:30:15"
            allowClear
            data-testid="keyboard-reopen-picker"
          />,
          container,
        ),
      )

      await waitForPickerContent(() => {
        const input = container.querySelector(
          '[data-testid="keyboard-reopen-picker"]',
        ) as HTMLInputElement
        expect(input.value).toBe('09:30:15')
      })

      const input = container.querySelector(
        '[data-testid="keyboard-reopen-picker"]',
      ) as HTMLInputElement
      await openPicker(input)

      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

      await waitForPickerContent(() => {
        const popup = container.querySelector(
          '[data-rue-time-picker-popup="true"]',
        ) as HTMLDivElement
        expectPopupClosed(popup)
      })

      await click(input)

      await waitForPickerContent(() => {
        const popup = container.querySelector(
          '[data-rue-time-picker-popup="true"]',
        ) as HTMLDivElement
        expectPopupOpen(popup)
      })

      const clearButton = container.querySelector(
        'button[data-rue-time-clear="true"]',
      ) as HTMLButtonElement
      clearButton.click()

      await waitForPickerContent(() => {
        const popup = container.querySelector(
          '[data-rue-time-picker-popup="true"]',
        ) as HTMLDivElement
        expect(input.value).toBe('')
        expectPopupClosed(popup)
      })

      await click(input)

      await waitForPickerContent(() => {
        const popup = container.querySelector(
          '[data-rue-time-picker-popup="true"]',
        ) as HTMLDivElement
        expectPopupOpen(popup)
        expect(
          container.querySelector('button[data-rue-time-column="hour"][data-rue-time-option="0"]'),
        ).toBeTruthy()
      })
    },
    slowTestTimeout,
  )

  it(
    'orders range values after a start time is changed past the end time',
    async () => {
      const container = mountTestContainer()
      resetActiveRuntime()
      const handleChange = vi.fn()

      mountTestApp(container, () =>
        render(
          <TimePickerRangePicker
            {...fastPickerProps}
            defaultValue={['09:00:00', '18:00:00']}
            onChange={handleChange}
          />,
          container,
        ),
      )

      await waitForContent(() => {
        const inputs = container.querySelectorAll('input') as NodeListOf<HTMLInputElement>
        expect(inputs.length).toBe(2)
        expect(inputs[0].value).toBe('09:00:00')
        expect(inputs[1].value).toBe('18:00:00')
      })

      const inputs = container.querySelectorAll('input') as NodeListOf<HTMLInputElement>
      await openPicker(inputs[0])

      await waitForContent(() => {
        const popup = container.querySelector(
          '[data-rue-time-picker-popup="true"]',
        ) as HTMLDivElement
        const hourButton = container.querySelector(
          'button[data-rue-time-column="hour"][data-rue-time-option="20"]',
        ) as HTMLButtonElement | null
        expect(popup).toBeTruthy()
        expect(hourButton).toBeTruthy()
      })

      const hourButton = container.querySelector(
        'button[data-rue-time-column="hour"][data-rue-time-option="20"]',
      ) as HTMLButtonElement
      hourButton.click()

      await waitForContent(() => {
        expect(handleChange).toHaveBeenCalledTimes(1)
        expect(handleChange.mock.calls[0]?.[0]).toEqual(['18:00:00', '20:00:00'])
      })
    },
    slowTestTimeout,
  )

  it(
    'keeps controlled range input text visible after panel selections',
    async () => {
      const container = mountTestContainer()
      resetActiveRuntime()

      const ControlledRange = () => {
        const rangeValue = ref<[string | null, string | null]>(['09:00:00', '18:30:00'])

        return (
          <div>
            <TimePickerRangePicker
              {...fastPickerProps}
              value={rangeValue}
              allowClear
              onChange={nextValues => {
                rangeValue.value = nextValues
              }}
            />
            <div data-testid="range-start-value">{rangeValue.value[0]}</div>
            <div data-testid="range-end-value">{rangeValue.value[1]}</div>
          </div>
        )
      }

      mountTestApp(container, () => render(<ControlledRange />, container))

      await waitForContent(() => {
        const inputs = container.querySelectorAll('input') as NodeListOf<HTMLInputElement>
        const rangeRoot = container.querySelector(
          '[data-rue-time-range-picker-version]',
        ) as HTMLDivElement
        const pickerRoots = Array.from(rangeRoot.children).filter(child =>
          (child as HTMLElement).querySelector('[data-rue-time-picker="true"]'),
        ) as HTMLElement[]
        expect(inputs.length).toBe(2)
        expect(rangeRoot.className).toContain('w-full')
        expect(pickerRoots.length).toBe(2)
        expect(pickerRoots[0].className).toContain('flex-1')
        expect(pickerRoots[1].className).toContain('flex-1')
        expect(inputs[0].value).toBe('09:00:00')
        expect(inputs[1].value).toBe('18:30:00')
      })

      const inputs = container.querySelectorAll('input') as NodeListOf<HTMLInputElement>
      await openPicker(inputs[0])

      await waitForContent(() => {
        expect(
          container.querySelector('button[data-rue-time-column="hour"][data-rue-time-option="15"]'),
        ).toBeTruthy()
      })

      await clickPanelOption(container, 'hour', '15')
      await clickPanelOption(container, 'minute', '15')
      await clickPanelOption(container, 'second', '15')

      await waitForContent(() => {
        const nextInputs = container.querySelectorAll('input') as NodeListOf<HTMLInputElement>
        const startValue = container.querySelector('[data-testid="range-start-value"]')
        const endValue = container.querySelector('[data-testid="range-end-value"]')
        expect(nextInputs.length).toBe(2)
        expect(nextInputs[0].value).toBe('15:15:15')
        expect(nextInputs[1].value).toBe('18:30:00')
        expect(startValue?.textContent).toBe('15:15:15')
        expect(endValue?.textContent).toBe('18:30:00')
      })
    },
    slowTestTimeout,
  )
})
