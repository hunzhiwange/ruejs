import { afterEach, expect, it } from 'vitest'
import { evaluateComponent } from './compiled-component-test-utils'
import { setReactiveScheduling } from '../src/runtime-core/compiled'

afterEach(() => {
  document.body.innerHTML = ''
  setReactiveScheduling('frame')
})
it('Template compiles to a transparent range with precise updates and no runtime component', () => {
  setReactiveScheduling('sync')
  const { code, exports: app } = evaluateComponent(
    `import { Template, signal } from '@rue-js/rue'; export const label = signal('A'); export const View = () => <Template><strong>{label.get()}</strong><i>B</i></Template>;`,
  )
  expect(code).not.toContain('internal/builtin')
  const root = app.View()
  root.__rue_compiled_mount(document.body)
  const strong = document.querySelector('strong')
  expect(document.body.children).toHaveLength(2)
  app.label.set('updated')
  expect(document.querySelector('strong')).toBe(strong)
  expect(document.body.textContent).toBe('updatedB')
  root.dispose()
  expect(document.body.childNodes).toHaveLength(0)
})
