import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Template, render, setReactiveScheduling } from '@rue-js/rue'
import Select from '../index'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('Select', () => {
  it('renders the base select element and forwards className', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Select className="w-full" value="amber" data-testid="select-root">
          <option value="crimson">Crimson</option>
          <option value="amber">Amber</option>
        </Select>,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="select-root"]') as HTMLSelectElement
      expect(element).toBeTruthy()
      expect(element.classList.contains('select')).toBe(true)
      expect(element.classList.contains('w-full')).toBe(true)
      expect(element.value).toBe('amber')
    })
  })

  it('applies color, ghost, visual size aliases, and keeps the native size attr available', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <div>
          <Select color="primary" ghost uiSize="lg" data-testid="select-variants">
            <option>One</option>
            <option>Two</option>
          </Select>
          <Select size="large" data-testid="select-size-alias">
            <option>Three</option>
          </Select>
          <Select size={4} data-testid="select-native-size">
            <option>Four</option>
          </Select>
        </div>,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector(
        '[data-testid="select-variants"]',
      ) as HTMLSelectElement
      const aliasElement = container.querySelector(
        '[data-testid="select-size-alias"]',
      ) as HTMLSelectElement
      const nativeSizeElement = container.querySelector(
        '[data-testid="select-native-size"]',
      ) as HTMLSelectElement
      expect(element.classList.contains('select-primary')).toBe(true)
      expect(element.classList.contains('select-ghost')).toBe(true)
      expect(element.classList.contains('select-lg')).toBe(true)
      expect(aliasElement.classList.contains('select-lg')).toBe(true)
      expect(nativeSizeElement.getAttribute('size')).toBe('4')
    })
  })

  it('renders options from data, supports fieldNames, and inserts placeholder', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Select
          placeholder="选择技术栈"
          options={[
            {
              name: 'Frontend',
              items: [
                { text: 'Rue', id: 'rue' },
                { text: 'Vue', id: 'vue', disabled: true },
              ],
            },
            {
              text: 'Rust',
              id: 'rust',
              titleText: 'System language',
            },
          ]}
          fieldNames={{
            label: 'text',
            value: 'id',
            options: 'items',
            groupLabel: 'name',
            title: 'titleText',
          }}
          data-testid="select-options"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="select-options"]') as HTMLSelectElement
      const placeholderOption = element.querySelector('option[value=""]') as HTMLOptionElement
      const group = element.querySelector('optgroup') as HTMLOptGroupElement
      const options = element.querySelectorAll('option')
      expect(placeholderOption.textContent).toBe('选择技术栈')
      expect(group.label).toBe('Frontend')
      expect(options.length).toBe(4)
      expect(options[1].value).toBe('rue')
      expect(options[2].disabled).toBe(true)
      expect(options[3].title).toBe('System language')
    })
  })

  it('renders shell mode with prefix and clear button, then dispatches clear events', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()
    const handleClear = vi.fn()

    mountTestApp(container, () =>
      render(
        <Select
          value="amber"
          placeholder="选择颜色"
          prefix="Palette"
          allowClear
          onChange={handleChange}
          onClear={handleClear}
          data-testid="select-shell"
        >
          <Template slot="suffix">
            <span data-testid="select-shell-suffix">stable</span>
          </Template>
          <option value="amber">Amber</option>
          <option value="crimson">Crimson</option>
        </Select>,
        container,
      ),
    )

    await waitForContent(() => {
      const shell = container.querySelector('[data-rue-select-root="true"]') as HTMLDivElement
      const element = container.querySelector('[data-testid="select-shell"]') as HTMLSelectElement
      const button = container.querySelector('button[aria-label="清空选择"]') as HTMLButtonElement
      const suffix = container.querySelector(
        '[data-testid="select-shell-suffix"]',
      ) as HTMLSpanElement
      expect(shell).toBeTruthy()
      expect(shell.classList.contains('input')).toBe(true)
      expect(shell.classList.contains('items-center')).toBe(true)
      expect(shell.textContent).toContain('Palette')
      expect(element).toBeTruthy()
      expect(element.multiple).toBe(false)
      expect(element.getAttribute('size')).toBeNull()
      expect(button).toBeTruthy()
      expect(button.classList.contains('self-center')).toBe(true)
      expect(suffix).toBeTruthy()
    })

    const button = container.querySelector('button[aria-label="清空选择"]') as HTMLButtonElement
    const element = container.querySelector('[data-testid="select-shell"]') as HTMLSelectElement
    button.click()

    await waitForContent(() => {
      expect(element.value).toBe('')
      expect(handleChange).toHaveBeenCalledTimes(1)
      expect(handleClear).toHaveBeenCalledTimes(1)
    })
  })

  it('emits semantic callbacks with labelInValue payloads', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleValueChange = vi.fn()
    const handleSelect = vi.fn()
    const handleDeselect = vi.fn()

    mountTestApp(container, () =>
      render(
        <Select
          defaultValue="amber"
          labelInValue
          optionLabelProp="label"
          onValueChange={handleValueChange}
          onSelect={handleSelect}
          onDeselect={handleDeselect}
          options={[
            { label: 'Amber', value: 'amber' },
            { label: 'Crimson', value: 'crimson' },
          ]}
          data-testid="select-semantic"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector(
        '[data-testid="select-semantic"]',
      ) as HTMLSelectElement
      expect(element.value).toBe('amber')
    })

    const element = container.querySelector('[data-testid="select-semantic"]') as HTMLSelectElement
    element.value = 'crimson'
    element.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      expect(handleValueChange).toHaveBeenCalledTimes(1)
      expect(handleValueChange.mock.calls[0]?.[0]).toMatchObject({
        value: 'crimson',
        key: 'crimson',
        label: 'Crimson',
      })
      expect(handleValueChange.mock.calls[0]?.[1]).toMatchObject({
        values: ['crimson'],
        labels: ['Crimson'],
      })
      expect(handleSelect.mock.calls[0]?.[0]).toMatchObject({
        value: 'crimson',
        label: 'Crimson',
      })
      expect(handleDeselect.mock.calls[0]?.[0]).toMatchObject({
        value: 'amber',
        label: 'Amber',
      })
    })
  })

  it('renders compact multiple dropdown and keeps selections in a hidden native select', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Select
          mode="multiple"
          defaultValue={['jack', 'lucy']}
          options={[
            { label: 'Jack', value: 'jack' },
            { label: 'Lucy', value: 'lucy' },
            { label: 'yiminghe', value: 'yiminghe' },
          ]}
          placeholder="Select members"
          data-testid="select-compact-multiple"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const trigger = container.querySelector('[data-rue-select-trigger="true"]') as HTMLDivElement
      const element = container.querySelector(
        '[data-testid="select-compact-multiple"]',
      ) as HTMLSelectElement
      const popup = container.querySelector('[data-rue-select-popup="true"]') as HTMLDivElement
      expect(trigger).toBeTruthy()
      expect(trigger.textContent).toContain('Jack')
      expect(trigger.textContent).toContain('Lucy')
      expect(popup.hidden).toBe(true)
      expect(popup.getAttribute('aria-hidden')).toBe('true')
      expect(element.multiple).toBe(true)
      expect(element.getAttribute('size')).toBeNull()
      expect(Array.from(element.selectedOptions).map(option => option.value)).toEqual([
        'jack',
        'lucy',
      ])
    })

    const trigger = container.querySelector('[data-rue-select-trigger="true"]') as HTMLDivElement
    trigger.click()

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-select-popup="true"]') as HTMLDivElement
      expect(popup).toBeTruthy()
      expect(popup.hidden).toBe(false)
      expect(popup.getAttribute('aria-hidden')).toBe('false')
    })

    trigger.click()

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-select-popup="true"]') as HTMLDivElement
      expect(popup.hidden).toBe(false)
      expect(popup.getAttribute('aria-hidden')).toBe('false')
    })

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-select-popup="true"]') as HTMLDivElement
      expect(popup.hidden).toBe(true)
      expect(popup.getAttribute('aria-hidden')).toBe('true')
    })

    trigger.click()

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-select-popup="true"]') as HTMLDivElement
      expect(popup).toBeTruthy()
      expect(popup.hidden).toBe(false)
    })

    const optionButton = container.querySelector(
      'button[data-rue-select-option="yiminghe"]',
    ) as HTMLButtonElement
    optionButton.click()

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-select-popup="true"]') as HTMLDivElement
      const element = container.querySelector(
        '[data-testid="select-compact-multiple"]',
      ) as HTMLSelectElement
      const currentTrigger = container.querySelector(
        '[data-rue-select-trigger="true"]',
      ) as HTMLDivElement
      expect(popup).toBeTruthy()
      expect(popup.hidden).toBe(false)
      expect(popup.getAttribute('aria-hidden')).toBe('false')
      expect(Array.from(element.selectedOptions).map(option => option.value)).toEqual([
        'jack',
        'lucy',
        'yiminghe',
      ])
      expect(currentTrigger.textContent).toContain('yiminghe')
    })

    const lucyButton = container.querySelector(
      'button[data-rue-select-option="lucy"]',
    ) as HTMLButtonElement
    lucyButton.click()

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-select-popup="true"]') as HTMLDivElement
      const element = container.querySelector(
        '[data-testid="select-compact-multiple"]',
      ) as HTMLSelectElement
      expect(popup.hidden).toBe(false)
      expect(popup.getAttribute('aria-hidden')).toBe('false')
      expect(Array.from(element.selectedOptions).map(option => option.value)).toEqual([
        'jack',
        'yiminghe',
      ])
    })
  })

  it('keeps compact multiple popup open in controlled mode until outside click', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const renderControlled = (currentValue: string[]) => {
      mountTestApp(container, () =>
        render(
          <Select
            mode="multiple"
            value={currentValue}
            options={[
              { label: 'Jack', value: 'jack' },
              { label: 'Lucy', value: 'lucy' },
              { label: 'yiminghe', value: 'yiminghe' },
            ]}
            placeholder="Select members"
            data-testid="select-controlled-compact-multiple"
          />,
          container,
        ),
      )
    }

    renderControlled(['jack', 'lucy'])

    await waitForContent(() => {
      const trigger = container.querySelector('[data-rue-select-trigger="true"]') as HTMLDivElement
      const popup = container.querySelector('[data-rue-select-popup="true"]') as HTMLDivElement
      expect(trigger.textContent).toContain('Jack')
      expect(trigger.textContent).toContain('Lucy')
      expect(popup.hidden).toBe(true)
    })

    const trigger = container.querySelector('[data-rue-select-trigger="true"]') as HTMLDivElement
    trigger.click()

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-select-popup="true"]') as HTMLDivElement
      expect(popup.hidden).toBe(false)
      expect(popup.getAttribute('aria-hidden')).toBe('false')
    })

    const optionButton = container.querySelector(
      'button[data-rue-select-option="yiminghe"]',
    ) as HTMLButtonElement
    optionButton.click()
    renderControlled(['jack', 'lucy', 'yiminghe'])

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-select-popup="true"]') as HTMLDivElement
      const element = container.querySelector(
        '[data-testid="select-controlled-compact-multiple"]',
      ) as HTMLSelectElement
      const currentTrigger = container.querySelector(
        '[data-rue-select-trigger="true"]',
      ) as HTMLDivElement
      expect(popup.hidden).toBe(false)
      expect(popup.getAttribute('aria-hidden')).toBe('false')
      expect(Array.from(element.selectedOptions).map(option => option.value)).toEqual([
        'jack',
        'lucy',
        'yiminghe',
      ])
      expect(currentTrigger.textContent).toContain('yiminghe')
    })

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-select-popup="true"]') as HTMLDivElement
      expect(popup.hidden).toBe(true)
      expect(popup.getAttribute('aria-hidden')).toBe('true')
    })
  })

  it('keeps consecutive compact selections stable while controlled value echo is delayed', async () => {
    vi.useFakeTimers()
    const container = mountContainer()
    resetActiveRuntime()
    const handleValueChange = vi.fn()
    const renderControlled = (currentValue: string[]) => {
      mountTestApp(container, () =>
        render(
          <Select
            mode="multiple"
            value={currentValue}
            options={[
              { label: 'Jack', value: 'jack' },
              { label: 'Lucy', value: 'lucy' },
              { label: 'yiminghe', value: 'yiminghe' },
            ]}
            onValueChange={nextValue => {
              const nextValues = nextValue as string[]
              handleValueChange(nextValues)
              setTimeout(() => renderControlled(nextValues), 20)
            }}
            data-testid="select-delayed-controlled-compact-multiple"
          />,
          container,
        ),
      )
    }

    renderControlled(['jack'])
    await vi.runAllTicks()
    vi.runOnlyPendingTimers()

    const trigger = container.querySelector('[data-rue-select-trigger="true"]') as HTMLDivElement
    trigger.click()
    const lucyButton = container.querySelector(
      'button[data-rue-select-option="lucy"]',
    ) as HTMLButtonElement
    const yimingheButton = container.querySelector(
      'button[data-rue-select-option="yiminghe"]',
    ) as HTMLButtonElement
    lucyButton.click()
    yimingheButton.click()
    await vi.runAllTicks()

    expect(handleValueChange.mock.calls.map(call => call[0])).toEqual([
      ['jack', 'lucy'],
      ['jack', 'lucy', 'yiminghe'],
    ])
    expect(vi.getTimerCount()).toBe(2)

    vi.runAllTimers()
    await vi.runAllTicks()

    const element = container.querySelector(
      '[data-testid="select-delayed-controlled-compact-multiple"]',
    ) as HTMLSelectElement
    const currentTrigger = container.querySelector(
      '[data-rue-select-trigger="true"]',
    ) as HTMLDivElement
    expect(Array.from(element.selectedOptions).map(option => option.value)).toEqual([
      'jack',
      'lucy',
      'yiminghe',
    ])
    expect(currentTrigger.textContent).toContain('Lucy')
    expect(currentTrigger.textContent).toContain('yiminghe')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('falls back to native listbox when nativeSize is provided in multiple mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Select
          mode="multiple"
          nativeSize={6}
          defaultValue={['release']}
          options={[
            { label: 'Release digest', value: 'release' },
            { label: 'Design review', value: 'design' },
          ]}
          data-testid="select-native-listbox"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector(
        '[data-testid="select-native-listbox"]',
      ) as HTMLSelectElement
      const trigger = container.querySelector(
        '[data-rue-select-trigger="true"]',
      ) as HTMLDivElement | null
      expect(element.multiple).toBe(true)
      expect(element.getAttribute('size')).toBe('6')
      expect(trigger).toBeNull()
    })
  })

  it('limits compact multiple selection with maxCount', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleValueChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <Select
          mode="multiple"
          maxCount={2}
          defaultValue={['release']}
          options={[
            { label: 'Release digest', value: 'release' },
            { label: 'Design review', value: 'design' },
            { label: 'Labs rollout', value: 'labs' },
          ]}
          onValueChange={handleValueChange}
          data-testid="select-max-count"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const trigger = container.querySelector('[data-rue-select-trigger="true"]') as HTMLDivElement
      expect(trigger.textContent).toContain('Release digest')
    })

    const trigger = container.querySelector('[data-rue-select-trigger="true"]') as HTMLDivElement
    trigger.click()

    const designButton = container.querySelector(
      'button[data-rue-select-option="design"]',
    ) as HTMLButtonElement
    const labsButton = container.querySelector(
      'button[data-rue-select-option="labs"]',
    ) as HTMLButtonElement
    designButton.click()
    labsButton.click()

    await waitForContent(() => {
      const element = container.querySelector(
        '[data-testid="select-max-count"]',
      ) as HTMLSelectElement
      const currentTrigger = container.querySelector(
        '[data-rue-select-trigger="true"]',
      ) as HTMLDivElement
      expect(Array.from(element.selectedOptions).map(option => option.value)).toEqual([
        'release',
        'design',
      ])
      expect(handleValueChange).toHaveBeenCalledTimes(2)
      expect(handleValueChange.mock.calls[1]?.[0]).toEqual(['release', 'design'])
      expect(currentTrigger.textContent).not.toContain('Labs rollout')
    })
  })

  it('forwards native attrs and change events', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <Select
          multiple={true}
          disabled={true}
          name="frameworks"
          onChange={handleChange}
          data-testid="select-native"
        >
          <option value="rue">Rue</option>
          <option value="vue">Vue</option>
        </Select>,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="select-native"]') as HTMLSelectElement
      expect(element.multiple).toBe(true)
      expect(element.disabled).toBe(true)
      expect(element.name).toBe('frameworks')
    })

    const element = container.querySelector('[data-testid="select-native"]') as HTMLSelectElement
    element.dispatchEvent(new Event('change', { bubbles: true }))
    expect(handleChange).toHaveBeenCalledTimes(1)
  })
})
