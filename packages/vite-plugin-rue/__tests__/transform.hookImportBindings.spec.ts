// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'

import VitePluginRue from '../index.mjs'

const createPlugin = () => VitePluginRue({ include: ['/app/'] })

const invokeTransform = async (source: string, id: string) => {
  const plugin = createPlugin()
  const transformHook = plugin.transform

  if (!transformHook) {
    return null
  }

  if (typeof transformHook === 'function') {
    return transformHook.call({} as any, source, id)
  }

  return transformHook.handler.call({} as any, source, id)
}

describe('vite-plugin-rue hook import bindings', () => {
  it('keeps moved hook imports bound to their original local names', async () => {
    const source = `
      import { type FC, useState, watch, ref } from '@rue-js/rue'

      const Demo: FC = () => {
        const [theme] = useState('light')
        const count = ref(0)

        watch(() => theme, () => {
          count.value += 1
        })

        return <div>{theme}-{count.value}</div>
      }

      export default Demo
    `

    const result = await invokeTransform(
      source,
      '/Users/dyhb/code/rue/app/test-fixtures/HookImportBindings.tsx',
    )

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain('/* RUE_TRANSFORMED */')
    expect(code).toContain('@rue-js/rue/internal')
    expect(code).toContain('watch, ref, _$compiledScalarRoot')
    expect(code).toContain('_$compiledUseState')
    expect(code).toContain('_$compiledUseState("Demo:hook:0"')
    expect(code).not.toContain('watch as watch1')
    expect(code).not.toContain('useState as useState1')
    expect(code).not.toContain('ref as ref1')
    expect(code).toContain('_$compiledUseState("Demo:hook:0", \'light\')')
    expect(code).toMatch(/watch\(\(\)=>_\$state\d*\.get\(\)/)
    expect(code).toContain('const count = ref(0)')
  })
})
