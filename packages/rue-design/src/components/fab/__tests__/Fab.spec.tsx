import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import Fab from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Fab', () => {
  it('renders the root with flower modifier', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Fab flower className="absolute">
          <button>A</button>
        </Fab>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('.fab') as HTMLElement
      expect(root.classList.contains('fab-flower')).toBe(true)
      expect(root.classList.contains('absolute')).toBe(true)
    })
  })

  it('renders trigger, close, and main action parts', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Fab>
          <Fab.Trigger data-testid="trigger" className="btn btn-circle">
            F
          </Fab.Trigger>
          <Fab.Close data-testid="close">Close</Fab.Close>
          <Fab.MainAction data-testid="main">Main</Fab.MainAction>
        </Fab>,
        container,
      ),
    )

    await waitForContent(() => {
      const trigger = container.querySelector('[data-testid="trigger"]') as HTMLElement
      expect(trigger.getAttribute('role')).toBe('button')
      expect(trigger.getAttribute('tabindex')).toBe('0')
      expect(
        container.querySelector('[data-testid="close"]')?.classList.contains('fab-close'),
      ).toBe(true)
      expect(
        container.querySelector('[data-testid="main"]')?.classList.contains('fab-main-action'),
      ).toBe(true)
    })
  })

  it('renders mixed children inside close and main action wrappers', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Fab>
          <Fab.Close data-testid="close-mixed">
            Close <span data-testid="close-icon">X</span>
          </Fab.Close>
          <Fab.MainAction data-testid="main-mixed">
            Main <button data-testid="main-button">Go</button>
          </Fab.MainAction>
        </Fab>,
        container,
      ),
    )

    await waitForContent(() => {
      const close = container.querySelector('[data-testid="close-mixed"]') as HTMLElement
      const main = container.querySelector('[data-testid="main-mixed"]') as HTMLElement
      expect(close.textContent).not.toContain('[object Object]')
      expect(main.textContent).not.toContain('[object Object]')
      expect(close.querySelector('[data-testid="close-icon"]')).not.toBeNull()
      expect(main.querySelector('[data-testid="main-button"]')).not.toBeNull()
    })
  })

  it('supports the enhanced single-button API with content and badge', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Fab
          className="absolute"
          type="primary"
          icon="+"
          badge={{ count: 3, variant: 'error' }}
          tooltip="查看待处理消息"
          content="Inbox"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-rue-fab-root="true"]') as HTMLElement
      const button = root.querySelector('.btn') as HTMLElement
      expect(root).toBeTruthy()
      expect(button).toBeTruthy()
      expect(button.classList.contains('btn-primary')).toBe(true)
      expect(button.classList.contains('btn-circle')).toBe(false)
      expect(button.textContent).toContain('Inbox')
      expect(root.textContent).toContain('3')
      expect(root.querySelector('[data-rue-fab-icon="true"]')).not.toBeNull()
    })
  })

  it('keeps icon-only enhanced buttons circular by default', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(<Fab className="absolute" type="primary" icon="+" tooltip="新建内容" />, container),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-rue-fab-root="true"]') as HTMLElement
      const button = root.querySelector('.btn') as HTMLElement
      expect(button.classList.contains('btn-circle')).toBe(true)
      expect(button.className.includes('min-h-20')).toBe(false)
      expect(root.querySelector('[data-rue-fab-icon="true"]')).not.toBeNull()
    })
  })

  it('uses an internal hover bridge between trigger and panel', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Fab
          trigger="hover"
          type="primary"
          icon="+"
          items={[
            { key: 'draft', icon: 'D', content: 'Draft' },
            { key: 'share', icon: 'S', content: 'Share' },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const panel = container.querySelector('[data-rue-fab-panel="true"]') as HTMLElement
      expect(panel).toBeTruthy()
      expect(panel.className.includes('pb-3')).toBe(true)
      expect(panel.className.includes('mb-3')).toBe(false)
    })
  })

  it('opens and closes click-trigger menus', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Fab
          trigger="click"
          type="primary"
          icon="+"
          items={[
            { key: 'camera', icon: 'C', tooltip: '拍照' },
            { key: 'gallery', icon: 'G', tooltip: '相册' },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const trigger = container.querySelector('[aria-expanded]') as HTMLButtonElement
      expect(trigger).toBeTruthy()
      expect(trigger.getAttribute('aria-expanded')).toBe('false')

      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      const openedTrigger = container.querySelector('[aria-expanded]') as HTMLButtonElement
      const panel = container.querySelector('[aria-hidden]') as HTMLElement
      expect(openedTrigger.getAttribute('aria-expanded')).toBe('true')
      expect(panel).toBeTruthy()
      expect(panel.getAttribute('aria-hidden')).toBe('false')

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      const closedTrigger = container.querySelector('[aria-expanded]') as HTMLButtonElement
      const closedPanel = container.querySelector('[aria-hidden]') as HTMLElement
      expect(closedTrigger.getAttribute('aria-expanded')).toBe('false')
      expect(closedPanel.getAttribute('aria-hidden')).toBe('true')
    })
  })
})
