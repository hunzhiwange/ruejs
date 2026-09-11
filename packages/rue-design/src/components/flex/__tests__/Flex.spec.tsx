import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import Flex from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Flex', () => {
  it('renders the base flex container and forwards className', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Flex className="rounded-box border border-base-300" data-testid="flex-root">
          <div>A</div>
          <div>B</div>
        </Flex>,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="flex-root"]') as HTMLElement
      expect(element.classList.contains('rue-flex')).toBe(true)
      expect(element.classList.contains('rounded-box')).toBe(true)
      expect(element.classList.contains('border')).toBe(true)
      expect(element.style.display).toBe('flex')
      expect(element.style.flexDirection).toBe('row')
      expect(element.style.alignItems).toBe('flex-start')
      expect(element.children.length).toBe(2)
    })
  })

  it('supports orientation precedence, inline display and default vertical alignment', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Flex vertical orientation="horizontal" inline data-testid="flex-orientation-override" />,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector(
        '[data-testid="flex-orientation-override"]',
      ) as HTMLElement
      expect(element.style.display).toBe('inline-flex')
      expect(element.style.flexDirection).toBe('row')
      expect(element.dataset.rueOrientation).toBe('horizontal')
      expect(element.style.alignItems).toBe('flex-start')
    })
  })

  it('maps justify align wrap and gap props to inline styles', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Flex justify="between" align="middle" wrap gap="medium" data-testid="flex-layout" />,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="flex-layout"]') as HTMLElement
      expect(element.style.justifyContent).toBe('space-between')
      expect(element.style.alignItems).toBe('center')
      expect(element.style.flexWrap).toBe('wrap')
      expect(element.style.gap).toBe('16px')
    })
  })

  it('supports custom root nodes, numeric gap and flex shorthand', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Flex as="section" id="flex-section" flex="1 0 240px" gap={12} data-testid="flex-as" />,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="flex-as"]') as HTMLElement
      expect(element.tagName.toLowerCase()).toBe('section')
      expect(element.id).toBe('flex-section')
      expect(element.style.flex).toBe('1 0 240px')
      expect(element.style.gap).toBe('12px')
    })
  })

  it('defaults vertical layouts to stretch on the cross axis', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () => render(<Flex vertical data-testid="flex-vertical" />, container))

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="flex-vertical"]') as HTMLElement
      expect(element.style.flexDirection).toBe('column')
      expect(element.style.alignItems).toBe('stretch')
      expect(element.dataset.rueOrientation).toBe('vertical')
    })
  })
})
