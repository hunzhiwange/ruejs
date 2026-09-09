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
import type { FC } from '../src'
import { ref, render, setReactiveScheduling, signal } from '../src'

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
})

describe('patch_children_keyed anchor isolation', () => {
  it('patches compiled fragments in place while inserting and deleting compatible children', async () => {
    const container = document.createElement('div')
    const label = signal('one')
    const extra = signal(true)
    const View = () =>
      _$compiledVapor(() => {
        const root = document.createDocumentFragment()
        const stable = document.createElement('span')
        const stableAnchor = document.createComment('rue:slot:anchor')
        const extraAnchor = document.createComment('rue:slot:anchor')

        stable.dataset.testid = 'fragment-stable'
        stable.appendChild(stableAnchor)
        root.append(stable, extraAnchor)

        _$compiledWatchEffect(() => {
          _$compiledRenderAnchor(label.get(), stable, stableAnchor)
        })
        _$compiledWatchEffect(() => {
          const value = extra.get()
            ? _$compiledVapor(() => {
                const element = document.createElement('i')
                element.dataset.testid = 'fragment-extra'
                element.textContent = 'extra'
                return element
              })
            : null
          _$compiledRenderAnchor(value, root, extraAnchor)
        })

        return root
      })

    document.body.appendChild(container)
    render(_$createDynamic(View, null), container)
    await Promise.resolve()
    const first = container.querySelector('[data-testid="fragment-stable"]')

    label.set('two')
    extra.set(false)
    await Promise.resolve()
    await Promise.resolve()

    expect(container.querySelector('[data-testid="fragment-stable"]')).toBe(first)
    expect(first?.textContent).toBe('two')
    expect(container.querySelector('[data-testid="fragment-extra"]')).toBeNull()

    label.set('three')
    extra.set(true)
    await Promise.resolve()
    await Promise.resolve()

    expect(container.querySelector('[data-testid="fragment-stable"]')).toBe(first)
    expect(first?.textContent).toBe('three')
    expect(container.querySelector('[data-testid="fragment-extra"]')?.textContent).toBe('extra')
  })

  it('keeps nested button text when sibling branches switch', async () => {
    const active = ref<'preview' | 'code'>('preview')

    const view = () =>
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('section', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            children: [
              _$compiledVapor(_$parentContext => {
                const _$root = _$compiledCreateElement('div', _$parentContext)
                const _$anchor = _$compiledCreateComment('rue:children:anchor')
                _$compiledAppendChild(_$root, _$anchor)
                _$compiledWatchEffect(() => {
                  const { children: _$children, ..._$attributes } = {
                    role: 'tablist',
                    className: 'tabs tabs-box',
                    children: [
                      _$compiledVapor(_$parentContext => {
                        const _$root = _$compiledCreateElement('button', _$parentContext)
                        const _$anchor = _$compiledCreateComment('rue:children:anchor')
                        _$compiledAppendChild(_$root, _$anchor)
                        _$compiledWatchEffect(() => {
                          const { children: _$children, ..._$attributes } = {
                            role: 'tab',
                            className: active.value === 'preview' ? 'tab tab-active' : 'tab',
                            children: '预览',
                          } as Record<string, any>
                          _$compiledSpreadAttributes(_$root, _$attributes)
                          _$compiledRenderAnchor(_$children, _$root, _$anchor)
                        })
                        return _$root
                      }),
                      _$compiledVapor(_$parentContext => {
                        const _$root = _$compiledCreateElement('button', _$parentContext)
                        const _$anchor = _$compiledCreateComment('rue:children:anchor')
                        _$compiledAppendChild(_$root, _$anchor)
                        _$compiledWatchEffect(() => {
                          const { children: _$children, ..._$attributes } = {
                            role: 'tab',
                            className: active.value === 'code' ? 'tab tab-active' : 'tab',
                            children: 'JSX代码',
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
              }),
              active.value === 'preview'
                ? _$compiledVapor(_$parentContext => {
                    const _$root = _$compiledCreateElement('div', _$parentContext)
                    const _$anchor = _$compiledCreateComment('rue:children:anchor')
                    _$compiledAppendChild(_$root, _$anchor)
                    _$compiledWatchEffect(() => {
                      const { children: _$children, ..._$attributes } = {
                        id: 'preview-panel',
                        children: 'Preview panel',
                      } as Record<string, any>
                      _$compiledSpreadAttributes(_$root, _$attributes)
                      _$compiledRenderAnchor(_$children, _$root, _$anchor)
                    })
                    return _$root
                  })
                : _$compiledVapor(_$parentContext => {
                    const _$root = _$compiledCreateElement('div', _$parentContext)
                    const _$anchor = _$compiledCreateComment('rue:children:anchor')
                    _$compiledAppendChild(_$root, _$anchor)
                    _$compiledWatchEffect(() => {
                      const { children: _$children, ..._$attributes } = {
                        id: 'code-panel',
                        children: 'Code panel',
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

    const container = document.createElement('div')
    document.body.appendChild(container)
    render(view(), container)
    await Promise.resolve()

    const initialTabs = Array.from(container.querySelectorAll('button')) as HTMLButtonElement[]
    expect(initialTabs).toHaveLength(2)
    expect(initialTabs[0].textContent).toBe('预览')
    expect(initialTabs[1].textContent).toBe('JSX代码')

    active.value = 'code'
    render(view(), container)
    await Promise.resolve()

    const nextTabs = Array.from(container.querySelectorAll('button')) as HTMLButtonElement[]
    expect(nextTabs).toHaveLength(2)
    expect(nextTabs[0].textContent).toBe('预览')
    expect(nextTabs[1].textContent).toBe('JSX代码')
    expect(container.querySelector('#preview-panel')).toBeNull()
    expect(container.querySelector('#code-panel')?.textContent).toBe('Code panel')
  })

  it('keeps preview/code branches exclusive for unkeyed renderable siblings', async () => {
    const active = ref<'preview' | 'code'>('preview')

    const CodePanel: FC<{ code: string }> = props =>
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('div', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            className: 'mt-2',
            children: _$compiledVapor(_$parentContext => {
              const _$root = _$compiledCreateElement('div', _$parentContext)
              const _$anchor = _$compiledCreateComment('rue:children:anchor')
              _$compiledAppendChild(_$root, _$anchor)
              _$compiledWatchEffect(() => {
                const { children: _$children, ..._$attributes } = {
                  className: 'relative group',
                  children: [
                    _$compiledVapor(_$parentContext => {
                      const _$root = _$compiledCreateElement('button', _$parentContext)
                      const _$anchor = _$compiledCreateComment('rue:children:anchor')
                      _$compiledAppendChild(_$root, _$anchor)
                      _$compiledWatchEffect(() => {
                        const { children: _$children, ..._$attributes } = {
                          'aria-label': '复制代码',
                          children: '复制',
                        } as Record<string, any>
                        _$compiledSpreadAttributes(_$root, _$attributes)
                        _$compiledRenderAnchor(_$children, _$root, _$anchor)
                      })
                      return _$root
                    }),
                    _$compiledVapor(_$parentContext => {
                      const _$root = _$compiledCreateElement('div', _$parentContext)
                      const _$anchor = _$compiledCreateComment('rue:children:anchor')
                      _$compiledAppendChild(_$root, _$anchor)
                      _$compiledWatchEffect(() => {
                        const { children: _$children, ..._$attributes } = {
                          dangerouslySetInnerHTML: {
                            __html: `<pre><code>${props.code}</code></pre>`,
                          },
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
            }),
          } as Record<string, any>
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })

    const view = () =>
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('section', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            children: [
              _$compiledVapor(_$parentContext => {
                const _$root = _$compiledCreateElement('h2', _$parentContext)
                const _$anchor = _$compiledCreateComment('rue:children:anchor')
                _$compiledAppendChild(_$root, _$anchor)
                _$compiledWatchEffect(() => {
                  const { children: _$children, ..._$attributes } = {
                    children: '# Button',
                  } as Record<string, any>
                  _$compiledSpreadAttributes(_$root, _$attributes)
                  _$compiledRenderAnchor(_$children, _$root, _$anchor)
                })
                return _$root
              }),
              _$compiledVapor(_$parentContext => {
                const _$root = _$compiledCreateElement('div', _$parentContext)
                const _$anchor = _$compiledCreateComment('rue:children:anchor')
                _$compiledAppendChild(_$root, _$anchor)
                _$compiledWatchEffect(() => {
                  const { children: _$children, ..._$attributes } = {
                    role: 'tablist',
                    className: 'tabs tabs-box mb-3',
                    children: [
                      _$compiledVapor(_$parentContext => {
                        const _$root = _$compiledCreateElement('button', _$parentContext)
                        const _$anchor = _$compiledCreateComment('rue:children:anchor')
                        _$compiledAppendChild(_$root, _$anchor)
                        _$compiledWatchEffect(() => {
                          const { children: _$children, ..._$attributes } = {
                            role: 'tab',
                            className: active.value === 'preview' ? 'tab tab-active' : 'tab',
                            children: '预览',
                          } as Record<string, any>
                          _$compiledSpreadAttributes(_$root, _$attributes)
                          _$compiledRenderAnchor(_$children, _$root, _$anchor)
                        })
                        return _$root
                      }),
                      _$compiledVapor(_$parentContext => {
                        const _$root = _$compiledCreateElement('button', _$parentContext)
                        const _$anchor = _$compiledCreateComment('rue:children:anchor')
                        _$compiledAppendChild(_$root, _$anchor)
                        _$compiledWatchEffect(() => {
                          const { children: _$children, ..._$attributes } = {
                            role: 'tab',
                            className: active.value === 'code' ? 'tab tab-active' : 'tab',
                            children: 'JSX代码',
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
              }),
              active.value === 'preview'
                ? _$compiledVapor(_$parentContext => {
                    const _$root = _$compiledCreateElement('div', _$parentContext)
                    const _$anchor = _$compiledCreateComment('rue:children:anchor')
                    _$compiledAppendChild(_$root, _$anchor)
                    _$compiledWatchEffect(() => {
                      const { children: _$children, ..._$attributes } = {
                        className: 'card bg-base-100 shadow',
                        children: _$compiledVapor(_$parentContext => {
                          const _$root = _$compiledCreateElement('div', _$parentContext)
                          const _$anchor = _$compiledCreateComment('rue:children:anchor')
                          _$compiledAppendChild(_$root, _$anchor)
                          _$compiledWatchEffect(() => {
                            const { children: _$children, ..._$attributes } = {
                              className: 'card-body flex flex-wrap gap-2',
                              children: _$compiledVapor(_$parentContext => {
                                const _$root = _$compiledCreateElement('button', _$parentContext)
                                const _$anchor = _$compiledCreateComment('rue:children:anchor')
                                _$compiledAppendChild(_$root, _$anchor)
                                _$compiledWatchEffect(() => {
                                  const { children: _$children, ..._$attributes } = {
                                    className: 'btn',
                                    children: 'Default',
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
                      } as Record<string, any>
                      _$compiledSpreadAttributes(_$root, _$attributes)
                      _$compiledRenderAnchor(_$children, _$root, _$anchor)
                    })
                    return _$root
                  })
                : _$createDynamic(CodePanel, {
                    code: "import { Button } from '@rue-js/design';\nexport default () => <Button>Default</Button>;",
                  }),
            ],
          } as Record<string, any>
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })

    const container = document.createElement('div')
    document.body.appendChild(container)
    render(view(), container)
    await Promise.resolve()

    let tabs = Array.from(container.querySelectorAll('[role="tab"]')) as HTMLButtonElement[]
    expect(tabs[0].textContent).toBe('预览')
    expect(tabs[1].textContent).toBe('JSX代码')
    expect(tabs[0].classList.contains('tab-active')).toBe(true)
    expect(tabs[1].classList.contains('tab-active')).toBe(false)
    expect(container.querySelector('.card .btn')?.textContent).toBe('Default')
    expect(container.querySelector('pre code')).toBeNull()

    active.value = 'code'
    render(view(), container)
    await Promise.resolve()

    tabs = Array.from(container.querySelectorAll('[role="tab"]')) as HTMLButtonElement[]
    expect(tabs[0].textContent).toBe('预览')
    expect(tabs[1].textContent).toBe('JSX代码')
    expect(tabs[0].classList.contains('tab-active')).toBe(false)
    expect(tabs[1].classList.contains('tab-active')).toBe(true)
    expect(container.querySelector('.card .btn')).toBeNull()
    expect(container.querySelector('pre code')?.textContent).toContain('export default')

    active.value = 'preview'
    render(view(), container)
    await Promise.resolve()

    tabs = Array.from(container.querySelectorAll('[role="tab"]')) as HTMLButtonElement[]
    expect(tabs[0].classList.contains('tab-active')).toBe(true)
    expect(tabs[1].classList.contains('tab-active')).toBe(false)
    expect(container.querySelector('.card .btn')?.textContent).toBe('Default')
    expect(container.querySelector('pre code')).toBeNull()
  })
})
