import { once } from 'node:events'
import { describe, expect, it } from 'vite-plus/test'
import {
  FIXTURE_HOOK_TIMEOUT_MS,
  FIXTURE_STARTUP_TIMEOUT_MS,
  startFixtureDevServer,
  stopFixtureDevServer,
  type FixtureDevServer,
} from './fixture-dev-server.js'

const PROCESS_EXIT_WAIT_MS = 1_000

async function waitForProcessExit(proc: FixtureDevServer['process']) {
  if (proc.exitCode != null || proc.signalCode != null) {
    return
  }

  await Promise.race([
    once(proc, 'exit'),
    new Promise(resolve => setTimeout(resolve, PROCESS_EXIT_WAIT_MS)),
  ])
}

function isProcessRunning(proc: FixtureDevServer['process']) {
  if (proc.pid == null) {
    return false
  }

  try {
    process.kill(proc.pid, 0)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') {
      return false
    }
    throw error
  }
}

describe('fixture dev server helper', () => {
  it('keeps Vitest hook timeout above the internal startup timeout', () => {
    expect(FIXTURE_HOOK_TIMEOUT_MS).toBeGreaterThan(FIXTURE_STARTUP_TIMEOUT_MS)
  })

  it('terminates the child process when startup readiness times out', async () => {
    let fixtureProcess: FixtureDevServer['process'] | undefined

    await expect(
      startFixtureDevServer({
        name: 'never-ready',
        root: process.cwd(),
        port: 49_999,
        command: {
          bin: process.execPath,
          args: [
            '-e',
            "console.log('server booted but never listened'); setInterval(() => {}, 1000);",
          ],
        },
        startupTimeoutMs: 100,
        readinessPollIntervalMs: 10,
        readyRequestTimeoutMs: 20,
        serverSettleDelayMs: 0,
        onSpawn: proc => {
          fixtureProcess = proc
        },
      }),
    ).rejects.toThrow('Fixture "never-ready" did not start within 100ms')

    expect(fixtureProcess).toBeDefined()
    if (fixtureProcess) {
      await waitForProcessExit(fixtureProcess)
      expect(isProcessRunning(fixtureProcess)).toBe(false)
    }
  })

  it('waits for a non-5xx response on the configured readiness path', async () => {
    const fixture = await startFixtureDevServer({
      name: 'eventually-ready',
      root: process.cwd(),
      port: 49_998,
      command: {
        bin: process.execPath,
        args: [
          '-e',
          [
            "const http = require('node:http')",
            'let attempts = 0',
            'http.createServer((req, res) => {',
            "  if (req.url !== '/ready') { res.statusCode = 404; res.end(); return }",
            '  attempts += 1',
            '  res.statusCode = attempts === 1 ? 500 : 200',
            '  res.end(String(attempts))',
            '}).listen(49998)',
          ].join(';'),
        ],
      },
      readinessPath: '/ready',
      startupTimeoutMs: 2_000,
      readinessPollIntervalMs: 10,
      serverSettleDelayMs: 0,
    })

    try {
      const result = await fixture.fetchPage('/ready')
      expect(result.status).toBe(200)
      expect(Number(result.html)).toBeGreaterThanOrEqual(3)
    } finally {
      await stopFixtureDevServer(fixture.process)
    }
  })
})
