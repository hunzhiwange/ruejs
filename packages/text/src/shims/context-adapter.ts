import { _$planContext, _$planUseContext } from '@rue-js/runtime/internal/reactive'
import type { TextElement, TextNode } from '../runtime/render-protocol.js'
export type TextCompatContext<T> = ReturnType<typeof _$planContext<T>>
export type TextCompatElement = TextElement
export type TextCompatNode = TextNode
const CONTEXT_REGISTRY = Symbol.for('text.compiled.context.registry')
type ContextRegistry = Map<symbol, WeakMap<typeof _$planContext, TextCompatContext<unknown>>>
export function getOrCreateTextCompatContext<T>(
  key: symbol,
  defaultValue: T,
): TextCompatContext<T> {
  const state = globalThis as typeof globalThis & { [CONTEXT_REGISTRY]?: ContextRegistry }
  const registry = (state[CONTEXT_REGISTRY] ??= new Map())
  let contexts = registry.get(key)
  if (!contexts) registry.set(key, (contexts = new WeakMap()))
  let context = contexts.get(_$planContext)
  if (!context) {
    context = _$planContext(defaultValue)
    contexts.set(_$planContext, context)
  }
  return context as TextCompatContext<T>
}
export const createRequiredTextCompatContext = getOrCreateTextCompatContext
export function useTextCompatContext<T>(context: TextCompatContext<T>): T {
  return _$planUseContext(context)
}
export function useOptionalTextCompatContext<T>(
  context: TextCompatContext<T> | null,
  fallback: T,
): T {
  return context ? _$planUseContext(context) : fallback
}
export {
  createRequiredTextCompatContext as createRequiredRueCompatContext,
  getOrCreateTextCompatContext as getOrCreateRueCompatContext,
  useOptionalTextCompatContext as useOptionalRueCompatContext,
  useTextCompatContext as useRueCompatContext,
}
export type {
  TextCompatContext as RueCompatContext,
  TextCompatElement as RueCompatElement,
  TextCompatNode as RueCompatNode,
}
