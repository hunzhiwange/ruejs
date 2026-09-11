import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
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
      expect(disabled.classList.contains('btn-disabled')).toBe(true)
      expect(disabled.disabled).toBe(true)
    })
  })
})
