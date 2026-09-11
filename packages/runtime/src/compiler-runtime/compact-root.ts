export { _$compiledRoot } from './block'
import type { BlockRecord, BlockSetup } from './block'

/** Owner-free root for compiler-proven static component bodies. */
export const _$compiledStaticRoot = (setup: BlockSetup): BlockRecord => {
  let first: Node | null = null
  let last: Node | null = null
  let mounted = false
  let disposed = false
  const cleanups: Array<() => void> = []
  const dispose = (): void => {
    if (disposed) return
    disposed = true
    for (const cleanup of cleanups.splice(0)) cleanup()
    let node = first
    while (node) {
      const next = node.nextSibling
      node.parentNode?.removeChild(node)
      if (node === last) break
      node = next
    }
    first = last = null
  }
  return {
    get first() {
      return first
    },
    get last() {
      return last
    },
    __rue_cleanup_bucket: cleanups,
    __rue_compiled_mount(parent, before = null) {
      if (disposed || mounted) throw new Error('[rue] invalid static block mount')
      mounted = true
      ;[first, last] = setup(parent)
      if (parent) {
        let node = first
        while (node) {
          const next = node.nextSibling
          parent.insertBefore(node, before)
          if (node === last) break
          node = next
        }
      }
      return first
    },
    dispose,
  }
}
export type {
  BlockRecord as CompactCompiledRootHandle,
  BlockSetup as CompactCompiledRootSetup,
  BlockRange as CompactCompiledRootSetupResult,
} from './block'
