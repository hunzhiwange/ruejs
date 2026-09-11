import { Template } from '@rue-js/rue'
import { NotificationHolder } from '../index'
import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import Notification from '..'
import {
  click,
  flush,
  mountContainer,
  waitForContent,
} from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  Notification.destroy()
  vi.clearAllTimers()
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('Notification', () => {
  it('renders root placement and semantic notification content', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Notification placement="topLeft" data-testid="notification-root">
          <Notification.Item
            message="Workspace synced"
            description="最新变更已经推送到共享工作区。"
            closable
            showProgress
            duration={3}
            classNames={{ progress: 'progress-slot' }}
            data-testid="notification-item"
          >
            <Template slot="actions">
              <button type="button">查看详情</button>
            </Template>
          </Notification.Item>
        </Notification>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="notification-root"]') as HTMLElement
      const item = container.querySelector('[data-testid="notification-item"]') as HTMLElement
      expect(root).toBeTruthy()
      expect(root.className).toContain('items-start')
      expect(root.className).toContain('justify-start')
      expect(item).toBeTruthy()
      expect(item.getAttribute('role')).toBe('status')
      expect(item.textContent).toContain('Workspace synced')
      expect(item.textContent).toContain('最新变更已经推送到共享工作区。')
      expect(item.textContent).toContain('查看详情')
      expect(item.querySelector('button[aria-label="关闭通知"]')).toBeTruthy()
      expect(item.querySelector('.progress-slot')).toBeTruthy()
    })
  })

  it('supports auto close on notification items', async () => {
    vi.useFakeTimers()
    const container = mountContainer()
    resetActiveRuntime()
    const onClose = vi.fn()

    mountTestApp(container, () =>
      render(
        <Notification.Item
          duration={1}
          title="保存完成"
          data-testid="notification-item"
          onClose={onClose}
        />,
        container,
      ),
    )

    await flush(5)
    expect(container.querySelector('[data-testid="notification-item"]')).toBeTruthy()

    vi.advanceTimersByTime(1000)
    await flush(5)

    expect(container.querySelector('[data-testid="notification-item"]')).toBeNull()
    expect(onClose).toHaveBeenCalledWith(expect.objectContaining({ source: 'timeout' }))
  })

  it('supports static open, keyed updates and destroy', async () => {
    resetActiveRuntime()

    Notification.success({
      key: 'release',
      message: 'Deploy queued',
      description: '正在准备生产环境发布。',
      duration: 0,
      props: { 'data-testid': 'notification-item' },
    })

    await waitForContent(() => {
      expect(document.body.querySelector('[data-rue-notification-item="true"]')).toBeTruthy()
      expect(document.body.textContent).toContain('Deploy queued')
    })

    Notification.open({
      key: 'release',
      title: 'Deploy complete',
      description: '所有校验已通过，流量已经切换完成。',
      duration: 0,
      props: { 'data-testid': 'notification-item' },
    })

    await waitForContent(() => {
      expect(document.body.querySelectorAll('[data-rue-notification-item="true"]')).toHaveLength(1)
      expect(document.body.textContent).not.toContain('Deploy queued')
      expect(document.body.textContent).toContain('Deploy complete')
      expect(document.body.textContent).toContain('所有校验已通过，流量已经切换完成。')
    })

    Notification.destroy('release')

    await waitForContent(() => {
      expect(document.body.querySelector('[data-rue-notification-item="true"]')).toBeNull()
    })
  })

  it('supports local holder rendering through useNotification', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    const Harness = () => {
      const [api, holder] = Notification.useNotification({
        getContainer: false,
        placement: 'bottomRight',
        maxWidth: '20rem',
      })

      return (
        <div
          data-testid="box"
          className="relative min-h-64 overflow-hidden rounded-2xl border border-base-300"
        >
          <NotificationHolder state={holder} />
          <button
            type="button"
            data-testid="open-local"
            onClick={() => {
              api.info({
                message: 'Local notice',
                description: '当前通知被约束在局部容器中。',
                duration: 0,
              })
            }}
          >
            open local
          </button>
        </div>
      )
    }

    mountTestApp(container, () => render(<Harness />, container))

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="open-local"]')).toBeTruthy()
    })

    await click(container.querySelector('[data-testid="open-local"]'))

    await waitForContent(() => {
      const box = container.querySelector('[data-testid="box"]') as HTMLElement
      expect(box.querySelector('[data-rue-notification-item="true"]')).toBeTruthy()
      expect(box.textContent).toContain('Local notice')
      expect(box.textContent).toContain('当前通知被约束在局部容器中。')
    })
  })
})
