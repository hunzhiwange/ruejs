import { afterEach, expect, it } from 'vitest'
import { evaluateComponent } from './compiled-component-test-utils'
import { setReactiveScheduling } from '../src/runtime-core/compiled'

afterEach(() => {
  document.body.innerHTML = ''
  setReactiveScheduling('frame')
})
it('compiled Teleport moves the same range, disables, defers and disposes it', async () => {
  setReactiveScheduling('sync')
  document.body.innerHTML = '<main></main><aside id="a"></aside><aside id="b"></aside>'
  const { exports: app } = evaluateComponent(`
    import { Teleport, signal } from '@rue-js/rue';
    export const target = signal('#a'); export const disabled = signal(false); export const defer = signal(false);
    export const View = () => <Teleport to={target.get()} disabled={disabled.get()} defer={defer.get()}><input value="initial"/><b>owned</b></Teleport>;
  `)
  const root = app.View()
  root.__rue_compiled_mount(document.querySelector('main'))
  const input = document.querySelector('#a input') as HTMLInputElement
  expect(input).not.toBeNull()
  input.value = 'edited'
  app.target.set('#b')
  expect(document.querySelector('#b input')).toBe(input)
  expect(input.value).toBe('edited')
  app.disabled.set(true)
  expect(document.querySelector('main input')).toBe(input)
  app.defer.set(true)
  app.disabled.set(false)
  app.target.set('#a')
  app.target.set('#b')
  await Promise.resolve()
  expect(document.querySelector('#a')!.textContent).toBe('')
  expect(document.querySelector('#b input')).toBe(input)
  root.dispose()
  expect(document.querySelectorAll('input')).toHaveLength(0)
  app.target.set('#a')
  await Promise.resolve()
  expect(document.querySelectorAll('input')).toHaveLength(0)
})
