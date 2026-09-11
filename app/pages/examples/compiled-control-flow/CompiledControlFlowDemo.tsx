import { onCleanup, ref, signal as compiledSignal, type FC } from '@rue-js/rue'
import SidebarPlayground from '../../site/SidebarPlaygroundExample'

type RegionName = 'entry' | 'middle' | 'final'

const regionRuns = compiledSignal({ entry: 0, middle: 0, final: 0, total: 0 })
const regionControls: Record<number, () => void> = { 0: () => {}, 1: () => {}, 2: () => {} }

const beginRegion = (region: RegionName) => {
  let setupId = 0
  regionRuns.update(previous => {
    setupId = previous.total + 1
    return { ...previous, [region]: previous[region] + 1, total: setupId }
  })
  console.info(`[compiled-control-flow] ${region} setup region #${setupId}`)
  onCleanup(() => console.info(`[compiled-control-flow] ${region} setup region cleanup`))
  return setupId
}

const CompiledBranchCard: FC<{ label: string; mode: number }> = props => {
  beginRegion('entry')
  const bumpEntryValue = (value: number) => value + 1
  const entryCompiled = compiledSignal(1)
  const entryRef = ref(10)
  let entryStep = 0
  regionControls[0] = () => {
    if (entryStep === 0) entryCompiled.update(bumpEntryValue)
    else entryRef.value += 10
    entryStep += 1
  }

  if (props.mode === 0 && entryCompiled.get() === 1 && entryRef.value === 10)
    return (
      <div
        className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-950"
        data-branch="a"
        data-state="initial"
      >
        A initial · {props.label}
      </div>
    )
  if (props.mode === 0 && entryRef.value === 10)
    return (
      <div
        className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-950"
        data-branch="a"
        data-state="compiled"
      >
        A compiled signal changed · {props.label}
      </div>
    )
  if (props.mode === 0)
    return (
      <div
        className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-emerald-950"
        data-branch="a"
        data-state="changed"
      >
        A Rue ref changed · {props.label}
      </div>
    )

  beginRegion('middle')
  function bumpMiddleValue(value: number) {
    return value + 1
  }
  const middleCompiled = compiledSignal(2)
  const middleRef = ref(20)
  regionControls[1] = () => {
    middleCompiled.update(bumpMiddleValue)
    middleRef.value += 10
  }

  if (props.mode === 1 && middleCompiled.get() === 2 && middleRef.value === 20)
    return (
      <section
        className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950"
        data-branch="b"
        data-state="initial"
      >
        B initial · {props.label}
      </section>
    )
  if (props.mode === 1)
    return (
      <section
        className="rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950"
        data-branch="b"
        data-state="changed"
      >
        B state retained · {props.label}
      </section>
    )

  beginRegion('final')
  const bumpFinalValue = (value: number) => value + 1
  const finalCompiled = compiledSignal(3)
  const finalRef = ref(30)
  regionControls[2] = () => {
    finalCompiled.update(bumpFinalValue)
    finalRef.value += 10
  }

  if (finalCompiled.get() === 3 && finalRef.value === 30)
    return (
      <article
        className="rounded-2xl border border-violet-300 bg-violet-50 p-6 text-violet-950"
        data-branch="c"
        data-state="initial"
      >
        C initial · {props.label}
      </article>
    )
  return (
    <article
      className="rounded-2xl border border-violet-300 bg-violet-50 p-6 text-violet-950"
      data-branch="c"
      data-state="changed"
    >
      C state retained · {props.label}
    </article>
  )
}

const source = `const CompiledBranchCard = props => {
  const entrySetupId = beginRegion('entry')
  const entryPrefix = 'entry'
  const entrySuffix = 'state'
  const bumpEntryValue = value => value + 1
  const entryCompiled = compiledSignal(1)
  const entryRef = ref(10)
  let entryStep = 0
  regionControls[0] = () => {
    if (entryStep === 0) entryCompiled.update(bumpEntryValue)
    else entryRef.value += 10
    entryStep += 1
  }

  if (props.mode === 0 && entryCompiled.get() === 1 && entryRef.value === 10)
    return <div>A initial · {props.label}</div>
  if (props.mode === 0 && entryRef.value === 10)
    return <div>A compiled signal changed · {props.label}</div>
  if (props.mode === 0) return <div>A Rue ref changed · {props.label}</div>

  const middleSetupId = beginRegion('middle')
  const hello = 'hello'
  const middleSuffix = 'region'
  function bumpMiddleValue(value) { return value + 1 }
  const middleCompiled = compiledSignal(2)
  const middleRef = ref(20)
  regionControls[1] = () => {
    middleCompiled.update(bumpMiddleValue)
    middleRef.value += 10
  }
  if (props.mode === 1 && middleCompiled.get() === 2 && middleRef.value === 20)
    return <section>B initial · {props.label}</section>
  if (props.mode === 1) return <section>B state retained · {props.label}</section>

  const finalSetupId = beginRegion('final')
  const world = 'world'
  const finalSuffix = 'region'
  const bumpFinalValue = value => value + 1
  const finalCompiled = compiledSignal(3)
  const finalRef = ref(30)
  regionControls[2] = () => {
    finalCompiled.update(bumpFinalValue)
    finalRef.value += 10
  }
  if (finalCompiled.get() === 3 && finalRef.value === 30)
    return <article>C initial · {props.label}</article>
  return <article>C state retained · {props.label}</article>
}`

const CompiledControlFlowDemo: FC = () => {
  const branchState = compiledSignal({ label: '首次挂载', mode: 0, updates: 0 })

  const selectMode = (nextMode: number) => {
    branchState.update(previous => ({
      label: `父级属性更新 #${previous.updates + 1}`,
      mode: nextMode,
      updates: previous.updates + 1,
    }))
  }
  const updateCurrentRegion = () => regionControls[branchState.peek().mode]()

  return (
    <SidebarPlayground>
      <div className="mx-auto max-w-5xl py-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              Experimental Compiler Demo
            </div>
            <h1 className="mt-2 text-4xl font-semibold text-base-content">
              Compiled setup regions
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-base-content/70">
              入口、中段和末段 region 首次可达时分别初始化；离开后缓存保留，compiled signal 与普通
              Rue ref 继续直接驱动控制流 DOM。
            </p>
          </div>
          <div className="rounded-2xl border border-primary/25 bg-primary/10 px-5 py-3 text-sm text-primary">
            {`region setup 次数：入口 ${regionRuns.get().entry} / 中段 ${regionRuns.get().middle} / 末段 ${regionRuns.get().final}`}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
          <div className="rounded-3xl border border-base-300 bg-base-100 p-6 shadow-sm">
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-success" onClick={() => selectMode(0)}>
                显示 A
              </button>
              <button className="btn btn-warning" onClick={() => selectMode(1)}>
                显示 B
              </button>
              <button className="btn btn-secondary" onClick={() => selectMode(2)}>
                显示 C
              </button>
              <button className="btn btn-outline" onClick={updateCurrentRegion}>
                修改当前 region 状态
              </button>
            </div>

            <div className="mt-6">
              <CompiledBranchCard mode={branchState.get().mode} label={branchState.get().label} />
            </div>

            <div className="mt-5 rounded-xl bg-base-200 px-4 py-3 text-sm text-base-content/70">
              先修改 A，再切换到 B/C 并修改，最后返回旧分支：状态文本会保留，顶部每个 region 的
              setup 次数仍为 1。
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-slate-100 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Supported Shape
            </div>
            <pre className="mt-4 overflow-x-auto whitespace-pre-wrap text-sm leading-6">
              <code>{source}</code>
            </pre>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-warning/40 bg-warning/10 p-5 text-sm leading-6 text-base-content/80">
          当前边界：仅分析顶层 early-return 可达区域；循环、switch、try/catch
          等任意嵌套区域分析不在本示例支持范围内。依赖 props 的实时派生表达式不会冻结为 setup 快照。
        </div>
      </div>
    </SidebarPlayground>
  )
}

export default CompiledControlFlowDemo
