// @vitest-environment jsdom
import { resolve } from 'node:path'
import swc from '@swc/core'
import { execFileSync } from 'node:child_process'
import { gzipSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { afterEach, expect, it } from 'vitest'
import * as runtime from '../src/compiler-internal'

const source = `
import { useState } from '@rue-js/rue';
export let replace;
export const hits = { name: 0, age: 0 };
const counted = (key, value) => ({ toString() { hits[key]++; return value; } });
export function View() {
  const [state, setState] = useState({ user: { name: counted('name', 'one'), age: counted('age', '1') }, rows: [{ title: 'row' }] });
  replace = setState;
  return <div><span>{state.user?.name}</span><b>{state.user.age}</b><i>{state.rows[0].title}</i></div>;
}
`
function compile(input = source, moduleType: 'commonjs' | 'es6' = 'commonjs') {
  return swc.transformSync(input, {
    filename: 'state-path.tsx',
    jsc: {
      parser: { syntax: 'typescript', tsx: true },
      target: 'es2022',
      experimental: {
        plugins: [[resolve('packages/swc-plugin-rue/swc-plugin-rue.wasm'), {}]],
      },
    },
    module: { type: moduleType },
  }).code
}
function evaluate(input = source): any {
  const module = { exports: {} }
  new Function('require', 'module', 'exports', compile(input))(
    (id: string) => {
      expect(id).toBe('@rue-js/rue/internal/compiler')
      return runtime
    },
    module,
    module.exports,
  )
  return module.exports
}
afterEach(() => {
  runtime.setReactiveScheduling('frame')
  document.body.innerHTML = ''
})
it('compiles static state reads and keeps sibling DOM subscriptions cold', () => {
  const code = compile()
  expect(code).toContain('_$compiledReadPath')
  expect(code).not.toContain('.get().user')
  expect(code).not.toContain('new Proxy')
  runtime.setReactiveScheduling('sync')
  const app = evaluate()
  const root = app.View()
  document.body.appendChild(root.__rue_compiled_mount(document.body)!)
  expect(document.body.textContent).toBe('one1row')
  const before = { ...app.hits }
  app.replace((previous: any) => ({
    ...previous,
    user: {
      ...previous.user,
      age: {
        toString() {
          app.hits.age++
          return '2'
        },
      },
    },
  }))
  expect(document.body.textContent).toBe('one2row')
  expect(app.hits.name).toBe(before.name)
  expect(app.hits.age).toBe(before.age + 1)
  root.dispose()
})

it('preserves optional-chain boundaries, primitive members, and getter exceptions', () => {
  runtime.setReactiveScheduling('sync')
  const app = evaluate(`
import { useState } from '@rue-js/rue';
export let readOptional, readStrict, readGrouped, readPrimitive, readGetter, change;
export function View() {
  const [state, setState] = useState({ user: null, label: 'hello', get bad() { throw new Error('getter'); } });
  change = setState;
  readOptional = () => state.user?.name.first;
  readStrict = () => state.user.name;
  readGrouped = () => (state.user?.name).first;
  readPrimitive = () => state.label.length;
  readGetter = () => state.bad;
  return <p>{state.label.length}</p>;
}
`)
  const root = app.View()
  document.body.appendChild(root.__rue_compiled_mount(document.body)!)
  expect(app.readOptional()).toBeUndefined()
  expect(app.readStrict).toThrow(TypeError)
  expect(app.readGrouped).toThrow(TypeError)
  expect(app.readPrimitive()).toBe(5)
  expect(app.readGetter).toThrow('getter')
  const outcomes: unknown[] = []
  const subscription = runtime.effect(() => {
    try {
      outcomes.push(app.readOptional())
    } catch (error) {
      outcomes.push(error)
    }
  })
  app.change({ user: { name: null }, label: 'hello' })
  expect(outcomes).toHaveLength(2)
  expect(outcomes[1]).toBeInstanceOf(TypeError)
  expect(app.readOptional).toThrow(TypeError)
  app.change({ user: null, label: 'hi' })
  expect(document.body.textContent).toBe('2')
  expect(outcomes).toHaveLength(3)
  expect(outcomes[2]).toBeUndefined()
  app.change({ user: { name: {} }, label: 'hi' })
  expect(outcomes).toHaveLength(4)
  expect(outcomes[3]).toBeUndefined()
  app.change({ user: { name: null }, label: 'hi' })
  expect(outcomes).toHaveLength(5)
  expect(outcomes[4]).toBeInstanceOf(TypeError)
  subscription.dispose()
  root.dispose()
})

it('shares path descriptors across DOM bindings and keeps independent instances isolated', () => {
  const input = `
import { useState } from '@rue-js/rue';
export const setters = [];
export function View() {
  const [state, setState] = useState({ user: { name: 'one' } });
  setters.push(setState);
  return <div><span>{state.user.name}</span><strong>{state.user.name}</strong></div>;
}`
  expect(compile(input).match(/\._\$compiledPath\)/g)).toHaveLength(1)
  runtime.setReactiveScheduling('sync')
  const app = evaluate(input)
  const first = app.View(),
    second = app.View()
  document.body.appendChild(first.__rue_compiled_mount(document.body)!)
  document.body.appendChild(second.__rue_compiled_mount(document.body)!)
  app.setters[0]({ user: { name: 'changed' } })
  expect(Array.from(document.querySelectorAll('span'), node => node.textContent)).toEqual([
    'changed',
    'one',
  ])
  expect(Array.from(document.querySelectorAll('strong'), node => node.textContent)).toEqual([
    'changed',
    'one',
  ])
  first.dispose()
  second.dispose()
})

it('bundles the real compiled state fixture without a reactive facade or Proxy', async () => {
  const code = compile(source, 'es6')
  // Run the bundler in Node: jsdom has a different Uint8Array realm from TextEncoder.
  const bundled = JSON.parse(
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
    import { build } from 'esbuild';
    import { readFileSync } from 'node:fs';
    import { resolve } from 'node:path';
    const result = await build({
      stdin: { contents: readFileSync(0, 'utf8'), sourcefile: 'compiled-state-path.mjs', resolveDir: process.cwd() },
      bundle: true, write: false, metafile: true, format: 'esm', platform: 'browser',
      minify: true, alias: { '@rue-js/rue/internal/compiler': resolve('packages/runtime/src/compiler-internal.ts') },
      define: { __DEV__: 'false', 'process.env.NODE_ENV': '"production"' },
    });
    process.stdout.write(JSON.stringify({ code: result.outputFiles[0].text, metafile: result.metafile }));
  `,
      ],
      { input: code, encoding: 'utf8' },
    ),
  )
  const output: string = bundled.code
  const modules = Object.keys(bundled.metafile.inputs)
  const retainedModules = Object.entries(
    bundled.metafile.outputs as Record<
      string,
      { inputs: Record<string, { bytesInOutput: number }> }
    >,
  ).flatMap(([, item]) =>
    Object.entries(item.inputs)
      .filter(([, input]) => input.bytesInOutput > 0)
      .map(([name]) => name),
  )
  expect(output).not.toMatch(/new Proxy\s*\(/)
  expect(modules).not.toContain('packages/runtime/src/runtime-core/reactive-kernel/reactive.ts')
  expect(modules).not.toContain('packages/runtime/src/reactivity/index.ts')
  expect(retainedModules.some(name => name.endsWith('reactive-kernel/signal.ts'))).toBe(true)
  mkdirSync('temp/state-path', { recursive: true })
  writeFileSync('temp/state-path/compiled.mjs', code)
  writeFileSync('temp/state-path/bundle.mjs', output)
  writeFileSync(
    'temp/state-path/modules.json',
    JSON.stringify(
      {
        minifiedBytes: Buffer.byteLength(output),
        gzipBytes: gzipSync(output).byteLength,
        modules: retainedModules,
      },
      null,
      2,
    ),
  )
})
