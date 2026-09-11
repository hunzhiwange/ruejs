import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { ref } from '@rue-js/rue'

import { render, setReactiveScheduling } from '@rue-js/rue'
import Table from '..'
import {
  click,
  mountContainer,
  waitForContent,
} from '../../../../../runtime/__tests__/page-test-utils'

const waitTableRender = () => new Promise(resolve => setTimeout(resolve, 0))
const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Table', () => {
  it('renders with base class and children', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () => render(<Table>{'hello'}</Table>, c))
    await waitTableRender()
    const el = c.querySelector('table.table') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.classList.contains('table')).toBe(true)
    expect(el.textContent).toContain('hello')
  })

  it('applies size classes', async () => {
    const c = document.createElement('div')
    ;(['xs', 'sm', 'md', 'lg', 'xl'] as const).forEach(s => {
      mountTestApp(c, () => render(<Table size={s}>{'x'}</Table>, c))
    })
    await waitTableRender()
    const el = c.querySelector('table.table') as HTMLElement
    expect(el.classList.contains('table')).toBe(true)
    expect(el.classList.contains('table-xl')).toBe(true)
  })

  it('applies zebra, pinRows, pinCols classes', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Table zebra={true} pinRows={true} pinCols={true}>
          {'x'}
        </Table>,
        c,
      ),
    )
    await waitTableRender()
    const el = c.querySelector('table.table') as HTMLElement
    expect(el.classList.contains('table-zebra')).toBe(true)
    expect(el.classList.contains('table-pin-rows')).toBe(true)
    expect(el.classList.contains('table-pin-cols')).toBe(true)
  })

  it('appends custom className', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () => render(<Table className={'w-full'}>{'x'}</Table>, c))
    await waitTableRender()
    const el = c.querySelector('table.table') as HTMLElement
    expect(el.classList.contains('w-full')).toBe(true)
  })

  it('renders Head, Body, Foot, TR, TH, TD subcomponents', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Table>
          <Table.Head>
            <Table.TR>
              <Table.TH>{'h1'}</Table.TH>
              <Table.TH>{'h2'}</Table.TH>
            </Table.TR>
          </Table.Head>
          <Table.Body>
            <Table.TR>
              <Table.TD>{'a1'}</Table.TD>
              <Table.TD>{'a2'}</Table.TD>
            </Table.TR>
          </Table.Body>
          <Table.Foot>
            <Table.TR>
              <Table.TH>{'f1'}</Table.TH>
              <Table.TH>{'f2'}</Table.TH>
            </Table.TR>
          </Table.Foot>
        </Table>,
        c,
      ),
    )
    await waitTableRender()
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

  it('renders with columns and dataSource API', async () => {
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
    mountTestApp(c, () => render(<Table columns={columns} dataSource={dataSource} />, c))
    await waitTableRender()
    const head = c.querySelector('thead') as HTMLElement
    const ths = Array.from(c.querySelectorAll('thead th')).map(el => el.textContent?.trim())
    const tds = Array.from(c.querySelectorAll('tbody td')).map(el => el.textContent?.trim())
    expect(head).toBeTruthy()
    expect(ths).toEqual(['Name', 'Job', 'Favorite Color'])
    expect(tds).toEqual(['A', 'Dev', 'Blue', 'B', 'Ops', 'Red'])
  })

  it('renders selection column with header checkbox', async () => {
    const c = document.createElement('div')
    const dataSource = [
      { key: '1', name: 'A' },
      { key: '2', name: 'B' },
    ]
    const columns = [{ title: 'Name', dataIndex: 'name' }]
    mountTestApp(c, () =>
      render(
        <Table
          columns={columns}
          dataSource={dataSource}
          rowSelection={{ defaultSelectedRowKeys: ['1'] }}
        />,
        c,
      ),
    )
    await waitTableRender()
    const headerCheckbox = c.querySelector(
      'thead input[type="checkbox"].checkbox',
    ) as HTMLInputElement
    const rowCheckboxes = c.querySelectorAll('tbody input[type="checkbox"].checkbox')
    expect(headerCheckbox).toBeTruthy()
    expect(rowCheckboxes.length).toBe(2)
  })

  it('paginates data when pagination provided', async () => {
    const c = document.createElement('div')
    const dataSource = [
      { key: '1', name: 'A' },
      { key: '2', name: 'B' },
      { key: '3', name: 'C' },
    ]
    const columns = [{ title: 'Name', dataIndex: 'name' }]
    mountTestApp(c, () =>
      render(
        <Table
          columns={columns}
          dataSource={dataSource}
          pagination={{ current: 1, pageSize: 1 }}
        />,
        c,
      ),
    )
    await waitTableRender()
    const tds = Array.from(c.querySelectorAll('tbody td')).map(el => el.textContent?.trim())
    const pager = c.querySelector('tfoot') as HTMLElement
    expect(tds).toEqual(['A'])
    expect(pager).toBeTruthy()
  })

  it('supports defaultSortOrder to sort data', async () => {
    const c = document.createElement('div')
    const dataSource = [
      { key: '1', name: 'B' },
      { key: '2', name: 'A' },
    ]
    const columns = [
      { title: 'Name', dataIndex: 'name', sorter: true, defaultSortOrder: 'ascend' as const },
    ]
    mountTestApp(c, () => render(<Table columns={columns} dataSource={dataSource} />, c))
    await waitTableRender()
    const tds = Array.from(c.querySelectorAll('tbody td')).map(el => el.textContent?.trim())
    expect(tds).toEqual(['A', 'B'])
  })

  it('emits compatible sorter payloads when clicking sortable headers', async () => {
    const c = mountContainer()
    const changes: any[] = []
    const dataSource = [
      { key: '1', name: 'B' },
      { key: '2', name: 'A' },
    ]
    const Demo = () => (
      <Table
        columns={[{ title: 'Name', dataIndex: 'name', sorter: true }]}
        dataSource={dataSource}
        onChange={(_pagination: any, _filters: any, sorter: any, extra: any) => {
          changes.push({ sorter, extra })
        }}
      />
    )
    resetActiveRuntime()
    mountTestApp(c, () => render(<Demo />, c))

    await waitForContent(() => {
      expect(c.querySelector('button[aria-label="sort-name"]')).toBeTruthy()
    })

    await click(c.querySelector('button[aria-label="sort-name"]'))

    await waitForContent(() => {
      expect(changes[changes.length - 1]?.sorter).toMatchObject({
        columnKey: 'name',
        field: 'name',
        order: 'ascend',
      })
      expect(changes[changes.length - 1]?.extra?.action).toBe('sort')
    })
  })

  it('updates rows when controlled sortOrder changes from header clicks', async () => {
    const c = mountContainer()
    const dataSource = [
      { key: '1', name: 'A', age: 28 },
      { key: '2', name: 'B', age: 42 },
    ]

    const Demo = () => {
      const sortOrder = ref<'ascend' | 'descend' | null>(null)
      const buildColumns = () => [
        { title: 'Name', dataIndex: 'name' },
        {
          key: 'age',
          title: 'Age',
          dataIndex: 'age',
          sorter: (a: any, b: any) => a.age - b.age,
          sortDirections: ['descend' as const, 'ascend' as const],
          sortOrder: sortOrder.value,
        },
      ]
      const columns = ref(buildColumns())

      return (
        <Table
          columns={columns.value}
          dataSource={dataSource}
          sortDirections={['descend', 'ascend']}
          onChange={(_pagination: any, _filters: any, sorter: any) => {
            sortOrder.value = sorter?.order ?? null
            columns.value = buildColumns()
          }}
        />
      )
    }

    resetActiveRuntime()
    mountTestApp(c, () => render(<Demo />, c))

    await waitForContent(() => {
      const names = Array.from(c.querySelectorAll('tbody tr td:first-child')).map(el =>
        el.textContent?.trim(),
      )
      expect(names).toEqual(['A', 'B'])
    })

    await click(c.querySelector('button[aria-label="sort-age"]'))

    await waitForContent(() => {
      const names = Array.from(c.querySelectorAll('tbody tr td:first-child')).map(el =>
        el.textContent?.trim(),
      )
      expect(names).toEqual(['B', 'A'])
    })

    await click(c.querySelector('button[aria-label="sort-age"]'))

    await waitForContent(() => {
      const names = Array.from(c.querySelectorAll('tbody tr td:first-child')).map(el =>
        el.textContent?.trim(),
      )
      expect(names).toEqual(['A', 'B'])
    })
  })

  it('renders expandable rows with defaultExpandAllRows', async () => {
    const c = document.createElement('div')
    const dataSource = [
      { key: '1', name: 'A' },
      { key: '2', name: 'B' },
    ]
    const columns = [{ title: 'Name', dataIndex: 'name' }]
    mountTestApp(c, () =>
      render(
        <Table
          columns={columns}
          dataSource={dataSource}
          expandable={{
            defaultExpandAllRows: true,
            expandedRowFormatter: (r: any) => `extra-${r.name}`,
          }}
        />,
        c,
      ),
    )
    await waitTableRender()
    const extras = Array.from(c.querySelectorAll('tbody tr td')).map(el => el.textContent || '')
    expect(extras.join(' ')).toContain('extra-A')
    expect(extras.join(' ')).toContain('extra-B')
  })

  it('filters data via filteredValue', async () => {
    const c = document.createElement('div')
    const dataSource = [
      { key: '1', name: 'A', job: 'Dev' },
      { key: '2', name: 'B', job: 'Ops' },
    ]
    const columns = [
      { title: 'Name', dataIndex: 'name', filteredValue: ['A'] },
      { title: 'Job', dataIndex: 'job' },
    ]
    mountTestApp(c, () => render(<Table columns={columns} dataSource={dataSource} />, c))
    await waitTableRender()
    const tds = Array.from(c.querySelectorAll('tbody td')).map(el => el.textContent?.trim())
    expect(tds).toEqual(['A', 'Dev'])
  })

  it('normalizes scalar filteredValue without crashing', async () => {
    const c = mountContainer()
    const dataSource = [
      { key: '1', name: 'John Brown' },
      { key: '2', name: 'Jim Green' },
    ]
    resetActiveRuntime()
    mountTestApp(c, () =>
      render(
        <Table
          columns={[
            {
              title: 'Name',
              dataIndex: 'name',
              filteredValue: 'Jim' as any,
              onFilter: (value: any, record: any) => record.name.includes(String(value)),
            },
          ]}
          dataSource={dataSource}
        />,
        c,
      ),
    )

    await waitForContent(() => {
      const names = Array.from(c.querySelectorAll('tbody td')).map(el => el.textContent?.trim())
      expect(names).toEqual(['Jim Green'])
    })
  })

  it('opens filter dropdown and applies built-in filters', async () => {
    const c = mountContainer()
    const changes: any[] = []
    const dataSource = [
      { key: '1', name: 'John Brown' },
      { key: '2', name: 'Jim Green' },
      { key: '3', name: 'Joe Black' },
    ]
    resetActiveRuntime()
    mountTestApp(c, () =>
      render(
        <Table
          columns={[
            {
              title: 'Name',
              dataIndex: 'name',
              filters: [{ text: 'Jim', value: 'Jim' }],
              onFilter: (value: any, record: any) => record.name.includes(String(value)),
            },
          ]}
          dataSource={dataSource}
          onChange={(_pagination: any, filters: any) => changes.push(filters)}
        />,
        c,
      ),
    )

    await waitForContent(() => {
      expect(c.querySelector('button[aria-label="filter-name"]')).toBeTruthy()
    })

    const filterButton = c.querySelector('button[aria-label="filter-name"]')
    await click(filterButton)

    await waitForContent(() => {
      expect(
        c
          .querySelector('button[aria-label="filter-name"]')
          ?.closest('.dropdown')
          ?.classList.contains('dropdown-open'),
      ).toBe(true)
    })

    await waitForContent(() => {
      expect(c.querySelector('input.checkbox-xs')).toBeTruthy()
      expect(c.querySelector('.btn-primary.btn-xs')).toBeTruthy()
    })

    const checkbox = c.querySelector('input.checkbox-xs') as HTMLInputElement
    checkbox.checked = true
    checkbox.dispatchEvent(new Event('change', { bubbles: true }))

    await click(c.querySelector('.btn-primary.btn-xs'))

    await waitForContent(() => {
      expect(changes[changes.length - 1]?.name).toEqual(['Jim'])
    })
  })

  it('supports data-driven filter presets', async () => {
    const c = mountContainer()
    const changes: any[] = []
    const dataSource = [
      { key: '1', name: 'John Brown' },
      { key: '2', name: 'Jim Green' },
      { key: '3', name: 'Joe Black' },
    ]
    resetActiveRuntime()
    mountTestApp(c, () =>
      render(
        <Table
          columns={[
            {
              title: 'Name',
              dataIndex: 'name',
              onFilter: (value: any, record: any) => record.name.includes(String(value)),
              filterPresets: [
                {
                  label: '只看 Jim',
                  values: ['Jim'],
                  className: 'choose-jim btn btn-ghost btn-xs',
                },
              ],
              filterConfirmClassName: 'confirm-filter',
            },
          ]}
          dataSource={dataSource}
          onChange={(_pagination: any, filters: any) => changes.push(filters)}
        />,
        c,
      ),
    )

    await waitForContent(() => {
      expect(c.querySelector('button[aria-label="filter-name"]')).toBeTruthy()
    })

    await click(c.querySelector('button[aria-label="filter-name"]'))

    await waitForContent(() => {
      expect(c.querySelector('.choose-jim')).toBeTruthy()
      expect(c.querySelector('.confirm-filter')).toBeTruthy()
    })

    await click(c.querySelector('.choose-jim'))
    await click(c.querySelector('.confirm-filter'))

    await waitForContent(() => {
      expect(changes[changes.length - 1]?.name).toEqual(['Jim'])
    })
  })

  it('combines multiple filters with AND when filterCombine=and', async () => {
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
    mountTestApp(c, () => render(<Table columns={columns} dataSource={dataSource} />, c))
    await waitTableRender()
    const ages = Array.from(c.querySelectorAll('tbody td')).map(el => Number(el.textContent || 0))
    expect(ages).toEqual([42, 40])
  })

  it('supports ant design style multiple sorter priority in controlled mode', async () => {
    const c = mountContainer()
    const dataSource = [
      { key: '1', name: 'A', chinese: 98, math: 90 },
      { key: '2', name: 'B', chinese: 98, math: 60 },
      { key: '3', name: 'C', chinese: 88, math: 99 },
    ]
    const columns = [
      { title: 'Name', dataIndex: 'name' },
      {
        title: 'Chinese',
        dataIndex: 'chinese',
        sortOrder: 'ascend' as const,
        sorter: {
          compare: (a: any, b: any) => a.chinese - b.chinese,
          multiple: 2,
        },
      },
      {
        title: 'Math',
        dataIndex: 'math',
        sortOrder: 'ascend' as const,
        sorter: {
          compare: (a: any, b: any) => a.math - b.math,
          multiple: 1,
        },
      },
    ]
    resetActiveRuntime()
    mountTestApp(c, () => render(<Table columns={columns} dataSource={dataSource} />, c))

    await waitForContent(() => {
      const names = Array.from(c.querySelectorAll('tbody tr td:first-child')).map(el =>
        el.textContent?.trim(),
      )
      expect(names).toEqual(['C', 'B', 'A'])
    })
  })

  it('supports hidden columns', async () => {
    const c = document.createElement('div')
    const dataSource = [{ key: '1', name: 'A', job: 'Dev' }]
    const columns = [
      { title: 'Name', dataIndex: 'name' },
      { title: 'Job', dataIndex: 'job', hidden: true },
    ]
    mountTestApp(c, () => render(<Table columns={columns} dataSource={dataSource} />, c))
    await waitTableRender()
    const ths = Array.from(c.querySelectorAll('thead th')).map(el => el.textContent?.trim())
    const tds = Array.from(c.querySelectorAll('tbody td')).map(el => el.textContent?.trim())
    expect(ths).toEqual(['Name'])
    expect(tds).toEqual(['A'])
  })

  it('updates hidden columns when columns prop changes', async () => {
    const c = mountContainer()
    const dataSource = [{ key: '1', name: 'A', job: 'Dev' }]

    const Demo = () => {
      const columns = ref([
        { title: 'Name', dataIndex: 'name' },
        { title: 'Job', dataIndex: 'job', hidden: false },
      ])

      return (
        <div>
          <button
            type="button"
            onClick={() => {
              columns.value = [
                { title: 'Name', dataIndex: 'name' },
                { title: 'Job', dataIndex: 'job', hidden: true },
              ]
            }}
          >
            toggle
          </button>
          <Table columns={columns.value} dataSource={dataSource} />
        </div>
      )
    }

    resetActiveRuntime()
    mountTestApp(c, () => render(<Demo />, c))

    await waitForContent(() => {
      const ths = Array.from(c.querySelectorAll('thead th')).map(el => el.textContent?.trim())
      expect(ths).toEqual(['Name', 'Job'])
    })

    await click(c.querySelector('button'))

    await waitForContent(() => {
      const ths = Array.from(c.querySelectorAll('thead th')).map(el => el.textContent?.trim())
      const tds = Array.from(c.querySelectorAll('tbody td')).map(el => el.textContent?.trim())
      expect(ths).toEqual(['Name'])
      expect(tds).toEqual(['A'])
    })
  })

  it('updates hidden child columns in grouped headers when columns prop changes', async () => {
    const c = mountContainer()
    const dataSource = [{ key: '1', name: 'A', score: 90, salary: 100 }]
    const buildColumns = (showSalary: boolean) => [
      {
        title: 'Member',
        children: [{ title: 'Name', dataIndex: 'name' }],
      },
      {
        title: 'Comp',
        children: [
          { title: 'Score', dataIndex: 'score' },
          { title: 'Salary', dataIndex: 'salary', hidden: !showSalary },
        ],
      },
    ]

    const Demo = () => {
      const showSalary = ref(true)
      const columns = ref(buildColumns(showSalary.value))

      return (
        <div>
          <button
            type="button"
            onClick={() => {
              showSalary.value = !showSalary.value
              columns.value = buildColumns(showSalary.value)
            }}
          >
            toggle
          </button>
          <Table columns={columns.value} dataSource={dataSource} />
        </div>
      )
    }

    resetActiveRuntime()
    mountTestApp(c, () => render(<Demo />, c))

    await waitForContent(() => {
      const ths = Array.from(c.querySelectorAll('thead th')).map(el => el.textContent?.trim())
      const tds = Array.from(c.querySelectorAll('tbody td')).map(el => el.textContent?.trim())
      expect(ths).toEqual(['Member', 'Comp', 'Name', 'Score', 'Salary'])
      expect(tds).toEqual(['A', '90', '100'])
    })

    await click(c.querySelector('button'))

    await waitForContent(() => {
      const ths = Array.from(c.querySelectorAll('thead th')).map(el => el.textContent?.trim())
      const tds = Array.from(c.querySelectorAll('tbody td')).map(el => el.textContent?.trim())
      expect(ths).toEqual(['Member', 'Comp', 'Name', 'Score'])
      expect(tds).toEqual(['A', '90'])
    })

    await click(c.querySelector('button'))

    await waitForContent(() => {
      const ths = Array.from(c.querySelectorAll('thead th')).map(el => el.textContent?.trim())
      const tds = Array.from(c.querySelectorAll('tbody td')).map(el => el.textContent?.trim())
      expect(ths).toEqual(['Member', 'Comp', 'Name', 'Score', 'Salary'])
      expect(tds).toEqual(['A', '90', '100'])
    })
  })

  it('renders summary and pagination in tfoot', async () => {
    const c = document.createElement('div')
    const dataSource = [
      { key: '1', name: 'A' },
      { key: '2', name: 'B' },
    ]
    const columns = [{ title: 'Name', dataIndex: 'name' }]
    const summary = (rows: any[]) => `Total: ${rows.length}`
    mountTestApp(c, () =>
      render(
        <Table
          columns={columns}
          dataSource={dataSource}
          pagination={{ current: 1, pageSize: 1 }}
          summary={summary}
        />,
        c,
      ),
    )
    await waitTableRender()
    const foot = c.querySelector('tfoot') as HTMLElement
    expect(foot).toBeTruthy()
    expect(foot.textContent || '').toContain('Total: 1')
  })

  it('renders emptyText when page has no data', async () => {
    const c = document.createElement('div')
    const dataSource: any[] = []
    const columns = [{ title: 'Name', dataIndex: 'name' }]
    mountTestApp(c, () =>
      render(<Table columns={columns} dataSource={dataSource} emptyText={'Empty'} />, c),
    )
    await waitTableRender()
    const tbody = c.querySelector('tbody') as HTMLElement
    expect(tbody.textContent || '').toContain('Empty')
  })

  it('fires onRow event handlers', async () => {
    const c = document.createElement('div')
    const spy = { count: 0 }
    const dataSource = [{ key: '1', name: 'A' }]
    const columns = [{ title: 'Name', dataIndex: 'name' }]
    mountTestApp(c, () =>
      render(
        <Table
          columns={columns}
          dataSource={dataSource}
          onRow={() => ({ onClick: () => (spy.count += 1) })}
        />,
        c,
      ),
    )
    await waitTableRender()
    const tr = c.querySelector('tbody tr') as HTMLElement
    tr.click()
    expect(spy.count).toBe(1)
  })

  it('supports wrapper scroll and onScroll callback', async () => {
    const c = document.createElement('div')
    const dataSource = Array.from({ length: 5 }).map((_, i) => ({
      key: String(i + 1),
      name: String(i + 1),
    }))
    const columns = [{ title: 'Name', dataIndex: 'name' }]
    let called = 0
    mountTestApp(c, () =>
      render(
        <Table
          columns={columns}
          dataSource={dataSource}
          scroll={{ y: 100 }}
          onScroll={() => (called += 1)}
        />,
        c,
      ),
    )
    await waitTableRender()
    const table = c.querySelector('table.table') as HTMLElement
    const wrapper = table.parentElement as HTMLElement
    wrapper.dispatchEvent(new Event('scroll'))
    expect(called).toBeGreaterThan(0)
  })

  it('renders with horizontal scroll without crashing when no styles are provided', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    mountTestApp(c, () =>
      render(
        <Table
          columns={[
            { title: 'Name', dataIndex: 'name', width: 120 },
            { title: 'Address', dataIndex: 'address', width: 240 },
          ]}
          dataSource={[{ key: '1', name: 'A', address: 'Hangzhou West Lake Road No. 1' }]}
          scroll={{ x: true }}
        />,
        c,
      ),
    )

    await waitForContent(() => {
      const table = c.querySelector('table.table') as HTMLElement | null
      expect(table).toBeTruthy()
      expect((table as HTMLElement).style.minWidth).toBe('100%')
    })
  })

  it('renders title and footer content', async () => {
    const c = mountContainer()
    const dataSource = [{ key: '1', name: 'A' }]
    const columns = [{ title: 'Name', dataIndex: 'name' }]
    resetActiveRuntime()
    mountTestApp(c, () =>
      render(
        <Table
          columns={columns}
          dataSource={dataSource}
          scroll={{ x: true }}
          titleFormatter={() => 'CustomTitle'}
          footerFormatter={() => 'CustomFooter'}
        />,
        c,
      ),
    )
    await waitForContent(() => {
      expect(c.querySelector('table.table')).toBeTruthy()
    })
    const wrapper = (c.querySelector('table.table') as HTMLElement).parentElement as HTMLElement
    expect(wrapper.textContent || '').toContain('CustomTitle')
    expect(wrapper.textContent || '').toContain('CustomFooter')
  })

  it('applies hover class when rowHoverable with custom rowHoverClass', async () => {
    const c = document.createElement('div')
    const dataSource = [{ key: '1', name: 'A' }]
    const columns = [{ title: 'Name', dataIndex: 'name' }]
    mountTestApp(c, () =>
      render(
        <Table
          columns={columns}
          dataSource={dataSource}
          rowHoverable={true}
          rowHoverClass={'hover:bg-red-200'}
        />,
        c,
      ),
    )
    await waitTableRender()
    const tr = c.querySelector('tbody tr') as HTMLElement
    expect(tr.classList.contains('hover:bg-red-200')).toBe(true)
  })

  it('supports bordered, loading, locale text, and common size aliases', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    mountTestApp(c, () =>
      render(
        <Table
          size={'small' as any}
          bordered
          loading
          locale={{
            emptyText: '暂无数据',
            filterConfirm: '确认筛选',
            filterReset: '清空筛选',
            triggerAsc: '切换为升序',
            triggerDesc: '切换为降序',
            cancelSort: '取消排序',
          }}
          columns={[
            {
              title: 'Name',
              dataIndex: 'name',
              sorter: true,
              filters: [{ text: 'Jim', value: 'Jim' }],
            },
          ]}
          dataSource={[]}
        />,
        c,
      ),
    )

    await waitForContent(() => {
      const table = c.querySelector('table.table') as HTMLElement
      expect(table.classList.contains('table-sm')).toBe(true)
      expect(table.className).toContain('border-separate')
      expect(c.textContent || '').toContain('暂无数据')
      expect(c.querySelector('.loading.loading-spinner')).toBeTruthy()
      expect((c.querySelector('button[aria-label="sort-name"]') as HTMLElement).title).toContain(
        '切换为升序',
      )
    })

    await click(c.querySelector('button[aria-label="filter-name"]'))

    await waitForContent(() => {
      expect(c.textContent || '').toContain('确认筛选')
      expect(c.textContent || '').toContain('清空筛选')
    })
  })

  it('supports selection labels, checkbox props and selection classes', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    mountTestApp(c, () =>
      render(
        <Table
          columns={[{ title: 'Name', dataIndex: 'name' }]}
          dataSource={[{ key: '1', name: 'John Brown' }]}
          rowSelection={{
            getTitleCheckboxProps: () => ({ disabled: true, 'data-testid': 'title-checkbox' }),
            columnTitle: '批量选择',
            titleClassName: 'selection-title',
            cellClassName: 'custom-selection-cell',
            cellLabelFormatter: (_checked: boolean, record: any) => record.name,
          }}
        />,
        c,
      ),
    )

    await waitForContent(() => {
      const titleCheckbox = c.querySelector('[data-testid="title-checkbox"]') as HTMLInputElement
      expect(titleCheckbox).toBeTruthy()
      expect(titleCheckbox.disabled).toBe(true)
      expect(c.querySelector('.selection-title')?.textContent || '').toContain('批量选择')
      expect(c.querySelector('.custom-selection-cell')?.textContent || '').toContain('John Brown')
      expect(c.querySelector('.custom-selection-cell')?.getAttribute('data-checked')).toBe('false')
    })
  })

  it('supports tree data via childrenColumnName, indentSize, and custom expand labels', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    mountTestApp(c, () =>
      render(
        <Table
          columns={[{ title: 'Name', dataIndex: 'name' }]}
          dataSource={[
            {
              key: '1',
              name: 'Parent',
              nodes: [{ key: '1-1', name: 'Child' }],
            },
          ]}
          expandable={{
            childrenColumnName: 'nodes',
            defaultExpandedRowKeys: ['1'],
            indentSize: 24,
            showExpandColumn: false,
            expandButtonClassName: 'tree-expand-icon',
            expandLabelFormatter: (expanded: boolean) => (expanded ? '收起' : '展开'),
          }}
        />,
        c,
      ),
    )

    await waitForContent(() => {
      const bodyText = c.querySelector('tbody')?.textContent || ''
      expect(bodyText).toContain('Parent')
      expect(bodyText).toContain('Child')
      expect(c.querySelector('.tree-expand-icon')?.textContent).toContain('收起')
      const childCell = c.querySelector('[data-rue-table-indent="1"]') as HTMLElement
      expect(childCell).toBeTruthy()
      expect(childCell.style.paddingLeft).toBe('24px')
    })
  })

  it('supports pagination placement and sorter tooltip config', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    mountTestApp(c, () =>
      render(
        <Table
          columns={[
            {
              title: 'Name',
              dataIndex: 'name',
              sorter: true,
              showSorterTooltip: { target: 'sorter-icon' },
            },
          ]}
          dataSource={[
            { key: '1', name: 'A' },
            { key: '2', name: 'B' },
          ]}
          locale={{ triggerAsc: '下一次升序', triggerDesc: '下一次降序', cancelSort: '清除排序' }}
          pagination={{ current: 1, pageSize: 1, placement: ['topStart', 'bottomCenter'] }}
        />,
        c,
      ),
    )

    await waitForContent(() => {
      const pagers = Array.from(c.querySelectorAll('[data-rue-table-pager]')) as HTMLElement[]
      expect(pagers).toHaveLength(2)
      expect(pagers[0].className).toContain('justify-start')
      expect(pagers[1].className).toContain('justify-center')
      expect((c.querySelector('button[aria-label="sort-name"]') as HTMLElement).title).toContain(
        '下一次升序',
      )
    })
  })
})
