interface DirectSelectorSubscriber {
  callback: () => unknown
  untrack: <R>(callback: () => R) => R
  detach: Set<() => void>
  active: boolean
  running: boolean
}
let currentDirectSelectorSubscriber: DirectSelectorSubscriber | undefined
export const _$selectorCleanupRegistry = Symbol('rue.selectorCleanupRegistry')
export interface SelectorCleanupRegistry {
  clear(): void
}
export type SelectorKeyCleanup = (() => void) & {
  [_$selectorCleanupRegistry]?: SelectorCleanupRegistry
}
const runDirectSelectorSubscriber = (subscriber: DirectSelectorSubscriber): void => {
  if (!subscriber.active || subscriber.running) return
  subscriber.running = true
  for (const detach of subscriber.detach) detach()
  subscriber.detach.clear()
  const previous = currentDirectSelectorSubscriber
  currentDirectSelectorSubscriber = subscriber
  try {
    subscriber.untrack(subscriber.callback)
  } finally {
    currentDirectSelectorSubscriber = previous
    subscriber.running = false
  }
}

/** Key-filtered callbacks share selector invalidation without allocating per-row effects. */
export const createSelectorSubscriptions = <T>(untrack: <R>(callback: () => R) => R) => {
  const subscribers = new Map<T, Map<DirectSelectorSubscriber, () => void>>()
  const keyedSubscribers = new Map<T, Set<() => unknown>>()
  const uniqueKeyedSubscribers = new Map<T, () => unknown>()
  const uniqueCleanupRegistry: SelectorCleanupRegistry = {
    clear: () => uniqueKeyedSubscribers.clear(),
  }
  let readingKeyedSubscription = false
  const runKeyedSubscriber = (callback: () => unknown): void => {
    const previous = readingKeyedSubscription
    readingKeyedSubscription = true
    try {
      untrack(callback)
    } finally {
      readingKeyedSubscription = previous
    }
  }
  return {
    track(key: T): boolean {
      if (readingKeyedSubscription) return true
      const subscriber = currentDirectSelectorSubscriber
      if (subscriber === undefined) return false
      let entries = subscribers.get(key)
      if (entries === undefined) subscribers.set(key, (entries = new Map()))
      if (!entries.has(subscriber)) {
        const detach = () => {
          entries.delete(subscriber)
          subscriber.detach.delete(detach)
          if (entries.size === 0) subscribers.delete(key)
        }
        entries.set(subscriber, detach)
        subscriber.detach.add(detach)
      }
      return true
    },
    notify(previous: T, next: T): void {
      const pending = new Set([
        ...(subscribers.get(previous)?.keys() ?? []),
        ...(subscribers.get(next)?.keys() ?? []),
      ])
      for (const subscriber of pending) runDirectSelectorSubscriber(subscriber)
      const keyedPending = new Set([
        ...(keyedSubscribers.get(previous) ?? []),
        ...(keyedSubscribers.get(next) ?? []),
      ])
      for (const callback of keyedPending) runKeyedSubscriber(callback)
      const previousUnique = uniqueKeyedSubscribers.get(previous)
      const nextUnique = uniqueKeyedSubscribers.get(next)
      if (previousUnique !== undefined) runKeyedSubscriber(previousUnique)
      if (nextUnique !== undefined && nextUnique !== previousUnique) runKeyedSubscriber(nextUnique)
    },
    dispose(): void {
      for (const entries of subscribers.values()) {
        for (const detach of entries.values()) detach()
      }
      subscribers.clear()
      keyedSubscribers.clear()
      uniqueKeyedSubscribers.clear()
    },
    subscribe(callback: () => unknown): () => void {
      const subscriber: DirectSelectorSubscriber = {
        callback,
        untrack,
        detach: new Set(),
        active: true,
        running: false,
      }
      const dispose = () => {
        subscriber.active = false
        for (const detach of subscriber.detach) detach()
        subscriber.detach.clear()
      }
      try {
        runDirectSelectorSubscriber(subscriber)
      } catch (error) {
        dispose()
        throw error
      }
      return dispose
    },
    subscribeKey(key: T, callback: () => unknown): () => void {
      let entries = keyedSubscribers.get(key)
      if (entries === undefined) keyedSubscribers.set(key, (entries = new Set()))
      entries.add(callback)
      const dispose = () => {
        entries.delete(callback)
        if (entries.size === 0) keyedSubscribers.delete(key)
      }
      try {
        runKeyedSubscriber(callback)
      } catch (error) {
        dispose()
        throw error
      }
      return dispose
    },
    subscribeKeyUnique(key: T, callback: () => unknown): () => void {
      uniqueKeyedSubscribers.set(key, callback)
      const dispose: SelectorKeyCleanup = () => {
        if (uniqueKeyedSubscribers.get(key) === callback) uniqueKeyedSubscribers.delete(key)
      }
      dispose[_$selectorCleanupRegistry] = uniqueCleanupRegistry
      try {
        runKeyedSubscriber(callback)
      } catch (error) {
        dispose()
        throw error
      }
      return dispose
    },
  }
}
