import type { FC } from '@rue-js/rue'
import { onMounted, onUnmounted, ref, useRef } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import Calendar from '../../../packages/rue-design/src/components/calendar'
import Tabs from '../../../packages/rue-design/src/components/tabs'
import { renderDesignPreview } from './preview-test-gate'
import BasicCalendarPreview from './calendar/BasicCalendarPreview'
import {
  CallyCalendarPreview,
  CallyDatePickerPreview,
  PikadayCalendarPreview,
} from './calendar/LegacyCalendarPreviews'

type TabMode = 'preview' | 'code'
type DemoCalendarMode = 'month' | 'year'
type EventTone = 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'

interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
}

interface ExportRow {
  name: string
  description: string
}

interface ExampleBlockProps {
  title: string
  summary?: string
  tab: { value: TabMode }
  preview: FC
  code: string
  lang?: string
  previewLoadDelay?: number
  previewLoadNote?: string
}

interface CalendarEventItem {
  tone: EventTone
  label: string
}

const apiRows: ApiRow[] = [
  {
    prop: 'cellRender',
    description: '按日期格或月份格补充内容，适合放日程列表、状态徽标等轻量信息',
    type: '(date: Date, info) => any',
    defaultValue: '-',
  },
  {
    prop: 'defaultValue',
    description: '非受控模式下的初始日期',
    type: 'Date | string | number',
    defaultValue: 'new Date()',
  },
  {
    prop: 'disabledDate',
    description: '禁用特定日期；会同时影响日期格、月份导航与年份导航',
    type: '(date: Date) => boolean',
    defaultValue: '-',
  },
  {
    prop: 'fullscreen',
    description: '切换为大面板或卡片模式',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    prop: 'fullCellRender',
    description: '完全接管单元格内容，适合 KPI、容量卡片等更强视觉定制',
    type: '(date: Date, info) => any',
    defaultValue: '-',
  },
  {
    prop: 'headerRender',
    description: '自定义头部，拿到年/月选项与模式切换方法',
    type: '(config) => any',
    defaultValue: '-',
  },
  {
    prop: 'mode',
    description: '视图模式，可在月视图与年视图之间切换',
    type: `'month' | 'year'`,
    defaultValue: `'month'`,
  },
  {
    prop: 'onRenderProfile',
    description: '渲染诊断回调，报告当前更新阶段、耗时、cellRender 调用次数与慢单元格',
    type: '(event: CalendarRenderProfileEvent) => void',
    defaultValue: '-',
  },
  {
    prop: 'renderProfileThreshold',
    description: '渲染诊断的慢调用阈值，超过后会在 onRenderProfile 中标记 slow',
    type: 'number',
    defaultValue: '16',
  },
  {
    prop: 'showWeek',
    description: '月视图下显示 ISO 周序号，适合排班和周计划看板',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'validRange',
    description: '限定可浏览与可选择的日期范围',
    type: '[Date | string | number, Date | string | number]',
    defaultValue: '-',
  },
  {
    prop: 'value',
    description: '受控日期；通常与 onChange、onPanelChange 搭配',
    type: 'Date | string | number',
    defaultValue: '-',
  },
  {
    prop: 'weekStartsOn',
    description: '自定义周起始日，0 表示周日，1 表示周一',
    type: '0 | 1 | 2 | 3 | 4 | 5 | 6',
    defaultValue: '1',
  },
]

const exportRows: ExportRow[] = [
  {
    name: 'Calendar.Cally',
    description: '展示基础 Cally web component 容器，适合需要 slot 导航的原生体验',
  },
  {
    name: 'Calendar.Month',
    description: 'Cally 的月份节点，和 Calendar.Cally 组合使用',
  },
  {
    name: 'Calendar.PikaSingle',
    description: 'Pikaday 输入框样式包装，仍可按原方式挂载第三方实例',
  },
]

const agendaByDate: Record<string, CalendarEventItem[]> = {
  '2026-04-08': [
    { tone: 'warning', label: 'Risk review' },
    { tone: 'success', label: 'QA ready' },
  ],
  '2026-04-10': [
    { tone: 'warning', label: 'Traffic replay' },
    { tone: 'success', label: 'Deploy window' },
    { tone: 'error', label: 'Rollback drill' },
  ],
  '2026-04-15': [
    { tone: 'info', label: 'Townhall' },
    { tone: 'warning', label: 'Launch freeze' },
    { tone: 'success', label: 'Content sync' },
    { tone: 'error', label: 'Incident review' },
  ],
  '2026-04-18': [{ tone: 'accent', label: 'Design crit' }],
  '2026-04-22': [
    { tone: 'primary', label: 'v2 beta' },
    { tone: 'success', label: 'Landing ready' },
  ],
}

const monthBacklog: Record<number, number> = {
  2: 12,
  3: 28,
  4: 18,
  8: 43,
}

const compactLoad: Record<string, number> = {
  '2026-09-03': 24,
  '2026-09-07': 46,
  '2026-09-11': 68,
  '2026-09-18': 92,
  '2026-09-23': 58,
  '2026-09-27': 37,
}

const eventToneClassName: Record<EventTone, string> = {
  primary: 'badge-primary',
  secondary: 'badge-secondary',
  accent: 'badge-accent',
  info: 'badge-info',
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
}

const formatIsoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDateLabel = (value?: string | Date) => {
  if (!value) {
    return '未选择'
  }
  return typeof value === 'string' ? value : formatIsoDate(value)
}

const formatPanelLabel = (date: Date, mode: DemoCalendarMode) => {
  if (mode === 'year') {
    return `${new Intl.DateTimeFormat('zh-CN', { year: 'numeric' }).format(date)} / 年视图`
  }
  return `${new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' }).format(date)} / 月视图`
}

const MetaItem: FC<{ label: string; value: string }> = ({ label, value }) => {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1rem] bg-base-200/70 px-3 py-2">
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-base-content/55">
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

const ApiTable: FC<{ rows: ApiRow[] }> = ({ rows }) => {
  return (
    <div className="not-prose overflow-x-auto rounded-[1.5rem] border border-base-300 bg-base-100 shadow-sm">
      <table className="table table-zebra">
        <thead>
          <tr>
            <th>属性</th>
            <th>说明</th>
            <th>类型</th>
            <th>默认值</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.prop}>
              <td>
                <code>{row.prop}</code>
              </td>
              <td>{row.description}</td>
              <td>
                <code>{row.type}</code>
              </td>
              <td>
                <code>{row.defaultValue}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const ExportTable: FC<{ rows: ExportRow[] }> = ({ rows }) => {
  return (
    <div className="not-prose overflow-x-auto rounded-[1.5rem] border border-base-300 bg-base-100 shadow-sm">
      <table className="table table-zebra">
        <thead>
          <tr>
            <th>导出</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.name}>
              <td>
                <code>{row.name}</code>
              </td>
              <td>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const ExampleBlock: FC<ExampleBlockProps> = ({
  title,
  summary,
  tab,
  preview,
  code,
  lang = 'tsx',
  previewLoadDelay,
  previewLoadNote,
}) => {
  const shouldLoadPreview = ref(previewLoadDelay == null)
  const preloadTimer = useRef<number | null>(null)

  onMounted(() => {
    if (previewLoadDelay == null || shouldLoadPreview.value) {
      return
    }

    preloadTimer.current = window.setTimeout(() => {
      shouldLoadPreview.value = true
      preloadTimer.current = null
    }, previewLoadDelay)
  })

  onUnmounted(() => {
    if (preloadTimer.current != null) {
      window.clearTimeout(preloadTimer.current)
      preloadTimer.current = null
    }
  })

  return (
    <div className="component-preview not-prose my-6 text-base-content lg:my-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># {title}</h2>
          {summary ? <p className="m-0 text-sm opacity-70">{summary}</p> : null}
        </div>
      </div>
      <Tabs
        style="box"
        items={[
          { key: 'preview', label: '预览' },
          { key: 'code', label: 'JSX代码' },
        ]}
        activeKey={tab.value}
        onChange={key => (tab.value = key as TabMode)}
        className="mb-3 mt-4"
      />
      {tab.value !== 'preview' ? (
        <Code className="mt-2" lang={lang} code={code} />
      ) : !shouldLoadPreview.value ? (
        <div className="rounded-[1.5rem] border border-base-300 bg-base-100/80 p-5 shadow-sm">
          <div className="badge badge-outline badge-sm">Preview</div>
          <p className="mb-0 mt-3 text-sm text-base-content/72">
            {previewLoadNote || '预览正在后台初始化，页面主体会先显示出来。'}
          </p>
        </div>
      ) : (
        renderDesignPreview(title, preview)
      )}
    </div>
  )
}

const HeroCard: FC<{ title: string; detail: string; badge: string }> = ({
  title,
  detail,
  badge,
}) => {
  return (
    <div className="rounded-[1.35rem] border border-base-300/80 bg-base-100/85 p-4 shadow-sm">
      <div className="badge badge-outline badge-sm">{badge}</div>
      <h3 className="mt-3 mb-1 text-base font-semibold">{title}</h3>
      <p className="m-0 text-sm text-base-content/70">{detail}</p>
    </div>
  )
}

const NoticeCalendarPreview: FC = () => {
  const selectedValue = ref('2026-04-15')
  const panelMode = ref<DemoCalendarMode>('month')

  return (
    <div className="space-y-4">
      <Calendar
        data-testid="notice-calendar"
        locale="zh-CN"
        value={selectedValue.value}
        mode={panelMode.value}
        onChange={date => {
          selectedValue.value = formatIsoDate(date)
        }}
        onPanelChange={(_date, nextMode) => {
          panelMode.value = nextMode as DemoCalendarMode
        }}
        cellRender={(date, info) => {
          if (info.type === 'month') {
            const backlog = monthBacklog[date.getMonth()]
            return backlog ? (
              <div className="space-y-1">
                <div className="text-lg font-semibold leading-none">{backlog}</div>
                <div className="text-[0.68rem] uppercase tracking-[0.22em] opacity-60">Backlog</div>
              </div>
            ) : null
          }

          const items = agendaByDate[formatIsoDate(date)] ?? []
          if (!items.length) {
            return null
          }

          return (
            <div className="space-y-1">
              {items.slice(0, 2).map(item => (
                <div
                  key={item.label}
                  className={`badge badge-soft badge-xs ${eventToneClassName[item.tone]}`}
                >
                  {item.label}
                </div>
              ))}
              {items.length > 2 ? (
                <div className="text-[0.62rem] opacity-60">+{items.length - 2} more</div>
              ) : null}
            </div>
          )
        }}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <MetaItem label="当前日期" value={formatDateLabel(selectedValue.value)} />
        <MetaItem label="4 月 15 日事件" value={`${agendaByDate['2026-04-15']?.length ?? 0} 条`} />
        <MetaItem label="9 月 backlog" value={`${monthBacklog[8]} 项`} />
      </div>
    </div>
  )
}

const CardCalendarPreview: FC = () => {
  const selectedValue = ref('2026-09-18')
  const panelMode = ref<DemoCalendarMode>('month')

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        <div className="max-w-full overflow-x-auto">
          <Calendar
            data-testid="card-calendar"
            className="w-[34rem] max-w-none"
            locale="zh-CN"
            fullscreen={false}
            value={selectedValue.value}
            mode={panelMode.value}
            onChange={date => {
              selectedValue.value = formatIsoDate(date)
            }}
            onPanelChange={(_date, nextMode) => {
              panelMode.value = nextMode as DemoCalendarMode
            }}
            fullCellRender={(date, info) => {
              if (info.type !== 'date') {
                return info.originNode
              }

              const load = compactLoad[formatIsoDate(date)]
              if (load == null) {
                return info.originNode
              }

              return (
                <div className="flex h-full flex-col justify-between gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{date.getDate()}</span>
                    <span
                      className={`badge badge-xs ${load >= 80 ? 'badge-error' : load >= 60 ? 'badge-warning' : 'badge-success'} badge-soft`}
                    >
                      {load}%
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-base-300/70">
                      <div
                        className={`h-full rounded-full ${load >= 80 ? 'bg-error' : load >= 60 ? 'bg-warning' : 'bg-success'}`}
                        style={{ width: `${load}%` }}
                      ></div>
                    </div>
                    <div className="text-[0.62rem] uppercase tracking-[0.22em] opacity-60">
                      Studio load
                    </div>
                  </div>
                </div>
              )
            }}
          />
        </div>

        <div className="rounded-[1.5rem] border border-base-300 bg-base-100/85 p-4 shadow-sm">
          <div className="badge badge-secondary badge-soft">Card Mode</div>
          <h3 className="mt-3 mb-1 text-base font-semibold">容量面板</h3>
          <p className="m-0 text-sm text-base-content/70">
            使用 fullscreen=false 收成卡片，再用 fullCellRender 把单元格改造成带进度条的容量卡。
          </p>
          <div className="mt-4 space-y-3">
            <MetaItem label="当前日期" value={formatDateLabel(selectedValue.value)} />
            <MetaItem label="高负载日" value="9/18 · 92%" />
            <MetaItem label="布局定位" value="侧栏、仪表盘、详情卡片" />
          </div>
        </div>
      </div>
    </div>
  )
}

const CustomHeaderCalendarPreview: FC = () => {
  const selectedValue = ref('2026-07-04')
  const panelMode = ref<DemoCalendarMode>('month')
  const actionSource = ref('date')

  return (
    <div className="space-y-4">
      <Calendar
        data-testid="custom-header-calendar"
        locale="zh-CN"
        value={selectedValue.value}
        mode={panelMode.value}
        headerRender={({
          value: current,
          type,
          yearOptions,
          monthOptions,
          onMonthChange,
          onTypeChange,
          onYearChange,
        }) => (
          <div className="border-b border-base-300/70 px-3 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-base-content/55">
                  Studio Header
                </div>
                <div className="mt-1 text-base font-semibold">
                  {formatPanelLabel(current, type as DemoCalendarMode)}
                </div>
              </div>
              <div className="join">
                <button
                  type="button"
                  className={`btn btn-sm join-item ${type === 'month' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => onTypeChange('month')}
                >
                  月视图
                </button>
                <button
                  type="button"
                  className={`btn btn-sm join-item ${type === 'year' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => onTypeChange('year')}
                >
                  年视图
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <select
                className="select select-sm min-w-24"
                value={current.getFullYear()}
                onChange={(event: Event) =>
                  onYearChange(Number((event.currentTarget as HTMLSelectElement).value))
                }
              >
                {yearOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                className="select select-sm min-w-24"
                value={current.getMonth()}
                disabled={type === 'year'}
                onChange={(event: Event) =>
                  onMonthChange(Number((event.currentTarget as HTMLSelectElement).value))
                }
              >
                {monthOptions.map(option => (
                  <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        onChange={date => {
          selectedValue.value = formatIsoDate(date)
        }}
        onPanelChange={(_date, nextMode) => {
          panelMode.value = nextMode as DemoCalendarMode
        }}
        onSelect={(_date, info) => {
          actionSource.value = info.source
        }}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <MetaItem label="当前日期" value={formatDateLabel(selectedValue.value)} />
        <MetaItem label="当前模式" value={panelMode.value} />
        <MetaItem label="最近来源" value={actionSource.value} />
      </div>
    </div>
  )
}

const basicCalendarCode = `import { ref } from '@rue-js/rue'
import { Calendar } from '@rue-js/design'
const maintenanceDates = new Set(['2026-04-04', '2026-04-05', '2026-05-01'])

const formatIsoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = \`\${date.getMonth() + 1}\`.padStart(2, '0')
  const day = \`\${date.getDate()}\`.padStart(2, '0')
  return \`\${year}-\${month}-\${day}\`
}

const parseDate = (value: string) => {
  const date = new Date(\`\${value}T00:00:00\`)
  date.setHours(12, 0, 0, 0)
  return date
}

const formatPanelLabel = (date: Date, mode: 'month' | 'year') => {
  if (mode === 'year') {
    return \`\${new Intl.DateTimeFormat('zh-CN', { year: 'numeric' }).format(date)} / 年视图\`
  }
  return \`\${new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' }).format(date)} / 月视图\`
}

const basicCalendarValidRange: [Date, Date] = [parseDate('2026-04-01'), parseDate('2026-05-31')]

const isBasicCalendarDateDisabled = (date: Date) => {
  return date.getDay() === 0 || date.getDay() === 6 || maintenanceDates.has(formatIsoDate(date))
}

const formatDateLabel = (value?: string | Date) => {
  if (!value) {
    return '未选择'
  }
  return typeof value === 'string' ? value : formatIsoDate(value)
}

export default function BasicCalendarDemo() {
  const selectedValue = ref('2026-04-12')
  const selectedSource = ref('date')
  const panelMode = ref<'month' | 'year'>('month')
  const panelState = ref(formatPanelLabel(parseDate(selectedValue.value), 'month'))
  const handleChange = (date: Date) => {
    selectedValue.value = formatIsoDate(date)
  }
  const handlePanelChange = (date: Date, nextMode: 'month' | 'year') => {
    panelState.value = formatPanelLabel(date, nextMode)
  }
  const handleSelect = (_date: Date, info: { source: string }) => {
    selectedSource.value = info.source
  }

  return (
    <div className="space-y-4">
      <Calendar
        locale="zh-CN"
        value={selectedValue.value}
        mode={panelMode.value}
        showWeek
        validRange={basicCalendarValidRange}
        disabledDate={isBasicCalendarDateDisabled}
        onChange={handleChange}
        onPanelChange={(date, nextMode) => {
          panelMode.value = nextMode
          handlePanelChange(date, nextMode)
        }}
        onSelect={handleSelect}
      />

      <div className="grid gap-3 rounded-[1.5rem] border border-base-300 bg-base-100/85 p-4 shadow-sm md:grid-cols-2">
        <div className="rounded-[1rem] bg-base-200/70 px-3 py-2">
          <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-base-content/55">
            当前值
          </div>
          <div className="mt-1 text-sm font-medium">{formatDateLabel(selectedValue.value)}</div>
        </div>

        <div className="rounded-[1rem] bg-base-200/70 px-3 py-2">
          <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-base-content/55">
            选择来源
          </div>
          <div className="mt-1 text-sm font-medium">{selectedSource.value}</div>
        </div>

        <div className="rounded-[1rem] bg-base-200/70 px-3 py-2 md:col-span-2">
          <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-base-content/55">
            面板状态
          </div>
          <div className="mt-1 text-sm font-medium">{panelState.value}</div>
        </div>
      </div>

      <p className="m-0 text-xs text-base-content/70">
        日期范围被限制在 2026 年 4 至 5 月之间，适合产品排期、门店值班或发布窗口场景。
      </p>
    </div>
  )
}`

const noticeCalendarCode = `import { ref } from '@rue-js/rue'
import { Calendar } from '@rue-js/design'
const agendaByDate = {
  '2026-04-08': [
    { tone: 'warning', label: 'Risk review' },
    { tone: 'success', label: 'QA ready' },
  ],
  '2026-04-10': [
    { tone: 'warning', label: 'Traffic replay' },
    { tone: 'success', label: 'Deploy window' },
    { tone: 'error', label: 'Rollback drill' },
  ],
  '2026-04-15': [
    { tone: 'info', label: 'Townhall' },
    { tone: 'warning', label: 'Launch freeze' },
    { tone: 'success', label: 'Content sync' },
    { tone: 'error', label: 'Incident review' },
  ],
  '2026-04-18': [{ tone: 'accent', label: 'Design crit' }],
  '2026-04-22': [
    { tone: 'primary', label: 'v2 beta' },
    { tone: 'success', label: 'Landing ready' },
  ],
} as const

const monthBacklog: Record<number, number> = {
  2: 12,
  3: 28,
  4: 18,
  8: 43,
}

const eventToneClassName = {
  primary: 'badge-primary',
  secondary: 'badge-secondary',
  accent: 'badge-accent',
  info: 'badge-info',
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
} as const

const formatIsoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = \`\${date.getMonth() + 1}\`.padStart(2, '0')
  const day = \`\${date.getDate()}\`.padStart(2, '0')
  return \`\${year}-\${month}-\${day}\`
}

export default function NoticeCalendarDemo() {
  const selectedValue = ref('2026-04-15')
  const panelMode = ref<'month' | 'year'>('month')

  return (
    <div className="space-y-4">
      <Calendar
        locale="zh-CN"
        value={selectedValue.value}
        mode={panelMode.value}
        onChange={date => {
          selectedValue.value = formatIsoDate(date)
        }}
        onPanelChange={(_date, nextMode) => {
          panelMode.value = nextMode
        }}
        cellRender={(date, info) => {
          if (info.type === 'month') {
            const backlog = monthBacklog[date.getMonth()]
            return backlog ? (
              <div className="space-y-1">
                <div className="text-lg font-semibold leading-none">{backlog}</div>
                <div className="text-[0.68rem] uppercase tracking-[0.22em] opacity-60">Backlog</div>
              </div>
            ) : null
          }

          const items = agendaByDate[formatIsoDate(date)] ?? []
          if (!items.length) {
            return null
          }

          return (
            <div className="space-y-1">
              {items.slice(0, 2).map(item => (
                <div key={item.label} className={\`badge badge-soft badge-xs \${eventToneClassName[item.tone]}\`}>
                  {item.label}
                </div>
              ))}
              {items.length > 2 ? (
                <div className="text-[0.62rem] opacity-60">+\${items.length - 2} more</div>
              ) : null}
            </div>
          )
        }}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="flex items-center justify-between gap-4 rounded-[1rem] bg-base-200/70 px-3 py-2">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-base-content/55">
            当前日期
          </span>
          <span className="text-sm font-medium">{selectedValue.value}</span>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-[1rem] bg-base-200/70 px-3 py-2">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-base-content/55">
            4 月 15 日事件
          </span>
          <span className="text-sm font-medium">{agendaByDate['2026-04-15']?.length ?? 0} 条</span>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-[1rem] bg-base-200/70 px-3 py-2">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-base-content/55">
            9 月 backlog
          </span>
          <span className="text-sm font-medium">{monthBacklog[8]} 项</span>
        </div>
      </div>
    </div>
  )
}`

const cardCalendarCode = `import { ref } from '@rue-js/rue'
import { Calendar } from '@rue-js/design'
const compactLoad: Record<string, number> = {
  '2026-09-03': 24,
  '2026-09-07': 46,
  '2026-09-11': 68,
  '2026-09-18': 92,
  '2026-09-23': 58,
  '2026-09-27': 37,
}

const formatIsoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = \`\${date.getMonth() + 1}\`.padStart(2, '0')
  const day = \`\${date.getDate()}\`.padStart(2, '0')
  return \`\${year}-\${month}-\${day}\`
}

export default function CardCalendarDemo() {
  const selectedValue = ref('2026-09-18')
  const panelMode = ref<'month' | 'year'>('month')

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        <div className="max-w-full overflow-x-auto">
          <Calendar
            className="w-[34rem] max-w-none"
            locale="zh-CN"
            fullscreen={false}
            value={selectedValue.value}
            mode={panelMode.value}
            onChange={date => {
              selectedValue.value = formatIsoDate(date)
            }}
            onPanelChange={(_date, nextMode) => {
              panelMode.value = nextMode
            }}
            fullCellRender={(date, info) => {
              if (info.type !== 'date') {
                return info.originNode
              }

              const load = compactLoad[formatIsoDate(date)]
              if (load == null) {
                return info.originNode
              }

              return (
                <div className="flex h-full flex-col justify-between gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{date.getDate()}</span>
                    <span className={\`badge badge-xs \${load >= 80 ? 'badge-error' : load >= 60 ? 'badge-warning' : 'badge-success'} badge-soft\`}>
                      {load}%
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-base-300/70">
                      <div
                        className={\`h-full rounded-full \${load >= 80 ? 'bg-error' : load >= 60 ? 'bg-warning' : 'bg-success'}\`}
                        style={{ width: \`\${load}%\` }}
                      ></div>
                    </div>
                    <div className="text-[0.62rem] uppercase tracking-[0.22em] opacity-60">Studio load</div>
                  </div>
                </div>
              )
            }}
          />
        </div>

        <div className="rounded-[1.5rem] border border-base-300 bg-base-100/85 p-4 shadow-sm">
          <div className="badge badge-secondary badge-soft">Card Mode</div>
          <h3 className="mt-3 mb-1 text-base font-semibold">容量面板</h3>
          <p className="m-0 text-sm text-base-content/70">
            使用 fullscreen=false 收成卡片，再用 fullCellRender 把单元格改造成带进度条的容量卡。
          </p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-[1rem] bg-base-200/70 px-3 py-2">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-base-content/55">
                当前日期
              </span>
              <span className="text-sm font-medium">{selectedValue.value}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-[1rem] bg-base-200/70 px-3 py-2">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-base-content/55">
                高负载日
              </span>
              <span className="text-sm font-medium">9/18 · 92%</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-[1rem] bg-base-200/70 px-3 py-2">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-base-content/55">
                布局定位
              </span>
              <span className="text-sm font-medium">侧栏、仪表盘、详情卡片</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}`

const customHeaderCalendarCode = `import { ref } from '@rue-js/rue'
import { Calendar } from '@rue-js/design'
const formatIsoDate = (date: Date) => {
  const year = date.getFullYear()
  const month = \`\${date.getMonth() + 1}\`.padStart(2, '0')
  const day = \`\${date.getDate()}\`.padStart(2, '0')
  return \`\${year}-\${month}-\${day}\`
}

const formatPanelLabel = (date: Date, mode: 'month' | 'year') => {
  if (mode === 'year') {
    return \`\${new Intl.DateTimeFormat('zh-CN', { year: 'numeric' }).format(date)} / 年视图\`
  }
  return \`\${new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' }).format(date)} / 月视图\`
}

export default function CustomHeaderCalendarDemo() {
  const selectedValue = ref('2026-07-04')
  const panelMode = ref<'month' | 'year'>('month')
  const actionSource = ref('date')

  return (
    <div className="space-y-4">
      <Calendar
        locale="zh-CN"
        value={selectedValue.value}
        mode={panelMode.value}
        headerRender={({ value: current, type, yearOptions, monthOptions, onMonthChange, onTypeChange, onYearChange }) => (
          <div className="border-b border-base-300/70 px-3 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-base-content/55">
                  Studio Header
                </div>
                <div className="mt-1 text-base font-semibold">{formatPanelLabel(current, type as 'month' | 'year')}</div>
              </div>
              <div className="join">
                <button
                  type="button"
                  className={\`btn btn-sm join-item \${type === 'month' ? 'btn-primary' : 'btn-ghost'}\`}
                  onClick={() => onTypeChange('month')}
                >
                  月视图
                </button>
                <button
                  type="button"
                  className={\`btn btn-sm join-item \${type === 'year' ? 'btn-primary' : 'btn-ghost'}\`}
                  onClick={() => onTypeChange('year')}
                >
                  年视图
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <select
                className="select select-sm min-w-24"
                value={current.getFullYear()}
                onChange={event => onYearChange(Number((event.currentTarget as HTMLSelectElement).value))}
              >
                {yearOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                className="select select-sm min-w-24"
                value={current.getMonth()}
                disabled={type === 'year'}
                onChange={event => onMonthChange(Number((event.currentTarget as HTMLSelectElement).value))}
              >
                {monthOptions.map(option => (
                  <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        onChange={date => {
          selectedValue.value = formatIsoDate(date)
        }}
        onPanelChange={(_date, nextMode) => {
          panelMode.value = nextMode as 'month' | 'year'
        }}
        onSelect={(_date, info) => {
          actionSource.value = info.source
        }}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="flex items-center justify-between gap-4 rounded-[1rem] bg-base-200/70 px-3 py-2">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-base-content/55">
            当前日期
          </span>
          <span className="text-sm font-medium">{selectedValue.value}</span>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-[1rem] bg-base-200/70 px-3 py-2">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-base-content/55">
            当前模式
          </span>
          <span className="text-sm font-medium">{panelMode.value}</span>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-[1rem] bg-base-200/70 px-3 py-2">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-base-content/55">
            最近来源
          </span>
          <span className="text-sm font-medium">{actionSource.value}</span>
        </div>
      </div>
    </div>
  )
}`

const callyCalendarCode = `import 'cally'
import { Calendar } from '@rue-js/design'
export default function CallyCalendarDemo() {
  return (
    <Calendar.Cally className="border border-base-300 bg-base-100 shadow-lg rounded-box">
      <svg
        aria-label="Previous"
        className="fill-current size-4"
        slot="previous"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <path fill="currentColor" d="M15.75 19.5 8.25 12l7.5-7.5"></path>
      </svg>
      <svg
        aria-label="Next"
        className="fill-current size-4"
        slot="next"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <path fill="currentColor" d="m8.25 4.5 7.5 7.5-7.5 7.5"></path>
      </svg>
      <Calendar.Month />
    </Calendar.Cally>
  )
}`

const callyDatePickerCode = `import 'cally'
import { ref } from '@rue-js/rue'
import { Calendar } from '@rue-js/design'
export default function CallyDatePickerDemo() {
  const open = ref(false)
  const value = ref('')

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="input input-bordered w-fit cursor-pointer"
        onClick={() => {
          open.value = !open.value
        }}
      >
        {value.value || 'Pick a date'}
      </button>

      <div className={\`inline-block rounded-box bg-base-100 p-3 shadow-lg \${open.value ? '' : 'hidden'}\`}>
        <Calendar.Cally
          onChange={event => {
            value.value = (event.currentTarget as HTMLElement & { value?: string }).value || ''
            open.value = false
          }}
        >
          <svg
            aria-label="Previous"
            className="fill-current size-4"
            slot="previous"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path fill="currentColor" d="M15.75 19.5 8.25 12l7.5-7.5"></path>
          </svg>
          <svg
            aria-label="Next"
            className="fill-current size-4"
            slot="next"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path fill="currentColor" d="m8.25 4.5 7.5 7.5-7.5 7.5"></path>
          </svg>
          <Calendar.Month />
        </Calendar.Cally>
      </div>
    </div>
  )
}`

const CalendarDemo: FC = () => {
  const tabBasic = ref<TabMode>('preview')
  const tabNotice = ref<TabMode>('preview')
  const tabCard = ref<TabMode>('preview')
  const tabHeader = ref<TabMode>('preview')
  const tabCallyCalendar = ref<TabMode>('preview')
  const tabCallyDatePicker = ref<TabMode>('preview')
  const tabPikaday = ref<TabMode>('preview')

  return (
    <SidebarPlayground>
      <div className="prose prose-sm max-w-none md:prose-base">
        <h1>Calendar 日历</h1>
        <p className="mt-3 mb-3 text-sm">
          Calendar 现在同时覆盖 Rue 原生月历面板、事项渲染、卡片式日历，以及 Cally、Pikaday
          两条基础接入链路。
        </p>
        <div className="not-prose grid gap-3 rounded-[1.75rem] border border-base-300 bg-gradient-to-br from-base-100 via-base-100 to-base-200/75 p-4 shadow-sm md:grid-cols-3">
          <HeroCard
            badge="Native Panel"
            title="Month / Year 两种面板"
            detail="新增默认 Calendar 面板，支持 value、mode、validRange、showWeek 与 headerRender。"
          />
          <HeroCard
            badge="Render Hooks"
            title="细胞级渲染能力"
            detail="cellRender 和 fullCellRender 可以把普通日期格组织为事项列表、容量卡或数据看板。"
          />
          <HeroCard
            badge="Composition Ready"
            title="基础场景完整覆盖"
            detail="Calendar.Cally、Calendar.Month、Calendar.PikaSingle 仍然可用，基础接入方式不需要拆。"
          />
        </div>

        <ExampleBlock
          title="Basic calendar"
          summary="默认面板，覆盖受控日期、范围限制、禁用规则与周序号。"
          tab={tabBasic}
          preview={BasicCalendarPreview}
          code={basicCalendarCode}
        />

        <ExampleBlock
          title="Notice calendar"
          summary="使用 cellRender 在日期格展示事项，在年视图展示月份 backlog。"
          tab={tabNotice}
          preview={NoticeCalendarPreview}
          code={noticeCalendarCode}
          previewLoadDelay={1200}
          previewLoadNote="事项日历会在页面显示后自动初始化，不再需要手动点击加载。"
        />

        <ExampleBlock
          title="Card mode"
          summary="缩成仪表盘卡片，再用 fullCellRender 为少量日期挂上负载进度。"
          tab={tabCard}
          preview={CardCalendarPreview}
          code={cardCalendarCode}
          previewLoadDelay={1800}
          previewLoadNote="卡片模式会在后台分帧挂载，避免首屏一次性把多个重预览一起算完。"
        />

        <ExampleBlock
          title="Custom header"
          summary="接管顶部工具条，自定义模式切换、年份与月份选择器。"
          tab={tabHeader}
          preview={CustomHeaderCalendarPreview}
          code={customHeaderCalendarCode}
          previewLoadDelay={2400}
          previewLoadNote="自定义头部示例会在页面稳定后自动挂载，减少首屏阻塞。"
        />

        <ExampleBlock
          title="Cally calendar example"
          summary="基础的 Cally web component 日历壳层仍然原样可用。"
          tab={tabCallyCalendar}
          preview={CallyCalendarPreview}
          code={callyCalendarCode}
          previewLoadDelay={3200}
          previewLoadNote="Cally 预览会延后挂载，避免阻塞第一个日历示例。"
        />

        <ExampleBlock
          title="Cally date picker example"
          summary="基础的日期输入弹层示例 展示，只把交互说明和布局重新编排。"
          tab={tabCallyDatePicker}
          preview={CallyDatePickerPreview}
          code={callyDatePickerCode}
          previewLoadDelay={4000}
          previewLoadNote="日期输入弹层会延后挂载，页面主体优先完成交互。"
        />

        <ExampleBlock
          title="Pikaday input example"
          summary="展示基础 pika-single 输入壳层，让第三方实例继续挂载在 Rue 组件树里。"
          tab={tabPikaday}
          preview={PikadayCalendarPreview}
          lang="html"
          previewLoadDelay={4800}
          previewLoadNote="Pikaday 第三方实例会延后初始化，避免拖慢首屏。"
          code={`<script src="https://cdn.jsdelivr.net/npm/pikaday/pikaday.js"></script>
<input type="text" class="input pika-single" id="myDatepicker">
<script>
  var picker = new Pikaday({ field: document.getElementById('myDatepicker') });
</script>`}
        />

        <section className="my-12 space-y-6">
          <div>
            <h2 className="mb-2">API</h2>
            <p className="m-0 text-sm text-base-content/70">
              默认 Calendar 面板聚焦于日历组件常见的核心交互能力，同时使用 Rue
              自己的视觉和基础导出方式。
            </p>
          </div>
          <ApiTable rows={apiRows} />

          <div>
            <h2 className="mb-2">附属导出</h2>
            <p className="m-0 text-sm text-base-content/70">
              基础的 Cally 与 Pikaday 接口没有删除，而是并列保持为复合导出，便于按需接入。
            </p>
          </div>
          <ExportTable rows={exportRows} />
        </section>
      </div>
    </SidebarPlayground>
  )
}

export default CalendarDemo
