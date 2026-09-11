import { beforeEach, describe, it, expect, vi } from 'vite-plus/test'
import dynamic, { flushPreloads } from '../src/shims/dynamic.js?text-ssr'
import { createElement, renderToString } from './rue-ssr-test-utils.js'
const Hello = () => createElement('p', null, 'Hello')
beforeEach(async () => {
  await flushPreloads()
})
describe('compiled dynamic loading', () => {
  it.each(['module', 'bare', 'promise', 'options'] as const)(
    'accepts the %s loader form',
    async kind => {
      const Lazy =
        kind === 'module'
          ? dynamic(() => Promise.resolve({ default: Hello }))
          : kind === 'bare'
            ? dynamic(() => Promise.resolve(Hello))
            : kind === 'promise'
              ? dynamic(Promise.resolve({ default: Hello }))
              : dynamic({ loader: () => Promise.resolve({ default: Hello }) })
      expect(await renderToString(createElement(Lazy))).toContain('Hello')
    },
  )
  it('keeps loading props available when server rendering is disabled', async () => {
    const loader = vi.fn(async () => Hello)
    const loading = vi.fn(() => createElement('p', null, 'Loading'))
    const Lazy = dynamic(loader, { ssr: false, loading })
    expect(await renderToString(createElement(Lazy))).toContain('Loading')
    expect(loading.mock.calls[0]?.[0]).toMatchObject({
      isLoading: true,
      pastDelay: false,
      error: null,
      timedOut: false,
      retry: expect.any(Function),
    })
    expect(loader).not.toHaveBeenCalled()
  })
  it('writes an empty plan when ssr:false has no loading component', async () => {
    const Lazy = dynamic(async () => Hello, { ssr: false })
    expect((await renderToString(createElement(Lazy))).replace(/<!--[\s\S]*?-->/g, '')).toBe('')
  })
  it('renders by default when options are omitted', async () => {
    expect(await renderToString(createElement(dynamic(async () => Hello)))).toContain('Hello')
  })
  it('accepts explicit undefined options', async () => {
    expect(await renderToString(createElement(dynamic(async () => Hello, undefined)))).toContain(
      'Hello',
    )
  })
  it('shares a single resolved loader across renders', async () => {
    const loader = vi.fn(async () => Hello),
      Lazy = dynamic(loader)
    await renderToString(createElement(Lazy))
    await renderToString(createElement(Lazy))
    expect(loader).toHaveBeenCalledTimes(1)
  })
  it('flushes preloads without leaving pending work', async () => {
    dynamic(async () => Hello)
    await flushPreloads()
    expect(await flushPreloads()).toEqual([])
  })
  it('can flush an empty queue repeatedly', async () => {
    expect(await flushPreloads()).toEqual([])
    expect(await flushPreloads()).toEqual([])
  })
})
