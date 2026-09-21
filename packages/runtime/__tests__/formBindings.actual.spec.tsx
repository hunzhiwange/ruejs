import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import FormBindings from '../../../app/pages/examples/FormBindings'
import { click, mountContainer, render, waitForContent } from './page-test-utils'

vi.mock('../../../app/pages/site/SidebarPlaygroundExample', () => ({
  default: (props: { children?: unknown }) => (
    <div data-testid="mock-sidebar-example">{props.children}</div>
  ),
}))

vi.mock('../../../app/pages/site/components/Code', () => ({
  default: () => <></>,
}))

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

const findTab = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button[role="tab"]')).find(
    button => button.textContent?.trim() === label,
  ) ?? null

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('FormBindings actual page', () => {
  it('keeps text, checkbox, radio, and select bindings in sync on the preview tab', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<FormBindings />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('表单绑定（移植自 Vue）')
      expect(container.textContent).toContain('Checked: true')
      expect(container.textContent).toContain('Checked names: Jack')
      expect(container.textContent).toContain('Picked: One')
      expect(container.textContent).toContain('Selected: A')
    })

    const textInput = container.querySelector('input.input') as HTMLInputElement | null
    expect(textInput).not.toBeNull()
    textInput!.value = 'Rue forms'
    textInput!.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))

    const mainCheckbox = container.querySelector('#checkbox') as HTMLInputElement | null
    expect(mainCheckbox).not.toBeNull()
    mainCheckbox!.checked = false
    mainCheckbox!.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }))

    const johnCheckbox = container.querySelector(
      'input[type="checkbox"][value="John"]',
    ) as HTMLInputElement | null
    expect(johnCheckbox).not.toBeNull()
    johnCheckbox!.checked = true
    johnCheckbox!.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }))

    const radioTwo = container.querySelector(
      'input[type="radio"][value="Two"]',
    ) as HTMLInputElement | null
    expect(radioTwo).not.toBeNull()
    radioTwo!.checked = true
    radioTwo!.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }))

    const selects = Array.from(container.querySelectorAll('select')) as HTMLSelectElement[]
    expect(selects).toHaveLength(2)

    selects[0].value = 'C'
    selects[0].dispatchEvent(new Event('change', { bubbles: true, cancelable: true }))

    const ordinaryClickOption = async (value: string) => {
      const option = Array.from(selects[1].options).find(item => item.value === value) ?? null
      expect(option).not.toBeNull()
      option!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
      option!.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }))
      option!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      await Promise.resolve()
    }

    await ordinaryClickOption('B')
    await waitForContent(() => {
      expect(container.textContent).toContain('Selected: A, B')
      expect(Array.from(selects[1].selectedOptions, option => option.value)).toEqual(['A', 'B'])
    })

    await ordinaryClickOption('C')
    await waitForContent(() => {
      expect(container.textContent).toContain('Selected: A, B, C')
      expect(Array.from(selects[1].selectedOptions, option => option.value)).toEqual([
        'A',
        'B',
        'C',
      ])
    })

    await ordinaryClickOption('A')

    await waitForContent(() => {
      expect(container.textContent).toContain('Rue forms')
      expect(container.textContent).toContain('Checked: false')
      expect(container.textContent).toContain('Checked names: Jack, John')
      expect(container.textContent).toContain('Picked: Two')
      expect(container.textContent).toContain('Selected: C')
      expect(container.textContent).toContain('Selected: B, C')
      expect(Array.from(selects[1].selectedOptions, option => option.value)).toEqual(['B', 'C'])
    })

    await click(findTab(container, '代码'))

    expect(container.querySelector('select')).toBeNull()
    expect(container.querySelector('#checkbox')).toBeNull()
  })
})
