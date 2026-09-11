import { ref, type FC } from '@rue-js/rue'
import { Notification, Stack } from '@rue-js/design'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import PreviewBlock, { type PreviewTabMode } from './PreviewBlock'

interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
}

interface PlacementExample {
  placement: 'top' | 'topLeft' | 'topRight' | 'bottom' | 'bottomLeft' | 'bottomRight'
  title: string
  description: string
  type: 'info' | 'success' | 'warning' | 'error'
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

const DemoSurface: FC<{ minHeight?: string; children?: any }> = ({
  minHeight = '15rem',
  children,
}) => {
  return (
    <div className="not-prose rounded-[1.5rem] border border-base-300 bg-base-200/45 p-4 shadow-sm">
      <div
        className="relative overflow-hidden rounded-[1.25rem] border border-base-300 bg-base-100/90"
        style={{ minHeight }}
      >
        {children}
      </div>
    </div>
  )
}

const placementExamples: PlacementExample[] = [
  {
    placement: 'topLeft',
    title: 'topLeft',
    description: '左上角适合流程启动和任务创建类通知。',
    type: 'info',
  },
  {
    placement: 'top',
    title: 'top',
    description: '居中顶部适合广播类提醒。',
    type: 'success',
  },
  {
    placement: 'topRight',
    title: 'topRight',
    description: '右上角最接近常见通知中心默认位。',
    type: 'warning',
  },
  {
    placement: 'bottomLeft',
    title: 'bottomLeft',
    description: '左下角适合局部工作台里的长任务反馈。',
    type: 'error',
  },
  {
    placement: 'bottom',
    title: 'bottom',
    description: '底部居中适合跨栏提示或多列页面。',
    type: 'info',
  },
  {
    placement: 'bottomRight',
    title: 'bottomRight',
    description: '底部右侧适合和抽屉、检视面板搭配。',
    type: 'success',
  },
]

const rootApiRows: ApiRow[] = [
  {
    prop: 'placement',
    description:
      '声明式容器的定位方向，支持 top / topLeft / topRight / bottom / bottomLeft / bottomRight。',
    type: 'NotificationPlacement',
    defaultValue: "'topRight'",
  },
  {
    prop: 'inline',
    description: '把容器从 fixed 改为 absolute，适合嵌进卡片、工作台或示例盒子中。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'top / bottom',
    description: '控制顶部或底部偏移量，符合常见通知容器的定位方式。',
    type: 'number | string',
    defaultValue: '24',
  },
  {
    prop: 'gap',
    description: '多条通知之间的垂直间距。',
    type: 'number | string',
    defaultValue: '14',
  },
  {
    prop: 'maxWidth',
    description: '覆盖单条通知的最大宽度，适合窄侧栏或信息密度更高的场景。',
    type: 'number | string',
    defaultValue: '26rem',
  },
  {
    prop: 'zIndex',
    description: '调整通知层级，避免被弹层、吸顶头部或蒙层压住。',
    type: 'number | string',
    defaultValue: '70',
  },
]

const itemApiRows: ApiRow[] = [
  {
    prop: 'title / message',
    description: '主标题字段；保持 message 别名，同时支持更语义化的 title。',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'description',
    description: '补充说明文字，可承载多行上下文。',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'actions / btn',
    description: '底部操作区，保持 btn 别名，适合放按钮、badge 或链接。',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'type / variant',
    description: '语义类型与视觉样式，控制颜色、图标和存在感。',
    type: "'success' | 'info' | 'warning' | 'error' / 'soft' | 'solid' | 'outline'",
    defaultValue: "'soft'",
  },
  {
    prop: 'closable / closeIcon',
    description: '是否显示关闭按钮，也支持对象形式自定义图标、标签和局部 onClose。',
    type: 'boolean | NotificationClosableConfig / any',
    defaultValue: 'false / -',
  },
  {
    prop: 'duration / pauseOnHover',
    description: '自动关闭时长，单位秒；悬停时可暂停剩余计时。',
    type: 'number | false | null / boolean',
    defaultValue: '4.5 / true',
  },
  {
    prop: 'showProgress / showIcon',
    description: '显示剩余时间进度条，或显式控制默认图标渲染。',
    type: 'boolean',
    defaultValue: 'false / 自动判断',
  },
  {
    prop: 'classNames / styles',
    description:
      '按 root、icon、title、description、actions、progress、close 粒度覆盖语义节点样式。',
    type: 'object',
    defaultValue: '-',
  },
  {
    prop: 'open / defaultOpen / onOpenChange / onClose',
    description: '支持受控与非受控两种显示模式，并返回 close 或 timeout 的关闭来源。',
    type: 'boolean / boolean / function / function',
    defaultValue: 'undefined / true / - / -',
  },
]

const instanceApiRows: ApiRow[] = [
  {
    prop: 'Notification.useNotification(options)',
    description: '返回 [api, contextHolder]，支持局部容器、默认配置、maxCount 和 key 更新。',
    type: '(options) => [NotificationInstance, any]',
    defaultValue: '-',
  },
  {
    prop: 'getContainer',
    description: '默认挂到 document.body；传 false 时退回到 contextHolder 所在盒子。',
    type: 'string | HTMLElement | (() => HTMLElement | ShadowRoot) | false',
    defaultValue: 'document.body',
  },
  {
    prop: 'open(config)',
    description: '创建或按 key 更新一条通知，返回销毁当前 key 的函数。',
    type: '(config: NotificationArgsProps) => () => void',
    defaultValue: '-',
  },
  {
    prop: 'success / info / warning / error',
    description: '静态快捷方法，等价于 open({ type, ...config })。',
    type: '(config) => () => void',
    defaultValue: '-',
  },
  {
    prop: 'destroy(key?)',
    description: '销毁指定 key；不传 key 时清空当前实例下所有通知。',
    type: '(key?: string | number) => void',
    defaultValue: '-',
  },
  {
    prop: 'Notification.config(options)',
    description: '配置全局静态通知实例的 placement、maxCount、duration、showProgress 等默认值。',
    type: '(options: NotificationGlobalConfig) => void',
    defaultValue: '-',
  },
]

const stackedCode = `import { Notification, Stack } from '@rue-js/design'<Stack className="h-56 w-full max-w-lg" reverse>
  <div className="h-full">
    <Notification.Item
      className="h-full"
      title="Notification 1"
      description="You have 3 unread messages. Tap here to see."
    />
  </div>
  <div className="h-full">
    <Notification.Item
      className="h-full"
      title="Notification 2"
      description="Deploy finished successfully. Tap here to open the report."
    />
  </div>
  <div className="h-full">
    <Notification.Item
      className="h-full"
      type="success"
      title="Notification 3"
      description="Latest release is live. Tap here to share the changelog."
    />
  </div>
</Stack>`

const richCode = `import { Notification } from '@rue-js/design'<div className="grid gap-4">
  <Notification.Item
    type="info"
    message="Workspace synced"
    description="All draft edits have been pushed to the shared workspace."
    actions={<button type="button" className="btn btn-xs rounded-full">Open workspace</button>}
    showProgress
    duration={4}
    closable
  />

  <Notification.Item
    type="warning"
    variant="outline"
    title="Review pending"
    description="Two checklist items still need acknowledgement before merge."
    btn={<button type="button" className="btn btn-xs btn-ghost rounded-full">稍后处理</button>}
    closable={{ label: '关闭审核提醒' }}
  />
</div>`

const placementCode = `import { Notification } from '@rue-js/design'<Notification inline placement="bottomRight" top={12} bottom={12}>
  <Notification.Item
    type="success"
    title="bottomRight"
    description="Bottom-right works well with side panels and inspect drawers."
    closable
  />
</Notification>`

const hookCode = `import { Notification } from '@rue-js/design'
const [notificationApi, contextHolder] = Notification.useNotification({
  getContainer: false,
  placement: 'topRight',
  maxCount: 3,
  showProgress: true,
  closable: true,
})

<div className="relative min-h-80 overflow-hidden rounded-3xl border border-base-300">
  {contextHolder}
  <button
    type="button"
    onClick={() => {
      notificationApi.info({
        key: 'publish-flow',
        message: 'Draft synced',
        description: 'The latest content has been saved to the release branch.',
        duration: 4,
      })
    }}
  >
    open
  </button>
  <button
    type="button"
    onClick={() => {
      notificationApi.success({
        key: 'publish-flow',
        title: 'Publish complete',
        description: 'All checks passed and traffic has been switched.',
        duration: 3,
      })
    }}
  >
    update by key
  </button>
</div>`

const staticCode = `import { Notification } from '@rue-js/design'Notification.config({
  placement: 'topRight',
  maxCount: 3,
  top: 88,
  showProgress: true,
})

Notification.success({
  key: 'release-board',
  message: 'Build queued',
  description: 'Static methods mount to document.body by default.',
})

Notification.open({
  key: 'release-board',
  type: 'success',
  title: 'Release is live',
  description: 'Reuse the same key to update the current notice in place.',
})`

const NotificationHookDemo: FC = () => {
  const extraSeed = ref(0)
  const [localApi, localHolder] = Notification.useNotification({
    getContainer: false,
    placement: 'topRight',
    maxCount: 3,
    showProgress: true,
    closable: true,
    maxWidth: '21rem',
    top: 12,
    gap: 12,
  })

  return (
    <DemoSurface minHeight="20rem">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_color-mix(in_srgb,var(--color-info)_18%,transparent),_transparent_42%),radial-gradient(circle_at_bottom_right,_color-mix(in_srgb,var(--color-success)_18%,transparent),_transparent_40%)]" />
      <>{localHolder}</>
      <div className="absolute inset-x-4 bottom-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-sm rounded-full"
          onClick={() => {
            localApi.info({
              key: 'publish-flow',
              message: 'Draft synced',
              description: 'The latest content has been saved to the release branch.',
              duration: 4,
            })
          }}
        >
          open
        </button>
        <button
          type="button"
          className="btn btn-sm rounded-full"
          onClick={() => {
            localApi.success({
              key: 'publish-flow',
              title: 'Publish complete',
              description: 'All checks passed and traffic has been switched.',
              duration: 3,
            })
          }}
        >
          update by key
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost rounded-full"
          onClick={() => {
            extraSeed.value += 1
            localApi.warning({
              key: `extra-${extraSeed.value}`,
              title: `Review note ${extraSeed.value}`,
              description: 'A separate notice can coexist until maxCount trims the oldest one.',
              duration: 0,
            })
          }}
        >
          add another
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost rounded-full"
          onClick={() => {
            localApi.destroy('publish-flow')
          }}
        >
          destroy key
        </button>
      </div>
    </DemoSurface>
  )
}

const NotificationStaticApiDemo: FC = () => {
  const globalSeed = ref(0)

  return (
    <div className="not-prose rounded-[1.5rem] border border-base-300 bg-base-100 p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="badge badge-ghost badge-sm">Global static API</span>
        <span className="text-sm text-base-content/60">当前种子 {globalSeed.value}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-sm rounded-full"
          onClick={() => {
            globalSeed.value += 1
            Notification.config({
              placement: 'topRight',
              top: 88,
              maxCount: 3,
              showProgress: true,
            })
            Notification.info({
              key: 'release-board',
              message: `Build queued #${globalSeed.value}`,
              description: 'Static methods mount to document.body by default.',
              duration: 4,
            })
          }}
        >
          open global
        </button>
        <button
          type="button"
          className="btn btn-sm rounded-full"
          onClick={() => {
            Notification.open({
              key: 'release-board',
              type: 'success',
              title: 'Release is live',
              description: 'Reuse the same key to update the current notice in place.',
              duration: 3,
            })
          }}
        >
          update global
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost rounded-full"
          onClick={() => {
            Notification.warning({
              message: 'Muted reminder',
              description:
                'A second notice will be trimmed automatically once maxCount is reached.',
              duration: 0,
            })
          }}
        >
          open another
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost rounded-full"
          onClick={() => {
            Notification.destroy()
          }}
        >
          destroy all
        </button>
      </div>
    </div>
  )
}

const NotificationPage: FC = () => {
  const tabs = {
    stacked: ref<PreviewTabMode>('preview'),
    rich: ref<PreviewTabMode>('preview'),
    placement: ref<PreviewTabMode>('preview'),
    hook: ref<PreviewTabMode>('preview'),
    staticApi: ref<PreviewTabMode>('preview'),
  }

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Notification 通知提醒框</h1>
        <p>
          Rue 现在补上了独立的 Notification 组件，不再只能借 Toast 或 Stack 手工拼通知卡片。
          组件保持 Rue 自己更轻、更贴近页面内容的视觉语气，同时把通知组件
          常用的执行逻辑一次覆盖：静态 open、语义快捷方法、按 key 更新、全局配置、局部 holder、六向
          placement、关闭按钮、自动关闭和进度条都已经可以直接使用。
        </p>

        <div className="not-prose mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/45 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">Core API</div>
            <div className="mt-2 text-base font-semibold">open / useNotification / config</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              既支持静态调用，也支持局部容器内的实例化通知流。
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/45 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">Placement</div>
            <div className="mt-2 text-base font-semibold">top / corners / bottom</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              六向定位和 top、bottom 偏移量保持了成熟通知系统的使用心智。
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/45 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">Behavior</div>
            <div className="mt-2 text-base font-semibold">key 更新、进度条、悬停暂停</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              适合异步任务、发布流程和工作台里的高频状态反馈。
            </p>
          </div>
        </div>

        <h2>何时使用</h2>
        <ul>
          <li>需要比 Toast 更完整的通知语义和更稳定的实例管理。</li>
          <li>希望在事件处理函数里直接触发全局或局部通知，而不是手动维护通知数组。</li>
          <li>同一条通知需要按 key 从“处理中”更新到“成功”或“失败”。</li>
          <li>需要保持当前静态通知卡片示例，同时把它组织成真实可执行的组件 API。</li>
        </ul>

        <PreviewBlock
          title="通知堆叠"
          summary="展示Stack 页面里的通知卡片示例，但现在直接由 Notification.Item 承载内容语义。"
          tab={tabs.stacked}
          code={stackedCode}
          preview={() => (
            <div className="not-prose rounded-[1.5rem] border border-base-300 bg-base-100 p-5 shadow-sm">
              <Stack className="h-56 w-full max-w-lg" reverse>
                <div className="h-full">
                  <Notification.Item
                    className="h-full"
                    title="Notification 1"
                    description="You have 3 unread messages. Tap here to see."
                  />
                </div>
                <div className="h-full">
                  <Notification.Item
                    className="h-full"
                    title="Notification 2"
                    description="Deploy finished successfully. Tap here to open the report."
                  />
                </div>
                <div className="h-full">
                  <Notification.Item
                    className="h-full"
                    type="success"
                    title="Notification 3"
                    description="Latest release is live. Tap here to share the changelog."
                  />
                </div>
              </Stack>
            </div>
          )}
        />

        <PreviewBlock
          title="语义类型、操作区与进度条"
          summary="使用 Rue 的卡片感，但 message/title、actions/btn、progress、closable 等能力都已经补充。"
          tab={tabs.rich}
          code={richCode}
          preview={() => (
            <div className="grid gap-4 not-prose">
              <Notification.Item
                type="info"
                message="Workspace synced"
                description="All draft edits have been pushed to the shared workspace."
                actions={
                  <button type="button" className="btn btn-xs rounded-full">
                    Open workspace
                  </button>
                }
                showProgress
                duration={4}
                closable
              />
              <Notification.Item
                type="warning"
                variant="outline"
                title="Review pending"
                description="Two checklist items still need acknowledgement before merge."
                btn={
                  <button type="button" className="btn btn-xs btn-ghost rounded-full">
                    稍后处理
                  </button>
                }
                closable={{ label: '关闭审核提醒' }}
              />
              <Notification.Item
                type="success"
                variant="solid"
                title="Release is live"
                description="The changelog has been published and the share card is ready."
                actions={<span className="badge badge-neutral badge-sm">v2.7</span>}
                closable
              />
            </div>
          )}
        />

        <PreviewBlock
          title="六向定位"
          summary="声明式容器既可以挂在页面层，也可以通过 inline 嵌进任意面板或示例盒子。"
          tab={tabs.placement}
          code={placementCode}
          preview={() => (
            <div className="grid gap-5 not-prose">
              {placementExamples.map(example => (
                <DemoSurface key={example.placement} minHeight="14rem">
                  <>
                    <div className="absolute left-3 top-3 badge badge-ghost badge-sm">
                      {example.placement}
                    </div>
                    <Notification inline placement={example.placement} top={12} bottom={12}>
                      <Notification.Item
                        type={example.type}
                        title={example.title}
                        description={example.description}
                        closable
                      />
                    </Notification>
                  </>
                </DemoSurface>
              ))}
            </div>
          )}
        />

        <PreviewBlock
          title="useNotification 局部容器与按 key 更新"
          summary="通过实例模式把通知约束在当前示例盒子里，方便工作台和局部面板使用。"
          tab={tabs.hook}
          code={hookCode}
          preview={() => <NotificationHookDemo />}
        />

        <PreviewBlock
          title="静态 API"
          summary="点击后会直接把通知挂到页面右上角；这条路径适合最简单的业务回调和异步流程反馈。"
          tab={tabs.staticApi}
          code={staticCode}
          preview={() => <NotificationStaticApiDemo />}
        />

        <h2>API</h2>
        <h3>Notification</h3>
        <ApiTable rows={rootApiRows} />

        <h3>Notification.Item</h3>
        <ApiTable rows={itemApiRows} />

        <h3>useNotification / static methods</h3>
        <ApiTable rows={instanceApiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default NotificationPage
