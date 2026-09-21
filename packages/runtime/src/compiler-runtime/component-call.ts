import { _$compiledComponent, type CompiledComponentFactory } from './component'
import { _$compiledRoot, type BlockRecord } from './block'
import { getCurrentOwner, onOwnerCleanup } from '../runtime-core/compiled'
import { createElement } from './dom.browser'
import { _$compiledSpreadAttributes } from '../compiled-dom-bindings'
import { mountSlot } from './builtins/shared'
import type { BlockFactory } from './block-factory'

/** This entry accepts only a compiler-known function and its props getter. */
export const _$createComponent = <Props extends object>(
  factory: CompiledComponentFactory<Props>,
  props: Props | (() => Props),
): BlockRecord =>
  _$compiledComponent(factory, typeof props === 'function' ? (props as () => Props) : () => props)

/** Create a compiler-owned native element whose tag is selected at runtime. */
export const _$createDynamicElement = (
  tag: string,
  readProps: () => Record<string, unknown>,
): BlockRecord =>
  _$compiledRoot(parent => {
    const element = createElement(tag, parent)
    _$compiledSpreadAttributes(element, readProps, ['children', 'is', 'registry'])
    const props = readProps()
    const owner = getCurrentOwner()
    const child =
      owner && props.children
        ? mountSlot(props.children as BlockFactory, { parent: element, before: null }, owner)
        : undefined
    if (child) onOwnerCleanup(() => child.dispose())
    return [element, element]
  })

/** Compiler-proven nested root, without value conversion or runtime resolution. */
export const _$compiledRootFactory = (factory: () => BlockRecord): BlockRecord =>
  _$compiledRoot(parent => {
    const block = factory()
    onOwnerCleanup(() => block.dispose())
    block.__rue_compiled_mount(parent)
    return [block.first, block.last]
  })
