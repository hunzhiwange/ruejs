import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Template, render, setReactiveScheduling } from '@rue-js/rue'
import { readFileSync } from 'node:fs'
import { compileNodePlan } from '../../../../../runtime/__tests__/node-plan-test-utils'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'
import Card from '../index'

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Card', () => {
  it('server-renders semantic structure without actions', async () => {
    const server = compileNodePlan(
      `import Card from './card.js'; export const View = () => <Card title="SSR Card" className="bg-base-100"><p>Server body</p></Card>`,
      'server',
      false,
      { 'card.js': readFileSync('packages/rue-design/src/components/card/index.tsx', 'utf8') },
    )
    const html = await server.renderToString(server.View)

    expect(html).toContain('SSR Card')
    expect(html).toContain('Server body')
    expect(html).toContain('card-body')
    expect(html).not.toContain('rue-card-actions')
  })

  it('renders with base class and legacy class props', async () => {
    const c = mountContainer()
    mountTestApp(c, () =>
      render(
        <Card
          size={'lg'}
          border={true}
          bordered={true}
          dash={true}
          side={true}
          imageFull={true}
          className={'bg-base-100'}
        >
          {'hello'}
        </Card>,
        c,
      ),
    )

    await waitForContent(() => {
      const el = c.querySelector('.card') as HTMLElement
      expect(el).toBeTruthy()
      expect(el.classList.contains('card')).toBe(true)
      expect(el.classList.contains('card-lg')).toBe(true)
      expect(el.classList.contains('card-border')).toBe(true)
      expect(el.classList.contains('card-dash')).toBe(true)
      expect(el.classList.contains('card-side')).toBe(true)
      expect(el.classList.contains('image-full')).toBe(true)
      expect(el.classList.contains('bg-base-100')).toBe(true)
      expect(el.textContent).toContain('hello')
    })
  })

  it('supports semantic header, cover, actions and body slots', async () => {
    const c = mountContainer()
    mountTestApp(c, () =>
      render(
        <Card title={'Analytics Overview'} className={'bg-base-100'}>
          <Template slot="extra">
            <button className="btn btn-ghost btn-sm">Refresh</button>
          </Template>
          <Template slot="cover">
            <img src="cover.png" alt="cover" />
          </Template>
          <Template slot="actions">
            <li>Share</li>
            <li>Inspect</li>
          </Template>
          <p className={'body-copy'}>{'Revenue increased by 24% this month.'}</p>
        </Card>,
        c,
      ),
    )

    await waitForContent(() => {
      const card = c.querySelector('.card') as HTMLElement
      expect(card.classList.contains('bg-base-100')).toBe(true)
      const header = c.querySelector('.rue-card-header') as HTMLElement
      expect(header).toBeTruthy()
      expect(header.textContent).toContain('Analytics Overview')
      expect(header.textContent).toContain('Refresh')

      const cover = c.querySelector('.rue-card-cover img') as HTMLImageElement
      expect(cover).toBeTruthy()
      expect(cover.getAttribute('alt')).toBe('cover')

      const body = c.querySelector('.card-body') as HTMLElement
      expect(body).toBeTruthy()
      expect(body.textContent).toContain('Revenue increased by 24% this month.')

      const actionItems = c.querySelectorAll('.rue-card-actions li')
      expect(actionItems.length).toBe(2)
      expect(actionItems[0].textContent).toContain('Share')
      expect(actionItems[1].textContent).toContain('Inspect')
    })
  })

  it('renders loading placeholders instead of body content', async () => {
    const c = mountContainer()
    mountTestApp(c, () =>
      render(
        <Card title={'Loading card'} loading={true}>
          <p>{'Hidden body'}</p>
        </Card>,
        c,
      ),
    )

    await waitForContent(() => {
      const card = c.querySelector('.card') as HTMLElement
      expect(card.textContent).toContain('Loading card')
      expect(card.textContent).not.toContain('Hidden body')
      expect(c.querySelectorAll('.card-body .skeleton').length).toBeGreaterThan(1)
    })
  })

  it('supports uncontrolled tabs and emits tab change', async () => {
    const c = mountContainer()
    const onTabChange = vi.fn()

    mountTestApp(c, () =>
      render(
        <Card
          title={'Traffic'}
          defaultActiveTabKey={'metrics'}
          onTabChange={onTabChange}
          tabList={[
            { key: 'overview', label: 'Overview' },
            { key: 'metrics', label: 'Metrics' },
          ]}
        />,
        c,
      ),
    )

    await waitForContent(() => {
      const active = c.querySelector('.tab-active') as HTMLElement
      expect(active).toBeTruthy()
      expect(active.textContent).toBe('Metrics')
    })

    const overviewTab = Array.from(c.querySelectorAll('button.tab')).find(
      item => item.textContent === 'Overview',
    ) as HTMLButtonElement
    overviewTab.click()

    await waitForContent(() => {
      const active = c.querySelector('.tab-active') as HTMLElement
      expect(active.textContent).toBe('Overview')
      expect(onTabChange).toHaveBeenCalledWith('Overview'.toLowerCase())
    })
  })

  it('renders Meta and Grid compounded subcomponents', async () => {
    const c = mountContainer()
    mountTestApp(c, () =>
      render(
        <Card title={'Shortcuts'} bodyClassName={'!p-0'}>
          <Card.Body className={'border-base-300/80 border-b'}>
            <Card.Meta
              title={'Workspace AI'}
              description={'Connect docs, demos and design decisions in one place.'}
            >
              <Template slot="avatar">
                <div className={'avatar placeholder'}>
                  <div className={'bg-primary text-primary-content rounded-full w-10'}>{'AI'}</div>
                </div>
              </Template>
            </Card.Meta>
          </Card.Body>
          <div className={'grid gap-px bg-base-300/60 sm:grid-cols-2'}>
            <Card.Grid>
              <div className={'font-semibold'}>{'Design Tokens'}</div>
            </Card.Grid>
            <Card.Grid hoverable={false}>
              <div className={'font-semibold'}>{'Usage Reports'}</div>
            </Card.Grid>
          </div>
        </Card>,
        c,
      ),
    )

    await waitForContent(() => {
      const meta = c.querySelector('.rue-card-meta') as HTMLElement
      expect(meta).toBeTruthy()
      expect(meta.textContent).toContain('Workspace AI')
      expect(meta.textContent).toContain('Connect docs')

      const grids = c.querySelectorAll('.rue-card-grid')
      expect(grids.length).toBe(2)
      expect(grids[0].textContent).toContain('Design Tokens')
      expect(grids[1].textContent).toContain('Usage Reports')
    })
  })

  it('renders Body, Title, Actions and Figure low-level subcomponents', async () => {
    const c = mountContainer()
    mountTestApp(c, () =>
      render(
        <Card>
          <Card.Figure>
            <img src={'x'} alt={'y'} />
          </Card.Figure>
          <Card.Body>
            <Card.Title>{'Hello'}</Card.Title>
            <p>{'content'}</p>
            <Card.Actions>
              <button className={'btn'}>{'Go'}</button>
            </Card.Actions>
          </Card.Body>
        </Card>,
        c,
      ),
    )

    await waitForContent(() => {
      const body = c.querySelector('.card-body') as HTMLElement
      const title = c.querySelector('.card-title') as HTMLElement
      const actions = c.querySelector('.card-actions') as HTMLElement
      const figure = c.querySelector('figure') as HTMLElement
      expect(body).toBeTruthy()
      expect(title).toBeTruthy()
      expect(actions).toBeTruthy()
      expect(figure).toBeTruthy()
      expect(title.textContent).toBe('Hello')
    })
  })
})
