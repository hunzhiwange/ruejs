import { describe, expect, it, vi } from 'vite-plus/test'
import {
  decodeRuePayloadReadableStream,
  renderRuePayloadToReadableStream,
} from '@rue-js/rsc/core/payload'
import { createRscSsrPayloadProtocol } from '../src/server/app-rsc-ssr-payload-protocol.js'
import { compileNodePlan } from '../../runtime/__tests__/node-plan-test-utils'

describe('App RSC SSR payload protocol', () => {
  it('decodes Rue payload frames through the SSR payload facade', async () => {
    const protocol = createRscSsrPayloadProtocol({
      load: vi.fn(async () => ({ decodePayload: decodeRuePayloadReadableStream })),
    })

    const page = compileNodePlan(
      `export const View=()=> <main>SSR payload</main>;export {renderServerFrame} from '@rue-js/runtime/internal/ssr'`,
      'server',
    )
    const frame = await page.renderServerFrame(page.View, {
      resolve: () => {
        throw new Error('unexpected reference')
      },
    })
    await expect(
      protocol.decodePayload<Record<string, unknown>>(
        renderRuePayloadToReadableStream({
          'page:/ssr': frame,
        }),
      ),
    ).resolves.toMatchObject({
      'page:/ssr': {
        version: 1,
        html: expect.stringContaining('SSR payload'),
        references: [],
      },
    })
  })
})
