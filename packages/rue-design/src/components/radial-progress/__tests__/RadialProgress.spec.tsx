import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import RadialProgress from '..'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('RadialProgress', () => {
  it('renders an accessible root with css variables and a daisyui compatibility node', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(<RadialProgress value={70}>70%</RadialProgress>, container),
    )

    await waitForContent(() => {
      const root = container.querySelector('.rue-radial-progress') as HTMLElement
      expect(root).toBeTruthy()
      expect(root.getAttribute('role')).toBe('progressbar')
      expect(root.getAttribute('aria-valuenow')).toBe('70')
      expect(root.style.getPropertyValue('--value')).toBe('70')
      expect(root.textContent).toContain('70%')
      expect(container.querySelectorAll('.radial-progress')).toHaveLength(1)
    })
  })

  it('merges size, thickness and custom style/className', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <RadialProgress
          value={55}
          size="12rem"
          thickness="2px"
          style={{ borderWidth: '4px' }}
          className="text-primary"
        >
          demo
        </RadialProgress>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('.rue-radial-progress') as HTMLElement
      expect(root.classList.contains('text-primary')).toBe(true)
      expect(root.style.getPropertyValue('--size')).toBe('12rem')
      expect(root.style.getPropertyValue('--thickness')).toBe('2px')
      expect(root.style.borderWidth).toBe('4px')
      expect(root.style.width).toBe('12rem')
      expect(root.style.height).toBe('12rem')
    })
  })

  it('allows overriding aria-valuenow explicitly', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <RadialProgress value={70} aria-valuenow="42" aria-label="Upload progress">
          custom
        </RadialProgress>,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('.rue-radial-progress') as HTMLElement
      expect(root.getAttribute('aria-valuenow')).toBe('42')
      expect(root.getAttribute('aria-label')).toBe('Upload progress')
    })
  })

  it('supports dashboard mode with success formatting', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <RadialProgress
          type="dashboard"
          percent={78}
          success={{ percent: 42 }}
          format={(percentValue, successValue) => `${successValue}% / ${percentValue}%`}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('.rue-radial-progress') as HTMLElement
      const paths = root.querySelectorAll('svg path')

      expect(root.getAttribute('data-progress-type')).toBe('dashboard')
      expect(root.textContent).toContain('42% / 78%')
      expect(paths.length).toBe(3)
    })
  })

  it('renders stepped mode and hides indicator when showInfo is false', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <RadialProgress percent={60} steps={{ count: 6, gap: 4 }} showInfo={false} />,
        container,
      ),
    )

    await waitForContent(() => {
      const root = container.querySelector('.rue-radial-progress') as HTMLElement
      const paths = root.querySelectorAll('svg path')

      expect(root.textContent?.trim() ?? '').toBe('')
      expect(paths.length).toBe(7)
    })
  })
})
