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

describe('vite-plugin-rue repeated computed branch transform', () => {
  it.fails('hoists repeated computed reads inside sibling conditional branches', async () => {
    const source = `
      import { computed, ref, type FC } from '@rue-js/rue'

      const Demo: FC = () => {
        const docPath = ref('b')
        const docs = computed(() => [
          { id: 'a', title: 'A' },
          { id: 'b', title: 'B' },
        ])
        const currentIndex = computed(() => docs.get().findIndex(item => item.id === docPath.value))
        const prev = computed(() => {
          const idx = currentIndex.get()
          const list = docs.get()
          return idx > 0 ? list[idx - 1] : undefined
        })
        const next = computed(() => {
          const idx = currentIndex.get()
          const list = docs.get()
          return idx >= 0 && idx < list.length - 1 ? list[idx + 1] : undefined
        })

        return (
          <section>
            {currentIndex.get() >= 0 && (
              <div>
                {prev.get() ? <a href={"#/" + prev.get()!.id}>{prev.get()?.title}</a> : <span>prev-empty</span>}
                {next.get() ? <a href={"#/" + next.get()!.id}>{next.get()?.title}</a> : <span>next-empty</span>}
              </div>
            )}
          </section>
        )
      }

      export default Demo
    `

    const result = await invokeTransform(
      source,
      '/Users/dyhb/code/rue/app/test-fixtures/RepeatedComputedBranch.tsx',
    )

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain('/* RUE_VAPOR_TRANSFORMED */')

    const prevReads = code.match(/\bprev\.get\(\)/g)?.length ?? 0
    const nextReads = code.match(/\bnext\.get\(\)/g)?.length ?? 0

    expect(prevReads).toBeLessThanOrEqual(1)
    expect(nextReads).toBeLessThanOrEqual(1)
  })
})
