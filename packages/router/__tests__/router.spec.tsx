// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { type FC, nextTick, onMounted, onUnmounted, ref, useApp } from '@rue-js/rue'

import {
  NavigationFailureType,
  RouterLink,
  RouterView,
  createMemoryHistory,
  createRouter,
  useAsyncRouteComponent,
  isNavigationFailure,
  type RouteRecord,
  useRoute,
  useRouter,
} from '../src'

const flushRender = async () => {
  await nextTick()
  await Promise.resolve()
  await Promise.resolve()
  await new Promise(resolve => setTimeout(resolve, 0))
}

const EmptyPage: FC = () => null

afterEach(() => {
  document.body.innerHTML = ''
})

describe('rue router', () => {
  it('has no Vapor package or subpath imports in its production entry', () => {
    const source = readFileSync(resolve(import.meta.dirname, '../src/index.tsx'), 'utf8')
    expect(source).not.toMatch(/@rue-js\/runtime-vapor|@rue-js\/rue\/vapor|runtime\.vapor/)
  })
  it('matches nested named routes, decodes params, and merges route meta', async () => {
    const router = createRouter({
      history: createMemoryHistory('/guide/router/overview'),
      routes: [
        {
          path: '/guide/:section',
          name: 'guide',
          component: EmptyPage,
          meta: {
            layout: 'guide',
            scope: 'parent',
          },
          children: [
            {
              path: ':topic',
              name: 'guide-topic',
              component: EmptyPage,
              meta: {
                scope: 'child',
                title: 'Topic',
              },
            },
          ],
        },
      ],
    })

    expect(router.currentPath.get()).toBe('/guide/router/overview')
    expect(router.route.get()?.name).toBe('guide-topic')
    expect(router.route.get()?.params).toEqual({
      section: 'router',
      topic: 'overview',
    })
    expect(router.route.get()?.matched.map((record: RouteRecord) => record.path)).toEqual([
      '/guide/:section',
      ':topic',
    ])
    expect(router.route.get()?.meta).toEqual({
      layout: 'guide',
      scope: 'child',
      title: 'Topic',
    })

    await expect(
      router.push({
        name: 'guide-topic',
        params: {
          section: 'api docs',
          topic: 'guards/redirects',
        },
      }),
    ).resolves.toBeUndefined()

    expect(router.currentPath.get()).toBe('/guide/api%20docs/guards%2Fredirects')
    expect(router.route.get()?.params).toEqual({
      section: 'api docs',
      topic: 'guards/redirects',
    })
  })

  it('preserves query strings in history while matching routes by pathname', async () => {
    const router = createRouter({
      history: createMemoryHistory('/products?tab=all'),
      routes: [
        { path: '/', name: 'home', component: EmptyPage },
        { path: '/products', name: 'products', component: EmptyPage },
        { path: '/products/:id(\\d+)', name: 'product-detail', component: EmptyPage },
      ],
    })

    expect(router.currentPath.get()).toBe('/products')
    expect(router.route.get()?.name).toBe('products')
    expect(router.history.location()).toBe('/products?tab=all')

    await expect(router.push('/products?q=router&tab=router&page=1')).resolves.toBeUndefined()

    expect(router.currentPath.get()).toBe('/products')
    expect(router.route.get()?.name).toBe('products')
    expect(router.history.location()).toBe('/products?q=router&tab=router&page=1')

    const duplicated = await router.push('/products?q=router&tab=router&page=1')
    expect(isNavigationFailure(duplicated, NavigationFailureType.duplicated)).toBe(true)

    await expect(router.push('/products/42?preview=1#details')).resolves.toBeUndefined()

    expect(router.currentPath.get()).toBe('/products/42')
    expect(router.route.get()?.name).toBe('product-detail')
    expect(router.route.get()?.params).toEqual({ id: '42' })
    expect(router.history.location()).toBe('/products/42?preview=1#details')
  })

  it('reports duplicated and aborted navigation failures through guards', async () => {
    const events: string[] = []
    const router = createRouter({
      history: createMemoryHistory('/'),
      routes: [
        { path: '/', name: 'home', component: EmptyPage },
        { path: '/login', name: 'login', component: EmptyPage },
        {
          path: '/admin',
          name: 'admin',
          component: EmptyPage,
          meta: {
            requiresAuth: true,
          },
        },
        {
          path: '/settings',
          name: 'settings',
          component: EmptyPage,
          beforeEnter: () => false,
        },
      ],
    })

    router.beforeEach((to, from) => {
      events.push(`before:${from?.path}->${to?.path}`)

      if (to?.meta.requiresAuth) {
        return { name: 'login' }
      }
      return undefined
    })

    router.afterEach((to, from, failure) => {
      const result = !failure ? 'ok' : isNavigationFailure(failure) ? failure.type : failure.message

      events.push(`after:${from?.path}->${to?.path}:${result}`)
    })

    await expect(router.push('/admin')).resolves.toBeUndefined()
    expect(router.currentPath.get()).toBe('/login')
    expect(router.route.get()?.name).toBe('login')

    const duplicated = await router.push('/login')
    expect(isNavigationFailure(duplicated, NavigationFailureType.duplicated)).toBe(true)

    const aborted = await router.push('/settings')
    expect(isNavigationFailure(aborted, NavigationFailureType.aborted)).toBe(true)
    expect(router.currentPath.get()).toBe('/login')

    expect(events).toEqual([
      'before:/->/admin',
      'before:/->/login',
      'after:/->/login:ok',
      'before:/login->/login',
      'after:/login->/login:duplicated',
      'before:/login->/settings',
      'after:/login->/settings:aborted',
    ])
  })

  it('loads lazy route components before committing navigation and reuses resolved modules', async () => {
    let loadCount = 0
    let resolveLazyPage: ((value: { default: FC }) => void) | undefined

    const LazyPage = useAsyncRouteComponent(() => {
      loadCount += 1

      return new Promise(resolve => {
        resolveLazyPage = resolve
      })
    })

    const router = createRouter({
      history: createMemoryHistory('/'),
      routes: [
        { path: '/', component: EmptyPage },
        { path: '/lazy', component: LazyPage },
      ],
    })

    const navigation = router.push('/lazy')
    await Promise.resolve()
    await Promise.resolve()

    expect(loadCount).toBe(1)
    expect(router.currentPath.get()).toBe('/')

    resolveLazyPage?.({ default: EmptyPage })

    await expect(navigation).resolves.toBeUndefined()
    expect(router.currentPath.get()).toBe('/lazy')

    await router.push('/')
    await router.push('/lazy')

    expect(loadCount).toBe(1)
  })

  it('cancels stale lazy route navigations before they commit', async () => {
    let resolveSlowPage: ((value: { default: FC }) => void) | undefined

    const SlowPage = useAsyncRouteComponent(
      () =>
        new Promise(resolve => {
          resolveSlowPage = resolve
        }),
    )

    const router = createRouter({
      history: createMemoryHistory('/'),
      routes: [
        { path: '/', component: EmptyPage },
        { path: '/slow', component: SlowPage },
        { path: '/fast', component: EmptyPage },
      ],
    })

    const slowNavigation = router.push('/slow')
    await Promise.resolve()
    await Promise.resolve()

    expect(router.currentPath.get()).toBe('/')

    await expect(router.push('/fast')).resolves.toBeUndefined()
    expect(router.currentPath.get()).toBe('/fast')

    resolveSlowPage?.({ default: EmptyPage })

    const slowFailure = await slowNavigation
    expect(isNavigationFailure(slowFailure, NavigationFailureType.cancelled)).toBe(true)
    expect(slowFailure?.to?.path).toBe('/slow')
    expect(slowFailure?.from?.path).toBe('/')
    expect(router.currentPath.get()).toBe('/fast')
    expect(router.history.location()).toBe('/fast')
  })

  it('renders RouterView and navigates with RouterLink inside an app', async () => {
    const HomePage: FC = () => <p data-testid="page">Home</p>
    const PostPage: FC<{ params: { id: string } }> = ({ params }) => (
      <p data-testid="page">{String(`Post ${params.id}`)}</p>
    )
    const RouteReader: FC = () => {
      const route = useRoute()
      const router = useRouter()

      return (
        <p data-testid="current">
          {String(route.get()?.path)} / {String(router.currentPath.get())}
        </p>
      )
    }
    const App: FC = () => (
      <main>
        <RouteReader />
        <RouterLink data-testid="post-link" to={{ name: 'post', params: { id: 7 } }}>
          Open Post
        </RouterLink>
        <RouterLink data-testid="home-link" to="/" replace>
          Home
        </RouterLink>
        <RouterLink data-testid="home-query-link" to="/?panel=search">
          Home Query
        </RouterLink>
        <RouterView />
      </main>
    )

    const router = createRouter({
      history: createMemoryHistory('/'),
      routes: [
        { path: '/', name: 'home', component: HomePage },
        { path: '/posts/:id(\\d+)', name: 'post', component: PostPage },
      ],
    })
    const container = document.createElement('div')
    document.body.appendChild(container)

    useApp(App).use(router).mount(container)
    await flushRender()

    const postLink = container.querySelector('[data-testid="post-link"]') as HTMLAnchorElement
    expect(postLink.getAttribute('href')).toBe('/posts/7')
    expect(container.querySelector('[data-testid="page"]')?.textContent).toBe('Home')
    expect(container.querySelector('[data-testid="current"]')?.textContent).toBe('/ / /')

    postLink.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        button: 0,
        cancelable: true,
      }),
    )
    await router.isReady()
    await flushRender()

    expect(router.currentPath.get()).toBe('/posts/7')
    expect(container.querySelector('[data-testid="page"]')?.textContent).toBe('Post 7')
    expect(container.querySelector('[data-testid="current"]')?.textContent).toBe(
      '/posts/7 / /posts/7',
    )

    const homeLink = container.querySelector('[data-testid="home-link"]') as HTMLAnchorElement
    homeLink.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        button: 0,
        cancelable: true,
      }),
    )
    await router.isReady()
    await flushRender()

    expect(router.currentPath.get()).toBe('/')
    expect(container.querySelector('[data-testid="page"]')?.textContent).toBe('Home')

    const homeQueryLink = container.querySelector(
      '[data-testid="home-query-link"]',
    ) as HTMLAnchorElement
    expect(homeQueryLink.getAttribute('href')).toBe('/?panel=search')

    homeQueryLink.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        button: 0,
        cancelable: true,
      }),
    )
    await router.isReady()
    await flushRender()

    expect(router.currentPath.get()).toBe('/')
    expect(router.history.location()).toBe('/?panel=search')
    expect(container.querySelector('[data-testid="page"]')?.textContent).toBe('Home')
  })

  it('switches RouterView between distinct compiled route component types', async () => {
    const FirstPage: FC = () => <section data-testid="dynamic-route">First</section>
    const SecondPage: FC = () => <article data-testid="dynamic-route">Second</article>
    const router = createRouter({
      history: createMemoryHistory('/first'),
      routes: [
        { path: '/first', component: FirstPage },
        { path: '/second', component: SecondPage },
      ],
    })
    const container = document.createElement('div')
    document.body.appendChild(container)

    useApp(RouterView).use(router).mount(container)
    await flushRender()

    expect(container.querySelector('[data-testid="dynamic-route"]')?.tagName).toBe('SECTION')
    expect(container.textContent).toBe('First')

    await router.push('/second')
    await router.isReady()
    await flushRender()

    expect(container.querySelector('[data-testid="dynamic-route"]')?.tagName).toBe('ARTICLE')
    expect(container.textContent).toBe('Second')
  })

  it('routes link events to their own application', async () => {
    const Home: FC = () => <p>Home</p>
    const Next: FC = () => <p>Next</p>
    const App: FC = () => (
      <main>
        <RouterLink to="/next">Next</RouterLink>
        <RouterView />
      </main>
    )
    const makeRouter = () =>
      createRouter({
        history: createMemoryHistory('/'),
        routes: [
          { path: '/', component: Home },
          { path: '/next', component: Next },
        ],
      })
    const first = makeRouter()
    const second = makeRouter()
    const left = document.createElement('div')
    const right = document.createElement('div')
    document.body.append(left, right)
    const a = useApp(App).use(first)
    const b = useApp(App).use(second)
    a.mount(left)
    b.mount(right)
    left.querySelector('a')!.click()
    await first.isReady()
    await flushRender()
    expect(first.currentPath.get()).toBe('/next')
    expect(second.currentPath.get()).toBe('/')
    expect(left.querySelector('p')?.textContent).toBe('Next')
    expect(right.querySelector('p')?.textContent).toBe('Home')
    a.unmount()
    b.unmount()
  })

  it('keeps nested route owners and cached params isolated while reusing a component', async () => {
    let mounted = 0
    let unmounted = 0
    const Page: FC<{ params: { id?: string; name?: string } }> = props => {
      onMounted(() => {
        mounted++
      })
      onUnmounted(() => {
        unmounted++
      })
      return <p data-testid="cached">{String(props.params.id ?? props.params.name)}</p>
    }
    const Layout: FC = () => (
      <section>
        <RouterView />
      </section>
    )
    const router = createRouter({
      history: createMemoryHistory('/group/a/1'),
      routes: [
        {
          path: '/group',
          component: Layout,
          children: [
            { path: 'a/:id', component: Page, persist: true },
            { path: 'b/:name', component: Page, persist: true },
          ],
        },
      ],
    })
    const target = document.createElement('div')
    document.body.append(target)
    const app = useApp(RouterView).use(router)
    app.mount(target)
    await flushRender()
    expect(target.textContent).toBe('1')
    await router.push('/group/a/2')
    await flushRender()
    expect(target.textContent).toBe('2')
    expect(mounted).toBe(1)
    await router.push('/group/b/3')
    await flushRender()
    expect(target.textContent).toBe('3')
    expect(mounted).toBe(2)
    await router.push('/group/a/4')
    await flushRender()
    expect(target.textContent).toBe('4')
    expect(mounted).toBe(2)
    expect(unmounted).toBe(0)
    app.unmount()
    expect(unmounted).toBe(2)
    expect(target.textContent).toBe('')
  })

  it('keeps a rapid editor return single-mounted when the root mount is retried', async () => {
    let resolveEditorDelay: (() => void) | undefined
    const editorDelay = new Promise<void>(resolve => {
      resolveEditorDelay = resolve
    })
    let editorMounted = 0
    let editorUnmounted = 0
    let editorResolved = 0
    let openMounted = 0
    let openRequestCount = 0

    const EditorPage: FC = () => {
      const status = ref('loading')

      onMounted(() => {
        editorMounted += 1
        void editorDelay.then(() => {
          editorResolved += 1
          status.value = 'ready'
        })
      })
      onUnmounted(() => {
        editorUnmounted += 1
      })

      return <p data-testid="editor-page">Editor {status.value}</p>
    }
    const OpenPage: FC = () => {
      onMounted(() => {
        openMounted += 1
        openRequestCount += 1
      })

      return <p data-testid="open-page">Open</p>
    }
    const router = createRouter({
      history: createMemoryHistory('/editor'),
      routes: [
        { path: '/editor', component: EditorPage },
        { path: '/open', component: OpenPage },
      ],
    })
    const container = document.createElement('div')
    const app = useApp(RouterView).use(router)
    document.body.appendChild(container)

    app.mount(container)
    await flushRender()
    expect(() => app.mount(container)).toThrow('already mounted')
    await flushRender()

    expect({ editorMounted, editorResolved }).toEqual({ editorMounted: 1, editorResolved: 0 })

    await router.push('/open')
    await router.isReady()
    await flushRender()

    expect({
      openDomCount: container.querySelectorAll('[data-testid="open-page"]').length,
      hasEditorDom: !!container.querySelector('[data-testid="editor-page"]'),
      openMounted,
      openRequestCount,
      editorUnmounted,
    }).toEqual({
      openDomCount: 1,
      hasEditorDom: false,
      openMounted: 1,
      openRequestCount: 1,
      editorUnmounted: 1,
    })

    resolveEditorDelay?.()
    await editorDelay
    await flushRender()

    expect({
      editorResolved,
      openDomCount: container.querySelectorAll('[data-testid="open-page"]').length,
      hasEditorDom: !!container.querySelector('[data-testid="editor-page"]'),
      openMounted,
      openRequestCount,
    }).toEqual({
      editorResolved: 1,
      openDomCount: 1,
      hasEditorDom: false,
      openMounted: 1,
      openRequestCount: 1,
    })

    app.unmount()
  })
})
