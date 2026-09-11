import { expect, it } from 'vitest'
import { evaluateComponent } from './compiled-component-test-utils'

it('compiled Suspense mounts and disposes the complete resolved child range', () => {
  const { exports: app } = evaluateComponent(
    `import { Suspense } from '@rue-js/rue'; export const View = () => <Suspense><b>content</b><i>tail</i></Suspense>;`,
  )
  const host = document.createElement('main')
  const root = app.View()
  root.__rue_compiled_mount(host)
  expect(host.textContent).toBe('contenttail')
  root.dispose()
  expect(host.childNodes).toHaveLength(0)
})
