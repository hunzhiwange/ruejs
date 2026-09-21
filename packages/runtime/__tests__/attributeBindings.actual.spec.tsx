// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
})

describe('compiled attribute bindings', () => {
  it('updates title, class, and inline style bindings', () => {
    const fixture = mountCompiledFixture(`
      import { signal } from '@rue-js/rue';
      export const active = signal(true);
      export const color = signal('green');
      export const View = () => <p title={active.get() ? 'ready' : null} className={active.get() ? 'active' : ''} style={{ color: color.get() }}>bound</p>;
    `)
    disposals.push(fixture.dispose)
    const paragraph = document.querySelector('p')!
    expect({
      title: paragraph.title,
      className: paragraph.className,
      color: paragraph.style.color,
    }).toEqual({
      title: 'ready',
      className: 'active',
      color: 'green',
    })
    fixture.exports.active.set(false)
    fixture.exports.color.set('blue')
    expect({
      title: paragraph.getAttribute('title'),
      className: paragraph.className,
      color: paragraph.style.color,
    }).toEqual({
      title: null,
      className: '',
      color: 'blue',
    })
  })
})
