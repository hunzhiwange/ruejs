import { afterEach, describe, expect, it, vi } from 'vitest'

import { setReactiveScheduling } from '../src'
import CarouselPage from '../../../app/pages/design/Carousel'
import { render, click, mountContainer, waitForContent } from './page-test-utils'
import { findDemo, resetActiveRuntime } from './design-page-test-utils'

vi.mock('../../../app/pages/site/SidebarPlaygroundDesign', () => ({
  default: (props: { children?: unknown }) => (
    <div data-testid="mock-sidebar-design">{props.children}</div>
  ),
}))

vi.mock('../../../app/pages/site/components/Code', () => ({
  default: () => null,
}))

setReactiveScheduling('sync')

let restoreCarouselLayoutMock: (() => void) | undefined

afterEach(() => {
  restoreCarouselLayoutMock?.()
  restoreCarouselLayoutMock = undefined
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

const findButtonByText = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button')).find(
    button => button.textContent?.trim() === label,
  ) ?? null

const findIndicatorButton = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll('button.btn')).find(
    button => button.textContent?.trim() === label,
  ) as HTMLElement | null

const installHorizontalCarouselLayoutMock = (viewportWidth: number) => {
  const descriptors = {
    clientWidth: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth'),
    offsetLeft: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetLeft'),
    offsetWidth: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth'),
    scrollWidth: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth'),
  }
  const slideWidth = (element: Element) =>
    element.classList.contains('w-full') ? viewportWidth : 600
  const trackScrollWidth = (track: Element) =>
    Array.from(track.children).reduce(
      (total, child) =>
        child instanceof HTMLElement && child.classList.contains('carousel-item')
          ? total + slideWidth(child)
          : total,
      0,
    )

  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return this instanceof HTMLElement && this.classList.contains('carousel')
        ? viewportWidth
        : (descriptors.clientWidth?.get?.call(this) ?? 0)
    },
  })
  Object.defineProperty(HTMLElement.prototype, 'offsetLeft', {
    configurable: true,
    get() {
      if (!(this instanceof HTMLElement) || !this.classList.contains('carousel-item')) {
        return descriptors.offsetLeft?.get?.call(this) ?? 0
      }

      let offset = 0
      let sibling = this.previousElementSibling
      while (sibling) {
        if (sibling instanceof HTMLElement && sibling.classList.contains('carousel-item')) {
          offset += slideWidth(sibling)
        }
        sibling = sibling.previousElementSibling
      }
      return offset
    },
  })
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get() {
      return this instanceof HTMLElement && this.classList.contains('carousel-item')
        ? slideWidth(this)
        : (descriptors.offsetWidth?.get?.call(this) ?? 0)
    },
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get() {
      return this instanceof HTMLElement && this.dataset.rueCarouselTrack === 'true'
        ? trackScrollWidth(this)
        : (descriptors.scrollWidth?.get?.call(this) ?? 0)
    },
  })

  return () => {
    ;(['clientWidth', 'offsetLeft', 'offsetWidth', 'scrollWidth'] as const).forEach(key => {
      const descriptor = descriptors[key]
      if (descriptor) {
        Object.defineProperty(HTMLElement.prototype, key, descriptor)
      } else {
        delete (HTMLElement.prototype as unknown as Record<string, unknown>)[key]
      }
    })
  }
}

describe('Carousel actual page', () => {
  it('keeps fade slides renderable and external api controls synchronized', async () => {
    const container = mountContainer()
    resetActiveRuntime()
    render(<CarouselPage />, container)

    await waitForContent(() => {
      expect(container.textContent).toContain('Carousel 跑马灯')
    })

    const indicatorDemo = findDemo(container, '# Carousel with indicator buttons') as HTMLElement
    const methodsDemo = findDemo(container, '# 受控切换 / API 方法') as HTMLElement
    const effectsDemo = findDemo(container, '# 效果与位置增强') as HTMLElement

    expect(indicatorDemo).toBeTruthy()
    expect(methodsDemo).toBeTruthy()
    expect(effectsDemo).toBeTruthy()

    await waitForContent(() => {
      expect(effectsDemo.textContent).not.toContain('[object Object]')
      expect(effectsDemo.querySelector('.carousel img')).toBeTruthy()
    })

    restoreCarouselLayoutMock = installHorizontalCarouselLayoutMock(1920)

    await click(findButtonByText(methodsDemo, 'Go to 3'))

    await waitForContent(() => {
      const carousel = methodsDemo.querySelector('.carousel') as HTMLElement
      const track = carousel.querySelector('[data-rue-carousel-track="true"]') as HTMLElement
      expect(carousel.getAttribute('data-rue-carousel-current')).toBe('2')
      expect(methodsDemo.textContent).toContain('当前索引：2')
      expect(methodsDemo.querySelector('[aria-current="true"]')?.getAttribute('aria-label')).toBe(
        'Go to slide 3',
      )
      expect(track.style.transform).toBe('translate3d(-3840px, 0, 0)')
    })

    await click(findButtonByText(indicatorDemo, '4'))

    await waitForContent(() => {
      const carousel = indicatorDemo.querySelector('.carousel') as HTMLElement
      const track = carousel.querySelector('[data-rue-carousel-track="true"]') as HTMLElement
      expect(carousel.getAttribute('data-rue-carousel-current')).toBe('3')
      expect(indicatorDemo.querySelector('[aria-current="true"]')?.getAttribute('aria-label')).toBe(
        'Go to slide 4',
      )
      expect(track.style.transform).toBe('translate3d(-5760px, 0, 0)')
      expect(findIndicatorButton(indicatorDemo, '4')?.classList.contains('btn-primary')).toBe(true)
      expect(findIndicatorButton(indicatorDemo, '1')?.classList.contains('btn-primary')).toBe(false)
    })

    await click(indicatorDemo.querySelector('[aria-label="Go to slide 2"]'))

    await waitForContent(() => {
      const carousel = indicatorDemo.querySelector('.carousel') as HTMLElement
      const track = carousel.querySelector('[data-rue-carousel-track="true"]') as HTMLElement
      expect(carousel.getAttribute('data-rue-carousel-current')).toBe('1')
      expect(indicatorDemo.querySelector('[aria-current="true"]')?.getAttribute('aria-label')).toBe(
        'Go to slide 2',
      )
      expect(track.style.transform).toBe('translate3d(-1920px, 0, 0)')
      expect(findIndicatorButton(indicatorDemo, '2')?.classList.contains('btn-primary')).toBe(true)
      expect(findIndicatorButton(indicatorDemo, '4')?.classList.contains('btn-primary')).toBe(false)
    })
  })
})
