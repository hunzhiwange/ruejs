import { describe, expect, it } from 'vitest'

import VitePluginRue, { compileRueStatic } from '../index.mjs'

const source = ['export const value = 1', 'export const View = () => <main>broken</main>'].join(
  '\n',
)

const invariantPayload = {
  category: 'component-anchor-target',
  helper: '_$mountCompiledSlotAt',
  start: 30,
  end: 54,
  message: 'anchored mount requires { parent, before } and two reader functions',
}

const throwCompilerInvariant = () => {
  throw new Error(
    `failed to invoke Rue SWC plugin: __RUE_COMPILER_INVARIANT__${JSON.stringify(invariantPayload)}`,
  )
}

const expectCompilerInvariant = (error: unknown, file: string) => {
  expect(error).toMatchObject({
    code: 'RUE_COMPILER_INVARIANT',
    plugin: '@rue-js/vite-plugin-rue',
    file,
    line: 2,
    column: 7,
    helper: '_$mountCompiledSlotAt',
  })
  expect(error).toBeInstanceOf(Error)
  expect((error as Error).message).toContain('component-anchor-target')
  expect((error as Error).message).toContain(
    'anchored mount requires { parent, before } and two reader functions',
  )
}

const invokeTransformWith = async (
  input: string,
  id: string,
  transformExecutor: NonNullable<Parameters<typeof VitePluginRue>[0]>['transformExecutor'],
) => {
  const plugin = VitePluginRue({ include: ['/app/'], transformExecutor })
  const hook = plugin.transform
  if (!hook) return null
  return typeof hook === 'function'
    ? hook.call({ environment: { name: 'client' } } as any, input, id)
    : hook.handler.call({ environment: { name: 'client' } } as any, input, id)
}

describe('vite-plugin-rue compiler invariant diagnostics', () => {
  it('maps compiler invariant failures from compileRueStatic', async () => {
    const file = '/app/StaticInvariant.tsx'

    try {
      await compileRueStatic(source, {
        id: file,
        transformExecutor: throwCompilerInvariant,
      } as any)
      throw new Error('Expected compileRueStatic to reject')
    } catch (error) {
      expectCompilerInvariant(error, file)
    }
  })

  it('maps compiler invariant failures from the Vite transform hook', async () => {
    const file = '/app/TransformInvariant.tsx'
    const plugin = VitePluginRue({
      include: ['/app/'],
      transformExecutor: throwCompilerInvariant,
    })
    const transform =
      typeof plugin.transform === 'function' ? plugin.transform : plugin.transform!.handler

    try {
      await transform.call({ environment: { name: 'client' } } as any, source, file, {
        moduleType: 'js',
      })
      throw new Error('Expected Vite transform to reject')
    } catch (error) {
      expectCompilerInvariant(error, file)
    }
  })

  it('keeps residual JSX and strict source diagnostics in their existing error classes', async () => {
    const residualSource = 'export const leaked = <span>leaked</span>'
    await expect(
      invokeTransformWith(residualSource, '/app/ResidualClass.tsx', () => residualSource),
    ).rejects.toMatchObject({ code: 'RUE_RESIDUAL_JSX' })

    const strictPayload = {
      category: 'unsupported-source-syntax',
      syntax: 'dynamic hook selection',
      suggestion: 'call a statically known hook',
      start: 1,
      end: 8,
    }
    const marker = `__RUE_COMPILER_DIAGNOSTIC__${JSON.stringify(strictPayload)}`
    await expect(
      invokeTransformWith(
        'const selected = chooseHook()',
        '/app/StrictClass.tsx',
        () => `${JSON.stringify(marker)}; export const compiled = true`,
      ),
    ).rejects.toMatchObject({ code: 'RUE_STRICT_CLIENT_COMPILE' })
  })
})
