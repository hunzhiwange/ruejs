import { afterEach, describe, expect, it, vi } from 'vitest'

import { attachRouter, createRouter, RouterView } from '@rue-js/router'
import PageDocDetail from '../../../app/pages/site/PageDocDetail'
import { setReactiveScheduling } from '../src'
import { createMountedCompiledTestComponent } from './compiler-capability-test-runtime'
import { createMemoryHistory, mountContainer, waitForContent } from './page-test-utils'

vi.mock('../../../app/pages/site/SidebarPlaygroundPage', () => ({
  default: (props: { children?: unknown }) => <div>{props.children}</div>,
}))
setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('PageDocDetail actual page', () => {
  it('renders, navigates, and reuses cached standalone pages', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => ({
      ok: true,
      text: async () =>
        String(input).includes('sponsor/index.md')
          ? '# Sponsor\n\nAlpha sponsor copy.'
          : '# Partners\n\nPartner listing copy.',
    }))
    vi.stubGlobal('fetch', fetchMock)
    const history = createMemoryHistory('/page/sponsor/index')
    const router = createRouter({
      history,
      routes: [{ path: '/page/:path(.*)', component: PageDocDetail as any }],
    })
    attachRouter(router)
    const container = mountContainer()
    const mounted = createMountedCompiledTestComponent(RouterView as any, container)

    await waitForContent(() =>
      expect(container.querySelector('#doc-body')?.textContent).toContain('Alpha sponsor copy.'),
    )
    await router.push('/page/partners/index')
    await waitForContent(() =>
      expect(container.querySelector('#doc-body')?.textContent).toContain('Partner listing copy.'),
    )
    await router.push('/page/sponsor/index')
    await waitForContent(() =>
      expect(container.querySelector('#doc-body')?.textContent).toContain('Alpha sponsor copy.'),
    )

    const urls = fetchMock.mock.calls.map(([input]) => String(input))
    expect(urls.filter(url => url.includes('sponsor/index.md'))).toHaveLength(1)
    expect(urls.filter(url => url.includes('partners/index.md'))).toHaveLength(1)
    mounted.dispose()
  })
})
