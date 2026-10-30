import { afterEach, describe, expect, it, vi } from 'vitest'

import { attachRouter, createRouter, RouterView } from '@rue-js/router'
import GuideDocDetail from '../../../app/pages/site/GuideDocDetail'
import { GuideRouteLayout } from '../../../app/pages/site/SidebarPlaygroundGuide'
import { loadCachedDocContent } from '../../../app/pages/site/docDetailCache'
import { setReactiveScheduling } from '../src'
import { createMountedCompiledTestComponent } from './compiler-capability-test-runtime'
import { click, createMemoryHistory, mountContainer, waitForContent } from './page-test-utils'

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('GuideDocDetail actual page', () => {
  it('reuses an empty precompiled document without invoking the browser parser', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('__RUE_STATIC_DOC_HTML_BY_ROUTE__', { '/page/empty-document': '' })
    await expect(loadCachedDocContent('page', '/docs', 'empty-document')).resolves.toEqual({
      type: 'html',
      html: '',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps precompiled document content when running the snapshot mount effects', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('__RUE_STATIC_DOC_HTML_BY_ROUTE__', {
      '/guide/guide/essentials/computed': '<h1>预生成正文</h1><p>保留静态内容。</p>',
    })
    const router = createRouter({
      history: createMemoryHistory('/guide/guide/essentials/computed'),
      routes: [{ path: '/guide/:path(.*)', component: GuideDocDetail as any }],
    })
    attachRouter(router)
    const container = mountContainer()
    const mounted = createMountedCompiledTestComponent(RouterView as any, container)
    try {
      await waitForContent(() => {
        expect(container.querySelector('#doc-body')?.textContent).toContain('保留静态内容。')
      })
      expect(fetchMock).not.toHaveBeenCalled()
    } finally {
      mounted.dispose()
    }
  })

  it('retains layout search, section toggles, and document code copying', async () => {
    const writeText = vi.fn(async () => undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () => '# 表单示例\n\n```ts\nconst message = "hello"\n```',
      })),
    )
    const router = createRouter({
      history: createMemoryHistory('/guide/guide/essentials/forms'),
      routes: [
        {
          path: '/guide',
          component: GuideRouteLayout as any,
          meta: { sidebarPlaygroundLayout: 'guide' },
          children: [{ path: ':path(.*)', component: GuideDocDetail as any }],
        },
      ],
    })
    attachRouter(router)
    const container = mountContainer()
    const mounted = createMountedCompiledTestComponent(RouterView as any, container)

    try {
      await vi.waitFor(() => {
        expect(container.querySelector('#doc-body pre.shiki')?.textContent).toContain(
          'const message',
        )
      })
      expect(
        container.querySelector('.sidebar-playground')?.getAttribute('data-rue-client-mode'),
      ).toBe('app')
      const section = container.querySelector('.collapse')!
      expect(section.classList.contains('collapse-open')).toBe(true)
      await click(section.querySelector('button.collapse-title'))
      expect(section.classList.contains('collapse-open')).toBe(false)
      await click(section.querySelector('button.collapse-title'))
      expect(section.classList.contains('collapse-open')).toBe(true)

      const input = container.querySelector<HTMLInputElement>(
        'input[placeholder="搜索条目 / Search"]',
      )!
      input.value = '表单'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      await waitForContent(() => {
        const links = container.querySelectorAll('nav [data-rue-sidebar-href]')
        expect(links).toHaveLength(1)
        expect(links[0].textContent).toContain('表单')
      })
      input.value = ''
      input.dispatchEvent(new Event('input', { bubbles: true }))
      await waitForContent(() => {
        expect(container.querySelectorAll('nav [data-rue-sidebar-href]').length).toBeGreaterThan(1)
      })

      await click(container.querySelector('#doc-body .copy-code-btn'))
      expect(writeText).toHaveBeenCalledOnce()
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('const message = "hello"'))
      expect(container.querySelector('#doc-body .copy-code-btn')?.textContent).toBe('已复制')
    } finally {
      mounted.dispose()
    }
  })

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
