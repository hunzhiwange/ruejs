import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Badge, Button, Card, Tabs } from '@rue-js/design'
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

const shoeImage = 'https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp'
const movieImage = 'https://img.daisyui.com/images/stock/photo-1635805737707-575885ab0820.webp'
const albumImage = 'https://img.daisyui.com/images/stock/photo-1494232410401-ad00d5433cfa.webp'
const workspaceImage = 'https://picsum.photos/seed/rue-card-workspace/960/640'
const reportImage = 'https://picsum.photos/seed/rue-card-report/960/640'

const EyeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
    />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const _SparkIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-4"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 19h.01M12 21h.01M19 19h.01" />
  </svg>
)

const TrendIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-4"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="m4 16 6-6 4 4 6-8" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 6h6v6" />
  </svg>
)

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-4"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
  </svg>
)

const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-4"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
  </svg>
)

const _ArrowRightIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className="size-4"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
    <path strokeLinecap="round" strokeLinejoin="round" d="m13 6 6 6-6 6" />
  </svg>
)

const MiniAvatar: FC<{ text: string; className?: string }> = ({ text, className }) => {
  return (
    <div
      className={`inline-grid h-12 w-12 place-items-center rounded-full text-sm font-semibold ${className ?? 'bg-primary text-primary-content'}`}
    >
      {text}
    </div>
  )
}

const cardApiRows: ApiRow[] = [
  {
    prop: 'actions',
    description: '底部操作栏，传入节点数组后自动平均分栏',
    type: 'any[]',
    defaultValue: '-',
  },
  {
    prop: 'activeTabKey',
    description: '受控模式下的当前 tab key',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'bodyClassName',
    description: '语义化 body 容器的类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'border / bordered',
    description: '基础边框别名，等价于追加 card-border',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'className',
    description: '根节点类名，保持与 daisyUI 类直接混用的能力',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'cover',
    description: '卡片封面，自动渲染为顶部 figure 区域',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'dash',
    description: '基础虚线边框开关，追加 card-dash',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'defaultActiveTabKey',
    description: '非受控模式下的默认 tab key',
    type: 'string',
    defaultValue: 'tabList 第一项',
  },
  {
    prop: 'extra',
    description: '头部右侧操作区域',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'headerClassName',
    description: '语义化 header 容器的类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'hoverable',
    description: '启用悬浮抬升与阴影过渡',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'imageFull',
    description: '使用 daisyUI image-full，适合封面做背景图',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'loading',
    description: '在 body 区域输出骨架占位',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'onTabChange',
    description: 'tab 切换回调，受控与非受控模式都会触发',
    type: '(key: string) => void',
    defaultValue: '-',
  },
  {
    prop: 'side',
    description: '使用 daisyUI card-side，让 figure 进入横向布局',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'size',
    description: '支持 xs~xl 与 small / middle / large 语义别名',
    type: "'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'medium' | 'middle' | 'large'",
    defaultValue: 'md',
  },
  {
    prop: 'tabBarExtraContent',
    description: 'tabs 右侧扩展区域',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'tabList',
    description: '头部 tabs 配置列表，支持 disabled 与 className',
    type: 'Array<{ key: string; label?: any; tab?: any; disabled?: boolean; className?: string }>',
    defaultValue: '-',
  },
  {
    prop: 'tabProps',
    description: '控制 tabs 的 style、placement、size 与 className',
    type: "{ style?: 'box' | 'border' | 'lift'; placement?: 'top' | 'bottom'; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; className?: string }",
    defaultValue: '-',
  },
  {
    prop: 'title',
    description: '头部标题区',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'type',
    description: '卡片层次语义，inner 会切到更内嵌的底色与边框',
    type: "'default' | 'inner'",
    defaultValue: 'default',
  },
  {
    prop: 'variant',
    description: '语义化边框风格，优先于展示层 API 编排',
    type: "'outlined' | 'borderless' | 'dashed'",
    defaultValue: 'borderless',
  },
]

const cardMetaRows: ApiRow[] = [
  {
    prop: 'avatar',
    description: '头像或图标区域',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'children',
    description: '标题和描述下方的自定义补充内容',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'className',
    description: 'Meta 根节点类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'description',
    description: '描述内容',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'title',
    description: '标题内容',
    type: 'any',
    defaultValue: '-',
  },
]

const cardGridRows: ApiRow[] = [
  {
    prop: 'className',
    description: 'Grid 单元的类名，常与宽度或背景类联用',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'hoverable',
    description: '是否启用 hover 阴影与背景过渡',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    prop: 'style',
    description: 'Grid 单元的行内样式',
    type: 'any',
    defaultValue: '-',
  },
]

const semanticCode = `import { Badge, Button, Card } from '@rue-js/design'<Card
  title="Q2 产品指标"
  extra={<Badge variant="secondary">Live</Badge>}
  cover={<img src="https://picsum.photos/seed/rue-card-workspace/960/640" alt="Workspace dashboard" className="h-56 w-full object-cover" />}
  actions={[
    <Button type="text" size="sm" className="inline-flex items-center justify-center">查看报表</Button>,
    <Button color="primary" size="sm" className="inline-flex items-center justify-center">升级看板</Button>,
  ]}
  hoverable
  className="overflow-hidden bg-base-100 shadow-sm"
>
  <p className="text-sm leading-6 opacity-80">
    把封面、头部、操作区放进根组件 props，适合仪表盘和概览卡片。
  </p>
  <div className="mt-2 flex flex-wrap gap-2">
    <Badge outline>转化率 19.2%</Badge>
    <Badge outline>客单价 +12%</Badge>
  </div>
</Card>`

const compoundCode = `import { Button, Card } from '@rue-js/design'<Card className="w-96 bg-base-100 shadow-sm">
  <Card.Figure>
    <img src="https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp" alt="Shoes" />
  </Card.Figure>
  <Card.Body>
    <Card.Title>Card Title</Card.Title>
    <p className="text-sm leading-6 opacity-75">
      Body / Title / Actions / Figure 仍然适合做完全自定义的内容拼装。
    </p>
    <Card.Actions className="justify-end">
      <Button color="primary">Buy Now</Button>
    </Card.Actions>
  </Card.Body>
</Card>`

const metaCode = `import { Badge, Button, Card } from '@rue-js/design'<Card
  cover={<img src="https://picsum.photos/seed/rue-card-report/960/640" alt="Team workspace" className="h-52 w-full object-cover" />}
  actions={[
    <Button type="text" size="sm">收藏</Button>,
    <Button type="text" size="sm">分享</Button>,
    <Button color="primary" size="sm">打开空间</Button>,
  ]}
  className="overflow-hidden bg-base-100 shadow-sm"
>
  <Card.Body className="gap-4">
    <Card.Meta
      avatar={<div className="inline-grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-content text-sm font-semibold">AI</div>}
      title="Rue Design Workspace"
      description="把文档、组件、评审记录聚合在一张卡片里。"
    >
      <div className="flex flex-wrap gap-2">
        <Badge outline>12 个原型</Badge>
        <Badge outline>3 位维护者</Badge>
      </div>
    </Card.Meta>
  </Card.Body>
</Card>`

const tabsCode = `import { ref } from '@rue-js/rue'
import { Badge, Button, Card } from '@rue-js/design'
const activeKey = ref<'overview' | 'milestones' | 'members'>('overview')

<Card
  title="版本节奏"
  activeTabKey={activeKey.value}
  tabList={[
    { key: 'overview', label: '总览' },
    { key: 'milestones', label: '里程碑' },
    { key: 'members', label: '成员' },
  ]}
  tabBarExtraContent={<Button size="sm" color="primary">新建里程碑</Button>}
  onTabChange={key => {
    activeKey.value = key as 'overview' | 'milestones' | 'members'
  }}
  className="bg-base-100 shadow-sm"
>
  {activeKey.value === 'overview' ? (
    <div className="space-y-2 text-sm leading-6 opacity-80">
      <p>用 activeTabKey + onTabChange 驱动卡片级 tab 切换。</p>
      <Badge outline>Roadmap ready</Badge>
    </div>
  ) : null}
</Card>`

const loadingCode = `import { Card } from '@rue-js/design'<div className="grid gap-6 lg:grid-cols-2">
  <Card loading title="同步远程指标" className="bg-base-100 shadow-sm" />
  <Card type="inner" title="内嵌提示" className="bg-base-100">
    <p className="text-sm leading-6 opacity-75">
      type="inner" 适合在主卡片内部再嵌一层说明块。
    </p>
  </Card>
</div>`

const gridCode = `import { Card } from '@rue-js/design'<Card title="常用入口" bodyClassName="!p-0" className="overflow-hidden bg-base-100 shadow-sm">
  <div className="grid gap-px bg-base-300/70 sm:grid-cols-2 xl:grid-cols-4">
    <Card.Grid>文档中心</Card.Grid>
    <Card.Grid>设计 Token</Card.Grid>
    <Card.Grid hoverable={false}>构建产物</Card.Grid>
    <Card.Grid>使用趋势</Card.Grid>
  </div>
</Card>`

const pricingCode = `<Card className="w-full max-w-md bg-base-100 shadow-sm">
  <div className="card-body">
    <span className="badge badge-xs badge-warning">Most Popular</span>
    <div className="flex items-end justify-between gap-4">
      <h2 className="text-3xl font-bold">Premium</h2>
      <span className="text-xl">$29/mo</span>
    </div>
    <ul className="mt-6 flex flex-col gap-2 text-xs leading-6">
      <li>High-resolution image generation</li>
      <li>Customizable style templates</li>
      <li>Batch processing capabilities</li>
      <li>AI-driven image enhancements</li>
      <li className="opacity-50 line-through">Seamless cloud integration</li>
      <li className="opacity-50 line-through">Real-time collaboration tools</li>
    </ul>
    <div className="mt-6">
      <Button color="primary" block>Subscribe</Button>
    </div>
  </div>
</Card>`

const sizesCode = `<div className="grid gap-4 lg:grid-cols-2">
  <Card size="xs" className="bg-base-100 shadow-sm"><Card.Body><Card.Title>Xsmall Card</Card.Title><p className="text-sm opacity-75">适合最紧凑的信息块。</p></Card.Body></Card>
  <Card size="sm" className="bg-base-100 shadow-sm"><Card.Body><Card.Title>Small Card</Card.Title><p className="text-sm opacity-75">移动端列表卡片常用尺寸。</p></Card.Body></Card>
  <Card size="md" className="bg-base-100 shadow-sm"><Card.Body><Card.Title>Medium Card</Card.Title><p className="text-sm opacity-75">默认信息层级。</p></Card.Body></Card>
  <Card size="lg" className="bg-base-100 shadow-sm"><Card.Body><Card.Title>Large Card</Card.Title><p className="text-sm opacity-75">适合模块式运营位。</p></Card.Body></Card>
  <Card size="xl" className="bg-base-100 shadow-sm"><Card.Body><Card.Title>Xlarge Card</Card.Title><p className="text-sm opacity-75">适合宽幅内容摘要。</p></Card.Body></Card>
</div>`

const contentCode = `<div className="grid gap-6 lg:grid-cols-3">
  <Card className="overflow-hidden bg-base-100 shadow-sm" cover={<img src="https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp" alt="Shoes" />}>
    <Card.Body>
      <Card.Title>Card Title <Badge variant="secondary">NEW</Badge></Card.Title>
      <p className="text-sm opacity-75">标题区可直接放入徽标或状态。</p>
      <Card.Actions className="justify-end"><Badge outline>Fashion</Badge><Badge outline>Products</Badge></Card.Actions>
    </Card.Body>
  </Card>

  <Card className="bg-base-100 shadow-sm">
    <Card.Body>
      <Card.Title>Card title!</Card.Title>
      <p className="text-sm opacity-75">没有图片时，Card 依然可以作为纯文字内容块使用。</p>
      <Card.Actions className="justify-end"><Button color="primary">Buy Now</Button></Card.Actions>
    </Card.Body>
  </Card>

  <Card className="bg-base-100 shadow-sm">
    <Card.Body>
      <Card.Actions className="justify-end">
        <Button shape="square" size="sm"><span aria-hidden="true">×</span></Button>
      </Card.Actions>
      <p className="text-sm leading-6 opacity-75">把动作放在内容上方，适合轻提示和可关闭卡片。</p>
    </Card.Body>
  </Card>
</div>`

const appearanceCode = `<div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
  <Card variant="outlined" className="bg-base-100"><Card.Body><Card.Title>Outlined</Card.Title><p className="text-sm opacity-75">组合描边信息卡。</p></Card.Body></Card>
  <Card variant="dashed" className="bg-base-100"><Card.Body><Card.Title>Dashed</Card.Title><p className="text-sm opacity-75">适合空态和引导。</p></Card.Body></Card>
  <Card className="bg-primary text-primary-content"><Card.Body><Card.Title>Brand Surface</Card.Title><p className="text-sm opacity-85">品牌色卡片。</p></Card.Body></Card>
  <Card className="bg-neutral text-neutral-content"><Card.Body className="items-center text-center"><Card.Title>Cookies!</Card.Title><p className="text-sm opacity-85">居中内容与反差色适合提醒面板。</p></Card.Body></Card>
  <Card type="inner" className="bg-base-100"><Card.Body><Card.Title>Inner</Card.Title><p className="text-sm opacity-75">适合主卡片内部的次级信息层。</p></Card.Body></Card>
</div>`

const mediaCode = `<div className="grid gap-6 xl:grid-cols-2">
  <Card className="overflow-hidden bg-base-100 shadow-sm" cover={<img src="https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp" alt="Shoes" />}>
    <Card.Body>
      <Card.Title>Card Title</Card.Title>
      <p className="text-sm opacity-75">最常见的顶部封面布局。</p>
      <Card.Actions className="justify-end"><Button color="primary">Buy Now</Button></Card.Actions>
    </Card.Body>
  </Card>

  <Card className="bg-base-100 shadow-sm">
    <Card.Body>
      <Card.Title>Bottom Image</Card.Title>
      <p className="text-sm opacity-75">将媒体放在内容之后，适合做故事卡片。</p>
    </Card.Body>
    <figure><img src="https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp" alt="Shoes" /></figure>
  </Card>

  <Card className="bg-base-100 shadow-sm">
    <figure className="px-10 pt-10"><img src="https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp" alt="Shoes" className="rounded-box" /></figure>
    <Card.Body className="items-center text-center">
      <Card.Title>Centered Card</Card.Title>
      <p className="text-sm opacity-75">展示居中内容与额外留白的基础示例。</p>
      <Card.Actions><Button color="primary">Buy Now</Button></Card.Actions>
    </Card.Body>
  </Card>

  <Card imageFull className="overflow-hidden bg-base-100 shadow-sm" cover={<img src="https://img.daisyui.com/images/stock/photo-1606107557195-0e29a4b5b4aa.webp" alt="Shoes" />}>
    <Card.Body>
      <Card.Title>Image Overlay</Card.Title>
      <p className="text-sm opacity-85">imageFull 让封面成为背景层。</p>
      <Card.Actions className="justify-end"><Button color="primary">Buy Now</Button></Card.Actions>
    </Card.Body>
  </Card>
</div>`

const horizontalCode = `<div className="grid gap-6 xl:grid-cols-2">
  <Card side className="overflow-hidden bg-base-100 shadow-sm">
    <figure><img src="https://img.daisyui.com/images/stock/photo-1635805737707-575885ab0820.webp" alt="Movie" /></figure>
    <Card.Body>
      <Card.Title>New movie is released!</Card.Title>
      <p className="text-sm opacity-75">Click the button to watch on Jetflix app.</p>
      <Card.Actions className="justify-end"><Button color="primary">Watch</Button></Card.Actions>
    </Card.Body>
  </Card>

  <Card className="overflow-hidden bg-base-100 shadow-sm lg:card-side">
    <figure><img src="https://img.daisyui.com/images/stock/photo-1494232410401-ad00d5433cfa.webp" alt="Album" /></figure>
    <Card.Body>
      <Card.Title>New album is released!</Card.Title>
      <p className="text-sm opacity-75">Click the button to listen on Spotiwhy app.</p>
      <Card.Actions className="justify-end"><Button color="primary">Listen</Button></Card.Actions>
    </Card.Body>
  </Card>
</div>`

const CardDemo: FC = () => {
  const tabSemantic = ref<TabMode>('preview')
  const tabCompound = ref<TabMode>('preview')
  const tabMeta = ref<TabMode>('preview')
  const tabTabs = ref<TabMode>('preview')
  const tabLoading = ref<TabMode>('preview')
  const tabGrid = ref<TabMode>('preview')
  const tabPricing = ref<TabMode>('preview')
  const tabSizes = ref<TabMode>('preview')
  const tabContent = ref<TabMode>('preview')
  const tabAppearance = ref<TabMode>('preview')
  const tabMedia = ref<TabMode>('preview')
  const tabHorizontal = ref<TabMode>('preview')
  const productTab = ref<'overview' | 'milestones' | 'members'>('overview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Card 卡片</h1>
        <p className="text-sm mt-3 mb-3">
          Card 用于把内容、媒体、操作和状态浓缩进一块易读的表面里。
        </p>
        <p className="text-sm my-3 opacity-75">
          组件使用 Rue 当前的视觉语气和 daisyUI class
          直连能力，同时提供头部、封面、操作栏、Meta、Grid、loading 和 tabs API。
        </p>

        <ExampleBlock
          title="语义化 API"
          summary="展示 title、extra、cover、actions、hoverable 组合写法。"
          tab={tabSemantic}
          code={semanticCode}
          preview={() => (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <Card
                title="Q2 产品指标"
                extra={<Badge variant="secondary">Live</Badge>}
                cover={
                  <img
                    src={workspaceImage}
                    alt="Workspace dashboard"
                    className="h-56 w-full object-cover"
                  />
                }
                actions={[
                  <Button type="text" size="sm" className="inline-flex items-center justify-center">
                    <span className="inline-flex items-center gap-2">
                      <EyeIcon />
                      查看报表
                    </span>
                  </Button>,
                  <Button
                    color="primary"
                    size="sm"
                    className="inline-flex items-center justify-center"
                  >
                    <span className="inline-flex items-center gap-2">
                      <TrendIcon />
                      升级看板
                    </span>
                  </Button>,
                ]}
                hoverable
                className="overflow-hidden bg-base-100 shadow-sm"
              >
                <p className="text-sm leading-6 opacity-80">
                  把封面、头部、操作区放进根组件 props，适合仪表盘、概览页和运营卡片。
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge outline>转化率 19.2%</Badge>
                  <Badge outline>客单价 +12%</Badge>
                  <Badge outline>复购率 +7%</Badge>
                </div>
              </Card>
              <Card type="inner" title="为什么要这样用" className="bg-base-100 shadow-sm">
                <p className="text-sm leading-6 opacity-75">
                  语义化 API 适合把常见结构固定下来，减少反复手写 header、body、actions 和 tabs
                  布局。
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-box bg-base-200/70 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] opacity-60">Cover</div>
                    <div className="mt-2 text-sm font-medium">顶部封面</div>
                  </div>
                  <div className="rounded-box bg-base-200/70 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] opacity-60">Actions</div>
                    <div className="mt-2 text-sm font-medium">底部分栏操作</div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        />

        <ExampleBlock
          title="复合子组件"
          summary="Body / Title / Actions / Figure 展示，适合手工拼装自定义结构。"
          tab={tabCompound}
          code={compoundCode}
          preview={() => (
            <Card className="w-full max-w-md bg-base-100 shadow-sm">
              <Card.Figure>
                <img src={shoeImage} alt="Shoes" />
              </Card.Figure>
              <Card.Body>
                <Card.Title>Card Title</Card.Title>
                <p className="text-sm leading-6 opacity-75">
                  低层子组件没有被移除，仍然适合自定义媒体顺序、插入任意节点或接管布局细节。
                </p>
                <Card.Actions className="justify-end">
                  <Button color="primary">Buy Now</Button>
                </Card.Actions>
              </Card.Body>
            </Card>
          )}
        />

        <ExampleBlock
          title="Meta 与操作栏"
          summary="Card.Meta 统一头像、标题和描述；配合根组件 actions 更适合做资料卡与工作区卡片。"
          tab={tabMeta}
          code={metaCode}
          preview={() => (
            <Card
              cover={
                <img src={reportImage} alt="Team workspace" className="h-52 w-full object-cover" />
              }
              actions={[
                <Button type="text" size="sm">
                  收藏
                </Button>,
                <Button type="text" size="sm">
                  分享
                </Button>,
                <Button color="primary" size="sm">
                  打开空间
                </Button>,
              ]}
              className="overflow-hidden bg-base-100 shadow-sm"
            >
              <Card.Body className="gap-4">
                <Card.Meta
                  avatar={<MiniAvatar text="AI" />}
                  title="Rue Design Workspace"
                  description="把文档、组件、评审记录聚合在一张卡片里。"
                >
                  <div className="flex flex-wrap gap-2">
                    <Badge outline>12 个原型</Badge>
                    <Badge outline>3 位维护者</Badge>
                    <Badge outline>2 个待合并 PR</Badge>
                  </div>
                </Card.Meta>
                <div className="rounded-box bg-base-200/60 p-4 text-sm leading-6 opacity-80">
                  这类卡片适合团队空间、作者信息、文章摘要、资源入口等需要“头像 + 文案 +
                  操作”的场景。
                </div>
              </Card.Body>
            </Card>
          )}
        />

        <ExampleBlock
          title="带 Tabs 的卡片"
          summary="Card 现在可直接承载卡片级 tab 头部，适合概览、里程碑、成员等分区内容。"
          tab={tabTabs}
          code={tabsCode}
          preview={() => (
            <Card
              title="版本节奏"
              activeTabKey={productTab.value}
              tabList={[
                { key: 'overview', label: '总览' },
                { key: 'milestones', label: '里程碑' },
                { key: 'members', label: '成员' },
              ]}
              tabBarExtraContent={
                <Button size="sm" color="primary">
                  <span className="inline-flex items-center gap-2">
                    <PlusIcon />
                    新建里程碑
                  </span>
                </Button>
              }
              onTabChange={key => {
                productTab.value = key as 'overview' | 'milestones' | 'members'
              }}
              className="bg-base-100 shadow-sm"
            >
              {productTab.value === 'overview' ? (
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-box bg-base-200/70 p-4">
                    <div className="text-xs uppercase tracking-[0.16em] opacity-60">Velocity</div>
                    <div className="mt-2 text-2xl font-semibold">+18%</div>
                    <div className="mt-1 text-sm opacity-75">本周交付速度</div>
                  </div>
                  <div className="rounded-box bg-base-200/70 p-4">
                    <div className="text-xs uppercase tracking-[0.16em] opacity-60">QA</div>
                    <div className="mt-2 text-2xl font-semibold">7</div>
                    <div className="mt-1 text-sm opacity-75">待验证缺陷</div>
                  </div>
                  <div className="rounded-box bg-base-200/70 p-4">
                    <div className="text-xs uppercase tracking-[0.16em] opacity-60">Review</div>
                    <div className="mt-2 text-2xl font-semibold">3</div>
                    <div className="mt-1 text-sm opacity-75">待合并 PR</div>
                  </div>
                </div>
              ) : null}

              {productTab.value === 'milestones' ? (
                <ul className="list gap-2">
                  <li className="list-row">
                    <div className="font-medium">v0.8</div>
                    <div className="list-col-grow text-sm opacity-75">表单编排和 SSR 回归测试</div>
                    <Badge variant="secondary">In Review</Badge>
                  </li>
                  <li className="list-row">
                    <div className="font-medium">v0.9</div>
                    <div className="list-col-grow text-sm opacity-75">设计页统一升级</div>
                    <Badge outline>Planning</Badge>
                  </li>
                </ul>
              ) : null}

              {productTab.value === 'members' ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  {['UI', 'DX', 'QA'].map(label => (
                    <div key={label} className="rounded-box bg-base-200/70 p-4 text-center">
                      <MiniAvatar
                        text={label}
                        className="mx-auto bg-secondary text-secondary-content"
                      />
                      <div className="mt-3 font-medium">{label} Owner</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </Card>
          )}
        />

        <ExampleBlock
          title="Loading 与 Inner"
          summary="loading 为数据未返回时提供骨架占位，type='inner' 适合二级信息层。"
          tab={tabLoading}
          code={loadingCode}
          preview={() => (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card loading title="同步远程指标" className="bg-base-100 shadow-sm" />
              <Card type="inner" title="内嵌提示" className="bg-base-100 shadow-sm">
                <p className="text-sm leading-6 opacity-75">
                  inner
                  卡片更适合放在正文、抽屉或主卡片内部作为次级说明层，不会抢掉主信息面的视觉焦点。
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge outline>发布前检查</Badge>
                  <Badge outline>设计稿已对齐</Badge>
                </div>
              </Card>
            </div>
          )}
        />

        <ExampleBlock
          title="Grid 网格卡片"
          summary="Card.Grid 适合做快捷入口和稠密信息总览；bodyClassName='!p-0' 可以去掉默认留白。"
          tab={tabGrid}
          code={gridCode}
          preview={() => (
            <Card
              title="常用入口"
              bodyClassName="!p-0"
              className="overflow-hidden bg-base-100 shadow-sm"
            >
              <div className="grid gap-px bg-base-300/70 sm:grid-cols-2 xl:grid-cols-4">
                <Card.Grid>
                  <div className="text-xs uppercase tracking-[0.16em] opacity-60">Docs</div>
                  <div className="mt-2 font-semibold">文档中心</div>
                  <div className="mt-1 text-sm opacity-75">组件说明、计划和变更记录</div>
                </Card.Grid>
                <Card.Grid>
                  <div className="text-xs uppercase tracking-[0.16em] opacity-60">Token</div>
                  <div className="mt-2 font-semibold">设计 Token</div>
                  <div className="mt-1 text-sm opacity-75">语义色、尺寸与层级规则</div>
                </Card.Grid>
                <Card.Grid hoverable={false}>
                  <div className="text-xs uppercase tracking-[0.16em] opacity-60">Build</div>
                  <div className="mt-2 font-semibold">构建产物</div>
                  <div className="mt-1 text-sm opacity-75">稳定视图，不需要 hover 干扰</div>
                </Card.Grid>
                <Card.Grid>
                  <div className="text-xs uppercase tracking-[0.16em] opacity-60">Usage</div>
                  <div className="mt-2 font-semibold">使用趋势</div>
                  <div className="mt-1 text-sm opacity-75">近 7 天页面访问与组件调用</div>
                </Card.Grid>
              </div>
            </Card>
          )}
        />

        <ExampleBlock
          title="Pricing Card"
          summary="展示基础定价卡片示例，作为信息密度更高的业务组合案例。"
          tab={tabPricing}
          code={pricingCode}
          preview={() => (
            <Card className="w-full max-w-md bg-base-100 shadow-sm">
              <div className="card-body">
                <span className="badge badge-xs badge-warning">Most Popular</span>
                <div className="flex items-end justify-between gap-4">
                  <h2 className="text-3xl font-bold">Premium</h2>
                  <span className="text-xl">$29/mo</span>
                </div>
                <ul className="mt-6 flex flex-col gap-2 text-xs leading-6">
                  <li>High-resolution image generation</li>
                  <li>Customizable style templates</li>
                  <li>Batch processing capabilities</li>
                  <li>AI-driven image enhancements</li>
                  <li className="opacity-50 line-through">Seamless cloud integration</li>
                  <li className="opacity-50 line-through">Real-time collaboration tools</li>
                </ul>
                <div className="mt-6">
                  <Button color="primary" block>
                    Subscribe
                  </Button>
                </div>
              </div>
            </Card>
          )}
        />

        <ExampleBlock
          title="Card Sizes"
          summary="展示 xs ~ xl 的基础示例，同时补上更贴近业务语境的说明文案。"
          tab={tabSizes}
          code={sizesCode}
          preview={() => (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card size="xs" className="bg-base-100 shadow-sm">
                <Card.Body>
                  <Card.Title>Xsmall Card</Card.Title>
                  <p className="text-sm leading-6 opacity-75">适合最紧凑的信息块。</p>
                </Card.Body>
              </Card>
              <Card size="sm" className="bg-base-100 shadow-sm">
                <Card.Body>
                  <Card.Title>Small Card</Card.Title>
                  <p className="text-sm leading-6 opacity-75">移动端列表卡片常用尺寸。</p>
                </Card.Body>
              </Card>
              <Card size="md" className="bg-base-100 shadow-sm">
                <Card.Body>
                  <Card.Title>Medium Card</Card.Title>
                  <p className="text-sm leading-6 opacity-75">默认信息层级。</p>
                </Card.Body>
              </Card>
              <Card size="lg" className="bg-base-100 shadow-sm">
                <Card.Body>
                  <Card.Title>Large Card</Card.Title>
                  <p className="text-sm leading-6 opacity-75">适合模块式运营位。</p>
                </Card.Body>
              </Card>
              <Card size="xl" className="bg-base-100 shadow-sm lg:col-span-2">
                <Card.Body>
                  <Card.Title>Xlarge Card</Card.Title>
                  <p className="text-sm leading-6 opacity-75">
                    适合宽幅内容摘要、品牌故事和大段说明。
                  </p>
                </Card.Body>
              </Card>
            </div>
          )}
        />

        <ExampleBlock
          title="内容组合"
          summary="展示 badge、纯内容卡片、顶部动作卡三种基础布局，并改成同一组内容编排能力展示。"
          tab={tabContent}
          code={contentCode}
          preview={() => (
            <div className="grid gap-6 xl:grid-cols-3">
              <Card
                className="overflow-hidden bg-base-100 shadow-sm"
                cover={<img src={shoeImage} alt="Shoes" />}
              >
                <Card.Body>
                  <Card.Title>
                    Card Title <Badge variant="secondary">NEW</Badge>
                  </Card.Title>
                  <p className="text-sm leading-6 opacity-75">
                    标题区可以直接承载状态徽标、分类标签和辅助描述。
                  </p>
                  <Card.Actions className="justify-end">
                    <Badge outline>Fashion</Badge>
                    <Badge outline>Products</Badge>
                  </Card.Actions>
                </Card.Body>
              </Card>

              <Card className="bg-base-100 shadow-sm">
                <Card.Body>
                  <Card.Title>Card title!</Card.Title>
                  <p className="text-sm leading-6 opacity-75">
                    没有图片时，Card 依然可以作为纯文字信息块，常用于说明、公告和短引导。
                  </p>
                  <Card.Actions className="justify-end">
                    <Button color="primary">Buy Now</Button>
                  </Card.Actions>
                </Card.Body>
              </Card>

              <Card className="bg-base-100 shadow-sm">
                <Card.Body>
                  <Card.Actions className="justify-end">
                    <Button shape="square" size="sm">
                      <CloseIcon />
                    </Button>
                  </Card.Actions>
                  <p className="text-sm leading-6 opacity-75">
                    把动作放在内容上方，适合轻提示、清单项和可关闭的局部提醒。
                  </p>
                </Card.Body>
              </Card>
            </div>
          )}
        />

        <ExampleBlock
          title="边框、颜色与层次"
          summary="展示 border、dash、品牌色、深色居中卡片等基础示例，同时补入 inner 变体。"
          tab={tabAppearance}
          code={appearanceCode}
          preview={() => (
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              <Card variant="outlined" className="bg-base-100">
                <Card.Body>
                  <Card.Title>Outlined</Card.Title>
                  <p className="text-sm leading-6 opacity-75">
                    组合描边信息卡，适合列表页和设置页。
                  </p>
                </Card.Body>
              </Card>
              <Card variant="dashed" className="bg-base-100">
                <Card.Body>
                  <Card.Title>Dashed</Card.Title>
                  <p className="text-sm leading-6 opacity-75">
                    更像引导态或占位态，用来提示下一步动作。
                  </p>
                </Card.Body>
              </Card>
              <Card className="bg-primary text-primary-content shadow-sm">
                <Card.Body>
                  <Card.Title>Brand Surface</Card.Title>
                  <p className="text-sm leading-6 opacity-90">展示基础的品牌色卡片用法。</p>
                  <Card.Actions className="justify-end">
                    <Button>Buy Now</Button>
                  </Card.Actions>
                </Card.Body>
              </Card>
              <Card className="bg-neutral text-neutral-content shadow-sm">
                <Card.Body className="items-center text-center">
                  <Card.Title>Cookies!</Card.Title>
                  <p className="text-sm leading-6 opacity-85">居中内容 + 反差表面适合提醒面板。</p>
                  <Card.Actions className="justify-end">
                    <Button color="primary">Accept</Button>
                    <Button type="text">Deny</Button>
                  </Card.Actions>
                </Card.Body>
              </Card>
              <Card type="inner" className="bg-base-100 shadow-sm lg:col-span-2 xl:col-span-1">
                <Card.Body>
                  <Card.Title>Inner</Card.Title>
                  <p className="text-sm leading-6 opacity-75">
                    inner 会切到更内嵌的底色和边框，适合把提示块、日志块或小型面板压进更大的容器里。
                  </p>
                </Card.Body>
              </Card>
            </div>
          )}
        />

        <ExampleBlock
          title="媒体布局"
          summary="展示顶部图片、底部图片、居中留白、图片覆盖四种媒体布局。"
          tab={tabMedia}
          code={mediaCode}
          preview={() => (
            <div className="grid gap-6 xl:grid-cols-2">
              <Card
                className="overflow-hidden bg-base-100 shadow-sm"
                cover={<img src={shoeImage} alt="Shoes" />}
              >
                <Card.Body>
                  <Card.Title>Card Title</Card.Title>
                  <p className="text-sm leading-6 opacity-75">最常见的顶部封面布局。</p>
                  <Card.Actions className="justify-end">
                    <Button color="primary">Buy Now</Button>
                  </Card.Actions>
                </Card.Body>
              </Card>

              <Card className="bg-base-100 shadow-sm">
                <Card.Body>
                  <Card.Title>Bottom Image</Card.Title>
                  <p className="text-sm leading-6 opacity-75">
                    把媒体放到内容之后，适合做故事卡片。
                  </p>
                </Card.Body>
                <figure>
                  <img src={shoeImage} alt="Shoes" />
                </figure>
              </Card>

              <Card className="bg-base-100 shadow-sm">
                <figure className="px-10 pt-10">
                  <img src={shoeImage} alt="Shoes" className="rounded-box" />
                </figure>
                <Card.Body className="items-center text-center">
                  <Card.Title>Centered Card</Card.Title>
                  <p className="text-sm leading-6 opacity-75">展示基础居中内容与额外留白的写法。</p>
                  <Card.Actions>
                    <Button color="primary">Buy Now</Button>
                  </Card.Actions>
                </Card.Body>
              </Card>

              <Card
                imageFull
                className="overflow-hidden bg-base-100 shadow-sm"
                cover={<img src={shoeImage} alt="Shoes" />}
              >
                <Card.Body>
                  <Card.Title>Image Overlay</Card.Title>
                  <p className="text-sm leading-6 opacity-90">
                    imageFull 让封面进入背景层，适合做大图氛围卡。
                  </p>
                  <Card.Actions className="justify-end">
                    <Button color="primary">Buy Now</Button>
                  </Card.Actions>
                </Card.Body>
              </Card>
            </div>
          )}
        />

        <ExampleBlock
          title="横向布局"
          summary="展示 side 和响应式横向布局两种基础示例，适合媒体摘要和推荐位。"
          tab={tabHorizontal}
          code={horizontalCode}
          preview={() => (
            <div className="grid gap-6 xl:grid-cols-2">
              <Card side className="overflow-hidden bg-base-100 shadow-sm">
                <figure>
                  <img src={movieImage} alt="Movie" />
                </figure>
                <Card.Body>
                  <Card.Title>New movie is released!</Card.Title>
                  <p className="text-sm leading-6 opacity-75">
                    Click the button to watch on Jetflix app.
                  </p>
                  <Card.Actions className="justify-end">
                    <Button color="primary">Watch</Button>
                  </Card.Actions>
                </Card.Body>
              </Card>

              <Card className="overflow-hidden bg-base-100 shadow-sm lg:card-side">
                <figure>
                  <img src={albumImage} alt="Album" />
                </figure>
                <Card.Body>
                  <Card.Title>New album is released!</Card.Title>
                  <p className="text-sm leading-6 opacity-75">
                    Click the button to listen on Spotiwhy app.
                  </p>
                  <Card.Actions className="justify-end">
                    <Button color="primary">Listen</Button>
                  </Card.Actions>
                </Card.Body>
              </Card>
            </div>
          )}
        />

        <div className="not-prose my-8 space-y-6">
          <div>
            <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># API</h2>
            <p className="m-0 text-sm opacity-70">
              Rue Card 现在同时支持“语义化根组件 API”和“低层复合子组件 API”。如果你已经习惯直接写
              daisyUI 结构，也仍然可以继续混用。
            </p>
          </div>

          <div>
            <h3 className="mt-0 mb-3 text-base font-semibold">Card</h3>
            <ApiTable rows={cardApiRows} />
          </div>

          <div>
            <h3 className="mt-0 mb-3 text-base font-semibold">Card.Meta</h3>
            <ApiTable rows={cardMetaRows} />
          </div>

          <div>
            <h3 className="mt-0 mb-3 text-base font-semibold">Card.Grid</h3>
            <ApiTable rows={cardGridRows} />
          </div>

          <div className="rounded-box border border-base-300 bg-base-100 p-5 text-sm leading-7">
            <div className="text-xs uppercase tracking-[0.18em] opacity-60">低层复合结构</div>
            <div className="mt-3 font-medium">
              Card.Body / Card.Title / Card.Actions / Card.Figure
            </div>
            <p className="mt-2 mb-0 opacity-75">
              这四个子组件保持和基础一样的职责：当你想完全接管布局顺序时，继续直接拼结构即可；当你只想快速生成头部、封面和操作区时，再切到根组件的语义化
              props。
            </p>
          </div>
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default CardDemo
