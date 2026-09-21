import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import DrawerPage from '../../../app/pages/design/Drawer'
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

describe('Drawer actual page', () => {
  it('renders drawer demos and toggles the basic checkbox before restoring preview', async () => {
    previewState.enabledTitles.add('Drawer sidebar')
    previewState.enabledTitles.add('Drawer sidebar that opens from right side')

    const container = mountContainer()
    const basicDemoTitle = '# Drawer sidebar'
    const endDemoTitle = '# Drawer sidebar that opens from right side'

    resetActiveRuntime()
    render(<DrawerPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Drawer')
      expect(container.querySelectorAll('.component-preview').length).toBeGreaterThan(0)
    })

    await waitForContent(() => {
      const currentBasicDemo = findDemo(container, basicDemoTitle) as HTMLElement | null
      const currentEndDemo = findDemo(container, endDemoTitle) as HTMLElement | null
      expect(currentBasicDemo).not.toBeNull()
      expect(currentEndDemo).not.toBeNull()
      expect(currentBasicDemo!.querySelector('[data-testid="drawer-basic-toggle"]')).not.toBeNull()
      expect(currentEndDemo!.querySelector('.drawer-end')).not.toBeNull()
    })

    const basicDemo = findDemo(container, basicDemoTitle) as HTMLElement | null
    expect(basicDemo).not.toBeNull()

    const toggle = basicDemo!.querySelector(
      '[data-testid="drawer-basic-toggle"]',
    ) as HTMLInputElement
    expect(toggle.checked).toBe(false)

    await click(basicDemo!.querySelector('[data-testid="drawer-basic-open"]'))

    await waitForContent(() => {
      const currentBasicDemo = findDemo(container, basicDemoTitle) as HTMLElement | null
      const currentToggle = currentBasicDemo!.querySelector(
        '[data-testid="drawer-basic-toggle"]',
      ) as HTMLInputElement
      expect(currentToggle.checked).toBe(true)
    })

    await click(findTabButton(basicDemo!, 'JSX代码'))
    const basicDemoInCode = findDemo(container, basicDemoTitle) as HTMLElement | null
    expect(basicDemoInCode!.querySelector('.drawer')).toBeNull()

    await click(findTabButton(basicDemoInCode!, '预览'))

    await waitForContent(() => {
      const restoredDemo = findDemo(container, basicDemoTitle) as HTMLElement | null
      expect(restoredDemo!.querySelector('.drawer')).not.toBeNull()
    })
  })
})
