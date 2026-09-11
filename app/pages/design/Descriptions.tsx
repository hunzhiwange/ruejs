import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import { Descriptions } from '@rue-js/design'
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

const workspaceItems = [
  { key: 'product', label: 'Product', children: 'Nebula Desk' },
  { key: 'owner', label: 'Owner', children: 'Ariel Chen' },
  {
    key: 'stage',
    label: 'Stage',
    children: <span className="badge badge-success badge-sm">Beta</span>,
  },
  { key: 'launch-window', label: 'Launch Window', children: 'May 18 - May 24' },
  {
    key: 'channels',
    label: 'Channels',
    children: 'Site · Docs · Campaign',
    span: 2 as const,
  },
]

const shipmentItems = [
  { key: 'batch', label: 'Batch', children: 'RUE-24-0513' },
  { key: 'region', label: 'Region', children: 'APAC', span: 2 as const },
  { key: 'runtime', label: 'Runtime', children: 'vapor + bridge' },
  {
    key: 'review',
    label: 'Review Lane',
    children: (
      <div className="flex flex-wrap gap-2">
        <span className="badge badge-outline badge-sm">Docs</span>
        <span className="badge badge-outline badge-sm">QA</span>
        <span className="badge badge-outline badge-sm">Design</span>
      </div>
    ),
  },
  {
    key: 'note',
    label: 'Note',
    children: 'Docs refresh、运行时冒烟与视觉复核会在同一窗口内并行完成。',
    span: 'filled' as const,
  },
]

const signalItems = [
  {
    key: 'availability',
    label: 'Availability',
    children: <span className="badge badge-info badge-sm">99.98%</span>,
  },
  { key: 'latency', label: 'Latency', children: '186 ms' },
  { key: 'errors', label: 'Error Rate', children: '0.12%' },
  { key: 'region', label: 'Primary Region', children: 'Singapore' },
  {
    key: 'owners',
    label: 'Owners',
    children: 'Platform · Design Infra · Docs Ops',
    span: 2 as const,
  },
  {
    key: 'memo',
    label: 'Memo',
    children: '跨端上线窗口已锁定，后续只需要滚动同步质量信号与回归结果。',
    span: 'filled' as const,
  },
]

const basicTab = ref<PreviewTabMode>('preview')
const borderedTab = ref<PreviewTabMode>('preview')
const verticalTab = ref<PreviewTabMode>('preview')
const responsiveTab = ref<PreviewTabMode>('preview')

const apiRows: ApiRow[] = [
  {
    prop: 'title / extra',
    description: '头部标题与右侧扩展位，适合放操作、状态说明或入口按钮。',
    type: 'any',
    defaultValue: '- / -',
  },
  {
    prop: 'items / children',
    description: '支持 items 数组，也支持 Descriptions.Item 子组件。',
    type: 'DescriptionsItemProps[] / any',
    defaultValue: '[] / -',
  },
  {
    prop: 'column',
    description: '每行列数，支持数字和响应式断点对象。',
    type: 'number | { xs?: number; sm?: number; md?: number; lg?: number; xl?: number; xxl?: number }',
    defaultValue: '3',
  },
  {
    prop: 'layout',
    description: '切换水平或垂直布局。垂直布局会拆成 label 行和 content 行。',
    type: "'horizontal' | 'vertical'",
    defaultValue: "'horizontal'",
  },
  {
    prop: 'bordered',
    description: '开启更明确的表格分隔边框，适合信息清单与详情页。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'size',
    description: '控制间距与字号，支持 small/default/middle/large 以及 sm/md/lg。',
    type: 'DescriptionsSize',
    defaultValue: "'default'",
  },
  {
    prop: 'colon',
    description: '控制水平布局下 label 后面的冒号。',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    prop: 'classNames / styles',
    description: '对 root、header、title、extra、body、row、item、label、content 做语义化定制。',
    type: 'object',
    defaultValue: '-',
  },
  {
    prop: 'labelStyle / contentStyle',
    description: '批量覆盖所有 label / content 的内联样式。',
    type: 'object',
    defaultValue: '-',
  },
  {
    prop: 'item.span',
    description: '单项占列数，支持数字、响应式对象和 filled（自动补满当前行）。',
    type: 'number | responsive | "filled"',
    defaultValue: '1',
  },
  {
    prop: 'item.className / labelClassName / contentClassName',
    description: '对单条描述的整体、标签区和内容区分别做细化样式增强。',
    type: 'string',
    defaultValue: '-',
  },
]

const basicCode = `import { Descriptions } from '@rue-js/design'
const items = [
  { key: 'product', label: 'Product', children: 'Nebula Desk' },
  { key: 'owner', label: 'Owner', children: 'Ariel Chen' },
  { key: 'stage', label: 'Stage', children: <span className="badge badge-success badge-sm">Beta</span> },
  { key: 'launch-window', label: 'Launch Window', children: 'May 18 - May 24' },
  { key: 'channels', label: 'Channels', children: 'Site · Docs · Campaign', span: 2 },
]

<Descriptions
  title="Workspace Pulse"
  extra={<button className="btn btn-ghost btn-sm rounded-full">Open Board</button>}
  items={items}
  column={3}
/>`

const borderedCode = `import { Descriptions } from '@rue-js/design'<Descriptions
  title="Release Shipping Board"
  bordered
  size="small"
  column={3}
  items={[
    { key: 'batch', label: 'Batch', children: 'RUE-24-0513' },
    { key: 'region', label: 'Region', children: 'APAC', span: 2 },
    { key: 'runtime', label: 'Runtime', children: 'vapor + bridge' },
    {
      key: 'review',
      label: 'Review Lane',
      children: 'Docs · QA · Design',
    },
    {
      key: 'note',
      label: 'Note',
      children: 'Docs refresh、运行时冒烟与视觉复核会在同一窗口内并行完成。',
      span: 'filled',
    },
  ]}
/>`

const verticalCode = `import { Descriptions } from '@rue-js/design'<Descriptions title="Campaign Frame" layout="vertical" bordered column={2}>
  <Descriptions.Item label="Headline">Orbit launch week</Descriptions.Item>
  <Descriptions.Item label="Owner">Growth Studio</Descriptions.Item>
  <Descriptions.Item label="Narrative">
    聚焦多入口落地页、价格页和 onboarding 通路的同周协同。
  </Descriptions.Item>
  <Descriptions.Item label="Assets">
    <div className="flex flex-wrap gap-2">
      <span className="badge badge-outline badge-sm">KV</span>
      <span className="badge badge-outline badge-sm">Motion</span>
      <span className="badge badge-outline badge-sm">FAQ</span>
    </div>
  </Descriptions.Item>
</Descriptions>`

const responsiveCode = `import { Descriptions } from '@rue-js/design'<Descriptions
  title="Signal Board"
  size="large"
  colon={false}
  column={{ xs: 1, md: 2, xl: 4 }}
  classNames={{
    body: 'bg-gradient-to-br from-base-100 via-base-100 to-info/8',
    label: 'text-info/60',
  }}
  styles={{
    body: {
      borderColor: 'color-mix(in srgb, var(--color-info) 18%, transparent)',
    },
    content: {
      fontWeight: 500,
    },
  }}
  items={[
    { key: 'availability', label: 'Availability', children: '99.98%' },
    { key: 'latency', label: 'Latency', children: '186 ms' },
    { key: 'errors', label: 'Error Rate', children: '0.12%' },
    { key: 'region', label: 'Primary Region', children: 'Singapore' },
    { key: 'owners', label: 'Owners', children: 'Platform · Design Infra · Docs Ops', span: 2 },
    {
      key: 'memo',
      label: 'Memo',
      children: '跨端上线窗口已锁定，后续只需要滚动同步质量信号与回归结果。',
      span: 'filled',
    },
  ]}
/>`

const DescriptionsDesign: FC = () => {
  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Descriptions 描述列表</h1>
        <p>
          Rue 的 Descriptions 保持当前设计体系偏轻的卡片和信息面板质感，但 API
          尽量贴近成熟组件库的详情清单心智。 现在它同时支持 items 和
          Descriptions.Item、水平与垂直布局、响应式列数、span 与 filled，以及语义化样式扩展。
        </p>

        <div className="not-prose mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/40 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">
              Input Shape
            </div>
            <div className="mt-2 text-base font-semibold">items 与 Item 都可用</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              支持数组声明，也能保持 JSX 结构化书写。
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/40 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">
              Layout Logic
            </div>
            <div className="mt-2 text-base font-semibold">column、span、filled</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              既能做整齐的详情表，也能容纳长文案和跨列信息块。
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/40 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">
              Semantic Styling
            </div>
            <div className="mt-2 text-base font-semibold">不改结构也能换气质</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              通过 classNames 与 styles，能把同一套信息骨架调成不同场景的密度和调性。
            </p>
          </div>
        </div>

        <PreviewBlock
          title="基础 items API"
          summary="最直接的 items 用法：直接用数组描述标签、内容与跨列。"
          tab={basicTab}
          code={basicCode}
          preview={() => (
            <Descriptions
              title="Workspace Pulse"
              extra={<button className="btn btn-ghost btn-sm rounded-full">Open Board</button>}
              items={workspaceItems}
              column={3}
            />
          )}
        />

        <PreviewBlock
          title="带边框与跨列填充"
          summary="bordered 适合信息更密集的发版、交付和详情页；filled 会自动补满当前行。"
          tab={borderedTab}
          code={borderedCode}
          preview={() => (
            <Descriptions
              title="Release Shipping Board"
              bordered
              size="small"
              column={3}
              items={shipmentItems}
            />
          )}
        />

        <PreviewBlock
          title="垂直布局与 JSX 子组件"
          summary="Descriptions.Item 适合需要在局部插入复杂 JSX 的详情卡片。"
          tab={verticalTab}
          code={verticalCode}
          preview={() => (
            <Descriptions
              title="Campaign Frame"
              extra={<span className="badge badge-outline badge-sm">2 lanes</span>}
              layout="vertical"
              bordered
              column={2}
            >
              <Descriptions.Item label="Headline">Orbit launch week</Descriptions.Item>
              <Descriptions.Item label="Owner">Growth Studio</Descriptions.Item>
              <Descriptions.Item label="Narrative">
                聚焦多入口落地页、价格页和 onboarding 通路的同周协同。
              </Descriptions.Item>
              <Descriptions.Item label="Assets">
                <div className="flex flex-wrap gap-2">
                  <span className="badge badge-outline badge-sm">KV</span>
                  <span className="badge badge-outline badge-sm">Motion</span>
                  <span className="badge badge-outline badge-sm">FAQ</span>
                </div>
              </Descriptions.Item>
            </Descriptions>
          )}
        />

        <PreviewBlock
          title="响应式列数与语义样式"
          summary="在小屏自动折成单列，大屏回到仪表盘式信息面板；同时演示 colon、classNames 和 styles。"
          tab={responsiveTab}
          code={responsiveCode}
          preview={() => (
            <Descriptions
              title="Signal Board"
              size="large"
              colon={false}
              column={{ xs: 1, md: 2, xl: 4 }}
              classNames={{
                body: 'bg-gradient-to-br from-base-100 via-base-100 to-info/8',
                label: 'text-info/60',
              }}
              styles={{
                body: {
                  borderColor: 'color-mix(in srgb, var(--color-info) 18%, transparent)',
                },
                content: {
                  fontWeight: 500,
                },
              }}
              items={signalItems}
            />
          )}
        />

        <h2>API</h2>
        <ApiTable rows={apiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default DescriptionsDesign
