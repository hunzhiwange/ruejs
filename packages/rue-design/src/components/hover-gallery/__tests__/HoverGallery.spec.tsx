import { afterEach, describe, expect, it } from 'vitest'
import { h } from '@rue-js/rue'
import { render } from '@rue-js/rue'
import { HoverGallery } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('HoverGallery', () => {
  it('renders figure with base class and images', () => {
    const c = document.createElement('div')
    render(
      h(HoverGallery, null, [
        h('img', { src: 'a.webp', alt: 'x' }),
        h('img', { src: 'b.webp', alt: 'y' }),
      ]),
      c,
    )
    const fig = c.querySelector('figure.hover-gallery') as HTMLElement
    expect(fig).toBeTruthy()
    expect(fig.classList.contains('hover-gallery')).toBe(true)
    const imgs = fig.querySelectorAll('img')
    expect(imgs.length).toBe(2)
  })

  it('supports div tag via as prop', () => {
    const c = document.createElement('div')
    render(h(HoverGallery, { as: 'div' }, h('img', { src: 'a.webp' })), c)
    const el = c.querySelector('div.hover-gallery') as HTMLElement
    expect(el).toBeTruthy()
  })

  it('appends custom className', () => {
    const c = document.createElement('div')
    render(h(HoverGallery, { className: 'max-w-60' }, h('img', { src: 'a.webp' })), c)
    const fig = c.querySelector('.hover-gallery') as HTMLElement
    expect(fig.classList.contains('max-w-60')).toBe(true)
  })

  it('renders images from items array of strings', () => {
    const c = document.createElement('div')
    render(h(HoverGallery, { items: ['a.webp', 'b.webp', 'c.webp'] }), c)
    const fig = c.querySelector('figure.hover-gallery') as HTMLElement
    expect(fig).toBeTruthy()
    const imgs = fig.querySelectorAll('img')
    expect(imgs.length).toBe(3)
  })

  it('renders items from objects and nodes', () => {
    const c = document.createElement('div')
    const node = h('img', { src: 'n.webp', alt: 'n' })
    render(
      h(HoverGallery, {
        items: [{ src: 'a.webp', alt: 'a' }, { src: 'b.webp', className: 'rounded' }, { node }],
      }),
      c,
    )
    const fig = c.querySelector('figure.hover-gallery') as HTMLElement
    const imgs = fig.querySelectorAll('img')
    expect(imgs.length).toBe(3)
    expect((imgs[1] as HTMLElement).classList.contains('rounded')).toBe(true)
  })
})
