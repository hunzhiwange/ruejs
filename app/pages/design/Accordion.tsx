import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Accordion, Tabs } from '@rue-js/design'
type TabMode = 'preview' | 'code'
type StageKey = 'plan' | 'build' | 'ship'
type StageValue = StageKey | null

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

interface FaqEntry {
  key: string
  title: string
  content: string
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
          { key: 'code', label: 'TSX代码' },
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

const faqEntries: FaqEntry[] = [
  {
    key: 'account',
    title: 'How do I create an account?',
    content:
      'Click the "Sign Up" button in the top right corner and follow the registration process.',
  },
  {
    key: 'password',
    title: 'I forgot my password. What should I do?',
    content:
      'Click on "Forgot Password" on the login page and follow the instructions sent to your email.',
  },
  {
    key: 'profile',
    title: 'How do I update my profile information?',
    content: 'Go to "My Account" settings and select "Edit Profile" to make changes.',
  },
]

const capabilityCards = [
  {
    title: 'Children 组合',
    desc: '保持 Accordion.Title / Accordion.Content，用于局部定制标题和内容。',
  },
  {
    title: 'Items 驱动',
    desc: '直接用 items 写标题、描述、额外信息和禁用态，适合后台配置页。',
  },
  {
    title: '受控状态',
    desc: '通过 activeKey、openKeys、onChange 接管当前展开项。',
  },
  {
    title: '两种语义',
    desc: '默认 radio 风格适合单开；details 适合保持可搜索内容与原生语义。',
  },
]

const accordionApiRows: ApiRow[] = [
  {
    prop: 'activeKey',
    description: 'items 模式下的受控单开 key',
    type: 'string | number | null',
    defaultValue: '-',
  },
  {
    prop: 'className',
    description: '追加到每个 Accordion 根节点的类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'collapsible',
    description: '单开模式下允许把当前面板再次折叠',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'contentClassName',
    description: 'items 模式下统一追加到内容区域的类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'defaultActiveKey',
    description: 'items 模式下的非受控默认单开 key',
    type: 'string | number | null',
    defaultValue: '-',
  },
  {
    prop: 'defaultOpen',
    description: 'children 模式下的非受控默认展开状态',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'defaultOpenKeys',
    description: 'items 模式下的非受控默认多开 keys',
    type: 'Array<string | number>',
    defaultValue: '-',
  },
  {
    prop: 'disabled',
    description: '禁用整个 Accordion 或当前 items 组的交互',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'force',
    description: '强制视觉保持展开或收起，优先级高于 open 与 items 状态',
    type: `'open' | 'close'`,
    defaultValue: '-',
  },
  {
    prop: 'icon',
    description: '标题右侧的内置指示样式',
    type: `'arrow' | 'plus'`,
    defaultValue: '-',
  },
  {
    prop: 'items',
    description: '数据驱动渲染方式，适合 FAQ、配置面板和后台列表',
    type: 'AccordionDataItem[]',
    defaultValue: '-',
  },
  {
    prop: 'multiple',
    description: '允许同时展开多个 items；radio 形态会切为 checkbox 行为',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'name',
    description: '分组名；radio 与 details 语义都会复用这个名称',
    type: 'string',
    defaultValue: '自动生成',
  },
  {
    prop: 'onChange',
    description: 'items 模式下的开合回调；单开返回 key，多开返回 keys',
    type: '(value, context) => void',
    defaultValue: '-',
  },
  {
    prop: 'onToggle',
    description: 'children 模式下的单项开合回调',
    type: '(open, context) => void',
    defaultValue: '-',
  },
  {
    prop: 'open',
    description: 'children 模式下的受控展开状态',
    type: 'boolean',
    defaultValue: '-',
  },
  {
    prop: 'openKeys',
    description: 'items 模式下的受控多开 keys',
    type: 'Array<string | number>',
    defaultValue: '-',
  },
  {
    prop: 'titleClassName',
    description: 'items 模式下统一追加到标题区域的类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'use',
    description: '切换 radio 或 details 两种结构输出',
    type: `'radio' | 'details'`,
    defaultValue: `'radio'`,
  },
]

const itemApiRows: ApiRow[] = [
  {
    prop: 'className',
    description: '追加到当前 item 根节点的类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'content',
    description: '折叠区内容',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'contentClassName',
    description: '内容区域类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'description',
    description: '标题下的补充说明文字',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'descriptionClassName',
    description: '说明文字类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'disabled',
    description: '禁用当前 item 交互',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'extra',
    description: '标题行右侧的补充信息，可用于状态标记或数字',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'extraClassName',
    description: '额外信息区域类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'force',
    description: '对单个 item 单独强制展开或收起',
    type: `'open' | 'close'`,
    defaultValue: '-',
  },
  {
    prop: 'icon',
    description: '覆盖全局 icon 设置',
    type: `'arrow' | 'plus'`,
    defaultValue: '-',
  },
  {
    prop: 'key',
    description: '推荐显式提供的稳定标识，用于 activeKey / openKeys 匹配',
    type: 'string | number',
    defaultValue: 'index',
  },
  {
    prop: 'open',
    description: '非受控模式下的默认展开状态',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'title',
    description: '标题区域内容',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'titleClassName',
    description: '标题区域类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'use',
    description: '覆盖全局 use 设置',
    type: `'radio' | 'details'`,
    defaultValue: '-',
  },
]

const renderFaqGroup = (
  name: string,
  options?: {
    use?: 'radio' | 'details'
    icon?: 'arrow' | 'plus'
    collapsible?: boolean
    itemClassName?: string
    containerClassName?: string
  },
) => {
  return (
    <div className={options?.containerClassName ?? 'grid gap-3'}>
      {faqEntries.map((item, index) => (
        <Accordion
          key={`${name}-${item.key}`}
          name={name}
          use={options?.use}
          icon={options?.icon}
          collapsible={options?.collapsible}
          className={options?.itemClassName ?? 'bg-base-100 border border-base-300'}
          defaultOpen={index === 0}
        >
          <Accordion.Title
            as={options?.use === 'details' ? 'summary' : 'div'}
            className="font-semibold"
          >
            {item.title}
          </Accordion.Title>
          <Accordion.Content className="text-sm opacity-80">{item.content}</Accordion.Content>
        </Accordion>
      ))}
    </div>
  )
}

const AccordionDemo: FC = () => {
  const tabRadio = ref<TabMode>('preview')
  const tabDetails = ref<TabMode>('preview')
  const tabControlled = ref<TabMode>('preview')
  const tabMultiple = ref<TabMode>('preview')
  const tabRich = ref<TabMode>('preview')
  const tabArrow = ref<TabMode>('preview')
  const tabPlus = ref<TabMode>('preview')
  const tabJoin = ref<TabMode>('preview')
  const tabArrayRadio = ref<TabMode>('preview')
  const tabArrayDetails = ref<TabMode>('preview')
  const controlledKey = ref<StageValue>('build')
  const lastChanged = ref<StageValue>('build')

  const roadmapItems = [
    {
      key: 'plan',
      title: 'Plan backlog',
      description: '先确定优先级，再安排设计和开发',
      extra: 'Sprint 12',
      content:
        'Collect the most urgent requirements, align on edge cases, and freeze the delivery order before implementation starts.',
    },
    {
      key: 'build',
      title: 'Build feature slice',
      description: '把 API、交互和回归验证收敛到同一轮里',
      extra: 'In progress',
      content:
        'Ship the smallest useful slice first, then expandDemos and tests around the verified behavior instead of guessing a broad design up front.',
    },
    {
      key: 'ship',
      title: 'Ship and monitor',
      description: '发布后持续看告警、埋点和反馈',
      extra: 'Ready',
      content:
        'After release, keep an eye on error rate, support feedback and adoption signals so the next iteration has concrete evidence.',
    },
  ]

  const faqItemsCode = `const items = [
  {
    key: 'account',
    title: 'How do I create an account?',
    content: 'Click the "Sign Up" button in the top right corner and follow the registration process.',
    open: true,
  },
  {
    key: 'password',
    title: 'I forgot my password. What should I do?',
    content: 'Click on "Forgot Password" on the login page and follow the instructions sent to your email.',
  },
  {
    key: 'profile',
    title: 'How do I update my profile information?',
    content: 'Go to "My Account" settings and select "Edit Profile" to make changes.',
  },
]`

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Accordion 手风琴</h1>
        <p className="text-sm mt-3 mb-3">
          Accordion 现在使用 Rue 基础的轻量视觉风格，但 API 不再只是静态包装。你可以用
          <code> Accordion.Title </code>和<code> Accordion.Content </code>
          组合单个面板，也可以直接用
          <code> items </code>
          走数据驱动，接入受控 key、多开、禁用和富标题信息。
        </p>

        <h2>何时使用</h2>
        <ul>
          <li>需要 FAQ、设置说明、任务面板这类“标题 + 可折叠内容”的信息组织方式。</li>
          <li>需要在单开和多开之间切换，或把当前展开项接到页面状态里。</li>
          <li>需要在标题里补充状态、说明、标签，而不想为每个面板手写结构。</li>
          <li>
            需要让浏览器能搜索折叠内容时，使用 <code>use="details"</code>。
          </li>
        </ul>

        <div className="not-prose my-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {capabilityCards.map(card => (
            <div key={card.title} className="card border border-base-300 bg-base-100 shadow-sm">
              <div className="card-body gap-2 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-base-content/50">
                  Capability
                </div>
                <div className="text-sm font-semibold">{card.title}</div>
                <p className="m-0 text-sm opacity-70">{card.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <ExampleBlock
          title="Accordion using radio inputs"
          summary="展示单开分组，同时额外开启 collapsible，方便在文档页里反复点按查看开合状态。"
          tab={tabRadio}
          preview={() => renderFaqGroup('accordion-radio-demo', { collapsible: true })}
          code={`<Accordion className="bg-base-100 border border-base-300" name="accordion-radio-demo" defaultOpen collapsible>
  <Accordion.Title className="font-semibold">How do I create an account?</Accordion.Title>
  <Accordion.Content className="text-sm opacity-80">
    Click the "Sign Up" button in the top right corner and follow the registration process.
  </Accordion.Content>
</Accordion>
<Accordion className="bg-base-100 border border-base-300" name="accordion-radio-demo" collapsible>
  <Accordion.Title className="font-semibold">I forgot my password. What should I do?</Accordion.Title>
  <Accordion.Content className="text-sm opacity-80">
    Click on "Forgot Password" on the login page and follow the instructions sent to your email.
  </Accordion.Content>
</Accordion>
<Accordion className="bg-base-100 border border-base-300" name="accordion-radio-demo" collapsible>
  <Accordion.Title className="font-semibold">How do I update my profile information?</Accordion.Title>
  <Accordion.Content className="text-sm opacity-80">
    Go to "My Account" settings and select "Edit Profile" to make changes.
  </Accordion.Content>
</Accordion>`}
        />

        <ExampleBlock
          title="Accordion using details"
          summary="展示 details 结构，适合需要原生语义和浏览器搜索能力的内容区。"
          tab={tabDetails}
          preview={() => renderFaqGroup('accordion-details-demo', { use: 'details' })}
          code={`<Accordion use="details" className="bg-base-100 border border-base-300" name="accordion-details-demo" defaultOpen>
  <Accordion.Title as="summary" className="font-semibold">How do I create an account?</Accordion.Title>
  <Accordion.Content className="text-sm opacity-80">
    Click the "Sign Up" button in the top right corner and follow the registration process.
  </Accordion.Content>
</Accordion>
<Accordion use="details" className="bg-base-100 border border-base-300" name="accordion-details-demo">
  <Accordion.Title as="summary" className="font-semibold">I forgot my password. What should I do?</Accordion.Title>
  <Accordion.Content className="text-sm opacity-80">
    Click on "Forgot Password" on the login page and follow the instructions sent to your email.
  </Accordion.Content>
</Accordion>
<Accordion use="details" className="bg-base-100 border border-base-300" name="accordion-details-demo">
  <Accordion.Title as="summary" className="font-semibold">How do I update my profile information?</Accordion.Title>
  <Accordion.Content className="text-sm opacity-80">
    Go to "My Account" settings and select "Edit Profile" to make changes.
  </Accordion.Content>
</Accordion>`}
        />

        <ExampleBlock
          title="Controlled active key"
          summary="受控模式同样支持 collapsible；点击已展开项时，activeKey 会回到 null。"
          tab={tabControlled}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <div className="flex flex-wrap gap-2">
                  {roadmapItems.map(item => (
                    <button
                      key={item.key}
                      className={`btn btn-sm ${controlledKey.value === item.key ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => {
                        const nextKey =
                          controlledKey.value === item.key ? null : (item.key as StageKey)
                        controlledKey.value = nextKey
                        lastChanged.value = nextKey
                      }}
                    >
                      切换 {item.title}
                    </button>
                  ))}
                </div>
                <div className="grid gap-2 rounded-box border border-base-300 bg-base-200/40 p-3 text-sm">
                  <div>
                    当前 <code>activeKey</code>：<code>{controlledKey.value ?? 'null'}</code>
                  </div>
                  <div>
                    最近一次切换：<code>{lastChanged.value ?? 'null'}</code>
                  </div>
                </div>
                <Accordion
                  activeKey={controlledKey.value}
                  collapsible
                  icon="arrow"
                  className="bg-base-100 border border-base-300"
                  items={roadmapItems}
                  onChange={nextValue => {
                    const nextKey = Array.isArray(nextValue)
                      ? (nextValue[0] as StageKey | undefined)
                      : (nextValue as StageKey | null)
                    controlledKey.value = nextKey ?? null
                    lastChanged.value = nextKey ?? null
                  }}
                />
              </div>
            </div>
          )}
          code={`import { ref } from '@rue-js/rue'

type StageKey = 'plan' | 'build' | 'ship'

const controlledKey = ref<StageKey | null>('build')
const items = [
  {
    key: 'plan',
    title: 'Plan backlog',
    description: '先确定优先级，再安排设计和开发',
    extra: 'Sprint 12',
    content: 'Collect the most urgent requirements, align on edge cases, and freeze the delivery order before implementation starts.',
  },
  {
    key: 'build',
    title: 'Build feature slice',
    description: '把 API、交互和回归验证收敛到同一轮里',
    extra: 'In progress',
    content: 'Ship the smallest useful slice first, then expandDemos and tests around the verified behavior instead of guessing a broad design up front.',
  },
  {
    key: 'ship',
    title: 'Ship and monitor',
    description: '发布后持续看告警、埋点和反馈',
    extra: 'Ready',
    content: 'After release, keep an eye on error rate, support feedback and adoption signals so the next iteration has concrete evidence.',
  },
]

<Accordion
  activeKey={controlledKey.value}
  collapsible
  icon="arrow"
  className="bg-base-100 border border-base-300"
  items={items}
  onChange={nextValue => {
    const nextKey = Array.isArray(nextValue)
      ? (nextValue[0] as StageKey | undefined)
      : (nextValue as StageKey | null)
    controlledKey.value = nextKey ?? null
  }}
/>`}
        />

        <ExampleBlock
          title="Multiple open panels"
          summary="multiple 与 defaultOpenKeys 可同时展开多个项；同一 API 也能配合 collapsible 做可收起单项。"
          tab={tabMultiple}
          preview={() => (
            <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body gap-4">
                  <div className="alert alert-soft">
                    <span className="text-sm">
                      multiple 会把 radio 形态切到 checkbox 行为，适合筛选条件或调试面板。
                    </span>
                  </div>
                  <Accordion
                    multiple
                    icon="arrow"
                    className="bg-base-100 border border-base-300"
                    defaultOpenKeys={['latency', 'cache']}
                    items={[
                      {
                        key: 'latency',
                        title: 'Latency budget',
                        description: '页面首屏与接口预算放在同一个地方追踪',
                        extra: '120ms',
                        content:
                          'Track server timing, render budget and hydration cost together so regressions can be located quickly.',
                      },
                      {
                        key: 'cache',
                        title: 'Cache strategy',
                        description: '缓存命中率和失效策略分开说明',
                        extra: 'Warm',
                        content:
                          'Document what can stay stale, what must be revalidated, and how to handle cache busting during deployments.',
                      },
                      {
                        key: 'rollback',
                        title: 'Rollback checklist',
                        description: '提供快速回滚路径，避免线上排障时再找人',
                        extra: 'Ops',
                        content:
                          'Keep a minimal rollback playbook near the release notes so the on-call engineer can act without extra context switching.',
                      },
                    ]}
                  />
                </div>
              </div>
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body gap-4">
                  <div>
                    <h3 className="m-0 text-base font-semibold">Single but collapsible</h3>
                    <p className="mt-2 mb-0 text-sm opacity-70">
                      不想强制保持一个展开项时，可以给 children 模式加 <code>collapsible</code>。
                    </p>
                  </div>
                  <Accordion
                    collapsible
                    defaultOpen
                    className="bg-base-100 border border-base-300"
                    icon="plus"
                  >
                    <Accordion.Title className="font-semibold">
                      Can I close the last open panel?
                    </Accordion.Title>
                    <Accordion.Content className="text-sm opacity-80">
                      Yes. Set <code>collapsible</code> to allow toggling the current panel off
                      instead of forcing one active item.
                    </Accordion.Content>
                  </Accordion>
                </div>
              </div>
            </div>
          )}
          code={`<Accordion
  multiple
  icon="arrow"
  className="bg-base-100 border border-base-300"
  defaultOpenKeys={['latency', 'cache']}
  items={[
    {
      key: 'latency',
      title: 'Latency budget',
      description: '页面首屏与接口预算放在同一个地方追踪',
      extra: '120ms',
      content: 'Track server timing, render budget and hydration cost together so regressions can be located quickly.',
    },
    {
      key: 'cache',
      title: 'Cache strategy',
      description: '缓存命中率和失效策略分开说明',
      extra: 'Warm',
      content: 'Document what can stay stale, what must be revalidated, and how to handle cache busting during deployments.',
    },
    {
      key: 'rollback',
      title: 'Rollback checklist',
      description: '提供快速回滚路径，避免线上排障时再找人',
      extra: 'Ops',
      content: 'Keep a minimal rollback playbook near the release notes so the on-call engineer can act without extra context switching.',
    },
  ]}
/>

<Accordion collapsible defaultOpen className="bg-base-100 border border-base-300" icon="plus">
  <Accordion.Title className="font-semibold">Can I close the last open panel?</Accordion.Title>
  <Accordion.Content className="text-sm opacity-80">
    Yes. Set <code>collapsible</code> to allow toggling the current panel off instead of forcing one active item.
  </Accordion.Content>
</Accordion>`}
        />

        <ExampleBlock
          title="Rich item metadata"
          summary="description、extra 和 disabled 适合后台列表、规则说明和版本发布面板。"
          tab={tabRich}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <Accordion
                  collapsible
                  icon="arrow"
                  className="bg-base-100 border border-base-300"
                  items={[
                    {
                      key: 'review',
                      title: 'Review dependencies',
                      description: '上线前再核对一次依赖差异和风险说明',
                      extra: <span className="badge badge-warning badge-outline">Review</span>,
                      open: true,
                      content:
                        'Compare the dependency diff with the last release baseline, and record whether each update changes runtime behavior or only build tooling.',
                    },
                    {
                      key: 'announce',
                      title: 'Prepare release notes',
                      description: '把用户可感知的变化浓缩成 changelog 和公告文案',
                      extra: <span className="badge badge-success badge-outline">Ready</span>,
                      content:
                        'Write the changelog from the user perspective first, then attach migration hints or rollout notes only when they affect adoption.',
                    },
                    {
                      key: 'ops',
                      title: 'Ops handoff',
                      description: '值班同学确认回滚路径与观测指标后才能执行',
                      extra: <span className="badge badge-ghost">Waiting</span>,
                      disabled: true,
                      content:
                        'This item is intentionally disabled to show how a non-interactive operational gate can still stay visible in the stack.',
                    },
                  ]}
                />
              </div>
            </div>
          )}
          code={`<Accordion
          collapsible
  icon="arrow"
  className="bg-base-100 border border-base-300"
  items={[
    {
      key: 'review',
      title: 'Review dependencies',
      description: '上线前再核对一次依赖差异和风险说明',
      extra: <span className="badge badge-warning badge-outline">Review</span>,
      open: true,
      content: 'Compare the dependency diff with the last release baseline, and record whether each update changes runtime behavior or only build tooling.',
    },
    {
      key: 'announce',
      title: 'Prepare release notes',
      description: '把用户可感知的变化浓缩成 changelog 和公告文案',
      extra: <span className="badge badge-success badge-outline">Ready</span>,
      content: 'Write the changelog from the user perspective first, then attach migration hints or rollout notes only when they affect adoption.',
    },
    {
      key: 'ops',
      title: 'Ops handoff',
      description: '值班同学确认回滚路径与观测指标后才能执行',
      extra: <span className="badge badge-ghost">Waiting</span>,
      disabled: true,
      content: 'This item is intentionally disabled to show how a non-interactive operational gate can still stay visible in the stack.',
    },
  ]}
/>`}
        />

        <ExampleBlock
          title="Accordion with arrow icon"
          summary="展示 arrow 指示样式，并开启 collapsible，方便直接验证箭头开合反馈。"
          tab={tabArrow}
          preview={() =>
            renderFaqGroup('accordion-arrow-demo', { icon: 'arrow', collapsible: true })
          }
          code={`<Accordion icon="arrow" className="bg-base-100 border border-base-300" name="accordion-arrow-demo" defaultOpen collapsible>
  <Accordion.Title className="font-semibold">How do I create an account?</Accordion.Title>
  <Accordion.Content className="text-sm opacity-80">
    Click the "Sign Up" button in the top right corner and follow the registration process.
  </Accordion.Content>
</Accordion>
<Accordion icon="arrow" className="bg-base-100 border border-base-300" name="accordion-arrow-demo" collapsible>
  <Accordion.Title className="font-semibold">I forgot my password. What should I do?</Accordion.Title>
  <Accordion.Content className="text-sm opacity-80">
    Click on "Forgot Password" on the login page and follow the instructions sent to your email.
  </Accordion.Content>
</Accordion>
<Accordion icon="arrow" className="bg-base-100 border border-base-300" name="accordion-arrow-demo" collapsible>
  <Accordion.Title className="font-semibold">How do I update my profile information?</Accordion.Title>
  <Accordion.Content className="text-sm opacity-80">
    Go to "My Account" settings and select "Edit Profile" to make changes.
  </Accordion.Content>
</Accordion>`}
        />

        <ExampleBlock
          title="Accordion with plus/minus icon"
          summary="展示 plus/minus 方案，并开启 collapsible，方便直接验证开合反馈。"
          tab={tabPlus}
          preview={() => renderFaqGroup('accordion-plus-demo', { icon: 'plus', collapsible: true })}
          code={`<Accordion icon="plus" className="bg-base-100 border border-base-300" name="accordion-plus-demo" defaultOpen collapsible>
  <Accordion.Title className="font-semibold">How do I create an account?</Accordion.Title>
  <Accordion.Content className="text-sm opacity-80">
    Click the "Sign Up" button in the top right corner and follow the registration process.
  </Accordion.Content>
</Accordion>
<Accordion icon="plus" className="bg-base-100 border border-base-300" name="accordion-plus-demo" collapsible>
  <Accordion.Title className="font-semibold">I forgot my password. What should I do?</Accordion.Title>
  <Accordion.Content className="text-sm opacity-80">
    Click on "Forgot Password" on the login page and follow the instructions sent to your email.
  </Accordion.Content>
</Accordion>
<Accordion icon="plus" className="bg-base-100 border border-base-300" name="accordion-plus-demo" collapsible>
  <Accordion.Title className="font-semibold">How do I update my profile information?</Accordion.Title>
  <Accordion.Content className="text-sm opacity-80">
    Go to "My Account" settings and select "Edit Profile" to make changes.
  </Accordion.Content>
</Accordion>`}
        />

        <ExampleBlock
          title="Using Accordion and Join together"
          summary="展示 join 组合方式，并开启 collapsible，方便连续边框场景下反复验证开合。"
          tab={tabJoin}
          preview={() => (
            <div className="join join-vertical bg-base-100">
              {faqEntries.map((item, index) => (
                <Accordion
                  key={`join-${item.key}`}
                  icon="arrow"
                  collapsible
                  className="join-item border border-base-300"
                  name="accordion-join-demo"
                  defaultOpen={index === 0}
                >
                  <Accordion.Title className="font-semibold">{item.title}</Accordion.Title>
                  <Accordion.Content className="text-sm opacity-80">
                    {item.content}
                  </Accordion.Content>
                </Accordion>
              ))}
            </div>
          )}
          code={`<div className="join join-vertical bg-base-100">
  <Accordion icon="arrow" className="join-item border border-base-300" name="accordion-join-demo" defaultOpen collapsible>
    <Accordion.Title className="font-semibold">How do I create an account?</Accordion.Title>
    <Accordion.Content className="text-sm opacity-80">
      Click the "Sign Up" button in the top right corner and follow the registration process.
    </Accordion.Content>
  </Accordion>
  <Accordion icon="arrow" className="join-item border border-base-300" name="accordion-join-demo" collapsible>
    <Accordion.Title className="font-semibold">I forgot my password. What should I do?</Accordion.Title>
    <Accordion.Content className="text-sm opacity-80">
      Click on "Forgot Password" on the login page and follow the instructions sent to your email.
    </Accordion.Content>
  </Accordion>
  <Accordion icon="arrow" className="join-item border border-base-300" name="accordion-join-demo" collapsible>
    <Accordion.Title className="font-semibold">How do I update my profile information?</Accordion.Title>
    <Accordion.Content className="text-sm opacity-80">
      Go to "My Account" settings and select "Edit Profile" to make changes.
    </Accordion.Content>
  </Accordion>
</div>`}
        />

        <ExampleBlock
          title="Accordion using items array (radio)"
          summary="展示 items 数组写法，并开启 collapsible，方便直接验证数据驱动下的收起逻辑。"
          tab={tabArrayRadio}
          preview={() => (
            <Accordion
              collapsible
              className="bg-base-100 border border-base-300"
              name="accordion-array-radio-demo"
              items={faqEntries.map((item, index) => ({
                key: item.key,
                title: item.title,
                content: item.content,
                open: index === 0,
              }))}
            />
          )}
          code={`${faqItemsCode}

<Accordion
  collapsible
  className="bg-base-100 border border-base-300"
  name="accordion-array-radio-demo"
  items={items}
/>`}
        />

        <ExampleBlock
          title="Accordion using items array (details)"
          summary="展示 details + items 组合；现在它也能继续叠加 description、extra 和 disabled。"
          tab={tabArrayDetails}
          preview={() => (
            <Accordion
              use="details"
              className="bg-base-100 border border-base-300"
              name="accordion-array-details-demo"
              items={faqEntries.map((item, index) => ({
                key: item.key,
                title: item.title,
                content: item.content,
                open: index === 0,
              }))}
            />
          )}
          code={`${faqItemsCode}

<Accordion
  use="details"
  className="bg-base-100 border border-base-300"
  name="accordion-array-details-demo"
  items={items}
/>`}
        />

        <h2 id="accordion-api">API</h2>
        <p>
          Accordion 现在分成两套用法：children 模式适合局部排版，items 模式适合数据驱动和受控状态。
          两套模式共用同一套视觉类名，因此重组示例时通常只需要把结构收敛到更清晰的语义层。
        </p>

        <h3>Accordion Props</h3>
        <ApiTable rows={accordionApiRows} />

        <h3 className="mt-6">AccordionDataItem</h3>
        <ApiTable rows={itemApiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default AccordionDemo
