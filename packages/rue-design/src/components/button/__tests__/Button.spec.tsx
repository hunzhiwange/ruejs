import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { render, Template } from '@rue-js/rue'
import Button from '..'

const waitButtonRender = () => new Promise(resolve => setTimeout(resolve, 0))
const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Button', () => {
  it('renders with base class and children', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () => render(<Button>{'click'}</Button>, c))
    await waitButtonRender()
    const el = c.querySelector('button') as HTMLButtonElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('btn')).toBe(true)
    expect(el.textContent).toContain('click')
  })

  it('applies color classes', async () => {
    const c = document.createElement('div')
    for (const color of [
      'primary',
      'secondary',
      'accent',
      'neutral',
      'info',
      'success',
      'warning',
      'error',
    ] as const) {
      mountTestApp(c, () => render(<Button color={color}>{'x'}</Button>, c))
      await waitButtonRender()
      const el = c.querySelector('button') as HTMLButtonElement
      expect(el.classList.contains('btn')).toBe(true)
      expect(el.classList.contains(`btn-${color}`)).toBe(true)
    }
  })

  it('applies size classes', async () => {
    const c = document.createElement('div')
    for (const s of ['xs', 'sm', 'md', 'lg', 'xl'] as const) {
      mountTestApp(c, () => render(<Button size={s}>{'x'}</Button>, c))
      await waitButtonRender()
      const el = c.querySelector('button') as HTMLButtonElement
      expect(el.classList.contains(`btn-${s}`)).toBe(true)
    }
  })

  it('applies type, layout and shape classes', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Button
          color={'secondary'}
          type={'filled'}
          active={true}
          block={true}
          wide={true}
          shape={'circle'}
        >
          {'x'}
        </Button>,
        c,
      ),
    )
    await waitButtonRender()
    const el = c.querySelector('button') as HTMLButtonElement
    expect(el.classList.contains('btn-secondary')).toBe(true)
    expect(el.classList.contains('btn-soft')).toBe(true)
    expect(el.classList.contains('btn-active')).toBe(true)
    expect(el.classList.contains('btn-block')).toBe(true)
    expect(el.classList.contains('btn-wide')).toBe(true)
    expect(el.classList.contains('btn-circle')).toBe(true)
  })

  it('applies custom className', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () => render(<Button className={'w-full'}>{'x'}</Button>, c))
    await waitButtonRender()
    const el = c.querySelector('button') as HTMLButtonElement
    expect(el.classList.contains('w-full')).toBe(true)
  })

  it('sets disabled and native type attributes', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Button disabled={true} htmlType={'submit'}>
          {'x'}
        </Button>,
        c,
      ),
    )
    await waitButtonRender()
    const el = c.querySelector('button') as HTMLButtonElement
    expect(el.disabled).toBe(true)
    expect(el.getAttribute('type')).toBe('submit')
  })

  it('triggers onClick handler', async () => {
    const c = document.createElement('div')
    const spy = vi.fn()
    mountTestApp(c, () => render(<Button onClick={spy}>{'x'}</Button>, c))
    await waitButtonRender()
    const el = c.querySelector('button') as HTMLButtonElement
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('disables click when loading is true', async () => {
    const c = document.createElement('div')
    const spy = vi.fn()
    mountTestApp(c, () =>
      render(
        <Button loading={true} onClick={spy}>
          {'loading'}
        </Button>,
        c,
      ),
    )
    await waitButtonRender()
    const el = c.querySelector('button') as HTMLButtonElement
    expect(el.disabled).toBe(true)
    el.click()
    expect(spy).toHaveBeenCalledTimes(0)
  })

  it('applies visual type, color and htmlType mapping', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Button type={'outlined'} color={'secondary'} htmlType={'reset'}>
          {'save'}
        </Button>,
        c,
      ),
    )
    await waitButtonRender()
    const el = c.querySelector('button') as HTMLButtonElement
    expect(el.classList.contains('btn-secondary')).toBe(true)
    expect(el.classList.contains('btn-outline')).toBe(true)
    expect(el.getAttribute('type')).toBe('reset')
  })

  it('renders anchor buttons from href and blocks click when disabled', async () => {
    const c = document.createElement('div')
    const spy = vi.fn()
    resetActiveRuntime()
    mountTestApp(c, () =>
      render(
        <Button href={'/docs'} color={'primary'} disabled={true} onClick={spy}>
          {'Docs'}
        </Button>,
        c,
      ),
    )
    await waitButtonRender()
    const el = c.querySelector('a') as HTMLAnchorElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('btn')).toBe(true)
    expect(el.classList.contains('btn-primary')).toBe(true)
    expect(el.classList.contains('btn-disabled')).toBe(true)
    expect(el.getAttribute('href')).not.toBe('/docs')
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(spy).toHaveBeenCalledTimes(0)
  })

  it('supports icon placement and loading object icon', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Button iconPlacement={'end'}>
          <Template slot="icon">
            <span id={'tail-icon'}>{'I'}</span>
          </Template>
          {'Next'}
        </Button>,
        c,
      ),
    )
    await waitButtonRender()
    let el = c.querySelector('button') as HTMLButtonElement
    expect(el.textContent?.replace(/\s+/g, '')).toBe('NextI')
    expect(el.querySelector('#tail-icon')).toBeTruthy()
    expect(el.classList.contains('gap-2')).toBe(true)

    mountTestApp(c, () =>
      render(
        <Button shape={'circle'} aria-label={'收藏'}>
          <Template slot="icon">
            <span id={'icon-only'}>{'H'}</span>
          </Template>
        </Button>,
        c,
      ),
    )
    await waitButtonRender()
    el = c.querySelector('button') as HTMLButtonElement
    expect(el.classList.contains('gap-2')).toBe(false)
    expect(el.children).toHaveLength(1)
    expect(el.querySelector('#icon-only')).toBeTruthy()

    mountTestApp(c, () =>
      render(
        <Button loading>
          <Template slot="loadingIcon">
            <span id={'loading-icon'}>{'L'}</span>
          </Template>
          {'Load'}
        </Button>,
        c,
      ),
    )
    await waitButtonRender()
    el = c.querySelector('button') as HTMLButtonElement
    expect(el.disabled).toBe(true)
    expect(el.querySelector('#loading-icon')).toBeTruthy()
  })

  it('renders the icon prop and lets the icon slot override it', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(<Button icon={<span id={'prop-icon'}>{'P'}</span>} aria-label={'Prop icon'} />, c),
    )
    await waitButtonRender()
    let el = c.querySelector('button') as HTMLButtonElement
    expect(el.querySelector('#prop-icon')).toBeTruthy()
    expect(el.children).toHaveLength(1)

    mountTestApp(c, () =>
      render(
        <Button icon={<span id={'ignored-prop-icon'}>{'P'}</span>} aria-label={'Slot icon'}>
          <Template slot="icon">
            <span id={'slot-icon'}>{'S'}</span>
          </Template>
        </Button>,
        c,
      ),
    )
    await waitButtonRender()
    el = c.querySelector('button') as HTMLButtonElement
    expect(el.querySelector('#slot-icon')).toBeTruthy()
    expect(el.querySelector('#ignored-prop-icon')).toBeFalsy()
  })

  it('renders Button.Group and syncs group size and shape to child buttons', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Button.Group size={'large'} shape={'circle'} data-testid={'button-group'}>
          <Button color={'primary'}>{'Left'}</Button>
          <Button>{'Right'}</Button>
        </Button.Group>,
        c,
      ),
    )
    await waitButtonRender()
    await waitButtonRender()

    const root = c.querySelector('[data-testid="button-group"]') as HTMLElement
    const items = root.querySelectorAll('.btn')
    expect(root.classList.contains('join')).toBe(true)
    expect(items).toHaveLength(2)

    items.forEach(item => {
      expect(item.classList.contains('join-item')).toBe(true)
      expect(item.classList.contains('btn-lg')).toBe(true)
      expect(item.classList.contains('rounded-full')).toBe(true)
    })
  })
})
