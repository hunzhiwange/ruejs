import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import PreviewBlock, { type PreviewTabMode } from './PreviewBlock'
import Select, {
  type SelectLabeledValue,
  type SelectOptionData,
} from '../../../packages/rue-design/src/components/select/index'

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

const selectColors = [
  {
    label: 'Primary',
    color: 'primary',
    placeholder: 'Pick a text editor',
    options: ['VScode', 'VScode fork', 'Another VScode fork'],
  },
  {
    label: 'Secondary',
    color: 'secondary',
    placeholder: 'Pick a language',
    options: ['Zig', 'Go', 'Rust'],
  },
  {
    label: 'Accent',
    color: 'accent',
    placeholder: 'Color scheme',
    options: ['Light mode', 'Dark mode', 'System'],
  },
  {
    label: 'Neutral',
    color: 'neutral',
    placeholder: 'Server location',
    options: ['North America', 'EU west', 'South East Asia'],
  },
  {
    label: 'Info',
    color: 'info',
    placeholder: 'Pick a Framework',
    options: ['React', 'Rue', 'Vue', 'Angular'],
  },
  {
    label: 'Success',
    color: 'success',
    placeholder: 'Pick a Runtime',
    options: ['npm', 'Bun', 'yarn'],
  },
  {
    label: 'Warning',
    color: 'warning',
    placeholder: 'Pick an OS',
    options: ['Windows', 'MacOS', 'Linux'],
  },
  {
    label: 'Error',
    color: 'error',
    placeholder: 'Pick an AI Model',
    options: ['GPT-4', 'Claude', 'Llama'],
  },
] as const

const selectSizes = [
  { label: 'Xsmall', size: 'xs' },
  { label: 'Small', size: 'sm' },
  { label: 'Medium', size: 'md' },
  { label: 'Large', size: 'lg' },
  { label: 'Xlarge', size: 'xl' },
] as const

const locationOptions: SelectOptionData[] = [
  {
    group: '全球边缘区域',
    items: [
      { name: '杭州 Hangzhou', code: 'hangzhou' },
      { name: '法兰克福 Frankfurt', code: 'frankfurt' },
    ],
  },
  {
    group: '分析节点',
    items: [
      { name: '东京 Tokyo', code: 'tokyo' },
      { name: '新加坡 Singapore', code: 'singapore', disabled: true },
    ],
  },
]

const ownerOptions: SelectOptionData[] = [
  { label: 'Platform team', value: 'platform' },
  { label: 'Design infra', value: 'design' },
  { label: 'Growth pod', value: 'growth' },
]

const releaseOptions: SelectOptionData[] = [
  { label: 'Release digest', value: 'release' },
  { label: 'Design review', value: 'design' },
  { label: 'Labs rollout', value: 'labs' },
  { label: 'Incident summary', value: 'incident', disabled: true },
]

const semanticOptions: SelectOptionData[] = [
  { label: 'Deploy preview', value: 'preview', title: '低风险预览链路' },
  { label: 'Release digest', value: 'release', title: '固定节奏周报' },
  { label: 'Labs rollout', value: 'labs', title: '实验性发布批次' },
]

const labelMap: Record<string, string> = {
  crimson: 'Crimson',
  amber: 'Amber',
  velvet: 'Velvet',
  preview: 'Deploy preview',
  hangzhou: '杭州 Hangzhou',
  frankfurt: '法兰克福 Frankfurt',
  tokyo: '东京 Tokyo',
  singapore: '新加坡 Singapore',
  platform: 'Platform team',
  design: 'Design infra',
  growth: 'Growth pod',
  release: 'Release digest',
  incident: 'Incident summary',
  labs: 'Labs rollout',
}

const basicCode = `const value = ref('amber')

<Select
  value={value.value}
  onChange={event => {
    value.value = (event.target as HTMLSelectElement).value
  }}
>
  <option value="crimson">Crimson</option>
  <option value="amber">Amber</option>
  <option value="velvet">Velvet</option>
</Select>`

const dataSourceCode = `const value = ref('hangzhou')

<Select
  value={value.value}
  placeholder="Select location"
  options={[
    {
      group: '全球边缘区域',
      items: [
        { name: '杭州 Hangzhou', code: 'hangzhou' },
        { name: '法兰克福 Frankfurt', code: 'frankfurt' },
      ],
    },
    {
      group: '分析节点',
      items: [
        { name: '东京 Tokyo', code: 'tokyo' },
        { name: '新加坡 Singapore', code: 'singapore', disabled: true },
      ],
    },
  ]}
  fieldNames={{
    groupLabel: 'group',
    options: 'items',
    label: 'name',
    value: 'code',
  }}
  onChange={event => {
    value.value = (event.target as HTMLSelectElement).value
  }}
/>`

const shellCode = `const owner = ref('platform')

<Select
  value={owner.value}
  addonBefore="Owner"
  prefix="@"
  suffix={<span className="badge badge-neutral badge-xs">stable</span>}
  allowClear
  placeholder="Select owner"
  options={[
    { label: 'Platform team', value: 'platform' },
    { label: 'Design infra', value: 'design' },
    { label: 'Growth pod', value: 'growth' },
  ]}
  onChange={event => {
    owner.value = (event.target as HTMLSelectElement).value
  }}
/>`

const semanticCode = `const selected = ref<SelectLabeledValue | null>({
  value: 'release',
  key: 'release',
  label: 'Release digest',
})

const activity = ref('init:release')

<Select
  defaultValue="release"
  labelInValue
  optionLabelProp="label"
  options={[
    { label: 'Deploy preview', value: 'preview', title: '低风险预览链路' },
    { label: 'Release digest', value: 'release', title: '固定节奏周报' },
    { label: 'Labs rollout', value: 'labs', title: '实验性发布批次' },
  ]}
  onValueChange={value => {
    selected.value = value as SelectLabeledValue | null
  }}
  onSelect={value => {
    activity.value = \`select:\${typeof value === 'object' ? value.value : value}\`
  }}
  onDeselect={value => {
    activity.value = \`deselect:\${typeof value === 'object' ? value.value : value}\`
  }}
/>`

const ghostCode = `<Select ghost className="w-full max-w-xs" defaultValue="Pick a font">
  <option disabled={true}>Pick a font</option>
  <option>Inter</option>
  <option>Poppins</option>
  <option>Raleway</option>
</Select>`

const fieldsetCode = `<fieldset className="fieldset w-72 rounded-box border border-base-300 bg-base-100 p-4">
  <legend className="fieldset-legend">Browsers</legend>
  <Select className="w-full" defaultValue="Pick a browser">
    <option disabled={true}>Pick a browser</option>
    <option>Chrome</option>
    <option>Firefox</option>
    <option>Safari</option>
  </Select>
  <span className="label">Optional</span>
</fieldset>`

const colorsCode = `<Select color="primary" defaultValue="Pick a text editor">
  <option disabled={true}>Pick a text editor</option>
  <option>VScode</option>
  <option>VScode fork</option>
  <option>Another VScode fork</option>
</Select>

<Select color="secondary" defaultValue="Pick a language">
  <option disabled={true}>Pick a language</option>
  <option>Zig</option>
  <option>Go</option>
  <option>Rust</option>
</Select>`

const statusCode = `<Select status="error" defaultValue="未通过校验">
  <option disabled={true}>未通过校验</option>
  <option>需要重新审核</option>
</Select>

<Select status="warning" variant="filled" defaultValue="接近配额上限">
  <option disabled={true}>接近配额上限</option>
  <option>扩容到专业版</option>
</Select>

<Select variant="borderless" defaultValue="Borderless variant">
  <option disabled={true}>Borderless variant</option>
  <option>Compact embed</option>
</Select>`

const sizesCode = `<Select size="xs" defaultValue="Xsmall">
  <option disabled={true}>Xsmall</option>
  <option>Xsmall Apple</option>
</Select>

<Select size="md" defaultValue="Medium">
  <option disabled={true}>Medium</option>
  <option>Medium Apple</option>
</Select>

<Select size="xl" defaultValue="Xlarge">
  <option disabled={true}>Xlarge</option>
  <option>Xlarge Apple</option>
</Select>`

const multipleCode = `const selected = ref(['release', 'labs'])

<Select
  mode="multiple"
  placeholder="Select channels"
  value={selected.value}
  options={[
    { label: 'Release digest', value: 'release' },
    { label: 'Design review', value: 'design' },
    { label: 'Labs rollout', value: 'labs' },
  ]}
  onValueChange={value => {
    selected.value = Array.isArray(value) ? (value as string[]) : []
  }}
/>`

const maxCountCode = `const selected = ref(['release', 'design'])

<Select
  mode="multiple"
  maxCount={2}
  value={selected.value}
  options={[
    { label: 'Release digest', value: 'release' },
    { label: 'Design review', value: 'design' },
    { label: 'Labs rollout', value: 'labs' },
    { label: 'Incident summary', value: 'incident', disabled: true },
  ]}
  onValueChange={value => {
    selected.value = Array.isArray(value) ? (value as string[]) : []
  }}
/>`

const nativeMultipleCode = `const selected = ref(['release', 'labs'])

<Select
  mode="multiple"
  nativeSize={6}
  value={selected.value}
  options={[
    { label: 'Release digest', value: 'release' },
    { label: 'Design review', value: 'design' },
    { label: 'Labs rollout', value: 'labs' },
  ]}
  onChange={event => {
    const element = event.target as HTMLSelectElement
    selected.value = Array.from(element.selectedOptions).map(option => option.value)
  }}
/>`

const disabledCode = `<Select disabled={true} className="w-full max-w-xs">
  <option>You can't touch this</option>
</Select>`

const loadingCode = `<Select loading placeholder="Loading environments" className="w-full max-w-xs" />

<Select notFoundContent="No regions available" placeholder="Pick a region" className="w-full max-w-xs" />`

const nativeCode = `<Select className="appearance-none w-full max-w-xs" defaultValue="Pick a color">
  <option disabled={true}>Pick a color</option>
  <option>Crimson</option>
  <option>Amber</option>
  <option>Velvet</option>
</Select>`

const apiRows: ApiRow[] = [
  {
    prop: 'allowClear',
    description: '在 shell 模式下追加清空按钮，点击后会派发原生 change 事件',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'color',
    description: '使用 Rue 当前 select-<tone> 颜色层',
    type: `'neutral' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'`,
    defaultValue: '-',
  },
  {
    prop: 'fieldNames',
    description: '自定义 options 数据源里的 label、value、options、groupLabel 字段名',
    type: 'SelectFieldNames',
    defaultValue: '{ label, value, options, groupLabel }',
  },
  {
    prop: 'ghost',
    description: '支持API，等价于 variant="ghost" 的快捷写法',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'loading',
    description: '显示 loading 状态并暂时禁用选择器',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'labelInValue',
    description: '让 onValueChange / onSelect / onDeselect 返回 { value, label, key } 结构',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'maxCount',
    description: '多选模式下限制可选数量，超出后回退到允许范围内的选择结果',
    type: 'number',
    defaultValue: '-',
  },
  {
    prop: 'mode',
    description: '当前支持 `multiple`；默认渲染紧凑下拉多选，配合 nativeSize 时回退到原生 listbox',
    type: '`multiple`',
    defaultValue: '-',
  },
  {
    prop: 'nativeSize',
    description:
      '原生 size 属性；在 mode="multiple" 下显式传入时会启用浏览器 listbox 形态并控制可见行数',
    type: 'number | string',
    defaultValue: '-',
  },
  {
    prop: 'notFoundContent',
    description: '当没有 children 与 options 时渲染的空态 option 文案',
    type: 'any',
    defaultValue: '`暂无可选项`',
  },
  {
    prop: 'onClear',
    description: '点击清空按钮后触发，适合做埋点或同步外部状态',
    type: '(event: MouseEvent) => void',
    defaultValue: '-',
  },
  {
    prop: 'onDeselect',
    description: '多选取消或单选切换掉原值时触发，返回被移除的值与 option 信息',
    type: '(value, option, event) => void',
    defaultValue: '-',
  },
  {
    prop: 'onSelect',
    description: '选择某个 option 时触发，返回新增值与 option 信息',
    type: '(value, option, event) => void',
    defaultValue: '-',
  },
  {
    prop: 'onValueChange',
    description: '比原生 onChange 更语义化，直接返回 value 与 labels / options 上下文',
    type: '(value, context) => void',
    defaultValue: '-',
  },
  {
    prop: 'options',
    description: '使用结构化数据声明 option / optgroup，而不是手写 children',
    type: 'SelectOptionData[]',
    defaultValue: '-',
  },
  {
    prop: 'optionLabelProp',
    description: '指定语义回调和 labelInValue 优先读取哪个字段作为 label',
    type: 'string',
    defaultValue: '`label` / 文本内容',
  },
  {
    prop: 'placeholder',
    description: '在单选模式下注入占位 option，可与 allowClear 联动',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'prefix / suffix / addonBefore / addonAfter',
    description: '进入 shell 布局，把说明性内容嵌入到选择器两侧',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'selectClassName',
    description: 'shell 模式下追加到内部原生 select，普通模式下与 className 合并',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'showArrow / suffixIcon',
    description: 'shell 模式下控制默认箭头或自定义后置图标，不改变原生下拉行为',
    type: 'boolean / any',
    defaultValue: 'true / -',
  },
  {
    prop: 'size / uiSize',
    description: '支持 xs-sm-md-lg-xl 与 small-middle-large 别名；数字仍按原生 size 处理',
    type: 'SelectVisualSize | number | string',
    defaultValue: '-',
  },
  {
    prop: 'status',
    description: '表单状态色，优先级高于 color，适合校验反馈',
    type: '`success` | `warning` | `error`',
    defaultValue: '-',
  },
  {
    prop: 'variant',
    description: '选择器外观变体，补充 filled / ghost / borderless 语义',
    type: '`outlined` | `filled` | `ghost` | `borderless`',
    defaultValue: '`outlined`',
  },
]

const SelectPage: FC = () => {
  const basicValue = ref('amber')
  const locationValue = ref('hangzhou')
  const ownerValue = ref('platform')
  const semanticValue = ref<SelectLabeledValue | null>({
    value: 'release',
    key: 'release',
    label: 'Release digest',
  })
  const semanticActivity = ref('init:release')
  const multipleValue = ref<string[]>(['release', 'labs'])
  const nativeMultipleValue = ref<string[]>(['release', 'labs'])
  const limitedValue = ref<string[]>(['release', 'design'])

  const tabs = {
    basic: ref<PreviewTabMode>('preview'),
    data: ref<PreviewTabMode>('preview'),
    shell: ref<PreviewTabMode>('preview'),
    semantic: ref<PreviewTabMode>('preview'),
    ghost: ref<PreviewTabMode>('preview'),
    fieldset: ref<PreviewTabMode>('preview'),
    colors: ref<PreviewTabMode>('preview'),
    status: ref<PreviewTabMode>('preview'),
    sizes: ref<PreviewTabMode>('preview'),
    multiple: ref<PreviewTabMode>('preview'),
    nativeMultiple: ref<PreviewTabMode>('preview'),
    maxCount: ref<PreviewTabMode>('preview'),
    disabled: ref<PreviewTabMode>('preview'),
    loading: ref<PreviewTabMode>('preview'),
    native: ref<PreviewTabMode>('preview'),
  }

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Select 选择器</h1>
        <p className="text-sm mt-3 mb-3">
          Select 用于从一组选项中选择一个或多个值。组件使用 Rue 当前的原生 select
          语义：单选仍然是浏览器自己的下拉行为，mode="multiple" 默认切到紧凑下拉标签模式，而显式传入
          nativeSize 或原生 multiple 时会回到浏览器 listbox；同时补上 options
          数据源、fieldNames、allowClear、status、variant、语义回调与前后缀 shell 等更接近业务开发的
          API。
        </p>

        <div className="not-prose mt-8 space-y-2">
          <h2 className="text-2xl font-semibold">基础能力</h2>
          <p className="text-sm text-base-content/70">
            先展示 children 写法，再把数据驱动、分组和 shell 组合能力补进来。
          </p>
        </div>

        <PreviewBlock
          title="Select"
          tab={tabs.basic}
          preview={() => (
            <div className="card border border-base-200/80 bg-base-100 shadow-sm">
              <div className="card-body gap-3">
                <Select
                  value={basicValue.value}
                  data-testid="select-basic"
                  className="w-full max-w-xs"
                  onChange={(event: Event) => {
                    basicValue.value = (event.target as HTMLSelectElement | null)?.value ?? 'amber'
                  }}
                >
                  <option value="crimson">Crimson</option>
                  <option value="amber">Amber</option>
                  <option value="velvet">Velvet</option>
                </Select>
                <span className="text-sm text-base-content/70">
                  当前选择：{labelMap[basicValue.value] ?? basicValue.value}
                </span>
              </div>
            </div>
          )}
          code={basicCode}
        />

        <PreviewBlock
          title="Data source and groups"
          tab={tabs.data}
          preview={() => (
            <div className="card border border-base-200/80 bg-base-100 shadow-sm">
              <div className="card-body grid gap-4 lg:grid-cols-[minmax(0,20rem),1fr] lg:items-start">
                <div className="grid gap-3">
                  <Select
                    value={locationValue.value}
                    placeholder="Select location"
                    options={locationOptions}
                    fieldNames={{
                      groupLabel: 'group',
                      options: 'items',
                      label: 'name',
                      value: 'code',
                    }}
                    className="w-full"
                    data-testid="select-data-source"
                    onChange={(event: Event) => {
                      locationValue.value = (event.target as HTMLSelectElement | null)?.value ?? ''
                    }}
                  />
                  <p className="m-0 text-sm text-base-content/70">
                    当前部署区域：{labelMap[locationValue.value] ?? '未设置'}
                  </p>
                </div>
                <ul className="list rounded-box border border-base-300 bg-base-200/40 p-4 text-sm">
                  <li className="list-row">
                    <span className="font-medium">适用场景</span>
                    <span className="list-col-grow text-base-content/70">
                      多级地区、分组资源池、后端枚举字典。
                    </span>
                  </li>
                  <li className="list-row">
                    <span className="font-medium">支持方式</span>
                    <span className="list-col-grow text-base-content/70">
                      保持 children，同时允许后续切换到 options。
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}
          code={dataSourceCode}
        />

        <PreviewBlock
          title="Prefix, suffix and allowClear"
          tab={tabs.shell}
          preview={() => (
            <div className="card border border-base-200/80 bg-base-100 shadow-sm">
              <div className="card-body grid gap-3 lg:grid-cols-[minmax(0,22rem),1fr] lg:items-start">
                <div className="grid gap-3">
                  <Select
                    value={ownerValue.value}
                    addonBefore="Owner"
                    prefix="@"
                    suffix={<span className="badge badge-neutral badge-xs">stable</span>}
                    allowClear
                    placeholder="Select owner"
                    options={ownerOptions}
                    className="w-full"
                    data-testid="select-shell-demo"
                    onChange={(event: Event) => {
                      ownerValue.value = (event.target as HTMLSelectElement | null)?.value ?? ''
                    }}
                  />
                  <p className="m-0 text-sm text-base-content/70">
                    当前 owner：{labelMap[ownerValue.value] ?? '未设置'}
                  </p>
                </div>
                <div className="rounded-box border border-dashed border-base-300 bg-base-100/80 p-4 text-sm text-base-content/70">
                  这个场景适合做环境、Owner、命名空间、租户等“选择器本身需要上下文”的表单。
                </div>
              </div>
            </div>
          )}
          code={shellCode}
        />

        <PreviewBlock
          title="Label in value and semantic callbacks"
          tab={tabs.semantic}
          preview={() => (
            <div className="card border border-base-200/80 bg-base-100 shadow-sm">
              <div className="card-body grid gap-4 lg:grid-cols-[minmax(0,22rem),1fr] lg:items-start">
                <div className="grid gap-3">
                  <Select
                    defaultValue="release"
                    labelInValue
                    optionLabelProp="label"
                    options={semanticOptions}
                    className="w-full"
                    onValueChange={value => {
                      semanticValue.value = (value as SelectLabeledValue | null) ?? null
                    }}
                    onSelect={value => {
                      semanticActivity.value = `select:${typeof value === 'object' ? value.value : value}`
                    }}
                    onDeselect={value => {
                      semanticActivity.value = `deselect:${typeof value === 'object' ? value.value : value}`
                    }}
                  />
                  <div className="rounded-box border border-base-300 bg-base-200/40 p-3 text-sm text-base-content/70">
                    当前结构：
                    <code className="ml-2">{JSON.stringify(semanticValue.value)}</code>
                  </div>
                </div>
                <div className="grid gap-3 text-sm">
                  <div className="rounded-box border border-dashed border-base-300 bg-base-100/80 p-4 text-base-content/70">
                    最新事件：{semanticActivity.value}
                  </div>
                  <ul className="list rounded-box border border-base-300 bg-base-200/40 p-4 text-sm">
                    <li className="list-row">
                      <span className="font-medium">适用场景</span>
                      <span className="list-col-grow text-base-content/70">
                        表单引擎、埋点上报、需要同步 label 与 value 的配置面板。
                      </span>
                    </li>
                    <li className="list-row">
                      <span className="font-medium">保持原生</span>
                      <span className="list-col-grow text-base-content/70">
                        回调升级了，但实际交互仍然是原生单选下拉，不额外引入自定义弹层。
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
          code={semanticCode}
        />

        <PreviewBlock
          title="Ghost"
          tab={tabs.ghost}
          preview={
            <div className="card border border-base-200/80 bg-base-100 shadow-sm">
              <div className="card-body">
                <Select ghost className="w-full max-w-xs" defaultValue="Pick a font">
                  <option disabled={true}>Pick a font</option>
                  <option>Inter</option>
                  <option>Poppins</option>
                  <option>Raleway</option>
                </Select>
              </div>
            </div>
          }
          code={ghostCode}
        />

        <PreviewBlock
          title="With fieldset and labels"
          tab={tabs.fieldset}
          preview={
            <div className="card border border-base-200/80 bg-base-100 shadow-sm">
              <div className="card-body">
                <fieldset className="fieldset w-72 rounded-box border border-base-300 bg-base-100 p-4">
                  <legend className="fieldset-legend">Browsers</legend>
                  <Select className="w-full" defaultValue="Pick a browser">
                    <option disabled={true}>Pick a browser</option>
                    <option>Chrome</option>
                    <option>FireFox</option>
                    <option>Safari</option>
                  </Select>
                  <span className="label">Optional</span>
                </fieldset>
              </div>
            </div>
          }
          code={fieldsetCode}
        />

        <PreviewBlock
          title="Color variants"
          tab={tabs.colors}
          preview={
            <div className="card border border-base-200/80 bg-base-100 shadow-sm">
              <div className="card-body grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {selectColors.map(example => (
                  <div key={example.label} className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/60">
                      {example.label}
                    </span>
                    <Select
                      color={example.color}
                      className="w-full"
                      defaultValue={example.placeholder}
                    >
                      <option disabled={true}>{example.placeholder}</option>
                      {example.options.map(option => (
                        <option key={option}>{option}</option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          }
          code={colorsCode}
        />

        <div className="not-prose mt-10 space-y-2">
          <h2 className="text-2xl font-semibold">增强场景</h2>
          <p className="text-sm text-base-content/70">
            status、variant、紧凑多选、loading 与空态覆盖常见业务表单场景。
          </p>
        </div>

        <PreviewBlock
          title="Status and variants"
          tab={tabs.status}
          preview={
            <div className="card border border-base-200/80 bg-base-100 shadow-sm">
              <div className="card-body grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Select status="error" defaultValue="未通过校验" className="w-full">
                  <option disabled={true}>未通过校验</option>
                  <option>需要重新审核</option>
                </Select>
                <Select
                  status="warning"
                  variant="filled"
                  defaultValue="接近配额上限"
                  className="w-full"
                >
                  <option disabled={true}>接近配额上限</option>
                  <option>扩容到专业版</option>
                </Select>
                <Select
                  status="success"
                  variant="filled"
                  defaultValue="同步完成"
                  className="w-full"
                >
                  <option disabled={true}>同步完成</option>
                  <option>继续部署</option>
                </Select>
                <Select variant="borderless" defaultValue="Borderless variant" className="w-full">
                  <option disabled={true}>Borderless variant</option>
                  <option>Compact embed</option>
                </Select>
              </div>
            </div>
          }
          code={statusCode}
        />

        <PreviewBlock
          title="Sizes"
          tab={tabs.sizes}
          preview={
            <div className="card border border-base-200/80 bg-base-100 shadow-sm">
              <div className="card-body flex flex-col items-start gap-4">
                {selectSizes.map(example => (
                  <Select
                    key={example.label}
                    size={example.size}
                    className="w-full max-w-xs"
                    defaultValue={example.label}
                  >
                    <option disabled={true}>{example.label}</option>
                    <option>{example.label} Apple</option>
                    <option>{example.label} Orange</option>
                    <option>{example.label} Tomato</option>
                  </Select>
                ))}
              </div>
            </div>
          }
          code={sizesCode}
        />

        <PreviewBlock
          title="Multiple selection"
          tab={tabs.multiple}
          preview={
            <div className="card border border-base-200/80 bg-base-100 shadow-sm">
              <div className="card-body grid gap-4 lg:grid-cols-[minmax(0,20rem),1fr] lg:items-start">
                <div className="grid gap-3">
                  <Select
                    mode="multiple"
                    placeholder="Select channels"
                    value={multipleValue.value}
                    options={releaseOptions}
                    className="w-full"
                    data-testid="select-multiple"
                    onValueChange={value => {
                      multipleValue.value = Array.isArray(value) ? (value as string[]) : []
                    }}
                  />
                  <p className="m-0 text-sm text-base-content/70">
                    已选择：
                    {multipleValue.value.length
                      ? multipleValue.value.map(value => labelMap[value] ?? value).join(' / ')
                      : '无'}
                  </p>
                </div>
                <div className="mockup-code text-xs">
                  <pre data-prefix="$">
                    <code>默认是紧凑下拉多选，不再自动占满垂直空间</code>
                  </pre>
                  <pre data-prefix="$">
                    <code>已选项会以内联标签展示，并保持下拉面板勾选态</code>
                  </pre>
                </div>
              </div>
            </div>
          }
          code={multipleCode}
        />

        <PreviewBlock
          title="Native multiple listbox via nativeSize"
          tab={tabs.nativeMultiple}
          preview={() => (
            <div className="card border border-base-200/80 bg-base-100 shadow-sm">
              <div className="card-body grid gap-4 lg:grid-cols-[minmax(0,20rem),1fr] lg:items-start">
                <div className="grid gap-3">
                  <Select
                    mode="multiple"
                    nativeSize={6}
                    value={nativeMultipleValue.value}
                    options={releaseOptions}
                    className="w-full"
                    data-testid="select-native-multiple"
                    onChange={(event: Event) => {
                      const element = event.target as HTMLSelectElement | null
                      nativeMultipleValue.value = element
                        ? Array.from(element.selectedOptions).map(option => option.value)
                        : []
                    }}
                  />
                  <p className="m-0 text-sm text-base-content/70">
                    仍可通过 nativeSize 回退到原生 listbox：
                    {nativeMultipleValue.value.length
                      ? nativeMultipleValue.value.map(value => labelMap[value] ?? value).join(' / ')
                      : '无'}
                  </p>
                </div>
                <div className="rounded-box border border-dashed border-base-300 bg-base-100/80 p-4 text-sm text-base-content/70">
                  这个模式适合后台工具、批量操作或需要一次性看到更多可选项的场景。只要显式传入
                  nativeSize，Select 就会保持浏览器自己的多选列表框行为。
                </div>
              </div>
            </div>
          )}
          code={nativeMultipleCode}
        />

        <PreviewBlock
          title="Multiple with maxCount"
          tab={tabs.maxCount}
          preview={
            <div className="card border border-base-200/80 bg-base-100 shadow-sm">
              <div className="card-body grid gap-4 lg:grid-cols-[minmax(0,20rem),1fr] lg:items-start">
                <div className="grid gap-3">
                  <Select
                    mode="multiple"
                    nativeSize={6}
                    maxCount={2}
                    value={limitedValue.value}
                    options={releaseOptions}
                    className="w-full"
                    onValueChange={value => {
                      limitedValue.value = Array.isArray(value) ? (value as string[]) : []
                    }}
                  />
                  <p className="m-0 text-sm text-base-content/70">
                    最多保持 2 项：
                    {limitedValue.value.length
                      ? limitedValue.value.map(value => labelMap[value] ?? value).join(' / ')
                      : '无'}
                  </p>
                </div>
                <div className="rounded-box border border-dashed border-base-300 bg-base-100/80 p-4 text-sm text-base-content/70">
                  这个限制发生在原生 listbox
                  选择完成后，组件会把超出的选择自动裁剪回允许范围，适合权限绑定、通知订阅、灰度批次等固定上限场景。
                </div>
              </div>
            </div>
          }
          code={maxCountCode}
        />

        <PreviewBlock
          title="Disabled"
          tab={tabs.disabled}
          preview={
            <div className="card border border-base-200/80 bg-base-100 shadow-sm">
              <div className="card-body">
                <Select disabled={true} className="w-full max-w-xs" data-testid="select-disabled">
                  <option>You can't touch this</option>
                </Select>
              </div>
            </div>
          }
          code={disabledCode}
        />

        <PreviewBlock
          title="Loading and empty states"
          tab={tabs.loading}
          preview={
            <div className="card border border-base-200/80 bg-base-100 shadow-sm">
              <div className="card-body grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/60">
                    Loading
                  </span>
                  <Select loading placeholder="Loading environments" className="w-full" />
                </div>
                <div className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-base-content/60">
                    Empty
                  </span>
                  <Select
                    notFoundContent="No regions available"
                    placeholder="Pick a region"
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          }
          code={loadingCode}
        />

        <div className="not-prose mt-10 space-y-2">
          <h2 className="text-2xl font-semibold">原生语义</h2>
          <p className="text-sm text-base-content/70">
            需要时仍可直接退回原生 select 的细粒度控制，例如 appearance 与浏览器默认下拉箭头处理。
          </p>
        </div>

        <PreviewBlock
          title="Using OS native style"
          tab={tabs.native}
          preview={
            <div className="card border border-base-200/80 bg-base-100 shadow-sm">
              <div className="card-body">
                <Select className="appearance-none w-full max-w-xs" defaultValue="Pick a color">
                  <option disabled={true}>Pick a color</option>
                  <option>Crimson</option>
                  <option>Amber</option>
                  <option>Velvet</option>
                </Select>
              </div>
            </div>
          }
          code={nativeCode}
        />

        <div className="not-prose mt-10 space-y-4">
          <h2 className="text-2xl font-semibold">API</h2>
          <p className="text-sm text-base-content/70">
            下面列出组件后最值得关注的 Select API。原生 select 的
            name、disabled、required、multiple、onChange
            等属性仍全部透传，单选下拉也仍然由浏览器自己渲染。
          </p>
          <ApiTable rows={apiRows} />
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default SelectPage
