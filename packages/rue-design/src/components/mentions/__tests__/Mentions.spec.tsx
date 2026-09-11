import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref, render } from '@rue-js/rue'
import Mentions from '../index'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

const setCaretToEnd = (element: HTMLTextAreaElement) => {
  const position = element.value.length
  element.setSelectionRange(position, position)
}

const debouncedMentionOptions = [
  { value: 'alice', label: 'Alice' },
  { value: 'alex', label: 'Alex' },
  { value: 'bob', label: 'Bob' },
]

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('Mentions', () => {
  it('opens the popup and inserts the highlighted option with Enter', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleSelect = vi.fn()

    const ControlledMentionsCase = () => {
      const value = ref('')

      return (
        <Mentions
          data-testid="mentions-input"
          value={value.value}
          options={[
            { value: 'alice', label: 'Alice' },
            { value: 'bob', label: 'Bob' },
          ]}
          onChange={text => {
            value.value = text
          }}
          onSelect={handleSelect}
        />
      )
    }

    mountTestApp(container, () => render(<ControlledMentionsCase />, container))

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="mentions-input"]')).toBeTruthy()
    })

    const textarea = container.querySelector(
      '[data-testid="mentions-input"]',
    ) as HTMLTextAreaElement
    textarea.focus()
    textarea.value = 'Hello @a'
    setCaretToEnd(textarea)
    textarea.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      const options = container.querySelectorAll('[role="option"]')
      expect(options).toHaveLength(1)
      expect(options[0]?.textContent).toContain('Alice')
    })

    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

    await waitForContent(() => {
      const settledTextarea = container.querySelector(
        '[data-testid="mentions-input"]',
      ) as HTMLTextAreaElement | null
      expect(settledTextarea).toBeTruthy()
      expect(settledTextarea?.value).toBe('Hello @alice ')
    })

    expect(handleSelect).toHaveBeenCalledTimes(1)
    expect(handleSelect).toHaveBeenCalledWith(expect.objectContaining({ value: 'alice' }), '@')
  })

  it('does not intercept Enter while IME composition is active', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleSelect = vi.fn()

    const ControlledMentionsCase = () => {
      const value = ref('')

      return (
        <Mentions
          data-testid="mentions-ime-input"
          value={value.value}
          options={[
            { value: 'alice', label: 'Alice' },
            { value: 'allen', label: 'Allen' },
          ]}
          onChange={text => {
            value.value = text
          }}
          onSelect={handleSelect}
        />
      )
    }

    mountTestApp(container, () => render(<ControlledMentionsCase />, container))

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="mentions-ime-input"]')).toBeTruthy()
    })

    const textarea = container.querySelector(
      '[data-testid="mentions-ime-input"]',
    ) as HTMLTextAreaElement
    textarea.focus()
    textarea.value = 'Hello @a'
    setCaretToEnd(textarea)
    textarea.dispatchEvent(new Event('input', { bubbles: true }))

    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    })
    Object.defineProperty(enterEvent, 'isComposing', { value: true })

    expect(textarea.dispatchEvent(enterEvent)).toBe(true)
    expect(enterEvent.defaultPrevented).toBe(false)
    expect(textarea.value).toBe('Hello @a')
    expect(handleSelect).not.toHaveBeenCalled()
  })

  it('defers controlled value updates until composition ends', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    const ControlledMentionsCase = () => {
      const value = ref('')

      return (
        <Mentions
          data-testid="mentions-composition-input"
          value={value.value}
          options={[
            { value: 'alice', label: 'Alice' },
            { value: 'bob', label: 'Bob' },
          ]}
          onChange={text => {
            handleChange(text)
            value.value = text
          }}
        />
      )
    }

    mountTestApp(container, () => render(<ControlledMentionsCase />, container))

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="mentions-composition-input"]')).toBeTruthy()
    })

    const textarea = container.querySelector(
      '[data-testid="mentions-composition-input"]',
    ) as HTMLTextAreaElement
    textarea.focus()
    textarea.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    textarea.value = 'Hello @a'
    setCaretToEnd(textarea)

    const composingInput = new Event('input', { bubbles: true })
    Object.defineProperty(composingInput, 'isComposing', { value: true })
    textarea.dispatchEvent(composingInput)

    await waitForContent(() => {
      const settledTextarea = container.querySelector(
        '[data-testid="mentions-composition-input"]',
      ) as HTMLTextAreaElement | null
      expect(settledTextarea).toBeTruthy()
      expect(settledTextarea?.value).toBe('Hello @a')
    })

    expect(handleChange).not.toHaveBeenCalled()
    expect(container.querySelector('[role="listbox"]')).toBeNull()

    textarea.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))

    await waitForContent(() => {
      expect(handleChange).toHaveBeenCalledTimes(1)
      expect(handleChange).toHaveBeenLastCalledWith('Hello @a')
      expect(container.querySelectorAll('[role="option"]')).toHaveLength(1)
    })

    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('refreshes popup options when the external options array changes with the same length', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    let swapOptions: (() => void) | undefined

    const SwapOptionsCase = () => {
      const value = ref('')
      const options = ref([
        { value: 'alice', label: 'Alice' },
        { value: 'bob', label: 'Bob' },
      ])

      swapOptions = () => {
        options.value = [
          { value: 'cathy', label: 'Cathy' },
          { value: 'danny', label: 'Danny' },
        ]
      }

      return (
        <div>
          <Mentions
            data-testid="mentions-popup-refresh"
            value={value.value}
            options={options.value}
            onChange={text => {
              value.value = text
            }}
          />
        </div>
      )
    }

    mountTestApp(container, () => render(<SwapOptionsCase />, container))

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="mentions-popup-refresh"]')).toBeTruthy()
    })

    const textarea = container.querySelector(
      '[data-testid="mentions-popup-refresh"]',
    ) as HTMLTextAreaElement
    textarea.focus()
    textarea.value = '@a'
    setCaretToEnd(textarea)
    textarea.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      const optionNodes = container.querySelectorAll('[role="option"]')
      expect(optionNodes).toHaveLength(1)
      expect(optionNodes[0]?.textContent).toContain('Alice')
    })

    swapOptions?.()

    await waitForContent(() => {
      const optionNodes = Array.from(container.querySelectorAll('[role="option"]'))
      const optionText = optionNodes.map(option => option.textContent ?? '')
      expect(optionText).toHaveLength(2)
      expect(optionText.join(' ')).toContain('Cathy')
      expect(optionText.join(' ')).toContain('Danny')
      expect(optionText.join(' ')).not.toContain('Alice')
    })
  })

  it('debounces search-triggered popup updates when searchDebounce is set', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleSearch = vi.fn()

    const ControlledMentionsCase = () => {
      const value = ref('')

      return (
        <Mentions
          data-testid="mentions-debounce-input"
          value={value.value}
          searchDebounce={120}
          options={debouncedMentionOptions}
          onSearch={handleSearch}
          onChange={text => {
            value.value = text
          }}
        />
      )
    }

    mountTestApp(container, () => render(<ControlledMentionsCase />, container))

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="mentions-debounce-input"]')).toBeTruthy()
    })

    const textarea = container.querySelector(
      '[data-testid="mentions-debounce-input"]',
    ) as HTMLTextAreaElement
    textarea.focus()
    textarea.value = '@al'
    setCaretToEnd(textarea)
    textarea.dispatchEvent(new Event('input', { bubbles: true }))

    expect(handleSearch).not.toHaveBeenCalled()

    await new Promise(resolve => setTimeout(resolve, 50))
    expect(handleSearch).not.toHaveBeenCalled()

    await new Promise(resolve => setTimeout(resolve, 100))

    await waitForContent(() => {
      expect(handleSearch).toHaveBeenCalledTimes(1)
      expect(handleSearch).toHaveBeenLastCalledWith('al', '@')
    })

    await waitForContent(() => {
      const options = container.querySelectorAll('[role="option"]')
      expect(options).toHaveLength(2)
      expect(options[0]?.textContent).toContain('Alice')
      expect(options[1]?.textContent).toContain('Alex')
    })
  })

  it('parses mentions across line breaks', () => {
    expect(
      Mentions.getMentions('@sakura\n#release-notes', {
        prefix: ['@', '#'],
      }),
    ).toEqual([
      { prefix: '@', value: 'sakura' },
      { prefix: '#', value: 'release-notes' },
    ])
  })
})
