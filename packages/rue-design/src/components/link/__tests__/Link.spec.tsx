import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, render } from '@rue-js/rue'
import { Link } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Link', () => {
  it('renders with base class', () => {
    const c = document.createElement('div')
    render(h(Link, null, 'hello'), c)
    const el = c.querySelector('.link') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('link')).toBe(true)
    expect(el.textContent).toContain('hello')
    expect(el.tagName.toLowerCase()).toBe('a')
  })

  it('supports router to', () => {
    const c = document.createElement('div')
    render(h(Link, { to: '/about' }, 'go'), c)
    const el = c.querySelector('.link') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.textContent).toContain('go')
  })

  it('applies color variants', () => {
    const c = document.createElement('div')
    ;(
      ['neutral', 'primary', 'secondary', 'accent', 'success', 'info', 'warning', 'error'] as const
    ).forEach(v => {
      render(h(Link, { variant: v }, 'x'), c)
      const el = c.querySelector('.link') as HTMLElement
      expect(el.classList.contains(`link-${v}`)).toBe(true)
    })
  })

  it('applies hover style', () => {
    const c = document.createElement('div')
    render(h(Link, { hover: true }, 'x'), c)
    const el = c.querySelector('.link') as HTMLElement
    expect(el.classList.contains('link-hover')).toBe(true)
  })

  it('supports href and target', () => {
    const c = document.createElement('div')
    render(h(Link, { href: '/test', target: '_blank' }, 'x'), c)
    const el = c.querySelector('.link') as HTMLAnchorElement
    expect(el.getAttribute('href')).toBe('/test')
    expect(el.getAttribute('target')).toBe('_blank')
  })

  it('fires onClick handler', () => {
    const c = document.createElement('div')
    const fn = vi.fn()
    render(h(Link, { onClick: fn }, 'x'), c)
    const el = c.querySelector('.link') as HTMLAnchorElement
    el.click()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('appends custom className', () => {
    const c = document.createElement('div')
    render(h(Link, { className: 'extra' }, 'x'), c)
    const el = c.querySelector('.link') as HTMLElement
    expect(el.classList.contains('extra')).toBe(true)
  })
})
