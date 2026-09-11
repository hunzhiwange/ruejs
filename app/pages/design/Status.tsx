import { ref, type FC } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Status, Tabs } from '@rue-js/design'
type TabMode = 'preview' | 'code'

interface ExampleBlockProps {
  title: string
  summary?: string
  tab: { value: TabMode }
  preview: () => any
  code: string
}

interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
}

const TAB_ITEMS = [
  { key: 'preview', label: '预览' },
  { key: 'code', label: 'JSX代码' },
]

const previewShellClass = 'card border border-base-200 bg-base-100 shadow-sm'
const previewBodyClass = 'card-body gap-4'

const mergeClassName = (base: string, className?: string) => {
  return className ? `${base} ${className}` : base
}

const BASIC_CODE = `<div className="flex flex-wrap items-center gap-6">
  <Status as="span" />
  <Status status="processing" text="Deploying" />
  <Status color="success" text="Online" />
  <Status status="warning" text="Window closing soon" />
</div>`

const SIZE_AND_COLOR_CODE = `<div className="flex flex-col gap-4">
  <div className="flex flex-wrap items-center gap-4">
    <Status ariaLabel="status" size="xs" />
    <Status ariaLabel="status" size="sm" />
    <Status ariaLabel="status" size="md" />
    <Status ariaLabel="status" size="lg" />
    <Status ariaLabel="status" size="xl" />
  </div>

  <div className="flex flex-wrap items-center gap-4">
    <Status ariaLabel="status" color="primary" />
    <Status ariaLabel="status" color="secondary" />
    <Status ariaLabel="status" color="accent" />
    <Status ariaLabel="status" color="neutral" />
    <Status ariaLabel="info" color="info" />
    <Status ariaLabel="success" color="success" />
    <Status ariaLabel="warning" color="warning" />
    <Status ariaLabel="error" color="error" />
  </div>
</div>`

const LABEL_CODE = `<div className="flex flex-col items-start gap-3">
  <Status status="success" text="Published" />
  <Status status="processing" text="Syncing data" />
  <Status dot status="processing" text="Syncing edge cache" />
  <Status count={7} color="#f97316" text="待审核" />
</div>`

const BADGE_CODE = `<div className="flex flex-wrap items-center gap-8">
  <Status dot color="success">
    <div className="flex h-14 w-14 items-center justify-center rounded-box bg-base-200 text-xs font-medium">
      APP
    </div>
  </Status>

  <Status dot color="warning" text="Pending review">
    <div className="flex h-14 w-14 items-center justify-center rounded-box bg-base-200 text-xs font-medium">
      PR
    </div>
  </Status>

  <Status count={5}>
    <div className="flex h-14 w-14 items-center justify-center rounded-box bg-base-200 text-xs font-medium">
      Inbox
    </div>
  </Status>

  <Status count={12} color="secondary" text="Messages">
    <div className="flex h-14 w-14 items-center justify-center rounded-box bg-base-200 text-xs font-medium">
      Chat
    </div>
  </Status>
</div>`

const OVERFLOW_CODE = `<div className="grid gap-4 lg:grid-cols-2">
  <div className="flex flex-wrap items-center gap-8">
    <Status count={0}>
      <div className="flex h-14 w-14 items-center justify-center rounded-box bg-base-200 text-xs font-medium">
        Draft
      </div>
    </Status>

    <Status count={0} showZero color="info" text="No unread">
      <div className="flex h-14 w-14 items-center justify-center rounded-box bg-base-200 text-xs font-medium">
        Mail
      </div>
    </Status>

    <Status count={128} overflowCount={99} color="error">
      <div className="flex h-14 w-14 items-center justify-center rounded-box bg-base-200 text-xs font-medium">
        Alerts
      </div>
    </Status>
  </div>

  <div className="flex flex-wrap items-center gap-8">
    <Status count={8} offset={[8, 6]} color="primary">
      <div className="flex h-16 w-24 items-center justify-center rounded-box bg-base-200 text-sm font-medium">
        Releases
      </div>
    </Status>

    <Status dot offset={[10, 8]} color="#0f766e" text="Custom offset">
      <div className="flex h-16 w-24 items-center justify-center rounded-box bg-base-200 text-sm font-medium">
        Jobs
      </div>
    </Status>
  </div>
</div>`

const MOTION_CODE = `<div className="flex flex-col gap-4">
  <div className="flex items-center gap-3">
    <div className="inline-grid *:[grid-area:1/1]">
      <Status dot color="error" className="animate-ping" />
      <Status dot color="error" />
    </div>
    <span>Server is down</span>
  </div>

  <div className="flex items-center gap-3">
    <Status color="info" className="animate-bounce" />
    <span>Unread messages</span>
  </div>
</div>`

const statusApiRows: ApiRow[] = [
  {
    prop: 'as',
    description: '根节点标签，常用 span 或 div。',
    type: "'span' | 'div'",
    defaultValue: 'span',
  },
  {
    prop: 'ariaLabel',
    description: '独立状态点或无文本场景下的无障碍标签。',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'size',
    description: '状态点或数字徽标尺寸，支持 xs 到 xl，以及 small、default、medium、large 别名。',
    type: "'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'default' | 'medium' | 'large'",
    defaultValue: '-',
  },
  {
    prop: 'color',
    description: '预设主题色或自定义颜色字符串；传入时优先级高于 status。',
    type: 'StatusTone | string',
    defaultValue: '-',
  },
  {
    prop: 'status',
    description: '语义状态，processing 会自动带 pulse 动效。',
    type: "'default' | 'processing' | 'success' | 'warning' | 'error' | StatusTone",
    defaultValue: '-',
  },
  {
    prop: 'text',
    description: '跟随状态点、数字或角标展示的说明文案。',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'count',
    description: '数字、字符串或自定义内容；不传 children 时会切到独立 label/badge 模式。',
    type: 'any',
    defaultValue: 'null',
  },
  {
    prop: 'showZero',
    description: 'count 为 0 时是否仍显示。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'overflowCount',
    description: '数字上限，超过后显示 n+。',
    type: 'number',
    defaultValue: '99',
  },
  {
    prop: 'dot',
    description: '以状态点代替数字徽标。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'offset',
    description: '调整角标的水平和垂直偏移。',
    type: '[number | string, number | string]',
    defaultValue: '-',
  },
  {
    prop: 'title',
    description: '自定义角标 title；数字模式默认会回退到 count 文案。',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'className',
    description: '作用于根节点的类名。',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'style',
    description: '作用于根节点的内联样式。',
    type: 'Record<string, any>',
    defaultValue: '-',
  },
  {
    prop: 'children',
    description: '传入后切到包裹内容的角标模式。',
    type: 'any',
    defaultValue: '-',
  },
]

const ExampleBlock: FC<ExampleBlockProps> = ({ title, summary, tab, preview, code }) => {
  return (
    <div className="component-preview not-prose text-base-content my-6 lg:my-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># {title}</h2>
          {summary ? <p className="m-0 text-sm opacity-70">{summary}</p> : null}
        </div>
      </div>
      <Tabs
        style="box"
        items={TAB_ITEMS}
        activeKey={tab.value}
        onChange={key => (tab.value = key as TabMode)}
        className="mb-3 mt-4"
      />
      {tab.value === 'preview' ? preview() : <Code className="mt-2" lang="tsx" code={code} />}
    </div>
  )
}

const PreviewSurface: FC<{ className?: string; children?: any }> = ({ className, children }) => {
  return (
    <div className={mergeClassName(previewShellClass, className)}>
      <div className={previewBodyClass}>{children}</div>
    </div>
  )
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

const DemoTile: FC<{ label: string }> = ({ label }) => {
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-box bg-base-200 text-xs font-medium">
      {label}
    </div>
  )
}

const WideDemoTile: FC<{ label: string }> = ({ label }) => {
  return (
    <div className="flex h-16 w-24 items-center justify-center rounded-box bg-base-200 text-sm font-medium">
      {label}
    </div>
  )
}

const BasicStatusPreview = () => {
  return (
    <PreviewSurface>
      <div className="flex flex-wrap items-center gap-6">
        <Status as="span" />
        <Status status="processing" text="Deploying" />
        <Status color="success" text="Online" />
        <Status status="warning" text="Window closing soon" />
      </div>
    </PreviewSurface>
  )
}

const SizeAndColorStatusPreview = () => {
  return (
    <PreviewSurface>
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center gap-4">
          <Status ariaLabel="status" size="xs" />
          <Status ariaLabel="status" size="sm" />
          <Status ariaLabel="status" size="md" />
          <Status ariaLabel="status" size="lg" />
          <Status ariaLabel="status" size="xl" />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Status ariaLabel="status" color="primary" />
          <Status ariaLabel="status" color="secondary" />
          <Status ariaLabel="status" color="accent" />
          <Status ariaLabel="status" color="neutral" />
          <Status ariaLabel="info" color="info" />
          <Status ariaLabel="success" color="success" />
          <Status ariaLabel="warning" color="warning" />
          <Status ariaLabel="error" color="error" />
        </div>
      </div>
    </PreviewSurface>
  )
}

const LabelStatusPreview = () => {
  return (
    <PreviewSurface>
      <div className="flex flex-col items-start gap-3">
        <Status status="success" text="Published" />
        <Status status="processing" text="Syncing data" />
        <Status dot status="processing" text="Syncing edge cache" />
        <Status count={7} color="#f97316" text="待审核" />
      </div>
    </PreviewSurface>
  )
}

const BadgeStatusPreview = () => {
  return (
    <PreviewSurface>
      <div className="flex flex-wrap items-center gap-8">
        <Status dot color="success">
          <DemoTile label="APP" />
        </Status>
        <Status dot color="warning" text="Pending review">
          <DemoTile label="PR" />
        </Status>
        <Status count={5}>
          <DemoTile label="Inbox" />
        </Status>
        <Status count={12} color="secondary" text="Messages">
          <DemoTile label="Chat" />
        </Status>
      </div>
    </PreviewSurface>
  )
}

const OverflowStatusPreview = () => {
  return (
    <PreviewSurface>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-wrap items-center gap-8">
          <Status count={0}>
            <DemoTile label="Draft" />
          </Status>
          <Status count={0} showZero color="info" text="No unread">
            <DemoTile label="Mail" />
          </Status>
          <Status count={128} overflowCount={99} color="error">
            <DemoTile label="Alerts" />
          </Status>
        </div>
        <div className="flex flex-wrap items-center gap-8">
          <Status count={8} offset={[8, 6]} color="primary">
            <WideDemoTile label="Releases" />
          </Status>
          <Status dot offset={[10, 8]} color="#0f766e" text="Custom offset">
            <WideDemoTile label="Jobs" />
          </Status>
        </div>
      </div>
    </PreviewSurface>
  )
}

const MotionStatusPreview = () => {
  return (
    <PreviewSurface>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="inline-grid *:[grid-area:1/1]">
            <Status dot color="error" className="animate-ping" />
            <Status dot color="error" />
          </div>
          <span>Server is down</span>
        </div>
        <div className="flex items-center gap-3">
          <Status color="info" className="animate-bounce" />
          <span>Unread messages</span>
        </div>
      </div>
    </PreviewSurface>
  )
}

const StatusDemo: FC = () => {
  const tabBasic = ref<TabMode>('preview')
  const tabScale = ref<TabMode>('preview')
  const tabLabel = ref<TabMode>('preview')
  const tabBadge = ref<TabMode>('preview')
  const tabOverflow = ref<TabMode>('preview')
  const tabMotion = ref<TabMode>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Status 状态列表</h1>
        <p className="text-sm mt-3 mb-3">
          Status 现在既能使用 Rue 基础的状态点写法，也能像轻量 Badge 一样包裹内容，统一承载
          dot、count、text、 overflowCount 和 offset。不传 children 时，它会自动切到独立的
          label/badge 模式；传入 children 后，则变成右上角角标。
        </p>

        <h2>何时使用</h2>
        <ul>
          <li>需要一个很轻的状态点，表达在线、同步中、告警、错误这类语义状态。</li>
          <li>想在当前内容右上角挂 dot、count 或文案角标，但又不想引入更重的 Badge 结构。</li>
        </ul>

        <ExampleBlock
          title="基础状态与语义"
          summary="展示最基础的状态点体验，同时支持用 status 或 color 直接表达语义。"
          tab={tabBasic}
          preview={BasicStatusPreview}
          code={BASIC_CODE}
        />

        <ExampleBlock
          title="尺寸与色板"
          summary="单独作为状态点使用时，优先关注 size 和 color；它们仍然保持和 daisyUI 一致的视觉基底。"
          tab={tabScale}
          preview={SizeAndColorStatusPreview}
          code={SIZE_AND_COLOR_CODE}
        />

        <ExampleBlock
          title="文案与 label 模式"
          summary="不传 children 时，text 会和状态点、dot 或 count 自动组合成一条状态说明。"
          tab={tabLabel}
          preview={LabelStatusPreview}
          code={LABEL_CODE}
        />

        <ExampleBlock
          title="包裹内容的角标模式"
          summary="传入 children 后会自动切到角标模式，适合消息入口、资源卡片和小型业务面板。"
          tab={tabBadge}
          preview={BadgeStatusPreview}
          code={BADGE_CODE}
        />

        <ExampleBlock
          title="零值、溢出与偏移"
          summary="showZero、overflowCount 和 offset 可以覆盖更贴近真实业务的边界情况。"
          tab={tabOverflow}
          preview={OverflowStatusPreview}
          code={OVERFLOW_CODE}
        />

        <ExampleBlock
          title="动效状态"
          summary="Status 本身只是节点，动画可以继续通过 className 叠加，适合告警和提醒场景。"
          tab={tabMotion}
          preview={MotionStatusPreview}
          code={MOTION_CODE}
        />

        <h2 id="status-api">API</h2>
        <p>
          Status 只有一个根组件，但会根据是否传入 children
          自动切换成独立状态模式或包裹内容的角标模式。
        </p>

        <ApiTable rows={statusApiRows} />

        <div className="not-prose mt-6 rounded-box border border-base-300 bg-base-100 p-4 text-sm">
          <div className="font-semibold">模式选择建议</div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <div>不传 children 适合单独状态点、带文案的 label，以及独立数字/点状提示。</div>
            <div>
              传 children 适合给按钮、卡片、入口块挂角标，并可以使用 count、dot、offset 等能力。
            </div>
          </div>
        </div>

        <h2>FAQ</h2>

        <h3>status 和 color 同时传时谁优先？</h3>
        <p>color 优先级更高。status 更偏语义表达，color 则适合覆盖成品牌色或业务色。</p>

        <h3>为什么有时候会显示成一条 label，而不是右上角角标？</h3>
        <p>
          当你传入 text，但没有传 children 时，Status 会自动用独立模式渲染成“状态点/数字 +
          文案”的一条说明。只有传入 children 后，才会切到右上角挂载角标的模式。
        </p>

        <h3>count 为 0 时为什么默认不显示？</h3>
        <p>
          这是为了保持和常见 badge 组件一致的默认行为。如果业务上需要明确展示 0，加上 showZero
          即可。
        </p>
      </div>
    </SidebarPlayground>
  )
}

export default StatusDemo
