import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'

import Grid from '../index'

setReactiveScheduling('sync')

const waitGridRender = () => new Promise(resolve => setTimeout(resolve, 0))
const initialViewportWidth = window.innerWidth

const setViewportWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  })
  window.dispatchEvent(new Event('resize'))
}

afterEach(() => {
  document.body.innerHTML = ''
  setViewportWidth(initialViewportWidth)
})

describe('Grid', () => {
  it('renders row and col with base classes', async () => {
    const container = document.createElement('div')
    mountTestApp(container, () =>
      render(
        <Grid>
          <Grid.Col span={12}>{'Alpha'}</Grid.Col>
          <Grid.Col span={12}>{'Beta'}</Grid.Col>
        </Grid>,
        container,
      ),
    )
    await waitGridRender()

    const row = container.querySelector('[data-rue-grid-row]') as HTMLElement
    const cols = container.querySelectorAll('[data-rue-grid-col]')

    expect(row).toBeTruthy()
    expect(row.classList.contains('rue-grid-row')).toBe(true)
    expect(cols).toHaveLength(2)
    expect(container.textContent).toContain('Alpha')
    expect(container.textContent).toContain('Beta')
  })

  it('applies gutter, justify, and align styles on row', async () => {
    const container = document.createElement('div')
    mountTestApp(container, () =>
      render(
        <Grid gutter={[16, 24]} justify={'space-between'} align={'middle'}>
          <Grid.Col span={12}>{'Metrics'}</Grid.Col>
        </Grid>,
        container,
      ),
    )
    await waitGridRender()

    const row = container.querySelector('[data-rue-grid-row]') as HTMLElement
    const col = container.querySelector('[data-rue-grid-col]') as HTMLElement
    const rowStyle = (row.getAttribute('style') ?? '').replace(/:\s+/g, ':')
    const colStyle = (col.getAttribute('style') ?? '').replace(/:\s+/g, ':')

    expect(rowStyle).toContain('justify-content:space-between')
    expect(rowStyle).toContain('align-items:center')
    expect(row.style.marginLeft).toBe('-8px')
    expect(row.style.marginTop).toBe('-12px')
    expect(rowStyle).toContain('--rue-grid-gutter-x:16px')
    expect(rowStyle).toContain('--rue-grid-gutter-y:24px')
    expect(col.style.padding).toBe(
      'calc(var(--rue-grid-gutter-y, 0px) / 2) calc(var(--rue-grid-gutter-x, 0px) / 2)',
    )
  })

  it('applies span, offset, order, and flex values on col', async () => {
    const container = document.createElement('div')
    mountTestApp(container, () =>
      render(
        <Grid>
          <Grid.Col span={12} offset={6} order={2}>
            {'Content'}
          </Grid.Col>
          <Grid.Col flex={'280px'}>{'Aside'}</Grid.Col>
        </Grid>,
        container,
      ),
    )
    await waitGridRender()

    const [contentCol, asideCol] = Array.from(
      container.querySelectorAll('[data-rue-grid-col]'),
    ) as HTMLElement[]

    expect(contentCol.style.flex).toBe('0 0 50%')
    expect(contentCol.style.maxWidth).toBe('50%')
    expect(contentCol.style.marginLeft).toBe('25%')
    expect(contentCol.style.order).toBe('2')
    expect(asideCol.style.flex).toBe('0 0 280px')
  })

  it('updates responsive span after resize', async () => {
    setViewportWidth(480)

    const container = document.createElement('div')
    mountTestApp(container, () =>
      render(
        <Grid.Col span={8} xs={24} md={12}>
          {'Responsive'}
        </Grid.Col>,
        container,
      ),
    )
    await waitGridRender()

    const col = container.querySelector('[data-rue-grid-col]') as HTMLElement
    expect(col.style.maxWidth).toBe('100%')

    setViewportWidth(960)
    await waitGridRender()
    await waitGridRender()

    expect(col.style.maxWidth).toBe('50%')
  })

  it('updates responsive gutter after resize', async () => {
    setViewportWidth(520)

    const container = document.createElement('div')
    mountTestApp(container, () =>
      render(
        <Grid
          gutter={[
            { xs: 8, md: 24 },
            { xs: 12, md: 32 },
          ]}
        >
          <Grid.Col span={12}>{'A'}</Grid.Col>
        </Grid>,
        container,
      ),
    )
    await waitGridRender()

    const row = container.querySelector('[data-rue-grid-row]') as HTMLElement
    let rowStyle = (row.getAttribute('style') ?? '').replace(/:\s+/g, ':')
    expect(row.style.marginLeft).toBe('-4px')
    expect(row.style.marginTop).toBe('-6px')

    setViewportWidth(960)
    await waitGridRender()
    await waitGridRender()

    rowStyle = (row.getAttribute('style') ?? '').replace(/:\s+/g, ':')
    expect(row.style.marginLeft).toBe('-12px')
    expect(row.style.marginTop).toBe('-16px')
  })
})
