// Keep this entry limited to the compact compiler ABI. The published build is flattened, so
// re-exporting compatibility modules with top-level bridges here makes every compiled consumer
// retain the full reactive/runtime facade even when Rollup drops the unused exports.
export * from './compiled-hook-compat'
export * from './runtime-core/compiled'
export {
  _$compiledRenderEffect,
  batch as _$compiledBatch,
  signal as _$compiledSignal,
} from './runtime-core/compiled'
export { onOwnerCleanup as onScopeDispose } from './runtime-core/compiled'
export * from './compiler-runtime/compact-root'
export * from './compiler-runtime/compact-keyed-list'
export * from './compiler-runtime/compact-events'
export * from './compiler-runtime/compact-component-abi'
export {
  _$compiledUseState,
  computed,
  onMounted,
  onUnmounted,
  ref,
  watchEffect,
} from './compiler-runtime/compact-reactivity'
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
export * from './compiler-runtime/entries/block'
export * from './compiler-runtime/entries/component'
export * from './compiler-runtime/entries/dom'
export * from './compiler-runtime/entries/events'
export * from './compiler-runtime/entries/list'

export {
  _$compiledPropsCall,
  _$compiledPropsGet,
  _$compiledPropsHas,
  _$compiledPropsKeys,
  _$compiledPropsSnapshot,
} from './compiled-props'
