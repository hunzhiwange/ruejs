import { applyDOMRef } from '../dom/props'

type HydrationRef = unknown

const adoptedNodes = new WeakSet<Node>()
const adoptedParents = new WeakSet<Node>()
const adoptedTargets = new WeakMap<Node, Node>()
const removalSuppressions = new WeakSet<Node>()
const pendingRemovals = new WeakMap<Node, Set<Node>>()
const listeners = new WeakMap<Node, Map<string, Set<EventListener>>>()
const refs = new WeakMap<Node, Set<HydrationRef>>()

export const resolveHydrationTarget = <T extends Node>(node: T): T => {
  let current: Node = node
  const visited = new Set<Node>()
  while (adoptedTargets.has(current) && !visited.has(current)) {
    visited.add(current)
    current = adoptedTargets.get(current)!
  }
  return current as T
}

export const markHydrationStagingNode = (node: Node): void => {
  adoptedNodes.add(node)
}

export const addHydrationEventListener = (
  node: Node,
  event: string,
  listener: EventListener,
): void => {
  const target = resolveHydrationTarget(node)
  target.addEventListener(event, listener)

  let events = listeners.get(node)
  if (!events) listeners.set(node, (events = new Map()))
  let eventListeners = events.get(event)
  if (!eventListeners) events.set(event, (eventListeners = new Set()))
  eventListeners.add(listener)
}

export const removeHydrationEventListener = (
  node: Node,
  event: string,
  listener: EventListener,
): void => {
  const target = resolveHydrationTarget(node)
  target.removeEventListener(event, listener)
  if (target !== node) node.removeEventListener(event, listener)

  const events = listeners.get(node)
  const eventListeners = events?.get(event)
  eventListeners?.delete(listener)
  if (eventListeners?.size === 0) events!.delete(event)
  if (events?.size === 0) listeners.delete(node)
}

export const applyHydrationRef = (node: Node, ref: HydrationRef): void => {
  applyDOMRef(ref, resolveHydrationTarget(node) as Element)
  let nodeRefs = refs.get(node)
  if (!nodeRefs) refs.set(node, (nodeRefs = new Set()))
  nodeRefs.add(ref)
}

export const clearHydrationRef = (node: Node, ref: HydrationRef): void => {
  const nodeRefs = refs.get(node)
  nodeRefs?.delete(ref)
  if (nodeRefs?.size === 0) refs.delete(node)
  applyDOMRef(ref, null)
}

const sameNodeShape = (oldNode: Node | null | undefined, newNode: Node | null | undefined) =>
  !!oldNode &&
  !!newNode &&
  oldNode.nodeType === newNode.nodeType &&
  (oldNode.nodeType !== Node.ELEMENT_NODE ||
    (oldNode as Element).tagName === (newNode as Element).tagName)

const syncElementAttributes = (serverNode: Element, clientNode: Element): void => {
  for (const name of serverNode.getAttributeNames()) {
    if (!clientNode.hasAttribute(name)) serverNode.removeAttribute(name)
  }
  for (const name of clientNode.getAttributeNames()) {
    serverNode.setAttribute(name, clientNode.getAttribute(name)!)
  }
}

const syncElementProperties = (serverNode: Element, clientNode: Element): void => {
  const server = serverNode as Element & {
    value?: unknown
    checked?: boolean
    disabled?: boolean
  }
  const client = clientNode as typeof server
  if ('value' in server && 'value' in client) {
    const value = client.value ?? ''
    if (String(server.value ?? '') !== String(value)) server.value = value
  }
  if ('checked' in server && 'checked' in client) server.checked = !!client.checked
  if ('disabled' in server && 'disabled' in client) server.disabled = !!client.disabled
}

const transferMetadata = (serverNode: Node, clientNode: Node): void => {
  adoptedTargets.set(clientNode, serverNode)

  for (const [event, eventListeners] of listeners.get(clientNode) ?? []) {
    for (const listener of eventListeners) {
      clientNode.removeEventListener(event, listener)
      serverNode.addEventListener(event, listener)
    }
  }
  for (const ref of refs.get(clientNode) ?? []) applyDOMRef(ref, serverNode as Element)
}

const markAdoptedNode = (node: Node): void => {
  adoptedNodes.add(node)
  if (node.parentNode) adoptedParents.add(node.parentNode)
}

const isMorphableChild = (serverNode: Node | null, clientNode: Node): boolean => {
  if (!sameNodeShape(serverNode, clientNode)) return false
  return (
    adoptedNodes.has(serverNode!) ||
    serverNode!.nodeType === Node.ELEMENT_NODE ||
    serverNode!.nodeType === Node.TEXT_NODE
  )
}

const findMatchingChild = (clientNode: Node, from: Node | null): Node | null => {
  let current = from
  while (current) {
    if (isMorphableChild(current, clientNode)) return current
    current = current.nextSibling
  }
  return null
}

const isRuntimeAnchor = (node: Node | null): boolean =>
  node?.nodeType === Node.COMMENT_NODE && String(node.nodeValue ?? '').startsWith('rue:')

const previousNonAnchorSibling = (node: Node): Node | null => {
  let current = node.previousSibling
  while (isRuntimeAnchor(current)) current = current!.previousSibling
  return current
}

const pairAnchorsWithExistingChildren = (serverNode: Node, anchors: Node[]): void => {
  let cursor = serverNode.firstChild
  for (const anchor of anchors) {
    while (isRuntimeAnchor(cursor)) cursor = cursor!.nextSibling
    if (!cursor) {
      serverNode.appendChild(anchor)
      continue
    }

    const paired = cursor
    const next = paired.nextSibling
    markAdoptedNode(paired)
    serverNode.insertBefore(anchor, next)
    cursor = next
  }

  while (cursor) {
    const next = cursor.nextSibling
    if (!isRuntimeAnchor(cursor)) serverNode.removeChild(cursor)
    cursor = next
  }
}

const morphChildren = (serverNode: Node, clientNode: Node): void => {
  const clientChildren = Array.from(clientNode.childNodes)
  if (clientChildren.length > 0 && clientChildren.every(isRuntimeAnchor)) {
    pairAnchorsWithExistingChildren(serverNode, clientChildren)
    return
  }

  let cursor = serverNode.firstChild
  for (const clientChild of clientChildren) {
    if (cursor === clientChild) {
      const adopted = findMatchingChild(clientChild, cursor.nextSibling)
      if (adopted && morphNode(adopted, clientChild)) {
        serverNode.insertBefore(adopted, cursor)
        serverNode.removeChild(clientChild)
        cursor = adopted.nextSibling
        continue
      }
      cursor = cursor.nextSibling
      continue
    }

    if (cursor && morphNode(cursor, clientChild)) {
      cursor = cursor.nextSibling
      continue
    }

    const adopted = findMatchingChild(clientChild, cursor)
    if (adopted && morphNode(adopted, clientChild)) {
      serverNode.insertBefore(adopted, cursor)
      cursor = adopted.nextSibling
      continue
    }

    serverNode.insertBefore(clientChild, cursor)
    cursor = clientChild.nextSibling
  }

  while (cursor) {
    const next = cursor.nextSibling
    serverNode.removeChild(cursor)
    cursor = next
  }
}

const morphNode = (serverNode: Node, clientNode: Node): boolean => {
  if (serverNode === clientNode) return true
  if (!isMorphableChild(serverNode, clientNode)) return false

  markAdoptedNode(serverNode)
  transferMetadata(serverNode, clientNode)
  if (serverNode.nodeType === Node.ELEMENT_NODE) {
    syncElementAttributes(serverNode as Element, clientNode as Element)
    syncElementProperties(serverNode as Element, clientNode as Element)
    morphChildren(serverNode, clientNode)
  } else {
    serverNode.textContent = clientNode.textContent ?? ''
  }
  removalSuppressions.add(serverNode)
  return true
}

export const adoptHydratedNode = (serverNode: Node, clientNode: Node): boolean =>
  morphNode(serverNode, clientNode)

const tryMorphAdoptedNode = (serverNode: Node, clientNode: Node): boolean =>
  serverNode !== clientNode && adoptedNodes.has(serverNode) && morphNode(serverNode, clientNode)

const findReplacementSibling = (parent: Node, oldNode: Node): Node | null => {
  if (!adoptedNodes.has(oldNode)) return null
  return (
    Array.from(parent.childNodes).find(
      node => node !== oldNode && !adoptedNodes.has(node) && sameNodeShape(node, oldNode),
    ) ?? null
  )
}

const findAdoptedSibling = (parent: Node, clientNode: Node): Node | null =>
  Array.from(parent.childNodes).find(
    node => node !== clientNode && adoptedNodes.has(node) && sameNodeShape(node, clientNode),
  ) ?? null

const takePendingRemoval = (parent: Node, clientNode: Node): Node | null => {
  const pending = pendingRemovals.get(parent)
  if (!pending) return null
  for (const serverNode of pending) {
    if (!sameNodeShape(serverNode, clientNode)) continue
    pending.delete(serverNode)
    if (pending.size === 0) pendingRemovals.delete(parent)
    return serverNode
  }
  return null
}

const queueRemoval = (parent: Node, child: Node): void => {
  let pending = pendingRemovals.get(parent)
  if (!pending) pendingRemovals.set(parent, (pending = new Set()))
  pending.add(child)
}

export const appendHydrationChild = (parent: Node, child: Node): void => {
  parent = resolveHydrationTarget(parent)
  child = resolveHydrationTarget(child)
  const adopted = findAdoptedSibling(parent, child) ?? takePendingRemoval(parent, child)
  if (adopted && tryMorphAdoptedNode(adopted, child)) return
  parent.appendChild(child)
  if (adoptedNodes.has(child) || adoptedParents.has(child)) adoptedParents.add(parent)
}

export const removeHydrationChild = (parent: Node, child: Node): void => {
  parent = resolveHydrationTarget(parent)
  child = resolveHydrationTarget(child)
  if (removalSuppressions.delete(child)) return

  const replacement = findReplacementSibling(parent, child)
  if (replacement && tryMorphAdoptedNode(child, replacement)) {
    parent.removeChild(replacement)
    removalSuppressions.delete(child)
    return
  }
  if (adoptedNodes.has(child)) {
    queueRemoval(parent, child)
    return
  }
  parent.removeChild(child)
}

export const insertHydrationChild = (parent: Node, child: Node, reference: Node | null): void => {
  parent = resolveHydrationTarget(parent)
  child = resolveHydrationTarget(child)
  reference = reference ? resolveHydrationTarget(reference) : null

  const paired = reference ? previousNonAnchorSibling(reference) : null
  if (paired && adoptedNodes.has(paired)) {
    if (tryMorphAdoptedNode(paired, child)) return
    parent.removeChild(paired)
  }
  const adopted = findAdoptedSibling(parent, child) ?? takePendingRemoval(parent, child)
  if (adopted && adopted !== reference && tryMorphAdoptedNode(adopted, child)) return
  if (reference && tryMorphAdoptedNode(reference, child)) return

  parent.insertBefore(child, reference)
  if (adoptedNodes.has(child) || adoptedParents.has(child)) adoptedParents.add(parent)
}
