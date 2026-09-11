import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Tabs, TextRotate, Typography } from '@rue-js/design'
type DemoTabKey = 'preview' | 'code'

interface DemoBlockProps {
  title: string
  description: string
  activeKey: { value: DemoTabKey }
  preview: any
  code: string
}

interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
}

const DemoBlock: FC<DemoBlockProps> = ({ title, description, activeKey, preview, code }) => {
  return (
    <div className="component-preview not-prose text-base-content my-6 lg:my-12">
      <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">{title}</h2>
      <p className="text-sm mt-3 mb-3">{description}</p>
      <Tabs
        style="box"
        items={[
          { key: 'preview', label: '预览' },
          { key: 'code', label: 'JSX代码' },
        ]}
        activeKey={activeKey.value}
        onChange={k => (activeKey.value = k as DemoTabKey)}
        className="mb-3"
      />
      {activeKey.value === 'preview' ? preview : <Code className="mt-2" lang="tsx" code={code} />}
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

const inlineStatesCode = `<div className="flex flex-wrap items-center gap-4 text-lg">
  <Typography.Text>Rue</Typography.Text>
  <Typography.Text type="secondary">Secondary</Typography.Text>
  <Typography.Text type="success" strong>
    Success
  </Typography.Text>
  <Typography.Text type="warning" mark>
    Highlight
  </Typography.Text>
  <Typography.Text code>pnpm dev</Typography.Text>
  <Typography.Text keyboard>Esc</Typography.Text>
  <Typography.Link href="https://rue.dev" target="_blank" type="danger">
    Danger Link
  </Typography.Link>
</div>`

const hierarchyCode = `<Typography className="space-y-4">
  <Typography.Title level={2} className="font-title">
    Release notes that stay readable
  </Typography.Title>

  <Typography.Paragraph>
    Use <Typography.Text strong>Text</Typography.Text> for emphasis,{' '}
    <Typography.Text code>code</Typography.Text> for commands, and{' '}
    <Typography.Link href="https://rue.dev" target="_blank">
      Typography.Link
    </Typography.Link>{' '}
    for inline actions.
  </Typography.Paragraph>

  <Typography.Paragraph type="secondary">
    Paragraph keeps the reading rhythm while letting inline semantics stay expressive.
  </Typography.Paragraph>
</Typography>`

const levelsCode = `<div className="space-y-3">
  <Typography.Title level={1}>Heading 1</Typography.Title>
  <Typography.Title level={2}>Heading 2</Typography.Title>
  <Typography.Title level={3}>Heading 3</Typography.Title>
  <Typography.Title level={4}>Heading 4</Typography.Title>
  <Typography.Title level={5}>Heading 5</Typography.Title>
</div>`

const rotateCompositionCode = `<Typography className="space-y-4">
  <Typography.Title level={3} className="font-title">
    Ship better UI for{' '}
    <TextRotate
      className="text-primary"
      innerClassName="justify-items-start"
      items={[
        { text: 'design systems', strong: true },
        { text: 'docs sites', type: 'success', strong: true },
        { text: 'team workflows', type: 'warning', mark: true },
      ]}
    />
  </Typography.Title>

  <Typography.Paragraph>
    TextRotate items reuse the same semantic API, so headings, body copy and rotating words stay in one typography system.
  </Typography.Paragraph>

  <TextRotate
    className="text-2xl font-title"
    innerClassName="justify-items-start"
    items={[
      { text: 'Readable', strong: true },
      { text: 'Reviewable', type: 'secondary', underline: true },
      { text: 'Deployable', href: 'https://rue.dev', type: 'danger' },
    ]}
  />
</Typography>`

const rootApiRows: ApiRow[] = [
  {
    prop: 'as',
    description: '根节点标签，适合在 div、section、article 之间切换。',
    type: `'div' | 'section' | 'article'`,
    defaultValue: `'div'`,
  },
  {
    prop: 'className / style',
    description: '补充根节点样式；默认带有 rue-typography 与基础文本颜色。',
    type: 'string / any',
    defaultValue: '-',
  },
  {
    prop: 'children',
    description: '放置 Text、Link、Title、Paragraph 或任意可组合内容。',
    type: 'any',
    defaultValue: '-',
  },
]

const textApiRows: ApiRow[] = [
  {
    prop: 'as',
    description: '仅 Typography.Text 支持，用于指定输出标签。',
    type: `'span' | 'div' | 'p'`,
    defaultValue: `'span'`,
  },
  {
    prop: 'type',
    description: '文本语气，默认普通文本，其余映射到语义颜色。',
    type: 'TypographyTone',
    defaultValue: `'default'`,
  },
  {
    prop: 'disabled',
    description: '禁用交互并弱化视觉，同时补充 aria-disabled。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'mark / code / keyboard',
    description: '将内容包装成高亮、代码片段或键帽样式。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'underline / delete / strong / italic',
    description: '控制下划线、删除线、加粗和斜体等强调方式。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'href / target / rel',
    description: '仅 Typography.Link 支持的链接属性，target 为 _blank 时默认补 noreferrer。',
    type: 'string',
    defaultValue: '-',
  },
]

const headingApiRows: ApiRow[] = [
  {
    prop: 'level',
    description: '仅 Typography.Title 支持，映射 h1 到 h5 的标题层级与字号。',
    type: '1 | 2 | 3 | 4 | 5',
    defaultValue: '1',
  },
  {
    prop: 'type',
    description: '标题和段落都支持语义色调，便于和正文 tone 保持统一。',
    type: 'TypographyTone',
    defaultValue: `'default'`,
  },
  {
    prop: 'disabled',
    description: '弱化显示并补 aria-disabled，适合只读或禁用态文案。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'mark / code / keyboard',
    description: '允许标题和段落复用高亮、代码和键帽包装能力。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'underline / delete / strong / italic',
    description: '支持强调、删除和斜体等排版修饰。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'className / style / children',
    description: '用于补充样式和传入可组合内容，Paragraph 默认输出段落节点。',
    type: 'any',
    defaultValue: '-',
  },
]

const TypographyDemo: FC = () => {
  const tabInline = ref<DemoTabKey>('preview')
  const tabHierarchy = ref<DemoTabKey>('preview')
  const tabLevels = ref<DemoTabKey>('preview')
  const tabRotate = ref<DemoTabKey>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Typography 排版</h1>
        <p className="text-sm mt-3 mb-3">
          Typography 采用常见业务排版组件的组织方式，提供 <code>Text</code>、<code>Link</code>、
          <code>Title</code>、<code>Paragraph</code> 这组复合 API。
        </p>
        <p className="text-sm mb-3 opacity-80">
          它使用 Rue 当前轻量、类名直连的风格，同时也成为 Text Rotate 等组件的语义文本底座。
        </p>

        <DemoBlock
          title="# Inline text states"
          description="Use Text and Link for tone, emphasis and inline semantic content"
          activeKey={tabInline}
          preview={
            <div className="flex flex-wrap items-center gap-4 text-lg">
              <Typography.Text>Rue</Typography.Text>
              <Typography.Text type="secondary">Secondary</Typography.Text>
              <Typography.Text type="success" strong>
                Success
              </Typography.Text>
              <Typography.Text type="warning" mark>
                Highlight
              </Typography.Text>
              <Typography.Text code>pnpm dev</Typography.Text>
              <Typography.Text keyboard>Esc</Typography.Text>
              <Typography.Link href="https://rue.dev" target="_blank" type="danger">
                Danger Link
              </Typography.Link>
            </div>
          }
          code={inlineStatesCode}
        />

        <DemoBlock
          title="# Title and paragraph composition"
          description="Organize headings, body copy and inline emphasis in one consistent text system"
          activeKey={tabHierarchy}
          preview={
            <Typography className="space-y-4">
              <Typography.Title level={2} className="font-title">
                Release notes that stay readable
              </Typography.Title>

              <Typography.Paragraph>
                Use <Typography.Text strong>Text</Typography.Text> for emphasis,{' '}
                <Typography.Text code>code</Typography.Text> for commands, and{' '}
                <Typography.Link href="https://rue.dev" target="_blank">
                  Typography.Link
                </Typography.Link>{' '}
                for inline actions.
              </Typography.Paragraph>

              <Typography.Paragraph type="secondary">
                Paragraph keeps the reading rhythm while letting inline semantics stay expressive.
              </Typography.Paragraph>
            </Typography>
          }
          code={hierarchyCode}
        />

        <DemoBlock
          title="# Heading levels"
          description="Map Title level to h1 through h5 while keeping Rue's typography rhythm"
          activeKey={tabLevels}
          preview={
            <div className="space-y-3">
              <Typography.Title level={1}>Heading 1</Typography.Title>
              <Typography.Title level={2}>Heading 2</Typography.Title>
              <Typography.Title level={3}>Heading 3</Typography.Title>
              <Typography.Title level={4}>Heading 4</Typography.Title>
              <Typography.Title level={5}>Heading 5</Typography.Title>
            </div>
          }
          code={levelsCode}
        />

        <DemoBlock
          title="# Compose with Text Rotate"
          description="The semantic API is shared, so static copy and rotating words feel like one family"
          activeKey={tabRotate}
          preview={
            <Typography className="space-y-4">
              <Typography.Title level={3} className="font-title">
                Ship better UI for{' '}
                <TextRotate
                  className="text-primary"
                  innerClassName="justify-items-start"
                  items={[
                    { text: 'design systems', strong: true },
                    { text: 'docs sites', type: 'success', strong: true },
                    { text: 'team workflows', type: 'warning', mark: true },
                  ]}
                />
              </Typography.Title>

              <Typography.Paragraph>
                TextRotate items reuse the same semantic API, so headings, body copy and rotating
                words stay in one typography system.
              </Typography.Paragraph>

              <TextRotate
                className="text-2xl font-title"
                innerClassName="justify-items-start"
                items={[
                  { text: 'Readable', strong: true },
                  { text: 'Reviewable', type: 'secondary', underline: true },
                  { text: 'Deployable', href: 'https://rue.dev', type: 'danger' },
                ]}
              />
            </Typography>
          }
          code={rotateCompositionCode}
        />

        <h2>API</h2>
        <p className="text-sm opacity-80">
          API 按根组件、内联语义组件和排版语义组件拆分，便于先搭内容结构，再补细粒度的强调方式。
        </p>
        <div className="not-prose mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="text-sm font-medium">Typography Root</div>
            <p className="mt-2 text-sm opacity-70">
              根组件适合承接完整文案区块，本身不强加复杂布局，只提供稳定的文本基底。
            </p>
          </div>
          <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="text-sm font-medium">Text / Link</div>
            <p className="mt-2 text-sm opacity-70">
              这组组件偏内联表达，适合补 tone、强调状态、代码语义和链接能力。
            </p>
          </div>
          <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="text-sm font-medium">Title / Paragraph</div>
            <p className="mt-2 text-sm opacity-70">
              用于标题层级和正文节奏，适合和其他业务组件组合成完整的内容模块。
            </p>
          </div>
        </div>

        <h3 className="mt-8">Typography</h3>
        <p className="text-sm opacity-70">
          根组件负责承接一整段排版内容，适合包裹标题、正文和其他语义文本节点。
        </p>
        <ApiTable rows={rootApiRows} />

        <h3>Typography.Text / Typography.Link</h3>
        <p className="text-sm opacity-70">
          内联子组件负责 tone、强调和链接表达，适合放进句子、描述和其他组件的插槽里复用。
        </p>
        <ApiTable rows={textApiRows} />

        <h3>Typography.Title / Typography.Paragraph</h3>
        <p className="text-sm opacity-70">
          排版子组件负责标题层级和正文节奏，也可以直接和 Text Rotate 之类的组件组合使用。
        </p>
        <ApiTable rows={headingApiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default TypographyDemo
