import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Link, Tabs } from '@rue-js/design'
type TabMode = 'preview' | 'code'
type DemoColor =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'success'
  | 'info'
  | 'warning'
  | 'error'

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

const ExternalIcon: FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-[1em]"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h9v9" />
  </svg>
)

const RouteIcon: FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-[1em]"
  >
    <circle cx="6" cy="6" r="2" />
    <circle cx="18" cy="18" r="2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h4a4 4 0 0 1 4 4v6" />
  </svg>
)

const colorExamples: { label: string; variant: DemoColor }[] = [
  { label: 'Neutral', variant: 'neutral' },
  { label: 'Primary', variant: 'primary' },
  { label: 'Secondary', variant: 'secondary' },
  { label: 'Accent', variant: 'accent' },
  { label: 'Success', variant: 'success' },
  { label: 'Info', variant: 'info' },
  { label: 'Warning', variant: 'warning' },
  { label: 'Error', variant: 'error' },
]

const apiRows: ApiRow[] = [
  {
    prop: 'href',
    description: '外链或普通锚点地址；未传 to 时渲染原生链接。',
    type: 'string',
    defaultValue: "'#'",
  },
  {
    prop: 'to',
    description: '路由地址，渲染为 hash href 并在点击时走 Rue Router 导航。',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'replace',
    description: '配合 to 使用，点击时替换当前路由记录。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'target / rel',
    description: '原生链接属性；target="_blank" 且未传 rel 时会自动补安全 rel。',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'variant',
    description: 'Rue 视觉色，继续映射到 link-* 类名，支持基础用法。',
    type: "'neutral' | 'primary' | 'secondary' | 'accent' | 'success' | 'info' | 'warning' | 'error'",
    defaultValue: '-',
  },
  {
    prop: 'color',
    description: '颜色别名，支持 danger 并映射到 error。',
    type: "LinkVariant | 'danger'",
    defaultValue: '-',
  },
  {
    prop: 'type',
    description: 'Typography 风格语义色，secondary 为弱化文本，danger 映射 error。',
    type: "'secondary' | 'success' | 'warning' | 'danger'",
    defaultValue: '-',
  },
  {
    prop: 'hover',
    description: '追加 link-hover，仅在 hover 时显示下划线。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'disabled',
    description: '禁用交互，移除 href/to 导航语义并输出 aria-disabled。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'ellipsis',
    description:
      '单行或多行省略；支持 tooltip、suffix、expandable、expanded/defaultExpanded、onExpand 与 onEllipsis。',
    type: "boolean | { rows?: number; tooltip?: boolean | string; suffix?: string; expandable?: boolean | 'collapsible'; symbol?: any | ((expanded: boolean) => any); defaultExpanded?: boolean; expanded?: boolean; onExpand?: (event, info) => void; onEllipsis?: (ellipsis: boolean) => void }",
    defaultValue: 'false',
  },
  {
    prop: 'copyable',
    description: '展示复制按钮，支持自定义复制文本、图标和复制回调。',
    type: 'boolean | LinkCopyConfig',
    defaultValue: 'false',
  },
  {
    prop: 'editable',
    description: '展示编辑入口，支持受控 editing、多行 autoSize、初始文本、回调和触发方式。',
    type: 'boolean | LinkEditConfig',
    defaultValue: 'false',
  },
  {
    prop: 'mark / code / keyboard',
    description: '文本装饰节点，贴近 Typography 的内联文本 API。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'underline / delete / strong / italic',
    description: '文本样式修饰，可与 link 颜色叠加。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'icon / iconPlacement',
    description: '链接前后图标；iconPlacement 可选 start 或 end。',
    type: "any / 'start' | 'end'",
    defaultValue: "'start'",
  },
  {
    prop: 'onClick',
    description: '点击回调；调用 preventDefault 可阻止 href 或 to 的默认行为。',
    type: '(event: MouseEvent) => void',
    defaultValue: '-',
  },
]

const LinkDemo: FC = () => {
  const tabBasic = ref<TabMode>('preview')
  const tabPalette = ref<TabMode>('preview')
  const tabTypography = ref<TabMode>('preview')
  const tabEllipsis = ref<TabMode>('preview')
  const tabExpandable = ref<TabMode>('preview')
  const tabCopyEdit = ref<TabMode>('preview')
  const tabEvents = ref<TabMode>('preview')
  const tabIcons = ref<TabMode>('preview')
  const clickCount = ref(0)
  const editableLabel = ref('Roadmap draft')
  const editableInline = ref('Click text to edit')
  const editableNotes = ref(
    '第一阶段：补充 Link API\n第二阶段：整理设计页示例\n第三阶段：补充 FAQ 与测试',
  )
  const expandToggleCount = ref(0)
  const ellipsisDetected = ref(false)

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Link 链接</h1>
        <p className="text-sm mt-3 mb-3">
          Link 仍然以 Rue 的 link 视觉类为基底，同时补充更像 Typography.Link 的文本链接能力：
          安全外链、路由跳转、省略、复制、编辑、禁用与内联文本修饰。
        </p>

        <h2>何时使用</h2>
        <ul>
          <li>需要普通文本链接、外链或 Rue Router 内部跳转。</li>
          <li>需要在正文里附带复制、编辑、省略或强调语义。</li>
          <li>适合保持 link/link-* 视觉体系，同时使用 Typography 式文本操作 API。</li>
        </ul>

        <ExampleBlock
          title="基础用法"
          summary="展示 Click me、正文链接、RouterLink 与 href/target 示例，并统一到一个预览里。"
          tab={tabBasic}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <Link>Click me</Link>
                  <Link to="/examples/hello-world">跳转到 Hello World 页</Link>
                  <Link href="https://example.com" target="_blank">
                    跳转到外部网站
                  </Link>
                </div>
                <p className="text-sm m-0">
                  Tailwind CSS resets the style of links by default.
                  <br />
                  Add "link" class to make it look like a <Link>normal link</Link> again.
                </p>
              </div>
            </div>
          )}
          code={`import { Link } from '@rue-js/design'

<Link>Click me</Link>
<Link to="/examples/hello-world">跳转到 Hello World 页</Link>
<Link href="https://example.com" target="_blank">跳转到外部网站</Link>

<p>
  Tailwind CSS resets the style of links by default.
  <br />
  Add "link" class to make it look like a <Link>normal link</Link> again.
</p>`}
        />

        <ExampleBlock
          title="颜色与 Hover"
          summary="基础的 Primary/Secondary/Accent/Success/Info/Warning/Error 与 hover 示例都保持，并用数组组织。"
          tab={tabPalette}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-5">
                <div className="flex flex-wrap gap-x-5 gap-y-3">
                  {colorExamples.map(item => (
                    <Link key={item.variant} variant={item.variant}>
                      {item.label}
                    </Link>
                  ))}
                </div>
                <div className="divider my-0" />
                <div className="flex flex-wrap gap-x-5 gap-y-3">
                  <Link hover>Show underline only on hover</Link>
                  <Link variant="primary" hover>
                    Primary hover
                  </Link>
                </div>
              </div>
            </div>
          )}
          code={`const colors = [
  { label: 'Neutral', variant: 'neutral' },
  { label: 'Primary', variant: 'primary' },
  { label: 'Secondary', variant: 'secondary' },
  { label: 'Accent', variant: 'accent' },
  { label: 'Success', variant: 'success' },
  { label: 'Info', variant: 'info' },
  { label: 'Warning', variant: 'warning' },
  { label: 'Error', variant: 'error' },
] as const

{colors.map(item => (
  <Link key={item.variant} variant={item.variant}>
    {item.label}
  </Link>
))}

<Link hover>Show underline only on hover</Link>`}
        />

        <ExampleBlock
          title="Typography 文本能力"
          summary="type 与常见文本修饰适合正文里的语义化链接。"
          tab={tabTypography}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-5">
                <div className="flex flex-wrap gap-x-5 gap-y-3">
                  <Link type="secondary">Secondary text</Link>
                  <Link type="success">Success link</Link>
                  <Link type="warning">Warning link</Link>
                  <Link type="danger">Danger link</Link>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-3">
                  <Link strong>Strong</Link>
                  <Link italic>Italic</Link>
                  <Link underline>Underline</Link>
                  <Link delete>Deleted</Link>
                  <Link mark>Marked</Link>
                  <Link code>Inline code</Link>
                  <Link keyboard>Ctrl K</Link>
                </div>
              </div>
            </div>
          )}
          code={`<Link type="secondary">Secondary text</Link>
<Link type="success">Success link</Link>
<Link type="warning">Warning link</Link>
<Link type="danger">Danger link</Link>

<Link strong>Strong</Link>
<Link italic>Italic</Link>
<Link underline>Underline</Link>
<Link delete>Deleted</Link>
<Link mark>Marked</Link>
<Link code>Inline code</Link>
<Link keyboard>Ctrl K</Link>`}
        />

        <ExampleBlock
          title="省略"
          summary="ellipsis 支持单行与多行，并默认把完整文本放进 title。"
          tab={tabEllipsis}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <div className="max-w-72 rounded-box border border-base-300 p-3">
                  <Link ellipsis>
                    A very long link that should stay on a single line and truncate inside a narrow
                    container
                  </Link>
                </div>
                <div className="max-w-md rounded-box border border-base-300 p-3">
                  <Link ellipsis={{ rows: 2 }}>
                    Multiple line truncation keeps dense documentation pages tidy while still
                    preserving a native title fallback for the full link text.
                  </Link>
                </div>
              </div>
            </div>
          )}
          code={`<div className="max-w-72">
  <Link ellipsis>
    A very long link that should stay on a single line and truncate inside a narrow container
  </Link>
</div>

<div className="max-w-md">
  <Link ellipsis={{ rows: 2 }}>
    Multiple line truncation keeps dense documentation pages tidy while still preserving the full text.
  </Link>
</div>`}
        />

        <ExampleBlock
          title="可展开省略与后缀"
          summary="suffix、expandable、collapsible、symbol、onExpand 与 onEllipsis 适合长链接摘要场景。"
          tab={tabExpandable}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <div className="max-w-80 rounded-box border border-base-300 p-3">
                  <Link
                    variant="primary"
                    ellipsis={{
                      suffix: '.md',
                      expandable: 'collapsible',
                      symbol: (expanded: boolean) => (expanded ? '收起摘要' : '展开摘要'),
                      onExpand: () => {
                        expandToggleCount.value += 1
                      },
                      onEllipsis: value => {
                        ellipsisDetected.value = value
                      },
                    }}
                  >
                    Architecture decision record for billing-service rollback procedure and approval
                    flow
                  </Link>
                </div>
                <div className="text-xs opacity-70">
                  当前省略状态：{ellipsisDetected.value ? '已截断' : '未截断'}，展开切换：
                  {expandToggleCount.value} 次
                </div>
                <div className="max-w-md rounded-box border border-base-300 p-3">
                  <Link
                    ellipsis={{
                      rows: 2,
                      expandable: true,
                      symbol: '阅读全文',
                    }}
                  >
                    Rue keeps the existing link visual style, but now long documentation links can
                    stay compact by default and reveal the full content only when readers ask for
                    more context.
                  </Link>
                </div>
              </div>
            </div>
          )}
          code={`<Link
  variant="primary"
  ellipsis={{
    suffix: '.md',
    expandable: 'collapsible',
    symbol: expanded => (expanded ? '收起摘要' : '展开摘要'),
    onExpand: () => {
      expandCount.value += 1
    },
    onEllipsis: value => {
      ellipsisDetected.value = value
    },
  }}
>
  Architecture decision record for billing-service rollback procedure and approval flow
</Link>

<Link ellipsis={{ rows: 2, expandable: true, symbol: '阅读全文' }}>
  Rue keeps the existing link visual style, but now long documentation links can stay compact by
  default and reveal the full content only when readers ask for more context.
</Link>`}
        />

        <ExampleBlock
          title="复制与编辑"
          summary="copyable 与 editable 提供文本操作入口，多行 autoSize 编辑适合文档标题、备注和链接摘要。"
          tab={tabCopyEdit}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <div>
                  <Link
                    href="https://rue.dev/docs/link"
                    target="_blank"
                    copyable={{ text: 'https://rue.dev/docs/link' }}
                  >
                    复制文档链接
                  </Link>
                </div>
                <div>
                  <Link
                    editable={{
                      text: editableLabel.value,
                      onChange: value => (editableLabel.value = value),
                    }}
                  >
                    {editableLabel.value}
                  </Link>
                </div>
                <div>
                  <Link
                    href="#"
                    editable={{
                      text: editableInline.value,
                      triggerType: ['text'],
                      onChange: value => (editableInline.value = value),
                    }}
                  >
                    {editableInline.value}
                  </Link>
                </div>
                <div className="rounded-box border border-base-300 p-3">
                  <Link
                    editable={{
                      text: editableNotes.value,
                      autoSize: { minRows: 2, maxRows: 5 },
                      tooltip: '编辑备注',
                      onChange: value => (editableNotes.value = value),
                    }}
                  >
                    {editableNotes.value}
                  </Link>
                  <p className="mb-0 mt-2 text-xs opacity-70">
                    多行编辑时使用 Ctrl/Cmd + Enter 保存，Esc 取消。
                  </p>
                </div>
              </div>
            </div>
          )}
          code={`<Link
  href="https://rue.dev/docs/link"
  target="_blank"
  copyable={{ text: 'https://rue.dev/docs/link' }}
>
  复制文档链接
</Link>

<Link editable={{ text: title.value, onChange: value => (title.value = value) }}>
  {title.value}
</Link>

<Link editable={{ triggerType: ['text'], text: label.value, onChange: value => (label.value = value) }}>
  {label.value}
</Link>

<Link
  editable={{
    text: notes.value,
    autoSize: { minRows: 2, maxRows: 5 },
    onChange: value => (notes.value = value),
  }}
>
  {notes.value}
</Link>`}
        />

        <ExampleBlock
          title="事件、阻止跳转与禁用"
          summary="展示 onClick 与 preventDefault 示例，并补一个 disabled 状态。"
          tab={tabEvents}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <div className="flex flex-wrap gap-x-5 gap-y-3">
                  <Link
                    onClick={event => {
                      event.preventDefault()
                      clickCount.value += 1
                    }}
                  >
                    Click me
                  </Link>
                  <span className="text-sm opacity-70">clicked {clickCount.value} times</span>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-3">
                  <Link href="https://example.com" onClick={event => event.preventDefault()}>
                    阻止外链跳转
                  </Link>
                  <Link to="/examples/hello-world" onClick={event => event.preventDefault()}>
                    阻止路由跳转
                  </Link>
                  <Link href="/locked" disabled>
                    Disabled link
                  </Link>
                </div>
              </div>
            </div>
          )}
          code={`<Link onClick={() => alert('clicked')}>Click me</Link>

<Link href="https://example.com" onClick={event => event.preventDefault()}>
  阻止外链跳转
</Link>

<Link to="/examples/hello-world" onClick={event => event.preventDefault()}>
  阻止路由跳转
</Link>

<Link href="/locked" disabled>
  Disabled link
</Link>`}
        />

        <ExampleBlock
          title="图标组合"
          summary="icon 与 iconPlacement 用来表达外链、路由或轻量操作入口。"
          tab={tabIcons}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <div className="flex flex-wrap gap-x-5 gap-y-3">
                  <Link
                    href="https://example.com"
                    target="_blank"
                    icon={<ExternalIcon />}
                    iconPlacement="end"
                  >
                    External resource
                  </Link>
                  <Link to="/examples/hello-world" variant="primary" icon={<RouteIcon />}>
                    Router page
                  </Link>
                  <Link href="#link-api" type="secondary" icon={<RouteIcon />} hover>
                    API section
                  </Link>
                </div>
              </div>
            </div>
          )}
          code={`<Link href="https://example.com" target="_blank" icon={<ExternalIcon />} iconPlacement="end">
  External resource
</Link>

<Link to="/examples/hello-world" variant="primary" icon={<RouteIcon />}>
  Router page
</Link>`}
        />

        <h2 id="link-api">API</h2>
        <ApiTable rows={apiRows} />

        <h2>FAQ</h2>
        <div className="space-y-4 text-sm leading-6">
          <div>
            <h3 className="mb-1 text-base font-semibold">
              什么时候用 `variant`，什么时候用 `type`？
            </h3>
            <p className="m-0 opacity-80">
              `variant` 更接近 Rue 基础的 `link-*` 视觉色板；`type`
              更偏正文语义色，适合在文案里表达弱化、成功、警告、危险等状态。
            </p>
          </div>
          <div>
            <h3 className="mb-1 text-base font-semibold">`ellipsis` 和原生 `title` 会不会冲突？</h3>
            <p className="m-0 opacity-80">
              传入 `title` 时优先使用显式值；否则 `ellipsis.tooltip` 默认为开启，并回退到原生
              `title`，方便桌面端快速查看全文。
            </p>
          </div>
          <div>
            <h3 className="mb-1 text-base font-semibold">多行编辑为什么要用 `autoSize`？</h3>
            <p className="m-0 opacity-80">
              `autoSize` 会把编辑控件切换为
              textarea，并按内容自适应高度，适合处理链接标题、注释、摘要一类的文本。
            </p>
          </div>
          <div>
            <h3 className="mb-1 text-base font-semibold">禁用态下复制或编辑按钮会怎样？</h3>
            <p className="m-0 opacity-80">
              Link 本体和附属操作都会一起禁用，避免视觉上像禁用、行为上却仍然可操作的状态不一致。
            </p>
          </div>
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default LinkDemo
