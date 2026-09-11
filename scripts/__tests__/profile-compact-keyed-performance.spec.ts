import { describe, expect, it } from 'vitest'

import {
  PROFILE_SCHEMA_VERSION,
  calculateLinearSlope,
  instrumentAppendAllocationSites,
  instrumentOwnerlessLifecycleSites,
  validateResourceBudgets,
} from '../profile-compact-keyed-performance.mjs'

const counterMedian = (value: number) => ({ median: value })

const passingScenarios = () => ({
  create1k: {
    counters: {
      generalKeyedRowMounts: counterMedian(0),
      keyedOwnersCreated: counterMedian(0),
      ownerlessKeyedRowMounts: counterMedian(1_000),
      compactCleanupRegistrations: counterMedian(2_000),
    },
  },
  create10k: {
    counters: {
      generalKeyedRowMounts: counterMedian(0),
      keyedOwnersCreated: counterMedian(0),
      ownerlessKeyedRowMounts: counterMedian(10_000),
    },
  },
  append1k: {
    counters: {
      appendSetConstructions: counterMedian(1),
      generalKeyedRowMounts: counterMedian(0),
      oldMapConstructions: counterMedian(0),
      ownerlessKeyedRowMounts: counterMedian(1_000),
    },
  },
  clear1k: {
    counters: {
      compactCleanupCallbacks: counterMedian(2_000),
      generalKeyedRowDisposes: counterMedian(0),
      ownerlessKeyedRowDisposes: counterMedian(1_000),
    },
  },
  swap1k: {
    counters: {
      rangeMoves: counterMedian(2),
    },
  },
})

describe('compact keyed profiler instrumentation', () => {
  it('instruments ownerless mounts, disposes and compact cleanup callbacks', () => {
    const source = `
export const _$mountCompiledKeyedSingleRowOwnerless = <T>(factory: unknown) => {
  const parent = target?.parent ?? createDocumentFragment()
  const cleanups: Array<() => void> = []
  for (const cleanup of cleanups.splice(0)) collectError(errors, cleanup)
  return {
      dispose: () => {
        const errors: unknown[] = []
      }
  }
}
`
    const instrumented = instrumentOwnerlessLifecycleSites(source)

    expect(instrumented).toContain("profileCount('ownerlessKeyedRowMounts')")
    expect(instrumented).toContain("profileCount('ownerlessKeyedRowDisposes')")
    expect(instrumented).toContain("profileCount('compactCleanupCallbacks')")
  })

  it('rejects ownerless instrumentation when a required source shape drifts', () => {
    expect(() => instrumentOwnerlessLifecycleSites('export const unrelated = 1')).toThrow(
      /source shape changed/,
    )
  })

  it('separates stable append Set construction from old-row Map construction', () => {
    const source = `
const uniqueTailKeys = new Set(tailKeys)
const old = new Map(previous.map(row => [row.key, row]))
`
    const instrumented = instrumentAppendAllocationSites(source)

    expect(instrumented).toContain("profileCount('appendSetConstructions')")
    expect(instrumented).toContain("profileCount('oldMapConstructions')")
  })
})

describe('compact keyed profiler resource gates', () => {
  it('uses a new schema and accepts deterministic ownerless/append/cleanup budgets', () => {
    expect(PROFILE_SCHEMA_VERSION).toBe(5)
    expect(() =>
      validateResourceBudgets({
        scenarios: passingScenarios(),
        memoryGate: {
          compactCleanupCallbacks: 12_000,
          compactCleanupRegistrations: 12_000,
          generalKeyedRowDisposes: 0,
          generalKeyedRowMounts: 0,
          keyedOwnersCreated: 0,
          ownerlessKeyedRowDisposes: 6_000,
          ownerlessKeyedRowMounts: 6_000,
          retainedHeapSlopeBytesPerCycle: 8_192,
        },
      }),
    ).not.toThrow()
  })

  it('rejects owner allocation, old append Maps, cleanup imbalance and linear heap growth', () => {
    const scenarios = passingScenarios()
    scenarios.create1k.counters.keyedOwnersCreated = counterMedian(1_000)
    scenarios.append1k.counters.oldMapConstructions = counterMedian(1)

    expect(() =>
      validateResourceBudgets({
        scenarios,
        memoryGate: {
          compactCleanupCallbacks: 5_999,
          compactCleanupRegistrations: 6_000,
          generalKeyedRowDisposes: 0,
          generalKeyedRowMounts: 0,
          keyedOwnersCreated: 1,
          ownerlessKeyedRowDisposes: 6_000,
          ownerlessKeyedRowMounts: 6_000,
          retainedHeapSlopeBytesPerCycle: 512 * 1024,
        },
      }),
    ).toThrow(
      /resource budget failed.*keyedOwnersCreated.*oldMapConstructions.*cleanup balance.*retained heap slope/s,
    )
  })

  it('calculates retained heap slope across ordered forced-GC samples', () => {
    expect(calculateLinearSlope([100, 125, 150, 175])).toBe(25)
    expect(calculateLinearSlope([175, 150, 125, 100])).toBe(-25)
  })
})
