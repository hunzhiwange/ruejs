import { describe, expect, it } from 'vitest'

import VitePluginRue from '../index.mjs'

if (!(globalThis as any).document) {
  ;(globalThis as any).document = { body: { innerHTML: '' } }
}

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

describe('vite-plugin-rue event directive transform', () => {
  it('rewrites @ / v-on: / r-on: directives before SWC parsing and reuses event lowering', async () => {
    const source = `
      import { type FC } from '@rue-js/rue'

      const Demo: FC = () => {
        const handleClick = () => console.log('clicked')
        const handleMouseDown = () => console.log('down')
        const handleEnter = () => console.log('enter')
        const handleBack = () => console.log('back')
        const handleMetaExact = () => console.log('meta-exact')
        const handleMetaExactRight = () => console.log('meta-exact-right')

        return (
          <section>
            <button data-state={1 > 0 ? 'ready' : 'idle'} @click.stop={handleClick}>
              Click
            </button>
            <input v-on:keyup.enter="handleEnter" />
            <button v-on:click-meta-exact="handleMetaExact">Meta</button>
            <button r-on:click-meta-exact="handleMetaExactRight">Meta Right</button>
            <button r-on:click.once="handleBack" />
            <div title="contact@demo=1" @mouse-down={handleMouseDown} />
          </section>
        )
      }

      export default Demo
    `

    const result = await invokeTransform(
      source,
      '/Users/Shared/work/dir/data/codes/rue/app/test-fixtures/EventDirectiveShorthand.tsx',
    )

    const code = typeof result === 'string' ? result : String(result?.code ?? '')

    expect(code).toContain('/* RUE_TRANSFORMED */')
    expect(code).toContain('.addEventListener("click"')
    expect(code).toContain('.removeEventListener("click"')
    expect(code).toContain('onOwnerCleanup')
    expect(code).toContain('_$compiledWithEventModifiers')
    expect(code).not.toContain('_$compiledWithNativeEvents')
    expect(code).toContain('"click"')
    expect(code).toContain('"keyup"')
    expect(code).toContain('"mousedown"')
    expect(code).toContain('"meta"')
    expect(code).toContain('"exact"')
    expect(code).toContain('handleMetaExact($event)')
    expect(code).toContain('handleMetaExactRight($event)')
    expect(code).not.toContain('@click')
    expect(code).not.toContain('v-on:keyup.enter')
    expect(code).not.toContain('v-on:click-meta-exact')
    expect(code).not.toContain('r-on:click.native.once')
    expect(code).not.toContain('r-on:click-meta-exact')
    expect(code).not.toContain('@mouse-down')
    expect(code).not.toContain('__rue_on__')
    expect(code).toContain('contact@demo=1')
  })
})

it('rejects legacy component native events with an explicit DOM-boundary diagnostic', async () => {
  await expect(
    invokeTransform(
      `import Card from './Card'; export const View = () => <Card r-on:click.native={() => {}} />`,
      '/app/ComponentNativeEvent.tsx',
    ),
  ).rejects.toThrow(/explicit DOM event boundary/)
})
