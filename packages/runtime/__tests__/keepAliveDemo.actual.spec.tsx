import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import KeepAliveDemo from '../../../app/pages/jsx/KeepAliveDemo'
import { createMountedCompiledTestComponent } from './compiler-capability-test-runtime'
import { click, mountContainer, waitForContent } from './page-test-utils'

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

const _findTab = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button[role="tab"]')).find(
    button => button.textContent?.trim() === label,
  ) ?? null

const findButton = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button')).find(
    button => button.textContent?.trim() === label,
  ) ?? null

const normalizedText = (root: ParentNode) => root.textContent?.replace(/\s+/g, ' ').trim() ?? ''

const waitForButton = async (root: ParentNode, label: string) => {
  let button: Element | null = null
  await waitForContent(() => {
    button = findButton(root, label)
    expect(button).not.toBeNull()
  })
  return button
}

const waitForDraftInput = async (root: ParentNode): Promise<HTMLInputElement> => {
  let input: HTMLInputElement | null = null
  await waitForContent(() => {
    input = root.querySelector('input.input') as HTMLInputElement | null
    expect(input).not.toBeNull()
  })
  if (!input) {
    throw new Error('Expected draft input to exist')
  }
  return input
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('KeepAliveDemo actual page', () => {
  it('keeps the counter panel cached when switching views in the default cache mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const mounted = createMountedCompiledTestComponent(KeepAliveDemo as any, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('KeepAlive 缓存组件')
      expect(container.textContent).toContain('CounterPanel')
      expect(container.textContent).toContain('当前视图：CounterPanel')
    })

    await click(findButton(container, '增加'))
    await click(findButton(container, '增加'))

    await waitForContent(() => {
      expect(container.textContent).toContain('CounterPanel')
      expect(container.textContent).toContain('2')
    })
    await click(findButton(container, '草稿'))
    await click(findButton(container, '计数器'))

    await waitForContent(() => {
      expect(container.textContent).toContain('当前视图：CounterPanel')
      expect(container.textContent).toContain('2')
    })
    mounted.dispose()
  })

  it('does not cache the draft panel when excludeDraft mode is selected', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const mounted = createMountedCompiledTestComponent(KeepAliveDemo as any, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('KeepAlive 缓存组件')
      expect(findButton(container, '排除草稿')).not.toBeNull()
    })

    await click(await waitForButton(container, '排除草稿'))
    await click(await waitForButton(container, '草稿'))

    const input = await waitForDraftInput(container)
    input!.value = '缓存不会保留'
    input!.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))

    await waitForContent(() => {
      expect(container.textContent).toContain('当前草稿：缓存不会保留')
      expect(normalizedText(container)).toContain('缓存模式： DraftPanel 不缓存')
    })

    await click(await waitForButton(container, '动态'))
    await click(await waitForButton(container, '草稿'))

    await waitForContent(() => {
      const draftInput = container.querySelector('input.input') as HTMLInputElement | null
      expect(draftInput?.value).toBe('未提交草稿')
      expect(container.textContent).toContain('当前草稿：未提交草稿')
    })
    mounted.dispose()
  })

  it('prunes the least recently used cached view when max=2 is selected', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const mounted = createMountedCompiledTestComponent(KeepAliveDemo as any, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('KeepAlive 缓存组件')
      expect(findButton(container, 'max=2')).not.toBeNull()
    })

    await click(await waitForButton(container, 'max=2'))
    await click(await waitForButton(container, '增加'))
    await waitForContent(() => {
      expect(container.textContent).toContain('1')
    })

    await click(await waitForButton(container, '草稿'))
    const draftInput = await waitForDraftInput(container)
    draftInput!.value = '保留到上限'
    draftInput!.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))

    await click(await waitForButton(container, '动态'))
    await click(await waitForButton(container, '添加记录'))
    await waitForContent(() => {
      expect(container.textContent).toContain('记录 2')
    })

    await click(findButton(container, '计数器'))

    await waitForContent(() => {
      expect(container.textContent).toContain('当前视图：CounterPanel')
      expect(container.textContent).toContain('0')
      expect(normalizedText(container)).toContain('缓存模式： 最多缓存 2 个')
    })
    mounted.dispose()
  })
})
