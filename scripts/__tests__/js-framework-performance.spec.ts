// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  checkPerformanceBudget,
  collectWorkspaceArtifactPaths,
  normalizeChromiumResults,
  validateFixtureAssetIsolation,
  verifyWorkspaceArtifactSource,
} from '../js-framework-performance.mjs'

const operationNames = [
  'create1k',
  'replace1k',
  'update10th',
  'select1k',
  'swap1k',
  'remove1k',
  'create10k',
  'append1k',
  'clear1k',
] as const

const makeEntryRound = (offset: number) => ({
  cpu: Object.fromEntries(operationNames.map((name, index) => [name, offset + index + 1])),
  dom: Object.fromEntries(operationNames.map((name, index) => [name, offset + index + 11])),
  heap: {
    ready: offset + 101,
    create1k: offset + 102,
    createClear: offset + 103,
  },
  firstPaint: offset + 201,
})

describe('js-framework Chromium result normalization', () => {
  it('规范化多轮 Chromium 结果', () => {
    const normalized = normalizeChromiumResults([
      {
        entries: {
          rue: makeEntryRound(20),
          'rue-signal': makeEntryRound(120),
          vue: makeEntryRound(220),
        },
      },
      {
        entries: {
          rue: makeEntryRound(0),
          'rue-signal': makeEntryRound(100),
          vue: makeEntryRound(200),
        },
      },
      {
        entries: {
          rue: makeEntryRound(10),
          'rue-signal': makeEntryRound(110),
          vue: makeEntryRound(210),
        },
      },
    ])

    expect(normalized.rue.cpu.create1k).toEqual({
      medianMs: 11,
      validSamples: 3,
      samplesMs: [1, 11, 21],
    })
    expect(normalized.rue.dom.swap1k).toEqual({
      medianMutations: 25,
      validSamples: 3,
      samples: [15, 25, 35],
    })
    expect(normalized.rue.heap.createClear).toEqual({
      medianBytes: 113,
      validSamples: 3,
      samplesBytes: [103, 113, 123],
    })
    expect(normalized['rue-signal'].firstPaint).toEqual({
      medianMs: 311,
      validSamples: 3,
      samplesMs: [301, 311, 321],
    })
    expect(normalized.vue.cpu.create1k).toEqual({
      medianMs: 211,
      validSamples: 3,
      samplesMs: [201, 211, 221],
    })
    expect(Object.keys(normalized.rue.cpu)).toEqual(operationNames)
    expect(Object.keys(normalized['rue-signal'].cpu)).toEqual(operationNames)
    expect(Object.keys(normalized.vue.cpu)).toEqual(operationNames)
  })
})

describe('js-framework workspace artifact validation', () => {
  it('covers nested preserved modules rather than requiring removed monolithic filenames', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'rue-performance-artifacts-'))
    try {
      const expected = [
        'packages/shared/dist/shared.esm-bundler.js',
        'packages/runtime/dist/index.js',
        'packages/runtime/dist/runtime-core/compiled.js',
        'packages/rue/dist/runtime.js',
        'packages/rue/dist/compiler-internal.js',
      ]
      for (const relative of [...expected, 'packages/runtime/dist/index.d.ts']) {
        const file = path.join(root, relative)
        await mkdir(path.dirname(file), { recursive: true })
        await writeFile(file, 'export {}')
      }
      expect(await collectWorkspaceArtifactPaths(root)).toEqual(
        expected.map(file => path.join(root, file)).sort(),
      )
      await rm(path.join(root, 'packages/runtime/dist/runtime-core'), { recursive: true })
      expect(await collectWorkspaceArtifactPaths(root)).not.toContain(path.join(root, expected[2]))
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  const validSource = {
    workspaceRoot: '/workspace/ruejs',
    expectedVersion: '0.8.13',
    packageVersion: '0.8.13',
    packagePath: '/workspace/ruejs/packages/rue/package.json',
    lockfileText: "'@rue-js/rue':\n  version: link:packages/rue\n",
    artifacts: [
      {
        path: '/workspace/ruejs/packages/rue/dist/runtime.js',
        beforeSha256: 'a'.repeat(64),
        afterSha256: 'a'.repeat(64),
      },
      {
        path: '/workspace/ruejs/packages/runtime/dist/runtime-core/reactive-kernel/index.js',
        beforeSha256: 'b'.repeat(64),
        afterSha256: 'b'.repeat(64),
      },
    ],
  }

  it('接受版本、workspace 解析路径、锁文件和哈希一致的本地产物', () => {
    expect(verifyWorkspaceArtifactSource(validSource)).toMatchObject({
      version: '0.8.13',
      packagePath: validSource.packagePath,
      artifactCount: 2,
      hashesStable: true,
    })
  })

  it.each([
    ['版本', { packageVersion: '0.8.12' }, /version.*0\.8\.13.*0\.8\.12/i],
    [
      '解析产物',
      { packagePath: '/workspace/ruejs/node_modules/@rue-js/rue/package.json' },
      /workspace package path/i,
    ],
    ['锁文件', { lockfileText: "'@rue-js/rue':\n  version: 0.8.13\n" }, /workspace link/i],
    [
      '哈希',
      {
        artifacts: [
          {
            ...validSource.artifacts[0],
            afterSha256: 'c'.repeat(64),
          },
        ],
      },
      /hash changed/i,
    ],
  ])('拒绝版本与解析产物不一致：%s', (_label, override, message) => {
    expect(() => verifyWorkspaceArtifactSource({ ...validSource, ...override })).toThrow(message)
  })
})

const sha256 = 'a'.repeat(64)
const entrySha256 = {
  rue: 'b'.repeat(64),
  'rue-signal': 'c'.repeat(64),
  vue: 'd'.repeat(64),
} as const

const makeMeasurement = (medianKey: string, value: number, sampleKey: string) => ({
  [medianKey]: value,
  validSamples: 3,
  [sampleKey]: [value, value, value],
})

const makeReportEntry = (multiplier = 1, entryName: keyof typeof entrySha256 = 'rue') => ({
  cpu: Object.fromEntries(
    operationNames.map(name => [name, makeMeasurement('medianMs', 100 * multiplier, 'samplesMs')]),
  ),
  dom: Object.fromEntries(
    operationNames.map(name => [
      name,
      makeMeasurement(
        'medianMutations',
        name === 'select1k' ? 2 : name === 'swap1k' ? 6 : 10,
        'samples',
      ),
    ]),
  ),
  heap: {
    ready: makeMeasurement('medianBytes', 100 * multiplier, 'samplesBytes'),
    create1k: makeMeasurement('medianBytes', 200 * multiplier, 'samplesBytes'),
    createClear: makeMeasurement('medianBytes', 50 * multiplier, 'samplesBytes'),
  },
  firstPaint: makeMeasurement('medianMs', 50 * multiplier, 'samplesMs'),
  size: {
    javascript: [
      {
        path: `assets/${entryName}.js`,
        rawBytes: 100,
        brotliBytes: 25 * multiplier,
        sha256: entrySha256[entryName],
        isEntry: true,
        moduleIds: [`/workspace/${entryName}.tsx`],
      },
    ],
  },
})

const makePerformanceReport = () => {
  const report = {
    schemaVersion: 2,
    source: {
      workspaceVersion: '0.9.3',
      packageVersion: '0.9.3',
      packagePath: '/workspace/ruejs/packages/rue/package.json',
      lockfileSha256: sha256,
      workspaceArtifacts: [{ path: 'packages/rue/dist/runtime.js', sha256 }],
      chromeExecutable: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      chromeVersion: '148.0.7778.97',
      gitCommit: sha256.slice(0, 40),
      vueVersion: '3.5.40',
      vuePackagePath: '/workspace/ruejs/node_modules/vue/package.json',
      vuePackageSha256: sha256,
      fixtureManifestSha256: sha256,
      fixtureModuleManifestSha256: sha256,
    },
    configuration: {
      warmupRounds: 1,
      measuredRounds: 3,
      entries: ['rue', 'rue-signal', 'vue'],
      operations: operationNames,
    },
    results: {
      rue: makeReportEntry(0.5, 'rue'),
      'rue-signal': makeReportEntry(0.5, 'rue-signal'),
      vue: makeReportEntry(0.5, 'vue'),
    },
  }
  for (const entryName of ['rue', 'rue-signal', 'vue'] as const) {
    report.results[entryName].cpu.select1k.medianMs = 40
    report.results[entryName].cpu.swap1k.medianMs = 40
  }
  return report
}

const performanceBaseline = {
  schemaVersion: 1,
  source: {
    workspaceVersion: '0.9.3',
    packageVersion: '0.9.3',
    lockfileSha256: sha256,
    workspaceArtifacts: [{ path: 'packages/rue/dist/runtime.js', sha256 }],
  },
  configuration: {
    measuredRounds: 3,
    entries: ['rue', 'rue-signal'],
    operations: operationNames,
  },
  results: {
    rue: makeReportEntry(1, 'rue'),
    'rue-signal': makeReportEntry(1, 'rue-signal'),
  },
}

const performanceBudget = {
  schemaVersion: 1,
  baselineWorkspaceVersion: '0.9.3',
  requiredEntries: ['rue', 'rue-signal', 'vue'],
  minimumValidSamples: 3,
  rueEntries: ['rue', 'rue-signal'],
  cpu: {
    maxWeightedMedianRatio: 0.75,
    weights: Object.fromEntries(operationNames.map(name => [name, 1])),
  },
  operations: {
    create1k: { maxRatio: 1.1 },
    select1k: { maxRatio: 0.4 },
    swap1k: { maxRatio: 0.4 },
  },
  heap: {
    createClear: { maxRatio: 0.5 },
  },
  size: {
    brotli: { maxRatio: 0.5 },
  },
  firstPaint: { maxRatio: 0.5 },
  dom: {
    select1k: { maxMutations: 2 },
    swap1k: { maxMutations: 6 },
  },
  sameRunVue: {
    entry: 'rue-signal',
    referenceEntry: 'vue',
    cpu: {
      maxWeightedGeometricMeanRatio: 1,
      weights: {
        create1k: 0.64280248137063,
        replace1k: 0.5607178150466176,
        update10th: 0.5643800750716564,
        select1k: 0.1925635870170522,
        swap1k: 0.13200612879341714,
        remove1k: 0.5277091212292658,
        create10k: 0.5644449600965534,
        append1k: 0.5508359820582848,
        clear1k: 0.4225836631419211,
      },
    },
    operations: {
      update10th: { maxRatio: 1.05 },
      select1k: { maxRatio: 1.05 },
      swap1k: { maxRatio: 1.05 },
      clear1k: { maxRatio: 1.1 },
    },
    heap: {
      ready: { maxRatio: 1.1 },
      create1k: { maxRatio: 1.1 },
      createClear: { maxRatio: 1.1 },
    },
    size: { brotli: { maxRatio: 1 } },
    firstPaint: { maxRatio: 1.1 },
  },
}

const mergeConfiguredBudget = (configuredBudget: Record<string, any>) => ({
  ...performanceBudget,
  ...configuredBudget,
  operations: { ...performanceBudget.operations, ...configuredBudget.operations },
  heap: { ...performanceBudget.heap, ...configuredBudget.heap },
  size: { ...performanceBudget.size, ...configuredBudget.size },
  firstPaint: { ...performanceBudget.firstPaint, ...configuredBudget.firstPaint },
  sameRunVue: { ...performanceBudget.sameRunVue, ...configuredBudget.sameRunVue },
})

describe('js-framework performance budget', () => {
  it('接受所有字段位于预算边界且包含 Vue 对照的报告', () => {
    expect(
      checkPerformanceBudget(makePerformanceReport(), performanceBaseline, performanceBudget),
    ).toMatchObject({
      passed: true,
      entries: {
        rue: {
          cpuWeightedMedianRatio: 0.5,
          select1kRatio: 0.4,
          swap1kRatio: 0.4,
          createClearHeapRatio: 0.5,
          brotliRatio: 0.5,
          firstPaintRatio: 0,
        },
      },
      comparison: {
        vue: {
          rueSignal: {
            cpuWeightedGeometricMeanRatio: 1,
            update10thRatio: 1,
            select1kRatio: 1,
            swap1kRatio: 1,
            clear1kRatio: 1,
            heapReadyRatio: 1,
            heapCreate1kRatio: 1,
            heapCreateClearRatio: 1,
            brotliRatio: 1,
            firstPaintRatio: 1,
          },
        },
      },
    })
  })

  it.each([
    [
      'CPU 加权几何均值',
      (report: ReturnType<typeof makePerformanceReport>) => {
        for (const operation of operationNames) {
          report.results['rue-signal'].cpu[operation].medianMs =
            report.results.vue.cpu[operation].medianMs * 1.12
        }
      },
      /rue-signal.*vue.*cpu.*weighted.*1\.12.*1/i,
    ],
    [
      'update',
      (report: ReturnType<typeof makePerformanceReport>) => {
        report.results['rue-signal'].cpu.update10th.medianMs = 52.51
      },
      /rue-signal.*vue.*update10th.*1\.0502.*1\.05/i,
    ],
    [
      'select',
      (report: ReturnType<typeof makePerformanceReport>) => {
        report.results['rue-signal'].cpu.select1k.medianMs = 42.01
      },
      /rue-signal.*vue.*select1k.*1\.05025.*1\.05/i,
    ],
    [
      'swap',
      (report: ReturnType<typeof makePerformanceReport>) => {
        report.results['rue-signal'].cpu.swap1k.medianMs = 42.01
      },
      /rue-signal.*vue.*swap1k.*1\.05025.*1\.05/i,
    ],
    [
      'ready heap',
      (report: ReturnType<typeof makePerformanceReport>) => {
        report.results['rue-signal'].heap.ready.medianBytes = 55.01
      },
      /rue-signal.*vue.*heap\.ready.*1\.1002.*1\.1/i,
    ],
    [
      'create heap',
      (report: ReturnType<typeof makePerformanceReport>) => {
        report.results['rue-signal'].heap.create1k.medianBytes = 110.01
      },
      /rue-signal.*vue.*heap\.create1k.*1\.1001.*1\.1/i,
    ],
    [
      'run-clear heap',
      (report: ReturnType<typeof makePerformanceReport>) => {
        report.results['rue-signal'].heap.createClear.medianBytes = 27.51
      },
      /rue-signal.*vue.*heap\.createClear.*1\.1004.*1\.1/i,
    ],
    [
      'Brotli',
      (report: ReturnType<typeof makePerformanceReport>) => {
        report.results['rue-signal'].size.javascript[0].brotliBytes = 12.51
      },
      /rue-signal.*vue.*brotli.*1\.0008.*1/i,
    ],
    [
      'first paint',
      (report: ReturnType<typeof makePerformanceReport>) => {
        report.results['rue-signal'].firstPaint.medianMs = 27.51
      },
      /rue-signal.*vue.*firstPaint.*1\.1004.*1\.1/i,
    ],
  ])('拒绝同轮 Vue 相对超限结果：%s', (_label, mutate, message) => {
    const report = makePerformanceReport()
    mutate(report)
    expect(() => checkPerformanceBudget(report, performanceBaseline, performanceBudget)).toThrow(
      message,
    )
  })

  it('拒绝同轮 clear1k 超过配置的 Vue 比率', () => {
    const configuredBudget = JSON.parse(
      readFileSync('scripts/js-framework-performance-budget.json', 'utf8'),
    )
    const report = makePerformanceReport()
    report.results['rue-signal'].cpu.clear1k.medianMs = 55.005

    expect(() =>
      checkPerformanceBudget(report, performanceBaseline, {
        ...mergeConfiguredBudget(configuredBudget),
        minimumValidSamples: 3,
      }),
    ).toThrow(/rue-signal.*vue.*clear1k.*1\.1001.*1\.1/i)
  })

  it('拒绝同轮总体 CPU 超过配置的 Vue 比率', () => {
    const configuredBudget = JSON.parse(
      readFileSync('scripts/js-framework-performance-budget.json', 'utf8'),
    )
    const report = makePerformanceReport()
    for (const operation of operationNames) {
      report.results.vue.cpu[operation].medianMs =
        report.results['rue-signal'].cpu[operation].medianMs / 1.0001
    }

    expect(() =>
      checkPerformanceBudget(report, performanceBaseline, {
        ...mergeConfiguredBudget(configuredBudget),
        minimumValidSamples: 3,
      }),
    ).toThrow(/rue-signal.*vue.*cpu.*weighted.*1\.0001.*1/i)
  })

  it('拒绝单独超限的 create1k，不能被其他快速场景掩盖', () => {
    const configuredBudget = JSON.parse(
      readFileSync('scripts/js-framework-performance-budget.json', 'utf8'),
    )
    const report = makePerformanceReport()
    report.results.rue.cpu.create1k.medianMs = 110.01
    expect(() =>
      checkPerformanceBudget(report, performanceBaseline, {
        ...mergeConfiguredBudget(configuredBudget),
        minimumValidSamples: 3,
      }),
    ).toThrow(/rue.*create1k.*1\.1001.*1\.1/i)
  })

  it('拒绝同轮首屏超过配置的 Vue 比率', () => {
    const configuredBudget = JSON.parse(
      readFileSync('scripts/js-framework-performance-budget.json', 'utf8'),
    )
    const report = makePerformanceReport()
    report.results['rue-signal'].firstPaint.medianMs = 27.505

    expect(() =>
      checkPerformanceBudget(report, performanceBaseline, {
        ...mergeConfiguredBudget(configuredBudget),
        minimumValidSamples: 3,
      }),
    ).toThrow(/rue-signal.*vue.*firstPaint.*1\.1002.*1\.1/i)
  })

  it('拒绝总体 CPU 与 swap1k 超过配置的基线比率', () => {
    const configuredBudget = JSON.parse(
      readFileSync('scripts/js-framework-performance-budget.json', 'utf8'),
    )
    const cpuReport = makePerformanceReport()
    for (const operation of operationNames) cpuReport.results.rue.cpu[operation].medianMs = 125.01
    expect(() =>
      checkPerformanceBudget(cpuReport, performanceBaseline, {
        ...mergeConfiguredBudget(configuredBudget),
        minimumValidSamples: 3,
      }),
    ).toThrow(/rue.*cpu.*weighted.*1\.2501.*1\.25/i)

    const swapReport = makePerformanceReport()
    swapReport.results.rue.cpu.swap1k.medianMs = 150.01
    expect(() =>
      checkPerformanceBudget(swapReport, performanceBaseline, {
        ...mergeConfiguredBudget(configuredBudget),
        minimumValidSamples: 3,
      }),
    ).toThrow(/rue.*swap1k.*1\.5001.*1\.5/i)

    const firstPaintReport = makePerformanceReport()
    firstPaintReport.results.rue.firstPaint.medianMs = 56.2525
    expect(() =>
      checkPerformanceBudget(firstPaintReport, performanceBaseline, {
        ...mergeConfiguredBudget(configuredBudget),
        minimumValidSamples: 3,
      }),
    ).toThrow(/rue.*firstPaint.*1\.2501.*1\.25/i)
  })

  it('接受同轮及基线配置的边界值', () => {
    const configuredBudget = JSON.parse(
      readFileSync('scripts/js-framework-performance-budget.json', 'utf8'),
    )
    const cpuBoundary = checkPerformanceBudget(makePerformanceReport(), performanceBaseline, {
      ...mergeConfiguredBudget(configuredBudget),
      minimumValidSamples: 3,
    })
    const clearBoundaryReport = makePerformanceReport()
    clearBoundaryReport.results['rue-signal'].cpu.clear1k.medianMs = 55
    clearBoundaryReport.results['rue-signal'].cpu.create1k.medianMs = 45
    const clearBoundary = checkPerformanceBudget(clearBoundaryReport, performanceBaseline, {
      ...mergeConfiguredBudget(configuredBudget),
      minimumValidSamples: 3,
    })
    const firstPaintBoundaryReport = makePerformanceReport()
    firstPaintBoundaryReport.results['rue-signal'].firstPaint.medianMs = 27.5
    const firstPaintBoundary = checkPerformanceBudget(
      firstPaintBoundaryReport,
      performanceBaseline,
      {
        ...mergeConfiguredBudget(configuredBudget),
        minimumValidSamples: 3,
      },
    )
    const baselineBoundaryReport = makePerformanceReport()
    for (const operation of operationNames)
      baselineBoundaryReport.results.rue.cpu[operation].medianMs = 125
    baselineBoundaryReport.results.rue.cpu.create1k.medianMs = 110
    baselineBoundaryReport.results.rue.cpu.swap1k.medianMs = 150
    baselineBoundaryReport.results.rue.firstPaint.medianMs = 56.25
    const baselineBoundary = checkPerformanceBudget(baselineBoundaryReport, performanceBaseline, {
      ...mergeConfiguredBudget(configuredBudget),
      minimumValidSamples: 3,
    })

    expect(cpuBoundary.comparison.vue.rueSignal.cpuWeightedGeometricMeanRatio).toBe(1)
    expect(clearBoundary.comparison.vue.rueSignal.clear1kRatio).toBe(1.1)
    expect(firstPaintBoundary.comparison.vue.rueSignal.firstPaintRatio).toBe(1.1)
    expect(baselineBoundary.entries.rue.create1kRatio).toBe(1.1)
    expect(baselineBoundary.entries.rue.cpuWeightedMedianRatio).toBe(1.25)
    expect(baselineBoundary.entries.rue.swap1kRatio).toBe(1.5)
    expect(baselineBoundary.entries.rue.firstPaintRatio).toBe(1.25)
  })

  it('固化 0.9.3 回归验证收紧后的可重复门禁', () => {
    const configuredBudget = JSON.parse(
      readFileSync('scripts/js-framework-performance-budget.json', 'utf8'),
    )

    expect(configuredBudget).toMatchObject({
      baselineWorkspaceVersion: '0.9.3',
      cpu: { maxWeightedMedianRatio: 1.25 },
      operations: {
        select1k: { maxRatio: 1.5 },
        swap1k: { maxRatio: 1.5 },
      },
      firstPaint: { maxRatio: 1.25 },
      sameRunVue: {
        cpu: { maxWeightedGeometricMeanRatio: 1 },
        operations: {
          update10th: { maxRatio: 1.05 },
          swap1k: { maxRatio: 1.05 },
          clear1k: { maxRatio: 1.1 },
        },
        heap: {
          ready: { maxRatio: 1.1 },
          create1k: { maxRatio: 1.6 },
          createClear: { maxRatio: 1.1 },
        },
        firstPaint: { maxRatio: 1.1 },
      },
    })
  })

  it('拒绝 rue 与 rue-signal 复用同一入口资产', () => {
    const report = makePerformanceReport()
    report.results['rue-signal'].size.javascript[0].sha256 =
      report.results.rue.size.javascript[0].sha256

    expect(() => validateFixtureAssetIsolation(report)).toThrow(/rue.*rue-signal.*entry.*sha-256/i)
  })

  it('记录三个入口的独立 entry、moduleIds 与正确运行时边界', () => {
    const report = makePerformanceReport()
    report.results.rue.size.javascript[0].moduleIds = [
      '/workspace/main-ref.tsx',
      '/workspace/packages/rue/dist/runtime.js',
    ]
    report.results['rue-signal'].size.javascript[0].moduleIds = [
      '/workspace/main-signal.tsx',
      '/workspace/packages/rue/dist/compiler-internal.js',
    ]
    report.results.vue.size.javascript[0].moduleIds = [
      '/workspace/vue.ts',
      '/workspace/vue.runtime.esm-bundler.js',
    ]

    expect(validateFixtureAssetIsolation(report)).toMatchObject({
      entrySha256: {
        rue: entrySha256.rue,
        'rue-signal': entrySha256['rue-signal'],
        vue: entrySha256.vue,
      },
      moduleIds: {
        rue: expect.arrayContaining([expect.stringContaining('main-ref.tsx')]),
        'rue-signal': expect.arrayContaining([expect.stringContaining('compiler-internal')]),
        vue: expect.arrayContaining([expect.stringContaining('vue.ts')]),
      },
    })
  })

  it.each([
    [
      'CPU 加权中位数',
      (report: ReturnType<typeof makePerformanceReport>) => {
        for (const operation of operationNames) report.results.rue.cpu[operation].medianMs = 76
      },
      /cpu.*weighted.*0\.76.*0\.75/i,
    ],
    [
      'select',
      (report: ReturnType<typeof makePerformanceReport>) => {
        report.results.rue.cpu.select1k.medianMs = 41
      },
      /select1k.*0\.41.*0\.4/i,
    ],
    [
      'swap',
      (report: ReturnType<typeof makePerformanceReport>) => {
        report.results.rue.cpu.swap1k.medianMs = 41
      },
      /swap1k.*0\.41.*0\.4/i,
    ],
    [
      'run-clear heap',
      (report: ReturnType<typeof makePerformanceReport>) => {
        report.results.rue.heap.createClear.medianBytes = 25.5
      },
      /createClear.*0\.51.*0\.5/i,
    ],
    [
      'Brotli',
      (report: ReturnType<typeof makePerformanceReport>) => {
        report.results.rue.size.javascript[0].brotliBytes = 12.75
      },
      /brotli.*0\.51.*0\.5/i,
    ],
    [
      'first paint',
      (report: ReturnType<typeof makePerformanceReport>) => {
        report.results.rue.firstPaint.medianMs = 37.51
      },
      /firstPaint.*0\.5004.*0\.5/i,
    ],
    [
      'selection DOM',
      (report: ReturnType<typeof makePerformanceReport>) => {
        report.results.rue.dom.select1k.medianMutations = 3
      },
      /dom\.select1k.*3.*2/i,
    ],
    [
      'swap DOM',
      (report: ReturnType<typeof makePerformanceReport>) => {
        report.results.rue.dom.swap1k.medianMutations = 7
      },
      /dom\.swap1k.*7.*6/i,
    ],
  ])('拒绝超限结果：%s', (_label, mutate, message) => {
    const report = makePerformanceReport()
    mutate(report)
    expect(() => checkPerformanceBudget(report, performanceBaseline, performanceBudget)).toThrow(
      message,
    )
  })

  it('只校验 JavaScript 工作区产物，不再接线 runtime-vapor Wasm', () => {
    const source = readFileSync(path.resolve('scripts/js-framework-performance.mjs'), 'utf8')
    const viteSource = readFileSync(
      path.resolve('packages/runtime/__benchmarks__/js-framework/vite.config.ts'),
      'utf8',
    )

    expect(`${source}\n${viteSource}`).not.toMatch(
      /runtime-vapor\/pkg|rue_runtime_vapor_bg|vite-plugin-wasm/,
    )
  })

  it('fixture 使用三个独立 HTML/entry，signal 入口只导入 compiled 子路径', () => {
    const mainSource = readFileSync(
      path.resolve('packages/runtime/__benchmarks__/js-framework/main.tsx'),
      'utf8',
    )
    const refSource = readFileSync(
      path.resolve('packages/runtime/__benchmarks__/js-framework/main-ref.tsx'),
      'utf8',
    )
    const signalSource = readFileSync(
      path.resolve('packages/runtime/__benchmarks__/js-framework/main-signal.tsx'),
      'utf8',
    )
    const signalHtml = readFileSync(
      path.resolve('packages/runtime/__benchmarks__/js-framework/rue-signal.html'),
      'utf8',
    )
    const viteSource = readFileSync(
      path.resolve('packages/runtime/__benchmarks__/js-framework/vite.config.ts'),
      'utf8',
    )

    expect(mainSource).toMatch(/main-ref/)
    expect(refSource).toContain("from '@rue-js/rue'")
    expect(signalSource).toContain("from '@rue-js/rue/internal/compiler'")
    expect(signalSource).not.toMatch(/@rue-js\/rue(?:\/vapor)?['"]|main-ref|useRefState/)
    expect(signalHtml).toMatch(/main-signal\.tsx/)
    expect(viteSource).toMatch(/['"]rue-signal['"]\s*:/)
    expect(viteSource).toMatch(/manifest\s*:\s*true/)
    expect(viteSource).toContain("workspaceProductionEntry('rue', './internal/compiler')")
  })

  it('拒绝 signal 入口携带完整 internal、js-reactive、SSR 或 Wasm 模块', () => {
    for (const forbidden of [
      '/workspace/runtime.internal.esm-bundler.js',
      '/workspace/packages/runtime/dist/internal.js',
      '/workspace/packages/rue/dist/internal.js',
      '/workspace/packages/runtime/dist/server.js',
      '/workspace/packages/runtime/dist/island.js',
      '/workspace/runtime-core/js-reactive/index.ts',
      '/workspace/runtime.server.esm-bundler.js',
      '/workspace/runtime-vapor/pkg/runtime_bg.wasm',
    ]) {
      const report = makePerformanceReport()
      report.results['rue-signal'].size.javascript[0].moduleIds.push(forbidden)
      expect(() => validateFixtureAssetIsolation(report)).toThrow(/rue-signal.*forbidden/i)
    }
  })

  it.each([
    [
      'Vue 对照',
      (report: ReturnType<typeof makePerformanceReport>) => {
        delete (report.results as Partial<typeof report.results>).vue
      },
      /missing.*vue/i,
    ],
    [
      'workspace 版本',
      (report: ReturnType<typeof makePerformanceReport>) => {
        report.source.workspaceVersion = ''
      },
      /workspaceVersion/i,
    ],
    [
      'Vue 版本',
      (report: ReturnType<typeof makePerformanceReport>) => {
        report.source.vueVersion = ''
      },
      /vueVersion/i,
    ],
    [
      '产物 hash',
      (report: ReturnType<typeof makePerformanceReport>) => {
        report.source.workspaceArtifacts[0].sha256 = ''
      },
      /sha-256.*workspaceArtifacts/i,
    ],
    [
      '有效样本',
      (report: ReturnType<typeof makePerformanceReport>) => {
        report.results.rue.cpu.create1k.validSamples = 2
      },
      /valid samples.*create1k.*2.*3/i,
    ],
  ])('拒绝不完整报告：%s', (_label, mutate, message) => {
    const report = makePerformanceReport()
    mutate(report)
    expect(() => checkPerformanceBudget(report, performanceBaseline, performanceBudget)).toThrow(
      message,
    )
  })
})

describe('release performance gate', () => {
  it('发布不受性能预算阻断，同时保留手动固定报告命令', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
    const releaseSource = readFileSync('scripts/release.js', 'utf8')

    expect(packageJson.scripts['benchmark:js-framework:check']).toBe(
      'pnpm run benchmark:js-framework -- --compare scripts/js-framework-performance-baseline.json --budget scripts/js-framework-performance-budget.json --output temp/performance/final.json',
    )
    expect(releaseSource).toContain("await run('pnpm', ['run', 'size-runtime', '--', '--check'])")
    expect(releaseSource).not.toContain("['run', 'benchmark:js-framework:check']")
  })
})
