import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import VOnAndROn from '../../../app/pages/jsx/VOnAndROn'
import { click, flush, mountContainer, render, waitForContent } from './page-test-utils'

vi.mock('../../../app/pages/site/SidebarPlaygroundExample', () => ({
  default: (props: { children?: unknown }) => (
    <div data-testid="mock-sidebar-example">{props.children}</div>
  ),
}))

vi.mock('../../../app/pages/site/components/Code', () => ({
  default: () => <></>,
}))

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

const normalizeText = (value: string | null | undefined) => value?.replace(/\s+/g, ' ').trim() ?? ''

const findTab = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button[role="tab"]')).find(
    button => button.textContent?.trim() === label,
  ) ?? null

const findSection = (root: ParentNode, heading: string) =>
  Array.from(root.querySelectorAll('section.space-y-3')).find(section =>
    section.querySelector('h2')?.textContent?.includes(heading),
  ) ?? null

const badgeTexts = (root: ParentNode) =>
  Array.from(root.querySelectorAll('.badge.badge-lg')).map(node => normalizeText(node.textContent))

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('VOnAndROn actual page', () => {
  it('handles click, input, stop/prevent, enter, self, and meta.exact interactions in preview mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<VOnAndROn />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('v-on / r-on')
      expect(findTab(container, '代码')?.className).toContain('tab-active')
    })

    await click(findTab(container, '效果'))

    const methodSection = findSection(container, 'v-on:click：method path')
    const inputSection = findSection(container, 'r-on:input')
    const stopSection = findSection(container, 'v-on:click-stop-prevent')
    const keySection = findSection(container, 'v-on:keyup-enter / v-on:keyup-13')
    const selfSection = findSection(container, 'v-on:click-self / v-on:click-meta-exact')
    const lastEventSection = findSection(container, '最近一次事件')

    expect(methodSection).not.toBeNull()
    expect(inputSection).not.toBeNull()
    expect(stopSection).not.toBeNull()
    expect(keySection).not.toBeNull()
    expect(selfSection).not.toBeNull()
    expect(lastEventSection).not.toBeNull()

    await click(methodSection!.querySelector('button.btn.btn-primary'))

    const keywordInput = inputSection!.querySelector('input.input') as HTMLInputElement | null
    expect(keywordInput).not.toBeNull()
    keywordInput!.value = 'Rue Vapor'
    keywordInput!.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))
    await flush()

    const stopPreventLink = stopSection!.querySelector('a.link.link-primary')
    await click(stopPreventLink)

    const keyInputs = Array.from(keySection!.querySelectorAll('input.input')) as HTMLInputElement[]
    expect(keyInputs).toHaveLength(2)
    keyInputs[0].dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }))
    const keyCodeEvent = new KeyboardEvent('keyup', { bubbles: true })
    Object.defineProperty(keyCodeEvent, 'keyCode', { value: 13 })
    keyInputs[1].dispatchEvent(keyCodeEvent)
    await flush()

    const selfPanel = selfSection!.querySelector(
      'div.rounded-box.border.border-base-300.bg-base-200.p-4.space-y-3',
    )
    expect(selfPanel).not.toBeNull()
    await click(selfPanel!.querySelector('button'))
    await click(selfPanel)

    const metaButton = selfSection!.querySelector('button.btn.btn-info') as HTMLButtonElement | null
    expect(metaButton).not.toBeNull()
    metaButton!.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true }),
    )
    await flush()

    await waitForContent(() => {
      expect(
        normalizeText(methodSection!.querySelector('.badge.badge-primary.badge-lg')?.textContent),
      ).toBe('1 次')
      expect(normalizeText(inputSection!.textContent)).toContain('当前值Rue Vapor')
      expect(normalizeText(inputSection!.textContent)).toContain('大写预览RUE VAPOR')
      expect(badgeTexts(stopSection!)).toEqual(['bubble 0', 'stop/prevent 1'])
      expect(badgeTexts(keySection!)).toEqual(['enter 1', '13 1'])
      expect(badgeTexts(selfSection!)).toEqual(['self 1', 'meta.exact 1'])
      expect(normalizeText(lastEventSection!.textContent)).toContain(
        'v-on:click-meta-exact -> button 0，第 1 次',
      )
    })

    await click(findTab(container, '代码'))

    expect(container.querySelector('a.link.link-primary')).toBeNull()
  })
})
