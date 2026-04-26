import { type FC, onBeforeUnmount, onMounted, onUnmounted, ref, vapor, watchEffect } from '@rue-js/rue'

type ProbeKey = 'aMounted' | 'aBeforeUnmount' | 'aUnmounted' | 'bMounted' | 'bBeforeUnmount' | 'bUnmounted'

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

const ProbePanel: FC<{
  currentRoute: string
  nextTo: string
  nextLabel: string
}> = props =>
  vapor(() => {
    const root = document.createElement('div')
    root.className = 'mx-auto flex w-full max-w-3xl flex-col gap-5 p-6'

    const card = document.createElement('div')
    card.className = 'card border border-base-300 bg-base-100 shadow-sm'

    const body = document.createElement('div')
    body.className = 'card-body gap-4'

    const header = document.createElement('div')
    header.className = 'flex flex-wrap items-center justify-between gap-3'

    const intro = document.createElement('div')
    const title = document.createElement('h1')
    title.className = 'card-title text-2xl'
    title.textContent = `Hash 路由卸载探针 ${props.currentRoute}`
    const desc = document.createElement('p')
    desc.className = 'text-sm text-base-content/70'
    desc.textContent = '当前页是 route 组件本身。点击切到另一条 hash 路由后，观察对侧页面里的卸载计数。'
    intro.appendChild(title)
    intro.appendChild(desc)

    const actions = document.createElement('div')
    actions.className = 'join'

    const resetButton = document.createElement('button')
    resetButton.className = 'btn join-item btn-outline btn-sm'
    resetButton.textContent = '重置探针'
    resetButton.onclick = () => {
      resetProbe()
    }

    const nextLink = document.createElement('a')
    nextLink.className = 'btn join-item btn-primary btn-sm'
    nextLink.href = `#${props.nextTo}`
    nextLink.textContent = props.nextLabel

    actions.appendChild(resetButton)
    actions.appendChild(nextLink)
    header.appendChild(intro)
    header.appendChild(actions)

    const stats = document.createElement('div')
    stats.className = 'grid gap-3 md:grid-cols-2 xl:grid-cols-3'

    const createMetric = (label: string, valueClassName: string) => {
      const item = document.createElement('div')
      item.className = 'rounded-box border border-base-300 bg-base-200/60 p-4'
      const labelEl = document.createElement('div')
      labelEl.className = 'text-sm text-base-content/60'
      labelEl.textContent = label
      const valueEl = document.createElement('div')
      valueEl.className = valueClassName
      item.appendChild(labelEl)
      item.appendChild(valueEl)
      stats.appendChild(item)
      return valueEl
    }

    const metricEls = {
      aMounted: createMetric('A mounted', 'text-3xl font-semibold text-primary'),
      aBeforeUnmount: createMetric('A beforeUnmount', 'text-3xl font-semibold text-warning'),
      aUnmounted: createMetric('A onUnmounted', 'text-3xl font-semibold text-success'),
      bMounted: createMetric('B mounted', 'text-3xl font-semibold text-primary'),
      bBeforeUnmount: createMetric('B beforeUnmount', 'text-3xl font-semibold text-warning'),
      bUnmounted: createMetric('B onUnmounted', 'text-3xl font-semibold text-success'),
    }

    const codeBox = document.createElement('div')
    codeBox.className = 'mockup-code text-sm'
    const createCodeLine = (text: string) => {
      const pre = document.createElement('pre')
      pre.setAttribute('data-prefix', '$')
      const code = document.createElement('code')
      code.textContent = text
      pre.appendChild(code)
      codeBox.appendChild(pre)
    }
    createCodeLine(`当前 hash 路由: ${props.currentRoute}`)
    createCodeLine('预期: A 跳到 B 后，A onUnmounted 至少变为 1')
    createCodeLine('全局状态: window.__rueRouterUnmountProbe__')

    const logList = document.createElement('ul')
    logList.className = 'list rounded-box border border-base-300 bg-base-100'

    const renderLogs = (logs: string[]) => {
      logList.replaceChildren()

      if (!logs.length) {
        const empty = document.createElement('li')
        empty.className = 'list-row text-sm text-base-content/60'
        empty.textContent = '暂无日志，先点一次切路由。'
        logList.appendChild(empty)
        return
      }

      logs.forEach(line => {
        const item = document.createElement('li')
        item.className = 'list-row font-mono text-xs'
        item.textContent = line
        logList.appendChild(item)
      })
    }

    body.appendChild(header)
    body.appendChild(stats)
    body.appendChild(codeBox)
    body.appendChild(logList)
    card.appendChild(body)
    root.appendChild(card)

    const stop = watchEffect(() => {
      void probeVersion.value
      const counts = probeState.counts

      metricEls.aMounted.textContent = String(counts.aMounted)
      metricEls.aBeforeUnmount.textContent = String(counts.aBeforeUnmount)
      metricEls.aUnmounted.textContent = String(counts.aUnmounted)
      metricEls.bMounted.textContent = String(counts.bMounted)
      metricEls.bBeforeUnmount.textContent = String(counts.bBeforeUnmount)
      metricEls.bUnmounted.textContent = String(counts.bUnmounted)
      renderLogs(probeState.logs)
    })

    onBeforeUnmount(() => {
      stop.dispose()
    })

    return root
  })

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

  return <ProbePanel currentRoute="/e2e/router-unmount-a" nextTo="/e2e/router-unmount-b" nextLabel="跳到 B" />
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

  return <ProbePanel currentRoute="/e2e/router-unmount-b" nextTo="/e2e/router-unmount-a" nextLabel="跳到 A" />
}
