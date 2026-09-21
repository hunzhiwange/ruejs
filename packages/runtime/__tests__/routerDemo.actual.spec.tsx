// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { attachRouter, createRouter, type HistoryLike } from '@rue-js/router'
import { setReactiveScheduling } from '../src/runtime-core/compiled'
import { createMountedCompiledTestComponent } from './compiler-capability-test-runtime'
import RouterDemo from '../../../app/pages/examples/RouterDemo'
import {
  RouterDemoGuideShell,
  RouterDemoLabPage,
  RouterDemoTopicPage,
} from '../../../app/pages/examples/router-demo/RouterDemoScene'
import { routerDemoLabEnabled } from '../../../app/pages/examples/router-demo/state'
import { mountContainer, waitForContent } from './page-test-utils'

vi.mock('../../../app/pages/examples/createHomeSplitExamplePage', () => ({
  default: (props: { children?: unknown }) => <div>{props.children}</div>,
}))

const history = (initial: string): HistoryLike & { pushes: string[]; replaces: string[] } => {
  let path = initial
  const value = {
    pushes: [] as string[],
    replaces: [] as string[],
    location: () => path,
    push: (next: string) => {
      path = next
      value.pushes.push(next)
    },
    replace: (next: string) => {
      path = next
      value.replaces.push(next)
    },
    listen: () => {},
    back: () => {},
  }
  return value as HistoryLike & { pushes: string[]; replaces: string[] }
}

const routes = [
  {
    path: '/examples/router-demo',
    component: RouterDemo as any,
    children: [
      {
        path: '',
        redirect: { name: 'router-demo-topic', params: { section: 'router', topic: 'overview' } },
      },
      {
        path: 'guide/:section(router|data)',
        component: RouterDemoGuideShell as any,
        children: [
          { path: ':topic', name: 'router-demo-topic', component: RouterDemoTopicPage as any },
        ],
      },
      {
        path: 'lab',
        name: 'router-demo-lab',
        component: RouterDemoLabPage as any,
        beforeEnter: () =>
          routerDemoLabEnabled.value
            ? undefined
            : { name: 'router-demo-topic', params: { section: 'router', topic: 'guards' } },
      },
    ],
  },
]

afterEach(() => {
  document.body.innerHTML = ''
  routerDemoLabEnabled.value = false
  setReactiveScheduling('frame')
})

it('mounts the actual router demo and follows its default nested redirect', async () => {
  setReactiveScheduling('sync')
  const memory = history('/examples/router-demo')
  const router = createRouter({ history: memory, routes })
  attachRouter(router)
  const container = mountContainer()
  const root = createMountedCompiledTestComponent(RouterDemo as any, container)
  try {
    await waitForContent(() => {
      expect(router.route.get()?.path).toBe('/examples/router-demo/guide/router/overview')
      expect(container.textContent).toContain('嵌套路由总览')
    })
    expect(memory.replaces).toEqual(['/examples/router-demo/guide/router/overview'])
  } finally {
    root.dispose()
  }
})

it('redirects the protected lab route until the actual demo toggle enables it', async () => {
  setReactiveScheduling('sync')
  const memory = history('/examples/router-demo')
  const router = createRouter({ history: memory, routes })
  attachRouter(router)
  await waitForContent(() => expect(router.route.get()?.name).toBe('router-demo-topic'))
  await router.push('/examples/router-demo/lab')
  expect(router.route.get()?.path).toBe('/examples/router-demo/guide/router/guards')
  routerDemoLabEnabled.value = true
  await router.push('/examples/router-demo/lab')
  expect(router.route.get()?.path).toBe('/examples/router-demo/lab')
})
