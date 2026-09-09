// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  type FC,
  Fragment,
  Transition,
  createContext,
  createElement,
  ref,
  render,
  setReactiveScheduling,
  useApp,
  useContext,
} from '@rue-js/rue'
import * as rueEntry from '@rue-js/rue'
import * as rueInternalEntry from '@rue-js/rue/internal'
import * as runtimeReactivityEntry from '@rue-js/runtime/public/reactivity'
import * as runtimeEntry from '../src/runtime'
import { render as runtimeRender } from '../src/runtime'
import { renderToString } from '../src/server-renderer'
import { createCompiledDynamic as _$createDynamic } from '@rue-js/runtime/internal'

setReactiveScheduling('sync')

const flushRender = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await new Promise(resolve => setTimeout(resolve, 0))
}

const callDone = (done: (() => void) | null) => {
  done?.()
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('rue public package entry', () => {
  it('keeps the complete public runtime export surface available', () => {
    expect(Object.keys(rueEntry).sort()).toEqual([
      'Component',
      'Fragment',
      'KeepAlive',
      'Slot',
      'Suspense',
      'Teleport',
      'Template',
      'Transition',
      'TransitionGroup',
      'TransitionUtils',
      'batch',
      'computed',
      'createContext',
      'createElement',
      'createResource',
      'createRue',
      'createTransitionRunner',
      'customRef',
      'effect',
      'effectScope',
      'getCurrentContainer',
      'getCurrentInstance',
      'getCurrentScope',
      'hydrateOnIdle',
      'hydrateOnInteraction',
      'hydrateOnMediaQuery',
      'hydrateOnVisible',
      'installBrowserErrorBridge',
      'installDevErrorOverlay',
      'installErrorConsole',
      'isReactive',
      'isReadonly',
      'isRef',
      'mount',
      'nextTick',
      'onActivated',
      'onBeforeCreate',
      'onBeforeMount',
      'onBeforeUnmount',
      'onBeforeUpdate',
      'onCleanup',
      'onCreated',
      'onDeactivated',
      'onError',
      'onErrorCaptured',
      'onMounted',
      'onRenderTracked',
      'onRenderTriggered',
      'onScopeDispose',
      'onServerPrefetch',
      'onUnmounted',
      'onUpdated',
      'onWatcherCleanup',
      'ref',
      'render',
      'renderAnchor',
      'renderStatic',
      'runServerPrefetch',
      'setCurrentInstance',
      'setReactiveScheduling',
      'shallowRef',
      'signal',
      'toValue',
      'triggerRef',
      'unref',
      'untrack',
      'use',
      'useApp',
      'useComponent',
      'useContext',
      'useCustomElement',
      'useEffect',
      'useEmit',
      'useHost',
      'useRef',
      'useSetup',
      'useShadowRoot',
      'useState',
      'version',
      'watch',
      'watchDeepSignal',
      'watchEffect',
      'watchFn',
      'watchPath',
      'watchPostEffect',
      'watchSignal',
      'watchSyncEffect',
      'withHookSlot',
    ])
  })

  it('does not expose the removed runtime Hooks from public or internal entries', () => {
    const entries = [
      ['@rue-js/rue', rueEntry],
      ['@rue-js/rue/internal', rueInternalEntry],
      ['@rue-js/runtime/public/reactivity', runtimeReactivityEntry],
    ] as const
    for (const [name, entry] of entries) {
      expect(entry, name).not.toHaveProperty('useSignal')
      expect(entry, name).not.toHaveProperty('useMemo')
      expect(entry, name).not.toHaveProperty('useCallback')
    }
  })

  it('supports classic JSX createElement calls from the public entry', () => {
    const container = document.createElement('div')

    render(
      createElement(Fragment, null, createElement('p', { class: 'classic' }, 'classic jsx')),
      container,
    )

    const paragraph = container.querySelector('p.classic')
    expect(paragraph?.textContent).toBe('classic jsx')
  })

  it('does not publish or re-export the removed Vapor API', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), 'packages/rue/package.json'), 'utf8'),
    ) as { exports?: Record<string, unknown>; buildOptions?: { subEntries?: unknown[] } }
    const source = readFileSync(resolve(process.cwd(), 'packages/rue/src/index.ts'), 'utf8')

    expect(packageJson.exports).not.toHaveProperty('./vapor')
    expect(JSON.stringify(packageJson.buildOptions?.subEntries ?? [])).not.toContain('rue.vapor')
    expect(source).not.toMatch(/\b(?:vapor|normalizeRenderable|RenderableOutput)\b/)
  })
  it('renders JSX from the main entry and updates reactive state from DOM events', async () => {
    const count = ref(0)

    const Counter: FC = () => {
      return (
        <button
          data-testid="counter"
          onClick={() => {
            count.value += 1
          }}
        >
          count: {count.value}
        </button>
      )
    }

    const container = document.createElement('div')
    document.body.appendChild(container)

    useApp(Counter).mount(container)
    await flushRender()

    const button = container.querySelector('[data-testid="counter"]') as HTMLButtonElement | null
    expect(button?.textContent).toBe('count: 0')

    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushRender()

    expect(container.querySelector('[data-testid="counter"]')?.textContent).toBe('count: 1')
  })

  it('mounts apps with plugins and provides context values through the main entry', async () => {
    const LabelContext = createContext('fallback')
    let installedLabel = 'pending'

    const plugin = {
      install: vi.fn(() => {
        installedLabel = 'installed'
      }),
    }

    const Reader: FC = () => {
      const label = useContext(LabelContext)
      return (
        <p data-testid="reader">
          {installedLabel} / {label}
        </p>
      )
    }

    const App: FC = () => {
      return (
        <LabelContext.Provider value="provided">
          <Reader />
        </LabelContext.Provider>
      )
    }

    const container = document.createElement('div')
    document.body.appendChild(container)

    useApp(App).use(plugin).mount(container)
    await flushRender()

    expect(plugin.install).toHaveBeenCalledTimes(1)
    expect(container.hasAttribute('data-rue-app')).toBe(true)
    expect(container.querySelector('[data-testid="reader"]')?.textContent).toBe(
      'installed / provided',
    )
  })

  it('keeps the runtime deep entry aligned with the main entry', async () => {
    expect('h' in rueEntry).toBe(false)
    expect('h' in runtimeEntry).toBe(false)
    expect(runtimeRender).toBe(render)

    const container = document.createElement('div')
    document.body.appendChild(container)

    runtimeRender(
      _$createDynamic('p', { 'data-testid': 'runtime-entry', children: 'runtime entry' }),
      container,
    )
    await flushRender()

    expect(container.querySelector('[data-testid="runtime-entry"]')?.textContent).toBe(
      'runtime entry',
    )
  })

  it('keeps no-value data and aria attributes queryable in DOM output', async () => {
    const App: FC = () => (
      <section data-editor-content data-ready={true} data-off={false} aria-hidden />
    )

    const container = document.createElement('div')
    document.body.appendChild(container)

    render(<App />, container)
    await flushRender()

    const section = container.querySelector('[data-editor-content]')
    expect(section?.getAttribute('data-editor-content')).toBe('true')
    expect(section?.getAttribute('data-ready')).toBe('true')
    expect(section?.getAttribute('data-off')).toBe('false')
    expect(section?.getAttribute('aria-hidden')).toBe('true')
  })

  it('renders Rue JSX through the server-renderer deep entry', async () => {
    const App: FC = () => (
      <article id="server-entry">
        <h1>Rue SSR</h1>
        <p data-active="true">ready</p>
      </article>
    )

    await expect(renderToString(<App />)).resolves.toBe(
      '<article id="server-entry"><h1>Rue SSR</h1><p data-active="true">ready</p></article>',
    )
  })

  it('runs keyed Transition switches in out-in mode', async () => {
    const view = ref<'one' | 'two'>('one')
    const events: string[] = []
    let leaveDone: (() => void) | null = null
    let enterDone: (() => void) | null = null

    const readPanels = (container: HTMLElement) =>
      Array.from(container.querySelectorAll('[data-testid="panel"]')).map(
        panel => panel.textContent,
      )

    const App: FC = () => (
      <Transition
        mode="out-in"
        css={false}
        onEnter={(el, done) => {
          events.push(`enter:${el.textContent}`)
          if (el.textContent === 'two') enterDone = done
          else done()
        }}
        onAfterEnter={el => {
          events.push(`after-enter:${el.textContent}`)
        }}
        onLeave={(el, done) => {
          events.push(`leave:${el.textContent}`)
          leaveDone = done
        }}
        onAfterLeave={el => {
          events.push(`after-leave:${el.textContent}`)
        }}
      >
        <div key={view.value} data-testid="panel">
          {view.value}
        </div>
      </Transition>
    )

    const container = document.createElement('div')
    document.body.appendChild(container)

    render(<App />, container)
    await flushRender()

    expect(events).toEqual(['enter:one', 'after-enter:one'])

    view.value = 'two'
    await flushRender()

    expect(events).toEqual(['enter:one', 'after-enter:one', 'leave:one'])
    expect(readPanels(container)).toEqual(['one'])
    expect(enterDone).toBeNull()

    callDone(leaveDone)
    await flushRender()

    expect(events).toEqual([
      'enter:one',
      'after-enter:one',
      'leave:one',
      'after-leave:one',
      'enter:two',
    ])
    expect(readPanels(container)).toEqual(['two'])

    callDone(enterDone)
    await flushRender()

    expect(events).toEqual([
      'enter:one',
      'after-enter:one',
      'leave:one',
      'after-leave:one',
      'enter:two',
      'after-enter:two',
    ])
  })

  it('runs keyed Transition switches in in-out mode', async () => {
    const view = ref<'one' | 'two'>('one')
    const events: string[] = []
    let enterDone: (() => void) | null = null
    let leaveDone: (() => void) | null = null

    const readPanels = (container: HTMLElement) =>
      Array.from(container.querySelectorAll('[data-testid="panel"]')).map(
        panel => panel.textContent,
      )

    const App: FC = () => (
      <Transition
        mode="in-out"
        css={false}
        onEnter={(el, done) => {
          events.push(`enter:${el.textContent}`)
          if (el.textContent === 'two') enterDone = done
          else done()
        }}
        onAfterEnter={el => {
          events.push(`after-enter:${el.textContent}`)
        }}
        onLeave={(el, done) => {
          events.push(`leave:${el.textContent}`)
          leaveDone = done
        }}
        onAfterLeave={el => {
          events.push(`after-leave:${el.textContent}`)
        }}
      >
        <div key={view.value} data-testid="panel">
          {view.value}
        </div>
      </Transition>
    )

    const container = document.createElement('div')
    document.body.appendChild(container)

    render(<App />, container)
    await flushRender()

    expect(events).toEqual(['enter:one', 'after-enter:one'])

    view.value = 'two'
    await flushRender()

    expect(events).toEqual(['enter:one', 'after-enter:one', 'enter:two'])
    expect(readPanels(container)).toEqual(['two', 'one'])
    expect(leaveDone).toBeNull()

    callDone(enterDone)
    await flushRender()

    expect(events).toEqual([
      'enter:one',
      'after-enter:one',
      'enter:two',
      'after-enter:two',
      'leave:one',
    ])
    expect(readPanels(container)).toEqual(['two', 'one'])

    callDone(leaveDone)
    await flushRender()

    expect(events).toEqual([
      'enter:one',
      'after-enter:one',
      'enter:two',
      'after-enter:two',
      'leave:one',
      'after-leave:one',
    ])
    expect(readPanels(container)).toEqual(['two'])
  })

  it('patches same-key Transition children without running switch hooks again', async () => {
    const identity = ref('stable')
    const label = ref('one')
    const events: string[] = []
    let leaveDone: (() => void) | null = null

    const App: FC = () => (
      <Transition
        mode="out-in"
        css={false}
        onEnter={(el, done) => {
          events.push(`enter:${el.textContent}`)
          done()
        }}
        onAfterEnter={el => {
          events.push(`after-enter:${el.textContent}`)
        }}
        onLeave={(el, done) => {
          events.push(`leave:${el.textContent}`)
          leaveDone = done
        }}
      >
        <div key={identity.value} data-testid="panel">
          {label.value}
        </div>
      </Transition>
    )

    const container = document.createElement('div')
    document.body.appendChild(container)

    render(<App />, container)
    await flushRender()

    expect(events).toEqual(['enter:one', 'after-enter:one'])

    label.value = 'two'
    await flushRender()

    expect(container.querySelector('[data-testid="panel"]')?.textContent).toBe('two')
    expect(events).toEqual(['enter:one', 'after-enter:one'])
    expect(leaveDone).toBeNull()
  })

  it('falls back to default Transition mode for unknown mode values', async () => {
    const view = ref<'one' | 'two'>('one')
    const events: string[] = []
    let enterDone: (() => void) | null = null
    let leaveDone: (() => void) | null = null

    const readPanels = (container: HTMLElement) =>
      Array.from(container.querySelectorAll('[data-testid="panel"]')).map(
        panel => panel.textContent,
      )

    const App: FC = () => (
      <Transition
        mode={'sideways' as any}
        css={false}
        onEnter={(el, done) => {
          events.push(`enter:${el.textContent}`)
          if (el.textContent === 'two') enterDone = done
          else done()
        }}
        onAfterEnter={el => {
          events.push(`after-enter:${el.textContent}`)
        }}
        onLeave={(el, done) => {
          events.push(`leave:${el.textContent}`)
          leaveDone = done
        }}
        onAfterLeave={el => {
          events.push(`after-leave:${el.textContent}`)
        }}
      >
        <div key={view.value} data-testid="panel">
          {view.value}
        </div>
      </Transition>
    )

    const container = document.createElement('div')
    document.body.appendChild(container)

    render(<App />, container)
    await flushRender()

    expect(events).toEqual(['enter:one', 'after-enter:one'])

    view.value = 'two'
    await flushRender()

    expect(events).toEqual(['enter:one', 'after-enter:one', 'leave:one', 'enter:two'])
    expect(readPanels(container)).toEqual(['two', 'one'])

    callDone(enterDone)
    await flushRender()

    expect(events).toEqual([
      'enter:one',
      'after-enter:one',
      'leave:one',
      'enter:two',
      'after-enter:two',
    ])
    expect(readPanels(container)).toEqual(['two', 'one'])

    callDone(leaveDone)
    await flushRender()

    expect(events).toEqual([
      'enter:one',
      'after-enter:one',
      'leave:one',
      'enter:two',
      'after-enter:two',
      'after-leave:one',
    ])
    expect(readPanels(container)).toEqual(['two'])
  })

  it('keeps a leaving snapshot stable when a Transition child is hidden', async () => {
    const shown = ref(true)
    const label = ref('one')
    const events: string[] = []
    let leaveDone: (() => void) | null = null

    const readPanels = (container: HTMLElement) =>
      Array.from(container.querySelectorAll('[data-testid="panel"]')).map(
        panel => panel.textContent,
      )

    const App: FC = () => (
      <Transition
        mode="out-in"
        css={false}
        onEnter={(el, done) => {
          events.push(`enter:${el.textContent}`)
          done()
        }}
        onAfterEnter={el => {
          events.push(`after-enter:${el.textContent}`)
        }}
        onLeave={(el, done) => {
          events.push(`leave:${el.textContent}`)
          leaveDone = done
        }}
        onAfterLeave={el => {
          events.push(`after-leave:${el.textContent}`)
        }}
      >
        {shown.value && (
          <div key="panel" data-testid="panel">
            {label.value}
          </div>
        )}
      </Transition>
    )

    const container = document.createElement('div')
    document.body.appendChild(container)

    render(<App />, container)
    await flushRender()

    expect(events).toEqual(['enter:one', 'after-enter:one'])
    expect(readPanels(container)).toEqual(['one'])

    shown.value = false
    label.value = 'two'
    await flushRender()

    expect(events).toEqual(['enter:one', 'after-enter:one', 'leave:one'])
    expect(readPanels(container)).toEqual(['one'])

    callDone(leaveDone)
    await flushRender()

    expect(events).toEqual(['enter:one', 'after-enter:one', 'leave:one', 'after-leave:one'])
    expect(readPanels(container)).toEqual([])
  })
})
