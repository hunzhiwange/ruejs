import { describe, expect, it, vi } from 'vitest'
import { onRenderTriggered } from '../src/rue'
import {
  createOwner,
  disposeOwner,
  runWithOwner,
  signal,
  effect,
  _$compiledRenderEffect,
  _$compiledText,
  setReactiveScheduling,
} from '../src/runtime-core/compiled'

describe('compiled onRenderTriggered', () => {
  it('reports source identity and values for render work, isolates owners and unsubscribes', async () => {
    setReactiveScheduling('sync')
    const source = signal(1)
    const owner = createOwner()
    const other = createOwner()
    const callback = vi.fn()
    const unrelated = vi.fn()
    let stop!: () => void
    runWithOwner(owner, () => {
      stop = onRenderTriggered(callback)
      _$compiledRenderEffect(() => source.get())
    })
    runWithOwner(other, () => {
      onRenderTriggered(unrelated)
      effect(() => source.get())
    })
    source.set(2)
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        target: source,
        oldValue: 1,
        newValue: 2,
        key: 'value',
        type: 'set',
      }),
    )
    expect(unrelated).not.toHaveBeenCalled()
    await Promise.resolve()
    stop()
    source.set(3)
    expect(callback).toHaveBeenCalledTimes(1)
    disposeOwner(owner)
    disposeOwner(other)
    source.dispose()
  })

  it('supports nested render blocks, text updates and hook writes without collecting hook reads', () => {
    setReactiveScheduling('sync')
    const source = signal(0)
    const log = signal(0)
    const owner = createOwner()
    const callback = vi.fn(() => {
      log.set(log.get() + 1)
    })
    const node = { textContent: '' }
    runWithOwner(owner, () => {
      onRenderTriggered(callback)
      const block = createOwner()
      runWithOwner(block, () => _$compiledText(node, () => source.get()))
    })
    source.set(1)
    expect(node.textContent).toBe('1')
    expect(callback).toHaveBeenCalledTimes(1)
    log.set(4)
    expect(callback).toHaveBeenCalledTimes(1)
    disposeOwner(owner)
    source.set(2)
    expect(callback).toHaveBeenCalledTimes(1)
    source.dispose()
    log.dispose()
  })
})
