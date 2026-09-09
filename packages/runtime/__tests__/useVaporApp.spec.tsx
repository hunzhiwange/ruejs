// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createRue, useApp as useDefaultApp, type FC } from '../src'
import { resolveRuntimeComponent } from '../src/component-registry'
import { onMounted, onUnmounted, useApp, _$compiledRoot } from './legacy-test-render'

const flushRender = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await new Promise(resolve => setTimeout(resolve, 0))
}

afterEach(() => {
  document.body.innerHTML = ''
  delete (globalThis as any).__rue_active
})

const createTrackedRoot = (label: string, lifecycle: string[]) => () => {
  lifecycle.push(`${label}:render`)
  onMounted(() => lifecycle.push(`${label}:mounted`))
  onUnmounted(() => lifecycle.push(`${label}:unmounted`))
  return _$compiledRoot(() => {
    const node = document.createElement('main')
    node.dataset.owner = label
    node.textContent = label
    return node as any
  })
}

describe('Vapor useApp', () => {
  it('treats mounting the same app on the same container as an idempotent no-op', async () => {
    const host = document.createElement('div')
    const lifecycle: string[] = []
    const app = useApp(createTrackedRoot('vapor', lifecycle))
    document.body.appendChild(host)

    app.mount(host)
    await flushRender()
    app.mount(host)
    await flushRender()

    expect(lifecycle).toEqual(['vapor:render', 'vapor:mounted'])
    expect(host.querySelector('[data-owner="vapor"]')?.textContent).toBe('vapor')

    app.unmount()
    await flushRender()
    app.unmount()
    await flushRender()

    expect(lifecycle).toEqual(['vapor:render', 'vapor:mounted', 'vapor:unmounted'])
    expect(host.textContent).toBe('')
  })

  it('rejects moving a mounted Vapor app without changing either DOM tree', async () => {
    const firstHost = document.createElement('div')
    const secondHost = document.createElement('div')
    const lifecycle: string[] = []
    const app = useApp(createTrackedRoot('vapor', lifecycle))
    secondHost.textContent = 'untouched'
    document.body.append(firstHost, secondHost)

    app.mount(firstHost)
    await flushRender()

    expect(() => app.mount(secondHost)).toThrowError(
      'Rue app is already mounted on a different container.',
    )
    await flushRender()

    expect(lifecycle).toEqual(['vapor:render', 'vapor:mounted'])
    expect(firstHost.querySelector('[data-owner="vapor"]')?.textContent).toBe('vapor')
    expect(secondHost.textContent).toBe('untouched')

    app.unmount()
  })

  it('shares ownership with the default entry and allows takeover after unmount', async () => {
    const host = document.createElement('div')
    const DefaultRoot: FC = () => <main data-owner="default">default</main>
    const defaultApp = useDefaultApp(DefaultRoot)
    const vaporApp = useApp(createTrackedRoot('vapor', []))
    document.body.appendChild(host)

    defaultApp.mount(host)
    await flushRender()

    expect(() => vaporApp.mount(host)).toThrowError(
      'Rue container is already mounted by another app.',
    )
    expect(host.querySelector('[data-owner="default"]')?.textContent).toBe('default')

    defaultApp.unmount()
    await flushRender()
    vaporApp.mount(host)
    await flushRender()

    expect(host.querySelector('[data-owner="vapor"]')?.textContent).toBe('vapor')

    vaporApp.unmount()
  })

  it('rolls back shared ownership when Vapor mount throws', async () => {
    const host = document.createElement('div')
    const failedApp = useApp(() =>
      _$compiledRoot(() => {
        throw new Error('vapor root mount failed')
      }),
    )
    const recoveredApp = useDefaultApp(() => <main data-owner="recovered">recovered</main>)
    document.body.appendChild(host)

    expect(() => failedApp.mount(host)).toThrowError('vapor root mount failed')
    await flushRender()
    expect(host.textContent).toBe('')

    recoveredApp.mount(host)
    await flushRender()

    expect(host.querySelector('[data-owner="recovered"]')?.textContent).toBe('recovered')

    recoveredApp.unmount()
  })

  it('makes a reentrant unmount a no-op and releases ownership once', async () => {
    const host = document.createElement('div')
    const lifecycle: string[] = []
    let app: ReturnType<typeof useApp>
    const Root = () => {
      lifecycle.push('vapor:render')
      onMounted(() => lifecycle.push('vapor:mounted'))
      onUnmounted(() => {
        lifecycle.push('vapor:unmounted')
        app.unmount()
      })
      return _$compiledRoot(() => {
        const node = document.createElement('main')
        node.textContent = 'vapor'
        return node as any
      })
    }
    app = useApp(Root)
    const nextApp = useDefaultApp(() => <main data-owner="next">next</main>)
    document.body.appendChild(host)

    app.mount(host)
    await flushRender()
    app.unmount()
    await flushRender()

    expect(lifecycle).toEqual(['vapor:render', 'vapor:mounted', 'vapor:unmounted'])
    expect(host.textContent).toBe('')

    nextApp.mount(host)
    await flushRender()
    expect(host.querySelector('[data-owner="next"]')?.textContent).toBe('next')

    nextApp.unmount()
  })

  it('uses an explicitly supplied isolated runtime for plugins, registration, mount, and unmount', async () => {
    const host = document.createElement('div')
    const install = vi.fn()
    let renderRuntime: unknown

    document.body.appendChild(host)

    const Registered = () => {
      renderRuntime = (globalThis as any).__rue_active
      return _$compiledRoot(() => {
        const article = document.createElement('article')
        article.dataset.testid = 'registered'
        article.textContent = 'vapor app'
        return article as any
      })
    }
    const App = Registered

    const isolatedRuntime = createRue()
    const app = useApp(App, isolatedRuntime).use({ install }).component('Registered', Registered)

    app.mount(host)
    await flushRender()

    expect(install).toHaveBeenCalledTimes(1)
    expect(renderRuntime).toBe(isolatedRuntime)
    expect(renderRuntime).not.toBe((globalThis as any).__rue)
    expect(resolveRuntimeComponent(renderRuntime, 'Registered')).toBe(Registered)
    expect(host.hasAttribute('data-rue-app')).toBe(true)
    expect(host.querySelector('[data-testid="registered"]')?.textContent).toBe('vapor app')

    app.unmount()
    await flushRender()

    expect(host.textContent).toBe('')
  })

  it('installs plugins in registration order and preserves duplicate registrations', async () => {
    const host = document.createElement('div')
    const events: string[] = []
    const firstPlugin = {
      install(app: unknown, options: unknown[]) {
        events.push(`first:${String(app)}:${options.join(',')}`)
      },
    }
    const secondPlugin = {
      install(_app: unknown, options: unknown[]) {
        events.push(`second:${options.join(',')}`)
      },
    }
    const app = useApp(createTrackedRoot('plugins', events))
      .use(firstPlugin, ['one'])
      .use(secondPlugin, ['two', 'three'])
      .use(firstPlugin, ['repeat'])
    document.body.appendChild(host)

    app.mount(host)
    await flushRender()

    expect(events).toEqual([
      'first:undefined:one',
      'second:two,three',
      'first:undefined:repeat',
      'plugins:render',
      'plugins:mounted',
    ])

    app.unmount()
  })

  it('shares the default client runtime between app instances', async () => {
    const firstHost = document.createElement('div')
    const secondHost = document.createElement('div')
    const renderRuntimes: unknown[] = []

    document.body.append(firstHost, secondHost)

    const createRoot = (label: string) => () => {
      renderRuntimes.push((globalThis as any).__rue_active)
      return _$compiledRoot(() => {
        const node = document.createElement('div')
        node.textContent = label
        return node as any
      })
    }

    const firstApp = useApp(createRoot('first'))
    const secondApp = useApp(createRoot('second'))

    firstApp.mount(firstHost)
    secondApp.mount(secondHost)
    await flushRender()

    expect(renderRuntimes).toHaveLength(2)
    expect(renderRuntimes[0]).toBe(renderRuntimes[1])
    expect(renderRuntimes[0]).toBe((globalThis as any).__rue)
    expect(firstHost.textContent).toBe('first')
    expect(secondHost.textContent).toBe('second')

    secondApp.unmount()
    await flushRender()

    expect(firstHost.textContent).toBe('first')
    expect(secondHost.textContent).toBe('')

    firstApp.unmount()
  })
})
