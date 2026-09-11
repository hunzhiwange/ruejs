import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref, render, setReactiveScheduling } from '@rue-js/rue'
import Range from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Range', () => {
  it('renders range input and forwards min/max/value/step', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(<Range min={0} max={100} value={40} step={5} className="w-xs" />, container),
    )

    await waitForContent(() => {
      const input = container.querySelector('input.range') as HTMLInputElement
      expect(input).toBeTruthy()
      expect(input.type).toBe('range')
      expect(input.getAttribute('min')).toBe('0')
      expect(input.getAttribute('max')).toBe('100')
      expect(input.getAttribute('step')).toBe('5')
      expect(input.value).toBe('40')
      expect(input.classList.contains('w-xs')).toBe(true)
    })
  })

  it('applies color and size modifiers', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () => render(<Range color="secondary" size="large" />, container))

    await waitForContent(() => {
      const input = container.querySelector('input.range') as HTMLInputElement
      expect(input.classList.contains('range-secondary')).toBe(true)
      expect(input.classList.contains('range-lg')).toBe(true)
    })
  })

  it('forwards disabled state and input handlers', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleInput = vi.fn()

    mountTestApp(container, () =>
      render(<Range disabled={true} data-testid="range" onInput={handleInput} />, container),
    )

    await waitForContent(() => {
      const input = container.querySelector('[data-testid="range"]') as HTMLInputElement
      expect(input.disabled).toBe(true)
    })

    const input = container.querySelector('[data-testid="range"]') as HTMLInputElement
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(handleInput).toHaveBeenCalledTimes(1)
  })

  it('renders enhanced layout with label, helper, marks and value output', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Range
          min={0}
          max={100}
          value={50}
          label="Storage"
          hint="Sync cache size"
          helper="Larger cache uses more memory"
          showValue={{ formatter: value => `${value} GB` }}
          marks={[0, { value: 50, label: 'Balanced' }, { value: 100, label: 'Max' }]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-rue-range-root="true"]') as HTMLDivElement
      const output = container.querySelector('[data-rue-range-output="true"]') as HTMLOutputElement
      const marks = container.querySelectorAll('[data-rue-range-mark]')

      expect(root).toBeTruthy()
      expect(root.textContent).toContain('Storage')
      expect(root.textContent).toContain('Sync cache size')
      expect(root.textContent).toContain('Larger cache uses more memory')
      expect(output.textContent).toContain('50 GB')
      expect(marks).toHaveLength(3)
    })
  })

  it('supports uncontrolled updates and semantic value callbacks', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleValueChange = vi.fn()
    const handleValueCommit = vi.fn()

    mountTestApp(container, () =>
      render(
        <Range
          min={0}
          max={100}
          defaultValue={20}
          showValue={true}
          onValueChange={handleValueChange}
          onValueCommit={handleValueCommit}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const output = container.querySelector('[data-rue-range-output="true"]') as HTMLOutputElement
      expect(output.textContent).toContain('20')
    })

    const input = container.querySelector('input.range') as HTMLInputElement
    input.value = '70'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      const output = container.querySelector('[data-rue-range-output="true"]') as HTMLOutputElement
      expect(output.textContent).toContain('70')
    })

    input.dispatchEvent(new Event('change', { bubbles: true }))

    expect(handleValueChange).toHaveBeenCalledTimes(1)
    expect(handleValueChange.mock.calls[0][0]).toBe(70)
    expect(handleValueCommit).toHaveBeenCalledTimes(1)
    expect(handleValueCommit.mock.calls[0][0]).toBe(70)
  })

  it('coalesces high-frequency semantic value changes during drag', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleInput = vi.fn()
    const handleValueChange = vi.fn()
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame
    const originalCancelAnimationFrame = globalThis.cancelAnimationFrame
    const frameCallbacks = new Map<number, FrameRequestCallback>()
    let frameId = 0

    ;(globalThis as any).requestAnimationFrame = (callback: FrameRequestCallback) => {
      frameId += 1
      frameCallbacks.set(frameId, callback)
      return frameId
    }
    ;(globalThis as any).cancelAnimationFrame = (id: number) => {
      frameCallbacks.delete(id)
    }

    try {
      mountTestApp(container, () =>
        render(
          <Range
            min={0}
            max={100}
            defaultValue={10}
            showValue={true}
            onInput={handleInput}
            onValueChange={handleValueChange}
          />,
          container,
        ),
      )

      await waitForContent(() => {
        const output = container.querySelector(
          '[data-rue-range-output="true"]',
        ) as HTMLOutputElement
        expect(output.textContent).toContain('10')
      })

      const input = container.querySelector('input.range') as HTMLInputElement
      for (const nextValue of ['20', '30', '40']) {
        input.value = nextValue
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }

      expect(input.value).toBe('40')
      expect(handleInput).toHaveBeenCalledTimes(3)
      expect(handleValueChange).not.toHaveBeenCalled()
      expect(frameCallbacks.size).toBe(1)

      for (const callback of frameCallbacks.values()) {
        callback(performance.now())
      }
      frameCallbacks.clear()

      await waitForContent(() => {
        const output = container.querySelector(
          '[data-rue-range-output="true"]',
        ) as HTMLOutputElement
        expect(output.textContent).toContain('40')
      })

      expect(handleValueChange).toHaveBeenCalledTimes(1)
      expect(handleValueChange.mock.calls[0][0]).toBe(40)
    } finally {
      ;(globalThis as any).requestAnimationFrame = originalRequestAnimationFrame
      ;(globalThis as any).cancelAnimationFrame = originalCancelAnimationFrame
    }
  })

  it('emits semantic value changes for controlled change-only interactions', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleValueChange = vi.fn()
    const level = ref(10)

    const Preview = () => {
      return (
        <Range
          data-testid="range-change-only"
          min={0}
          max={100}
          value={level}
          showValue={{ formatter: value => `${value}%` }}
          onValueChange={(nextValue, event) => {
            handleValueChange(nextValue, event)
            level.value = nextValue
          }}
        />
      )
    }

    mountTestApp(container, () => render(<Preview />, container))

    await waitForContent(() => {
      const input = container.querySelector('[data-testid="range-change-only"]') as HTMLInputElement
      const output = container.querySelector('[data-rue-range-output="true"]') as HTMLOutputElement

      expect(input.value).toBe('10')
      expect(output.textContent).toContain('10%')
    })

    let input = container.querySelector('[data-testid="range-change-only"]') as HTMLInputElement
    input.value = '70'
    input.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      const currentInput = container.querySelector(
        '[data-testid="range-change-only"]',
      ) as HTMLInputElement
      const output = container.querySelector('[data-rue-range-output="true"]') as HTMLOutputElement

      expect(currentInput.value).toBe('70')
      expect(output.textContent).toContain('70%')
    })

    level.value = 10

    await waitForContent(() => {
      const currentInput = container.querySelector(
        '[data-testid="range-change-only"]',
      ) as HTMLInputElement
      expect(currentInput.value).toBe('10')
    })

    input = container.querySelector('[data-testid="range-change-only"]') as HTMLInputElement
    input.value = '70'
    input.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      const currentInput = container.querySelector(
        '[data-testid="range-change-only"]',
      ) as HTMLInputElement
      expect(currentInput.value).toBe('70')
      expect(handleValueChange).toHaveBeenCalledTimes(2)
      expect(handleValueChange.mock.calls.map(call => call[0])).toEqual([70, 70])
    })
  })

  it('keeps the native thumb on the active drag value when controlled updates lag', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleValueChange = vi.fn()
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame
    const originalCancelAnimationFrame = globalThis.cancelAnimationFrame
    const frameCallbacks = new Map<number, FrameRequestCallback>()
    let frameId = 0
    let setLevel = (_value: number) => {}

    ;(globalThis as any).requestAnimationFrame = (callback: FrameRequestCallback) => {
      frameId += 1
      frameCallbacks.set(frameId, callback)
      return frameId
    }
    ;(globalThis as any).cancelAnimationFrame = (id: number) => {
      frameCallbacks.delete(id)
    }

    try {
      const Preview = () => {
        const level = ref(10)
        setLevel = value => {
          level.value = value
        }

        return (
          <Range
            data-testid="range-controlled-drag"
            min={0}
            max={100}
            value={level}
            showValue={{ formatter: value => `${value}%` }}
            marks={[0, 25, 50, 75, 100]}
            onValueChange={handleValueChange}
          />
        )
      }

      mountTestApp(container, () => render(<Preview />, container))

      await waitForContent(() => {
        const input = container.querySelector(
          '[data-testid="range-controlled-drag"]',
        ) as HTMLInputElement
        expect(input.value).toBe('10')
      })

      const input = container.querySelector(
        '[data-testid="range-controlled-drag"]',
      ) as HTMLInputElement
      input.value = '80'
      input.dispatchEvent(new Event('input', { bubbles: true }))

      setLevel(20)

      await waitForContent(() => {
        const output = container.querySelector(
          '[data-rue-range-output="true"]',
        ) as HTMLOutputElement
        const activeMark = container.querySelector('[data-rue-range-mark="75"]') as HTMLSpanElement

        expect(input.value).toBe('80')
        expect(input.getAttribute('aria-valuenow')).toBe('80')
        expect(output.textContent).toContain('80%')
        expect(activeMark.className).toContain('font-medium')
      })

      expect(handleValueChange).not.toHaveBeenCalled()

      for (const callback of frameCallbacks.values()) {
        callback(performance.now())
      }
      frameCallbacks.clear()

      expect(handleValueChange).toHaveBeenCalledTimes(1)
      expect(handleValueChange.mock.calls[0][0]).toBe(80)
    } finally {
      ;(globalThis as any).requestAnimationFrame = originalRequestAnimationFrame
      ;(globalThis as any).cancelAnimationFrame = originalCancelAnimationFrame
    }
  })

  it('updates enhanced controlled value from ref props across a component boundary', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    let setLevel = (_value: number) => {}

    const Preview = () => {
      const level = ref(25)
      setLevel = value => {
        level.value = value
      }

      return (
        <Range
          data-testid="range-ref"
          min={0}
          max={100}
          value={level}
          showValue={{ formatter: value => `${value}%` }}
          marks={[0, 25, 50, 75, 100]}
        />
      )
    }

    mountTestApp(container, () => render(<Preview />, container))

    await waitForContent(() => {
      const input = container.querySelector('[data-testid="range-ref"]') as HTMLInputElement
      const output = container.querySelector('[data-rue-range-output="true"]') as HTMLOutputElement

      expect(input.value).toBe('25')
      expect(input.getAttribute('aria-valuenow')).toBe('25')
      expect(output.textContent).toContain('25%')
    })

    setLevel(75)

    await waitForContent(() => {
      const input = container.querySelector('[data-testid="range-ref"]') as HTMLInputElement
      const output = container.querySelector('[data-rue-range-output="true"]') as HTMLOutputElement
      const activeMark = container.querySelector('[data-rue-range-mark="75"]') as HTMLSpanElement
      const inactiveMark = container.querySelector('[data-rue-range-mark="100"]') as HTMLSpanElement

      expect(input.value).toBe('75')
      expect(input.getAttribute('aria-valuenow')).toBe('75')
      expect(output.textContent).toContain('75%')
      expect(activeMark.className).toContain('font-medium')
      expect(inactiveMark.className).toContain('text-base-content/55')
    })
  })
})
