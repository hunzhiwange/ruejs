import { afterEach, describe, expect, it } from 'vitest'
import { h, render } from '@rue-js/rue'
import { Dock } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Dock', () => {
  it('renders with base class', () => {
    const c = document.createElement('div')
    render(h(Dock, null, 'x'), c)
    const el = c.querySelector('.dock') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('dock')).toBe(true)
  })

  it('applies size classes', () => {
    const c = document.createElement('div')
    ;(['xs', 'sm', 'md', 'lg', 'xl'] as const).forEach(s => {
      render(h(Dock, { size: s }, 'x'), c)
      const el = c.querySelector('.dock') as HTMLElement
      expect(el.classList.contains('dock')).toBe(true)
      expect(el.classList.contains(`dock-${s}`)).toBe(true)
    })
  })

  it('appends custom className', () => {
    const c = document.createElement('div')
    render(h(Dock, { className: 'relative border' }, 'x'), c)
    const el = c.querySelector('.dock') as HTMLElement
    expect(el.classList.contains('relative')).toBe(true)
    expect(el.classList.contains('border')).toBe(true)
  })

  it('renders Item and Label subcomponents', () => {
    const c = document.createElement('div')
    render(
      h(
        Dock,
        null,
        h(
          Dock.Item,
          { active: true },
          h('svg', { className: 'size-[1.2em]' }),
          h(Dock.Label, null, 'Home'),
        ),
      ),
      c,
    )
    const el = c.querySelector('.dock') as HTMLElement
    const btn = el.querySelector('button') as HTMLElement
    const label = el.querySelector('.dock-label') as HTMLElement
    expect(btn).toBeTruthy()
    expect(btn.classList.contains('dock-active')).toBe(true)
    expect(label).toBeTruthy()
    expect(label.textContent).toContain('Home')
  })

  it('supports activeIndex and onChange callback', () => {
    const c = document.createElement('div')
    let changedIndex = -1
    const items = [
      { icon: h('svg', { className: 'size-[1.2em]' }), label: 'Home' },
      { icon: h('svg', { className: 'size-[1.2em]' }), label: 'Inbox' },
      { icon: h('svg', { className: 'size-[1.2em]' }), label: 'Settings' },
    ]
    render(h(Dock, { items, activeIndex: 1, onChange: (i: number) => (changedIndex = i) }), c)
    const el = c.querySelector('.dock') as HTMLElement
    const btns = el.querySelectorAll('button')
    expect(btns.length).toBe(3)
    expect(btns[1].classList.contains('dock-active')).toBe(true)
    ;(btns[2] as HTMLButtonElement).click()
    expect(changedIndex).toBe(2)
  })

  it('auto renders items when items prop is provided', () => {
    const c = document.createElement('div')
    const items = [
      { icon: h('span', null, 'I1'), label: 'L1' },
      { icon: h('span', null, 'I2'), label: 'L2' },
    ]
    render(h(Dock, { items, activeIndex: 0 }), c)
    const el = c.querySelector('.dock') as HTMLElement
    const labels = el.querySelectorAll('.dock-label')
    expect(labels.length).toBe(2)
    const btns = el.querySelectorAll('button')
    expect(btns[0].classList.contains('dock-active')).toBe(true)
  })
})
