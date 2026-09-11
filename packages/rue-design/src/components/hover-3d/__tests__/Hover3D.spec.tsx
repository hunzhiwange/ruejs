import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { render } from '@rue-js/rue'
import Hover3D from '..'

const waitForRender = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const OverlayFragment = () => (
  <>
    {Array.from({ length: 8 }).map((_, index) => (
      <div key={index} aria-hidden="true" data-hover3d-overlay="" />
    ))}
  </>
)

const HoverRoot = ({ children }: { children?: any }) => (
  <div className="hover-3d">
    {children}
    <OverlayFragment />
  </div>
)

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Hover3D', () => {
  it('renders with base class and eight overlays', async () => {
    const container = document.createElement('div')
    mountTestApp(container, () =>
      render(
        <Hover3D>
          <figure>
            <img src="x" alt="y" />
          </figure>
        </Hover3D>,
        container,
      ),
    )
    await waitForRender()

    const root = container.querySelector('.hover-3d') as HTMLElement
    expect(root).toBeTruthy()
    expect(root.children.length).toBe(9)
    expect(root.firstElementChild?.tagName).toBe('FIGURE')
    expect(root.querySelectorAll(':scope > [data-hover3d-overlay]')).toHaveLength(8)
  })

  it('keeps compiled fragments flattened as direct children', async () => {
    const container = document.createElement('div')
    mountTestApp(container, () =>
      render(
        <HoverRoot>
          <figure>
            <img src="x" alt="y" />
          </figure>
        </HoverRoot>,
        container,
      ),
    )
    await waitForRender()

    const root = container.querySelector('.hover-3d') as HTMLElement
    expect(root.children.length).toBe(9)
    expect(root.firstElementChild?.tagName).toBe('FIGURE')
    expect(root.querySelectorAll(':scope > [data-hover3d-overlay]')).toHaveLength(8)
  })

  it('renders an anchor and supplies a safe rel default', async () => {
    const container = document.createElement('div')
    mountTestApp(container, () =>
      render(
        <Hover3D href="/docs" target="_blank" className="cursor-pointer">
          content
        </Hover3D>,
        container,
      ),
    )
    await waitForRender()

    const root = container.querySelector('a.hover-3d') as HTMLAnchorElement
    expect(root.getAttribute('href')).toBe('/docs')
    expect(root.getAttribute('target')).toBe('_blank')
    expect(root.getAttribute('rel')).toBe('noreferrer')
    expect(root.classList.contains('cursor-pointer')).toBe(true)
  })

  it('supports surface and root prop passthrough', async () => {
    const container = document.createElement('div')
    mountTestApp(container, () =>
      render(
        <Hover3D
          id="hover-root"
          data-tone="tilt"
          surfaceAs="figure"
          surfaceClassName="rounded-2xl"
          surfaceProps={{ id: 'hover-surface', 'data-role': 'surface' }}
        >
          <img src="x" alt="wrapped surface" />
        </Hover3D>,
        container,
      ),
    )
    await waitForRender()

    const root = container.querySelector('#hover-root.hover-3d') as HTMLElement
    expect(root.getAttribute('data-tone')).toBe('tilt')
    expect(root.children.length).toBe(9)
    const surface = root.querySelector(':scope > figure[data-hover3d-surface]') as HTMLElement
    expect(surface.id).toBe('hover-surface')
    expect(surface.getAttribute('data-role')).toBe('surface')
    expect(surface.classList.contains('rounded-2xl')).toBe(true)
  })

  it('applies overlay class names', async () => {
    const container = document.createElement('div')
    mountTestApp(container, () =>
      render(<Hover3D overlayClassName="overlay-zone">content</Hover3D>, container),
    )
    await waitForRender()

    const overlays = Array.from(
      container.querySelectorAll('.hover-3d > [data-hover3d-overlay]'),
    ) as HTMLElement[]
    expect(overlays).toHaveLength(8)
    overlays.forEach(overlay => expect(overlay.classList.contains('overlay-zone')).toBe(true))
  })

  it('can disable overlays', async () => {
    const container = document.createElement('div')
    mountTestApp(container, () => render(<Hover3D overlays={false}>content</Hover3D>, container))
    await waitForRender()

    expect(container.querySelectorAll('.hover-3d > [data-hover3d-overlay]')).toHaveLength(0)
  })
})
