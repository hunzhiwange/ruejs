import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling, type FC } from '../src'

vi.mock('../../../app/pages/site/SidebarPlaygroundDesign', () => ({
  default: (props: { children?: unknown }) => (
    <div data-testid="mock-sidebar-design">{props.children}</div>
  ),
}))

vi.mock('../../../app/pages/site/components/Code', () => ({
  default: () => null,
}))

import { AutoSizeMentionsPreview } from '../../../app/pages/design/Mentions'
import Mentions from '../../../packages/rue-design/src/components/mentions/index'
import { render, mountContainer, waitForContent } from './page-test-utils'

setReactiveScheduling('sync')

let activeContainer: HTMLElement | null = null

const originalResizeObserver = globalThis.ResizeObserver

class ImmediateResizeObserver {
  static observeCount = 0

  private readonly callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe(target: Element) {
    ImmediateResizeObserver.observeCount += 1

    if (ImmediateResizeObserver.observeCount > 4) {
      throw new Error('Mentions design page triggered a resize feedback loop')
    }

    queueMicrotask(() => {
      this.callback(
        [
          {
            target,
            contentRect: {
              width: 320,
              height: 144,
            } as DOMRectReadOnly,
          } as ResizeObserverEntry,
        ],
        this as unknown as ResizeObserver,
      )
    })
  }

  unobserve() {}

  disconnect() {}
}

afterEach(() => {
  setReactiveScheduling('sync')

  if (activeContainer) {
    render(null, activeContainer)
    activeContainer = null
  }

  document.body.innerHTML = ''
  ImmediateResizeObserver.observeCount = 0

  if (originalResizeObserver) {
    globalThis.ResizeObserver = originalResizeObserver
  } else {
    delete (globalThis as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver
  }

  vi.restoreAllMocks()
})

const MinimalMentionsFixture: FC = () => (
  <div className="card border border-base-200/80 bg-base-100 shadow-sm">
    <div className="card-body grid gap-4 lg:grid-cols-[minmax(0,24rem),1fr] lg:items-start">
      <div className="grid gap-3">
        <Mentions
          defaultValue="@sakura 请帮我同步 Mentions 设计稿"
          allowClear
          rows={4}
          options={[
            { value: 'sakura', label: 'Sakura' },
            { value: 'lin', label: 'Lin' },
            { value: 'nano', label: 'Nano' },
          ]}
          placeholder="输入 @ 选择协作者"
        />
        <p className="m-0 text-sm text-base-content/70">最近动作：等待输入 @ 或 #</p>
      </div>
      <div className="rounded-box border border-dashed border-base-300 bg-base-100/80 p-4 text-sm text-base-content/70">
        <div className="mb-3 font-medium text-base-content">候选项设计</div>
        <p className="m-0">
          这里没有照搬特定组件库的面板视觉，而是保留 Rue 更轻、更卡片化的输入体验。
        </p>
      </div>
    </div>
  </div>
)

const _findPreviewBlock = (root: ParentNode, title: string) =>
  Array.from(root.querySelectorAll('.component-preview')).find(block =>
    block.querySelector('.component-preview-title')?.textContent?.includes(title),
  ) ?? null

describe('Mentions actual page', () => {
  it('does not enter a resize feedback loop on initial render', async () => {
    globalThis.ResizeObserver = ImmediateResizeObserver as unknown as typeof ResizeObserver

    const container = mountContainer()
    activeContainer = container

    expect(() => render(<AutoSizeMentionsPreview />, container)).not.toThrow()

    await waitForContent(() => {
      expect(container.textContent).toContain('最新尺寸：宽 320 / 高 144')
      expect(ImmediateResizeObserver.observeCount).toBeLessThanOrEqual(2)
    })
  })

  it('mounts a minimal Mentions fixture under microtask scheduling', async () => {
    const container = mountContainer()
    activeContainer = container

    setReactiveScheduling('microtask')

    expect(() => render(<MinimalMentionsFixture />, container)).not.toThrow()

    await waitForContent(() => {
      const textarea = container.querySelector(
        'textarea[data-rue-mentions-input="true"]',
      ) as HTMLTextAreaElement | null
      const clearButton = container.querySelector('button[aria-label="Clear mentions"]')

      expect(textarea).toBeTruthy()
      expect(textarea?.readOnly).toBe(false)
      expect(textarea?.getAttribute('readonly')).toBeNull()
      expect(clearButton?.querySelector('svg')).toBeTruthy()
      expect(container.textContent).not.toContain('[object Object]')
      expect(container.textContent).toContain('候选项设计')
      expect(container.textContent).toContain('最近动作：等待输入 @ 或 #')
    })
  })
})
