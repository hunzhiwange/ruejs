// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { Slot, type SlotRenderProps } from '../src/components/Slot'
import { _$compiledStaticRoot } from '../src/compiler-runtime/compact-root'
import {
  _$mountCompiledSlotFactory,
  type BlockFactory,
} from '../src/compiler-runtime/block-factory'
import { createTextNode } from '../src/compiler-runtime/dom.browser'

const roots: Array<{ dispose(): void }> = []

afterEach(() => {
  roots.splice(0).forEach(root => root.dispose())
  document.body.innerHTML = ''
})

const textFactory =
  (read: (props: SlotRenderProps) => string): BlockFactory<SlotRenderProps> =>
  (target, slotProps, owner) => {
    const create = () =>
      _$compiledStaticRoot(() => {
        const text = createTextNode(read(slotProps))
        return [text, text]
      })
    return target == null ? (create() as never) : _$mountCompiledSlotFactory(target, owner, create)
  }

it('mounts compiler-created default slot factories', () => {
  const root = Slot({ source: { children: textFactory(() => 'provided') } }) as any
  roots.push(root)
  root.__rue_compiled_mount(document.body)
  expect(document.body.textContent).toBe('provided')
})

it('passes scoped props to compiler-created named slot factories', () => {
  const root = Slot({
    source: { __rue_slots: { row: textFactory(props => String(props.label)) } },
    name: 'row',
    props: { label: 'compiled row' },
  }) as any
  roots.push(root)
  root.__rue_compiled_mount(document.body)
  expect(document.body.textContent).toBe('compiled row')
})
