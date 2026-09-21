// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { afterEach, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

afterEach(() => {
  document.body.innerHTML = ''
})

it('compiles and updates the actual BasicTodoList demo source', () => {
  const source = readFileSync('app/pages/examples/home-demos/BasicTodoListDemo.tsx', 'utf8')
  const mounted = mountCompiledFixture(source, {
    exportName: 'default',
    filename: 'app/pages/examples/home-demos/BasicTodoListDemo.tsx',
  })
  try {
    expect(document.body.textContent).toContain('总计: 3 | 已完成: 1')
    const input = document.querySelector('input')!
    input.value = '新的待办事项'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    document.querySelector('button')!.click()
    expect(document.body.textContent).toContain('新的待办事项')
    expect(document.body.textContent).toContain('总计: 4 | 已完成: 1')
  } finally {
    mounted.dispose()
  }
})
