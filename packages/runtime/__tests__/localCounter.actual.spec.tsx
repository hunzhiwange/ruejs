// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { afterEach, expect, it } from 'vitest'
import { mountCompiledFixture } from './compiled-component-test-utils'

afterEach(() => {
  document.body.innerHTML = ''
})

it('compiles and updates the actual LocalCounter demo source', () => {
  const source = readFileSync('app/pages/examples/home-demos/LocalCounterDemo.tsx', 'utf8')
  const mounted = mountCompiledFixture(source, {
    exportName: 'default',
    filename: 'app/pages/examples/home-demos/LocalCounterDemo.tsx',
  })
  try {
    expect(document.body.textContent).toContain('本地 ref 计数器')
    expect(document.body.textContent).toContain('5')
    const buttons = Array.from(document.querySelectorAll('button'))
    buttons.find(button => button.textContent?.trim() === '+1')!.click()
    expect(document.body.textContent).toContain('6')
    buttons.find(button => button.textContent?.trim() === '重置')!.click()
    expect(document.body.textContent).toContain('0')
  } finally {
    mounted.dispose()
  }
})
