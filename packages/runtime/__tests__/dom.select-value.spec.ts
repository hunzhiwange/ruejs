import { describe, expect, it } from 'vitest'

import { appendChild } from '../src/compiler-runtime/dom.browser'
import { setDOMProperty, setDOMValue } from '../src/dom/props'

describe('DOM select value sync', () => {
  it('keeps a controlled select value when options mount after the value assignment', () => {
    const select = document.createElement('select')

    setDOMValue(select, 'luxury')

    const light = document.createElement('option')
    appendChild(select as any, light as any)
    setDOMValue(light, 'light')
    light.textContent = 'light'

    const luxury = document.createElement('option')
    appendChild(select as any, luxury as any)
    setDOMValue(luxury, 'luxury')
    luxury.textContent = 'luxury'

    const acid = document.createElement('option')
    appendChild(select as any, acid as any)
    setDOMValue(acid, 'acid')
    acid.textContent = 'acid'

    expect(select.value).toBe('luxury')
    expect(select.selectedIndex).toBe(1)
  })

  it('keeps a controlled multi-select selection when options mount after the value assignment', () => {
    const select = document.createElement('select')
    select.multiple = true

    setDOMValue(select, ['dark', 'luxury'])

    const light = document.createElement('option')
    appendChild(select as any, light as any)
    setDOMValue(light, 'light')

    const dark = document.createElement('option')
    appendChild(select as any, dark as any)
    setDOMValue(dark, 'dark')

    const luxury = document.createElement('option')
    appendChild(select as any, luxury as any)
    setDOMValue(luxury, 'luxury')

    expect(light.selected).toBe(false)
    expect(dark.selected).toBe(true)
    expect(luxury.selected).toBe(true)
  })

  it('toggles controlled multi-select options across ordinary clicks', () => {
    const select = document.createElement('select')
    select.multiple = true

    for (const value of ['A', 'B', 'C']) {
      const option = document.createElement('option')
      option.value = value
      option.textContent = value
      select.appendChild(option)
    }

    setDOMValue(select, ['A'])
    const emittedEvents: string[] = []
    select.addEventListener('input', () => emittedEvents.push('input'))
    select.addEventListener('change', () => emittedEvents.push('change'))

    const ordinaryClick = (value: string) => {
      const option = Array.from(select.options).find(item => item.value === value)!
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
      option.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }))
      option.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    }

    ordinaryClick('B')
    expect(Array.from(select.selectedOptions, option => option.value)).toEqual(['A', 'B'])
    expect(emittedEvents).toEqual(['input', 'change'])

    ordinaryClick('C')
    expect(Array.from(select.selectedOptions, option => option.value)).toEqual(['A', 'B', 'C'])

    ordinaryClick('A')
    expect(Array.from(select.selectedOptions, option => option.value)).toEqual(['B', 'C'])
  })

  it('replays a pending array when multiple is enabled and options mount later', () => {
    const select = document.createElement('select')
    for (const value of ['light', 'dark']) {
      const option = document.createElement('option')
      option.value = value
      select.appendChild(option)
    }

    setDOMValue(select, ['dark', 'luxury'])
    setDOMProperty(select, 'multiple', true)

    expect(Array.from(select.selectedOptions, option => option.value)).toEqual(['dark'])

    const luxury = document.createElement('option')
    appendChild(select as any, luxury as any)
    setDOMValue(luxury, 'luxury')

    expect(Array.from(select.selectedOptions, option => option.value)).toEqual(['dark', 'luxury'])
  })
})
