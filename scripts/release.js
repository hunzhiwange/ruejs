// @ts-check
// copy from vuejs/core
// https://github.com/vuejs/core/blob/main/scripts/release.js
import fs from 'node:fs'
import path from 'node:path'
import pico from 'picocolors'
import enquirer from 'enquirer'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { exec } from './utils.js'
import { parseArgs } from 'node:util'
import { getPackageRoot, getReleasePackages, updateVersions } from './update-version.js'

/**
 * @typedef {{
 *   name: string
 *   version: string
 *   dependencies?: { [dependenciesPackageName: string]: string }
 *   peerDependencies?: { [peerDependenciesPackageName: string]: string }
 * }} Package
 */

/**
 * @typedef {{
 *   filePath: string
 *   existed: boolean
 *   content: string | null
 * }} FileSnapshot
 */

let versionUpdated = false

const { prompt } = enquirer
const semver = createRequire(import.meta.url)('semver')
const currentVersion = createRequire(import.meta.url)('../package.json').version
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    preid: {
      type: 'string',
    },
    check: {
      type: 'boolean',
    },
    dry: {
      type: 'boolean',
    },
    tag: {
      type: 'string',
    },
    skipBuild: {
      type: 'boolean',
    },
    skipTests: {
      type: 'boolean',
    },
    skipGit: {
      type: 'boolean',
    },
    skipPrompts: {
      type: 'boolean',
    },
    publish: {
      type: 'boolean',
      default: false,
    },
    publishOnly: {
      type: 'boolean',
    },
    registry: {
      type: 'string',
    },
  },
})

const isCheckOnly = args.check
const preId = args.preid || semver.prerelease(currentVersion)?.[0]
const isDryRun = args.dry || isCheckOnly
const shouldRunValidationCommands = !args.dry || isCheckOnly
/** @type {boolean | undefined} */
let skipTests = args.skipTests
const skipBuild = args.skipBuild
const skipPrompts = args.skipPrompts
const skipGit = args.skipGit

const packages = getReleasePackages()

/** @type {string[]} */
const skippedPackages = []

/** @type {ReadonlyArray<string>} */
const versionIncrements = [
  'patch',
  'minor',
  'major',
  ...(preId ? /** @type {const} */ (['prepatch', 'preminor', 'premajor', 'prerelease']) : []),
]

const inc = (/** @type {string} */ i) =>
  semver.inc(currentVersion, i, typeof preId === 'string' ? preId : undefined)
const run = async (
  /** @type {string} */ bin,
  /** @type {ReadonlyArray<string>} */ args,
  /** @type {import('node:child_process').SpawnOptions} */ opts = {},
) => {
  const env =
    bin === 'pnpm'
      ? {
          ...process.env,
          ...opts.env,
          PNPM_CONFIG_AUTO_INSTALL_PEERS: 'false',
          npm_config_auto_install_peers: 'false',
        }
      : opts.env

  return exec(bin, args, { stdio: 'inherit', ...opts, env })
}
const dryRun = async (
  /** @type {string} */ bin,
  /** @type {ReadonlyArray<string>} */ args,
  /** @type {import('node:child_process').SpawnOptions} */ opts = {},
) => console.log(pico.blue(`[dryrun] ${bin} ${args.join(' ')}`), opts)
const runIfNotDry = isDryRun ? dryRun : run
const getPkgRoot = getPackageRoot
const step = (/** @type {string} */ msg) => console.log(pico.cyan(msg))
const releaseVerificationPackages = [
  {
    name: '@rue-js/swc-plugin-rue',
    cwd: path.resolve(__dirname, '../packages/swc-plugin-rue'),
  },
  {
    name: '@rue-js/text',
    cwd: path.resolve(__dirname, '../packages/text'),
    testScript: 'test-unit',
  },
]

function getReleaseCheckSnapshotPaths() {
  return [
    path.resolve(__dirname, '../package.json'),
    path.resolve(__dirname, '../CHANGELOG.md'),
    path.resolve(__dirname, '../pnpm-lock.yaml'),
    ...packages.map(pkg => path.resolve(getPkgRoot(pkg), 'package.json')),
  ]
}

/**
 * @param {ReadonlyArray<string>} filePaths
 * @returns {FileSnapshot[]}
 */
function captureFileSnapshots(filePaths) {
  return filePaths.map(filePath => {
    const existed = fs.existsSync(filePath)
    return {
      filePath,
      existed,
      content: existed ? fs.readFileSync(filePath, 'utf-8') : null,
    }
  })
}

/**
 * @param {ReadonlyArray<FileSnapshot>} snapshots
 */
function restoreFileSnapshots(snapshots) {
  for (const snapshot of snapshots) {
    if (snapshot.existed) {
      fs.writeFileSync(snapshot.filePath, snapshot.content ?? '')
      continue
    }

    if (fs.existsSync(snapshot.filePath)) {
      fs.rmSync(snapshot.filePath)
    }
  }
}

const releaseCheckSnapshots = isCheckOnly
  ? captureFileSnapshots(getReleaseCheckSnapshotPaths())
  : null

async function main() {
  if (!(await isInSyncWithRemote())) {
    return
  }

  let targetVersion = positionals[0]

  if (isCheckOnly && skipPrompts && !targetVersion) {
    targetVersion = currentVersion
    step(
      `Release check will use current version v${targetVersion}. ` +
        'Pass a version argument to simulate another release version.',
    )
  }

  if (!targetVersion) {
    // no explicit version, offer suggestions
    /** @type {{ release: string }} */
    const { release } = await prompt({
      type: 'select',
      name: 'release',
      message: 'Select release type',
      choices: versionIncrements.map(i => `${i} (${inc(i)})`).concat(['custom']),
    })

    if (release === 'custom') {
      /** @type {{ version: string }} */
      const result = await prompt({
        type: 'input',
        name: 'version',
        message: 'Input custom version',
        initial: currentVersion,
      })
      targetVersion = result.version
    } else {
      targetVersion = release.match(/\((.*)\)/)?.[1] ?? ''
    }
  }

  if (versionIncrements.includes(targetVersion)) {
    targetVersion = inc(targetVersion)
  }

  if (!semver.valid(targetVersion)) {
    throw new Error(`invalid target version: ${targetVersion}`)
  }

  if (skipPrompts) {
    step(`${isCheckOnly ? 'Running release check for' : 'Releasing'} v${targetVersion}...`)
  } else {
    /** @type {{ yes: boolean }} */
    const { yes: confirmRelease } = await prompt({
      type: 'confirm',
      name: 'yes',
      message: `Releasing v${targetVersion}. Confirm?`,
    })

    if (!confirmRelease) {
      return
    }
  }

  await runReleaseCheckTypecheckIfNeeded()

  await runTestsIfNeeded()

  // update all package versions and inter-dependencies
  step('\nUpdating cross dependencies...')
  updateVersions(targetVersion, packages)
  versionUpdated = true

  // generate changelog
  step('\nGenerating changelog...')
  await run(`pnpm`, ['run', 'changelog'])

  if (!skipPrompts) {
    /** @type {{ yes: boolean }} */
    const { yes: changelogOk } = await prompt({
      type: 'confirm',
      name: 'yes',
      message: `Changelog generated. Does it look good?`,
    })

    if (!changelogOk) {
      return
    }
  }

  // update pnpm-lock.yaml
  step('\nUpdating lockfile...')
  await run(`pnpm`, ['install', '--prefer-offline'])

  if (!skipGit) {
    const { stdout } = await run('git', ['diff'], { stdio: 'pipe' })
    if (stdout) {
      step('\nCommitting changes...')
      await runIfNotDry('git', ['add', '-A'])
      await runIfNotDry('git', ['commit', '-m', `release: v${targetVersion}`])
    } else {
      console.log('No changes to commit.')
    }
  }

  // publish packages
  if (args.publish) {
    await buildPackages()
    await publishPackages(targetVersion)
  }

  // push to GitHub
  if (!skipGit) {
    step('\nPushing to GitHub...')
    await runIfNotDry('git', ['tag', `v${targetVersion}`])
    await runIfNotDry('git', ['push', 'origin', `refs/tags/v${targetVersion}`])
    await runIfNotDry('git', ['push'])
  }

  if (isCheckOnly) {
    console.log(
      pico.yellow(
        '\nRelease check only: versioning, changelog, and lockfile generation were validated locally.',
      ),
    )
  } else if (!args.publish) {
    console.log(
      pico.yellow(
        '\nRelease will be done via GitHub Actions.\n' +
          'Check status at https://github.com/hunzhiwange/ruejs/actions/workflows/release.yml',
      ),
    )
  }

  if (isCheckOnly) {
    console.log(`\nRelease check finished - local release files will be restored.`)
  } else if (isDryRun) {
    console.log(`\nDry run finished - run git diff to see package changes.`)
  }

  if (skippedPackages.length) {
    console.log(
      pico.yellow(
        `The following packages are skipped and NOT published:\n- ${skippedPackages.join('\n- ')}`,
      ),
    )
  }
  console.log()
}

async function runReleaseCheckTypecheckIfNeeded() {
  if (!isCheckOnly) {
    return
  }

  step('\nRunning TypeScript check...')
  if (shouldRunValidationCommands) {
    await run('pnpm', ['exec', 'tsc', '--incremental', '--noEmit'])
    await runReleaseCheckTextTypecheck()
  } else {
    console.log(`Skipped (dry run)`)
  }
}

async function runReleaseCheckTextTypecheck() {
  step('\nRunning @rue-js/text package check...')
  await run('pnpm', ['--dir', 'packages/text', 'run', 'check'])
}

async function runTestsIfNeeded() {
  if (!skipTests && !isCheckOnly) {
    step('Checking CI status for HEAD...')
    let isCIPassed = await getCIResult()
    skipTests ||= isCIPassed

    if (isCIPassed) {
      if (!skipPrompts) {
        /** @type {{ yes: boolean }} */
        const { yes: promptSkipTests } = await prompt({
          type: 'confirm',
          name: 'yes',
          message: `CI for this commit passed. Skip local tests?`,
        })
        skipTests = promptSkipTests
      } else {
        skipTests = true
      }
    } else if (skipPrompts) {
      throw new Error(
        'CI for the latest commit has not passed yet. ' +
          'Only run the release workflow after the CI has passed.',
      )
    }
  } else if (!skipTests) {
    step('Release check mode: skipping CI gate and running local tests.')
  }

  if (!skipTests) {
    step('\nRunning tests...')
    if (shouldRunValidationCommands) {
      await run('pnpm', ['run', 'test', '--run'])
      await runReleaseVerificationPackageTests()
      await run('pnpm', ['run', 'check:compiler-runtime-boundary'])
      await run('node', ['scripts/compiler-only-runtime-audit.js', '--check'])
      await run('pnpm', ['run', 'size:tree-shaking:check'])
      await run('pnpm', ['run', 'size-runtime', '--', '--check'])
    } else {
      console.log(`Skipped (dry run)`)
    }
  } else {
    step('Tests skipped.')
  }
}

async function runReleaseVerificationPackageTests() {
  for (const pkg of releaseVerificationPackages) {
    step(`\nRunning release verification for ${pkg.name}...`)
    await run('npm', ['run', pkg.testScript ?? 'test'], { cwd: pkg.cwd })
  }
}

async function getCIResult() {
  try {
    const sha = await getSha()
    const res = await fetch(
      `https://api.github.com/repos/ruejs/core/actions/runs?head_sha=${sha}` +
        `&status=success&exclude_pull_requests=true`,
    )
    /** @type {{ workflow_runs: ({ name: string, conclusion: string })[] }} */
    const data = await res.json()
    return data.workflow_runs.some(({ name, conclusion }) => {
      return name === 'ci' && conclusion === 'success'
    })
  } catch {
    console.error('Failed to get CI status for current commit.')
    return false
  }
}

async function isInSyncWithRemote() {
  if (isCheckOnly) {
    console.log(pico.yellow('Release check: skipping remote sync requirement.'))
    return true
  }

  try {
    const branch = await getBranch()
    const res = await fetch(`https://api.github.com/repos/ruejs/core/commits/${branch}?per_page=1`)
    const data = await res.json()
    if (data.sha === (await getSha())) {
      console.log(`${pico.green(`✓`)} commit is up-to-date with remote.\n`)
      return true
    } else {
      if (skipPrompts) {
        console.log(
          pico.yellow(
            'Local HEAD is not up-to-date with remote. Continuing because --skipPrompts is enabled.',
          ),
        )
        return true
      }

      /** @type {{ yes: boolean }} */
      const { yes } = await prompt({
        type: 'confirm',
        name: 'yes',
        message: pico.red(
          `Local HEAD is not up-to-date with remote. Are you sure you want to continue?`,
        ),
      })
      return yes
    }
  } catch {
    console.error(pico.yellow('Failed to check whether local HEAD is up-to-date with remote.'))
    if (skipPrompts) {
      console.log(
        pico.yellow('Continuing without remote sync check because --skipPrompts is enabled.'),
      )
      return true
    }

    /** @type {{ yes: boolean }} */
    const { yes } = await prompt({
      type: 'confirm',
      name: 'yes',
      message: pico.yellow(`Continue without remote sync check?`),
    })
    return yes
  }
}

async function getSha() {
  return (await exec('git', ['rev-parse', 'HEAD'])).stdout
}

async function getBranch() {
  return (await exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'])).stdout
}

async function buildPackages() {
  step('\nBuilding all packages...')
  if (!skipBuild) {
    if (shouldRunValidationCommands) {
      await run('pnpm', ['run', 'build', '--withTypes'])
    } else {
      console.log(`Skipped (dry run)`)
    }
  } else {
    console.log(`(skipped)`)
  }
}

/**
 * @param {string} version
 */
async function publishPackages(version) {
  // publish packages
  step('\nPublishing packages...')

  const additionalPublishFlags = []
  if (isDryRun) {
    additionalPublishFlags.push('--dry-run')
  }
  if (isDryRun || skipGit || process.env.CI) {
    additionalPublishFlags.push('--no-git-checks')
  }
  // add provenance metadata when releasing from CI
  // skip provenance if not publishing to actual npm
  if (process.env.CI && !args.registry) {
    additionalPublishFlags.push('--provenance')
  }

  for (const pkg of packages) {
    await publishPackage(pkg, version, additionalPublishFlags)
  }
}

/**
 * @param {string} pkgName
 * @param {string} version
 * @param {ReadonlyArray<string>} additionalFlags
 */
async function publishPackage(pkgName, version, additionalFlags) {
  if (skippedPackages.includes(pkgName)) {
    return
  }

  let releaseTag = null
  if (args.tag) {
    releaseTag = args.tag
  } else if (version.includes('alpha')) {
    releaseTag = 'alpha'
  } else if (version.includes('beta')) {
    releaseTag = 'beta'
  } else if (version.includes('rc')) {
    releaseTag = 'rc'
  }

  step(`Publishing ${pkgName}...`)
  try {
    // Don't change the package manager here as we rely on pnpm to handle
    // workspace:* deps
    await run(
      'pnpm',
      [
        'publish',
        ...(releaseTag ? ['--tag', releaseTag] : []),
        '--access',
        'public',
        ...(args.registry ? ['--registry', args.registry] : []),
        ...additionalFlags,
      ],
      {
        cwd: getPkgRoot(pkgName),
        stdio: 'pipe',
      },
    )
    console.log(pico.green(`Successfully published ${pkgName}@${version}`))
  } catch (/** @type {any} */ e) {
    if (e.message?.match(/previously published/)) {
      console.log(pico.red(`Skipping already published: ${pkgName}`))
    } else {
      throw e
    }
  }
}

async function publishOnly() {
  const targetVersion = positionals[0]
  if (targetVersion) {
    updateVersions(targetVersion, packages)
  }
  await buildPackages()
  await publishPackages(currentVersion)
}

const fnToRun = args.publishOnly ? publishOnly : main

async function runRelease() {
  try {
    await fnToRun()
  } catch (err) {
    if (versionUpdated && !isCheckOnly) {
      // revert to current version on failed releases
      updateVersions(currentVersion, packages)
    }
    throw err
  } finally {
    if (releaseCheckSnapshots) {
      restoreFileSnapshots(releaseCheckSnapshots)
      console.log(pico.cyan('\nRelease check restored local release files.'))
    }
  }
}

runRelease().catch(err => {
  console.error(err)
  process.exit(1)
})
