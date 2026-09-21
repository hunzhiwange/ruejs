import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import LabelPage from '../../../app/pages/design/Label'
import { render, click, mountContainer, waitForContent } from './page-test-utils'

vi.mock('@rue-js/design', async () => {
  const [labelModule, tabsModule] = await Promise.all([
    import('../../rue-design/src/components/label'),
    import('../../rue-design/src/components/tabs'),
  ])

  return {
    Label: labelModule.default,
    Tabs: tabsModule.default,
  }
})

vi.mock('../../../app/pages/site/SidebarPlaygroundDesign', () => ({
  default: (props: { children?: unknown }) => (
    <div data-testid="mock-sidebar-design">{props.children}</div>
  ),
}))

vi.mock('../../../app/pages/site/components/Code', () => ({
  default: () => null,
}))

setReactiveScheduling('sync')

const setEnabledPreviews = (...titles: string[]) => {
  ;(
    globalThis as { __RUE_TEST_ENABLED_DESIGN_PREVIEWS__?: Set<string> }
  ).__RUE_TEST_ENABLED_DESIGN_PREVIEWS__ = new Set(titles)
}

const normalize = (value: string | null | undefined) => value?.replace(/\s+/g, ' ').trim() ?? ''

const findTabButton = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button[role="tab"]')).find(
    button => button.textContent?.trim() === label,
  ) ?? null

const findDemo = (root: ParentNode, title: string) =>
  Array.from(root.querySelectorAll('.component-preview')).find(
    node => normalize(node.querySelector('h2')?.textContent) === title,
  ) ?? null

afterEach(() => {
  delete (globalThis as { __RUE_TEST_ENABLED_DESIGN_PREVIEWS__?: Set<string> })
    .__RUE_TEST_ENABLED_DESIGN_PREVIEWS__
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('Label actual page', () => {
  it('renders label demos and restores the first preview after toggling code', async () => {
    setEnabledPreviews(
      'Label for input',
      '字段说明',
      'Textarea 字段',
      'Floating Label',
      'Floating Label with Different Sizes',
      'Floating Label with feedback',
    )

    const container = mountContainer()
    render(<LabelPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Label 标签包装')
      expect(container.querySelectorAll('.component-preview').length).toBe(12)
    })

    const basicDemo = findDemo(container, '# Label for input') as HTMLElement | null
    const fieldDemo = findDemo(container, '# 字段说明') as HTMLElement | null
    const textareaDemo = findDemo(container, '# Textarea 字段') as HTMLElement | null
    const floatingDemo = findDemo(container, '# Floating Label') as HTMLElement | null
    const sizeDemo = findDemo(
      container,
      '# Floating Label with Different Sizes',
    ) as HTMLElement | null
    const feedbackDemo = findDemo(container, '# Floating Label with feedback') as HTMLElement | null

    expect(basicDemo).not.toBeNull()
    expect(fieldDemo).not.toBeNull()
    expect(textareaDemo).not.toBeNull()
    expect(floatingDemo).not.toBeNull()
    expect(sizeDemo).not.toBeNull()
    expect(feedbackDemo).not.toBeNull()

    await waitForContent(() => {
      expect(basicDemo?.querySelector('[data-testid="label-input-basic"] .label')).not.toBeNull()
      expect(fieldDemo?.textContent).toContain('Workspace URL')
      expect(fieldDemo?.querySelector('label.input')).not.toBeNull()
      expect(textareaDemo?.querySelector('label.textarea')).not.toBeNull()
      expect(floatingDemo?.querySelector('[data-testid="label-floating-root"]')).not.toBeNull()
      expect(sizeDemo?.querySelectorAll('.floating-label').length).toBe(5)
      expect(feedbackDemo?.textContent).toContain('Billing contact')
    })

    await click(findTabButton(basicDemo!, 'JSX代码'))
    expect(findDemo(container, '# Label for input')?.querySelector('label.input')).toBeNull()
    await click(findTabButton(findDemo(container, '# Label for input')!, '预览'))

    await waitForContent(() => {
      expect(findDemo(container, '# Label for input')?.querySelector('label.input')).not.toBeNull()
    })
  })
})
