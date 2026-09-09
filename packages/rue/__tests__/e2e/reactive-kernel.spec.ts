import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { chromium, type Browser } from 'playwright-core'

let browser: Browser
beforeAll(async () => {
  const executablePath = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].find(path => path && existsSync(path))
  if (!executablePath) throw new Error('Set CHROME_PATH to a local Chromium executable')
  browser = await chromium.launch({ executablePath, headless: true })
})
afterAll(async () => {
  await browser?.close()
})

it('updates nested and array paths in Chromium using the built public runtime', async () => {
  const page = await browser.newPage()
  try {
    await page.setContent('<button>increment</button><output></output>')
    await page.addScriptTag({ path: resolve('packages/rue/dist/rue.global.js') })
    await page.evaluate(() => {
      const runtime = (globalThis as any).rue
      runtime.setReactiveScheduling('sync')
      const state = runtime.signal({ user: { count: 0 }, rows: [{ value: 0 }], stable: 7 })
      let siblingRuns = 0
      const sibling = runtime.effect(() => {
        state.getPath(['stable'])
        siblingRuns++
      })
      const view = runtime.effect(() => {
        document.querySelector('output')!.textContent =
          `${state.getPath(['user', 'count'])}:${state.getPath(['rows', 0, 'value'])}`
      })
      document.querySelector('button')!.addEventListener('click', () => {
        runtime.batch(() => {
          state.setPath(['user', 'count'], state.getPath(['user', 'count']) + 1)
          state.setPath(['rows', 0, 'value'], state.getPath(['rows', 0, 'value']) + 2)
        })
      })
      ;(globalThis as any).testState = {
        get siblingRuns() {
          return siblingRuns
        },
        dispose() {
          view.dispose()
          sibling.dispose()
          state.dispose()
        },
      }
    })
    for (let count = 1; count <= 3; count++) {
      await page.locator('button').click()
      expect(await page.locator('output').textContent()).toBe(`${count}:${count * 2}`)
    }
    expect(await page.evaluate(() => (globalThis as any).testState.siblingRuns)).toBe(1)
    await page.evaluate(() => (globalThis as any).testState.dispose())
    await page.locator('button').click()
    expect(await page.locator('output').textContent()).toBe('3:6')
  } finally {
    await page.close()
  }
})

it('omits removed Proxy APIs from the real browser bundle', async () => {
  const page = await browser.newPage()
  try {
    await page.addScriptTag({ path: resolve('packages/rue/dist/rue.global.js') })
    expect(
      await page.evaluate(() => {
        const runtime = (globalThis as any).rue
        return [
          'reactive',
          'readonly',
          'shallowReactive',
          'shallowReadonly',
          'propsReactive',
          'toRaw',
          'toRef',
          'toRefs',
          'isProxy',
        ].filter(name => name in runtime)
      }),
    ).toEqual([])
  } finally {
    await page.close()
  }
})
