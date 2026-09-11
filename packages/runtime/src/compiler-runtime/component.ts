import {
  batch,
  createOwner,
  disposeOwner,
  effect,
  onOwnerCleanup,
  runWithOwner,
  runOwnerLifecycle,
  setOwnerEffectBoundary,
  signal,
  untrack,
  type CompiledOwner,
} from '../runtime-core/compiled'
import { _$compiledRoot, type BlockRecord } from './block'
import { createComment, appendChild, createDocumentFragment } from './dom.browser'
import { createCompiledProps } from './props'
import type { BlockFactory } from './block-factory'
import { dispatchComponentError, withComponentErrorScope } from './component-errors'

export { _$compiledBranch, _$compiledBranchAt } from './block'
export type { CompiledBranchFactory, CompiledBranchCase } from './block'
export { _$withCompiledPropsUpdater } from './compact-component-abi'
export const RUE_COMPILED_UPDATE_PROPS_KEY = '__rue_compiled_update_props__' as const
export const RUE_COMPILED_COMPONENT_FACTORY_KEY = '__rue_compiled_component_factory__' as const
export const RUE_COMPILED_COMPONENT_READ_PROPS_KEY =
  '__rue_compiled_component_read_props__' as const
export const RUE_COMPILED_COMPONENT_TRACK_PROPS_KEY =
  '__rue_compiled_component_track_props__' as const
export const _$compiledSignal = signal
export const _$compiledBatch = batch
export type CompiledPropsUpdater<Props> = (nextProps: Props) => void
export type CompiledComponentHandle<Props> = BlockRecord & {
  [RUE_COMPILED_UPDATE_PROPS_KEY]: CompiledPropsUpdater<Props>
}
export type CompiledSlots = Readonly<Record<string, BlockFactory<any> | null | undefined>>
/** The only component ABI. The compiler supplies a function returning a closed Block. */
export type CompiledComponentFactory<Props = Record<string, unknown>> = (
  props: Props,
  slots: CompiledSlots,
  owner: CompiledOwner,
) => BlockRecord

/** Setup runs once; explicit props operations subscribe at the key level. */
export const _$mountCompiledComponent = <Props extends object>(
  parent: ParentNode,
  factory: CompiledComponentFactory<Props>,
  readProps: () => Props,
  registerCleanup?: (cleanup: () => void) => void,
): Node | null =>
  withComponentErrorScope(() => {
    const owner = createOwner()
    let block: BlockRecord | undefined
    let disposed = false
    const cleanup = () => {
      if (disposed) return
      disposed = true
      try {
        block?.dispose()
      } finally {
        disposeOwner(owner)
      }
    }
    onOwnerCleanup(cleanup)
    registerCleanup?.(cleanup)
    try {
      return (
        runWithOwner(owner, () => {
          setOwnerEffectBoundary(owner, run =>
            withComponentErrorScope(() => {
              try {
                run()
              } catch (error) {
                if (!dispatchComponentError(error, owner, 'component effect')) throw error
              }
            }),
          )
          const props = createCompiledProps(untrack(readProps))
          onOwnerCleanup(props.dispose)
          const readSlots = (): CompiledSlots => {
            const named = props.get('__rue_slots') as CompiledSlots | undefined
            return {
              ...named,
              default: (props.get('children') as BlockFactory<any> | undefined) ?? named?.default,
            }
          }
          const slots = createCompiledProps(untrack(readSlots))
          onOwnerCleanup(slots.dispose)
          try {
            block = factory(props.props as Props, slots.props, owner)
            runOwnerLifecycle(owner, 'beforeMount')
            block.__rue_compiled_mount(parent)
            runOwnerLifecycle(owner, 'mounted')
            let initial = true
            effect(() => {
              const next = readProps()
              if (initial) {
                initial = false
                return
              }
              runOwnerLifecycle(owner, 'beforeUpdate')
              try {
                batch(() => {
                  props.update(next)
                  slots.update(untrack(readSlots))
                })
              } finally {
                runOwnerLifecycle(owner, 'updated')
              }
            })
          } catch (error) {
            if (!dispatchComponentError(error, owner, 'component mount')) throw error
            cleanup()
            return null
          }
          return block.first
        }) ?? null
      )
    } catch (error) {
      const captured = dispatchComponentError(error, owner, 'component setup')
      cleanup()
      if (captured) return null
      throw error
    }
  })

/** A component call is a closed block; it never interprets the function's return value. */
export const _$compiledComponent = <Props extends object>(
  factory: CompiledComponentFactory<Props>,
  readProps: () => Props,
): BlockRecord =>
  _$compiledRoot(parent => {
    if (!parent) throw new Error('parent')
    const staging = createDocumentFragment(parent)
    const first = createComment('rue:component')
    appendChild(staging, first)
    _$mountCompiledComponent(staging, factory, readProps)
    const last = createComment('/rue:component')
    appendChild(staging, last)
    return [first, last]
  })
