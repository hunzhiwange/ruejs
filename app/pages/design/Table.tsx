import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import { Table, Tabs } from '@rue-js/design'
type TabMode = 'preview' | 'code'
type ControlledSortOrder = 'ascend' | 'descend' | null
type ActiveSortOrder = Exclude<ControlledSortOrder, null>
type ControlledSortColumnKey = 'name' | 'age' | 'address'
type MultiSortColumnKey = 'chinese' | 'math' | 'english'
type MultiSortOrderMap = Partial<Record<MultiSortColumnKey, ActiveSortOrder>>

interface ControlledSorterState {
  columnKey: ControlledSortColumnKey | null
  order: ControlledSortOrder
}

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

const baseUsers = [
  {
    key: '1',
    name: '林青',
    age: 28,
    city: '杭州',
    role: '设计工程师',
    team: '体验平台',
    status: 'active',
    score: 92,
    salary: 26000,
    visits: 148,
    address: '云谷路 88 号',
  },
  {
    key: '2',
    name: '周宁',
    age: 34,
    city: '上海',
    role: '前端工程师',
    team: '设计系统',
    status: 'active',
    score: 88,
    salary: 31000,
    visits: 203,
    address: '武康路 12 号',
  },
  {
    key: '3',
    name: '刘溪',
    age: 41,
    city: '深圳',
    role: '产品经理',
    team: '商业化',
    status: 'leave',
    score: 79,
    salary: 35000,
    visits: 167,
    address: '深南大道 100 号',
  },
  {
    key: '4',
    name: '陈默',
    age: 26,
    city: '成都',
    role: '测试开发',
    team: '质量平台',
    status: 'trial',
    score: 95,
    salary: 22000,
    visits: 98,
    address: '天府三街 18 号',
  },
  {
    key: '5',
    name: '顾安',
    age: 31,
    city: '北京',
    role: '运营分析',
    team: '增长',
    status: 'active',
    score: 83,
    salary: 24500,
    visits: 132,
    address: '望京 SOHO',
  },
]

const staticPinnedRows = [
  { id: '1', item: '套餐 A', owner: '前台', channel: '门店', stock: 42, price: '199' },
  { id: '2', item: '套餐 B', owner: '门店', channel: '小程序', stock: 36, price: '299' },
  { id: '3', item: '套餐 C', owner: '线上', channel: '官网', stock: 28, price: '399' },
  { id: '4', item: '体验卡', owner: '运营', channel: '社群', stock: 86, price: '99' },
  { id: '5', item: '企业版', owner: '销售', channel: '直销', stock: 12, price: '1299' },
  { id: '6', item: '家庭版', owner: '门店', channel: '门店', stock: 25, price: '699' },
  { id: '7', item: '增值包', owner: '客服', channel: '续费', stock: 57, price: '159' },
  { id: '8', item: '旗舰包', owner: '线上', channel: '官网', stock: 18, price: '999' },
  { id: '9', item: '季度包', owner: '增长', channel: '投放', stock: 64, price: '499' },
  { id: '10', item: '年度包', owner: '销售', channel: '直销', stock: 21, price: '1599' },
]

const staticPinColumnRows = [
  {
    key: '1',
    name: '林青',
    role: '设计工程师',
    team: '体验平台',
    city: '杭州',
    score: 92,
    visits: 148,
    salary: 26000,
    address: '云谷路 88 号',
  },
  {
    key: '2',
    name: '周宁',
    role: '前端工程师',
    team: '设计系统',
    city: '上海',
    score: 88,
    visits: 216,
    salary: 31000,
    address: '武康路 12 号',
  },
  {
    key: '3',
    name: '刘溪',
    role: '产品经理',
    team: '商业化',
    city: '深圳',
    score: 76,
    visits: 174,
    salary: 35000,
    address: '深南大道 100 号',
  },
  {
    key: '4',
    name: '陈默',
    role: '测试开发',
    team: '质量平台',
    city: '成都',
    score: 95,
    visits: 98,
    salary: 22000,
    address: '天府三街 18 号',
  },
  {
    key: '5',
    name: '顾安',
    role: '运营分析',
    team: '增长',
    city: '北京',
    score: 83,
    visits: 132,
    salary: 24500,
    address: '望京 SOHO',
  },
  {
    key: '6',
    name: '许嘉',
    role: '数据分析',
    team: '策略',
    city: '南京',
    score: 91,
    visits: 121,
    salary: 27000,
    address: '软件大道 66 号',
  },
  {
    key: '7',
    name: '何澈',
    role: '客户成功',
    team: '企业服务',
    city: '苏州',
    score: 87,
    visits: 154,
    salary: 24000,
    address: '金鸡湖大道 9 号',
  },
]

const controlledDemoRows = [
  { key: '1', name: 'John Brown', age: 32, address: 'New York No. 1 Lake Park' },
  { key: '2', name: 'Jim Green', age: 42, address: 'London No. 1 Lake Park' },
  { key: '3', name: 'Joe Black', age: 32, address: 'Sydney No. 1 Lake Park' },
  { key: '4', name: 'Jim Red', age: 32, address: 'London No. 2 Lake Park' },
]

const controlledSortOptions: Array<{ key: ControlledSortColumnKey; label: string }> = [
  { key: 'name', label: '姓名' },
  { key: 'age', label: '年龄' },
  { key: 'address', label: '地址' },
]

const multipleSorterRows = [
  { key: '1', name: 'John Brown', chinese: 98, math: 60, english: 70 },
  { key: '2', name: 'Jim Green', chinese: 98, math: 66, english: 89 },
  { key: '3', name: 'Joe Black', chinese: 98, math: 90, english: 70 },
  { key: '4', name: 'Jim Red', chinese: 88, math: 99, english: 89 },
]

const multipleSortOptions: Array<{ key: MultiSortColumnKey; label: string; priority: number }> = [
  { key: 'chinese', label: '语文', priority: 3 },
  { key: 'math', label: '数学', priority: 2 },
  { key: 'english', label: '英语', priority: 1 },
]

const isMultiSortColumnKey = (value: any): value is MultiSortColumnKey =>
  multipleSortOptions.some(option => option.key === value)

const isActiveSortOrder = (value: any): value is ActiveSortOrder =>
  value === 'ascend' || value === 'descend'

const historicColumnRows = [
  {
    key: '1',
    name: 'Cy Ganderton',
    team: 'Design Ops',
    city: 'Hangzhou',
    owner: 'Hart Hagerty',
    updatedAt: '2026-04-18',
  },
  {
    key: '2',
    name: 'Brice Swyre',
    team: 'Growth',
    city: 'Shanghai',
    owner: 'Yancy Tear',
    updatedAt: '2026-04-19',
  },
  {
    key: '3',
    name: 'Marjy Ferencz',
    team: 'Infra',
    city: 'Shenzhen',
    owner: 'Maribeth Popping',
    updatedAt: '2026-04-21',
  },
]

const columnToggleOptions = [
  { key: 'name', label: 'Name' },
  { key: 'team', label: 'Team' },
  { key: 'city', label: 'City' },
  { key: 'owner', label: 'Owner' },
  { key: 'updatedAt', label: 'Updated' },
]

const buildColumnToggleColumns = (visibleKeys: string[]) =>
  columnToggleOptions.map(option => ({
    key: option.key,
    title: option.label,
    dataIndex: option.key,
    hidden: !visibleKeys.includes(option.key),
  }))

const tableApiRows: ApiRow[] = [
  {
    prop: 'columns',
    description: '列配置，支持分组表头、排序、筛选、隐藏列与单元格属性。',
    type: 'ColumnItem[]',
    defaultValue: '-',
  },
  { prop: 'dataSource', description: '数据数组。', type: 'any[]', defaultValue: '-' },
  {
    prop: 'rowKey',
    description: '行主键，可传字段名或函数。',
    type: 'string | (record) => key',
    defaultValue: '`key`',
  },
  {
    prop: 'rowSelection',
    description: '选择列配置，支持多选、单选、禁用项、表头标题。',
    type: 'object',
    defaultValue: '-',
  },
  {
    prop: 'expandable',
    description: '展开行配置，支持按行点击展开与受控展开。',
    type: 'object',
    defaultValue: '-',
  },
  {
    prop: 'pagination',
    description: '分页配置，设为 `false` 时关闭分页。',
    type: 'object | false',
    defaultValue: '-',
  },
  {
    prop: 'scroll',
    description: '横向 / 纵向滚动配置，可在变更后自动回到顶部。',
    type: 'object',
    defaultValue: '-',
  },
  {
    prop: 'summary',
    description: '汇总栏渲染。',
    type: '(currentData, info) => any',
    defaultValue: '-',
  },
]

const columnApiRows: ApiRow[] = [
  {
    prop: 'title',
    description: '列标题，支持传节点或函数。',
    type: 'any | (context) => any',
    defaultValue: '-',
  },
  {
    prop: 'dataIndex',
    description: '字段路径，支持字符串和数组路径。',
    type: 'string | string[]',
    defaultValue: '-',
  },
  {
    prop: 'sorter / sortOrder',
    description: '本地排序、受控排序与多列排序。',
    type: 'boolean | fn | { compare?: fn; multiple?: number } / SortOrder',
    defaultValue: '-',
  },
  {
    prop: 'filters / filterDropdown / filteredValue',
    description: '默认筛选菜单、自定义筛选面板与受控筛选值。',
    type: 'Filter.Item[] / render fn / any[]',
    defaultValue: '-',
  },
  {
    prop: 'filterSearch',
    description: '筛选项搜索。',
    type: 'boolean | fn',
    defaultValue: 'false',
  },
  { prop: 'children', description: '分组表头子列。', type: 'ColumnItem[]', defaultValue: '-' },
  { prop: 'hidden', description: '隐藏列但保持配置。', type: 'boolean', defaultValue: 'false' },
  {
    prop: 'onCell / onHeaderCell',
    description: '给单元格注入 className、style、colSpan、rowSpan 等属性。',
    type: 'fn',
    defaultValue: '-',
  },
]

const rowSelectionApiRows: ApiRow[] = [
  {
    prop: 'type',
    description: '选择模式。',
    type: '`checkbox` | `radio`',
    defaultValue: '`checkbox`',
  },
  { prop: 'columnTitle', description: '选择列表头内容。', type: 'any', defaultValue: '-' },
  { prop: 'hideSelectAll', description: '隐藏全选框。', type: 'boolean', defaultValue: 'false' },
  {
    prop: 'getCheckboxProps',
    description: '为某一行注入 disabled 等状态。',
    type: '(record) => object',
    defaultValue: '-',
  },
  {
    prop: 'onSelect / onSelectAll / onChange',
    description: '选择行为回调。',
    type: 'fn',
    defaultValue: '-',
  },
]

const expandableApiRows: ApiRow[] = [
  {
    prop: 'expandedRowRender',
    description: '展开内容渲染函数。',
    type: '(record, index) => any',
    defaultValue: '-',
  },
  {
    prop: 'expandRowByClick',
    description: '点击行即可展开。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'showExpandColumn',
    description: '是否展示展开列。',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    prop: 'rowExpandable',
    description: '按行控制是否可展开。',
    type: '(record) => boolean',
    defaultValue: '-',
  },
  {
    prop: 'defaultExpandedRowKeys / expandedRowKeys',
    description: '默认展开 / 受控展开。',
    type: 'key[]',
    defaultValue: '-',
  },
]

const basicExampleCode = `import { Table } from '@rue-js/design'
const data = [
  { key: '1', name: '林青', city: '杭州', role: '设计工程师', team: '体验平台' },
  { key: '2', name: '周宁', city: '上海', role: '前端工程师', team: '设计系统' },
  { key: '3', name: '刘溪', city: '深圳', role: '产品经理', team: '商业化' },
  { key: '4', name: '陈默', city: '成都', role: '测试开发', team: '质量平台' },
  { key: '5', name: '顾安', city: '北京', role: '运营分析', team: '增长' },
]

const columns = [
  { title: '姓名', dataIndex: 'name' },
  { title: '城市', dataIndex: 'city' },
  { title: '岗位', dataIndex: 'role' },
  { title: '团队', dataIndex: 'team' },
]

export default function Demo() {
  return (
    <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100 p-4">
      <Table className="w-full" columns={columns} dataSource={data} />
    </div>
  )
}`

const visualExampleCode = `import { Table } from '@rue-js/design'
const data = [
  { key: '1', name: '林青', city: '杭州', role: '设计工程师', team: '体验平台' },
  { key: '2', name: '周宁', city: '上海', role: '前端工程师', team: '设计系统' },
  { key: '3', name: '刘溪', city: '深圳', role: '产品经理', team: '商业化' },
]

const columns = [
  { title: '姓名', dataIndex: 'name' },
  { title: '城市', dataIndex: 'city' },
  { title: '岗位', dataIndex: 'role' },
  { title: '团队', dataIndex: 'team' },
]

export default function Demo() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-box border border-base-300 bg-base-100 p-4">
        <div className="mb-3 text-sm font-medium">带背景与激活行</div>
        <Table className="w-full">
          <Table.Head>
            <Table.TR>
              <Table.TH>姓名</Table.TH>
              <Table.TH>岗位</Table.TH>
              <Table.TH>城市</Table.TH>
            </Table.TR>
          </Table.Head>
          <Table.Body>
            <Table.TR className="bg-base-200">
              <Table.TD>林青</Table.TD>
              <Table.TD>设计工程师</Table.TD>
              <Table.TD>杭州</Table.TD>
            </Table.TR>
            <Table.TR className="active">
              <Table.TD>周宁</Table.TD>
              <Table.TD>前端工程师</Table.TD>
              <Table.TD>上海</Table.TD>
            </Table.TR>
          </Table.Body>
        </Table>
      </div>

      <div className="rounded-box border border-base-300 bg-base-100 p-4">
        <div className="mb-3 text-sm font-medium">hover / zebra / xs</div>
        <Table
          className="w-full"
          zebra
          size="xs"
          rowHoverable
          columns={columns}
          dataSource={data}
        />
      </div>
    </div>
  )
}`

const controlledSortExampleCode = `import { ref } from '@rue-js/rue'
import { Table } from '@rue-js/design'
type SortOrder = 'ascend' | 'descend' | null
type ControlledSorter = { columnKey: string | null; order: SortOrder }

const data = [
  { key: '1', name: 'John Brown', age: 32, address: 'New York No. 1 Lake Park' },
  { key: '2', name: 'Jim Green', age: 42, address: 'London No. 1 Lake Park' },
  { key: '3', name: 'Joe Black', age: 32, address: 'Sydney No. 1 Lake Park' },
  { key: '4', name: 'Jim Red', age: 32, address: 'London No. 2 Lake Park' },
]

const sortOptions = [
  { key: 'name', label: '姓名' },
  { key: 'age', label: '年龄' },
  { key: 'address', label: '地址' },
] as const

export default function Demo() {
  const controlledNameFilter = ref<any[]>(['Jim'])
  const controlledAddressFilter = ref<any[]>(['London'])
  const controlledSorter = ref<ControlledSorter>({ columnKey: 'age', order: 'descend' })

  const cycleSort = (columnKey: string) => {
    const current = controlledSorter.value
    const nextOrder =
      current.columnKey !== columnKey
        ? 'descend'
        : current.order === 'descend'
          ? 'ascend'
          : current.order === 'ascend'
            ? null
            : 'descend'

    controlledSorter.value = nextOrder ? { columnKey, order: nextOrder } : { columnKey: null, order: null }
    syncColumns()
  }

  const getSortButtonText = (columnKey: string, label: string) => {
    const order = controlledSorter.value.columnKey === columnKey ? controlledSorter.value.order : null
    if (order === 'descend') return label + '降序'
    if (order === 'ascend') return label + '升序'
    return label + '排序'
  }

  const getSortFieldText = () =>
    sortOptions.find(option => option.key === controlledSorter.value.columnKey)?.label ?? '无'

  const getSortOrderText = () => {
    if (controlledSorter.value.order === 'descend') return '降序'
    if (controlledSorter.value.order === 'ascend') return '升序'
    return '无'
  }

  const buildColumns = () => [
    {
      key: 'name',
      title: 'Name',
      dataIndex: 'name',
      filters: [
        { text: 'Jim', value: 'Jim' },
        { text: 'Joe', value: 'Joe' },
        { text: 'John', value: 'John' },
      ],
      filteredValue: controlledNameFilter.value,
      filterSearch: true,
      onFilter: (value: any, record: any) => record.name.includes(value as string),
      sorter: (a: any, b: any) => a.name.length - b.name.length,
      sortDirections: ['descend' as const, 'ascend' as const],
      sortOrder: controlledSorter.value.columnKey === 'name' ? controlledSorter.value.order : null,
    },
    {
      key: 'age',
      title: 'Age',
      dataIndex: 'age',
      sorter: (a: any, b: any) => a.age - b.age,
      sortDirections: ['descend' as const, 'ascend' as const],
      sortOrder: controlledSorter.value.columnKey === 'age' ? controlledSorter.value.order : null,
    },
    {
      key: 'address',
      title: 'Address',
      dataIndex: 'address',
      filters: [
        { text: 'London', value: 'London' },
        { text: 'New York', value: 'New York' },
        { text: 'Sydney', value: 'Sydney' },
      ],
      filteredValue: controlledAddressFilter.value,
      filterSearch: true,
      onFilter: (value: any, record: any) => record.address.includes(value as string),
      sorter: (a: any, b: any) => a.address.length - b.address.length,
      sortDirections: ['descend' as const, 'ascend' as const],
      sortOrder: controlledSorter.value.columnKey === 'address' ? controlledSorter.value.order : null,
      ellipsis: true,
    },
  ]

  const columns = ref(buildColumns())

  const syncColumns = () => {
    columns.value = buildColumns()
  }

  return (
    <div className="space-y-4 rounded-box border border-base-300 bg-base-100 p-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {sortOptions.map(option => (
          <button
            key={option.key}
            className={
              controlledSorter.value.columnKey === option.key
                ? 'btn btn-primary btn-xs'
                : 'btn btn-ghost btn-xs'
            }
            onClick={() => cycleSort(option.key)}
          >
            {getSortButtonText(option.key, option.label)}
          </button>
        ))}
        <button
          className="btn btn-ghost btn-xs"
          onClick={() => {
            controlledSorter.value = { columnKey: null, order: null }
            syncColumns()
          }}
        >
          清空排序
        </button>
        <button
          className="btn btn-ghost btn-xs"
          onClick={() => {
            controlledNameFilter.value = ['Jim']
            controlledAddressFilter.value = []
            syncColumns()
          }}
        >
          只看 Jim
        </button>
        <button
          className="btn btn-ghost btn-xs"
          onClick={() => {
            controlledNameFilter.value = []
            controlledAddressFilter.value = ['London']
            syncColumns()
          }}
        >
          只看 London
        </button>
        <button
          className="btn btn-ghost btn-xs"
          onClick={() => {
            controlledNameFilter.value = ['Jim']
            controlledAddressFilter.value = ['London']
            syncColumns()
          }}
        >
          Jim + London
        </button>
        <button
          className="btn btn-ghost btn-xs"
          onClick={() => {
            controlledNameFilter.value = []
            controlledAddressFilter.value = []
            syncColumns()
          }}
        >
          清空筛选
        </button>
        <button
          className="btn btn-ghost btn-xs"
          onClick={() => {
            controlledNameFilter.value = []
            controlledAddressFilter.value = []
            controlledSorter.value = { columnKey: null, order: null }
            syncColumns()
          }}
        >
          清空全部
        </button>
        <span className="opacity-70">
          筛选：Name {controlledNameFilter.value.join(', ') || '无'} / Address {controlledAddressFilter.value.join(', ') || '无'}；
          当前排序：{getSortFieldText()} / {getSortOrderText()}
        </span>
      </div>

      <Table
        className="w-full"
        columns={columns.value}
        dataSource={data}
        sortDirections={['descend', 'ascend']}
        onChange={(_, filters, sorter) => {
          controlledNameFilter.value =
            Array.isArray(filters?.name) && filters.name.length > 0 ? filters.name : []
          controlledAddressFilter.value =
            Array.isArray(filters?.address) && filters.address.length > 0 ? filters.address : []
          const nextSorter = Array.isArray(sorter) ? sorter[0] : sorter
          controlledSorter.value = {
            columnKey: nextSorter?.order ? (nextSorter?.columnKey ?? null) : null,
            order: nextSorter?.order ?? null,
          }
          syncColumns()
        }}
      />
    </div>
  )
}`

const multipleSorterExampleCode = `import { ref } from '@rue-js/rue'
import { Table } from '@rue-js/design'
type SortOrder = 'ascend' | 'descend'
type SortKey = 'chinese' | 'math' | 'english'
type SortOrderMap = Partial<Record<SortKey, SortOrder>>

const data = [
  { key: '1', name: 'John Brown', chinese: 98, math: 60, english: 70 },
  { key: '2', name: 'Jim Green', chinese: 98, math: 66, english: 89 },
  { key: '3', name: 'Joe Black', chinese: 98, math: 90, english: 70 },
  { key: '4', name: 'Jim Red', chinese: 88, math: 99, english: 89 },
]

const sortOptions: Array<{ key: SortKey; label: string; priority: number }> = [
  { key: 'chinese', label: '语文', priority: 3 },
  { key: 'math', label: '数学', priority: 2 },
  { key: 'english', label: '英语', priority: 1 },
]

const isSortKey = (value: any): value is SortKey =>
  sortOptions.some(option => option.key === value)

const isSortOrder = (value: any): value is SortOrder => value === 'ascend' || value === 'descend'

export default function Demo() {
  const multiSortOrders = ref<SortOrderMap>({
    chinese: 'descend',
    math: 'descend',
  })

  const setSortPreset = (orders: SortOrderMap) => {
    multiSortOrders.value = { ...orders }
    syncColumns()
  }

  const cycleSort = (columnKey: SortKey) => {
    const current = multiSortOrders.value[columnKey] ?? null
    const nextOrder = current === 'descend' ? 'ascend' : current === 'ascend' ? null : 'descend'
    const nextOrders = { ...multiSortOrders.value }

    if (nextOrder) nextOrders[columnKey] = nextOrder
    else delete nextOrders[columnKey]

    multiSortOrders.value = nextOrders
    syncColumns()
  }

  const getSortButtonText = (option: { key: SortKey; label: string }) => {
    const order = multiSortOrders.value[option.key]
    if (order === 'descend') return option.label + '降序'
    if (order === 'ascend') return option.label + '升序'
    return option.label + '排序'
  }

  const getSortSummary = () => {
    const activeItems = sortOptions
      .filter(option => multiSortOrders.value[option.key])
      .sort((a, b) => b.priority - a.priority)
      .map(option => {
        const order = multiSortOrders.value[option.key] === 'descend' ? '降序' : '升序'
        return option.label + order + ' P' + option.priority
      })

    return activeItems.join(' / ') || '无'
  }

  const buildColumns = () => [
    { title: 'Name', dataIndex: 'name' },
    {
      key: 'chinese',
      title: 'Chinese Score',
      dataIndex: 'chinese',
      sortOrder: multiSortOrders.value.chinese ?? null,
      sortDirections: ['descend' as const, 'ascend' as const],
      sorter: { compare: (a: any, b: any) => a.chinese - b.chinese, multiple: 3 },
    },
    {
      key: 'math',
      title: 'Math Score',
      dataIndex: 'math',
      sortOrder: multiSortOrders.value.math ?? null,
      sortDirections: ['descend' as const, 'ascend' as const],
      sorter: { compare: (a: any, b: any) => a.math - b.math, multiple: 2 },
    },
    {
      key: 'english',
      title: 'English Score',
      dataIndex: 'english',
      sortOrder: multiSortOrders.value.english ?? null,
      sortDirections: ['descend' as const, 'ascend' as const],
      sorter: { compare: (a: any, b: any) => a.english - b.english, multiple: 1 },
    },
  ]

  const columns = ref(buildColumns())

  const syncColumns = () => {
    columns.value = buildColumns()
  }

  return (
    <div className="space-y-4 rounded-box border border-base-300 bg-base-100 p-4">
      <div className="flex flex-wrap gap-2 text-sm">
        <button
          className="btn btn-ghost btn-xs"
          onClick={() => setSortPreset({ chinese: 'descend', math: 'descend' })}
        >
          语文 + 数学降序
        </button>
        <button
          className="btn btn-ghost btn-xs"
          onClick={() =>
            setSortPreset({ chinese: 'descend', math: 'descend', english: 'descend' })
          }
        >
          三科降序
        </button>
        <button
          className="btn btn-ghost btn-xs"
          onClick={() => setSortPreset({ chinese: 'ascend', english: 'descend' })}
        >
          语文升序 + 英语降序
        </button>
        <button className="btn btn-ghost btn-xs" onClick={() => setSortPreset({})}>
          清空排序
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {sortOptions.map(option => (
          <button
            key={option.key}
            className={
              multiSortOrders.value[option.key] ? 'btn btn-primary btn-xs' : 'btn btn-ghost btn-xs'
            }
            onClick={() => cycleSort(option.key)}
          >
            {getSortButtonText(option)}
          </button>
        ))}
        <span className="opacity-70">当前优先级：{getSortSummary()}</span>
      </div>

      <Table
        className="w-full"
        columns={columns.value}
        dataSource={data}
        sortDirections={['descend', 'ascend']}
        onChange={(_, __, sorter) => {
          const sorters = Array.isArray(sorter) ? sorter : sorter?.order ? [sorter] : []
          multiSortOrders.value = sorters.reduce((acc: SortOrderMap, item: any) => {
            if (isSortKey(item?.columnKey) && isSortOrder(item?.order)) {
              acc[item.columnKey] = item.order
            }
            return acc
          }, {})
          syncColumns()
        }}
      />
    </div>
  )
}`

const columnToggleExampleCode = `import { ref } from '@rue-js/rue'
import { Table } from '@rue-js/design'
const data = [
  { key: '1', name: 'Cy Ganderton', team: 'Design Ops', city: 'Hangzhou', owner: 'Hart Hagerty', updatedAt: '2026-04-18' },
  { key: '2', name: 'Brice Swyre', team: 'Growth', city: 'Shanghai', owner: 'Yancy Tear', updatedAt: '2026-04-19' },
  { key: '3', name: 'Marjy Ferencz', team: 'Infra', city: 'Shenzhen', owner: 'Maribeth Popping', updatedAt: '2026-04-21' },
]

const columnOptions = [
  { key: 'name', label: 'Name' },
  { key: 'team', label: 'Team' },
  { key: 'city', label: 'City' },
  { key: 'owner', label: 'Owner' },
  { key: 'updatedAt', label: 'Updated' },
]

export default function Demo() {
  const visibleColumnKeys = ref(['name', 'team', 'city', 'owner'])

  const buildColumns = (visibleKeys: string[]) =>
    columnOptions.map(option => ({
      key: option.key,
      title: option.label,
      dataIndex: option.key,
      hidden: !visibleKeys.includes(option.key),
    }))

  const columns = ref(buildColumns(visibleColumnKeys.value))

  const toggleColumn = (key: string) => {
    const active = visibleColumnKeys.value.includes(key)
    const nextVisibleKeys = active
      ? visibleColumnKeys.value.filter(item => item !== key)
      : [...visibleColumnKeys.value, key]

    visibleColumnKeys.value = nextVisibleKeys
    columns.value = buildColumns(nextVisibleKeys)
  }

  return (
    <div className="space-y-4 rounded-box border border-base-300 bg-base-100 p-4">
      <div className="flex flex-wrap gap-2 text-sm">
        {columnOptions.map(option => {
          const active = visibleColumnKeys.value.includes(option.key)
          return (
            <button
              key={option.key}
              className={active ? 'btn btn-primary btn-xs' : 'btn btn-ghost btn-xs'}
              onClick={() => toggleColumn(option.key)}
            >
              {active ? '隐藏 ' + option.label : '显示 ' + option.label}
            </button>
          )
        })}
      </div>

      <Table className="w-full" columns={columns.value} dataSource={data} />
    </div>
  )
}`

const selectionExampleCode = `import { ref } from '@rue-js/rue'
import { Table } from '@rue-js/design'
const data = [
  { key: '1', name: '林青', city: '杭州', team: '体验平台', status: 'active' },
  { key: '2', name: '周宁', city: '上海', team: '设计系统', status: 'active' },
  { key: '3', name: '刘溪', city: '深圳', team: '商业化', status: 'leave' },
  { key: '4', name: '陈默', city: '成都', team: '质量平台', status: 'trial' },
]

export default function Demo() {
  const selectedKeys = ref<Array<string | number>>(['2'])
  const selectedRadio = ref<Array<string | number>>(['2'])

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-box border border-base-300 bg-base-100 p-4">
        <div className="mb-3 text-sm">多选：当前 {selectedKeys.value.join(', ') || '空'}</div>
        <Table
          className="w-full"
          columns={[
            { title: '姓名', dataIndex: 'name' },
            { title: '团队', dataIndex: 'team' },
            { title: '状态', dataIndex: 'status' },
          ]}
          dataSource={data}
          rowSelection={{
            columnTitle: '成员',
            selectedRowKeys: selectedKeys.value,
            getCheckboxProps: record => ({ disabled: record.status === 'leave' }),
            onChange: keys => (selectedKeys.value = [...keys]),
          }}
        />
      </div>

      <div className="rounded-box border border-base-300 bg-base-100 p-4">
        <div className="mb-3 text-sm">单选：当前 {selectedRadio.value[0] ?? '空'}</div>
        <Table
          className="w-full"
          columns={[
            { title: '姓名', dataIndex: 'name' },
            { title: '城市', dataIndex: 'city' },
          ]}
          dataSource={data}
          rowSelection={{
            type: 'radio',
            hideSelectAll: true,
            selectedRowKeys: selectedRadio.value,
            onChange: keys => (selectedRadio.value = [...keys]),
          }}
        />
      </div>
    </div>
  )
}`

const expandExampleCode = `import { ref } from '@rue-js/rue'
import { Table } from '@rue-js/design'
const data = [
  { key: '1', name: '林青', team: '体验平台', score: 92, address: '云谷路 88 号' },
  { key: '2', name: '周宁', team: '设计系统', score: 88, address: '武康路 12 号' },
  { key: '3', name: '刘溪', team: '商业化', score: 79, address: '深南大道 100 号' },
  { key: '4', name: '陈默', team: '质量平台', score: 95, address: '天府三街 18 号' },
]

export default function Demo() {
  const expandedKeys = ref<Array<string | number>>(['2'])

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-box border border-base-300 bg-base-100 p-4">
        <Table
          className="w-full"
          columns={[
            { title: '姓名', dataIndex: 'name' },
            { title: '绩效', dataIndex: 'score', align: 'right' as const },
          ]}
          dataSource={data}
          expandable={{
            expandedRowKeys: expandedKeys.value,
            expandRowByClick: true,
            onExpandedRowsChange: keys => (expandedKeys.value = [...keys]),
            expandedRowRender: record => (
              <div className="text-sm leading-6">
                <div>团队：{record.team}</div>
                <div>地址：{record.address}</div>
              </div>
            ),
          }}
          summary={rows => (
            <div className="flex justify-between text-sm">
              <span>当前行数：{rows.length}</span>
              <span>平均绩效：{Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length)}</span>
            </div>
          )}
        />
      </div>

      <div className="rounded-box border border-base-300 bg-base-100 p-4">
        <Table
          className="w-full"
          columns={[
            { title: '姓名', dataIndex: 'name' },
            { title: '团队', dataIndex: 'team' },
          ]}
          dataSource={[]}
          emptyText={<span className="text-sm opacity-60">暂无成员，请先创建数据。</span>}
        />
      </div>
    </div>
  )
}`

const layoutExampleCode = `import { Table } from '@rue-js/design'
const data = [
  { key: '1', name: '林青', city: '杭州', role: '设计工程师', team: '体验平台', address: '云谷路 88 号', visits: 148 },
  { key: '2', name: '周宁', city: '上海', role: '前端工程师', team: '设计系统', address: '武康路 12 号', visits: 203 },
  { key: '3', name: '刘溪', city: '深圳', role: '产品经理', team: '商业化', address: '深南大道 100 号', visits: 167 },
  { key: '4', name: '陈默', city: '成都', role: '测试开发', team: '质量平台', address: '天府三街 18 号', visits: 98 },
  { key: '5', name: '顾安', city: '北京', role: '运营分析', team: '增长', address: '望京 SOHO', visits: 132 },
]

const columns = [
  { title: '姓名', dataIndex: 'name', width: 120, fixedCol: true },
  { title: '城市', dataIndex: 'city', width: 120 },
  { title: '岗位', dataIndex: 'role', width: 180, ellipsis: true },
  { title: '团队', dataIndex: 'team', width: 160 },
  { title: '地址', dataIndex: 'address', width: 220, ellipsis: true },
  { title: '访问量', dataIndex: 'visits', width: 120, align: 'right' as const },
]

export default function Demo() {
  const longData = data.concat(data).concat(data)

  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-4">
      <Table
        className="w-full"
        columns={columns}
        dataSource={longData}
        scroll={{ x: 900, y: 220, scrollToFirstRowOnChange: true }}
        title={rows => <div className="text-sm font-medium">成员列表（当前页 {rows.length} 行）</div>}
        footer={() => <div className="text-sm opacity-70">展示了固定列、纵向滚动和 ellipsis。</div>}
      />
    </div>
  )
}`

const groupedExampleCode = `import { ref } from '@rue-js/rue'
import { Table } from '@rue-js/design'
const data = [
  { key: '1', name: '林青', age: 28, city: '杭州', role: '设计工程师', team: '体验平台', salary: 26000 },
  { key: '2', name: '周宁', age: 34, city: '上海', role: '前端工程师', team: '设计系统', salary: 31000 },
  { key: '3', name: '刘溪', age: 41, city: '深圳', role: '产品经理', team: '商业化', salary: 35000 },
  { key: '4', name: '陈默', age: 26, city: '成都', role: '测试开发', team: '质量平台', salary: 22000 },
]

export default function Demo() {
  const hideSalary = ref(false)
  const clickedName = ref('未点击')

  const buildColumns = (salaryHidden: boolean) => [
    {
      title: '成员信息',
      children: [
        { title: '姓名', dataIndex: 'name', width: 120 },
        { title: '城市', dataIndex: 'city', width: 120 },
      ],
    },
    {
      title: '工作概览',
      children: [
        { title: '岗位', dataIndex: 'role', ellipsis: true },
        { title: '团队', dataIndex: 'team', ellipsis: true },
        { title: '月薪', dataIndex: 'salary', align: 'right' as const, hidden: salaryHidden },
      ],
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      align: 'center' as const,
      render: (_: any, record: any) => (
        <button
          className="btn btn-ghost btn-xs"
          onClick={() => (clickedName.value = '操作 ' + record.name)}
        >
          查看
        </button>
      ),
      onCell: (_record: any, rowIndex: number) => ({
        className: rowIndex % 2 === 0 ? 'bg-base-100' : 'bg-base-200/30',
      }),
    },
  ]

  const columns = ref(buildColumns(hideSalary.value))

  const toggleSalaryColumn = () => {
    hideSalary.value = !hideSalary.value
    columns.value = buildColumns(hideSalary.value)
  }

  return (
    <div className="space-y-4 rounded-box border border-base-300 bg-base-100 p-4">
      <div className="flex flex-wrap gap-2 text-sm">
        <button className="btn btn-ghost btn-xs" onClick={toggleSalaryColumn}>
          {hideSalary.value ? '显示月薪列' : '隐藏月薪列'}
        </button>
        <span>最近操作：{clickedName.value}</span>
      </div>
      <Table
        className="w-full"
        columns={columns.value}
        dataSource={data}
        rowHoverable
        onRow={(record: any) => ({
          onClick: () => (clickedName.value = '点击 ' + record.name),
        })}
      />
    </div>
  )
}`

const staticExampleCode = `import { Table } from '@rue-js/design'
const pinnedRows = [
  { id: '1', item: '套餐 A', owner: '前台', channel: '门店', stock: 42, price: '199' },
  { id: '2', item: '套餐 B', owner: '门店', channel: '小程序', stock: 36, price: '299' },
  { id: '3', item: '套餐 C', owner: '线上', channel: '官网', stock: 28, price: '399' },
  { id: '4', item: '体验卡', owner: '运营', channel: '社群', stock: 86, price: '99' },
  { id: '5', item: '企业版', owner: '销售', channel: '直销', stock: 12, price: '1299' },
  { id: '6', item: '家庭版', owner: '门店', channel: '门店', stock: 25, price: '699' },
  { id: '7', item: '增值包', owner: '客服', channel: '续费', stock: 57, price: '159' },
  { id: '8', item: '旗舰包', owner: '线上', channel: '官网', stock: 18, price: '999' },
  { id: '9', item: '季度包', owner: '增长', channel: '投放', stock: 64, price: '499' },
  { id: '10', item: '年度包', owner: '销售', channel: '直销', stock: 21, price: '1599' },
]

const users = [
  { key: '1', name: '林青', role: '设计工程师', team: '体验平台', city: '杭州', score: 92, visits: 148, salary: 26000, address: '云谷路 88 号' },
  { key: '2', name: '周宁', role: '前端工程师', team: '设计系统', city: '上海', score: 88, visits: 216, salary: 31000, address: '武康路 12 号' },
  { key: '3', name: '刘溪', role: '产品经理', team: '商业化', city: '深圳', score: 76, visits: 174, salary: 35000, address: '深南大道 100 号' },
  { key: '4', name: '陈默', role: '测试开发', team: '质量平台', city: '成都', score: 95, visits: 98, salary: 22000, address: '天府三街 18 号' },
  { key: '5', name: '顾安', role: '运营分析', team: '增长', city: '北京', score: 83, visits: 132, salary: 24500, address: '望京 SOHO' },
  { key: '6', name: '许嘉', role: '数据分析', team: '策略', city: '南京', score: 91, visits: 121, salary: 27000, address: '软件大道 66 号' },
  { key: '7', name: '何澈', role: '客户成功', team: '企业服务', city: '苏州', score: 87, visits: 154, salary: 24000, address: '金鸡湖大道 9 号' },
]

export default function Demo() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="h-72 overflow-auto rounded-box border border-base-300 bg-base-100 p-4">
        <Table zebra pinRows className="w-full min-w-[640px]">
          <Table.Head>
            <Table.TR>
              <Table.TH>商品</Table.TH>
              <Table.TH>负责人</Table.TH>
              <Table.TH>渠道</Table.TH>
              <Table.TH className="text-right">库存</Table.TH>
              <Table.TH className="text-right">价格</Table.TH>
            </Table.TR>
          </Table.Head>
          <Table.Body>
            {pinnedRows.map(row => (
              <Table.TR key={row.id}>
                <Table.TD>{row.item}</Table.TD>
                <Table.TD>{row.owner}</Table.TD>
                <Table.TD>{row.channel}</Table.TD>
                <Table.TD className="text-right">{row.stock}</Table.TD>
                <Table.TD className="text-right">{row.price}</Table.TD>
              </Table.TR>
            ))}
          </Table.Body>
        </Table>
      </div>

      <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100 p-4">
        <Table pinCols className="w-[980px]">
          <Table.Head>
            <Table.TR>
              <Table.TH className="bg-base-100">姓名</Table.TH>
              <Table.TH>岗位</Table.TH>
              <Table.TH>团队</Table.TH>
              <Table.TH>城市</Table.TH>
              <Table.TH className="text-right">绩效</Table.TH>
              <Table.TH className="text-right">访问</Table.TH>
              <Table.TH className="text-right">月薪</Table.TH>
              <Table.TH>地址</Table.TH>
            </Table.TR>
          </Table.Head>
          <Table.Body>
            {users.map(row => (
              <Table.TR key={row.key}>
                <Table.TH className="bg-base-100">{row.name}</Table.TH>
                <Table.TD>{row.role}</Table.TD>
                <Table.TD>{row.team}</Table.TD>
                <Table.TD>{row.city}</Table.TD>
                <Table.TD className="text-right">{row.score}</Table.TD>
                <Table.TD className="text-right">{row.visits}</Table.TD>
                <Table.TD className="text-right">{row.salary}</Table.TD>
                <Table.TD>{row.address}</Table.TD>
              </Table.TR>
            ))}
          </Table.Body>
        </Table>
      </div>
    </div>
  )
}`

const TableDemo: FC = () => {
  const tabBasic = ref<TabMode>('preview')
  const tabVisual = ref<TabMode>('preview')
  const tabControlledSort = ref<TabMode>('preview')
  const tabMultipleSorter = ref<TabMode>('preview')
  const tabColumnToggle = ref<TabMode>('preview')
  const tabSelection = ref<TabMode>('preview')
  const tabExpand = ref<TabMode>('preview')
  const tabLayout = ref<TabMode>('preview')
  const tabGrouped = ref<TabMode>('preview')
  const tabStatic = ref<TabMode>('preview')

  const selectedKeys = ref<Array<string | number>>(['2'])
  const selectedRadio = ref<Array<string | number>>(['2'])
  const clickedName = ref('未点击')
  const controlledNameFilter = ref<any[]>(['Jim'])
  const controlledAddressFilter = ref<any[]>(['London'])
  const controlledSorter = ref<ControlledSorterState>({
    columnKey: 'age',
    order: 'descend',
  })
  const multiSortOrders = ref<MultiSortOrderMap>({
    chinese: 'descend',
    math: 'descend',
  })
  const visibleColumnKeys = ref(['name', 'team', 'city', 'owner'])
  const columnToggleColumns = ref(buildColumnToggleColumns(visibleColumnKeys.value))
  const hideSalary = ref(false)
  const expandedKeys = ref<Array<string | number>>(['2'])

  const buildControlledSortColumns = () => [
    {
      key: 'name',
      title: 'Name',
      filters: [
        { text: 'Jim', value: 'Jim' },
        { text: 'Joe', value: 'Joe' },
        { text: 'John', value: 'John' },
      ],
      dataIndex: 'name',
      filteredValue: controlledNameFilter.value,
      filterSearch: true,
      onFilter: (value: any, record: any) => record.name.includes(value as string),
      sorter: (a: any, b: any) => a.name.length - b.name.length,
      sortDirections: ['descend' as const, 'ascend' as const],
      sortOrder: controlledSorter.value.columnKey === 'name' ? controlledSorter.value.order : null,
    },
    {
      key: 'age',
      title: 'Age',
      dataIndex: 'age',
      sorter: (a: any, b: any) => a.age - b.age,
      sortDirections: ['descend' as const, 'ascend' as const],
      sortOrder: controlledSorter.value.columnKey === 'age' ? controlledSorter.value.order : null,
    },
    {
      key: 'address',
      title: 'Address',
      filters: [
        { text: 'London', value: 'London' },
        { text: 'New York', value: 'New York' },
        { text: 'Sydney', value: 'Sydney' },
      ],
      dataIndex: 'address',
      filteredValue: controlledAddressFilter.value,
      filterSearch: true,
      onFilter: (value: any, record: any) => record.address.includes(value as string),
      sorter: (a: any, b: any) => a.address.length - b.address.length,
      sortDirections: ['descend' as const, 'ascend' as const],
      sortOrder:
        controlledSorter.value.columnKey === 'address' ? controlledSorter.value.order : null,
      ellipsis: true,
    },
  ]
  const controlledSortColumns = ref(buildControlledSortColumns())

  const syncControlledSortColumns = () => {
    controlledSortColumns.value = buildControlledSortColumns()
  }

  const buildMultipleSorterColumns = () => [
    { title: 'Name', dataIndex: 'name' },
    {
      key: 'chinese',
      title: 'Chinese Score',
      dataIndex: 'chinese',
      sortOrder: multiSortOrders.value.chinese ?? null,
      sorter: { compare: (a: any, b: any) => a.chinese - b.chinese, multiple: 3 },
      sortDirections: ['descend' as const, 'ascend' as const],
    },
    {
      key: 'math',
      title: 'Math Score',
      dataIndex: 'math',
      sortOrder: multiSortOrders.value.math ?? null,
      sorter: { compare: (a: any, b: any) => a.math - b.math, multiple: 2 },
      sortDirections: ['descend' as const, 'ascend' as const],
    },
    {
      key: 'english',
      title: 'English Score',
      dataIndex: 'english',
      sortOrder: multiSortOrders.value.english ?? null,
      sorter: { compare: (a: any, b: any) => a.english - b.english, multiple: 1 },
      sortDirections: ['descend' as const, 'ascend' as const],
    },
  ]
  const multipleSorterColumns = ref(buildMultipleSorterColumns())

  const syncMultipleSorterColumns = () => {
    multipleSorterColumns.value = buildMultipleSorterColumns()
  }

  const cycleControlledSort = (columnKey: ControlledSortColumnKey) => {
    const current = controlledSorter.value
    const nextOrder: ControlledSortOrder =
      current.columnKey !== columnKey
        ? 'descend'
        : current.order === 'descend'
          ? 'ascend'
          : current.order === 'ascend'
            ? null
            : 'descend'

    controlledSorter.value = nextOrder
      ? { columnKey, order: nextOrder }
      : { columnKey: null, order: null }
    syncControlledSortColumns()
  }

  const getControlledSortButtonText = (columnKey: ControlledSortColumnKey, label: string) => {
    const order =
      controlledSorter.value.columnKey === columnKey ? controlledSorter.value.order : null
    if (order === 'descend') return `${label}降序`
    if (order === 'ascend') return `${label}升序`
    return `${label}排序`
  }

  const getControlledSortFieldText = () =>
    controlledSortOptions.find(option => option.key === controlledSorter.value.columnKey)?.label ??
    '无'

  const getControlledSortOrderText = () => {
    if (controlledSorter.value.order === 'descend') return '降序'
    if (controlledSorter.value.order === 'ascend') return '升序'
    return '无'
  }

  const setMultiSortPreset = (orders: MultiSortOrderMap) => {
    multiSortOrders.value = { ...orders }
    syncMultipleSorterColumns()
  }

  const cycleMultiSort = (columnKey: MultiSortColumnKey) => {
    const current = multiSortOrders.value[columnKey] ?? null
    const nextOrder: ControlledSortOrder =
      current === 'descend' ? 'ascend' : current === 'ascend' ? null : 'descend'
    const nextOrders = { ...multiSortOrders.value }

    if (nextOrder) {
      nextOrders[columnKey] = nextOrder
    } else {
      delete nextOrders[columnKey]
    }

    multiSortOrders.value = nextOrders
    syncMultipleSorterColumns()
  }

  const getMultiSortButtonText = (option: {
    key: MultiSortColumnKey
    label: string
    priority: number
  }) => {
    const order = multiSortOrders.value[option.key]
    if (order === 'descend') return `${option.label}降序`
    if (order === 'ascend') return `${option.label}升序`
    return `${option.label}排序`
  }

  const getMultiSortSummary = () => {
    const activeItems = multipleSortOptions
      .filter(option => multiSortOrders.value[option.key])
      .sort((a, b) => b.priority - a.priority)
      .map(option => {
        const order = multiSortOrders.value[option.key] === 'descend' ? '降序' : '升序'
        return `${option.label}${order} P${option.priority}`
      })

    return activeItems.join(' / ') || '无'
  }

  const toggleColumnVisibility = (key: string) => {
    const active = visibleColumnKeys.value.includes(key)
    const nextVisibleKeys = active
      ? visibleColumnKeys.value.filter(item => item !== key)
      : [...visibleColumnKeys.value, key]

    visibleColumnKeys.value = nextVisibleKeys
    columnToggleColumns.value = buildColumnToggleColumns(nextVisibleKeys)
  }

  const employeeColumns = [
    { title: '姓名', dataIndex: 'name' },
    { title: '城市', dataIndex: 'city' },
    { title: '岗位', dataIndex: 'role' },
    { title: '团队', dataIndex: 'team' },
  ]

  const buildGroupedColumns = (salaryHidden: boolean) => [
    {
      title: '成员信息',
      children: [
        { title: '姓名', dataIndex: 'name', width: 120 },
        { title: '城市', dataIndex: 'city', width: 120 },
      ],
    },
    {
      title: '工作概览',
      children: [
        { title: '岗位', dataIndex: 'role', ellipsis: true },
        { title: '团队', dataIndex: 'team', ellipsis: true },
        { title: '月薪', dataIndex: 'salary', align: 'right' as const, hidden: salaryHidden },
      ],
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      align: 'center' as const,
      render: (_: any, record: any) => (
        <button
          className="btn btn-ghost btn-xs"
          onClick={() => (clickedName.value = `操作 ${record.name}`)}
        >
          查看
        </button>
      ),
      onCell: (_record: any, rowIndex: number) => ({
        className: rowIndex % 2 === 0 ? 'bg-base-100' : 'bg-base-200/30',
      }),
    },
  ]
  const groupedColumns = ref(buildGroupedColumns(hideSalary.value))
  const toggleSalaryColumn = () => {
    hideSalary.value = !hideSalary.value
    groupedColumns.value = buildGroupedColumns(hideSalary.value)
  }

  const scrollColumns = [
    { title: '姓名', dataIndex: 'name', width: 120, fixedCol: true },
    { title: '城市', dataIndex: 'city', width: 120 },
    { title: '岗位', dataIndex: 'role', width: 180, ellipsis: true },
    { title: '团队', dataIndex: 'team', width: 160 },
    { title: '地址', dataIndex: 'address', width: 220, ellipsis: true },
    { title: '访问量', dataIndex: 'visits', width: 120, align: 'right' as const },
  ]

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Table 表格</h1>
        <p>
          Rue Table 现在同时覆盖数据驱动表格和 daisyUI 风格的静态表格写法，使用 Rue
          当前视觉风格，并补充更完整的 排序、筛选、分页、选择、展开与分组表头能力。
        </p>
        <p>
          可以先从基础用法进入，再根据场景查看筛选排序、选择模式、滚动布局与分组表头。静态样式写法仍然提供，可继续
          使用 <code>Table.Head</code>、<code>Table.Body</code> 等复合组件。
        </p>

        <h2>何时使用</h2>
        <ul>
          <li>需要展示结构化列表数据，并同时提供排序、筛选、分页等交互。</li>
          <li>适合使用 Rue / daisyUI 的表格视觉风格，同时使用数据表式 API。</li>
          <li>基础简单静态表格，也有复杂后台表格，想统一在一个组件里处理。</li>
        </ul>

        <ExampleBlock
          title="基础数据表格"
          summary="最直接的 columns + dataSource 用法，适合作为大多数列表页的起点。"
          tab={tabBasic}
          preview={() => (
            <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100 p-4">
              <Table className="w-full" columns={employeeColumns} dataSource={baseUsers} />
            </div>
          )}
          code={basicExampleCode}
        />

        <ExampleBlock
          title="视觉风格与静态行态"
          summary="使用当前视觉类示例：背景、激活行、hover、zebra 与尺寸示例。"
          tab={tabVisual}
          preview={() => (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-box border border-base-300 bg-base-100 p-4">
                <div className="mb-3 text-sm font-medium">带背景与激活行</div>
                <Table className="w-full">
                  <Table.Head>
                    <Table.TR>
                      <Table.TH>姓名</Table.TH>
                      <Table.TH>岗位</Table.TH>
                      <Table.TH>城市</Table.TH>
                    </Table.TR>
                  </Table.Head>
                  <Table.Body>
                    <Table.TR className="bg-base-200">
                      <Table.TD>林青</Table.TD>
                      <Table.TD>设计工程师</Table.TD>
                      <Table.TD>杭州</Table.TD>
                    </Table.TR>
                    <Table.TR className="active">
                      <Table.TD>周宁</Table.TD>
                      <Table.TD>前端工程师</Table.TD>
                      <Table.TD>上海</Table.TD>
                    </Table.TR>
                  </Table.Body>
                </Table>
              </div>
              <div className="rounded-box border border-base-300 bg-base-100 p-4">
                <div className="mb-3 text-sm font-medium">hover / zebra / xs</div>
                <Table
                  className="w-full"
                  zebra
                  size="xs"
                  rowHoverable
                  columns={employeeColumns}
                  dataSource={baseUsers.slice(0, 3)}
                />
              </div>
            </div>
          )}
          code={visualExampleCode}
        />

        <ExampleBlock
          title="可控筛选与排序"
          summary="恢复外部控制台式的筛选与排序示例，避免交互状态混在一起。"
          tab={tabControlledSort}
          preview={() => (
            <div className="space-y-4 rounded-box border border-base-300 bg-base-100 p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {controlledSortOptions.map(option => (
                  <button
                    key={option.key}
                    className={`btn btn-xs ${
                      controlledSorter.value.columnKey === option.key ? 'btn-primary' : 'btn-ghost'
                    }`}
                    onClick={() => cycleControlledSort(option.key)}
                  >
                    {getControlledSortButtonText(option.key, option.label)}
                  </button>
                ))}
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    controlledSorter.value = { columnKey: null, order: null }
                    syncControlledSortColumns()
                  }}
                >
                  清空排序
                </button>
                <button
                  className={`btn btn-xs ${
                    controlledNameFilter.value.length === 1 &&
                    controlledNameFilter.value[0] === 'Jim' &&
                    controlledAddressFilter.value.length === 0
                      ? 'btn-primary'
                      : 'btn-ghost'
                  }`}
                  onClick={() => {
                    controlledNameFilter.value = ['Jim']
                    controlledAddressFilter.value = []
                    syncControlledSortColumns()
                  }}
                >
                  只看 Jim
                </button>
                <button
                  className={`btn btn-xs ${
                    controlledAddressFilter.value.length === 1 &&
                    controlledAddressFilter.value[0] === 'London' &&
                    controlledNameFilter.value.length === 0
                      ? 'btn-primary'
                      : 'btn-ghost'
                  }`}
                  onClick={() => {
                    controlledNameFilter.value = []
                    controlledAddressFilter.value = ['London']
                    syncControlledSortColumns()
                  }}
                >
                  只看 London
                </button>
                <button
                  className={`btn btn-xs ${
                    controlledNameFilter.value.length === 1 &&
                    controlledNameFilter.value[0] === 'Jim' &&
                    controlledAddressFilter.value.length === 1 &&
                    controlledAddressFilter.value[0] === 'London'
                      ? 'btn-primary'
                      : 'btn-ghost'
                  }`}
                  onClick={() => {
                    controlledNameFilter.value = ['Jim']
                    controlledAddressFilter.value = ['London']
                    syncControlledSortColumns()
                  }}
                >
                  Jim + London
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    controlledNameFilter.value = []
                    controlledAddressFilter.value = []
                    syncControlledSortColumns()
                  }}
                >
                  清空筛选
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => {
                    controlledNameFilter.value = []
                    controlledAddressFilter.value = []
                    controlledSorter.value = { columnKey: null, order: null }
                    syncControlledSortColumns()
                  }}
                >
                  清空全部
                </button>
                <span className="opacity-70">
                  筛选：Name {controlledNameFilter.value.join(', ') || '无'} / Address{' '}
                  {controlledAddressFilter.value.join(', ') || '无'}； 当前排序：
                  {getControlledSortFieldText()} / {getControlledSortOrderText()}
                </span>
              </div>
              <Table
                className="w-full"
                columns={controlledSortColumns.value}
                dataSource={controlledDemoRows}
                sortDirections={['descend', 'ascend']}
                onChange={(_paginationValue: any, filters: any, sorter: any) => {
                  controlledNameFilter.value =
                    Array.isArray(filters?.name) && filters.name.length > 0 ? filters.name : []
                  controlledAddressFilter.value =
                    Array.isArray(filters?.address) && filters.address.length > 0
                      ? filters.address
                      : []
                  const nextSorter = Array.isArray(sorter) ? sorter[0] : sorter
                  controlledSorter.value = {
                    columnKey: nextSorter?.order ? (nextSorter?.columnKey ?? null) : null,
                    order: nextSorter?.order ?? null,
                  }
                  syncControlledSortColumns()
                }}
              />
            </div>
          )}
          code={controlledSortExampleCode}
        />

        <ExampleBlock
          title="多列排序（优先级组合）"
          summary="补回多列优先级排序示例，支持 { compare, multiple } 并按优先级组合排序。"
          tab={tabMultipleSorter}
          preview={() => (
            <div className="space-y-4 rounded-box border border-base-300 bg-base-100 p-4">
              <div className="flex flex-wrap gap-2 text-sm">
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => setMultiSortPreset({ chinese: 'descend', math: 'descend' })}
                >
                  语文 + 数学降序
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() =>
                    setMultiSortPreset({
                      chinese: 'descend',
                      math: 'descend',
                      english: 'descend',
                    })
                  }
                >
                  三科降序
                </button>
                <button
                  className="btn btn-ghost btn-xs"
                  onClick={() => setMultiSortPreset({ chinese: 'ascend', english: 'descend' })}
                >
                  语文升序 + 英语降序
                </button>
                <button className="btn btn-ghost btn-xs" onClick={() => setMultiSortPreset({})}>
                  清空排序
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {multipleSortOptions.map(option => (
                  <button
                    key={option.key}
                    className={`btn btn-xs ${
                      multiSortOrders.value[option.key] ? 'btn-primary' : 'btn-ghost'
                    }`}
                    onClick={() => cycleMultiSort(option.key)}
                  >
                    {getMultiSortButtonText(option)}
                  </button>
                ))}
                <span className="opacity-70">当前优先级：{getMultiSortSummary()}</span>
              </div>
              <Table
                className="w-full"
                columns={multipleSorterColumns.value}
                dataSource={multipleSorterRows}
                sortDirections={['descend', 'ascend']}
                onChange={(_paginationValue: any, _filters: any, sorter: any) => {
                  const sorters = Array.isArray(sorter) ? sorter : sorter?.order ? [sorter] : []
                  multiSortOrders.value = sorters.reduce((acc: MultiSortOrderMap, item: any) => {
                    const columnKey = item?.columnKey
                    const order = item?.order
                    if (isMultiSortColumnKey(columnKey) && isActiveSortOrder(order)) {
                      acc[columnKey] = order
                    }
                    return acc
                  }, {})
                  syncMultipleSorterColumns()
                }}
              />
            </div>
          )}
          code={multipleSorterExampleCode}
        />

        <ExampleBlock
          title="动态列显隐"
          summary="把基础的隐藏列示例 补回来，并用外部开关控制列可见性。"
          tab={tabColumnToggle}
          preview={() => (
            <div className="space-y-4 rounded-box border border-base-300 bg-base-100 p-4">
              <div className="flex flex-wrap gap-2 text-sm">
                {columnToggleOptions.map(option => {
                  const active = visibleColumnKeys.value.includes(option.key)
                  return (
                    <button
                      key={option.key}
                      className={`btn btn-xs ${active ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => toggleColumnVisibility(option.key)}
                    >
                      {active ? `隐藏 ${option.label}` : `显示 ${option.label}`}
                    </button>
                  )
                })}
              </div>
              <Table
                className="w-full"
                columns={columnToggleColumns.value}
                dataSource={historicColumnRows}
              />
            </div>
          )}
          code={columnToggleExampleCode}
        />

        <ExampleBlock
          title="选择模式"
          summary="展示多选、单选、禁用项、部分禁用几类示例，并增加选择列表头与回调展示。"
          tab={tabSelection}
          preview={() => (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-box border border-base-300 bg-base-100 p-4">
                <div className="mb-3 text-sm">
                  多选：当前 {selectedKeys.value.join(', ') || '空'}
                </div>
                <Table
                  className="w-full"
                  columns={[
                    { title: '姓名', dataIndex: 'name' },
                    { title: '团队', dataIndex: 'team' },
                    { title: '状态', dataIndex: 'status' },
                  ]}
                  dataSource={baseUsers}
                  rowSelection={{
                    columnTitle: '成员',
                    selectedRowKeys: selectedKeys.value,
                    getCheckboxProps: record => ({
                      disabled: record.status === 'leave',
                    }),
                    onChange: keys => (selectedKeys.value = [...keys]),
                  }}
                />
              </div>
              <div className="rounded-box border border-base-300 bg-base-100 p-4">
                <div className="mb-3 text-sm">单选：当前 {selectedRadio.value[0] ?? '空'}</div>
                <Table
                  className="w-full"
                  columns={[
                    { title: '姓名', dataIndex: 'name' },
                    { title: '城市', dataIndex: 'city' },
                  ]}
                  dataSource={baseUsers.slice(0, 4)}
                  rowSelection={{
                    type: 'radio',
                    hideSelectAll: true,
                    selectedRowKeys: selectedRadio.value,
                    onChange: keys => (selectedRadio.value = [...keys]),
                  }}
                />
              </div>
            </div>
          )}
          code={selectionExampleCode}
        />

        <ExampleBlock
          title="展开、摘要与空态"
          summary="把展开行、按行点击展开、summary 和 emptyText 放在同一个业务场景里。"
          tab={tabExpand}
          preview={() => (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-box border border-base-300 bg-base-100 p-4">
                <Table
                  className="w-full"
                  columns={[
                    { title: '姓名', dataIndex: 'name' },
                    { title: '绩效', dataIndex: 'score', align: 'right' },
                  ]}
                  dataSource={baseUsers}
                  expandable={{
                    expandedRowKeys: expandedKeys.value,
                    expandRowByClick: true,
                    onExpandedRowsChange: keys => (expandedKeys.value = [...keys]),
                    expandedRowRender: record => (
                      <div className="text-sm leading-6">
                        <div>团队：{record.team}</div>
                        <div>地址：{record.address}</div>
                      </div>
                    ),
                  }}
                  summary={(rows: any[]) => (
                    <div className="flex justify-between text-sm">
                      <span>当前行数：{rows.length}</span>
                      <span>
                        平均绩效：
                        {Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length)}
                      </span>
                    </div>
                  )}
                />
              </div>
              <div className="rounded-box border border-base-300 bg-base-100 p-4">
                <Table
                  className="w-full"
                  columns={[
                    { title: '姓名', dataIndex: 'name' },
                    { title: '团队', dataIndex: 'team' },
                  ]}
                  dataSource={[]}
                  emptyText={<span className="text-sm opacity-60">暂无成员，请先创建数据。</span>}
                />
              </div>
            </div>
          )}
          code={expandExampleCode}
        />

        <ExampleBlock
          title="滚动、标题、尾部与省略"
          summary="展示滚动、title/footer、ellipsis 和滚动容器类示例，并串成一个长表格布局场景。"
          tab={tabLayout}
          preview={() => (
            <div className="rounded-box border border-base-300 bg-base-100 p-4">
              <Table
                className="w-full"
                columns={scrollColumns}
                dataSource={baseUsers.concat(baseUsers).concat(baseUsers)}
                scroll={{ x: 900, y: 220, scrollToFirstRowOnChange: true }}
                title={rows => (
                  <div className="text-sm font-medium">成员列表（当前页 {rows.length} 行）</div>
                )}
                footer={_rows => (
                  <div className="text-sm opacity-70">展示了固定列、纵向滚动和 ellipsis。</div>
                )}
              />
            </div>
          )}
          code={layoutExampleCode}
        />

        <ExampleBlock
          title="分组表头、隐藏列与单元格属性"
          summary="分组表头示例同时覆盖隐藏列、单元格 className/style 和操作列。"
          tab={tabGrouped}
          preview={() => (
            <div className="space-y-4 rounded-box border border-base-300 bg-base-100 p-4">
              <div className="flex flex-wrap gap-2 text-sm">
                <button className="btn btn-ghost btn-xs" onClick={toggleSalaryColumn}>
                  {hideSalary.value ? '显示月薪列' : '隐藏月薪列'}
                </button>
                <span>最近操作：{clickedName.value}</span>
              </div>
              <Table
                className="w-full"
                columns={groupedColumns.value}
                dataSource={baseUsers}
                rowHoverable
                onRow={(record: any) => ({
                  onClick: () => (clickedName.value = `点击 ${record.name}`),
                })}
              />
            </div>
          )}
          code={groupedExampleCode}
        />

        <ExampleBlock
          title="静态样式、Pinned Rows 与 Pinned Cols"
          summary="基础静态样式示例 仍然提供，适合不需要 columns/dataSource 时直接写结构。"
          tab={tabStatic}
          preview={() => (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="h-72 overflow-auto rounded-box border border-base-300 bg-base-100 p-4">
                <Table zebra pinRows className="w-full min-w-[640px]">
                  <Table.Head>
                    <Table.TR>
                      <Table.TH>商品</Table.TH>
                      <Table.TH>负责人</Table.TH>
                      <Table.TH>渠道</Table.TH>
                      <Table.TH className="text-right">库存</Table.TH>
                      <Table.TH className="text-right">价格</Table.TH>
                    </Table.TR>
                  </Table.Head>
                  <Table.Body>
                    {staticPinnedRows.map(row => (
                      <Table.TR key={row.id}>
                        <Table.TD>{row.item}</Table.TD>
                        <Table.TD>{row.owner}</Table.TD>
                        <Table.TD>{row.channel}</Table.TD>
                        <Table.TD className="text-right">{row.stock}</Table.TD>
                        <Table.TD className="text-right">{row.price}</Table.TD>
                      </Table.TR>
                    ))}
                  </Table.Body>
                </Table>
              </div>
              <div className="rounded-box border border-base-300 bg-base-100 p-4 overflow-x-auto">
                <Table pinCols className="w-[980px]">
                  <Table.Head>
                    <Table.TR>
                      <Table.TH className="bg-base-100">姓名</Table.TH>
                      <Table.TH>岗位</Table.TH>
                      <Table.TH>团队</Table.TH>
                      <Table.TH>城市</Table.TH>
                      <Table.TH className="text-right">绩效</Table.TH>
                      <Table.TH className="text-right">访问</Table.TH>
                      <Table.TH className="text-right">月薪</Table.TH>
                      <Table.TH>地址</Table.TH>
                    </Table.TR>
                  </Table.Head>
                  <Table.Body>
                    {staticPinColumnRows.map(row => (
                      <Table.TR key={row.key}>
                        <Table.TH className="bg-base-100">{row.name}</Table.TH>
                        <Table.TD>{row.role}</Table.TD>
                        <Table.TD>{row.team}</Table.TD>
                        <Table.TD>{row.city}</Table.TD>
                        <Table.TD className="text-right">{row.score}</Table.TD>
                        <Table.TD className="text-right">{row.visits}</Table.TD>
                        <Table.TD className="text-right">{row.salary}</Table.TD>
                        <Table.TD>{row.address}</Table.TD>
                      </Table.TR>
                    ))}
                  </Table.Body>
                </Table>
              </div>
            </div>
          )}
          code={staticExampleCode}
        />

        <h2 id="table-api">API</h2>
        <p>当前页面只列出 Rue Table 当前最常用的配置项，优先对应实际使用场景。</p>

        <h3>Table</h3>
        <ApiTable rows={tableApiRows} />

        <h3>Column</h3>
        <ApiTable rows={columnApiRows} />

        <h3>rowSelection</h3>
        <ApiTable rows={rowSelectionApiRows} />

        <h3>expandable</h3>
        <ApiTable rows={expandableApiRows} />

        <h2>FAQ</h2>
        <h3>数据驱动和静态结构怎么选？</h3>
        <p>
          需要排序、筛选、分页、选择、展开时优先使用 <code>columns + dataSource</code>
          。只想快速输出结构化样式， 或需要完全手写表格结构时，可以使用复合组件写法即可。
        </p>

        <h3>为什么筛选或排序后会回到第一页？</h3>
        <p>
          这是为了避免当前页在筛选后没有数据。如果你希望完全自行控制分页，把{' '}
          <code>pagination.current</code> 和<code>onChange</code> 一起受控即可。
        </p>

        <h3>固定列和 pinCols 的关系是什么？</h3>
        <p>
          <code>pinCols</code> 负责启用 daisyUI 的固定列视觉能力，具体哪一列固定则由列上的{' '}
          <code>fixedCol</code> 或 <code>fixed</code> 控制。静态结构写法中，通常把固定列单元格写成{' '}
          <code>TH</code> 会更自然。
        </p>
      </div>
    </SidebarPlayground>
  )
}

export default TableDemo
