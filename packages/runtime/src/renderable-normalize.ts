import { createTextNode } from './dom'
import type { DomNodeLike } from './dom'
import type {
  BlockFactory,
  BlockInstance,
  NormalizedRenderable,
  NormalizeRenderableResult,
} from './renderable'

const isDomNodeLike = (value: unknown): value is DomNodeLike & { nodeType: number } =>
  !!value && typeof value === 'object' && 'nodeType' in value

const isBlockInstance = (value: unknown): value is BlockInstance =>
  !!value &&
  typeof value === 'object' &&
  (value as BlockInstance).kind === 'block' &&
  typeof (value as BlockInstance).mount === 'function'

const isBlockFactory = (value: unknown): value is BlockFactory =>
  typeof value === 'function' && (value as BlockFactory).kind === 'block-factory'

const normalizeRenderableArray = (values: readonly unknown[]): NormalizeRenderableResult => {
  const normalized: NormalizedRenderable[] = []

  for (const value of values) {
    const result = normalizeRenderable(value)
    if (result.kind === 'unsupported-object') {
      return result
    }
    if (Array.isArray(result.value)) {
      normalized.push(...result.value)
      continue
    }
    normalized.push(result.value)
  }

  return { kind: 'renderable', value: normalized }
}

export const normalizeRenderable = (value: unknown): NormalizeRenderableResult => {
  if (value == null || typeof value === 'boolean') {
    return { kind: 'renderable', value: [] }
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return { kind: 'renderable', value: createTextNode(String(value)) }
  }
  if (Array.isArray(value)) {
    return normalizeRenderableArray(value)
  }
  if (isDomNodeLike(value) || isBlockInstance(value) || isBlockFactory(value)) {
    return { kind: 'renderable', value }
  }
  return { kind: 'unsupported-object', value }
}
