// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

const SVG_NS = 'http://www.w3.org/2000/svg'
const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
})

describe('compiled SVG graph', () => {
  it('renders SVG geometry and updates reactive coordinates', () => {
    const fixture = mountCompiledFixture(`
      import { signal } from '@rue-js/rue';
      export const points = signal('0,10 10,0 20,10');
      export const View = () => <svg viewBox="0 0 20 20"><polygon points={points.get()} fill="tomato"/><text x="2" y="18">graph</text></svg>;
    `)
    disposals.push(fixture.dispose)
    const svg = document.querySelector('svg')!
    const polygon = document.querySelector('polygon')!
    expect({
      svg: svg.namespaceURI,
      polygon: polygon.namespaceURI,
      points: polygon.getAttribute('points'),
    }).toEqual({ svg: SVG_NS, polygon: SVG_NS, points: '0,10 10,0 20,10' })
    fixture.exports.points.set('0,20 10,5 20,20')
    expect(polygon.getAttribute('points')).toBe('0,20 10,5 20,20')
  })
})
