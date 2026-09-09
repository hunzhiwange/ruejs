import { afterEach, describe, expect, it } from 'vitest'

import {
  computed,
  effect,
  ref,
  render,
  renderAnchor,
  setReactiveScheduling,
  useSetup,
  watch,
  watchEffect,
} from '../src'
import { _$compiledWithHookId } from '../src/internal'
import { _$compiledRoot } from './legacy-test-render'
import { SortFilterPreview, TogglePanel } from '../../../app/test-fixtures/VaporReactivityFixture'

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
})

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const ManualSetupToggle = () => {
  const setupState = _$compiledWithHookId('useSetup:manual:0', () =>
    useSetup(() => ({
      open: ref(false),
    })),
  ) as { open: { value: boolean } }

  return _$compiledRoot(() => {
    const root = document.createElement('section')
    const button = document.createElement('button')
    button.dataset.testid = 'manual-toggle'
    button.addEventListener('click', () => {
      setupState.open.value = !setupState.open.value
    })

    const anchor = document.createComment('manual-slot')
    root.append(button, anchor)

    watchEffect(() => {
      button.textContent = setupState.open.value ? 'open' : 'closed'
      renderAnchor(
        setupState.open.value ? <p data-testid="manual-content">content</p> : null,
        root,
        anchor,
      )
    })

    return root
  })
}

const ManualPropChild = (props: { query: string }) => {
  return _$compiledRoot(() => {
    const root = document.createElement('div')
    const text = document.createElement('span')
    text.dataset.testid = 'manual-prop-value'
    root.appendChild(text)

    watchEffect(() => {
      text.textContent = props.query
    })

    return root
  })
}

const ManualPropParent = () => {
  const query = ref('')

  return _$compiledRoot(() => {
    const root = document.createElement('section')
    const input = document.createElement('input')
    input.dataset.testid = 'manual-prop-input'
    input.addEventListener('input', event => {
      query.value = (event.target as HTMLInputElement).value
    })

    const anchor = document.createComment('manual-prop-anchor')
    root.append(input, anchor)

    watchEffect(() => {
      renderAnchor(<ManualPropChild query={query.value} />, root, anchor)
    })

    return root
  })
}

const ManualComputedChild = (props: { query: string }) => {
  const setupState = _$compiledWithHookId('useSetup:manual-computed:0', () =>
    useSetup(() => ({
      derived: computed(() => props.query),
    })),
  ) as { derived: { get: () => string } }

  return _$compiledRoot(() => {
    const root = document.createElement('div')
    const text = document.createElement('span')
    text.dataset.testid = 'manual-computed-value'
    root.appendChild(text)

    watchEffect(() => {
      text.textContent = setupState.derived.get()
    })

    return root
  })
}

const ManualSetupWatchPropChild = (props: { query: string }) => {
  const setupState = _$compiledWithHookId('useSetup:manual-watch-prop:0', () =>
    useSetup(() => {
      const latest = ref('')
      const runs = ref('0')
      let count = 0

      watchEffect(() => {
        count += 1
        runs.value = String(count)
        latest.value = props.query
      })

      return { latest, runs }
    }),
  ) as { latest: { value: string }; runs: { value: string } }

  return _$compiledRoot(() => {
    const root = document.createElement('div')
    const latestText = document.createElement('span')
    const runsText = document.createElement('span')
    latestText.dataset.testid = 'manual-watch-prop-value'
    runsText.dataset.testid = 'manual-watch-prop-runs'
    root.append(latestText, runsText)

    watchEffect(() => {
      latestText.textContent = setupState.latest.value
      runsText.textContent = setupState.runs.value
    })

    return root
  })
}

const ManualSetupWatchPropParent = () => {
  const query = ref('a')

  return _$compiledRoot(() => {
    const root = document.createElement('section')
    const input = document.createElement('input')
    input.dataset.testid = 'manual-watch-prop-input'
    input.addEventListener('input', event => {
      query.value = (event.target as HTMLInputElement).value
    })

    const anchor = document.createComment('manual-watch-prop-anchor')
    root.append(input, anchor)

    watchEffect(() => {
      input.value = query.value
      renderAnchor(<ManualSetupWatchPropChild query={query.value} />, root, anchor)
    })

    return root
  })
}

const ManualSetupWatchAndEffectChild = (props: { query: string; label: string }) => {
  const setupState = _$compiledWithHookId('useSetup:manual-watch-and-effect:0', () =>
    useSetup(() => {
      const watched = ref('')
      const watchRuns = ref('0')
      const effected = ref('')
      const effectRuns = ref('0')
      let watchCount = 0
      let effectCount = 0

      watch(
        () => props.query,
        next => {
          watchCount += 1
          watchRuns.value = String(watchCount)
          watched.value = String(next)
        },
        { immediate: true },
      )

      effect(() => {
        effectCount += 1
        effectRuns.value = String(effectCount)
        effected.value = props.label
      })

      return { watched, watchRuns, effected, effectRuns }
    }),
  ) as {
    watched: { value: string }
    watchRuns: { value: string }
    effected: { value: string }
    effectRuns: { value: string }
  }

  return _$compiledRoot(() => {
    const root = document.createElement('div')
    const watchedText = document.createElement('span')
    const watchRunsText = document.createElement('span')
    const effectedText = document.createElement('span')
    const effectRunsText = document.createElement('span')

    watchedText.dataset.testid = 'manual-watch-effect-watch-value'
    watchRunsText.dataset.testid = 'manual-watch-effect-watch-runs'
    effectedText.dataset.testid = 'manual-watch-effect-effect-value'
    effectRunsText.dataset.testid = 'manual-watch-effect-effect-runs'
    root.append(watchedText, watchRunsText, effectedText, effectRunsText)

    watchEffect(() => {
      watchedText.textContent = setupState.watched.value
      watchRunsText.textContent = setupState.watchRuns.value
      effectedText.textContent = setupState.effected.value
      effectRunsText.textContent = setupState.effectRuns.value
    })

    return root
  })
}

const ManualSetupWatchAndEffectParent = () => {
  const query = ref('a')
  const label = ref('left')

  return _$compiledRoot(() => {
    const root = document.createElement('section')
    const queryInput = document.createElement('input')
    const labelInput = document.createElement('input')
    const anchor = document.createComment('manual-watch-effect-anchor')

    queryInput.dataset.testid = 'manual-watch-effect-query'
    labelInput.dataset.testid = 'manual-watch-effect-label'
    queryInput.addEventListener('input', event => {
      query.value = (event.target as HTMLInputElement).value
    })
    labelInput.addEventListener('input', event => {
      label.value = (event.target as HTMLInputElement).value
    })

    root.append(queryInput, labelInput, anchor)

    watchEffect(() => {
      queryInput.value = query.value
      labelInput.value = label.value
      renderAnchor(
        <ManualSetupWatchAndEffectChild query={query.value} label={label.value} />,
        root,
        anchor,
      )
    })

    return root
  })
}

const ManualComputedParent = () => {
  const query = ref('')

  return _$compiledRoot(() => {
    const root = document.createElement('section')
    const input = document.createElement('input')
    input.dataset.testid = 'manual-computed-input'
    input.addEventListener('input', event => {
      query.value = (event.target as HTMLInputElement).value
    })

    const anchor = document.createComment('manual-computed-anchor')
    root.append(input, anchor)

    watchEffect(() => {
      renderAnchor(<ManualComputedChild query={query.value} />, root, anchor)
    })

    return root
  })
}

const ManualDirectComputedChild = (props: { query: string }) => {
  const derived = computed(() => props.query)

  return _$compiledRoot(() => {
    const root = document.createElement('div')
    const text = document.createElement('span')
    text.dataset.testid = 'manual-direct-computed-value'
    root.appendChild(text)

    watchEffect(() => {
      text.textContent = derived.get()
    })

    return root
  })
}

const ManualDirectComputedParent = () => {
  const query = ref('')

  return _$compiledRoot(() => {
    const root = document.createElement('section')
    const input = document.createElement('input')
    input.dataset.testid = 'manual-direct-computed-input'
    input.addEventListener('input', event => {
      query.value = (event.target as HTMLInputElement).value
    })

    const anchor = document.createComment('manual-direct-computed-anchor')
    root.append(input, anchor)

    watchEffect(() => {
      renderAnchor(<ManualDirectComputedChild query={query.value} />, root, anchor)
    })

    return root
  })
}

const ManualIntervalCounter = () => {
  const setupState = _$compiledWithHookId('useSetup:manual-interval:0', () =>
    useSetup(() => {
      const tick = ref(0)
      let timer: ReturnType<typeof setInterval> | null = null

      timer = setInterval(() => {
        if (timer != null) {
          clearInterval(timer)
          timer = null
        }
        tick.value = 1
      }, 0)

      return { tick }
    }),
  ) as { tick: { value: number } }

  return _$compiledRoot(() => {
    const root = document.createElement('section')
    const text = document.createElement('span')
    text.dataset.testid = 'manual-interval-value'
    root.appendChild(text)

    watchEffect(() => {
      text.textContent = String(setupState.tick.value)
    })

    return root
  })
}

const NestedVaporValue = (props: { value: number }) => {
  return _$compiledRoot(() => {
    const root = document.createElement('div')
    const anchor = document.createComment('nested-vapor-value-anchor')
    root.appendChild(anchor)

    watchEffect(() => {
      renderAnchor(<span data-testid="nested-vapor-value">{props.value}</span>, root, anchor)
    })

    return root
  })
}

const NestedVaporParent = () => {
  const tick = ref(0)

  return _$compiledRoot(() => {
    const root = document.createElement('section')
    const button = document.createElement('button')
    const anchor = document.createComment('nested-vapor-parent-anchor')

    button.dataset.testid = 'nested-vapor-bump'
    button.addEventListener('click', () => {
      tick.value += 1
    })

    root.append(button, anchor)

    watchEffect(() => {
      button.textContent = String(tick.value)
      renderAnchor(<NestedVaporValue value={tick.value} />, root, anchor)
    })

    return root
  })
}

const StableMixedChild = (props: { slot: any; children?: any[] }) => {
  const setupState = _$compiledWithHookId('useSetup:stable-mixed:0', () =>
    useSetup(() => {
      const root = document.createElement('div')
      const slotRuns = document.createElement('span')
      const childrenRuns = document.createElement('span')

      slotRuns.dataset.testid = 'stable-mixed-slot-runs'
      childrenRuns.dataset.testid = 'stable-mixed-children-runs'
      root.append(slotRuns, childrenRuns)

      let slotCount = 0
      let childrenCount = 0

      watchEffect(() => {
        void props.slot
        slotCount += 1
        slotRuns.textContent = String(slotCount)
      })

      watchEffect(() => {
        void props.children
        childrenCount += 1
        childrenRuns.textContent = String(childrenCount)
      })

      return { root }
    }),
  ) as { root: HTMLDivElement }

  return _$compiledRoot(() => setupState.root)
}

const StableMixedParent = () => {
  const tick = ref(0)
  const stableChild = <em data-testid="stable-mixed-child">child</em>
  const stableNode = document.createElement('strong')
  stableNode.dataset.testid = 'stable-mixed-node'
  stableNode.textContent = 'bridge'

  const makeStableNode = () => stableNode

  return _$compiledRoot(() => {
    const root = document.createElement('section')
    const button = document.createElement('button')
    const anchor = document.createComment('stable-mixed-anchor')

    button.dataset.testid = 'stable-mixed-rerender'
    button.addEventListener('click', () => {
      tick.value += 1
    })

    root.append(button, anchor)

    watchEffect(() => {
      button.textContent = String(tick.value)
      renderAnchor(
        <StableMixedChild slot={makeStableNode()}>
          {stableChild}
          {makeStableNode() as any}
        </StableMixedChild>,
        root,
        anchor,
      )
    })

    return root
  })
}

const CompiledReactiveDestructureWatchChild = (__rue_props: {
  query?: string
  count: number
  label?: string
}) => {
  const setupState = _$compiledWithHookId('useSetup:compiled-reactive-watch:0', () =>
    useSetup(() => {
      const summary = computed(
        () =>
          `${__rue_props.label === void 0 ? 'fallback-label' : __rue_props.label}:${(__rue_props.query === void 0 ? 'fallback-query' : __rue_props.query).trim().toUpperCase()} x ${__rue_props.count}`,
      )
      const latest = ref('')
      const runs = ref('0')
      const shadow = (query: string) => query.toLowerCase()
      let watchRuns = 0

      watchEffect(() => {
        const query = __rue_props.query === void 0 ? 'fallback-query' : __rue_props.query
        const label = __rue_props.label === void 0 ? 'fallback-label' : __rue_props.label

        watchRuns += 1
        runs.value = String(watchRuns)
        latest.value = `${query}|${__rue_props.count}|${label}|${shadow(query)}`
      })

      return { summary, latest, runs }
    }),
  ) as {
    summary: { get: () => string }
    latest: { value: string }
    runs: { value: string }
  }

  return _$compiledRoot(() => {
    const root = document.createElement('section')
    const summaryText = document.createElement('span')
    const latestText = document.createElement('span')
    const runsText = document.createElement('span')

    summaryText.dataset.testid = 'compiled-reactive-watch-summary'
    latestText.dataset.testid = 'compiled-reactive-watch-latest'
    runsText.dataset.testid = 'compiled-reactive-watch-runs'
    root.append(summaryText, latestText, runsText)

    watchEffect(() => {
      summaryText.textContent = setupState.summary.get()
      latestText.textContent = setupState.latest.value
      runsText.textContent = setupState.runs.value
    })

    return root
  })
}

const CompiledReactiveDestructureWatchParent = () => {
  const query = ref(' transfer ')
  const count = ref(2)
  const label = ref('runtime-label')

  return _$compiledRoot(() => {
    const root = document.createElement('section')
    const queryInput = document.createElement('input')
    const labelInput = document.createElement('input')
    const countButton = document.createElement('button')
    const anchor = document.createComment('compiled-reactive-watch-anchor')

    queryInput.dataset.testid = 'compiled-reactive-watch-query'
    labelInput.dataset.testid = 'compiled-reactive-watch-label'
    countButton.dataset.testid = 'compiled-reactive-watch-count'

    queryInput.addEventListener('input', event => {
      query.value = (event.target as HTMLInputElement).value
    })
    labelInput.addEventListener('input', event => {
      label.value = (event.target as HTMLInputElement).value
    })
    countButton.addEventListener('click', () => {
      count.value += 1
    })

    root.append(queryInput, labelInput, countButton, anchor)

    watchEffect(() => {
      queryInput.value = query.value
      labelInput.value = label.value
      countButton.textContent = String(count.value)

      renderAnchor(
        <CompiledReactiveDestructureWatchChild
          query={query.value}
          count={count.value}
          label={label.value}
        />,
        root,
        anchor,
      )
    })

    return root
  })
}

const createHookedVaporToggle = (onHookRun: () => void) => {
  const createHookedVaporPanel = (source: { value: string }) => {
    return _$compiledRoot(() => {
      // 这个 panel 刻意走“raw vapor + useSetup + watchEffect”的组合，
      // 用来覆盖最容易泄漏的那条链：
      // - renderAnchor 负责在 preview / code 两个分支之间反复替换整棵 raw vapor 子树；
      // - useSetup 在 raw vapor setup 里注册 hook-based effect；
      // - effect 同时读取 source，便于我们用 hookRuns 观察旧订阅有没有被真正 dispose。
      // 只要 owner cleanup bucket、hook scope 或 vapor scope 任意一环没接上，
      // 切到 code 分支后继续 bump source，hookRuns 就会错误增长。
      _$compiledWithHookId('useSetup:hooked-vapor-toggle:0', () =>
        useSetup(() => {
          watchEffect(() => {
            void source.value
            onHookRun()
          })

          return {}
        }),
      )

      const root = document.createElement('div')
      root.dataset.testid = 'hooked-vapor-value'

      watchEffect(() => {
        root.textContent = source.value
      })

      return root
    })
  }

  return () => {
    const activeTab = ref<'preview' | 'code'>('preview')
    const query = ref('a')

    return _$compiledRoot(() => {
      const root = document.createElement('section')
      const previewButton = document.createElement('button')
      const codeButton = document.createElement('button')
      const bumpButton = document.createElement('button')
      const anchor = document.createComment('hooked-vapor-anchor')

      previewButton.dataset.testid = 'hooked-vapor-preview'
      codeButton.dataset.testid = 'hooked-vapor-code'
      bumpButton.dataset.testid = 'hooked-vapor-bump'

      previewButton.addEventListener('click', () => {
        activeTab.value = 'preview'
      })
      codeButton.addEventListener('click', () => {
        activeTab.value = 'code'
      })
      bumpButton.addEventListener('click', () => {
        query.value += '!'
      })

      root.append(previewButton, codeButton, bumpButton, anchor)

      watchEffect(() => {
        previewButton.textContent = 'preview'
        codeButton.textContent = 'code'
        bumpButton.textContent = 'bump'

        // 关键形状：父 raw vapor 实例本身不卸载，只在同一个 anchor 上切换子分支。
        // 这样可以排除“整组件卸载时 cleanup 本来就会跑”的简单情况，专门验证
        // renderAnchor 替换 raw vapor branch 时，旧 branch 自己的 hook-based effect
        // 有没有跟着 mounted lifecycle 一起被清理。
        renderAnchor(
          activeTab.value === 'preview' ? (
            createHookedVaporPanel(query)
          ) : (
            <pre data-testid="hooked-vapor-code-panel">code</pre>
          ),
          root,
          anchor,
        )
      })

      return root
    })
  }
}

const mount = (view: any) => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  render(view, container)
  return container
}

describe('app fixture vapor reactivity', () => {
  it('renders a manual useSetup + vapor child component', async () => {
    const container = mount(
      <div>
        <ManualSetupToggle />
      </div>,
    )
    await flush()

    expect(container.querySelector('[data-testid="manual-toggle"]')?.textContent).toBe('closed')
  })

  it('updates simple child props through renderAnchor immediately', async () => {
    const container = mount(
      <div>
        <ManualPropParent />
      </div>,
    )
    await flush()

    const input = container.querySelector('[data-testid="manual-prop-input"]') as HTMLInputElement
    input.value = 'bru'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await flush()

    expect(container.querySelector('[data-testid="manual-prop-value"]')?.textContent).toBe('bru')
  })

  it('updates useSetup + computed child props through renderAnchor immediately', async () => {
    const container = mount(
      <div>
        <ManualComputedParent />
      </div>,
    )
    await flush()

    const input = container.querySelector(
      '[data-testid="manual-computed-input"]',
    ) as HTMLInputElement
    input.value = 'bru'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await flush()

    expect(container.querySelector('[data-testid="manual-computed-value"]')?.textContent).toBe(
      'bru',
    )
  })

  it('keeps useSetup watchEffect on direct props across multiple parent prop updates', async () => {
    const container = mount(
      <div>
        <ManualSetupWatchPropParent />
      </div>,
    )
    await flush()

    expect(container.querySelector('[data-testid="manual-watch-prop-value"]')?.textContent).toBe(
      'a',
    )
    expect(container.querySelector('[data-testid="manual-watch-prop-runs"]')?.textContent).toBe('1')

    const input = container.querySelector(
      '[data-testid="manual-watch-prop-input"]',
    ) as HTMLInputElement
    input.value = 'b'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await flush()

    expect(container.querySelector('[data-testid="manual-watch-prop-value"]')?.textContent).toBe(
      'b',
    )
    expect(container.querySelector('[data-testid="manual-watch-prop-runs"]')?.textContent).toBe('2')

    input.value = 'c'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await flush()

    expect(container.querySelector('[data-testid="manual-watch-prop-value"]')?.textContent).toBe(
      'c',
    )
    expect(container.querySelector('[data-testid="manual-watch-prop-runs"]')?.textContent).toBe('3')
  })

  it('keeps useSetup watch and createEffect alive across repeated parent prop updates', async () => {
    const container = mount(
      <div>
        <ManualSetupWatchAndEffectParent />
      </div>,
    )
    await flush()

    expect(
      container.querySelector('[data-testid="manual-watch-effect-watch-value"]')?.textContent,
    ).toBe('a')
    expect(
      container.querySelector('[data-testid="manual-watch-effect-watch-runs"]')?.textContent,
    ).toBe('1')
    expect(
      container.querySelector('[data-testid="manual-watch-effect-effect-value"]')?.textContent,
    ).toBe('left')
    expect(
      container.querySelector('[data-testid="manual-watch-effect-effect-runs"]')?.textContent,
    ).toBe('1')

    const queryInput = container.querySelector(
      '[data-testid="manual-watch-effect-query"]',
    ) as HTMLInputElement
    queryInput.value = 'b'
    queryInput.dispatchEvent(new Event('input', { bubbles: true }))
    await flush()

    expect(
      container.querySelector('[data-testid="manual-watch-effect-watch-value"]')?.textContent,
    ).toBe('b')
    expect(
      container.querySelector('[data-testid="manual-watch-effect-watch-runs"]')?.textContent,
    ).toBe('2')
    expect(
      container.querySelector('[data-testid="manual-watch-effect-effect-value"]')?.textContent,
    ).toBe('left')
    expect(
      container.querySelector('[data-testid="manual-watch-effect-effect-runs"]')?.textContent,
    ).toBe('1')

    const labelInput = container.querySelector(
      '[data-testid="manual-watch-effect-label"]',
    ) as HTMLInputElement
    labelInput.value = 'next'
    labelInput.dispatchEvent(new Event('input', { bubbles: true }))
    await flush()

    expect(
      container.querySelector('[data-testid="manual-watch-effect-watch-value"]')?.textContent,
    ).toBe('b')
    expect(
      container.querySelector('[data-testid="manual-watch-effect-watch-runs"]')?.textContent,
    ).toBe('2')
    expect(
      container.querySelector('[data-testid="manual-watch-effect-effect-value"]')?.textContent,
    ).toBe('next')
    expect(
      container.querySelector('[data-testid="manual-watch-effect-effect-runs"]')?.textContent,
    ).toBe('2')

    queryInput.value = 'c'
    queryInput.dispatchEvent(new Event('input', { bubbles: true }))
    await flush()

    expect(
      container.querySelector('[data-testid="manual-watch-effect-watch-value"]')?.textContent,
    ).toBe('c')
    expect(
      container.querySelector('[data-testid="manual-watch-effect-watch-runs"]')?.textContent,
    ).toBe('3')
    expect(
      container.querySelector('[data-testid="manual-watch-effect-effect-value"]')?.textContent,
    ).toBe('next')
    expect(
      container.querySelector('[data-testid="manual-watch-effect-effect-runs"]')?.textContent,
    ).toBe('2')
  })

  it('updates direct computed child props through renderAnchor immediately', async () => {
    const container = mount(
      <div>
        <ManualDirectComputedParent />
      </div>,
    )
    await flush()

    const input = container.querySelector(
      '[data-testid="manual-direct-computed-input"]',
    ) as HTMLInputElement
    input.value = 'bru'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await flush()

    expect(
      container.querySelector('[data-testid="manual-direct-computed-value"]')?.textContent,
    ).toBe('bru')
  })

  it('updates watchEffect after ref mutation from setInterval in useSetup', async () => {
    const container = mount(
      <div>
        <ManualIntervalCounter />
      </div>,
    )
    await flush()

    expect(container.querySelector('[data-testid="manual-interval-value"]')?.textContent).toBe('0')

    await new Promise(resolve => setTimeout(resolve, 20))
    await flush()

    expect(container.querySelector('[data-testid="manual-interval-value"]')?.textContent).toBe('1')
  })

  it('keeps nested vapor child props reactive across parent renderAnchor updates', async () => {
    const container = mount(
      <div>
        <NestedVaporParent />
      </div>,
    )
    await flush()

    expect(container.querySelector('[data-testid="nested-vapor-value"]')?.textContent).toBe('0')

    const button = container.querySelector('[data-testid="nested-vapor-bump"]') as HTMLButtonElement
    button.click()
    await flush()

    expect(container.querySelector('[data-testid="nested-vapor-value"]')?.textContent).toBe('1')
  })

  it('keeps mixed slot props and children stable across unrelated parent rerenders', async () => {
    const container = mount(
      <div>
        <StableMixedParent />
      </div>,
    )
    await flush()

    expect(container.querySelector('[data-testid="stable-mixed-slot-runs"]')?.textContent).toBe('1')
    expect(container.querySelector('[data-testid="stable-mixed-children-runs"]')?.textContent).toBe(
      '1',
    )

    const button = container.querySelector(
      '[data-testid="stable-mixed-rerender"]',
    ) as HTMLButtonElement
    button.click()
    await flush()

    expect(container.querySelector('[data-testid="stable-mixed-slot-runs"]')?.textContent).toBe('1')
    expect(container.querySelector('[data-testid="stable-mixed-children-runs"]')?.textContent).toBe(
      '1',
    )
  })

  it('reruns useSetup watchEffect for compiled reactive destructured props when parent props change', async () => {
    const container = mount(
      <div>
        <CompiledReactiveDestructureWatchParent />
      </div>,
    )
    await flush()

    expect(
      container.querySelector('[data-testid="compiled-reactive-watch-summary"]')?.textContent,
    ).toBe('runtime-label:TRANSFER x 2')
    expect(
      container.querySelector('[data-testid="compiled-reactive-watch-latest"]')?.textContent,
    ).toBe(' transfer |2|runtime-label| transfer ')
    expect(
      container.querySelector('[data-testid="compiled-reactive-watch-runs"]')?.textContent,
    ).toBe('1')

    const queryInput = container.querySelector(
      '[data-testid="compiled-reactive-watch-query"]',
    ) as HTMLInputElement
    queryInput.value = ' rue '
    queryInput.dispatchEvent(new Event('input', { bubbles: true }))
    await flush()

    expect(
      container.querySelector('[data-testid="compiled-reactive-watch-summary"]')?.textContent,
    ).toBe('runtime-label:RUE x 2')
    expect(
      container.querySelector('[data-testid="compiled-reactive-watch-latest"]')?.textContent,
    ).toBe(' rue |2|runtime-label| rue ')
    expect(
      container.querySelector('[data-testid="compiled-reactive-watch-runs"]')?.textContent,
    ).toBe('2')

    const labelInput = container.querySelector(
      '[data-testid="compiled-reactive-watch-label"]',
    ) as HTMLInputElement
    labelInput.value = 'next-label'
    labelInput.dispatchEvent(new Event('input', { bubbles: true }))
    await flush()

    expect(
      container.querySelector('[data-testid="compiled-reactive-watch-summary"]')?.textContent,
    ).toBe('next-label:RUE x 2')
    expect(
      container.querySelector('[data-testid="compiled-reactive-watch-latest"]')?.textContent,
    ).toBe(' rue |2|next-label| rue ')
    expect(
      container.querySelector('[data-testid="compiled-reactive-watch-runs"]')?.textContent,
    ).toBe('3')

    const countButton = container.querySelector(
      '[data-testid="compiled-reactive-watch-count"]',
    ) as HTMLButtonElement
    countButton.click()
    await flush()

    expect(
      container.querySelector('[data-testid="compiled-reactive-watch-summary"]')?.textContent,
    ).toBe('next-label:RUE x 3')
    expect(
      container.querySelector('[data-testid="compiled-reactive-watch-latest"]')?.textContent,
    ).toBe(' rue |3|next-label| rue ')
    expect(
      container.querySelector('[data-testid="compiled-reactive-watch-runs"]')?.textContent,
    ).toBe('4')
  })

  it('updates local ref-driven content immediately', async () => {
    const container = mount(
      <div>
        <TogglePanel />
      </div>,
    )
    await flush()

    const toggle = container.querySelector('[data-testid="toggle"]') as HTMLButtonElement | null
    expect(toggle?.textContent).toBe('closed')
    expect(container.querySelector('[data-testid="content"]')).toBeNull()

    toggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()

    expect(
      (container.querySelector('[data-testid="toggle"]') as HTMLButtonElement | null)?.textContent,
    ).toBe('open')
    expect(container.querySelector('[data-testid="content"]')?.textContent).toBe('content')
  })

  it('filters rows immediately and keeps state after tab switches', async () => {
    const container = mount(
      <div>
        <SortFilterPreview />
      </div>,
    )
    await flush()

    const search = container.querySelector('[data-testid="search"]') as HTMLInputElement | null
    expect(search).not.toBeNull()
    expect(
      Array.from(container.querySelectorAll('[data-testid="rows"] li')).map(
        item => item.textContent,
      ),
    ).toEqual(['Chuck Norris', 'Bruce Lee', 'Jackie Chan', 'Jet Li'])

    if (search) {
      search.value = 'bruce'
      search.dispatchEvent(new Event('input', { bubbles: true }))
    }
    await flush()

    expect(
      Array.from(container.querySelectorAll('[data-testid="rows"] li')).map(
        item => item.textContent,
      ),
    ).toEqual(['Bruce Lee'])

    ;(
      container.querySelector('[data-testid="tab-code"]') as HTMLButtonElement | null
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()

    expect(container.querySelector('[data-testid="code-panel"]')?.textContent).toBe('code')

    ;(
      container.querySelector('[data-testid="tab-preview"]') as HTMLButtonElement | null
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()

    expect(
      Array.from(container.querySelectorAll('[data-testid="rows"] li')).map(
        item => item.textContent,
      ),
    ).toEqual(['Bruce Lee'])
  })

  it('disposes hook-based vapor setup effects across branch remounts', async () => {
    let hookRuns = 0
    const HookedVaporToggle = createHookedVaporToggle(() => {
      hookRuns += 1
    })

    const container = mount(
      <div>
        <HookedVaporToggle />
      </div>,
    )
    await flush()

    expect(hookRuns).toBe(1)
    expect(container.querySelector('[data-testid="hooked-vapor-value"]')?.textContent).toBe('a')

    ;(
      container.querySelector('[data-testid="hooked-vapor-bump"]') as HTMLButtonElement | null
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()

    expect(hookRuns).toBe(2)
    expect(container.querySelector('[data-testid="hooked-vapor-value"]')?.textContent).toBe('a!')

    ;(
      container.querySelector('[data-testid="hooked-vapor-code"]') as HTMLButtonElement | null
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()

    expect(container.querySelector('[data-testid="hooked-vapor-code-panel"]')?.textContent).toBe(
      'code',
    )

    ;(
      container.querySelector('[data-testid="hooked-vapor-bump"]') as HTMLButtonElement | null
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()

    // 切到 code 后，query 仍然会继续变成 a!!，因为状态本身没有停；
    // 真正要断开的只是 preview branch 里那条旧 watchEffect 订阅。
    // 所以这里断言 hookRuns 维持 2，而不是去断言 query 停止更新。
    expect(hookRuns).toBe(2)

    ;(
      container.querySelector('[data-testid="hooked-vapor-preview"]') as HTMLButtonElement | null
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()

    // 重新切回 preview 时会挂载一棵全新的 raw vapor branch，
    // 这一次 setup 会读取当前最新的 query 值 a!!，因此 hookRuns 只应新增 1 次，
    // 同时 DOM 也应该直接反映 a!!，而不是回退到旧 branch 离开时的 a!。
    expect(hookRuns).toBe(3)
    expect(container.querySelector('[data-testid="hooked-vapor-value"]')?.textContent).toBe('a!!')

    ;(
      container.querySelector('[data-testid="hooked-vapor-bump"]') as HTMLButtonElement | null
    )?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()

    expect(hookRuns).toBe(4)
    expect(container.querySelector('[data-testid="hooked-vapor-value"]')?.textContent).toBe('a!!!')
  })
})
