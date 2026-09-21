import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import ColorPickerPage from '../../../app/pages/design/ColorPicker'
import { render, click, mountContainer, waitForContent } from './page-test-utils'
import { findDemo, resetActiveRuntime } from './design-page-test-utils'

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

afterEach(() => {
  delete (globalThis as { __RUE_TEST_ENABLED_DESIGN_PREVIEWS__?: Set<string> })
    .__RUE_TEST_ENABLED_DESIGN_PREVIEWS__
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('ColorPicker actual page', () => {
  it('opens the basic picker popup from the design page', async () => {
    setEnabledPreviews('基础受控模式')

    const container = mountContainer()
    resetActiveRuntime()
    render(<ColorPickerPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('ColorPicker 颜色选择器')
      expect(findDemo(container, '# 基础受控模式')).not.toBeNull()
    })

    const basicDemo = findDemo(container, '# 基础受控模式') as HTMLElement | null
    expect(basicDemo).not.toBeNull()

    let triggerTarget: HTMLElement | null = null
    let popupHostId = ''

    await waitForContent(() => {
      const previewHost = basicDemo!.querySelector('.space-y-4.not-prose') as HTMLElement | null
      const picker = previewHost?.firstElementChild as HTMLElement | null

      expect(previewHost).not.toBeNull()
      expect(picker).not.toBeNull()

      triggerTarget = (picker?.querySelector('*') as HTMLElement | null) ?? picker
      expect(triggerTarget).not.toBeNull()
      popupHostId = triggerTarget?.getAttribute('aria-controls') || ''
      expect(popupHostId).not.toBe('')
      const popupHost = document.body.querySelector(`#${popupHostId}`) as HTMLElement | null
      expect(popupHost).not.toBeNull()
      expect(popupHost?.hidden).toBe(true)
      expect(popupHost?.getAttribute('aria-hidden')).toBe('true')
      expect(popupHost?.querySelectorAll('input[type="text"]').length ?? 0).toBeGreaterThan(0)
    })

    await click(triggerTarget)

    await waitForContent(() => {
      const popupHost = document.body.querySelector(`#${popupHostId}`) as HTMLElement | null
      const popupInput = popupHost?.querySelector('input[type="text"]') as HTMLInputElement | null

      expect(popupHost).not.toBeNull()
      expect(popupHost?.hidden).toBe(false)
      expect(popupHost?.getAttribute('aria-hidden')).toBe('false')
      expect(popupInput).not.toBeNull()
      expect(popupInput?.value).toContain('#1677ff')
    })
  })

  it('reflects the format picker callback in the design page preview', async () => {
    setEnabledPreviews('格式切换与透明度')

    const container = mountContainer()
    resetActiveRuntime()
    render(<ColorPickerPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('ColorPicker 颜色选择器')
      expect(findDemo(container, '# 格式切换与透明度')).not.toBeNull()
    })

    const formatDemo = findDemo(container, '# 格式切换与透明度') as HTMLElement
    expect(formatDemo).not.toBeNull()

    const trigger = Array.from(
      formatDemo.querySelectorAll('[data-rue-color-picker-trigger="true"]'),
    ).find(node => node.textContent?.includes('alpha 72%')) as HTMLElement | undefined

    expect(trigger).toBeTruthy()
    trigger!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    await waitForContent(() => {
      const popupHostId = trigger!.getAttribute('aria-controls') || ''
      const popupHost = document.body.querySelector(`#${popupHostId}`) as HTMLElement | null
      expect(popupHost).not.toBeNull()
      expect(popupHost?.hidden).toBe(false)
      expect(popupHost?.querySelector('select')).toBeTruthy()
      expect(formatDemo.textContent).toContain('当前格式 RGB')
    })

    const popupHostId = trigger!.getAttribute('aria-controls') || ''
    const popupHost = document.body.querySelector(`#${popupHostId}`) as HTMLElement
    const select = popupHost.querySelector('select') as HTMLSelectElement
    select.value = 'hsb'
    select.dispatchEvent(new Event('input', { bubbles: true }))
    select.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      expect(formatDemo.textContent).toContain('当前格式 HSB')
    })
  })
})
