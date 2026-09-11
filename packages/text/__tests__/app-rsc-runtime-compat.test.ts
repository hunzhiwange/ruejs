import * as component from '@rue-js/runtime/internal/component'
import * as ssr from '@rue-js/runtime/internal/ssr'
import * as server from '@rue-js/runtime/server'
import { describe, expect, it } from 'vite-plus/test'
import { decodeRuePayloadReadableStream } from '@rue-js/rsc/core/payload'
import { compileNodePlan } from '../../runtime/__tests__/node-plan-test-utils'
import { createAppServerElement } from '../src/server/app-server-tree.js'
import { renderAppRscPayloadToReadableStream } from '../src/server/app-rsc-runtime-compat.js'

describe('App compiled RSC payload', () => {
  it('encodes nested data without repeatedly normalizing object identity', async () => {
    const data = { nested: [{ label: 'kept', count: 3 }], ready: Promise.resolve({ ok: true }) }
    const decoded = await decodeRuePayloadReadableStream(renderAppRscPayloadToReadableStream(data))
    expect(decoded).toEqual({ nested: [{ label: 'kept', count: 3 }], ready: { ok: true } })
  })

  it('encodes a real compiled server plan once into a data frame', async () => {
    const page = compileNodePlan(
      `export let executions = 0; export const Page = props => { executions++; return <article>{props.label}</article>; };`,
      'server',
      true,
      {},
      {
        '@rue-js/rue/internal/component': component,
        '@rue-js/rue/internal/ssr': ssr,
        '@rue-js/runtime/server': server,
      },
    )
    const plan = createAppServerElement(page.Page, { label: 'server content' })
    const decoded = await decodeRuePayloadReadableStream<Record<string, any>>(
      renderAppRscPayloadToReadableStream({ page: plan, repeated: Promise.resolve(plan) }),
    )
    expect(decoded.page.version).toBe(1)
    expect(decoded.page.html).toContain('server content')
    expect(decoded.page.references).toEqual([])
    expect(decoded.repeated).toEqual(decoded.page)
    expect(page.executions).toBe(1)
  })
})
