import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import Mask from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Mask', () => {
  it('renders the default img host with mask classes', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Mask
          src="https://picsum.photos/160/160"
          alt="Avatar"
          className="w-20 h-20"
          data-testid="mask-image"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const el = container.querySelector('[data-testid="mask-image"]') as HTMLImageElement
      expect(el.tagName.toLowerCase()).toBe('img')
      expect(el.classList.contains('mask')).toBe(true)
      expect(el.classList.contains('mask-squircle')).toBe(true)
      expect(el.classList.contains('w-20')).toBe(true)
      expect(el.classList.contains('object-cover')).toBe(true)
    })
  })

  it('applies half modifier variants and aliases', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(<Mask shape="star" half="end" data-testid="mask-half" />, container),
    )

    await waitForContent(() => {
      const el = container.querySelector('[data-testid="mask-half"]') as HTMLElement
      expect(el.classList.contains('mask-star')).toBe(true)
      expect(el.classList.contains('mask-half-2')).toBe(true)
    })
  })

  it('supports arbitrary host elements', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Mask
          as="div"
          shape="diamond"
          tone="primary"
          size="lg"
          ring={true}
          shadow={true}
          interactive={true}
          className="grid place-content-center"
          data-testid="mask-box"
        >
          content
        </Mask>,
        container,
      ),
    )

    await waitForContent(() => {
      const el = container.querySelector('[data-testid="mask-box"]') as HTMLElement
      expect(el.tagName.toLowerCase()).toBe('div')
      expect(el.classList.contains('mask-diamond')).toBe(true)
      expect(el.classList.contains('bg-primary')).toBe(true)
      expect(el.classList.contains('size-32')).toBe(true)
      expect(el.classList.contains('ring-2')).toBe(true)
      expect(el.classList.contains('shadow-xl')).toBe(true)
      expect(el.classList.contains('hover:-translate-y-1')).toBe(true)
      expect(el.textContent).toContain('content')
    })
  })

  it('supports semantic size, fit and border helpers', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Mask
          shape="hexagon"
          size="2xl"
          fit="contain"
          bordered={true}
          data-testid="mask-sized"
          src="https://picsum.photos/200/200"
          alt="Sized"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const el = container.querySelector('[data-testid="mask-sized"]') as HTMLImageElement
      expect(el.classList.contains('mask-hexagon')).toBe(true)
      expect(el.classList.contains('size-52')).toBe(true)
      expect(el.classList.contains('object-contain')).toBe(true)
      expect(el.classList.contains('ring-1')).toBe(true)
    })
  })

  it('renders media content and captions with native host branches', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <div>
          <Mask
            src="https://picsum.photos/180/180"
            alt="Captioned"
            content="Overlay"
            caption="Figure caption"
            data-testid="mask-figure"
          />
          <Mask
            as="div"
            src="https://picsum.photos/180/180"
            alt="Wrapped"
            content="Panel"
            caption="Div caption"
            data-testid="mask-div-wrapper"
          />
        </div>,
        container,
      ),
    )

    await waitForContent(() => {
      const figure = container.querySelector('[data-testid="mask-figure"]') as HTMLElement
      const divWrapper = container.querySelector('[data-testid="mask-div-wrapper"]') as HTMLElement

      expect(figure.tagName.toLowerCase()).toBe('figure')
      expect(figure.querySelector('figcaption')?.textContent).toBe('Figure caption')
      expect(figure.textContent).toContain('Overlay')
      expect(divWrapper.tagName.toLowerCase()).toBe('div')
      expect(divWrapper.querySelector('figcaption')).toBeNull()
      expect(divWrapper.textContent).toContain('Div caption')
      expect(divWrapper.textContent).toContain('Panel')
    })
  })
})
