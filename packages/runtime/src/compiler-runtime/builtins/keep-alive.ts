import { _$compiledRoot, type BlockRecord } from '../block'
import {
  renderEffect as effect,
  getCurrentOwner,
  onOwnerCleanup,
  untrack,
} from '../../runtime-core/compiled'
import { appendChild, createComment, createDocumentFragment } from '../dom.browser'
import { moveCompiledBlock } from '../mount'
import type { CompiledBlock } from '../types'
import { mountSlot, targetBefore, type BuiltinProps } from './shared'
import { runOwnerLifecycleTree, registerOwnerLifecycle } from '../../runtime-core/compiled'
export interface CompiledKeepAliveProps extends BuiltinProps {
  cacheKey?: unknown
  cacheName?: string
  include?: string | RegExp | Array<string | RegExp>
  exclude?: string | RegExp | Array<string | RegExp>
  max?: number | string
}
const matchesKeepAlive = (
  pattern: CompiledKeepAliveProps['include'],
  name: string | undefined,
): boolean => {
  if (pattern == null) return true
  if (name == null) return false
  if (Array.isArray(pattern)) return pattern.some(entry => matchesKeepAlive(entry, name))
  if (pattern instanceof RegExp) {
    pattern.lastIndex = 0
    return pattern.test(name)
  }
  return pattern.split(',').some(entry => entry.trim() === name)
}

export const _$keepAlive = (readProps: () => CompiledKeepAliveProps): BlockRecord =>
  _$compiledRoot(parent => {
    if (!parent) throw new Error('[rue] KeepAlive requires a parent')
    const owner = getCurrentOwner()!
    const start = createComment('rue:keep-alive:start')
    const anchor = createComment('rue:keep-alive:end')
    appendChild(parent, start)
    appendChild(parent, anchor)
    const cache = new Map<unknown, CompiledBlock>()
    const parking = createDocumentFragment(parent)
    let active: CompiledBlock | undefined
    let activeKey: unknown
    let initialized = false
    registerOwnerLifecycle('beforeUnmount', () => {
      if (active) runOwnerLifecycleTree(active.owner, 'deactivated')
    })
    onOwnerCleanup(() => {
      active?.dispose()
      for (const block of cache.values()) block.dispose()
      cache.clear()
      active = undefined
    })
    effect(() => {
      const props = readProps()
      const key = props.cacheKey
      const name =
        props.cacheName === 'Component' && typeof key === 'string' ? key : props.cacheName
      const cacheable =
        matchesKeepAlive(props.include, name) &&
        (props.exclude == null || !matchesKeepAlive(props.exclude, name)) &&
        Number(props.max ?? Infinity) > 0
      untrack(() => {
        if (!initialized || !Object.is(key, activeKey)) {
          if (active) {
            runOwnerLifecycleTree(active.owner, 'deactivated')
            if (cache.has(activeKey)) moveCompiledBlock(active, { parent: parking, before: null })
            else active.dispose()
          }
          active = cache.get(key)
          if (active) moveCompiledBlock(active, targetBefore(anchor))
          else active = mountSlot(props.children, targetBefore(anchor), owner)
          activeKey = key
          initialized = true
          if (active) runOwnerLifecycleTree(active.owner, 'activated')
        }
        cache.delete(key)
        if (active && cacheable) cache.set(key, active)
        const limit = Math.max(0, Number(props.max ?? Infinity))
        while (cache.size > limit) {
          const oldest = cache.keys().next().value
          const block = cache.get(oldest)!
          cache.delete(oldest)
          if (block !== active) block.dispose()
        }
      })
    })
    return [start, anchor]
  })
