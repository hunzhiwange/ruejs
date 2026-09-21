import { PRESENTED_IMAGE_DEFAULT } from '../index'
import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import Empty from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Empty', () => {
  it('renders the default illustration and description', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () => render(<Empty data-testid="empty-basic" />, container))

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="empty-basic"]') as HTMLElement
      expect(element).toBeTruthy()
      expect(element.dataset.rueEmptySize).toBe('md')
      expect(element.dataset.rueEmptyVariant).toBe('surface')
      expect(element.textContent).toContain('暂无数据')
      expect(element.querySelector('[data-rue-empty-illustration="default"]')).toBeTruthy()
      expect(element.querySelector('[data-rue-empty-description="true"]')).toBeTruthy()
    })
  })

  it('renders string images together with semantic classNames and styles', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Empty
          data-testid="empty-string-image"
          image="https://example.com/empty.svg"
          description="暂无素材"
          imageStyle={{ maxWidth: '140px' }}
          classNames={{ image: 'custom-image-shell', footer: 'custom-footer-shell' }}
          styles={{ root: { paddingTop: '40px' } }}
        >
          <button id="create-asset" type="button">
            新建素材
          </button>
        </Empty>,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="empty-string-image"]') as HTMLElement
      const imageShell = element.querySelector('[data-rue-empty-image="true"]') as HTMLElement
      const footer = element.querySelector('[data-rue-empty-footer="true"]') as HTMLElement
      const image = element.querySelector('img') as HTMLImageElement

      expect(imageShell.className).toContain('custom-image-shell')
      expect(footer.className).toContain('custom-footer-shell')
      expect(element.style.paddingTop).toBe('40px')
      expect(image.src).toContain('https://example.com/empty.svg')
      expect(image.alt).toBe('暂无素材')
      expect(image.draggable).toBe(false)
      expect(imageShell.style.maxWidth).toBe('140px')
      expect(element.querySelector('#create-asset')?.textContent).toBe('新建素材')
    })
  })

  it('supports preset images with outline variant and start alignment', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Empty
          data-testid="empty-simple"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={false}
          align="start"
          variant="outline"
          size="large"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="empty-simple"]') as HTMLElement
      expect(element.dataset.rueEmptyAlign).toBe('start')
      expect(element.dataset.rueEmptyVariant).toBe('outline')
      expect(element.dataset.rueEmptySize).toBe('lg')
      expect(element.classList.contains('text-left')).toBe(true)
      expect(element.querySelector('[data-rue-empty-illustration="simple"]')).toBeTruthy()
      expect(element.querySelector('[data-rue-empty-description="true"]')).toBeNull()
    })
  })

  it('renders custom JSX image and description props without stringifying slot factories', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Empty
          data-testid="empty-custom-content"
          image={<svg data-testid="custom-empty-image" />}
          description={
            <div data-testid="custom-empty-description">
              <strong>同步队列还是空的</strong>
              <span>添加素材后会自动生成批次。</span>
            </div>
          }
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="empty-custom-content"]') as HTMLElement
      expect(element.querySelector('[data-testid="custom-empty-image"]')).toBeTruthy()
      expect(element.querySelector('[data-testid="custom-empty-description"]')).toBeTruthy()
      expect(element.textContent).toContain('同步队列还是空的')
      expect(element.textContent).not.toContain('_$mountCompiledSlotFactory')
    })
  })

  it('skips wrappers for empty image, description, and footer payloads', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <div>
          <Empty data-testid="empty-hidden" image={null} description={null}>
            {false}
          </Empty>
          <PRESENTED_IMAGE_DEFAULT size="sm" />
        </div>,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector('[data-testid="empty-hidden"]') as HTMLElement
      expect(element.querySelector('[data-rue-empty-image="true"]')).toBeNull()
      expect(element.querySelector('[data-rue-empty-description="true"]')).toBeNull()
      expect(element.querySelector('[data-rue-empty-footer="true"]')).toBeNull()
      expect(container.querySelector('[data-rue-empty-illustration="default"]')).toBeTruthy()
    })
  })
})
