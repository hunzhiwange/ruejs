import { afterEach, describe, expect, it } from 'vitest'
import { h, render } from 'rue-js'
import { Divider } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Divider', () => {
  it('renders with base class and children', () => {
    const c = document.createElement('div')
    render(h(Divider, null, 'OR'), c)
    const el = c.querySelector('.divider') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.textContent).toContain('OR')
  })

  it('applies direction classes', () => {
    const c = document.createElement('div')
    render(h(Divider, { direction: 'vertical' }, 'x'), c)
    let el = c.querySelector('.divider') as HTMLElement
    expect(el.classList.contains('divider-vertical')).toBe(true)

    render(h(Divider, { direction: 'horizontal' }, 'x'), c)
    el = c.querySelector('.divider') as HTMLElement
    expect(el.classList.contains('divider-horizontal')).toBe(true)
  })

  it('applies placement classes', () => {
    const c = document.createElement('div')
    render(h(Divider, { placement: 'start' }, 'x'), c)
    let el = c.querySelector('.divider') as HTMLElement
    expect(el.classList.contains('divider-start')).toBe(true)

    render(h(Divider, { placement: 'end' }, 'x'), c)
    el = c.querySelector('.divider') as HTMLElement
    expect(el.classList.contains('divider-end')).toBe(true)
  })

  it('applies variant classes', () => {
    const c = document.createElement('div')
    ;(
      ['neutral', 'primary', 'secondary', 'accent', 'success', 'warning', 'info', 'error'] as const
    ).forEach(v => {
      render(h(Divider, { variant: v }, 'x'), c)
      const el = c.querySelector('.divider') as HTMLElement
      expect(el.classList.contains(`divider-${v}`)).toBe(true)
    })
  })

  it('appends custom className', () => {
    const c = document.createElement('div')
    render(h(Divider, { className: 'w-full' }, 'x'), c)
    const el = c.querySelector('.divider') as HTMLElement
    expect(el.classList.contains('w-full')).toBe(true)
  })
})
