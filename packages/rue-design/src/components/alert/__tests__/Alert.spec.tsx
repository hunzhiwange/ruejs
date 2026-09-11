import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Template, render, setReactiveScheduling } from '@rue-js/rue'
import Alert from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Alert', () => {
  it('renders with role and base class', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () => render(<Alert>hello</Alert>, container))

    await waitForContent(() => {
      const el = container.querySelector('[role="alert"]') as HTMLElement
      expect(el).toBeTruthy()
      expect(el.classList.contains('alert')).toBe(true)
      expect(el.textContent).toContain('hello')
    })
  })

  it('applies tone aliases from variant, color and type', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <div>
          <Alert variant="info">Info</Alert>
          <Alert color="success">Success</Alert>
          <Alert type="error">Error</Alert>
        </div>,
        container,
      ),
    )

    await waitForContent(() => {
      const alerts = Array.from(container.querySelectorAll('[role="alert"]')) as HTMLElement[]
      expect(alerts).toHaveLength(3)
      expect(alerts[0].classList.contains('alert-info')).toBe(true)
      expect(alerts[1].classList.contains('alert-success')).toBe(true)
      expect(alerts[2].classList.contains('alert-error')).toBe(true)
    })
  })

  it('applies outline, dash and soft classes', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Alert outline={true} dash={true} soft={true}>
          x
        </Alert>,
        container,
      ),
    )

    await waitForContent(() => {
      const el = container.querySelector('[role="alert"]') as HTMLElement
      expect(el.classList.contains('alert-outline')).toBe(true)
      expect(el.classList.contains('alert-dash')).toBe(true)
      expect(el.classList.contains('alert-soft')).toBe(true)
    })
  })

  it('applies direction classes', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <div>
          <Alert direction="vertical">Vertical</Alert>
          <Alert direction="horizontal">Horizontal</Alert>
        </div>,
        container,
      ),
    )

    await waitForContent(() => {
      const alerts = Array.from(container.querySelectorAll('[role="alert"]')) as HTMLElement[]
      expect(alerts[0].classList.contains('alert-vertical')).toBe(true)
      expect(alerts[1].classList.contains('alert-horizontal')).toBe(true)
    })
  })

  it('renders structured content with icon and action area', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Alert
          type="warning"
          title="Heads up"
          description="This workspace uses staged preview data."
        >
          <Template slot="action">
            <button className="btn btn-xs">Review</button>
          </Template>
        </Alert>,
        container,
      ),
    )

    await waitForContent(() => {
      const el = container.querySelector('[role="alert"]') as HTMLElement
      expect(el.textContent).toContain('Heads up')
      expect(el.textContent).toContain('This workspace uses staged preview data.')
      expect(el.querySelector('button.btn')).toBeTruthy()
      expect(el.classList.contains('items-start')).toBe(true)
      expect(el.classList.contains('items-center')).toBe(false)
    })
  })

  it('centers icon for plain content alerts with actions', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Alert showIcon={true}>
          <Template slot="action">
            <button className="btn btn-xs">Accept</button>
          </Template>
          <span>we use cookies for no reason.</span>
        </Alert>,
        container,
      ),
    )

    await waitForContent(() => {
      const el = container.querySelector('[role="alert"]') as HTMLElement
      const content = el.querySelector('.min-w-0.flex.flex-1.items-center.gap-2') as HTMLElement
      const actions = el.querySelector('.flex.shrink-0.items-center.gap-2') as HTMLElement
      expect(el.classList.contains('items-center')).toBe(true)
      expect(el.classList.contains('items-start')).toBe(false)
      expect(content).toBeTruthy()
      expect(actions).toBeTruthy()
    })
  })

  it('keeps plain children content in a horizontal row', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Alert>
          <span id="icon">i</span>
          <span id="text">Message</span>
        </Alert>,
        container,
      ),
    )

    await waitForContent(() => {
      const el = container.querySelector('[role="alert"]') as HTMLElement
      const content = el.querySelector('.min-w-0.flex.flex-1.items-center.gap-2') as HTMLElement
      expect(content).toBeTruthy()
      expect(content.querySelector('#icon')).toBeTruthy()
      expect(content.querySelector('#text')?.textContent).toBe('Message')
    })
  })

  it('supports closable alerts and invokes close callbacks', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleClose = vi.fn()
    const handleAfterClose = vi.fn()

    mountTestApp(container, () =>
      render(
        <Alert closable={true} onClose={handleClose} afterClose={handleAfterClose}>
          Dismiss me
        </Alert>,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('[role="alert"]')).toBeTruthy()
    })

    const button = container.querySelector('button[aria-label="Close alert"]') as HTMLButtonElement
    button.click()

    expect(handleClose).toHaveBeenCalledTimes(1)
    expect(handleAfterClose).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('defaults banner to warning tone and auto-enables closeText', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <div>
          <Alert banner={true} title="Maintenance window" />
          <Alert closeText="知道了">Saved</Alert>
        </div>,
        container,
      ),
    )

    await waitForContent(() => {
      const alerts = Array.from(container.querySelectorAll('[role="alert"]')) as HTMLElement[]
      expect(alerts[0].classList.contains('alert-warning')).toBe(true)
      expect(alerts[0].querySelector('[aria-hidden="true"]')).toBeTruthy()
      const closeButton = alerts[1].querySelector(
        'button[aria-label="Close alert"]',
      ) as HTMLButtonElement
      expect(closeButton).toBeTruthy()
      expect(closeButton.textContent).toContain('知道了')
    })
  })

  it('appends custom className and forwards children nodes', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Alert className="w-full">
          <span id="t">child</span>
        </Alert>,
        container,
      ),
    )

    await waitForContent(() => {
      const alert = container.querySelector('[role="alert"]') as HTMLElement
      const child = container.querySelector('#t') as HTMLElement
      expect(alert.classList.contains('w-full')).toBe(true)
      expect(child).toBeTruthy()
      expect(child.textContent).toBe('child')
    })
  })
})
