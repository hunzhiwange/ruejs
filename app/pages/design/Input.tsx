import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import PreviewBlock, { type PreviewTabMode } from './PreviewBlock'
import { Badge, Fieldset, Input, Kbd } from '@rue-js/design'
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

const inputApiRows: ApiRow[] = [
  {
    prop: 'addonAfter',
    description: '输入框右侧附加区，适合单位、动作按钮或固定后缀块',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'addonBefore',
    description: '输入框左侧附加区，适合协议、域名前缀或标签块',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'allowClear',
    description: '展示清空按钮，支持布尔值或自定义 clearIcon',
    type: 'boolean | { clearIcon?: any }',
    defaultValue: 'false',
  },
  {
    prop: 'className',
    description: '输入框根节点 class，当存在 prefix/suffix 时会作用在壳层上',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'color',
    description: '使用 Rue 当前色阶，也可和 status 分开表达视觉语义',
    type: `'default' | 'neutral' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'`,
    defaultValue: `'default'`,
  },
  {
    prop: 'defaultValue',
    description: '非受控初始值',
    type: 'string | number',
    defaultValue: '-',
  },
  {
    prop: 'ghost',
    description: 'ghost 快捷开关，等价于 variant 为 ghost',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'onClear',
    description: '点击清空按钮后的回调',
    type: '(event: MouseEvent) => void',
    defaultValue: '-',
  },
  {
    prop: 'onPressEnter',
    description: '按下 Enter 时的回调，Search 也基于它触发搜索',
    type: '(event: KeyboardEvent) => void',
    defaultValue: '-',
  },
  {
    prop: 'prefix',
    description: '输入区内部前缀，可放图标、币种、简短文案',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'showCount',
    description: '展示字符计数，也支持 formatter 自定义格式',
    type: 'boolean | { formatter?: (info) => any }',
    defaultValue: 'false',
  },
  {
    prop: 'size',
    description: '尺寸，支持 xs 到 xl 以及 small / middle / large 别名',
    type: `'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'middle' | 'medium' | 'large'`,
    defaultValue: '-',
  },
  {
    prop: 'status',
    description: '语义状态层，目前提供 warning 和 error',
    type: `'warning' | 'error'`,
    defaultValue: '-',
  },
  {
    prop: 'suffix',
    description: '输入区内部后缀，可放图标、快捷操作或说明',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'type',
    description: '原生 input 类型，默认 text',
    type: 'string',
    defaultValue: `'text'`,
  },
  {
    prop: 'value',
    description: '受控值',
    type: 'string | number',
    defaultValue: '-',
  },
  {
    prop: 'variant',
    description: '视觉变体，保持 Rue 风格下的 outlined / filled / ghost / borderless',
    type: `'outlined' | 'filled' | 'ghost' | 'borderless'`,
    defaultValue: `'outlined'`,
  },
]

const searchApiRows: ApiRow[] = [
  {
    prop: 'allowClear',
    description: '支持清空按钮，并会在清空后触发一次 onSearch',
    type: 'boolean | { clearIcon?: any }',
    defaultValue: 'false',
  },
  {
    prop: 'buttonClassName',
    description: '搜索按钮额外 class',
    type: 'string',
    defaultValue: '-',
  },
  {
    prop: 'enterButton',
    description: '改为独立搜索按钮，可传 true、文字或任意节点',
    type: 'boolean | any',
    defaultValue: 'false',
  },
  {
    prop: 'loading',
    description: '按钮进入 loading 态，但不阻止继续输入',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'onSearch',
    description: '点击按钮、按 Enter 或清空时触发；source 为 input 或 clear',
    type: '(value, event, info) => void',
    defaultValue: '-',
  },
]

const passwordApiRows: ApiRow[] = [
  {
    prop: 'iconRender',
    description: '自定义密码显隐按钮图标',
    type: '(visible: boolean) => any',
    defaultValue: '-',
  },
  {
    prop: 'suffix',
    description: '额外后缀节点，会和显隐按钮并排展示',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'visibilityToggle',
    description: '控制是否展示显隐按钮，也支持受控 visible / onVisibleChange',
    type: 'boolean | { visible?: boolean; onVisibleChange?: (visible: boolean) => void }',
    defaultValue: 'true',
  },
]

const textAreaApiRows: ApiRow[] = [
  {
    prop: 'Input.TextArea',
    description:
      '直接复用 Rue Textarea 的完整能力：autoSize、allowClear、showCount、resize、status 等',
    type: 'FC<TextareaProps>',
    defaultValue: '-',
  },
]

const shellApiRows: ApiRow[] = [
  {
    prop: 'as',
    description: '指定壳层元素，默认 label',
    type: 'string',
    defaultValue: `'label'`,
  },
  {
    prop: 'children',
    description: '完全自定义壳层内容，适合需要手写结构的复杂组合输入',
    type: 'any',
    defaultValue: '-',
  },
]

const SearchShell: FC = () => {
  return (
    <div className="grid w-xs gap-4">
      <Input.Shell>
        <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <g
            stroke-linejoin="round"
            stroke-linecap="round"
            stroke-width="2.5"
            fill="none"
            stroke="currentColor"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
          </g>
        </svg>
        <input type="search" className="grow" placeholder="Search" />
        <Kbd size="sm">⌘</Kbd>
        <Kbd size="sm">K</Kbd>
      </Input.Shell>
      <Input.Shell>
        Path
        <input type="text" className="grow" placeholder="src/app/" />
        <Badge variant="neutral" size="xs">
          Optional
        </Badge>
      </Input.Shell>
    </div>
  )
}

const AddonShowcase: FC = () => {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Input addonBefore="https://" addonAfter=".app" placeholder="workspace" />
      <Input prefix="￥" suffix="CNY" placeholder="Budget" defaultValue="1200" />
      <Input prefix="@" placeholder="username" status="warning" />
      <Input addonBefore="Path" allowClear={true} placeholder="src/components/input" />
    </div>
  )
}

const CountShowcase: FC = () => {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Input allowClear={true} showCount={true} maxLength={24} defaultValue="Rue Design" />
      <Input
        allowClear={true}
        showCount={{ formatter: info => `已输入 ${info.count} 字` }}
        maxLength={40}
        variant="borderless"
        placeholder="Borderless with count"
      />
    </div>
  )
}

const SearchShowcase: FC = () => {
  const result = ref('等待搜索')

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Input.Search
          allowClear={true}
          defaultValue="rue design"
          placeholder="搜索组件关键字"
          onSearch={(value, _event, info) => {
            result.value = info.source + ' -> ' + (value || '空值')
          }}
        />
        <Input.Search
          enterButton="发布"
          placeholder="输入更新摘要"
          onSearch={(value, _event, info) => {
            result.value = info.source + ' -> ' + (value || '空值')
          }}
        />
      </div>
      <p className="m-0 text-sm text-base-content/65">最近一次回调：{result.value}</p>
    </div>
  )
}

const PasswordShowcase: FC = () => {
  const visible = ref(false)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Input.Password placeholder="请输入密码" allowClear={true} />
      <Input.Password
        placeholder="受控显隐"
        visibilityToggle={{
          visible: visible.value,
          onVisibleChange: next => {
            visible.value = next
          },
        }}
        suffix={
          <Badge variant="neutral" size="xs">
            {visible.value ? '显示中' : '已隐藏'}
          </Badge>
        }
      />
    </div>
  )
}

const TextAreaShowcase: FC = () => {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Input.TextArea
        placeholder="记录改动说明"
        rows={4}
        allowClear={true}
        showCount={true}
        maxLength={120}
      />
      <Input.TextArea
        placeholder="自动撑高的说明文本"
        autoSize={{ minRows: 2, maxRows: 5 }}
        variant="filled"
        allowClear={true}
      />
    </div>
  )
}

const InputPage: FC = () => {
  const tabBasic = ref<PreviewTabMode>('preview')
  const tabAddon = ref<PreviewTabMode>('preview')
  const tabCount = ref<PreviewTabMode>('preview')
  const tabSearch = ref<PreviewTabMode>('preview')
  const tabPassword = ref<PreviewTabMode>('preview')
  const tabTextArea = ref<PreviewTabMode>('preview')
  const tabShell = ref<PreviewTabMode>('preview')
  const tabGhost = ref<PreviewTabMode>('preview')
  const tabFieldset = ref<PreviewTabMode>('preview')
  const tabColors = ref<PreviewTabMode>('preview')
  const tabSizes = ref<PreviewTabMode>('preview')
  const tabDisabled = ref<PreviewTabMode>('preview')
  const tabDatalist = ref<PreviewTabMode>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Input 输入框</h1>
        <p className="text-sm mt-3 mb-3">
          Input 现在分成三层：基础输入框负责颜色、尺寸、状态和前后缀，<code>Input.Search</code> 与
          <code>Input.Password</code> 负责常见业务形态，<code>Input.TextArea</code> 则直接复用 Rue
          的多行输入能力。
        </p>

        <h2>何时使用</h2>
        <ul>
          <li>需要一个基础输入框，但希望颜色、状态、变体和壳层结构能分层表达。</li>
          <li>需要快速拼出搜索框、密码框、多行输入框，同时保持 Rue 自己的视觉风格。</li>
          <li>需要在输入区内部放图标、单位、操作按钮，或者在两侧补协议、域名等固定附加块。</li>
        </ul>

        <PreviewBlock
          title="Text input"
          tab={tabBasic}
          preview={() => <Input data-testid="input-basic" placeholder="Type here" />}
          code={`<Input placeholder="Type here" />`}
        />

        <PreviewBlock
          title="Prefix, suffix and add-ons"
          tab={tabAddon}
          preview={() => <AddonShowcase />}
          code={`<Input addonBefore="https://" addonAfter=".app" placeholder="workspace" />
<Input prefix="￥" suffix="CNY" defaultValue="1200" />
<Input prefix="@" status="warning" placeholder="username" />
<Input addonBefore="Path" allowClear={true} placeholder="src/components/input" />`}
        />

        <PreviewBlock
          title="Allow clear and count"
          tab={tabCount}
          preview={() => <CountShowcase />}
          code={`<Input allowClear={true} showCount={true} maxLength={24} defaultValue="Rue Design" />

<Input
  allowClear={true}
  showCount={{ formatter: info => '已输入 ' + info.count + ' 字' }}
  maxLength={40}
  variant="borderless"
  placeholder="Borderless with count"
/>`}
        />

        <PreviewBlock
          title="Search"
          tab={tabSearch}
          preview={() => <SearchShowcase />}
          code={`const result = ref('等待搜索')

<Input.Search
  allowClear={true}
  defaultValue="rue design"
  placeholder="搜索组件关键字"
  onSearch={(value, _event, info) => {
    result.value = info.source + ' -> ' + (value || '空值')
  }}
/>

<Input.Search enterButton="发布" placeholder="输入更新摘要" />`}
        />

        <PreviewBlock
          title="Password"
          tab={tabPassword}
          preview={() => <PasswordShowcase />}
          code={`const visible = ref(false)

<Input.Password placeholder="请输入密码" allowClear={true} />

<Input.Password
  placeholder="受控显隐"
  visibilityToggle={{
    visible: visible.value,
    onVisibleChange: next => {
      visible.value = next
    },
  }}
  suffix={<Badge variant="neutral" size="xs">{visible.value ? '显示中' : '已隐藏'}</Badge>}
/>`}
        />

        <PreviewBlock
          title="TextArea"
          tab={tabTextArea}
          preview={() => <TextAreaShowcase />}
          code={`<Input.TextArea placeholder="记录改动说明" rows={4} allowClear={true} showCount={true} maxLength={120} />

<Input.TextArea
  placeholder="自动撑高的说明文本"
  autoSize={{ minRows: 2, maxRows: 5 }}
  variant="filled"
  allowClear={true}
/>`}
        />

        <PreviewBlock
          title="Text input with text label inside"
          tab={tabShell}
          preview={() => <SearchShell />}
          code={`<Input.Shell>
  <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <g
      stroke-linejoin="round"
      stroke-linecap="round"
      stroke-width="2.5"
      fill="none"
      stroke="currentColor"
    >
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.3-4.3"></path>
    </g>
  </svg>
  <input type="search" className="grow" placeholder="Search" />
  <Kbd size="sm">⌘</Kbd>
  <Kbd size="sm">K</Kbd>
</Input.Shell>`}
        />

        <PreviewBlock
          title="Ghost style"
          tab={tabGhost}
          preview={() => <Input ghost placeholder="Type here" />}
          code={`<Input ghost placeholder="Type here" />`}
        />

        <PreviewBlock
          title="With fieldset and fieldset-legend"
          tab={tabFieldset}
          preview={() => (
            <Fieldset className="w-xs">
              <Fieldset.Legend>What is your name?</Fieldset.Legend>
              <Input placeholder="Type here" />
              <Fieldset.Label as="p">Optional</Fieldset.Label>
            </Fieldset>
          )}
          code={`<Fieldset className="w-xs">\n  <Fieldset.Legend>What is your name?</Fieldset.Legend>\n  <Input placeholder="Type here" />\n  <Fieldset.Label as="p">Optional</Fieldset.Label>\n</Fieldset>`}
        />

        <PreviewBlock
          title="Input colors"
          tab={tabColors}
          preview={() => (
            <div className="grid w-xs gap-4">
              <Input color="neutral" placeholder="Neutral" />
              <Input color="primary" placeholder="Primary" />
              <Input color="secondary" placeholder="Secondary" />
              <Input color="accent" placeholder="Accent" />
              <Input color="info" placeholder="Info" />
              <Input color="success" placeholder="Success" />
              <Input color="warning" placeholder="Warning" />
              <Input color="error" placeholder="Error" />
            </div>
          )}
          code={`<Input color="neutral" placeholder="Neutral" />\n<Input color="primary" placeholder="Primary" />\n<Input color="secondary" placeholder="Secondary" />\n<Input color="accent" placeholder="Accent" />\n<Input color="info" placeholder="Info" />\n<Input color="success" placeholder="Success" />\n<Input color="warning" placeholder="Warning" />\n<Input color="error" placeholder="Error" />`}
        />

        <PreviewBlock
          title="Sizes"
          tab={tabSizes}
          preview={() => (
            <div className="grid w-xs gap-4">
              <Input size="xs" placeholder="Xsmall" />
              <Input size="sm" placeholder="Small" />
              <Input size="md" placeholder="Medium" />
              <Input size="lg" placeholder="Large" />
              <Input size="xl" placeholder="Xlarge" />
            </div>
          )}
          code={`<Input size="xs" placeholder="Xsmall" />\n<Input size="sm" placeholder="Small" />\n<Input size="md" placeholder="Medium" />\n<Input size="lg" placeholder="Large" />\n<Input size="xl" placeholder="Xlarge" />`}
        />

        <PreviewBlock
          title="Disabled"
          tab={tabDisabled}
          preview={() => <Input disabled placeholder="You can't touch this" />}
          code={`<Input disabled placeholder="You can't touch this" />`}
        />

        <PreviewBlock
          title="Text input with data list suggestion"
          tab={tabDatalist}
          preview={() => (
            <div className="grid gap-2">
              <Input list="browsers" placeholder="Which browser do you use" />
              <datalist id="browsers">
                <option value="Chrome"></option>
                <option value="Firefox"></option>
                <option value="Safari"></option>
                <option value="Opera"></option>
                <option value="Edge"></option>
              </datalist>
            </div>
          )}
          code={`<Input list="browsers" placeholder="Which browser do you use" />\n<datalist id="browsers">\n  <option value="Chrome"></option>\n  <option value="Firefox"></option>\n  <option value="Safari"></option>\n  <option value="Opera"></option>\n  <option value="Edge"></option>\n</datalist>`}
        />

        <h2 id="input-api">API</h2>
        <p>这里使用 Rue 的颜色和壳层语义，同时把最常用的 Input 家族能力集中到一个命名空间里。</p>

        <h3>Input</h3>
        <ApiTable rows={inputApiRows} />

        <h3>Input.Search</h3>
        <ApiTable rows={searchApiRows} />

        <h3>Input.Password</h3>
        <ApiTable rows={passwordApiRows} />

        <h3>Input.TextArea</h3>
        <ApiTable rows={textAreaApiRows} />

        <h3>Input.Shell</h3>
        <ApiTable rows={shellApiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default InputPage
