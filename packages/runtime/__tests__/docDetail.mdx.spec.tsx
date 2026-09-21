import { afterEach, describe, expect, it, vi } from 'vitest'

import { attachRouter, createRouter, RouterView } from '@rue-js/router'
import { setReactiveScheduling } from '../src'
import { createMountedCompiledTestComponent } from './compiler-capability-test-runtime'
import { click, createMemoryHistory, mountContainer, waitForContent } from './page-test-utils'
import { readDocRouteSegment } from '../../../app/pages/site/docRouteSegment'

vi.mock('../../../app/pages/site/SidebarPlaygroundGuide', async () => {
  const actual = await vi.importActual<
    typeof import('../../../app/pages/site/SidebarPlaygroundGuide')
  >('../../../app/pages/site/SidebarPlaygroundGuide')

  return {
    ...actual,
    default: (props: { children?: unknown }) => (
      <div data-testid="mock-sidebar-guide">{props.children}</div>
    ),
  }
})

vi.mock('../../../app/pages/site/SidebarPlaygroundApi', async () => {
  const actual = await vi.importActual<
    typeof import('../../../app/pages/site/SidebarPlaygroundApi')
  >('../../../app/pages/site/SidebarPlaygroundApi')

  return {
    ...actual,
    default: (props: { children?: unknown }) => (
      <div data-testid="mock-sidebar-api">{props.children}</div>
    ),
  }
})

vi.mock('../../../app/pages/site/SidebarPlaygroundPage', () => ({
  default: (props: { children?: unknown }) => (
    <div data-testid="mock-sidebar-page">{props.children}</div>
  ),
}))

setReactiveScheduling('sync')

// Compiling three MDX route modules is CPU-heavy and competes with the rest of
// the release suite's workers. Keep this scoped to the integration case rather
// than raising Vitest's global timeout.
const slowTestTimeout = 120_000

afterEach(async () => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('doc detail MDX rendering', () => {
  it('reads the initial doc segment from the static render URL when router params are not ready', () => {
    expect(
      readDocRouteSegment({
        currentRoutePath: '/guide/guide/quick-start',
        staticRenderUrl: '',
        uiBase: '/guide',
      }),
    ).toBe('guide/quick-start')
    expect(
      readDocRouteSegment({
        staticRenderUrl: '/guide/guide/quick-start',
        uiBase: '/guide',
      }),
    ).toBe('guide/quick-start')
    expect(
      readDocRouteSegment({
        routePath: '',
        staticRenderUrl: 'https://rue.local/#/api/api/index',
        uiBase: '/api',
      }),
    ).toBe('api/index')
    expect(
      readDocRouteSegment({
        propPath: 'page/partners/index',
        staticRenderUrl: '/page/ignored',
        uiBase: '/page',
      }),
    ).toBe('page/partners/index')
  })

  it(
    'renders MDX modules for guide, api, and page detail routes without markdown fetches',
    async () => {
      const cases = [
        {
          importComponent: async () =>
            (await import('../../../app/pages/site/GuideDocDetail')).default,
          initialPath: '/guide/guide/mdx-detail-fixture',
          pathPattern: '/guide/:path(.*)',
          title: 'Guide MDX Detail',
          body: 'Guide content rendered from an MDX module.',
        },
        {
          importComponent: async () =>
            (await import('../../../app/pages/site/ApiDocDetail')).default,
          initialPath: '/api/api/mdx-detail-fixture',
          pathPattern: '/api/:path(.*)',
          title: 'API MDX Detail',
          body: 'API content rendered from an MDX module.',
        },
        {
          importComponent: async () =>
            (await import('../../../app/pages/site/PageDocDetail')).default,
          initialPath: '/page/page/mdx-detail-fixture',
          pathPattern: '/page/:path(.*)',
          title: 'Page MDX Detail',
          body: 'Page content rendered from an MDX module.',
        },
      ]

      const fetchMock = vi.fn(async () => ({
        ok: false,
        text: async () => '',
      }))
      vi.stubGlobal('fetch', fetchMock)

      for (const testCase of cases) {
        document.body.innerHTML = ''
        const Component = await testCase.importComponent()
        const router = createRouter({
          history: createMemoryHistory(testCase.initialPath),
          routes: [{ path: testCase.pathPattern, component: Component as any }],
        })
        attachRouter(router)

        const container = mountContainer()
        const mounted = createMountedCompiledTestComponent(RouterView as any, container)

        await waitForContent(() => {
          const docBody = container.querySelector('#doc-body')
          expect(docBody).not.toBeNull()
          expect(docBody?.textContent).toContain(testCase.title)
          expect(docBody?.textContent).toContain(testCase.body)
        })

        const tabs = Array.from(container.querySelectorAll('[role="tab"]')) as HTMLButtonElement[]
        expect(tabs.map(tab => tab.textContent)).toEqual(['pnpm', 'npm'])
        expect(tabs[0].getAttribute('aria-selected')).toBe('true')

        await click(tabs[1])

        expect(tabs[1].getAttribute('aria-selected')).toBe('true')
        expect(
          container.querySelector('[role="tabpanel"][aria-hidden="false"]')?.textContent,
        ).toContain('npm create rue@latest')
        mounted.dispose()
      }

      expect(fetchMock).not.toHaveBeenCalled()
    },
    slowTestTimeout,
  )

  it('falls back to markdown HTML and keeps code copy handling', async () => {
    const writeText = vi.fn()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('/docs/sponsor/index.md')) {
        return {
          ok: true,
          text: async () => `# Sponsor

Fallback markdown content.

\`\`\`ts
const sponsor = 'Rue'
\`\`\`
`,
        }
      }

      return {
        ok: false,
        text: async () => '',
      }
    })
    vi.stubGlobal('fetch', fetchMock)

    const PageDocDetail = (await import('../../../app/pages/site/PageDocDetail')).default
    const router = createRouter({
      history: createMemoryHistory('/page/sponsor/index'),
      routes: [{ path: '/page/:path(.*)', component: PageDocDetail as any }],
    })
    attachRouter(router)

    const container = mountContainer()
    const mounted = createMountedCompiledTestComponent(RouterView as any, container)

    await waitForContent(() => {
      expect(container.querySelector('#doc-body')?.textContent).toContain(
        'Fallback markdown content.',
      )
      expect(container.querySelector('.copy-code-btn')?.textContent).toBe('复制')
    })

    await click(container.querySelector('.copy-code-btn'))

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("const sponsor = 'Rue'"))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toContain('/docs/sponsor/index.md')
    mounted.dispose()
  })
})
