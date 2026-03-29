import { afterEach, describe, expect, it } from 'vitest'
import { h, render } from 'rue-js'
import { List } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('List', () => {
  it('renders with base class and children', () => {
    const c = document.createElement('div')
    render(h(List, null, 'hello'), c)
    const el = c.querySelector('.list') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('list')).toBe(true)
    expect(el.textContent).toContain('hello')
  })

  it('appends custom className', () => {
    const c = document.createElement('div')
    render(h(List, { className: 'bg-base-100 rounded-box shadow-md' }, 'x'), c)
    const el = c.querySelector('.list') as HTMLElement
    expect(el.classList.contains('bg-base-100')).toBe(true)
    expect(el.classList.contains('rounded-box')).toBe(true)
    expect(el.classList.contains('shadow-md')).toBe(true)
  })

  it('renders Row subcomponent', () => {
    const c = document.createElement('div')
    render(h(List, null, h(List.Row, null, 'row')), c)
    const row = c.querySelector('li.list-row') as HTMLElement
    expect(row).toBeTruthy()
    expect(row.textContent).toContain('row')
  })

  it('renders ColGrow and ColWrap subcomponents with correct tags and classes', () => {
    const c = document.createElement('div')
    render(
      h(
        List,
        null,
        h(
          List.Row,
          null,
          h(List.ColGrow, null, 'grow-content'),
          h(List.ColWrap, { as: 'p', className: 'text-xs' }, 'wrap-content'),
        ),
      ),
      c,
    )
    const grow = c.querySelector('.list-row .list-col-grow') as HTMLElement
    const wrap = c.querySelector('.list-row p.list-col-wrap') as HTMLElement
    expect(grow).toBeTruthy()
    expect(grow.textContent).toContain('grow-content')
    expect(wrap).toBeTruthy()
    expect(wrap.classList.contains('text-xs')).toBe(true)
    expect(wrap.textContent).toContain('wrap-content')
  })

  it('renders Item as plain li with custom classes', () => {
    const c = document.createElement('div')
    render(h(List, null, h(List.Item, { className: 'p-4 pb-2 text-xs' }, 'header')), c)
    const item = c.querySelector('ul.list > li.p-4.pb-2.text-xs') as HTMLElement
    expect(item).toBeTruthy()
    expect(item.textContent).toContain('header')
  })

  it('renders Row with normal=true as plain li without list-row class', () => {
    const c = document.createElement('div')
    render(h(List, null, h(List.Row, { normal: true, className: 'p-2' }, 'plain')), c)
    const item = c.querySelector('ul.list > li.p-2') as HTMLElement
    expect(item).toBeTruthy()
    expect(item.classList.contains('list-row')).toBe(false)
    expect(item.textContent).toContain('plain')
  })
})
