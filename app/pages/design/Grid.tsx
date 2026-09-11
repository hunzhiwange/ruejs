import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Badge, Button, Card, Grid, Tabs } from '@rue-js/design'
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

const GridCell: FC<{
  title: string
  detail?: string
  tag?: string
  className?: string
}> = ({ title, detail, tag, className }) => {
  return (
    <div
      className={`rounded-[1.25rem] border border-base-300/70 bg-gradient-to-br from-base-100 via-base-100 to-base-200/80 p-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.55)] ${className ?? ''}`.trim()}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold leading-6">{title}</div>
          {detail ? <div className="mt-1 text-xs leading-5 opacity-70">{detail}</div> : null}
        </div>
        {tag ? <Badge outline>{tag}</Badge> : null}
      </div>
    </div>
  )
}

const rowApiRows: ApiRow[] = [
  {
    prop: 'gutter',
    description: '栅格间距，支持单值、[水平, 垂直]，以及按断点配置的对象写法',
    type: 'number | string | ResponsiveValue | [ResponsiveValue, ResponsiveValue]',
    defaultValue: '-',
  },
  {
    prop: 'justify',
    description: '主轴对齐方式，覆盖常见的 start / center / end / evenly 语义',
    type: "'start' | 'end' | 'center' | 'space-around' | 'space-between' | 'space-evenly'",
    defaultValue: 'start',
  },
  {
    prop: 'align',
    description: '交叉轴对齐方式',
    type: "'top' | 'middle' | 'bottom' | 'stretch'",
    defaultValue: 'top',
  },
  {
    prop: 'wrap',
    description: '是否允许自动换行',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    prop: 'className / style',
    description: '根节点样式扩展，使用 Rue 一贯的 class 直连能力',
    type: 'string / Record<string, any>',
    defaultValue: '-',
  },
]

const colApiRows: ApiRow[] = [
  {
    prop: 'span',
    description: '24 栅格占位数，0 表示隐藏当前列',
    type: 'number',
    defaultValue: '-',
  },
  {
    prop: 'offset',
    description: '在当前列左侧追加空白栅格',
    type: 'number',
    defaultValue: '0',
  },
  {
    prop: 'order',
    description: '通过 flex order 调整显示顺序',
    type: 'number',
    defaultValue: '-',
  },
  {
    prop: 'push / pull',
    description: '相对当前列原位向右或向左推移指定栅格数',
    type: 'number',
    defaultValue: '0',
  },
  {
    prop: 'flex',
    description: '支持 number、固定宽度字符串、auto 和 none，用于混合弹性布局',
    type: 'number | string',
    defaultValue: '-',
  },
  {
    prop: 'xs ~ xxl',
    description:
      '断点覆盖，支持直接传 span 数值，或传入包含 span / order / offset / push / pull / flex 的对象',
    type: 'number | { span?: number; order?: number; offset?: number; push?: number; pull?: number; flex?: number | string }',
    defaultValue: '-',
  },
  {
    prop: 'className / style',
    description: '列节点样式扩展',
    type: 'string / Record<string, any>',
    defaultValue: '-',
  },
]

const _breakpointObjectCode = `xs={{ span: 24 }}
md={{ span: 12, order: 2 }}
xl={{ span: 8, flex: '280px' }}`

const basicCode = `import { Grid } from '@rue-js/design'<Grid gutter={[16, 16]}>
  <Grid.Col span={6}>span=6</Grid.Col>
  <Grid.Col span={6}>span=6</Grid.Col>
  <Grid.Col span={6}>span=6</Grid.Col>
  <Grid.Col span={6}>span=6</Grid.Col>
</Grid>

<Grid gutter={[16, 16]}>
  <Grid.Col span={8}>span=8</Grid.Col>
  <Grid.Col span={8}>span=8</Grid.Col>
  <Grid.Col span={8}>span=8</Grid.Col>
</Grid>`

const responsiveCode = `import { Grid } from '@rue-js/design'<Grid gutter={[{ xs: 8, md: 24 }, { xs: 8, md: 24 }]}>
  <Grid.Col xs={24} sm={12} lg={8}>A</Grid.Col>
  <Grid.Col xs={24} sm={12} lg={8}>B</Grid.Col>
  <Grid.Col xs={24} lg={8}>C</Grid.Col>
</Grid>`

const alignmentCode = `import { Grid } from '@rue-js/design'<Grid gutter={[16, 16]} justify="space-between" align="bottom">
  <Grid.Col span={5}>A</Grid.Col>
  <Grid.Col span={5}>B</Grid.Col>
  <Grid.Col span={5}>C</Grid.Col>
</Grid>

<Grid gutter={[16, 16]}>
  <Grid.Col span={6} offset={6}>offset=6</Grid.Col>
  <Grid.Col span={6} order={3}>order=3</Grid.Col>
  <Grid.Col span={6} order={2}>order=2</Grid.Col>
</Grid>`

const flexCode = `import { Grid } from '@rue-js/design'<Grid gutter={16} align="stretch">
  <Grid.Col flex="280px">Fixed rail</Grid.Col>
  <Grid.Col flex="auto">Fluid content</Grid.Col>
  <Grid.Col flex="120px">Ops</Grid.Col>
</Grid>

<Grid gutter={12} wrap={false}>
  <Grid.Col flex="180px">No wrap</Grid.Col>
  <Grid.Col flex="180px">For horizontal rails</Grid.Col>
  <Grid.Col flex="180px">And sticky toolbars</Grid.Col>
</Grid>`

const dashboardCode = `import { Badge, Button, Card, Grid } from '@rue-js/design'<Grid gutter={[20, 20]}>
  <Grid.Col xs={24} xl={16}>
    <Card className="overflow-hidden bg-base-100 shadow-sm">
      <Card.Body className="gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Growth cockpit</div>
            <div className="mt-1 text-sm opacity-70">一块主画布里继续嵌套 Grid，拆出指标和趋势卡。</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge outline>Live</Badge>
            <Badge outline>Q2</Badge>
          </div>
        </div>

        <Grid gutter={[16, 16]}>
          <Grid.Col xs={24} md={12}>
            <div className="rounded-[1.25rem] border border-base-300/70 bg-gradient-to-br from-primary/10 via-base-100 to-base-200 p-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.55)] h-full">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold leading-6">GMV</div>
                  <div className="mt-1 text-xs leading-5 opacity-70">¥ 4,230,000</div>
                </div>
                <Badge outline>+18%</Badge>
              </div>
            </div>
          </Grid.Col>
          <Grid.Col xs={24} md={12}>
            <div className="rounded-[1.25rem] border border-base-300/70 bg-gradient-to-br from-success/10 via-base-100 to-base-200 p-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.55)] h-full">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold leading-6">Retention</div>
                  <div className="mt-1 text-xs leading-5 opacity-70">71.4%</div>
                </div>
                <Badge outline>+4.8pt</Badge>
              </div>
            </div>
          </Grid.Col>
          <Grid.Col xs={24}>
            <div className="rounded-[1.25rem] border border-base-300/70 bg-gradient-to-br from-base-100 via-base-100 to-base-200/80 p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.55)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Campaign timeline</div>
                  <div className="mt-1 text-xs leading-5 opacity-70">用整行展示跨模块趋势和长内容。</div>
                </div>
                <Button color="primary" size="sm">查看明细</Button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-box bg-base-200/70 p-4 text-sm">启动 6 个投放实验</div>
                <div className="rounded-box bg-base-200/70 p-4 text-sm">完成落地页 AB 版本替换</div>
                <div className="rounded-box bg-base-200/70 p-4 text-sm">同步 CRM 标签到投放人群</div>
              </div>
            </div>
          </Grid.Col>
        </Grid>
      </Card.Body>
    </Card>
  </Grid.Col>
  <Grid.Col xs={24} xl={8}>
    <Card className="bg-base-100 shadow-sm">
      <Card.Body className="gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Ops queue</div>
            <div className="mt-1 text-xs opacity-70">右侧侧栏保持更紧凑的信息节奏。</div>
          </div>
          <Badge outline>7 items</Badge>
        </div>
        <div className="space-y-3">
          <div className="rounded-[1.25rem] border border-base-300/70 bg-gradient-to-br from-warning/10 via-base-100 to-base-200 p-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.55)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold leading-6">素材审批</div>
                <div className="mt-1 text-xs leading-5 opacity-70">还剩 2 项待确认</div>
              </div>
              <Badge outline>Today</Badge>
            </div>
          </div>
          <div className="rounded-[1.25rem] border border-base-300/70 bg-gradient-to-br from-info/10 via-base-100 to-base-200 p-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.55)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold leading-6">会员分层</div>
                <div className="mt-1 text-xs leading-5 opacity-70">等待 CRM 回传标签</div>
              </div>
              <Badge outline>Sync</Badge>
            </div>
          </div>
          <div className="rounded-[1.25rem] border border-base-300/70 bg-gradient-to-br from-secondary/10 via-base-100 to-base-200 p-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.55)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold leading-6">报表快照</div>
                <div className="mt-1 text-xs leading-5 opacity-70">18:00 自动归档</div>
              </div>
              <Badge outline>Auto</Badge>
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  </Grid.Col>
</Grid>`

const GridDemo: FC = () => {
  const tabBasic = ref<TabMode>('preview')
  const tabResponsive = ref<TabMode>('preview')
  const tabAlignment = ref<TabMode>('preview')
  const tabFlex = ref<TabMode>('preview')
  const tabDashboard = ref<TabMode>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Grid 栅格</h1>
        <p className="mt-3 mb-3 text-sm">
          Grid 提供接近成熟组件库的 24 栅格 API，用来组织页面骨架、卡片矩阵和左右混排布局。
        </p>
        <p className="my-3 text-sm opacity-75">
          视觉上使用 Rue 当前的轻量表面体系，能力覆盖 Row / Col、响应式断点、gutter、偏移、 顺序和
          flex 混排。
        </p>

        <div className="not-prose mt-4 flex flex-wrap gap-2">
          <Badge outline>24 Columns</Badge>
          <Badge outline>Responsive</Badge>
          <Badge outline>Offset & Order</Badge>
          <Badge outline>Flex Mix</Badge>
        </div>

        <ExampleBlock
          title="基础 24 栅格"
          summary="先用最直接的 span 心智搭建信息密度，再往上叠加响应式与语义卡片。"
          tab={tabBasic}
          code={basicCode}
          preview={() => (
            <div className="space-y-5">
              <Card className="overflow-hidden bg-base-100 shadow-sm">
                <Card.Body className="gap-4">
                  <Grid gutter={[16, 16]}>
                    <Grid.Col span={6}>
                      <GridCell title="span 6" detail="季度销售" tag="25%" />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <GridCell
                        title="span 6"
                        detail="新增用户"
                        tag="25%"
                        className="from-info/8 to-base-100"
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <GridCell
                        title="span 6"
                        detail="留存趋势"
                        tag="25%"
                        className="from-success/8 to-base-100"
                      />
                    </Grid.Col>
                    <Grid.Col span={6}>
                      <GridCell
                        title="span 6"
                        detail="投放效率"
                        tag="25%"
                        className="from-warning/10 to-base-100"
                      />
                    </Grid.Col>
                  </Grid>
                </Card.Body>
              </Card>

              <Grid gutter={[16, 16]}>
                <Grid.Col span={8}>
                  <GridCell title="span 8" detail="三栏内容区" tag="33%" />
                </Grid.Col>
                <Grid.Col span={8}>
                  <GridCell
                    title="span 8"
                    detail="更适合导航+内容+侧栏"
                    tag="33%"
                    className="from-primary/8 to-base-100"
                  />
                </Grid.Col>
                <Grid.Col span={8}>
                  <GridCell
                    title="span 8"
                    detail="与 Card、Stat 组合最常用"
                    tag="33%"
                    className="from-secondary/8 to-base-100"
                  />
                </Grid.Col>
              </Grid>
            </div>
          )}
        />

        <ExampleBlock
          title="响应式 gutter 与断点覆盖"
          summary="gutter 可以按断点变化，Col 也可以在 xs~xxl 分别覆盖 span 和布局参数。"
          tab={tabResponsive}
          code={responsiveCode}
          preview={() => (
            <div className="space-y-4">
              <div className="not-prose rounded-[1.5rem] border border-dashed border-base-300 bg-base-100/80 p-4 text-sm opacity-75">
                缩放窗口时，这组三列会从一列堆叠，逐步过渡到两列和三列，同时间距从紧凑切到宽松。
              </div>
              <Grid
                gutter={[
                  { xs: 8, md: 24 },
                  { xs: 8, md: 24 },
                ]}
              >
                <Grid.Col xs={24} sm={12} lg={8}>
                  <GridCell
                    title="Hero 模块"
                    detail="xs=24, sm=12, lg=8"
                    tag="adaptive"
                    className="from-primary/10 via-base-100 to-base-200"
                  />
                </Grid.Col>
                <Grid.Col xs={24} sm={12} lg={8}>
                  <GridCell
                    title="Insights"
                    detail="xs=24, sm=12, lg=8"
                    tag="adaptive"
                    className="from-info/10 via-base-100 to-base-200"
                  />
                </Grid.Col>
                <Grid.Col xs={24} lg={8}>
                  <GridCell
                    title="Ops Panel"
                    detail="xs=24, lg=8"
                    tag="adaptive"
                    className="from-success/10 via-base-100 to-base-200"
                  />
                </Grid.Col>
              </Grid>
            </div>
          )}
        />

        <ExampleBlock
          title="对齐、偏移与顺序"
          summary="同一套 Grid 既能做规则矩阵，也能做营销位或时间线这种非对称排布。"
          tab={tabAlignment}
          code={alignmentCode}
          preview={() => (
            <div className="space-y-6">
              <Card className="bg-base-100 shadow-sm">
                <Card.Body className="gap-4">
                  <Grid gutter={[16, 16]} justify="space-between" align="bottom">
                    <Grid.Col span={5}>
                      <GridCell title="Top" detail="高度较小" tag="A" className="h-28" />
                    </Grid.Col>
                    <Grid.Col span={5}>
                      <GridCell
                        title="Middle"
                        detail="通过 align=bottom 对齐底边"
                        tag="B"
                        className="h-40 from-warning/10 to-base-100"
                      />
                    </Grid.Col>
                    <Grid.Col span={5}>
                      <GridCell
                        title="Bottom"
                        detail="适合比较型面板"
                        tag="C"
                        className="h-32 from-secondary/8 to-base-100"
                      />
                    </Grid.Col>
                  </Grid>
                </Card.Body>
              </Card>

              <Grid gutter={[16, 16]}>
                <Grid.Col span={6} offset={6}>
                  <GridCell title="offset 6" detail="给主内容留白" tag="offset" />
                </Grid.Col>
                <Grid.Col span={6} order={3}>
                  <GridCell
                    title="order 3"
                    detail="视觉顺序后移"
                    tag="order"
                    className="from-info/8 to-base-100"
                  />
                </Grid.Col>
                <Grid.Col span={6} order={2}>
                  <GridCell
                    title="order 2"
                    detail="视觉顺序前置"
                    tag="order"
                    className="from-success/8 to-base-100"
                  />
                </Grid.Col>
              </Grid>
            </div>
          )}
        />

        <ExampleBlock
          title="Flex 混排与不换行轨道"
          summary="当 24 栅格不足以表达固定边栏 + 弹性主内容时，直接切到 flex 语义。"
          tab={tabFlex}
          code={flexCode}
          preview={() => (
            <div className="space-y-6">
              <Grid gutter={16} align="stretch">
                <Grid.Col flex="280px">
                  <GridCell
                    title="Fixed rail"
                    detail="280px 固定宽度，适合过滤器与导航"
                    tag="280px"
                    className="h-full from-base-200 to-base-100"
                  />
                </Grid.Col>
                <Grid.Col flex="auto">
                  <GridCell
                    title="Fluid canvas"
                    detail="auto 吃掉剩余空间，适合主编辑区"
                    tag="auto"
                    className="h-full from-primary/8 to-base-100"
                  />
                </Grid.Col>
                <Grid.Col flex="120px">
                  <GridCell
                    title="Ops"
                    detail="固定操作条"
                    tag="120px"
                    className="h-full from-warning/10 to-base-100"
                  />
                </Grid.Col>
              </Grid>

              <Grid gutter={12} wrap={false}>
                <Grid.Col flex="180px">
                  <GridCell title="No wrap" detail="水平工具带" tag="rail" />
                </Grid.Col>
                <Grid.Col flex="180px">
                  <GridCell
                    title="Keep inline"
                    detail="不允许自动换行"
                    tag="rail"
                    className="from-info/8 to-base-100"
                  />
                </Grid.Col>
                <Grid.Col flex="180px">
                  <GridCell
                    title="Sticky group"
                    detail="适合顶部命令条"
                    tag="rail"
                    className="from-secondary/8 to-base-100"
                  />
                </Grid.Col>
              </Grid>
            </div>
          )}
        />

        <ExampleBlock
          title="仪表盘实战布局"
          summary="Grid 不是只用来排彩色方块，更适合和 Card、Badge、Button 组合成真实页面骨架。"
          tab={tabDashboard}
          code={dashboardCode}
          preview={() => (
            <Grid gutter={[20, 20]}>
              <Grid.Col xs={24} xl={16}>
                <Card className="overflow-hidden bg-base-100 shadow-sm">
                  <Card.Body className="gap-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">Growth cockpit</div>
                        <div className="mt-1 text-sm opacity-70">
                          一块主画布里继续嵌套 Grid，拆出指标和趋势卡。
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge outline>Live</Badge>
                        <Badge outline>Q2</Badge>
                      </div>
                    </div>

                    <Grid gutter={[16, 16]}>
                      <Grid.Col xs={24} md={12}>
                        <GridCell
                          title="GMV"
                          detail="¥ 4,230,000"
                          tag="+18%"
                          className="from-primary/10 via-base-100 to-base-200 h-full"
                        />
                      </Grid.Col>
                      <Grid.Col xs={24} md={12}>
                        <GridCell
                          title="Retention"
                          detail="71.4%"
                          tag="+4.8pt"
                          className="from-success/10 via-base-100 to-base-200 h-full"
                        />
                      </Grid.Col>
                      <Grid.Col xs={24}>
                        <div className="rounded-[1.25rem] border border-base-300/70 bg-gradient-to-br from-base-100 via-base-100 to-base-200/80 p-5 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.55)]">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold">Campaign timeline</div>
                              <div className="mt-1 text-xs leading-5 opacity-70">
                                用整行展示跨模块趋势和长内容。
                              </div>
                            </div>
                            <Button color="primary" size="sm">
                              查看明细
                            </Button>
                          </div>
                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <div className="rounded-box bg-base-200/70 p-4 text-sm">
                              启动 6 个投放实验
                            </div>
                            <div className="rounded-box bg-base-200/70 p-4 text-sm">
                              完成落地页 AB 版本替换
                            </div>
                            <div className="rounded-box bg-base-200/70 p-4 text-sm">
                              同步 CRM 标签到投放人群
                            </div>
                          </div>
                        </div>
                      </Grid.Col>
                    </Grid>
                  </Card.Body>
                </Card>
              </Grid.Col>

              <Grid.Col xs={24} xl={8}>
                <Card className="bg-base-100 shadow-sm">
                  <Card.Body className="gap-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">Ops queue</div>
                        <div className="mt-1 text-xs opacity-70">
                          右侧侧栏保持更紧凑的信息节奏。
                        </div>
                      </div>
                      <Badge outline>7 items</Badge>
                    </div>
                    <div className="space-y-3">
                      <GridCell
                        title="素材审批"
                        detail="还剩 2 项待确认"
                        tag="Today"
                        className="from-warning/10 to-base-100"
                      />
                      <GridCell
                        title="会员分层"
                        detail="等待 CRM 回传标签"
                        tag="Sync"
                        className="from-info/10 to-base-100"
                      />
                      <GridCell
                        title="报表快照"
                        detail="18:00 自动归档"
                        tag="Auto"
                        className="from-secondary/10 to-base-100"
                      />
                    </div>
                  </Card.Body>
                </Card>
              </Grid.Col>
            </Grid>
          )}
        />

        <div className="component-preview not-prose text-base-content my-8 lg:my-12">
          <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># API</h2>
          <p className="m-0 text-sm opacity-70">
            默认导出的 Grid 可直接当作 Row 使用，也可以通过 Grid.Row / Grid.Col 显式书写。
          </p>
        </div>

        <div className="not-prose space-y-8">
          <div>
            <h3 className="mb-3 text-base font-semibold">Grid / Grid.Row</h3>
            <ApiTable rows={rowApiRows} />
          </div>
          <div>
            <h3 className="mb-3 text-base font-semibold">Grid.Col</h3>
            <ApiTable rows={colApiRows} />
          </div>
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default GridDemo
