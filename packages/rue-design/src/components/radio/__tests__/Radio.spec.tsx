import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import Radio from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Radio', () => {
  it('renders the base radio input with native attrs', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Radio name="plan" value="pro" checked={true} className="border-base-300" />,
        container,
      ),
    )

    await waitForContent(() => {
      const input = container.querySelector('input.radio') as HTMLInputElement
      expect(input).toBeTruthy()
      expect(input.type).toBe('radio')
      expect(input.name).toBe('plan')
      expect(input.value).toBe('pro')
      expect(input.checked).toBe(true)
      expect(input.classList.contains('border-base-300')).toBe(true)
    })
  })

  it('applies color and size modifiers', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () => render(<Radio color="primary" size="lg" />, container))

    await waitForContent(() => {
      const input = container.querySelector('input.radio') as HTMLInputElement
      expect(input.classList.contains('radio-primary')).toBe(true)
      expect(input.classList.contains('radio-lg')).toBe(true)
    })
  })

  it('forwards disabled state and change handlers', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(<Radio disabled={true} data-testid="radio" onChange={handleChange} />, container),
    )

    await waitForContent(() => {
      const input = container.querySelector('[data-testid="radio"]') as HTMLInputElement
      expect(input.disabled).toBe(true)
    })

    const input = container.querySelector('[data-testid="radio"]') as HTMLInputElement
    input.dispatchEvent(new Event('change', { bubbles: true }))
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('supports labeled content and keeps controlled checked state in sync', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <Radio
          checked={true}
          value="enterprise"
          rootClassName="rounded-box px-2 py-1"
          onChange={handleChange}
        >
          Enterprise
        </Radio>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-rue-radio-root="true"]') as HTMLLabelElement
      const input = container.querySelector('input.radio') as HTMLInputElement

      expect(root).toBeTruthy()
      expect(root.classList.contains('rounded-box')).toBe(true)
      expect(root.textContent).toContain('Enterprise')
      expect(input.checked).toBe(true)
      expect(input.dataset.rueRadioValue).toBe('string:enterprise')
    })

    const input = container.querySelector('input.radio') as HTMLInputElement
    input.checked = false
    input.dispatchEvent(new Event('change', { bubbles: true }))

    expect(input.checked).toBe(true)
    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(handleChange.mock.calls[0][1]).toMatchObject({ checked: false, value: 'enterprise' })
  })

  it('supports radio group options in uncontrolled mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <Radio.Group
          name="plan"
          defaultValue="startup"
          onChange={handleChange}
          options={[
            { label: 'Startup', value: 'startup' },
            { label: 'Business', value: 'business' },
            { label: 'Enterprise', value: 'enterprise', disabled: true },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const startup = container.querySelector('input[value="startup"]') as HTMLInputElement
      const business = container.querySelector('input[value="business"]') as HTMLInputElement
      const enterprise = container.querySelector('input[value="enterprise"]') as HTMLInputElement

      expect(startup.checked).toBe(true)
      expect(startup.name).toBe('plan')
      expect(business.checked).toBe(false)
      expect(enterprise.disabled).toBe(true)
    })

    const business = container.querySelector('input[value="business"]') as HTMLInputElement
    const startup = container.querySelector('input[value="startup"]') as HTMLInputElement
    business.checked = true
    business.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      expect(business.checked).toBe(true)
      expect(startup.checked).toBe(false)
      expect(handleChange).toHaveBeenCalledTimes(1)
      expect(handleChange.mock.calls[0][0]).toBe('business')
      expect(handleChange.mock.calls[0][2]).toMatchObject({
        checked: true,
        previousValue: 'startup',
        optionType: 'default',
      })
    })
  })

  it('keeps controlled group children in sync after change attempts', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <Radio.Group value="pro" onChange={handleChange}>
          <Radio value="starter">Starter</Radio>
          <Radio value="pro">Pro</Radio>
        </Radio.Group>,
        container,
      ),
    )

    await waitForContent(() => {
      const starter = container.querySelector('input[value="starter"]') as HTMLInputElement
      const pro = container.querySelector('input[value="pro"]') as HTMLInputElement

      expect(starter.checked).toBe(false)
      expect(pro.checked).toBe(true)
    })

    const starter = container.querySelector('input[value="starter"]') as HTMLInputElement
    const pro = container.querySelector('input[value="pro"]') as HTMLInputElement
    starter.checked = true
    starter.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      expect(handleChange).toHaveBeenCalledTimes(1)
      expect(handleChange.mock.calls[0][0]).toBe('starter')
      expect(starter.checked).toBe(false)
      expect(pro.checked).toBe(true)
    })
  })

  it('supports button-style radios in group options mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Radio.Group
          optionType="button"
          buttonStyle="solid"
          size="large"
          defaultValue="pro"
          options={[
            { label: 'Starter', value: 'starter' },
            { label: 'Pro', value: 'pro' },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const buttons = container.querySelectorAll('[data-rue-radio-option-type="button"] .btn')
      const starter = container.querySelector('input[value="starter"]') as HTMLInputElement
      const pro = container.querySelector('input[value="pro"]') as HTMLInputElement

      expect(buttons).toHaveLength(2)
      buttons.forEach(button => {
        expect((button as HTMLElement).classList.contains('btn-lg')).toBe(true)
      })
      expect(starter.checked).toBe(false)
      expect(pro.checked).toBe(true)
    })

    const starter = container.querySelector('input[value="starter"]') as HTMLInputElement
    const pro = container.querySelector('input[value="pro"]') as HTMLInputElement
    starter.checked = true
    starter.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      expect(starter.checked).toBe(true)
      expect(pro.checked).toBe(false)
    })
  })
})
