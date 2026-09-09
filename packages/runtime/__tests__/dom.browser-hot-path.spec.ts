import {
  _$appendChild as _$compiledAppendChild,
  _$createComment as _$compiledCreateComment,
  _$createElement as _$compiledCreateElement,
  _$spreadAttributes as _$compiledSpreadAttributes,
  renderAnchor as _$compiledRenderAnchor,
  _$compiledRoot as _$compiledVapor,
  watchEffect as _$compiledWatchEffect,
} from './legacy-test-render'
import { _$createDynamic, _$createFragment } from './legacy-test-render'
import { afterEach, describe, expect, it } from 'vitest'

import { hydrateRoot } from '../src/island'
import { render } from '../src/rue'
import { _$compiledRoot } from './legacy-test-render'
import {
  appendChild,
  createElement,
  createTextNode,
  getDOMAdapter,
  insertBefore,
  setAttribute,
  setClassName,
  setDOMAdapter,
  settextContent,
  type DOMAdapter,
} from '../src/dom'

const DOM_ADAPTER_GLOBAL_KEY = '__rue_dom_adapter__'
const defaultDOMAdapter = getDOMAdapter()

const trackDOMAdapterResolutionReads = () => {
  const globalRecord = globalThis as typeof globalThis & Record<string, unknown>
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalRecord, DOM_ADAPTER_GLOBAL_KEY)
  let currentAdapter = defaultDOMAdapter
  let reads = 0

  Object.defineProperty(globalRecord, DOM_ADAPTER_GLOBAL_KEY, {
    configurable: true,
    get() {
      reads += 1
      return currentAdapter
    },
    set(value) {
      currentAdapter = value as DOMAdapter
    },
  })

  return {
    reads: () => reads,
    restore() {
      if (originalDescriptor) {
        Object.defineProperty(globalRecord, DOM_ADAPTER_GLOBAL_KEY, originalDescriptor)
      } else {
        delete globalRecord[DOM_ADAPTER_GLOBAL_KEY]
      }
    },
  }
}

const createHotPathMount = (count: number) =>
  _$compiledRoot(parentContext => {
    const root = createElement('section', parentContext)
    for (let index = 0; index < count; index += 1) {
      const row = createElement('div', root)
      const label = createTextNode('')
      setAttribute(row, 'data-index', index)
      setClassName(row, index % 2 === 0 ? 'even' : 'odd')
      settextContent(label, `row ${index}`)
      appendChild(row, label)
      if (index % 2 === 0) appendChild(root, row)
      else insertBefore(root, row, null)
    }
    return root
  })

afterEach(() => {
  setDOMAdapter(defaultDOMAdapter)
  document.body.innerHTML = ''
})

describe('browser DOM host hot path', () => {
  it('uses direct browser primitives without adapter or global reads', async () => {
    const tracker = trackDOMAdapterResolutionReads()
    const globalRecord = globalThis as typeof globalThis & Record<string, unknown>
    const operationKey = '__rue_compiled_dom_operation_adapter__'
    const originalOperation = Object.getOwnPropertyDescriptor(globalRecord, operationKey)
    let operationReads = 0
    Object.defineProperty(globalRecord, operationKey, {
      configurable: true,
      get() {
        operationReads += 1
        return null
      },
    })

    try {
      const browserDOM = await import('../src/compiler-runtime/dom.browser')
      const container = document.createElement('main')
      const row = browserDOM.createElement('div', container)
      const label = browserDOM.createTextNode('direct')
      browserDOM.appendChild(row, label)
      browserDOM.insertBefore(container, row, null)
      browserDOM.removeChild(row, label)

      expect(tracker.reads()).toBe(0)
      expect(operationReads).toBe(0)
      expect(container.firstChild).toBe(row)
    } finally {
      tracker.restore()
      if (originalOperation) {
        Object.defineProperty(globalRecord, operationKey, originalOperation)
      } else {
        delete globalRecord[operationKey]
      }
    }
  })

  it('binds fresh browser host operations once per mount', () => {
    const tracker = trackDOMAdapterResolutionReads()
    const container = document.createElement('main')
    document.body.appendChild(container)

    try {
      render(createHotPathMount(1_000), container)

      expect(container.querySelectorAll('section > div')).toHaveLength(1_000)
      expect(container.querySelector('[data-index="999"]')?.textContent).toBe('row 999')
      expect(tracker.reads()).toBe(1)
    } finally {
      tracker.restore()
    }
  })

  it('keeps hydration on the adapter protocol and adopts the SSR node', () => {
    const container = document.createElement('main')
    container.innerHTML = '<button id="server">server</button>'
    document.body.appendChild(container)
    const serverButton = container.firstElementChild

    hydrateRoot(
      container,
      _$createDynamic('button', {
        id: 'client',
        className: 'hydrated',
        children: 'client',
      }),
      {
        replace: false,
      },
    )

    expect(container.firstElementChild).toBe(serverButton)
    expect(serverButton).toMatchObject({
      id: 'client',
      className: 'hydrated',
      textContent: 'client',
    })
  })

  it('forwards every operation through a custom adapter', () => {
    const calls = new Map<keyof DOMAdapter, number>()
    const customAdapter = new Proxy(defaultDOMAdapter, {
      get(target, key: keyof DOMAdapter) {
        const value = Reflect.get(target, key, target)
        if (typeof value !== 'function') return value
        return (...args: unknown[]) => {
          calls.set(key, (calls.get(key) ?? 0) + 1)
          return Reflect.apply(value, target, args)
        }
      },
    }) as DOMAdapter
    setDOMAdapter(customAdapter)
    const container = document.createElement('main')
    document.body.appendChild(container)

    render(createHotPathMount(3), container)

    expect(container.querySelectorAll('section > div')).toHaveLength(3)
    expect(calls.get('createElement')).toBe(4)
    expect(calls.get('createTextNode')).toBe(3)
    expect(calls.get('setAttribute')).toBe(3)
    expect(calls.get('setClassName')).toBe(3)
    expect(calls.get('settextContent')).toBe(3)
    expect(calls.get('appendChild')).toBe(6)
    expect(calls.get('insertBefore')).toBe(1)
  })
})
