import { afterEach, describe, expect, it } from 'vitest'
import { h } from '@rue-js/rue'
import { render } from '@rue-js/rue'
import { Table } from '@rue-js/design'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Table', () => {
  it('renders with base class and children', () => {
    const c = document.createElement('div')
    render(h(Table, null, 'hello'), c)
    const el = c.querySelector('table.table') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('table')).toBe(true)
    expect(el.textContent).toContain('hello')
  })

  it('applies size classes', () => {
    const c = document.createElement('div')
    ;(['xs', 'sm', 'md', 'lg', 'xl'] as const).forEach(s => {
      render(h(Table, { size: s }, 'x'), c)
      const el = c.querySelector('table.table') as HTMLElement
      expect(el.classList.contains('table')).toBe(true)
      expect(el.classList.contains(`table-${s}`)).toBe(true)
    })
  })

  it('applies zebra, pinRows, pinCols classes', () => {
    const c = document.createElement('div')
    render(h(Table, { zebra: true, pinRows: true, pinCols: true }, 'x'), c)
    const el = c.querySelector('table.table') as HTMLElement
    expect(el.classList.contains('table-zebra')).toBe(true)
    expect(el.classList.contains('table-pin-rows')).toBe(true)
    expect(el.classList.contains('table-pin-cols')).toBe(true)
  })

  it('appends custom className', () => {
    const c = document.createElement('div')
    render(h(Table, { className: 'w-full' }, 'x'), c)
    const el = c.querySelector('table.table') as HTMLElement
    expect(el.classList.contains('w-full')).toBe(true)
  })

  it('renders Head, Body, Foot, TR, TH, TD subcomponents', () => {
    const c = document.createElement('div')
    render(
      h(
        Table,
        null,
        h(Table.Head, null, h(Table.TR, null, h(Table.TH, null, 'h1'), h(Table.TH, null, 'h2'))),
        h(Table.Body, null, h(Table.TR, null, h(Table.TD, null, 'a1'), h(Table.TD, null, 'a2'))),
        h(Table.Foot, null, h(Table.TR, null, h(Table.TH, null, 'f1'), h(Table.TH, null, 'f2'))),
      ),
      c,
    )
    const head = c.querySelector('thead') as HTMLElement
    const body = c.querySelector('tbody') as HTMLElement
    const foot = c.querySelector('tfoot') as HTMLElement
    const trs = c.querySelectorAll('tr')
    const ths = c.querySelectorAll('th')
    const tds = c.querySelectorAll('td')
    expect(head).toBeTruthy()
    expect(body).toBeTruthy()
    expect(foot).toBeTruthy()
    expect(trs.length).toBeGreaterThan(0)
    expect(ths.length).toBeGreaterThan(0)
    expect(tds.length).toBeGreaterThan(0)
  })

  it('renders with columns and dataSource API', () => {
    const c = document.createElement('div')
    const dataSource = [
      { key: '1', name: 'A', job: 'Dev', color: 'Blue' },
      { key: '2', name: 'B', job: 'Ops', color: 'Red' },
    ]
    const columns = [
      { title: 'Name', dataIndex: 'name' },
      { title: 'Job', dataIndex: 'job' },
      { title: 'Favorite Color', dataIndex: 'color' },
    ]
    render(h(Table, { columns, dataSource }), c)
    const head = c.querySelector('thead') as HTMLElement
    const ths = Array.from(c.querySelectorAll('thead th')).map(el => el.textContent?.trim())
    const tds = Array.from(c.querySelectorAll('tbody td')).map(el => el.textContent?.trim())
    expect(head).toBeTruthy()
    expect(ths).toEqual(['Name', 'Job', 'Favorite Color'])
    expect(tds).toEqual(['A', 'Dev', 'Blue', 'B', 'Ops', 'Red'])
  })

  it('renders selection column with header checkbox', () => {
    const c = document.createElement('div')
    const dataSource = [
      { key: '1', name: 'A' },
      { key: '2', name: 'B' },
    ]
    const columns = [{ title: 'Name', dataIndex: 'name' }]
    render(
      h(Table, {
        columns,
        dataSource,
        rowSelection: { defaultSelectedRowKeys: ['1'] },
      }),
      c,
    )
    const headerCheckbox = c.querySelector(
      'thead input[type="checkbox"].checkbox',
    ) as HTMLInputElement
    const rowCheckboxes = c.querySelectorAll('tbody input[type="checkbox"].checkbox')
    expect(headerCheckbox).toBeTruthy()
    expect(rowCheckboxes.length).toBe(2)
  })

  it('paginates data when pagination provided', () => {
    const c = document.createElement('div')
    const dataSource = [
      { key: '1', name: 'A' },
      { key: '2', name: 'B' },
      { key: '3', name: 'C' },
    ]
    const columns = [{ title: 'Name', dataIndex: 'name' }]
    render(
      h(Table, {
        columns,
        dataSource,
        pagination: { current: 1, pageSize: 1 },
      }),
      c,
    )
    const tds = Array.from(c.querySelectorAll('tbody td')).map(el => el.textContent?.trim())
    const pager = c.querySelector('tfoot') as HTMLElement
    expect(tds).toEqual(['A'])
    expect(pager).toBeTruthy()
  })

  it('supports defaultSortOrder to sort data', () => {
    const c = document.createElement('div')
    const dataSource = [
      { key: '1', name: 'B' },
      { key: '2', name: 'A' },
    ]
    const columns = [
      { title: 'Name', dataIndex: 'name', sorter: true, defaultSortOrder: 'ascend' as const },
    ]
    render(h(Table, { columns, dataSource }), c)
    const tds = Array.from(c.querySelectorAll('tbody td')).map(el => el.textContent?.trim())
    expect(tds).toEqual(['A', 'B'])
  })

  it('renders expandable rows with defaultExpandAllRows', () => {
    const c = document.createElement('div')
    const dataSource = [
      { key: '1', name: 'A' },
      { key: '2', name: 'B' },
    ]
    const columns = [{ title: 'Name', dataIndex: 'name' }]
    render(
      h(Table, {
        columns,
        dataSource,
        expandable: {
          defaultExpandAllRows: true,
          expandedRowRender: (r: any) => h('div', null, `extra-${r.name}`),
        },
      }),
      c,
    )
    const extras = Array.from(c.querySelectorAll('tbody tr td')).map(el => el.textContent || '')
    expect(extras.join(' ')).toContain('extra-A')
    expect(extras.join(' ')).toContain('extra-B')
  })

  it('filters data via filteredValue', () => {
    const c = document.createElement('div')
    const dataSource = [
      { key: '1', name: 'A', job: 'Dev' },
      { key: '2', name: 'B', job: 'Ops' },
    ]
    const columns = [
      { title: 'Name', dataIndex: 'name', filteredValue: ['A'] },
      { title: 'Job', dataIndex: 'job' },
    ]
    render(h(Table, { columns, dataSource }), c)
    const tds = Array.from(c.querySelectorAll('tbody td')).map(el => el.textContent?.trim())
    expect(tds).toEqual(['A', 'Dev'])
  })

  it('combines multiple filters with AND when filterCombine=and', () => {
    const c = document.createElement('div')
    const dataSource = [
      { key: '1', age: 42 },
      { key: '2', age: 32 },
      { key: '3', age: 21 },
      { key: '4', age: 40 },
    ]
    const columns = [
      {
        title: 'Age',
        dataIndex: 'age',
        filters: [
          { text: '≥40', value: 'gte40' },
          { text: '<40', value: 'lt40' },
          { text: '偶数', value: 'even' },
        ],
        filteredValue: ['gte40', 'even'],
        filterCombine: 'and' as const,
        onFilter: (val: any, rec: any) => {
          if (val === 'gte40') return rec.age >= 40
          if (val === 'lt40') return rec.age < 40
          if (val === 'even') return rec.age % 2 === 0
          return true
        },
      },
    ]
    render(h(Table, { columns, dataSource }), c)
    const ages = Array.from(c.querySelectorAll('tbody td')).map(el => Number(el.textContent || 0))
    expect(ages).toEqual([42, 40])
  })

  it('supports hidden columns', () => {
    const c = document.createElement('div')
    const dataSource = [{ key: '1', name: 'A', job: 'Dev' }]
    const columns = [
      { title: 'Name', dataIndex: 'name' },
      { title: 'Job', dataIndex: 'job', hidden: true },
    ]
    render(h(Table, { columns, dataSource }), c)
    const ths = Array.from(c.querySelectorAll('thead th')).map(el => el.textContent?.trim())
    const tds = Array.from(c.querySelectorAll('tbody td')).map(el => el.textContent?.trim())
    expect(ths).toEqual(['Name'])
    expect(tds).toEqual(['A'])
  })

  it('renders summary and pagination in tfoot', () => {
    const c = document.createElement('div')
    const dataSource = [
      { key: '1', name: 'A' },
      { key: '2', name: 'B' },
    ]
    const columns = [{ title: 'Name', dataIndex: 'name' }]
    const summary = (rows: any[]) => h('div', null, `Total: ${rows.length}`)
    render(h(Table, { columns, dataSource, pagination: { current: 1, pageSize: 1 }, summary }), c)
    const foot = c.querySelector('tfoot') as HTMLElement
    expect(foot).toBeTruthy()
    expect(foot.textContent || '').toContain('Total: 1')
  })

  it('renders emptyText when page has no data', () => {
    const c = document.createElement('div')
    const dataSource: any[] = []
    const columns = [{ title: 'Name', dataIndex: 'name' }]
    render(h(Table, { columns, dataSource, emptyText: 'Empty' }), c)
    const tbody = c.querySelector('tbody') as HTMLElement
    expect(tbody.textContent || '').toContain('Empty')
  })

  it('fires onRow event handlers', () => {
    const c = document.createElement('div')
    const spy = { count: 0 }
    const dataSource = [{ key: '1', name: 'A' }]
    const columns = [{ title: 'Name', dataIndex: 'name' }]
    render(
      h(Table, {
        columns,
        dataSource,
        onRow: () => ({ onClick: () => (spy.count += 1) }),
      }),
      c,
    )
    const tr = c.querySelector('tbody tr') as HTMLElement
    tr.click()
    expect(spy.count).toBe(1)
  })

  it('supports wrapper scroll and onScroll callback', () => {
    const c = document.createElement('div')
    const dataSource = Array.from({ length: 5 }).map((_, i) => ({
      key: String(i + 1),
      name: String(i + 1),
    }))
    const columns = [{ title: 'Name', dataIndex: 'name' }]
    let called = 0
    render(h(Table, { columns, dataSource, scroll: { y: 100 }, onScroll: () => (called += 1) }), c)
    const table = c.querySelector('table.table') as HTMLElement
    const wrapper = table.parentElement as HTMLElement
    wrapper.dispatchEvent(new Event('scroll'))
    expect(called).toBeGreaterThan(0)
  })

  it('renders title and footer content', () => {
    const c = document.createElement('div')
    const dataSource = [{ key: '1', name: 'A' }]
    const columns = [{ title: 'Name', dataIndex: 'name' }]
    render(
      h(Table, {
        columns,
        dataSource,
        scroll: { x: true },
        title: () => h('div', null, 'CustomTitle'),
        footer: () => h('div', null, 'CustomFooter'),
      }),
      c,
    )
    const wrapper = (c.querySelector('table.table') as HTMLElement).parentElement as HTMLElement
    expect(wrapper.textContent || '').toContain('CustomTitle')
    expect(wrapper.textContent || '').toContain('CustomFooter')
  })

  it('applies hover class when rowHoverable with custom rowHoverClass', () => {
    const c = document.createElement('div')
    const dataSource = [{ key: '1', name: 'A' }]
    const columns = [{ title: 'Name', dataIndex: 'name' }]
    render(
      h(Table, { columns, dataSource, rowHoverable: true, rowHoverClass: 'hover:bg-red-200' }),
      c,
    )
    const tr = c.querySelector('tbody tr') as HTMLElement
    expect(tr.classList.contains('hover:bg-red-200')).toBe(true)
  })
})
