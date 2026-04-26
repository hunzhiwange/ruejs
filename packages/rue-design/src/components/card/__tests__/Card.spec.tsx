import { afterEach, describe, expect, it } from 'vitest'
import { h } from '@rue-js/rue'
import { render } from '@rue-js/rue'
import { Card } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Card', () => {
  it('renders with base class', () => {
    const c = document.createElement('div')
    render(h(Card, null, 'hello'), c)
    const el = c.querySelector('.card') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('card')).toBe(true)
    expect(el.textContent).toContain('hello')
  })

  it('applies size classes', () => {
    const c = document.createElement('div')
    ;(['xs', 'sm', 'md', 'lg', 'xl'] as const).forEach(s => {
      render(h(Card, { size: s }, 'x'), c)
      const el = c.querySelector('.card') as HTMLElement
      expect(el.classList.contains('card')).toBe(true)
      expect(el.classList.contains(`card-${s}`)).toBe(true)
    })
  })

  it('applies border, dash, side, imageFull classes', () => {
    const c = document.createElement('div')
    render(h(Card, { border: true, dash: true, side: true, imageFull: true }, 'x'), c)
    const el = c.querySelector('.card') as HTMLElement
    expect(el.classList.contains('card-border')).toBe(true)
    expect(el.classList.contains('card-dash')).toBe(true)
    expect(el.classList.contains('card-side')).toBe(true)
    expect(el.classList.contains('image-full')).toBe(true)
  })

  it('appends custom className', () => {
    const c = document.createElement('div')
    render(h(Card, { className: 'w-96 bg-base-100' }, 'x'), c)
    const el = c.querySelector('.card') as HTMLElement
    expect(el.classList.contains('w-96')).toBe(true)
    expect(el.classList.contains('bg-base-100')).toBe(true)
  })

  it('renders children nodes', () => {
    const c = document.createElement('div')
    render(
      h(
        Card,
        null,
        h(
          'div',
          { className: 'card-body' },
          h('h2', { id: 't', className: 'card-title' }, 'child'),
        ),
      ),
      c,
    )
    const el = c.querySelector('#t') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.textContent).toBe('child')
  })

  it('renders Body, Title, Actions, Figure subcomponents', () => {
    const c = document.createElement('div')
    render(
      h(
        Card,
        null,
        h(Card.Figure, null, h('img', { src: 'x', alt: 'y' })),
        h(
          Card.Body,
          null,
          h(Card.Title, null, 'Hello'),
          h('p', null, 'content'),
          h(Card.Actions, null, h('button', { className: 'btn' }, 'Go')),
        ),
      ),
      c,
    )
    const body = c.querySelector('.card-body') as HTMLElement
    const title = c.querySelector('.card-title') as HTMLElement
    const actions = c.querySelector('.card-actions') as HTMLElement
    const figure = c.querySelector('figure') as HTMLElement
    expect(body).toBeTruthy()
    expect(title).toBeTruthy()
    expect(actions).toBeTruthy()
    expect(figure).toBeTruthy()
  })
})
