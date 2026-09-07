import { ref, setReactiveScheduling, type FC } from '@rue-js/rue'

setReactiveScheduling('sync')

type ScenarioName =
  | 'textUpdate'
  | 'singleRootBranch'
  | 'nullableMultiRoot'
  | 'compiledComponentSlot'

type Measurement = {
  cpuMs: number
  mutations: number
  nodeCount: number
  commentNodes: number
  effectRuns: number
}

declare global {
  interface Window {
    __RUE_ANCHOR_TIERING__?: {
      scenarios: ScenarioName[]
      measure: (scenario: ScenarioName) => Measurement
    }
  }
}

const iterations = 500
const text = ref(0)
const branch = ref(0)
const nullable = ref(0)
const componentSlot = ref(0)
const effectRuns: Record<ScenarioName, number> = {
  textUpdate: 0,
  singleRootBranch: 0,
  nullableMultiRoot: 0,
  compiledComponentSlot: 0,
}

const read = (scenario: ScenarioName, value: number) => {
  effectRuns[scenario] += 1
  return value
}

const Leaf: FC<{ label: string }> = props => <span data-leaf="a">{props.label}</span>
const AlternateLeaf: FC<{ label: string }> = props => <em data-leaf="b">{props.label}</em>
const Frame: FC = props => <section data-frame>{props.children}</section>

const Fixture: FC = () => (
  <div id="fixture">
    <section data-scenario="textUpdate">{text.value}</section>
    <section data-scenario="singleRootBranch">
      {read('singleRootBranch', branch.value) % 2 === 0 ? <span>left</span> : <em>right</em>}
    </section>
    <section data-scenario="nullableMultiRoot">
      {read('nullableMultiRoot', nullable.value) % 3 === 0 ? null : nullable.value % 2 === 0 ? (
        <>
          <b>two</b>
          <i>roots</i>
        </>
      ) : (
        <>
          <u>other</u>
          <strong>roots</strong>
        </>
      )}
    </section>
    <section data-scenario="compiledComponentSlot">
      <Frame>
        {read('compiledComponentSlot', componentSlot.value) % 2 === 0 ? (
          <Leaf label="leaf-a" />
        ) : (
          <AlternateLeaf label="leaf-b" />
        )}
      </Frame>
    </section>
  </div>
)

const root = document.querySelector('#app')
if (!root) throw new Error('Missing #app benchmark container')
const handle = Fixture({}) as unknown as { __rue_compiled_mount: (parent: Element) => Node }
root.appendChild(handle.__rue_compiled_mount(root))

const sources: Record<ScenarioName, { value: number }> = {
  textUpdate: text,
  singleRootBranch: branch,
  nullableMultiRoot: nullable,
  compiledComponentSlot: componentSlot,
}
const scenarios = Object.keys(sources) as ScenarioName[]

window.__RUE_ANCHOR_TIERING__ = {
  scenarios,
  measure(scenario) {
    const scenarioRoot = document.querySelector(`[data-scenario="${scenario}"]`)!
    const observer = new MutationObserver(() => {})
    observer.observe(scenarioRoot, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    })
    effectRuns[scenario] = 0
    const startedAt = performance.now()
    for (let index = 0; index < iterations; index += 1) sources[scenario].value += 1
    const cpuMs = (performance.now() - startedAt) / iterations
    const mutations = observer.takeRecords().length / iterations
    observer.disconnect()

    const walker = document.createTreeWalker(scenarioRoot, NodeFilter.SHOW_ALL)
    let nodeCount = 0
    let commentNodes = 0
    while (walker.nextNode()) {
      nodeCount += 1
      if (walker.currentNode.nodeType === Node.COMMENT_NODE) commentNodes += 1
    }
    return {
      cpuMs,
      mutations,
      nodeCount,
      commentNodes,
      effectRuns: effectRuns[scenario] / iterations,
    }
  },
}
