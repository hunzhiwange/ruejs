import {
  computed,
  createContext,
  Slot,
  Template,
  type FC,
  ref,
  useContext,
  useCustomElement,
  useEmit,
  useHost,
  useShadowRoot,
} from '@rue-js/rue'
import { provideContext } from '@rue-js/rue/internal/app'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'
import labSource from './WebComponentFeatureLab.tsx?raw'

type FeatureId = 'shadow' | 'light' | 'slots' | 'events' | 'context'
type LabEvent = {
  type: string
  detail: string
}
type ScopedBadgeProps = {
  channel: string
  count: number
}

const LAB_CONTEXT = createContext('lab:fallback')

const LabContextProvider: FC<{ value: string; children?: any }> = props => {
  provideContext(LAB_CONTEXT, () => props.value)
  return <>{props.children}</>
}

const LAB_TAGS = {
  shadow: 'rue-lab-shadow-probe',
  light: 'rue-lab-light-probe',
  slots: 'rue-lab-slot-probe',
  events: 'rue-lab-event-probe',
  context: 'rue-lab-context-probe',
}

const featureTabs: Array<{ id: FeatureId; title: string; badge: string }> = [
  { id: 'shadow', title: 'Shadow Root', badge: 'styles' },
  { id: 'light', title: 'Light DOM Props', badge: 'props' },
  { id: 'slots', title: 'Native Slots', badge: 'slot' },
  { id: 'events', title: 'Event Bridge', badge: 'emit' },
  { id: 'context', title: 'Context + Scoped Slot', badge: 'context' },
]

const shadowStyles = [
  `
    :host {
      display: block;
      color: #e2e8f0;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .shadowBox {
      min-height: 190px;
      display: grid;
      gap: 14px;
      align-content: center;
      border: 1px solid rgba(148, 163, 184, 0.26);
      border-radius: 18px;
      padding: 20px;
      background:
        radial-gradient(circle at top right, rgba(56, 189, 248, 0.22), transparent 38%),
        linear-gradient(135deg, #0f172a, #111827);
      box-shadow: 0 18px 36px rgba(15, 23, 42, 0.22);
    }

    .shadowTitle {
      margin: 0;
      font-size: 24px;
      line-height: 1.1;
      font-weight: 800;
      color: white;
    }

    .shadowMeta {
      margin: 0;
      font-size: 13px;
      color: rgba(226, 232, 240, 0.78);
    }

    .shadowCount {
      width: max-content;
      border-radius: 999px;
      background: #38bdf8;
      color: #082f49;
      padding: 6px 12px;
      font-size: 13px;
      font-weight: 700;
    }
  `,
]

const lightStyles = [
  `
    .lightBox {
      min-height: 160px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      border: 1px solid hsl(var(--bc) / 0.12);
      border-radius: 16px;
      padding: 18px;
      background: hsl(var(--b1));
    }

    .lightTitle {
      margin: 0;
      font-weight: 800;
      font-size: 20px;
    }

    .lightMeta {
      margin: 4px 0 0;
      color: hsl(var(--bc) / 0.62);
      font-size: 13px;
    }

    .lightCount {
      min-width: 72px;
      text-align: center;
      border-radius: 14px;
      padding: 10px 12px;
      background: hsl(var(--p) / 0.12);
      color: hsl(var(--p));
      font-size: 28px;
      font-weight: 800;
    }
  `,
]

const ShadowProbe: FC<Record<string, unknown>> = props => {
  const host = useHost()
  const shadowRoot = useShadowRoot()
  const title = String(props.title ?? 'Shadow probe')
  const count = Number(props.count ?? 0)

  return (
    <section className="shadowBox" data-testid="lab-shadow-box">
      <div>
        <p className="shadowTitle">{title}</p>
        <p className="shadowMeta" data-testid="lab-shadow-mode">
          {host?.tagName.toLowerCase() ?? 'no-host'} / {shadowRoot ? 'shadow' : 'light'}
        </p>
      </div>
      <div className="shadowCount" data-testid="lab-shadow-count">
        count {count}
      </div>
    </section>
  )
}

const LightProbe: FC<Record<string, unknown>> = props => {
  const title = String(props.title ?? 'Light probe')
  const count = Number(props.count ?? 0)

  return (
    <section className="lightBox" data-testid="lab-light-box">
      <div>
        <p className="lightTitle">{title}</p>
        <p className="lightMeta">shadowRoot disabled</p>
      </div>
      <div className="lightCount" data-testid="lab-light-count">
        {count}
      </div>
    </section>
  )
}

const NativeSlotProbe: FC = () => (
  <section className="rounded-box border border-base-300 bg-base-100 p-5 shadow-sm">
    <header className="border-b border-base-300 pb-3">
      <slot name="header"></slot>
    </header>
    <main className="pt-4 text-sm text-base-content/75">
      <slot></slot>
    </main>
  </section>
)

const EventProbe: FC<Record<string, unknown>> = props => {
  const emit = useEmit(props as any)
  const count = Number(props.count ?? 0)

  return (
    <button
      type="button"
      className="btn btn-primary"
      data-testid="lab-event-button"
      onClick={() => {
        emit('confirm', { count, source: 'custom-element' })
      }}
    >
      emit confirm
    </button>
  )
}

const ContextProbe: FC<Record<string, unknown>> = props => {
  const channel = computed(() => useContext(LAB_CONTEXT))
  const count = Number(props.count ?? 0)

  return (
    <section className="rounded-box border border-base-300 bg-base-100 p-5 shadow-sm">
      <p className="font-mono text-sm" data-testid="lab-context-value">
        {channel.value}
      </p>
      <div className="mt-4">
        <Slot source={props} name="badge" props={{ channel: channel.value, count }}>
          <span className="badge badge-outline" data-testid="lab-scoped-fallback">
            fallback badge
          </span>
        </Slot>
      </div>
    </section>
  )
}

const ShadowElement = useCustomElement(ShadowProbe, {
  styles: shadowStyles,
  nonce: 'rue-lab-nonce',
})

const LightElement = useCustomElement(LightProbe, {
  shadowRoot: false,
  styles: lightStyles,
})

const SlotElement = useCustomElement(NativeSlotProbe)
const EventElement = useCustomElement(EventProbe)
const ContextElement = useCustomElement(ContextProbe, { shadowRoot: false })

const registerLabElement = (tag: string, ctor: CustomElementConstructor) => {
  if (typeof customElements === 'undefined') {
    return
  }
  if (!customElements.get(tag)) {
    customElements.define(tag, ctor)
  }
}

registerLabElement(LAB_TAGS.shadow, ShadowElement)
registerLabElement(LAB_TAGS.light, LightElement)
registerLabElement(LAB_TAGS.slots, SlotElement)
registerLabElement(LAB_TAGS.events, EventElement)
registerLabElement(LAB_TAGS.context, ContextElement)

const formatDetail = (value: unknown) => {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const WebComponentFeatureLab: FC = () => {
  const activeTab = ref<'preview' | 'code'>('preview')
  const active = ref<FeatureId>('shadow')
  const title = ref('Rue CE probe')
  const count = ref(3)
  const channel = ref('outer:lab')
  const eventLog = ref<LabEvent[]>([])

  const pushEvent = (event: Event) => {
    const customEvent = event as CustomEvent
    eventLog.value = [
      {
        type: event.type,
        detail: formatDetail(customEvent.detail),
      },
      ...eventLog.value,
    ].slice(0, 3)
  }

  const renderPanel = () => {
    if (active.value === 'shadow') {
      return (
        <section data-testid="lab-panel-shadow" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-sm"
              onClick={() => {
                count.value += 1
              }}
            >
              count +1
            </button>
            <button
              className="btn btn-sm"
              onClick={() => {
                title.value = title.value === 'Rue CE probe' ? 'Shadow updated' : 'Rue CE probe'
              }}
            >
              title
            </button>
          </div>
          <rue-lab-shadow-probe props={{ title: title.value, count: count.value }} />
        </section>
      )
    }

    if (active.value === 'light') {
      return (
        <section data-testid="lab-panel-light" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-sm"
              onClick={() => {
                count.value += 2
              }}
            >
              count +2
            </button>
          </div>
          <rue-lab-light-probe props={{ title: title.value, count: count.value }} />
        </section>
      )
    }

    if (active.value === 'slots') {
      return (
        <section data-testid="lab-panel-slots" className="space-y-4">
          <rue-lab-slot-probe>
            <strong slot="header" data-testid="lab-native-header">
              Native slot header
            </strong>
            <span data-testid="lab-native-body">Native default body</span>
          </rue-lab-slot-probe>
        </section>
      )
    }

    if (active.value === 'events') {
      return (
        <section data-testid="lab-panel-events" className="space-y-4">
          <rue-lab-event-probe props={{ count: count.value }} onConfirm={pushEvent as any} />
          <div className="rounded-box border border-base-300 bg-base-100 p-4">
            <div className="font-mono text-sm" data-testid="lab-event-log">
              {eventLog.value[0]?.type ?? 'waiting'}
              {eventLog.value[0] ? ` ${eventLog.value[0].detail}` : ''}
            </div>
          </div>
        </section>
      )
    }

    return (
      <section data-testid="lab-panel-context" className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-sm"
            onClick={() => {
              channel.value = channel.value === 'outer:lab' ? 'outer:updated' : 'outer:lab'
            }}
          >
            channel
          </button>
        </div>
        <LabContextProvider value={channel.value}>
          <rue-lab-context-probe props={{ count: count.value }}>
            <Template slot="badge">
              {
                (({ channel, count }: ScopedBadgeProps) => (
                  <span className="badge badge-primary" data-testid="lab-scoped-badge">
                    {channel} / {count}
                  </span>
                )) as any
              }
            </Template>
          </rue-lab-context-probe>
        </LabContextProvider>
      </section>
    )
  }

  return (
    <SidebarPlayground>
      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-base-content/50">
              Custom Elements Lab
            </p>
            <h1 className="mt-2 text-4xl font-semibold">Web Components 分项测试</h1>
          </div>
          {activeTab.value === 'preview' && (
            <div className="stats shadow bg-base-100">
              <div className="stat py-3">
                <div className="stat-title">active</div>
                <div className="stat-value text-lg">{active.value}</div>
              </div>
            </div>
          )}
        </div>

        <div role="tablist" className="tabs tabs-box">
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

        {activeTab.value === 'code' ? (
          <div className="card bg-base-100 shadow overflow-auto">
            <div className="card-body p-0">
              <Code className="h-full" lang="tsx" code={labSource} title="完整可复制示例" />
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <nav className="rounded-box border border-base-300 bg-base-100 p-3 shadow-sm">
              <div className="space-y-2">
                {featureTabs.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={`btn w-full justify-between ${
                      active.value === item.id ? 'btn-primary' : 'btn-ghost'
                    }`}
                    onClick={() => {
                      active.value = item.id
                    }}
                  >
                    <span>{item.title}</span>
                    <span className="badge badge-sm">{item.badge}</span>
                  </button>
                ))}
              </div>
            </nav>

            <div className="rounded-box border border-base-300 bg-base-200/40 p-4 md:p-6">
              {renderPanel()}
            </div>
          </div>
        )}
      </section>
    </SidebarPlayground>
  )
}

export default WebComponentFeatureLab
