import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import { Checkbox } from '@rue-js/design'
import PreviewBlock from './PreviewBlock'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'

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

interface NewsletterOption {
  label: string
  value: string
  hint: string
  disabled?: boolean
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

const previewCardClassName = 'card border border-base-200/80 bg-base-100 shadow-sm'

const newsletterOptions: NewsletterOption[] = [
  {
    label: '设计系统更新',
    value: 'design-system',
    hint: '每周一同步组件、token 与交互规范。',
  },
  {
    label: '版本发布公告',
    value: 'release',
    hint: '仅在版本发布时推送，适合维护者订阅。',
  },
  {
    label: '实验功能灰度',
    value: 'labs',
    hint: '体验 Rue 新特性与路线提案。',
  },
  {
    label: '线下活动预告',
    value: 'events',
    hint: '当前场次已满，稍后开放新的名额。',
    disabled: true,
  },
]

const checklistOptions = [
  { label: '首页改版', value: 'home' },
  { label: '文档导航', value: 'docs' },
  { label: '组件市场', value: 'market' },
] as const

const basicCode = `import { Checkbox } from '@rue-js/design'
const checked = ref(true)

<Checkbox
  checked={checked.value}
  rootClassName="items-center [&>span:first-child]:pt-0"
  contentClassName="leading-none pt-1"
  onCheckedChange={(nextChecked) => {
    checked.value = nextChecked
  }}
>
  接收产品更新
</Checkbox>`

const fieldsetCode = `<fieldset className="fieldset w-80 rounded-box border border-base-300 bg-base-100 p-4">
  <legend className="fieldset-legend">账号设置</legend>
  <Checkbox defaultChecked={true} rootClassName="items-center gap-2.5 [&>span:first-child]:pt-0" contentClassName="leading-none pt-1">
    记住这台设备
  </Checkbox>
</fieldset>`

const controlledCode = `import { Checkbox } from '@rue-js/design'
const enabled = ref(false)

<div
  className="cursor-pointer rounded-box border border-base-300 bg-base-200/50 px-4 py-3"
  onClick={event => {
    if ((event.target as HTMLElement | null)?.closest('input')) {
      return
    }
    enabled.value = !enabled.value
  }}
>
  <div className="flex items-start gap-3">
    <Checkbox
      checked={enabled.value}
      onCheckedChange={(nextChecked) => {
        enabled.value = nextChecked
      }}
    />
    <span className="min-w-0 flex-1 block">
      <span className="font-medium">开启每周摘要</span>
      <span className="mt-1 block text-xs opacity-70">onCheckedChange 直接返回布尔值。</span>
    </span>
  </div>
</div>`

const sizesCode = `<Checkbox defaultChecked={true} size="xs" />
<Checkbox defaultChecked={true} size="sm" />
<Checkbox defaultChecked={true} size="md" />
<Checkbox defaultChecked={true} size="lg" />
<Checkbox defaultChecked={true} size="xl" />`

const colorsCode = `<Checkbox defaultChecked={true} color="primary" />
<Checkbox defaultChecked={true} color="secondary" />
<Checkbox defaultChecked={true} color="accent" />
<Checkbox defaultChecked={true} color="neutral" />
<Checkbox defaultChecked={true} color="info" />
<Checkbox defaultChecked={true} color="success" />
<Checkbox defaultChecked={true} color="warning" />
<Checkbox defaultChecked={true} color="error" />`

const disabledCode = `<Checkbox disabled={true}>只读选项</Checkbox>
<Checkbox disabled={true} checked={true}>已锁定配置</Checkbox>`

const indeterminateCode = `<Checkbox
  indeterminate={true}
  rootClassName="items-center [&>span:first-child]:pt-0 [&>span:last-child]:pt-1 [&>span:last-child]:leading-none"
>
  部分成员已完成
</Checkbox>`

const groupCode = `const value = ref(['design-system'])

<Checkbox.Group
  value={value.value}
  onChange={nextValue => {
    value.value = nextValue as string[]
  }}
  className="grid gap-3 sm:grid-cols-2"
  options={[
    {
      label: '设计系统更新',
      value: 'design-system',
      title: '每周一同步组件、token 与交互规范。',
      className: 'items-center rounded-box border border-base-300 bg-base-100 px-4 py-3 [&>span:first-child]:pt-0 [&>span:last-child]:pt-1 [&>span:last-child]:leading-none',
    },
    {
      label: '版本发布公告',
      value: 'release',
      title: '仅在版本发布时推送，适合维护者订阅。',
      className: 'items-center rounded-box border border-base-300 bg-base-100 px-4 py-3 [&>span:first-child]:pt-0 [&>span:last-child]:pt-1 [&>span:last-child]:leading-none',
    },
    {
      label: '实验功能灰度',
      value: 'labs',
      title: '体验 Rue 新特性与路线提案。',
      className: 'items-center rounded-box border border-base-300 bg-base-100 px-4 py-3 [&>span:first-child]:pt-0 [&>span:last-child]:pt-1 [&>span:last-child]:leading-none',
    },
    {
      label: '线下活动预告',
      value: 'events',
      disabled: true,
      title: '当前场次已满，稍后开放新的名额。',
      className: 'items-center rounded-box border border-base-300 bg-base-100 px-4 py-3 [&>span:first-child]:pt-0 [&>span:last-child]:pt-1 [&>span:last-child]:leading-none',
    },
  ]}
/>`

const checkAllCode = `const checkedList = ref(['home'])

<Checkbox
  checked={checkedList.value.length === 3}
  indeterminate={checkedList.value.length > 0 && checkedList.value.length < 3}
  rootClassName="items-center [&>span:first-child]:pt-0 [&>span:last-child]:pt-1 [&>span:last-child]:leading-none"
  onChange={(_, meta) => {
    checkedList.value = meta.checked ? ['home', 'docs', 'market'] : []
  }}
>
  全选功能清单
</Checkbox>

<Checkbox.Group
  value={checkedList.value}
  onChange={nextValue => {
    checkedList.value = nextValue as string[]
  }}
  options={[
    {
      label: '首页改版',
      value: 'home',
      className: 'items-center rounded-box border border-base-300 bg-base-100 px-4 py-3 [&>span:first-child]:pt-0 [&>span:last-child]:pt-1 [&>span:last-child]:leading-none',
    },
    {
      label: '文档导航',
      value: 'docs',
      className: 'items-center rounded-box border border-base-300 bg-base-100 px-4 py-3 [&>span:first-child]:pt-0 [&>span:last-child]:pt-1 [&>span:last-child]:leading-none',
    },
    {
      label: '组件市场',
      value: 'market',
      className: 'items-center rounded-box border border-base-300 bg-base-100 px-4 py-3 [&>span:first-child]:pt-0 [&>span:last-child]:pt-1 [&>span:last-child]:leading-none',
    },
  ]}
/>`

const gridCode = `<Checkbox.Group className="grid gap-4 md:grid-cols-2" defaultValue={['email', 'slack']}>
  <Checkbox
    value="email"
    rootClassName="rounded-box border border-base-300 bg-base-100 px-4 py-3"
  >
    <span className="block">
      <span className="font-medium">邮件通知</span>
      <span className="mt-1 block text-xs opacity-70">适合外部用户和日报场景。</span>
    </span>
  </Checkbox>
  <Checkbox
    value="slack"
    rootClassName="rounded-box border border-base-300 bg-base-100 px-4 py-3"
  >
    <span className="block">
      <span className="font-medium">Slack 频道</span>
      <span className="mt-1 block text-xs opacity-70">适合团队内部即时同步。</span>
    </span>
  </Checkbox>
  <Checkbox
    value="webhook"
    rootClassName="rounded-box border border-base-300 bg-base-100 px-4 py-3"
  >
    <span className="block">
      <span className="font-medium">Webhook</span>
      <span className="mt-1 block text-xs opacity-70">方便接入外部自动化流程。</span>
    </span>
  </Checkbox>
  <Checkbox
    value="sms"
    disabled={true}
    rootClassName="rounded-box border border-base-300 bg-base-100 px-4 py-3"
  >
    <span className="block">
      <span className="font-medium">短信提醒</span>
      <span className="mt-1 block text-xs opacity-70">当前套餐暂未开放。</span>
    </span>
  </Checkbox>
</Checkbox.Group>`

const customColorsCode = `<Checkbox
  defaultChecked={true}
  className="border-indigo-600 bg-indigo-500 checked:border-orange-500 checked:bg-orange-400 checked:text-orange-800"
/>
`

const checkboxApiRows: ApiRow[] = [
  {
    prop: 'checked',
    description: '受控选中状态',
    type: 'boolean',
    defaultValue: '-',
  },
  {
    prop: 'children',
    description: '传入后自动包裹 label，形成可点击说明区',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'className',
    description: '追加到原生 checkbox 输入元素',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'color',
    description: '语义颜色，映射到 checkbox-* 类名',
    type: `'primary' | 'secondary' | 'accent' | 'neutral' | 'success' | 'warning' | 'info' | 'error'`,
    defaultValue: '-',
  },
  {
    prop: 'contentClassName',
    description: 'children 文本区的附加类名',
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
    description: '禁用状态',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'indeterminate',
    description: '半选态，内部同步到原生 DOM 的 indeterminate 属性',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'onChange',
    description: '状态变化回调，第二个参数会附带 checked 和 value',
    type: '(event: Event, meta: CheckboxChangeMeta) => void',
    defaultValue: '-',
  },
  {
    prop: 'onCheckedChange',
    description: '布尔值快捷回调',
    type: '(checked: boolean, event: Event) => void',
    defaultValue: '-',
  },
  {
    prop: 'rootClassName',
    description: '外层容器类名，仅在包裹模式下生效',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'rootStyle',
    description: '外层容器样式，仅在包裹模式下生效',
    type: 'CSSProperties',
    defaultValue: '-',
  },
  {
    prop: 'size',
    description: '尺寸层级，映射到 checkbox-* 类名',
    type: `'xs' | 'sm' | 'md' | 'lg' | 'xl'`,
    defaultValue: '-',
  },
  {
    prop: 'value',
    description: '当前 checkbox 的值，参与 Checkbox.Group 收集',
    type: 'string | number | boolean',
    defaultValue: '-',
  },
]

const groupApiRows: ApiRow[] = [
  {
    prop: 'children',
    description: '手动组合模式，可直接放入多个 Checkbox',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'className',
    description: '分组容器类名，适合叠加 grid 或 flex 布局',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'defaultValue',
    description: '非受控默认选中值',
    type: '(string | number | boolean)[]',
    defaultValue: '[]',
  },
  {
    prop: 'disabled',
    description: '禁用整个分组',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'name',
    description: '透传到组内 checkbox 的 name 属性',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'onChange',
    description: '选中值数组变化回调',
    type: '(checkedValue: (string | number | boolean)[]) => void',
    defaultValue: '-',
  },
  {
    prop: 'options',
    description: '数据驱动写法，支持基础值数组或带 label/disabled 的对象数组',
    type: '(CheckboxOption | string | number | boolean)[]',
    defaultValue: '[]',
  },
  {
    prop: 'style',
    description: '分组容器样式',
    type: 'CSSProperties',
    defaultValue: '-',
  },
  {
    prop: 'value',
    description: '受控选中值数组',
    type: '(string | number | boolean)[]',
    defaultValue: '-',
  },
]

const BasicPreview: FC = () => {
  const checked = ref(true)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Checkbox
        data-testid="checkbox-basic"
        checked={checked.value}
        rootClassName="items-center [&>span:first-child]:pt-0"
        contentClassName="leading-none pt-1"
        onCheckedChange={nextChecked => {
          checked.value = nextChecked
        }}
      >
        接收产品更新
      </Checkbox>
      <span className="text-sm text-base-content/70">
        当前状态：{checked.value ? '已选中' : '未选中'}
      </span>
    </div>
  )
}

const ControlledPreview: FC = () => {
  const enabled = ref(false)

  return (
    <div className="space-y-4">
      <div
        data-testid="checkbox-controlled-card"
        className="cursor-pointer rounded-box border border-base-300 bg-base-200/50 px-4 py-3"
        onClick={(event: MouseEvent) => {
          if ((event.target as HTMLElement | null)?.closest('input')) {
            return
          }

          enabled.value = !enabled.value
        }}
      >
        <div className="flex items-start gap-3">
          <Checkbox
            checked={enabled.value}
            onCheckedChange={nextChecked => {
              enabled.value = nextChecked
            }}
          />
          <span className="min-w-0 flex-1 block">
            <span className="font-medium">开启每周摘要</span>
            <span className="mt-1 block text-xs opacity-70">
              适合演示受控模式和更直接的布尔回调。
            </span>
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="badge badge-soft badge-primary">
          checked={enabled.value ? 'true' : 'false'}
        </span>
        <span className="badge badge-soft">onCheckedChange</span>
      </div>
    </div>
  )
}

const IndeterminatePreview: FC = () => {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Checkbox
        indeterminate={true}
        rootClassName="items-center [&>span:first-child]:pt-0 [&>span:last-child]:pt-1 [&>span:last-child]:leading-none"
      >
        部分成员已完成
      </Checkbox>
      <span className="text-sm text-base-content/70">
        组件会自动同步原生 input 的 indeterminate 状态。
      </span>
    </div>
  )
}

const GroupPreview: FC = () => {
  const selected = ref<string[]>(['design-system'])

  return (
    <div className="space-y-4">
      <Checkbox.Group
        value={selected.value}
        onChange={nextValue => {
          selected.value = nextValue as string[]
        }}
        className="grid gap-3 sm:grid-cols-2"
        options={newsletterOptions.map(option => ({
          label: option.label,
          value: option.value,
          disabled: option.disabled,
          title: option.hint,
          className:
            'items-center rounded-box border border-base-300 bg-base-100 px-4 py-3 [&>span:first-child]:pt-0 [&>span:last-child]:pt-1 [&>span:last-child]:leading-none',
        }))}
      />
      <div className="rounded-box border border-dashed border-base-300 bg-base-200/40 px-4 py-3 text-sm text-base-content/80">
        当前订阅：{selected.value.length ? selected.value.join(' / ') : '未选择'}
      </div>
    </div>
  )
}

const CheckAllPreview: FC = () => {
  const checkedList = ref<string[]>(['home'])
  const allValues = checklistOptions.map(option => option.value)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-box border border-base-300 bg-base-200/50 px-4 py-3">
        <Checkbox
          checked={checkedList.value.length === allValues.length}
          indeterminate={
            checkedList.value.length > 0 && checkedList.value.length < allValues.length
          }
          rootClassName="items-center [&>span:first-child]:pt-0 [&>span:last-child]:pt-1 [&>span:last-child]:leading-none"
          onChange={(_, meta) => {
            checkedList.value = meta.checked ? [...allValues] : []
          }}
        >
          全选功能清单
        </Checkbox>
        <span className="text-sm text-base-content/70">
          已选 {checkedList.value.length}/{allValues.length}
        </span>
      </div>
      <Checkbox.Group
        value={checkedList.value}
        onChange={nextValue => {
          checkedList.value = nextValue as string[]
        }}
        className="grid gap-3 sm:grid-cols-3"
        options={checklistOptions.map(option => ({
          label: option.label,
          value: option.value,
          className:
            'items-center rounded-box border border-base-300 bg-base-100 px-4 py-3 [&>span:first-child]:pt-0 [&>span:last-child]:pt-1 [&>span:last-child]:leading-none',
        }))}
      />
    </div>
  )
}

const GridPreview: FC = () => {
  return (
    <div className="space-y-4">
      <Checkbox.Group defaultValue={['email', 'slack']} className="grid gap-4 md:grid-cols-2">
        <Checkbox
          value="email"
          rootClassName="rounded-box border border-base-300 bg-base-100 px-4 py-3"
        >
          <span className="block">
            <span className="font-medium">邮件通知</span>
            <span className="mt-1 block text-xs opacity-70">适合外部用户和日报汇总场景。</span>
          </span>
        </Checkbox>
        <Checkbox
          value="slack"
          rootClassName="rounded-box border border-base-300 bg-base-100 px-4 py-3"
        >
          <span className="block">
            <span className="font-medium">Slack 频道</span>
            <span className="mt-1 block text-xs opacity-70">适合团队内部即时同步与讨论。</span>
          </span>
        </Checkbox>
        <Checkbox
          value="webhook"
          rootClassName="rounded-box border border-base-300 bg-base-100 px-4 py-3"
        >
          <span className="block">
            <span className="font-medium">Webhook</span>
            <span className="mt-1 block text-xs opacity-70">方便接入自动化脚本和外部工作流。</span>
          </span>
        </Checkbox>
        <Checkbox
          value="sms"
          disabled={true}
          rootClassName="rounded-box border border-base-300 bg-base-100 px-4 py-3"
        >
          <span className="block">
            <span className="font-medium">短信提醒</span>
            <span className="mt-1 block text-xs opacity-70">当前套餐暂未开放。</span>
          </span>
        </Checkbox>
      </Checkbox.Group>
      <div className="text-sm text-base-content/70">
        children 模式适合做卡片化布局或更复杂的说明区。
      </div>
    </div>
  )
}

const CheckboxPage: FC = () => {
  const tabBasic = ref<TabMode>('preview')
  const tabFieldset = ref<TabMode>('preview')
  const tabControlled = ref<TabMode>('preview')
  const tabSizes = ref<TabMode>('preview')
  const tabColors = ref<TabMode>('preview')
  const tabDisabled = ref<TabMode>('preview')
  const tabIndeterminate = ref<TabMode>('preview')
  const tabGroup = ref<TabMode>('preview')
  const tabCheckAll = ref<TabMode>('preview')
  const tabGrid = ref<TabMode>('preview')
  const tabCustomColors = ref<TabMode>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Checkbox 复选框</h1>
        <p className="mt-3 mb-3 text-sm">
          Checkbox 用于从多个候选项中选择零个、一个或多个值，也适合表达“确认某项设置”的状态。
        </p>

        <div className="alert alert-soft mt-6 text-sm">
          <span>
            Rue 在使用 daisyUI 视觉类名的基础上，为 Checkbox 增加了更完整的受控状态、半选态和 Group
            能力。
          </span>
        </div>

        <h2 className="mt-8">何时使用</h2>
        <ul>
          <li>需要表达独立开关，但又不希望像 Toggle 那样立即强调“开/关”语义时。</li>
          <li>需要从一组并列选项中选择多个值时。</li>
          <li>需要配合“全选/部分选中”状态表达批量操作时。</li>
        </ul>

        <PreviewBlock
          title="Checkbox"
          summary="展示基础用法，并支持 children 作为可点击说明区。"
          tab={tabBasic}
          preview={() => (
            <div className={previewCardClassName}>
              <div className="card-body">
                <BasicPreview />
              </div>
            </div>
          )}
          code={basicCode}
        />

        <PreviewBlock
          title="With fieldset and label"
          summary="展示基础 fieldset 场景，适合设置页或表单分区。"
          tab={tabFieldset}
          preview={() => (
            <div className={previewCardClassName}>
              <div className="card-body">
                <fieldset className="fieldset w-80 rounded-box border border-base-300 bg-base-100 p-4">
                  <legend className="fieldset-legend">账号设置</legend>
                  <Checkbox
                    defaultChecked={true}
                    rootClassName="items-center gap-2.5 [&>span:first-child]:pt-0"
                    contentClassName="leading-none pt-1"
                  >
                    记住这台设备
                  </Checkbox>
                </fieldset>
              </div>
            </div>
          )}
          code={fieldsetCode}
        />

        <PreviewBlock
          title="Controlled checkbox"
          summary="通过 onCheckedChange 直接拿到布尔值，适合更简洁的受控写法。"
          tab={tabControlled}
          preview={() => (
            <div className={previewCardClassName}>
              <div className="card-body">
                <ControlledPreview />
              </div>
            </div>
          )}
          code={controlledCode}
        />

        <PreviewBlock
          title="Sizes"
          summary="使用 Rue 当前的尺寸体系。"
          tab={tabSizes}
          preview={() => (
            <div className={previewCardClassName}>
              <div className="card-body">
                <div className="flex flex-wrap items-center gap-4">
                  <Checkbox defaultChecked={true} size="xs" />
                  <Checkbox defaultChecked={true} size="sm" />
                  <Checkbox defaultChecked={true} size="md" />
                  <Checkbox defaultChecked={true} size="lg" />
                  <Checkbox defaultChecked={true} size="xl" />
                </div>
              </div>
            </div>
          )}
          code={sizesCode}
        />

        <PreviewBlock
          title="Colors"
          summary="颜色语义保持与当前 Rue 主题一致。"
          tab={tabColors}
          preview={() => (
            <div className={previewCardClassName}>
              <div className="card-body">
                <div className="flex flex-wrap items-center gap-4">
                  <Checkbox defaultChecked={true} color="primary" />
                  <Checkbox defaultChecked={true} color="secondary" />
                  <Checkbox defaultChecked={true} color="accent" />
                  <Checkbox defaultChecked={true} color="neutral" />
                  <Checkbox defaultChecked={true} color="info" />
                  <Checkbox defaultChecked={true} color="success" />
                  <Checkbox defaultChecked={true} color="warning" />
                  <Checkbox defaultChecked={true} color="error" />
                </div>
              </div>
            </div>
          )}
          code={colorsCode}
        />

        <PreviewBlock
          title="Disabled"
          summary="既支持裸 checkbox，也支持带说明区的禁用态。"
          tab={tabDisabled}
          preview={() => (
            <div className={previewCardClassName}>
              <div className="card-body">
                <div className="flex flex-col gap-4">
                  <Checkbox disabled={true}>只读选项</Checkbox>
                  <Checkbox disabled={true} checked={true}>
                    已锁定配置
                  </Checkbox>
                </div>
              </div>
            </div>
          )}
          code={disabledCode}
        />

        <PreviewBlock
          title="Indeterminate"
          summary="展示基础半选态场景，但改成组件级 prop，不再需要手动操作 ref。"
          tab={tabIndeterminate}
          preview={() => (
            <div className={previewCardClassName}>
              <div className="card-body">
                <IndeterminatePreview />
              </div>
            </div>
          )}
          code={indeterminateCode}
        />

        <PreviewBlock
          title="Checkbox Group"
          summary="参考常见业务表单的核心能力，支持 options 数据驱动和受控值数组。"
          tab={tabGroup}
          preview={() => (
            <div className={previewCardClassName}>
              <div className="card-body">
                <GroupPreview />
              </div>
            </div>
          )}
          code={groupCode}
        />

        <PreviewBlock
          title="Check all"
          summary="组合 indeterminate 和 Group，可以快速搭建全选/部分选中逻辑。"
          tab={tabCheckAll}
          preview={() => (
            <div className={previewCardClassName}>
              <div className="card-body">
                <CheckAllPreview />
              </div>
            </div>
          )}
          code={checkAllCode}
        />

        <PreviewBlock
          title="Use with Grid"
          summary="children 模式更适合卡片化说明和响应式栅格布局。"
          tab={tabGrid}
          preview={() => (
            <div className={previewCardClassName}>
              <div className="card-body">
                <GridPreview />
              </div>
            </div>
          )}
          code={gridCode}
        />

        <PreviewBlock
          title="Checkbox with custom colors"
          summary="展示基础自定义颜色能力，便于做品牌化演示。"
          tab={tabCustomColors}
          preview={() => (
            <div className={previewCardClassName}>
              <div className="card-body">
                <Checkbox
                  defaultChecked={true}
                  className="border-indigo-600 bg-indigo-500 checked:border-orange-500 checked:bg-orange-400 checked:text-orange-800"
                />
              </div>
            </div>
          )}
          code={customColorsCode}
        />

        <h2 className="mt-12">API</h2>
        <p className="text-sm text-base-content/70">
          className 默认作用在原生 input 上；需要控制包裹层时，请使用 rootClassName 和 rootStyle。
        </p>

        <h3 className="mt-6">Checkbox</h3>
        <ApiTable rows={checkboxApiRows} />

        <h3 className="mt-8">Checkbox.Group</h3>
        <ApiTable rows={groupApiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default CheckboxPage
