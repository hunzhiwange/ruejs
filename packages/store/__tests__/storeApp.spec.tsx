// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { type FC, useApp, computed, nextTick } from '@rue-js/rue'

import { attachStoreRoot, createStore, defineStore, useStoreRoot } from '../src'

const mountedRoots: ReturnType<typeof createStore>[] = []

const createTestRoot = () => {
  const root = createStore()
  mountedRoots.push(root)
  return root
}

const flushRender = async () => {
  await nextTick()
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

    let observed: ReturnType<typeof computed>
    const App: FC = () => {
      const store = useCounterStore()
      const count = computed(() => store.getPath('count'))
      observed = count

      return (
        <button data-testid="counter" onClick={() => store.increment()}>
          {count.value}
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
    expect(observed!.value).toBe(1)
    expect(button?.textContent).toBe('1')
  })

  it('isolates simultaneously mounted app stores and releases their binding on unmount', async () => {
    const first = createTestRoot()
    const second = createTestRoot()
    const useCounter = defineStore('isolated', { state: () => ({ count: 0 }) })
    const App: FC = () => {
      const store = useCounter()
      const count = computed(() => store.getPath('count'))
      return (
        <button onClick={() => store.update('count', (value: number) => value + 1)}>
          {count.value}
        </button>
      )
    }
    const left = document.createElement('div')
    const right = document.createElement('div')
    document.body.append(left, right)
    const a = useApp(App).use(first)
    const b = useApp(App).use(second)
    a.mount(left)
    b.mount(right)
    left.querySelector('button')!.click()
    await flushRender()
    expect(left.textContent).toBe('1')
    expect(right.textContent).toBe('0')
    a.unmount()
    expect(left.textContent).toBe('')
    right.querySelector('button')!.click()
    await flushRender()
    expect(right.textContent).toBe('1')
    a.mount(left)
    left.querySelector('button')!.click()
    await flushRender()
    expect(left.textContent).toBe('2')
    a.unmount()
    b.unmount()
    expect(() => useStoreRoot()).toThrow('Store root not installed')
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
