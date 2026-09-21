import type { HistoryLike } from '@rue-js/router'
import { expect } from 'vitest'
import type { BlockRecord } from '../src/compiler-runtime/block'

const mountedBlocks = new WeakMap<HTMLElement, BlockRecord>()

export const render = (block: BlockRecord | null, container: HTMLElement) => {
  mountedBlocks.get(container)?.dispose()
  mountedBlocks.delete(container)
  container.replaceChildren()

  if (block) {
    block.__rue_compiled_mount(container)
    mountedBlocks.set(container, block)
  }
}

export const flush = async (turns = 3) => {
  for (let turn = 0; turn < turns; turn += 1) {
    await Promise.resolve()
  }
}

export const waitForMacrotask = async () => {
  await new Promise(resolve => setTimeout(resolve, 0))
}

export const waitForContent = async (assertion: () => void, attempts = 40) => {
  let lastError: unknown

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      assertion()
      return
    } catch (error) {
      lastError = error
    }

    await flush()
    await waitForMacrotask()
  }

  throw lastError
}

export const createStaticHistory = (path: string): HistoryLike => ({
  location: () => path,
  push: () => {},
  replace: () => {},
  listen: () => {},
  back: () => {},
})

export const createMemoryHistory = (
  initialPath: string,
): HistoryLike & { setPath: (path: string) => void } => {
  let currentPath = initialPath
  const listeners = new Set<() => void>()

  const notify = () => {
    listeners.forEach(listener => listener())
  }

  return {
    location: () => currentPath,
    push: path => {
      currentPath = path
      notify()
    },
    replace: path => {
      currentPath = path
      notify()
    },
    listen: cb => {
      listeners.add(cb)
    },
    back: () => {},
    setPath: path => {
      currentPath = path
      notify()
    },
  }
}

export const mountContainer = () => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  return container
}

export const click = async (element: Element | null) => {
  expect(element).not.toBeNull()
  element!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  await flush()
}
