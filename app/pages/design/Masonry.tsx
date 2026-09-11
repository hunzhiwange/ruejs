import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import PreviewBlock, { type PreviewTabMode } from './PreviewBlock'
import Masonry from '../../../packages/rue-design/src/components/masonry/index'

interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
}

interface ShowcaseCard {
  id: string
  section: string
  title: string
  summary: string
  stat: string
  coverHeight: string
  tags: string[]
  bullets: string[]
}

interface ReleaseCard {
  id: string
  track: string
  owner: string
  title: string
  summary: string
  featured?: boolean
  checkpoints: string[]
}

interface ShelfCard {
  id: string
  collection: string
  title: string
  summary: string
  labels: string[]
  pinned?: boolean
}

const gradients = [
  'from-primary/18 via-primary/8 to-base-200',
  'from-secondary/20 via-secondary/8 to-base-200',
  'from-accent/18 via-accent/8 to-base-200',
  'from-info/18 via-info/6 to-base-200',
  'from-success/18 via-success/6 to-base-200',
  'from-warning/20 via-warning/8 to-base-200',
]

const showcaseCards: ShowcaseCard[] = [
  {
    id: 'signal-board',
    section: 'signal board',
    title: 'Signal Board',
    summary:
      '把埋点回放、增长假设和异常备注放进同一列，标题与摘要长度刻意不一致，用来观察瀑布流的自然落差。',
    stat: '12 live notes',
    coverHeight: '7.5rem',
    tags: ['growth', 'ops'],
    bullets: ['异常阈值回落 17%', '新批次实验明天发布'],
  },
  {
    id: 'runtime-pulse',
    section: 'runtime',
    title: 'Runtime Pulse',
    summary: '一张偏技术的摘要卡，正文略长，底部再追加多条 bullet，让卡片高度明显拉开。',
    stat: '5 blockers',
    coverHeight: '10rem',
    tags: ['vapor', 'build'],
    bullets: ['Wasm 产物已切到新入口', '渲染范围清理已进回归', '本周准备补浏览器探针'],
  },
  {
    id: 'studio-drop',
    section: 'studio',
    title: 'Studio Drop',
    summary: '适合短摘要和强视觉占位混排，卡片头部只放一个色块也能形成节奏。',
    stat: '24 assets',
    coverHeight: '5.5rem',
    tags: ['visual', 'motion'],
    bullets: ['封面动画已切入预览站'],
  },
  {
    id: 'incident-brief',
    section: 'incident',
    title: 'Incident Brief',
    summary:
      '瀑布流常见场景不是图库，而是高度不一的告警、复盘和工作说明。Rue 的 Masonry 更偏这种信息块容器。',
    stat: 'P2 recovered',
    coverHeight: '8.75rem',
    tags: ['recover', 'timeline'],
    bullets: ['根因已定位到当前路径清理时机', 'e2e 回归已补', '等待发布窗口'],
  },
  {
    id: 'release-wall',
    section: 'release wall',
    title: 'Release Wall',
    summary: '内容块越不整齐，越能看出 Masonry 比 Grid 更适合摘要墙和编辑墙。',
    stat: '3 trains',
    coverHeight: '6.5rem',
    tags: ['release', 'train'],
    bullets: ['design 包体积回落 4.1 KB', 'sidebar 接线待合并'],
  },
  {
    id: 'watch-list',
    section: 'watch list',
    title: 'Watch List',
    summary: '再放一张偏短的卡，强调不同高度内容的落位差。',
    stat: '9 probes',
    coverHeight: '4.75rem',
    tags: ['probe', 'browser'],
    bullets: ['hash router 卸载路径稳定'],
  },
  {
    id: 'field-notes',
    section: 'field notes',
    title: 'Field Notes',
    summary: '当卡片里基础长文本，也有标签和列表时，瀑布流比等高行列更省空间。',
    stat: '14 snippets',
    coverHeight: '9.25rem',
    tags: ['notes', 'docs', 'handoff'],
    bullets: ['记录 swc import 边界', '补仓库记忆说明', '统一示例 代码片段'],
  },
  {
    id: 'launch-kit',
    section: 'launch kit',
    title: 'Launch Kit',
    summary: '最后一张带按钮的卡片，用来确认操作区和内容区混排时不会把列宽撑坏。',
    stat: 'Ready to ship',
    coverHeight: '7rem',
    tags: ['go-live', 'cta'],
    bullets: ['设计页已补充', '包导出待发布'],
  },
]

const releaseCards: ReleaseCard[] = [
  {
    id: 'render-anchor-cleanup',
    track: 'runtime',
    owner: 'Lin',
    title: 'Render Anchor Cleanup',
    summary: '替换空 renderable 时先走 clear 路径，避免 beforeUnmount / cleanup 漏掉。',
    featured: true,
    checkpoints: ['compiled range', 'anchor cleanup', 'Component scope'],
  },
  {
    id: 'sidebar-nav-pass',
    track: 'app',
    owner: 'Qiao',
    title: 'Sidebar Navigation Pass',
    summary: '把设计站条目补充到 layout 分组，减少新组件只能靠手敲 hash 路径访问的问题。',
    checkpoints: ['route', 'sidebar'],
  },
  {
    id: 'vapor-size-window',
    track: 'perf',
    owner: 'Wei',
    title: 'Vapor Size Window',
    summary: '记录体积快照和降幅来源，方便 release note 直接复用。',
    checkpoints: ['snapshot', 'changelog', 'release note'],
  },
  {
    id: 'docs-alignment',
    track: 'docs',
    owner: 'Mo',
    title: 'Docs Alignment',
    summary: '统一设计页 API 表述，避免同一能力在不同组件里叫法漂移。',
    checkpoints: ['api rows', 'preview copy'],
  },
  {
    id: 'compat-probe',
    track: 'compat',
    owner: 'Yu',
    title: 'Compat Probe',
    summary: '把浏览器态探针补到最小样例，降低只靠 jsdom 误判的概率。',
    checkpoints: ['manual probe', 'page fixture'],
  },
]

const shelfCards: ShelfCard[] = [
  {
    id: 'ops-playbook',
    collection: 'playbook',
    title: 'Ops Handoff',
    summary: '值班手册、升级路径和短周期回归清单适合做成语义化 article 项。',
    labels: ['handoff', 'ops', 'checklist'],
    pinned: true,
  },
  {
    id: 'design-brief',
    collection: 'brief',
    title: 'Design Crit Pack',
    summary: '设计评审素材通常有不同长度的注解，放在 Masonry 里比等高卡片更省空间。',
    labels: ['crit', 'copy'],
  },
  {
    id: 'release-template',
    collection: 'template',
    title: 'Release Template',
    summary: '把 changelog、tweet 和站内更新一次打包，常常是一张中等高度的流程卡。',
    labels: ['release', 'social'],
  },
  {
    id: 'migration-note',
    collection: 'migration',
    title: 'Migration Note',
    summary: '说明文档往往正文偏长，很适合放在 pinned 卡旁边形成高低错落。',
    labels: ['upgrade', 'runtime', 'guide'],
    pinned: true,
  },
]

const masonryApiRows: ApiRow[] = [
  {
    prop: 'as',
    description: '指定根节点标签或组件，适合 section、main、aside 等语义容器。',
    type: 'any',
    defaultValue: '`div`',
  },
  {
    prop: 'columns',
    description: '显式指定列数，支持响应式断点对象。',
    type: 'number | Partial<Record<Breakpoint, number>>',
    defaultValue: '-',
  },
  {
    prop: 'gap / gutter',
    description: '统一设置列间距和行间距，支持单值、[columnGap, rowGap] 和响应式值。',
    type: 'MasonryGap',
    defaultValue: '`16px`',
  },
  {
    prop: 'columnGap / rowGap',
    description: '分别覆盖列间距和行间距，优先级高于 gap / gutter。',
    type: 'MasonrySpace | ResponsiveValue<MasonrySpace>',
    defaultValue: '-',
  },
  {
    prop: 'minColumnWidth',
    description: '根据容器宽度自动推导列数，适合内容墙和自适应卡片流。',
    type: 'MasonrySpace | ResponsiveValue<MasonrySpace>',
    defaultValue: '-',
  },
  {
    prop: 'minColumns / maxColumns',
    description: '给 auto-fit 模式加上下限和上限，避免超宽屏列数失控。',
    type: 'number | ResponsiveValue<number>',
    defaultValue: '-',
  },
  {
    prop: 'items / renderItem / itemKey',
    description: '数据驱动模式；itemKey 可传字段名或函数，renderItem 负责渲染每个卡片内容。',
    type: 'T[] / (item, index) => any / keyof T | ((item, index) => string | number)',
    defaultValue: '-',
  },
  {
    prop: 'itemAs',
    description: '指定每个子项包装层的标签或组件。',
    type: 'any',
    defaultValue: '`div`',
  },
  {
    prop: 'itemClassName / itemStyle',
    description: '给每个瀑布项补类名和内联样式，也支持按 item 动态生成。',
    type: 'string | ((item, index) => string) / Record<string, any> | ((item, index) => Record<string, any>)',
    defaultValue: '-',
  },
  {
    prop: 'empty',
    description: 'children 和 items 都为空时的兜底内容。',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'className / style',
    description: '根容器样式扩展，可以使用 Rue 一贯的类名直连方式。',
    type: 'string / Record<string, any>',
    defaultValue: '-',
  },
]

const basicCode = [
  'const cards = [',
  "  { id: 'signal-board', title: 'Signal Board', summary: '把埋点回放、增长假设和异常备注放进同一列。', coverHeight: '7.5rem' },",
  "  { id: 'runtime-pulse', title: 'Runtime Pulse', summary: '正文偏长的卡片更能体现瀑布流的高低错落。', coverHeight: '10rem' },",
  "  { id: 'studio-drop', title: 'Studio Drop', summary: '短摘要和视觉块混排时也不会留下整行空白。', coverHeight: '5.5rem' },",
  ']',
  '',
  '<Masonry columns={3} gap={[18, 18]}>',
  '  {cards.map(card => (',
  '    <article key={card.id} className="rounded-[1.25rem] border border-base-300 bg-base-100 p-5 shadow-sm">',
  '      <div',
  '        className="mb-4 rounded-[1rem] bg-gradient-to-br from-primary/20 to-base-200"',
  '        style={{ height: card.coverHeight }}',
  '      />',
  '      <h3 className="text-lg font-semibold">{card.title}</h3>',
  '      <p className="mt-2 text-sm opacity-70">{card.summary}</p>',
  '    </article>',
  '  ))}',
  '</Masonry>',
].join('\n')

const responsiveCode = [
  'const cards = [',
  "  { id: 'signal-board', section: 'signal board', title: 'Signal Board', summary: '移动端先单列，桌面端再放大到多列。' },",
  "  { id: 'runtime-pulse', section: 'runtime', title: 'Runtime Pulse', summary: '同一套卡片内容可以平滑扩展到更宽的容器。' },",
  "  { id: 'studio-drop', section: 'studio', title: 'Studio Drop', summary: '高度不一的摘要块仍然能保持紧凑编排。' },",
  "  { id: 'incident-brief', section: 'incident', title: 'Incident Brief', summary: '适合告警、复盘和工作说明这种信息块。' },",
  ']',
  '',
  '<Masonry',
  '  columns={{ xs: 1, sm: 2, xl: 4 }}',
  '  gap={[{ xs: 12, lg: 20 }, { xs: 12, lg: 24 }]}',
  '>',
  '  {cards.map(card => (',
  '    <article key={card.id} className="rounded-[1.25rem] border border-base-300 bg-base-100 p-5 shadow-sm">',
  '      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/45">',
  '        {card.section}',
  '      </div>',
  '      <h3 className="mt-2 text-lg font-semibold">{card.title}</h3>',
  '      <p className="mt-2 text-sm leading-6 text-base-content/72">{card.summary}</p>',
  '    </article>',
  '  ))}',
  '</Masonry>',
].join('\n')

const autoFitCode = [
  'const cards = [',
  "  { id: 'render-anchor-cleanup', title: 'Render Anchor Cleanup', stat: 'runtime', summary: '替换空 renderable 时先走 clear 路径。' },",
  "  { id: 'sidebar-nav-pass', title: 'Sidebar Navigation Pass', stat: 'app', summary: '把设计站的新组件入口补到 layout 分组。' },",
  "  { id: 'vapor-size-window', title: 'Vapor Size Window', stat: 'perf', summary: '记录体积快照和降幅来源。' },",
  "  { id: 'docs-alignment', title: 'Docs Alignment', stat: 'docs', summary: '统一设计页 API 表述和说明口径。' },",
  ']',
  '',
  '<Masonry',
  '  minColumnWidth="17rem"',
  '  minColumns={1}',
  '  maxColumns={4}',
  '  columnGap={20}',
  '  rowGap={24}',
  '>',
  '  {cards.map(card => (',
  '    <article key={card.id} className="rounded-[1.35rem] border border-base-300 bg-base-100 p-5 shadow-sm">',
  '      <div className="flex items-center justify-between gap-3">',
  '        <h3 className="text-lg font-semibold">{card.title}</h3>',
  '        <span className="rounded-full border border-base-300 bg-base-200 px-2.5 py-1 text-xs text-base-content/70">',
  '          {card.stat}',
  '        </span>',
  '      </div>',
  '      <p className="mt-3 text-sm leading-6 text-base-content/72">{card.summary}</p>',
  '    </article>',
  '  ))}',
  '</Masonry>',
].join('\n')

const dataCode = [
  'const releaseCards = [',
  '  {',
  "    id: 'render-anchor-cleanup',",
  "    track: 'runtime',",
  "    owner: 'Lin',",
  "    title: 'Render Anchor Cleanup',",
  "    summary: '替换空 renderable 时先走 clear 路径，避免 beforeUnmount / cleanup 漏掉。',",
  '    featured: true,',
  "    checkpoints: ['compiled range', 'anchor cleanup', 'Component scope'],",
  '  },',
  '  {',
  "    id: 'sidebar-nav-pass',",
  "    track: 'app',",
  "    owner: 'Qiao',",
  "    title: 'Sidebar Navigation Pass',",
  "    summary: '把设计站条目补充到 layout 分组，减少新组件只能靠手敲路径访问的问题。',",
  "    checkpoints: ['route', 'sidebar'],",
  '  },',
  ']',
  '',
  '<Masonry',
  '  items={releaseCards}',
  '  itemKey="id"',
  '  minColumnWidth="18rem"',
  '  itemAs="article"',
  '  itemClassName={item =>',
  '    item.featured',
  '      ? "rounded-[1.35rem] border border-primary/25 bg-primary/[0.04] p-5"',
  '      : "rounded-[1.35rem] border border-base-300 bg-base-100 p-5"',
  '  }',
  '  renderItem={item => (',
  '    <>',
  '      <div className="flex items-center justify-between">',
  '        <span className="badge badge-outline">{item.track}</span>',
  '        <span className="text-xs opacity-55">{item.owner}</span>',
  '      </div>',
  '      <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>',
  '      <p className="mt-2 text-sm opacity-70">{item.summary}</p>',
  '      <div className="mt-4 flex flex-wrap gap-2">',
  '        {item.checkpoints.map(point => (',
  '          <span',
  '            key={point}',
  '            className="rounded-full border border-base-300 bg-base-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-base-content/65"',
  '          >',
  '            {point}',
  '          </span>',
  '        ))}',
  '      </div>',
  '    </>',
  '  )}',
  '/>',
].join('\n')

const shellCode = [
  'const shelfCards = [',
  '  {',
  "    id: 'ops-playbook',",
  "    collection: 'playbook',",
  "    title: 'Ops Handoff',",
  "    summary: '值班手册、升级路径和短周期回归清单适合做成语义化 article 项。',",
  "    labels: ['handoff', 'ops', 'checklist'],",
  '    pinned: true,',
  '  },',
  '  {',
  "    id: 'migration-note',",
  "    collection: 'migration',",
  "    title: 'Migration Note',",
  "    summary: '说明文档往往正文偏长，很适合放在 pinned 卡旁边形成高低错落。',",
  "    labels: ['upgrade', 'runtime', 'guide'],",
  '    pinned: true,',
  '  },',
  ']',
  '',
  '<Masonry',
  '  items={shelfCards}',
  '  columns={{ xs: 1, lg: 2 }}',
  '  itemKey="id"',
  '  itemAs="article"',
  '  itemClassName={item => item.pinned',
  '    ? "rounded-[1.35rem] border border-primary/25 bg-primary/[0.04]"',
  '    : "rounded-[1.35rem] border border-base-300 bg-base-100"}',
  '  itemStyle={item => ({',
  '    padding: item.pinned ? "1.25rem" : "1rem",',
  '    boxShadow: "0 24px 60px -42px rgba(15, 23, 42, 0.55)",',
  '  })}',
  '  renderItem={item => (',
  '    <div className="space-y-4">',
  '      <div className="flex items-start justify-between gap-3">',
  '        <div>',
  '          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/45">',
  '            {item.collection}',
  '          </div>',
  '          <h3 className="mt-2 text-lg font-semibold leading-6">{item.title}</h3>',
  '        </div>',
  '        {item.pinned ? (',
  '          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">',
  '            pinned',
  '          </span>',
  '        ) : null}',
  '      </div>',
  '      <p className="text-sm leading-6 text-base-content/72">{item.summary}</p>',
  '      <div className="flex flex-wrap gap-2">',
  '        {item.labels.map(label => (',
  '          <span',
  '            key={label}',
  '            className="rounded-full border border-base-300 bg-base-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-base-content/65"',
  '          >',
  '            {label}',
  '          </span>',
  '        ))}',
  '      </div>',
  '    </div>',
  '  )}',
  '/>',
].join('\n')

const emptyCode = [
  '<Masonry',
  '  items={[]}',
  '  columns={{ xs: 1, md: 2 }}',
  '  empty={',
  '    <div className="rounded-[1.35rem] border border-dashed border-base-300 bg-base-100 p-8 text-center">',
  '      No cards yet',
  '    </div>',
  '  }',
  '/>',
].join('\n')

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

const TagPill: FC<{ label: string }> = ({ label }) => {
  return (
    <span className="rounded-full border border-base-300/80 bg-base-100 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-base-content/65">
      {label}
    </span>
  )
}

const ShowcaseTile: FC<{ item: ShowcaseCard; index: number }> = ({ item, index }) => {
  const gradient = gradients[index % gradients.length]
  return (
    <article className="rounded-[1.35rem] border border-base-300/80 bg-base-100 p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.55)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/45">
            {item.section}
          </div>
          <h3 className="mt-2 text-lg font-semibold leading-6">{item.title}</h3>
        </div>
        <span className="rounded-full border border-base-300/80 bg-base-200 px-2.5 py-1 text-xs font-medium text-base-content/70">
          {item.stat}
        </span>
      </div>
      <div
        className={`mt-4 rounded-[1.1rem] border border-white/50 bg-gradient-to-br ${gradient}`}
        style={{ height: item.coverHeight }}
      />
      <p className="mt-4 text-sm leading-6 text-base-content/72">{item.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {item.tags.map(tag => (
          <TagPill key={tag} label={tag} />
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {item.bullets.map(bullet => (
          <div
            key={bullet}
            className="rounded-[0.9rem] border border-base-300/60 bg-base-200/55 px-3 py-2 text-xs leading-5 text-base-content/70"
          >
            {bullet}
          </div>
        ))}
      </div>
      {item.id === 'launch-kit' ? (
        <div className="mt-5 flex items-center gap-3">
          <button className="btn btn-primary btn-sm">Open board</button>
          <button className="btn btn-ghost btn-sm">Share</button>
        </div>
      ) : null}
    </article>
  )
}

const ReleaseTile: FC<{ item: ReleaseCard }> = ({ item }) => {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full border border-base-300/80 bg-base-200 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-base-content/65">
          {item.track}
        </span>
        <span className="text-xs text-base-content/50">owner · {item.owner}</span>
      </div>
      <h3 className="mt-4 text-lg font-semibold leading-6">{item.title}</h3>
      <p className="mt-3 text-sm leading-6 text-base-content/72">{item.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {item.checkpoints.map(point => (
          <TagPill key={point} label={point} />
        ))}
      </div>
    </>
  )
}

const ShelfTile: FC<{ item: ShelfCard }> = ({ item }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-base-content/45">
            {item.collection}
          </div>
          <h3 className="mt-2 text-lg font-semibold leading-6">{item.title}</h3>
        </div>
        {item.pinned ? (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            pinned
          </span>
        ) : null}
      </div>
      <p className="text-sm leading-6 text-base-content/72">{item.summary}</p>
      <div className="flex flex-wrap gap-2">
        {item.labels.map(label => (
          <TagPill key={label} label={label} />
        ))}
      </div>
    </div>
  )
}

const MasonryPage: FC = () => {
  const tabBasic = ref<PreviewTabMode>('preview')
  const tabResponsive = ref<PreviewTabMode>('preview')
  const tabAutoFit = ref<PreviewTabMode>('preview')
  const tabData = ref<PreviewTabMode>('preview')
  const tabShell = ref<PreviewTabMode>('preview')
  const tabEmpty = ref<PreviewTabMode>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Masonry 瀑布流</h1>
        <p className="text-sm mt-3 mb-3">
          Masonry 是一个偏布局层的 Rue Design 组件。它不强绑定任何卡片视觉，而是把不同高度的内容块
          组织成更紧凑的瀑布流；同时把固定列数、响应式列数、基于最小列宽的 auto-fit，以及 items /
          renderItem 这几条常见使用路径一次覆盖。
        </p>

        <h2>何时使用</h2>
        <ul>
          <li>内容块高度明显不一致，用 Grid 会留下大面积空白时。</li>
          <li>你已经有自己的 card、report、gallery 视觉，只缺一个轻量的瀑布流容器时。</li>
          <li>需要在固定列数和自适应列宽之间切换，又不想引入额外的布局依赖时。</li>
        </ul>

        <h2>推荐用法</h2>

        <PreviewBlock
          title="Basic wall"
          summary="最直接的 children 模式：Masonry 只负责排版，不接管卡片视觉。"
          tab={tabBasic}
          preview={() => (
            <div className="rounded-box border border-base-300 bg-base-200/35 p-4 md:p-5">
              <Masonry columns={3} gap={[18, 18]} data-testid="masonry-basic-demo">
                {showcaseCards.map((item, index) => (
                  <ShowcaseTile key={item.id} item={item} index={index} />
                ))}
              </Masonry>
            </div>
          )}
          code={basicCode}
        />

        <PreviewBlock
          title="Responsive columns"
          summary="columns 和 gap 都支持断点对象，适合从移动端单列一路放大到桌面端多列。"
          tab={tabResponsive}
          preview={() => (
            <div className="rounded-box border border-base-300 bg-base-200/35 p-4 md:p-5">
              <Masonry
                columns={{ xs: 1, sm: 2, xl: 4 }}
                gap={[
                  { xs: 12, lg: 20 },
                  { xs: 12, lg: 24 },
                ]}
                data-testid="masonry-responsive-demo"
              >
                {showcaseCards.slice(0, 6).map((item, index) => (
                  <ShowcaseTile key={item.id} item={item} index={index} />
                ))}
              </Masonry>
            </div>
          )}
          code={responsiveCode}
        />

        <PreviewBlock
          title="Auto fit width"
          summary="minColumnWidth 让 Masonry 根据容器宽度自动推导列数，更适合未知容器宽度的内容墙。"
          tab={tabAutoFit}
          preview={() => (
            <div className="rounded-box border border-base-300 bg-base-200/35 p-4 md:p-5">
              <Masonry
                minColumnWidth="17rem"
                minColumns={1}
                maxColumns={4}
                columnGap={20}
                rowGap={24}
                data-testid="masonry-autofit-demo"
              >
                {showcaseCards.map((item, index) => (
                  <ShowcaseTile key={item.id} item={item} index={index} />
                ))}
              </Masonry>
            </div>
          )}
          code={autoFitCode}
        />

        <PreviewBlock
          title="Items and renderItem"
          summary="数据驱动模式适合 release wall、活动 feed 和任何现成列表数据的摘要面板。"
          tab={tabData}
          preview={() => (
            <div className="rounded-box border border-base-300 bg-base-200/35 p-4 md:p-5">
              <Masonry
                items={releaseCards}
                itemKey="id"
                minColumnWidth="18rem"
                itemAs="article"
                itemClassName={item =>
                  item.featured
                    ? 'rounded-[1.35rem] border border-primary/25 bg-primary/[0.04] p-5'
                    : 'rounded-[1.35rem] border border-base-300 bg-base-100 p-5'
                }
                renderItem={item => <ReleaseTile item={item} />}
              />
            </div>
          )}
          code={dataCode}
        />

        <PreviewBlock
          title="Custom item shell"
          summary="itemAs、itemClassName 和 itemStyle 让包装层也能参与语义和视觉控制。"
          tab={tabShell}
          preview={() => (
            <div className="rounded-box border border-base-300 bg-base-200/35 p-4 md:p-5">
              <Masonry
                items={shelfCards}
                columns={{ xs: 1, lg: 2 }}
                itemKey="id"
                itemAs="article"
                itemClassName={item =>
                  item.pinned
                    ? 'rounded-[1.35rem] border border-primary/25 bg-primary/[0.04]'
                    : 'rounded-[1.35rem] border border-base-300 bg-base-100'
                }
                itemStyle={item => ({
                  padding: item.pinned ? '1.25rem' : '1rem',
                  boxShadow: '0 24px 60px -42px rgba(15, 23, 42, 0.55)',
                })}
                renderItem={item => <ShelfTile item={item} />}
              />
            </div>
          )}
          code={shellCode}
        />

        <PreviewBlock
          title="Empty fallback"
          summary="empty 用来承接无数据状态，避免页面自己额外判断一层 if。"
          tab={tabEmpty}
          preview={() => (
            <div className="rounded-box border border-base-300 bg-base-200/35 p-4 md:p-5">
              <Masonry
                items={[]}
                columns={{ xs: 1, md: 2 }}
                empty={
                  <div className="rounded-[1.35rem] border border-dashed border-base-300 bg-base-100 p-8 text-center shadow-[0_24px_60px_-42px_rgba(15,23,42,0.25)]">
                    <div className="text-sm font-semibold text-base-content/80">No cards yet</div>
                    <p className="mt-2 mb-0 text-sm leading-6 text-base-content/60">
                      数据回来后会自动切回瀑布流，不需要再包一层条件渲染容器。
                    </p>
                  </div>
                }
              />
            </div>
          )}
          code={emptyCode}
        />

        <h2 id="masonry-api">API</h2>
        <p className="text-sm mt-3 mb-4">
          Masonry 的设计目标是做一个足够轻的布局容器：它只关心列数、间距和 item
          wrapper，卡片视觉、交互和业务内容继续交给你现成的 Rue 组件或业务样式。
        </p>
        <ApiTable rows={masonryApiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default MasonryPage
