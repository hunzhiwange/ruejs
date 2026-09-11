import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Collapse, Tabs } from '@rue-js/design'
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
      <div>
        <h3 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># {title}</h3>
        {summary ? <p className="m-0 text-sm opacity-70">{summary}</p> : null}
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

const collapseApiRows: ApiRow[] = [
  {
    prop: 'items',
    description: '数据驱动的折叠面板列表',
    type: 'CollapseItem[]',
    defaultValue: '-',
  },
  {
    prop: 'activeKey',
    description: '受控展开项；accordion 模式下可传单值',
    type: 'string | number | Array<string | number>',
    defaultValue: '-',
  },
  {
    prop: 'defaultActiveKey',
    description: '非受控默认展开项',
    type: 'string | number | Array<string | number>',
    defaultValue: '-',
  },
  {
    prop: 'accordion',
    description: '是否只允许同时展开一项',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'bordered',
    description: '是否使用分组边框容器',
    type: 'boolean',
    defaultValue: 'items 模式默认 true',
  },
  { prop: 'ghost', description: '是否使用透明背景', type: 'boolean', defaultValue: 'false' },
  { prop: 'size', description: '标题与内容尺寸', type: "'sm' | 'md' | 'lg'", defaultValue: "'md'" },
  {
    prop: 'expandIconPlacement',
    description: '展开图标位置',
    type: "'start' | 'end'",
    defaultValue: "'end'",
  },
  {
    prop: 'onChange',
    description: 'items 模式切换时触发，返回下一个展开 key',
    type: '(nextValue, context) => void',
    defaultValue: '-',
  },
  {
    prop: 'tag',
    description: '支持基础写法的根标签切换',
    type: "'div' | 'details'",
    defaultValue: "'div'",
  },
]

const collapseItemApiRows: ApiRow[] = [
  { prop: 'key', description: '面板唯一标识', type: 'string | number', defaultValue: '索引值' },
  { prop: 'label', description: '标题内容，支持 title 别名', type: 'any', defaultValue: '-' },
  { prop: 'children', description: '面板内容，支持 content 别名', type: 'any', defaultValue: '-' },
  { prop: 'description', description: '标题下方的说明文案', type: 'any', defaultValue: '-' },
  { prop: 'extra', description: '标题右侧附加区域，不触发展开', type: 'any', defaultValue: '-' },
  { prop: 'showArrow', description: '是否显示展开图标', type: 'boolean', defaultValue: '继承父级' },
  {
    prop: 'collapsible',
    description: '触发区域控制',
    type: "'header' | 'icon' | 'disabled'",
    defaultValue: "'header'",
  },
  { prop: 'disabled', description: '禁用当前项交互', type: 'boolean', defaultValue: 'false' },
  { prop: 'open', description: '非受控初始展开', type: 'boolean', defaultValue: 'false' },
]

const CollapseDemo: FC = () => {
  const tabItemsBasic = ref<TabMode>('preview')
  const tabAccordion = ref<TabMode>('preview')
  const tabMeta = ref<TabMode>('preview')
  const tabPlacement = ref<TabMode>('preview')
  const tabGhost = ref<TabMode>('preview')
  const tabControlled = ref<TabMode>('preview')

  const tabFocus = ref<TabMode>('preview')
  const tabCheckbox = ref<TabMode>('preview')
  const tabDetails = ref<TabMode>('preview')
  const tabNoBorder = ref<TabMode>('preview')
  const tabArrow = ref<TabMode>('preview')
  const tabPlus = ref<TabMode>('preview')
  const tabIconStart = ref<TabMode>('preview')
  const tabOpen = ref<TabMode>('preview')
  const tabClose = ref<TabMode>('preview')
  const tabCustomFocus = ref<TabMode>('preview')
  const tabCustomCheckbox = ref<TabMode>('preview')

  const controlledKeys = ref<ReadonlyArray<string>>(['release'])
  const accordionKey = ref<string | null>('guide')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Collapse 折叠面板</h1>
        <p className="mt-3 mb-3 text-sm">
          使用 Rue 基础基于 daisyUI 的视觉语言，并在此基础上补充 `items`、accordion、
          `activeKey`、`extra`、`description`、尺寸与图标位置等增强能力。
        </p>

        <h2>语义 API</h2>
        <p className="text-sm opacity-80">
          优先面向 `items` 数据驱动用法，组织方式贴近常见业务组件，但使用 Rue 视觉风格。
        </p>

        <ExampleBlock
          title="Items 基础用法"
          summary="直接通过 items 渲染多项折叠面板，并默认使用带边框的分组容器。"
          tab={tabItemsBasic}
          preview={() => (
            <Collapse
              arrow
              defaultActiveKey={['overview']}
              items={[
                {
                  key: 'overview',
                  label: 'Overview',
                  children: '汇总版本亮点、上线范围与回滚策略，适合用作页面最上方的信息概览。',
                },
                {
                  key: 'release',
                  label: 'Release Checklist',
                  children: '确认灰度开关、日志埋点、告警阈值与发布窗口已经准备完毕。',
                },
                {
                  key: 'faq',
                  label: 'FAQ',
                  children: '常见问题、风险提示和升级说明也可以继续放进同一个折叠组。',
                },
              ]}
            />
          )}
          code={`<Collapse
  arrow
  defaultActiveKey={['overview']}
  items={[
    {
      key: 'overview',
      label: 'Overview',
      children: '汇总版本亮点、上线范围与回滚策略，适合用作页面最上方的信息概览。',
    },
    {
      key: 'release',
      label: 'Release Checklist',
      children: '确认灰度开关、日志埋点、告警阈值与发布窗口已经准备完毕。',
    },
    {
      key: 'faq',
      label: 'FAQ',
      children: '常见问题、风险提示和升级说明也可以继续放进同一个折叠组。',
    },
  ]}
/>`}
        />

        <ExampleBlock
          title="Accordion"
          summary="使用 accordion 改成一次只展开一项，并结合受控 key 管理当前面板。"
          tab={tabAccordion}
          preview={() => (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-sm" onClick={() => (accordionKey.value = 'guide')}>
                  打开 Guide
                </button>
                <button className="btn btn-sm" onClick={() => (accordionKey.value = 'api')}>
                  打开 API
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => (accordionKey.value = null)}
                >
                  全部收起
                </button>
              </div>
              <Collapse
                accordion
                plus
                activeKey={accordionKey.value}
                onChange={nextValue => (accordionKey.value = (nextValue as string | null) ?? null)}
                items={[
                  {
                    key: 'guide',
                    label: 'Migration Guide',
                    children: '梳理 breaking changes、默认行为差异与升级建议。',
                  },
                  {
                    key: 'api',
                    label: 'API Delta',
                    children: '列出属性变化与使用策略。',
                  },
                  {
                    key: 'qa',
                    label: 'QA Notes',
                    children: '补充测试范围、回归清单和已知限制。',
                  },
                ]}
              />
            </div>
          )}
          code={`const activeKey = ref<string | null>('guide')

<Collapse
  accordion
  plus
  activeKey={activeKey.value}
  onChange={nextValue => (activeKey.value = (nextValue as string | null) ?? null)}
  items={[
    {
      key: 'guide',
      label: 'Migration Guide',
      children: '梳理 breaking changes、默认行为差异与升级建议。',
    },
    {
      key: 'api',
      label: 'API Delta',
      children: '列出属性变化与使用策略。',
    },
    {
      key: 'qa',
      label: 'QA Notes',
      children: '补充测试范围、回归清单和已知限制。',
    },
  ]}
/>`}
        />

        <ExampleBlock
          title="描述与额外操作"
          summary="每一项可带 description、extra 和独立禁用状态，extra 区域点击不会触发展开。"
          tab={tabMeta}
          preview={() => (
            <Collapse
              arrow
              defaultActiveKey={['ops']}
              items={[
                {
                  key: 'ops',
                  label: 'Ops Console',
                  description: '控制发布节奏、灰度范围与告警阈值。',
                  extra: <span className="badge badge-soft badge-info">Beta</span>,
                  children: '适合放置运维策略、SLA 约束和异常回滚说明。',
                },
                {
                  key: 'billing',
                  label: 'Billing Center',
                  description: '当前模块仍在整理，暂不开放编辑。',
                  extra: <span className="badge badge-soft">Read only</span>,
                  disabled: true,
                  children: '禁用项会保持信息展示，但不响应交互。',
                },
              ]}
            />
          )}
          code={`<Collapse
  arrow
  defaultActiveKey={['ops']}
  items={[
    {
      key: 'ops',
      label: 'Ops Console',
      description: '控制发布节奏、灰度范围与告警阈值。',
      extra: <span className="badge badge-soft badge-info">Beta</span>,
      children: '适合放置运维策略、SLA 约束和异常回滚说明。',
    },
    {
      key: 'billing',
      label: 'Billing Center',
      description: '当前模块仍在整理，暂不开放编辑。',
      extra: <span className="badge badge-soft">Read only</span>,
      disabled: true,
      children: '禁用项会保持信息展示，但不响应交互。',
    },
  ]}
/>`}
        />

        <ExampleBlock
          title="图标位置与触发区域"
          summary="支持把图标放在左侧，并限制只有图标本身可触发开合。"
          tab={tabPlacement}
          preview={() => (
            <Collapse
              arrow
              expandIconPlacement="start"
              items={[
                {
                  key: 'deployment',
                  label: 'Deployment Window',
                  description: '只有左侧图标可点击，标题区更适合放长文本说明。',
                  collapsible: 'icon',
                  children: '当标题里还有链接、状态或操作说明时，这个模式会更稳妥。',
                },
                {
                  key: 'security',
                  label: 'Security Review',
                  description: '保持默认 header 触发，图标只是视觉反馈。',
                  children: '适合和 icon-only 模式混合使用。',
                },
              ]}
            />
          )}
          code={`<Collapse
  arrow
  expandIconPlacement="start"
  items={[
    {
      key: 'deployment',
      label: 'Deployment Window',
      description: '只有左侧图标可点击，标题区更适合放长文本说明。',
      collapsible: 'icon',
      children: '当标题里还有链接、状态或操作说明时，这个模式会更稳妥。',
    },
    {
      key: 'security',
      label: 'Security Review',
      description: '保持默认 header 触发，图标只是视觉反馈。',
      children: '适合和 icon-only 模式混合使用。',
    },
  ]}
/>`}
        />

        <ExampleBlock
          title="Ghost 与无边框"
          summary="不想用分组边框时，可以关闭 bordered，再按需开启 ghost。"
          tab={tabGhost}
          preview={() => (
            <Collapse
              arrow
              bordered={false}
              ghost
              className="space-y-3"
              defaultActiveKey={['design']}
              items={[
                {
                  key: 'design',
                  label: 'Design Tokens',
                  children: '透明背景更适合嵌在卡片、侧栏或深色容器中。',
                },
                {
                  key: 'theme',
                  label: 'Theme Sync',
                  children: '可继续叠加自定义类名，让容器完全交给外层布局控制。',
                },
              ]}
            />
          )}
          code={`<Collapse
  arrow
  bordered={false}
  ghost
  className="space-y-3"
  defaultActiveKey={['design']}
  items={[
    {
      key: 'design',
      label: 'Design Tokens',
      children: '透明背景更适合嵌在卡片、侧栏或深色容器中。',
    },
    {
      key: 'theme',
      label: 'Theme Sync',
      children: '可继续叠加自定义类名，让容器完全交给外层布局控制。',
    },
  ]}
/>`}
        />

        <ExampleBlock
          title="尺寸与受控多开"
          summary="size 会统一影响标题和内容尺寸；非 accordion 模式可同时展开多项。"
          tab={tabControlled}
          preview={() => (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-sm" onClick={() => (controlledKeys.value = ['release'])}>
                  仅展开 Release
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => (controlledKeys.value = ['release', 'notes'])}
                >
                  展开两项
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => (controlledKeys.value = [])}
                >
                  全部收起
                </button>
              </div>
              <Collapse
                plus
                size="lg"
                activeKey={controlledKeys.value}
                onChange={nextValue => (controlledKeys.value = (nextValue as string[]) ?? [])}
                items={[
                  {
                    key: 'release',
                    label: 'Release Plan',
                    children: '大尺寸适合在信息层级较重的管理页或文档页中使用。',
                  },
                  {
                    key: 'notes',
                    label: 'Release Notes',
                    children: '多开模式下可以把相邻的几块信息一起展开对照查看。',
                  },
                  {
                    key: 'rollback',
                    label: 'Rollback',
                    children: '受控模式更方便和 URL、筛选器或外部按钮联动。',
                  },
                ]}
              />
            </div>
          )}
          code={`const openKeys = ref<string[]>(['release'])

<Collapse
  plus
  size="lg"
  activeKey={openKeys.value}
  onChange={nextValue => (openKeys.value = (nextValue as string[]) ?? [])}
  items={[
    {
      key: 'release',
      label: 'Release Plan',
      children: '大尺寸适合在信息层级较重的管理页或文档页中使用。',
    },
    {
      key: 'notes',
      label: 'Release Notes',
      children: '多开模式下可以把相邻的几块信息一起展开对照查看。',
    },
    {
      key: 'rollback',
      label: 'Rollback',
      children: '受控模式更方便和 URL、筛选器或外部按钮联动。',
    },
  ]}
/>`}
        />

        <ExampleBlock
          title="Collapse with focus"
          summary="聚焦时展开、失焦时关闭，同时也支持重复点击标题切换开合。"
          tab={tabFocus}
          preview={() => (
            <Collapse tabIndex={0} className="bg-base-100 border border-base-300">
              <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
              <Collapse.Content className="text-sm">
                Click the "Sign Up" button in the top right corner and follow the registration
                process.
              </Collapse.Content>
            </Collapse>
          )}
          code={`<Collapse tabIndex={0} className="bg-base-100 border border-base-300">
  <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
  <Collapse.Content className="text-sm">
    Click the "Sign Up" button in the top right corner and follow the registration process.
  </Collapse.Content>
</Collapse>`}
        />

        <ExampleBlock
          title="Collapse with checkbox"
          summary="使用复选框控制展开与关闭，并支持重复点击标题切换。"
          tab={tabCheckbox}
          preview={() => (
            <Collapse className="bg-base-100 border border-base-300">
              <input type="checkbox" />
              <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
              <Collapse.Content className="text-sm">
                Click the "Sign Up" button in the top right corner and follow the registration
                process.
              </Collapse.Content>
            </Collapse>
          )}
          code={`<Collapse className="bg-base-100 border border-base-300">
  <input type="checkbox" />
  <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
  <Collapse.Content className="text-sm">
    Click the "Sign Up" button in the top right corner and follow the registration process.
  </Collapse.Content>
</Collapse>`}
        />

        <ExampleBlock
          title="Collapse using details and summary tag"
          summary="使用 details/summary 标签。"
          tab={tabDetails}
          preview={() => (
            <Collapse tag="details" className="bg-base-100 border border-base-300">
              <Collapse.Title as="summary" className="font-semibold">
                How do I create an account?
              </Collapse.Title>
              <Collapse.Content className="text-sm">
                Click the "Sign Up" button in the top right corner and follow the registration
                process.
              </Collapse.Content>
            </Collapse>
          )}
          code={`<Collapse tag="details" className="bg-base-100 border border-base-300">
  <Collapse.Title as="summary" className="font-semibold">
    How do I create an account?
  </Collapse.Title>
  <Collapse.Content className="text-sm">
    Click the "Sign Up" button in the top right corner and follow the registration process.
  </Collapse.Content>
</Collapse>`}
        />

        <ExampleBlock
          title="Without border and background color"
          tab={tabNoBorder}
          preview={() => (
            <Collapse tabIndex={0}>
              <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
              <Collapse.Content className="text-sm">
                Click the "Sign Up" button in the top right corner and follow the registration
                process.
              </Collapse.Content>
            </Collapse>
          )}
          code={`<Collapse tabIndex={0}>
  <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
  <Collapse.Content className="text-sm">
    Click the "Sign Up" button in the top right corner and follow the registration process.
  </Collapse.Content>
</Collapse>`}
        />

        <ExampleBlock
          title="With arrow icon"
          tab={tabArrow}
          preview={() => (
            <Collapse tabIndex={0} arrow className="bg-base-100 border border-base-300">
              <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
              <Collapse.Content className="text-sm">
                Click the "Sign Up" button in the top right corner and follow the registration
                process.
              </Collapse.Content>
            </Collapse>
          )}
          code={`<Collapse tabIndex={0} arrow className="bg-base-100 border border-base-300">
  <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
  <Collapse.Content className="text-sm">
    Click the "Sign Up" button in the top right corner and follow the registration process.
  </Collapse.Content>
</Collapse>`}
        />

        <ExampleBlock
          title="With plus/minus icon"
          tab={tabPlus}
          preview={() => (
            <Collapse tabIndex={0} plus className="bg-base-100 border border-base-300">
              <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
              <Collapse.Content className="text-sm">
                Click the "Sign Up" button in the top right corner and follow the registration
                process.
              </Collapse.Content>
            </Collapse>
          )}
          code={`<Collapse tabIndex={0} plus className="bg-base-100 border border-base-300">
  <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
  <Collapse.Content className="text-sm">
    Click the "Sign Up" button in the top right corner and follow the registration process.
  </Collapse.Content>
</Collapse>`}
        />

        <ExampleBlock
          title="Moving collapse icon to the start"
          summary="通过 utility 类移动图标位置，并保持标题区重复点击切换能力。"
          tab={tabIconStart}
          preview={() => (
            <Collapse tabIndex={0} arrow className="bg-base-100 border border-base-300">
              <Collapse.Title className="font-semibold after:start-5 after:end-auto pe-4 ps-12">
                How do I create an account?
              </Collapse.Title>
              <Collapse.Content className="text-sm">
                Click the "Sign Up" button in the top right corner and follow the registration
                process.
              </Collapse.Content>
            </Collapse>
          )}
          code={`<Collapse tabIndex={0} arrow className="bg-base-100 border border-base-300">
  <Collapse.Title className="font-semibold after:start-5 after:end-auto pe-4 ps-12">
    How do I create an account?
  </Collapse.Title>
  <Collapse.Content className="text-sm">
    Click the "Sign Up" button in the top right corner and follow the registration process.
  </Collapse.Content>
</Collapse>`}
        />

        <ExampleBlock
          title="Force open"
          tab={tabOpen}
          preview={() => (
            <Collapse tabIndex={0} open className="bg-base-100 border border-base-300">
              <Collapse.Title className="font-semibold">I have collapse-open class</Collapse.Title>
              <Collapse.Content className="text-sm">
                Click the "Sign Up" button in the top right corner and follow the registration
                process.
              </Collapse.Content>
            </Collapse>
          )}
          code={`<Collapse tabIndex={0} open className="bg-base-100 border border-base-300">
  <Collapse.Title className="font-semibold">I have collapse-open class</Collapse.Title>
  <Collapse.Content className="text-sm">
    Click the "Sign Up" button in the top right corner and follow the registration process.
  </Collapse.Content>
</Collapse>`}
        />

        <ExampleBlock
          title="Force close"
          tab={tabClose}
          preview={() => (
            <Collapse tabIndex={0} close className="bg-base-100 border border-base-300">
              <Collapse.Title className="font-semibold">I have collapse-close class</Collapse.Title>
              <Collapse.Content className="text-sm">
                Click the "Sign Up" button in the top right corner and follow the registration
                process.
              </Collapse.Content>
            </Collapse>
          )}
          code={`<Collapse tabIndex={0} close className="bg-base-100 border border-base-300">
  <Collapse.Title className="font-semibold">I have collapse-close class</Collapse.Title>
  <Collapse.Content className="text-sm">
    Click the "Sign Up" button in the top right corner and follow the registration process.
  </Collapse.Content>
</Collapse>`}
        />

        <ExampleBlock
          title="Custom colors for collapse that works with focus"
          summary="通过 focus 触发颜色变化。"
          tab={tabCustomFocus}
          preview={() => (
            <Collapse
              tabIndex={0}
              className="bg-primary text-primary-content focus:bg-secondary focus:text-secondary-content"
            >
              <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
              <Collapse.Content className="text-sm">
                Click the "Sign Up" button in the top right corner and follow the registration
                process.
              </Collapse.Content>
            </Collapse>
          )}
          code={`<Collapse
  tabIndex={0}
  className="bg-primary text-primary-content focus:bg-secondary focus:text-secondary-content"
>
  <Collapse.Title className="font-semibold">How do I create an account?</Collapse.Title>
  <Collapse.Content className="text-sm">
    Click the "Sign Up" button in the top right corner and follow the registration process.
  </Collapse.Content>
</Collapse>`}
        />

        <ExampleBlock
          title="Custom colors for collapse that works with checkbox"
          summary="通过 peer/peer-checked 触发颜色变化，并支持重复点击标题切换。"
          tab={tabCustomCheckbox}
          preview={() => (
            <Collapse className="bg-base-100 border border-base-300">
              <input type="checkbox" className="peer" />
              <Collapse.Title className="bg-primary text-primary-content peer-checked:bg-secondary peer-checked:text-secondary-content font-semibold">
                How do I create an account?
              </Collapse.Title>
              <Collapse.Content className="bg-primary text-primary-content peer-checked:bg-secondary peer-checked:text-secondary-content text-sm">
                Click the "Sign Up" button in the top right corner and follow the registration
                process.
              </Collapse.Content>
            </Collapse>
          )}
          code={`<Collapse className="bg-base-100 border border-base-300">
  <input type="checkbox" className="peer" />
  <Collapse.Title className="bg-primary text-primary-content peer-checked:bg-secondary peer-checked:text-secondary-content font-semibold">
    How do I create an account?
  </Collapse.Title>
  <Collapse.Content className="bg-primary text-primary-content peer-checked:bg-secondary peer-checked:text-secondary-content text-sm">
    Click the "Sign Up" button in the top right corner and follow the registration process.
  </Collapse.Content>
</Collapse>`}
        />

        <h2>API</h2>
        <h3>Collapse</h3>
        <ApiTable rows={collapseApiRows} />
        <h3>CollapseItem</h3>
        <ApiTable rows={collapseItemApiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default CollapseDemo
