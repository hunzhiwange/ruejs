import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'
import Validator from '..'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Validator', () => {
  it('renders the base validator input and forwards attrs', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleInput = vi.fn()

    mountTestApp(container, () =>
      render(
        <Validator
          className="input"
          type="email"
          required={true}
          placeholder="mail@site.com"
          data-testid="validator"
          onInput={handleInput}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const input = container.querySelector('[data-testid="validator"]') as HTMLInputElement
      expect(input.tagName.toLowerCase()).toBe('input')
      expect(input.classList.contains('validator')).toBe(true)
      expect(input.classList.contains('input')).toBe(true)
      expect(input.type).toBe('email')
      expect(input.required).toBe(true)
      expect(input.placeholder).toBe('mail@site.com')
    })

    const input = container.querySelector('[data-testid="validator"]') as HTMLInputElement
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(handleInput).toHaveBeenCalledTimes(1)
  })

  it('normalizes legacy pattern literals forwarded through component props', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(<Validator pattern="[A-Za-z0-9-]+" data-testid="validator-pattern" />, container),
    )

    await waitForContent(() => {
      const input = container.querySelector('[data-testid="validator-pattern"]') as HTMLInputElement
      expect(input.pattern).toBe('[A-Za-z0-9\\-]+')
      expect(() => input.checkValidity()).not.toThrow()
    })
  })

  it('supports select and textarea hosts', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <div>
          <Validator as="select" data-testid="validator-select">
            <option value="">Choose:</option>
            <option value="tabs">Tabs</option>
          </Validator>
          <Validator as="textarea" data-testid="validator-textarea">
            Notes
          </Validator>
        </div>,
        container,
      ),
    )

    await waitForContent(() => {
      const select = container.querySelector(
        '[data-testid="validator-select"]',
      ) as HTMLSelectElement
      const textarea = container.querySelector(
        '[data-testid="validator-textarea"]',
      ) as HTMLTextAreaElement
      expect(select.tagName.toLowerCase()).toBe('select')
      expect(select.classList.contains('validator')).toBe(true)
      expect(select.classList.contains('select')).toBe(true)
      expect(textarea.tagName.toLowerCase()).toBe('textarea')
      expect(textarea.classList.contains('validator')).toBe(true)
      expect(textarea.classList.contains('textarea')).toBe(true)
      expect(textarea.value).toBe('Notes')
    })
  })

  it('applies semantic appearance, size and status classes', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <div>
          <Validator appearance="input" size="lg" status="error" data-testid="validator-input" />
          <Validator
            appearance="checkbox"
            size="sm"
            status="success"
            type="checkbox"
            data-testid="validator-checkbox"
          />
        </div>,
        container,
      ),
    )

    await waitForContent(() => {
      const input = container.querySelector('[data-testid="validator-input"]') as HTMLInputElement
      const checkbox = container.querySelector(
        '[data-testid="validator-checkbox"]',
      ) as HTMLInputElement
      expect(input.classList.contains('validator')).toBe(true)
      expect(input.classList.contains('input')).toBe(true)
      expect(input.classList.contains('input-lg')).toBe(true)
      expect(input.classList.contains('input-error')).toBe(true)
      expect(checkbox.classList.contains('checkbox')).toBe(true)
      expect(checkbox.classList.contains('checkbox-sm')).toBe(true)
      expect(checkbox.classList.contains('checkbox-success')).toBe(true)
    })
  })

  it('renders validator-hint subcomponent', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Validator.Hint
          hideUntilInvalid={true}
          lines={['Required', 'Use company email']}
          data-testid="validator-hint"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const hint = container.querySelector('[data-testid="validator-hint"]') as HTMLElement
      expect(hint.tagName.toLowerCase()).toBe('p')
      expect(hint.classList.contains('validator-hint')).toBe(true)
      expect(hint.classList.contains('hidden')).toBe(true)
      expect(hint.textContent).toContain('Required')
      expect(hint.textContent).toContain('Use company email')
      expect(hint.querySelectorAll('span.block')).toHaveLength(2)
    })
  })

  it('renders Field with label, hint and accessibility wiring', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Validator.Field
          id="validator-email-field"
          label="Email"
          hint="Required"
          extra="We only use it for sign-in"
          required={true}
          appearance="input"
          controlClassName="w-full"
          data-testid="validator-field-control"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const wrapper = container.firstElementChild as HTMLElement
      const label = container.querySelector('label') as HTMLLabelElement
      const control = container.querySelector(
        '[data-testid="validator-field-control"]',
      ) as HTMLInputElement
      const hint = container.querySelector('#validator-email-field-hint') as HTMLElement
      expect(wrapper.classList.contains('fieldset')).toBe(true)
      expect(label.getAttribute('for')).toBe('validator-email-field')
      expect(label.textContent).toContain('Email')
      expect(control.classList.contains('validator')).toBe(true)
      expect(control.classList.contains('input')).toBe(true)
      expect(control.classList.contains('w-full')).toBe(true)
      expect(control.getAttribute('aria-describedby')).toBe('validator-email-field-hint')
      expect(hint.classList.contains('validator-hint')).toBe(true)
      expect(hint.textContent).toContain('Required')
      expect(wrapper.textContent).toContain('We only use it for sign-in')
    })
  })
})
