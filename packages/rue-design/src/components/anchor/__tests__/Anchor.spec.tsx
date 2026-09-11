import { AnchorLink } from '../index'
import { mountTestApp } from '../../__tests__/app-lifecycle'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, setReactiveScheduling } from '@rue-js/rue'

import Anchor from '../index'
import {
  click,
  mountContainer,
  waitForContent,
} from '../../../../../runtime/__tests__/page-test-utils'

setReactiveScheduling('sync')

const rect = (top: number, height = 160) => ({
  x: 0,
  y: top,
  top,
  left: 0,
  right: 320,
  width: 320,
  bottom: top + height,
  height,
  toJSON: () => ({}),
})

const assignScrollTo = (element: HTMLElement, onScroll: (top?: number) => void) => {
  element.scrollTo = ((options?: ScrollToOptions | number, y?: number) => {
    if (typeof options === 'number') {
      onScroll(typeof y === 'number' ? y : 0)
      return
    }
    onScroll(options?.top)
  }) as typeof element.scrollTo
}

const createScrollScene = () => {
  const scrollHost = document.createElement('div')
  scrollHost.style.height = '240px'
  scrollHost.style.overflow = 'auto'
  scrollHost.scrollTop = 0
  scrollHost.getBoundingClientRect = () => rect(0, 240) as DOMRect
  assignScrollTo(scrollHost, top => {
    scrollHost.scrollTop = top ?? 0
  })

  const intro = document.createElement('section')
  intro.id = 'intro'
  intro.textContent = 'Intro'
  intro.getBoundingClientRect = () => rect(-scrollHost.scrollTop, 160) as DOMRect

  const details = document.createElement('section')
  details.id = 'details'
  details.textContent = 'Details'
  details.getBoundingClientRect = () => rect(220 - scrollHost.scrollTop, 180) as DOMRect

  const api = document.createElement('section')
  api.id = 'api'
  api.textContent = 'API'
  api.getBoundingClientRect = () => rect(480 - scrollHost.scrollTop, 180) as DOMRect

  scrollHost.append(intro, details, api)
  document.body.appendChild(scrollHost)

  return { scrollHost, intro, details, api }
}

const createCappedScrollScene = (
  sections: Array<{ id: string; text: string; top: number; height: number }>,
  clientHeight: number,
  scrollHeight: number,
) => {
  const scrollHost = document.createElement('div')
  scrollHost.style.height = `${clientHeight}px`
  scrollHost.style.overflow = 'auto'
  scrollHost.getBoundingClientRect = () => rect(0, clientHeight) as DOMRect

  Object.defineProperty(scrollHost, 'clientHeight', {
    configurable: true,
    get: () => clientHeight,
  })
  Object.defineProperty(scrollHost, 'scrollHeight', {
    configurable: true,
    get: () => scrollHeight,
  })

  const maxScrollTop = Math.max(0, scrollHeight - clientHeight)
  let currentScrollTop = 0
  Object.defineProperty(scrollHost, 'scrollTop', {
    configurable: true,
    get: () => currentScrollTop,
    set: value => {
      currentScrollTop = Math.max(0, Math.min(Number(value) || 0, maxScrollTop))
    },
  })

  assignScrollTo(scrollHost, top => {
    scrollHost.scrollTop = top ?? 0
  })

  const nodes = sections.map(section => {
    const element = document.createElement('section')
    element.id = section.id
    element.textContent = section.text
    element.getBoundingClientRect = () =>
      rect(section.top - scrollHost.scrollTop, section.height) as DOMRect
    return element
  })

  scrollHost.append(...nodes)
  document.body.appendChild(scrollHost)

  return { scrollHost, maxScrollTop }
}

const createDuplicateIdScrollScene = () => {
  const createHost = (
    sections: Array<{ id: string; top: number; height: number; text: string }>,
    clientHeight: number,
    scrollHeight: number,
  ) => {
    const scrollHost = document.createElement('div')
    scrollHost.style.height = `${clientHeight}px`
    scrollHost.style.overflow = 'auto'
    scrollHost.getBoundingClientRect = () => rect(0, clientHeight) as DOMRect

    Object.defineProperty(scrollHost, 'clientHeight', {
      configurable: true,
      get: () => clientHeight,
    })
    Object.defineProperty(scrollHost, 'scrollHeight', {
      configurable: true,
      get: () => scrollHeight,
    })

    let currentScrollTop = 0
    const maxScrollTop = Math.max(0, scrollHeight - clientHeight)
    Object.defineProperty(scrollHost, 'scrollTop', {
      configurable: true,
      get: () => currentScrollTop,
      set: value => {
        currentScrollTop = Math.max(0, Math.min(Number(value) || 0, maxScrollTop))
      },
    })

    assignScrollTo(scrollHost, top => {
      scrollHost.scrollTop = top ?? 0
    })

    const nodes = sections.map(section => {
      const element = document.createElement('section')
      element.id = section.id
      element.textContent = section.text
      element.getBoundingClientRect = () =>
        rect(section.top - scrollHost.scrollTop, section.height) as DOMRect
      return element
    })

    scrollHost.append(...nodes)
    document.body.appendChild(scrollHost)
    return scrollHost
  }

  const globalHost = createHost(
    [
      { id: 'intro', top: 0, height: 180, text: 'Global Intro' },
      { id: 'details', top: 980, height: 180, text: 'Global Details' },
    ],
    240,
    1180,
  )

  const localHost = createHost(
    [
      { id: 'intro', top: 0, height: 180, text: 'Local Intro' },
      { id: 'details', top: 220, height: 180, text: 'Local Details' },
    ],
    240,
    420,
  )

  return { globalHost, localHost }
}

const getLink = (container: HTMLElement, href: string) => {
  return container.querySelector(`[data-rue-anchor-href="${href}"]`) as HTMLAnchorElement | null
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('Anchor', () => {
  it('tracks active item inside a custom scroll container and scrolls on click', async () => {
    const { scrollHost } = createScrollScene()
    const container = mountContainer()
    const handleClick = vi.fn()
    const handleChange = vi.fn()

    mountTestApp(container, () =>
      render(
        <Anchor
          getContainer={() => scrollHost}
          targetOffset={24}
          items={[
            { key: 'intro', href: '#intro', title: '简介' },
            { key: 'details', href: '#details', title: '细节' },
            { key: 'api', href: '#api', title: 'API' },
          ]}
          onClick={handleClick}
          onChange={handleChange}
        />,
        container,
      ),
    )

    await waitForContent(() => {
      expect(getLink(container, '#intro')?.getAttribute('data-active')).toBe('true')
      expect(container.textContent).toContain('简介')
      expect(container.textContent).not.toContain('[object Object]')
    })

    await click(getLink(container, '#details'))

    await waitForContent(() => {
      expect(handleClick).toHaveBeenCalledTimes(1)
      expect(handleChange).toHaveBeenCalledWith('#details')
      expect(scrollHost.scrollTop).toBe(196)
      expect(getLink(container, '#details')?.getAttribute('data-active')).toBe('true')
    })

    scrollHost.scrollTop = 490
    scrollHost.dispatchEvent(new Event('scroll'))

    await waitForContent(() => {
      expect(getLink(container, '#api')?.getAttribute('data-active')).toBe('true')
    })
  })

  it('resolves targets inside the provided scroll container instead of the global document', async () => {
    const { globalHost, localHost } = createDuplicateIdScrollScene()
    const container = mountContainer()

    mountTestApp(container, () =>
      render(
        <Anchor
          getContainer={() => localHost}
          targetOffset={24}
          items={[
            { key: 'intro', href: '#intro', title: 'Local Intro' },
            { key: 'details', href: '#details', title: 'Local Details' },
          ]}
        />,
        container,
      ),
    )

    await click(getLink(container, '#details'))

    await waitForContent(() => {
      expect(globalHost.scrollTop).toBe(0)
      expect(localHost.scrollTop).toBe(180)
      expect(getLink(container, '#details')?.getAttribute('data-active')).toBe('true')
    })
  })

  it('keeps the last item active in a local scroll container when clicking reaches the bottom', async () => {
    const { scrollHost, maxScrollTop } = createCappedScrollScene(
      [
        { id: 'brief', text: 'Brief', top: 0, height: 180 },
        { id: 'system', text: 'System', top: 220, height: 180 },
        { id: 'delivery', text: 'Delivery', top: 440, height: 180 },
      ],
      240,
      620,
    )
    const container = mountContainer()

    mountTestApp(container, () =>
      render(
        <Anchor
          getContainer={() => scrollHost}
          targetOffset={24}
          items={[
            { key: 'brief', href: '#brief', title: 'Brief Intake' },
            { key: 'system', href: '#system', title: 'System Draft' },
            { key: 'delivery', href: '#delivery', title: 'Delivery Notes' },
          ]}
        />,
        container,
      ),
    )

    await click(getLink(container, '#delivery'))

    await waitForContent(() => {
      expect(scrollHost.scrollTop).toBe(maxScrollTop)
      expect(getLink(container, '#delivery')?.getAttribute('data-active')).toBe('true')
      expect(getLink(container, '#system')?.getAttribute('data-active')).toBe('false')
    })
  })

  it('falls back to rendering AnchorLink children when compiled children are opaque handles', async () => {
    const { scrollHost } = createScrollScene()
    const container = mountContainer()

    mountTestApp(container, () =>
      render(
        <Anchor getContainer={() => scrollHost} affix={false}>
          <AnchorLink href="#intro" title="Overview">
            <AnchorLink href="#details" title="Specs" />
          </AnchorLink>
          <AnchorLink href="#api" title="API" description="事件与受控用法" />
        </Anchor>,
        container,
      ),
    )

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-anchor-children="true"]')).toBeTruthy()
      expect(container.textContent).toContain('Overview')
      expect(container.textContent).toContain('Specs')
      expect(container.textContent).toContain('API')
      expect(container.textContent).toContain('事件与受控用法')
    })
  })

  it('supports horizontal mode and custom current-anchor mapping', async () => {
    const { scrollHost } = createScrollScene()
    const container = mountContainer()

    mountTestApp(container, () =>
      render(
        <Anchor
          getContainer={() => scrollHost}
          direction="horizontal"
          items={[
            { key: 'intro', href: '#intro', title: '简介' },
            { key: 'details', href: '#details', title: '实现细节' },
            { key: 'api', href: '#api', title: 'API' },
          ]}
          getCurrentAnchor={href => (href === '#details' ? '#intro' : href)}
        />,
        container,
      ),
    )

    scrollHost.scrollTop = 250
    scrollHost.dispatchEvent(new Event('scroll'))

    await waitForContent(() => {
      expect(container.querySelector('[data-rue-anchor-direction="horizontal"]')).toBeTruthy()
      expect(getLink(container, '#intro')?.getAttribute('data-active')).toBe('true')
      expect(getLink(container, '#details')?.getAttribute('data-active')).toBe('false')
    })
  })

  it('keeps the final horizontal item active when clicking reaches the bottom', async () => {
    const { scrollHost, maxScrollTop } = createCappedScrollScene(
      [
        { id: 'kickoff', text: 'Kickoff', top: 0, height: 180 },
        { id: 'schema', text: 'Schema', top: 220, height: 180 },
        { id: 'adapter', text: 'Adapter', top: 440, height: 180 },
        { id: 'handoff', text: 'Handoff', top: 660, height: 180 },
      ],
      300,
      840,
    )
    const container = mountContainer()

    mountTestApp(container, () =>
      render(
        <Anchor
          getContainer={() => scrollHost}
          direction="horizontal"
          items={[
            { key: 'kickoff', href: '#kickoff', title: 'Kickoff' },
            { key: 'schema', href: '#schema', title: 'Schema' },
            { key: 'adapter', href: '#adapter', title: 'Adapter' },
            { key: 'handoff', href: '#handoff', title: 'Handoff' },
          ]}
          getCurrentAnchor={href => (href === '#adapter' ? '#schema' : href)}
        />,
        container,
      ),
    )

    await click(getLink(container, '#handoff'))

    await waitForContent(() => {
      expect(scrollHost.scrollTop).toBe(maxScrollTop)
      expect(getLink(container, '#handoff')?.getAttribute('data-active')).toBe('true')
      expect(getLink(container, '#schema')?.getAttribute('data-active')).toBe('false')
    })
  })
})
