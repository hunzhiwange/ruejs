import { afterEach, describe, expect, it } from 'vitest'

import { setReactiveScheduling, type FC } from '../src'
import Mentions from '../../../packages/rue-design/src/components/mentions/index'
import { render, mountContainer, waitForContent } from './page-test-utils'

let activeContainer: HTMLElement | null = null

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

afterEach(() => {
  if (activeContainer) {
    render(null, activeContainer)
    activeContainer = null
  }

  setReactiveScheduling('sync')
  document.body.innerHTML = ''
})

describe('Mentions basic preview actual', () => {
  it('mounts under microtask scheduling without the page shell', async () => {
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
