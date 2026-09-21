import { afterEach, describe, expect, it, vi } from 'vitest'

import { attachRouter, createRouter, RouterView } from '@rue-js/router'
import GuideDocDetail from '../../../app/pages/site/GuideDocDetail'
import { setReactiveScheduling } from '../src'
import { createMountedCompiledTestComponent } from './compiler-capability-test-runtime'
import { createMemoryHistory, mountContainer, waitForContent } from './page-test-utils'

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('GuideDocDetail actual page', () => {
  it('renders, navigates, and reuses cached guide documents', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => ({
      ok: true,
      text: async () =>
        String(input).includes('introduction.md')
          ? '# 介绍\n\n这是一段测试内容。'
          : '# 快速开始\n\n创建 Rue 应用',
    }))
    vi.stubGlobal('fetch', fetchMock)
    const history = createMemoryHistory('/guide/guide/introduction')
    const router = createRouter({
      history,
      routes: [{ path: '/guide/:path(.*)', component: GuideDocDetail as any }],
    })
    attachRouter(router)
    const container = mountContainer()
    const mounted = createMountedCompiledTestComponent(RouterView as any, container)

    await waitForContent(() => {
      expect(container.querySelector('#doc-body')?.textContent).toContain('这是一段测试内容。')
      expect(container.textContent).toContain('下一页：快速上手')
    })
    await router.push('/guide/guide/quick-start')
    await waitForContent(() =>
      expect(container.querySelector('#doc-body')?.textContent).toContain('创建 Rue 应用'),
    )
    await router.push('/guide/guide/introduction')
    await waitForContent(() =>
      expect(container.querySelector('#doc-body')?.textContent).toContain('这是一段测试内容。'),
    )

    const urls = fetchMock.mock.calls.map(([input]) => String(input))
    expect(urls.filter(url => url.includes('introduction.md'))).toHaveLength(1)
    expect(urls.filter(url => url.includes('quick-start.md'))).toHaveLength(0)
    mounted.dispose()
  })
})
