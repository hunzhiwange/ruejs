import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { attachRouter, createRouter, RouterView } from '@rue-js/router'
import ApiDocDetail from '../../../app/pages/site/ApiDocDetail'
import { SECTIONS_BY_TYPE } from '../../../app/pages/site/SidebarPlaygroundApi'
import { setReactiveScheduling } from '../src'
import { createMountedCompiledTestComponent } from './compiler-capability-test-runtime'
import { createMemoryHistory, mountContainer, waitForContent } from './page-test-utils'

vi.mock('../../../app/pages/site/SidebarPlaygroundApi', async () => {
  const actual = await vi.importActual<
    typeof import('../../../app/pages/site/SidebarPlaygroundApi')
  >('../../../app/pages/site/SidebarPlaygroundApi')
  return { ...actual, default: (props: { children?: unknown }) => <div>{props.children}</div> }
})

setReactiveScheduling('sync')
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
type Item = { id: string; href?: string; children?: Item[] }
const linkedIds = (items: Item[]): string[] =>
  items.flatMap(item =>
    item.children?.length ? linkedIds(item.children) : item.href ? [item.id] : [],
  )

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('ApiDocDetail actual page', () => {
  it('keeps every linked API entry backed by a markdown document', () => {
    const missing = SECTIONS_BY_TYPE.api
      .flatMap(section => linkedIds(section.items))
      .filter(id => !existsSync(resolve(repoRoot, 'docs', `${id}.md`)))
    expect(missing).toEqual([])
  })

  it('renders, navigates, and reuses cached API documents', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => ({
      ok: true,
      text: async () =>
        String(input).includes('application.md')
          ? '# 应用实例\n\n应用实例测试内容。'
          : '# 内置组件\n\n组件测试内容。',
    }))
    vi.stubGlobal('fetch', fetchMock)
    const history = createMemoryHistory('/api/api/application')
    const router = createRouter({
      history,
      routes: [{ path: '/api/:path(.*)', component: ApiDocDetail as any }],
    })
    attachRouter(router)
    const container = mountContainer()
    const mounted = createMountedCompiledTestComponent(RouterView as any, container)

    await waitForContent(() => {
      expect(container.querySelector('#doc-body')?.textContent).toContain('应用实例测试内容。')
      expect(container.textContent).toContain('下一页：内置组件')
    })
    await router.push('/api/api/built-in-components')
    await waitForContent(() =>
      expect(container.querySelector('#doc-body')?.textContent).toContain('组件测试内容。'),
    )
    await router.push('/api/api/application')
    await waitForContent(() =>
      expect(container.querySelector('#doc-body')?.textContent).toContain('应用实例测试内容。'),
    )

    const urls = fetchMock.mock.calls.map(([input]) => String(input))
    expect(urls.filter(url => url.includes('application.md'))).toHaveLength(1)
    expect(urls.filter(url => url.includes('built-in-components.md'))).toHaveLength(1)
    mounted.dispose()
  })
})
