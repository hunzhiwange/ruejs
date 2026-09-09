/** Rebuild: node --expose-gc scripts/reactive-kernel-performance.mjs --write-baseline
 * Gate: node --expose-gc scripts/reactive-kernel-performance.mjs --check
 * Compare only the same Node/CPU/platform/GC mode. Heap delta measures live heap
 * from before setup to after run and optional GC (not total allocations); retained heap is after
 * disposal and optional GC. Without --expose-gc both are noisy observations.
 * observedHeapPeakBytes is the largest post-workload/pre-GC heapUsed observation,
 * not an allocation total or a continuously sampled process peak.
 * Bundle is the minified production reactive-kernel entry, not the benchmark.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cpus } from 'node:os'
import { gzipSync } from 'node:zlib'
import { parseArgs } from 'node:util'
import { setImmediate } from 'node:timers/promises'

// Surviving version-1 workloads retain identical operations and assertions.
// Historical proxy workloads remain only in the old report; they cannot run on this kernel.
export const WORKLOADS = [
  'signal-shallow',
  'signal-depth4',
  'graph-10000',
  'signal-array-10000',
  'batch-100',
  'handles-100000',
]
const METRICS = [
  'elapsedMs',
  'opsPerSecond',
  'heapDeltaBytes',
  'retainedHeapBytes',
  'graphNodesPeak',
  'graphEdgesPeak',
]
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const baselinePath = resolve(root, 'scripts/reactive-kernel-performance-baseline.json')
const budgetPath = resolve(root, 'scripts/reactive-kernel-performance-budget.json')
const config = { warmupRounds: 3, measuredRounds: 7, workloadVersion: 1 }
const median = values => {
  if (!values.length || values.some(value => !Number.isFinite(value)))
    throw new Error('invalid samples')
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}
export function summarizeSamples(samples, operations) {
  if (!Number.isInteger(operations) || operations <= 0) throw new Error('invalid operations')
  const elapsedMs = median(samples.map(sample => sample.elapsedMs))
  if (samples.some(sample => sample.elapsedMs <= 0)) throw new Error('invalid elapsedMs')
  return {
    operations,
    sampleCount: samples.length,
    elapsedMs,
    opsPerSecond: (operations * 1000) / elapsedMs,
    heapDeltaBytes: median(samples.map(sample => sample.heapDeltaBytes)),
    retainedHeapBytes: median(samples.map(sample => sample.retainedHeapBytes)),
    graphNodesPeak: Math.max(...samples.map(sample => sample.graphNodesPeak)),
    graphEdgesPeak: Math.max(...samples.map(sample => sample.graphEdgesPeak)),
    observedHeapPeakBytes: Math.max(0, ...samples.map(sample => sample.observedHeapPeakBytes ?? 0)),
    samples,
  }
}
export function validateReport(report, workloads = WORKLOADS) {
  const fail = field => {
    throw new Error(`invalid or missing report metric: ${field}`)
  }
  if (report?.schemaVersion !== 1) fail('schemaVersion')
  for (const key of ['node', 'platform', 'arch', 'cpu'])
    if (!report.environment?.[key]) fail(`environment.${key}`)
  if (typeof report.environment.gcAvailable !== 'boolean') fail('gcAvailable')
  for (const [key, value] of Object.entries(config))
    if (report.config?.[key] !== value) fail(`config.${key}`)
  if (!(report.bundle?.gzipBytes > 0) || !Number.isFinite(report.bundle.gzipBytes))
    fail('bundle.gzipBytes')
  for (const name of workloads) {
    const result = report.results?.[name]
    if (!result) fail(name)
    for (const key of METRICS) {
      if (!Number.isFinite(result[key])) fail(`${name}.${key}`)
      if (!key.includes('Heap') && !key.startsWith('heap') && result[key] < 0)
        fail(`${name}.${key}`)
    }
    if (
      !(result.elapsedMs > 0) ||
      !(result.opsPerSecond > 0) ||
      !Number.isInteger(result.operations) ||
      result.operations <= 0
    )
      fail(name)
    if (
      result.sampleCount !== config.measuredRounds ||
      result.samples?.length !== config.measuredRounds
    )
      fail(`${name}.samples`)
    for (const sample of result.samples) {
      for (const key of METRICS.filter(key => key !== 'opsPerSecond'))
        if (!Number.isFinite(sample[key])) fail(`${name}.samples.${key}`)
    }
  }
  return report
}
export function checkBudget(report, baseline, budget, workloads = WORKLOADS) {
  validateReport(report, workloads)
  validateReport(baseline)
  const historical = baseline.previousBaseline
    ? validateReport(baseline.previousBaseline)
    : baseline
  for (const key of [
    'maxTimeRatio',
    'maxHeapRatio',
    'heapNoiseBytes',
    'maxGraphRatio',
    'maxGzipRatio',
  ]) {
    if (!Number.isFinite(budget[key]) || budget[key] < 0) throw new Error(`invalid budget: ${key}`)
  }
  if (budget.schemaVersion !== 1) throw new Error('invalid budget schemaVersion')
  for (const key of ['node', 'platform', 'arch', 'cpu', 'gcAvailable']) {
    if (report.environment[key] !== baseline.environment[key])
      throw new Error(`incompatible environment.${key}`)
  }
  const failures = []
  const upper = (label, actual, limit) => {
    if (actual > limit) failures.push(`${label}: ${actual} > ${limit}`)
  }
  if (workloads === WORKLOADS)
    upper(
      'bundle.gzipBytes',
      report.bundle.gzipBytes,
      Math.min(baseline.bundle.gzipBytes, historical.bundle.gzipBytes) * budget.maxGzipRatio,
    )
  for (const name of workloads) {
    const current = report.results[name],
      previous = baseline.results[name]
    if (current.operations !== previous.operations)
      throw new Error(`incompatible ${name}.operations`)
    const absoluteTimeLimit = budget.workloads?.[name]?.maxElapsedMs
    if (
      absoluteTimeLimit !== undefined &&
      !(Number.isFinite(absoluteTimeLimit) && absoluteTimeLimit > 0)
    )
      throw new Error(`invalid budget: ${name}.maxElapsedMs`)
    upper(
      `${name}.elapsedMs`,
      current.elapsedMs,
      Math.min(previous.elapsedMs * budget.maxTimeRatio, absoluteTimeLimit ?? Infinity),
    )
    for (const key of ['heapDeltaBytes', 'retainedHeapBytes'])
      upper(
        `${name}.${key}`,
        current[key],
        Math.max(0, Math.min(previous[key], historical.results[name][key])) * budget.maxHeapRatio +
          budget.heapNoiseBytes,
      )
    for (const key of ['graphNodesPeak', 'graphEdgesPeak'])
      upper(
        `${name}.${key}`,
        current[key],
        Math.min(previous[key], historical.results[name][key]) * budget.maxGraphRatio,
      )
  }
  if (failures.length) throw new Error(`reactive kernel budget failed:\n${failures.join('\n')}`)
}
async function bundle(entry, minify) {
  const { build } = await import('vite')
  const result = await build({
    configFile: false,
    logLevel: 'error',
    root,
    define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' },
    resolve: { alias: { '@rue-js/shared': resolve(root, 'packages/shared/src/index.ts') } },
    build: {
      write: false,
      minify,
      target: 'es2022',
      lib: { entry: resolve(root, entry), formats: ['es'] },
    },
  })
  const outputs = (Array.isArray(result) ? result : [result]).flatMap(item => item.output)
  const chunk = outputs.find(item => item.type === 'chunk' && item.isEntry)
  if (!chunk || outputs.some(item => item.type === 'chunk' && item !== chunk))
    throw new Error('expected self-contained kernel bundle')
  return chunk.code
}
async function runSample(fixtures, name, before) {
  const work = fixtures.createWorkload(name)
  try {
    const start = performance.now()
    work.run()
    const elapsedMs = performance.now() - start
    work.check()
    const observedHeapPeakBytes = process.memoryUsage().heapUsed
    await setImmediate()
    globalThis.gc?.()
    const heapDeltaBytes = process.memoryUsage().heapUsed - before
    return { elapsedMs, heapDeltaBytes, observedHeapPeakBytes, operations: work.operations }
  } finally {
    work.dispose()
  }
}
export async function measure(workloads = WORKLOADS) {
  const code = await bundle('packages/runtime/__benchmarks__/reactive-kernel.bench.ts', false)
  const fixtures = await import(
    `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  )
  if (JSON.stringify(fixtures.WORKLOADS) !== JSON.stringify(WORKLOADS))
    throw new Error('workload manifest mismatch')
  const kernel = await bundle('packages/runtime/src/runtime-core/reactive-kernel/index.ts', true)
  const report = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cpu: cpus()[0]?.model ?? 'unknown',
      gcAvailable: typeof globalThis.gc === 'function',
    },
    config,
    bundle: {
      entry: 'packages/runtime/src/runtime-core/reactive-kernel/index.ts',
      gzipBytes: gzipSync(kernel).length,
    },
    results: {},
  }
  for (const name of workloads) {
    for (let i = 0; i < config.warmupRounds; i++) {
      const work = fixtures.createWorkload(name)
      try {
        work.run()
        work.check()
      } finally {
        work.dispose()
      }
    }
    const instrumented = fixtures.createWorkload(name, true)
    let stats
    try {
      instrumented.run()
      instrumented.check()
      stats = instrumented.stats()
    } finally {
      instrumented.dispose()
    }
    const samples = []
    let operations
    for (let i = 0; i < config.measuredRounds; i++) {
      globalThis.gc?.()
      const before = process.memoryUsage().heapUsed
      // Return from the workload stack before GC; otherwise V8 can retain local
      // handles in stack slots and make released objects look like retained heap.
      const measured = await runSample(fixtures, name, before)
      operations = measured.operations
      await setImmediate()
      globalThis.gc?.()
      const retainedHeapBytes = process.memoryUsage().heapUsed - before
      samples.push({
        elapsedMs: measured.elapsedMs,
        heapDeltaBytes: measured.heapDeltaBytes,
        observedHeapPeakBytes: measured.observedHeapPeakBytes,
        retainedHeapBytes,
        ...stats,
      })
    }
    report.results[name] = summarizeSamples(samples, operations)
    console.log(`${name}: ${report.results[name].elapsedMs.toFixed(3)} ms`)
  }
  return validateReport(report, workloads)
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({
    options: {
      output: { type: 'string', default: 'temp/performance/reactive-baseline.json' },
      'write-baseline': { type: 'boolean', default: false },
      check: { type: 'boolean', default: false },
      scenario: { type: 'string' },
      compare: { type: 'string' },
      budget: { type: 'string' },
    },
  })
  if ((values.check || values.compare || values.scenario) && values['write-baseline'])
    throw new Error('cannot check and overwrite baseline together')
  if (values.scenario && values.scenario !== 'array-path') throw new Error('unknown scenario')
  const workloads = values.scenario ? ['signal-array-10000'] : WORKLOADS
  const report = await measure(workloads)
  const output = resolve(root, values.output)
  await mkdir(dirname(output), { recursive: true })
  const json = `${JSON.stringify(report, null, 2)}\n`
  await writeFile(output, json)
  if (values['write-baseline']) await writeFile(baselinePath, json)
  if (values.check || values.compare) {
    checkBudget(
      report,
      JSON.parse(
        await readFile(values.compare ? resolve(root, values.compare) : baselinePath, 'utf8'),
      ),
      JSON.parse(await readFile(values.budget ? resolve(root, values.budget) : budgetPath, 'utf8')),
      workloads,
    )
    console.log('Budget check passed')
  }
  console.log(`Report: ${output}`)
}
