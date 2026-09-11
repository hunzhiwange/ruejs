// @ts-check
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import pico from 'picocolors'
import { build } from 'vite'

import { formatBytes } from './format-bytes.js'
import { measureBundleCode } from './usage-size.js'

const projectRoot = process.cwd()
const fixtureDir = path.resolve(projectRoot, 'temp/tree-shaking-audit')
const defaultOutput = path.resolve(projectRoot, 'temp/tree-shaking/current.json')
const baselineFile = path.resolve(projectRoot, 'scripts/tree-shaking-baseline.json')
const defaultBudgetFile = path.resolve(projectRoot, 'scripts/tree-shaking-budget.json')
const publishedAliases = [
  [/^@rue-js\/rue\/internal\/compiler$/, 'packages/rue/dist/compiler-internal.js'],
  [/^@rue-js\/rue\/internal$/, 'packages/rue/dist/internal.js'],
  [/^@rue-js\/rue$/, 'packages/rue/dist/runtime.js'],
  [/^@rue-js\/runtime\/internal\/compiler$/, 'packages/runtime/dist/compiler-internal.js'],
  [/^@rue-js\/runtime\/internal$/, 'packages/runtime/dist/internal.js'],
  [/^@rue-js\/runtime$/, 'packages/runtime/dist/index.js'],
].map(([find, replacement]) => ({
  find,
  replacement: path.resolve(projectRoot, /** @type {string} */ (replacement)),
}))

export const TREE_SHAKING_SCENARIOS = Object.freeze([
  Object.freeze({
    name: 'public-signal',
    entry: '@rue-js/rue',
    imports: Object.freeze(['signal']),
  }),
  Object.freeze({
    name: 'public-ref-computed',
    entry: '@rue-js/rue',
    imports: Object.freeze(['ref', 'computed']),
  }),
  Object.freeze({
    name: 'public-transition',
    entry: '@rue-js/rue',
    imports: Object.freeze(['Transition']),
  }),
  Object.freeze({
    name: 'public-custom-element',
    entry: '@rue-js/rue',
    imports: Object.freeze(['useCustomElement']),
  }),
  Object.freeze({
    name: 'compiler-internal',
    entry: '@rue-js/rue/internal/compiler',
    imports: Object.freeze(['_$compiledRoot']),
  }),
])

/**
 * @param {string} id
 */
function normalizeModuleId(id) {
  const cleanId = id.split('?', 1)[0]
  const relative = path.relative(projectRoot, cleanId)
  return relative && !relative.startsWith('..') ? relative.split(path.sep).join('/') : cleanId
}

/**
 * @param {(typeof TREE_SHAKING_SCENARIOS)[number]} scenario
 */
async function buildScenario(scenario) {
  await mkdir(fixtureDir, { recursive: true })
  const entryFile = path.resolve(fixtureDir, `${scenario.name}.mjs`)
  const source = `export { ${scenario.imports.join(', ')} } from ${JSON.stringify(scenario.entry)}\n`
  await writeFile(entryFile, source, 'utf8')

  try {
    let resolvedEntry = ''
    const result = await build({
      root: projectRoot,
      configFile: false,
      publicDir: false,
      appType: 'custom',
      logLevel: 'silent',
      mode: 'production',
      plugins: [
        {
          name: 'rue:capture-tree-shaking-entry',
          async buildStart() {
            const resolved = await this.resolve(scenario.entry)
            if (!resolved) throw new Error(`failed to resolve consumer entry ${scenario.entry}`)
            resolvedEntry = normalizeModuleId(resolved.id)
          },
        },
      ],
      resolve: {
        alias: publishedAliases,
        conditions: ['module', 'browser', 'production'],
      },
      define: { 'process.env.NODE_ENV': '"production"' },
      build: {
        target: 'es2020',
        minify: false,
        write: false,
        rollupOptions: { treeshake: { moduleSideEffects: false } },
        lib: { entry: entryFile, formats: ['es'], fileName: 'tree-shaking-audit' },
      },
    })

    const outputs = Array.isArray(result) ? result : [result]
    const chunk = outputs
      .flatMap(output => ('output' in output ? output.output : []))
      .find(output => output.type === 'chunk' && output.isEntry)
    if (!chunk || chunk.type !== 'chunk') {
      throw new Error(`failed to generate consumer bundle for ${scenario.name}`)
    }
    if (!/^packages\/rue\/dist\/.+\.js$/.test(resolvedEntry)) {
      throw new Error(`consumer entry did not resolve to a published artifact: ${resolvedEntry}`)
    }

    const measured = await measureBundleCode(chunk.code)
    const modules = Object.entries(chunk.modules)
      .map(([id, details]) => ({
        id: normalizeModuleId(id),
        renderedBytes: details.renderedLength,
      }))
      .filter(module => module.renderedBytes > 0)
      .sort(
        (left, right) =>
          right.renderedBytes - left.renderedBytes || left.id.localeCompare(right.id),
      )

    return {
      name: scenario.name,
      entry: scenario.entry,
      imports: [...scenario.imports],
      resolvedEntry,
      sizes: {
        raw: measured.raw,
        minified: measured.min,
        gzip: measured.gzip,
        brotli: measured.brotli,
      },
      modules,
    }
  } finally {
    await rm(entryFile, { force: true })
  }
}

export async function runTreeShakingAudit() {
  const measurements = []
  for (const scenario of TREE_SHAKING_SCENARIOS) {
    measurements.push(await buildScenario(scenario))
  }

  return {
    schemaVersion: 1,
    build: {
      mode: 'production',
      target: 'es2020',
      minifier: '@swc/core',
    },
    scenarios: Object.fromEntries(measurements.map(result => [result.name, result])),
  }
}

/**
 * @param {{scenarios: Record<string, {max: Record<string, number>, forbidModules: string[]}>}} budget
 * @param {{scenarios: Record<string, {sizes: Record<string, number>, modules: {id: string}[]}>}} report
 */
export function evaluateTreeShakingBudget(budget, report) {
  const failures = []

  for (const [scenarioName, scenarioBudget] of Object.entries(budget.scenarios)) {
    const scenario = report.scenarios[scenarioName]
    if (!scenario) {
      failures.push({ type: 'missing-scenario', scenario: scenarioName })
      continue
    }

    for (const [metric, max] of Object.entries(scenarioBudget.max)) {
      const actual = scenario.sizes[metric]
      if (actual > max) {
        failures.push({
          type: 'size',
          scenario: scenarioName,
          metric,
          actual,
          max,
          overBy: actual - max,
        })
      }
    }

    for (const module of scenario.modules) {
      for (const rule of scenarioBudget.forbidModules) {
        if (module.id.includes(rule)) {
          failures.push({
            type: 'forbidden-module',
            scenario: scenarioName,
            rule,
            moduleId: module.id,
          })
        }
      }
    }
  }

  return { ok: failures.length === 0, failures }
}

/**
 * @param {{output: string, writeBaseline: boolean, budget: string | undefined}} options
 */
async function main(options) {
  const report = await runTreeShakingAudit()
  await mkdir(path.dirname(options.output), { recursive: true })
  await writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  if (options.writeBaseline) {
    await writeFile(baselineFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  }

  console.log(`\nConsumer tree-shaking audit: ${path.relative(projectRoot, options.output)}`)
  for (const scenario of Object.values(report.scenarios)) {
    const contributors = scenario.modules
      .slice(0, 3)
      .map(module => `${module.id} (${formatBytes(module.renderedBytes)})`)
      .join(', ')
    console.log(
      `${pico.green(pico.bold(scenario.name))} - ` +
        `raw:${formatBytes(scenario.sizes.raw)} / ` +
        `min:${formatBytes(scenario.sizes.minified)} / ` +
        `gzip:${formatBytes(scenario.sizes.gzip)} / ` +
        `brotli:${formatBytes(scenario.sizes.brotli)} / ` +
        `entry:${scenario.resolvedEntry} / top:${contributors}`,
    )
  }

  if (options.budget) {
    const budget = JSON.parse(await readFile(options.budget, 'utf8'))
    const result = evaluateTreeShakingBudget(budget, report)
    if (!result.ok) {
      console.error(`\n${pico.red(pico.bold('Tree-shaking budget failed:'))}`)
      for (const failure of result.failures) {
        console.error(JSON.stringify(failure))
      }
      process.exitCode = 1
    } else {
      console.log(`\n${pico.green(pico.bold('Tree-shaking budget passed.'))}`)
    }
  }
}

const moduleFile = import.meta.url.startsWith('file:') ? fileURLToPath(import.meta.url) : ''
const isMain = process.argv[1] && moduleFile && path.resolve(process.argv[1]) === moduleFile

if (isMain) {
  const { values } = parseArgs({
    args: process.argv.slice(2).filter((argument, index) => argument !== '--' || index !== 0),
    options: {
      output: { type: 'string', default: defaultOutput },
      'write-baseline': { type: 'boolean', default: false },
      budget: { type: 'string' },
      check: { type: 'boolean', default: false },
    },
  })
  await main({
    output: path.resolve(values.output),
    writeBaseline: values['write-baseline'],
    budget: values.check
      ? defaultBudgetFile
      : values.budget
        ? path.resolve(values.budget)
        : undefined,
  })
}
