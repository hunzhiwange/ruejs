import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { render, setReactiveScheduling } from '@rue-js/rue'
import List from '../index'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const waitListRender = () => new Promise(resolve => setTimeout(resolve, 0))
const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active =
    (globalThis as any).__rue_vapor_preferred ?? (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('List', () => {
  it('renders with base class and children', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () => render(<List>{'hello'}</List>, c))
    await waitListRender()
    const el = c.querySelector('.list') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('list')).toBe(true)
    expect(el.textContent).toContain('hello')
  })

  it('appends custom className', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(<List className={'bg-base-100 rounded-box shadow-md'}>{'x'}</List>, c),
    )
    await waitListRender()
    const el = c.querySelector('.list') as HTMLElement
    expect(el.classList.contains('bg-base-100')).toBe(true)
    expect(el.classList.contains('rounded-box')).toBe(true)
    expect(el.classList.contains('shadow-md')).toBe(true)
  })

  it('renders Row subcomponent', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <List>
          <List.Row>{'row'}</List.Row>
        </List>,
        c,
      ),
    )
    await waitListRender()
    const row = c.querySelector('li.list-row') as HTMLElement
    expect(row).toBeTruthy()
    expect(row.textContent).toContain('row')
  })

  it('renders ColGrow and ColWrap subcomponents with correct tags and classes', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <List>
          <List.Row>
            <List.ColGrow>{'grow-content'}</List.ColGrow>
            <List.ColWrap as={'p'} className={'text-xs'}>
              {'wrap-content'}
            </List.ColWrap>
          </List.Row>
        </List>,
        c,
      ),
    )
    await waitListRender()
    const grow = c.querySelector('.list-row .list-col-grow') as HTMLElement
    const wrap = c.querySelector('.list-row p.list-col-wrap') as HTMLElement
    expect(grow).toBeTruthy()
    expect(grow.textContent).toContain('grow-content')
    expect(wrap).toBeTruthy()
    expect(wrap.classList.contains('text-xs')).toBe(true)
    expect(wrap.textContent).toContain('wrap-content')
  })

  it('renders Item as plain li with custom classes', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <List>
          <List.Item className={'p-4 pb-2 text-xs'}>{'header'}</List.Item>
        </List>,
        c,
      ),
    )
    await waitListRender()
    const item = c.querySelector('ul.list > li.p-4.pb-2.text-xs') as HTMLElement
    expect(item).toBeTruthy()
    expect(item.textContent).toContain('header')
  })

  it('renders Row with normal=true as plain li without list-row class', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <List>
          <List.Row normal={true} className={'p-2'}>
            {'plain'}
          </List.Row>
        </List>,
        c,
      ),
    )
    await waitListRender()
    const item = c.querySelector('ul.list > li.p-2') as HTMLElement
    expect(item).toBeTruthy()
    expect(item.classList.contains('list-row')).toBe(false)
    expect(item.textContent).toContain('plain')
  })

  it('renders legacy items internally', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <List
          items={[
            { type: 'item', className: 'p-2', content: 'Heading' },
            {
              type: 'row',
              content: 'Track',
              cols: [{ type: 'grow', content: 'Artist' }],
            },
          ]}
        />,
        c,
      ),
    )
    await waitListRender()
    expect(c.querySelector('ul.list > li.p-2')?.textContent).toContain('Heading')
    expect(c.querySelector('li.list-row')?.textContent).toContain('Artist')
  })

  it('renders legacy item fields with className and extra content', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <List
          items={[
            {
              className: 'px-4 py-3',
              title: 'Dio Lupa',
              description: 'Remaining Reason',
              extra: '152K plays',
            },
          ]}
        />,
        c,
      ),
    )
    await waitListRender()
    const row = c.querySelector('li.list-row') as HTMLElement
    expect(row).toBeTruthy()
    expect(row.classList.contains('px-4')).toBe(true)
    expect(row.textContent).toContain('Dio Lupa')
    expect(row.textContent).toContain('Remaining Reason')
    expect(row.textContent).toContain('152K plays')
  })

  it('renders dataSource with renderItem and rowKey', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <List
          dataSource={[{ id: 'a', name: 'Alpha' }]}
          rowKey={'id'}
          renderItem={(item: any) => (
            <List.Item className="p-2">
              <List.Item.Meta title={item.name} description="Rendered item" />
            </List.Item>
          )}
        />,
        c,
      ),
    )
    await waitListRender()
    const item = c.querySelector('ul.list > li.p-2') as HTMLElement
    expect(item).toBeTruthy()
    expect(item.textContent).toContain('Alpha')
    expect(item.textContent).toContain('Rendered item')
  })

  it('uses itemFormatter as the text fallback when renderItem is absent', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <List
          dataSource={[{ id: 'a', name: 'Alpha' }]}
          rowKey={'id'}
          itemClassName="p-2"
          itemFormatter={(item: any) => item.name}
        />,
        c,
      ),
    )
    await waitListRender()
    expect(c.querySelector('ul.list > li.p-2')?.textContent).toContain('Alpha')
  })

  it('renders object dataSource items without renderItem using a safe fallback', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(<List dataSource={[{ id: 'a', name: 'Alpha' }]} rowKey={'id'} />, c),
    )
    await waitListRender()
    const item = c.querySelector('ul.list > li') as HTMLElement
    expect(item).toBeTruthy()
    expect(item.textContent).toContain('Alpha')
  })

  it('renders item meta, actions, and extra content', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <List>
          <List.Item actions={[{ label: 'Open' }]} extra="New" extraClassName="badge">
            <List.Item.Meta avatar="A" title={'Title'} description={'Description'} />
          </List.Item>
        </List>,
        c,
      ),
    )
    await waitListRender()
    const row = c.querySelector('li.list-row') as HTMLElement
    expect(row).toBeTruthy()
    expect(row.textContent).toContain('Title')
    expect(row.textContent).toContain('Description')
    expect(row.textContent).toContain('Open')
    expect(row.querySelector('.badge')?.textContent).toContain('New')
  })

  it('renders JSX actions without treating them as action config objects', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <List>
          <List.Item
            actions={[
              <button type="button">Review</button>,
              <button type="button">Publish</button>,
            ]}
          >
            Track
          </List.Item>
        </List>,
        c,
      ),
    )
    await waitListRender()
    expect(c.textContent).toContain('Review')
    expect(c.textContent).toContain('Publish')
    expect(c.textContent).not.toContain('undefined')
  })

  it('renders loading and empty states', async () => {
    const loadingContainer = document.createElement('div')
    mountTestApp(loadingContainer, () =>
      render(<List loading={{ spinning: true, tip: 'Loading tracks' }} />, loadingContainer),
    )
    await waitListRender()
    expect(loadingContainer.querySelector('.loading')).toBeTruthy()
    expect(loadingContainer.textContent).toContain('Loading tracks')

    const emptyContainer = document.createElement('div')
    mountTestApp(emptyContainer, () =>
      render(<List dataSource={[]} locale={{ emptyText: 'Nothing here' }} />, emptyContainer),
    )
    await waitListRender()
    expect(emptyContainer.textContent).toContain('Nothing here')
  })

  it('renders header, footer, bordered, size, and grid styles', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <List
          bordered={true}
          size={'small'}
          grid={{ column: 2, gutter: 12 }}
          header={'Header'}
          footer={'Footer'}
          dataSource={['One', 'Two']}
        />,
        c,
      ),
    )
    await waitListRender()
    const root = c.querySelector('ul.list') as HTMLElement
    expect(root.classList.contains('border')).toBe(true)
    expect(root.classList.contains('text-sm')).toBe(true)
    expect(root.style.gridTemplateColumns).toContain('repeat(2')
    expect(root.style.gap).toBe('12px')
    expect(root.textContent).toContain('Header')
    expect(root.textContent).toContain('Footer')
  })

  it('renders JSX header and footer content', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <List
          header={<span>Release queue</span>}
          footer={<span>Synced recently</span>}
          dataSource={['One']}
        />,
        c,
      ),
    )
    await waitListRender()
    expect(c.textContent).toContain('Release queue')
    expect(c.textContent).toContain('Synced recently')
    expect(c.textContent).not.toContain('=>')
  })

  it('renders pagination controls and page content', async () => {
    const c = mountContainer()
    const onChange = vi.fn()
    resetActiveRuntime()
    mountTestApp(c, () =>
      render(
        <List
          dataSource={[
            { id: 'one', name: 'One' },
            { id: 'two', name: 'Two' },
            { id: 'three', name: 'Low Tide Letters' },
          ]}
          rowKey="id"
          renderItem={(item: any) => (
            <List.Item className="px-4 py-3">
              <List.Item.Meta title={item.name} description="Rendered page item" />
            </List.Item>
          )}
          pagination={{ pageSize: 2, align: 'center', onChange }}
        />,
        c,
      ),
    )
    await waitForContent(() => {
      expect(c.textContent).toContain('One')
      expect(c.textContent).toContain('Two')
      expect(c.textContent).not.toContain('Low Tide Letters')
      expect(c.querySelector('.join .btn-active')?.textContent).toContain('1')
      expect(c.querySelectorAll('.join button').length).toBe(4)
    })

    const pageTwo = Array.from(c.querySelectorAll('.join button')).find(
      button => button.textContent === '2',
    ) as HTMLButtonElement
    pageTwo.click()
    await waitForContent(() => {
      expect(onChange).toHaveBeenCalledWith(2, 2)
      expect(c.textContent).toContain('Low Tide Letters')
      expect(c.querySelector('ul.list > li.px-4.py-3')).toBeTruthy()
      expect(c.querySelector('.join .btn-active')?.textContent).toContain('2')
    })
  })
})
