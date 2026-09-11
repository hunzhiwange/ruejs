import { ref, type FC } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Badge, Button, Tabs } from '@rue-js/design'
import { renderDesignPreview } from './preview-test-gate'

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

interface ToneExample {
  label: string
  variant: 'neutral' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'
}

interface SizeExample {
  label: string
  value: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const toCode = (lines: string[]) => lines.join('\n')

const previewShellClass = 'card border border-base-200 bg-base-100 shadow-sm'
const previewBodyClass = 'card-body gap-4'

const mergeClassName = (base: string, className?: string) => {
  return className ? `${base} ${className}` : base
}

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
        items={[
          { key: 'preview', label: '预览' },
          { key: 'code', label: 'JSX代码' },
        ]}
        activeKey={tab.value}
        onChange={key => (tab.value = key as TabMode)}
        className="mb-3 mt-4"
      />
      {tab.value === 'preview' ? (
        renderDesignPreview(title, preview)
      ) : (
        <Code className="mt-2" lang="tsx" code={code} />
      )}
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

const InfoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-[1em]"
  >
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" d="M12 10v6" />
    <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none" />
  </svg>
)

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-[1em]"
  >
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12.5 2.4 2.4 4.8-5.3" />
  </svg>
)

const WarningIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-[1em]"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4 3.5 19h17L12 4Z" />
    <path strokeLinecap="round" d="M12 10v4" />
    <circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none" />
  </svg>
)

const ErrorIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-[1em]"
  >
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" d="m9 9 6 6" />
    <path strokeLinecap="round" d="m15 9-6 6" />
  </svg>
)

const toneExamples: ToneExample[] = [
  { label: 'Primary', variant: 'primary' },
  { label: 'Secondary', variant: 'secondary' },
  { label: 'Accent', variant: 'accent' },
  { label: 'Neutral', variant: 'neutral' },
  { label: 'Info', variant: 'info' },
  { label: 'Success', variant: 'success' },
  { label: 'Warning', variant: 'warning' },
  { label: 'Error', variant: 'error' },
]

const emphasisToneExamples = toneExamples.filter(item => item.variant !== 'neutral')

const sizeExamples: SizeExample[] = [
  { label: 'Xsmall', value: 'xs' },
  { label: 'Small', value: 'sm' },
  { label: 'Medium', value: 'md' },
  { label: 'Large', value: 'lg' },
  { label: 'Xlarge', value: 'xl' },
]

const basicCode = toCode(["import { Badge } from '@rue-js/design'", '', '<Badge>Badge</Badge>'])

const indicatorCode = toCode([
  '<Badge count={12}>',
  '  <button className="btn btn-outline">Inbox</button>',
  '</Badge>',
  '',
  '<Badge count={3} variant="secondary">',
  '  <div className="grid size-14 place-items-center rounded-full bg-base-200 font-semibold">AI</div>',
  '</Badge>',
  '',
  '<Badge dot status="success" text="持续可用">',
  '  <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3">API 网关</div>',
  '</Badge>',
])

const overflowCode = toCode([
  '<Badge count={128} overflowCount={99}>',
  '  <button className="btn">Notifications</button>',
  '</Badge>',
  '',
  '<Badge count={0}>',
  '  <button className="btn btn-ghost">默认隐藏 0</button>',
  '</Badge>',
  '',
  '<Badge count={0} showZero variant="neutral">',
  '  <button className="btn btn-ghost">显示 0</button>',
  '</Badge>',
  '',
  '<Badge count={7} color="#f97316" text="待审核" />',
])

const statusCode = toCode([
  '<Badge status="processing" text="同步中" />',
  '<Badge status="warning" text="发布窗口" />',
  '',
  '<Badge dot color="#0ea5e9">',
  '  <div className="rounded-full border border-base-300 px-4 py-2">Edge cache</div>',
  '</Badge>',
  '',
  '<Badge count={24} color="#7c3aed" text="自定义品牌色" />',
])

const offsetCode = toCode([
  '<Badge count={18}>',
  '  <div className="rounded-2xl border border-base-300 bg-base-100 px-5 py-4">Default offset</div>',
  '</Badge>',
  '',
  '<Badge count={18} offset={[18, 14]} variant="secondary">',
  '  <div className="rounded-2xl border border-base-300 bg-base-100 px-5 py-4">Custom offset</div>',
  '</Badge>',
])

const ribbonCode = toCode([
  '<Badge.Ribbon text="Beta">',
  '  <div className="w-72 rounded-[1.75rem] border border-base-300 bg-base-100 p-6 shadow-sm">',
  '    <h3 className="text-lg font-semibold">Route Insights</h3>',
  '    <p className="mt-2 text-sm opacity-70">将路由、指标和实验开关收在同一个控制面板里。</p>',
  '  </div>',
  '</Badge.Ribbon>',
  '',
  '<Badge.Ribbon text="新功能" placement="start" color="#0ea5e9">',
  '  <div className="w-72 rounded-[1.75rem] border border-base-300 bg-base-100 p-6 shadow-sm">',
  '    <h3 className="text-lg font-semibold">Agent Inbox</h3>',
  '    <p className="mt-2 text-sm opacity-70">把消息、工单和批注集中在一处。</p>',
  '  </div>',
  '</Badge.Ribbon>',
])

const sizeCode = sizeExamples
  .map(item => `<Badge size="${item.value}">${item.label}</Badge>`)
  .join('\n')
const colorsCode = toneExamples
  .map(item => `<Badge variant="${item.variant}">${item.label}</Badge>`)
  .join('\n')
const softCode = emphasisToneExamples
  .map(item => `<Badge soft variant="${item.variant}">${item.label}</Badge>`)
  .join('\n')
const outlineCode = emphasisToneExamples
  .map(item => `<Badge outline variant="${item.variant}">${item.label}</Badge>`)
  .join('\n')
const dashCode = emphasisToneExamples
  .map(item => `<Badge dash variant="${item.variant}">${item.label}</Badge>`)
  .join('\n')

const neutralCode = toCode([
  '<div className="flex gap-2 justify-center rounded-box bg-white p-6">',
  '  <Badge variant="neutral" outline>Outline</Badge>',
  '  <Badge variant="neutral" dash>Dash</Badge>',
  '</div>',
])

const ghostCode = '<Badge ghost>ghost</Badge>'

const emptyCode = toCode([
  '<Badge variant="primary" size="lg" />',
  '<Badge variant="primary" size="md" />',
  '<Badge variant="primary" size="sm" />',
  '<Badge variant="primary" size="xs" />',
])

const iconCode = toCode([
  '<Badge variant="info">',
  '  <InfoIcon />',
  '  Info',
  '</Badge>',
  '<Badge variant="success">',
  '  <CheckIcon />',
  '  Success',
  '</Badge>',
  '<Badge variant="warning">',
  '  <WarningIcon />',
  '  Warning',
  '</Badge>',
  '<Badge variant="error">',
  '  <ErrorIcon />',
  '  Error',
  '</Badge>',
])

const textCode = toCode([
  '<span className="text-xl font-semibold">',
  '  Heading 1 <Badge size="xl">Badge</Badge>',
  '</span>',
  '<span className="text-lg font-semibold">',
  '  Heading 2 <Badge size="lg">Badge</Badge>',
  '</span>',
  '<span className="text-base font-semibold">',
  '  Heading 3 <Badge size="md">Badge</Badge>',
  '</span>',
  '<span className="text-sm font-semibold">',
  '  Heading 4 <Badge size="sm">Badge</Badge>',
  '</span>',
  '<span className="text-xs font-semibold">',
  '  Heading 5 <Badge size="xs">Badge</Badge>',
  '</span>',
  '<p className="text-xs">',
  '  Paragraph <Badge size="xs">Badge</Badge>',
  '</p>',
])

const buttonCode = toCode([
  '<Button>',
  '  Inbox <Badge size="sm">+99</Badge>',
  '</Button>',
  '',
  '<Button>',
  '  Inbox <Badge size="sm" variant="secondary">+99</Badge>',
  '</Button>',
])

const badgeApiRows: ApiRow[] = [
  {
    prop: 'className',
    description: '根节点类名；标签模式与 indicator 模式都会透传',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'color',
    description: '自定义状态点或计数背景色；也支持直接传入预设色名称',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'count',
    description: '显示在右上角或独立模式中的计数内容',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'dash',
    description: '标签模式下启用虚线风格；计数徽标也会使用该视觉',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'dot',
    description: '以状态点代替数字',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'ghost',
    description: '标签模式下启用 ghost 视觉',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'indicatorClassName',
    description: '仅作用于右上角 indicator 节点',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'indicatorStyle',
    description: '仅作用于右上角 indicator 节点的内联样式',
    type: 'Record<string, any>',
    defaultValue: '-',
  },
  {
    prop: 'offset',
    description: '调整 indicator 的水平与垂直偏移',
    type: '[number | string, number | string]',
    defaultValue: '-',
  },
  {
    prop: 'outline',
    description: '标签模式下启用描边视觉；计数徽标也会使用该视觉',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'overflowCount',
    description: '数字上限，超出时显示 n+',
    type: 'number',
    defaultValue: '99',
  },
  {
    prop: 'showZero',
    description: 'count 为 0 时是否仍显示角标',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'size',
    description: '标签与计数徽标尺寸，支持 xs 到 xl，以及 small、medium 别名',
    type: "'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'medium'",
    defaultValue: '-',
  },
  {
    prop: 'soft',
    description: '标签模式下启用柔和填充视觉',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'status',
    description: '状态点语义；processing 会附带脉冲动画',
    type: "'default' | 'processing' | 'neutral' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'",
    defaultValue: '-',
  },
  {
    prop: 'text',
    description: '独立状态或计数模式的说明文字；包裹模式下会显示在目标元素右侧',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'title',
    description: '悬浮提示文本，未传时数字徽标默认使用 count 文本',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'variant',
    description: 'Rue 预设主题色，也作为状态与计数徽标的默认色调来源',
    type: "'neutral' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'",
    defaultValue: '-',
  },
]

const ribbonApiRows: ApiRow[] = [
  {
    prop: 'children',
    description: '被 Ribbon 包裹的内容区域',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'className',
    description: 'Ribbon 条本身的类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'color',
    description: 'Ribbon 条颜色；支持预设色名称或自定义色值',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'placement',
    description: 'Ribbon 条停靠方向',
    type: "'start' | 'end'",
    defaultValue: "'end'",
  },
  {
    prop: 'style',
    description: 'Ribbon 条内联样式',
    type: 'Record<string, any>',
    defaultValue: '-',
  },
  {
    prop: 'text',
    description: 'Ribbon 内部文案',
    type: 'any',
    defaultValue: '-',
  },
]

const BadgeDemo: FC = () => {
  const tabs = {
    basic: ref<TabMode>('preview'),
    indicator: ref<TabMode>('preview'),
    overflow: ref<TabMode>('preview'),
    status: ref<TabMode>('preview'),
    offset: ref<TabMode>('preview'),
    ribbon: ref<TabMode>('preview'),
    sizes: ref<TabMode>('preview'),
    colors: ref<TabMode>('preview'),
    soft: ref<TabMode>('preview'),
    outline: ref<TabMode>('preview'),
    dash: ref<TabMode>('preview'),
    neutral: ref<TabMode>('preview'),
    ghost: ref<TabMode>('preview'),
    empty: ref<TabMode>('preview'),
    icon: ref<TabMode>('preview'),
    inText: ref<TabMode>('preview'),
    inButton: ref<TabMode>('preview'),
  }

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Badge 徽标</h1>
        <p className="text-sm mt-3 mb-3">
          Badge 现在同时覆盖 Rue 轻标签、角标计数、状态点和 Ribbon 包裹四类场景。展示基础 daisyUI
          风格标签写法，同时补充常见业务中的 count、dot、showZero、offset、status 与 Badge.Ribbon
          能力。
        </p>

        <div className="not-prose mt-6 rounded-box border border-base-300 bg-base-200/40 p-4 text-sm leading-6">
          <div className="font-semibold">使用建议</div>
          <div className="opacity-80">
            只有 children 时，Badge 会保持 Rue 的标签模式；一旦传入
            count、dot、status、color、offset 等语义属性，就会自动切换为 indicator
            模式，把徽标放到目标元素角上。
          </div>
        </div>

        <ExampleBlock
          title="Badge"
          summary="最基础的标签模式，保持 Rue 当前的视觉表达。"
          tab={tabs.basic}
          preview={() => (
            <PreviewSurface>
              <div className="flex flex-wrap gap-2">
                <Badge>Badge</Badge>
              </div>
            </PreviewSurface>
          )}
          code={basicCode}
        />

        <ExampleBlock
          title="Count as indicator"
          summary="count、dot 与 text 能力让 Badge 可以直接包裹按钮、卡片或头像占位块。"
          tab={tabs.indicator}
          preview={() => (
            <PreviewSurface>
              <div className="flex flex-wrap items-end gap-6">
                <Badge count={12}>
                  <button className="btn btn-outline">Inbox</button>
                </Badge>
                <Badge count={3} variant="secondary">
                  <div className="grid size-14 place-items-center rounded-full bg-base-200 font-semibold">
                    AI
                  </div>
                </Badge>
                <Badge dot status="success" text="持续可用">
                  <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3">
                    API 网关
                  </div>
                </Badge>
              </div>
            </PreviewSurface>
          )}
          code={indicatorCode}
        />

        <ExampleBlock
          title="Overflow count and zero"
          summary="支持 overflowCount、showZero 和独立数字徽标，适合消息、工单和待处理数据。"
          tab={tabs.overflow}
          preview={() => (
            <PreviewSurface>
              <div className="flex flex-wrap items-center gap-6">
                <Badge count={128} overflowCount={99}>
                  <button className="btn">Notifications</button>
                </Badge>
                <Badge count={0}>
                  <button className="btn btn-ghost">默认隐藏 0</button>
                </Badge>
                <Badge count={0} showZero variant="neutral">
                  <button className="btn btn-ghost">显示 0</button>
                </Badge>
                <Badge count={7} color="#f97316" text="待审核" />
              </div>
            </PreviewSurface>
          )}
          code={overflowCode}
        />

        <ExampleBlock
          title="Status and custom color"
          summary="除了预设色调，还能用 status 表达语义，用自定义 color 匹配品牌色或业务色。"
          tab={tabs.status}
          preview={() => (
            <PreviewSurface>
              <div className="flex flex-wrap items-center gap-5">
                <Badge status="processing" text="同步中" />
                <Badge status="warning" text="发布窗口" />
                <Badge dot color="#0ea5e9">
                  <div className="rounded-full border border-base-300 px-4 py-2">Edge cache</div>
                </Badge>
                <Badge count={24} color="#7c3aed" text="自定义品牌色" />
              </div>
            </PreviewSurface>
          )}
          code={statusCode}
        />

        <ExampleBlock
          title="Offset positioning"
          summary="通过 offset 调整角标与目标元素的相对位置，避免被圆角、阴影或较大的 padding 吞掉。"
          tab={tabs.offset}
          preview={() => (
            <PreviewSurface>
              <div className="flex flex-wrap items-center gap-8">
                <Badge count={18}>
                  <div className="rounded-2xl border border-base-300 bg-base-100 px-5 py-4">
                    Default offset
                  </div>
                </Badge>
                <Badge count={18} offset={[18, 14]} variant="secondary">
                  <div className="rounded-2xl border border-base-300 bg-base-100 px-5 py-4">
                    Custom offset
                  </div>
                </Badge>
              </div>
            </PreviewSurface>
          )}
          code={offsetCode}
        />

        <ExampleBlock
          title="Badge.Ribbon"
          summary="Ribbon 复合组件可用于给内容块打上 Beta、新功能或促销等斜角标识。"
          tab={tabs.ribbon}
          preview={() => (
            <PreviewSurface className="overflow-visible">
              <div className="flex flex-wrap gap-8 py-4">
                <Badge.Ribbon text="Beta">
                  <div className="w-72 rounded-[1.75rem] border border-base-300 bg-base-100 p-6 shadow-sm">
                    <h3 className="m-0 text-lg font-semibold">Route Insights</h3>
                    <p className="mt-2 mb-0 text-sm opacity-70">
                      将路由、指标和实验开关收在同一个控制面板里。
                    </p>
                  </div>
                </Badge.Ribbon>
                <Badge.Ribbon text="新功能" placement="start" color="#0ea5e9">
                  <div className="w-72 rounded-[1.75rem] border border-base-300 bg-base-100 p-6 shadow-sm">
                    <h3 className="m-0 text-lg font-semibold">Agent Inbox</h3>
                    <p className="mt-2 mb-0 text-sm opacity-70">
                      把消息、工单和批注集中在一处，减少多面板切换。
                    </p>
                  </div>
                </Badge.Ribbon>
              </div>
            </PreviewSurface>
          )}
          code={ribbonCode}
        />

        <ExampleBlock
          title="Badge sizes"
          summary="使用尺寸层级，适合标题、列表标签和紧凑信息位。"
          tab={tabs.sizes}
          preview={() => (
            <PreviewSurface>
              <div className="flex flex-wrap items-center gap-2">
                {sizeExamples.map(item => (
                  <Badge key={item.value} size={item.value}>
                    {item.label}
                  </Badge>
                ))}
              </div>
            </PreviewSurface>
          )}
          code={sizeCode}
        />

        <ExampleBlock
          title="Badge with colors"
          summary="使用 Rue 当前的主题色集合，可直接作为轻量标签使用。"
          tab={tabs.colors}
          preview={() => (
            <PreviewSurface>
              <div className="flex flex-wrap gap-2">
                {toneExamples.map(item => (
                  <Badge key={item.variant} variant={item.variant}>
                    {item.label}
                  </Badge>
                ))}
              </div>
            </PreviewSurface>
          )}
          code={colorsCode}
        />

        <ExampleBlock
          title="Badge with soft style"
          summary="柔和填充在筛选项、只读标签和提示性元信息里更轻。"
          tab={tabs.soft}
          preview={() => (
            <PreviewSurface>
              <div className="flex flex-wrap gap-2">
                {emphasisToneExamples.map(item => (
                  <Badge key={item.variant} soft variant={item.variant}>
                    {item.label}
                  </Badge>
                ))}
              </div>
            </PreviewSurface>
          )}
          code={softCode}
        />

        <ExampleBlock
          title="Badge with outline style"
          summary="描边更适合放在浅底卡片里，避免色块过重。"
          tab={tabs.outline}
          preview={() => (
            <PreviewSurface>
              <div className="flex flex-wrap gap-2">
                {emphasisToneExamples.map(item => (
                  <Badge key={item.variant} outline variant={item.variant}>
                    {item.label}
                  </Badge>
                ))}
              </div>
            </PreviewSurface>
          )}
          code={outlineCode}
        />

        <ExampleBlock
          title="Badge with dash style"
          summary="虚线视觉适合草稿、实验态或尚未生效的标签。"
          tab={tabs.dash}
          preview={() => (
            <PreviewSurface>
              <div className="flex flex-wrap gap-2">
                {emphasisToneExamples.map(item => (
                  <Badge key={item.variant} dash variant={item.variant}>
                    {item.label}
                  </Badge>
                ))}
              </div>
            </PreviewSurface>
          )}
          code={dashCode}
        />

        <ExampleBlock
          title="neutral badge with outline or dash style"
          summary="展示基础 neutral 组合示例，适合放在亮色背景之上。"
          tab={tabs.neutral}
          preview={() => (
            <PreviewSurface>
              <div className="flex justify-center rounded-box bg-white p-6">
                <div className="flex gap-2">
                  <Badge variant="neutral" outline>
                    Outline
                  </Badge>
                  <Badge variant="neutral" dash>
                    Dash
                  </Badge>
                </div>
              </div>
            </PreviewSurface>
          )}
          code={neutralCode}
        />

        <ExampleBlock
          title="Badge ghost"
          summary="ghost 适合嵌在复杂背景里，只保持极轻的存在感。"
          tab={tabs.ghost}
          preview={() => (
            <PreviewSurface>
              <div className="flex flex-wrap gap-2">
                <Badge ghost>ghost</Badge>
              </div>
            </PreviewSurface>
          )}
          code={ghostCode}
        />

        <ExampleBlock
          title="Empty badge"
          summary="空内容 badge 仍可作为占位点或尺寸对比使用。"
          tab={tabs.empty}
          preview={() => (
            <PreviewSurface>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="primary" size="lg" />
                <Badge variant="primary" size="md" />
                <Badge variant="primary" size="sm" />
                <Badge variant="primary" size="xs" />
              </div>
            </PreviewSurface>
          )}
          code={emptyCode}
        />

        <ExampleBlock
          title="Badge with icon"
          summary="徽标内部可以直接放图标或图标与文案组合。"
          tab={tabs.icon}
          preview={() => (
            <PreviewSurface>
              <div className="flex flex-wrap gap-3">
                <Badge variant="info">
                  <InfoIcon />
                  Info
                </Badge>
                <Badge variant="success">
                  <CheckIcon />
                  Success
                </Badge>
                <Badge variant="warning">
                  <WarningIcon />
                  Warning
                </Badge>
                <Badge variant="error">
                  <ErrorIcon />
                  Error
                </Badge>
              </div>
            </PreviewSurface>
          )}
          code={iconCode}
        />

        <ExampleBlock
          title="Badge in a text"
          summary="与正文和标题排版结合时，尺寸可以跟随字号层级一起变化。"
          tab={tabs.inText}
          preview={() => (
            <PreviewSurface>
              <div className="grid gap-2">
                <span className="text-xl font-semibold">
                  Heading 1 <Badge size="xl">Badge</Badge>
                </span>
                <span className="text-lg font-semibold">
                  Heading 2 <Badge size="lg">Badge</Badge>
                </span>
                <span className="text-base font-semibold">
                  Heading 3 <Badge size="md">Badge</Badge>
                </span>
                <span className="text-sm font-semibold">
                  Heading 4 <Badge size="sm">Badge</Badge>
                </span>
                <span className="text-xs font-semibold">
                  Heading 5 <Badge size="xs">Badge</Badge>
                </span>
                <p className="m-0 text-xs">
                  Paragraph <Badge size="xs">Badge</Badge>
                </p>
              </div>
            </PreviewSurface>
          )}
          code={textCode}
        />

        <ExampleBlock
          title="Badge in a button"
          summary="按钮内嵌标签写法仍可直接使用，适合快捷状态或数字提示。"
          tab={tabs.inButton}
          preview={() => (
            <PreviewSurface>
              <div className="flex flex-wrap gap-3">
                <Button>
                  Inbox <Badge size="sm">+99</Badge>
                </Button>
                <Button>
                  Inbox{' '}
                  <Badge size="sm" variant="secondary">
                    +99
                  </Badge>
                </Button>
              </div>
            </PreviewSurface>
          )}
          code={buttonCode}
        />

        <div className="mt-12">
          <h2>API</h2>
          <p className="text-sm opacity-70">
            标签模式与 indicator 模式共用同一个 Badge 组件：只传 children 时渲染为标签；传入
            count、dot、status、color、offset 等语义属性后切换为角标模式。Ribbon 通过 Badge.Ribbon
            提供。
          </p>
        </div>

        <h3>Badge</h3>
        <ApiTable rows={badgeApiRows} />

        <h3 className="mt-8">Badge.Ribbon</h3>
        <ApiTable rows={ribbonApiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default BadgeDemo
