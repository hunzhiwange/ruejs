// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'

import VitePluginRue from '../index.mjs'

const createPlugin = () => VitePluginRue({ include: ['/app/'] })

const invokeTransform = async (
  source: string,
  id: string,
  context: Record<string, unknown> = {},
) => {
  const plugin = createPlugin()
  const transformHook = plugin.transform

  if (!transformHook) {
    return null
  }

  if (typeof transformHook === 'function') {
    return transformHook.call(context as any, source, id)
  }

  return transformHook.handler.call(context as any, source, id)
}

describe('vite-plugin-rue RSC directives', () => {
  it('keeps use client in the directive prologue after Rue transform', async () => {
    const source = `
      'use client'

      import { useState } from '@rue-js/rue'

      export default function LikeButton() {
        const [count, setCount] = useState(0)

        return <button onClick={() => setCount(count + 1)}>Like {count}</button>
      }
    `

    const result = await invokeTransform(
      source,
      '/Users/dyhb/code/rue/app/test-fixtures/LikeButton.tsx',
    )

    const code = typeof result === 'string' ? result : String(result?.code ?? '')
    const useClientIndex = code.search(/["']use client["'];?/)
    const importIndex = code.indexOf('import ')

    expect(code).toContain('/* RUE_TRANSFORMED */')
    expect(useClientIndex).toBeGreaterThan(-1)
    expect(importIndex).toBeGreaterThan(-1)
    expect(useClientIndex).toBeLessThan(importIndex)
    expect(code.match(/["']use client["'];?/g)).toHaveLength(1)
    expect(code).toContain('@rue-js/rue/internal')
    expect(code).not.toMatch(/@rue-js\/(?:rue\/vapor|runtime-vapor)/)
  })

  it('compiles RSC JSX with server renderer operations', async () => {
    const source = `
      import LikeButton from '../components/LikeButton'

      export default function Page() {
        return <LikeButton initialLikes={16} />
      }
    `

    const result = await invokeTransform(source, '/Users/dyhb/code/rue/app/page.tsx', {
      environment: { name: 'rsc' },
    })
    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain('@rue-js/rue/internal/ssr')
    expect(code).toMatch(/_\$writeComponent\(_\$ctx, "\d+", LikeButton/)
    expect(code).not.toContain('_$serverComponent')
  })
})
