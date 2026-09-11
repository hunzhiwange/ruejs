import { ThemeProvider } from '@rue-js/design'
import type { FC } from '@rue-js/rue'
import { computed, ref } from '@rue-js/rue'
import {
  Button,
  ConfigProvider,
  Fieldset,
  Tabs,
  ThemeController,
  theme as rueTheme,
} from '@rue-js/design'
import SidebarPlayground from '../site/SidebarPlaygroundDesign'
import Code from '../site/components/Code'

type TabMode = 'preview' | 'code'
type ThemePresetName =
  | 'default'
  | 'garden'
  | 'retro'
  | 'synthwave'
  | 'cyberpunk'
  | 'night'
  | 'coffee'
type AlgorithmMode = 'default' | 'dark' | 'compact' | 'darkCompact'
type ControllerDemoKind = 'toggle' | 'checkbox' | 'swap' | 'radio' | 'buttons'

interface ExampleBlockProps {
  title: string
  summary?: string
  tab: { value: TabMode }
  preview: () => any
  code: string
}

interface ApiRow {
  name: string
  description: string
  type: string
  defaultValue: string
}

interface PresetOption {
  value: ThemePresetName
  label: string
  description: string
}

interface ControllerPreviewProps {
  activeDemo: { value: ControllerDemoKind | null }
  activeTheme: { value: ThemePresetName | null }
}

const themePresetOptions: PresetOption[] = [
  { value: 'default', label: 'Default', description: '冷静蓝调，适合日常产品后台。' },
  { value: 'garden', label: 'Garden', description: '偏自然绿色，适合内容和协作场景。' },
  { value: 'retro', label: 'Retro', description: '纸感米色和棕色，适合叙事型页面。' },
  { value: 'synthwave', label: 'Synthwave', description: '高对比霓虹，适合强调品牌舞台感。' },
  { value: 'cyberpunk', label: 'Cyberpunk', description: '黄黑冲突感，适合强视觉实验场。' },
  { value: 'night', label: 'Night', description: '深海夜色，适合长时间阅读。' },
  { value: 'coffee', label: 'Coffee', description: '深咖棕调，适合沉浸式工作区。' },
]

const resolveAlgorithms = (mode: AlgorithmMode) => {
  switch (mode) {
    case 'dark':
      return [ThemeController.darkAlgorithm]
    case 'compact':
      return [ThemeController.compactAlgorithm]
    case 'darkCompact':
      return [ThemeController.darkAlgorithm, ThemeController.compactAlgorithm]
    default:
      return undefined
  }
}

const getReadableContentColor = (color: string) => {
  const normalized = color.trim().replace(/^#/, '')
  const hex =
    normalized.length === 3
      ? normalized
          .split('')
          .map(channel => `${channel}${channel}`)
          .join('')
      : normalized

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return '#f8fafc'

  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255

  return luminance > 0.54 ? '#0f172a' : '#f8fafc'
}

const buildScopedThemeCode = () => {
  return [
    "import { Button, ThemeController } from '@rue-js/design'",
    '',
    'export default function ScopedThemeDemo() {',
    '  const themeConfig = {',
    "    theme: 'default',",
    '    token: {',
    "      colors: { primary: '#2563eb', primaryContent: '#f8fafc' },",
    "      radius: { box: '1.1rem' },",
    '    },',
    '  }',
    '  const runtime = ThemeController.useToken(themeConfig)',
    '',
    '  return (',
    '    <ThemeProvider',
    '      {...themeConfig}',
    '      className="rounded-[2rem] border border-base-300 bg-base-100 p-6"',
    '    >',
    '      <Button color="primary">Publish</Button>',
    '      <span>{runtime.token.colors.primary}</span>',
    '    </ThemeProvider>',
    '  )',
    '}',
  ].join('\n')
}

const buildPresetCode = () => {
  return [
    "import { ThemeController } from '@rue-js/design'",
    '',
    'export default function PresetSnapshotDemo() {',
    '  const token = ThemeController.getDesignToken({',
    "    theme: 'night',",
    '  })',
    '',
    '  return (',
    '    <dl>',
    '      <dt>Primary</dt>',
    '      <dd>{token.colors.primary}</dd>',
    '      <dt>Radius</dt>',
    '      <dd>{token.radius.box}</dd>',
    '      <dt>Shadow</dt>',
    '      <dd>{token.shadow.md}</dd>',
    '    </dl>',
    '  )',
    '}',
  ].join('\n')
}

const buildProviderRenderCode = () => {
  return [
    "import { ThemeController } from '@rue-js/design'",
    '',
    'export default function ProviderRenderDemo() {',
    '  return (',
    '    <ThemeProvider',
    '      theme="retro"',
    '      render={(runtime) => (',
    '        <div>',
    '          {runtime.theme} | {runtime.token.colors.primary}',
    '        </div>',
    '      )}',
    '    />',
    '  )',
    '}',
  ].join('\n')
}

const buildComponentTokensCode = () => {
  return [
    "import { Button, ThemeController } from '@rue-js/design'",
    '',
    'export default function ComponentTokensDemo() {',
    '  const config = {',
    "    theme: 'night',",
    '    algorithm: [ThemeController.darkAlgorithm, ThemeController.compactAlgorithm],',
    '    components: {',
    '      Button: {',
    "        selector: '.btn',",
    "        colors: { primary: '#f97316', primaryContent: '#fff7ed' },",
    "        radius: { field: '999px' },",
    '      },',
    '      Card: {',
    "        selector: '.card',",
    "        colors: { base100: '#111827', baseContent: '#e5e7eb' },",
    "        radius: { box: '1.8rem' },",
    '      },',
    '      Input: {',
    "        selector: '.input, .textarea, .select',",
    "        colors: { primary: '#38bdf8', base100: '#f8fafc' },",
    '      },',
    '      Badge: {',
    '        algorithm: true,',
    "        colors: { primary: '#f97316' },",
    '      },',
    '    },',
    '  }',
    "  const buttonToken = ThemeController.getComponentDesignToken('Button', config)",
    '',
    '  return (',
    '    <ThemeProvider {...config}>',
    '      <Button color="primary">Only Button uses orange</Button>',
    '      <div className="card bg-base-100">Card reads Card token</div>',
    '      <input className="input input-bordered" />',
    '      <span>{buttonToken.colors.primary}</span>',
    '    </ThemeProvider>',
    '  )',
    '}',
  ].join('\n')
}

const buildNestedComponentTokenCode = () => {
  return [
    "import { Button, ThemeController } from '@rue-js/design'",
    '',
    'export default function NestedComponentThemeDemo() {',
    '  return (',
    '    <ThemeProvider',
    '      theme="garden"',
    '      components={{ Button: { colors: { primary: "#16a34a" } } }}',
    '    >',
    '      <ThemeProvider',
    '        token={{ colors: { base100: "#111827", baseContent: "#f8fafc" } }}',
    '        components={{',
    '          Button: { colors: { primary: "#38bdf8", primaryContent: "#04161a" } },',
    '          Alert: { selector: ".alert", colors: { info: "#38bdf8" } },',
    '        }}',
    '      >',
    '        <Button color="primary">Nested Button</Button>',
    '        <div className="alert alert-info">Nested alert</div>',
    '      </ThemeProvider>',
    '    </ThemeProvider>',
    '  )',
    '}',
  ].join('\n')
}

const buildHashTokenCode = () => {
  return [
    "import { ConfigProvider, ThemeController, theme } from '@rue-js/design'",
    '',
    'export default function HashTokenDemo() {',
    '  const { runtime, token, hashId } = theme.useToken({',
    '    cssVar: { key: "brand-alpha" },',
    '  })',
    '  const [, tupleToken, tupleHashId] = ThemeController.useTokenTuple({',
    '    cssVar: { key: "brand-alpha" },',
    '  })',
    '',
    '  return (',
    '    <div className="grid gap-4">',
    '      <ConfigProvider cssVar={{ key: "brand-alpha" }}>',
    '        <div className={hashId}>hashed scope</div>',
    '      </ConfigProvider>',
    '',
    '      <ThemeProvider',
    '        hashed={false}',
    '        render={(scopedRuntime) => (',
    '          <div>',
    '            disabled hash: {scopedRuntime.hashId || "-"}',
    '          </div>',
    '        )}',
    '      />',
    '',
    '      <dl>',
    '        <dt>scopeId</dt>',
    '        <dd>{runtime.scopeId}</dd>',
    '        <dt>theme token</dt>',
    '        <dd>{token.colors.primary}</dd>',
    '        <dt>tuple token</dt>',
    '        <dd>{tupleToken.colors.primary}</dd>',
    '        <dt>tuple hash</dt>',
    '        <dd>{tupleHashId}</dd>',
    '      </dl>',
    '    </div>',
    '  )',
    '}',
  ].join('\n')
}

const buildCssVarExtractionCode = () => {
  return [
    "import { Button, ThemeController } from '@rue-js/design'",
    '',
    'export default function CssVarExtractionDemo() {',
    '  const config = {',
    '    cssVar: { key: "brand-alpha", prefix: "brand" },',
    '    token: { colors: { primary: "#445566" } },',
    '    components: {',
    '      Button: { colors: { primary: "#112233" } },',
    '    },',
    '  }',
    '  const css = ThemeController.extractStyle(config, {',
    '    selector: ".brand-alpha-theme",',
    '  })',
    '',
    '  return (',
    '    <ThemeProvider',
    '      {...config}',
    '      zeroRuntime',
    '      className="brand-alpha-theme"',
    '    >',
    '      <Button color="primary">Static-ready Button</Button>',
    '      <pre>{css}</pre>',
    '    </ThemeProvider>',
    '  )',
    '}',
  ].join('\n')
}

const buildToggleCode = () => {
  return [
    "import { ref } from '@rue-js/rue'",
    "import { ThemeController } from '@rue-js/design'",
    '',
    'export default function ThemeToggleDemo() {',
    '  const enabled = ref(false)',
    '',
    '  return (',
    '    <ThemeProvider',
    '      theme={enabled.value ? "synthwave" : "default"}',
    '      className="rounded-box border border-base-300 bg-base-100 p-4 text-base-content"',
    '    >',
    '      <label className="flex items-center gap-3">',
    '        <span>Default</span>',
    '        <ThemeController',
    '          className="toggle"',
    '          value="synthwave"',
    '          checked={enabled.value}',
    '          onChange={(event) => {',
    '            enabled.value = event.currentTarget.checked',
    '          }}',
    '        />',
    '        <span>Synthwave</span>',
    '      </label>',
    '    </ThemeProvider>',
    '  )',
    '}',
  ].join('\n')
}

const buildCheckboxCode = () => {
  return [
    "import { ref } from '@rue-js/rue'",
    "import { ThemeController } from '@rue-js/design'",
    '',
    'export default function ThemeCheckboxDemo() {',
    '  const enabled = ref(false)',
    '',
    '  return (',
    '    <ThemeProvider',
    '      theme={enabled.value ? "synthwave" : "default"}',
    '      className="rounded-box border border-base-300 bg-base-100 p-4 text-base-content"',
    '    >',
    '      <label className="flex items-center gap-3">',
    '        <ThemeController',
    '          className="checkbox"',
    '          value="synthwave"',
    '          checked={enabled.value}',
    '          onChange={(event) => {',
    '            enabled.value = event.currentTarget.checked',
    '          }}',
    '        />',
    '        <span>Synthwave</span>',
    '      </label>',
    '    </ThemeProvider>',
    '  )',
    '}',
  ].join('\n')
}

const buildSwapCode = () => {
  return [
    "import { ref } from '@rue-js/rue'",
    "import { ThemeController } from '@rue-js/design'",
    '',
    'export default function ThemeSwapDemo() {',
    '  const enabled = ref(false)',
    '',
    '  return (',
    '    <ThemeProvider',
    '      theme={enabled.value ? "synthwave" : "default"}',
    '      className="rounded-box border border-base-300 bg-base-100 p-4 text-base-content"',
    '    >',
    '      <label className="swap swap-rotate">',
    '        <ThemeController',
    '          value="synthwave"',
    '          checked={enabled.value}',
    '          onChange={(event) => {',
    '            enabled.value = event.currentTarget.checked',
    '          }}',
    '        />',
    '        <span className="swap-off">Light</span>',
    '        <span className="swap-on">Dark</span>',
    '      </label>',
    '    </ThemeProvider>',
    '  )',
    '}',
  ].join('\n')
}

const buildRadioCode = () => {
  return [
    "import { ref } from '@rue-js/rue'",
    "import { ThemeController } from '@rue-js/design'",
    '',
    "const radioThemes = ['default', 'retro', 'cyberpunk'] as const",
    '',
    'export default function ThemeRadioDemo() {',
    "  const selectedTheme = ref<(typeof radioThemes)[number]>('default')",
    '',
    '  return (',
    '    <ThemeProvider',
    '      theme={selectedTheme.value}',
    '      className="rounded-box border border-base-300 bg-base-100 p-4 text-base-content"',
    '    >',
    '      <fieldset className="grid gap-2">',
    '        {radioThemes.map(theme => (',
    '          <label key={theme} className="flex cursor-pointer items-center gap-2">',
    '            <ThemeController',
    '              type="radio"',
    '              name="theme-radios"',
    '              className="radio radio-sm"',
    '              value={theme}',
    '              checked={selectedTheme.value === theme}',
    '              onChange={() => {',
    '                selectedTheme.value = theme',
    '              }}',
    '            />',
    '            <span>{theme}</span>',
    '          </label>',
    '        ))}',
    '      </fieldset>',
    '    </ThemeProvider>',
    '  )',
    '}',
  ].join('\n')
}

const buildButtonGroupCode = () => {
  return [
    "import { ref } from '@rue-js/rue'",
    "import { ThemeController } from '@rue-js/design'",
    '',
    "const buttonThemes = ['default', 'night', 'coffee'] as const",
    '',
    'export default function ThemeButtonGroupDemo() {',
    "  const selectedTheme = ref<(typeof buttonThemes)[number]>('default')",
    '',
    '  return (',
    '    <ThemeProvider',
    '      theme={selectedTheme.value}',
    '      className="rounded-box border border-base-300 bg-base-100 p-4 text-base-content"',
    '    >',
    '      <div className="join join-vertical sm:join-horizontal">',
    '        {buttonThemes.map(theme => (',
    '          <ThemeController',
    '            key={theme}',
    '            type="radio"',
    '            name="theme-buttons"',
    '            className="btn theme-controller join-item"',
    '            value={theme}',
    '            checked={selectedTheme.value === theme}',
    '            onChange={() => {',
    '              selectedTheme.value = theme',
    '            }}',
    '            aria-label={theme}',
    '          />',
    '        ))}',
    '      </div>',
    '    </ThemeProvider>',
    '  )',
    '}',
  ].join('\n')
}

const controllerApiRows: ApiRow[] = [
  {
    name: 'className',
    description:
      '追加到 theme-controller 输入上的样式类，可与 toggle、checkbox、radio、btn 等 daisyUI 形态组合。',
    type: 'string',
    defaultValue: '-',
  },
  {
    name: 'theme',
    description: '语义化主题名别名，未传时回退到原生 value。',
    type: 'string',
    defaultValue: '-',
  },
  {
    name: 'type',
    description: '控制输入类型，支持切换和单选两种主题选择方式。',
    type: "'checkbox' | 'radio'",
    defaultValue: "'checkbox'",
  },
  {
    name: '...native props',
    description: '继续透传 checked、name、onChange、disabled、autoComplete 等原生 input 属性。',
    type: 'HTML input props',
    defaultValue: '-',
  },
]

const providerApiRows: ApiRow[] = [
  {
    name: 'algorithm',
    description: '可传单个算法或算法数组，按顺序组合处理 token。',
    type: 'ThemeAlgorithm | ThemeAlgorithm[]',
    defaultValue: '-',
  },
  {
    name: 'as',
    description: '指定主题作用域根节点标签。',
    type: "'article' | 'div' | 'section' | 'span'",
    defaultValue: "'div'",
  },
  {
    name: 'baseToken',
    description: '从外部现成 token 继续派生，适合做二次主题生成。',
    type: 'ThemeDesignToken',
    defaultValue: '-',
  },
  {
    name: 'components',
    description:
      '组件级 token 配置，按 Button、Card、Input 等组件名局部覆盖变量，可配置 selector 和组件级 algorithm。',
    type: 'Record<string, ThemeComponentTokenOverride>',
    defaultValue: '-',
  },
  {
    name: 'cssVar',
    description:
      'CSS variables 配置。传 prefix 会生成别名变量，传 key 会生成稳定 scopeId，false 可关闭变量注入。',
    type: 'boolean | { prefix?: string; key?: string }',
    defaultValue: 'true',
  },
  {
    name: 'hashed',
    description: '控制主题作用域是否生成稳定 hash class，默认会追加到根节点。',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    name: 'inherit',
    description: '是否允许从父主题 runtime 继承 token 和组件级 token，嵌套 Provider 默认开启。',
    type: 'boolean',
    defaultValue: 'true',
  },
  {
    name: 'zeroRuntime',
    description:
      '关闭运行时组件级 style 标签注入，配合 extractStyle 在构建期或服务端提前抽取 CSS。',
    type: 'boolean',
    defaultValue: 'false',
  },
  {
    name: 'children',
    description: '作用域内部的正常内容节点。',
    type: 'any',
    defaultValue: '-',
  },
  {
    name: 'className',
    description: '主题容器自身类名。',
    type: 'string',
    defaultValue: '-',
  },
  {
    name: 'render',
    description: '显式 render prop，可拿到当前运行时 token 信息并返回节点。',
    type: '(runtime: ThemeTokenRuntime) => any',
    defaultValue: '-',
  },
  {
    name: 'style',
    description: '额外的作用域样式，支持对象和字符串，会与 token 生成的 CSS 变量一起合并。',
    type: 'Record<string, string | number> | string',
    defaultValue: '-',
  },
  {
    name: 'theme',
    description:
      '预设主题名，当前内置 default、garden、retro、synthwave、cyberpunk、night、coffee。',
    type: 'string',
    defaultValue: "'default'",
  },
  {
    name: 'token',
    description: '局部 token 覆盖，适合按场景微调主色、圆角、字号、阴影和密度。',
    type: 'ThemeTokenOverride',
    defaultValue: '-',
  },
]

const staticApiRows: ApiRow[] = [
  {
    name: 'ConfigProvider',
    description: 'ThemeController.Provider 的主题配置容器别名，可直接从 @rue-js/design 导入。',
    type: 'FC<ThemeProviderProps>',
    defaultValue: '-',
  },
  {
    name: 'compactAlgorithm',
    description: '把主题压缩成更高密度的控件和间距。',
    type: 'ThemeAlgorithm',
    defaultValue: '-',
  },
  {
    name: 'darkAlgorithm',
    description: '强制衍生暗色基底和深阴影层级。',
    type: 'ThemeAlgorithm',
    defaultValue: '-',
  },
  {
    name: 'defaultAlgorithm',
    description: '标准 token 整理算法，负责补充 appearance、resolvedThemeName 等派生字段。',
    type: 'ThemeAlgorithm',
    defaultValue: '-',
  },
  {
    name: 'defaultConfig',
    description: 'Theme 的默认配置入口。',
    type: 'ThemeConfig',
    defaultValue: '-',
  },
  {
    name: 'defaultSeed',
    description: 'Rue Theme 的默认种子 token，可作为二次定制基线。',
    type: 'ThemeDesignToken',
    defaultValue: '-',
  },
  {
    name: 'getDesignToken(config)',
    description: '纯函数，返回合并预设、算法和覆盖后的最终 token。',
    type: '(config?: ThemeConfig) => ThemeDesignToken',
    defaultValue: '-',
  },
  {
    name: 'getComponentDesignToken(name, config)',
    description: '纯函数，返回某个组件在当前 ThemeConfig 下的最终组件级 token。',
    type: '(name: string, config?: ThemeConfig) => ThemeDesignToken',
    defaultValue: '-',
  },
  {
    name: 'getCssVariables(config)',
    description: '纯函数，返回当前主题 token 对应的 CSS variables 对象。',
    type: '(config?: ThemeConfig) => ThemeStyleRecord',
    defaultValue: '-',
  },
  {
    name: 'extractStyle(config, options)',
    description: '抽取根变量和组件级变量 CSS 文本，适合 zeroRuntime 或 SSR 场景。',
    type: '(config?: ThemeConfig, options?: ThemeExtractStyleOptions) => string',
    defaultValue: '-',
  },
  {
    name: 'presets',
    description: '当前内置主题预设对象，可直接复用或做差量扩展。',
    type: 'Record<string, ThemeTokenOverride>',
    defaultValue: '-',
  },
  {
    name: 'useToken(config)',
    description:
      '返回 theme、token、cssVariables、components 和 componentCssVariables，适合页面级预览、调试面板和主题生成器。',
    type: '(config?: ThemeConfig) => ThemeTokenRuntime',
    defaultValue: '-',
  },
  {
    name: 'useTokenTuple(config)',
    description: '返回主题运行时三元组：[runtime, token, hashId]。',
    type: '(config?: ThemeConfig) => [ThemeTokenRuntime, ThemeDesignToken, string]',
    defaultValue: '-',
  },
  {
    name: 'theme.useToken(config)',
    description: '主题命名空间入口，返回 { runtime, token, hashId }。',
    type: '(config?: ThemeConfig) => { runtime: ThemeTokenRuntime; token: ThemeDesignToken; hashId: string }',
    defaultValue: '-',
  },
]

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
      {tab.value === 'preview' ? preview() : <Code className="mt-2" lang="tsx" code={code} />}
    </div>
  )
}

const ApiTable: FC<{ rows: ApiRow[] }> = ({ rows }) => {
  return (
    <div className="not-prose overflow-x-auto rounded-[1.5rem] border border-base-300 bg-base-100/90 shadow-sm">
      <table className="table table-zebra">
        <thead>
          <tr>
            <th>属性 / API</th>
            <th>说明</th>
            <th>类型</th>
            <th>默认值</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.name}>
              <td>
                <code>{row.name}</code>
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

const ThemeSwatch: FC<{ label: string; value: string; text?: string }> = ({
  label,
  value,
  text,
}) => {
  return (
    <div className="rounded-[1.15rem] border border-base-300/70 bg-base-100/80 p-3 shadow-sm">
      <div
        className="mb-3 h-12 rounded-[0.9rem] border border-base-300/70"
        style={{ backgroundColor: value, color: text ?? 'inherit' }}
      />
      <div className="text-xs font-medium uppercase tracking-[0.2em] opacity-60">{label}</div>
      <div className="mt-1 font-mono text-sm">{value}</div>
    </div>
  )
}

const TokenFact: FC<{ label: string; value: string }> = ({ label, value }) => {
  return (
    <div className="rounded-[1.1rem] border border-base-300/70 bg-base-100/70 px-4 py-3 shadow-sm">
      <div className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] opacity-60">
        {label}
      </div>
      <div className="mt-2 font-mono text-sm">{value}</div>
    </div>
  )
}

const SunIcon: FC = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="size-5"
    >
      <circle cx="12" cy="12" r="4" />
      <path
        strokeLinecap="round"
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      />
    </svg>
  )
}

const MoonIcon: FC = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="size-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
      />
    </svg>
  )
}

const ThemeWorkbenchPreview: FC = () => {
  const activeTheme = ref<ThemePresetName>('default')
  const algorithmMode = ref<AlgorithmMode>('default')
  const primaryColor = ref('#2563eb')
  const radiusBox = ref('1.1rem')
  const primaryContentColor = computed(() => getReadableContentColor(primaryColor.value))
  const runtime = computed(() =>
    ThemeController.useToken({
      theme: activeTheme.value,
      algorithm: resolveAlgorithms(algorithmMode.value),
      token: {
        colors: {
          primary: primaryColor.value,
          primaryContent: primaryContentColor.get(),
        },
        radius: {
          box: radiusBox.value,
        },
      },
    }),
  )

  return (
    <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="rounded-[1.75rem] border border-base-300 bg-gradient-to-b from-base-100 to-base-200/70 p-5 shadow-sm">
        <h3 className="m-0 text-base font-semibold">Theme Workbench</h3>
        <p className="mt-2 text-sm opacity-70">
          把预设、算法和 token 覆盖放到同一个工作台里，观察 Rue Theme 的组合结果。
        </p>

        <Fieldset className="mt-4 gap-3">
          <legend className="fieldset-legend text-xs uppercase tracking-[0.2em] opacity-60">
            Preset
          </legend>
          {themePresetOptions.map(option => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-[1rem] border border-base-300/70 bg-base-100/70 px-3 py-3"
            >
              <input
                type="radio"
                name="theme-workbench-preset"
                className="radio radio-sm"
                value={option.value}
                checked={activeTheme.value === option.value}
                onInput={() => {
                  activeTheme.value = option.value
                }}
              />
              <span>
                <span className="block font-medium">{option.label}</span>
                <span className="block text-xs opacity-65">{option.description}</span>
              </span>
            </label>
          ))}
        </Fieldset>

        <Fieldset className="mt-4 gap-2">
          <legend className="fieldset-legend text-xs uppercase tracking-[0.2em] opacity-60">
            Algorithms
          </legend>
          {[
            { value: 'default', label: 'Default' },
            { value: 'dark', label: 'Dark' },
            { value: 'compact', label: 'Compact' },
            { value: 'darkCompact', label: 'Dark + Compact' },
          ].map(option => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-[0.95rem] border border-base-300/70 bg-base-100/70 px-3 py-2.5"
            >
              <input
                type="radio"
                name="theme-workbench-algorithm"
                className="radio radio-sm"
                value={option.value}
                checked={algorithmMode.value === option.value}
                onInput={() => {
                  algorithmMode.value = option.value as AlgorithmMode
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </Fieldset>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <label className="rounded-[1rem] border border-base-300/70 bg-base-100/70 p-3">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] opacity-60">
              Primary
            </span>
            <input
              type="color"
              value={primaryColor.value}
              onInput={(event: Event) => {
                primaryColor.value =
                  (event.target as HTMLInputElement | null)?.value ?? primaryColor.value
              }}
              className="h-11 w-full cursor-pointer rounded-[0.9rem] border border-base-300 bg-transparent"
            />
            <span className="mt-2 block font-mono text-xs">{primaryColor.value}</span>
          </label>

          <div className="rounded-[1rem] border border-base-300/70 bg-base-100/70 p-3">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] opacity-60">
              Primary Content
            </span>
            <div
              className="flex h-11 items-center justify-center rounded-[0.9rem] border border-base-300 px-3 text-sm font-semibold"
              style={{
                backgroundColor: primaryColor.value,
                color: primaryContentColor.get(),
              }}
            >
              Aa
            </div>
            <span className="mt-2 block font-mono text-xs">{primaryContentColor.get()}</span>
          </div>

          <label className="rounded-[1rem] border border-base-300/70 bg-base-100/70 p-3">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] opacity-60">
              Box Radius
            </span>
            <input
              type="range"
              min="0.75"
              max="2.4"
              step="0.05"
              value={String(parseFloat(radiusBox.value))}
              onInput={(event: Event) => {
                const nextValue = (event.target as HTMLInputElement | null)?.value
                radiusBox.value = nextValue ? `${nextValue}rem` : radiusBox.value
              }}
              className="range range-sm"
            />
            <span className="mt-2 block font-mono text-xs">{radiusBox.value}</span>
          </label>
        </div>
      </div>

      <div className="grid gap-4">
        <ThemeProvider
          theme={activeTheme.value}
          algorithm={resolveAlgorithms(algorithmMode.value)}
          token={{
            colors: {
              primary: primaryColor.value,
              primaryContent: primaryContentColor.get(),
            },
            radius: {
              box: radiusBox.value,
            },
          }}
          className="overflow-hidden rounded-[2rem] border border-base-300 bg-gradient-to-br from-base-100 via-base-100 to-base-200 p-6 text-base-content shadow-[var(--rue-theme-shadow-md)]"
          render={scopedRuntime => (
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.28em] opacity-60">
                      Scoped Theme Island
                    </div>
                    <h3 className="mt-3 text-2xl font-semibold">
                      {scopedRuntime.theme} · {scopedRuntime.token.density}
                    </h3>
                    <p className="mt-2 max-w-xl text-sm opacity-70">
                      这个区域只吃当前 Provider 的
                      token。它不会改动全站视觉，但能单独承载营销卡片、工作台模块或嵌套的品牌子空间。
                    </p>
                  </div>
                  <div className="badge badge-primary badge-lg">
                    {scopedRuntime.token.appearance}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-[var(--radius-box)] border border-base-300 bg-base-100/80 p-4 shadow-[var(--rue-theme-shadow-sm)]">
                    <div className="text-xs uppercase tracking-[0.22em] opacity-55">
                      Release Health
                    </div>
                    <div className="mt-3 text-3xl font-semibold">98.4%</div>
                    <div className="mt-2 text-sm opacity-65">主流程可用，适合直接发版。</div>
                  </div>
                  <div className="rounded-[var(--radius-box)] border border-base-300 bg-base-100/80 p-4 shadow-[var(--rue-theme-shadow-sm)]">
                    <div className="text-xs uppercase tracking-[0.22em] opacity-55">Primary</div>
                    <div className="mt-3 font-mono text-sm">
                      {scopedRuntime.token.colors.primary}
                    </div>
                    <div className="mt-2 text-sm opacity-65">
                      当前作用域主色已经注入到 Provider。
                    </div>
                  </div>
                  <div className="rounded-[var(--radius-box)] border border-base-300 bg-base-100/80 p-4 shadow-[var(--rue-theme-shadow-sm)]">
                    <div className="text-xs uppercase tracking-[0.22em] opacity-55">
                      Surface Radius
                    </div>
                    <div className="mt-3 font-mono text-sm">{scopedRuntime.token.radius.box}</div>
                    <div className="mt-2 text-sm opacity-65">
                      用于卡片、面板和岛屿容器的圆角尺度。
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button color="primary">Publish</Button>
                  <Button color="secondary" type="outlined">
                    Preview
                  </Button>
                  <Button type="filled" color="accent">
                    Theme Diff
                  </Button>
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-base-300 bg-base-100/75 p-5 shadow-[var(--rue-theme-shadow-sm)]">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] opacity-60">
                  Palette
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <ThemeSwatch
                    label="Primary"
                    value={scopedRuntime.token.colors.primary}
                    text={scopedRuntime.token.colors.primaryContent}
                  />
                  <ThemeSwatch
                    label="Secondary"
                    value={scopedRuntime.token.colors.secondary}
                    text={scopedRuntime.token.colors.secondaryContent}
                  />
                  <ThemeSwatch
                    label="Accent"
                    value={scopedRuntime.token.colors.accent}
                    text={scopedRuntime.token.colors.accentContent}
                  />
                  <ThemeSwatch
                    label="Base 100"
                    value={scopedRuntime.token.colors.base100}
                    text={scopedRuntime.token.colors.baseContent}
                  />
                </div>
              </div>
            </div>
          )}
        />

        <div className="grid gap-3 md:grid-cols-4">
          <TokenFact label="theme" value={runtime.get().theme} />
          <TokenFact label="appearance" value={runtime.get().token.appearance} />
          <TokenFact label="density" value={runtime.get().token.density} />
          <TokenFact label="primaryContent" value={runtime.get().token.colors.primaryContent} />
        </div>
      </div>
    </div>
  )
}

const ThemePresetGalleryPreview: FC = () => {
  const activeTheme = ref<ThemePresetName>('default')
  const token = computed(() => ThemeController.getDesignToken({ theme: activeTheme.value }))

  return (
    <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <Fieldset className="gap-2 rounded-[1.5rem] border border-base-300 bg-base-100 p-4 shadow-sm">
        <legend className="fieldset-legend">预设主题</legend>
        {themePresetOptions.map(option => (
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-3 rounded-[1rem] border border-base-300/70 bg-base-100/70 px-3 py-3"
          >
            <input
              type="radio"
              name="theme-static-presets"
              className="radio radio-sm"
              value={option.value}
              checked={activeTheme.value === option.value}
              onInput={() => {
                activeTheme.value = option.value
              }}
            />
            <span>
              <span className="block font-medium">{option.label}</span>
              <span className="block text-xs opacity-65">{option.description}</span>
            </span>
          </label>
        ))}
      </Fieldset>

      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ThemeSwatch
            label="Primary"
            value={token.get().colors.primary}
            text={token.get().colors.primaryContent}
          />
          <ThemeSwatch
            label="Secondary"
            value={token.get().colors.secondary}
            text={token.get().colors.secondaryContent}
          />
          <ThemeSwatch
            label="Accent"
            value={token.get().colors.accent}
            text={token.get().colors.accentContent}
          />
          <ThemeSwatch
            label="Base"
            value={token.get().colors.base100}
            text={token.get().colors.baseContent}
          />
        </div>

        <div className="rounded-[1.6rem] border border-base-300 bg-base-100/80 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] opacity-60">
                Token Snapshot
              </div>
              <div className="mt-2 text-lg font-semibold">{activeTheme.value}</div>
            </div>
            <div className="badge badge-outline">getDesignToken()</div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <TokenFact label="radius.box" value={token.get().radius.box} />
            <TokenFact label="font.size" value={token.get().typography.size} />
            <TokenFact label="shadow.md" value={token.get().shadow.md} />
          </div>
        </div>
      </div>
    </div>
  )
}

const ThemeProviderRenderPreview: FC = () => {
  return (
    <ThemeProvider
      theme="retro"
      token={{
        colors: {
          primary: '#8b5e34',
        },
      }}
      render={runtime => (
        <div className="rounded-[1.6rem] border border-base-300 bg-base-100/85 p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] opacity-60">
            Render Prop Snapshot
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <TokenFact label="theme" value={runtime.theme} />
            <TokenFact label="primary" value={runtime.token.colors.primary} />
            <TokenFact label="appearance" value={runtime.token.appearance} />
          </div>
        </div>
      )}
    />
  )
}

const ThemeComponentTokensPreview: FC = () => {
  const buttonPrimary = ref('#f97316')
  const cardRadius = ref('1.8rem')
  const buttonContent = computed(() => getReadableContentColor(buttonPrimary.value))
  const componentConfig = computed(() => ({
    Button: {
      selector: '.btn',
      colors: {
        primary: buttonPrimary.value,
        primaryContent: buttonContent.get(),
      },
      radius: {
        field: '999px',
      },
      shadow: {
        sm: '0 12px 28px rgba(249, 115, 22, 0.28)',
      },
    },
    Card: {
      selector: '.card',
      colors: {
        base100: '#111827',
        base200: '#1f2937',
        baseContent: '#e5e7eb',
      },
      radius: {
        box: cardRadius.value,
      },
      shadow: {
        md: '0 26px 70px rgba(15, 23, 42, 0.45)',
      },
    },
    Input: {
      selector: '.input, .textarea, .select',
      colors: {
        primary: '#38bdf8',
        base100: '#f8fafc',
        baseContent: '#0f172a',
      },
      radius: {
        field: '1.1rem',
      },
    },
    Badge: {
      algorithm: true,
      selector: '.badge',
      colors: {
        primary: buttonPrimary.value,
        primaryContent: buttonContent.get(),
      },
    },
  }))
  const runtime = computed(() =>
    ThemeController.useToken({
      theme: 'night',
      algorithm: [ThemeController.darkAlgorithm, ThemeController.compactAlgorithm],
      components: componentConfig.get(),
    }),
  )

  return (
    <div className="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-4 shadow-sm">
        <h3 className="m-0 text-base font-semibold">Component Tokens</h3>
        <p className="mt-2 text-sm opacity-70">
          组件级 token 只写入当前 Provider 内匹配的组件选择器，Button、Card、Input
          可以拥有各自的变量值。
        </p>

        <label className="mt-4 block rounded-[1rem] border border-base-300/70 bg-base-100/70 p-3">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] opacity-60">
            Button Primary
          </span>
          <input
            type="color"
            value={buttonPrimary.value}
            onInput={(event: Event) => {
              buttonPrimary.value =
                (event.target as HTMLInputElement | null)?.value ?? buttonPrimary.value
            }}
            className="h-11 w-full cursor-pointer rounded-[0.9rem] border border-base-300 bg-transparent"
          />
          <span className="mt-2 block font-mono text-xs">{buttonPrimary.value}</span>
        </label>

        <label className="mt-3 block rounded-[1rem] border border-base-300/70 bg-base-100/70 p-3">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] opacity-60">
            Card Radius
          </span>
          <input
            type="range"
            min="1"
            max="2.6"
            step="0.05"
            value={String(parseFloat(cardRadius.value))}
            onInput={(event: Event) => {
              const nextValue = (event.target as HTMLInputElement | null)?.value
              cardRadius.value = nextValue ? `${nextValue}rem` : cardRadius.value
            }}
            className="range range-sm"
          />
          <span className="mt-2 block font-mono text-xs">{cardRadius.value}</span>
        </label>
      </div>

      <div className="grid gap-4">
        <ThemeProvider
          theme="night"
          algorithm={[ThemeController.darkAlgorithm, ThemeController.compactAlgorithm]}
          components={componentConfig.get()}
          className="rounded-[2rem] border border-base-300 bg-base-100 p-5 text-base-content shadow-[var(--rue-theme-shadow-md)]"
          render={scopedRuntime => (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Button color="primary">Orange Button</Button>
                  <Button color="secondary" type="outlined">
                    Global Secondary
                  </Button>
                  <span className="badge badge-primary badge-lg">Badge algorithm=true</span>
                </div>

                <div className="card border border-base-300 bg-base-100 shadow-[var(--rue-theme-shadow-md)]">
                  <div className="card-body gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="card-title text-lg">Card token island</h3>
                        <p className="m-0 text-sm opacity-70">
                          Card 单独覆盖 base 色、圆角和阴影，不影响同一 Provider 下的 Input。
                        </p>
                      </div>
                      <span className="badge badge-outline">radius {cardRadius.value}</span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <input className="input input-bordered w-full" placeholder="Input token" />
                      <select className="select select-bordered w-full" value="token">
                        <option value="token">Select token</option>
                      </select>
                    </div>
                    <textarea
                      className="textarea textarea-bordered w-full"
                      placeholder="Textarea shares Input component token"
                    />
                  </div>
                </div>
              </div>

              <div className="grid content-start gap-3">
                <TokenFact
                  label="Button.primary"
                  value={scopedRuntime.components.Button.colors.primary}
                />
                <TokenFact
                  label="Button.radius"
                  value={scopedRuntime.components.Button.radius.field}
                />
                <TokenFact label="Card.radius" value={scopedRuntime.components.Card.radius.box} />
                <TokenFact
                  label="Input.primary"
                  value={scopedRuntime.components.Input.colors.primary}
                />
              </div>
            </div>
          )}
        />

        <div className="grid gap-3 md:grid-cols-3">
          <TokenFact label="scopeId" value={runtime.get().scopeId} />
          <TokenFact
            label="Button var"
            value={`${runtime.get().componentCssVariables.Button['--color-primary']}`}
          />
          <TokenFact
            label="Card var"
            value={`${runtime.get().componentCssVariables.Card['--radius-box']}`}
          />
        </div>
      </div>
    </div>
  )
}

const ThemeNestedComponentTokensPreview: FC = () => {
  return (
    <ThemeProvider
      theme="garden"
      components={{
        Button: {
          colors: {
            primary: '#16a34a',
            primaryContent: '#f0fdf4',
          },
          radius: {
            field: '1.2rem',
          },
        },
      }}
      className="rounded-[2rem] border border-base-300 bg-base-100 p-5 shadow-sm"
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] opacity-60">
            Parent provider
          </div>
          <Button color="primary">Garden Button</Button>
          <div className="alert alert-success">
            <span>父级只改 Button，Alert 仍吃全局 garden token。</span>
          </div>
        </div>

        <ThemeProvider
          as="section"
          token={{
            colors: {
              base100: '#111827',
              base200: '#1f2937',
              baseContent: '#f8fafc',
            },
          }}
          components={{
            Button: {
              colors: {
                primary: '#38bdf8',
                primaryContent: '#04161a',
              },
              radius: {
                field: '999px',
              },
            },
            Alert: {
              selector: '.alert',
              colors: {
                info: '#38bdf8',
                infoContent: '#04161a',
              },
              radius: {
                box: '1.5rem',
              },
            },
          }}
          className="rounded-[1.5rem] border border-base-300 bg-base-100 p-4 text-base-content shadow-[var(--rue-theme-shadow-sm)]"
          render={runtime => (
            <div className="space-y-4">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] opacity-60">
                Nested provider
              </div>
              <Button color="primary">Nested Button</Button>
              <div className="alert alert-info">
                <span>子 Provider 默认继承父 token，再覆盖 Button 和 Alert。</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <TokenFact
                  label="Button.primary"
                  value={runtime.components.Button.colors.primary}
                />
                <TokenFact label="Base.primary" value={runtime.token.colors.primary} />
              </div>
            </div>
          )}
        />
      </div>
    </ThemeProvider>
  )
}

const ThemeHashTokenPreview: FC = () => {
  const namespaceToken = rueTheme.useToken({
    cssVar: {
      key: 'brand-alpha',
    },
  })
  const [, tupleToken, tupleHashId] = ThemeController.useTokenTuple({
    cssVar: {
      key: 'brand-alpha',
    },
  })
  const runtime = namespaceToken.runtime
  const token = namespaceToken.token
  const hashId = namespaceToken.hashId

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ConfigProvider
        cssVar={{
          key: 'brand-alpha',
        }}
        className="rounded-[2rem] border border-base-300 bg-base-100 p-5 shadow-sm"
        render={scopedRuntime => (
          <div className="space-y-4">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] opacity-60">
              Hashed provider
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="badge badge-primary">{scopedRuntime.hashId}</span>
              <span className="badge badge-outline">{scopedRuntime.scopeId}</span>
            </div>
            <div className="rounded-[1.3rem] border border-base-300 bg-base-100 p-4">
              <div className="font-semibold">Root class includes hashId</div>
              <p className="m-0 mt-2 text-sm opacity-70">
                hashed 默认开启，ConfigProvider 根节点会带上稳定 hash
                class，方便和抽取样式或局部选择器配合。
              </p>
            </div>
          </div>
        )}
      />

      <ThemeProvider
        hashed={false}
        className="rounded-[2rem] border border-base-300 bg-base-100 p-5 shadow-sm"
        render={scopedRuntime => (
          <div className="space-y-4">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] opacity-60">
              Tuple snapshot
            </div>
            <div className="grid gap-3">
              <TokenFact label="hashId" value={hashId || '-'} />
              <TokenFact label="scopeId" value={runtime.scopeId} />
              <TokenFact label="theme token" value={token.colors.primary} />
              <TokenFact label="tuple hash" value={tupleHashId || '-'} />
              <TokenFact label="tuple token" value={tupleToken.colors.primary} />
              <TokenFact label="hashed=false" value={scopedRuntime.hashId || '-'} />
            </div>
          </div>
        )}
      />
    </div>
  )
}

const ThemeCssVarExtractionPreview: FC = () => {
  const config = {
    cssVar: {
      key: 'brand-alpha',
      prefix: 'brand',
    },
    token: {
      colors: {
        primary: '#445566',
        primaryContent: '#f8fafc',
      },
    },
    components: {
      Button: {
        colors: {
          primary: '#112233',
          primaryContent: '#f8fafc',
        },
        radius: {
          field: '999px',
        },
      },
      Card: {
        selector: '.brand-card',
        colors: {
          base100: '#f8fafc',
          baseContent: '#0f172a',
        },
        radius: {
          box: '1.5rem',
        },
      },
    },
  }
  const runtime = ThemeController.useToken(config)
  const extractedStyle = ThemeController.extractStyle(config, {
    selector: '.brand-alpha-theme',
  })

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <ThemeProvider
        {...config}
        zeroRuntime={true}
        className="brand-alpha-theme rounded-[2rem] border border-base-300 bg-base-100 p-5 text-base-content shadow-sm"
        render={scopedRuntime => (
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem]">
            <div className="space-y-4">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] opacity-60">
                zeroRuntime provider
              </div>
              <div className="brand-card rounded-[var(--radius-box)] border border-base-300 bg-base-100 p-4 shadow-[var(--rue-theme-shadow-sm)]">
                <div className="text-lg font-semibold">Static-ready variables</div>
                <p className="m-0 mt-2 text-sm opacity-70">
                  Provider 不再注入组件级 style 标签，但 runtime 和 extractStyle
                  都能拿到同一份变量。
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button color="primary">Button token</Button>
                <Button color="secondary" type="outlined">
                  Secondary
                </Button>
              </div>
            </div>

            <div className="grid content-start gap-3">
              <TokenFact label="scopeId" value={scopedRuntime.scopeId} />
              <TokenFact label="zeroRuntime" value={String(scopedRuntime.zeroRuntime)} />
              <TokenFact
                label="brand var"
                value={`${scopedRuntime.componentCssVariables.Button['--brand-color-primary']}`}
              />
            </div>
          </div>
        )}
      />

      <div className="rounded-[1.5rem] border border-base-300 bg-base-100 p-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] opacity-60">
          Extracted CSS
        </div>
        <div className="mt-3 grid gap-3">
          <TokenFact label="scopeId" value={runtime.scopeId} />
          <TokenFact label="root var" value={`${runtime.cssVariables['--brand-color-primary']}`} />
        </div>
        <Code className="mt-4 max-h-72 overflow-auto" lang="css" code={extractedStyle} />
      </div>
    </div>
  )
}

const ThemeTogglePreview: FC<ControllerPreviewProps> = ({ activeDemo, activeTheme }) => {
  const isChecked = computed(
    () => activeDemo.value === 'toggle' && activeTheme.value === 'synthwave',
  )
  const previewTheme = computed(() => (isChecked.get() ? 'synthwave' : 'default'))

  return (
    <ThemeProvider
      data-testid="theme-toggle-scope"
      theme={previewTheme.get()}
      className="w-full max-w-md rounded-[1.5rem] border border-base-300 bg-base-100 p-4 text-base-content shadow-sm transition-colors"
      render={runtime => (
        <div className="flex flex-wrap items-center gap-3">
          <span className="label-text">Default</span>
          <ThemeController
            data-testid="theme-toggle"
            className="toggle"
            value="synthwave"
            checked={isChecked.get()}
            onChange={(event: Event) => {
              const nextChecked = (event.target as HTMLInputElement | null)?.checked === true
              if (nextChecked) {
                activeDemo.value = 'toggle'
                activeTheme.value = 'synthwave'
                return
              }
              if (activeDemo.value === 'toggle') {
                activeDemo.value = null
                activeTheme.value = null
              }
            }}
          />
          <span className="label-text">Synthwave</span>
          <span className="text-sm text-base-content/70">
            当前 controller 值：{isChecked.get() ? 'synthwave' : '未激活'}
          </span>
          <span className="badge badge-outline">preview theme {runtime.theme}</span>
        </div>
      )}
    />
  )
}

const ThemeCheckboxPreview: FC<ControllerPreviewProps> = ({ activeDemo, activeTheme }) => {
  const isChecked = computed(
    () => activeDemo.value === 'checkbox' && activeTheme.value === 'synthwave',
  )
  const previewTheme = computed(() => (isChecked.get() ? 'synthwave' : 'default'))

  return (
    <ThemeProvider
      data-testid="theme-checkbox-scope"
      theme={previewTheme.get()}
      className="w-full max-w-md rounded-[1.5rem] border border-base-300 bg-base-100 p-4 text-base-content shadow-sm transition-colors"
      render={runtime => (
        <div className="flex flex-wrap items-center gap-3">
          <ThemeController
            data-testid="theme-checkbox"
            className="checkbox"
            value="synthwave"
            checked={isChecked.get()}
            onChange={(event: Event) => {
              const nextChecked = (event.target as HTMLInputElement | null)?.checked === true
              if (nextChecked) {
                activeDemo.value = 'checkbox'
                activeTheme.value = 'synthwave'
                return
              }
              if (activeDemo.value === 'checkbox') {
                activeDemo.value = null
                activeTheme.value = null
              }
            }}
          />
          <span className="text-sm text-base-content/70">
            当前 controller 值：{isChecked.get() ? 'synthwave' : '未激活'}
          </span>
          <span className="badge badge-outline">preview theme {runtime.theme}</span>
        </div>
      )}
    />
  )
}

const ThemeSwapPreview: FC<ControllerPreviewProps> = ({ activeDemo, activeTheme }) => {
  const isChecked = computed(() => activeDemo.value === 'swap' && activeTheme.value === 'synthwave')
  const previewTheme = computed(() => (isChecked.get() ? 'synthwave' : 'default'))

  return (
    <ThemeProvider
      data-testid="theme-swap-scope"
      theme={previewTheme.get()}
      className="w-full max-w-md rounded-[1.5rem] border border-base-300 bg-base-100 p-4 text-base-content shadow-sm transition-colors"
      render={runtime => (
        <div className="flex flex-wrap items-center gap-3">
          <label className="swap swap-rotate text-base-content">
            <ThemeController
              data-testid="theme-swap"
              value="synthwave"
              checked={isChecked.get()}
              onChange={(event: Event) => {
                const nextChecked = (event.target as HTMLInputElement | null)?.checked === true
                if (nextChecked) {
                  activeDemo.value = 'swap'
                  activeTheme.value = 'synthwave'
                  return
                }
                if (activeDemo.value === 'swap') {
                  activeDemo.value = null
                  activeTheme.value = null
                }
              }}
            />
            <span className="swap-off inline-flex items-center gap-2">
              <SunIcon /> Light
            </span>
            <span className="swap-on inline-flex items-center gap-2">
              <MoonIcon /> Dark
            </span>
          </label>
          <span className="text-sm text-base-content/70">
            当前 controller 值：{isChecked.get() ? 'synthwave' : '未激活'}
          </span>
          <span className="badge badge-outline">preview theme {runtime.theme}</span>
        </div>
      )}
    />
  )
}

const ThemeRadioPreview: FC<ControllerPreviewProps> = ({ activeDemo, activeTheme }) => {
  const selectedTheme = computed(() => (activeDemo.value === 'radio' ? activeTheme.value : null))
  const previewTheme = computed(() => selectedTheme.get() ?? 'default')

  return (
    <ThemeProvider
      data-testid="theme-radio-scope"
      theme={previewTheme.get()}
      className="w-full max-w-md rounded-[1.5rem] border border-base-300 bg-base-100 p-4 text-base-content shadow-sm transition-colors"
      render={runtime => (
        <Fieldset className="w-full gap-2">
          {['default', 'retro', 'cyberpunk'].map(theme => {
            const isSelected = selectedTheme.get() === theme
            return (
              <label
                key={theme}
                className={`flex cursor-pointer items-center gap-2 rounded-box border px-3 py-2 transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary text-primary-content'
                    : 'border-base-300 bg-base-100 text-base-content'
                }`}
              >
                <ThemeController
                  data-testid={`theme-radio-${theme}`}
                  type="radio"
                  name="theme-radios"
                  className="radio radio-sm"
                  value={theme}
                  checked={isSelected}
                  onChange={() => {
                    activeDemo.value = 'radio'
                    activeTheme.value = theme as ThemePresetName
                  }}
                />
                <span>{theme}</span>
              </label>
            )
          })}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-sm text-base-content/70">
            <span>当前 controller 值：{selectedTheme.get() ?? '未激活'}</span>
            <span className="badge badge-outline">preview theme {runtime.theme}</span>
          </div>
        </Fieldset>
      )}
    />
  )
}

const ThemeButtonGroupPreview: FC<ControllerPreviewProps> = ({ activeDemo, activeTheme }) => {
  const selectedTheme = computed(() => (activeDemo.value === 'buttons' ? activeTheme.value : null))
  const previewTheme = computed(() => selectedTheme.get() ?? 'default')

  return (
    <ThemeProvider
      data-testid="theme-buttons-scope"
      theme={previewTheme.get()}
      className="w-full max-w-xl rounded-[1.5rem] border border-base-300 bg-base-100 p-4 text-base-content shadow-sm transition-colors"
      render={runtime => (
        <div className="space-y-3">
          <div className="join join-vertical sm:join-horizontal">
            {['default', 'night', 'coffee'].map(theme => (
              <ThemeController
                key={theme}
                data-testid={`theme-button-${theme}`}
                type="radio"
                name="theme-buttons"
                value={theme}
                checked={selectedTheme.get() === theme}
                onChange={() => {
                  activeDemo.value = 'buttons'
                  activeTheme.value = theme as ThemePresetName
                }}
                className="btn theme-controller join-item"
                aria-label={theme}
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-base-content/70">
            <span>当前 controller 值：{selectedTheme.get() ?? '未激活'}</span>
            <span className="badge badge-outline">preview theme {runtime.theme}</span>
          </div>
        </div>
      )}
    />
  )
}

const ThemeControllerPage: FC = () => {
  const tabWorkbench = ref<TabMode>('preview')
  const tabPresets = ref<TabMode>('preview')
  const tabRender = ref<TabMode>('preview')
  const tabComponents = ref<TabMode>('preview')
  const tabNestedComponents = ref<TabMode>('preview')
  const tabHashToken = ref<TabMode>('preview')
  const tabCssVar = ref<TabMode>('preview')
  const tabToggle = ref<TabMode>('preview')
  const tabCheckbox = ref<TabMode>('preview')
  const tabSwap = ref<TabMode>('preview')
  const tabRadio = ref<TabMode>('preview')
  const tabButtons = ref<TabMode>('preview')
  const activeControllerDemo = ref<ControllerDemoKind | null>(null)
  const activeControllerTheme = ref<ThemePresetName | null>(null)

  return (
    <SidebarPlayground>
      <div className="max-w-none prose prose-sm md:prose-base">
        <h1>Theme 主题系统</h1>
        <p className="text-sm mt-3 mb-3">
          目录仍然叫 theme，公共导出名继续保持 <code>ThemeController</code>。它既使用 daisyUI
          theme-controller 的输入模式，也提供轻量主题配置能力：
          <code>Provider</code> / <code>ConfigProvider</code>、<code>theme.useToken</code>、
          <code>getDesignToken</code> 和暗色 / 紧凑算法可以一起用于局部作用域、组合派生和场景覆盖。
        </p>
        <p className="text-sm mt-3 mb-3">
          API 组织保持轻量，视觉仍然使用 Rue 当前偏轻盈、偏实验的气质：它更适合生成局部主题岛，
          而不是把整站配置强耦合到单一入口。
        </p>

        <ExampleBlock
          title="Scoped theme workbench"
          summary="把预设主题、算法和 token override 合到一个工作台里，直接观察局部主题岛的真实样子。"
          tab={tabWorkbench}
          preview={() => <ThemeWorkbenchPreview />}
          code={buildScopedThemeCode()}
        />

        <ExampleBlock
          title="Preset snapshot"
          summary="通过 getDesignToken 直接抽取主题快照，不挂 Provider 也能做主题分析、导出和调试面板。"
          tab={tabPresets}
          preview={() => <ThemePresetGalleryPreview />}
          code={buildPresetCode()}
        />

        <ExampleBlock
          title="Provider render prop"
          summary="Rue 默认 children 不支持函数子节点，所以 ThemeProvider 提供显式 render prop 来读取运行时 token。"
          tab={tabRender}
          preview={() => <ThemeProviderRenderPreview />}
          code={buildProviderRenderCode()}
        />

        <ExampleBlock
          title="Component tokens"
          summary="组件级 token 默认只覆盖当前组件，selector 可接入现成 daisyUI/Rue class。"
          tab={tabComponents}
          preview={() => <ThemeComponentTokensPreview />}
          code={buildComponentTokensCode()}
        />

        <ExampleBlock
          title="Nested component theme"
          summary="局部主题可以继续嵌套，子 Provider 默认继承父 token 和组件 token，再覆盖自己的局部配置。"
          tab={tabNestedComponents}
          preview={() => <ThemeNestedComponentTokensPreview />}
          code={buildNestedComponentTokenCode()}
        />

        <ExampleBlock
          title="HashId and theme.useToken"
          summary="主题配置容器、theme.useToken、hashId、hashed=false 都可以组合使用。"
          tab={tabHashToken}
          preview={() => <ThemeHashTokenPreview />}
          code={buildHashTokenCode()}
        />

        <ExampleBlock
          title="CSS variables extraction"
          summary="支持 cssVar.key、prefix 和 zeroRuntime，配合 extractStyle 预先抽出根变量和组件级变量。"
          tab={tabCssVar}
          preview={() => <ThemeCssVarExtractionPreview />}
          code={buildCssVarExtractionCode()}
        />

        <div className="not-prose mt-12 grid gap-6 rounded-[2rem] border border-base-300 bg-gradient-to-br from-base-100 via-base-100 to-base-200/60 p-6 shadow-sm lg:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] opacity-60">
              Controller modes
            </div>
            <h2 className="mt-3 mb-2 text-xl font-semibold">完整的输入模式矩阵</h2>
            <p className="m-0 text-sm opacity-70">
              下面这些示例保持了基础的 toggle、checkbox、swap、radio 四种 controller
              写法，并额外补了按钮组模式，方便把 ThemeController 直接嵌进当前表单和筛选 UI。 由于
              daisyUI 的 theme-controller 天生就是页面级切换器，这里额外做了单一激活控制，避免多个
              示例 同时 checked 时互相抢占全局主题。
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-base-300 bg-base-100/80 p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] opacity-60">
              API quick use
            </div>
            <Code
              className="mt-3"
              lang="tsx"
              code={[
                "import { ThemeController, theme } from '@rue-js/design'",
                '',
                'export default function ThemeQuickUseDemo() {',
                '  const token = ThemeController.getDesignToken({',
                "    theme: 'coffee',",
                '    algorithm: ThemeController.compactAlgorithm,',
                '  })',
                "  const { runtime, hashId } = theme.useToken({ theme: 'coffee' })",
                '',
                '  return (',
                '    <div className={hashId}>',
                '      {runtime.theme} | {token.colors.primary}',
                '    </div>',
                '  )',
                '}',
              ].join('\n')}
            />
          </div>
        </div>

        <ExampleBlock
          title="Theme Controller using a toggle"
          summary="最轻量的 controller 入口。"
          tab={tabToggle}
          preview={() => (
            <ThemeTogglePreview
              activeDemo={activeControllerDemo}
              activeTheme={activeControllerTheme}
            />
          )}
          code={buildToggleCode()}
        />

        <ExampleBlock
          title="Theme Controller using a checkbox"
          summary="适合塞进表单区或者设置面板。"
          tab={tabCheckbox}
          preview={() => (
            <ThemeCheckboxPreview
              activeDemo={activeControllerDemo}
              activeTheme={activeControllerTheme}
            />
          )}
          code={buildCheckboxCode()}
        />

        <ExampleBlock
          title="Theme Controller using a swap"
          summary="展示了基础的 swap 形式，并补上更完整的视觉提示。"
          tab={tabSwap}
          preview={() => (
            <ThemeSwapPreview
              activeDemo={activeControllerDemo}
              activeTheme={activeControllerTheme}
            />
          )}
          code={buildSwapCode()}
        />

        <ExampleBlock
          title="Theme Controller using radio inputs"
          summary="适合明确展示当前主题选择。"
          tab={tabRadio}
          preview={() => (
            <ThemeRadioPreview
              activeDemo={activeControllerDemo}
              activeTheme={activeControllerTheme}
            />
          )}
          code={buildRadioCode()}
        />

        <ExampleBlock
          title="Theme Controller using button group"
          summary="把 ThemeController 当作 join 按钮组使用，适合主题预设切换器。"
          tab={tabButtons}
          preview={() => (
            <ThemeButtonGroupPreview
              activeDemo={activeControllerDemo}
              activeTheme={activeControllerTheme}
            />
          )}
          code={buildButtonGroupCode()}
        />

        <div className="mt-12 space-y-8">
          <section>
            <h2>ThemeController API</h2>
            <ApiTable rows={controllerApiRows} />
          </section>

          <section>
            <h2>ThemeController.Provider API</h2>
            <ApiTable rows={providerApiRows} />
          </section>

          <section>
            <h2>Static Theme APIs</h2>
            <ApiTable rows={staticApiRows} />
          </section>
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default ThemeControllerPage
