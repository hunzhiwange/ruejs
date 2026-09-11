import { resolveDOMHostParentContext } from './dom.browser'
import { trackFormControlEvent } from './form-controls'

type CompiledDelegatedHandler = () => unknown
type CompiledDelegatedHandlerRead = () => CompiledDelegatedHandler | null | undefined

type DelegatedTarget = EventTarget & { parentNode?: Node | null }
type DelegatedRegistration = {
  read: CompiledDelegatedHandlerRead
  root: EventTarget
  type: string
  next?: DelegatedRegistration
}

const delegatedHandlers = Symbol('rue.compiledDelegatedHandlers')
type DelegatedHandlerTarget = EventTarget & {
  [delegatedHandlers]?: DelegatedRegistration
}
const roots = new WeakMap<EventTarget, Map<string, EventListener>>()
const ownerlessListenerRoots = new WeakMap<EventTarget, EventTarget>()

const readHandler = (target: EventTarget, type: string): DelegatedRegistration | undefined => {
  let registration = (target as DelegatedHandlerTarget)[delegatedHandlers]
  while (registration !== undefined && registration.type !== type) registration = registration.next
  return registration
}

const eventPath = (event: Event, root: EventTarget): EventTarget[] => {
  const composed = typeof event.composedPath === 'function' ? event.composedPath() : []
  if (composed.length > 0 && composed.includes(root)) return composed

  const path: EventTarget[] = []
  let current = event.target as DelegatedTarget | null
  while (current != null) {
    path.push(current)
    if (current === root) break
    current = current.parentNode as DelegatedTarget | null
  }
  return path
}

const dispatch = (root: EventTarget, type: string, event: Event): void => {
  trackFormControlEvent(event)
  for (const target of eventPath(event, root)) {
    const registration = readHandler(target, type)
    if (registration?.root === root) {
      const handler = registration.read()
      if (typeof handler === 'function') handler()
    }
    if (target === root || event.cancelBubble) break
  }
}

const canListen = (value: unknown): value is EventTarget =>
  value != null && typeof (value as EventTarget).addEventListener === 'function'

/** Register a compiler-proven zero-argument bubbling handler on a shared mount root. */
const registerCompiledDelegateEvent = (
  root: EventTarget | null | undefined,
  target: EventTarget,
  type: string,
  read: CompiledDelegatedHandlerRead,
  disposable: boolean,
): (() => void) | undefined => {
  const cachedOwnerlessRoot =
    !disposable && root != null ? ownerlessListenerRoots.get(root) : undefined
  const resolvedRoot =
    cachedOwnerlessRoot ??
    (typeof Node !== 'undefined' && root instanceof Node ? resolveDOMHostParentContext(root) : root)
  // An unassociated staging fragment is emptied when its children are committed, so a listener
  // installed on it would become unreachable. Mapped list fragments resolve to their stable host;
  // otherwise keep the listener on the target that actually moves into the document.
  const detachedStagingRoot =
    typeof DocumentFragment !== 'undefined' &&
    root instanceof DocumentFragment &&
    resolvedRoot === root
  const listenerRoot =
    detachedStagingRoot && canListen(target)
      ? target
      : canListen(resolvedRoot)
        ? resolvedRoot
        : canListen(target)
          ? target
          : null
  if (listenerRoot == null) return disposable ? () => {} : undefined
  if (!disposable && root != null && listenerRoot !== target) {
    ownerlessListenerRoots.set(root, listenerRoot)
  }

  const handlerTarget = target as DelegatedHandlerTarget
  const registration: DelegatedRegistration = {
    read,
    root: listenerRoot,
    type,
    next: handlerTarget[delegatedHandlers],
  }
  handlerTarget[delegatedHandlers] = registration
  let fallbackListener: EventListener | undefined
  let disposed = false
  const dispose = disposable
    ? () => {
        disposed = true
        if (fallbackListener && canListen(target))
          target.removeEventListener(type, fallbackListener)
        let current = handlerTarget[delegatedHandlers]
        if (current === registration) handlerTarget[delegatedHandlers] = registration.next
        else {
          while (current?.next !== undefined && current.next !== registration)
            current = current.next
          if (current?.next === registration) current.next = registration.next
        }
      }
    : undefined

  if (
    disposable &&
    typeof Node !== 'undefined' &&
    listenerRoot instanceof Node &&
    target instanceof Node &&
    listenerRoot !== target
  ) {
    queueMicrotask(() => {
      if (disposed || listenerRoot.contains(target) || !canListen(target)) return
      fallbackListener = () => {
        const handler = read()
        if (typeof handler === 'function') handler()
      }
      target.addEventListener(type, fallbackListener)
    })
  }

  let rootListeners = roots.get(listenerRoot)
  if (!rootListeners) {
    rootListeners = new Map()
    roots.set(listenerRoot, rootListeners)
  }
  if (rootListeners.has(type)) return dispose

  const listener: EventListener = event => dispatch(listenerRoot, type, event)
  rootListeners.set(type, listener)
  listenerRoot.addEventListener(type, listener)
  return dispose
}

/** Register a delegated handler that can be explicitly removed before its node is discarded. */
export const _$compiledDelegateEvent = (
  root: EventTarget | null | undefined,
  target: EventTarget,
  type: string,
  read: CompiledDelegatedHandlerRead,
): (() => void) => registerCompiledDelegateEvent(root, target, type, read, true)!

/** Compiler-proven ownerless row registration retained only by its weak target key. */
export const _$compiledDelegateEventOwnerless = (
  root: EventTarget | null | undefined,
  target: EventTarget,
  type: string,
  read: CompiledDelegatedHandlerRead,
): void => {
  registerCompiledDelegateEvent(root, target, type, read, false)
}
