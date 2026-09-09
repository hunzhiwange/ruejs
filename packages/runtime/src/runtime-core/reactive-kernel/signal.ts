import type { ReactiveNodeId } from './graph.js'
import type { ReactiveRuntimeServices as ReactiveEffectRuntime } from './runtime-services.js'
import { SignalBase, type SignalOptions } from './signal-base.js'
export type { EqualityComparator, SignalOptions } from './signal-base.js'

/** Stable, signal-owned path cursor. Resolve once for allocation-free path reads. */
export interface SignalPathToken {
  readonly path: readonly PropertyKey[]
}
export type SignalPath = string | readonly PropertyKey[] | SignalPathToken

const normalizePathSegment = (key: PropertyKey): PropertyKey =>
  typeof key === 'number' ? String(key) : key

// Retained only for the transitional Proxy caller.
export const appendSignalPath = (
  path: readonly PropertyKey[],
  segment: PropertyKey,
): readonly PropertyKey[] => [...path, normalizePathSegment(segment)]

class PathNode implements SignalPathToken {
  readonly children = new Map<PropertyKey, PathNode>()
  exact?: ReactiveNodeId
  descendants?: ReactiveNodeId
  constructor(
    readonly owner: object,
    readonly parent: PathNode | undefined,
    readonly path: readonly PropertyKey[],
    readonly key: PropertyKey = 'value',
  ) {}
}
const isObjectLike = (value: unknown): value is object =>
  (typeof value === 'object' && value !== null) || typeof value === 'function'
const getAtPath = (root: unknown, path: readonly PropertyKey[], start = 0): unknown => {
  let current = root
  for (let index = start; index < path.length; index++) {
    const key = path[index]!
    if (current == null) return undefined
    try {
      current = (current as any)[key]
    } catch {
      return undefined
    }
  }
  return current
}
// Compare the traversal as well as its result: a null intermediate is observably
// different from a valid chain whose last property is undefined.
const pathValuesDiffer = (previous: any, next: any, path: readonly PropertyKey[]): boolean => {
  for (const key of path) {
    if (Object.is(previous, next)) return false
    if (previous == null || next == null) return true
    try {
      previous = previous[key]
      next = next[key]
    } catch {
      return true
    }
  }
  return !Object.is(previous, next)
}

const containerFor = (key: PropertyKey): object =>
  typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key) ? [] : {}

export class SignalHandle<T> extends SignalBase<T> {
  override set(next: T): void {
    this.write(next)
  }
  protected write(next: T): void {
    super.set(next)
  }
  protected readCachedValue(): T {
    return this._value
  }

  protected replaceCachedValue(next: T): void {
    this._value = next
  }
  override get(): T {
    this.beforeRead()
    return super.get()
  }
  override peek(): T {
    this.beforeRead()
    return super.peek()
  }
  override get value(): T {
    this.beforeRead()
    return this.shouldTrackValueRead() ? super.get() : super.value
  }
  override set value(next: T) {
    super.value = next
  }
  protected shouldTrackValueRead(): boolean {
    return false
  }

  get __isReadonly__(): boolean {
    return false
  }
  get __rue_ref__(): boolean {
    return false
  }
  toJSON(): T {
    this.beforeRead()
    return this.readCachedValue()
  }
  valueOf(): T {
    this.beforeRead()
    return this.readCachedValue()
  }
  toString(): string {
    this.beforeRead()
    try {
      const serialized = JSON.stringify(this.readCachedValue())
      return serialized === undefined ? '[object SignalHandle]' : serialized
    } catch {
      return '[object SignalHandle]'
    }
  }
  __rueInvalidateComputed(): boolean {
    return false
  }
  protected beforeRead(): void {}

  constructor(
    protected readonly runtime: ReactiveEffectRuntime,
    initial: T,
    private readonly options: SignalOptions<T> = {},
    node = runtime.graph.createDependencyNode(),
    id = runtime.allocateSignalId(),
  ) {
    super(runtime.storage, initial, options, node, id)
  }

  #pathRoot?: PathNode
  get #rootPath(): PathNode {
    return (this.#pathRoot ??= new PathNode(this, undefined, []))
  }
  #parsedPaths?: Map<string, PathNode>
  get #stringPaths(): Map<string, PathNode> {
    return (this.#parsedPaths ??= new Map())
  }
  #pathNodeCount = 0

  get pathNodeCount(): number {
    return this.#pathNodeCount
  }
  resolvePath(path: SignalPath): SignalPathToken {
    if (path instanceof PathNode) {
      if (path.owner !== this) throw new TypeError('Path token belongs to another signal')
      return path
    }
    if (typeof path === 'string') {
      const cached = this.#stringPaths.get(path)
      if (cached) return cached
      const resolved = this.resolvePath(path.split('.').filter(Boolean)) as PathNode
      if (!this.disposed) this.#stringPaths.set(path, resolved)
      return resolved
    }
    if (!Array.isArray(path)) throw new TypeError('Invalid signal path')
    let current = this.#rootPath
    for (const segment of path) {
      const key = normalizePathSegment(segment)
      let child = current.children.get(key)
      if (!child) {
        child = new PathNode(this, current, [...current.path, key], key)
        if (!this.disposed) {
          current.children.set(key, child)
          this.#pathNodeCount++
        }
      }
      current = child
    }
    return current
  }

  getPath(path: SignalPath): unknown {
    this.beforeRead()
    const token = this.resolvePath(path) as PathNode
    this.trackPath(token)
    return getAtPath(this.readCachedValue(), token.path)
  }

  trackPath(path: SignalPath, includeDescendantChanges = false): void {
    if (this.disposed || this.runtime.currentEffectId === undefined) return
    const token = this.resolvePath(path) as PathNode
    if (token === this.#rootPath) {
      this.runtime.trackDependency(this.node)
      return
    }
    const kind = includeDescendantChanges ? 'descendants' : 'exact'
    token[kind] ??= this.runtime.graph.createDependencyNode()
    this.runtime.trackDependency(token[kind])
  }

  peekPath(path: SignalPath): unknown {
    this.beforeRead()
    return getAtPath(this.readCachedValue(), this.resolvePath(path).path)
  }

  setPath(path: SignalPath, value: unknown): void {
    const token = this.resolvePath(path) as PathNode
    if (token === this.#rootPath) {
      this.set(value as T)
      return
    }
    const previous = getAtPath(this.readCachedValue(), token.path)
    if (Object.is(previous, value)) return
    // Custom comparators need distinct root snapshots; the default path stays in-place.
    if (this.options.equals !== undefined) {
      const copy = (current: unknown, depth: number): unknown => {
        if (depth === token.path.length) return value
        const key = token.path[depth]!
        const next = Array.isArray(current)
          ? current.slice()
          : isObjectLike(current)
            ? Object.defineProperties(
                Object.create(Object.getPrototypeOf(current)),
                Object.getOwnPropertyDescriptors(current),
              )
            : containerFor(key)
        if (
          !Reflect.set(
            next,
            key,
            copy(isObjectLike(current) ? Reflect.get(current, key) : undefined, depth + 1),
          )
        )
          throw new TypeError('Cannot write signal path')
        return next
      }
      const root = this.readCachedValue()
      const next = copy(root, 0) as T
      let equal = false
      try {
        equal = this.options.equals(root, next)
      } catch {}
      this.replaceCachedValue(next)
      if (!equal) this.#notifyPath(token, previous, value)
      return
    }
    if (!isObjectLike(this.readCachedValue()))
      this.replaceCachedValue(containerFor(token.path[0]!) as T)
    let parent = this.readCachedValue() as object
    for (let i = 0; i < token.path.length - 1; i++) {
      const key = token.path[i]!
      let child = Reflect.get(parent, key)
      if (!isObjectLike(child)) {
        child = containerFor(token.path[i + 1]!)
        if (!Reflect.set(parent, key, child)) throw new TypeError('Cannot write signal path')
      }
      parent = child
    }
    if (!Reflect.set(parent, token.key, value)) throw new TypeError('Cannot write signal path')
    this.#notifyPath(token, previous, value)
  }

  updatePath(path: SignalPath, updater: (currentAtPath: unknown) => unknown): void {
    const token = this.resolvePath(path)
    let next: unknown
    try {
      next = updater(getAtPath(this.readCachedValue(), token.path))
    } catch {
      next = undefined
    }
    this.setPath(token, next)
  }

  mutatePath(path: SignalPath, mutator: (currentAtPath: unknown) => void): void {
    const token = this.resolvePath(path) as PathNode
    const value = getAtPath(this.readCachedValue(), token.path)
    try {
      mutator(value)
    } finally {
      this.#notifyPath(token, value, value)
    }
  }

  /** Snapshot only observed paths, never the array or an ancestor container. */
  mutateObservedPath<R>(path: SignalPath, mutate: () => R, currentAtPath = this.peekPath(path)): R {
    if (this.disposed) return mutate()
    const token = this.resolvePath(path) as PathNode
    const before = new Map<readonly PropertyKey[], unknown>()
    const collect = (node: PathNode): void => {
      if (node.exact !== undefined || node.descendants !== undefined)
        before.set(node.path, getAtPath(currentAtPath, node.path, token.path.length))
      for (const child of node.children.values()) collect(child)
    }
    collect(token)
    try {
      return mutate()
    } finally {
      const changed = (path: readonly PropertyKey[]): boolean => {
        // Descendant subscriptions observe in-place collection mutations as well.
        if (path.length <= token.path.length) return true
        return !Object.is(before.get(path), getAtPath(currentAtPath, path, token.path.length))
      }
      this.runtime.triggerDependencies(this.#affectedNodes(token, changed), {
        key: token.key,
        path: token.path,
        target: this,
        type: 'set',
        oldValue: before.get(token.path),
        newValue: currentAtPath,
      })
    }
  }

  /** Notify a native compiler write without re-evaluating its captured reference. */
  notifyPathMutation(path: SignalPath, oldValue: unknown, newValue: unknown): void {
    this.#notifyPath(this.resolvePath(path) as PathNode, oldValue, newValue)
  }

  triggerPath(path: SignalPath): void {
    const token = this.resolvePath(path) as PathNode
    const value = getAtPath(this.readCachedValue(), token.path)
    this.#notifyPath(token, value, value)
  }

  #notifyPath(token: PathNode, oldValue: unknown, newValue: unknown): void {
    if (!this.disposed)
      this.runtime.triggerDependencies(this.#affectedNodes(token), {
        key: token.key,
        newValue,
        oldValue,
        path: token.path,
        target: this,
        type: 'set',
      })
  }

  dispose(): void {
    if (this.disposed) return
    super.dispose()
    const release = (node: PathNode): void => {
      if (node.exact !== undefined) this.runtime.removeReactiveNode(node.exact)
      if (node.descendants !== undefined) this.runtime.removeReactiveNode(node.descendants)
      node.exact = node.descendants = undefined
      for (const child of node.children.values()) release(child)
      node.children.clear()
    }
    if (this.#pathRoot) release(this.#pathRoot)
    this.#parsedPaths?.clear()
    this.#pathNodeCount = 0
  }

  protected override notify(oldValue: T, newValue: T): void {
    this.runtime.triggerDependencies(
      this.#affectedNodes(
        this.#pathRoot,
        oldValue !== newValue ? path => pathValuesDiffer(oldValue, newValue, path) : undefined,
      ),
      {
        key: 'value',
        newValue,
        oldValue,
        path: [],
        target: this,
        type: 'set',
      },
    )
  }
  #affectedNodes(
    changed = this.#pathRoot,
    valueChanged?: (path: readonly PropertyKey[]) => boolean,
  ): ReactiveNodeId[] {
    const nodes = [this.node]
    if (!changed) return nodes
    const add = (token: PathNode, kind: 'exact' | 'descendants'): void => {
      const id = token[kind]
      if (id === undefined) return
      if (this.runtime.graph.subscriberCount(id) === 0) {
        this.runtime.removeReactiveNode(id)
        token[kind] = undefined
      } else if (valueChanged === undefined || valueChanged(token.path)) nodes.push(id)
    }
    const visit = (token: PathNode): void => {
      add(token, 'exact')
      add(token, 'descendants')
      for (const child of token.children.values()) visit(child)
    }
    visit(changed)
    for (let parent = changed.parent; parent; parent = parent.parent) add(parent, 'descendants')
    return nodes
  }
}
export const createSignal = <T>(
  runtime: ReactiveEffectRuntime,
  initial: T,
  options?: SignalOptions<T> | null,
): SignalHandle<T> => new SignalHandle(runtime, initial, options ?? {})
