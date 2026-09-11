import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Pagination, Tabs } from '@rue-js/design'
type TabMode = 'preview' | 'code'

interface ExampleBlockProps {
  title: string
  summary?: string
  preview: () => any
  code: string
}

interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
}

const ExampleBlock: FC<ExampleBlockProps> = ({ title, summary, preview, code }) => {
  const tab = ref<TabMode>('preview')

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

const apiRows: ApiRow[] = [
  {
    prop: 'current / defaultCurrent',
    description: '受控或非受控的当前页码。',
    type: 'number',
    defaultValue: '1',
  },
  {
    prop: 'total',
    description: '数据总条数；传入后自动计算页码按钮。',
    type: 'number',
    defaultValue: '0',
  },
  {
    prop: 'pageSize / defaultPageSize',
    description: '每页条数，配合 total 共同决定总页数。',
    type: 'number',
    defaultValue: '10',
  },
  {
    prop: 'simple',
    description: '切换为简洁模式；可传 { readOnly: true } 关闭中间输入。',
    type: 'boolean | { readOnly?: boolean }',
    defaultValue: 'false',
  },
  {
    prop: 'showSizeChanger / pageSizeOptions',
    description: '展示每页条数切换，并自定义可选项。',
    type: 'boolean / Array<number | string>',
    defaultValue: 'false / [10, 20, 50, 100]',
  },
  {
    prop: 'showQuickJumper',
    description: '展示快速跳页输入框；可传 { goButton } 自定义确认按钮。',
    type: 'boolean | { goButton?: any }',
    defaultValue: 'false',
  },
  {
    prop: 'showTotal',
    description: '自定义总数与区间文案。',
    type: '(total: number, range: [number, number]) => any',
    defaultValue: '-',
  },
  {
    prop: 'itemRender',
    description: '自定义页码、上一页、下一页、跳转项的渲染内容。',
    type: "(page: number, type: 'page' | 'prev' | 'next' | 'jump-prev' | 'jump-next', original: any) => any",
    defaultValue: '-',
  },
  {
    prop: 'align / size / disabled',
    description: '控制对齐、尺寸和禁用态。',
    type: "'start' | 'center' | 'end' / 'xs' | 'sm' | 'md' | 'lg' | 'xl' / boolean",
    defaultValue: "'start' / 'md' / false",
  },
  {
    prop: 'showLessItems / hideOnSinglePage',
    description: '控制页码折叠密度，以及单页时是否隐藏。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'onChange / onShowSizeChange',
    description: '页码变化、每页条数变化时的回调。',
    type: '(page: number, pageSize: number) => void',
    defaultValue: '-',
  },
]

const PaginationPage: FC = () => {
  const drivenPrimaryPage = ref(2)
  const drivenSecondaryPage = ref(6)
  const controlledPage = ref(4)
  const controlledPageSize = ref(10)
  const simplePage = ref(2)
  const simpleReadonlyPage = ref(2)
  const advancedPage = ref(3)
  const advancedPageSize = ref(20)
  const advancedCompactPage = ref(3)
  const advancedCompactPageSize = ref(10)
  const customPage = ref(6)

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Pagination 分页</h1>
        <p className="text-sm mt-3 mb-3">
          Pagination 现在同时支持两类用法：展示基础的静态组合模式，以及更贴近业务组件习惯的
          的数据驱动模式。 视觉仍基于 Rue 当前的 join 与 btn
          体系，但提供了页码计算、受控/非受控、简单模式、页容量切换、快捷跳转和自定义渲染。
        </p>

        <h2>何时使用</h2>
        <ul>
          <li>需要使用 Rue 当前 join + btn 分页视觉，但希望组件自己计算页码与跳转逻辑。</li>
          <li>需要受控/非受控分页、简单模式、页容量切换、快捷跳页等更完整的交互能力。</li>
          <li>需要在静态拼装和数据驱动两种模式间切换，并逐步重组用法。</li>
        </ul>

        <h2 className="mt-8">静态组合模式</h2>
        <p className="text-sm opacity-80">
          适合完全自定义节点结构的场景。以下示例展示基础 compound 用法，只补充说明与可复制代码。
        </p>

        <ExampleBlock
          title="Basic pagination"
          summary="最基础的静态拼装方式，适合完全由业务侧决定按钮内容和顺序。"
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <Pagination className="w-fit" data-testid="pagination-basic">
                  <Pagination.Item aria-label="Previous page">«</Pagination.Item>
                  <Pagination.Item>1</Pagination.Item>
                  <Pagination.Item>2</Pagination.Item>
                  <Pagination.Item>3</Pagination.Item>
                  <Pagination.Item aria-label="Next page">»</Pagination.Item>
                </Pagination>
              </div>
            </div>
          )}
          code={`<Pagination className="w-fit">
  <Pagination.Item aria-label="Previous page">«</Pagination.Item>
  <Pagination.Item>1</Pagination.Item>
  <Pagination.Item>2</Pagination.Item>
  <Pagination.Item>3</Pagination.Item>
  <Pagination.Item aria-label="Next page">»</Pagination.Item>
</Pagination>`}
        />

        <ExampleBlock
          title="Vertical pagination"
          summary="使用 `direction='vertical'`，适合侧栏步骤、目录或分段导航。"
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <Pagination
                  direction="vertical"
                  className="w-fit"
                  data-testid="pagination-vertical"
                >
                  <Pagination.Item>Overview</Pagination.Item>
                  <Pagination.Item>Updates</Pagination.Item>
                  <Pagination.Item>Logs</Pagination.Item>
                </Pagination>
              </div>
            </div>
          )}
          code={`<Pagination direction="vertical" className="w-fit">
  <Pagination.Item>Overview</Pagination.Item>
  <Pagination.Item>Updates</Pagination.Item>
  <Pagination.Item>Logs</Pagination.Item>
</Pagination>`}
        />

        <ExampleBlock
          title="Current and disabled items"
          summary="静态模式下仍可通过 `active`、`disabled` 和 `tag='a'` 控制语义与状态。"
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body">
                <Pagination className="w-fit" data-testid="pagination-stateful">
                  <Pagination.Item disabled>Prev</Pagination.Item>
                  <Pagination.Item>1</Pagination.Item>
                  <Pagination.Item active>2</Pagination.Item>
                  <Pagination.Item>3</Pagination.Item>
                  <Pagination.Item tag="a" href="#next">
                    Next
                  </Pagination.Item>
                </Pagination>
              </div>
            </div>
          )}
          code={`<Pagination className="w-fit">
  <Pagination.Item disabled>Prev</Pagination.Item>
  <Pagination.Item>1</Pagination.Item>
  <Pagination.Item active>2</Pagination.Item>
  <Pagination.Item>3</Pagination.Item>
  <Pagination.Item tag="a" href="#next">Next</Pagination.Item>
</Pagination>`}
        />

        <ExampleBlock
          title="Data driven basic"
          summary="传入 `total` 后由组件自动计算页码；这里改成受控形态，便于在设计页直接切换和观察当前页变化。"
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <Pagination
                  current={drivenPrimaryPage.value}
                  total={120}
                  showTotal={(total, range) => `${range[0]}-${range[1]} / ${total}`}
                  onChange={page => {
                    drivenPrimaryPage.value = page
                  }}
                />
                <Pagination
                  current={drivenSecondaryPage.value}
                  total={500}
                  size="sm"
                  align="center"
                  onChange={page => {
                    drivenSecondaryPage.value = page
                  }}
                />
                <div className="text-sm opacity-70">
                  当前示例页码：默认尺寸第 {drivenPrimaryPage.value} 页，小尺寸第{' '}
                  {drivenSecondaryPage.value} 页
                </div>
              </div>
            </div>
          )}
          code={`const primaryPage = ref(2)
const secondaryPage = ref(6)

<>
  <Pagination
    current={primaryPage.value}
    total={120}
    showTotal={(total, range) => \`\${range[0]}-\${range[1]} / \${total}\`}
    onChange={page => {
      primaryPage.value = page
    }}
  />

  <Pagination
    current={secondaryPage.value}
    total={500}
    size="sm"
    align="center"
    onChange={page => {
      secondaryPage.value = page
    }}
  />
</>`}
        />

        <ExampleBlock
          title="Controlled pagination"
          summary="通过 `current` 与 `pageSize` 接管状态，适合和表格、请求参数或 URL 查询同步。"
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <Pagination
                  current={controlledPage.value}
                  pageSize={controlledPageSize.value}
                  total={185}
                  showSizeChanger
                  showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
                  onChange={(page, nextPageSize) => {
                    controlledPage.value = page
                    controlledPageSize.value = nextPageSize
                  }}
                  onShowSizeChange={(page, nextPageSize) => {
                    controlledPage.value = page
                    controlledPageSize.value = nextPageSize
                  }}
                />
                <div className="text-sm opacity-70">
                  当前第 {controlledPage.value} 页，每页 {controlledPageSize.value} 条
                </div>
              </div>
            </div>
          )}
          code={`const current = ref(4)
const pageSize = ref(10)

<Pagination
  current={current.value}
  pageSize={pageSize.value}
  total={185}
  showSizeChanger
  showTotal={(total, range) => \`\${range[0]}-\${range[1]} of \${total} items\`}
  onChange={(page, nextPageSize) => {
    current.value = page
    pageSize.value = nextPageSize
  }}
  onShowSizeChange={(page, nextPageSize) => {
    current.value = page
    pageSize.value = nextPageSize
  }}
/>`}
        />

        <ExampleBlock
          title="Simple mode"
          summary="简洁模式只保持上一页、页码输入和下一页，适合空间紧张的工具栏。"
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <Pagination
                  simple
                  current={simplePage.value}
                  total={50}
                  onChange={page => {
                    simplePage.value = page
                  }}
                />
                <Pagination
                  simple={{ readOnly: true }}
                  current={simpleReadonlyPage.value}
                  total={50}
                  onChange={page => {
                    simpleReadonlyPage.value = page
                  }}
                />
                <Pagination simple total={50} defaultCurrent={2} disabled />
                <div className="text-sm opacity-70">
                  当前示例页码：可输入第 {simplePage.value} 页，只读第 {simpleReadonlyPage.value} 页
                </div>
              </div>
            </div>
          )}
          code={`const simplePage = ref(2)
const simpleReadonlyPage = ref(2)

<>
  <Pagination
    simple
    current={simplePage.value}
    total={50}
    onChange={page => {
      simplePage.value = page
    }}
  />
  <Pagination
    simple={{ readOnly: true }}
    current={simpleReadonlyPage.value}
    total={50}
    onChange={page => {
      simpleReadonlyPage.value = page
    }}
  />
  <Pagination simple total={50} defaultCurrent={2} disabled />
</>`}
        />

        <ExampleBlock
          title="Page size and quick jumper"
          summary="页容量切换与快捷跳页现在默认更紧凑，页数较少时输入框不会显得过宽。"
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <Pagination
                  current={advancedPage.value}
                  pageSize={advancedPageSize.value}
                  total={120}
                  showSizeChanger
                  pageSizeOptions={[10, 20, 50]}
                  showQuickJumper={{ goButton: 'Go' }}
                  showTotal={(total, range) => `${range[0]}-${range[1]} / ${total}`}
                  onChange={(page, nextPageSize) => {
                    advancedPage.value = page
                    advancedPageSize.value = nextPageSize
                  }}
                  onShowSizeChange={(page, nextPageSize) => {
                    advancedPage.value = page
                    advancedPageSize.value = nextPageSize
                  }}
                />
                <Pagination
                  current={advancedCompactPage.value}
                  pageSize={advancedCompactPageSize.value}
                  total={500}
                  size="sm"
                  showSizeChanger
                  showQuickJumper
                  align="end"
                  onChange={(page, nextPageSize) => {
                    advancedCompactPage.value = page
                    advancedCompactPageSize.value = nextPageSize
                  }}
                  onShowSizeChange={(page, nextPageSize) => {
                    advancedCompactPage.value = page
                    advancedCompactPageSize.value = nextPageSize
                  }}
                />
                <div className="text-sm opacity-70">
                  紧凑版当前第 {advancedCompactPage.value} 页，每页 {advancedCompactPageSize.value}{' '}
                  条
                </div>
              </div>
            </div>
          )}
          code={`const current = ref(3)
const pageSize = ref(20)
const compactPage = ref(3)
const compactPageSize = ref(10)

<>
  <Pagination
    current={current.value}
    pageSize={pageSize.value}
    total={120}
    showSizeChanger
    pageSizeOptions={[10, 20, 50]}
    showQuickJumper={{ goButton: 'Go' }}
    showTotal={(total, range) => \`\${range[0]}-\${range[1]} / \${total}\`}
    onChange={(page, nextPageSize) => {
      current.value = page
      pageSize.value = nextPageSize
    }}
    onShowSizeChange={(page, nextPageSize) => {
      current.value = page
      pageSize.value = nextPageSize
    }}
  />

  <Pagination
    current={compactPage.value}
    pageSize={compactPageSize.value}
    total={500}
    size="sm"
    showSizeChanger
    showQuickJumper
    align="end"
    onChange={(page, nextPageSize) => {
      compactPage.value = page
      compactPageSize.value = nextPageSize
    }}
    onShowSizeChange={(page, nextPageSize) => {
      compactPage.value = page
      compactPageSize.value = nextPageSize
    }}
  />
</>`}
        />

        <ExampleBlock
          title="Custom item render"
          summary="通过 `itemRender` 重写上一页、下一页或跳转项文本，保持默认交互逻辑。"
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-4">
                <Pagination
                  current={customPage.value}
                  total={500}
                  showLessItems
                  onChange={page => {
                    customPage.value = page
                  }}
                  itemRender={(_, type, original) => {
                    if (type === 'prev') {
                      return <span className="font-medium">Previous</span>
                    }
                    if (type === 'next') {
                      return <span className="font-medium">Next</span>
                    }
                    return original
                  }}
                />
                <Pagination total={8} defaultCurrent={1} hideOnSinglePage />
                <div className="text-sm opacity-70">
                  自定义文案示例当前位于第 {customPage.value} 页
                </div>
              </div>
            </div>
          )}
          code={`const current = ref(6)

<Pagination
  current={current.value}
  total={500}
  showLessItems
  onChange={page => {
    current.value = page
  }}
  itemRender={(_, type, original) => {
    if (type === 'prev') {
      return <span className="font-medium">Previous</span>
    }
    if (type === 'next') {
      return <span className="font-medium">Next</span>
    }
    return original
  }}
/>

<Pagination total={8} defaultCurrent={1} hideOnSinglePage />`}
        />

        <h2 id="pagination-api">API</h2>
        <ApiTable rows={apiRows} />

        <h2>FAQ</h2>
        <div className="space-y-4 text-sm leading-6">
          <div>
            <h3 className="mb-1 text-base font-semibold">
              什么时候用静态组合，什么时候用数据驱动？
            </h3>
            <p className="m-0 opacity-80">
              当按钮结构、文案和链接完全由业务自定义时，用 `Pagination.Item`
              静态组合更直接；只要你已经有 `total`、`current`、`pageSize`
              这些分页信息，优先使用数据驱动模式，省去页码计算与边界处理。
            </p>
          </div>
          <div>
            <h3 className="mb-1 text-base font-semibold">`simple` 适合什么场景？</h3>
            <p className="m-0 opacity-80">
              `simple`
              适合工具栏、卡片头部、移动端等横向空间有限的区域；如果只想展示当前页而不允许直接输入，
              可以传 <code>{'simple={{ readOnly: true }}'}</code>。
            </p>
          </div>
          <div>
            <h3 className="mb-1 text-base font-semibold">切换每页条数时会触发哪些回调？</h3>
            <p className="m-0 opacity-80">
              `onShowSizeChange` 专门用于处理页容量变更；为了保持外部状态同步，`onChange`
              也会收到新的页码和 `pageSize`，所以受控场景通常同时支持这两个回调。
            </p>
          </div>
          <div>
            <h3 className="mb-1 text-base font-semibold">如何把上一页、下一页改成业务文案？</h3>
            <p className="m-0 opacity-80">
              轻量替换可以用 `itemRender` 改写 `prev`、`next`、`jump-prev`、`jump-next`
              的内容；如果还要替换 aria/title 文案，可以传 `locale`。
            </p>
          </div>
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default PaginationPage
