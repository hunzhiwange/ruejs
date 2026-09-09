import { afterEach, describe, expect, it, vi } from 'vitest'
import { onError, render, setReactiveScheduling, useComponent, type FC } from '../src'
import { _$appendChild, _$createElement, _$compiledRoot } from '../src/internal'

type LoadedModule = { default: FC<any> }
setReactiveScheduling('sync')

const compiledView =
  (tag: string, text: string, attributes: Record<string, string> = {}): FC<any> =>
  props =>
    _$compiledRoot(parent => {
      const element = _$createElement(tag, parent)
      for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value)
      element.textContent = text.replace(/\{(\w+)\}/g, (_match, key) => String(props[key] ?? ''))
      if (parent) _$appendChild(parent, element)
      return element
    })

const flushMicrotasks = async () => {
  for (let index = 0; index < 8; index += 1) await Promise.resolve()
}

afterEach(() => {
  render(null, document.body)
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useComponent loading behavior', () => {
  it('skips the initial empty loading render by default', () => {
    const Async = useComponent(() => new Promise<LoadedModule>(() => {}))
    render(Async({ id: 1 }), document.body)
    expect(document.body.textContent).toBe('')
    expect(document.body.querySelector('div')?.style.display).toBe('contents')
    render(null, document.body)
    expect(document.body.childNodes).toHaveLength(0)
  })

  it('keeps rendering a custom loading component before resolve', async () => {
    let resolve!: (value: LoadedModule) => void
    const Async = useComponent(() => new Promise<LoadedModule>(done => (resolve = done)), {
      loading: compiledView('span', 'loading', { 'data-state': 'loading' }),
    })
    render(Async({ id: 1 }), document.body)
    expect(document.body.querySelector('[data-state="loading"]')?.textContent).toBe('loading')
    resolve({ default: compiledView('strong', 'resolved:{id}', { 'data-state': 'resolved' }) })
    await flushMicrotasks()
    expect(document.body.querySelector('[data-state="loading"]')).toBeNull()
    expect(document.body.querySelector('[data-state="resolved"]')?.textContent).toBe('resolved:1')
  })

  it('renders the resolved component against the mounted wrapper anchor', async () => {
    let resolve!: (value: LoadedModule) => void
    const Async = useComponent(() => new Promise<LoadedModule>(done => (resolve = done)))
    render(Async({ id: 7 }), document.body)
    const wrapper = document.body.querySelector('div')
    resolve({ default: compiledView('strong', 'resolved:{id}', { 'data-resolved': 'yes' }) })
    await flushMicrotasks()
    const resolved = document.body.querySelector('[data-resolved="yes"]')
    expect(resolved?.textContent).toBe('resolved:7')
    expect(resolved?.parentNode).toBe(wrapper)
  })

  it('clears the mounted wrapper anchor on unmount', async () => {
    let resolve!: (value: LoadedModule) => void
    const Async = useComponent(() => new Promise<LoadedModule>(done => (resolve = done)))
    render(Async({ id: 1 }), document.body)
    render(null, document.body)
    expect(document.body.childNodes).toHaveLength(0)
    resolve({ default: compiledView('strong', 'late', { 'data-late': 'yes' }) })
    await flushMicrotasks()
    expect(document.body.querySelector('[data-late="yes"]')).toBeNull()
    expect(document.body.childNodes).toHaveLength(0)
  })

  it('renders the error component and reports loader failures', async () => {
    const error = new Error('load failed')
    const reported = vi.fn()
    const stop = onError(reported)
    const ErrorView = compiledView('p', 'error:{message}', { 'data-state': 'error' })
    const Async = useComponent(() => Promise.reject(error), {
      error: props => ErrorView({ message: props.error.message }),
    })
    render(Async({ id: 1 }), document.body)
    await flushMicrotasks()
    expect(reported).toHaveBeenCalledWith(error, null)
    expect(document.body.querySelector('[data-state="error"]')?.textContent).toBe(
      'error:load failed',
    )
    stop?.()
  })

  it('supports object-style loadingComponent with delayed fallback', async () => {
    vi.useFakeTimers()
    let resolve!: (value: LoadedModule) => void
    const Async = useComponent({
      loader: () => new Promise<LoadedModule>(done => (resolve = done)),
      loadingComponent: compiledView('span', 'delayed', { 'data-state': 'loading' }),
    })
    render(Async({ id: 2 }), document.body)
    expect(document.body.querySelector('[data-state="loading"]')).toBeNull()
    await vi.advanceTimersByTimeAsync(199)
    expect(document.body.querySelector('[data-state="loading"]')).toBeNull()
    await vi.advanceTimersByTimeAsync(1)
    expect(document.body.querySelector('[data-state="loading"]')?.textContent).toBe('delayed')
    resolve({ default: compiledView('strong', 'resolved:{id}', { 'data-state': 'resolved' }) })
    await flushMicrotasks()
    expect(document.body.querySelector('[data-state="loading"]')).toBeNull()
    expect(document.body.querySelector('[data-state="resolved"]')?.textContent).toBe('resolved:2')
  })

  it('supports object-style errorComponent and timeout options', async () => {
    vi.useFakeTimers()
    const reported = vi.fn()
    const stop = onError(reported)
    const ErrorView = compiledView('p', 'error:{message}', { 'data-state': 'timeout' })
    const Async = useComponent({
      loader: () => new Promise<LoadedModule>(() => {}),
      errorComponent: props => ErrorView({ message: props.error.message }),
      timeout: 50,
    })
    render(Async({ id: 1 }), document.body)
    await vi.advanceTimersByTimeAsync(50)
    await flushMicrotasks()
    expect(reported).toHaveBeenCalledTimes(1)
    expect(reported.mock.calls[0]?.[0]?.message).toBe('Async component timed out after 50ms.')
    expect(document.body.querySelector('[data-state="timeout"]')?.textContent).toBe(
      'error:Async component timed out after 50ms.',
    )
    stop?.()
  })
})
