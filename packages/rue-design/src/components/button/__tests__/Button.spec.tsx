import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, render } from 'rue-js'
import { Button } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Button', () => {
  it('renders with base class and children', () => {
    const c = document.createElement('div')
    render(h(Button, null, 'click'), c)
    const el = c.querySelector('button') as HTMLButtonElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('btn')).toBe(true)
    expect(el.textContent).toContain('click')
  })

  it('applies variant classes', () => {
    const c = document.createElement('div')
    ;(
      [
        'primary',
        'secondary',
        'accent',
        'neutral',
        'ghost',
        'link',
        'info',
        'success',
        'warning',
        'error',
      ] as const
    ).forEach(v => {
      render(h(Button, { variant: v }, 'x'), c)
      const el = c.querySelector('button') as HTMLButtonElement
      expect(el.classList.contains('btn')).toBe(true)
      expect(el.classList.contains(`btn-${v}`)).toBe(true)
    })
  })

  it('applies size classes', () => {
    const c = document.createElement('div')
    ;(['xs', 'sm', 'md', 'lg', 'xl'] as const).forEach(s => {
      render(h(Button, { size: s }, 'x'), c)
      const el = c.querySelector('button') as HTMLButtonElement
      expect(el.classList.contains(`btn-${s}`)).toBe(true)
    })
  })

  it('applies outline, dash, soft, active, block, wide, square, circle, disabledClass', () => {
    const c = document.createElement('div')
    render(
      h(
        Button,
        {
          outline: true,
          dash: true,
          soft: true,
          active: true,
          block: true,
          wide: true,
          square: true,
          circle: true,
          disabledClass: true,
        },
        'x',
      ),
      c,
    )
    const el = c.querySelector('button') as HTMLButtonElement
    expect(el.classList.contains('btn-outline')).toBe(true)
    expect(el.classList.contains('btn-dash')).toBe(true)
    expect(el.classList.contains('btn-soft')).toBe(true)
    expect(el.classList.contains('btn-active')).toBe(true)
    expect(el.classList.contains('btn-block')).toBe(true)
    expect(el.classList.contains('btn-wide')).toBe(true)
    expect(el.classList.contains('btn-square')).toBe(true)
    expect(el.classList.contains('btn-circle')).toBe(true)
    expect(el.classList.contains('btn-disabled')).toBe(true)
  })

  it('applies custom className', () => {
    const c = document.createElement('div')
    render(h(Button, { className: 'w-full' }, 'x'), c)
    const el = c.querySelector('button') as HTMLButtonElement
    expect(el.classList.contains('w-full')).toBe(true)
  })

  it('sets disabled and type attributes', () => {
    const c = document.createElement('div')
    render(h(Button, { disabled: true, type: 'submit' }, 'x'), c)
    const el = c.querySelector('button') as HTMLButtonElement
    expect(el.disabled).toBe(true)
    expect(el.getAttribute('type')).toBe('submit')
  })

  it('triggers onClick handler', () => {
    const c = document.createElement('div')
    const spy = vi.fn()
    render(h(Button, { onClick: spy }, 'x'), c)
    const el = c.querySelector('button') as HTMLButtonElement
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('disables click when loading is true', () => {
    const c = document.createElement('div')
    const spy = vi.fn()
    render(h(Button, { loading: true, onClick: spy }, 'loading'), c)
    const el = c.querySelector('button') as HTMLButtonElement
    expect(el.disabled).toBe(true)
    el.click()
    expect(spy).toHaveBeenCalledTimes(0)
  })
})
