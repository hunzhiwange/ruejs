import { afterEach, describe, expect, it } from 'vitest'
import { h } from '@rue-js/rue'
import { render } from '@rue-js/rue'
import { Diff } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Diff', () => {
  it('renders with base class and children', () => {
    const c = document.createElement('div')
    render(h(Diff, null, 'x'), c)
    const el = c.querySelector('.diff') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('diff')).toBe(true)
    expect(el.textContent).toContain('x')
  })

  it('applies custom className and tabIndex', () => {
    const c = document.createElement('div')
    render(h(Diff, { className: 'rounded-field aspect-16/9', tabIndex: 0 }, 'y'), c)
    const el = c.querySelector('figure.diff') as HTMLElement
    expect(el.classList.contains('rounded-field')).toBe(true)
    expect(el.classList.contains('aspect-16/9')).toBe(true)
    expect(el.getAttribute('tabindex')).toBe('0')
  })

  it('renders Item1, Item2, and Resizer subcomponents', () => {
    const c = document.createElement('div')
    render(
      h(
        Diff,
        null,
        h(Diff.Item1, { role: 'img', tabIndex: 0 }, h('div', { id: 'a' }, 'A')),
        h(Diff.Item2, { role: 'img' }, h('div', { id: 'b' }, 'B')),
        h(Diff.Resizer, null),
      ),
      c,
    )
    const i1 = c.querySelector('.diff-item-1') as HTMLElement
    const i2 = c.querySelector('.diff-item-2') as HTMLElement
    const res = c.querySelector('.diff-resizer') as HTMLElement
    expect(i1).toBeTruthy()
    expect(i1.getAttribute('role')).toBe('img')
    expect(i1.getAttribute('tabindex')).toBe('0')
    expect(i2).toBeTruthy()
    expect(i2.getAttribute('role')).toBe('img')
    expect(res).toBeTruthy()
    expect(c.querySelector('#a')?.textContent).toBe('A')
    expect(c.querySelector('#b')?.textContent).toBe('B')
  })
})
