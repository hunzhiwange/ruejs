import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { Template, render, setReactiveScheduling } from '@rue-js/rue'
import Tooltip from '../index'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Tooltip', () => {
  it('renders string title with mapped placement and children', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Tooltip title="hello" placement="topLeft" className="inline-block" data-testid="tooltip">
          <button className="btn">Hover me</button>
        </Tooltip>,
        container,
      ),
    )

    await waitForContent(() => {
      const tooltip = container.querySelector('[data-testid="tooltip"]') as HTMLElement
      expect(tooltip.classList.contains('tooltip')).toBe(true)
      expect(tooltip.classList.contains('tooltip-top')).toBe(true)
      expect(tooltip.classList.contains('inline-block')).toBe(true)
      expect(tooltip.getAttribute('data-tip')).toBe('hello')
      expect(tooltip.textContent).toContain('Hover me')
    })
  })

  it('renders custom content node with semantic styling and custom color', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Tooltip
          color="#123456"
          open={true}
          overlayClassName="max-w-48"
          overlayStyle={{ letterSpacing: '0.08em' }}
          data-testid="tooltip"
        >
          <Template slot="content">
            <span className="font-semibold">Advanced</span>
          </Template>
          <button className="btn">Open</button>
        </Tooltip>,
        container,
      ),
    )

    await waitForContent(() => {
      const tooltip = container.querySelector('[data-testid="tooltip"]') as HTMLElement
      expect(tooltip.classList.contains('tooltip-open')).toBe(true)
      expect(tooltip.getAttribute('data-tip')).toBeNull()
      const content = container.querySelector('.tooltip-content') as HTMLElement
      expect(content.classList.contains('max-w-48')).toBe(true)
      expect(content.style.backgroundColor).toBe('rgb(18, 52, 86)')
      expect(content.style.letterSpacing).toBe('0.08em')
      expect(content.textContent).toContain('Advanced')
    })
  })

  it('supports click trigger and onOpenChange callback', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const openStates: boolean[] = []

    mountTestApp(container, () =>
      render(
        <Tooltip
          title="Toggle me"
          trigger="click"
          onOpenChange={nextOpen => openStates.push(nextOpen)}
          data-testid="tooltip"
        >
          <button data-testid="tooltip-trigger">Click</button>
        </Tooltip>,
        container,
      ),
    )

    await waitForContent(() => {
      const tooltip = container.querySelector('[data-testid="tooltip"]') as HTMLElement
      expect(tooltip.classList.contains('tooltip-open')).toBe(false)
      expect(tooltip.className.includes('before:!opacity-0')).toBe(true)
    })

    const tooltip = container.querySelector('[data-testid="tooltip"]') as HTMLElement
    tooltip.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      const tooltip = container.querySelector('[data-testid="tooltip"]') as HTMLElement
      expect(tooltip.classList.contains('tooltip-open')).toBe(true)
    })

    tooltip.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      const tooltip = container.querySelector('[data-testid="tooltip"]') as HTMLElement
      expect(tooltip.classList.contains('tooltip-open')).toBe(false)
      expect(openStates).toEqual([true, false])
    })
  })

  it('renders tooltip-content subcomponent', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Tooltip data-testid="tooltip">
          <Tooltip.Content className="text-xs" data-testid="tooltip-content">
            Wow!
          </Tooltip.Content>
          <button>Hover</button>
        </Tooltip>,
        container,
      ),
    )

    await waitForContent(() => {
      const content = container.querySelector('[data-testid="tooltip-content"]') as HTMLElement
      expect(content.classList.contains('tooltip-content')).toBe(true)
      expect(content.classList.contains('text-xs')).toBe(true)
      expect(content.textContent).toContain('Wow!')
    })
  })
})
