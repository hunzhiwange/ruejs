import { onOwnerCleanup } from '../runtime-core/compiled'
import { _$compiledScalarRoot } from './scalar-reactivity'

export const _$compiledScalarOwnedRoot = (setup: Parameters<typeof _$compiledScalarRoot>[0]) => {
  const root = _$compiledScalarRoot(setup)
  onOwnerCleanup(root.dispose)
  return root
}
