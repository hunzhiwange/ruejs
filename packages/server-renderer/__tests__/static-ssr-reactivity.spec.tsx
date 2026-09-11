// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { compileNodePlan } from '../../runtime/__tests__/node-plan-test-utils'

it('writes reactive SSR instructions without a DOM environment and releases the owner', async () => {
  const compiled = compileNodePlan(
    `import { signal, onCleanup } from '@rue-js/rue'; export let cleaned = 0; export const View = () => { const count = signal(3); onCleanup(() => cleaned++); return <p>总计: {count.get()}</p>; };`,
    'server',
  )
  const testDocument = globalThis.document
  Reflect.deleteProperty(globalThis, 'document')
  try {
    const html = await compiled.renderToString(compiled.View)
    expect(html).toContain('总计: ')
    expect(html).toContain('>3<!--')
    expect(compiled.cleaned).toBe(1)
  } finally {
    globalThis.document = testDocument
  }
})
