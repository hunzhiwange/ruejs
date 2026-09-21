import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

type RecoveryStatus = 'migrated-passing' | 'migrated-failing' | 'covered' | 'obsolete'
type RecoveryEntry = {
  originalPath: string
  classification: 'migrate' | 'covered' | 'obsolete'
  targetTask: number | null
  status: RecoveryStatus
  evidencePath: string
  failingTests: string[]
}
type ExpectedFailure = {
  path: string
  line: number
  name: string
  focusedCommand: string
}
type RecoveryManifest = {
  source: { base: string; deletion: string; pathspecs: string[] }
  entries: RecoveryEntry[]
  expectedFailures: ExpectedFailure[]
}

const projectRoot = resolve(import.meta.dirname, '../../..')
const manifestPath = resolve(import.meta.dirname, 'deleted-test-recovery.manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as RecoveryManifest

const readDeletedPaths = () =>
  execFileSync(
    'git',
    [
      'diff',
      '--diff-filter=D',
      '--name-only',
      manifest.source.base,
      manifest.source.deletion,
      '--',
      ...manifest.source.pathspecs,
    ],
    { cwd: projectRoot, encoding: 'utf8' },
  )
    .trim()
    .split('\n')
    .filter(Boolean)
    .sort()

const readExpectedFailures = (path: string) => {
  const source = readFileSync(resolve(projectRoot, path), 'utf8')
  const failures: string[] = []
  let cursor = 0
  while ((cursor = source.indexOf('it.fails(', cursor)) >= 0) {
    const rest = source.slice(cursor + 'it.fails('.length).trimStart()
    const quote = rest[0]
    const end = rest.indexOf(quote, 1)
    if ((quote === "'" || quote === '"' || quote === '`') && end > 1) {
      failures.push(rest.slice(1, end))
    }
    cursor += 'it.fails('.length
  }
  return failures
}

describe('deleted test recovery manifest', () => {
  it('matches the complete 199-path deletion set exactly once', () => {
    const originals = manifest.entries.map(entry => entry.originalPath)
    expect(originals).toHaveLength(199)
    expect(new Set(originals).size).toBe(199)
    expect([...originals].sort()).toEqual(readDeletedPaths())
  })

  it('gives every path a final classification and readable evidence', () => {
    for (const entry of manifest.entries) {
      expect(['migrated-passing', 'migrated-failing', 'covered', 'obsolete']).toContain(
        entry.status,
      )
      expect(existsSync(resolve(projectRoot, entry.evidencePath))).toBe(true)

      if (entry.status.startsWith('migrated-')) {
        expect(entry.classification).toBe('migrate')
        expect(entry.evidencePath).toBe(entry.originalPath)
        expect(entry.targetTask).toBeGreaterThanOrEqual(3)
        expect(entry.targetTask).toBeLessThanOrEqual(10)
        expect(entry.status === 'migrated-failing').toBe(entry.failingTests.length > 0)
      } else {
        expect(entry.classification).toBe(entry.status)
        expect(entry.failingTests).toEqual([])
      }
    }
  })

  it('registers every executable it.fails case with a focused command', () => {
    const evidencePaths = [...new Set(manifest.entries.map(entry => entry.evidencePath))].filter(
      path => /\.(?:ts|tsx)$/.test(path),
    )
    const actual = evidencePaths
      .flatMap(path => readExpectedFailures(path).map(name => ({ path, name })))
      .sort((a, b) => a.path.localeCompare(b.path) || a.name.localeCompare(b.name))
    const registered = manifest.expectedFailures
      .map(({ path, name }) => ({ path, name }))
      .sort((a, b) => a.path.localeCompare(b.path) || a.name.localeCompare(b.name))

    expect(registered).toEqual(actual)
    expect(new Set(registered.map(item => `${item.path}\0${item.name}`)).size).toBe(
      registered.length,
    )
    for (const failure of manifest.expectedFailures) {
      expect(failure.line).toBeGreaterThan(0)
      expect(failure.focusedCommand).toContain(failure.path)
      expect(failure.focusedCommand).toContain('-t')
      expect(failure.focusedCommand).toContain(failure.name)
    }
  })

  it('contains no silent skips and keeps assertions in every executable evidence file', () => {
    const evidencePaths = [
      ...new Set(
        manifest.entries
          .filter(entry => entry.status !== 'obsolete')
          .map(entry => entry.evidencePath),
      ),
    ].filter(path => /\.(?:ts|tsx)$/.test(path))

    for (const path of evidencePaths) {
      const source = readFileSync(resolve(projectRoot, path), 'utf8')
      expect(source).not.toMatch(
        /\b(?:it|test|describe)\.(?:skip|todo)\s*\(|\b(?:xit|xtest|xdescribe)\s*\(/,
      )
      expect(source).toMatch(/\bexpect\s*\(|\bdefineActualExamplePageTest\s*\(/)
    }
  })

  it('includes all eleven task-8 paths in its completed evidence shard', () => {
    const shard = JSON.parse(
      readFileSync(resolve(import.meta.dirname, 'deleted-test-recovery.task-8.json'), 'utf8'),
    ) as {
      manifestEntries: Array<{ originalPath: string }>
      manifestStatus: { assigned: number; migrated: number; skipped: number }
    }
    const assigned = manifest.entries
      .filter(entry => entry.targetTask === 8)
      .map(entry => entry.originalPath)
      .sort()

    expect(shard.manifestStatus).toEqual({ assigned: 11, migrated: 11, skipped: 0 })
    expect(shard.manifestEntries.map(entry => entry.originalPath).sort()).toEqual(assigned)
  })
})
