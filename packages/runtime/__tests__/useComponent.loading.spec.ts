import { afterEach, describe, expect, it, vi } from 'vitest'

type EffectRunner = () => void
type LoadedModule = { default: (props: any) => any }

const renderAnchorMock = vi.fn()

const createElementMock = vi.fn(() => ({
  tag: 'div',
  children: [] as any[],
  style: {},
}))

const createCommentMock = vi.fn((data: string) => ({
  tag: 'comment',
  data,
  parentNode: null as any,
}))

const appendChildMock = vi.fn((parent: any, child: any) => {
  if (child?.parentNode?.children) {
    child.parentNode.children = child.parentNode.children.filter((entry: any) => entry !== child)
  }
  parent.children ??= []
  parent.children.push(child)
  child.parentNode = parent
})

let activeEffect: EffectRunner | null = null

function createSignal<T>(initial: T) {
  let value = initial
  const subscribers = new Set<EffectRunner>()
  return {
    get() {
      if (activeEffect) subscribers.add(activeEffect)
      return value
    },
    set(next: T) {
      value = next
      for (const subscriber of [...subscribers]) subscriber()
    },
  }
}

vi.mock('../src/rue.ts', () => {
  return {
    default: {
      handleError: vi.fn(),
    },
    h: (type: unknown, props?: Record<string, unknown>) => ({ type, props, children: [] }),
    vapor: (setup: () => unknown) => setup(),
    renderAnchor: renderAnchorMock,
  }
})

vi.mock('../src/dom.ts', () => {
  return {
    appendChild: appendChildMock,
    createComment: createCommentMock,
    createElement: createElementMock,
  }
})

vi.mock('../src/reactivity/index.ts', () => {
  return {
    signal: <T>(initial: T) => createSignal(initial),
    watchEffect: (runner: EffectRunner) => {
      const wrapped = () => {
        activeEffect = wrapped
        try {
          runner()
        } finally {
          activeEffect = null
        }
      }
      wrapped()
    },
  }
})

vi.mock('@rue-js/runtime-vapor', () => {
  return {
    useSetup: <T>(factory: () => T) => factory(),
  }
})

afterEach(() => {
  renderAnchorMock.mockClear()
  createElementMock.mockClear()
  createCommentMock.mockClear()
  appendChildMock.mockClear()
  activeEffect = null
  vi.resetModules()
})

describe('useComponent loading behavior', () => {
  it('skips the initial empty loading render by default', async () => {
    const loader = () => new Promise<{ default: (props: any) => any }>(() => {})

    const { useComponent } = await import('../src/hooks/useComponent')
    const Async = useComponent(loader)

    const vnode: any = Async({ id: 1 })
    expect(vnode.vaporElement ?? vnode.props?.setup?.()?.vaporElement).toBeDefined()
    expect(renderAnchorMock).not.toHaveBeenCalled()
  })

  it('keeps rendering a custom loading component before resolve', async () => {
    const deferred: { resolve?: (value: LoadedModule) => void } = {}
    const loader = () =>
      new Promise<LoadedModule>(resolve => {
        deferred.resolve = resolve
      })
    const Loading = () => ({ type: 'loading', props: {}, children: [] })

    const { useComponent } = await import('../src/hooks/useComponent')
    const Async = useComponent(loader, { loading: Loading })

    Async({ id: 1 })
    expect(renderAnchorMock).toHaveBeenCalledTimes(1)
    expect(renderAnchorMock.mock.calls[0][0].type).toBe(Loading)

    deferred.resolve?.({
      default: (props: any) => ({ type: 'resolved', props, children: [] }),
    })
    await Promise.resolve()

    expect(renderAnchorMock).toHaveBeenCalledTimes(2)
  })

  it('renders the resolved component against the mounted anchor parent', async () => {
    const deferred: { resolve?: (value: LoadedModule) => void } = {}
    const loader = () =>
      new Promise<LoadedModule>(resolve => {
        deferred.resolve = resolve
      })

    const { useComponent } = await import('../src/hooks/useComponent')
    const Async = useComponent(loader)

    const vnode: any = Async({ id: 1 })
    const container = vnode.vaporElement
    const anchor = container.children[0]
    const host = { tag: 'host', children: [] as any[] }

    appendChildMock(host, container)

    deferred.resolve?.({
      default: (props: any) => ({ type: 'resolved', props, children: [] }),
    })
    await Promise.resolve()

    expect(renderAnchorMock).toHaveBeenCalledTimes(1)
    expect(renderAnchorMock.mock.calls[0][1]).toBe(vnode.vaporElement)
    expect(renderAnchorMock.mock.calls[0][2]).toBe(anchor)
  })
})
