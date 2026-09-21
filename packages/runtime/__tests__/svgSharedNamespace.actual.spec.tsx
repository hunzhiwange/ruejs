// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

const SVG_NS = 'http://www.w3.org/2000/svg'
const HTML_NS = 'http://www.w3.org/1999/xhtml'
const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
})

describe('compiled SVG namespace propagation', () => {
  it('propagates SVG context through a component and resets under foreignObject', () => {
    const fixture = mountCompiledFixture(`
      const Shared = () => <a data-kind="component"><title>component</title></a>;
      export const View = () => <svg><a data-kind="direct"><title>direct</title></a><Shared/><foreignObject><a data-kind="html">html</a></foreignObject></svg>;
    `)
    disposals.push(fixture.dispose)
    for (const selector of [
      'svg',
      '[data-kind="direct"]',
      '[data-kind="direct"] title',
      '[data-kind="component"]',
      '[data-kind="component"] title',
    ]) {
      expect(document.querySelector(selector)?.namespaceURI, selector).toBe(SVG_NS)
    }
    expect(document.querySelector('[data-kind="html"]')?.namespaceURI).toBe(HTML_NS)
  })
})
