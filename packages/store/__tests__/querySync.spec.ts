// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { nextTick, setReactiveScheduling } from '@rue-js/rue'

import {
  createParser,
  createQuerySync,
  createStore,
  debounce,
  defineStore,
  parseAsBoolean,
  parseAsFloat,
  parseAsInteger,
  parseAsJson,
  parseAsString,
  throttle,
} from '../src'

const mountedRoots: ReturnType<typeof createStore>[] = []

const createTestRoot = () => {
  const root = createStore()
  mountedRoots.push(root)
  return root
}

const flush = async () => {
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
}

const flushFakeTimers = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const resetUrl = (path = '/') => {
  window.history.replaceState(null, '', path)
}

const readSearch = () => new URLSearchParams(window.location.search)

describe('store query sync plugin', () => {
  beforeEach(() => {
    setReactiveScheduling('sync')
    resetUrl('/')
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    while (mountedRoots.length > 0) {
      mountedRoots.pop()?.dispose()
    }
    setReactiveScheduling('sync')
    resetUrl('/')
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('hydrates configured fields from query params and omits defaults on writeback', async () => {
    resetUrl('/products?keep=1&q=rue&page=3')

    const root = createTestRoot()
    root.use(
      createQuerySync({
        stores: {
          filters: {
            q: { path: 'query', parser: parseAsString.withDefault('') },
            page: parseAsInteger.withDefault(1),
          },
        },
      }),
    )

    const useFiltersStore = defineStore('filters', {
      state: () => ({
        query: '',
        page: 1,
        localOnly: 'keep-local',
      }),
    })

    const store = useFiltersStore(root)

    expect(store.query).toBe('rue')
    expect(store.page).toBe(3)
    expect(store.localOnly).toBe('keep-local')

    store.query = ''
    store.page = 1
    await flush()

    expect(readSearch().get('keep')).toBe('1')
    expect(readSearch().has('q')).toBe(false)
    expect(readSearch().has('page')).toBe(false)
  })

  it('writes changes with push history and rehydrates from popstate while preserving hash routes', async () => {
    resetUrl('/?q=alpha#/examples/demo')

    const pushState = vi.spyOn(window.history, 'pushState')
    const root = createTestRoot()
    root.use(
      createQuerySync({
        stores: {
          filters: {
            q: { path: 'query', parser: parseAsString.withDefault(''), history: 'push' },
          },
        },
      }),
    )

    const useFiltersStore = defineStore('filters', {
      state: () => ({
        query: '',
      }),
    })

    const store = useFiltersStore(root)

    expect(store.query).toBe('alpha')
    expect(window.location.hash).toBe('#/examples/demo')

    store.query = 'beta'
    await flush()

    expect(pushState).toHaveBeenCalledTimes(1)
    expect(readSearch().get('q')).toBe('beta')
    expect(window.location.hash).toBe('#/examples/demo')

    window.history.pushState(null, '', '/?q=restored#/examples/demo')
    window.dispatchEvent(new PopStateEvent('popstate'))
    await flush()

    expect(store.query).toBe('restored')
  })

  it('supports custom parsers for multi-value fields', async () => {
    const parseAsTags = createParser<string[]>({
      parse: value => (value ? value.split(',').filter(Boolean) : null),
      serialize: value => value.join(','),
      equals: (left, right) => left.join(',') === right.join(','),
    }).withDefault([])

    resetUrl('/?tags=red,blue')

    const root = createTestRoot()
    root.use(
      createQuerySync({
        stores: {
          filters: {
            tags: parseAsTags,
          },
        },
      }),
    )

    const useFiltersStore = defineStore('filters', {
      state: () => ({
        tags: [] as string[],
      }),
    })

    const store = useFiltersStore(root)
    expect(store.tags).toEqual(['red', 'blue'])

    store.tags = ['green', 'yellow']
    await flush()

    expect(readSearch().get('tags')).toBe('green,yellow')

    window.history.replaceState(null, '', '/?tags=cyan,magenta')
    window.dispatchEvent(new PopStateEvent('popstate'))
    await flush()

    expect(store.tags).toEqual(['cyan', 'magenta'])
  })

  it('debounces high-frequency query updates while keeping local state immediate', async () => {
    vi.useFakeTimers()
    resetUrl('/?q=alpha')

    const root = createTestRoot()
    root.use(
      createQuerySync({
        limitUrlUpdates: debounce(300),
        stores: {
          filters: {
            q: { path: 'query', parser: parseAsString.withDefault('') },
          },
        },
      }),
    )

    const replaceState = vi.spyOn(window.history, 'replaceState')
    const useFiltersStore = defineStore('filters', {
      state: () => ({
        query: '',
      }),
    })

    const store = useFiltersStore(root)
    expect(store.query).toBe('alpha')

    store.query = 'a'
    await flushFakeTimers()
    store.query = 'ab'
    await flushFakeTimers()

    expect(store.query).toBe('ab')
    expect(readSearch().get('q')).toBe('alpha')
    expect(replaceState).not.toHaveBeenCalled()

    vi.advanceTimersByTime(299)
    await flushFakeTimers()

    expect(readSearch().get('q')).toBe('alpha')

    vi.advanceTimersByTime(1)
    await flushFakeTimers()

    expect(readSearch().get('q')).toBe('ab')
    expect(replaceState).toHaveBeenCalledTimes(1)
  })

  it('throttles repeated query updates but keeps the first write eager', async () => {
    vi.useFakeTimers()
    resetUrl('/?tab=overview')

    const root = createTestRoot()
    root.use(
      createQuerySync({
        stores: {
          filters: {
            tab: {
              parser: parseAsString.withDefault('overview'),
              history: 'push',
              limitUrlUpdates: throttle(200),
            },
          },
        },
      }),
    )

    const pushState = vi.spyOn(window.history, 'pushState')
    const useFiltersStore = defineStore('filters', {
      state: () => ({
        tab: 'overview',
      }),
    })

    const store = useFiltersStore(root)

    store.tab = 'preview'
    await flushFakeTimers()

    expect(readSearch().get('tab')).toBe('preview')
    expect(pushState).toHaveBeenCalledTimes(1)

    store.tab = 'code'
    await flushFakeTimers()

    expect(store.tab).toBe('code')
    expect(readSearch().get('tab')).toBe('preview')

    vi.advanceTimersByTime(199)
    await flushFakeTimers()
    expect(readSearch().get('tab')).toBe('preview')

    vi.advanceTimersByTime(1)
    await flushFakeTimers()

    expect(readSearch().get('tab')).toBe('code')
    expect(pushState).toHaveBeenCalledTimes(2)
  })

  it('hydrates built-in boolean, float and json parsers and writes configured defaults', async () => {
    resetUrl('/?price=4.5&featured=yes&filters=%7B%22brand%22%3A%22Rue%22%7D&rating=oops')

    const root = createTestRoot()
    root.use(
      createQuerySync({
        writeDefaults: true,
        stores: {
          product: {
            price: parseAsFloat.withDefault(0),
            featured: { parser: parseAsBoolean.withDefault(false), writeDefault: true },
            filters: parseAsJson<{ brand: string }>().withDefault({ brand: 'all' }),
            rating: parseAsInteger.withDefault(5),
          },
        },
      }),
    )

    const useProductStore = defineStore('product', {
      state: () => ({
        price: 0,
        featured: false,
        filters: { brand: 'all' },
        rating: 1,
      }),
    })

    const store = useProductStore(root)

    expect(store.price).toBe(4.5)
    expect(store.featured).toBe(true)
    expect(store.filters).toEqual({ brand: 'Rue' })
    expect(store.rating).toBe(5)

    store.price = Number.POSITIVE_INFINITY
    store.featured = false
    store.filters = { brand: 'all' }
    store.rating = 5
    await flush()

    expect(readSearch().has('price')).toBe(false)
    expect(readSearch().get('featured')).toBe('0')
    expect(readSearch().get('filters')).toBe('{"brand":"all"}')

    store.rating = 6
    await flush()

    expect(readSearch().get('rating')).toBe('6')

    store.rating = 5
    await flush()

    expect(readSearch().get('rating')).toBe('5')
  })

  it('clones parser defaults when query params are missing or restored', async () => {
    const defaultTags: string[] = []
    const tagsParser = parseAsJson<string[]>().withDefault(defaultTags)

    resetUrl('/')

    const root = createTestRoot()
    root.use(
      createQuerySync({
        stores: {
          filters: {
            tags: tagsParser,
          },
        },
      }),
    )

    const useFiltersStore = defineStore('filters', {
      state: () => ({
        tags: ['seed'],
      }),
    })

    const store = useFiltersStore(root)

    expect(store.tags).toEqual([])

    store.mutatePath(['tags'], (tags: string[]) => tags.push('local-only'))
    await flush()

    expect(defaultTags).toEqual([])
    expect(readSearch().get('tags')).toBe('["local-only"]')

    window.history.replaceState(null, '', '/')
    window.dispatchEvent(new PopStateEvent('popstate'))
    await flush()

    expect(store.tags).toEqual([])
    expect(defaultTags).toEqual([])
  })

  it('falls back safely when custom parsers throw while parsing, comparing or serializing', async () => {
    const parseFallback = createParser<string>({
      parse: value => {
        if (value === 'throw') {
          throw new Error('parse failed')
        }
        return value
      },
      serialize: value => value,
    }).withDefault('safe')

    const equalsFallback = createParser<string>({
      parse: value => value,
      serialize: value => value,
      equals: () => {
        throw new Error('equals failed')
      },
    }).withDefault('matched')

    const serializeFallback = createParser<string>({
      parse: value => value,
      serialize: value => {
        if (value === 'boom') {
          throw new Error('serialize failed')
        }
        return value
      },
    })

    resetUrl('/?parse=throw&eq=matched&write=alpha')

    const root = createTestRoot()
    root.use(
      createQuerySync({
        stores: {
          unstable: {
            parse: { parser: parseFallback, path: 'parseValue' },
            eq: { parser: equalsFallback, path: 'equalValue' },
            write: { parser: serializeFallback, path: 'writeValue' },
          },
        },
      }),
    )

    const useUnstableStore = defineStore('unstable', {
      state: () => ({
        parseValue: 'initial',
        equalValue: 'initial',
        writeValue: '',
      }),
    })

    const store = useUnstableStore(root)

    expect(store.parseValue).toBe('safe')
    expect(store.equalValue).toBe('matched')
    expect(store.writeValue).toBe('alpha')

    store.writeValue = 'boom'
    await flush()

    expect(readSearch().has('write')).toBe(false)
  })

  it('hydrates nested paths and creates missing array/object containers', async () => {
    resetUrl('/?tag=red')

    const root = createTestRoot()
    root.use(
      createQuerySync({
        stores: {
          filters: {
            tag: {
              path: ['groups', 0, 'value'],
              parser: parseAsString.withDefault(''),
            },
          },
        },
      }),
    )

    const useFiltersStore = defineStore('filters', {
      state: () => ({
        groups: [] as Array<{ value: string }>,
      }),
    })

    const store = useFiltersStore(root)

    expect(store.groups).toHaveLength(1)
    expect(store.groups[0].value).toBe('red')

    store.$set(['groups', 0, 'value'], 'blue')
    await flush()

    expect(readSearch().get('tag')).toBe('blue')
  })

  it('coalesces multiple store bindings and stops syncing disposed stores', async () => {
    resetUrl('/')

    const addEventListener = vi.spyOn(window, 'addEventListener')
    const removeEventListener = vi.spyOn(window, 'removeEventListener')
    const replaceState = vi.spyOn(window.history, 'replaceState')

    const root = createTestRoot()
    root.use(
      createQuerySync({
        stores: {
          filters: {
            q: { path: 'query', parser: parseAsString.withDefault('') },
          },
          view: {
            tab: parseAsString.withDefault('overview'),
          },
        },
      }),
    )

    const useFiltersStore = defineStore('filters', {
      state: () => ({
        query: '',
      }),
    })
    const useViewStore = defineStore('view', {
      state: () => ({
        tab: 'overview',
      }),
    })

    const filters = useFiltersStore(root)
    const view = useViewStore(root)

    expect(addEventListener).toHaveBeenCalledWith('popstate', expect.any(Function))

    filters.query = 'rue'
    view.tab = 'details'
    await flush()

    expect(replaceState).toHaveBeenCalledTimes(1)
    expect(readSearch().get('q')).toBe('rue')
    expect(readSearch().get('tab')).toBe('details')

    filters.$dispose()
    filters.query = 'ignored'
    view.tab = 'preview'
    await flush()

    expect(readSearch().get('q')).toBe('rue')
    expect(readSearch().get('tab')).toBe('preview')

    view.$dispose()

    expect(removeEventListener).toHaveBeenCalledWith('popstate', expect.any(Function))
  })
})
