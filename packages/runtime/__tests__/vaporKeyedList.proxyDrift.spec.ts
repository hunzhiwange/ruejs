import { afterEach, describe, expect, it } from 'vitest'

import { computed, signal, renderAnchor, setReactiveScheduling, watchEffect } from '../src'
import { _$compiledRoot } from './legacy-test-render'
import { vaporKeyedList as _$compiledKeyedList } from './legacy-test-render'

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
})

const flushEffects = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('vaporKeyedList', () => {
  it('skips stale async updates after the list anchors detach', async () => {
    setReactiveScheduling('async')

    try {
      const items = signal([{ id: 'root', label: 'Root' }]) as any
      const parent = document.createElement('div')
      const start = document.createComment('rue:list:start')
      const end = document.createComment('rue:list:end')

      parent.append(start, end)
      document.body.appendChild(parent)

      let elements = new Map<any, any>()
      watchEffect(() => {
        elements = _$compiledKeyedList({
          items: items.get().map((item: any) => item),
          getKey: (item: any) => item.id,
          elements,
          parent: start.parentNode as any,
          before: end as any,
          start: start as any,
          renderItem: (item: any, listParent: any, _itemStart: any, itemEnd: any) => {
            renderAnchor(
              _$compiledRoot(() => {
                const row = document.createElement('div')
                row.className = 'row'
                row.textContent = item.label
                return row as any
              }) as any,
              listParent,
              itemEnd,
            )
          },
        })
      })

      await flushEffects()

      expect(parent.querySelector('.row')?.textContent).toBe('Root')

      parent.replaceChildren()
      items.mutatePath([], (list: any[]) => list.push({ id: 'child', label: 'Child' }))

      await flushEffects()

      expect(parent.childNodes).toHaveLength(0)
    } finally {
      setReactiveScheduling('sync')
    }
  })

  it('keeps keyed single-root rows aligned after removing the first reactive object item', async () => {
    const items = signal([
      { label: 'A', value: 100 },
      { label: 'B', value: 100 },
      { label: 'C', value: 100 },
    ]) as any

    const parent = document.createElement('div')
    const end = document.createComment('rue:list:end')
    parent.appendChild(end)
    document.body.appendChild(parent)

    let elements = new Map<any, any>()
    watchEffect(() => {
      elements = _$compiledKeyedList({
        items: items.get() || [],
        getKey: (item: any) => item.label,
        elements,
        parent,
        before: end,
        singleRoot: true,
        renderItem: (item: any, listParent: any, anchor: any) => {
          renderAnchor(
            _$compiledRoot(() => {
              const row = document.createElement('div')
              row.className = 'row'
              row.textContent = item.label
              return row as any
            }) as any,
            listParent,
            anchor,
          )
        },
      })
    })

    await flushEffects()
    expect(Array.from(parent.querySelectorAll('.row')).map(el => el.textContent)).toEqual([
      'A',
      'B',
      'C',
    ])

    const first = items.get()[0]
    items.mutatePath([], (list: any[]) => list.splice(list.indexOf(first), 1))

    await flushEffects()
    expect(Array.from(parent.querySelectorAll('.row')).map(el => el.textContent)).toEqual([
      'B',
      'C',
    ])
  })

  it('preserves keyed single-root row DOM when only the item index changes', async () => {
    const items = signal([
      { label: 'A', value: 100 },
      { label: 'B', value: 100 },
      { label: 'C', value: 100 },
    ]) as any

    const parent = document.createElement('div')
    const end = document.createComment('rue:list:end')
    parent.appendChild(end)
    document.body.appendChild(parent)

    const counts = new Map<string, number>()
    let listRuns = 0
    let elements = new Map<any, any>()
    watchEffect(() => {
      listRuns += 1
      elements = _$compiledKeyedList({
        items: items.get() || [],
        getKey: (item: any) => item.label,
        elements,
        parent,
        before: end,
        singleRoot: true,
        trackIndex: false,
        renderItem: (item: any, listParent: any, anchor: any) => {
          const label = item.label
          counts.set(label, (counts.get(label) || 0) + 1)
          renderAnchor(
            _$compiledRoot(() => {
              const row = document.createElement('div')
              row.className = 'row'
              row.textContent = item.label
              return row as any
            }) as any,
            listParent,
            anchor,
          )
        },
      })
    })

    await flushEffects()
    const preservedRow = Array.from(parent.querySelectorAll('.row')).find(
      element => element.textContent === 'B',
    )

    expect(preservedRow).toBeTruthy()
    expect(counts.get('B')).toBe(1)
    expect(listRuns).toBe(1)

    const first = items.get()[0]
    items.mutatePath([], (list: any[]) => list.splice(list.indexOf(first), 1))

    await flushEffects()

    const currentRow = Array.from(parent.querySelectorAll('.row')).find(
      element => element.textContent === 'B',
    )

    expect(counts.get('B')).toBe(1)
    expect(listRuns).toBe(2)
    expect(currentRow).toBe(preservedRow)
    expect(Array.from(parent.querySelectorAll('.row')).map(el => el.textContent)).toEqual([
      'B',
      'C',
    ])
  })

  it('preserves sibling row DOM when another keyed item changes', async () => {
    const state = signal({
      todos: [
        { id: 1, label: 'A', completed: false },
        { id: 2, label: 'B', completed: true },
        { id: 3, label: 'C', completed: false },
      ],
    }) as any
    const todoViews = computed(() => {
      const items: any[] = []
      for (let index = 0; index < state.getPath(['todos']).length; index += 1) {
        items.push(state.getPath(['todos'])[index])
      }
      return items
    })

    const parent = document.createElement('div')
    const end = document.createComment('rue:list:end')
    parent.appendChild(end)
    document.body.appendChild(parent)

    const counts = new Map<string, number>()
    let elements = new Map<any, any>()
    watchEffect(() => {
      elements = _$compiledKeyedList({
        items: todoViews.get() || [],
        getKey: (item: any) => item.id,
        elements,
        parent,
        before: end,
        singleRoot: true,
        trackIndex: false,
        renderItem: (item: any, listParent: any, anchor: any) => {
          const label = item.label
          counts.set(label, (counts.get(label) || 0) + 1)
          renderAnchor(
            _$compiledRoot(() => {
              const root = document.createDocumentFragment()
              const row = document.createElement('div')
              const span = document.createElement('span')
              const button = document.createElement('button')
              const textAnchor = document.createComment('rue:slot:anchor')
              row.className = 'row'
              root.appendChild(row)
              span.appendChild(textAnchor)
              row.appendChild(span)
              button.textContent = '删除'
              row.appendChild(button)
              watchEffect(() => {
                row.setAttribute('key', String(item.id))
              })
              watchEffect(() => {
                row.dataset.completed = state.getPath([
                  'todos',
                  state.getPath(['todos']).findIndex((todo: any) => todo.id === item.id),
                  'completed',
                ])
                  ? 'yes'
                  : 'no'
              })
              watchEffect(() => {
                renderAnchor(item.label, span, textAnchor)
              })
              return root as any
            }) as any,
            listParent,
            anchor,
          )
        },
      })
    })

    await flushEffects()

    const preservedRow = Array.from(parent.querySelectorAll('.row')).find(
      element => (element as HTMLDivElement).querySelector('span')?.textContent === 'B',
    ) as HTMLDivElement | undefined
    const preservedSpan = preservedRow?.querySelector('span') as HTMLSpanElement | null

    expect(preservedRow).toBeTruthy()
    expect(preservedSpan).toBeTruthy()
    expect(counts.get('B')).toBe(1)

    state.setPath(['todos', 0, 'completed'], true)

    await flushEffects()

    const currentRow = Array.from(parent.querySelectorAll('.row')).find(
      element => (element as HTMLDivElement).querySelector('span')?.textContent === 'B',
    ) as HTMLDivElement | undefined
    const currentSpan = currentRow?.querySelector('span') as HTMLSpanElement | null

    expect(counts.get('B')).toBe(1)
    expect(currentRow).toBe(preservedRow)
    expect(currentSpan).toBe(preservedSpan)
    expect((currentRow as HTMLDivElement | undefined)?.dataset.completed).toBe('yes')
  })

  it('preserves existing todo row DOM when LocalTodoList-style computed views append a new item', async () => {
    const state = signal({
      todos: [
        { id: 1, text: '学习响应式框架', completed: false },
        { id: 2, text: '编写示例代码', completed: true },
        { id: 3, text: '测试功能', completed: false },
      ],
    }) as any
    const todoViews = computed(() => {
      const items: any[] = []
      for (let index = 0; index < state.getPath(['todos']).length; index += 1) {
        items.push(state.getPath(['todos'])[index])
      }
      return items
    })

    const parent = document.createElement('div')
    const end = document.createComment('rue:list:end')
    parent.appendChild(end)
    document.body.appendChild(parent)

    const counts = new Map<number, number>()
    let elements = new Map<any, any>()
    watchEffect(() => {
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
              watchEffect(() => {
                row.dataset.completed = state.getPath([
                  'todos',
                  state.getPath(['todos']).findIndex((todo: any) => todo.id === item.id),
                  'completed',
                ])
                  ? 'yes'
                  : 'no'
              })
              watchEffect(() => {
                renderAnchor(
                  state.getPath([
                    'todos',
                    state.getPath(['todos']).findIndex((todo: any) => todo.id === item.id),
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

    await flushEffects()

    const firstRow = Array.from(parent.querySelectorAll('.row')).find(
      element =>
        (element as HTMLDivElement).querySelector('span')?.textContent === '学习响应式框架',
    ) as HTMLDivElement | undefined
    const preservedRow = Array.from(parent.querySelectorAll('.row')).find(
      element => (element as HTMLDivElement).querySelector('span')?.textContent === '编写示例代码',
    ) as HTMLDivElement | undefined
    const preservedSpan = preservedRow?.querySelector('span') as HTMLSpanElement | null

    expect(firstRow).toBeTruthy()
    expect(preservedRow).toBeTruthy()
    expect(preservedSpan).toBeTruthy()
    expect(counts.get(1)).toBe(1)
    expect(counts.get(2)).toBe(1)
    expect(counts.get(3)).toBe(1)

    state.mutatePath(['todos'], (todos: any[]) =>
      todos.push({ id: 4, text: '本地新增任务', completed: false }),
    )

    await flushEffects()

    const currentFirstRow = Array.from(parent.querySelectorAll('.row')).find(
      element =>
        (element as HTMLDivElement).querySelector('span')?.textContent === '学习响应式框架',
    ) as HTMLDivElement | undefined
    const currentPreservedRow = Array.from(parent.querySelectorAll('.row')).find(
      element => (element as HTMLDivElement).querySelector('span')?.textContent === '编写示例代码',
    ) as HTMLDivElement | undefined
    const currentPreservedSpan = currentPreservedRow?.querySelector(
      'span',
    ) as HTMLSpanElement | null

    expect(counts.get(1)).toBe(1)
    expect(counts.get(2)).toBe(1)
    expect(counts.get(3)).toBe(1)
    expect(counts.get(4)).toBe(1)
    expect(currentFirstRow).toBe(firstRow)
    expect(currentPreservedRow).toBe(preservedRow)
    expect(currentPreservedSpan).toBe(preservedSpan)
    expect(Array.from(parent.querySelectorAll('.row')).map(row => row.textContent)).toEqual([
      '学习响应式框架删除',
      '编写示例代码删除',
      '测试功能删除',
      '本地新增任务删除',
    ])
  })

  it('preserves remaining todo row DOM when LocalTodoList-style computed views delete the first item', async () => {
    const state = signal({
      todos: [
        { id: 1, text: '学习响应式框架', completed: false },
        { id: 2, text: '编写示例代码', completed: true },
        { id: 3, text: '测试功能', completed: false },
      ],
    }) as any
    const todoViews = computed(() => {
      const items: any[] = []
      for (let index = 0; index < state.getPath(['todos']).length; index += 1) {
        items.push(state.getPath(['todos'])[index])
      }
      return items
    })

    const parent = document.createElement('div')
    const end = document.createComment('rue:list:end')
    parent.appendChild(end)
    document.body.appendChild(parent)

    const counts = new Map<number, number>()
    let elements = new Map<any, any>()
    watchEffect(() => {
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
              watchEffect(() => {
                row.dataset.completed = state.getPath([
                  'todos',
                  state.getPath(['todos']).findIndex((todo: any) => todo.id === item.id),
                  'completed',
                ])
                  ? 'yes'
                  : 'no'
              })
              watchEffect(() => {
                renderAnchor(
                  state.getPath([
                    'todos',
                    state.getPath(['todos']).findIndex((todo: any) => todo.id === item.id),
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

    await flushEffects()

    const preservedRow = Array.from(parent.querySelectorAll('.row')).find(
      element => (element as HTMLDivElement).querySelector('span')?.textContent === '编写示例代码',
    ) as HTMLDivElement | undefined
    const preservedSpan = preservedRow?.querySelector('span') as HTMLSpanElement | null
    const thirdRow = Array.from(parent.querySelectorAll('.row')).find(
      element => (element as HTMLDivElement).querySelector('span')?.textContent === '测试功能',
    ) as HTMLDivElement | undefined

    expect(preservedRow).toBeTruthy()
    expect(preservedSpan).toBeTruthy()
    expect(thirdRow).toBeTruthy()
    expect(counts.get(1)).toBe(1)
    expect(counts.get(2)).toBe(1)
    expect(counts.get(3)).toBe(1)

    state.mutatePath(['todos'], (todos: any[]) => todos.splice(0, 1))

    await flushEffects()

    const currentPreservedRow = Array.from(parent.querySelectorAll('.row')).find(
      element => (element as HTMLDivElement).querySelector('span')?.textContent === '编写示例代码',
    ) as HTMLDivElement | undefined
    const currentPreservedSpan = currentPreservedRow?.querySelector(
      'span',
    ) as HTMLSpanElement | null
    const currentThirdRow = Array.from(parent.querySelectorAll('.row')).find(
      element => (element as HTMLDivElement).querySelector('span')?.textContent === '测试功能',
    ) as HTMLDivElement | undefined

    expect(counts.get(1)).toBe(1)
    expect(counts.get(2)).toBe(1)
    expect(counts.get(3)).toBe(1)
    expect(currentPreservedRow).toBe(preservedRow)
    expect(currentPreservedSpan).toBe(preservedSpan)
    expect(currentThirdRow).toBe(thirdRow)
    expect(Array.from(parent.querySelectorAll('.row')).map(row => row.textContent)).toEqual([
      '编写示例代码删除',
      '测试功能删除',
    ])
  })

  it('preserves sibling row DOM when LocalTodoList-style computed views delete the middle item', async () => {
    const state = signal({
      todos: [
        { id: 1, text: '学习响应式框架', completed: false },
        { id: 2, text: '编写示例代码', completed: true },
        { id: 3, text: '测试功能', completed: false },
      ],
    }) as any
    const todoViews = computed(() => {
      const items: any[] = []
      for (let index = 0; index < state.getPath(['todos']).length; index += 1) {
        items.push(state.getPath(['todos'])[index])
      }
      return items
    })

    const parent = document.createElement('div')
    const end = document.createComment('rue:list:end')
    parent.appendChild(end)
    document.body.appendChild(parent)

    const counts = new Map<number, number>()
    let elements = new Map<any, any>()
    watchEffect(() => {
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
              watchEffect(() => {
                row.dataset.completed = state.getPath([
                  'todos',
                  state.getPath(['todos']).findIndex((todo: any) => todo.id === item.id),
                  'completed',
                ])
                  ? 'yes'
                  : 'no'
              })
              watchEffect(() => {
                renderAnchor(
                  state.getPath([
                    'todos',
                    state.getPath(['todos']).findIndex((todo: any) => todo.id === item.id),
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

    await flushEffects()

    const firstRow = Array.from(parent.querySelectorAll('.row')).find(
      element =>
        (element as HTMLDivElement).querySelector('span')?.textContent === '学习响应式框架',
    ) as HTMLDivElement | undefined
    const firstSpan = firstRow?.querySelector('span') as HTMLSpanElement | null
    const tailRow = Array.from(parent.querySelectorAll('.row')).find(
      element => (element as HTMLDivElement).querySelector('span')?.textContent === '测试功能',
    ) as HTMLDivElement | undefined
    const tailSpan = tailRow?.querySelector('span') as HTMLSpanElement | null

    expect(firstRow).toBeTruthy()
    expect(firstSpan).toBeTruthy()
    expect(tailRow).toBeTruthy()
    expect(tailSpan).toBeTruthy()
    expect(counts.get(1)).toBe(1)
    expect(counts.get(2)).toBe(1)
    expect(counts.get(3)).toBe(1)

    state.mutatePath(['todos'], (todos: any[]) => todos.splice(1, 1))

    await flushEffects()

    const currentFirstRow = Array.from(parent.querySelectorAll('.row')).find(
      element =>
        (element as HTMLDivElement).querySelector('span')?.textContent === '学习响应式框架',
    ) as HTMLDivElement | undefined
    const currentFirstSpan = currentFirstRow?.querySelector('span') as HTMLSpanElement | null
    const currentTailRow = Array.from(parent.querySelectorAll('.row')).find(
      element => (element as HTMLDivElement).querySelector('span')?.textContent === '测试功能',
    ) as HTMLDivElement | undefined
    const currentTailSpan = currentTailRow?.querySelector('span') as HTMLSpanElement | null

    expect(counts.get(1)).toBe(1)
    expect(counts.get(2)).toBe(1)
    expect(counts.get(3)).toBe(1)
    expect(currentFirstRow).toBe(firstRow)
    expect(currentFirstSpan).toBe(firstSpan)
    expect(currentTailRow).toBe(tailRow)
    expect(currentTailSpan).toBe(tailSpan)
    expect(Array.from(parent.querySelectorAll('.row')).map(row => row.textContent)).toEqual([
      '学习响应式框架删除',
      '测试功能删除',
    ])
  })

  it('updates the toggled todo row reactively without remounting it', async () => {
    const state = signal({
      todos: [
        { id: 1, text: '学习响应式框架', completed: false },
        { id: 2, text: '编写示例代码', completed: true },
        { id: 3, text: '测试功能', completed: false },
      ],
    }) as any
    const todoViews = computed(() => {
      const items: any[] = []
      for (let index = 0; index < state.getPath(['todos']).length; index += 1) {
        items.push(state.getPath(['todos'])[index])
      }
      return items
    })

    const parent = document.createElement('div')
    const end = document.createComment('rue:list:end')
    parent.appendChild(end)
    document.body.appendChild(parent)

    const counts = new Map<number, number>()
    let elements = new Map<any, any>()
    watchEffect(() => {
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
              watchEffect(() => {
                row.dataset.completed = state.getPath([
                  'todos',
                  state.getPath(['todos']).findIndex((todo: any) => todo.id === item.id),
                  'completed',
                ])
                  ? 'yes'
                  : 'no'
              })
              watchEffect(() => {
                renderAnchor(
                  state.getPath([
                    'todos',
                    state.getPath(['todos']).findIndex((todo: any) => todo.id === item.id),
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

    await flushEffects()

    const toggledRow = Array.from(parent.querySelectorAll('.row')).find(
      element =>
        (element as HTMLDivElement).querySelector('span')?.textContent === '学习响应式框架',
    ) as HTMLDivElement | undefined
    const toggledSpan = toggledRow?.querySelector('span') as HTMLSpanElement | null

    expect(toggledRow).toBeTruthy()
    expect(toggledSpan).toBeTruthy()
    expect(toggledRow?.dataset.completed).toBe('no')
    expect(counts.get(1)).toBe(1)

    state.setPath(['todos', 0, 'completed'], true)

    await flushEffects()

    const currentToggledRow = Array.from(parent.querySelectorAll('.row')).find(
      element =>
        (element as HTMLDivElement).querySelector('span')?.textContent === '学习响应式框架',
    ) as HTMLDivElement | undefined
    const currentToggledSpan = currentToggledRow?.querySelector('span') as HTMLSpanElement | null

    expect(counts.get(1)).toBe(1)
    expect(currentToggledRow).toBe(toggledRow)
    expect(currentToggledSpan).toBe(toggledSpan)
    expect(currentToggledRow?.dataset.completed).toBe('yes')
  })

  it('tracks JSON.stringify for reactive arrays inside watchEffect', async () => {
    const items = signal([{ label: 'A' }]) as any
    const pre = document.createElement('pre')
    document.body.appendChild(pre)

    watchEffect(() => {
      pre.textContent = JSON.stringify(items.get())
    })

    await flushEffects()
    expect(pre.textContent).toContain('"A"')

    items.mutatePath([], (list: any[]) => list.push({ label: 'B' }))

    await flushEffects()
    expect(pre.textContent).toContain('"B"')
  })

  it('preserves sibling row DOM after removing an items proxy', async () => {
    const items = signal([
      { label: 'A', value: 100 },
      { label: 'B', value: 100 },
      { label: 'C', value: 100 },
    ]) as any

    const parent = document.createElement('div')
    const end = document.createComment('rue:list:end')
    parent.appendChild(end)
    document.body.appendChild(parent)

    const counts = new Map<string, number>()
    let elements = new Map<any, any>()
    watchEffect(() => {
      elements = _$compiledKeyedList({
        items: items.get() || [],
        getKey: (item: any) => item.label,
        elements,
        parent,
        before: end,
        singleRoot: true,
        trackIndex: false,
        renderItem: (item: any, listParent: any, anchor: any) => {
          const label = item.label
          counts.set(label, (counts.get(label) || 0) + 1)
          renderAnchor(
            _$compiledRoot(() => {
              const row = document.createElement('div')
              row.className = 'row'
              row.textContent = item.label
              return row as any
            }) as any,
            listParent,
            anchor,
          )
        },
      })
    })

    await flushEffects()
    const preservedRow = Array.from(parent.querySelectorAll('.row')).find(
      element => element.textContent === 'B',
    )

    expect(preservedRow).toBeTruthy()
    expect(counts.get('B')).toBe(1)

    // remove first item A
    items.mutatePath([], (list: any[]) => list.shift())

    await flushEffects()

    const currentRow = Array.from(parent.querySelectorAll('.row')).find(
      element => element.textContent === 'B',
    )

    expect(counts.get('B')).toBe(1)
    expect(currentRow).toBe(preservedRow)
  })
})
