import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'

import Diff from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Diff', () => {
  it('renders with base class and children in legacy compound mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () => render(<Diff>{'x'}</Diff>, container))

    await waitForContent(() => {
      const element = container.querySelector('.diff') as HTMLElement
      expect(element).toBeTruthy()
      expect(element.classList.contains('diff')).toBe(true)
      expect(element.textContent).toContain('x')
    })
  })

  it('applies custom className and tabIndex in legacy mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Diff className={'rounded-field aspect-16/9'} tabIndex={0}>
          {'y'}
        </Diff>,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector('figure.diff') as HTMLElement
      const styleAttr = (element.getAttribute('style') ?? '').replace(/:\s+/g, ':')
      expect(element.classList.contains('rounded-field')).toBe(true)
      expect(element.classList.contains('aspect-16/9')).toBe(true)
      expect(element.tabIndex).toBe(0)
      expect(styleAttr).toContain('display:grid')
      expect(styleAttr).toContain('justify-content:normal')
      expect(styleAttr).toContain('align-items:stretch')
    })
  })

  it('renders Item1, Item2, and Resizer subcomponents', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Diff>
          <Diff.Item1 role={'img'} tabIndex={0}>
            <div id={'a'}>{'A'}</div>
          </Diff.Item1>
          <Diff.Item2 role={'img'}>
            <div id={'b'}>{'B'}</div>
          </Diff.Item2>
          <Diff.Resizer />
        </Diff>,
        container,
      ),
    )

    await waitForContent(() => {
      const item1 = container.querySelector('.diff-item-1') as HTMLElement
      const item2 = container.querySelector('.diff-item-2') as HTMLElement
      const resizer = container.querySelector('.diff-resizer') as HTMLElement
      expect(item1).toBeTruthy()
      expect(item1.getAttribute('role')).toBe('img')
      expect(item1.tabIndex).toBe(0)
      expect(item2).toBeTruthy()
      expect(item2.getAttribute('role')).toBe('img')
      expect(resizer).toBeTruthy()
      expect(container.querySelector('#a')?.textContent).toBe('A')
      expect(container.querySelector('#b')?.textContent).toBe('B')
    })
  })

  it('renders quick mode with labels, resizer content and range input', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Diff
          className="aspect-16/9"
          value={30}
          item1={<div id="before">Before</div>}
          item2={<div id="after">After</div>}
          item1Label="Before"
          item2Label="After"
          resizerContent="vs"
          aria-label="Demo diff"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const input = container.querySelector('input[type="range"]') as HTMLInputElement
      const root = container.querySelector('figure.diff') as HTMLElement
      const item1 = container.querySelector('.diff-item-1') as HTMLElement
      const item2 = container.querySelector('.diff-item-2') as HTMLElement
      const resizer = container.querySelector('.diff-resizer') as HTMLElement
      const rootStyle = (root.getAttribute('style') ?? '').replace(/:\s+/g, ':')
      const item1Style = (item1.getAttribute('style') ?? '').replace(/:\s+/g, ':')
      const item2Style = (item2.getAttribute('style') ?? '').replace(/:\s+/g, ':')
      const resizerStyle = (resizer.getAttribute('style') ?? '').replace(/:\s+/g, ':')
      expect(input).toBeTruthy()
      expect(input.value).toBe('30')
      expect(input.getAttribute('aria-label')).toBe('Demo diff')
      expect(rootStyle).toContain('display:grid')
      expect(rootStyle).toContain('justify-content:normal')
      expect(rootStyle).toContain('align-items:stretch')
      expect(rootStyle).toContain('--rue-diff-position:30%')
      expect(item1.classList.contains('absolute')).toBe(true)
      expect(item2.classList.contains('absolute')).toBe(true)
      expect(item1Style).toContain(
        'clip-path:inset(0 calc(100% - var(--rue-diff-position, 50%)) 0 0)',
      )
      expect(item2Style).toContain('clip-path:inset(0 0 0 var(--rue-diff-position, 50%))')
      expect(resizerStyle).toContain('left:var(--rue-diff-position, 50%)')
      expect(resizerStyle).toContain('width:0')
      expect(container.textContent).toContain('Before')
      expect(container.textContent).toContain('After')
      expect(container.textContent).toContain('vs')
    })
  })

  it('updates uncontrolled quick mode value and emits onChange', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <Diff
          defaultValue={25}
          item1={<div>Alpha</div>}
          item2={<div>Beta</div>}
          onChange={handleChange}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const input = container.querySelector('input[type="range"]') as HTMLInputElement
      expect(input.value).toBe('25')
    })

    const input = container.querySelector('input[type="range"]') as HTMLInputElement
    input.value = '80'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      const root = container.querySelector('figure.diff') as HTMLElement
      const rootStyle = (root.getAttribute('style') ?? '').replace(/:\s+/g, ':')
      expect(handleChange).toHaveBeenCalledTimes(1)
      expect(handleChange).toHaveBeenCalledWith(80, expect.any(Event))
      expect(rootStyle.replace(/\s/g, '')).toContain('--rue-diff-position:80%')
    })
  })

  it('keeps controlled dragging visual-only until the value is committed', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <Diff
          value={25}
          item1={<div>Alpha</div>}
          item2={<div>Beta</div>}
          onChange={handleChange}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const input = container.querySelector('input[type="range"]') as HTMLInputElement
      expect(input.value).toBe('25')
    })

    const input = container.querySelector('input[type="range"]') as HTMLInputElement
    input.value = '80'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      const root = container.querySelector('figure.diff') as HTMLElement
      const rootStyle = (root.getAttribute('style') ?? '').replace(/:\s+/g, ':')
      expect(rootStyle.replace(/\s/g, '')).toContain('--rue-diff-position:80%')
      expect(handleChange).not.toHaveBeenCalled()
    })

    input.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      expect(handleChange).toHaveBeenCalledTimes(1)
      expect(handleChange).toHaveBeenCalledWith(80, expect.any(Event))
    })
  })
})
