import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { render, setReactiveScheduling } from '@rue-js/rue'
import Dock from '../index'

setReactiveScheduling('sync')

const flushDock = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Dock', () => {
  it('renders with base class', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () => render(<Dock>{'x'}</Dock>, c))
    await flushDock()
    const el = c.querySelector('.dock') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('dock')).toBe(true)
  })

  it('applies size classes', async () => {
    for (const s of ['xs', 'sm', 'md', 'lg', 'xl'] as const) {
      const c = document.createElement('div')
      mountTestApp(c, () => render(<Dock size={s}>{'x'}</Dock>, c))
      await flushDock()
      const el = c.querySelector('.dock') as HTMLElement
      expect(el.classList.contains('dock')).toBe(true)
      expect(el.classList.contains(`dock-${s}`)).toBe(true)
    }
  })

  it('appends custom className', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () => render(<Dock className={'relative border'}>{'x'}</Dock>, c))
    await flushDock()
    const el = c.querySelector('.dock') as HTMLElement
    expect(el.classList.contains('relative')).toBe(true)
    expect(el.classList.contains('border')).toBe(true)
  })

  it('renders Item and Label subcomponents', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Dock>
          <Dock.Item active={true}>
            <svg className={'size-[1.2em]'} />
            <Dock.Label>{'Home'}</Dock.Label>
          </Dock.Item>
        </Dock>,
        c,
      ),
    )
    await flushDock()
    const el = c.querySelector('.dock') as HTMLElement
    const btn = el.querySelector('button') as HTMLElement
    const label = el.querySelector('.dock-label') as HTMLElement
    expect(btn).toBeTruthy()
    expect(btn.classList.contains('dock-active')).toBe(true)
    expect(label).toBeTruthy()
    expect(label.textContent).toContain('Home')
  })

  it('supports activeIndex and onChange callback', async () => {
    const c = document.createElement('div')
    let changedIndex = -1
    const items = [
      { icon: <svg className={'size-[1.2em]'} />, label: 'Home' },
      { icon: <svg className={'size-[1.2em]'} />, label: 'Inbox' },
      { icon: <svg className={'size-[1.2em]'} />, label: 'Settings' },
    ]
    mountTestApp(c, () =>
      render(
        <Dock items={items} activeIndex={1} onChange={(i: number) => (changedIndex = i)} />,
        c,
      ),
    )
    await flushDock()
    const el = c.querySelector('.dock') as HTMLElement
    const btns = el.querySelectorAll('button')
    expect(btns.length).toBe(3)
    expect(btns[1].classList.contains('dock-active')).toBe(true)
    ;(btns[2] as HTMLButtonElement).click()
    expect(changedIndex).toBe(2)
  })

  it('supports semantic nav root and activeKey selection', async () => {
    const c = document.createElement('div')
    let selectedKey: string | number | null = null
    const items = [
      { key: 'home', icon: <span>{'H'}</span>, label: 'Home' },
      { key: 'inbox', icon: <span>{'I'}</span>, label: 'Inbox' },
      { key: 'settings', icon: <span>{'S'}</span>, label: 'Settings' },
    ]
    mountTestApp(c, () =>
      render(
        <Dock
          as={'nav'}
          items={items}
          activeKey={'inbox'}
          onSelect={(key: string | number | null) => (selectedKey = key)}
        />,
        c,
      ),
    )
    await flushDock()
    const nav = c.querySelector('nav.dock') as HTMLElement
    const buttons = nav.querySelectorAll('button')
    expect(nav).toBeTruthy()
    expect(buttons[1].classList.contains('dock-active')).toBe(true)
    ;(buttons[2] as HTMLButtonElement).click()
    expect(selectedKey).toBe('settings')
  })

  it('supports defaultActiveKey in uncontrolled items mode', async () => {
    const c = document.createElement('div')
    resetActiveRuntime()
    const items = [
      { key: 'home', icon: <span>{'H'}</span>, label: 'Home' },
      { key: 'inbox', icon: <span>{'I'}</span>, label: 'Inbox' },
    ]
    mountTestApp(c, () => render(<Dock items={items} defaultActiveKey={'home'} />, c))
    await flushDock()
    let buttons = c.querySelectorAll('button')
    expect(buttons[0].classList.contains('dock-active')).toBe(true)
    ;(buttons[1] as HTMLButtonElement).click()
    await flushDock()
    buttons = c.querySelectorAll('button')
    expect(buttons[0].classList.contains('dock-active')).toBe(false)
    expect(buttons[1].classList.contains('dock-active')).toBe(true)
  })

  it('supports defaultActiveIndex in uncontrolled items mode', async () => {
    const c = document.createElement('div')
    resetActiveRuntime()
    const items = [
      { icon: <span>{'H'}</span>, label: 'Home' },
      { icon: <span>{'I'}</span>, label: 'Inbox' },
      { icon: <span>{'S'}</span>, label: 'Settings' },
    ]
    mountTestApp(c, () => render(<Dock items={items} defaultActiveIndex={1} />, c))
    await flushDock()
    let buttons = c.querySelectorAll('button')
    expect(buttons[1].classList.contains('dock-active')).toBe(true)
    ;(buttons[2] as HTMLButtonElement).click()
    await flushDock()
    buttons = c.querySelectorAll('button')
    expect(buttons[1].classList.contains('dock-active')).toBe(false)
    expect(buttons[2].classList.contains('dock-active')).toBe(true)
  })

  it('renders anchors from item href and blocks disabled interaction', async () => {
    const c = document.createElement('div')
    const itemClick = vi.fn()
    resetActiveRuntime()
    mountTestApp(c, () =>
      render(
        <Dock
          items={[
            { key: 'docs', href: '/docs', icon: <span>{'D'}</span>, label: 'Docs' },
            {
              key: 'locked',
              href: '/locked',
              disabled: true,
              icon: <span>{'L'}</span>,
              label: 'Locked',
              onClick: itemClick,
            },
          ]}
        />,
        c,
      ),
    )
    await flushDock()
    const anchors = c.querySelectorAll('a')
    expect(anchors.length).toBe(2)
    expect(anchors[0].getAttribute('href')).toBe('/docs')
    expect(anchors[1].getAttribute('href')).not.toBe('/locked')
    ;(anchors[1] as HTMLAnchorElement).click()
    expect(itemClick).not.toHaveBeenCalled()
    expect(anchors[1].getAttribute('aria-disabled')).toBe('true')
  })

  it('maps size aliases to dock size classes', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () => render(<Dock size={'large'}>{'x'}</Dock>, c))
    await flushDock()
    const el = c.querySelector('.dock') as HTMLElement
    expect(el.classList.contains('dock-lg')).toBe(true)
  })

  it('auto renders items when items prop is provided', async () => {
    const c = document.createElement('div')
    const items = [
      { icon: <span>{'I1'}</span>, label: 'L1' },
      { icon: <span>{'I2'}</span>, label: 'L2' },
    ]
    mountTestApp(c, () => render(<Dock items={items} activeIndex={0} />, c))
    await flushDock()
    const el = c.querySelector('.dock') as HTMLElement
    const labels = el.querySelectorAll('.dock-label')
    expect(labels.length).toBe(2)
    const btns = el.querySelectorAll('button')
    expect(btns[0].classList.contains('dock-active')).toBe(true)
  })
})
