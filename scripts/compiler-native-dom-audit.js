// Measure real compiler output against published capability entries; spread is isolated.
import { transformSync } from '@swc/core'
import { writeFile, mkdir } from 'node:fs/promises'
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
const report = {}
for (const [name, source] of Object.entries(sources)) {
  const { code } = transformSync(source, {
    filename: 'task3-consumer.tsx',
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
    name: `task3-${name}`,
    input: entries.map(entry => ({ entry, imports: [] })),
    fixtureSource: code,
    builtin: false,
  })
  report[name] = {
    source,
    code,
    ...result,
    targetGzip: name === 'static' ? 1024 : name === 'reactive-text' ? 3072 : null,
  }
  console.log(name, result.gzip, Object.keys(result.sources.moduleRenderSizes).length)
}
await mkdir('temp/size', { recursive: true })
await writeFile('temp/size/compiler-native-dom-task3.json', JSON.stringify(report, null, 2) + '\n')
