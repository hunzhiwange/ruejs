type Subscription = (() => void) & { dependencies: Set<Set<Subscription>> }
type Subscriber = Subscription
import { signal as kernelSignal, type SignalOptions } from '../runtime-core/compiled'
let activeSubscriber: Subscription | undefined
const bridged = new WeakMap<object, Set<Subscription>>()
const bridge = globalThis as typeof globalThis & {
  __rue_s__?: (source: object, trigger?: boolean) => void
}
const notify = (subscribers?: Set<Subscription>) => {
  for (const subscriber of [...(subscribers ?? [])]) subscriber()
}
const track = (subscribers: Set<Subscription>) => {
  if (!activeSubscriber) return
  subscribers.add(activeSubscriber)
  activeSubscriber.dependencies.add(subscribers)
}
bridge.__rue_s__ = (source, trigger) => {
  if (trigger) {
    notify(bridged.get(source))
  } else {
    let subscribers = bridged.get(source)
    if (!subscribers) bridged.set(source, (subscribers = new Set()))
    track(subscribers)
  }
}
const runScalarSubscriber = (subscriber: Subscription, callback: () => void): void => {
  for (const dependency of subscriber.dependencies) dependency.delete(subscriber)
  subscriber.dependencies.clear()
  const saved = activeSubscriber
  activeSubscriber = subscriber
  try {
    callback()
  } finally {
    activeSubscriber = saved
  }
}
let activeCleanups: Array<() => void> | undefined

export interface CompiledScalarSignal<T> {
  get(): T
  peek(): T
  set(value: T): void
  update(update: (value: T) => T): void
  trigger(): void
  dispose(): void
}

export const _$compiledScalarSignal = <T>(initial: T): CompiledScalarSignal<T> => {
  let value = initial
  const subscribers = new Set<Subscriber>()
  return {
    get() {
      track(subscribers)
      return value
    },
    peek: () => value,
    set(next) {
      if (Object.is(value, next)) return
      value = next
      notify(subscribers)
    },
    update(update) {
      this.set(update(value))
    },
    trigger() {
      notify(subscribers)
    },
    dispose: () => subscribers.clear(),
  }
}

export const _$compiledBridgeSignal = <T>(initial: T, options?: SignalOptions<T> | null) => {
  return kernelSignal(initial, options)
}

export const _$compiledScalarText = (node: { textContent: string | null }, read: () => unknown) => {
  let previous: string | undefined
  const update = (() => {
    for (const dependency of update.dependencies) dependency.delete(update)
    update.dependencies.clear()
    runScalarSubscriber(update, () => {
      const raw = read()
      const next = raw == null || typeof raw === 'boolean' ? '' : String(raw)
      if (!Object.is(previous, next)) node.textContent = previous = next
    })
  }) as Subscription
  update.dependencies = new Set()
  const dispose = () => {
    for (const dependency of update.dependencies) dependency.delete(update)
    update.dependencies.clear()
  }
  activeCleanups?.push(dispose)
  try {
    update()
  } catch (error) {
    dispose()
    throw error
  }
}

export const _$compiledScalarEffect = (callback: () => unknown) => {
  const run = (() => {
    for (const dependency of run.dependencies) dependency.delete(run)
    run.dependencies.clear()
    runScalarSubscriber(run, () => {
      callback()
    })
  }) as Subscription
  run.dependencies = new Set()
  const dispose = () => {
    for (const dependency of run.dependencies) dependency.delete(run)
    run.dependencies.clear()
  }
  activeCleanups?.push(dispose)
  try {
    run()
  } catch (error) {
    dispose()
    throw error
  }
  return { dispose }
}

export const _$compiledScalarCleanup = (cleanup: () => void): void => {
  activeCleanups?.push(cleanup)
}

type ScalarSetup = (parent: ParentNode | null) => readonly [Node | null, Node | null]
export const _$compiledScalarRoot = (setup: ScalarSetup) => {
  let first: Node | null = null
  let mounted = false
  let disposed = false
  const cleanups: Array<() => void> = []
  const dispose = () => {
    if (disposed) return
    disposed = true
    for (const cleanup of cleanups.splice(0)) cleanup()
    first?.parentNode?.removeChild(first)
    first = null
  }
  return {
    get first() {
      return first
    },
    get last() {
      return first
    },
    __rue_cleanup_bucket: cleanups,
    __rue_compiled_mount(parent: ParentNode | null, before: Node | null = null) {
      if (disposed || mounted) throw new Error('[rue] invalid scalar block mount')
      mounted = true
      const saved = activeCleanups
      activeCleanups = cleanups
      try {
        ;[first] = setup(parent)
      } catch (error) {
        dispose()
        throw error
      } finally {
        activeCleanups = saved
      }
      if (parent && first) parent.insertBefore(first, before)
      return first
    },
    dispose,
  }
}
