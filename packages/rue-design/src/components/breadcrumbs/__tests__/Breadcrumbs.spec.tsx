import { afterEach, describe, expect, it } from 'vitest'
import { h, render } from 'rue-js'
import { Breadcrumbs } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Breadcrumbs', () => {
  it('renders with base class and ul', () => {
    const c = document.createElement('div')
    render(h(Breadcrumbs, null, h('li', null, 'Home')), c)
    const el = c.querySelector('.breadcrumbs') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('breadcrumbs')).toBe(true)
    const ul = el.querySelector('ul') as HTMLElement
    expect(ul).toBeTruthy()
    expect(ul.textContent).toContain('Home')
  })

  it('appends custom className', () => {
    const c = document.createElement('div')
    render(h(Breadcrumbs, { className: 'text-sm' }, h('li', null, 'x')), c)
    const el = c.querySelector('.breadcrumbs') as HTMLElement
    expect(el.classList.contains('text-sm')).toBe(true)
  })

  it('renders children li items', () => {
    const c = document.createElement('div')
    render(
      h(
        Breadcrumbs,
        null,
        h('li', null, h('a', null, 'Home')),
        h('li', null, h('a', null, 'Documents')),
        h('li', null, 'Add Document'),
      ),
      c,
    )
    const lis = c.querySelectorAll('.breadcrumbs ul li')
    expect(lis.length).toBe(3)
  })

  it('renders Item subcomponent', () => {
    const c = document.createElement('div')
    render(
      h(Breadcrumbs, { className: 'text-sm' }, h(Breadcrumbs.Item, null, h('span', null, 'Home'))),
      c,
    )
    const el = c.querySelector('.breadcrumbs') as HTMLElement
    const li = el.querySelector('li') as HTMLElement
    expect(li).toBeTruthy()
    expect(li.textContent).toContain('Home')
  })

  it('renders from items array with icons and href', () => {
    const c = document.createElement('div')
    const items = [
      {
        label: 'Home',
        href: '/home',
        linkClassName: 'hover:underline cursor-pointer inline-flex gap-2 items-center',
        icon: h(
          'svg',
          {
            xmlns: 'http://www.w3.org/2000/svg',
            fill: 'none',
            viewBox: '0 0 24 24',
            className: 'w-4 h-4 stroke-current',
          },
          h('path', {
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            'stroke-width': '2',
            d: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
          }),
        ),
      },
      {
        label: 'Documents',
        href: '/docs',
        linkClassName: 'hover:underline cursor-pointer inline-flex gap-2 items-center',
      },
      {
        label: 'Add Document',
        className: 'last',
        icon: h(
          'svg',
          {
            xmlns: 'http://www.w3.org/2000/svg',
            fill: 'none',
            viewBox: '0 0 24 24',
            className: 'w-4 h-4 stroke-current',
          },
          h('path', {
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            'stroke-width': '2',
            d: 'M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
          }),
        ),
      },
    ]
    render(h(Breadcrumbs, { className: 'text-sm', items }), c)
    const el = c.querySelector('.breadcrumbs') as HTMLElement
    expect(el.classList.contains('text-sm')).toBe(true)
    const lis = el.querySelectorAll('ul li')
    expect(lis.length).toBe(3)
    const firstLink = lis[0].querySelector('a') as HTMLAnchorElement
    expect(firstLink).toBeTruthy()
    expect(firstLink.getAttribute('href')).toBe('/home')
    expect(firstLink.classList.contains('hover:underline')).toBe(true)
    const lastSpan = lis[2].querySelector('span') as HTMLElement
    expect(lastSpan).toBeTruthy()
    const icon = lastSpan.querySelector('svg') as SVGElement
    expect(icon).toBeTruthy()
  })
})
