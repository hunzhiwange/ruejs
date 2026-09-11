import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref, render, setReactiveScheduling } from '@rue-js/rue'
import ColorPicker, { COLOR_PICKER_MODE_GRADIENT, COLOR_PICKER_MODE_SINGLE } from '../index'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ColorPicker', () => {
  it('uses theme token surfaces and a compact square trigger by default', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(<ColorPicker defaultOpen={true} defaultValue="#1677ff" />, container),
    )

    const trigger = container.querySelector(
      '[data-rue-color-picker-trigger="true"]',
    ) as HTMLDivElement
    const popup = document.body.querySelector(
      '[data-rue-color-picker-popup="true"]',
    ) as HTMLDivElement

    await waitForContent(() => {
      expect(trigger).toBeTruthy()
      expect(popup).toBeTruthy()
      expect(trigger.className).toContain('bg-base-100')
      expect(trigger.className).toContain('border-base-300')
      expect(trigger.className).toContain('h-8')
      expect(trigger.className).toContain('w-8')
      expect(popup.className).toContain('bg-base-100')
      expect(popup.className).toContain('border-base-300')
    })
  })

  it('supports Button-style size values', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <div>
          <ColorPicker size="xs" defaultValue="#1677ff" />
          <ColorPicker size="xl" defaultValue="#22c55e" showText />
        </div>,
        container,
      ),
    )

    await waitForContent(() => {
      const triggers = container.querySelectorAll('[data-rue-color-picker-trigger="true"]')
      expect(triggers.length).toBe(2)
      expect(triggers[0].className).toContain('h-6')
      expect(triggers[0].className).toContain('w-6')
      expect(triggers[0].querySelector('span')?.className).toContain('size-[0.85rem]')
      expect(triggers[1].className).toContain('min-h-12')
      expect(triggers[1].className).toContain('text-base')
      expect(triggers[1].querySelector('span')?.className).toContain('size-6')
    })
  })

  it('renders custom trigger content through the default slot', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <ColorPicker defaultValue="#1677ff" showText>
          <span data-rue-color-picker-show-text="true">Custom Text (#1677ff)</span>
        </ColorPicker>,
        container,
      ),
    )

    const trigger = container.querySelector(
      '[data-rue-color-picker-trigger="true"]',
    ) as HTMLDivElement

    await waitForContent(() => {
      const customText = trigger.querySelector(
        '[data-rue-color-picker-show-text="true"]',
      ) as HTMLSpanElement
      expect(customText).toBeTruthy()
      expect(trigger.textContent).toContain('Custom Text (#1677ff)')
      expect(trigger.textContent).not.toContain('[object Object]')
      expect(trigger.querySelector('svg')).toBeNull()
    })
  })

  it('mounts popup in a custom container and destroys it when destroyTooltipOnHide is enabled', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const popupContainer = document.createElement('div')
    popupContainer.setAttribute('data-rue-color-picker-custom-container', 'true')
    document.body.appendChild(popupContainer)

    mountTestApp(container, () =>
      render(
        <ColorPicker
          defaultOpen={true}
          defaultValue="#1677ff"
          getPopupContainer={() => popupContainer}
          destroyTooltipOnHide
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(popupContainer.querySelector('[data-rue-color-picker-popup-host="true"]')).toBeTruthy()
    })

    const trigger = container.querySelector(
      '[data-rue-color-picker-trigger="true"]',
    ) as HTMLDivElement
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      expect(popupContainer.querySelector('[data-rue-color-picker-popup-host="true"]')).toBeNull()
    })
  })

  it('respects preset defaultOpen when choosing the initial visible group', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <ColorPicker
          defaultOpen={true}
          presets={[
            {
              label: 'Warm',
              colors: ['#ff6b57'],
            },
            {
              label: 'Cool',
              defaultOpen: true,
              colors: ['#22c55e'],
            },
          ]}
        />,
        container,
      ),
    )

    const popup = document.body.querySelector(
      '[data-rue-color-picker-popup="true"]',
    ) as HTMLDivElement

    await waitForContent(() => {
      const sections = Array.from(popup.querySelectorAll('section')) as HTMLElement[]
      const coolButton = Array.from(popup.querySelectorAll('button')).find(
        node => node.textContent === 'Cool',
      ) as HTMLButtonElement
      expect(sections).toHaveLength(2)
      expect(sections[0].className.includes('hidden')).toBe(true)
      expect(sections[1].className.includes('hidden')).toBe(false)
      expect(coolButton.className).toContain('border-primary')
    })
  })

  it('switches to gradient mode when selecting a gradient preset', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <ColorPicker
          mode={[COLOR_PICKER_MODE_SINGLE, COLOR_PICKER_MODE_GRADIENT]}
          presets={[
            {
              label: 'Gradient Presets',
              defaultOpen: true,
              colors: [
                [
                  { color: '#1677ff', percent: 0 },
                  { color: '#22c55e', percent: 100 },
                ],
              ],
            },
          ]}
        />,
        container,
      ),
    )

    const trigger = container.querySelector(
      '[data-rue-color-picker-trigger="true"]',
    ) as HTMLDivElement
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      const popup = document.body.querySelector(
        '[data-rue-color-picker-popup="true"]',
      ) as HTMLDivElement
      const gradientPreset = Array.from(popup.querySelectorAll('button[title]')).find(node =>
        (node as HTMLButtonElement).title.includes('linear-gradient'),
      ) as HTMLButtonElement | undefined
      expect(gradientPreset).toBeTruthy()
      expect(popup.textContent).not.toContain('色标 1/2')
    })

    const popup = document.body.querySelector(
      '[data-rue-color-picker-popup="true"]',
    ) as HTMLDivElement

    const gradientPreset = Array.from(popup.querySelectorAll('button[title]')).find(node =>
      (node as HTMLButtonElement).title.includes('linear-gradient'),
    ) as HTMLButtonElement
    gradientPreset.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      const activeGradientPreset = Array.from(popup.querySelectorAll('button[title]')).find(node =>
        (node as HTMLButtonElement).title.includes('linear-gradient'),
      ) as HTMLButtonElement
      expect(popup.textContent).toContain('色标 1/2')
      expect(activeGradientPreset.className).toContain('border-primary')
    })

    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })

  it('commits manual popup text edits', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <ColorPicker
          defaultOpen={true}
          defaultFormat="hex"
          defaultValue="#1677ff"
          onChange={handleChange}
        />,
        container,
      ),
    )

    const popup = document.body.querySelector(
      '[data-rue-color-picker-popup="true"]',
    ) as HTMLDivElement

    await waitForContent(() => {
      const input = popup.querySelector('input[type="text"]') as HTMLInputElement
      expect(input).toBeTruthy()
      expect(input.value).toBe('#1677ff')
    })

    const input = popup.querySelector('input[type="text"]') as HTMLInputElement
    input.value = '#22c55e'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    )

    await waitForContent(() => {
      expect(input.value).toBe('#22c55e')
      expect(handleChange).toHaveBeenCalled()
      expect(handleChange.mock.calls[handleChange.mock.calls.length - 1]?.[1]).toBe(
        'rgb(34, 197, 94)',
      )
    })
  })

  it('reflects uncontrolled popup edits in the trigger', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <ColorPicker
          defaultOpen={true}
          defaultFormat="hex"
          defaultValue="#1677ff"
          showText
          onChange={handleChange}
        />,
        container,
      ),
    )

    const trigger = container.querySelector(
      '[data-rue-color-picker-trigger="true"]',
    ) as HTMLDivElement
    const popup = document.body.querySelector(
      '[data-rue-color-picker-popup="true"]',
    ) as HTMLDivElement

    await waitForContent(() => {
      expect(trigger.textContent).toContain('#1677ff')
      expect(trigger.querySelector('span')?.getAttribute('style')).toContain('rgb(22, 119, 255)')
      expect(popup.querySelector('input[type="text"]')).toBeTruthy()
    })

    const input = popup.querySelector('input[type="text"]') as HTMLInputElement
    input.value = '#22c55e'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    )

    await waitForContent(() => {
      expect(handleChange).toHaveBeenCalled()
      const currentTrigger = container.querySelector(
        '[data-rue-color-picker-trigger="true"]',
      ) as HTMLDivElement
      expect(currentTrigger.textContent).toContain('#22c55e')
      expect(currentTrigger.querySelector('span')?.getAttribute('style')).toContain(
        'rgb(34, 197, 94)',
      )
    })
  })

  it('reflects controlled callback updates in the trigger', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    const ControlledPreview = () => {
      const colorValue = ref('#1677ff')

      return (
        <div>
          <ColorPicker
            defaultOpen={true}
            defaultFormat="hex"
            value={colorValue.value}
            showText
            onChange={(nextColor, css) => {
              colorValue.value =
                nextColor && 'toHexString' in nextColor ? nextColor.toHexString() : css
            }}
          />
          <div data-testid="controlled-color-value">{colorValue.value}</div>
        </div>
      )
    }

    mountTestApp(container, () => render(<ControlledPreview />, container))

    await waitForContent(() => {
      const trigger = container.querySelector(
        '[data-rue-color-picker-trigger="true"]',
      ) as HTMLDivElement
      expect(trigger.textContent).toContain('#1677ff')
      expect(trigger.querySelector('span')?.getAttribute('style')).toContain('rgb(22, 119, 255)')
    })

    const popup = document.body.querySelector(
      '[data-rue-color-picker-popup="true"]',
    ) as HTMLDivElement
    const input = popup.querySelector('input[type="text"]') as HTMLInputElement
    input.value = '#22c55e'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    )

    await waitForContent(() => {
      const trigger = container.querySelector(
        '[data-rue-color-picker-trigger="true"]',
      ) as HTMLDivElement
      expect(trigger.textContent).toContain('#22c55e')
      expect(trigger.querySelector('span')?.getAttribute('style')).toContain('rgb(34, 197, 94)')
      expect(container.querySelector('[data-testid="controlled-color-value"]')?.textContent).toBe(
        '#22c55e',
      )
    })
  })

  it('keeps popup text input mounted while the user is editing', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <ColorPicker defaultOpen={true} defaultFormat="hex" defaultValue="#1677ff" />,
        container,
      ),
    )

    const popup = document.body.querySelector(
      '[data-rue-color-picker-popup="true"]',
    ) as HTMLDivElement

    await waitForContent(() => {
      expect(popup.querySelector('input[type="text"]')).toBeTruthy()
    })

    const input = popup.querySelector('input[type="text"]') as HTMLInputElement
    input.dispatchEvent(new FocusEvent('focus', { bubbles: true }))
    input.value = '#22c55e'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      expect(popup.querySelector('input[type="text"]')).toBe(input)
      expect(input.value).toBe('#22c55e')
    })
  })

  it('updates popup format fields after changing the format select', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleFormatChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <ColorPicker
          defaultOpen={true}
          defaultFormat="rgb"
          defaultValue="rgba(56, 189, 248, 0.72)"
          onFormatChange={handleFormatChange}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const popup = document.body.querySelector(
        '[data-rue-color-picker-popup="true"]',
      ) as HTMLDivElement
      const select = popup.querySelector('select') as HTMLSelectElement
      const labels = Array.from(popup.querySelectorAll('label > span')).map(
        node => node.textContent,
      )
      expect(select).toBeTruthy()
      expect(labels).toContain('R')
      expect(labels).toContain('G')
      expect(labels).toContain('B')
    })

    const popup = document.body.querySelector(
      '[data-rue-color-picker-popup="true"]',
    ) as HTMLDivElement
    const select = popup.querySelector('select') as HTMLSelectElement
    select.value = 'hsb'
    select.dispatchEvent(new Event('input', { bubbles: true }))
    select.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      const labels = Array.from(popup.querySelectorAll('label > span')).map(
        node => node.textContent,
      )
      expect(labels).toContain('H')
      expect(labels).toContain('S')
      expect(labels).toContain('B')
      expect(handleFormatChange).toHaveBeenCalledTimes(1)
    })
  })

  it('updates parent reactive text from format and color callbacks', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    const CallbackPreview = () => {
      const colorValue = ref('rgba(56, 189, 248, 0.72)')
      const formatMode = ref('rgb')
      const cssText = ref('rgba(56, 189, 248, 0.72)')

      return (
        <div>
          <ColorPicker
            defaultOpen={true}
            defaultFormat="rgb"
            value={colorValue.value}
            onFormatChange={nextFormat => {
              formatMode.value = nextFormat
            }}
            onChange={(_nextColor, css) => {
              colorValue.value = css || ''
              cssText.value = css || '已清空'
            }}
          />
          <div data-testid="format-mode">{formatMode.value}</div>
          <div data-testid="css-text">{cssText.value}</div>
        </div>
      )
    }

    mountTestApp(container, () => render(<CallbackPreview />, container))

    const popup = document.body.querySelector(
      '[data-rue-color-picker-popup="true"]',
    ) as HTMLDivElement

    await waitForContent(() => {
      expect(popup.querySelector('select')).toBeTruthy()
      expect(container.querySelector('[data-testid="format-mode"]')?.textContent).toBe('rgb')
    })

    const select = popup.querySelector('select') as HTMLSelectElement
    select.value = 'hsb'
    select.dispatchEvent(new Event('input', { bubbles: true }))
    select.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="format-mode"]')?.textContent).toBe('hsb')
    })

    const hue = popup.querySelector('input[type="range"]') as HTMLInputElement
    hue.value = '120'
    hue.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      const cssText = container.querySelector('[data-testid="css-text"]')?.textContent ?? ''
      expect(cssText).toContain('rgba')
      expect(cssText).not.toBe('rgba(56, 189, 248, 0.72)')
    })
  })

  it('keeps an uncontrolled format selection through parent updates', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    const ControlledColorPreview = () => {
      const colorValue = ref('#1677ff')

      return (
        <div>
          <button
            type="button"
            data-rue-color-picker-test-update="true"
            onClick={() => {
              colorValue.value = '#22c55e'
            }}
          >
            update
          </button>
          <ColorPicker defaultOpen={true} value={colorValue.value} />
        </div>
      )
    }

    mountTestApp(container, () => render(<ControlledColorPreview />, container))

    const popup = document.body.querySelector(
      '[data-rue-color-picker-popup="true"]',
    ) as HTMLDivElement

    await waitForContent(() => {
      expect(popup.querySelector('select')).toBeTruthy()
    })

    const select = popup.querySelector('select') as HTMLSelectElement
    select.value = 'rgb'
    select.dispatchEvent(new Event('input', { bubbles: true }))
    select.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      const labels = Array.from(popup.querySelectorAll('label > span')).map(
        node => node.textContent,
      )
      expect(labels).toContain('R')
      expect(labels).toContain('G')
      expect(labels).toContain('B')
    })

    const updateButton = container.querySelector(
      '[data-rue-color-picker-test-update="true"]',
    ) as HTMLButtonElement
    updateButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      const labels = Array.from(popup.querySelectorAll('label > span')).map(
        node => node.textContent,
      )
      expect(labels).toContain('R')
      expect(labels).toContain('G')
      expect(labels).toContain('B')
    })
  })

  it('does not emit or rerender twice for the same range value', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()
    const handleChangeComplete = vi.fn()

    mountTestApp(container, () =>
      render(
        <ColorPicker
          defaultOpen={true}
          defaultValue="#1677ff"
          onChange={handleChange}
          onChangeComplete={handleChangeComplete}
        />,
        container,
      ),
    )

    const popup = document.body.querySelector(
      '[data-rue-color-picker-popup="true"]',
    ) as HTMLDivElement

    await waitForContent(() => {
      expect(popup.querySelector('input[type="range"]')).toBeTruthy()
    })

    const hue = popup.querySelector('input[type="range"]') as HTMLInputElement
    hue.value = '120'
    hue.dispatchEvent(new Event('input', { bubbles: true }))

    let versionAfterInput = ''
    await waitForContent(() => {
      const activePopup = document.body.querySelector(
        '[data-rue-color-picker-popup="true"]',
      ) as HTMLDivElement
      versionAfterInput = activePopup.getAttribute('data-rue-color-picker-panel-version') ?? ''
      expect(handleChange).toHaveBeenCalledTimes(1)
    })

    hue.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      const activePopup = document.body.querySelector(
        '[data-rue-color-picker-popup="true"]',
      ) as HTMLDivElement
      expect(handleChange).toHaveBeenCalledTimes(1)
      expect(handleChangeComplete).toHaveBeenCalledTimes(1)
      expect(activePopup.getAttribute('data-rue-color-picker-panel-version')).toBe(
        versionAfterInput,
      )
    })
  })

  it('updates popup preview and presets after hue and preset interactions', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <ColorPicker
          defaultOpen={true}
          defaultFormat="rgb"
          defaultValue="#1677ff"
          presets={[
            {
              label: 'Brand',
              colors: ['#ff6b57', '#22c55e'],
            },
          ]}
          onChange={handleChange}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const popup = document.body.querySelector(
        '[data-rue-color-picker-popup="true"]',
      ) as HTMLDivElement
      expect(popup.querySelectorAll('input[type="range"]').length).toBeGreaterThan(0)
      expect(popup.querySelectorAll('button[title]').length).toBe(2)
    })

    const popup = document.body.querySelector(
      '[data-rue-color-picker-popup="true"]',
    ) as HTMLDivElement
    const ranges = popup.querySelectorAll('input[type="range"]')
    const hue = ranges[0] as HTMLInputElement
    hue.value = '120'
    hue.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      const saturation = Array.from(popup.querySelectorAll('div')).find(node =>
        node.getAttribute('style')?.includes('background-color:'),
      ) as HTMLDivElement | undefined
      expect(saturation?.getAttribute('style')).toContain('background-color: rgb(0, 255, 0)')
      expect(handleChange).toHaveBeenCalled()
    })

    const presetButtons = Array.from(popup.querySelectorAll('button[title]')) as HTMLButtonElement[]
    presetButtons[1].dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      expect(handleChange).toHaveBeenCalledTimes(2)
      expect(handleChange.mock.calls[1][0].toHexString()).toBe('#22c55e')
    })
  })

  it('switches visible preset groups and applies colors from the active group', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <ColorPicker
          defaultOpen={true}
          presets={[
            {
              label: 'Warm',
              colors: ['#ff6b57', '#f97316'],
            },
            {
              label: 'Cool',
              colors: ['#0ea5e9', '#22c55e'],
            },
          ]}
          onChange={handleChange}
        />,
        container,
      ),
    )

    const popup = document.body.querySelector(
      '[data-rue-color-picker-popup="true"]',
    ) as HTMLDivElement

    await waitForContent(() => {
      const sections = Array.from(popup.querySelectorAll('section')) as HTMLElement[]
      expect(sections).toHaveLength(2)
      expect(sections[0].className.includes('hidden')).toBe(false)
      expect(sections[1].className.includes('hidden')).toBe(true)
    })

    const groupButtons = Array.from(popup.querySelectorAll('button')).filter(
      node => node.textContent === 'Cool',
    ) as HTMLButtonElement[]
    groupButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      const sections = Array.from(popup.querySelectorAll('section')) as HTMLElement[]
      expect(sections[0].className.includes('hidden')).toBe(true)
      expect(sections[1].className.includes('hidden')).toBe(false)
    })

    const activeSection = Array.from(popup.querySelectorAll('section')).find(
      section => !section.className.includes('hidden'),
    ) as HTMLElement
    const coolPresetButton = activeSection.querySelector(
      'button[title="#22c55e"]',
    ) as HTMLButtonElement
    coolPresetButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      expect(handleChange).toHaveBeenCalledTimes(1)
      expect(handleChange.mock.calls[0][0].toHexString()).toBe('#22c55e')
    })
  })

  it('clears the current color from the popup when allowClear is enabled', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()
    const handleClear = vi.fn()

    mountTestApp(container, () =>
      render(
        <ColorPicker
          defaultOpen={true}
          defaultValue="#1677ff"
          allowClear
          showText
          onChange={handleChange}
          onClear={handleClear}
        />,
        container,
      ),
    )

    const popup = document.body.querySelector(
      '[data-rue-color-picker-popup="true"]',
    ) as HTMLDivElement

    await waitForContent(() => {
      const clearButton = popup.querySelector(
        '[data-rue-color-picker-popup-clear="true"]',
      ) as HTMLButtonElement
      expect(clearButton).toBeTruthy()
    })

    const clearButton = popup.querySelector(
      '[data-rue-color-picker-popup-clear="true"]',
    ) as HTMLButtonElement
    clearButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      const popupHost = document.body.querySelector(
        '[data-rue-color-picker-popup-host="true"]',
      ) as HTMLDivElement
      expect(popupHost.getAttribute('aria-hidden')).toBe('true')
      expect(handleClear).toHaveBeenCalledTimes(1)
      expect(handleChange.mock.calls[handleChange.mock.calls.length - 1]?.[0]).toBeNull()
      expect(handleChange.mock.calls[handleChange.mock.calls.length - 1]?.[1]).toBe('')
    })
  })
})
