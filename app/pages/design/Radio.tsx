import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import { Tabs } from '@rue-js/design'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'
import Radio from '../../../packages/rue-design/src/components/radio/index'
import { renderDesignPreview } from './preview-test-gate'

const colors = [
  'neutral',
  'primary',
  'secondary',
  'accent',
  'success',
  'warning',
  'info',
  'error',
] as const
const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const

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

      {tab.value === 'preview' ? (
        renderDesignPreview(title, preview)
      ) : (
        <Code className="mt-2" lang="tsx" code={code} />
      )}
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

const radioApiRows: ApiRow[] = [
  {
    prop: 'buttonStyle',
    description: '按钮形态下的视觉风格，Radio.Button 或 optionType="button" 时生效',
    type: `'outline' | 'solid'`,
    defaultValue: `'outline'`,
  },
  {
    prop: 'checked',
    description: '受控选中状态',
    type: 'boolean',
    defaultValue: '-',
  },
  {
    prop: 'className',
    description: '默认模式作用于 input，按钮模式作用于按钮表面',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'color',
    description: '选中点或按钮激活色',
    type: `'neutral' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'info' | 'error'`,
    defaultValue: '-',
  },
  {
    prop: 'contentClassName',
    description: '包裹 children 内容区域的类名',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'defaultChecked',
    description: '非受控初始选中状态',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'disabled',
    description: '禁用单个选项',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'onChange',
    description: '值变化时回调，返回 event 和 { checked, value, optionType }',
    type: '(event, meta) => void',
    defaultValue: '-',
  },
  {
    prop: 'onCheckedChange',
    description: '仅关心 checked 布尔值时使用',
    type: '(checked, event) => void',
    defaultValue: '-',
  },
  {
    prop: 'optionType',
    description: '切换为默认圆点形态或按钮形态',
    type: `'default' | 'button'`,
    defaultValue: `'default'`,
  },
  {
    prop: 'rootClassName',
    description: '外层 label 容器类名，适合做卡片式单选项',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'size',
    description: '尺寸，支持 xs 到 xl 以及 small / middle / medium / large 别名',
    type: `'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'middle' | 'medium' | 'large'`,
    defaultValue: '-',
  },
  {
    prop: 'value',
    description: '选项值，供 Group 或业务状态比较使用',
    type: 'string | number | boolean',
    defaultValue: '-',
  },
]

const groupApiRows: ApiRow[] = [
  {
    prop: 'block',
    description: '让选项按容器宽度伸展，适合卡片或按钮组',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'buttonStyle',
    description: '按钮组的视觉风格',
    type: `'outline' | 'solid'`,
    defaultValue: `'outline'`,
  },
  {
    prop: 'color',
    description: '组选中态的默认颜色，可被单个 option 覆盖',
    type: `'neutral' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'info' | 'error'`,
    defaultValue: '-',
  },
  {
    prop: 'defaultValue',
    description: '非受控默认值',
    type: 'string | number | boolean',
    defaultValue: '-',
  },
  {
    prop: 'disabled',
    description: '禁用整个单选组',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'name',
    description: '组内 input 的 name；未传时会自动生成',
    type: 'string',
    defaultValue: '自动生成',
  },
  {
    prop: 'onChange',
    description: '组选中值变化时回调，返回 nextValue、event 和 meta',
    type: '(value, event, meta) => void',
    defaultValue: '-',
  },
  {
    prop: 'options',
    description: '推荐的配置化写法，适合表单 schema 或配置驱动页面',
    type: 'Array<RadioOption | string | number | boolean>',
    defaultValue: '-',
  },
  {
    prop: 'optionType',
    description: '统一控制组内是默认单选点还是按钮风格',
    type: `'default' | 'button'`,
    defaultValue: `'default'`,
  },
  {
    prop: 'orientation',
    description: '排列方向，优先级高于 vertical',
    type: `'horizontal' | 'vertical'`,
    defaultValue: `'horizontal'`,
  },
  {
    prop: 'size',
    description: '组选项默认尺寸，options 模式最适合统一控制',
    type: `'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'middle' | 'medium' | 'large'`,
    defaultValue: '-',
  },
  {
    prop: 'value',
    description: '受控当前值',
    type: 'string | number | boolean',
    defaultValue: '-',
  },
  {
    prop: 'vertical',
    description: '纵向排列快捷开关',
    type: 'boolean',
    defaultValue: 'false',
  },
]

const optionApiRows: ApiRow[] = [
  {
    prop: 'className',
    description: '选项外层类名，适合做卡片边框、间距等布局样式',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'color',
    description: '单独覆盖某个选项的选中色',
    type: `'neutral' | 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'info' | 'error'`,
    defaultValue: '-',
  },
  {
    prop: 'disabled',
    description: '禁用当前选项',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'id',
    description: '透传到 input 的 id',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'label',
    description: '选项展示内容，支持字符串或 JSX 结构',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'onChange',
    description: '该选项被选中时的局部回调',
    type: '(event, meta) => void',
    defaultValue: '-',
  },
  {
    prop: 'required',
    description: '透传到 input 的 required',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'size',
    description: '单独覆盖某个选项的尺寸',
    type: `'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'middle' | 'medium' | 'large'`,
    defaultValue: '-',
  },
  {
    prop: 'style',
    description: '选项外层样式对象',
    type: 'CSSProperties',
    defaultValue: '-',
  },
  {
    prop: 'title',
    description: '透传到外层 label 的 title',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'value',
    description: '选项值',
    type: 'string | number | boolean',
    defaultValue: '-',
  },
]

const BasicRadioPreview: FC = () => {
  const selected = ref('startup')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <label className="label cursor-pointer gap-2 justify-start">
          <Radio
            name="radio-basic"
            value="startup"
            checked={selected.value === 'startup'}
            onChange={() => {
              selected.value = 'startup'
            }}
          />
          <span>Startup</span>
        </label>
        <label className="label cursor-pointer gap-2 justify-start">
          <Radio
            name="radio-basic"
            value="business"
            checked={selected.value === 'business'}
            onChange={() => {
              selected.value = 'business'
            }}
          />
          <span>Business</span>
        </label>
        <label className="label cursor-pointer gap-2 justify-start">
          <Radio
            name="radio-basic"
            value="scale"
            checked={selected.value === 'scale'}
            onChange={() => {
              selected.value = 'scale'
            }}
          />
          <span>Scale</span>
        </label>
      </div>

      <p className="m-0 text-sm text-base-content/70">当前选择：{selected.value}</p>
    </div>
  )
}

const resolveLabeledRadioClassName = (checked: boolean) =>
  `items-start rounded-box border px-4 py-3 transition ${checked ? 'border-primary bg-primary/5' : 'border-base-300 bg-base-100 hover:border-base-content/20'}`

const LabeledRadioPreview: FC = () => {
  const selected = ref('team')

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Radio
          name="workspace-plan"
          value="solo"
          checked={selected.value === 'solo'}
          rootClassName={resolveLabeledRadioClassName(selected.value === 'solo')}
          block={true}
          onChange={() => {
            selected.value = 'solo'
          }}
        >
          <span className="flex flex-col gap-1">
            <span className="font-medium">Solo</span>
            <span className="text-xs text-base-content/60">适合个人实验、脚本工具和快速验证。</span>
          </span>
        </Radio>
        <Radio
          name="workspace-plan"
          value="team"
          checked={selected.value === 'team'}
          rootClassName={resolveLabeledRadioClassName(selected.value === 'team')}
          block={true}
          onChange={() => {
            selected.value = 'team'
          }}
        >
          <span className="flex flex-col gap-1">
            <span className="font-medium">Team</span>
            <span className="text-xs text-base-content/60">
              适合共享组件库和多成员维护的前台项目。
            </span>
          </span>
        </Radio>
        <Radio
          name="workspace-plan"
          value="enterprise"
          checked={selected.value === 'enterprise'}
          rootClassName={resolveLabeledRadioClassName(selected.value === 'enterprise')}
          block={true}
          onChange={() => {
            selected.value = 'enterprise'
          }}
        >
          <span className="flex flex-col gap-1">
            <span className="font-medium">Enterprise</span>
            <span className="text-xs text-base-content/60">
              适合多环境发布、权限隔离和审计场景。
            </span>
          </span>
        </Radio>
      </div>

      <p className="m-0 text-sm text-base-content/70">当前选择：{selected.value}</p>
    </div>
  )
}

const OptionsPreview: FC = () => {
  const billing = ref('monthly')

  return (
    <div className="space-y-4">
      <Radio.Group
        name="billing-cycle"
        orientation="vertical"
        value={billing.value}
        onChange={value => {
          if (value !== undefined) {
            billing.value = String(value)
          }
        }}
        options={[
          {
            label: 'Monthly',
            value: 'monthly',
            className: 'items-start rounded-box border border-base-300 bg-base-100 px-4 py-3',
          },
          {
            label: 'Quarterly',
            value: 'quarterly',
            className: 'items-start rounded-box border border-base-300 bg-base-100 px-4 py-3',
          },
          {
            label: 'Yearly',
            value: 'yearly',
            disabled: true,
            className:
              'items-start rounded-box border border-dashed border-base-300 bg-base-100 px-4 py-3',
          },
        ]}
        className="rounded-box border border-base-300 bg-base-200/50 p-4"
      />

      <p className="m-0 text-sm text-base-content/70">当前计费周期：{billing.value}</p>
    </div>
  )
}

const ButtonStylePreview: FC = () => {
  const density = ref('comfortable')
  const theme = ref('classic')

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="m-0 text-xs uppercase tracking-wide text-base-content/50">Outline</p>
        <Radio.Group
          optionType="button"
          buttonStyle="outline"
          color="primary"
          size="small"
          value={density.value}
          onChange={value => {
            if (value !== undefined) {
              density.value = String(value)
            }
          }}
          options={['compact', 'comfortable', 'airy']}
        />
      </div>

      <div className="space-y-2">
        <p className="m-0 text-xs uppercase tracking-wide text-base-content/50">Solid</p>
        <Radio.Group
          optionType="button"
          buttonStyle="solid"
          color="secondary"
          size="large"
          value={theme.value}
          onChange={value => {
            if (value !== undefined) {
              theme.value = String(value)
            }
          }}
          options={[
            { label: 'Classic', value: 'classic' },
            { label: 'Playful', value: 'playful' },
            { label: 'Minimal', value: 'minimal' },
          ]}
        />
      </div>

      <p className="m-0 text-sm text-base-content/70">
        当前组合：{density.value} / {theme.value}
      </p>
    </div>
  )
}

const DisabledPreview: FC = () => {
  return (
    <div className="flex flex-wrap items-center gap-5">
      <label className="label cursor-not-allowed gap-2 justify-start opacity-60">
        <Radio name="radio-disabled" disabled={true} checked={true} />
        <span>Enabled by policy</span>
      </label>
      <label className="label cursor-not-allowed gap-2 justify-start opacity-60">
        <Radio name="radio-disabled" disabled={true} />
        <span>Need approval</span>
      </label>
    </div>
  )
}

const SizePreview: FC = () => {
  return (
    <div className="flex flex-wrap items-end gap-5">
      {sizes.map(size => (
        <label key={size} className="flex items-center gap-2 text-sm text-base-content/70">
          <Radio name={`radio-size-${size}`} size={size} checked={true} />
          <span>{size}</span>
        </label>
      ))}
    </div>
  )
}

const ColorPreview: FC = () => {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {colors.map(color => (
        <div
          key={color}
          className="flex items-center gap-3 rounded-box border border-base-300 bg-base-100 px-3 py-2"
        >
          <Radio name={`radio-${color}`} color={color} checked={true} />
          <Radio name={`radio-${color}`} color={color} />
          <span className="text-xs uppercase tracking-wide text-base-content/60">{color}</span>
        </div>
      ))}
    </div>
  )
}

const CustomColorPreview: FC = () => {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Radio
        name="radio-custom"
        checked={true}
        className="bg-red-100 border-red-300 checked:bg-red-200 checked:text-red-600 checked:border-red-600"
      />
      <Radio
        name="radio-custom"
        className="bg-blue-100 border-blue-300 checked:bg-blue-200 checked:text-blue-600 checked:border-blue-600"
      />
      <Radio
        name="radio-custom"
        className="bg-amber-100 border-amber-300 checked:bg-amber-200 checked:text-amber-700 checked:border-amber-600"
      />
    </div>
  )
}

const RadioPage: FC = () => {
  const tabBasic = ref<TabMode>('preview')
  const tabLabeled = ref<TabMode>('preview')
  const tabOptions = ref<TabMode>('preview')
  const tabButton = ref<TabMode>('preview')
  const tabSizes = ref<TabMode>('preview')
  const tabColors = ref<TabMode>('preview')
  const tabDisabled = ref<TabMode>('preview')
  const tabCustom = ref<TabMode>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Radio 单选框</h1>
        <p className="text-sm mt-3 mb-3">
          Radio 现在不再只是一个带颜色和尺寸的原生 input。它同时支持带说明内容的单选项、配置驱动的
          Radio.Group、按钮化选项，以及更清晰的受控 / 非受控 API。
        </p>

        <h2>何时使用</h2>
        <ul>
          <li>需要在少量、彼此可直接比较的选项中选出唯一结果。</li>
          <li>需要用配置数组快速生成单选组，而不是手写重复结构。</li>
          <li>希望把单选项组织成按钮组或说明卡片，但仍保持 radio 的语义。</li>
        </ul>

        <p className="text-sm text-base-content/70">
          推荐优先使用 <code>Radio.Group + options</code> 组织业务表单；手写 children
          更适合定制结构和说明文案。
        </p>

        <ExampleBlock
          title="基础用法"
          summary="展示原生 radio 体验，同时让受控写法更直接。"
          tab={tabBasic}
          preview={() => <BasicRadioPreview />}
          code={`const selected = ref('startup')

<Radio
  name="radio-basic"
  value="startup"
  checked={selected.value === 'startup'}
  onChange={() => {
    selected.value = 'startup'
  }}
/>
<Radio
  name="radio-basic"
  value="business"
  checked={selected.value === 'business'}
  onChange={() => {
    selected.value = 'business'
  }}
/>`}
        />

        <ExampleBlock
          title="带说明的单选项"
          summary="给 children 加一层描述结构，就可以把 Radio 组织成卡片式选项。"
          tab={tabLabeled}
          preview={() => <LabeledRadioPreview />}
          code={`const selected = ref('team')

<Radio
  name="workspace-plan"
  value="team"
  checked={selected.value === 'team'}
  rootClassName="items-start rounded-box border px-4 py-3"
  onChange={() => {
    selected.value = 'team'
  }}
>
  <span className="flex flex-col gap-1">
    <span className="font-medium">Team</span>
    <span className="text-xs text-base-content/60">
      适合共享组件库和多成员维护的前台项目。
    </span>
  </span>
</Radio>`}
        />

        <ExampleBlock
          title="Radio.Group 配置模式"
          summary="options 是推荐写法，适合 schema、配置表单和动态渲染。"
          tab={tabOptions}
          preview={() => <OptionsPreview />}
          code={`const billing = ref('monthly')

<Radio.Group
  name="billing-cycle"
  orientation="vertical"
  value={billing.value}
  onChange={value => {
    if (value !== undefined) billing.value = String(value)
  }}
  options={[
    { label: 'Monthly', value: 'monthly' },
    { label: 'Quarterly', value: 'quarterly' },
    { label: 'Yearly', value: 'yearly', disabled: true },
  ]}
/>
`}
        />

        <ExampleBlock
          title="按钮样式"
          summary="Radio.Button 是 Radio 的按钮糖衣，组内也可以统一切到按钮风格。"
          tab={tabButton}
          preview={() => <ButtonStylePreview />}
          code={`const density = ref('comfortable')
const theme = ref('classic')

<Radio.Group
  optionType="button"
  buttonStyle="outline"
  color="primary"
  size="small"
  value={density.value}
  onChange={value => {
    if (value !== undefined) density.value = String(value)
  }}
  options={['compact', 'comfortable', 'airy']}
/>

<Radio.Group
  optionType="button"
  buttonStyle="solid"
  color="secondary"
  size="large"
  value={theme.value}
  onChange={value => {
    if (value !== undefined) theme.value = String(value)
  }}
  options={[
    { label: 'Classic', value: 'classic' },
    { label: 'Playful', value: 'playful' },
    { label: 'Minimal', value: 'minimal' },
  ]}
/>`}
        />

        <ExampleBlock
          title="尺寸"
          summary="展示基础 xs 到 xl 的尺寸层，并补充 small / middle / medium / large 别名。"
          tab={tabSizes}
          preview={() => <SizePreview />}
          code={`<Radio size="xs" checked={true} />
<Radio size="sm" checked={true} />
<Radio size="md" checked={true} />
<Radio size="lg" checked={true} />
<Radio size="xl" checked={true} />
<Radio size="large" checked={true} />`}
        />

        <ExampleBlock
          title="颜色"
          summary="使用颜色修饰，同时能作为按钮组选中色复用。"
          tab={tabColors}
          preview={() => <ColorPreview />}
          code={`<Radio color="primary" checked={true} />
<Radio color="secondary" checked={true} />
<Radio color="accent" checked={true} />
<Radio color="success" checked={true} />`}
        />

        <ExampleBlock
          title="禁用状态"
          summary="单项和整组都支持禁用，组禁用时会向下同步到所有 input。"
          tab={tabDisabled}
          preview={() => <DisabledPreview />}
          code={`<Radio name="radio-disabled" disabled={true} checked={true} />
<Radio name="radio-disabled" disabled={true} />

<Radio.Group disabled={true} options={['A', 'B', 'C']} />`}
        />

        <ExampleBlock
          title="自定义颜色"
          summary="如果需要品牌色或语义强化，仍然可以直接叠加 Tailwind 工具类。"
          tab={tabCustom}
          preview={() => <CustomColorPreview />}
          code={`<Radio
  className="bg-red-100 border-red-300 checked:bg-red-200 checked:text-red-600 checked:border-red-600"
  checked={true}
/>
<Radio className="bg-blue-100 border-blue-300 checked:bg-blue-200 checked:text-blue-600 checked:border-blue-600" />`}
        />

        <h2 id="radio-api">API</h2>
        <p className="text-sm text-base-content/70">
          <code>Radio.Button</code> 等价于 <code>Radio optionType="button"</code>
          。推荐在配置驱动场景下优先使用
          <code>Radio.Group</code> 的 <code>options</code> 入口。
        </p>

        <h3>Radio / Radio.Button</h3>
        <ApiTable rows={radioApiRows} />

        <h3>Radio.Group</h3>
        <ApiTable rows={groupApiRows} />

        <h3>RadioOption</h3>
        <ApiTable rows={optionApiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default RadioPage
