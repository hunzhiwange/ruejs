import { afterEach, describe, expect, it } from 'vitest'

import {
  _$vaporKeyedList,
  reactive,
  renderAnchor,
  setReactiveScheduling,
  vapor,
  watchEffect,
} from '../src'

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
})

const flushEffects = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('vaporKeyedList', () => {
  it('keeps keyed single-root rows aligned after removing the first reactive object item', async () => {
    const items = reactive([
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
      elements = _$vaporKeyedList({
        items: items || [],
        getKey: (item: any) => item.label,
        elements,
        parent,
        before: end,
        singleRoot: true,
        renderItem: (item: any, listParent: any, anchor: any) => {
          renderAnchor(
            vapor(() => {
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

    const first = items[0]
    items.splice(items.indexOf(first), 1)

    await flushEffects()
    expect(Array.from(parent.querySelectorAll('.row')).map(el => el.textContent)).toEqual([
      'B',
      'C',
    ])
  })

  it('tracks JSON.stringify for reactive arrays inside watchEffect', async () => {
    const items = reactive([{ label: 'A' }]) as any
    const pre = document.createElement('pre')
    document.body.appendChild(pre)

    watchEffect(() => {
      pre.textContent = JSON.stringify(items)
    })

    await flushEffects()
    expect(pre.textContent).toContain('"A"')

    items.push({ label: 'B' })

    await flushEffects()
    expect(pre.textContent).toContain('"B"')
  })
})
