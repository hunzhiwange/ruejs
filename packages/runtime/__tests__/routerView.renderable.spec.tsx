import { afterEach, describe, expect, it, vi } from 'vitest'

import { attachRouter, createRouter, createWebHashHistory, RouterView } from '@rue-js/router'

import { onUnmounted, render, setReactiveScheduling, useComponent, type FC } from '../src'

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
  window.location.hash = ''
})

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const UserRoute: FC<{ params: { id: string } }> = props => (
  <section data-testid="route-user">user:{props.params.id}</section>
)

const OtherRoute: FC = () => <section data-testid="route-other">other</section>

describe('RouterView renderable boundary', () => {
  it('updates same-component params and clears old route content across switches', async () => {
    window.location.hash = '#/users/1'

    const router = createRouter({
      history: createWebHashHistory(),
      routes: [
        { path: '/', component: OtherRoute },
        { path: '/users/:id', component: UserRoute },
        { path: '/other', component: OtherRoute },
      ],
    })
    attachRouter(router)

    const container = document.createElement('div')
    document.body.appendChild(container)
    render(<RouterView />, container)

    await flush()
    expect(container.textContent).toBe('user:1')

    router.push('/users/2')
    await flush()
    expect(container.textContent).toBe('user:2')
    expect(container.querySelectorAll('[data-testid="route-user"]').length).toBe(1)

    router.push('/other')
    await flush()
    expect(container.textContent).toBe('other')
    expect(container.querySelector('[data-testid="route-user"]')).toBeNull()
    expect(container.querySelectorAll('[data-testid="route-other"]').length).toBe(1)
  })

  it('fires route component onUnmounted when switching away', async () => {
    window.location.hash = '#/tracked'

    const unmounted = vi.fn()
    const TrackedRoute: FC = () => {
      onUnmounted(unmounted)
      return <section data-testid="route-tracked">tracked</section>
    }

    const router = createRouter({
      history: createWebHashHistory(),
      routes: [
        { path: '/', component: OtherRoute },
        { path: '/tracked', component: TrackedRoute },
        { path: '/other', component: OtherRoute },
      ],
    })
    attachRouter(router)

    const container = document.createElement('div')
    document.body.appendChild(container)
    render(<RouterView />, container)

    await flush()
    expect(container.textContent).toBe('tracked')

    router.push('/other')
    await flush()

    expect(container.textContent).toBe('other')
    expect(unmounted).toHaveBeenCalledTimes(1)
  })

  it('fires lazy route component onUnmounted when switching away', async () => {
    window.location.hash = '#/tracked'

    const unmounted = vi.fn()
    const TrackedRoute: FC = () => {
      onUnmounted(unmounted)
      return <section data-testid="route-tracked">tracked</section>
    }
    const LazyTrackedRoute = useComponent(async () => ({ default: TrackedRoute }))

    const router = createRouter({
      history: createWebHashHistory(),
      routes: [
        { path: '/', component: OtherRoute },
        { path: '/tracked', component: LazyTrackedRoute },
        { path: '/other', component: OtherRoute },
      ],
    })
    attachRouter(router)

    const container = document.createElement('div')
    document.body.appendChild(container)
    render(<RouterView />, container)

    await flush()
    expect(container.textContent).toBe('tracked')

    router.push('/other')
    await flush()

    expect(container.textContent).toBe('other')
    expect(unmounted).toHaveBeenCalledTimes(1)
  })
})
