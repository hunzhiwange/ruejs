import { installActionStateEnvironment, type ActionStateEnvironment } from './action-state'
import { formActionDescriptor } from './form-action'
import { dispatchComponentError, withComponentErrorScope } from './component-errors'
import { runTransitionPhase, type ActiveTransition } from './builtins/transition-phase'
import {
  setOwnerEffectBoundary,
  createOwner,
  disposeOwner,
  renderEffect as effect,
  getCurrentOwner,
  onOwnerCleanup,
  runWithOwner,
  signal,
  untrack,
  runOwnerLifecycle,
  runOwnerLifecycleTree,
  type CompiledOwner,
} from '../runtime-core/compiled'
import { createCompiledProps } from './props'
import {
  attributeName,
  booleanAttribute,
  htmlNamespace,
  ignoredProp,
  listMarker,
  marker,
  rawHTML,
  scalar,
  styleValue,
  svgNamespace,
  voidTags,
} from './node-plan'

type Props = Record<string, any>
export type ClaimPlan = (context: ClaimContext) => void
export type ClaimComponent = (props: Props) => ClaimPlan | Promise<ClaimPlan>
interface RootState {
  ready: Promise<void>
  track(promise: Promise<void>): void
  committed: boolean
  after: Array<() => void>
  pending: Promise<void>[]
  ends: WeakMap<Comment, Comment>
}
export interface ClaimContext {
  onElement?: (node: Element, props: Readonly<Record<string, unknown>>) => void
  parent: Node
  next: Node | null
  end: Node | null
  path: string
  claim: boolean
  root: RootState
}
export interface HydrateRootOptions {
  actionState?: ActionStateEnvironment
  props?: Props
  parentOwner?: CompiledOwner
  onMismatch?: (message: string, container: Element) => void
}
export interface RueRootHandle {
  ready: Promise<void>
  unmount(removeDOM?: boolean): void
}
export interface ClaimRootHandle extends RueRootHandle {
  readonly disposed: boolean
  readonly owner: CompiledOwner
  updateProps(props: Props): void
}
class HydrationMismatchError extends Error {}
const captureClaimError = (error: unknown, owner: CompiledOwner): boolean =>
  !(error instanceof HydrationMismatchError) &&
  dispatchComponentError(error, owner, 'component claim')
const installClaimErrors = (owner: CompiledOwner) =>
  setOwnerEffectBoundary(owner, run =>
    withComponentErrorScope(() => {
      try {
        run()
      } catch (error) {
        if (!captureClaimError(error, owner)) throw error
      }
    }),
  )
const mismatch = (context: ClaimContext, expected: string): never => {
  throw new HydrationMismatchError(
    `Rue hydration mismatch at ${context.path}: expected ${expected}, found ${context.next?.nodeName ?? 'end'}`,
  )
}
const insert = <T extends Node>(context: ClaimContext, node: T): T => {
  context.parent.insertBefore(node, context.end)
  return node
}
const take = (context: ClaimContext, kind: number, expected: string): Node => {
  const node = context.next
  if (!node || node === context.end || node.nodeType !== kind) return mismatch(context, expected)
  context.next = node.nextSibling
  return node
}
const claimMarker = (context: ClaimContext, id: string, end = false): Comment => {
  const data = marker(id, end)
  if (!context.claim) return insert(context, document.createComment(data))
  const node = take(context, 8, `<!--${data}-->`) as Comment
  if (node.data !== data) {
    context.next = node
    mismatch(context, `<!--${data}-->`)
  }
  return node
}
const finish = (context: ClaimContext) => {
  if (context.claim && context.next !== context.end)
    mismatch(context, 'end of compiled node sequence')
}
const scoped = (context: ClaimContext, id: string): ClaimContext => ({
  ...context,
  path: `${context.path}/${id}`,
})
const sync = (context: ClaimContext, child: ClaimContext) => {
  context.next = child.next
}
const submitActions = new WeakMap<Element, (data: FormData) => unknown>()
const bindProps = (
  node: Element,
  read: () => Props | null,
  onElement?: ClaimContext['onElement'],
) => {
  let previous: Props = Object.fromEntries(
    Array.from(node.attributes, attribute => [attribute.name, attribute.value]),
  )
  let initial = true
  const events = new Map<string, { name: string; listener: EventListener; capture: boolean }>()
  const owner = getCurrentOwner()!
  let previousRef: any
  const ref = (value: any, target: Element | null) => {
    if (typeof value === 'function') value(target)
    else if (value) value.current = target
  }
  effect(() => {
    const props = { ...read() }
    onElement?.(node, props)
    const actionValue = node.localName === 'form' ? props.action : props.formAction
    const action = formActionDescriptor(actionValue)
    if (node.localName === 'form') {
      if (typeof actionValue === 'function') {
        props.action = action?.action ?? ''
        props.method = action?.method ?? 'POST'
        props.encType = action?.encType ?? 'multipart/form-data'
      }
      const onSubmit = props.onSubmit
      props.onSubmit = (event: SubmitEvent) => {
        onSubmit?.(event)
        if (event.defaultPrevented) return
        const callback = (event.submitter && submitActions.get(event.submitter)) ?? actionValue
        if (typeof callback !== 'function') return
        event.preventDefault()
        const data = new FormData(node as HTMLFormElement, event.submitter)
        for (const name of Array.from(data.keys()))
          if (name.startsWith('$RUE_ACTION_')) data.delete(name)
        try {
          const result = callback(data)
          void Promise.resolve(result).catch(error => {
            if (!captureClaimError(error, owner)) throw error
          })
        } catch (error) {
          if (!captureClaimError(error, owner)) throw error
        }
      }
      for (const field of node.querySelectorAll(':scope > input[data-rue-action]')) field.remove()
      if (action) {
        const fields: Array<[string, string]> = [[action.name, '']]
        for (const [name, value] of action.data ?? []) {
          if (typeof value !== 'string')
            throw new Error('Rue progressive form fields must be strings')
          fields.push([name, value])
        }
        for (const [name, value] of fields.reverse()) {
          const field = document.createElement('input')
          field.type = 'hidden'
          field.name = name
          field.value = value
          field.setAttribute('data-rue-action', '')
          node.prepend(field)
        }
      }
    } else if (typeof actionValue === 'function') {
      submitActions.set(node, actionValue)
      props.formAction = action?.action ?? ''
      if (action)
        Object.assign(props, {
          formMethod: action.method ?? 'POST',
          formEncType: action.encType ?? 'multipart/form-data',
          name: action.name,
          value: '',
        })
    } else submitActions.delete(node)
    for (const key of new Set([...Object.keys(previous), ...Object.keys(props)])) {
      const value = props[key]
      if (/^on[:A-Z]/.test(key)) {
        const capture = key.endsWith('Capture')
        const event = (key.startsWith('on:') ? key.slice(3) : key.slice(2))
          .replace(/Capture$/, '')
          .toLowerCase()
        const old = events.get(key)
        if (old) node.removeEventListener(old.name, old.listener, old.capture)
        events.delete(key)
        if (value) {
          const listener: EventListener = event =>
            withComponentErrorScope(() => {
              try {
                const result = runWithOwner(owner, () =>
                  typeof value === 'function' ? value.call(node, event) : value.handleEvent(event),
                )
                if (result && typeof result.then === 'function') {
                  void Promise.resolve(result).catch(error =>
                    withComponentErrorScope(() => {
                      if (!captureClaimError(error, owner)) throw error
                    }),
                  )
                }
              } catch (error) {
                if (!captureClaimError(error, owner)) throw error
              }
            })
          node.addEventListener(event, listener, capture)
          events.set(key, { name: event, listener, capture })
        }
        continue
      }
      if (ignoredProp(key)) continue
      const name = attributeName(key)
      const preserveInput =
        initial &&
        (key === 'value' || key === 'checked') &&
        (booleanAttribute(name)
          ? node.hasAttribute(name) === !!value
          : node.getAttribute(name) === String(value ?? ''))
      if (value == null || (booleanAttribute(name) && !value)) node.removeAttribute(name)
      else if (name.startsWith('xlink:'))
        node.setAttributeNS('http://www.w3.org/1999/xlink', name, String(value))
      else
        node.setAttribute(
          name,
          booleanAttribute(name) ? '' : key === 'style' ? styleValue(value) : String(value),
        )
      if (!preserveInput && (key === 'value' || key === 'checked' || key === 'selected'))
        (node as any)[key] = value ?? (key === 'value' ? '' : false)
    }
    if (props.ref !== previousRef) {
      ref(previousRef, null)
      previousRef = props.ref
      ref(previousRef, node)
    }
    const html = rawHTML(props)
    if (html != null && node.innerHTML !== String(html)) node.innerHTML = String(html)
    previous = { ...props }
    initial = false
  })
  onOwnerCleanup(() => {
    submitActions.delete(node)
    for (const { name, listener, capture } of events.values())
      node.removeEventListener(name, listener, capture)
    ref(previousRef, null)
  })
}
export const _$claimElement = (
  context: ClaimContext,
  id: string,
  tag: string,
  read: () => Props | null,
  children: ClaimPlan,
) => {
  const current = scoped(context, id)
  claimMarker(current, `e:${id}`)
  const parent = current.parent as Element
  const ns =
    tag === 'svg' || (parent.namespaceURI === svgNamespace && parent.localName !== 'foreignObject')
      ? svgNamespace
      : htmlNamespace
  const node = current.claim
    ? (take(current, 1, `<${tag}>`) as Element)
    : insert(current, document.createElementNS(ns, tag))
  if (node.localName !== tag || node.namespaceURI !== ns) {
    current.next = node
    mismatch(current, `<${tag}> in ${ns}`)
  }
  const child: ClaimContext = { ...current, parent: node, next: node.firstChild, end: null }
  const props = untrack(read) ?? {}
  if (tag === 'form' && current.claim && formActionDescriptor(props.action)) {
    while (child.next?.nodeType === 1 && (child.next as Element).matches('input[data-rue-action]'))
      child.next = child.next.nextSibling
  }
  if (
    !voidTags.has(tag) &&
    !(tag === 'textarea' && (props.value != null || props.defaultValue != null)) &&
    rawHTML(props) == null
  ) {
    children(child)
    finish(child)
  }
  bindProps(node, read, current.onElement)
  sync(context, current)
}
export const _$claimText = (context: ClaimContext, id: string, read: () => unknown) => {
  const current = scoped(context, id)
  claimMarker(current, `t:${id}`)
  // HTML parsing omits zero-length text nodes; the marker pair declares this exact slot.
  const text =
    current.claim && current.next?.nodeType === 3
      ? (take(current, 3, 'text') as Text)
      : current.claim &&
          current.next?.nodeType === 8 &&
          (current.next as Comment).data === marker(`t:${id}`, true)
        ? current.parent.insertBefore(document.createTextNode(''), current.next)
        : !current.claim
          ? insert(current, document.createTextNode(''))
          : mismatch(current, 'text slot')
  claimMarker(current, `t:${id}`, true)
  effect(() => {
    text.data = scalar(read())
  })
  sync(context, current)
}
export const _$claimRawText = (context: ClaimContext, id: string, read: () => unknown[]) => {
  if (
    context.claim &&
    (context.parent.childNodes.length > 1 || (context.next && context.next.nodeType !== 3))
  )
    mismatch(scoped(context, id), 'raw text')
  context.next = context.end
  effect(() => {
    const text = read().map(scalar).join('')
    if (context.parent.textContent !== text) context.parent.textContent = text
  })
}
interface Range {
  start: Comment
  end: Comment
  context: ClaimContext
}
const openRange = (context: ClaimContext, id: string): Range => {
  const current = scoped(context, id)
  const label = `b:${id}`
  const start = claimMarker(current, label)
  let end: Comment
  if (current.claim) {
    const cached = current.root.ends.get(start)
    if (cached) end = cached
    else {
      // One sibling scan records every nested range pair. Nested claims then use O(1) lookups.
      const stack: Comment[] = [start]
      let node = current.next
      while (node && node !== current.end && stack.length) {
        if (node.nodeType === 8) {
          const comment = node as Comment
          if (comment.data.startsWith('r:b:')) stack.push(comment)
          else if (comment.data.startsWith('/r:b:')) {
            const opening = stack.pop()!
            if (comment.data !== '/' + opening.data) {
              current.next = comment
              mismatch(current, `<!--/${opening.data}-->`)
            }
            current.root.ends.set(opening, comment)
          }
        }
        if (stack.length) node = node.nextSibling
      }
      if (stack.length || !node) mismatch(current, `<!--${marker(label, true)}-->`)
      end = node as Comment
    }
    context.next = end.nextSibling
  } else end = insert(current, document.createComment(marker(label, true)))
  return { start, end, context: { ...current, next: start.nextSibling, end } }
}
const removeRange = (range: Range, inclusive = true) => {
  let node: Node | null = inclusive ? range.start : range.start.nextSibling
  const stop = inclusive ? range.end.nextSibling : range.end
  while (node && node !== stop) {
    const next: Node | null = node.nextSibling
    node.parentNode?.removeChild(node)
    node = next
  }
}
const own = (parent: CompiledOwner | undefined, run: () => void) => {
  const owner = parent === undefined ? createOwner() : runWithOwner(parent, createOwner)!
  try {
    runWithOwner(owner, run)
  } catch (error) {
    disposeOwner(owner)
    throw error
  }
  return owner
}
export const _$claimRange = (
  context: ClaimContext,
  id: string,
  read: () => unknown,
  yes: ClaimPlan,
  no: ClaimPlan,
) => {
  const range = openRange(context, id)
  const parent = getCurrentOwner()
  let owner: CompiledOwner | undefined
  let previous: boolean | undefined
  effect(() => {
    const value = !!read()
    if (previous === value) return
    if (owner) {
      disposeOwner(owner)
      removeRange(range, false)
    }
    const child = {
      ...range.context,
      parent: range.start.parentNode!,
      claim: previous === undefined && context.claim,
      next: range.start.nextSibling,
    }
    owner = own(parent, () =>
      untrack(() => {
        ;(value ? yes : no)(child)
        finish(child)
      }),
    )
    previous = value
  })
  onOwnerCleanup(() => {
    if (owner) disposeOwner(owner)
  })
}
export const _$claimList = <T>(
  context: ClaimContext,
  id: string,
  read: () => readonly T[],
  row: (read: () => T, index: () => number) => ClaimPlan,
  key: ((value: T, index: number) => unknown) | null,
) => {
  const range = openRange(context, id)
  const parent = getCurrentOwner()
  type Entry = {
    range: Range
    owner: CompiledOwner
    value: ReturnType<typeof signal<T>>
    index: ReturnType<typeof signal<number>>
  }
  let entries = new Map<unknown, Entry>()
  let initial = true
  effect(() => {
    const values = read()
    const keys = values.map((value, index) => (key ? key(value, index) : index))
    if (new Set(keys).size !== keys.length)
      throw new Error(`Rue duplicate list key at ${range.context.path}`)
    untrack(() => {
      const next = new Map<unknown, Entry>()
      const created: Entry[] = []
      const updates: Array<() => void> = []
      const staging = document.createDocumentFragment()
      const listContext = {
        ...range.context,
        parent: initial ? range.start.parentNode! : staging,
        end: initial ? range.end : null,
        next: initial ? range.start.nextSibling : null,
        claim: initial && context.claim,
      }
      try {
        values.forEach((value, index) => {
          const identity = keys[index]
          let entry = entries.get(identity)
          if (entry) {
            const existing = entry
            updates.push(() => {
              existing.value.set(value)
              existing.index.set(index)
            })
          } else {
            const item = openRange(listContext, listMarker(identity))
            item.context.path = `${range.context.path}/${index}`
            let valueSignal!: ReturnType<typeof signal<T>>
            let indexSignal!: ReturnType<typeof signal<number>>
            const owner = own(parent, () => {
              valueSignal = signal(value)
              indexSignal = signal(index)
              row(
                () => valueSignal.get(),
                () => indexSignal.get(),
              )(item.context)
              finish(item.context)
            })
            entry = { range: item, owner, value: valueSignal, index: indexSignal }
            created.push(entry)
          }
          next.set(identity, entry)
        })
        if (initial) finish(listContext)
      } catch (error) {
        for (const entry of created) {
          disposeOwner(entry.owner)
          if (!initial) removeRange(entry.range)
        }
        throw error
      }
      for (const update of updates) update()
      for (const [key, entry] of entries)
        if (!next.has(key)) {
          disposeOwner(entry.owner)
          removeRange(entry.range)
        }
      if (!initial)
        for (const entry of next.values()) {
          let node: Node | null = entry.range.start
          while (node) {
            const next: Node | null = node.nextSibling
            range.end.parentNode!.insertBefore(node, range.end)
            if (node === entry.range.end) break
            node = next
          }
        }
      entries = next
      initial = false
    })
  })
  onOwnerCleanup(() => {
    for (const entry of entries.values()) disposeOwner(entry.owner)
  })
}
export const _$claimComponent = (
  context: ClaimContext,
  id: string,
  component: ClaimComponent,
  read: () => Props | null,
  children: ClaimPlan | null,
) => {
  const range = openRange(context, id)
  own(getCurrentOwner(), () => {
    const props = createCompiledProps({ ...untrack(read), ...(children ? { children } : {}) })
    onOwnerCleanup(props.dispose)
    const owner = getCurrentOwner()!
    let disposed = false
    onOwnerCleanup(() => {
      disposed = true
    })
    installClaimErrors(owner)
    const capture = (error: unknown) => {
      if (!withComponentErrorScope(() => captureClaimError(error, owner))) throw error
      range.context.next = range.context.end
    }
    let plan: ClaimPlan | Promise<ClaimPlan>
    try {
      plan = component(props.props)
    } catch (error) {
      capture(error)
      return
    }
    const execute = (plan: ClaimPlan) => {
      if (!disposed)
        runWithOwner(owner, () => {
          runOwnerLifecycle(owner, 'beforeMount')
          try {
            plan(range.context)
            finish(range.context)
          } catch (error) {
            capture(error)
          }
          runOwnerLifecycle(owner, 'mounted')
        })
    }
    if (typeof plan === 'function') execute(plan)
    else context.root.track(Promise.resolve(plan).then(execute).catch(capture))
    effect(() => props.update({ ...read(), ...(children ? { children } : {}) }))
  })
}
export const _$claimSlot = (
  context: ClaimContext,
  id: string,
  read: () => ClaimPlan | null | undefined,
) => {
  const range = openRange(context, id)
  const parent = getCurrentOwner()
  let owner: CompiledOwner | undefined
  let previous: ClaimPlan | null | undefined
  let initial = true
  effect(() => {
    const plan = read()
    if (!initial && plan === previous) return
    if (owner !== undefined) disposeOwner(owner)
    if (!initial) removeRange(range, false)
    const child = {
      ...range.context,
      parent: range.start.parentNode!,
      next: range.start.nextSibling,
      claim: initial && context.claim,
    }
    owner = own(parent, () =>
      untrack(() => {
        plan?.(child)
        finish(child)
      }),
    )
    previous = plan
    initial = false
  })
  onOwnerCleanup(() => {
    if (owner !== undefined) disposeOwner(owner)
  })
}
interface OwnedRange {
  range: Range
  owner: CompiledOwner
}
const mountContent = (outer: Range, plan: ClaimPlan, initial: boolean): OwnedRange => {
  const context = {
    ...outer.context,
    parent: outer.start.parentNode!,
    next: outer.start.nextSibling,
    claim: initial && outer.context.claim,
  }
  const range = openRange(context, 'content')
  const owner = own(getCurrentOwner(), () => {
    plan(range.context)
    finish(range.context)
  })
  if (initial) finish(context)
  return { range, owner }
}
const disposeContent = (content: OwnedRange) => {
  disposeOwner(content.owner)
  removeRange(content.range)
}
const moveContent = (content: OwnedRange, parent: Node, before: Node | null) => {
  let node: Node | null = content.range.start
  while (node) {
    const next: Node | null = node.nextSibling
    parent.insertBefore(node, before)
    if (node === content.range.end) break
    node = next
  }
}
const firstElement = (content: OwnedRange): HTMLElement | undefined => {
  let node: Node | null = content.range.start.nextSibling
  while (node && node !== content.range.end) {
    if (node.nodeType === 1) return node as HTMLElement
    node = node.nextSibling
  }
  return undefined
}
export const _$claimTransition = (
  context: ClaimContext,
  id: string,
  read: () => Props,
  children: ClaimPlan,
  choose?: () => unknown,
  alternate?: ClaimPlan,
) => {
  const outer = openRange(context, id)
  let current: OwnedRange | undefined
  let previous: unknown = Symbol()
  let phase: ActiveTransition | undefined
  let generation = 0
  const leaving = new Set<OwnedRange>()
  const owner = getCurrentOwner()!
  effect(() => {
    const props = read() ?? {}
    const selection = choose ? !!choose() : true
    const key = props.childKey ?? selection
    if (Object.is(previous, key)) return
    const initial = !current
    previous = key
    const token = ++generation
    phase?.cancel()
    const old = current
    const enter = () => {
      if (token !== generation) return
      runWithOwner(owner, () => {
        current = mountContent(outer, selection ? children : alternate!, initial)
        const element = firstElement(current)
        if (element && (!initial || props.appear))
          phase = runTransitionPhase(element, props, initial ? 'appear' : 'enter', () => {})
      })
    }
    const leave = (done: () => void) => {
      if (!old) {
        done()
        return
      }
      leaving.add(old)
      const element = firstElement(old)
      const finish = () => {
        if (leaving.delete(old)) disposeContent(old)
        done()
      }
      if (element) phase = runTransitionPhase(element, props, 'leave', finish)
      else finish()
    }
    untrack(() => {
      if (old && props.mode === 'out-in') leave(enter)
      else {
        enter()
        if (old) leave(() => {})
      }
    })
  })
  onOwnerCleanup(() => {
    generation++
    phase?.cancel()
    if (current) disposeOwner(current.owner)
    for (const content of leaving) disposeContent(content)
    leaving.clear()
  })
}
const matchesCache = (pattern: unknown, name: string | undefined): boolean => {
  if (pattern == null) return true
  if (name == null) return false
  if (Array.isArray(pattern)) return pattern.some(p => matchesCache(p, name))
  if (pattern instanceof RegExp) {
    pattern.lastIndex = 0
    return pattern.test(name)
  }
  return String(pattern)
    .split(',')
    .map(s => s.trim())
    .includes(name)
}
export const _$claimKeepAlive = (
  context: ClaimContext,
  id: string,
  read: () => Props,
  children: ClaimPlan,
  choose?: () => unknown,
  alternate?: ClaimPlan,
) => {
  const outer = openRange(context, id)
  const parking = document.createDocumentFragment()
  const cache = new Map<unknown, OwnedRange>()
  let active: OwnedRange | undefined
  let previous: unknown = Symbol()
  effect(() => {
    const props = read() ?? {},
      selected = choose ? !!choose() : true
    const key = props.cacheKey ?? selected
    const cacheable =
      matchesCache(props.include, props.cacheName) &&
      (props.exclude == null || !matchesCache(props.exclude, props.cacheName)) &&
      Number(props.max ?? Infinity) > 0
    untrack(() => {
      if (!Object.is(key, previous)) {
        const initial = !active
        if (active) {
          runOwnerLifecycleTree(active.owner, 'deactivated')
          if (cache.has(previous)) moveContent(active, parking, null)
          else disposeContent(active)
        }
        active = cache.get(key)
        if (active) moveContent(active, outer.end.parentNode!, outer.end)
        else active = mountContent(outer, selected ? children : alternate!, initial)
        previous = key
        runOwnerLifecycleTree(active.owner, 'activated')
      }
      cache.delete(key)
      if (active && cacheable) cache.set(key, active)
      while (cache.size > Math.max(0, Number(props.max ?? Infinity))) {
        const oldest = cache.keys().next().value,
          content = cache.get(oldest)!
        cache.delete(oldest)
        if (content !== active) disposeContent(content)
      }
    })
  })
  onOwnerCleanup(() => {
    if (active) {
      runOwnerLifecycleTree(active.owner, 'deactivated')
      disposeOwner(active.owner)
    }
    for (const content of cache.values()) {
      disposeOwner(content.owner)
      if (content !== active) removeRange(content.range)
    }
    cache.clear()
  })
}
export const _$claimSuspense = (
  context: ClaimContext,
  id: string,
  read: () => Props,
  children: ClaimPlan,
) => {
  const outer = openRange(context, id)
  const props = read() ?? {}
  const before = context.root.pending.length
  const content = mountContent(outer, children, true)
  let disposed = false
  onOwnerCleanup(() => {
    disposed = true
    disposeOwner(content.owner)
  })
  const pending = context.root.pending.slice(before)
  if (pending.length) {
    props.onPending?.()
    const settled = Promise.all(pending).then(
      () => {
        if (!disposed) props.onResolve?.()
      },
      error => {
        if (!disposed) props.onReject?.(error)
        throw error
      },
    )
    context.root.track(settled)
  } else props.onResolve?.()
}
export const _$claimTransitionGroup = (
  context: ClaimContext,
  id: string,
  read: () => Props,
  children: ClaimPlan,
) => {
  const props = read() ?? {}
  let scope: Node
  let boundary: Range | undefined
  if (props.tag)
    _$claimElement(
      context,
      id,
      props.tag,
      () => ({}),
      child => {
        scope = child.parent
        children(child)
      },
    )
  else {
    boundary = openRange(context, id)
    scope = boundary.context.parent
    children(boundary.context)
    finish(boundary.context)
  }
  const snapshots = new Set<Element>()
  const phases = new Set<ActiveTransition>()
  const elements = () => {
    const result: HTMLElement[] = []
    let node = boundary ? boundary.start.nextSibling : scope.firstChild
    while (node && node !== boundary?.end) {
      if (node.nodeType === 1 && !snapshots.has(node as Element)) result.push(node as HTMLElement)
      node = node.nextSibling
    }
    return result
  }
  let previous = new Set(elements())
  const observer = new MutationObserver(() => {
    const props = read() ?? {}
    const current = new Set(elements())
    for (const element of current)
      if (!previous.has(element)) phases.add(runTransitionPhase(element, props, 'enter', () => {}))
    for (const element of previous)
      if (!current.has(element)) {
        const snapshot = element.cloneNode(true) as HTMLElement
        snapshots.add(snapshot)
        scope.insertBefore(snapshot, boundary?.end ?? null)
        phases.add(
          runTransitionPhase(snapshot, props, 'leave', () => {
            snapshots.delete(snapshot)
            snapshot.remove()
          }),
        )
      }
    previous = current
  })
  observer.observe(scope!, { childList: true })
  onOwnerCleanup(() => {
    observer.disconnect()
    for (const phase of phases) phase.cancel()
    for (const snapshot of snapshots) snapshot.remove()
    phases.clear()
    snapshots.clear()
  })
}
export const _$claimTeleport = (
  context: ClaimContext,
  id: string,
  read: () => Props,
  children: ClaimPlan,
) => {
  const outer = openRange(context, id)
  const content = mountContent(outer, children, true)
  const owner = getCurrentOwner()!
  let disposed = false
  const move = () => {
    const props = read() ?? {}
    const target = props.disabled
      ? outer.end.parentNode
      : typeof props.to === 'string'
        ? document.querySelector(props.to)
        : props.to
    if (!target) throw new Error(`Rue teleport target missing at ${outer.context.path}`)
    moveContent(content, target, props.disabled ? outer.end : null)
  }
  const activate = () => {
    if (!disposed) runWithOwner(owner, () => effect(move))
  }
  if (context.claim && !context.root.committed) context.root.after.push(activate)
  else activate()
  onOwnerCleanup(() => {
    disposed = true
    disposeOwner(content.owner)
    if (context.root.committed) removeRange(content.range)
  })
}
/** Root entry accepts exactly a compiled component factory. Setup runs inside its owner. */
export const hydrateRoot = (
  container: Element,
  component: ClaimComponent,
  options: HydrateRootOptions = {},
): ClaimRootHandle => startRoot(container, component, options, true)

export const mountClaimRoot = (
  container: Element,
  component: ClaimComponent,
  options: HydrateRootOptions = {},
): ClaimRootHandle => startRoot(container, component, options, false)

export const hydrateRange = (
  start: Comment,
  end: Comment,
  component: ClaimComponent,
  options: HydrateRootOptions = {},
): ClaimRootHandle => {
  if (!start.parentElement || start.parentNode !== end.parentNode)
    throw new Error('Rue hydration range must have one element parent')
  return startRoot(start.parentElement, component, options, true, { start, end })
}

/** Claims a server-only slot without interpreting its values or rebuilding interactive components. */
const hasSameServerNodeShape = (actual: Node, expected: Node): boolean => {
  if (actual.nodeType !== expected.nodeType) return false
  if (actual.nodeType === 1)
    return (
      (actual as Element).localName === (expected as Element).localName &&
      (actual as Element).namespaceURI === (expected as Element).namespaceURI
    )
  return actual.nodeValue === expected.nodeValue
}

export const claimServerHTML =
  (html: string): ClaimPlan =>
  context => {
    const template = document.createElement('template')
    template.innerHTML = html
    for (const expected of Array.from(template.content.childNodes)) {
      if (!context.claim) insert(context, expected)
      else {
        const actual = context.next
        if (!actual || actual === context.end || !hasSameServerNodeShape(actual, expected))
          mismatch(context, 'compiled server slot')
        context.next = actual!.nextSibling
      }
    }
    finish(context)
  }

const startRoot = (
  container: Element,
  component: ClaimComponent,
  options: HydrateRootOptions,
  claim: boolean,
  bounds?: { start: Comment; end: Comment },
): ClaimRootHandle => {
  const owner =
    options.parentOwner === undefined
      ? createOwner()
      : runWithOwner(options.parentOwner, createOwner)!
  installClaimErrors(owner)
  if (options.actionState) installActionStateEnvironment(owner, options.actionState)
  const props = createCompiledProps(options.props ?? {})
  const root: RootState = {
    ready: Promise.resolve(),
    track: () => {},
    committed: false,
    after: [],
    pending: [],
    ends: new WeakMap(),
  }
  const context: ClaimContext = {
    parent: container,
    next: bounds ? bounds.start.nextSibling : container.firstChild,
    end: bounds?.end ?? null,
    path: 'root',
    claim,
    root,
  }
  let disposed = false
  runWithOwner(owner, () =>
    onOwnerCleanup(() => {
      disposed = true
      props.dispose()
    }),
  )
  const execute = (plan: ClaimPlan) => {
    if (disposed) return
    runWithOwner(owner, () => {
      runOwnerLifecycle(owner, 'beforeMount')
      plan(context)
      finish(context)
    })
  }
  const commit = () => {
    if (disposed) return
    root.committed = true
    runWithOwner(owner, () => {
      for (const run of root.after.splice(0)) run()
      runOwnerLifecycle(owner, 'mounted')
    })
  }
  const fail = (error: unknown): void => {
    const captured = withComponentErrorScope(() => captureClaimError(error, owner))
    disposed = true
    disposeOwner(owner)
    if (captured) return
    options.onMismatch?.(String(error), container)
    throw error
  }
  root.track = promise => {
    if (!root.committed) root.pending.push(promise)
    else
      root.ready = Promise.all([root.ready, promise])
        .then(() => undefined)
        .catch(fail)
    // Errors remain observable through ready/onMismatch even before a consumer awaits ready.
    void promise.catch(() => {})
    void root.ready.catch(() => {})
  }
  try {
    const plan = runWithOwner(owner, () => component(props.props))!
    if (typeof plan === 'function') execute(plan)
    else root.track(Promise.resolve(plan).then(execute))
    if (root.pending.length) {
      root.ready = (async () => {
        let offset = 0
        while (offset < root.pending.length) {
          const pending = root.pending.slice(offset)
          offset = root.pending.length
          await Promise.all(pending)
        }
        root.pending.length = 0
        commit()
      })().catch(fail)
      void root.ready.catch(() => {})
    } else {
      commit()
    }
  } catch (error) {
    fail(error)
  }
  return {
    get disposed() {
      return disposed
    },
    owner,
    get ready() {
      return root.ready
    },
    updateProps(nextProps) {
      if (disposed) throw new Error('Rue cannot update an unmounted root')
      runWithOwner(owner, () => props.update(nextProps))
    },
    unmount(removeDOM = true) {
      if (disposed) return
      disposed = true
      disposeOwner(owner)
      if (removeDOM) {
        if (bounds) {
          let node = bounds.start.nextSibling
          while (node && node !== bounds.end) {
            const next = node.nextSibling
            node.remove()
            node = next
          }
        } else container.replaceChildren()
      }
    },
  }
}

export const _$claimIgnoreLifecycle = (..._args: unknown[]): void => {}

/** Explicit document error UI. This is never invoked as a hydration mismatch recovery. */
export async function mountDocumentRoot(
  component: ClaimComponent,
  options: HydrateRootOptions & { signal?: AbortSignal } = {},
): Promise<ClaimRootHandle> {
  const stage = document.createElement('div')
  const root = mountClaimRoot(stage, component, options)
  try {
    await root.ready
    if (options.signal?.aborted) {
      root.unmount()
      return root
    }
    const html = stage.querySelector(':scope > html')
    if (!html || stage.children.length !== 1)
      throw new Error('Rue document factory must emit one html element')
    document.replaceChild(html, document.documentElement)
    return root
  } catch (error) {
    root.unmount()
    throw error
  }
}
