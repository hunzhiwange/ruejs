import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import PreviewBlock, { type PreviewTabMode } from './PreviewBlock'
import Splitter from '../../../packages/rue-design/src/components/splitter/index'

interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
}

const defaultTriptychSizes = [180, 260, 160]

const apiRows: ApiRow[] = [
  {
    prop: 'orientation / layout / vertical',
    description: '控制分割方向；推荐用 orientation，vertical 作为别名保持。',
    type: "'horizontal' | 'vertical' / boolean",
    defaultValue: "'horizontal'",
  },
  {
    prop: 'lazy',
    description: '开启后拖拽期间只移动分隔柄，释放鼠标时才真正提交面板尺寸。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'onResizeStart / onResize / onResizeEnd',
    description: '拖拽开始、拖拽中、拖拽结束的回调，统一返回当前所有面板尺寸。',
    type: '(sizes: number[]) => void',
    defaultValue: '-',
  },
  {
    prop: 'onDraggerDoubleClick',
    description: '双击分隔柄时触发，适合和“重置布局”联动。',
    type: '(index: number) => void',
    defaultValue: '-',
  },
  {
    prop: 'Splitter.Panel size',
    description: '受控尺寸，支持像素数值或百分比字符串。',
    type: 'number | string',
    defaultValue: '-',
  },
  {
    prop: 'Splitter.Panel defaultSize',
    description: '非受控初始尺寸，常用于两栏默认占比。',
    type: 'number | string',
    defaultValue: '-',
  },
  {
    prop: 'Splitter.Panel min / max',
    description: '限制面板最小值和最大值，防止拖拽过界。',
    type: 'number | string',
    defaultValue: '-',
  },
  {
    prop: 'Splitter.Panel resizable',
    description: '禁用相邻分隔柄的拖拽能力，但保持布局结构。',
    type: 'boolean',
    defaultValue: 'true',
  },
]

const basicCode = `import type { FC } from '@rue-js/rue'
import { Splitter } from '@rue-js/design'
const BasicSplitterDemo: FC = () => {
  return (
    <Splitter style={{ height: 280 }}>
      <Splitter.Panel defaultSize="40%" min="24%" max="70%">
        <div className="h-full rounded-box border border-base-300 bg-base-100 p-4">
          <div className="mb-3 text-xs uppercase tracking-[0.24em] text-base-content/45">
            Navigation
          </div>
          <div className="space-y-2 text-sm text-base-content/70">
            <div className="rounded-box bg-base-200/70 px-3 py-2">Overview</div>
            <div className="rounded-box bg-base-200/70 px-3 py-2">Metrics</div>
            <div className="rounded-box bg-base-200/70 px-3 py-2">Deployments</div>
          </div>
        </div>
      </Splitter.Panel>

      <Splitter.Panel>
        <div className="h-full rounded-box border border-base-300 bg-base-100 p-4">
          <div className="mb-3 text-xs uppercase tracking-[0.24em] text-base-content/45">
            Editor
          </div>
          <div className="rounded-box border border-dashed border-base-300 bg-base-200/50 p-4 text-sm leading-7 text-base-content/70">
            这里是主工作区。拖动中间的 handle，可以把左右空间分配给导航和正文。
          </div>
        </div>
      </Splitter.Panel>
    </Splitter>
  )
}

export default BasicSplitterDemo`

const controlledCode = `import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import { Splitter } from '@rue-js/design'
const ControlledSplitterDemo: FC = () => {
  const sizes = ref<Array<number | string>>(['38%', '62%'])
  const enabled = ref(true)
  const status = ref('等待拖拽')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            sizes.value = ['30%', '70%']
          }}
        >
          30 / 70
        </button>

        <button
          type="button"
          className="btn btn-sm btn-outline"
          onClick={() => {
            sizes.value = ['50%', '50%']
            status.value = '已重置为 50 / 50'
          }}
        >
          平分
        </button>

        <button
          type="button"
          className={('btn btn-sm btn-ghost ' + (enabled.value ? '' : 'btn-active')).trim()}
          onClick={() => {
            enabled.value = !enabled.value
            status.value = enabled.value ? '已恢复左栏拖拽' : '已锁定左栏拖拽'
          }}
        >
          {enabled.value ? '锁定左栏' : '恢复拖拽'}
        </button>
      </div>

      <Splitter
        style={{ height: 300 }}
        onResize={next => {
          sizes.value = next
          status.value = '当前尺寸：' + next.join(' / ')
        }}
      >
        <Splitter.Panel size={sizes.value[0]} resizable={enabled.value}>
          <div className="h-full rounded-box border border-base-300 bg-base-100 p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.24em] text-base-content/45">
              Filters
            </div>
            <div className="text-sm text-base-content/70">{status.value}</div>
          </div>
        </Splitter.Panel>

        <Splitter.Panel size={sizes.value[1]}>
          <div className="h-full rounded-box border border-base-300 bg-base-100 p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.24em] text-base-content/45">
              Results
            </div>
            <div className="text-sm text-base-content/70">右栏会跟随受控尺寸同步更新。</div>
          </div>
        </Splitter.Panel>
      </Splitter>
    </div>
  )
}

export default ControlledSplitterDemo`

const verticalCode = `import type { FC } from '@rue-js/rue'
import { Splitter } from '@rue-js/design'
const VerticalSplitterDemo: FC = () => {
  return (
    <Splitter orientation="vertical" style={{ height: 320 }}>
      <Splitter.Panel defaultSize="32%" min="20%">
        <div className="h-full rounded-box border border-base-300 bg-base-100 p-4">
          <div className="mb-3 text-xs uppercase tracking-[0.24em] text-base-content/45">
            Summary
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-box bg-success/12 p-3 text-sm">Success 18</div>
            <div className="rounded-box bg-warning/12 p-3 text-sm">Queued 4</div>
            <div className="rounded-box bg-info/12 p-3 text-sm">Running 2</div>
          </div>
        </div>
      </Splitter.Panel>

      <Splitter.Panel>
        <div className="h-full rounded-box border border-base-300 bg-base-100 p-4">
          <div className="mb-3 text-xs uppercase tracking-[0.24em] text-base-content/45">
            Details
          </div>
          <div className="rounded-box bg-base-200/60 p-4 text-sm leading-7 text-base-content/70">
            这里可以放明细列表、数据表格、执行日志，或者任何比顶部更长的内容。
          </div>
        </div>
      </Splitter.Panel>
    </Splitter>
  )
}

export default VerticalSplitterDemo`

const resetCode = `import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import { Splitter } from '@rue-js/design'
const defaultSizes: Array<number | string> = [180, 260, 160]

const ResettableSplitterDemo: FC = () => {
  const sizes = ref<Array<number | string>>(defaultSizes.slice())

  return (
    <div className="space-y-4">
      <div className="text-sm text-base-content/65">双击任意分隔柄可恢复默认布局</div>

      <Splitter
        style={{ height: 260 }}
        onResize={next => {
          sizes.value = next
        }}
        onDraggerDoubleClick={() => {
          sizes.value = defaultSizes.slice()
        }}
      >
        <Splitter.Panel size={sizes.value[0]} min={120}>
          <div className="h-full rounded-box border border-base-300 bg-base-100 p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.24em] text-base-content/45">
              Sources
            </div>
            <div className="text-sm text-base-content/70">左侧资源树或文档大纲。</div>
          </div>
        </Splitter.Panel>

        <Splitter.Panel size={sizes.value[1]} min={180}>
          <div className="h-full rounded-box border border-base-300 bg-base-100 p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.24em] text-base-content/45">
              Editor
            </div>
            <div className="text-sm text-base-content/70">中间主编辑区通常需要最大的宽度。</div>
          </div>
        </Splitter.Panel>

        <Splitter.Panel size={sizes.value[2]} min={120}>
          <div className="h-full rounded-box border border-base-300 bg-base-100 p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.24em] text-base-content/45">
              Preview
            </div>
            <div className="text-sm text-base-content/70">右侧实时预览或审阅信息。</div>
          </div>
        </Splitter.Panel>
      </Splitter>
    </div>
  )
}

export default ResettableSplitterDemo`

const lazyCode = `import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import { Splitter } from '@rue-js/design'
const LazySplitterDemo: FC = () => {
  const status = ref('拖拽时只移动 handle，释放后才提交尺寸')

  return (
    <div className="space-y-4">
      <div className="text-sm text-base-content/65">{status.value}</div>

      <Splitter
        lazy
        style={{ height: 280 }}
        onResizeStart={() => {
          status.value = '开始拖拽，当前只移动 handle 预览位移'
        }}
        onResize={sizes => {
          status.value = '释放后已提交尺寸：' + sizes.join(' / ')
        }}
      >
        <Splitter.Panel defaultSize="44%" min="30%">
          <div className="h-full rounded-box border border-base-300 bg-base-100 p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.24em] text-base-content/45">
              Analysis
            </div>
            <div className="rounded-box bg-primary/10 p-4 text-sm text-base-content/70">
              Strategy setup
            </div>
          </div>
        </Splitter.Panel>

        <Splitter.Panel>
          <div className="h-full rounded-box border border-base-300 bg-base-100 p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.24em] text-base-content/45">
              Output
            </div>
            <div className="space-y-2 text-sm text-base-content/70">
              <div className="rounded-box bg-base-200/70 px-3 py-2">Insight A</div>
              <div className="rounded-box bg-base-200/70 px-3 py-2">Insight B</div>
              <div className="rounded-box bg-base-200/70 px-3 py-2">Insight C</div>
            </div>
          </div>
        </Splitter.Panel>
      </Splitter>
    </div>
  )
}

export default LazySplitterDemo`

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

const Pane: FC<{ title: string; subtitle: string; className?: string; children?: any }> = ({
  title,
  subtitle,
  className,
  children,
}) => {
  return (
    <div
      className={`h-full rounded-box border border-base-300/75 bg-base-100/95 p-4 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.55)] ${className ?? ''}`.trim()}
    >
      <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-base-content/45">
        {title}
      </div>
      <div className="mb-4 text-sm leading-6 text-base-content/70">{subtitle}</div>
      <div className="min-h-0">{children}</div>
    </div>
  )
}

const ControlledPreview: FC = () => {
  const controlledSizes = ref<Array<number | string>>(['38%', '62%'])
  const controlledResizable = ref(true)
  const controlledStatus = ref('等待拖拽')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            controlledSizes.value = ['30%', '70%']
            controlledStatus.value = '已切到 30 / 70 预设'
          }}
        >
          30 / 70
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline"
          onClick={() => {
            controlledSizes.value = ['50%', '50%']
            controlledStatus.value = '已重置为 50 / 50'
          }}
        >
          平分
        </button>
        <button
          type="button"
          className={`btn btn-sm btn-ghost ${controlledResizable.value ? '' : 'btn-active'}`.trim()}
          onClick={() => {
            controlledResizable.value = !controlledResizable.value
            controlledStatus.value = controlledResizable.value ? '已恢复左栏拖拽' : '已锁定左栏拖拽'
          }}
        >
          {controlledResizable.value ? '锁定左栏' : '恢复拖拽'}
        </button>
      </div>

      <Splitter
        style={{ height: 300 }}
        onResize={sizes => {
          queueMicrotask(() => {
            controlledSizes.value = sizes
          })
          controlledStatus.value = `当前尺寸：${sizes.join(' / ')}`
        }}
      >
        <Splitter.Panel size={controlledSizes.value[0]} resizable={controlledResizable.value}>
          <div className="h-full rounded-box border border-base-300/75 bg-base-100/95 p-4 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.55)]">
            <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-base-content/45">
              Filters
            </div>
            <div className="mb-4 text-sm leading-6 text-base-content/70">
              受控模式下，这一栏可以被外部按钮锁定或重置。
            </div>
            <div className="text-xs text-base-content/60">{controlledStatus.value}</div>
          </div>
        </Splitter.Panel>
        <Splitter.Panel size={controlledSizes.value[1]}>
          <div className="h-full rounded-box border border-base-300/75 bg-base-100/95 p-4 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.55)]">
            <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-base-content/45">
              Results
            </div>
            <div className="mb-4 text-sm leading-6 text-base-content/70">
              右栏跟随 onResize 返回值同步，适合持久化工作台布局。
            </div>
            <div className="text-sm text-base-content/70">
              受控尺寸：{controlledSizes.value.join(' / ')}
            </div>
          </div>
        </Splitter.Panel>
      </Splitter>
    </div>
  )
}

const ResetPreview: FC = () => {
  const triptychSizes = ref<Array<number | string>>(defaultTriptychSizes.slice())
  const triptychStatus = ref('双击任意分隔柄可重置')

  return (
    <div className="space-y-4">
      <div className="text-sm text-base-content/65">{triptychStatus.value}</div>
      <Splitter
        style={{ height: 260 }}
        onResize={sizes => {
          triptychSizes.value = sizes
          triptychStatus.value = `当前布局：${sizes.join(' / ')}`
        }}
        onDraggerDoubleClick={() => {
          triptychSizes.value = defaultTriptychSizes.slice()
          triptychStatus.value = '已恢复 Sources / Editor / Preview 默认布局'
        }}
      >
        <Splitter.Panel size={triptychSizes.value[0]} min={120}>
          <Pane title="Sources" subtitle="左侧资源树或文档大纲。" />
        </Splitter.Panel>
        <Splitter.Panel size={triptychSizes.value[1]} min={180}>
          <Pane title="Editor" subtitle="中间主编辑区通常需要最大的宽度。" />
        </Splitter.Panel>
        <Splitter.Panel size={triptychSizes.value[2]} min={120}>
          <Pane title="Preview" subtitle="右侧实时预览或审阅信息。" />
        </Splitter.Panel>
      </Splitter>
    </div>
  )
}

const LazyPreview: FC = () => {
  const lazyStatus = ref('拖拽时只移动 handle，释放后才提交尺寸')

  return (
    <div className="space-y-4">
      <div className="text-sm text-base-content/65">{lazyStatus.value}</div>
      <Splitter
        lazy
        style={{ height: 280 }}
        onResizeStart={() => {
          lazyStatus.value = '开始拖拽，当前只移动 handle 预览位移'
        }}
        onResize={sizes => {
          lazyStatus.value = `释放后已提交尺寸：${sizes.join(' / ')}`
        }}
      >
        <Splitter.Panel defaultSize="44%" min="30%">
          <Pane title="Analysis" subtitle="左侧适合放图表、规则或输入参数。">
            <div className="rounded-box bg-primary/10 p-4 text-sm text-base-content/70">
              Strategy setup
            </div>
          </Pane>
        </Splitter.Panel>
        <Splitter.Panel>
          <Pane title="Output" subtitle="右侧接收结果、日志或建议列表。">
            <div className="space-y-2 text-sm text-base-content/70">
              <div className="rounded-box bg-base-200/70 px-3 py-2">Insight A</div>
              <div className="rounded-box bg-base-200/70 px-3 py-2">Insight B</div>
              <div className="rounded-box bg-base-200/70 px-3 py-2">Insight C</div>
            </div>
          </Pane>
        </Splitter.Panel>
      </Splitter>
    </div>
  )
}

const SplitterPage: FC = () => {
  const tabs = {
    basic: ref<PreviewTabMode>('preview'),
    controlled: ref<PreviewTabMode>('preview'),
    vertical: ref<PreviewTabMode>('preview'),
    reset: ref<PreviewTabMode>('preview'),
    lazy: ref<PreviewTabMode>('preview'),
  }

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Splitter 分割面板</h1>
        <p className="text-sm mt-3 mb-3">
          Splitter 在 Rue
          里不是一条简单的分隔线，而是一套适合工作台、配置台和双栏内容区的布局行为层。 它使用 Rue
          Design 当前的柔和卡片气质和 3px 分隔条视觉，同时补上可拖拽、受控尺寸、垂直布局、lazy
          拖拽和双击重置这些常用能力。
        </p>

        <h2>何时使用</h2>
        <ul>
          <li>需要左右或上下两个工作区同时存在，并允许用户按内容密度自己调节比例。</li>
          <li>
            需要把筛选区、编辑区、预览区、日志区这类不同角色的面板拆开，但仍保持同一个页面上下文。
          </li>
          <li>需要在布局层提供受控重置和 lazy 拖拽，而不是只做静态栅格分栏。</li>
        </ul>

        <h2>推荐用法</h2>
        <p className="text-sm mt-3 mb-4">
          下面每个 JSX 示例都保持了完整结构，方便直接复制到页面组件里使用。
        </p>

        <PreviewBlock
          title="Basic workspace split"
          summary="最基础的双栏写法，默认比例、最小值和最大值都在 Panel 上声明。"
          tab={tabs.basic}
          preview={() => (
            <Splitter style={{ height: 280 }}>
              <Splitter.Panel defaultSize="40%" min="24%" max="70%">
                <Pane title="Navigation" subtitle="把目录、资源树或查询条件放在左侧。">
                  <div className="space-y-2 text-sm text-base-content/70">
                    <div className="rounded-box bg-base-200/70 px-3 py-2">Overview</div>
                    <div className="rounded-box bg-base-200/70 px-3 py-2">Metrics</div>
                    <div className="rounded-box bg-base-200/70 px-3 py-2">Deployments</div>
                  </div>
                </Pane>
              </Splitter.Panel>
              <Splitter.Panel>
                <Pane title="Editor" subtitle="右侧保持完整内容区，适合表单、文档或分析结果。">
                  <div className="rounded-box border border-dashed border-base-300 bg-base-200/50 p-4 text-sm leading-7 text-base-content/70">
                    这里是主工作区。拖动中间的 handle，可以把左右空间分配给导航和正文。
                  </div>
                </Pane>
              </Splitter.Panel>
            </Splitter>
          )}
          code={basicCode}
        />

        <PreviewBlock
          title="Controlled sizes and reset"
          summary="受控模式适合和按钮、预设布局、权限开关联动。"
          tab={tabs.controlled}
          preview={ControlledPreview}
          code={controlledCode}
        />

        <PreviewBlock
          title="Vertical split"
          summary="上下分栏适合 dashboard 顶部概览 + 底部明细、编辑区 + 日志区这类结构。"
          tab={tabs.vertical}
          preview={() => (
            <Splitter orientation="vertical" style={{ height: 520 }}>
              <Splitter.Panel defaultSize="32%" min="10%">
                <Pane title="Summary" subtitle="顶部保持关键指标和状态总览。">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-box bg-success/12 p-3 text-sm">Success 18</div>
                    <div className="rounded-box bg-warning/12 p-3 text-sm">Queued 4</div>
                    <div className="rounded-box bg-info/12 p-3 text-sm">Running 2</div>
                  </div>
                </Pane>
              </Splitter.Panel>
              <Splitter.Panel>
                <Pane title="Details" subtitle="底部用来承接更长的列表、表格或日志。">
                  <div className="rounded-box bg-base-200/60 p-4 text-sm leading-7 text-base-content/70">
                    这里可以放明细列表、数据表格、执行日志，或者任何比顶部更“长”的内容。
                  </div>
                </Pane>
              </Splitter.Panel>
            </Splitter>
          )}
          code={verticalCode}
        />

        <PreviewBlock
          title="Multiple panels and double click reset"
          summary="多面板场景里，双击分隔柄常常比额外按钮更顺手。"
          tab={tabs.reset}
          preview={ResetPreview}
          code={resetCode}
        />

        <PreviewBlock
          title="Lazy drag for analysis view"
          summary="lazy 模式更适合重内容布局，拖动过程先预览位置，释放后再真正提交尺寸。"
          tab={tabs.lazy}
          preview={LazyPreview}
          code={lazyCode}
        />

        <h2 id="splitter-api">API</h2>
        <p className="text-sm mt-3 mb-4">
          Splitter 的根组件负责布局和交互，所有真正参与计算的子节点都应该是{' '}
          <code>Splitter.Panel</code>。 如果你在业务里需要把布局状态持久化，优先使用{' '}
          <code>size</code> + <code>onResize</code>
          的受控写法；如果只需要默认占比，用 <code>defaultSize</code> 即可。
        </p>
        <ApiTable rows={apiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default SplitterPage
