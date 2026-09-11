import { Template } from '@rue-js/rue'
import { mountTestApp, disposeTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { onError, ref, render, setReactiveScheduling } from '@rue-js/rue'
import AutoComplete from '../index'
import {
  click,
  mountContainer,
  waitForContent,
} from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const mountedContainers: HTMLDivElement[] = []

const mountTestContainer = () => {
  const container = mountContainer()
  mountedContainers.push(container)
  return container
}

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active =
    (globalThis as any).__rue_vapor_preferred ?? (globalThis as any).__rue
}

afterEach(() => {
  for (const container of mountedContainers) {
    disposeTestApp(container)
  }
  mountedContainers.length = 0
  document.body.innerHTML = ''
})

describe('AutoComplete', () => {
  it('filters options and selects the highlighted item with Enter', async () => {
    const container = mountTestContainer()
    const handleSelect = vi.fn()
    const reportedErrors: unknown[] = []
    resetActiveRuntime()
    const stopListening = onError((error: unknown) => {
      reportedErrors.push(error)
    })

    const ControlledCase = () => {
      const value = ref('')

      return (
        <AutoComplete
          data-testid="auto-complete-input"
          value={value.value}
          options={[
            { value: 'useComponent', description: 'Lazy route loader' },
            { value: 'useRoute', description: 'Current route accessor' },
            { value: 'render', description: 'Manual mount entry' },
          ]}
          onChange={text => {
            value.value = text
          }}
          onSelect={handleSelect}
        />
      )
    }

    mountTestApp(container, () => render(<ControlledCase />, container))

    await waitForContent(() => {
      expect(reportedErrors).toHaveLength(0)
      expect(container.querySelector('[data-testid="auto-complete-input"]')).toBeTruthy()
    })

    const input = container.querySelector('[data-testid="auto-complete-input"]') as HTMLInputElement
    input.focus()
    input.value = 'useR'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      const optionNodes = container.querySelectorAll('[role="option"]')
      expect(optionNodes).toHaveLength(1)
      expect(optionNodes[0]?.textContent).toContain('useRoute')
    })

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

    await waitForContent(() => {
      const settledInput = container.querySelector(
        '[data-testid="auto-complete-input"]',
      ) as HTMLInputElement | null
      expect(settledInput?.value).toBe('useRoute')
    })

    expect(handleSelect).toHaveBeenCalledTimes(1)
    expect(handleSelect).toHaveBeenCalledWith(
      'useRoute',
      expect.objectContaining({ value: 'useRoute' }),
    )

    stopListening?.()
  })

  it('supports keyboard backfill preview and allowClear', async () => {
    const container = mountTestContainer()
    const handleClear = vi.fn()
    const reportedErrors: unknown[] = []
    resetActiveRuntime()
    const stopListening = onError((error: unknown) => {
      reportedErrors.push(error)
    })

    const ControlledCase = () => {
      const value = ref('')

      return (
        <AutoComplete
          data-testid="auto-complete-backfill"
          value={value.value}
          options={[
            { value: 'rue runtime', title: 'Rue Runtime' },
            { value: 'rue router', title: 'Rue Router' },
          ]}
          allowClear
          backfill
          onChange={text => {
            value.value = text
          }}
          onClear={handleClear}
        />
      )
    }

    mountTestApp(container, () => render(<ControlledCase />, container))

    await waitForContent(() => {
      expect(reportedErrors).toHaveLength(0)
      expect(container.querySelector('[data-testid="auto-complete-backfill"]')).toBeTruthy()
    })

    const input = container.querySelector(
      '[data-testid="auto-complete-backfill"]',
    ) as HTMLInputElement
    input.focus()
    input.value = 'rue'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      expect(container.querySelectorAll('[role="option"]')).toHaveLength(2)
    })

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))

    await waitForContent(() => {
      const settledInput = container.querySelector(
        '[data-testid="auto-complete-backfill"]',
      ) as HTMLInputElement | null
      expect(settledInput?.value).toBe('rue router')
    })

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    await waitForContent(() => {
      const settledInput = container.querySelector(
        '[data-testid="auto-complete-backfill"]',
      ) as HTMLInputElement | null
      expect(settledInput?.value).toBe('rue')
    })

    const clearButton = container.querySelector(
      'button[aria-label="Clear text"]',
    ) as HTMLButtonElement
    clearButton.click()

    await waitForContent(() => {
      const settledInput = container.querySelector(
        '[data-testid="auto-complete-backfill"]',
      ) as HTMLInputElement | null
      expect(settledInput?.value).toBe('')
    })

    expect(handleClear).toHaveBeenCalledTimes(1)

    stopListening?.()
  })

  it('opens suggestions on control click when open state is controlled externally', async () => {
    const container = mountTestContainer()
    const reportedErrors: unknown[] = []
    const handleOpenChange = vi.fn()
    resetActiveRuntime()
    const stopListening = onError((error: unknown) => {
      reportedErrors.push(error)
    })

    const ControlledCase = () => {
      const value = ref('')
      const open = ref(false)

      return (
        <AutoComplete
          data-testid="auto-complete-controlled-open"
          value={value.value}
          open={open.value}
          options={[
            { value: 'runtime/useComponent', title: 'useComponent lazy route' },
            { value: 'docs/routing', title: 'Routing guide' },
          ]}
          filterOption={false}
          onChange={text => {
            value.value = text
          }}
          onOpenChange={nextOpen => {
            open.value = nextOpen
            handleOpenChange(nextOpen)
          }}
        />
      )
    }

    mountTestApp(container, () => render(<ControlledCase />, container))

    await waitForContent(() => {
      expect(reportedErrors).toHaveLength(0)
      expect(container.querySelector('[data-testid="auto-complete-controlled-open"]')).toBeTruthy()
    })

    const control = container.querySelector(
      '[data-rue-auto-complete-control="true"]',
    ) as HTMLLabelElement

    await click(control)

    await waitForContent(() => {
      const currentInput = container.querySelector(
        '[data-testid="auto-complete-controlled-open"]',
      ) as HTMLInputElement | null
      expect(handleOpenChange).toHaveBeenCalledWith(true)
      expect(currentInput?.getAttribute('aria-expanded')).toBe('true')
      expect(container.querySelectorAll('[role="option"]')).toHaveLength(2)
    })

    stopListening?.()
  })

  it('moves from the current selection with arrow keys and confirms with Enter', async () => {
    const container = mountTestContainer()
    const handleSelect = vi.fn()
    const reportedErrors: unknown[] = []
    resetActiveRuntime()
    const stopListening = onError((error: unknown) => {
      reportedErrors.push(error)
    })

    const ControlledCase = () => {
      const value = ref('')

      return (
        <AutoComplete
          data-testid="auto-complete-selected-navigation"
          value={value.value}
          options={[
            { value: 'runtime/render', title: 'render entry bridge' },
            { value: 'runtime/watch', title: 'watch effect tracing' },
          ]}
          filterOption={false}
          backfill
          optionLabelProp="title"
          onChange={text => {
            value.value = text
          }}
          onSelect={handleSelect}
        />
      )
    }

    mountTestApp(container, () => render(<ControlledCase />, container))

    await waitForContent(() => {
      expect(reportedErrors).toHaveLength(0)
      expect(
        container.querySelector('[data-testid="auto-complete-selected-navigation"]'),
      ).toBeTruthy()
    })

    const input = container.querySelector(
      '[data-testid="auto-complete-selected-navigation"]',
    ) as HTMLInputElement
    const control = container.querySelector(
      '[data-rue-auto-complete-control="true"]',
    ) as HTMLLabelElement

    await click(control)

    await waitForContent(() => {
      expect(container.querySelectorAll('[role="option"]')).toHaveLength(2)
    })

    const firstOption = container.querySelectorAll('[role="option"]')[0] as HTMLButtonElement
    firstOption.click()

    await waitForContent(() => {
      expect(input.value).toBe('render entry bridge')
      expect(handleSelect).toHaveBeenCalledWith(
        'runtime/render',
        expect.objectContaining({ value: 'runtime/render' }),
      )
    })

    const currentInput = container.querySelector(
      '[data-testid="auto-complete-selected-navigation"]',
    ) as HTMLInputElement

    currentInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))

    await waitForContent(() => {
      const settledInput = container.querySelector(
        '[data-testid="auto-complete-selected-navigation"]',
      ) as HTMLInputElement | null
      expect(settledInput?.value).toBe('watch effect tracing')
    })

    const previewInput = container.querySelector(
      '[data-testid="auto-complete-selected-navigation"]',
    ) as HTMLInputElement

    previewInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

    await waitForContent(() => {
      const settledInput = container.querySelector(
        '[data-testid="auto-complete-selected-navigation"]',
      ) as HTMLInputElement | null
      expect(settledInput?.value).toBe('watch effect tracing')
      expect(handleSelect).toHaveBeenLastCalledWith(
        'runtime/watch',
        expect.objectContaining({ value: 'runtime/watch' }),
      )
    })

    stopListening?.()
  })

  it('preserves focus after the first character in grouped popupRender mode', async () => {
    const container = mountTestContainer()
    const reportedErrors: unknown[] = []
    resetActiveRuntime()
    const stopListening = onError((error: unknown) => {
      reportedErrors.push(error)
    })

    const ControlledCase = () => {
      const value = ref('')

      return (
        <AutoComplete
          data-testid="auto-complete-grouped-focus"
          value={value.value}
          allowClear
          prefix="Search"
          filterOption={false}
          options={[
            {
              label: 'Runtime',
              options: [{ value: 'runtime/useComponent', title: 'useComponent lazy route' }],
            },
          ]}
          optionLabelProp="title"
          onChange={text => {
            value.value = text
          }}
        >
          <Template slot="footer">
            <div data-testid="auto-complete-grouped-footer">Footer</div>
          </Template>
        </AutoComplete>
      )
    }

    mountTestApp(container, () => render(<ControlledCase />, container))

    await waitForContent(() => {
      expect(reportedErrors).toHaveLength(0)
      expect(container.querySelector('[data-testid="auto-complete-grouped-focus"]')).toBeTruthy()
    })

    const initialInput = container.querySelector(
      '[data-testid="auto-complete-grouped-focus"]',
    ) as HTMLInputElement

    initialInput.focus()
    initialInput.value = 'r'
    initialInput.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      const currentInput = container.querySelector(
        '[data-testid="auto-complete-grouped-focus"]',
      ) as HTMLInputElement | null
      expect(currentInput?.value).toBe('r')
      expect(document.activeElement).toBe(currentInput)
    })

    stopListening?.()
  })

  it('preserves focus when controlled open remounts after focus', async () => {
    const container = mountTestContainer()
    const reportedErrors: unknown[] = []
    resetActiveRuntime()
    const stopListening = onError((error: unknown) => {
      reportedErrors.push(error)
    })

    const ControlledCase = () => {
      const value = ref('')
      const open = ref(false)

      return (
        <AutoComplete
          data-testid="auto-complete-controlled-focus"
          value={value.value}
          open={open.value}
          allowClear
          prefix="Search"
          options={[
            { value: 'runtime/useComponent', title: 'useComponent lazy route' },
            { value: 'docs/routing', title: 'Routing guide' },
          ]}
          filterOption={false}
          onChange={text => {
            value.value = text
          }}
          onOpenChange={nextOpen => {
            open.value = nextOpen
          }}
        />
      )
    }

    mountTestApp(container, () => render(<ControlledCase />, container))

    await waitForContent(() => {
      expect(reportedErrors).toHaveLength(0)
      expect(container.querySelector('[data-testid="auto-complete-controlled-focus"]')).toBeTruthy()
    })

    const initialInput = container.querySelector(
      '[data-testid="auto-complete-controlled-focus"]',
    ) as HTMLInputElement

    initialInput.focus()

    await waitForContent(() => {
      const currentInput = container.querySelector(
        '[data-testid="auto-complete-controlled-focus"]',
      ) as HTMLInputElement | null
      expect(currentInput?.getAttribute('aria-expanded')).toBe('true')
      expect(container.querySelectorAll('[role="option"]')).toHaveLength(2)
      expect(document.activeElement).toBe(currentInput)
    })

    stopListening?.()
  })

  it('updates visible highlight with arrow keys without backfill', async () => {
    const container = mountTestContainer()
    const reportedErrors: unknown[] = []
    resetActiveRuntime()
    const stopListening = onError((error: unknown) => {
      reportedErrors.push(error)
    })

    mountTestApp(container, () =>
      render(
        <AutoComplete
          data-testid="auto-complete-warning-navigation"
          status="warning"
          filterOption={false}
          defaultValue="runtime/watch"
          options={[{ value: 'useComponent' }, { value: 'useRouter' }, { value: 'Mentions' }]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(reportedErrors).toHaveLength(0)
      expect(
        container.querySelector('[data-testid="auto-complete-warning-navigation"]'),
      ).toBeTruthy()
    })

    const control = container.querySelector(
      '[data-rue-auto-complete-control="true"]',
    ) as HTMLLabelElement
    const input = container.querySelector(
      '[data-testid="auto-complete-warning-navigation"]',
    ) as HTMLInputElement

    await click(control)

    await waitForContent(() => {
      expect(container.querySelectorAll('[role="option"]')).toHaveLength(3)
      expect(
        container.querySelector('[role="option"][aria-selected="true"]')?.textContent,
      ).toContain('useComponent')
    })

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))

    await waitForContent(() => {
      expect(
        container.querySelector('[role="option"][aria-selected="true"]')?.textContent,
      ).toContain('useRouter')
    })

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

    await waitForContent(() => {
      const settledInput = container.querySelector(
        '[data-testid="auto-complete-warning-navigation"]',
      ) as HTMLInputElement | null
      expect(settledInput?.value).toBe('useRouter')
    })

    stopListening?.()
  })

  it('reopens the popup when clicking the input in controlled-open mode with a selected value', async () => {
    const container = mountContainer()
    const reportedErrors: unknown[] = []
    resetActiveRuntime()
    const stopListening = onError((error: unknown) => {
      reportedErrors.push(error)
    })

    const ControlledCase = () => {
      const value = ref('Routing guide')
      const open = ref(false)

      return (
        <AutoComplete
          data-testid="auto-complete-click-reopen"
          value={value.value}
          open={open.value}
          allowClear
          backfill
          filterOption={false}
          prefix="Search"
          options={[{ value: 'Routing guide' }, { value: 'render' }]}
          onChange={text => {
            value.value = text
          }}
          onOpenChange={nextOpen => {
            open.value = nextOpen
          }}
        />
      )
    }

    mountTestApp(container, () => render(<ControlledCase />, container))

    await waitForContent(() => {
      expect(reportedErrors).toHaveLength(0)
      expect(container.querySelector('[data-testid="auto-complete-click-reopen"]')).toBeTruthy()
    })

    const input = container.querySelector(
      '[data-testid="auto-complete-click-reopen"]',
    ) as HTMLInputElement

    input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }))
    input.focus()
    input.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 0 }))
    input.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))

    await waitForContent(() => {
      const currentInput = container.querySelector(
        '[data-testid="auto-complete-click-reopen"]',
      ) as HTMLInputElement | null
      expect(currentInput?.getAttribute('aria-expanded')).toBe('true')
      expect(container.querySelectorAll('[role="option"]')).toHaveLength(2)
    })

    stopListening?.()
  })
})
