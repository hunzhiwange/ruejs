import {
  getCurrentOwner,
  getOwnerParent,
  onOwnerCleanup,
  type CompiledOwner,
} from '../runtime-core/compiled'

export type ErrorCapturedHook = (error: any, owner?: CompiledOwner, info?: string) => boolean | void
const handlers = new Map<CompiledOwner, Set<ErrorCapturedHook>>()
const globalHandlers = new Set<ErrorCapturedHook>()
// Nested mount frames report a failure once; independent mounts remain independent.
const reported = new Set<unknown>()
const reportErrorToConsole = (error: unknown): void => {
  try {
    let message: string
    let stack = ''
    if (error instanceof Error) {
      message = error.message || error.name || 'Unknown error'
      stack = error.stack || ''
    } else if (typeof error === 'string') {
      message = error
    } else if (error && typeof error === 'object') {
      const candidate = error as { message?: unknown; stack?: unknown; name?: unknown }
      message =
        typeof candidate.message === 'string'
          ? candidate.message
          : typeof candidate.name === 'string'
            ? candidate.name
            : String(error)
      stack = typeof candidate.stack === 'string' ? candidate.stack : ''
    } else {
      message = String(error)
    }

    const consoleMessage = [
      '%cRue Error - The Compiler Framework For Native DOM%c',
      message,
      ...(stack ? [stack] : []),
    ].join(String.fromCharCode(10))
    ;(console as any).error?.(
      consoleMessage,
      'background:linear-gradient(to right, oklch(0.541 0.281 293.009) 0%, oklch(0.667 0.295 322.15) 50%, oklch(0.656 0.241 354.308) 100%);color:#fff;padding:5px 8px;font-size:15px;border-radius:5px;font-weight:900;letter-spacing:.02em;margin-bottom:0.5em',
      'color:red;padding:3px 5px',
    )
  } catch {}
}
let depth = 0
export const withComponentErrorScope = <T>(run: () => T): T => {
  depth++
  try {
    return run()
  } finally {
    if (--depth === 0) reported.clear()
  }
}
export const onErrorCaptured = (callback: ErrorCapturedHook): void => {
  const owner = getCurrentOwner()
  if (owner === undefined) throw new Error('owner')
  let callbacks = handlers.get(owner)
  if (!callbacks) {
    callbacks = new Set()
    handlers.set(owner, callbacks)
    onOwnerCleanup(() => handlers.delete(owner))
  }
  callbacks.add(callback)
}
export const onError = (callback: ErrorCapturedHook): (() => void) => {
  globalHandlers.add(callback)
  return () => {
    globalHandlers.delete(callback)
  }
}
export const dispatchComponentError = (
  error: unknown,
  owner: CompiledOwner,
  info: string,
): boolean => {
  if (reported.has(error)) return false
  for (let parent = getOwnerParent(owner); parent !== undefined; parent = getOwnerParent(parent)) {
    for (const handler of handlers.get(parent) ?? []) {
      if (handler(error, owner, info) === false) return true
    }
  }
  reported.add(error)
  for (const handler of globalHandlers) handler(error, owner, info)
  reportErrorToConsole(error)
  return false
}
