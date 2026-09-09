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
import { describe, expect, it, vi } from 'vitest'

import {
  computed,
  customRef,
  onServerPrefetch,
  ref,
  renderAnchor,
  runServerPrefetch,
  setReactiveScheduling,
  signal,
  Suspense,
  TransitionGroup,
  useComponent,
  watchEffect,
  type FC,
} from '@rue-js/rue'
import { _$compiledRoot } from './legacy-test-render'
import {
  _$appendChild,
  _$createComment,
  _$createDocumentFragment,
  _$createElement,
  _$createTextNode,
} from '@rue-js/runtime'
import { _$template as compiledTemplate } from '../src/internal'
import { createCompiledFragmentHandle } from '../src/rue'
import {
  RUE_COMPILED_COMPONENT_FACTORY_KEY,
  RUE_COMPILED_COMPONENT_READ_PROPS_KEY,
} from '../src/compiled-component'
import {
  _$createComponent as _$createVaporComponent,
  renderAnchor as vaporRenderAnchor,
  _$compiledRoot as vaporBlock,
} from './legacy-test-render'
import {
  attachRouter,
  createMemoryHistory,
  createRouter,
  useAsyncRouteComponent,
  RouterLink,
  RouterView,
} from '@rue-js/router'

void watchEffect
import { _$serverElement, renderToString } from '@rue-js/server-renderer'
import { renderToString as renderToStringFromRue } from '@rue-js/rue/server-renderer'

describe('server renderToString', () => {
  it('parses static template text, attributes, comments, and void elements on the server', async () => {
    const getTemplate = compiledTemplate(
      '<section title="Rue &amp; SSR">hello&nbsp;Rue<!--marker--><br><span data-code=&#x52;>!</span></section>',
    )
    // Populate the browser cache first; the server must still resolve its own host template.
    getTemplate()
    const view = _$compiledVapor(_$parentContext => {
      const root = _$compiledCreateElement('main', _$parentContext)
      const first = getTemplate().content.cloneNode(true)
      const second = getTemplate().content.cloneNode(true)
      _$compiledAppendChild(root, first as never)
      _$compiledAppendChild(root, second as never)
      return root
    })

    await expect(renderToString(view)).resolves.toBe(
      '<main><section title="Rue &amp; SSR">hello\u00a0Rue<br><span data-code="R">!</span></section><section title="Rue &amp; SSR">hello\u00a0Rue<br><span data-code="R">!</span></section></main>',
    )
  })

  it('unwraps branded refs only at final child positions', async () => {
    const direct = ref('direct')
    const source = ref(2)
    const derived = computed(() => source.value * 2)
    let customValue = 'custom'
    const customized = customRef<string>(() => ({
      get: () => customValue,
      set: value => {
        customValue = value
      },
    }))
    const conditional = source.value === 2 ? ref('conditional') : 'fallback'
    const arrayLeaf = ref('array-leaf')
    const heldArray = ref(['held-array', ref('nested-ref')])
    const attributeRef = ref('attribute-value')

    const html = await renderToString(
      _$serverElement('div', { 'data-ref': attributeRef }, [
        direct,
        '|',
        derived,
        '|',
        customized,
        '|',
        conditional,
        '|',
        ['array:', arrayLeaf],
        '|',
        heldArray,
      ]),
    )

    expect(html).toBe(
      '<div data-ref="&quot;attribute-value&quot;">direct|4|custom|conditional|array:array-leaf|held-arraynested-ref</div>',
    )
    expect(html).not.toContain('data-ref="attribute-value"')

    const plainValueObject = { value: 'plain' }
    await expect(renderToString(plainValueObject as any)).resolves.toBe('')
  })

  it('renders every child from a compiled Fragment protocol snapshot', async () => {
    const fragment = createCompiledFragmentHandle([
      _$compiledVapor(_$parentContext => {
        const root = _$compiledCreateElement('strong', _$parentContext)
        const anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(root, anchor)
        _$compiledWatchEffect(() => {
          _$compiledRenderAnchor('first', root, anchor)
        })
        return root
      }),
      ' between ',
      _$compiledVapor(_$parentContext => {
        const root = _$compiledCreateElement('em', _$parentContext)
        const anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(root, anchor)
        _$compiledWatchEffect(() => {
          _$compiledRenderAnchor('last', root, anchor)
        })
        return root
      }),
    ])
    ;(fragment as unknown as { __rue_compiled_mount: () => null }).__rue_compiled_mount = () => null
    Reflect.deleteProperty(fragment as object, '__rue_repeatable_mount_factory__')

    await expect(renderToString(fragment)).resolves.toBe(
      '<strong>first</strong> between <em>last</em>',
    )
  })

  it('aggregates asynchronous server-prefetch hooks in registration order', async () => {
    const events: string[] = []
    let resolveFirst!: () => void
    let resolveSecond!: () => void
    const first = new Promise<void>(resolve => {
      resolveFirst = resolve
    })
    const second = new Promise<void>(resolve => {
      resolveSecond = resolve
    })

    onServerPrefetch(async () => {
      events.push('first:start')
      await first
      events.push('first:end')
      return 'first'
    })
    onServerPrefetch(async () => {
      events.push('second:start')
      await second
      events.push('second:end')
      return 'second'
    })

    const pending = runServerPrefetch()
    expect(events).toEqual(['first:start', 'second:start'])

    resolveSecond()
    await Promise.resolve()
    expect(events).toEqual(['first:start', 'second:start', 'second:end'])

    resolveFirst()
    await expect(pending).resolves.toEqual(['first', 'second'])
    expect(events).toEqual(['first:start', 'second:start', 'second:end', 'first:end'])
  })

  it('renders text and escapes html-sensitive characters', async () => {
    await expect(renderToString('Rue <SSR> & friends')).resolves.toBe(
      'Rue &lt;SSR&gt; &amp; friends',
    )
  })

  it('renders a component tree through the server DOM adapter', async () => {
    const App: FC<{ title: string }> = props =>
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('section', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            class: 'hero',
            'data-title': props.title,
            children: [
              _$compiledVapor(_$parentContext => {
                const _$root = _$compiledCreateElement('h1', _$parentContext)
                const _$anchor = _$compiledCreateComment('rue:children:anchor')
                _$compiledAppendChild(_$root, _$anchor)
                _$compiledWatchEffect(() => {
                  const { children: _$children, ..._$attributes } = {
                    children: props.title,
                  } as Record<string, any>
                  _$compiledSpreadAttributes(_$root, _$attributes)
                  _$compiledRenderAnchor(_$children, _$root, _$anchor)
                })
                return _$root
              }),
              _$compiledVapor(_$parentContext => {
                const _$root = _$compiledCreateElement('input', _$parentContext)
                const _$anchor = _$compiledCreateComment('rue:children:anchor')
                _$compiledAppendChild(_$root, _$anchor)
                _$compiledWatchEffect(() => {
                  const { children: _$children, ..._$attributes } = {
                    disabled: true,
                    value: 'ready',
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

    await expect(renderToString(App, { props: { title: 'Rue SSR' } })).resolves.toBe(
      '<section class="hero" data-title="Rue SSR"><h1>Rue SSR</h1><input disabled value="ready"></section>',
    )
  })

  it('also exposes the renderer from the rue/server-renderer deep import', async () => {
    await expect(
      renderToStringFromRue(
        _$compiledVapor(_$parentContext => {
          const _$root = _$compiledCreateElement('strong', _$parentContext)
          const _$anchor = _$compiledCreateComment('rue:children:anchor')
          _$compiledAppendChild(_$root, _$anchor)
          _$compiledWatchEffect(() => {
            const { children: _$children, ..._$attributes } = { children: 'deep import' } as Record<
              string,
              any
            >
            _$compiledSpreadAttributes(_$root, _$attributes)
            _$compiledRenderAnchor(_$children, _$root, _$anchor)
          })
          return _$root
        }),
      ),
    ).resolves.toBe('<strong>deep import</strong>')
  })

  it('renders portable component handles that return primitive text', async () => {
    const Primitive: FC = () => 'portable text'

    await expect(renderToString(_$createDynamic(Primitive, null))).resolves.toBe('portable text')
  })

  it('renders portable Vapor handles without a global document', async () => {
    const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')
    const view = _$compiledRoot(parent => {
      const root = _$createElement('section', parent)
      _$appendChild(root, _$createTextNode('portable server Vapor'))
      return root
    })

    Reflect.deleteProperty(globalThis, 'document')
    try {
      await expect(renderToString(view)).resolves.toBe('<section>portable server Vapor</section>')
    } finally {
      if (documentDescriptor) {
        Object.defineProperty(globalThis, 'document', documentDescriptor)
      }
    }
  })

  it('normalizes React-compatible and structural protocol elements during SSR', async () => {
    const reactCompatible = {
      $$typeof: Symbol.for('react.transitional.element'),
      type: 'strong',
      props: { children: 'React-compatible SSR' },
    }
    const structural = {
      type: 'em',
      props: { className: 'structural' },
      children: 'Structural SSR',
    }

    await expect(renderToString([reactCompatible, structural] as any)).resolves.toBe(
      '<strong>React-compatible SSR</strong><em class="structural">Structural SSR</em>',
    )
  })

  it('executes compiled component descriptors through the server protocol normalizer', async () => {
    const descriptor = {
      [RUE_COMPILED_COMPONENT_FACTORY_KEY]: (props: Record<string, unknown>) => ({
        $$typeof: Symbol.for('rue.transitional.element'),
        type: 'a',
        props: { href: props.href, children: props.children },
      }),
      [RUE_COMPILED_COMPONENT_READ_PROPS_KEY]: () => ({
        href: '/compiled-link',
        children: 'Compiled link',
      }),
    }

    await expect(renderToString(descriptor as any)).resolves.toBe(
      '<a href="/compiled-link">Compiled link</a>',
    )
  })

  it('renders component children passed through another component during SSR', async () => {
    const BaseWrapper: FC = props =>
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('article', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = { children: props.children } as Record<
            string,
            any
          >
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })
    const Wrapper: FC = props => _$createDynamic(BaseWrapper, { children: props.children })
    const App: FC = () =>
      _$createDynamic(Wrapper, {
        children: _$compiledVapor(_$parentContext => {
          const _$root = _$compiledCreateElement('h1', _$parentContext)
          const _$anchor = _$compiledCreateComment('rue:children:anchor')
          _$compiledAppendChild(_$root, _$anchor)
          _$compiledWatchEffect(() => {
            const { children: _$children, ..._$attributes } = {
              children: 'Nested SSR child',
            } as Record<string, any>
            _$compiledSpreadAttributes(_$root, _$attributes)
            _$compiledRenderAnchor(_$children, _$root, _$anchor)
          })
          return _$root
        }),
      })

    await expect(renderToString(App)).resolves.toBe('<article><h1>Nested SSR child</h1></article>')
  })

  it('renders TransitionGroup children without running browser DOM effects', async () => {
    const App: FC = () =>
      _$createDynamic(TransitionGroup, {
        tag: 'ul',
        name: 'list',
        children: [
          _$compiledVapor(_$parentContext => {
            const _$root = _$compiledCreateElement('li', _$parentContext)
            const _$anchor = _$compiledCreateComment('rue:children:anchor')
            _$compiledAppendChild(_$root, _$anchor)
            _$compiledWatchEffect(() => {
              const { children: _$children, ..._$attributes } = {
                key: 'first',
                children: 'First',
              } as Record<string, any>
              _$compiledSpreadAttributes(_$root, _$attributes)
              _$compiledRenderAnchor(_$children, _$root, _$anchor)
            })
            return _$root
          }),
          _$compiledVapor(_$parentContext => {
            const _$root = _$compiledCreateElement('li', _$parentContext)
            const _$anchor = _$compiledCreateComment('rue:children:anchor')
            _$compiledAppendChild(_$root, _$anchor)
            _$compiledWatchEffect(() => {
              const { children: _$children, ..._$attributes } = {
                key: 'second',
                children: 'Second',
              } as Record<string, any>
              _$compiledSpreadAttributes(_$root, _$attributes)
              _$compiledRenderAnchor(_$children, _$root, _$anchor)
            })
            return _$root
          }),
        ],
      })

    await expect(renderToString(App)).resolves.toBe('<ul><li>First</li><li>Second</li></ul>')
  })

  it('renders JSX children passed through another component during SSR', async () => {
    const BaseWrapper: FC = props =>
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('article', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = { children: props.children } as Record<
            string,
            any
          >
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })
    const Wrapper: FC = props => _$createDynamic(BaseWrapper, { children: props.children })
    const App: FC = () =>
      _$createDynamic(Wrapper, {
        children: [
          _$compiledVapor(_$parentContext => {
            const _$root = _$compiledCreateElement('h1', _$parentContext)
            const _$anchor = _$compiledCreateComment('rue:children:anchor')
            _$compiledAppendChild(_$root, _$anchor)
            _$compiledWatchEffect(() => {
              const { children: _$children, ..._$attributes } = {
                children: 'Nested JSX child',
              } as Record<string, any>
              _$compiledSpreadAttributes(_$root, _$attributes)
              _$compiledRenderAnchor(_$children, _$root, _$anchor)
            })
            return _$root
          }),
          _$compiledVapor(_$parentContext => {
            const _$root = _$compiledCreateElement('p', _$parentContext)
            const _$anchor = _$compiledCreateComment('rue:children:anchor')
            _$compiledAppendChild(_$root, _$anchor)
            _$compiledWatchEffect(() => {
              const { children: _$children, ..._$attributes } = { children: 'Body' } as Record<
                string,
                any
              >
              _$compiledSpreadAttributes(_$root, _$attributes)
              _$compiledRenderAnchor(_$children, _$root, _$anchor)
            })
            return _$root
          }),
        ],
      })

    await expect(renderToString(App)).resolves.toBe(
      '<article><h1>Nested JSX child</h1><p>Body</p></article>',
    )
  })

  it('renders vapor children passed through a renderAnchor slot during SSR', async () => {
    const BaseVaporSlotWrapper: FC = props =>
      vaporBlock(() => {
        const article = _$createElement('article')
        const anchor = _$createComment('slot')
        _$appendChild(article, anchor)

        _$compiledWatchEffect(() => {
          vaporRenderAnchor(props.children as any, article as any, anchor as any)
        })

        return article
      }) as any
    const VaporSlotWrapper: FC = props =>
      vaporBlock(() => {
        const root = _$createDocumentFragment()
        const anchor = _$createComment('component')
        _$appendChild(root, anchor)

        _$compiledWatchEffect(() => {
          vaporRenderAnchor(
            _$createVaporComponent(BaseVaporSlotWrapper, { children: props.children }) as any,
            root as any,
            anchor as any,
          )
        })

        return root
      }) as any
    const App: FC = () =>
      _$createVaporComponent(VaporSlotWrapper, {
        children: vaporBlock(() => {
          const root = _$createDocumentFragment()
          const title = _$createElement('h1')
          _$appendChild(root, title)
          _$appendChild(title, _$createTextNode('Vapor slot child'))
          return root
        }) as any,
      }) as any

    await expect(renderToString(App)).resolves.toBe('<article><h1>Vapor slot child</h1></article>')
  })

  it('renders RouterView with memory history for SSR', async () => {
    const About: FC = () =>
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('h1', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = { children: 'SSR route' } as Record<
            string,
            any
          >
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          component: () =>
            _$compiledVapor(_$parentContext => {
              const _$root = _$compiledCreateElement('h1', _$parentContext)
              const _$anchor = _$compiledCreateComment('rue:children:anchor')
              _$compiledAppendChild(_$root, _$anchor)
              _$compiledWatchEffect(() => {
                const { children: _$children, ..._$attributes } = { children: 'Home' } as Record<
                  string,
                  any
                >
                _$compiledSpreadAttributes(_$root, _$attributes)
                _$compiledRenderAnchor(_$children, _$root, _$anchor)
              })
              return _$root
            }),
        },
        { path: '/about', component: About },
      ],
    })

    attachRouter(router)
    await router.push('/about')
    await router.isReady()

    await expect(renderToString(RouterView)).resolves.toContain('<h1>SSR route</h1>')
  })

  it('waits for lazy route components before SSR RouterView rendering', async () => {
    const LazyRoute = useAsyncRouteComponent(async () => ({
      default: () =>
        _$compiledVapor(_$parentContext => {
          const _$root = _$compiledCreateElement('h1', _$parentContext)
          const _$anchor = _$compiledCreateComment('rue:children:anchor')
          _$compiledAppendChild(_$root, _$anchor)
          _$compiledWatchEffect(() => {
            const { children: _$children, ..._$attributes } = {
              children: 'Lazy SSR route',
            } as Record<string, any>
            _$compiledSpreadAttributes(_$root, _$attributes)
            _$compiledRenderAnchor(_$children, _$root, _$anchor)
          })
          return _$root
        }),
    }))
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          component: () =>
            _$compiledVapor(_$parentContext => {
              const _$root = _$compiledCreateElement('h1', _$parentContext)
              const _$anchor = _$compiledCreateComment('rue:children:anchor')
              _$compiledAppendChild(_$root, _$anchor)
              _$compiledWatchEffect(() => {
                const { children: _$children, ..._$attributes } = { children: 'Home' } as Record<
                  string,
                  any
                >
                _$compiledSpreadAttributes(_$root, _$attributes)
                _$compiledRenderAnchor(_$children, _$root, _$anchor)
              })
              return _$root
            }),
        },
        { path: '/lazy', component: LazyRoute },
      ],
    })

    attachRouter(router)
    await router.push('/lazy')
    await router.isReady()

    await expect(renderToString(RouterView)).resolves.toContain('<h1>Lazy SSR route</h1>')
  })

  it('renders nested RouterView inside a vapor route layout during SSR', async () => {
    const Layout: FC = () =>
      vaporBlock(() => {
        const section = _$createElement('section')
        const anchor = _$createComment('nested-router-view')
        _$appendChild(section, anchor)

        _$compiledWatchEffect(() => {
          vaporRenderAnchor(_$createVaporComponent(RouterView, null) as any, section as any, anchor)
        })

        return section
      }) as any
    const NestedRoute: FC = () =>
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('h1', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            children: 'Nested Vapor route',
          } as Record<string, any>
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          component: () =>
            _$compiledVapor(_$parentContext => {
              const _$root = _$compiledCreateElement('h1', _$parentContext)
              const _$anchor = _$compiledCreateComment('rue:children:anchor')
              _$compiledAppendChild(_$root, _$anchor)
              _$compiledWatchEffect(() => {
                const { children: _$children, ..._$attributes } = { children: 'Home' } as Record<
                  string,
                  any
                >
                _$compiledSpreadAttributes(_$root, _$attributes)
                _$compiledRenderAnchor(_$children, _$root, _$anchor)
              })
              return _$root
            }),
        },
        {
          path: '/parent',
          component: Layout,
          children: [{ path: 'child', component: NestedRoute }],
        },
      ],
    })

    attachRouter(router)
    await router.push('/parent/child')
    await router.isReady()

    await expect(renderToString(RouterView)).resolves.toContain('<h1>Nested Vapor route</h1>')
  })

  it('renders RouterLink as a plain anchor during SSR without an installed router', async () => {
    const LinkApp: FC = () =>
      _$createDynamic(RouterLink, {
        to: '/about',
        children: 'About',
      })

    await expect(renderToString(LinkApp)).resolves.toBe('<a href="/about">About</a>')
  })

  it('ignores lazy hydration strategies while rendering async components on the server', async () => {
    const hydrateStrategy = vi.fn(() => {
      throw new Error('SSR should not install client hydration strategies.')
    })
    const LazyPanel = useComponent({
      loader: async () => ({
        default: () =>
          _$compiledVapor(_$parentContext => {
            const _$root = _$compiledCreateElement('h1', _$parentContext)
            const _$anchor = _$compiledCreateComment('rue:children:anchor')
            _$compiledAppendChild(_$root, _$anchor)
            _$compiledWatchEffect(() => {
              const { children: _$children, ..._$attributes } = {
                children: 'Lazy hydration SSR route',
              } as Record<string, any>
              _$compiledSpreadAttributes(_$root, _$attributes)
              _$compiledRenderAnchor(_$children, _$root, _$anchor)
            })
            return _$root
          }),
      }),
      hydrate: hydrateStrategy,
    })

    await expect(renderToString(LazyPanel)).resolves.toContain('<h1>Lazy hydration SSR route</h1>')
    expect(hydrateStrategy).not.toHaveBeenCalled()
  })

  it('renders Suspense children during SSR', async () => {
    const App: FC = () =>
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('main', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            children: _$createDynamic(Suspense, {
              fallback: _$compiledVapor(_$parentContext => {
                const _$root = _$compiledCreateElement('span', _$parentContext)
                const _$anchor = _$compiledCreateComment('rue:children:anchor')
                _$compiledAppendChild(_$root, _$anchor)
                _$compiledWatchEffect(() => {
                  const { children: _$children, ..._$attributes } = {
                    children: 'Loading suspense panel',
                  } as Record<string, any>
                  _$compiledSpreadAttributes(_$root, _$attributes)
                  _$compiledRenderAnchor(_$children, _$root, _$anchor)
                })
                return _$root
              }),
              children: _$compiledVapor(_$parentContext => {
                const _$root = _$compiledCreateElement('strong', _$parentContext)
                const _$anchor = _$compiledCreateComment('rue:children:anchor')
                _$compiledAppendChild(_$root, _$anchor)
                _$compiledWatchEffect(() => {
                  const { children: _$children, ..._$attributes } = { children: 'Ready' } as Record<
                    string,
                    any
                  >
                  _$compiledSpreadAttributes(_$root, _$attributes)
                  _$compiledRenderAnchor(_$children, _$root, _$anchor)
                })
                return _$root
              }),
            }),
          } as Record<string, any>
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })

    await expect(renderToString(App)).resolves.toContain('<strong>Ready</strong>')
  })

  it('renders nested async components during SSR', async () => {
    const LazyPanel = useComponent({
      loader: async () => ({
        default: () =>
          _$compiledVapor(_$parentContext => {
            const _$root = _$compiledCreateElement('strong', _$parentContext)
            const _$anchor = _$compiledCreateComment('rue:children:anchor')
            _$compiledAppendChild(_$root, _$anchor)
            _$compiledWatchEffect(() => {
              const { children: _$children, ..._$attributes } = {
                children: 'Nested async SSR panel',
              } as Record<string, any>
              _$compiledSpreadAttributes(_$root, _$attributes)
              _$compiledRenderAnchor(_$children, _$root, _$anchor)
            })
            return _$root
          }),
      }),
    })
    const App: FC = () =>
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('main', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            children: _$createDynamic(LazyPanel, null),
          } as Record<string, any>
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })

    await expect(renderToString(App)).resolves.toContain('<strong>Nested async SSR panel</strong>')
  })

  it('renders async components inside Suspense during SSR', async () => {
    const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')
    const LazyPanel = useComponent({
      loader: async () => ({
        default: () =>
          _$compiledVapor(_$parentContext => {
            const _$root = _$compiledCreateElement('strong', _$parentContext)
            const _$anchor = _$compiledCreateComment('rue:children:anchor')
            _$compiledAppendChild(_$root, _$anchor)
            _$compiledWatchEffect(() => {
              const { children: _$children, ..._$attributes } = {
                children: 'Suspense SSR panel',
              } as Record<string, any>
              _$compiledSpreadAttributes(_$root, _$attributes)
              _$compiledRenderAnchor(_$children, _$root, _$anchor)
            })
            return _$root
          }),
      }),
    })
    const App: FC = () =>
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('main', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            children: _$createDynamic(Suspense, {
              fallback: _$compiledVapor(_$parentContext => {
                const _$root = _$compiledCreateElement('span', _$parentContext)
                const _$anchor = _$compiledCreateComment('rue:children:anchor')
                _$compiledAppendChild(_$root, _$anchor)
                _$compiledWatchEffect(() => {
                  const { children: _$children, ..._$attributes } = {
                    children: 'Loading suspense panel',
                  } as Record<string, any>
                  _$compiledSpreadAttributes(_$root, _$attributes)
                  _$compiledRenderAnchor(_$children, _$root, _$anchor)
                })
                return _$root
              }),
              children: _$createDynamic(LazyPanel, null),
            }),
          } as Record<string, any>
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })

    Reflect.deleteProperty(globalThis, 'document')
    try {
      await expect(renderToString(App)).resolves.toContain('<strong>Suspense SSR panel</strong>')
    } finally {
      if (documentDescriptor) {
        Object.defineProperty(globalThis, 'document', documentDescriptor)
      }
    }
  })

  it('keeps the server DOM adapter active across overlapping async SSR renders', async () => {
    let resolveFirst!: (value: { default: FC }) => void
    let resolveSecond!: (value: { default: FC }) => void
    const FirstPanel = useComponent({
      loader: () =>
        new Promise<{ default: FC }>(resolve => {
          resolveFirst = resolve
        }),
    })
    const SecondPanel = useComponent({
      loader: () =>
        new Promise<{ default: FC }>(resolve => {
          resolveSecond = resolve
        }),
    })

    const firstRender = renderToString(FirstPanel)
    await Promise.resolve()
    const secondRender = renderToString(SecondPanel)
    await Promise.resolve()

    resolveFirst({
      default: () =>
        _$compiledVapor(_$parentContext => {
          const _$root = _$compiledCreateElement('h1', _$parentContext)
          const _$anchor = _$compiledCreateComment('rue:children:anchor')
          _$compiledAppendChild(_$root, _$anchor)
          _$compiledWatchEffect(() => {
            const { children: _$children, ..._$attributes } = {
              children: 'First SSR panel',
            } as Record<string, any>
            _$compiledSpreadAttributes(_$root, _$attributes)
            _$compiledRenderAnchor(_$children, _$root, _$anchor)
          })
          return _$root
        }),
    })
    await expect(firstRender).resolves.toContain('<h1>First SSR panel</h1>')

    resolveSecond({
      default: () =>
        _$compiledVapor(_$parentContext => {
          const _$root = _$compiledCreateElement('h1', _$parentContext)
          const _$anchor = _$compiledCreateComment('rue:children:anchor')
          _$compiledAppendChild(_$root, _$anchor)
          _$compiledWatchEffect(() => {
            const { children: _$children, ..._$attributes } = {
              children: 'Second SSR panel',
            } as Record<string, any>
            _$compiledSpreadAttributes(_$root, _$attributes)
            _$compiledRenderAnchor(_$children, _$root, _$anchor)
          })
          return _$root
        }),
    })
    await expect(secondRender).resolves.toContain('<h1>Second SSR panel</h1>')
  })

  it('disposes server render effects before restoring the browser DOM adapter', async () => {
    const label = signal('before', {}, true)
    let runs = 0
    const App: FC = () =>
      _$compiledRoot(() => {
        const container = _$createElement('div')
        const anchor = _$createComment('late-ssr-update')
        _$appendChild(container, anchor)

        _$compiledWatchEffect(() => {
          runs += 1
          renderAnchor(
            _$compiledVapor(_$parentContext => {
              const _$root = _$compiledCreateElement('span', _$parentContext)
              const _$anchor = _$compiledCreateComment('rue:children:anchor')
              _$compiledAppendChild(_$root, _$anchor)
              _$compiledWatchEffect(() => {
                const { children: _$children, ..._$attributes } = {
                  children: label.get(),
                } as Record<string, any>
                _$compiledSpreadAttributes(_$root, _$attributes)
                _$compiledRenderAnchor(_$children, _$root, _$anchor)
              })
              return _$root
            }),
            container,
            anchor,
          )
        })

        return container
      }) as any

    await expect(renderToString(App)).resolves.toContain('<span>before</span>')

    label.set('after')
    await Promise.resolve()
    await Promise.resolve()

    expect(runs).toBe(1)
  })

  it('waits for frame-scheduled reactive updates before serializing SSR output', async () => {
    setReactiveScheduling('frame')

    try {
      const App: FC = () =>
        _$compiledRoot(() => {
          const container = _$createElement('div')
          const anchor = _$createComment('frame-ssr-update')
          const label = signal('before', {}, true)
          _$appendChild(container, anchor)

          _$compiledWatchEffect(() => {
            renderAnchor(
              _$compiledVapor(_$parentContext => {
                const _$root = _$compiledCreateElement('span', _$parentContext)
                const _$anchor = _$compiledCreateComment('rue:children:anchor')
                _$compiledAppendChild(_$root, _$anchor)
                _$compiledWatchEffect(() => {
                  const { children: _$children, ..._$attributes } = {
                    children: label.get(),
                  } as Record<string, any>
                  _$compiledSpreadAttributes(_$root, _$attributes)
                  _$compiledRenderAnchor(_$children, _$root, _$anchor)
                })
                return _$root
              }),
              container,
              anchor,
            )
          })
          label.set('after')

          return container
        }) as any

      const html = await renderToString(App)
      expect(html).toBe('<div><span>after</span></div>')
      expect(html.match(/<span>/g)).toHaveLength(1)
      expect(html).not.toContain('rue:children:anchor')
    } finally {
      setReactiveScheduling('sync')
    }
  })
})
