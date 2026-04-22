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

    return { vaporElement: root }
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

    return { vaporElement: root }
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

    return { vaporElement: root }
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

    return { vaporElement: root }
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

    return { vaporElement: root }
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

    return { vaporElement: root }
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

    return { vaporElement: root }
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
