import { afterEach, expect, it, vi } from 'vitest'
import { evaluateComponent } from './compiled-component-test-utils'
import { setReactiveScheduling } from '../src/runtime-core/compiled'

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
  setReactiveScheduling('frame')
})
const fixture = () =>
  evaluateComponent(`
  import { Suspense, signal } from '@rue-js/rue';
  export const version = signal(0); export const trace = [];
  let state = 'ready'; let pending; let resolve; let reject;
  export const begin = () => { state = 'pending'; pending = new Promise((yes, no) => { resolve = yes; reject = no }); const request = pending; const done = resolve; const fail = reject; version.set(version.get() + 1); return { resolve: () => { if (pending === request) state = 'ready'; done() }, reject: fail }; };
  const Child = () => { if (state === 'pending') throw pending; return <span>content</span>; };
  export const View = () => <Suspense timeout={version.get() >= 0 ? 20 : 0} fallback={<b>fallback</b>} onPending={() => trace.push('pending')} onFallback={() => trace.push('fallback')} onResolve={() => trace.push('resolved')} onReject={error => trace.push(error.message)}><Child/></Suspense>;
`).exports
it('compiled Suspense stages content, delays fallback and ignores stale resolutions', async () => {
  setReactiveScheduling('sync')
  const app = fixture()
  const root = app.View()
  root.__rue_compiled_mount(document.body)
  expect(document.body.textContent).toBe('content')
  const first = app.begin()
  const second = app.begin()
  first.resolve()
  await Promise.resolve()
  await new Promise(resolve => setTimeout(resolve, 30))
  expect(document.body.textContent).toBe('fallback')
  second.resolve()
  await Promise.resolve()
  expect(document.body.textContent).toBe('content')
  expect(app.trace).toEqual(['resolved', 'pending', 'pending', 'fallback', 'resolved'])
  root.dispose()
  expect(document.body.childNodes).toHaveLength(0)
})
it('compiled Suspense handles rejection once and cancels timers and retries after disposal', async () => {
  setReactiveScheduling('sync')
  const app = fixture()
  const root = app.View()
  root.__rue_compiled_mount(document.body)
  const request = app.begin()
  request.reject(new Error('failed'))
  await Promise.resolve()
  expect(app.trace).toContain('failed')
  await new Promise(resolve => setTimeout(resolve, 30))
  expect(app.trace).not.toContain('fallback')
  const next = app.begin()
  root.dispose()
  next.resolve()
  await Promise.resolve()
  await new Promise(resolve => setTimeout(resolve, 30))
  expect(document.body.childNodes).toHaveLength(0)
  expect(app.trace.filter((event: string) => event === 'resolved')).toHaveLength(1)
})
