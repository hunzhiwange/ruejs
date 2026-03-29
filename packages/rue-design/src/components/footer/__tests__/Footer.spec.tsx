import { afterEach, describe, expect, it } from 'vitest'
import { h, render } from 'rue-js'
import { Footer } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Footer', () => {
  it('renders with base class and children', () => {
    const c = document.createElement('div')
    render(h(Footer, null, h('nav', null, h('h6', { className: 'footer-title' }, 'Title'))), c)
    const el = c.querySelector('footer') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('footer')).toBe(true)
    const title = c.querySelector('.footer-title') as HTMLElement
    expect(title).toBeTruthy()
    expect(title.textContent).toBe('Title')
  })

  it('applies direction classes', () => {
    const c = document.createElement('div')
    render(h(Footer, { direction: 'vertical' }, 'x'), c)
    let el = c.querySelector('footer') as HTMLElement
    expect(el.classList.contains('footer-vertical')).toBe(true)

    render(h(Footer, { direction: 'horizontal' }, 'x'), c)
    el = c.querySelector('footer') as HTMLElement
    expect(el.classList.contains('footer-horizontal')).toBe(true)
  })

  it('applies center class', () => {
    const c = document.createElement('div')
    render(h(Footer, { center: true }, 'x'), c)
    const el = c.querySelector('footer') as HTMLElement
    expect(el.classList.contains('footer-center')).toBe(true)
  })

  it('appends custom className', () => {
    const c = document.createElement('div')
    render(h(Footer, { className: 'p-10 bg-neutral text-neutral-content' }, 'x'), c)
    const el = c.querySelector('footer') as HTMLElement
    expect(el.classList.contains('p-10')).toBe(true)
    expect(el.classList.contains('bg-neutral')).toBe(true)
  })
})
