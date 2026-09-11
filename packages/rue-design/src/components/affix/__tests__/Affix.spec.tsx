import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'

import Affix from '../index'
import { mountContainer, waitForContent } from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const rect = (top: number, height = 48, left = 0, width = 240) => ({
  x: left,
  y: top,
  top,
  left,
  right: left + width,
  width,
  bottom: top + height,
  height,
  toJSON: () => ({}),
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('Affix', () => {
  it('toggles fixed state for top offset and emits change callbacks', async () => {
    const container = mountContainer()
    const handleChange = vi.fn()

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0)
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

    mountTestApp(container, () =>
      render(
        <Affix offsetTop={24} onChange={handleChange}>
          <div>Filters</div>
        </Affix>,
        container,
      ),
    )

    const root = container.querySelector('[data-rue-affix="true"]') as HTMLDivElement
    const getFixedNode = () => container.querySelector('[data-rue-affix-fixed]') as HTMLDivElement
    let currentTop = 72

    root.getBoundingClientRect = () => rect(currentTop, 48, 12, 260) as DOMRect

    window.dispatchEvent(new Event('scroll'))

    await waitForContent(() => {
      const fixedNode = getFixedNode()
      expect(root.getAttribute('data-rue-affixed')).toBe('false')
      expect(fixedNode.style.position).toBe('')
      expect(handleChange).not.toHaveBeenCalled()
    })

    currentTop = 8
    window.dispatchEvent(new Event('scroll'))

    await waitForContent(() => {
      const fixedNode = getFixedNode()
      expect(root.getAttribute('data-rue-affixed')).toBe('true')
      expect(fixedNode.style.position).toBe('fixed')
      expect(fixedNode.style.top).toBe('24px')
      expect(fixedNode.style.left).toBe('12px')
      expect(fixedNode.style.width).toBe('260px')
      expect(handleChange).toHaveBeenLastCalledWith(true)
    })

    currentTop = 88
    window.dispatchEvent(new Event('scroll'))

    await waitForContent(() => {
      const fixedNode = getFixedNode()
      expect(root.getAttribute('data-rue-affixed')).toBe('false')
      expect(fixedNode.style.position).toBe('')
      expect(handleChange).toHaveBeenLastCalledWith(false)
    })
  })

  it('defaults to window even inside a scroll container', async () => {
    const scrollHost = document.createElement('div')
    const container = document.createElement('div')
    const handleChange = vi.fn()

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0)
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

    scrollHost.style.height = '320px'
    scrollHost.style.overflow = 'auto'
    scrollHost.getBoundingClientRect = () => rect(100, 320, 0, 360) as DOMRect
    scrollHost.appendChild(container)
    document.body.appendChild(scrollHost)

    mountTestApp(container, () =>
      render(
        <Affix offsetTop={24} onChange={handleChange}>
          <div>Default container rail</div>
        </Affix>,
        container,
      ),
    )

    const root = container.querySelector('[data-rue-affix="true"]') as HTMLDivElement
    const getFixedNode = () => container.querySelector('[data-rue-affix-fixed]') as HTMLDivElement
    let currentTop = 136

    root.getBoundingClientRect = () => rect(currentTop, 40, 18, 220) as DOMRect

    scrollHost.dispatchEvent(new Event('scroll'))

    await waitForContent(() => {
      const fixedNode = getFixedNode()
      expect(root.getAttribute('data-rue-affixed')).toBe('false')
      expect(fixedNode.style.position).toBe('')
      expect(handleChange).not.toHaveBeenCalled()
    })

    currentTop = 8
    window.dispatchEvent(new Event('scroll'))

    await waitForContent(() => {
      const fixedNode = getFixedNode()
      expect(root.getAttribute('data-rue-affixed')).toBe('true')
      expect(fixedNode.style.position).toBe('fixed')
      expect(fixedNode.style.top).toBe('24px')
      expect(fixedNode.style.left).toBe('18px')
      expect(handleChange).toHaveBeenLastCalledWith(true)
    })

    currentTop = 136
    window.dispatchEvent(new Event('scroll'))

    await waitForContent(() => {
      const fixedNode = getFixedNode()
      expect(root.getAttribute('data-rue-affixed')).toBe('false')
      expect(fixedNode.style.position).toBe('')
      expect(handleChange).toHaveBeenLastCalledWith(false)
    })
  })

  it('aligns against a custom scroll container and recomputes on window scroll', async () => {
    const container = mountContainer()
    const scrollHost = document.createElement('div')

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0)
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

    scrollHost.getBoundingClientRect = () => rect(100, 320, 0, 360) as DOMRect
    document.body.appendChild(scrollHost)

    mountTestApp(container, () =>
      render(
        <Affix offsetTop={24} target={() => scrollHost}>
          <div>Panel actions</div>
        </Affix>,
        container,
      ),
    )

    const root = container.querySelector('[data-rue-affix="true"]') as HTMLDivElement
    const getFixedNode = () => container.querySelector('[data-rue-affix-fixed]') as HTMLDivElement

    root.getBoundingClientRect = () => rect(88, 40, 18, 220) as DOMRect
    scrollHost.dispatchEvent(new Event('scroll'))

    await waitForContent(() => {
      const fixedNode = getFixedNode()
      expect(root.getAttribute('data-rue-affixed')).toBe('true')
      expect(fixedNode.style.position).toBe('fixed')
      expect(fixedNode.style.top).toBe('124px')
      expect(fixedNode.style.left).toBe('18px')
      expect(fixedNode.style.width).toBe('220px')
    })

    root.getBoundingClientRect = () => rect(136, 40, 18, 220) as DOMRect
    window.dispatchEvent(new Event('scroll'))

    await waitForContent(() => {
      const fixedNode = getFixedNode()
      expect(root.getAttribute('data-rue-affixed')).toBe('false')
      expect(fixedNode.style.position).toBe('')
    })
  })

  it('supports bottom offset mode', async () => {
    const container = mountContainer()

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0)
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    vi.stubGlobal('innerHeight', 900)

    mountTestApp(container, () =>
      render(
        <Affix offsetBottom={16}>
          <div>Composer</div>
        </Affix>,
        container,
      ),
    )

    const root = container.querySelector('[data-rue-affix="true"]') as HTMLDivElement
    const getFixedNode = () => container.querySelector('[data-rue-affix-fixed]') as HTMLDivElement

    root.getBoundingClientRect = () => rect(860, 60, 24, 300) as DOMRect
    window.dispatchEvent(new Event('scroll'))

    await waitForContent(() => {
      const fixedNode = getFixedNode()
      expect(root.getAttribute('data-rue-affixed')).toBe('true')
      expect(fixedNode.style.position).toBe('fixed')
      expect(fixedNode.style.bottom).toBe('16px')
      expect(fixedNode.style.left).toBe('24px')
    })
  })
})
