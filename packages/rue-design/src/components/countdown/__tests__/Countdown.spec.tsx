import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { render, setReactiveScheduling } from '@rue-js/rue'
import Countdown from '../index'

setReactiveScheduling('sync')

const waitCountdownRender = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const getCountdownValue = (element: Element) =>
  (element as HTMLElement).getAttribute('data-countdown-value') ?? ''
const getCountdownDigits = (element: Element) =>
  (element as HTMLElement).getAttribute('data-countdown-digits') ?? ''

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('Countdown', () => {
  it('renders wrapper with base class', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () => render(<Countdown>{'x'}</Countdown>, c))
    await waitCountdownRender()
    const el = c.querySelector('.countdown') as HTMLElement
    expect(el).toBeTruthy()
  })

  it('applies custom className on wrapper', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () => render(<Countdown className={'font-mono text-2xl'}>{'x'}</Countdown>, c))
    await waitCountdownRender()
    const el = c.querySelector('.countdown') as HTMLElement
    expect(el.classList.contains('font-mono')).toBe(true)
    expect(el.classList.contains('text-2xl')).toBe(true)
  })

  it('renders Value with --value style and text', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Countdown>
          <Countdown.Value value={59} />
        </Countdown>,
        c,
      ),
    )
    await waitCountdownRender()
    const inner = c.querySelector('.countdown > span') as HTMLElement
    expect(inner).toBeTruthy()
    expect(getCountdownValue(inner)).toBe('59')
    expect(inner.style.getPropertyValue('--value')).toBe('59')
    expect(inner.getAttribute('aria-live')).toBe('polite')
    expect(inner.getAttribute('aria-label')).toBe('59')
  })

  it('supports digits via --digits style', async () => {
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Countdown>
          <Countdown.Value value={9} digits={2} />
        </Countdown>,
        c,
      ),
    )
    await waitCountdownRender()
    const inner = c.querySelector('.countdown > span') as HTMLElement
    expect(inner.style.getPropertyValue('--value')).toBe('9')
    expect(getCountdownDigits(inner)).toBe('2')
    expect(inner.style.getPropertyValue('--digits')).toBe('2')
  })

  it('renders from items array with values and separators', async () => {
    const c = document.createElement('div')
    const items = [
      { value: 10 },
      { content: 'h' },
      { value: 24, digits: 2 },
      { content: 'm' },
      { value: 59, digits: 2 },
      { content: 's' },
    ]
    mountTestApp(c, () => render(<Countdown className={'font-mono text-2xl'} items={items} />, c))
    await waitCountdownRender()
    const wrapper = c.querySelector('.countdown') as HTMLElement
    expect(wrapper.classList.contains('font-mono')).toBe(true)
    const spans = wrapper.querySelectorAll('span')
    expect(spans.length).toBe(3)
    expect(getCountdownValue(spans[0])).toBe('10')
    expect(getCountdownDigits(spans[2])).toBe('2')
    expect(wrapper.textContent).toBe('hms')
  })

  it('renders live countdown from target time and format', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-01T00:00:00.000Z'))

    const c = document.createElement('div')
    const target = Date.now() + (10 * 60 * 60 + 24 * 60 + 59) * 1000
    mountTestApp(c, () => render(<Countdown value={target} format={'HH:mm:ss'} />, c))
    await waitCountdownRender()

    const wrapper = c.querySelector('.countdown') as HTMLElement
    const spans = wrapper.querySelectorAll(':scope > span')
    expect(spans.length).toBe(3)
    expect(getCountdownValue(spans[0])).toBe('10')
    expect(getCountdownValue(spans[1])).toBe('24')
    expect(getCountdownValue(spans[2])).toBe('59')
    expect(wrapper.textContent).toBe('::')
  })

  it('restarts target countdown when the parent target changes', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-01T00:00:00.000Z'))

    const c = document.createElement('div')
    const firstTarget = Date.now() + 5_000
    mountTestApp(c, () =>
      render(<Countdown key={firstTarget} value={firstTarget} format={'s'} interval={1000} />, c),
    )
    await waitCountdownRender()

    const readSeconds = () => {
      const value = c.querySelector('.countdown > span') as HTMLElement
      return getCountdownValue(value)
    }

    expect(readSeconds()).toBe('5')

    const nextTarget = Date.now() + 9_000
    mountTestApp(c, () =>
      render(<Countdown key={nextTarget} value={nextTarget} format={'s'} interval={1000} />, c),
    )
    await waitCountdownRender()

    expect(readSeconds()).toBe('9')
  })

  it('updates target countdown values without remounting fixed format slots', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-01T00:00:00.000Z'))

    const c = document.createElement('div')
    const onChange = vi.fn()
    mountTestApp(c, () =>
      render(
        <Countdown value={Date.now() + 3_000} format={'s'} interval={1000} onChange={onChange} />,
        c,
      ),
    )
    await waitCountdownRender()

    const firstSlot = c.querySelector('.countdown > span') as HTMLElement
    expect(getCountdownValue(firstSlot)).toBe('3')

    await vi.advanceTimersByTimeAsync(1000)
    await waitCountdownRender()

    const nextSlot = c.querySelector('.countdown > span') as HTMLElement
    expect(onChange).toHaveBeenLastCalledWith(2000)
    expect(nextSlot).toBe(firstSlot)
    expect(getCountdownValue(nextSlot)).toBe('2')
  })

  it('supports literal text segments in format mode', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-01T00:00:00.000Z'))

    const c = document.createElement('div')
    const target = Date.now() + (2 * 24 * 60 * 60 + 3 * 60 * 60 + 4 * 60 + 5) * 1000
    mountTestApp(c, () =>
      render(<Countdown value={target} format={'D [days] H [hours] m [minutes] s [seconds]'} />, c),
    )
    await waitCountdownRender()

    const wrapper = c.querySelector('.countdown') as HTMLElement
    const spans = wrapper.querySelectorAll(':scope > span')
    expect(spans.length).toBe(4)
    expect(getCountdownValue(spans[0])).toBe('2')
    expect(getCountdownValue(spans[1])).toBe('3')
    expect(getCountdownValue(spans[2])).toBe('4')
    expect(getCountdownValue(spans[3])).toBe('5')
    expect(wrapper.textContent).toBe(
      '\u00a0days\u00a0\u00a0hours\u00a0\u00a0minutes\u00a0\u00a0seconds',
    )
  })

  it('fires onChange and onFinish once in countdown mode', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-01T00:00:00.000Z'))

    const onChange = vi.fn()
    const onFinish = vi.fn()
    const c = document.createElement('div')
    mountTestApp(c, () =>
      render(
        <Countdown
          value={Date.now() + 1200}
          format={'s.SSS'}
          onChange={onChange}
          onFinish={onFinish}
        />,
        c,
      ),
    )
    await waitCountdownRender()

    expect(onChange).toHaveBeenCalled()
    vi.advanceTimersByTime(1500)
    await waitCountdownRender()

    const wrapper = c.querySelector('.countdown') as HTMLElement
    expect(wrapper).toBeTruthy()
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith(0)
  })
})
