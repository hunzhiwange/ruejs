import { mountTestApp, disposeTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, render, setReactiveScheduling } from '@rue-js/rue'
import Calendar, { createCalendarSelectabilityResolver } from '../index'
import {
  click,
  mountContainer,
  waitForContent,
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

const getCalendarModeSwitch = (container: HTMLElement, testId: string, mode: 'month' | 'year') =>
  container
    .querySelector(`[data-testid="${testId}"]`)
    ?.querySelector(`[data-rue-calendar-mode-switch="${mode}"]`) ?? null

const changeSelect = (element: Element | null, value: string) => {
  expect(element).not.toBeNull()
  const select = element as HTMLSelectElement
  select.value = value
  select.dispatchEvent(new Event('change', { bubbles: true }))
}

const formatIsoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const slowTestTimeout = 25_000

afterEach(() => {
  resetActiveRuntime()
  for (const container of mountedContainers) {
    disposeTestApp(container)
  }
  mountedContainers.length = 0
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

describe('Calendar', () => {
  it(
    'renders the enhanced calendar panel by default and supports date selection',
    async () => {
      const c = mountTestContainer()
      const onChange = vi.fn()
      const ControlledCalendar = () => {
        const value = ref('2026-04-12')

        return (
          <Calendar
            data-testid="calendar-root"
            locale="en-US"
            value={value.value}
            onChange={date => {
              value.value = formatIsoDate(date)
              onChange(date)
            }}
          />
        )
      }

      resetActiveRuntime()
      mountTestApp(c, () => render(<ControlledCalendar />, c))

      await waitForContent(() => {
        const root = c.querySelector('[data-testid="calendar-root"]') as HTMLElement
        expect(root).toBeTruthy()
        expect(root.getAttribute('data-rue-calendar-mode')).toBe('month')
        expect(c.querySelectorAll('[data-rue-calendar-cell]').length).toBe(42)
        expect(root.textContent).toContain('April')
        expect(
          c.querySelector('[data-rue-calendar-cell="2026-04-12"]')?.getAttribute('aria-pressed'),
        ).toBe('true')
      })

      await click(c.querySelector('[data-rue-calendar-cell="2026-04-18"]'))

      await waitForContent(() => {
        expect(onChange).toHaveBeenCalledTimes(1)
        expect(formatIsoDate(onChange.mock.calls[0]?.[0] as Date)).toBe('2026-04-18')
      })
    },
    slowTestTimeout,
  )

  it(
    'switches between month and year modes from the controlled default panel',
    async () => {
      const c = mountTestContainer()
      const onPanelChange = vi.fn()
      const ControlledCalendar = () => {
        const mode = ref<'month' | 'year'>('month')

        return (
          <Calendar
            data-testid="calendar-root"
            locale="zh-CN"
            value="2026-04-12"
            mode={mode.value}
            showWeek
            validRange={[new Date('2026-04-01T00:00:00'), new Date('2026-05-31T00:00:00')]}
            disabledDate={date => date.getDay() === 0 || date.getDay() === 6}
            onPanelChange={(date, nextMode) => {
              mode.value = nextMode
              onPanelChange(date, nextMode)
            }}
          />
        )
      }

      resetActiveRuntime()
      mountTestApp(c, () => render(<ControlledCalendar />, c))

      await waitForContent(() => {
        const root = c.querySelector('[data-testid="calendar-root"]') as HTMLElement
        expect(root.getAttribute('data-rue-calendar-mode')).toBe('month')
        expect(c.querySelectorAll('[data-rue-calendar-cell]').length).toBe(42)
      })

      await click(c.querySelector('[data-rue-calendar-mode-switch="year"]'))

      await waitForContent(() => {
        const root = c.querySelector('[data-testid="calendar-root"]') as HTMLElement
        expect(root.getAttribute('data-rue-calendar-mode')).toBe('year')
        expect(c.querySelectorAll('[data-rue-calendar-month]').length).toBe(12)
      })

      await click(c.querySelector('[data-rue-calendar-mode-switch="month"]'))

      await waitForContent(() => {
        const root = c.querySelector('[data-testid="calendar-root"]') as HTMLElement
        expect(root.getAttribute('data-rue-calendar-mode')).toBe('month')
        expect(c.querySelectorAll('[data-rue-calendar-cell]').length).toBe(42)
      })

      expect(onPanelChange).toHaveBeenCalledWith(expect.any(Date), 'year')
      expect(onPanelChange).toHaveBeenCalledWith(expect.any(Date), 'month')
    },
    slowTestTimeout,
  )

  it(
    'updates controlled value and mode from a custom header',
    async () => {
      const c = mountTestContainer()

      const ControlledCustomHeader = () => {
        const value = ref('2026-07-04')
        const mode = ref<'month' | 'year'>('month')

        return (
          <div>
            <Calendar
              data-testid="custom-header-calendar"
              locale="zh-CN"
              value={value.value}
              mode={mode.value}
              headerTitleFormatter={date => `${date.getFullYear()}-${date.getMonth() + 1}`}
              onChange={date => {
                value.value = formatIsoDate(date)
              }}
              onPanelChange={(_date, nextMode) => {
                mode.value = nextMode
              }}
            />
            <span data-testid="external-value">{value.value}</span>
            <span data-testid="external-mode">{mode.value}</span>
          </div>
        )
      }

      resetActiveRuntime()
      mountTestApp(c, () => render(<ControlledCustomHeader />, c))

      await waitForContent(() => {
        const root = c.querySelector('[data-testid="custom-header-calendar"]') as HTMLElement
        const header = c.querySelector('[data-rue-calendar-header="true"]') as HTMLElement
        expect(root.getAttribute('data-rue-calendar-mode')).toBe('month')
        expect(header.getAttribute('data-current')).toBe('2026-7')
        expect(header.getAttribute('data-mode')).toBe('month')
        expect(c.querySelector('[data-testid="external-value"]')?.textContent).toBe('2026-07-04')
      })

      changeSelect(c.querySelector('[data-rue-calendar-year-select="true"]'), '2027')

      await waitForContent(() => {
        const header = c.querySelector('[data-rue-calendar-header="true"]') as HTMLElement
        expect(header.getAttribute('data-current')).toBe('2027-7')
        expect(c.querySelector('[data-testid="external-value"]')?.textContent).toBe('2027-07-04')
      })

      changeSelect(c.querySelector('[data-rue-calendar-month-select="true"]'), '10')

      await waitForContent(() => {
        const header = c.querySelector('[data-rue-calendar-header="true"]') as HTMLElement
        expect(header.getAttribute('data-current')).toBe('2027-11')
        expect(c.querySelector('[data-testid="external-value"]')?.textContent).toBe('2027-11-04')
      })

      await click(c.querySelector('[data-rue-calendar-mode-switch="year"]'))

      await waitForContent(() => {
        const root = c.querySelector('[data-testid="custom-header-calendar"]') as HTMLElement
        const header = c.querySelector('[data-rue-calendar-header="true"]') as HTMLElement
        expect(root.getAttribute('data-rue-calendar-mode')).toBe('year')
        expect(header.getAttribute('data-mode')).toBe('year')
        expect(c.querySelector('[data-testid="external-mode"]')?.textContent).toBe('year')
      })
    },
    slowTestTimeout,
  )

  it(
    'keeps custom header interactions off the jsx fallback',
    async () => {
      const c = mountTestContainer()
      const onRenderProfile = vi.fn()

      const ControlledCustomHeader = () => {
        const value = ref('2026-07-04')
        const mode = ref<'month' | 'year'>('month')

        return (
          <Calendar
            data-testid="optimized-custom-header-calendar"
            locale="zh-CN"
            value={value.value}
            mode={mode.value}
            onRenderProfile={onRenderProfile}
            headerTitleFormatter={date => formatIsoDate(date)}
            onChange={date => {
              value.value = formatIsoDate(date)
            }}
            onPanelChange={(_date, nextMode) => {
              mode.value = nextMode
            }}
          />
        )
      }

      resetActiveRuntime()
      mountTestApp(c, () => render(<ControlledCustomHeader />, c))

      await waitForContent(() => {
        const root = c.querySelector(
          '[data-testid="optimized-custom-header-calendar"]',
        ) as HTMLElement
        const header = c.querySelector('[data-rue-calendar-header="true"]') as HTMLElement
        expect(root.getAttribute('data-rue-calendar-mode')).toBe('month')
        expect(header.getAttribute('data-current')).toBe('2026-07-04')
        expect(onRenderProfile).toHaveBeenCalled()
      })

      onRenderProfile.mockClear()
      await click(c.querySelector('[data-rue-calendar-cell="2026-07-12"]'))

      await waitForContent(() => {
        const header = c.querySelector('[data-rue-calendar-header="true"]') as HTMLElement
        expect(header.getAttribute('data-current')).toBe('2026-07-12')
        expect(
          c.querySelector('[data-rue-calendar-cell="2026-07-12"]')?.getAttribute('aria-pressed'),
        ).toBe('true')
        expect(onRenderProfile).toHaveBeenCalled()
      })

      const dateProfile = onRenderProfile.mock.calls[onRenderProfile.mock.calls.length - 1]?.[0]
      expect(dateProfile).toMatchObject({
        component: 'Calendar',
        mode: 'month',
        phase: 'compiled',
      })

      onRenderProfile.mockClear()
      await click(c.querySelector('[data-rue-calendar-mode-switch="year"]'))

      await waitForContent(() => {
        const root = c.querySelector(
          '[data-testid="optimized-custom-header-calendar"]',
        ) as HTMLElement
        const header = c.querySelector('[data-rue-calendar-header="true"]') as HTMLElement
        expect(root.getAttribute('data-rue-calendar-mode')).toBe('year')
        expect(header.getAttribute('data-mode')).toBe('year')
        expect(c.querySelectorAll('[data-rue-calendar-month]').length).toBe(12)
        expect(onRenderProfile).toHaveBeenCalled()
      })

      const modeProfile = onRenderProfile.mock.calls[onRenderProfile.mock.calls.length - 1]?.[0]
      expect(modeProfile).toMatchObject({
        component: 'Calendar',
        mode: 'year',
        phase: 'compiled',
      })
    },
    slowTestTimeout,
  )

  it(
    'keeps compact card width stable when switching to year mode',
    async () => {
      const c = mountTestContainer()

      const CompactCardCalendar = () => {
        const value = ref('2026-09-18')
        const mode = ref<'month' | 'year'>('month')

        return (
          <Calendar
            data-testid="compact-calendar"
            locale="zh-CN"
            fullscreen={false}
            className="w-[34rem] max-w-none"
            value={value.value}
            mode={mode.value}
            onChange={date => {
              value.value = formatIsoDate(date)
            }}
            onPanelChange={(_date, nextMode) => {
              mode.value = nextMode
            }}
          />
        )
      }

      resetActiveRuntime()
      mountTestApp(c, () => render(<CompactCardCalendar />, c))

      let initialClassName = ''
      await waitForContent(() => {
        const root = c.querySelector('[data-testid="compact-calendar"]') as HTMLElement
        expect(root.getAttribute('data-rue-calendar-mode')).toBe('month')
        expect(root.className).toContain('w-full')
        expect(root.className).toContain('max-w-[24rem]')
        expect(root.className).toContain('w-[34rem]')
        expect(root.className).toContain('max-w-none')
        expect(root.className).not.toContain('w-fit')
        expect(root.firstElementChild?.className).toContain('px-3 py-3')
        initialClassName = root.className
      })

      await click(c.querySelector('[data-rue-calendar-mode-switch="year"]'))

      await waitForContent(() => {
        const root = c.querySelector('[data-testid="compact-calendar"]') as HTMLElement
        expect(root.getAttribute('data-rue-calendar-mode')).toBe('year')
        expect(root.className).toBe(initialClassName)
        expect(root.firstElementChild?.className).toContain('px-3 py-3')
        expect(c.querySelectorAll('[data-rue-calendar-month]').length).toBe(12)
      })
    },
    slowTestTimeout,
  )

  it('supports year mode and custom month cell rendering', async () => {
    const c = mountTestContainer()
    resetActiveRuntime()
    mountTestApp(c, () =>
      render(
        <Calendar
          data-testid="year-calendar"
          locale="en-US"
          mode="year"
          defaultValue={new Date('2026-09-01T00:00:00')}
          validRange={[new Date('2026-03-01T00:00:00'), new Date('2026-10-31T00:00:00')]}
          cellFormatter={(date, info) =>
            info.type === 'month' && date.getMonth() === 8 ? '43' : null
          }
        />,
        c,
      ),
    )

    await waitForContent(() => {
      const root = c.querySelector('[data-testid="year-calendar"]') as HTMLElement
      expect(root.getAttribute('data-rue-calendar-mode')).toBe('year')
      expect(c.querySelectorAll('[data-rue-calendar-month]').length).toBe(12)
      expect(c.querySelector('[data-rue-calendar-detail="2026-09"]')?.textContent).toBe('43')

      const january = c.querySelector('[data-rue-calendar-month="2026-01"]') as HTMLButtonElement
      const september = c.querySelector('[data-rue-calendar-month="2026-09"]') as HTMLButtonElement
      expect(january.disabled).toBe(true)
      expect(september.disabled).toBe(false)
    })
  })

  it(
    'updates custom date cells through the optimized managed html path',
    async () => {
      const c = mountTestContainer()
      const cellFormatter = vi.fn((date: Date, info: any) => {
        if (info.type !== 'date') return null
        return info.selected ? 'selected' : 'idle'
      })
      const onRenderProfile = vi.fn()

      const ControlledCalendar = () => {
        const value = ref('2026-04-12')
        const mode = ref<'month' | 'year'>('month')

        return (
          <Calendar
            data-testid="custom-calendar"
            locale="en-US"
            value={value.value}
            mode={mode.value}
            cellFormatter={cellFormatter}
            onRenderProfile={onRenderProfile}
            onChange={date => {
              value.value = formatIsoDate(date)
            }}
            onPanelChange={(_date, nextMode) => {
              mode.value = nextMode
            }}
          />
        )
      }

      resetActiveRuntime()
      mountTestApp(c, () => render(<ControlledCalendar />, c))

      await waitForContent(() => {
        expect(c.querySelector('[data-testid="custom-calendar"]')).toBeTruthy()
        expect(c.querySelector('[data-rue-calendar-detail="2026-04-12"]')?.textContent).toBe(
          'selected',
        )
        expect(cellFormatter).toHaveBeenCalledTimes(42)
      })

      cellFormatter.mockClear()
      onRenderProfile.mockClear()
      await click(c.querySelector('[data-rue-calendar-cell="2026-04-18"]'))

      await waitForContent(() => {
        expect(c.querySelector('[data-rue-calendar-detail="2026-04-12"]')?.textContent).toBe('idle')
        expect(c.querySelector('[data-rue-calendar-detail="2026-04-18"]')?.textContent).toBe(
          'selected',
        )
        expect(cellFormatter).toHaveBeenCalledTimes(42)
        expect(onRenderProfile).toHaveBeenCalled()
      })

      const profile = onRenderProfile.mock.calls[onRenderProfile.mock.calls.length - 1]?.[0]
      expect(profile).toMatchObject({
        component: 'Calendar',
        mode: 'month',
        phase: 'compiled',
        customRenderCount: 42,
        cellFormatterCount: 42,
      })
    },
    slowTestTimeout,
  )

  it(
    'renders custom month backlog through the optimized year view path',
    async () => {
      const c = mountTestContainer()
      const cellFormatter = vi.fn((date: Date, info: any) => {
        if (info.type !== 'month') return null
        const backlog: Record<number, number> = {
          3: 28,
          8: 43,
        }
        return backlog[date.getMonth()] ? backlog[date.getMonth()] : null
      })
      const onRenderProfile = vi.fn()

      const ControlledCalendar = () => {
        const value = ref('2026-04-12')
        const mode = ref<'month' | 'year'>('month')

        return (
          <Calendar
            data-testid="notice-calendar"
            locale="zh-CN"
            value={value.value}
            mode={mode.value}
            cellFormatter={cellFormatter}
            onRenderProfile={onRenderProfile}
            onChange={date => {
              value.value = formatIsoDate(date)
            }}
            onPanelChange={(_date, nextMode) => {
              mode.value = nextMode
            }}
          />
        )
      }

      resetActiveRuntime()
      mountTestApp(c, () => render(<ControlledCalendar />, c))

      await waitForContent(() => {
        expect(c.querySelector('[data-testid="notice-calendar"]')).toBeTruthy()
        expect(c.querySelectorAll('[data-rue-calendar-cell]').length).toBe(42)
      })

      cellFormatter.mockClear()
      onRenderProfile.mockClear()
      await click(c.querySelector('[data-rue-calendar-mode-switch="year"]'))

      await waitForContent(() => {
        const root = c.querySelector('[data-testid="notice-calendar"]') as HTMLElement
        expect(root.getAttribute('data-rue-calendar-mode')).toBe('year')
        expect(c.querySelectorAll('[data-rue-calendar-month]').length).toBe(12)
        expect(c.querySelector('[data-rue-calendar-detail="2026-09"]')?.textContent).toBe('43')
        expect(cellFormatter).toHaveBeenCalledTimes(12)
        expect(onRenderProfile).toHaveBeenCalled()
      })

      const profile = onRenderProfile.mock.calls[onRenderProfile.mock.calls.length - 1]?.[0]
      expect(profile).toMatchObject({
        component: 'Calendar',
        mode: 'year',
        phase: 'compiled',
        customRenderCount: 12,
        cellFormatterCount: 12,
      })
    },
    slowTestTimeout,
  )

  it(
    'keeps notice and card calendar panel modes independent on the same page',
    async () => {
      const c = mountTestContainer()

      const DualCalendarPreview = () => {
        const noticeValue = ref('2026-04-12')
        const noticeMode = ref<'month' | 'year'>('month')
        const cardValue = ref('2026-09-18')
        const cardMode = ref<'month' | 'year'>('month')

        return (
          <div>
            <Calendar
              data-testid="notice-calendar"
              locale="zh-CN"
              value={noticeValue.value}
              mode={noticeMode.value}
              cellFormatter={(date, info) =>
                info.type === 'month' && date.getMonth() === 8 ? '43' : null
              }
              onChange={date => {
                noticeValue.value = formatIsoDate(date)
              }}
              onPanelChange={(_date, nextMode) => {
                noticeMode.value = nextMode
              }}
            />
            <Calendar
              data-testid="card-calendar"
              locale="zh-CN"
              fullscreen={false}
              value={cardValue.value}
              mode={cardMode.value}
              cellFormatter={(date, info) =>
                info.type === 'date' && formatIsoDate(date) === '2026-09-18' ? '92%' : null
              }
              onChange={date => {
                cardValue.value = formatIsoDate(date)
              }}
              onPanelChange={(_date, nextMode) => {
                cardMode.value = nextMode
              }}
            />
          </div>
        )
      }

      resetActiveRuntime()
      mountTestApp(c, () => render(<DualCalendarPreview />, c))

      await waitForContent(() => {
        expect(
          (c.querySelector('[data-testid="notice-calendar"]') as HTMLElement).getAttribute(
            'data-rue-calendar-mode',
          ),
        ).toBe('month')
        expect(
          (c.querySelector('[data-testid="card-calendar"]') as HTMLElement).getAttribute(
            'data-rue-calendar-mode',
          ),
        ).toBe('month')
      })

      await click(getCalendarModeSwitch(c, 'notice-calendar', 'year'))

      await waitForContent(() => {
        expect(
          (c.querySelector('[data-testid="notice-calendar"]') as HTMLElement).getAttribute(
            'data-rue-calendar-mode',
          ),
        ).toBe('year')
        expect(
          (c.querySelector('[data-testid="card-calendar"]') as HTMLElement).getAttribute(
            'data-rue-calendar-mode',
          ),
        ).toBe('month')
      })

      await click(getCalendarModeSwitch(c, 'card-calendar', 'year'))

      await waitForContent(() => {
        expect(
          (c.querySelector('[data-testid="notice-calendar"]') as HTMLElement).getAttribute(
            'data-rue-calendar-mode',
          ),
        ).toBe('year')
        expect(
          (c.querySelector('[data-testid="card-calendar"]') as HTMLElement).getAttribute(
            'data-rue-calendar-mode',
          ),
        ).toBe('year')
        expect(c.querySelector('[data-rue-calendar-detail="2026-09"]')?.textContent).toBe('43')
      })
    },
    slowTestTimeout,
  )

  it('reuses cached selectability results when switching between month and year modes', async () => {
    const disabledDate = vi.fn((date: Date) => date.getDay() === 0 || date.getDay() === 6)
    const currentValue = new Date('2026-04-12T00:00:00')
    const { resolveMonthSelectable, resolveYearSelectable } = createCalendarSelectabilityResolver(
      [new Date('2026-04-01T00:00:00'), new Date('2026-05-31T00:00:00')],
      disabledDate,
    )

    expect(resolveMonthSelectable(currentValue)).toBe(true)
    expect(disabledDate).toHaveBeenCalled()

    const initialCallCount = disabledDate.mock.calls.length

    expect(resolveYearSelectable(currentValue)).toBe(true)
    expect(disabledDate).toHaveBeenCalledTimes(initialCallCount)

    expect(resolveMonthSelectable(currentValue)).toBe(true)
    expect(disabledDate).toHaveBeenCalledTimes(initialCallCount)
  })

  it('preserves Cally and Pikaday wrapper subcomponents', async () => {
    const c = mountTestContainer()
    resetActiveRuntime()
    mountTestApp(c, () =>
      render(
        <div>
          <Calendar.Cally data-testid="cally-host">
            <Calendar.Month className="rounded-box" data-testid="month-host" />
          </Calendar.Cally>
          <Calendar.PikaSingle id="picker" className="input input-bordered" value="Pick a day" />
        </div>,
        c,
      ),
    )

    await waitForContent(() => {
      const cally = c.querySelector('[data-testid="cally-host"]') as HTMLElement
      const month = c.querySelector('[data-testid="month-host"]') as HTMLElement
      const el = c.querySelector('input.pika-single') as HTMLInputElement
      expect(cally.tagName.toLowerCase()).toBe('calendar-date')
      expect(cally.classList.contains('cally')).toBe(true)
      expect(month.tagName.toLowerCase()).toBe('calendar-month')
      expect(month.classList.contains('rounded-box')).toBe(true)
      expect(el).toBeTruthy()
      expect(el.type).toBe('text')
      expect(el.id).toBe('picker')
      expect(el.classList.contains('input')).toBe(true)
      expect(el.classList.contains('input-bordered')).toBe(true)
      expect(el.value).toBe('Pick a day')
    })
  })
})
