import {
  getLayoutSegmentContext,
  setCurrentSsrLayoutSegmentMap,
  type SegmentMap,
} from './navigation.js'
import { type TextCompatNode } from './context-adapter.js'
import { markAppSsrPassthroughComponent } from '../server/app-ssr-passthrough-protocol.js'

export function LayoutSegmentProvider({
  segmentMap,
  children,
}: {
  segmentMap: SegmentMap
  children: TextCompatNode
}) {
  setCurrentSsrLayoutSegmentMap(segmentMap)
  if (typeof window === 'undefined') {
    return children
  }
  const ctx = getLayoutSegmentContext()
  if (!ctx) {
    return children
  }
  return ctx.Provider({ value: segmentMap, children: children as any })
}

markAppSsrPassthroughComponent(LayoutSegmentProvider)
