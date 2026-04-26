import { afterEach, describe, expect, it } from 'vitest'
import { h } from '@rue-js/rue'
import { render } from '@rue-js/rue'
import { Alert } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Alert', () => {
  it('renders with role and base class', () => {
    const c = document.createElement('div')
    render(h(Alert, null, 'hello'), c)
    const el = c.querySelector('[role="alert"]') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('alert')).toBe(true)
    expect(el.textContent).toContain('hello')
  })

  it('applies variant classes', () => {
    const c = document.createElement('div')
    ;(['info', 'success', 'warning', 'error'] as const).forEach(v => {
      render(h(Alert, { variant: v }, 'x'), c)
      const el = c.querySelector('[role="alert"]') as HTMLElement
      expect(el.classList.contains('alert')).toBe(true)
      expect(el.classList.contains(`alert-${v}`)).toBe(true)
    })
  })

  it('applies outline, dash, soft classes', () => {
    const c = document.createElement('div')
    render(h(Alert, { outline: true, dash: true, soft: true }, 'x'), c)
    const el = c.querySelector('[role="alert"]') as HTMLElement
    expect(el.classList.contains('alert-outline')).toBe(true)
    expect(el.classList.contains('alert-dash')).toBe(true)
    expect(el.classList.contains('alert-soft')).toBe(true)
  })

  it('applies direction classes', () => {
    const c = document.createElement('div')
    render(h(Alert, { direction: 'vertical' }, 'x'), c)
    let el = c.querySelector('[role="alert"]') as HTMLElement
    expect(el.classList.contains('alert-vertical')).toBe(true)

    render(h(Alert, { direction: 'horizontal' }, 'x'), c)
    el = c.querySelector('[role="alert"]') as HTMLElement
    expect(el.classList.contains('alert-horizontal')).toBe(true)
  })

  it('appends custom className', () => {
    const c = document.createElement('div')
    render(h(Alert, { className: 'w-full' }, 'x'), c)
    const el = c.querySelector('[role="alert"]') as HTMLElement
    expect(el.classList.contains('w-full')).toBe(true)
  })

  it('renders children nodes', () => {
    const c = document.createElement('div')
    render(h(Alert, null, h('span', { id: 't' }, 'child')), c)
    const el = c.querySelector('#t') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.textContent).toBe('child')
  })
})
