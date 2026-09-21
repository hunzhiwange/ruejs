import { afterEach, describe, expect, it, vi } from 'vitest'

import { attachRouter, createRouter } from '@rue-js/router'

import IndexPage from '../../../app/pages/jsx/Index'
import { setReactiveScheduling } from '../src'
import { createMountedCompiledTestComponent } from './compiler-capability-test-runtime'
import { click, createMemoryHistory, mountContainer, waitForContent } from './page-test-utils'

vi.mock('../../../app/pages/site/SidebarPlaygroundExample', () => ({
  default: (props: { children?: unknown }) => (
    <div data-testid="mock-sidebar-example">{props.children}</div>
  ),
}))

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('JSX index actual page', () => {
  it('renders the JSX case directory and navigates through RouterLink items', async () => {
    const Empty = () => null
    const history = createMemoryHistory('/jsx')
    const router = createRouter({
      history,
      routes: [
        { path: '/jsx', component: IndexPage as any },
        { path: '/jsx/basic-elements', component: Empty as any },
      ],
    })
    attachRouter(router)

    const container = mountContainer()
    const mounted = createMountedCompiledTestComponent(IndexPage as any, container)

    await waitForContent(() => {
      const links = Array.from(container.querySelectorAll('a'))
      expect(container.textContent).toContain('React JSX 语法目录')
      expect(links).toHaveLength(28)
      expect(links[0]?.textContent).toContain('基础元素与自闭合标签')
      expect(links[0]?.getAttribute('href')).toBe('/jsx/basic-elements')
      expect(links[15]?.getAttribute('href')).toBe('/jsx/v-for-r-for')
      expect(links[27]?.getAttribute('href')).toBe('/jsx/refs')
    })

    await click(container.querySelector('a[href="/jsx/basic-elements"]'))
    await waitForContent(() => expect(history.location()).toBe('/jsx/basic-elements'))
    mounted.dispose()
  })
})
