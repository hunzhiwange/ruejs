import {
  attachRouter,
  createMemoryHistory,
  createRouter,
  createWebHistory,
  useAsyncRouteComponent,
  type HistoryLike,
  type RouteRecordRaw,
} from '@rue-js/router'
import { App } from './App'
export { App }

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: useAsyncRouteComponent(() => import('./pages/Home')),
  },
  {
    path: '/about',
    name: 'about',
    component: useAsyncRouteComponent(() => import('./pages/About')),
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: useAsyncRouteComponent(() => import('./pages/Dashboard')),
  },
  {
    path: '/counter',
    name: 'counter',
    component: useAsyncRouteComponent(() => import('./pages/Counter')),
  },
  {
    path: '/:path(.*)',
    name: 'not-found',
    component: useAsyncRouteComponent(() => import('./pages/NotFound')),
    meta: { status: 404 },
  },
]

export const createApp = (history: HistoryLike = createWebHistory()) => {
  const router = createRouter({ history, routes })
  attachRouter(router)

  return { app: App, router }
}

export const createServerApp = (url = '/') => createApp(createMemoryHistory(url))
