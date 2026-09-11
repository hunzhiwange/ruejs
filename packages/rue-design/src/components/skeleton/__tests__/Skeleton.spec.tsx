import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { ref, render, setReactiveScheduling } from '@rue-js/rue'
import Skeleton from '../index'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Skeleton', () => {
  it('renders the base skeleton element and forwards className', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(<Skeleton className="h-32 w-32" data-testid="skeleton-root" />, container),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="skeleton-root"]') as HTMLElement
      expect(element.classList.contains('skeleton')).toBe(true)
      expect(element.classList.contains('h-32')).toBe(true)
      expect(element.classList.contains('w-32')).toBe(true)
    })
  })

  it('supports text mode and custom tags', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Skeleton as="span" text data-testid="skeleton-text">
          Loading text
        </Skeleton>,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="skeleton-text"]') as HTMLElement
      expect(element.tagName.toLowerCase()).toBe('span')
      expect(element.classList.contains('skeleton')).toBe(true)
      expect(element.classList.contains('skeleton-text')).toBe(true)
      expect(element.textContent).toContain('Loading text')
    })
  })

  it('forwards native attrs', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(<Skeleton aria-label="loading" data-testid="skeleton-attrs" />, container),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="skeleton-attrs"]') as HTMLElement
      expect(element.getAttribute('aria-label')).toBe('loading')
    })
  })

  it('renders composite placeholders when avatar and paragraph props are provided', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Skeleton avatar active paragraph={{ rows: 4 }} data-testid="skeleton-composite" />,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="skeleton-composite"]') as HTMLElement
      const items = root.querySelectorAll('.skeleton')
      expect(items.length).toBe(6)
      expect(root.querySelector('.rounded-full')).not.toBeNull()
      expect(root.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    })
  })

  it('renders children when loading is false', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Skeleton loading={false} avatar>
          <div data-testid="skeleton-content">Loaded content</div>
        </Skeleton>,
        container,
      ),
    )

    await waitForContent(() => {
      const content = container.querySelector('[data-testid="skeleton-content"]') as HTMLElement
      expect(content).not.toBeNull()
      expect(content.textContent).toContain('Loaded content')
      expect(container.querySelectorAll('.skeleton').length).toBe(0)
    })
  })

  it('supports semantic slot customization on composite skeleton', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Skeleton
          avatar
          title={{ width: '40%' }}
          paragraph={{ rows: 2, width: ['100%', '68%'] }}
          rootClassName="overflow-hidden"
          classNames={{
            root: 'border',
            header: 'pt-1',
            section: 'gap-4',
            avatar: 'ring-1',
            title: 'bg-primary/20',
            paragraph: 'pb-1',
          }}
          styles={{
            root: { paddingInline: '12px' },
            title: { height: '20px' },
            paragraph: { paddingTop: '4px' },
          }}
          data-testid="skeleton-semantic"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="skeleton-semantic"]') as HTMLElement
      const header = root.children[0] as HTMLElement
      const section = root.children[1] as HTMLElement
      const title = section.children[0] as HTMLElement
      const paragraph = section.children[1] as HTMLElement
      const avatar = header.querySelector('.skeleton') as HTMLElement

      expect(root.classList.contains('overflow-hidden')).toBe(true)
      expect(root.classList.contains('border')).toBe(true)
      expect(root.style.paddingInline).toBe('12px')
      expect(header.classList.contains('pt-1')).toBe(true)
      expect(avatar.classList.contains('ring-1')).toBe(true)
      expect(section.classList.contains('gap-4')).toBe(true)
      expect(title.classList.contains('bg-primary/20')).toBe(true)
      expect(title.style.height).toBe('20px')
      expect(paragraph.classList.contains('pb-1')).toBe(true)
      expect(paragraph.style.paddingTop).toBe('4px')
    })
  })

  it('supports compound element variants', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <div>
          <Skeleton.Avatar data-testid="skeleton-avatar" shape="square" size="lg" />
          <Skeleton.Button data-testid="skeleton-button" shape="circle" />
          <Skeleton.Input data-testid="skeleton-input" block />
          <Skeleton.Image data-testid="skeleton-image" aspect="square" />
          <Skeleton.Node data-testid="skeleton-node">Node</Skeleton.Node>
        </div>,
        container,
      ),
    )

    await waitForContent(() => {
      const avatar = container.querySelector('[data-testid="skeleton-avatar"]') as HTMLElement
      const button = container.querySelector('[data-testid="skeleton-button"]') as HTMLElement
      const input = container.querySelector('[data-testid="skeleton-input"]') as HTMLElement
      const image = container.querySelector('[data-testid="skeleton-image"]') as HTMLElement
      const node = container.querySelector('[data-testid="skeleton-node"]') as HTMLElement

      expect(avatar.classList.contains('rounded-2xl')).toBe(true)
      expect(button.classList.contains('rounded-full')).toBe(true)
      expect(input.classList.contains('w-full')).toBe(true)
      expect(image.classList.contains('aspect-square')).toBe(true)
      expect(node.textContent).toContain('Node')
    })
  })

  it('keeps element children inside Skeleton.Node across active toggles', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const active = ref(true)

    const Demo = () => (
      <Skeleton.Node active={() => active.value} data-testid="skeleton-node-toggle">
        <svg data-testid="skeleton-node-icon" viewBox="0 0 10 10" aria-hidden="true">
          <circle cx="5" cy="5" r="4" />
        </svg>
      </Skeleton.Node>
    )

    mountTestApp(container, () => render(<Demo />, container))

    await waitForContent(() => {
      const node = container.querySelector('[data-testid="skeleton-node-toggle"]') as HTMLElement
      expect(node.querySelectorAll('[data-testid="skeleton-node-icon"]').length).toBe(1)
      expect(container.querySelectorAll('[data-testid="skeleton-node-icon"]').length).toBe(1)
    })

    active.value = false

    await waitForContent(() => {
      const node = container.querySelector('[data-testid="skeleton-node-toggle"]') as HTMLElement
      expect(node.querySelectorAll('[data-testid="skeleton-node-icon"]').length).toBe(1)
      expect(container.querySelectorAll('[data-testid="skeleton-node-icon"]').length).toBe(1)
      expect(node.classList.contains('animate-pulse')).toBe(false)
    })

    active.value = true

    await waitForContent(() => {
      const node = container.querySelector('[data-testid="skeleton-node-toggle"]') as HTMLElement
      expect(node.querySelectorAll('[data-testid="skeleton-node-icon"]').length).toBe(1)
      expect(container.querySelectorAll('[data-testid="skeleton-node-icon"]').length).toBe(1)
      expect(node.classList.contains('animate-pulse')).toBe(true)
    })
  })

  it('updates Skeleton.Image classes across reactive active and aspect toggles', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    const active = ref(true)
    const aspect = ref<'video' | 'square'>('video')

    mountTestApp(container, () =>
      render(
        <Skeleton.Image
          active={() => active.value}
          aspect={() => aspect.value}
          data-testid="skeleton-image-toggle"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const image = container.querySelector('[data-testid="skeleton-image-toggle"]') as HTMLElement
      expect(image.classList.contains('animate-pulse')).toBe(true)
      expect(image.classList.contains('aspect-video')).toBe(true)
      expect(image.querySelectorAll('svg').length).toBe(1)
    })

    active.value = false
    aspect.value = 'square'

    await waitForContent(() => {
      const image = container.querySelector('[data-testid="skeleton-image-toggle"]') as HTMLElement
      expect(image.classList.contains('animate-pulse')).toBe(false)
      expect(image.classList.contains('aspect-square')).toBe(true)
      expect(image.classList.contains('aspect-video')).toBe(false)
      expect(image.querySelectorAll('svg').length).toBe(1)
    })
  })
})
