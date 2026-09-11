import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { chromium } from 'playwright-core'
import { build } from 'vite'

export const PROFILE_SCHEMA_VERSION = 5

export const RESOURCE_BUDGETS = Object.freeze({
  retainedHeapSlopeBytesPerCycle: 64 * 1024,
  swapRangeMoves: 2,
})

export const REFERENCE_BENCHMARK_SUMMARY = Object.freeze({
  measuredRounds: 6,
  metric: 'nine-operation CPU geometric ratio',
  rueVsVueJsx: 0.967,
  rueVsVueVapor: 1.154,
})

export const PROFILE_SCENARIOS = [
  'create1k',
  'create10k',
  'replace1k',
  'update10th',
  'append1k',
  'clear1k',
  'run-memory',
  'select1k',
  'swap1k',
  'remove1k',
]

export const COUNTER_NAMES = [
  'reconciles',
  'rowMounts',
  'rowPatches',
  'indexOnlyPatches',
  'rowDisposes',
  'generalKeyedRowMounts',
  'generalKeyedRowDisposes',
  'ownerlessKeyedRowMounts',
  'ownerlessKeyedRowDisposes',
  'keyReads',
  'mapConstructions',
  'setConstructions',
  'oldMapConstructions',
  'appendSetConstructions',
  'rangeChecks',
  'rangeMoves',
  'signals',
  'effects',
  'ownersCreated',
  'ownersDisposed',
  'documentFragments',
  'clones',
  'appendChild',
  'insertBefore',
  'removeChild',
  'rangeDeletes',
  'keyedOwnersCreated',
  'rootOwnersCreated',
  'ownerCleanupCallbacks',
  'compactCleanupRegistrations',
  'compactCleanupCallbacks',
  'listenersAdded',
  'listenersRemoved',
  'textNodesCreated',
  'textHoleReplacements',
  'batchPositionChecks',
  'rowRecordCopies',
  'rowRecordReuses',
  'individualRowDeletes',
  'privateMountMetadata',
]

const workspaceRoot = path.resolve(import.meta.dirname, '..')
const benchmarkRoot = path.resolve(
  workspaceRoot,
  '../js-framework-benchmark/frameworks/keyed/rue-signal',
)
const benchmarkSuiteRoot = path.resolve(benchmarkRoot, '../../..')
const profileRoot = path.resolve(workspaceRoot, 'temp/compact-keyed-profile')
const profileDist = path.resolve(profileRoot, 'dist')
const defaultOutput = path.resolve(profileRoot, 'profile.json')
const defaultEvidence = path.resolve(
  workspaceRoot,
  '.plans/2026-09-11-keyed行轻量生命周期性能/evidence/4-profile.md',
)
const compactKeyedSource = path.resolve(
  workspaceRoot,
  'packages/runtime/src/compiler-runtime/compact-keyed-list.ts',
)
const fixtureSource = path.resolve(benchmarkRoot, 'src/main.tsx')
const workspacePackage = path.resolve(workspaceRoot, 'packages/rue/package.json')
const benchmarkPackage = path.resolve(benchmarkRoot, 'package.json')
const localRuePackage = path.resolve(benchmarkRoot, 'node_modules/@rue-js/rue/package.json')

const round = value => Number(value.toFixed(3))

const percentile = (sorted, fraction) => {
  const position = (sorted.length - 1) * fraction
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower)
}

export const summarizeSamples = values => {
  const samples = values
    .filter(Number.isFinite)
    .slice()
    .sort((left, right) => left - right)
  if (samples.length === 0) throw new Error('Cannot summarize an empty sample set')
  return {
    samples,
    validSamples: samples.length,
    median: round(percentile(samples, 0.5)),
    p25: round(percentile(samples, 0.25)),
    p75: round(percentile(samples, 0.75)),
    min: round(samples[0]),
    max: round(samples.at(-1)),
  }
}

export const rotateScenarios = (scenarios, roundIndex) => {
  if (scenarios.length === 0) return []
  const offset = ((roundIndex % scenarios.length) + scenarios.length) % scenarios.length
  return [...scenarios.slice(offset), ...scenarios.slice(0, offset)]
}

const profileHelper = `
const profileCount = name => {
  const counters = globalThis.__RUE_PROFILE_COUNTERS__
  if (counters != null) counters[name] = (counters[name] ?? 0) + 1
}
`

export const instrumentSites = (source, sites) => {
  for (const [search, replacement, label, expected = 1] of sites) {
    const count = source.split(search).length - 1
    if (count !== expected) {
      throw new Error(
        `Unable to instrument ${label}; expected ${expected} hits, found ${count}; source shape changed`,
      )
    }
    source = source.replaceAll(search, replacement)
  }
  return source
}

const counted = (search, counter, expected = 1) => [
  search,
  `(profileCount('${counter}'), ${search})`,
  counter,
  expected,
]

export const instrumentAppendAllocationSites = source =>
  instrumentSites(source, [
    [
      'const uniqueTailKeys = new Set(tailKeys)',
      "const uniqueTailKeys = (profileCount('appendSetConstructions'), profileCount('setConstructions'), new Set(tailKeys))",
      'stable append Set',
    ],
    [
      'const old = new Map(previous.map(row => [row.key, row]))',
      "const old = (profileCount('oldMapConstructions'), profileCount('mapConstructions'), new Map(previous.map(row => [row.key, row])))",
      'old-row Map',
    ],
  ])

export const instrumentOwnerlessLifecycleSites = source =>
  instrumentSites(source, [
    [
      ') => {\n  const parent = target?.parent ?? createDocumentFragment()\n  const cleanups: Array<() => void> = []',
      ") => {\n  profileCount('ownerlessKeyedRowMounts')\n  const parent = target?.parent ?? createDocumentFragment()\n  const cleanups: Array<() => void> = []",
      'ownerless row mount',
    ],
    [
      'for (const cleanup of cleanups.splice(0)) collectError(errors, cleanup)',
      "for (const cleanup of cleanups.splice(0)) { profileCount('compactCleanupCallbacks'); collectError(errors, cleanup) }",
      'compact cleanup callbacks',
    ],
    [
      'dispose: () => {\n        const errors: unknown[] = []',
      "dispose: () => {\n        profileCount('ownerlessKeyedRowDisposes')\n        const errors: unknown[] = []",
      'ownerless row dispose',
    ],
  ])

export const instrumentCompactKeyedSource = input => {
  let source = instrumentAppendAllocationSites(input)
  source = instrumentOwnerlessLifecycleSites(source)
  source = instrumentSites(source, [
    [
      '): CompactCompiledKeyedRow<T, K>[] => {\n  let result',
      "): CompactCompiledKeyedRow<T, K>[] => {\n  profileCount('reconciles')\n  let result",
      'range reconcile',
    ],
    counted('getKey(items[index], index)', 'keyReads'),
    counted('getKey(item, previous.length + offset)', 'keyReads'),
    [
      'const keys = items.map(getKey)',
      "const keys = items.map((item, index) => { profileCount('keyReads'); return getKey(item, index) })",
      'full key reads',
    ],
    counted('new Set(keys)', 'setConstructions'),
    [
      'if (itemChanged || (rowUsesIndex && indexChanged)) {\n    row.patch(item, index)',
      "if (itemChanged || (rowUsesIndex && indexChanged)) {\n    if (!itemChanged && indexChanged) profileCount('indexOnlyPatches');\n    row.patch(item, index)",
      'index-only patches',
    ],
    counted('row.patch(item, index)', 'rowPatches', 2),
    counted('row.dispose()', 'rowDisposes', 6),
    counted('createOwner()', 'keyedOwnersCreated', 2),
    [
      '): void => {\n  // Initialize row signals',
      "): void => {\n  profileCount('rowMounts')\n  // Initialize row signals",
      'row mounts',
    ],
    [
      'const row = mounted as CompactCompiledKeyedRow<T, K>',
      "profileCount('rowRecordReuses'); const row = mounted as CompactCompiledKeyedRow<T, K>",
      'row record reuses',
    ],
    ['const row = {', "profileCount('rowRecordCopies'); const row = {", 'row record copies'],
    [
      'mounted.dispose = () => {\n        try {',
      "mounted.dispose = () => {\n        profileCount('generalKeyedRowDisposes')\n        try {",
      'general row dispose',
    ],
    [
      'export const _$mountCompiledKeyedRow = <T>(\n  factory:',
      'export const _$mountCompiledKeyedRow = <T>(\n  factory:',
      'general row mount declaration',
    ],
    [
      'moveRange(staging, row, null)',
      "profileCount('batchPositionChecks'); moveRange(staging, row, null)",
      'batch position checks',
      1,
    ],
    [
      '): void => {\n  const last = lastNode(row)',
      "): void => {\n  profileCount('rangeChecks')\n  const last = lastNode(row)",
      'range checks',
    ],
    [
      '    return\n  }\n  const after = last.nextSibling',
      "    return\n  }\n  profileCount('rangeMoves')\n  const after = last.nextSibling",
      'range moves',
    ],
    [
      'if (cursor.parentNode === parent) removeChild(parent, cursor)',
      "if (cursor.parentNode === parent) { profileCount('individualRowDeletes'); removeChild(parent, cursor) }",
      'individual row delete',
    ],
    [
      '() => removeChild(parent, cursor!)',
      "() => { profileCount('individualRowDeletes'); removeChild(parent, cursor!) }",
      'fallback row delete',
    ],
  ])
  const generalMountBody = ') => {\n  const owner = initializingRowOwner ??'
  source = instrumentSites(source, [
    [
      generalMountBody,
      ") => {\n  profileCount('generalKeyedRowMounts')\n  const owner = initializingRowOwner ??",
      'general row mount',
    ],
  ])
  return `${profileHelper}\n${source}`
}

export const instrumentCompactRootSource = input =>
  `${profileHelper}\n${instrumentSites(input, [counted('createOwner()', 'rootOwnersCreated')])}`

export const instrumentCompiledRuntimeSource = input => {
  let source = `${profileHelper}\n${input}`
  const allocations = [
    ['signal', 'signals'],
    ['effect', 'effects'],
    ['createOwner', 'ownersCreated'],
    ['disposeOwner', 'ownersDisposed'],
  ]
  for (const [exportName, counterName] of allocations) {
    const declaration = `export const ${exportName}`
    instrumentSites(source, [[declaration + ' =', declaration + ' =', exportName, 1]])
    const start = source.indexOf(declaration)
    if (start < 0) throw new Error(`Unable to instrument ${exportName}; source shape changed`)
    const arrow = source.indexOf('=> {', start)
    if (arrow < 0) throw new Error(`Unable to find ${exportName} body`)
    const insertion = arrow + 4
    source = `${source.slice(0, insertion)}\n  profileCount('${counterName}')${source.slice(insertion)}`
  }
  return instrumentSites(source, [
    [
      'export const setReactiveScheduling = (mode: ReactiveSchedulingMode): void => {',
      "globalThis.__RUE_PROFILE_SCHEDULING_MODE__ = peekSharedReactiveStorage()?.state.schedulingMode ?? 'frame'\nexport const setReactiveScheduling = (mode: ReactiveSchedulingMode): void => {\n  globalThis.__RUE_PROFILE_SCHEDULING_MODE__ = mode",
      'scheduling mode updates',
    ],
    [
      'for (const cleanup of record[OwnerField.Cleanups].splice(0)) attempt(cleanup, undefined)',
      "for (const cleanup of record[OwnerField.Cleanups].splice(0)) { profileCount('ownerCleanupCallbacks'); attempt(cleanup, undefined) }",
      'owner cleanup',
    ],
    [
      'if (currentOwnerCleanupCollector !== undefined) currentOwnerCleanupCollector.push(cleanup)',
      "if (currentOwnerCleanupCollector !== undefined) { profileCount('compactCleanupRegistrations'); currentOwnerCleanupCollector.push(cleanup) }",
      'compact cleanup registration',
    ],
  ])
}

const tracePhase = event => {
  if (/GC|CollectGarbage/i.test(event.name) || /(^|,)v8\.gc/.test(event.cat ?? '')) return 'gc'
  if (/UpdateLayoutTree|RecalculateStyles|ScheduleStyleRecalculation/.test(event.name)) {
    return 'rendering'
  }
  if (event.name === 'Layout') return 'layout'
  if (/Paint|Raster/.test(event.name)) return 'paint'
  if (
    /FunctionCall|EvaluateScript|RunMicrotasks|EventDispatch|TimerFire|FireAnimationFrame|v8\.execute/.test(
      event.name,
    )
  ) {
    return 'scripting'
  }
  return null
}

export const summarizeTrace = events => {
  const mainMetadata = events.find(
    event =>
      event.ph === 'M' && event.name === 'thread_name' && event.args?.name === 'CrRendererMain',
  )
  let thread
  if (mainMetadata) thread = { pid: mainMetadata.pid, tid: mainMetadata.tid }
  else {
    const totals = new Map()
    for (const event of events) {
      if (event.ph !== 'X' || !Number.isFinite(event.dur)) continue
      const key = `${event.pid}:${event.tid}`
      totals.set(key, (totals.get(key) ?? 0) + event.dur)
    }
    const selected = [...totals.entries()].sort((left, right) => right[1] - left[1])[0]?.[0]
    const [pid, tid] = selected?.split(':').map(Number) ?? [null, null]
    thread = { pid, tid }
  }

  const phases = { scripting: 0, rendering: 0, layout: 0, paint: 0, gc: 0 }
  const durations = new Map()
  for (const event of events) {
    if (
      event.ph !== 'X' ||
      event.pid !== thread.pid ||
      event.tid !== thread.tid ||
      !Number.isFinite(event.dur)
    ) {
      continue
    }
    const milliseconds = event.dur / 1_000
    const phase = tracePhase(event)
    if (phase) phases[phase] += milliseconds
    durations.set(event.name, (durations.get(event.name) ?? 0) + milliseconds)
  }
  return {
    thread,
    phasesMs: Object.fromEntries(
      Object.entries(phases).map(([name, value]) => [name, round(value)]),
    ),
    topEvents: [...durations.entries()]
      .map(([name, durationMs]) => ({ name, durationMs: round(durationMs) }))
      .sort((left, right) => right.durationMs - left.durationMs)
      .slice(0, 8),
  }
}

export const captureTrace = async (session, action) => {
  const events = []
  const receiveData = payload => events.push(...(payload.value ?? []))
  let complete
  const completed = new Promise(resolve => {
    complete = resolve
  })
  const receiveComplete = () => complete()
  session.on('Tracing.dataCollected', receiveData)
  session.on('Tracing.tracingComplete', receiveComplete)
  try {
    await session.send('Tracing.start', {
      categories:
        'devtools.timeline,v8,blink.user_timing,disabled-by-default-v8.gc,disabled-by-default-devtools.timeline',
      options: 'sampling-frequency=10000',
      transferMode: 'ReportEvents',
    })
    const value = await action()
    await session.send('Tracing.end')
    await completed
    return { value, summary: summarizeTrace(events) }
  } finally {
    session.off('Tracing.dataCollected', receiveData)
    session.off('Tracing.tracingComplete', receiveComplete)
  }
}

const sha256 = async file =>
  createHash('sha256')
    .update(await fs.readFile(file))
    .digest('hex')

const runCommand = (command, args, cwd = workspaceRoot) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: process.env, stdio: 'inherit' })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code ?? signal}`))
    })
  })

const runCommandOutput = (command, args, cwd = workspaceRoot) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => (stdout += chunk))
    child.stderr.on('data', chunk => (stderr += chunk))
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) resolve(stdout.trim())
      else
        reject(new Error(`${command} ${args.join(' ')} exited with ${code ?? signal}: ${stderr}`))
    })
  })

const chromeCandidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)

const findChrome = async () => {
  for (const candidate of chromeCandidates) {
    try {
      await fs.access(candidate)
      return candidate
    } catch {}
  }
  throw new Error('No Chrome/Chromium executable found; set CHROME_PATH')
}

const buildProfileFixture = async () => {
  await fs.mkdir(profileRoot, { recursive: true })
  const instrumentedSources = {}
  let keyedInstrumented = false
  let compiledInstrumented = false
  let rootInstrumented = false
  const installedRueSource = path.resolve(
    benchmarkRoot,
    'node_modules/@rue-js/rue/src/compiler-internal.ts',
  )
  const installedRuntimeSource = path.resolve(
    benchmarkRoot,
    'node_modules/@rue-js/runtime/src/compiler-internal.ts',
  )
  const installedRueListSource = path.resolve(
    benchmarkRoot,
    'node_modules/@rue-js/rue/src/compiler-runtime/entries/list.ts',
  )
  const installedRuntimeListSource = path.resolve(
    benchmarkRoot,
    'node_modules/@rue-js/runtime/src/compiler-runtime/entries/list.ts',
  )
  const installedRueBlockSource = path.resolve(
    benchmarkRoot,
    'node_modules/@rue-js/rue/src/compiler-runtime/entries/block.ts',
  )
  const installedRuntimeBlockSource = path.resolve(
    benchmarkRoot,
    'node_modules/@rue-js/runtime/src/compiler-runtime/entries/block.ts',
  )
  const installedRueReactiveSource = path.resolve(
    benchmarkRoot,
    'node_modules/@rue-js/rue/src/compiler-runtime/entries/reactive.ts',
  )
  const installedRuntimeReactiveSource = path.resolve(
    benchmarkRoot,
    'node_modules/@rue-js/runtime/src/compiler-runtime/entries/reactive.ts',
  )
  const installedRueEventsSource = path.resolve(
    benchmarkRoot,
    'node_modules/@rue-js/rue/src/compiler-runtime/entries/events.ts',
  )
  const installedRuntimeEventsSource = path.resolve(
    benchmarkRoot,
    'node_modules/@rue-js/runtime/src/compiler-runtime/entries/events.ts',
  )
  const installedRueDomSource = path.resolve(
    benchmarkRoot,
    'node_modules/@rue-js/rue/src/compiler-runtime/entries/dom.ts',
  )
  const installedRuntimeDomSource = path.resolve(
    benchmarkRoot,
    'node_modules/@rue-js/runtime/src/compiler-runtime/entries/dom.ts',
  )
  await build({
    configFile: path.resolve(benchmarkRoot, 'vite.config.ts'),
    root: benchmarkRoot,
    logLevel: 'warn',
    resolve: {
      alias: [
        { find: '@rue-js/rue/internal/reactive', replacement: installedRueReactiveSource },
        { find: '@rue-js/runtime/internal/reactive', replacement: installedRuntimeReactiveSource },
        { find: '@rue-js/rue/internal/events', replacement: installedRueEventsSource },
        { find: '@rue-js/runtime/internal/events', replacement: installedRuntimeEventsSource },
        { find: '@rue-js/rue/internal/dom', replacement: installedRueDomSource },
        { find: '@rue-js/runtime/internal/dom', replacement: installedRuntimeDomSource },
        { find: '@rue-js/rue/internal/block', replacement: installedRueBlockSource },
        { find: '@rue-js/runtime/internal/block', replacement: installedRuntimeBlockSource },
        { find: '@rue-js/rue/internal/list', replacement: installedRueListSource },
        { find: '@rue-js/runtime/internal/list', replacement: installedRuntimeListSource },
        { find: '@rue-js/rue/internal/compiler', replacement: installedRueSource },
        { find: '@rue-js/runtime/internal/compiler', replacement: installedRuntimeSource },
      ],
    },
    plugins: [
      {
        name: 'rue-compact-keyed-profiler',
        enforce: 'pre',
        transform(source, id) {
          const normalized = id.split('?')[0].replaceAll('\\', '/')
          const runtimePath = normalized.split('/runtime/src/')[1]
          if (
            [
              'compiler-runtime/compact-keyed-list.ts',
              'compiler-runtime/block.ts',
              'runtime-core/compiled.ts',
            ].includes(runtimePath)
          ) {
            instrumentedSources[runtimePath] = createHash('sha256').update(source).digest('hex')
          }
          if (normalized.endsWith('/runtime/src/compiler-runtime/compact-keyed-list.ts')) {
            keyedInstrumented = true
            return { code: instrumentCompactKeyedSource(source), map: null }
          }
          if (normalized.endsWith('/runtime/src/compiler-runtime/block.ts')) {
            rootInstrumented = true
            return { code: instrumentCompactRootSource(source), map: null }
          }
          if (normalized.endsWith('/runtime/src/runtime-core/compiled.ts')) {
            compiledInstrumented = true
            return { code: instrumentCompiledRuntimeSource(source), map: null }
          }
          return null
        },
      },
    ],
    build: {
      outDir: profileDist,
      emptyOutDir: true,
      minify: true,
      sourcemap: false,
      target: 'es2022',
    },
  })
  if (!keyedInstrumented || !compiledInstrumented || !rootInstrumented) {
    throw new Error(
      `Profile build missed runtime instrumentation (keyed=${keyedInstrumented}, compiled=${compiledInstrumented}, root=${rootInstrumented})`,
    )
  }
  for (const [relative, hash] of Object.entries(instrumentedSources)) {
    if ((await sha256(path.resolve(workspaceRoot, 'packages/runtime/src', relative))) !== hash) {
      throw new Error(`Installed runtime differs from workspace: ${relative}`)
    }
  }
  return { path: path.resolve(profileDist, 'main.js'), instrumentedSources }
}

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
])

const startServer = async () => {
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
      let file
      if (pathname === '/') file = path.resolve(benchmarkRoot, 'index.html')
      else if (pathname.startsWith('/dist/')) file = path.resolve(profileDist, pathname.slice(6))
      else file = path.resolve(benchmarkSuiteRoot, pathname.replace(/^\/+/, ''))
      const allowedRoots = [benchmarkRoot, benchmarkSuiteRoot, profileDist]
      if (!allowedRoots.some(root => file === root || file.startsWith(`${root}${path.sep}`))) {
        throw new Error('outside served roots')
      }
      const stat = await fs.stat(file)
      if (!stat.isFile()) throw new Error('not a file')
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': contentTypes.get(path.extname(file)) ?? 'application/octet-stream',
      })
      createReadStream(file).pipe(response)
    } catch {
      response.writeHead(404).end('Not Found')
    }
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Unable to resolve profile server')
  return {
    url: `http://127.0.0.1:${address.port}/`,
    close: () =>
      new Promise((resolve, reject) => server.close(error => (error ? reject(error) : resolve()))),
  }
}

export const installBrowserCounters = () => {
  if (globalThis.__RUE_PROFILE_INSTALLED__) return
  globalThis.__RUE_PROFILE_INSTALLED__ = true
  const names = [
    'reconciles',
    'rowMounts',
    'rowPatches',
    'indexOnlyPatches',
    'rowDisposes',
    'generalKeyedRowMounts',
    'generalKeyedRowDisposes',
    'ownerlessKeyedRowMounts',
    'ownerlessKeyedRowDisposes',
    'keyReads',
    'mapConstructions',
    'setConstructions',
    'oldMapConstructions',
    'appendSetConstructions',
    'rangeChecks',
    'rangeMoves',
    'signals',
    'effects',
    'ownersCreated',
    'ownersDisposed',
    'documentFragments',
    'clones',
    'appendChild',
    'insertBefore',
    'removeChild',
    'rangeDeletes',
    'keyedOwnersCreated',
    'rootOwnersCreated',
    'ownerCleanupCallbacks',
    'compactCleanupRegistrations',
    'compactCleanupCallbacks',
    'listenersAdded',
    'listenersRemoved',
    'textNodesCreated',
    'textHoleReplacements',
    'batchPositionChecks',
    'rowRecordCopies',
    'rowRecordReuses',
    'individualRowDeletes',
    'privateMountMetadata',
  ]
  const reset = () => {
    globalThis.__RUE_PROFILE_COUNTERS__ = Object.fromEntries(names.map(name => [name, 0]))
  }
  const wrap = (target, name, counter) => {
    const original = target[name]
    target[name] = function (...args) {
      globalThis.__RUE_PROFILE_COUNTERS__[counter] += 1
      return Reflect.apply(original, this, args)
    }
  }
  reset()
  wrap(Document.prototype, 'createDocumentFragment', 'documentFragments')
  wrap(Node.prototype, 'cloneNode', 'clones')
  wrap(Node.prototype, 'appendChild', 'appendChild')
  wrap(Node.prototype, 'insertBefore', 'insertBefore')
  wrap(Node.prototype, 'removeChild', 'removeChild')
  wrap(Document.prototype, 'createTextNode', 'textNodesCreated')
  wrap(EventTarget.prototype, 'addEventListener', 'listenersAdded')
  wrap(EventTarget.prototype, 'removeEventListener', 'listenersRemoved')
  const remove = Node.prototype.removeChild
  Node.prototype.removeChild = function (child) {
    if (child.nodeType === 8 && child.previousSibling?.nodeType === 3) {
      globalThis.__RUE_PROFILE_COUNTERS__.textHoleReplacements += 1
    }
    return remove.call(this, child)
  }
  if (globalThis.Range) wrap(Range.prototype, 'deleteContents', 'rangeDeletes')
  globalThis.__RUE_PROFILE_RESET__ = reset
  globalThis.__RUE_PROFILE_SNAPSHOT__ = () => ({ ...globalThis.__RUE_PROFILE_COUNTERS__ })
}

const settle = () =>
  new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

const prepareScenario = async (page, scenario) =>
  page.evaluate(async name => {
    const settleFrames = () =>
      new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    document.querySelector('#clear').click()
    await settleFrames()
    if (!['create1k', 'create10k', 'run-memory'].includes(name)) {
      document.querySelector('#run').click()
      await settleFrames()
    }
    const rows = [...document.querySelectorAll('tbody tr')]
    globalThis.__RUE_PROFILE_BEFORE__ = {
      ids: rows.map(row => Number(row.cells[0]?.textContent)),
      labels: rows.map(row => row.cells[1]?.textContent ?? ''),
    }
  }, scenario)

const performScenario = (page, scenario) =>
  page.evaluate(async name => {
    const before = globalThis.__RUE_PROFILE_BEFORE__
    globalThis.__RUE_PROFILE_RESET__()
    const action = () => {
      if (name === 'create1k' || name === 'run-memory' || name === 'replace1k') {
        document.querySelector('#run').click()
      } else if (name === 'create10k') document.querySelector('#runlots').click()
      else if (name === 'update10th') document.querySelector('#update').click()
      else if (name === 'append1k') document.querySelector('#add').click()
      else if (name === 'clear1k') document.querySelector('#clear').click()
      else if (name === 'select1k') document.querySelector('tbody tr a').click()
      else if (name === 'swap1k') document.querySelector('#swaprows').click()
      else if (name === 'remove1k') {
        document.querySelector('tbody tr:nth-child(501) td:nth-child(3) a').click()
      }
    }
    const startedAt = performance.now()
    action()
    const immediateMs = performance.now() - startedAt
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const settledMs = performance.now() - startedAt
    const rows = [...document.querySelectorAll('tbody tr')]
    const ids = rows.map(row => Number(row.cells[0]?.textContent))
    const labels = rows.map(row => row.cells[1]?.textContent ?? '')
    const dangerIds = rows
      .filter(row => row.classList.contains('danger'))
      .map(row => Number(row.cells[0]?.textContent))
    let domCorrect = ids.length === new Set(ids).size
    if (name === 'create1k' || name === 'run-memory') domCorrect &&= ids.length === 1_000
    else if (name === 'create10k') domCorrect &&= ids.length === 10_000
    else if (name === 'replace1k') {
      domCorrect &&= ids.length === 1_000 && ids[0] !== before.ids[0]
    } else if (name === 'update10th') {
      domCorrect &&=
        ids.length === 1_000 &&
        ids.every((id, index) => id === before.ids[index]) &&
        labels.filter(label => label.endsWith(' !!!')).length === 100
    } else if (name === 'append1k') {
      domCorrect &&= ids.length === 2_000 && before.ids.every((id, index) => ids[index] === id)
    } else if (name === 'clear1k') domCorrect &&= ids.length === 0
    else if (name === 'select1k') {
      domCorrect &&=
        ids.length === 1_000 && dangerIds.length === 1 && dangerIds[0] === before.ids[0]
    } else if (name === 'swap1k') {
      domCorrect &&=
        ids.length === 1_000 &&
        ids[1] === before.ids[998] &&
        ids[998] === before.ids[1] &&
        ids[0] === before.ids[0]
    } else if (name === 'remove1k') {
      domCorrect &&= ids.length === 999 && !ids.includes(before.ids[500])
    }
    return {
      counters: globalThis.__RUE_PROFILE_SNAPSHOT__(),
      domCorrect,
      dom: {
        rowCount: ids.length,
        firstId: ids[0] ?? null,
        lastId: ids.at(-1) ?? null,
        uniqueIds: new Set(ids).size,
        updatedLabels: labels.filter(label => label.endsWith(' !!!')).length,
      },
      immediateMs,
      settledMs,
    }
  }, scenario)

const forceGcAndReadHeap = async session => {
  await session.send('HeapProfiler.collectGarbage')
  return (await session.send('Runtime.getHeapUsage')).usedSize
}

const measureMemoryGate = async ({ page, session, cycles }) => {
  await prepareScenario(page, 'run-memory')
  await page.evaluate(() => globalThis.__RUE_PROFILE_RESET__())
  const readyHeapBytes = await forceGcAndReadHeap(session)
  const samples = []
  for (let cycle = 1; cycle <= cycles; cycle += 1) {
    await page.evaluate(async () => {
      document.querySelector('#run').click()
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    })
    const afterCreateHeapBytes = await forceGcAndReadHeap(session)
    await page.evaluate(async () => {
      document.querySelector('#clear').click()
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    })
    const afterClearHeapBytes = await forceGcAndReadHeap(session)
    const rowCount = await page.locator('tbody tr').count()
    if (rowCount !== 0) throw new Error(`memory cycle ${cycle} left ${rowCount} rows after clear`)
    samples.push({ cycle, afterCreateHeapBytes, afterClearHeapBytes })
  }
  const counters = await page.evaluate(() => globalThis.__RUE_PROFILE_SNAPSHOT__())
  const retainedSamples = samples
    .slice(Math.min(2, samples.length - 2))
    .map(sample => sample.afterClearHeapBytes)
  return {
    cycles,
    readyHeapBytes,
    samples,
    slopeSampleStartCycle: samples.length - retainedSamples.length + 1,
    retainedHeapSlopeBytesPerCycle: calculateLinearSlope(retainedSamples),
    ...Object.fromEntries(
      [
        'keyedOwnersCreated',
        'generalKeyedRowMounts',
        'generalKeyedRowDisposes',
        'ownerlessKeyedRowMounts',
        'ownerlessKeyedRowDisposes',
        'compactCleanupRegistrations',
        'compactCleanupCallbacks',
        'oldMapConstructions',
        'appendSetConstructions',
      ].map(name => [name, counters[name]]),
    ),
  }
}

const measureScenario = async ({ page, session, scenario, trace }) => {
  await prepareScenario(page, scenario)
  const heapBeforeBytes = await forceGcAndReadHeap(session)
  let measured
  let traceSummary
  if (trace) {
    const traced = await captureTrace(session, () => performScenario(page, scenario))
    measured = traced.value
    traceSummary = traced.summary
  } else measured = await performScenario(page, scenario)
  const heapAfterBytes = await forceGcAndReadHeap(session)
  if (!measured.domCorrect) {
    throw new Error(`${scenario} failed DOM correctness: ${JSON.stringify(measured.dom)}`)
  }
  return {
    ...measured,
    heapBeforeBytes,
    heapAfterBytes,
    heapDeltaBytes: heapAfterBytes - heapBeforeBytes,
    trace: traceSummary,
  }
}

const summarizeScenario = samples => ({
  immediateMs: summarizeSamples(samples.map(sample => sample.immediateMs)),
  timingMs: summarizeSamples(samples.map(sample => sample.settledMs)),
  heapAfterBytes: summarizeSamples(samples.map(sample => sample.heapAfterBytes)),
  heapDeltaBytes: summarizeSamples(samples.map(sample => sample.heapDeltaBytes)),
  counters: Object.fromEntries(
    COUNTER_NAMES.map(name => [
      name,
      summarizeSamples(samples.map(sample => sample.counters[name])),
    ]),
  ),
  trace: samples.find(sample => sample.trace)?.trace ?? null,
  samples: samples.map(sample => ({
    counters: sample.counters,
    dom: sample.dom,
    domCorrect: sample.domCorrect,
    heapAfterBytes: sample.heapAfterBytes,
    heapBeforeBytes: sample.heapBeforeBytes,
    heapDeltaBytes: sample.heapDeltaBytes,
    immediateMs: round(sample.immediateMs),
    settledMs: round(sample.settledMs),
  })),
})

const counterMedian = (scenarios, scenario, counter) =>
  scenarios[scenario]?.counters[counter]?.median ?? 0

export const calculateLinearSlope = values => {
  if (
    !Array.isArray(values) ||
    values.length < 2 ||
    values.some(value => !Number.isFinite(value))
  ) {
    throw new Error('Linear slope requires at least two finite samples')
  }
  const xMean = (values.length - 1) / 2
  const yMean = values.reduce((sum, value) => sum + value, 0) / values.length
  let numerator = 0
  let denominator = 0
  values.forEach((value, index) => {
    numerator += (index - xMean) * (value - yMean)
    denominator += (index - xMean) ** 2
  })
  return round(numerator / denominator)
}

export const validateResourceBudgets = report => {
  const scenarios = report?.scenarios ?? {}
  const memory = report?.memoryGate ?? {}
  const failures = []
  const expectCounter = (scenario, counter, expected) => {
    const actual = counterMedian(scenarios, scenario, counter)
    if (actual !== expected) failures.push(`${scenario}.${counter}=${actual}, expected ${expected}`)
  }

  for (const [scenario, rows] of [
    ['create1k', 1_000],
    ['create10k', 10_000],
  ]) {
    expectCounter(scenario, 'keyedOwnersCreated', 0)
    expectCounter(scenario, 'generalKeyedRowMounts', 0)
    expectCounter(scenario, 'ownerlessKeyedRowMounts', rows)
  }
  expectCounter('append1k', 'oldMapConstructions', 0)
  expectCounter('append1k', 'appendSetConstructions', 1)
  expectCounter('append1k', 'generalKeyedRowMounts', 0)
  expectCounter('append1k', 'ownerlessKeyedRowMounts', 1_000)
  expectCounter('clear1k', 'generalKeyedRowDisposes', 0)
  expectCounter('clear1k', 'ownerlessKeyedRowDisposes', 1_000)

  const registered = counterMedian(scenarios, 'create1k', 'compactCleanupRegistrations')
  const cleaned = counterMedian(scenarios, 'clear1k', 'compactCleanupCallbacks')
  if (registered <= 0 || cleaned !== registered) {
    failures.push(`cleanup balance create1k=${registered}, clear1k=${cleaned}`)
  }
  const swapMoves = counterMedian(scenarios, 'swap1k', 'rangeMoves')
  if (swapMoves > RESOURCE_BUDGETS.swapRangeMoves) {
    failures.push(`swap1k.rangeMoves=${swapMoves}, max ${RESOURCE_BUDGETS.swapRangeMoves}`)
  }

  for (const field of ['keyedOwnersCreated', 'generalKeyedRowMounts', 'generalKeyedRowDisposes']) {
    if (memory[field] !== 0) failures.push(`memoryGate.${field}=${memory[field]}, expected 0`)
  }
  if (
    memory.ownerlessKeyedRowMounts <= 0 ||
    memory.ownerlessKeyedRowDisposes !== memory.ownerlessKeyedRowMounts
  ) {
    failures.push(
      `memory row balance mounts=${memory.ownerlessKeyedRowMounts}, disposes=${memory.ownerlessKeyedRowDisposes}`,
    )
  }
  if (
    memory.compactCleanupRegistrations <= 0 ||
    memory.compactCleanupCallbacks !== memory.compactCleanupRegistrations
  ) {
    failures.push(
      `cleanup balance memory registrations=${memory.compactCleanupRegistrations}, callbacks=${memory.compactCleanupCallbacks}`,
    )
  }
  if (
    !Number.isFinite(memory.retainedHeapSlopeBytesPerCycle) ||
    memory.retainedHeapSlopeBytesPerCycle > RESOURCE_BUDGETS.retainedHeapSlopeBytesPerCycle
  ) {
    failures.push(
      `retained heap slope=${memory.retainedHeapSlopeBytesPerCycle}, max ${RESOURCE_BUDGETS.retainedHeapSlopeBytesPerCycle}`,
    )
  }
  if (failures.length > 0) throw new Error(`resource budget failed:\n- ${failures.join('\n- ')}`)
  return report
}

export const buildHotspots = scenarios =>
  [
    [5, 'create1k', 'row owner and effect allocation', 'ownersCreated', 'effects'],
    [4, 'create1k', 'per-row native listeners', 'listenersAdded'],
    [6, 'append1k', 'append key reads', 'keyReads'],
    [3, 'remove1k', 'index-only row patches', 'indexOnlyPatches'],
  ]
    .map(([task, scenario, costCenter, ...counters]) => {
      const baselineCount = counters.reduce(
        (sum, name) => sum + counterMedian(scenarios, scenario, name),
        0,
      )
      return {
        task,
        scenario,
        costCenter,
        baselineCount,
        upperBoundCalls: baselineCount,
        avoidableShare: baselineCount > 0 ? 1 : 0,
      }
    })
    .filter(hotspot => hotspot.baselineCount > 0)
    .sort((a, b) => b.upperBoundCalls - a.upperBoundCalls)

const sha256Pattern = /^[a-f0-9]{64}$/

export const validateProfileReport = report => {
  if (report?.schemaVersion !== PROFILE_SCHEMA_VERSION) {
    throw new Error(`Expected profile schema ${PROFILE_SCHEMA_VERSION}`)
  }
  for (const field of ['artifactSha256', 'compactKeyedSha256', 'fixtureSha256']) {
    if (!sha256Pattern.test(report.source?.[field] ?? '')) throw new Error(`Invalid ${field}`)
  }
  if (!report.source?.chromeVersion) throw new Error('Missing chromeVersion')
  for (const field of [
    'workspaceVersion',
    'localPackageVersion',
    'benchmarkPackageVersion',
    'benchmarkMetadataVersion',
  ]) {
    if (typeof report.source?.[field] !== 'string' || report.source[field].length === 0) {
      throw new Error(`Missing ${field}`)
    }
  }
  if (!['sync', 'microtask', 'frame'].includes(report.configuration?.schedulingMode)) {
    throw new Error('Invalid schedulingMode')
  }
  if (
    !Number.isInteger(report.benchmarkComparison?.measuredRounds) ||
    !Number.isFinite(report.benchmarkComparison?.rueVsVueJsx) ||
    !Number.isFinite(report.benchmarkComparison?.rueVsVueVapor)
  ) {
    throw new Error('Missing benchmarkComparison')
  }
  const expectedSamples = report.configuration?.measuredRounds
  if (!Number.isInteger(expectedSamples) || expectedSamples < 3) {
    throw new Error('Profile requires at least three measured rounds')
  }
  for (const name of PROFILE_SCENARIOS) {
    const scenario = report.scenarios?.[name]
    if (!scenario) throw new Error(`Missing scenario ${name}`)
    if (
      scenario.timingMs?.validSamples !== expectedSamples ||
      scenario.samples?.length !== expectedSamples
    ) {
      throw new Error(`${name} has incomplete samples`)
    }
    for (const sample of scenario.samples) {
      for (const counter of COUNTER_NAMES) {
        if (!Number.isInteger(sample.counters?.[counter]) || sample.counters[counter] < 0)
          throw new Error(`${name}: invalid counter ${counter}`)
      }
      const c = sample.counters
      if (c.ownersCreated !== c.keyedOwnersCreated + c.rootOwnersCreated)
        throw new Error(`${name}: owner conservation failed`)
      if (c.rowMounts !== c.rowRecordCopies + c.rowRecordReuses)
        throw new Error(`${name}: row record conservation failed`)
      if (c.indexOnlyPatches > c.rowPatches)
        throw new Error(`${name}: index-only patch conservation failed`)
    }
    if (scenario.samples.some(sample => sample.domCorrect !== true)) {
      throw new Error(`${name} has a failed DOM assertion`)
    }
  }
  if (
    !Number.isInteger(report.memoryGate?.cycles) ||
    report.memoryGate.cycles < 4 ||
    report.memoryGate.samples?.length !== report.memoryGate.cycles ||
    report.memoryGate.samples.some(
      sample =>
        !Number.isFinite(sample.afterCreateHeapBytes) ||
        !Number.isFinite(sample.afterClearHeapBytes),
    )
  ) {
    throw new Error('Memory gate has incomplete forced-GC samples')
  }
  if (!Array.isArray(report.hotspots) || report.hotspots.length === 0) {
    throw new Error('Profile has no actionable hotspot')
  }
  return validateResourceBudgets(report)
}

const renderCount = value =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value)

const renderEvidence = report => {
  const rows = PROFILE_SCENARIOS.map(name => {
    const scenario = report.scenarios[name]
    const counters = scenario.counters
    return `| ${name} | ${scenario.timingMs.median} | ${scenario.timingMs.p25}–${scenario.timingMs.p75} | ${renderCount(scenario.heapDeltaBytes.median / 1_048_576)} | ${counters.rowMounts.median} | ${counters.rowPatches.median} | ${counters.rowDisposes.median} | ${counters.keyReads.median} | ${counters.mapConstructions.median}/${counters.setConstructions.median} | ${counters.documentFragments.median}/${counters.clones.median} | ${counters.insertBefore.median}/${counters.removeChild.median}/${counters.rangeDeletes.median} |`
  }).join('\n')
  const traces = PROFILE_SCENARIOS.map(name => {
    const phases = report.scenarios[name].trace?.phasesMs
    if (!phases) return `| ${name} | n/a | n/a | n/a | n/a | n/a |`
    return `| ${name} | ${phases.scripting} | ${phases.rendering} | ${phases.layout} | ${phases.paint} | ${phases.gc} |`
  }).join('\n')
  const hotspots = report.hotspots
    .map(
      hotspot =>
        `| ${hotspot.task} | ${hotspot.scenario} | ${hotspot.costCenter} | ${hotspot.baselineCount} | ${hotspot.upperBoundCalls} | ${(hotspot.avoidableShare * 100).toFixed(1)}% |`,
    )
    .join('\n')
  return `# Compact keyed 分阶段性能与分配画像

生成时间：${report.generatedAt}

## 环境与口径

- Schema：${report.schemaVersion}
- Chrome：${report.source.chromeVersion}（${report.source.chromeExecutable}）
- Git：${report.source.gitCommit}${report.source.gitDirty ? '（工作区有未提交修改）' : ''}
- 工作区源码版本：${report.source.workspaceVersion}；实际安装到 fixture 的本地包版本：${report.source.localPackageVersion}
- benchmark package/元数据版本：${report.source.benchmarkPackageVersion}/${report.source.benchmarkMetadataVersion}（它们仅描述 fixture，不作为本地 Rue 源码版本）
- 响应式调度基线：${report.configuration.schedulingMode}
- 真实 fixture：\`${report.source.fixturePath}\`，SHA-256 \`${report.source.fixtureSha256}\`
- 插桩源码（已验证安装副本与工作区一致）：${JSON.stringify(report.source.instrumentedSources)}
- compact keyed 源码 SHA-256：\`${report.source.compactKeyedSha256}\`
- 真实 SWC/Vite 构建产物 SHA-256：\`${report.source.artifactSha256}\`
- 采样：${report.configuration.warmupRounds} 轮预热、${report.configuration.measuredRounds} 轮旋转顺序实测；每个场景每轮均验证真实 DOM，强制 GC 后读取 heap。
- 命令：\`node scripts/profile-compact-keyed-performance.mjs --rounds ${report.configuration.measuredRounds} --warmup-rounds ${report.configuration.warmupRounds} --memory-cycles ${report.configuration.memoryCycles} --output ${report.configuration.outputPath} --evidence ${report.configuration.evidencePath}\`
- 既有同机三方 CPU 摘要（本画像不重复运行）：${report.benchmarkComparison.measuredRounds} 次中位数，Rue/Vue JSX=${report.benchmarkComparison.rueVsVueJsx}，Rue/Vue Vapor=${report.benchmarkComparison.rueVsVueVapor}；口径为 ${report.benchmarkComparison.metric}。

## 场景统计

时间是动作开始到两次 requestAnimationFrame 后的 wall time；heap 是动作前后分别强制 GC 的差值。计数插桩只存在于本诊断构建，DOM spy 委托真实浏览器实现。

| 场景 | 中位数 ms | IQR ms | heap Δ MiB | mount | patch | dispose | key | Map/Set | fragment/clone | insert/remove/range-delete |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${rows}

## 深度计数（各轮中位数）

| 场景 | general/ownerless mount | general/ownerless dispose | keyed/root owner | compact cleanup reg/run | old Map/append Set | effect | owner cleanup | listener add/remove | index-only patch | batch check |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
${PROFILE_SCENARIOS.map(name => {
  const c = report.scenarios[name].counters
  return `| ${name} | ${c.generalKeyedRowMounts.median}/${c.ownerlessKeyedRowMounts.median} | ${c.generalKeyedRowDisposes.median}/${c.ownerlessKeyedRowDisposes.median} | ${c.keyedOwnersCreated.median}/${c.rootOwnersCreated.median} | ${c.compactCleanupRegistrations.median}/${c.compactCleanupCallbacks.median} | ${c.oldMapConstructions.median}/${c.appendSetConstructions.median} | ${c.effects.median} | ${c.ownerCleanupCallbacks.median} | ${c.listenersAdded.median}/${c.listenersRemoved.median} | ${c.indexOnlyPatches.median} | ${c.batchPositionChecks.median} |`
}).join('\n')}

## 强制 GC retained heap 门禁

- ready heap：${renderCount(report.memoryGate.readyHeapBytes / 1_048_576)} MiB
- create/clear 周期：${report.memoryGate.cycles}；斜率样本从第 ${report.memoryGate.slopeSampleStartCycle} 轮开始
- retained heap 斜率：${renderCount(report.memoryGate.retainedHeapSlopeBytesPerCycle / 1024)} KiB/周期；硬门槛：${renderCount(RESOURCE_BUDGETS.retainedHeapSlopeBytesPerCycle / 1024)} KiB/周期
- 行生命周期：ownerless mount/dispose=${report.memoryGate.ownerlessKeyedRowMounts}/${report.memoryGate.ownerlessKeyedRowDisposes}，general mount/dispose=${report.memoryGate.generalKeyedRowMounts}/${report.memoryGate.generalKeyedRowDisposes}
- compact cleanup 注册/执行=${report.memoryGate.compactCleanupRegistrations}/${report.memoryGate.compactCleanupCallbacks}；keyed owner=${report.memoryGate.keyedOwnersCreated}

| 周期 | create 后 heap MiB | clear + GC 后 heap MiB |
| ---: | ---: | ---: |
${report.memoryGate.samples.map(sample => `| ${sample.cycle} | ${renderCount(sample.afterCreateHeapBytes / 1_048_576)} | ${renderCount(sample.afterClearHeapBytes / 1_048_576)} |`).join('\n')}

## Chrome trace 主线程阶段

以下为每场景首个实测轮的 renderer-main 完整事件汇总（嵌套事件可能重叠，不应将各列直接相加）。

| 场景 | script ms | style ms | layout ms | paint ms | GC ms |
| --- | ---: | ---: | ---: | ---: | ---: |
${traces}

## 热点排序与后续任务基线

“可节省上界”是根据后续任务目标可直接消除的调用/分配次数，不等同于可节省毫秒。

| 任务 | 基线场景 | 成本中心 | 当前计数 | 可节省上界 | 可避免占比 |
| ---: | --- | --- | ---: | ---: | ---: |
${hotspots}

## 结论与限制

- DOM 正确性：${PROFILE_SCENARIOS.every(name => report.scenarios[name].samples.every(sample => sample.domCorrect)) ? '全部样本通过' : '存在失败'}。
- 确定性资源门禁：通过（create1k/create10k 无 keyed Owner；append 无 old Map；clear cleanup 平衡；swap 最多 ${RESOURCE_BUDGETS.swapRangeMoves} 次 range move；retained heap 斜率未超预算）。
- 已确认的首要计数热点是 ${report.hotspots[0].costCenter}（${report.hotspots[0].scenario}，可节省上界 ${report.hotspots[0].upperBoundCalls} 次）。
- trace 是单轮代表样本，计数与 timing 使用 ${report.configuration.measuredRounds} 轮中位数和 IQR；嵌套 trace 事件会重叠，heap 差值也受 V8 分代与缓存影响。
- 诊断构建保持真实 SWC 输出、真实 compact runtime 和真实 DOM，但插桩会增加常数开销；因此本画像用于热点归因和操作上界，不替代无插桩官方 benchmark 的绝对时间。
`
}

const parseCli = argv => {
  const options = {
    evidence: defaultEvidence,
    memoryCycles: 6,
    measuredRounds: 5,
    output: defaultOutput,
    skipInstall: false,
    warmupRounds: 1,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--') continue
    if (argument === '--rounds') options.measuredRounds = Number(argv[++index])
    else if (argument === '--memory-cycles') options.memoryCycles = Number(argv[++index])
    else if (argument === '--warmup-rounds') options.warmupRounds = Number(argv[++index])
    else if (argument === '--output') options.output = path.resolve(argv[++index])
    else if (argument === '--evidence') options.evidence = path.resolve(argv[++index])
    else if (argument === '--skip-install') options.skipInstall = true
    else throw new Error(`Unknown argument: ${argument}`)
  }
  if (!Number.isInteger(options.measuredRounds) || options.measuredRounds < 3) {
    throw new Error('--rounds must be an integer of at least 3')
  }
  if (!Number.isInteger(options.warmupRounds) || options.warmupRounds < 1) {
    throw new Error('--warmup-rounds must be a positive integer')
  }
  if (!Number.isInteger(options.memoryCycles) || options.memoryCycles < 4) {
    throw new Error('--memory-cycles must be an integer of at least 4')
  }
  return options
}

export const runProfile = async options => {
  if (!options.skipInstall) {
    await runCommand('pnpm', ['run', 'benchmark:js-framework:install-local', '--', benchmarkRoot])
  }
  const artifact = await buildProfileFixture()
  const server = await startServer()
  const executablePath = await findChrome()
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: [
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--js-flags=--expose-gc',
    ],
  })
  try {
    const context = await browser.newContext()
    await context.addInitScript(installBrowserCounters)
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(server.url, { waitUntil: 'networkidle' })
    await page.waitForSelector('#run')
    await page.evaluate(settle)
    const schedulingMode = await page.evaluate(() => globalThis.__RUE_PROFILE_SCHEDULING_MODE__)
    const session = await context.newCDPSession(page)
    await session.send('HeapProfiler.enable')

    for (let roundIndex = 0; roundIndex < options.warmupRounds; roundIndex += 1) {
      console.info(`Warmup ${roundIndex + 1}/${options.warmupRounds}`)
      for (const scenario of rotateScenarios(PROFILE_SCENARIOS, roundIndex)) {
        await measureScenario({ page, session, scenario, trace: false })
      }
    }

    const samples = Object.fromEntries(PROFILE_SCENARIOS.map(name => [name, []]))
    for (let roundIndex = 0; roundIndex < options.measuredRounds; roundIndex += 1) {
      console.info(`Measured round ${roundIndex + 1}/${options.measuredRounds}`)
      for (const scenario of rotateScenarios(PROFILE_SCENARIOS, roundIndex)) {
        console.info(`  ${scenario}`)
        samples[scenario].push(
          await measureScenario({ page, session, scenario, trace: roundIndex === 0 }),
        )
      }
    }
    if (errors.length > 0) throw new Error(`Browser errors: ${errors.join('; ')}`)
    const scenarios = Object.fromEntries(
      PROFILE_SCENARIOS.map(name => [name, summarizeScenario(samples[name])]),
    )
    console.info(`Memory gate ${options.memoryCycles} create/clear cycles`)
    const memoryGate = await measureMemoryGate({ page, session, cycles: options.memoryCycles })
    console.info(
      `Memory retained heaps: ${memoryGate.samples.map(sample => sample.afterClearHeapBytes).join(', ')}; ` +
        `slope=${memoryGate.retainedHeapSlopeBytesPerCycle} bytes/cycle`,
    )
    const [workspaceManifest, localPackageManifest, benchmarkManifest] = await Promise.all([
      fs.readFile(workspacePackage, 'utf8').then(JSON.parse),
      fs.readFile(localRuePackage, 'utf8').then(JSON.parse),
      fs.readFile(benchmarkPackage, 'utf8').then(JSON.parse),
    ])
    const report = validateProfileReport({
      schemaVersion: PROFILE_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: {
        artifactPath: path.relative(workspaceRoot, artifact.path),
        instrumentedSources: artifact.instrumentedSources,
        artifactSha256: await sha256(artifact.path),
        chromeExecutable: executablePath,
        chromeVersion: browser.version(),
        compactKeyedPath: path.relative(workspaceRoot, compactKeyedSource),
        compactKeyedSha256: await sha256(compactKeyedSource),
        fixturePath: path.relative(workspaceRoot, fixtureSource),
        fixtureSha256: await sha256(fixtureSource),
        gitCommit: await runCommandOutput('git', ['rev-parse', 'HEAD']),
        gitDirty: (await runCommandOutput('git', ['status', '--short'])).length > 0,
        workspaceVersion: workspaceManifest.version,
        localPackageVersion: localPackageManifest.version,
        benchmarkPackageVersion: benchmarkManifest.version,
        benchmarkMetadataVersion: benchmarkManifest['js-framework-benchmark']?.frameworkVersion,
      },
      configuration: {
        evidencePath: path.relative(workspaceRoot, options.evidence),
        memoryCycles: options.memoryCycles,
        measuredRounds: options.measuredRounds,
        order: 'left rotation by measured round index',
        outputPath: path.relative(workspaceRoot, options.output),
        schedulingMode,
        traceRoundsPerScenario: 1,
        warmupRounds: options.warmupRounds,
      },
      benchmarkComparison: REFERENCE_BENCHMARK_SUMMARY,
      scenarios,
      memoryGate,
      hotspots: buildHotspots(scenarios),
    })
    await fs.mkdir(path.dirname(options.output), { recursive: true })
    await fs.mkdir(path.dirname(options.evidence), { recursive: true })
    await fs.writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`)
    await fs.writeFile(options.evidence, renderEvidence(report))
    console.info(`Profile JSON: ${path.relative(workspaceRoot, options.output)}`)
    console.info(`Evidence: ${path.relative(workspaceRoot, options.evidence)}`)
    console.info(
      `Top hotspot: task ${report.hotspots[0].task} ${report.hotspots[0].costCenter} ` +
        `(upper bound ${report.hotspots[0].upperBoundCalls} calls)`,
    )
    return report
  } finally {
    await browser.close()
    await server.close()
  }
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (isMain) {
  runProfile(parseCli(process.argv.slice(2))).catch(error => {
    console.error(error)
    process.exitCode = 1
  })
}
