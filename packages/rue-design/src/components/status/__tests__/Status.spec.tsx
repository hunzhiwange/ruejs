import { afterEach, describe, expect, it } from 'vitest'
import { h, render } from '@rue-js/rue'
import { Status } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Status', () => {
  it('renders default as span with base class', () => {
    const c = document.createElement('div')
    render(h(Status, null), c)
    const el = c.querySelector('.status') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.tagName).toBe('SPAN')
    expect(el.classList.contains('status')).toBe(true)
  })

  it('supports as=div, size and color variants', () => {
    const c = document.createElement('div')
    render(h(Status, { as: 'div', ariaLabel: 'status', size: 'lg', color: 'primary' }), c)
    const el = c.querySelector('.status') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.tagName).toBe('DIV')
    expect(el.getAttribute('aria-label')).toBe('status')
    expect(el.classList.contains('status-lg')).toBe(true)
    expect(el.classList.contains('status-primary')).toBe(true)
  })

  it('appends custom className', () => {
    const c = document.createElement('div')
    render(h(Status, { className: 'animate-bounce' }), c)
    const el = c.querySelector('.status') as HTMLElement
    expect(el.classList.contains('animate-bounce')).toBe(true)
  })
})
