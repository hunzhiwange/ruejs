import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  Component as RueComponent,
  KeepAlive as RueKeepAlive,
  onDeactivated as onDeactivatedFromRue,
} from '@rue-js/rue'
import {
  _$createElement as _$createElementFromRueVapor,
  _$settextContent as _$settextContentFromRueVapor,
  _$compiledWithHookId as _$compiledWithHookIdFromRueVapor,
  renderAnchor as renderAnchorFromRueVapor,
  ref as refFromRueVapor,
  untrack as untrackFromRueVapor,
  useSetup as useSetupFromRueVapor,
  useState as useStateFromRueVapor,
  vapor as vaporFromRueVapor,
  watchEffect as watchEffectFromRueVapor,
} from './legacy-test-render'
import {
  Component,
  KeepAlive,
  _$createElement,
  _$settextContent,
  onActivated,
  onDeactivated,
  onUnmounted,
  render,
  renderAnchor,
  setReactiveScheduling,
  signal,
  useSetup,
  useState,
  watchEffect,
  type FC,
} from '../src'
import { _$compiledWithHookId } from '../src/internal'
import {
  onActivated as onActivatedFromVapor,
  onDeactivated as onDeactivatedFromVapor,
} from './legacy-test-render'
import { vapor } from './legacy-test-render'

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
})

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const createInputView =
  (name: string): FC =>
  () => (
    <label data-testid={`panel-${name}`}>
      {name}
      <input data-testid={`input-${name}`} />
    </label>
  )

const mountKeepAliveSwitch = (
  host: HTMLElement,
  options: {
    active: ReturnType<typeof signal<string>>
    views: Record<string, FC>
    include?: string
    exclude?: string
    max?: number
  },
) => {
  const App: FC = () =>
    vapor(() => {
      const root = document.createDocumentFragment()
      const anchor = document.createComment('keep-alive-anchor')
      root.appendChild(anchor)

      watchEffect(() => {
        const activeName = options.active.get()
        renderAnchor(
          <KeepAlive include={options.include} exclude={options.exclude} max={options.max}>
            <Component is={options.views[activeName]} key={activeName} />
          </KeepAlive>,
          root as any,
          anchor as any,
        )
      })

      return root as any
    }) as any

  render(<App />, host)
}

const setInputValue = (host: HTMLElement, name: string, value: string) => {
  const input = host.querySelector(`[data-testid="input-${name}"]`) as HTMLInputElement
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

const getInputValue = (host: HTMLElement, name: string) => {
  const input = host.querySelector(`[data-testid="input-${name}"]`) as HTMLInputElement | null
  return input?.value
}

describe('KeepAlive renderable boundary', () => {
  it('transitions each range once and clears active and cached ranges on dispose', async () => {
    const host = document.createElement('div')
    const active = signal('A')
    const revision = signal(0)
    const lifecycle: string[] = []
    const unmounted: string[] = []
    let dispose = () => {}
    document.body.appendChild(host)

    const Panel: FC<{ name: string; revision: number }> = props => {
      onActivated(() => lifecycle.push(`${props.name}:activated`))
      onDeactivated(() => lifecycle.push(`${props.name}:deactivated`))
      onUnmounted(() => unmounted.push(props.name))
      return (
        <div data-testid={`panel-${props.name}`} data-revision={props.revision}>
          {props.name}
        </div>
      )
    }

    const views: Record<string, FC<{ revision: number }>> = {
      A: props => <Panel name="A" revision={props.revision} />,
      B: props => <Panel name="B" revision={props.revision} />,
    }

    const App: FC = () =>
      vapor(() => {
        const root = document.createDocumentFragment()
        const anchor = document.createComment('keep-alive-anchor')
        root.appendChild(anchor)

        watchEffect(() => {
          const activeName = active.get()
          renderAnchor(
            <KeepAlive __rueRegisterDispose={next => (dispose = next)}>
              <Component is={views[activeName]} key={activeName} revision={revision.get()} />
            </KeepAlive>,
            root as any,
            anchor as any,
          )
        })

        return root as any
      }) as any

    render(<App />, host)
    await flush()
    const panelA = host.querySelector('[data-testid="panel-A"]')
    const keepAliveComments = () =>
      Array.from(host.childNodes).filter(
        node =>
          node.nodeType === Node.COMMENT_NODE &&
          (node.nodeValue === 'rue:keep-alive:start' || node.nodeValue === 'rue:keep-alive:end'),
      )

    revision.set(1)
    await flush()
    expect(host.querySelector('[data-testid="panel-A"]')).toBe(panelA)
    expect(host.querySelectorAll('[data-testid^="panel-"]')).toHaveLength(1)
    expect(keepAliveComments()).toHaveLength(2)
    expect(lifecycle).toEqual(['A:activated'])

    active.set('B')
    await flush()
    const panelB = host.querySelector('[data-testid="panel-B"]')
    active.set('A')
    await flush()

    expect(host.querySelector('[data-testid="panel-A"]')).toBe(panelA)
    expect(host.querySelectorAll('[data-testid^="panel-"]')).toHaveLength(1)
    expect(keepAliveComments()).toHaveLength(2)
    expect(lifecycle).toEqual([
      'A:activated',
      'A:deactivated',
      'B:activated',
      'B:deactivated',
      'A:activated',
    ])

    dispose()
    dispose()
    await flush()

    expect(lifecycle).toEqual([
      'A:activated',
      'A:deactivated',
      'B:activated',
      'B:deactivated',
      'A:activated',
      'A:deactivated',
    ])
    expect(unmounted.sort()).toEqual(['A', 'B'])
    expect(panelA?.isConnected).toBe(false)
    expect(panelB?.isConnected).toBe(false)
    expect(host.querySelector('[data-testid^="panel-"]')).toBeNull()
    expect(keepAliveComments()).toHaveLength(0)
  })

  it('keeps keyed dynamic component state when switching through Component', async () => {
    const host = document.createElement('div')
    const active = signal('A')
    document.body.appendChild(host)

    mountKeepAliveSwitch(host, {
      active,
      views: {
        A: createInputView('A'),
        B: createInputView('B'),
      },
    })
    await flush()

    expect(host.querySelector('[data-testid="panel-A"]')).not.toBeNull()
    setInputValue(host, 'A', 'alpha')
    expect(getInputValue(host, 'A')).toBe('alpha')

    active.set('B')
    await flush()
    expect(host.querySelector('[data-testid="panel-A"]')).toBeNull()
    expect(host.querySelector('[data-testid="panel-B"]')).not.toBeNull()

    setInputValue(host, 'B', 'beta')
    expect(getInputValue(host, 'B')).toBe('beta')

    active.set('A')
    await flush()
    expect(getInputValue(host, 'A')).toBe('alpha')

    active.set('B')
    await flush()
    expect(getInputValue(host, 'B')).toBe('beta')
  })

  it('does not cache entries matched by exclude', async () => {
    const host = document.createElement('div')
    const active = signal('A')
    document.body.appendChild(host)

    mountKeepAliveSwitch(host, {
      active,
      exclude: 'B',
      views: {
        A: createInputView('A'),
        B: createInputView('B'),
      },
    })
    await flush()

    setInputValue(host, 'A', 'alpha')
    active.set('B')
    await flush()

    setInputValue(host, 'B', 'beta')
    expect(getInputValue(host, 'B')).toBe('beta')

    active.set('A')
    await flush()
    expect(getInputValue(host, 'A')).toBe('alpha')

    active.set('B')
    await flush()
    expect(getInputValue(host, 'B')).toBe('')
  })

  it('prunes least recently used cached entries when max is exceeded', async () => {
    const host = document.createElement('div')
    const active = signal('A')
    document.body.appendChild(host)

    mountKeepAliveSwitch(host, {
      active,
      max: 2,
      views: {
        A: createInputView('A'),
        B: createInputView('B'),
        C: createInputView('C'),
      },
    })
    await flush()

    setInputValue(host, 'A', 'alpha')
    active.set('B')
    await flush()
    setInputValue(host, 'B', 'beta')
    active.set('C')
    await flush()

    active.set('A')
    await flush()
    expect(getInputValue(host, 'A')).toBe('')
  })

  it('fires activation lifecycle hooks when cached components switch', async () => {
    const host = document.createElement('div')
    const active = signal('A')
    const aActivated = vi.fn()
    const aDeactivated = vi.fn()
    const bActivated = vi.fn()
    const bDeactivated = vi.fn()
    document.body.appendChild(host)

    const A: FC = () => {
      onActivated(aActivated)
      onDeactivated(aDeactivated)
      return <div data-testid="panel-A">A</div>
    }
    const B: FC = () => {
      onActivated(bActivated)
      onDeactivated(bDeactivated)
      return <div data-testid="panel-B">B</div>
    }

    mountKeepAliveSwitch(host, {
      active,
      views: { A, B },
    })
    await flush()
    expect(aActivated).toHaveBeenCalledTimes(1)
    expect(bActivated).toHaveBeenCalledTimes(0)

    active.set('B')
    await flush()
    expect(aActivated).toHaveBeenCalledTimes(1)
    expect(aDeactivated).toHaveBeenCalledTimes(1)
    expect(bActivated).toHaveBeenCalledTimes(1)
    expect(bDeactivated).toHaveBeenCalledTimes(0)

    active.set('A')
    await flush()
    expect(aActivated).toHaveBeenCalledTimes(2)
    expect(aDeactivated).toHaveBeenCalledTimes(1)
    expect(bActivated).toHaveBeenCalledTimes(1)
    expect(bDeactivated).toHaveBeenCalledTimes(1)
  })

  it('registers deactivated hooks after component state hooks are used', async () => {
    const host = document.createElement('div')
    const active = signal('A')
    const aDeactivated = vi.fn()
    const bDeactivated = vi.fn()
    document.body.appendChild(host)

    const A: FC = () => {
      const [text] = useState('alpha')
      onDeactivated(() => {
        aDeactivated(text)
      })
      return <div data-testid="panel-A">{text}</div>
    }
    const B: FC = () => {
      const [count] = useState(1)
      onDeactivated(() => {
        bDeactivated(count)
      })
      return <div data-testid="panel-B">{count}</div>
    }

    mountKeepAliveSwitch(host, {
      active,
      views: { A, B },
    })
    await flush()

    active.set('B')
    await flush()
    expect(aDeactivated).toHaveBeenCalledTimes(1)
    expect(aDeactivated).toHaveBeenLastCalledWith('alpha')

    active.set('A')
    await flush()
    expect(bDeactivated).toHaveBeenCalledTimes(1)
    expect(bDeactivated).toHaveBeenLastCalledWith(1)
  })

  it('registers deactivated hooks from compiler-style setup blocks', async () => {
    const host = document.createElement('div')
    const active = signal('A')
    const aDeactivated = vi.fn()
    const bDeactivated = vi.fn()
    document.body.appendChild(host)

    const A: FC = () => {
      const state = useSetup(() => {
        const [text] = useState('alpha')
        onDeactivated(() => {
          aDeactivated(text)
        })
        return { text }
      })
      return <div data-testid="panel-A">{state.text}</div>
    }
    const B: FC = () => {
      const state = useSetup(() => {
        const [count] = useState(1)
        onDeactivated(() => {
          bDeactivated(count)
        })
        return { count }
      })
      return <div data-testid="panel-B">{state.count}</div>
    }

    mountKeepAliveSwitch(host, {
      active,
      views: { A, B },
    })
    await flush()

    active.set('B')
    await flush()
    expect(aDeactivated).toHaveBeenCalledTimes(1)
    expect(aDeactivated).toHaveBeenLastCalledWith('alpha')

    active.set('A')
    await flush()
    expect(bDeactivated).toHaveBeenCalledTimes(1)
    expect(bDeactivated).toHaveBeenLastCalledWith(1)
  })

  it('registers deactivated hooks from compiler-style vapor mount handles', async () => {
    const host = document.createElement('div')
    const active = signal('A')
    const aDeactivated = vi.fn()
    const bDeactivated = vi.fn()
    document.body.appendChild(host)

    const A: FC = () => {
      const state = _$compiledWithHookId('useSetup:keep-alive:A', () =>
        useSetup(() => {
          const [text] = _$compiledWithHookId('useState:keep-alive:A', () => useState('alpha'))
          onDeactivated(() => {
            aDeactivated(text)
          })
          return { text }
        }),
      )
      return vapor(parent => {
        const root = _$createElement('div', parent) as HTMLElement
        root.setAttribute('data-testid', 'panel-A')
        watchEffect(() => {
          _$settextContent(root, state.text)
        })
        return root as any
      }) as any
    }

    const B: FC = () => {
      const state = _$compiledWithHookId('useSetup:keep-alive:B', () =>
        useSetup(() => {
          const [count] = _$compiledWithHookId('useState:keep-alive:B', () => useState(1))
          onDeactivated(() => {
            bDeactivated(count)
          })
          return { count }
        }),
      )
      return vapor(parent => {
        const root = _$createElement('div', parent) as HTMLElement
        root.setAttribute('data-testid', 'panel-B')
        watchEffect(() => {
          _$settextContent(root, String(state.count))
        })
        return root as any
      }) as any
    }

    mountKeepAliveSwitch(host, {
      active,
      views: { A, B },
    })
    await flush()

    active.set('B')
    await flush()
    expect(aDeactivated).toHaveBeenCalledTimes(1)
    expect(aDeactivated).toHaveBeenLastCalledWith('alpha')

    active.set('A')
    await flush()
    expect(bDeactivated).toHaveBeenCalledTimes(1)
    expect(bDeactivated).toHaveBeenLastCalledWith(1)
  })

  it('lets deactivated hooks update parent reactive state through props callbacks', async () => {
    const host = document.createElement('div')
    const active = signal('A')
    document.body.appendChild(host)

    const A: FC<{ writeLog: (message: string) => void }> = props => {
      onDeactivated(() => {
        props.writeLog('A deactivated')
      })
      return <div data-testid="panel-A">A</div>
    }
    const B: FC<{ writeLog: (message: string) => void }> = props => {
      onDeactivated(() => {
        props.writeLog('B deactivated')
      })
      return <div data-testid="panel-B">B</div>
    }
    const views: Record<string, FC<{ writeLog: (message: string) => void }>> = { A, B }

    const App: FC = () => {
      const logs = signal<string[]>([])
      const writeLog = (message: string) => {
        logs.set([message, ...logs.get()])
      }

      return vapor(() => {
        const root = document.createDocumentFragment()
        const anchor = document.createComment('keep-alive-anchor')
        const log = document.createElement('output')
        root.appendChild(anchor)
        root.appendChild(log)

        watchEffect(() => {
          const activeName = active.get()
          renderAnchor(
            <KeepAlive>
              <Component is={views[activeName]} key={activeName} writeLog={writeLog} />
            </KeepAlive>,
            root as any,
            anchor as any,
          )
        })
        watchEffect(() => {
          log.textContent = logs.get().join(',')
        })

        return root as any
      }) as any
    }

    render(<App />, host)
    await flush()

    active.set('B')
    await flush()
    expect(host.querySelector('output')?.textContent).toContain('A deactivated')

    active.set('A')
    await flush()
    expect(host.querySelector('output')?.textContent).toContain('B deactivated')
  })

  it('registers deactivated hooks when compiled code mixes rue and rue/vapor entries', async () => {
    const host = document.createElement('div')
    const active = signal('A')
    const aDeactivated = vi.fn()
    const bDeactivated = vi.fn()
    document.body.appendChild(host)

    const A: FC = () => {
      const state = _$compiledWithHookIdFromRueVapor('useSetup:mixed:A', () =>
        useSetupFromRueVapor(() => {
          const [text] = _$compiledWithHookIdFromRueVapor('useState:mixed:A', () =>
            useStateFromRueVapor('alpha'),
          )
          onDeactivatedFromRue(() => {
            aDeactivated(text)
          })
          return { text }
        }),
      )
      return vaporFromRueVapor(parent => {
        const root = _$createElementFromRueVapor('div', parent) as HTMLElement
        root.setAttribute('data-testid', 'panel-A')
        watchEffectFromRueVapor(() => {
          _$settextContentFromRueVapor(root, state.text)
        })
        return root as any
      }) as any
    }

    const B: FC = () => {
      const state = _$compiledWithHookIdFromRueVapor('useSetup:mixed:B', () =>
        useSetupFromRueVapor(() => {
          const [count] = _$compiledWithHookIdFromRueVapor('useState:mixed:B', () =>
            useStateFromRueVapor(1),
          )
          onDeactivatedFromRue(() => {
            bDeactivated(count)
          })
          return { count }
        }),
      )
      return vaporFromRueVapor(parent => {
        const root = _$createElementFromRueVapor('div', parent) as HTMLElement
        root.setAttribute('data-testid', 'panel-B')
        watchEffectFromRueVapor(() => {
          _$settextContentFromRueVapor(root, String(state.count))
        })
        return root as any
      }) as any
    }
    const views: Record<string, FC> = { A, B }

    const App: FC = () =>
      vaporFromRueVapor(() => {
        const root = document.createDocumentFragment()
        const anchor = document.createComment('keep-alive-anchor')
        root.appendChild(anchor)

        watchEffectFromRueVapor(() => {
          const activeName = active.get()
          renderAnchorFromRueVapor(
            <RueKeepAlive>
              <RueComponent is={views[activeName]} key={activeName} />
            </RueKeepAlive>,
            root as any,
            anchor as any,
          )
        })

        return root as any
      }) as any

    render(<App />, host)
    await flush()

    active.set('B')
    await flush()
    expect(aDeactivated).toHaveBeenCalledTimes(1)
    expect(aDeactivated).toHaveBeenLastCalledWith('alpha')

    active.set('A')
    await flush()
    expect(bDeactivated).toHaveBeenCalledTimes(1)
    expect(bDeactivated).toHaveBeenLastCalledWith(1)
  })

  it('keeps deactivated hooks through a nested compiled KeepAlive viewport', async () => {
    const host = document.createElement('div')
    const aDeactivated = vi.fn()
    const bDeactivated = vi.fn()
    let activePanelRef: { value: string } | null = null
    document.body.appendChild(host)

    const A: FC<{ writeLog: (message: string) => void }> = props => {
      const state = _$compiledWithHookIdFromRueVapor('useSetup:nested:A', () =>
        useSetupFromRueVapor(() => {
          const [text] = _$compiledWithHookIdFromRueVapor('useState:nested:A', () =>
            useStateFromRueVapor('alpha'),
          )
          onDeactivatedFromRue(() => {
            props.writeLog(text)
          })
          return { text }
        }),
      )
      return vaporFromRueVapor(parent => {
        const root = _$createElementFromRueVapor('div', parent) as HTMLElement
        root.setAttribute('data-testid', 'panel-A')
        watchEffectFromRueVapor(() => {
          _$settextContentFromRueVapor(root, state.text)
        })
        return root as any
      }) as any
    }
    const B: FC<{ writeLog: (message: string) => void }> = props => {
      const state = _$compiledWithHookIdFromRueVapor('useSetup:nested:B', () =>
        useSetupFromRueVapor(() => {
          const [count] = _$compiledWithHookIdFromRueVapor('useState:nested:B', () =>
            useStateFromRueVapor(1),
          )
          onDeactivatedFromRue(() => {
            props.writeLog(String(count))
          })
          return { count }
        }),
      )
      return vaporFromRueVapor(parent => {
        const root = _$createElementFromRueVapor('div', parent) as HTMLElement
        root.setAttribute('data-testid', 'panel-B')
        watchEffectFromRueVapor(() => {
          _$settextContentFromRueVapor(root, String(state.count))
        })
        return root as any
      }) as any
    }
    const views: Record<string, FC<{ writeLog: (message: string) => void }>> = { A, B }

    const KeepAliveViewport: FC<{
      activePanel: { value: string }
      writeLog: (message: string) => void
    }> = props =>
      vaporFromRueVapor(() => {
        const root = document.createDocumentFragment()
        const anchor = document.createComment('nested-keep-alive-anchor')
        root.appendChild(anchor)

        watchEffectFromRueVapor(() => {
          const slot = (
            <RueKeepAlive>
              <RueComponent
                is={views[props.activePanel.value]}
                key={props.activePanel.value}
                writeLog={props.writeLog}
              />
            </RueKeepAlive>
          )
          untrackFromRueVapor(() => renderAnchorFromRueVapor(slot, root as any, anchor as any))
        })

        return root as any
      }) as any

    const App: FC = () => {
      const setup = _$compiledWithHookIdFromRueVapor('useSetup:nested:App', () =>
        useSetupFromRueVapor(() => {
          const activePanel = _$compiledWithHookIdFromRueVapor('ref:nested:active', () =>
            refFromRueVapor('A'),
          )
          activePanelRef = activePanel
          const writeLog = (message: string) => {
            if (message === 'alpha') {
              aDeactivated(message)
            } else {
              bDeactivated(message)
            }
          }
          return { activePanel, writeLog }
        }),
      )
      const { activePanel, writeLog } = setup

      return vaporFromRueVapor(() => {
        const root = document.createDocumentFragment()
        const anchor = document.createComment('viewport-anchor')
        root.appendChild(anchor)

        watchEffectFromRueVapor(() => {
          const slot = <KeepAliveViewport activePanel={activePanel} writeLog={writeLog} />
          untrackFromRueVapor(() => renderAnchorFromRueVapor(slot, root as any, anchor as any))
        })

        return root as any
      }) as any
    }

    render(<App />, host)
    await flush()

    expect(host.querySelector('[data-testid="panel-A"]')).not.toBeNull()
    expect(activePanelRef).not.toBeNull()

    activePanelRef!.value = 'B'
    await flush()
    expect(aDeactivated).toHaveBeenCalledTimes(1)
    expect(aDeactivated).toHaveBeenLastCalledWith('alpha')

    activePanelRef!.value = 'A'
    await flush()
    expect(bDeactivated).toHaveBeenCalledTimes(1)
    expect(bDeactivated).toHaveBeenLastCalledWith('1')
  })

  it('switches keyed dynamic views that share the same inner component type', async () => {
    const host = document.createElement('div')
    const active = signal('profile')
    const clickHits: Record<string, number> = { profile: 0, settings: 0 }
    const unmountedHits: Record<string, number> = { profile: 0, settings: 0 }
    document.body.appendChild(host)

    const Panel: FC<{ name: string }> = props => {
      const clicks = signal(0)
      onUnmounted(() => {
        unmountedHits[props.name] += 1
      })
      return (
        <section data-testid={`panel-${props.name}`}>
          <h2>{props.name}</h2>
          <button
            data-testid={`count-${props.name}`}
            onClick={() => {
              clickHits[props.name] += 1
              clicks.set(clicks.get() + 1)
            }}
          >
            {clicks.get()}
          </button>
        </section>
      )
    }

    const views: Record<string, FC> = {
      profile: () => <Panel name="profile" />,
      settings: () => <Panel name="settings" />,
    }

    mountKeepAliveSwitch(host, {
      active,
      views,
    })
    await flush()

    expect(host.querySelector('[data-testid="panel-profile"]')).not.toBeNull()
    expect(host.querySelector('[data-testid="panel-settings"]')).toBeNull()
    ;(host.querySelector('[data-testid="count-profile"]') as HTMLButtonElement).click()
    await flush()
    expect(clickHits.profile).toBe(1)
    expect(host.querySelector('[data-testid="count-profile"]')?.textContent).toBe('1')

    active.set('settings')
    await flush()
    expect(unmountedHits.profile).toBe(0)
    expect(host.querySelector('[data-testid="panel-profile"]')).toBeNull()
    expect(host.querySelector('[data-testid="panel-settings"]')).not.toBeNull()
    ;(host.querySelector('[data-testid="count-settings"]') as HTMLButtonElement).click()
    await flush()
    expect(clickHits.settings).toBe(1)
    expect(host.querySelector('[data-testid="count-settings"]')?.textContent).toBe('1')

    active.set('profile')
    await flush()
    expect(unmountedHits.profile).toBe(0)
    expect(unmountedHits.settings).toBe(0)
    expect(host.querySelector('[data-testid="panel-profile"]')).not.toBeNull()
    expect(host.querySelector('[data-testid="panel-settings"]')).toBeNull()
    expect(host.querySelector('[data-testid="count-profile"]')?.textContent).toBe('1')
    ;(host.querySelector('[data-testid="count-profile"]') as HTMLButtonElement).click()
    await flush()
    expect(clickHits.profile).toBe(2)
    expect(host.querySelector('[data-testid="count-profile"]')?.textContent).toBe('2')
  })

  it('fires lifecycle hooks registered through the Vapor entry', async () => {
    const host = document.createElement('div')
    const active = signal('A')
    const aActivated = vi.fn()
    const aDeactivated = vi.fn()
    const bActivated = vi.fn()
    const bDeactivated = vi.fn()
    document.body.appendChild(host)

    const A: FC = () => {
      onActivatedFromVapor(aActivated)
      onDeactivatedFromVapor(aDeactivated)
      return <div data-testid="panel-A">A</div>
    }
    const B: FC = () => {
      onActivatedFromVapor(bActivated)
      onDeactivatedFromVapor(bDeactivated)
      return <div data-testid="panel-B">B</div>
    }

    mountKeepAliveSwitch(host, {
      active,
      views: { A, B },
    })
    await flush()
    expect(aActivated).toHaveBeenCalledTimes(1)
    expect(bActivated).toHaveBeenCalledTimes(0)

    active.set('B')
    await flush()
    expect(aActivated).toHaveBeenCalledTimes(1)
    expect(aDeactivated).toHaveBeenCalledTimes(1)
    expect(bActivated).toHaveBeenCalledTimes(1)
    expect(bDeactivated).toHaveBeenCalledTimes(0)

    active.set('A')
    await flush()
    expect(aActivated).toHaveBeenCalledTimes(2)
    expect(aDeactivated).toHaveBeenCalledTimes(1)
    expect(bActivated).toHaveBeenCalledTimes(1)
    expect(bDeactivated).toHaveBeenCalledTimes(1)
  })
})
