import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, render } from 'rue-js'
import { Modal } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Modal', () => {
  it('renders when open is true', () => {
    const c = document.createElement('div')
    render(h(Modal, { open: true }, 'content'), c)
    const root = c.querySelector('.modal.modal-open') as HTMLElement
    expect(root).toBeTruthy()
    const box = c.querySelector('.modal-box') as HTMLElement
    expect(box).toBeTruthy()
    expect(box.textContent).toContain('content')
  })

  it('does not render when open is false', () => {
    const c = document.createElement('div')
    render(h(Modal, { open: false }, 'content'), c)
    const root = c.querySelector('.modal.modal-open')
    expect(root).toBeNull()
  })

  it('renders title and actions', () => {
    const c = document.createElement('div')
    render(
      h(
        Modal,
        {
          open: true,
          title: 'Hello',
          actions: h('button', { className: 'btn', id: 'act' }, 'Action'),
        },
        h('div', { id: 'child' }, 'Body'),
      ),
      c,
    )
    const title = c.querySelector('.modal-box .font-semibold') as HTMLElement
    expect(title).toBeTruthy()
    expect(title.textContent).toContain('Hello')
    const actionBtn = c.querySelector('#act') as HTMLElement
    expect(actionBtn).toBeTruthy()
    const body = c.querySelector('#child') as HTMLElement
    expect(body).toBeTruthy()
    expect(body.textContent).toBe('Body')
  })

  it('renders close button and triggers onClose', () => {
    const c = document.createElement('div')
    const spy = vi.fn()
    render(h(Modal, { open: true, onClose: spy }, 'x'), c)
    const close = c.querySelector('.modal-action .btn') as HTMLButtonElement
    expect(close).toBeTruthy()
    close.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('appends custom className to modal-box', () => {
    const c = document.createElement('div')
    render(h(Modal, { open: true, className: 'w-full' }, 'x'), c)
    const box = c.querySelector('.modal-box') as HTMLElement
    expect(box.classList.contains('w-full')).toBe(true)
  })
})
