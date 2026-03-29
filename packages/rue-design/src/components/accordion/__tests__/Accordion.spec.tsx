import { afterEach, describe, expect, it } from 'vitest'
import { h, render } from 'rue-js'
import { Accordion } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Accordion', () => {
  it('renders with base class and children', () => {
    const c = document.createElement('div')
    render(
      h(
        Accordion,
        { name: 'acc' },
        h(Accordion.Title, null, 'Title'),
        h(Accordion.Content, null, 'Content'),
      ),
      c,
    )
    const el = c.querySelector('.collapse') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('collapse')).toBe(true)
    expect(c.textContent).toContain('Title')
    expect(c.textContent).toContain('Content')
  })

  it('applies icon classes', () => {
    const c = document.createElement('div')
    render(h(Accordion, { icon: 'arrow' }, h(Accordion.Title, null, 'x')), c)
    let el = c.querySelector('.collapse') as HTMLElement
    expect(el.classList.contains('collapse-arrow')).toBe(true)

    render(h(Accordion, { icon: 'plus' }, h(Accordion.Title, null, 'x')), c)
    el = c.querySelector('.collapse') as HTMLElement
    expect(el.classList.contains('collapse-plus')).toBe(true)
  })

  it('applies force classes', () => {
    const c = document.createElement('div')
    render(h(Accordion, { force: 'open' }, h(Accordion.Title, null, 'x')), c)
    let el = c.querySelector('.collapse') as HTMLElement
    expect(el.classList.contains('collapse-open')).toBe(true)

    render(h(Accordion, { force: 'close' }, h(Accordion.Title, null, 'x')), c)
    el = c.querySelector('.collapse') as HTMLElement
    expect(el.classList.contains('collapse-close')).toBe(true)
  })

  it('renders radio input with name and checked when open', () => {
    const c = document.createElement('div')
    render(h(Accordion, { name: 'group1', open: true }, h(Accordion.Title, null, 'x')), c)
    const input = c.querySelector('input[type="radio"]') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.name).toBe('group1')
    expect(input.checked).toBe(true)
  })

  it('renders details variant with open attribute', () => {
    const c = document.createElement('div')
    render(
      h(
        Accordion,
        { use: 'details', name: 'group2', open: true },
        h('summary', { className: 'collapse-title' }, 'Title'),
        h('div', { className: 'collapse-content' }, 'Content'),
      ),
      c,
    )
    const details = c.querySelector('details.collapse') as HTMLDetailsElement
    expect(details).toBeTruthy()
    expect(details.hasAttribute('open')).toBe(true)
  })

  it('appends custom className', () => {
    const c = document.createElement('div')
    render(h(Accordion, { className: 'border' }, h(Accordion.Title, null, 'x')), c)
    const el = c.querySelector('.collapse') as HTMLElement
    expect(el.classList.contains('border')).toBe(true)
  })

  it('renders from items array (radio)', () => {
    const c = document.createElement('div')
    render(
      h(Accordion, {
        name: 'group3',
        items: [
          { title: 'A', content: 'a', open: true },
          { title: 'B', content: 'b' },
        ],
      }),
      c,
    )
    const items = c.querySelectorAll('.collapse')
    expect(items.length).toBe(2)
    const inputs = c.querySelectorAll('input[type="radio"]')
    expect(inputs.length).toBe(2)
    expect((inputs[0] as HTMLInputElement).checked).toBe(true)
  })

  it('renders from items array (details)', () => {
    const c = document.createElement('div')
    render(
      h(Accordion, {
        use: 'details',
        name: 'group4',
        items: [
          { title: 'A', content: 'a', open: true },
          { title: 'B', content: 'b' },
        ],
      }),
      c,
    )
    const details = c.querySelectorAll('details.collapse')
    expect(details.length).toBe(2)
    expect((details[0] as HTMLDetailsElement).hasAttribute('open')).toBe(true)
    const titles = c.querySelectorAll('summary.collapse-title')
    expect(titles.length).toBe(2)
  })
})
