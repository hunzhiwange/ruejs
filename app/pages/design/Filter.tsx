import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import PreviewBlock, { type PreviewTabMode } from './PreviewBlock'
import { Filter } from '@rue-js/design'
interface ApiRow {
  prop: string
  description: string
  type: string
  defaultValue: string
}

const viewModes = [
  { label: '规划中', value: 'planning' },
  { label: '开发中', value: 'building' },
  { label: '待验证', value: 'qa' },
  { label: '已发布', value: 'released' },
] as const

const signalModes = [
  { label: '搜索', value: 'search' },
  { label: '收藏', value: 'favorite' },
  { label: '提醒', value: 'alerts' },
  { label: '归档', value: 'archive' },
] as const

const priorityModes = [
  { label: '全部', value: 'all', color: 'neutral' as const },
  { label: '高优先级', value: 'high', color: 'error' as const, variant: 'filled' as const },
  { label: '需关注', value: 'watch', color: 'warning' as const, variant: 'filled' as const },
  { label: '稳定', value: 'stable', color: 'success' as const, variant: 'outlined' as const },
] as const

const filterApiRows: ApiRow[] = [
  {
    prop: 'as',
    description: '根节点模式，可选 form 或 div',
    type: `'form' | 'div'`,
    defaultValue: `'form'`,
  },
  {
    prop: 'items',
    description: '数据驱动筛选项，支持字符串、数字、布尔值或对象',
    type: 'ReadonlyArray<FilterItemData | FilterValue>',
    defaultValue: '[]',
  },
  {
    prop: 'name',
    description: '统一传给子项的 name；radio 模式未传时会自动生成分组名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'type',
    description: '输入类型，决定单选或多选',
    type: `'radio' | 'checkbox'`,
    defaultValue: `'radio'`,
  },
  {
    prop: 'multiple',
    description: '多选快捷开关，等价于 type="checkbox"',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'value',
    description: '受控值；单选传单值，多选传数组',
    type: 'FilterValue | FilterValue[]',
    defaultValue: '-',
  },
  {
    prop: 'defaultValue',
    description: '非受控默认值；form 模式 reset 会回到该初始状态',
    type: 'FilterValue | FilterValue[]',
    defaultValue: '-',
  },
  {
    prop: 'onChange',
    description: '选中项变化回调，返回当前值与 values 元信息',
    type: '(value, event, meta) => void',
    defaultValue: '-',
  },
  {
    prop: 'reset',
    description: '自动渲染 Reset，支持布尔或配置对象',
    type: 'boolean | FilterResetProps',
    defaultValue: 'false',
  },
  {
    prop: 'color',
    description: '整组默认颜色，单项可覆盖',
    type: `'default' | 'danger' | 'neutral' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'`,
    defaultValue: `'default'`,
  },
  {
    prop: 'variant',
    description: '整组默认视觉变体',
    type: `'solid' | 'filled' | 'outlined' | 'dashed' | 'text'`,
    defaultValue: `'solid'`,
  },
  {
    prop: 'size',
    description: '整组默认尺寸，支持 xs-xl 与 small/middle/large 别名',
    type: `'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'medium' | 'middle' | 'large'`,
    defaultValue: '-',
  },
]

const itemApiRows: ApiRow[] = [
  {
    prop: 'label',
    description: '筛选项文案；会映射到 aria-label',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'value',
    description: '筛选值；未传时会尝试使用 label',
    type: 'FilterValue',
    defaultValue: '-',
  },
  {
    prop: 'checked / defaultChecked',
    description: '单项受控或非受控选中状态',
    type: 'boolean',
    defaultValue: '-',
  },
  {
    prop: 'color / variant / size',
    description: '覆盖根组件的按钮样式配置',
    type: 'FilterColor / FilterVariant / FilterSize',
    defaultValue: '-',
  },
  {
    prop: 'type',
    description: '单项输入类型，默认继承根组件',
    type: `'radio' | 'checkbox'`,
    defaultValue: '继承',
  },
]

const resetApiRows: ApiRow[] = [
  {
    prop: 'mode',
    description: 'Reset 的交互模式，form 为恢复默认值，div 为清空选中',
    type: `'form' | 'div'`,
    defaultValue: '继承根组件',
  },
  {
    prop: 'label',
    description: 'Reset 文案；form 模式映射到 value，div 模式映射到 aria-label',
    type: 'any',
    defaultValue: `'×'`,
  },
  {
    prop: 'color / variant / size',
    description: 'Reset 按钮的样式覆盖',
    type: 'FilterColor / FilterVariant / FilterSize',
    defaultValue: '继承',
  },
]

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

const ControlledFilterPreview: FC = () => {
  const activeStage = ref<string | undefined>(undefined)
  const clearStage = () => {
    activeStage.value = undefined
  }

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body gap-4">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className={`btn btn-primary btn-outline ${activeStage.value === undefined ? 'btn-active' : ''}`}
            onClick={clearStage}
            aria-label="全"
          >
            全
          </button>
          <Filter
            as="div"
            items={viewModes}
            value={activeStage.value}
            onChange={(
              value: string | number | boolean | Array<string | number | boolean> | undefined,
            ) => {
              activeStage.value = Array.isArray(value)
                ? String(value[0] ?? '') || undefined
                : (value as string | undefined)
            }}
            color="primary"
            variant="outlined"
          />
        </div>
        <div className="text-sm text-base-content/70">
          当前阶段：<code>{activeStage.value ?? 'all'}</code>
        </div>
      </div>
    </div>
  )
}

const MultipleFilterPreview: FC = () => {
  const selectedSignals = ref<string[]>(['search', 'alerts'])

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body gap-4">
        <Filter
          multiple
          items={signalModes}
          value={selectedSignals.value}
          onChange={value => {
            selectedSignals.value = Array.isArray(value)
              ? value.map(item => String(item))
              : value
                ? [String(value)]
                : []
          }}
          reset={{ label: '×' }}
        />
        <div className="text-sm text-base-content/70">
          已选择：
          <code>{selectedSignals.value.length ? selectedSignals.value.join(', ') : 'none'}</code>
        </div>
      </div>
    </div>
  )
}

const FilterPage: FC = () => {
  const tabRecommended = ref<PreviewTabMode>('preview')
  const tabMultiple = ref<PreviewTabMode>('preview')
  const tabStyle = ref<PreviewTabMode>('preview')
  const tabForm = ref<PreviewTabMode>('preview')
  const tabDiv = ref<PreviewTabMode>('preview')
  const tabGrouped = ref<PreviewTabMode>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Filter 筛选器</h1>
        <p className="text-sm mt-3 mb-3">
          Filter 使用 Rue 当前的 <code>filter + btn</code> 视觉风格，在此基础上补了一层更顺手的
          API： 可以使用 <code>Filter.Item</code> / <code>Filter.Reset</code> 组合写法，也可以直接用
          <code>items</code>、<code>value</code>、<code>onChange</code> 组织整组筛选。
        </p>

        <h2>何时使用</h2>
        <ul>
          <li>需要一排轻量筛选按钮，并保持 Rue 当前视觉。</li>
          <li>需要同时覆盖表单重置、即时切换和多选标签场景。</li>
          <li>需要在展示基础 compound 写法的同时，逐步切换到数据驱动写法。</li>
        </ul>

        <h2>推荐用法</h2>
        <p>
          推荐优先使用 <code>items</code> 模式，把筛选项、默认值和变体样式统一放到根组件上管理。
        </p>

        <PreviewBlock
          title="数据驱动与受控状态"
          tab={tabRecommended}
          preview={<ControlledFilterPreview />}
          code={`const stage = ref<string | undefined>()

const clearStage = () => {
  stage.value = undefined
}

const items = [
  { label: '规划中', value: 'planning' },
  { label: '开发中', value: 'building' },
  { label: '待验证', value: 'qa' },
  { label: '已发布', value: 'released' },
] as const

<div className="flex flex-wrap gap-1">
  <button
    type="button"
    className={\`btn btn-primary btn-outline \${stage.value === undefined ? 'btn-active' : ''}\`}
    onClick={clearStage}
    aria-label="全"
  >
    全
  </button>
  <Filter
    as="div"
    items={items}
    value={stage.value}
    onChange={value => {
      stage.value = Array.isArray(value) ? String(value[0] ?? '') || undefined : (value as string | undefined)
    }}
    color="primary"
    variant="outlined"
  />
</div>`}
        />

        <PreviewBlock
          title="多选筛选"
          tab={tabMultiple}
          preview={<MultipleFilterPreview />}
          code={`const selectedSignals = ref<string[]>(['search', 'alerts'])

<Filter
  multiple
  items={[
    { label: '搜索', value: 'search' },
    { label: '收藏', value: 'favorite' },
    { label: '提醒', value: 'alerts' },
    { label: '归档', value: 'archive' },
  ]}
  value={selectedSignals.value}
  onChange={value => {
    selectedSignals.value = Array.isArray(value) ? value.map(item => String(item)) : value ? [String(value)] : []
  }}
  reset={{ label: '×' }}
/>`}
        />

        <PreviewBlock
          title="样式覆盖"
          tab={tabStyle}
          preview={() => (
            <div className="card bg-base-100 shadow-sm">
              <div className="card-body gap-5">
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-[0.2em] opacity-60">
                    Tone Overrides
                  </div>
                  <Filter as="div" items={priorityModes} defaultValue="all" variant="outlined" />
                </div>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-[0.2em] opacity-60">
                    Sizes
                  </div>
                  <div className="grid gap-3">
                    <Filter as="div" items={viewModes} size="xs" reset={{ label: 'All' }} />
                    <Filter as="div" items={viewModes} size="sm" reset={{ label: 'All' }} />
                    <Filter as="div" items={viewModes} size="lg" reset={{ label: 'All' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          code={`<Filter
  as="div"
  items={[
    { label: '全部', value: 'all', color: 'neutral' },
    { label: '高优先级', value: 'high', color: 'error', variant: 'filled' },
    { label: '需关注', value: 'watch', color: 'warning', variant: 'filled' },
    { label: '稳定', value: 'stable', color: 'success', variant: 'outlined' },
  ]}
  defaultValue="all"
  variant="outlined"
/>

<Filter as="div" items={viewModes} size="xs" reset={{ label: 'All' }} />
<Filter as="div" items={viewModes} size="sm" reset={{ label: 'All' }} />
<Filter as="div" items={viewModes} size="lg" reset={{ label: 'All' }} />`}
        />

        <PreviewBlock
          title="Filter using form"
          tab={tabForm}
          preview={() => (
            <Filter data-testid="filter-form">
              <Filter.Reset mode="form" value="×" />
              <Filter.Item name="framework-form" aria-label="Rue" />
              <Filter.Item name="framework-form" aria-label="React" />
              <Filter.Item name="framework-form" aria-label="Svelte" />
            </Filter>
          )}
          code={`<Filter>
  <Filter.Reset mode="form" value="×" />
  <Filter.Item name="framework-form" aria-label="Rue" />
  <Filter.Item name="framework-form" aria-label="React" />
  <Filter.Item name="framework-form" aria-label="Svelte" />
</Filter>`}
        />

        <PreviewBlock
          title="Filter using div"
          tab={tabDiv}
          preview={() => (
            <Filter as="div">
              <Filter.Reset mode="div" name="framework-div" aria-label="×" />
              <Filter.Item name="framework-div" aria-label="Design" />
              <Filter.Item name="framework-div" aria-label="Code" />
              <Filter.Item name="framework-div" aria-label="Ship" />
            </Filter>
          )}
          code={`<Filter as="div">
  <Filter.Reset mode="div" name="framework-div" aria-label="×" />
  <Filter.Item name="framework-div" aria-label="Design" />
  <Filter.Item name="framework-div" aria-label="Code" />
  <Filter.Item name="framework-div" aria-label="Ship" />
</Filter>`}
        />

        <PreviewBlock
          title="Filter with grouped options"
          tab={tabGrouped}
          preview={() => (
            <div className="grid gap-4">
              <Filter>
                <Filter.Reset mode="form" value="×" />
                <Filter.Item name="framework-group" aria-label="Vue" />
                <Filter.Item name="framework-group" aria-label="React" data-testid="filter-react" />
                <Filter.Item name="framework-group" aria-label="Rue" />
                <Filter.Item name="framework-group" aria-label="Solid" />
              </Filter>
              <p className="text-sm text-base-content/70">
                每组筛选项都需要唯一的 name，并通过 aria-label 提供按钮文案。
              </p>
            </div>
          )}
          code={`<Filter>
  <Filter.Reset mode="form" value="×" />
  <Filter.Item name="framework-group" aria-label="Vue" />
  <Filter.Item name="framework-group" aria-label="React" />
  <Filter.Item name="framework-group" aria-label="Rue" />
  <Filter.Item name="framework-group" aria-label="Solid" />
</Filter>`}
        />

        <h2 id="filter-api">API</h2>
        <p>当前页面展示的是语义化的 Filter API；基础的 compound 写法仍然可用。</p>

        <h3>Filter</h3>
        <ApiTable rows={filterApiRows} />

        <h3>Filter.Item</h3>
        <ApiTable rows={itemApiRows} />

        <h3>Filter.Reset</h3>
        <ApiTable rows={resetApiRows} />

        <h2>FAQ</h2>

        <h3>什么时候用 form，什么时候用 div？</h3>
        <p>
          <code>form</code> 适合表单内筛选，点击 <code>Reset</code> 会回到 <code>defaultValue</code>
          对应的初始状态；<code>div</code> 更适合即时交互场景，Reset 会直接清空当前选中。
        </p>

        <h3>为什么推荐使用 label 而不是只写 aria-label？</h3>
        <p>
          基础写法保持 <code>aria-label</code>，但语义 API 下优先推荐 <code>label</code>，这样在
          <code>items</code> 模式里既能声明按钮文案，也更方便推导默认 <code>value</code>。
        </p>

        <h3>受控模式和多选模式怎么返回值？</h3>
        <p>
          单选模式下，<code>onChange</code> 返回单个值或 <code>undefined</code>
          ；多选模式下返回数组。 同时第三个参数里的 <code>values</code>{' '}
          会始终给出当前整组已选值，便于统一处理。
        </p>
      </div>
    </SidebarPlayground>
  )
}

export default FilterPage
