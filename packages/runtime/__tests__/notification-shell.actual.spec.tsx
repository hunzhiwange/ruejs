import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import NotificationPage from '../../../app/pages/design/Notification'
import { render, mountContainer, waitForContent } from './page-test-utils'
import { resetActiveRuntime } from './design-page-test-utils'

const previewState = vi.hoisted(() => ({
  enabledTitles: new Set<string>(),
}))

vi.mock('../../../app/pages/site/SidebarPlaygroundDesign', () => ({
  default: (props: { children?: unknown }) => (
    <div data-testid="mock-sidebar-design">{props.children}</div>
  ),
}))

vi.mock('../../../app/pages/site/components/Code', () => ({
  default: () => null,
}))

vi.mock('../../../app/pages/design/PreviewBlock', () => ({
  __esModule: true,
  default: (props: { title: string; summary?: string; preview?: (() => any) | any }) => {
    let previewContent: any = null

    if (previewState.enabledTitles.has(props.title)) {
      if (typeof props.preview === 'function') {
        const PreviewComponent = props.preview as any
        previewContent = PreviewComponent({})
      } else {
        previewContent = props.preview ?? null
      }
    }

    return (
      <div className="component-preview not-prose text-base-content my-6 lg:my-12">
        <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># {props.title}</h2>
        {props.summary ? <p className="m-0 text-sm opacity-70">{props.summary}</p> : null}
        {previewContent}
      </div>
    )
  },
}))

setReactiveScheduling('sync')

let activeContainer: HTMLElement | null = null

afterEach(() => {
  previewState.enabledTitles.clear()

  if (activeContainer) {
    render(null, activeContainer)
    activeContainer = null
  }

  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

const renderPage = () => {
  const container = mountContainer()
  activeContainer = container
  resetActiveRuntime()

  render(<NotificationPage />, container)
  return container
}

describe('Notification shell actual page', () => {
  it('renders the page shell when preview content is stubbed out', async () => {
    const container = renderPage()

    await waitForContent(() => {
      expect(container.textContent).toContain('Notification 通知提醒框')
      expect(container.querySelectorAll('.component-preview').length).toBe(5)
      expect(container.textContent).toContain('通知堆叠')
      expect(container.textContent).toContain('语义类型、操作区与进度条')
      expect(container.textContent).toContain('六向定位')
      expect(container.textContent).toContain('useNotification 局部容器与按 key 更新')
      expect(container.textContent).toContain('静态 API')
    })
  })

  it('renders the hook preview in isolation', async () => {
    previewState.enabledTitles.add('useNotification 局部容器与按 key 更新')
    const container = renderPage()

    await waitForContent(() => {
      expect(container.textContent).toContain('open')
      expect(container.textContent).toContain('update by key')
      expect(container.textContent).toContain('destroy key')
    })
  })

  it('renders the stacked preview in isolation', async () => {
    previewState.enabledTitles.add('通知堆叠')
    const container = renderPage()

    await waitForContent(() => {
      expect(container.querySelectorAll('[data-rue-notification-item="true"]').length).toBe(3)
      expect(container.textContent).toContain('Notification 1')
      expect(container.textContent).toContain('Notification 3')
    })
  })

  it('renders the rich preview in isolation', async () => {
    previewState.enabledTitles.add('语义类型、操作区与进度条')
    const container = renderPage()

    await waitForContent(() => {
      expect(container.querySelectorAll('[data-rue-notification-item="true"]').length).toBe(3)
      expect(container.textContent).toContain('Workspace synced')
      expect(container.textContent).toContain('Release is live')
    })
  })

  it('renders the placement preview in isolation', async () => {
    previewState.enabledTitles.add('六向定位')
    const container = renderPage()

    await waitForContent(() => {
      expect(container.querySelectorAll('[data-rue-notification-item="true"]').length).toBe(6)
      expect(container.textContent).toContain('topLeft')
      expect(container.textContent).toContain('bottomRight')
    })
  })

  it('renders the static api preview in isolation', async () => {
    previewState.enabledTitles.add('静态 API')
    const container = renderPage()

    await waitForContent(() => {
      expect(container.textContent).toContain('open global')
      expect(container.textContent).toContain('update global')
      expect(container.textContent).toContain('destroy all')
    })
  })
})
