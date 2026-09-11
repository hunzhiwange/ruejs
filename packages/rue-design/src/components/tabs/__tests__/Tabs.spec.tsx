import { Template } from '@rue-js/rue'
import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { render, setReactiveScheduling } from '@rue-js/rue'
import Tabs from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

const findTabByLabel = (root: ParentNode, label: string) => {
  return (
    Array.from(root.querySelectorAll('button[role="tab"]')).find(button =>
      button.textContent?.includes(label),
    ) ?? null
  )
}

const findPanelByText = (root: ParentNode, text: string) => {
  return (
    Array.from(root.querySelectorAll('[role="tabpanel"]')).find(panel =>
      panel.textContent?.includes(text),
    ) ?? null
  )
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Tabs', () => {
  it('renders controlled tabs with style and active panel', async () => {
    const c = mountContainer()
    resetActiveRuntime()

    mountTestApp(c, () =>
      render(
        <Tabs
          style={'lift'}
          activeKey={'metrics'}
          items={[
            { key: 'overview', label: 'Overview', content: 'Overview panel' },
            { key: 'metrics', label: 'Metrics', content: 'Metrics panel' },
          ]}
        />,
        c,
      ),
    )

    await waitForContent(() => {
      const tablist = c.querySelector('[role="tablist"]') as HTMLElement
      expect(tablist.classList.contains('tabs')).toBe(true)
      expect(tablist.classList.contains('tabs-lift')).toBe(true)

      const activeTab = findTabByLabel(c, 'Metrics') as HTMLElement
      expect(activeTab.getAttribute('aria-selected')).toBe('true')

      const activePanel = findPanelByText(c, 'Metrics panel') as HTMLElement
      expect(activePanel.classList.contains('hidden')).toBe(false)
      expect(activePanel.getAttribute('aria-hidden')).toBe('false')
      expect(activePanel.textContent).toContain('Metrics panel')
    })
  })

  it('supports defaultActiveKey and switches panel in uncontrolled mode', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    const spy = vi.fn()

    mountTestApp(c, () =>
      render(
        <Tabs
          defaultActiveKey={'guide'}
          onChange={spy}
          items={[
            { key: 'guide', label: 'Guide', content: 'Guide panel' },
            { key: 'api', label: 'API', content: 'API panel' },
          ]}
        />,
        c,
      ),
    )

    await waitForContent(() => {
      expect(findTabByLabel(c, 'Guide')).not.toBeNull()
      expect(findPanelByText(c, 'Guide panel')).not.toBeNull()
    })

    const apiTab = findTabByLabel(c, 'API') as HTMLButtonElement
    apiTab.click()

    await waitForContent(() => {
      const activeApiTab = findTabByLabel(c, 'API') as HTMLButtonElement
      const apiPanel = findPanelByText(c, 'API panel') as HTMLElement
      const guidePanel = findPanelByText(c, 'Guide panel') as HTMLElement

      expect(activeApiTab.getAttribute('aria-selected')).toBe('true')
      expect(apiPanel.classList.contains('hidden')).toBe(false)
      expect(apiPanel.getAttribute('aria-hidden')).toBe('false')
      expect(guidePanel.classList.contains('hidden')).toBe(true)
      expect(guidePanel.getAttribute('aria-hidden')).toBe('true')
      expect(spy).toHaveBeenCalledWith('api')
    })
  })

  it('renders tabBarExtraContent on both sides', async () => {
    const c = mountContainer()
    resetActiveRuntime()

    mountTestApp(c, () =>
      render(
        <Tabs items={[{ key: 'overview', label: 'Overview' }]}>
          <Template slot="left">
            <span id="tabs-left-extra">Left</span>
          </Template>
          <Template slot="right">
            <span id="tabs-right-extra">Right</span>
          </Template>
        </Tabs>,
        c,
      ),
    )

    await waitForContent(() => {
      expect((c.querySelector('#tabs-left-extra') as HTMLElement).textContent).toBe('Left')
      expect((c.querySelector('#tabs-right-extra') as HTMLElement).textContent).toBe('Right')
    })
  })

  it('supports editable-card add and remove actions', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    const spy = vi.fn()

    mountTestApp(c, () =>
      render(
        <Tabs
          type={'editable-card'}
          onEdit={spy}
          items={[
            { key: 'todo', label: 'Todo' },
            { key: 'done', label: 'Done', closable: false },
          ]}
        />,
        c,
      ),
    )

    await waitForContent(() => {
      expect(c.querySelector('button[aria-label="新增标签"]')).not.toBeNull()
    })

    const addButton = c.querySelector('button[aria-label="新增标签"]') as HTMLButtonElement
    addButton.click()

    const removeTrigger = c.querySelector('[aria-label="移除 todo"]') as HTMLElement
    removeTrigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy.mock.calls[0][1]).toBe('add')
    expect(spy.mock.calls[1]).toEqual(['todo', 'remove'])
    expect(c.querySelector('[aria-label="移除 done"]')).toBeNull()
  })

  it('unmounts inactive panels when destroyOnHidden is enabled', async () => {
    const c = mountContainer()
    resetActiveRuntime()

    mountTestApp(c, () =>
      render(
        <Tabs
          defaultActiveKey={'overview'}
          destroyOnHidden={true}
          items={[
            { key: 'overview', label: 'Overview', content: 'Overview panel' },
            { key: 'metrics', label: 'Metrics', content: 'Metrics panel' },
          ]}
        />,
        c,
      ),
    )

    await waitForContent(() => {
      expect(findPanelByText(c, 'Overview panel')).not.toBeNull()
      expect(findPanelByText(c, 'Metrics panel')).toBeNull()
    })

    const metricsTab = findTabByLabel(c, 'Metrics') as HTMLButtonElement
    metricsTab.click()

    await waitForContent(() => {
      expect(findPanelByText(c, 'Overview panel')).toBeNull()
      expect((findPanelByText(c, 'Metrics panel') as HTMLElement)?.textContent).toContain(
        'Metrics panel',
      )
      expect(c.querySelectorAll('[role="tabpanel"]').length).toBe(1)
    })
  })

  it('restores complex panel children after switching back with destroyOnHidden', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    const OverviewPanel = () => (
      <div className="space-y-2">
        <div>Velocity</div>
        <div>Overview body</div>
      </div>
    )
    const ActivityPanel = () => (
      <div className="space-y-2">
        <div>Activity title</div>
        <div>Activity body</div>
      </div>
    )

    mountTestApp(c, () =>
      render(
        <Tabs
          defaultActiveKey={'overview'}
          destroyOnHidden={true}
          items={[
            {
              key: 'overview',
              label: 'Overview',
            },
            {
              key: 'activity',
              label: 'Activity',
            },
          ]}
        >
          <Template slot="overview">
            <OverviewPanel />
          </Template>
          <Template slot="activity">
            <ActivityPanel />
          </Template>
        </Tabs>,
        c,
      ),
    )

    await waitForContent(() => {
      expect(findPanelByText(c, 'Velocity')).not.toBeNull()
      expect(findPanelByText(c, 'Activity title')).toBeNull()
    })

    const initialOverview = findPanelByText(c, 'Velocity') as HTMLElement
    const initialOverviewContent = initialOverview.firstElementChild
    expect(initialOverview.textContent).toBe('VelocityOverview body')

    ;(findTabByLabel(c, 'Activity') as HTMLButtonElement).click()

    await waitForContent(() => {
      expect(findPanelByText(c, 'Velocity')).toBeNull()
      expect(findPanelByText(c, 'Activity title')?.textContent).toBe('Activity titleActivity body')
      expect(initialOverview.isConnected).toBe(false)
      expect(c.querySelectorAll('[role="tabpanel"]').length).toBe(1)
    })
    const initialActivity = findPanelByText(c, 'Activity title') as HTMLElement

    ;(findTabByLabel(c, 'Overview') as HTMLButtonElement).click()

    await waitForContent(() => {
      const overviewPanel = findPanelByText(c, 'Velocity') as HTMLElement | null
      expect(overviewPanel).not.toBeNull()
      expect(overviewPanel?.textContent).toBe('VelocityOverview body')
      expect(overviewPanel).not.toBe(initialOverview)
      expect(overviewPanel?.firstElementChild).not.toBe(initialOverviewContent)
      expect(initialActivity.isConnected).toBe(false)
      expect(c.querySelectorAll('[role="tabpanel"]').length).toBe(1)
      expect(findPanelByText(c, 'Activity title')).toBeNull()
    })
  })

  it('suppresses default border underline when custom indicator is rendered', async () => {
    const c = mountContainer()
    resetActiveRuntime()

    mountTestApp(c, () =>
      render(
        <Tabs
          type={'line'}
          activeKey={'metrics'}
          indicator={{ align: 'center', size: 24 }}
          items={[
            { key: 'overview', label: 'Overview' },
            { key: 'metrics', label: 'Metrics' },
          ]}
        />,
        c,
      ),
    )

    await waitForContent(() => {
      const activeTab = findTabByLabel(c, 'Metrics') as HTMLElement
      expect(activeTab.classList.contains('rue-tabs-indicator-active')).toBe(true)
    })
  })
})
