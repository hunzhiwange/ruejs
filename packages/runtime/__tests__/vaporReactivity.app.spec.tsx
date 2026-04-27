import { afterEach, describe, expect, it } from 'vitest'

import {
  _$vaporWithHookId,
  computed,
  ref,
  render,
  renderAnchor,
  setReactiveScheduling,
  useSetup,
  vapor,
  watchEffect,
} from '../src'
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
  const setupState = _$vaporWithHookId('useSetup:manual:0', () =>
    useSetup(() => ({
      open: ref(false),
    })),
  ) as { open: { value: boolean } }

  return vapor(() => {
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
  return vapor(() => {
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

  return vapor(() => {
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
  const setupState = _$vaporWithHookId('useSetup:manual-computed:0', () =>
    useSetup(() => ({
      derived: computed(() => props.query),
    })),
  ) as { derived: { get: () => string } }

  return vapor(() => {
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

const ManualComputedParent = () => {
  const query = ref('')

  return vapor(() => {
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

  return vapor(() => {
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

  return vapor(() => {
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
  const setupState = _$vaporWithHookId('useSetup:manual-interval:0', () =>
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

  return vapor(() => {
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
  return vapor(() => {
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

  return vapor(() => {
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
  const setupState = _$vaporWithHookId('useSetup:stable-mixed:0', () =>
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
        props.slot
        slotCount += 1
        slotRuns.textContent = String(slotCount)
      })

      watchEffect(() => {
        props.children
        childrenCount += 1
        childrenRuns.textContent = String(childrenCount)
      })

      return { root }
    }),
  ) as { root: HTMLDivElement }

  return vapor(() => setupState.root)
}

const StableMixedParent = () => {
  const tick = ref(0)
  const legacyChild = <em data-testid="stable-mixed-legacy">legacy</em>
  const stableNode = document.createElement('strong')
  stableNode.dataset.testid = 'stable-mixed-node'
  stableNode.textContent = 'bridge'

  const makeStableNode = () => stableNode

  return vapor(() => {
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
          {legacyChild}
          {makeStableNode() as any}
        </StableMixedChild>,
        root,
        anchor,
      )
    })

    return root
  })
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
})
