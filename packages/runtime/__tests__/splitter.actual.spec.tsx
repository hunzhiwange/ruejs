import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import SplitterPage from '../../../app/pages/design/Splitter'
import { render, click, mountContainer, waitForContent } from './page-test-utils'
import { findDemo, findTabButton, resetActiveRuntime } from './design-page-test-utils'

const findButton = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button')).find(
    button => button.textContent?.trim() === label,
  ) ?? null

const mockSplitterRect = (root: HTMLElement, width: number, height = 320) => {
  Object.defineProperty(root, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  })
  window.dispatchEvent(new Event('resize'))
}

vi.mock('../../../app/pages/site/SidebarPlaygroundDesign', () => ({
  default: (props: { children?: unknown }) => (
    <div data-testid="mock-sidebar-design">{props.children}</div>
  ),
}))

vi.mock('../../../app/pages/site/components/Code', () => ({
  default: (props: { code?: string }) => <pre data-testid="mock-code">{props.code ?? ''}</pre>,
}))

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('Splitter actual page', () => {
  it('renders demos without object-object text and preserves interactive handles after toggling code', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<SplitterPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Splitter 分割面板')
      expect(container.textContent).not.toContain('[object Object]')
      expect(container.querySelectorAll('.component-preview').length).toBe(5)
    })

    const basicDemo = findDemo(container, '# Basic workspace split') as HTMLElement | null
    expect(basicDemo).not.toBeNull()

    await waitForContent(() => {
      const handle = basicDemo!.querySelector('[data-rue-splitter-handle="0"]') as HTMLElement
      expect(handle).not.toBeNull()
      expect(handle.className).toContain('pointer-events-auto')
      expect(basicDemo!.textContent).not.toContain('[object Object]')
    })

    await click(findTabButton(basicDemo!, 'JSX代码'))

    const basicCodeDemo = findDemo(container, '# Basic workspace split') as HTMLElement | null
    expect(basicCodeDemo).not.toBeNull()
    expect(basicCodeDemo!.querySelector('[data-testid="mock-code"]')).not.toBeNull()

    await click(findTabButton(basicCodeDemo!, '预览'))

    await waitForContent(() => {
      const restoredDemo = findDemo(container, '# Basic workspace split') as HTMLElement | null
      const restoredHandle = restoredDemo!.querySelector(
        '[data-rue-splitter-handle="0"]',
      ) as HTMLElement
      expect(restoredDemo).not.toBeNull()
      expect(restoredDemo!.textContent).not.toContain('[object Object]')
      expect(restoredHandle.className).toContain('pointer-events-auto')
    })
  })

  it('locks and restores the left panel in the controlled demo', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<SplitterPage />, container)

    let controlledDemo: HTMLElement | null = null

    await waitForContent(() => {
      controlledDemo = findDemo(container, '# Controlled sizes and reset') as HTMLElement | null
      expect(controlledDemo).not.toBeNull()
      const root = controlledDemo!.querySelector('[data-rue-splitter-root="true"]') as HTMLElement
      expect(root).not.toBeNull()
      mockSplitterRect(root, 600, 300)
      expect(controlledDemo!.querySelector('[data-rue-splitter-handle="0"]')).not.toBeNull()
    })

    const edgeHandle = controlledDemo!.querySelector(
      '[data-rue-splitter-handle="0"]',
    ) as HTMLElement
    edgeHandle.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 228, button: 0 }),
    )
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 0 }))
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

    await waitForContent(() => {
      const resizedPanels = controlledDemo!.querySelectorAll('[data-rue-splitter-panel="true"]')
      const firstPanel = resizedPanels[0] as HTMLElement

      expect(parseFloat(firstPanel.style.flexBasis)).toBe(0)
      expect(edgeHandle.style.left).toBe('0px')
    })

    edgeHandle.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 1, button: 0 }),
    )
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 180 }))
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

    await waitForContent(() => {
      const resizedPanels = controlledDemo!.querySelectorAll('[data-rue-splitter-panel="true"]')
      const firstPanel = resizedPanels[0] as HTMLElement

      expect(parseFloat(firstPanel.style.flexBasis)).toBeGreaterThan(170)
    })

    await click(findButton(controlledDemo!, '平分'))

    await waitForContent(() => {
      const resetPanels = controlledDemo!.querySelectorAll('[data-rue-splitter-panel="true"]')
      const firstPanel = resetPanels[0] as HTMLElement

      expect(parseFloat(firstPanel.style.flexBasis)).toBe(300)
    })

    const panels = controlledDemo!.querySelectorAll('[data-rue-splitter-panel="true"]')
    const beforeLock = parseFloat((panels[0] as HTMLElement).style.flexBasis)

    await click(findButton(controlledDemo!, '锁定左栏'))

    await waitForContent(() => {
      expect(controlledDemo!.textContent).toContain('已锁定左栏拖拽')
      expect(findButton(controlledDemo!, '恢复拖拽')).not.toBeNull()
    })

    const lockedHandle = controlledDemo!.querySelector(
      '[data-rue-splitter-handle="0"]',
    ) as HTMLElement
    lockedHandle.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 280, button: 0 }),
    )
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 360 }))
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

    await waitForContent(() => {
      const refreshedPanels = controlledDemo!.querySelectorAll('[data-rue-splitter-panel="true"]')
      const firstPanel = refreshedPanels[0] as HTMLElement

      expect(parseFloat(firstPanel.style.flexBasis)).toBe(beforeLock)
    })

    await click(findButton(controlledDemo!, '恢复拖拽'))

    await waitForContent(() => {
      expect(controlledDemo!.textContent).toContain('已恢复左栏拖拽')
    })

    const restoredHandle = controlledDemo!.querySelector(
      '[data-rue-splitter-handle="0"]',
    ) as HTMLElement
    restoredHandle.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 280, button: 0 }),
    )
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 360 }))
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

    await waitForContent(() => {
      const refreshedPanels = controlledDemo!.querySelectorAll('[data-rue-splitter-panel="true"]')
      const firstPanel = refreshedPanels[0] as HTMLElement
      const secondPanel = refreshedPanels[1] as HTMLElement

      expect(parseFloat(firstPanel.style.flexBasis)).toBeGreaterThan(beforeLock)
      expect((secondPanel.textContent?.match(/受控尺寸：/g) ?? []).length).toBe(1)
    })
  })

  it('keeps the vertical demo at a fixed rendered height when numeric height is provided', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<SplitterPage />, container)

    let verticalDemo: HTMLElement | null = null

    await waitForContent(() => {
      verticalDemo = findDemo(container, '# Vertical split') as HTMLElement | null
      expect(verticalDemo).not.toBeNull()

      const root = verticalDemo!.querySelector('[data-rue-splitter-root="true"]') as HTMLElement
      expect(root).not.toBeNull()
      expect(root.style.height).toBe('520px')

      mockSplitterRect(root, 640, 520)
      expect(verticalDemo!.querySelector('[data-rue-splitter-handle="0"]')).not.toBeNull()
    })

    const root = verticalDemo!.querySelector('[data-rue-splitter-root="true"]') as HTMLElement
    const handle = verticalDemo!.querySelector('[data-rue-splitter-handle="0"]') as HTMLElement

    handle.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientY: 148, button: 0 }),
    )
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: 210 }))
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

    await waitForContent(() => {
      expect(root.style.height).toBe('520px')
    })
  })
})
