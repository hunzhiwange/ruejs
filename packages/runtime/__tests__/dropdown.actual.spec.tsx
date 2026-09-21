import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import DropdownPage from '../../../app/pages/design/Dropdown'
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

describe('Dropdown actual page', () => {
  it('renders dropdown demos, opens the controlled dropdown, and keeps native demos clickable', async () => {
    setEnabledPreviews(
      '受控开关与来源',
      '右键上下文菜单',
      'Dropdown using details and summary',
      'Dropdown menu',
      'Positions',
    )

    const container = mountContainer()
    const detailsDemoTitle = '# Dropdown using details and summary'
    const contextMenuDemoTitle = '# 右键上下文菜单'
    const focusDemoTitle = '# Dropdown menu'
    const positionsDemoTitle = '# Positions'

    resetActiveRuntime()
    render(<DropdownPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Dropdown 下拉菜单')
      expect(container.querySelectorAll('.component-preview').length).toBe(10)
    })

    await waitForContent(() => {
      const currentDetailsDemo = findDemo(container, detailsDemoTitle) as HTMLElement | null
      const currentContextMenuDemo = findDemo(container, contextMenuDemoTitle) as HTMLElement | null
      const currentFocusDemo = findDemo(container, focusDemoTitle) as HTMLElement | null
      const currentPositionsDemo = findDemo(container, positionsDemoTitle) as HTMLElement | null
      expect(currentDetailsDemo).not.toBeNull()
      expect(currentContextMenuDemo).not.toBeNull()
      expect(currentFocusDemo).not.toBeNull()
      expect(currentPositionsDemo).not.toBeNull()
      expect(currentDetailsDemo!.querySelector('details.dropdown')).not.toBeNull()
      expect(currentContextMenuDemo!.querySelector('[aria-haspopup="menu"]')).not.toBeNull()
      expect(currentFocusDemo!.querySelector('.dropdown-content')).not.toBeNull()
      expect(
        currentPositionsDemo!.querySelector('[data-testid="dropdown-position-start"]'),
      ).not.toBeNull()
      expect(
        currentPositionsDemo!.querySelector('[data-testid="dropdown-position-left-end-slot"]'),
      ).not.toBeNull()
    })

    const detailsDemo = findDemo(container, detailsDemoTitle) as HTMLElement | null
    const contextMenuDemo = findDemo(container, contextMenuDemoTitle) as HTMLElement | null
    const focusDemo = findDemo(container, focusDemoTitle) as HTMLElement | null
    const positionsDemo = findDemo(container, positionsDemoTitle) as HTMLElement | null
    expect(detailsDemo).not.toBeNull()
    expect(contextMenuDemo).not.toBeNull()
    expect(focusDemo).not.toBeNull()
    expect(positionsDemo).not.toBeNull()

    const controlledState = container.querySelector(
      '[data-testid="dropdown-controlled-state"]',
    ) as HTMLElement
    const controlledTrigger = container.querySelector(
      '[data-testid="dropdown-controlled-trigger"]',
    ) as HTMLElement
    expect(controlledState.textContent).toContain('closed')
    expect(controlledTrigger.tagName).toBe('BUTTON')
    expect(container.querySelectorAll('[data-testid="dropdown-controlled-trigger"]').length).toBe(1)

    await click(controlledTrigger)
    await waitForContent(() => {
      const nextState = container.querySelector(
        '[data-testid="dropdown-controlled-state"]',
      ) as HTMLElement
      const nextSource = container.querySelector(
        '[data-testid="dropdown-controlled-source"]',
      ) as HTMLElement
      expect(container.querySelectorAll('[data-testid="dropdown-controlled-trigger"]').length).toBe(
        1,
      )
      expect(nextState.textContent).toContain('open')
      expect(nextSource.textContent).toContain('trigger')
    })

    const focusTrigger = focusDemo!.querySelector(
      '[data-testid="dropdown-focus-trigger"]',
    ) as HTMLButtonElement
    expect(focusTrigger.tagName).toBe('BUTTON')
    focusTrigger.focus()
    expect(document.activeElement).toBe(focusTrigger)

    const positionStartTrigger = positionsDemo!.querySelector(
      '[data-testid="dropdown-position-start"]',
    ) as HTMLButtonElement
    const positionTopCenterTrigger = positionsDemo!.querySelector(
      '[data-testid="dropdown-position-top-center"]',
    ) as HTMLButtonElement
    const positionLeftEndTrigger = positionsDemo!.querySelector(
      '[data-testid="dropdown-position-left-end"]',
    ) as HTMLButtonElement
    const positionLeftEndSlot = positionsDemo!.querySelector(
      '[data-testid="dropdown-position-left-end-slot"]',
    ) as HTMLElement
    expect(positionStartTrigger.tagName).toBe('BUTTON')
    expect(positionTopCenterTrigger.tagName).toBe('BUTTON')
    expect(positionLeftEndTrigger.tagName).toBe('BUTTON')
    expect(positionLeftEndSlot.classList.contains('justify-end')).toBe(true)
    expect(positionLeftEndSlot.classList.contains('sm:ps-56')).toBe(true)

    const contextTrigger = contextMenuDemo!.querySelector('[aria-haspopup="menu"]') as HTMLElement
    contextTrigger.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, clientX: 72, clientY: 128 }),
    )

    await waitForContent(() => {
      const contextDropdown = contextMenuDemo!.querySelector('.dropdown') as HTMLElement
      const contextOverlay = contextMenuDemo!.querySelector('.dropdown-content') as HTMLElement
      expect(contextDropdown.classList.contains('dropdown-open')).toBe(true)
      expect(contextOverlay.style.position).toBe('fixed')
      expect(contextOverlay.style.left).toBe('72px')
      expect(contextOverlay.style.top).toBe('128px')
      expect(contextOverlay.style.margin).toBe('0px')
    })

    await click(findTabButton(detailsDemo!, 'JSX代码'))
    const detailsDemoInCode = findDemo(container, detailsDemoTitle) as HTMLElement | null
    expect(detailsDemoInCode!.querySelector('details.dropdown')).toBeNull()

    await click(findTabButton(detailsDemoInCode!, '预览'))

    await waitForContent(() => {
      const restoredDemo = findDemo(container, detailsDemoTitle) as HTMLElement | null
      expect(restoredDemo!.querySelector('details.dropdown')).not.toBeNull()
    })
  })
})
