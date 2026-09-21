// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { afterEach, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

afterEach(() => {
  document.body.innerHTML = ''
})

it('compiles the actual LocalTodoList source and preserves keyed rows while updating', () => {
  const source = readFileSync('app/pages/examples/home-demos/LocalTodoListDemo.tsx', 'utf8')
  const mounted = mountCompiledFixture(source, {
    exportName: 'default',
    filename: 'app/pages/examples/home-demos/LocalTodoListDemo.tsx',
  })
  try {
    expect(document.body.textContent).toContain('总计: 3 | 已完成: 1')
    const preserved = Array.from(document.querySelectorAll('span')).find(
      node => node.textContent?.trim() === '编写示例代码',
    )!
    const input = document.querySelector('input')!
    input.value = '本地新增任务'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    Array.from(document.querySelectorAll('button'))
      .find(button => button.textContent?.trim() === '添加')!
      .click()
    expect(document.body.textContent).toContain('本地新增任务')
    expect(document.body.textContent).toContain('总计: 4 | 已完成: 1')
    expect(
      Array.from(document.querySelectorAll('span')).find(
        node => node.textContent?.trim() === '编写示例代码',
      ),
    ).toBe(preserved)
  } finally {
    mounted.dispose()
  }
})
