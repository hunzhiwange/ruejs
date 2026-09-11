import { describe, expect, it } from 'vitest'

import { compileRueStatic } from '../index.mjs'

if (!(globalThis as any).document) {
  ;(globalThis as any).document = { body: { innerHTML: '' } }
}

describe('compileRueStatic', () => {
  it('compiles Rue TSX outside of the Vite transform hook', async () => {
    const code = await compileRueStatic(
      `
        import { type FC } from '@rue-js/rue'

        const App: FC = () => <main class="page"><h1>Hello</h1></main>
        export default App
      `,
      { id: '/virtual/static-entry.tsx', production: false },
    )

    expect(code).toContain('/* RUE_TRANSFORMED */')
    expect(code).toContain('@rue-js/rue/internal/dom')
    expect(code).not.toMatch(/from\s+["']@rue-js\/rue\/internal["']/)
    expect(code).toContain('_$compiledCreateElement("main"')
    expect(code).not.toContain('@rue-js/runtime-vapor')
    expect(code).not.toContain('@rue-js/rue/vapor')
    expect(code).not.toContain('@rue-js/jsx-runtime')
    expect(code).not.toContain('<main')
  })

  it('adds the private builtins entry only when a compiled component uses a builtin', async () => {
    const code = await compileRueStatic(
      `
        import { KeepAlive, type FC } from '@rue-js/rue'

        const Child: FC = () => <span>child</span>
        export const App: FC = () => <KeepAlive><Child /></KeepAlive>
      `,
      { id: '/virtual/static-builtin-entry.tsx', production: false },
    )

    expect(code).toContain('@rue-js/rue/internal/component')
    expect(code).toContain('@rue-js/rue/internal/keepalive')
    expect(code).not.toMatch(/from\s+["']@rue-js\/rue\/internal["']/)
  })

  it('uses the component entry without the builtins entry for nested components', async () => {
    const code = await compileRueStatic(
      `
        import { type FC } from '@rue-js/rue'

        const Child: FC = () => <span>child</span>
        export const App: FC = () => <Child />
      `,
      { id: '/virtual/static-component-entry.tsx', production: false },
    )

    expect(code).toContain('@rue-js/rue/internal/component')
    expect(code).not.toContain('@rue-js/rue/internal/keepalive')
    expect(code).not.toMatch(/from\s+["']@rue-js\/rue\/internal["']/)
  })

  it('compiles server graph client directives through the island writer factory', async () => {
    const code = await compileRueStatic(
      `
        import Counter from './Counter'
        export const App = () => <Counter client:load count={1} />
      `,
      { id: '/virtual/static-island.tsx', production: false, target: 'server' },
    )

    expect(code).toContain('CompiledIsland')
    expect(code).toContain('component: Counter')
    expect(code).not.toContain('client:load')
  })
})
