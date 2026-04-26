import { afterEach, describe, expect, it, vi } from 'vitest'
import { h } from '@rue-js/rue'
import { render } from '@rue-js/rue'
import { Menu } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Menu', () => {
  it('renders with base class and ul', () => {
    const c = document.createElement('div')
    render(h(Menu, null, h(Menu.Item, null, 'Item 1')), c)
    const el = c.querySelector('.menu') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.tagName.toLowerCase()).toBe('ul')
    expect(el.classList.contains('menu')).toBe(true)
    expect(el.textContent).toContain('Item 1')
  })

  it('applies size classes', () => {
    const c = document.createElement('div')
    ;(['xs', 'sm', 'md', 'lg', 'xl'] as const).forEach(s => {
      render(h(Menu, { size: s }, h(Menu.Item, null, 'x')), c)
      const el = c.querySelector('.menu') as HTMLElement
      expect(el.classList.contains(`menu-${s}`)).toBe(true)
    })
  })

  it('applies direction classes', () => {
    const c = document.createElement('div')
    render(h(Menu, { direction: 'vertical' }, h(Menu.Item, null, 'x')), c)
    let el = c.querySelector('.menu') as HTMLElement
    expect(el.classList.contains('menu-vertical')).toBe(true)
    document.body.innerHTML = ''
    render(h(Menu, { direction: 'horizontal' }, h(Menu.Item, null, 'x')), c)
    el = c.querySelector('.menu') as HTMLElement
    expect(el.classList.contains('menu-horizontal')).toBe(true)
  })

  it('appends custom className', () => {
    const c = document.createElement('div')
    render(h(Menu, { className: 'bg-base-200 rounded-box w-56' }, h(Menu.Item, null, 'x')), c)
    const el = c.querySelector('.menu') as HTMLElement
    expect(el.classList.contains('bg-base-200')).toBe(true)
    expect(el.classList.contains('rounded-box')).toBe(true)
    expect(el.classList.contains('w-56')).toBe(true)
  })

  it('renders Item with states and different tags', () => {
    const c = document.createElement('div')
    render(
      h(
        Menu,
        null,
        h(Menu.Item, { active: true }, 'A'),
        h(Menu.Item, { disabled: true, as: 'button' }, 'B'),
        h(Menu.Item, { focus: true, as: 'span' }, 'C'),
        h(Menu.Item, { as: 'a', href: '#x' }, 'D'),
      ),
      c,
    )
    const items = c.querySelectorAll('.menu li')
    expect(items.length).toBe(4)
    const a = items[0].querySelector('a') as HTMLElement
    expect(a.classList.contains('menu-active')).toBe(true)
    const b = items[1].querySelector('button') as HTMLElement
    expect(b.classList.contains('menu-disabled')).toBe(true)
    const s = items[2].querySelector('span') as HTMLElement
    expect(s.classList.contains('menu-focus')).toBe(true)
    const d = items[3].querySelector('a') as HTMLAnchorElement
    expect(d.getAttribute('href')).toBe('#x')
  })

  it('supports router to on Item', () => {
    const c = document.createElement('div')
    render(h(Menu, null, h(Menu.Item, { to: '/about' }, 'Go')), c)
    const el = c.querySelector('.menu') as HTMLElement
    expect(el.textContent).toContain('Go')
  })

  it('supports href and target on Item', () => {
    const c = document.createElement('div')
    render(h(Menu, null, h(Menu.Item, { href: '/x', target: '_blank' }, 'X')), c)
    const a = c.querySelector('.menu li a') as HTMLAnchorElement
    expect(a.getAttribute('href')).toBe('/x')
    expect(a.getAttribute('target')).toBe('_blank')
  })

  it('fires onClick on Item', () => {
    const c = document.createElement('div')
    const fn = vi.fn()
    render(h(Menu, null, h(Menu.Item, { onClick: fn }, 'Click')), c)
    const a = c.querySelector('.menu li a') as HTMLAnchorElement
    a.click()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('renders Title as li and h2', () => {
    const c = document.createElement('div')
    render(h(Menu, null, h(Menu.Title, null, 'Title'), h(Menu.Title, { as: 'h2' }, 'Title2')), c)
    const liTitle = c.querySelector('.menu li.menu-title') as HTMLElement
    expect(liTitle).toBeTruthy()
    const h2Title = c.querySelector('h2.menu-title') as HTMLElement
    expect(h2Title).toBeTruthy()
  })

  it('renders Dropdown and DropdownToggle with show', () => {
    const c = document.createElement('div')
    render(
      h(
        Menu,
        null,
        h(
          Menu.Item,
          null,
          h(Menu.DropdownToggle, null, 'Parent'),
          h(Menu.Dropdown, null, h(Menu.Item, null, 'Sub 1'), h(Menu.Item, null, 'Sub 2')),
        ),
        h(
          Menu.Item,
          null,
          h(Menu.DropdownToggle, { show: true }, 'Parent2'),
          h(
            Menu.Dropdown,
            { show: true },
            h(Menu.Item, null, 'Sub 1'),
            h(Menu.Item, null, 'Sub 2'),
          ),
        ),
      ),
      c,
    )
    const toggles = c.querySelectorAll('.menu .menu-dropdown-toggle')
    expect(toggles.length).toBe(2)
    expect(toggles[1].classList.contains('menu-dropdown-show')).toBe(true)
    const dds = c.querySelectorAll('.menu .menu-dropdown')
    expect(dds.length).toBe(2)
    expect(dds[1].classList.contains('menu-dropdown-show')).toBe(true)
  })

  it('renders Submenu nested ul', () => {
    const c = document.createElement('div')
    render(
      h(
        Menu,
        null,
        h(
          Menu.Item,
          null,
          h('a', null, 'Parent'),
          h(Menu.Submenu, null, h(Menu.Item, null, 'Submenu 1'), h(Menu.Item, null, 'Submenu 2')),
        ),
      ),
      c,
    )
    const nested = c.querySelectorAll('.menu li ul')
    expect(nested.length).toBe(1)
    const lis = nested[0].querySelectorAll('li')
    expect(lis.length).toBe(2)
  })

  it('renders from items array with title, dropdown and submenu', () => {
    const c = document.createElement('div')
    const items = [
      { kind: 'title', children: 'Main' },
      {
        kind: 'item',
        children: 'Parent',
        dropdownToggle: { children: 'Toggle' },
        dropdown: {
          show: true,
          items: [
            { kind: 'item', children: 'DD 1' },
            { kind: 'item', children: 'DD 2' },
          ],
        },
      },
      {
        kind: 'item',
        children: 'Has Submenu',
        submenu: {
          items: [
            { kind: 'item', children: 'Sub 1' },
            { kind: 'item', children: 'Sub 2' },
          ],
        },
      },
    ] as any
    render(h(Menu, { items }), c)
    const el = c.querySelector('.menu') as HTMLElement
    expect(el).toBeTruthy()
    const title = c.querySelector('.menu-title') as HTMLElement
    expect(title).toBeTruthy()
    const toggles = c.querySelectorAll('.menu-dropdown-toggle')
    expect(toggles.length).toBe(1)
    const dds = c.querySelectorAll('.menu-dropdown')
    expect(dds.length).toBe(1)
    expect(dds[0].classList.contains('menu-dropdown-show')).toBe(true)
    const nested = c.querySelectorAll('.menu li ul')
    expect(nested.length).toBeGreaterThan(0)
  })

  it('supports to/href/target in items array', () => {
    const c = document.createElement('div')
    const items = [
      { kind: 'item', to: '/about', children: 'About' },
      { kind: 'item', href: '/ext', target: '_blank', children: 'Ext' },
    ] as any
    render(h(Menu, { items }), c)
    const lis = c.querySelectorAll('.menu li')
    expect(lis.length).toBe(2)
    expect(lis[0].textContent).toContain('About')
    const a1 = lis[1].querySelector('a') as HTMLAnchorElement
    expect(a1.getAttribute('href')).toBe('/ext')
    expect(a1.getAttribute('target')).toBe('_blank')
  })
})
