import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import Stack from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Stack', () => {
  it('renders the base stack container and forwards className', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Stack className="h-20 w-32" data-testid="stack-root">
          <div>A</div>
          <div>B</div>
        </Stack>,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="stack-root"]') as HTMLElement
      expect(element.classList.contains('stack')).toBe(true)
      expect(element.classList.contains('h-20')).toBe(true)
      expect(element.classList.contains('w-32')).toBe(true)
      expect(element.children.length).toBe(2)
    })
  })

  it('applies vertical and horizontal alignment modifiers', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(<Stack vertical="top" horizontal="end" data-testid="stack-align" />, container),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="stack-align"]') as HTMLElement
      expect(element.classList.contains('stack-top')).toBe(true)
      expect(element.classList.contains('stack-end')).toBe(true)
    })
  })

  it('supports placement as a combined alignment shortcut', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(<Stack placement="bottom-start" data-testid="stack-placement" />, container),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="stack-placement"]') as HTMLElement
      expect(element.classList.contains('stack-bottom')).toBe(true)
      expect(element.classList.contains('stack-start')).toBe(true)
    })
  })

  it('lets explicit align props override placement presets', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Stack placement="top-end" horizontal="start" data-testid="stack-placement-override" />,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector(
        '[data-testid="stack-placement-override"]',
      ) as HTMLElement
      expect(element.classList.contains('stack-top')).toBe(true)
      expect(element.classList.contains('stack-start')).toBe(true)
      expect(element.classList.contains('stack-end')).toBe(false)
    })
  })

  it('supports reversing children order', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Stack
          reverse
          data-testid="stack-reverse"
          items={[{ content: 'A' }, { content: 'B' }, { content: 'C' }]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="stack-reverse"]') as HTMLElement
      const order = Array.from(element.children).map(child => child.textContent)
      expect(order).toEqual(['C', 'B', 'A'])
    })
  })

  it('supports custom tags and forwards attrs', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(<Stack as="section" id="stack-section" data-testid="stack-section" />, container),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="stack-section"]') as HTMLElement
      expect(element.tagName.toLowerCase()).toBe('section')
      expect(element.id).toBe('stack-section')
    })
  })
})
