import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'
import Navbar from '../index'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Navbar', () => {
  it('renders the root with base class and custom className', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Navbar className="bg-base-100 shadow-sm" data-testid="navbar-root">
          <button className="btn btn-ghost text-xl">daisyUI</button>
        </Navbar>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="navbar-root"]') as HTMLElement
      expect(root.classList.contains('navbar')).toBe(true)
      expect(root.classList.contains('bg-base-100')).toBe(true)
      expect(root.textContent).toContain('daisyUI')
    })
  })

  it('supports semantic slot props and root layout helpers', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Navbar
          as="header"
          className="bg-base-100"
          bordered
          wrap
          sticky
          brand="Rue"
          center="Docs"
          actions="Sign in"
          startProps={{ className: 'gap-2' }}
          endProps={{ className: 'gap-3' }}
          data-testid="navbar-slots"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="navbar-slots"]') as HTMLElement
      const start = root.querySelector('.navbar-start') as HTMLElement
      const center = root.querySelector('.navbar-center') as HTMLElement
      const end = root.querySelector('.navbar-end') as HTMLElement
      expect(root.tagName).toBe('HEADER')
      expect(root.classList.contains('navbar')).toBe(true)
      expect(root.classList.contains('border-b')).toBe(true)
      expect(root.classList.contains('flex-wrap')).toBe(true)
      expect(root.classList.contains('sticky')).toBe(true)
      expect(start.classList.contains('gap-2')).toBe(true)
      expect(center.textContent).toContain('Docs')
      expect(end.classList.contains('gap-3')).toBe(true)
      expect(end.textContent).toContain('Sign in')
    })
  })

  it('renders start center and end parts with forwarded attrs', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Navbar>
          <Navbar.Start data-testid="navbar-start" className="pl-2">
            <button>Menu</button>
          </Navbar.Start>
          <Navbar.Center data-testid="navbar-center">
            <button>Title</button>
          </Navbar.Center>
          <Navbar.End data-testid="navbar-end" className="gap-2">
            <button>Profile</button>
          </Navbar.End>
        </Navbar>,
        container,
      ),
    )

    await waitForContent(() => {
      const start = container.querySelector('[data-testid="navbar-start"]') as HTMLElement
      const center = container.querySelector('[data-testid="navbar-center"]') as HTMLElement
      const end = container.querySelector('[data-testid="navbar-end"]') as HTMLElement
      expect(start.classList.contains('navbar-start')).toBe(true)
      expect(start.classList.contains('pl-2')).toBe(true)
      expect(center.classList.contains('navbar-center')).toBe(true)
      expect(end.classList.contains('navbar-end')).toBe(true)
      expect(end.classList.contains('gap-2')).toBe(true)
    })
  })

  it('supports items driven rendering without children', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Navbar
          brand="Workspace"
          items={[
            {
              key: 'overview',
              placement: 'center',
              content: 'Overview',
            },
            {
              key: 'status',
              placement: 'end',
              content: 'Status',
              className: 'text-success',
            },
          ]}
          actions="Invite"
          centerProps={{ className: 'hidden md:flex' }}
          endProps={{ className: 'gap-2' }}
          data-testid="navbar-items"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="navbar-items"]') as HTMLElement
      const start = root.querySelector('.navbar-start') as HTMLElement
      const center = root.querySelector('.navbar-center') as HTMLElement
      const end = root.querySelector('.navbar-end') as HTMLElement
      const statusItem = Array.from(end.children).find(node =>
        node.textContent?.includes('Status'),
      ) as HTMLElement

      expect(start.textContent).toContain('Workspace')
      expect(center.classList.contains('hidden')).toBe(true)
      expect(center.textContent).toContain('Overview')
      expect(end.classList.contains('gap-2')).toBe(true)
      expect(end.textContent).toContain('Invite')
      expect(statusItem.classList.contains('text-success')).toBe(true)
    })
  })
})
