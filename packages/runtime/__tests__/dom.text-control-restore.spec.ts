import { afterEach, describe, expect, it } from 'vitest'

import {
  hasActiveTextControlWithin,
  hasActiveUncontrolledTextControlWithin,
  restoreTrackedTextControlWithin,
} from '../src/compiler-runtime/form-controls'
import { setDOMValue } from '../src/dom/props'

afterEach(() => {
  const resetInput = document.createElement('input')
  resetInput.type = 'text'
  resetInput.setAttribute('data-testid', '__rue-reset-text-control__')
  document.body.appendChild(resetInput)
  resetInput.focus()
  resetInput.blur()
  document.body.innerHTML = ''
})

describe('DOM text control focus restore', () => {
  it('restores a tracked text input after replacement when no pointer moved focus away', () => {
    const parent = document.createElement('div')
    const input = document.createElement('input')
    input.type = 'text'
    input.setAttribute('data-testid', 'tracked-input')
    parent.appendChild(input)
    document.body.appendChild(parent)

    hasActiveTextControlWithin(parent as any)
    input.focus()
    expect(hasActiveTextControlWithin(parent as any)).toBe(true)

    input.remove()

    const replacement = document.createElement('input')
    replacement.type = 'text'
    replacement.setAttribute('data-testid', 'tracked-input')
    parent.appendChild(replacement)

    expect(restoreTrackedTextControlWithin(parent as any)).toBe(true)
    expect(document.activeElement).toBe(replacement)
  })

  it('does not restore a tracked text input after pointer down on a non-text control', () => {
    const parent = document.createElement('div')
    const input = document.createElement('input')
    input.type = 'text'
    input.setAttribute('data-testid', 'suppressed-input')
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = 'Step'
    parent.append(input, button)
    document.body.appendChild(parent)

    input.focus()
    expect(hasActiveTextControlWithin(parent as any)).toBe(true)

    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    input.blur()

    expect(document.activeElement).not.toBe(input)
    expect(hasActiveTextControlWithin(parent as any)).toBe(false)
    expect(restoreTrackedTextControlWithin(parent as any)).toBe(false)
    expect(document.activeElement).not.toBe(input)

    input.focus()
  })

  it('does not overwrite an active IME composition with a controlled value update', () => {
    const input = document.createElement('input')
    input.type = 'text'
    document.body.appendChild(input)

    hasActiveTextControlWithin(document.body as any)
    input.focus()
    input.value = '正在输入'
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))

    setDOMValue(input, '模型值')
    expect(input.value).toBe('正在输入')

    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    setDOMValue(input, '模型值')
    expect(input.value).toBe('模型值')
  })

  it('distinguishes uncontrolled text from a value-controlled text input', () => {
    const input = document.createElement('input')
    input.type = 'text'
    document.body.appendChild(input)
    input.focus()

    expect(hasActiveUncontrolledTextControlWithin(document.body as any)).toBe(true)

    setDOMValue(input, 'controlled')
    expect(hasActiveUncontrolledTextControlWithin(document.body as any)).toBe(false)
  })
})
