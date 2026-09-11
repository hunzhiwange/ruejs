import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import { Tabs, Timeline } from '@rue-js/design'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'

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

type DemoTone =
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'

interface ProductMoment {
  year: string
  badge: string
  title: string
  summary: string
  tone: DemoTone
}

interface ManualTimelineOptions {
  orientation?: 'horizontal' | 'vertical'
  bottomOnly?: boolean
  alternate?: boolean
  colored?: boolean
  noIcons?: boolean
  snapIcon?: boolean
  compact?: boolean
}

const joinClassName = (...values: Array<string | undefined | false>) => {
  return values.filter(Boolean).join(' ')
}

const toneDotClassMap: Record<DemoTone, string> = {
  neutral: 'border-neutral text-neutral bg-neutral/10',
  primary: 'border-primary text-primary bg-primary/10',
  secondary: 'border-secondary text-secondary bg-secondary/10',
  accent: 'border-accent text-accent bg-accent/10',
  info: 'border-info text-info bg-info/10',
  success: 'border-success text-success bg-success/10',
  warning: 'border-warning text-warning bg-warning/10',
  error: 'border-error text-error bg-error/10',
}

const toneBadgeClassMap: Record<DemoTone, string> = {
  neutral: 'badge-neutral badge-soft',
  primary: 'badge-primary badge-soft',
  secondary: 'badge-secondary badge-soft',
  accent: 'badge-accent badge-soft',
  info: 'badge-info badge-soft',
  success: 'badge-success badge-soft',
  warning: 'badge-warning badge-soft',
  error: 'badge-error badge-soft',
}

const toneLineClassMap: Record<DemoTone, string> = {
  neutral: 'bg-neutral border-neutral',
  primary: 'bg-primary border-primary',
  secondary: 'bg-secondary border-secondary',
  accent: 'bg-accent border-accent',
  info: 'bg-info border-info',
  success: 'bg-success border-success',
  warning: 'bg-warning border-warning',
  error: 'bg-error border-error',
}

const labelClassName = 'text-xs font-semibold uppercase tracking-[0.26em] opacity-60'

const ExampleBlock: FC<ExampleBlockProps> = ({ title, summary, tab, preview, code }) => {
  return (
    <div className="component-preview not-prose text-base-content my-6 lg:my-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># {title}</h2>
          {summary ? <p className="m-0 text-sm opacity-70 max-w-3xl leading-6">{summary}</p> : null}
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

const MiniDot: FC<{ tone?: DemoTone; label?: string }> = ({ tone = 'primary', label = '•' }) => {
  return (
    <span
      className={joinClassName(
        'inline-flex size-5 items-center justify-center rounded-full border text-[11px] font-semibold',
        toneDotClassMap[tone],
      )}
    >
      {label}
    </span>
  )
}

const MilestoneCard: FC<{ title: string; summary: string; badge: string; tone?: DemoTone }> = ({
  title,
  summary,
  badge,
  tone = 'primary',
}) => {
  return (
    <div className="space-y-2 text-left">
      <div className={joinClassName('badge badge-sm', toneBadgeClassMap[tone])}>{badge}</div>
      <div className="font-medium leading-5">{title}</div>
      <div className="text-xs leading-5 opacity-70">{summary}</div>
    </div>
  )
}

const productMoments: ProductMoment[] = [
  {
    year: '1984',
    badge: 'Launch',
    title: 'Macintosh 发布',
    summary: '用图形界面和桌面工作流把个人计算体验拉到一个新门槛。',
    tone: 'primary',
  },
  {
    year: '1998',
    badge: 'Reboot',
    title: 'iMac 回归',
    summary: '让产品语言、品牌和硬件方向重新对齐，快速恢复增长。',
    tone: 'secondary',
  },
  {
    year: '2001',
    badge: 'Pocket',
    title: 'iPod 上线',
    summary: '把设备、内容和同步体验打通，首次形成轻量生态闭环。',
    tone: 'accent',
  },
  {
    year: '2007',
    badge: 'Touch',
    title: 'iPhone 亮相',
    summary: '用多点触控把移动设备从输入工具转成完整的交互平台。',
    tone: 'info',
  },
  {
    year: '2015',
    badge: 'Wear',
    title: 'Apple Watch 成型',
    summary: '把通知、健康和轻交互收束到一条更贴身的设备线。',
    tone: 'success',
  },
]

const externalTimelineData = productMoments.map((moment, index, all) => ({
  key: moment.year,
  beforeLine: index > 0,
  afterLine: index < all.length - 1,
  year: moment.year,
  tone: moment.tone,
  badge: moment.badge,
  title: moment.title,
  summary: moment.summary,
}))

const legacyTimelineItems = productMoments.slice(0, 4).map((moment, index, all) => ({
  key: moment.year,
  beforeLine: index > 0,
  afterLine: index < all.length - 1,
  start: {
    className: labelClassName,
    content: moment.year,
  },
  middle: {
    content: <MiniDot tone={moment.tone} label={String(index + 1)} />,
  },
  end: {
    box: true,
    content: (
      <MilestoneCard
        title={moment.title}
        summary={moment.summary}
        badge={moment.badge}
        tone={moment.tone}
      />
    ),
  },
}))

const createEnhancedTimelineItems = () => [
  {
    key: 'discover',
    title: <span className="badge badge-outline badge-sm">Discovery</span>,
    content: (
      <MilestoneCard
        title="梳理场景"
        summary="把用户角色、目标和约束收敛成可以执行的启动清单。"
        badge="Week 1"
        tone="info"
      />
    ),
    contentBox: true,
    color: 'info',
  },
  {
    key: 'design',
    title: <span className="badge badge-outline badge-sm">Design</span>,
    content: (
      <MilestoneCard
        title="交互定稿"
        summary="把关键流转拆到组件、状态和异常提示三个层次。"
        badge="Week 2"
        tone="secondary"
      />
    ),
    contentBox: true,
    color: 'secondary',
  },
  {
    key: 'ship',
    title: <span className="badge badge-outline badge-sm">Ship</span>,
    content: (
      <MilestoneCard
        title="上线校验"
        summary="在真实流量前补充埋点、回滚预案和发布检查单。"
        badge="Week 3"
        tone="success"
      />
    ),
    contentBox: true,
    color: 'success',
  },
]

const createPendingTimelineItems = () => [
  {
    key: 'brief',
    title: 'Brief',
    content: (
      <MilestoneCard
        title="需求冻结"
        summary="确定业务范围和验收标准，避免后续迭代反复打断主线。"
        badge="Stage 1"
        tone="primary"
      />
    ),
    contentBox: true,
    color: 'primary',
  },
  {
    key: 'build',
    title: 'Build',
    content: (
      <MilestoneCard
        title="联调完成"
        summary="把视觉稿、交互状态和数据请求在一个里程碑上对齐。"
        badge="Stage 2"
        tone="success"
      />
    ),
    contentBox: true,
    color: 'success',
  },
]

const createColoredTimelineItems = () =>
  productMoments.slice(0, 4).map(moment => ({
    key: `${moment.year}-color`,
    title: (
      <span className={joinClassName('badge badge-sm', toneBadgeClassMap[moment.tone])}>
        {moment.badge}
      </span>
    ),
    content: (
      <MilestoneCard
        title={moment.title}
        summary={moment.summary}
        badge={moment.year}
        tone={moment.tone}
      />
    ),
    contentBox: true,
    color: moment.tone,
  }))

const snapTimelineItems = [
  {
    key: 'plan',
    title: 'Plan',
    content: (
      <MilestoneCard
        title="项目拆解"
        summary="先把节奏拆成清晰节点，再把每个节点的所有者钉下来。"
        badge="01"
        tone="primary"
      />
    ),
    contentBox: true,
    icon: <MiniDot tone="primary" label="1" />,
  },
  {
    key: 'review',
    title: 'Review',
    content: (
      <MilestoneCard
        title="体验走查"
        summary="在联调前做一次完整路径走查，尽量把细碎问题前置。"
        badge="02"
        tone="warning"
      />
    ),
    contentBox: true,
    icon: <MiniDot tone="warning" label="2" />,
  },
  {
    key: 'ship',
    title: 'Ship',
    content: (
      <MilestoneCard
        title="灰度上线"
        summary="展示观察窗口和回滚钩子，让上线是一个可管理过程。"
        badge="03"
        tone="success"
      />
    ),
    contentBox: true,
    icon: <MiniDot tone="success" label="3" />,
  },
]

const renderManualTimeline = ({
  orientation = 'horizontal',
  bottomOnly,
  alternate,
  colored,
  noIcons,
  snapIcon,
  compact,
}: ManualTimelineOptions) => {
  const isVertical = orientation === 'vertical'

  return (
    <div className={isVertical ? '' : 'overflow-x-auto pb-2'}>
      <Timeline
        orientation={isVertical ? 'vertical' : undefined}
        snapIcon={snapIcon}
        compact={compact}
        className={isVertical ? 'max-w-3xl' : 'min-w-[860px]'}
      >
        {productMoments.map((moment, index) => {
          const beforeLine = index > 0
          const afterLine = index < productMoments.length - 1
          const lineClassName = colored ? toneLineClassMap[moment.tone] : undefined
          const contentFirst = !!alternate && index % 2 === 0

          return (
            <li key={`${orientation}-${moment.year}-${bottomOnly ? 'end' : 'full'}`}>
              {beforeLine ? <hr className={lineClassName} /> : null}
              {bottomOnly ? null : contentFirst ? (
                <Timeline.Start box>
                  <MilestoneCard
                    title={moment.title}
                    summary={moment.summary}
                    badge={moment.badge}
                    tone={moment.tone}
                  />
                </Timeline.Start>
              ) : (
                <Timeline.Start className={labelClassName}>{moment.year}</Timeline.Start>
              )}
              {noIcons ? null : (
                <Timeline.Middle>
                  <MiniDot tone={moment.tone} label={String(index + 1)} />
                </Timeline.Middle>
              )}
              {bottomOnly ? (
                <Timeline.End box>
                  <MilestoneCard
                    title={moment.title}
                    summary={moment.summary}
                    badge={moment.badge}
                    tone={moment.tone}
                  />
                </Timeline.End>
              ) : contentFirst ? (
                <Timeline.End className={labelClassName}>{moment.year}</Timeline.End>
              ) : (
                <Timeline.End box>
                  <MilestoneCard
                    title={moment.title}
                    summary={moment.summary}
                    badge={moment.badge}
                    tone={moment.tone}
                  />
                </Timeline.End>
              )}
              {afterLine ? <hr className={lineClassName} /> : null}
            </li>
          )
        })}
      </Timeline>
    </div>
  )
}

const timelineApiRows: ApiRow[] = [
  {
    prop: 'children',
    description: '展示基础手写布局能力，适合完全自定义每个 li 的内容结构',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'className',
    description: '附加到根节点 ul.timeline 的类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'compact',
    description: '启用 daisyUI 的 timeline-compact，让节点更集中地落在单侧',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'direction',
    description: '时间线方向，使用 Rue 当前命名',
    type: 'horizontal | vertical',
    defaultValue: 'horizontal',
  },
  {
    prop: 'items',
    description: '数据驱动节点列表，支持 title、content、color、icon、loading 等增强能力',
    type: 'TimelineItemProps[]',
    defaultValue: '-',
  },
  {
    prop: 'mode',
    description: '自动决定主内容所在侧，alternate 会按索引在两侧交替',
    type: 'start | end | alternate',
    defaultValue: 'end',
  },
  {
    prop: 'orientation',
    description: 'direction 的别名，方便按常见业务组件的接入写法',
    type: 'horizontal | vertical',
    defaultValue: '-',
  },
  {
    prop: 'pending',
    description: '在尾部追加等待中的节点，可传 true、文本或 JSX',
    type: 'boolean | any',
    defaultValue: 'false',
  },
  {
    prop: 'pendingDot',
    description: '自定义 pending 节点的图标或圆点',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'reverse',
    description: '反转 items 顺序，适合从最近事件向过去回溯',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'snapIcon',
    description: '启用 timeline-snap-icon，让中间图标更贴近起始侧',
    type: 'boolean',
    defaultValue: 'false',
  },
]

const timelineItemApiRows: ApiRow[] = [
  {
    prop: 'afterLine',
    description: '显式控制当前项后方是否渲染连接线；未传时自动推断',
    type: 'boolean',
    defaultValue: 'auto',
  },
  {
    prop: 'beforeLine',
    description: '显式控制当前项前方是否渲染连接线；未传时自动推断',
    type: 'boolean',
    defaultValue: 'auto',
  },
  {
    prop: 'box',
    description: '自动布局下让主内容一侧带上 timeline-box',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'color',
    description: '为默认圆点和连接线设置语义色，支持 primary、success 或自定义颜色值',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'content',
    description: '自动布局时的主内容，通常映射到时间线的主侧',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'contentBox',
    description: '自动布局时仅让 content 一侧启用 timeline-box',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'end',
    description: '直接传入 end 段结构，适合使用 Rue 基础的精细布局模式',
    type: 'TimelineItemPart',
    defaultValue: '-',
  },
  {
    prop: 'icon',
    description: '替换默认圆点的图标节点',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'iconClassName',
    description: '附加到自动生成 middle 节点上的类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'label',
    description: 'title 的别名，可用于衔接基础心智',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'lineClassName',
    description: '附加到前后 hr 连接线的类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'loading',
    description: '用 loading 圆点渲染当前节点，适合 pending 之前的进行中状态',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'middle',
    description: '直接覆盖中间图标区，优先级高于 icon、dot 和 loading',
    type: 'TimelineMiddlePart',
    defaultValue: '-',
  },
  {
    prop: 'placement',
    description: '指定主内容落在 start 还是 end 一侧',
    type: 'start | end',
    defaultValue: '-',
  },
  {
    prop: 'position',
    description: 'placement 的别名，支持 left、right、start、end',
    type: 'left | right | start | end',
    defaultValue: '-',
  },
  {
    prop: 'start',
    description: '直接传入 start 段结构，适合整合基础示例 的写法',
    type: 'TimelineItemPart',
    defaultValue: '-',
  },
  {
    prop: 'title',
    description: '自动布局时的辅助信息，通常映射到主内容的对侧',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'titleBox',
    description: '自动布局时仅让 title 一侧启用 timeline-box',
    type: 'boolean',
    defaultValue: 'false',
  },
]

const externalArrayCode = `import { Timeline } from '@rue-js/design'
const phases = [
  { year: '1984', title: 'Macintosh 发布' },
  { year: '1998', title: 'iMac 回归' },
  { year: '2001', title: 'iPod 上线' },
]

<Timeline>
  {phases.map((phase, index) => (
    <li key={phase.year}>
      {index > 0 ? <hr /> : null}
      <Timeline.Start className="text-xs font-semibold uppercase tracking-[0.26em] opacity-60">
        {phase.year}
      </Timeline.Start>
      <Timeline.Middle>
        <span className="inline-flex size-5 items-center justify-center rounded-full border border-primary text-primary bg-primary/10">
          ✓
        </span>
      </Timeline.Middle>
      <Timeline.End box>{phase.title}</Timeline.End>
      {index < phases.length - 1 ? <hr /> : null}
    </li>
  ))}
</Timeline>`

const internalArrayCode = `import { Timeline } from '@rue-js/design'
const items = [
  {
    start: { className: 'text-xs font-semibold uppercase tracking-[0.26em] opacity-60', content: '1984' },
    middle: {
      content: <span className="inline-flex size-5 items-center justify-center rounded-full border border-primary text-primary bg-primary/10">1</span>,
    },
    end: { box: true, content: 'Macintosh 发布' },
    afterLine: true,
  },
  {
    beforeLine: true,
    middle: {
      content: <span className="inline-flex size-5 items-center justify-center rounded-full border border-secondary text-secondary bg-secondary/10">2</span>,
    },
    end: { box: true, content: 'iMac 回归' },
  },
]

<div className="overflow-x-auto pb-2">
  <Timeline items={items} className="min-w-[860px]" />
</div>`

const dataApiCode = `import { Timeline } from '@rue-js/design'
const items = [
  {
    title: 'Brief',
    content: '需求冻结',
    contentBox: true,
    color: 'primary',
  },
  {
    title: 'Build',
    content: '联调完成',
    contentBox: true,
    color: 'success',
  },
]

<Timeline mode="alternate" reverse pending="质量复核中" items={items} />`

const bothSidesCode = `import { Timeline } from '@rue-js/design'<Timeline>
  <li>
    <Timeline.Start className="text-xs font-semibold uppercase tracking-[0.26em] opacity-60">
      1984
    </Timeline.Start>
    <Timeline.Middle>
      <span className="inline-flex size-5 items-center justify-center rounded-full border border-primary text-primary bg-primary/10">1</span>
    </Timeline.Middle>
    <Timeline.End box>Macintosh 发布</Timeline.End>
    <hr />
  </li>
</Timeline>`

const bottomOnlyCode = `import { Timeline } from '@rue-js/design'<Timeline>
  <li>
    <Timeline.Middle>
      <span className="inline-flex size-5 items-center justify-center rounded-full border border-secondary text-secondary bg-secondary/10">2</span>
    </Timeline.Middle>
    <Timeline.End box>iMac 回归</Timeline.End>
    <hr />
  </li>
</Timeline>`

const alternateCode = `import { Timeline } from '@rue-js/design'
const items = [
  { title: 'Discovery', content: '梳理场景', contentBox: true },
  { title: 'Design', content: '交互定稿', contentBox: true },
  { title: 'Ship', content: '上线校验', contentBox: true },
]

<Timeline mode="alternate" items={items} />`

const colorfulCode = `import { Timeline } from '@rue-js/design'
const items = [
  { title: 'Launch', content: 'Macintosh 发布', color: 'primary', contentBox: true },
  { title: 'Touch', content: 'iPhone 亮相', color: 'info', contentBox: true },
  { title: 'Wear', content: 'Apple Watch 成型', color: 'success', contentBox: true },
]

<div className="overflow-x-auto pb-2">
  <Timeline items={items} className="min-w-[860px]" />
</div>`

const noIconsCode = `import { Timeline } from '@rue-js/design'<Timeline>
  <li>
    <Timeline.Start className="text-xs font-semibold uppercase tracking-[0.26em] opacity-60">
      1984
    </Timeline.Start>
    <Timeline.End box>Macintosh 发布</Timeline.End>
    <hr />
  </li>
</Timeline>`

const verticalBothSidesCode = `import { Timeline } from '@rue-js/design'<Timeline orientation="vertical">
  <li>
    <Timeline.Start className="text-xs font-semibold uppercase tracking-[0.26em] opacity-60">
      1984
    </Timeline.Start>
    <Timeline.Middle>
      <span className="inline-flex size-5 items-center justify-center rounded-full border border-primary text-primary bg-primary/10">1</span>
    </Timeline.Middle>
    <Timeline.End box>Macintosh 发布</Timeline.End>
    <hr />
  </li>
</Timeline>`

const verticalRightOnlyCode = `import { Timeline } from '@rue-js/design'<Timeline orientation="vertical">
  <li>
    <Timeline.Middle>
      <span className="inline-flex size-5 items-center justify-center rounded-full border border-secondary text-secondary bg-secondary/10">2</span>
    </Timeline.Middle>
    <Timeline.End box>iMac 回归</Timeline.End>
    <hr />
  </li>
</Timeline>`

const verticalAlternateCode = `import { Timeline } from '@rue-js/design'
const items = [
  { title: 'Discovery', content: '梳理场景', contentBox: true },
  { title: 'Design', content: '交互定稿', contentBox: true },
  { title: 'Ship', content: '上线校验', contentBox: true },
]

<Timeline orientation="vertical" mode="alternate" items={items} />`

const verticalColorfulCode = `import { Timeline } from '@rue-js/design'
const items = [
  { title: 'Launch', content: 'Macintosh 发布', color: 'primary', contentBox: true },
  { title: 'Touch', content: 'iPhone 亮相', color: 'info', contentBox: true },
  { title: 'Wear', content: 'Apple Watch 成型', color: 'success', contentBox: true },
]

<Timeline orientation="vertical" items={items} />`

const snapStartCode = `import { Timeline } from '@rue-js/design'
const items = [
  {
    title: 'Plan',
    content: (
      <div className="space-y-2 text-left">
        <div className="badge badge-primary badge-soft badge-sm">01</div>
        <div className="font-medium leading-5">项目拆解</div>
        <div className="text-xs leading-5 opacity-70">
          先把节奏拆成清晰节点，再把每个节点的所有者钉下来。
        </div>
      </div>
    ),
    contentBox: true,
    icon: (
      <span className="inline-flex size-5 items-center justify-center rounded-full border border-primary text-primary bg-primary/10">
        1
      </span>
    ),
  },
  {
    title: 'Review',
    content: (
      <div className="space-y-2 text-left">
        <div className="badge badge-warning badge-soft badge-sm">02</div>
        <div className="font-medium leading-5">体验走查</div>
        <div className="text-xs leading-5 opacity-70">
          在联调前做一次完整路径走查，尽量把细碎问题前置。
        </div>
      </div>
    ),
    contentBox: true,
    icon: (
      <span className="inline-flex size-5 items-center justify-center rounded-full border border-warning text-warning bg-warning/10">
        2
      </span>
    ),
  },
  {
    title: 'Ship',
    content: (
      <div className="space-y-2 text-left">
        <div className="badge badge-success badge-soft badge-sm">03</div>
        <div className="font-medium leading-5">灰度上线</div>
        <div className="text-xs leading-5 opacity-70">
          保持观察窗口和回滚钩子，让上线是一个可管理过程。
        </div>
      </div>
    ),
    contentBox: true,
    icon: (
      <span className="inline-flex size-5 items-center justify-center rounded-full border border-success text-success bg-success/10">
        3
      </span>
    ),
  },
]

<Timeline orientation="vertical" compact snapIcon items={items} />`

const TimelineDemo: FC = () => {
  const tabArray = ref<TabMode>('preview')
  const tabArrayInternal = ref<TabMode>('preview')
  const tabDataApi = ref<TabMode>('preview')
  const tabBothSides = ref<TabMode>('preview')
  const tabBottomOnly = ref<TabMode>('preview')
  const tabDifferentSides = ref<TabMode>('preview')
  const tabColorfulLines = ref<TabMode>('preview')
  const tabNoIcons = ref<TabMode>('preview')
  const tabVBothSides = ref<TabMode>('preview')
  const tabVRightOnly = ref<TabMode>('preview')
  const tabVDifferentSides = ref<TabMode>('preview')
  const tabVColorfulLines = ref<TabMode>('preview')
  const tabSnapStart = ref<TabMode>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Timeline 时间线</h1>
        <p className="text-sm mt-3 mb-3">
          Timeline 用于按时间顺序串起一组事件、阶段或发布动作。Rue 现在同时支持手写 children
          布局和更贴近业务组件心智的 items 数据 API；项目页面里的示例
          标题与排列也展示，避免增强时把基础示例吞掉。
        </p>

        <div className="not-prose grid gap-4 md:grid-cols-3 my-6 lg:my-8">
          <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="badge badge-info badge-soft badge-sm">数据驱动</div>
            <div className="mt-3 font-medium">items、mode、reverse</div>
            <p className="mt-2 mb-0 text-sm leading-6 opacity-70">
              直接传入 title、content、color、pending 等字段，不用再手写每个 li 的骨架。
            </p>
          </div>
          <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="badge badge-secondary badge-soft badge-sm">精细布局</div>
            <div className="mt-3 font-medium">Start / Middle / End</div>
            <p className="mt-2 mb-0 text-sm leading-6 opacity-70">
              适合需要把时间、图标和内容排成更强定制结构的场景。
            </p>
          </div>
          <div className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="badge badge-warning badge-soft badge-sm">视觉控制</div>
            <div className="mt-3 font-medium">color、snapIcon、compact</div>
            <p className="mt-2 mb-0 text-sm leading-6 opacity-70">
              在不改 Rue 当前视觉基调的前提下，把状态色、图标吸附和紧凑排布一起补充。
            </p>
          </div>
        </div>

        <div role="alert" className="alert alert-soft alert-info not-prose my-6">
          <span className="text-sm leading-6">
            连接线仍然由每个节点前后的 hr 负责；当你使用 items 时，组件会自动推断这些线条。手写
            children 时，仍然建议显式保持 hr 以获得最稳定的布局。
          </span>
        </div>

        <ExampleBlock
          title="Timeline 通过数据渲染（数组）"
          summary="展示基础“外部数组 map 成 li”的用法，但示例内容更完整，适合从现成业务数据直接渲染。"
          tab={tabArray}
          preview={() => (
            <div className="overflow-x-auto pb-2">
              <Timeline className="min-w-[860px]">
                {externalTimelineData.map(item => (
                  <li key={item.key}>
                    {item.beforeLine ? <hr /> : null}
                    <Timeline.Start className={labelClassName}>{item.year}</Timeline.Start>
                    <Timeline.Middle>
                      <MiniDot tone={item.tone} label="✓" />
                    </Timeline.Middle>
                    <Timeline.End box>
                      <MilestoneCard
                        title={item.title}
                        summary={item.summary}
                        badge={item.badge}
                        tone={item.tone}
                      />
                    </Timeline.End>
                    {item.afterLine ? <hr /> : null}
                  </li>
                ))}
              </Timeline>
            </div>
          )}
          code={externalArrayCode}
        />

        <ExampleBlock
          title="Timeline 通过数据渲染（数组，组件内部）"
          summary="如果你已经习惯 Rue 基础的 start / middle / end 结构，现在仍然可以通过 items 直接交给组件内部渲染。"
          tab={tabArrayInternal}
          preview={() => (
            <div className="overflow-x-auto pb-2">
              <Timeline items={legacyTimelineItems} className="min-w-[860px]" />
            </div>
          )}
          code={internalArrayCode}
        />

        <ExampleBlock
          title="reverse 与 pending"
          summary="通过数据 API 组合 mode、reverse 和 pending，控制内容侧、顺序和等待节点。"
          tab={tabDataApi}
          preview={() => (
            <Timeline
              mode="alternate"
              reverse
              pending="质量复核中"
              items={createPendingTimelineItems()}
            />
          )}
          code={dataApiCode}
        />

        <ExampleBlock
          title="两侧文字与图标"
          summary="展示基础复合组件写法，适合时间标签与主内容天然分居两侧的场景。"
          tab={tabBothSides}
          preview={() => renderManualTimeline({ orientation: 'horizontal' })}
          code={bothSidesCode}
        />

        <ExampleBlock
          title="仅底部一侧"
          summary="当上侧只需要留出轨道和节点，不需要额外元信息时，可以只渲染 end 一侧。"
          tab={tabBottomOnly}
          preview={() => renderManualTimeline({ orientation: 'horizontal', bottomOnly: true })}
          code={bottomOnlyCode}
        />

        <ExampleBlock
          title="不同侧交替"
          summary="使用 mode=alternate 后，主内容会在两侧自动切换，不再需要手写交替布局。"
          tab={tabDifferentSides}
          preview={() => <Timeline mode="alternate" items={createEnhancedTimelineItems()} />}
          code={alternateCode}
        />

        <ExampleBlock
          title="彩色线条"
          summary="color 会同步作用于默认圆点和连接线，让状态型时间线更清晰。"
          tab={tabColorfulLines}
          preview={() => (
            <div className="overflow-x-auto pb-2">
              <Timeline items={createColoredTimelineItems()} className="min-w-[860px]" />
            </div>
          )}
          code={colorfulCode}
        />

        <ExampleBlock
          title="无图标"
          summary="如果只想保持轨道和信息块，可以完全省略 middle 区域。"
          tab={tabNoIcons}
          preview={() => renderManualTimeline({ orientation: 'horizontal', noIcons: true })}
          code={noIconsCode}
        />

        <ExampleBlock
          title="纵向：两侧文字与图标"
          summary="纵向布局仍然适合记录里程碑、工单流转或调试过程。"
          tab={tabVBothSides}
          preview={() => renderManualTimeline({ orientation: 'vertical' })}
          code={verticalBothSidesCode}
        />

        <ExampleBlock
          title="纵向：仅右侧"
          summary="纵向时间线最常见的业务形态是只保持内容一侧，把主信息集中在右侧阅读。"
          tab={tabVRightOnly}
          preview={() => renderManualTimeline({ orientation: 'vertical', bottomOnly: true })}
          code={verticalRightOnlyCode}
        />

        <ExampleBlock
          title="纵向：不同侧交替"
          summary="在纵向模式下配合 mode=alternate，可以做更有节奏感的发布轨迹或品牌时间线。"
          tab={tabVDifferentSides}
          preview={() => (
            <Timeline
              orientation="vertical"
              mode="alternate"
              items={createEnhancedTimelineItems()}
            />
          )}
          code={verticalAlternateCode}
        />

        <ExampleBlock
          title="纵向：彩色线条"
          summary="color 在纵向布局下更适合表达节点状态，例如成功、风险、待处理等。"
          tab={tabVColorfulLines}
          preview={() => <Timeline orientation="vertical" items={createColoredTimelineItems()} />}
          code={verticalColorfulCode}
        />

        <ExampleBlock
          title="图标吸附到起始侧（snap to start）"
          summary="snapIcon 和 compact 组合后，更适合侧栏式或审计日志式的紧凑纵向布局。"
          tab={tabSnapStart}
          preview={() => (
            <Timeline
              orientation="vertical"
              compact
              snapIcon
              items={snapTimelineItems}
              className="max-w-2xl"
            />
          )}
          code={snapStartCode}
        />

        <h2>增强能力</h2>
        <p className="text-sm opacity-80">
          本节集中展示数据 API 的组合场景，例如 `reverse`、`pending`、`mode`
          等，更适合业务数据直接驱动。
        </p>

        <ExampleBlock
          title="reverse 与 pending"
          summary="通过数据 API 组合 mode、reverse 和 pending，控制内容侧、顺序和等待节点。"
          tab={tabDataApi}
          preview={() => (
            <Timeline
              mode="alternate"
              reverse
              pending="质量复核中"
              items={createPendingTimelineItems()}
            />
          )}
          code={dataApiCode}
        />

        <div className="my-10 lg:my-14">
          <h2>API</h2>
          <p className="text-sm leading-6 opacity-70">
            推荐优先使用 items 进行数据驱动渲染；当你需要极细粒度地控制每个节点结构时，再回到 Start
            / Middle / End 组合方式。
          </p>
          <h3 className="mt-6">Timeline</h3>
          <ApiTable rows={timelineApiRows} />
          <h3 className="mt-8">TimelineItemProps</h3>
          <ApiTable rows={timelineItemApiRows} />
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default TimelineDemo
