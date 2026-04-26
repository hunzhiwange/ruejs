import { afterEach, describe, expect, it } from 'vitest'
import { h } from '@rue-js/rue'
import { render } from '@rue-js/rue'
import { Hover3D } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Hover3D', () => {
  it('renders with base class and overlays', () => {
    const c = document.createElement('div')
    render(h(Hover3D, null, h('figure', null, h('img', { src: 'x', alt: 'y' }))), c)
    const el = c.querySelector('.hover-3d') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('hover-3d')).toBe(true)
    const overlayDivs = el.querySelectorAll(':scope > div')
    expect(overlayDivs.length).toBe(8)
  })

  it('supports anchor rendering with href', () => {
    const c = document.createElement('div')
    render(h(Hover3D, { as: 'a', href: '#', className: 'cursor-pointer' }, 'content'), c)
    const el = c.querySelector('a.hover-3d') as HTMLAnchorElement
    expect(el).toBeTruthy()
    expect(el.getAttribute('href')).toBe('#')
    expect(el.classList.contains('cursor-pointer')).toBe(true)
  })

  it('can disable overlays', () => {
    const c = document.createElement('div')
    render(h(Hover3D, { overlays: false }, 'content'), c)
    const el = c.querySelector('.hover-3d') as HTMLElement
    const overlayDivs = el.querySelectorAll(':scope > div')
    expect(overlayDivs.length).toBe(0)
  })
})
