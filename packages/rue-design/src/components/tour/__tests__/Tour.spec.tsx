import { disposeTestApp, mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import Tour, { buildSpotlightRect } from '../index'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

let activeContainer: HTMLElement | null = null

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

afterEach(() => {
  if (activeContainer) {
    disposeTestApp(activeContainer)
    activeContainer = null
  }

  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('Tour', () => {
  it('calculates spotlight geometry from the current target rect', () => {
    const target = document.createElement('div')
    target.textContent = '高亮目标'
    Object.defineProperty(target, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          x: 120,
          y: 80,
          top: 80,
          left: 120,
          width: 120,
          height: 40,
          right: 240,
          bottom: 120,
          toJSON: () => ({}),
        }) as DOMRect,
    })
    const spotlight = buildSpotlightRect(target, { offset: 10, radius: 16 })

    expect(spotlight).not.toBeNull()
    expect(spotlight?.left).toBe(110)
    expect(spotlight?.top).toBe(70)
    expect(spotlight?.width).toBe(140)
    expect(spotlight?.height).toBe(60)
    expect(spotlight?.radius).toBe(16)
  })

  it('emits next, prev, and mask callbacks in uncontrolled mode', async () => {
    const container = mountContainer()
    activeContainer = container
    resetActiveRuntime()

    const changeSpy = vi.fn()
    const openSpy = vi.fn()

    mountTestApp(container, () =>
      render(
        <Tour
          defaultOpen
          onChange={changeSpy}
          onOpenChange={openSpy}
          steps={[
            {
              placement: 'center',
              title: '第一步',
              description: '先进入第一步。',
            },
            {
              placement: 'center',
              title: '第二步',
              description: '再返回上一页。',
            },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-rue-tour="true"]') as HTMLElement

      expect(root).toBeTruthy()
      expect(root.textContent).toContain('第一步')
    })

    ;(container.querySelector('[data-rue-tour-next="next"]') as HTMLButtonElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )

    await waitForContent(() => {
      expect(changeSpy).toHaveBeenCalledWith(1)
    })

    mountTestApp(container, () =>
      render(
        <Tour
          defaultOpen
          defaultCurrent={1}
          onChange={changeSpy}
          onOpenChange={openSpy}
          steps={[
            {
              placement: 'center',
              title: '第一步',
              description: '先进入第一步。',
            },
            {
              placement: 'center',
              title: '第二步',
              description: '再返回上一页。',
            },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-rue-tour="true"]') as HTMLElement

      expect(root).toBeTruthy()
      expect(root.textContent).toContain('第二步')
    })

    ;(container.querySelector('[data-rue-tour-prev="true"]') as HTMLButtonElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )

    await waitForContent(() => {
      expect(changeSpy).toHaveBeenCalledWith(0)
    })

    ;(container.querySelector('[data-rue-tour-mask-part="full"]') as HTMLDivElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )

    await waitForContent(() => {
      expect(openSpy).toHaveBeenCalledWith(false)
    })
  })

  it('renders in controlled open/current mode', async () => {
    const container = mountContainer()
    activeContainer = container
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Tour
          open={true}
          current={0}
          steps={[
            {
              title: '受控第一步',
              description: '受控模式下也应该正常渲染。',
            },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-rue-tour="true"]') as HTMLElement

      expect(root).toBeTruthy()
      expect(root.getAttribute('data-rue-tour-current')).toBe('0')
      expect(root.textContent).toContain('受控第一步')
    })
  })

  it('supports step-level locale, step close callback, and merged semantic slots', async () => {
    const container = mountContainer()
    activeContainer = container
    resetActiveRuntime()

    const stepClose = vi.fn()
    const globalClose = vi.fn()

    mountTestApp(container, () =>
      render(
        <Tour
          defaultOpen
          defaultCurrent={1}
          locale={{
            previous: '全局上一步',
            finish: '全局完成',
            close: '关闭引导',
          }}
          classNames={{
            section: 'section-root',
            buttons: 'buttons-root',
            prevButton: 'prev-root',
            nextButton: 'next-root',
            body: 'body-root',
            meta: 'meta-root',
          }}
          styles={{
            section: { borderTop: '1px solid rgb(255, 0, 0)' },
            buttons: { justifyContent: 'flex-start' },
            prevButton: { opacity: 0.4 },
            nextButton: { minWidth: '120px' },
            body: { paddingBottom: '2px' },
            meta: { color: 'rgb(0, 128, 0)' },
          }}
          steps={[
            { title: '第一步' },
            {
              title: '第二步',
              description: '需要覆写按钮文案和关闭行为。',
              onClose: stepClose,
              locale: {
                previous: '返回上一步',
                finish: '提交完成',
                close: '关闭第二步',
              },
              classNames: {
                section: 'section-step',
                buttons: 'buttons-step',
                prevButton: 'prev-step',
                nextButton: 'next-step',
                body: 'body-step',
                meta: 'meta-step',
              },
              styles: {
                section: { paddingBottom: '12px' },
                buttons: { gap: '12px' },
                prevButton: { letterSpacing: '1px' },
                nextButton: { letterSpacing: '2px' },
                body: { paddingTop: '4px' },
                meta: { backgroundColor: 'rgb(240, 240, 240)' },
              },
            },
          ]}
          onClose={globalClose}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const section = container.querySelector('[data-rue-tour-section="true"]') as HTMLElement
      const body = container.querySelector('[data-rue-tour-body="true"]') as HTMLElement
      const meta = container.querySelector('[data-rue-tour-meta="true"]') as HTMLElement
      const buttons = container.querySelector('[data-rue-tour-buttons="true"]') as HTMLElement
      const prevButton = container.querySelector('[data-rue-tour-prev="true"]') as HTMLButtonElement
      const nextButton = container.querySelector(
        '[data-rue-tour-next="finish"]',
      ) as HTMLButtonElement
      const closeButton = container.querySelector(
        '[data-rue-tour-close="true"]',
      ) as HTMLButtonElement

      expect(section.classList.contains('section-root')).toBe(true)
      expect(section.classList.contains('section-step')).toBe(true)
      expect(body.classList.contains('body-root')).toBe(true)
      expect(body.classList.contains('body-step')).toBe(true)
      expect(meta.classList.contains('meta-root')).toBe(true)
      expect(meta.classList.contains('meta-step')).toBe(true)
      expect(buttons.classList.contains('buttons-root')).toBe(true)
      expect(buttons.classList.contains('buttons-step')).toBe(true)
      expect(prevButton.classList.contains('prev-root')).toBe(true)
      expect(prevButton.classList.contains('prev-step')).toBe(true)
      expect(nextButton.classList.contains('next-root')).toBe(true)
      expect(nextButton.classList.contains('next-step')).toBe(true)

      expect(closeButton.getAttribute('aria-label')).toBe('关闭第二步')
      expect(prevButton.textContent).toContain('返回上一步')
      expect(nextButton.textContent).toContain('提交完成')

      expect(section.style.borderTopWidth).toBe('1px')
      expect(section.style.borderTopColor).toBe('rgb(255, 0, 0)')
      expect(section.style.paddingBottom).toBe('12px')
      expect(body.style.paddingTop).toBe('4px')
      expect(body.style.paddingBottom).toBe('2px')
      expect(meta.style.color).toBe('rgb(0, 128, 0)')
      expect(meta.style.backgroundColor).toBe('rgb(240, 240, 240)')
      expect(buttons.style.justifyContent).toBe('flex-start')
      expect(buttons.style.gap).toBe('12px')
      expect(prevButton.style.opacity).toBe('0.4')
      expect(prevButton.style.letterSpacing).toBe('1px')
      expect(nextButton.style.minWidth).toBe('120px')
      expect(nextButton.style.letterSpacing).toBe('2px')
    })

    ;(container.querySelector('[data-rue-tour-close="true"]') as HTMLButtonElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )

    await waitForContent(() => {
      expect(stepClose).toHaveBeenCalledTimes(1)
      expect(globalClose).toHaveBeenCalledTimes(1)
    })
  })
})
