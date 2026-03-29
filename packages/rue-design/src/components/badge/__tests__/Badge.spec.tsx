import { afterEach, describe, expect, it } from 'vitest'
import { h, render } from 'rue-js'
import { Badge } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Badge', () => {
  it('renders with base class and children', () => {
    const c = document.createElement('div')
    render(h(Badge, null, 'Badge'), c)
    const el = c.querySelector('.badge') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('badge')).toBe(true)
    expect(el.textContent).toContain('Badge')
  })

  it('applies variant classes', () => {
    const c = document.createElement('div')
    ;(
      ['neutral', 'primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error'] as const
    ).forEach(v => {
      render(h(Badge, { variant: v }, 'x'), c)
      const el = c.querySelector('.badge') as HTMLElement
      expect(el.classList.contains('badge')).toBe(true)
      expect(el.classList.contains(`badge-${v}`)).toBe(true)
    })
  })

  it('applies size classes', () => {
    const c = document.createElement('div')
    ;(['xs', 'sm', 'md', 'lg', 'xl'] as const).forEach(s => {
      render(h(Badge, { size: s }, 'x'), c)
      const el = c.querySelector('.badge') as HTMLElement
      expect(el.classList.contains(`badge-${s}`)).toBe(true)
    })
  })

  it('applies outline, dash, soft, ghost classes', () => {
    const c = document.createElement('div')
    render(h(Badge, { outline: true, dash: true, soft: true, ghost: true }, 'x'), c)
    const el = c.querySelector('.badge') as HTMLElement
    expect(el.classList.contains('badge-outline')).toBe(true)
    expect(el.classList.contains('badge-dash')).toBe(true)
    expect(el.classList.contains('badge-soft')).toBe(true)
    expect(el.classList.contains('badge-ghost')).toBe(true)
  })

  it('appends custom className', () => {
    const c = document.createElement('div')
    render(h(Badge, { className: 'w-full' }, 'x'), c)
    const el = c.querySelector('.badge') as HTMLElement
    expect(el.classList.contains('w-full')).toBe(true)
  })
})
