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
  Template,
  render,
  renderAnchor,
  setReactiveScheduling,
  signal,
  watchEffect,
  type FC,
} from '../src'
import { _$compiledRoot } from './legacy-test-render'
import { waitForContent } from './page-test-utils'

void watchEffect

const createLegacyVapor = (renderFn: Parameters<typeof _$compiledVapor>[0]) =>
  _$compiledVapor(renderFn)

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active =
    (globalThis as any).__rue_vapor_preferred ?? (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

const _flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('Template renderable boundary', () => {
  it('renders children without inserting an element wrapper', async () => {
    const host = document.createElement('div')
    resetActiveRuntime()

    document.body.appendChild(host)

    render(
      _$createDynamic(Template, {
        children: [
          _$compiledVapor(_$parentContext => {
            const _$root = _$compiledCreateElement('strong', _$parentContext)
            const _$anchor = _$compiledCreateComment('rue:children:anchor')
            _$compiledAppendChild(_$root, _$anchor)
            _$compiledWatchEffect(() => {
              const { children: _$children, ..._$attributes } = { children: 'A' } as Record<
                string,
                any
              >
              _$compiledSpreadAttributes(_$root, _$attributes)
              _$compiledRenderAnchor(_$children, _$root, _$anchor)
            })
            return _$root
          }),
          _$compiledVapor(_$parentContext => {
            const _$root = _$compiledCreateElement('em', _$parentContext)
            const _$anchor = _$compiledCreateComment('rue:children:anchor')
            _$compiledAppendChild(_$root, _$anchor)
            _$compiledWatchEffect(() => {
              const { children: _$children, ..._$attributes } = { children: 'B' } as Record<
                string,
                any
              >
              _$compiledSpreadAttributes(_$root, _$attributes)
              _$compiledRenderAnchor(_$children, _$root, _$anchor)
            })
            return _$root
          }),
        ],
      }),
      host,
    )

    await waitForContent(() => {
      expect(host.querySelector('span')).toBeNull()
      expect(host.textContent).toBe('AB')
    })
  })

  it('updates the same template instance in place when children change', async () => {
    const host = document.createElement('div')
    const label = signal('A')
    const showTail = signal(true)
    resetActiveRuntime()

    document.body.appendChild(host)

    const createTail = () =>
      createLegacyVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('em', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            children: 'tail',
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
            _$createDynamic(Template, {
              children: [
                _$compiledVapor(_$parentContext => {
                  const _$root = _$compiledCreateElement('strong', _$parentContext)
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
                showTail.get() ? createTail() : null,
              ],
            }),
            root as any,
            anchor as any,
          )
        })

        return root as any
      }) as any

    render(_$createDynamic(App, null), host)

    await waitForContent(() => {
      expect(host.textContent).toBe('Atail')
    })

    label.set('B')
    showTail.set(false)

    await waitForContent(() => {
      expect(host.textContent).toBe('B')
    })
  })
})
