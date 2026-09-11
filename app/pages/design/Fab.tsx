import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import PreviewBlock, { type PreviewTabMode } from './PreviewBlock'
import { Fab } from '@rue-js/design'
interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
}

const GlyphIcon: FC<{ label: string; glyph: string }> = ({ label, glyph }) => {
  return (
    <svg aria-label={label} viewBox="0 0 24 24" className="size-5 fill-current">
      <circle cx="12" cy="12" r="10" opacity="0.18" />
      <text
        x="12"
        y="12"
        text-anchor="middle"
        dominant-baseline="central"
        font-size="10"
        font-weight="700"
      >
        {glyph}
      </text>
    </svg>
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

const DemoCard: FC<{ children?: any }> = ({ children }) => {
  return (
    <div className="card bg-base-100 shadow-sm overflow-visible">
      <div className="card-body">
        <div className="relative h-64">{children}</div>
      </div>
    </div>
  )
}

const ControlledFabPreview: FC = () => {
  const open = ref(false)

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start">
      <div className="rounded-box border border-base-300 bg-base-100/60 p-4">
        <div className="text-sm text-base-content/70">点击侧边开关，或直接点击主按钮。</div>
        <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-primary">
          当前状态：{open.value ? 'open' : 'closed'}
        </div>
        <div className="relative mt-4 h-48">
          <Fab
            className="absolute right-0 bottom-0 z-1"
            type="primary"
            trigger="click"
            open={open.value}
            onOpenChange={nextOpen => {
              open.value = nextOpen
            }}
            icon={<GlyphIcon label="Compose" glyph="+" />}
            closeIcon={<GlyphIcon label="Close" glyph="x" />}
            items={[
              { key: 'draft', icon: <GlyphIcon label="Draft" glyph="D" />, tooltip: '保存草稿' },
              { key: 'review', icon: <GlyphIcon label="Review" glyph="R" />, tooltip: '提交评审' },
              {
                key: 'publish',
                icon: <GlyphIcon label="Publish" glyph="P" />,
                tooltip: '直接发布',
              },
            ]}
          />
        </div>
      </div>
      <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
        <div className="text-sm font-medium">受控模式</div>
        <p className="mt-2 text-sm opacity-70">
          用 <code>open</code> + <code>onOpenChange</code>{' '}
          接入业务状态，同步外部抽屉、埋点或二次确认流程。
        </p>
        <button className="btn btn-primary btn-sm mt-3" onClick={() => (open.value = !open.value)}>
          {open.value ? '关闭 FAB' : '打开 FAB'}
        </button>
      </div>
    </div>
  )
}

const PlacementFabPreview: FC = () => {
  const placement = ref<'top' | 'right' | 'bottom' | 'left'>('top')

  return (
    <div className="space-y-4">
      <div className="join">
        {(['top', 'right', 'bottom', 'left'] as const).map(item => (
          <button
            key={item}
            className={`btn btn-sm join-item ${placement.value === item ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => (placement.value = item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="relative h-48 rounded-box border border-dashed border-base-300 bg-base-100/70 p-4">
        <Fab
          className="absolute right-0 bottom-0 z-1"
          type="primary"
          trigger="click"
          placement={placement.value}
          icon={<GlyphIcon label="Menu" glyph="M" />}
          items={[
            { key: 'edit', icon: <GlyphIcon label="Edit" glyph="E" />, tooltip: '编辑' },
            { key: 'share', icon: <GlyphIcon label="Share" glyph="S" />, tooltip: '分享' },
            { key: 'copy', icon: <GlyphIcon label="Copy" glyph="C" />, tooltip: '复制链接' },
          ]}
        />
      </div>
    </div>
  )
}

const mainApiRows: ApiRow[] = [
  {
    prop: 'icon / children / content / description',
    description:
      '根级按钮支持图标与文字内容；推荐直接写 children，有内容时默认切到 square 形态，content / description 继续作为语义化补充。',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'items',
    description:
      '数据驱动的子按钮配置，适合快速搭建悬浮操作菜单；每项支持 icon、tooltip、badge、href、onClick。',
    type: 'FabActionProps[]',
    defaultValue: '[]',
  },
  {
    prop: 'trigger / open / defaultOpen / onOpenChange',
    description: '支持 click、hover 两种触发方式，以及受控/非受控展开。',
    type: "'click' | 'hover' / boolean / boolean / (open) => void",
    defaultValue: "'click' when items exist",
  },
  {
    prop: 'placement',
    description: '控制菜单向上、下、左、右展开。',
    type: "'top' | 'bottom' | 'left' | 'right'",
    defaultValue: "'top'",
  },
  {
    prop: 'type / color / shape',
    description:
      '使用 Rue 自己的按钮视觉语义；type 提供 default 与 primary 快捷入口，color 支持更细粒度主题色。',
    type: "'default' | 'primary' / ButtonColor / 'circle' | 'square'",
    defaultValue: "'default' / - / 自动推导",
  },
  {
    prop: 'tooltip / badge',
    description: '主按钮和子按钮都支持提示与角标，适合消息中心、快捷操作和待办入口。',
    type: 'any / BadgeProps',
    defaultValue: '-',
  },
]

const itemApiRows: ApiRow[] = [
  {
    prop: 'key',
    description: '列表渲染 key；未传时会自动按位置兜底。',
    type: 'string | number',
    defaultValue: '-',
  },
  {
    prop: 'closeOnClick',
    description: 'click 菜单模式下，点击当前项后是否自动收起面板。',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    prop: 'href / target / htmlType',
    description: '复用按钮语义，可直接跳转链接或作为表单提交按钮。',
    type: 'string / string / button|submit|reset',
    defaultValue: '-',
  },
]

const FabPage: FC = () => {
  const tabs = {
    single: ref<PreviewTabMode>('preview'),
    square: ref<PreviewTabMode>('preview'),
    menu: ref<PreviewTabMode>('preview'),
    hover: ref<PreviewTabMode>('preview'),
    controlled: ref<PreviewTabMode>('preview'),
    placement: ref<PreviewTabMode>('preview'),
    oldVertical: ref<PreviewTabMode>('preview'),
    oldIcons: ref<PreviewTabMode>('preview'),
    oldLabels: ref<PreviewTabMode>('preview'),
    oldRect: ref<PreviewTabMode>('preview'),
    oldClose: ref<PreviewTabMode>('preview'),
    oldMain: ref<PreviewTabMode>('preview'),
    oldSingle: ref<PreviewTabMode>('preview'),
    oldFlower: ref<PreviewTabMode>('preview'),
    oldFlowerIcons: ref<PreviewTabMode>('preview'),
    oldFlowerTooltip: ref<PreviewTabMode>('preview'),
  }

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Fab 悬浮操作按钮</h1>
        <p className="text-sm mt-3 mb-3">
          Rue 的 Fab 现在同时支持两类路径：一类是使用 daisyUI 的 <code>.fab</code> 结构写法；
          另一类是更贴近常见悬浮操作按钮的语义 API，直接支持 <code>items</code>、
          <code>trigger</code>、<code>placement</code>、<code>open</code>、<code>tooltip</code> 和{' '}
          <code>badge</code>。
        </p>

        <div className="not-prose mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">
              推荐写法
            </div>
            <div className="mt-2 text-sm font-medium">直接用数据驱动菜单</div>
            <p className="mt-2 text-sm opacity-70">
              用 <code>icon</code>、<code>items</code>、<code>trigger</code> 和{' '}
              <code>placement</code> 一次描述完整行为。
            </p>
          </div>
          <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-secondary">
              支持基础示例
            </div>
            <div className="mt-2 text-sm font-medium">基础 compound 结构继续可用</div>
            <p className="mt-2 text-sm opacity-70">
              <code>Fab.Trigger</code>、<code>Fab.Close</code>、<code>Fab.MainAction</code> 和
              flower 布局全部保持。
            </p>
          </div>
          <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-accent">
              交互补充
            </div>
            <div className="mt-2 text-sm font-medium">受控、点击外部关闭、方向展开</div>
            <p className="mt-2 text-sm opacity-70">
              适合消息入口、创建入口、移动端快捷发布和带状态提示的全局操作。
            </p>
          </div>
        </div>

        <PreviewBlock
          title="Single Float Button"
          tab={tabs.single}
          preview={() => (
            <DemoCard>
              <Fab
                className="absolute right-0 bottom-0 z-1"
                type="primary"
                icon={<GlyphIcon label="Create" glyph="+" />}
                tooltip="新建内容"
                data-testid="fab-single-enhanced"
              />
            </DemoCard>
          )}
          code={`<Fab
  className="absolute right-0 bottom-0 z-1"
  type="primary"
  icon={<GlyphIcon label="Create" glyph="+" />}
  tooltip="新建内容"
/>`}
        />

        <PreviewBlock
          title="Square Button With Content"
          tab={tabs.square}
          preview={() => (
            <DemoCard>
              <Fab
                className="absolute right-0 bottom-0 z-1"
                type="primary"
                shape="square"
                icon={<GlyphIcon label="Inbox" glyph="I" />}
                tooltip="查看待处理消息"
                badge={{ count: 3, variant: 'error' }}
              >
                Inbox
              </Fab>
            </DemoCard>
          )}
          code={`<Fab
  className="absolute right-0 bottom-0 z-1"
  type="primary"
  shape="square"
  icon={<GlyphIcon label="Inbox" glyph="I" />}
  tooltip="查看待处理消息"
  badge={{ count: 3, variant: 'error' }}
>
  Inbox
</Fab>`}
        />

        <PreviewBlock
          title="Menu Mode"
          tab={tabs.menu}
          preview={() => (
            <DemoCard>
              <Fab
                className="absolute right-0 bottom-0 z-1"
                type="primary"
                trigger="click"
                icon={<GlyphIcon label="Compose" glyph="+" />}
                closeIcon={<GlyphIcon label="Close" glyph="x" />}
                items={[
                  { key: 'camera', icon: <GlyphIcon label="Camera" glyph="C" />, tooltip: '拍照' },
                  {
                    key: 'gallery',
                    icon: <GlyphIcon label="Gallery" glyph="G" />,
                    tooltip: '相册',
                  },
                  { key: 'voice', icon: <GlyphIcon label="Voice" glyph="V" />, tooltip: '语音' },
                ]}
              />
            </DemoCard>
          )}
          code={`<Fab
  className="absolute right-0 bottom-0 z-1"
  type="primary"
  trigger="click"
  icon={<GlyphIcon label="Compose" glyph="+" />}
  closeIcon={<GlyphIcon label="Close" glyph="x" />}
  items={[
    { key: 'camera', icon: <GlyphIcon label="Camera" glyph="C" />, tooltip: '拍照' },
    { key: 'gallery', icon: <GlyphIcon label="Gallery" glyph="G" />, tooltip: '相册' },
    { key: 'voice', icon: <GlyphIcon label="Voice" glyph="V" />, tooltip: '语音' },
  ]}
/>`}
        />

        <PreviewBlock
          title="Hover Menu"
          tab={tabs.hover}
          preview={() => (
            <DemoCard>
              <Fab
                className="absolute right-0 bottom-0 z-1"
                type="primary"
                trigger="hover"
                shape="square"
                icon={<GlyphIcon label="Quick" glyph="Q" />}
                items={[
                  { key: 'draft', icon: <GlyphIcon label="Draft" glyph="D" />, content: 'Draft' },
                  { key: 'pin', icon: <GlyphIcon label="Pin" glyph="P" />, content: 'Pin' },
                  { key: 'share', icon: <GlyphIcon label="Share" glyph="S" />, content: 'Share' },
                ]}
              >
                Quick
              </Fab>
            </DemoCard>
          )}
          code={`<Fab
  className="absolute right-0 bottom-0 z-1"
  type="primary"
  trigger="hover"
  shape="square"
  icon={<GlyphIcon label="Quick" glyph="Q" />}
  items={[
    { key: 'draft', icon: <GlyphIcon label="Draft" glyph="D" />, content: 'Draft' },
    { key: 'pin', icon: <GlyphIcon label="Pin" glyph="P" />, content: 'Pin' },
    { key: 'share', icon: <GlyphIcon label="Share" glyph="S" />, content: 'Share' },
  ]}
>
  Quick
</Fab>`}
        />

        <PreviewBlock
          title="Controlled Open State"
          tab={tabs.controlled}
          preview={() => <ControlledFabPreview />}
          code={`const open = ref(false)

<Fab
  className="absolute right-0 bottom-0 z-1"
  trigger="click"
  open={open.value}
  onOpenChange={nextOpen => {
    open.value = nextOpen
  }}
  icon={<GlyphIcon label="Compose" glyph="+" />}
  items={[
    { key: 'draft', icon: <GlyphIcon label="Draft" glyph="D" />, tooltip: '保存草稿' },
    { key: 'review', icon: <GlyphIcon label="Review" glyph="R" />, tooltip: '提交评审' },
    { key: 'publish', icon: <GlyphIcon label="Publish" glyph="P" />, tooltip: '直接发布' },
  ]}
/>`}
        />

        <PreviewBlock
          title="Placement"
          tab={tabs.placement}
          preview={() => <PlacementFabPreview />}
          code={`<Fab
  className="absolute right-0 bottom-0 z-1"
  trigger="click"
  placement="left"
  icon={<GlyphIcon label="Menu" glyph="M" />}
  items={[
    { key: 'edit', icon: <GlyphIcon label="Edit" glyph="E" />, tooltip: '编辑' },
    { key: 'share', icon: <GlyphIcon label="Share" glyph="S" />, tooltip: '分享' },
    { key: 'copy', icon: <GlyphIcon label="Copy" glyph="C" />, tooltip: '复制链接' },
  ]}
/>`}
        />

        <PreviewBlock
          title="FAB and Speed Dial (vertical)"
          tab={tabs.oldVertical}
          preview={() => (
            <DemoCard>
              <div className="relative h-56" data-testid="fab-vertical-demo">
                <Fab className="absolute z-1" data-testid="fab-vertical-root">
                  <Fab.Trigger className="btn btn-lg btn-circle btn-primary">F</Fab.Trigger>
                  <button className="btn btn-lg btn-circle">A</button>
                  <button className="btn btn-lg btn-circle">B</button>
                  <button className="btn btn-lg btn-circle">C</button>
                </Fab>
              </div>
            </DemoCard>
          )}
          code={`<Fab className="absolute z-1">
  <Fab.Trigger className="btn btn-lg btn-circle btn-primary">F</Fab.Trigger>
  <button className="btn btn-lg btn-circle">A</button>
  <button className="btn btn-lg btn-circle">B</button>
  <button className="btn btn-lg btn-circle">C</button>
</Fab>`}
        />

        <PreviewBlock
          title="FAB and Speed Dial with SVG icons"
          tab={tabs.oldIcons}
          preview={() => (
            <DemoCard>
              <Fab className="absolute z-1">
                <Fab.Trigger className="btn btn-lg btn-circle btn-secondary">
                  <GlyphIcon label="New" glyph="+" />
                </Fab.Trigger>
                <button className="btn btn-lg btn-circle">
                  <GlyphIcon label="Camera" glyph="C" />
                </button>
                <button className="btn btn-lg btn-circle">
                  <GlyphIcon label="Gallery" glyph="G" />
                </button>
                <button className="btn btn-lg btn-circle">
                  <GlyphIcon label="Voice" glyph="V" />
                </button>
              </Fab>
            </DemoCard>
          )}
          code={`<Fab className="absolute z-1">
  <Fab.Trigger className="btn btn-lg btn-circle btn-secondary">
    <GlyphIcon label="New" glyph="+" />
  </Fab.Trigger>
  <button className="btn btn-lg btn-circle"><GlyphIcon label="Camera" glyph="C" /></button>
  <button className="btn btn-lg btn-circle"><GlyphIcon label="Gallery" glyph="G" /></button>
  <button className="btn btn-lg btn-circle"><GlyphIcon label="Voice" glyph="V" /></button>
</Fab>`}
        />

        <PreviewBlock
          title="FAB and Speed Dial with labels"
          tab={tabs.oldLabels}
          preview={() => (
            <DemoCard>
              <Fab className="absolute z-1">
                <Fab.Trigger className="btn btn-lg btn-circle btn-success">F</Fab.Trigger>
                <div className="flex items-center gap-2">
                  <span>Label B</span>
                  <button className="btn btn-lg btn-circle">A</button>
                </div>
                <div className="flex items-center gap-2">
                  <span>Label C</span>
                  <button className="btn btn-lg btn-circle">B</button>
                </div>
                <div className="flex items-center gap-2">
                  <span>Label D</span>
                  <button className="btn btn-lg btn-circle">C</button>
                </div>
              </Fab>
            </DemoCard>
          )}
          code={`<Fab className="absolute z-1">
  <Fab.Trigger className="btn btn-lg btn-circle btn-success">F</Fab.Trigger>
  <div className="flex items-center gap-2">
    <span>Label B</span>
    <button className="btn btn-lg btn-circle">A</button>
  </div>
  <div className="flex items-center gap-2">
    <span>Label C</span>
    <button className="btn btn-lg btn-circle">B</button>
  </div>
  <div className="flex items-center gap-2">
    <span>Label D</span>
    <button className="btn btn-lg btn-circle">C</button>
  </div>
</Fab>`}
        />

        <PreviewBlock
          title="FAB and Speed Dial with rectangle buttons"
          tab={tabs.oldRect}
          preview={() => (
            <DemoCard>
              <Fab className="absolute z-1">
                <Fab.Trigger className="btn btn-lg btn-circle btn-success">F</Fab.Trigger>
                <button className="btn btn-lg">Button A</button>
                <button className="btn btn-lg">Button B</button>
                <button className="btn btn-lg">Button C</button>
              </Fab>
            </DemoCard>
          )}
          code={`<Fab className="absolute z-1">
  <Fab.Trigger className="btn btn-lg btn-circle btn-success">F</Fab.Trigger>
  <button className="btn btn-lg">Button A</button>
  <button className="btn btn-lg">Button B</button>
  <button className="btn btn-lg">Button C</button>
</Fab>`}
        />

        <PreviewBlock
          title="FAB and Speed Dial with labels and fab-close button"
          tab={tabs.oldClose}
          preview={() => (
            <DemoCard>
              <Fab className="absolute z-1">
                <Fab.Trigger className="btn btn-lg btn-circle btn-info">F</Fab.Trigger>
                <Fab.Close data-testid="fab-close-demo">
                  <span className="inline-flex items-center gap-2">
                    <span>Close</span>
                    <span className="btn btn-circle btn-lg btn-error">X</span>
                  </span>
                </Fab.Close>
                <div className="flex items-center gap-2">
                  <span>Label A</span>
                  <button className="btn btn-lg btn-circle">A</button>
                </div>
                <div className="flex items-center gap-2">
                  <span>Label B</span>
                  <button className="btn btn-lg btn-circle">B</button>
                </div>
                <div className="flex items-center gap-2">
                  <span>Label C</span>
                  <button className="btn btn-lg btn-circle">C</button>
                </div>
              </Fab>
            </DemoCard>
          )}
          code={`<Fab className="absolute z-1">
  <Fab.Trigger className="btn btn-lg btn-circle btn-info">F</Fab.Trigger>
  <Fab.Close>
    <span className="inline-flex items-center gap-2">
      <span>Close</span>
      <span className="btn btn-circle btn-lg btn-error">X</span>
    </span>
  </Fab.Close>
  <div className="flex items-center gap-2">
    <span>Label A</span>
    <button className="btn btn-lg btn-circle">A</button>
  </div>
  <div className="flex items-center gap-2">
    <span>Label B</span>
    <button className="btn btn-lg btn-circle">B</button>
  </div>
  <div className="flex items-center gap-2">
    <span>Label C</span>
    <button className="btn btn-lg btn-circle">C</button>
  </div>
</Fab>`}
        />

        <PreviewBlock
          title="FAB and Speed Dial with labels and fab-main-action Button"
          tab={tabs.oldMain}
          preview={() => (
            <DemoCard>
              <Fab className="absolute z-1">
                <Fab.Trigger className="btn btn-lg btn-circle btn-primary">F</Fab.Trigger>
                <Fab.MainAction data-testid="fab-main-action-demo">
                  <span className="inline-flex items-center gap-2">
                    <span>Main Action</span>
                    <button className="btn btn-circle btn-secondary btn-lg">M</button>
                  </span>
                </Fab.MainAction>
                <div className="flex items-center gap-2">
                  <span>Label A</span>
                  <button className="btn btn-lg btn-circle">A</button>
                </div>
                <div className="flex items-center gap-2">
                  <span>Label B</span>
                  <button className="btn btn-lg btn-circle">B</button>
                </div>
                <div className="flex items-center gap-2">
                  <span>Label C</span>
                  <button className="btn btn-lg btn-circle">C</button>
                </div>
              </Fab>
            </DemoCard>
          )}
          code={`<Fab className="absolute z-1">
  <Fab.Trigger className="btn btn-lg btn-circle btn-primary">F</Fab.Trigger>
  <Fab.MainAction>
    <span className="inline-flex items-center gap-2">
      <span>Main Action</span>
      <button className="btn btn-circle btn-secondary btn-lg">M</button>
    </span>
  </Fab.MainAction>
  <div className="flex items-center gap-2">
    <span>Label A</span>
    <button className="btn btn-lg btn-circle">A</button>
  </div>
  <div className="flex items-center gap-2">
    <span>Label B</span>
    <button className="btn btn-lg btn-circle">B</button>
  </div>
  <div className="flex items-center gap-2">
    <span>Label C</span>
    <button className="btn btn-lg btn-circle">C</button>
  </div>
</Fab>`}
        />

        <PreviewBlock
          title="A single FAB (Floating Action Button)"
          tab={tabs.oldSingle}
          preview={() => (
            <DemoCard>
              <Fab className="absolute z-1">
                <button className="btn btn-lg btn-circle btn-primary">F</button>
              </Fab>
            </DemoCard>
          )}
          code={`<Fab className="absolute z-1">
  <button className="btn btn-lg btn-circle btn-primary">F</button>
</Fab>`}
        />

        <PreviewBlock
          title="FAB Flower and Speed Dial"
          tab={tabs.oldFlower}
          preview={() => (
            <DemoCard>
              <div className="relative h-56" data-testid="fab-flower-demo">
                <Fab flower className="absolute z-1" data-testid="fab-flower-demo">
                  <Fab.Trigger className="btn btn-lg btn-circle btn-success">F</Fab.Trigger>
                  <button className="fab-main-action btn btn-circle btn-lg">M</button>
                  <button className="btn btn-lg btn-circle">A</button>
                  <button className="btn btn-lg btn-circle">B</button>
                  <button className="btn btn-lg btn-circle">C</button>
                  <button className="btn btn-lg btn-circle">D</button>
                </Fab>
              </div>
            </DemoCard>
          )}
          code={`<Fab flower className="absolute z-1">
  <Fab.Trigger className="btn btn-lg btn-circle btn-success">F</Fab.Trigger>
  <button className="fab-main-action btn btn-circle btn-lg">M</button>
  <button className="btn btn-lg btn-circle">A</button>
  <button className="btn btn-lg btn-circle">B</button>
  <button className="btn btn-lg btn-circle">C</button>
  <button className="btn btn-lg btn-circle">D</button>
</Fab>`}
        />

        <PreviewBlock
          title="FAB and Flower Speed Dial with SVG icons"
          tab={tabs.oldFlowerIcons}
          preview={() => (
            <DemoCard>
              <Fab flower className="absolute z-1">
                <Fab.Trigger className="btn btn-circle btn-lg">
                  <GlyphIcon label="New" glyph="+" />
                </Fab.Trigger>
                <button className="fab-main-action btn btn-circle btn-lg btn-primary">
                  <GlyphIcon label="New post" glyph="P" />
                </button>
                <button className="btn btn-circle btn-lg">
                  <GlyphIcon label="Camera" glyph="C" />
                </button>
                <button className="btn btn-circle btn-lg">
                  <GlyphIcon label="Poll" glyph="L" />
                </button>
                <button className="btn btn-circle btn-lg">
                  <GlyphIcon label="Gallery" glyph="G" />
                </button>
                <button className="btn btn-circle btn-lg">
                  <GlyphIcon label="Voice" glyph="V" />
                </button>
              </Fab>
            </DemoCard>
          )}
          code={`<Fab flower className="absolute z-1">
  <Fab.Trigger className="btn btn-circle btn-lg"><GlyphIcon label="New" glyph="+" /></Fab.Trigger>
  <button className="fab-main-action btn btn-circle btn-lg btn-primary"><GlyphIcon label="New post" glyph="P" /></button>
  <button className="btn btn-circle btn-lg"><GlyphIcon label="Camera" glyph="C" /></button>
  <button className="btn btn-circle btn-lg"><GlyphIcon label="Poll" glyph="L" /></button>
  <button className="btn btn-circle btn-lg"><GlyphIcon label="Gallery" glyph="G" /></button>
  <button className="btn btn-circle btn-lg"><GlyphIcon label="Voice" glyph="V" /></button>
</Fab>`}
        />

        <PreviewBlock
          title="FAB and Flower Speed Dial with tooltip"
          tab={tabs.oldFlowerTooltip}
          preview={() => (
            <DemoCard>
              <Fab flower className="absolute z-1">
                <Fab.Trigger className="btn btn-lg btn-info btn-circle">F</Fab.Trigger>
                <button className="fab-main-action btn btn-circle btn-lg btn-success">M</button>
                <div className="tooltip tooltip-left" data-tip="Label A">
                  <button className="btn btn-lg btn-circle">A</button>
                </div>
                <div className="tooltip tooltip-left" data-tip="Label B">
                  <button className="btn btn-lg btn-circle">B</button>
                </div>
                <div className="tooltip" data-tip="Label C">
                  <button className="btn btn-lg btn-circle">C</button>
                </div>
                <div className="tooltip" data-tip="Label D">
                  <button className="btn btn-lg btn-circle">D</button>
                </div>
              </Fab>
            </DemoCard>
          )}
          code={`<Fab flower className="absolute z-1">
  <Fab.Trigger className="btn btn-lg btn-info btn-circle">F</Fab.Trigger>
  <button className="fab-main-action btn btn-circle btn-lg btn-success">M</button>
  <div className="tooltip tooltip-left" data-tip="Label A"><button className="btn btn-lg btn-circle">A</button></div>
  <div className="tooltip tooltip-left" data-tip="Label B"><button className="btn btn-lg btn-circle">B</button></div>
  <div className="tooltip" data-tip="Label C"><button className="btn btn-lg btn-circle">C</button></div>
  <div className="tooltip" data-tip="Label D"><button className="btn btn-lg btn-circle">D</button></div>
</Fab>`}
        />

        <h2>API</h2>
        <ApiTable rows={mainApiRows} />

        <h3>items 单项</h3>
        <ApiTable rows={itemApiRows} />

        <h2>FAQ</h2>
        <div className="not-prose space-y-3">
          <div className="rounded-box border border-base-300 bg-base-100 p-4">
            <div className="font-medium">推荐直接用哪种写法？</div>
            <p className="mt-2 mb-0 text-sm opacity-70">
              新业务优先用根级语义 API：单按钮只传 <code>icon</code>，菜单场景再补{' '}
              <code>items</code> 与<code>trigger</code>。项目页面若已经依赖 <code>Fab.Trigger</code>{' '}
              结构，可以保持不动。
            </p>
          </div>
          <div className="rounded-box border border-base-300 bg-base-100 p-4">
            <div className="font-medium">什么时候用 square？</div>
            <p className="mt-2 mb-0 text-sm opacity-70">
              需要显示文案、计数或收件箱这类语义入口时更适合 <code>shape="square"</code>
              ；纯图标快捷入口优先
              <code>circle</code>。
            </p>
          </div>
          <div className="rounded-box border border-base-300 bg-base-100 p-4">
            <div className="font-medium">flower 模式适合语义 API 还是组合结构？</div>
            <p className="mt-2 mb-0 text-sm opacity-70">
              两种都支持，但需要完全自定义每个节点结构时，基础的 compound
              写法仍然最灵活；数据驱动更适合快速搭建统一菜单。
            </p>
          </div>
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default FabPage
