import { useEffect, getCurrentOwner } from '@rue-js/rue'
import { mountClaimRoot, type ClaimPlan } from '@rue-js/runtime/internal/hydrate'
import {
  _clientHeadChildren,
  headElementRecord,
  syncClientHead,
  isRueServerRender,
} from './head-records.js'
export * from './head-records.js'

export default function Head({ children }: { children?: ClaimPlan }) {
  if (typeof window === 'undefined' || isRueServerRender()) {
    return async (writer: import('@rue-js/runtime/internal/ssr').Writer) => {
      const { default: ServerHead } = await import('./head-server.js')
      await ServerHead({ children: children as any })(writer)
    }
  }
  const parentOwner = getCurrentOwner()
  useEffect(() => {
    if (!children) return
    const id = Symbol('text-head')
    const stage = document.createElement('div')
    const keys = new WeakMap<Element, unknown>()
    const root = mountClaimRoot(
      stage,
      () => context =>
        children({ ...context, onElement: (node, props) => keys.set(node, props.key) }),
      { parentOwner },
    )
    let disposed = false
    const sync = () => {
      if (disposed) return
      _clientHeadChildren.set(
        id,
        Array.from(stage.children, node =>
          headElementRecord(
            node.localName,
            Array.from(node.attributes),
            node.innerHTML,
            node.textContent ?? '',
            keys.get(node),
          ),
        ),
      )
      syncClientHead()
    }
    const observer = new MutationObserver(sync)
    void root.ready.then(() => {
      if (disposed) return
      sync()
      observer.observe(stage, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      })
    })
    return () => {
      disposed = true
      observer.disconnect()
      root.unmount()
      _clientHeadChildren.delete(id)
      syncClientHead()
    }
  }, [children])
  return <></>
}
