import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'

import { render, setReactiveScheduling } from '@rue-js/rue'
import HoverGallery from '../index'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('HoverGallery', () => {
  it('renders figure with base class and images', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    mountTestApp(c, () =>
      render(
        <HoverGallery>
          <img src={'a.webp'} alt={'x'} />
          <img src={'b.webp'} alt={'y'} />
        </HoverGallery>,
        c,
      ),
    )

    await waitForContent(() => {
      const fig = c.querySelector('figure.hover-gallery') as HTMLElement
      expect(fig).toBeTruthy()
      expect(fig.classList.contains('hover-gallery')).toBe(true)
      const imgs = fig.querySelectorAll('img')
      expect(imgs.length).toBe(2)
    })
  })

  it('supports div tag via as prop', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    mountTestApp(c, () =>
      render(
        <HoverGallery as={'div'}>
          <img src={'a.webp'} />
        </HoverGallery>,
        c,
      ),
    )

    await waitForContent(() => {
      const el = c.querySelector('div.hover-gallery') as HTMLElement
      expect(el).toBeTruthy()
    })
  })

  it('appends custom className', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    mountTestApp(c, () =>
      render(
        <HoverGallery className={'max-w-60'}>
          <img src={'a.webp'} />
        </HoverGallery>,
        c,
      ),
    )

    await waitForContent(() => {
      const fig = c.querySelector('.hover-gallery') as HTMLElement
      expect(fig.classList.contains('max-w-60')).toBe(true)
    })
  })

  it('renders images from items array of strings', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    mountTestApp(c, () => render(<HoverGallery items={['a.webp', 'b.webp', 'c.webp']} />, c))

    await waitForContent(() => {
      const fig = c.querySelector('figure.hover-gallery') as HTMLElement
      expect(fig).toBeTruthy()
      const imgs = fig.querySelectorAll('img')
      expect(imgs.length).toBe(3)
      expect((imgs[0] as HTMLElement).getAttribute('class')).not.toBe('undefined')
    })
  })

  it('renders images from item data', async () => {
    const c = mountContainer()
    resetActiveRuntime()
    mountTestApp(c, () =>
      render(
        <HoverGallery
          items={[
            { src: 'a.webp', alt: 'a' },
            { src: 'b.webp', className: 'rounded' },
            { src: 'n.webp', alt: 'n' },
          ]}
        />,
        c,
      ),
    )

    await waitForContent(() => {
      const fig = c.querySelector('figure.hover-gallery') as HTMLElement
      const imgs = fig.querySelectorAll('img')
      expect(imgs.length).toBe(3)
      expect((imgs[1] as HTMLElement).classList.contains('rounded')).toBe(true)
    })
  })

  it('supports shared image classes and fit presets', async () => {
    const c = mountContainer()
    resetActiveRuntime()

    mountTestApp(c, () =>
      render(
        <HoverGallery
          fit={'contain'}
          imageClassName={'rounded-box'}
          items={['a.webp', { src: 'b.webp', className: 'ring-1' }]}
        />,
        c,
      ),
    )

    await waitForContent(() => {
      const imgs = c.querySelectorAll('figure.hover-gallery img')
      expect(imgs.length).toBe(2)
      expect((imgs[0] as HTMLElement).classList.contains('object-contain')).toBe(true)
      expect((imgs[0] as HTMLElement).classList.contains('rounded-box')).toBe(true)
      expect((imgs[1] as HTMLElement).classList.contains('ring-1')).toBe(true)
    })
  })

  it('renders optional guide overlay with labels', async () => {
    const c = mountContainer()
    resetActiveRuntime()

    mountTestApp(c, () =>
      render(
        <HoverGallery
          showGuide={true}
          wrapperClassName={'rounded-box overflow-hidden'}
          guideLabels={['侧面', '背面']}
          items={['a.webp', { src: 'b.webp', label: '不应覆盖' }, 'c.webp']}
        />,
        c,
      ),
    )

    await waitForContent(() => {
      const wrapper = c.querySelector('.rounded-box.overflow-hidden') as HTMLElement
      expect(wrapper).toBeTruthy()
      expect(wrapper.querySelector('figure.hover-gallery')).toBeTruthy()

      const guide = wrapper.querySelector('[aria-hidden="true"]') as HTMLElement
      expect(guide).toBeTruthy()
      expect(guide.textContent).toContain('侧面')
      expect(guide.textContent).toContain('背面')
      expect(guide.style.gridTemplateColumns).toContain('repeat(2')
    })
  })
})
