import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import PreviewBlock, { type PreviewTabMode } from './PreviewBlock'
import TreeSelect, {
  type TreeSelectDataNode,
  type TreeSelectLabeledValue,
  type TreeSelectValue,
} from '../../../packages/rue-design/src/components/tree-select/index'

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

const extractSingleValue = (value: any) => {
  if (Array.isArray(value)) {
    return extractSingleValue(value[0])
  }
  if (value && typeof value === 'object' && 'value' in value) {
    return value.value as string | number
  }
  return value ?? null
}

const extractValueList = (value: any) => {
  if (!Array.isArray(value)) {
    const singleValue = extractSingleValue(value)
    return singleValue === null || singleValue === undefined ? [] : [singleValue]
  }

  return value
    .map(item => extractSingleValue(item))
    .filter(item => item !== null && item !== undefined) as Array<string | number>
}

const organizationTree: TreeSelectDataNode[] = [
  {
    title: '产品平台',
    value: 'platform',
    children: [
      { title: '文档中心', value: 'docs' },
      { title: '资源目录', value: 'assets' },
      { title: '组件市场', value: 'components' },
    ],
  },
  {
    title: '工程效率',
    value: 'engineering',
    children: [
      { title: '构建链路', value: 'build' },
      { title: '质量门禁', value: 'quality' },
      { title: '发布管道', value: 'release' },
    ],
  },
  {
    title: '增长分析',
    value: 'growth',
    children: [
      { title: '实验看板', value: 'experiment' },
      { title: '归因报表', value: 'attribution' },
      { title: '留存漏斗', value: 'retention' },
    ],
  },
]

const multipleTree: TreeSelectDataNode[] = [
  {
    title: '协作面板',
    value: 'workspace',
    children: [
      { title: '日报汇总', value: 'daily' },
      { title: '设计交接', value: 'handoff' },
      { title: '会议纪要', value: 'minutes' },
    ],
  },
  {
    title: '数据服务',
    value: 'data',
    children: [
      { title: '分析订阅', value: 'analytics' },
      { title: '实验指标', value: 'metrics' },
      { title: '异常告警', value: 'alerts' },
    ],
  },
]

const compactTree: TreeSelectDataNode[] = [
  {
    title: '应用集群',
    value: 'apps',
    children: [
      { title: '生产环境', value: 'prod' },
      { title: '预发环境', value: 'stage' },
      { title: '开发环境', value: 'dev' },
    ],
  },
]

const simpleTree = [
  { nodeId: 1, parentId: 0, code: 'workspace', name: 'Workspace' },
  { nodeId: 2, parentId: 1, code: 'workflow', name: 'Workflow board' },
  { nodeId: 3, parentId: 1, code: 'briefs', name: 'Briefs' },
  { nodeId: 4, parentId: 2, code: 'review', name: 'Design review' },
  { nodeId: 5, parentId: 2, code: 'release', name: 'Release checklist' },
]

const basicCode = `import { ref } from '@rue-js/rue'
import TreeSelect, { type TreeSelectDataNode } from '@rue-js/design'
const treeData: TreeSelectDataNode[] = [
  {
    title: '产品平台',
    value: 'platform',
    children: [
      { title: '文档中心', value: 'docs' },
      { title: '资源目录', value: 'assets' },
      { title: '组件市场', value: 'components' },
    ],
  },
  {
    title: '工程效率',
    value: 'engineering',
    children: [
      { title: '构建链路', value: 'build' },
      { title: '质量门禁', value: 'quality' },
      { title: '发布管道', value: 'release' },
    ],
  },
]

const value = ref('docs')

<TreeSelect
  value={value.value}
  treeData={treeData}
  treeDefaultExpandAll
  showSearch
  treeNodeFilterProp="title"
  allowClear
  placeholder="选择一个树节点"
  onChange={nextValue => {
    value.value = String(nextValue ?? '')
  }}
/>
`

const noClearCode = `import { ref } from '@rue-js/rue'
import TreeSelect, { type TreeSelectDataNode } from '@rue-js/design'
const treeData: TreeSelectDataNode[] = [
  {
    title: '产品平台',
    value: 'platform',
    children: [
      { title: '文档中心', value: 'docs' },
      { title: '资源目录', value: 'assets' },
      { title: '组件市场', value: 'components' },
    ],
  },
]

const value = ref('docs')

<TreeSelect
  value={value.value}
  treeData={treeData}
  treeDefaultExpandAll
  onChange={nextValue => {
    value.value = String(nextValue ?? '')
  }}
/>
`

const simpleModeCode = `import { ref } from '@rue-js/rue'
import TreeSelect from '@rue-js/design'

const treeData = [
  { nodeId: 1, parentId: 0, code: 'workspace', name: 'Workspace' }, { nodeId: 2, parentId: 1, code: 'workflow', name: 'Workflow board' }, { nodeId: 3, parentId: 1, code: 'briefs', name: 'Briefs' }, { nodeId: 4, parentId: 2, code: 'review', name: 'Design review' }, { nodeId: 5, parentId: 2, code: 'release', name: 'Release checklist' }, ]

const value = ref('workflow')

<TreeSelect
  value={value.value}
  treeData={treeData}
  treeDataSimpleMode={{ id: 'nodeId', pId: 'parentId', rootPId: 0 }}
  fieldNames={{ value: 'code', label: 'name', key: 'code' }}
  treeDefaultExpandAll
  showSearch
  treeNodeFilterProp="title"
  allowClear
  onChange={nextValue => {
    value.value = String(nextValue ?? '')
  }}
/>
`

const multipleCode = `import { ref } from '@rue-js/rue'
import TreeSelect, { type TreeSelectValue, type TreeSelectDataNode } from '@rue-js/design'
const treeData: TreeSelectDataNode[] = [
  {
    title: '协作面板',
    value: 'workspace',
    children: [
      { title: '日报汇总', value: 'daily' },
      { title: '设计交接', value: 'handoff' },
      { title: '会议纪要', value: 'minutes' },
    ],
  },
  {
    title: '数据服务',
    value: 'data',
    children: [
      { title: '分析订阅', value: 'analytics' },
      { title: '实验指标', value: 'metrics' },
      { title: '异常告警', value: 'alerts' },
    ],
  },
]

const values = ref<TreeSelectValue[]>(['analytics', 'minutes'])
const open = ref(false)

<TreeSelect
  value={values.value}
  open={open.value}
  treeData={treeData}
  multiple
  treeDefaultExpandAll
  allowClear
  maxTagCount={2}
  placeholder="选择多个项目"
  onOpenChange={nextOpen => {
    open.value = nextOpen
  }}
  onChange={(nextValue, _label, extra) => {
    values.value = Array.isArray(nextValue) ? nextValue.map(item => String(item)) : []
    if (!extra.clear) open.value = true
  }}
/>
`

const checkableCode = `import { ref } from '@rue-js/rue'
import TreeSelect, { type TreeSelectValue, type TreeSelectDataNode } from '@rue-js/design'
const treeData: TreeSelectDataNode[] = [
  {
    title: '产品平台',
    value: 'platform',
    children: [
      { title: '文档中心', value: 'docs' },
      { title: '资源目录', value: 'assets' },
      { title: '组件市场', value: 'components' },
    ],
  },
  {
    title: '工程效率',
    value: 'engineering',
    children: [
      { title: '构建链路', value: 'build' },
      { title: '质量门禁', value: 'quality' },
      { title: '发布管道', value: 'release' },
    ],
  },
]

const values = ref<TreeSelectValue[]>(['build', 'quality'])
const open = ref(false)

<TreeSelect
  value={values.value}
  open={open.value}
  treeData={treeData}
  treeCheckable
  maxTagCount={2}
  maxTagPlaceholder="..."
  allowClear
  treeDefaultExpandAll
  onOpenChange={nextOpen => {
    open.value = nextOpen
  }}
  onChange={(nextValue, _label, extra) => {
    values.value = Array.isArray(nextValue) ? nextValue.map(item => String(item)) : []
    if (!extra.clear) open.value = true
  }}
/>
`

const semanticCode = `import { ref } from '@rue-js/rue'
import TreeSelect, { type TreeSelectDataNode, type TreeSelectLabeledValue } from '@rue-js/design'
const treeData: TreeSelectDataNode[] = [
  {
    title: '产品平台',
    value: 'platform',
    children: [
      { title: '文档中心', value: 'docs' },
      { title: '资源目录', value: 'assets' },
      { title: '组件市场', value: 'components' },
    ],
  },
  {
    title: '工程效率',
    value: 'engineering',
    children: [
      { title: '构建链路', value: 'build' },
      { title: '质量门禁', value: 'quality' },
      { title: '发布管道', value: 'release' },
    ],
  },
]

const selected = ref<TreeSelectLabeledValue | null>({
  value: 'release',
  key: 'release',
  label: '发布管道',
})

<TreeSelect
  value={selected.value}
  treeData={treeData}
  labelInValue
  treeDefaultExpandAll
  onChange={nextValue => {
    selected.value = (nextValue as TreeSelectLabeledValue | null) ?? null
  }}
/>
`

const asyncCode = `import { ref } from '@rue-js/rue'
import TreeSelect, { type TreeSelectDataNode, type TreeSelectValue } from '@rue-js/design'
const value = ref<string | null>(null)
const expandedKeys = ref<TreeSelectValue[]>([])
const treeData = ref<TreeSelectDataNode[]>([
  { title: '按需加载目录', value: 'async-root', isLeaf: false },
])

const loadData = async (node: TreeSelectDataNode) => {
  if (node.value !== 'async-root') return

  treeData.value = [
    {
      title: '按需加载目录',
      value: 'async-root',
      isLeaf: false,
      children: [
        { title: '实验看板', value: 'async-dashboard' },
        { title: '巡检报告', value: 'async-report' },
        { title: '回归清单', value: 'async-checklist' },
      ],
    },
  ]
}

<TreeSelect
  value={value.value}
  treeExpandedKeys={expandedKeys.value}
  treeData={treeData.value}
  allowClear
  loadData={loadData}
  onTreeExpand={nextKeys => {
    expandedKeys.value = nextKeys
  }}
  onChange={nextValue => {
    value.value = nextValue == null ? null : String(nextValue)
  }}
/>
`

const shellCode = `import { ref } from '@rue-js/rue'
import TreeSelect, { type TreeSelectDataNode } from '@rue-js/design'
const treeData: TreeSelectDataNode[] = [
  {
    title: '应用集群',
    value: 'apps',
    children: [
      { title: '生产环境', value: 'prod' },
      { title: '预发环境', value: 'stage' },
      { title: '开发环境', value: 'dev' },
    ],
  },
]

const value = ref('prod')

<TreeSelect
  value={value.value}
  treeData={treeData}
  prefix={<span className="badge badge-neutral badge-sm">ENV</span>}
  suffix={<span className="text-xs opacity-60">可清空</span>}
  variant="filled"
  status="warning"
  allowClear
  treeDefaultExpandAll
  onChange={nextValue => {
    value.value = String(nextValue ?? '')
  }}
/>
`

const apiRows: ApiRow[] = [
  {
    prop: 'allowClear',
    description: '追加清空按钮，适合单选、多选和勾选模式统一收敛到一个入口',
    type: 'boolean | { clearIcon?: any }',
    defaultValue: 'false',
  },
  {
    prop: 'fieldNames',
    description: '映射 label、value、children、key 与 simple mode 的 id / pId 字段',
    type: 'TreeSelectFieldNames',
    defaultValue: '{ title, value, children, key }',
  },
  {
    prop: 'labelInValue',
    description: '把回填值组织为 { value, key, label, halfChecked } 结构',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'loadData',
    description: '展开未加载节点时触发异步加载，适合目录、权限树、远端分类场景',
    type: '(node) => Promise<any> | void',
    defaultValue: '-',
  },
  {
    prop: 'maxCount',
    description: '限制多选 / 勾选模式下最多展示并回填多少个节点',
    type: 'number',
    defaultValue: '-',
  },
  {
    prop: 'multiple',
    description: '多选模式，已选项会回填为标签列表',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'showCheckedStrategy',
    description: '控制 treeCheckable 时的回填策略，支持 SHOW_ALL / SHOW_PARENT / SHOW_CHILD',
    type: 'TreeSelectShowCheckedStrategy',
    defaultValue: 'SHOW_CHILD',
  },
  {
    prop: 'showSearch',
    description: '开启搜索输入；对象模式可配置 autoClearSearchValue、filterTreeNode 与 onSearch',
    type: 'boolean | TreeSelectShowSearchConfig',
    defaultValue: '单选 false / 多选 true',
  },
  {
    prop: 'treeCheckable',
    description: '把树节点切到 checkbox 模式，适合权限树、发布范围、分类选择',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'treeData',
    description: '树数据源，title / value / children 为常用字段，value 在整棵树里需要唯一',
    type: 'TreeSelectDataNode[]',
    defaultValue: '[]',
  },
  {
    prop: 'treeDataSimpleMode',
    description: '接收扁平结构树数据，并通过 id / pId 自动恢复层级',
    type: 'boolean | { id?: string; pId?: string; rootPId?: string | number | null }',
    defaultValue: 'false',
  },
  {
    prop: 'treeDefaultExpandAll / treeExpandedKeys',
    description: '控制树默认展开和受控展开，便于做大树分层浏览',
    type: 'boolean / TreeSelectValue[]',
    defaultValue: 'false / -',
  },
  {
    prop: 'treeNodeFilterProp',
    description: '搜索命中用的字段，常见设置是 title 或自定义 label 字段',
    type: 'string',
    defaultValue: 'value',
  },
  {
    prop: 'variant / status',
    description:
      '使用 Rue 输入类组件的视觉语义，支持 filled、borderless、underlined 与 warning/error',
    type: "'outlined' | 'filled' | 'borderless' | 'underlined' / 'warning' | 'error'",
    defaultValue: "'outlined' / -",
  },
]

const TreeSelectPage: FC = () => {
  const basicValue = ref('docs')
  const noClearValue = ref('docs')
  const simpleValue = ref('workflow')
  const multipleValue = ref<Array<string | number>>(['analytics', 'minutes'])
  const multipleOpen = ref(false)
  const checkableValue = ref<Array<string | number>>(['build', 'quality'])
  const checkableOpen = ref(false)
  const semanticValue = ref<TreeSelectLabeledValue | null>({
    value: 'release',
    key: 'release',
    label: '发布管道',
  })
  const shellValue = ref('prod')
  const asyncValue = ref<string | null>(null)
  const asyncExpandedKeys = ref<TreeSelectValue[]>([])
  const asyncTreeData = ref<TreeSelectDataNode[]>([
    { title: '按需加载目录', value: 'async-root', isLeaf: false },
  ])

  const loadAsyncTree = async (node: TreeSelectDataNode | any) => {
    if (node.value !== 'async-root') return
    asyncTreeData.value = [
      {
        title: '按需加载目录',
        value: 'async-root',
        isLeaf: false,
        children: [
          { title: '实验看板', value: 'async-dashboard' },
          { title: '巡检报告', value: 'async-report' },
          { title: '回归清单', value: 'async-checklist' },
        ],
      },
    ]
  }

  const tabs = {
    basic: ref<PreviewTabMode>('preview'),
    noClear: ref<PreviewTabMode>('preview'),
    simple: ref<PreviewTabMode>('preview'),
    multiple: ref<PreviewTabMode>('preview'),
    checkable: ref<PreviewTabMode>('preview'),
    semantic: ref<PreviewTabMode>('preview'),
    async: ref<PreviewTabMode>('preview'),
    shell: ref<PreviewTabMode>('preview'),
  }

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>TreeSelect 树选择</h1>
        <p className="text-sm mt-3 mb-3">
          TreeSelect 适合“下拉选择 +
          树结构浏览”同时存在的输入场景，比如目录、组织架构、权限树、资源分类和发布范围。 视觉使用
          Rue 的 input / badge / base 色阶体系，能力覆盖 treeData、simple mode、多选、
          勾选、语义值、异步加载和 filled / warning 等核心场景。
        </p>

        <div className="not-prose mt-8 space-y-2">
          <h2 className="text-2xl font-semibold">基础能力</h2>
          <p className="text-sm text-base-content/70">
            先把单选、搜索和清空打稳，再把 simple mode、多选与勾选这些更接近业务配置面的能力接进来。
          </p>
        </div>

        <PreviewBlock
          title="Basic"
          summary="单选、搜索、默认展开与 allowClear 的组合，是目录选择最常见的入口。"
          tab={tabs.basic}
          preview={
            <div className="card border border-base-200/80 bg-base-100 shadow-sm">
              <div className="card-body gap-3">
                <TreeSelect
                  value={basicValue.value}
                  treeData={organizationTree}
                  treeDefaultExpandAll
                  showSearch
                  treeNodeFilterProp="title"
                  allowClear
                  placeholder="选择一个树节点"
                  onChange={nextValue => {
                    basicValue.value = String(extractSingleValue(nextValue) ?? '')
                  }}
                />
                <div className="text-sm text-base-content/70">
                  当前节点：{basicValue.value || '未选择'}
                </div>
              </div>
            </div>
          }
          code={basicCode}
        />

        <PreviewBlock
          title="Without allowClear"
          summary="未开启 allowClear 时，只保持选择交互，不显示 selector 右侧的清空入口。"
          tab={tabs.noClear}
          preview={
            <div className="card border border-base-200/80 bg-base-100 shadow-sm">
              <div className="card-body gap-3">
                <TreeSelect
                  value={noClearValue.value}
                  treeData={organizationTree}
                  treeDefaultExpandAll
                  onChange={nextValue => {
                    noClearValue.value = String(extractSingleValue(nextValue) ?? '')
                  }}
                />
                <div className="text-sm text-base-content/70">
                  当前节点：{noClearValue.value || '未选择'}
                </div>
              </div>
            </div>
          }
          code={noClearCode}
        />

        <PreviewBlock
          title="Simple Mode"
          summary="扁平树数据直接接入，适合后端给的是 id / pId 结构时减少前置整理成本。"
          tab={tabs.simple}
          preview={
            <div className="card border border-base-200/80 bg-base-100 shadow-sm">
              <div className="card-body grid gap-4 lg:grid-cols-[minmax(0,24rem),1fr] lg:items-start">
                <div className="grid gap-3">
                  <TreeSelect
                    value={simpleValue.value}
                    treeData={simpleTree as any}
                    treeDataSimpleMode={{ id: 'nodeId', pId: 'parentId', rootPId: 0 }}
                    fieldNames={{ value: 'code', label: 'name', key: 'code' }}
                    treeDefaultExpandAll
                    showSearch
                    treeNodeFilterProp="title"
                    allowClear
                    onChange={nextValue => {
                      simpleValue.value = String(extractSingleValue(nextValue) ?? '')
                    }}
                  />
                  <div className="text-sm text-base-content/70">
                    当前目标：{simpleValue.value || '未选择'}
                  </div>
                </div>
                <div className="rounded-box border border-dashed border-base-300 bg-base-100/80 p-4 text-sm text-base-content/70">
                  这类接口在 CMS、流程平台、低代码配置里很常见。只要给出 id / pId / value / title
                  映射，就能直接恢复成可搜索树。
                </div>
              </div>
            </div>
          }
          code={simpleModeCode}
        />

        <PreviewBlock
          title="Multiple"
          summary="多选模式默认以标签回填，适合通知订阅、面板订阅、资源批量绑定。"
          tab={tabs.multiple}
          preview={
            <div className="card border border-base-200/80 bg-base-100 shadow-sm">
              <div className="card-body gap-3">
                <TreeSelect
                  value={multipleValue.value}
                  open={multipleOpen.value}
                  treeData={multipleTree}
                  multiple
                  treeDefaultExpandAll
                  allowClear
                  maxTagCount={2}
                  placeholder="选择多个项目"
                  onOpenChange={nextOpen => {
                    multipleOpen.value = nextOpen
                  }}
                  onChange={(nextValue, _label, extra) => {
                    multipleValue.value = extractValueList(nextValue)
                    if (!extra.clear) multipleOpen.value = true
                  }}
                />
                <div className="text-sm text-base-content/70">
                  已选：{multipleValue.value.join(' / ') || '未选择'}
                </div>
              </div>
            </div>
          }
          code={multipleCode}
        />

        <PreviewBlock
          title="Checkable"
          summary="勾选树会把多选语义进一步贴近权限树和发布范围；默认 SHOW_CHILD 会直接回填实际勾选的子节点。"
          tab={tabs.checkable}
          preview={
            <div className="card border border-base-200/80 bg-base-100 shadow-sm">
              <div className="card-body grid gap-4 lg:grid-cols-[minmax(0,24rem),1fr] lg:items-start">
                <div className="grid gap-3">
                  <TreeSelect
                    value={checkableValue.value}
                    open={checkableOpen.value}
                    treeData={organizationTree}
                    treeCheckable
                    maxTagCount={2}
                    maxTagPlaceholder="..."
                    allowClear
                    treeDefaultExpandAll
                    onOpenChange={nextOpen => {
                      checkableOpen.value = nextOpen
                    }}
                    onChange={(nextValue, _label, extra) => {
                      checkableValue.value = extractValueList(nextValue)
                      if (!extra.clear) checkableOpen.value = true
                    }}
                  />
                  <div className="text-sm text-base-content/70">
                    回填：{checkableValue.value.join(' / ') || '未选择'}
                  </div>
                </div>
                <ul className="list rounded-box border border-base-300 bg-base-200/40 p-4 text-sm">
                  <li className="list-row">
                    <span className="font-medium">策略</span>
                    <span className="list-col-grow text-base-content/70">
                      当前示例使用默认
                      SHOW_CHILD，选了哪些子节点就回填哪些子节点，更适合精确范围选择。
                    </span>
                  </li>
                  <li className="list-row">
                    <span className="font-medium">切换</span>
                    <span className="list-col-grow text-base-content/70">
                      如果业务更想要紧凑展示，可以把 showCheckedStrategy 改成
                      TreeSelect.SHOW_PARENT，让完整分组选中时折叠成父标签。
                    </span>
                  </li>
                  <li className="list-row">
                    <span className="font-medium">回填</span>
                    <span className="list-col-grow text-base-content/70">
                      当前示例最多展示两个标签，更多已选项会用 ... 收起，避免 selector 被撑成两排。
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          }
          code={checkableCode}
        />

        <div className="not-prose mt-10 space-y-2">
          <h2 className="text-2xl font-semibold">高级能力</h2>
          <p className="text-sm text-base-content/70">
            语义值、异步加载和外观变体覆盖配置类面板里的常见选择场景。
          </p>
        </div>

        <PreviewBlock
          title="Label In Value"
          summary="当业务既要 value 也要 label 时，直接回填结构体会更顺手。"
          tab={tabs.semantic}
          preview={
            <div className="card border border-base-200/80 bg-base-100 shadow-sm">
              <div className="card-body grid gap-4 lg:grid-cols-[minmax(0,22rem),1fr] lg:items-start">
                <div className="grid gap-3">
                  <TreeSelect
                    value={semanticValue.value}
                    treeData={organizationTree}
                    labelInValue
                    treeDefaultExpandAll
                    onChange={nextValue => {
                      semanticValue.value = (nextValue as TreeSelectLabeledValue | null) ?? null
                    }}
                  />
                </div>
                <div className="rounded-box border border-base-300 bg-base-200/40 p-4 text-sm text-base-content/70">
                  当前结构：<code>{JSON.stringify(semanticValue.value)}</code>
                </div>
              </div>
            </div>
          }
          code={semanticCode}
        />

        <PreviewBlock
          title="Async Load"
          summary="展开未加载分支时触发 loadData，适合远端目录、权限树和超大分类树。"
          tab={tabs.async}
          preview={
            <div className="card border border-base-200/80 bg-base-100 shadow-sm">
              <div className="card-body grid gap-4 lg:grid-cols-[minmax(0,22rem),1fr] lg:items-start">
                <div className="grid gap-3">
                  <TreeSelect
                    value={asyncValue.value}
                    treeExpandedKeys={asyncExpandedKeys.value}
                    treeData={asyncTreeData.value}
                    allowClear
                    loadData={loadAsyncTree}
                    onTreeExpand={nextKeys => {
                      asyncExpandedKeys.value = nextKeys
                    }}
                    onChange={nextValue => {
                      asyncValue.value = String(extractSingleValue(nextValue) ?? '')
                    }}
                  />
                  <div className="text-sm text-base-content/70">
                    当前节点：{asyncValue.value || '尚未选择'}
                  </div>
                </div>
                <div className="rounded-box border border-dashed border-base-300 bg-base-100/80 p-4 text-sm text-base-content/70">
                  第一次展开“按需加载目录”时会把子节点注入到
                  treeData，这个模式适合服务端分页目录和按需权限树。
                </div>
              </div>
            </div>
          }
          code={asyncCode}
        />

        <PreviewBlock
          title="Variant and Status"
          summary="TreeSelect 也使用 Rue 当前输入体系的 filled / warning 视觉语义。"
          tab={tabs.shell}
          preview={
            <div className="card border border-base-200/80 bg-base-100 shadow-sm">
              <div className="card-body grid gap-4 md:grid-cols-2">
                <div className="grid gap-3">
                  <TreeSelect
                    value={shellValue.value}
                    treeData={compactTree}
                    prefix={<span className="badge badge-neutral badge-sm">ENV</span>}
                    suffix={<span className="text-xs opacity-60">可清空</span>}
                    variant="filled"
                    status="warning"
                    allowClear
                    treeDefaultExpandAll
                    onChange={nextValue => {
                      shellValue.value = String(extractSingleValue(nextValue) ?? '')
                    }}
                  />
                  <div className="text-sm text-base-content/70">
                    当前环境：{shellValue.value || '未选择'}
                  </div>
                </div>
                <div className="rounded-box border border-base-300 bg-base-200/40 p-4 text-sm text-base-content/70">
                  prefix / suffix 让 TreeSelect
                  能自然落进环境切换、租户切换和带状态提醒的配置表单里。
                </div>
              </div>
            </div>
          }
          code={shellCode}
        />

        <div className="not-prose mt-10 space-y-4">
          <h2 className="text-2xl font-semibold">API</h2>
          <ApiTable rows={apiRows} />
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default TreeSelectPage
