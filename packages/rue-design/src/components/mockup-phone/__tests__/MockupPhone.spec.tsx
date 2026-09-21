import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import MockupPhone from '../index'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('MockupPhone', () => {
  it('renders the root with base class and custom className', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <MockupPhone className="border-accent" data-testid="phone-root">
          <MockupPhone.Camera />
          <MockupPhone.Display>Glowtime</MockupPhone.Display>
        </MockupPhone>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="phone-root"]') as HTMLElement
      expect(root.classList.contains('mockup-phone')).toBe(true)
      expect(root.classList.contains('border-accent')).toBe(true)
      expect(root.textContent).toContain('Glowtime')
    })
  })

  it('renders camera and display parts and forwards attrs', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <MockupPhone>
          <MockupPhone.Camera data-testid="phone-camera" />
          <MockupPhone.Display className="bg-neutral text-white" data-testid="phone-display">
            <div>Wallpaper</div>
          </MockupPhone.Display>
        </MockupPhone>,
        container,
      ),
    )

    await waitForContent(() => {
      const camera = container.querySelector('[data-testid="phone-camera"]') as HTMLElement
      const display = container.querySelector('[data-testid="phone-display"]') as HTMLElement
      expect(camera.classList.contains('mockup-phone-camera')).toBe(true)
      expect(display.classList.contains('mockup-phone-display')).toBe(true)
      expect(display.classList.contains('bg-neutral')).toBe(true)
      expect(display.textContent).toContain('Wallpaper')
    })
  })

  it('renders shorthand display mode with size, tone and content wrapper', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <MockupPhone
          size="small"
          color="primary"
          display={{
            className: 'bg-neutral text-white',
            contentClassName: 'overlay-shell',
            children: (
              <div>
                <strong>Dashboard</strong>
                <span data-testid="nested-display-child"> ready</span>
              </div>
            ),
          }}
          data-testid="phone-short"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="phone-short"]') as HTMLElement
      const camera = root.querySelector('.mockup-phone-camera') as HTMLElement
      const display = root.querySelector('.mockup-phone-display') as HTMLElement
      const overlay = root.querySelector('.overlay-shell') as HTMLElement
      expect(root.classList.contains('mockup-phone')).toBe(true)
      expect(root.classList.contains('w-60')).toBe(true)
      expect(root.classList.contains('border-primary')).toBe(true)
      expect(camera).toBeTruthy()
      expect(display.classList.contains('bg-neutral')).toBe(true)
      expect(overlay.textContent).toContain('Dashboard')
      expect(root.querySelector('[data-testid="nested-display-child"]')?.textContent).toBe('ready')
    })
  })

  it('supports hiding camera and rendering built-in wallpaper image', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <MockupPhone
          camera={false}
          display={{
            src: 'https://example.com/wallpaper.png',
            alt: 'Rue wallpaper',
            imgClassName: 'wallpaper-img',
          }}
          data-testid="phone-image"
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="phone-image"]') as HTMLElement
      const camera = root.querySelector('.mockup-phone-camera')
      const display = root.querySelector('.mockup-phone-display') as HTMLElement
      const image = root.querySelector('.wallpaper-img') as HTMLImageElement
      expect(camera).toBeNull()
      expect(display).toBeTruthy()
      expect(image.getAttribute('src')).toBe('https://example.com/wallpaper.png')
      expect(image.getAttribute('alt')).toBe('Rue wallpaper')
    })
  })
})
