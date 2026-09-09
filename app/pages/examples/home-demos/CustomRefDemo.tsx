import {
  computed,
  customRef,
  type FC,
  ref,
  triggerRef,
  useSetup,
  watch,
  watchEffect,
} from '@rue-js/rue'

const searchItems = [
  'customRef',
  'debounced ref',
  'manual trigger',
  'vapor runtime',
  'watchEffect',
  'shallowRef',
]

const createDebouncedRef = <T,>(initialValue: T, delay = 600) => {
  let value = initialValue
  let timer: ReturnType<typeof setTimeout> | undefined

  return customRef<T>((track, trigger) => ({
    get() {
      track()
      return value
    },
    set(nextValue) {
      if (timer !== undefined) {
        clearTimeout(timer)
      }

      timer = setTimeout(() => {
        value = nextValue
        timer = undefined
        trigger()
      }, delay)
    },
  }))
}

const pushLimitedLog = (
  target: ReturnType<typeof ref<string[]>>,
  buffer: string[],
  entry: string,
) => {
  buffer.unshift(entry)
  target.value = buffer.slice(0, 5)
}

const createCustomRefDemoState = () => {
  const draft = ref('vapor')
  const query = createDebouncedRef('vapor')
  const pending = ref(false)

  watchEffect(() => {
    pending.value = draft.value !== query.value
  })

  let manualValue = 1
  let manualRuns = 0
  const manualInput = ref(1)
  const manualLog = ref<string[]>([])
  const manualBuffer: string[] = []
  const manual = customRef<number>((track, _trigger) => ({
    get() {
      track()
      return manualValue
    },
    set(next) {
      manualValue = next
    },
  }))

  watchEffect(() => {
    const value = manual.value
    manualRuns++
    pushLimitedLog(manualLog, manualBuffer, `effect #${manualRuns} 看到 value = ${value}`)
  })

  const stageManualValue = () => {
    const next = manualInput.value + 1
    manualInput.value = next
    pushLimitedLog(manualLog, manualBuffer, `setter 暂存 ${next}，还没有通知 effect`)
    manual.value = next
  }

  const publishManualValue = () => {
    pushLimitedLog(manualLog, manualBuffer, '调用 triggerRef(manual)，发布暂存值')
    triggerRef(manual)
  }

  let conditionalValue = 1
  let conditionalRuns = 0
  const conditionalTracking = ref(false)
  const conditionalLog = ref<string[]>([])
  const conditionalBuffer: string[] = []
  const conditional = customRef<number>((track, trigger) => ({
    get() {
      if (conditionalTracking.value) {
        track()
      }
      return conditionalValue
    },
    set(next) {
      conditionalValue = next
      trigger()
    },
  }))

  watchEffect(() => {
    const value = conditional.value
    conditionalRuns++
    pushLimitedLog(
      conditionalLog,
      conditionalBuffer,
      `effect #${conditionalRuns} 看到 ${value}（${conditionalTracking.value ? '已 track' : '未 track'}）`,
    )
  })

  const mutateConditionalValue = () => {
    const next = conditionalValue + 1
    pushLimitedLog(conditionalLog, conditionalBuffer, `写入 ${next}，并调用 trigger()`)
    conditional.value = next
  }

  const toggleConditionalTracking = () => {
    conditionalTracking.value = !conditionalTracking.value
    pushLimitedLog(
      conditionalLog,
      conditionalBuffer,
      conditionalTracking.value ? 'track 已开启' : 'track 已关闭',
    )
  }

  let watchedValue = 1
  const watchedDisplay = ref(1)
  const partner = ref('A')
  const watchLog = ref<string[]>([])
  const watchBuffer: string[] = []
  const watched = customRef<number>((track, trigger) => ({
    get() {
      track()
      return watchedValue
    },
    set(next) {
      watchedValue = next
      trigger()
    },
  }))

  watch(watched, (next: number, prev: number) => {
    pushLimitedLog(watchLog, watchBuffer, `watch(customRef) 收到：${prev} -> ${next}`)
  })

  watch([watched, partner], (next: unknown[], prev: unknown[]) => {
    pushLimitedLog(
      watchLog,
      watchBuffer,
      `watch([customRef, ref]) 收到：[${prev.join(', ')}] -> [${next.join(', ')}]`,
    )
  })

  const bumpWatchedValue = () => {
    const next = watchedValue + 1
    watchedDisplay.value = next
    watched.value = next
  }

  const flipWatchPartner = () => {
    partner.value = partner.value === 'A' ? 'B' : 'A'
  }

  return {
    bumpWatchedValue,
    conditionalLog,
    conditionalTracking,
    draft,
    flipWatchPartner,
    manualInput,
    manualLog,
    mutateConditionalValue,
    partner,
    pending,
    publishManualValue,
    query,
    stageManualValue,
    toggleConditionalTracking,
    watchLog,
    watchedDisplay,
  }
}

const LogList: FC<{ items: string[] }> = props => (
  <ul className="menu rounded-box bg-base-200/40">
    {props.items.length ? (
      props.items.map(item => (
        <li key={item}>
          <span>{item}</span>
        </li>
      ))
    ) : (
      <li>
        <span>等待操作</span>
      </li>
    )}
  </ul>
)

const CustomRefDemo: FC = () => {
  const state = useSetup(createCustomRefDemoState)
  const matches = computed<string[]>(() => {
    const normalizedQuery = `${state.query.value}`.trim().toLowerCase()
    return normalizedQuery
      ? searchItems.filter(item => item.toLowerCase().includes(normalizedQuery))
      : searchItems
  })

  const updateDraft = (nextValue: string) => {
    state.draft.value = nextValue
    state.query.value = nextValue
  }

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body gap-6">
        <div className="rounded-box border border-info/30 bg-info/10 p-4 text-sm leading-6 text-base-content/80">
          这个页面把 customRef 拆成四个小实验：先看最常见的防抖输入，再看 setter
          可以只改内部值、什么时候通知由 trigger 决定；后面两个实验展示 getter
          可以决定是否收集依赖，以及 customRef 能作为 watch 的数据源。
        </div>

        <section className="rounded-box border border-base-300 p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">防抖 setter</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-base-content/70">
                输入框的值会立刻变化，但 customRef 的 setter 会等 600ms 后才写入并调用
                trigger，所以匹配结果只按防抖后的值更新。
              </p>
            </div>
            <button
              className="btn btn-sm"
              onClick={() => {
                updateDraft('customRef')
              }}
            >
              使用 customRef
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-base-content/70">搜索关键词</span>
            <input
              className="input input-bordered w-full"
              value={state.draft.value}
              onInput={(event: Event) => {
                updateDraft((event.target as HTMLInputElement).value)
              }}
            />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
              <div className="text-sm text-base-content/60">输入值</div>
              <div className="mt-1 text-xl font-semibold">{state.draft.value || 'empty'}</div>
            </div>
            <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
              <div className="text-sm text-base-content/60">customRef 值</div>
              <div className="mt-1 text-xl font-semibold">{state.query.value || 'empty'}</div>
            </div>
            <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
              <div className="text-sm text-base-content/60">状态</div>
              <div
                className={`badge mt-2 ${state.pending.value ? 'badge-warning' : 'badge-success'}`}
              >
                {state.pending.value ? '等待提交' : '已同步'}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium text-base-content/70">匹配结果</h3>
            <ul className="menu rounded-box bg-base-200/40">
              {matches.get().length ? (
                matches.get().map(item => (
                  <li key={item}>
                    <span>{item}</span>
                  </li>
                ))
              ) : (
                <li>
                  <span>没有匹配结果</span>
                </li>
              )}
            </ul>
          </div>
        </section>

        <section className="rounded-box border border-base-300 p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">手动 triggerRef</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-base-content/70">
                这里的 setter 只把新值暂存在闭包里，不会自动通知 effect。先点“仅运行
                setter”会看到暂存值变了，但日志里的 effect 不会变；再点 triggerRef 才会发布。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-sm btn-outline" onClick={state.stageManualValue}>
                仅运行 setter
              </button>
              <button className="btn btn-sm btn-primary" onClick={state.publishManualValue}>
                发布 triggerRef
              </button>
            </div>
          </div>

          <div className="mb-3 rounded-box border border-base-300 bg-base-200/40 p-4">
            <div className="text-sm text-base-content/60">暂存值</div>
            <div className="mt-1 text-xl font-semibold">{state.manualInput.value}</div>
          </div>
          <LogList items={state.manualLog.value} />
        </section>

        <section className="rounded-box border border-base-300 p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">条件 track</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-base-content/70">
                getter 可以自己决定是否调用 track。未开启 track 时，即使 setter 调用了
                trigger，也没有订阅者会被唤醒；开启后，下一次写入才会触发 effect 日志。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-sm btn-outline" onClick={state.toggleConditionalTracking}>
                {state.conditionalTracking.value ? '关闭 track' : '开启 track'}
              </button>
              <button className="btn btn-sm btn-primary" onClick={state.mutateConditionalValue}>
                写入并 trigger
              </button>
            </div>
          </div>
          <LogList items={state.conditionalLog.value} />
        </section>

        <section className="rounded-box border border-base-300 p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">watch source</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-base-content/70">
                customRef 带 ref 标记，所以可以直接作为 watch 的 source，也可以和普通 ref
                一起放进数组 source。下面的日志会分别记录这两种 watch 的回调。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-sm btn-primary" onClick={state.bumpWatchedValue}>
                更新 customRef
              </button>
              <button className="btn btn-sm btn-outline" onClick={state.flipWatchPartner}>
                切换搭档 {state.partner.value}
              </button>
            </div>
          </div>

          <div className="mb-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
              <div className="text-sm text-base-content/60">customRef 数据源</div>
              <div className="mt-1 text-xl font-semibold">{state.watchedDisplay.value}</div>
            </div>
            <div className="rounded-box border border-base-300 bg-base-200/40 p-4">
              <div className="text-sm text-base-content/60">数组 source 搭档</div>
              <div className="mt-1 text-xl font-semibold">{state.partner.value}</div>
            </div>
          </div>
          <LogList items={state.watchLog.value} />
        </section>
      </div>
    </div>
  )
}

export default CustomRefDemo
