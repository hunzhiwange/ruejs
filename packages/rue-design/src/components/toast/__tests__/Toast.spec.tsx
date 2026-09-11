import { Template } from '@rue-js/rue'
import { ToastHolder } from '../index'
import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref, render, setReactiveScheduling } from '@rue-js/rue'
import Toast from '..'
import {
  click,
  flush,
  mountContainer,
  waitForContent,
} from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('Toast', () => {
  it('renders the base toast container and children', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Toast className="absolute" data-testid="toast">
          <div>Message</div>
        </Toast>,
        container,
      ),
    )

    await waitForContent(() => {
      const toast = container.querySelector('[data-testid="toast"]') as HTMLElement
      expect(toast.tagName.toLowerCase()).toBe('div')
      expect(toast.classList.contains('toast')).toBe(true)
      expect(toast.classList.contains('absolute')).toBe(true)
      expect(toast.textContent).toContain('Message')
    })
  })

  it('applies horizontal and vertical placement classes', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(<Toast horizontal="center" vertical="top" data-testid="toast" />, container),
    )

    await waitForContent(() => {
      const toast = container.querySelector('[data-testid="toast"]') as HTMLElement
      expect(toast.classList.contains('toast-center')).toBe(true)
      expect(toast.classList.contains('toast-top')).toBe(true)
    })
  })

  it('supports semantic placement aliases and lets explicit axis props win', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(<Toast placement="top-start" horizontal="center" data-testid="toast" />, container),
    )

    await waitForContent(() => {
      const toast = container.querySelector('[data-testid="toast"]') as HTMLElement
      expect(toast.classList.contains('toast-center')).toBe(true)
      expect(toast.classList.contains('toast-top')).toBe(true)
      expect(toast.classList.contains('toast-start')).toBe(false)
    })
  })

  it('supports layout props for stack direction, inset, gap and z-index', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Toast
          stack="horizontal"
          reverse
          inset={{ x: 16, y: '0.75rem' }}
          gap={12}
          zIndex={50}
          data-testid="toast"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const toast = container.querySelector('[data-testid="toast"]') as HTMLElement
      expect(toast.classList.contains('flex-row-reverse')).toBe(true)
      expect(toast.style.paddingInline).toBe('16px')
      expect(toast.style.paddingBlock).toBe('0.75rem')
      expect(toast.style.gap).toBe('12px')
      expect(toast.style.zIndex).toBe('50')
    })
  })

  it('renders multiple child items without collapsing them into object strings', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Toast data-testid="toast">
          <div className="first">First</div>
          <div className="second">Second</div>
        </Toast>,
        container,
      ),
    )

    await waitForContent(() => {
      const toast = container.querySelector('[data-testid="toast"]') as HTMLElement
      expect(toast.querySelector('.first')?.textContent).toBe('First')
      expect(toast.querySelector('.second')?.textContent).toBe('Second')
      expect(toast.textContent).not.toContain('[object Object]')
    })
  })

  it('supports changing host element via as', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () => render(<Toast as="section" data-testid="toast" />, container))

    await waitForContent(() => {
      const toast = container.querySelector('[data-testid="toast"]') as HTMLElement
      expect(toast.tagName.toLowerCase()).toBe('section')
    })
  })

  it('renders message-like toast items with title, description, action and close button', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Toast data-testid="toast">
          <Toast.Item
            type="success"
            title="Deployment ready"
            description="Production artifacts have been verified."
            closable
            data-testid="toast-item"
          >
            <Template slot="action">
              <button type="button">Undo</button>
            </Template>
          </Toast.Item>
        </Toast>,
        container,
      ),
    )

    await waitForContent(() => {
      const item = container.querySelector('[data-testid="toast-item"]') as HTMLElement
      expect(item).toBeTruthy()
      expect(item.getAttribute('role')).toBe('status')
      expect(item.getAttribute('aria-live')).toBe('polite')
      expect(item.textContent).toContain('Deployment ready')
      expect(item.textContent).toContain('Production artifacts have been verified.')
      expect(item.textContent).toContain('Undo')
      expect(item.querySelector('button[aria-label="关闭提示"]')).toBeTruthy()
    })
  })

  it('supports uncontrolled close interactions on toast items', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const onClose = vi.fn()

    mountTestApp(container, () =>
      render(
        <Toast.Item closable title="Closable item" data-testid="toast-item" onClose={onClose} />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="toast-item"]')).toBeTruthy()
    })

    const closeButton = container.querySelector('button[aria-label="关闭提示"]')
    await click(closeButton)

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="toast-item"]')).toBeNull()
      expect(onClose).toHaveBeenCalledWith(expect.objectContaining({ source: 'close' }))
    })
  })

  it('supports auto close duration on toast items', async () => {
    vi.useFakeTimers()
    const container = mountContainer()
    resetActiveRuntime()
    const onClose = vi.fn()

    mountTestApp(container, () =>
      render(
        <Toast.Item duration={1} title="Saved" data-testid="toast-item" onClose={onClose} />,
        container,
      ),
    )

    await flush(5)
    expect(container.querySelector('[data-testid="toast-item"]')).toBeTruthy()

    vi.advanceTimersByTime(1000)
    await flush(5)

    expect(container.querySelector('[data-testid="toast-item"]')).toBeNull()
    expect(onClose).toHaveBeenCalledWith(expect.objectContaining({ source: 'timeout' }))
  })

  it('lets compound Toast.Close close the current toast item', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Toast data-testid="toast">
          <Toast.Item data-testid="toast-item" title="Workspace synced" closable={false}>
            <Toast.Content>
              <Toast.Title>Workspace synced</Toast.Title>
            </Toast.Content>
            <Toast.Action>
              <Toast.Close data-testid="compound-close" />
            </Toast.Action>
          </Toast.Item>
        </Toast>,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="compound-close"]')).toBeTruthy()
      expect(container.querySelector('[data-testid="toast-item"]')).toBeTruthy()
    })

    await click(container.querySelector('[data-testid="compound-close"]'))

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="toast-item"]')).toBeNull()
    })
  })

  it('supports useMessage with open, keyed updates and destroy', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    const Harness = () => {
      const [messageApi, contextHolder] = Toast.useMessage({
        placement: 'top',
        inset: { x: 12, y: 12 },
        maxCount: 2,
      })

      return (
        <div>
          <ToastHolder state={contextHolder} />
          <button
            type="button"
            data-testid="open"
            onClick={() => {
              messageApi.success({
                key: 'publish',
                content: 'Publish queued',
                duration: 0,
              })
            }}
          >
            open
          </button>
          <button
            type="button"
            data-testid="update"
            onClick={() => {
              messageApi.open({
                key: 'publish',
                type: 'success',
                content: 'Publish complete',
                duration: 0,
              })
            }}
          >
            update
          </button>
          <button
            type="button"
            data-testid="destroy"
            onClick={() => {
              messageApi.destroy('publish')
            }}
          >
            destroy
          </button>
        </div>
      )
    }

    mountTestApp(container, () => render(<Harness />, container))

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="open"]')).toBeTruthy()
    })

    await click(container.querySelector('[data-testid="open"]'))

    await waitForContent(() => {
      const toast = document.body.querySelector('.toast') as HTMLElement
      expect(toast).toBeTruthy()
      expect(toast.classList.contains('toast-top')).toBe(true)
      expect(container.querySelectorAll('[data-rue-toast-item="true"]')).toHaveLength(0)
      expect(document.body.textContent).toContain('Publish queued')
    })

    await click(container.querySelector('[data-testid="update"]'))

    await waitForContent(() => {
      expect(document.body.querySelectorAll('[data-rue-toast-item="true"]')).toHaveLength(1)
      expect(document.body.textContent).not.toContain('Publish queued')
      expect(document.body.textContent).toContain('Publish complete')
    })

    await click(container.querySelector('[data-testid="destroy"]'))

    await waitForContent(() => {
      expect(document.body.querySelector('[data-rue-toast-item="true"]')).toBeNull()
    })
  })

  it('keeps useMessage working after the holder JSX branch is switched away and back', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    const showHolder = ref(true)
    const openCount = ref(0)

    const Harness = () => {
      const [messageApi, contextHolder] = Toast.useMessage({ placement: 'top-end' })

      return (
        <div>
          {showHolder.value ? <ToastHolder state={contextHolder} /> : null}
          <button
            type="button"
            data-testid="toggle-holder"
            onClick={() => {
              showHolder.value = !showHolder.value
            }}
          >
            toggle holder
          </button>
          <button
            type="button"
            data-testid="open-message"
            onClick={() => {
              openCount.value += 1
              messageApi.open({
                key: 'holder-switch',
                content: `Message ${openCount.value}`,
                duration: 0,
              })
            }}
          >
            open message
          </button>
        </div>
      )
    }

    mountTestApp(container, () => render(<Harness />, container))

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="toggle-holder"]')).toBeTruthy()
    })

    await click(container.querySelector('[data-testid="open-message"]'))

    await waitForContent(() => {
      expect(document.body.textContent).toContain('Message 1')
    })

    await click(container.querySelector('[data-testid="toggle-holder"]'))
    await click(container.querySelector('[data-testid="toggle-holder"]'))
    await click(container.querySelector('[data-testid="open-message"]'))

    await waitForContent(() => {
      expect(document.body.textContent).not.toContain('Message 1')
      expect(document.body.textContent).toContain('Message 2')
    })
  })

  it('supports scoping useMessage back into the local holder with getContainer=false', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    const Harness = () => {
      const [messageApi, contextHolder] = Toast.useMessage({
        getContainer: false,
        className: 'absolute',
        placement: 'bottom-start',
        inset: { x: 8, y: 8 },
      })

      return (
        <div data-testid="box" className="relative overflow-hidden">
          <ToastHolder state={contextHolder} />
          <button
            type="button"
            data-testid="open-local"
            onClick={() => {
              messageApi.info({ content: 'Local toast', duration: 0 })
            }}
          >
            open local
          </button>
        </div>
      )
    }

    mountTestApp(container, () => render(<Harness />, container))

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="open-local"]')).toBeTruthy()
    })

    await click(container.querySelector('[data-testid="open-local"]'))

    await waitForContent(() => {
      const box = container.querySelector('[data-testid="box"]') as HTMLElement
      expect(box.querySelector('.toast')).toBeTruthy()
      expect(box.textContent).toContain('Local toast')
    })
  })
})
