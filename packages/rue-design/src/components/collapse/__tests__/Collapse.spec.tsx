import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { render, setReactiveScheduling } from '@rue-js/rue'

setReactiveScheduling('sync')
import Collapse from '..'

const waitCollapseRender = () => new Promise(resolve => setTimeout(resolve, 0))

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Collapse', () => {
  it('renders with base class and children', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () => render(<Collapse tabIndex={0}>{'hello'}</Collapse>, c))
    await waitCollapseRender()
    const el = c.querySelector('.collapse') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('collapse')).toBe(true)
    expect(el.getAttribute('tabindex')).toBe('0')
    expect(el.textContent).toContain('hello')
  })

  it('applies modifier classes', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Collapse arrow={true} plus={true} open={true} close={true}>
          {'x'}
        </Collapse>,
        c,
      ),
    )
    await waitCollapseRender()
    const el = c.querySelector('.collapse') as HTMLElement
    expect(el.classList.contains('collapse-arrow')).toBe(true)
    expect(el.classList.contains('collapse-plus')).toBe(true)
    expect(el.classList.contains('collapse-open')).toBe(true)
    expect(el.classList.contains('collapse-close')).toBe(true)
  })

  it('appends custom className', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () => render(<Collapse className={'bg-base-100 border'}>{'x'}</Collapse>, c))
    await waitCollapseRender()
    const el = c.querySelector('.collapse') as HTMLElement
    expect(el.classList.contains('bg-base-100')).toBe(true)
    expect(el.classList.contains('border')).toBe(true)
  })

  it('renders details tag with summary title', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Collapse tag={'details'} className={'bg-base-100 border border-base-300'}>
          <Collapse.Title as={'summary'} className={'font-semibold'}>
            {'Title'}
          </Collapse.Title>
          <Collapse.Content className={'text-sm'}>{'Content'}</Collapse.Content>
        </Collapse>,
        c,
      ),
    )
    await waitCollapseRender()
    const details = c.querySelector('details.collapse') as HTMLElement
    expect(details).toBeTruthy()
    const summary = details.querySelector('summary.collapse-title') as HTMLElement
    expect(summary).toBeTruthy()
    const content = details.querySelector('.collapse-content') as HTMLElement
    expect(content).toBeTruthy()
  })

  it('renders items with default active keys and metadata', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Collapse
          items={[
            {
              key: 'overview',
              label: 'Overview',
              description: '系统概览',
              extra: <span data-testid="collapse-extra">Beta</span>,
              content: 'Overview content',
              open: true,
            },
            {
              key: 'api',
              label: 'API',
              content: 'API content',
            },
          ]}
        />,
        c,
      ),
    )
    await waitCollapseRender()

    const items = c.querySelectorAll('.collapse')
    expect(items.length).toBe(2)
    expect(items[0].classList.contains('collapse-open')).toBe(true)
    expect(items[1].classList.contains('collapse-close')).toBe(true)
    expect(c.textContent).toContain('系统概览')
    expect(c.textContent).toContain('Beta')
    expect(c.querySelector('[data-testid="collapse-extra"]')).toBeTruthy()
  })

  it('renders item children and keeps content as an alias', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Collapse
          items={[
            { key: 'children', label: 'Children', children: <strong>Children content</strong> },
            { key: 'content', label: 'Content', content: 'Content alias' },
          ]}
        />,
        c,
      ),
    )
    await waitCollapseRender()

    const contents = c.querySelectorAll('.collapse-content')
    expect(contents[0].textContent).toBe('Children content')
    expect(contents[0].querySelector('strong')).toBeTruthy()
    expect(contents[1].textContent).toBe('Content alias')
  })

  it('toggles uncontrolled items opened by defaultActiveKey', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Collapse
          arrow={true}
          defaultActiveKey={['overview']}
          items={[
            { key: 'overview', label: 'Overview', content: 'Overview content' },
            { key: 'release', label: 'Release', content: 'Release content' },
          ]}
        />,
        c,
      ),
    )
    await waitCollapseRender()

    const items = c.querySelectorAll('.collapse')
    const headers = c.querySelectorAll('.collapse-title')

    expect(items[0].classList.contains('collapse-open')).toBe(true)

    headers[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await waitCollapseRender()
    expect(items[0].classList.contains('collapse-close')).toBe(true)

    headers[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await waitCollapseRender()
    expect(items[0].classList.contains('collapse-open')).toBe(true)
  })

  it('toggles metadata header without triggering from extra area', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Collapse
          arrow={true}
          defaultActiveKey={['ops']}
          items={[
            {
              key: 'ops',
              label: 'Ops Console',
              description: '控制发布节奏、灰度范围与告警阈值。',
              extra: 'Beta',
              extraClassName: 'badge badge-soft badge-info',
              content: 'content',
            },
          ]}
        />,
        c,
      ),
    )
    await waitCollapseRender()

    const item = c.querySelector('.collapse') as HTMLElement
    const header = c.querySelector('.collapse-title') as HTMLElement
    const extra = c.querySelector('.collapse-title .shrink-0') as HTMLElement
    const badge = extra

    expect(item.classList.contains('collapse-open')).toBe(true)
    expect(badge).toBeTruthy()
    expect(badge.textContent).toBe('Beta')

    extra.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await waitCollapseRender()
    expect(item.classList.contains('collapse-open')).toBe(true)

    header.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await waitCollapseRender()
    expect(item.classList.contains('collapse-close')).toBe(true)
  })

  it('supports controlled activeKey and onChange in items mode', async () => {
    const c = document.createElement('div')
    const spy = vi.fn()
    mountTestApp(c, () =>
      render(
        <Collapse
          activeKey={'release'}
          arrow={true}
          items={[
            { key: 'intro', label: 'Intro', content: 'Intro content' },
            { key: 'release', label: 'Release', content: 'Release content' },
          ]}
          onChange={spy}
        />,
        c,
      ),
    )
    await waitCollapseRender()

    const items = c.querySelectorAll('.collapse')
    expect(items[1].classList.contains('collapse-open')).toBe(true)

    const headers = c.querySelectorAll('.collapse-title')
    headers[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await waitCollapseRender()

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][0]).toEqual(['release', 'intro'])
    expect(spy.mock.calls[0][1]).toMatchObject({ key: 'intro', index: 0, open: true })
  })

  it('supports accordion mode', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Collapse
          accordion={true}
          defaultActiveKey={'a'}
          items={[
            { key: 'a', label: 'A', content: 'A content' },
            { key: 'b', label: 'B', content: 'B content' },
          ]}
        />,
        c,
      ),
    )
    await waitCollapseRender()

    const headers = c.querySelectorAll('.collapse-title')
    headers[1].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await waitCollapseRender()

    const items = c.querySelectorAll('.collapse')
    expect(items[0].classList.contains('collapse-close')).toBe(true)
    expect(items[1].classList.contains('collapse-open')).toBe(true)
  })

  it('supports icon-only collapsible trigger and start placement', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Collapse
          arrow={true}
          expandIconPlacement={'start'}
          items={[
            {
              key: 'safe',
              label: 'Safe rollout',
              content: 'content',
              collapsible: 'icon',
            },
          ]}
        />,
        c,
      ),
    )
    await waitCollapseRender()

    const header = c.querySelector('.collapse-title') as HTMLElement
    header.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await waitCollapseRender()
    let item = c.querySelector('.collapse') as HTMLElement
    expect(item.classList.contains('collapse-close')).toBe(true)

    const iconButton = c.querySelector('.collapse-title button') as HTMLButtonElement
    iconButton.click()
    await waitCollapseRender()
    item = c.querySelector('.collapse') as HTMLElement
    expect(item.classList.contains('collapse-open')).toBe(true)
  })

  it('keeps a single icon trigger while toggling between expand and collapse', async () => {
    const c = document.createElement('div')
    const spy = vi.fn()
    mountTestApp(c, () =>
      render(
        <Collapse
          arrow={true}
          items={[
            {
              key: 'single-trigger',
              label: 'Single trigger',
              content: 'content',
              collapsible: 'icon',
            },
          ]}
          onChange={spy}
        />,
        c,
      ),
    )
    await waitCollapseRender()

    const getTriggers = () =>
      c.querySelectorAll<HTMLButtonElement>('[data-rue-collapse-icon-trigger]')

    expect(getTriggers()).toHaveLength(1)
    expect(getTriggers()[0].getAttribute('aria-label')).toBe('展开')

    getTriggers()[0].click()
    await waitCollapseRender()

    expect(getTriggers()).toHaveLength(1)
    expect(getTriggers()[0].getAttribute('aria-label')).toBe('收起')
    expect(spy).toHaveBeenCalledTimes(1)

    getTriggers()[0].click()
    await waitCollapseRender()

    expect(getTriggers()).toHaveLength(1)
    expect(getTriggers()[0].getAttribute('aria-label')).toBe('展开')
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('supports title metadata in legacy composition mode', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Collapse bordered={true}>
          <Collapse.Title description={'灰度发布'} extra={'v2'}>
            {'发布策略'}
          </Collapse.Title>
          <Collapse.Content>{'content'}</Collapse.Content>
        </Collapse>,
        c,
      ),
    )

    await waitCollapseRender()

    expect(c.textContent).toContain('发布策略')
    expect(c.textContent).toContain('灰度发布')
    expect(c.textContent).toContain('v2')
  })

  it('toggles legacy focus mode by repeatedly clicking the title', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Collapse tabIndex={0}>
          <Collapse.Title className={'font-semibold'}>{'Title'}</Collapse.Title>
          <Collapse.Content className={'text-sm'}>{'Content'}</Collapse.Content>
        </Collapse>,
        c,
      ),
    )
    await waitCollapseRender()

    const item = c.querySelector('.collapse') as HTMLElement
    const title = c.querySelector('.collapse-title') as HTMLElement

    expect(item.classList.contains('collapse-open')).toBe(false)

    title.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await waitCollapseRender()
    expect(item.classList.contains('collapse-open')).toBe(true)
    expect(item.classList.contains('collapse-close')).toBe(false)

    title.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await waitCollapseRender()
    expect(item.classList.contains('collapse-open')).toBe(false)
    expect(item.classList.contains('collapse-close')).toBe(true)
  })

  it('toggles legacy checkbox mode by clicking the title', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Collapse>
          <input type={'checkbox'} className={'peer'} />
          <Collapse.Title className={'font-semibold'}>{'Title'}</Collapse.Title>
          <Collapse.Content className={'text-sm'}>{'Content'}</Collapse.Content>
        </Collapse>,
        c,
      ),
    )
    await waitCollapseRender()

    const item = c.querySelector('.collapse') as HTMLElement
    const title = c.querySelector('.collapse-title') as HTMLElement
    const input = c.querySelector('input[type="checkbox"]') as HTMLInputElement

    expect(input.checked).toBe(false)
    expect(item.classList.contains('collapse-open')).toBe(false)

    title.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await waitCollapseRender()
    expect(input.checked).toBe(true)
    expect(item.classList.contains('collapse-open')).toBe(true)
    expect(item.classList.contains('collapse-close')).toBe(false)

    title.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await waitCollapseRender()
    expect(input.checked).toBe(false)
    expect(item.classList.contains('collapse-open')).toBe(false)
    expect(item.classList.contains('collapse-close')).toBe(true)
  })
})
