import { afterEach, describe, expect, it, vi } from 'vitest'
import { KeepAlive, Template, Transition, TransitionGroup } from '../src/compiler-runtime/builtins'
import { createCompiledBlock, type CompiledSlotFactory } from '../src/compiler-runtime/mount'

const elementSlot =
  (tag: string, text: string, cleanup?: () => void): CompiledSlotFactory =>
  (target, _props, owner) => {
    const node = document.createElement(tag)
    node.textContent = text
    target.parent.insertBefore(node, target.before)
    return createCompiledBlock(target, owner, { first: node, last: node }, cleanup)
  }

afterEach(() => vi.useRealTimers())

describe('compiled control builtins', () => {
  it('mounts Template, Transition and TransitionGroup as owned blocks', () => {
    for (const factory of [Template, Transition, TransitionGroup]) {
      const host = document.createElement('div')
      const handle = factory({ children: elementSlot('b', 'owned') })
      handle.__rue_compiled_mount(host)
      expect(host.textContent).toBe('owned')
      handle.dispose()
      expect(host.textContent).toBe('')
    }
  })

  it('keeps cached blocks alive while switching keys', () => {
    const host = document.createElement('div')
    const a = elementSlot('input', '')
    const b = elementSlot('input', '')
    const handle = KeepAlive({ cacheKey: 'a', children: a })
    handle.__rue_compiled_mount(host)
    const first = host.querySelector('input')!
    first.value = 'edited'
    handle.__rue_compiled_update_props__({ cacheKey: 'b', children: b })
    expect(host.querySelector('input')).not.toBe(first)
    handle.__rue_compiled_update_props__({ cacheKey: 'a', children: a })
    expect(host.querySelector('input')).toBe(first)
    expect(first.value).toBe('edited')
  })

  it('applies KeepAlive include and LRU limits without portable metadata', () => {
    const host = document.createElement('div')
    const a = elementSlot('input', '')
    const b = elementSlot('input', '')
    const handle = KeepAlive({
      cacheKey: 'a',
      cacheName: 'Panel',
      include: 'Panel',
      max: 1,
      children: a,
    })
    handle.__rue_compiled_mount(host)
    const first = host.querySelector('input')!
    handle.__rue_compiled_update_props__({
      cacheKey: 'b',
      cacheName: 'Panel',
      include: 'Panel',
      max: 1,
      children: b,
    })
    handle.__rue_compiled_update_props__({
      cacheKey: 'a',
      cacheName: 'Panel',
      include: 'Panel',
      max: 1,
      children: a,
    })
    expect(host.querySelector('input')).not.toBe(first)

    const uncached = host.querySelector('input')!
    handle.__rue_compiled_update_props__({
      cacheKey: 'x',
      cacheName: 'Skip',
      include: 'Panel',
      children: a,
    })
    handle.__rue_compiled_update_props__({
      cacheKey: 'y',
      cacheName: 'Skip',
      include: 'Panel',
      children: b,
    })
    handle.__rue_compiled_update_props__({
      cacheKey: 'x',
      cacheName: 'Skip',
      include: 'Panel',
      children: a,
    })
    expect(host.querySelector('input')).not.toBe(uncached)
    handle.dispose()
  })

  it('runs range-based enter and leave phases and cancels them on cleanup', async () => {
    vi.useFakeTimers()
    const host = document.createElement('div')
    const afterLeave = vi.fn()
    const handle = Transition({
      name: 'fade',
      duration: 20,
      children: elementSlot('p', 'first'),
      onAfterLeave: afterLeave,
    })
    handle.__rue_compiled_mount(host)
    await Promise.resolve()
    expect(host.querySelector('p')?.classList.contains('fade-enter-active')).toBe(true)
    await vi.advanceTimersByTimeAsync(20)

    handle.__rue_compiled_update_props__({
      name: 'fade',
      duration: 20,
      children: elementSlot('p', 'second'),
      onAfterLeave: afterLeave,
    })
    expect(host.textContent).toContain('first')
    expect(host.textContent).toContain('second')
    await vi.advanceTimersByTimeAsync(20)
    expect(host.textContent).toBe('second')
    expect(afterLeave).toHaveBeenCalledTimes(1)
    handle.dispose()
    expect(host.textContent).toBe('')
  })

  it('animates keyed-slot DOM additions and preserves removals until leave completes', async () => {
    vi.useFakeTimers()
    const host = document.createElement('div')
    let list!: HTMLUListElement
    const children: CompiledSlotFactory = (target, _props, owner) => {
      list = document.createElement('ul')
      list.innerHTML = '<li data-key="a">a</li>'
      target.parent.insertBefore(list, target.before)
      return createCompiledBlock(target, owner, { first: list, last: list })
    }
    const handle = TransitionGroup({ name: 'rows', duration: 30, children })
    handle.__rue_compiled_mount(host)

    const added = document.createElement('li')
    added.dataset.key = 'b'
    added.textContent = 'b'
    list.appendChild(added)
    await Promise.resolve()
    expect(added.classList.contains('rows-enter-active')).toBe(true)
    await vi.advanceTimersByTimeAsync(30)

    const removed = list.querySelector('[data-key="a"]') as HTMLElement
    removed.remove()
    await Promise.resolve()
    expect(list.contains(removed)).toBe(true)
    expect(removed.classList.contains('rows-leave-active')).toBe(true)
    await vi.advanceTimersByTimeAsync(30)
    expect(list.contains(removed)).toBe(false)
    handle.dispose()
  })

  it('disconnects TransitionGroup phases and cleans its owned range exactly once', async () => {
    vi.useFakeTimers()
    const host = document.createElement('div')
    const cleanup = vi.fn()
    let list!: HTMLUListElement
    const children: CompiledSlotFactory = (target, _props, owner) => {
      list = document.createElement('ul')
      list.innerHTML = '<li data-key="a">a</li>'
      target.parent.insertBefore(list, target.before)
      return createCompiledBlock(target, owner, { first: list, last: list }, cleanup)
    }
    const handle = TransitionGroup({ name: 'rows', duration: 30, children })
    handle.__rue_compiled_mount(host)
    const removed = list.querySelector('[data-key="a"]') as HTMLElement

    removed.remove()
    await Promise.resolve()
    expect(list.contains(removed)).toBe(true)
    expect(host.querySelectorAll('[data-key="a"]')).toHaveLength(1)

    handle.dispose()
    handle.dispose()
    await vi.advanceTimersByTimeAsync(30)

    expect(host.childNodes).toHaveLength(0)
    expect(removed.isConnected).toBe(false)
    expect(cleanup).toHaveBeenCalledTimes(1)
  })
})
