import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { ref, render, setReactiveScheduling } from '@rue-js/rue'
import Pagination from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Pagination', () => {
  it('renders the root and item components with base classes', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Pagination className="mb-4" data-testid="pagination-root">
          <Pagination.Item>1</Pagination.Item>
          <Pagination.Item>2</Pagination.Item>
        </Pagination>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="pagination-root"]') as HTMLElement
      const items = root.querySelectorAll('.join-item.btn')
      expect(root.classList.contains('join')).toBe(true)
      expect(root.classList.contains('mb-4')).toBe(true)
      expect(items.length).toBe(2)
      expect(root.textContent).toContain('1')
      expect(root.textContent).toContain('2')
    })
  })

  it('supports vertical direction and active or disabled item semantics', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Pagination direction="vertical" data-testid="pagination-vertical">
          <Pagination.Item tag="a" href="#prev" data-testid="pagination-link">
            Prev
          </Pagination.Item>
          <Pagination.Item active data-testid="pagination-current">
            2
          </Pagination.Item>
          <Pagination.Item disabled data-testid="pagination-disabled">
            Next
          </Pagination.Item>
        </Pagination>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="pagination-vertical"]') as HTMLElement
      const link = container.querySelector('[data-testid="pagination-link"]') as HTMLAnchorElement
      const current = container.querySelector('[data-testid="pagination-current"]') as HTMLElement
      const disabled = container.querySelector(
        '[data-testid="pagination-disabled"]',
      ) as HTMLButtonElement
      expect(root.classList.contains('join-vertical')).toBe(true)
      expect(link.tagName.toLowerCase()).toBe('a')
      expect(link.classList.contains('join-item')).toBe(true)
      expect(current.classList.contains('btn-active')).toBe(true)
      expect(current.classList.contains('bg-base-300')).toBe(true)
      expect(disabled.classList.contains('btn-disabled')).toBe(true)
      expect(disabled.disabled).toBe(true)
    })
  })

  it('updates data-driven pagination when controlled props change', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    const ControlledPagination = () => {
      const current = ref(2)
      return (
        <Pagination current={current.value} total={120} onChange={page => (current.value = page)} />
      )
    }

    mountTestApp(container, () => render(<ControlledPagination />, container))

    await waitForContent(() => {
      expect(
        container.querySelector('[aria-label="Page 2"]')?.classList.contains('btn-active'),
      ).toBe(true)
    })

    ;(container.querySelector('[aria-label="Page 4"]') as HTMLButtonElement).click()

    await waitForContent(() => {
      expect(
        container.querySelector('[aria-label="Page 2"]')?.classList.contains('btn-active'),
      ).toBe(false)
      expect(
        container.querySelector('[aria-label="Page 4"]')?.classList.contains('btn-active'),
      ).toBe(true)
      expect(
        container.querySelector('[aria-label="Page 4"]')?.classList.contains('bg-base-300'),
      ).toBe(true)
    })
  })

  it('keeps the simple input synchronized with controlled page changes', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    const ControlledSimplePagination = () => {
      const current = ref(2)
      return (
        <Pagination
          simple
          current={current.value}
          total={50}
          onChange={page => (current.value = page)}
        />
      )
    }

    mountTestApp(container, () => render(<ControlledSimplePagination />, container))

    const input = container.querySelector('input[inputmode="numeric"]') as HTMLInputElement
    const next = container.querySelector('button[title="Next Page"]') as HTMLButtonElement
    expect(input.value).toBe('2')

    next.click()

    await waitForContent(() => {
      expect(
        (container.querySelector('input[inputmode="numeric"]') as HTMLInputElement).value,
      ).toBe('3')
    })
  })

  it('synchronizes controlled page size and quick-jumper interactions', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    const AdvancedPagination = () => {
      const current = ref(3)
      const pageSize = ref(20)
      return (
        <Pagination
          current={current.value}
          pageSize={pageSize.value}
          total={120}
          showSizeChanger
          pageSizeOptions={[10, 20, 50]}
          showQuickJumper={{ goButton: 'Go' }}
          showTotal={(_total, range) => `${range[0]}-${range[1]}`}
          onChange={(page, nextPageSize) => {
            current.value = page
            pageSize.value = nextPageSize
          }}
          onShowSizeChange={(page, nextPageSize) => {
            current.value = page
            pageSize.value = nextPageSize
          }}
        />
      )
    }

    mountTestApp(container, () => render(<AdvancedPagination />, container))

    const select = container.querySelector('select') as HTMLSelectElement
    expect(select.value).toBe('20')

    select.value = '50'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    await waitForContent(() => {
      expect((container.querySelector('select') as HTMLSelectElement).value).toBe('50')
      expect(container.textContent).toContain('101-120')
    })

    const input = container.querySelector('input[inputmode="numeric"]') as HTMLInputElement
    input.value = '2'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    ;(container.querySelector('button:not(.join-item)') as HTMLButtonElement).click()

    await waitForContent(() => {
      expect(container.textContent).toContain('51-100')
      expect(
        (container.querySelector('input[inputmode="numeric"]') as HTMLInputElement).value,
      ).toBe('2')
    })
  })

  it('renders custom pagination items as live JSX and preserves navigation', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    const CustomPagination = () => {
      const current = ref(2)
      return (
        <Pagination
          current={current.value}
          total={50}
          onChange={page => (current.value = page)}
          itemRender={(_page, type, original) => {
            if (type === 'prev') return <span className="custom-prev">Previous</span>
            if (type === 'next') return <span className="custom-next">Next</span>
            return original
          }}
        />
      )
    }

    mountTestApp(container, () => render(<CustomPagination />, container))

    await waitForContent(() => {
      expect(container.querySelector('button[title="Previous Page"]')?.textContent).toBe('Previous')
      expect(container.querySelector('button[title="Next Page"]')?.textContent).toBe('Next')
    })

    ;(container.querySelector('button[title="Next Page"]') as HTMLButtonElement).click()
    await waitForContent(() => {
      expect(
        container.querySelector('[aria-label="Page 3"]')?.classList.contains('btn-active'),
      ).toBe(true)
    })
  })
})
