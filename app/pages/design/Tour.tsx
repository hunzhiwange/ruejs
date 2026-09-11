import type { FC } from '@rue-js/rue'
import { ref, useRef } from '@rue-js/rue'
import { Tour } from '@rue-js/design'
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

const basicTab = ref<PreviewTabMode>('preview')
const welcomeTab = ref<PreviewTabMode>('preview')
const placementTab = ref<PreviewTabMode>('preview')
const customTab = ref<PreviewTabMode>('preview')

const placementOptions = ['top', 'right', 'bottom', 'left'] as const

const apiRows: ApiRow[] = [
  {
    prop: 'steps',
    description: '引导步骤数组，每步可独立配置 target、placement、mask、cover 与按钮文案。',
    type: 'TourStepProps[]',
    defaultValue: '[]',
  },
  {
    prop: 'open / defaultOpen',
    description: '受控或非受控地打开引导浮层。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'current / defaultCurrent',
    description: '受控或非受控地指定当前步骤索引。',
    type: 'number',
    defaultValue: '0',
  },
  {
    prop: 'placement',
    description: '全局浮层位置，单步可继续覆盖。',
    type: 'TourPlacement',
    defaultValue: 'bottom',
  },
  {
    prop: 'mask / disabledInteraction',
    description: '控制遮罩是否启用，以及高亮区是否允许继续交互。',
    type: 'boolean | { color?: string; style?: object } / boolean',
    defaultValue: 'true / false',
  },
  {
    prop: 'gap',
    description: '调整高亮区与目标的间距和圆角，适合按钮、卡片、输入框等不同密度场景。',
    type: '{ offset?: number | [number, number]; radius?: number }',
    defaultValue: '{ offset: 8, radius: 18 }',
  },
  {
    prop: 'arrow / closeIcon / type',
    description: '配置箭头、关闭按钮与主视觉主题。',
    type: 'boolean | object / any / default | primary',
    defaultValue: 'true / x / default',
  },
  {
    prop: 'indicatorsRender / actionsRender',
    description: '自定义底部步骤指示器与整体操作区。',
    type: '(current, total) => any / (originNode, info) => any',
    defaultValue: '-',
  },
  {
    prop: 'scrollIntoViewOptions',
    description: '步骤切换时自动把目标滚动进视口，可关闭或传入原生配置。',
    type: 'boolean | ScrollIntoViewOptions',
    defaultValue: '{ block: center, inline: center, behavior: smooth }',
  },
  {
    prop: 'onChange / onClose / onFinish / onOpenChange',
    description: '监听步骤变化、关闭、完成和打开状态变化。',
    type: 'function',
    defaultValue: '-',
  },
  {
    prop: 'classNames / styles',
    description: '按语义节点扩展 root、mask、spotlight、panel、footer、indicator 等样式。',
    type: 'object',
    defaultValue: '-',
  },
]

const basicCode = `import { ref, useRef } from '@rue-js/rue'
import { Tour } from '@rue-js/design'
const visible = ref(false)
const current = ref(0)
const session = ref(0)
const uploadRef = useRef<HTMLButtonElement>()
const saveRef = useRef<HTMLButtonElement>()
const moreRef = useRef<HTMLButtonElement>()

const steps = [
  {
    target: () => uploadRef.current ?? null,
    title: 'Upload',
    description: 'Bring files into the workspace first.',
    placement: 'top',
  },
  {
    target: () => saveRef.current ?? null,
    title: 'Save',
    description: 'Save your changes.',
    placement: 'top',
  },
  {
    target: () => moreRef.current ?? null,
    title: 'More',
    description: 'Open additional actions from here.',
    placement: 'left',
    nextButtonProps: { children: '完成引导' },
  },
]

const openTour = () => {
  session.value += 1
  current.value = 0
  visible.value = true
}

<button type="button" className="btn btn-primary" onClick={openTour}>
  Basic
</button>

<div className="flex items-center gap-3">
  <button ref={element => { uploadRef.current = element ?? undefined }} data-basic-tour-target="upload" type="button" className="btn btn-outline">
    Upload
  </button>
  <button ref={element => { saveRef.current = element ?? undefined }} data-basic-tour-target="save" type="button" className="btn btn-primary">
    Save
  </button>
  <button ref={element => { moreRef.current = element ?? undefined }} data-basic-tour-target="more" type="button" className="btn btn-outline" aria-label="More actions">
    More
  </button>
</div>

{visible.value ? (
  <Tour
    key={\`basic-tour-\${session.value}-\${current.value}-\${visible.value ? 'open' : 'closed'}\`}
    open={visible.value}
    current={current.value}
    steps={steps}
    onOpenChange={nextOpen => {
      visible.value = nextOpen
    }}
    onChange={nextCurrent => {
      current.value = nextCurrent
    }}
  />
) : null}
`

const welcomeCode = `import { ref, useRef } from '@rue-js/rue'
import { Tour } from '@rue-js/design'
const open = ref(false)
const current = ref(0)
const heroRef = useRef<HTMLDivElement>()

const steps = [
  {
    placement: 'center',
    title: '欢迎来到新工作台',
    description: '第一步没有 target，会自动居中渲染。',
    cover: <div className="h-28 rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-700" />,
  },
  {
    target: () => heroRef.current,
    title: '非模态模式',
    description: '把 mask 设为 false 时，浮层只负责讲解，不阻断页面。',
    placement: 'bottomRight',
  },
]

<Tour
  open={open.value}
  current={current.value}
  mask={false}
  steps={steps}
  onOpenChange={nextOpen => {
    open.value = nextOpen
  }}
  onChange={nextCurrent => {
    current.value = nextCurrent
  }}
/>
`

const placementCode = `import { ref, useRef } from '@rue-js/rue'
import { Tour } from '@rue-js/design'
const open = ref(false)
const current = ref(0)
const activePlacement = ref<'top' | 'right' | 'bottom' | 'left'>('right')
const anchorRef = useRef<HTMLButtonElement>()

<Tour
  open={open.value}
  current={current.value}
  placement={activePlacement.value}
  gap={{ offset: [12, 16], radius: 22 }}
  steps={[
    {
      target: () => anchorRef.current,
      title: '高亮区仍可交互',
      description: 'disabledInteraction 默认为 false，所以目标仍可被点击。',
    },
  ]}
  onOpenChange={nextOpen => {
    open.value = nextOpen
  }}
  onChange={nextCurrent => {
    current.value = nextCurrent
  }}
/>
`

const customCode = `import { ref, useRef } from '@rue-js/rue'
import { Tour } from '@rue-js/design'
const open = ref(false)
const current = ref(0)
const summaryRef = useRef<HTMLDivElement>()
const approvalRef = useRef<HTMLButtonElement>()

const compactPrimaryStyles = {
  panel: {
    width: 'min(92vw, 21rem)',
    maxHeight: 'calc(100vh - 1.5rem)',
  },
  section: {
    maxHeight: 'calc(100vh - 1.5rem)',
    overflowY: 'auto',
    padding: '16px',
  },
  cover: {
    marginBottom: '12px',
  },
  meta: {
    color: 'rgba(255,255,255,0.82)',
    background: 'rgba(255,255,255,0.12)',
  },
  title: {
    color: '#fff',
    fontSize: '1rem',
    lineHeight: '1.5rem',
  },
  description: {
    color: 'rgba(255,255,255,0.88)',
    marginTop: '10px',
    fontSize: '14px',
    lineHeight: '1.5rem',
  },
  footer: {
    marginTop: '14px',
    paddingTop: '12px',
    borderColor: 'rgba(255,255,255,0.14)',
  },
  actions: {
    gap: '10px',
  },
  buttons: {
    gap: '8px',
  },
  prevButton: {
    minWidth: '72px',
    height: '36px',
    color: '#fff',
    borderColor: 'rgba(255,255,255,0.22)',
  },
  nextButton: {
    minWidth: '88px',
    height: '36px',
  },
}

<Tour
  open={open.value}
  current={current.value}
  type="primary"
  styles={compactPrimaryStyles}
  steps={[
    {
      target: () => summaryRef.current,
      title: '自定义头图与主题',
      description: '单步可以覆盖 cover、按钮文案和主题。',
      cover: <div className="h-20 rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-700" />,
    },
    {
      target: () => approvalRef.current,
      title: '重写底部 actions',
      description: '适合接入跳过、重播、埋点或业务动作。',
      nextButtonProps: { children: '提交并结束' },
    },
  ]}
  indicatorsRender={(step, total) => (
    <span className="text-xs uppercase tracking-[0.2em] text-white/80">{step + 1} / {total}</span>
  )}
  actionsRender={(originNode, info) => (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs uppercase tracking-[0.2em] text-white/72">phase {info.current + 1}</span>
      {originNode}
    </div>
  )}
  onOpenChange={nextOpen => {
    open.value = nextOpen
  }}
  onChange={nextCurrent => {
    current.value = nextCurrent
  }}
/>
`

const compactPrimaryTourStyles = {
  panel: {
    width: 'min(92vw, 21rem)',
    maxHeight: 'calc(100vh - 1.5rem)',
  },
  section: {
    maxHeight: 'calc(100vh - 1.5rem)',
    overflowY: 'auto',
    padding: '16px',
  },
  cover: {
    marginBottom: '12px',
  },
  meta: {
    color: 'rgba(255,255,255,0.82)',
    background: 'rgba(255,255,255,0.12)',
  },
  title: {
    color: '#fff',
    fontSize: '1rem',
    lineHeight: '1.5rem',
  },
  description: {
    color: 'rgba(255,255,255,0.88)',
    marginTop: '10px',
    fontSize: '14px',
    lineHeight: '1.5rem',
  },
  footer: {
    marginTop: '14px',
    paddingTop: '12px',
    borderColor: 'rgba(255,255,255,0.14)',
  },
  actions: {
    gap: '10px',
  },
  buttons: {
    gap: '8px',
  },
  prevButton: {
    minWidth: '72px',
    height: '36px',
    color: '#fff',
    borderColor: 'rgba(255,255,255,0.22)',
  },
  nextButton: {
    minWidth: '88px',
    height: '36px',
  },
}

const BasicWorkspacePreview: FC = () => {
  const tourVisible = ref(false)
  const current = ref(0)
  const tourSession = ref(0)
  const note = ref('点击 Basic 按钮后弹出引导')
  const uploadRef = useRef<HTMLButtonElement>()
  const saveRef = useRef<HTMLButtonElement>()
  const moreRef = useRef<HTMLButtonElement>()

  const steps = [
    {
      target: () => uploadRef.current ?? null,
      title: 'Upload',
      description: 'Bring files into the workspace first.',
      placement: 'top' as const,
    },
    {
      target: () => saveRef.current ?? null,
      title: 'Save',
      description: 'Save your changes.',
      placement: 'top' as const,
    },
    {
      target: () => moreRef.current ?? null,
      title: 'More',
      description: 'Open additional actions from here.',
      placement: 'left' as const,
      nextButtonProps: { children: '完成引导' },
    },
  ]

  const startTour = () => {
    tourSession.value += 1
    current.value = 0
    tourVisible.value = true
    note.value = '正在查看 Upload'
  }

  return (
    <div className="rounded-[2rem] border border-base-300/70 bg-gradient-to-br from-base-100 via-base-100 to-base-200/45 p-5 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.55)]">
      <div className="mb-6 text-[2.25rem] font-semibold tracking-tight text-base-content md:text-[2.7rem]">
        代码演示
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary rounded-2xl px-5" onClick={startTour}>
          Basic
        </button>
        <button
          type="button"
          className="btn btn-ghost rounded-2xl px-4"
          onClick={() => {
            current.value = 0
            tourVisible.value = false
            note.value = '基础引导已重置'
          }}
        >
          重置
        </button>
        <span className="text-sm text-base-content/60">{note.value}</span>
      </div>

      <div className="rounded-[1.7rem] border border-base-300/70 bg-base-100/82 p-6 shadow-[0_22px_60px_-48px_rgba(15,23,42,0.6)]">
        <div className="rounded-[1.5rem] border border-base-300/70 bg-base-100 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-base-content">Action Bar</div>
              <div className="mt-1 text-sm text-base-content/55">
                点击 Basic 后，会依次讲解 Upload、Save 和更多操作。
              </div>
            </div>
            <span className="badge badge-outline badge-sm px-3 py-3">Code 示例</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              ref={(element: HTMLButtonElement | null) => {
                uploadRef.current = element ?? undefined
              }}
              data-basic-tour-target="upload"
              type="button"
              className="btn btn-outline rounded-2xl px-6"
            >
              Upload
            </button>
            <button
              ref={(element: HTMLButtonElement | null) => {
                saveRef.current = element ?? undefined
              }}
              data-basic-tour-target="save"
              type="button"
              className="btn btn-primary rounded-2xl px-7"
            >
              Save
            </button>
            <button
              ref={(element: HTMLButtonElement | null) => {
                moreRef.current = element ?? undefined
              }}
              data-basic-tour-target="more"
              type="button"
              aria-label="More actions"
              className="btn btn-outline rounded-2xl px-5"
            >
              More
            </button>
          </div>
        </div>
      </div>

      {tourVisible.value ? (
        <Tour
          key={`basic-tour-${tourSession.value}-${current.value}-${tourVisible.value ? 'open' : 'closed'}`}
          open={tourVisible.value}
          current={current.value}
          steps={steps}
          gap={{ offset: [10, 14], radius: 18 }}
          onOpenChange={nextOpen => {
            tourVisible.value = nextOpen
            if (!nextOpen) {
              current.value = 0
            }
          }}
          onChange={nextCurrent => {
            current.value = nextCurrent
            note.value = `正在查看 ${steps[nextCurrent]?.title ?? `第 ${nextCurrent + 1} 步`}`
          }}
          onClose={() => {
            note.value = '基础引导已关闭'
          }}
          onFinish={() => {
            current.value = 0
            note.value = '基础引导已完成'
          }}
        />
      ) : null}
    </div>
  )
}

const WelcomePreview: FC = () => {
  const open = ref(false)
  const current = ref(0)
  const tourSession = ref(0)
  const heroRef = useRef<HTMLDivElement>()
  const metricsRef = useRef<HTMLDivElement>()

  const steps = [
    {
      placement: 'center' as const,
      title: '欢迎来到 Rue Tour',
      description: '第一步不绑定 target，会自动居中显示。适合首访说明、版本更新和整页 onboarding。',
      cover: (
        <div className="h-28 rounded-[1.25rem] bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-700" />
      ),
      nextButtonProps: { children: '继续看页面' },
    },
    {
      target: () => heroRef.current,
      title: '非模态说明更适合轻引导',
      description: '这里关闭了遮罩，用户仍然可以浏览内容，不会被强行打断。',
      placement: 'bottomRight' as const,
    },
    {
      target: () => metricsRef.current,
      title: '局部强调也能单独覆盖 placement',
      description: '同一套 Tour 可以混合 center 步骤与 target 步骤。',
      placement: 'top' as const,
      nextButtonProps: { children: '知道了' },
    },
  ]

  return (
    <div className="rounded-[2rem] border border-base-300/70 bg-base-100 p-5 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.55)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">欢迎页 + 非模态引导</div>
          <div className="mt-1 text-sm text-base-content/60">
            适合把版本亮点和页面主内容穿在同一条体验线上。
          </div>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm rounded-full"
          onClick={() => {
            tourSession.value += 1
            current.value = 0
            open.value = true
          }}
        >
          打开欢迎引导
        </button>
      </div>

      <div
        ref={(element: HTMLDivElement | null) => {
          heroRef.current = element ?? undefined
        }}
        className="rounded-[1.7rem] bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-500 p-6 text-white"
      >
        <div className="badge badge-sm border-0 bg-white/15 text-white">Release Note</div>
        <div className="mt-4 text-2xl font-semibold">Shipping cockpit for product operations</div>
        <div className="mt-2 max-w-xl text-sm text-white/75">
          把素材、上线窗口、审批节点和回放笔记收进同一块工作区，不必在多个页面之间反复跳转。
        </div>
      </div>

      <div
        ref={(element: HTMLDivElement | null) => {
          metricsRef.current = element ?? undefined
        }}
        className="mt-4 grid gap-4 md:grid-cols-3"
      >
        {[
          ['Launches', '12'],
          ['Reviews', '5'],
          ['Pending', '2'],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-[1.4rem] border border-base-300/70 bg-base-100/80 p-4"
          >
            <div className="text-sm text-base-content/55">{label}</div>
            <div className="mt-2 text-3xl font-semibold">{value}</div>
          </div>
        ))}
      </div>

      {open.value ? (
        <Tour
          key={`welcome-tour-${tourSession.value}-${current.value}-${open.value ? 'open' : 'closed'}`}
          open={open.value}
          current={current.value}
          mask={false}
          steps={steps}
          onOpenChange={nextOpen => {
            open.value = nextOpen
            if (!nextOpen) {
              current.value = 0
            }
          }}
          onChange={nextCurrent => {
            current.value = nextCurrent
          }}
          onFinish={() => {
            current.value = 0
          }}
        />
      ) : null}
    </div>
  )
}

const PlacementPreview: FC = () => {
  const open = ref(false)
  const current = ref(0)
  const tourSession = ref(0)
  const tapCount = ref(0)
  const activePlacement = ref<(typeof placementOptions)[number]>('right')
  const anchorRef = useRef<HTMLButtonElement>()

  const steps = [
    {
      target: () => anchorRef.current,
      title: '高亮区默认仍可点击',
      description: 'disabledInteraction 默认为 false，所以聚焦区域内的按钮还能继续触发业务动作。',
    },
  ]

  return (
    <div className="rounded-[2rem] border border-base-300/70 bg-gradient-to-br from-base-100 via-base-100 to-base-200/45 p-5 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.55)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Placement 与高亮区实验</div>
          <div className="mt-1 text-sm text-base-content/60">
            切换浮层方向时，目标按钮仍然可以在洞口区域被点击。
          </div>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm rounded-full"
          onClick={() => {
            tourSession.value += 1
            current.value = 0
            open.value = true
          }}
        >
          打开定位实验
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {placementOptions.map(item => (
          <button
            key={item}
            type="button"
            className={`btn btn-sm rounded-full ${activePlacement.value === item ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => {
              activePlacement.value = item
              tourSession.value += 1
              current.value = 0
              open.value = true
            }}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="grid min-h-[18rem] place-items-center rounded-[1.7rem] border border-dashed border-base-300/80 bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.12),transparent_50%)] p-6">
        <button
          ref={(element: HTMLButtonElement | null) => {
            anchorRef.current = element ?? undefined
          }}
          type="button"
          className="btn btn-primary rounded-full px-6"
          onClick={() => {
            tapCount.value += 1
          }}
        >
          已点击 {tapCount.value} 次
        </button>
      </div>

      {open.value ? (
        <Tour
          key={`placement-tour-${tourSession.value}-${activePlacement.value}-${current.value}`}
          open={open.value}
          current={current.value}
          placement={activePlacement.value}
          gap={{ offset: [12, 16], radius: 22 }}
          mask={{ color: 'rgba(15, 23, 42, 0.38)' }}
          steps={steps}
          onOpenChange={nextOpen => {
            open.value = nextOpen
            if (!nextOpen) {
              current.value = 0
            }
          }}
          onChange={nextCurrent => {
            current.value = nextCurrent
          }}
        />
      ) : null}
    </div>
  )
}

const CustomActionsPreview: FC = () => {
  const open = ref(false)
  const current = ref(0)
  const tourSession = ref(0)
  const summaryRef = useRef<HTMLDivElement>()
  const timelineRef = useRef<HTMLDivElement>()
  const approvalRef = useRef<HTMLButtonElement>()

  const steps = [
    {
      target: () => summaryRef.current,
      title: '把封面和主题一起做强',
      description:
        '默认样式使用 Rue 的轻卡片语言，但你也可以切到 primary，让产品引导更像一个任务流。',
      placement: 'bottomLeft' as const,
      cover: (
        <div className="h-20 rounded-[1.25rem] bg-gradient-to-br from-cyan-300 via-sky-500 to-indigo-700" />
      ),
      nextButtonProps: { children: '继续' },
    },
    {
      target: () => timelineRef.current,
      title: '中间步骤适合解释过程',
      description: '当你要穿过多个版块时，指示器和 actionsRender 可以直接融入业务语境。',
      placement: 'topLeft' as const,
      prevButtonProps: { children: '返回' },
      nextButtonProps: { children: '看审批' },
    },
    {
      target: () => approvalRef.current,
      title: '最后把业务动作接住',
      description: '把完成按钮改成提交、发布、同步都可以，不需要额外封装。',
      placement: 'left' as const,
      nextButtonProps: { children: '提交并结束' },
    },
  ]

  return (
    <div className="rounded-[2rem] border border-base-300/70 bg-base-100 p-5 shadow-[0_24px_80px_-50px_rgba(15,23,42,0.55)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">自定义 indicator 与 actions</div>
          <div className="mt-1 text-sm text-base-content/60">
            这套写法更接近常见分步引导的心智，但视觉和布局还是 Rue 自己的。
          </div>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm rounded-full"
          onClick={() => {
            tourSession.value += 1
            current.value = 0
            open.value = true
          }}
        >
          启动主视觉引导
        </button>
      </div>

      <div
        ref={(element: HTMLDivElement | null) => {
          summaryRef.current = element ?? undefined
        }}
        className="rounded-[1.6rem] border border-base-300/70 bg-base-100/80 p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="badge badge-outline badge-sm">Launch Summary</div>
            <div className="mt-3 text-xl font-semibold">
              One surface for launch, approval and playback
            </div>
            <div className="mt-2 max-w-xl text-sm text-base-content/60">
              用一个页面完成素材汇总、审批流转、上线窗口对齐和上线后的回放，不再分散在多个工具里。
            </div>
          </div>
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-primary/10 text-primary">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="size-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m12 3 2.2 5.2L20 10l-5.8 1.8L12 17l-2.2-5.2L4 10l5.8-1.8L12 3Z"
              />
            </svg>
          </div>
        </div>
      </div>

      <div
        ref={(element: HTMLDivElement | null) => {
          timelineRef.current = element ?? undefined
        }}
        className="mt-4 rounded-[1.6rem] border border-base-300/70 bg-base-100/80 p-5"
      >
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ['Brief', '完成背景与目标归纳'],
            ['Review', '跨团队确认视觉与文案'],
            ['Ship', '统一 CTA 与发布时间窗'],
          ].map(([label, text]) => (
            <div key={label} className="rounded-[1.2rem] bg-base-200/65 px-4 py-4">
              <div className="text-sm font-semibold">{label}</div>
              <div className="mt-2 text-sm text-base-content/60">{text}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          ref={(element: HTMLButtonElement | null) => {
            approvalRef.current = element ?? undefined
          }}
          type="button"
          className="btn btn-primary rounded-full px-5"
        >
          提交审批
        </button>
      </div>

      {open.value ? (
        <Tour
          key={`custom-tour-${tourSession.value}-${current.value}-${open.value ? 'open' : 'closed'}`}
          open={open.value}
          current={current.value}
          type="primary"
          styles={compactPrimaryTourStyles}
          steps={steps}
          indicatorsRender={(stepIndex, total) => (
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/80">
              <span>phase</span>
              <span className="rounded-full border border-white/20 px-2 py-1 text-white">
                {stepIndex + 1}
              </span>
              <span>/</span>
              <span>{total}</span>
            </div>
          )}
          actionsRender={(originNode, info) => (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.24em] text-white/70">
                launch guide · step {info.current + 1}
              </div>
              {originNode}
            </div>
          )}
          onOpenChange={nextOpen => {
            open.value = nextOpen
            if (!nextOpen) {
              current.value = 0
            }
          }}
          onChange={nextCurrent => {
            current.value = nextCurrent
          }}
          onFinish={() => {
            current.value = 0
          }}
        />
      ) : null}
    </div>
  )
}

const TourPage: FC = () => {
  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Tour 漫游引导</h1>
        <p className="text-sm mt-3 mb-3">
          Tour 用分步浮层把用户带过关键入口、局部强调和最终动作。Rue
          的实现参考了成熟组件库的能力模型，但视觉仍然保持自己的 card、badge 和 button
          语言，不直接照搬现成面板样式。
        </p>
        <p className="text-sm mt-3 mb-3">
          Tour 覆盖的不只是静态外观，也包含完整执行逻辑：围绕真实 DOM target
          做高亮、自动定位、切步滚动、非模态展示，以及自定义 indicator 和底部 actions。
        </p>

        <h2>何时使用</h2>
        <ul>
          <li>需要把新用户逐步带过核心入口、关键按钮或首次配置流程。</li>
          <li>需要在复杂页面里突出某个局部区域，并配合文案解释当前操作目的。</li>
          <li>需要把产品说明、轻 onboarding 和最终业务动作串成一条连续体验。</li>
        </ul>
      </div>

      <PreviewBlock
        title="基础引导"
        summary="点击 Basic 后，从 Upload、Save 到更多操作依次弹出讲解。"
        tab={basicTab}
        preview={BasicWorkspacePreview}
        code={basicCode}
      />

      <PreviewBlock
        title="欢迎页与非模态"
        summary="展示没有 target 的中心步骤，以及 mask=false 时的轻量引导方式。"
        tab={welcomeTab}
        preview={WelcomePreview}
        code={welcomeCode}
      />

      <PreviewBlock
        title="Placement 与交互洞口"
        summary="切换 top/right/bottom/left，并验证高亮区默认仍可继续触发目标元素。"
        tab={placementTab}
        preview={PlacementPreview}
        code={placementCode}
      />

      <PreviewBlock
        title="自定义指示器与动作区"
        summary="通过 primary 主题、cover、indicatorsRender 和 actionsRender 把引导做成更完整的任务流。"
        tab={customTab}
        preview={CustomActionsPreview}
        code={customCode}
      />

      <div className="component-preview not-prose text-base-content my-6 lg:my-12">
        <h2 className="component-preview-title mt-2 mb-3 text-lg font-semibold"># API</h2>
        <ApiTable rows={apiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default TourPage
