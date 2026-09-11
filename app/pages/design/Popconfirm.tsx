import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import { Popconfirm } from '@rue-js/design'
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

const apiRows: ApiRow[] = [
  {
    prop: 'title / description / icon',
    description: '确认层的主要文案与图标；支持字符串、JSX 或函数返回节点。',
    type: 'any',
    defaultValue: '- / - / 内置告警图标',
  },
  {
    prop: 'open / defaultOpen / onOpenChange',
    description: '支持受控与非受控开合，适合把确认步骤挂到外部流程或状态机。',
    type: 'boolean / boolean / (open: boolean) => void',
    defaultValue: 'false / false / -',
  },
  {
    prop: 'onConfirm / onCancel',
    description: '确认与取消回调；当 onConfirm 返回 Promise 时，会自动进入确认按钮 loading。',
    type: '(event?) => void | boolean | Promise<unknown> / (event?) => void',
    defaultValue: '- / -',
  },
  {
    prop: 'okText / cancelText / showCancel / okType',
    description: '控制操作文案、是否显示取消按钮，以及确认按钮视觉语义。',
    type: 'any / any / boolean / PopconfirmOkType',
    defaultValue: '确认 / 取消 / true / primary',
  },
  {
    prop: 'okButtonProps / cancelButtonProps',
    description: '进一步定制按钮尺寸、危险态、图标、loading 图标和自定义 className。',
    type: 'PopconfirmButtonProps',
    defaultValue: '-',
  },
  {
    prop: 'trigger / placement / arrow',
    description: '支持 click、focus、hover、contextMenu，以及常见四边和角落定位、箭头居中。',
    type: 'PopconfirmTrigger | PopconfirmTrigger[] / PopconfirmPlacement / boolean | { pointAtCenter?: boolean }',
    defaultValue: 'click / top / true',
  },
  {
    prop: 'overlayClassName / overlayStyle / classNames / styles',
    description: '浮层容器与语义分区样式扩展，适合在设计页或业务皮肤里细调。',
    type: 'string / Record<string, any> / PopconfirmClassNames / PopconfirmStyles',
    defaultValue: '-',
  },
  {
    prop: 'disabled / onPopupClick',
    description: '禁用确认层，或在面板内部点击时接收事件，便于埋点和联动。',
    type: 'boolean / (event: MouseEvent) => void',
    defaultValue: 'false / -',
  },
]

const basicCode = `import { Popconfirm } from '@rue-js/design'<div className="grid gap-4 lg:grid-cols-3">
  <Popconfirm
    title="确认归档这条记录？"
    description="归档后仍可在历史列表中恢复。"
    okText="确认归档"
    cancelText="先等等"
  >
    <button className="btn btn-outline">Archive</button>
  </Popconfirm>

  <Popconfirm
    title="删除这个分组？"
    description="删除后将同时移除下面的成员绑定。"
    okText="立即删除"
    okType="danger"
    cancelText="保持分组"
  >
    <button className="btn btn-soft btn-error">Delete group</button>
  </Popconfirm>

  <Popconfirm
    title="确认继续"
    description="这个动作不会再二次提醒。"
    showCancel={false}
    okText="我知道了"
  >
    <button className="btn btn-soft">Single action</button>
  </Popconfirm>
</div>`

const controlledCode = `import { ref } from '@rue-js/rue'
import { Popconfirm } from '@rue-js/design'
const controlledOpen = ref(false)
const approveCount = ref(0)

<div className="space-y-4">
  <div className="flex flex-wrap gap-3">
    <button className="btn btn-primary" onClick={() => (controlledOpen.value = true)}>
      Open from toolbar
    </button>
    <button className="btn btn-ghost" onClick={() => (controlledOpen.value = false)}>
      Force close
    </button>
  </div>

  <Popconfirm
    open={controlledOpen.value}
    title="同步审批意见？"
    description="这个确认层完全由外部状态控制。"
    onOpenChange={nextOpen => {
      controlledOpen.value = nextOpen
    }}
    onConfirm={() => {
      approveCount.value += 1
      controlledOpen.value = false
    }}
    onCancel={() => {
      controlledOpen.value = false
    }}
  >
    <button className="btn btn-outline">Controlled trigger</button>
  </Popconfirm>
</div>`

const asyncCode = `import { ref } from '@rue-js/rue'
import { Popconfirm } from '@rue-js/design'
const publishStatus = ref('等待发布')

<Popconfirm
  title="发布到生产环境？"
  description="确认后会执行 CDN 预热和灰度切流。"
  okText="开始发布"
  cancelText="再检查一下"
  okButtonProps={{ iconPlacement: 'end' }}
  onConfirm={() => {
    publishStatus.value = '发布中...'
    return new Promise(resolve => {
      window.setTimeout(() => {
        publishStatus.value = '已完成灰度切流'
        resolve(true)
      }, 1200)
    })
  }}
>
  <button className="btn btn-primary">Publish build</button>
</Popconfirm>`

const triggerCode = `import { Popconfirm } from '@rue-js/design'<div className="grid gap-4 xl:grid-cols-3">
  <Popconfirm trigger="focus" title="离开输入框前确认？" description="适合补充最后一步确认。">
    <input className="input input-bordered w-full" placeholder="Focus trigger" />
  </Popconfirm>

  <Popconfirm trigger="contextMenu" placement="rightTop" title="右键也可以确认" description="适合表格行或画布对象操作。">
    <button className="btn btn-soft w-full">Right click me</button>
  </Popconfirm>

  <Popconfirm trigger={['hover', 'click']} placement="bottomRight" arrow={{ pointAtCenter: true }} title="混合触发" description="hover 可预热，click 再明确确认。">
    <button className="btn btn-outline w-full">Hover + click</button>
  </Popconfirm>
</div>`

const placementCode = `import { Popconfirm } from '@rue-js/design'<div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
  <Popconfirm open={true} placement="topLeft" title="Top left" description="贴合起始边。" className="justify-self-start">
    <button className="btn">Top left</button>
  </Popconfirm>

  <Popconfirm open={true} placement="bottomRight" title="Bottom right" description="适合工具条尾部操作。" className="justify-self-start">
    <button className="btn">Bottom right</button>
  </Popconfirm>

  <Popconfirm open={true} placement="leftTop" title="Left top" description="适合桌面端列表旁操作。" className="justify-self-start">
    <button className="btn">Left top</button>
  </Popconfirm>

  <Popconfirm open={true} placement="rightBottom" title="Right bottom" description="适合卡片角落动作。" className="justify-self-start">
    <button className="btn">Right bottom</button>
  </Popconfirm>
</div>`

const ControlledPopconfirmPreview: FC = () => {
  const controlledOpen = ref(false)
  const controlledChanges = ref(0)
  const approveCount = ref(0)

  return (
    <div className="space-y-4 not-prose">
      <div className="flex flex-wrap gap-3">
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => (controlledOpen.value = true)}
        >
          Open from toolbar
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => (controlledOpen.value = false)}
        >
          Force close
        </button>
      </div>

      <Popconfirm
        open={controlledOpen.value}
        title="同步审批意见？"
        description="这个确认层完全由外部状态控制。"
        okText="确认同步"
        cancelText="稍后再说"
        onOpenChange={nextOpen => {
          controlledOpen.value = nextOpen
          controlledChanges.value += 1
        }}
        onConfirm={() => {
          approveCount.value += 1
          controlledOpen.value = false
        }}
        onCancel={() => {
          controlledOpen.value = false
        }}
      >
        <button className="btn btn-outline">Controlled trigger</button>
      </Popconfirm>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
          <div className="text-xs text-base-content/45">当前状态</div>
          <div className="mt-2 text-lg font-semibold">
            {controlledOpen.value ? 'Open' : 'Closed'}
          </div>
        </div>
        <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
          <div className="text-xs text-base-content/45">openChange 次数</div>
          <div className="mt-2 text-lg font-semibold">{controlledChanges.value}</div>
        </div>
        <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
          <div className="text-xs text-base-content/45">已确认次数</div>
          <div className="mt-2 text-lg font-semibold">{approveCount.value}</div>
        </div>
      </div>
    </div>
  )
}

const AsyncPopconfirmPreview: FC = () => {
  const publishStatus = ref('等待发布')
  const publishRuns = ref(0)

  return (
    <div className="space-y-4 not-prose">
      <Popconfirm
        title="发布到生产环境？"
        description="确认后会执行 CDN 预热和灰度切流。"
        okText="开始发布"
        cancelText="再检查一下"
        okButtonProps={{ iconPlacement: 'end' }}
        onConfirm={() => {
          publishStatus.value = '发布中...'
          publishRuns.value += 1
          return new Promise(resolve => {
            window.setTimeout(() => {
              publishStatus.value = '已完成灰度切流'
              resolve(true)
            }, 1200)
          })
        }}
      >
        <button className="btn btn-primary">Publish build</button>
      </Popconfirm>

      <div className="rounded-2xl border border-primary/20 bg-primary/6 px-4 py-3 text-sm text-base-content/80">
        当前状态：{publishStatus.value} · 触发次数：{publishRuns.value}
      </div>
    </div>
  )
}

const TriggerPopconfirmPreview: FC = () => {
  const keyboardNote = ref('等待触发')
  const contextNote = ref('未触发')
  const mixedOpenCount = ref(0)

  return (
    <div className="grid gap-4 not-prose xl:grid-cols-3">
      <div className="space-y-3 rounded-[1.2rem] border border-base-300 bg-base-100 p-4 shadow-sm">
        <Popconfirm
          trigger="focus"
          title="离开输入框前确认？"
          description="适合补充最后一步确认。"
          onOpenChange={nextOpen => {
            keyboardNote.value = nextOpen ? '聚焦后已展开' : '已收起'
          }}
        >
          <input className="input input-bordered w-full" placeholder="Focus trigger" />
        </Popconfirm>
        <div className="text-xs text-base-content/60">{keyboardNote.value}</div>
      </div>

      <div className="space-y-3 rounded-[1.2rem] border border-base-300 bg-base-100 p-4 shadow-sm">
        <Popconfirm
          trigger="contextMenu"
          placement="rightTop"
          title="右键也可以确认"
          description="适合表格行或画布对象操作。"
          onOpenChange={nextOpen => {
            contextNote.value = nextOpen ? '已通过右键打开' : '已关闭'
          }}
        >
          <button className="btn btn-soft w-full">Right click me</button>
        </Popconfirm>
        <div className="text-xs text-base-content/60">{contextNote.value}</div>
      </div>

      <div className="space-y-3 rounded-[1.2rem] border border-base-300 bg-base-100 p-4 shadow-sm">
        <Popconfirm
          trigger={['hover', 'click']}
          placement="bottomRight"
          arrow={{ pointAtCenter: true }}
          title="混合触发"
          description="hover 可预热，click 再明确确认。"
          onOpenChange={nextOpen => {
            if (nextOpen) mixedOpenCount.value += 1
          }}
        >
          <button className="btn btn-outline w-full">Hover + click</button>
        </Popconfirm>
        <div className="text-xs text-base-content/60">打开次数：{mixedOpenCount.value}</div>
      </div>
    </div>
  )
}

const PopconfirmPage: FC = () => {
  const basicTab = ref<PreviewTabMode>('preview')
  const controlledTab = ref<PreviewTabMode>('preview')
  const asyncTab = ref<PreviewTabMode>('preview')
  const triggerTab = ref<PreviewTabMode>('preview')
  const placementTab = ref<PreviewTabMode>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Popconfirm 气泡确认框</h1>
        <p>
          Popconfirm 适合承载“轻量但不能误触”的操作确认。Rue 实现采用当前卡片与按钮体系，
          同时提供了和成熟组件库一致的核心心智：受控开合、异步确认、危险操作语义、单按钮确认、
          多触发方式与角落定位。
        </p>

        <div className="not-prose mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/40 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">
              Decision Layer
            </div>
            <div className="mt-2 text-base font-semibold">先确认，再执行</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              比 Tooltip 更明确，比 Modal 更轻，不会把整个页面打断。
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/40 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">
              Controlled Flow
            </div>
            <div className="mt-2 text-base font-semibold">可以挂到外部状态机</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              open 和 onOpenChange 让它适合审批、表单、工具栏联动。
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/40 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">
              Async Confirm
            </div>
            <div className="mt-2 text-base font-semibold">确认按钮会自动 loading</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              返回 Promise 后保持浮层可见，适合删除、发布、同步等异步操作。
            </p>
          </div>
        </div>

        <PreviewBlock
          title="基础确认与危险操作"
          summary="覆盖默认双按钮、危险确认和单按钮确认，涵盖最常见的确认交互。"
          tab={basicTab}
          code={basicCode}
          preview={() => (
            <div className="grid gap-4 not-prose lg:grid-cols-3">
              <Popconfirm
                title="确认归档这条记录？"
                description="归档后仍可在历史列表中恢复。"
                okText="确认归档"
                cancelText="先等等"
              >
                <button className="btn btn-outline">Archive</button>
              </Popconfirm>

              <Popconfirm
                title="删除这个分组？"
                description="删除后将同时移除下面的成员绑定。"
                okText="立即删除"
                okType="danger"
                cancelText="保持分组"
              >
                <button className="btn btn-soft btn-error">Delete group</button>
              </Popconfirm>

              <Popconfirm
                title="确认继续"
                description="这个动作不会再二次提醒。"
                showCancel={false}
                okText="我知道了"
              >
                <button className="btn btn-soft">Single action</button>
              </Popconfirm>
            </div>
          )}
        />

        <PreviewBlock
          title="受控开合与外部联动"
          summary="适合把确认层并入审批工具栏、批量操作条或外部状态机。"
          tab={controlledTab}
          code={controlledCode}
          preview={ControlledPopconfirmPreview}
        />

        <PreviewBlock
          title="异步确认与自动 loading"
          summary="onConfirm 返回 Promise 后，确认按钮会保持 loading，直到异步流程完成再关闭。"
          tab={asyncTab}
          code={asyncCode}
          preview={AsyncPopconfirmPreview}
        />

        <PreviewBlock
          title="触发方式"
          summary="除了默认 click，还可以接 focus、contextMenu，或把多个触发手势组合使用。"
          tab={triggerTab}
          code={triggerCode}
          preview={TriggerPopconfirmPreview}
        />

        <PreviewBlock
          title="定位与箭头"
          summary="支持常见角落别名，便于和 Popover、Tooltip 保持一致的浮层布局心智。"
          tab={placementTab}
          code={placementCode}
          preview={() => (
            <div className="grid gap-6 not-prose sm:grid-cols-2 xl:grid-cols-4">
              <Popconfirm
                open={true}
                placement="topLeft"
                title="Top left"
                description="贴合起始边。"
                className="justify-self-start"
              >
                <button className="btn">Top left</button>
              </Popconfirm>

              <Popconfirm
                open={true}
                placement="bottomRight"
                title="Bottom right"
                description="适合工具条尾部操作。"
                className="justify-self-start"
              >
                <button className="btn">Bottom right</button>
              </Popconfirm>

              <Popconfirm
                open={true}
                placement="leftTop"
                title="Left top"
                description="适合桌面端列表旁操作。"
                className="justify-self-start"
              >
                <button className="btn">Left top</button>
              </Popconfirm>

              <Popconfirm
                open={true}
                placement="rightBottom"
                title="Right bottom"
                description="适合卡片角落动作。"
                className="justify-self-start"
              >
                <button className="btn">Right bottom</button>
              </Popconfirm>
            </div>
          )}
        />

        <h2>API</h2>
        <ApiTable rows={apiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default PopconfirmPage
