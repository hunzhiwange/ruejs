// @vitest-environment jsdom

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import * as staticRenderer from '@rue-js/server-renderer/static'

const tempDirs: string[] = []
const tempRoot = path.join(process.cwd(), 'temp')

const createTempDir = async () => {
  await mkdir(tempRoot, { recursive: true })
  const dir = await mkdtemp(path.join(tempRoot, 'rue-static-snapshot-'))
  tempDirs.push(dir)
  return dir
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

describe('@rue-js/server-renderer/static client snapshots', () => {
  it('snapshots a client route from a built template', async () => {
    const root = await createTempDir()
    const outDir = path.join(root, 'client')
    const outputFile = path.join(root, 'snapshots/docs/guide.html')

    await mkdir(path.join(outDir, 'assets'), { recursive: true })
    await writeFile(
      path.join(outDir, 'index.html'),
      `<!doctype html>
<html>
  <head>
    <script type="module" crossorigin src="/assets/app.mjs"></script>
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>`,
    )
    await writeFile(
      path.join(outDir, 'assets/message.json'),
      JSON.stringify({ message: 'Hello static snapshot' }),
    )
    await writeFile(
      path.join(outDir, 'assets/app.mjs'),
      `
const response = await fetch('/assets/message.json')
const data = await response.json()
// Vite's preload helper resolves a root-based asset against the file module URL.
const preloadResponse = await fetch(new URL('/assets/message.json', ${JSON.stringify(pathToFileURL(path.join(outDir, 'assets/app.mjs')).href)}).href)
const preloadData = await preloadResponse.json()
if (preloadData.message !== data.message) throw new Error('Preloaded asset did not match')
await new Promise(resolve => requestIdleCallback(resolve))

document.querySelector('#app').innerHTML = [
  '<main data-route="' + location.pathname + '">',
  '<span>' + data.message + '</span>',
  '<span>' + localStorage.length + '</span>',
  '</main>',
].join('')
`,
    )

    const snapshotClientRoute = staticRenderer.snapshotClientRoute as (options: {
      outDir: string
      route: string
      outputFile: string
      settleMs?: number
      waitMs?: number
    }) => Promise<{ route: string; outputFile: string; html: string }>

    await expect(
      snapshotClientRoute({
        outDir,
        route: '/docs/guide?tab=api#intro',
        outputFile,
        settleMs: 20,
        waitMs: 1000,
      }),
    ).resolves.toMatchObject({
      route: '/docs/guide',
      outputFile,
      html: '<main data-route="/docs/guide"><span>Hello static snapshot</span><span>0</span></main>',
    })

    await expect(readFile(outputFile, 'utf-8')).resolves.toBe(
      '<main data-route="/docs/guide"><span>Hello static snapshot</span><span>0</span></main>',
    )
  })

  it('reports missing client module entries', async () => {
    const root = await createTempDir()
    const outDir = path.join(root, 'client')
    const outputFile = path.join(root, 'snapshot.html')

    await mkdir(outDir, { recursive: true })
    await writeFile(
      path.join(outDir, 'index.html'),
      '<!doctype html><html><body><div id="app"></div></body></html>',
    )

    const snapshotClientRoute = staticRenderer.snapshotClientRoute as (options: {
      outDir: string
      route: string
      outputFile: string
      settleMs?: number
      waitMs?: number
    }) => Promise<unknown>

    await expect(
      snapshotClientRoute({
        outDir,
        route: '/',
        outputFile,
        settleMs: 20,
        waitMs: 100,
      }),
    ).rejects.toThrow('Could not find the client module entry')
  })

  it('cleans up client timers when a snapshot finishes', async () => {
    const root = await createTempDir()
    const outDir = path.join(root, 'client')
    const outputFile = path.join(root, 'snapshot.html')
    const timerState = { fired: false }

    await mkdir(path.join(outDir, 'assets'), { recursive: true })
    await writeFile(
      path.join(outDir, 'index.html'),
      `<!doctype html>
<html>
  <head>
    <script type="module" crossorigin src="/assets/app.mjs"></script>
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>`,
    )
    await writeFile(
      path.join(outDir, 'assets/app.mjs'),
      `
setInterval(() => {
  globalThis.__snapshotTimerState.fired = true
}, 250)
document.querySelector('#app').innerHTML = '<main>ready</main>'
`,
    )

    const snapshotClientRoute = staticRenderer.snapshotClientRoute as (options: {
      outDir: string
      route: string
      outputFile: string
      extraGlobals?: Record<string, unknown>
      settleMs?: number
      waitMs?: number
    }) => Promise<unknown>

    await snapshotClientRoute({
      outDir,
      route: '/',
      outputFile,
      extraGlobals: { __snapshotTimerState: timerState },
      settleMs: 20,
      waitMs: 1000,
    })

    await new Promise(resolve => setTimeout(resolve, 300))
    expect(timerState.fired).toBe(false)
  })

  it('snapshots routes whose content keeps changing', async () => {
    const root = await createTempDir()
    const outDir = path.join(root, 'client')
    const outputFile = path.join(root, 'snapshot.html')

    await mkdir(path.join(outDir, 'assets'), { recursive: true })
    await writeFile(
      path.join(outDir, 'index.html'),
      `<!doctype html>
<html>
  <head>
    <script type="module" crossorigin src="/assets/app.mjs"></script>
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>`,
    )
    await writeFile(
      path.join(outDir, 'assets/app.mjs'),
      `
let value = 0
const app = document.querySelector('#app')
const render = () => {
  app.innerHTML = '<main>value-' + value++ + '</main>'
}
render()
setInterval(render, 10)
`,
    )

    const snapshotClientRoute = staticRenderer.snapshotClientRoute as (options: {
      outDir: string
      route: string
      outputFile: string
      settleMs?: number
      waitMs?: number
    }) => Promise<{ html: string }>

    await expect(
      snapshotClientRoute({
        outDir,
        route: '/',
        outputFile,
        settleMs: 50,
        waitMs: 500,
      }),
    ).resolves.toMatchObject({ html: expect.stringMatching(/^<main>value-\d+<\/main>$/) })
  })
})
