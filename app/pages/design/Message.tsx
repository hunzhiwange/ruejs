import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import { Message } from '@rue-js/design'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import PreviewBlock, { type PreviewTabMode } from './PreviewBlock'

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

const DemoSurface: FC<{ minHeight?: string; content?: any }> = ({
  minHeight = '16rem',
  content,
}) => {
  return (
    <div className="not-prose rounded-[1.5rem] border border-base-300 bg-base-200/45 p-4 shadow-sm">
      <div
        className="relative overflow-hidden rounded-[1.25rem] border border-base-300 bg-base-100/90"
        style={{ minHeight }}
      >
        {content}
      </div>
    </div>
  )
}

const rootApiRows: ApiRow[] = [
  {
    prop: 'placement',
    description:
      '声明式容器定位，支持 top、top-start、top-end、bottom、bottom-start、bottom-end 与 center。',
    type: 'MessagePlacement',
    defaultValue: "'top'",
  },
  {
    prop: 'top / inset',
    description: 'top 是 message 常用的顶部偏移快捷写法；需要更细控制时可以直接传 inset。',
    type: 'number | string / ToastInset',
    defaultValue: '20 / -',
  },
  {
    prop: 'gap',
    description: '多条消息之间的间距，适合更密集或更舒展的消息节奏。',
    type: 'number | string',
    defaultValue: '10',
  },
  {
    prop: 'className / style / zIndex',
    description: '提供 Toast 根容器能力，适合把消息嵌进局部面板、工作台或示例盒子。',
    type: 'string / object / number | string',
    defaultValue: '-',
  },
]

const itemApiRows: ApiRow[] = [
  {
    prop: 'content / children',
    description: '主内容字段；未传 children 时会自动把 content 渲染进消息正文。',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'type',
    description: '支持 neutral、success、info、warning、error、loading 六种状态。',
    type: "'neutral' | 'success' | 'info' | 'warning' | 'error' | 'loading'",
    defaultValue: "'neutral'",
  },
  {
    prop: 'variant / icon / showIcon',
    description: '复用 Rue 当前轻提示视觉语气，并允许覆盖默认图标。',
    type: "'soft' | 'solid' | 'outline' / any / boolean",
    defaultValue: "'soft' / 自动判断",
  },
  {
    prop: 'duration / pauseOnHover',
    description: '自动关闭时长，单位秒；0 会保持打开，悬停默认暂停倒计时。',
    type: 'number | null / boolean',
    defaultValue: '实例默认值 / true',
  },
  {
    prop: 'action / closable / closeIcon',
    description: '补充轻量操作区与关闭按钮，适合回撤、查看详情或静默关闭。',
    type: 'any / boolean / any',
    defaultValue: '- / false / -',
  },
  {
    prop: 'onClose / onClick / className / style',
    description: '监听关闭、点击并定制单条消息样式。',
    type: 'function / function / string / object',
    defaultValue: '-',
  },
  {
    prop: 'key',
    description: '用于 open(config) 或静态 API 复用同一条消息并原位更新。',
    type: 'string | number',
    defaultValue: '自动生成',
  },
]

const instanceApiRows: ApiRow[] = [
  {
    prop: 'Message.useMessage(options)',
    description:
      '返回 [api, contextHolder]，适合把消息约束在局部容器内，并复用 placement、duration、maxCount 等默认值。',
    type: '(options) => [MessageInstance, any]',
    defaultValue: '-',
  },
  {
    prop: 'getContainer',
    description: '默认挂到 document.body；传 false 时会退回到 contextHolder 所在容器。',
    type: 'string | HTMLElement | (() => HTMLElement) | false',
    defaultValue: 'document.body',
  },
  {
    prop: 'open(config)',
    description: '创建或按 key 更新一条消息，返回可调用、可 then 的 MessageHandle。',
    type: '(config: MessageOpenConfig) => MessageHandle',
    defaultValue: '-',
  },
  {
    prop: 'success / info / warning / error / loading',
    description: '快捷方法支持 content、duration、onClose 三参数，也支持直接传配置对象。',
    type: '(...args) => MessageHandle',
    defaultValue: '-',
  },
  {
    prop: 'MessageHandle',
    description: '返回值同时是函数和 PromiseLike；关闭后 then 会 resolve，便于串接异步流程。',
    type: '(() => void) & PromiseLike<boolean>',
    defaultValue: '-',
  },
  {
    prop: 'destroy(key?)',
    description: '销毁指定 key；不传 key 时清空当前实例或全局静态实例下的消息。',
    type: '(key?: string | number) => void',
    defaultValue: '-',
  },
  {
    prop: 'Message.config(options)',
    description: '配置全局静态消息实例的 placement、top、duration、maxCount、closable 等默认值。',
    type: '(options: MessageConfigOptions) => void',
    defaultValue: '-',
  },
]

const declarativeCode = `import { Message } from '@rue-js/design'<div className="relative min-h-72 overflow-hidden rounded-[1.25rem] border border-base-300">
  <Message className="absolute" placement="top" top={16} gap={12}>
    <Message.Item type="success" content="发布完成，静态资源已刷新。" />
    <Message.Item type="info" content="设计规范已同步到内容工作台。" />
    <Message.Item type="warning" content="还有 2 条检查项等待确认。" closable />
  </Message>
</div>`

const richCode = `import { Message } from '@rue-js/design'<div className="grid gap-4">
  <Message.Item
    type="success"
    content={
      <div className="flex items-center gap-3">
        <span className="font-medium">Workspace synced</span>
        <span className="badge badge-success badge-outline badge-sm">v2.8</span>
      </div>
    }
    action={<button type="button" className="btn btn-xs rounded-full">查看变更</button>}
    closable
  />

  <Message.Item
    type="warning"
    variant="outline"
    content="Review pending. 还有 2 个确认项等待处理。"
    action={<span className="badge badge-warning badge-sm">2 items</span>}
    closable
  />
</div>`

const hookCode = `import { Message } from '@rue-js/design'
const [messageApi, contextHolder] = Message.useMessage({
  getContainer: false,
  placement: 'top-end',
  top: 12,
  maxCount: 3,
  gap: 12,
  duration: 3,
  closable: true,
})

<div className="relative min-h-80 overflow-hidden rounded-[1.25rem] border border-base-300">
  {contextHolder}

  <button
    type="button"
    onClick={() => {
      messageApi.loading({
        key: 'sync-flow',
        content: '正在同步 design tokens...',
        duration: 0,
      })
    }}
  >
    open loading
  </button>

  <button
    type="button"
    onClick={() => {
      messageApi.success({
        key: 'sync-flow',
        content: '同步完成，缓存已刷新。',
        duration: 2,
      })
    }}
  >
    update by key
  </button>
</div>`

const promiseCode = `import { Message } from '@rue-js/design'
const [messageApi, contextHolder] = Message.useMessage({
  getContainer: false,
  placement: 'bottom-start',
  inset: { x: 12, y: 80 },
  maxCount: 2,
})

const hide = messageApi.loading({
  key: 'sync-task',
  content: 'Syncing assets...',
  duration: 0,
})

hide.then(() => {
  messageApi.success({
    key: 'sync-task-done',
    content: 'Sync finished. Promise-like handle resolved.',
    duration: 2,
  })
})

hide()`

type MessageCloseHandle = ReturnType<(typeof Message)['loading']>

const MessageUseMessagePreview: FC = () => {
  const hookExtraSeed = ref(0)

  const [hookApi, hookHolder] = Message.useMessage({
    getContainer: false,
    placement: 'top-end',
    top: 12,
    maxCount: 3,
    gap: 12,
    className: 'absolute',
    duration: 3,
    closable: true,
  })

  return (
    <DemoSurface
      minHeight="20rem"
      content={
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_color-mix(in_srgb,var(--color-info)_16%,transparent),_transparent_38%),radial-gradient(circle_at_bottom_left,_color-mix(in_srgb,var(--color-success)_18%,transparent),_transparent_36%)]" />
          {hookHolder}
          <div className="absolute inset-x-4 top-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-sm rounded-full"
              onClick={() => {
                hookApi.loading({
                  key: 'sync-flow',
                  content: '正在同步 design tokens...',
                  duration: 0,
                })
              }}
            >
              open loading
            </button>
            <button
              type="button"
              className="btn btn-sm rounded-full"
              onClick={() => {
                hookApi.success({
                  key: 'sync-flow',
                  content: '同步完成，缓存已刷新。',
                  duration: 2,
                })
              }}
            >
              update by key
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost rounded-full"
              onClick={() => {
                hookExtraSeed.value += 1
                hookApi.warning({
                  key: `review-${hookExtraSeed.value}`,
                  content: `审阅提醒 #${hookExtraSeed.value}`,
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
                hookApi.destroy('sync-flow')
              }}
            >
              destroy key
            </button>
          </div>
          <div className="absolute inset-x-4 bottom-4 rounded-[1rem] border border-base-300 bg-base-100/85 px-4 py-3 text-sm text-base-content/70 backdrop-blur">
            点击上方按钮后，消息会留在当前示例盒子内，并支持同 key 更新与局部销毁。
          </div>
        </>
      }
    />
  )
}

const MessagePromiseHandlePreview: FC = () => {
  const promiseBatch = ref(0)
  const activePromiseHandle = ref<MessageCloseHandle | undefined>(undefined)

  const [promiseApi, promiseHolder] = Message.useMessage({
    getContainer: false,
    placement: 'bottom-start',
    inset: { x: 12, y: 80 },
    maxCount: 2,
    gap: 12,
    className: 'absolute',
    closable: true,
  })

  return (
    <DemoSurface
      minHeight="18rem"
      content={
        <>
          <div className="absolute inset-x-4 top-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-sm rounded-full"
              onClick={() => {
                activePromiseHandle.value?.()
                promiseBatch.value += 1
                const currentBatch = promiseBatch.value
                const handle = promiseApi.loading({
                  key: 'promise-flow',
                  content: (
                    <span className="inline-flex items-center gap-2">
                      <span className="font-medium">正在发布批次 #{currentBatch}</span>
                      <span className="badge badge-ghost badge-sm">await close</span>
                    </span>
                  ),
                  duration: 0,
                })

                activePromiseHandle.value = handle

                handle.then(() => {
                  promiseApi.success({
                    key: `promise-flow-done-${currentBatch}`,
                    content: `批次 #${currentBatch} 已完成，promise 已 resolve。`,
                    duration: 2,
                  })
                })
              }}
            >
              开始批次
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline rounded-full"
              onClick={() => {
                activePromiseHandle.value?.()
                activePromiseHandle.value = undefined
              }}
            >
              完成批次
            </button>
          </div>
          {promiseHolder}
          <div className="absolute inset-x-4 bottom-4 rounded-[1rem] border border-base-300 bg-base-100/85 px-4 py-3 text-sm text-base-content/70 backdrop-blur">
            点击“开始批次”创建 loading handle，再点击“完成批次”观察 then resolve。
          </div>
        </>
      }
    />
  )
}

const staticCode = `import { Message } from '@rue-js/design'Message.config({
  placement: 'top',
  top: 88,
  maxCount: 3,
  duration: 3,
  closable: true,
})

Message.loading({
  key: 'release-board',
  content: '发布批次 #12 正在打包...',
  duration: 0,
})

Message.success({
  key: 'release-board',
  content: '发布完成，CDN 已刷新。',
  duration: 2,
})`

const MessagePage: FC = () => {
  const tabs = {
    declarative: ref<PreviewTabMode>('preview'),
    rich: ref<PreviewTabMode>('preview'),
    hook: ref<PreviewTabMode>('preview'),
    promise: ref<PreviewTabMode>('preview'),
    staticApi: ref<PreviewTabMode>('preview'),
  }

  const globalSeed = ref(0)

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Message 全局提示</h1>
        <p>
          Rue 现在把原先散在 Toast 里的 message-like 体验收敛成真正的 Message 组件：使用 Rue
          更轻、更贴近页面内容的视觉语气，但把消息组件常用的执行逻辑一次覆盖，包含 静态
          open、语义快捷方法、useMessage、局部 holder、按 key 更新、maxCount、Promise-like close
          handle 和全局 config。
        </p>

        <div className="not-prose mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/45 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">Core API</div>
            <div className="mt-2 text-base font-semibold">open / useMessage / config</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              既能直接静态调用，也能在局部容器内管理消息流。
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/45 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">
              Flow Control
            </div>
            <div className="mt-2 text-base font-semibold">key 更新、maxCount、thenable</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              适合把“处理中 → 成功 / 失败”的短反馈串成真正可执行的异步流程。
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/45 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">
              Visual Tone
            </div>
            <div className="mt-2 text-base font-semibold">Rue 的轻浮层，而不是通知卡片</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              使用 Rue 的轻提示语言，但把 content、icon、action、closable 都开放给业务层。
            </p>
          </div>
        </div>

        <h2>何时使用</h2>
        <ul>
          <li>需要比 Toast 更明确的 message API，但又不想把反馈组织成 Notification 卡片。</li>
          <li>希望在按钮事件或异步流程里直接触发成功、失败、加载、警告等短反馈。</li>
          <li>同一条消息需要按 key 从“处理中”更新到“完成”，并限制最大同时显示数量。</li>
          <li>希望使用 Rue 自己的轻量视觉，同时补充成熟 message 组件的执行逻辑。</li>
        </ul>

        <PreviewBlock
          title="声明式消息栈"
          summary="把原先 Toast 里的 message-likeDemo 收敛到真正的 Message / Message.Item API。"
          tab={tabs.declarative}
          code={declarativeCode}
          preview={() => (
            <DemoSurface
              minHeight="18rem"
              content={
                <>
                  <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-r from-success/12 via-info/10 to-warning/12" />
                  <div className="absolute inset-x-4 bottom-4 rounded-[1rem] border border-base-300 bg-base-100/75 px-4 py-3 text-sm text-base-content/65 backdrop-blur">
                    当前是内容工作台，消息作为更轻的流程反馈悬浮在页面之上。
                  </div>
                  <Message className="absolute" placement="top" top={16} gap={12}>
                    <Message.Item type="success" content="发布完成，静态资源已刷新。" />
                    <Message.Item type="info" content="设计规范已同步到内容工作台。" />
                    <Message.Item type="warning" content="还有 2 条检查项等待确认。" closable />
                  </Message>
                </>
              }
            />
          )}
        />

        <PreviewBlock
          title="富内容、操作区与自定义图标"
          summary="保持短反馈定位不变，但 content 可以直接承载 JSX，action、closable、icon 与 variant 都能往上提。"
          tab={tabs.rich}
          code={richCode}
          preview={() => (
            <div className="grid gap-4 not-prose">
              <Message.Item
                type="success"
                content={
                  <div className="flex items-center gap-3">
                    <span className="font-medium">Workspace synced</span>
                    <span className="badge badge-success badge-outline badge-sm">v2.8</span>
                  </div>
                }
                action={
                  <button type="button" className="btn btn-xs rounded-full">
                    查看变更
                  </button>
                }
                closable
              />
              <Message.Item
                type="warning"
                variant="outline"
                content="Review pending. 还有 2 个确认项等待处理。"
                action={<span className="badge badge-warning badge-sm">2 items</span>}
                closable
              />
              <Message.Item
                type="loading"
                variant="solid"
                icon={<span className="text-sm font-black">R</span>}
                content="Packaging docs bundle..."
                duration={0}
              />
            </div>
          )}
        />

        <PreviewBlock
          title="Message.useMessage"
          summary="把 contextHolder 放进当前面板后，消息就能稳定留在局部 box 内，并支持按 key 更新。"
          tab={tabs.hook}
          code={hookCode}
          preview={MessageUseMessagePreview}
        />

        <PreviewBlock
          title="Promise-like close handle"
          summary="loading 返回值既可以直接调用关闭，也可以用 then 串起“关闭后再提示完成”的执行逻辑。"
          tab={tabs.promise}
          code={promiseCode}
          preview={MessagePromiseHandlePreview}
        />

        <PreviewBlock
          title="静态 API 与全局配置"
          summary="这组按钮会把消息直接挂到 document.body；适合最简单的业务回调、发布流程和无需显式 holder 的路径。"
          tab={tabs.staticApi}
          code={staticCode}
          preview={() => (
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
                    Message.config({
                      placement: 'top',
                      top: 88,
                      maxCount: 3,
                      duration: 3,
                      closable: true,
                    })
                    Message.loading({
                      key: 'release-board',
                      content: `发布批次 #${globalSeed.value} 正在打包...`,
                      duration: 0,
                    })
                  }}
                >
                  open global
                </button>
                <button
                  type="button"
                  className="btn btn-sm rounded-full"
                  onClick={() => {
                    Message.success({
                      key: 'release-board',
                      content: '发布完成，CDN 已刷新。',
                      duration: 2,
                    })
                  }}
                >
                  update global
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost rounded-full"
                  onClick={() => {
                    Message.warning({
                      key: `queued-${globalSeed.value}`,
                      content: '另一个排队中的任务已入列。',
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
                    Message.destroy()
                  }}
                >
                  destroy all
                </button>
              </div>
              <p className="mt-4 mb-0 text-sm text-base-content/65">
                当前演示会把全局静态消息固定到页面顶部 88px，并把最大并发数限制为 3。
              </p>
            </div>
          )}
        />

        <h2>API</h2>
        <h3>Message</h3>
        <ApiTable rows={rootApiRows} />

        <h3>Message.Item / open(config)</h3>
        <ApiTable rows={itemApiRows} />

        <h3>useMessage / static methods</h3>
        <ApiTable rows={instanceApiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default MessagePage
