import { afterEach, describe, expect, it } from 'vitest'
import { h, render } from '@rue-js/rue'
import { TextRotate } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('TextRotate', () => {
  it('renders with base class and children', () => {
    const c = document.createElement('div')
    render(h(TextRotate, null, h('span', null, h('span', null, 'ONE'), h('span', null, 'TWO'))), c)
    const el = c.querySelector('span.text-rotate') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('text-rotate')).toBe(true)
    expect(c.querySelector('span span span')?.textContent).toBe('ONE')
  })

  it('appends custom className', () => {
    const c = document.createElement('div')
    render(h(TextRotate, { className: 'text-7xl' }, h('span', null, h('span', null, 'A'))), c)
    const el = c.querySelector('span.text-rotate') as HTMLElement
    expect(el.classList.contains('text-7xl')).toBe(true)
  })

  it('renders items array with inner and item classes', () => {
    const c = document.createElement('div')
    render(
      h(TextRotate, {
        innerClassName: 'justify-items-center',
        items: [
          { text: 'ONE' },
          { text: h('span', { className: 'font-bold italic px-2' }, 'TWO') },
          { text: 'THREE', className: 'text-red-500' },
        ],
      }),
      c,
    )
    const el = c.querySelector('span.text-rotate') as HTMLElement
    expect(el).toBeTruthy()
    const inner = el.querySelector('span.justify-items-center') as HTMLElement
    expect(inner).toBeTruthy()
    const s1 = inner.querySelector('span:nth-child(1)') as HTMLElement
    const s2 = inner.querySelector('span:nth-child(2)') as HTMLElement
    const s3 = inner.querySelector('span:nth-child(3)') as HTMLElement
    expect(s1.textContent).toBe('ONE')
    expect(s2.querySelector('span')?.textContent).toBe('TWO')
    expect(s3.classList.contains('text-red-500')).toBe(true)
  })
})
