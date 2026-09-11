import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { MockupCode, Tabs } from '@rue-js/design'
type TabMode = 'preview' | 'code'

interface ExampleBlockProps {
  title: string
  summary?: string
  tab: { value: TabMode }
  preview: FC
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
      {tab.value === 'preview' ? preview({}) : <Code className="mt-2" lang="tsx" code={code} />}
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

const rootApiRows: ApiRow[] = [
  {
    prop: 'as',
    description: '指定根节点标签',
    type: 'any',
    defaultValue: `'div'`,
  },
  {
    prop: 'items',
    description: '数据驱动写法，按数组自动渲染多行',
    type: 'ReadonlyArray<MockupCodeLineData>',
    defaultValue: '-',
  },
  {
    prop: 'prefix',
    description: '为 items 模式下的每一行提供默认前缀，单行可继续覆盖',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'lineNumbers',
    description: '开启后为 items 模式自动补行号，未显式设置 prefix 时会把行号写入 data-prefix',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'start',
    description: '自动行号的起始值',
    type: 'number',
    defaultValue: '1',
  },
  {
    prop: 'codeClassName',
    description: 'items 模式下自动生成的 code 标签类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'className',
    description: '追加到 mockup-code 根节点的类名',
    type: 'string',
    defaultValue: '-',
  },
]

const lineApiRows: ApiRow[] = [
  {
    prop: 'prefix',
    description: '当前行前缀，最终写入 data-prefix',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'lineNumber',
    description: '快捷行号；未设置 prefix 时会作为前缀输出',
    type: 'number | string',
    defaultValue: '-',
  },
  {
    prop: 'code',
    description: '快捷文本内容，会自动包一层 code 标签',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'tone',
    description: '行级语义色，适合成功、告警、错误等状态',
    type: `'neutral' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'`,
    defaultValue: '-',
  },
  {
    prop: 'highlight',
    description: '把当前行渲染成高亮底色；可与 tone 组合',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'codeClassName',
    description: '自动生成的 code 标签类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'children',
    description: '自定义整行内容；传入后优先级高于 code',
    type: 'any',
    defaultValue: '-',
  },
]

const createInstallItems = () => [
  { code: 'pnpm add @rue-js/design' },
  { prefix: '>', code: 'Resolving workspace packages...', tone: 'warning' as const },
  { prefix: '>', code: 'Done in 2.1s', tone: 'success' as const },
]

const createNumberedItems = () => [
  { prefix: '37', code: `import { MockupCode } from '@rue-js/design'` },
  { prefix: '38', code: '' },
  { prefix: '39', code: 'export default function Demo() {' },
  {
    prefix: '40',
    code: '  return <MockupCode lineNumbers items={lines} />',
    tone: 'primary' as const,
  },
  { prefix: '41', code: '}' },
]

const createDiffItems = () => [
  { prefix: '-', code: 'const theme = "light"', tone: 'error' as const },
  {
    prefix: '+',
    code: 'const theme = "rue-night"',
    tone: 'success' as const,
    highlight: true,
  },
  {
    prefix: '~',
    code: 'const panel = createWorkspace(theme)',
    tone: 'info' as const,
  },
]

const ItemsPreview: FC = () => (
  <div className="card bg-base-100 shadow-sm">
    <div className="card-body">
      <MockupCode
        className="w-full"
        data-testid="mockup-code-items"
        prefix="$"
        items={createInstallItems()}
      />
    </div>
  </div>
)

const LinePreview: FC = () => (
  <div className="card bg-base-100 shadow-sm">
    <div className="card-body">
      <MockupCode className="w-full" data-testid="mockup-code-line-component">
        <MockupCode.Line prefix="21">
          <code>{`import { MockupCode } from '@rue-js/design'`}</code>
        </MockupCode.Line>
        <MockupCode.Line prefix="22">
          <code />
        </MockupCode.Line>
        <MockupCode.Line prefix="23">
          <code>{`const lines = [{ children: <code>hello rue</code> }]`}</code>
        </MockupCode.Line>
        <MockupCode.Line prefix="24" highlight tone="primary">
          <code>{`<MockupCode items={lines} />`}</code>
        </MockupCode.Line>
      </MockupCode>
    </div>
  </div>
)

const NumbersPreview: FC = () => (
  <div className="card bg-base-100 shadow-sm">
    <div className="card-body">
      <MockupCode
        className="w-full"
        data-testid="mockup-code-line-numbers"
        items={createNumberedItems()}
      />
    </div>
  </div>
)

const PrefixPreview: FC = () => (
  <div className="card bg-base-100 shadow-sm">
    <div className="card-body">
      <MockupCode className="w-full" data-testid="mockup-code-prefix">
        <pre data-prefix="$">
          <code>npm i daisyui</code>
        </pre>
      </MockupCode>
    </div>
  </div>
)

const MultiPreview: FC = () => (
  <div className="card bg-base-100 shadow-sm">
    <div className="card-body">
      <MockupCode className="w-full" data-testid="mockup-code-multi">
        <pre data-prefix="$">
          <code>npm i daisyui</code>
        </pre>
        <pre data-prefix=">" className="text-warning">
          <code>installing...</code>
        </pre>
        <pre data-prefix=">" className="text-success">
          <code>Done!</code>
        </pre>
      </MockupCode>
    </div>
  </div>
)

const HighlightPreview: FC = () => (
  <div className="card bg-base-100 shadow-sm">
    <div className="card-body gap-4">
      <MockupCode className="w-full" data-testid="mockup-code-highlight">
        <pre data-prefix="1">
          <code>npm i daisyui</code>
        </pre>
        <pre data-prefix="2">
          <code>installing...</code>
        </pre>
        <pre data-prefix="3" className="bg-warning text-warning-content">
          <code>Error!</code>
        </pre>
      </MockupCode>

      <MockupCode className="w-full" items={createDiffItems()} />
    </div>
  </div>
)

const LongLinePreview: FC = () => (
  <div className="card bg-base-100 shadow-sm">
    <div className="card-body overflow-x-auto">
      <MockupCode className="w-full" data-testid="mockup-code-long-line">
        <pre data-prefix="~">
          <code>
            Magnam dolore beatae necessitatibus nemopsum itaque sit. Et porro quae qui et et dolore
            ratione.
          </code>
        </pre>
      </MockupCode>
    </div>
  </div>
)

const NoPrefixPreview: FC = () => (
  <div className="card bg-base-100 shadow-sm">
    <div className="card-body">
      <MockupCode className="w-full" data-testid="mockup-code-without-prefix">
        <pre>
          <code>without prefix</code>
        </pre>
      </MockupCode>
    </div>
  </div>
)

const ColorPreview: FC = () => (
  <div className="card bg-base-100 shadow-sm">
    <div className="card-body">
      <MockupCode
        className="bg-primary text-primary-content w-full"
        data-testid="mockup-code-color"
      >
        <pre>
          <code>can be any color!</code>
        </pre>
      </MockupCode>
    </div>
  </div>
)

const MockupCodePage: FC = () => {
  const tabItems = ref<TabMode>('preview')
  const tabLine = ref<TabMode>('preview')
  const tabNumbers = ref<TabMode>('preview')
  const tabPrefix = ref<TabMode>('preview')
  const tabMulti = ref<TabMode>('preview')
  const tabHighlight = ref<TabMode>('preview')
  const tabLongLine = ref<TabMode>('preview')
  const tabNoPrefix = ref<TabMode>('preview')
  const tabColor = ref<TabMode>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Mockup Code 代码外框</h1>
        <p className="text-sm mt-3 mb-3">
          MockupCode 现在同时支持两种写法：展示基础 <code>pre + data-prefix</code>{' '}
          结构，也提供更顺手的
          <code>items</code> 与 <code>MockupCode.Line</code> 语义
          API，适合终端日志、代码片段和差异对比。
        </p>

        <h2>何时使用</h2>
        <ul>
          <li>需要用 Rue 的终端外框包裹一小段安装命令、日志输出或代码片段。</li>
          <li>
            希望把行号、前缀、状态色和高亮行用语义属性表达，而不是手写每个 <code>pre</code>。
          </li>
        </ul>

        <ExampleBlock
          title="推荐：items 数据驱动"
          summary="适合命令日志场景，根节点 prefix 可给整组行提供默认前缀。"
          tab={tabItems}
          preview={ItemsPreview}
          code={`const items = [
  { code: 'pnpm add @rue-js/design' },
  { prefix: '>', code: 'Resolving workspace packages...', tone: 'warning' },
  { prefix: '>', code: 'Done in 2.1s', tone: 'success' },
]

<MockupCode className="w-full" prefix="$" items={items} />`}
        />

        <ExampleBlock
          title="组合子项"
          summary="需要混合前缀、原生节点和 highlight 时，用 MockupCode.Line 会更直观。"
          tab={tabLine}
          preview={LinePreview}
          code={`<MockupCode className="w-full">
  <MockupCode.Line prefix="21">
    <code>{\`import { MockupCode } from '@rue-js/design'\`}</code>
  </MockupCode.Line>
  <MockupCode.Line prefix="22">
    <code />
  </MockupCode.Line>
  <MockupCode.Line prefix="23">
    <code>{\`const lines = [{ children: <code>hello rue</code> }]\`}</code>
  </MockupCode.Line>
  <MockupCode.Line prefix="24" highlight tone="primary">
    <code>{\`<MockupCode items={lines} />\`}</code>
  </MockupCode.Line>
</MockupCode>`}
        />

        <ExampleBlock
          title="自动行号"
          summary="当前示例先用显式前缀展示带行号片段，预览区可稳定看到完整内容。"
          tab={tabNumbers}
          preview={NumbersPreview}
          code={`const lines = [
  { prefix: '37', code: \`import { MockupCode } from '@rue-js/design'\` },
  { prefix: '38', code: '' },
  { prefix: '39', code: 'export default function Demo() {' },
  { prefix: '40', code: '  return <MockupCode lineNumbers items={lines} />', tone: 'primary' },
  { prefix: '41', code: '}' },
]

<MockupCode className="w-full" items={lines} />`}
        />

        <ExampleBlock
          title="单行前缀"
          summary="展示原生写法，适合最简单的安装命令展示。"
          tab={tabPrefix}
          preview={PrefixPreview}
          code={`<MockupCode className="w-full">
  <pre data-prefix="$">
    <code>npm i daisyui</code>
  </pre>
</MockupCode>`}
        />

        <ExampleBlock
          title="多行日志"
          summary="基础多行示例 展示，适合完全透传现成结构。"
          tab={tabMulti}
          preview={MultiPreview}
          code={`<MockupCode className="w-full">
  <pre data-prefix="$">
    <code>npm i daisyui</code>
  </pre>
  <pre data-prefix=">" className="text-warning">
    <code>installing...</code>
  </pre>
  <pre data-prefix=">" className="text-success">
    <code>Done!</code>
  </pre>
</MockupCode>`}
        />

        <ExampleBlock
          title="高亮与语义色"
          summary="highlight 和 tone 适合做差异提示、错误定位和关键输出。"
          tab={tabHighlight}
          preview={HighlightPreview}
          code={`<MockupCode className="w-full">
  <pre data-prefix="1">
    <code>npm i daisyui</code>
  </pre>
  <pre data-prefix="2">
    <code>installing...</code>
  </pre>
  <pre data-prefix="3" className="bg-warning text-warning-content">
    <code>Error!</code>
  </pre>
</MockupCode>

<MockupCode
  className="w-full"
  items={[
    { prefix: '-', code: 'const theme = "light"', tone: 'error' },
    { prefix: '+', code: 'const theme = "rue-night"', tone: 'success', highlight: true },
    { prefix: '~', code: 'const panel = createWorkspace(theme)', tone: 'info' },
  ]}
/>`}
        />

        <ExampleBlock
          title="长行滚动"
          summary="根节点仍然保持最薄的样式层，横向滚动继续交给外层布局容器。"
          tab={tabLongLine}
          preview={LongLinePreview}
          code={`<div className="overflow-x-auto">
  <MockupCode className="w-full">
    <pre data-prefix="~">
      <code>
        Magnam dolore beatae necessitatibus nemopsum itaque sit. Et porro quae qui et et dolore ratione.
      </code>
    </pre>
  </MockupCode>
</div>`}
        />

        <ExampleBlock
          title="无前缀"
          summary="没有行号或提示符的短内容也可以直接放进 MockupCode。"
          tab={tabNoPrefix}
          preview={NoPrefixPreview}
          code={`<MockupCode className="w-full">
  <pre>
    <code>without prefix</code>
  </pre>
</MockupCode>`}
        />

        <ExampleBlock
          title="自定义底色"
          summary="组件继续遵循 Rue 的样式组合方式，主题色交给 className 自由叠加。"
          tab={tabColor}
          preview={ColorPreview}
          code={`<MockupCode className="bg-primary text-primary-content w-full">
  <pre>
    <code>can be any color!</code>
  </pre>
</MockupCode>`}
        />

        <h2 id="mockup-code-api">API</h2>
        <p>当前页面展示的是语义化的根组件与行组件 API。</p>

        <h3>MockupCode</h3>
        <ApiTable rows={rootApiRows} />

        <h3>MockupCode.Line / MockupCodeLineData</h3>
        <ApiTable rows={lineApiRows} />

        <div className="not-prose mt-6 rounded-box border border-base-300 bg-base-100 p-4">
          <h3 className="mt-0 mb-3 text-base font-semibold">前缀优先级</h3>
          <div className="grid gap-2 text-sm md:grid-cols-3">
            <div>
              <code>item.prefix</code> 优先级最高
            </div>
            <div>
              否则回退到根节点 <code>prefix</code>
            </div>
            <div>
              两者都没有时，<code>lineNumbers</code> 会输出自动行号
            </div>
          </div>
        </div>

        <h2>FAQ</h2>

        <h3>什么时候用 items，什么时候可以写原生 pre？</h3>
        <p>
          如果内容来自数组、日志流或代码生成，优先用 <code>items</code>；如果你已经有现成的
          <code>pre + data-prefix</code> 结构，继续透传即可，不需要额外改造。
        </p>

        <h3>highlight 和 tone 分别负责什么？</h3>
        <p>
          <code>tone</code> 负责语义色，适合成功、错误、告警等输出；<code>highlight</code>
          负责行背景强调，两者叠加后更适合做 diff 或重点提示。
        </p>
      </div>
    </SidebarPlayground>
  )
}

export default MockupCodePage
