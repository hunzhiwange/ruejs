import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { brotliCompressSync } from 'node:zlib'
import { spawn } from 'node:child_process'

const workspaceRoot = path.resolve(import.meta.dirname, '..')
const fixtureRoot = path.resolve(workspaceRoot, 'packages/runtime/__benchmarks__/anchor-tiering')
const fixtureDist = path.resolve(workspaceRoot, 'temp/anchor-tiering-performance/dist')

export const ANCHOR_TIERING_SCENARIOS = [
  'textUpdate',
  'singleRootBranch',
  'nullableMultiRoot',
  'compiledComponentSlot',
]

const metrics = {
  cpu: ['cpuMs', 'medianMs', 'samplesMs'],
  mutations: ['mutations', 'median', 'samples'],
  heap: ['heapBytes', 'medianBytes', 'samplesBytes'],
  nodeCount: ['nodeCount', 'median', 'samples'],
  commentNodes: ['commentNodes', 'median', 'samples'],
  effectRuns: ['effectRuns', 'median', 'samples'],
}

const median = values => {
  const middle = Math.floor(values.length / 2)
  return values.length % 2 === 1 ? values[middle] : (values[middle - 1] + values[middle]) / 2
}

export const normalizeAnchorTieringResults = rounds => {
  if (!Array.isArray(rounds) || rounds.length === 0) {
    throw new Error('At least one anchor tiering Chromium round is required')
  }
  return Object.fromEntries(
    ANCHOR_TIERING_SCENARIOS.map(scenario => [
      scenario,
      Object.fromEntries(
        Object.entries(metrics).map(([reportMetric, [rawMetric, medianKey, samplesKey]]) => {
          const samples = rounds.map((round, index) => {
            const sample = round?.scenarios?.[scenario]?.[rawMetric]
            if (typeof sample !== 'number' || !Number.isFinite(sample) || sample < 0) {
              throw new Error(
                `Missing valid sample for round ${index + 1}, scenario ${scenario}, metric ${rawMetric}`,
              )
            }
            return sample
          })
          samples.sort((left, right) => left - right)
          return [
            reportMetric,
            { [medianKey]: median(samples), validSamples: samples.length, [samplesKey]: samples },
          ]
        }),
      ),
    ]),
  )
}

const medianValue = measurement =>
  measurement.medianMs ?? measurement.medianBytes ?? measurement.median

const isFiniteMeasurement = value =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

const ratio = (actual, baseline, field) => {
  if (!(baseline > 0)) throw new Error(`Anchor tiering baseline ${field} must be greater than zero`)
  return actual / baseline
}

const totalBrotliBytes = report => {
  const artifacts = report?.source?.fixtureArtifacts
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    throw new Error('Anchor tiering report is missing fixture artifacts')
  }
  return artifacts.reduce((total, artifact, index) => {
    if (!isFiniteMeasurement(artifact?.brotliBytes)) {
      throw new Error(`Anchor tiering report is missing fixture artifact ${index} Brotli bytes`)
    }
    return total + artifact.brotliBytes
  }, 0)
}

const validateSamples = (report, minimumValidSamples, label) => {
  for (const scenario of ANCHOR_TIERING_SCENARIOS) {
    for (const metric of Object.keys(metrics)) {
      const validSamples = report?.results?.[scenario]?.[metric]?.validSamples
      if (!Number.isInteger(validSamples) || validSamples < minimumValidSamples) {
        throw new Error(
          `${label} valid samples for ${scenario}.${metric} are ${validSamples ?? 'missing'}; required ${minimumValidSamples}`,
        )
      }
    }
  }
}

export class AnchorTieringBudgetError extends Error {
  constructor(failures) {
    super(
      `Anchor tiering performance budget failed: ${failures
        .map(
          failure =>
            `${failure.scenario} ${failure.dimension} ${failure.actual} ${failure.operator ?? '>'} ${failure.limit}`,
        )
        .join('; ')}`,
    )
    this.name = 'AnchorTieringBudgetError'
    this.failures = failures
  }
}

export const checkAnchorTieringBudget = (report, baseline, budget) => {
  const minimumValidSamples = budget?.minimumValidSamples
  if (!Number.isInteger(minimumValidSamples) || minimumValidSamples < 3) {
    throw new Error('Anchor tiering budget minimumValidSamples must be an integer of at least 3')
  }
  validateSamples(report, minimumValidSamples, 'Anchor tiering report')
  validateSamples(baseline, minimumValidSamples, 'Anchor tiering baseline')

  const failures = []
  const scenarios = {}
  for (const scenario of ANCHOR_TIERING_SCENARIOS) {
    const limits = budget?.scenarios?.[scenario]
    if (!limits) throw new Error(`Anchor tiering budget is missing scenario: ${scenario}`)
    const current = report.results[scenario]
    const previous = baseline.results[scenario]
    const result = {
      commentNodes: medianValue(current.commentNodes),
      commentNodesBaseline: medianValue(previous.commentNodes),
      mutationsRatio: ratio(
        medianValue(current.mutations),
        medianValue(previous.mutations),
        `${scenario}.mutations`,
      ),
      nodeCountRatio: ratio(
        medianValue(current.nodeCount),
        medianValue(previous.nodeCount),
        `${scenario}.nodeCount`,
      ),
      cpuRatio: ratio(medianValue(current.cpu), medianValue(previous.cpu), `${scenario}.cpu`),
      heapRatio: ratio(medianValue(current.heap), medianValue(previous.heap), `${scenario}.heap`),
    }
    scenarios[scenario] = result
    const configuredLimits = [
      ['commentNodes', result.commentNodes, limits.maxCommentNodes],
      ['mutationsRatio', result.mutationsRatio, limits.maxMutationRatio],
      ['nodeCountRatio', result.nodeCountRatio, limits.maxNodeCountRatio],
      ['cpuRatio', result.cpuRatio, limits.maxCpuRatio],
      ['heapRatio', result.heapRatio, limits.maxHeapRatio],
    ]
    for (const [dimension, actual, limit] of configuredLimits) {
      if (!isFiniteMeasurement(limit)) {
        throw new Error(
          `Anchor tiering budget is missing a numeric limit for ${scenario}.${dimension}`,
        )
      }
      if (actual > limit) failures.push({ scenario, dimension, actual, limit })
    }
    if (limits.minMutationRatio != null) {
      if (!isFiniteMeasurement(limits.minMutationRatio)) {
        throw new Error(
          `Anchor tiering budget is missing a numeric limit for ${scenario}.minMutationRatio`,
        )
      }
      if (result.mutationsRatio < limits.minMutationRatio) {
        failures.push({
          scenario,
          dimension: 'mutationsRatio',
          actual: result.mutationsRatio,
          operator: '<',
          limit: limits.minMutationRatio,
        })
      }
    }
    const effectRuns = medianValue(current.effectRuns)
    if (!isFiniteMeasurement(limits.expectedEffectRuns)) {
      throw new Error(`Anchor tiering budget is missing a numeric limit for ${scenario}.effectRuns`)
    }
    if (effectRuns !== limits.expectedEffectRuns) {
      failures.push({
        scenario,
        dimension: 'effectRuns',
        actual: effectRuns,
        limit: limits.expectedEffectRuns,
      })
    }
    if (limits.requireCpuOrHeapImprovement === true) {
      const actual = Math.min(result.cpuRatio, result.heapRatio)
      const limit = limits.maxCpuOrHeapRatio
      if (!isFiniteMeasurement(limit)) {
        throw new Error(
          `Anchor tiering budget is missing a numeric limit for ${scenario}.cpuOrHeapRatio`,
        )
      }
      if (actual > limit) failures.push({ scenario, dimension: 'cpuOrHeapRatio', actual, limit })
    }
  }

  const brotliRatio = ratio(totalBrotliBytes(report), totalBrotliBytes(baseline), 'size.brotli')
  const maxBrotliRatio = budget?.size?.maxBrotliRatio
  if (!isFiniteMeasurement(maxBrotliRatio)) {
    throw new Error('Anchor tiering budget is missing a numeric limit for size.brotliRatio')
  }
  if (brotliRatio > maxBrotliRatio) {
    failures.push({
      scenario: 'size',
      dimension: 'brotliRatio',
      actual: brotliRatio,
      limit: maxBrotliRatio,
    })
  }
  if (failures.length > 0) throw new AnchorTieringBudgetError(failures)
  return { passed: true, scenarios, size: { brotliRatio } }
}

export const compareAnchorTieringResults = (current, baseline) =>
  Object.fromEntries(
    ANCHOR_TIERING_SCENARIOS.map(scenario => [
      scenario,
      Object.fromEntries(
        Object.keys(metrics).map(metric => {
          const actual = medianValue(current?.[scenario]?.[metric] ?? {})
          const before = medianValue(baseline?.[scenario]?.[metric] ?? {})
          if (!Number.isFinite(actual) || !Number.isFinite(before) || before < 0) {
            throw new Error(`Cannot compare ${scenario}.${metric}`)
          }
          return [
            metric,
            {
              current: actual,
              baseline: before,
              delta: actual - before,
              improvementPercent:
                before === 0
                  ? actual === 0
                    ? 0
                    : Number.NEGATIVE_INFINITY
                  : (before - actual) / before,
            },
          ]
        }),
      ),
    ]),
  )

const runCommand = (command, args, capture = false) =>
  new Promise((resolve, reject) => {
    const chunks = []
    const child = spawn(command, args, {
      cwd: workspaceRoot,
      env: process.env,
      stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    })
    if (capture) child.stdout.on('data', chunk => chunks.push(chunk))
    child.once('error', reject)
    child.once('exit', (code, signal) =>
      code === 0
        ? resolve(capture ? Buffer.concat(chunks).toString('utf8').trim() : undefined)
        : reject(new Error(`${command} ${args.join(' ')} exited with ${code ?? signal}`)),
    )
  })

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')

const walkFiles = async directory => {
  const result = []
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.resolve(directory, entry.name)
    if (entry.isDirectory()) result.push(...(await walkFiles(file)))
    else result.push(file)
  }
  return result
}

const buildFixture = async () => {
  await runCommand('cargo', [
    'build',
    '--release',
    '--target',
    'wasm32-wasip1',
    '--manifest-path',
    'packages/swc-plugin-rue/Cargo.toml',
  ])
  await fs.copyFile(
    path.resolve(
      workspaceRoot,
      'packages/swc-plugin-rue/target/wasm32-wasip1/release/swc_plugin_rue.wasm',
    ),
    path.resolve(workspaceRoot, 'packages/swc-plugin-rue/swc-plugin-rue.wasm'),
  )
  await runCommand('node', [
    'scripts/build.js',
    '^shared$',
    '^runtime$',
    '^rue$',
    '--formats',
    'esm-bundler',
  ])
  const [{ build }, { default: VitePluginRue }] = await Promise.all([
    import('vite'),
    import('@rue-js/vite-plugin-rue'),
  ])
  await build({
    root: fixtureRoot,
    logLevel: 'info',
    plugins: [VitePluginRue({ transformTimeoutMs: 60_000 })],
    define: {
      __DEV__: false,
      __TEST__: false,
      __VERSION__: JSON.stringify(
        JSON.parse(await fs.readFile(path.resolve(workspaceRoot, 'package.json'), 'utf8')).version,
      ),
      __BROWSER__: true,
      __GLOBAL__: false,
      __ESM_BUNDLER__: true,
      __ESM_BROWSER__: false,
      __SSR__: false,
    },
    build: { emptyOutDir: true, minify: true, outDir: fixtureDist, target: 'es2022' },
  })
}

const startServer = async () => {
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
      if (pathname === '/favicon.ico') {
        response.writeHead(204).end()
        return
      }
      const file = path.resolve(fixtureDist, pathname === '/' ? 'index.html' : pathname.slice(1))
      if (!file.startsWith(`${fixtureDist}${path.sep}`)) throw new Error('Forbidden')
      const stats = await fs.stat(file)
      if (!stats.isFile()) throw new Error('Not a file')
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': file.endsWith('.html') ? 'text/html' : 'text/javascript',
      })
      createReadStream(file).pipe(response)
    } catch {
      response.writeHead(404).end('Not found')
    }
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Unable to start benchmark server')
  return {
    url: `http://127.0.0.1:${address.port}/`,
    close: () =>
      new Promise((resolve, reject) => server.close(error => (error ? reject(error) : resolve()))),
  }
}

const chromeCandidates = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)

const findChrome = async () => {
  for (const candidate of chromeCandidates) {
    try {
      await fs.access(candidate)
      return candidate
    } catch {}
  }
  throw new Error('No Chromium executable found; set CHROME_PATH')
}

const collectHeap = async session => {
  await session.send('HeapProfiler.collectGarbage')
  return (await session.send('Runtime.getHeapUsage')).usedSize
}

const measureRound = async (browser, url) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => Boolean(window.__RUE_ANCHOR_TIERING__))
  const session = await context.newCDPSession(page)
  const scenarios = {}
  for (const scenario of ANCHOR_TIERING_SCENARIOS) {
    const measurement = await page.evaluate(
      name => window.__RUE_ANCHOR_TIERING__.measure(name),
      scenario,
    )
    scenarios[scenario] = { ...measurement, heapBytes: await collectHeap(session) }
  }
  await context.close()
  if (errors.length > 0) throw new Error(`Browser errors: ${errors.join('; ')}`)
  return { scenarios }
}

const parseCli = argv => {
  const options = {
    rounds: 5,
    output: 'temp/performance/anchor-tiering-after.json',
    compare: null,
    budget: null,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--') continue
    if (argument === '--rounds') options.rounds = Number(argv[++index])
    else if (argument === '--output') options.output = argv[++index]
    else if (argument === '--compare') options.compare = argv[++index]
    else if (argument === '--budget') options.budget = argv[++index]
    else throw new Error(`Unknown argument: ${argument}`)
  }
  if (!Number.isInteger(options.rounds) || options.rounds < 5) {
    throw new Error('--rounds must be an integer of at least 5')
  }
  if (Boolean(options.compare) !== Boolean(options.budget)) {
    throw new Error('--compare and --budget must be supplied together')
  }
  return options
}

const readJsonFile = async relativePath => {
  const file = path.resolve(workspaceRoot, relativePath)
  if (!file.startsWith(`${workspaceRoot}${path.sep}`)) {
    throw new Error('Performance JSON input must stay within the workspace')
  }
  return JSON.parse(await fs.readFile(file, 'utf8'))
}

export const runAnchorTieringBenchmark = async options => {
  await buildFixture()
  const executablePath = await findChrome()
  const { chromium } = await import('playwright-core')
  const server = await startServer()
  const browser = await chromium.launch({ executablePath, headless: true })
  try {
    await measureRound(browser, server.url)
    const rounds = []
    for (let index = 0; index < options.rounds; index += 1) {
      console.info(`Chromium measured round ${index + 1}/${options.rounds}`)
      rounds.push(await measureRound(browser, server.url))
    }
    const normalized = normalizeAnchorTieringResults(rounds)
    const files = (await walkFiles(fixtureDist)).sort()
    const output = path.resolve(workspaceRoot, options.output)
    if (!output.startsWith(`${workspaceRoot}${path.sep}`)) {
      throw new Error('Performance output must stay within the workspace')
    }
    const environment = {
      chromeVersion: browser.version(),
      platform: process.platform,
      architecture: process.arch,
      nodeVersion: process.version,
    }
    const report = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      source: {
        gitCommit: await runCommand('git', ['rev-parse', 'HEAD'], true),
        gitDiffStat: await runCommand('git', ['diff', '--stat'], true),
        gitStatusShort: await runCommand('git', ['status', '--short'], true),
        chromeExecutable: executablePath,
        ...environment,
        environmentSha256: sha256(Buffer.from(JSON.stringify(environment))),
        fixtureArtifacts: await Promise.all(
          files.map(async file => {
            const bytes = await fs.readFile(file)
            return {
              path: path.relative(workspaceRoot, file),
              sha256: sha256(bytes),
              bytes: bytes.byteLength,
              brotliBytes: brotliCompressSync(bytes).byteLength,
            }
          }),
        ),
      },
      configuration: { measuredRounds: options.rounds, scenarios: ANCHOR_TIERING_SCENARIOS },
      results: normalized,
      validSamples: Object.fromEntries(
        ANCHOR_TIERING_SCENARIOS.map(scenario => [
          scenario,
          Object.fromEntries(
            Object.keys(metrics).map(metric => [metric, normalized[scenario][metric].validSamples]),
          ),
        ]),
      ),
    }
    let budgetError
    if (options.compare) {
      const baseline = await readJsonFile(options.compare)
      const budget = await readJsonFile(options.budget)
      try {
        report.budget = checkAnchorTieringBudget(report, baseline, budget)
      } catch (error) {
        if (error instanceof AnchorTieringBudgetError) {
          report.budget = { passed: false, failures: error.failures }
          budgetError = error
        } else {
          throw error
        }
      }
    }
    await fs.mkdir(path.dirname(output), { recursive: true })
    await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`)
    console.info(`Environment SHA-256: ${report.source.environmentSha256}`)
    console.info(`Valid samples: ${JSON.stringify(report.validSamples)}`)
    if (report.budget) console.info(`Budget: ${JSON.stringify(report.budget)}`)
    console.info(`Wrote anchor tiering report: ${output}`)
    if (budgetError) throw budgetError
    return report
  } finally {
    await browser.close()
    await server.close()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runAnchorTieringBenchmark(parseCli(process.argv.slice(2))).catch(error => {
    console.error(error)
    process.exitCode = 1
  })
}
