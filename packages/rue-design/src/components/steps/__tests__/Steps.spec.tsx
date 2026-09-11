import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import Steps from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Steps', () => {
  it('renders the root with direction and className', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Steps direction="vertical" className="w-full" data-testid="steps-root">
          <Steps.Step>Register</Steps.Step>
        </Steps>,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="steps-root"]') as HTMLElement
      expect(element.tagName.toLowerCase()).toBe('ul')
      expect(element.classList.contains('steps')).toBe(true)
      expect(element.classList.contains('steps-vertical')).toBe(true)
      expect(element.classList.contains('w-full')).toBe(true)
    })
  })

  it('renders colored steps and step-icon parts', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Steps>
          <Steps.Step color="primary" data-testid="step-item">
            <Steps.Icon data-testid="step-icon">1</Steps.Icon>
            Register
          </Steps.Step>
        </Steps>,
        container,
      ),
    )

    await waitForContent(() => {
      const step = container.querySelector('[data-testid="step-item"]') as HTMLElement
      const icon = container.querySelector('[data-testid="step-icon"]') as HTMLElement
      expect(step.classList.contains('step')).toBe(true)
      expect(step.classList.contains('step-primary')).toBe(true)
      expect(icon.classList.contains('step-icon')).toBe(true)
      expect(step.textContent).toContain('Register')
    })
  })

  it('forwards attrs on step items and supports custom tags', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Steps.Step as="div" data-content="!" className="text-xs" data-testid="step-custom">
          Alert
        </Steps.Step>,
        container,
      ),
    )

    await waitForContent(() => {
      const step = container.querySelector('[data-testid="step-custom"]') as HTMLElement
      expect(step.tagName.toLowerCase()).toBe('div')
      expect(step.classList.contains('step')).toBe(true)
      expect(step.classList.contains('text-xs')).toBe(true)
      expect(step.getAttribute('data-content')).toBe('!')
    })
  })

  it('renders items with inferred statuses and structured content', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Steps
          current={1}
          status="error"
          items={[
            { title: 'Finished', description: 'done', 'data-testid': 'step-finished' },
            {
              title: 'In Progress',
              subTitle: 'Left 00:00:08',
              description: 'processing',
              'data-testid': 'step-current',
            },
            { title: 'Waiting', description: 'pending', 'data-testid': 'step-waiting' },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const finished = container.querySelector('[data-testid="step-finished"]') as HTMLElement
      const current = container.querySelector('[data-testid="step-current"]') as HTMLElement
      const waiting = container.querySelector('[data-testid="step-waiting"]') as HTMLElement

      expect(finished.classList.contains('step-primary')).toBe(true)
      expect(finished.getAttribute('data-content')).toBe('✓')
      expect(current.classList.contains('step-error')).toBe(true)
      expect(current.hasAttribute('aria-current')).toBe(true)
      expect(current.textContent).toContain('Left 00:00:08')
      expect(current.textContent).toContain('processing')
      expect(waiting.classList.contains('step-primary')).toBe(false)
      expect(waiting.getAttribute('data-content')).toBe(null)
    })
  })

  it('supports clickable items, progress dots, and disabled items', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const changed: number[] = []
    const clicked: number[] = []

    mountTestApp(container, () =>
      render(
        <Steps
          current={0}
          progressDot
          onChange={index => changed.push(index)}
          items={[
            { title: 'Start', 'data-testid': 'step-start' },
            {
              title: 'Review',
              'data-testid': 'step-review',
              onClick: (_, index) => clicked.push(index),
            },
            { title: 'Done', 'data-testid': 'step-done', disabled: true },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const review = container.querySelector('[data-testid="step-review"]') as HTMLElement
      const done = container.querySelector('[data-testid="step-done"]') as HTMLElement
      expect(container.querySelector('[data-rue-step-dot="0"]')).not.toBeNull()
      expect(review.getAttribute('role')).toBe('button')
      expect(done.getAttribute('aria-disabled')).toBe('true')
    })

    const review = container.querySelector('[data-testid="step-review"]') as HTMLElement
    const done = container.querySelector('[data-testid="step-done"]') as HTMLElement
    review.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    done.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(changed).toEqual([1])
    expect(clicked).toEqual([1])
  })
})
