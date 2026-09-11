import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import PreviewBlock, { type PreviewTabMode } from './PreviewBlock'
import { Dropdown } from '@rue-js/design'
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

const ControlledDropdownPreview: FC = () => {
  const open = ref(false)
  const source = ref('trigger')

  return (
    <div className="not-prose rounded-box border border-base-300 bg-base-100/70 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Dropdown
          trigger="click"
          open={open.value}
          overlayClassName="animate-none transition-none"
          onOpenChange={(nextOpen, info) => {
            open.value = nextOpen
            source.value = info.source
          }}
          menu={{
            items: [
              { key: 'pin', label: 'Pin to top' },
              { key: 'mute', label: 'Mute notifications' },
              { type: 'divider' },
              { key: 'remove', label: 'Remove workspace', danger: true },
            ],
          }}
        >
          <button
            type="button"
            className="btn btn-primary"
            data-testid="dropdown-controlled-trigger"
          >
            {open.value ? '关闭菜单' : '打开菜单'}
          </button>
        </Dropdown>
        <span className="text-sm text-base-content/70">
          用单个触发器演示受控模式，按钮文本和状态说明都跟随 <code>open</code> 变化。
        </span>
      </div>
      <div className="mt-4 rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-medium">受控状态面板</div>
          <div className="grid gap-2 sm:grid-flow-col sm:items-center sm:justify-end sm:gap-4">
            <div className="flex items-center justify-between gap-3 sm:min-w-[11rem]">
              <span className="text-xs uppercase tracking-wide text-base-content/60">当前状态</span>
              <span
                className="badge badge-soft badge-primary min-w-[5.5rem] justify-center uppercase tracking-wide"
                data-testid="dropdown-controlled-state"
              >
                {open.value ? 'open' : 'closed'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 sm:min-w-[11rem]">
              <span className="text-sm text-base-content/60">最近来源</span>
              <span
                className="badge badge-outline min-w-[5.5rem] justify-center font-normal"
                data-testid="dropdown-controlled-source"
              >
                {source.value}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const rootApiRows: ApiRow[] = [
  {
    prop: 'menu / items',
    description:
      '推荐的数据驱动入口。直接渲染命令菜单，支持 divider、group、submenu、selectable 等能力。',
    type: 'DropdownMenuProps / MenuDataEntry[]',
    defaultValue: '-',
  },
  {
    prop: 'trigger',
    description: '控制打开方式，支持 hover、click、contextMenu；默认使用 hover。',
    type: "'hover' | 'click' | 'contextMenu' | Array<...>",
    defaultValue: "'hover'",
  },
  {
    prop: 'open / defaultOpen / onOpenChange',
    description:
      '受控与非受控显隐；回调会额外返回 source，便于区分 trigger、menu、outside、escape。',
    type: 'boolean / boolean / (open, info) => void',
    defaultValue: 'false / false / -',
  },
  {
    prop: 'placement',
    description: '语义化定位别名，内部映射到 Rue 当前的 align + direction 组合。',
    type: "'bottomLeft' | 'bottom' | 'bottomRight' | 'topLeft' | ...",
    defaultValue: "'bottomLeft'",
  },
  {
    prop: 'overlay / content / popupRender',
    description: '自定义面板内容或在原面板外层追加头部、底部、快捷操作区。',
    type: 'any / any / (originNode) => any',
    defaultValue: '-',
  },
  {
    prop: 'arrow / overlayClassName / overlayStyle',
    description: '使用 Rue 当前视觉基底，同时提供箭头与面板层定制。',
    type: 'boolean / string / style object',
    defaultValue: 'false / - / -',
  },
  {
    prop: 'align / direction / hover / forceOpen / forceClose',
    description: '基础 daisyUI 风格能力展示，适合原生结构或静态布局演示。',
    type: '扩展属性',
    defaultValue: '-',
  },
  {
    prop: 'children + Dropdown.Trigger / Dropdown.Content',
    description: '基础的 compound 结构继续可用；当你不想走数据驱动时，仍可手写原生内容。',
    type: 'any',
    defaultValue: '-',
  },
]

const menuApiRows: ApiRow[] = [
  {
    prop: 'menu.items',
    description: '菜单项数组，复用 Rue Menu 的 item / divider / group / submenu 数据结构。',
    type: 'MenuDataEntry[]',
    defaultValue: '[]',
  },
  {
    prop: 'menu.selectable / multiple / selectedKeys',
    description: '用于做筛选面板、视图切换、状态菜单等可选中场景。',
    type: 'boolean / boolean / MenuKey[]',
    defaultValue: 'false / false / -',
  },
  {
    prop: 'menu.onClick / onSelect / onOpenChange',
    description: '菜单项点击、选中和子菜单展开都复用 Menu 的回调结构。',
    type: 'Menu callbacks',
    defaultValue: '-',
  },
  {
    prop: 'menu.triggerSubMenuAction',
    description: '增强命令菜单默认点击展开和折叠子菜单；需要悬浮展开时可显式设为 hover。',
    type: "'click' | 'hover'",
    defaultValue: "'click'",
  },
  {
    prop: 'closeOnClick',
    description: '点击菜单项后是否自动关闭；命令菜单推荐保持默认 true，筛选面板常见设为 false。',
    type: 'boolean',
    defaultValue: 'true',
  },
]

const DropdownPage: FC = () => {
  const tabs = {
    recommended: ref<PreviewTabMode>('preview'),
    controlled: ref<PreviewTabMode>('preview'),
    selectable: ref<PreviewTabMode>('preview'),
    custom: ref<PreviewTabMode>('preview'),
    contextMenu: ref<PreviewTabMode>('preview'),
    details: ref<PreviewTabMode>('preview'),
    popover: ref<PreviewTabMode>('preview'),
    focus: ref<PreviewTabMode>('preview'),
    positions: ref<PreviewTabMode>('preview'),
    modifiers: ref<PreviewTabMode>('preview'),
  }

  const selectedKeys = ref<string[]>(['overview'])
  const filterKeys = ref<string[]>(['mentions', 'comment'])

  const commandItems = [
    {
      type: 'group',
      label: 'Workspace',
      children: [
        {
          key: 'overview',
          label: 'Overview',
          extra: <span className="badge badge-primary badge-xs">Live</span>,
        },
        { key: 'activity', label: 'Activity Feed' },
      ],
    },
    {
      type: 'submenu',
      key: 'publish',
      label: 'Publish',
      children: [
        { key: 'draft', label: 'Save Draft' },
        { key: 'review', label: 'Send For Review' },
        { key: 'live', label: 'Publish Now', danger: true },
      ],
    },
    { type: 'divider' },
    { key: 'archive', label: 'Archive Space' },
  ] as any

  const selectableItems = [
    { key: 'overview', label: 'Overview' },
    { key: 'mentions', label: 'Mentions' },
    { key: 'comment', label: 'Comments' },
    { key: 'watching', label: 'Watching', disabled: true },
  ] as any

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Dropdown 下拉菜单</h1>
        <p className="text-sm mt-3 mb-3">
          Rue 的 Dropdown 现在同时支持两条路径：一条是保持当前视觉风格与 daisyUI
          原生结构的写法；另一条是更贴近业务组件习惯的语义 API，直接支持 <code>menu / items</code>、
          <code>trigger</code>、<code>placement</code>、<code>open</code>、<code>popupRender</code>{' '}
          和右键菜单。
        </p>

        <div className="not-prose mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">
              推荐写法
            </div>
            <div className="mt-2 text-sm font-medium">用 menu / items 描述命令菜单</div>
            <p className="mt-2 text-sm opacity-70">
              更适合操作菜单、用户菜单、列表行操作和上下文菜单，不必再手写浮层结构。
            </p>
          </div>
          <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-secondary">
              daisyUI 自由组合写法
            </div>
            <div className="mt-2 text-sm font-medium">自由组合写法可用</div>
            <p className="mt-2 text-sm opacity-70">
              <code>details</code>、<code>popover</code>、<code>focus</code>、位置类和 modifier
              都没有删除。
            </p>
          </div>
          <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-accent">
              交互补充
            </div>
            <div className="mt-2 text-sm font-medium">受控、右键、可选中、自定义面板</div>
            <p className="mt-2 text-sm opacity-70">
              适合业务菜单、筛选菜单、带说明区的弹层菜单，以及需要区分关闭来源的场景。
            </p>
          </div>
        </div>

        <h2>何时使用</h2>
        <ul>
          <li>需要一个轻量命令面板，把 3 到 8 个动作收纳到按钮、头像或行内入口后面。</li>
          <li>适合使用 Rue 当前 dropdown 视觉风格，同时使用更完整的菜单 API。</li>
          <li>既要支持原生 HTML 结构，也要支持数据驱动菜单、受控状态和右键上下文菜单。</li>
        </ul>

        <h2>推荐语义 API</h2>

        <PreviewBlock
          title="推荐：命令菜单"
          tab={tabs.recommended}
          preview={() => (
            <div className="not-prose flex min-h-56 items-start justify-start rounded-box border border-base-300 bg-base-100/70 p-6">
              <Dropdown
                trigger="click"
                placement="bottomLeft"
                arrow
                items={commandItems}
                data-testid="dropdown-recommended"
              >
                <button className="btn btn-primary">Workspace</button>
              </Dropdown>
            </div>
          )}
          code={`const items = [
  {
    type: 'group',
    label: 'Workspace',
    children: [
      { key: 'overview', label: 'Overview', extra: <span className="badge badge-primary badge-xs">Live</span> },
      { key: 'activity', label: 'Activity Feed' },
    ],
  },
  {
    type: 'submenu',
    key: 'publish',
    label: 'Publish',
    children: [
      { key: 'draft', label: 'Save Draft' },
      { key: 'review', label: 'Send For Review' },
      { key: 'live', label: 'Publish Now', danger: true },
    ],
  },
  { type: 'divider' },
  { key: 'archive', label: 'Archive Space' },
];

<Dropdown trigger="click" placement="bottomLeft" arrow items={items}>
  <button className="btn btn-primary">Workspace</button>
</Dropdown>`}
        />

        <PreviewBlock
          title="受控开关与来源"
          tab={tabs.controlled}
          preview={<ControlledDropdownPreview />}
          code={`const open = ref(false);
const source = ref('trigger');

<Dropdown
  trigger="click"
  open={open.value}
  onOpenChange={(nextOpen, info) => {
    open.value = nextOpen;
    source.value = info.source;
  }}
  menu={{
    items: [
      { key: 'pin', label: 'Pin to top' },
      { key: 'mute', label: 'Mute notifications' },
      { type: 'divider' },
      { key: 'remove', label: 'Remove workspace', danger: true },
    ],
  }}
>
  <button className="btn">Open controlled menu</button>
</Dropdown>`}
        />

        <PreviewBlock
          title="可选中筛选菜单"
          tab={tabs.selectable}
          preview={() => (
            <div className="not-prose grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="rounded-box border border-base-300 bg-base-100/70 p-6">
                <div className="flex flex-wrap gap-3">
                  <Dropdown
                    trigger="click"
                    closeOnClick={false}
                    menu={{
                      selectable: true,
                      selectedKeys: selectedKeys.value,
                      onSelect: info => {
                        selectedKeys.value = info.selectedKeys as string[]
                      },
                      items: selectableItems,
                    }}
                  >
                    <button className="btn">Single Select</button>
                  </Dropdown>

                  <Dropdown
                    trigger="click"
                    closeOnClick={false}
                    menu={{
                      selectable: true,
                      multiple: true,
                      selectedKeys: filterKeys.value,
                      onSelect: info => {
                        filterKeys.value = info.selectedKeys as string[]
                      },
                      onDeselect: info => {
                        filterKeys.value = info.selectedKeys as string[]
                      },
                      items: selectableItems,
                    }}
                  >
                    <button className="btn btn-outline">Multiple Filters</button>
                  </Dropdown>
                </div>
              </div>
              <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm text-sm">
                <div>单选：{selectedKeys.value.join(', ') || '未选中'}</div>
                <div className="mt-2">多选：{filterKeys.value.join(', ') || '未选中'}</div>
                <p className="mt-3 text-base-content/70">
                  这类筛选面板通常会把 <code>closeOnClick</code> 设为 <code>false</code>
                  ，让用户连续选择。
                </p>
              </div>
            </div>
          )}
          code={`const selectedKeys = ref(['overview']);
const filterKeys = ref(['mentions', 'comment']);

<Dropdown
  trigger="click"
  closeOnClick={false}
  menu={{
    selectable: true,
    selectedKeys: selectedKeys.value,
    onSelect: info => {
      selectedKeys.value = info.selectedKeys as string[];
    },
    items: selectableItems,
  }}
>
  <button className="btn">Single Select</button>
</Dropdown>

<Dropdown
  trigger="click"
  closeOnClick={false}
  menu={{
    selectable: true,
    multiple: true,
    selectedKeys: filterKeys.value,
    onSelect: info => {
      filterKeys.value = info.selectedKeys as string[];
    },
    onDeselect: info => {
      filterKeys.value = info.selectedKeys as string[];
    },
    items: selectableItems,
  }}
>
  <button className="btn btn-outline">Multiple Filters</button>
</Dropdown>`}
        />

        <PreviewBlock
          title="自定义面板包装"
          tab={tabs.custom}
          preview={() => (
            <div className="not-prose flex min-h-64 items-start rounded-box border border-base-300 bg-base-100/70 p-6">
              <Dropdown
                trigger="click"
                placement="bottomRight"
                arrow
                overlay={
                  <div className="p-4">
                    <div className="text-sm font-medium">Editor shortcuts</div>
                    <div className="mt-2 text-sm text-base-content/70">
                      Publish, share and manage visibility in one place.
                    </div>
                  </div>
                }
                popupRender={originNode => (
                  <div className="w-72">
                    <div className="border-b border-base-300 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-primary">
                      Quick panel
                    </div>
                    {originNode}
                    <div className="flex items-center justify-end gap-2 border-t border-base-300 px-4 py-3">
                      <button className="btn btn-ghost btn-sm">Later</button>
                      <button className="btn btn-primary btn-sm">Publish</button>
                    </div>
                  </div>
                )}
              >
                <button className="btn btn-secondary">Quick Panel</button>
              </Dropdown>
            </div>
          )}
          code={`<Dropdown
  trigger="click"
  placement="bottomRight"
  arrow
  overlay={
    <div className="p-4">
      <div className="text-sm font-medium">Editor shortcuts</div>
      <div className="mt-2 text-sm text-base-content/70">
        Publish, share and manage visibility in one place.
      </div>
    </div>
  }
  popupRender={originNode => (
    <div className="w-72">
      <div className="border-b border-base-300 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-primary">
        Quick panel
      </div>
      {originNode}
      <div className="flex items-center justify-end gap-2 border-t border-base-300 px-4 py-3">
        <button className="btn btn-ghost btn-sm">Later</button>
        <button className="btn btn-primary btn-sm">Publish</button>
      </div>
    </div>
  )}
>
  <button className="btn btn-secondary">Quick Panel</button>
</Dropdown>`}
        />

        <PreviewBlock
          title="右键上下文菜单"
          tab={tabs.contextMenu}
          preview={() => (
            <div className="not-prose rounded-box border border-dashed border-base-300 bg-base-100/70 p-6">
              <Dropdown
                trigger="contextMenu"
                items={[
                  { key: 'copy', label: 'Copy link' },
                  { key: 'rename', label: 'Rename block' },
                  { type: 'divider' },
                  { key: 'delete', label: 'Delete block', danger: true },
                ]}
              >
                <div className="flex h-44 items-center justify-center rounded-box bg-base-200 text-sm text-base-content/70">
                  在这个区域右键，打开上下文菜单
                </div>
              </Dropdown>
            </div>
          )}
          code={`<Dropdown
  trigger="contextMenu"
  items={[
    { key: 'copy', label: 'Copy link' },
    { key: 'rename', label: 'Rename block' },
    { type: 'divider' },
    { key: 'delete', label: 'Delete block', danger: true },
  ]}
>
  <div className="flex h-44 items-center justify-center rounded-box bg-base-200 text-sm text-base-content/70">
    在这个区域右键，打开上下文菜单
  </div>
</Dropdown>`}
        />

        <h2>支持原生结构</h2>

        <PreviewBlock
          title="Dropdown using details and summary"
          tab={tabs.details}
          preview={() => (
            <Dropdown as="details" className="mb-32" data-testid="dropdown-details">
              <summary className="btn m-1">open or close</summary>
              <Dropdown.Content
                as="ul"
                className="menu z-1 w-52 rounded-box bg-base-100 p-2 shadow-sm"
              >
                <li>
                  <button>Item 1</button>
                </li>
                <li>
                  <button>Item 2</button>
                </li>
              </Dropdown.Content>
            </Dropdown>
          )}
          code={`<Dropdown as="details" className="mb-32">
  <summary className="btn m-1">open or close</summary>
  <Dropdown.Content as="ul" className="menu z-1 w-52 rounded-box bg-base-100 p-2 shadow-sm">
    <li><button>Item 1</button></li>
    <li><button>Item 2</button></li>
  </Dropdown.Content>
</Dropdown>`}
        />

        <PreviewBlock
          title="Dropdown using popover API"
          tab={tabs.popover}
          preview={() => (
            <div className="flex items-start gap-4">
              <button
                className="btn"
                popovertarget="dropdown-popover-1"
                style={{ anchorName: '--dropdown-anchor-1' }}
              >
                Button
              </button>
              <Dropdown
                as="ul"
                popover="auto"
                id="dropdown-popover-1"
                className="menu w-52 rounded-box bg-base-100 shadow-sm"
                style={{ positionAnchor: '--dropdown-anchor-1' }}
              >
                <li>
                  <button>Item 1</button>
                </li>
                <li>
                  <button>Item 2</button>
                </li>
              </Dropdown>
            </div>
          )}
          code={`<button className="btn" popovertarget="dropdown-popover-1" style={{ anchorName: '--dropdown-anchor-1' }}>
  Button
</button>
<Dropdown
  as="ul"
  popover="auto"
  id="dropdown-popover-1"
  className="menu w-52 rounded-box bg-base-100 shadow-sm"
  style={{ positionAnchor: '--dropdown-anchor-1' }}
>
  <li><button>Item 1</button></li>
  <li><button>Item 2</button></li>
</Dropdown>`}
        />

        <PreviewBlock
          title="Dropdown menu"
          tab={tabs.focus}
          preview={() => (
            <Dropdown className="mb-32">
              <Dropdown.Trigger
                as="button"
                type="button"
                className="btn m-1"
                data-testid="dropdown-focus-trigger"
              >
                Click to open
              </Dropdown.Trigger>
              <Dropdown.Content
                as="ul"
                tabIndex={-1}
                className="menu z-1 w-52 rounded-box bg-base-100 p-2 shadow-sm"
              >
                <li>
                  <button>Item 1</button>
                </li>
                <li>
                  <button>Item 2</button>
                </li>
              </Dropdown.Content>
            </Dropdown>
          )}
          code={`<Dropdown className="mb-32">
  <Dropdown.Trigger as="button" type="button" className="btn m-1">
    Click to open
  </Dropdown.Trigger>
  <Dropdown.Content as="ul" tabIndex={-1} className="menu z-1 w-52 rounded-box bg-base-100 p-2 shadow-sm">
    <li><button>Item 1</button></li>
    <li><button>Item 2</button></li>
  </Dropdown.Content>
</Dropdown>`}
        />

        <PreviewBlock
          title="Positions"
          tab={tabs.positions}
          preview={() => (
            <div className="grid gap-x-16 gap-y-24 py-24 md:grid-cols-2 xl:grid-cols-[minmax(10rem,1fr)_minmax(12rem,1fr)_minmax(20rem,1.2fr)]">
              <div className="flex min-h-28 items-start justify-start">
                <Dropdown align="start">
                  <Dropdown.Trigger
                    as="button"
                    type="button"
                    className="btn m-1"
                    data-testid="dropdown-position-start"
                  >
                    Start
                  </Dropdown.Trigger>
                  <Dropdown.Content
                    as="ul"
                    tabIndex={-1}
                    className="menu z-1 w-52 rounded-box bg-base-100 p-2 shadow-sm"
                  >
                    <li>
                      <button>Item 1</button>
                    </li>
                    <li>
                      <button>Item 2</button>
                    </li>
                  </Dropdown.Content>
                </Dropdown>
              </div>
              <div className="flex min-h-28 items-end justify-center">
                <Dropdown align="center" direction="top">
                  <Dropdown.Trigger
                    as="button"
                    type="button"
                    className="btn m-1"
                    data-testid="dropdown-position-top-center"
                  >
                    Top Center
                  </Dropdown.Trigger>
                  <Dropdown.Content
                    as="ul"
                    tabIndex={-1}
                    className="menu z-1 w-52 rounded-box bg-base-100 p-2 shadow-sm"
                  >
                    <li>
                      <button>Item 1</button>
                    </li>
                    <li>
                      <button>Item 2</button>
                    </li>
                  </Dropdown.Content>
                </Dropdown>
              </div>
              <div
                className="flex min-h-28 min-w-80 items-end justify-end sm:ps-56"
                data-testid="dropdown-position-left-end-slot"
              >
                <Dropdown direction="left" align="end">
                  <Dropdown.Trigger
                    as="button"
                    type="button"
                    className="btn m-1"
                    data-testid="dropdown-position-left-end"
                  >
                    Left End
                  </Dropdown.Trigger>
                  <Dropdown.Content
                    as="ul"
                    tabIndex={-1}
                    className="menu z-1 w-52 rounded-box bg-base-100 p-2 shadow-sm"
                  >
                    <li>
                      <button>Item 1</button>
                    </li>
                    <li>
                      <button>Item 2</button>
                    </li>
                  </Dropdown.Content>
                </Dropdown>
              </div>
            </div>
          )}
          code={`<Dropdown align="start">
  <Dropdown.Trigger as="button" type="button" className="btn m-1">Start</Dropdown.Trigger>
  <Dropdown.Content as="ul" tabIndex={-1} className="menu z-1 w-52 rounded-box bg-base-100 p-2 shadow-sm">
    <li>
      <button>Item 1</button>
    </li>
    <li>
      <button>Item 2</button>
    </li>
  </Dropdown.Content>
</Dropdown>

<Dropdown align="center" direction="top">
  <Dropdown.Trigger as="button" type="button" className="btn m-1">Top Center</Dropdown.Trigger>
  <Dropdown.Content as="ul" tabIndex={-1} className="menu z-1 w-52 rounded-box bg-base-100 p-2 shadow-sm">
    <li>
      <button>Item 1</button>
    </li>
    <li>
      <button>Item 2</button>
    </li>
  </Dropdown.Content>
</Dropdown>

<Dropdown direction="left" align="end">
  <Dropdown.Trigger as="button" type="button" className="btn m-1">Left End</Dropdown.Trigger>
  <Dropdown.Content as="ul" tabIndex={-1} className="menu z-1 w-52 rounded-box bg-base-100 p-2 shadow-sm">
    <li>
      <button>Item 1</button>
    </li>
    <li>
      <button>Item 2</button>
    </li>
  </Dropdown.Content>
</Dropdown>`}
        />

        <PreviewBlock
          title="Dropdown hover and force open"
          tab={tabs.modifiers}
          preview={() => (
            <Dropdown hover forceOpen>
              <div tabIndex={0} role="button" className="btn m-1">
                Always visible
              </div>
              <Dropdown.Content
                as="ul"
                tabIndex={-1}
                className="menu z-1 w-52 rounded-box bg-base-100 p-2 shadow-sm"
              >
                <li>
                  <button>Item 1</button>
                </li>
                <li>
                  <button>Item 2</button>
                </li>
              </Dropdown.Content>
            </Dropdown>
          )}
          code={`<Dropdown hover forceOpen>
  <div tabIndex={0} role="button" className="btn m-1">Always visible</div>
  <Dropdown.Content as="ul" tabIndex={-1} className="menu z-1 w-52 rounded-box bg-base-100 p-2 shadow-sm">
    <li><button>Item 1</button></li>
    <li><button>Item 2</button></li>
  </Dropdown.Content>
</Dropdown>`}
        />

        <br />

        <h2 id="dropdown-api">API</h2>
        <ApiTable rows={rootApiRows} />
        <h3 className="mt-8">menu 扩展</h3>
        <ApiTable rows={menuApiRows} />

        <h2>FAQ</h2>
        <ul>
          <li>
            想做业务菜单、用户菜单、右键菜单时，优先用 <code>menu</code> 或 <code>items</code>。
          </li>
          <li>
            想保持完全原生的 HTML 结构时，可以使用 <code>Dropdown.Trigger</code> +{' '}
            <code>Dropdown.Content</code>，或直接写 details / summary。
          </li>
          <li>
            需要筛选面板、多选菜单时，通常把 <code>closeOnClick</code> 设为 <code>false</code>
            ，并配合 <code>menu.selectable</code>。
          </li>
          <li>
            需要在面板里追加说明、底部操作区或二次确认按钮时，使用 <code>popupRender</code>{' '}
            包住基础内容。
          </li>
        </ul>
      </div>
    </SidebarPlayground>
  )
}

export default DropdownPage
