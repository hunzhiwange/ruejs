import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Alert, Button, Tabs } from '@rue-js/design'
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

const MailIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-5"
  >
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m4 7 8 6 8-6" />
  </svg>
)

const SparkIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 18h.01M19 18h.01M12 21h.01" />
  </svg>
)

const ShieldIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3 5 6v5c0 4.4 2.8 8.44 7 10 4.2-1.56 7-5.6 7-10V6l-7-3Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="m9.5 12 1.75 1.75L14.5 10.5" />
  </svg>
)

const tabBasic = ref<TabMode>('preview')
const tabTones = ref<TabMode>('preview')
const tabStyles = ref<TabMode>('preview')
const tabResponsive = ref<TabMode>('preview')
const tabMessage = ref<TabMode>('preview')
const tabClosable = ref<TabMode>('preview')
const tabBanner = ref<TabMode>('preview')

const apiRows: ApiRow[] = [
  { prop: 'action', description: '右侧操作区，可放按钮或链接', type: 'any', defaultValue: '-' },
  { prop: 'afterClose', description: '关闭完成后触发', type: '() => void', defaultValue: '-' },
  {
    prop: 'banner',
    description: '横幅模式，默认回退为 warning 语义',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'children',
    description: '自定义内容插槽，展示基础组合式写法',
    type: 'any',
    defaultValue: '-',
  },
  { prop: 'className', description: '追加自定义类名', type: 'string', defaultValue: '-' },
  { prop: 'closable', description: '显示关闭按钮', type: 'boolean', defaultValue: 'false' },
  { prop: 'closeIcon', description: '自定义关闭按钮内容', type: 'any', defaultValue: '-' },
  { prop: 'closeText', description: '以文本替代默认关闭图标', type: 'any', defaultValue: '-' },
  {
    prop: 'color',
    description: 'Rue 风格语义色别名，支持当前示例',
    type: "'default' | 'info' | 'success' | 'warning' | 'error'",
    defaultValue: '-',
  },
  { prop: 'dash', description: '虚线边框样式', type: 'boolean', defaultValue: 'false' },
  { prop: 'description', description: '辅助说明文案', type: 'any', defaultValue: '-' },
  {
    prop: 'direction',
    description: '内容排布方向',
    type: "'vertical' | 'horizontal'",
    defaultValue: '-',
  },
  { prop: 'icon', description: '自定义图标', type: 'any', defaultValue: '-' },
  {
    prop: 'message',
    description: '标题别名，支持常见业务组件里的 message 写法',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'onClose',
    description: '点击关闭按钮时触发',
    type: '(event: MouseEvent) => void',
    defaultValue: '-',
  },
  { prop: 'outline', description: '描边样式', type: 'boolean', defaultValue: 'false' },
  { prop: 'role', description: '可访问性角色属性', type: 'string', defaultValue: 'alert' },
  {
    prop: 'showIcon',
    description: '显式控制图标显示',
    type: 'boolean',
    defaultValue: '标题/描述或 banner 场景自动显示',
  },
  { prop: 'soft', description: '柔和填充样式', type: 'boolean', defaultValue: 'false' },
  { prop: 'title', description: '主标题文案', type: 'any', defaultValue: '-' },
  {
    prop: 'type',
    description: '常见业务组件风格的语义类型',
    type: "'info' | 'success' | 'warning' | 'error'",
    defaultValue: '-',
  },
  {
    prop: 'variant',
    description: '使用 Rue 基础语义类型写法',
    type: "'info' | 'success' | 'warning' | 'error'",
    defaultValue: '-',
  },
]

const AlertDemo: FC = () => {
  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Alert 警告</h1>
        <p className="text-sm mt-3 mb-3">Alert 用于向用户传达重要状态、操作结果与系统提醒。</p>
        <p className="text-sm opacity-75">
          组件保持了 Rue 当前的 alert、语义色、soft、outline、dash 与响应式组合方式，同时提供了
          type、color、title、description、icon、action、closable、banner 等常用能力。
        </p>

        <ExampleBlock
          title="基础用法"
          summary="展示基础组合式写法：你仍然可以手动放入图标、文本与任意自定义内容。"
          tab={tabBasic}
          preview={() => (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Alert direction="horizontal" className="w-full">
                  <MailIcon />
                  <span>12 unread messages. Tap to see.</span>
                </Alert>
              </div>
            </div>
          )}
          code={`import { Alert } from '@rue-js/design'

<Alert direction="horizontal" className="w-full">
  <MailIcon />
  <span>12 unread messages. Tap to see.</span>
</Alert>`}
        />

        <ExampleBlock
          title="语义类型与别名"
          summary="融合基础的 Info、Success、Warning、ErrorDemo，同时展示 variant、color、type 三种入口。"
          tab={tabTones}
          preview={() => (
            <div className="card bg-base-100 shadow">
              <div className="card-body grid gap-3">
                <Alert variant="info" className="w-full">
                  New software update available.
                </Alert>
                <Alert color="success" className="w-full">
                  Your purchase has been confirmed!
                </Alert>
                <Alert type="warning" className="w-full">
                  Warning: Invalid email address!
                </Alert>
                <Alert type="error" className="w-full">
                  Error! Task failed successfully.
                </Alert>
              </div>
            </div>
          )}
          code={`<Alert variant="info" className="w-full">
  New software update available.
</Alert>
<Alert color="success" className="w-full">
  Your purchase has been confirmed!
</Alert>
<Alert type="warning" className="w-full">
  Warning: Invalid email address!
</Alert>
<Alert type="error" className="w-full">
  Error! Task failed successfully.
</Alert>`}
        />

        <ExampleBlock
          title="样式组合"
          summary="展示 soft、outline、dash 三组示例，但按语义化的 API 一次性整理成一个区块。"
          tab={tabStyles}
          preview={() => (
            <div className="card bg-base-100 shadow">
              <div className="card-body grid gap-6 lg:grid-cols-3">
                <div className="grid gap-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] opacity-60">
                    Soft
                  </div>
                  <Alert variant="info" soft className="w-full">
                    12 unread messages. Tap to see.
                  </Alert>
                  <Alert color="success" soft className="w-full">
                    Your purchase has been confirmed!
                  </Alert>
                  <Alert type="warning" soft className="w-full">
                    Warning: Invalid email address!
                  </Alert>
                  <Alert type="error" soft className="w-full">
                    Error! Task failed successfully.
                  </Alert>
                </div>
                <div className="grid gap-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] opacity-60">
                    Outline
                  </div>
                  <Alert variant="info" outline className="w-full">
                    12 unread messages. Tap to see.
                  </Alert>
                  <Alert color="success" outline className="w-full">
                    Your purchase has been confirmed!
                  </Alert>
                  <Alert type="warning" outline className="w-full">
                    Warning: Invalid email address!
                  </Alert>
                  <Alert type="error" outline className="w-full">
                    Error! Task failed successfully.
                  </Alert>
                </div>
                <div className="grid gap-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] opacity-60">
                    Dash
                  </div>
                  <Alert variant="info" dash className="w-full">
                    12 unread messages. Tap to see.
                  </Alert>
                  <Alert color="success" dash className="w-full">
                    Your purchase has been confirmed!
                  </Alert>
                  <Alert type="warning" dash className="w-full">
                    Warning: Invalid email address!
                  </Alert>
                  <Alert type="error" dash className="w-full">
                    Error! Task failed successfully.
                  </Alert>
                </div>
              </div>
            </div>
          )}
          code={`<Alert variant="info" soft className="w-full">12 unread messages. Tap to see.</Alert>
<Alert color="success" soft className="w-full">Your purchase has been confirmed!</Alert>
<Alert type="warning" soft className="w-full">Warning: Invalid email address!</Alert>
<Alert type="error" soft className="w-full">Error! Task failed successfully.</Alert>

<Alert variant="info" outline className="w-full">12 unread messages. Tap to see.</Alert>
<Alert color="success" outline className="w-full">Your purchase has been confirmed!</Alert>
<Alert type="warning" outline className="w-full">Warning: Invalid email address!</Alert>
<Alert type="error" outline className="w-full">Error! Task failed successfully.</Alert>

<Alert variant="info" dash className="w-full">12 unread messages. Tap to see.</Alert>
<Alert color="success" dash className="w-full">Your purchase has been confirmed!</Alert>
<Alert type="warning" dash className="w-full">Warning: Invalid email address!</Alert>
<Alert type="error" dash className="w-full">Error! Task failed successfully.</Alert>`}
        />

        <ExampleBlock
          title="操作区与响应式布局"
          summary="展示按钮 + 响应式布局示例，同时把操作区收敛到 action API。"
          tab={tabResponsive}
          preview={() => (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Alert
                  direction="vertical"
                  showIcon={true}
                  icon={<SparkIcon />}
                  className="w-full sm:alert-horizontal"
                  action={
                    <div className="join">
                      <Button size="sm" type="text" className="join-item">
                        Deny
                      </Button>
                      <Button size="sm" color="primary" className="join-item">
                        Accept
                      </Button>
                    </div>
                  }
                >
                  <span>we use cookies for no reason.</span>
                </Alert>
              </div>
            </div>
          )}
          code={`<Alert
  direction="vertical"
  showIcon={true}
  icon={<SparkIcon />}
  className="w-full sm:alert-horizontal"
  action={
    <div className="join">
      <Button size="sm" type="text" className="join-item">
        Deny
      </Button>
      <Button size="sm" color="primary" className="join-item">
        Accept
      </Button>
    </div>
  }
>
  <span>we use cookies for no reason.</span>
</Alert>`}
        />

        <ExampleBlock
          title="标题与描述"
          summary="把手写的标题描述示例组织为 title 和 description API，同时保持右侧动作按钮。"
          tab={tabMessage}
          preview={() => (
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <Alert
                  type="info"
                  title="New message!"
                  description="You have 1 unread message"
                  className="w-full sm:alert-horizontal"
                  action={<Button size="sm">See</Button>}
                />
              </div>
            </div>
          )}
          code={`<Alert
  type="info"
  title="New message!"
  description="You have 1 unread message"
  className="w-full sm:alert-horizontal"
  action={<Button size="sm">See</Button>}
/>`}
        />

        <ExampleBlock
          title="可关闭与 closeText"
          summary="closable、closeText、afterClose 适合一次性通知、操作反馈和可忽略提醒。"
          tab={tabClosable}
          preview={() => (
            <div className="card bg-base-100 shadow">
              <div className="card-body grid gap-3">
                <Alert
                  type="info"
                  title="Invite sent"
                  description="The invitation email has been delivered."
                  closable={true}
                  className="w-full"
                />
                <Alert
                  type="success"
                  description="Your billing settings have been saved."
                  closeText="知道了"
                  className="w-full"
                />
              </div>
            </div>
          )}
          code={`<Alert
  type="info"
  title="Invite sent"
  description="The invitation email has been delivered."
  closable={true}
  className="w-full"
/>

<Alert
  type="success"
  description="Your billing settings have been saved."
  closeText="知道了"
  className="w-full"
/>`}
        />

        <ExampleBlock
          title="横幅与自定义图标"
          summary="banner、showIcon 与 icon API 适合系统级公告与品牌化通知。"
          tab={tabBanner}
          preview={() => (
            <div className="card bg-base-100 shadow">
              <div className="card-body grid gap-3">
                <Alert
                  banner={true}
                  title="Scheduled maintenance"
                  description="Friday 23:00 - 01:00 UTC, analytics and exports may be delayed."
                  className="w-full"
                />
                <Alert
                  type="success"
                  showIcon={true}
                  icon={<ShieldIcon />}
                  title="Workspace protected"
                  description="Two-factor authentication is now enforced for all maintainers."
                  action={
                    <Button size="sm" type="text">
                      View policy
                    </Button>
                  }
                  className="w-full"
                />
              </div>
            </div>
          )}
          code={`<Alert
  banner={true}
  title="Scheduled maintenance"
  description="Friday 23:00 - 01:00 UTC, analytics and exports may be delayed."
  className="w-full"
/>

<Alert
  type="success"
  showIcon={true}
  icon={<ShieldIcon />}
  title="Workspace protected"
  description="Two-factor authentication is now enforced for all maintainers."
  action={<Button size="sm" type="text">View policy</Button>}
  className="w-full"
/>`}
        />

        <div className="my-10">
          <h2>API</h2>
          <p className="text-sm opacity-75">
            当前 Alert 同时支持 Rue 基础用法与常见业务组件心智，下面列出当前建议使用的核心属性。
          </p>
          <ApiTable rows={apiRows} />
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default AlertDemo
