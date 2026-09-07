import { describe, expect, it } from 'vitest'

import {
  ANCHOR_TIERING_SCENARIOS,
  AnchorTieringBudgetError,
  checkAnchorTieringBudget,
  compareAnchorTieringResults,
  normalizeAnchorTieringResults,
} from '../anchor-tiering-performance.mjs'

const makeScenario = (offset: number) => ({
  cpuMs: offset + 1,
  mutations: offset + 2,
  heapBytes: offset + 3,
  nodeCount: offset + 4,
  commentNodes: offset + 5,
  effectRuns: offset + 6,
})

const makeRound = (offset: number) => ({
  scenarios: Object.fromEntries(
    ANCHOR_TIERING_SCENARIOS.map((name, index) => [name, makeScenario(offset + index * 10)]),
  ),
})

const makeMeasurement = (median: number, key = 'median') => ({
  [key]: median,
  validSamples: 5,
})

const makeBudgetReport = (multiplier = 1) => ({
  source: {
    environmentSha256: 'a'.repeat(64),
    fixtureArtifacts: [
      { path: 'fixture.js', sha256: 'b'.repeat(64), brotliBytes: 100 * multiplier },
    ],
  },
  results: Object.fromEntries(
    ANCHOR_TIERING_SCENARIOS.map(scenario => [
      scenario,
      {
        cpu: makeMeasurement(100 * multiplier, 'medianMs'),
        mutations: makeMeasurement(100 * multiplier),
        heap: makeMeasurement(100 * multiplier, 'medianBytes'),
        nodeCount: makeMeasurement(100 * multiplier),
        commentNodes: makeMeasurement(10 * multiplier),
        effectRuns: makeMeasurement(1),
      },
    ]),
  ),
})

const performanceBudget = {
  minimumValidSamples: 5,
  size: { maxBrotliRatio: 1 },
  scenarios: Object.fromEntries(
    ANCHOR_TIERING_SCENARIOS.map(scenario => [
      scenario,
      {
        maxCommentNodes: 10,
        maxMutationRatio: 1,
        maxNodeCountRatio: 1,
        maxCpuRatio: 1,
        maxHeapRatio: 1,
        expectedEffectRuns: 1,
        requireCpuOrHeapImprovement: false,
      },
    ]),
  ),
}

describe('anchor tiering performance report helpers', () => {
  it('normalizes every scenario and resource metric with sorted samples and medians', () => {
    const normalized = normalizeAnchorTieringResults([makeRound(20), makeRound(0), makeRound(10)])

    expect(Object.keys(normalized)).toEqual(ANCHOR_TIERING_SCENARIOS)
    expect(normalized.textUpdate.cpu).toEqual({
      medianMs: 11,
      validSamples: 3,
      samplesMs: [1, 11, 21],
    })
    expect(normalized.nullableMultiRoot.commentNodes).toEqual({
      median: 35,
      validSamples: 3,
      samples: [25, 35, 45],
    })
    expect(normalized.compiledComponentSlot.effectRuns).toEqual({
      median: 46,
      validSamples: 3,
      samples: [36, 46, 56],
    })
  })

  it('rejects missing or invalid samples instead of silently weakening a round', () => {
    const rounds = [makeRound(0), makeRound(10), makeRound(20)]
    delete (rounds[1].scenarios as Record<string, unknown>).singleRootBranch
    expect(() => normalizeAnchorTieringResults(rounds)).toThrow(
      'Missing valid sample for round 2, scenario singleRootBranch, metric cpuMs',
    )

    const invalid = [makeRound(0), makeRound(10), makeRound(20)]
    invalid[2].scenarios.textUpdate.heapBytes = Number.NaN
    expect(() => normalizeAnchorTieringResults(invalid)).toThrow(
      'Missing valid sample for round 3, scenario textUpdate, metric heapBytes',
    )
  })

  it('uses positive improvement for lower resource usage and negative for regressions', () => {
    const baseline = normalizeAnchorTieringResults([makeRound(10), makeRound(10), makeRound(10)])
    const current = normalizeAnchorTieringResults([makeRound(0), makeRound(0), makeRound(0)])
    const comparison = compareAnchorTieringResults(current, baseline)

    expect(comparison.textUpdate.cpu.delta).toBe(-10)
    expect(comparison.textUpdate.cpu.improvementPercent).toBeCloseTo(10 / 11)
    expect(comparison.textUpdate.commentNodes.improvementPercent).toBeCloseTo(10 / 15)

    const regression = compareAnchorTieringResults(baseline, current)
    expect(regression.textUpdate.cpu.delta).toBe(10)
    expect(regression.textUpdate.cpu.improvementPercent).toBeCloseTo(-10)
  })

  it('accepts reports at every configured anchor-tiering boundary', () => {
    expect(
      checkAnchorTieringBudget(makeBudgetReport(), makeBudgetReport(), performanceBudget),
    ).toMatchObject({ passed: true, size: { brotliRatio: 1 } })
  })

  it.each([
    [
      'comment nodes',
      (report: ReturnType<typeof makeBudgetReport>) => {
        report.results.textUpdate.commentNodes.median = 11
      },
      /textUpdate.*commentNodes/i,
    ],
    [
      'mutations',
      (report: ReturnType<typeof makeBudgetReport>) => {
        report.results.singleRootBranch.mutations.median = 101
      },
      /singleRootBranch.*mutations/i,
    ],
    [
      'CPU',
      (report: ReturnType<typeof makeBudgetReport>) => {
        report.results.nullableMultiRoot.cpu.medianMs = 101
      },
      /nullableMultiRoot.*cpu/i,
    ],
    [
      'heap',
      (report: ReturnType<typeof makeBudgetReport>) => {
        report.results.compiledComponentSlot.heap.medianBytes = 101
      },
      /compiledComponentSlot.*heap/i,
    ],
    [
      'Brotli size',
      (report: ReturnType<typeof makeBudgetReport>) => {
        report.source.fixtureArtifacts[0].brotliBytes = 101
      },
      /size.*brotli/i,
    ],
    [
      'effect run count',
      (report: ReturnType<typeof makeBudgetReport>) => {
        report.results.textUpdate.effectRuns.median = 0
      },
      /textUpdate.*effectRuns/i,
    ],
  ])('rejects a %s regression', (_label, mutate, expectedMessage) => {
    const report = makeBudgetReport()
    mutate(report)
    expect(() => checkAnchorTieringBudget(report, makeBudgetReport(), performanceBudget)).toThrow(
      expectedMessage,
    )
  })

  it('requires a configured CPU or heap improvement for a fast-path scenario', () => {
    const budget = structuredClone(performanceBudget)
    budget.scenarios.textUpdate.requireCpuOrHeapImprovement = true
    budget.scenarios.textUpdate.maxCpuOrHeapRatio = 0.99

    expect(() => checkAnchorTieringBudget(makeBudgetReport(), makeBudgetReport(), budget)).toThrow(
      AnchorTieringBudgetError,
    )
  })

  it('rejects a suspiciously low mutation count that would hide a skipped update', () => {
    const report = makeBudgetReport()
    report.results.textUpdate.mutations.median = 0
    const budget = structuredClone(performanceBudget)
    budget.scenarios.textUpdate.minMutationRatio = 0.25

    expect(() => checkAnchorTieringBudget(report, makeBudgetReport(), budget)).toThrow(
      /textUpdate.*mutationsRatio.*0.*<.*0\.25/i,
    )
  })
})
