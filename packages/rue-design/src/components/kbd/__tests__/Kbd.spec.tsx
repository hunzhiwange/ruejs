import { afterEach, describe, expect, it } from 'vitest'
import { h, render } from '@rue-js/rue'
import { Kbd } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Kbd', () => {
  it('renders with base class and children', () => {
    const c = document.createElement('div')
    render(h(Kbd, null, 'K'), c)
    const el = c.querySelector('kbd.kbd') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('kbd')).toBe(true)
    expect(el.textContent).toBe('K')
  })

  it('applies size classes', () => {
    const c = document.createElement('div')
    ;(['xs', 'sm', 'md', 'lg', 'xl'] as const).forEach(s => {
      render(h(Kbd, { size: s }, 'x'), c)
      const el = c.querySelector('kbd.kbd') as HTMLElement
      expect(el.classList.contains(`kbd-${s}`)).toBe(true)
    })
  })

  it('appends custom className', () => {
    const c = document.createElement('div')
    render(h(Kbd, { className: 'kbd-sm text-accent' }, 'A'), c)
    const el = c.querySelector('kbd.kbd') as HTMLElement
    expect(el.classList.contains('kbd-sm')).toBe(true)
    expect(el.classList.contains('text-accent')).toBe(true)
  })
})
