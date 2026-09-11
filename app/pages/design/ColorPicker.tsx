import type { FC } from '@rue-js/rue'
import { ref } from '@rue-js/rue'
import { ColorPicker } from '@rue-js/design'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import PreviewBlock, { type PreviewTabMode } from './PreviewBlock'

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

const brandPresets = [
  {
    label: 'Launch Warm',
    colors: ['#ff6b57', '#ff8a5b', '#f97316', '#f59e0b', '#facc15'],
  },
  {
    label: 'Studio Cool',
    colors: ['#0ea5e9', '#14b8a6', '#22c55e', '#6366f1', '#7c3aed'],
    defaultOpen: true,
  },
  {
    label: 'Transparent Layers',
    colors: ['rgba(22, 119, 255, 1)', 'rgba(22, 119, 255, 0.72)', 'rgba(22, 119, 255, 0.32)'],
  },
]

const basicTab = ref<PreviewTabMode>('preview')
const sizeTab = ref<PreviewTabMode>('preview')
const formatTab = ref<PreviewTabMode>('preview')
const presetTab = ref<PreviewTabMode>('preview')
const panelTab = ref<PreviewTabMode>('preview')

const sizeExamples = [
  { label: 'XS', size: 'xs', value: '#06b6d4' },
  { label: 'SM', size: 'sm', value: '#22c55e' },
  { label: 'MD', size: 'md', value: '#1677ff' },
  { label: 'LG', size: 'lg', value: '#8b5cf6' },
  { label: 'XL', size: 'xl', value: '#f97316' },
] as const

const presetValue = ref('#f97316')
const presetSummary = ref('Launch Warm')

const panelValue = ref('#7c3aed')
const panelOpenText = ref('closed')

const apiRows: ApiRow[] = [
  {
    prop: 'value / defaultValue',
    description: '受控与非受控颜色值，支持字符串、Color 实例、null，以及渐变 stop 数组。',
    type: 'string | Color | null | Array<{ color; percent }>',
    defaultValue: "'#1677ff'",
  },
  {
    prop: 'open / defaultOpen',
    description: '控制弹层显隐，也支持默认展开。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'format / defaultFormat',
    description: '切换输出格式，支持 hex / rgb / hsb 三种编码。',
    type: `'hex' | 'rgb' | 'hsb'`,
    defaultValue: `'hex'`,
  },
  {
    prop: 'mode',
    description: '配置单色或渐变模式，也可以同时开放两种模式切换。',
    type: `'single' | 'gradient' | Array<'single' | 'gradient'>`,
    defaultValue: `'single'`,
  },
  {
    prop: 'disabledAlpha / disabledFormat',
    description: '关闭透明度滑杆或格式切换条，让交互更聚焦。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'arrow',
    description: '配置弹层箭头，也支持 pointAtCenter 贴合触发器中心。',
    type: `boolean | { pointAtCenter?: boolean }`,
    defaultValue: 'true',
  },
  {
    prop: 'showText',
    description: '在触发器里显示当前色值，也可传入回调自定义文本。',
    type: 'boolean | (color) => any',
    defaultValue: 'false',
  },
  {
    prop: 'size',
    description:
      '触发器尺寸，支持 Button 同款 xs / sm / md / lg / xl，并支持 large / medium / small。',
    type: `'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'large' | 'medium' | 'middle' | 'small'`,
    defaultValue: `'md'`,
  },
  {
    prop: 'allowClear',
    description: '允许清除当前颜色，支持传入 clearIcon 自定义清除图标。',
    type: 'boolean | { clearIcon?: any }',
    defaultValue: 'false',
  },
  {
    prop: 'presets',
    description: '预设颜色分组，支持 key、defaultOpen、透明色与渐变 stop 数组。',
    type: 'Array<{ label; colors: Array<string | Color | Array<{ color; percent }>>; defaultOpen?; key? }>',
    defaultValue: '[]',
  },
  {
    prop: 'trigger / placement',
    description: '配置点击或悬浮触发，并支持 12 个 ant 风格 placement。',
    type: `'click' | 'hover' / 'top' | 'topLeft' | 'topRight' | 'bottom' | 'bottomLeft' | 'bottomRight' | 'left' | 'leftTop' | 'leftBottom' | 'right' | 'rightTop' | 'rightBottom'`,
    defaultValue: `'click' / 'bottomLeft'`,
  },
  {
    prop: 'getPopupContainer / autoAdjustOverflow',
    description: '自定义弹层挂载容器，并控制弹层是否自动避让视口。',
    type: '((triggerNode?) => HTMLElement | false | null) | HTMLElement | false | null / boolean',
    defaultValue: `'body' / true`,
  },
  {
    prop: 'destroyTooltipOnHide / destroyOnHidden',
    description: '关闭后销毁弹层节点，支持 ant 的别名与新属性名。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    prop: 'panelRender',
    description: '重组默认面板，extra.components 里暴露 Picker 与 Presets 两块内建内容。',
    type: '(panel, extra) => any',
    defaultValue: '-',
  },
  {
    prop: 'onChange / onChangeComplete',
    description: '颜色实时变化与交互完成时触发，onChange 第二个参数直接返回 CSS 字符串。',
    type: '(color, css) => void / (color) => void',
    defaultValue: '-',
  },
  {
    prop: 'onFormatChange / onOpenChange / onClear',
    description: '分别响应格式切换、弹层开合与清空行为。',
    type: '(...) => void',
    defaultValue: '-',
  },
  {
    prop: 'classNames / styles',
    description: '面向 trigger、popup、panel、preset 等语义节点做样式增强。',
    type: 'object',
    defaultValue: '-',
  },
]

const basicCode = `import { ref } from '@rue-js/rue'
import { ColorPicker } from '@rue-js/design'
const value = ref('#1677ff')
const cssText = ref('rgb(22, 119, 255)')

<ColorPicker
  value={value.value}
  showText
  allowClear
  onChange={(nextColor, css) => {
    value.value = nextColor ? nextColor.toHexString() : ''
    cssText.value = css || '已清空'
  }}
/>`

const sizeCode = `import { ColorPicker } from '@rue-js/design'<div className="flex flex-col gap-4">
  <ColorPicker size="xs" defaultValue="#06b6d4" showText />
  <ColorPicker size="sm" defaultValue="#22c55e" showText />
  <ColorPicker size="md" defaultValue="#1677ff" showText />
  <ColorPicker size="lg" defaultValue="#8b5cf6" showText />
  <ColorPicker size="xl" defaultValue="#f97316" showText />
</div>

<div className="flex flex-wrap items-center gap-3">
  <ColorPicker size="small" defaultValue="#14b8a6" />
  <ColorPicker size="middle" defaultValue="#6366f1" />
  <ColorPicker size="large" defaultValue="#ef4444" />
</div>`

const formatCode = `import { ref } from '@rue-js/rue'
import { ColorPicker } from '@rue-js/design'
const value = ref('rgba(56, 189, 248, 0.72)')
const formatMode = ref('rgb')
const brand = ref('#22c55e')

<ColorPicker
  value={value.value}
  defaultFormat="rgb"
  showText={color => 'alpha ' + Math.round(color.toHsb().a * 100) + '%'}
  onFormatChange={nextFormat => {
    formatMode.value = nextFormat
  }}
  onChange={(_color, css) => {
    value.value = css || ''
  }}
/>

<ColorPicker
  value={brand.value}
  disabledAlpha
  defaultFormat="hex"
  showText
  onChange={(nextColor, css) => {
    brand.value = nextColor && 'toHexString' in nextColor ? nextColor.toHexString() : css || ''
  }}
/>`

const presetCode = `import { ref } from '@rue-js/rue'
import { ColorPicker } from '@rue-js/design'
const value = ref('#f97316')
const presets = [
  {
    label: 'Launch Warm',
    colors: ['#ff6b57', '#ff8a5b', '#f97316', '#f59e0b', '#facc15'],
  },
  {
    label: 'Studio Cool',
    colors: ['#0ea5e9', '#14b8a6', '#22c55e', '#6366f1', '#7c3aed'],
  },
]

<ColorPicker
  value={value.value}
  presets={presets}
  showText
  onChange={(_color, css) => {
    value.value = css || ''
  }}
>
  <div className="flex min-w-0 items-center justify-between gap-3">
    <div>
      <div className="font-medium">Campaign Accent</div>
      <div className="text-xs opacity-60">用于按钮、徽标和动效高光</div>
    </div>
    <span className="badge badge-outline badge-sm">custom trigger</span>
  </div>
</ColorPicker>`

const panelCode = `import { ref } from '@rue-js/rue'
import { ColorPicker } from '@rue-js/design'
const value = ref('#7c3aed')
const openState = ref('closed')

<ColorPicker
  value={value.value}
  presets={presets}
  onOpenChange={nextOpen => {
    openState.value = nextOpen ? 'open' : 'closed'
  }}
  onChange={(_color, css) => {
    value.value = css || ''
  }}
  panelRender={(_panel, extra) => {
    const PickerPanel = extra.components.Picker
    const PresetsPanel = extra.components.Presets

    return (
      <div className="space-y-4">
        <PickerPanel />
        <div className="rounded-2xl border border-base-300 bg-base-100 px-4 py-3 text-sm">
          当前色值：{extra.state.color ? extra.state.color.toCssString() : '未选择'}
        </div>
        <PresetsPanel />
      </div>
    )
  }}
/>`

const basicPreviewCheckerboardStyle = {
  backgroundImage:
    'linear-gradient(45deg, rgb(148 163 184 / 0.18) 25%, transparent 25%), linear-gradient(-45deg, rgb(148 163 184 / 0.18) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgb(148 163 184 / 0.18) 75%), linear-gradient(-45deg, transparent 75%, rgb(148 163 184 / 0.18) 75%)',
  backgroundSize: '12px 12px',
  backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
} as const

const BasicControlledPreview: FC = () => {
  const basicValue = ref('#1677ff')
  const basicCss = ref('rgb(22, 119, 255)')

  return (
    <div className="space-y-4 not-prose">
      <ColorPicker
        value={basicValue.value || null}
        showText
        allowClear
        onChange={(nextColor, css) => {
          basicValue.value = nextColor && 'toHexString' in nextColor ? nextColor.toHexString() : ''
          basicCss.value = css || '已清空'
        }}
      />

      <div className="grid gap-3 md:grid-cols-[minmax(0,16rem)_1fr]">
        <div className="rounded-[1.3rem] border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-xs uppercase tracking-[0.18em] text-base-content/45">Preview</div>
          <div
            className="mt-3 rounded-[1rem] border border-base-300/75 p-3"
            style={basicPreviewCheckerboardStyle}
          >
            <div
              className="rounded-[0.85rem] border border-white/70 px-3 py-8 text-center text-sm font-medium text-base-content/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
              style={{
                ...basicPreviewCheckerboardStyle,
                backgroundColor: basicValue.value || 'transparent',
              }}
            >
              CTA Accent
            </div>
          </div>
        </div>
        <div className="rounded-[1.3rem] border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-xs uppercase tracking-[0.18em] text-base-content/45">CSS String</div>
          <div className="mt-3 break-all rounded-2xl border border-dashed border-base-300 px-4 py-3 text-sm text-base-content/75">
            {basicCss.value}
          </div>
        </div>
      </div>
    </div>
  )
}

const SizePreview: FC = () => {
  return (
    <div className="space-y-5 not-prose">
      <div className="grid gap-3 rounded-[1.3rem] border border-base-300 bg-base-100 p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        {sizeExamples.map(item => (
          <div key={item.size} className="flex flex-col gap-2">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-base-content/45">
              {item.label}
            </div>
            <ColorPicker size={item.size} defaultValue={item.value} showText />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-[1.3rem] border border-dashed border-base-300 bg-base-100 p-4 shadow-sm">
        <span className="text-sm font-medium text-base-content/68">语义别名</span>
        <ColorPicker size="small" defaultValue="#14b8a6" />
        <ColorPicker size="middle" defaultValue="#6366f1" />
        <ColorPicker size="large" defaultValue="#ef4444" />
      </div>
    </div>
  )
}

/** 格式切换与禁用透明度的组合预览，避免两个示例共享同一组 ref 状态。 */
const FormatAlphaPreview: FC = () => {
  const formatValue = ref('rgba(56, 189, 248, 0.72)')
  const formatMode = ref('rgb')
  const brandValue = ref('#22c55e')

  return (
    <div className="grid gap-4 not-prose lg:grid-cols-2">
      <div className="rounded-[1.3rem] border border-base-300 bg-base-100 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Translucent UI Layer</div>
            <div className="text-xs text-base-content/58">
              当前格式 {formatMode.value.toUpperCase()}
            </div>
          </div>
          <span className="badge badge-outline badge-sm">alpha enabled</span>
        </div>
        <ColorPicker
          value={formatValue.value}
          defaultFormat="rgb"
          showText={color => `alpha ${Math.round(('toHsb' in color ? color.toHsb().a : 1) * 100)}%`}
          onFormatChange={nextFormat => {
            formatMode.value = nextFormat
          }}
          onChange={(_color, css) => {
            formatValue.value = css || ''
          }}
        />
      </div>

      <div className="rounded-[1.3rem] border border-base-300 bg-base-100 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Brand Lock</div>
            <div className="text-xs text-base-content/58">适合按钮主色和规范色卡</div>
          </div>
          <span className="badge badge-outline badge-sm">alpha off</span>
        </div>
        <ColorPicker
          value={brandValue.value}
          disabledAlpha
          defaultFormat="hex"
          showText
          onChange={(nextColor, css) => {
            brandValue.value =
              nextColor && 'toHexString' in nextColor ? nextColor.toHexString() : css || ''
          }}
        />
      </div>
    </div>
  )
}

const ColorPickerDesign: FC = () => {
  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>ColorPicker 颜色选择器</h1>
        <p>
          Rue 的 ColorPicker 不照搬其他组件库的弹层视觉，但把核心能力补充到足够实用：
          受控与非受控、格式切换、透明度、预设色、自定义触发器和自定义面板都已经可以直接用。
        </p>

        <div className="not-prose mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/40 p-4 shadow-sm">
            <div className="text-sm font-medium text-base-content/55">格式切换</div>
            <div className="mt-2 text-base font-semibold">HEX / RGB / HSB</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              同一块面板里切换编码，复制和录入都更顺手。
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/40 p-4 shadow-sm">
            <div className="text-sm font-medium text-base-content/55">预设分组</div>
            <div className="mt-2 text-base font-semibold">品牌色与透明层级</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              可以把常用色板直接收进面板，不用每次重新调。
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-base-300 bg-gradient-to-br from-base-100 to-base-200/40 p-4 shadow-sm">
            <div className="text-sm font-medium text-base-content/55">面板重组</div>
            <div className="mt-2 text-base font-semibold">展示默认内核，自由重组布局</div>
            <p className="mt-2 mb-0 text-sm text-base-content/68">
              可以用内建 Picker / Presets，再插入自己的说明和状态卡片。
            </p>
          </div>
        </div>

        <PreviewBlock
          title="基础受控模式"
          summary="最常用的写法：外部维护色值，触发器直接显示当前结果，并支持一键清空。"
          tab={basicTab}
          code={basicCode}
          preview={BasicControlledPreview}
        />

        <PreviewBlock
          title="尺寸"
          summary="通过 size 调整触发器尺寸，支持 xs / sm / md / lg / xl，也支持 small / middle / large 语义别名。"
          tab={sizeTab}
          code={sizeCode}
          preview={SizePreview}
        />

        <PreviewBlock
          title="格式切换与透明度"
          summary="第一块保持 alpha 并监听格式切换；第二块关闭透明度，用更稳定的品牌色录入。"
          tab={formatTab}
          code={formatCode}
          preview={FormatAlphaPreview}
        />

        <PreviewBlock
          title="预设色与自定义触发器"
          summary="把高频品牌色和透明层级放进分组预设里，触发器外观则完全交给业务上下文。"
          tab={presetTab}
          code={presetCode}
          preview={() => (
            <div className="space-y-4 not-prose">
              <ColorPicker
                value={presetValue.value}
                presets={brandPresets}
                showText
                onChange={(_color, css) => {
                  presetValue.value = css || ''
                  presetSummary.value = css.includes('rgba') ? 'Transparent Layers' : 'Brand Preset'
                }}
              >
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">Campaign Accent</div>
                    <div className="truncate text-xs text-base-content/58">
                      用于按钮、徽标和动效高光
                    </div>
                  </div>
                  <span className="badge badge-outline badge-sm">custom trigger</span>
                </div>
              </ColorPicker>

              <div className="rounded-[1.3rem] border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                <div className="text-xs uppercase tracking-[0.18em] text-base-content/45">
                  Preset Context
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="badge badge-outline badge-sm">{presetSummary.value}</span>
                  <span className="text-sm text-base-content/72">{presetValue.value}</span>
                </div>
              </div>
            </div>
          )}
        />

        <PreviewBlock
          title="重组默认面板"
          summary="panelRender 不是完全推倒重写，而是复用组件内建的 Picker / Presets 两块，再插入业务说明。"
          tab={panelTab}
          code={panelCode}
          preview={() => (
            <div className="space-y-4 not-prose">
              <ColorPicker
                value={panelValue.value}
                presets={brandPresets}
                onOpenChange={nextOpen => {
                  panelOpenText.value = nextOpen ? 'open' : 'closed'
                }}
                onChange={(_color, css) => {
                  panelValue.value = css || ''
                }}
              />

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[1.25rem] border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                  <div className="text-xs uppercase tracking-[0.18em] text-base-content/45">
                    Popup State
                  </div>
                  <div className="mt-2 text-sm font-medium">{panelOpenText.value}</div>
                </div>
                <div className="rounded-[1.25rem] border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
                  <div className="text-xs uppercase tracking-[0.18em] text-base-content/45">
                    Selected CSS
                  </div>
                  <div className="mt-2 break-all text-sm font-medium">{panelValue.value}</div>
                </div>
              </div>
            </div>
          )}
        />

        <h2>API</h2>
        <ApiTable rows={apiRows} />
      </div>
    </SidebarPlayground>
  )
}

export default ColorPickerDesign
