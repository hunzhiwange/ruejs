import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { render, setReactiveScheduling } from '@rue-js/rue'
import Breadcrumbs from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Breadcrumbs', () => {
  it('renders with base class and ul', async () => {
    const c = mountContainer()
    mountTestApp(c, () =>
      render(
        <Breadcrumbs>
          <li>{'Home'}</li>
        </Breadcrumbs>,
        c,
      ),
    )
    await waitForContent(() => {
      const el = c.querySelector('.breadcrumbs') as HTMLElement
      expect(el).toBeTruthy()
      expect(el.classList.contains('breadcrumbs')).toBe(true)
      const ul = el.querySelector('ul') as HTMLElement
      expect(ul).toBeTruthy()
      expect(ul.textContent).toContain('Home')
    })
  })

  it('appends custom className', async () => {
    const c = mountContainer()
    mountTestApp(c, () =>
      render(
        <Breadcrumbs className={'text-sm'}>
          <li>{'x'}</li>
        </Breadcrumbs>,
        c,
      ),
    )
    await waitForContent(() => {
      const el = c.querySelector('.breadcrumbs') as HTMLElement
      expect(el.classList.contains('text-sm')).toBe(true)
    })
  })

  it('renders children li items', async () => {
    const c = mountContainer()
    mountTestApp(c, () =>
      render(
        <Breadcrumbs>
          <li>
            <a>{'Home'}</a>
          </li>
          <li>
            <a>{'Documents'}</a>
          </li>
          <li>{'Add Document'}</li>
        </Breadcrumbs>,
        c,
      ),
    )
    await waitForContent(() => {
      const lis = c.querySelectorAll('.breadcrumbs ul li')
      expect(lis.length).toBe(3)
    })
  })

  it('renders Item subcomponent', async () => {
    const c = mountContainer()
    mountTestApp(c, () =>
      render(
        <Breadcrumbs className={'text-sm'}>
          <Breadcrumbs.Item>
            <span>{'Home'}</span>
          </Breadcrumbs.Item>
        </Breadcrumbs>,
        c,
      ),
    )
    await waitForContent(() => {
      const el = c.querySelector('.breadcrumbs') as HTMLElement
      const li = el.querySelector('li') as HTMLElement
      expect(li).toBeTruthy()
      expect(li.textContent).toContain('Home')
    })
  })

  it('renders Item subcomponent with href, icon and current state', async () => {
    const c = mountContainer()
    mountTestApp(c, () =>
      render(
        <Breadcrumbs className={'text-sm'}>
          <Breadcrumbs.Item href={'/home'} icon="H" iconClassName="crumb-icon">
            {'Home'}
          </Breadcrumbs.Item>
          <Breadcrumbs.Item current={true}>{'Library'}</Breadcrumbs.Item>
        </Breadcrumbs>,
        c,
      ),
    )

    await waitForContent(() => {
      const homeLink = c.querySelector('li a[href="/home"]') as HTMLAnchorElement
      expect(homeLink).toBeTruthy()
      expect(homeLink.querySelector('.crumb-icon')?.textContent).toBe('H')

      const current = c.querySelector('li span[aria-current="page"]') as HTMLElement
      expect(current).toBeTruthy()
      expect(current.textContent).toContain('Library')
    })
  })

  it('renders from items array with icons and href', async () => {
    const c = mountContainer()
    const items = [
      {
        label: 'Home',
        href: '/home',
        linkClassName: 'hover:underline cursor-pointer inline-flex gap-2 items-center',
        icon: { path: 'M4 4h16v16H4z' },
      },
      {
        label: 'Documents',
        href: '/docs',
        linkClassName: 'hover:underline cursor-pointer inline-flex gap-2 items-center',
      },
      {
        label: 'Add Document',
        className: 'last',
        icon: { path: 'M4 4h16v16H4z' },
      },
    ]
    mountTestApp(c, () => render(<Breadcrumbs className={'text-sm'} items={items} />, c))
    await waitForContent(() => {
      const el = c.querySelector('.breadcrumbs') as HTMLElement
      expect(el.classList.contains('text-sm')).toBe(true)
      const lis = el.querySelectorAll(':scope > ul > li')
      expect(lis.length).toBe(3)
      const firstLink = lis[0].querySelector('a') as HTMLAnchorElement
      expect(firstLink).toBeTruthy()
      expect(firstLink.getAttribute('href')).toBe('/home')
      expect(firstLink.classList.contains('hover:underline')).toBe(true)
      const icon = lis[2].querySelector('svg') as SVGElement
      expect(icon).toBeTruthy()
    })
  })

  it('supports title alias, params and itemRender in items mode', async () => {
    const c = mountContainer()
    const items = [
      { path: 'workspace', title: 'Workspace' },
      { path: ':projectId', title: 'Project' },
      { title: 'Button' },
    ]

    mountTestApp(c, () =>
      render(
        <Breadcrumbs
          items={items}
          params={{ projectId: 42 }}
          itemFormatter={(
            item: any,
            params: any,
            routes: readonly any[],
            paths: string[],
            href?: string,
          ) => {
            const title = item.title ?? item.label
            const content = `${title}|${params.projectId}|${routes.length}|${paths.join('/')}`
            return content
          }}
        />,
        c,
      ),
    )

    await waitForContent(() => {
      const workspace = c.querySelector('a[href="/workspace"]') as HTMLAnchorElement
      expect(workspace.getAttribute('href')).toBe('/workspace')
      expect(workspace.textContent).toBe('Workspace|42|3|workspace')

      const project = c.querySelector('a[href="/workspace/42"]') as HTMLAnchorElement
      expect(project.getAttribute('href')).toBe('/workspace/42')
      expect(project.textContent).toBe('Project|42|3|workspace/42')

      const button = c.querySelector('ul > li:last-child > span:last-child') as HTMLElement
      expect(button.tagName.toLowerCase()).toBe('span')
      expect(button.textContent).toBe('Button|42|3|workspace/42')
    })
  })

  it('supports custom separators and menu items in items mode', async () => {
    const c = mountContainer()

    mountTestApp(c, () =>
      render(
        <Breadcrumbs
          separator={'/'}
          dropdownIcon="v"
          items={[
            { title: 'Home', href: '/home' },
            { type: 'separator', separator: '•' },
            {
              title: 'Library',
              menu: {
                items: [
                  { key: 'all', title: 'All Posts', href: '/posts' },
                  { key: 'draft', title: 'Drafts' },
                ],
              },
            },
            { title: 'Button' },
          ]}
        />,
        c,
      ),
    )

    await waitForContent(() => {
      const listItems = c.querySelectorAll('.breadcrumbs > ul > li')
      expect(listItems.length).toBe(3)

      const librarySeparator = listItems[1].firstElementChild as HTMLElement
      expect(librarySeparator).toBeTruthy()
      expect(librarySeparator.textContent).toBe('•')

      const overlay = document.body.querySelector('.dropdown-content') as HTMLElement
      const menu = overlay.querySelector('.menu') as HTMLElement
      expect(menu).toBeTruthy()
      expect(menu.querySelectorAll('li').length).toBe(2)
      expect(overlay.classList.contains('z-30')).toBe(true)
      expect(c.querySelector('[data-rue-breadcrumb-dropdown-icon="true"]')?.textContent).toBe('v')

      const trigger = c.querySelector('[aria-haspopup="dialog"]') as HTMLElement
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(c.querySelector('.dropdown')?.classList.contains('dropdown-open')).toBe(true)
      expect(overlay.style.position).toBe('fixed')
      expect(overlay.style.margin).toBe('0px')
      expect(overlay.style.getPropertyValue('translate')).toBe('0 0')

      const buttonSeparator = listItems[2].firstElementChild as HTMLElement
      expect(buttonSeparator.textContent).toBe('/')
    })
  })
})
