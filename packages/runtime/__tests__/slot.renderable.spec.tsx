import { afterEach, describe, expect, it } from 'vitest'

import {
  createCompiledBlock,
  _$mountCompiledSlotAt,
  mountCompiledSlot,
  replaceCompiledBlock,
  type CompiledSlotFactory,
} from '../src/compiler-runtime/mount'
import { signal as _$compiledSignal } from '../src/runtime-core/compiled'
import { createOwner, setReactiveScheduling } from '../src/runtime-core/compiled'

setReactiveScheduling('sync')

afterEach(() => {
  document.body.innerHTML = ''
})

describe('compiled slot and dynamic component ABI', () => {
  const textFactory =
    (prefix: string): CompiledSlotFactory<{ label?: string }> =>
    (target, props, owner) => {
      const fragment = document.createDocumentFragment()
      const first = document.createComment(`${prefix}:first`)
      const text = document.createTextNode(`${prefix}${props.label ?? ''}`)
      const last = document.createComment(`${prefix}:last`)
      fragment.append(first, text, last)
      target.parent.insertBefore(fragment, target.before)
      return createCompiledBlock(target, owner, { first, last })
    }

  it('mounts scoped slot fragments and replaces the complete block range', () => {
    const container = document.createElement('div')
    const anchor = document.createComment('slot-anchor')
    container.append(anchor)
    const target = { parent: container, before: anchor }

    const initial = mountCompiledSlot(
      target,
      textFactory('default:'),
      { label: 'one' },
      createOwner(),
    )
    expect(container.textContent).toBe('default:one')

    const next = replaceCompiledBlock(
      initial,
      target,
      textFactory('named:'),
      { label: 'two' },
      createOwner(),
    )
    expect(container.textContent).toBe('named:two')
    expect(next.first.parentNode).toBe(container)
    expect(next.last.nextSibling).toBe(anchor)
  })

  it('reactively replaces a production slot getter at one stable anchor', () => {
    const container = document.createElement('div')
    const anchor = document.createComment('compiled-slot-anchor')
    container.append(anchor)
    const current = _$compiledSignal<CompiledSlotFactory<{ label: string }>>(textFactory('first:'))

    _$mountCompiledSlotAt(
      { parent: container, before: anchor },
      () => current.get(),
      () => ({ label: 'value' }),
    )
    expect(container.textContent).toBe('first:value')

    current.set(textFactory('second:'))
    expect(container.textContent).toBe('second:value')
    expect(anchor.previousSibling?.nodeType).toBe(Node.COMMENT_NODE)
  })

  it('does not remount a slot when child setup reads its own reactive state', () => {
    const container = document.createElement('div')
    const anchor = document.createComment('compiled-slot-anchor')
    container.append(anchor)
    const childState = _$compiledSignal(0)
    let mounts = 0
    const factory: CompiledSlotFactory = (target, _props, owner) => {
      mounts += 1
      childState.get()
      return textFactory('child:')(target, {}, owner)
    }

    _$mountCompiledSlotAt(
      { parent: container, before: anchor },
      () => factory,
      () => ({}),
    )
    expect(mounts).toBe(1)

    childState.set(1)
    expect(mounts).toBe(1)
  })
})
