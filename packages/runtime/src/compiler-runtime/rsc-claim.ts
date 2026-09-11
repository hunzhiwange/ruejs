import { getSharedReactiveRuntime } from '../runtime-core/reactive-kernel/shared-runtime'
import {
  createOwner,
  runWithOwner,
  disposeOwner,
  getCurrentOwner,
  onOwnerCleanup,
  adoptOwner,
  type CompiledOwner,
} from '../runtime-core/compiled'
import { onErrorCaptured } from './component-errors'
import {
  claimServerHTML,
  hydrateRange,
  type ClaimPlan,
  type ClaimComponent,
  type RueRootHandle,
  type ClaimRootHandle,
} from './hydrate-claim'
import type { ServerFrame, ClientBoundary, ComponentResolver } from './rsc-frame'

/** Resolves a fixed manifest entry for each compiled boundary; no payload-to-renderable conversion. */
export async function hydrateServerFrame(
  container: Element,
  frame: ServerFrame,
  resolve: ComponentResolver<ClaimComponent>,
  options: { onError?: (error: unknown) => void } = {},
): Promise<ServerFrameRoot> {
  if (frame.version !== 1) throw new Error('Rue unsupported server frame version')
  const boundaries: ClientBoundary[] = []
  const parents = new Map<string, string>()
  const ids = new Set<string>()
  const collect = (frame: ServerFrame, parent?: string) => {
    if (frame.version !== 1) throw new Error('Rue unsupported server slot version')
    for (const boundary of frame.references) {
      if (ids.has(boundary.id)) throw new Error(`Rue duplicate client boundary ${boundary.id}`)
      ids.add(boundary.id)
      boundaries.push(boundary)
      if (parent !== undefined) parents.set(boundary.id, parent)
      if (boundary.children) collect(boundary.children, boundary.id)
    }
  }
  collect(frame)
  const components = await Promise.all(
    boundaries.map(async boundary => {
      const component = await resolve(boundary.referenceKey, boundary.exportName)
      if (typeof component !== 'function')
        throw new Error(
          `Rue missing compiled client export ${boundary.referenceKey}#${boundary.exportName}`,
        )
      return component
    }),
  )
  const starts = new Map<string, Comment>()
  const ends = new Map<string, Comment>()
  const walker = document.createTreeWalker(container, 128)
  while (walker.nextNode()) {
    const comment = walker.currentNode as Comment
    const match = /^(\/?)r:b:rsc:(\d+)$/.exec(comment.data)
    if (!match) continue
    const map = match[1] ? ends : starts
    if (map.has(match[2]!)) throw new Error(`Rue duplicate DOM client boundary ${match[2]}`)
    map.set(match[2]!, comment)
  }
  // Validate every boundary before attaching any listeners; mismatches never trigger a full render.
  for (const boundary of boundaries) {
    const start = starts.get(boundary.id)
    const end = ends.get(boundary.id)
    if (
      !start ||
      !end ||
      start.parentNode !== end.parentNode ||
      !(start.compareDocumentPosition(end) & 4)
    )
      throw new Error(`Rue hydration mismatch at client boundary ${boundary.id}`)
  }
  const owner = createOwner()
  if (options.onError)
    runWithOwner(owner, () =>
      onErrorCaptured(error => {
        options.onError!(error)
        return false
      }),
    )
  type Entry = { boundary: ClientBoundary; handle: ClaimRootHandle; start: Comment; end: Comment }
  let current: Entry[] = []
  let preserving = false
  const slotOwners = new Map<string, CompiledOwner>()
  const slot =
    (slotFrame: ServerFrame, boundaryId: string): ClaimPlan =>
    context => {
      claimServerHTML(slotFrame.html)(context)
      const slotOwner = getCurrentOwner()
      if (slotOwner !== undefined) slotOwners.set(boundaryId, slotOwner)
      const children: Array<{ boundary: ClientBoundary; parent?: string }> = []
      const visit = (value: ServerFrame, parent?: string) => {
        for (const boundary of value.references) {
          children.push({ boundary, parent })
          if (boundary.children) visit(boundary.children, boundary.id)
        }
      }
      visit(slotFrame)
      const childIds = new Set(children.map(({ boundary }) => boundary.id))
      onOwnerCleanup(() => {
        if (!preserving)
          for (const entry of [...current].reverse())
            if (childIds.has(entry.boundary.id)) entry.handle.unmount(false)
      })
      if (context.claim || preserving || !children.length) return
      const parent = context.parent
      context.root.track(
        (async () => {
          const mounted = new Map<string, ClaimRootHandle>()
          for (const { boundary, parent: parentId } of children) {
            const component = await resolve(boundary.referenceKey, boundary.exportName)
            if (typeof component !== 'function')
              throw new Error(
                `Rue missing compiled client export ${boundary.referenceKey}#${boundary.exportName}`,
              )
            let start: Comment | undefined, end: Comment | undefined
            const scan = document.createTreeWalker(parent, 128)
            while (scan.nextNode()) {
              const comment = scan.currentNode as Comment
              if (comment.data === `r:b:rsc:${boundary.id}`) start = comment
              if (comment.data === `/r:b:rsc:${boundary.id}`) end = comment
            }
            if (!start || !end) throw new Error(`Rue missing reset boundary ${boundary.id}`)
            const handle = hydrateRange(start, end, component, {
              actionState: {
                scope: boundary.identity ?? boundary.id,
                next: 0,
                initial: boundary.actionStates,
                states: [],
              },
              parentOwner:
                slotOwners.get(parentId ?? '') ?? mounted.get(parentId ?? '')?.owner ?? slotOwner,
              props: {
                ...boundary.props,
                ...(boundary.children ? { children: slot(boundary.children, boundary.id) } : {}),
              },
            })
            mounted.set(boundary.id, handle)
            const index = current.findIndex(entry => entry.boundary.id === boundary.id)
            const entry = { boundary, handle, start, end }
            if (index < 0) current.push(entry)
            else current[index] = entry
            await handle.ready
          }
        })(),
      )
    }
  const handles: ClaimRootHandle[] = []
  const parentHandles = new Map<string, ClaimRootHandle>()
  try {
    for (let i = 0; i < boundaries.length; i++) {
      const boundary = boundaries[i]!
      const handle = hydrateRange(
        starts.get(boundary.id)!,
        ends.get(boundary.id)!,
        components[i]!,
        {
          actionState: {
            scope: boundary.identity ?? boundary.id,
            next: 0,
            initial: boundary.actionStates,
            states: [],
          },
          parentOwner:
            slotOwners.get(parents.get(boundary.id) ?? '') ??
            parentHandles.get(parents.get(boundary.id) ?? '')?.owner ??
            owner,
          props: {
            ...boundary.props,
            ...(boundary.children ? { children: slot(boundary.children, boundary.id) } : {}),
          },
        },
      )
      handles.push(handle)
      parentHandles.set(boundary.id, handle)
      await handle.ready
    }
  } catch (error) {
    for (const handle of handles.reverse()) handle.unmount(false)
    disposeOwner(owner)
    throw error
  }
  let disposed = false
  current = boundaries.map((boundary, index) => ({
    boundary,
    handle: handles[index]!,
    start: starts.get(boundary.id)!,
    end: ends.get(boundary.id)!,
  }))
  const update = async (nextFrame: ServerFrame) => {
    if (disposed) throw new Error('Rue cannot update an unmounted server frame')
    const nextBoundaries: ClientBoundary[] = []
    const nextParents = new Map<string, string>()
    const seen = new Set<string>()
    const walk = (frame: ServerFrame, parent?: string) => {
      if (frame.version !== 1) throw new Error('Rue unsupported server frame version')
      for (const boundary of frame.references) {
        if (seen.has(boundary.id)) throw new Error(`Rue duplicate client boundary ${boundary.id}`)
        seen.add(boundary.id)
        nextBoundaries.push(boundary)
        if (parent !== undefined) nextParents.set(boundary.id, parent)
        if (boundary.children) walk(boundary.children, boundary.id)
      }
    }
    walk(nextFrame)
    const nextComponents = await Promise.all(
      nextBoundaries.map(async boundary => {
        const value = await resolve(boundary.referenceKey, boundary.exportName)
        if (typeof value !== 'function')
          throw new Error(
            `Rue missing compiled client export ${boundary.referenceKey}#${boundary.exportName}`,
          )
        return value
      }),
    )
    if (disposed) return
    const stage =
      container.tagName === 'HTML'
        ? new DOMParser().parseFromString(nextFrame.html, 'text/html').documentElement
        : document.createElement('div')
    if (container.tagName !== 'HTML') stage.innerHTML = nextFrame.html
    const locate = (id: string) => {
      const scan = document.createTreeWalker(stage, 128)
      let start: Comment | undefined, end: Comment | undefined
      while (scan.nextNode()) {
        const node = scan.currentNode as Comment
        if (node.data === `r:b:rsc:${id}`) start = node
        if (node.data === `/r:b:rsc:${id}`) end = node
      }
      if (!start || !end || start.parentNode !== end.parentNode)
        throw new Error(`Rue missing server frame boundary ${id}`)
      return { start, end }
    }
    for (const boundary of nextBoundaries) locate(boundary.id)
    preserving = true
    for (const entry of current) adoptOwner(entry.handle.owner, owner)
    try {
      const candidates = current.map(entry => {
        const nodes: Node[] = []
        for (let node: Node | null = entry.start; node; node = node.nextSibling) {
          nodes.push(node)
          if (node === entry.end) break
        }
        return { ...entry, nodes, used: false }
      })
      const next: typeof current = []
      for (let i = 0; i < nextBoundaries.length; i++) {
        const boundary = nextBoundaries[i]!
        let range = locate(boundary.id)
        const previous = candidates.find(
          entry =>
            !entry.used &&
            !entry.handle.disposed &&
            (entry.boundary.identity ?? entry.boundary.id) === (boundary.identity ?? boundary.id) &&
            entry.boundary.referenceKey === boundary.referenceKey &&
            entry.boundary.exportName === boundary.exportName,
        )
        const props = {
          ...boundary.props,
          ...(boundary.children ? { children: slot(boundary.children, boundary.id) } : {}),
        }
        let handle: ClaimRootHandle
        if (previous) {
          previous.used = true
          const parent = range.start.parentNode!
          const after = range.end.nextSibling
          for (let node: Node | null = range.start; node && node !== after; ) {
            const following: Node | null = node.nextSibling
            parent.removeChild(node)
            node = following
          }
          for (const node of previous.nodes) parent.insertBefore(node, after)
          previous.start.data = `r:b:rsc:${boundary.id}`
          previous.end.data = `/r:b:rsc:${boundary.id}`
          range = { start: previous.start, end: previous.end }
          handle = previous.handle
          adoptOwner(handle.owner, slotOwners.get(nextParents.get(boundary.id) ?? '') ?? owner)
          handle.updateProps(props)
          await getSharedReactiveRuntime().nextTick()
          await handle.ready
        } else {
          handle = hydrateRange(range.start, range.end, nextComponents[i]!, {
            props,
            actionState: {
              scope: boundary.identity ?? boundary.id,
              next: 0,
              initial: boundary.actionStates,
              states: [],
            },
            parentOwner:
              slotOwners.get(nextParents.get(boundary.id) ?? '') ??
              next.find(entry => entry.boundary.id === nextParents.get(boundary.id))?.handle
                .owner ??
              owner,
          })
          await handle.ready
        }
        next.push({ boundary, handle, ...range })
      }
      for (const previous of candidates) if (!previous.used) previous.handle.unmount(false)
      container.replaceChildren(...Array.from(stage.childNodes))
      current = next
    } finally {
      preserving = false
    }
  }
  let updates = Promise.resolve()
  return {
    update(nextFrame) {
      const pending = updates.then(() => update(nextFrame))
      updates = pending.catch(() => {})
      return pending
    },
    ready: Promise.resolve(),
    unmount(removeDOM = true) {
      if (disposed) return
      disposed = true
      for (const entry of current.reverse()) entry.handle.unmount(false)
      disposeOwner(owner)
      if (removeDOM) container.replaceChildren()
    },
  }
}

export interface ServerFrameRoot extends RueRootHandle {
  update(frame: ServerFrame): Promise<void>
}
