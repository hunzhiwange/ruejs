import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import { Button } from '@rue-js/design'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { renderDesignPreview } from './preview-test-gate'

type TabMode = 'preview' | 'code'
const EXAMPLE_TAB_MODES: TabMode[] = ['preview', 'code']

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

type DemoTone =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
type DemoVariant = 'filled' | 'outlined' | 'dashed'

interface ToneExample {
  label: string
  color?: DemoTone
}

interface StyleExample {
  label: string
  variant: DemoVariant
}

const renderExampleModeTabs = (value: TabMode, onChange: (value: TabMode) => void) => {
  return (
    <div role="tablist" className="tabs tabs-box mb-3 mt-4">
      {EXAMPLE_TAB_MODES.map(mode => {
        const isActive = value === mode
        return (
          <button
            type="button"
            role="tab"
            aria-selected={isActive ? 'true' : 'false'}
            className={`tab ${isActive ? 'tab-active' : ''}`}
            onClick={() => onChange(mode)}
          >
            {mode === 'preview' ? '预览' : 'JSX代码'}
          </button>
        )
      })}
    </div>
  )
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
      {renderExampleModeTabs(tab.value, mode => (tab.value = mode))}
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

const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-[1.05em]"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
  </svg>
)

const ArrowRightIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-[1.05em]"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m13 6 6 6-6 6" />
  </svg>
)

const HeartIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-[1.05em]"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z"
    />
  </svg>
)

const RocketIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-[1.05em]"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5 9 15l6 6" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 9c0-3.5 2.5-6 6-6 0 3.5-2.5 6-6 6Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 9 9 15" />
    <circle cx="14" cy="10" r="1" fill="currentColor" stroke="none" />
  </svg>
)

const MailIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-[1.05em]"
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
    className="size-[1.05em]"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 18h.01M19 18h.01M12 21h.01" />
  </svg>
)

const toneExamples: ToneExample[] = [
  { label: 'Default' },
  { label: 'Neutral', color: 'neutral' },
  { label: 'Primary', color: 'primary' },
  { label: 'Secondary', color: 'secondary' },
  { label: 'Accent', color: 'accent' },
  { label: 'Info', color: 'info' },
  { label: 'Success', color: 'success' },
  { label: 'Warning', color: 'warning' },
  { label: 'Error', color: 'error' },
]

const styleExamples: StyleExample[] = [
  { label: 'Filled', variant: 'filled' },
  { label: 'Outlined', variant: 'outlined' },
  { label: 'Dashed', variant: 'dashed' },
]

const loginExamples = [
  {
    label: 'Login with Email',
    icon: '@',
    className: 'bg-white text-base-content border-base-300',
    iconClassName: 'bg-base-200 text-base-content',
  },
  {
    label: 'Login with GitHub',
    icon: 'GH',
    className: 'bg-neutral text-neutral-content border-neutral',
    iconClassName: 'bg-white/15 text-white',
  },
  {
    label: 'Login with Google',
    icon: 'G',
    className: 'bg-white text-base-content border-base-300',
    iconClassName: 'bg-red-100 text-red-700',
  },
  {
    label: 'Login with Facebook',
    icon: 'f',
    className: 'bg-[#1A77F2] text-white border-[#005fd8]',
    iconClassName: 'bg-white/15 text-white',
  },
  {
    label: 'Login with X',
    icon: 'X',
    className: 'bg-black text-white border-black',
    iconClassName: 'bg-white/15 text-white',
  },
  {
    label: 'Login with Apple',
    icon: 'A',
    className: 'bg-black text-white border-black',
    iconClassName: 'bg-white/15 text-white',
  },
  {
    label: 'Login with Slack',
    icon: 'S',
    className: 'bg-[#622069] text-white border-[#591660]',
    iconClassName: 'bg-white/15 text-white',
  },
  {
    label: 'Login with Microsoft',
    icon: 'M',
    className: 'bg-[#2F2F2F] text-white border-black',
    iconClassName: 'bg-white/15 text-white',
  },
  {
    label: 'Login with LINE',
    icon: 'L',
    className: 'bg-[#03C755] text-white border-[#00b544]',
    iconClassName: 'bg-white/15 text-white',
  },
  {
    label: 'Login with MetaMask',
    icon: 'MM',
    className: 'bg-white text-base-content border-base-300',
    iconClassName: 'bg-orange-100 text-orange-700',
  },
] as const

const BrandMark: FC<{ text: string; className?: string }> = ({ text, className }) => {
  return (
    <span
      className={`inline-grid h-5 min-w-5 place-items-center rounded-full px-1 text-[0.55rem] leading-none font-bold ${className ?? 'bg-base-200 text-base-content'}`}
    >
      {text}
    </span>
  )
}

const apiRows: ApiRow[] = [
  {
    prop: 'active',
    description: '激活态，追加 btn-active',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'as',
    description: '指定渲染标签，可选 button、a、div',
    type: `'button' | 'a' | 'div'`,
    defaultValue: `'button'`,
  },
  {
    prop: 'block',
    description: '整行按钮，宽度撑满容器',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'color',
    description: '颜色层，danger 会映射到 error 按钮色',
    type: `'default' | 'danger' | 'neutral' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'`,
    defaultValue: `'default'`,
  },
  {
    prop: 'danger',
    description: '危险态快捷开关，未设置 color 时等价于 color="danger"',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'disabled',
    description: '禁用按钮；a 和 div 根节点也会输出禁用语义',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'href',
    description: '传入后默认以 a 标签渲染',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'htmlType',
    description: '原生 button 的 type',
    type: `'button' | 'submit' | 'reset'`,
    defaultValue: `'button'`,
  },
  {
    prop: 'icon',
    description: '图标节点',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'iconPlacement',
    description: '图标位置',
    type: `'start' | 'end'`,
    defaultValue: `'start'`,
  },
  {
    prop: 'loading',
    description: '支持 boolean 或对象写法，可自定义加载图标',
    type: `boolean | { delay?: number; icon?: any }`,
    defaultValue: 'false',
  },
  {
    prop: 'onClick',
    description: '点击按钮时的回调；disabled 或 loading 时不会触发',
    type: '(event: MouseEvent) => void',
    defaultValue: '-',
  },
  {
    prop: 'shape',
    description: '按钮形状',
    type: `'default' | 'square' | 'circle' | 'round'`,
    defaultValue: `'default'`,
  },
  {
    prop: 'size',
    description: '尺寸，支持 xs 到 xl，以及 small / middle / large 别名',
    type: `'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'middle' | 'medium' | 'large'`,
    defaultValue: '-',
  },
  {
    prop: 'target',
    description: '链接目标窗口，仅 a 标签生效',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'type',
    description: '视觉类型，直接替代基础的 variant 语义',
    type: `'solid' | 'filled' | 'outlined' | 'dashed' | 'text' | 'link'`,
    defaultValue: `'solid'`,
  },
  {
    prop: 'wide',
    description: '宽按钮，追加 btn-wide',
    type: 'boolean',
    defaultValue: 'false',
  },
]

const groupApiRows: ApiRow[] = [
  {
    prop: 'as',
    description: '指定按钮组根节点标签',
    type: 'any',
    defaultValue: `'div'`,
  },
  {
    prop: 'size',
    description: '统一同步组内按钮尺寸',
    type: `'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'middle' | 'medium' | 'large'`,
    defaultValue: '-',
  },
  {
    prop: 'shape',
    description: '统一同步组内按钮轮廓；circle 在分组场景下会映射为圆角组合样式',
    type: `'default' | 'square' | 'circle' | 'round'`,
    defaultValue: '-',
  },
  {
    prop: 'direction',
    description: '按钮组排列方向',
    type: `'horizontal' | 'vertical'`,
    defaultValue: `'horizontal'`,
  },
  {
    prop: 'block',
    description: '让按钮组宽度撑满容器',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'className',
    description: '自定义根节点类名',
    type: 'string',
    defaultValue: '-',
  },
]

const ButtonDemo: FC = () => {
  const tabTypes = ref<TabMode>('preview')
  const tabResponsive = ref<TabMode>('preview')
  const tabPalette = ref<TabMode>('preview')
  const tabVariants = ref<TabMode>('preview')
  const tabDanger = ref<TabMode>('preview')
  const tabIcons = ref<TabMode>('preview')
  const tabLoading = ref<TabMode>('preview')
  const tabClick = ref<TabMode>('preview')
  const tabSizes = ref<TabMode>('preview')
  const tabGroup = ref<TabMode>('preview')
  const tabStates = ref<TabMode>('preview')
  const tabFormLink = ref<TabMode>('preview')
  const tabRecipes = ref<TabMode>('preview')
  const tabLogin = ref<TabMode>('preview')
  const submitCount = ref(0)
  const clickCount = ref(0)
  const lastAction = ref('未触发')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Button 按钮</h1>
        <p className="text-sm mt-3 mb-3">
          <code>type</code> 负责视觉类型，
          <code>color</code> 负责主题色，再用 <code>shape</code>、<code>icon</code>、
          <code>loading</code> 补足交互细节。
        </p>

        <h2>何时使用</h2>
        <ul>
          <li>需要一个通用操作按钮，并希望颜色、类型、形状和状态能拆开表达。</li>
          <li>
            需要在表单里区分视觉类型 <code>type</code> 和原生提交类型 <code>htmlType</code>。
          </li>
          <li>需要统一处理图标按钮、加载按钮、链接按钮和整行按钮。</li>
        </ul>

        <ExampleBlock
          title="类型"
          summary="type 现在直接对应视觉类型。"
          tab={tabTypes}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body flex flex-row flex-wrap items-center gap-2">
                <Button>Solid</Button>
                <Button type="outlined">Outlined</Button>
                <Button type="dashed">Dashed</Button>
                <Button type="filled">Filled</Button>
                <Button type="text">Text</Button>
                <Button type="link">Link</Button>
              </div>
            </div>
          )}
          code={`<Button>Solid</Button>
        <Button type="outlined">Outlined</Button>
<Button type="dashed">Dashed</Button>
        <Button type="filled">Filled</Button>
<Button type="text">Text</Button>
<Button type="link">Link</Button>`}
        />

        <ExampleBlock
          title="响应式尺寸"
          summary="把基础的响应式按钮演示保持回来，统一改成 size + className 的方式。"
          tab={tabResponsive}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body flex flex-row flex-wrap items-center gap-2">
                <Button size="xs" className="sm:btn-sm md:btn-md lg:btn-lg xl:btn-xl">
                  Responsive
                </Button>
              </div>
            </div>
          )}
          code={`<Button size="xs" className="sm:btn-sm md:btn-md lg:btn-lg xl:btn-xl">
  Responsive
</Button>`}
        />

        <ExampleBlock
          title="颜色色板"
          summary="颜色演示展示，但统一改成 color 语义。"
          tab={tabPalette}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body flex flex-row flex-wrap items-center gap-2">
                {toneExamples.map(tone => (
                  <Button key={tone.label} color={tone.color}>
                    {tone.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
          code={`const tones = [
  { label: 'Default' },
  { label: 'Neutral', color: 'neutral' },
  { label: 'Primary', color: 'primary' },
  { label: 'Secondary', color: 'secondary' },
  { label: 'Accent', color: 'accent' },
  { label: 'Info', color: 'info' },
  { label: 'Success', color: 'success' },
  { label: 'Warning', color: 'warning' },
  { label: 'Error', color: 'error' },
] as const

<div className="flex flex-wrap gap-2">
  {tones.map(tone => (
    <Button key={tone.label} color={tone.color}>
      {tone.label}
    </Button>
  ))}
</div>`}
        />

        <ExampleBlock
          title="风格矩阵"
          summary="把基础的 soft、outline、dash 演示融合成统一的 type 展示。"
          tab={tabVariants}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-5">
                {styleExamples.map(style => (
                  <div key={style.label}>
                    <div className="mb-2 text-xs font-medium uppercase tracking-[0.2em] opacity-60">
                      {style.label}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {toneExamples.map(tone => (
                        <Button
                          key={`${style.label}-${tone.label}`}
                          color={tone.color}
                          type={style.variant}
                        >
                          {tone.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="rounded-box bg-white p-4 text-black">
                  <div className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-black/60">
                    Neutral on light surface
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button color="neutral" type="outlined">
                      Outline
                    </Button>
                    <Button color="neutral" type="dashed">
                      Dash
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          code={`const tones = [
  { label: 'Default' },
  { label: 'Neutral', color: 'neutral' },
  { label: 'Primary', color: 'primary' },
  { label: 'Secondary', color: 'secondary' },
  { label: 'Accent', color: 'accent' },
  { label: 'Info', color: 'info' },
  { label: 'Success', color: 'success' },
  { label: 'Warning', color: 'warning' },
  { label: 'Error', color: 'error' },
] as const

const styles = [
  { label: 'Filled', variant: 'filled' },
  { label: 'Outlined', variant: 'outlined' },
  { label: 'Dashed', variant: 'dashed' },
] as const

{styles.map(style => (
  <div key={style.label}>
    <div className="flex flex-wrap gap-2">
      {tones.map(tone => (
        <Button key={style.label + '-' + tone.label} color={tone.color} type={style.variant}>
          {tone.label}
        </Button>
      ))}
    </div>
  </div>
))}

<div className="bg-white p-4 rounded-box">
  <Button color="neutral" type="outlined">Outline</Button>
  <Button color="neutral" type="dashed">Dash</Button>
</div>`}
        />

        <ExampleBlock
          title="危险态"
          summary="danger 是快捷开关，也可以直接通过 color='danger' 控制。"
          tab={tabDanger}
          preview={() => (
            <div className="card bg-neutral text-neutral-content shadow-sm">
              <div className="card-body flex flex-row flex-wrap items-center gap-2">
                <Button color="danger">Delete forever</Button>
                <Button color="danger" type="outlined">
                  Remove access
                </Button>
                <Button color="danger" type="filled">
                  Archive branch
                </Button>
                <Button color="danger" type="text">
                  Clear cache
                </Button>
              </div>
            </div>
          )}
          code={`<Button color="danger">Delete forever</Button>
        <Button color="danger" type="outlined">Remove access</Button>
        <Button color="danger" type="filled">Archive branch</Button>
        <Button color="danger" type="text">Clear cache</Button>`}
        />

        <ExampleBlock
          title="图标与图标位置"
          summary="icon 和 iconPlacement 用来组织图标按钮与带文案按钮。"
          tab={tabIcons}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body flex flex-row flex-wrap items-center gap-2">
                <Button color="primary" icon={<PlusIcon />}>
                  Create project
                </Button>
                <Button
                  color="secondary"
                  type="outlined"
                  icon={<ArrowRightIcon />}
                  iconPlacement="end"
                >
                  Continue
                </Button>
                <Button color="accent" shape="circle" icon={<HeartIcon />} aria-label="收藏" />
                <Button color="info" shape="square" icon={<SparkIcon />} aria-label="高亮" />
              </div>
            </div>
          )}
          code={`<Button color="primary" icon={<span>+</span>}>
  Create project
</Button>

<Button color="secondary" type="outlined" icon={<span>→</span>} iconPlacement="end">
  Continue
</Button>

<Button color="accent" shape="circle" icon={<span>♥</span>} aria-label="收藏" />`}
        />

        <ExampleBlock
          title="加载状态"
          summary="loading 会锁定按钮；对象写法可以替换默认加载图标。"
          tab={tabLoading}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body flex flex-row flex-wrap items-center gap-2">
                <Button color="primary" loading>
                  Saving
                </Button>
                <Button
                  type="outlined"
                  loading={{ icon: <span className="loading loading-dots loading-xs" /> }}
                >
                  Syncing
                </Button>
                <Button color="success" icon={<RocketIcon />}>
                  Ready to publish
                </Button>
              </div>
            </div>
          )}
          code={`<Button color="primary" loading>Saving</Button>

<Button
  type="outlined"
  loading={{ icon: <span className="loading loading-dots loading-xs" /> }}
>
  Syncing
</Button>`}
        />

        <ExampleBlock
          title="点击事件"
          summary="onClick 会透传原生点击事件，适合命令触发、埋点和分组按钮内交互。"
          tab={tabClick}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    color="primary"
                    onClick={(event: MouseEvent) => {
                      clickCount.value = clickCount.value + 1
                      lastAction.value = `save:${(event.currentTarget as HTMLElement).tagName.toLowerCase()}`
                    }}
                  >
                    Trigger save
                  </Button>
                  <Button
                    type="outlined"
                    onClick={(event: MouseEvent) => {
                      clickCount.value = clickCount.value + 1
                      lastAction.value = `preview:${(event.currentTarget as HTMLElement).tagName.toLowerCase()}`
                    }}
                  >
                    Preview draft
                  </Button>
                  <Button
                    href="#button-api"
                    type="link"
                    onClick={(event: MouseEvent) => {
                      event.preventDefault()
                      clickCount.value = clickCount.value + 1
                      lastAction.value = `link:${(event.currentTarget as HTMLElement).tagName.toLowerCase()}`
                    }}
                  >
                    Track jump
                  </Button>
                </div>
                <div className="rounded-box bg-base-200/70 px-4 py-3 text-sm">
                  <div>click count: {clickCount.value}</div>
                  <div>last action: {lastAction.value}</div>
                </div>
              </div>
            </div>
          )}
          code={`const clickCount = ref(0)
const lastAction = ref('未触发')

<div className="flex flex-wrap items-center gap-2">
  <Button
    color="primary"
    onClick={event => {
      clickCount.value = clickCount.value + 1
      lastAction.value = 'save:' + (event.currentTarget as HTMLElement).tagName.toLowerCase()
    }}
  >
    Trigger save
  </Button>

  <Button
    type="outlined"
    onClick={event => {
      clickCount.value = clickCount.value + 1
      lastAction.value = 'preview:' + (event.currentTarget as HTMLElement).tagName.toLowerCase()
    }}
  >
    Preview draft
  </Button>

  <Button
    href="#button-api"
    type="link"
    onClick={event => {
      event.preventDefault()
      clickCount.value = clickCount.value + 1
      lastAction.value = 'link:' + (event.currentTarget as HTMLElement).tagName.toLowerCase()
    }}
  >
    Track jump
  </Button>
</div>

<div className="rounded-box bg-base-200/70 px-4 py-3 text-sm">
  <div>click count: {clickCount.value}</div>
  <div>last action: {lastAction.value}</div>
</div>`}
        />

        <ExampleBlock
          title="尺寸与形状"
          summary="size 管尺寸，shape 管轮廓形态。"
          tab={tabSizes}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-5">
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-[0.2em] opacity-60">
                    Sizes
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="small">Small</Button>
                    <Button>Default</Button>
                    <Button size="large" color="primary">
                      Large
                    </Button>
                    <Button size="xs" type="outlined">
                      XS
                    </Button>
                    <Button size="xl" color="secondary">
                      XL
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-[0.2em] opacity-60">
                    Shapes
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button color="primary" shape="round">
                      Round action
                    </Button>
                    <Button
                      color="secondary"
                      shape="square"
                      icon={<SparkIcon />}
                      aria-label="square"
                    />
                    <Button
                      color="accent"
                      shape="circle"
                      icon={<HeartIcon />}
                      aria-label="circle"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          code={`<Button size="small">Small</Button>
<Button>Default</Button>
<Button size="large" color="primary">Large</Button>
<Button size="xs" type="outlined">XS</Button>
<Button size="xl" color="secondary">XL</Button>

<Button color="primary" shape="round">Round action</Button>
<Button color="secondary" shape="square" icon={<span>⋯</span>} />
<Button color="accent" shape="circle" icon={<span>♥</span>} />`}
        />

        <ExampleBlock
          title="按钮组合"
          summary="提供与常见 Button.Group 类似的分组能力，这里统一用 Button.Group。"
          tab={tabGroup}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-6">
                <div>
                  <div className="mb-3 text-xs font-medium uppercase tracking-[0.2em] opacity-60">
                    Basic
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button.Group>
                      <Button>Cancel</Button>
                      <Button color="primary">Confirm</Button>
                    </Button.Group>
                    <Button.Group>
                      <Button disabled>Yesterday</Button>
                      <Button disabled>Today</Button>
                      <Button disabled>Tomorrow</Button>
                    </Button.Group>
                    <Button.Group>
                      <Button color="primary">L</Button>
                      <Button>M</Button>
                      <Button>M</Button>
                      <Button type="dashed">R</Button>
                    </Button.Group>
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-xs font-medium uppercase tracking-[0.2em] opacity-60">
                    Icons
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button.Group>
                      <Button color="primary" icon={<span aria-hidden="true">←</span>}>
                        Backward
                      </Button>
                      <Button
                        color="primary"
                        icon={<span aria-hidden="true">→</span>}
                        iconPlacement="end"
                      >
                        Forward
                      </Button>
                    </Button.Group>
                    <Button.Group>
                      <Button
                        color="primary"
                        icon={<span aria-hidden="true">«</span>}
                        aria-label="skip backward"
                      />
                      <Button
                        color="primary"
                        icon={<span aria-hidden="true">»</span>}
                        aria-label="skip forward"
                      />
                    </Button.Group>
                    <Button.Group>
                      <Button icon={<span aria-hidden="true">✦</span>} aria-label="magic" />
                      <Button icon={<span aria-hidden="true">☀</span>} aria-label="sunny" />
                      <Button icon={<span aria-hidden="true">✂</span>} aria-label="crop" />
                      <Button icon={<span aria-hidden="true">⛶</span>} aria-label="filter" />
                    </Button.Group>
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-xs font-medium uppercase tracking-[0.2em] opacity-60">
                    Circle
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button.Group shape="circle">
                      <Button color="primary">Backward</Button>
                      <Button color="primary">Forward</Button>
                    </Button.Group>
                    <Button.Group shape="circle">
                      <Button
                        color="primary"
                        icon={<span aria-hidden="true">«</span>}
                        aria-label="circle backward"
                      />
                      <Button
                        color="primary"
                        icon={<span aria-hidden="true">»</span>}
                        aria-label="circle forward"
                      />
                    </Button.Group>
                    <Button.Group shape="circle">
                      <Button icon={<span aria-hidden="true">✦</span>} aria-label="circle magic" />
                      <Button icon={<span aria-hidden="true">☀</span>} aria-label="circle sunny" />
                      <Button icon={<span aria-hidden="true">✂</span>} aria-label="circle crop" />
                      <Button icon={<span aria-hidden="true">⛶</span>} aria-label="circle filter" />
                    </Button.Group>
                  </div>
                </div>

                <div>
                  <div className="mb-3 text-xs font-medium uppercase tracking-[0.2em] opacity-60">
                    Size
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Button.Group size="large">
                        <Button>Large</Button>
                        <Button>Large</Button>
                      </Button.Group>
                      <Button.Group>
                        <Button>Default</Button>
                        <Button>Default</Button>
                      </Button.Group>
                      <Button.Group size="small">
                        <Button>Small</Button>
                        <Button>Small</Button>
                      </Button.Group>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button.Group size="large" shape="circle">
                        <Button>Large</Button>
                        <Button>Large</Button>
                      </Button.Group>
                      <Button.Group shape="circle">
                        <Button>Default</Button>
                        <Button>Default</Button>
                      </Button.Group>
                      <Button.Group size="small" shape="circle">
                        <Button>Small</Button>
                        <Button>Small</Button>
                      </Button.Group>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          code={`<div className="space-y-6">
  <div>
    <div className="mb-3 text-xs font-medium uppercase tracking-[0.2em] opacity-60">Basic</div>
    <div className="flex flex-wrap items-center gap-3">
      <Button.Group>
        <Button>Cancel</Button>
        <Button color="primary">Confirm</Button>
      </Button.Group>
      <Button.Group>
        <Button disabled>Yesterday</Button>
        <Button disabled>Today</Button>
        <Button disabled>Tomorrow</Button>
      </Button.Group>
      <Button.Group>
        <Button color="primary">L</Button>
        <Button>M</Button>
        <Button>M</Button>
        <Button type="dashed">R</Button>
      </Button.Group>
    </div>
  </div>

  <div>
    <div className="mb-3 text-xs font-medium uppercase tracking-[0.2em] opacity-60">Icons</div>
    <div className="flex flex-wrap items-center gap-3">
      <Button.Group>
        <Button color="primary" icon={<span aria-hidden="true">←</span>}>Backward</Button>
        <Button color="primary" icon={<span aria-hidden="true">→</span>} iconPlacement="end">
          Forward
        </Button>
      </Button.Group>
      <Button.Group>
        <Button color="primary" icon={<span aria-hidden="true">«</span>} aria-label="skip backward" />
        <Button color="primary" icon={<span aria-hidden="true">»</span>} aria-label="skip forward" />
      </Button.Group>
      <Button.Group>
        <Button icon={<span aria-hidden="true">✦</span>} aria-label="magic" />
        <Button icon={<span aria-hidden="true">☀</span>} aria-label="sunny" />
        <Button icon={<span aria-hidden="true">✂</span>} aria-label="crop" />
        <Button icon={<span aria-hidden="true">⛶</span>} aria-label="filter" />
      </Button.Group>
    </div>
  </div>

  <div>
    <div className="mb-3 text-xs font-medium uppercase tracking-[0.2em] opacity-60">Circle</div>
    <div className="flex flex-wrap items-center gap-3">
      <Button.Group shape="circle">
        <Button color="primary">Backward</Button>
        <Button color="primary">Forward</Button>
      </Button.Group>
      <Button.Group shape="circle">
        <Button color="primary" icon={<span aria-hidden="true">«</span>} aria-label="circle backward" />
        <Button color="primary" icon={<span aria-hidden="true">»</span>} aria-label="circle forward" />
      </Button.Group>
      <Button.Group shape="circle">
        <Button icon={<span aria-hidden="true">✦</span>} aria-label="circle magic" />
        <Button icon={<span aria-hidden="true">☀</span>} aria-label="circle sunny" />
        <Button icon={<span aria-hidden="true">✂</span>} aria-label="circle crop" />
        <Button icon={<span aria-hidden="true">⛶</span>} aria-label="circle filter" />
      </Button.Group>
    </div>
  </div>

  <div>
    <div className="mb-3 text-xs font-medium uppercase tracking-[0.2em] opacity-60">Size</div>
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button.Group size="large">
          <Button>Large</Button>
          <Button>Large</Button>
        </Button.Group>
        <Button.Group>
          <Button>Default</Button>
          <Button>Default</Button>
        </Button.Group>
        <Button.Group size="small">
          <Button>Small</Button>
          <Button>Small</Button>
        </Button.Group>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button.Group size="large" shape="circle">
          <Button>Large</Button>
          <Button>Large</Button>
        </Button.Group>
        <Button.Group shape="circle">
          <Button>Default</Button>
          <Button>Default</Button>
        </Button.Group>
        <Button.Group size="small" shape="circle">
          <Button>Small</Button>
          <Button>Small</Button>
        </Button.Group>
      </div>
    </div>
  </div>
</div>`}
        />

        <ExampleBlock
          title="状态与布局"
          summary="把基础的 active、disabled、wide、block 示例也融合到当前页面。"
          tab={tabStates}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-5">
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-[0.2em] opacity-60">
                    States
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button active>Active</Button>
                    <Button color="primary" active>
                      Primary active
                    </Button>
                    <Button disabled>Disabled</Button>
                    <Button href="#button-api" disabled>
                      Disabled link
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-[0.2em] opacity-60">
                    Layout
                  </div>
                  <div className="flex flex-col gap-2 sm:max-w-sm">
                    <Button wide>Wide button</Button>
                    <Button block color="primary">
                      Block button
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          code={`<div className="flex flex-wrap gap-2">
  <Button active>Active</Button>
  <Button color="primary" active>Primary active</Button>
  <Button disabled>Disabled</Button>
  <Button href="#button-api" disabled>Disabled link</Button>
</div>

<div className="flex flex-col gap-2 sm:max-w-sm">
  <Button wide>Wide button</Button>
  <Button block color="primary">Block button</Button>
</div>`}
        />

        <ExampleBlock
          title="根节点与表单行为"
          summary="默认渲染 button，同时保持链接根节点、div 根节点和表单行为示例。"
          tab={tabFormLink}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <div className="flex flex-wrap gap-2">
                  <Button>Native button</Button>
                  <Button href="#button-api">Anchor</Button>
                  <Button as="div" type="text">
                    Div button
                  </Button>
                </div>
                <div className="text-sm opacity-70">submit count: {submitCount.value}</div>
                <form
                  className="flex flex-wrap items-center gap-2"
                  onSubmit={(event: Event) => {
                    event.preventDefault()
                    submitCount.value = submitCount.value + 1
                  }}
                >
                  <Button color="primary" htmlType="submit">
                    Submit form
                  </Button>
                  <Button type="outlined" htmlType="reset">
                    Reset form
                  </Button>
                  <Button href="#button-api" type="link">
                    Jump to API
                  </Button>
                </form>
              </div>
            </div>
          )}
          code={`const submitCount = ref(0)

<div className="flex flex-wrap gap-2">
  <Button>Native button</Button>
  <Button href="#button-api">Anchor</Button>
  <Button as="div" type="text">Div button</Button>
</div>

<form
  onSubmit={event => {
    event.preventDefault()
    submitCount.value = submitCount.value + 1
  }}
>
  <Button color="primary" htmlType="submit">Submit form</Button>
  <Button type="outlined" htmlType="reset">Reset form</Button>
  <Button href="#button-api" type="link">Jump to API</Button>
</form>`}
        />

        <ExampleBlock
          title="场景组合"
          summary="把图标、变体、布局属性组合在一起，可以很快搭出操作条。"
          tab={tabRecipes}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <div className="flex flex-wrap gap-2">
                  <Button color="primary" icon={<RocketIcon />}>
                    Publish
                  </Button>
                  <Button type="outlined" icon={<ArrowRightIcon />} iconPlacement="end">
                    Preview
                  </Button>
                  <Button type="text" icon={<SparkIcon />}>
                    Save draft
                  </Button>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <Button
                    block
                    className="justify-start bg-white text-base-content border-base-300"
                    icon={<MailIcon />}
                  >
                    Continue with Email
                  </Button>
                  <Button block color="primary" className="justify-start" icon={<SparkIcon />}>
                    Continue with Rue ID
                  </Button>
                </div>
              </div>
            </div>
          )}
          code={`<div className="flex flex-wrap gap-2">
  <Button color="primary" icon={<span>🚀</span>}>Publish</Button>
  <Button type="outlined" icon={<span>→</span>} iconPlacement="end">Preview</Button>
  <Button type="text" icon={<span>✦</span>}>Save draft</Button>
</div>

<div className="grid gap-2 md:grid-cols-2">
  <Button block className="justify-start bg-white text-base-content border-base-300" icon={<span>✉</span>}>
    Continue with Email
  </Button>
  <Button block color="primary" className="justify-start" icon={<span>✦</span>}>
    Continue with Rue ID
  </Button>
</div>`}
        />

        <ExampleBlock
          title="登录按钮"
          summary="把基础的 provider 登录按钮演示融合回来，统一改成 icon + block + className 的新 API 写法。"
          tab={tabLogin}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <div className="grid gap-2 md:grid-cols-2">
                  {loginExamples.map(item => (
                    <Button
                      key={item.label}
                      block
                      className={`justify-start ${item.className}`}
                      icon={<BrandMark text={item.icon} className={item.iconClassName} />}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
          code={`const loginButtons = [
  { label: 'Login with Email', icon: '@', className: 'bg-white text-base-content border-base-300', iconClassName: 'bg-base-200 text-base-content' },
  { label: 'Login with GitHub', icon: 'GH', className: 'bg-neutral text-neutral-content border-neutral', iconClassName: 'bg-white/15 text-white' },
  { label: 'Login with Google', icon: 'G', className: 'bg-white text-base-content border-base-300', iconClassName: 'bg-red-100 text-red-700' },
  { label: 'Login with Slack', icon: 'S', className: 'bg-[#622069] text-white border-[#591660]', iconClassName: 'bg-white/15 text-white' },
] as const

<div className="grid gap-2 md:grid-cols-2">
  {loginButtons.map(item => (
    <Button
      key={item.label}
      block
      className={'justify-start ' + item.className}
      icon={<BrandMark text={item.icon} className={item.iconClassName} />}
    >
      {item.label}
    </Button>
  ))}
</div>`}
        />

        <h2 id="button-api">API</h2>
        <p>当前页面展示的是 Button 与 Button.Group 的完整可用 API。</p>
        <p>
          推荐使用顺序：<code>type</code> -&gt; <code>color</code> -&gt; <code>shape</code> -&gt;{' '}
          <code>size</code> -&gt; <code>loading</code> -&gt; <code>disabled</code>。
        </p>

        <h3>Button</h3>
        <ApiTable rows={apiRows} />

        <h3>Button.Group</h3>
        <ApiTable rows={groupApiRows} />

        <h2>FAQ</h2>

        <h3>为什么有 type 还需要 htmlType？</h3>
        <p>
          <code>type</code> 负责按钮视觉类型，<code>htmlType</code> 负责原生 button
          行为。视觉和提交语义拆开之后， 表单场景会更直接。
        </p>

        <h3>type 和 color 应该怎么分工？</h3>
        <p>
          <code>type</code> 负责视觉类型，比如 <code>outlined</code>、<code>filled</code>、
          <code>text</code>。<code>color</code> 负责主题色，比如 <code>primary</code>、
          <code>secondary</code>、<code>danger</code>。
        </p>
        <p>
          大多数场景可以先定颜色， 再根据密度和层级选择 <code>solid</code>、<code>outlined</code>、
          <code>filled</code> 或 <code>text</code>。
        </p>

        <h3>loading 对象里的 delay 会生效吗？</h3>
        <p>
          当前组件支持 <code>loading</code> 的对象写法和自定义 <code>icon</code>。<code>delay</code>
          字段已保持在配置结构里，后续如果补充延迟显示策略，可以直接在当前接口上继续扩展。
        </p>

        <h3>Button.Group 会覆盖子按钮哪些属性？</h3>
        <p>
          组级只会统一同步 <code>size</code> 和 <code>shape</code>
          ，方便在一组按钮上集中控制尺寸和轮廓。 每个子按钮自己的 <code>color</code>、
          <code>type</code>、<code>disabled</code>、<code>onClick</code> 仍然在各自的{' '}
          <code>Button</code> 上配置。
        </p>
      </div>
    </SidebarPlayground>
  )
}

export default ButtonDemo
