// @vitest-environment jsdom

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
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  Component,
  createContext,
  onBeforeUnmount,
  onUnmounted,
  renderAnchor,
  setReactiveScheduling,
  signal,
  untrack,
  useApp,
  useSetup,
  watchEffect,
  type FC,
} from '../src'
import { _$compiledRoot } from './legacy-test-render'
import { appendChild, createComment, createElement } from '../src/dom'

void watchEffect

setReactiveScheduling('microtask')

afterEach(() => {
  document.body.innerHTML = ''
})

const flushEffects = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('renderAnchor component replacement', () => {
  it('removes a child mounted asynchronously at an anchor inside a vapor fragment', async () => {
    const mode = signal<'preview' | 'code'>('preview')
    const AnchorOwner: FC = () => {
      const view = useSetup(() => {
        const parent = createElement('span') as HTMLElement
        const anchor = createComment('outer:anchor') as Comment
        appendChild(parent, anchor)
        _$compiledWatchEffect(() => {
          const currentMode = mode.get()
          untrack(() => {
            renderAnchor(
              _$compiledRoot(() => {
                if (currentMode === 'preview') {
                  const preview = document.createElement('div')
                  preview.dataset.testid = 'preview'
                  return preview
                }

                const fragment = document.createDocumentFragment()
                const innerAnchor = document.createComment('inner:anchor')
                fragment.append(innerAnchor)
                queueMicrotask(() => {
                  renderAnchor(
                    _$compiledRoot(() => {
                      const code = document.createElement('div')
                      code.dataset.testid = 'code'
                      return code
                    }),
                    fragment as any,
                    innerAnchor as any,
                  )
                })
                return fragment
              }),
              parent as any,
              anchor as any,
            )
          })
        })
        return parent
      })
      return _$compiledRoot(() => view)
    }
    const container = document.createElement('div')
    document.body.appendChild(container)

    useApp(AnchorOwner).mount(container)
    await flushEffects()
    expect(container.querySelectorAll('[data-testid="preview"]')).toHaveLength(1)

    mode.set('code')
    await flushEffects()
    expect(container.querySelectorAll('[data-testid="code"]')).toHaveLength(1)
    expect(container.querySelectorAll('[data-testid="preview"]')).toHaveLength(0)

    mode.set('preview')
    await flushEffects()

    expect(container.querySelectorAll('[data-testid="preview"]')).toHaveLength(1)
    expect(container.querySelectorAll('[data-testid="code"]')).toHaveLength(0)
  })

  it('removes component A when the same anchor replaces it with component B', async () => {
    const beforeUnmount = vi.fn()
    const unmounted = vi.fn()
    const First: FC = () => {
      onBeforeUnmount(beforeUnmount)
      onUnmounted(unmounted)
      return _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('p', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            'data-testid': 'first-route',
            children: 'first-route',
          } as Record<string, any>
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })
    }
    const Second: FC<{ params: { id: string } }> = ({ params }) =>
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('p', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            'data-testid': 'second-route',
            children: ['second-route ', params.id],
          } as Record<string, any>
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })
    const RouteDepth = createContext(0)
    const RouteContent: FC<{ component: FC; params: { id: string } }> = ({ component, params }) =>
      _$createDynamic(RouteDepth.Provider as any, {
        value: 1,
        children: _$createDynamic(component, { params }),
      })
    const activeRoute = signal<'first' | 'second'>('first')
    const paramsSource = signal({ id: '7' }, {}, true)
    const params = new Proxy({} as { id: string }, {
      get: (_target, key) => paramsSource.get()[key as 'id'],
    })
    const AnchorOwner: FC = () => {
      const view = useSetup(() => {
        const parent = createElement('span') as HTMLElement
        const anchor = createComment('anchor') as Comment
        appendChild(parent, anchor)
        _$compiledWatchEffect(() => {
          const route = activeRoute.get()
          untrack(() => {
            const component = route === 'first' ? First : Second
            renderAnchor(
              _$createDynamic(Component, {
                is: RouteContent,
                key: route,
                component,
                params,
              }) as any,
              parent as any,
              anchor as any,
            )
          })
        })
        return parent
      })
      return _$compiledRoot(() => view)
    }
    const container = document.createElement('div')
    document.body.appendChild(container)

    useApp(AnchorOwner).mount(container)
    await flushEffects()
    expect(container.querySelector('[data-testid="first-route"]')?.textContent).toBe('first-route')

    activeRoute.set('second')
    await flushEffects()

    expect(container.querySelector('[data-testid="first-route"]')).toBeNull()
    expect(container.querySelector('[data-testid="second-route"]')?.textContent).toBe(
      'second-route 7',
    )
    expect(
      container.querySelectorAll('[data-testid="first-route"], [data-testid="second-route"]'),
    ).toHaveLength(1)
    expect(beforeUnmount).toHaveBeenCalledTimes(1)
    expect(unmounted).toHaveBeenCalledTimes(1)
  })
})
