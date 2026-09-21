import { spawn, type ChildProcess } from 'node:child_process'
import fsp from 'node:fs/promises'
import path from 'node:path'

// Ecosystem fixtures can spend well over 60 seconds on their first RSC/SSR
// compilation when the full test suite is competing for CPU. Use the same
// budget locally and in CI so either full-suite run can finish a cold start.
export const FIXTURE_STARTUP_TIMEOUT_MS = 120_000
export const FIXTURE_HOOK_TIMEOUT_MS = FIXTURE_STARTUP_TIMEOUT_MS + 15_000

const READY_POLL_INTERVAL_MS = 250
const READY_REQUEST_TIMEOUT_MS = 2_000
const SERVER_SETTLE_DELAY_MS = 500
const SERVER_STOP_TIMEOUT_MS = 5_000
const ARTIFACT_COPY_LOCK_STALE_MS = 60_000
const TEXT_PACKAGE_ROOT = path.resolve(import.meta.dirname, '..')
const REPO_ROOT = path.resolve(TEXT_PACKAGE_ROOT, '../..')
const TEXT_PACKAGE_SELF_LINKS = [
  path.join(TEXT_PACKAGE_ROOT, 'node_modules', 'text'),
  path.join(TEXT_PACKAGE_ROOT, 'node_modules', '@rue-js', 'text'),
] as const
const SERVER_RENDERER_PACKAGE_ROOT = path.resolve(TEXT_PACKAGE_ROOT, '../server-renderer')
const SERVER_RENDERER_REQUIRED_FILES = ['dist/server-renderer.esm-bundler.js'] as const

export type FixtureDevServer = {
  process: ChildProcess
  baseUrl: string
  fetchPage: (pathname: string) => Promise<{ html: string; status: number }>
}

type FixtureDevServerOptions = {
  name: string
  root: string
  port: number
  command?: {
    bin: string
    args: string[]
  }
  startupTimeoutMs?: number
  readinessPollIntervalMs?: number
  readyRequestTimeoutMs?: number
  readinessPath?: string
  serverSettleDelayMs?: number
  onSpawn?: (proc: ChildProcess) => void
}

export async function startFixtureDevServer({
  name,
  root,
  port,
  command = {
    bin: 'npx',
    args: ['vite', '--force', '--port', String(port), '--strictPort'],
  },
  startupTimeoutMs = FIXTURE_STARTUP_TIMEOUT_MS,
  readinessPollIntervalMs = READY_POLL_INTERVAL_MS,
  readyRequestTimeoutMs = READY_REQUEST_TIMEOUT_MS,
  readinessPath = '/',
  serverSettleDelayMs = SERVER_SETTLE_DELAY_MS,
  onSpawn,
}: FixtureDevServerOptions): Promise<FixtureDevServer> {
  await ensureTextPackageSelfLink()

  const baseUrl = `http://localhost:${port}`
  const proc = spawn(command.bin, command.args, {
    cwd: root,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
    detached: process.platform !== 'win32',
  })

  onSpawn?.(proc)

  let output = ''
  const appendOutput = (data: Buffer | string) => {
    output += data.toString()
  }

  proc.stdout?.on('data', appendOutput)
  proc.stderr?.on('data', appendOutput)

  try {
    await waitForFixtureReady({
      name,
      baseUrl,
      proc,
      getOutput: () => output,
      startupTimeoutMs,
      readinessPollIntervalMs,
      readyRequestTimeoutMs,
      readinessPath,
    })
  } catch (error) {
    await stopFixtureDevServer(proc)
    throw error
  }

  await new Promise(resolve => setTimeout(resolve, serverSettleDelayMs))

  async function fetchPage(pathname: string) {
    const res = await fetch(`${baseUrl}${pathname}`, {
      signal: AbortSignal.timeout(10_000),
    })
    const html = await res.text()
    return { html, status: res.status }
  }

  return { process: proc, baseUrl, fetchPage }
}

async function ensureTextPackageSelfLink(): Promise<void> {
  await ensureServerRendererArtifacts()

  await Promise.all(TEXT_PACKAGE_SELF_LINKS.map(link => ensureTextPackageSelfLinkAt(link)))
}

async function ensureTextPackageSelfLinkAt(link: string): Promise<void> {
  try {
    const stat = await fsp.lstat(link)
    if (stat.isSymbolicLink()) {
      return
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }

  await fsp.mkdir(path.dirname(link), { recursive: true })
  await fsp.symlink(TEXT_PACKAGE_ROOT, link, 'junction')
}

async function ensureServerRendererArtifacts(): Promise<void> {
  if (await hasServerRendererArtifacts()) {
    return
  }

  const releaseLock = await acquireSetupLock('server-renderer-build')
  try {
    if (await hasServerRendererArtifacts()) {
      return
    }

    await runSetupCommand('node', [
      path.join(REPO_ROOT, 'scripts/build.js'),
      'server-renderer',
      '-f',
      'esm-bundler',
    ])
  } finally {
    await releaseLock()
  }
}

async function hasServerRendererArtifacts(): Promise<boolean> {
  try {
    await Promise.all(
      SERVER_RENDERER_REQUIRED_FILES.map(file =>
        fsp.access(path.join(SERVER_RENDERER_PACKAGE_ROOT, file)),
      ),
    )
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false
    }
    throw error
  }
}

async function runSetupCommand(bin: string, args: string[]): Promise<void> {
  const proc = spawn(bin, args, {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let output = ''
  proc.stdout?.on('data', data => {
    output += data.toString()
  })
  proc.stderr?.on('data', data => {
    output += data.toString()
  })

  await new Promise<void>((resolve, reject) => {
    proc.once('error', reject)
    proc.once('exit', code => {
      if (code === 0) {
        resolve()
        return
      }
      reject(
        new Error(`Fixture setup command failed (${[bin, ...args].join(' ')}):\n${output.trim()}`),
      )
    })
  })
}

async function acquireSetupLock(name: string): Promise<() => Promise<void>> {
  const lockDir = path.join(TEXT_PACKAGE_ROOT, `dist/.${name}.lock`)
  await fsp.mkdir(path.dirname(lockDir), { recursive: true })

  while (true) {
    try {
      await fsp.mkdir(lockDir)
      return () => fsp.rm(lockDir, { force: true, recursive: true })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error
      }
    }

    try {
      const stat = await fsp.stat(lockDir)
      if (Date.now() - stat.mtimeMs > ARTIFACT_COPY_LOCK_STALE_MS) {
        await fsp.rm(lockDir, { force: true, recursive: true })
        continue
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }

    await new Promise(resolve => setTimeout(resolve, 50))
  }
}

export async function stopFixtureDevServer(proc: ChildProcess | null | undefined) {
  if (!proc || proc.exitCode != null || proc.signalCode != null) {
    closeFixtureProcessHandles(proc)
    return
  }

  if (process.platform === 'win32') {
    try {
      proc.kill('SIGTERM')
    } catch {
      closeFixtureProcessHandles(proc)
      return
    }
    await waitForFixtureExit(proc)
    closeFixtureProcessHandles(proc)
    return
  }

  const pid = proc.pid
  if (pid == null) {
    closeFixtureProcessHandles(proc)
    return
  }

  try {
    process.kill(-pid, 'SIGTERM')
  } catch {
    try {
      proc.kill('SIGKILL')
    } catch {
      // ignore
    }
  }

  await waitForFixtureExit(proc)
  closeFixtureProcessHandles(proc)
}

async function waitForFixtureExit(proc: ChildProcess) {
  if (await waitForExitWithin(proc, SERVER_STOP_TIMEOUT_MS)) {
    return
  }

  try {
    if (process.platform === 'win32' || proc.pid == null) {
      proc.kill('SIGKILL')
    } else {
      process.kill(-proc.pid, 'SIGKILL')
    }
  } catch {
    // ignore
  }

  await waitForExitWithin(proc, 1_000)
}

async function waitForExitWithin(proc: ChildProcess, timeoutMs: number) {
  if (proc.exitCode != null || proc.signalCode != null) {
    return true
  }

  return new Promise<boolean>(resolve => {
    const timeout = setTimeout(() => {
      proc.off('exit', onExit)
      resolve(false)
    }, timeoutMs)
    const onExit = () => {
      clearTimeout(timeout)
      resolve(true)
    }

    proc.once('exit', onExit)
  })
}

function closeFixtureProcessHandles(proc: ChildProcess | null | undefined) {
  proc?.stdin?.destroy()
  proc?.stdout?.destroy()
  proc?.stderr?.destroy()
  proc?.removeAllListeners()
}

async function waitForFixtureReady({
  name,
  baseUrl,
  proc,
  getOutput,
  startupTimeoutMs,
  readinessPollIntervalMs,
  readyRequestTimeoutMs,
  readinessPath,
}: {
  name: string
  baseUrl: string
  proc: ChildProcess
  getOutput: () => string
  startupTimeoutMs: number
  readinessPollIntervalMs: number
  readyRequestTimeoutMs: number
  readinessPath: string
}) {
  await new Promise<void>((resolve, reject) => {
    const deadline = Date.now() + startupTimeoutMs

    const onError = (err: Error) => {
      cleanup()
      reject(err)
    }

    const onExit = (code: number | null) => {
      cleanup()
      reject(new Error(`Fixture "${name}" exited with code ${code}: ${getOutput()}`))
    }

    let pollTimer: NodeJS.Timeout | undefined
    const cleanup = () => {
      if (pollTimer) {
        clearTimeout(pollTimer)
      }
      proc.off('error', onError)
      proc.off('exit', onExit)
    }

    const checkReady = async () => {
      if (Date.now() >= deadline) {
        cleanup()
        reject(
          new Error(`Fixture "${name}" did not start within ${startupTimeoutMs}ms: ${getOutput()}`),
        )
        return
      }

      try {
        const res = await fetch(`${baseUrl}${readinessPath}`, {
          redirect: 'manual',
          signal: AbortSignal.timeout(readyRequestTimeoutMs),
        })
        await res.body?.cancel()
        if (res.status >= 500) {
          pollTimer = setTimeout(checkReady, readinessPollIntervalMs)
          return
        }
        cleanup()
        resolve()
      } catch {
        pollTimer = setTimeout(checkReady, readinessPollIntervalMs)
      }
    }

    proc.on('error', onError)
    proc.on('exit', onExit)
    void checkReady()
  })
}
