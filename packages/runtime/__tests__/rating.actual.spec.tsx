import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import RatingPage from '../../../app/pages/design/Rating'
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
              const clearableItems = detachedPreview?.querySelectorAll<HTMLInputElement>(
                'input[name="rating-clearable"].mask',
              )
              clearableItems?.forEach((item, index) => {
                item.classList.toggle('opacity-100', index < 2)
                item.classList.toggle('opacity-[0.35]', index >= 2)
                item.checked = index === 1
              })
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

describe('Rating actual page', () => {
  it('renders rating demos, updates rating state, and restores preview after code toggle', async () => {
    previewState.enabledTitles.add('Semantic rating')
    previewState.enabledTitles.add('Clear and half')

    const container = mountContainer()
    resetActiveRuntime()
    render(<RatingPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Rating 评分')
      expect(container.querySelectorAll('.component-preview').length).toBe(10)
    })

    const semanticDemo = () => findDemo(container, '# Semantic rating') as HTMLElement | null
    const advancedDemo = () => findDemo(container, '# Clear and half') as HTMLElement | null

    expect(semanticDemo()).not.toBeNull()
    expect(advancedDemo()).not.toBeNull()

    const fourStar = semanticDemo()!.querySelector(
      'button[data-rating-index="3"]',
    ) as HTMLButtonElement
    await click(fourStar)

    await waitForContent(() => {
      expect(semanticDemo()!.textContent).toContain('当前评分：4')
    })

    const clear = advancedDemo()!.querySelector('input[aria-label="clear"]') as HTMLInputElement
    clear.checked = true
    clear.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      const updatedAdvancedDemo = advancedDemo() as HTMLElement | null
      expect(updatedAdvancedDemo!.textContent).toContain('当前评分：clear')
      expect(updatedAdvancedDemo!.querySelectorAll('.rating').length).toBe(2)
      expect(
        updatedAdvancedDemo!.querySelectorAll('.rating')[0]?.querySelectorAll('input[type="radio"]')
          .length,
      ).toBe(6)
      expect(
        updatedAdvancedDemo!.querySelectorAll('.rating')[1]?.querySelectorAll('input[type="radio"]')
          .length,
      ).toBe(11)
      expect(updatedAdvancedDemo!.querySelectorAll('.rating')[1]?.className).toContain(
        'rating-half',
      )
      expect(updatedAdvancedDemo!.querySelector('input.mask.mask-star-2')?.className).toContain(
        'opacity-[0.35]',
      )
      const clearableItems = Array.from(
        updatedAdvancedDemo!.querySelectorAll<HTMLInputElement>(
          'input[name="rating-clearable"].mask.mask-star-2',
        ),
      )
      expect(clearableItems.every(item => item.classList.contains('opacity-[0.35]'))).toBe(true)
      expect(
        (
          updatedAdvancedDemo!.querySelector(
            'input[name="rating-clearable"][aria-label="clear"]',
          ) as HTMLInputElement
        ).checked,
      ).toBe(true)
    })

    const halfFourPointFive = advancedDemo()!.querySelector(
      'input[name="rating-half"][value="4.5"]',
    ) as HTMLInputElement
    halfFourPointFive.checked = true
    halfFourPointFive.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      const updatedAdvancedDemo = advancedDemo() as HTMLElement | null
      const halfItems = Array.from(
        updatedAdvancedDemo!.querySelectorAll<HTMLInputElement>('input[name="rating-half"].mask'),
      )
      expect(updatedAdvancedDemo!.textContent).toContain('当前评分：4.5')
      expect(halfItems).toHaveLength(10)
      expect(halfItems.map(item => item.classList.contains('opacity-100'))).toEqual([
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        false,
      ])
      expect(halfItems[9]?.classList.contains('opacity-[0.35]')).toBe(true)
      expect(halfItems[8]?.checked).toBe(true)
    })

    await click(findTabButton(advancedDemo()!, 'JSX代码'))
    const advancedDemoInCode = advancedDemo() as HTMLElement | null
    expect(advancedDemoInCode!.querySelectorAll('input[type="radio"]').length).toBe(0)

    await click(findTabButton(advancedDemoInCode!, '预览'))

    await waitForContent(() => {
      const restored = advancedDemo() as HTMLElement | null
      expect(restored!.querySelectorAll('.rating').length).toBe(2)
      expect(
        restored!.querySelectorAll('.rating')[0]?.querySelectorAll('input[type="radio"]').length,
      ).toBe(6)
      expect(
        restored!.querySelectorAll('.rating')[1]?.querySelectorAll('input[type="radio"]').length,
      ).toBe(11)
      expect(restored!.querySelectorAll('.rating')[1]?.className).toContain('rating-half')
      const restoredClearableItems = Array.from(
        restored!.querySelectorAll<HTMLInputElement>('input[name="rating-clearable"].mask'),
      )
      expect(restoredClearableItems.map(item => item.classList.contains('opacity-100'))).toEqual([
        true,
        true,
        false,
        false,
        false,
      ])
    })
  })
})
