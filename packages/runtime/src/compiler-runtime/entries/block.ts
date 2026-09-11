// Compiler capability entry: explicit exports from implementation modules only.
export { _$compiledRoot, _$compiledStaticRoot } from '../compact-root'
export { _$compiledBranch } from '../block'
export { _$compiledBranchAt } from '../block'
export { _$compiledRootFactory } from '../../compiled-component-call'
export {
  _$compiledValueFactory,
  _$mountCompiledSlotFactory,
  _$mountCompiledSlotAt,
} from '../block-factory'

export type { BlockFactory } from '../block-factory'
