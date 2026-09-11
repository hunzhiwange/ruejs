// @vitest-environment jsdom
import { expect, it } from 'vitest'
import {
  appendChild,
  createElement,
  insertBefore,
  removeChild,
  template,
  withDOMHostOperations,
} from '../src/compiler-runtime/dom.browser'
import { adoptHydratedNode } from '../src/compiler-runtime/dom.hydrate'
import { compileNodePlan } from './node-plan-test-utils'

it('keeps the browser DOM ABI on native HTML, SVG, template, and mutation behavior', () => {
  const host = document.createElement('main')
  const tail = document.createTextNode('tail')
  appendChild(host, tail)

  withDOMHostOperations(host, () => {
    const section = createElement('section')
    const svg = createElement('svg')
    const circle = createElement('circle', svg)
    appendChild(svg, circle)
    insertBefore(host, section, tail)
    insertBefore(host, svg, tail)

    const getTemplate = template('<strong>cloned</strong>')
    const first = getTemplate().content.cloneNode(true)
    const second = getTemplate().content.cloneNode(true)
    expect(first).not.toBe(second)
    appendChild(section, first)
    removeChild(host, svg)
  })

  expect(host.innerHTML).toBe('<section><strong>cloned</strong></section>tail')
})

it('keeps hydration independent from the generic DOM host and server closure', async () => {
  const source = 'export const View = () => <main><span>fresh</span></main>'
  const server = compileNodePlan(source, 'server')
  const client = compileNodePlan(source, 'hydrate')
  const host = document.createElement('div')
  host.innerHTML = await server.renderToString(server.View)
  const node = host.querySelector('span')
  const root = client.hydrateRoot(host, client.View)
  expect(host.querySelector('span')).toBe(node)
  expect(server.code).not.toContain('@rue-js/rue/internal/dom')
  expect(server.modules.join('\n')).not.toMatch(/compiler-runtime\/(?:dom|hydrate)/)
  expect(client.code).toContain('@rue-js/rue/internal/hydrate')
  expect(client.code).not.toContain('@rue-js/rue/internal/dom')
  expect(client.modules.join('\n')).not.toMatch(
    /dom-host-operations|dom\.hydrate|\/dom\.ts|js-runtime/,
  )
  root.unmount()
})

it('adopts nested matching nodes while synchronizing properties, children, and replacements', () => {
  const serverRoot = document.createElement('section')
  serverRoot.innerHTML = '<button class="server"><span>server</span><em>remove</em></button>'
  const serverButton = serverRoot.querySelector('button')!
  const serverSpan = serverRoot.querySelector('span')!
  const clientRoot = document.createElement('section')
  clientRoot.innerHTML =
    '<button class="client" disabled><span>client</span><strong>replace</strong></button>'
  const clientButton = clientRoot.querySelector('button')!
  const clientStrong = clientRoot.querySelector('strong')!
  ;(clientButton as HTMLButtonElement).value = 'saved'

  expect(adoptHydratedNode(serverRoot, clientRoot)).toBe(true)

  expect(serverRoot.querySelector('button')).toBe(serverButton)
  expect(serverRoot.querySelector('span')).toBe(serverSpan)
  expect(serverButton.className).toBe('client')
  expect((serverButton as HTMLButtonElement).disabled).toBe(true)
  expect((serverButton as HTMLButtonElement).value).toBe('saved')
  expect(serverSpan.textContent).toBe('client')
  expect(serverButton.querySelector('strong')).toBe(clientStrong)
  expect(serverButton.querySelector('em')).toBeNull()
})
