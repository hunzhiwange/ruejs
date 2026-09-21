import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { compileNodePlan } from '../../runtime/__tests__/node-plan-test-utils'

describe('RouterLink SSR', () => {
  it('renders a usable anchor without requiring an installed router', async () => {
    const server = compileNodePlan(
      `
        import { RouterLink } from './router.tsx'
        export const Page = () => (
          <RouterLink to="/guide/getting-started" className="brand-link">
            <span>Getting started</span>
          </RouterLink>
        )
      `,
      'server',
      false,
      {
        'router.tsx': readFileSync(resolve(import.meta.dirname, '../src/index.tsx'), 'utf8'),
        'prefetch.ts': readFileSync(resolve(import.meta.dirname, '../src/prefetch.ts'), 'utf8'),
        'navigation-lifecycle.ts': readFileSync(
          resolve(import.meta.dirname, '../src/navigation-lifecycle.ts'),
          'utf8',
        ),
        'scroll.ts': readFileSync(resolve(import.meta.dirname, '../src/scroll.ts'), 'utf8'),
        'view-transitions.ts': readFileSync(
          resolve(import.meta.dirname, '../src/view-transitions.ts'),
          'utf8',
        ),
      },
    )

    const html = await server.renderToString(server.Page)

    expect(html).toContain('href="/guide/getting-started"')
    expect(html).toContain('class="brand-link"')
    expect(html).toContain('<span>')
    expect(html).toContain('Getting started')
  })
})
