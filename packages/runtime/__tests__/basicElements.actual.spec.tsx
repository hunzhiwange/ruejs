// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
})

describe('compiled basic elements', () => {
  it('mounts nested and self-closing native elements and removes them on dispose', () => {
    const fixture = mountCompiledFixture(
      `export const View = () => <main><div>div <span>nested</span></div><img alt="placeholder"/><input placeholder="self-closing input"/></main>;`,
    )
    disposals.push(fixture.dispose)
    expect(document.querySelector('main')?.textContent).toBe('div nested')
    expect(document.querySelector('img')?.getAttribute('alt')).toBe('placeholder')
    expect(document.querySelector('input')?.placeholder).toBe('self-closing input')
    fixture.dispose()
    expect(document.body.childNodes).toHaveLength(0)
  })
})
