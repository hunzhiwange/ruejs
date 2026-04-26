import { afterEach, describe, expect, it } from 'vitest'
import { h } from '@rue-js/rue'
import { render } from '@rue-js/rue'
import { Avatar } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Avatar', () => {
  it('renders with base class and children', () => {
    const c = document.createElement('div')
    render(h(Avatar, null, h('div', { className: 'w-12 rounded' }, h('img', { src: 'x' }))), c)
    const el = c.querySelector('.avatar') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('avatar')).toBe(true)
  })

  it('applies status classes', () => {
    const c = document.createElement('div')
    render(h(Avatar, { status: 'online' }, h('div', { className: 'w-12' })), c)
    let el = c.querySelector('.avatar') as HTMLElement
    expect(el.classList.contains('avatar-online')).toBe(true)

    render(h(Avatar, { status: 'offline' }, h('div', { className: 'w-12' })), c)
    el = c.querySelector('.avatar') as HTMLElement
    expect(el.classList.contains('avatar-offline')).toBe(true)

    render(h(Avatar, { status: 'placeholder' }, h('div', { className: 'w-12' })), c)
    el = c.querySelector('.avatar') as HTMLElement
    expect(el.classList.contains('avatar-placeholder')).toBe(true)
  })

  it('appends custom className', () => {
    const c = document.createElement('div')
    render(h(Avatar, { className: 'mx-2' }, 'x'), c)
    const el = c.querySelector('.avatar') as HTMLElement
    expect(el.classList.contains('mx-2')).toBe(true)
  })

  it('renders group container', () => {
    const c = document.createElement('div')
    render(
      h(
        Avatar.Group,
        { className: '-space-x-6' },
        h(Avatar, null, h('div', { className: 'w-12' })),
        h(Avatar, null, h('div', { className: 'w-12' })),
      ),
      c,
    )
    const el = c.querySelector('.avatar-group') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('-space-x-6')).toBe(true)
    expect(c.querySelectorAll('.avatar').length).toBe(2)
  })

  it('renders group via items array', () => {
    const c = document.createElement('div')
    const items = [
      { children: h('div', { className: 'w-12' }, h('img', { src: 'a' })) },
      { children: h('div', { className: 'w-12' }, h('img', { src: 'b' })) },
      { status: 'placeholder', children: h('div', { className: 'w-12' }, h('span', null, '+3')) },
    ]
    render(h(Avatar.Group, { className: '-space-x-6', items }, null), c)
    const el = c.querySelector('.avatar-group') as HTMLElement
    expect(el).toBeTruthy()
    const avatars = c.querySelectorAll('.avatar')
    expect(avatars.length).toBe(3)
    expect((avatars[2] as HTMLElement).classList.contains('avatar-placeholder')).toBe(true)
  })
})
