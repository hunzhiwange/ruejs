import { readFileSync } from 'node:fs'

import { type FC, ref } from '@rue-js/rue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import Tabs from '../../../packages/rue-design/src/components/tabs'
import { render, click, mountContainer, waitForContent } from './page-test-utils'

vi.mock('../../../app/pages/site/SidebarPlaygroundDesign', () => ({
  default: (props: { children?: unknown }) => (
    <div data-testid="mock-sidebar-design">{props.children}</div>
  ),
}))

vi.mock('../../../app/pages/site/components/Code', () => ({
  default: (props: { code?: string }) => <pre data-testid="mock-code">{props.code}</pre>,
}))

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

const findTabButton = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button[role="tab"]')).find(button =>
    button.textContent?.includes(label),
  ) ?? null

const findPreviewByTitle = (root: ParentNode, title: string) =>
  Array.from(root.querySelectorAll('.component-preview')).find(block =>
    block.querySelector('h2')?.textContent?.includes(title),
  ) ?? null

const findVisiblePanelText = (root: ParentNode) =>
  Array.from(root.querySelectorAll<HTMLElement>('[role="tabpanel"]')).find(
    panel => panel.getAttribute('aria-hidden') !== 'true' && !panel.classList.contains('hidden'),
  )?.textContent ?? ''

const tabsPageSource = readFileSync(`${process.cwd()}/app/pages/design/Tabs.tsx`, 'utf8')

const BasicTabsTogglePreview: FC = () => {
  const displayMode = ref<'preview' | 'code'>('preview')
  const activeKey = ref('tab2')

  return (
    <div className="component-preview not-prose text-base-content my-6 lg:my-12">
      <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># tabs</h2>
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
        <Tabs
          items={[
            { key: 'tab1', label: 'Tab 1' },
            { key: 'tab2', label: 'Tab 2' },
            { key: 'tab3', label: 'Tab 3' },
          ]}
          activeKey={activeKey.value}
          onChange={key => (activeKey.value = key)}
        />
      ) : (
        <pre data-testid="mock-code">tabs code</pre>
      )}
    </div>
  )
}

const ContentPanelsPreview: FC = () => {
  return (
    <div className="component-preview not-prose text-base-content my-6 lg:my-12">
      <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold"># content-panels</h2>
      <Tabs
        type="line"
        defaultActiveKey="overview"
        destroyOnHidden
        items={[
          {
            key: 'overview',
            label: 'Overview',
            children: (
              <div className="space-y-4">
                <div className="text-2xl font-semibold">Velocity</div>
                <ul className="space-y-2 text-sm opacity-75">
                  <li>锁定接口字段命名</li>
                  <li>同步埋点事件与告警阈值</li>
                </ul>
              </div>
            ),
          },
          {
            key: 'activity',
            label: 'Activity',
            children: (
              <div className="space-y-3 text-sm opacity-75">
                <div>设计评审通过，进入开发联调。</div>
                <div>补齐埋点与告警配置。</div>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}

const CustomIndicatorPreview: FC = () => {
  const activeKey = ref('metrics')

  return (
    <div className="component-preview not-prose text-base-content my-6 lg:my-12">
      <h2 className="component-preview-title mt-2 mb-1 text-lg font-semibold">
        # custom-indicator
      </h2>
      <Tabs
        type="line"
        activeKey={activeKey.value}
        onChange={key => (activeKey.value = key)}
        indicator={{
          align: 'center',
          size: 24,
          className: 'bg-primary opacity-100',
        }}
        items={[
          { key: 'roadmap', label: 'Roadmap' },
          { key: 'metrics', label: 'Metrics' },
          { key: 'notes', label: 'Notes' },
        ]}
      />
    </div>
  )
}

const BottomPlacementPreview: FC = () => {
  const activeKey = ref('b2')

  return (
    <Tabs
      style="lift"
      placement="bottom"
      items={[
        { key: 'b1', label: 'Tab 1', children: 'Tab content 1' },
        { key: 'b2', label: 'Tab 2', children: 'Tab content 2' },
        { key: 'b3', label: 'Tab 3', children: 'Tab content 3' },
      ]}
      activeKey={activeKey.value}
      onChange={key => (activeKey.value = key)}
    />
  )
}

const ExtraContentPreview: FC = () => {
  const activeKey = ref('overview')

  return (
    <Tabs
      type="card"
      activeKey={activeKey.value}
      onChange={key => (activeKey.value = key)}
      tabBarExtraContent={{
        left: <span className="badge badge-neutral badge-sm">Workspace</span>,
        right: (
          <button className="btn btn-primary btn-sm" type="button">
            New Milestone
          </button>
        ),
      }}
      items={[
        {
          key: 'overview',
          label: 'Overview',
          children: '版本计划、优先级排序与协作说明统一放在这里。',
        },
        {
          key: 'timeline',
          label: 'Timeline',
          children: '时间轴、里程碑和负责人信息可以作为右侧扩展操作的搭配内容。',
        },
        { key: 'qa', label: 'QA', children: '测试结果、风险等级与回归建议。' },
      ]}
    />
  )
}

const PlacementPreview: FC = () => {
  const activeKey = ref('design')

  return (
    <Tabs
      tabPlacement="start"
      type="line"
      activeKey={activeKey.value}
      onChange={key => (activeKey.value = key)}
      className="min-h-72"
      items={[
        {
          key: 'design',
          label: 'Design',
          children: '左侧导航布局适合文档、设置页和大段信息浏览。',
        },
        { key: 'review', label: 'Review', children: '右侧摆放则更适合注释面板或对照式配置区域。' },
      ]}
    />
  )
}

const EditableCardPreview: FC = () => {
  const activeKey = ref('draft-2')

  return (
    <Tabs
      type="editable-card"
      activeKey={activeKey.value}
      onChange={key => (activeKey.value = key)}
      onEdit={() => {}}
      items={[
        { key: 'draft-1', label: 'Draft 1', children: '需求说明、依赖评估与风险梳理。' },
        { key: 'draft-2', label: 'Draft 2', children: '设计走查与交互标注已经完成。' },
      ]}
    />
  )
}

describe('Tabs actual page', () => {
  it('keeps demo tab state stable across preview and code toggles', async () => {
    const container = mountContainer()
    render(<BasicTabsTogglePreview />, container)

    await waitForContent(() => {
      expect(container.querySelector('.component-preview')).not.toBeNull()
    })

    const getPrimaryDemo = () => findPreviewByTitle(container, 'tabs') as HTMLElement | null
    expect(getPrimaryDemo()).not.toBeNull()

    const tab2 = findTabButton(getPrimaryDemo()!, 'Tab 2')
    expect(tab2?.classList.contains('tab-active')).toBe(true)

    await click(findTabButton(getPrimaryDemo()!, 'Tab 3'))

    const tab3 = findTabButton(getPrimaryDemo()!, 'Tab 3')
    expect(tab3?.classList.contains('tab-active')).toBe(true)

    await click(findTabButton(getPrimaryDemo()!, 'JSX代码'))
    expect(findTabButton(getPrimaryDemo()!, 'Tab 1')).toBeNull()
    expect(findTabButton(getPrimaryDemo()!, 'Tab 3')).toBeNull()

    await click(findTabButton(getPrimaryDemo()!, '预览'))

    await waitForContent(() => {
      expect(findTabButton(getPrimaryDemo()!, 'Tab 3')?.classList.contains('tab-active')).toBe(true)
    })
  })

  it('destroys inactive content-panels demo panels when switching tabs', async () => {
    const container = mountContainer()
    render(<ContentPanelsPreview />, container)

    const preview = () => findPreviewByTitle(container, 'content-panels') as HTMLElement | null

    await waitForContent(() => {
      expect(preview()).not.toBeNull()
      expect(findVisiblePanelText(preview()!)).toContain('Velocity')
      expect(preview()?.querySelectorAll('[role="tabpanel"]').length).toBe(1)
    })

    await click(findTabButton(preview()!, 'Activity'))

    await waitForContent(() => {
      expect(findVisiblePanelText(preview()!)).not.toContain('Velocity')
      expect(findVisiblePanelText(preview()!)).toContain('设计评审通过，进入开发联调。')
      expect(preview()?.querySelectorAll('[role="tabpanel"]').length).toBe(1)
    })

    await click(findTabButton(preview()!, 'Overview'))

    await waitForContent(() => {
      expect(findVisiblePanelText(preview()!)).toContain('Velocity')
      expect(findVisiblePanelText(preview()!)).toContain('锁定接口字段命名')
      expect(findVisiblePanelText(preview()!)).not.toContain('设计评审通过，进入开发联调。')
      expect(preview()?.querySelectorAll('[role="tabpanel"]').length).toBe(1)
    })

    await click(findTabButton(preview()!, 'Activity'))

    await waitForContent(() => {
      expect(findVisiblePanelText(preview()!)).not.toContain('Velocity')
      expect(findVisiblePanelText(preview()!)).toContain('设计评审通过，进入开发联调。')
      expect(preview()?.querySelectorAll('[role="tabpanel"]').length).toBe(1)
    })
  })

  it('applies custom-indicator override class on the active tab', async () => {
    const container = mountContainer()
    render(<CustomIndicatorPreview />, container)

    const preview = () => findPreviewByTitle(container, 'custom-indicator') as HTMLElement | null

    await waitForContent(() => {
      const metricsTab = findTabButton(preview()!, 'Metrics')
      expect(metricsTab?.classList.contains('rue-tabs-indicator-active')).toBe(true)
    })
  })

  it('switches the tab-bar-extra-content controlled demo panel', async () => {
    const container = mountContainer()
    render(<ExtraContentPreview />, container)

    await waitForContent(() => {
      expect(findVisiblePanelText(container)).toContain(
        '版本计划、优先级排序与协作说明统一放在这里。',
      )
    })

    await click(findTabButton(container, 'Timeline'))

    await waitForContent(() => {
      expect(findVisiblePanelText(container)).toContain(
        '时间轴、里程碑和负责人信息可以作为右侧扩展操作的搭配内容。',
      )
      expect(findVisiblePanelText(container)).not.toContain(
        '版本计划、优先级排序与协作说明统一放在这里。',
      )
    })
  })

  it('switches the tab-placement controlled demo panel', async () => {
    const container = mountContainer()
    render(<PlacementPreview />, container)

    await waitForContent(() => {
      expect(findVisiblePanelText(container)).toContain(
        '左侧导航布局适合文档、设置页和大段信息浏览。',
      )
    })

    await click(findTabButton(container, 'Review'))

    await waitForContent(() => {
      expect(findVisiblePanelText(container)).toContain(
        '右侧摆放则更适合注释面板或对照式配置区域。',
      )
      expect(findVisiblePanelText(container)).not.toContain(
        '左侧导航布局适合文档、设置页和大段信息浏览。',
      )
    })
  })

  it('switches the editable-card controlled demo panel', async () => {
    const container = mountContainer()
    render(<EditableCardPreview />, container)

    await waitForContent(() => {
      expect(findVisiblePanelText(container)).toContain('设计走查与交互标注已经完成。')
    })

    await click(findTabButton(container, 'Draft 1'))

    await waitForContent(() => {
      expect(findVisiblePanelText(container)).toContain('需求说明、依赖评估与风险梳理。')
      expect(findVisiblePanelText(container)).not.toContain('设计走查与交互标注已经完成。')
    })
  })

  it('switches the tabs-bottom controlled demo panel', async () => {
    const container = mountContainer()
    render(<BottomPlacementPreview />, container)

    await waitForContent(() => {
      expect(findVisiblePanelText(container)).toContain('Tab content 2')
    })

    await click(findTabButton(container, 'Tab 3'))

    await waitForContent(() => {
      expect(findVisiblePanelText(container)).toContain('Tab content 3')
      expect(findVisiblePanelText(container)).not.toContain('Tab content 2')
    })
  })

  it('renders a copy-ready JSX snippet for the content-panels demo', async () => {
    expect(tabsPageSource).toContain('progress progress-primary')
    expect(tabsPageSource).toContain('锁定接口字段命名')
    expect(tabsPageSource).not.toContain('<OverviewPanel />')
  })

  it('renders a copy-ready JSX snippet for the tab-bar-extra-content demo', async () => {
    expect(tabsPageSource).toContain("const activeKey = ref('overview')")
    expect(tabsPageSource).toContain("children: '版本计划、优先级排序与协作说明统一放在这里。'")
    expect(tabsPageSource).not.toContain('items={items}')
  })

  it('renders a copy-ready JSX snippet for the tab-placement demo', async () => {
    expect(tabsPageSource).toContain("const placementMode = ref<'start' | 'end'>('start')")
    expect(tabsPageSource).toContain("children: '左侧导航布局适合文档、设置页和大段信息浏览。'")
    expect(tabsPageSource).not.toContain("children: '...'")
  })

  it('renders a copy-ready JSX snippet for the editable-card demo', async () => {
    expect(tabsPageSource).toContain(
      'const handleEditableEdit = (eventOrKey: MouseEvent | string, action:',
    )
    expect(tabsPageSource).toContain("children: '需求说明、依赖评估与风险梳理。'")
    expect(tabsPageSource).not.toContain('// append item')
    expect(tabsPageSource).not.toContain("children: '...'")
  })
})
