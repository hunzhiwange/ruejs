// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { _$compiledRoot } from '../src/compiler-runtime/compact-root'
import {
  createOwner,
  disposeOwner,
  effect,
  onOwnerCleanup,
  runWithOwner,
  setReactiveScheduling,
  signal,
} from '../src/runtime-core/compiled'

afterEach(() => {
  document.body.innerHTML = ''
  setReactiveScheduling('frame')
})

describe('closed compiled blocks', () => {
  it('moves and disposes only the declared range without reading childNodes', () => {
    const host = document.createElement('main')
    const other = document.createElement('aside')
    const sibling = document.createElement('i')
    host.append(sibling)
    Object.defineProperty(host, 'childNodes', {
      get() {
        throw new Error('parent scan')
      },
    })
    const first = document.createTextNode('first')
    const last = document.createTextNode('last')
    const root = _$compiledRoot(() => {
      const fragment = document.createDocumentFragment()
      fragment.append(first, last)
      return [first, last]
    })
    root.__rue_compiled_mount(host)
    expect(host.textContent).toBe('firstlast')
    other.append(first, last)
    root.dispose()
    root.dispose()
    expect(other.textContent).toBe('')
    expect(host.firstChild).toBe(sibling)
  })

  it('retains owner subscriptions until disposal and cleans setup once', () => {
    setReactiveScheduling('sync')
    const owner = createOwner()
    const value = signal('one')
    let cleanups = 0
    let runs = 0
    const root = runWithOwner(owner, () =>
      _$compiledRoot(() => {
        const text = document.createTextNode('')
        effect(() => {
          runs++
          text.data = value.get()
        })
        onOwnerCleanup(() => cleanups++)
        return [text, text]
      }),
    )!
    const host = document.createElement('main')
    root.__rue_compiled_mount(host)
    value.set('two')
    expect(host.textContent).toBe('two')
    root.dispose()
    disposeOwner(owner)
    value.set('three')
    expect(cleanups).toBe(1)
    expect(runs).toBe(2)
    expect(host.textContent).toBe('')
  })

  it('removes the owned DOM when its parent owner is disposed', () => {
    const owner = createOwner()
    const host = document.createElement('main')
    const root = runWithOwner(owner, () =>
      _$compiledRoot(() => {
        const node = document.createElement('b')
        return [node, node]
      }),
    )!
    runWithOwner(owner, () => root.__rue_compiled_mount(host))
    expect(host.firstChild).toBe(root.first)
    disposeOwner(owner)
    expect(host.firstChild).toBeNull()
    expect(() => root.__rue_compiled_mount(host)).toThrow(/disposed/)
  })

  it('moves a root branch with its active DOM and follows the live boundary on replacement', async () => {
    const { _$compiledBranch, moveBlockRange } = await import('../src/compiler-runtime/block')
    setReactiveScheduling('sync')
    const state = signal(true)
    const root = _$compiledBranch(() => ({
      __rue_compiled_branch_key: state.get(),
      create: () =>
        _$compiledRoot(() => {
          const node = document.createTextNode(state.get() ? 'yes' : 'no')
          return [node, node]
        }),
    }))
    const source = document.createElement('main')
    const target = document.createElement('aside')
    const sibling = document.createElement('span')
    target.append(sibling)
    root.__rue_compiled_mount(source)
    moveBlockRange(root.first, root.last, target, sibling)
    expect(source.textContent).toBe('')
    expect(target.textContent).toBe('yes')
    state.set(false)
    expect(target.textContent).toBe('no')
    root.dispose()
    expect(Array.from(target.childNodes)).toEqual([sibling])
  })

  it('mounts empty blocks and rejects second mounts', () => {
    const root = _$compiledRoot(() => [null, null])
    const host = document.createElement('main')
    expect(root.__rue_compiled_mount(host)).toBeNull()
    expect(() => root.__rue_compiled_mount(host)).toThrow(/mounted/)
    root.dispose()
    expect(() => root.__rue_compiled_mount(host)).toThrow(/disposed/)
  })

  it('rolls back setup owner effects when setup throws', () => {
    let cleanups = 0
    const host = document.createElement('main')
    const sibling = document.createElement('i')
    host.append(sibling)
    const root = _$compiledRoot(() => {
      onOwnerCleanup(() => cleanups++)
      throw new Error('setup failed')
    })
    expect(() => root.__rue_compiled_mount(host)).toThrow('setup failed')
    root.dispose()
    expect(cleanups).toBe(1)
    expect(host.firstChild).toBe(sibling)
  })

  it('disposes mounted child blocks when parent setup fails without scanning siblings', () => {
    const host = document.createElement('main')
    const sibling = document.createElement('i')
    host.append(sibling)
    Object.defineProperty(host, 'childNodes', {
      get() {
        throw new Error('parent scan')
      },
    })
    let cleanups = 0
    const root = _$compiledRoot(parent => {
      const child = _$compiledRoot(() => {
        onOwnerCleanup(() => cleanups++)
        const node = document.createTextNode('child')
        return [node, node]
      })
      child.__rue_compiled_mount(parent)
      throw new Error('parent setup failed')
    })
    expect(() => root.__rue_compiled_mount(host)).toThrow('parent setup failed')
    root.dispose()
    expect(cleanups).toBe(1)
    expect(host.firstChild).toBe(sibling)
    expect(sibling.nextSibling).toBeNull()
  })

  it('removes the unfinished appended range on setup failure without scanning existing siblings', () => {
    const host = document.createElement('main')
    const firstSibling = document.createElement('i')
    const lastSibling = document.createElement('b')
    host.append(firstSibling, lastSibling)
    Object.defineProperty(host, 'childNodes', {
      get() {
        throw new Error('parent scan')
      },
    })
    const root = _$compiledRoot(parent => {
      parent?.appendChild(document.createElement('span'))
      parent?.appendChild(document.createTextNode('unfinished'))
      throw new Error('setup failed')
    })
    expect(() => root.__rue_compiled_mount(host)).toThrow('setup failed')
    root.dispose()
    expect(host.firstChild).toBe(firstSibling)
    expect(firstSibling.nextSibling).toBe(lastSibling)
    expect(lastSibling.nextSibling).toBeNull()
  })

  it('contains no generic root adapter or parent snapshot', () => {
    for (const file of [
      'compiled-root.ts',
      'compiled-component.ts',
      'compiler-runtime/compact-root.ts',
      'compiler-runtime/block.ts',
    ]) {
      const source = readFileSync(`${process.cwd()}/packages/runtime/src/${file}`, 'utf8')
      expect(source).not.toMatch(
        /__rue_compiled_mountable|__rue_compiled_clone|childNodes|isExplicitSetupResult|resultNodes/,
      )
    }
  })
})
