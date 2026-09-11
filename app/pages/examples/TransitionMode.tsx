import { type FC, Transition, ref } from '@rue-js/rue'
import SidebarPlayground from '../site/SidebarPlaygroundExample'
import Code from '../site/components/Code'

const TRANSITION_MS = 320
type DemoMode = 'default' | 'out-in' | 'in-out'

const MODE_OPTIONS: Array<{
  value: DemoMode
  label: string
  title: string
  summary: string
  steps: [string, string]
}> = [
  {
    value: 'default',
    label: 'default',
    title: 'default: 同时进入和离开',
    summary: '新面板会立刻渲染，旧面板作为快照同时执行 leave。适合两个状态可以短暂重叠的切换。',
    steps: ['旧面板开始 leave', '新面板同时开始 enter'],
  },
  {
    value: 'out-in',
    label: 'out-in',
    title: 'out-in: 先离开，再进入',
    summary: '旧面板完成 leave 后，新面板才会渲染并 enter。适合需要避免两个状态同时出现的页面。',
    steps: ['旧面板完整 leave', '新面板随后 enter'],
  },
  {
    value: 'in-out',
    label: 'in-out',
    title: 'in-out: 先进入，再离开',
    summary: '新面板先渲染并完成 enter，旧面板再执行 leave。适合希望新内容先接住视线的切换。',
    steps: ['新面板先 enter', '旧面板随后 leave'],
  },
]

const CARDS = [
  {
    id: 'draft',
    title: 'Draft',
    summary: 'Content is still changing and can be replaced safely.',
    tone: 'from-sky-500 to-cyan-400',
  },
  {
    id: 'review',
    title: 'Review',
    summary: 'Compare how each mode schedules this panel against the previous state.',
    tone: 'from-emerald-500 to-teal-400',
  },
  {
    id: 'ship',
    title: 'Ship',
    summary: 'Use keys to make Rue treat each panel as a distinct transition child.',
    tone: 'from-rose-500 to-pink-400',
  },
]

const TransitionCard: FC<{ card: (typeof CARDS)[number] }> = props => (
  <section
    key={props.card.id}
    className={`mode-card bg-gradient-to-br ${props.card.tone} p-6 text-white shadow-lg`}
  >
    <p className="text-sm uppercase tracking-wide opacity-80">state</p>
    <h2 className="mt-2 text-3xl font-semibold">{props.card.title}</h2>
    <p className="mt-3 max-w-md text-sm leading-6 opacity-90">{props.card.summary}</p>
  </section>
)

const transitionModeStyles = `
.mode-stage {
  position: relative;
  min-height: 13rem;
  overflow: hidden;
}

.mode-card {
  min-height: 13rem;
  border-radius: 0.75rem;
  transform-origin: center;
}

.mode-enter-active,
.mode-leave-active {
  transition:
    opacity ${TRANSITION_MS}ms ease,
    transform ${TRANSITION_MS}ms ease;
}

.mode-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.98);
}

.mode-leave-to {
  opacity: 0;
  transform: translateY(-16px) scale(0.98);
}

.mode-leave-active {
  position: absolute;
  inset: 0;
}
`

const transitionModeSource = `import { type FC, Transition, ref } from '@rue-js/rue';

type Mode = 'default' | 'out-in' | 'in-out';

const cards = [
  { id: 'draft', title: 'Draft' },
  { id: 'review', title: 'Review' },
  { id: 'ship', title: 'Ship' },
];

const modes: Mode[] = ['default', 'out-in', 'in-out'];
const modeTips: Record<Mode, string> = {
  default: '旧节点 leave 与新节点 enter 同时开始。',
  'out-in': '旧节点先 leave，结束后新节点 enter。',
  'in-out': '新节点先 enter，结束后旧节点 leave。',
};

const TransitionModeExample: FC = () => {
  const index = ref(0);
  const mode = ref<Mode>('default');
  const current = () => cards[index.value];

  return (
    <>
      {modes.map(nextMode => (
        <button key={nextMode} onClick={() => (mode.value = nextMode)}>
          {nextMode}
        </button>
      ))}
      <button onClick={() => (index.value = (index.value + 1) % cards.length)}>
        Next
      </button>
      <p>{modeTips[mode.value]}</p>

      <Transition name="mode" mode={mode.value} type="transition" duration={320}>
        <section key={current().id}>
          <h2>{current().title}</h2>
        </section>
      </Transition>
    </>
  );
};

export default TransitionModeExample;`

const TransitionModeExample: FC = () => {
  const index = ref(0)
  const mode = ref<DemoMode>('default')
  const activeTab = ref<'preview' | 'code'>('preview')

  const current = () => CARDS[index.value]
  const activeMode = () => MODE_OPTIONS.find(option => option.value === mode.value)!

  const next = () => {
    index.value = (index.value + 1) % CARDS.length
  }

  const previous = () => {
    index.value = (index.value + CARDS.length - 1) % CARDS.length
  }

  return (
    <SidebarPlayground>
      <h1 className="text-5xl font-semibold mb-4 md:mb-4">Transition mode</h1>

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

      <style>{transitionModeStyles}</style>

      <div className="mt-4 grid md:grid-cols-1 gap-6 items-start">
        {activeTab.value === 'code' && (
          <div className="card bg-base-100 shadow overflow-auto h-[360px] md:h-[560px]">
            <Code className="h-full" lang="tsx" code={transitionModeSource} />
          </div>
        )}

        {activeTab.value === 'preview' && (
          <div className="card bg-base-100 shadow">
            <div className="card-body grid gap-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="grid gap-2">
                  <p className="m-0 text-xs font-semibold uppercase tracking-wide opacity-60">
                    mode
                  </p>
                  <div className="join">
                    {MODE_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        className={`btn btn-sm join-item ${mode.value === option.value ? 'btn-primary' : ''}`}
                        onClick={() => {
                          mode.value = option.value
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button className="btn btn-primary" onClick={next}>
                    Next panel
                  </button>
                  <button className="btn" onClick={previous}>
                    Previous
                  </button>
                </div>
              </div>

              <div className="rounded-md border border-base-300 bg-base-200/40 p-4">
                <p className="m-0 font-semibold">{activeMode().title}</p>
                <p className="m-0 mt-2 max-w-2xl text-sm leading-6 opacity-75">
                  {activeMode().summary}
                </p>
                <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                  {activeMode().steps.map((step, stepIndex) => (
                    <div key={step} className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-base-300 text-xs font-semibold">
                        {stepIndex + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mode-stage">
                <Transition
                  name="mode"
                  mode={mode.value}
                  type="transition"
                  duration={TRANSITION_MS}
                >
                  <TransitionCard card={current()} />
                </Transition>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarPlayground>
  )
}

export default TransitionModeExample
