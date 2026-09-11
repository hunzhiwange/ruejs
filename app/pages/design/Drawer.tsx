import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import PreviewBlock, { type PreviewTabMode } from './PreviewBlock'
import { DrawerSidebar } from '@rue-js/design'
interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
}

type DrawerPlacement = 'left' | 'right' | 'top' | 'bottom'
type DrawerSizeValue = 'default' | 'large' | '32rem'

const placementLabels: Record<DrawerPlacement, string> = {
  left: '左侧',
  right: '右侧',
  top: '顶部',
  bottom: '底部',
}

const apiRows: ApiRow[] = [
  {
    prop: 'children',
    description: '抽屉主体内容；语义模式下渲染在 body 区域，compound 模式下保持原结构',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'closable',
    description: '是否显示关闭按钮，也可传入 placement 和 closeIcon 做细化控制',
    type: 'boolean | { placement?: `start` | `end`; closeIcon?: any; disabled?: boolean }',
    defaultValue: 'true',
  },
  {
    prop: 'defaultOpen',
    description: '语义模式下的非受控初始打开状态',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'drawerRender',
    description: '对抽屉面板做二次包装，适合额外插入步骤条、边框或埋点容器',
    type: '(node) => any',
    defaultValue: '-',
  },
  {
    prop: 'end',
    description: 'compound 模式的基础右侧抽屉写法，支持当前 drawer-end 习惯',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'extra',
    description: '标题栏右上角扩展操作区，适合放状态、按钮或次要动作',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'footer',
    description: '底部操作区，适合保存、取消、提交等动作',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'getContainer / inline',
    description: '控制渲染位置；inline 用于当前容器演示，getContainer 可挂到指定节点',
    type: 'string | HTMLElement | (() => HTMLElement) | false | boolean',
    defaultValue: 'inline: false',
  },
  {
    prop: 'keyboard',
    description: '是否允许按 Esc 关闭语义模式抽屉',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    prop: 'loading',
    description: '在 body 区域显示 Skeleton，占位加载态使用骨架屏',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'mask / maskClosable',
    description: '遮罩与点击关闭控制；mask 也支持 blur 和 closable 的对象写法',
    type: 'boolean | { enabled?: boolean; closable?: boolean; blur?: boolean }',
    defaultValue: 'true',
  },
  {
    prop: 'onClose / onOpenChange',
    description: '关闭事件和显隐变化事件；受控模式推荐只监听 onOpenChange 回写状态',
    type: '(event) => void / (open) => void',
    defaultValue: '-',
  },
  {
    prop: 'open',
    description: '语义模式的受控显隐；compound 模式下仍支持 drawer-open 类名行为',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'placement',
    description: '语义模式抽屉方向，支持四个边缘打开',
    type: '`left` | `right` | `top` | `bottom`',
    defaultValue: '`right`',
  },
  {
    prop: 'size',
    description: '预设 default、large，或传入 number/string 自定义宽高',
    type: '`default` | `large` | number | string',
    defaultValue: '`default`',
  },
  {
    prop: 'title',
    description: '语义模式标题栏标题',
    type: 'any',
    defaultValue: '-',
  },
]

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

const MenuList: FC<{ items: string[]; buttons?: boolean; className?: string }> = ({
  items,
  buttons = true,
  className,
}) => {
  return (
    <ul className={`menu min-h-full bg-base-200 p-4 ${className ?? ''}`.trim()}>
      {items.map(item => (
        <li key={item}>{buttons ? <button>{item}</button> : <a>{item}</a>}</li>
      ))}
    </ul>
  )
}

const OrderEditorBody: FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">订单 RU-2031</div>
          <div className="text-xs opacity-70">把编辑动作留在当前上下文里，不跳转页面。</div>
        </div>
        <span className="badge badge-soft badge-primary">草稿</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <fieldset className="fieldset">
          <legend className="fieldset-legend">客户名称</legend>
          <input className="input w-full" value="Rue Studio" />
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">负责人</legend>
          <input className="input w-full" value="Daisy Lane" />
        </fieldset>
      </div>

      <fieldset className="fieldset">
        <legend className="fieldset-legend">交付备注</legend>
        <textarea className="textarea h-28 w-full">
          需要同时导出 PC 与移动端稿件，验收前同步一版 staging 链接。
        </textarea>
      </fieldset>

      <div className="stats stats-vertical border border-base-300 bg-base-100 shadow-sm lg:stats-horizontal">
        <div className="stat py-4">
          <div className="stat-title">排期</div>
          <div className="stat-value text-2xl">2 天</div>
          <div className="stat-desc">含一次设计 review</div>
        </div>
        <div className="stat py-4">
          <div className="stat-title">优先级</div>
          <div className="stat-value text-2xl">P1</div>
          <div className="stat-desc">进入本周发版</div>
        </div>
      </div>
    </div>
  )
}

const PlacementBody: FC<{ placement: DrawerPlacement }> = ({ placement }) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="badge badge-outline">{placementLabels[placement]}</span>
        <span className="opacity-70">同一套 API 可以切换四个方向，不再局限于侧栏结构。</span>
      </div>
      <ul className="list rounded-box border border-base-300 bg-base-100">
        <li className="list-row">
          <div className="text-xs uppercase tracking-[0.2em] opacity-50">01</div>
          <div>
            <div className="font-medium">保持当前页面状态</div>
            <div className="text-sm opacity-70">适合预览、表单补录、二级任务。</div>
          </div>
        </li>
        <li className="list-row">
          <div className="text-xs uppercase tracking-[0.2em] opacity-50">02</div>
          <div>
            <div className="font-medium">方向与尺寸联动</div>
            <div className="text-sm opacity-70">左右走宽度，顶部和底部走高度。</div>
          </div>
        </li>
      </ul>
    </div>
  )
}

const SizeBody: FC<{ size: DrawerSizeValue }> = ({ size }) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="badge badge-soft badge-secondary">尺寸 {size}</span>
        <span className="opacity-70">
          预设尺寸适合通用抽屉，自定义尺寸适合信息密度更高的详情面板。
        </span>
      </div>
      <div className="grid gap-3">
        <div className="rounded-box border border-base-300 bg-base-100 p-4">
          <div className="text-sm font-semibold">发布检查项</div>
          <ul className="mt-3 space-y-2 text-sm opacity-75">
            <li>文案校对完成</li>
            <li>截图与埋点已同步</li>
            <li>发布窗口锁定在今晚 21:00</li>
          </ul>
        </div>
        <div className="rounded-box border border-dashed border-base-300 bg-base-100 p-4 text-sm opacity-75">
          自定义宽度更适合放表格、日志、时间线这类横向信息更多的内容。
        </div>
      </div>
    </div>
  )
}

const NoMaskBody: FC = () => {
  return (
    <div className="space-y-4">
      <div className="alert alert-soft alert-info">
        <span>无遮罩模式下，背景内容仍然可见，适合页面内辅助面板。</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-box border border-base-300 bg-base-100 p-4">
          <div className="text-sm font-semibold">当前上下文</div>
          <p className="mt-2 text-sm opacity-70">这里继续显示宿主容器内容，不强制打断阅读流。</p>
        </div>
        <div className="rounded-box border border-base-300 bg-base-100 p-4">
          <div className="text-sm font-semibold">推荐场景</div>
          <p className="mt-2 text-sm opacity-70">筛选器、页面注释、快速操作台、辅助配置。</p>
        </div>
      </div>
    </div>
  )
}

const DrawerPage: FC = () => {
  const tabs = {
    basic: ref<PreviewTabMode>('preview'),
    navbar: ref<PreviewTabMode>('preview'),
    responsive: ref<PreviewTabMode>('preview'),
    collapsible: ref<PreviewTabMode>('preview'),
    right: ref<PreviewTabMode>('preview'),
    controlled: ref<PreviewTabMode>('preview'),
    placement: ref<PreviewTabMode>('preview'),
    size: ref<PreviewTabMode>('preview'),
    loading: ref<PreviewTabMode>('preview'),
    maskless: ref<PreviewTabMode>('preview'),
  }

  const controlledOpen = ref(false)
  const placementOpen = ref(false)
  const placement = ref<DrawerPlacement>('right')
  const sizeOpen = ref(false)
  const sizeValue = ref<DrawerSizeValue>('default')
  const loadingOpen = ref(false)
  const masklessOpen = ref(false)

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Drawer 抽屉侧栏</h1>
        <p className="text-sm mt-3 mb-3">
          DrawerSidebar 现在保持了 Rue 基础的 daisyUI compound
          结构，同时补上更贴近成熟业务抽屉组件的
          受控能力：四向打开、预设尺寸、标题栏扩展、底部操作区、Skeleton loading、mask
          配置与当前容器内联渲染。
        </p>

        <div className="alert alert-soft alert-info not-prose mt-6">
          <span>
            两种模式继续并存：<strong>compound 模式</strong> 适合基础 daisyUI drawer 结构；
            <strong>语义模式</strong> 适合详情、表单、预览和二级任务面板。
          </span>
        </div>

        <h2>何时使用</h2>
        <ul>
          <li>需要在当前页面上下文内完成编辑、预览、审批或补录，不想跳转路由。</li>
          <li>需要比 Popover 更重的承载能力，但又不适合用 Modal 打断整个页面流程。</li>
          <li>已经使用 compound drawer 结构，希望平滑升级而不重写项目代码。</li>
        </ul>

        <h2>Compound 结构支持</h2>

        <PreviewBlock
          title="Drawer sidebar"
          summary="展示最基础的 daisyUI drawer 结构，适合使用 Toggle / Content / Side / Overlay。"
          tab={tabs.basic}
          preview={
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <DrawerSidebar
                  className="h-56 overflow-hidden rounded-box"
                  data-testid="drawer-basic-root"
                >
                  <DrawerSidebar.Toggle id="drawer-basic" data-testid="drawer-basic-toggle" />
                  <DrawerSidebar.Content className="flex flex-col items-center justify-center">
                    <label
                      for="drawer-basic"
                      className="btn drawer-button"
                      data-testid="drawer-basic-open"
                    >
                      Open drawer
                    </label>
                  </DrawerSidebar.Content>
                  <DrawerSidebar.Side className="z-1002">
                    <DrawerSidebar.Overlay for="drawer-basic" aria-label="close sidebar" />
                    <MenuList
                      items={['Sidebar Item 1', 'Sidebar Item 2']}
                      className="w-60 md:w-80"
                    />
                  </DrawerSidebar.Side>
                </DrawerSidebar>
              </div>
            </div>
          }
          code={`<DrawerSidebar className="h-56 overflow-hidden rounded-box">
  <DrawerSidebar.Toggle id="drawer-basic" />
  <DrawerSidebar.Content className="flex flex-col items-center justify-center">
    <label for="drawer-basic" className="btn drawer-button">Open drawer</label>
  </DrawerSidebar.Content>
  <DrawerSidebar.Side>
    <DrawerSidebar.Overlay for="drawer-basic" aria-label="close sidebar" />
    <MenuList items={['Sidebar Item 1', 'Sidebar Item 2']} className="w-60 md:w-80" />
  </DrawerSidebar.Side>
</DrawerSidebar>`}
        />

        <PreviewBlock
          title="Navbar menu for desktop plus sidebar drawer for mobile"
          summary="展示响应式导航用法，桌面端显示横向菜单，移动端切换为侧栏。"
          tab={tabs.navbar}
          preview={
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <DrawerSidebar className="h-56 overflow-hidden rounded-box">
                  <DrawerSidebar.Toggle id="drawer-navbar" />
                  <DrawerSidebar.Content className="flex flex-col">
                    <div className="navbar w-full bg-base-300">
                      <div className="flex-none lg:hidden">
                        <label
                          for="drawer-navbar"
                          aria-label="open sidebar"
                          className="btn btn-square btn-ghost"
                        >
                          =
                        </label>
                      </div>
                      <div className="mx-2 flex-1 px-2">Navbar Title</div>
                      <div className="hidden flex-none lg:block">
                        <ul className="menu menu-horizontal">
                          <li>
                            <button>Navbar Item 1</button>
                          </li>
                          <li>
                            <button>Navbar Item 2</button>
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex grow items-center justify-center">Content</div>
                  </DrawerSidebar.Content>
                  <DrawerSidebar.Side className="z-1002">
                    <DrawerSidebar.Overlay for="drawer-navbar" aria-label="close sidebar" />
                    <MenuList
                      items={['Sidebar Item 1', 'Sidebar Item 2']}
                      className="w-60 md:w-80"
                    />
                  </DrawerSidebar.Side>
                </DrawerSidebar>
              </div>
            </div>
          }
          code={`<DrawerSidebar className="h-56 overflow-hidden rounded-box">
  <DrawerSidebar.Toggle id="drawer-navbar" />
  <DrawerSidebar.Content className="flex flex-col">
    <div className="navbar w-full bg-base-300">
      <div className="flex-none lg:hidden">
        <label for="drawer-navbar" aria-label="open sidebar" className="btn btn-square btn-ghost">
          =
        </label>
      </div>
      <div className="mx-2 flex-1 px-2">Navbar Title</div>
      <div className="hidden flex-none lg:block">
        <ul className="menu menu-horizontal">
          <li><button>Navbar Item 1</button></li>
          <li><button>Navbar Item 2</button></li>
        </ul>
      </div>
    </div>
    <div className="flex grow items-center justify-center">Content</div>
  </DrawerSidebar.Content>
  <DrawerSidebar.Side>
    <DrawerSidebar.Overlay for="drawer-navbar" aria-label="close sidebar" />
    <MenuList items={['Sidebar Item 1', 'Sidebar Item 2']} className="w-60 md:w-80" />
  </DrawerSidebar.Side>
</DrawerSidebar>`}
        />

        <PreviewBlock
          title="Responsive sidebar always visible on large screen"
          summary="大屏常驻、小屏抽屉，支持 lg:drawer-open 这类基础类名能力。"
          tab={tabs.responsive}
          preview={
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <DrawerSidebar className="h-56 overflow-hidden rounded-box lg:drawer-open">
                  <DrawerSidebar.Toggle id="drawer-responsive" />
                  <DrawerSidebar.Content className="flex flex-col items-center justify-center">
                    <label for="drawer-responsive" className="btn drawer-button lg:hidden">
                      Open drawer
                    </label>
                  </DrawerSidebar.Content>
                  <DrawerSidebar.Side className="max-lg:z-1002">
                    <DrawerSidebar.Overlay for="drawer-responsive" aria-label="close sidebar" />
                    <MenuList
                      items={['Sidebar Item 1', 'Sidebar Item 2']}
                      className="w-60 md:w-80"
                    />
                  </DrawerSidebar.Side>
                </DrawerSidebar>
              </div>
            </div>
          }
          code={`<DrawerSidebar className="h-56 overflow-hidden rounded-box lg:drawer-open">
  <DrawerSidebar.Toggle id="drawer-responsive" />
  <DrawerSidebar.Content className="flex flex-col items-center justify-center">
    <label for="drawer-responsive" className="btn drawer-button lg:hidden">
      Open drawer
    </label>
  </DrawerSidebar.Content>
  <DrawerSidebar.Side className="max-lg:z-1002">
    <DrawerSidebar.Overlay for="drawer-responsive" aria-label="close sidebar" />
    <MenuList items={['Sidebar Item 1', 'Sidebar Item 2']} className="w-60 md:w-80" />
  </DrawerSidebar.Side>
</DrawerSidebar>`}
        />

        <PreviewBlock
          title="Responsive collapsible icon only drawer sidebar"
          summary="展示图标折叠侧栏的写法，适合后台信息架构导航。"
          tab={tabs.collapsible}
          preview={
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <DrawerSidebar
                  className="h-80 lg:drawer-open"
                  data-testid="drawer-collapsible-root"
                >
                  <DrawerSidebar.Toggle
                    id="drawer-collapsible"
                    data-testid="drawer-collapsible-toggle"
                  />
                  <DrawerSidebar.Content>
                    <nav className="navbar w-full bg-base-300">
                      <label
                        for="drawer-collapsible"
                        aria-label="open sidebar"
                        className="btn btn-square btn-ghost"
                      >
                        ||
                      </label>
                      <div className="px-4">Navbar Title</div>
                    </nav>
                    <div className="p-4">Page Content</div>
                  </DrawerSidebar.Content>
                  <DrawerSidebar.Side className="max-lg:top-16 lg:h-80 is-drawer-close:overflow-visible">
                    <DrawerSidebar.Overlay for="drawer-collapsible" aria-label="close sidebar" />
                    <div className="flex min-h-full flex-col items-start bg-base-200 is-drawer-close:w-14 is-drawer-open:w-64">
                      <ul className="menu w-full grow">
                        <li>
                          <button
                            className="is-drawer-close:tooltip is-drawer-close:tooltip-right"
                            data-tip="Homepage"
                          >
                            H<span className="is-drawer-close:hidden">Homepage</span>
                          </button>
                        </li>
                        <li>
                          <button
                            className="is-drawer-close:tooltip is-drawer-close:tooltip-right"
                            data-tip="Settings"
                          >
                            S<span className="is-drawer-close:hidden">Settings</span>
                          </button>
                        </li>
                      </ul>
                    </div>
                  </DrawerSidebar.Side>
                </DrawerSidebar>
              </div>
            </div>
          }
          code={`<DrawerSidebar className="h-80 lg:drawer-open">
  <DrawerSidebar.Toggle id="drawer-collapsible" />
  <DrawerSidebar.Content>
    <nav className="navbar w-full bg-base-300">
      <label for="drawer-collapsible" aria-label="open sidebar" className="btn btn-square btn-ghost">
        ||
      </label>
      <div className="px-4">Navbar Title</div>
    </nav>
    <div className="p-4">Page Content</div>
  </DrawerSidebar.Content>
  <DrawerSidebar.Side className="max-lg:top-16 lg:h-80 is-drawer-close:overflow-visible">
    <DrawerSidebar.Overlay for="drawer-collapsible" aria-label="close sidebar" />
    <div className="flex min-h-full flex-col items-start bg-base-200 is-drawer-close:w-14 is-drawer-open:w-64">
      <ul className="menu w-full grow">
        <li>
          <button className="is-drawer-close:tooltip is-drawer-close:tooltip-right" data-tip="Homepage">
            H
            <span className="is-drawer-close:hidden">Homepage</span>
          </button>
        </li>
        <li>
          <button className="is-drawer-close:tooltip is-drawer-close:tooltip-right" data-tip="Settings">
            S
            <span className="is-drawer-close:hidden">Settings</span>
          </button>
        </li>
      </ul>
    </div>
  </DrawerSidebar.Side>
</DrawerSidebar>`}
        />

        <PreviewBlock
          title="Drawer sidebar that opens from right side"
          summary="基础的 end 写法继续有效，适合快速保持项目代码支持。"
          tab={tabs.right}
          preview={
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <DrawerSidebar end={true} className="h-56 overflow-hidden rounded-box">
                  <DrawerSidebar.Toggle id="drawer-right" />
                  <DrawerSidebar.Content className="flex flex-col items-center justify-center">
                    <label for="drawer-right" className="btn drawer-button">
                      Open drawer
                    </label>
                  </DrawerSidebar.Content>
                  <DrawerSidebar.Side className="z-1002">
                    <DrawerSidebar.Overlay for="drawer-right" aria-label="close sidebar" />
                    <MenuList
                      items={['Sidebar Item 1', 'Sidebar Item 2']}
                      className="w-60 md:w-80"
                    />
                  </DrawerSidebar.Side>
                </DrawerSidebar>
              </div>
            </div>
          }
          code={`<DrawerSidebar end={true} className="h-56 overflow-hidden rounded-box">
  <DrawerSidebar.Toggle id="drawer-right" />
  <DrawerSidebar.Content className="flex flex-col items-center justify-center">
    <label for="drawer-right" className="btn drawer-button">
      Open drawer
    </label>
  </DrawerSidebar.Content>
  <DrawerSidebar.Side>
    <DrawerSidebar.Overlay for="drawer-right" aria-label="close sidebar" />
    <MenuList items={['Sidebar Item 1', 'Sidebar Item 2']} className="w-60 md:w-80" />
  </DrawerSidebar.Side>
</DrawerSidebar>`}
        />

        <h2>语义模式</h2>

        <PreviewBlock
          title="Controlled drawer with title, extra and footer"
          summary="直接传 open/title/footer 进入语义模式，默认会以页面级抽屉打开，更贴近常见业务抽屉的使用方式。"
          tab={tabs.controlled}
          preview={
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      controlledOpen.value = true
                    }}
                  >
                    打开编辑抽屉
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      controlledOpen.value = false
                    }}
                  >
                    主动关闭
                  </button>
                </div>
                <div className="relative h-80 overflow-hidden rounded-box border border-base-300 bg-base-200/40">
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm opacity-70">
                    这里仍然只是预览舞台。点击按钮后会按默认行为从整个页面右侧打开；如果要限制在当前容器，再额外传入
                    inline。
                  </div>
                  <DrawerSidebar
                    open={controlledOpen.value}
                    title="编辑订单"
                    extra={<span className="badge badge-outline">版本 v3</span>}
                    footer={
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            controlledOpen.value = false
                          }}
                        >
                          取消
                        </button>
                        <button type="button" className="btn btn-primary btn-sm">
                          保存更改
                        </button>
                      </div>
                    }
                    onOpenChange={nextOpen => {
                      controlledOpen.value = nextOpen
                    }}
                  >
                    <OrderEditorBody />
                  </DrawerSidebar>
                </div>
              </div>
            </div>
          }
          code={`const open = ref(false)

<DrawerSidebar
  open={open.value}
  title="编辑订单"
  extra={<span className="badge badge-outline">版本 v3</span>}
  footer={
    <div className="flex justify-end gap-2">
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { open.value = false }}>
        取消
      </button>
      <button type="button" className="btn btn-primary btn-sm">保存更改</button>
    </div>
  }
  onOpenChange={nextOpen => {
    open.value = nextOpen
  }}
>
  <OrderEditorBody />
</DrawerSidebar>`}
        />

        <PreviewBlock
          title="Placement switching"
          summary="同一份内容根据 placement 从四个方向打开，默认以页面级抽屉展示；顶部和底部会自动使用高度尺寸。"
          tab={tabs.placement}
          preview={
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  {(['left', 'right', 'top', 'bottom'] as DrawerPlacement[]).map(item => (
                    <button
                      key={item}
                      type="button"
                      className={`btn btn-sm ${placement.value === item ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => {
                        placement.value = item
                        placementOpen.value = true
                      }}
                    >
                      {placementLabels[item]}
                    </button>
                  ))}
                </div>
                <div className="relative h-80 overflow-hidden rounded-box border border-base-300 bg-base-200/40">
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm opacity-70">
                    当前方向：{placementLabels[placement.value]}
                    。点击上方按钮后，抽屉会从整个页面对应边缘打开。
                  </div>
                  <DrawerSidebar
                    open={placementOpen.value}
                    placement={placement.value}
                    size={
                      placement.value === 'top' || placement.value === 'bottom' ? '16rem' : '24rem'
                    }
                    title={`从${placementLabels[placement.value]}打开`}
                    onOpenChange={nextOpen => {
                      placementOpen.value = nextOpen
                    }}
                  >
                    <PlacementBody placement={placement.value} />
                  </DrawerSidebar>
                </div>
              </div>
            </div>
          }
          code={`const placement = ref<DrawerPlacement>('right')
const open = ref(false)

<DrawerSidebar
  open={open.value}
  placement={placement.value}
  size={placement.value === 'top' || placement.value === 'bottom' ? '16rem' : '24rem'}
  title={
    placement.value === 'left' ? '从左侧打开' :
    placement.value === 'right' ? '从右侧打开' :
    placement.value === 'top' ? '从顶部打开' : '从底部打开'
  }
  onOpenChange={nextOpen => {
    open.value = nextOpen
  }}
>
  <PlacementBody placement={placement.value} />
</DrawerSidebar>`}
        />

        <PreviewBlock
          title="Preset and custom size"
          summary="default、large 和自定义 string / number 都可以直接使用，默认会从页面边缘打开。"
          tab={tabs.size}
          preview={
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => {
                      sizeValue.value = 'default'
                      sizeOpen.value = true
                    }}
                  >
                    default
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => {
                      sizeValue.value = 'large'
                      sizeOpen.value = true
                    }}
                  >
                    large
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => {
                      sizeValue.value = '32rem'
                      sizeOpen.value = true
                    }}
                  >
                    32rem
                  </button>
                </div>
                <div className="relative h-80 overflow-hidden rounded-box border border-base-300 bg-base-200/40">
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm opacity-70">
                    当前尺寸：{sizeValue.value}
                    。点击按钮后会以全局抽屉展示，适合根据信息密度在“任务面板”和“详情抽屉”之间切换。
                  </div>
                  <DrawerSidebar
                    open={sizeOpen.value}
                    size={sizeValue.value}
                    title="发布任务"
                    extra={
                      <button type="button" className="btn btn-ghost btn-xs">
                        基础形态
                      </button>
                    }
                    footer={
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            sizeOpen.value = false
                          }}
                        >
                          稍后处理
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm">
                          开始发布
                        </button>
                      </div>
                    }
                    onOpenChange={nextOpen => {
                      sizeOpen.value = nextOpen
                    }}
                  >
                    <SizeBody size={sizeValue.value} />
                  </DrawerSidebar>
                </div>
              </div>
            </div>
          }
          code={`const open = ref(false)
const size = ref<DrawerSizeValue>('default')

<DrawerSidebar
  open={open.value}
  size={size.value}
  title="发布任务"
  footer={
    <div className="flex justify-end gap-2">
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { open.value = false }}>
        稍后处理
      </button>
      <button type="button" className="btn btn-secondary btn-sm">开始发布</button>
    </div>
  }
  onOpenChange={nextOpen => {
    open.value = nextOpen
  }}
>
  <SizeBody size={size.value} />
</DrawerSidebar>`}
        />

        <PreviewBlock
          title="Loading and close placement"
          summary="语义模式内置 Skeleton loading，并支持把关闭按钮放到标题栏起始位置；默认仍会以页面级抽屉打开。"
          tab={tabs.loading}
          preview={
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      loadingOpen.value = true
                    }}
                  >
                    打开加载抽屉
                  </button>
                </div>
                <div className="relative h-80 overflow-hidden rounded-box border border-base-300 bg-base-200/40">
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm opacity-70">
                    适合异步拉取详情、表单 schema 或审批记录时先占位，再以全局抽屉填充真实内容。
                  </div>
                  <DrawerSidebar
                    open={loadingOpen.value}
                    title="加载审批详情"
                    loading={true}
                    mask={{ blur: true }}
                    closable={{ placement: 'start' }}
                    onOpenChange={nextOpen => {
                      loadingOpen.value = nextOpen
                    }}
                  >
                    <div>loading body</div>
                  </DrawerSidebar>
                </div>
              </div>
            </div>
          }
          code={`const open = ref(false)

<DrawerSidebar
  open={open.value}
  title="加载审批详情"
  loading={true}
  mask={{ blur: true }}
  closable={{ placement: 'start' }}
  onOpenChange={nextOpen => {
    open.value = nextOpen
  }}
>
  <div>loading body</div>
</DrawerSidebar>`}
        />

        <PreviewBlock
          title="No mask drawer in current container"
          summary="这个示例刻意使用当前容器内联渲染；辅助信息面板可以关闭遮罩，让背景内容继续保持可见。"
          tab={tabs.maskless}
          preview={
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      masklessOpen.value = true
                    }}
                  >
                    打开辅助面板
                  </button>
                </div>
                <div className="relative h-80 overflow-hidden rounded-box border border-base-300 bg-base-200/40">
                  <div className="grid h-full place-items-center px-6 text-center text-sm opacity-70">
                    这里代表页面主内容。无遮罩时，抽屉更像页内侧边工作台，而不是强打断的弹层。
                  </div>
                  <DrawerSidebar
                    inline={true}
                    open={masklessOpen.value}
                    title="筛选与注释"
                    mask={false}
                    keyboard={false}
                    size="22rem"
                    onOpenChange={nextOpen => {
                      masklessOpen.value = nextOpen
                    }}
                  >
                    <NoMaskBody />
                  </DrawerSidebar>
                </div>
              </div>
            </div>
          }
          code={`const open = ref(false)

<DrawerSidebar
  inline={true}
  open={open.value}
  title="筛选与注释"
  mask={false}
  keyboard={false}
  size="22rem"
  onOpenChange={nextOpen => {
    open.value = nextOpen
  }}
>
  <NoMaskBody />
</DrawerSidebar>`}
        />

        <h2>API</h2>
        <p className="text-sm mt-3 mb-3">
          基础的 <code>Toggle</code>、<code>Content</code>、<code>Side</code>、<code>Overlay</code>{' '}
          子组件全部保持。下面的表格重点列出语义模式下更值得直接使用的顶层 API。
        </p>

        <ApiTable rows={apiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default DrawerPage
