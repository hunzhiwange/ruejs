// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { afterEach, expect, it } from 'vitest'
import { evaluateComponent } from './compiled-component-test-utils'
import { _$createComponent } from '../src/compiled-component-call'
import { setReactiveScheduling } from '../src/runtime-core/compiled'

const disposals: (() => void)[] = []
afterEach(() => {
  disposals.splice(0).forEach(dispose => dispose())
  document.body.innerHTML = ''
  setReactiveScheduling('frame')
})

it('renders the layout example with named JSX props and nested children', () => {
  const source = readFileSync('app/pages/examples/home-demos/LayoutChildrenDemo.tsx', 'utf8')
  const { exports: app } = evaluateComponent(source)
  const root = _$createComponent(app.default, {})
  disposals.push(() => root.dispose())
  root.__rue_compiled_mount(document.body)

  expect(document.querySelector('.layout-header > div')?.textContent).toBe('自定义 Header')
  expect(document.querySelector('.layout-footer > div')?.textContent).toBe('自定义 Footer')
  expect(document.querySelectorAll('.layout-content')[0].querySelectorAll('p')).toHaveLength(2)
  const content = document.querySelectorAll('.layout-content')[1]
  expect(content.textContent).toContain('123456')
  expect(content.querySelectorAll('span')).toHaveLength(2)
  expect(document.body.textContent).not.toContain('[object Object]')
})

it.each(['props.content', 'content', "props.content ?? ''", 'props.visible && props.content'])(
  'updates named renderable props through nodes, fragments, text and empty values (%s)',
  expression => {
    setReactiveScheduling('sync')
    const parameter = expression === 'content' ? '{ content }' : 'props'
    const { exports: app } = evaluateComponent(`
      import { useState } from '@rue-js/rue';
      export const actions = {};
      const Layout = (${parameter}) => <section>{${expression}}</section>;
      export const View = () => {
        const [mode, setMode] = useState(0);
        actions.change = setMode;
        return <Layout visible={true} content={mode === 0 ? <b>Header</b> : mode === 1
          ? <><i>First</i><i>Second</i></> : mode === 2 ? 'plain' : null} />;
      };
    `)
    const root = _$createComponent(app.View, {})
    disposals.push(() => root.dispose())
    root.__rue_compiled_mount(document.body)
    const section = document.querySelector('section')!
    expect(section.querySelector('b')?.textContent).toBe('Header')
    app.actions.change(1)
    expect(section.querySelectorAll('i')).toHaveLength(2)
    expect(section.textContent).toBe('FirstSecond')
    expect(section.querySelector('b')).toBeNull()
    app.actions.change(2)
    expect(section.textContent).toBe('plain')
    expect(section.children).toHaveLength(0)
    app.actions.change(3)
    expect(section.textContent).toBe('')
    app.actions.change(0)
    expect(section.querySelector('b')?.textContent).toBe('Header')
  },
)
