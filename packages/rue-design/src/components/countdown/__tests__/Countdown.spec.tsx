import { afterEach, describe, expect, it } from 'vitest'
import { h, render } from '@rue-js/rue'
import { Countdown } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Countdown', () => {
  it('renders wrapper with base class', () => {
    const c = document.createElement('div')
    render(h(Countdown, null, 'x'), c)
    const el = c.querySelector('.countdown') as HTMLElement
    expect(el).toBeTruthy()
  })

  it('applies custom className on wrapper', () => {
    const c = document.createElement('div')
    render(h(Countdown, { className: 'font-mono text-2xl' }, 'x'), c)
    const el = c.querySelector('.countdown') as HTMLElement
    expect(el.classList.contains('font-mono')).toBe(true)
    expect(el.classList.contains('text-2xl')).toBe(true)
  })

  it('renders Value with --value style and text', () => {
    const c = document.createElement('div')
    render(h(Countdown, null, [h(Countdown.Value, { value: 59 })]), c)
    const inner = c.querySelector('.countdown > span') as HTMLElement
    expect(inner).toBeTruthy()
    expect(inner.getAttribute('style') || '').toMatch(/--value:\s*59/)
    expect(inner.getAttribute('aria-live')).toBe('polite')
    expect(inner.getAttribute('aria-label')).toBe('59')
  })

  it('supports digits via --digits style', () => {
    const c = document.createElement('div')
    render(h(Countdown, null, [h(Countdown.Value, { value: 9, digits: 2 })]), c)
    const inner = c.querySelector('.countdown > span') as HTMLElement
    expect(inner.getAttribute('style') || '').toMatch(/--digits:\s*2/)
  })

  it('renders from items array with values and separators', () => {
    const c = document.createElement('div')
    const items = [
      { value: 10 },
      { content: 'h' },
      { value: 24, digits: 2 },
      { content: 'm' },
      { value: 59, digits: 2 },
      { content: 's' },
    ]
    render(h(Countdown, { className: 'font-mono text-2xl', items }), c)
    const wrapper = c.querySelector('.countdown') as HTMLElement
    expect(wrapper.classList.contains('font-mono')).toBe(true)
    const spans = wrapper.querySelectorAll('span')
    expect(spans.length).toBe(6)
    expect(spans[0].getAttribute('style') || '').toMatch(/--value:\s*10/)
    expect(spans[2].getAttribute('style') || '').toMatch(/--digits:\s*2/)
    expect(spans[1].textContent).toBe('h')
    expect(spans[3].textContent).toBe('m')
    expect(spans[5].textContent).toBe('s')
  })
})
