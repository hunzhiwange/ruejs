import { describe, expect, it } from 'vite-plus/test'
import {
  createPagesDocumentElement,
  createPagesPageElement,
  renderPagesRenderableToReadableStream,
  renderPagesRenderableToString,
} from '../src/server/pages-renderer-adapter.js'
import Document from '../src/shims/document.js?text-ssr'
import { compileServerFixture } from './rue-ssr-test-utils.js'

describe('compiled Pages renderer', () => {
  it('renders the document placeholders through the core writer', async () => {
    const html = await renderPagesRenderableToString(createPagesDocumentElement(Document))
    expect(html).toContain('<html')
    expect(html).toContain('__TEXT_MAIN__')
    expect(html).toContain('__TEXT_SCRIPTS__')
  })
  it('passes page props through a compiled custom App component', async () => {
    const module = await compileServerFixture(
      'export const App=({Component,pageProps})=><main><Component {...pageProps}/></main>;export const Page=props=><p>{props.label}</p>',
    )
    const html = await renderPagesRenderableToString(
      createPagesPageElement({
        AppComponent: module.App,
        PageComponent: module.Page,
        pageProps: { label: 'page props' },
      }),
    )
    expect(
      new DOMParser().parseFromString(html, 'text/html').querySelector('main')?.textContent,
    ).toBe('page props')
  })
  it('renders a page when no custom App is supplied', async () => {
    const module = await compileServerFixture('export const Page=props=><h1>{props.title}</h1>')
    const html = await renderPagesRenderableToString(
      createPagesPageElement({ PageComponent: module.Page, pageProps: { title: 'standalone' } }),
    )
    expect(html).toContain('standalone')
  })
  it('streams compiled page content through the same writer', async () => {
    const module = await compileServerFixture(
      'export const Page=async()=> <section>streamed</section>',
    )
    const plan = createPagesPageElement({ PageComponent: module.Page, pageProps: {} })
    const stream = await renderPagesRenderableToReadableStream(plan)
    expect(await new Response(stream).text()).toBe(await renderPagesRenderableToString(plan))
  })
  it('executes the router context wrapper around the page plan', async () => {
    const module = await compileServerFixture('export const Page=()=> <p>wrapped</p>')
    const events: string[] = []
    const plan = createPagesPageElement({
      PageComponent: module.Page,
      pageProps: {},
      wrapWithRouterContext: child => async writer => {
        events.push('before')
        await child(writer)
        events.push('after')
      },
    })
    expect(await renderPagesRenderableToString(plan)).toContain('wrapped')
    expect(events).toEqual(['before', 'after'])
  })
  it('propagates asynchronous page failures', async () => {
    const error = new Error('page failed')
    const plan = createPagesPageElement({
      PageComponent: async () => {
        throw error
      },
      pageProps: {},
    })
    await expect(renderPagesRenderableToString(plan)).rejects.toBe(error)
  })
})
