import { mountTestApp, disposeTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { effect, ref, render, setReactiveScheduling } from '@rue-js/rue'
import Tree from '../index'
import {
  mountContainer as baseMountContainer,
  waitForContent,
} from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const mountedContainers: HTMLElement[] = []

const mountContainer = () => {
  const container = baseMountContainer()
  mountedContainers.push(container)
  return container
}

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

const triggerMouseEvent = (
  element: Element | null,
  type: 'click' | 'dblclick' | 'contextmenu' | 'mousedown' | 'mousemove' | 'mouseup',
  options: MouseEventInit = {},
) => {
  ;(element as HTMLElement | null)?.dispatchEvent(
    new MouseEvent(type, { bubbles: true, cancelable: true, ...options }),
  )
}

const triggerDragEvent = (element: Element | null, type: string, clientY = 20) => {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clientY', { value: clientY })
  Object.defineProperty(event, 'dataTransfer', {
    value: {
      effectAllowed: '',
      dropEffect: '',
      setData: vi.fn(),
    },
  })
  ;(element as HTMLElement | null)?.dispatchEvent(event)
}

const getNode = (container: HTMLElement, key: string) => {
  return container.querySelector(`[data-rue-tree-node="string:${key}"]`) as HTMLElement
}

const getNodeKeys = (container: HTMLElement) => {
  return Array.from(container.querySelectorAll('[data-rue-tree-node]')).map(node =>
    node.getAttribute('data-rue-tree-node')?.replace(/^string:/, ''),
  )
}

const getSelectedNodeKeys = (container: HTMLElement) => {
  return Array.from(container.querySelectorAll('[data-rue-tree-node]')).flatMap(node => {
    if (!node.querySelector('button.selected')) return []
    return node.getAttribute('data-rue-tree-node')?.replace(/^string:/, '') ?? []
  })
}

const expectNodeKeys = (container: HTMLElement, keys: string[]) => {
  const actualKeys = getNodeKeys(container)
  expect(actualKeys).toEqual(keys)
  expect(new Set(actualKeys).size).toBe(actualKeys.length)
}

const clickExpandButton = (container: HTMLElement, key: string) => {
  const row = getNode(container, key)
  const button = row.querySelector('button')
  triggerMouseEvent(button, 'click')
}

const clickCheckboxButton = (container: HTMLElement, key: string) => {
  const row = getNode(container, key)
  const buttons = row.querySelectorAll('button')
  triggerMouseEvent(buttons[1], 'click')
}

const clickLabelButton = (container: HTMLElement, key: string, options: MouseEventInit = {}) => {
  const row = getNode(container, key)
  const buttons = row.querySelectorAll('button')
  triggerMouseEvent(buttons[buttons.length - 1], 'click', options)
}

const getLabelButton = (container: HTMLElement, key: string) => {
  const row = getNode(container, key)
  const buttons = row.querySelectorAll('button')
  return buttons[buttons.length - 1] as HTMLButtonElement
}

const modifiedLabelClick = async (
  container: HTMLElement,
  key: string,
  options: MouseEventInit = {},
) => {
  const labelButton = getLabelButton(container, key)
  triggerMouseEvent(labelButton, 'mousedown', options)
  triggerMouseEvent(labelButton, 'mouseup', options)
  await new Promise(resolve => setTimeout(resolve, 0))
  triggerMouseEvent(labelButton, 'click')
}

afterEach(() => {
  for (const container of mountedContainers.splice(0)) {
    disposeTestApp(container)
  }
  document.body.innerHTML = ''
})

describe('Tree', () => {
  it('supports expand and single selection', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleSelect = vi.fn()

    mountTestApp(container, () =>
      render(
        <Tree
          onSelect={handleSelect}
          treeData={[
            {
              title: '团队目录',
              key: 'team',
              children: [
                { title: '设计系统', key: 'design' },
                { title: '工程平台', key: 'platform' },
              ],
            },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(getNode(container, 'team')).toBeTruthy()
      expect(getNode(container, 'design')).toBeFalsy()
    })

    clickExpandButton(container, 'team')

    await waitForContent(() => {
      expect(getNode(container, 'design')).toBeTruthy()
    })

    clickLabelButton(container, 'design')

    await waitForContent(() => {
      expect(handleSelect).toHaveBeenCalled()
      expect(handleSelect.mock.calls[handleSelect.mock.calls.length - 1]?.[0]).toEqual(['design'])
      expect(getNode(container, 'design').textContent).toContain('选中')
    })
  })

  it('applies stable default layout classes', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Tree
          allowSearch
          checkable
          showIcon
          blockNode
          defaultExpandAll
          selectedKeys={['design']}
          checkedKeys={['design']}
          treeData={[
            {
              title: '团队目录',
              key: 'team',
              children: [{ title: '设计系统', key: 'design' }],
            },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(getNode(container, 'design')).toBeTruthy()
    })

    const root = container.querySelector('[data-rue-tree="true"]') as HTMLElement
    const searchInput = container.querySelector('input') as HTMLInputElement
    const body = container.querySelector('[data-rue-tree-body="true"]') as HTMLElement
    const row = getNode(container, 'design')
    const buttons = row.querySelectorAll('button')
    const switcherButton = buttons[0] as HTMLButtonElement
    const checkboxButton = buttons[1] as HTMLButtonElement
    const labelButton = buttons[2] as HTMLButtonElement

    expect(root.className).toContain('rounded-box')
    expect(searchInput.className).toContain('input-bordered')
    expect(body.className).toContain('grid')
    expect(row.className).toContain('flex')
    expect(row.className).toContain('relative')
    expect(switcherButton.className).toContain('size-6')
    expect(checkboxButton.className).toContain('bg-primary')
    expect(labelButton.className).toContain('flex-1')
    expect(labelButton.className).toContain('bg-primary/12')
    expect(labelButton.textContent).toContain('选中')
  })

  it('keeps unaffected sibling rows ordered when toggling one branch', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Tree
          defaultExpandAll
          treeData={[
            {
              title: '产品平台',
              key: 'platform',
              children: [{ title: '文档中心', key: 'docs' }],
            },
            {
              title: '工程效率',
              key: 'engineering',
              children: [{ title: '构建链路', key: 'pipeline' }],
            },
            {
              title: '增长分析',
              key: 'growth',
              children: [{ title: '实验看板', key: 'board' }],
            },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(getNode(container, 'platform')).toBeTruthy()
      expect(getNode(container, 'engineering')).toBeTruthy()
      expect(getNode(container, 'growth')).toBeTruthy()
      expect(getNode(container, 'docs')).toBeTruthy()
    })

    clickExpandButton(container, 'platform')

    await waitForContent(() => {
      expect(getNode(container, 'docs')).toBeFalsy()
      expectNodeKeys(container, ['platform', 'engineering', 'pipeline', 'growth', 'board'])
    })

    clickExpandButton(container, 'platform')

    await waitForContent(() => {
      expect(getNode(container, 'docs')).toBeTruthy()
      expectNodeKeys(container, ['platform', 'docs', 'engineering', 'pipeline', 'growth', 'board'])
    })
  })

  it('does not leave duplicate rows after repeated expand and select updates', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Tree
          defaultExpandAll
          treeData={[
            {
              title: '产品平台',
              key: 'platform',
              children: [{ title: '文档中心', key: 'docs' }],
            },
            {
              title: '工程效率',
              key: 'engineering',
              children: [{ title: '构建链路', key: 'pipeline' }],
            },
            {
              title: '增长分析',
              key: 'growth',
              children: [{ title: '实验看板', key: 'board' }],
            },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expectNodeKeys(container, ['platform', 'docs', 'engineering', 'pipeline', 'growth', 'board'])
    })

    clickExpandButton(container, 'platform')

    await waitForContent(() => {
      expectNodeKeys(container, ['platform', 'engineering', 'pipeline', 'growth', 'board'])
    })

    clickLabelButton(container, 'pipeline')

    await waitForContent(() => {
      expect(getNode(container, 'pipeline').textContent).toContain('选中')
      expectNodeKeys(container, ['platform', 'engineering', 'pipeline', 'growth', 'board'])
    })

    clickExpandButton(container, 'engineering')

    await waitForContent(() => {
      expectNodeKeys(container, ['platform', 'engineering', 'growth', 'board'])
    })

    clickExpandButton(container, 'platform')
    clickExpandButton(container, 'engineering')

    await waitForContent(() => {
      expect(getNode(container, 'docs')).toBeTruthy()
      expect(getNode(container, 'pipeline')).toBeTruthy()
    })

    clickLabelButton(container, 'docs')

    await waitForContent(() => {
      expect(getNode(container, 'docs').textContent).toContain('选中')
      expectNodeKeys(container, ['platform', 'docs', 'engineering', 'pipeline', 'growth', 'board'])
    })
  })

  it('supports checkable hierarchy in non-strict mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleCheck = vi.fn()

    mountTestApp(container, () =>
      render(
        <Tree
          checkable
          onCheck={handleCheck}
          defaultExpandAll
          treeData={[
            {
              title: '平台团队',
              key: 'team',
              children: [
                { title: '构建链路', key: 'build' },
                { title: '发布平台', key: 'release' },
              ],
            },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(getNode(container, 'team')).toBeTruthy()
      expect(getNode(container, 'build')).toBeTruthy()
    })

    clickCheckboxButton(container, 'team')

    await waitForContent(() => {
      expect(handleCheck).toHaveBeenCalled()
      expect(handleCheck.mock.calls[handleCheck.mock.calls.length - 1]?.[0]).toEqual([
        'team',
        'build',
        'release',
      ])
    })
  })

  it('updates controlled selected and checked visuals after parent state changes', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const selectedKeys = ref<string[]>([])
    const checkedKeys = ref<string[]>([])

    const Demo = () => {
      return (
        <Tree
          treeData={[
            {
              title: '平台团队',
              key: 'team',
              children: [
                { title: '构建链路', key: 'build' },
                { title: '发布平台', key: 'release' },
              ],
            },
          ]}
          selectedKeys={selectedKeys.value}
          checkedKeys={checkedKeys.value}
          checkable
          defaultExpandAll
          blockNode
          onSelect={nextKeys => {
            selectedKeys.value = nextKeys as string[]
          }}
          onCheck={nextKeys => {
            checkedKeys.value = Array.isArray(nextKeys)
              ? nextKeys.map(String)
              : nextKeys.checked.map(String)
          }}
        />
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      expect(getNode(container, 'team')).toBeTruthy()
      expect(getNode(container, 'build')).toBeTruthy()
    })

    clickLabelButton(container, 'build')

    await waitForContent(() => {
      expect(getNode(container, 'build').textContent).toContain('选中')
    })

    clickCheckboxButton(container, 'team')

    await waitForContent(() => {
      expect(checkedKeys.value).toEqual(['team', 'build', 'release'])
      const row = getNode(container, 'team')
      const checkbox = row.querySelectorAll('button')[1]
      expect(checkbox.getAttribute('aria-checked')).toBe('true')
    })
  })

  it('preserves ancestors when filtering', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Tree
          allowSearch
          defaultExpandAll
          treeData={[
            {
              title: '团队目录',
              key: 'team',
              children: [
                { title: '产品增长', key: 'growth' },
                { title: '产品平台', key: 'product-platform' },
              ],
            },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('input')).toBeTruthy()
    })

    const input = container.querySelector('input') as HTMLInputElement
    input.value = '产品平台'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      const nodeKeys = Array.from(container.querySelectorAll('[data-rue-tree-node]')).map(node =>
        node.getAttribute('data-rue-tree-node'),
      )
      expect(nodeKeys).toEqual(['string:team', 'string:product-platform'])
    })
  })

  it('loads async nodes when expanding unloaded branch', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const treeData = ref<Array<Record<string, any>>>([
      { title: '按需加载', key: 'async-root', isLeaf: false },
    ])
    const handleLoadData = vi.fn(async () => {
      treeData.value = [
        {
          title: '按需加载',
          key: 'async-root',
          isLeaf: false,
          children: [{ title: '已加载子节点', key: 'loaded-child' }],
        },
      ]
    })

    const Demo = () => {
      return <Tree treeData={treeData.value} loadData={handleLoadData} />
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      expect(getNode(container, 'async-root')).toBeTruthy()
    })

    clickExpandButton(container, 'async-root')

    await waitForContent(() => {
      expect(handleLoadData).toHaveBeenCalledTimes(1)
      expect(container.textContent).toContain('已加载子节点')
    })
  })

  it('loads virtual async branches without keeping stale loading state', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const treeData = ref<Array<Record<string, any>>>(
      Array.from({ length: 64 }, (_, index) => ({
        title: `Resource ${index}`,
        key: `resource-${index}`,
        isLeaf: false,
      })),
    )
    const expandedKeys = ref<string[]>([])
    let resolveLoad: (() => void) | undefined
    const handleLoadData = vi.fn(
      node =>
        new Promise<void>(resolve => {
          resolveLoad = () => {
            treeData.value = treeData.value.map(item =>
              item.key === node.key
                ? {
                    ...item,
                    children: [{ title: `${item.title} child`, key: `${item.key}-child` }],
                  }
                : item,
            )
            resolve()
          }
        }),
    )

    const Demo = () => {
      return (
        <Tree
          treeData={treeData.value}
          expandedKeys={expandedKeys.value}
          height={96}
          itemHeight={24}
          virtual
          loadData={handleLoadData}
          titleFormatter={({ node, loading }) => `${node.title}${loading ? ' loading' : ''}`}
          onExpand={nextKeys => {
            expandedKeys.value = nextKeys as string[]
          }}
        />
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      expect(getNode(container, 'resource-0')).toBeTruthy()
      expect(getNode(container, 'resource-20')).toBeFalsy()
    })

    clickExpandButton(container, 'resource-0')

    await waitForContent(() => {
      expect(handleLoadData).toHaveBeenCalledTimes(1)
      expect(getNode(container, 'resource-0').textContent).toContain('loading')
    })

    resolveLoad?.()

    await waitForContent(() => {
      expect(getNode(container, 'resource-0-child')).toBeTruthy()
      expect(getNode(container, 'resource-0').textContent).not.toContain('loading')
      expect(getNode(container, 'resource-20')).toBeFalsy()
    })
  })

  it('keeps normalized data cached when controlled expansion changes', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    let titleReadCount = 0
    const createTrackedNode = (
      key: string,
      title: string,
      extra: Record<string, any> = {},
    ): Record<string, any> => {
      const node: Record<string, any> = { key, ...extra }

      Object.defineProperty(node, 'title', {
        enumerable: false,
        get() {
          titleReadCount += 1
          return title
        },
      })

      return node
    }
    const treeData = Array.from({ length: 64 }, (_, index) =>
      index === 0
        ? createTrackedNode('resource-0', 'Resource 0', {
            children: [createTrackedNode('resource-0-child', 'Resource 0 child')],
          })
        : createTrackedNode(`resource-${index}`, `Resource ${index}`),
    )
    const expandedKeys = ref<string[]>([])

    const Demo = () => {
      return (
        <Tree
          treeData={treeData}
          expandedKeys={expandedKeys.value}
          height={96}
          itemHeight={24}
          virtual
          onExpand={nextKeys => {
            expandedKeys.value = nextKeys as string[]
          }}
        />
      )
    }

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      expect(getNode(container, 'resource-0')).toBeTruthy()
      expect(getNode(container, 'resource-0-child')).toBeFalsy()
    })

    const readsAfterInitialRender = titleReadCount

    clickExpandButton(container, 'resource-0')

    await waitForContent(() => {
      expect(getNode(container, 'resource-0-child')).toBeTruthy()
    })
    await Promise.resolve()

    expect(titleReadCount).toBe(readsAfterInitialRender)
  })

  it('supports directory tree click expansion and meta multi select', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleSelect = vi.fn()

    mountTestApp(container, () =>
      render(
        <Tree.DirectoryTree
          multiple
          onSelect={handleSelect}
          treeData={[
            {
              title: 'src',
              key: 'src',
              children: [{ title: 'index.ts', key: 'index-ts' }],
            },
            { title: 'README.md', key: 'readme' },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(getNode(container, 'src')).toBeTruthy()
      expect(getNode(container, 'index-ts')).toBeFalsy()
    })

    clickLabelButton(container, 'src')

    await waitForContent(() => {
      expect(getNode(container, 'index-ts')).toBeTruthy()
      expect(handleSelect.mock.calls[handleSelect.mock.calls.length - 1]?.[0]).toEqual(['src'])
    })

    clickLabelButton(container, 'readme', { metaKey: true })

    await waitForContent(() => {
      expect(handleSelect.mock.calls[handleSelect.mock.calls.length - 1]?.[0]).toEqual([
        'src',
        'readme',
      ])
    })
  })

  it('keeps directory parent expanded when selecting a child item', async () => {
    const container = mountContainer()
    const selectedKeys = ref<string[]>(['dir-app'])
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Tree.DirectoryTree
          multiple
          selectedKeys={selectedKeys.value}
          onSelect={nextKeys => {
            selectedKeys.value = nextKeys as string[]
          }}
          treeData={[
            {
              title: 'app',
              key: 'dir-app',
              children: [
                {
                  title: 'pages',
                  key: 'dir-pages',
                  children: [
                    { title: 'Tree.tsx', key: 'file-tree-page' },
                    { title: 'Transfer.tsx', key: 'file-transfer-page' },
                  ],
                },
                {
                  title: 'site',
                  key: 'dir-site',
                  children: [{ title: 'SidebarPlaygroundDesign.tsx', key: 'file-sidebar' }],
                },
              ],
            },
            {
              title: 'packages',
              key: 'dir-packages',
              children: [
                { title: 'runtime', key: 'dir-runtime' },
                { title: 'rue-design', key: 'dir-rue-design' },
              ],
            },
            { title: 'README.md', key: 'file-readme' },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expectNodeKeys(container, ['dir-app', 'dir-packages', 'file-readme'])
    })

    clickLabelButton(container, 'dir-app')

    await waitForContent(() => {
      expectNodeKeys(container, ['dir-app', 'dir-pages', 'dir-site', 'dir-packages', 'file-readme'])
    })

    clickLabelButton(container, 'dir-pages')

    await waitForContent(() => {
      expectNodeKeys(container, [
        'dir-app',
        'dir-pages',
        'file-tree-page',
        'file-transfer-page',
        'dir-site',
        'dir-packages',
        'file-readme',
      ])
      expect(getNode(container, 'dir-pages').textContent).toContain('选中')
    })

    clickLabelButton(container, 'file-tree-page')

    await waitForContent(() => {
      expectNodeKeys(container, [
        'dir-app',
        'dir-pages',
        'file-tree-page',
        'file-transfer-page',
        'dir-site',
        'dir-packages',
        'file-readme',
      ])
      expect(getNode(container, 'file-tree-page').textContent).toContain('选中')
    })
  })

  it('batches directory label click expansion and selection relative to separate updates', async () => {
    const treeData = [
      {
        title: 'src',
        key: 'src',
        children: [{ title: 'index.ts', key: 'index-ts' }],
      },
      { title: 'README.md', key: 'readme' },
    ]

    const mountControlledDirectoryTree = async (props: Record<string, unknown> = {}) => {
      const container = mountContainer()
      const selectedKeys = ref<string[]>([])
      const expandedKeys = ref<string[]>([])
      const stateSpy = vi.fn()
      const stateEffect = effect(() => {
        stateSpy({
          selectedKeys: [...selectedKeys.value],
          expandedKeys: [...expandedKeys.value],
        })
      })

      resetActiveRuntime()

      mountTestApp(container, () =>
        render(
          <Tree.DirectoryTree
            treeData={treeData}
            selectedKeys={selectedKeys.value}
            expandedKeys={expandedKeys.value}
            onSelect={nextKeys => {
              selectedKeys.value = nextKeys as string[]
            }}
            onExpand={nextKeys => {
              expandedKeys.value = nextKeys as string[]
            }}
            {...props}
          />,
          container,
        ),
      )

      await waitForContent(() => {
        expect(getNode(container, 'src')).toBeTruthy()
        expect(getNode(container, 'index-ts')).toBeFalsy()
      })

      stateSpy.mockClear()

      return {
        container,
        stateSpy,
        dispose: () => stateEffect.dispose(),
      }
    }

    const combined = await mountControlledDirectoryTree()

    clickLabelButton(combined.container, 'src')

    await waitForContent(() => {
      expect(getNode(combined.container, 'index-ts')).toBeTruthy()
      expect(getNode(combined.container, 'src').textContent).toContain('选中')
      expect(combined.stateSpy).toHaveBeenCalledTimes(1)
      expect(combined.stateSpy).toHaveBeenLastCalledWith({
        selectedKeys: ['src'],
        expandedKeys: ['src'],
      })
    })

    combined.dispose()
    disposeTestApp(combined.container)

    const separate = await mountControlledDirectoryTree({ expandAction: false })

    clickExpandButton(separate.container, 'src')

    await waitForContent(() => {
      expect(getNode(separate.container, 'index-ts')).toBeTruthy()
      expect(separate.stateSpy).toHaveBeenCalledTimes(1)
      expect(separate.stateSpy).toHaveBeenLastCalledWith({
        selectedKeys: [],
        expandedKeys: ['src'],
      })
    })

    clickLabelButton(separate.container, 'src')

    await waitForContent(() => {
      expect(getNode(separate.container, 'src').textContent).toContain('选中')
      expect(separate.stateSpy).toHaveBeenCalledTimes(2)
      expect(separate.stateSpy).toHaveBeenLastCalledWith({
        selectedKeys: ['src'],
        expandedKeys: ['src'],
      })
    })

    separate.dispose()
  })

  it('supports directory tree range replace and disables toggle shortcut when requested', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleSelect = vi.fn()

    mountTestApp(container, () =>
      render(
        <Tree.DirectoryTree
          multiple
          toggleSelect={false}
          rangeSelect="replace"
          onSelect={handleSelect}
          treeData={[
            {
              title: 'src',
              key: 'src',
              children: [{ title: 'index.ts', key: 'index-ts' }],
            },
            { title: 'README.md', key: 'readme' },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(getNode(container, 'src')).toBeTruthy()
    })

    clickLabelButton(container, 'src')

    await waitForContent(() => {
      expect(getNode(container, 'index-ts')).toBeTruthy()
      expect(handleSelect.mock.calls[handleSelect.mock.calls.length - 1]?.[0]).toEqual(['src'])
    })

    clickLabelButton(container, 'readme', { metaKey: true })

    await waitForContent(() => {
      expect(handleSelect.mock.calls[handleSelect.mock.calls.length - 1]?.[0]).toEqual(['readme'])
    })

    clickLabelButton(container, 'index-ts', { shiftKey: true })

    await waitForContent(() => {
      expect(handleSelect.mock.calls[handleSelect.mock.calls.length - 1]?.[0]).toEqual([
        'index-ts',
        'readme',
      ])
    })
  })

  it('keeps prior non-contiguous selections only in append range mode', async () => {
    const appendContainer = mountContainer()
    const replaceContainer = mountContainer()
    resetActiveRuntime()
    const appendSelectedKeys = ref<string[]>([])
    const replaceSelectedKeys = ref<string[]>([])
    const appendSelect = vi.fn()
    const replaceSelect = vi.fn()
    const rangeTreeData = [
      { title: 'alpha.ts', key: 'range-alpha' },
      { title: 'beta.ts', key: 'range-beta' },
      { title: 'gamma.ts', key: 'range-gamma' },
      { title: 'delta.ts', key: 'range-delta' },
      { title: 'epsilon.ts', key: 'range-epsilon' },
    ]
    const AppendDemo = () => (
      <Tree.DirectoryTree
        multiple
        toggleSelect
        rangeSelect="append"
        selectedKeys={appendSelectedKeys.value}
        onSelect={nextKeys => {
          appendSelectedKeys.value = nextKeys as string[]
          appendSelect(nextKeys)
        }}
        treeData={rangeTreeData}
      />
    )
    const ReplaceDemo = () => (
      <Tree.DirectoryTree
        multiple
        toggleSelect
        rangeSelect="replace"
        selectedKeys={replaceSelectedKeys.value}
        onSelect={nextKeys => {
          replaceSelectedKeys.value = nextKeys as string[]
          replaceSelect(nextKeys)
        }}
        treeData={rangeTreeData}
      />
    )

    mountTestApp(appendContainer, () => render(<AppendDemo />, appendContainer))
    mountTestApp(replaceContainer, () => render(<ReplaceDemo />, replaceContainer))

    await waitForContent(() => {
      expect(getNode(appendContainer, 'range-beta')).toBeTruthy()
      expect(getNode(replaceContainer, 'range-beta')).toBeTruthy()
    })

    clickLabelButton(appendContainer, 'range-beta')
    await modifiedLabelClick(appendContainer, 'range-epsilon', { metaKey: true })
    await modifiedLabelClick(appendContainer, 'range-delta', { shiftKey: true })

    clickLabelButton(replaceContainer, 'range-beta')
    await modifiedLabelClick(replaceContainer, 'range-epsilon', { metaKey: true })
    await modifiedLabelClick(replaceContainer, 'range-delta', { shiftKey: true })

    await waitForContent(() => {
      expect(appendSelect.mock.calls[appendSelect.mock.calls.length - 1]?.[0]).toEqual([
        'range-beta',
        'range-epsilon',
        'range-delta',
      ])
      expect(replaceSelect.mock.calls[replaceSelect.mock.calls.length - 1]?.[0]).toEqual([
        'range-delta',
        'range-epsilon',
      ])
      expect(appendSelectedKeys.value).toEqual(['range-beta', 'range-epsilon', 'range-delta'])
      expect(replaceSelectedKeys.value).toEqual(['range-delta', 'range-epsilon'])
      expect(getSelectedNodeKeys(appendContainer)).toEqual([
        'range-beta',
        'range-delta',
        'range-epsilon',
      ])
      expect(getSelectedNodeKeys(replaceContainer)).toEqual(['range-delta', 'range-epsilon'])
      expect(getNode(appendContainer, 'range-beta').textContent).toContain('选中')
      expect(getNode(replaceContainer, 'range-beta').textContent).not.toContain('选中')
    })
  })

  it('supports shift range selection in multiple Tree mode', async () => {
    const appendContainer = mountContainer()
    const replaceContainer = mountContainer()
    resetActiveRuntime()
    const appendSelectedKeys = ref<string[]>([])
    const replaceSelectedKeys = ref<string[]>([])
    const rangeTreeData = [
      { title: 'alpha.ts', key: 'range-alpha' },
      { title: 'beta.ts', key: 'range-beta' },
      { title: 'gamma.ts', key: 'range-gamma' },
      { title: 'delta.ts', key: 'range-delta' },
      { title: 'epsilon.ts', key: 'range-epsilon' },
    ]
    const AppendDemo = () => (
      <Tree
        multiple
        rangeSelect="append"
        selectedKeys={appendSelectedKeys.value}
        onSelect={nextKeys => {
          appendSelectedKeys.value = nextKeys as string[]
        }}
        treeData={rangeTreeData}
      />
    )
    const ReplaceDemo = () => (
      <Tree
        multiple
        rangeSelect="replace"
        selectedKeys={replaceSelectedKeys.value}
        onSelect={nextKeys => {
          replaceSelectedKeys.value = nextKeys as string[]
        }}
        treeData={rangeTreeData}
      />
    )

    mountTestApp(appendContainer, () => render(<AppendDemo />, appendContainer))
    mountTestApp(replaceContainer, () => render(<ReplaceDemo />, replaceContainer))

    await waitForContent(() => {
      expect(getNode(appendContainer, 'range-beta')).toBeTruthy()
      expect(getNode(replaceContainer, 'range-beta')).toBeTruthy()
    })

    clickLabelButton(appendContainer, 'range-beta')
    clickLabelButton(appendContainer, 'range-epsilon')
    await modifiedLabelClick(appendContainer, 'range-delta', { shiftKey: true })

    clickLabelButton(replaceContainer, 'range-beta')
    clickLabelButton(replaceContainer, 'range-epsilon')
    await modifiedLabelClick(replaceContainer, 'range-delta', { shiftKey: true })

    await waitForContent(() => {
      expect(appendSelectedKeys.value).toEqual(['range-beta', 'range-epsilon', 'range-delta'])
      expect(replaceSelectedKeys.value).toEqual(['range-delta', 'range-epsilon'])
      expect(getSelectedNodeKeys(appendContainer)).toEqual([
        'range-beta',
        'range-delta',
        'range-epsilon',
      ])
      expect(getSelectedNodeKeys(replaceContainer)).toEqual(['range-delta', 'range-epsilon'])
    })
  })

  it('selects the continuous range between anchor and shift target', async () => {
    const treeContainer = mountContainer()
    const directoryContainer = mountContainer()
    resetActiveRuntime()
    const treeSelectedKeys = ref<string[]>([])
    const directorySelectedKeys = ref<string[]>([])
    const rangeTreeData = Array.from({ length: 5 }, (_, index) => ({
      title: `Item ${index + 1}`,
      key: `item-${index + 1}`,
    }))
    const expectedRange = ['item-1', 'item-2', 'item-3', 'item-4', 'item-5']

    const TreeDemo = () => (
      <Tree
        multiple
        selectedKeys={treeSelectedKeys.value}
        onSelect={nextKeys => {
          treeSelectedKeys.value = nextKeys as string[]
        }}
        treeData={rangeTreeData}
      />
    )
    const DirectoryDemo = () => (
      <Tree.DirectoryTree
        multiple
        selectedKeys={directorySelectedKeys.value}
        onSelect={nextKeys => {
          directorySelectedKeys.value = nextKeys as string[]
        }}
        treeData={rangeTreeData}
      />
    )

    mountTestApp(treeContainer, () => render(<TreeDemo />, treeContainer))
    mountTestApp(directoryContainer, () => render(<DirectoryDemo />, directoryContainer))

    await waitForContent(() => {
      expect(getNode(treeContainer, 'item-1')).toBeTruthy()
      expect(getNode(directoryContainer, 'item-1')).toBeTruthy()
    })

    clickLabelButton(treeContainer, 'item-1')
    await modifiedLabelClick(treeContainer, 'item-5', { shiftKey: true })

    clickLabelButton(directoryContainer, 'item-1')
    await modifiedLabelClick(directoryContainer, 'item-5', { shiftKey: true })

    await waitForContent(() => {
      expect(treeSelectedKeys.value).toEqual(expectedRange)
      expect(directorySelectedKeys.value).toEqual(expectedRange)
      expect(getSelectedNodeKeys(treeContainer)).toEqual(expectedRange)
      expect(getSelectedNodeKeys(directoryContainer)).toEqual(expectedRange)
    })
  })

  it('uses an existing selected node as the shift range endpoint', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const selectedKeys = ref<string[]>(['item-1'])
    const rangeTreeData = Array.from({ length: 5 }, (_, index) => ({
      title: `Item ${index + 1}`,
      key: `item-${index + 1}`,
    }))
    const expectedRange = ['item-1', 'item-2', 'item-3', 'item-4', 'item-5']

    const Demo = () => (
      <Tree
        multiple
        selectedKeys={selectedKeys.value}
        onSelect={nextKeys => {
          selectedKeys.value = nextKeys as string[]
        }}
        treeData={rangeTreeData}
      />
    )

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      expect(getSelectedNodeKeys(container)).toEqual(['item-1'])
    })

    await modifiedLabelClick(container, 'item-5', { shiftKey: true })

    await waitForContent(() => {
      expect(selectedKeys.value).toEqual(expectedRange)
      expect(getSelectedNodeKeys(container)).toEqual(expectedRange)
    })
  })

  it('emits drop info in draggable mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleDrop = vi.fn()

    mountTestApp(container, () =>
      render(
        <Tree
          draggable
          defaultExpandAll
          onDrop={handleDrop}
          treeData={[
            { title: 'Alpha', key: 'alpha' },
            { title: 'Beta', key: 'beta' },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(getNode(container, 'alpha')).toBeTruthy()
      expect(getNode(container, 'beta')).toBeTruthy()
    })

    const dropRow = getNode(container, 'beta')
    dropRow.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        width: 120,
        height: 40,
        top: 0,
        right: 120,
        bottom: 40,
        left: 0,
        toJSON: () => ({}),
      }) as DOMRect

    const alphaLabel = getLabelButton(container, 'alpha')
    expect(alphaLabel.draggable).toBe(true)

    triggerDragEvent(alphaLabel, 'dragstart')
    triggerDragEvent(dropRow, 'dragenter')
    triggerDragEvent(dropRow, 'dragover')
    triggerDragEvent(dropRow, 'drop')

    await waitForContent(() => {
      expect(handleDrop).toHaveBeenCalledTimes(1)
      expect(handleDrop.mock.calls[0][0].dragNode.key).toBe('alpha')
      expect(handleDrop.mock.calls[0][0].node.key).toBe('beta')
      expect(handleDrop.mock.calls[0][0].dropPosition).toBe(0)
      expect(handleDrop.mock.calls[0][0].dropToGap).toBe(false)
    })
  })

  it('drops with mouse-drag fallback when native dragstart does not fire', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleDrop = vi.fn()

    mountTestApp(container, () =>
      render(
        <Tree
          draggable
          onDrop={handleDrop}
          treeData={[
            { title: 'Alpha', key: 'alpha' },
            { title: 'Beta', key: 'beta' },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(getNode(container, 'alpha')).toBeTruthy()
      expect(getNode(container, 'beta')).toBeTruthy()
    })

    const dropRow = getNode(container, 'beta')
    dropRow.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 40,
        width: 120,
        height: 40,
        top: 40,
        right: 120,
        bottom: 80,
        left: 0,
        toJSON: () => ({}),
      }) as DOMRect

    const originalElementFromPoint = document.elementFromPoint
    document.elementFromPoint = vi.fn(() => dropRow)

    try {
      triggerMouseEvent(getLabelButton(container, 'alpha'), 'mousedown', {
        button: 0,
        clientX: 4,
        clientY: 4,
      })
      document.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientX: 12,
          clientY: 60,
        }),
      )
      await waitForContent(() => {
        expect(getNode(container, 'beta').getAttribute('data-rue-tree-drop-intent')).toBe('inside')
      })
      document.dispatchEvent(
        new MouseEvent('mouseup', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientX: 12,
          clientY: 60,
        }),
      )
    } finally {
      document.elementFromPoint = originalElementFromPoint
    }

    await waitForContent(() => {
      expect(handleDrop).toHaveBeenCalledTimes(1)
      expect(handleDrop.mock.calls[0][0].dragNode.key).toBe('alpha')
      expect(handleDrop.mock.calls[0][0].node.key).toBe('beta')
    })
  })

  it('shows drop placeholder and respects allowDrop rules', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const handleDrop = vi.fn()

    mountTestApp(container, () =>
      render(
        <Tree
          draggable
          defaultExpandAll
          allowDrop={({ dropNode, dropToGap }) => dropToGap || dropNode.key === 'folder'}
          onDrop={handleDrop}
          treeData={[
            {
              title: 'Folder',
              key: 'folder',
              children: [{ title: 'Nested', key: 'nested' }],
            },
            { title: 'Locked.md', key: 'locked' },
            { title: 'Alpha', key: 'alpha' },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(getNode(container, 'folder')).toBeTruthy()
      expect(getNode(container, 'locked')).toBeTruthy()
      expect(getNode(container, 'alpha')).toBeTruthy()
    })

    const folderRow = getNode(container, 'folder')
    folderRow.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        width: 120,
        height: 40,
        top: 0,
        right: 120,
        bottom: 40,
        left: 0,
        toJSON: () => ({}),
      }) as DOMRect

    const lockedRow = getNode(container, 'locked')
    lockedRow.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 40,
        width: 120,
        height: 40,
        top: 40,
        right: 120,
        bottom: 80,
        left: 0,
        toJSON: () => ({}),
      }) as DOMRect

    triggerDragEvent(getNode(container, 'alpha'), 'dragstart')
    triggerDragEvent(lockedRow, 'dragenter', 60)
    triggerDragEvent(lockedRow, 'dragover', 60)

    await waitForContent(() => {
      expect(lockedRow.querySelector('[data-rue-tree-drop-placeholder="inside"]')).toBeFalsy()
      expect(lockedRow.getAttribute('data-rue-tree-drop-intent')).toBe('')
    })

    const currentFolderRow = getNode(container, 'folder')
    currentFolderRow.getBoundingClientRect = folderRow.getBoundingClientRect

    triggerDragEvent(currentFolderRow, 'dragenter', 2)
    triggerDragEvent(currentFolderRow, 'dragover', 2)

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tree-drop-placeholder="before"]')).toBeTruthy()
      expect(getNode(container, 'folder').getAttribute('data-rue-tree-drop-intent')).toBe('before')
    })

    triggerDragEvent(getNode(container, 'folder'), 'drop', 2)

    await waitForContent(() => {
      expect(handleDrop).toHaveBeenCalledTimes(1)
      expect(handleDrop.mock.calls[0][0].node.key).toBe('folder')
      expect(handleDrop.mock.calls[0][0].dropPosition).toBe(-1)
      expect(handleDrop.mock.calls[0][0].dropToGap).toBe(true)
    })
  })

  it('keeps drag hover state stable when drag events bubble through row descendants', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Tree
          draggable
          defaultExpandAll
          treeData={[
            {
              title: 'Folder',
              key: 'folder',
              children: [{ title: 'Nested', key: 'nested' }],
            },
            { title: 'Alpha', key: 'alpha' },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(getNode(container, 'folder')).toBeTruthy()
      expect(getNode(container, 'alpha')).toBeTruthy()
    })

    const folderRow = getNode(container, 'folder')
    folderRow.getBoundingClientRect = () =>
      ({
        x: 0,
        y: 0,
        width: 120,
        height: 40,
        top: 0,
        right: 120,
        bottom: 40,
        left: 0,
        toJSON: () => ({}),
      }) as DOMRect

    triggerDragEvent(getNode(container, 'alpha'), 'dragstart')
    triggerDragEvent(folderRow, 'dragenter', 2)
    triggerDragEvent(folderRow, 'dragover', 2)

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tree-drop-placeholder="before"]')).toBeTruthy()
      expect(getNode(container, 'folder').getAttribute('data-rue-tree-drop-intent')).toBe('before')
    })

    const labelButton = folderRow.querySelectorAll('button')[1]
    triggerDragEvent(labelButton, 'dragenter', 2)
    triggerDragEvent(labelButton, 'dragleave', 2)

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-tree-drop-placeholder="before"]')).toBeTruthy()
      expect(getNode(container, 'folder').getAttribute('data-rue-tree-drop-intent')).toBe('before')
    })
  })

  it('virtualizes long trees when height is provided', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const treeData = Array.from({ length: 24 }, (_, index) => ({
      title: `Node ${index}`,
      key: `node-${index}`,
    }))

    mountTestApp(container, () =>
      render(<Tree treeData={treeData} height={96} itemHeight={24} />, container),
    )

    await waitForContent(() => {
      expect(getNode(container, 'node-0')).toBeTruthy()
      expect(getNode(container, 'node-20')).toBeFalsy()
      expect(getNode(container, 'node-0').style.height).toBe('24px')
    })

    const body = container.querySelector('[data-rue-tree-body="true"]') as HTMLElement
    let spacers = Array.from(body.children).filter(
      child => !(child as HTMLElement).dataset.rueTreeNode && (child as HTMLElement).style.height,
    ) as HTMLElement[]
    expect(spacers[0]?.style.height).toBe('208px')

    body.scrollTop = 480
    body.dispatchEvent(new Event('scroll', { bubbles: true }))

    await waitForContent(() => {
      expect(getNode(container, 'node-20')).toBeTruthy()
      spacers = Array.from(body.children).filter(
        child => !(child as HTMLElement).dataset.rueTreeNode && (child as HTMLElement).style.height,
      ) as HTMLElement[]
      expect(spacers[0]?.style.height).toBe('208px')
    })

    body.scrollTop = 10_000
    body.dispatchEvent(new Event('scroll', { bubbles: true }))

    await waitForContent(() => {
      expect(getNode(container, 'node-23')).toBeTruthy()
    })
  })

  it('does not stringify dynamic renderable content as object text', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Tree
          showIcon
          defaultExpandAll
          treeData={[
            {
              title: 'Root',
              key: 'root',
              children: [{ title: 'Leaf', key: 'leaf' }],
            },
          ]}
          titleFormatter={({ node }) => `${node.title} ${node.children.length ? 'branch' : 'leaf'}`}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.textContent).toContain('Root')
      expect(container.textContent).toContain('Leaf')
      expect(container.textContent).toContain('branch')
      expect(container.textContent).toContain('leaf')
      expect(container.textContent).not.toContain('[object Object]')
    })
  })
})
