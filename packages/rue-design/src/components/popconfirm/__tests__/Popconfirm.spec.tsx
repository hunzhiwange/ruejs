import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref, render, setReactiveScheduling } from '@rue-js/rue'
import Popconfirm from '../index'
import {
  flush,
  mountContainer,
  waitForContent,
} from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

const findTrigger = (container: HTMLElement) => {
  return container.querySelector('[aria-haspopup="dialog"]') as HTMLDivElement
}

const findAction = (container: HTMLElement, action: 'ok' | 'cancel') => {
  return container.querySelector(
    `[data-rue-popconfirm-action="${action}"]`,
  ) as HTMLButtonElement | null
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Popconfirm', () => {
  it('opens in uncontrolled mode and closes on cancel', async () => {
    const container = mountContainer()
    const handleCancel = vi.fn()
    const openChanges: boolean[] = []
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Popconfirm
          title="确认归档这条记录？"
          description="归档后仍可在历史列表中恢复。"
          cancelText="先等等"
          okText="确认归档"
          onCancel={handleCancel}
          onOpenChange={nextOpen => openChanges.push(nextOpen)}
        >
          <button type="button">Archive</button>
        </Popconfirm>,
        container,
      ),
    )

    await waitForContent(() => {
      expect(findTrigger(container)).toBeTruthy()
    })

    findTrigger(container).dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-popconfirm-panel="true"]')).toBeTruthy()
      expect(container.textContent).toContain('确认归档这条记录？')
      expect(container.textContent).toContain('归档后仍可在历史列表中恢复。')
      expect(findAction(container, 'cancel')?.textContent).toContain('先等等')
      expect(findAction(container, 'ok')?.textContent).toContain('确认归档')
    })

    findAction(container, 'cancel')?.click()

    await waitForContent(() => {
      expect(handleCancel).toHaveBeenCalledTimes(1)
      expect(container.querySelector('[data-rue-popconfirm-panel="true"]')).toBeFalsy()
      expect(openChanges).toEqual([true, false])
    })
  })

  it('supports async confirm loading and closes after resolve', async () => {
    const container = mountContainer()
    const handleConfirm = vi.fn<() => Promise<unknown>>()
    let resolveConfirm: ((value?: unknown) => void) | undefined
    resetActiveRuntime()

    handleConfirm.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveConfirm = resolve
        }),
    )

    mountTestApp(container, () =>
      render(
        <Popconfirm
          title="删除当前分组？"
          description="异步确认完成后再关闭浮层。"
          onConfirm={handleConfirm}
        >
          <button type="button">Delete</button>
        </Popconfirm>,
        container,
      ),
    )

    await waitForContent(() => {
      expect(findTrigger(container)).toBeTruthy()
    })

    findTrigger(container).dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-popconfirm-panel="true"]')).toBeTruthy()
    })

    findAction(container, 'ok')?.click()

    await waitForContent(() => {
      expect(handleConfirm).toHaveBeenCalledTimes(1)
      expect(findAction(container, 'ok')?.getAttribute('aria-busy')).toBe('true')
    })

    resolveConfirm?.(undefined)

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-popconfirm-panel="true"]')).toBeFalsy()
    })
  })

  it('supports controlled open state and single-action mode', async () => {
    const container = mountContainer()
    const handleConfirm = vi.fn()
    const controlledOpen = ref(false)
    resetActiveRuntime()

    const ControlledCase = () => {
      return (
        <Popconfirm
          title="立即发布？"
          showCancel={false}
          open={controlledOpen.value}
          onOpenChange={nextOpen => {
            controlledOpen.value = nextOpen
          }}
          onConfirm={() => {
            handleConfirm()
          }}
        >
          <button type="button">Publish</button>
        </Popconfirm>
      )
    }

    mountTestApp(container, () => render(<ControlledCase />, container))

    await waitForContent(() => {
      expect(findTrigger(container)).toBeTruthy()
    })

    findTrigger(container).dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-popconfirm-panel="true"]')).toBeTruthy()
      expect(findAction(container, 'cancel')).toBeFalsy()
      expect(findAction(container, 'ok')).toBeTruthy()
    })

    findAction(container, 'ok')?.click()

    await waitForContent(() => {
      expect(handleConfirm).toHaveBeenCalledTimes(1)
      expect(container.querySelector('[data-rue-popconfirm-panel="true"]')).toBeFalsy()
    })
  })

  it('supports externally controlled open state from toolbar actions', async () => {
    const container = mountContainer()
    const controlledOpen = ref(false)
    resetActiveRuntime()

    const ControlledCase = () => {
      return (
        <div>
          <Popconfirm
            title="同步审批意见？"
            description="这个确认层完全由外部状态控制。"
            open={controlledOpen.value}
            onOpenChange={nextOpen => {
              controlledOpen.value = nextOpen
            }}
          >
            <button type="button">Controlled trigger</button>
          </Popconfirm>
          <button
            type="button"
            data-testid="external-open"
            onClick={() => {
              controlledOpen.value = true
            }}
          >
            Open from toolbar
          </button>
        </div>
      )
    }

    mountTestApp(container, () => render(<ControlledCase />, container))

    await waitForContent(() => {
      expect(findTrigger(container)).toBeTruthy()
      expect(container.querySelector('[data-rue-popconfirm-panel="true"]')).toBeFalsy()
    })

    const externalOpen = container.querySelector('[data-testid="external-open"]') as HTMLElement
    externalOpen.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-popconfirm-panel="true"]')).toBeTruthy()
      expect(container.textContent).toContain('这个确认层完全由外部状态控制。')
    })
  })

  it('keeps hover popconfirm open while pointer quickly moves toward the overlay', async () => {
    vi.useFakeTimers()

    try {
      const container = mountContainer()
      const openChanges: boolean[] = []
      resetActiveRuntime()

      mountTestApp(container, () =>
        render(
          <Popconfirm
            title="混合触发"
            description="hover 可预热，click 再明确确认。"
            trigger={['hover', 'click']}
            onOpenChange={nextOpen => {
              openChanges.push(nextOpen)
            }}
          >
            <button type="button">Hover + click</button>
          </Popconfirm>,
          container,
        ),
      )

      await waitForContent(() => {
        expect(findTrigger(container)).toBeTruthy()
      })

      const root = container.firstElementChild as HTMLElement
      root.dispatchEvent(
        new MouseEvent('mouseenter', { bubbles: true, relatedTarget: document.body }),
      )
      await flush()

      expect(container.querySelector('[data-rue-popconfirm-panel="true"]')).toBeTruthy()

      root.dispatchEvent(
        new MouseEvent('mouseleave', { bubbles: true, relatedTarget: document.body }),
      )
      await flush()

      vi.advanceTimersByTime(60)
      await flush()

      root.dispatchEvent(
        new MouseEvent('mouseenter', { bubbles: true, relatedTarget: document.body }),
      )
      await flush()

      vi.advanceTimersByTime(200)
      await flush()

      expect(container.querySelector('[data-rue-popconfirm-panel="true"]')).toBeTruthy()
      expect(openChanges).toEqual([true])

      root.dispatchEvent(
        new MouseEvent('mouseleave', { bubbles: true, relatedTarget: document.body }),
      )
      await flush()

      vi.advanceTimersByTime(200)
      await flush()

      expect(container.querySelector('[data-rue-popconfirm-panel="true"]')).toBeFalsy()
      expect(openChanges).toEqual([true, false])
    } finally {
      vi.useRealTimers()
    }
  })

  it('supports focus trigger for input elements', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <div>
          <Popconfirm
            trigger="focus"
            title="离开输入框前确认？"
            description="适合补充最后一步确认。"
          >
            <input type="text" placeholder="Focus trigger" />
          </Popconfirm>
          <button type="button" data-testid="outside-focus-target">
            Outside
          </button>
        </div>,
        container,
      ),
    )

    await waitForContent(() => {
      expect(findTrigger(container)).toBeTruthy()
    })

    const input = container.querySelector('input[placeholder="Focus trigger"]') as HTMLInputElement
    const outside = container.querySelector(
      '[data-testid="outside-focus-target"]',
    ) as HTMLButtonElement

    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget: null }))

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-popconfirm-panel="true"]')).toBeTruthy()
      expect(container.textContent).toContain('离开输入框前确认？')
    })

    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }))

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-popconfirm-panel="true"]')).toBeFalsy()
    })
  })
})
