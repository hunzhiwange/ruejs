import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import PopconfirmPage from '../../../app/pages/design/Popconfirm'
import { render, click, mountContainer, waitForContent } from './page-test-utils'
import { findDemo, resetActiveRuntime } from './design-page-test-utils'

vi.mock('@rue-js/design', async () => {
  const popconfirmModule = await import('../../../packages/rue-design/src/components/popconfirm')

  return {
    Popconfirm: popconfirmModule.default,
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

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('Popconfirm design actual page', () => {
  it('creates host element JSX as a tagged mount handle in the actual runtime path', () => {
    resetActiveRuntime()
    const spinner = (
      <span className="loading loading-spinner loading-xs" aria-hidden="true" />
    ) as Record<string, unknown>

    expect(spinner).toBeTruthy()
    expect(typeof spinner).toBe('object')
    expect(
      '__rue_mount_id' in spinner ||
        '__rue_component_type' in spinner ||
        '__rue_compiled_mount' in spinner,
    ).toBe(true)
  })

  it('keeps async confirm button content renderable without object-object text', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<PopconfirmPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Popconfirm 气泡确认框')
      expect(container.querySelectorAll('.component-preview').length).toBeGreaterThan(0)
    })

    const asyncDemo = findDemo(container, '# 异步确认与自动 loading') as HTMLElement | null
    expect(asyncDemo).not.toBeNull()

    await click(asyncDemo!.querySelector('button.btn.btn-primary'))

    await waitForContent(() => {
      expect(asyncDemo!.textContent).toContain('发布到生产环境？')
      expect(asyncDemo!.textContent).toContain('开始发布')
    })

    const okButton = asyncDemo!.querySelector(
      '[data-rue-popconfirm-action="ok"]',
    ) as HTMLButtonElement | null
    expect(okButton).not.toBeNull()

    await click(okButton)

    await waitForContent(() => {
      const currentOkButton = asyncDemo!.querySelector(
        '[data-rue-popconfirm-action="ok"]',
      ) as HTMLButtonElement | null
      expect(asyncDemo!.textContent).toContain('当前状态：发布中...')
      expect(currentOkButton).not.toBeNull()
      expect(currentOkButton?.getAttribute('aria-busy')).toBe('true')
      expect(currentOkButton?.innerHTML).not.toContain('[object Object]')
      expect(currentOkButton?.textContent).not.toContain('[object Object]')
      expect(asyncDemo!.textContent).not.toContain('[object Object]')
    })
  })
})
