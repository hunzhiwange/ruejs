import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'

function workspaceRoot() {
  let directory = process.cwd()
  while (!existsSync(join(directory, 'pnpm-workspace.yaml'))) {
    const parent = dirname(directory)
    if (parent === directory) throw new Error('Cannot locate Rue workspace')
    directory = parent
  }
  return directory
}

export function compileNodePlan(
  source: string,
  target: 'server' | 'hydrate',
  published = false,
  dependencies: Record<string, string> = {},
  sharedRuntime: Record<string, unknown> | null = null,
) {
  const result = JSON.parse(
    execFileSync(
      process.execPath,
      [
        '-e',
        `
const {transformSync} = require('@swc/core'); const {buildSync} = require('esbuild'); const path = require('node:path');
const {source, target, published, dependencies, sharedRuntime} = JSON.parse(require('node:fs').readFileSync(0, 'utf8'));
const {code} = transformSync(source, {filename:'node-plan-fixture.tsx', jsc:{parser:{syntax:'typescript',tsx:true},target:'es2022',experimental:{runPluginFirst:true,plugins:[[path.resolve('packages/swc-plugin-rue/swc-plugin-rue.wasm'),{target}]]}},module:{type:'es6'}});
const extra = target === 'server' ? "export {renderToString} from '@rue-js/runtime/server';" : "export {hydrateRoot,mountClaimRoot} from '@rue-js/runtime/internal/hydrate';";
const fs=require('node:fs'); fs.mkdirSync('temp',{recursive:true}); const temp=fs.mkdtempSync(path.resolve('temp/node-plan-'));
try {
for(const [name,text] of Object.entries(dependencies)) { const compiled=transformSync(text,{filename:name+'.tsx',jsc:{parser:{syntax:'typescript',tsx:true},target:'es2022',experimental:{runPluginFirst:true,plugins:[[path.resolve('packages/swc-plugin-rue/swc-plugin-rue.wasm'),{target}]]}},module:{type:'es6'}});fs.writeFileSync(path.join(temp,name),compiled.code) }
const bundle = buildSync({stdin:{contents:code+'\\n'+extra,resolveDir:temp},bundle:true,external:sharedRuntime?['@rue-js/runtime','@rue-js/runtime/*','@rue-js/rue','@rue-js/rue/*']:[],write:false,format:'cjs',platform:'node',conditions:published?[]:['development'],tsconfigRaw:published?{}:undefined,metafile:true});
console.log(JSON.stringify({code, output:bundle.outputFiles[0].text, modules:Object.entries(Object.values(bundle.metafile.outputs)[0].inputs).filter(([,value])=>value.bytesInOutput>0).map(([id])=>id)}));
} finally {fs.rmSync(temp,{recursive:true,force:true})}
`,
      ],
      {
        cwd: workspaceRoot(),
        input: JSON.stringify({
          source,
          target,
          published,
          dependencies,
          sharedRuntime: !!sharedRuntime,
        }),
        encoding: 'utf8',
        stdio: 'pipe',
        maxBuffer: 10 * 1024 * 1024,
      },
    ),
  )
  const module = { exports: {} as Record<string, any> }
  new Function('module', 'exports', 'require', result.output)(
    module,
    module.exports,
    (id: string) => sharedRuntime?.[id] ?? createRequire(join(workspaceRoot(), 'package.json'))(id),
  )
  return Object.assign(module.exports, { code: result.code, modules: result.modules })
}
