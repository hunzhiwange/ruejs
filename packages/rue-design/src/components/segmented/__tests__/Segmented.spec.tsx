import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref, render, setReactiveScheduling } from '@rue-js/rue'
import Segmented from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active =
    (globalThis as any).__rue_vapor_preferred ?? (globalThis as any).__rue
}

const getItem = (container: HTMLElement, value: string) => {
  return container.querySelector(
    `[data-rue-segmented-value="string:${value}"]`,
  ) as HTMLButtonElement | null
}

const getHiddenInput = (container: HTMLElement) => {
  return container.querySelector(
    'input[data-rue-segmented-hidden="true"]',
  ) as HTMLInputElement | null
}

const getThumb = (container: HTMLElement) => {
  return container.querySelector('[data-rue-segmented-thumb="true"]') as HTMLSpanElement | null
}

const mockRect = (
  element: HTMLElement,
  rect: { left: number; top: number; width: number; height: number },
) => {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      x: rect.left,
      y: rect.top,
      left: rect.left,
      top: rect.top,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      width: rect.width,
      height: rect.height,
      toJSON: () => ({}),
    }),
  })
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Segmented', () => {
  it('supports uncontrolled selection and emits next value on change', async () => {
    const container = mountContainer()
    const handleChange = vi.fn()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Segmented
          options={['daily', 'weekly', 'monthly']}
          defaultValue="weekly"
          onChange={handleChange}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const weekly = getItem(container, 'weekly')
      expect(weekly).toBeTruthy()
      expect(weekly?.getAttribute('aria-checked')).toBe('true')
      expect(container.querySelector('[role="radiogroup"]')).toBeTruthy()
    })

    getItem(container, 'monthly')?.click()

    await waitForContent(() => {
      const monthly = getItem(container, 'monthly')
      expect(handleChange).toHaveBeenLastCalledWith('monthly')
      expect(monthly?.getAttribute('aria-checked')).toBe('true')
    })
  })

  it('updates controlled value after the parent state changes', async () => {
    const container = mountContainer()
    const current = ref('list')
    resetActiveRuntime()

    const Demo = () => {
      return (
        <Segmented
          options={[
            { label: 'List', value: 'list' },
            { label: 'Board', value: 'board' },
            { label: 'Pulse', value: 'pulse' },
          ]}
          value={current.value}
          onChange={next => {
            current.value = next as string
          }}
        />
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      expect(getItem(container, 'list')?.getAttribute('aria-checked')).toBe('true')
    })

    getItem(container, 'board')?.click()

    await waitForContent(() => {
      expect(current.value).toBe('board')
      expect(getItem(container, 'board')?.getAttribute('aria-checked')).toBe('true')
    })
  })

  it('slides the active thumb to the next option', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Segmented
          options={[
            { label: 'List', value: 'list' },
            { label: 'Board', value: 'board' },
            { label: 'Pulse', value: 'pulse' },
          ]}
          defaultValue="list"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(getThumb(container)).toBeTruthy()
      expect(getItem(container, 'list')?.getAttribute('aria-checked')).toBe('true')
    })

    const root = container.querySelector('[role="radiogroup"]') as HTMLElement
    const list = getItem(container, 'list') as HTMLButtonElement
    const board = getItem(container, 'board') as HTMLButtonElement
    const pulse = getItem(container, 'pulse') as HTMLButtonElement

    mockRect(root, { left: 10, top: 20, width: 240, height: 52 })
    mockRect(list, { left: 18, top: 28, width: 64, height: 36 })
    mockRect(board, { left: 90, top: 28, width: 72, height: 36 })
    mockRect(pulse, { left: 170, top: 28, width: 60, height: 36 })

    board.click()

    await waitForContent(() => {
      const thumb = getThumb(container)
      expect(thumb?.style.transform).toBe('translate3d(80px, 8px, 0)')
      expect(thumb?.style.width).toBe('72px')
      expect(thumb?.style.height).toBe('36px')
      expect(getItem(container, 'board')?.getAttribute('aria-checked')).toBe('true')
    })
  })

  it('keeps name/orientation attributes and blocks disabled options', async () => {
    const container = mountContainer()
    const handleChange = vi.fn()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Segmented
          name="density"
          orientation="vertical"
          defaultValue="comfortable"
          onChange={handleChange}
          options={[
            { value: 'compact', icon: 'C', tooltip: 'Compact mode', title: 'Compact' },
            {
              value: 'comfortable',
              icon: 'M',
              tooltip: { title: 'Comfortable mode' },
              title: 'Comfortable',
            },
            { value: 'expanded', icon: 'E', title: 'Expanded', disabled: true },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[role="radiogroup"]') as HTMLElement | null
      const comfortable = getItem(container, 'comfortable')
      const expanded = getItem(container, 'expanded')
      const hiddenInput = getHiddenInput(container)
      const titledNode = container.querySelector('[title="Comfortable mode"]') as HTMLElement | null
      expect(root?.getAttribute('data-orientation')).toBe('vertical')
      expect(hiddenInput?.name).toBe('density')
      expect(hiddenInput?.value).toBe('comfortable')
      expect(comfortable?.getAttribute('aria-checked')).toBe('true')
      expect(expanded?.getAttribute('aria-disabled')).toBe('true')
      expect(titledNode).toBeTruthy()
    })

    getItem(container, 'expanded')?.click()

    await waitForContent(() => {
      expect(handleChange).not.toHaveBeenCalled()
      expect(getItem(container, 'comfortable')?.getAttribute('aria-checked')).toBe('true')
      expect(getItem(container, 'expanded')?.getAttribute('aria-checked')).toBe('false')
    })
  })

  it('keeps horizontal icon labels centered while label-only items still fill the row', async () => {
    const container = mountContainer()
    const labelOnlyContainer = mountContainer()
    const verticalContainer = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Segmented
          defaultValue="list"
          options={[
            { value: 'list', label: 'List', icon: 'L' },
            { value: 'board', label: 'Board', icon: 'B' },
          ]}
        />,
        container,
      ),
    )

    mountTestApp(labelOnlyContainer, () =>
      render(
        <Segmented
          defaultValue="list"
          options={[
            { value: 'list', label: 'List' },
            { value: 'board', label: 'Board' },
          ]}
        />,
        labelOnlyContainer,
      ),
    )

    mountTestApp(verticalContainer, () =>
      render(
        <Segmented
          orientation="vertical"
          defaultValue="list"
          options={[
            { value: 'list', label: 'List', icon: 'L' },
            { value: 'board', label: 'Board', icon: 'B' },
          ]}
        />,
        verticalContainer,
      ),
    )

    await waitForContent(() => {
      const horizontalLabel = getItem(container, 'list')?.querySelector(
        'span.min-w-0',
      ) as HTMLSpanElement | null
      const labelOnlyHorizontalLabel = getItem(labelOnlyContainer, 'list')?.querySelector(
        'span.min-w-0',
      ) as HTMLSpanElement | null
      const verticalLabel = getItem(verticalContainer, 'list')?.querySelector(
        'span.min-w-0',
      ) as HTMLSpanElement | null

      expect(horizontalLabel).toBeTruthy()
      expect(labelOnlyHorizontalLabel).toBeTruthy()
      expect(verticalLabel).toBeTruthy()
      expect(horizontalLabel?.className.includes('flex-1')).toBe(false)
      expect(labelOnlyHorizontalLabel?.className.includes('flex-1')).toBe(true)
      expect(verticalLabel?.className.includes('flex-1')).toBe(true)
    })
  })

  it('renders icon-only items without dropping the icon after selection', async () => {
    const container = mountContainer()
    const current = ref('comfortable')
    resetActiveRuntime()

    const Demo = () => {
      return (
        <Segmented
          value={current.value}
          options={[
            { value: 'compact', icon: 'C', title: 'Compact' },
            {
              value: 'comfortable',
              icon: 'M',
              title: 'Comfortable',
            },
            {
              value: 'expanded',
              icon: 'E',
              title: 'Expanded',
            },
          ]}
          onChange={next => {
            current.value = next as string
          }}
        />
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      const comfortable = getItem(container, 'comfortable')
      expect(comfortable?.querySelector('[data-rue-segmented-icon-host="true"]')?.textContent).toBe(
        'M',
      )
      expect(comfortable?.querySelector('.sr-only')?.textContent).toBe('comfortable')
    })

    getItem(container, 'compact')?.click()

    await waitForContent(() => {
      const compact = getItem(container, 'compact')
      expect(current.value).toBe('compact')
      expect(compact?.getAttribute('aria-checked')).toBe('true')
      expect(compact?.querySelector('[data-rue-segmented-icon-host="true"]')?.textContent).toBe('C')
      expect(compact?.querySelector('.sr-only')?.textContent).toBe('compact')
      expect(compact?.querySelector('span.min-w-0')).toBeNull()
      expect(compact?.className.includes('gap-0')).toBe(true)
    })
  })

  it('keeps controlled icon-and-label options visible after rerender', async () => {
    const container = mountContainer()
    const current = ref('mail')
    resetActiveRuntime()

    const createOptions = () => [
      { value: 'mail', label: 'Email', icon: '✉' },
      { value: 'notice', label: 'Notification', icon: '!' },
      { value: 'launch', label: 'Launch Feed', icon: '↗' },
    ]

    const Demo = () => {
      return (
        <Segmented
          value={current.value}
          options={createOptions()}
          onChange={next => {
            current.value = next as string
          }}
        />
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      expect(
        getItem(container, 'mail')?.querySelector('[data-rue-segmented-icon-host="true"]'),
      ).toBeTruthy()
      expect(getItem(container, 'notice')?.textContent).toContain('Notification')
    })

    getItem(container, 'notice')?.click()

    await waitForContent(() => {
      const notice = getItem(container, 'notice')
      expect(current.value).toBe('notice')
      expect(notice?.getAttribute('aria-checked')).toBe('true')
      expect(notice?.querySelector('[data-rue-segmented-icon-host="true"]')).toBeTruthy()
      expect(notice?.textContent).toContain('Notification')
      expect(
        getItem(container, 'mail')?.querySelector('[data-rue-segmented-icon-host="true"]'),
      ).toBeTruthy()
    })
  })

  it('keeps sibling controlled instances visible when they rerender from shared state', async () => {
    const container = mountContainer()
    const current = ref('list')
    resetActiveRuntime()

    const createOptions = () => [
      { value: 'list', label: 'List', icon: '✉' },
      { value: 'board', label: 'Board', icon: '!' },
      { value: 'pulse', label: 'Pulse', icon: '↗' },
    ]

    const Demo = () => {
      return (
        <div>
          <Segmented
            options={createOptions()}
            size="small"
            value={current.value}
            onChange={next => {
              current.value = next as string
            }}
          />
          <Segmented
            options={createOptions()}
            size="middle"
            value={current.value}
            onChange={next => {
              current.value = next as string
            }}
          />
          <Segmented
            options={createOptions()}
            size="large"
            value={current.value}
            onChange={next => {
              current.value = next as string
            }}
          />
          <Segmented
            options={createOptions()}
            shape="round"
            block
            value={current.value}
            onChange={next => {
              current.value = next as string
            }}
          />
        </div>
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      const groups = Array.from(container.querySelectorAll('[role="radiogroup"]'))
      expect(groups).toHaveLength(4)
      groups.forEach(group => {
        const list = group.querySelector(
          '[data-rue-segmented-value="string:list"]',
        ) as HTMLElement | null
        const board = group.querySelector(
          '[data-rue-segmented-value="string:board"]',
        ) as HTMLElement | null
        expect(list?.querySelector('[data-rue-segmented-icon-host="true"]')).toBeTruthy()
        expect(board?.querySelector('[data-rue-segmented-icon-host="true"]')).toBeTruthy()
        expect(board?.textContent).toContain('Board')
      })
    })

    const firstGroupBoard = container.querySelector(
      '[role="radiogroup"] [data-rue-segmented-value="string:board"]',
    ) as HTMLButtonElement | null
    firstGroupBoard?.click()

    await waitForContent(() => {
      expect(current.value).toBe('board')
      const groups = Array.from(container.querySelectorAll('[role="radiogroup"]'))
      groups.forEach(group => {
        const list = group.querySelector(
          '[data-rue-segmented-value="string:list"]',
        ) as HTMLElement | null
        const board = group.querySelector(
          '[data-rue-segmented-value="string:board"]',
        ) as HTMLElement | null
        expect(board?.getAttribute('aria-checked')).toBe('true')
        expect(list?.querySelector('[data-rue-segmented-icon-host="true"]')).toBeTruthy()
        expect(board?.querySelector('[data-rue-segmented-icon-host="true"]')).toBeTruthy()
        expect(board?.textContent).toContain('Board')
      })
    })
  })

  it('updates sibling controlled instances with label-only options from shared state', async () => {
    const container = mountContainer()
    const current = ref('list')
    resetActiveRuntime()

    const options = [
      { value: 'list', label: 'List' },
      { value: 'board', label: 'Board' },
      { value: 'pulse', label: 'Pulse' },
    ]

    const Demo = () => {
      return (
        <div>
          <Segmented
            options={options}
            size="small"
            value={current.value}
            onChange={next => {
              current.value = next as string
            }}
          />
          <Segmented
            options={options}
            size="middle"
            value={current.value}
            onChange={next => {
              current.value = next as string
            }}
          />
        </div>
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      const groups = Array.from(container.querySelectorAll('[role="radiogroup"]'))
      expect(groups).toHaveLength(2)
      groups.forEach(group => {
        const list = group.querySelector(
          '[data-rue-segmented-value="string:list"]',
        ) as HTMLElement | null
        const board = group.querySelector(
          '[data-rue-segmented-value="string:board"]',
        ) as HTMLElement | null
        expect(list?.getAttribute('aria-checked')).toBe('true')
        expect(board?.textContent).toContain('Board')
      })
    })

    const firstGroupBoard = container.querySelector(
      '[role="radiogroup"] [data-rue-segmented-value="string:board"]',
    ) as HTMLButtonElement | null
    firstGroupBoard?.click()

    await waitForContent(() => {
      expect(current.value).toBe('board')
      const groups = Array.from(container.querySelectorAll('[role="radiogroup"]'))
      groups.forEach(group => {
        const board = group.querySelector(
          '[data-rue-segmented-value="string:board"]',
        ) as HTMLElement | null
        expect(board?.getAttribute('aria-checked')).toBe('true')
        expect(group.textContent).toContain('Board')
      })
    })
  })

  it('keeps plain text labels on one line in horizontal layouts while custom labels may wrap', async () => {
    const plainTextContainer = mountContainer()
    const customLabelContainer = mountContainer()
    resetActiveRuntime()

    mountTestApp(plainTextContainer, () =>
      render(
        <Segmented
          defaultValue="launch"
          options={[{ value: 'launch', label: 'Launch Feed', icon: '↗' }]}
        />,
        plainTextContainer,
      ),
    )

    mountTestApp(customLabelContainer, () =>
      render(
        <Segmented
          defaultValue="launch"
          options={[
            {
              value: 'launch',
              label: 'Launch Feed',
              wrapLabel: true,
              icon: '↗',
            },
          ]}
        />,
        customLabelContainer,
      ),
    )

    await waitForContent(() => {
      const plainTextLabel = plainTextContainer.querySelector(
        '[data-rue-segmented-label-host="true"]',
      ) as HTMLSpanElement | null
      const customLabel = customLabelContainer.querySelector(
        '[data-rue-segmented-label-host="true"]',
      ) as HTMLSpanElement | null

      expect(plainTextLabel).toBeTruthy()
      expect(customLabel).toBeTruthy()
      expect(plainTextLabel?.className.includes('whitespace-nowrap')).toBe(true)
      expect(customLabel?.className.includes('whitespace-normal')).toBe(true)
    })
  })
})
