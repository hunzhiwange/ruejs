import { afterEach, expect, it, vi } from 'vitest'
import { evaluateComponent } from './compiled-component-test-utils'
import { setReactiveScheduling } from '../src/runtime-core/compiled'

afterEach(() => {
  document.body.innerHTML = ''
  setReactiveScheduling('frame')
  vi.useRealTimers()
})
it('compiled Transition preserves keyed identity and runs leave and cancellation hooks', async () => {
  setReactiveScheduling('sync')
  const { exports: app } = evaluateComponent(`
    import { Transition, signal } from '@rue-js/rue';
    export const key = signal('a'); export const trace = [];
    export const View = () => <Transition name="fade" duration={20} onAfterLeave={() => trace.push('left')} onEnterCancelled={() => trace.push('cancel')}><p key={key.get()}>{key.get()}</p></Transition>;
  `)
  const root = app.View()
  root.__rue_compiled_mount(document.body)
  const first = document.querySelector('p')!
  expect(first.textContent).toBe('a')
  app.key.set('b')
  expect(app.trace).toContain('cancel')
  expect(document.body.textContent).toContain('a')
  expect(document.body.textContent).toContain('b')
  await new Promise(resolve => setTimeout(resolve, 30))
  expect(document.body.textContent).toBe('b')
  expect(app.trace).toContain('left')
  root.dispose()
  expect(document.body.childNodes).toHaveLength(0)
  await new Promise(resolve => setTimeout(resolve, 30))
  expect(document.body.childNodes).toHaveLength(0)
})
it.each(['out-in', 'in-out'])('compiled Transition honors %s ordering', async mode => {
  setReactiveScheduling('sync')
  const { exports: app } = evaluateComponent(`
    import { Transition, signal } from '@rue-js/rue'; export const key = signal('a');
    export const View = () => <Transition mode="${mode}" duration={20}><p key={key.get()}>{key.get()}</p></Transition>;
  `)
  const root = app.View()
  root.__rue_compiled_mount(document.body)
  await new Promise(resolve => setTimeout(resolve, 30))
  app.key.set('b')
  expect(document.body.textContent).toBe(mode === 'out-in' ? 'a' : 'ab')
  await new Promise(resolve => setTimeout(resolve, 60))
  expect(document.body.textContent).toBe('b')
  root.dispose()
})
it('Template is erased and keeps its children in the owned compiled range', () => {
  const { code, exports: app } = evaluateComponent(
    `import { Template } from '@rue-js/rue'; export const View = () => <Template><b>owned</b><i>tail</i></Template>;`,
  )
  expect(code).not.toContain('internal/builtin')
  const root = app.View()
  root.__rue_compiled_mount(document.body)
  expect(document.body.textContent).toBe('ownedtail')
  root.dispose()
  expect(document.body.childNodes).toHaveLength(0)
})
it('compiled TransitionGroup retains keyed DOM moves and delays removal through leave', async () => {
  setReactiveScheduling('sync')
  const { exports: app } = evaluateComponent(`
    import { TransitionGroup, signal } from '@rue-js/rue'; export const rows = signal(['a','b']);
    export const View = () => <TransitionGroup tag="ul" name="rows" duration={20}>{rows.get().map(row => <li key={row}>{String(row)}</li>)}</TransitionGroup>;
  `)
  const root = app.View()
  root.__rue_compiled_mount(document.body)
  const original = Array.from(document.querySelectorAll('li'))
  expect(original.map(node => node.textContent)).toEqual(['a', 'b'])
  app.rows.set(['b', 'a'])
  await Promise.resolve()
  await Promise.resolve()
  const reordered = Array.from(document.querySelectorAll('li'))
  expect(reordered).toEqual([original[1], original[0]])
  app.rows.set(['b', 'c'])
  await Promise.resolve()
  await Promise.resolve()
  expect(document.body.textContent).toContain('a')
  expect(
    Array.from(document.querySelectorAll('li')).find(node => node.textContent === 'c')!.className,
  ).toContain('rows-enter-active')
  await new Promise(resolve => setTimeout(resolve, 30))
  expect(document.body.textContent).toBe('bc')
  root.dispose()
  await new Promise(resolve => setTimeout(resolve, 30))
  expect(document.body.childNodes).toHaveLength(0)
})
it('recognizes imported builtin aliases and preserves a same-named local component', () => {
  const alias = evaluateComponent(
    `import { Teleport as Portal } from '@rue-js/rue'; export const View = () => <Portal to="#destination"><b>portal</b></Portal>;`,
  )
  expect(alias.code).toContain('_$teleport')
  expect(alias.code).not.toContain('internal/builtin')
  document.body.innerHTML = '<aside id="destination"></aside>'
  const root = alias.exports.View()
  root.__rue_compiled_mount(document.body)
  expect(document.querySelector('aside')!.textContent).toBe('portal')
  root.dispose()
  const local = evaluateComponent(
    `const Teleport = () => <b>local</b>; export const View = () => <Teleport/>;`,
  )
  expect(local.code).not.toContain('_$teleport')
  const localRoot = local.exports.View()
  localRoot.__rue_compiled_mount(document.body)
  expect(document.body.textContent).toBe('local')
  localRoot.dispose()
})

it('compiled Transition schedules leave for conditional children', async () => {
  setReactiveScheduling('sync')
  const { exports: app } = evaluateComponent(`
    import { Transition, signal } from '@rue-js/rue'; export const shown = signal(true); export const trace = [];
    export const View = () => <Transition duration={20} onAfterLeave={() => trace.push('left')}>{shown.get() && <b>visible</b>}</Transition>;
  `)
  const root = app.View()
  root.__rue_compiled_mount(document.body)
  app.shown.set(false)
  expect(document.body.textContent).toBe('visible')
  await new Promise(resolve => setTimeout(resolve, 30))
  expect(document.body.textContent).toBe('')
  expect(app.trace).toEqual(['left'])
  app.shown.set(true)
  expect(document.body.textContent).toBe('visible')
  root.dispose()
})

it.each(['default', 'out-in', 'in-out'])(
  'preserves component root keys in %s transitions',
  async mode => {
    setReactiveScheduling('sync')
    const { exports: app } = evaluateComponent(`
    import { Transition as Motion, ref } from '@rue-js/rue';
    export const index = ref(0); export const trace = [];
    const cards = [{ id: 'a', title: 'Alpha' }, { id: 'b', title: 'Beta' }];
    const Card = props => <section key={props.card.id}>{props.card.title}</section>;
    export const View = () => <Motion mode="${mode}" duration={20}
      onBeforeEnter={() => trace.push('enter')} onBeforeLeave={() => trace.push('leave')}>
      <Card card={cards[index.value]} />
    </Motion>;
  `)
    const root = app.View()
    root.__rue_compiled_mount(document.body)
    await new Promise(resolve => setTimeout(resolve, 30))
    app.trace.length = 0
    app.index.value = 1
    expect(document.body.textContent).toBe(mode === 'out-in' ? 'Alpha' : 'AlphaBeta')
    expect(app.trace).toEqual(
      mode === 'out-in' ? ['leave'] : mode === 'in-out' ? ['enter'] : ['leave', 'enter'],
    )
    await new Promise(resolve => setTimeout(resolve, 65))
    expect(document.body.textContent).toBe('Beta')
    expect(app.trace).toEqual(mode === 'in-out' ? ['enter', 'leave'] : ['leave', 'enter'])
    root.dispose()
    expect(document.body.childNodes).toHaveLength(0)
  },
)

it('keeps component identity when only non-key props change', async () => {
  setReactiveScheduling('sync')
  const { exports: app } = evaluateComponent(`
    import { Transition, ref } from '@rue-js/rue';
    export const card = ref({ id: 'same', title: 'Before' }); export const trace = [];
    const Card = props => <section key={props.card.id}>{props.card.title}</section>;
    export const View = () => <Transition duration={20} onBeforeLeave={() => trace.push('leave')}><Card card={card.value} /></Transition>;
  `)
  const root = app.View()
  root.__rue_compiled_mount(document.body)
  const original = document.querySelector('section')
  app.card.value = { id: 'same', title: 'After' }
  expect(document.querySelector('section')).toBe(original)
  expect(document.body.textContent).toBe('After')
  expect(app.trace).toEqual([])
  root.dispose()
})
