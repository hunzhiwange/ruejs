import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import PreviewBlock, { type PreviewTabMode } from './PreviewBlock'
import { Badge, Fieldset, InputNumber } from '@rue-js/design'
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

const toNumber = (value: number | string | null | undefined, fallback = 0) => {
  const nextValue = Number(value)
  return Number.isFinite(nextValue) ? nextValue : fallback
}

const formatCurrency = (
  value: number | string | null,
  info: { userTyping: boolean; input: string },
) => {
  if (info.userTyping) return info.input
  if (value == null || value === '') return ''

  const [integerPart, fractionPart] = String(value).split('.')
  const groupedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return fractionPart ? `¥ ${groupedInteger}.${fractionPart}` : `¥ ${groupedInteger}`
}

const parseCurrency = (input: string) => {
  return input.replace(/¥\s?|,/g, '')
}

const formatPercent = (
  value: number | string | null,
  info: { userTyping: boolean; input: string },
) => {
  if (info.userTyping) return info.input
  if (value == null || value === '') return ''
  return `${value}%`
}

const parsePercent = (input: string) => {
  return input.replace(/%/g, '')
}

const PlusMiniIcon: FC = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-3"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
    </svg>
  )
}

const MinusMiniIcon: FC = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="size-3"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
    </svg>
  )
}

const BasicShowcase: FC = () => {
  const seats = ref(3)
  const stepLog = ref('最近一次步进：等待操作')

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <div className="grid gap-4 xl:grid-cols-2">
        <Fieldset>
          <Fieldset.Legend>订阅席位</Fieldset.Legend>
          <InputNumber
            className="w-full"
            value={seats.value}
            min={1}
            max={12}
            onChange={value => {
              seats.value = toNumber(value, 1)
            }}
            onStep={(value, info) => {
              stepLog.value = info.emitter + ' / ' + info.type + ' -> ' + String(value)
            }}
          />
          <Fieldset.Label as="p">默认启用控制按钮、方向键和范围约束。</Fieldset.Label>
        </Fieldset>

        <Fieldset>
          <Fieldset.Legend>积分偏移</Fieldset.Legend>
          <InputNumber
            className="w-full"
            defaultValue={40}
            min={0}
            max={100}
            controls={false}
            suffix="pts"
          />
          <Fieldset.Label as="p">只保持纯输入体验，适合和自定义操作条组合。</Fieldset.Label>
        </Fieldset>

        <Fieldset>
          <Fieldset.Legend>失焦后限制范围</Fieldset.Legend>
          <InputNumber
            className="w-full"
            defaultValue={250}
            min={100}
            max={500}
            step={25}
            changeOnBlur={true}
            suffix="ms"
          />
          <Fieldset.Label as="p">
            输入时允许暂时超出 100–500；移开焦点后会自动纠正到最接近的边界值。
          </Fieldset.Label>
        </Fieldset>

        <Fieldset>
          <Fieldset.Legend>不可用态</Fieldset.Legend>
          <InputNumber className="w-full" defaultValue={24} disabled prefix="QTY" />
          <Fieldset.Label as="p">
            禁用时自动收起加减控件，使用 Rue Input 的静态视觉。
          </Fieldset.Label>
        </Fieldset>
      </div>

      <div className="rounded-box border border-base-300 bg-base-100 p-5">
        <div className="text-xs uppercase tracking-[0.22em] text-base-content/45">Live summary</div>
        <div className="mt-3 text-4xl font-semibold text-base-content">{seats.value}</div>
        <p className="mt-2 mb-0 text-sm text-base-content/65">
          当前席位。步进时会同步输出交互来源，方便联动库存、价格或配额面板。
        </p>
        <div className="mt-4 rounded-box bg-base-200/70 p-4 text-sm text-base-content/70">
          {stepLog.value}
        </div>
      </div>
    </div>
  )
}

const AffixShowcase: FC = () => {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <InputNumber
        defaultValue={12800}
        step={100}
        precision={0}
        prefix="￥"
        suffix="CNY"
        allowClear={true}
      />
      <InputNumber
        defaultValue={18}
        addonBefore="APR"
        addonAfter="%"
        formatter={formatPercent}
        parser={parsePercent}
      />
      <InputNumber
        defaultValue={4.2}
        precision={1}
        status="warning"
        variant="filled"
        prefix="延迟"
        suffix="s"
      />
      <InputNumber
        defaultValue={68}
        status="error"
        variant="borderless"
        addonBefore="CPU"
        addonAfter="%"
      />
    </div>
  )
}

const FormatterShowcase: FC = () => {
  const budget = ref(12800)
  const discount = ref(12.5)

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="grid gap-4 md:grid-cols-2">
        <InputNumber
          value={budget.value}
          step={500}
          precision={0}
          formatter={formatCurrency}
          parser={parseCurrency}
          onChange={value => {
            budget.value = toNumber(value, 0)
          }}
        />

        <InputNumber
          value={discount.value}
          min={0}
          max={35}
          step={0.5}
          precision={1}
          formatter={formatPercent}
          parser={parsePercent}
          onChange={value => {
            discount.value = toNumber(value, 0)
          }}
        />
      </div>

      <div className="rounded-box border border-base-300 bg-base-100 p-5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-base-content/45">
              Raw value
            </div>
            <div className="mt-2 text-lg font-semibold text-base-content">¥ {budget.value}</div>
          </div>
          <Badge variant="neutral" size="sm">
            parser + formatter
          </Badge>
        </div>
        <p className="mt-4 mb-0 text-base-content/65">
          formatter 负责展示层，parser 负责回到数值层。这样可以在不使用原生 number input
          的前提下，保持货币、百分比和本地化格式。
        </p>
        <div className="mt-4 rounded-box bg-base-200/70 p-4">
          折扣后预算：
          <strong>¥ {((budget.value * (100 - discount.value)) / 100).toFixed(0)}</strong>
        </div>
      </div>
    </div>
  )
}

const PrecisionShowcase: FC = () => {
  const amount = ref('0.1250')
  const fee = ref('0.0008')
  const spot = ref(64235.75)

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <div className="grid gap-4 md:grid-cols-2">
        <InputNumber
          value={amount.value}
          stringMode={true}
          precision={4}
          step="0.0001"
          prefix="BTC"
          onChange={value => {
            amount.value = value == null ? '0.0000' : String(value)
          }}
        />

        <InputNumber
          value={fee.value}
          stringMode={true}
          precision={4}
          step="0.0001"
          variant="filled"
          prefix="Fee"
          onChange={value => {
            fee.value = value == null ? '0.0000' : String(value)
          }}
        />

        <InputNumber
          value={spot.value}
          precision={2}
          step={25}
          prefix="$"
          onChange={value => {
            spot.value = toNumber(value, 0)
          }}
        />

        <div className="rounded-box border border-base-300 bg-base-100 p-5 text-sm text-base-content/70">
          <div className="flex items-center justify-between gap-3">
            <span>String mode</span>
            <Badge outline={true} size="sm">
              保持 4 位小数
            </Badge>
          </div>
          <div className="mt-4 text-2xl font-semibold text-base-content">
            ${((toNumber(amount.value, 0) + toNumber(fee.value, 0)) * spot.value).toFixed(2)}
          </div>
          <p className="mt-2 mb-0">适合高精度金额、链上数量、保证金比例等需要字符串回传的场景。</p>
        </div>
      </div>
    </div>
  )
}

const ControlsShowcase: FC = () => {
  const throughput = ref(120)
  const lastStep = ref('等待操作')

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <InputNumber
        value={throughput.value}
        min={0}
        max={500}
        step={25}
        changeOnWheel={true}
        prefix="QPS"
        controls={{
          upIcon: <PlusMiniIcon />,
          downIcon: <MinusMiniIcon />,
        }}
        onChange={value => {
          throughput.value = toNumber(value, 0)
        }}
        onStep={(value, info) => {
          lastStep.value = info.emitter + ' / ' + info.type + ' -> ' + String(value)
        }}
      />

      <div className="rounded-box border border-base-300 bg-base-100 p-5 text-sm text-base-content/70">
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral" size="sm">
            ArrowUp / ArrowDown
          </Badge>
          <Badge variant="neutral" size="sm">
            Mouse Wheel
          </Badge>
          <Badge variant="neutral" size="sm">
            Custom Icons
          </Badge>
        </div>
        <div className="mt-4 text-2xl font-semibold text-base-content">{throughput.value} QPS</div>
        <p className="mt-2 mb-0">聚焦输入框后可以直接滚轮增减，也可以复用业务自己的加减图标。</p>
        <div className="mt-4 rounded-box bg-base-200/70 p-4">{lastStep.value}</div>
      </div>
    </div>
  )
}

const SizeShowcase: FC = () => {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <InputNumber size="xs" defaultValue={8} suffix="xs" />
      <InputNumber size="sm" defaultValue={16} suffix="sm" />
      <InputNumber size="md" defaultValue={24} suffix="md" />
      <InputNumber size="lg" defaultValue={32} suffix="lg" />
      <InputNumber size="xl" defaultValue={48} suffix="xl" />
      <InputNumber size="large" defaultValue={64} suffix="large alias" />
    </div>
  )
}

const apiRows: ApiRow[] = [
  {
    prop: 'value / defaultValue',
    description: '受控与非受控值，支持 number，也支持 stringMode 下的字符串值。',
    type: 'number | string | null',
    defaultValue: '-',
  },
  {
    prop: 'min / max',
    description: '数值上下界；配合 changeOnBlur 时会在失焦后自动归一化。',
    type: 'number | string',
    defaultValue: 'MIN_SAFE_INTEGER / MAX_SAFE_INTEGER',
  },
  {
    prop: 'step',
    description: '每次加减的步长，支持整数与小数。',
    type: 'number | string',
    defaultValue: '1',
  },
  {
    prop: 'precision',
    description: '控制最终值的小数位数；步进和 blur 归一化都会遵守该精度。',
    type: 'number',
    defaultValue: '-',
  },
  {
    prop: 'stringMode',
    description: '改为字符串回传，适合高精度金额或链上数量。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'formatter',
    description: '自定义展示格式，参数里会带上 userTyping 和当前 input 文本。',
    type: '(value, info) => string',
    defaultValue: '-',
  },
  {
    prop: 'parser',
    description: '把 formatter 后的文本重新提取为数值，常用于货币、百分比和带单位输入。',
    type: '(input: string) => number | string | null | undefined',
    defaultValue: '-',
  },
  {
    prop: 'controls',
    description: '是否展示上下步进按钮，也支持自定义 upIcon / downIcon。',
    type: 'boolean | { upIcon?: any; downIcon?: any }',
    defaultValue: 'true',
  },
  {
    prop: 'keyboard',
    description: '是否启用 ArrowUp / ArrowDown 键盘步进。',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    prop: 'changeOnWheel',
    description: '聚焦输入框后是否允许用鼠标滚轮调节数值。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'changeOnBlur',
    description: '失焦后是否按 min / max 和 precision 做归一化。',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    prop: 'prefix / suffix',
    description: '输入区内部前后缀，可与控件按钮共存。',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'addonBefore / addonAfter',
    description: '输入框两侧附加区，适合协议、单位、业务标签块。',
    type: 'any',
    defaultValue: '-',
  },
  {
    prop: 'variant / status / size / color',
    description: '直接复用 Rue Input 的视觉层能力。',
    type: '与 Input 一致',
    defaultValue: '-',
  },
  {
    prop: 'allowClear',
    description: '使用 Rue Input 的清空按钮能力，清空后会回传 null。',
    type: 'boolean | { clearIcon?: any }',
    defaultValue: 'false',
  },
  {
    prop: 'onChange',
    description: '数值变化时触发；stringMode 下返回字符串，否则返回 number；清空返回 null。',
    type: '(value: number | string | null) => void',
    defaultValue: '-',
  },
  {
    prop: 'onStep',
    description: '点击控件、键盘或滚轮步进后触发，附带步进来源和偏移量。',
    type: '(value, info) => void',
    defaultValue: '-',
  },
]

const InputNumberPage: FC = () => {
  const tabBasic = ref<PreviewTabMode>('preview')
  const tabAffix = ref<PreviewTabMode>('preview')
  const tabFormatter = ref<PreviewTabMode>('preview')
  const tabPrecision = ref<PreviewTabMode>('preview')
  const tabControls = ref<PreviewTabMode>('preview')
  const tabSizes = ref<PreviewTabMode>('preview')

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>InputNumber 数字输入</h1>
        <p className="text-sm mt-3 mb-3">
          InputNumber 建在 Rue 当前的 Input 视觉壳层之上：保持
          prefix、suffix、addon、状态和变体都还是同一套审美，但把数值输入真正需要的
          formatter、parser、precision、步进按钮、键盘和滚轮能力一次覆盖。
        </p>

        <h2>何时使用</h2>
        <ul>
          <li>需要输入数量、金额、比例、库存、席位等明确数值，而不是自由文本。</li>
          <li>
            希望同时支持键盘、按钮、滚轮和格式化展示，但不想退回浏览器原生 number input
            的不可控体验。
          </li>
          <li>
            希望在 Rue Input 的统一视觉下，把数字输入和 prefix、单位、告警状态、add-on 组合起来。
          </li>
        </ul>

        <PreviewBlock
          title="Basic and bounds"
          summary="基础数值输入、范围约束、无控件模式和禁用态。"
          tab={tabBasic}
          preview={() => <BasicShowcase />}
          code={`const seats = ref(3)
const stepLog = ref('最近一次步进：等待操作')

<InputNumber
  className="w-full"
  value={seats.value}
  min={1}
  max={12}
  onChange={value => {
    seats.value = Number(value ?? 1)
  }}
  onStep={(value, info) => {
    stepLog.value = info.emitter + ' / ' + info.type + ' -> ' + String(value)
  }}
/>

<InputNumber className="w-full" defaultValue={40} min={0} max={100} controls={false} suffix="pts" />
<InputNumber className="w-full" defaultValue={250} step={25} changeOnBlur={false} suffix="ms" />
<InputNumber className="w-full" defaultValue={24} disabled prefix="QTY" />`}
        />

        <PreviewBlock
          title="Affixes and variants"
          summary="复用 Rue Input 的前后缀、附加区、状态与变体。"
          tab={tabAffix}
          preview={() => <AffixShowcase />}
          code={`<InputNumber
  defaultValue={12800}
  step={100}
  precision={0}
  prefix="￥"
  suffix="CNY"
  allowClear={true}
/>

<InputNumber
  defaultValue={18}
  addonBefore="APR"
  addonAfter="%"
  formatter={(value, info) => (info.userTyping ? info.input : String(value ?? '') + '%')}
  parser={input => input.replace(/%/g, '')}
/>

<InputNumber
  defaultValue={4.2}
  precision={1}
  status="warning"
  variant="filled"
  prefix="延迟"
  suffix="s"
/>

<InputNumber
  defaultValue={68}
  status="error"
  variant="borderless"
  addonBefore="CPU"
  addonAfter="%"
/>`}
        />

        <PreviewBlock
          title="Formatter and parser"
          summary="把展示层和数值层拆开，适合货币和百分比。"
          tab={tabFormatter}
          preview={() => <FormatterShowcase />}
          code={`const budget = ref(12800)
const discount = ref(12.5)

<InputNumber
  value={budget.value}
  step={500}
  precision={0}
  formatter={(value, info) => {
    if (info.userTyping) return info.input
    if (value == null || value === '') return ''
    const parts = String(value).split('.')
    const grouped = parts[0].replace(/B(?=(d{3})+(?!d))/g, ',')
    return parts[1] ? '¥ ' + grouped + '.' + parts[1] : '¥ ' + grouped
  }}
  parser={input => input.replace(/¥s?|,/g, '')}
  onChange={value => {
    budget.value = Number(value ?? 0)
  }}
/>

<InputNumber
  value={discount.value}
  min={0}
  max={35}
  step={0.5}
  precision={1}
  formatter={(value, info) => (info.userTyping ? info.input : String(value ?? '') + '%')}
  parser={input => input.replace(/%/g, '')}
  onChange={value => {
    discount.value = Number(value ?? 0)
  }}
/>`}
        />

        <PreviewBlock
          title="Precision and stringMode"
          summary="适合链上数量、高精度金额、手续费等需要字符串回传的场景。"
          tab={tabPrecision}
          preview={() => <PrecisionShowcase />}
          code={`const amount = ref('0.1250')
const fee = ref('0.0008')
const spot = ref(64235.75)

<InputNumber
  value={amount.value}
  stringMode={true}
  precision={4}
  step="0.0001"
  prefix="BTC"
  onChange={value => {
    amount.value = value == null ? '0.0000' : String(value)
  }}
/>

<InputNumber
  value={fee.value}
  stringMode={true}
  precision={4}
  step="0.0001"
  variant="filled"
  prefix="Fee"
  onChange={value => {
    fee.value = value == null ? '0.0000' : String(value)
  }}
/>

<InputNumber
  value={spot.value}
  precision={2}
  step={25}
  prefix="$"
  onChange={value => {
    spot.value = Number(value ?? 0)
  }}
/>`}
        />

        <PreviewBlock
          title="Custom controls and wheel"
          summary="支持替换控件图标，并区分来自按钮、键盘还是滚轮的步进来源。"
          tab={tabControls}
          preview={() => <ControlsShowcase />}
          code={`const throughput = ref(120)
const lastStep = ref('等待操作')

<InputNumber
  value={throughput.value}
  min={0}
  max={500}
  step={25}
  changeOnWheel={true}
  prefix="QPS"
  controls={{
    upIcon: <PlusMiniIcon />,
    downIcon: <MinusMiniIcon />,
  }}
  onChange={value => {
    throughput.value = Number(value ?? 0)
  }}
  onStep={(value, info) => {
    lastStep.value = info.emitter + ' / ' + info.type + ' -> ' + String(value)
  }}
/>`}
        />

        <PreviewBlock
          title="Sizes"
          summary="使用 Rue Input 的尺寸体系，包括 large 别名。"
          tab={tabSizes}
          preview={() => <SizeShowcase />}
          code={`<InputNumber size="xs" defaultValue={8} suffix="xs" />
<InputNumber size="sm" defaultValue={16} suffix="sm" />
<InputNumber size="md" defaultValue={24} suffix="md" />
<InputNumber size="lg" defaultValue={32} suffix="lg" />
<InputNumber size="xl" defaultValue={48} suffix="xl" />
<InputNumber size="large" defaultValue={64} suffix="large alias" />`}
        />

        <h2 id="input-number-api">API</h2>
        <p>InputNumber 直接复用了 Rue Input 的视觉 props，同时把数值行为语义补到了同一层。</p>
        <ApiTable rows={apiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default InputNumberPage
