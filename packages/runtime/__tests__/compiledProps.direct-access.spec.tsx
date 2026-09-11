// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { createCompiledProps } from '../src/compiled-props'
import { effect, setReactiveScheduling } from '../src/runtime-core/compiled'

afterEach(() => setReactiveScheduling('frame'))

it('tracks keys independently and observes additions, deletions, and snapshots', () => {
  setReactiveScheduling('sync')
  const props = createCompiledProps<Record<string, unknown>>({ first: 1, second: 2 })
  expect(types.isProxy(props.props)).toBe(false)
  const runs = [0, 0, 0, 0]
  const effects = [
    effect(() => {
      props.get('first')
      runs[0]++
    }),
    effect(() => {
      props.get('second')
      runs[1]++
    }),
    effect(() => {
      props.keys()
      runs[2]++
    }),
    effect(() => {
      props.snapshot()
      runs[3]++
    }),
  ]
  props.update({ first: 3, second: 2 })
  expect(runs).toEqual([2, 1, 1, 2])
  props.update({ first: 3, second: 2, added: 4 })
  expect(runs).toEqual([2, 1, 2, 3])
  props.update({ second: 2, added: 4 })
  expect(runs).toEqual([3, 1, 3, 4])
  expect(props.has('first')).toBe(false)
  expect(props.snapshot()).toEqual({ second: 2, added: 4 })
  effects.forEach(item => item.dispose())
  props.dispose()
})

it('snapshots only enumerable own keys without inheriting prototype properties', () => {
  const symbol = Symbol('own')
  const input = Object.assign(Object.create({ inherited: 1 }), { own: 2, [symbol]: 3 })
  Object.defineProperty(input, 'hidden', { value: 4 })
  const props = createCompiledProps(input)
  expect(props.keys()).toEqual(['own', symbol])
  expect(props.has('inherited')).toBe(false)
  expect(props.get('hidden')).toBeUndefined()
  expect(props.snapshot()).toEqual({ own: 2, [symbol]: 3 })
  props.dispose()
})

import { resolve } from 'node:path'
import { types } from 'node:util'
import swc from '@swc/core'
import * as reactive from '../src/compiler-runtime/entries/reactive'
import * as component from '../src/compiler-runtime/entries/component'
import { resolveCompilerCapability } from './compiler-capability-test-runtime'
const runtime = { ...reactive, ...component }

it('treats omitted props as an empty object for directly invoked compiled components', () => {
  const code = swc.transformSync(
    `
    export const Preview = ({ label, ...rest }) => (
      <p>{label ?? 'missing'}:{Object.keys(rest).length}:{'label' in rest ? 'yes' : 'no'}</p>
    );
  `,
    {
      filename: 'compiled-omitted-props.tsx',
      jsc: {
        parser: { syntax: 'typescript', tsx: true },
        target: 'es2022',
        experimental: { plugins: [[resolve('packages/swc-plugin-rue/swc-plugin-rue.wasm'), {}]] },
      },
      module: { type: 'commonjs' },
    },
  ).code
  const module = { exports: {} as any }
  new Function('require', 'module', 'exports', code)(
    (id: string) => {
      const entry = resolveCompilerCapability(id)
      if (!entry) throw new Error(`Unexpected generated import: ${id}`)
      return entry
    },
    module,
    module.exports,
  )

  const block = module.exports.Preview()
  block.__rue_compiled_mount(document.body)
  expect(document.body.textContent).toBe('missing:0:no')
  block.dispose()
  document.body.innerHTML = ''
})

it('updates real compiled components through static, dynamic, rest, spread, and prototype inputs', () => {
  setReactiveScheduling('sync')
  const code = swc.transformSync(
    `
    export let readFirst, readSecond, readKeys, readHas, readDynamic, readRest, readSpread, readMethod, readAlias;
    export function View(props) {
      const alias = props;
      readAlias = () => alias.first;
      readMethod = () => props.method(5);
      readFirst = () => props.first;
      readSecond = () => props?.second;
      readKeys = () => Object.keys(props);
      readHas = () => 'added' in props;
      readDynamic = key => props[key];
      readRest = () => { const { first, ...rest } = props; return rest; };
      readSpread = () => ({ ...props });
      return <p>{props.first ?? 'missing'}:{props.second}</p>;
    }
  `,
    {
      filename: 'compiled-props-direct.tsx',
      jsc: {
        parser: { syntax: 'typescript', tsx: true },
        target: 'es2022',
        experimental: { plugins: [[resolve('packages/swc-plugin-rue/swc-plugin-rue.wasm'), {}]] },
      },
      module: { type: 'commonjs' },
    },
  ).code
  expect(code).toContain('_$compiledPropsGet')
  expect(code).toContain('_$compiledPropsSnapshot')
  expect(code).not.toContain('props.first')
  const module = { exports: {} as any }
  new Function('require', 'module', 'exports', code)(
    (id: string) => {
      const entry = resolveCompilerCapability(id)
      if (!entry) throw new Error(`Unexpected generated import: ${id}`)
      return entry
    },
    module,
    module.exports,
  )
  const app = module.exports
  const source = runtime.signal<Record<string, unknown>>({ first: 1, second: 2 })
  const root = runtime._$createComponent(app.View, () => source.get())
  root.__rue_compiled_mount(document.body)
  expect(document.body.textContent).toBe('1:2')
  const runs = [0, 0, 0]
  const subscriptions = [
    effect(() => {
      app.readFirst()
      runs[0]++
    }),
    effect(() => {
      app.readSecond()
      runs[1]++
    }),
    effect(() => {
      app.readKeys()
      runs[2]++
    }),
  ]
  source.set({ first: 3, second: 2 })
  expect(runs).toEqual([2, 1, 1])
  expect(document.body.textContent).toBe('3:2')
  expect(app.readAlias()).toBe(3)
  source.set({ first: 3, second: 2, added: null })
  expect(runs).toEqual([2, 1, 2])
  expect(app.readHas()).toBe(true)
  expect(app.readDynamic('added')).toBeNull()
  expect(app.readRest()).toEqual({ second: 2, added: null })
  expect(app.readSpread()).toEqual({ first: 3, second: 2, added: null })
  source.set(Object.assign(Object.create({ inherited: 'hidden' }), { second: 2 }))
  expect(runs).toEqual([3, 1, 3])
  expect(app.readHas()).toBe(false)
  expect(app.readDynamic('inherited')).toBeUndefined()
  expect(app.readKeys()).toEqual(['second'])
  expect(document.body.textContent).toBe('missing:2')
  source.set({
    second: 2,
    method(this: { second: number }, n: number) {
      return this.second + n
    },
  })
  expect(app.readMethod()).toBe(7)
  subscriptions.forEach(item => item.dispose())
  root.dispose()
  source.dispose()
  document.body.innerHTML = ''
})

it('shares the props controller across independently loaded runtime entries', async () => {
  setReactiveScheduling('sync')
  const entry = '../src/compiler-runtime/props' + '?independent-props-entry'
  const isolated = (await import(entry)) as typeof import('../src/compiled-props')
  const props = createCompiledProps<Record<string, unknown>>({ first: 1 })
  let runs = 0
  const sub = effect(() => {
    isolated._$compiledPropsKeys(props.props)
    runs++
  })
  props.update({ first: 1, added: 2 })
  expect(runs).toBe(2)
  expect(isolated._$compiledPropsSnapshot(props.props)).toEqual({ first: 1, added: 2 })
  sub.dispose()
  props.dispose()
})

it('keeps lazy prop records alive when the first reader owner is disposed', () => {
  setReactiveScheduling('sync')
  const props = createCompiledProps({ value: 1 })
  const first = runtime.createOwner()
  runtime.runWithOwner(first, () => runtime.effect(() => props.get('value')))
  runtime.disposeOwner(first)
  const seen: unknown[] = []
  const second = runtime.effect(() => {
    seen.push(props.get('value'))
  })
  props.update({ value: 2 })
  props.update({ value: 3 })
  expect(seen).toEqual([1, 2, 3])
  second.dispose()
  props.dispose()
})
