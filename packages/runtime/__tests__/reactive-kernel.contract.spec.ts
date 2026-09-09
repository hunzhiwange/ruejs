// @vitest-environment jsdom

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  REACTIVE_KERNEL_EXPORT_NAMES,
  assertReactiveKernelContract,
  expectKernelScenarioParity,
  createReactiveKernelReference,
} from './reactive-kernel.test-utils'

const projectRoot = process.cwd()
const runtimeCoreSourceDir = path.resolve(projectRoot, 'packages/runtime/src/runtime-core')

describe('runtime TypeScript kernel contract', () => {
  it('keeps handwritten public handle types independent from generated Wasm declarations', async () => {
    const source = await readFile(
      path.resolve(runtimeCoreSourceDir, 'js-reactive/types.ts'),
      'utf8',
    )

    expect(source).not.toMatch(/from\s+['"]\.\.\/pkg-(?:node|vapor)\//)
    expect(source).toContain('interface KernelReadonlySignal<T>')
    expect(source).toContain('interface KernelWritableSignal<T>')
    expect(source).toContain('interface KernelSignalHandle<T>')
    expect(source).toContain('interface KernelEffectHandle')
  })

  it('proves an isolated kernel reference satisfies the complete export and handle contract', () => {
    const oracle = createReactiveKernelReference()
    const audit = assertReactiveKernelContract(oracle)

    expect(Object.keys(oracle).sort()).toEqual(REACTIVE_KERNEL_EXPORT_NAMES)
    expect(audit).toEqual({
      exportCount: 32,
      effectMethods: ['dispose'],
      signalMethods: [
        'get',
        'getPath',
        'peek',
        'peekPath',
        'set',
        'setPath',
        'toJSON',
        'toString',
        'trigger',
        'triggerPath',
        'update',
        'updatePath',
        'valueOf',
      ],
    })
  })

  it('captures explicit signal/effect/computed behavior through the reusable oracle harness', () => {
    const oracle = createReactiveKernelReference()
    const exercise = () => {
      oracle.setReactiveScheduling('sync')
      const count = oracle.createSignal(1)
      const doubled = oracle.createComputed(() => Number(count.get()) * 2)
      const events: unknown[] = []
      const effect = oracle.createEffect(() => events.push(doubled.get()))

      count.set(2)
      effect.dispose()
      count.set(3)

      return {
        events,
        finalCount: count.peek(),
        finalComputed: doubled.peek(),
      }
    }

    const result = expectKernelScenarioParity(exercise(), exercise(), normalized => {
      expect(normalized).toEqual({
        events: [2, 4],
        finalComputed: 6,
        finalCount: 3,
      })
    })

    expect(result.candidate).toEqual(result.oracle)
  })
})
