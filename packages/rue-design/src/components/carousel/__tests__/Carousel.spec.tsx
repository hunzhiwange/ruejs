import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'

import Button from '../../button'
import Carousel from '..'
import {
  click,
  mountContainer,
  waitForContent,
} from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Carousel', () => {
  it('renders with base class', async () => {
    const c = mountContainer()
    resetActiveRuntime()

    mountTestApp(c, () => render(<Carousel>{'hello'}</Carousel>, c))

    await waitForContent(() => {
      const el = c.querySelector('.carousel') as HTMLElement
      expect(el).toBeTruthy()
      expect(el.classList.contains('carousel')).toBe(true)
      expect(el.textContent).toContain('hello')
    })
  })

  it('applies align, direction and custom classes, and renders Item subcomponent', async () => {
    const c = mountContainer()
    resetActiveRuntime()

    mountTestApp(c, () =>
      render(
        <Carousel align={'end'} direction={'vertical'} className={'rounded-box w-64'}>
          <Carousel.Item>
            <img src={'x'} alt={'y'} />
          </Carousel.Item>
          <Carousel.Item>
            <img src={'x2'} alt={'y2'} />
          </Carousel.Item>
        </Carousel>,
        c,
      ),
    )

    await waitForContent(() => {
      const el = c.querySelector('.carousel') as HTMLElement
      expect(el.classList.contains('carousel-end')).toBe(true)
      expect(el.classList.contains('carousel-vertical')).toBe(true)
      expect(el.classList.contains('rounded-box')).toBe(true)
      expect(el.classList.contains('w-64')).toBe(true)
      const items = c.querySelectorAll('.carousel-item')
      expect(items.length).toBe(2)
    })
  })

  it('supports initial activeIndex prop', async () => {
    const c = mountContainer()
    resetActiveRuntime()

    mountTestApp(c, () =>
      render(
        <Carousel
          items={[
            { content: '1', className: 'h-24 w-full bg-base-200' },
            { content: '2', className: 'h-24 w-full bg-base-200' },
            { content: '3', className: 'h-24 w-full bg-base-200' },
          ]}
          activeIndex={2}
          dots
          speed={0}
        />,
        c,
      ),
    )

    await waitForContent(() => {
      const root = c.querySelector('.carousel') as HTMLElement
      expect(root.getAttribute('data-rue-carousel-current')).toBe('2')
      const activeDot = c.querySelector('[aria-current="true"]') as HTMLElement
      expect(activeDot.getAttribute('aria-label')).toBe('Go to slide 3')
    })
  })

  it('supports arrows and dots in uncontrolled mode', async () => {
    const c = mountContainer()
    resetActiveRuntime()

    const spy = vi.fn()
    const items = [
      { content: '1', className: 'h-24 w-full bg-base-200' },
      { content: '2', className: 'h-24 w-full bg-base-200' },
      { content: '3', className: 'h-24 w-full bg-base-200' },
    ]

    mountTestApp(c, () =>
      render(
        <Carousel items={items} arrows={true} dots={true} speed={0} onIndexChange={spy}>
          {null}
        </Carousel>,
        c,
      ),
    )

    await waitForContent(() => {
      expect(c.querySelector('.carousel')).toBeTruthy()
      expect(c.querySelectorAll('.carousel-item').length).toBe(3)
      expect(c.querySelector('[aria-current="true"]')).toBeTruthy()
    })

    await click(c.querySelector('[aria-label="Next slide"]'))

    await waitForContent(() => {
      expect(spy).toHaveBeenCalledWith(1)
      const activeDot = c.querySelector('[aria-current="true"]') as HTMLElement
      expect(activeDot).toBeTruthy()
      expect(activeDot.getAttribute('aria-label')).toBe('Go to slide 2')
    })
  })

  it('derives controls from compiled children after their initial mount', async () => {
    const c = mountContainer()
    resetActiveRuntime()

    mountTestApp(c, () =>
      render(
        <Carousel arrows dots speed={0}>
          <Carousel.Item className="w-full">1</Carousel.Item>
          <Carousel.Item className="w-full">2</Carousel.Item>
          <Carousel.Item className="w-full">3</Carousel.Item>
        </Carousel>,
        c,
      ),
    )

    await waitForContent(() => {
      expect(c.querySelectorAll('.carousel-item').length).toBe(3)
      expect(c.querySelector('[aria-label="Previous slide"]')).toBeTruthy()
      expect(c.querySelector('[aria-label="Next slide"]')).toBeTruthy()
      expect(c.querySelectorAll('[data-rue-carousel-dot]').length).toBe(3)
    })

    await click(c.querySelector('[aria-label="Next slide"]'))

    await waitForContent(() => {
      expect(c.querySelector('.carousel')?.getAttribute('data-rue-carousel-current')).toBe('1')
    })
  })

  it('renders fade children as slides instead of stringifying JSX nodes', async () => {
    const c = mountContainer()
    resetActiveRuntime()

    mountTestApp(c, () =>
      render(
        <Carousel slideCount={2} effect="fade" dots speed={0}>
          <Carousel.Item className="w-full">
            <img className="w-full" src="x" alt="Fade 1" />
          </Carousel.Item>
          <Carousel.Item className="w-full">
            <img className="w-full" src="y" alt="Fade 2" />
          </Carousel.Item>
        </Carousel>,
        c,
      ),
    )

    await waitForContent(() => {
      expect(c.textContent).not.toContain('[object Object]')
      expect(c.querySelectorAll('.carousel-item').length).toBe(2)
      expect(c.querySelector('img[alt="Fade 1"]')).toBeTruthy()
      expect(c.querySelector('img[alt="Fade 2"]')).toBeTruthy()
    })
  })

  it('lets external Button controls drive children slides through apiRef', async () => {
    const c = mountContainer()
    resetActiveRuntime()

    const carouselRef: { current?: any } = { current: undefined }
    const spy = vi.fn()

    mountTestApp(c, () =>
      render(
        <div>
          <Button size="sm" onClick={() => carouselRef.current?.goTo(2)}>
            Go to 3
          </Button>
          <Carousel slideCount={3} apiRef={carouselRef} dots speed={0} onIndexChange={spy}>
            <Carousel.Item className="w-full">
              <div>Slide 1</div>
            </Carousel.Item>
            <Carousel.Item className="w-full">
              <div>Slide 2</div>
            </Carousel.Item>
            <Carousel.Item className="w-full">
              <div>Slide 3</div>
            </Carousel.Item>
          </Carousel>
        </div>,
        c,
      ),
    )

    await waitForContent(() => {
      expect(typeof carouselRef.current?.goTo).toBe('function')
      expect(c.querySelector('[aria-label="Go to slide 1"]')?.getAttribute('aria-current')).toBe(
        'true',
      )
    })

    await click(c.querySelector('button.btn'))

    await waitForContent(() => {
      expect(spy).toHaveBeenCalledWith(2)
      const activeDot = c.querySelector('[aria-current="true"]') as HTMLElement
      expect(activeDot.getAttribute('aria-label')).toBe('Go to slide 3')
    })
  })

  it('renders from items array and exposes ref methods', async () => {
    const c = mountContainer()
    resetActiveRuntime()

    const carouselRef: { current?: any } = { current: undefined }
    const items = [
      { content: <div id={'s1'}>{'1'}</div> },
      { content: <div id={'s2'}>{'2'}</div>, className: 'w-full' },
      { content: <img src={'x'} alt={'y'} /> },
    ]

    mountTestApp(c, () =>
      render(
        <Carousel
          items={items}
          align={'center'}
          direction={'horizontal'}
          dots={true}
          speed={0}
          apiRef={carouselRef}
        />,
        c,
      ),
    )

    await waitForContent(() => {
      const wrapper = c.querySelector('.carousel') as HTMLElement
      expect(wrapper.classList.contains('carousel-center')).toBe(true)
      expect(wrapper.classList.contains('carousel-horizontal')).toBe(true)
      const els = c.querySelectorAll('.carousel-item')
      expect(els.length).toBe(3)
      expect((els[1] as HTMLElement).classList.contains('w-full')).toBe(true)
      expect(c.textContent).not.toContain('[object Object]')
      expect(c.querySelector('#s1')?.textContent).toBe('1')
      expect(c.querySelector('#s2')?.textContent).toBe('2')
      expect(c.querySelector('img[alt="y"]')).toBeTruthy()
      expect(typeof carouselRef.current?.goTo).toBe('function')
      expect(typeof carouselRef.current?.next).toBe('function')
      expect(typeof carouselRef.current?.prev).toBe('function')
    })

    carouselRef.current.goTo(2, true)

    await waitForContent(() => {
      const activeDot = c.querySelector('[aria-current="true"]') as HTMLElement
      expect(activeDot.getAttribute('aria-label')).toBe('Go to slide 3')
    })
  })
})
