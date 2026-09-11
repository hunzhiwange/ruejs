import type { FC } from '@rue-js/rue'
import { computed, ref } from '@rue-js/rue'
import { Tree } from '@rue-js/design'
import type {
  TreeCheckedKeysObject,
  TreeDataNode,
  TreeExpandAction,
  TreeKey,
  TreeDropInfo,
} from '../../../packages/rue-design/src/components/tree/index'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import PreviewBlock, { type PreviewTabMode } from './PreviewBlock'

interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
}

type LegacyNode = { id: string; name: string; open?: boolean; children?: LegacyNode[] }

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

const organizationTree: TreeDataNode[] = [
  {
    title: '产品平台',
    key: 'platform',
    children: [
      { title: '文档中心', key: 'docs-api' },
      { title: '组件市场', key: 'component-hub' },
      { title: '示例仓库', key: 'examples' },
    ],
  },
  {
    title: '工程效率',
    key: 'engineering',
    children: [
      { title: '构建链路', key: 'build-pipeline' },
      { title: '质量门禁', key: 'quality-gate' },
      { title: '发布管道', key: 'release-flow' },
    ],
  },
  {
    title: '增长分析',
    key: 'growth',
    children: [
      { title: '实验看板', key: 'experiment-board' },
      { title: '归因报表', key: 'attribution-report' },
      { title: '留存漏斗', key: 'retention-funnel' },
    ],
  },
]

const permissionTree: TreeDataNode[] = [
  {
    title: '发布总控',
    key: 'release-control',
    children: [
      {
        title: '前台站点',
        key: 'release-site',
        children: [
          { title: '首页编排', key: 'site-home' },
          { title: '价格页', key: 'site-pricing' },
        ],
      },
      {
        title: '运营链路',
        key: 'release-ops',
        children: [
          { title: '投放素材', key: 'ops-assets' },
          { title: '归因回传', key: 'ops-attribution' },
        ],
      },
      {
        title: '合规审查',
        key: 'release-compliance',
        children: [
          { title: '隐私条款', key: 'compliance-privacy' },
          { title: '审计记录', key: 'compliance-audit' },
        ],
      },
    ],
  },
]

const permissionDisabledTree: TreeDataNode[] = [
  {
    title: '权限控制',
    key: 'permission-disabled-root',
    children: [
      {
        title: '只读目录',
        key: 'readonly-folder',
        disabled: true,
        children: [
          { title: '首页编排', key: 'readonly-home' },
          { title: '价格页', key: 'readonly-pricing' },
        ],
      },
      {
        title: '可编辑目录',
        key: 'editable-folder',
        children: [
          { title: '投放素材', key: 'editable-assets' },
          { title: '归因回传', key: 'editable-attribution', disableCheckbox: true },
        ],
      },
      {
        title: '审计日志（仅禁用复选框）',
        key: 'audit-log',
        disableCheckbox: true,
      },
    ],
  },
]

const simpleModeTree = [
  { nodeId: 1, parentId: 0, code: 'workspace', name: 'Workspace' },
  { nodeId: 2, parentId: 1, code: 'workflow', name: 'Workflow board' },
  { nodeId: 3, parentId: 1, code: 'briefs', name: 'Briefs' },
  { nodeId: 4, parentId: 2, code: 'review', name: 'Design review' },
  { nodeId: 5, parentId: 2, code: 'release', name: 'Release checklist' },
  { nodeId: 6, parentId: 3, code: 'content', name: 'Content drafts' },
]

const directoryTree: TreeDataNode[] = [
  {
    title: 'app',
    key: 'dir-app',
    children: [
      {
        title: 'pages',
        key: 'dir-pages',
        children: [
          { title: 'Tree.tsx', key: 'file-tree-page' },
          { title: 'Transfer.tsx', key: 'file-transfer-page' },
        ],
      },
      {
        title: 'site',
        key: 'dir-site',
        children: [{ title: 'SidebarPlaygroundDesign.tsx', key: 'file-sidebar' }],
      },
    ],
  },
  {
    title: 'packages',
    key: 'dir-packages',
    children: [
      { title: 'runtime', key: 'dir-runtime' },
      { title: 'rue-design', key: 'dir-rue-design' },
    ],
  },
  { title: 'README.md', key: 'file-readme' },
]

const directoryRangeTree: TreeDataNode[] = [
  { title: 'alpha.ts', key: 'range-alpha' },
  { title: 'beta.ts', key: 'range-beta' },
  { title: 'gamma.ts', key: 'range-gamma' },
  { title: 'delta.ts', key: 'range-delta' },
  { title: 'epsilon.ts', key: 'range-epsilon' },
]

const dragTreeSeed: TreeDataNode[] = [
  {
    title: 'src',
    key: 'drag-src',
    kind: 'folder',
    children: [
      {
        title: 'components',
        key: 'drag-components',
        kind: 'folder',
        children: [
          { title: 'Tree.tsx', key: 'drag-tree-file', kind: 'file' },
          { title: 'Transfer.tsx', key: 'drag-transfer-file', kind: 'file' },
        ],
      },
      { title: 'main.ts', key: 'drag-main-file', kind: 'file' },
    ],
  },
  {
    title: 'docs',
    key: 'drag-docs',
    kind: 'folder',
    children: [
      { title: 'routing.md', key: 'drag-routing-file', kind: 'file' },
      { title: 'installation.md', key: 'drag-install-file', kind: 'file' },
    ],
  },
  { title: 'package.json', key: 'drag-package-file', kind: 'file' },
]

const virtualTreeData: TreeDataNode[] = Array.from({ length: 120 }, (_, index) => ({
  title: `Page ${String(index + 1).padStart(3, '0')}`,
  key: `virtual-${index}`,
}))

const asyncVirtualTreeSeed: TreeDataNode[] = Array.from({ length: 64 }, (_, index) => ({
  title: `Workspace ${String(index + 1).padStart(2, '0')}`,
  key: `async-virtual-root-${index}`,
  isLeaf: false,
}))

const basicCode = `import { ref } from '@rue-js/rue'
import { Tree } from '@rue-js/design'
const selectedKeys = ref(['docs-api'])

<div className="space-y-4">
  <Tree
    treeData={organizationTree}
    selectedKeys={selectedKeys.value}
    defaultExpandAll
    showIcon
    blockNode
    onSelect={nextKeys => {
      selectedKeys.value = nextKeys as string[]
    }}
  />

  <div className="grid gap-3 md:grid-cols-3">
    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
      <div className="text-xs text-base-content/45">当前选中</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {selectedKeys.value.length ? (
          selectedKeys.value.map(key => (
            <span key={String(key)} className="badge badge-outline badge-sm">
              {String(key)}
            </span>
          ))
        ) : (
          <span className="text-sm text-base-content/55">未选择</span>
        )}
      </div>
    </div>
    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
      <div className="text-xs text-base-content/45">推荐场景</div>
      <div className="mt-2 text-sm text-base-content/75">组件目录、文档导航、资源分类</div>
    </div>
    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
      <div className="text-xs text-base-content/45">状态模型</div>
      <div className="mt-2 text-sm text-base-content/75">selectedKeys / expandedKeys 分离，便于受控更新。</div>
    </div>
  </div>
</div>`

const checkableCode = `import { ref } from '@rue-js/rue'
import { Tree } from '@rue-js/design'
const selectedKeys = ref<string[]>(['release-control'])
const checkedKeys = ref<string[]>(['site-home'])
const halfCheckedKeys = ref<string[]>(['release-control', 'release-site'])

const extractCheckedKeys = value => {
  return Array.isArray(value) ? value.map(String) : value.checked.map(String)
}

const extractHalfCheckedKeys = (value, info) => {
  if (Array.isArray(value)) {
    return info?.halfCheckedKeys?.map(String) ?? []
  }
  return value.halfChecked.map(String)
}

<div className="space-y-4">
  <Tree
    treeData={permissionTree}
    selectedKeys={selectedKeys.value}
    checkedKeys={checkedKeys.value}
    checkable
    defaultExpandAll
    showLine
    blockNode
    onSelect={nextKeys => {
      selectedKeys.value = nextKeys as string[]
    }}
    onCheck={(nextKeys, info) => {
      checkedKeys.value = extractCheckedKeys(nextKeys)
      halfCheckedKeys.value = extractHalfCheckedKeys(nextKeys, info)
    }}
  />

  <div className="grid gap-3 md:grid-cols-3">
    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
      <div className="text-xs text-base-content/45">selectedKeys</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {selectedKeys.value.length ? (
          selectedKeys.value.map(key => (
            <span key={String(key)} className="badge badge-outline badge-sm">
              {String(key)}
            </span>
          ))
        ) : (
          <span className="text-sm text-base-content/55">当前没有选中节点</span>
        )}
      </div>
    </div>
    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
      <div className="text-xs text-base-content/45">checkedKeys</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {checkedKeys.value.map(key => (
          <span key={String(key)} className="badge badge-primary badge-outline badge-sm">
            {String(key)}
          </span>
        ))}
      </div>
    </div>
    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
      <div className="text-xs text-base-content/45">halfCheckedKeys</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {halfCheckedKeys.value.length ? (
          halfCheckedKeys.value.map(key => (
            <span key={String(key)} className="badge badge-ghost badge-sm">
              {String(key)}
            </span>
          ))
        ) : (
          <span className="text-sm text-base-content/55">当前没有半选</span>
        )}
      </div>
    </div>
  </div>
</div>`

const checkableDisabledCode = `import { ref } from '@rue-js/rue'
import { Tree } from '@rue-js/design'
const checkedKeys = ref<string[]>(['editable-assets'])

<div className="grid gap-4 lg:grid-cols-[minmax(0,24rem),1fr] lg:items-start">
  <Tree
    treeData={permissionDisabledTree}
    checkedKeys={checkedKeys.value}
    checkable
    defaultExpandAll
    showLine
    blockNode
    onCheck={nextKeys => {
      checkedKeys.value = Array.isArray(nextKeys) ? nextKeys.map(String) : nextKeys.checked.map(String)
    }}
  />

  <div className="space-y-3">
    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
      <div className="text-xs text-base-content/45">当前勾选</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {checkedKeys.value.map(key => (
          <span key={String(key)} className="badge badge-outline badge-sm">
            {String(key)}
          </span>
        ))}
      </div>
    </div>
    <div className="rounded-box border border-dashed border-base-300 bg-base-100/80 p-4 text-sm text-base-content/70">
      <div>disabled：整节点不可展开、不可选中、不可勾选。</div>
      <div className="mt-2">disableCheckbox：节点仍可浏览，但复选框不参与交互。</div>
    </div>
  </div>
</div>`

const simpleModeCode = `import { ref } from '@rue-js/rue'
import { Tree } from '@rue-js/design'
const selectedKeys = ref(['workflow'])

<div className="grid gap-4 lg:grid-cols-[minmax(0,24rem),1fr] lg:items-start">
  <Tree
    treeData={simpleModeTree}
    treeDataSimpleMode={{ id: 'nodeId', pId: 'parentId', rootPId: 0 }}
    fieldNames={{ title: 'name', key: 'code' }}
    selectedKeys={selectedKeys.value}
    allowSearch
    defaultExpandAll
    onSelect={nextKeys => {
      selectedKeys.value = nextKeys as string[]
    }}
  />
  <div className="rounded-box border border-dashed border-base-300 bg-base-100/80 p-4 text-sm text-base-content/70">
    当前选中：<code>{JSON.stringify(selectedKeys.value)}</code>
    <div className="mt-3">
      这类 simple mode 很适合后端直接给 id / pId 的菜单、流程节点和权限项，不需要再先做一遍树转换。
    </div>
  </div>
</div>`

const asyncCode = `import { ref } from '@rue-js/rue'
import { Tree } from '@rue-js/design'
const treeData = ref([{ title: '发布总线', key: 'release-bus', isLeaf: false }])
const selectedKeys = ref<string[]>([])
const expandedKeys = ref<string[]>([])

const loadData = async node => {
  if (node.key !== 'release-bus') return
  treeData.value = [
    {
      title: '发布总线',
      key: 'release-bus',
      isLeaf: false,
      children: [
        {
          title: '桌面端',
          key: 'desktop',
          children: [
            { title: 'Windows', key: 'desktop-win' },
            { title: 'macOS', key: 'desktop-mac' },
          ],
        },
        {
          title: '移动端',
          key: 'mobile',
          children: [
            { title: 'iOS', key: 'mobile-ios' },
            { title: 'Android', key: 'mobile-android' },
          ],
        },
      ],
    },
  ]
}

<div className="grid gap-4 lg:grid-cols-[minmax(0,26rem),1fr] lg:items-start">
  <Tree
    treeData={treeData.value}
    selectedKeys={selectedKeys.value}
    expandedKeys={expandedKeys.value}
    loadData={loadData}
    showLine
    showIcon
    blockNode
    titleRender={({ node, loading }) => (
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="truncate">{node.title}</span>
        <span className="badge badge-ghost badge-xs">{loading ? 'loading' : node.children.length ? 'branch' : 'leaf'}</span>
      </div>
    )}
    onSelect={nextKeys => {
      selectedKeys.value = nextKeys as string[]
    }}
    onExpand={nextKeys => {
      expandedKeys.value = nextKeys as string[]
    }}
  />
  <div className="space-y-3">
    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
      <div className="text-xs text-base-content/45">expandedKeys</div>
      <div className="mt-2 text-sm text-base-content/75">{JSON.stringify(expandedKeys.value)}</div>
    </div>
    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
      <div className="text-xs text-base-content/45">selectedKeys</div>
      <div className="mt-2 text-sm text-base-content/75">{JSON.stringify(selectedKeys.value)}</div>
    </div>
    <div className="rounded-box border border-dashed border-base-300 bg-base-100/80 p-4 text-sm text-base-content/70">
      展开 release-bus 后才会注入桌面端和移动端节点，适合远端目录、超大权限树和发布范围配置。
    </div>
  </div>
</div>`

const directoryCode = `import { computed, ref } from '@rue-js/rue'
import { Tree } from '@rue-js/design'
const selectedKeys = ref(['dir-app'])
const expandAction = ref('click')
const toggleSelect = ref(true)
const rangeSelect = computed(() => (toggleSelect.value ? 'append' : false))

<div className="grid gap-4 lg:grid-cols-[minmax(0,24rem),1fr] lg:items-start">
  <Tree.DirectoryTree
    treeData={directoryTree}
    selectedKeys={selectedKeys.value}
    multiple
    expandAction={expandAction.value}
    toggleSelect={toggleSelect.value}
    rangeSelect={rangeSelect.get()}
    onSelect={nextKeys => {
      selectedKeys.value = nextKeys as string[]
    }}
  />
  <div className="space-y-3">
    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
      <div className="text-xs text-base-content/45">快捷属性</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={expandAction.value === 'click' ? 'btn btn-primary btn-xs' : 'btn btn-ghost btn-xs'}
          onClick={() => {
            expandAction.value = 'click'
          }}
        >
          click 展开
        </button>
        <button
          type="button"
          className={expandAction.value === 'doubleClick' ? 'btn btn-primary btn-xs' : 'btn btn-ghost btn-xs'}
          onClick={() => {
            expandAction.value = 'doubleClick'
          }}
        >
          doubleClick 展开
        </button>
        <button
          type="button"
          className={expandAction.value === false ? 'btn btn-primary btn-xs' : 'btn btn-ghost btn-xs'}
          onClick={() => {
            expandAction.value = false
          }}
        >
          只选中不展开
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className={toggleSelect.value ? 'btn btn-primary btn-xs' : 'btn btn-ghost btn-xs'}
          onClick={() => {
            toggleSelect.value = true
          }}
        >
          ctrl/meta 追加
        </button>
        <button
          type="button"
          className={!toggleSelect.value ? 'btn btn-primary btn-xs' : 'btn btn-ghost btn-xs'}
          onClick={() => {
            toggleSelect.value = false
          }}
        >
          关闭追加选择
        </button>
      </div>
    </div>
    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
      <div className="text-xs text-base-content/45">当前选择</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {selectedKeys.value.map(key => (
          <span key={String(key)} className="badge badge-outline badge-sm">
            {String(key)}
          </span>
        ))}
      </div>
    </div>
    <div className="rounded-box border border-dashed border-base-300 bg-base-100/80 p-4 text-sm text-base-content/70">
      当前组合是 expandAction=<strong>{String(expandAction.value)}</strong>、toggleSelect=<strong>{String(toggleSelect.value)}</strong>、rangeSelect=<strong>{String(rangeSelect.get())}</strong>。
      <div className="mt-3">
        这里专注看目录树的展开动作和“是否允许追加选择”：关闭后会一起停用 ctrl / meta 追加和 shift 区间选择；append / replace 的差异放到下一块对照示例里单独展示。
      </div>
    </div>
  </div>
</div>`

const directoryRangeCode = `import { ref } from '@rue-js/rue'
import { Tree } from '@rue-js/design'
const appendSelectedKeys = ref<string[]>([])
const replaceSelectedKeys = ref<string[]>([])
const treeVersion = ref(0)

const reset = () => {
  appendSelectedKeys.value = []
  replaceSelectedKeys.value = []
  treeVersion.value += 1
}

<div className="space-y-4">
  <div className="rounded-box border border-dashed border-base-300 bg-base-100/80 p-4 text-sm text-base-content/70">
    基础行为：先单击 alpha.ts，再按住 Shift 单击 epsilon.ts，alpha.ts 到 epsilon.ts 都会选中。
    <div className="mt-2">
      append / replace 只影响当前额外非连续选择是否保持：先单击 beta.ts，再按住 Cmd / Ctrl 单击 epsilon.ts，最后按住 Shift 单击 delta.ts。
    </div>
    <div className="mt-2">append 会保持 beta.ts；replace 只保持 delta.ts 到 epsilon.ts 这一段。</div>
  </div>

  <div className="grid gap-4 xl:grid-cols-2">
    <div className="space-y-3">
      <div className="text-sm font-semibold">rangeSelect=&quot;append&quot;</div>
      <Tree.DirectoryTree
        key={\`append-\${treeVersion.value}\`}
        treeData={directoryRangeTree}
        multiple
        toggleSelect
        rangeSelect="append"
        selectedKeys={appendSelectedKeys.value}
        onSelect={nextKeys => {
          appendSelectedKeys.value = nextKeys as string[]
        }}
      />
    </div>

    <div className="space-y-3">
      <div className="text-sm font-semibold">rangeSelect=&quot;replace&quot;</div>
      <Tree.DirectoryTree
        key={\`replace-\${treeVersion.value}\`}
        treeData={directoryRangeTree}
        multiple
        toggleSelect
        rangeSelect="replace"
        selectedKeys={replaceSelectedKeys.value}
        onSelect={nextKeys => {
          replaceSelectedKeys.value = nextKeys as string[]
        }}
      />
    </div>
  </div>
</div>`

const dragCode = `import { ref } from '@rue-js/rue'
import { Tree } from '@rue-js/design'
const treeData = ref(dragTreeSeed)
const dragSummary = ref('folder 支持放入；file 只允许插前和插后，悬停时会显示明确占位态。')

const allowDrop = ({ dropNode, dropToGap }) => {
  return dropToGap || dropNode.raw.kind !== 'file'
}

const handleDrop = info => {
  treeData.value = applyTreeDrop(treeData.value, info)
  dragSummary.value = \`\${String(info.dragNode.key)} -> \${String(info.node.key)} (\${
    info.dropToGap ? (info.dropPosition < 0 ? 'before' : 'after') : 'inside'
  })\`
}

<div className="grid gap-4 lg:grid-cols-[minmax(0,24rem),1fr] lg:items-start">
  <Tree
    treeData={treeData.value}
    draggable
    blockNode
    defaultExpandAll
    allowDrop={allowDrop}
    titleRender={({ node }) => (
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="truncate">{node.title}</span>
        <span className={node.raw.kind === 'folder' ? 'badge badge-ghost badge-xs' : 'badge badge-outline badge-xs'}>
          {node.raw.kind}
        </span>
      </div>
    )}
    onDrop={handleDrop}
  />
  <div className="space-y-3">
    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
      <div className="text-xs text-base-content/45">最近一次拖拽</div>
      <div className="mt-2 text-sm text-base-content/75">{dragSummary.value}</div>
    </div>
    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
      <div className="text-xs text-base-content/45">allowDrop 规则</div>
      <div className="mt-2 grid gap-2 text-sm text-base-content/75">
        <div>folder：允许放入，也允许插前 / 插后。</div>
        <div>file：只允许插前 / 插后，不允许作为 inside 目标。</div>
      </div>
    </div>
    <div className="rounded-box border border-dashed border-base-300 bg-base-100/80 p-4 text-sm text-base-content/70">
      拖到 folder 正中央会看到“放入”，拖到行的上沿或下沿则会出现“插前 / 插后”；如果目标是 file，inside 落点会被 allowDrop 直接拦掉。
    </div>
  </div>
</div>`

const virtualCode = `import { ref } from '@rue-js/rue'
import { Tree } from '@rue-js/design'
const treeData = Array.from({ length: 120 }, (_, index) => ({
  title: 'Page ' + String(index + 1).padStart(3, '0'),
  key: 'page-' + index,
}))
const selectedKeys = ref(['page-3'])

<div className="grid gap-4 lg:grid-cols-[minmax(0,24rem),1fr] lg:items-start">
  <Tree
    treeData={treeData}
    selectedKeys={selectedKeys.value}
    height={320}
    itemHeight={42}
    virtual
    blockNode
    onSelect={nextKeys => {
      selectedKeys.value = nextKeys as string[]
    }}
  />
  <div className="space-y-3">
    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
      <div className="text-xs text-base-content/45">数据量</div>
      <div className="mt-2 text-2xl font-semibold">{treeData.length}</div>
    </div>
    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
      <div className="text-xs text-base-content/45">当前选中</div>
      <div className="mt-2 text-sm text-base-content/75">{JSON.stringify(selectedKeys.value)}</div>
    </div>
    <div className="rounded-box border border-dashed border-base-300 bg-base-100/80 p-4 text-sm text-base-content/70">
      对文档页目录、埋点树、批量资源目录这种长列表场景，虚拟滚动能显著降低初始渲染压力。
    </div>
  </div>
</div>`

const virtualAsyncCode = `import { ref } from '@rue-js/rue'
import { Tree } from '@rue-js/design'
const treeData = ref(asyncVirtualTreeSeed)
const selectedKeys = ref<string[]>([])
const expandedKeys = ref<string[]>([])

const loadData = async node => {
  if (node.children.length) return
  treeData.value = patchTreeNode(treeData.value, node.key, current => ({
    ...current,
    children: Array.from({ length: 8 }, (_, index) => ({
      title: current.title + ' / Module ' + (index + 1),
      key: String(current.key) + '-child-' + index,
      isLeaf: index % 3 !== 0,
    })),
  }))
}

<div className="grid gap-4 lg:grid-cols-[minmax(0,24rem),1fr] lg:items-start">
  <Tree
    treeData={treeData.value}
    selectedKeys={selectedKeys.value}
    expandedKeys={expandedKeys.value}
    height={340}
    itemHeight={40}
    virtual
    showIcon
    blockNode
    loadData={loadData}
    titleRender={({ node, loading }) => (
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="truncate">{node.title}</span>
        <span className="badge badge-ghost badge-xs">
          {loading ? 'loading' : node.children.length ? 'loaded' : node.isLeaf ? 'leaf' : 'lazy'}
        </span>
      </div>
    )}
    onSelect={nextKeys => {
      selectedKeys.value = nextKeys as string[]
    }}
    onExpand={nextKeys => {
      expandedKeys.value = nextKeys as string[]
    }}
  />
  <div className="space-y-3">
    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
      <div className="text-xs text-base-content/45">根节点数量</div>
      <div className="mt-2 text-2xl font-semibold">{treeData.value.length}</div>
    </div>
    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
      <div className="text-xs text-base-content/45">已加载分支</div>
      <div className="mt-2 text-2xl font-semibold">{countLoadedBranches(treeData.value)}</div>
    </div>
    <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
      <div className="text-xs text-base-content/45">当前展开</div>
      <div className="mt-2 text-sm text-base-content/75">{JSON.stringify(expandedKeys.value)}</div>
    </div>
    <div className="rounded-box border border-dashed border-base-300 bg-base-100/80 p-4 text-sm text-base-content/70">
      先滚动到较深位置再展开节点也没问题：视口外的行不会真正渲染，只有命中的 branch 才会触发 loadData 注入子节点。
    </div>
  </div>
</div>`

const legacyCode = `import { computed, ref } from '@rue-js/rue'

type Node = { id: string; name: string; open?: boolean; children?: Node[] }

const treeData = ref<Node>({
  id: 'root',
  name: 'My Tree',
  open: true,
  children: [
    { id: 'hello', name: 'hello' },
    { id: 'world', name: 'world' },
    {
      id: 'branch',
      name: 'child folder',
      open: true,
      children: [
        { id: 'branch-1', name: 'design review' },
        { id: 'branch-2', name: 'release note' },
      ],
    },
  ],
})

const TreeItem = ({ model, onChange }: { model: Node; onChange: (node: Node) => void }) => {
  const isOpen = computed(() => !!model.open)
  const isFolder = computed(() => !!model.children && model.children.length > 0)

  const toggle = () => {
    onChange({ ...model, open: !isOpen.get() })
  }

  const addChild = () => {
    onChange({ ...model, open: true, children: [...(model.children ?? []), { id: model.id + '-new', name: 'new stuff' }] })
  }

  return (
    <li>
      <div onClick={toggle} onDblClick={addChild}>{model.name}</div>
      {isFolder.get() && isOpen.get() ? (
        <ul>{model.children!.map(child => <TreeItem key={child.id} model={child} onChange={next => onChange({ ...model, children: model.children!.map(item => item.id === child.id ? next : item) })} />)}</ul>
      ) : null}
    </li>
  )
}

<div className="card border border-base-200/80 bg-base-100 shadow-sm">
  <div className="card-body grid gap-4 lg:grid-cols-[minmax(0,1fr),18rem] lg:items-start">
    <ul className="m-0 grid gap-1 p-0">
      <TreeItem model={treeData.value} onChange={next => { treeData.value = next }} />
    </ul>
    <div className="rounded-box border border-base-300 bg-base-200/40 p-4 text-sm text-base-content/70">
      单击切换展开，双击叶子节点会把它转换成 folder，并在当前层直接追加一个新子节点。
    </div>
  </div>
</div>`

const apiRows: ApiRow[] = [
  {
    prop: 'treeData',
    description: '树数据源，支持嵌套 children 和字段映射。',
    type: 'TreeDataNode[]',
    defaultValue: '[]',
  },
  {
    prop: 'selectedKeys / defaultSelectedKeys',
    description: '受控与非受控的当前选中项，multiple 打开后允许多选。',
    type: 'TreeKey[]',
    defaultValue: '[]',
  },
  {
    prop: 'checkedKeys / defaultCheckedKeys',
    description: '勾选模式下的选中集合，strict 模式会回传 checked / halfChecked 结构。',
    type: 'TreeKey[] | { checked: TreeKey[]; halfChecked: TreeKey[] }',
    defaultValue: '[]',
  },
  {
    prop: 'expandedKeys / defaultExpandedKeys / defaultExpandAll',
    description: '控制展开态，适合目录树、权限树和异步加载场景。',
    type: 'TreeKey[] / boolean',
    defaultValue: '[] / false',
  },
  {
    prop: 'checkable / checkStrictly',
    description: '切换勾选与父子联动模式；strict 会关闭级联。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'treeDataSimpleMode / fieldNames',
    description: '直接接入 id / pId 扁平数据，同时可映射 title、key、children 字段。',
    type: 'boolean | TreeSimpleModeConfig / TreeFieldNames',
    defaultValue: '- / -',
  },
  {
    prop: 'allowSearch / searchValue / filterTreeNode',
    description: '提供内置搜索输入和过滤逻辑，命中后会保持祖先链路。',
    type: 'boolean / string / boolean | ((inputValue, node) => boolean)',
    defaultValue: 'false / - / true',
  },
  {
    prop: 'loadData',
    description: '展开未加载分支时触发异步加载，适合远端目录与超大树。',
    type: '(node: TreeNode) => Promise<any> | void',
    defaultValue: '-',
  },
  {
    prop: 'rangeSelect / Tree.DirectoryTree / expandAction / toggleSelect',
    description:
      'Tree 多选和目录树都支持 shift 区间选择；目录树额外提供展开动作和 ctrl/meta 追加选择开关。',
    type: 'false | "append" | "replace" / DirectoryTreeProps / false | "click" | "doubleClick" / boolean',
    defaultValue: '"append" / blockNode=true / showIcon=true / "click" / true',
  },
  {
    prop: 'draggable / allowDrop / onDrop',
    description:
      '开启拖拽排序并控制是否允许落点；allowDrop 和 onDrop 都会拿到 dropToGap，UI 会同步显示插前、插后或放入占位态。',
    type: 'TreeDraggable / (info) => boolean / (info) => void',
    defaultValue: 'false / - / -',
  },
  {
    prop: 'height / itemHeight / virtual',
    description:
      '为长列表开启虚拟滚动；height 定义视口高度，itemHeight 用于估算渲染窗口，也能和 loadData 组合接超长懒加载树。',
    type: 'number / number / boolean',
    defaultValue: '- / 自动按尺寸估算 / true',
  },
  {
    prop: 'showLine / showIcon / blockNode',
    description: '控制树线、节点图标和整行可点的布局表现。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'titleRender / switcherIcon / icon',
    description: '按节点态自定义标题、展开图标和节点图标。',
    type: 'render function | any',
    defaultValue: '-',
  },
]

const extractCheckedKeys = (value: TreeKey[] | TreeCheckedKeysObject) => {
  return Array.isArray(value) ? value : value.checked
}

const extractHalfCheckedKeys = (value: TreeKey[] | TreeCheckedKeysObject, info: any) => {
  if (Array.isArray(value)) {
    return (info?.halfCheckedKeys ?? []) as TreeKey[]
  }
  return value.halfChecked
}

const toKeyText = (key: TreeKey) => `${typeof key}:${String(key)}`

const cloneTreeData = (nodes: TreeDataNode[]): TreeDataNode[] => {
  return nodes.map(node => ({
    ...node,
    children: Array.isArray(node.children) ? cloneTreeData(node.children) : node.children,
  }))
}

const removeTreeNode = (nodes: TreeDataNode[], targetKey: TreeKey): TreeDataNode | null => {
  const targetKeyText = toKeyText(targetKey)

  for (let index = 0; index < nodes.length; index += 1) {
    const currentNode = nodes[index]
    if (toKeyText(currentNode.key as TreeKey) === targetKeyText) {
      const [removedNode] = nodes.splice(index, 1)
      return removedNode ?? null
    }

    if (Array.isArray(currentNode.children)) {
      const removedChild = removeTreeNode(currentNode.children, targetKey)
      if (removedChild) return removedChild
    }
  }

  return null
}

const insertTreeNode = (
  nodes: TreeDataNode[],
  dragNode: TreeDataNode,
  dropKey: TreeKey,
  dropPosition: -1 | 0 | 1,
) => {
  const dropKeyText = toKeyText(dropKey)

  for (let index = 0; index < nodes.length; index += 1) {
    const currentNode = nodes[index]
    if (toKeyText(currentNode.key as TreeKey) === dropKeyText) {
      if (dropPosition === 0) {
        const nextChildren = Array.isArray(currentNode.children) ? currentNode.children.slice() : []
        nextChildren.push(dragNode)
        currentNode.children = nextChildren
      } else {
        nodes.splice(dropPosition < 0 ? index : index + 1, 0, dragNode)
      }
      return true
    }

    if (
      Array.isArray(currentNode.children) &&
      insertTreeNode(currentNode.children, dragNode, dropKey, dropPosition)
    ) {
      return true
    }
  }

  return false
}

const applyTreeDrop = (nodes: TreeDataNode[], info: TreeDropInfo) => {
  const nextNodes = cloneTreeData(nodes)
  const removedNode = removeTreeNode(nextNodes, info.dragNode.key)
  if (!removedNode) return nextNodes

  const inserted = insertTreeNode(nextNodes, removedNode, info.node.key, info.dropPosition)
  if (!inserted) nextNodes.push(removedNode)
  return nextNodes
}

const patchTreeNode = (
  nodes: TreeDataNode[],
  targetKey: TreeKey,
  updater: (node: TreeDataNode) => TreeDataNode,
): TreeDataNode[] => {
  const targetKeyText = toKeyText(targetKey)

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]

    if (toKeyText(node.key as TreeKey) === targetKeyText) {
      const nextNode = updater(node)
      if (nextNode === node) return nodes

      const nextNodes = nodes.slice()
      nextNodes[index] = nextNode
      return nextNodes
    }

    if (Array.isArray(node.children) && node.children.length) {
      const nextChildren = patchTreeNode(node.children, targetKey, updater)
      if (nextChildren === node.children) continue

      const nextNodes = nodes.slice()
      nextNodes[index] = {
        ...node,
        children: nextChildren,
      }
      return nextNodes
    }
  }

  return nodes
}

const countLoadedBranches = (nodes: TreeDataNode[]): number => {
  return nodes.reduce((count, node) => {
    if (!Array.isArray(node.children) || !node.children.length) return count
    return count + 1 + countLoadedBranches(node.children)
  }, 0)
}

const LegacyTreeItem: FC<{ model: LegacyNode; onChange: (node: LegacyNode) => void }> = ({
  model,
  onChange,
}) => {
  const isOpen = computed(() => !!model.open)
  const isFolder = computed(() => !!model.children && model.children.length > 0)

  const toggle = (event?: Event) => {
    event?.stopPropagation()
    onChange({ ...model, open: !isOpen.get() })
  }

  const addChild = (event?: Event) => {
    event?.stopPropagation()
    onChange({
      ...model,
      open: true,
      children: [
        ...(model.children ?? []),
        {
          id: `${model.id}-new-${model.children?.length ?? 0}`,
          name: 'new stuff',
        },
      ],
    })
  }

  const changeType = (event?: Event) => {
    event?.stopPropagation()
    if (!isFolder.get()) addChild()
  }

  return (
    <li className="list-none">
      <button
        type="button"
        className={
          'flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ' +
          (isFolder.get()
            ? 'font-semibold text-base-content'
            : 'text-base-content/80 hover:bg-base-200/70')
        }
        onClick={(event: MouseEvent) => toggle(event)}
        onDblClick={(event: MouseEvent) => changeType(event)}
      >
        <span className="inline-flex size-5 items-center justify-center rounded-md bg-base-200/80 text-[11px] text-base-content/55">
          {isFolder.get() ? (isOpen.get() ? '−' : '+') : '•'}
        </span>
        <span>{model.name}</span>
      </button>

      {isFolder.get() && isOpen.get() ? (
        <ul className="mt-1 grid gap-1 pl-5">
          {model.children!.map(child => (
            <LegacyTreeItem
              key={child.id}
              model={child}
              onChange={next =>
                onChange({
                  ...model,
                  children: model.children!.map(item => (item.id === child.id ? next : item)),
                })
              }
            />
          ))}
          <li className="list-none">
            <button
              type="button"
              className="btn btn-ghost btn-xs rounded-full text-emerald-600"
              onClick={(event: MouseEvent) => addChild(event)}
            >
              + add child
            </button>
          </li>
        </ul>
      ) : null}
    </li>
  )
}

const TreeDesign: FC = () => {
  const basicSelectedKeys = ref<TreeKey[]>(['docs-api'])
  const directorySelectedKeys = ref<TreeKey[]>(['dir-app'])
  const directoryExpandAction = ref<TreeExpandAction>('click')
  const directoryToggleSelect = ref(true)
  const directoryRangeSelect = computed(() => (directoryToggleSelect.value ? 'append' : false))
  const directoryRangeAppendSelectedKeys = ref<TreeKey[]>([])
  const directoryRangeReplaceSelectedKeys = ref<TreeKey[]>([])
  const directoryRangeTreeVersion = ref(0)
  const checkableSelectedKeys = ref<TreeKey[]>(['release-control'])
  const checkedKeys = ref<TreeKey[]>(['site-home'])
  const halfCheckedKeys = ref<TreeKey[]>(['release-control', 'release-site'])
  const disabledCheckedKeys = ref<TreeKey[]>(['editable-assets'])
  const simpleSelectedKeys = ref<TreeKey[]>(['workflow'])
  const asyncSelectedKeys = ref<TreeKey[]>([])
  const asyncExpandedKeys = ref<TreeKey[]>([])
  const dragTreeData = ref<TreeDataNode[]>(cloneTreeData(dragTreeSeed))
  const dragSummary = ref('folder 支持放入；file 只允许插前和插后，悬停时会显示明确占位态。')
  const virtualSelectedKeys = ref<TreeKey[]>(['virtual-3'])
  const asyncVirtualTreeData = ref<TreeDataNode[]>(cloneTreeData(asyncVirtualTreeSeed))
  const asyncVirtualExpandedKeys = ref<TreeKey[]>([])
  const asyncVirtualSelectedKeys = ref<TreeKey[]>([])
  const asyncVirtualLoadedBranchCount = computed(() =>
    countLoadedBranches(asyncVirtualTreeData.value),
  )
  const asyncTreeData = ref<TreeDataNode[]>([
    { title: '发布总线', key: 'release-bus', isLeaf: false },
  ])
  const legacyTree = ref<LegacyNode>({
    id: 'root',
    name: 'My Tree',
    open: true,
    children: [
      { id: 'hello', name: 'hello' },
      { id: 'world', name: 'world' },
      {
        id: 'branch',
        name: 'child folder',
        open: true,
        children: [
          { id: 'branch-1', name: 'design review' },
          { id: 'branch-2', name: 'release note' },
        ],
      },
    ],
  })

  const tabs = {
    basic: ref<PreviewTabMode>('preview'),
    directory: ref<PreviewTabMode>('preview'),
    directoryRange: ref<PreviewTabMode>('preview'),
    checkable: ref<PreviewTabMode>('preview'),
    checkableDisabled: ref<PreviewTabMode>('preview'),
    simple: ref<PreviewTabMode>('preview'),
    async: ref<PreviewTabMode>('preview'),
    drag: ref<PreviewTabMode>('preview'),
    virtual: ref<PreviewTabMode>('preview'),
    virtualAsync: ref<PreviewTabMode>('preview'),
    legacy: ref<PreviewTabMode>('preview'),
  }

  const loadAsyncTree = async (node: any) => {
    if (node.key !== 'release-bus') return
    asyncTreeData.value = [
      {
        title: '发布总线',
        key: 'release-bus',
        isLeaf: false,
        children: [
          {
            title: '桌面端',
            key: 'desktop',
            children: [
              { title: 'Windows', key: 'desktop-win' },
              { title: 'macOS', key: 'desktop-mac' },
            ],
          },
          {
            title: '移动端',
            key: 'mobile',
            children: [
              { title: 'iOS', key: 'mobile-ios' },
              { title: 'Android', key: 'mobile-android' },
            ],
          },
        ],
      },
    ]
  }

  const loadAsyncVirtualTree = async (node: any) => {
    if (node.children.length) return

    asyncVirtualTreeData.value = patchTreeNode(
      asyncVirtualTreeData.value,
      node.key,
      currentNode => ({
        ...currentNode,
        children: Array.from({ length: 8 }, (_, index) => ({
          title: `${String(currentNode.title)} / Module ${index + 1}`,
          key: `${String(currentNode.key)}-child-${index}`,
          isLeaf: index % 3 !== 0,
        })),
      }),
    )
  }

  const resetDirectoryRangeDemo = () => {
    directoryRangeAppendSelectedKeys.value = []
    directoryRangeReplaceSelectedKeys.value = []
    directoryRangeTreeVersion.value += 1
  }

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Tree 树控件</h1>
        <p>
          Rue 的 Tree 补上了独立树组件这块空白：保持 TreeView 示例里递归数据直改的灵活性，同时把
          树控件常用的展开、选中、勾选、简单模式、异步加载和自定义标题一次覆盖。 视觉上使用 Rue
          当前的卡片、badge 和 base 色阶体系，不照搬其他组件库的外观。
        </p>

        <div className="not-prose mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/40 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">
              Node Model
            </div>
            <div className="mt-2 text-base font-semibold">选择、勾选、展开三条状态线</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              目录树、权限树、发布树都能直接套进来。
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/40 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">
              DirectoryTree
            </div>
            <div className="mt-2 text-base font-semibold">目录树快捷 API</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              支持 click / doubleClick 展开，以及更接近文件浏览器的多选交互。
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/40 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">
              Heavy Interaction
            </div>
            <div className="mt-2 text-base font-semibold">拖拽排序与虚拟滚动</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              长列表和拖拽改序终于能落在同一个 Tree 上了。
            </p>
          </div>
        </div>

        <PreviewBlock
          title="基础选中与整行交互"
          summary="默认 Tree 就是一个纯浏览 + 选中容器；blockNode 和 showIcon 让它更像配置面板里的主导航。"
          tab={tabs.basic}
          code={basicCode}
          preview={
            <div className="space-y-4 not-prose">
              <Tree
                treeData={organizationTree}
                selectedKeys={basicSelectedKeys.value}
                defaultExpandAll
                showIcon
                blockNode
                onSelect={nextKeys => {
                  basicSelectedKeys.value = nextKeys as TreeKey[]
                }}
              />

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                  <div className="text-xs text-base-content/45">当前选中</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {basicSelectedKeys.value.length ? (
                      basicSelectedKeys.value.map(key => (
                        <span key={String(key)} className="badge badge-outline badge-sm">
                          {String(key)}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-base-content/55">未选择</span>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                  <div className="text-xs text-base-content/45">推荐场景</div>
                  <div className="mt-2 text-sm text-base-content/75">
                    组件目录、文档导航、资源分类
                  </div>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                  <div className="text-xs text-base-content/45">状态模型</div>
                  <div className="mt-2 text-sm text-base-content/75">
                    selectedKeys / expandedKeys 分离，便于受控更新。
                  </div>
                </div>
              </div>
            </div>
          }
        />

        <PreviewBlock
          title="DirectoryTree 目录树快捷 API"
          summary="Tree.DirectoryTree 默认补上目录图标、整行可点和 click 展开；这里先只看 expandAction 和 toggleSelect 这两个基础交互开关。"
          tab={tabs.directory}
          code={directoryCode}
          preview={
            <div className="grid gap-4 not-prose lg:grid-cols-[minmax(0,24rem),1fr] lg:items-start">
              <Tree.DirectoryTree
                treeData={directoryTree}
                selectedKeys={directorySelectedKeys.value}
                multiple
                expandAction={directoryExpandAction.value}
                toggleSelect={directoryToggleSelect.value}
                rangeSelect={directoryRangeSelect.get()}
                onSelect={nextKeys => {
                  directorySelectedKeys.value = nextKeys as TreeKey[]
                }}
              />
              <div className="space-y-3">
                <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                  <div className="text-xs text-base-content/45">快捷属性</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={
                        directoryExpandAction.value === 'click'
                          ? 'btn btn-primary btn-xs'
                          : 'btn btn-ghost btn-xs'
                      }
                      onClick={() => {
                        directoryExpandAction.value = 'click'
                      }}
                    >
                      click 展开
                    </button>
                    <button
                      type="button"
                      className={
                        directoryExpandAction.value === 'doubleClick'
                          ? 'btn btn-primary btn-xs'
                          : 'btn btn-ghost btn-xs'
                      }
                      onClick={() => {
                        directoryExpandAction.value = 'doubleClick'
                      }}
                    >
                      doubleClick 展开
                    </button>
                    <button
                      type="button"
                      className={
                        directoryExpandAction.value === false
                          ? 'btn btn-primary btn-xs'
                          : 'btn btn-ghost btn-xs'
                      }
                      onClick={() => {
                        directoryExpandAction.value = false
                      }}
                    >
                      只选中不展开
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={
                        directoryToggleSelect.value
                          ? 'btn btn-primary btn-xs'
                          : 'btn btn-ghost btn-xs'
                      }
                      onClick={() => {
                        directoryToggleSelect.value = true
                      }}
                    >
                      ctrl/meta 追加
                    </button>
                    <button
                      type="button"
                      className={
                        !directoryToggleSelect.value
                          ? 'btn btn-primary btn-xs'
                          : 'btn btn-ghost btn-xs'
                      }
                      onClick={() => {
                        directoryToggleSelect.value = false
                      }}
                    >
                      关闭追加选择
                    </button>
                  </div>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                  <div className="text-xs text-base-content/45">当前选择</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {directorySelectedKeys.value.map(key => (
                      <span key={String(key)} className="badge badge-outline badge-sm">
                        {String(key)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-box border border-dashed border-base-300 bg-base-100/80 p-4 text-sm text-base-content/70">
                  当前组合是 expandAction=<strong>{String(directoryExpandAction.value)}</strong>
                  、toggleSelect=<strong>{String(directoryToggleSelect.value)}</strong>
                  、rangeSelect=<strong>{String(directoryRangeSelect.get())}</strong>。
                  <div className="mt-3">
                    普通点击会落成单选；打开追加后，meta / ctrl 会追加或移除选中，shift
                    也会启用区间选择。关闭追加时，这两类补充选择都会停用；append / replace
                    的差异放到下面的对照示例里单独演示。
                  </div>
                </div>
              </div>
            </div>
          }
        />

        <PreviewBlock
          title="shift append vs shift replace"
          summary="Shift 的基础语义是先选一个节点，再 Shift 选另一个节点，中间连续区间都会选中；append / replace 只决定当前额外选择是否保持。"
          tab={tabs.directoryRange}
          code={directoryRangeCode}
          preview={
            <div className="space-y-4 not-prose">
              <div className="rounded-box border border-dashed border-base-300 bg-base-100/80 p-4 text-sm text-base-content/70">
                <div>
                  基础行为：先单击 alpha.ts，再按住 Shift 单击 epsilon.ts，alpha.ts 到 epsilon.ts
                  都会选中。
                </div>
                <div className="mt-2">
                  append / replace 只影响当前额外非连续选择是否保持：重置后先单击 beta.ts，再按住
                  Cmd / Ctrl 单击 epsilon.ts，最后按住 Shift 单击 delta.ts。
                </div>
                <div className="mt-2">
                  append 会保持 beta.ts；replace 只保持 delta.ts 到 epsilon.ts 这一段。
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs mt-3"
                  onClick={resetDirectoryRangeDemo}
                >
                  重置两边示例
                </button>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-3 rounded-[1.4rem] border border-base-300 bg-base-100 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">rangeSelect=&quot;append&quot;</div>
                      <div className="text-xs text-base-content/55">
                        保持原先的非连续选择，再并入新的 shift 区间。
                      </div>
                    </div>
                    <span className="badge badge-outline badge-sm">append</span>
                  </div>
                  <Tree.DirectoryTree
                    key={`append-${directoryRangeTreeVersion.value}`}
                    treeData={directoryRangeTree}
                    selectedKeys={directoryRangeAppendSelectedKeys.value}
                    multiple
                    toggleSelect
                    rangeSelect="append"
                    onSelect={nextKeys => {
                      directoryRangeAppendSelectedKeys.value = nextKeys as TreeKey[]
                    }}
                  />
                  <div className="rounded-box border border-base-300 bg-base-100 px-4 py-3 text-sm text-base-content/70">
                    <div className="text-xs text-base-content/45">当前选择</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {directoryRangeAppendSelectedKeys.value.length ? (
                        directoryRangeAppendSelectedKeys.value.map(key => (
                          <span key={String(key)} className="badge badge-outline badge-sm">
                            {String(key)}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-base-content/55">还没有选择</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-[1.4rem] border border-base-300 bg-base-100 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">rangeSelect=&quot;replace&quot;</div>
                      <div className="text-xs text-base-content/55">
                        只保持新的 shift 区间，基础的非连续选择会被替换掉。
                      </div>
                    </div>
                    <span className="badge badge-primary badge-outline badge-sm">replace</span>
                  </div>
                  <Tree.DirectoryTree
                    key={`replace-${directoryRangeTreeVersion.value}`}
                    treeData={directoryRangeTree}
                    selectedKeys={directoryRangeReplaceSelectedKeys.value}
                    multiple
                    toggleSelect
                    rangeSelect="replace"
                    onSelect={nextKeys => {
                      directoryRangeReplaceSelectedKeys.value = nextKeys as TreeKey[]
                    }}
                  />
                  <div className="rounded-box border border-base-300 bg-base-100 px-4 py-3 text-sm text-base-content/70">
                    <div className="text-xs text-base-content/45">当前选择</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {directoryRangeReplaceSelectedKeys.value.length ? (
                        directoryRangeReplaceSelectedKeys.value.map(key => (
                          <span key={String(key)} className="badge badge-outline badge-sm">
                            {String(key)}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-base-content/55">还没有选择</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        />

        <PreviewBlock
          title="父子联动与半选态"
          summary="这一块只看级联勾选和 halfChecked，不再混入 disabled / disableCheckbox，点击父节点时能直接看到整棵子树联动。"
          tab={tabs.checkable}
          code={checkableCode}
          preview={
            <div className="space-y-4 not-prose">
              <Tree
                treeData={permissionTree}
                selectedKeys={checkableSelectedKeys.value}
                checkedKeys={checkedKeys.value}
                checkable
                defaultExpandAll
                showLine
                blockNode
                onSelect={nextKeys => {
                  checkableSelectedKeys.value = nextKeys as TreeKey[]
                }}
                onCheck={(nextKeys, info) => {
                  checkedKeys.value = extractCheckedKeys(nextKeys)
                  halfCheckedKeys.value = extractHalfCheckedKeys(nextKeys, info)
                }}
              />

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                  <div className="text-xs text-base-content/45">selectedKeys</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {checkableSelectedKeys.value.length ? (
                      checkableSelectedKeys.value.map(key => (
                        <span key={String(key)} className="badge badge-outline badge-sm">
                          {String(key)}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-base-content/55">当前没有选中节点</span>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                  <div className="text-xs text-base-content/45">checkedKeys</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {checkedKeys.value.map(key => (
                      <span
                        key={String(key)}
                        className="badge badge-primary badge-outline badge-sm"
                      >
                        {String(key)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                  <div className="text-xs text-base-content/45">halfCheckedKeys</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {halfCheckedKeys.value.length ? (
                      halfCheckedKeys.value.map(key => (
                        <span key={String(key)} className="badge badge-ghost badge-sm">
                          {String(key)}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-base-content/55">当前没有半选</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          }
        />

        <PreviewBlock
          title="禁用节点与禁用复选框"
          summary="把 disabled 和 disableCheckbox 单独拆出来看：前者整节点只读，后者只禁用勾选框，不再干扰联动示例。"
          tab={tabs.checkableDisabled}
          code={checkableDisabledCode}
          preview={
            <div className="grid gap-4 not-prose lg:grid-cols-[minmax(0,24rem),1fr] lg:items-start">
              <Tree
                treeData={permissionDisabledTree}
                checkedKeys={disabledCheckedKeys.value}
                checkable
                defaultExpandAll
                showLine
                blockNode
                onCheck={nextKeys => {
                  disabledCheckedKeys.value = extractCheckedKeys(nextKeys)
                }}
              />

              <div className="space-y-3">
                <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                  <div className="text-xs text-base-content/45">当前勾选</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {disabledCheckedKeys.value.length ? (
                      disabledCheckedKeys.value.map(key => (
                        <span key={String(key)} className="badge badge-outline badge-sm">
                          {String(key)}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-base-content/55">当前没有勾选</span>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm text-sm text-base-content/75">
                  <div className="font-medium text-base-content">disabled</div>
                  <div className="mt-2">
                    整节点不可展开、不可选中、不可勾选，适合只读目录或冻结配置。
                  </div>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm text-sm text-base-content/75">
                  <div className="font-medium text-base-content">disableCheckbox</div>
                  <div className="mt-2">
                    节点仍能展示和展开，但复选框不会参与交互，适合“只可浏览不可授权”的条目。
                  </div>
                </div>
              </div>
            </div>
          }
        />

        <PreviewBlock
          title="Simple Mode + Search"
          summary="扁平数据直入后，内置搜索会保持命中节点的祖先链，不会把层级上下文切断。"
          tab={tabs.simple}
          code={simpleModeCode}
          preview={
            <div className="grid gap-4 not-prose lg:grid-cols-[minmax(0,24rem),1fr] lg:items-start">
              <Tree
                treeData={simpleModeTree as any}
                treeDataSimpleMode={{ id: 'nodeId', pId: 'parentId', rootPId: 0 }}
                fieldNames={{ title: 'name', key: 'code' }}
                selectedKeys={simpleSelectedKeys.value}
                allowSearch
                defaultExpandAll
                onSelect={nextKeys => {
                  simpleSelectedKeys.value = nextKeys as TreeKey[]
                }}
              />
              <div className="rounded-box border border-dashed border-base-300 bg-base-100/80 p-4 text-sm text-base-content/70">
                当前选中：<code>{JSON.stringify(simpleSelectedKeys.value)}</code>
                <div className="mt-3">
                  这类 simple mode 很适合后端直接给 id / pId
                  的菜单、流程节点和权限项，不需要再先做一遍树转换。
                </div>
              </div>
            </div>
          }
        />

        <PreviewBlock
          title="Async Load 与自定义标题"
          summary="第一次展开时再拉子节点，同时用 titleRender 和 icon 把状态信息塞回每一行。"
          tab={tabs.async}
          code={asyncCode}
          preview={
            <div className="grid gap-4 not-prose lg:grid-cols-[minmax(0,26rem),1fr] lg:items-start">
              <Tree
                treeData={asyncTreeData.value}
                selectedKeys={asyncSelectedKeys.value}
                expandedKeys={asyncExpandedKeys.value}
                loadData={loadAsyncTree}
                showLine
                showIcon
                blockNode
                titleRender={({ node, loading }) => (
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <span className="truncate">{node.title}</span>
                    <span className="badge badge-ghost badge-xs">
                      {loading ? 'loading' : node.children.length ? 'branch' : 'leaf'}
                    </span>
                  </div>
                )}
                onSelect={nextKeys => {
                  asyncSelectedKeys.value = nextKeys as TreeKey[]
                }}
                onExpand={nextKeys => {
                  asyncExpandedKeys.value = nextKeys as TreeKey[]
                }}
              />
              <div className="space-y-3">
                <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                  <div className="text-xs text-base-content/45">expandedKeys</div>
                  <div className="mt-2 text-sm text-base-content/75">
                    {JSON.stringify(asyncExpandedKeys.value)}
                  </div>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                  <div className="text-xs text-base-content/45">selectedKeys</div>
                  <div className="mt-2 text-sm text-base-content/75">
                    {JSON.stringify(asyncSelectedKeys.value)}
                  </div>
                </div>
                <div className="rounded-box border border-dashed border-base-300 bg-base-100/80 p-4 text-sm text-base-content/70">
                  展开 release-bus
                  后才会注入桌面端和移动端节点，适合远端目录、超大权限树和发布范围配置。
                </div>
              </div>
            </div>
          }
        />

        <div className="not-prose mt-10 space-y-2">
          <h2 className="text-2xl font-semibold">更重交互</h2>
          <p className="text-sm text-base-content/70">
            当 Tree 既要承载拖拽整理，又要承载超长数据时，draggable 和 virtual
            就是两个最关键的控制面。
          </p>
        </div>

        <PreviewBlock
          title="allowDrop 策略与拖拽占位"
          summary="allowDrop 可以把 folder / file 的落点规则写清楚；hover 时 Tree 会直接给出插前、插后或放入占位提示。"
          tab={tabs.drag}
          code={dragCode}
          preview={
            <div className="grid gap-4 not-prose lg:grid-cols-[minmax(0,24rem),1fr] lg:items-start">
              <Tree
                treeData={dragTreeData.value}
                draggable
                blockNode
                defaultExpandAll
                allowDrop={({ dropNode, dropToGap }) => dropToGap || dropNode.raw.kind !== 'file'}
                titleRender={({ node }) => (
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <span className="truncate">{node.title}</span>
                    <span
                      className={
                        node.raw.kind === 'folder'
                          ? 'badge badge-ghost badge-xs'
                          : 'badge badge-outline badge-xs'
                      }
                    >
                      {node.raw.kind}
                    </span>
                  </div>
                )}
                onDrop={info => {
                  dragTreeData.value = applyTreeDrop(dragTreeData.value, info as TreeDropInfo)
                  dragSummary.value = `${String(info.dragNode.key)} -> ${String(info.node.key)} (${info.dropToGap ? (info.dropPosition < 0 ? 'before' : 'after') : 'inside'})`
                }}
              />
              <div className="space-y-3">
                <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                  <div className="text-xs text-base-content/45">最近一次拖拽</div>
                  <div className="mt-2 text-sm text-base-content/75">{dragSummary.value}</div>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                  <div className="text-xs text-base-content/45">allowDrop 规则</div>
                  <div className="mt-2 grid gap-2 text-sm text-base-content/75">
                    <div>folder：允许放入，也允许插前 / 插后。</div>
                    <div>file：只允许插前 / 插后，不允许作为 inside 目标。</div>
                  </div>
                </div>
                <div className="rounded-box border border-dashed border-base-300 bg-base-100/80 p-4 text-sm text-base-content/70">
                  拖到 folder 正中央会看到“放入”，拖到行的上沿或下沿则会出现“插前 /
                  插后”；如果目标是 file，inside 落点会被 allowDrop 直接拦掉。
                </div>
              </div>
            </div>
          }
        />

        <PreviewBlock
          title="Virtual Scroll"
          summary="长列表下只渲染可见窗口，height 和 itemHeight 负责限定视口和估算切片范围。"
          tab={tabs.virtual}
          code={virtualCode}
          preview={
            <div className="grid gap-4 not-prose lg:grid-cols-[minmax(0,24rem),1fr] lg:items-start">
              <Tree
                treeData={virtualTreeData}
                selectedKeys={virtualSelectedKeys.value}
                height={320}
                itemHeight={42}
                virtual
                blockNode
                onSelect={nextKeys => {
                  virtualSelectedKeys.value = nextKeys as TreeKey[]
                }}
              />
              <div className="space-y-3">
                <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                  <div className="text-xs text-base-content/45">数据量</div>
                  <div className="mt-2 text-2xl font-semibold">{virtualTreeData.length}</div>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                  <div className="text-xs text-base-content/45">当前选中</div>
                  <div className="mt-2 text-sm text-base-content/75">
                    {JSON.stringify(virtualSelectedKeys.value)}
                  </div>
                </div>
                <div className="rounded-box border border-dashed border-base-300 bg-base-100/80 p-4 text-sm text-base-content/70">
                  对文档页目录、埋点树、批量资源目录这种长列表场景，虚拟滚动能显著降低初始渲染压力。
                </div>
              </div>
            </div>
          }
        />

        <PreviewBlock
          title="Virtual + Async Load 场景页"
          summary="把 virtual、height、itemHeight 和 loadData 合在一起，就能接超长目录或资源树，只在展开分支时再注入子节点。"
          tab={tabs.virtualAsync}
          code={virtualAsyncCode}
          preview={
            <div className="grid gap-4 not-prose lg:grid-cols-[minmax(0,24rem),1fr] lg:items-start">
              <Tree
                treeData={asyncVirtualTreeData.value}
                selectedKeys={asyncVirtualSelectedKeys.value}
                expandedKeys={asyncVirtualExpandedKeys.value}
                height={340}
                itemHeight={40}
                virtual
                showIcon
                blockNode
                loadData={loadAsyncVirtualTree}
                titleRender={({ node, loading }) => (
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <span className="truncate">{node.title}</span>
                    <span className="badge badge-ghost badge-xs">
                      {loading
                        ? 'loading'
                        : node.children.length
                          ? 'loaded'
                          : node.isLeaf
                            ? 'leaf'
                            : 'lazy'}
                    </span>
                  </div>
                )}
                onSelect={nextKeys => {
                  asyncVirtualSelectedKeys.value = nextKeys as TreeKey[]
                }}
                onExpand={nextKeys => {
                  asyncVirtualExpandedKeys.value = nextKeys as TreeKey[]
                }}
              />
              <div className="space-y-3">
                <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                  <div className="text-xs text-base-content/45">根节点数量</div>
                  <div className="mt-2 text-2xl font-semibold">
                    {asyncVirtualTreeData.value.length}
                  </div>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                  <div className="text-xs text-base-content/45">已加载分支</div>
                  <div className="mt-2 text-2xl font-semibold">
                    {asyncVirtualLoadedBranchCount.get()}
                  </div>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                  <div className="text-xs text-base-content/45">当前展开</div>
                  <div className="mt-2 text-sm text-base-content/75">
                    {JSON.stringify(asyncVirtualExpandedKeys.value)}
                  </div>
                </div>
                <div className="rounded-box border border-dashed border-base-300 bg-base-100/80 p-4 text-sm text-base-content/70">
                  先滚动到较深位置再展开节点也没问题：视口外的行不会真正渲染，只有命中的 branch
                  才会触发 loadData 注入子节点。
                </div>
              </div>
            </div>
          }
        />

        <PreviewBlock
          title="展示基础递归 示例"
          summary="基础的 TreeView 行为没有删掉，只是并进 design 页面里，方便对比“直接改数据”这类递归写法。"
          tab={tabs.legacy}
          code={legacyCode}
          preview={
            <div className="card border border-base-200/80 bg-base-100 shadow-sm not-prose">
              <div className="card-body grid gap-4 lg:grid-cols-[minmax(0,1fr),18rem] lg:items-start">
                <ul className="m-0 grid gap-1 p-0">
                  <LegacyTreeItem
                    model={legacyTree.value}
                    onChange={next => {
                      legacyTree.value = next
                    }}
                  />
                </ul>
                <div className="rounded-box border border-base-300 bg-base-200/40 p-4 text-sm text-base-content/70">
                  单击切换展开，双击叶子节点会把它转换成 folder，并在当前层直接追加一个新子节点。
                </div>
              </div>
            </div>
          }
        />

        <div className="not-prose mt-10 space-y-4">
          <h2 className="text-2xl font-semibold">API</h2>
          <ApiTable rows={apiRows} />
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default TreeDesign
