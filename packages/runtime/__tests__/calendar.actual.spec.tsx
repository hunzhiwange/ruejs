import { readFileSync } from 'node:fs'

import { type FC, ref } from '@rue-js/rue'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import Calendar from '../../../packages/rue-design/src/components/calendar'
import { render, click, flush, mountContainer } from './page-test-utils'

const formatIsoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const MinimalCalendarPreview: FC<{ initialValue?: string }> = props => {
  const selectedValue = ref(props.initialValue ?? '2026-04-12')
  const selectedSource = ref('date')
  const panelMode = ref<'month' | 'year'>('month')

  return (
    <div className="space-y-4">
      <Calendar
        data-testid="basic-calendar"
        fullscreen={false}
        value={selectedValue.value}
        mode={panelMode.value}
        onChange={date => {
          selectedValue.value = formatIsoDate(date)
        }}
        onPanelChange={(_date, nextMode) => {
          panelMode.value = nextMode
        }}
        onSelect={(_date, info) => {
          selectedSource.value = info.source
        }}
      />
      <div data-testid="calendar-selected-value">{selectedValue.value}</div>
      <div data-testid="calendar-selected-source">{selectedSource.value}</div>
    </div>
  )
}

vi.mock('../../../app/pages/site/SidebarPlaygroundDesign', () => ({
  default: (props: { children?: unknown }) => (
    <div data-testid="mock-sidebar-design">{props.children}</div>
  ),
}))

vi.mock('../../../app/pages/site/components/Code', () => ({
  default: () => null,
}))

setReactiveScheduling('sync')

const calendarPageSource = readFileSync(`${process.cwd()}/app/pages/design/Calendar.tsx`, 'utf8')
const calendarPreviewSource = readFileSync(
  `${process.cwd()}/app/pages/design/calendar/LegacyCalendarPreviews.tsx`,
  'utf8',
)

let sharedPreviewContainer: HTMLDivElement | null = null

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('Calendar actual page', () => {
  describe('basic calendar preview', () => {
    beforeAll(async () => {
      sharedPreviewContainer = mountContainer()
      render(<MinimalCalendarPreview />, sharedPreviewContainer)
      await flush(6)
    })

    afterAll(() => {
      if (sharedPreviewContainer) {
        render(null, sharedPreviewContainer)
        sharedPreviewContainer = null
      }
      document.body.innerHTML = ''
    })

    it('updates the basic calendar preview after selecting a date', async () => {
      const container = sharedPreviewContainer as HTMLDivElement

      expect(container.querySelector('[data-rue-calendar-root="true"]')).not.toBeNull()
      expect(container.querySelector('[data-rue-calendar-cell="2026-04-15"]')).not.toBeNull()

      const targetDate = container.querySelector(
        '[data-rue-calendar-cell="2026-04-15"]',
      ) as HTMLButtonElement | null
      await click(targetDate)

      await flush(6)

      expect(container.querySelector('[data-testid="calendar-selected-value"]')?.textContent).toBe(
        '2026-04-15',
      )
      expect(container.querySelector('[data-testid="calendar-selected-source"]')?.textContent).toBe(
        'date',
      )
    })

    it('switches the basic calendar preview between month and year panels', async () => {
      const container = sharedPreviewContainer as HTMLDivElement

      await click(container.querySelector('[data-rue-calendar-mode-switch="year"]'))

      await flush(6)

      expect(
        container
          .querySelector('[data-testid="basic-calendar"]')
          ?.getAttribute('data-rue-calendar-mode'),
      ).toBe('year')
      expect(container.querySelectorAll('[data-rue-calendar-month]').length).toBe(12)

      await click(container.querySelector('[data-rue-calendar-mode-switch="month"]'))

      await flush(6)

      expect(
        container
          .querySelector('[data-testid="basic-calendar"]')
          ?.getAttribute('data-rue-calendar-mode'),
      ).toBe('month')
      expect(container.querySelectorAll('[data-rue-calendar-cell]').length).toBe(42)
    })
  })

  it('keeps native calendar demos available without manual load buttons', async () => {
    expect(calendarPageSource).toContain('Calendar 日历')
    expect(calendarPageSource).toContain('title="Notice calendar"')
    expect(calendarPageSource).toContain('title="Card mode"')
    expect(calendarPageSource).toContain('title="Custom header"')
    expect(calendarPageSource).not.toContain('加载预览')
  })

  it('keeps legacy calendar demos available without manual load buttons', async () => {
    expect(calendarPageSource).toContain('title="Cally calendar example"')
    expect(calendarPageSource).toContain('title="Cally date picker example"')
    expect(calendarPageSource).toContain('title="Pikaday input example"')
    expect(calendarPageSource).not.toContain('加载预览')
    expect(calendarPreviewSource).toContain('Loading Cally...')
    expect(calendarPreviewSource).toContain('Loading Pikaday...')
    expect(calendarPreviewSource).toContain('输入框已挂上真实 Pikaday 实例')
  })
})
