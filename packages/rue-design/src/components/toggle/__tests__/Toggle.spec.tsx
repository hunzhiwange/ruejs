import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import Toggle from '../index'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Toggle', () => {
  it('renders the base toggle input and preserves native input value semantics', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Toggle
          className="border-base-300"
          checked={true}
          name="notifications"
          value="newsletter"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const input = container.querySelector('input.toggle') as HTMLInputElement
      expect(input).toBeTruthy()
      expect(input.type).toBe('checkbox')
      expect(input.checked).toBe(true)
      expect(input.name).toBe('notifications')
      expect(input.value).toBe('newsletter')
      expect(input.classList.contains('border-base-300')).toBe(true)
    })
  })

  it('supports checked aliases, size aliases and state content wrappers', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Toggle
          color="primary"
          size="small"
          value={true}
          checkedChildren="在线"
          unCheckedChildren="离线"
        >
          通知状态
        </Toggle>,
        container,
      ),
    )

    await waitForContent(() => {
      const input = container.querySelector('input.toggle') as HTMLInputElement
      expect(input.classList.contains('toggle-primary')).toBe(true)
      expect(input.classList.contains('toggle-sm')).toBe(true)
      expect(input.checked).toBe(true)
      expect(container.textContent).toContain('通知状态')
      expect(container.textContent).toContain('在线')
    })
  })

  it('emits semantic callbacks for click and change', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()
    const handleCheckedChange = vi.fn()
    const handleClick = vi.fn()

    mountTestApp(container, () =>
      render(
        <Toggle
          data-testid="theme-toggle"
          onChange={handleChange}
          onCheckedChange={handleCheckedChange}
          onClick={handleClick}
          checkedChildren="开启"
          unCheckedChildren="关闭"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const input = container.querySelector('[data-testid="theme-toggle"]') as HTMLInputElement
      expect(input.checked).toBe(false)
      expect(container.textContent).toContain('关闭')
    })

    const input = container.querySelector('[data-testid="theme-toggle"]') as HTMLInputElement
    input.click()

    await waitForContent(() => {
      expect(handleClick).toHaveBeenCalledTimes(1)
      expect(handleClick).toHaveBeenCalledWith(true, expect.any(MouseEvent))
      expect(handleChange).toHaveBeenCalledTimes(1)
      expect(handleChange).toHaveBeenCalledWith(true, expect.any(Event))
      expect(handleCheckedChange).toHaveBeenCalledWith(true, expect.any(Event))
      expect(container.textContent).toContain('开启')
    })
  })

  it('shows loading state as disabled switch with indicator', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Toggle
          loading={true}
          defaultValue={true}
          checkedChildren="同步中"
          unCheckedChildren="待同步"
        >
          自动同步
        </Toggle>,
        container,
      ),
    )

    await waitForContent(() => {
      const input = container.querySelector('input.toggle') as HTMLInputElement
      const indicator = container.querySelector('.loading.loading-spinner') as HTMLSpanElement
      expect(input.disabled).toBe(true)
      expect(input.getAttribute('aria-busy')).toBe('true')
      expect(indicator).toBeTruthy()
      expect(container.textContent).toContain('自动同步')
      expect(container.textContent).toContain('同步中')
    })
  })
})
