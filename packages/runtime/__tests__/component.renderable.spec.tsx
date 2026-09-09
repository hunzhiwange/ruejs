import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import swc from '@swc/core'
import {
  _$appendChild as _$compiledAppendChild,
  _$createComment as _$compiledCreateComment,
  _$createElement as _$compiledCreateElement,
  _$spreadAttributes as _$compiledSpreadAttributes,
  renderAnchor as _$compiledRenderAnchor,
  _$compiledRoot as _$compiledVapor,
  watchEffect as _$compiledWatchEffect,
} from './legacy-test-render'
import { _$createDynamic, _$createFragment } from './legacy-test-render'
import { afterEach, describe, expect, it } from 'vitest'

import {
  Component,
  Teleport,
  render,
  renderAnchor,
  setReactiveScheduling,
  signal,
  useSetup,
  useState,
  useApp,
  watchEffect,
  type FC,
} from '../src'
import {
  _$createComponent,
  _$compiledMarkComponentRenderReactive,
  _$compiledWithHookId,
} from './legacy-test-render'
import { _$compiledRoot } from './legacy-test-render'
import { waitForContent } from './page-test-utils'

void watchEffect

const createLegacyVapor = (renderFn: Parameters<typeof _$compiledVapor>[0]) =>
  _$compiledVapor(renderFn)

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
})

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const compileRuntimeFixture = (source: string) => {
  const pluginPath = resolve(process.cwd(), 'packages/swc-plugin-rue/swc-plugin-rue.wasm')
  expect(readFileSync(pluginPath).byteLength).toBeGreaterThan(0)
  return swc.transformSync(source, {
    filename: 'runtime-compiler-only-fixture.tsx',
    jsc: {
      parser: { syntax: 'typescript', tsx: true },
      target: 'es2020',
      transform: {
        react: {
          runtime: 'automatic',
          importSource: '@rue-js',
          development: false,
          throwIfNamespace: false,
        },
      },
      experimental: { plugins: [[pluginPath, {}]] },
    },
    module: { type: 'es6' },
  }).code
}

describe('Component renderable boundary', () => {
  it('compiles representative runtime TSX without a tree factory or JSX runtime fallback', () => {
    const output = compileRuntimeFixture(`
      const Child = props => <strong>{props.label}</strong>
      export const View = () => <main><Child label="compiled" /></main>
    `)

    expect(output).toContain('_$mountCompiledSlotAt')
    expect(output).toContain('_$mountCompiledSlotFactory')
    expect(output).not.toContain('renderAnchor')
    expect(output).not.toMatch(/\bh\s*\(/)
    expect(output).not.toContain('jsx-runtime')
  })

  it('tracks an explicitly marked portable JSX render closure', async () => {
    const host = document.createElement('div')
    const active = signal(false)
    const Preview = _$compiledMarkComponentRenderReactive((() =>
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('button', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            'data-testid': 'reactive-preview',
            onClick: () => active.set(!active.get()),
            children: active.get() ? 'active' : 'idle',
          } as Record<string, any>
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })) as FC)

    document.body.appendChild(host)
    render(_$createDynamic(Preview, null) as any, host)
    await flush()

    const button = host.querySelector('[data-testid="reactive-preview"]') as HTMLButtonElement
    expect(button.textContent).toBe('idle')

    button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await flush()

    expect(host.querySelector('[data-testid="reactive-preview"]')?.textContent).toBe('active')
  })

  it('mounts class components through portable component handles', async () => {
    const host = document.createElement('div')

    document.body.appendChild(host)

    class ClassShell {
      props: { label: string }

      constructor(props: { label: string }) {
        this.props = props
      }

      render() {
        return _$compiledVapor(_$parentContext => {
          const _$root = _$compiledCreateElement('span', _$parentContext)
          const _$anchor = _$compiledCreateComment('rue:children:anchor')
          _$compiledAppendChild(_$root, _$anchor)
          _$compiledWatchEffect(() => {
            const { children: _$children, ..._$attributes } = {
              'data-testid': 'class-shell',
              children: this.props.label,
            } as Record<string, any>
            _$compiledSpreadAttributes(_$root, _$attributes)
            _$compiledRenderAnchor(_$children, _$root, _$anchor)
          })
          return _$root
        })
      }
    }

    render(_$createDynamic(ClassShell as any, { label: 'class' }) as any, host)
    await flush()

    expect(host.querySelector('[data-testid="class-shell"]')?.textContent).toBe('class')
  })

  it('routes descendant render errors to class component error boundaries', async () => {
    const host = document.createElement('div')
    const thrown = new Error('boundary boom')
    let caught: unknown
    let catchCount = 0

    document.body.appendChild(host)

    class Boundary {
      props: { children?: unknown; onCatch?: () => void }
      state: { error: unknown | null }

      constructor(props: { children?: unknown; onCatch?: () => void }) {
        this.props = props
        this.state = { error: null }
      }

      static getDerivedStateFromError(error: unknown) {
        return { error }
      }

      componentDidCatch(error: unknown) {
        caught = error
        this.props.onCatch?.()
      }

      render() {
        return this.state.error ? null : this.props.children
      }
    }

    const Thrower = () => {
      throw thrown
    }

    render(
      _$createDynamic(Boundary as any, {
        onCatch: () => catchCount++,
        children: _$createDynamic(Thrower as any, null),
      }) as any,
      host,
    )
    await flush()

    expect(caught).toBe(thrown)
    expect(catchCount).toBe(1)
    expect(host.textContent).toBe('')
  })

  it('renders a native element when is is a tag string', async () => {
    const host = document.createElement('div')

    document.body.appendChild(host)

    render(
      _$createDynamic('a', {
        href: '#docs',
        'data-testid': 'link',
        children: 'docs',
      }),
      host,
    )
    await flush()

    const link = host.querySelector('[data-testid="link"]') as HTMLAnchorElement | null

    expect(link?.tagName.toLowerCase()).toBe('a')
    expect(link?.getAttribute('href')).toBe('#docs')
    expect(host.textContent).toBe('docs')
  })

  it('renders nothing for missing or reserved dynamic targets', async () => {
    const host = document.createElement('div')

    document.body.appendChild(host)

    render(
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('section', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            children: [
              _$createDynamic((null as any) === 'component' ? null : (null as any), {
                children: 'missing',
              }),
              // eslint-disable-next-line no-constant-condition -- exercises compile-time reserved-tag handling
              _$createDynamic('component' === 'component' ? null : 'component', {
                children: 'reserved',
              }),
              _$createDynamic(Component, { is: Component, children: 'self' }),
            ],
          } as Record<string, any>
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      }),
      host,
    )
    await flush()

    const section = host.querySelector('section')

    expect(section?.textContent).toBe('')
    expect(section?.children).toHaveLength(0)
  })

  it('switches the same dynamic component instance between native and component targets', async () => {
    const host = document.createElement('div')
    const asComponent = signal(false)
    const label = signal('alpha')

    document.body.appendChild(host)

    const StrongView: FC = props =>
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('strong', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            'data-testid': 'strong',
            children: props.children,
          } as Record<string, any>
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })

    const App: FC = () =>
      _$compiledRoot(() => {
        const root = document.createDocumentFragment()
        const anchor = document.createComment('rue:component:anchor')

        root.appendChild(anchor)

        _$compiledWatchEffect(() => {
          const target = asComponent.get() ? StrongView : 'span'
          renderAnchor(
            _$createDynamic(target, { 'data-testid': 'dynamic', children: label.get() }),
            root as any,
            anchor as any,
          )
        })

        return root as any
      }) as any

    render(_$createDynamic(App, null), host)
    await flush()

    expect(host.querySelector('[data-testid="dynamic"]')?.tagName.toLowerCase()).toBe('span')
    expect(host.textContent).toBe('alpha')

    asComponent.set(true)
    label.set('beta')
    await flush()

    expect(host.querySelector('[data-testid="strong"]')?.tagName.toLowerCase()).toBe('strong')
    expect(host.querySelector('[data-testid="dynamic"]')).toBeNull()
    expect(host.textContent).toBe('beta')
  })

  it('resolves registered string component names through useApp().component()', async () => {
    const host = document.createElement('div')

    document.body.appendChild(host)

    const CardView: FC = props =>
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('article', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            'data-testid': 'card',
            children: props.children,
          } as Record<string, any>
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })
    const App: FC = () => _$createDynamic(Component, { is: 'CardView', children: 'registered' })

    useApp(App).component('CardView', CardView).mount(host)

    await waitForContent(() => {
      expect(host.querySelector('[data-testid="card"]')?.tagName.toLowerCase()).toBe('article')
      expect(host.textContent).toBe('registered')
    })
  })

  it('updates wrapper props when a component renders svg children', async () => {
    const host = document.createElement('div')
    const active = signal(true)

    document.body.appendChild(host)

    const Shell: FC<{ active: boolean }> = props =>
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('div', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            'data-testid': 'shell',
            className: props.active ? 'on' : 'off',
            children: props.children,
          } as Record<string, any>
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })

    const App: FC = () =>
      _$compiledRoot(() => {
        const root = document.createDocumentFragment()
        const anchor = document.createComment('rue:component:anchor')

        root.appendChild(anchor)

        _$compiledWatchEffect(() => {
          renderAnchor(
            _$createDynamic(Shell, {
              active: active.get(),
              children: _$compiledVapor(_$parentContext => {
                const _$root = _$compiledCreateElement('svg', _$parentContext)
                const _$anchor = _$compiledCreateComment('rue:children:anchor')
                _$compiledAppendChild(_$root, _$anchor)
                _$compiledWatchEffect(() => {
                  const { children: _$children, ..._$attributes } = {
                    'data-testid': 'shell-icon',
                    viewBox: '0 0 10 10',
                    'aria-hidden': 'true',
                    children: _$compiledVapor(_$parentContext => {
                      const _$root = _$compiledCreateElement('circle', _$parentContext)
                      const _$anchor = _$compiledCreateComment('rue:children:anchor')
                      _$compiledAppendChild(_$root, _$anchor)
                      _$compiledWatchEffect(() => {
                        const { children: _$children, ..._$attributes } = {
                          cx: '5',
                          cy: '5',
                          r: '4',
                        } as Record<string, any>
                        _$compiledSpreadAttributes(_$root, _$attributes)
                        _$compiledRenderAnchor(_$children, _$root, _$anchor)
                      })
                      return _$root
                    }),
                  } as Record<string, any>
                  _$compiledSpreadAttributes(_$root, _$attributes)
                  _$compiledRenderAnchor(_$children, _$root, _$anchor)
                })
                return _$root
              }),
            }),
            root as any,
            anchor as any,
          )
        })

        return root as any
      }) as any

    render(_$createDynamic(App, null), host)
    await flush()

    expect((host.querySelector('[data-testid="shell"]') as HTMLElement).className).toContain('on')
    expect(host.querySelectorAll('[data-testid="shell-icon"]')).toHaveLength(1)

    active.set(false)
    await flush()

    expect((host.querySelector('[data-testid="shell"]') as HTMLElement).className).toContain('off')
    expect((host.querySelector('[data-testid="shell"]') as HTMLElement).className).not.toContain(
      'on',
    )
    expect(host.querySelectorAll('[data-testid="shell-icon"]')).toHaveLength(1)
  })

  it('replays renderable props nested inside component handles on the same anchor', async () => {
    const host = document.createElement('div')
    const iconTone = signal<'mail' | 'bell'>('mail')

    document.body.appendChild(host)

    const MailGlyph: FC = () =>
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('svg', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            'data-testid': 'mail-icon',
            viewBox: '0 0 10 10',
            'aria-hidden': 'true',
            children: _$compiledVapor(_$parentContext => {
              const _$root = _$compiledCreateElement('rect', _$parentContext)
              const _$anchor = _$compiledCreateComment('rue:children:anchor')
              _$compiledAppendChild(_$root, _$anchor)
              _$compiledWatchEffect(() => {
                const { children: _$children, ..._$attributes } = {
                  x: '1',
                  y: '2',
                  width: '8',
                  height: '6',
                  rx: '1',
                } as Record<string, any>
                _$compiledSpreadAttributes(_$root, _$attributes)
                _$compiledRenderAnchor(_$children, _$root, _$anchor)
              })
              return _$root
            }),
          } as Record<string, any>
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })

    const BellGlyph: FC = () =>
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('svg', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            'data-testid': 'bell-icon',
            viewBox: '0 0 10 10',
            'aria-hidden': 'true',
            children: _$compiledVapor(_$parentContext => {
              const _$root = _$compiledCreateElement('path', _$parentContext)
              const _$anchor = _$compiledCreateComment('rue:children:anchor')
              _$compiledAppendChild(_$root, _$anchor)
              _$compiledWatchEffect(() => {
                const { children: _$children, ..._$attributes } = {
                  d: 'M5 1.5a2.5 2.5 0 0 1 2.5 2.5c0 2 .8 2.8.8 2.8H1.7S2.5 6 2.5 4A2.5 2.5 0 0 1 5 1.5Z',
                } as Record<string, any>
                _$compiledSpreadAttributes(_$root, _$attributes)
                _$compiledRenderAnchor(_$children, _$root, _$anchor)
              })
              return _$root
            }),
          } as Record<string, any>
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })

    const IconShell: FC<{ icon: any; label: string }> = props =>
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('button', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            'data-testid': 'icon-shell',
            children: [
              props.icon,
              _$compiledVapor(_$parentContext => {
                const _$root = _$compiledCreateElement('span', _$parentContext)
                const _$anchor = _$compiledCreateComment('rue:children:anchor')
                _$compiledAppendChild(_$root, _$anchor)
                _$compiledWatchEffect(() => {
                  const { children: _$children, ..._$attributes } = {
                    children: props.label,
                  } as Record<string, any>
                  _$compiledSpreadAttributes(_$root, _$attributes)
                  _$compiledRenderAnchor(_$children, _$root, _$anchor)
                })
                return _$root
              }),
            ],
          } as Record<string, any>
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })

    const App: FC = () =>
      _$compiledRoot(() => {
        const root = document.createDocumentFragment()
        const anchor = document.createComment('rue:component:renderable-prop-anchor')

        root.appendChild(anchor)

        _$compiledWatchEffect(() => {
          renderAnchor(
            _$createDynamic(IconShell, {
              icon:
                iconTone.get() === 'mail'
                  ? _$createDynamic(MailGlyph, null)
                  : _$createDynamic(BellGlyph, null),
              label: 'channel',
            }),
            root as any,
            anchor as any,
          )
        })

        return root as any
      }) as any

    render(_$createDynamic(App, null), host)
    await flush()

    expect(host.querySelector('[data-testid="mail-icon"]')).toBeTruthy()
    expect(host.querySelector('[data-testid="bell-icon"]')).toBeNull()
    expect(host.textContent).toContain('channel')

    iconTone.set('bell')
    await flush()

    expect(host.querySelector('[data-testid="mail-icon"]')).toBeNull()
    expect(host.querySelector('[data-testid="bell-icon"]')).toBeTruthy()
    expect(host.textContent).toContain('channel')
  })

  it('keeps state value props read by compiled child components live across updates', async () => {
    const host = document.createElement('div')
    let setCount: (value: number | ((previous: number) => number)) => void = () => {}

    document.body.appendChild(host)

    const CounterValue: FC<{ count: number }> = props =>
      _$compiledRoot(() => {
        const root = document.createElement('span')
        const anchor = document.createComment('rue:counter-value')

        root.setAttribute('data-testid', 'counter-value')
        root.appendChild(anchor)

        _$compiledWatchEffect(() => {
          renderAnchor(props.count, root as any, anchor as any)
        })

        return root as any
      }) as any

    const App: FC = _$compiledMarkComponentRenderReactive(() => {
      const [count, updateCount] = useState(0)
      setCount = updateCount

      return _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('section', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            children: _$createDynamic(CounterValue, { count }),
          } as Record<string, any>
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })
    })

    render(_$createDynamic(App, null), host)
    await flush()

    expect(host.querySelector('[data-testid="counter-value"]')?.textContent).toBe('0')

    setCount(previous => previous + 1)
    await flush()

    expect(host.querySelector('[data-testid="counter-value"]')?.textContent).toBe('1')

    setCount(previous => previous + 1)
    await flush()

    expect(host.querySelector('[data-testid="counter-value"]')?.textContent).toBe('2')

    setCount(0)
    await flush()

    expect(host.querySelector('[data-testid="counter-value"]')?.textContent).toBe('0')
  })

  it('preserves nested component setup state when a parent JSX host rerenders', async () => {
    const host = document.createElement('div')
    const target = document.createElement('aside')

    document.body.append(host, target)

    const FormatPicker: FC<{ color: string }> = props => {
      const format = useSetup(() => signal('hex'))
      return (
        <div data-testid="format-picker" data-color={props.color}>
          <Teleport to={target}>
            <button data-testid="format" onClick={() => format.set('rgb')}>
              {format.get()}
            </button>
          </Teleport>
        </div>
      )
    }

    const Parent: FC = () => {
      const color = useSetup(() => signal('#1677ff'))
      return (
        <section>
          <button data-testid="update-color" onClick={() => color.set('#22c55e')}>
            update
          </button>
          <FormatPicker color={color.get()} />
        </section>
      )
    }

    render(_$createDynamic(Parent, null), host)
    await flush()

    ;(target.querySelector('[data-testid="format"]') as HTMLButtonElement).click()
    await flush()
    expect(target.textContent).toBe('rgb')

    ;(host.querySelector('[data-testid="update-color"]') as HTMLButtonElement).click()
    await flush()

    expect(host.querySelector('[data-testid="format-picker"]')?.getAttribute('data-color')).toBe(
      '#22c55e',
    )
    expect(target.textContent).toBe('rgb')
  })

  it('replays component children after a props.children branch is unmounted and shown again', async () => {
    const host = document.createElement('div')
    const showingPreview = signal(true)

    document.body.appendChild(host)

    const CounterValue: FC<{ count: number }> = props =>
      _$compiledRoot(() => {
        const root = document.createElement('span')
        const anchor = document.createComment('rue:counter-value')

        root.setAttribute('data-testid', 'counter-value')
        root.appendChild(anchor)

        _$compiledWatchEffect(() => {
          renderAnchor(props.count, root as any, anchor as any)
        })

        return root as any
      }) as any

    const CounterDemo: FC = _$compiledMarkComponentRenderReactive(() => {
      const [count, setCount] = useState(0)

      return _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('div', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            children: [
              _$createDynamic(CounterValue, { count }),
              _$compiledVapor(_$parentContext => {
                const _$root = _$compiledCreateElement('button', _$parentContext)
                const _$anchor = _$compiledCreateComment('rue:children:anchor')
                _$compiledAppendChild(_$root, _$anchor)
                _$compiledWatchEffect(() => {
                  const { children: _$children, ..._$attributes } = {
                    onClick: () => setCount(previous => previous + 1),
                    children: '+1',
                  } as Record<string, any>
                  _$compiledSpreadAttributes(_$root, _$attributes)
                  _$compiledRenderAnchor(_$children, _$root, _$anchor)
                })
                return _$root
              }),
            ],
          } as Record<string, any>
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })
    })

    const renderPlaygroundContent = (props: { children?: unknown }) => {
      const createContent = (testId: string, children: unknown) =>
        createLegacyVapor(_$parentContext => {
          const _$root = _$compiledCreateElement('section', _$parentContext)
          const _$anchor = _$compiledCreateComment('rue:children:anchor')
          _$compiledAppendChild(_$root, _$anchor)
          _$compiledWatchEffect(() => {
            const { children: _$children, ..._$attributes } = {
              'data-testid': testId,
              children,
            } as Record<string, any>
            _$compiledSpreadAttributes(_$root, _$attributes)
            _$compiledRenderAnchor(_$children, _$root, _$anchor)
          })
          return _$root
        })
      const content = showingPreview.get()
        ? createContent('preview', props.children)
        : createContent('code', 'code')

      return _$compiledRoot(() => {
        const root = document.createDocumentFragment()
        const anchor = document.createComment('rue:playground-content')

        root.appendChild(anchor)
        renderAnchor(_$createComponent(MockSidebar, { children: content }), root as any, anchor)

        return root as any
      }) as any
    }

    const PreviewSwitcher: FC = props =>
      _$compiledRoot(() => {
        const root = document.createDocumentFragment()
        const anchor = document.createComment('rue:preview-switcher')

        root.appendChild(anchor)

        _$compiledWatchEffect(() => {
          renderAnchor(renderPlaygroundContent(props), root as any, anchor as any)
        })

        return root as any
      }) as any

    const MockSidebar: FC = props =>
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('div', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            'data-testid': 'mock-sidebar',
            children: props.children,
          } as Record<string, any>
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })

    const ExamplePage: FC = () => {
      const child = _$createComponent(CounterDemo, {})

      return _$compiledRoot(() => {
        const root = document.createDocumentFragment()
        const anchor = document.createComment('rue:compiled-page')

        root.appendChild(anchor)

        _$compiledWatchEffect(() => {
          renderAnchor(_$createComponent(PreviewSwitcher, { children: child }), root as any, anchor)
        })

        return root as any
      }) as any
    }

    render(_$createDynamic(ExamplePage, null), host)
    await flush()

    expect(host.querySelector('[data-testid="counter-value"]')?.textContent).toBe('0')

    ;(host.querySelector('button') as HTMLButtonElement).click()
    await flush()

    expect(host.querySelector('[data-testid="counter-value"]')?.textContent).toBe('1')

    showingPreview.set(false)
    await flush()

    expect(host.querySelector('[data-testid="counter-value"]')).toBeNull()
    expect(host.querySelector('[data-testid="code"]')?.textContent).toBe('code')

    showingPreview.set(true)
    await flush()

    expect(host.querySelector('[data-testid="counter-value"]')?.textContent).toBe('0')

    ;(host.querySelector('button') as HTMLButtonElement).click()
    await flush()

    expect(host.querySelector('[data-testid="counter-value"]')?.textContent).toBe('1')
  })
})
