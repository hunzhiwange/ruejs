import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Diff, Tabs } from '@rue-js/design'
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

const rootApiRows: ApiRow[] = [
  {
    prop: 'item1',
    description: '快捷模式下的左侧内容',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'item2',
    description: '快捷模式下的右侧内容',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'item1Label',
    description: '左侧角标文案或节点',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'item2Label',
    description: '右侧角标文案或节点',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'resizerContent',
    description: '手柄中央的自定义内容',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'value',
    description: '受控位置值，仅快捷模式生效',
    type: 'number',
    defaultValue: '-',
  },
  {
    prop: 'defaultValue',
    description: '非受控初始位置，仅快捷模式生效',
    type: 'number',
    defaultValue: '50',
  },
  {
    prop: 'min',
    description: '最小值，仅快捷模式生效',
    type: 'number',
    defaultValue: '0',
  },
  {
    prop: 'max',
    description: '最大值，仅快捷模式生效',
    type: 'number',
    defaultValue: '100',
  },
  {
    prop: 'step',
    description: '步进值，仅快捷模式生效',
    type: 'number',
    defaultValue: '1',
  },
  {
    prop: 'onChange',
    description: '拖动或键盘调整时回调当前值',
    type: '(value: number, event: Event) => void',
    defaultValue: '-',
  },
  {
    prop: 'disabled',
    description: '禁用快捷模式拖动能力',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'children',
    description: '传入子节点后优先使用组合式结构',
    type: 'any',
    defaultValue: '-',
  },
]

const compoundApiRows: ApiRow[] = [
  {
    prop: 'Diff.Item1',
    description: '左侧内容区，支持 role、tabIndex、label 和 style',
    type: 'component',
    defaultValue: '-',
  },
  {
    prop: 'Diff.Item2',
    description: '右侧内容区，支持 role、tabIndex、label 和 style',
    type: 'component',
    defaultValue: '-',
  },
  {
    prop: 'Diff.Resizer',
    description: '分隔条，可继续自定义 className、style 和 children',
    type: 'component',
    defaultValue: '-',
  },
  {
    prop: 'tabIndex',
    description: '组合结构模式下继续透传到根节点',
    type: 'number',
    defaultValue: '-',
  },
]

const controlledBeforeContent = (
  <div className="grid h-full w-full place-content-center bg-slate-950 text-center text-white">
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-[0.35em] text-fuchsia-200/70">Old palette</div>
      <div className="text-5xl font-black">RUE</div>
      <div className="mx-auto h-2 w-28 rounded-full bg-fuchsia-500" />
    </div>
  </div>
)

const controlledAfterContent = (
  <div className="grid h-full w-full place-content-center bg-neutral-100 text-center text-slate-900">
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-[0.35em] text-cyan-700/60">New palette</div>
      <div className="text-5xl font-black">RUE</div>
      <div className="mx-auto h-2 w-28 rounded-full bg-cyan-500" />
    </div>
  </div>
)

const ControlledDiffPreview: FC = () => {
  const controlledValue = ref(38)

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body gap-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="badge badge-outline">当前值 {controlledValue.value}</span>
          <button className="btn btn-xs" onClick={() => (controlledValue.value = 20)}>
            20
          </button>
          <button className="btn btn-xs" onClick={() => (controlledValue.value = 50)}>
            50
          </button>
          <button className="btn btn-xs" onClick={() => (controlledValue.value = 80)}>
            80
          </button>
        </div>
        <input
          type="range"
          className="range range-primary"
          min="0"
          max="100"
          value={String(controlledValue.value)}
          onChange={(event: Event) => {
            const target = event.target as HTMLInputElement
            controlledValue.value = Number(target.value)
          }}
        />
        <Diff
          className="rounded-box aspect-[16/9] border border-base-300"
          value={controlledValue.value}
          onChange={nextValue => {
            controlledValue.value = nextValue
          }}
          item1Label="Before"
          item2Label="After"
          resizerContent="sync"
          aria-label="品牌色调整对比"
          item1={controlledBeforeContent}
          item2={controlledAfterContent}
        />
      </div>
    </div>
  )
}

const DiffDemo: FC = () => {
  const tabEnhanced = ref<TabMode>('preview')
  const tabControlled = ref<TabMode>('preview')
  const tabReadonly = ref<TabMode>('preview')
  const tabLegacyImage = ref<TabMode>('preview')
  const tabLegacyText = ref<TabMode>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Diff 对比</h1>
        <p className="text-sm mt-3 mb-3">
          Diff 现在除了保持组合式结构，还补上一套更顺手的快捷 API。可以直接传内容和位置值，也可以用
          <code>Diff.Item1</code>、<code>Diff.Item2</code>、<code>Diff.Resizer</code> 自己拼装。
        </p>

        <h2>何时使用</h2>
        <ul>
          <li>需要比较两个版本、两套视觉稿或两段内容，并让用户自己拖动查看差异。</li>
          <li>想要一个更轻的 API，直接传左右内容和默认位置，而不是每次都手写三段结构。</li>
        </ul>

        <ExampleBlock
          title="增强写法"
          summary="直接用 item1、item2、item1Label、item2Label 和 resizerContent 就能得到可拖动的对比区域。"
          tab={tabEnhanced}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <Diff
                  className="rounded-box aspect-[16/9] border border-base-300"
                  defaultValue={44}
                  item1Label="V1"
                  item2Label="V2"
                  resizerContent="new"
                  aria-label="首页头图改版对比"
                  item1={
                    <div className="h-full w-full bg-[#112031] p-6 text-white">
                      <div className="flex h-full flex-col justify-between">
                        <div className="space-y-3">
                          <div className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">
                            Rue Cloud
                          </div>
                          <div className="max-w-[14rem] text-3xl font-semibold leading-tight">
                            Ship design changes with one source of truth
                          </div>
                          <div className="max-w-[16rem] text-sm text-slate-300">
                            聚焦深色界面和强对比 CTA，强调协作与发布节奏。
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <span className="rounded-full bg-cyan-400 px-3 py-1 text-xs font-semibold text-slate-950">
                            Publish faster
                          </span>
                          <span className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80">
                            Team sync
                          </span>
                        </div>
                      </div>
                    </div>
                  }
                  item2={
                    <div className="h-full w-full bg-base-200 p-6 text-base-content">
                      <div className="flex h-full flex-col justify-between rounded-box border border-base-300 bg-base-100 p-5 shadow-sm">
                        <div className="space-y-3">
                          <div className="text-xs uppercase tracking-[0.3em] opacity-60">
                            Rue Cloud
                          </div>
                          <div className="max-w-[14rem] text-3xl font-semibold leading-tight">
                            Design review feels calmer and more editorial
                          </div>
                          <div className="max-w-[16rem] text-sm opacity-70">
                            同一套信息结构，但把密度降下来，强调留白、节奏和可读性。
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-box bg-base-200 px-3 py-2">Clear sections</div>
                          <div className="rounded-box bg-base-200 px-3 py-2">Softer contrast</div>
                          <div className="rounded-box bg-base-200 px-3 py-2">Readable text</div>
                          <div className="rounded-box bg-base-200 px-3 py-2">Stable hierarchy</div>
                        </div>
                      </div>
                    </div>
                  }
                />
                <div className="text-sm opacity-70">
                  快捷模式下内部会自动生成拖动层，键盘聚焦后也能直接调整位置。
                </div>
              </div>
            </div>
          )}
          code={`<Diff
  className="rounded-box aspect-[16/9] border border-base-300"
  defaultValue={44}
  item1Label="V1"
  item2Label="V2"
  resizerContent="new"
  aria-label="首页头图改版对比"
  item1={
    <div className="h-full w-full bg-[#112031] p-6 text-white">
      <div className="flex h-full flex-col justify-between">
        <div className="space-y-3">
          <div className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">Rue Cloud</div>
          <div className="max-w-[14rem] text-3xl font-semibold leading-tight">
            Ship design changes with one source of truth
          </div>
          <div className="max-w-[16rem] text-sm text-slate-300">
            聚焦深色界面和强对比 CTA，强调协作与发布节奏。
          </div>
        </div>
        <div className="flex gap-2">
          <span className="rounded-full bg-cyan-400 px-3 py-1 text-xs font-semibold text-slate-950">
            Publish faster
          </span>
          <span className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80">
            Team sync
          </span>
        </div>
      </div>
    </div>
  }
  item2={
    <div className="h-full w-full bg-base-200 p-6 text-base-content">
      <div className="flex h-full flex-col justify-between rounded-box border border-base-300 bg-base-100 p-5 shadow-sm">
        <div className="space-y-3">
          <div className="text-xs uppercase tracking-[0.3em] opacity-60">Rue Cloud</div>
          <div className="max-w-[14rem] text-3xl font-semibold leading-tight">
            Design review feels calmer and more editorial
          </div>
          <div className="max-w-[16rem] text-sm opacity-70">
            同一套信息结构，但把密度降下来，强调留白、节奏和可读性。
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-box bg-base-200 px-3 py-2">Clear sections</div>
          <div className="rounded-box bg-base-200 px-3 py-2">Softer contrast</div>
          <div className="rounded-box bg-base-200 px-3 py-2">Readable text</div>
          <div className="rounded-box bg-base-200 px-3 py-2">Stable hierarchy</div>
        </div>
      </div>
    </div>
  }
/>`}
        />

        <ExampleBlock
          title="受控位置"
          summary="value 和 onChange 可以把 Diff 变成受控组件，适合和外部滑杆、表单或讲解步骤联动。"
          tab={tabControlled}
          preview={() => <ControlledDiffPreview />}
          code={`const value = ref(38)

<input
  type="range"
  className="range range-primary"
  min="0"
  max="100"
  value={String(value.value)}
  onChange={event => {
    const target = event.target as HTMLInputElement
    value.value = Number(target.value)
  }}
/>

<Diff
  className="rounded-box aspect-[16/9] border border-base-300"
  value={value.value}
  onChange={nextValue => {
    value.value = nextValue
  }}
  item1Label="Before"
  item2Label="After"
  resizerContent="sync"
  aria-label="品牌色调整对比"
  item1={
    <div className="grid h-full w-full place-content-center bg-slate-950 text-center text-white">
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.35em] text-fuchsia-200/70">Old palette</div>
        <div className="text-5xl font-black">RUE</div>
        <div className="mx-auto h-2 w-28 rounded-full bg-fuchsia-500" />
      </div>
    </div>
  }
  item2={
    <div className="grid h-full w-full place-content-center bg-neutral-100 text-center text-slate-900">
      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.35em] text-cyan-700/60">New palette</div>
        <div className="text-5xl font-black">RUE</div>
        <div className="mx-auto h-2 w-28 rounded-full bg-cyan-500" />
      </div>
    </div>
  }
/>`}
        />

        <ExampleBlock
          title="只读模式"
          summary="disabled 会保持当前可视结果，但不再允许拖动，适合说明文档、快照回顾或固定审稿视角。"
          tab={tabReadonly}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <Diff
                  className="rounded-box aspect-[16/9] border border-base-300"
                  value={62}
                  disabled={true}
                  item1Label="Dense"
                  item2Label="Comfort"
                  resizerContent="lock"
                  aria-label="信息密度对比"
                  item1={
                    <div className="h-full w-full bg-base-300 p-4 text-xs text-base-content">
                      <div className="grid h-full grid-cols-3 gap-2">
                        {Array.from({ length: 12 }).map((_, index) => (
                          <div
                            key={index}
                            className="rounded-box border border-base-100 bg-base-100 p-2"
                          >
                            <div className="h-2 w-8 rounded-full bg-primary/70" />
                            <div className="mt-2 space-y-1">
                              <div className="h-1.5 rounded-full bg-base-300" />
                              <div className="h-1.5 rounded-full bg-base-300" />
                              <div className="h-1.5 w-3/4 rounded-full bg-base-300" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  }
                  item2={
                    <div className="h-full w-full bg-base-200 p-6 text-base-content">
                      <div className="grid h-full gap-4 md:grid-cols-[1.1fr_0.9fr]">
                        <div className="rounded-box border border-base-300 bg-base-100 p-5">
                          <div className="h-3 w-24 rounded-full bg-primary/70" />
                          <div className="mt-4 space-y-3">
                            <div className="h-3 rounded-full bg-base-200" />
                            <div className="h-3 rounded-full bg-base-200" />
                            <div className="h-3 w-4/5 rounded-full bg-base-200" />
                          </div>
                        </div>
                        <div className="grid gap-3">
                          <div className="rounded-box border border-base-300 bg-base-100 p-4" />
                          <div className="rounded-box border border-base-300 bg-base-100 p-4" />
                          <div className="rounded-box border border-base-300 bg-base-100 p-4" />
                        </div>
                      </div>
                    </div>
                  }
                />
                <div className="text-sm opacity-70">固定为 62%，用来展示最终审稿视角。</div>
              </div>
            </div>
          )}
          code={`<Diff
  className="rounded-box aspect-[16/9] border border-base-300"
  value={62}
  disabled
  item1Label="Dense"
  item2Label="Comfort"
  resizerContent="lock"
  aria-label="信息密度对比"
  item1={
    <div className="h-full w-full bg-base-300 p-4 text-xs text-base-content">
      <div className="grid h-full grid-cols-3 gap-2">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="rounded-box border border-base-100 bg-base-100 p-2">
            <div className="h-2 w-8 rounded-full bg-primary/70" />
            <div className="mt-2 space-y-1">
              <div className="h-1.5 rounded-full bg-base-300" />
              <div className="h-1.5 rounded-full bg-base-300" />
              <div className="h-1.5 w-3/4 rounded-full bg-base-300" />
            </div>
          </div>
        ))}
      </div>
    </div>
  }
  item2={
    <div className="h-full w-full bg-base-200 p-6 text-base-content">
      <div className="grid h-full gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-box border border-base-300 bg-base-100 p-5">
          <div className="h-3 w-24 rounded-full bg-primary/70" />
          <div className="mt-4 space-y-3">
            <div className="h-3 rounded-full bg-base-200" />
            <div className="h-3 rounded-full bg-base-200" />
            <div className="h-3 w-4/5 rounded-full bg-base-200" />
          </div>
        </div>
        <div className="grid gap-3">
          <div className="rounded-box border border-base-300 bg-base-100 p-4" />
          <div className="rounded-box border border-base-300 bg-base-100 p-4" />
          <div className="rounded-box border border-base-300 bg-base-100 p-4" />
        </div>
      </div>
    </div>
  }
/>`}
        />

        <ExampleBlock
          title="图片对比"
          summary="组合式写法示例。"
          tab={tabLegacyImage}
          preview={() => (
            <Diff className="rounded-field aspect-16/9" tabIndex={0}>
              <Diff.Item1 role="img" tabIndex={0}>
                <img
                  alt="daisy"
                  src="https://img.daisyui.com/images/stock/photo-1560717789-0ac7c58ac90a.webp"
                />
              </Diff.Item1>
              <Diff.Item2 role="img">
                <img
                  alt="daisy"
                  src="https://img.daisyui.com/images/stock/photo-1560717789-0ac7c58ac90a-blur.webp"
                />
              </Diff.Item2>
              <Diff.Resizer />
            </Diff>
          )}
          code={`<Diff className="aspect-16/9" tabIndex={0}>
  <Diff.Item1 role="img" tabIndex={0}>
    <img alt="daisy" src="https://img.daisyui.com/images/stock/photo-1560717789-0ac7c58ac90a.webp" />
  </Diff.Item1>
  <Diff.Item2 role="img">
    <img alt="daisy" src="https://img.daisyui.com/images/stock/photo-1560717789-0ac7c58ac90a-blur.webp" />
  </Diff.Item2>
  <Diff.Resizer />
</Diff>`}
        />

        <ExampleBlock
          title="文本对比"
          summary="语义 API 不是替代，而是补充。"
          tab={tabLegacyText}
          preview={() => (
            <Diff className="rounded-field aspect-16/9" tabIndex={0}>
              <Diff.Item1 role="img" tabIndex={0}>
                <div className="bg-primary text-primary-content text-4xl lg:text-9xl font-black grid place-content-center">
                  DAISY
                </div>
              </Diff.Item1>
              <Diff.Item2 role="img">
                <div className="bg-base-200 text-4xl lg:text-9xl font-black grid place-content-center">
                  DAISY
                </div>
              </Diff.Item2>
              <Diff.Resizer />
            </Diff>
          )}
          code={`<Diff className="aspect-16/9" tabIndex={0}>
  <Diff.Item1 role="img" tabIndex={0}>
    <div className="bg-primary text-primary-content grid place-content-center text-9xl font-black">
      DAISY
    </div>
  </Diff.Item1>
  <Diff.Item2 role="img">
    <div className="bg-base-200 grid place-content-center text-9xl font-black">DAISY</div>
  </Diff.Item2>
  <Diff.Resizer />
</Diff>`}
        />

        <h2 id="diff-api">API</h2>
        <p>Diff 现在同时支持快捷模式和组合式模式，下面按根组件和子组件拆开列出。</p>

        <ApiTable rows={rootApiRows} />

        <div className="not-prose mt-6" />

        <ApiTable rows={compoundApiRows} />

        <div className="not-prose mt-6 rounded-box border border-base-300 bg-base-100 p-4 text-sm">
          <div className="font-semibold">模式选择建议</div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <div>
              <code>item1 / item2</code> 适合快速搭示例、做受控联动、补标签和默认手柄内容。
            </div>
            <div>
              <code>children + Diff.Item1 / Item2 / Resizer</code>{' '}
              适合保持组合结构，或自己完全掌控内部布局。
            </div>
          </div>
        </div>

        <h2>FAQ</h2>

        <h3>快捷模式和组合式模式怎么选？</h3>
        <p>
          如果你只是想比较两个内容块，优先用 <code>item1</code> 和 <code>item2</code>
          。如果你已经有现成结构， 或者需要完全接管内部节点顺序，就可以用组合式写法。
        </p>

        <h3>value 和 defaultValue 有什么区别？</h3>
        <p>
          <code>value</code> 是受控值，外部状态说了算；<code>defaultValue</code>{' '}
          只决定初始位置，之后由组件内部维护。
        </p>

        <h3>传了 children 之后 value 还会生效吗？</h3>
        <p>
          当前组件里，<code>children</code> 会切换到组合式模式，因此 <code>value</code>、
          <code>defaultValue</code>
          这些快捷模式能力不会接管内部布局。需要受控拖动时，优先使用 <code>item1</code> /{' '}
          <code>item2</code>。
        </p>
      </div>
    </SidebarPlayground>
  )
}

export default DiffDemo
