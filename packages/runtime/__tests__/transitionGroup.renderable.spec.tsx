import { afterEach, expect, it } from 'vitest'
import { evaluateComponent } from './compiled-component-test-utils'
import { setReactiveScheduling } from '../src/runtime-core/compiled'

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}
const fixture = () => {
  setReactiveScheduling('sync')
  const { exports: app } = evaluateComponent(`
    import { TransitionGroup, signal } from '@rue-js/rue'; export const rows = signal(['a','b','c']); export const trace = [];
    export const View = () => <TransitionGroup tag="ul" name="rows" duration={20} onAfterEnter={() => trace.push('enter')} onAfterLeave={() => trace.push('leave')}>{rows.get().map(row => <li key={row}>{String(row)}</li>)}</TransitionGroup>;
  `)
  const root = app.View()
  root.__rue_compiled_mount(document.body)
  return { app, root }
}
afterEach(() => {
  document.body.innerHTML = ''
  setReactiveScheduling('frame')
})
it('compiled replacement batches retain leave snapshots with detached sibling anchors', async () => {
  const { app, root } = fixture()
  app.rows.set(['d', 'e'])
  await flush()
  expect(document.querySelectorAll('.rows-leave-active')).toHaveLength(3)
  expect(document.querySelectorAll('.rows-enter-active')).toHaveLength(2)
  await new Promise(resolve => setTimeout(resolve, 30))
  expect(document.body.textContent).toBe('de')
  expect(app.trace.filter((x: string) => x === 'leave')).toHaveLength(3)
  root.dispose()
})
it('compiled keyed moves do not schedule enter or leave phases', async () => {
  const { app, root } = fixture()
  const previous = Array.from(document.querySelectorAll('li'))
  app.rows.set(['c', 'a', 'b'])
  await flush()
  expect(Array.from(document.querySelectorAll('li'))).toEqual([
    previous[2],
    previous[0],
    previous[1],
  ])
  await new Promise(resolve => setTimeout(resolve, 30))
  expect(app.trace).toEqual([])
  root.dispose()
})
it('compiled group disposal cancels pending phases and disconnects observations', async () => {
  const { app, root } = fixture()
  app.rows.set(['d'])
  await flush()
  root.dispose()
  const trace = [...app.trace]
  app.rows.set(['z'])
  await flush()
  await new Promise(resolve => setTimeout(resolve, 30))
  expect(document.body.childNodes).toHaveLength(0)
  expect(app.trace).toEqual(trace)
})

it('compiled keyed row control flow executes finally without rerunning setup for moved keys', async () => {
  setReactiveScheduling('sync')
  const { exports: app } = evaluateComponent(`
    import { TransitionGroup, signal } from '@rue-js/rue'; export const rows = signal(['a','b']); export const trace = [];
    export const View = () => <TransitionGroup tag="ul">{rows.get().map(row => { try { return <li key={row}>{String(row)}</li> } finally { trace.push(row) } })}</TransitionGroup>;
  `)
  const root = app.View()
  root.__rue_compiled_mount(document.body)
  expect(app.trace).toEqual(['a', 'b'])
  app.rows.set(['b', 'a'])
  await flush()
  expect(app.trace).toEqual(['a', 'b'])
  expect(document.body.textContent).toBe('ba')
  root.dispose()
})

it('tagless groups observe their mounted range, ignore siblings and remove pending leave snapshots', async () => {
  setReactiveScheduling('sync')
  const { exports: app } = evaluateComponent(`
    import { TransitionGroup, signal } from '@rue-js/rue'; export const rows = signal(['a']); export const trace = [];
    export const View = () => <><TransitionGroup duration={20} onBeforeEnter={() => trace.push('enter')}>{rows.get().map(row => <b key={row}>{String(row)}</b>)}</TransitionGroup><aside/></>;
  `)
  const root = app.View()
  root.__rue_compiled_mount(document.body)
  await flush()
  document.querySelector('aside')!.appendChild(document.createElement('i'))
  await flush()
  expect(app.trace).toEqual([])
  app.rows.set(['b'])
  await flush()
  expect(document.body.textContent).toContain('a')
  expect(app.trace).toEqual(['enter'])
  root.dispose()
  await new Promise(resolve => setTimeout(resolve, 30))
  expect(document.body.childNodes).toHaveLength(0)
})
