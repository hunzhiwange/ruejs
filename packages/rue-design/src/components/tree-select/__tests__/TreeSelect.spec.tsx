import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref, render, setReactiveScheduling } from '@rue-js/rue'
import TreeSelect, { type TreeSelectDataNode } from '../index'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

const getNodeRow = (container: HTMLElement, value: string) => {
  return container.querySelector(`[data-rue-tree-select-node="string:${value}"]`) as HTMLElement
}

const triggerClick = (element: Element | null) => {
  ;(element as HTMLElement | null)?.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true }),
  )
}

const triggerMouseDown = (element: Element | null) => {
  ;(element as HTMLElement | null)?.dispatchEvent(
    new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
  )
}

const triggerBrowserClick = (element: Element | null) => {
  triggerMouseDown(element)
  triggerClick(element)
}

const triggerDocumentMouseDownFrom = (element: Element | null) => {
  if (!element) return
  const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'target', {
    configurable: true,
    value: element,
  })
  document.dispatchEvent(event)
}

const clickExpandButton = (container: HTMLElement, value: string) => {
  const row = getNodeRow(container, value)
  const buttons = row.querySelectorAll('button')
  triggerClick(buttons[0])
}

const clickCheckboxButton = (container: HTMLElement, value: string) => {
  const row = getNodeRow(container, value)
  const buttons = row.querySelectorAll('button')
  triggerClick(buttons[1])
}

const browserClickCheckboxButton = (container: HTMLElement, value: string) => {
  const row = getNodeRow(container, value)
  const buttons = row.querySelectorAll('button')
  triggerBrowserClick(buttons[1])
}

const clickLabelButton = (container: HTMLElement, value: string) => {
  const row = getNodeRow(container, value)
  const buttons = row.querySelectorAll('button')
  triggerClick(buttons[buttons.length - 1])
}

const browserClickLabelButton = (container: HTMLElement, value: string) => {
  const row = getNodeRow(container, value)
  const buttons = row.querySelectorAll('button')
  triggerBrowserClick(buttons[buttons.length - 1])
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('TreeSelect', () => {
  it('supports basic single selection and clearing', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <TreeSelect
          allowClear
          placeholder="选择节点"
          treeDefaultExpandAll
          treeData={[
            {
              title: '组织架构',
              value: 'org',
              children: [
                { title: '设计系统', value: 'design' },
                { title: '工程平台', value: 'platform' },
              ],
            },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const selector = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      expect(selector.textContent).toContain('选择节点')
    })

    const selector = container.querySelector(
      '[data-rue-tree-select-selector="true"]',
    ) as HTMLElement
    triggerClick(selector)

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-tree-select-popup="true"]') as HTMLElement
      expect(popup.hidden).toBe(false)
      expect(getNodeRow(container, 'design')).toBeTruthy()
    })

    clickLabelButton(container, 'design')

    await waitForContent(() => {
      const selectorAfterSelect = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      expect(selectorAfterSelect.textContent).toContain('设计系统')
      expect(container.querySelector('[aria-label="清空选择"]')).toBeTruthy()
    })

    const clearButton = container.querySelector('[aria-label="清空选择"]') as HTMLButtonElement
    triggerClick(clearButton)

    await waitForContent(() => {
      const selectorAfterClear = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      expect(selectorAfterClear.textContent).toContain('选择节点')
      expect(selectorAfterClear.textContent).not.toContain('设计系统')
    })
  })

  it('keeps the clear button hidden when allowClear is not provided', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <TreeSelect
          value="design"
          treeDefaultExpandAll
          treeData={[
            {
              title: '组织架构',
              value: 'org',
              children: [
                { title: '设计系统', value: 'design' },
                { title: '工程平台', value: 'platform' },
              ],
            },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const selector = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      expect(selector.textContent).toContain('设计系统')
    })

    const clearButton = container.querySelector('[aria-label="清空选择"]') as HTMLButtonElement
    expect(clearButton.disabled).toBe(true)
    expect(clearButton.className).toContain('hidden')
    expect(clearButton.className).not.toContain('inline-flex')
  })

  it('rotates the selector suffix arrow when the popup opens and closes', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <TreeSelect
          placeholder="选择节点"
          treeDefaultExpandAll
          treeData={[
            {
              title: '组织架构',
              value: 'org',
              children: [{ title: '设计系统', value: 'design' }],
            },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tree-select-arrow="true"]')).toBeTruthy()
    })

    const selector = container.querySelector(
      '[data-rue-tree-select-selector="true"]',
    ) as HTMLElement
    const arrow = container.querySelector('[data-rue-tree-select-arrow="true"]') as HTMLElement

    expect(arrow.className).not.toContain('rotate-180')

    triggerClick(selector)

    await waitForContent(() => {
      expect(arrow.className).toContain('rotate-180')
    })

    triggerClick(selector)

    await waitForContent(() => {
      expect(arrow.className).not.toContain('rotate-180')
    })
  })

  it('updates controlled single-select text after selecting a different node twice', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const selectedValue = ref('prod')

    const Demo = () => {
      return (
        <TreeSelect
          value={selectedValue.value}
          treeDefaultExpandAll
          variant="filled"
          status="warning"
          treeData={[
            {
              title: '应用集群',
              value: 'apps',
              children: [
                { title: '生产环境', value: 'prod' },
                { title: '预发环境', value: 'stage' },
                { title: '开发环境', value: 'dev' },
              ],
            },
          ]}
          onChange={nextValue => {
            selectedValue.value = String(nextValue ?? '')
          }}
        />
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      const selector = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      expect(selector.textContent).toContain('生产环境')
    })

    const selector = container.querySelector(
      '[data-rue-tree-select-selector="true"]',
    ) as HTMLElement

    triggerClick(selector)

    await waitForContent(() => {
      expect(getNodeRow(container, 'stage')).toBeTruthy()
    })

    clickLabelButton(container, 'stage')

    await waitForContent(() => {
      const selectorAfterFirstSelect = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      expect(selectorAfterFirstSelect.textContent).toContain('预发环境')
      expect(selectorAfterFirstSelect.textContent).not.toContain('生产环境')
    })

    triggerClick(container.querySelector('[data-rue-tree-select-selector="true"]') as HTMLElement)

    await waitForContent(() => {
      expect(getNodeRow(container, 'dev')).toBeTruthy()
    })

    clickLabelButton(container, 'dev')

    await waitForContent(() => {
      const selectorAfterSecondSelect = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      expect(selectorAfterSecondSelect.textContent).toContain('开发环境')
      expect(selectorAfterSecondSelect.textContent).not.toContain('预发环境')
      expect(selectorAfterSecondSelect.textContent).not.toContain('生产环境')
    })
  })

  it('restores the clear button after clearing and reselecting in controlled filled status mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const selectedValue = ref('prod')

    const Demo = () => {
      return (
        <TreeSelect
          value={selectedValue.value}
          treeDefaultExpandAll
          variant="filled"
          status="warning"
          allowClear
          prefix={<span>ENV</span>}
          suffix={<span>可清空</span>}
          treeData={[
            {
              title: '应用集群',
              value: 'apps',
              children: [
                { title: '生产环境', value: 'prod' },
                { title: '预发环境', value: 'stage' },
                { title: '开发环境', value: 'dev' },
              ],
            },
          ]}
          onChange={nextValue => {
            selectedValue.value = String(nextValue ?? '')
          }}
        />
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      const clearButton = container.querySelector('[aria-label="清空选择"]') as HTMLButtonElement
      expect(clearButton.disabled).toBe(false)
      expect(clearButton.className).toContain('inline-flex')
      expect(clearButton.className).not.toContain('hidden')
    })

    triggerClick(container.querySelector('[aria-label="清空选择"]'))

    await waitForContent(() => {
      const selectorAfterClear = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      const clearButton = container.querySelector('[aria-label="清空选择"]') as HTMLButtonElement

      expect(selectorAfterClear.textContent).toContain('请选择')
      expect(clearButton.disabled).toBe(true)
      expect(clearButton.className).toContain('hidden')
      expect(clearButton.className).not.toContain('inline-flex')
    })

    triggerClick(container.querySelector('[data-rue-tree-select-selector="true"]'))

    await waitForContent(() => {
      expect(getNodeRow(container, 'stage')).toBeTruthy()
    })

    clickLabelButton(container, 'stage')

    await waitForContent(() => {
      const selectorAfterReselect = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      const clearButton = container.querySelector('[aria-label="清空选择"]') as HTMLButtonElement

      expect(selectorAfterReselect.textContent).toContain('预发环境')
      expect(clearButton.disabled).toBe(false)
      expect(clearButton.className).toContain('inline-flex')
      expect(clearButton.className).not.toContain('hidden')
    })
  })

  it('supports checkable mode with SHOW_PARENT strategy', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <TreeSelect
          treeCheckable
          showCheckedStrategy={TreeSelect.SHOW_PARENT}
          treeDefaultExpandAll
          onChange={handleChange}
          treeData={[
            {
              title: '平台团队',
              value: 'team',
              children: [
                { title: '构建链路', value: 'build' },
                { title: '发布平台', value: 'release' },
              ],
            },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tree-select-selector="true"]')).toBeTruthy()
    })

    const selector = container.querySelector(
      '[data-rue-tree-select-selector="true"]',
    ) as HTMLElement
    triggerClick(selector)

    await waitForContent(() => {
      expect(getNodeRow(container, 'team')).toBeTruthy()
    })

    clickCheckboxButton(container, 'team')

    await waitForContent(() => {
      const selectorAfterCheck = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      const popup = container.querySelector('[data-rue-tree-select-popup="true"]') as HTMLElement
      const lastChangeCall = handleChange.mock.calls[handleChange.mock.calls.length - 1]
      expect(selectorAfterCheck.textContent).toContain('平台团队')
      expect(popup.hidden).toBe(false)
      expect(handleChange).toHaveBeenCalled()
      expect(lastChangeCall?.[0]).toEqual(['team'])
    })
  })

  it('keeps the popup open after selecting in controlled checkable mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const selectedValues = ref<string[]>([])

    const Demo = () => {
      return (
        <TreeSelect
          treeCheckable
          value={selectedValues.value}
          treeDefaultExpandAll
          treeData={[
            {
              title: '平台团队',
              value: 'team',
              children: [
                { title: '构建链路', value: 'build' },
                { title: '发布平台', value: 'release' },
              ],
            },
          ]}
          onChange={nextValue => {
            selectedValues.value = Array.isArray(nextValue) ? nextValue.map(String) : []
          }}
        />
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tree-select-selector="true"]')).toBeTruthy()
    })

    const selector = container.querySelector(
      '[data-rue-tree-select-selector="true"]',
    ) as HTMLElement
    triggerClick(selector)

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-tree-select-popup="true"]') as HTMLElement
      expect(popup.hidden).toBe(false)
      expect(getNodeRow(container, 'team')).toBeTruthy()
    })

    browserClickCheckboxButton(container, 'team')

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-tree-select-popup="true"]') as HTMLElement
      expect(popup.hidden).toBe(false)
      expect(container.querySelector('[aria-label^="移除 "]')).toBeTruthy()
    })
  })

  it('updates SHOW_PARENT checkable selection after unchecking a child under a selected parent', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const selectedValues = ref<string[]>(['platform', 'engineering'])

    const Demo = () => {
      return (
        <TreeSelect
          treeCheckable
          showCheckedStrategy={TreeSelect.SHOW_PARENT}
          value={selectedValues.value}
          treeDefaultExpandAll
          treeData={[
            {
              title: '产品平台',
              value: 'platform',
              children: [
                { title: '文档中心', value: 'docs' },
                { title: '资源目录', value: 'assets' },
                { title: '组件市场', value: 'components' },
              ],
            },
            {
              title: '工程效率',
              value: 'engineering',
              children: [
                { title: '构建链路', value: 'build' },
                { title: '质量门禁', value: 'quality' },
                { title: '发布管道', value: 'release' },
              ],
            },
          ]}
          onChange={nextValue => {
            selectedValues.value = Array.isArray(nextValue) ? nextValue.map(String) : []
          }}
        />
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      const selector = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      expect(selector.textContent).toContain('产品平台')
      expect(selector.textContent).toContain('工程效率')
    })

    const selector = container.querySelector(
      '[data-rue-tree-select-selector="true"]',
    ) as HTMLElement
    triggerClick(selector)

    await waitForContent(() => {
      expect(getNodeRow(container, 'assets')).toBeTruthy()
    })

    clickCheckboxButton(container, 'assets')

    await waitForContent(() => {
      const platformButtons = getNodeRow(container, 'platform').querySelectorAll('button')
      const platformCheckbox = platformButtons[1] as HTMLButtonElement
      const assetsButtons = getNodeRow(container, 'assets').querySelectorAll('button')
      const assetsCheckbox = assetsButtons[1] as HTMLButtonElement
      const selectorAfterToggle = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement

      expect(platformCheckbox.getAttribute('aria-checked')).toBe('mixed')
      expect(assetsCheckbox.getAttribute('aria-checked')).toBe('false')
      expect(selectorAfterToggle.textContent).not.toContain('产品平台')
      expect(selectorAfterToggle.textContent).toContain('文档中心')
      expect(selectorAfterToggle.textContent).toContain('工程效率')
      expect(selectedValues.value).toEqual(['docs', 'components', 'engineering'])
    })
  })

  it('keeps the popup open after checking with maxTagCount in controlled checkable mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const selectedValues = ref<string[]>(['build', 'quality'])

    const Demo = () => {
      return (
        <TreeSelect
          treeCheckable
          allowClear
          maxTagCount={2}
          maxTagPlaceholder="..."
          value={selectedValues.value}
          treeDefaultExpandAll
          treeData={[
            {
              title: '产品平台',
              value: 'platform',
              children: [
                { title: '文档中心', value: 'docs' },
                { title: '资源目录', value: 'assets' },
                { title: '组件市场', value: 'components' },
              ],
            },
            {
              title: '工程效率',
              value: 'engineering',
              children: [
                { title: '构建链路', value: 'build' },
                { title: '质量门禁', value: 'quality' },
                { title: '发布管道', value: 'release' },
              ],
            },
          ]}
          onChange={nextValue => {
            selectedValues.value = Array.isArray(nextValue) ? nextValue.map(String) : []
          }}
        />
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tree-select-selector="true"]')).toBeTruthy()
    })

    triggerClick(container.querySelector('[data-rue-tree-select-selector="true"]') as HTMLElement)

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-tree-select-popup="true"]') as HTMLElement
      expect(popup.hidden).toBe(false)
      expect(getNodeRow(container, 'release')).toBeTruthy()
    })

    browserClickCheckboxButton(container, 'release')

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-tree-select-popup="true"]') as HTMLElement
      const releaseButtons = getNodeRow(container, 'release').querySelectorAll('button')
      const releaseCheckbox = releaseButtons[1] as HTMLButtonElement
      expect(popup.hidden).toBe(false)
      expect(releaseCheckbox.getAttribute('aria-checked')).toBe('true')
      expect(selectedValues.value).toEqual(['build', 'quality', 'release'])
    })
  })

  it('keeps the popup open after toggling a checkable node label in controlled mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const selectedValues = ref<string[]>(['build', 'quality'])

    const Demo = () => {
      return (
        <TreeSelect
          treeCheckable
          allowClear
          maxTagCount={2}
          maxTagPlaceholder="..."
          value={selectedValues.value}
          treeDefaultExpandAll
          treeData={[
            {
              title: '产品平台',
              value: 'platform',
              children: [
                { title: '文档中心', value: 'docs' },
                { title: '资源目录', value: 'assets' },
                { title: '组件市场', value: 'components' },
              ],
            },
            {
              title: '工程效率',
              value: 'engineering',
              children: [
                { title: '构建链路', value: 'build' },
                { title: '质量门禁', value: 'quality' },
                { title: '发布管道', value: 'release' },
              ],
            },
          ]}
          onChange={nextValue => {
            selectedValues.value = Array.isArray(nextValue) ? nextValue.map(String) : []
          }}
        />
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tree-select-selector="true"]')).toBeTruthy()
    })

    triggerClick(container.querySelector('[data-rue-tree-select-selector="true"]') as HTMLElement)

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-tree-select-popup="true"]') as HTMLElement
      expect(popup.hidden).toBe(false)
      expect(getNodeRow(container, 'release')).toBeTruthy()
    })

    browserClickLabelButton(container, 'release')

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-tree-select-popup="true"]') as HTMLElement
      const releaseButtons = getNodeRow(container, 'release').querySelectorAll('button')
      const releaseLabel = releaseButtons[releaseButtons.length - 1] as HTMLButtonElement
      expect(popup.hidden).toBe(false)
      expect(releaseLabel.className).toContain('bg-primary/12')
      expect(selectedValues.value).toEqual(['build', 'quality', 'release'])
    })
  })

  it('clears controlled checkable selection with the allowClear button', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const selectedValues = ref<string[]>(['engineering'])

    const Demo = () => {
      return (
        <>
          <TreeSelect
            treeCheckable
            showCheckedStrategy={TreeSelect.SHOW_PARENT}
            allowClear
            value={selectedValues.value}
            treeDefaultExpandAll
            treeData={[
              {
                title: '产品平台',
                value: 'platform',
                children: [
                  { title: '文档中心', value: 'docs' },
                  { title: '资源目录', value: 'assets' },
                  { title: '组件市场', value: 'components' },
                ],
              },
              {
                title: '工程效率',
                value: 'engineering',
                children: [
                  { title: '构建链路', value: 'build' },
                  { title: '质量门禁', value: 'quality' },
                  { title: '发布管道', value: 'release' },
                ],
              },
            ]}
            onChange={nextValue => {
              selectedValues.value = Array.isArray(nextValue) ? nextValue.map(String) : []
            }}
          />
          <div data-testid="selected-values">{String(selectedValues.value.join('/'))}</div>
        </>
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      const selector = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      expect(selector.textContent).toContain('工程效率')
      const clearButton = container.querySelector('[aria-label="清空选择"]') as HTMLButtonElement
      expect(clearButton.disabled).toBe(false)
    })

    const selector = container.querySelector(
      '[data-rue-tree-select-selector="true"]',
    ) as HTMLElement
    triggerClick(selector)

    await waitForContent(() => {
      expect(getNodeRow(container, 'engineering')).toBeTruthy()
    })

    const clearButton = container.querySelector('[aria-label="清空选择"]') as HTMLButtonElement
    triggerClick(clearButton)

    await waitForContent(() => {
      const selectorAfterClear = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      const popup = container.querySelector('[data-rue-tree-select-popup="true"]') as HTMLElement
      const engineeringButtons = getNodeRow(container, 'engineering').querySelectorAll('button')
      const engineeringCheckbox = engineeringButtons[1] as HTMLButtonElement
      expect(selectorAfterClear.textContent).not.toContain('工程效率')
      expect(container.querySelector('[data-testid="selected-values"]')?.textContent).toBe('')
      expect(popup.hidden).toBe(false)
      expect(engineeringCheckbox.getAttribute('aria-checked')).toBe('false')
    })
  })

  it('preserves the popup scroll position after selecting in checkable mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const selectedValues = ref<string[]>(['engineering'])

    const Demo = () => {
      return (
        <TreeSelect
          treeCheckable
          value={selectedValues.value}
          listHeight={120}
          treeDefaultExpandAll
          treeData={[
            {
              title: '产品平台',
              value: 'platform',
              children: [
                { title: '文档中心', value: 'docs' },
                { title: '资源目录', value: 'assets' },
                { title: '组件市场', value: 'components' },
              ],
            },
            {
              title: '工程效率',
              value: 'engineering',
              children: [
                { title: '构建链路', value: 'build' },
                { title: '质量门禁', value: 'quality' },
                { title: '发布管道', value: 'release' },
              ],
            },
            {
              title: '增长分析',
              value: 'growth',
              children: [
                { title: '实验看板', value: 'experiments' },
                { title: '归因报表', value: 'attribution' },
                { title: '留存漏斗', value: 'retention' },
              ],
            },
          ]}
          onChange={nextValue => {
            selectedValues.value = Array.isArray(nextValue) ? nextValue.map(String) : []
          }}
        />
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tree-select-selector="true"]')).toBeTruthy()
    })

    triggerClick(container.querySelector('[data-rue-tree-select-selector="true"]'))

    await waitForContent(() => {
      expect(getNodeRow(container, 'retention')).toBeTruthy()
    })

    const treeBefore = container.querySelector('[role="tree"]') as HTMLElement
    treeBefore.scrollTop = 64
    treeBefore.dispatchEvent(new Event('scroll'))

    clickCheckboxButton(container, 'retention')

    await waitForContent(() => {
      const treeAfter = container.querySelector('[role="tree"]') as HTMLElement
      const popup = container.querySelector('[data-rue-tree-select-popup="true"]') as HTMLElement
      expect(popup.hidden).toBe(false)
      expect(treeAfter.scrollTop).toBe(64)
      expect(selectedValues.value).toContain('retention')
    })
  })

  it('keeps the popup open after selecting in multiple mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <TreeSelect
          multiple
          treeDefaultExpandAll
          treeData={[
            {
              title: '平台团队',
              value: 'team',
              children: [
                { title: '构建链路', value: 'build' },
                { title: '发布平台', value: 'release' },
              ],
            },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tree-select-selector="true"]')).toBeTruthy()
    })

    const selector = container.querySelector(
      '[data-rue-tree-select-selector="true"]',
    ) as HTMLElement
    triggerClick(selector)

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-tree-select-popup="true"]') as HTMLElement
      expect(popup.hidden).toBe(false)
      expect(getNodeRow(container, 'build')).toBeTruthy()
    })

    browserClickLabelButton(container, 'build')

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-tree-select-popup="true"]') as HTMLElement
      expect(popup.hidden).toBe(false)
      expect(container.querySelector('[aria-label="移除 构建链路"]')).toBeTruthy()
    })
  })

  it('keeps the popup open when an internal multiple mousedown reaches the document listener', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <TreeSelect
          multiple
          treeDefaultExpandAll
          treeData={[
            {
              title: '协作面板',
              value: 'workspace',
              children: [
                { title: '日报汇总', value: 'daily' },
                { title: '设计交接', value: 'handoff' },
              ],
            },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tree-select-selector="true"]')).toBeTruthy()
    })

    triggerClick(container.querySelector('[data-rue-tree-select-selector="true"]') as HTMLElement)

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-tree-select-popup="true"]') as HTMLElement
      expect(popup.hidden).toBe(false)
      expect(getNodeRow(container, 'daily')).toBeTruthy()
    })

    const root = container.querySelector('[data-rue-tree-select-root="true"]') as HTMLElement
    const row = getNodeRow(container, 'daily')
    const buttons = row.querySelectorAll('button')
    root.setAttribute('data-rue-tree-select-id', 'stale-tree-select-id')
    triggerDocumentMouseDownFrom(buttons[buttons.length - 1])

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-tree-select-popup="true"]') as HTMLElement
      expect(popup.hidden).toBe(false)
    })
  })

  it('keeps the popup open after selecting in controlled multiple mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const selectedValues = ref<string[]>([])

    const Demo = () => {
      return (
        <div>
          <TreeSelect
            multiple
            value={selectedValues.value}
            treeDefaultExpandAll
            treeData={[
              {
                title: '平台团队',
                value: 'team',
                children: [
                  { title: '构建链路', value: 'build' },
                  { title: '发布平台', value: 'release' },
                ],
              },
            ]}
            onChange={nextValue => {
              selectedValues.value = Array.isArray(nextValue) ? nextValue.map(String) : []
            }}
          />
        </div>
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tree-select-selector="true"]')).toBeTruthy()
    })

    const selector = container.querySelector(
      '[data-rue-tree-select-selector="true"]',
    ) as HTMLElement
    triggerClick(selector)

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-tree-select-popup="true"]') as HTMLElement
      expect(popup.hidden).toBe(false)
      expect(getNodeRow(container, 'build')).toBeTruthy()
    })

    browserClickLabelButton(container, 'build')

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-tree-select-popup="true"]') as HTMLElement
      expect(popup.hidden).toBe(false)
      expect(container.querySelector('[aria-label="移除 构建链路"]')).toBeTruthy()
    })
  })

  it('keeps the popup open after selecting with maxTagCount in controlled multiple mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const selectedValues = ref<string[]>(['analytics', 'minutes'])

    const Demo = () => {
      return (
        <TreeSelect
          multiple
          allowClear
          maxTagCount={2}
          value={selectedValues.value}
          treeDefaultExpandAll
          treeData={[
            {
              title: '协作面板',
              value: 'workspace',
              children: [
                { title: '日报汇总', value: 'daily' },
                { title: '设计交接', value: 'handoff' },
                { title: '会议纪要', value: 'minutes' },
              ],
            },
            {
              title: '数据服务',
              value: 'data',
              children: [
                { title: '分析订阅', value: 'analytics' },
                { title: '实验指标', value: 'metrics' },
                { title: '异常告警', value: 'alerts' },
              ],
            },
          ]}
          onChange={nextValue => {
            selectedValues.value = Array.isArray(nextValue) ? nextValue.map(String) : []
          }}
        />
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tree-select-selector="true"]')).toBeTruthy()
    })

    triggerClick(container.querySelector('[data-rue-tree-select-selector="true"]') as HTMLElement)

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-tree-select-popup="true"]') as HTMLElement
      expect(popup.hidden).toBe(false)
      expect(getNodeRow(container, 'daily')).toBeTruthy()
    })

    browserClickLabelButton(container, 'daily')

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-tree-select-popup="true"]') as HTMLElement
      expect(popup.hidden).toBe(false)
      expect(selectedValues.value).toEqual(['analytics', 'minutes', 'daily'])
    })
  })

  it('shows the selected child as active when reopening in simple mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const selectedValue = ref('workflow')

    const Demo = () => {
      return (
        <TreeSelect
          value={selectedValue.value}
          treeData={[
            { nodeId: 1, parentId: 0, code: 'workspace', name: 'Workspace' },
            { nodeId: 2, parentId: 1, code: 'workflow', name: 'Workflow board' },
            { nodeId: 3, parentId: 1, code: 'briefs', name: 'Briefs' },
            { nodeId: 4, parentId: 2, code: 'review', name: 'Design review' },
          ]}
          treeDataSimpleMode={{ id: 'nodeId', pId: 'parentId', rootPId: 0 }}
          fieldNames={{ value: 'code', label: 'name', key: 'code' }}
          treeDefaultExpandAll
          onChange={nextValue => {
            selectedValue.value = nextValue == null ? '' : String(nextValue)
          }}
        />
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tree-select-selector="true"]')).toBeTruthy()
    })

    const selector = container.querySelector(
      '[data-rue-tree-select-selector="true"]',
    ) as HTMLElement
    triggerClick(selector)

    await waitForContent(() => {
      expect(getNodeRow(container, 'review')).toBeTruthy()
    })

    clickLabelButton(container, 'review')

    await waitForContent(() => {
      const selectorAfterSelect = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      expect(selectorAfterSelect.textContent).toContain('Design review')
    })

    triggerClick(container.querySelector('[data-rue-tree-select-selector="true"]') as HTMLElement)

    await waitForContent(() => {
      const row = getNodeRow(container, 'review')
      const buttons = row.querySelectorAll('button')
      const labelButton = buttons[buttons.length - 1] as HTMLElement
      expect(labelButton.className).toContain('bg-primary/12')
    })
  })

  it('clears a controlled simple-mode selection with allowClear', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const selectedValue = ref('workflow')

    const Demo = () => {
      return (
        <>
          <TreeSelect
            allowClear
            value={selectedValue.value}
            treeData={[
              { nodeId: 1, parentId: 0, code: 'workspace', name: 'Workspace' },
              { nodeId: 2, parentId: 1, code: 'workflow', name: 'Workflow board' },
              { nodeId: 3, parentId: 1, code: 'briefs', name: 'Briefs' },
              { nodeId: 4, parentId: 2, code: 'review', name: 'Design review' },
            ]}
            treeDataSimpleMode={{ id: 'nodeId', pId: 'parentId', rootPId: 0 }}
            fieldNames={{ value: 'code', label: 'name', key: 'code' }}
            treeDefaultExpandAll
            onChange={nextValue => {
              selectedValue.value = nextValue == null ? '' : String(nextValue)
            }}
          />
          <div data-testid="selected-value">{String(selectedValue.value ?? '')}</div>
        </>
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      const selector = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      expect(selector.textContent).toContain('Workflow board')
      const clearButton = container.querySelector('[aria-label="清空选择"]') as HTMLButtonElement
      expect(clearButton.disabled).toBe(false)
    })

    const clearButton = container.querySelector('[aria-label="清空选择"]') as HTMLButtonElement
    triggerClick(clearButton)

    await waitForContent(() => {
      const selectorAfterClear = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      expect(selectorAfterClear.textContent).not.toContain('Workflow board')
      expect(container.querySelector('[data-testid="selected-value"]')?.textContent).toBe('')
    })
  })

  it('renders the selected label after changing a single labelInValue selection', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <TreeSelect
          labelInValue
          defaultValue="release"
          treeDefaultExpandAll
          treeData={[
            {
              title: '工程效率',
              value: 'engineering',
              children: [
                { title: '构建链路', value: 'build' },
                { title: '质量门禁', value: 'quality' },
                { title: '发布管道', value: 'release' },
              ],
            },
          ]}
          onChange={handleChange}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const selector = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      expect(selector.textContent).toContain('发布管道')
    })

    triggerClick(container.querySelector('[data-rue-tree-select-selector="true"]') as HTMLElement)

    await waitForContent(() => {
      expect(getNodeRow(container, 'build')).toBeTruthy()
    })

    clickLabelButton(container, 'build')

    await waitForContent(() => {
      const selector = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      expect(selector.textContent).toContain('构建链路')
      expect(selector.textContent).not.toContain('发布管道')
      expect(handleChange).toHaveBeenCalled()
      const lastChangeCall = handleChange.mock.calls[handleChange.mock.calls.length - 1]
      expect(lastChangeCall?.[0]).toMatchObject({
        value: 'build',
        key: 'build',
      })
    })
  })

  it('keeps labelInValue text visible when the parent renders the emitted structure', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const selectedValue = ref<any>(null)

    const Demo = () => {
      return (
        <div>
          <TreeSelect
            labelInValue
            defaultValue="release"
            treeDefaultExpandAll
            treeData={[
              {
                title: '工程效率',
                value: 'engineering',
                children: [
                  { title: '构建链路', value: 'build' },
                  { title: '质量门禁', value: 'quality' },
                  { title: '发布管道', value: 'release' },
                ],
              },
            ]}
            onChange={nextValue => {
              selectedValue.value = nextValue
            }}
          />
          <code data-testid="label-in-value-json">
            {String(JSON.stringify(selectedValue.value))}
          </code>
        </div>
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      const selector = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      expect(selector.textContent).toContain('发布管道')
    })

    triggerClick(container.querySelector('[data-rue-tree-select-selector="true"]') as HTMLElement)

    await waitForContent(() => {
      expect(getNodeRow(container, 'build')).toBeTruthy()
    })

    clickLabelButton(container, 'build')

    await waitForContent(() => {
      const selector = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      expect(selector.textContent).toContain('构建链路')
      expect(selector.textContent).not.toContain('发布管道')
      expect(container.querySelector('[data-testid="label-in-value-json"]')?.textContent).toContain(
        '"value":"build"',
      )
    })
  })

  it('keeps ancestor nodes before descendants when filtering', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <TreeSelect
          showSearch
          treeNodeFilterProp="title"
          treeData={[
            {
              title: '团队目录',
              value: 'team',
              children: [
                { title: '产品增长', value: 'growth' },
                { title: '产品平台', value: 'product-platform' },
              ],
            },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tree-select-selector="true"]')).toBeTruthy()
    })

    const selector = container.querySelector(
      '[data-rue-tree-select-selector="true"]',
    ) as HTMLElement
    triggerClick(selector)

    await waitForContent(() => {
      expect(container.querySelector('input')).toBeTruthy()
    })

    const input = container.querySelector('input') as HTMLInputElement
    input.value = '产品平台'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      const nodeKeys = Array.from(container.querySelectorAll('[data-rue-tree-select-node]')).map(
        node => node.getAttribute('data-rue-tree-select-node'),
      )
      expect(nodeKeys).toEqual(['string:team', 'string:product-platform'])
    })
  })

  it('matches both value and label when no treeNodeFilterProp is provided', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <TreeSelect
          showSearch
          treeData={[
            {
              title: '团队目录',
              value: 'team',
              children: [
                { title: '产品平台', value: 'product-platform' },
                { title: '增长分析', value: 'growth-analytics' },
              ],
            },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tree-select-selector="true"]')).toBeTruthy()
    })

    const selector = container.querySelector(
      '[data-rue-tree-select-selector="true"]',
    ) as HTMLElement
    triggerClick(selector)

    await waitForContent(() => {
      expect(container.querySelector('input')).toBeTruthy()
    })

    const input = container.querySelector('input') as HTMLInputElement
    input.value = 'product-platform'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      const nodeKeys = Array.from(container.querySelectorAll('[data-rue-tree-select-node]')).map(
        node => node.getAttribute('data-rue-tree-select-node'),
      )
      expect(nodeKeys).toEqual(['string:team', 'string:product-platform'])
    })

    input.value = '增长分析'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      const nodeKeys = Array.from(container.querySelectorAll('[data-rue-tree-select-node]')).map(
        node => node.getAttribute('data-rue-tree-select-node'),
      )
      expect(nodeKeys).toEqual(['string:team', 'string:growth-analytics'])
    })
  })

  it('keeps the search input focused while typing', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <TreeSelect
          showSearch
          treeNodeFilterProp="title"
          treeData={[
            {
              title: '团队目录',
              value: 'team',
              children: [
                { title: '产品增长', value: 'growth' },
                { title: '产品平台', value: 'product-platform' },
              ],
            },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tree-select-selector="true"]')).toBeTruthy()
    })

    const selector = container.querySelector(
      '[data-rue-tree-select-selector="true"]',
    ) as HTMLElement
    triggerClick(selector)

    await waitForContent(() => {
      expect(container.querySelector('input')).toBeTruthy()
    })

    const input = container.querySelector('input') as HTMLInputElement
    input.focus()
    input.value = '产品'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      expect(document.activeElement).toBe(input)
      expect(container.querySelector('input')).toBe(input)

      const nodeKeys = Array.from(container.querySelectorAll('[data-rue-tree-select-node]')).map(
        node => node.getAttribute('data-rue-tree-select-node'),
      )
      expect(nodeKeys).toEqual(['string:team', 'string:growth', 'string:product-platform'])
    })
  })

  it('updates closed selector text after selecting and clearing in search mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <TreeSelect
          showSearch
          allowClear
          treeDefaultExpandAll
          treeNodeFilterProp="title"
          placeholder="选择节点"
          treeData={[
            {
              title: '组织架构',
              value: 'org',
              children: [
                { title: '设计系统', value: 'design' },
                { title: '工程平台', value: 'platform' },
              ],
            },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tree-select-selector="true"]')).toBeTruthy()
    })

    const selector = container.querySelector(
      '[data-rue-tree-select-selector="true"]',
    ) as HTMLElement
    triggerClick(selector)

    await waitForContent(() => {
      expect(container.querySelector('input')).toBeTruthy()
    })

    const input = container.querySelector('input') as HTMLInputElement
    input.value = '设计'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      const nodeKeys = Array.from(container.querySelectorAll('[data-rue-tree-select-node]')).map(
        node => node.getAttribute('data-rue-tree-select-node'),
      )
      expect(nodeKeys).toEqual(['string:org', 'string:design'])
    })

    clickLabelButton(container, 'design')

    await waitForContent(() => {
      const selectorAfterSelect = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      expect(selectorAfterSelect.textContent).toContain('设计系统')
      expect(selectorAfterSelect.querySelector('input')).toBeFalsy()
    })

    const clearButton = container.querySelector('[aria-label="清空选择"]') as HTMLButtonElement
    triggerClick(clearButton)

    await waitForContent(() => {
      const selectorAfterClear = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      const popup = container.querySelector('[data-rue-tree-select-popup="true"]') as HTMLElement
      expect(selectorAfterClear.textContent).not.toContain('设计系统')
      const inputAfterClear = selectorAfterClear.querySelector('input') as HTMLInputElement | null
      expect(inputAfterClear).toBeTruthy()
      expect(inputAfterClear?.value ?? '').toBe('')
      expect(inputAfterClear?.placeholder ?? '').toBe('选择节点')
      expect(popup.hidden).toBe(true)
    })

    const inputAfterClear = container.querySelector(
      '[data-rue-tree-select-search="true"]',
    ) as HTMLInputElement
    triggerClick(inputAfterClear)

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-tree-select-popup="true"]') as HTMLElement
      expect(popup.hidden).toBe(false)
      expect(getNodeRow(container, 'design')).toBeTruthy()
      expect(getNodeRow(container, 'platform')).toBeTruthy()
    })
  })

  it('loads async nodes when expanding unloaded branches', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const treeData = ref<TreeSelectDataNode[]>([
      {
        title: '按需加载',
        value: 'async-root',
        isLeaf: false,
      },
    ])
    const handleLoadData = vi.fn(async () => {
      treeData.value = [
        {
          title: '按需加载',
          value: 'async-root',
          isLeaf: false,
          children: [{ title: '已加载子节点', value: 'loaded-child' }],
        },
      ]
    })

    const Demo = () => {
      return <TreeSelect treeData={treeData.value} loadData={handleLoadData} />
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tree-select-selector="true"]')).toBeTruthy()
    })

    const selector = container.querySelector(
      '[data-rue-tree-select-selector="true"]',
    ) as HTMLElement
    triggerClick(selector)

    await waitForContent(() => {
      expect(getNodeRow(container, 'async-root')).toBeTruthy()
    })

    clickExpandButton(container, 'async-root')

    await waitForContent(() => {
      expect(handleLoadData).toHaveBeenCalledTimes(1)
      expect(container.textContent).toContain('已加载子节点')
    })
  })

  it('keeps a loaded async branch expanded after closing and reopening when expansion is controlled', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const expandedKeys = ref<Array<string | number>>([])
    const treeData = ref<TreeSelectDataNode[]>([
      {
        title: '按需加载',
        value: 'async-root',
        isLeaf: false,
      },
    ])
    const handleLoadData = vi.fn(async () => {
      treeData.value = [
        {
          title: '按需加载',
          value: 'async-root',
          isLeaf: false,
          children: [{ title: '已加载子节点', value: 'loaded-child' }],
        },
      ]
    })

    const Demo = () => {
      return (
        <TreeSelect
          treeData={treeData.value}
          treeExpandedKeys={expandedKeys.value}
          loadData={handleLoadData}
          onTreeExpand={nextKeys => {
            expandedKeys.value = nextKeys
          }}
        />
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tree-select-selector="true"]')).toBeTruthy()
    })

    triggerClick(container.querySelector('[data-rue-tree-select-selector="true"]') as HTMLElement)

    await waitForContent(() => {
      expect(getNodeRow(container, 'async-root')).toBeTruthy()
    })

    clickExpandButton(container, 'async-root')

    await waitForContent(() => {
      expect(handleLoadData).toHaveBeenCalledTimes(1)
      expect(getNodeRow(container, 'loaded-child')).toBeTruthy()
      expect(expandedKeys.value).toEqual(['async-root'])
    })

    triggerClick(container.querySelector('[data-rue-tree-select-selector="true"]') as HTMLElement)

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-tree-select-popup="true"]') as HTMLElement
      expect(popup.hidden).toBe(true)
    })

    triggerClick(container.querySelector('[data-rue-tree-select-selector="true"]') as HTMLElement)

    await waitForContent(() => {
      const popup = container.querySelector('[data-rue-tree-select-popup="true"]') as HTMLElement
      expect(popup.hidden).toBe(false)
      expect(getNodeRow(container, 'loaded-child')).toBeTruthy()
    })
  })

  it('expands an unloaded async branch from the label without closing the popup', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const treeData = ref<TreeSelectDataNode[]>([
      {
        title: '按需加载目录',
        value: 'async-root',
        isLeaf: false,
      },
    ])
    const selectedValue = ref<string | null>(null)
    const handleLoadData = vi.fn(async () => {
      treeData.value = [
        {
          title: '按需加载目录',
          value: 'async-root',
          isLeaf: false,
          children: [
            { title: '实验看板', value: 'async-dashboard' },
            { title: '巡检报告', value: 'async-report' },
          ],
        },
      ]
    })

    const Demo = () => {
      return (
        <TreeSelect
          value={selectedValue.value}
          treeData={treeData.value}
          loadData={handleLoadData}
          onChange={nextValue => {
            selectedValue.value = nextValue == null ? null : String(nextValue)
          }}
        />
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tree-select-selector="true"]')).toBeTruthy()
    })

    triggerClick(container.querySelector('[data-rue-tree-select-selector="true"]') as HTMLElement)

    await waitForContent(() => {
      expect(getNodeRow(container, 'async-root')).toBeTruthy()
    })

    clickLabelButton(container, 'async-root')

    await waitForContent(() => {
      const selector = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      const popup = container.querySelector('[data-rue-tree-select-popup="true"]') as HTMLElement
      expect(handleLoadData).toHaveBeenCalledTimes(1)
      expect(popup.hidden).toBe(false)
      expect(getNodeRow(container, 'async-dashboard')).toBeTruthy()
      expect(selectedValue.value).toBeNull()
      expect(selector.textContent).not.toContain('按需加载目录')
    })
  })

  it('hides the async switcher for loaded leaf nodes', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const treeData = ref<TreeSelectDataNode[]>([
      {
        title: '按需加载目录',
        value: 'async-root',
        isLeaf: false,
      },
    ])

    const Demo = () => {
      return (
        <TreeSelect
          treeData={treeData.value}
          loadData={async () => {
            treeData.value = [
              {
                title: '按需加载目录',
                value: 'async-root',
                isLeaf: false,
                children: [{ title: '实验看板', value: 'async-dashboard' }],
              },
            ]
          }}
        />
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tree-select-selector="true"]')).toBeTruthy()
    })

    triggerClick(container.querySelector('[data-rue-tree-select-selector="true"]') as HTMLElement)

    await waitForContent(() => {
      expect(getNodeRow(container, 'async-root')).toBeTruthy()
    })

    clickExpandButton(container, 'async-root')

    await waitForContent(() => {
      const leafButtons = getNodeRow(container, 'async-dashboard').querySelectorAll('button')
      const switcherButton = leafButtons[0] as HTMLButtonElement
      const switcherIcon = switcherButton.querySelector('span') as HTMLElement
      expect(switcherButton.disabled).toBe(true)
      expect(switcherIcon.className).toContain('opacity-0')
    })
  })

  it('loads async nodes when expanding unloaded branches with async scheduling', async () => {
    setReactiveScheduling('microtask')

    try {
      const container = mountContainer()
      resetActiveRuntime()
      const treeData = ref<TreeSelectDataNode[]>([
        {
          title: '按需加载',
          value: 'async-root',
          isLeaf: false,
        },
      ])
      const handleLoadData = vi.fn(async () => {
        treeData.value = [
          {
            title: '按需加载',
            value: 'async-root',
            isLeaf: false,
            children: [{ title: '已加载子节点', value: 'loaded-child' }],
          },
        ]
      })

      const Demo = () => {
        return <TreeSelect treeData={treeData.value} loadData={handleLoadData} />
      }

      mountTestApp(container, () => render(<Demo />, container))

      await waitForContent(() => {
        expect(container.querySelector('[data-rue-tree-select-selector="true"]')).toBeTruthy()
      })

      const selector = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      triggerClick(selector)

      await waitForContent(() => {
        expect(getNodeRow(container, 'async-root')).toBeTruthy()
      })

      clickExpandButton(container, 'async-root')

      await waitForContent(() => {
        expect(handleLoadData).toHaveBeenCalledTimes(1)
        expect(container.textContent).toContain('已加载子节点')
      })
    } finally {
      setReactiveScheduling('sync')
    }
  })

  it('supports selecting an asynchronously loaded child node', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const treeData = ref<TreeSelectDataNode[]>([
      {
        title: '按需加载',
        value: 'async-root',
        isLeaf: false,
      },
    ])

    const Demo = () => {
      return (
        <TreeSelect
          treeData={treeData.value}
          loadData={async () => {
            treeData.value = [
              {
                title: '按需加载',
                value: 'async-root',
                isLeaf: false,
                children: [{ title: '已加载子节点', value: 'loaded-child' }],
              },
            ]
          }}
        />
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tree-select-selector="true"]')).toBeTruthy()
    })

    const selector = container.querySelector(
      '[data-rue-tree-select-selector="true"]',
    ) as HTMLElement
    triggerClick(selector)

    await waitForContent(() => {
      expect(getNodeRow(container, 'async-root')).toBeTruthy()
    })

    clickExpandButton(container, 'async-root')

    await waitForContent(() => {
      expect(getNodeRow(container, 'loaded-child')).toBeTruthy()
    })

    clickLabelButton(container, 'loaded-child')

    await waitForContent(() => {
      const selectorAfterSelect = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      expect(selectorAfterSelect.textContent).toContain('已加载子节点')
    })
  })

  it('updates the selector text after selecting an asynchronously loaded child in controlled mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const treeData = ref<TreeSelectDataNode[]>([
      {
        title: '按需加载',
        value: 'async-root',
        isLeaf: false,
      },
    ])
    const selectedValue = ref<string | null>(null)

    const Demo = () => {
      return (
        <>
          <TreeSelect
            value={selectedValue.value}
            treeData={treeData.value}
            loadData={async () => {
              treeData.value = [
                {
                  title: '按需加载',
                  value: 'async-root',
                  isLeaf: false,
                  children: [{ title: '已加载子节点', value: 'loaded-child' }],
                },
              ]
            }}
            onChange={nextValue => {
              selectedValue.value = nextValue == null ? null : String(nextValue)
            }}
          />
          <div data-testid="selected-value">{String(selectedValue.value ?? '')}</div>
        </>
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tree-select-selector="true"]')).toBeTruthy()
    })

    const selector = container.querySelector(
      '[data-rue-tree-select-selector="true"]',
    ) as HTMLElement
    triggerClick(selector)

    await waitForContent(() => {
      expect(getNodeRow(container, 'async-root')).toBeTruthy()
    })

    clickExpandButton(container, 'async-root')

    await waitForContent(() => {
      expect(getNodeRow(container, 'loaded-child')).toBeTruthy()
    })

    clickLabelButton(container, 'loaded-child')

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="selected-value"]')?.textContent).toBe(
        'loaded-child',
      )

      const selectorAfterSelect = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      expect(selectorAfterSelect.textContent).toContain('已加载子节点')
    })
  })

  it('clears an asynchronously loaded child selection in controlled mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const treeData = ref<TreeSelectDataNode[]>([
      {
        title: '按需加载',
        value: 'async-root',
        isLeaf: false,
      },
    ])
    const selectedValue = ref<string | null>(null)

    const Demo = () => {
      return (
        <>
          <TreeSelect
            value={selectedValue.value}
            treeData={treeData.value}
            allowClear
            loadData={async () => {
              treeData.value = [
                {
                  title: '按需加载',
                  value: 'async-root',
                  isLeaf: false,
                  children: [{ title: '已加载子节点', value: 'loaded-child' }],
                },
              ]
            }}
            onChange={nextValue => {
              selectedValue.value = nextValue == null ? null : String(nextValue)
            }}
          />
          <div data-testid="selected-value">{String(selectedValue.value ?? '')}</div>
        </>
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tree-select-selector="true"]')).toBeTruthy()
    })

    const selector = container.querySelector(
      '[data-rue-tree-select-selector="true"]',
    ) as HTMLElement
    triggerClick(selector)

    await waitForContent(() => {
      expect(getNodeRow(container, 'async-root')).toBeTruthy()
    })

    clickExpandButton(container, 'async-root')

    await waitForContent(() => {
      expect(getNodeRow(container, 'loaded-child')).toBeTruthy()
    })

    clickLabelButton(container, 'loaded-child')

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="selected-value"]')?.textContent).toBe(
        'loaded-child',
      )
      const selectorAfterSelect = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      expect(selectorAfterSelect.textContent).toContain('已加载子节点')
    })

    const clearButton = container.querySelector('[aria-label="清空选择"]') as HTMLButtonElement
    triggerClick(clearButton)

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="selected-value"]')?.textContent).toBe('')
      const selectorAfterClear = container.querySelector(
        '[data-rue-tree-select-selector="true"]',
      ) as HTMLElement
      expect(selectorAfterClear.textContent).not.toContain('已加载子节点')
    })
  })
})
