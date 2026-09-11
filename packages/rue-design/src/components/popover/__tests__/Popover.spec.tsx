import { Template } from '@rue-js/rue'
import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { ref, render, setReactiveScheduling } from '@rue-js/rue'
import Popover from '../index'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Popover', () => {
  it('renders title and content with placement classes', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Popover
          title="Workspace health"
          content="展示结构化说明和操作建议。"
          placement="bottomRight"
          open={true}
          overlayClassName="popover-test-overlay"
        >
          <button className="btn">Open</button>
        </Popover>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.firstElementChild as HTMLElement
      const overlay = container.querySelector('.popover-test-overlay') as HTMLElement
      expect(root.className.includes('relative')).toBe(true)
      expect(
        overlay.className.includes('bottomRight') || overlay.className.includes('top-full'),
      ).toBe(true)
      expect(overlay.getAttribute('aria-hidden')).toBe('false')
      expect(container.textContent).toContain('Workspace health')
      expect(container.textContent).toContain('展示结构化说明和操作建议。')
    })
  })

  it('supports click trigger and onOpenChange callback', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const openStates: boolean[] = []

    mountTestApp(container, () =>
      render(
        <Popover
          title="Quick actions"
          content="Click again to close"
          trigger="click"
          onOpenChange={nextOpen => openStates.push(nextOpen)}
          overlayClassName="popover-test-overlay"
        >
          <button data-testid="popover-trigger">Toggle</button>
        </Popover>,
        container,
      ),
    )

    await waitForContent(() => {
      const overlay = container.querySelector('.popover-test-overlay') as HTMLElement
      expect(overlay.getAttribute('aria-hidden')).toBe('true')
    })

    const trigger = container.querySelector('[data-testid="popover-trigger"]') as HTMLElement
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      const overlay = container.querySelector('.popover-test-overlay') as HTMLElement
      expect(overlay.getAttribute('aria-hidden')).toBe('false')
    })

    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      const overlay = container.querySelector('.popover-test-overlay') as HTMLElement
      expect(overlay.getAttribute('aria-hidden')).toBe('true')
      expect(openStates).toEqual([true, false])
    })
  })

  it('supports hover trigger with immediate delays', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Popover
          title="Hover card"
          content="Moves with hover state"
          mouseEnterDelay={0}
          mouseLeaveDelay={0}
          overlayClassName="popover-test-overlay"
        >
          <button className="btn">Hover</button>
        </Popover>,
        container,
      ),
    )

    const root = container.firstElementChild as HTMLElement
    root.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))

    await waitForContent(() => {
      const overlay = container.querySelector('.popover-test-overlay') as HTMLElement
      expect(overlay.getAttribute('aria-hidden')).toBe('false')
    })

    root.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))

    await waitForContent(() => {
      const overlay = container.querySelector('.popover-test-overlay') as HTMLElement
      expect(overlay.getAttribute('aria-hidden')).toBe('true')
    })
  })

  it('supports controlled open state from external actions', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    const ControlledCase = () => {
      const open = ref(false)

      return (
        <div>
          <Popover
            trigger="click"
            open={open.value}
            onOpenChange={nextOpen => {
              open.value = nextOpen
            }}
            title="Controlled popover"
            content="External toggles should sync."
            overlayClassName="popover-test-overlay"
          >
            <button type="button" data-testid="popover-trigger">
              Trigger
            </button>
          </Popover>
          <button
            type="button"
            data-testid="external-toggle"
            onClick={() => {
              open.value = !open.value
            }}
          >
            External toggle
          </button>
        </div>
      )
    }

    mountTestApp(container, () => render(<ControlledCase />, container))

    await waitForContent(() => {
      const overlay = container.querySelector('.popover-test-overlay') as HTMLElement
      expect(overlay.getAttribute('aria-hidden')).toBe('true')
    })

    const toggleButton = container.querySelector('[data-testid="external-toggle"]') as HTMLElement
    toggleButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      const overlay = container.querySelector('.popover-test-overlay') as HTMLElement
      expect(overlay.getAttribute('aria-hidden')).toBe('false')
      expect(container.textContent).toContain('Controlled popover')
    })
  })

  it('supports focus trigger for input elements', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Popover
          trigger="focus"
          title="Field helper"
          content="Focus should reveal this card."
          overlayClassName="popover-test-overlay"
        >
          <input data-testid="focus-input" />
        </Popover>,
        container,
      ),
    )

    await waitForContent(() => {
      const overlay = container.querySelector('.popover-test-overlay') as HTMLElement
      expect(overlay.getAttribute('aria-hidden')).toBe('true')
    })

    const input = container.querySelector('[data-testid="focus-input"]') as HTMLElement
    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))

    await waitForContent(() => {
      const overlay = container.querySelector('.popover-test-overlay') as HTMLElement
      expect(overlay.getAttribute('aria-hidden')).toBe('false')
    })

    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))

    await waitForContent(() => {
      const overlay = container.querySelector('.popover-test-overlay') as HTMLElement
      expect(overlay.getAttribute('aria-hidden')).toBe('true')
    })
  })

  it('renders custom overlay and respects arrow false', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Popover arrow={false} open={true} overlayClassName="popover-test-overlay">
          <Template slot="overlay">
            <div data-testid="custom-panel">Custom body</div>
          </Template>
          <button>Open</button>
        </Popover>,
        container,
      ),
    )

    await waitForContent(() => {
      const overlay = container.querySelector('.popover-test-overlay') as HTMLElement
      const panel = container.querySelector('[data-testid="custom-panel"]') as HTMLElement
      expect(overlay.textContent).toContain('Custom body')
      expect(panel).toBeTruthy()
      expect(overlay.querySelector('span')).toBeNull()
    })
  })
})
