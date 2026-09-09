// @vitest-environment jsdom

import { pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

type RuntimeEntry = {
  effect(callback: () => void): { dispose(): void }
  batch<T>(callback: () => T): T
  createOwner(): number
  runWithOwner<T>(owner: number, callback: () => T): T
  disposeOwner(owner: number): boolean
  __rueGetCompiledReactiveDebugState(): { nodeCount: number; linkCount: number }
  setReactiveScheduling(mode: 'sync' | 'microtask' | 'frame'): void
  signal<T>(initial: T): {
    dispose(): void
    get(): T
    set(value: T): void
  }
}

const loadBuiltEntry = async (filename: string): Promise<RuntimeEntry> =>
  import(
    pathToFileURL(resolve(process.cwd(), 'packages/runtime/dist', filename)).href
  ) as Promise<RuntimeEntry>

describe('runtime built entry reactive kernel interoperability', () => {
  it('initializes a cold compiler kernel inside nested owners without losing scopes', () => {
    const url = pathToFileURL(
      resolve(process.cwd(), 'packages/runtime/dist/compiler-internal.js'),
    ).href
    const output = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
      const c = await import(${JSON.stringify(url)});
      const parent = c.createOwner();
      const initial = c.__rueGetCompiledReactiveDebugState();
      let state;
      let runs = 0;
      c.runWithOwner(parent, () => {
        const child = c.createOwner();
        c.runWithOwner(child, () => {
          state = c.signal(0);
          c.effect(() => { state.get(); runs++; });
        });
        c.effect(() => { state.get(); runs++; });
      });
      const active = c.__rueGetCompiledReactiveDebugState();
      c.disposeOwner(parent);
      state.set(1);
      console.log(JSON.stringify({ initial, active, final: c.__rueGetCompiledReactiveDebugState(), runs }));
    `,
      ],
      { encoding: 'utf8' },
    )
    const result = JSON.parse(output)
    expect(result.initial).toMatchObject({ nodeCount: 0, linkCount: 0 })
    expect(result.active).toMatchObject({ nodeCount: 3, linkCount: 2 })
    expect(result.final).toMatchObject({
      nodeCount: 0,
      linkCount: 0,
      activeOwners: 0,
      activeEffects: 0,
    })
    expect(result.runs).toBe(2)
  })

  it('owns public effects created by a compiler effect after the public entry loads', () => {
    const compilerURL = pathToFileURL(
      resolve(process.cwd(), 'packages/runtime/dist/compiler-internal.js'),
    ).href
    const publicURL = pathToFileURL(resolve(process.cwd(), 'packages/runtime/dist/index.js')).href
    const output = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
      const c = await import(${JSON.stringify(compilerURL)});
      const owner = c.createOwner();
      let publicRuntime, publicSignal, trigger;
      let runs = 0;
      c.runWithOwner(owner, () => {
        trigger = c.signal(0);
        c.effect(() => {
          trigger.get();
          if (publicRuntime) publicRuntime.effect(() => { publicSignal.get(); runs++; });
        });
      });
      publicRuntime = await import(${JSON.stringify(publicURL)});
      publicSignal = publicRuntime.signal(0);
      c.setReactiveScheduling('sync');
      trigger.set(1);
      c.disposeOwner(owner);
      publicSignal.set(1);
      publicSignal.dispose();
      console.log(JSON.stringify({ runs, final: c.__rueGetCompiledReactiveDebugState() }));
    `,
      ],
      { encoding: 'utf8' },
    )
    expect(JSON.parse(output)).toEqual({
      runs: 1,
      final: { nodeCount: 0, linkCount: 0, activeOwners: 0, activeEffects: 0 },
    })
  })

  it('tracks public signals in internal effects and internal signals in public effects', async () => {
    const [publicRuntime, internalRuntime] = await Promise.all([
      loadBuiltEntry('index.js'),
      loadBuiltEntry('internal.js'),
    ])
    publicRuntime.setReactiveScheduling('sync')

    const publicSignal = publicRuntime.signal('public:one')
    const internalSignal = internalRuntime.signal('internal:one')
    const seenByInternal: string[] = []
    const seenByPublic: string[] = []
    const internalEffect = internalRuntime.effect(() => seenByInternal.push(publicSignal.get()))
    const publicEffect = publicRuntime.effect(() => seenByPublic.push(internalSignal.get()))

    publicSignal.set('public:two')
    internalSignal.set('internal:two')

    expect(seenByInternal).toEqual(['public:one', 'public:two'])
    expect(seenByPublic).toEqual(['internal:one', 'internal:two'])

    internalEffect.dispose()
    publicEffect.dispose()
    publicSignal.set('public:three')
    internalSignal.set('internal:three')
    expect(seenByInternal).toHaveLength(2)
    expect(seenByPublic).toHaveLength(2)
  })

  it('shares compiler/public graph counts, batching and owner disposal across built entries', async () => {
    const [publicRuntime, compiler] = await Promise.all([
      loadBuiltEntry('index.js'),
      loadBuiltEntry('compiler-internal.js'),
    ])
    publicRuntime.setReactiveScheduling('sync')
    const baseline = compiler.__rueGetCompiledReactiveDebugState()
    const publicSignal = publicRuntime.signal(0)
    const owner = compiler.createOwner()
    const seen: number[] = []
    let compiledSignal!: ReturnType<RuntimeEntry['signal']>
    compiler.runWithOwner(owner, () => {
      compiledSignal = compiler.signal(10)
      compiler.effect(() => {
        seen.push(publicSignal.get())
      })
      publicRuntime.effect(() => {
        seen.push(compiledSignal.get() as number)
      })
    })
    expect(compiler.__rueGetCompiledReactiveDebugState()).toMatchObject({
      nodeCount: baseline.nodeCount + 4,
      linkCount: baseline.linkCount + 2,
    })
    compiler.batch(() => {
      publicSignal.set(1)
      publicSignal.set(2)
      compiledSignal.set(11)
      compiledSignal.set(12)
      expect(seen).toEqual([0, 10])
    })
    expect(seen).toEqual([0, 10, 2, 12])
    compiler.disposeOwner(owner)
    publicSignal.dispose()
    expect(compiler.__rueGetCompiledReactiveDebugState()).toMatchObject({
      nodeCount: baseline.nodeCount,
      linkCount: baseline.linkCount,
    })
    compiledSignal.set(20)
    expect(seen).toEqual([0, 10, 2, 12])
  })

  it('keeps special-object identity through both built signal entry points', async () => {
    const [publicRuntime, internalRuntime] = await Promise.all([
      loadBuiltEntry('index.js'),
      loadBuiltEntry('internal.js'),
    ])
    const node = document.createElement('div')
    node.dataset.label = 'host'

    for (const runtime of [publicRuntime, internalRuntime]) {
      const state = runtime.signal({
        values: new Set(['a', 'b']),
        bytes: new Uint8Array([3, 5, 8]),
        node,
      })
      expect(state.get().values.size).toBe(2)
      expect(state.get().bytes.byteLength).toBe(3)
      expect(state.get().node.dataset.label).toBe('host')
      expect(state.get().node).toBe(node)
      state.dispose()
    }
  })
})
