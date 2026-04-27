import {
  useCustomElement,
  emitted,
  type FC,
  onMounted,
  onUnmounted,
  ref,
  useHost,
  useRef,
  useShadowRoot,
} from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'

type AccentTone = 'teal' | 'amber' | 'rose'
type DemoHostElement = HTMLElement & { props?: Record<string, unknown> }
type DemoEvent = {
  source: 'shadow' | 'light'
  name: string
  detail: string
  at: string
}

const shadowConfigureRuns = ref(0)
const lightConfigureRuns = ref(0)
const shadowMounts = ref(0)
const lightMounts = ref(0)

let shadowInstanceSeed = 0
let lightInstanceSeed = 0

const shadowMountIdByHost = new WeakMap<HTMLElement, number>()
const lightMountIdByHost = new WeakMap<HTMLElement, number>()

const SHADOW_NONCE = 'rue-demo-nonce'
const SHADOW_TAG = 'rue-shadow-console'
const LIGHT_TAG = 'rue-light-signal'

const shadowStyles = [
  `
    :host {
      display: block;
      color: #e5eef3;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .frame {
      background:
        radial-gradient(circle at top right, rgba(255, 255, 255, 0.16), transparent 34%),
        linear-gradient(135deg, #0f172a, #111827 60%, #1f2937);
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 24px;
      padding: 20px;
      box-shadow: 0 20px 45px rgba(15, 23, 42, 0.24);
      overflow: hidden;
    }

    .frame[data-busy='yes'] {
      box-shadow: 0 24px 52px rgba(225, 29, 72, 0.26);
    }

    .frame[data-accent='teal'] {
      --accent: #2dd4bf;
      --accent-soft: rgba(45, 212, 191, 0.16);
    }

    .frame[data-accent='amber'] {
      --accent: #f59e0b;
      --accent-soft: rgba(245, 158, 11, 0.16);
    }

    .frame[data-accent='rose'] {
      --accent: #fb7185;
      --accent-soft: rgba(251, 113, 133, 0.16);
    }

    .hero {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: flex-start;
      justify-content: space-between;
    }

    .eyebrow {
      margin: 0 0 6px;
      font-size: 11px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: rgba(226, 232, 240, 0.72);
    }

    .title {
      margin: 0;
      font-size: 28px;
      line-height: 1.1;
      color: white;
    }

    .subtitle {
      margin: 8px 0 0;
      color: rgba(226, 232, 240, 0.84);
      font-size: 13px;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .button {
      appearance: none;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
      color: white;
      padding: 10px 14px;
      font-size: 13px;
      cursor: pointer;
      transition:
        transform 180ms ease,
        border-color 180ms ease,
        background 180ms ease;
    }

    .button:hover {
      transform: translateY(-1px);
      border-color: rgba(255, 255, 255, 0.32);
      background: rgba(255, 255, 255, 0.12);
    }

    .button.primary {
      background: var(--accent);
      color: #04111b;
      border-color: transparent;
      font-weight: 700;
    }

    .grid {
      margin-top: 18px;
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .frame.compact .grid {
      grid-template-columns: 1fr;
    }

    .panel {
      border: 1px solid rgba(148, 163, 184, 0.16);
      background: rgba(15, 23, 42, 0.48);
      border-radius: 18px;
      padding: 14px;
    }

    .metricValue {
      font-size: 44px;
      font-weight: 800;
      color: white;
      line-height: 1;
    }

    .metricLabel {
      margin-top: 4px;
      font-size: 12px;
      color: rgba(226, 232, 240, 0.76);
    }

    .meter {
      margin-top: 14px;
      height: 10px;
      border-radius: 999px;
      background: rgba(148, 163, 184, 0.18);
      overflow: hidden;
    }

    .meterFill {
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--accent), white);
      transition: width 180ms ease;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 14px;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 12px;
      background: var(--accent-soft);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }

    .chip.muted {
      background: rgba(148, 163, 184, 0.18);
      color: rgba(226, 232, 240, 0.76);
    }

    .slotTitle {
      margin: 0 0 10px;
      font-size: 12px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(226, 232, 240, 0.6);
    }

    .footer {
      margin-top: 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      font-size: 12px;
      color: rgba(226, 232, 240, 0.7);
    }
  `,
  `
    ::slotted([slot='meta']) {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border-radius: 999px;
      padding: 6px 12px;
      border: 1px solid rgba(255, 255, 255, 0.16);
      background: rgba(255, 255, 255, 0.08);
      font-size: 12px;
      color: white;
    }

    ::slotted(*) {
      color: inherit;
    }
  `,
]

const lightStyles = [
  `
    :host {
      display: block;
    }

    .lightShell {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      align-items: center;
      gap: 12px;
      border-radius: 20px;
      padding: 14px 16px;
      border: 1px solid rgba(15, 23, 42, 0.08);
      background: white;
      box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
    }

    .lightShell.tone-teal {
      border-color: rgba(13, 148, 136, 0.2);
      background: linear-gradient(135deg, rgba(240, 253, 250, 0.96), white);
    }

    .lightShell.tone-amber {
      border-color: rgba(217, 119, 6, 0.2);
      background: linear-gradient(135deg, rgba(255, 251, 235, 0.96), white);
    }

    .lightShell.tone-rose {
      border-color: rgba(225, 29, 72, 0.18);
      background: linear-gradient(135deg, rgba(255, 241, 242, 0.98), white);
    }

    .lightTitle {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
    }

    .lightMeta {
      margin-top: 4px;
      font-size: 12px;
      color: rgba(15, 23, 42, 0.64);
    }

    .lightValue {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
    }

    .lightButton {
      appearance: none;
      border: 0;
      border-radius: 999px;
      background: #0f172a;
      color: white;
      padding: 8px 12px;
      cursor: pointer;
      font-size: 12px;
    }
  `,
]

const formatJson = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const parseTagInput = (value: string) =>
  value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)

const readRecordProp = (value: unknown) =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined

const readShadowCompact = (props: Record<string, unknown>) =>
  readRecordProp(props.config)?.compact === true

const readShadowPreset = (props: Record<string, unknown>) => {
  const presetValue = readRecordProp(props.config)?.preset
  return typeof presetValue === 'string' ? presetValue : 'manual'
}

const resolveShadowMountId = (host: HTMLElement | null) => {
  if (!host) {
    return 0
  }
  const existing = shadowMountIdByHost.get(host)
  if (existing) {
    return existing
  }
  shadowInstanceSeed += 1
  shadowMounts.value += 1
  shadowMountIdByHost.set(host, shadowInstanceSeed)
  return shadowInstanceSeed
}

const resolveLightMountId = (host: HTMLElement | null) => {
  if (!host) {
    return 0
  }
  const existing = lightMountIdByHost.get(host)
  if (existing) {
    return existing
  }
  lightInstanceSeed += 1
  lightMounts.value += 1
  lightMountIdByHost.set(host, lightInstanceSeed)
  return lightInstanceSeed
}

const readLightEvents = (props: Record<string, unknown>) =>
  Number(readRecordProp(props.metrics)?.events ?? 0)

const readLightTags = (props: Record<string, unknown>) =>
  Number(readRecordProp(props.metrics)?.tags ?? 0)

const toneToLight = (accent: AccentTone) => accent

const LightSignalMeta: FC = () => {
  const host = useHost()
  const shadowRoot = useShadowRoot()
  const mountId = resolveLightMountId(host)

  return (
    <p className="lightMeta">
      实例 #{mountId} · {host?.tagName.toLowerCase() ?? 'unknown-host'} ·{' '}
      {shadowRoot ? 'shadow-root' : 'light-dom'}
    </p>
  )
}

const ShadowConsole: FC<Record<string, unknown>> = props => {
  const host = useHost()
  const shadowRoot = useShadowRoot()
  const emit = emitted(props as any)
  const mountId = resolveShadowMountId(host)

  const count = Number(props.count ?? 0)
  const accent = String(props.accent ?? 'teal')
  const panelTitle = String(props.panelTitle ?? 'Shadow console')
  const tags = Array.isArray(props.tags) ? (props.tags as string[]) : []
  const busy = props.busy === true
  const meterWidth = `${Math.max(8, Math.min(count * 9, 100))}%`

  return (
    <article
      className={`frame ${readShadowCompact(props) ? 'compact' : ''}`}
      data-accent={accent}
      data-busy={busy ? 'yes' : 'no'}
    >
      <header className="hero">
        <div>
          <p className="eyebrow">Shadow Root / Slot / CustomEvent</p>
          <h2 className="title">{panelTitle}</h2>
          <p className="subtitle">
            实例 #{mountId} · {host?.tagName.toLowerCase() ?? 'unknown-host'} ·{' '}
            {shadowRoot ? 'shadow-root 已开启' : 'light-dom'}
          </p>
        </div>
        <div className="actions">
          <button
            type="button"
            className="button primary"
            onClick={() => {
              emit(
                'save',
                { mountId, panelTitle, count, tags, busy },
                {
                  host: host?.tagName.toLowerCase() ?? 'unknown',
                  rootMode: shadowRoot ? 'shadow' : 'light',
                },
              )
            }}
          >
            派发 save
          </button>
          <button
            type="button"
            className="button"
            onClick={() => {
              emit('pulse', count + 1, accent)
            }}
          >
            派发 pulse
          </button>
        </div>
      </header>

      <div className="grid">
        <section className="panel">
          <div className="metricValue">{count}</div>
          <div className="metricLabel">这个数值来自宿主上的 el.props.count</div>
          <div className="meter">
            <div className="meterFill" style={{ width: meterWidth }}></div>
          </div>
          <div className="chips">
            {tags.length ? (
              tags.map(tag => (
                <span key={tag} className="chip">
                  {tag}
                </span>
              ))
            ) : (
              <span className="chip muted">暂无 tags</span>
            )}
          </div>
        </section>

        <section className="panel">
          <p className="slotTitle">命名 Slot</p>
          <slot name="meta"></slot>
          <div style={{ height: '12px' }}></div>
          <p className="slotTitle">默认 Slot</p>
          <slot></slot>
        </section>
      </div>

      <footer className="footer">
        <span>preset: {readShadowPreset(props)}</span>
        <span>{busy ? '后台同步中' : '空闲'}</span>
        <span>{readShadowCompact(props) ? 'compact on' : 'compact off'}</span>
      </footer>
    </article>
  )
}

const LightSignal: FC<Record<string, unknown>> = props => {
  const emit = emitted(props as any)
  const label = String(props.label ?? 'Light DOM signal')
  const tone = String(props.tone ?? 'teal')

  return (
    <div className={`lightShell tone-${tone}`}>
      <div>
        <p className="lightTitle">{label}</p>
        <LightSignalMeta />
      </div>
      <div className="lightValue">
        {readLightEvents(props)} events / {readLightTags(props)} tags
      </div>
      <button
        type="button"
        className="lightButton"
        onClick={() => {
          emit('light-tap', { label, events: readLightEvents(props), tags: readLightTags(props) })
        }}
      >
        emit
      </button>
    </div>
  )
}

const ShadowConsoleElement = useCustomElement(ShadowConsole, {
  styles: shadowStyles,
  nonce: SHADOW_NONCE,
  configureApp() {
    shadowConfigureRuns.value += 1
  },
})

const LightSignalElement = useCustomElement(LightSignal, {
  shadowRoot: false,
  styles: lightStyles,
  configureApp() {
    lightConfigureRuns.value += 1
  },
})

const registerCustomElement = (tag: string, ctor: CustomElementConstructor) => {
  if (typeof customElements === 'undefined') {
    return
  }
  if (!customElements.get(tag)) {
    customElements.define(tag, ctor)
  }
}

registerCustomElement(SHADOW_TAG, ShadowConsoleElement)
registerCustomElement(LIGHT_TAG, LightSignalElement)

const demoCode = [
  "import { useCustomElement, emitted, useHost, useShadowRoot } from '@rue-js/rue'",
  '',
  'const ShadowConsole = props => {',
  '  const host = useHost()',
  '  const shadowRoot = useShadowRoot()',
  '  const emit = emitted(props)',
  '',
  '  return (',
  '    <article>',
  '      <h2>{props.panelTitle ?? "Shadow console"}</h2>',
  '      <p>{host?.tagName.toLowerCase()} / {shadowRoot ? "shadow" : "light"}</p>',
  '      <button onClick={() => emit("save", { count: props.count, tags: props.tags })}>',
  '        emit save',
  '      </button>',
  '      <slot name="meta"></slot>',
  '      <slot></slot>',
  '    </article>',
  '  )',
  '}',
  '',
  'const ShadowConsoleElement = useCustomElement(ShadowConsole, {',
  "  styles: [':host { display:block }', '.frame { border-radius:24px }'],",
  '  nonce: "rue-demo-nonce",',
  '  configureApp() {',
  '    console.log("configureApp runs once per host instance")',
  '  },',
  '})',
  '',
  'const LightSignalElement = useCustomElement(LightSignal, {',
  '  shadowRoot: false,',
  "  styles: ['.lightShell { display:grid }'],",
  '})',
  '',
  'customElements.define("rue-shadow-console", ShadowConsoleElement)',
  'customElements.define("rue-light-signal", LightSignalElement)',
  '',
  'const shadowHost = document.querySelector("rue-shadow-console")',
  'shadowHost.setAttribute("panel-title", "Ops Console")',
  'shadowHost.props = {',
  '  count: 7,',
  '  tags: ["shadow", "events", "slots"],',
  '  config: { compact: false, preset: "ops" },',
  '  busy: true,',
  '}',
  '',
  'shadowHost.addEventListener("save", event => {',
  '  console.log((event as CustomEvent).detail)',
  '})',
].join('\n')

const WebComponents: FC = () => {
  const activeTab = ref<'preview' | 'code'>('preview')
  const panelTitle = ref('Ops Console / Native CE')
  const accent = ref<AccentTone>('teal')
  const count = ref(7)
  const tagInput = ref('shadow, events, slots, props')
  const busy = ref(false)
  const compact = ref(false)
  const activePreset = ref<'ops' | 'commerce' | 'incident'>('ops')
  const slotNote = ref('默认 slot 里的内容仍由外层 Rue 页面控制，并由浏览器完成原生 slot 分发。')
  const metaBadge = ref('SLA 99.99%')
  const lightLabel = ref('Light DOM signal')
  const eventLog = ref<DemoEvent[]>([])
  const shadowNonce = ref('等待挂载')
  const shadowStyleCount = ref(0)
  const lightStyleCount = ref(0)

  const shadowHostRef = useRef<DemoHostElement>()
  const lightHostRef = useRef<DemoHostElement>()

  const shadowPropsPayload = () => ({
    count: count.value,
    tags: parseTagInput(tagInput.value),
    config: { compact: compact.value, preset: activePreset.value },
    busy: busy.value,
  })

  const lightPropsPayload = () => ({
    metrics: {
      events: eventLog.value.length,
      tags: parseTagInput(tagInput.value).length,
      busy: busy.value,
    },
  })

  const refreshDiagnostics = () => {
    const shadowHost = shadowHostRef.current
    const lightHost = lightHostRef.current

    shadowStyleCount.value =
      shadowHost?.shadowRoot?.querySelectorAll('style[data-rue-ce-style]').length ?? 0
    shadowNonce.value =
      shadowHost?.shadowRoot?.querySelector('style[data-rue-ce-style]')?.getAttribute('nonce') ??
      '未找到 nonce'
    lightStyleCount.value = lightHost?.querySelectorAll('style[data-rue-ce-style]').length ?? 0
  }

  const scheduleDiagnostics = () => {
    Promise.resolve().then(() => {
      Promise.resolve().then(() => {
        refreshDiagnostics()
      })
    })
  }

  const syncShadowHost = () => {
    const el = shadowHostRef.current
    if (!el) {
      return
    }

    const nextTitle = panelTitle.value.trim()
    if (nextTitle) {
      el.setAttribute('panel-title', nextTitle)
    } else {
      el.removeAttribute('panel-title')
    }
    el.setAttribute('accent', accent.value)
    el.props = shadowPropsPayload()
  }

  const syncLightHost = () => {
    const el = lightHostRef.current
    if (!el) {
      return
    }

    const nextLabel = lightLabel.value.trim()
    if (nextLabel) {
      el.setAttribute('label', nextLabel)
    } else {
      el.removeAttribute('label')
    }
    el.setAttribute('tone', toneToLight(accent.value))
    el.props = lightPropsPayload()
  }

  const syncHosts = () => {
    syncShadowHost()
    syncLightHost()
    scheduleDiagnostics()
  }

  const pushEvent = (source: 'shadow' | 'light', name: string, detail: unknown) => {
    eventLog.value = [
      {
        source,
        name,
        detail: formatJson(detail),
        at: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      },
      ...eventLog.value,
    ].slice(0, 8)
    syncLightHost()
    scheduleDiagnostics()
  }

  const bindCustomEvent = (
    el: DemoHostElement | undefined,
    name: string,
    source: 'shadow' | 'light',
  ) => {
    if (!el) {
      return () => {}
    }

    const handler = (event: Event) => {
      pushEvent(source, name, (event as CustomEvent).detail)
    }

    el.addEventListener(name, handler as EventListener)

    return () => {
      el.removeEventListener(name, handler as EventListener)
    }
  }

  const applyPreset = (preset: 'ops' | 'commerce' | 'incident') => {
    activePreset.value = preset

    if (preset === 'ops') {
      panelTitle.value = 'Ops Console / Native CE'
      accent.value = 'teal'
      count.value = 7
      tagInput.value = 'shadow, events, slots, props'
      slotNote.value = '默认 slot 里的内容仍由外层 Rue 页面控制，并由浏览器完成原生 slot 分发。'
      metaBadge.value = 'SLA 99.99%'
      lightLabel.value = 'Light DOM signal'
      busy.value = false
      compact.value = false
    } else if (preset === 'commerce') {
      panelTitle.value = 'Commerce Fulfillment Board'
      accent.value = 'amber'
      count.value = 11
      tagInput.value = 'checkout, fulfillment, analytics, queue'
      slotNote.value = '这里可以放来自宿主页面的营销文案、富文本说明，或任意 DOM 结构。'
      metaBadge.value = 'AOV +18%'
      lightLabel.value = 'Revenue pulse'
      busy.value = false
      compact.value = true
    } else {
      panelTitle.value = 'Incident Bridge / P1'
      accent.value = 'rose'
      count.value = 13
      tagInput.value = 'incident, pager, bridge, rollback'
      slotNote.value = 'slot 内容也可以随着宿主页面状态变化，这里模拟外层应用实时改写公告。'
      metaBadge.value = 'P1 ongoing'
      lightLabel.value = 'War-room heartbeat'
      busy.value = true
      compact.value = false
    }

    syncHosts()
  }

  const appendTag = () => {
    const nextTags = parseTagInput(tagInput.value)
    nextTags.push(`tag-${nextTags.length + 1}`)
    tagInput.value = nextTags.join(', ')
    syncHosts()
  }

  const removeLastTag = () => {
    const nextTags = parseTagInput(tagInput.value)
    nextTags.pop()
    tagInput.value = nextTags.join(', ')
    syncHosts()
  }

  const clearTitleAttr = () => {
    panelTitle.value = ''
    syncHosts()
  }

  const clearEvents = () => {
    eventLog.value = []
    syncLightHost()
    scheduleDiagnostics()
  }

  onMounted(() => {
    let offSave = () => {}
    let offPulse = () => {}
    let offLight = () => {}

    Promise.resolve().then(() => {
      syncHosts()

      offSave = bindCustomEvent(shadowHostRef.current, 'save', 'shadow')
      offPulse = bindCustomEvent(shadowHostRef.current, 'pulse', 'shadow')
      offLight = bindCustomEvent(lightHostRef.current, 'light-tap', 'light')

      scheduleDiagnostics()
    })

    onUnmounted(() => {
      offSave()
      offPulse()
      offLight()
    })
  })

  return (
    <SidebarPlayground>
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">原生 Web Components</h1>
      <p className="text-base-content/70 max-w-4xl leading-7">
        这个示例把 Rue 的 useCustomElement、host.props 非字符串传参、宿主属性同步、CustomEvent
        桥接、useHost/useShadowRoot、shadowRoot 与 light DOM、styles + nonce，以及原生 slot
        投影全部揉进一个页面里。
      </p>

      <div role="tablist" className="tabs tabs-box mt-4">
        <button
          role="tab"
          className={`tab ${activeTab.value === 'preview' ? 'tab-active' : ''}`}
          onClick={() => {
            activeTab.value = 'preview'
          }}
        >
          效果
        </button>
        <button
          role="tab"
          className={`tab ${activeTab.value === 'code' ? 'tab-active' : ''}`}
          onClick={() => {
            activeTab.value = 'code'
          }}
        >
          代码
        </button>
      </div>

      <div className={activeTab.value === 'preview' ? 'mt-4 space-y-6' : 'hidden'}>
        <div className="grid gap-6 items-start">
          <div className="card bg-base-100 shadow-xl border border-base-300">
            <div className="card-body gap-5">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-base-content/45">Preset</p>
                <div className="mt-3 flex w-full gap-2">
                  {(['ops', 'commerce', 'incident'] as const).map(preset => (
                    <button
                      key={preset}
                      className={`btn btn-sm h-9 min-h-9 min-w-0 flex-1 px-1 text-[11px] tracking-tight ${activePreset.value === preset ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => applyPreset(preset)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <label className="floating-label">
                <input
                  className="input input-bordered w-full"
                  value={panelTitle.value}
                  onInput={(e: Event) => {
                    panelTitle.value = (e.target as HTMLInputElement).value
                    syncShadowHost()
                    scheduleDiagnostics()
                  }}
                />
                <span>panel-title attribute</span>
              </label>

              <label className="floating-label">
                <input
                  className="input input-bordered w-full"
                  value={tagInput.value}
                  onInput={(e: Event) => {
                    tagInput.value = (e.target as HTMLInputElement).value
                    syncHosts()
                  }}
                />
                <span>host.props.tags（逗号分隔）</span>
              </label>

              <label className="floating-label">
                <input
                  className="input input-bordered w-full"
                  value={slotNote.value}
                  onInput={(e: Event) => {
                    slotNote.value = (e.target as HTMLInputElement).value
                  }}
                />
                <span>默认 slot 文案</span>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">accent attribute</legend>
                  <select
                    className="select select-bordered"
                    value={accent.value}
                    onChange={(e: Event) => {
                      accent.value = (e.target as HTMLSelectElement).value as AccentTone
                      syncHosts()
                    }}
                  >
                    <option value="teal">teal</option>
                    <option value="amber">amber</option>
                    <option value="rose">rose</option>
                  </select>
                </fieldset>

                <fieldset className="fieldset">
                  <legend className="fieldset-legend">light label attribute</legend>
                  <input
                    className="input input-bordered"
                    value={lightLabel.value}
                    onInput={(e: Event) => {
                      lightLabel.value = (e.target as HTMLInputElement).value
                      syncLightHost()
                      scheduleDiagnostics()
                    }}
                  />
                </fieldset>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>host.props.count</span>
                  <span className="font-semibold">{count.value}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={count.value}
                  className="range range-primary"
                  onInput={(e: Event) => {
                    count.value = Number((e.target as HTMLInputElement).value)
                    syncShadowHost()
                    scheduleDiagnostics()
                  }}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={busy.value}
                    onChange={(e: Event) => {
                      busy.value = (e.target as HTMLInputElement).checked
                      syncHosts()
                    }}
                  />
                  <span className="label-text">host.props.busy</span>
                </label>
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    className="toggle toggle-secondary"
                    checked={compact.value}
                    onChange={(e: Event) => {
                      compact.value = (e.target as HTMLInputElement).checked
                      syncShadowHost()
                      scheduleDiagnostics()
                    }}
                  />
                  <span className="label-text">host.props.config.compact</span>
                </label>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <button className="btn btn-primary" onClick={appendTag}>
                  追加 tag
                </button>
                <button className="btn btn-outline" onClick={removeLastTag}>
                  删除最后一个 tag
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    count.value += 2
                    syncShadowHost()
                    scheduleDiagnostics()
                  }}
                >
                  count + 2
                </button>
                <button className="btn btn-ghost" onClick={clearTitleAttr}>
                  移除 title attribute
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card bg-gradient-to-br from-slate-50 via-white to-base-200 shadow-xl border border-base-300 overflow-hidden">
              <div className="card-body gap-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-base-content/45">
                      Live Preview
                    </p>
                    <h2 className="text-2xl font-semibold mt-2">Shadow + Light 双宿主联动</h2>
                  </div>
                  <div className="stats stats-vertical lg:stats-horizontal shadow bg-base-100">
                    <div className="stat py-3 px-4">
                      <div className="stat-title">shadow configureApp</div>
                      <div className="stat-value text-lg">{shadowConfigureRuns.value}</div>
                    </div>
                    <div className="stat py-3 px-4">
                      <div className="stat-title">light configureApp</div>
                      <div className="stat-value text-lg">{lightConfigureRuns.value}</div>
                    </div>
                    <div className="stat py-3 px-4">
                      <div className="stat-title">mounted instances</div>
                      <div className="stat-value text-lg">
                        {shadowMounts.value + lightMounts.value}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <rue-shadow-console ref={shadowHostRef}>
                    <div slot="meta">
                      <span className="status status-success"></span>
                      <span>{metaBadge.value}</span>
                    </div>

                    <div className="space-y-3 text-sm text-base-content/80">
                      <p>{slotNote.value}</p>
                      <div className="flex flex-wrap gap-2">
                        {parseTagInput(tagInput.value).map(tag => (
                          <span key={tag} className="badge badge-outline">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </rue-shadow-console>

                  <rue-light-signal ref={lightHostRef}></rue-light-signal>
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="card bg-base-100 shadow border border-base-300">
                <div className="card-body gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="card-title text-lg">运行时诊断</h3>
                    <span className="badge badge-primary badge-outline">nonce / styles / mode</span>
                  </div>
                  <ul className="list bg-base-100 rounded-box">
                    <li className="list-row">
                      <div className="font-medium">shadow style tags</div>
                      <div className="text-right">{shadowStyleCount.value}</div>
                    </li>
                    <li className="list-row">
                      <div className="font-medium">shadow nonce</div>
                      <div className="text-right break-all">{shadowNonce.value}</div>
                    </li>
                    <li className="list-row">
                      <div className="font-medium">light style tags</div>
                      <div className="text-right">{lightStyleCount.value}</div>
                    </li>
                    <li className="list-row">
                      <div className="font-medium">hook 期望</div>
                      <div className="text-right">shadow / light</div>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="card bg-base-100 shadow border border-base-300">
                <div className="card-body gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="card-title text-lg">事件桥接日志</h3>
                    <button className="btn btn-sm btn-ghost" onClick={clearEvents}>
                      清空
                    </button>
                  </div>
                  <div className="space-y-3 max-h-[320px] overflow-auto pr-1">
                    {eventLog.value.length ? (
                      eventLog.value.map((entry, index) => (
                        <div
                          key={`${entry.name}-${entry.at}-${index}`}
                          className="rounded-2xl border border-base-300 bg-base-200/60 p-3"
                        >
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <span
                                className={`badge ${entry.source === 'shadow' ? 'badge-primary' : 'badge-secondary'} badge-outline`}
                              >
                                {entry.source}
                              </span>
                              <span className="font-medium">{entry.name}</span>
                            </div>
                            <span className="text-base-content/50">{entry.at}</span>
                          </div>
                          <pre className="mt-2 text-xs whitespace-pre-wrap break-words">
                            {entry.detail}
                          </pre>
                        </div>
                      ))
                    ) : (
                      <div className="alert alert-soft">
                        <span>
                          点击自定义元素内部按钮后，这里会收到桥接出来的宿主 CustomEvent。
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="card bg-base-100 shadow border border-base-300">
                <div className="card-body gap-3">
                  <h3 className="card-title text-lg">shadow host.props 快照</h3>
                  <pre className="text-xs whitespace-pre-wrap break-words overflow-auto max-h-[260px] rounded-box bg-base-200 p-4">
                    {formatJson(shadowPropsPayload())}
                  </pre>
                </div>
              </div>

              <div className="card bg-base-100 shadow border border-base-300">
                <div className="card-body gap-3">
                  <h3 className="card-title text-lg">light host.props 快照</h3>
                  <pre className="text-xs whitespace-pre-wrap break-words overflow-auto max-h-[260px] rounded-box bg-base-200 p-4">
                    {formatJson(lightPropsPayload())}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={activeTab.value === 'code' ? 'mt-4' : 'hidden'}>
        <div className="card bg-base-100 shadow overflow-auto h-[420px] md:h-[720px]">
          <div className="card-body p-0">
            <Code className="h-full" lang="tsx" code={demoCode} />
          </div>
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default WebComponents
