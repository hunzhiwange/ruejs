import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import Textarea from '../index'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Textarea', () => {
  it('renders the base textarea and forwards native props', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Textarea className="h-24" placeholder="Bio" rows={5} value="Rue" disabled={true} />,
        container,
      ),
    )

    await waitForContent(() => {
      const textarea = container.querySelector('textarea.textarea') as HTMLTextAreaElement
      expect(textarea).toBeTruthy()
      expect(textarea.placeholder).toBe('Bio')
      expect(textarea.rows).toBe(5)
      expect(textarea.value).toBe('Rue')
      expect(textarea.disabled).toBe(true)
      expect(textarea.classList.contains('h-24')).toBe(true)
    })
  })

  it('applies semantic modifiers and aliases', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Textarea
          color="default"
          status="warning"
          size="large"
          variant="filled"
          resize="vertical"
          ghost={true}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const textarea = container.querySelector('textarea.textarea') as HTMLTextAreaElement
      expect(textarea.classList.contains('textarea-warning')).toBe(true)
      expect(textarea.classList.contains('textarea-lg')).toBe(true)
      expect(textarea.classList.contains('textarea-ghost')).toBe(true)
      expect(textarea.classList.contains('border-transparent')).toBe(true)
      expect(textarea.classList.contains('resize-y')).toBe(true)
    })
  })

  it('forwards input and change events', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleInput = vi.fn()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <Textarea data-testid="bio" onInput={handleInput} onChange={handleChange} value="Before" />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="bio"]')).toBeTruthy()
    })

    const textarea = container.querySelector('[data-testid="bio"]') as HTMLTextAreaElement
    textarea.value = 'After'
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    textarea.dispatchEvent(new Event('change', { bubbles: true }))

    expect(handleInput).toHaveBeenCalledTimes(1)
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('renders count and clears current value', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleClear = vi.fn()
    const handleInput = vi.fn()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <Textarea
          data-testid="textarea-count"
          maxLength={10}
          showCount={true}
          allowClear={true}
          onClear={handleClear}
          onInput={handleInput}
          onChange={handleChange}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const count = container.querySelector('[data-rue-textarea-count="true"]')
      expect(count?.textContent?.trim()).toBe('0 / 10')
    })

    const textarea = container.querySelector(
      '[data-testid="textarea-count"]',
    ) as HTMLTextAreaElement
    textarea.value = 'Rue'
    textarea.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      const count = container.querySelector('[data-rue-textarea-count="true"]')
      const clearButton = container.querySelector(
        'button[aria-label="Clear text"]',
      ) as HTMLButtonElement
      expect(count?.textContent?.trim()).toBe('3 / 10')
      expect(clearButton).toBeTruthy()
      expect(clearButton.classList.contains('hidden')).toBe(false)
    })

    const clearButton = container.querySelector(
      'button[aria-label="Clear text"]',
    ) as HTMLButtonElement
    clearButton.click()

    await waitForContent(() => {
      const count = container.querySelector('[data-rue-textarea-count="true"]')
      expect(textarea.value).toBe('')
      expect(count?.textContent?.trim()).toBe('0 / 10')
    })

    expect(handleClear).toHaveBeenCalledTimes(1)
    expect(handleInput).toHaveBeenCalledTimes(2)
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('supports autoSize with minRows and maxRows', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const originalScrollHeight = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'scrollHeight',
    )
    const computedStyleSpy = vi.spyOn(window, 'getComputedStyle').mockImplementation(
      () =>
        ({
          lineHeight: '20px',
          fontSize: '16px',
          borderTopWidth: '1px',
          borderBottomWidth: '1px',
          paddingTop: '0px',
          paddingBottom: '0px',
        }) as CSSStyleDeclaration,
    )

    Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        return 120
      },
    })

    mountTestApp(container, () =>
      render(
        <Textarea autoSize={{ minRows: 2, maxRows: 4 }} defaultValue={'a\nb\nc\nd\ne'} />,
        container,
      ),
    )

    await waitForContent(() => {
      const textarea = container.querySelector('textarea.textarea') as HTMLTextAreaElement
      expect(textarea.rows).toBe(2)
      expect(textarea.style.height).toBe('82px')
      expect(textarea.style.overflowY).toBe('auto')
    })

    computedStyleSpy.mockRestore()
    if (originalScrollHeight) {
      Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', originalScrollHeight)
    } else {
      delete (HTMLTextAreaElement.prototype as any).scrollHeight
    }
  })

  it('keeps wrapped autoSize textarea stable and honors rows as min height', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const originalScrollHeight = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'scrollHeight',
    )
    const computedStyleSpy = vi.spyOn(window, 'getComputedStyle').mockImplementation(
      () =>
        ({
          lineHeight: '18px',
          fontSize: '12px',
          borderTopWidth: '1px',
          borderBottomWidth: '1px',
          paddingTop: '4px',
          paddingBottom: '4px',
        }) as CSSStyleDeclaration,
    )

    Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', {
      configurable: true,
      get() {
        return 24
      },
    })

    mountTestApp(container, () =>
      render(
        <Textarea autoSize={true} rows={3} allowClear={true} showCount={true} defaultValue="Rue" />,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-rue-textarea-root="true"]') as HTMLDivElement
      const inputWrap = root.querySelector('.relative.w-full') as HTMLDivElement
      const textarea = root.querySelector('textarea.textarea') as HTMLTextAreaElement
      const clearButton = root.querySelector('button[aria-label="Clear text"]') as HTMLButtonElement

      expect(root.classList.contains('w-full')).toBe(true)
      expect(inputWrap).toBeTruthy()
      expect(textarea.classList.contains('w-full')).toBe(true)
      expect(textarea.classList.contains('resize-none')).toBe(true)
      expect(textarea.rows).toBe(3)
      expect(textarea.style.height).toBe('64px')
      expect(clearButton.classList.contains('hidden')).toBe(false)
    })

    computedStyleSpy.mockRestore()
    if (originalScrollHeight) {
      Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', originalScrollHeight)
    } else {
      delete (HTMLTextAreaElement.prototype as any).scrollHeight
    }
  })

  it('allows explicit resize direction to override autoSize default lock', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(<Textarea autoSize={true} resize="vertical" defaultValue="Rue" />, container),
    )

    await waitForContent(() => {
      const textarea = container.querySelector('textarea.textarea') as HTMLTextAreaElement
      expect(textarea.classList.contains('resize-y')).toBe(true)
      expect(textarea.classList.contains('resize-none')).toBe(false)
    })
  })
})
