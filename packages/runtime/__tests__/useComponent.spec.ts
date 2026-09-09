import { afterEach, describe, expect, it, vi } from 'vitest'
import { onError, ref, render, setReactiveScheduling, useComponent, type FC } from '../src'
import {
  _$createComponent,
  _$createDynamic,
  _$createFragment,
  _$compiledWithHookId,
  renderAnchor,
  useSetup,
  _$compiledRoot,
  watchEffect,
} from './legacy-test-render'

type AsyncLabelModule = { default: FC<{ label: string }> }

setReactiveScheduling('sync')

const flushAsyncComponent = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

afterEach(() => {
  document.body.innerHTML = ''
})

// 验证 useComponent：同一 loader 下的不同实例应共享加载状态，但各自拥有独立的容器与副作用
describe('useComponent', () => {
  it('retries a failed loader when the async component is mounted again', async () => {
    const loadError = new Error('temporary import failure')
    const reported = vi.fn()
    const stop = onError(reported)
    let attempts = 0
    const loader = vi.fn(async () => {
      attempts += 1
      if (attempts === 1) throw loadError
      return {
        default: () => _$createDynamic('section', { id: 'recovered', children: 'recovered' }),
      }
    })
    const Async = useComponent(loader)
    const container = document.createElement('div')
    document.body.appendChild(container)

    render(_$createDynamic(Async, null), container)
    await flushAsyncComponent()
    expect(reported).toHaveBeenCalledWith(loadError, null)
    expect(container.textContent).toContain('temporary import failure')

    render(null as any, container)
    render(_$createDynamic(Async, null), container)
    await flushAsyncComponent()

    expect(loader).toHaveBeenCalledTimes(2)
    expect(container.querySelector('#recovered')?.textContent).toBe('recovered')
    expect(container.textContent).not.toContain('temporary import failure')
    stop?.()
  })

  it('renders same-loader instances with independent props and mount ranges', async () => {
    const deferred: { resolve?: (value: AsyncLabelModule) => void } = {}
    const Async = useComponent<{ label: string }>(
      () =>
        new Promise<AsyncLabelModule>(resolve => {
          deferred.resolve = resolve
        }),
    )

    const container = document.createElement('div')
    document.body.appendChild(container)

    render(
      _$createFragment([
        _$createDynamic(Async, { label: 'A' }),
        _$createDynamic(Async, { label: 'B' }),
      ]),
      container,
    )
    await flushAsyncComponent()

    deferred.resolve?.({
      default: (props: any) =>
        _$createDynamic('section', { 'data-label': props.label, children: props.label }),
    })
    await flushAsyncComponent()

    expect(Array.from(container.querySelectorAll('section'), el => el.textContent)).toEqual([
      'A',
      'B',
    ])
    expect(
      Array.from(container.querySelectorAll('section'), el => el.getAttribute('data-label')),
    ).toEqual(['A', 'B'])
  })

  it('removes the previous async wrapper subtree when switching loaders', async () => {
    const deferredA: { resolve?: (value: AsyncLabelModule) => void } = {}
    const deferredB: { resolve?: (value: AsyncLabelModule) => void } = {}

    const AsyncA = useComponent<{ label: string }>(
      () =>
        new Promise<AsyncLabelModule>(resolve => {
          deferredA.resolve = resolve
        }),
    )
    const AsyncB = useComponent<{ label: string }>(
      () =>
        new Promise<AsyncLabelModule>(resolve => {
          deferredB.resolve = resolve
        }),
    )

    const container = document.createElement('div')
    document.body.appendChild(container)

    render(_$createDynamic(AsyncA, { label: 'A' }), container)
    await flushAsyncComponent()
    deferredA.resolve?.({
      default: (props: any) => _$createDynamic('section', { id: 'page-a', children: props.label }),
    })
    await flushAsyncComponent()

    expect(container.querySelector('#page-a')?.textContent).toBe('A')

    render(_$createDynamic(AsyncB, { label: 'B' }), container)
    await flushAsyncComponent()
    deferredB.resolve?.({
      default: (props: any) => _$createDynamic('section', { id: 'page-b', children: props.label }),
    })
    await flushAsyncComponent()

    expect(container.querySelector('#page-a')).toBeNull()
    expect(container.querySelectorAll('#page-b')).toHaveLength(1)
    expect(container.querySelector('#page-b')?.textContent).toBe('B')
  })

  it('renders compiled-like vapor children after async resolve', async () => {
    const deferred: { resolve?: (value: { default: FC }) => void } = {}

    const Shell: FC<{ children?: unknown }> = props =>
      _$createDynamic('section', {
        'data-testid': 'async-shell',
        children: props.children as any,
      })

    const CompiledLikeRoute: FC = () => {
      const ctx = _$compiledWithHookId('useSetup:async-compiled:0', () =>
        useSetup(() => {
          const message = ref('hello')
          const activeTab = ref<'preview' | 'code'>('preview')
          return { message, activeTab }
        }),
      ) as {
        message: { value: string }
        activeTab: { value: 'preview' | 'code' }
      }

      return _$compiledRoot(() => {
        const root = document.createElement('div')
        const anchor = document.createComment('async-compiled-anchor')

        root.append(anchor)

        const child = _$compiledRoot(() => {
          const article = document.createElement('article')
          article.dataset.testid = 'compiled-like-value'

          watchEffect(() => {
            article.textContent = `${ctx.activeTab.value}:${ctx.message.value}`
          })

          return article
        })

        renderAnchor(_$createComponent(Shell, { children: child }), root as any, anchor as any)
        return root as any
      })
    }

    const Async = useComponent(
      () =>
        new Promise<{ default: FC }>(resolve => {
          deferred.resolve = resolve
        }),
    )

    const container = document.createElement('div')
    document.body.appendChild(container)

    render(_$createDynamic(Async, null), container)
    await flushAsyncComponent()

    deferred.resolve?.({ default: CompiledLikeRoute })
    await flushAsyncComponent()

    expect(container.querySelector('[data-testid="async-shell"]')?.textContent).toBe(
      'preview:hello',
    )
    expect(container.querySelector('[data-testid="compiled-like-value"]')?.textContent).toBe(
      'preview:hello',
    )
  })

  it('renders compiled-like vapor children through a hookful shell after async resolve', async () => {
    const deferred: { resolve?: (value: { default: FC }) => void } = {}

    const Shell: FC<{ children?: unknown }> = p => {
      const shellState = _$compiledWithHookId('useSetup:async-shell:0', () =>
        useSetup(() => ({
          ready: ref(true),
        })),
      ) as {
        ready: { value: boolean }
      }

      return _$compiledRoot(() => {
        const root = document.createElement('section')
        const article = document.createElement('article')
        const anchor = document.createComment('async-shell-children')

        article.dataset.testid = 'async-hookful-shell'
        article.append(anchor)
        root.append(article)

        watchEffect(() => {
          const child = shellState.ready.value ? p.children : null
          renderAnchor(child as any, article as any, anchor as any)
        })

        return root as any
      })
    }

    const CompiledLikeRoute: FC = () => {
      const ctx = _$compiledWithHookId('useSetup:async-hookful-route:0', () =>
        useSetup(() => {
          const message = ref('hello')
          const activeTab = ref<'preview' | 'code'>('preview')
          return { message, activeTab }
        }),
      ) as {
        message: { value: string }
        activeTab: { value: 'preview' | 'code' }
      }

      return _$compiledRoot(() => {
        const root = document.createElement('div')
        const anchor = document.createComment('async-hookful-anchor')

        root.append(anchor)

        const child = _$compiledRoot(() => {
          const article = document.createElement('article')
          article.dataset.testid = 'compiled-like-hookful-value'

          watchEffect(() => {
            article.textContent = `${ctx.activeTab.value}:${ctx.message.value}`
          })

          return article
        })

        renderAnchor(_$createComponent(Shell, { children: child }), root as any, anchor as any)
        return root as any
      })
    }

    const Async = useComponent(
      () =>
        new Promise<{ default: FC }>(resolve => {
          deferred.resolve = resolve
        }),
    )

    const container = document.createElement('div')
    document.body.appendChild(container)

    render(_$createDynamic(Async, null), container)
    await flushAsyncComponent()

    deferred.resolve?.({ default: CompiledLikeRoute })
    await flushAsyncComponent()

    expect(container.querySelector('[data-testid="async-hookful-shell"]')?.textContent).toBe(
      'preview:hello',
    )
    expect(
      container.querySelector('[data-testid="compiled-like-hookful-value"]')?.textContent,
    ).toBe('preview:hello')
  })

  it('keeps resolved child component updates reactive after async resolve', async () => {
    const deferred: { resolve?: (value: { default: FC }) => void } = {}

    const Counter: FC = () => {
      const ctx = _$compiledWithHookId('useSetup:async-counter:0', () =>
        useSetup(() => ({
          count: ref(0),
        })),
      ) as {
        count: { value: number }
      }

      return _$compiledRoot(() => {
        const button = document.createElement('button')
        button.dataset.testid = 'async-counter'
        button.addEventListener('click', () => {
          ctx.count.value += 1
        })

        watchEffect(() => {
          button.textContent = String(ctx.count.value)
        })

        return button
      })
    }

    const Async = useComponent(
      () =>
        new Promise<{ default: FC }>(resolve => {
          deferred.resolve = resolve
        }),
    )

    const container = document.createElement('div')
    document.body.appendChild(container)

    render(_$createDynamic(Async, null), container)
    await flushAsyncComponent()

    deferred.resolve?.({ default: Counter })
    await flushAsyncComponent()

    const button = container.querySelector('[data-testid="async-counter"]') as HTMLButtonElement
    expect(button?.textContent).toBe('0')

    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushAsyncComponent()

    expect(button.textContent).toBe('1')
  })
})
