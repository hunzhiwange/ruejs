import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'

import { render } from '@rue-js/rue'
import Chat from '..'

const waitChatRender = () => new Promise(resolve => setTimeout(resolve, 0))

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Chat', () => {
  it('renders with placement classes', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Chat placement={'start'}>
          <Chat.Bubble>{'hello'}</Chat.Bubble>
        </Chat>,
        c,
      ),
    )
    await waitChatRender()
    let el = c.querySelector('.chat') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('chat')).toBe(true)
    expect(el.classList.contains('chat-start')).toBe(true)

    document.body.innerHTML = ''
    const c2 = document.createElement('div')
    mountTestApp(c2, () =>
      render(
        <Chat placement={'end'}>
          <Chat.Bubble>{'world'}</Chat.Bubble>
        </Chat>,
        c2,
      ),
    )
    await waitChatRender()
    el = c2.querySelector('.chat') as HTMLElement
    expect(el.classList.contains('chat-end')).toBe(true)
  })

  it('supports className on Chat', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Chat placement={'start'} className={'w-full'}>
          <Chat.Bubble>{'x'}</Chat.Bubble>
        </Chat>,
        c,
      ),
    )
    await waitChatRender()
    const el = c.querySelector('.chat') as HTMLElement
    expect(el.classList.contains('w-full')).toBe(true)
  })

  it('renders Bubble with color variants and typing state', async () => {
    const c = document.createElement('div')
    for (const v of [
      'neutral',
      'primary',
      'secondary',
      'accent',
      'info',
      'success',
      'warning',
      'error',
    ] as const) {
      mountTestApp(c, () =>
        render(
          <Chat placement={'start'}>
            <Chat.Bubble color={v}>{'x'}</Chat.Bubble>
          </Chat>,
          c,
        ),
      )
      await waitChatRender()
      const b = c.querySelector('.chat-bubble') as HTMLElement
      expect(b.classList.contains('chat-bubble')).toBe(true)
      expect(b.classList.contains(`chat-bubble-${v}`)).toBe(true)
    }

    c.innerHTML = ''
    mountTestApp(c, () =>
      render(
        <Chat placement={'start'}>
          <Chat.Bubble typing={true} />
        </Chat>,
        c,
      ),
    )
    await waitChatRender()
    const loading = c.querySelector('.chat-bubble .loading.loading-dots') as HTMLElement
    expect(loading).toBeTruthy()
  })

  it('renders Header, Footer, Image subcomponents with semantic shortcuts', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Chat placement={'start'}>
          <Chat.Image src={'x'} alt={'y'} />
          <Chat.Header author={'User'} time={'12:45'} />
          <Chat.Bubble>{'message'}</Chat.Bubble>
          <Chat.Footer className={'opacity-50'}>{'Delivered'}</Chat.Footer>
        </Chat>,
        c,
      ),
    )
    await waitChatRender()
    const img = c.querySelector('.chat-image') as HTMLElement
    const hdr = c.querySelector('.chat-header') as HTMLElement
    const ftr = c.querySelector('.chat-footer') as HTMLElement
    const bub = c.querySelector('.chat-bubble') as HTMLElement
    expect(img).toBeTruthy()
    expect(img.classList.contains('avatar')).toBe(true)
    expect((img.querySelector('img') as HTMLImageElement).getAttribute('src')).toBe('x')
    expect(hdr).toBeTruthy()
    expect(hdr.textContent).toContain('User')
    expect(hdr.textContent).toContain('12:45')
    expect(ftr).toBeTruthy()
    expect(bub).toBeTruthy()
  })

  it('renders from items array with all parts and semantic aliases', async () => {
    const c = document.createElement('div')
    const items = [
      { key: 'intro', placement: 'start', message: 'hello' },
      { key: 'reply', placement: 'end', text: 'world', color: 'success' },
      {
        placement: 'start',
        avatar: { src: 'x', alt: 'y' },
        author: 'User',
        timestamp: '12:45',
        message: 'message',
        footer: 'Delivered',
      },
      {
        key: 'typing',
        placement: 'end',
        avatarSrc: 'z',
        author: 'Rue Bot',
        typing: true,
      },
    ] as const
    mountTestApp(c, () => render(<Chat items={items} className={'w-full'} />, c))
    await waitChatRender()
    const chats = c.querySelectorAll('.chat')
    expect(chats.length).toBe(4)
    expect(chats[0].classList.contains('chat-start')).toBe(true)
    expect(chats[1].classList.contains('chat-end')).toBe(true)
    expect(chats[0].classList.contains('w-full')).toBe(true)
    expect(chats[1].classList.contains('w-full')).toBe(true)
    expect(chats[2].classList.contains('w-full')).toBe(true)
    expect(chats[3].classList.contains('w-full')).toBe(true)

    const bubbles = c.querySelectorAll('.chat-bubble')
    expect(bubbles.length).toBe(4)
    expect(bubbles[1].classList.contains('chat-bubble-success')).toBe(true)

    const img = chats[2].querySelector('.chat-image') as HTMLElement
    const hdr = chats[2].querySelector('.chat-header') as HTMLElement
    const ftr = chats[2].querySelector('.chat-footer') as HTMLElement
    expect(img).toBeTruthy()
    expect(hdr).toBeTruthy()
    expect(ftr).toBeTruthy()
    expect(chats[3].querySelector('.loading.loading-dots')).toBeTruthy()
  })

  it('renders a single semantic message from root props', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Chat
          placement={'end'}
          avatar={{ src: 'bot.png', alt: 'bot' }}
          author={'Rue Bot'}
          timestamp={'09:30'}
          message={'Build finished'}
          color={'primary'}
          footer={'Delivered'}
        />,
        c,
      ),
    )
    await waitChatRender()

    const chat = c.querySelector('.chat.chat-end') as HTMLElement
    const avatar = c.querySelector('.chat-image.avatar img') as HTMLImageElement
    const header = c.querySelector('.chat-header') as HTMLElement
    const bubble = c.querySelector('.chat-bubble') as HTMLElement
    const footer = c.querySelector('.chat-footer') as HTMLElement
    expect(chat).toBeTruthy()
    expect(avatar.getAttribute('src')).toBe('bot.png')
    expect(header.textContent).toContain('Rue Bot')
    expect(header.textContent).toContain('09:30')
    expect(bubble.classList.contains('chat-bubble-primary')).toBe(true)
    expect(bubble.textContent).toContain('Build finished')
    expect(footer.textContent).toContain('Delivered')
  })
})
