import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import PreviewBlock, { type PreviewTabMode } from './PreviewBlock'
import { Tooltip } from '@rue-js/design'
interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
}

const apiRows: ApiRow[] = [
  {
    prop: 'arrow',
    description: '是否显示箭头，适合在卡片式信息和标签式提示之间切换语气。',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    prop: 'classNames',
    description: '语义化类名扩展，支持分别定制根节点和提示内容。',
    type: `{ root?: string; body?: string }`,
    defaultValue: '-',
  },
  {
    prop: 'color',
    description: '支持 daisyUI 语义色，也支持自定义颜色字符串。',
    type: `'neutral' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error' | string`,
    defaultValue: '-',
  },
  {
    prop: 'content / overlay / title / tip',
    description: '提示内容入口，支持文本、JSX 节点、函数返回值，并支持基础的 tip 写法。',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'defaultOpen',
    description: '非受控初始显示状态。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'disabled',
    description: '禁用 Tooltip，仅保持包裹结构，不显示提示内容。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'open',
    description: '受控显示状态，适合与外部按钮、校验状态或页面步骤联动。',
    type: 'boolean',
    defaultValue: '-',
  },
  {
    prop: 'onOpenChange',
    description: '显示状态变化回调。',
    type: '(open: boolean) => void',
    defaultValue: '-',
  },
  {
    prop: 'overlayClassName / overlayStyle',
    description: '提示内容层的类名和样式扩展。',
    type: 'string / Record<string, any>',
    defaultValue: '-',
  },
  {
    prop: 'placement',
    description: '支持四个基础方向和常见浮层组件里的角落别名。',
    type: `'top' | 'bottom' | 'left' | 'right' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'leftTop' | 'leftBottom' | 'rightTop' | 'rightBottom'`,
    defaultValue: `'top'`,
  },
  {
    prop: 'styles',
    description: '语义化样式扩展，支持根节点与提示内容。',
    type: `{ root?: Record<string, any>; body?: Record<string, any> }`,
    defaultValue: '-',
  },
  {
    prop: 'trigger',
    description: '触发方式，可单独或组合使用 hover、focus、click、contextMenu。',
    type: `'hover' | 'focus' | 'click' | 'contextMenu' | Array<...>`,
    defaultValue: `['hover', 'focus']`,
  },
]

const ForceOpenPreview: FC = () => {
  const controlledOpen = ref(true)

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Tooltip data-testid="tooltip-open" title="Always visible" open={true} color="primary">
        <button className="btn btn-primary">Force open</button>
      </Tooltip>
      <Tooltip
        title={controlledOpen.value ? '点击任一按钮都可以关闭' : '点击任一按钮都可以打开'}
        open={controlledOpen.value}
      >
        <button
          className="btn btn-soft"
          onClick={() => (controlledOpen.value = !controlledOpen.value)}
        >
          Controlled tooltip
        </button>
      </Tooltip>
      <button
        className="btn btn-outline"
        onClick={() => (controlledOpen.value = !controlledOpen.value)}
      >
        {controlledOpen.value ? 'Hide controlled tooltip' : 'Show controlled tooltip'}
      </button>
      <Tooltip title="包一层 span 可支持禁用按钮" placement="bottom">
        <span className="inline-flex">
          <button className="btn btn-disabled" disabled={true}>
            Disabled button
          </button>
        </span>
      </Tooltip>
    </div>
  )
}

const TooltipPage: FC = () => {
  const tabBasic = ref<PreviewTabMode>('preview')
  const tabPlacements = ref<PreviewTabMode>('preview')
  const tabContent = ref<PreviewTabMode>('preview')
  const tabColors = ref<PreviewTabMode>('preview')
  const tabTriggers = ref<PreviewTabMode>('preview')
  const tabOpen = ref<PreviewTabMode>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Tooltip 提示框</h1>
        <p className="text-sm mt-3 mb-3">
          Tooltip 现在既使用 Rue 基础轻量、包裹式的视觉习惯，也补上更完整的语义 API。你可以使用
          <code>tip</code> 和 <code>Tooltip.Content</code>，也可以切到 <code>title</code>、
          <code>overlay</code>、受控显示、 自定义颜色和语义化样式扩展。
        </p>

        <PreviewBlock
          title="Tooltip"
          tab={tabBasic}
          preview={() => (
            <div className="flex flex-wrap gap-4">
              <Tooltip data-testid="tooltip-basic" title="用于解释按钮含义">
                <button className="btn">Hover me</button>
              </Tooltip>
              <Tooltip title={() => '函数内容也可以惰性返回'}>
                <button className="btn btn-outline">Lazy title</button>
              </Tooltip>
              <Tooltip disabled={true} title="不会显示">
                <button className="btn btn-ghost">Disabled tooltip</button>
              </Tooltip>
            </div>
          )}
          code={`<Tooltip title="用于解释按钮含义">
  <button className="btn">Hover me</button>
</Tooltip>

<Tooltip title={() => '函数内容也可以惰性返回'}>
  <button className="btn btn-outline">Lazy title</button>
</Tooltip>

<Tooltip disabled={true} title="不会显示">
  <button className="btn btn-ghost">Disabled tooltip</button>
</Tooltip>`}
        />

        <PreviewBlock
          title="Tooltip placements"
          tab={tabPlacements}
          preview={() => (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Tooltip
                data-testid="tooltip-top"
                title="top / topLeft / topRight"
                open={true}
                placement="top"
                className="justify-self-start"
              >
                <button className="btn">Top</button>
              </Tooltip>
              <Tooltip
                data-testid="tooltip-bottom"
                title="bottom / bottomLeft / bottomRight"
                open={true}
                placement="bottomRight"
                className="justify-self-start"
              >
                <button className="btn">Bottom</button>
              </Tooltip>
              <Tooltip
                data-testid="tooltip-left"
                title="left / leftTop / leftBottom"
                open={true}
                placement="leftTop"
                className="justify-self-start"
              >
                <button className="btn">Left</button>
              </Tooltip>
              <Tooltip
                data-testid="tooltip-right"
                title="right / rightTop / rightBottom"
                open={true}
                placement="rightBottom"
                className="justify-self-start"
              >
                <button className="btn">Right</button>
              </Tooltip>
            </div>
          )}
          code={`<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
  <Tooltip title="top / topLeft / topRight" open={true} placement="top" className="justify-self-start">
    <button className="btn">Top</button>
  </Tooltip>

  <Tooltip title="bottom / bottomLeft / bottomRight" open={true} placement="bottomRight" className="justify-self-start">
    <button className="btn">Bottom</button>
  </Tooltip>

  <Tooltip title="left / leftTop / leftBottom" open={true} placement="leftTop" className="justify-self-start">
    <button className="btn">Left</button>
  </Tooltip>

  <Tooltip title="right / rightTop / rightBottom" open={true} placement="rightBottom" className="justify-self-start">
    <button className="btn">Right</button>
  </Tooltip>
</div>`}
        />

        <PreviewBlock
          title="Rich content"
          tab={tabContent}
          preview={() => (
            <div className="grid gap-5 lg:grid-cols-2">
              <Tooltip
                title={
                  <div className="space-y-1 text-left">
                    <div className="font-semibold">发布检查</div>
                    <div className="text-xs opacity-80">包含静态资源、接口联调和埋点确认。</div>
                  </div>
                }
                open={true}
                className="justify-self-start"
                overlayClassName="max-w-56 border border-base-300 shadow-lg"
                overlayStyle={{ padding: '0.75rem', letterSpacing: '0.02em' }}
              >
                <button className="btn btn-soft btn-primary">JSX title</button>
              </Tooltip>

              <Tooltip
                open={true}
                arrow={false}
                className="justify-self-start"
                classNames={{ body: 'max-w-56 text-left' }}
                styles={{ body: { padding: '0.75rem' } }}
              >
                <Tooltip.Content>
                  <div className="space-y-2">
                    <div className="badge badge-primary badge-soft">Rue</div>
                    <p className="m-0 text-xs leading-5">
                      Tooltip.Content 适合承载更自由的结构化信息。
                    </p>
                  </div>
                </Tooltip.Content>
                <button className="btn btn-soft">Tooltip.Content</button>
              </Tooltip>
            </div>
          )}
          code={`<Tooltip
  title={
    <div className="space-y-1 text-left">
      <div className="font-semibold">发布检查</div>
      <div className="text-xs opacity-80">包含静态资源、接口联调和埋点确认。</div>
    </div>
  }
  open={true}
  overlayClassName="max-w-56 border border-base-300 shadow-lg"
  overlayStyle={{ padding: '0.75rem', letterSpacing: '0.02em' }}
>
  <button className="btn btn-soft btn-primary">JSX title</button>
</Tooltip>

<Tooltip open={true} arrow={false} classNames={{ body: 'max-w-56 text-left' }} styles={{ body: { padding: '0.75rem' } }}>
  <Tooltip.Content>
    <div className="space-y-2">
      <div className="badge badge-primary badge-soft">Rue</div>
      <p className="m-0 text-xs leading-5">Tooltip.Content 适合承载更自由的结构化信息。</p>
    </div>
  </Tooltip.Content>
  <button className="btn btn-soft">Tooltip.Content</button>
</Tooltip>`}
        />

        <PreviewBlock
          title="Colors and semantic styling"
          tab={tabColors}
          preview={() => (
            <div className="flex flex-wrap gap-4">
              <Tooltip title="语义色" color="primary" open={true}>
                <button className="btn btn-primary">Primary</button>
              </Tooltip>
              <Tooltip title="自定义颜色" color="#1d4ed8" open={true}>
                <button className="btn border-0 bg-[#1d4ed8] text-white">Custom blue</button>
              </Tooltip>
              <Tooltip
                title="可通过 classNames.root 和 styles.body 精细调节"
                open={true}
                classNames={{ root: 'inline-flex', body: 'max-w-52 rounded-2xl' }}
                styles={{
                  body: { padding: '0.875rem', boxShadow: '0 16px 40px rgba(15, 23, 42, 0.16)' },
                }}
              >
                <button className="btn btn-accent btn-soft">Semantic slots</button>
              </Tooltip>
            </div>
          )}
          code={`<Tooltip title="语义色" color="primary" open={true}>
  <button className="btn btn-primary">Primary</button>
</Tooltip>

<Tooltip title="自定义颜色" color="#1d4ed8" open={true}>
  <button className="btn border-0 bg-[#1d4ed8] text-white">Custom blue</button>
</Tooltip>

<Tooltip
  title="可通过 classNames.root 和 styles.body 精细调节"
  open={true}
  classNames={{ root: 'inline-flex', body: 'max-w-52 rounded-2xl' }}
  styles={{ body: { padding: '0.875rem', boxShadow: '0 16px 40px rgba(15, 23, 42, 0.16)' } }}
>
  <button className="btn btn-accent btn-soft">Semantic slots</button>
</Tooltip>`}
        />

        <PreviewBlock
          title="Trigger modes"
          tab={tabTriggers}
          preview={() => (
            <div className="grid gap-4 lg:grid-cols-3">
              <Tooltip trigger="click" title="Click again to close">
                <button className="btn btn-outline">Click trigger</button>
              </Tooltip>
              <Tooltip trigger="focus" title="聚焦输入框时显示">
                <label className="input">
                  <span className="label">Focus</span>
                  <input type="text" placeholder="Tab 到这里" />
                </label>
              </Tooltip>
              <Tooltip trigger="contextMenu" title="右键也可以作为触发手势">
                <div className="rounded-box border border-dashed border-base-300 px-4 py-3 text-sm">
                  Right click me
                </div>
              </Tooltip>
            </div>
          )}
          code={`<Tooltip trigger="click" title="Click again to close">
  <button className="btn btn-outline">Click trigger</button>
</Tooltip>

<Tooltip trigger="focus" title="聚焦输入框时显示">
  <label className="input">
    <span className="label">Focus</span>
    <input type="text" placeholder="Tab 到这里" />
  </label>
</Tooltip>

<Tooltip trigger="contextMenu" title="右键也可以作为触发手势">
  <div className="rounded-box border border-dashed border-base-300 px-4 py-3 text-sm">Right click me</div>
</Tooltip>`}
        />

        <PreviewBlock
          title="Force open"
          tab={tabOpen}
          preview={ForceOpenPreview}
          code={`const controlledOpen = ref(true)

<div className="flex flex-wrap items-center gap-4">
  <Tooltip title="Always visible" open={true} color="primary">
    <button className="btn btn-primary">Force open</button>
  </Tooltip>

  <Tooltip
    title={controlledOpen.value ? '点击任一按钮都可以关闭' : '点击任一按钮都可以打开'}
    open={controlledOpen.value}
  >
    <button className="btn btn-soft" onClick={() => (controlledOpen.value = !controlledOpen.value)}>
      Controlled tooltip
    </button>
  </Tooltip>

  <button className="btn btn-outline" onClick={() => (controlledOpen.value = !controlledOpen.value)}>
    {controlledOpen.value ? 'Hide controlled tooltip' : 'Show controlled tooltip'}
  </button>

  <Tooltip title="包一层 span 可支持禁用按钮" placement="bottom">
    <span className="inline-flex">
      <button className="btn btn-disabled" disabled={true}>
        Disabled button
      </button>
    </span>
  </Tooltip>
</div>`}
        />

        <div className="not-prose mt-10 overflow-x-auto rounded-box border border-base-300 bg-base-100">
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
              {apiRows.map(row => (
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
      </div>
    </SidebarPlayground>
  )
}

export default TooltipPage
