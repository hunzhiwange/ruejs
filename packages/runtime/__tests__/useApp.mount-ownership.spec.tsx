// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'

import { getCurrentContainer, onMounted, onUnmounted, useApp, type FC } from '@rue-js/rue'

const flushRender = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await new Promise(resolve => setTimeout(resolve, 0))
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('useApp mount ownership', () => {
  it('installs plugins in the target container before rendering a compiled root', () => {
    const host = document.createElement('div')
    const calls: string[] = []
    const plugin = {
      install() {
        calls.push(getCurrentContainer() === host ? 'plugin:host' : 'plugin:missing')
      },
    }
    const Root: FC = () => {
      calls.push(getCurrentContainer() === host ? 'render:host' : 'render:missing')
      return <main>ready</main>
    }
    document.body.appendChild(host)

    useApp(Root).use(plugin).mount(host)

    expect(calls).toEqual(['plugin:host', 'render:host'])
    expect(host.textContent).toBe('ready')
  })

  it('rejects a duplicate mount without repeating setup', async () => {
    const host = document.createElement('div')
    const lifecycle: string[] = []
    const Root: FC = () => {
      lifecycle.push('first:render')
      onMounted(() => lifecycle.push('first:mounted'))
      onUnmounted(() => lifecycle.push('first:unmounted'))
      return <main data-owner="first">first</main>
    }
    const app = useApp(Root)
    document.body.appendChild(host)

    app.mount(host)
    await flushRender()
    expect(() => app.mount(host)).toThrowError('[rue] app is already mounted')
    await flushRender()

    expect(lifecycle).toEqual(['first:render', 'first:mounted'])
    expect(host.querySelector('[data-owner="first"]')?.textContent).toBe('first')

    app.unmount()
    await flushRender()

    expect(lifecycle).toEqual(['first:render', 'first:mounted', 'first:unmounted'])
    expect(host.textContent).toBe('')
  })

  it('rejects moving a mounted app to another container without changing either DOM tree', async () => {
    const firstHost = document.createElement('div')
    const secondHost = document.createElement('div')
    const lifecycle: string[] = []
    const Root: FC = () => {
      lifecycle.push('first:render')
      onMounted(() => lifecycle.push('first:mounted'))
      onUnmounted(() => lifecycle.push('first:unmounted'))
      return <main data-owner="first">first</main>
    }
    const app = useApp(Root)
    secondHost.textContent = 'untouched'
    document.body.append(firstHost, secondHost)

    app.mount(firstHost)
    await flushRender()

    expect(() => app.mount(secondHost)).toThrowError('[rue] app is already mounted')
    await flushRender()

    expect(lifecycle).toEqual(['first:render', 'first:mounted'])
    expect(firstHost.querySelector('[data-owner="first"]')?.textContent).toBe('first')
    expect(secondHost.textContent).toBe('untouched')

    app.unmount()
  })

  it('rejects a second app before it can take over an occupied container', async () => {
    const host = document.createElement('div')
    const lifecycle: string[] = []
    const First: FC = () => {
      lifecycle.push('first:render')
      onMounted(() => lifecycle.push('first:mounted'))
      onUnmounted(() => lifecycle.push('first:unmounted'))
      return <main data-owner="first">first</main>
    }
    const Second: FC = () => {
      lifecycle.push('second:render')
      return <main data-owner="second">second</main>
    }
    const firstApp = useApp(First)
    const secondApp = useApp(Second)
    document.body.appendChild(host)

    firstApp.mount(host)
    await flushRender()

    expect(() => secondApp.mount(host)).toThrowError('[rue] mountApp target already has an app')
    await flushRender()

    expect(lifecycle).toEqual(['first:render', 'first:mounted'])
    expect(host.querySelector('[data-owner="first"]')?.textContent).toBe('first')

    firstApp.unmount()
    await flushRender()
    expect(lifecycle).toEqual(['first:render', 'first:mounted', 'first:unmounted'])
    expect(host.textContent).toBe('')
  })

  it('releases ownership on unmount so apps can remount or hand off the container', async () => {
    const host = document.createElement('div')
    const First = () => <main data-owner="first">first</main>
    const firstApp = useApp(First)
    const Second = () => <main data-owner="second">second</main>
    const secondApp = useApp(Second)
    document.body.appendChild(host)

    firstApp.mount(host)
    await flushRender()
    firstApp.unmount()
    await flushRender()
    firstApp.mount(host)
    await flushRender()
    firstApp.unmount()
    await flushRender()

    secondApp.mount(host)
    await flushRender()

    expect(host.querySelector('[data-owner="second"]')?.textContent).toBe('second')

    secondApp.unmount()
  })

  it('rolls back the root and ownership when the root component throws during mount', async () => {
    const host = document.createElement('div')
    const isolatedHost = document.createElement('div')
    let shouldThrow = true
    let renderCount = 0
    const mountError = new Error('root mount failed')
    const Root: FC = () => {
      renderCount += 1
      if (shouldThrow) throw mountError
      return <main>not rendered</main>
    }
    const failedApp = useApp(Root)
    const Recovered = () => <main data-owner="recovered">recovered</main>
    const recoveredApp = useApp(Recovered)
    document.body.append(host, isolatedHost)

    expect(() => failedApp.mount(host)).toThrowError('root mount failed')
    await flushRender()
    expect(host.textContent).toBe('')
    expect(host.hasAttribute('data-rue-app')).toBe(false)
    shouldThrow = false

    failedApp.mount(host)
    await flushRender()
    expect(renderCount).toBe(2)
    expect(host.textContent).toBe('not rendered')
    failedApp.unmount()
    recoveredApp.mount(host)
    expect(host.textContent).toBe('recovered')
    recoveredApp.unmount()

    recoveredApp.mount(isolatedHost)
    await flushRender()
    expect(isolatedHost.querySelector('[data-owner="recovered"]')?.textContent).toBe('recovered')

    recoveredApp.unmount()
  })
})
