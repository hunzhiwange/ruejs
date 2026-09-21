import { Template } from '@rue-js/rue'
import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { ref, render, setReactiveScheduling } from '@rue-js/rue'
import Dropdown from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Dropdown', () => {
  it('renders the root with placement and modifier classes', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Dropdown align="end" direction="top" hover forceOpen className="mb-4">
          content
        </Dropdown>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('.dropdown') as HTMLElement
      expect(root.classList.contains('dropdown-end')).toBe(true)
      expect(root.classList.contains('dropdown-top')).toBe(true)
      expect(root.classList.contains('dropdown-hover')).toBe(true)
      expect(root.classList.contains('dropdown-open')).toBe(true)
      expect(root.classList.contains('mb-4')).toBe(true)
    })
  })

  it('renders details root and dropdown-content part', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Dropdown as="details" open>
          <summary>Open</summary>
          <Dropdown.Content as="ul" data-testid="menu">
            <li>Item</li>
          </Dropdown.Content>
        </Dropdown>,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('details.dropdown[open]')).not.toBeNull()
      expect(
        container.querySelector('[data-testid="menu"]')?.classList.contains('dropdown-content'),
      ).toBe(true)
    })
  })

  it('renders trigger with default focus attrs', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Dropdown>
          <Dropdown.Trigger className="btn">Click</Dropdown.Trigger>
        </Dropdown>,
        container,
      ),
    )

    await waitForContent(() => {
      const trigger = container.querySelector('div.btn') as HTMLDivElement
      expect(trigger).toBeTruthy()
      expect(trigger.tabIndex).toBe(0)
      expect(trigger.getAttribute('role')).toBe('button')
    })
  })

  it('supports items with click trigger and closes after menu item click', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const openChanges: string[] = []

    mountTestApp(container, () =>
      render(
        <Dropdown
          trigger="click"
          items={[
            { key: 'edit', label: 'Edit' },
            { key: 'archive', label: 'Archive' },
          ]}
          onOpenChange={(nextOpen, info) => openChanges.push(`${info.source}:${nextOpen}`)}
        >
          <button type="button">Actions</button>
        </Dropdown>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('.dropdown') as HTMLElement
      expect(root.classList.contains('dropdown-open')).toBe(false)
      expect(container.textContent).toContain('Actions')
    })

    const trigger = container.querySelector('[aria-haspopup="menu"]') as HTMLDivElement
    const triggerButton = trigger.querySelector('button') as HTMLButtonElement
    triggerButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      const root = container.querySelector('.dropdown') as HTMLElement
      expect(root.classList.contains('dropdown-open')).toBe(true)
      expect(container.textContent).toContain('Edit')
      expect(container.textContent).toContain('Archive')
    })

    const firstItem = Array.from(
      container.querySelectorAll('.menu a, .menu button, .menu span'),
    ).find(node => node.textContent?.includes('Edit'))
    expect(firstItem).toBeTruthy()
    firstItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      const root = container.querySelector('.dropdown') as HTMLElement
      expect(root.classList.contains('dropdown-open')).toBe(false)
      expect(openChanges).toEqual(['trigger:true', 'menu:false'])
    })
  })

  it('renders JSX overlay content and applies popupRender around the origin node', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Dropdown
          trigger="click"
          overlay={<div data-testid="dropdown-origin">Origin</div>}
          popupRender={originNode => (
            <section data-testid="dropdown-popup-wrapper">
              <header>Header</header>
              {originNode}
              <footer>Footer</footer>
            </section>
          )}
        >
          <button type="button">Open</button>
        </Dropdown>,
        container,
      ),
    )

    await waitForContent(() => {
      const wrapper = container.querySelector('[data-testid="dropdown-popup-wrapper"]')
      expect(wrapper).toBeTruthy()
      expect(wrapper?.querySelector('[data-testid="dropdown-origin"]')?.textContent).toBe('Origin')
      expect(wrapper?.textContent).toContain('Header')
      expect(wrapper?.textContent).toContain('Footer')
      expect(container.textContent).not.toContain('[object Object]')
    })
  })

  it('keeps selectable menu overlays mounted while selections change', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    const SelectableDropdownCase = () => {
      const selectedKeys = ref<string[]>(['overview'])

      return (
        <Dropdown
          trigger="click"
          closeOnClick={false}
          menu={{
            selectable: true,
            selectedKeys: selectedKeys.value,
            onSelect: info => {
              selectedKeys.value = info.selectedKeys as string[]
            },
            items: [
              { key: 'overview', label: 'Overview' },
              { key: 'mentions', label: 'Mentions' },
              { key: 'comment', label: 'Comments' },
            ],
          }}
        >
          <button type="button">Single Select</button>
        </Dropdown>
      )
    }

    mountTestApp(container, () => render(<SelectableDropdownCase />, container))

    await waitForContent(() => {
      expect(container.querySelector('.dropdown')?.classList.contains('dropdown-open')).toBe(false)
    })

    const trigger = container.querySelector('[aria-haspopup="menu"]') as HTMLDivElement
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    let overlayBefore: Element | null = null
    await waitForContent(() => {
      const root = container.querySelector('.dropdown') as HTMLElement
      overlayBefore = container.querySelector('.dropdown-content')
      expect(root.classList.contains('dropdown-open')).toBe(true)
      expect(overlayBefore).toBeTruthy()
      expect(container.querySelectorAll('.dropdown-content')).toHaveLength(1)
    })

    const mentions = Array.from(container.querySelectorAll('.menu a')).find(node =>
      node.textContent?.includes('Mentions'),
    ) as HTMLAnchorElement | undefined
    expect(mentions).toBeTruthy()
    mentions!.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      const root = container.querySelector('.dropdown') as HTMLElement
      const overlayAfter = container.querySelector('.dropdown-content')
      const active = Array.from(container.querySelectorAll('.menu a.menu-active')).find(node =>
        node.textContent?.includes('Mentions'),
      )
      expect(root.classList.contains('dropdown-open')).toBe(true)
      expect(overlayAfter).toBe(overlayBefore)
      expect(container.querySelectorAll('.dropdown-content')).toHaveLength(1)
      expect(active).toBeTruthy()
    })

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      const root = container.querySelector('.dropdown') as HTMLElement
      expect(root.classList.contains('dropdown-open')).toBe(false)
    })
  })

  it('toggles submenu entries from items in enhanced command menus', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Dropdown
          trigger="click"
          items={[
            { key: 'overview', label: 'Overview' },
            {
              type: 'submenu',
              key: 'publish',
              label: 'Publish',
              children: [
                { key: 'draft', label: 'Save Draft' },
                { key: 'live', label: 'Publish Now' },
              ],
            },
          ]}
        >
          <button type="button">Workspace</button>
        </Dropdown>,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('.dropdown')?.classList.contains('dropdown-open')).toBe(false)
    })

    const trigger = container.querySelector('[aria-haspopup="menu"]') as HTMLDivElement
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    const getPublishTrigger = () =>
      Array.from(container.querySelectorAll('.menu button')).find(button =>
        button.textContent?.includes('Publish'),
      ) as HTMLButtonElement | undefined
    let publishTrigger: HTMLButtonElement | undefined
    await waitForContent(() => {
      publishTrigger = getPublishTrigger()
      expect(publishTrigger).toBeTruthy()
      expect(publishTrigger?.getAttribute('aria-expanded')).toBe('false')
    })

    publishTrigger!.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      publishTrigger = getPublishTrigger()
      expect(publishTrigger?.getAttribute('aria-expanded')).toBe('true')
      expect(container.textContent).toContain('Save Draft')
      const submenu = publishTrigger!.parentElement?.querySelector('ul') as HTMLElement
      expect(submenu.classList.contains('hidden')).toBe(false)
    })

    publishTrigger!.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      publishTrigger = getPublishTrigger()
      expect(publishTrigger?.getAttribute('aria-expanded')).toBe('false')
      const submenu = publishTrigger!.parentElement?.querySelector('ul') as HTMLElement
      expect(submenu.classList.contains('hidden')).toBe(true)
    })
  })

  it('does not duplicate trigger or overlay in controlled click mode', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    const ControlledDropdownCase = () => {
      const open = ref(false)
      const source = ref('trigger')

      return (
        <div>
          <Dropdown
            trigger="click"
            open={open.value}
            onOpenChange={(nextOpen, info) => {
              open.value = nextOpen
              source.value = info.source
            }}
            items={[
              { key: 'edit', label: 'Edit' },
              { key: 'archive', label: 'Archive' },
            ]}
          >
            <button type="button" data-testid="controlled-trigger-button">
              {open.value ? 'Close' : 'Open'}
            </button>
          </Dropdown>
          <div data-testid="controlled-source">{source.value}</div>
        </div>
      )
    }

    mountTestApp(container, () => render(<ControlledDropdownCase />, container))

    await waitForContent(() => {
      expect(container.querySelectorAll('[data-testid="controlled-trigger-button"]')).toHaveLength(
        1,
      )
      expect(container.querySelectorAll('.dropdown-content')).toHaveLength(1)
    })

    const trigger = container.querySelector('[aria-haspopup="menu"]') as HTMLDivElement
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      const root = container.querySelector('.dropdown') as HTMLElement
      expect(root.classList.contains('dropdown-open')).toBe(true)
      expect(container.querySelectorAll('[data-testid="controlled-trigger-button"]')).toHaveLength(
        1,
      )
      expect(container.querySelectorAll('.dropdown-content')).toHaveLength(1)
      expect(container.querySelector('[data-testid="controlled-source"]')?.textContent).toBe(
        'trigger',
      )
    })

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    await waitForContent(() => {
      const root = container.querySelector('.dropdown') as HTMLElement
      expect(root.classList.contains('dropdown-open')).toBe(false)
      expect(container.querySelectorAll('[data-testid="controlled-trigger-button"]')).toHaveLength(
        1,
      )
      expect(container.querySelectorAll('.dropdown-content')).toHaveLength(1)
    })
  })

  it('positions context menu overlays from pointer coordinates', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Dropdown trigger="contextMenu">
          <Template slot="overlay">
            <div className="px-3 py-2">Context actions</div>
          </Template>
          <div data-testid="context-area">Right click here</div>
        </Dropdown>,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="context-area"]')).toBeTruthy()
    })

    const trigger = container.querySelector('[aria-haspopup="dialog"]') as HTMLDivElement
    trigger.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, clientX: 48, clientY: 96 }),
    )

    await waitForContent(() => {
      const root = container.querySelector('.dropdown') as HTMLElement
      const content = container.querySelector('.dropdown-content') as HTMLElement
      expect(root.classList.contains('dropdown-open')).toBe(true)
      expect(content.style.position).toBe('fixed')
      expect(content.style.left).toBe('48px')
      expect(content.style.top).toBe('96px')
      expect(content.style.margin).toBe('0px')
      expect(content.style.getPropertyValue('scale')).toBe('1')
      expect(content.style.getPropertyValue('translate')).toBe('0 0')
      expect(content.style.transformOrigin).toBe('top left')
      expect(content.style.transition).toBe('none')
      expect(content.style.animation).toBe('none')
      expect(container.textContent).toContain('Context actions')
    })
  })

  it('opens context menu items at pointer coordinates without dropdown offset', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Dropdown
          trigger="contextMenu"
          items={[
            { key: 'copy', label: 'Copy link' },
            { key: 'rename', label: 'Rename block' },
            { type: 'divider' },
            { key: 'delete', label: 'Delete block', danger: true },
          ]}
        >
          <div data-testid="context-items-area">Right click actions</div>
        </Dropdown>,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="context-items-area"]')).toBeTruthy()
    })

    const trigger = container.querySelector('[aria-haspopup="menu"]') as HTMLDivElement
    trigger.dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, clientX: 112, clientY: 144 }),
    )

    await waitForContent(() => {
      const root = container.querySelector('.dropdown') as HTMLElement
      const content = container.querySelector('.dropdown-content') as HTMLElement
      expect(root.classList.contains('dropdown-open')).toBe(true)
      expect(content.style.position).toBe('fixed')
      expect(content.style.left).toBe('112px')
      expect(content.style.top).toBe('144px')
      expect(content.style.margin).toBe('0px')
      expect(content.style.getPropertyValue('scale')).toBe('1')
      expect(content.style.getPropertyValue('translate')).toBe('0 0')
      expect(content.style.transformOrigin).toBe('top left')
      expect(content.style.transition).toBe('none')
      expect(content.style.animation).toBe('none')
      expect(container.textContent).toContain('Copy link')
      expect(container.textContent).toContain('Delete block')
    })
  })

  it('keeps context menu items inside the viewport near edges', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Dropdown
          trigger="contextMenu"
          items={[
            { key: 'copy', label: 'Copy link' },
            { key: 'rename', label: 'Rename block' },
          ]}
        >
          <div data-testid="context-edge-area">Right click near edge</div>
        </Dropdown>,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('[data-testid="context-edge-area"]')).toBeTruthy()
      expect(container.querySelector('.dropdown-content')).toBeTruthy()
    })

    const widthDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth')
    const heightDescriptor = Object.getOwnPropertyDescriptor(window, 'innerHeight')
    const trigger = container.querySelector('[aria-haspopup="menu"]') as HTMLDivElement
    const content = container.querySelector('.dropdown-content') as HTMLElement
    const originalGetBoundingClientRect = content.getBoundingClientRect

    try {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 160 })
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 120 })
      content.getBoundingClientRect = () =>
        ({
          x: 0,
          y: 0,
          left: 0,
          top: 0,
          right: 80,
          bottom: 40,
          width: 80,
          height: 40,
          toJSON: () => ({}),
        }) as DOMRect

      trigger.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, clientX: 150, clientY: 110 }),
      )

      await waitForContent(() => {
        const root = container.querySelector('.dropdown') as HTMLElement
        expect(root.classList.contains('dropdown-open')).toBe(true)
        expect(content.style.left).toBe('72px')
        expect(content.style.top).toBe('72px')
        expect(content.style.getPropertyValue('translate')).toBe('0 0')
      })
    } finally {
      content.getBoundingClientRect = originalGetBoundingClientRect
      if (widthDescriptor) Object.defineProperty(window, 'innerWidth', widthDescriptor)
      if (heightDescriptor) Object.defineProperty(window, 'innerHeight', heightDescriptor)
    }
  })
})
