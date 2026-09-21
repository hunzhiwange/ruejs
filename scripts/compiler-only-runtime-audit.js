// @ts-check
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildRuntimeSizePreset, RUNTIME_SIZE_PRESETS } from './runtime-size-audit.js'

export const HYDRATE_AUDIT_SOURCE = `import { signal } from '@rue-js/rue'; import { hydrateRoot } from '@rue-js/rue/internal/hydrate'; export const label = signal('one'); const Child = props => <strong>{props.label}</strong>; export const View = () => <main><button onClick={() => label.set('two')}>{label.get()}</button><Child label={label.get()}/></main>; export const start = container => hydrateRoot(container, View);`

// Both audit entry points must measure the same builtin fixture against its budget.
export const BUILTIN_AUDIT_SOURCES = Object.freeze({
  teleport: `import { Teleport } from '@rue-js/rue'; export const View = () => <Teleport to="#portal"><span>owned</span></Teleport>;`,
  transition: `import { Transition } from '@rue-js/rue'; export const View = () => <Transition><span>owned</span></Transition>;`,
})

// Closed target contract. Numbered migration tasks may change ABI fixtures, but
// must retain every scenario and may not raise these absolute gzip budgets.
/** @param {string} name */
const preset = name => {
  const result = RUNTIME_SIZE_PRESETS.find(value => value.name === name)
  if (!result) throw new Error(`Unknown runtime size preset ${name}`)
  return result
}
export const TARGET_SCENARIOS = Object.freeze(
  [
    {
      name: 'static',
      maxGzip: 1024,
      builtin: false,
      input: [{ entry: '@rue-js/rue/internal/dom', imports: ['_$template'] }],
      fixtureSource: `import { _$template } from '@rue-js/rue/internal/dom';
const getTemplate = _$template('<div>hello</div>');
export const mountStatic = parent => parent.appendChild(getTemplate().content.cloneNode(true));`,
    },
    {
      name: 'reactive-text',
      maxGzip: 3072,
      builtin: false,
      input: [{ entry: '@rue-js/rue/internal/reactive', imports: ['signal'] }],
      fixtureSource: `import { signal } from '@rue-js/rue/internal/reactive';
export const mountText = parent => {
  const value = signal('hello'); const text = document.createTextNode('');
  parent.appendChild(text); text.data = value.get();
  text.setValue = next => { value.set(next); text.data = value.get() }; return text;
};`,
    },
    { ...preset('compiled-component'), name: 'component', maxGzip: 10240 },
    { ...preset('compiled-list'), name: 'list', maxGzip: 5120 },
    { ...preset('teleport-only'), name: 'Teleport', maxGzip: 12288 },
    { ...preset('transition-only'), name: 'Transition', maxGzip: 12288 },
    { ...preset('hydrate'), name: 'hydrate', maxGzip: 25600 },
    {
      name: 'SSR',
      maxGzip: null,
      builtin: false,
      input: [{ entry: '@rue-js/rue/server-renderer', imports: ['renderToString'] }],
    },
  ].map(scenario => Object.freeze(scenario)),
)

export const FORBIDDEN_MODULES = Object.freeze([
  /runtime-core\/js-runtime\//,
  /runtime-core\/js-reactive\/facade(?:\.|\/)/,
  /compiled-(?:legacy-dom|dom-bindings-legacy|render-anchor)(?:\.|\/)/,
  /(?:portable[^/]*renderable|renderable[^/]*portable)/,
  /\/(?:render|patch|mount-compat|island(?:-protocol)?|server-island)\.[cm]?[jt]s$/,
])
// Only explicit kernel, block/host/event and compiler feature modules belong in
// the browser closure. Unknown modules fail closed, even without a deny match.
export const ALLOWED_MODULES = Object.freeze([
  /^packages\/runtime\/dist\/runtime-core\/reactive-kernel\//,
  /^packages\/runtime\/dist\/compiler-runtime\//,
  /^packages\/runtime\/dist\/(?:reactive-core\/index|runtime-core\/compiled)\.js$/,
  /^packages\/(?:rue|runtime)\/dist\/(?:compiler|component|builtins)-internal\.js$/,
  /^packages\/shared\/dist\//,
  /^temp\/size\/[^/]+\.runtime-audit\.mjs$/,
])
export const LEGACY_PUBLIC_ENTRIES = Object.freeze([
  './internal',
  './dom',
  './public/*',
  './dist/*',
  './*',
])

/** @typedef {{publicEntries: string[], scenarios: Record<string, {gzip: number, sources: {moduleRenderSizes?: Record<string, number>, builtins?: string[]}}>}} TargetReport */

/** @param {TargetReport} report */
export function compilerOnlyFailures(report) {
  const failures = []
  for (const entry of report.publicEntries ?? [])
    failures.push(`public entry ${entry} is forbidden`)
  for (const scenario of TARGET_SCENARIOS) {
    const result = report.scenarios?.[scenario.name]
    if (!result) {
      failures.push(`${scenario.name} missing`)
      continue
    }
    if (!Number.isFinite(result.gzip) || result.gzip <= 0)
      failures.push(`${scenario.name} missing gzip evidence`)
    else if (scenario.maxGzip !== null && result.gzip > scenario.maxGzip)
      failures.push(`${scenario.name} gzip ${result.gzip} > ${scenario.maxGzip}`)
    const modules = Object.entries(result.sources?.moduleRenderSizes ?? {}).filter(
      ([, bytes]) => Number(bytes) > 0,
    )
    if (!modules.length) failures.push(`${scenario.name} missing rendered module evidence`)
    for (const [id] of modules) {
      if (FORBIDDEN_MODULES.some(rule => rule.test(id)))
        failures.push(`${scenario.name} forbidden module ${id}`)
      else if (
        !ALLOWED_MODULES.some(rule => rule.test(id)) &&
        !(
          scenario.name === 'SSR' &&
          /^packages\/(?:server-renderer|rue|runtime)\/dist\/(?:server[^/]*\.js|ssr\/.*)$/.test(id)
        )
      )
        failures.push(`${scenario.name} unapproved module ${id}`)
    }
    for (const builtin of result.sources?.builtins ?? [])
      if (builtin !== scenario.name) failures.push(`${scenario.name} unused builtin ${builtin}`)
  }
  return failures
}

/** @param {TargetReport} report */
export function assertCompilerOnlyRuntime(report) {
  const failures = compilerOnlyFailures(report)
  if (failures.length)
    throw new Error(
      `compiler-only runtime target failed:\n${failures.map(f => `- ${f}`).join('\n')}`,
    )
}

export async function auditCompilerOnlyRuntime(
  output = 'temp/size/compiler-only-runtime-audit.json',
) {
  /** @type {Record<string, Awaited<ReturnType<typeof buildRuntimeSizePreset>>>} */
  const scenarios = {}
  for (const scenario of TARGET_SCENARIOS) {
    if (
      scenario.name === 'Teleport' ||
      scenario.name === 'Transition' ||
      scenario.name === 'hydrate'
    ) {
      const { transformSync } = await import('@swc/core')
      const name = scenario.name
      const { code } = transformSync(
        name === 'hydrate'
          ? HYDRATE_AUDIT_SOURCE
          : BUILTIN_AUDIT_SOURCES[name === 'Teleport' ? 'teleport' : 'transition'],
        {
          filename: `audit-${name}.tsx`,
          jsc: {
            parser: { syntax: 'typescript', tsx: true },
            target: 'es2020',
            experimental: {
              plugins: [
                [
                  path.resolve('packages/swc-plugin-rue/swc-plugin-rue.wasm'),
                  { target: name === 'hydrate' ? 'hydrate' : 'client' },
                ],
              ],
            },
          },
          module: { type: 'es6' },
        },
      )
      const entries = [...new Set([...code.matchAll(/from "([^"]+)"/g)].map(match => match[1]))]
      scenarios[name] = await buildRuntimeSizePreset({
        ...scenario,
        builtin: false,
        input: entries.map(entry => ({ entry, imports: [] })),
        fixtureSource: code,
      })
    } else scenarios[scenario.name] = await buildRuntimeSizePreset(scenario)
  }
  const publicEntries = []
  for (const pkg of ['rue', 'runtime']) {
    const manifest = JSON.parse(await readFile(`packages/${pkg}/package.json`, 'utf8'))
    for (const entry of LEGACY_PUBLIC_ENTRIES)
      if (entry in manifest.exports) publicEntries.push(`@rue-js/${pkg}${entry.slice(1)}`)
  }
  const report = {
    schemaVersion: 1,
    build: { mode: 'production', target: 'es2020' },
    publicEntries,
    scenarios,
  }
  await mkdir(path.dirname(output), { recursive: true })
  await writeFile(
    output,
    `${JSON.stringify({ ...report, failures: compilerOnlyFailures(report) }, null, 2)}\n`,
  )
  return report
}

// Direct invocation must execute an audit; previously this file only exported functions.
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve('scripts/compiler-only-runtime-audit.js')
) {
  const selectedScenarios = process.argv.flatMap((arg, index) =>
    arg === '--scenario' ? [process.argv[index + 1]] : [],
  )
  for (const selected of selectedScenarios) {
    if (
      !['reactive-text', 'list', 'component', 'teleport', 'transition', 'hydrate'].includes(
        selected,
      )
    )
      throw new Error(`Unsupported isolated scenario: ${selected}`)
  }
  if (selectedScenarios.length) {
    const allFailures = []
    for (const selected of selectedScenarios) {
      const { transformSync } = await import('@swc/core')
      const source =
        selected === 'hydrate'
          ? HYDRATE_AUDIT_SOURCE
          : selected === 'teleport'
            ? BUILTIN_AUDIT_SOURCES.teleport
            : selected === 'transition'
              ? BUILTIN_AUDIT_SOURCES.transition
              : selected === 'reactive-text'
                ? `import { signal } from '@rue-js/rue';
export const text = signal('hello');
export const View = () => <span>{text.get()}</span>;`
                : selected === 'component'
                  ? `import { signal } from '@rue-js/rue';
export const label = signal('one');
const Child = props => <section><input value={props.label}/><span>{props.label}</span></section>;
export const View = () => <main><Child label={label.get()}/></main>;`
                  : `import { signal } from '@rue-js/rue';
export const rows = signal([{id: 1, label: 'one'}]);
export const View = () => <ul>{rows.get().map(row => <li key={row.id}>{row.label}</li>)}</ul>;`
      const { code } = transformSync(source, {
        filename: `compiled-${selected}-audit.tsx`,
        jsc: {
          parser: { syntax: 'typescript', tsx: true },
          target: 'es2020',
          experimental: {
            plugins: [
              [
                path.resolve('packages/swc-plugin-rue/swc-plugin-rue.wasm'),
                { target: selected === 'hydrate' ? 'hydrate' : 'client' },
              ],
            ],
          },
        },
        module: { type: 'es6' },
      })
      const entries = [...new Set([...code.matchAll(/from "([^"]+)"/g)].map(match => match[1]))]
      const result = await buildRuntimeSizePreset({
        name: selected,
        builtin: false,
        input: entries.map(entry => ({ entry, imports: [] })),
        fixtureSource: code,
      })
      const modules = Object.entries(result.sources.moduleRenderSizes).filter(
        ([, size]) => size > 0,
      )
      const failures = modules
        .filter(
          ([id]) =>
            FORBIDDEN_MODULES.some(pattern => pattern.test(id)) ||
            (['list', 'teleport', 'transition'].includes(selected) &&
              /(?:compact-component|compiled-component|island|facade)/.test(id)),
        )
        .map(([id]) => ` ${selected} forbidden module ${id}`)
      for (const [id] of modules) {
        if (!ALLOWED_MODULES.some(pattern => pattern.test(id)))
          failures.push(`${selected} unapproved module ${id}`)
      }
      if (['teleport', 'transition'].includes(selected)) {
        for (const [id] of modules) {
          if (
            /builtins\/(?:index|keep-alive|suspense|transition-group)\.js$/.test(id) ||
            (selected === 'teleport' && /builtins\/transition(?:-phase)?\.js$/.test(id)) ||
            (selected === 'transition' && id.endsWith('builtins/teleport.js'))
          )
            failures.push(`${selected} unused builtin module ${id}`)
        }
      }
      if (!modules.length) failures.push(`${selected} missing rendered module evidence`)
      const maxGzip = TARGET_SCENARIOS.find(
        scenario => scenario.name.toLowerCase() === selected,
      )?.maxGzip
      if (maxGzip == null) throw new Error(`Missing budget for ${selected}`)
      if (result.gzip > maxGzip) failures.push(`${selected} gzip ${result.gzip} > ${maxGzip}`)
      const report = { source, code, ...result, maxGzip, failures }
      await mkdir('temp/size', { recursive: true })
      await writeFile(
        `temp/size/compiler-${selected}-task${selected === 'hydrate' ? 9 : ['teleport', 'transition'].includes(selected) ? 8 : selected === 'reactive-text' ? 7 : selected === 'list' ? 5 : 6}.json`,
        JSON.stringify(report, null, 2) + '\n',
      )
      console.log(
        JSON.stringify(
          {
            scenario: selected,
            min: result.min,
            gzip: result.gzip,
            modules: modules.map(([id]) => id),
            failures,
          },
          null,
          2,
        ),
      )
      allFailures.push(...failures)
    }
    if (process.argv.includes('--check') && allFailures.length)
      throw new Error(allFailures.join('\n'))
  } else {
    const report = await auditCompilerOnlyRuntime()
    if (process.argv.includes('--check')) assertCompilerOnlyRuntime(report)
    console.log(JSON.stringify(report, null, 2))
  }
}
