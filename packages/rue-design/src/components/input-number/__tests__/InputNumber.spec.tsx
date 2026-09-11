import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, ref, setReactiveScheduling } from '@rue-js/rue'
import InputNumber from '../index'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

const createPointerLikeEvent = (type: string, pointerId = 1) => {
  const EventCtor = typeof PointerEvent === 'function' ? PointerEvent : MouseEvent
  return new EventCtor(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    pointerId,
  } as any)
}

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('InputNumber', () => {
  it('renders Rue input shell with controls and spinbutton semantics', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <InputNumber
          data-testid="price-input"
          defaultValue={128}
          prefix="￥"
          suffix="CNY"
          status="warning"
          variant="filled"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const input = container.querySelector('[data-testid="price-input"]') as HTMLInputElement
      const shell = container.querySelector('[data-rue-input-shell="true"]') as HTMLElement
      const controls = container.querySelector(
        '[data-rue-input-number-controls="true"]',
      ) as HTMLElement
      expect(input.value).toBe('128')
      expect(input.getAttribute('role')).toBe('spinbutton')
      expect(shell.tagName).toBe('DIV')
      expect(shell.classList.contains('input-warning')).toBe(true)
      expect(shell.classList.contains('border-transparent')).toBe(true)
      expect(controls).toBeTruthy()
      expect(shell.textContent).toContain('￥')
      expect(shell.textContent).toContain('CNY')
    })
  })

  it('does not make plain inputs read-only unless requested', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <div>
          <InputNumber data-testid="plain-input" readOnly={undefined} />
          <InputNumber data-testid="readonly-input" defaultValue={8} readOnly={true} />
        </div>,
        container,
      ),
    )

    await waitForContent(() => {
      const plainInput = container.querySelector('[data-testid="plain-input"]') as HTMLInputElement
      const readonlyInput = container.querySelector(
        '[data-testid="readonly-input"]',
      ) as HTMLInputElement
      expect(plainInput.hasAttribute('readonly')).toBe(false)
      expect(plainInput.readOnly).toBe(false)
      expect(readonlyInput.hasAttribute('readonly')).toBe(true)
      expect(readonlyInput.readOnly).toBe(true)
      expect(readonlyInput.getAttribute('readonly')).not.toBe('undefined')
    })
  })

  it('steps with handlers, keyboard and wheel while respecting bounds', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()
    const handleStep = vi.fn()

    mountTestApp(container, () =>
      render(
        <InputNumber
          data-testid="step-input"
          defaultValue={2}
          min={0}
          max={3}
          step={0.5}
          precision={1}
          changeOnWheel={true}
          onChange={handleChange}
          onStep={handleStep}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const input = container.querySelector('[data-testid="step-input"]') as HTMLInputElement
      expect(input.value).toBe('2.0')
    })

    const input = container.querySelector('[data-testid="step-input"]') as HTMLInputElement
    const increaseButton = container.querySelector(
      'button[aria-label="Increase value"]',
    ) as HTMLButtonElement
    const decreaseButton = container.querySelector(
      'button[aria-label="Decrease value"]',
    ) as HTMLButtonElement
    increaseButton.click()
    await waitForContent(() => {
      expect(input.value).toBe('2.5')
    })

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    await waitForContent(() => {
      expect(input.value).toBe('3.0')
    })

    input.focus()
    input.dispatchEvent(new WheelEvent('wheel', { deltaY: 20, bubbles: true }))
    await waitForContent(() => {
      expect(input.value).toBe('2.5')
    })

    decreaseButton.click()
    decreaseButton.click()
    decreaseButton.click()
    decreaseButton.click()
    decreaseButton.click()
    await waitForContent(() => {
      expect(input.value).toBe('0.0')
    })

    expect(handleStep).toHaveBeenCalled()
    expect(handleStep.mock.calls[0][1]).toMatchObject({
      type: 'up',
      emitter: 'handler',
      offset: 0.5,
    })
    expect(handleStep.mock.calls[1][1]).toMatchObject({
      type: 'up',
      emitter: 'keydown',
      offset: 0.5,
    })
    expect(handleStep.mock.calls[2][1]).toMatchObject({
      type: 'down',
      emitter: 'wheel',
      offset: -0.5,
    })
    expect(handleChange).toHaveBeenLastCalledWith(0)
  })

  it('does not force input focus when a pointer clicks step controls', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <div>
          <InputNumber data-testid="amount-input" defaultValue="0.1250" stringMode={true} />
          <InputNumber data-testid="fee-input" defaultValue="0.0008" stringMode={true} />
        </div>,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="amount-input"]')).toBeTruthy()
      expect(container.querySelector('[data-testid="fee-input"]')).toBeTruthy()
    })

    const amountInput = container.querySelector('[data-testid="amount-input"]') as HTMLInputElement
    const feeInput = container.querySelector('[data-testid="fee-input"]') as HTMLInputElement
    const increaseButtons = Array.from(
      container.querySelectorAll('button[aria-label="Increase value"]'),
    ) as HTMLButtonElement[]

    amountInput.focus()
    expect(document.activeElement).toBe(amountInput)

    increaseButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))

    await waitForContent(() => {
      expect(amountInput.value).toBe('1.125')
    })
    expect(document.activeElement).not.toBe(amountInput)
    expect(document.activeElement).not.toBe(feeInput)

    amountInput.focus()
    expect(document.activeElement).toBe(amountInput)

    increaseButtons[1].dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))

    await waitForContent(() => {
      expect(feeInput.value).toBe('1.0008')
    })
    expect(document.activeElement).not.toBe(amountInput)
    expect(document.activeElement).not.toBe(feeInput)
  })

  it('repeats formatter/parser steps while holding control buttons', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    const Demo = () => {
      const budget = ref(1000)

      return (
        <InputNumber
          data-testid="budget-input"
          value={budget.value}
          step={500}
          precision={0}
          formatter={(value, info) => (info.userTyping ? info.input : `$${value ?? ''}`)}
          parser={input => input.replace(/\$/g, '')}
          onChange={value => {
            handleChange(value)
            budget.value = Number(value ?? 0)
          }}
        />
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      const input = container.querySelector('[data-testid="budget-input"]') as HTMLInputElement
      expect(input.value).toBe('$1000')
    })

    vi.useFakeTimers()

    const input = container.querySelector('[data-testid="budget-input"]') as HTMLInputElement
    const increaseButton = container.querySelector(
      'button[aria-label="Increase value"]',
    ) as HTMLButtonElement
    increaseButton.dispatchEvent(createPointerLikeEvent('pointerdown'))
    expect(input.value).toBe('$1500')

    vi.advanceTimersByTime(450)
    expect(input.value).toBe('$2000')

    vi.advanceTimersByTime(160)
    expect(input.value).toBe('$3000')

    window.dispatchEvent(createPointerLikeEvent('pointerup'))
    vi.advanceTimersByTime(240)
    expect(input.value).toBe('$3000')

    increaseButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(input.value).toBe('$3000')

    const currentInput = container.querySelector('[data-testid="budget-input"]') as HTMLInputElement
    const currentDecreaseButton = container.querySelector(
      'button[aria-label="Decrease value"]',
    ) as HTMLButtonElement

    currentDecreaseButton.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }),
    )
    expect(currentInput.value).toBe('$2500')

    vi.advanceTimersByTime(450)
    expect(currentInput.value).toBe('$2000')

    vi.advanceTimersByTime(80)
    expect(currentInput.value).toBe('$1500')

    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 0 }))

    expect(handleChange).toHaveBeenLastCalledWith(1500)
  })

  it('keeps controlled formatter display responsive before parent value echoes back', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <InputNumber
          data-testid="controlled-lag-input"
          value={1000}
          step={500}
          precision={0}
          formatter={(value, info) => (info.userTyping ? info.input : `$${value ?? ''}`)}
          parser={input => input.replace(/\$/g, '')}
          onChange={handleChange}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const input = container.querySelector(
        '[data-testid="controlled-lag-input"]',
      ) as HTMLInputElement
      expect(input.value).toBe('$1000')
    })

    const input = container.querySelector(
      '[data-testid="controlled-lag-input"]',
    ) as HTMLInputElement
    const increaseButton = container.querySelector(
      'button[aria-label="Increase value"]',
    ) as HTMLButtonElement

    increaseButton.click()

    await waitForContent(() => {
      expect(input.value).toBe('$1500')
    })
    expect(handleChange).toHaveBeenLastCalledWith(1500)
  })

  it('supports formatter, parser, blur normalization and stringMode output', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <InputNumber
          data-testid="formatted-input"
          defaultValue="12.50"
          stringMode={true}
          max={15}
          precision={2}
          formatter={(value, info) => (info.userTyping ? info.input : `${value ?? ''}%`)}
          parser={input => input.replace(/%/g, '')}
          onChange={handleChange}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const input = container.querySelector('[data-testid="formatted-input"]') as HTMLInputElement
      expect(input.value).toBe('12.50%')
    })

    const input = container.querySelector('[data-testid="formatted-input"]') as HTMLInputElement
    input.value = '15.678%'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      expect(input.value).toBe('15.678')
    })

    input.dispatchEvent(new FocusEvent('blur', { bubbles: true }))

    await waitForContent(() => {
      expect(input.value).toBe('15.00%')
    })

    expect(handleChange.mock.calls[0][0]).toBe('15.678')
    expect(handleChange.mock.calls[handleChange.mock.calls.length - 1]?.[0]).toBe('15.00')
  })

  it('allows direct typing in controlled mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()
    const handleInput = vi.fn()

    const Demo = () => {
      const seats = ref(3)

      return (
        <InputNumber
          data-testid="manual-input"
          className="w-full"
          value={seats.value}
          min={1}
          max={12}
          onInput={(event: Event) => {
            handleInput(event)
          }}
          onChange={value => {
            handleChange(value)
            seats.value = Number(value ?? 1)
          }}
        />
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      const input = container.querySelector('[data-testid="manual-input"]') as HTMLInputElement
      expect(input.value).toBe('3')
    })

    const input = container.querySelector('[data-testid="manual-input"]') as HTMLInputElement
    input.value = '12'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      expect(input.value).toBe('12')
    })

    expect(handleChange).toHaveBeenLastCalledWith(12)
    expect(handleInput).toHaveBeenCalledTimes(1)
  })

  it('keeps composition text during IME input and normalizes full-width digits on commit', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(<InputNumber data-testid="ime-input" onChange={handleChange} />, container),
    )

    await waitForContent(() => {
      const input = container.querySelector('[data-testid="ime-input"]') as HTMLInputElement
      expect(input).toBeTruthy()
    })

    const input = container.querySelector('[data-testid="ime-input"]') as HTMLInputElement
    input.focus()
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    input.value = '１２'

    const composingInput = new Event('input', { bubbles: true })
    Object.defineProperty(composingInput, 'isComposing', { value: true })
    input.dispatchEvent(composingInput)

    await waitForContent(() => {
      const settledInput = container.querySelector('[data-testid="ime-input"]') as HTMLInputElement
      expect(settledInput.value).toBe('１２')
    })

    expect(handleChange).not.toHaveBeenCalled()

    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))

    await waitForContent(() => {
      const settledInput = container.querySelector('[data-testid="ime-input"]') as HTMLInputElement
      expect(settledInput.value).toBe('12')
    })

    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(handleChange).toHaveBeenLastCalledWith(12)
  })

  it('shrinks controls for compact sizes', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <InputNumber data-testid="compact-input" size="xs" defaultValue={8} suffix="xs" />,
        container,
      ),
    )

    await waitForContent(() => {
      const input = container.querySelector('[data-testid="compact-input"]') as HTMLInputElement
      const shell = container.querySelector('[data-rue-input-shell="true"]') as HTMLElement
      const controls = container.querySelector(
        '[data-rue-input-number-controls="true"]',
      ) as HTMLElement
      const button = container.querySelector(
        'button[aria-label="Increase value"]',
      ) as HTMLButtonElement
      const icon = button.querySelector('svg') as SVGElement
      expect(input.value).toBe('8')
      expect(shell.classList.contains('input-xs')).toBe(true)
      expect(controls).toBeTruthy()
      expect(button.classList.contains('btn-xs')).toBe(true)
      expect(button.classList.contains('w-3.5')).toBe(true)
      expect(button.classList.contains('flex-1')).toBe(true)
      expect(controls.classList.contains('gap-0')).toBe(true)
      expect(icon.classList.contains('size-2')).toBe(true)
      expect(controls.classList.contains('self-stretch')).toBe(true)
    })
  })
})
