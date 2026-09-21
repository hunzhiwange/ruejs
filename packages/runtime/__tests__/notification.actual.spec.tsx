import { type FC, ref } from '@rue-js/rue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import Notification from '../../../packages/rue-design/src/components/notification'
import { render, click, mountContainer, waitForContent } from './page-test-utils'
import { resetActiveRuntime } from './design-page-test-utils'

type PlacementExample = {
  placement: 'top' | 'topLeft' | 'topRight' | 'bottom' | 'bottomLeft' | 'bottomRight'
  title: string
  description: string
  type: 'info' | 'success' | 'warning' | 'error'
}

const placementExamples: PlacementExample[] = [
  {
    placement: 'topLeft',
    title: 'topLeft',
    description: '左上角适合流程启动和任务创建类通知。',
    type: 'info',
  },
  {
    placement: 'top',
    title: 'top',
    description: '居中顶部适合广播类提醒。',
    type: 'success',
  },
  {
    placement: 'topRight',
    title: 'topRight',
    description: '右上角最接近常见通知中心默认位。',
    type: 'warning',
  },
  {
    placement: 'bottomLeft',
    title: 'bottomLeft',
    description: '左下角适合局部工作台里的长任务反馈。',
    type: 'error',
  },
  {
    placement: 'bottom',
    title: 'bottom',
    description: '底部居中适合跨栏提示或多列页面。',
    type: 'info',
  },
  {
    placement: 'bottomRight',
    title: 'bottomRight',
    description: '底部右侧适合和抽屉、检视面板搭配。',
    type: 'success',
  },
]

const DemoSurface: FC<{ minHeight?: string; children?: any }> = ({
  minHeight = '15rem',
  children,
}) => {
  return (
    <div
      className="relative overflow-hidden rounded-[1.25rem] border border-base-300 bg-base-100/90"
      style={{ minHeight }}
    >
      {children}
    </div>
  )
}

const findTabButton = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button[role="tab"]')).find(
    button => button.textContent?.trim() === label,
  ) ?? null

const NotificationHookPreview: FC = () => {
  const [localApi, localHolder] = Notification.useNotification({
    getContainer: false,
    placement: 'topRight',
    maxCount: 3,
    showProgress: true,
    closable: true,
    maxWidth: '21rem',
    top: 12,
    gap: 12,
  })

  return (
    <DemoSurface minHeight="20rem">
      <>{localHolder}</>
      <div className="absolute inset-x-4 bottom-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-sm rounded-full"
          onClick={() => {
            localApi.info({
              key: 'publish-flow',
              message: 'Draft synced',
              description: 'The latest content has been saved to the release branch.',
              duration: 4,
            })
          }}
        >
          open
        </button>
        <button
          type="button"
          className="btn btn-sm rounded-full"
          onClick={() => {
            localApi.success({
              key: 'publish-flow',
              title: 'Publish complete',
              description: 'All checks passed and traffic has been switched.',
              duration: 3,
            })
          }}
        >
          update by key
        </button>
      </div>
    </DemoSurface>
  )
}

const NotificationStaticApiPreview: FC = () => {
  const globalSeed = ref(0)

  return (
    <div className="not-prose rounded-[1.5rem] border border-base-300 bg-base-100 p-5 shadow-sm">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-sm rounded-full"
          onClick={() => {
            globalSeed.value += 1
            Notification.config({
              placement: 'topRight',
              top: 88,
              maxCount: 3,
              showProgress: true,
            })
            Notification.info({
              key: 'release-board',
              message: `Build queued #${globalSeed.value}`,
              description: 'Static methods mount to document.body by default.',
              duration: 4,
            })
          }}
        >
          open global
        </button>
        <button
          type="button"
          className="btn btn-sm rounded-full"
          onClick={() => {
            Notification.open({
              key: 'release-board',
              type: 'success',
              title: 'Release is live',
              description: 'Reuse the same key to update the current notice in place.',
              duration: 3,
            })
          }}
        >
          update global
        </button>
      </div>
    </div>
  )
}

const NotificationPlacementPreview: FC = () => {
  const displayMode = ref<'preview' | 'code'>('preview')

  return (
    <div className="component-preview not-prose text-base-content my-6 lg:my-12">
      <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># 六向定位</h2>
      <div role="tablist" className="tabs tabs-box mb-3">
        <button
          role="tab"
          className={`tab ${displayMode.value === 'preview' ? 'tab-active' : ''}`}
          onClick={() => {
            displayMode.value = 'preview'
          }}
        >
          预览
        </button>
        <button
          role="tab"
          className={`tab ${displayMode.value === 'code' ? 'tab-active' : ''}`}
          onClick={() => {
            displayMode.value = 'code'
          }}
        >
          JSX代码
        </button>
      </div>
      {displayMode.value === 'preview' ? (
        <div className="grid gap-5 not-prose">
          {placementExamples.map(example => (
            <DemoSurface key={example.placement} minHeight="14rem">
              <>
                <div className="absolute left-3 top-3 badge badge-ghost badge-sm">
                  {example.placement}
                </div>
                <Notification inline placement={example.placement} top={12} bottom={12}>
                  <Notification.Item
                    type={example.type}
                    title={example.title}
                    description={example.description}
                    closable
                  />
                </Notification>
              </>
            </DemoSurface>
          ))}
        </div>
      ) : (
        <pre data-testid="mock-code">notification placement code</pre>
      )}
    </div>
  )
}

setReactiveScheduling('sync')

afterEach(() => {
  Notification.destroy()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('Notification actual page', () => {
  it('keeps the hook preview interactive', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<NotificationHookPreview />, container)

    await click(
      Array.from(container.querySelectorAll('button')).find(
        button => button.textContent?.trim() === 'open',
      ) ?? null,
    )

    await waitForContent(() => {
      expect(container.textContent).toContain('Draft synced')
      expect(container.textContent).toContain(
        'The latest content has been saved to the release branch.',
      )
    })

    await click(
      Array.from(container.querySelectorAll('button')).find(
        button => button.textContent?.trim() === 'update by key',
      ) ?? null,
    )

    await waitForContent(() => {
      expect(container.textContent).toContain('Publish complete')
      expect(container.textContent).toContain('All checks passed and traffic has been switched.')
    })
  })

  it('keeps the static api preview interactive', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<NotificationStaticApiPreview />, container)

    await click(
      Array.from(container.querySelectorAll('button')).find(
        button => button.textContent?.trim() === 'open global',
      ) ?? null,
    )

    await waitForContent(() => {
      expect(document.body.textContent).toContain('Build queued #1')
      expect(document.body.textContent).toContain(
        'Static methods mount to document.body by default.',
      )
    })

    await click(
      Array.from(container.querySelectorAll('button')).find(
        button => button.textContent?.trim() === 'update global',
      ) ?? null,
    )

    await waitForContent(() => {
      expect(document.body.textContent).toContain('Release is live')
      expect(document.body.textContent).toContain(
        'Reuse the same key to update the current notice in place.',
      )
    })
  })

  it('renders the placement preview items', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<NotificationPlacementPreview />, container)

    await waitForContent(() => {
      expect(container.querySelectorAll('[data-rue-notification-item="true"]').length).toBe(6)
    })
  })

  it('restores the placement preview after toggling code', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<NotificationPlacementPreview />, container)

    await waitForContent(() => {
      expect(
        container.querySelectorAll('[data-rue-notification-item="true"]').length,
      ).toBeGreaterThan(0)
    })

    await click(findTabButton(container, 'JSX代码'))

    await waitForContent(() => {
      expect(container.querySelectorAll('[data-rue-notification-item="true"]').length).toBe(0)
    })

    await click(findTabButton(container, '预览'))

    await waitForContent(() => {
      expect(
        container.querySelectorAll('[data-rue-notification-item="true"]').length,
      ).toBeGreaterThan(0)
    })
  })
})
