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
  getCurrentContainer as getDefaultCurrentContainer,
  ref,
  render,
  setReactiveScheduling,
  useApp as useDefaultApp,
  useState,
  type FC,
} from '../src'
import {
  _$createComponent,
  _$compiledKeyedList,
  computed,
  getCurrentContainer as getVaporCurrentContainer,
  signal,
  renderAnchor,
  useApp as useVaporApp,
  _$compiledRoot,
  watchEffect,
} from './legacy-test-render'

type Todo = { id: number; text?: string; completed?: boolean }

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
})

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const VaporEntryChild = (props: { label: string }) => {
  return _$compiledRoot(() => {
    const root = document.createElement('div')
    const text = document.createElement('span')
    text.dataset.testid = 'vapor-entry-value'
    root.appendChild(text)

    _$compiledWatchEffect(() => {
      text.textContent = props.label
    })

    return root
  })
}

const VaporEntryApp = () => {
  const label = ref('alpha')

  return _$compiledRoot(() => {
    const root = document.createElement('section')
    const button = document.createElement('button')
    const anchor = document.createComment('vapor-entry-anchor')

    button.dataset.testid = 'vapor-entry-toggle'
    button.addEventListener('click', () => {
      label.value = label.value === 'alpha' ? 'beta' : 'alpha'
    })

    root.append(button, anchor)

    _$compiledWatchEffect(() => {
      button.textContent = label.value
      renderAnchor(_$createComponent(VaporEntryChild, { label: label.value }), root, anchor)
    })

    return root
  })
}

describe('vapor entry interop', () => {
  it('keeps static and dynamic compiled component handles cloneable on the compiled ABI', () => {
    const Component = () => null
    const compiled = _$createComponent(Component, null) as unknown as Record<string, unknown>
    const dynamic = _$createDynamic(Component, null) as unknown as Record<string, unknown>

    const clone = (handle: Record<string, unknown>) => {
      const factory = handle.__rue_compiled_clone
      expect(factory).toBeTypeOf('function')
      return Reflect.apply(factory as () => unknown, handle, []) as Record<string, unknown>
    }

    expect(compiled.__rue_compiled_component_factory__).toBe(Component)
    expect(clone(compiled).__rue_compiled_component_factory__).toBe(Component)
    expect(dynamic.__rue_compiled_component_factory__).toBe(Component)
    expect(clone(dynamic).__rue_compiled_component_factory__).toBe(Component)
  })

  it('shares the default client runtime identity across default and vapor app entries', () => {
    const defaultContainer = document.createElement('div')
    const vaporContainer = document.createElement('div')
    let defaultRuntime: unknown
    let vaporRuntime: unknown
    const defaultApp = useDefaultApp(() => {
      defaultRuntime = (globalThis as any).__rue_active
      return _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('main', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = { children: 'default' } as Record<
            string,
            any
          >
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })
    })
    const vaporApp = useVaporApp(() => {
      vaporRuntime = (globalThis as any).__rue_active
      return _$compiledRoot(() => document.createElement('main') as any)
    })
    document.body.append(defaultContainer, vaporContainer)

    defaultApp.mount(defaultContainer)
    vaporApp.mount(vaporContainer)

    expect(defaultRuntime).toBeTruthy()
    expect(vaporRuntime).toBe(defaultRuntime)

    vaporApp.unmount()
    defaultApp.unmount()
  })

  it('restores the outer current container after a nested cross-entry mount', () => {
    const outerContainer = document.createElement('div')
    const innerContainer = document.createElement('div')
    const observations: Array<[phase: string, defaultContainer: unknown, vaporContainer: unknown]> =
      []
    const innerApp = useVaporApp(() => {
      observations.push(['inner', getDefaultCurrentContainer(), getVaporCurrentContainer()])
      return _$compiledRoot(() => document.createElement('aside') as any)
    })
    const outerApp = useDefaultApp(() => {
      observations.push(['outer', getDefaultCurrentContainer(), getVaporCurrentContainer()])
      innerApp.mount(innerContainer)
      observations.push(['restored', getDefaultCurrentContainer(), getVaporCurrentContainer()])
      return _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('main', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = { children: 'outer' } as Record<
            string,
            any
          >
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })
    })
    document.body.append(outerContainer, innerContainer)

    outerApp.mount(outerContainer)

    expect(observations).toEqual([
      ['outer', outerContainer, outerContainer],
      ['inner', innerContainer, innerContainer],
      ['restored', outerContainer, outerContainer],
    ])

    innerApp.unmount()
    outerApp.unmount()
  })

  it('mounts vapor-entry portable handles through the default runtime', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    render(_$createDynamic(VaporEntryApp, null) as any, container as any)
    await flush()

    expect(container.querySelector('[data-testid="vapor-entry-value"]')?.textContent).toBe('alpha')

    ;(container.querySelector('[data-testid="vapor-entry-toggle"]') as HTMLButtonElement).click()
    await flush()

    expect(container.querySelector('[data-testid="vapor-entry-value"]')?.textContent).toBe('beta')
  })

  it('mounts a vapor portable component handle with children through renderAnchor', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const Child = () =>
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('span', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            'data-testid': 'anchor-child',
            children: 'child',
          } as Record<string, any>
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })
    const Shell = (props: { children?: unknown }) =>
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('section', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            'data-testid': 'anchor-shell',
            children: props.children,
          } as Record<string, any>
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })

    const App = () =>
      _$compiledRoot(() => {
        const root = document.createElement('div')
        const anchor = document.createComment('anchor-with-children')

        root.append(anchor)

        renderAnchor(
          _$createComponent(Shell, {
            children: _$createComponent(Child, null),
          }),
          root,
          anchor,
        )

        return root
      })

    render(_$createDynamic(App, null) as any, container as any)
    await flush()

    expect(container.querySelector('[data-testid="anchor-shell"]')?.textContent).toBe('child')
    expect(container.querySelector('[data-testid="anchor-child"]')?.textContent).toBe('child')
  })

  it('mounts multiple component children through the vapor renderAnchor entry', async () => {
    const container = document.createElement('div')
    const anchor = document.createComment('multi-renderable-anchor')

    document.body.appendChild(container)
    container.append(anchor)

    const Label = (props: { value: string }) =>
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('strong', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = { children: props.value } as Record<
            string,
            any
          >
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })

    renderAnchor(
      [_$createDynamic(Label, { value: 'A' }), _$createDynamic(Label, { value: 'B' })] as any,
      container as any,
      anchor as any,
    )
    await flush()

    expect(container.textContent).toBe('AB')
    expect(container.querySelectorAll('strong')).toHaveLength(2)
  })

  it('keeps a vapor child interactive when forwarded through props.children', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const CounterChild = () => {
      const count = ref(0)

      return _$compiledRoot(() => {
        const root = document.createElement('div')
        const button = document.createElement('button')

        button.dataset.testid = 'forwarded-child-button'
        button.addEventListener('click', () => {
          count.value += 1
        })

        root.appendChild(button)

        _$compiledWatchEffect(() => {
          button.textContent = String(count.value)
        })

        return root
      })
    }

    const Box = (props: { children?: unknown }) =>
      _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('div', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            'data-testid': 'forwarded-child-shell',
            children: props.children,
          } as Record<string, any>
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })

    render(
      _$createDynamic(Box, { children: _$createDynamic(CounterChild, null) }) as any,
      container as any,
    )
    await flush()

    const button = container.querySelector(
      '[data-testid="forwarded-child-button"]',
    ) as HTMLButtonElement | null

    expect(container.querySelector('[data-testid="forwarded-child-shell"]')?.textContent).toBe('0')

    button?.click()
    await flush()

    expect(container.querySelector('[data-testid="forwarded-child-shell"]')?.textContent).toBe('1')
  })

  it('preserves sibling row DOM when a LocalTodoList-style keyed list deletes the middle item', async () => {
    const state = signal({
      todos: [
        { id: 1, text: '学习响应式框架', completed: false },
        { id: 2, text: '编写示例代码', completed: true },
        { id: 3, text: '测试功能', completed: false },
      ],
    }) as any
    const todoViews = computed(() => {
      const items: any[] = []
      for (let index = 0; index < (state.getPath(['todos']) as Todo[]).length; index += 1) {
        items.push((state.getPath(['todos']) as Todo[])[index])
      }
      return items
    })

    const parent = document.createElement('div')
    const end = document.createComment('rue:list:end')
    parent.appendChild(end)
    document.body.appendChild(parent)

    const counts = new Map<number, number>()
    let elements = new Map<any, any>()
    _$compiledWatchEffect(() => {
      elements = _$compiledKeyedList({
        items: todoViews.get() || [],
        getKey: (item: any) => item.id,
        elements,
        parent,
        before: end,
        singleRoot: true,
        trackIndex: false,
        renderItem: (item: any, listParent: any, anchor: any) => {
          counts.set(item.id, (counts.get(item.id) || 0) + 1)
          renderAnchor(
            _$compiledRoot(() => {
              const root = document.createDocumentFragment()
              const row = document.createElement('div')
              const span = document.createElement('span')
              const button = document.createElement('button')
              const textAnchor = document.createComment('rue:slot:anchor')
              row.className = 'row'
              row.dataset.todoId = String(item.id)
              root.appendChild(row)
              span.appendChild(textAnchor)
              row.appendChild(span)
              button.textContent = '删除'
              row.appendChild(button)
              _$compiledWatchEffect(() => {
                row.dataset.completed = state.getPath([
                  'todos',
                  (state.getPath(['todos']) as Todo[]).findIndex(
                    (todo: any) => todo.id === item.id,
                  ),
                  'completed',
                ])
                  ? 'yes'
                  : 'no'
              })
              _$compiledWatchEffect(() => {
                renderAnchor(
                  state.getPath([
                    'todos',
                    (state.getPath(['todos']) as Todo[]).findIndex(
                      (todo: any) => todo.id === item.id,
                    ),
                    'text',
                  ]),
                  span,
                  textAnchor,
                )
              })
              return root as any
            }) as any,
            listParent,
            anchor,
          )
        },
      })
    })

    await flush()

    const firstRow = Array.from(parent.querySelectorAll('.row')).find(
      element =>
        (element as HTMLDivElement).querySelector('span')?.textContent === '学习响应式框架',
    ) as HTMLDivElement | undefined
    const tailRow = Array.from(parent.querySelectorAll('.row')).find(
      element => (element as HTMLDivElement).querySelector('span')?.textContent === '测试功能',
    ) as HTMLDivElement | undefined

    expect(firstRow).toBeTruthy()
    expect(tailRow).toBeTruthy()
    expect(counts.get(1)).toBe(1)
    expect(counts.get(2)).toBe(1)
    expect(counts.get(3)).toBe(1)

    state.mutatePath(['todos'], (todos: unknown) => (todos as Todo[]).splice(1, 1))

    await flush()

    const currentFirstRow = Array.from(parent.querySelectorAll('.row')).find(
      element =>
        (element as HTMLDivElement).querySelector('span')?.textContent === '学习响应式框架',
    ) as HTMLDivElement | undefined
    const currentTailRow = Array.from(parent.querySelectorAll('.row')).find(
      element => (element as HTMLDivElement).querySelector('span')?.textContent === '测试功能',
    ) as HTMLDivElement | undefined

    expect(counts.get(1)).toBe(1)
    expect(counts.get(2)).toBe(1)
    expect(counts.get(3)).toBe(1)
    expect(currentFirstRow).toBe(firstRow)
    expect(currentTailRow).toBe(tailRow)
    expect(Array.from(parent.querySelectorAll('.row')).map(row => row.textContent)).toEqual([
      '学习响应式框架删除',
      '测试功能删除',
    ])
  })

  it('updates a nested reactive array immediately inside a component callback after splice', async () => {
    const snapshots: number[][] = []
    const rawSnapshots: number[][] = []

    const App: FC = () => {
      const [state] = useState(() =>
        signal({
          todos: [{ id: 1 }, { id: 2 }, { id: 3 }],
        }),
      )

      const removeMiddle = () => {
        const index = (state.getPath(['todos']) as Todo[]).findIndex(item => item.id === 2)
        state.mutatePath(['todos'], (todos: unknown) => (todos as Todo[]).splice(index, 1))
        snapshots.push((state.getPath(['todos']) as Todo[]).map(item => item.id))
        rawSnapshots.push((state.peekPath(['todos']) as Array<{ id: number }>).map(item => item.id))
      }

      return _$compiledVapor(_$parentContext => {
        const _$root = _$compiledCreateElement('button', _$parentContext)
        const _$anchor = _$compiledCreateComment('rue:children:anchor')
        _$compiledAppendChild(_$root, _$anchor)
        _$compiledWatchEffect(() => {
          const { children: _$children, ..._$attributes } = {
            onClick: removeMiddle,
            children: '删除中间项',
          } as Record<string, any>
          _$compiledSpreadAttributes(_$root, _$attributes)
          _$compiledRenderAnchor(_$children, _$root, _$anchor)
        })
        return _$root
      })
    }

    const container = document.createElement('div')
    document.body.appendChild(container)

    render(_$createDynamic(App, null), container)
    await flush()

    ;(container.querySelector('button') as HTMLButtonElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    )
    await flush()

    expect(rawSnapshots).toEqual([[1, 3]])
    expect(snapshots).toEqual([[1, 3]])
  })

  it('preserves surrounding row DOM when a compiled JSX todo list deletes the middle item by button click', async () => {
    const todoSnapshots: number[][] = []

    const TodoListApp: FC = () => {
      const [state] = useState(() =>
        signal({
          todos: [
            { id: 1, text: '学习响应式框架', completed: false },
            { id: 2, text: '编写示例代码', completed: true },
            { id: 3, text: '测试功能', completed: false },
          ],
        }),
      )

      const deleteTodo = (id: number) => {
        const index = (state.getPath(['todos']) as Todo[]).findIndex(item => item.id === id)
        if (index !== -1) {
          state.mutatePath(['todos'], (todos: unknown) => (todos as Todo[]).splice(index, 1))
        }
        todoSnapshots.push((state.getPath(['todos']) as Todo[]).map(item => item.id))
      }

      return _$compiledRoot(() => {
        const root = document.createElement('div')
        const end = document.createComment('rue:list:end')
        let elements = new Map()

        root.appendChild(end)
        watchEffect(() => {
          elements = _$compiledKeyedList({
            items: state.getPath(['todos']) as Todo[],
            getKey: (todo: Todo) => todo.id,
            elements,
            parent: root,
            before: end,
            singleRoot: true,
            trackIndex: false,
            renderItem: (todo: Todo, parent, anchor) => {
              const row = document.createElement('div')
              const label = document.createElement('span')
              const button = document.createElement('button')

              row.className = 'row'
              row.dataset.todoId = String(todo.id)
              label.textContent = todo.text ?? null
              button.textContent = '删除'
              button.addEventListener('click', () => deleteTodo(todo.id))
              row.append(label, button)
              parent.insertBefore(row, anchor)
            },
          })
        })

        return root
      })
    }

    const container = document.createElement('div')
    document.body.appendChild(container)

    render(_$createDynamic(TodoListApp, null), container)
    await flush()

    const firstRow = Array.from(container.querySelectorAll('.row')).find(
      element =>
        (element as HTMLDivElement).querySelector('span')?.textContent === '学习响应式框架',
    ) as HTMLDivElement | undefined
    const middleRow = Array.from(container.querySelectorAll('.row')).find(
      element => (element as HTMLDivElement).querySelector('span')?.textContent === '编写示例代码',
    ) as HTMLDivElement | undefined
    const middleButton = middleRow?.querySelector('button') as HTMLButtonElement | null
    const tailRow = Array.from(container.querySelectorAll('.row')).find(
      element => (element as HTMLDivElement).querySelector('span')?.textContent === '测试功能',
    ) as HTMLDivElement | undefined

    expect(firstRow).toBeTruthy()
    expect(middleRow).toBeTruthy()
    expect(middleButton?.textContent?.trim()).toBe('删除')
    expect(tailRow).toBeTruthy()

    middleButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await flush()

    expect(todoSnapshots).toEqual([[1, 3]])

    const currentFirstRow = Array.from(container.querySelectorAll('.row')).find(
      element =>
        (element as HTMLDivElement).querySelector('span')?.textContent === '学习响应式框架',
    ) as HTMLDivElement | undefined
    const currentMiddleRow = Array.from(container.querySelectorAll('.row')).find(
      element => (element as HTMLDivElement).querySelector('span')?.textContent === '编写示例代码',
    ) as HTMLDivElement | undefined
    const currentTailRow = Array.from(container.querySelectorAll('.row')).find(
      element => (element as HTMLDivElement).querySelector('span')?.textContent === '测试功能',
    ) as HTMLDivElement | undefined

    expect(currentMiddleRow).toBeUndefined()
    expect(currentFirstRow).toBe(firstRow)
    expect(currentTailRow).toBe(tailRow)
    expect(Array.from(container.querySelectorAll('.row')).map(row => row.textContent)).toEqual([
      '学习响应式框架删除',
      '测试功能删除',
    ])
  })
})
