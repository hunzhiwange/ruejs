import { describe, expect, it, vi } from 'vite-plus/test'
import { compileNodePlan } from '../../runtime/__tests__/node-plan-test-utils'
import { AppElementsWire, type AppWireElements } from '../src/server/app-elements.js'
import { handleSsr } from '../src/server/app-ssr-entry.js'

vi.mock('../src/server/app-rsc-ssr-runtime.js', () => ({
  appClientReferencePreloader: { preload: vi.fn(async () => undefined) },
  installAppClientReferenceResolver: vi.fn(),
  loadAppBootstrapScriptContent: vi.fn(async () => undefined),
  loadAppRscRequestHandler: vi.fn(),
}))

async function renderDocument(source: string) {
  const compiled = compileNodePlan(
    `${source};export {renderServerFrame} from '@rue-js/runtime/internal/ssr'`,
    'server',
  )
  const frame = await compiled.renderServerFrame(compiled.View, {
    resolve: () => {
      throw new Error('unexpected client reference')
    },
  })
  const routeId = AppElementsWire.encodeRouteId('/inline-ssr', null)
  const ssrPayload = {
    [AppElementsWire.keys.interceptionContext]: null,
    [AppElementsWire.keys.layoutIds]: [AppElementsWire.encodeLayoutId('/')],
    [AppElementsWire.keys.rootLayout]: '/',
    [AppElementsWire.keys.route]: routeId,
    [routeId]: frame,
  } as AppWireElements
  const stream = await handleSsr(
    new ReadableStream({
      start(controller) {
        controller.close()
      },
    }),
    null,
    { links: [], preloads: [], styles: [] },
    { ssrPayload, waitForAllReady: true },
  )
  return new Response(stream).text()
}

describe('App compiled SSR entry', () => {
  it('renders compiled layout, template, and page content from an inline frame', async () => {
    const html = await renderDocument(
      `const Layout=props=><html><body>{props.children}</body></html>;const Template=props=><section>{props.children}</section>;const Page=()=> <main id="inline-page">inline body</main>;export const View=()=> <Layout><Template><Page/></Template></Layout>`,
    )
    expect(html.replace(/<!--.*?-->/gs, '')).toContain(
      '<body><section><main id="inline-page">inline body</main></section></body>',
    )
    expect(html).toContain('r:b:')
  })

  it('writes a full compiled document with head and body without HTML bridge elements', async () => {
    const html = await renderDocument(
      `export const View=()=> <html lang="en"><head><style>{'body{color:red}'}</style></head><body><main id="page">page</main></body></html>`,
    )
    const markup = html.replace(/<!--.*?-->/gs, '')
    expect(markup).toContain('<style>body{color:red}</style>')
    expect(markup).toContain('<body><main id="page">page</main></body>')
    expect(markup).not.toContain('text-rue-html')
    expect(markup).not.toContain('[object Object]')
  })
})
