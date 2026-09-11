import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Dock, Tabs } from '@rue-js/design'
type TabMode = 'preview' | 'code'
type DockKey = 'home' | 'inbox' | 'settings' | 'profile'

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

const DockStage: FC<{ children?: any; className?: string }> = ({ children, className }) => {
  return (
    <div className={`bg-base-300 rounded-box w-full max-w-sm pt-32 ${className ?? ''}`.trim()}>
      {children}
    </div>
  )
}

const HomeIcon = () => (
  <svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
    <path stroke="currentColor" strokeWidth="2" d="M2 11.5 12 3l10 8.5" />
    <path stroke="currentColor" strokeWidth="2" d="M5 10.5V21h14V10.5" />
    <path stroke="currentColor" strokeWidth="2" d="M10 21v-5h4v5" />
  </svg>
)

const InboxIcon = () => (
  <svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
    <path stroke="currentColor" strokeWidth="2" d="M4 14h4l2 3h4l2-3h4" />
  </svg>
)

const SettingsIcon = () => (
  <svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    <path
      stroke="currentColor"
      strokeWidth="2"
      d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.7-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.7 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2h.1a1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .7.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1v.1a1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.7Z"
    />
  </svg>
)

const ProfileIcon = () => (
  <svg className="size-[1.2em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
    <path stroke="currentColor" strokeWidth="2" d="M5 20a7 7 0 0 1 14 0" />
  </svg>
)

const createNavItems = () => [
  { key: 'home', icon: <HomeIcon />, label: 'Home' },
  { key: 'inbox', icon: <InboxIcon />, label: 'Inbox' },
  { key: 'settings', icon: <SettingsIcon />, label: 'Settings' },
]

const createSizeItems = () => [
  { icon: <HomeIcon /> },
  { icon: <InboxIcon /> },
  { icon: <SettingsIcon /> },
]

const createSizeItemsWithLabel = () => [
  { icon: <HomeIcon />, label: 'Home' },
  { icon: <InboxIcon />, label: 'Inbox' },
  { icon: <SettingsIcon />, label: 'Settings' },
]

const dockApiRows: ApiRow[] = [
  {
    prop: 'as',
    description: '根节点语义，可直接输出 div 或 nav',
    type: `'div' | 'nav'`,
    defaultValue: `'div'`,
  },
  {
    prop: 'size',
    description: 'Dock 尺寸，支持 xs-xl 与 small / middle / large 别名',
    type: `'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'middle' | 'medium' | 'large'`,
    defaultValue: '-',
  },
  {
    prop: 'items',
    description: '数据驱动渲染，每项可配置 key、icon、label、href、disabled 等',
    type: 'DockItemData[]',
    defaultValue: '-',
  },
  {
    prop: 'activeIndex',
    description: '支持基础的受控索引写法',
    type: 'number',
    defaultValue: '-',
  },
  {
    prop: 'defaultActiveIndex',
    description: '索引模式下的默认选中项',
    type: 'number',
    defaultValue: '-',
  },
  {
    prop: 'activeKey',
    description: '推荐的受控选中 key',
    type: 'string | number | null',
    defaultValue: '-',
  },
  {
    prop: 'defaultActiveKey',
    description: '推荐的非受控默认 key',
    type: 'string | number | null',
    defaultValue: '-',
  },
  {
    prop: 'onChange',
    description: '索引变化回调，保持回调签名，同时附带上下文',
    type: '(index, context) => void',
    defaultValue: '-',
  },
  {
    prop: 'onSelect',
    description: 'key 变化回调，适合导航场景',
    type: '(key, context) => void',
    defaultValue: '-',
  },
  {
    prop: 'className',
    description: '附加到 dock 根节点的类名',
    type: 'string',
    defaultValue: '-',
  },
]

const dockItemApiRows: ApiRow[] = [
  {
    prop: 'as',
    description: '单项渲染标签，可选 button、a、div',
    type: `'button' | 'a' | 'div'`,
    defaultValue: `'button'`,
  },
  {
    prop: 'active',
    description: '激活态，追加 dock-active',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'disabled',
    description: '禁用单项；链接和 div 也会输出禁用语义',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'href / target / rel',
    description: '链接语义；target="_blank" 时会自动补充 rel',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'htmlType',
    description: 'button 根节点时的原生 type',
    type: `'button' | 'submit' | 'reset'`,
    defaultValue: `'button'`,
  },
  {
    prop: 'ariaLabel',
    description: '仅图标项时可补充可访问名称',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'className',
    description: '附加到单项根节点的类名',
    type: 'string',
    defaultValue: '-',
  },
]

const itemsSchemaRows: ApiRow[] = [
  {
    prop: 'key',
    description: '数据驱动模式下的唯一标识，供 activeKey / onSelect 使用',
    type: 'string | number',
    defaultValue: 'index',
  },
  {
    prop: 'icon',
    description: '图标节点',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'label',
    description: '标签节点，会自动包裹为 Dock.Label',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'iconClassName / labelClassName',
    description: '分别控制图标容器与标签的附加样式',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'onClick',
    description: '单项点击回调，签名为 (event, context) => void',
    type: 'function',
    defaultValue: '-',
  },
  {
    prop: 'disabled',
    description: '禁用当前项，保持当前视觉但阻止交互',
    type: 'boolean',
    defaultValue: 'false',
  },
]

const DockDemo: FC = () => {
  const tabBasic = ref<TabMode>('preview')
  const tabKeyed = ref<TabMode>('preview')
  const tabComposition = ref<TabMode>('preview')
  const tabSizes = ref<TabMode>('preview')
  const tabCustom = ref<TabMode>('preview')
  const tabAuto = ref<TabMode>('preview')

  const activeBasic = ref(1)
  const activeKeyed = ref<DockKey>('inbox')
  const activeComposition = ref<'overview' | 'activity' | 'profile'>('activity')
  const activeCustom = ref(1)
  const activeAuto = ref<DockKey>('inbox')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Dock 底部栏</h1>
        <p className="text-sm mt-3 mb-3">
          Dock 用来承载移动端底部导航和轻量操作入口。当前组件保持 Rue
          自己的视觉基底，同时补上更顺手的导航 API：可以用 <code>activeIndex</code>
          ，也可以切到更语义化的 <code>activeKey</code> /<code>onSelect</code> 模式。
        </p>

        <h2>何时使用</h2>
        <ul>
          <li>需要一个固定在底部的轻量导航，让用户在 3 到 5 个主入口之间快速切换。</li>
          <li>需要同时支持基础的索引式控制和新的 key 式控制。</li>
          <li>需要在同一套视觉里混合按钮、链接、禁用项和自定义 children。</li>
        </ul>

        <ExampleBlock
          title="基础导航"
          summary="展示基础 Dock 演示，可以使用 activeIndex 控制。"
          tab={tabBasic}
          preview={() => (
            <DockStage>
              <Dock
                className="relative border border-base-300"
                items={createNavItems()}
                activeIndex={activeBasic.value}
                onChange={index => (activeBasic.value = index)}
              />
            </DockStage>
          )}
          code={`const active = ref(1)

<Dock
  className="relative border border-base-300"
  items={[
    { key: 'home', icon: <HomeIcon />, label: 'Home' },
    { key: 'inbox', icon: <InboxIcon />, label: 'Inbox' },
    { key: 'settings', icon: <SettingsIcon />, label: 'Settings' },
  ]}
  activeIndex={active.value}
  onChange={index => (active.value = index)}
/>`}
        />

        <ExampleBlock
          title="Key 模式与禁用项"
          summary="activeKey / onSelect 更适合导航语义，items 里也可以直接声明 disabled、href 和 target。"
          tab={tabKeyed}
          preview={() => (
            <div className="space-y-4">
              <div className="not-prose text-sm opacity-70">
                当前选中：<code>{activeKeyed.value}</code>
              </div>
              <DockStage>
                <Dock
                  as="nav"
                  aria-label="Workspace sections"
                  className="relative border border-base-300"
                  activeKey={activeKeyed.value}
                  onSelect={key => (activeKeyed.value = key as DockKey)}
                  items={[
                    { key: 'home', icon: <HomeIcon />, label: 'Home' },
                    { key: 'inbox', icon: <InboxIcon />, label: 'Inbox' },
                    { key: 'settings', icon: <SettingsIcon />, label: 'Settings', disabled: true },
                    {
                      key: 'profile',
                      as: 'a',
                      href: 'https://ruejs.org',
                      target: '_blank',
                      icon: <ProfileIcon />,
                      label: 'Docs',
                      labelClassName: 'text-[0.7rem]',
                    },
                  ]}
                />
              </DockStage>
            </div>
          )}
          code={`const activeKey = ref<'home' | 'inbox' | 'settings' | 'profile'>('inbox')

<Dock
  as="nav"
  aria-label="Workspace sections"
  className="relative border border-base-300"
  activeKey={activeKey.value}
  onSelect={key => (activeKey.value = key as typeof activeKey.value)}
  items={[
    { key: 'home', icon: <HomeIcon />, label: 'Home' },
    { key: 'inbox', icon: <InboxIcon />, label: 'Inbox' },
    { key: 'settings', icon: <SettingsIcon />, label: 'Settings', disabled: true },
    { key: 'profile', as: 'a', href: 'https://ruejs.org', target: '_blank', icon: <ProfileIcon />, label: 'Docs' },
  ]}
/>`}
        />

        <ExampleBlock
          title="组合写法与根节点"
          summary="支持 Dock.Item / Dock.Label 组合；当需要更细粒度结构时，children 写法更直接。"
          tab={tabComposition}
          preview={() => (
            <div className="space-y-4">
              <div className="not-prose text-sm opacity-70">
                当前区块：<code>{activeComposition.value}</code>
              </div>
              <DockStage className="max-w-md">
                <Dock
                  as="nav"
                  aria-label="Project sections"
                  className="relative border border-base-300"
                >
                  <Dock.Item
                    as="a"
                    href="#dock-api"
                    active={activeComposition.value === 'overview'}
                    onClick={() => (activeComposition.value = 'overview')}
                  >
                    <HomeIcon />
                    <Dock.Label>Overview</Dock.Label>
                  </Dock.Item>
                  <Dock.Item
                    active={activeComposition.value === 'activity'}
                    onClick={() => (activeComposition.value = 'activity')}
                  >
                    <InboxIcon />
                    <Dock.Label>Activity</Dock.Label>
                  </Dock.Item>
                  <Dock.Item
                    as="div"
                    active={activeComposition.value === 'profile'}
                    onClick={() => (activeComposition.value = 'profile')}
                  >
                    <ProfileIcon />
                    <Dock.Label>Profile</Dock.Label>
                  </Dock.Item>
                  <Dock.Item disabled ariaLabel="暂不可用">
                    <SettingsIcon />
                    <Dock.Label className="opacity-60">Locked</Dock.Label>
                  </Dock.Item>
                </Dock>
              </DockStage>
            </div>
          )}
          code={`const active = ref<'overview' | 'activity' | 'profile'>('activity')

<Dock as="nav" aria-label="Project sections" className="relative border border-base-300">
  <Dock.Item as="a" href="#dock-api" active={active.value === 'overview'} onClick={() => (active.value = 'overview')}>
    <HomeIcon />
    <Dock.Label>Overview</Dock.Label>
  </Dock.Item>
  <Dock.Item active={active.value === 'activity'} onClick={() => (active.value = 'activity')}>
    <InboxIcon />
    <Dock.Label>Activity</Dock.Label>
  </Dock.Item>
  <Dock.Item as="div" active={active.value === 'profile'} onClick={() => (active.value = 'profile')}>
    <ProfileIcon />
    <Dock.Label>Profile</Dock.Label>
  </Dock.Item>
  <Dock.Item disabled ariaLabel="暂不可用">
    <SettingsIcon />
    <Dock.Label className="opacity-60">Locked</Dock.Label>
  </Dock.Item>
</Dock>`}
        />

        <ExampleBlock
          title="尺寸体系"
          summary="展示 xs / sm / md / lg / xl 演示，并把它们重组到一个尺寸对照区。"
          tab={tabSizes}
          preview={() => (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-2">
                <div className="not-prose text-xs font-medium uppercase tracking-[0.2em] opacity-60">
                  Extra Small
                </div>
                <DockStage>
                  <Dock
                    size="xs"
                    className="relative border border-base-300"
                    items={createSizeItems()}
                    defaultActiveIndex={1}
                  />
                </DockStage>
              </div>
              <div className="space-y-2">
                <div className="not-prose text-xs font-medium uppercase tracking-[0.2em] opacity-60">
                  Small
                </div>
                <DockStage>
                  <Dock
                    size="sm"
                    className="relative border border-base-300"
                    items={createSizeItems()}
                    defaultActiveIndex={1}
                  />
                </DockStage>
              </div>
              <div className="space-y-2">
                <div className="not-prose text-xs font-medium uppercase tracking-[0.2em] opacity-60">
                  Medium
                </div>
                <DockStage>
                  <Dock
                    size="md"
                    className="relative border border-base-300"
                    items={createSizeItemsWithLabel()}
                    defaultActiveIndex={1}
                  />
                </DockStage>
              </div>
              <div className="space-y-2">
                <div className="not-prose text-xs font-medium uppercase tracking-[0.2em] opacity-60">
                  Large
                </div>
                <DockStage>
                  <Dock
                    size="lg"
                    className="relative border border-base-300"
                    items={createSizeItemsWithLabel()}
                    defaultActiveIndex={1}
                  />
                </DockStage>
              </div>
              <div className="space-y-2 xl:col-span-2">
                <div className="not-prose text-xs font-medium uppercase tracking-[0.2em] opacity-60">
                  Extra Large
                </div>
                <DockStage>
                  <Dock
                    size="xl"
                    className="relative border border-base-300"
                    items={createSizeItemsWithLabel()}
                    defaultActiveIndex={1}
                  />
                </DockStage>
              </div>
            </div>
          )}
          code={`<Dock size="xs" className="relative border border-base-300" items={[{ icon: <HomeIcon /> }, { icon: <InboxIcon /> }, { icon: <SettingsIcon /> }]} defaultActiveIndex={1} />
<Dock size="sm" className="relative border border-base-300" items={[{ icon: <HomeIcon /> }, { icon: <InboxIcon /> }, { icon: <SettingsIcon /> }]} defaultActiveIndex={1} />
<Dock size="md" className="relative border border-base-300" items={[{ icon: <HomeIcon />, label: 'Home' }, { icon: <InboxIcon />, label: 'Inbox' }, { icon: <SettingsIcon />, label: 'Settings' }]} defaultActiveIndex={1} />
<Dock size="lg" className="relative border border-base-300" items={[{ icon: <HomeIcon />, label: 'Home' }, { icon: <InboxIcon />, label: 'Inbox' }, { icon: <SettingsIcon />, label: 'Settings' }]} defaultActiveIndex={1} />
<Dock size="xl" className="relative border border-base-300" items={[{ icon: <HomeIcon />, label: 'Home' }, { icon: <InboxIcon />, label: 'Inbox' }, { icon: <SettingsIcon />, label: 'Settings' }]} defaultActiveIndex={1} />`}
        />

        <ExampleBlock
          title="自定义外观"
          summary="展示自定义色示例。Dock 不强行定义额外主题 API，仍然优先通过 className 融入业务表面层。"
          tab={tabCustom}
          preview={() => (
            <DockStage>
              <Dock className="relative bg-neutral text-neutral-content">
                <Dock.Item
                  active={activeCustom.value === 0}
                  onClick={() => (activeCustom.value = 0)}
                >
                  <HomeIcon />
                  <Dock.Label>Home</Dock.Label>
                </Dock.Item>
                <Dock.Item
                  active={activeCustom.value === 1}
                  onClick={() => (activeCustom.value = 1)}
                >
                  <InboxIcon />
                  <Dock.Label>Inbox</Dock.Label>
                </Dock.Item>
                <Dock.Item
                  active={activeCustom.value === 2}
                  onClick={() => (activeCustom.value = 2)}
                >
                  <SettingsIcon />
                  <Dock.Label>Settings</Dock.Label>
                </Dock.Item>
              </Dock>
            </DockStage>
          )}
          code={`const active = ref(1)

<Dock className="relative bg-neutral text-neutral-content">
  <Dock.Item active={active.value === 0} onClick={() => (active.value = 0)}>
    <HomeIcon />
    <Dock.Label>Home</Dock.Label>
  </Dock.Item>
  <Dock.Item active={active.value === 1} onClick={() => (active.value = 1)}>
    <InboxIcon />
    <Dock.Label>Inbox</Dock.Label>
  </Dock.Item>
  <Dock.Item active={active.value === 2} onClick={() => (active.value = 2)}>
    <SettingsIcon />
    <Dock.Label>Settings</Dock.Label>
  </Dock.Item>
</Dock>`}
        />

        <ExampleBlock
          title="Dock 自动渲染（items 数组）"
          summary="展示 items 数组示例，并组织为 key 驱动、默认值和项级类名都可直接声明。"
          tab={tabAuto}
          preview={() => (
            <div className="space-y-4">
              <div className="not-prose text-sm opacity-70">
                当前 key：<code>{activeAuto.value}</code>
              </div>
              <DockStage>
                <Dock
                  as="nav"
                  aria-label="Mobile app dock"
                  className="relative border border-base-300"
                  activeKey={activeAuto.value}
                  onSelect={key => (activeAuto.value = key as DockKey)}
                  items={[
                    { key: 'home', icon: <HomeIcon />, label: 'Home' },
                    {
                      key: 'inbox',
                      icon: <InboxIcon />,
                      label: 'Inbox',
                      labelClassName: 'font-medium',
                    },
                    { key: 'settings', icon: <SettingsIcon />, label: 'Settings' },
                  ]}
                />
              </DockStage>
            </div>
          )}
          code={`const activeKey = ref<'home' | 'inbox' | 'settings'>('inbox')

<Dock
  as="nav"
  aria-label="Mobile app dock"
  className="relative border border-base-300"
  activeKey={activeKey.value}
  onSelect={key => (activeKey.value = key as typeof activeKey.value)}
  items={[
    { key: 'home', icon: <HomeIcon />, label: 'Home' },
    { key: 'inbox', icon: <InboxIcon />, label: 'Inbox', labelClassName: 'font-medium' },
    { key: 'settings', icon: <SettingsIcon />, label: 'Settings' },
  ]}
/>`}
        />

        <h2 id="dock-api">API</h2>
        <p>当前页面展示的是 Dock 在 Rue 里的推荐用法与可用能力。</p>

        <h3>Dock</h3>
        <ApiTable rows={dockApiRows} />

        <h3>Dock.Item</h3>
        <ApiTable rows={dockItemApiRows} />

        <h3>items 项配置</h3>
        <ApiTable rows={itemsSchemaRows} />

        <div className="not-prose mt-6 rounded-box border border-base-300 bg-base-100 p-4">
          <h3 className="mt-0 mb-3 text-base font-semibold">推荐使用顺序</h3>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <div>
              <code>items + activeKey + onSelect</code>：适合页面导航
            </div>
            <div>
              <code>items + activeIndex + onChange</code>：适合支持项目代码
            </div>
            <div>
              <code>children + Dock.Item</code>：适合复杂结构和混合根节点
            </div>
            <div>
              <code>className</code>：负责和业务表面层融合颜色与边框
            </div>
          </div>
        </div>

        <h2>FAQ</h2>

        <h3>activeKey 和 activeIndex 应该优先选哪个？</h3>
        <p>
          新页面建议优先用 <code>activeKey</code>
          ，因为它更贴近导航语义，也更方便和路由、菜单数据对齐。
          如果你当前已经是索引式状态，可以使用 <code>activeIndex</code> 也没有问题。
        </p>

        <h3>什么时候用 items，什么时候用 Dock.Item？</h3>
        <p>
          结构规整、希望统一从数据渲染时，优先用 <code>items</code>
          。如果单项内部结构更复杂，或者需要同时混用
          <code>a</code>、<code>button</code>、<code>div</code>，就直接用 <code>Dock.Item</code>。
        </p>

        <h3>为什么没有额外提供 tone / variant 这类视觉 API？</h3>
        <p>
          Dock 更像布局型导航容器，视觉通常要贴合页面表面层一起定。这里优先补的是导航和交互语义，让
          <code>className</code> 继续承担颜色与背景融合，避免把视觉层做得过重。
        </p>
      </div>
    </SidebarPlayground>
  )
}

export default DockDemo
