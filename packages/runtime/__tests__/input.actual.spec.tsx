import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import InputPage from '../../../app/pages/design/Input'
import { render, click, mountContainer, waitForContent } from './page-test-utils'
import { findDemo, findTabButton, resetActiveRuntime } from './design-page-test-utils'

const previewState = vi.hoisted(() => ({
  enabledTitles: new Set<string>(),
}))

vi.mock('../../../app/pages/site/SidebarPlaygroundDesign', () => ({
  default: (props: { children?: unknown }) => (
    <div data-testid="mock-sidebar-design">{props.children}</div>
  ),
}))

vi.mock('../../../app/pages/site/components/Code', () => ({
  default: () => null,
}))

vi.mock('../../../app/pages/design/PreviewBlock', () => ({
  __esModule: true,
  default: (props: {
    title: string
    summary?: string
    tab: { value: 'preview' | 'code' }
    preview: (() => any) | any
  }) => {
    let previewContent: any = null
    let detachedPreview: Element | null = null

    if (props.tab.value === 'preview' && previewState.enabledTitles.has(props.title)) {
      if (typeof props.preview === 'function') {
        const PreviewComponent = props.preview as any
        previewContent = PreviewComponent({})
      } else {
        previewContent = props.preview ?? null
      }
    }

    return (
      <div className="component-preview not-prose text-base-content my-6 lg:my-12">
        <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># {props.title}</h2>
        {props.summary ? <p className="m-0 text-sm opacity-70">{props.summary}</p> : null}
        <div role="tablist" className="tabs tabs-box mb-3">
          <button
            role="tab"
            className={`tab ${props.tab.value === 'preview' ? 'tab-active' : ''}`}
            onClick={(event: MouseEvent) => {
              props.tab.value = 'preview'
              const root = (event.currentTarget as Element).closest('.component-preview')
              if (root && detachedPreview) root.appendChild(detachedPreview)
            }}
          >
            预览
          </button>
          <button
            role="tab"
            className={`tab ${props.tab.value === 'code' ? 'tab-active' : ''}`}
            onClick={(event: MouseEvent) => {
              props.tab.value = 'code'
              const root = (event.currentTarget as Element).closest('.component-preview')
              detachedPreview = root?.querySelector('[data-rue-test-preview]') ?? null
              detachedPreview?.remove()
            }}
          >
            JSX代码
          </button>
        </div>
        <div data-rue-test-preview="true">{previewContent}</div>
      </div>
    )
  },
}))

setReactiveScheduling('sync')

afterEach(() => {
  previewState.enabledTitles.clear()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('Input actual page', () => {
  it('renders input demos, updates the basic value, and restores the shell preview after toggling code', async () => {
    previewState.enabledTitles.add('Text input')
    previewState.enabledTitles.add('Text input with text label inside')

    const container = mountContainer()
    resetActiveRuntime()
    render(<InputPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Input 输入框')
      expect(container.querySelectorAll('.component-preview').length).toBeGreaterThan(0)
    })

    const basicDemo = findDemo(container, '# Text input') as HTMLElement | null
    const shellDemo = findDemo(
      container,
      '# Text input with text label inside',
    ) as HTMLElement | null
    expect(basicDemo).not.toBeNull()
    expect(shellDemo).not.toBeNull()

    const basicInput = basicDemo!.querySelector('[data-testid="input-basic"]') as HTMLInputElement
    basicInput.value = 'Rue'
    basicInput.dispatchEvent(new Event('input', { bubbles: true }))
    expect(basicInput.value).toBe('Rue')

    await waitForContent(() => {
      expect(shellDemo!.querySelectorAll('.input').length).toBe(2)
      expect(shellDemo!.querySelector('input[type="search"]')).not.toBeNull()
    })

    await click(findTabButton(shellDemo!, 'JSX代码'))
    const shellDemoInCode = findDemo(
      container,
      '# Text input with text label inside',
    ) as HTMLElement | null
    expect(shellDemoInCode!.querySelectorAll('.input').length).toBe(0)

    await click(findTabButton(shellDemoInCode!, '预览'))

    await waitForContent(() => {
      const restoredDemo = findDemo(
        container,
        '# Text input with text label inside',
      ) as HTMLElement | null
      expect(restoredDemo!.querySelectorAll('.input').length).toBe(2)
    })
  })
})
