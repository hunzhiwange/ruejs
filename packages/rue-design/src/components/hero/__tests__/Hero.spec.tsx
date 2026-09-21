import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'
import Hero from '../index'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Hero', () => {
  it('renders the hero root and applies semantic root props', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Hero
          tone="base-200"
          size="lg"
          backgroundImage="https://example.com/hero.jpg"
          className="rounded-box"
          data-testid="hero-root"
        >
          content
        </Hero>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="hero-root"]') as HTMLElement
      expect(root.classList.contains('hero')).toBe(true)
      expect(root.classList.contains('bg-base-200')).toBe(true)
      expect(root.classList.contains('text-base-content')).toBe(true)
      expect(root.classList.contains('min-h-[30rem]')).toBe(true)
      expect(root.classList.contains('rounded-box')).toBe(true)
      expect(root.style.backgroundImage).toContain('https://example.com/hero.jpg')
    })
  })

  it('renders arbitrary native tags through the as prop', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Hero as="section" overlay data-testid="hero-section">
          section content
        </Hero>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('[data-testid="hero-section"]') as HTMLElement
      expect(root.tagName).toBe('SECTION')
      expect(root.textContent).toContain('section content')
      expect(root.querySelector('.hero-overlay')).not.toBeNull()
    })
  })

  it('renders content, overlay and semantic layout props', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Hero
          overlay={{ tone: 'base-content', opacity: 'soft', blur: true, className: 'rounded-box' }}
        >
          <Hero.Content
            data-testid="content"
            layout="split"
            align="end"
            textAlign="center"
            gap="xl"
          >
            Body
          </Hero.Content>
        </Hero>,
        container,
      ),
    )

    await waitForContent(() => {
      const overlay = container.querySelector('.hero-overlay') as HTMLElement
      const content = container.querySelector('[data-testid="content"]') as HTMLElement

      expect(overlay.classList.contains('hero-overlay')).toBe(true)
      expect(overlay.classList.contains('bg-base-content')).toBe(true)
      expect(overlay.classList.contains('backdrop-blur-sm')).toBe(true)
      expect(overlay.classList.contains('rounded-box')).toBe(true)
      expect(overlay.style.opacity).toBe('0.25')

      expect(content.classList.contains('hero-content')).toBe(true)
      expect(content.classList.contains('flex-col')).toBe(true)
      expect(content.classList.contains('lg:flex-row')).toBe(true)
      expect(content.classList.contains('items-end')).toBe(true)
      expect(content.classList.contains('text-center')).toBe(true)
      expect(content.classList.contains('gap-14')).toBe(true)
    })
  })

  it('renders semantic title, description and actions parts', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Hero>
          <Hero.Content>
            <Hero.Title size="sm" data-testid="title">
              Fast launch
            </Hero.Title>
            <Hero.Description size="lg" data-testid="description">
              Build a readable hero section with semantic blocks.
            </Hero.Description>
            <Hero.Actions stackOnMobile align="center" data-testid="actions">
              <button>Start</button>
              <button>Docs</button>
            </Hero.Actions>
          </Hero.Content>
        </Hero>,
        container,
      ),
    )

    await waitForContent(() => {
      const title = container.querySelector('[data-testid="title"]') as HTMLElement
      const description = container.querySelector('[data-testid="description"]') as HTMLElement
      const actions = container.querySelector('[data-testid="actions"]') as HTMLElement

      expect(title.classList.contains('font-bold')).toBe(true)
      expect(title.classList.contains('text-3xl')).toBe(true)
      expect(title.classList.contains('text-balance')).toBe(true)

      expect(description.classList.contains('max-w-2xl')).toBe(true)
      expect(description.classList.contains('text-lg')).toBe(true)
      expect(description.classList.contains('opacity-80')).toBe(true)

      expect(actions.classList.contains('flex')).toBe(true)
      expect(actions.classList.contains('flex-col')).toBe(true)
      expect(actions.classList.contains('sm:flex-row')).toBe(true)
      expect(actions.classList.contains('items-center')).toBe(true)
      expect(actions.classList.contains('sm:justify-center')).toBe(true)
    })
  })
})
