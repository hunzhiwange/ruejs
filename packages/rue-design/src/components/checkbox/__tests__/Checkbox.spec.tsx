import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref, render, setReactiveScheduling } from '@rue-js/rue'
import Checkbox from '../index'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Checkbox', () => {
  it('renders the base checkbox input and forwards className', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(<Checkbox className="border-base-300" checked={true} />, container),
    )

    await waitForContent(() => {
      const input = container.querySelector('input.checkbox') as HTMLInputElement
      expect(input).toBeTruthy()
      expect(input.type).toBe('checkbox')
      expect(input.checked).toBe(true)
      expect(input.classList.contains('border-base-300')).toBe(true)
    })
  })

  it('applies color and size modifiers', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () => render(<Checkbox color="primary" size="lg" />, container))

    await waitForContent(() => {
      const input = container.querySelector('input.checkbox') as HTMLInputElement
      expect(input.classList.contains('checkbox-primary')).toBe(true)
      expect(input.classList.contains('checkbox-lg')).toBe(true)
    })
  })

  it('forwards native attributes and change events', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <Checkbox
          name="remember"
          value="yes"
          disabled={true}
          data-testid="remember"
          onChange={handleChange}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const input = container.querySelector('[data-testid="remember"]') as HTMLInputElement
      expect(input.name).toBe('remember')
      expect(input.value).toBe('yes')
      expect(input.disabled).toBe(true)
    })

    const input = container.querySelector('[data-testid="remember"]') as HTMLInputElement
    input.dispatchEvent(new Event('change', { bubbles: true }))
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('supports labeled content and indeterminate state', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Checkbox value="partial" indeterminate={true} rootClassName="rounded-box px-2 py-1">
          部分选择
        </Checkbox>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-rue-checkbox-root="true"]') as HTMLLabelElement
      const input = container.querySelector('input.checkbox') as HTMLInputElement

      expect(root).toBeTruthy()
      expect(root.classList.contains('rounded-box')).toBe(true)
      expect(root.textContent).toContain('部分选择')
      expect(input.parentElement?.classList.contains('pt-0.5')).toBe(false)
      expect(
        container.querySelector('[data-rue-checkbox-content="true"]')?.classList.contains('pt-0.5'),
      ).toBe(true)
      expect(input.indeterminate).toBe(true)
      expect(input.getAttribute('aria-checked')).toBe('mixed')
      expect(input.dataset.rueCheckboxValue).toBe('string:partial')
    })
  })

  it('keeps controlled checked state in sync after change attempts', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <Checkbox checked={true} data-testid="controlled" onChange={handleChange} />,
        container,
      ),
    )

    await waitForContent(() => {
      const input = container.querySelector('[data-testid="controlled"]') as HTMLInputElement
      expect(input.checked).toBe(true)
    })

    const input = container.querySelector('[data-testid="controlled"]') as HTMLInputElement
    input.checked = false
    input.dispatchEvent(new Event('change', { bubbles: true }))

    expect(input.checked).toBe(true)
    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(handleChange.mock.calls[0][1]).toMatchObject({ checked: false, indeterminate: false })
  })

  it('preserves labeled children text across controlled toggles', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const enabled = ref(false)

    const Demo = () => (
      <Checkbox
        checked={enabled.value}
        rootClassName="items-start rounded-box border border-base-300 px-4 py-3"
        onCheckedChange={nextChecked => {
          enabled.value = nextChecked
        }}
      >
        开启每周摘要
      </Checkbox>
    )

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-checkbox-root="true"]')).not.toBeNull()
      expect((container.querySelector('input.checkbox') as HTMLInputElement).checked).toBe(false)
      expect(
        (container.querySelector('[data-rue-checkbox-root="true"]') as HTMLElement).className,
      ).toContain('rounded-box')
      expect(container.textContent).toContain('开启每周摘要')
    })

    const root = () => container.querySelector('[data-rue-checkbox-root="true"]') as HTMLElement

    root().dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    await waitForContent(() => {
      expect((container.querySelector('input.checkbox') as HTMLInputElement).checked).toBe(true)
      expect(root().textContent).toContain('开启每周摘要')
    })

    root().dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    await waitForContent(() => {
      expect((container.querySelector('input.checkbox') as HTMLInputElement).checked).toBe(false)
      expect(root().textContent).toContain('开启每周摘要')
    })
  })

  it('supports checkbox group options in uncontrolled mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <Checkbox.Group
          name="fruits"
          defaultValue={['apple']}
          onChange={handleChange}
          options={[
            { label: 'Apple', value: 'apple' },
            { label: 'Banana', value: 'banana' },
            { label: 'Pear', value: 'pear', disabled: true },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const apple = container.querySelector('input[value="apple"]') as HTMLInputElement
      const banana = container.querySelector('input[value="banana"]') as HTMLInputElement
      const pear = container.querySelector('input[value="pear"]') as HTMLInputElement

      expect(apple.checked).toBe(true)
      expect(apple.name).toBe('fruits')
      expect(banana.checked).toBe(false)
      expect(pear.disabled).toBe(true)
    })

    const banana = container.querySelector('input[value="banana"]') as HTMLInputElement
    banana.checked = true
    banana.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      expect(banana.checked).toBe(true)
      expect(handleChange).toHaveBeenCalledWith(['apple', 'banana'])
    })
  })

  it('syncs default values for checkbox group children mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <Checkbox.Group defaultValue={['b']} onChange={handleChange} className="gap-2">
          <Checkbox value="a">Alpha</Checkbox>
          <Checkbox value="b">Beta</Checkbox>
        </Checkbox.Group>,
        container,
      ),
    )

    await waitForContent(() => {
      const alpha = container.querySelector('input[value="a"]') as HTMLInputElement
      const beta = container.querySelector('input[value="b"]') as HTMLInputElement

      expect(alpha.checked).toBe(false)
      expect(beta.checked).toBe(true)
    })

    const alpha = container.querySelector('input[value="a"]') as HTMLInputElement
    alpha.checked = true
    alpha.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      expect(handleChange).toHaveBeenCalledWith(['a', 'b'])
    })
  })
})
