// Private compiler ABI for component mounting and the legacy DOM fallback.
// Builtins intentionally live in ./builtins-internal so component-only output
// cannot retain their implementations through this facade.
export * from './internal-reactive'
export * from './compiled-props'
export * from './compiled-component'
export * from './compiled-dom-bindings'
export * from './compiled-component-call'
export { getCurrentContainer } from './runtime-context'
export { useApp } from './hooks/useApp'
export { onError } from './rue'
export {
  _$compiledMarkComponentRenderReactive,
  _$compiledWithHookId,
  getCurrentInstance,
} from './compiled-hook-compat'
export { _$withCompiledHookScope } from './compiled-hook-scope'
export { toValue, triggerRef, watch } from './reactivity/index'
export { computed, createResource, isRef, unref } from './reactivity/index'
export * from './compiled-root'
export * from './compiled-keyed-list'
export {
  _$disposeCompiledKeyedRows,
  _$mountCompiledKeyedSingleRow,
  _$reconcileKeyedSingle,
} from './compiler-runtime/compact-keyed-list'
export * from './compiler-runtime/types'
export * from './compiler-runtime/mount'
export * from './compiler-runtime/hooks'
export * from './compiler-runtime/compact-events'
export {
  appendChild as _$compiledAppendChild,
  createComment as _$compiledCreateComment,
  createDocumentFragment as _$compiledCreateDocumentFragment,
  createElement as _$compiledCreateElement,
  createTextNode as _$compiledCreateTextNode,
  insertBefore as _$compiledInsertBefore,
  removeChild as _$compiledRemoveChild,
  template as _$template,
} from './compiler-runtime/dom.browser'

export {
  _$compiledPath,
  _$compiledReadPath,
  _$compiledStateSignal,
  _$compiledStateRoot,
  _$compiledStateMember,
  _$compiledStateDelete,
  _$compiledStateMutator,
} from './runtime-core/compiled'
