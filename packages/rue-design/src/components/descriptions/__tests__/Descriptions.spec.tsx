import { Template } from '@rue-js/rue'
import { mountTestApp, disposeTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'
import Descriptions from '../index'

setReactiveScheduling('sync')

const initialViewportWidth = window.innerWidth
const mountedContainers: HTMLDivElement[] = []

const mountTestContainer = () => {
  const container = mountContainer()
  mountedContainers.push(container)
  return container
}

const setViewportWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  })
  window.dispatchEvent(new Event('resize'))
}

afterEach(() => {
  for (const container of mountedContainers) {
    disposeTestApp(container)
  }
  mountedContainers.length = 0
  document.body.innerHTML = ''
  setViewportWidth(initialViewportWidth)
})

describe('Descriptions', () => {
  it('renders items with bordered rows and fills the last row span', async () => {
    const container = mountTestContainer()

    mountTestApp(container, () =>
      render(
        <Descriptions
          bordered
          column={3}
          items={[
            { key: 'status', label: 'Status', content: 'Running' },
            { key: 'owner', label: 'Owner', content: 'Mina', span: 2 },
            { key: 'address', label: 'Address', content: 'Shanghai HQ' },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.innerHTML).toContain('data-rue-descriptions-row-type="horizontal"')
      const rows = container.querySelectorAll('[data-rue-descriptions-row-type="horizontal"]')
      expect(rows).toHaveLength(2)

      const addressContent = container.querySelector(
        '[data-rue-descriptions-item="string:address"][data-rue-descriptions-part="content"]',
      ) as HTMLTableCellElement | null

      expect(container.textContent).toContain('Running')
      expect(container.textContent).toContain('Shanghai HQ')
      expect(addressContent?.colSpan).toBe(5)
    })
  })

  it('supports explicit items and an extra slot in vertical mode', async () => {
    const container = mountTestContainer()

    mountTestApp(container, () =>
      render(
        <Descriptions
          title="Workspace"
          bordered
          layout="vertical"
          column={2}
          items={[
            { label: 'Project', content: 'Nebula' },
            { label: 'Owner', content: 'Ari' },
          ]}
        >
          <Template slot="extra">
            <button className="btn btn-ghost btn-xs">Sync</button>
          </Template>
        </Descriptions>,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.innerHTML).toContain('data-rue-descriptions-row-type="vertical-label"')
      const labelRows = container.querySelectorAll(
        '[data-rue-descriptions-row-type="vertical-label"]',
      )
      const contentRows = container.querySelectorAll(
        '[data-rue-descriptions-row-type="vertical-content"]',
      )
      expect(labelRows).toHaveLength(1)
      expect(contentRows).toHaveLength(1)
      expect(container.textContent).toContain('Workspace')
      expect(container.textContent).toContain('Sync')
      expect(container.textContent).toContain('Nebula')
      expect(container.textContent).toContain('Ari')
    })
  })

  it('renders styled text tokens from a data schema in plain vertical mode', async () => {
    const container = mountTestContainer()

    mountTestApp(container, () =>
      render(
        <Descriptions
          layout="vertical"
          column={2}
          items={[
            { label: 'Headline', content: 'Orbit launch week' },
            {
              label: 'Assets',
              tokens: [
                { text: 'KV', className: 'badge badge-outline badge-sm' },
                { text: 'Motion', className: 'badge badge-outline badge-sm' },
              ],
            },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.innerHTML).toContain('data-rue-descriptions-row-type="vertical-label"')
      expect(container.textContent).toContain('Orbit launch week')
      expect(container.textContent).toContain('KV')
      expect(container.textContent).toContain('Motion')
    })
  })

  it('renders explicit labels and token content in bordered mode', async () => {
    const container = mountTestContainer()

    mountTestApp(container, () =>
      render(
        <Descriptions
          bordered
          layout="vertical"
          column={2}
          items={[
            { label: 'Headline', content: 'Orbit launch week' },
            { label: 'Assets', tokens: [{ text: 'KV' }, { text: 'Motion' }] },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.textContent).toContain('Headline')
      expect(container.textContent).toContain('Assets')
      expect(container.textContent).toContain('Orbit launch week')
      expect(container.textContent).toContain('KV')
      expect(container.textContent).toContain('Motion')
    })
  })

  it('updates responsive column layout after resize', async () => {
    setViewportWidth(520)
    const container = mountTestContainer()

    mountTestApp(container, () =>
      render(
        <Descriptions
          column={{ xs: 1, md: 2 }}
          items={[
            { key: 'signal', label: 'Signal', content: 'Warm' },
            { key: 'owner', label: 'Owner', content: 'Luna' },
            { key: 'region', label: 'Region', content: 'APAC' },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const rows = container.querySelectorAll('[data-rue-descriptions-row-type="horizontal"]')
      expect(rows).toHaveLength(3)
    })

    setViewportWidth(960)

    await waitForContent(() => {
      expect(container.innerHTML).toContain('data-rue-descriptions-row-type="horizontal"')
      const rows = container.querySelectorAll('[data-rue-descriptions-row-type="horizontal"]')
      expect(rows).toHaveLength(2)
    })
  })
})
