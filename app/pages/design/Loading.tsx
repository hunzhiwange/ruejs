import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Loading, Tabs } from '@rue-js/design'
import { renderDesignPreview } from './preview-test-gate'

type TabMode = 'preview' | 'code'
type LoadingStyle = 'spinner' | 'dots' | 'ring' | 'ball' | 'bars' | 'infinity'

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
      {tab.value === 'preview' ? (
        renderDesignPreview(title, preview)
      ) : (
        <Code className="mt-2" lang="tsx" code={code} />
      )}
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

const SparkIndicator = () => (
  <span className="relative inline-grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
    <span className="absolute inset-1 rounded-full border border-primary/25" />
    <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary border-r-primary/60" />
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
        d="m12 6 1.8 4.2L18 12l-4.2 1.8L12 18l-1.8-4.2L6 12l4.2-1.8L12 6Z"
      />
    </svg>
  </span>
)

const sizeRow = (style: LoadingStyle, testId?: string) => (
  <div className="flex flex-wrap items-center gap-4" data-testid={testId}>
    <Loading style={style} size="xs" />
    <Loading style={style} size="sm" />
    <Loading style={style} size="md" />
    <Loading style={style} size="lg" />
    <Loading style={style} size="xl" />
  </div>
)

const styleCode = (style: LoadingStyle) => `<Loading style="${style}" size="xs" />
<Loading style="${style}" size="sm" />
<Loading style="${style}" size="md" />
<Loading style="${style}" size="lg" />
<Loading style="${style}" size="xl" />`

const apiRows: ApiRow[] = [
  {
    prop: 'spinning',
    description: '是否显示加载态；嵌套内容时会控制遮罩和 aria-busy',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    prop: 'delay',
    description: '延迟显示加载效果，避免短请求闪烁',
    type: 'number',
    defaultValue: '0',
  },
  {
    prop: 'description / tip',
    description: '加载说明文案，tip 作为别名',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'indicator',
    description: '自定义指示器节点，也支持函数接收 percent、size、style、spinning',
    type: 'any | (info) => any',
    defaultValue: '-',
  },
  {
    prop: 'percent',
    description: '展示加载进度；auto 会展示自动推进的轻量进度',
    type: `number | 'auto'`,
    defaultValue: '-',
  },
  {
    prop: 'fullscreen',
    description: '显示全屏加载遮罩',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'style',
    description: '支持基础动效写法；传入对象或普通 CSS 字符串时作为根元素内联样式',
    type: `'spinner' | 'dots' | 'ring' | 'ball' | 'bars' | 'infinity' | object | string`,
    defaultValue: `'spinner'`,
  },
  {
    prop: 'indicatorStyle / variant / type',
    description: '显式指定 daisyUI loading 动效，优先级高于 style 字符串写法',
    type: `'spinner' | 'dots' | 'ring' | 'ball' | 'bars' | 'infinity'`,
    defaultValue: `'spinner'`,
  },
  {
    prop: 'size',
    description: '尺寸，支持 Rue 的 xs-xl，也支持 small/middle/large 别名',
    type: `'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'middle' | 'large'`,
    defaultValue: `'md'`,
  },
  {
    prop: 'classNames / styles',
    description: '定制 root、section、indicator、description、container 语义结构',
    type: 'Record<string, string> / Record<string, object>',
    defaultValue: '-',
  },
]

const LoadingPage: FC = () => {
  const tabBasic = ref<TabMode>('preview')
  const tabNested = ref<TabMode>('preview')
  const tabDescription = ref<TabMode>('preview')
  const tabDelay = ref<TabMode>('preview')
  const tabCustom = ref<TabMode>('preview')
  const tabPercent = ref<TabMode>('preview')
  const tabFullscreen = ref<TabMode>('preview')
  const tabSemantic = ref<TabMode>('preview')
  const tabSpinner = ref<TabMode>('preview')
  const tabDots = ref<TabMode>('preview')
  const tabRing = ref<TabMode>('preview')
  const tabBall = ref<TabMode>('preview')
  const tabBars = ref<TabMode>('preview')
  const tabInfinity = ref<TabMode>('preview')
  const tabColors = ref<TabMode>('preview')
  const nestedSpinning = ref(true)
  const delayedSpinning = ref(false)
  const fullscreenSpinning = ref(false)

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Loading 加载指示器</h1>
        <p className="text-sm mt-3 mb-3">
          Loading 现在既可以作为轻量 daisyUI 动效使用，也可以像 Spin
          一样包裹内容、展示描述、进度和全屏遮罩。
        </p>

        <ExampleBlock
          title="Basic spin"
          summary="默认就是 spinner，适合按钮旁边、空状态或局部小反馈。"
          tab={tabBasic}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div
                className="card-body flex flex-wrap items-center gap-6"
                data-testid="loading-basic-demo"
              >
                <Loading />
                <Loading size="large" className="text-primary" />
                <Loading indicatorStyle="dots" size="large" className="text-secondary" />
                <Loading spinning={false} data-testid="loading-hidden-demo" />
              </div>
            </div>
          )}
          code={`<Loading />
<Loading size="large" className="text-primary" />
<Loading indicatorStyle="dots" size="large" className="text-secondary" />
<Loading spinning={false} />`}
        />

        <ExampleBlock
          title="Nested content"
          summary="传入 children 后会生成局部遮罩，spinning 可受控切换。"
          tab={tabNested}
          preview={() => (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn btn-sm"
                  onClick={() => (nestedSpinning.value = !nestedSpinning.value)}
                >
                  {nestedSpinning.value ? '停止加载' : '开始加载'}
                </button>
              </div>
              <Loading
                key={nestedSpinning.value ? 'nested-loading' : 'nested-idle'}
                spinning={nestedSpinning.value}
                description="正在拉取洞察"
                className="rounded-box"
                data-testid="loading-nested-demo"
              >
                <div className="card border border-base-300 bg-base-100 shadow-sm">
                  <div className="card-body">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="card-title text-base">North Star Metrics</h3>
                        <p className="text-sm opacity-70">
                          Revenue pipeline and activation are syncing.
                        </p>
                      </div>
                      <div className="badge badge-primary badge-outline">Live</div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-box bg-base-200 p-4">
                        <div className="text-xs opacity-60">Activation</div>
                        <div className="text-2xl font-semibold">82%</div>
                      </div>
                      <div className="rounded-box bg-base-200 p-4">
                        <div className="text-xs opacity-60">Pipeline</div>
                        <div className="text-2xl font-semibold">$48k</div>
                      </div>
                      <div className="rounded-box bg-base-200 p-4">
                        <div className="text-xs opacity-60">Latency</div>
                        <div className="text-2xl font-semibold">128ms</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Loading>
            </div>
          )}
          code={`const spinning = ref(true)

<button className="btn btn-sm" onClick={() => (spinning.value = !spinning.value)}>
  Toggle
</button>

<Loading spinning={spinning.value} description="正在拉取洞察" className="rounded-box">
  <div className="card border border-base-300 bg-base-100 shadow-sm">
    <div className="card-body">Dashboard content</div>
  </div>
</Loading>`}
        />

        <ExampleBlock
          title="Description"
          summary="description 会与指示器组合，tip 仍作为别名保持。"
          tab={tabDescription}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div
                className="card-body flex flex-wrap items-center gap-10"
                data-testid="loading-description-demo"
              >
                <Loading description="同步中" size="small" />
                <Loading description="Preparing workspace" size="middle" className="text-primary" />
                <Loading
                  tip="Deploying edge cache"
                  indicatorStyle="ring"
                  size="large"
                  className="text-accent"
                />
              </div>
            </div>
          )}
          code={`<Loading description="同步中" size="small" />
<Loading description="Preparing workspace" size="middle" className="text-primary" />
<Loading tip="Deploying edge cache" indicatorStyle="ring" size="large" className="text-accent" />`}
        />

        <ExampleBlock
          title="Delay"
          summary="delay 可以避免 100-300ms 内完成的请求闪一下。"
          tab={tabDelay}
          preview={() => (
            <div className="space-y-4" data-testid="loading-delay-demo">
              <button
                className="btn btn-sm"
                onClick={() => (delayedSpinning.value = !delayedSpinning.value)}
              >
                {delayedSpinning.value ? '结束请求' : '模拟请求'}
              </button>
              <Loading
                key={delayedSpinning.value ? 'delay-loading' : 'delay-idle'}
                spinning={delayedSpinning.value}
                delay={600}
                description="延迟 600ms 后出现"
              >
                <div className="rounded-box border border-dashed border-base-300 bg-base-100 p-8 text-sm opacity-80">
                  快速请求不会立即打断用户视线，超过 delay 后才出现 loading。
                </div>
              </Loading>
            </div>
          )}
          code={`const spinning = ref(false)

<button className="btn btn-sm" onClick={() => (spinning.value = !spinning.value)}>
  Toggle request
</button>

<Loading spinning={spinning.value} delay={600} description="延迟 600ms 后出现">
  <div className="rounded-box border border-dashed border-base-300 bg-base-100 p-8">
    Content
  </div>
</Loading>`}
        />

        <ExampleBlock
          title="Custom indicator"
          summary="indicator 可传节点，也可用函数读取 percent、size、style 等状态。"
          tab={tabCustom}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div
                className="card-body flex flex-wrap items-center gap-10"
                data-testid="loading-custom-demo"
              >
                <Loading indicator={<SparkIndicator />} description="Mapping signals" />
                <Loading
                  percent={64}
                  description="Function indicator"
                  indicator={({ percent }: { percent?: number }) => (
                    <span className="inline-grid size-14 place-items-center rounded-full border border-primary/30 bg-primary/10 text-sm font-semibold text-primary">
                      {Math.round(percent ?? 0)}
                    </span>
                  )}
                />
              </div>
            </div>
          )}
          code={`const SparkIndicator = () => (
  <span className="relative inline-grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
    <span className="absolute inset-1 rounded-full border border-primary/25" />
    <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary border-r-primary/60" />
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
        d="m12 6 1.8 4.2L18 12l-4.2 1.8L12 18l-1.8-4.2L6 12l4.2-1.8L12 6Z"
      />
    </svg>
  </span>
)

<Loading indicator={<SparkIndicator />} description="Mapping signals" />

<Loading
  percent={64}
  description="Function indicator"
  indicator={({ percent }) => (
    <span className="inline-grid size-14 place-items-center rounded-full">
      {Math.round(percent ?? 0)}
    </span>
  )}
/>`}
        />

        <ExampleBlock
          title="Percent"
          summary="percent 展示确定进度；auto 用于未知耗时但仍想给出推进感的场景。"
          tab={tabPercent}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div
                className="card-body flex flex-wrap items-center gap-10"
                data-testid="loading-percent-demo"
              >
                <Loading percent={18} description="Queued" size="small" />
                <Loading percent={58} description="Uploading" className="text-primary" />
                <Loading
                  percent={92}
                  description="Almost there"
                  indicatorStyle="ring"
                  className="text-success"
                />
                <Loading
                  percent="auto"
                  description="Auto estimate"
                  indicatorStyle="dots"
                  className="text-accent"
                />
              </div>
            </div>
          )}
          code={`<Loading percent={18} description="Queued" size="small" />
<Loading percent={58} description="Uploading" className="text-primary" />
<Loading percent={92} description="Almost there" indicatorStyle="ring" className="text-success" />
<Loading percent="auto" description="Auto estimate" indicatorStyle="dots" className="text-accent" />`}
        />

        <ExampleBlock
          title="Fullscreen"
          summary="fullscreen 会创建全屏遮罩；这个示例 点击遮罩即可关闭。"
          tab={tabFullscreen}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body items-start gap-4" data-testid="loading-fullscreen-demo">
                <button
                  className="btn btn-primary"
                  onClick={() => (fullscreenSpinning.value = true)}
                >
                  Show fullscreen
                </button>
                <p className="m-0 text-sm opacity-70">打开后点击遮罩关闭，避免示例页被永久盖住。</p>
                {fullscreenSpinning.value ? (
                  <Loading
                    fullscreen
                    percent={72}
                    description="同步全局配置"
                    onClick={() => (fullscreenSpinning.value = false)}
                  />
                ) : null}
              </div>
            </div>
          )}
          code={`const fullscreen = ref(false)

<button className="btn btn-primary" onClick={() => (fullscreen.value = true)}>
  Show fullscreen
</button>

<Loading
  fullscreen
  spinning={fullscreen.value}
  percent={72}
  description="同步全局配置"
  onClick={() => (fullscreen.value = false)}
/>`}
        />

        <ExampleBlock
          title="Semantic styling"
          summary="classNames/styles 可以精确控制 root、section、indicator、description、container。"
          tab={tabSemantic}
          preview={() => (
            <Loading
              spinning
              description="Semantic slots"
              percent={44}
              classNames={{
                root: 'rounded-box border border-primary/20 bg-primary/5 p-6',
                section: '!bg-primary/10',
                description: 'font-semibold text-primary',
                container: 'rounded-box',
              }}
              styles={{ indicator: { color: 'var(--color-primary)' } }}
              data-testid="loading-semantic-demo"
            >
              <div className="rounded-box bg-base-100 p-6 shadow-sm">
                <div className="font-semibold">Container slot</div>
                <p className="m-0 mt-1 text-sm opacity-70">
                  The wrapped content keeps its own surface while the loader owns the overlay.
                </p>
              </div>
            </Loading>
          )}
          code={`<Loading
  spinning
  description="Semantic slots"
  percent={44}
  classNames={{
    root: 'rounded-box border border-primary/20 bg-primary/5 p-6',
    section: '!bg-primary/10',
    description: 'font-semibold text-primary',
    container: 'rounded-box',
  }}
  styles={{ indicator: { color: 'var(--color-primary)' } }}
>
  <div className="rounded-box bg-base-100 p-6 shadow-sm">Container slot</div>
</Loading>`}
        />

        <ExampleBlock
          title="Loading spinner"
          tab={tabSpinner}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">{sizeRow('spinner', 'loading-spinner-demo')}</div>
            </div>
          )}
          code={styleCode('spinner')}
        />
        <ExampleBlock
          title="Loading dots"
          tab={tabDots}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">{sizeRow('dots')}</div>
            </div>
          )}
          code={styleCode('dots')}
        />
        <ExampleBlock
          title="Loading ring"
          tab={tabRing}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">{sizeRow('ring')}</div>
            </div>
          )}
          code={styleCode('ring')}
        />
        <ExampleBlock
          title="Loading ball"
          tab={tabBall}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">{sizeRow('ball')}</div>
            </div>
          )}
          code={styleCode('ball')}
        />
        <ExampleBlock
          title="Loading bars"
          tab={tabBars}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">{sizeRow('bars')}</div>
            </div>
          )}
          code={styleCode('bars')}
        />
        <ExampleBlock
          title="Loading infinity"
          tab={tabInfinity}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">{sizeRow('infinity')}</div>
            </div>
          )}
          code={styleCode('infinity')}
        />

        <ExampleBlock
          title="Loading with colors"
          tab={tabColors}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div
                className="card-body flex flex-wrap items-center gap-4"
                data-testid="loading-colors-demo"
              >
                <Loading style="spinner" className="text-primary" />
                <Loading style="spinner" className="text-secondary" />
                <Loading style="spinner" className="text-accent" />
                <Loading style="spinner" className="text-neutral" />
                <Loading style="spinner" className="text-info" />
                <Loading style="spinner" className="text-success" />
                <Loading style="spinner" className="text-warning" />
                <Loading style="spinner" className="text-error" />
              </div>
            </div>
          )}
          code={`<Loading style="spinner" className="text-primary" />
<Loading style="spinner" className="text-secondary" />
<Loading style="spinner" className="text-accent" />
<Loading style="spinner" className="text-neutral" />
<Loading style="spinner" className="text-info" />
<Loading style="spinner" className="text-success" />
<Loading style="spinner" className="text-warning" />
<Loading style="spinner" className="text-error" />`}
        />

        <h2>API</h2>
        <ApiTable rows={apiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default LoadingPage
