import { afterEach, describe, expect, it } from 'vitest'
import { h } from '@rue-js/rue'
import { render } from '@rue-js/rue'
import { Chat } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Chat', () => {
  it('renders with placement classes', () => {
    const c = document.createElement('div')
    render(h(Chat, { placement: 'start' }, h(Chat.Bubble, null, 'hello')), c)
    let el = c.querySelector('.chat') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('chat')).toBe(true)
    expect(el.classList.contains('chat-start')).toBe(true)

    document.body.innerHTML = ''
    const c2 = document.createElement('div')
    render(h(Chat, { placement: 'end' }, h(Chat.Bubble, null, 'world')), c2)
    el = c2.querySelector('.chat') as HTMLElement
    expect(el.classList.contains('chat-end')).toBe(true)
  })

  it('supports className on Chat', () => {
    const c = document.createElement('div')
    render(h(Chat, { placement: 'start', className: 'w-full' }, h(Chat.Bubble, null, 'x')), c)
    const el = c.querySelector('.chat') as HTMLElement
    expect(el.classList.contains('w-full')).toBe(true)
  })

  it('renders Bubble with color variants', () => {
    const c = document.createElement('div')
    ;(
      ['neutral', 'primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error'] as const
    ).forEach(v => {
      render(h(Chat, { placement: 'start' }, h(Chat.Bubble, { color: v }, 'x')), c)
      const b = c.querySelector('.chat-bubble') as HTMLElement
      expect(b.classList.contains('chat-bubble')).toBe(true)
      expect(b.classList.contains(`chat-bubble-${v}`)).toBe(true)
    })
  })

  it('renders Header, Footer, Image subcomponents', () => {
    const c = document.createElement('div')
    render(
      h(
        Chat,
        { placement: 'start' },
        h(
          Chat.Image,
          { className: 'avatar' },
          h('div', { className: 'w-10 rounded-full' }, h('img', { src: 'x', alt: 'y' })),
        ),
        h(Chat.Header, null, 'User', h('time', { className: 'text-xs opacity-50' }, '12:45')),
        h(Chat.Bubble, null, 'message'),
        h(Chat.Footer, { className: 'opacity-50' }, 'Delivered'),
      ),
      c,
    )
    const img = c.querySelector('.chat-image') as HTMLElement
    const hdr = c.querySelector('.chat-header') as HTMLElement
    const ftr = c.querySelector('.chat-footer') as HTMLElement
    const bub = c.querySelector('.chat-bubble') as HTMLElement
    expect(img).toBeTruthy()
    expect(hdr).toBeTruthy()
    expect(ftr).toBeTruthy()
    expect(bub).toBeTruthy()
  })

  it('renders from items array with all parts', () => {
    const c = document.createElement('div')
    const items = [
      { placement: 'start', text: 'hello' },
      { placement: 'end', text: 'world', color: 'success' },
      {
        placement: 'start',
        imageSrc: 'x',
        imageAlt: 'y',
        headerName: 'User',
        headerTime: '12:45',
        text: 'message',
        footer: 'Delivered',
      },
    ]
    render(h(Chat, { items, className: 'w-full' }), c)
    const chats = c.querySelectorAll('.chat')
    expect(chats.length).toBe(3)
    expect(chats[0].classList.contains('chat-start')).toBe(true)
    expect(chats[1].classList.contains('chat-end')).toBe(true)
    expect(chats[0].classList.contains('w-full')).toBe(true)
    expect(chats[1].classList.contains('w-full')).toBe(true)
    expect(chats[2].classList.contains('w-full')).toBe(true)

    const bubbles = c.querySelectorAll('.chat-bubble')
    expect(bubbles.length).toBe(3)
    expect(bubbles[1].classList.contains('chat-bubble-success')).toBe(true)

    const img = chats[2].querySelector('.chat-image') as HTMLElement
    const hdr = chats[2].querySelector('.chat-header') as HTMLElement
    const ftr = chats[2].querySelector('.chat-footer') as HTMLElement
    expect(img).toBeTruthy()
    expect(hdr).toBeTruthy()
    expect(ftr).toBeTruthy()
  })
})
