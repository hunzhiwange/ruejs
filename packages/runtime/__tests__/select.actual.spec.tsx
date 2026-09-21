import { afterEach, describe, expect, it, vi } from 'vitest'
import { setReactiveScheduling } from '../src'
import SelectPage from '../../../app/pages/design/Select'
import { render, click, mountContainer, waitForContent } from './page-test-utils'
import { findDemo, findTabButton, normalize, resetActiveRuntime } from './design-page-test-utils'

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

describe('Select actual page', () => {
  it('renders enhanced select demos and updates the basic selection', async () => {
    previewState.enabledTitles.add('Select')
    previewState.enabledTitles.add('Data source and groups')
    previewState.enabledTitles.add('Native multiple listbox via nativeSize')

    const container = mountContainer()
    resetActiveRuntime()
    render(<SelectPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Select 选择器')
      expect(container.querySelectorAll('.component-preview').length).toBeGreaterThan(0)
    })

    const basicDemo = findDemo(container, '# Select') as HTMLElement | null
    const dataDemo = findDemo(container, '# Data source and groups') as HTMLElement | null
    const multipleDemo = findDemo(
      container,
      '# Native multiple listbox via nativeSize',
    ) as HTMLElement | null
    expect(basicDemo).not.toBeNull()
    expect(dataDemo).not.toBeNull()
    expect(multipleDemo).not.toBeNull()

    await waitForContent(() => {
      expect(normalize(basicDemo?.textContent)).toContain('当前选择：Amber')
      expect(dataDemo!.querySelectorAll('optgroup').length).toBe(2)
      expect(
        multipleDemo!.querySelector('[data-testid="select-native-multiple"][multiple][size="6"]'),
      ).not.toBeNull()
    })

    const select = basicDemo!.querySelector('[data-testid="select-basic"]') as HTMLSelectElement
    select.value = 'velvet'
    select.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      const currentDemo = findDemo(container, '# Select') as HTMLElement | null
      expect(normalize(currentDemo?.textContent)).toContain('当前选择：Velvet')
    })
  })

  it('clears shell mode in the prefix and suffix demo', async () => {
    previewState.enabledTitles.add('Prefix, suffix and allowClear')

    const container = mountContainer()
    resetActiveRuntime()
    render(<SelectPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Select 选择器')
    })

    const shellDemo = findDemo(container, '# Prefix, suffix and allowClear') as HTMLElement | null
    expect(shellDemo).not.toBeNull()

    const clearButton = shellDemo!.querySelector(
      'button[aria-label="清空选择"]',
    ) as HTMLButtonElement
    expect(clearButton).not.toBeNull()
    await click(clearButton)

    await waitForContent(() => {
      const currentShellDemo = findDemo(
        container,
        '# Prefix, suffix and allowClear',
      ) as HTMLElement | null
      expect(normalize(currentShellDemo?.textContent)).toContain('当前 owner：未设置')
    })
  })

  it('restores the basic select preview after toggling code', async () => {
    previewState.enabledTitles.add('Select')

    const container = mountContainer()
    resetActiveRuntime()
    render(<SelectPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Select 选择器')
      expect(findDemo(container, '# Select')).not.toBeNull()
    })

    const basicDemo = findDemo(container, '# Select') as HTMLElement | null
    expect(basicDemo).not.toBeNull()

    await click(findTabButton(basicDemo!, 'JSX代码'))
    const basicDemoInCode = findDemo(container, '# Select') as HTMLElement | null
    expect(basicDemoInCode!.querySelectorAll('select.select').length).toBe(0)

    await click(findTabButton(basicDemoInCode!, '预览'))

    await waitForContent(() => {
      const restoredDemo = findDemo(container, '# Select') as HTMLElement | null
      expect(restoredDemo!.querySelector('[data-testid="select-basic"]')).not.toBeNull()
    })
  })
})
