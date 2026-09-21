// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { compileComponent, mountCompiledFixture } from './compiled-component-test-utils'

const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
})

describe('compiled state path codegen', () => {
  const source = `
    import { useState } from '@rue-js/rue';
    export let replace;
    export const hits = { name: 0, age: 0 };
    const counted = (key, value) => ({ toString() { hits[key]++; return value; } });
    export function View() { const [state, setState] = useState({ user: { name: counted('name', 'one'), age: counted('age', '1') } }); replace = setState; return <div><span>{state.user?.name}</span><b>{state.user.age}</b></div>; }
  `

  it('emits path reads and keeps an unchanged sibling DOM subscription cold', () => {
    const output = compileComponent(source)
    expect(output).toContain('_$compiledReadPath')
    expect(output).not.toContain('.get().user')
    expect(output).not.toContain('new Proxy')
    const fixture = mountCompiledFixture(source)
    disposals.push(fixture.dispose)
    expect(document.body.textContent).toBe('one1')
    const before = { ...fixture.exports.hits }
    fixture.exports.replace((previous: { user: Record<string, unknown> }) => ({
      ...previous,
      user: {
        ...previous.user,
        age: {
          toString() {
            fixture.exports.hits.age++
            return '2'
          },
        },
      },
    }))
    expect(document.body.textContent).toBe('one2')
    expect(fixture.exports.hits.name).toBe(before.name)
    expect(fixture.exports.hits.age).toBe(before.age + 1)
  })
})
