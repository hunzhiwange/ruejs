import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, render } from '@rue-js/rue'
import { Carousel } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Carousel', () => {
  it('renders with base class', () => {
    const c = document.createElement('div')
    render(h(Carousel, null, 'hello'), c)
    const el = c.querySelector('.carousel') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('carousel')).toBe(true)
    expect(el.textContent).toContain('hello')
  })

  it('applies align and direction classes', () => {
    const c = document.createElement('div')
    render(h(Carousel, { align: 'center', direction: 'horizontal' }, 'x'), c)
    let el = c.querySelector('.carousel') as HTMLElement
    expect(el.classList.contains('carousel-center')).toBe(true)
    expect(el.classList.contains('carousel-horizontal')).toBe(true)
    render(h(Carousel, { align: 'end', direction: 'vertical' }, 'x'), c)
    el = c.querySelector('.carousel') as HTMLElement
    expect(el.classList.contains('carousel-end')).toBe(true)
    expect(el.classList.contains('carousel-vertical')).toBe(true)
  })

  it('appends custom className', () => {
    const c = document.createElement('div')
    render(h(Carousel, { className: 'rounded-box w-64' }, 'x'), c)
    const el = c.querySelector('.carousel') as HTMLElement
    expect(el.classList.contains('rounded-box')).toBe(true)
    expect(el.classList.contains('w-64')).toBe(true)
  })

  it('renders Item subcomponent', () => {
    const c = document.createElement('div')
    render(
      h(
        Carousel,
        null,
        h(Carousel.Item, null, h('img', { src: 'x', alt: 'y' })),
        h(Carousel.Item, null, h('img', { src: 'x2', alt: 'y2' })),
      ),
      c,
    )
    const items = c.querySelectorAll('.carousel-item')
    expect(items.length).toBe(2)
  })

  it('supports next/prev via updating activeIndex prop', () => {
    const c = document.createElement('div')
    const spy = vi.fn()
    const children = [
      h(Carousel.Item, null, h('div', { id: 's1' }, '1')),
      h(Carousel.Item, null, h('div', { id: 's2' }, '2')),
      h(Carousel.Item, null, h('div', { id: 's3' }, '3')),
      h(Carousel.Item, null, h('div', { id: 's4' }, '4')),
    ]
    render(h(Carousel, { activeIndex: 0, onIndexChange: spy }, children), c)
    render(h(Carousel, { activeIndex: 1, onIndexChange: spy }, children), c)
    render(h(Carousel, { activeIndex: 2, onIndexChange: spy }, children), c)
    render(h(Carousel, { activeIndex: 1, onIndexChange: spy }, children), c)
    const calls = spy.mock.calls.map(args => args[0])
    expect(calls).toEqual([1, 2, 1])
  })

  it('mimics doc next/prev circular navigation', () => {
    const c = document.createElement('div')
    const spy = vi.fn()
    const children = [
      h(Carousel.Item, null, h('div', { id: 'slide1' }, '1')),
      h(Carousel.Item, null, h('div', { id: 'slide2' }, '2')),
      h(Carousel.Item, null, h('div', { id: 'slide3' }, '3')),
      h(Carousel.Item, null, h('div', { id: 'slide4' }, '4')),
    ]
    render(h(Carousel, { activeIndex: 0, onIndexChange: spy }, children), c)
    render(h(Carousel, { activeIndex: 3, onIndexChange: spy }, children), c)
    render(h(Carousel, { activeIndex: 0, onIndexChange: spy }, children), c)
    render(h(Carousel, { activeIndex: 1, onIndexChange: spy }, children), c)
    const calls = spy.mock.calls.map(args => args[0])
    expect(calls).toEqual([3, 0, 1])
  })

  it('renders from items array', () => {
    const c = document.createElement('div')
    const items = [
      { content: h('div', { id: 's1' }, '1') },
      { content: h('div', { id: 's2' }, '2'), className: 'w-full' },
      { content: h('img', { src: 'x', alt: 'y' }) },
    ]
    render(h(Carousel, { items, align: 'center', direction: 'horizontal' }), c)
    const wrapper = c.querySelector('.carousel') as HTMLElement
    expect(wrapper.classList.contains('carousel-center')).toBe(true)
    expect(wrapper.classList.contains('carousel-horizontal')).toBe(true)
    const els = c.querySelectorAll('.carousel-item')
    expect(els.length).toBe(3)
    expect((els[1] as HTMLElement).classList.contains('w-full')).toBe(true)
  })
})
