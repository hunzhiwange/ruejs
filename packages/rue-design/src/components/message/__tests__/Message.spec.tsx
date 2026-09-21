import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { type FC, render, setReactiveScheduling } from '@rue-js/rue'
import Message from '..'
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
  document.body.innerHTML = ''
})

describe('Message', () => {
  it('renders declarative message items with toast-backed styling', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Message data-testid="message-root">
          <Message.Item type="success" content="发布成功" data-testid="message-item" />
        </Message>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="message-root"]') as HTMLElement
      const item = container.querySelector('[data-testid="message-item"]') as HTMLElement
      expect(root.classList.contains('toast')).toBe(true)
      expect(root.classList.contains('message')).toBe(true)
      expect(item.textContent).toContain('发布成功')
    })
  })

  it('supports useMessage open, keyed update and destroy', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    const Demo = () => {
      const [messageApi, contextHolder] = Message.useMessage({ duration: 0 })

      return (
        <div>
          {contextHolder}
          <button
            type="button"
            data-testid="open"
            onClick={() => {
              messageApi.open({ key: 'job', type: 'loading', content: '处理中', duration: 0 })
            }}
          >
            open
          </button>
          <button
            type="button"
            data-testid="update"
            onClick={() => {
              messageApi.open({ key: 'job', type: 'success', content: '处理完成', duration: 0 })
            }}
          >
            update
          </button>
          <button
            type="button"
            data-testid="destroy"
            onClick={() => {
              messageApi.destroy('job')
            }}
          >
            destroy
          </button>
        </div>
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await click(container.querySelector('[data-testid="open"]'))

    await waitForContent(() => {
      expect(document.body.textContent).toContain('处理中')
    })

    await click(container.querySelector('[data-testid="update"]'))

    await waitForContent(() => {
      expect(document.body.textContent).toContain('处理完成')
      expect(document.body.textContent).not.toContain('处理中')
    })

    await click(container.querySelector('[data-testid="destroy"]'))

    await waitForContent(() => {
      expect(document.body.textContent).not.toContain('处理完成')
    })
  })

  it('supports local holder mounting with getContainer=false', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    const Surface: FC<{ content: any }> = ({ content }) => (
      <div data-testid="scope-box">{content}</div>
    )

    const Demo = () => {
      const [messageApi, contextHolder] = Message.useMessage({
        duration: 0,
        getContainer: false,
      })

      return (
        <Surface
          content={
            <>
              {contextHolder}
              <button
                type="button"
                data-testid="open-local"
                onClick={() => {
                  messageApi.info('局部提示', 0)
                }}
              >
                open local
              </button>
            </>
          }
        />
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await click(container.querySelector('[data-testid="open-local"]'))
    await flush(5)

    await waitForContent(() => {
      const box = container.querySelector('[data-testid="scope-box"]') as HTMLElement
      expect(box.querySelector('.toast')).toBeTruthy()
      expect(box.textContent).toContain('局部提示')
    })
  })

  it('exposes a global static API', async () => {
    resetActiveRuntime()

    Message.info('全局提示', 0)
    await flush(5)

    await waitForContent(() => {
      expect(document.body.textContent).toContain('全局提示')
    })

    Message.destroy()

    await waitForContent(() => {
      expect(document.body.textContent).not.toContain('全局提示')
    })
  })

  it('keeps static success bound to success styling', async () => {
    resetActiveRuntime()

    Message.success('发布成功', 0)
    await flush(5)

    await waitForContent(() => {
      const item = document.body.querySelector('[data-rue-toast-item="true"]') as HTMLElement
      expect(item).toBeTruthy()
      expect(item.className).toContain('border-success/25')
      expect(item.querySelector('svg')).toBeTruthy()
    })

    Message.destroy()
  })

  it('returns a thenable close handle', async () => {
    resetActiveRuntime()

    const handle = Message.loading('处理中', 0)
    let resolved = false

    handle.then(() => {
      resolved = true
    })

    await waitForContent(() => {
      expect(document.body.textContent).toContain('处理中')
    })

    handle()
    await Promise.resolve()

    expect(resolved).toBe(true)

    await waitForContent(() => {
      expect(document.body.textContent).not.toContain('处理中')
    })
  })
})
