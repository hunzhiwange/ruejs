import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Avatar, Button, Stat, Tabs } from '@rue-js/design'
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

const InfoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    className="inline-block w-8 h-8 stroke-current"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    ></path>
  </svg>
)

const HeartIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    className="inline-block w-8 h-8 stroke-current"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
    ></path>
  </svg>
)

const BoltIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    className="inline-block w-8 h-8 stroke-current"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M13 10V3L4 14h7v7l9-11h-7z"
    ></path>
  </svg>
)

const SlidersIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    className="inline-block w-8 h-8 stroke-current"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
    ></path>
  </svg>
)

const PackageIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    className="inline-block w-8 h-8 stroke-current"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
    ></path>
  </svg>
)

const statItems = [
  {
    figure: <InfoIcon />,
    figureClassName: 'text-secondary',
    title: 'Downloads',
    value: '31K',
    desc: 'Jan 1st - Feb 1st',
  },
  {
    center: true,
    title: 'Users',
    value: <span className="text-secondary">4,200</span>,
    desc: <span className="text-secondary">↗︎ 40 (2%)</span>,
  },
  {
    title: 'Account balance',
    value: '$89,400',
    actions: (
      <Button color="success" size="xs">
        Add funds
      </Button>
    ),
  },
] as const

const basicCode = `<Stat className="shadow">
  <Stat.Item>
    <Stat.Title>Total Page Views</Stat.Title>
    <Stat.Value>89,400</Stat.Value>
    <Stat.Desc>21% more than last month</Stat.Desc>
  </Stat.Item>
</Stat>`

const itemsCode = `import { Button, Stat } from '@rue-js/design'
const statItems = [
  {
    figure: <InfoIcon />,
    figureClassName: 'text-secondary',
    title: 'Downloads',
    value: '31K',
    desc: 'Jan 1st - Feb 1st',
  },
  {
    center: true,
    title: 'Users',
    value: <span className="text-secondary">4,200</span>,
    desc: <span className="text-secondary">↗︎ 40 (2%)</span>,
  },
  {
    title: 'Account balance',
    value: '$89,400',
    actions: <Button color="success" size="xs">Add funds</Button>,
  },
]

<Stat items={statItems} className="shadow" />`

const formatCode = `<Stat className="shadow">
  <Stat.Item
    title="GMV"
    value={112893}
    precision={2}
    prefix="$"
    suffix="USD"
    desc="格式化后的数值由 Value 自动处理"
  />
  <Stat.Item
    title="Success Rate"
    value={99.86}
    precision={2}
    suffix="%"
    valueClassName="text-success"
    desc="支持 0、精度和分组符"
  />
</Stat>`

const formatterCode = `<Stat className="shadow">
  <Stat.Item
    title="Requests"
    value={1280}
    prefix="API"
    formatter={value => \`\${value} req/s\`}
    desc="formatter 适合把基础值映射成业务文案"
  />
  <Stat.Item>
    <Stat.Title>Storage</Stat.Title>
    <Stat.Value value={24576} suffix="GB" valueRender={node => <span className="text-primary">{node}</span>} />
    <Stat.Desc>valueRender 可以包裹高亮节点</Stat.Desc>
  </Stat.Item>
</Stat>`

const loadingCode = `<Stat className="shadow">
  <Stat.Item title="Sync Revenue" loading desc="数据回填前展示 skeleton 占位" />
  <Stat.Item title="Open Orders" value={0} suffix="items" desc="0 会正常渲染，不会被误判为空" />
</Stat>`

const timerCode = `const deadline = Date.now() + 1000 * 60 * 60 * 24 + 1000 * 30
const startedAt = Date.now() - 1000 * 60 * 60 * 3 - 1000 * 12

<Stat className="shadow">
  <Stat.Timer
    title="Campaign Countdown"
    value={deadline}
    suffix="left"
    desc="默认按 HH:mm:ss 渲染"
  />
  <Stat.Timer
    type="countup"
    title="Uptime"
    value={startedAt}
    format="H[h] m[m] s[s]"
    valueClassName="text-success"
    desc="type='countup' 适合累计时长"
  />
</Stat>`

const iconsCode = `<Stat className="shadow">
  <Stat.Item>
    <Stat.Figure className="text-primary">
      <HeartIcon />
    </Stat.Figure>
    <Stat.Title>Total Likes</Stat.Title>
    <Stat.Value className="text-primary">25.6K</Stat.Value>
    <Stat.Desc>21% more than last month</Stat.Desc>
  </Stat.Item>
  <Stat.Item>
    <Stat.Figure className="text-secondary">
      <BoltIcon />
    </Stat.Figure>
    <Stat.Title>Page Views</Stat.Title>
    <Stat.Value className="text-secondary">2.6M</Stat.Value>
    <Stat.Desc>21% more than last month</Stat.Desc>
  </Stat.Item>
  <Stat.Item>
    <Stat.Figure className="text-secondary">
      <Avatar status="online">
        <div className="w-16 rounded-full">
          <img src="https://img.daisyui.com/images/profile/demo/anakeen@192.webp" />
        </div>
      </Avatar>
    </Stat.Figure>
    <Stat.Value>86%</Stat.Value>
    <Stat.Title>Tasks done</Stat.Title>
    <Stat.Desc className="text-secondary">31 tasks remaining</Stat.Desc>
  </Stat.Item>
</Stat>`

const groupCode = `<Stat className="shadow">
  <Stat.Item>
    <Stat.Figure className="text-secondary">
      <InfoIcon />
    </Stat.Figure>
    <Stat.Title>Downloads</Stat.Title>
    <Stat.Value>31K</Stat.Value>
    <Stat.Desc>Jan 1st - Feb 1st</Stat.Desc>
  </Stat.Item>
  <Stat.Item>
    <Stat.Figure className="text-secondary">
      <SlidersIcon />
    </Stat.Figure>
    <Stat.Title>New Users</Stat.Title>
    <Stat.Value>4,200</Stat.Value>
    <Stat.Desc>↗︎ 400 (22%)</Stat.Desc>
  </Stat.Item>
  <Stat.Item>
    <Stat.Figure className="text-secondary">
      <PackageIcon />
    </Stat.Figure>
    <Stat.Title>New Registers</Stat.Title>
    <Stat.Value>1,200</Stat.Value>
    <Stat.Desc>↘︎ 90 (14%)</Stat.Desc>
  </Stat.Item>
</Stat>`

const centeredCode = `<Stat className="shadow">
  <Stat.Item center>
    <Stat.Title>Downloads</Stat.Title>
    <Stat.Value>31K</Stat.Value>
    <Stat.Desc>From January 1st to February 1st</Stat.Desc>
  </Stat.Item>
  <Stat.Item center>
    <Stat.Title>Users</Stat.Title>
    <Stat.Value className="text-secondary">4,200</Stat.Value>
    <Stat.Desc className="text-secondary">↗︎ 40 (2%)</Stat.Desc>
  </Stat.Item>
  <Stat.Item center>
    <Stat.Title>New Registers</Stat.Title>
    <Stat.Value>1,200</Stat.Value>
    <Stat.Desc>↘︎ 90 (14%)</Stat.Desc>
  </Stat.Item>
</Stat>`

const verticalCode = `<Stat direction="vertical" className="shadow">
  <Stat.Item>
    <Stat.Title>Downloads</Stat.Title>
    <Stat.Value>31K</Stat.Value>
    <Stat.Desc>Jan 1st - Feb 1st</Stat.Desc>
  </Stat.Item>
  <Stat.Item>
    <Stat.Title>New Users</Stat.Title>
    <Stat.Value>4,200</Stat.Value>
    <Stat.Desc>↗︎ 400 (22%)</Stat.Desc>
  </Stat.Item>
  <Stat.Item>
    <Stat.Title>New Registers</Stat.Title>
    <Stat.Value>1,200</Stat.Value>
    <Stat.Desc>↘︎ 90 (14%)</Stat.Desc>
  </Stat.Item>
</Stat>`

const responsiveCode = `<Stat direction="vertical" className="shadow lg:stats-horizontal">
  <Stat.Item>
    <Stat.Title>Downloads</Stat.Title>
    <Stat.Value>31K</Stat.Value>
    <Stat.Desc>Jan 1st - Feb 1st</Stat.Desc>
  </Stat.Item>
  <Stat.Item>
    <Stat.Title>New Users</Stat.Title>
    <Stat.Value>4,200</Stat.Value>
    <Stat.Desc>↗︎ 400 (22%)</Stat.Desc>
  </Stat.Item>
  <Stat.Item>
    <Stat.Title>New Registers</Stat.Title>
    <Stat.Value>1,200</Stat.Value>
    <Stat.Desc>↘︎ 90 (14%)</Stat.Desc>
  </Stat.Item>
</Stat>`

const actionsCode = `<Stat className="bg-base-100 border border-base-300">
  <Stat.Item>
    <Stat.Title>Account balance</Stat.Title>
    <Stat.Value>$89,400</Stat.Value>
    <Stat.Actions>
      <Button color="success" size="xs">Add funds</Button>
    </Stat.Actions>
  </Stat.Item>
  <Stat.Item>
    <Stat.Title>Current balance</Stat.Title>
    <Stat.Value>$89,400</Stat.Value>
    <Stat.Actions>
      <Button size="xs">Withdrawal</Button>
      <Button size="xs">Deposit</Button>
    </Stat.Actions>
  </Stat.Item>
</Stat>`

const containerApiRows: ApiRow[] = [
  {
    prop: 'direction',
    description: '统计容器排列方向',
    type: `'horizontal' | 'vertical'`,
    defaultValue: `'horizontal'`,
  },
  {
    prop: 'items',
    description: '通过数据项快速渲染多个统计块',
    type: 'StatDataItem[]',
    defaultValue: '-',
  },
  {
    prop: 'className',
    description: '补充容器类名，常配合 shadow / border / 响应式类使用',
    type: 'string',
    defaultValue: '-',
  },
]

const itemApiRows: ApiRow[] = [
  {
    prop: 'title / value / desc',
    description: '直接声明常用统计内容，无需手写子节点结构',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'prefix / suffix',
    description: '为数值区域追加前缀和后缀',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'formatter',
    description: '自定义数值展示文案',
    type: '(value) => any',
    defaultValue: '-',
  },
  {
    prop: 'precision',
    description: '数字精度，不传则展示基础小数',
    type: 'number',
    defaultValue: '-',
  },
  {
    prop: 'loading',
    description: '在 value 区域展示 skeleton 占位',
    type: 'boolean',
    defaultValue: 'false',
  },
  { prop: 'center', description: '启用居中布局', type: 'boolean', defaultValue: 'false' },
]

const valueApiRows: ApiRow[] = [
  {
    prop: 'value',
    description: '支持 number、string 或任意展示节点',
    type: 'any',
    defaultValue: '-',
  },
  { prop: 'groupSeparator', description: '千分位分隔符', type: 'string', defaultValue: `','` },
  { prop: 'decimalSeparator', description: '小数点分隔符', type: 'string', defaultValue: `'.'` },
  {
    prop: 'valueRender',
    description: '包装格式化后的值节点，适合高亮或插入 tag',
    type: '(node) => any',
    defaultValue: '-',
  },
]

const timerApiRows: ApiRow[] = [
  {
    prop: 'type',
    description: '计时类型，支持倒计时和累计计时',
    type: `'countdown' | 'countup'`,
    defaultValue: `'countdown'`,
  },
  {
    prop: 'value',
    description: '目标时间，支持时间戳、Date、可解析字符串',
    type: 'number | string | Date',
    defaultValue: '-',
  },
  {
    prop: 'format',
    description: '时间格式，支持 D/H/m/s/S 和 [literal] 文本',
    type: 'string',
    defaultValue: `'HH:mm:ss'`,
  },
  { prop: 'interval', description: '主动指定刷新间隔', type: 'number', defaultValue: '自动推断' },
  {
    prop: 'onChange / onFinish',
    description: '监听剩余或累计时长变化，以及倒计时结束',
    type: 'function',
    defaultValue: '-',
  },
]

const StatDemo: FC = () => {
  const tabBasic = ref<TabMode>('preview')
  const tabItems = ref<TabMode>('preview')
  const tabFormat = ref<TabMode>('preview')
  const tabFormatter = ref<TabMode>('preview')
  const tabLoading = ref<TabMode>('preview')
  const tabTimer = ref<TabMode>('preview')
  const tabWithIcons = ref<TabMode>('preview')
  const tabGroup = ref<TabMode>('preview')
  const tabCentered = ref<TabMode>('preview')
  const tabVertical = ref<TabMode>('preview')
  const tabResponsive = ref<TabMode>('preview')
  const tabActions = ref<TabMode>('preview')

  const deadline = Date.now() + 1000 * 60 * 60 * 24 + 1000 * 30
  const startedAt = Date.now() - 1000 * 60 * 60 * 3 - 1000 * 12

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Stat 统计</h1>
        <p className="text-sm mt-3 mb-3">
          Stat 用于在一个块中展示数字与数据。组件保持 Rue 当前的 daisyUI
          视觉语气，同时提供数值格式化、前后缀、loading 与 timer 能力。
        </p>

        <h2>功能概览</h2>
        <ul>
          <li>支持 children 组合写法、items 数据驱动、图标头像、居中/纵向/响应式示例。</li>
          <li>
            支持 `Stat.Item` 语义化属性写法，常见场景不必再手写 `Stat.Title / Stat.Value /
            Stat.Desc`。
          </li>
          <li>
            支持数字格式化能力：`precision`、`groupSeparator`、`decimalSeparator`、`formatter`、`valueRender`。
          </li>
          <li>支持 `prefix`、`suffix`、`loading` 与 `Stat.Timer / Stat.Countdown`。</li>
        </ul>

        <ExampleBlock
          title="基础用法"
          summary="展示基础复合组件写法，适合完全自定义结构。"
          tab={tabBasic}
          code={basicCode}
          preview={() => (
            <Stat className="shadow">
              <Stat.Item>
                <Stat.Title>Total Page Views</Stat.Title>
                <Stat.Value>89,400</Stat.Value>
                <Stat.Desc>21% more than last month</Stat.Desc>
              </Stat.Item>
            </Stat>
          )}
        />

        <ExampleBlock
          title="数据驱动"
          summary="基础 items 数组能力保持，并自动支持新的 value/prefix/loading 等增强属性。"
          tab={tabItems}
          code={itemsCode}
          preview={() => <Stat items={statItems} className="shadow" />}
        />

        <ExampleBlock
          title="数值格式化"
          summary="通过 `value` + `precision` + `prefix/suffix` 直接得到接近业务组件的统计展示。"
          tab={tabFormat}
          code={formatCode}
          preview={() => (
            <Stat className="shadow">
              <Stat.Item
                title="GMV"
                value={112893}
                precision={2}
                prefix="$"
                suffix="USD"
                desc="格式化后的数值由 Value 自动处理"
              />
              <Stat.Item
                title="Success Rate"
                value={99.86}
                precision={2}
                suffix="%"
                valueClassName="text-success"
                desc="支持 0、精度和分组符"
              />
            </Stat>
          )}
        />

        <ExampleBlock
          title="Formatter 与 ValueRender"
          summary="`formatter` 负责值的映射，`valueRender` 负责值节点的包装。"
          tab={tabFormatter}
          code={formatterCode}
          preview={() => (
            <Stat className="shadow">
              <Stat.Item
                title="Requests"
                value={1280}
                prefix="API"
                formatter={value => `${value} req/s`}
                desc="formatter 适合把基础值映射成业务文案"
              />
              <Stat.Item>
                <Stat.Title>Storage</Stat.Title>
                <Stat.Value
                  value={24576}
                  suffix="GB"
                  valueRender={node => <span className="text-primary">{node}</span>}
                />
                <Stat.Desc>valueRender 可以包裹高亮节点</Stat.Desc>
              </Stat.Item>
            </Stat>
          )}
        />

        <ExampleBlock
          title="Loading 与零值"
          summary="loading 在 value 区域展示 skeleton；`0` 不会再被当成空值吞掉。"
          tab={tabLoading}
          code={loadingCode}
          preview={() => (
            <Stat className="shadow">
              <Stat.Item title="Sync Revenue" loading desc="数据回填前展示 skeleton 占位" />
              <Stat.Item
                title="Open Orders"
                value={0}
                suffix="items"
                desc="0 会正常渲染，不会被误判为空"
              />
            </Stat>
          )}
        />

        <ExampleBlock
          title="Timer / Countdown"
          summary="`Stat.Timer` 提供常见统计组件里的核心计时能力，`Stat.Countdown` 作为倒计时别名保持。"
          tab={tabTimer}
          code={timerCode}
          preview={() => (
            <Stat className="shadow">
              <Stat.Timer
                title="Campaign Countdown"
                value={deadline}
                suffix="left"
                desc="默认按 HH:mm:ss 渲染"
              />
              <Stat.Timer
                type="countup"
                title="Uptime"
                value={startedAt}
                format="H[h] m[m] s[s]"
                valueClassName="text-success"
                desc="type='countup' 适合累计时长"
              />
            </Stat>
          )}
        />

        <ExampleBlock
          title="带图标或头像"
          summary="整合基础示例，用于展示 figure 区的图标与头像承载能力。"
          tab={tabWithIcons}
          code={iconsCode}
          preview={() => (
            <Stat className="shadow">
              <Stat.Item>
                <Stat.Figure className="text-primary">
                  <HeartIcon />
                </Stat.Figure>
                <Stat.Title>Total Likes</Stat.Title>
                <Stat.Value className="text-primary">25.6K</Stat.Value>
                <Stat.Desc>21% more than last month</Stat.Desc>
              </Stat.Item>
              <Stat.Item>
                <Stat.Figure className="text-secondary">
                  <BoltIcon />
                </Stat.Figure>
                <Stat.Title>Page Views</Stat.Title>
                <Stat.Value className="text-secondary">2.6M</Stat.Value>
                <Stat.Desc>21% more than last month</Stat.Desc>
              </Stat.Item>
              <Stat.Item>
                <Stat.Figure className="text-secondary">
                  <Avatar status="online">
                    <div className="w-16 rounded-full">
                      <img
                        alt="Tailwind CSS stat example component"
                        src="https://img.daisyui.com/images/profile/demo/anakeen@192.webp"
                      />
                    </div>
                  </Avatar>
                </Stat.Figure>
                <Stat.Value>86%</Stat.Value>
                <Stat.Title>Tasks done</Stat.Title>
                <Stat.Desc className="text-secondary">31 tasks remaining</Stat.Desc>
              </Stat.Item>
            </Stat>
          )}
        />

        <ExampleBlock
          title="组合统计卡"
          summary="展示基础多列指标卡示例，适合运营面板和概览页。"
          tab={tabGroup}
          code={groupCode}
          preview={() => (
            <Stat className="shadow">
              <Stat.Item>
                <Stat.Figure className="text-secondary">
                  <InfoIcon />
                </Stat.Figure>
                <Stat.Title>Downloads</Stat.Title>
                <Stat.Value>31K</Stat.Value>
                <Stat.Desc>Jan 1st - Feb 1st</Stat.Desc>
              </Stat.Item>
              <Stat.Item>
                <Stat.Figure className="text-secondary">
                  <SlidersIcon />
                </Stat.Figure>
                <Stat.Title>New Users</Stat.Title>
                <Stat.Value>4,200</Stat.Value>
                <Stat.Desc>↗︎ 400 (22%)</Stat.Desc>
              </Stat.Item>
              <Stat.Item>
                <Stat.Figure className="text-secondary">
                  <PackageIcon />
                </Stat.Figure>
                <Stat.Title>New Registers</Stat.Title>
                <Stat.Value>1,200</Stat.Value>
                <Stat.Desc>↘︎ 90 (14%)</Stat.Desc>
              </Stat.Item>
            </Stat>
          )}
        />

        <ExampleBlock
          title="居中布局"
          summary="展示 `center` 演示，适合居中对齐的仪表盘摘要。"
          tab={tabCentered}
          code={centeredCode}
          preview={() => (
            <Stat className="shadow">
              <Stat.Item center>
                <Stat.Title>Downloads</Stat.Title>
                <Stat.Value>31K</Stat.Value>
                <Stat.Desc>From January 1st to February 1st</Stat.Desc>
              </Stat.Item>
              <Stat.Item center>
                <Stat.Title>Users</Stat.Title>
                <Stat.Value className="text-secondary">4,200</Stat.Value>
                <Stat.Desc className="text-secondary">↗︎ 40 (2%)</Stat.Desc>
              </Stat.Item>
              <Stat.Item center>
                <Stat.Title>New Registers</Stat.Title>
                <Stat.Value>1,200</Stat.Value>
                <Stat.Desc>↘︎ 90 (14%)</Stat.Desc>
              </Stat.Item>
            </Stat>
          )}
        />

        <ExampleBlock
          title="纵向布局"
          summary="展示 `direction='vertical'`，用于窄容器中的信息堆叠。"
          tab={tabVertical}
          code={verticalCode}
          preview={() => (
            <Stat direction="vertical" className="shadow">
              <Stat.Item>
                <Stat.Title>Downloads</Stat.Title>
                <Stat.Value>31K</Stat.Value>
                <Stat.Desc>Jan 1st - Feb 1st</Stat.Desc>
              </Stat.Item>
              <Stat.Item>
                <Stat.Title>New Users</Stat.Title>
                <Stat.Value>4,200</Stat.Value>
                <Stat.Desc>↗︎ 400 (22%)</Stat.Desc>
              </Stat.Item>
              <Stat.Item>
                <Stat.Title>New Registers</Stat.Title>
                <Stat.Value>1,200</Stat.Value>
                <Stat.Desc>↘︎ 90 (14%)</Stat.Desc>
              </Stat.Item>
            </Stat>
          )}
        />

        <ExampleBlock
          title="响应式布局"
          summary="展示基础 responsive 示例，小屏纵向，大屏横向。"
          tab={tabResponsive}
          code={responsiveCode}
          preview={() => (
            <Stat direction="vertical" className="shadow lg:stats-horizontal">
              <Stat.Item>
                <Stat.Title>Downloads</Stat.Title>
                <Stat.Value>31K</Stat.Value>
                <Stat.Desc>Jan 1st - Feb 1st</Stat.Desc>
              </Stat.Item>
              <Stat.Item>
                <Stat.Title>New Users</Stat.Title>
                <Stat.Value>4,200</Stat.Value>
                <Stat.Desc>↗︎ 400 (22%)</Stat.Desc>
              </Stat.Item>
              <Stat.Item>
                <Stat.Title>New Registers</Stat.Title>
                <Stat.Value>1,200</Stat.Value>
                <Stat.Desc>↘︎ 90 (14%)</Stat.Desc>
              </Stat.Item>
            </Stat>
          )}
        />

        <ExampleBlock
          title="带操作按钮"
          summary="展示基础按钮操作区示例，说明 Actions 仍可承载任意交互节点。"
          tab={tabActions}
          code={actionsCode}
          preview={() => (
            <Stat className="bg-base-100 border border-base-300">
              <Stat.Item>
                <Stat.Title>Account balance</Stat.Title>
                <Stat.Value>$89,400</Stat.Value>
                <Stat.Actions>
                  <Button color="success" size="xs">
                    Add funds
                  </Button>
                </Stat.Actions>
              </Stat.Item>
              <Stat.Item>
                <Stat.Title>Current balance</Stat.Title>
                <Stat.Value>$89,400</Stat.Value>
                <Stat.Actions>
                  <Button size="xs">Withdrawal</Button>
                  <Button size="xs">Deposit</Button>
                </Stat.Actions>
              </Stat.Item>
            </Stat>
          )}
        />

        <h2>API</h2>
        <h3>Stat</h3>
        <ApiTable rows={containerApiRows} />
        <h3>Stat.Item</h3>
        <ApiTable rows={itemApiRows} />
        <h3>Stat.Value</h3>
        <ApiTable rows={valueApiRows} />
        <h3>Stat.Timer / Stat.Countdown</h3>
        <ApiTable rows={timerApiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default StatDemo
