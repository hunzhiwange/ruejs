import { afterEach, describe, expect, it, vi } from 'vitest'

import { onError } from '../src'
import { dispatchComponentError } from '../src/compiler-runtime/component-errors'

const report = (error: unknown) => dispatchComponentError(error, 0, 'test')

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('built-in error console', () => {
  it('reports Rue errors without installation', () => {
    const output = vi.spyOn(console, 'error').mockImplementation(() => {})

    report(new Error('render exploded'))

    expect(output).toHaveBeenCalledTimes(1)
    expect(output.mock.calls[0][0]).toContain('Rue Error - The Compiler Framework For Native DOM')
    expect(output.mock.calls[0][0]).toContain('render exploded')
  })

  it('notifies global subscribers before reporting the error once', () => {
    const output = vi.spyOn(console, 'error').mockImplementation(() => {})
    const received: unknown[] = []
    const error = new Error('subscribed failure')
    const stop = onError(value => {
      received.push(value)
    })

    try {
      report(error)
      report(error)
    } finally {
      stop()
    }

    expect(received).toEqual([error])
    expect(output).toHaveBeenCalledTimes(1)
  })

  it('does not bridge native browser errors into the Rue error chain', () => {
    const output = vi.spyOn(console, 'error').mockImplementation(() => {})
    const received: unknown[] = []
    const stop = onError(error => {
      received.push(error)
    })
    const rejection = new Event('unhandledrejection')
    Object.defineProperty(rejection, 'reason', { value: new Error('native rejection') })

    try {
      window.dispatchEvent(new Event('error'))
      window.dispatchEvent(rejection)
    } finally {
      stop()
    }

    expect(received).toEqual([])
    expect(output).not.toHaveBeenCalled()
  })

  it('does not create an error overlay', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    report(new Error('console only'))

    expect(document.body.childElementCount).toBe(0)
  })
})
