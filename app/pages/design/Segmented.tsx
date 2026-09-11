import type { FC } from '@rue-js/rue'
import { ref, useRef } from '@rue-js/rue'
import { Segmented } from '@rue-js/design'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import PreviewBlock, { type PreviewTabMode } from './PreviewBlock'

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

const ListIcon: FC = () => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-[1em]"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12M8 12h12M8 17h12" />
      <circle cx="4" cy="7" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="4" cy="17" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  )
}

const BoardIcon: FC = () => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-[1em]"
    >
      <rect x="3.5" y="4.5" width="6" height="15" rx="1.5" />
      <rect x="10.5" y="4.5" width="5" height="9" rx="1.5" />
      <rect x="16.5" y="4.5" width="4" height="12" rx="1.5" />
    </svg>
  )
}

const PulseIcon: FC = () => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-[1em]"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l2.5-5 4 10 2.5-5H21" />
    </svg>
  )
}

const RocketIcon: FC = () => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-[1em]"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 19c1.4-3.8 4-6.9 8-9 1.5-.8 3.2-1.4 5-1.7-.3 1.8-.9 3.5-1.7 5-2.1 4-5.2 6.6-9 8"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9.5a1.5 1.5 0 1 0 0 .01Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16 5 19m3-3-3-3" />
    </svg>
  )
}

const MailIcon: FC = () => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-[1em]"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m4 7 8 6 8-6" />
    </svg>
  )
}

const BellIcon: FC = () => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-[1em]"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  )
}

const GridIcon: FC = () => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-[1em]"
    >
      <rect x="4" y="4" width="6" height="6" rx="1.25" />
      <rect x="14" y="4" width="6" height="6" rx="1.25" />
      <rect x="4" y="14" width="6" height="6" rx="1.25" />
      <rect x="14" y="14" width="6" height="6" rx="1.25" />
    </svg>
  )
}

const basicTab = ref<PreviewTabMode>('preview')
const sizeTab = ref<PreviewTabMode>('preview')
const customTab = ref<PreviewTabMode>('preview')
const verticalTab = ref<PreviewTabMode>('preview')
const formTab = ref<PreviewTabMode>('preview')
const runtimeCompatTab = ref<PreviewTabMode>('preview')

const cadenceInsights = {
  daily: {
    title: '日报视角',
    value: '14 条更新',
    description: '适合盯紧上线日、回归窗口和异常波动。',
  },
  weekly: {
    title: '周报视角',
    value: '5 个主题',
    description: '更适合团队同步节奏、优先级和资源占用。',
  },
  monthly: {
    title: '月报视角',
    value: '3 条主线',
    description: '沉淀阶段结论、版本成效和跨团队协作面。',
  },
  quarterly: {
    title: '季度视角',
    value: '2 个里程碑',
    description: '把组件、站点和生态的长期规划放在一起看。',
  },
} as const

const createViewOptions = () => [
  { label: 'List', value: 'list', icon: <ListIcon />, tooltip: '线性列表视图' },
  { label: 'Board', value: 'board', icon: <BoardIcon />, tooltip: '看板卡片视图' },
  { label: 'Pulse', value: 'pulse', icon: <PulseIcon />, tooltip: '监控态势视图' },
]

const createSeasonOptions = () => [
  {
    value: 'spring',
    label: (
      <div className="space-y-1 px-1 py-0.5">
        <div className="text-[0.72rem] uppercase tracking-[0.22em] text-emerald-600/85">Spring</div>
        <div className="text-sm font-semibold">Discover</div>
        <div className="text-xs text-base-content/58">探索问题、沉淀需求和假设。</div>
      </div>
    ),
  },
  {
    value: 'summer',
    label: (
      <div className="space-y-1 px-1 py-0.5">
        <div className="text-[0.72rem] uppercase tracking-[0.22em] text-amber-600/85">Summer</div>
        <div className="text-sm font-semibold">Build</div>
        <div className="text-xs text-base-content/58">压缩实现路径，快速验证关键交互。</div>
      </div>
    ),
  },
  {
    value: 'autumn',
    label: (
      <div className="space-y-1 px-1 py-0.5">
        <div className="text-[0.72rem] uppercase tracking-[0.22em] text-sky-600/85">Autumn</div>
        <div className="text-sm font-semibold">Launch</div>
        <div className="text-xs text-base-content/58">联调、验收、发布与投放一起收束。</div>
      </div>
    ),
  },
  {
    value: 'winter',
    label: (
      <div className="space-y-1 px-1 py-0.5">
        <div className="text-[0.72rem] uppercase tracking-[0.22em] text-violet-600/85">Winter</div>
        <div className="text-sm font-semibold">Review</div>
        <div className="text-xs text-base-content/58">回收经验、数据和下一轮迭代输入。</div>
      </div>
    ),
  },
]

const createPipelineOptions = () => [
  { value: 'draft', label: 'Draft', icon: <GridIcon /> },
  { value: 'design', label: 'Design QA', icon: <PulseIcon /> },
  { value: 'ship', label: 'Ready to Ship', icon: <RocketIcon /> },
  { value: 'observe', label: 'Observe', icon: <BellIcon />, disabled: true },
]

const createContactOptions = () => [
  { value: 'mail', label: 'Email', icon: <MailIcon /> },
  { value: 'notice', label: 'Notification', icon: <BellIcon /> },
  { value: 'launch', label: 'Launch Feed', icon: <RocketIcon /> },
]

const createDensityOptions = () => [
  { value: 'compact', icon: <ListIcon />, tooltip: '紧凑布局', title: 'Compact' },
  { value: 'comfortable', icon: <BoardIcon />, tooltip: '舒展布局', title: 'Comfortable' },
  { value: 'expanded', icon: <GridIcon />, tooltip: '更强信息密度', title: 'Expanded' },
]

const useStableOptions = <T,>(factory: () => T) => {
  const optionsRef = useRef<T>()

  if (!optionsRef.current) {
    optionsRef.current = factory()
  }

  return optionsRef.current
}

const componentApiRows: ApiRow[] = [
  {
    prop: 'options',
    description: '支持 string[]、number[] 或对象数组；对象项可带 label、icon、disabled、tooltip。',
    type: 'SegmentedOptions',
    defaultValue: '[]',
  },
  {
    prop: 'value / defaultValue',
    description: '受控与非受控两种写法，值与 options 中的 value 对应。',
    type: 'string | number',
    defaultValue: '首个可用项',
  },
  {
    prop: 'onChange',
    description: '选项切换时触发，返回当前选中的 value。',
    type: '(value) => void',
    defaultValue: '-',
  },
  {
    prop: 'block',
    description: '让分段选择器撑满父容器，横向模式下各项会自动平分。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'size',
    description: '支持 small / middle / large 以及 sm / md / lg 别名。',
    type: 'SegmentedSize',
    defaultValue: 'middle',
  },
  {
    prop: 'shape',
    description: '切换为默认圆角或更贴近胶囊的 round 形态。',
    type: "'default' | 'round'",
    defaultValue: 'default',
  },
  {
    prop: 'orientation / vertical',
    description: '横向或纵向排列；同时传入时 orientation 优先。',
    type: "'horizontal' | 'vertical' / boolean",
    defaultValue: 'horizontal / false',
  },
  {
    prop: 'disabled',
    description: '禁用整个组件；单个 option 也支持 disabled。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'name',
    description: '透传给内部 radio input，方便和原生 form 协作。',
    type: 'string',
    defaultValue: '自动生成',
  },
  {
    prop: 'classNames / styles',
    description: '按 root、item、icon、label 四个语义节点做 class 和 style 定制。',
    type: 'object | ({ props }) => object',
    defaultValue: '-',
  },
]

const optionApiRows: ApiRow[] = [
  {
    prop: 'value',
    description: '当前项的唯一值。',
    type: 'string | number',
    defaultValue: '-',
  },
  {
    prop: 'label',
    description: '显示内容，支持字符串、节点或复杂卡片结构。',
    type: 'any',
    defaultValue: 'value',
  },
  {
    prop: 'icon',
    description: '附加图标，可单独使用形成 icon-only 选项。',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'disabled',
    description: '单项禁用状态。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'className / style',
    description: '覆盖单项的外观，适合强调当前业务语境。',
    type: 'string / object',
    defaultValue: '-',
  },
  {
    prop: 'title / tooltip / ariaLabel',
    description: '补充原生 title、浏览器 tooltip 和无障碍名称。',
    type: 'string | object',
    defaultValue: '-',
  },
]

const basicCode = String.raw`import { ref } from '@rue-js/rue'
import { Segmented } from '@rue-js/design'
const cadence = ref('weekly')

<Segmented
  options={['daily', 'weekly', 'monthly', 'quarterly']}
  value={cadence.value}
  onChange={next => {
    cadence.value = next as string
  }}
/>
`

const sizeCode = String.raw`import { Segmented } from '@rue-js/design'
const createViewOptions = () => [
  { label: 'List', value: 'list', icon: <span className="text-xs font-semibold">L</span> },
  { label: 'Board', value: 'board', icon: <span className="text-xs font-semibold">B</span> },
  { label: 'Pulse', value: 'pulse', icon: <span className="text-xs font-semibold">P</span> },
]

<div className="space-y-4">
  <Segmented options={createViewOptions()} size="small" defaultValue="list" />
  <Segmented options={createViewOptions()} size="middle" defaultValue="board" />
  <Segmented options={createViewOptions()} size="large" defaultValue="pulse" />
  <Segmented options={createViewOptions()} shape="round" block defaultValue="board" />
</div>
`

const customCode = String.raw`import { ref } from '@rue-js/rue'
import { Segmented } from '@rue-js/design'
const season = ref('summer')

const createOptions = () => [
  {
    value: 'spring',
    label: (
      <div className="space-y-1 px-1 py-0.5">
        <div className="text-xs uppercase tracking-[0.22em] text-emerald-600/85">Spring</div>
        <div className="text-sm font-semibold">Discover</div>
      </div>
    ),
  },
  {
    value: 'summer',
    label: (
      <div className="space-y-1 px-1 py-0.5">
        <div className="text-xs uppercase tracking-[0.22em] text-amber-600/85">Summer</div>
        <div className="text-sm font-semibold">Build</div>
      </div>
    ),
  },
]

<Segmented
  options={createOptions()}
  value={season.value}
  block
  onChange={next => {
    season.value = next as string
  }}
/>
`

const verticalCode = String.raw`import { ref } from '@rue-js/rue'
import { Segmented } from '@rue-js/design'
const stage = ref('ship')

<Segmented
  value={stage.value}
  orientation="vertical"
  options={[
    { value: 'draft', label: 'Draft' },
    { value: 'design', label: 'Design QA' },
    { value: 'ship', label: 'Ready to Ship' },
  ]}
  classNames={{
    root: 'border-base-300/70 bg-gradient-to-b from-base-100 via-base-100 to-base-200/70 shadow-xl shadow-base-content/10',
    item: 'font-semibold',
    icon: 'text-primary',
  }}
  styles={() => ({
    root: {
      width: '100%',
    },
    item: {
      justifyContent: 'flex-start',
    },
  })}
  onChange={next => {
    stage.value = next as string
  }}
/>
`

const formCode = String.raw`import { ref } from '@rue-js/rue'
import { Segmented } from '@rue-js/design'
const channel = ref('mail')
const createDensityOptions = () => [
  { value: 'compact', icon: <span className="text-xs font-semibold">C</span>, tooltip: '紧凑布局' },
  { value: 'comfortable', icon: <span className="text-xs font-semibold">M</span>, tooltip: '舒展布局' },
  { value: 'expanded', icon: <span className="text-xs font-semibold">E</span>, tooltip: '更强信息密度' },
]

<form className="space-y-4">
  <Segmented
    name="contact-channel"
    value={channel.value}
    options={[
      { value: 'mail', label: 'Email' },
      { value: 'notice', label: 'Notification' },
      { value: 'launch', label: 'Launch Feed' },
    ]}
    onChange={next => {
      channel.value = next as string
    }}
  />

  <Segmented
    shape="round"
    size="small"
    defaultValue="comfortable"
    options={createDensityOptions()}
  />
</form>
`

const runtimeCompatCode = String.raw`import { ref } from '@rue-js/rue'
import { Segmented } from '@rue-js/design'
const channel = ref('mail')
const panelTone = ref<'calm' | 'sharp'>('calm')

const createOptions = () => [
  { value: 'mail', label: 'Email', icon: <MailIcon />, tooltip: '收件箱渠道' },
  { value: 'notice', label: 'Notification', icon: <BellIcon />, tooltip: '站内提醒' },
  { value: 'launch', label: 'Launch Feed', icon: <RocketIcon />, tooltip: '发布流' },
]

<div className="space-y-4">
  <button
    type="button"
    onClick={() => {
      panelTone.value = panelTone.value === 'calm' ? 'sharp' : 'calm'
    }}
  >
    切换父层重渲染
  </button>

  <Segmented
    value={channel.value}
    options={createOptions()}
    onChange={next => {
      channel.value = next as string
    }}
  />
</div>
`

const BasicControlledPreview: FC = () => {
  const cadenceValue = ref('weekly')

  return (
    <div className="space-y-4 not-prose">
      <Segmented
        options={[
          { label: 'Daily', value: 'daily' },
          { label: 'Weekly', value: 'weekly' },
          { label: 'Monthly', value: 'monthly' },
          { label: 'Quarterly', value: 'quarterly' },
        ]}
        value={cadenceValue.value}
        onChange={next => {
          cadenceValue.value = next as string
        }}
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">
            {cadenceInsights[cadenceValue.value as keyof typeof cadenceInsights].title}
          </div>
          <div className="mt-3 text-3xl font-semibold">
            {cadenceInsights[cadenceValue.value as keyof typeof cadenceInsights].value}
          </div>
          <p className="mt-2 mb-0 text-sm text-base-content/70">
            {cadenceInsights[cadenceValue.value as keyof typeof cadenceInsights].description}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-5 shadow-sm">
          <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">
            Current Value
          </div>
          <div className="mt-3 inline-flex rounded-full border border-base-300 bg-base-200/65 px-3 py-1 text-sm font-medium">
            {cadenceValue.value}
          </div>
          <div className="mt-4 space-y-2 text-sm text-base-content/70">
            <div className="flex items-center justify-between">
              <span>切换成本</span>
              <span>极低</span>
            </div>
            <div className="flex items-center justify-between">
              <span>推荐场景</span>
              <span>筛选与视图切换</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const SizePreview: FC = () => {
  const workspaceView = ref('board')
  const smallViewOptions = useStableOptions(createViewOptions)
  const middleViewOptions = useStableOptions(createViewOptions)
  const largeViewOptions = useStableOptions(createViewOptions)
  const roundViewOptions = useStableOptions(createViewOptions)

  return (
    <div className="space-y-4 not-prose">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-[1.4rem] border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-base-content/45">
            Small
          </div>
          <Segmented
            options={smallViewOptions}
            size="small"
            value={workspaceView.value}
            onChange={next => (workspaceView.value = next as string)}
          />
        </div>

        <div className="space-y-3 rounded-[1.4rem] border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-base-content/45">
            Middle
          </div>
          <Segmented
            options={middleViewOptions}
            size="middle"
            value={workspaceView.value}
            onChange={next => (workspaceView.value = next as string)}
          />
        </div>

        <div className="space-y-3 rounded-[1.4rem] border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-base-content/45">
            Large
          </div>
          <Segmented
            options={largeViewOptions}
            size="large"
            value={workspaceView.value}
            onChange={next => (workspaceView.value = next as string)}
          />
        </div>

        <div className="space-y-3 rounded-[1.4rem] border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-base-content/45">
            Round / Block
          </div>
          <Segmented
            options={roundViewOptions}
            value={workspaceView.value}
            shape="round"
            block
            onChange={next => {
              workspaceView.value = next as string
            }}
          />
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-5 shadow-sm">
        <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">
          Workspace View
        </div>
        <div className="mt-3 text-lg font-semibold">{workspaceView.value}</div>
        <p className="mt-2 mb-0 text-sm text-base-content/68">
          小尺寸适合表格工具栏，中尺寸最通用，大尺寸和 round 更适合做内容区一级切换。
        </p>
      </div>
    </div>
  )
}

const CustomLabelPreview: FC = () => {
  const seasonValue = ref('summer')

  return (
    <div className="space-y-4 not-prose">
      <Segmented
        options={createSeasonOptions()}
        value={seasonValue.value}
        block
        onChange={next => {
          seasonValue.value = next as string
        }}
      />

      <div className="rounded-[1.6rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/35 p-5 shadow-sm">
        <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">Current Lane</div>
        <div className="mt-3 text-2xl font-semibold capitalize">{seasonValue.value}</div>
        <p className="mt-2 mb-0 text-sm text-base-content/68">
          当每个分段都承载额外上下文时，用户不必离开当前区域就能理解状态差异。
        </p>
      </div>
    </div>
  )
}

const VerticalPreview: FC = () => {
  const pipelineValue = ref('ship')

  return (
    <div className="grid gap-4 not-prose lg:grid-cols-[300px_minmax(0,1fr)]">
      <Segmented
        value={pipelineValue.value}
        orientation="vertical"
        options={createPipelineOptions()}
        classNames={{
          root: 'border-base-300/70 bg-gradient-to-b from-base-100 via-base-100 to-base-200/70 shadow-xl shadow-base-content/10',
          item: 'font-semibold',
          icon: 'text-primary',
        }}
        styles={() => ({
          root: {
            width: '100%',
          },
          item: {
            justifyContent: 'flex-start',
          },
        })}
        onChange={next => {
          pipelineValue.value = next as string
        }}
      />

      <div className="rounded-[1.6rem] border border-base-300/70 bg-base-100/90 p-5 shadow-xl shadow-base-content/10">
        <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">
          Pipeline Stage
        </div>
        <div className="mt-3 text-2xl font-semibold">{pipelineValue.value}</div>
        <ul className="mt-4 space-y-2 text-sm text-base-content/70">
          <li>Draft: 需求和素材还在收敛。</li>
          <li>Design QA: 视觉、交互和 copy 进入联调。</li>
          <li>Ready to Ship: 可以排入发布窗口。</li>
          <li>Observe: 当前被禁用，用来表示尚未开放的后续阶段。</li>
        </ul>
      </div>
    </div>
  )
}

const FormPreview: FC = () => {
  const contactValue = ref('mail')
  const densitySummaryRef = useRef<HTMLSpanElement>()
  const contactOptions = useStableOptions(createContactOptions)
  const densityOptions = useStableOptions(createDensityOptions)

  const syncDensitySummary = (next: string) => {
    if (densitySummaryRef.current) {
      densitySummaryRef.current.textContent = next
    }
  }

  return (
    <form className="space-y-4 not-prose rounded-[1.6rem] border border-base-300 bg-base-100 p-5 shadow-sm">
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">
          Contact Channel
        </div>
        <Segmented
          name="contact-channel"
          value={contactValue.value}
          options={contactOptions}
          onChange={next => {
            contactValue.value = next as string
          }}
        />
      </div>

      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">Density</div>
        <Segmented
          shape="round"
          size="small"
          defaultValue="comfortable"
          options={densityOptions}
          onChange={next => {
            syncDensitySummary(next as string)
          }}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-base-300 bg-base-200/45 px-4 py-3 text-sm text-base-content/70">
          当前提交字段：
          <span className="font-medium text-base-content">
            contact-channel={contactValue.value}
          </span>
        </div>
        <div className="rounded-2xl border border-base-300 bg-base-200/45 px-4 py-3 text-sm text-base-content/70">
          当前密度：
          <span ref={densitySummaryRef} className="font-medium text-base-content">
            comfortable
          </span>
        </div>
      </div>
    </form>
  )
}

const RuntimeCompatPreview: FC = () => {
  const channelValue = ref('mail')
  const panelTone = ref<'calm' | 'sharp'>('calm')

  return (
    <div className="space-y-4 not-prose">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="inline-flex rounded-full border border-base-300 bg-base-100 px-4 py-2 text-sm font-medium text-base-content transition hover:border-base-400 hover:bg-base-200/80"
          onClick={() => {
            panelTone.value = panelTone.value === 'calm' ? 'sharp' : 'calm'
          }}
        >
          切换父层重渲染
        </button>
        <div className="rounded-full border border-base-300 bg-base-100/80 px-3 py-1 text-xs uppercase tracking-[0.18em] text-base-content/55">
          panel tone {panelTone.value}
        </div>
      </div>

      <div
        className={
          panelTone.value === 'calm'
            ? 'space-y-4 rounded-[1.6rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/45 p-5 shadow-sm'
            : 'space-y-4 rounded-[1.6rem] border border-base-300 bg-gradient-to-br from-base-100 via-amber-50/40 to-base-200/55 p-5 shadow-xl shadow-amber-900/10'
        }
      >
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">
            Runtime Compat
          </div>
          <div className="mt-2 text-xl font-semibold">受控 component icon 每次重渲染都重新创建</div>
          <p className="mt-2 mb-0 text-sm text-base-content/68">
            这个示例会在每次渲染时重新创建 options
            和图标组件；切换选项或切换父层状态时，按钮内容都不应该再变空白。
          </p>
        </div>

        <Segmented
          value={channelValue.value}
          options={createContactOptions()}
          onChange={next => {
            channelValue.value = next as string
          }}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-base-300 bg-base-100/80 px-4 py-3 text-sm text-base-content/70">
            当前 channel：
            <span className="font-medium text-base-content">{channelValue.value}</span>
          </div>
          <div className="rounded-2xl border border-base-300 bg-base-100/80 px-4 py-3 text-sm text-base-content/70">
            外层状态：<span className="font-medium text-base-content">{panelTone.value}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const SegmentedDesign: FC = () => {
  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Segmented 分段选择器</h1>
        <p>
          Rue 的 Segmented 走的是更轻一点的轨道条和卡片式高亮，不照搬其他组件库
          的视觉，但把日常最常用的那组能力一次覆盖了： 受控与非受控、raw value 与对象
          options、icon、block、size、round、vertical，以及语义化的 class 和 style 定制。
        </p>

        <div className="not-prose mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/45 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">
              Input Model
            </div>
            <div className="mt-2 text-base font-semibold">raw value 或对象项都能用</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              可以先从 string[] 起步，再逐步升级到带 icon 和自定义 label 的 options。
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/45 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">Layout</div>
            <div className="mt-2 text-base font-semibold">block、round、vertical 一起补上</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              既能做紧凑的顶部切换，也能做纵向阶段流和内容分段卡片。
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/45 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">
              Semantic Styling
            </div>
            <div className="mt-2 text-base font-semibold">root / item / icon / label 可定制</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              不改组件结构，也能把它塞进你自己的页面氛围里。
            </p>
          </div>
        </div>

        <PreviewBlock
          title="基础受控模式"
          summary="最常见的用法：用 value 和 onChange 驱动内容区域切换。"
          tab={basicTab}
          code={basicCode}
          preview={BasicControlledPreview}
        />

        <PreviewBlock
          title="尺寸、Block 与 Round"
          summary="这组更适合放在列表、工作台或分析视图顶部，兼顾紧凑和强调感。"
          tab={sizeTab}
          code={sizeCode}
          preview={SizePreview}
        />

        <PreviewBlock
          title="自定义标签内容"
          summary="label 支持直接塞入小卡片，让 segmented 不只是一排短文本。"
          tab={customTab}
          code={customCode}
          preview={CustomLabelPreview}
        />

        <PreviewBlock
          title="纵向排列与语义样式"
          summary="适合阶段流、步骤导航和左侧辅助选择器；classNames 和 styles 都能参与覆盖。"
          tab={verticalTab}
          code={verticalCode}
          preview={VerticalPreview}
        />

        <PreviewBlock
          title="表单 name、Tooltip 与 Icon-only"
          summary="内部就是一组 radio input，可以和原生 form 协作；icon-only 项也有 title 和 aria 文本。"
          tab={formTab}
          code={formCode}
          preview={FormPreview}
        />

        <PreviewBlock
          title="组件 Icon 受控重渲染"
          summary="父层每次重渲染都会重新创建 component icon options；runtime 支持层需要保证点击切换后内容不会空白。"
          tab={runtimeCompatTab}
          code={runtimeCompatCode}
          preview={RuntimeCompatPreview}
        />

        <h2>API</h2>
        <ApiTable rows={componentApiRows} />

        <h2 className="mt-8">Segmented Item</h2>
        <ApiTable rows={optionApiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default SegmentedDesign
