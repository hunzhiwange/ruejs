import { afterEach, describe, expect, it } from 'vitest'

import {
  TransitionGroup,
  render,
  renderAnchor,
  setReactiveScheduling,
  signal,
  vapor,
  watchEffect,
  type FC,
} from '../src'

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
})

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

describe('TransitionGroup renderable boundary', () => {
  it('updates keyed children without leaving stale DOM behind', async () => {
    const items = signal(['a', 'b', 'c'])
    const ListHarness: FC = () =>
      vapor(() => {
        const root = document.createElement('section')
        const anchor = document.createComment('transition-group-anchor')
        root.appendChild(anchor)

        watchEffect(() => {
          renderAnchor(
            <ul>
              <TransitionGroup name="fade" duration={0}>
                {items.get().map((item: string) => (
                  <li data-testid={`item-${item}`} key={item}>
                    {item}
                  </li>
                ))}
              </TransitionGroup>
            </ul>,
            root,
            anchor,
          )
        })

        return root
      }) as any

    const container = document.createElement('div')
    document.body.appendChild(container)

    render(<ListHarness />, container)
    await flush()

    expect(Array.from(container.querySelectorAll('li'), el => el.textContent)).toEqual([
      'a',
      'b',
      'c',
    ])

    items.set(['b', 'd'])
    await flush()

    expect(Array.from(container.querySelectorAll('li'), el => el.textContent)).toEqual(['b', 'd'])
    expect(container.querySelector('[data-testid="item-a"]')).toBeNull()
    expect(container.querySelector('[data-testid="item-c"]')).toBeNull()

    items.set(['b', 'e', 'd'])
    await flush()

    expect(Array.from(container.querySelectorAll(':scope li li')).length).toBe(0)
    expect(Array.from(container.querySelectorAll('li'), el => el.textContent)).toEqual([
      'b',
      'e',
      'd',
    ])
  })

  it('keeps repeated same-slot insertions flat in tag mode without transition timing', async () => {
    const items = signal([1, 2, 3])
    const ListHarness: FC = () =>
      vapor(() => {
        const root = document.createElement('section')
        const anchor = document.createComment('transition-group-repeat-anchor')
        root.appendChild(anchor)

        watchEffect(() => {
          renderAnchor(
            <TransitionGroup tag="ul" name="fade" duration={0}>
              {items.get().map((item: number) => (
                <li data-testid={`repeat-item-${item}`} key={item}>
                  {item}
                </li>
              ))}
            </TransitionGroup>,
            root,
            anchor,
          )
        })

        return root
      }) as any

    const container = document.createElement('div')
    document.body.appendChild(container)

    render(<ListHarness />, container)
    await flush()

    items.set([1, 4, 2, 3])
    await flush()
    items.set([1, 5, 4, 2, 3])
    await flush()

    expect(Array.from(container.querySelectorAll('li li'))).toHaveLength(0)
    expect(Array.from(container.querySelectorAll('li'), el => el.textContent)).toEqual([
      '1',
      '5',
      '4',
      '2',
      '3',
    ])
  })

  it('plain keyed ul also stays flat for repeated same-slot insertions', async () => {
    const items = signal([1, 2, 3])
    const ListHarness: FC = () =>
      vapor(() => {
        const root = document.createElement('section')
        const anchor = document.createComment('plain-repeat-anchor')
        root.appendChild(anchor)

        watchEffect(() => {
          renderAnchor(
            <ul>
              {items.get().map((item: number) => (
                <li data-testid={`plain-item-${item}`} key={item}>
                  {item}
                </li>
              ))}
            </ul>,
            root,
            anchor,
          )
        })

        return root
      }) as any

    const container = document.createElement('div')
    document.body.appendChild(container)

    render(<ListHarness />, container)
    await flush()

    items.set([1, 4, 2, 3])
    await flush()
    items.set([1, 5, 4, 2, 3])
    await flush()

    expect(Array.from(container.querySelectorAll('li li'))).toHaveLength(0)
    expect(Array.from(container.querySelectorAll('li'), el => el.textContent)).toEqual([
      '1',
      '5',
      '4',
      '2',
      '3',
    ])
  })
})
