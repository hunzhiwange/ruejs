// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { afterEach, expect, it } from 'vitest'
import { evaluateComponent } from './compiled-component-test-utils'
import { _$createComponent } from '../src/compiled-component-call'
import { CUSTOM_ELEMENT_EMIT_BRIDGE_KEY } from '../src/custom-elements.shared'
import { setReactiveScheduling } from '../src/runtime-core/compiled'

afterEach(() => {
  document.body.innerHTML = ''
  setReactiveScheduling('frame')
})

it('runs the actual ComponentEmit demo through closed capability imports', () => {
  setReactiveScheduling('sync')
  const { code, exports: app } = evaluateComponent(
    readFileSync('app/pages/examples/home-demos/ComponentEmitDemo.tsx', 'utf8'),
    'ComponentEmitDemo.tsx',
  )
  expect(code).not.toMatch(/renderAnchor|MarkComponentRenderReactive/)
  const root = _$createComponent(app.default, {})
  try {
    root.__rue_compiled_mount(document.body)
    document.querySelector('button')!.click()
    expect(document.body.textContent).toContain('已保存的是数据是123456')
    const inputs = document.querySelectorAll('input')
    inputs[0].value = 'Rue'
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }))
    expect(document.body.textContent).toContain('输入的名称：Rue')
    inputs[1].focus()
    for (const value of ['R', 'Ru', 'Rue']) {
      inputs[1].value = value
      inputs[1].setSelectionRange(value.length, value.length)
      inputs[1].dispatchEvent(new Event('input', { bubbles: true }))
      expect(document.querySelectorAll('input')[1]).toBe(inputs[1])
      expect(document.activeElement).toBe(inputs[1])
      expect(inputs[1].selectionStart).toBe(value.length)
      expect(document.body.textContent).toContain(`v-model 名称：${value}`)
    }
  } finally {
    root.dispose()
  }
})

it('emit reads a replaced callback from current props', () => {
  setReactiveScheduling('sync')
  const { exports: app } = evaluateComponent(`
    import {signal,useEmit as createEmitter} from '@rue-js/rue';
    export const messages=[];
    export const handler=signal(value=>messages.push('one:'+value));
    const Child=props=>{const emit=createEmitter(props);return <button onClick={()=>emit('update:model-value', 'ok')}>emit</button>};
    export const View=()=> <Child onUpdateModelValue={handler.get()}/>;
  `)
  const root = _$createComponent(app.View, {})
  try {
    root.__rue_compiled_mount(document.body)
    document.querySelector('button')!.click()
    app.handler.set((value: string) => app.messages.push('two:' + value))
    document.querySelector('button')!.click()
    expect(app.messages).toEqual(['one:ok', 'two:ok'])
  } finally {
    root.dispose()
    app.handler.dispose()
  }
})

it('emit falls back to the custom element bridge when no callback prop exists', () => {
  setReactiveScheduling('sync')
  const { exports: app } = evaluateComponent(`
    import {useEmit} from '@rue-js/rue';
    export const View=props=>{const emit=useEmit(props);return <button onClick={()=>emit('shadow-save', {id: 7})}>emit</button>};
  `)
  const events: Array<{ name: string; args: unknown[] }> = []
  const root = _$createComponent(app.View, {
    [CUSTOM_ELEMENT_EMIT_BRIDGE_KEY]: (name: string, args: unknown[]) =>
      events.push({ name, args }),
  })
  try {
    root.__rue_compiled_mount(document.body)
    document.querySelector('button')!.click()
    expect(events).toEqual([{ name: 'shadow-save', args: [{ id: 7 }] }])
  } finally {
    root.dispose()
  }
})
