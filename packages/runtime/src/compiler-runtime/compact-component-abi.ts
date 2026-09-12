import { renderEffect as effect } from '../runtime-core/compiled'
import type { CompactCompiledRootHandle } from './compact-root'

const UPDATE_PROPS_KEY = '__rue_compiled_update_props__' as const

export { _$withCompiledHookScope } from './hooks'

export const _$withCompiledPropsUpdater = <Props>(
  root: CompactCompiledRootHandle,
  updateProps: (props: Props) => void,
  readSourceProps?: () => Props,
): CompactCompiledRootHandle & { [UPDATE_PROPS_KEY]: (props: Props) => void } => {
  const handle = root as CompactCompiledRootHandle & {
    [UPDATE_PROPS_KEY]: (props: Props) => void
  }
  if (readSourceProps) {
    const sourceEffect = effect(() => updateProps(readSourceProps()))
    root.__rue_cleanup_bucket.push(() => sourceEffect.dispose())
  }
  handle[UPDATE_PROPS_KEY] = updateProps
  return handle
}

export { _$mountCompiledSlotFactory, _$mountCompiledSlotAt } from './block-factory'
