import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import TextareaPage from '../../../app/pages/design/Textarea'
import { render, click, mountContainer, waitForContent } from './page-test-utils'
import { findDemo, findTabButton, resetActiveRuntime } from './design-page-test-utils'

vi.mock('../../../app/pages/site/SidebarPlaygroundDesign', () => ({
  default: (props: { children?: unknown }) => (
    <div data-testid="mock-sidebar-design">{props.children}</div>
  ),
}))

vi.mock('../../../app/pages/site/components/Code', () => ({
  default: () => null,
}))

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('Textarea actual page', () => {
  it('renders textarea demos, updates the basic value, and restores the sizes preview after toggling code', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<TextareaPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Textarea 文本域')
      expect(container.querySelectorAll('.component-preview').length).toBeGreaterThan(0)
    })

    const basicDemo = findDemo(container, '# 基础用法') as HTMLElement | null
    const sizesDemo = findDemo(container, '# 尺寸体系') as HTMLElement | null
    expect(basicDemo).not.toBeNull()
    expect(sizesDemo).not.toBeNull()

    const textarea = basicDemo!.querySelector(
      '[data-testid="textarea-basic"]',
    ) as HTMLTextAreaElement
    textarea.value = 'Updated from test'
    textarea.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      const updatedBasicDemo = findDemo(container, '# 基础用法') as HTMLElement | null
      expect(updatedBasicDemo!.textContent).toContain('Updated from test')
      expect(sizesDemo!.querySelectorAll('textarea.textarea').length).toBe(8)
    })

    await click(findTabButton(sizesDemo!, 'JSX代码'))
    const sizesDemoInCode = findDemo(container, '# 尺寸体系') as HTMLElement | null
    expect(sizesDemoInCode!.querySelectorAll('textarea.textarea').length).toBe(0)

    await click(findTabButton(sizesDemoInCode!, '预览'))

    await waitForContent(() => {
      const restoredSizesDemo = findDemo(container, '# 尺寸体系') as HTMLElement | null
      expect(restoredSizesDemo!.querySelectorAll('textarea.textarea').length).toBe(8)
    })
  })
})
