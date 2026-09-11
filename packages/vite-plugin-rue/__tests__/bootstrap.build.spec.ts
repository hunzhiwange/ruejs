// @vitest-environment jsdom
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { afterEach, expect, it } from 'vitest'
import { build } from 'vite'
import VitePluginRue, { compileRueStatic } from '../index.mjs'
import { entries } from '../../../scripts/aliases.js'

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
  document.body.innerHTML = ''
})
async function fixture(
  source: string,
  plugin: boolean | Record<string, unknown> = true,
  extension = 'tsx',
  files: Record<string, string> = {},
  published = false,
) {
  const base = path.resolve('temp/task10-fixtures')
  await mkdir(base, { recursive: true })
  const root = await mkdtemp(path.join(base, 'build-'))
  roots.push(root)
  await writeFile(path.join(root, `entry.${extension}`), source)
  await Promise.all(
    Object.entries(files).map(([name, code]) => writeFile(path.join(root, name), code)),
  )
  const result: any = await build({
    configFile: false,
    root,
    logLevel: 'silent',
    plugins: plugin
      ? [
          VitePluginRue({
            transformTimeoutMs: 60000,
            ...(typeof plugin === 'object' ? plugin : {}),
          }),
        ]
      : [],
    resolve: {
      alias: published
        ? []
        : [
            {
              find: /^@rue-js\/rue\/jsx-runtime$/,
              replacement: path.resolve('packages/rue/src/jsx-runtime.ts'),
            },
            {
              find: /^@rue-js\/rue\/jsx-dev-runtime$/,
              replacement: path.resolve('packages/rue/src/jsx-dev-runtime.ts'),
            },
            ...entries,
          ],
      conditions: published ? ['production', 'browser'] : ['development', 'browser'],
    },
    oxc: { jsx: { runtime: 'automatic', importSource: '@rue-js/rue', development: false } },
    define: { __DEV__: 'false', __TEST__: 'false', __VERSION__: '"test"' },
    build: {
      write: false,
      minify: true,
      target: 'es2022',
      lib: { entry: path.join(root, `entry.${extension}`), formats: ['es'] },
    },
  })
  const chunks = (Array.isArray(result) ? result[0] : result).output.filter(
    (c: any) => c.type === 'chunk',
  )
  expect(chunks).toHaveLength(1)
  return chunks[0]
}

it('compiles and runs the production mount factory with disposal and a minimal module graph', async () => {
  const source = `import { render, signal } from '@rue-js/rue';
    const count = signal(0);
    const App = () => <button onClick={() => count.set(count.get() + 1)}>{count.get()}</button>;
    globalThis.task10 = render(<App />, '#app');`
  const generated = await compileRueStatic(source, { id: '/entry.tsx', production: true })
  expect(generated).toContain('_$mountApp(')
  expect(generated).toContain('@rue-js/rue/internal/app')
  const chunk = await fixture(source)
  expect(Object.keys(chunk.modules).join('\n')).not.toMatch(
    /js-runtime|js-reactive\/facade|compiled-legacy-dom|\/island\.|\/server\./,
  )
  expect(gzipSync(chunk.code).length).toBeLessThanOrEqual(10240)
  document.body.innerHTML = '<div id="app"></div>'
  new Function(chunk.code)()
  const button = document.querySelector('button')!
  expect(button.textContent).toBe('0')
  button.click()
  await Promise.resolve()
  await expect.poll(() => button.textContent).toBe('1')
  ;(globalThis as any).task10.dispose()
  ;(globalThis as any).task10.dispose()
  expect(document.querySelector('#app')!.childNodes).toHaveLength(0)
  delete (globalThis as any).task10
  await mkdir('temp/size', { recursive: true })
  await writeFile(
    'temp/size/compiler-bootstrap-task10.json',
    JSON.stringify(
      {
        generated,
        bytes: chunk.code.length,
        gzip: gzipSync(chunk.code).length,
        modules: Object.keys(chunk.modules),
      },
      null,
      2,
    ),
  )
}, 60000)

it.each([
  [
    'runtime JSX',
    `import { jsx } from '@rue-js/rue/jsx-runtime'; globalThis.node = jsx('div', {});`,
    true,
  ],
  [
    'arbitrary render',
    `import { render } from '@rue-js/rue'; render(globalThis.unknown, '#app');`,
    true,
  ],
  ['uncompiled automatic JSX', `export const UncompiledView = () => <main />;`, false],
  ['missing plugin', `import { render } from '@rue-js/rue'; render(<div />, '#app');`, false],
] as const)(
  'rejects %s in a real production build',
  async (_name, source, plugin) => {
    await expect(fixture(source, plugin)).rejects.toThrow(/compiler|not exported|MISSING_EXPORT/i)
  },
  60000,
)

it('snapshots the generated bootstrap entry', async () => {
  expect(
    await compileRueStatic(
      "import { render } from '@rue-js/rue'; render(<main>ready</main>, '#app');",
      { id: '/bootstrap.tsx', production: true },
    ),
  ).toMatchSnapshot()
})

it('compiles a TS entry importing a TSX component and can remount after disposal', async () => {
  const chunk = await fixture(
    `import { createRue as boot } from /* startup */ '@rue-js/rue'; import App from './App'; const identity = <T>(value: T) => value; globalThis.task10app = identity(boot(App));`,
    true,
    'ts',
    {
      'App.tsx': `export default function App() { return <main>imported</main> }`,
    },
  )
  document.body.innerHTML = '<div id="app"></div>'
  new Function(chunk.code)()
  const app = (globalThis as any).task10app
  const first = app.mount('#app')
  expect(document.querySelector('main')?.textContent).toBe('imported')
  expect(() => app.mount('#app')).toThrow(/already mounted/)
  app.unmount()
  const second = app.mount('#app')
  first.dispose()
  expect(() => app.mount('#app')).toThrow(/already mounted/)
  second.dispose()
  expect(document.querySelector('#app')!.childNodes).toHaveLength(0)
  delete (globalThis as any).task10app
}, 60000)

it('releases the container and owned effects after a failed setup', async () => {
  const chunk = await fixture(`import { createRue } from '@rue-js/rue';
    const App = () => { if (globalThis.task10fail) throw new Error('setup failed'); return <main>recovered</main> };
    globalThis.task10app = createRue(App);`)
  new Function(chunk.code)()
  const app = (globalThis as any).task10app
  document.body.innerHTML = '<div id="app"></div>'
  expect(() => app.mount('#missing')).toThrow(/not found/)
  ;(globalThis as any).task10fail = true
  expect(() => app.mount('#app')).toThrow(/setup failed/)
  ;(globalThis as any).task10fail = false
  app.mount('#app')
  expect(document.querySelector('main')?.textContent).toBe('recovered')
  app.dispose()
  delete (globalThis as any).task10app
  delete (globalThis as any).task10fail
}, 60000)

it.each([
  ['excluded file', {}, { exclude: ['entry.tsx'] }],
  ['forged transform header', { header: '/* RUE_TRANSFORMED */\n' }, {}],
])(
  'rejects JSX in a %s',
  async (_name, sourceOptions, pluginOptions) => {
    const source = `${(sourceOptions as any).header ?? ''}globalThis.uncompiled = <main />;`
    await expect(fixture(source, pluginOptions)).rejects.toThrow(/compiler-only JSX contract/)
  },
  60000,
)

it('does not rewrite a shadowed startup import', async () => {
  const source = `import { render } from '@rue-js/rue';
    function local(render) { return render(42) }
    globalThis.task10shadow = local(value => value + 1);
    globalThis.task10 = render(<main />, '#app');`
  const chunk = await fixture(source)
  document.body.innerHTML = '<div id="app"></div>'
  new Function(chunk.code)()
  expect((globalThis as any).task10shadow).toBe(43)
  ;(globalThis as any).task10.dispose()
  delete (globalThis as any).task10shadow
  delete (globalThis as any).task10
}, 60000)

it('consumes published package exports in a real Vite production build', async () => {
  const chunk = await fixture(
    `import { mount } from '@rue-js/rue';
    const App = () => <main>published</main>; globalThis.task10 = mount(App, '#app');`,
    true,
    'tsx',
    {},
    true,
  )
  const modules = Object.keys(chunk.modules)
  expect(modules.some(id => id.includes('/runtime/dist/compiler-runtime/app.js'))).toBe(true)
  expect(modules.join('\n')).not.toMatch(
    /js-runtime|js-reactive\/facade|compiled-legacy-dom|\/island\.|\/builtins\//,
  )
  expect(gzipSync(chunk.code).length).toBeLessThanOrEqual(10240)
  document.body.innerHTML = '<div id="app"></div>'
  new Function(chunk.code)()
  expect(document.querySelector('main')?.textContent).toBe('published')
  ;(globalThis as any).task10.dispose()
  expect(document.querySelector('#app')!.childNodes).toHaveLength(0)
  delete (globalThis as any).task10
}, 60000)

it.each([
  [
    `import { render as draw } from '@rue-js/rue'; draw(globalThis.value, '#app');`,
    /render expects JSX/,
  ],
  [`import { createRue } from '@rue-js/rue'; createRue(globalThis.App);`, /component identifier/],
  [
    `import { createRue } from '@rue-js/rue'; const App = {}; createRue(App);`,
    /compiler-proven component/,
  ],
  [
    `import * as Rue from '@rue-js/rue'; Rue.render(globalThis.value, '#app');`,
    /named Rue imports/,
  ],
  [`import { render } from '@rue-js/rue'; globalThis.render = render;`, /called directly/],
])('reports an actionable source diagnostic', async (source, message) => {
  await expect(compileRueStatic(source, { id: '/bad-entry.tsx' })).rejects.toThrow(message)
})

it('accepts parenthesized JSX and type-only references to startup macros', async () => {
  const code = await compileRueStatic(
    `import { render } from '@rue-js/rue';
    type Render = typeof render; render((<main />), '#app');`,
    { id: '/typed-entry.tsx' },
  )
  expect(code).toContain('_$mountApp(')
})

it('honors disposal requested by an onMounted callback', async () => {
  const chunk = await fixture(`import { createRue, onMounted } from '@rue-js/rue';
    const App = () => { onMounted(() => globalThis.task10app.dispose()); return <main /> };
    globalThis.task10app = createRue(App);`)
  document.body.innerHTML = '<div id="app"></div>'
  new Function(chunk.code)()
  const app = (globalThis as any).task10app
  app.mount('#app')
  expect(document.querySelector('#app')!.childNodes).toHaveLength(0)
  app.mount('#app')
  expect(document.querySelector('#app')!.childNodes).toHaveLength(0)
  delete (globalThis as any).task10app
}, 60000)
