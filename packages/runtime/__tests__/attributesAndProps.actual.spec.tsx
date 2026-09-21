// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
})

describe('compiled attributes and props', () => {
  it('renders id, className, style, boolean properties, and component props', () => {
    const fixture = mountCompiledFixture(`
      const Badge = props => <span className="badge" style={{ backgroundColor: props.color }}>{props.label}</span>;
      export const View = () => <section id="box" className="border"><input disabled value="fixed"/><div style={{ color: 'tomato', fontWeight: 'bold' }}>styled</div><Badge label="custom" color="#ccddee"/></section>;
    `)
    disposals.push(fixture.dispose)
    const box = document.querySelector<HTMLElement>('#box')!
    const input = box.querySelector<HTMLInputElement>('input')!
    const styled = box.querySelector<HTMLElement>('div')!
    const badge = box.querySelector<HTMLElement>('.badge')!
    expect(box.className).toBe('border')
    expect({ disabled: input.disabled, value: input.value }).toEqual({
      disabled: true,
      value: 'fixed',
    })
    expect({ color: styled.style.color, weight: styled.style.fontWeight }).toEqual({
      color: 'tomato',
      weight: 'bold',
    })
    expect({ text: badge.textContent, color: badge.style.backgroundColor }).toEqual({
      text: 'custom',
      color: 'rgb(204, 221, 238)',
    })
  })
})
