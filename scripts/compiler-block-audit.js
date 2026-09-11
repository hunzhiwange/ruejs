// Measure real compiler output against published capability entries; spread is isolated.
import { transformSync } from '@swc/core'
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { buildRuntimeSizePreset } from './runtime-size-audit.js'
const sources = {
  static: `export const View = () => <div>ready</div>`,
  'reactive-text': `import {signal} from '@rue-js/rue'; export const View = () => { const value = signal('ready'); return <span>{value.get()}</span> }`,
  'dynamic-spread': `import {signal} from '@rue-js/rue'; export const View = () => { const props = signal({title:'ready'}); return <input {...props.get()} /> }`,
  'native-fields': `import {signal} from '@rue-js/rue'; export const View = () => { const value = signal(0); return <section><input value={String(value.get())} checked={Boolean(value.get())}/><svg><circle className={String(value.get())}/></svg></section> }`,
  'form-style': `import {signal} from '@rue-js/rue'; export const View = () => { const state = signal({selection:['b'],style:{color:'red'}}); return <section><select multiple value={state.get().selection}><option value="a">A</option><option value="b">B</option></select><p style={state.get().style}/></section> }`,
  'event-modifiers': `export const View = () => <button v-on:click-stop-prevent={() => { document.body.dataset.clicked = 'yes' }}>click</button>`,
}
const baseline = JSON.parse(
  await readFile('temp/size/compiler-native-dom-task3.json', 'utf8').catch(error => {
    if (error.code === 'ENOENT') return '{}'
    throw error
  }),
)
sources.branch = `import {signal} from '@rue-js/rue'; const active = signal(true); export const View = () => <section>{active.get() ? <b>yes</b> : <i>no</i>}<span>tail</span></section>`
sources.fragment = `import {signal} from '@rue-js/rue'; const active = signal(true); export const View = () => <>{active.get() ? <b>yes</b> : <i>no</i>}<span>tail</span></>`
const report = {}
for (const [name, source] of Object.entries(sources)) {
  const { code } = transformSync(source, {
    filename: 'task4-consumer.tsx',
    jsc: {
      parser: { syntax: 'typescript', tsx: true },
      target: 'es2020',
      experimental: {
        plugins: [[path.resolve('packages/swc-plugin-rue/swc-plugin-rue.wasm'), {}]],
      },
    },
    module: { type: 'es6' },
  })
  const entries = [...new Set([...code.matchAll(/from "([^"]+)"/g)].map(match => match[1]))]
  const result = await buildRuntimeSizePreset({
    name: `task4-${name}`,
    input: entries.map(entry => ({ entry, imports: [] })),
    fixtureSource: code,
    builtin: false,
  })
  const modules = Object.keys(result.sources.moduleRenderSizes)
  const forbidden = modules.filter(module =>
    /compiled-render-anchor|compiled-legacy|js-runtime|js-reactive|portable/.test(module),
  )
  if (forbidden.length)
    throw new Error(`${name}: forbidden runtime modules: ${forbidden.join(', ')}`)
  if (/__rue_compiled_mountable|__rue_compiled_clone|renderAnchor/.test(code))
    throw new Error(`${name}: generic block codegen`)
  report[name] = {
    source,
    code,
    ...result,
    previousGzip: baseline[name]?.gzip ?? null,
    gzipDelta: baseline[name] ? result.gzip - baseline[name].gzip : null,
    targetGzip: name === 'static' ? 1024 : name === 'reactive-text' ? 3072 : null,
  }
  console.log(name, result.gzip, Object.keys(result.sources.moduleRenderSizes).length)
}
await mkdir('temp/size', { recursive: true })
await writeFile('temp/size/compiler-block-task4.json', JSON.stringify(report, null, 2) + '\n')
