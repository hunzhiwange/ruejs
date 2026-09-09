// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import swc from '@swc/core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createOwner, disposeOwner, onCleanup, onOwnerCleanup, runWithOwner } from '../src/internal'
import { _$compiledPropsGet, _$compiledPropsSnapshot } from '../src/compiled-props'
import { _$compiledRoot } from '../src/compiled-root'
import {
  _$compiledAppendChild,
  _$compiledCreateComment,
  _$compiledCreateElement,
  _$compiledCreateTextNode,
} from '../src/internal'
import { template as _$template } from '../src/compiler-runtime/dom.browser'
import { _$compiledDelegateEvent } from '../src/compiler-runtime/compact-events'

type Row = {
  id: number
  onClick: (row: Row, event: Event) => void
  onFocus?: (event: Event) => void
}

type ObjectRef<T> = { current: T | null }

const pluginPath = resolve(process.cwd(), 'packages/swc-plugin-rue/swc-plugin-rue.wasm')

const source = `
let currentItem;
export const setItem = next => {
  currentItem = next;
};
export const View = (functionRef, objectRef) => (
  <section>
    <button ref={functionRef} onClick={event => currentItem.onClick(currentItem, event)} onFocusCapture={currentItem.onFocus}>
      Save
    </button>
    <button className="delegated" onClick={() => currentItem.onClick(currentItem, new Event('delegated'))}>
      Delegated
    </button>
    <input ref={objectRef} />
  </section>
);
`

const compile = (): string => {
  expect(readFileSync(pluginPath).byteLength).toBeGreaterThan(0)
  return swc.transformSync(source, {
    filename: 'compiled-events-and-refs.tsx',
    jsc: {
      parser: { syntax: 'typescript', tsx: true },
      target: 'es2020',
      transform: {
        react: {
          runtime: 'automatic',
          importSource: '@rue-js',
          development: false,
          throwIfNamespace: false,
        },
      },
      experimental: { plugins: [[pluginPath, {}]] },
    },
    module: { type: 'es6' },
  }).code
}

const stripModuleSyntax = (output: string): string =>
  output
    .replace(/import\s*\{[^}]*\}\s*from\s*["'][^"']+["'];?/g, '')
    .replace(/export\s+const\s+/g, 'const ')

const evaluate = (output: string) => {
  const executable = `${stripModuleSyntax(output)}\nreturn { View, setItem };`
  const factory = new Function(
    '_$compiledRoot',
    '_$compiledCreateElement',
    '_$compiledCreateTextNode',
    '_$compiledCreateComment',
    '_$compiledAppendChild',
    '_$compiledDelegateEvent',
    '_$template',
    'onOwnerCleanup',
    '_$compiledPropsGet',
    '_$compiledPropsSnapshot',
    executable,
  ) as (
    compiledRoot: typeof _$compiledRoot,
    compiledCreateElement: typeof _$compiledCreateElement,
    compiledCreateTextNode: typeof _$compiledCreateTextNode,
    compiledCreateComment: typeof _$compiledCreateComment,
    compiledAppendChild: typeof _$compiledAppendChild,
    compiledDelegateEvent: typeof _$compiledDelegateEvent,
    template: typeof _$template,
    cleanup: typeof onOwnerCleanup,
    get: typeof _$compiledPropsGet,
    snapshot: typeof _$compiledPropsSnapshot,
  ) => {
    View(
      functionRef: (node: HTMLButtonElement | null) => void,
      objectRef: ObjectRef<HTMLInputElement>,
    ): ReturnType<typeof _$compiledRoot>
    setItem(item: Row): void
  }
  return factory(
    _$compiledRoot,
    _$compiledCreateElement,
    _$compiledCreateTextNode,
    _$compiledCreateComment,
    _$compiledAppendChild,
    _$compiledDelegateEvent,
    _$template,
    onOwnerCleanup,
    _$compiledPropsGet,
    _$compiledPropsSnapshot,
  )
}

const bindOwnedRow = (
  initialItem: Row,
  functionRef: (node: HTMLButtonElement | null) => void,
  objectRef: ObjectRef<HTMLButtonElement>,
) => {
  const owner = createOwner()
  const node = document.createElement('button')
  const add = vi.spyOn(node, 'addEventListener')
  const remove = vi.spyOn(node, 'removeEventListener')
  const options = { capture: true }
  let item = initialItem
  let disposed = false

  runWithOwner(owner, () => {
    const listener = (event: Event) => item.onClick(item, event)
    node.addEventListener('click', listener, options)
    onCleanup(() => node.removeEventListener('click', listener, options))

    functionRef(node)
    onCleanup(() => functionRef(null))

    objectRef.current = node
    onCleanup(() => {
      objectRef.current = null
    })
  })

  return {
    add,
    remove,
    node,
    patch(next: Row) {
      item = next
    },
    dispose() {
      if (disposed) return
      disposed = true
      disposeOwner(owner)
    },
  }
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('compiled native events and refs', () => {
  it('keeps delegated handlers live when an unmapped staging fragment is committed', () => {
    const staging = document.createDocumentFragment()
    const button = document.createElement('button')
    const host = document.createElement('main')
    const calls: string[] = []
    staging.appendChild(button)

    const dispose = _$compiledDelegateEvent(
      staging,
      button,
      'click',
      () => () => calls.push('click'),
    )
    host.appendChild(staging)
    button.click()
    expect(calls).toEqual(['click'])

    dispose()
    button.click()
    expect(calls).toEqual(['click'])
  })

  it('dispatches a target only from the delegated root that registered it', () => {
    const outerRoot = document.createElement('div')
    const innerRoot = document.createElement('section')
    const button = document.createElement('button')
    const calls: string[] = []
    innerRoot.appendChild(button)
    outerRoot.appendChild(innerRoot)
    document.body.appendChild(outerRoot)

    _$compiledDelegateEvent(innerRoot, button, 'click', () => () => calls.push('button'))
    _$compiledDelegateEvent(outerRoot, outerRoot, 'click', () => () => calls.push('outer'))
    button.click()

    expect(calls).toEqual(['button', 'outer'])
  })

  it('executes real compiler output with latest handlers and root-owned ref cleanup', () => {
    const output = compile()
    expect(output).toContain('from "@rue-js/rue/internal/compiler"')
    expect(output).toContain('_$compiledDelegateEvent')
    expect(output).toContain('.addEventListener(')
    expect(output).toContain('.removeEventListener(')
    expect(output).toContain('onOwnerCleanup')
    expect(output).not.toContain('_$addEventListener')
    expect(output).not.toContain('_$compiledBindUseRef')
    expect(output).not.toContain('from "@rue-js/rue/internal"')

    const add = vi.spyOn(EventTarget.prototype, 'addEventListener')
    const remove = vi.spyOn(EventTarget.prototype, 'removeEventListener')
    const calls: string[] = []
    const currentTargets: EventTarget[] = []
    const functionRefCalls: Array<HTMLButtonElement | null> = []
    const objectRef: ObjectRef<HTMLInputElement> = { current: null }
    const first: Row = {
      id: 1,
      onClick: (row, event) => {
        calls.push(`first:${row.id}`)
        if (event.currentTarget) currentTargets.push(event.currentTarget)
      },
      onFocus: () => calls.push('focus:first'),
    }
    const second: Row = {
      id: 1,
      onClick: (row, event) => {
        calls.push(`second:${row.id}`)
        if (event.currentTarget) currentTargets.push(event.currentTarget)
      },
      onFocus: () => calls.push('focus:second'),
    }
    const { View, setItem } = evaluate(output)
    setItem(first)
    const handle = View(node => functionRefCalls.push(node), objectRef)
    const host = document.createElement('main')
    document.body.appendChild(host)
    const mounted = handle.__rue_compiled_mount(host)
    if (!(mounted instanceof HTMLElement)) throw new Error('Expected a compiled HTMLElement root')
    host.appendChild(mounted)
    const button = mounted.querySelector('button')
    const input = mounted.querySelector('input')
    const delegated = mounted.querySelector<HTMLButtonElement>('button.delegated')
    if (!button || !delegated || !input) throw new Error('Expected compiled event/ref targets')

    const matchingCalls = (spy: typeof add, type: string) =>
      spy.mock.calls.filter(
        (call, index) => spy.mock.contexts[index] === button && call[0] === type,
      )

    expect(matchingCalls(add, 'click')).toHaveLength(1)
    expect(matchingCalls(add, 'focus')).toEqual([
      ['focus', expect.any(Function), { capture: true }],
    ])
    expect(functionRefCalls).toEqual([button])
    expect(objectRef.current).toBe(input)

    button.dispatchEvent(new Event('click'))
    delegated.dispatchEvent(new Event('click', { bubbles: true }))
    setItem(second)
    button.dispatchEvent(new Event('click'))
    button.dispatchEvent(new Event('focus'))

    expect(calls).toEqual(['first:1', 'first:1', 'second:1', 'focus:second'])
    expect(currentTargets).toEqual([button, button])
    expect(matchingCalls(add, 'click')).toHaveLength(1)
    expect(matchingCalls(add, 'focus')).toHaveLength(1)

    handle.dispose()
    handle.dispose()
    button.dispatchEvent(new Event('click'))

    expect(calls).toEqual(['first:1', 'first:1', 'second:1', 'focus:second'])
    expect(matchingCalls(remove, 'click')).toHaveLength(1)
    expect(matchingCalls(remove, 'focus')).toEqual([
      ['focus', expect.any(Function), { capture: true }],
    ])
    expect(functionRefCalls).toEqual([button, null])
    expect(objectRef.current).toBeNull()
    expect(host.childNodes).toHaveLength(0)
  })

  it('binds the same cleanup sequence to a disposable row owner', () => {
    const calls: string[] = []
    const functionRefCalls: Array<HTMLButtonElement | null> = []
    const objectRef: ObjectRef<HTMLButtonElement> = { current: null }
    const first: Row = { id: 1, onClick: row => calls.push(`first:${row.id}`) }
    const second: Row = { id: 1, onClick: row => calls.push(`second:${row.id}`) }
    const row = bindOwnedRow(first, node => functionRefCalls.push(node), objectRef)
    document.body.appendChild(row.node)

    row.node.dispatchEvent(new Event('click'))
    row.patch(second)
    row.node.dispatchEvent(new Event('click'))

    expect(calls).toEqual(['first:1', 'second:1'])
    expect(row.add).toHaveBeenCalledTimes(1)

    row.dispose()
    row.dispose()
    row.node.dispatchEvent(new Event('click'))

    expect(calls).toEqual(['first:1', 'second:1'])
    expect(row.remove).toHaveBeenCalledTimes(1)
    expect(functionRefCalls).toEqual([row.node, null])
    expect(objectRef.current).toBeNull()
  })

  it('shares one listener per root and event type while preserving propagation and weak slots', () => {
    const add = vi.spyOn(EventTarget.prototype, 'addEventListener')
    const remove = vi.spyOn(EventTarget.prototype, 'removeEventListener')
    const firstRoot = document.createElement('div')
    const secondRoot = document.createElement('div')
    const outer = document.createElement('div')
    const inner = document.createElement('button')
    const other = document.createElement('button')
    outer.appendChild(inner)
    firstRoot.appendChild(outer)
    secondRoot.appendChild(other)
    document.body.append(firstRoot, secondRoot)

    const calls: string[] = []
    let current = 'first'
    let activeEvent: Event
    _$compiledDelegateEvent(firstRoot, outer, 'click', () => () => calls.push('outer'))
    _$compiledDelegateEvent(firstRoot, inner, 'click', () => () => {
      calls.push(current)
      activeEvent.stopPropagation()
    })
    _$compiledDelegateEvent(secondRoot, other, 'click', () => () => calls.push('other'))

    expect(add.mock.calls.filter(call => call[0] === 'click')).toHaveLength(2)
    activeEvent = new Event('click', { bubbles: true, composed: true })
    inner.dispatchEvent(activeEvent)
    expect(calls).toEqual(['first'])

    current = 'second'
    activeEvent = new Event('click', { bubbles: true, composed: true })
    inner.dispatchEvent(activeEvent)
    other.dispatchEvent(new Event('click', { bubbles: true, composed: true }))
    expect(calls).toEqual(['first', 'second', 'other'])

    inner.remove()
    inner.dispatchEvent(new Event('click', { bubbles: true, composed: true }))
    expect(calls).toEqual(['first', 'second', 'other'])
    expect(remove.mock.calls.filter(call => call[0] === 'click')).toHaveLength(0)
  })

  it.each([1_000, 10_000])('keeps %i delegated rows at one native listener', count => {
    const add = vi.spyOn(EventTarget.prototype, 'addEventListener')
    const remove = vi.spyOn(EventTarget.prototype, 'removeEventListener')
    const root = document.createElement('div')
    const fragment = document.createDocumentFragment()

    for (let index = 0; index < count; index++) {
      const node = document.createElement('button')
      _$compiledDelegateEvent(root, node, 'click', () => () => index)
      fragment.appendChild(node)
    }
    root.appendChild(fragment)

    expect(add.mock.calls.filter(call => call[0] === 'click')).toHaveLength(1)
    expect(remove.mock.calls.filter(call => call[0] === 'click')).toHaveLength(0)
    root.replaceChildren()
    expect(remove.mock.calls.filter(call => call[0] === 'click')).toHaveLength(0)
  })
})
