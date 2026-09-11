// copy from vuejs/core
// https://github.com/vuejs/core/blob/main/scripts/setup-vitest.ts
import type { MockInstance } from 'vitest'
import { afterEach, beforeEach, expect, vi } from 'vitest'

type GlobalStorageTarget = typeof globalThis & {
  window?: Window & typeof globalThis
  localStorage?: Storage
  sessionStorage?: Storage
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

interface CustomMatchers<R = unknown> {
  toHaveBeenWarned(): R
  toHaveBeenWarnedLast(): R
  toHaveBeenWarnedTimes(n: number): R
}

const createMemoryStorage = (): Storage => {
  const data = new Map<string, string>()

  return {
    get length() {
      return data.size
    },
    clear() {
      data.clear()
    },
    getItem(key) {
      return data.has(key) ? data.get(key)! : null
    },
    key(index) {
      return Array.from(data.keys())[index] ?? null
    },
    removeItem(key) {
      data.delete(String(key))
    },
    setItem(key, value) {
      data.set(String(key), String(value))
    },
  }
}

const resolveUsableStorage = (name: 'localStorage' | 'sessionStorage') => {
  const target = globalThis as GlobalStorageTarget
  const probeKey = `__rue_${name}_probe__`

  for (const candidate of [target[name], target.window?.[name]]) {
    if (!candidate) {
      continue
    }

    try {
      candidate.setItem(probeKey, '1')
      candidate.removeItem(probeKey)
      return candidate
    } catch {
      continue
    }
  }

  return null
}

const ensureStorage = (name: 'localStorage' | 'sessionStorage') => {
  const target = globalThis as GlobalStorageTarget
  const storage = resolveUsableStorage(name) ?? createMemoryStorage()

  Object.defineProperty(target, name, {
    configurable: true,
    writable: true,
    value: storage,
  })

  if (target.window) {
    Object.defineProperty(target.window, name, {
      configurable: true,
      writable: true,
      value: storage,
    })
  }

  return storage
}

const localStorageRef = ensureStorage('localStorage')
const sessionStorageRef = ensureStorage('sessionStorage')

vi.stubGlobal('MathMLElement', class MathMLElement {})

expect.extend({
  toHaveBeenWarned(received: string) {
    const passed = warn.mock.calls.some(args => args[0].includes(received))
    if (passed) {
      asserted.add(received)
      return {
        pass: true,
        message: () => `expected "${received}" not to have been warned.`,
      }
    } else {
      const msgs = warn.mock.calls.map(args => args[0]).join('\n - ')
      return {
        pass: false,
        message: () =>
          `expected "${received}" to have been warned` +
          (msgs.length ? `.\n\nActual messages:\n\n - ${msgs}` : ` but no warning was recorded.`),
      }
    }
  },

  toHaveBeenWarnedLast(received: string) {
    const passed = warn.mock.calls[warn.mock.calls.length - 1][0].includes(received)
    if (passed) {
      asserted.add(received)
      return {
        pass: true,
        message: () => `expected "${received}" not to have been warned last.`,
      }
    } else {
      const msgs = warn.mock.calls.map(args => args[0]).join('\n - ')
      return {
        pass: false,
        message: () =>
          `expected "${received}" to have been warned last.\n\nActual messages:\n\n - ${msgs}`,
      }
    }
  },

  toHaveBeenWarnedTimes(received: string, n: number) {
    let found = 0
    warn.mock.calls.forEach(args => {
      if (args[0].includes(received)) {
        found++
      }
    })

    if (found === n) {
      asserted.add(received)
      return {
        pass: true,
        message: () => `expected "${received}" to have been warned ${n} times.`,
      }
    } else {
      return {
        pass: false,
        message: () => `expected "${received}" to have been warned ${n} times but got ${found}.`,
      }
    }
  },
})

let warn: MockInstance
const asserted: Set<string> = new Set()

beforeEach(() => {
  asserted.clear()
  warn = vi.spyOn(console, 'warn')
  warn.mockImplementation(() => {})
})

afterEach(() => {
  const assertedArray = Array.from(asserted)
  const nonAssertedWarnings = warn.mock.calls
    .map(args => args[0])
    .filter(received => {
      return !assertedArray.some(assertedMsg => {
        return received.includes(assertedMsg)
      })
    })
  warn.mockRestore()
  if (nonAssertedWarnings.length) {
    throw new Error(`test case threw unexpected warnings:\n - ${nonAssertedWarnings.join('\n - ')}`)
  }

  localStorageRef.clear()
  sessionStorageRef.clear()
  document.body.innerHTML = ''
})
