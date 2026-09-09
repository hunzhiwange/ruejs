// @vitest-environment jsdom
import { resolve } from 'node:path'
import swc from '@swc/core'
import { afterEach, expect, it } from 'vitest'
import * as runtime from '../src/compiler-internal'
import { compileRueStatic } from '../../vite-plugin-rue/index.mjs'

function evaluate(body: string): any {
  const code = swc.transformSync(
    `
import { useState } from '@rue-js/rue';
export let change, read, readFirst, readLast;
export function View() {
 const [state] = useState({ n: 1, rows: [3, 1, 2] });
 ${body}
 return <p>{state.n}</p>;
}`,
    {
      filename: 'state-mutation.tsx',
      jsc: {
        parser: { syntax: 'typescript', tsx: true },
        target: 'es2022',
        experimental: { plugins: [[resolve('packages/swc-plugin-rue/swc-plugin-rue.wasm'), {}]] },
      },
      module: { type: 'commonjs' },
    },
  ).code
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(() => runtime, module, module.exports)
  return module.exports
}
afterEach(() => {
  runtime.setReactiveScheduling('frame')
  document.body.innerHTML = ''
})
it('tracks assignment and preserves compound/update return values and single key evaluation', () => {
  runtime.setReactiveScheduling('sync')
  const app = evaluate(
    `change = () => { let hits = 0; const key = () => { hits++; return 'n' }; const a = state[key()] += 2; const b = state.n++; const c = --state.n; return [a,b,c,hits]; };`,
  )
  const root = app.View()
  document.body.appendChild(root.__rue_compiled_mount(document.body)!)
  expect(app.change()).toEqual([3, 3, 3, 1])
  expect(document.body.textContent).toBe('3')
  root.dispose()
})
it('tracks deletion and native array mutators', () => {
  runtime.setReactiveScheduling('sync')
  const app = evaluate(
    `read = () => state.rows[0]; change = () => { const length = state.rows.push(4); const removed = state.rows.splice(0, 1); state.rows.sort((a,b) => b-a); const deleted = delete state.n; return [length, removed, deleted]; };`,
  )
  const root = app.View()
  const values: unknown[] = []
  const subscription = runtime.effect(() => {
    values.push(app.read())
  })
  expect(app.change()).toEqual([4, [3], true])
  expect(values.at(-1)).toBe(4)
  subscription.dispose()
  root.dispose()
})

it('preserves native reference, coercion, RHS, short circuit, and exception order', () => {
  const app = evaluate(`
 change = () => {
   const events = [];
   const original = { n: 1 };
   state.rows = original;
   const key = { toString() { events.push('coerce'); return 'n' } };
   const rhs = () => { events.push('rhs'); state.rows = { n: 9 }; return 2; };
   const result = state.rows[key] += rhs();
   let skipped = 0;
   state.n ||= ++skipped;
   state.n &&= 4;
   let error;
   try { state.n += (() => { throw new Error('rhs'); })(); } catch (e) { error = e.message; }
   return [events, original.n, state.rows.n, result, skipped, state.n, error];
 };`)
  const root = app.View()
  expect(app.change()).toEqual([['coerce', 'rhs', 'coerce'], 3, 9, 3, 0, 4, 'rhs'])
  root.dispose()
})
it('mutates one of 10000 items in place and only wakes its subscriber', () => {
  runtime.setReactiveScheduling('sync')
  const app = evaluate(`
 state.rows = Array.from({ length: 10000 }, (_, n) => ({ n }));
 read = () => state.rows;
 readFirst = () => state.rows[10].n;
 readLast = () => state.rows[9999].n;
 change = () => state.rows[10].n++;
 `)
  const root = app.View()
  const before = app.read()
  let first = 0,
    last = 0
  const a = runtime.effect(() => {
    app.readFirst()
    first++
  })
  const b = runtime.effect(() => {
    app.readLast()
    last++
  })
  expect(app.change()).toBe(10)
  expect(app.read()).toBe(before)
  expect(app.readFirst()).toBe(11)
  expect([first, last]).toEqual([2, 1])
  a.dispose()
  b.dispose()
  root.dispose()
})
it('keeps unchanged indices cold across push and notifies array length', () => {
  runtime.setReactiveScheduling('sync')
  const app = evaluate(
    `readFirst = () => state.rows[0]; readLast = () => state.rows.length; change = () => state.rows.push(8);`,
  )
  const root = app.View()
  let first = 0,
    length = 0
  const a = runtime.effect(() => {
    app.readFirst()
    first++
  })
  const b = runtime.effect(() => {
    app.readLast()
    length++
  })
  expect(app.change()).toBe(4)
  expect([first, length]).toEqual([1, 2])
  a.dispose()
  b.dispose()
  root.dispose()
})

it('notifies deleted indices when array length shrinks and propagates native errors', () => {
  runtime.setReactiveScheduling('sync')
  const app = evaluate(`read = () => state.rows[2]; change = () => state.rows.length = 1;`)
  const root = app.View()
  const seen: unknown[] = []
  const sub = runtime.effect(() => {
    seen.push(app.read())
  })
  expect(app.change()).toBe(1)
  expect(seen).toEqual([2, undefined])
  sub.dispose()
  root.dispose()
})

it.each([
  'unknown(state)',
  "Object.defineProperty(state.rows, '0', { value: 1 })",
  'const { rows } = state; rows[0] = 1',
  'state.rows[method](1)',
  '({ n: state.n } = { n: 2 })',
  'state.rows?.push(4)',
])('rejects unsafe state escape with source location: %s', async operation => {
  const input = `import { useState } from '@rue-js/rue';
export function View() {
 const [state] = useState({ n: 1, rows: [] });
 const change = () => { ${operation}; };
 return <p onClick={change}>{state.n}</p>;
}`
  await expect(
    compileRueStatic(input, { id: '/app/StateEscape.tsx', production: true }),
  ).rejects.toThrow(/StateEscape.tsx:4:\d+ category: state-escape/)
})

it('evaluates a parent getter before the next dynamic key and only once', () => {
  const app = evaluate(`change = () => {
    const events = [];
    const target = { n: 1 };
    state.rows = { get nested() { events.push('parent'); return target } };
    const key = () => { events.push('key'); return 'n' };
    const rhs = () => { events.push('rhs'); return 2 };
    state.rows.nested[key()] = rhs();
    return [events, target.n];
  };`)
  const root = app.View()
  expect(app.change()).toEqual([['parent', 'key', 'rhs'], 2])
  root.dispose()
})

it.each([
  ['pop', ''],
  ['shift', ''],
  ['unshift', '8, 9'],
  ['reverse', ''],
  ['fill', '7, 1'],
  ['copyWithin', '1, 0, 1'],
])('preserves the native result and subscriptions for %s', (method, args) => {
  runtime.setReactiveScheduling('sync')
  const app = evaluate(
    `read = () => state.rows; readFirst = () => state.rows[0]; readLast = () => state.rows.length; change = () => state.rows.${method}(${args});`,
  )
  const root = app.View()
  const native = [3, 1, 2]
  const expected = new Function('rows', `return rows.${method}(${args})`)(native)
  const identity = app.read()
  const seen: unknown[] = []
  const sub = runtime.effect(() => {
    seen.push([app.readFirst(), app.readLast()])
  })
  const result = app.change()
  expect(result).toEqual(expected)
  if (expected === native) expect(result).toBe(identity)
  expect(app.read()).toBe(identity)
  expect(app.read()).toEqual(native)
  expect(seen.at(-1)).toEqual([native[0], native.length])
  sub.dispose()
  root.dispose()
})

it('does not re-read an array getter while notifying a mutator', () => {
  const app = evaluate(`change = () => {
    let hits = 0;
    const rows = [1];
    state.rows = { get nested() { hits++; return rows } };
    const length = state.rows.nested.push(2);
    return [hits, length, rows];
  };`)
  const root = app.View()
  expect(app.change()).toEqual([1, 2, [1, 2]])
  root.dispose()
})
