import { afterEach, describe, expect, it } from 'vitest'
import { h, render } from 'rue-js'
import { Timeline } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Timeline', () => {
  it('renders with base class and children', () => {
    const c = document.createElement('div')
    render(
      h(
        Timeline,
        null,
        h('li', null, h(Timeline.Middle, null, h('div', { id: 'm' }, 'M')), h('hr', null)),
      ),
      c,
    )
    const el = c.querySelector('ul.timeline') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('timeline')).toBe(true)
    expect(c.querySelector('#m')?.textContent).toBe('M')
  })

  it('applies direction, snapIcon, compact and custom className', () => {
    const c = document.createElement('div')
    render(
      h(Timeline, { direction: 'vertical', snapIcon: true, compact: true, className: 'w-64' }),
      c,
    )
    const el = c.querySelector('ul.timeline') as HTMLElement
    expect(el.classList.contains('timeline-vertical')).toBe(true)
    expect(el.classList.contains('timeline-snap-icon')).toBe(true)
    expect(el.classList.contains('timeline-compact')).toBe(true)
    expect(el.classList.contains('w-64')).toBe(true)
  })

  it('renders Start, Middle, End parts with optional box', () => {
    const c = document.createElement('div')
    render(
      h(
        Timeline,
        null,
        h(
          'li',
          null,
          h(Timeline.Start, { box: true }, h('div', { id: 's' }, 'S')),
          h(Timeline.Middle, null, h('div', { id: 'mi' }, 'MI')),
          h(Timeline.End, { box: true }, h('div', { id: 'e' }, 'E')),
          h('hr', null),
        ),
      ),
      c,
    )
    const s = c.querySelector('.timeline-start') as HTMLElement
    const m = c.querySelector('.timeline-middle') as HTMLElement
    const e = c.querySelector('.timeline-end') as HTMLElement
    expect(s).toBeTruthy()
    expect(s.classList.contains('timeline-box')).toBe(true)
    expect(m).toBeTruthy()
    expect(e).toBeTruthy()
    expect(e.classList.contains('timeline-box')).toBe(true)
    expect(c.querySelector('#s')?.textContent).toBe('S')
    expect(c.querySelector('#mi')?.textContent).toBe('MI')
    expect(c.querySelector('#e')?.textContent).toBe('E')
  })

  it('renders items array with lines and parts', () => {
    const c = document.createElement('div')
    const items = [
      {
        beforeLine: true,
        start: { box: true, content: h('div', { id: 'is' }, 'IS') },
        middle: {
          content: h(
            'svg',
            { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 20 20', fill: 'currentColor' },
            h('path', { d: 'M10 18a8 8 0 100-16 8 8 0 000 16z' }),
          ),
        },
        end: { box: true, content: h('div', { id: 'ie' }, 'IE') },
        afterLine: true,
      },
      {
        beforeLine: true,
        middle: { content: h('div', { id: 'im' }, 'IM') },
        afterLine: true,
      },
    ] as const
    render(h(Timeline, { items }), c)
    const el = c.querySelector('ul.timeline') as HTMLElement
    expect(el).toBeTruthy()
    const s = c.querySelector('.timeline-start') as HTMLElement
    const m = c.querySelectorAll('.timeline-middle')
    const e = c.querySelector('.timeline-end') as HTMLElement
    const hrs = c.querySelectorAll('hr')
    expect(s).toBeTruthy()
    expect(m.length).toBe(2)
    expect(e).toBeTruthy()
    expect(hrs.length).toBe(4)
    expect(c.querySelector('#is')?.textContent).toBe('IS')
    expect(c.querySelector('#im')?.textContent).toBe('IM')
    expect(c.querySelector('#ie')?.textContent).toBe('IE')
  })
})
