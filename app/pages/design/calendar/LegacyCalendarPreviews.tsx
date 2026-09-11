import type { FC } from '@rue-js/rue'
import { onMounted, onUnmounted, ref, useRef } from '@rue-js/rue'
import { Calendar } from '@rue-js/design'
type CallyElement = HTMLElement & { value?: string }
type PikadayInstance = { destroy?: () => void }
type PikadayConstructor = new (options: Record<string, unknown>) => PikadayInstance

interface CalendarExternalLoaders {
  cally?: () => Promise<unknown>
  pikaday?: () => Promise<unknown>
}

interface PreviewStatusProps {
  ready: boolean
  readyLabel: string
  loadingLabel: string
  error: string
}

let callyReadyPromise: Promise<void> | null = null
let pikadayCtorPromise: Promise<PikadayConstructor> | null = null

const getCalendarExternalLoaders = () => {
  return (globalThis as { __RUE_CALENDAR_EXTERNALS__?: CalendarExternalLoaders })
    .__RUE_CALENDAR_EXTERNALS__
}

const ensureCally = async () => {
  if (typeof window === 'undefined' || typeof customElements === 'undefined') {
    return
  }

  if (!callyReadyPromise) {
    callyReadyPromise = (async () => {
      const loaders = getCalendarExternalLoaders()
      if (!customElements.get('calendar-date')) {
        await (loaders?.cally ? loaders.cally() : import('cally'))
      }
      if (customElements.get('calendar-date') && typeof customElements.whenDefined === 'function') {
        await customElements.whenDefined('calendar-date')
      }
    })()
  }

  await callyReadyPromise
}

const ensurePikaday = async () => {
  if (!pikadayCtorPromise) {
    const loaders = getCalendarExternalLoaders()
    pikadayCtorPromise = (loaders?.pikaday ? loaders.pikaday() : import('pikaday')).then(module => {
      return ((module as any).default ?? module) as PikadayConstructor
    })
  }

  return pikadayCtorPromise
}

const formatIsoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatSelectedDate = (value: string, fallback = '未选择') => value || fallback
const formatPickerLabel = (value: string) => value || 'Pick a date'

const PreviewStatus: FC<PreviewStatusProps> = ({ ready, readyLabel, loadingLabel, error }) => {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <span className={`badge ${ready ? 'badge-success badge-soft' : 'badge-outline'}`}>
        {ready ? readyLabel : loadingLabel}
      </span>
      {error ? <span className="badge badge-error badge-soft">{error}</span> : null}
    </div>
  )
}

const PreviousIcon: FC = () => {
  return (
    <svg
      aria-label="Previous"
      className="fill-current size-4"
      slot="previous"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
    >
      <path fill="currentColor" d="M15.75 19.5 8.25 12l7.5-7.5"></path>
    </svg>
  )
}

const NextIcon: FC = () => {
  return (
    <svg
      aria-label="Next"
      className="fill-current size-4"
      slot="next"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
    >
      <path fill="currentColor" d="m8.25 4.5 7.5 7.5-7.5 7.5"></path>
    </svg>
  )
}

export const CallyCalendarPreview: FC = () => {
  const calendarRef = useRef<CallyElement>()
  const cleanupRef = useRef<() => void>(() => {})
  const selectedValue = ref('2026-04-12')
  const ready = ref(false)
  const error = ref('')

  onMounted(() => {
    let active = true

    void ensureCally()
      .then(() => {
        if (!active) {
          return
        }

        ready.value = true
        const calendar = calendarRef.current
        if (!calendar) {
          return
        }

        calendar.value = selectedValue.value
        const handleChange = () => {
          selectedValue.value = calendar.value || ''
        }

        calendar.addEventListener('change', handleChange)
        cleanupRef.current = () => calendar.removeEventListener('change', handleChange)
      })
      .catch(() => {
        if (active) {
          error.value = 'Cally 加载失败'
        }
      })

    onUnmounted(() => {
      active = false
    })
  })

  onUnmounted(() => {
    cleanupRef.current?.()
    cleanupRef.current = () => {}
  })

  return (
    <div className="space-y-3">
      <Calendar.Cally
        ref={calendarRef}
        data-testid="cally-calendar"
        className="border border-base-300 bg-base-100 shadow-lg rounded-box"
      >
        <PreviousIcon />
        <NextIcon />
        <Calendar.Month />
      </Calendar.Cally>
      <PreviewStatus
        ready={ready.value}
        readyLabel="Cally ready"
        loadingLabel="Loading Cally..."
        error={error.value}
      />
      <p className="m-0 text-xs text-base-content/70">
        当前选择：{formatSelectedDate(selectedValue.value)}。这条示例 原样保持，用于展示原生 web
        component 接口。
      </p>
    </div>
  )
}

export const CallyDatePickerPreview: FC = () => {
  const calendarRef = useRef<CallyElement>()
  const cleanupRef = useRef<() => void>(() => {})
  const selectedValue = ref('')
  const open = ref(false)
  const ready = ref(false)
  const error = ref('')

  onMounted(() => {
    let active = true

    void ensureCally()
      .then(() => {
        if (!active) {
          return
        }

        ready.value = true
        const calendar = calendarRef.current
        if (!calendar) {
          return
        }

        calendar.value = selectedValue.value
        const handleChange = () => {
          selectedValue.value = calendar.value || ''
          open.value = false
        }

        calendar.addEventListener('change', handleChange)
        cleanupRef.current = () => calendar.removeEventListener('change', handleChange)
      })
      .catch(() => {
        if (active) {
          error.value = 'Cally 加载失败'
        }
      })

    onUnmounted(() => {
      active = false
    })
  })

  onUnmounted(() => {
    cleanupRef.current?.()
    cleanupRef.current = () => {}
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="cally-picker-button"
          className="input input-bordered w-fit cursor-pointer"
          onClick={() => {
            open.value = !open.value
          }}
        >
          {formatPickerLabel(selectedValue.value)}
        </button>
        <span className="text-xs text-base-content/70">
          当前选择：{formatSelectedDate(selectedValue.value)}
        </span>
      </div>
      <div
        data-testid="cally-picker-panel"
        className={`inline-block rounded-box bg-base-100 p-3 shadow-lg ${open.value ? '' : 'hidden'}`}
      >
        <Calendar.Cally ref={calendarRef} data-testid="cally-picker-calendar">
          <PreviousIcon />
          <NextIcon />
          <Calendar.Month />
        </Calendar.Cally>
      </div>
      <PreviewStatus
        ready={ready.value}
        readyLabel="Cally ready"
        loadingLabel="Loading Cally..."
        error={error.value}
      />
      <p className="m-0 text-xs text-base-content/70">
        点击按钮展开面板，选中日期后会自动回填并收起。这条基础示例 同样完整保持。
      </p>
    </div>
  )
}

export const PikadayCalendarPreview: FC = () => {
  const inputRef = useRef<HTMLInputElement>()
  const instanceRef = useRef<PikadayInstance | null>()
  const selectedValue = ref('')
  const ready = ref(false)
  const error = ref('')

  onMounted(() => {
    let active = true

    void ensurePikaday()
      .then(Pikaday => {
        if (!active) {
          return
        }

        const field = inputRef.current
        if (!field) {
          return
        }

        instanceRef.current = new Pikaday({
          field,
          defaultDate: new Date('2026-04-12T00:00:00'),
          setDefaultDate: true,
          toString: (date: Date) => formatIsoDate(date),
          onSelect: (date: Date) => {
            selectedValue.value = field.value || formatIsoDate(date)
          },
        })
        field.setAttribute('data-pikaday-ready', 'true')
        selectedValue.value = field.value || '2026-04-12'
        ready.value = true
      })
      .catch(() => {
        if (active) {
          error.value = 'Pikaday 加载失败'
        }
      })

    onUnmounted(() => {
      active = false
    })
  })

  onUnmounted(() => {
    instanceRef.current?.destroy?.()
    instanceRef.current = null
  })

  return (
    <div className="space-y-3">
      <Calendar.PikaSingle
        ref={inputRef}
        data-testid="pikaday-cdn-input"
        className="input input-bordered w-full max-w-xs"
        placeholder="Pick a day"
      />
      <PreviewStatus
        ready={ready.value}
        readyLabel="Pikaday ready"
        loadingLabel="Loading Pikaday..."
        error={error.value}
      />
      <p className="m-0 text-xs text-base-content/70">
        当前选择：{formatSelectedDate(selectedValue.value)}
      </p>
      <p className="m-0 text-xs text-base-content/70">
        输入框已挂上真实 Pikaday 实例，点击即可弹出日期面板。
      </p>
    </div>
  )
}
