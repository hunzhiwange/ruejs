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

describe('vite-plugin-rue reactive props destructure', () => {
  it('adds a reactive props destructure marker and rewrites destructured reads', async () => {
    const source = `
      import { type FC, computed, watchEffect } from '@rue-js/rue'

      const Demo: FC<{ query?: string; count: number; label?: string }> = ({
        query = ' hello ',
        count: total,
        label: text = 'fallback',
      }) => {
        const summary = computed(() => query.trim().toUpperCase() + '-' + total + '-' + text)

        watchEffect(() => {
          console.log(query, total, text)
        })

        return <div>{summary.get()}</div>
      }

      export default Demo
    `

    const result = await invokeTransform(
      source,
      '/Users/dyhb/code/rue/app/test-fixtures/ReactivePropsDestructure.tsx',
    )

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain('/* RUE_TRANSFORMED */')
    expect(code).not.toContain('new Proxy(')
    expect(code).toContain('(__rue_props, _$rueSlots, _$rueOwner)=>')
    expect(code).toContain('_$compiledSignal(_$compiledPropsGet(__rue_props, "query"))')
    expect(code).toContain('_$compiledSignal(_$compiledPropsGet(__rue_props, "count"))')
    expect(code).toContain('_$compiledSignal(_$compiledPropsGet(__rue_props, "label"))')
    expect(code).toContain("_$rueCompiledProp2.get() === void 0 ? ' hello '")
    expect(code).toContain("_$rueCompiledProp1.get() === void 0 ? 'fallback'")
    expect(code).toContain('const summary = computed(')
    expect(code).toContain('_$rueCompiledProp2.set(_$rueNextProps.query)')
  })

  it('hoists watchEffect with reactive props reads into useSetup', async () => {
    const source = `
      import { type FC, computed, ref, watchEffect } from '@rue-js/rue'

      const Demo: FC<{ query?: string; count: number; label?: string }> = ({
        query = 'fallback-query',
        count,
        label = 'fallback-label',
      }) => {
        const summary = computed(() => label + ':' + query.trim().toUpperCase() + ' x ' + count)
        const latest = ref('')
        const shadow = (query: string) => query.toLowerCase()

        watchEffect(() => {
          latest.value = query + '|' + count + '|' + label + '|' + shadow(query)
        })

        return <div>{summary.get()}-{latest.value}</div>
      }

      export default Demo
    `

    const result = await invokeTransform(
      source,
      '/Users/dyhb/code/rue/app/test-fixtures/ReactivePropsWatchEffectSetup.tsx',
    )

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain('@rue-js/rue/internal')
    expect(code).toContain('const summary = computed(')
    expect(code).toContain("const latest = ref('');")
    expect(code).toContain('const shadow = (query)=>query.toLowerCase();')
    expect(code).toContain('watchEffect(()=>{')
    expect(code).toContain('_$rueCompiledProp2.set(_$rueNextProps.query)')
  })
})
