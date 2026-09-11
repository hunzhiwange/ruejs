import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref, render, setReactiveScheduling } from '@rue-js/rue'
import Splitter from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

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

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Splitter', () => {
  it('renders default panel sizes from defaultSize and min/max constraints', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Splitter style={{ width: '500px', height: '240px' }} data-testid="splitter-root">
          <Splitter.Panel defaultSize="40%" min="20%" max="70%" data-testid="panel-a">
            Left
          </Splitter.Panel>
          <Splitter.Panel data-testid="panel-b">Right</Splitter.Panel>
        </Splitter>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="splitter-root"]') as HTMLElement
      expect(root).not.toBeNull()
      mockSplitterRect(root, 500, 240)

      const firstPanel = container.querySelector('[data-testid="panel-a"]') as HTMLElement
      const secondPanel = container.querySelector('[data-testid="panel-b"]') as HTMLElement
      expect(parseFloat(firstPanel.style.flexBasis)).toBeGreaterThan(190)
      expect(parseFloat(firstPanel.style.flexBasis)).toBeLessThan(201)
      expect(parseFloat(secondPanel.style.flexBasis)).toBeGreaterThan(280)
    })
  })

  it('drags adjacent panels and emits resize callbacks', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const onResizeStart = vi.fn()
    const onResize = vi.fn()
    const onResizeEnd = vi.fn()

    mountTestApp(container, () =>
      render(
        <Splitter
          style={{ width: '600px', height: '240px' }}
          data-testid="drag-root"
          onResizeStart={onResizeStart}
          onResize={onResize}
          onResizeEnd={onResizeEnd}
        >
          <Splitter.Panel data-testid="left-panel">Alpha</Splitter.Panel>
          <Splitter.Panel data-testid="right-panel">Beta</Splitter.Panel>
        </Splitter>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="drag-root"]') as HTMLElement
      mockSplitterRect(root, 600, 240)
      const handle = container.querySelector('[data-rue-splitter-handle="0"]') as HTMLElement
      expect(handle).not.toBeNull()
      expect(handle.style.width).toBe('3px')
      expect(handle.querySelector('button')).toBeNull()
    })

    const handle = container.querySelector('[data-rue-splitter-handle="0"]') as HTMLElement
    handle.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 294, button: 0 }),
    )
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 372 }))
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

    await waitForContent(() => {
      const leftPanel = container.querySelector('[data-testid="left-panel"]') as HTMLElement
      const rightPanel = container.querySelector('[data-testid="right-panel"]') as HTMLElement
      expect(parseFloat(leftPanel.style.flexBasis)).toBeGreaterThan(
        parseFloat(rightPanel.style.flexBasis),
      )
      expect(onResizeStart).toHaveBeenCalledTimes(1)
      expect(onResize).toHaveBeenCalled()
      expect(onResizeEnd).toHaveBeenCalledTimes(1)
    })
  })

  it('keeps a controlled edge handle draggable after a panel reaches zero size', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const sizes = ref<Array<number | string>>([300, 300])

    mountTestApp(container, () =>
      render(
        <Splitter
          style={{ width: '600px', height: '240px' }}
          data-testid="controlled-edge-root"
          onResize={next => {
            sizes.value = next
          }}
        >
          <Splitter.Panel size={sizes.value[0]} data-testid="controlled-left">
            Left
          </Splitter.Panel>
          <Splitter.Panel size={sizes.value[1]} data-testid="controlled-right">
            Right
          </Splitter.Panel>
        </Splitter>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="controlled-edge-root"]') as HTMLElement
      mockSplitterRect(root, 600, 240)
      const handle = container.querySelector('[data-rue-splitter-handle="0"]') as HTMLElement
      expect(handle).not.toBeNull()
      expect(handle.style.left).toBe('298.5px')
    })

    const handle = container.querySelector('[data-rue-splitter-handle="0"]') as HTMLElement
    handle.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 300, button: 0 }),
    )
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 0 }))
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

    await waitForContent(() => {
      const leftPanel = container.querySelector('[data-testid="controlled-left"]') as HTMLElement
      expect(parseFloat(leftPanel.style.flexBasis)).toBe(0)
      expect(handle.style.left).toBe('0px')
    })

    handle.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 1, button: 0 }),
    )
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 180 }))
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

    await waitForContent(() => {
      const leftPanel = container.querySelector('[data-testid="controlled-left"]') as HTMLElement
      const rightPanel = container.querySelector('[data-testid="controlled-right"]') as HTMLElement
      expect(parseFloat(leftPanel.style.flexBasis)).toBeGreaterThan(170)
      expect(parseFloat(rightPanel.style.flexBasis)).toBeLessThan(430)
    })
  })

  it('renders a simple 3px handle without extra controls', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Splitter style={{ width: '560px', height: '220px' }} data-testid="simplified-root">
          <Splitter.Panel defaultSize="40%" min="24%" max="70%" data-testid="navigation-panel">
            Navigation
          </Splitter.Panel>
          <Splitter.Panel data-testid="editor-panel">Editor</Splitter.Panel>
        </Splitter>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="simplified-root"]') as HTMLElement
      mockSplitterRect(root, 560, 220)
      const handle = container.querySelector('[data-rue-splitter-handle="0"]') as HTMLElement
      const navigationPanel = container.querySelector(
        '[data-testid="navigation-panel"]',
      ) as HTMLElement
      const editorPanel = container.querySelector('[data-testid="editor-panel"]') as HTMLElement

      expect(handle.querySelector('button')).toBeNull()
      expect(handle.textContent).toBe('')
      expect(handle.style.width).toBe('3px')
      expect(parseFloat(navigationPanel.style.flexBasis)).toBeGreaterThan(220)
      expect(parseFloat(editorPanel.style.flexBasis)).toBeGreaterThan(160)
    })
  })

  it('defers onResize emission in lazy mode and forwards double click callback', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const onResize = vi.fn()
    const onDraggerDoubleClick = vi.fn()

    mountTestApp(container, () =>
      render(
        <Splitter
          lazy
          style={{ width: '640px', height: '240px' }}
          data-testid="lazy-root"
          onResize={onResize}
          onDraggerDoubleClick={onDraggerDoubleClick}
        >
          <Splitter.Panel data-testid="lazy-left">A</Splitter.Panel>
          <Splitter.Panel data-testid="lazy-middle">B</Splitter.Panel>
          <Splitter.Panel data-testid="lazy-right">C</Splitter.Panel>
        </Splitter>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="lazy-root"]') as HTMLElement
      mockSplitterRect(root, 640, 240)
      expect(container.querySelector('[data-rue-splitter-handle="1"]')).not.toBeNull()
    })

    const handle = container.querySelector('[data-rue-splitter-handle="1"]') as HTMLElement
    handle.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: 430, button: 0 }),
    )
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 470 }))
    expect(onResize).not.toHaveBeenCalled()

    handle.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(onDraggerDoubleClick).toHaveBeenCalledWith(1)

    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

    await waitForContent(() => {
      expect(onResize).toHaveBeenCalledTimes(1)
    })
  })

  it('applies a default height for vertical layout and keeps it stable while dragging on the Y axis', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Splitter orientation="vertical" data-testid="vertical-root">
          <Splitter.Panel data-testid="vertical-top">Top</Splitter.Panel>
          <Splitter.Panel data-testid="vertical-bottom">Bottom</Splitter.Panel>
        </Splitter>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="vertical-root"]') as HTMLElement
      expect(root).not.toBeNull()
      expect(root.style.height).toBe('320px')
      mockSplitterRect(root, 360, 320)
      const handle = container.querySelector('[data-rue-splitter-handle="0"]') as HTMLElement
      expect(handle).not.toBeNull()
      expect(handle.style.height).toBe('3px')
    })

    const root = container.querySelector('[data-testid="vertical-root"]') as HTMLElement
    const handle = container.querySelector('[data-rue-splitter-handle="0"]') as HTMLElement
    handle.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientY: 154, button: 0 }),
    )
    window.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: 214 }))
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

    await waitForContent(() => {
      const topPanel = container.querySelector('[data-testid="vertical-top"]') as HTMLElement
      const bottomPanel = container.querySelector('[data-testid="vertical-bottom"]') as HTMLElement
      expect(root.style.height).toBe('320px')
      expect(parseFloat(topPanel.style.flexBasis)).toBeGreaterThan(
        parseFloat(bottomPanel.style.flexBasis),
      )
    })
  })
})
