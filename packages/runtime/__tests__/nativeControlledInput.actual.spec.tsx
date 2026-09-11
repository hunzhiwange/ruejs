import { afterEach, describe, expect, it } from 'vitest'

import { createContext, signal, render, type FC } from '@rue-js/rue'
import { setReactiveScheduling } from '../src'
import { provideContext } from '../src/compiler-runtime/context'
import { mountContainer, waitForContent } from './page-test-utils'

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
  setReactiveScheduling('sync')
})

const ChildrenShell: FC<{ children?: unknown }> = props => {
  return <section data-testid="native-controlled-shell">{props.children}</section>
}

const StableTextContext = createContext('stable')

const StableTextProvider: FC<{ children?: unknown }> = props => {
  provideContext(StableTextContext, () => 'stable')
  return <>{props.children}</>
}

const ControlledInputCase: FC = () => {
  const text = signal('Alice')

  return (
    <ChildrenShell>
      <input
        data-testid="native-controlled-input"
        className="input"
        value={text.get()}
        onInput={(event: Event) => {
          text.set((event.target as HTMLInputElement).value)
        }}
      />
      <div data-testid="native-controlled-output">{String(text.get())}</div>
    </ChildrenShell>
  )
}

const ControlledInputField: FC<{ text: { get(): string; set(value: string): void } }> = props => {
  return (
    <label className="form-control gap-2">
      <span className="label-text font-medium">用户名</span>
      <input
        data-testid="split-controlled-input"
        className="input"
        value={props.text.get()}
        onInput={(event: Event) => {
          props.text.set((event.target as HTMLInputElement).value)
        }}
      />
    </label>
  )
}

const SplitControlledInputCase: FC = () => {
  const text = signal('Alice')

  return (
    <ChildrenShell>
      <ControlledInputField text={text} />
      <div data-testid="split-controlled-output">{String(text.get())}</div>
    </ChildrenShell>
  )
}

const DirectSplitControlledInputCase: FC = () => {
  const text = signal('Alice')

  return (
    <>
      <ControlledInputField text={text} />
      <div data-testid="direct-split-controlled-output">{String(text.get())}</div>
    </>
  )
}

const ProviderControlledInputCase: FC = () => {
  const text = signal('Alice')

  return (
    <StableTextProvider>
      <ChildrenShell>
        <label className="form-control gap-2">
          <span className="label-text font-medium">用户名</span>
          <input
            data-testid="provider-controlled-input"
            className="input"
            value={text.get()}
            onInput={(event: Event) => {
              text.set((event.target as HTMLInputElement).value)
            }}
          />
        </label>
        <div data-testid="provider-controlled-output">{String(text.get())}</div>
      </ChildrenShell>
    </StableTextProvider>
  )
}

describe('native controlled input through renderable children shell', () => {
  it('preserves the active input element while typing ASCII', async () => {
    const container = mountContainer()
    render(<ControlledInputCase />, container)

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="native-controlled-input"]')).toBeTruthy()
      expect(container.querySelector('[data-testid="native-controlled-output"]')?.textContent).toBe(
        'Alice',
      )
    })

    const initialInput = container.querySelector(
      '[data-testid="native-controlled-input"]',
    ) as HTMLInputElement | null

    expect(initialInput).not.toBeNull()

    initialInput!.focus()
    initialInput!.value = 'Alice Rue'
    initialInput!.setSelectionRange(9, 9)
    initialInput!.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))

    await waitForContent(() => {
      const currentInput = container.querySelector(
        '[data-testid="native-controlled-input"]',
      ) as HTMLInputElement | null
      expect(currentInput).toBe(initialInput)
      expect(document.activeElement).toBe(currentInput)
      expect(currentInput?.value).toBe('Alice Rue')
      expect(currentInput?.selectionStart).toBe(9)
      expect(currentInput?.selectionEnd).toBe(9)
      expect(container.querySelector('[data-testid="native-controlled-output"]')?.textContent).toBe(
        'Alice Rue',
      )
    })
  })

  it('preserves the active input element during IME composition and commit', async () => {
    const container = mountContainer()
    render(<ControlledInputCase />, container)

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="native-controlled-input"]')).toBeTruthy()
    })

    const initialInput = container.querySelector(
      '[data-testid="native-controlled-input"]',
    ) as HTMLInputElement | null

    expect(initialInput).not.toBeNull()

    initialInput!.focus()
    initialInput!.dispatchEvent(new Event('compositionstart', { bubbles: true, cancelable: true }))
    initialInput!.value = 'li'

    const compositionInputEvent = new Event('input', { bubbles: true, cancelable: true })
    Object.defineProperty(compositionInputEvent, 'inputType', { value: 'insertCompositionText' })
    Object.defineProperty(compositionInputEvent, 'isComposing', { value: true })

    initialInput!.dispatchEvent(compositionInputEvent)

    await waitForContent(() => {
      const currentInput = container.querySelector(
        '[data-testid="native-controlled-input"]',
      ) as HTMLInputElement | null
      expect(currentInput).toBe(initialInput)
      expect(document.activeElement).toBe(currentInput)
      expect(currentInput?.value).toBe('li')
      expect(container.querySelector('[data-testid="native-controlled-output"]')?.textContent).toBe(
        'li',
      )
    })

    initialInput!.value = '李'
    initialInput!.dispatchEvent(new Event('compositionend', { bubbles: true, cancelable: true }))
    initialInput!.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))

    await waitForContent(() => {
      const currentInput = container.querySelector(
        '[data-testid="native-controlled-input"]',
      ) as HTMLInputElement | null
      expect(currentInput).toBe(initialInput)
      expect(document.activeElement).toBe(currentInput)
      expect(currentInput?.value).toBe('李')
      expect(container.querySelector('[data-testid="native-controlled-output"]')?.textContent).toBe(
        '李',
      )
    })
  })

  it('preserves the same input element while composing inside a stable provider boundary', async () => {
    const container = mountContainer()
    render(<ProviderControlledInputCase />, container)

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="provider-controlled-input"]')).toBeTruthy()
    })

    const initialInput = container.querySelector(
      '[data-testid="provider-controlled-input"]',
    ) as HTMLInputElement | null

    expect(initialInput).not.toBeNull()

    initialInput!.focus()
    initialInput!.dispatchEvent(new Event('compositionstart', { bubbles: true, cancelable: true }))
    initialInput!.value = 'li'

    const compositionInputEvent = new Event('input', { bubbles: true, cancelable: true })
    Object.defineProperty(compositionInputEvent, 'inputType', { value: 'insertCompositionText' })
    Object.defineProperty(compositionInputEvent, 'isComposing', { value: true })

    initialInput!.dispatchEvent(compositionInputEvent)

    await waitForContent(() => {
      const currentInput = container.querySelector(
        '[data-testid="provider-controlled-input"]',
      ) as HTMLInputElement | null
      expect(currentInput).toBe(initialInput)
      expect(document.activeElement).toBe(currentInput)
      expect(currentInput?.value).toBe('li')
      expect(
        container.querySelector('[data-testid="provider-controlled-output"]')?.textContent,
      ).toBe('li')
    })

    initialInput!.value = '李'
    initialInput!.dispatchEvent(new Event('compositionend', { bubbles: true, cancelable: true }))
    initialInput!.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))

    await waitForContent(() => {
      const currentInput = container.querySelector(
        '[data-testid="provider-controlled-input"]',
      ) as HTMLInputElement | null
      expect(document.activeElement).toBe(currentInput)
      expect(currentInput?.value).toBe('李')
      expect(
        container.querySelector('[data-testid="provider-controlled-output"]')?.textContent,
      ).toBe('李')
    })
  })

  it('preserves the same child input element while the parent renders the mirrored value', async () => {
    const container = mountContainer()
    render(<SplitControlledInputCase />, container)

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="split-controlled-input"]')).toBeTruthy()
    })

    const initialInput = container.querySelector(
      '[data-testid="split-controlled-input"]',
    ) as HTMLInputElement | null
    expect(initialInput).not.toBeNull()

    initialInput!.focus()
    initialInput!.dispatchEvent(new Event('compositionstart', { bubbles: true, cancelable: true }))
    initialInput!.value = 'li'

    const compositionInputEvent = new Event('input', { bubbles: true, cancelable: true })
    Object.defineProperty(compositionInputEvent, 'inputType', { value: 'insertCompositionText' })
    Object.defineProperty(compositionInputEvent, 'isComposing', { value: true })

    initialInput!.dispatchEvent(compositionInputEvent)

    await waitForContent(() => {
      const currentInput = container.querySelector(
        '[data-testid="split-controlled-input"]',
      ) as HTMLInputElement | null
      expect(currentInput).toBe(initialInput)
      expect(document.activeElement).toBe(currentInput)
      expect(currentInput?.value).toBe('li')
      expect(container.querySelector('[data-testid="split-controlled-output"]')?.textContent).toBe(
        'li',
      )
    })
  })

  it('preserves the same direct child input element while the parent mirrors the value', async () => {
    const container = mountContainer()
    render(<DirectSplitControlledInputCase />, container)

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="split-controlled-input"]')).toBeTruthy()
    })

    const initialInput = container.querySelector(
      '[data-testid="split-controlled-input"]',
    ) as HTMLInputElement | null
    const initialField = initialInput?.parentElement

    expect(initialInput).not.toBeNull()

    initialInput!.focus()
    initialInput!.dispatchEvent(new Event('compositionstart', { bubbles: true, cancelable: true }))
    initialInput!.value = 'li'

    const compositionInputEvent = new Event('input', { bubbles: true, cancelable: true })
    Object.defineProperty(compositionInputEvent, 'inputType', { value: 'insertCompositionText' })
    Object.defineProperty(compositionInputEvent, 'isComposing', { value: true })

    initialInput!.dispatchEvent(compositionInputEvent)

    await waitForContent(() => {
      const currentInput = container.querySelector(
        '[data-testid="split-controlled-input"]',
      ) as HTMLInputElement | null
      expect(currentInput?.parentElement).toBe(initialField)
      expect(document.activeElement).toBe(currentInput)
      expect(currentInput?.value).toBe('li')
      expect(
        container.querySelector('[data-testid="direct-split-controlled-output"]')?.textContent,
      ).toBe('li')
    })

    initialInput!.value = '李'
    initialInput!.dispatchEvent(new Event('compositionend', { bubbles: true, cancelable: true }))
    initialInput!.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))

    await waitForContent(() => {
      const currentInput = container.querySelector(
        '[data-testid="split-controlled-input"]',
      ) as HTMLInputElement | null
      expect(document.activeElement).toBe(currentInput)
      expect(currentInput?.value).toBe('李')
      expect(
        container.querySelector('[data-testid="direct-split-controlled-output"]')?.textContent,
      ).toBe('李')
    })
  })
})
