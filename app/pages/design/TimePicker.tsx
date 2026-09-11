import { TimePickerRangePicker } from '@rue-js/design'
import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import PreviewBlock, { type PreviewTabMode } from './PreviewBlock'
import TimePicker, {
  type TimePickerDisabledConfig,
  type TimePickerValue,
} from '../../../packages/rue-design/src/components/time-picker/index'

interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
}

const ApiTable: FC<{ rows: ApiRow[] }> = ({ rows }) => {
  return (
    <div className="not-prose overflow-x-auto rounded-box border border-base-300 bg-base-100">
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

const singleApiRows: ApiRow[] = [
  {
    prop: 'value / defaultValue',
    description: '当前时间与非受控初始值，使用格式化字符串承载。',
    type: 'string | null',
    defaultValue: '-',
  },
  {
    prop: 'format',
    description: '时间展示格式；默认 24 小时制为 HH:mm:ss，12 小时制为 h:mm:ss a。',
    type: 'string',
    defaultValue: "'HH:mm:ss'",
  },
  {
    prop: 'use12Hours',
    description: '切换 12 小时制，并自动补出 meridiem 列。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'hourStep / minuteStep / secondStep',
    description: '控制列步长，适合排班、预约和节奏化录入。',
    type: 'number',
    defaultValue: '1',
  },
  {
    prop: 'disabledTime',
    description: '按小时、分钟、秒粒度禁用时间。',
    type: '(selection) => { disabledHours?; disabledMinutes?; disabledSeconds? }',
    defaultValue: '-',
  },
  {
    prop: 'hideDisabledOptions',
    description: '把不可用项直接从列里隐藏，适合强约束流程。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'needConfirm',
    description: '启用确认按钮，面板内先调整草稿值，再显式提交。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'renderExtraFooter',
    description: '面板底部扩展内容，用于说明、快捷入口或状态提示。',
    type: '() => any',
    defaultValue: '-',
  },
  {
    prop: 'allowClear',
    description: '展示清空按钮，也支持传入自定义 clearIcon。',
    type: 'boolean | { clearIcon?: any }',
    defaultValue: 'false',
  },
  {
    prop: 'status / variant / size',
    description: '复用 Rue 输入体系的语义状态、变体和尺寸。',
    type: "'warning' | 'error' / 'outlined' | 'filled' | 'ghost' | 'borderless' / TimePickerSize",
    defaultValue: "'outlined' / -",
  },
  {
    prop: 'onCalendarChange',
    description: '面板内草稿值变化时触发，适合预览与联动。',
    type: '(value, timeString, info) => void',
    defaultValue: '-',
  },
  {
    prop: 'onChange',
    description: '提交后的值变化回调，info.source 会标记 panel、input、clear、now、confirm。',
    type: '(value, timeString, info) => void',
    defaultValue: '-',
  },
]

const rangeApiRows: ApiRow[] = [
  {
    prop: 'TimePicker.RangePicker',
    description: '复用单值内核，输出 [start, end] 字符串元组。',
    type: 'FC<TimeRangePickerProps>',
    defaultValue: '-',
  },
  {
    prop: 'value / defaultValue',
    description: '范围的受控值与初始值。',
    type: '[string | null, string | null]',
    defaultValue: '-',
  },
  {
    prop: 'placeholder',
    description: '支持单个占位文案或 [开始, 结束] 双占位。',
    type: 'string | [string, string]',
    defaultValue: "['开始时间', '结束时间']",
  },
  {
    prop: 'disabledTime',
    description: '第二个参数会标记 start 或 end，便于分别约束两个输入。',
    type: '(selection, type) => TimePickerDisabledConfig',
    defaultValue: '-',
  },
  {
    prop: 'order',
    description: '当开始时间晚于结束时间时自动排序。',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    prop: 'onCalendarChange / onChange',
    description: '分别响应草稿值与最终值变化，并带上 range 信息。',
    type: '(values, timeStrings, info) => void',
    defaultValue: '-',
  },
]

const disabledSchedule = (selection: TimePickerValue | null): TimePickerDisabledConfig => {
  const selectedHour = selection?.hour ?? 0
  return {
    disabledHours: () => [0, 1, 2, 3, 4, 5, 6, 7, 20, 21, 22, 23],
    disabledMinutes: hour => {
      if (hour === 8) return [0, 15, 30, 45]
      if (hour === 19) {
        return [
          30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51,
          52, 53, 54, 55, 56, 57, 58, 59,
        ]
      }
      return []
    },
    disabledSeconds: hour => {
      if (hour === selectedHour && hour === 9) {
        return [55, 56, 57, 58, 59]
      }
      return []
    },
  }
}

const rangeDisabledTime = (
  selection: TimePickerValue | null,
  type: 'start' | 'end',
): TimePickerDisabledConfig => {
  if (type === 'start') {
    return {
      disabledHours: () => [0, 1, 2, 3, 4, 5, 23],
    }
  }

  return {
    disabledHours: () => [0, 1, 2, 3, 4, 5],
    disabledMinutes: hour => {
      if ((selection?.hour ?? hour) >= 22) {
        return [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]
      }
      return []
    },
  }
}

const strictTimePattern = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/

const isStrictTimeValue = (value: string) => {
  return strictTimePattern.test(value.trim())
}

const basicCode = `const isStrictTimeValue = value => /^([01]\\d|2[0-3]):([0-5]\\d):([0-5]\\d)$/.test(value.trim())

const value = ref('09:30:15')
const liveValue = ref('09:30:15')
const inputStatus = ref<'error' | undefined>(undefined)
const helperText = ref('可直接手写时间，输入 HH:mm:ss 后按 Enter 或失焦提交')

<TimePicker
  value={value}
  allowClear
  status={inputStatus.value}
  onInput={event => {
    const nextText = ((event.target as HTMLInputElement | null)?.value ?? '').trim()
    liveValue.value = nextText || '未选择'
    if (!nextText) {
      inputStatus.value = undefined
      helperText.value = '可直接清空，提交后会清掉当前选择'
      return
    }
    if (isStrictTimeValue(nextText)) {
      inputStatus.value = undefined
      helperText.value = '手写格式正确，提交后同步受控值'
      return
    }
    inputStatus.value = 'error'
    helperText.value = '格式需为 HH:mm:ss，例如 21:45:00'
  }}
  onBlur={() => {
    setTimeout(() => {
      liveValue.value = value.value || '未选择'
    }, 0)
  }}
  onChange={(nextValue, timeString) => {
    value.value = nextValue ?? ''
    liveValue.value = timeString || '未选择'
    inputStatus.value = undefined
    helperText.value = nextValue ? '已通过校验并同步受控值' : '当前为空值'
  }}
/>`

const appearanceCode = `<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
  <TimePicker size="xs" defaultValue="08:00:00" />
  <TimePicker size="lg" variant="filled" defaultValue="13:45:00" />
  <TimePicker status="warning" defaultValue="17:20:00" />
  <TimePicker status="error" variant="borderless" placeholder="需补录时间" />
  <TimePicker variant="ghost" defaultValue="21:10:00" />
</div>`

const formatCode = `const rhythm = ref('13:30')
const lounge = ref('8:15 pm')

<TimePicker
  value={rhythm}
  format="HH:mm"
  minuteStep={15}
  onChange={nextValue => {
    rhythm.value = nextValue ?? ''
  }}
/>

<TimePicker
  value={lounge}
  format="h:mm a"
  use12Hours
  hourStep={2}
  minuteStep={5}
  onChange={nextValue => {
    lounge.value = nextValue ?? ''
  }}
/>`

const confirmCode = `const committed = ref('11:00:00')
const preview = ref('预览：11:00:00')

<TimePicker
  value={committed}
  needConfirm
  showNow
  renderExtraFooter={() => <span>下一个同步窗口将在 11:30 开始</span>}
  onCalendarChange={(_nextValue, timeString) => {
    preview.value = '预览：' + (timeString || '未选择')
  }}
  onChange={nextValue => {
    committed.value = nextValue ?? ''
  }}
/>`

const disabledCode = `const review = ref('09:20:00')

const disabledTime = selection => ({
  disabledHours: () => [0, 1, 2, 3, 4, 5, 6, 7, 20, 21, 22, 23],
  disabledMinutes: hour => {
    if (hour === 8) return [0, 15, 30, 45]
    if (hour === 19) {
      return [
        30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48,
        49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59,
      ]
    }
    return []
  },
  disabledSeconds: hour => {
    if ((selection?.hour ?? hour) === 9) return [55, 56, 57, 58, 59]
    return []
  },
})

<TimePicker
  value={review}
  hideDisabledOptions
  disabledTime={disabledTime}
  onChange={nextValue => {
    review.value = nextValue ?? ''
  }}
/>`

const rangeCode = `const range = ref<[string | null, string | null]>(['09:00:00', '18:30:00'])

<TimePickerRangePicker
  value={range}
  order
  allowClear
  placeholder={['开始排练', '结束排练']}
  onChange={nextValues => {
    range.value = nextValues
  }}
/>`

const manualCode = `const manual = ref('21:15:00')

<TimePicker
  value={manual}
  allowClear
  addonBefore="UTC+8"
  renderExtraFooter={() => <span>支持直接输入 21:45:00 这类格式化字符串</span>}
  onChange={nextValue => {
    manual.value = nextValue ?? ''
  }}
/>`

interface BasicControlledPreviewProps {
  hourStep?: number
  minuteStep?: number
  secondStep?: number
}

export const BasicControlledPreview: FC<BasicControlledPreviewProps> = ({
  hourStep,
  minuteStep,
  secondStep,
}) => {
  const basicValue = ref('09:30:15')
  const basicLiveValue = ref('09:30:15')
  const basicInputStatus = ref<'error' | undefined>(undefined)
  const basicHelperText = ref('可直接手写时间，输入 HH:mm:ss 后按 Enter 或失焦提交')

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <div className="rounded-[1.5rem] border border-base-300 bg-gradient-to-br from-base-100 via-base-100 to-base-200/55 p-5">
        <TimePicker
          value={basicValue}
          allowClear
          hourStep={hourStep}
          minuteStep={minuteStep}
          secondStep={secondStep}
          status={basicInputStatus.value}
          onInput={event => {
            const nextText = ((event.target as HTMLInputElement | null)?.value ?? '').trim()
            basicLiveValue.value = nextText || '未选择'
            if (!nextText) {
              basicInputStatus.value = undefined
              basicHelperText.value = '可直接清空，提交后会清掉当前选择'
              return
            }
            if (isStrictTimeValue(nextText)) {
              basicValue.value = nextText
              basicInputStatus.value = undefined
              basicHelperText.value = '手写格式正确，已同步受控值'
              return
            }
            basicInputStatus.value = 'error'
            basicHelperText.value = '格式需为 HH:mm:ss，例如 21:45:00'
          }}
          onBlur={() => {
            setTimeout(() => {
              basicLiveValue.value = basicValue.value || '未选择'
            }, 0)
          }}
          onChange={(nextValue, timeString) => {
            basicValue.value = nextValue ?? ''
            basicLiveValue.value = timeString || '未选择'
            basicInputStatus.value = undefined
            basicHelperText.value = nextValue ? '已通过校验并同步受控值' : '当前为空值'
          }}
        />
        <div className="mt-4 text-xs uppercase tracking-[0.24em] text-base-content/45">
          Live value
        </div>
        <div className="mt-2 text-2xl font-semibold text-base-content">{basicLiveValue.value}</div>
        <div
          className={`mt-3 text-sm ${
            basicInputStatus.value === 'error' ? 'text-error' : 'text-base-content/65'
          }`}
        >
          {basicHelperText.value}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: '输入', value: 'input 可直接手写 HH:mm:ss' },
          { label: '校验', value: '失焦或回车时校验并同步受控值' },
          { label: '清空', value: 'allowClear 提交空值并重置展示' },
        ].map(item => (
          <div key={item.label} className="rounded-2xl border border-base-300 bg-base-100 p-4">
            <div className="text-[11px] uppercase tracking-[0.2em] text-base-content/45">
              {item.label}
            </div>
            <div className="mt-2 text-sm leading-6 text-base-content/75">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const FormatPreview: FC = () => {
  const rhythmValue = ref('13:30')
  const loungeValue = ref('8:15 pm')

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-base-300 bg-base-100 p-5">
        <div className="mb-3 text-sm font-medium">24 小时制节奏块</div>
        <TimePicker
          value={rhythmValue}
          format="HH:mm"
          minuteStep={15}
          onChange={nextValue => {
            rhythmValue.value = nextValue ?? ''
          }}
        />
        <div className="mt-4 text-sm text-base-content/70">当前节奏：{rhythmValue.value}</div>
      </div>
      <div className="rounded-2xl border border-base-300 bg-base-100 p-5">
        <div className="mb-3 text-sm font-medium">12 小时制 lounge 模式</div>
        <TimePicker
          value={loungeValue}
          format="h:mm a"
          use12Hours
          hourStep={2}
          minuteStep={5}
          onChange={nextValue => {
            loungeValue.value = nextValue ?? ''
          }}
        />
        <div className="mt-4 text-sm text-base-content/70">当前选择：{loungeValue.value}</div>
      </div>
    </div>
  )
}

const ConfirmPreview: FC = () => {
  const committedValue = ref('11:00:00')
  const confirmPreview = ref('预览：11:00:00')

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
      <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-5">
        <TimePicker
          value={committedValue}
          needConfirm
          showNow
          renderExtraFooter={() => <span>下一个同步窗口将在 11:30 开始</span>}
          onCalendarChange={(_nextValue, timeString) => {
            confirmPreview.value = `预览：${timeString || '未选择'}`
          }}
          onChange={nextValue => {
            committedValue.value = nextValue ?? ''
          }}
        />
        <div className="mt-4 text-sm text-base-content/70">提交值：{committedValue.value}</div>
      </div>
      <div className="rounded-[1.5rem] border border-dashed border-base-300 bg-base-100/70 p-5">
        <div className="text-[11px] uppercase tracking-[0.22em] text-base-content/45">
          Preview State
        </div>
        <div className="mt-2 text-xl font-semibold">{confirmPreview.value}</div>
        <p className="mt-3 text-sm leading-6 text-base-content/70">
          面板变化先走 onCalendarChange，真正提交再触发 onChange，适合联动提示与确认按钮并存的流程。
        </p>
      </div>
    </div>
  )
}

const DisabledPreview: FC = () => {
  const disabledValue = ref('09:20:00')

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-5">
        <TimePicker
          value={disabledValue}
          hideDisabledOptions
          disabledTime={disabledSchedule}
          onChange={nextValue => {
            disabledValue.value = nextValue ?? ''
          }}
        />
        <div className="mt-4 text-sm text-base-content/70">审核时段：{disabledValue.value}</div>
      </div>
      <div className="grid gap-3">
        {[
          '仅开放 08:00 - 19:29 的有效窗口',
          '08 点整点只允许 15 分钟节拍之外的值',
          '09 点时自动禁用 55-59 秒的尾部时间',
        ].map(item => (
          <div
            key={item}
            className="rounded-2xl border border-base-300 bg-base-100 p-4 text-sm leading-6 text-base-content/75"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

const RangePreview: FC = () => {
  const rangeValue = ref<[string | null, string | null]>(['09:00:00', '18:30:00'])

  return (
    <div className="rounded-[1.5rem] border border-base-300 bg-gradient-to-br from-base-100 via-base-100 to-base-200/45 p-5">
      <TimePickerRangePicker
        value={rangeValue}
        order
        allowClear
        placeholder={['开始排练', '结束排练']}
        disabledTime={rangeDisabledTime}
        onChange={nextValues => {
          rangeValue.value = nextValues
        }}
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
          <div className="text-[11px] uppercase tracking-[0.2em] text-base-content/45">Start</div>
          <div className="mt-2 text-lg font-semibold">{rangeValue.value[0] ?? '未设置'}</div>
        </div>
        <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
          <div className="text-[11px] uppercase tracking-[0.2em] text-base-content/45">End</div>
          <div className="mt-2 text-lg font-semibold">{rangeValue.value[1] ?? '未设置'}</div>
        </div>
      </div>
    </div>
  )
}

const ManualPreview: FC = () => {
  const manualValue = ref('21:15:00')

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-5">
        <TimePicker
          value={manualValue}
          allowClear
          addonBefore="UTC+8"
          renderExtraFooter={() => <span>支持直接输入 21:45:00 这类格式化字符串</span>}
          onChange={nextValue => {
            manualValue.value = nextValue ?? ''
          }}
        />
      </div>
      <div className="rounded-[1.5rem] border border-dashed border-base-300 bg-base-100/70 p-5">
        <div className="text-[11px] uppercase tracking-[0.2em] text-base-content/45">
          Manual Input Hint
        </div>
        <p className="mt-3 text-sm leading-6 text-base-content/70">
          当前格式下可以直接键入 21:45:00；如果切到 <code>h:mm a</code>，则输入会改成 8:45 pm
          这类字符串。
        </p>
        <div className="mt-4 text-lg font-semibold">{manualValue.value || '空值'}</div>
      </div>
    </div>
  )
}

const TimePickerPage: FC = () => {
  const tabBasic = ref<PreviewTabMode>('preview')
  const tabAppearance = ref<PreviewTabMode>('preview')
  const tabFormat = ref<PreviewTabMode>('preview')
  const tabConfirm = ref<PreviewTabMode>('preview')
  const tabDisabled = ref<PreviewTabMode>('preview')
  const tabRange = ref<PreviewTabMode>('preview')
  const tabManual = ref<PreviewTabMode>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>TimePicker 时间选择器</h1>
        <p className="text-sm mt-3 mb-3">
          TimePicker 把 Rue 当前输入基座组织成可输入、可弹层选择、可范围组合的时间录入组件。
          视觉仍然使用 Rue 的输入气质，但能力面扩展到步进、12 小时制、禁用时间、确认式提交与
          RangePicker。
        </p>
        <div className="not-prose mb-4 flex flex-wrap gap-2">
          <span className="badge badge-outline">12h / 24h</span>
          <span className="badge badge-outline">Step</span>
          <span className="badge badge-outline">Disabled Time</span>
          <span className="badge badge-outline">Need Confirm</span>
          <span className="badge badge-outline">RangePicker</span>
        </div>

        <h2>何时使用</h2>
        <ul>
          <li>需要选择或录入一天内的具体时间，但不需要日历日期维度。</li>
          <li>希望把班次、预约、发布窗口这类规则直接体现在可选时间列里。</li>
          <li>需要在单值选择之外，再补一个轻量的时间范围录入能力。</li>
        </ul>

        <PreviewBlock
          title="基础受控值"
          summary="单值场景默认就是一个可输入的时间字段，点击后再展开 Rue 风格时间面板。"
          tab={tabBasic}
          code={basicCode}
          preview={BasicControlledPreview}
        />

        <PreviewBlock
          title="尺寸、状态与变体"
          summary="使用 Rue Input 的 size、status、variant 语义，不需要再记一套单独的外观 API。"
          tab={tabAppearance}
          code={appearanceCode}
          preview={() => (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <TimePicker size="xs" defaultValue="08:00:00" />
              <TimePicker size="lg" variant="filled" defaultValue="13:45:00" />
              <TimePicker status="warning" defaultValue="17:20:00" />
              <TimePicker status="error" variant="borderless" placeholder="需补录时间" />
              <TimePicker variant="ghost" defaultValue="21:10:00" />
              <TimePicker size="xl" defaultValue="06:30:00" />
            </div>
          )}
        />

        <PreviewBlock
          title="格式、12 小时制与步进"
          summary="通过 format 控制列数和展示文本，再用 step 把候选值压缩到排班、直播、预约等业务常用节奏。"
          tab={tabFormat}
          code={formatCode}
          preview={FormatPreview}
        />

        <PreviewBlock
          title="确认式选择与页脚说明"
          summary="把草稿态和提交态拆开，适合需要二次确认的切档、发布、切流窗口。"
          tab={tabConfirm}
          code={confirmCode}
          preview={ConfirmPreview}
        />

        <PreviewBlock
          title="禁用时间与隐藏无效项"
          summary="把不可选时间直接内联进列逻辑里，避免用户先选中、后报错。"
          tab={tabDisabled}
          code={disabledCode}
          preview={DisabledPreview}
        />

        <PreviewBlock
          title="RangePicker"
          summary="RangePicker 直接复用单值能力，并在输出时自动整理先后顺序。"
          tab={tabRange}
          code={rangeCode}
          preview={RangePreview}
        />

        <PreviewBlock
          title="手输、清空与附加块"
          summary="TimePicker 不是只能点面板；保持直接输入的效率，同时把附加时区、说明和清空动作整合进来。"
          tab={tabManual}
          code={manualCode}
          preview={ManualPreview}
        />

        <h2 id="time-picker-api">API</h2>
        <p>
          Rue 的 TimePicker 把输入和弹层合在同一个语义面里，因此既保持了手输效率，也补上了接近
          完整的核心能力层。
        </p>

        <h3>TimePicker</h3>
        <ApiTable rows={singleApiRows} />

        <h3>TimePicker.RangePicker</h3>
        <ApiTable rows={rangeApiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default TimePickerPage
