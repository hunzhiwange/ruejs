import type { FC } from '@rue-js/rue'
import { ref, useRef } from '@rue-js/rue'
import { Affix } from '@rue-js/design'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import PreviewBlock, { type PreviewTabMode } from './PreviewBlock'

interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
}

interface DemoSection {
  id: string
  eyebrow: string
  title: string
  summary: string
  metric: string
  points: string[]
}

interface MessageItem {
  id: string
  author: string
  role: string
  text: string
  time: string
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

const SectionCard: FC<{ section: DemoSection; compact?: boolean }> = ({ section, compact }) => {
  return (
    <section
      id={section.id}
      className={`rounded-[1.6rem] border border-base-300/70 bg-gradient-to-br from-base-100 via-base-100 to-base-200/45 shadow-[0_28px_70px_-46px_rgba(15,23,42,0.45)] ${compact ? 'p-5' : 'p-6 md:p-7'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-base-content/45">
            {section.eyebrow}
          </div>
          <h3 className="mb-2 mt-2 text-xl font-semibold text-base-content">{section.title}</h3>
          <p className="m-0 max-w-2xl text-sm leading-6 text-base-content/72">{section.summary}</p>
        </div>
        <div className="rounded-2xl border border-base-300/70 bg-base-100/80 px-3 py-2 text-right shadow-sm">
          <div className="text-[0.68rem] uppercase tracking-[0.18em] text-base-content/45">
            Metric
          </div>
          <div className="mt-1 text-lg font-semibold text-base-content">{section.metric}</div>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {section.points.map(point => (
          <div
            key={point}
            className="rounded-2xl border border-base-300/65 bg-base-100/75 px-4 py-3 text-sm leading-6 text-base-content/75"
          >
            {point}
          </div>
        ))}
      </div>
    </section>
  )
}

const ThreadMessage: FC<{ item: MessageItem }> = ({ item }) => {
  return (
    <div className="rounded-[1.4rem] border border-base-300/70 bg-base-100/88 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 text-xs text-base-content/45">
        <span className="font-semibold uppercase tracking-[0.16em]">{item.role}</span>
        <span>{item.time}</span>
      </div>
      <div className="mt-2 text-sm font-medium text-base-content">{item.author}</div>
      <p className="mb-0 mt-2 text-sm leading-6 text-base-content/72">{item.text}</p>
    </div>
  )
}

const planningSections: DemoSection[] = [
  {
    id: 'signal-map',
    eyebrow: 'Flow 01',
    title: 'Signal Map',
    summary: '把长页面拆成几段有明确职责的内容卡片，Affix 用来把关键操作或摘要固定在读者视线附近。',
    metric: 'Top 16px',
    points: [
      '适合右侧摘要、操作栏、目录卡。',
      '子内容视觉完全由你自己决定。',
      '默认不复制 child 的视觉，只负责定位。',
    ],
  },
  {
    id: 'cadence-plan',
    eyebrow: 'Flow 02',
    title: 'Cadence Plan',
    summary: '随着内容区向下滚动，右侧 rail 会在自定义面板顶部吸附，保持筛选与摘要稳定可见。',
    metric: 'Scoped',
    points: [
      'target 可以绑定任意滚动容器。',
      '定位规则符合常见吸附组件的预期。',
      '宽度和占位尺寸会自动同步。',
    ],
  },
  {
    id: 'handoff-brief',
    eyebrow: 'Flow 03',
    title: 'Handoff Brief',
    summary: 'Affix 本身是透明行为层，适合叠在卡片、工具条、输入区、审批面板等各种 Rue 风格块上。',
    metric: 'Behavior',
    points: [
      '不强塞额外装饰外观。',
      '支持 top 和 bottom 两种偏移。',
      '支持 root 与 fixed 两层样式扩展。',
    ],
  },
]

const globalSections: DemoSection[] = [
  {
    id: 'window-brief',
    eyebrow: 'Window 01',
    title: 'Viewport Brief',
    summary:
      '默认不传 target 时，Affix 会直接跟随整页 window 滚动，适合长表单页头、全局过滤条和跨 section 的操作卡。',
    metric: 'Default',
    points: [
      '不需要显式声明 target。',
      '进入吸附和回滚释放都跟着整页滚动。',
      '适合最常见的页面级工具条。',
    ],
  },
  {
    id: 'window-cadence',
    eyebrow: 'Window 02',
    title: 'Page Cadence',
    summary: '这个示例故意保持普通页面流布局，不放进内部滚动容器里，便于直接观察默认 window 吸附。',
    metric: 'Scroll Page',
    points: [
      '滚动整个文档时触发。',
      '不会混入局部 panel 的滚动语义。',
      '更接近日常后台页和内容页。',
    ],
  },
  {
    id: 'window-handoff',
    eyebrow: 'Window 03',
    title: 'Release Handoff',
    summary: '继续往下滚再回滚，可以直接看到 Affix 退出 fixed 后恢复原位，不会停留在漂移状态。',
    metric: 'Reset',
    points: [
      '回到原位后恢复普通流布局。',
      '默认语义就是 window。',
      '局部滚动容器场景再显式传 target。',
    ],
  },
]

const monitorSections: DemoSection[] = [
  {
    id: 'intake',
    eyebrow: 'Track A',
    title: 'Intake Review',
    summary:
      '先看输入质量，再决定是否进入下一阶段。这里故意把工具条放在内容中段，用于观察 onChange 的切换时机。',
    metric: 'Observe',
    points: [
      'onChange 只在 fixed 状态翻转时触发。',
      '适合驱动阴影、统计或埋点。',
      '可以配合 classNames 和 styles 做局部增强。',
    ],
  },
  {
    id: 'prototype',
    eyebrow: 'Track B',
    title: 'Prototype Review',
    summary: '工具条吸附后，仍然展示基础宽度和左侧坐标，适合栅格内部的过滤器和子导航。',
    metric: 'Stable Width',
    points: [
      '固定态自动同步 left / width / height。',
      '退出 fixed 时会主动清理基础的内联定位样式。',
      '不会把行为泄露到其他组件。',
    ],
  },
  {
    id: 'closeout',
    eyebrow: 'Track C',
    title: 'Closeout',
    summary: '这一段用于拉长容器高度，确保滚动过程中可以多次观察进入和退出固定态。',
    metric: 'Toggle',
    points: ['和普通 div 一样使用。', '没有强依赖额外运行时包装。', '保持编译器参与优化空间。'],
  },
]

const threadItems: MessageItem[] = [
  {
    id: 'msg-1',
    author: 'Lina',
    role: 'Research',
    text: '先把本轮访谈的三个核心异议归并成一个摘要卡，底部回复区保持在阅读终点附近。',
    time: '09:10',
  },
  {
    id: 'msg-2',
    author: 'Evan',
    role: 'Product',
    text: '当内容接近底部时，把回复工具条固定在容器下沿，比始终占着顶部空间更适合讨论串。',
    time: '09:22',
  },
  {
    id: 'msg-3',
    author: 'Nora',
    role: 'Design',
    text: '视觉上还是维持 Rue 自己的圆角卡片和轻阴影，不去照搬其它库的纯线框感。',
    time: '09:41',
  },
  {
    id: 'msg-4',
    author: 'Theo',
    role: 'Ops',
    text: '底部吸附最适合评论框、批量提交条或者移动端的确认操作区，直接支持。',
    time: '10:03',
  },
  {
    id: 'msg-5',
    author: 'Mika',
    role: 'QA',
    text: '我们还需要验证 fixed 释放时基础的内联 style 会不会残留，这类问题在行为组件里很常见。',
    time: '10:18',
  },
  {
    id: 'msg-6',
    author: 'Cole',
    role: 'Release',
    text: '如果 target 不传，就默认监听 window；但示例 里最好还是用局部面板，避免预览互相干扰。',
    time: '10:36',
  },
]

const topTab = ref<PreviewTabMode>('preview')
const windowTab = ref<PreviewTabMode>('preview')
const bottomTab = ref<PreviewTabMode>('preview')
const stateTab = ref<PreviewTabMode>('preview')
const affixState = ref<'Inline' | 'Affixed'>('Inline')
const affixChangeCount = ref(0)

const topCode = `import { useRef } from '@rue-js/rue'
import { Affix } from '@rue-js/design'
const panelRef = useRef<HTMLDivElement>()
const sections = [
  { id: 'signal-map', title: 'Signal Map' },
  { id: 'cadence-plan', title: 'Cadence Plan' },
  { id: 'handoff-brief', title: 'Handoff Brief' },
]

<div ref={panelRef} className="h-[30rem] overflow-auto rounded-[1.6rem] border border-base-300 bg-base-100 p-4">
  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
    <div className="space-y-4">
      {sections.map(section => (
        <section key={section.id} id={section.id} className="rounded-2xl border border-base-300 bg-base-100 p-6">
          <h3>{section.title}</h3>
        </section>
      ))}
    </div>

    <Affix target={() => panelRef.current} offsetTop={16}>
      <div className="rounded-[1.4rem] border border-base-300 bg-base-100 p-4 shadow-sm">
        <div className="text-xs uppercase tracking-[0.18em] text-base-content/45">Summary Rail</div>
        <div className="mt-3 text-lg font-semibold">Keep actions visible</div>
      </div>
    </Affix>
  </div>
</div>`

const windowCode = `import { Affix } from '@rue-js/design'
const sections = [
  { id: 'window-brief', title: 'Viewport Brief' },
  { id: 'window-cadence', title: 'Page Cadence' },
  { id: 'window-handoff', title: 'Release Handoff' },
]

<div className="space-y-4">
  <div className="rounded-[1.6rem] border border-base-300 bg-base-100 p-5 shadow-sm">
    <div className="text-sm font-semibold">Scroll the page</div>
    <p className="mb-0 mt-2 text-sm text-base-content/68">
      不传 target 时，Affix 默认直接监听 window。
    </p>
  </div>

  <Affix offsetTop={20}>
    <div className="rounded-[1.4rem] border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="text-xs uppercase tracking-[0.18em] text-base-content/45">Global Window</div>
      <div className="mt-3 text-lg font-semibold">Sticky release rail</div>
    </div>
  </Affix>

  {sections.map(section => (
    <section key={section.id} id={section.id} className="rounded-[1.6rem] border border-base-300 bg-base-100 p-6 shadow-sm">
      <h3>{section.title}</h3>
    </section>
  ))}
</div>`

const bottomCode = `import { useRef } from '@rue-js/rue'
import { Affix } from '@rue-js/design'
const threadRef = useRef<HTMLDivElement>()

<div ref={threadRef} className="h-[28rem] overflow-auto rounded-[1.6rem] border border-base-300 bg-base-100 p-4">
  <div className="space-y-3">
    {messages.map(item => (
      <article key={item.id} className="rounded-2xl border border-base-300 bg-base-100 p-4">
        <p>{item.text}</p>
      </article>
    ))}

    <Affix target={() => threadRef.current} offsetBottom={16}>
      <div className="rounded-[1.4rem] border border-base-300 bg-base-100 p-4 shadow-sm">
        <div className="font-medium">Reply composer</div>
      </div>
    </Affix>
  </div>
</div>`

const stateCode = `import { ref, useRef } from '@rue-js/rue'
import { Affix } from '@rue-js/design'
const panelRef = useRef<HTMLDivElement>()
const affixState = ref('Inline')
const changeCount = ref(0)

<Affix
  target={() => panelRef.current}
  offsetTop={14}
  rootClassName="rounded-[1.2rem]"
  classNames={{ fixed: 'transition-all duration-200' }}
  styles={{ fixed: { zIndex: 4 } }}
  onChange={next => {
    affixState.value = next ? 'Affixed' : 'Inline'
    changeCount.value += 1
  }}
>
  <div className="rounded-[1.2rem] border border-primary/20 bg-primary/5 px-4 py-3 shadow-sm">
    Review toolbar
  </div>
</Affix>`

const apiRows: ApiRow[] = [
  {
    prop: 'offsetTop',
    description: '触发顶部吸附的偏移。若 offsetTop 和 offsetBottom 都未传，则默认按 0 处理。',
    type: 'number',
    defaultValue: '0',
  },
  {
    prop: 'offsetBottom',
    description: '触发底部吸附的偏移，适合回复区、提交条和移动端底部操作。',
    type: 'number',
    defaultValue: '-',
  },
  {
    prop: 'target',
    description:
      '返回滚动监听目标；不传时默认监听 window。需要绑定局部 panel、drawer 或侧栏时再显式传入对应容器。',
    type: '() => HTMLElement | Window | null | undefined',
    defaultValue: 'window',
  },
  {
    prop: 'onChange',
    description: 'fixed 状态切换时触发，参数为当前是否处于吸附状态。',
    type: '(affixed?: boolean) => void',
    defaultValue: '-',
  },
  {
    prop: 'className / style',
    description: '作用在实际固定节点上，适合调整阴影、边框、背景和过渡。',
    type: 'string / CSSProperties',
    defaultValue: '-',
  },
  {
    prop: 'rootClassName',
    description: '作用在占位根节点上，通常用于布局或占位容器的额外类名。',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'classNames / styles',
    description: '分别定制 root 与 fixed 两层语义槽。',
    type: '{ root?: string; fixed?: string } / { root?: style; fixed?: style }',
    defaultValue: '-',
  },
  {
    prop: 'children',
    description: '任意可渲染内容。Affix 自身只负责定位，不决定视觉外观。',
    type: 'any',
    defaultValue: '-',
  },
]

const TopPreview: FC = () => {
  const panelRef = useRef<HTMLDivElement>()

  return (
    <div
      ref={panelRef}
      className="not-prose h-[30rem] overflow-auto rounded-[1.8rem] border border-base-300/75 bg-base-100/92 p-4 shadow-[0_28px_70px_-46px_rgba(15,23,42,0.45)]"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          {planningSections.map(section => (
            <SectionCard key={section.id} section={section} compact />
          ))}
        </div>

        <Affix
          target={() => panelRef.current}
          offsetTop={16}
          classNames={{ fixed: 'transition-all duration-200' }}
        >
          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-base-300/75 bg-gradient-to-b from-base-100 to-base-200/55 p-4 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.5)]">
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-base-content/45">
                Summary Rail
              </div>
              <div className="mt-3 text-lg font-semibold text-base-content">
                Keep actions nearby
              </div>
              <p className="mb-0 mt-2 text-sm leading-6 text-base-content/72">
                在长内容里把摘要、过滤器和快速动作固定到容器顶部，比始终占据正文宽度更稳妥。
              </p>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-base-300/70 bg-base-100 px-4 py-3 shadow-sm">
                <div className="text-xs text-base-content/45">Visible actions</div>
                <div className="mt-2 text-2xl font-semibold">3</div>
              </div>
              <div className="rounded-2xl border border-base-300/70 bg-base-100 px-4 py-3 shadow-sm">
                <div className="text-xs text-base-content/45">Affix mode</div>
                <div className="mt-2 text-sm font-medium">explicit target + offsetTop</div>
              </div>
            </div>
          </div>
        </Affix>
      </div>
    </div>
  )
}

const WindowPreview: FC = () => {
  return (
    <div className="not-prose space-y-4">
      <div className="rounded-[1.6rem] border border-base-300/75 bg-gradient-to-br from-base-100 to-base-200/45 p-5 shadow-sm">
        <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-base-content/45">
          Default Window Target
        </div>
        <div className="mt-3 text-lg font-semibold text-base-content">
          Scroll the page to trigger it
        </div>
        <p className="mb-0 mt-2 text-sm leading-6 text-base-content/72">
          这个示例不传 target，直接使用 Affix 的默认全局 window
          语义。继续向下滚动整页，再回滚回来，可以看到它进入吸附后也会正确恢复原位。
        </p>
      </div>

      <Affix offsetTop={20} classNames={{ fixed: 'transition-all duration-200' }}>
        <div className="rounded-[1.45rem] border border-base-300/75 bg-gradient-to-r from-base-100 via-base-100 to-base-200/55 p-4 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.5)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-base-content/45">
                Global Window
              </div>
              <div className="mt-2 text-base font-semibold text-base-content">
                Sticky release rail
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="badge badge-outline rounded-full">offsetTop 20</span>
              <span className="badge badge-ghost rounded-full">target omitted</span>
            </div>
          </div>
        </div>
      </Affix>

      <div className="space-y-4">
        {globalSections.map(section => (
          <SectionCard key={section.id} section={section} compact />
        ))}
      </div>
    </div>
  )
}

const BottomPreview: FC = () => {
  const threadRef = useRef<HTMLDivElement>()

  return (
    <div className="not-prose rounded-[1.8rem] border border-base-300/75 bg-base-100/92 p-4 shadow-[0_28px_70px_-46px_rgba(15,23,42,0.45)]">
      <div ref={threadRef} className="h-[28rem] overflow-auto pr-1">
        <div className="space-y-3">
          {threadItems.map(item => (
            <ThreadMessage key={item.id} item={item} />
          ))}

          <div className="pt-8">
            <Affix
              target={() => threadRef.current}
              offsetBottom={16}
              className="transition-all duration-200"
            >
              <div className="rounded-[1.45rem] border border-base-300/75 bg-gradient-to-r from-base-100 via-base-100 to-base-200/55 p-4 shadow-[0_22px_55px_-42px_rgba(15,23,42,0.5)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-base-content">Reply composer</div>
                    <div className="mt-1 text-xs text-base-content/55">
                      offsetBottom 让操作条贴住容器下沿，而不是始终抢占顶部。
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn btn-ghost btn-sm rounded-full">
                      Save draft
                    </button>
                    <button type="button" className="btn btn-primary btn-sm rounded-full">
                      Send note
                    </button>
                  </div>
                </div>
              </div>
            </Affix>
          </div>
        </div>
      </div>
    </div>
  )
}

const StatePreview: FC = () => {
  const panelRef = useRef<HTMLDivElement>()

  return (
    <div className="not-prose grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div
        ref={panelRef}
        className="h-[29rem] overflow-auto rounded-[1.8rem] border border-base-300/75 bg-base-100/92 p-4 shadow-[0_28px_70px_-46px_rgba(15,23,42,0.45)]"
      >
        <div className="space-y-4">
          <SectionCard
            compact
            section={{
              id: 'warmup',
              eyebrow: 'Warmup',
              title: 'Scroll a bit first',
              summary: '先让工具条处于正常流中，滚动到它越过容器顶部之后再观察状态面板的切换。',
              metric: 'Prep',
              points: [
                '避免一进入预览就直接 fixed。',
                '更容易看清触发边界。',
                '适合验证 onChange 行为。',
              ],
            }}
          />

          <Affix
            target={() => panelRef.current}
            offsetTop={14}
            rootClassName="rounded-[1.2rem]"
            classNames={{ fixed: 'transition-all duration-200' }}
            styles={{ fixed: { zIndex: 4 } }}
            onChange={next => {
              affixState.value = next ? 'Affixed' : 'Inline'
              affixChangeCount.value += 1
            }}
          >
            <div className="rounded-[1.3rem] border border-primary/20 bg-primary/6 px-4 py-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-base-content">Review toolbar</div>
                  <div className="mt-1 text-xs text-base-content/55">
                    rootClassName 负责占位层，className 与 styles.fixed 则直接作用在固定节点上。
                  </div>
                </div>
                <div className="badge badge-primary badge-outline rounded-full">
                  onChange attached
                </div>
              </div>
            </div>
          </Affix>

          {monitorSections.map(section => (
            <SectionCard key={section.id} section={section} compact />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-[1.45rem] border border-base-300/75 bg-base-100 p-4 shadow-sm">
          <div className="text-xs uppercase tracking-[0.18em] text-base-content/45">
            Current state
          </div>
          <div className="mt-2 text-2xl font-semibold text-base-content">{affixState.value}</div>
        </div>
        <div className="rounded-[1.45rem] border border-base-300/75 bg-base-100 p-4 shadow-sm">
          <div className="text-xs uppercase tracking-[0.18em] text-base-content/45">
            Change count
          </div>
          <div className="mt-2 text-2xl font-semibold text-base-content">
            {affixChangeCount.value}
          </div>
        </div>
        <div className="rounded-[1.45rem] border border-base-300/75 bg-gradient-to-br from-base-100 to-base-200/45 p-4 shadow-sm">
          <div className="text-xs uppercase tracking-[0.18em] text-base-content/45">
            Styling slots
          </div>
          <p className="mb-0 mt-2 text-sm leading-6 text-base-content/72">
            对透明行为组件来说，root 和 fixed
            两层语义槽足够覆盖大部分定制，不需要额外再分拆更多结构。
          </p>
        </div>
      </div>
    </div>
  )
}

const AffixPage: FC = () => {
  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Affix 固钉</h1>
        <p>
          Rue 的 Affix 是一个纯行为组件：它不替 child
          决定外观，只负责在合适的滚动边界上把节点吸附到顶部或底部。 支持 top / bottom 偏移、自定义
          target、状态回调，以及 root 与 fixed 两层样式钩子，API 尽量保持直观，视觉仍然交给 Rue
          自己的内容块来完成。
        </p>

        <div className="not-prose mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/40 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">
              Transparent
            </div>
            <div className="mt-2 text-base font-semibold">只管定位，不接管视觉</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              适合卡片、输入条、操作栏、摘要 rail 等任意自定义内容。
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/40 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">
              Top & Bottom
            </div>
            <div className="mt-2 text-base font-semibold">顶部与底部两套偏移</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              既能做右侧工具条，也能做评论回复区或提交操作条。
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/40 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">
              Target Aware
            </div>
            <div className="mt-2 text-base font-semibold">window 或局部滚动容器</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              默认跟随整页 window 滚动；需要局部容器吸附时，再显式传 target。
            </p>
          </div>
        </div>

        <div role="alert" className="alert alert-soft alert-info not-prose my-6">
          <span>
            当前默认行为是整页 window 吸附。像本页这种带内部滚动面板的示例，需要显式传入 target
            函数或对应容器，避免把默认语义和局部面板语义混在一起。
          </span>
        </div>

        <PreviewBlock
          title="默认全局 window 吸附"
          summary="不传 target 时直接跟随整页滚动，适合页面级工具条、长表单页头和跨 section 操作条。"
          tab={windowTab}
          preview={WindowPreview}
          code={windowCode}
        />

        <PreviewBlock
          title="顶部吸附 rail"
          summary="在自定义面板里固定右侧摘要或快捷操作，是 Affix 最常见的用法。"
          tab={topTab}
          preview={TopPreview}
          code={topCode}
        />

        <PreviewBlock
          title="底部吸附操作条"
          summary="适合讨论串、工单详情或移动端表单，把回复和提交动作留在视线底部。"
          tab={bottomTab}
          preview={BottomPreview}
          code={bottomCode}
        />

        <PreviewBlock
          title="状态回调与样式槽"
          summary="用 onChange 感知 fixed 状态翻转，并通过 root / fixed 两层样式槽继续定制。"
          tab={stateTab}
          preview={StatePreview}
          code={stateCode}
        />

        <h2>API</h2>
        <ApiTable rows={apiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default AffixPage
