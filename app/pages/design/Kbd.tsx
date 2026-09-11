import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Kbd, Tabs } from '@rue-js/design'
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

const shortcutExamples = [
  {
    label: '打开命令面板',
    description: '推荐使用 items 直接表达组合键。',
    keys: ['⌘', 'K'],
  },
  {
    label: '全局搜索',
    description: '使用 Rue 的键帽视觉，同时让组合表达更直接。',
    keys: ['⌘', '⇧', 'F'],
  },
  {
    label: '快速提交',
    description: '对象项可以单独控制某个键帽的 className。',
    keys: [{ label: 'Ctrl' }, { label: 'Enter', className: 'min-w-16 text-center' }],
  },
] as const

const keyboardRows = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', '/'],
] as const

const apiRows: ApiRow[] = [
  {
    prop: 'as',
    description: '指定根节点标签；单键模式默认渲染 kbd，组合模式默认渲染 span',
    type: 'any',
    defaultValue: '单键为 `kbd`，组合为 `span`',
  },
  {
    prop: 'children',
    description: '单键模式内容，也可作为 Kbd.Group 的自定义内容',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'className',
    description: '根节点扩展类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'direction',
    description: 'Kbd.Group 布局方向，适合快捷键列表等垂直排布场景',
    type: '`horizontal` | `vertical`',
    defaultValue: '`horizontal`',
  },
  {
    prop: 'gap',
    description: 'Kbd.Group / Kbd.Combo 的间距预设',
    type: '`xs` | `sm` | `md` | `lg`',
    defaultValue: '`sm`',
  },
  {
    prop: 'itemClassName',
    description: '组合模式下给每个键帽统一追加类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'items',
    description: '组合模式数据源；可传基础值，也可传带 size/className 的对象',
    type: 'Array<any | { key?: string | number; label?: any; children?: any; size?: KbdSize; className?: string }>',
    defaultValue: '-',
  },
  {
    prop: 'separator',
    description: '组合模式分隔符；默认是 `+`，可传自定义节点或 `null`',
    type: 'any',
    defaultValue: '`+`',
  },
  {
    prop: 'separatorClassName',
    description: '组合模式下给分隔符统一追加类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'size',
    description: '键帽尺寸，支持 xs 到 xl，以及 small / middle / medium / large 别名',
    type: '`xs` | `sm` | `md` | `lg` | `xl` | `small` | `middle` | `medium` | `large`',
    defaultValue: '-',
  },
  {
    prop: 'wrap',
    description: '组合模式是否允许自动换行',
    type: 'boolean',
    defaultValue: 'false',
  },
]

const KbdDemo: FC = () => {
  const tabRecommended = ref<TabMode>('preview')
  const tabGroup = ref<TabMode>('preview')
  const tabSizes = ref<TabMode>('preview')
  const tabInline = ref<TabMode>('preview')
  const tabBasic = ref<TabMode>('preview')
  const tabLegacyCombo = ref<TabMode>('preview')
  const tabFunction = ref<TabMode>('preview')
  const tabKeyboard = ref<TabMode>('preview')
  const tabArrows = ref<TabMode>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Kbd 键盘提示</h1>
        <p className="text-sm mt-3 mb-3">
          Kbd 可以使用 Rue 当前的键帽视觉风格，并补上更适合实际场景的组合键 API。现在既可以写
          <code>{` <Kbd>K</Kbd> `}</code>，也可以直接用 <code>items</code> 或 <code>Kbd.Group</code>
          组织快捷键序列。
        </p>

        <h2>何时使用</h2>
        <ul>
          <li>需要展示单个按键、组合键或快捷键列表。</li>
          <li>希望可以使用 Rue 当前键帽视觉，但让组合表达更语义化、更容易复用。</li>
          <li>需要在设计页里同时保持静态示例和更贴近真实产品的快捷键场景。</li>
        </ul>

        <ExampleBlock
          key="recommended"
          title="推荐写法"
          summary="根组件直接接收 items，适合大多数快捷键展示场景。"
          tab={tabRecommended}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-3">
                {shortcutExamples.map(item => (
                  <div
                    key={item.label}
                    className="flex flex-col gap-3 rounded-box border border-base-300 bg-base-50 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-sm opacity-70">{item.description}</div>
                    </div>
                    <Kbd items={item.keys} />
                  </div>
                ))}
              </div>
            </div>
          )}
          code={`const shortcuts = [
  { label: '打开命令面板', keys: ['⌘', 'K'] },
  { label: '全局搜索', keys: ['⌘', '⇧', 'F'] },
  {
    label: '快速提交',
    keys: [{ label: 'Ctrl' }, { label: 'Enter', className: 'min-w-16 text-center' }],
  },
] as const

{shortcuts.map(item => (
  <div key={item.label} className="flex items-center justify-between">
    <span>{item.label}</span>
    <Kbd items={item.keys} />
  </div>
))}`}
        />

        <ExampleBlock
          key="group"
          title="组合子组件"
          summary="Kbd.Combo 负责键序列，Kbd.Group 负责布局容器，Kbd.Separator 负责分隔符外观。"
          tab={tabGroup}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-5">
                <div className="flex flex-wrap items-center gap-4">
                  <Kbd.Combo items={['⌘', '⇧', 'P']} />
                  <Kbd.Combo
                    items={['G', 'I']}
                    separator={<Kbd.Separator className="font-semibold">/</Kbd.Separator>}
                  />
                  <Kbd.Combo
                    wrap
                    itemClassName="min-w-10 text-center"
                    items={['Ctrl', 'Alt', 'Shift', 'Delete']}
                  />
                </div>
                <div className="rounded-box border border-dashed border-base-300 p-4">
                  <div className="mb-2 text-xs font-medium uppercase tracking-[0.2em] opacity-60">
                    Command Palette
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="opacity-70">Press</span>
                    <Kbd.Combo
                      items={['⌘', 'K']}
                      separator={<Kbd.Separator className="opacity-50">then</Kbd.Separator>}
                    />
                    <span className="opacity-70">to focus search</span>
                  </div>
                </div>
                <div className="rounded-box border border-base-300 p-4">
                  <div className="mb-3 text-xs font-medium uppercase tracking-[0.2em] opacity-60">
                    Shortcut List
                  </div>
                  <Kbd.Group direction="vertical" gap="xs" className="items-start">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="w-28 opacity-70">New file</span>
                      <Kbd.Combo items={['⌘', 'N']} size="sm" />
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="w-28 opacity-70">Duplicate line</span>
                      <Kbd.Combo items={['⌥', '⇧', '↓']} size="sm" />
                    </div>
                  </Kbd.Group>
                </div>
              </div>
            </div>
          )}
          code={`<Kbd.Combo items={['⌘', '⇧', 'P']} />

<Kbd.Combo
  items={['G', 'I']}
  separator={<Kbd.Separator>/</Kbd.Separator>}
/>

<Kbd.Combo
  wrap
  itemClassName="min-w-10 text-center"
  items={['Ctrl', 'Alt', 'Shift', 'Delete']}
/>

<Kbd.Group direction="vertical" gap="xs" className="items-start">
  <div className="flex items-center gap-3">
    <span>New file</span>
    <Kbd.Combo items={['⌘', 'N']} size="sm" />
  </div>
</Kbd.Group>`}
        />

        <ExampleBlock
          key="sizes"
          title="尺寸体系"
          summary="展示基础 sizeDemo，并额外补上更顺手的语义尺寸别名。"
          tab={tabSizes}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-5">
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-[0.2em] opacity-60">
                    Daisy 尺寸
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Kbd size="xs">Xsmall</Kbd>
                    <Kbd size="sm">Small</Kbd>
                    <Kbd size="md">Medium</Kbd>
                    <Kbd size="lg">Large</Kbd>
                    <Kbd size="xl">Xlarge</Kbd>
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-[0.2em] opacity-60">
                    语义别名
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Kbd size="small">Small</Kbd>
                    <Kbd size="middle">Middle</Kbd>
                    <Kbd size="medium">Medium</Kbd>
                    <Kbd size="large">Large</Kbd>
                  </div>
                </div>
              </div>
            </div>
          )}
          code={`<Kbd size="xs">Xsmall</Kbd>
<Kbd size="sm">Small</Kbd>
<Kbd size="md">Medium</Kbd>
<Kbd size="lg">Large</Kbd>
<Kbd size="xl">Xlarge</Kbd>

<Kbd size="small">Small</Kbd>
<Kbd size="middle">Middle</Kbd>
<Kbd size="medium">Medium</Kbd>
<Kbd size="large">Large</Kbd>`}
        />

        <ExampleBlock
          key="inline"
          title="文本内嵌"
          summary="展示基础 in textDemo，用于行文中的单键强调。"
          tab={tabInline}
          preview={() => (
            <span>
              Press <Kbd size="sm">F</Kbd> to pay respects.
            </span>
          )}
          code={`<span>Press <Kbd size="sm">F</Kbd> to pay respects.</span>`}
        />

        <ExampleBlock
          key="basic"
          title="基础单键"
          summary="展示基础示例，写法完全不变。"
          tab={tabBasic}
          preview={() => <Kbd>K</Kbd>}
          code={`<Kbd>K</Kbd>`}
        />

        <ExampleBlock
          key="legacy-combo"
          title="组合键"
          summary="展示基础 key combinationDemo，并与新 API 共存。"
          tab={tabLegacyCombo}
          preview={() => (
            <div className="flex items-center gap-2">
              <Kbd>ctrl</Kbd> + <Kbd>shift</Kbd> + <Kbd>del</Kbd>
            </div>
          )}
          code={`<Kbd>ctrl</Kbd> + <Kbd>shift</Kbd> + <Kbd>del</Kbd>`}
        />

        <ExampleBlock
          key="function"
          title="功能键"
          summary="展示基础 function keysDemo。"
          tab={tabFunction}
          preview={() => (
            <div className="flex gap-2 items-center">
              <Kbd>⌘</Kbd>
              <Kbd>⌥</Kbd>
              <Kbd>⇧</Kbd>
              <Kbd>⌃</Kbd>
            </div>
          )}
          code={`<Kbd>⌘</Kbd>
<Kbd>⌥</Kbd>
<Kbd>⇧</Kbd>
<Kbd>⌃</Kbd>`}
        />

        <ExampleBlock
          key="keyboard"
          title="完整键盘"
          summary="展示基础 full keyboardDemo，说明 Kbd 仍然适合自由布局。"
          tab={tabKeyboard}
          preview={() => (
            <div className="overflow-x-auto">
              {keyboardRows.map((row, rowIndex) => (
                <div key={rowIndex} className="mb-1 flex w-full justify-center gap-1">
                  {row.map(key => (
                    <Kbd key={key}>{key}</Kbd>
                  ))}
                </div>
              ))}
            </div>
          )}
          code={`<div className="overflow-x-auto">
  <div className="flex justify-center gap-1 w-full mb-1">
    <Kbd>q</Kbd><Kbd>w</Kbd><Kbd>e</Kbd><Kbd>r</Kbd><Kbd>t</Kbd><Kbd>y</Kbd><Kbd>u</Kbd><Kbd>i</Kbd><Kbd>o</Kbd><Kbd>p</Kbd>
  </div>
  <div className="flex justify-center gap-1 w-full mb-1">
    <Kbd>a</Kbd><Kbd>s</Kbd><Kbd>d</Kbd><Kbd>f</Kbd><Kbd>g</Kbd><Kbd>h</Kbd><Kbd>j</Kbd><Kbd>k</Kbd><Kbd>l</Kbd>
  </div>
  <div className="flex justify-center gap-1 w-full mb-1">
    <Kbd>z</Kbd><Kbd>x</Kbd><Kbd>c</Kbd><Kbd>v</Kbd><Kbd>b</Kbd><Kbd>n</Kbd><Kbd>m</Kbd><Kbd>/</Kbd>
  </div>
</div>`}
        />

        <ExampleBlock
          key="arrows"
          title="方向键"
          summary="展示基础 arrow keysDemo。"
          tab={tabArrows}
          preview={() => (
            <div>
              <div className="flex justify-center w-full">
                <Kbd>▲</Kbd>
              </div>
              <div className="flex justify-center gap-12 w-full">
                <Kbd>◀︎</Kbd>
                <Kbd>▶︎</Kbd>
              </div>
              <div className="flex justify-center w-full">
                <Kbd>▼</Kbd>
              </div>
            </div>
          )}
          code={`<div className="flex justify-center w-full"><Kbd>▲</Kbd></div>
<div className="flex justify-center gap-12 w-full"><Kbd>◀︎</Kbd><Kbd>▶︎</Kbd></div>
<div className="flex justify-center w-full"><Kbd>▼</Kbd></div>`}
        />

        <h2 id="kbd-api">API</h2>
        <p>当前页面展示的是 Kbd 根组件与组合模式的完整可用 API。</p>

        <ApiTable rows={apiRows} />

        <div className="not-prose mt-6 rounded-box border border-base-300 bg-base-100 p-4">
          <h3 className="mt-0 mb-3 text-base font-semibold">复合子组件</h3>
          <div className="grid gap-2 text-sm md:grid-cols-3">
            <div>
              <code>Kbd.Combo</code>：显式渲染组合键序列，适合控制 <code>separator</code>、
              <code>wrap</code> 和<code>itemClassName</code>。
            </div>
            <div>
              <code>Kbd.Group</code>：显式渲染布局容器，适合用 <code>direction</code> 和{' '}
              <code>gap</code>
              组织多条快捷键。
            </div>
            <div>
              <code>Kbd.Separator</code>：默认输出带弱化样式的分隔符，内容默认是 <code>+</code>
              ，也可以换成
              <code>/</code>、<code>then</code> 等文案。
            </div>
          </div>
        </div>

        <h2>FAQ</h2>

        <h3>什么时候用 children，什么时候用 items？</h3>
        <p>
          单个键帽或完全自定义布局时，可以用 <code>children</code>{' '}
          最直接；需要表达标准组合键时，优先用
          <code>items</code> 或 <code>Kbd.Combo</code>，维护成本更低。
        </p>

        <h3>分隔符只能是加号吗？</h3>
        <p>
          不是。你可以通过 <code>separator</code> 传任意节点，也可以直接使用{' '}
          <code>Kbd.Separator</code>
          包一层，统一保持当前页面的弱化分隔视觉。
        </p>

        <h3>完整键盘这种自由布局还支持吗？</h3>
        <p>
          支持。Kbd 本质上仍然是轻量键帽组件，语义 API
          只是补充组合键表达，不会限制你自由排布完整键盘。
        </p>
      </div>
    </SidebarPlayground>
  )
}

export default KbdDemo
