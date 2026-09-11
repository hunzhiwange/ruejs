import { _$compiledRoot, type BlockRecord } from '../block'
import { effect, getCurrentOwner, onOwnerCleanup, untrack } from '../../runtime-core/compiled'
import { appendChild, createComment, insertBefore, createElement } from '../dom.browser'
import type { CompiledBlock } from '../types'
import { mountSlot, targetBefore } from './shared'
import {
  runTransitionPhase,
  transitionTime,
  type ActiveTransition,
  type CompiledTransitionProps,
} from './transition-phase'
export interface CompiledTransitionGroupProps extends CompiledTransitionProps {
  tag?: string
}

const elementNodes = (nodes: NodeList | readonly Node[]): HTMLElement[] => {
  const elements: HTMLElement[] = []
  for (const node of Array.from(nodes)) {
    if (node.nodeType === Node.ELEMENT_NODE) elements.push(node as HTMLElement)
  }
  return elements
}

/** Animate mutations produced by the compiled keyed reconciler without interpreting its values. */
export const _$transitionGroup = (readProps: () => CompiledTransitionGroupProps): BlockRecord => {
  let props!: CompiledTransitionGroupProps
  let anchor!: Comment
  let block: CompiledBlock | undefined
  let group: ParentNode | undefined
  let observer: MutationObserver | undefined
  let disposed = false
  const phases = new Set<ActiveTransition>()
  const leaving = new WeakSet<HTMLElement>()
  const leavingSnapshots = new Set<HTMLElement>()
  let snapshots = new Map<HTMLElement, HTMLElement>()
  const movePhases = new WeakMap<HTMLElement, ActiveTransition>()
  let positions = new Map<HTMLElement, { left: number; top: number; offsetTop: number }>()
  const currentElements = () => (block != null ? elementNodes(nodesInBlock(block)) : [])
  const measurePosition = (element: HTMLElement) => {
    const elementRect = element.getBoundingClientRect()
    const groupRect = group instanceof Element ? group.getBoundingClientRect() : undefined
    return {
      left: elementRect.left - (groupRect?.left ?? 0),
      top: elementRect.top - (groupRect?.top ?? 0),
      offsetTop: element.offsetTop,
    }
  }
  const track = (element: HTMLElement, phase: 'enter' | 'leave', done?: () => void) => {
    let control: ActiveTransition | undefined
    let settled = false
    control = runTransitionPhase(element, props, phase, () => {
      settled = true
      if (control) phases.delete(control)
      done?.()
    })
    if (!settled) phases.add(control)
  }
  const trackMove = (element: HTMLElement, deltaX: number, deltaY: number) => {
    movePhases.get(element)?.cancel()
    const moveClass = `${props.name ?? 'rue'}-move`
    const previousTransform = element.style.transform
    const previousTransition = element.style.transition
    let settled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let control: ActiveTransition
    const cleanup = () => {
      if (timer !== undefined) clearTimeout(timer)
      element.classList.remove(moveClass)
      element.style.transform = previousTransform
      element.style.transition = previousTransition
      phases.delete(control)
      if (movePhases.get(element) === control) movePhases.delete(element)
    }
    const finish = () => {
      if (settled) return
      settled = true
      cleanup()
    }
    control = {
      cancel() {
        if (settled) return
        settled = true
        cleanup()
      },
    }
    movePhases.set(element, control)
    phases.add(control)
    element.style.transition = 'none'
    element.style.transform = `translate(${deltaX}px, ${deltaY}px)`
    void element.offsetHeight
    element.classList.add(moveClass)
    element.style.transition = previousTransition
    element.style.transform = previousTransform
    timer = setTimeout(finish, transitionTime(props.duration, 'enter'))
  }
  const capturePositions = () => {
    const next = new Map<HTMLElement, { left: number; top: number; offsetTop: number }>()
    for (const element of currentElements()) {
      if (!leaving.has(element)) next.set(element, measurePosition(element))
    }
    positions = next
    snapshots = new Map(
      currentElements()
        .filter(element => !leaving.has(element))
        .map(element => [element, element.cloneNode(true) as HTMLElement]),
    )
  }
  const observe = (parent: ParentNode) => {
    observer = new MutationObserver(records => {
      if (disposed) return
      const added = new Set<HTMLElement>()
      const firstMutation = new WeakMap<HTMLElement, 'added' | 'removed'>()
      const removed: Array<{
        element: HTMLElement
        parent: ParentNode
        before: Node | null
      }> = []
      for (const record of records) {
        for (const element of elementNodes(record.addedNodes)) {
          if (!firstMutation.has(element)) firstMutation.set(element, 'added')
          added.add(element)
        }
        for (const element of elementNodes(record.removedNodes)) {
          if (!firstMutation.has(element)) firstMutation.set(element, 'removed')
          removed.push({
            element,
            parent: record.target as ParentNode,
            before: record.nextSibling,
          })
        }
      }
      const moved = new Set(
        removed
          .map(({ element }) => element)
          .filter(element => added.has(element) && firstMutation.get(element) === 'removed'),
      )
      for (const element of added) {
        if (!moved.has(element) && !leaving.has(element) && currentElements().includes(element))
          track(element, 'enter')
      }
      for (const { element, parent, before } of removed) {
        if (moved.has(element) || leaving.has(element) || element.isConnected) continue
        const snapshot = snapshots.get(element)
        if (!snapshot) continue
        leaving.add(snapshot)
        leavingSnapshots.add(snapshot)
        const previousPosition = positions.get(element)
        if (previousPosition != null) snapshot.style.top = `${previousPosition.offsetTop}px`
        insertBefore(parent, snapshot, before?.parentNode === parent ? before : null)
        track(snapshot, 'leave', () => {
          snapshot.remove()
          leavingSnapshots.delete(snapshot)
          queueMicrotask(() => leaving.delete(snapshot))
        })
      }
      const nextPositions = new Map<HTMLElement, { left: number; top: number; offsetTop: number }>()
      for (const element of currentElements()) {
        if (leaving.has(element)) continue
        const nextPosition = measurePosition(element)
        const previousPosition = positions.get(element)
        if (previousPosition != null) {
          const deltaX = previousPosition.left - nextPosition.left
          const deltaY = previousPosition.top - nextPosition.top
          if (deltaX !== 0 || deltaY !== 0) trackMove(element, deltaX, deltaY)
        }
        nextPositions.set(element, nextPosition)
      }
      positions = nextPositions
      snapshots = new Map(
        currentElements()
          .filter(element => !leaving.has(element))
          .map(element => [element, element.cloneNode(true) as HTMLElement]),
      )
    })
    observer.observe(parent, { childList: true, subtree: true, characterData: true })
  }
  const root = _$compiledRoot(parent => {
    if (parent == null) throw new Error('[rue] compiled TransitionGroup requires a parent')
    props = untrack(readProps)
    const owner = getCurrentOwner()!
    const start = createComment('rue:transition-group:start')
    appendChild(parent, start)
    anchor = createComment('rue:compiled-transition-group')
    if (props.tag != null) {
      const element = createElement(props.tag, parent)
      appendChild(parent, element)
      appendChild(element, anchor)
      group = element
      block = mountSlot(props.children, targetBefore(anchor), owner)
    } else {
      appendChild(parent, anchor)
      group = parent
      block = mountSlot(props.children, targetBefore(anchor), owner)
    }
    effect(() => {
      props = readProps()
    })
    observe(group)
    capturePositions()
    queueMicrotask(() => {
      if (disposed) return
      // A tagless group can be mounted through a fragment that has since been drained.
      if (props.tag == null && anchor.parentNode != null && anchor.parentNode !== group) {
        observer?.disconnect()
        group = anchor.parentNode
        observe(group)
      }
      capturePositions()
    })
    if (props.appear === true) {
      queueMicrotask(() => {
        if (disposed) return
        for (const element of elementNodes(block == null ? [] : nodesInBlock(block))) {
          track(element, 'enter')
        }
      })
    }
    onOwnerCleanup(() => {
      disposed = true
      observer?.disconnect()
      for (const phase of phases) phase.cancel()
      phases.clear()
      for (const snapshot of leavingSnapshots) snapshot.remove()
      leavingSnapshots.clear()
      snapshots.clear()
      positions.clear()
      block?.dispose()
      block = undefined
    })
    return [start, props.tag != null ? (group as Node) : anchor]
  })
  return root
}

const nodesInBlock = (block: CompiledBlock): Node[] => {
  const nodes: Node[] = []
  let node: Node | null = block.first
  while (node != null) {
    nodes.push(node)
    if (node === block.last) break
    node = node.nextSibling
  }
  return nodes
}
