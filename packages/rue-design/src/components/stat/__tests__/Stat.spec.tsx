import { afterEach, describe, expect, it } from 'vitest'
import { h, render } from 'rue-js'
import { Avatar, Button, Stat } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Stat', () => {
  it('renders stats container with base class', () => {
    const c = document.createElement('div')
    render(h(Stat, null, 'hello'), c)
    const el = c.querySelector('.stats') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('stats')).toBe(true)
    expect(el.textContent).toContain('hello')
  })

  it('applies direction classes', () => {
    const c = document.createElement('div')
    render(h(Stat, { direction: 'horizontal' }, 'x'), c)
    let el = c.querySelector('.stats') as HTMLElement
    expect(el.classList.contains('stats-horizontal')).toBe(true)
    render(h(Stat, { direction: 'vertical' }, 'x'), c)
    el = c.querySelector('.stats') as HTMLElement
    expect(el.classList.contains('stats-vertical')).toBe(true)
  })

  it('appends custom className on container', () => {
    const c = document.createElement('div')
    render(h(Stat, { className: 'shadow' }, 'x'), c)
    const el = c.querySelector('.stats') as HTMLElement
    expect(el.classList.contains('shadow')).toBe(true)
  })

  it('renders Item and subparts correctly', () => {
    const c = document.createElement('div')
    render(
      h(
        Stat,
        { className: 'shadow' },
        h(
          Stat.Item,
          null,
          h(Stat.Figure, { className: 'text-secondary' }, h('svg', { className: 'w-8 h-8' })),
          h(Stat.Title, null, 'Downloads'),
          h(Stat.Value, null, '31K'),
          h(Stat.Desc, null, 'Jan 1st - Feb 1st'),
        ),
      ),
      c,
    )
    const item = c.querySelector('.stat') as HTMLElement
    expect(item).toBeTruthy()
    expect(c.querySelector('.stat-figure')).toBeTruthy()
    expect(c.querySelector('.stat-title')).toBeTruthy()
    expect(c.querySelector('.stat-value')).toBeTruthy()
    expect(c.querySelector('.stat-desc')).toBeTruthy()
  })

  it('applies center class on Item', () => {
    const c = document.createElement('div')
    render(h(Stat, null, h(Stat.Item, { center: true }, 'x')), c)
    const el = c.querySelector('.stat') as HTMLElement
    expect(el.classList.contains('place-items-center')).toBe(true)
  })

  it('renders actions and supports nested dynamic components', () => {
    const c = document.createElement('div')
    render(
      h(
        Stat,
        null,
        h(
          Stat.Item,
          null,
          h(Stat.Title, null, 'Account balance'),
          h(Stat.Value, null, '$89,400'),
          h(Stat.Actions, null, h(Button, { variant: 'success', size: 'xs' }, 'Add funds')),
        ),
        h(
          Stat.Item,
          null,
          h(Stat.Title, null, 'User'),
          h(
            Stat.Figure,
            null,
            h(Avatar, { status: 'online' }, h('div', { className: 'w-16 rounded-full' })),
          ),
        ),
      ),
      c,
    )
    const actions = c.querySelector('.stat-actions') as HTMLElement
    expect(actions).toBeTruthy()
    expect(actions.querySelector('.btn')).toBeTruthy()
    expect(c.querySelector('.avatar')).toBeTruthy()
  })

  it('renders from items array with all parts', () => {
    const c = document.createElement('div')
    const items = [
      {
        title: 'Downloads',
        value: '31K',
        desc: 'Jan 1st - Feb 1st',
        figure: h('svg', { className: 'w-8 h-8' }),
        figureClassName: 'text-secondary',
      },
      {
        center: true,
        title: 'Users',
        value: '4,200',
        desc: '↗︎ 400 (22%)',
        className: 'custom-item',
      },
      {
        title: 'Account balance',
        value: '$89,400',
        actions: h(Button, { size: 'xs', variant: 'success' }, 'Add funds'),
      },
    ]
    render(h(Stat, { items, className: 'shadow' }), c)
    const container = c.querySelector('.stats') as HTMLElement
    expect(container).toBeTruthy()
    expect(container.classList.contains('shadow')).toBe(true)
    const statItems = c.querySelectorAll('.stat')
    expect(statItems.length).toBe(3)
    expect(statItems[1].classList.contains('place-items-center')).toBe(true)
    expect(statItems[1].classList.contains('custom-item')).toBe(true)
    expect(c.querySelectorAll('.stat-figure').length).toBe(1)
    expect(c.querySelectorAll('.stat-title').length).toBe(3)
    expect(c.querySelectorAll('.stat-value').length).toBe(3)
    expect(c.querySelectorAll('.stat-desc').length).toBe(2)
    expect(c.querySelectorAll('.stat-actions').length).toBe(1)
  })
})
