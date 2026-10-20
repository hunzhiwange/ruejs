import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import { Divider, Tabs } from '@rue-js/design'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'

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
      {tab.value === 'preview' ? preview() : <Code className="mt-2" lang="tsx" code={code} />}
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

const PreviewCard: FC<{ label: string; className?: string }> = ({ label, className }) => {
  return (
    <div
      className={`grid rounded-box card bg-base-300 place-items-center ${className ?? 'h-20'}`.trim()}
    >
      {label}
    </div>
  )
}

const apiRows: ApiRow[] = [
  {
    prop: 'children',
    description: '分隔线中展示的内容；使用 orientation="vertical" 或 vertical 时不显示。',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'color',
    description: '推荐写法，设置 Rue 语义色。',
    type: "'neutral' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'info' | 'error'",
    defaultValue: '-',
  },
  {
    prop: 'variant',
    description: '支持颜色写法，同时支持 solid / dashed / dotted 线型。',
    type: "tone | 'solid' | 'dashed' | 'dotted'",
    defaultValue: 'solid',
  },
  {
    prop: 'lineVariant',
    description: '显式设置线型，优先级高于 dashed。',
    type: "'solid' | 'dashed' | 'dotted'",
    defaultValue: 'solid',
  },
  {
    prop: 'dashed',
    description: '快捷开启虚线。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'plain',
    description: '让分隔文字更接近正文样式，适合说明性内容。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'titlePlacement',
    description: '推荐写法，控制文本位于起始、居中或结束位置。',
    type: "'start' | 'center' | 'end'",
    defaultValue: 'center',
  },
  {
    prop: 'placement',
    description: '支持基础 start / end 文本位置。',
    type: "'start' | 'end'",
    defaultValue: '-',
  },
  {
    prop: 'orientationMargin',
    description: '仅在 titlePlacement 为 start / end 时生效，控制文本和最近边缘的距离。',
    type: 'string | number',
    defaultValue: '-',
  },
  {
    prop: 'orientation',
    description: '推荐写法，控制横向或纵向分隔；vertical 模式更适合行内分隔。',
    type: "'horizontal' | 'vertical'",
    defaultValue: 'horizontal',
  },
  {
    prop: 'vertical / type',
    description: 'vertical 是 orientation="vertical" 的快捷写法；type 作为同义别名保持。',
    type: "boolean | 'horizontal' | 'vertical'",
    defaultValue: '-',
  },
  {
    prop: 'direction',
    description: '支持 Rue 基础写法；在横向布局中常用 direction="horizontal" 切换为纵向视觉。',
    type: "'vertical' | 'horizontal'",
    defaultValue: '-',
  },
]

const DividerDemo: FC = () => {
  const tabBasic = ref<TabMode>('preview')
  const tabHorizontal = ref<TabMode>('preview')
  const tabNoText = ref<TabMode>('preview')
  const tabResponsive = ref<TabMode>('preview')
  const tabColors = ref<TabMode>('preview')
  const tabPositionsV = ref<TabMode>('preview')
  const tabPositionsH = ref<TabMode>('preview')
  const tabLineVariants = ref<TabMode>('preview')
  const tabPlain = ref<TabMode>('preview')
  const tabVerticalApi = ref<TabMode>('preview')
  const tabMargin = ref<TabMode>('preview')
  const tabCustom = ref<TabMode>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Divider 分隔线</h1>
        <p className="text-sm mt-3 mb-3">
          分隔线（Divider）用于在内容之间建立轻量层级。Rue
          使用当前视觉风格，并补充了更完整的文本位置、线型和垂直分隔能力。
        </p>

        <ExampleBlock
          title="Divider"
          summary="基础分隔线，保持当前默认用法。"
          tab={tabBasic}
          preview={() => (
            <div className="flex w-full flex-col">
              <PreviewCard label="content" />
              <Divider>OR</Divider>
              <PreviewCard label="content" />
            </div>
          )}
          code={`import { Divider } from '@rue-js/design'

<div className="flex w-full flex-col">
  <div className="card bg-base-300 rounded-box grid h-20 place-items-center">content</div>
  <Divider>OR</Divider>
  <div className="card bg-base-300 rounded-box grid h-20 place-items-center">content</div>
</div>`}
        />

        <ExampleBlock
          title="Divider horizontal"
          summary="使用 Rue 基础 direction 用法，在横向布局中展示纵向分隔。"
          tab={tabHorizontal}
          preview={() => (
            <div className="flex w-full">
              <PreviewCard label="content" className="h-20 grow" />
              <Divider direction="horizontal">OR</Divider>
              <PreviewCard label="content" className="h-20 grow" />
            </div>
          )}
          code={`<div className="flex w-full">
  <div className="card bg-base-300 rounded-box grid h-20 grow place-items-center">content</div>
  <Divider direction="horizontal">OR</Divider>
  <div className="card bg-base-300 rounded-box grid h-20 grow place-items-center">content</div>
</div>`}
        />

        <ExampleBlock
          title="Divider with no text"
          summary="没有文字时，Divider 仍可作为纯分隔元素使用。"
          tab={tabNoText}
          preview={() => (
            <div className="flex w-full flex-col">
              <PreviewCard label="content" />
              <Divider />
              <PreviewCard label="content" />
            </div>
          )}
          code={`<div className="flex w-full flex-col">
  <div className="card bg-base-300 rounded-box grid h-20 place-items-center">content</div>
  <Divider />
  <div className="card bg-base-300 rounded-box grid h-20 place-items-center">content</div>
</div>`}
        />

        <ExampleBlock
          title="Responsive Divider"
          summary="支持通过 className 结合响应式类切换方向。"
          tab={tabResponsive}
          preview={() => (
            <div className="flex w-full flex-col lg:flex-row">
              <PreviewCard label="content" className="h-32 grow" />
              <Divider className="lg:divider-horizontal">OR</Divider>
              <PreviewCard label="content" className="h-32 grow" />
            </div>
          )}
          code={`<div className="flex w-full flex-col lg:flex-row">
  <div className="card bg-base-300 rounded-box grid h-32 grow place-items-center">content</div>
  <Divider className="lg:divider-horizontal">OR</Divider>
  <div className="card bg-base-300 rounded-box grid h-32 grow place-items-center">content</div>
</div>`}
        />

        <ExampleBlock
          title="Divider with colors"
          summary="当前颜色能力保持，同时推荐新写法使用 color。"
          tab={tabColors}
          preview={() => (
            <div className="flex w-full flex-col">
              <Divider>Default</Divider>
              <Divider variant="neutral">Neutral</Divider>
              <Divider variant="primary">Primary</Divider>
              <Divider variant="secondary">Secondary</Divider>
              <Divider variant="accent">Accent</Divider>
              <Divider variant="success">Success</Divider>
              <Divider variant="warning">Warning</Divider>
              <Divider variant="info">Info</Divider>
              <Divider variant="error">Error</Divider>
              <Divider color="primary">Primary by color</Divider>
            </div>
          )}
          code={`<div className="flex w-full flex-col">
  <Divider>Default</Divider>
  <Divider variant="neutral">Neutral</Divider>
  <Divider variant="primary">Primary</Divider>
  <Divider variant="secondary">Secondary</Divider>
  <Divider variant="accent">Accent</Divider>
  <Divider variant="success">Success</Divider>
  <Divider variant="warning">Warning</Divider>
  <Divider variant="info">Info</Divider>
  <Divider variant="error">Error</Divider>
  <Divider color="primary">Primary by color</Divider>
</div>`}
        />

        <ExampleBlock
          title="Divider in different positions"
          summary="展示基础 placement 用法，也可改用 titlePlacement。"
          tab={tabPositionsV}
          preview={() => (
            <div className="flex w-full flex-col">
              <Divider placement="start">Start</Divider>
              <Divider>Default</Divider>
              <Divider placement="end">End</Divider>
            </div>
          )}
          code={`<div className="flex w-full flex-col">
  <Divider placement="start">Start</Divider>
  <Divider>Default</Divider>
  <Divider placement="end">End</Divider>
</div>`}
        />

        <ExampleBlock
          title="Divider in different positions (horizontal)"
          summary="在横向布局中，文本位置仍可配合基础 direction 使用。"
          tab={tabPositionsH}
          preview={() => (
            <div className="flex w-full justify-center h-52">
              <Divider direction="horizontal" placement="start">
                Start
              </Divider>
              <Divider direction="horizontal">Default</Divider>
              <Divider direction="horizontal" placement="end">
                End
              </Divider>
            </div>
          )}
          code={`<div className="flex w-full justify-center h-52">
  <Divider direction="horizontal" placement="start">Start</Divider>
  <Divider direction="horizontal">Default</Divider>
  <Divider direction="horizontal" placement="end">End</Divider>
</div>`}
        />

        <ExampleBlock
          title="Line Variants"
          summary="支持实线、虚线、点线三种线型，并支持 dashed 快捷写法。"
          tab={tabLineVariants}
          preview={() => (
            <div className="flex w-full flex-col">
              <Divider>Solid</Divider>
              <Divider variant="dashed">Dashed by variant</Divider>
              <Divider dashed color="warning">
                Dashed by boolean
              </Divider>
              <Divider lineVariant="dotted" color="primary">
                Dotted
              </Divider>
            </div>
          )}
          code={`<div className="flex w-full flex-col">
  <Divider>Solid</Divider>
  <Divider variant="dashed">Dashed by variant</Divider>
  <Divider dashed color="warning">Dashed by boolean</Divider>
  <Divider lineVariant="dotted" color="primary">Dotted</Divider>
</div>`}
        />

        <ExampleBlock
          title="Plain Text"
          summary="plain 可以让分隔文字从强调标题过渡为更轻的正文说明。"
          tab={tabPlain}
          preview={() => (
            <div className="flex w-full flex-col">
              <Divider>默认文字</Divider>
              <Divider plain>作为正文说明的分隔文案</Divider>
              <Divider plain titlePlacement="start" color="primary">
                Rue keeps it subtle
              </Divider>
            </div>
          )}
          code={`<div className="flex w-full flex-col">
  <Divider>默认文字</Divider>
  <Divider plain>作为正文说明的分隔文案</Divider>
  <Divider plain titlePlacement="start" color="primary">
    Rue keeps it subtle
  </Divider>
</div>`}
        />

        <ExampleBlock
          title="Vertical Orientation API"
          summary="orientation / vertical API 适合行内分隔，不展示 children。"
          tab={tabVerticalApi}
          preview={() => (
            <div className="flex flex-wrap items-center gap-3 rounded-box border border-base-300 bg-base-100 px-4 py-5">
              <span>Profile</span>
              <Divider orientation="vertical" className="h-6" />
              <span>Team</span>
              <Divider vertical className="h-6" />
              <span>Billing</span>
              <Divider type="vertical" className="h-6" />
              <span>Logs</span>
            </div>
          )}
          code={`<div className="flex flex-wrap items-center gap-3">
  <span>Profile</span>
  <Divider orientation="vertical" className="h-6" />
  <span>Team</span>
  <Divider vertical className="h-6" />
  <span>Billing</span>
  <Divider type="vertical" className="h-6" />
  <span>Logs</span>
</div>`}
        />

        <ExampleBlock
          title="Title Placement And Margin"
          summary="titlePlacement 与 orientationMargin 可更精细地控制文字和边缘的距离。"
          tab={tabMargin}
          preview={() => (
            <div className="flex w-full flex-col">
              <Divider titlePlacement="start" orientationMargin={24}>
                Start 24px
              </Divider>
              <Divider titlePlacement="center">Center</Divider>
              <Divider titlePlacement="end" orientationMargin="40">
                End 40px
              </Divider>
            </div>
          )}
          code={`<div className="flex w-full flex-col">
  <Divider titlePlacement="start" orientationMargin={24}>Start 24px</Divider>
  <Divider titlePlacement="center">Center</Divider>
  <Divider titlePlacement="end" orientationMargin="40">End 40px</Divider>
</div>`}
        />

        <ExampleBlock
          title="Custom Style"
          summary="style / contentStyle / contentClassName 便于保持 Rue 基础视觉下的局部定制。"
          tab={tabCustom}
          preview={() => (
            <div className="flex w-full flex-col gap-2 rounded-box bg-base-200/40 p-4">
              <Divider
                color="primary"
                lineVariant="dotted"
                titlePlacement="start"
                orientationMargin={20}
                className="before:border-2 after:border-2"
                contentClassName="rounded-full bg-primary/10 px-3 py-1 text-primary"
              >
                Project Status
              </Divider>
              <Divider
                plain
                style={{ background: 'rgba(16, 185, 129, 0.06)' }}
                contentStyle={{ letterSpacing: '0.08em' }}
                className="rounded-box px-2"
              >
                DEPLOYMENT READY
              </Divider>
            </div>
          )}
          code={`<div className="flex w-full flex-col gap-2 rounded-box bg-base-200/40 p-4">
  <Divider
    color="primary"
    lineVariant="dotted"
    titlePlacement="start"
    orientationMargin={20}
    className="before:border-2 after:border-2"
    contentClassName="rounded-full bg-primary/10 px-3 py-1 text-primary"
  >
    Project Status
  </Divider>

  <Divider
    plain
    style={{ background: 'rgba(16, 185, 129, 0.06)' }}
    contentStyle={{ letterSpacing: '0.08em' }}
    className="rounded-box px-2"
  >
    DEPLOYMENT READY
  </Divider>
</div>`}
        />

        <div className="my-10">
          <h2>API</h2>
          <p className="text-sm opacity-70 mt-2">
            当前 Divider 同时支持 Rue 基础写法与更语义化的新 API，便于按需接入。
          </p>
          <ApiTable rows={apiRows} />
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default DividerDemo
