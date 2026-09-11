import { _$compiledComponent, type CompiledComponentFactory } from './component'
import { _$compiledRoot, type BlockRecord } from './block'
import { onOwnerCleanup } from '../runtime-core/compiled'

/** This entry accepts only a compiler-known function and its props getter. */
export const _$createComponent = <Props extends object>(
  factory: CompiledComponentFactory<Props>,
  props: Props | (() => Props),
): BlockRecord =>
  _$compiledComponent(factory, typeof props === 'function' ? (props as () => Props) : () => props)

/** Compiler-proven nested root, without value conversion or runtime resolution. */
export const _$compiledRootFactory = (factory: () => BlockRecord): BlockRecord =>
  _$compiledRoot(parent => {
    const block = factory()
    onOwnerCleanup(() => block.dispose())
    block.__rue_compiled_mount(parent)
    return [block.first, block.last]
  })
