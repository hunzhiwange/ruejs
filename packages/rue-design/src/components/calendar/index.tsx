/*
Calendar 组件概述
- 默认导出为 Rue 自己的可控日历面板，支持 month/year 两种视图与受控/非受控状态。
- 保留 Cally 与 Pikaday 的轻量包装作为子组件，兼容原有 demo 与第三方接入方式。
- 视觉层继续使用 Rue 当前的 daisyUI/Tailwind 体系，不引入额外样式文件。
*/
import type { FC } from '@rue-js/rue'
import { computed, ref, useRef } from '@rue-js/rue'

/** CalendarMode 类型。 */
export type CalendarMode = 'month' | 'year'
/** CalendarSelectSource 类型。 */
export type CalendarSelectSource = 'year' | 'month' | 'date' | 'customize'
/** CalendarValue 值类型。 */
export type CalendarValue = Date | string | number
/** CalendarWeekStart 类型。 */
export type CalendarWeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** CalendarSelectInfo 接口。 */
export interface CalendarSelectInfo {
  /** source 配置项。 */
  source: CalendarSelectSource
}

/** CalendarCellFormatInfo 接口。 */
export interface CalendarCellFormatInfo {
  /** 组件类型或语义类型。 */
  type: 'date' | 'month'
  /** originText 配置项。 */
  /** today 配置项。 */
  today: Date
  /** selected 配置项。 */
  selected: boolean
  /** isToday 配置项。 */
  isToday: boolean
  /** inView 配置项。 */
  inView: boolean
  /** 是否禁用交互。 */
  disabled: boolean
  /** row 配置项。 */
  row: number
  /** column 配置项。 */
  column: number
  /** week 配置项。 */
  week?: number
}

/** CalendarMonthOption 选项配置。 */
export interface CalendarMonthOption {
  /** 受控值。 */
  value: number
  /** 展示标签。 */
  label: string
  /** 是否禁用交互。 */
  disabled?: boolean
}

/** CalendarHeaderRenderConfig 配置对象。 */
export interface CalendarHeaderRenderConfig {
  /** 受控值。 */
  value: Date
  /** 组件类型或语义类型。 */
  type: CalendarMode
  /** yearOptions 选项配置。 */
  yearOptions: number[]
  /** monthOptions 选项配置。 */
  monthOptions: CalendarMonthOption[]
  /** 值或状态变化时触发的回调。 */
  onChange: (date: CalendarValue) => void
  /** onTypeChange 事件回调。 */
  onTypeChange: (mode: CalendarMode) => void
  /** onYearChange 事件回调。 */
  onYearChange: (year: number) => void
  /** onMonthChange 事件回调。 */
  onMonthChange: (month: number) => void
}

/** CalendarRenderProfileCell 接口。 */
export interface CalendarRenderProfileCell {
  /** 单元格类型。 */
  type: 'date' | 'month'
  /** 单元格 key。 */
  key: string
  /** 自定义渲染函数名称。 */
  renderName: string
  /** 单次自定义渲染耗时，单位 ms。 */
  duration: number
  /** 行索引。 */
  row: number
  /** 列索引。 */
  column: number
}

/** CalendarRenderProfileEvent 接口。 */
export interface CalendarRenderProfileEvent {
  /** 组件名称。 */
  component: 'Calendar'
  /** 当前视图模式。 */
  mode: CalendarMode
  /** 本次更新阶段。 */
  phase: 'compiled'
  /** 总耗时，单位 ms。 */
  duration: number
  /** 本次参与更新的单元格数量。 */
  cellCount: number
  /** 自定义渲染函数总调用次数。 */
  customRenderCount: number
  /** cellFormatter 调用次数。 */
  cellFormatterCount: number
  /** fullCellRender 调用次数。 */
  fullCellRenderCount: number
  /** dateCellRender 调用次数。 */
  dateCellRenderCount: number
  /** dateFullCellRender 调用次数。 */
  dateFullCellRenderCount: number
  /** monthCellRender 调用次数。 */
  monthCellRenderCount: number
  /** monthFullCellRender 调用次数。 */
  monthFullCellRenderCount: number
  /** 是否超过阈值。 */
  slow: boolean
  /** 慢渲染阈值，单位 ms。 */
  threshold: number
  /** 超过阈值的单元格。 */
  slowCells: CalendarRenderProfileCell[]
}

interface CalendarHostProps {
  className?: string
  children?: any
  [key: string]: any
}

interface CalendarPikaSingleProps extends CalendarHostProps {
  type?: string
}

/** CalendarProps 组件属性。 */
export interface CalendarProps extends CalendarHostProps {
  /** 受控值。 */
  value?: CalendarValue
  /** 非受控初始值。 */
  defaultValue?: CalendarValue
  /** mode 配置项。 */
  mode?: CalendarMode
  /** fullscreen 配置项。 */
  fullscreen?: boolean
  /** showWeek 配置项。 */
  showWeek?: boolean
  /** locale 配置项。 */
  locale?: string
  /** weekStartsOn 配置项。 */
  weekStartsOn?: CalendarWeekStart
  /** validRange 配置项。 */
  validRange?: [CalendarValue, CalendarValue]
  /** disabledDate 配置项。 */
  disabledDate?: (date: Date) => boolean
  /** dateFullCellRender 自定义渲染函数。 */
  dateFullCellRender?: (date: Date) => any
  /** dateCellRender 自定义渲染函数。 */
  dateCellRender?: (date: Date) => any
  /** monthFullCellRender 自定义渲染函数。 */
  monthFullCellRender?: (date: Date) => any
  /** monthCellRender 自定义渲染函数。 */
  monthCellRender?: (date: Date) => any
  /** cellFormatter 自定义渲染函数。 */
  cellFormatter?: (date: Date, info: CalendarCellFormatInfo) => string | number | null | undefined
  /** fullCellRender 自定义渲染函数。 */
  fullCellRender?: (date: Date, info: CalendarCellFormatInfo & { originNode: any }) => any
  /** cellRender 自定义渲染函数。 */
  cellRender?: (date: Date, info: CalendarCellFormatInfo & { originNode: any }) => any
  /** headerRender 自定义渲染函数。 */
  headerRender?: (config: CalendarHeaderRenderConfig) => any
  /** headerTitleFormatter 自定义渲染函数。 */
  headerTitleFormatter?: (value: Date, mode: CalendarMode) => string
  /** Calendar 渲染诊断回调，可用于定位 cellFormatter 或面板更新耗时。 */
  onRenderProfile?: (event: CalendarRenderProfileEvent) => void
  /** onRenderProfile 的慢渲染阈值，单位 ms。 */
  renderProfileThreshold?: number
  /** 值或状态变化时触发的回调。 */
  onChange?: (date: Date) => void
  /** onPanelChange 事件回调。 */
  onPanelChange?: (date: Date, mode: CalendarMode) => void
  /** 选中项时触发的回调。 */
  onSelect?: (date: Date, info: CalendarSelectInfo) => void
}

interface CalendarDateCell {
  key: string
  date: Date
  inView: boolean
}

interface CalendarDateRow {
  key: string
  week: number
  cells: CalendarDateCell[]
}

interface CalendarRange {
  start: Date
  end: Date
}

interface CalendarSelectabilityCaches {
  date: Map<string, boolean>
  month: Map<string, boolean>
  year: Map<string, boolean>
}

interface DefaultDateCellState {
  key: string
  dayNumber: number
  inView: boolean
  selected: boolean
  isToday: boolean
  disabled: boolean
}

interface ManagedCalendarCellContent {
  key: string
  type: 'date' | 'month'
  content: any
}

interface ManagedCalendarMount {
  host: HTMLElement
  anchor: Comment
}

interface CalendarRenderProfileState {
  enabled: boolean
  start: number
  threshold: number
  cellCount: number
  customRenderCount: number
  cellFormatterCount: number
  fullCellRenderCount: number
  dateCellRenderCount: number
  dateFullCellRenderCount: number
  monthCellRenderCount: number
  monthFullCellRenderCount: number
  slowCells: CalendarRenderProfileCell[]
}

interface OptimizedCalendarYearOption {
  value: number
  disabled: boolean
}

interface OptimizedDefaultCalendarSnapshot {
  rest: Record<string, any>
  rootClassName: string
  fullscreen: boolean
  currentMode: CalendarMode
  currentValue: Date
  headerTitle: string
  todayLabel: string
  previousDisabled: boolean
  nextDisabled: boolean
  todayDisabled: boolean
  yearOptions: OptimizedCalendarYearOption[]
  monthOptions: CalendarMonthOption[]
  weekdayLabels: string[]
  dateRows: CalendarDateRow[]
  rowClassName: string
  showWeek?: boolean
  viewLabel: string
  weekButtonLabel: string
  todayButtonLabel: string
  monthButtonLabel: string
  yearButtonLabel: string
  todayMarkerLabel: string
  dateCellStates: Map<string, DefaultDateCellState>
  managedCellContent: Map<string, ManagedCalendarCellContent>
  hasDateCustomRender: boolean
  hasMonthCustomRender: boolean
  onPrevious: () => void
  onToday: () => void
  onNext: () => void
  onYearChange: (year: number) => void
  onMonthChange: (month: number) => void
  onModeMonth: () => void
  onModeYear: () => void
  onDateSelect: (date: Date) => void
  onMonthSelect: (date: Date) => void
}

/** merge Class Name 的内部工具函数。 */
const mergeClassName = (base: string, className?: string) =>
  className ? `${base} ${className}` : base

/** 创建 Selectability Caches 的内部工具函数。 */
const createSelectabilityCaches = (): CalendarSelectabilityCaches => ({
  date: new Map(),
  month: new Map(),
  year: new Map(),
})

const weekdayLabelCache = /*#__PURE__*/ new Map<string, string[]>()
const monthLabelCache = /*#__PURE__*/ new Map<string, string[]>()
const monthYearFormatterCache = /*#__PURE__*/ new Map<string, Intl.DateTimeFormat>()
const yearFormatterCache = /*#__PURE__*/ new Map<string, Intl.DateTimeFormat>()
const todayFormatterCache = /*#__PURE__*/ new Map<string, Intl.DateTimeFormat>()

const getCalendarNow = () => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }
  return Date.now()
}

const createCalendarRenderProfileState = (
  enabled: boolean,
  threshold: number,
): CalendarRenderProfileState => ({
  enabled,
  start: enabled ? getCalendarNow() : 0,
  threshold,
  cellCount: 0,
  customRenderCount: 0,
  cellFormatterCount: 0,
  fullCellRenderCount: 0,
  dateCellRenderCount: 0,
  dateFullCellRenderCount: 0,
  monthCellRenderCount: 0,
  monthFullCellRenderCount: 0,
  slowCells: [],
})

const countCalendarRender = (
  profile: CalendarRenderProfileState,
  renderName:
    | 'cellFormatter'
    | 'fullCellRender'
    | 'dateCellRender'
    | 'dateFullCellRender'
    | 'monthCellRender'
    | 'monthFullCellRender',
) => {
  if (!profile.enabled) {
    return
  }

  profile.customRenderCount += 1
  if (renderName === 'cellFormatter') {
    profile.cellFormatterCount += 1
  } else if (renderName === 'fullCellRender') {
    profile.fullCellRenderCount += 1
  } else if (renderName === 'dateCellRender') {
    profile.dateCellRenderCount += 1
  } else if (renderName === 'dateFullCellRender') {
    profile.dateFullCellRenderCount += 1
  } else if (renderName === 'monthCellRender') {
    profile.monthCellRenderCount += 1
  } else {
    profile.monthFullCellRenderCount += 1
  }
}

const invokeCalendarRender = <T,>(
  profile: CalendarRenderProfileState,
  renderName:
    | 'cellFormatter'
    | 'fullCellRender'
    | 'dateCellRender'
    | 'dateFullCellRender'
    | 'monthCellRender'
    | 'monthFullCellRender',
  cell: { type: 'date' | 'month'; key: string; row: number; column: number },
  render: () => T,
) => {
  if (!profile.enabled) {
    return render()
  }

  countCalendarRender(profile, renderName)
  const start = getCalendarNow()
  const result = render()
  const duration = getCalendarNow() - start
  if (duration >= profile.threshold) {
    profile.slowCells.push({
      type: cell.type,
      key: cell.key,
      renderName,
      duration,
      row: cell.row,
      column: cell.column,
    })
  }
  return result
}

const emitCalendarRenderProfile = (
  handler: CalendarProps['onRenderProfile'],
  profile: CalendarRenderProfileState,
  mode: CalendarMode,
  phase: CalendarRenderProfileEvent['phase'],
) => {
  if (!handler || !profile.enabled) {
    return
  }

  const duration = getCalendarNow() - profile.start
  const event: CalendarRenderProfileEvent = {
    component: 'Calendar',
    mode,
    phase,
    duration,
    cellCount: profile.cellCount,
    customRenderCount: profile.customRenderCount,
    cellFormatterCount: profile.cellFormatterCount,
    fullCellRenderCount: profile.fullCellRenderCount,
    dateCellRenderCount: profile.dateCellRenderCount,
    dateFullCellRenderCount: profile.dateFullCellRenderCount,
    monthCellRenderCount: profile.monthCellRenderCount,
    monthFullCellRenderCount: profile.monthFullCellRenderCount,
    slow: duration >= profile.threshold || profile.slowCells.length > 0,
    threshold: profile.threshold,
    slowCells: profile.slowCells.slice(),
  }
  const deliver = () => handler(event)
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(deliver)
  } else {
    Promise.resolve().then(deliver)
  }
}

/** 构建 Date Button Class Name 的内部工具函数。 */
const buildDateButtonClassName = (
  fullscreen: boolean,
  selected: boolean,
  disabled: boolean,
  inView: boolean,
  isToday: boolean,
) => {
  let buttonClassName = `group relative flex min-h-[5.35rem] w-full flex-col rounded-[1.2rem] border px-2.5 py-2.5 text-left transition duration-150 ${fullscreen ? '' : 'min-h-[4.7rem] rounded-[1rem] px-2 py-2'}`
  if (selected) {
    buttonClassName += ' border-primary bg-primary text-primary-content shadow-md shadow-primary/15'
  } else if (disabled) {
    buttonClassName += ' border-base-300/70 bg-base-200/50 text-base-content/35'
  } else if (inView) {
    buttonClassName +=
      ' border-base-300/80 bg-base-100 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-sm'
  } else {
    buttonClassName +=
      ' border-base-300/60 bg-base-200/60 text-base-content/55 hover:border-primary/20'
  }
  if (isToday && !selected) {
    buttonClassName += ' ring-1 ring-primary/20'
  }
  return buttonClassName
}

/** 构建 Month Button Class Name 的内部工具函数。 */
const buildMonthButtonClassName = (
  fullscreen: boolean,
  selected: boolean,
  disabled: boolean,
  isToday: boolean,
) => {
  let buttonClassName = `group relative flex min-h-[6.1rem] w-full flex-col rounded-[1.2rem] border px-3 py-3 text-left transition duration-150 ${fullscreen ? '' : 'min-h-[5.5rem] rounded-[1rem] px-2.5 py-2.5'}`
  if (selected) {
    buttonClassName += ' border-primary bg-primary text-primary-content shadow-md shadow-primary/15'
  } else if (disabled) {
    buttonClassName += ' border-base-300/70 bg-base-200/50 text-base-content/35'
  } else {
    buttonClassName +=
      ' border-base-300/80 bg-base-100 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-sm'
  }
  if (isToday && !selected) {
    buttonClassName += ' ring-1 ring-primary/20'
  }
  return buttonClassName
}

/** 渲染 Optimized Date Button Inner HTML 的内部工具函数。 */

/** 构建 Month Selection Patch Signature 的内部工具函数。 */
/** 转义 fast HTML 渲染路径中的文本和属性值，避免用户传入内容破坏结构。 */

/** 渲染布尔属性；仅 true 时输出属性名。 */

/** 渲染可安全字符串化的 DOM 属性，跳过函数/对象/空值。 */

/** 渲染透传到 Calendar 根节点的其余属性，排除 children/className 等由组件接管的字段。 */

/** 渲染 Optimized Default Calendar View 的内部工具函数。 */
const CalendarText: FC<{ value: string }> = ({ value }) => <span>{String(value)}</span>

const RenderOptimizedDefaultCalendarView = ({
  arg0: snapshot,
  rootProps,
}: {
  rootProps: Record<string, any>
  arg0: OptimizedDefaultCalendarSnapshot
}) => {
  const readSnapshot = () => snapshot

  const CompiledRow101 = ({ rowArg0 }: { rowArg0: any }) => {
    const CompiledRow102 = ({ rowArg0 }: { rowArg0: any }) => {
      const cell = rowArg0

      const state = computed(
        () =>
          readSnapshot().dateCellStates.get(cell.key) ?? {
            key: cell.key,
            dayNumber: cell.date.getDate(),
            inView: false,
            selected: false,
            isToday: false,
            disabled: true,
          },
      )
      return (
        <button
          type="button"
          key={cell.key}
          role="gridcell"
          data-rue-calendar-cell={cell.key}
          data-rue-calendar-in-view={state.get().inView ? 'true' : 'false'}
          aria-pressed={state.get().selected ? 'true' : 'false'}
          aria-current={state.get().isToday ? 'date' : undefined}
          disabled={state.get().disabled}
          className={buildDateButtonClassName(
            fullscreen,
            state.get().selected,
            state.get().disabled,
            state.get().inView,
            state.get().isToday,
          )}
          onClick={() => readSnapshot().onDateSelect(cell.date)}
        >
          {readSnapshot().hasDateCustomRender ? (
            <span data-rue-calendar-detail={cell.key}>
              <CalendarText
                value={String(readSnapshot().managedCellContent.get(cell.key)?.content ?? '')}
              />
            </span>
          ) : (
            <span className="flex items-start justify-between gap-2">
              <span className={`text-sm font-semibold ${state.get().inView ? '' : 'opacity-60'}`}>
                <CalendarText value={String(state.get().dayNumber)} />
              </span>
              {state.get().isToday ? (
                <span
                  className={`badge badge-xs ${state.get().selected ? 'badge-neutral text-neutral-content' : 'badge-primary badge-outline'}`}
                >
                  <CalendarText value={String(readSnapshot().todayMarkerLabel)} />
                </span>
              ) : null}
            </span>
          )}
        </button>
      )
    }

    const row = rowArg0
    return (
      <div key={row.key} role="row" className={readSnapshot().rowClassName}>
        {readSnapshot().showWeek ? (
          <div
            className="flex items-center justify-center rounded-[1rem] border border-base-300/70 bg-base-200/60 text-sm font-semibold text-base-content/60"
            data-rue-calendar-week={row.week}
          >
            <CalendarText value={String(row.week)} />
          </div>
        ) : null}
        {row.cells.map((rowArg0: any, rowIndex: number) => (
          <CompiledRow102 rowArg0={rowArg0} />
        ))}
      </div>
    )
  }

  const CompiledRow1 = ({ rowArg0 }: { rowArg0: any }) => {
    const monthOption = rowArg0

    const monthDate = createDate(readSnapshot().currentValue.getFullYear(), monthOption.value, 1)
    const selected = isSameMonth(monthDate, readSnapshot().currentValue)
    const isToday = isSameMonth(monthDate, startOfDay(new Date()))
    const disabled = monthOption.disabled === true
    return (
      <button
        type="button"
        key={`${readSnapshot().currentValue.getFullYear()}-${monthOption.value}`}
        data-rue-calendar-month={`${readSnapshot().currentValue.getFullYear()}-${`${monthOption.value + 1}`.padStart(2, '0')}`}
        aria-pressed={selected ? 'true' : 'false'}
        disabled={disabled}
        className={buildMonthButtonClassName(fullscreen, selected, disabled, isToday)}
        onClick={() => readSnapshot().onMonthSelect(monthDate)}
      >
        {readSnapshot().hasMonthCustomRender ? (
          <span
            data-rue-calendar-detail={`${readSnapshot().currentValue.getFullYear()}-${String(monthOption.value + 1).padStart(2, '0')}`}
          >
            <CalendarText
              value={String(
                readSnapshot().managedCellContent.get(
                  `${readSnapshot().currentValue.getFullYear()}-${String(monthOption.value + 1).padStart(2, '0')}`,
                )?.content ?? '',
              )}
            />
          </span>
        ) : (
          <span className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">
              <CalendarText value={String(monthOption.label)} />
            </span>
            {isToday ? (
              <span
                className={`badge badge-xs ${selected ? 'badge-neutral text-neutral-content' : 'badge-primary badge-outline'}`}
              >
                <CalendarText value={String(readSnapshot().todayMarkerLabel)} />
              </span>
            ) : null}
          </span>
        )}
      </button>
    )
  }

  const fullscreen = readSnapshot().fullscreen

  return (
    <div
      {...rootProps}
      data-rue-calendar-root="true"
      data-rue-calendar-mode={readSnapshot().currentMode}
      className={readSnapshot().rootClassName}
    >
      <div
        data-rue-calendar-header="true"
        data-current={readSnapshot().headerTitle}
        data-mode={readSnapshot().currentMode}
        className={`border-b border-base-300/70 ${fullscreen ? 'flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between' : 'flex flex-col gap-3 px-3 py-3'}`}
      >
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-base-content/55">
            Rue Calendar
          </div>
          <div className="mt-1 text-xl font-semibold leading-tight">
            <CalendarText value={String(readSnapshot().headerTitle)} />
          </div>
          <div className="mt-1 text-xs text-base-content/60">
            <CalendarText value={String(readSnapshot().todayLabel)} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <div className="join">
            <button
              type="button"
              className="btn btn-sm join-item"
              aria-label="Previous"
              disabled={readSnapshot().previousDisabled}
              onClick={readSnapshot().onPrevious}
            >
              <span aria-hidden="true">&lt;</span>
            </button>
            <button
              type="button"
              className="btn btn-sm join-item btn-ghost"
              disabled={readSnapshot().todayDisabled}
              onClick={readSnapshot().onToday}
            >
              <CalendarText value={String(readSnapshot().todayButtonLabel)} />
            </button>
            <button
              type="button"
              className="btn btn-sm join-item"
              aria-label="Next"
              disabled={readSnapshot().nextDisabled}
              onClick={readSnapshot().onNext}
            >
              <span aria-hidden="true">&gt;</span>
            </button>
          </div>
          <select
            className="select select-sm min-w-24"
            data-rue-calendar-year-select="true"
            value={readSnapshot().currentValue.getFullYear()}
            onChange={(event: Event) =>
              readSnapshot().onYearChange(Number((event.currentTarget as HTMLSelectElement).value))
            }
          >
            {readSnapshot().yearOptions.map(option => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                <CalendarText value={String(option.value)} />
              </option>
            ))}
          </select>
          <select
            className="select select-sm min-w-24"
            data-rue-calendar-month-select="true"
            value={readSnapshot().currentValue.getMonth()}
            disabled={readSnapshot().currentMode === 'year'}
            onChange={(event: Event) =>
              readSnapshot().onMonthChange(Number((event.currentTarget as HTMLSelectElement).value))
            }
          >
            {readSnapshot().monthOptions.map(option => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                <CalendarText value={String(option.label)} />
              </option>
            ))}
          </select>
          <div className="join">
            <button
              type="button"
              data-rue-calendar-mode-switch="month"
              className={`btn btn-sm join-item ${readSnapshot().currentMode === 'month' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={readSnapshot().onModeMonth}
            >
              <CalendarText value={String(readSnapshot().monthButtonLabel)} />
            </button>
            <button
              type="button"
              data-rue-calendar-mode-switch="year"
              className={`btn btn-sm join-item ${readSnapshot().currentMode === 'year' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={readSnapshot().onModeYear}
            >
              <CalendarText value={String(readSnapshot().yearButtonLabel)} />
            </button>
          </div>
        </div>
      </div>

      <div className={fullscreen ? 'space-y-3 px-4 py-4' : 'space-y-3 px-3 py-3'}>
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="badge badge-outline badge-sm">
            <CalendarText value={String(readSnapshot().viewLabel)} />
          </div>
          {readSnapshot().showWeek && readSnapshot().currentMode === 'month' ? (
            <div className="badge badge-soft badge-sm">
              <CalendarText value={String(readSnapshot().weekButtonLabel)} />
            </div>
          ) : null}
        </div>

        {readSnapshot().currentMode === 'month' ? (
          <div className="space-y-2">
            <div className={readSnapshot().rowClassName}>
              {readSnapshot().showWeek ? (
                <div className="px-2 py-1 text-center text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-base-content/45">
                  <CalendarText value={String(readSnapshot().weekButtonLabel)} />
                </div>
              ) : null}
              {readSnapshot().weekdayLabels.map(label => (
                <div
                  key={label}
                  className="px-2 py-1 text-center text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-base-content/45"
                >
                  {label}
                </div>
              ))}
            </div>

            <div role="grid" className="space-y-2">
              {readSnapshot().dateRows.map((rowArg0: any, rowIndex: number) => (
                <CompiledRow101 rowArg0={rowArg0} />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {readSnapshot().monthOptions.map((rowArg0: any, rowIndex: number) => (
              <CompiledRow1 rowArg0={rowArg0} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** clamp Week Start 的内部工具函数。 */
const clampWeekStart = (value?: number): CalendarWeekStart => {
  if (typeof value === 'number' && value >= 0 && value <= 6) {
    return value as CalendarWeekStart
  }
  return 1
}

/** clone Date 的内部工具函数。 */
const cloneDate = (value: Date) => new Date(value.getTime())

/** 创建 Date 的内部工具函数。 */
const createDate = (year: number, month: number, day: number) => {
  const date = new Date(year, month, day)
  date.setHours(12, 0, 0, 0)
  return date
}

/** start Of Day 的内部工具函数。 */
const startOfDay = (value: Date) => {
  const date = cloneDate(value)
  date.setHours(0, 0, 0, 0)
  return date
}

/** start Of Month 的内部工具函数。 */
const startOfMonth = (value: Date) => createDate(value.getFullYear(), value.getMonth(), 1)
/** end Of Month 的内部工具函数。 */
const endOfMonth = (value: Date) => createDate(value.getFullYear(), value.getMonth() + 1, 0)
/** start Of Year 的内部工具函数。 */
const startOfYear = (value: Date) => createDate(value.getFullYear(), 0, 1)
/** end Of Year 的内部工具函数。 */
const endOfYear = (value: Date) => createDate(value.getFullYear(), 11, 31)
/** add Days 的内部工具函数。 */
const addDays = (value: Date, amount: number) =>
  createDate(value.getFullYear(), value.getMonth(), value.getDate() + amount)

/** 判断 Valid Date 的内部工具函数。 */
const isValidDate = (value: unknown): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime())

/** 归一化 Date 的内部工具函数。 */
const normalizeDate = (value: CalendarValue | undefined, fallback = new Date()) => {
  if (isValidDate(value)) {
    return cloneDate(value)
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    if (isValidDate(parsed)) {
      return parsed
    }
  }
  return cloneDate(fallback)
}

/** 归一化 Range 的内部工具函数。 */
const normalizeRange = (range?: [CalendarValue, CalendarValue]): CalendarRange | null => {
  if (!range) {
    return null
  }

  const start = startOfDay(normalizeDate(range[0]))
  const end = startOfDay(normalizeDate(range[1]))
  if (start.getTime() <= end.getTime()) {
    return { start, end }
  }

  return { start: end, end: start }
}

/** 判断 Same Year 的内部工具函数。 */
const isSameYear = (left: Date, right: Date) => left.getFullYear() === right.getFullYear()
/** 判断 Same Month 的内部工具函数。 */
const isSameMonth = (left: Date, right: Date) =>
  isSameYear(left, right) && left.getMonth() === right.getMonth()
/** 判断 Same Date 的内部工具函数。 */
const isSameDate = (left: Date, right: Date) =>
  isSameMonth(left, right) && left.getDate() === right.getDate()

/** add Months 的内部工具函数。 */
const addMonths = (value: Date, amount: number) => {
  const base = createDate(value.getFullYear(), value.getMonth() + amount, 1)
  const maxDay = endOfMonth(base).getDate()
  return createDate(base.getFullYear(), base.getMonth(), Math.min(value.getDate(), maxDay))
}

/** add Years 的内部工具函数。 */
const addYears = (value: Date, amount: number) => {
  const base = createDate(value.getFullYear() + amount, value.getMonth(), 1)
  const maxDay = endOfMonth(base).getDate()
  return createDate(base.getFullYear(), base.getMonth(), Math.min(value.getDate(), maxDay))
}

/** 设置 Calendar Year 的内部工具函数。 */
const setCalendarYear = (value: Date, year: number) => addYears(value, year - value.getFullYear())
/** 设置 Calendar Month 的内部工具函数。 */
const setCalendarMonth = (value: Date, month: number) => addMonths(value, month - value.getMonth())

/** format Date Key 的内部工具函数。 */
const formatDateKey = (value: Date) => {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** 判断 Date Selectable 的内部工具函数。 */
const isDateSelectable = (
  value: Date,
  range: CalendarRange | null,
  disabledDate?: (date: Date) => boolean,
) => {
  const date = startOfDay(value)
  if (range) {
    if (date.getTime() < range.start.getTime() || date.getTime() > range.end.getTime()) {
      return false
    }
  }
  return !disabledDate?.(cloneDate(date))
}

/** month Has Selectable Date 的内部工具函数。 */
const monthHasSelectableDate = (
  value: Date,
  range: CalendarRange | null,
  disabledDate?: (date: Date) => boolean,
  resolveDateSelectable?: (date: Date) => boolean,
) => {
  const start = startOfMonth(value)
  const end = endOfMonth(value)
  if (range) {
    if (end.getTime() < range.start.getTime() || start.getTime() > range.end.getTime()) {
      return false
    }
  }

  let cursor = start
  while (cursor.getTime() <= end.getTime()) {
    if (
      resolveDateSelectable
        ? resolveDateSelectable(cursor)
        : isDateSelectable(cursor, range, disabledDate)
    ) {
      return true
    }
    cursor = addDays(cursor, 1)
  }
  return false
}

/** year Has Selectable Date 的内部工具函数。 */
const yearHasSelectableDate = (
  value: Date,
  range: CalendarRange | null,
  disabledDate?: (date: Date) => boolean,
  resolveMonthSelectable?: (date: Date) => boolean,
) => {
  const start = startOfYear(value)
  const end = endOfYear(value)
  if (range) {
    if (end.getTime() < range.start.getTime() || start.getTime() > range.end.getTime()) {
      return false
    }
  }

  return Array.from({ length: 12 }, (_, month) => createDate(value.getFullYear(), month, 1)).some(
    date =>
      resolveMonthSelectable
        ? resolveMonthSelectable(date)
        : monthHasSelectableDate(date, range, disabledDate),
  )
}

/** createCalendarSelectabilityResolver 导出函数。 */
export const createCalendarSelectabilityResolver = (
  validRange?: [CalendarValue, CalendarValue],
  disabledDate?: (date: Date) => boolean,
) => {
  const range = normalizeRange(validRange)
  const hasSelectabilityConstraints = !!range || !!disabledDate
  const caches = createSelectabilityCaches()

  const resolveDateSelectable = (date: Date) => {
    if (!hasSelectabilityConstraints) {
      return true
    }

    const cacheKey = formatDateKey(startOfDay(date))
    const cached = caches.date.get(cacheKey)
    if (cached !== undefined) {
      return cached
    }

    const selectable = isDateSelectable(date, range, disabledDate)
    caches.date.set(cacheKey, selectable)
    return selectable
  }

  const resolveMonthSelectable = (date: Date) => {
    if (!hasSelectabilityConstraints) {
      return true
    }

    const cacheKey = `${date.getFullYear()}-${date.getMonth()}`
    const cached = caches.month.get(cacheKey)
    if (cached !== undefined) {
      return cached
    }

    const selectable = monthHasSelectableDate(date, range, disabledDate, resolveDateSelectable)
    caches.month.set(cacheKey, selectable)
    return selectable
  }

  const resolveYearSelectable = (date: Date) => {
    if (!hasSelectabilityConstraints) {
      return true
    }

    const cacheKey = `${date.getFullYear()}`
    const cached = caches.year.get(cacheKey)
    if (cached !== undefined) {
      return cached
    }

    const selectable = yearHasSelectableDate(date, range, disabledDate, resolveMonthSelectable)
    caches.year.set(cacheKey, selectable)
    return selectable
  }

  return {
    resolveDateSelectable,
    resolveMonthSelectable,
    resolveYearSelectable,
  }
}

/** 读取 ISOWeek 的内部工具函数。 */
const getISOWeek = (value: Date) => {
  const date = startOfDay(value)
  const day = (date.getDay() + 6) % 7
  const thursday = addDays(date, 3 - day)
  const firstThursday = createDate(thursday.getFullYear(), 0, 4)
  const firstThursdayDay = (firstThursday.getDay() + 6) % 7
  const firstWeekStart = addDays(firstThursday, -firstThursdayDay)
  return 1 + Math.round((date.getTime() - firstWeekStart.getTime()) / 604800000)
}

/** 读取 Weekday Labels 的内部工具函数。 */
const getWeekdayLabels = (locale: string, weekStartsOn: CalendarWeekStart) => {
  const cacheKey = `${locale}:${weekStartsOn}`
  const cached = weekdayLabelCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  const anchor = createDate(2026, 2, 1)
  const labels = Array.from({ length: 7 }, (_, index) =>
    formatter.format(addDays(anchor, (weekStartsOn + index) % 7)),
  )
  weekdayLabelCache.set(cacheKey, labels)
  return labels
}

/** 读取 Month Labels 的内部工具函数。 */
const getMonthLabels = (locale: string) => {
  const cached = monthLabelCache.get(locale)
  if (cached) {
    return cached
  }

  const formatter = new Intl.DateTimeFormat(locale, { month: 'short' })
  const labels = Array.from({ length: 12 }, (_, month) =>
    formatter.format(createDate(2026, month, 1)),
  )
  monthLabelCache.set(locale, labels)
  return labels
}

/** 读取 Year Options 的内部工具函数。 */
const getYearOptions = (value: Date, range: CalendarRange | null) => {
  const current = value.getFullYear()
  if (!range) {
    return Array.from({ length: 13 }, (_, index) => current - 6 + index)
  }

  const startYear = range.start.getFullYear()
  const endYear = range.end.getFullYear()
  if (endYear - startYear <= 24) {
    return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index)
  }

  const start = Math.max(startYear, current - 6)
  const end = Math.min(endYear, current + 6)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

/** 读取 Month Options 的内部工具函数。 */
const getMonthOptions = (
  locale: string,
  value: Date,
  range: CalendarRange | null,
  disabledDate?: (date: Date) => boolean,
  resolveMonthSelectable?: (date: Date) => boolean,
): CalendarMonthOption[] => {
  const labels = getMonthLabels(locale)
  return Array.from({ length: 12 }, (_, month) => {
    const date = createDate(value.getFullYear(), month, 1)
    return {
      value: month,
      label: labels[month],
      disabled: !(resolveMonthSelectable
        ? resolveMonthSelectable(date)
        : monthHasSelectableDate(date, range, disabledDate)),
    }
  })
}

/** 读取 Visible Date Rows 的内部工具函数。 */
const getVisibleDateRows = (value: Date, weekStartsOn: CalendarWeekStart): CalendarDateRow[] => {
  const monthStart = startOfMonth(value)
  const offset = (monthStart.getDay() - weekStartsOn + 7) % 7
  const gridStart = addDays(monthStart, -offset)

  return Array.from({ length: 6 }, (_, rowIndex) => {
    const rowStart = addDays(gridStart, rowIndex * 7)
    return {
      key: `${value.getFullYear()}-${value.getMonth()}-${rowIndex}`,
      week: getISOWeek(rowStart),
      cells: Array.from({ length: 7 }, (_, columnIndex) => {
        const date = addDays(rowStart, columnIndex)
        return {
          key: formatDateKey(date),
          date,
          inView: date.getMonth() === value.getMonth(),
        }
      }),
    }
  })
}

/** 读取 Month Year Formatter 的内部工具函数。 */
const getMonthYearFormatter = (locale: string) => {
  let formatter = monthYearFormatterCache.get(locale)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' })
    monthYearFormatterCache.set(locale, formatter)
  }
  return formatter
}

/** 读取 Year Formatter 的内部工具函数。 */
const getYearFormatter = (locale: string) => {
  let formatter = yearFormatterCache.get(locale)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { year: 'numeric' })
    yearFormatterCache.set(locale, formatter)
  }
  return formatter
}

/** 读取 Today Formatter 的内部工具函数。 */
const getTodayFormatter = (locale: string) => {
  let formatter = todayFormatterCache.get(locale)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    todayFormatterCache.set(locale, formatter)
  }
  return formatter
}

/** Calendar Panel 的内部工具函数。 */
const CalendarPanelImpl: FC<CalendarProps> = ({
  value,
  defaultValue,
  mode,
  fullscreen = true,
  showWeek,
  locale,
  weekStartsOn,
  validRange,
  disabledDate,
  cellFormatter,
  headerTitleFormatter,
  className,
  onRenderProfile,
  renderProfileThreshold = 16,
  onChange,
  onPanelChange,
  onSelect,
  ...rest
}) => {
  const uncontrolledState = {
    value: ref(normalizeDate(value ?? defaultValue ?? new Date())),
    mode: ref<CalendarMode>(mode ?? 'month'),
  }
  const uncontrolledValue = uncontrolledState.value
  const uncontrolledMode = uncontrolledState.mode
  const selectableDateCacheRef = useRef<CalendarSelectabilityCaches['date']>()
  const selectableMonthCacheRef = useRef<CalendarSelectabilityCaches['month']>()
  const selectableYearCacheRef = useRef<CalendarSelectabilityCaches['year']>()
  const cacheRangeStartRef = useRef<number | null>(null)
  const cacheRangeEndRef = useRef<number | null>(null)
  const cacheDisabledDateSignatureRef = useRef('__none__')
  const viewSnapshot = computed(() => {
    const renderProfile = createCalendarRenderProfileState(
      !!onRenderProfile,
      renderProfileThreshold,
    )
    const currentValue =
      value !== undefined ? normalizeDate(value, uncontrolledValue.value) : uncontrolledValue.value
    const currentMode = mode ?? uncontrolledMode.value
    const today = startOfDay(new Date())
    const range = normalizeRange(validRange)
    const hasSelectabilityConstraints = !!range || !!disabledDate
    const resolvedLocale =
      locale ??
      (typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'zh-CN')
    const resolvedWeekStart = clampWeekStart(weekStartsOn)
    const isZhLocale = resolvedLocale.toLowerCase().startsWith('zh')

    if (!selectableDateCacheRef.current) {
      selectableDateCacheRef.current = createSelectabilityCaches().date
    }
    if (!selectableMonthCacheRef.current) {
      selectableMonthCacheRef.current = createSelectabilityCaches().month
    }
    if (!selectableYearCacheRef.current) {
      selectableYearCacheRef.current = createSelectabilityCaches().year
    }

    const rangeStart = range ? range.start.getTime() : null
    const rangeEnd = range ? range.end.getTime() : null
    const disabledDateSignature = disabledDate ? disabledDate.toString() : '__none__'
    if (
      cacheRangeStartRef.current !== rangeStart ||
      cacheRangeEndRef.current !== rangeEnd ||
      cacheDisabledDateSignatureRef.current !== disabledDateSignature
    ) {
      selectableDateCacheRef.current.clear()
      selectableMonthCacheRef.current.clear()
      selectableYearCacheRef.current.clear()
      cacheRangeStartRef.current = rangeStart
      cacheRangeEndRef.current = rangeEnd
      cacheDisabledDateSignatureRef.current = disabledDateSignature
    }

    const resolveDateSelectable = (date: Date) => {
      if (!hasSelectabilityConstraints) {
        return true
      }

      const cacheKey = formatDateKey(startOfDay(date))
      const cached = selectableDateCacheRef.current?.get(cacheKey)
      if (cached !== undefined) {
        return cached
      }

      const selectable = isDateSelectable(date, range, disabledDate)
      selectableDateCacheRef.current?.set(cacheKey, selectable)
      return selectable
    }

    const resolveMonthSelectable = (date: Date) => {
      if (!hasSelectabilityConstraints) {
        return true
      }

      const cacheKey = `${date.getFullYear()}-${date.getMonth()}`
      const cached = selectableMonthCacheRef.current?.get(cacheKey)
      if (cached !== undefined) {
        return cached
      }

      const selectable = monthHasSelectableDate(date, range, disabledDate, resolveDateSelectable)
      selectableMonthCacheRef.current?.set(cacheKey, selectable)
      return selectable
    }

    const resolveYearSelectable = (date: Date) => {
      if (!hasSelectabilityConstraints) {
        return true
      }

      const cacheKey = `${date.getFullYear()}`
      const cached = selectableYearCacheRef.current?.get(cacheKey)
      if (cached !== undefined) {
        return cached
      }

      const selectable = yearHasSelectableDate(date, range, disabledDate, resolveMonthSelectable)
      selectableYearCacheRef.current?.set(cacheKey, selectable)
      return selectable
    }

    const isMonthMode = currentMode === 'month'
    const weekdayLabels = isMonthMode ? getWeekdayLabels(resolvedLocale, resolvedWeekStart) : []
    const dateRows = isMonthMode ? getVisibleDateRows(currentValue, resolvedWeekStart) : []
    renderProfile.cellCount = isMonthMode
      ? dateRows.reduce((count, row) => count + row.cells.length, 0)
      : 12
    const yearOptions = getYearOptions(currentValue, range)
    const monthOptions = getMonthOptions(
      resolvedLocale,
      currentValue,
      hasSelectabilityConstraints ? range : null,
      hasSelectabilityConstraints ? disabledDate : undefined,
      hasSelectabilityConstraints ? resolveMonthSelectable : undefined,
    )
    const rootClassName = mergeClassName(
      `overflow-hidden border border-base-300 bg-gradient-to-b from-base-100 via-base-100 to-base-200/70 text-base-content shadow-sm ${fullscreen ? 'rounded-[1.75rem]' : 'w-full max-w-[24rem] rounded-[1.5rem]'}`,
      className,
    )
    const rowClassName = showWeek
      ? 'grid grid-cols-[3.25rem_repeat(7,minmax(0,1fr))] gap-2'
      : 'grid grid-cols-7 gap-2'
    const headerTitle = headerTitleFormatter
      ? headerTitleFormatter(cloneDate(currentValue), currentMode)
      : currentMode === 'month'
        ? getMonthYearFormatter(resolvedLocale).format(currentValue)
        : getYearFormatter(resolvedLocale).format(currentValue)
    const todayLabel = getTodayFormatter(resolvedLocale).format(today)
    const todayButtonLabel = isZhLocale ? '今天' : 'Today'
    const monthButtonLabel = isZhLocale ? '月' : 'Month'
    const yearButtonLabel = isZhLocale ? '年' : 'Year'
    const weekButtonLabel = isZhLocale ? '周' : 'Week'
    const todayMarkerLabel = isZhLocale ? '今' : 'Today'
    const viewLabel =
      currentMode === 'month'
        ? isZhLocale
          ? '月视图'
          : 'Month view'
        : isZhLocale
          ? '年视图'
          : 'Year view'
    const previousDisabled = !hasSelectabilityConstraints
      ? false
      : currentMode === 'month'
        ? !resolveMonthSelectable(addMonths(currentValue, -1))
        : !resolveYearSelectable(addYears(currentValue, -1))
    const nextDisabled = !hasSelectabilityConstraints
      ? false
      : currentMode === 'month'
        ? !resolveMonthSelectable(addMonths(currentValue, 1))
        : !resolveYearSelectable(addYears(currentValue, 1))
    const todayDisabled = hasSelectabilityConstraints ? !resolveDateSelectable(today) : false
    const hasDateCustomRender = !!cellFormatter
    const hasMonthCustomRender = !!cellFormatter
    const triggerChange = (nextInput: CalendarValue, source: CalendarSelectSource) => {
      const nextDate = startOfDay(normalizeDate(nextInput, currentValue))
      const changed = !isSameDate(nextDate, currentValue)
      const panelChanged =
        currentMode === 'month'
          ? !isSameMonth(nextDate, currentValue)
          : !isSameYear(nextDate, currentValue)

      if (value === undefined) {
        uncontrolledValue.value = nextDate
      }

      if (changed) {
        onChange?.(cloneDate(nextDate))
      }
      if (panelChanged) {
        onPanelChange?.(cloneDate(nextDate), currentMode)
      }

      onSelect?.(cloneDate(nextDate), { source })
    }

    const triggerModeChange = (nextMode: CalendarMode) => {
      if (nextMode === currentMode) {
        return
      }
      if (mode === undefined) {
        uncontrolledMode.value = nextMode
      }
      onPanelChange?.(cloneDate(currentValue), nextMode)
    }

    const dateCellStates = /*#__PURE__*/ new Map<string, DefaultDateCellState>()
    if (isMonthMode) {
      for (const row of dateRows) {
        for (const cell of row.cells) {
          dateCellStates.set(cell.key, {
            key: cell.key,
            dayNumber: cell.date.getDate(),
            inView: cell.inView,
            selected: isSameDate(cell.date, currentValue),
            isToday: isSameDate(cell.date, today),
            disabled: !resolveDateSelectable(cell.date),
          })
        }
      }
    }

    const snapshotYearOptions = yearOptions.map(year => ({
      value: year,
      disabled: !resolveYearSelectable(createDate(year, currentValue.getMonth(), 1)),
    }))
    const managedCellContent = new Map<string, ManagedCalendarCellContent>()
    if (cellFormatter) {
      const cells = isMonthMode
        ? dateRows.flatMap((row, rowIndex) =>
            row.cells.map((cell, column) => ({
              date: cell.date,
              key: cell.key,
              inView: cell.inView,
              row: rowIndex,
              column,
              week: row.week,
            })),
          )
        : monthOptions.map((month, index) => ({
            date: createDate(currentValue.getFullYear(), month.value, 1),
            key: `${currentValue.getFullYear()}-${String(month.value + 1).padStart(2, '0')}`,
            inView: true,
            row: Math.floor(index / 4),
            column: index % 4,
            week: undefined,
          }))
      for (const cell of cells) {
        const type = isMonthMode ? 'date' : 'month'
        const selected = isMonthMode
          ? isSameDate(cell.date, currentValue)
          : isSameMonth(cell.date, currentValue)
        const content = invokeCalendarRender(
          renderProfile,
          'cellFormatter',
          { type, key: cell.key, row: cell.row, column: cell.column },
          () =>
            cellFormatter(cloneDate(cell.date), {
              type,
              today: cloneDate(today),
              selected,
              isToday: isMonthMode ? isSameDate(cell.date, today) : isSameMonth(cell.date, today),
              inView: cell.inView,
              disabled: !resolveDateSelectable(cell.date),
              row: cell.row,
              column: cell.column,
              week: cell.week,
            }),
        )
        managedCellContent.set(cell.key, { key: cell.key, type, content: String(content ?? '') })
      }
    }

    const optimizedSnapshot: OptimizedDefaultCalendarSnapshot = {
      rest: {},
      rootClassName,
      fullscreen,
      currentMode,
      currentValue: cloneDate(currentValue),
      headerTitle,
      todayLabel,
      previousDisabled,
      nextDisabled,
      todayDisabled,
      yearOptions: snapshotYearOptions,
      monthOptions,
      weekdayLabels,
      dateRows,
      rowClassName,
      showWeek,
      viewLabel,
      weekButtonLabel,
      todayButtonLabel,
      monthButtonLabel,
      yearButtonLabel,
      todayMarkerLabel,
      dateCellStates,
      managedCellContent,
      hasDateCustomRender,
      hasMonthCustomRender,
      onPrevious: () =>
        triggerChange(
          currentMode === 'month' ? addMonths(currentValue, -1) : addYears(currentValue, -1),
          'customize',
        ),
      onToday: () => triggerChange(today, 'customize'),
      onNext: () =>
        triggerChange(
          currentMode === 'month' ? addMonths(currentValue, 1) : addYears(currentValue, 1),
          'customize',
        ),
      onYearChange: year => triggerChange(setCalendarYear(currentValue, year), 'customize'),
      onMonthChange: month => triggerChange(setCalendarMonth(currentValue, month), 'customize'),
      onModeMonth: () => triggerModeChange('month'),
      onModeYear: () => triggerModeChange('year'),
      onDateSelect: date => triggerChange(date, 'date'),
      onMonthSelect: date => triggerChange(date, 'month'),
    }

    emitCalendarRenderProfile(onRenderProfile, renderProfile, currentMode, 'compiled')
    return optimizedSnapshot
  })
  return <RenderOptimizedDefaultCalendarView arg0={viewSnapshot.get()} rootProps={rest} />
}

const CalendarPanel = CalendarPanelImpl

/** Cally web component 容器 */
const Cally: FC<CalendarHostProps> = ({ className, children, ...rest }) => {
  return (
    <calendar-date
      {...rest}
      data-testid={rest['data-testid']}
      className={mergeClassName('cally', className)}
    >
      {children}
    </calendar-date>
  )
}

/** Cally 的月份节点 */
const Month: FC<CalendarHostProps> = ({ className, children, ...rest }) => {
  return (
    <calendar-month {...rest} data-testid={rest['data-testid']} className={className}>
      {children}
    </calendar-month>
  )
}

/** Pikaday 输入框样式包装 */
const PikaSingle: FC<CalendarPikaSingleProps> = ({ type = 'text', className, ...rest }) => {
  return (
    <input
      {...rest}
      data-testid={rest['data-testid']}
      id={rest.id}
      value={rest.value}
      type={type}
      className={mergeClassName('pika-single', className)}
    />
  )
}

type CalendarCompound = FC<CalendarProps> & {
  Cally: FC<CalendarHostProps>
  Month: FC<CalendarHostProps>
  PikaSingle: FC<CalendarPikaSingleProps>
}

const CalendarCompound: CalendarCompound = /*#__PURE__*/ Object.assign(CalendarPanel, {
  Cally,
  Month,
  PikaSingle,
})

/** 默认导出日历组件。 */
export default CalendarCompound
