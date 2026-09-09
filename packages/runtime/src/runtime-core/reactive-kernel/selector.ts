interface DirectSelectorSubscriber {
  callback: () => unknown
  untrack: <R>(callback: () => R) => R
  detach: Set<() => void>
  active: boolean
  running: boolean
}
let currentDirectSelectorSubscriber: DirectSelectorSubscriber | undefined
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
  return {
    track(key: T): boolean {
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
    },
    dispose(): void {
      for (const entries of subscribers.values()) {
        for (const detach of entries.values()) detach()
      }
      subscribers.clear()
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
  }
}
