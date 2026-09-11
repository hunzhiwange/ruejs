import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import { Transfer } from '@rue-js/design'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import PreviewBlock, { type PreviewTabMode } from './PreviewBlock'

interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
}

const ApiTableRow: FC<{ row: ApiRow }> = ({ row }) => (
  <tr>
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
)

const TargetKeyBadge: FC<{ value: string }> = ({ value }) => (
  <span className="badge badge-outline badge-sm">{value}</span>
)

const ResearchTransferItem: FC<{
  item: any
  selectedKeys: Array<string | number>
  onItemSelect: (key: string | number, selected: boolean) => void
}> = ({ item, selectedKeys, onItemSelect }) => {
  const active = selectedKeys.includes(item.key)
  const record = item.record as (typeof researchItems)[number]
  return (
    <button
      type="button"
      className={
        'rounded-2xl border px-4 py-3 text-left transition ' +
        (active
          ? 'border-primary/45 bg-primary/6 shadow-sm'
          : 'border-base-300 bg-base-100 hover:border-base-300 hover:bg-base-100')
      }
      onClick={() => onItemSelect(item.key, !active)}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{record.title}</span>
        <span className="badge badge-outline badge-sm">{record.stage}</span>
      </div>
      <div className="mt-2 text-xs text-base-content/60">
        owner {record.owner} · slots {record.slots}
      </div>
    </button>
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
            <ApiTableRow key={row.prop} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

const crewItems = [
  {
    key: 'design-system',
    title: 'Design System Guild',
    team: 'Design Ops',
    city: 'Shanghai',
    description: '维护颜色、排版、栅格与跨端规范。',
  },
  {
    key: 'growth-lab',
    title: 'Growth Signal Lab',
    team: 'Growth',
    city: 'Hangzhou',
    description: '每周跟进转化实验、活动落地与复盘节奏。',
  },
  {
    key: 'motion-frame',
    title: 'Motion Frame',
    team: 'Brand Studio',
    city: 'Shenzhen',
    description: '负责首屏动效、发布会片头与互动海报。',
  },
  {
    key: 'content-engine',
    title: 'Content Engine',
    team: 'Content',
    city: 'Beijing',
    description: '维护官网文案语气、栏目节奏与专题框架。',
  },
  {
    key: 'platform-shift',
    title: 'Platform Shift',
    team: 'Infra',
    city: 'Suzhou',
    description: '推进基础平台升级与链路治理。',
  },
  {
    key: 'quality-loop',
    title: 'Quality Loop',
    team: 'QA',
    city: 'Nanjing',
    description: '聚焦验收基线、组件回归与体验冒烟。',
  },
]

const assetItems = [
  { key: 'asset-01', title: 'Launch Cover', tag: '封面', channel: 'Homepage', owner: 'Mia' },
  { key: 'asset-02', title: 'CTA Strip', tag: '横幅', channel: 'Campaign', owner: 'Reed' },
  { key: 'asset-03', title: 'Hero Motion', tag: '动效', channel: 'Homepage', owner: 'Kai' },
  { key: 'asset-04', title: 'Story Deck', tag: '叙事', channel: 'Pitch', owner: 'Nina' },
  { key: 'asset-05', title: 'Feature Grid', tag: '信息块', channel: 'Docs', owner: 'Iris' },
  { key: 'asset-06', title: 'Teaser Reel', tag: '视频', channel: 'Social', owner: 'Leo' },
  { key: 'asset-07', title: 'Price Snapshot', tag: '对比', channel: 'Pricing', owner: 'Mika' },
  { key: 'asset-08', title: 'Usage Story', tag: '案例', channel: 'Blog', owner: 'Theo' },
  { key: 'asset-09', title: 'FAQ Sheet', tag: '答疑', channel: 'Support', owner: 'Yuna' },
  { key: 'asset-10', title: 'Signal Card', tag: '数据卡', channel: 'Dashboard', owner: 'Finn' },
  { key: 'asset-11', title: 'Trust Marker', tag: '背书', channel: 'Homepage', owner: 'Cole' },
  { key: 'asset-12', title: 'Audience Quote', tag: '引言', channel: 'Campaign', owner: 'Ada' },
]

const permissionItems = [
  {
    key: 'feature-a11y',
    title: 'Accessibility Review',
    scope: '质量门禁',
    disabled: true,
    description: '当前由平台治理组统一维护，不能直接移除。',
  },
  {
    key: 'feature-copy',
    title: 'Copy Final Pass',
    scope: '内容发布',
    description: '上线前最终校词与语气校准。',
  },
  {
    key: 'feature-data',
    title: 'Metrics Snapshot',
    scope: '数据洞察',
    description: '抓取投放窗口期的关键数据截面。',
  },
  {
    key: 'feature-media',
    title: 'Media Delivery',
    scope: '投放素材',
    description: '输出横版、竖版与社媒适配封套。',
  },
  {
    key: 'feature-signoff',
    title: 'Stakeholder Sign-off',
    scope: '流程治理',
    description: '面向业务、法务、品牌三方确认。',
  },
  {
    key: 'feature-tracking',
    title: 'Tracking Health',
    scope: '埋点审计',
    description: '排查埋点、归因与回传链路。',
  },
]

const researchItems = [
  {
    key: 'track-briefing',
    title: 'Briefing Room',
    stage: 'Brief',
    owner: 'Ariel',
    slots: 2,
  },
  {
    key: 'track-mapping',
    title: 'Journey Mapping',
    stage: 'Map',
    owner: 'Selina',
    slots: 3,
  },
  {
    key: 'track-prototype',
    title: 'Prototype Pairing',
    stage: 'Build',
    owner: 'Mason',
    slots: 1,
  },
  {
    key: 'track-playback',
    title: 'Playback Notes',
    stage: 'Review',
    owner: 'Jude',
    slots: 2,
  },
  {
    key: 'track-signal',
    title: 'Signal Archive',
    stage: 'Archive',
    owner: 'Nora',
    slots: 4,
  },
]

const basicTab = ref<PreviewTabMode>('preview')
const searchTab = ref<PreviewTabMode>('preview')
const oneWayTab = ref<PreviewTabMode>('preview')
const customTab = ref<PreviewTabMode>('preview')

const basicTargetKeys = ref(['growth-lab', 'content-engine'])
const basicSelectedKeys = ref<string[]>([])
const searchTargetKeys = ref(['asset-05', 'asset-09'])
const searchSelectedKeys = ref<string[]>([])
const oneWayTargetKeys = ref(['feature-a11y', 'feature-signoff'])
const oneWaySelectedKeys = ref<string[]>([])
const customTargetKeys = ref(['track-signal'])
const customSelectedKeys = ref<string[]>([])

const apiRows: ApiRow[] = [
  {
    prop: 'dataSource',
    description: '左侧候选数据源，目标列由 targetKeys 决定顺序和归属。',
    type: 'TransferItem[]',
    defaultValue: '[]',
  },
  {
    prop: 'targetKeys / defaultTargetKeys',
    description: '受控与非受控的目标列 key 集合。',
    type: 'TransferKey[]',
    defaultValue: '[]',
  },
  {
    prop: 'selectedKeys / defaultSelectedKeys',
    description: '两侧当前选中项，内部会自动按方向拆分。',
    type: 'TransferKey[]',
    defaultValue: '[]',
  },
  {
    prop: 'render',
    description: '自定义每项的主内容，支持返回 { label, value, description }。',
    type: '(item) => any',
    defaultValue: '-',
  },
  {
    prop: 'showSearch / filterOption',
    description: '显示搜索框，并自定义搜索命中逻辑。',
    type: 'boolean | object / function',
    defaultValue: 'false / -',
  },
  {
    prop: 'titles / actions / operations',
    description: '配置左右标题和中间操作按钮文案。',
    type: 'any[]',
    defaultValue: "['待选择', '已加入'] / ['加入', '移出']",
  },
  {
    prop: 'onChange',
    description: '完成搬运后触发，返回 targetKeys、方向与 moveKeys。',
    type: '(targetKeys, direction, moveKeys) => void',
    defaultValue: '-',
  },
  {
    prop: 'onSelectChange',
    description: '选中项变化时触发，分别返回左右两侧选中的 key。',
    type: '(sourceSelectedKeys, targetSelectedKeys) => void',
    defaultValue: '-',
  },
  {
    prop: 'oneWay',
    description: '切到单向模式，只保持向右加入按钮，并在右列提供移出能力。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'pagination',
    description: '开启轻量分页，支持 pageSize。',
    type: 'boolean | { pageSize?: number }',
    defaultValue: 'false',
  },
  {
    prop: 'footer',
    description: '为每个列表底部追加扩展信息或操作。',
    type: '(listProps, { direction }) => any',
    defaultValue: '-',
  },
  {
    prop: 'renderList',
    description: 'render props 自定义列表体，适合做卡片、表格或树形穿梭。',
    type: '(listProps) => any',
    defaultValue: '-',
  },
  {
    prop: 'listStyle / operationStyle / classNames / styles',
    description: '对列容器、操作区和语义节点做样式增强。',
    type: 'object | function',
    defaultValue: '-',
  },
]

const basicCode = `import { ref } from '@rue-js/rue'
import { Transfer } from '@rue-js/design'
const crewItems = [
  {
    key: 'design-system',
    title: 'Design System Guild',
    team: 'Design Ops',
    city: 'Shanghai',
    description: '维护颜色、排版、栅格与跨端规范。',
  },
  {
    key: 'growth-lab',
    title: 'Growth Signal Lab',
    team: 'Growth',
    city: 'Hangzhou',
    description: '每周跟进转化实验、活动落地与复盘节奏。',
  },
  {
    key: 'content-engine',
    title: 'Content Engine',
    team: 'Content',
    city: 'Beijing',
    description: '维护官网文案语气、栏目节奏与专题框架。',
  },
]

const targetKeys = ref(['growth-lab'])
const selectedKeys = ref<string[]>([])

<Transfer
  dataSource={crewItems}
  targetKeys={targetKeys.value}
  selectedKeys={selectedKeys.value}
  titles={['候选工作台', '本周排期']}
  onChange={nextKeys => {
    targetKeys.value = nextKeys as string[]
  }}
  onSelectChange={(sourceKeys, targetSideKeys) => {
    selectedKeys.value = [...sourceKeys, ...targetSideKeys] as string[]
  }}
  render={item => ({
    label: (
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{item.title}</span>
        <span className="badge badge-outline badge-sm">{item.city}</span>
      </div>
    ),
    value: item.title + ' ' + item.team + ' ' + item.city,
    description: item.team + ' · ' + item.city,
  })}
/>
`

const searchCode = `import { ref } from '@rue-js/rue'
import { Transfer } from '@rue-js/design'
const assetItems = [
  { key: 'asset-01', title: 'Launch Cover', tag: '封面', channel: 'Homepage', owner: 'Mia' },
  { key: 'asset-02', title: 'CTA Strip', tag: '横幅', channel: 'Campaign', owner: 'Reed' },
  { key: 'asset-03', title: 'Hero Motion', tag: '动效', channel: 'Homepage', owner: 'Kai' },
  { key: 'asset-04', title: 'Story Deck', tag: '叙事', channel: 'Pitch', owner: 'Nina' },
  { key: 'asset-05', title: 'Feature Grid', tag: '信息块', channel: 'Docs', owner: 'Iris' },
]

const targetKeys = ref(['asset-05'])
const selectedKeys = ref<string[]>([])

<Transfer
  dataSource={assetItems}
  targetKeys={targetKeys.value}
  selectedKeys={selectedKeys.value}
  titles={['素材池', '上线包']}
  showSearch={{ placeholder: '搜索标签、频道、负责人' }}
  pagination={{ pageSize: 4 }}
  filterOption={(input, item) => {
    const text = (item.title + ' ' + item.tag + ' ' + item.channel + ' ' + item.owner).toLowerCase()
    return text.includes(input.toLowerCase())
  }}
  footer={(listProps, { direction }) => (
    <div className="flex items-center justify-between text-xs text-base-content/65">
      <span>{direction === 'left' ? '筛完再搬，比较适合大数据集。' : '右侧顺序会按 targetKeys 保持。'}</span>
      <button className="btn btn-ghost btn-xs rounded-full" type="button">
        {listProps.items.length} visible
      </button>
    </div>
  )}
  onChange={nextKeys => {
    targetKeys.value = nextKeys as string[]
  }}
  onSelectChange={(sourceKeys, targetSideKeys) => {
    selectedKeys.value = [...sourceKeys, ...targetSideKeys] as string[]
  }}
  render={item => ({
    label: (
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{item.title}</span>
        <span className="badge badge-outline badge-sm">{item.tag}</span>
      </div>
    ),
    value: item.title + ' ' + item.tag + ' ' + item.channel + ' ' + item.owner,
    description: item.channel + ' · owner ' + item.owner,
  })}
/>
`

const oneWayCode = `import { ref } from '@rue-js/rue'
import { Transfer } from '@rue-js/design'
const permissionItems = [
  {
    key: 'feature-a11y',
    title: 'Accessibility Review',
    scope: '质量门禁',
    disabled: true,
    description: '当前由平台治理组统一维护，不能直接移除。',
  },
  {
    key: 'feature-copy',
    title: 'Copy Final Pass',
    scope: '内容发布',
    description: '上线前最终校词与语气校准。',
  },
  {
    key: 'feature-signoff',
    title: 'Stakeholder Sign-off',
    scope: '流程治理',
    description: '面向业务、法务、品牌三方确认。',
  },
]

const targetKeys = ref(['feature-a11y', 'feature-signoff'])
const selectedKeys = ref<string[]>([])

<Transfer
  dataSource={permissionItems}
  targetKeys={targetKeys.value}
  selectedKeys={selectedKeys.value}
  titles={['待加入能力', '当前方案']}
  actions={['加入方案']}
  classNames={{
    root: 'lg:grid-cols-[minmax(0,0.85fr)_auto_minmax(28rem,1.15fr)]',
  }}
  styles={{
    header: {
      display: 'grid',
      gap: '0.625rem',
    },
  }}
  oneWay
  status="warning"
  showSearch
  selectAllLabels={[
    info => '候选 ' + info.selectedCount + '/' + info.totalCount,
    info => '方案 ' + info.selectedCount + '/' + info.totalCount,
  ]}
  onChange={nextKeys => {
    targetKeys.value = nextKeys as string[]
  }}
  onSelectChange={(sourceKeys, targetSideKeys) => {
    selectedKeys.value = [...sourceKeys, ...targetSideKeys] as string[]
  }}
  render={item => ({
    label: (
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{item.title}</span>
        <span className="badge badge-outline badge-sm">{item.scope}</span>
      </div>
    ),
    value: item.title + ' ' + item.scope,
    description: item.description,
  })}
/>
`

const customCode = `import { ref } from '@rue-js/rue'
import { Transfer } from '@rue-js/design'
const researchItems = [
  { key: 'track-briefing', title: 'Briefing Room', stage: 'Brief', owner: 'Ariel', slots: 2 },
  { key: 'track-mapping', title: 'Journey Mapping', stage: 'Map', owner: 'Selina', slots: 3 },
  { key: 'track-signal', title: 'Signal Archive', stage: 'Archive', owner: 'Nora', slots: 4 },
]

const targetKeys = ref(['track-signal'])
const selectedKeys = ref<string[]>([])

<Transfer
  dataSource={researchItems}
  targetKeys={targetKeys.value}
  selectedKeys={selectedKeys.value}
  titles={['研究轨道', '发布板位']}
  actions={['安排板位', '撤回板位']}
  renderList={listProps => (
    <div className="grid gap-2">
      {listProps.items.map(item => {
        const active = listProps.selectedKeys.includes(item.key)
        return (
          <button
            key={String(item.key)}
            type="button"
            className={
              'rounded-2xl border px-4 py-3 text-left transition ' +
              (active
                ? 'border-primary/45 bg-primary/6 shadow-sm'
                : 'border-base-300 bg-base-100 hover:border-base-300 hover:bg-base-100')
            }
            onClick={() => listProps.onItemSelect(item.key, !active)}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{(item.record as any).title}</span>
              <span className="badge badge-outline badge-sm">{(item.record as any).stage}</span>
            </div>
            <div className="mt-2 text-xs text-base-content/60">
              owner {(item.record as any).owner} · slots {(item.record as any).slots}
            </div>
          </button>
        )
      })}
    </div>
  )}
  onChange={nextKeys => {
    targetKeys.value = nextKeys as string[]
  }}
  onSelectChange={(sourceKeys, targetSideKeys) => {
    selectedKeys.value = [...sourceKeys, ...targetSideKeys] as string[]
  }}
/>
`

const renderCrewLabel = (item: (typeof crewItems)[number]) => {
  return {
    label: (
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{item.title}</span>
        <span className="badge badge-outline badge-sm">{item.city}</span>
      </div>
    ),
    value: item.title + ' ' + item.team + ' ' + item.city,
    description: item.team + ' · ' + item.city,
  }
}

const renderAssetLabel = (item: (typeof assetItems)[number]) => {
  return {
    label: (
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{item.title}</span>
        <span className="badge badge-outline badge-sm">{item.tag}</span>
      </div>
    ),
    value: item.title + ' ' + item.tag + ' ' + item.channel + ' ' + item.owner,
    description: item.channel + ' · owner ' + item.owner,
  }
}

const renderPermissionLabel = (item: (typeof permissionItems)[number]) => {
  return {
    label: (
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{item.title}</span>
        <span className="badge badge-outline badge-sm">{item.scope}</span>
      </div>
    ),
    value: item.title + ' ' + item.scope,
    description: item.description,
  }
}

const TransferDesign: FC = () => {
  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Transfer 穿梭框</h1>
        <p>
          Rue 的 Transfer 维持当前设计体系的轻量卡片感，但 API 心智尽量向成熟双栏穿梭组件靠拢。
          现在它支持受控与默认值两套写法、搜索过滤、分页、单向模式、render props
          自定义列表体，以及更细的标题、操作按钮和底部扩展位。
        </p>

        <div className="not-prose mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/40 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">
              State Model
            </div>
            <div className="mt-2 text-base font-semibold">
              dataSource + targetKeys + selectedKeys
            </div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">用 key 驱动归属和顺序。</p>
          </div>
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/40 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">
              Search & Flow
            </div>
            <div className="mt-2 text-base font-semibold">搜索、分页、单向搬运</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              适合大列表，也支持只保持向右加入的发布流。
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/40 p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-base-content/45">
              Render Props
            </div>
            <div className="mt-2 text-base font-semibold">不止是默认列表</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              可把列表体换成卡片、表格或任意自定义布局。
            </p>
          </div>
        </div>

        <PreviewBlock
          title="基础受控模式"
          summary="最常见的受控用法：外部维护 targetKeys 与 selectedKeys。"
          tab={basicTab}
          code={basicCode}
          preview={() => (
            <div className="space-y-4 not-prose">
              <Transfer
                dataSource={crewItems}
                targetKeys={basicTargetKeys.value}
                selectedKeys={basicSelectedKeys.value}
                titles={['候选工作台', '本周排期']}
                onChange={nextKeys => {
                  basicTargetKeys.value = nextKeys as string[]
                }}
                onSelectChange={(sourceKeys, targetSideKeys) => {
                  basicSelectedKeys.value = [...sourceKeys, ...targetSideKeys] as string[]
                }}
                render={renderCrewLabel}
              />

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                  <div className="text-xs text-base-content/45">已加入</div>
                  <div className="mt-2 text-2xl font-semibold">{basicTargetKeys.value.length}</div>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                  <div className="text-xs text-base-content/45">当前选中</div>
                  <div className="mt-2 text-2xl font-semibold">
                    {basicSelectedKeys.value.length}
                  </div>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                  <div className="text-xs text-base-content/45">目标顺序</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {basicTargetKeys.value.map(key => (
                      <TargetKeyBadge key={key} value={key} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        />

        <PreviewBlock
          title="搜索、分页与底部扩展"
          summary="适合较大的素材池或配置列表；搜索默认基于 render.value 和文本字段匹配。"
          tab={searchTab}
          code={searchCode}
          preview={() => (
            <Transfer
              dataSource={assetItems}
              targetKeys={searchTargetKeys.value}
              selectedKeys={searchSelectedKeys.value}
              titles={['素材池', '上线包']}
              showSearch={{ placeholder: '搜索标签、频道、负责人' }}
              pagination={{ pageSize: 5 }}
              filterOption={(input, item) => {
                const text = (
                  item.title +
                  ' ' +
                  item.tag +
                  ' ' +
                  item.channel +
                  ' ' +
                  item.owner
                ).toLowerCase()
                return text.includes(input.toLowerCase())
              }}
              footer={(listProps, { direction }) => (
                <div className="flex items-center justify-between text-xs text-base-content/65">
                  <span>
                    {direction === 'left'
                      ? '筛完再搬，比较适合大列表。'
                      : '目标列顺序完全跟随 targetKeys。'}
                  </span>
                  <button className="btn btn-ghost btn-xs rounded-full" type="button">
                    {listProps.items.length} visible
                  </button>
                </div>
              )}
              onChange={nextKeys => {
                searchTargetKeys.value = nextKeys as string[]
              }}
              onSelectChange={(sourceKeys, targetSideKeys) => {
                searchSelectedKeys.value = [...sourceKeys, ...targetSideKeys] as string[]
              }}
              render={renderAssetLabel}
            />
          )}
        />

        <PreviewBlock
          title="单向模式与禁用项"
          summary="适合发布清单、开关方案或只允许逐步加入的流程；右侧保持移出能力。"
          tab={oneWayTab}
          code={oneWayCode}
          preview={() => (
            <div className="space-y-4 not-prose">
              <Transfer
                dataSource={permissionItems}
                targetKeys={oneWayTargetKeys.value}
                selectedKeys={oneWaySelectedKeys.value}
                titles={['待加入能力', '当前方案']}
                actions={['加入方案']}
                classNames={{
                  root: 'lg:grid-cols-[minmax(0,0.85fr)_auto_minmax(28rem,1.15fr)]',
                }}
                styles={{
                  header: {
                    display: 'grid',
                    gap: '0.625rem',
                  },
                }}
                oneWay
                status="warning"
                showSearch
                selectAllLabels={[
                  (info: { selectedCount: number; totalCount: number }) =>
                    '候选 ' + info.selectedCount + '/' + info.totalCount,
                  (info: { selectedCount: number; totalCount: number }) =>
                    '方案 ' + info.selectedCount + '/' + info.totalCount,
                ]}
                listStyle={({ direction }) => {
                  if (direction === 'right') {
                    return {
                      background:
                        'linear-gradient(180deg, color-mix(in srgb, var(--color-warning) 10%, transparent), transparent 45%)',
                    }
                  }
                  return {}
                }}
                onChange={nextKeys => {
                  oneWayTargetKeys.value = nextKeys as string[]
                }}
                onSelectChange={(sourceKeys, targetSideKeys) => {
                  oneWaySelectedKeys.value = [...sourceKeys, ...targetSideKeys] as string[]
                }}
                render={renderPermissionLabel}
              />

              <div className="rounded-2xl border border-warning/30 bg-warning/6 px-4 py-3 text-sm text-base-content/75">
                Accessibility Review
                被标记为禁用项，已经进入方案后也不会被误移出，适合承载强约束配置。
              </div>
            </div>
          )}
        />

        <PreviewBlock
          title="Render Props 自定义列表体"
          summary="用 renderList 接管列表体，可以把默认列表改造成卡片板位。"
          tab={customTab}
          code={customCode}
          preview={() => (
            <Transfer
              dataSource={researchItems}
              targetKeys={customTargetKeys.value}
              selectedKeys={customSelectedKeys.value}
              titles={['研究轨道', '发布板位']}
              actions={['安排板位', '撤回板位']}
              renderList={listProps => (
                <div className="grid gap-2">
                  {listProps.items.map(item => (
                    <ResearchTransferItem
                      key={String(item.key)}
                      item={item}
                      selectedKeys={listProps.selectedKeys}
                      onItemSelect={listProps.onItemSelect}
                    />
                  ))}
                </div>
              )}
              onChange={nextKeys => {
                customTargetKeys.value = nextKeys as string[]
              }}
              onSelectChange={(sourceKeys, targetSideKeys) => {
                customSelectedKeys.value = [...sourceKeys, ...targetSideKeys] as string[]
              }}
            />
          )}
        />

        <h2>API</h2>
        <ApiTable rows={apiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default TransferDesign
