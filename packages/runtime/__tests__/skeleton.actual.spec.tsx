import { type FC, ref } from '@rue-js/rue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setReactiveScheduling } from '../src'
import SkeletonPage from '../../../app/pages/design/Skeleton'
import Skeleton from '../../../packages/rue-design/src/components/skeleton/index'
import { render, click, mountContainer, waitForContent } from './page-test-utils'
import { findDemo, findTabButton, resetActiveRuntime } from './design-page-test-utils'

const findButton = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button')).find(
    button => button.textContent?.trim() === label,
  ) ?? null

vi.mock('@rue-js/design', async () => {
  const [skeletonMod, tabsMod] = await Promise.all([
    import('../../../packages/rue-design/src/components/skeleton/index'),
    import('../../../packages/rue-design/src/components/tabs/index'),
  ])
  return {
    Skeleton: skeletonMod.default,
    Tabs: tabsMod.default,
  }
})

vi.mock('../../../app/pages/site/SidebarPlaygroundDesign', () => ({
  default: (props: { children?: unknown }) => (
    <div data-testid="mock-sidebar-design">{props.children}</div>
  ),
}))

vi.mock('../../../app/pages/site/components/Code', () => ({
  default: (props: { code?: string }) => <pre data-testid="mock-code">{props.code ?? ''}</pre>,
}))

setReactiveScheduling('sync')

const setEnabledPreviews = (...titles: string[]) => {
  ;(
    globalThis as { __RUE_TEST_ENABLED_DESIGN_PREVIEWS__?: Set<string> }
  ).__RUE_TEST_ENABLED_DESIGN_PREVIEWS__ = new Set(titles)
}

const MinimalElementVariantsPreview: FC = () => {
  const elementActive = ref(true)
  const elementBlock = ref(false)
  const avatarShape = ref<'circle' | 'square'>('circle')
  const imageAspect = ref<'video' | 'square'>('video')

  return (
    <div className="space-y-5" data-testid="skeleton-elements-demo">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => (elementActive.value = !elementActive.value)}
        >
          {elementActive.value ? '关闭 active' : '开启 active'}
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => (elementBlock.value = !elementBlock.value)}
        >
          {elementBlock.value ? '关闭 block' : '开启 block'}
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => (avatarShape.value = avatarShape.value === 'circle' ? 'square' : 'circle')}
        >
          Avatar: {avatarShape.value}
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => (imageAspect.value = imageAspect.value === 'video' ? 'square' : 'video')}
        >
          Image: {imageAspect.value}
        </button>
      </div>

      <div data-testid="skeleton-elements-image-wrap">
        <Skeleton.Image
          active={() => elementActive.value}
          aspect={() => imageAspect.value}
          className="w-full"
          data-testid="skeleton-elements-image"
        />
      </div>
      <div data-testid="skeleton-elements-node-wrap">
        <Skeleton.Node
          active={() => elementActive.value}
          className={
            elementBlock.value
              ? 'block h-28 text-xs font-semibold uppercase tracking-[0.24em] text-base-content/45'
              : 'h-28 text-xs font-semibold uppercase tracking-[0.24em] text-base-content/45'
          }
          data-testid="skeleton-elements-node"
        >
          <div className="flex items-center gap-3">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 fill-current opacity-70"
              aria-hidden="true"
              data-testid="skeleton-elements-node-icon"
            >
              <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v6A2.5 2.5 0 0 1 16.5 14H14v2.25h1.75a.75.75 0 0 1 0 1.5H14V19a.75.75 0 0 1-1.5 0v-1.25h-1V19a.75.75 0 0 1-1.5 0v-1.25H8.25a.75.75 0 0 1 0-1.5H10V14H7.5A2.5 2.5 0 0 1 5 11.5v-6Zm2.5-1A1 1 0 0 0 6.5 5.5v6a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1h-9Zm1.25 2.25a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5H9.5a.75.75 0 0 1-.75-.75Z" />
            </svg>
            <span>Node</span>
          </div>
        </Skeleton.Node>
      </div>
      <div className="text-sm opacity-70">Avatar: {avatarShape.value}</div>
    </div>
  )
}

const MinimalLoadingSwitchPreview: FC = () => {
  const loading = ref(true)

  return (
    <div className="space-y-4" data-testid="skeleton-loading-switch-demo">
      <button
        type="button"
        className="btn btn-sm btn-primary"
        onClick={() => (loading.value = !loading.value)}
      >
        {loading.value ? '显示内容' : '重新加载'}
      </button>

      <Skeleton
        loading={loading.value}
        active
        avatar
        title={{ width: '46%' }}
        paragraph={{ rows: 3, width: ['100%', '100%', '68%'] }}
      >
        <div className="space-y-2">
          <div className="text-lg font-semibold">Rue Design Skeleton</div>
          <div className="text-sm opacity-70">内容已展示</div>
        </div>
      </Skeleton>
    </div>
  )
}

const MinimalListLayoutPreview: FC = () => {
  const listLoading = ref(true)

  return (
    <div className="space-y-4" data-testid="skeleton-list-layout-demo">
      <button
        type="button"
        className="btn btn-sm btn-primary"
        onClick={() => (listLoading.value = !listLoading.value)}
      >
        {listLoading.value ? '显示列表' : '重新加载列表'}
      </button>

      <div className="space-y-3">
        {['Ops broadcast draft', 'North star metrics', 'Skeleton API notes'].map(title => (
          <div key={title} className="rounded-2xl border border-base-300 bg-base-100/70 p-4">
            <Skeleton
              loading={listLoading.value}
              active
              avatar
              title={{ width: '36%' }}
              paragraph={{ rows: 2, width: ['100%', '78%'] }}
            >
              <div className="space-y-2">
                <div className="font-semibold">{title}</div>
                <div className="text-sm opacity-70">列表骨架保持卡片高度稳定。</div>
              </div>
            </Skeleton>
          </div>
        ))}
      </div>
    </div>
  )
}

afterEach(() => {
  delete (globalThis as { __RUE_TEST_ENABLED_DESIGN_PREVIEWS__?: Set<string> })
    .__RUE_TEST_ENABLED_DESIGN_PREVIEWS__
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('Skeleton actual page', () => {
  it('renders skeleton demos and supports preview/code tab switching', async () => {
    setEnabledPreviews('Skeleton', 'Loading Switch', 'List Layout', 'Semantic slots')

    const container = mountContainer()
    resetActiveRuntime()
    render(<SkeletonPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Skeleton 骨架屏')
      expect(container.textContent).not.toContain('[object Object]')
      expect(container.querySelectorAll('.component-preview').length).toBe(10)
      expect(container.querySelector('[data-testid="skeleton-basic"]')).not.toBeNull()
      expect(container.querySelector('[data-testid="skeleton-list-demo"]')).not.toBeNull()
      expect(container.querySelector('[data-testid="skeleton-semantic-demo"]')).not.toBeNull()
    })

    const loadingDemo = findDemo(container, '# Loading Switch') as HTMLElement | null
    expect(loadingDemo).not.toBeNull()

    await click(findTabButton(loadingDemo!, 'JSX代码'))
    const loadingDemoInCode = findDemo(container, '# Loading Switch') as HTMLElement | null
    expect(loadingDemoInCode!.querySelector('[data-testid="mock-code"]')).not.toBeNull()

    await click(findTabButton(loadingDemoInCode!, '预览'))

    await waitForContent(() => {
      const restoredDemo = findDemo(container, '# Loading Switch') as HTMLElement | null
      expect(restoredDemo!.querySelector('[data-testid="mock-code"]')).toBeNull()
    })
  })

  it('updates the loading demo when its toggle is clicked', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<MinimalLoadingSwitchPreview />, container)

    const loadingDemo = container.querySelector(
      '[data-testid="skeleton-loading-switch-demo"]',
    ) as HTMLElement | null
    expect(loadingDemo).not.toBeNull()

    await click(findButton(loadingDemo!, '显示内容'))
    await waitForContent(() => {
      expect(loadingDemo!.textContent).toContain('重新加载')
      expect(loadingDemo!.textContent).toContain('内容已展示')
      expect(loadingDemo!.textContent).toContain('Rue Design Skeleton')
    })
  })

  it('updates the list demo when its toggle is clicked', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<MinimalListLayoutPreview />, container)

    const listDemo = container.querySelector(
      '[data-testid="skeleton-list-layout-demo"]',
    ) as HTMLElement | null
    expect(listDemo).not.toBeNull()

    await click(findButton(listDemo!, '显示列表'))
    await waitForContent(() => {
      expect(listDemo!.textContent).toContain('重新加载列表')
      expect(listDemo!.textContent).toContain('Ops broadcast draft')
    })
  })

  it('updates the element variant control selected state when options change', async () => {
    setEnabledPreviews('Element Variants')

    const container = mountContainer()
    resetActiveRuntime()
    render(<SkeletonPage />, container)

    let elementsDemo: HTMLElement | null = null

    await waitForContent(() => {
      elementsDemo = findDemo(container, '# Element Variants') as HTMLElement | null
      expect(elementsDemo).not.toBeNull()

      const mdButton = findButton(elementsDemo!, 'size: md') as HTMLButtonElement | null
      const smButton = findButton(elementsDemo!, 'size: sm') as HTMLButtonElement | null
      expect(mdButton?.classList.contains('btn-primary')).toBe(true)
      expect(mdButton?.getAttribute('aria-pressed')).toBe('true')
      expect(smButton?.classList.contains('btn-outline')).toBe(true)
      expect(smButton?.getAttribute('aria-pressed')).toBe('false')
    })

    await click(findButton(elementsDemo!, 'size: sm'))
    await click(findButton(elementsDemo!, 'button: round'))

    await waitForContent(() => {
      const refreshedDemo = findDemo(container, '# Element Variants') as HTMLElement | null
      expect(refreshedDemo).not.toBeNull()

      const smButton = findButton(refreshedDemo!, 'size: sm') as HTMLButtonElement | null
      const mdButton = findButton(refreshedDemo!, 'size: md') as HTMLButtonElement | null
      const defaultButton = findButton(
        refreshedDemo!,
        'button: default',
      ) as HTMLButtonElement | null
      const roundButton = findButton(refreshedDemo!, 'button: round') as HTMLButtonElement | null

      expect(smButton?.classList.contains('btn-primary')).toBe(true)
      expect(smButton?.getAttribute('aria-pressed')).toBe('true')
      expect(mdButton?.classList.contains('btn-outline')).toBe(true)
      expect(mdButton?.getAttribute('aria-pressed')).toBe('false')
      expect(defaultButton?.classList.contains('btn-outline')).toBe(true)
      expect(defaultButton?.getAttribute('aria-pressed')).toBe('false')
      expect(roundButton?.classList.contains('btn-primary')).toBe(true)
      expect(roundButton?.getAttribute('aria-pressed')).toBe('true')
    })
  })

  it('switches the element demo to its alternate visual state', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<MinimalElementVariantsPreview />, container)

    let elementsDemo: HTMLElement | null = null

    await waitForContent(() => {
      elementsDemo = container.querySelector(
        '[data-testid="skeleton-elements-demo"]',
      ) as HTMLElement | null
      expect(elementsDemo).not.toBeNull()

      const image = elementsDemo!.querySelector(
        '[data-testid="skeleton-elements-image"]',
      ) as HTMLElement
      const node = elementsDemo!.querySelector(
        '[data-testid="skeleton-elements-node"]',
      ) as HTMLElement
      const imageWrap = elementsDemo!.querySelector(
        '[data-testid="skeleton-elements-image-wrap"]',
      ) as HTMLElement
      const nodeWrap = elementsDemo!.querySelector(
        '[data-testid="skeleton-elements-node-wrap"]',
      ) as HTMLElement

      expect(imageWrap).not.toBeNull()
      expect(nodeWrap).not.toBeNull()
      expect(imageWrap.contains(image)).toBe(true)
      expect(nodeWrap.contains(node)).toBe(true)
      expect(image.classList.contains('animate-pulse')).toBe(true)
      expect(image.classList.contains('aspect-video')).toBe(true)
      expect(node.classList.contains('animate-pulse')).toBe(true)
      expect(node.querySelectorAll('[data-testid="skeleton-elements-node-icon"]').length).toBe(1)
    })

    await click(findButton(elementsDemo!, '开启 block'))
    await click(findButton(elementsDemo!, 'Avatar: circle'))
    await click(findButton(elementsDemo!, 'Image: video'))
    await click(findButton(elementsDemo!, '关闭 active'))
    await waitForContent(() => {
      expect(elementsDemo!.textContent).toContain('关闭 block')
      expect(elementsDemo!.textContent).toContain('Avatar: square')
      expect(elementsDemo!.textContent).toContain('Image: square')
      expect(elementsDemo!.textContent).toContain('开启 active')

      const image = elementsDemo!.querySelector(
        '[data-testid="skeleton-elements-image"]',
      ) as HTMLElement
      const node = elementsDemo!.querySelector(
        '[data-testid="skeleton-elements-node"]',
      ) as HTMLElement

      expect(image.classList.contains('animate-pulse')).toBe(false)
      expect(image.classList.contains('aspect-square')).toBe(true)
      expect(node.classList.contains('animate-pulse')).toBe(false)
      expect(node.querySelectorAll('[data-testid="skeleton-elements-node-icon"]').length).toBe(1)
      expect(
        elementsDemo!.querySelectorAll('[data-testid="skeleton-elements-node-icon"]').length,
      ).toBe(1)
    })
  })
})
