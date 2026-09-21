import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import FilterPage from '../../../app/pages/design/Filter'
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

describe('Filter actual page', () => {
  it('renders filter demos, checks a grouped radio, and restores the grouped preview after toggling code', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<FilterPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Filter 筛选器')
      expect(container.querySelectorAll('.component-preview').length).toBe(6)
    })

    const groupedDemo = findDemo(container, '# Filter with grouped options') as HTMLElement | null
    const formDemo = findDemo(container, '# Filter using form') as HTMLElement | null
    expect(groupedDemo).not.toBeNull()
    expect(formDemo).not.toBeNull()

    const rueOption = groupedDemo!.querySelector('[aria-label="Rue"]') as HTMLInputElement
    rueOption.click()
    expect(rueOption.checked).toBe(true)

    await waitForContent(() => {
      expect(formDemo!.querySelector('form.filter')).not.toBeNull()
      expect(groupedDemo!.querySelectorAll('input.btn').length).toBe(5)
    })

    await click(findTabButton(groupedDemo!, 'JSX代码'))
    const groupedDemoInCode = findDemo(
      container,
      '# Filter with grouped options',
    ) as HTMLElement | null
    expect(groupedDemoInCode!.querySelectorAll('input.btn').length).toBe(0)

    await click(findTabButton(groupedDemoInCode!, '预览'))

    await waitForContent(() => {
      const restoredDemo = findDemo(
        container,
        '# Filter with grouped options',
      ) as HTMLElement | null
      expect(restoredDemo!.querySelectorAll('input.btn').length).toBe(5)
    })
  })

  it('keeps items-driven radio and multiple demos interactive', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<FilterPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Filter 筛选器')
    })

    const controlledDemo = findDemo(container, '# 数据驱动与受控状态') as HTMLElement | null
    const multipleDemo = findDemo(container, '# 多选筛选') as HTMLElement | null
    expect(controlledDemo).not.toBeNull()
    expect(multipleDemo).not.toBeNull()

    const planning = controlledDemo!.querySelector('[aria-label="规划中"]') as HTMLInputElement
    const building = controlledDemo!.querySelector('[aria-label="开发中"]') as HTMLInputElement
    expect(planning.type).toBe('radio')
    expect(planning.className.includes('undefined')).toBe(false)

    building.checked = true
    building.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      expect(building.checked).toBe(true)
      expect(planning.checked).toBe(false)
      expect(building.classList.contains('btn-active')).toBe(true)
      expect(controlledDemo!.textContent).toContain('building')
    })

    const search = multipleDemo!.querySelector('[aria-label="搜索"]') as HTMLInputElement
    const favorite = multipleDemo!.querySelector('[aria-label="收藏"]') as HTMLInputElement
    const alerts = multipleDemo!.querySelector('[aria-label="提醒"]') as HTMLInputElement

    expect(search.type).toBe('checkbox')
    expect(
      (multipleDemo!.querySelector('form') as HTMLFormElement).classList.contains('filter'),
    ).toBe(false)
    expect(
      (multipleDemo!.querySelector('form') as HTMLFormElement).classList.contains('flex'),
    ).toBe(true)

    favorite.checked = true
    favorite.dispatchEvent(new Event('change', { bubbles: true }))

    await waitForContent(() => {
      expect(search.checked).toBe(true)
      expect(alerts.checked).toBe(true)
      expect(favorite.checked).toBe(true)
      expect(favorite.classList.contains('btn-active')).toBe(true)
    })
  })
})
