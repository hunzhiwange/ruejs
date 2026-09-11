import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'
import Timeline from '../index'

setReactiveScheduling('sync')

const resetActiveRuntime = () => {
  ;(globalThis as any).__rue_active = (globalThis as any).__rue
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Timeline', () => {
  it('renders with base class and children', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Timeline>
          <li>
            <Timeline.Middle>
              <div id="m">M</div>
            </Timeline.Middle>
            <hr />
          </li>
        </Timeline>,
        container,
      ),
    )

    await waitForContent(() => {
      const element = container.querySelector('ul.timeline') as HTMLElement
      expect(element).toBeTruthy()
      expect(element.classList.contains('timeline')).toBe(true)
      expect(container.querySelector('#m')?.textContent).toBe('M')
    })
  })

  it('applies direction, orientation alias, snapIcon, compact and custom className', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(<Timeline orientation="vertical" snapIcon compact className="w-64" />, container),
    )

    await waitForContent(() => {
      const element = container.querySelector('ul.timeline') as HTMLElement
      expect(element.classList.contains('timeline-vertical')).toBe(true)
      expect(element.classList.contains('timeline-snap-icon')).toBe(true)
      expect(element.classList.contains('timeline-compact')).toBe(true)
      expect(element.classList.contains('w-64')).toBe(true)
    })
  })

  it('renders Start, Middle, End parts with optional box', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Timeline>
          <li>
            <Timeline.Start box>
              <div id="s">S</div>
            </Timeline.Start>
            <Timeline.Middle>
              <div id="mi">MI</div>
            </Timeline.Middle>
            <Timeline.End box>
              <div id="e">E</div>
            </Timeline.End>
            <hr />
          </li>
        </Timeline>,
        container,
      ),
    )

    await waitForContent(() => {
      const start = container.querySelector('.timeline-start') as HTMLElement
      const middle = container.querySelector('.timeline-middle') as HTMLElement
      const end = container.querySelector('.timeline-end') as HTMLElement
      expect(start).toBeTruthy()
      expect(start.classList.contains('timeline-box')).toBe(true)
      expect(middle).toBeTruthy()
      expect(end).toBeTruthy()
      expect(end.classList.contains('timeline-box')).toBe(true)
      expect(container.querySelector('#s')?.textContent).toBe('S')
      expect(container.querySelector('#mi')?.textContent).toBe('MI')
      expect(container.querySelector('#e')?.textContent).toBe('E')
    })
  })

  it('renders legacy items arrays with explicit lines and parts', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    const items = [
      {
        beforeLine: true,
        start: { box: true, content: 'IS', id: 'is' },
        middle: {
          kind: 'dot',
        },
        end: { box: true, content: 'IE', id: 'ie' },
        afterLine: true,
      },
      {
        beforeLine: true,
        middle: { content: 'IM', id: 'im' },
        afterLine: true,
      },
    ] as const

    mountTestApp(container, () => render(<Timeline items={items} />, container))

    await waitForContent(() => {
      const element = container.querySelector('ul.timeline') as HTMLElement
      const start = container.querySelector('.timeline-start') as HTMLElement
      const middle = container.querySelectorAll('.timeline-middle')
      const end = container.querySelector('.timeline-end') as HTMLElement
      const hrs = container.querySelectorAll('hr')
      expect(element).toBeTruthy()
      expect(start).toBeTruthy()
      expect(middle.length).toBe(2)
      expect(end).toBeTruthy()
      expect(hrs.length).toBe(4)
      expect(container.querySelector('#is')?.textContent).toBe('IS')
      expect(container.querySelector('#im')?.textContent).toBe('IM')
      expect(container.querySelector('#ie')?.textContent).toBe('IE')
    })
  })

  it('normalizes title and content into timeline sides automatically', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Timeline
          items={[
            {
              title: 'Planning',
              titleId: 'auto-title',
              content: 'Draft roadmap',
              contentId: 'auto-content',
              contentBox: true,
            },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const start = container.querySelector('.timeline-start') as HTMLElement
      const end = container.querySelector('.timeline-end') as HTMLElement
      const middle = container.querySelector('.timeline-middle') as HTMLElement
      expect(start?.textContent).toContain('Planning')
      expect(end?.classList.contains('timeline-box')).toBe(true)
      expect(container.querySelector('#auto-content')?.textContent).toBe('Draft roadmap')
      expect(middle).toBeTruthy()
    })
  })

  it('supports reverse, pending and semantic item colors together', async () => {
    const container = mountContainer()
    resetActiveRuntime()

    mountTestApp(container, () =>
      render(
        <Timeline
          mode="alternate"
          reverse
          pending="Waiting review"
          items={[
            {
              key: 'draft',
              title: 'Q1',
              content: 'Launch prep',
              contentId: 'draft-content',
              contentBox: true,
            },
            {
              key: 'build',
              content: 'Build',
              contentId: 'build-content',
              color: 'success',
              contentBox: true,
            },
          ]}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      const listItems = Array.from(container.querySelectorAll('ul.timeline > li'))
      expect(listItems).toHaveLength(3)
      expect(listItems[0].querySelector('.timeline-start')?.textContent).toContain('Waiting review')
      expect(listItems[1].querySelector('.timeline-end')?.textContent).toContain('Build')
      expect(
        listItems[1].querySelector('.timeline-middle')?.classList.contains('text-success'),
      ).toBe(true)
      expect(listItems[1].querySelector('hr')?.classList.contains('bg-success')).toBe(true)
      expect(listItems[2].querySelector('.timeline-start')?.textContent).toContain('Launch prep')
      expect(listItems[2].querySelector('.timeline-end')?.textContent).toContain('Q1')
    })
  })
})
