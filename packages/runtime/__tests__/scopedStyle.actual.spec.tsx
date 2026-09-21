import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import ScopedStyle from '../../../app/pages/jsx/ScopedStyle'
import { createMountedCompiledTestComponent } from './compiler-capability-test-runtime'
import { click, flush, mountContainer, waitForContent } from './page-test-utils'

vi.mock('../../../app/pages/site/SidebarPlaygroundExample', () => ({
  default: (props: { children?: unknown }) => (
    <div data-testid="mock-sidebar-example">{props.children}</div>
  ),
}))

vi.mock('../../../app/pages/site/components/Code', () => ({
  default: (props: { code?: string }) => <pre data-testid="mock-code">{props.code}</pre>,
}))

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

const scopedStyleVars = (element: HTMLElement) =>
  Array.from(element.style).filter(name => name.startsWith('--rue-v-bind-'))

const firstScopedStyleVarValue = (element: HTMLElement) => {
  const [name] = scopedStyleVars(element)
  return name ? element.style.getPropertyValue(name) : ''
}

const scopedStyleVarValues = (element: HTMLElement) =>
  scopedStyleVars(element).map(name => element.style.getPropertyValue(name))

const findButton = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button')).find(
    button => button.textContent?.trim() === label,
  ) ?? null

const findControlInput = (root: ParentNode, label: string) =>
  (Array.from(root.querySelectorAll('.scoped-style-control'))
    .find(node => node.textContent?.includes(label))
    ?.querySelector('input') ?? null) as HTMLInputElement | null

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('ScopedStyle actual page', () => {
  it('updates scoped v-bind CSS variables from preview controls', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const mounted = createMountedCompiledTestComponent(ScopedStyle as any, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Scoped Style 组件作用域样式')
      expect(container.textContent).toContain('当前组件内生效')
      expect(container.textContent).toContain('live v-bind color')
      expect(container.textContent).toContain('颜色变化怎么看')
      expect(container.textContent).toContain('先看上面的大色块')
      expect(container.textContent).toContain('当前 v-bind radius')
      expect(container.textContent).toContain('拖 radius 看圆角')
      expect(container.textContent).toContain('Deep child widget')
      expect(container.textContent).toContain('当前组件 DOM')
      expect(container.textContent).toContain('普通 <style>')
    })

    const currentPanel = container.querySelector(
      'section[aria-label="当前组件样式卡片"]',
    ) as HTMLElement | null
    expect(currentPanel).not.toBeNull()
    expect(scopedStyleVarValues(currentPanel!)).toContain('#2563eb')
    expect(scopedStyleVarValues(currentPanel!)).toContain('0.75rem')
    expect(currentPanel!.className).toContain('is-raised')

    await click(findButton(container, '切换当前卡片'))
    expect(currentPanel!.className).not.toContain('is-raised')

    await click(findButton(container, '换颜色'))
    await waitForContent(() => {
      expect(firstScopedStyleVarValue(currentPanel!)).toBe('#16a34a')
      expect(container.textContent).toContain('当前 v-bind color：#16a34a')
    })

    const gapInput = findControlInput(container, 'v-bind gap')
    expect(gapInput).not.toBeNull()
    gapInput!.value = '1.2'
    gapInput!.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))
    await flush()

    await waitForContent(() => {
      expect(scopedStyleVarValues(currentPanel!)).toContain('1.2rem')
    })

    const colorInput = findControlInput(container, 'v-bind color')
    expect(colorInput).not.toBeNull()
    colorInput!.value = '#dc2626'
    colorInput!.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))
    await flush()

    await waitForContent(() => {
      expect(scopedStyleVarValues(currentPanel!)).toContain('#dc2626')
    })

    await click(findButton(container, '代码'))
    expect(container.querySelector('[data-testid="mock-code"]')?.textContent).toContain(
      'ChildWidget',
    )
    mounted.dispose()
  })
})
