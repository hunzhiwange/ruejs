import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import Transfer from '../index'
import Steps from '../../steps'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const supportsBrowserFocusIdentityAssertions =
  typeof navigator !== 'undefined' && !/jsdom/i.test(navigator.userAgent)

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active =
    (globalThis as any).__rue_vapor_preferred ?? (globalThis as any).__rue
}

const dataSource = [
  { key: 'alpha', title: 'Alpha', description: 'First item' },
  { key: 'beta', title: 'Beta', description: 'Second item' },
  { key: 'gamma', title: 'Gamma', description: 'Third item' },
]

const getPanel = (container: HTMLElement, direction: 'left' | 'right') => {
  return container.querySelector(`[data-rue-transfer-panel="${direction}"]`) as HTMLElement
}

const findButtonByText = (container: HTMLElement, text: string) => {
  return Array.from(container.querySelectorAll('button')).find(button =>
    button.textContent?.includes(text),
  ) as HTMLButtonElement | undefined
}

const press = (element: HTMLButtonElement | HTMLInputElement | null | undefined) => {
  expect(element).toBeTruthy()
  element!.click()
}

const getItemCheckbox = (container: HTMLElement, direction: 'left' | 'right', text: string) => {
  const panel = getPanel(container, direction)
  const label = Array.from(panel.querySelectorAll('label')).find(node =>
    node.textContent?.includes(text),
  )
  return (label?.querySelector('input[type="checkbox"]') as HTMLInputElement | null) ?? null
}

const getSelectAllCheckbox = (container: HTMLElement, direction: 'left' | 'right') => {
  const panel = getPanel(container, direction)
  return panel.querySelector(
    `input[type="checkbox"][aria-label="${direction === 'left' ? '待选择全选' : '已加入全选'}"]`,
  ) as HTMLInputElement | null
}

const getSearchInput = (container: HTMLElement, direction: 'left' | 'right') => {
  const panel = getPanel(container, direction)
  return panel.querySelector('input[type="text"]') as HTMLInputElement | null
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Transfer', () => {
  it('forwards ref and click events through a compiler-only dynamic tag', async () => {
    const container = mountContainer()
    let rootElement: HTMLElement | null = null
    const handleClick = vi.fn()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Steps
          as="nav"
          ref={(element: HTMLElement | null) => {
            rootElement = element
          }}
          data-testid="dynamic-steps-root"
          onClick={handleClick}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(rootElement).toBe(container.querySelector('[data-testid="dynamic-steps-root"]'))
    })

    ;(rootElement as HTMLElement | null)?.click()
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('moves selected source items in uncontrolled mode and emits compatible callbacks', async () => {
    const container = mountContainer()
    const handleChange = vi.fn()
    const handleSelectChange = vi.fn()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Transfer
          dataSource={dataSource}
          defaultSelectedKeys={['alpha']}
          defaultTargetKeys={['beta']}
          onChange={handleChange}
          onSelectChange={handleSelectChange}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const leftPanel = getPanel(container, 'left')
      const rightPanel = getPanel(container, 'right')
      expect(leftPanel.textContent).toContain('Alpha')
      expect(leftPanel.textContent).toContain('Gamma')
      expect(rightPanel.textContent).toContain('Beta')
      expect(findButtonByText(container, '加入')).toBeTruthy()
    })

    press(findButtonByText(container, '加入'))

    await waitForContent(() => {
      const leftPanel = getPanel(container, 'left')
      const rightPanel = getPanel(container, 'right')
      expect(handleChange).toHaveBeenCalledWith(['beta', 'alpha'], 'right', ['alpha'])
      expect(handleSelectChange).toHaveBeenLastCalledWith([], [])
      expect(leftPanel.textContent).not.toContain('Alpha')
      expect(rightPanel.textContent).toContain('Alpha')
      expect(rightPanel.textContent).toContain('Beta')
    })
  })

  it('selects all visible source items from the header checkbox without throwing', async () => {
    const container = mountContainer()
    const handleSelectChange = vi.fn()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(<Transfer dataSource={dataSource} onSelectChange={handleSelectChange} />, container),
    )

    await waitForContent(() => {
      expect(getSelectAllCheckbox(container, 'left')).toBeTruthy()
    })

    press(getSelectAllCheckbox(container, 'left'))

    await waitForContent(() => {
      expect(handleSelectChange).toHaveBeenLastCalledWith(['alpha', 'beta', 'gamma'], [])
      expect(getSelectAllCheckbox(container, 'left')?.checked).toBe(true)
    })
  })

  it('filters items with search input and paginates visible content', async () => {
    const container = mountContainer()
    const handleSearch = vi.fn()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Transfer
          dataSource={dataSource}
          showSearch={{ placeholder: 'Search items' }}
          pagination={{ pageSize: 1 }}
          onSearch={handleSearch}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const leftPanel = getPanel(container, 'left')
      expect(leftPanel.textContent).toContain('Alpha')
      expect(leftPanel.textContent).not.toContain('Beta')
      expect(leftPanel.textContent).toContain('第 1 / 3 页')
    })

    press(findButtonByText(getPanel(container, 'left'), '下一页'))

    await waitForContent(() => {
      const leftPanel = getPanel(container, 'left')
      expect(leftPanel.textContent).toContain('Beta')
      expect(leftPanel.textContent).not.toContain('Alpha')
      expect(leftPanel.textContent).toContain('第 2 / 3 页')
    })

    const searchInput = Array.from(container.querySelectorAll('input')).find(
      input => input.getAttribute('placeholder') === 'Search items',
    ) as HTMLInputElement
    searchInput.value = 'ga'
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      const leftPanel = getPanel(container, 'left')
      expect(handleSearch).toHaveBeenLastCalledWith('left', 'ga')
      expect(leftPanel.textContent).toContain('Gamma')
      expect(leftPanel.textContent).not.toContain('Alpha')
      expect(leftPanel.textContent).not.toContain('Beta')
      expect(leftPanel.textContent).toContain('第 1 / 1 页')
    })
  })

  it('waits for IME composition to finish before committing the search text', async () => {
    const container = mountContainer()
    const handleSearch = vi.fn()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Transfer
          dataSource={dataSource}
          showSearch={{ placeholder: 'Search items' }}
          onSearch={handleSearch}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(getSearchInput(container, 'left')).toBeTruthy()
    })

    const searchInput = getSearchInput(container, 'left') as HTMLInputElement
    searchInput.focus()
    searchInput.dispatchEvent(new Event('compositionstart', { bubbles: true }))
    searchInput.value = '中'
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))

    expect(handleSearch).not.toHaveBeenCalled()

    await waitForContent(() => {
      if (supportsBrowserFocusIdentityAssertions) {
        expect(document.activeElement).toBe(getSearchInput(container, 'left'))
      }

      expect(getSearchInput(container, 'left')).toBeTruthy()
    })

    searchInput.dispatchEvent(new Event('compositionend', { bubbles: true }))

    await waitForContent(() => {
      expect(handleSearch).toHaveBeenLastCalledWith('left', '中')
      if (supportsBrowserFocusIdentityAssertions) {
        expect(document.activeElement).toBe(getSearchInput(container, 'left'))
      }

      expect(getSearchInput(container, 'left')).toBeTruthy()
      expect(getSearchInput(container, 'left')?.value).toBe('中')
    })
  })

  it('keeps the search input focused while moving between pages', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Transfer
          dataSource={dataSource}
          showSearch={{ placeholder: 'Search items' }}
          pagination={{ pageSize: 1 }}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(getSearchInput(container, 'left')).toBeTruthy()
      expect(getPanel(container, 'left').textContent).toContain('第 1 / 3 页')
    })

    const searchInput = getSearchInput(container, 'left') as HTMLInputElement
    searchInput.focus()

    press(findButtonByText(getPanel(container, 'left'), '下一页'))

    await waitForContent(() => {
      expect(getPanel(container, 'left').textContent).toContain('第 2 / 3 页')
      expect(document.activeElement).toBe(getSearchInput(container, 'left'))
    })
  })

  it('keeps the search input focused while typing in the controlled footer and pagination demo', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Transfer
          dataSource={dataSource}
          targetKeys={['beta']}
          selectedKeys={[]}
          titles={['素材池', '上线包']}
          showSearch={{ placeholder: '搜索标签、频道、负责人' }}
          pagination={{ pageSize: 1 }}
          footerFormatter={(listProps, { direction }) => `${direction}:${listProps.items.length}`}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(getSearchInput(container, 'left')).toBeTruthy()
      expect(getSearchInput(container, 'right')).toBeTruthy()
    })

    const searchInput = getSearchInput(container, 'left') as HTMLInputElement
    searchInput.focus()
    searchInput.value = 'a'
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      if (supportsBrowserFocusIdentityAssertions) {
        expect(document.activeElement).toBe(getSearchInput(container, 'left'))
        expect(getSearchInput(container, 'left')).toBe(searchInput)
      }

      expect(getSearchInput(container, 'left')).toBeTruthy()
      expect(getSearchInput(container, 'left')?.value).toBe('a')
    })
  })

  it('keeps the oneWay search input focused while typing with disabled target items', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Transfer
          dataSource={[
            { key: 'alpha', title: 'Alpha' },
            { key: 'locked', title: 'Accessibility Review', disabled: true },
            { key: 'beta', title: 'Stakeholder Sign-off' },
          ]}
          targetKeys={['locked', 'beta']}
          selectedKeys={[]}
          titles={['待加入能力', '当前方案']}
          oneWay
          showSearch
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(getSearchInput(container, 'right')).toBeTruthy()
    })

    const searchInput = getSearchInput(container, 'right') as HTMLInputElement
    searchInput.focus()
    searchInput.value = 'a'
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      if (supportsBrowserFocusIdentityAssertions) {
        expect(document.activeElement).toBe(getSearchInput(container, 'right'))
        expect(getSearchInput(container, 'right')).toBe(searchInput)
      }

      expect(getSearchInput(container, 'right')).toBeTruthy()
      expect(getSearchInput(container, 'right')?.value).toBe('a')
    })
  })

  it('re-renders paginated panels only once per page change', async () => {
    const container = mountContainer()
    const footerFormatter = vi.fn(listProps => String(listProps.items.length))
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Transfer
          dataSource={dataSource}
          pagination={{ pageSize: 1 }}
          footerFormatter={footerFormatter}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(footerFormatter).toHaveBeenCalledTimes(2)
      expect(getPanel(container, 'left').textContent).toContain('第 1 / 3 页')
    })

    press(findButtonByText(getPanel(container, 'left'), '下一页'))

    await waitForContent(() => {
      expect(footerFormatter).toHaveBeenCalledTimes(3)
      expect(getPanel(container, 'left').textContent).toContain('第 2 / 3 页')
    })
  })

  it('renders formatted footer text together with search and pagination', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Transfer
          dataSource={dataSource}
          showSearch={{ placeholder: 'Search items' }}
          pagination={{ pageSize: 1 }}
          footerFormatter={(listProps, info) =>
            `${info.direction}:${listProps.filteredItems.length}:${listProps.items.length}`
          }
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const leftFooter = container.querySelector(
        '[data-rue-transfer-footer="left"]',
      ) as HTMLElement | null
      const rightFooter = container.querySelector(
        '[data-rue-transfer-footer="right"]',
      ) as HTMLElement | null
      expect(leftFooter?.textContent).toContain('left:3:1')
      expect(rightFooter?.textContent).toContain('right:0:0')
      expect(container.textContent).not.toContain('[object Object]')
    })

    const searchInput = Array.from(container.querySelectorAll('input')).find(
      input => input.getAttribute('placeholder') === 'Search items',
    ) as HTMLInputElement
    searchInput.value = 'ga'
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))

    await waitForContent(() => {
      const leftFooter = container.querySelector(
        '[data-rue-transfer-footer="left"]',
      ) as HTMLElement | null
      expect(leftFooter?.textContent).toContain('left:1:1')
      expect(container.textContent).not.toContain('[object Object]')
    })
  })

  it('renders button choices and allows selection flow', async () => {
    const container = mountContainer()
    const handleSelectChange = vi.fn()
    const handleChange = vi.fn()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Transfer
          dataSource={dataSource}
          onChange={handleChange}
          onSelectChange={handleSelectChange}
          listVariant="buttons"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(getPanel(container, 'left')).toBeTruthy()
      expect(getPanel(container, 'right')).toBeTruthy()
      expect(
        getPanel(container, 'left').querySelector('[data-rue-transfer-choice="string:alpha"]')
          ?.textContent,
      ).toContain('Alpha')
    })

    press(
      getPanel(container, 'left').querySelector(
        '[data-rue-transfer-choice="string:alpha"]',
      ) as HTMLButtonElement | null,
    )

    await waitForContent(() => {
      expect(handleSelectChange).toHaveBeenLastCalledWith(['alpha'], [])
      expect(
        getPanel(container, 'left')
          .querySelector('[data-rue-transfer-choice="string:alpha"]')
          ?.getAttribute('aria-pressed'),
      ).toBe('true')
    })

    press(findButtonByText(container, '加入'))

    await waitForContent(() => {
      expect(handleChange).toHaveBeenLastCalledWith(['alpha'], 'right', ['alpha'])
      expect(
        getPanel(container, 'right').querySelector('[data-rue-transfer-choice="string:alpha"]')
          ?.textContent,
      ).toContain('Alpha')
    })
  })

  it('supports oneWay mode and removes selected target items back to source', async () => {
    const container = mountContainer()
    const handleChange = vi.fn()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Transfer
          dataSource={dataSource}
          defaultTargetKeys={['beta']}
          oneWay
          onChange={handleChange}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const rightPanel = getPanel(container, 'right')
      expect(rightPanel.textContent).toContain('Beta')
      expect(findButtonByText(container, '移出已选')).toBeTruthy()
    })

    const betaCheckbox = getItemCheckbox(container, 'right', 'Beta')
    expect(betaCheckbox).toBeTruthy()
    press(betaCheckbox)

    await waitForContent(() => {
      expect(findButtonByText(container, '移出已选')?.disabled).toBe(false)
    })

    press(findButtonByText(container, '移出已选'))

    await waitForContent(() => {
      const leftPanel = getPanel(container, 'left')
      const rightPanel = getPanel(container, 'right')
      expect(handleChange).toHaveBeenLastCalledWith([], 'left', ['beta'])
      expect(leftPanel.textContent).toContain('Beta')
      expect(rightPanel.textContent).not.toContain('Beta')
    })
  })

  it('isolates footer formatter data from selection and list state', async () => {
    const container = mountContainer()
    const onSelectChange = vi.fn()
    mountTestApp(container, () =>
      render(
        <Transfer
          dataSource={dataSource}
          onSelectChange={onSelectChange}
          footerFormatter={(panel, info) => {
            panel.items.length = 0
            panel.selectedKeys.push('alpha')
            return info.direction
          }}
        />,
        container,
      ),
    )
    await waitForContent(() => {
      expect(getPanel(container, 'left').textContent).toContain('Alpha')
      expect(getItemCheckbox(container, 'left', 'Alpha')?.checked).toBe(false)
      expect(container.querySelector('[data-rue-transfer-footer="left"]')?.textContent).toBe('left')
      expect(onSelectChange).not.toHaveBeenCalled()
    })
  })
})
