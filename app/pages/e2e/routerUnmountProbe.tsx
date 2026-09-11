import { type FC, onBeforeUnmount, onMounted, onUnmounted, ref } from '@rue-js/rue'

type ProbeKey =
  | 'aMounted'
  | 'aBeforeUnmount'
  | 'aUnmounted'
  | 'bMounted'
  | 'bBeforeUnmount'
  | 'bUnmounted'

const ensureProbeState = () => {
  const scope = globalThis as typeof globalThis & {
    __rueRouterUnmountProbe__?: {
      counts: Record<ProbeKey, number>
      logs: string[]
    }
  }

  if (!scope.__rueRouterUnmountProbe__) {
    scope.__rueRouterUnmountProbe__ = {
      counts: {
        aMounted: 0,
        aBeforeUnmount: 0,
        aUnmounted: 0,
        bMounted: 0,
        bBeforeUnmount: 0,
        bUnmounted: 0,
      },
      logs: [],
    }
  }

  return scope.__rueRouterUnmountProbe__
}

const probeState = ensureProbeState()
const probeVersion = ref(0)

const syncProbeSnapshot = () => {
  const scope = globalThis as typeof globalThis & {
    __rueRouterUnmountProbe__?: {
      counts: Record<ProbeKey, number>
      logs: string[]
    }
  }

  scope.__rueRouterUnmountProbe__ = {
    counts: { ...probeState.counts },
    logs: [...probeState.logs],
  }
  probeVersion.value += 1
}

const writeProbe = (key: ProbeKey, label: string) => {
  probeState.counts[key] += 1
  probeState.logs = [
    `${new Date().toLocaleTimeString()} ${label}#${probeState.counts[key]}`,
    ...probeState.logs,
  ].slice(0, 8)
  syncProbeSnapshot()
}

const resetProbe = () => {
  probeState.counts = {
    aMounted: 0,
    aBeforeUnmount: 0,
    aUnmounted: 0,
    bMounted: 0,
    bBeforeUnmount: 0,
    bUnmounted: 0,
  }
  probeState.logs = []
  syncProbeSnapshot()
}

const ProbeMetric: FC<{
  metric: [ProbeKey, string, string]
  version: number
}> = props => {
  const [key, label, tone] = props.metric
  return (
    <div key={key} className="rounded-box border border-base-300 bg-base-200/60 p-4">
      <div className="text-sm text-base-content/60">{label}</div>
      <div className={`text-3xl font-semibold ${tone}`}>
        {props.version >= 0 ? probeState.counts[key] : 0}
      </div>
    </div>
  )
}

const ProbePanel: FC<{
  currentRoute: string
  nextTo: string
  nextLabel: string
}> = props => {
  const metrics: Array<[ProbeKey, string, string]> = [
    ['aMounted', 'A mounted', 'text-primary'],
    ['aBeforeUnmount', 'A beforeUnmount', 'text-warning'],
    ['aUnmounted', 'A onUnmounted', 'text-success'],
    ['bMounted', 'B mounted', 'text-primary'],
    ['bBeforeUnmount', 'B beforeUnmount', 'text-warning'],
    ['bUnmounted', 'B onUnmounted', 'text-success'],
  ]
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-6">
      <div className="card border border-base-300 bg-base-100 shadow-sm">
        <div className="card-body gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="card-title text-2xl">Hash 路由卸载探针 {props.currentRoute}</h1>
              <p className="text-sm text-base-content/70">切换 hash 路由后观察组件卸载计数。</p>
            </div>
            <div className="join">
              <button className="btn join-item btn-outline btn-sm" onClick={resetProbe}>
                重置探针
              </button>
              <a className="btn join-item btn-primary btn-sm" href={`#${props.nextTo}`}>
                {props.nextLabel}
              </a>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {metrics.map(metric => (
              <ProbeMetric key={metric[0]} metric={metric} version={probeVersion.value} />
            ))}
          </div>
          <div className="mockup-code text-sm">
            <pre data-prefix="$">
              <code>当前 hash 路由: {props.currentRoute}</code>
            </pre>
          </div>
          <ul className="list rounded-box border border-base-300 bg-base-100">
            {probeState.logs.length ? (
              probeState.logs.map(line => <li className="list-row font-mono text-xs">{line}</li>)
            ) : (
              <li className="list-row text-sm text-base-content/60">暂无日志，先点一次切路由。</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
export const RouterUnmountProbeA: FC = () => {
  onMounted(() => {
    writeProbe('aMounted', 'A mounted')
  })
  onBeforeUnmount(() => {
    writeProbe('aBeforeUnmount', 'A beforeUnmount')
  })
  onUnmounted(() => {
    writeProbe('aUnmounted', 'A onUnmounted')
  })

  return (
    <ProbePanel
      currentRoute="/e2e/router-unmount-a"
      nextTo="/e2e/router-unmount-b"
      nextLabel="跳到 B"
    />
  )
}

export const RouterUnmountProbeB: FC = () => {
  onMounted(() => {
    writeProbe('bMounted', 'B mounted')
  })
  onBeforeUnmount(() => {
    writeProbe('bBeforeUnmount', 'B beforeUnmount')
  })
  onUnmounted(() => {
    writeProbe('bUnmounted', 'B onUnmounted')
  })

  return (
    <ProbePanel
      currentRoute="/e2e/router-unmount-b"
      nextTo="/e2e/router-unmount-a"
      nextLabel="跳到 A"
    />
  )
}
