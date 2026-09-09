import { describe, expect, it } from 'vitest'
import {
  WORKLOADS,
  summarizeSamples,
  validateReport,
  checkBudget,
} from '../reactive-kernel-performance.mjs'

const sample = (elapsedMs = 10) => ({
  elapsedMs,
  heapDeltaBytes: 100,
  retainedHeapBytes: 0,
  graphNodesPeak: 2,
  graphEdgesPeak: 1,
})
const report = () => ({
  schemaVersion: 1,
  environment: {
    node: 'v22.22.0',
    platform: 'darwin',
    arch: 'arm64',
    cpu: 'fixture',
    gcAvailable: true,
  },
  config: { warmupRounds: 3, measuredRounds: 7, workloadVersion: 1 },
  bundle: { gzipBytes: 1000 },
  results: Object.fromEntries(
    WORKLOADS.map(name => [
      name,
      summarizeSamples(
        Array.from({ length: 7 }, () => sample()),
        100,
      ),
    ]),
  ),
})
const budget = () => ({
  schemaVersion: 1,
  maxTimeRatio: 1.3,
  maxHeapRatio: 1.3,
  heapNoiseBytes: 1048576,
  maxGraphRatio: 1.05,
  maxGzipRatio: 1.05,
})

describe('reactive kernel performance report', () => {
  it('验证完整报告并拒绝超预算数据', () => {
    const baseline = report()
    expect(() => validateReport(baseline)).not.toThrow()
    expect(() => checkBudget(report(), baseline, budget())).not.toThrow()
    const slow = report()
    slow.results[WORKLOADS[0]].elapsedMs *= 2
    expect(() => checkBudget(slow, baseline, budget())).toThrow(/elapsedMs/)
  })
  it('computes deterministic medians without changing input order', () => {
    const samples = [sample(30), sample(10), sample(20)]
    expect(summarizeSamples(samples, 100)).toMatchObject({
      elapsedMs: 20,
      opsPerSecond: 5000,
      heapDeltaBytes: 100,
      graphNodesPeak: 2,
    })
    expect(samples.map(s => s.elapsedMs)).toEqual([30, 10, 20])
    expect(() => summarizeSamples([], 100)).toThrow()
  })
  it('rejects missing workloads, metrics and nonfinite numbers', () => {
    for (const metric of [
      'elapsedMs',
      'opsPerSecond',
      'heapDeltaBytes',
      'retainedHeapBytes',
      'graphNodesPeak',
      'graphEdgesPeak',
    ]) {
      const missing = report()
      delete missing.results[WORKLOADS[0]][metric]
      expect(() => validateReport(missing)).toThrow()
      const invalid = report()
      invalid.results[WORKLOADS[0]][metric] = NaN
      expect(() => validateReport(invalid)).toThrow()
    }
    const missing = report()
    delete missing.results[WORKLOADS[0]]
    expect(() => validateReport(missing)).toThrow()
  })
  it('rejects memory, graph and gzip regressions and incomplete budgets', () => {
    for (const metric of [
      'heapDeltaBytes',
      'retainedHeapBytes',
      'graphNodesPeak',
      'graphEdgesPeak',
    ]) {
      const current = report()
      current.results[WORKLOADS[0]][metric] = 1e9
      expect(() => checkBudget(current, report(), budget())).toThrow(metric)
    }
    const current = report()
    current.bundle.gzipBytes = 2000
    expect(() => checkBudget(current, report(), budget())).toThrow(/gzip/)
    expect(() => checkBudget(report(), report(), {})).toThrow()
  })
  it('rejects incompatible environment, workload configuration and operation counts', () => {
    const current = report()
    current.environment.node = 'v24.0.0'
    expect(() => checkBudget(current, report(), budget())).toThrow(/environment/)
    current.environment.node = 'v22.22.0'
    current.results[WORKLOADS[0]].operations++
    expect(() => checkBudget(current, report(), budget())).toThrow(/operations/)
  })
})

it('checks a selected workload without requiring unrelated measurements', () => {
  const baseline = report()
  const current = report()
  current.results = { 'signal-array-10000': current.results['signal-array-10000'] }
  const selected = ['signal-array-10000']
  expect(() => checkBudget(current, baseline, budget(), selected)).not.toThrow()
  current.results['signal-array-10000'].elapsedMs *= 2
  expect(() => checkBudget(current, baseline, budget(), selected)).toThrow(/elapsedMs/)
})

it('runs only surviving comparable workloads after Proxy removal', () => {
  expect(WORKLOADS).toEqual([
    'signal-shallow',
    'signal-depth4',
    'graph-10000',
    'signal-array-10000',
    'batch-100',
    'handles-100000',
  ])
})

it('enforces absolute calibrated limits even when a relative baseline would allow regression', () => {
  const current = report()
  expect(() =>
    checkBudget(current, report(), {
      ...budget(),
      workloads: { [WORKLOADS[0]]: { maxElapsedMs: 9 } },
    }),
  ).toThrow(/elapsedMs/)
  expect(() =>
    checkBudget(current, report(), {
      ...budget(),
      workloads: { [WORKLOADS[0]]: { maxElapsedMs: NaN } },
    }),
  ).toThrow(/invalid budget/)
})

it('retains the historical baseline and never raises its time ceilings', async () => {
  const { readFile } = await import('node:fs/promises')
  const baseline = JSON.parse(
    await readFile('scripts/reactive-kernel-performance-baseline.json', 'utf8'),
  )
  const configured = JSON.parse(
    await readFile('scripts/reactive-kernel-performance-budget.json', 'utf8'),
  )
  expect(baseline.calibration.elapsedMsByRun).toHaveLength(3)
  for (const name of WORKLOADS) {
    expect(configured.workloads[name].maxElapsedMs).toBeLessThanOrEqual(
      baseline.previousBaseline.results[name].elapsedMs * 1.3,
    )
  }
  expect(baseline.previousBaseline.results['proxy-depth4']).toBeDefined()
})
