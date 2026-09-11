// @ts-check
// copy from vuejs/core
// https://github.com/vuejs/core/blob/main/scripts/build.js

/*
Produces production builds and stitches together d.ts files.

To specify the package to build, simply pass its name and the desired build
formats to output (defaults to `buildOptions.formats` specified in that package,
or "esm-bundler"):

```
# name supports fuzzy match. will build all packages with name containing "dom":
nr build dom

# specify the format to output
nr build core --formats esm-bundler
```
*/

import fs from 'node:fs'
import { parseArgs } from 'node:util'
import path from 'node:path'
import { brotliCompressSync, gzipSync } from 'node:zlib'
import pico from 'picocolors'
import { cpus } from 'node:os'
import { targets as allTargets, exec, fuzzyMatchTarget } from './utils.js'
import { scanEnums } from './inline-enums.js'
import { spawnSync } from 'node:child_process'
import { buildDistributionPackage } from './vite-package-builder.js'
import { formatBytes } from './format-bytes.js'

const commit = spawnSync('git', ['rev-parse', '--short=7', 'HEAD']).stdout.toString().trim()

const { values, positionals: targets } = parseArgs({
  allowPositionals: true,
  options: {
    formats: {
      type: 'string',
      short: 'f',
    },
    devOnly: {
      type: 'boolean',
      short: 'd',
    },
    prodOnly: {
      type: 'boolean',
      short: 'p',
    },
    withTypes: {
      type: 'boolean',
      short: 't',
    },
    sourceMap: {
      type: 'boolean',
      short: 's',
    },
    release: {
      type: 'boolean',
    },
    all: {
      type: 'boolean',
      short: 'a',
    },
    size: {
      type: 'boolean',
    },
  },
})

const {
  formats,
  all: buildAllMatching,
  devOnly,
  prodOnly,
  withTypes: buildTypes,
  sourceMap,
  release: _isRelease,
  size: writeSize,
} = values

const sizeDir = path.resolve('temp/size')

run()

async function run() {
  if (writeSize) fs.mkdirSync(sizeDir, { recursive: true })
  const removeCache = scanEnums()
  try {
    const resolvedTargets = targets.length
      ? fuzzyMatchTarget(targets, buildAllMatching)
      : allTargets
    await ensureSwcPluginRueBuilt(resolvedTargets)
    await buildAll(resolvedTargets)
    await checkAllSizes(resolvedTargets)
    if (buildTypes) {
      await exec('pnpm', ['run', 'build-dts'], {
        stdio: 'inherit',
        env: targets.length
          ? {
              ...process.env,
              TARGETS: resolvedTargets.join(','),
            }
          : process.env,
      })
    }
  } finally {
    removeCache()
  }
}

/**
 * @param {Array<string>} targets
 * @returns {Promise<void>}
 */
/**
 * @param {Array<string>} targets
 * @returns {Promise<void>}
 */
async function ensureSwcPluginRueBuilt(targets) {
  if (!targets.includes('rue-design')) {
    return
  }

  const wasmPath = path.resolve('packages/swc-plugin-rue/swc-plugin-rue.wasm')
  if (fs.existsSync(wasmPath)) {
    return
  }

  console.log(pico.cyan('\nBuilding @rue-js/swc-plugin-rue wasm...'))
  await exec('pnpm', ['--filter', '@rue-js/swc-plugin-rue', 'run', 'build'], {
    stdio: 'inherit',
  })
}

/**
 * Builds all the targets in parallel.
 * @param {Array<string>} targets - An array of targets to build.
 * @returns {Promise<void>} - A promise representing the build process.
 */
async function buildAll(targets) {
  await runParallel(cpus().length, targets, build)
}

/**
 * Runs iterator function in parallel.
 * @template T - The type of items in the data source
 * @param {number} maxConcurrency - The maximum concurrency.
 * @param {Array<T>} source - The data source
 * @param {(item: T) => Promise<void>} iteratorFn - The iteratorFn
 * @returns {Promise<void[]>} - A Promise array containing all iteration results.
 */
async function runParallel(maxConcurrency, source, iteratorFn) {
  /**@type {Promise<void>[]} */
  const ret = []
  /**@type {Promise<void>[]} */
  const executing = []
  for (const item of source) {
    const p = Promise.resolve().then(() => iteratorFn(item))
    ret.push(p)

    if (maxConcurrency <= source.length) {
      const e = p.then(() => {
        executing.splice(executing.indexOf(e), 1)
      })
      executing.push(e)
      if (executing.length >= maxConcurrency) {
        await Promise.race(executing)
      }
    }
  }
  return Promise.all(ret)
}

/**
 * Builds the target.
 * @param {string} target - The target to build.
 * @returns {Promise<void>} - A promise representing the build process.
 */
async function build(target) {
  const pkgDir = path.resolve(`packages/${target}`)
  const pkg = JSON.parse(fs.readFileSync(`${pkgDir}/package.json`, 'utf-8'))

  // Text owns a multi-entry server/client packaging pipeline. Its shims deliberately
  // accept runtime-selected page factories, which are outside Rue's closed compiler ABI.
  if (target === 'text') {
    await exec('pnpm', ['--dir', pkgDir, 'run', 'build'], { stdio: 'inherit' })
    return
  }

  // if building a specific format, do not remove dist.
  if (!formats && fs.existsSync(`${pkgDir}/dist`)) {
    fs.rmSync(`${pkgDir}/dist`, { recursive: true })
  }

  const env = (pkg.buildOptions && pkg.buildOptions.env) || (devOnly ? 'development' : 'production')

  process.env.COMMIT = commit
  await buildDistributionPackage(target, {
    formats,
    env,
    prodOnly,
    sourceMap,
  })
}

/**
 * Checks the sizes of all targets.
 * @param {string[]} targets - The targets to check sizes for.
 * @returns {Promise<void>}
 */
async function checkAllSizes(targets) {
  if (devOnly || (formats && !formats.includes('global'))) {
    return
  }
  console.log()
  for (const target of targets) {
    await checkSize(target)
  }
  console.log()
}

/**
 * Checks the size of a target.
 * @param {string} target - The target to check the size for.
 * @returns {Promise<void>}
 */
async function checkSize(target) {
  const pkgDir = path.resolve(`packages/${target}`)
  await checkFileSize(`${pkgDir}/dist/${target}.global.prod.js`)
  if (!formats || formats.includes('global-runtime')) {
    await checkFileSize(`${pkgDir}/dist/${target}.runtime.global.prod.js`)
  }
}

/**
 * Checks the file size.
 * @param {string} filePath - The path of the file to check the size for.
 * @returns {Promise<void>}
 */
async function checkFileSize(filePath) {
  if (!fs.existsSync(filePath)) {
    return
  }
  const file = fs.readFileSync(filePath)
  const fileName = path.basename(filePath)

  const gzipped = gzipSync(file)
  const brotli = brotliCompressSync(file)

  console.log(
    `${pico.gray(pico.bold(fileName))} min:${formatBytes(
      file.length,
    )} / gzip:${formatBytes(gzipped.length)} / brotli:${formatBytes(brotli.length)}`,
  )

  if (writeSize)
    fs.writeFileSync(
      path.resolve(sizeDir, `${fileName}.json`),
      JSON.stringify({
        file: fileName,
        size: file.length,
        gzip: gzipped.length,
        brotli: brotli.length,
      }),
      'utf-8',
    )
}
