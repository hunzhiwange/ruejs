// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { types } from 'node:util'

import {
  batch,
  computed,
  nextTick,
  ref,
  signal,
  setReactiveScheduling,
  watchEffect,
} from '@rue-js/rue'
import { createStore, defineStore, storeToRefs } from '../src'
import {
  effect as compiledEffect,
  __rueGetCompiledReactiveDebugState as graphStats,
} from '../../runtime/src/runtime-core/compiled'

const mountedRoots: ReturnType<typeof createStore>[] = []

const createTestRoot = () => {
  const root = createStore()
  mountedRoots.push(root)
  return root
}

afterEach(() => {
  while (mountedRoots.length > 0) {
    mountedRoots.pop()?.dispose()
  }
  setReactiveScheduling('microtask')
})

describe('@rue-js/store', () => {
  it('shares the compiler graph and releases store nodes, computed values and subscriptions', () => {
    setReactiveScheduling('sync')
    const before = graphStats()
    const root = createTestRoot()
    const store = defineStore('release', {
      state: () => ({ count: 0, other: 0 }),
      getters: { doubled: store => store.getPath(['count']) * 2 },
    })(root)
    const seen: number[] = []
    const stop = compiledEffect(() => seen.push(store.doubled))
    const snapshots: number[] = []
    store.subscribe((_mutation, state) => snapshots.push(state.count))
    batch(() => {
      store.set(['count'], 1)
      store.set(['count'], 2)
      store.set(['other'], 3)
    })
    expect(seen).toEqual([0, 4])
    expect(snapshots).toEqual([2])
    expect(graphStats().nodeCount).toBeGreaterThan(before.nodeCount)
    stop.dispose()
    root.dispose()
    expect(graphStats()).toEqual(before)
  })

  it('routes setup Signal paths to their original sources', () => {
    setReactiveScheduling('sync')
    const store = defineStore('setup-paths', () => ({ profile: signal({ name: 'Rue', age: 1 }) }))(
      createTestRoot(),
    )
    const names: string[] = []
    const effect = watchEffect(() => names.push(store.getPath(['profile', 'name'])))
    store.set(['profile', 'age'], 2)
    store.set(['profile', 'name'], 'Signal')
    store.mutatePath(['profile'], (profile: any) => {
      profile.name = 'Store'
    })
    expect(names).toEqual(['Rue', 'Signal', 'Store'])
    expect(store.get().profile.age).toBe(2)
    store.update([], (state: any) => ({ ...state, extra: 1 }))
    expect(store.get().profile.name).toBe('Store')
    store.set([], { profile: { name: 'Reset', age: 3 } })
    expect(store.get()).toEqual({ profile: { name: 'Reset', age: 3 } })
    expect('extra' in store).toBe(false)
    effect.dispose()
  })

  it('tracks explicit paths precisely and batches list mutations', () => {
    setReactiveScheduling('sync')
    const store = defineStore('paths', { state: () => ({ left: 1, right: 2, items: [1] }) })(
      createTestRoot(),
    )
    expect(types.isProxy(store)).toBe(false)
    expect(types.isProxy(store.get())).toBe(false)
    expect(types.isProxy(store.getPath(['items']))).toBe(false)
    const values: unknown[] = []
    const effect = watchEffect(() => values.push(store.getPath(['left'])))
    store.set(['right'], 3)
    expect(values).toEqual([1])
    store.update(['left'], (value: number) => value + 1)
    expect(values).toEqual([1, 2])
    store.mutatePath(['items'], (items: number[]) => items.push(2, 3))
    expect(store.get().items).toEqual([1, 2, 3])
    effect.dispose()
  })

  it('supports options stores with getters, actions, patching and subscriptions', async () => {
    const root = createTestRoot()

    const useCounterStore = defineStore('counter', {
      state: () => ({
        count: 0,
        nested: {
          label: 'seed',
        },
      }),
      getters: {
        double(state: any) {
          return state.getPath(['count']) * 2
        },
        summary(this: any) {
          return `${this.count}:${this.double}:${this.getPath(['nested', 'label'])}`
        },
      },
      actions: {
        increment(this: any, step = 1) {
          this.update(['count'], (value: number) => value + step)
        },
        rename(this: any, label: string) {
          this.set(['nested', 'label'], label)
        },
      },
    })

    const store = useCounterStore(root)
    const doubles: number[] = []
    const stopEffect = watchEffect(() => {
      doubles.push(store.double)
    })

    const snapshots: string[] = []
    const unsubscribe = store.subscribe((_mutation, state) => {
      snapshots.push(`${state.count}:${state.nested.label}`)
    })

    expect(store.summary).toBe('0:0:seed')

    store.increment()
    await nextTick()
    expect(store.summary).toBe('1:2:seed')

    store.$patch({
      nested: {
        label: 'patched',
      },
    })
    await nextTick()
    expect(store.summary).toBe('1:2:patched')

    store.set(['nested', 'label'], 'path')
    await nextTick()
    expect(store.summary).toBe('1:2:path')

    store.increment(2)
    await nextTick()
    expect(store.summary).toBe('3:6:path')

    store.$reset()
    await nextTick()
    expect(store.summary).toBe('0:0:seed')
    expect(doubles).toEqual([0, 2, 6, 0])
    expect(snapshots).toEqual(['1:seed', '1:patched', '1:path', '3:path', '0:seed'])

    unsubscribe()
    stopEffect.dispose()
  })

  it('applies plugins to existing and future stores with descriptor extensions', () => {
    const root = createTestRoot()
    const applied: string[] = []

    const useFirstStore = defineStore('first', {
      state: () => ({
        count: 1,
      }),
    })

    const first = useFirstStore(root)

    expect(root.use(undefined as any)).toBe(root)
    expect(
      root.use(({ store, root: pluginRoot, id }) => {
        applied.push(`${id}:${pluginRoot === root}:${store.$id}`)

        const extension = Object.create(null)
        Object.defineProperty(extension, 'pluginId', {
          enumerable: true,
          get: () => `${id}:${store.$id}`,
        })
        Object.defineProperty(extension, 'pluginValue', {
          enumerable: true,
          get: () => store.$state.pluginValue,
          set: value => {
            store.set('pluginValue', value)
          },
        })
        return extension
      }),
    ).toBe(root)

    expect(first.pluginId).toBe('first:first')
    first.pluginValue = 'from-plugin'
    expect(first.$state.pluginValue).toBe('from-plugin')

    const useSecondStore = defineStore('second', {
      state: () => ({
        count: 2,
      }),
    })

    const second = useSecondStore(root)

    expect(second.pluginId).toBe('second:second')
    second.pluginValue = 'future-store'
    expect(second.$state.pluginValue).toBe('future-store')
    expect(applied).toEqual(['first:true:first', 'second:true:second'])
  })

  it('isolates the same store definition across store roots', async () => {
    const rootA = createStore()
    const rootB = createStore()

    const usePreferencesStore = defineStore('preferences', {
      state: () => ({
        theme: 'light',
      }),
      actions: {
        toggle(this: any) {
          this.update(['theme'], (theme: string) => (theme === 'light' ? 'dark' : 'light'))
        },
      },
    })

    const storeA = usePreferencesStore(rootA)
    const storeB = usePreferencesStore(rootB)

    storeA.toggle()
    await nextTick()

    expect(storeA.theme).toBe('dark')
    expect(storeB.theme).toBe('light')
    expect(usePreferencesStore(rootA)).toBe(storeA)
    expect(usePreferencesStore(rootB)).toBe(storeB)
  })

  it('supports state replacement, functional patching, path updaters and reset cleanup', async () => {
    const root = createTestRoot()
    const externalExtra = { label: 'external' }
    const externalDate = new Date('2026-01-01T00:00:00.000Z')

    const useInventoryStore = defineStore('inventory', {
      state: () => ({
        count: 1,
        nested: {
          label: 'seed',
        },
        items: [{ name: 'one' }],
        stamp: 'seed-stamp',
      }),
    })

    const store = useInventoryStore(root)

    store.$patch(state => {
      state.count += 1
      state.nested.label = 'patched-by-function'
    })
    store.$state = {
      nested: {
        meta: {
          enabled: true,
        },
      },
      extra: externalExtra,
      stamp: externalDate,
    }
    store.set(['items', 1, 'name'], 'two')
    store.update('count', (prev: unknown) => Number(prev) + 3)

    externalExtra.label = 'mutated'
    externalDate.setUTCFullYear(2030)
    await nextTick()

    expect(store.count).toBe(5)
    expect(store.nested).toEqual({
      label: 'patched-by-function',
      meta: {
        enabled: true,
      },
    })
    expect(store.items).toEqual([{ name: 'one' }, { name: 'two' }])
    expect(store.extra).toEqual({ label: 'external' })
    expect(store.stamp.toISOString()).toBe('2026-01-01T00:00:00.000Z')

    store.$reset()
    await nextTick()

    expect(store.count).toBe(1)
    expect(store.nested).toEqual({ label: 'seed' })
    expect(store.items).toEqual([{ name: 'one' }])
    expect(store.stamp).toBe('seed-stamp')
    expect('extra' in store).toBe(false)
    expect(Object.keys(store.$state)).toEqual(['count', 'nested', 'items', 'stamp'])
  })

  it('emits cloned immediate subscription snapshots and disposes subscribed stores', () => {
    setReactiveScheduling('sync')

    const root = createTestRoot()
    const useTodosStore = defineStore('todos', {
      state: () => ({
        items: ['seed'],
      }),
    })

    const store = useTodosStore(root)
    const snapshots: Array<{ storeId: string; items: string[] }> = []

    const unsubscribe = store.subscribe(
      (mutation, state) => {
        snapshots.push({
          storeId: mutation.storeId,
          items: state.items.slice(),
        })
        state.items.push('snapshot-only')
      },
      { immediate: true },
    )

    expect(snapshots).toEqual([{ storeId: 'todos', items: ['seed'] }])
    expect(store.items).toEqual(['seed'])

    store.$patch({
      items: ['actual'],
    })

    expect(snapshots).toEqual([
      { storeId: 'todos', items: ['seed'] },
      { storeId: 'todos', items: ['actual'] },
    ])
    expect(store.items).toEqual(['actual'])

    unsubscribe()
    store.$patch({
      items: ['ignored'],
    })
    expect(snapshots).toHaveLength(2)

    const disposedStore = useTodosStore(root)
    store.$dispose()

    expect(root._s.has('todos')).toBe(false)
    expect(useTodosStore(root)).not.toBe(disposedStore)
  })

  it('supports setup stores and storeToRefs for writable state', async () => {
    const root = createTestRoot()

    const useSessionStore = defineStore('session', () => {
      const token = ref('alpha')
      const upper = computed(() => token.value.toUpperCase())

      const changeToken = (nextToken: string) => {
        token.value = nextToken
      }

      return {
        token,
        upper,
        changeToken,
      }
    })

    const store = useSessionStore(root)
    const refs = storeToRefs(store)

    expect(refs.token.value).toBe('alpha')
    expect(refs.upper.value).toBe('ALPHA')

    refs.token.value = 'beta'
    await nextTick()
    expect(store.upper).toBe('BETA')

    store.changeToken('gamma')
    await nextTick()
    expect(refs.token.value).toBe('gamma')
    expect(refs.upper.value).toBe('GAMMA')
  })

  it('keeps setup plain state writable while exposing computed refs', async () => {
    const root = createTestRoot()

    const useProfileStore = defineStore('profile', () => {
      const score = ref(2)
      const doubled = computed(() => score.value * 2)

      return {
        score,
        doubled,
        name: 'Rue',
        rename(this: any, nextName: string) {
          this.set(['name'], nextName)
        },
      }
    })

    const store = useProfileStore(root)
    const refs = storeToRefs(store)

    expect(Object.keys(refs).sort()).toEqual(['doubled', 'name', 'score'])
    expect(Object.prototype.hasOwnProperty.call(refs, 'rename')).toBe(false)

    refs.name.value = 'Vapor'
    store.score = 4
    await nextTick()

    expect(store.name).toBe('Vapor')
    expect(refs.score.value).toBe(4)
    expect(refs.doubled.value).toBe(8)

    store.rename('Rue Store')
    expect(refs.name.value).toBe('Rue Store')
  })
})
