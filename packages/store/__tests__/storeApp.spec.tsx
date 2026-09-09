// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { type FC, useApp } from '@rue-js/rue'

import { attachStoreRoot, createStore, defineStore, useStoreRoot } from '../src'

const mountedRoots: ReturnType<typeof createStore>[] = []

const createTestRoot = () => {
  const root = createStore()
  mountedRoots.push(root)
  return root
}

const flushRender = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await new Promise(resolve => setTimeout(resolve, 0))
}

afterEach(() => {
  document.body.innerHTML = ''
  while (mountedRoots.length > 0) {
    mountedRoots.pop()?.dispose()
  }
})

describe('@rue-js/store app integration', () => {
  it('exposes the installed root through app.use for components', async () => {
    const root = createTestRoot()
    const useCounterStore = defineStore('app-counter', {
      state: () => ({
        count: 0,
      }),
      actions: {
        increment(this: any) {
          this.update(['count'], (count: number) => count + 1)
        },
      },
    })

    const App: FC = () => {
      const store = useCounterStore()

      return (
        <button data-testid="counter" onClick={() => store.increment()}>
          {store.getPath(['count'])}
        </button>
      )
    }

    const container = document.createElement('div')
    document.body.appendChild(container)

    useApp(App).use(root).mount(container)
    await flushRender()

    const button = container.querySelector('[data-testid="counter"]') as HTMLButtonElement | null
    expect(button?.textContent).toBe('0')
    expect(root._s.has('app-counter')).toBe(true)

    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushRender()

    expect(useCounterStore(root).count).toBe(1)
  })

  it('requires an attached root when a store is used outside an explicit root', () => {
    const useSettingsStore = defineStore('settings', {
      state: () => ({
        theme: 'light',
      }),
    })

    expect(() => useStoreRoot()).toThrow('Store root not installed')
    expect(() => useSettingsStore()).toThrow('Store root not installed')

    const root = createTestRoot()
    attachStoreRoot(root)

    expect(useStoreRoot()).toBe(root)
    expect(useSettingsStore()).toBe(useSettingsStore(root))

    root.dispose()

    expect(() => useStoreRoot()).toThrow('Store root not installed')
  })
})
