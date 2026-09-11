import { installActionStateEnvironment, type ActionStateEnvironment } from './action-state'
import { formActionDescriptor } from './form-action'
import {
  createOwner,
  getCurrentOwner,
  onOwnerCleanup,
  disposeOwner,
  runWithOwner,
  type CompiledOwner,
} from '../runtime-core/compiled'
import {
  attributeName,
  booleanAttribute,
  escapeAttribute,
  escapeText,
  ignoredProp,
  listMarker,
  marker,
  rawHTML,
  scalar,
  styleValue,
  voidTags,
} from './node-plan'

export const _$writeIgnoreLifecycle = (..._args: unknown[]): void => {}
const prefetches = new Map<CompiledOwner, Array<() => unknown>>()
export const _$writePrefetch = (callback: () => unknown): void => {
  const owner = getCurrentOwner()
  if (owner === undefined) throw new Error('Rue server prefetch requires a component owner')
  if (!prefetches.has(owner)) {
    prefetches.set(owner, [])
    onOwnerCleanup(() => prefetches.delete(owner))
  }
  prefetches.get(owner)!.push(callback)
}
const prefetch = async (owner: CompiledOwner) => {
  const pending = prefetches.get(owner) ?? []
  await Promise.all(pending.map(callback => runWithOwner(owner, callback)))
}

export interface Writer {
  serverIsland?: (id: string, props: Props, fallback: string) => string | Promise<string>
  actionState?: ActionStateEnvironment
  onElement?: (tag: string, props: Readonly<Record<string, unknown>>) => void
  chunks: { push(...chunks: string[]): number }
  retainOwners?: boolean
  transient?: boolean
  stream?: {
    snapshot: string[]
    pending: Promise<void>[]
    nextId: number
    output(html: string): void
    nonce?: string
    onError?: (error: unknown) => unknown
  }
  owner: CompiledOwner
  path?: string
  tag?: string
  clientReference?: ClientReferenceWriter
}
export type ServerPlan = (writer: Writer) => void | Promise<void>
export type ServerComponent<P = any> = (props: P) => ServerPlan | Promise<ServerPlan>
type Props = Record<string, any>
export type ClientReferenceWriter = (
  writer: Writer,
  referenceKey: string,
  exportName: string,
  props: Props,
) => Promise<void>
/** A bundler-created client import is callable only by a compiled server plan. */
export const createCompiledClientReference =
  (referenceKey: string, exportName: string): ServerComponent =>
  props =>
  writer => {
    if (!writer.clientReference) throw new Error('Rue client reference requires an RSC writer')
    return writer.clientReference(writer, referenceKey, exportName, props)
  }
export interface RenderToStringOptions {
  serverIsland?: Writer['serverIsland']
  actionState?: ActionStateEnvironment
  props?: Props
  nonce?: string
  onError?: (error: unknown) => unknown
  clientReference?: ClientReferenceWriter
}
const comment = (writer: Writer, id: string, end = false) => {
  writer.chunks.push(`<!--${marker(id, end)}-->`)
}
const range = async (writer: Writer, id: string, plan: ServerPlan) => {
  comment(writer, `b:${id}`)
  await plan({ ...writer, path: `${writer.path ?? ''}/${id}` })
  comment(writer, `b:${id}`, true)
}
export const _$writeElement = async (
  writer: Writer,
  id: string,
  tag: string,
  read: () => Props | null,
  children: ServerPlan,
) => {
  const props = { ...runWithOwner(writer.owner, read) }
  writer.onElement?.(tag, props)
  const action = formActionDescriptor(tag === 'form' ? props.action : props.formAction)
  if (action) {
    if (tag === 'form')
      Object.assign(props, {
        action: action.action ?? '',
        method: action.method ?? 'POST',
        encType: action.encType ?? 'multipart/form-data',
      })
    else
      Object.assign(props, {
        formAction: action.action ?? '',
        formMethod: action.method ?? 'POST',
        formEncType: action.encType ?? 'multipart/form-data',
        name: action.name,
        value: '',
      })
  }
  comment(writer, `e:${id}`)
  writer.chunks.push(`<${tag}`)
  for (const [key, value] of Object.entries(props)) {
    if (
      ignoredProp(key) ||
      ((key === 'action' || key === 'formAction') && typeof value === 'function')
    )
      continue
    const name = attributeName(key)
    if (!/^[^\s"'<>/=]+$/.test(name)) throw new Error(`Rue invalid attribute ${name} at node ${id}`)
    if (booleanAttribute(name)) {
      if (value) writer.chunks.push(` ${name}`)
      continue
    }
    if (value == null) continue
    writer.chunks.push(
      ` ${name}="${escapeAttribute(key === 'style' ? styleValue(value) : String(value))}"`,
    )
  }
  writer.chunks.push('>')
  if (voidTags.has(tag)) return
  if (action && tag === 'form') {
    writer.chunks.push(
      `<input type="hidden" data-rue-action="" name="${escapeAttribute(action.name)}" value="">`,
    )
    for (const [name, value] of action.data ?? []) {
      if (typeof value !== 'string') throw new Error('Rue progressive form fields must be strings')
      writer.chunks.push(
        `<input type="hidden" data-rue-action="" name="${escapeAttribute(name)}" value="${escapeAttribute(value)}">`,
      )
    }
  }
  const raw = rawHTML(props)
  if (raw != null) writer.chunks.push(String(raw))
  else if (tag === 'textarea' && (props.value != null || props.defaultValue != null))
    writer.chunks.push(escapeText(scalar(props.value ?? props.defaultValue)))
  else await children({ ...writer, tag })
  writer.chunks.push(`</${tag}>`)
}
export const _$writeText = async (writer: Writer, id: string, read: () => unknown) => {
  comment(writer, `t:${id}`)
  writer.chunks.push(escapeText(scalar(runWithOwner(writer.owner, read))))
  comment(writer, `t:${id}`, true)
}
export const _$writeRawText = async (writer: Writer, id: string, read: () => unknown[]) => {
  const text = runWithOwner(writer.owner, read)!.map(scalar).join('')
  if (writer.tag === 'script' || writer.tag === 'style') {
    if (new RegExp(`</${writer.tag}`, 'i').test(text))
      throw new Error(`Rue unsafe raw text at node ${id}`)
    writer.chunks.push(text)
  } else writer.chunks.push(escapeText(text))
}
export const _$writeRange = async (
  writer: Writer,
  id: string,
  read: () => unknown,
  yes: ServerPlan,
  no: ServerPlan,
) => range(writer, id, runWithOwner(writer.owner, read) ? yes : no)
export const _$writeList = async <T>(
  writer: Writer,
  id: string,
  read: () => readonly T[],
  row: (read: () => T, index: () => number) => ServerPlan,
  key: ((value: T, index: number) => unknown) | null,
) =>
  range(writer, id, async writer => {
    const values = runWithOwner(writer.owner, read)!
    const keys = new Set<unknown>()
    for (let index = 0; index < values.length; index++) {
      const value = values[index]
      const identity = key ? runWithOwner(writer.owner, () => key(value, index)) : index
      if (keys.has(identity)) throw new Error(`Rue duplicate list key at node ${id}/${index}`)
      keys.add(identity)
      await range(
        writer,
        listMarker(identity),
        row(
          () => value,
          () => index,
        ),
      )
    }
  })
export const _$writeComponent = async (
  writer: Writer,
  id: string,
  component: ServerComponent,
  read: () => Props | null,
  children: ServerPlan | null,
) =>
  range(writer, id, async writer => {
    const owner = runWithOwner(writer.owner, createOwner)!
    if (writer.actionState) installActionStateEnvironment(owner, writer.actionState)
    try {
      const rendered = await runWithOwner(owner, () =>
        component({ ...read(), ...(children ? { children } : {}) }),
      )!
      await prefetch(owner)
      const plan: ServerPlan = rendered == null ? () => {} : rendered
      if (typeof plan !== 'function') {
        throw new TypeError(
          `Rue server component ${component.name || '<anonymous>'} returned ${typeof rendered} instead of a render plan`,
        )
      }
      await runWithOwner(owner, () => plan({ ...writer, owner }))
    } finally {
      if (!writer.retainOwners) disposeOwner(owner)
    }
  })
export const _$writeSlot = async (
  writer: Writer,
  id: string,
  read: () => ServerPlan | null | undefined,
) =>
  range(writer, id, async writer => {
    const plan = runWithOwner(writer.owner, read)
    if (plan) await plan(writer)
  })
export const _$writeTransition = async (
  writer: Writer,
  id: string,
  _read: () => Props,
  children: ServerPlan,
  choose?: () => unknown,
  alternate?: ServerPlan,
) =>
  range(writer, id, writer =>
    range(writer, 'content', choose && !runWithOwner(writer.owner, choose) ? alternate! : children),
  )
export const _$writeKeepAlive = _$writeTransition
export const _$writeSuspense = async (
  writer: Writer,
  id: string,
  read: () => Props,
  children: ServerPlan,
) =>
  range(writer, id, writer =>
    range(writer, 'content', async writer => {
      if (!writer.stream) {
        await children(writer)
        return
      }
      const state = writer.stream
      const index = state.snapshot.length
      state.snapshot.push('')
      const content: string[] = []
      const pending = Promise.resolve().then(() =>
        children({ ...writer, chunks: content, stream: undefined }),
      )
      void pending.catch(() => {})
      const boundary = String(state.nextId++)
      state.output(`<!--r:s:${boundary}-->`)
      const fallback = runWithOwner(writer.owner, read)?.fallback as ServerPlan | undefined
      if (fallback)
        await fallback({
          ...writer,
          stream: undefined,
          transient: true,
          chunks: {
            push(...pieces) {
              state.output(pieces.join(''))
              return pieces.length
            },
          },
        })
      state.output(`<!--/r:s:${boundary}-->`)
      const done = pending.then(
        () => {
          state.snapshot[index] = content.join('')
          const nonce = state.nonce ? ` nonce="${escapeAttribute(state.nonce)}"` : ''
          state.output(
            `<template data-rue-resume="${boundary}">${content.join('')}</template><script${nonce}>(()=>{const s=document.currentScript,t=s.previousElementSibling,w=document.createTreeWalker(document,128);let a,b;while(w.nextNode()){if(w.currentNode.data==='r:s:${boundary}')a=w.currentNode;if(w.currentNode.data==='/r:s:${boundary}')b=w.currentNode}if(a&&b&&a.parentNode===b.parentNode){let n=a.nextSibling;while(n&&n!==b){const next=n.nextSibling;n.remove();n=next}b.before(t.content);a.remove();b.remove()}t.remove();s.remove()})()</script>`,
          )
        },
        error => {
          const reported = state.onError?.(error)
          const digest = typeof reported === 'string' ? reported : ''
          const message = error instanceof Error ? error.message : String(error)
          state.output(
            `<template data-rue-client-render="${boundary}" data-dgst="${escapeAttribute(digest)}" data-msg="${escapeAttribute(message)}">Switched to client rendering</template>`,
          )
        },
      )
      void done.catch(() => {})
      state.pending.push(done)
    }),
  )
// Teleports remain inline on the server and move only after successful root claim.
export const _$writeTeleport = _$writeTransition
export const _$writeTransitionGroup = async (
  writer: Writer,
  id: string,
  read: () => Props,
  children: ServerPlan,
) => {
  const props = runWithOwner(writer.owner, read) ?? {}
  if (props.tag) await _$writeElement(writer, id, props.tag, () => ({}), children)
  else await range(writer, id, children)
}
export const renderToString = async (
  component: ServerComponent,
  options: RenderToStringOptions = {},
): Promise<string> => {
  const state = globalThis as Record<string, unknown>
  const serverRenderKey = '__rue_is_server_rendering__'
  const renderCount =
    typeof state[serverRenderKey] === 'number' ? (state[serverRenderKey] as number) : 0
  state[serverRenderKey] = renderCount + 1
  const owner = createOwner()
  const chunks: string[] = []
  const writer: Writer = {
    chunks,
    owner,
    clientReference: options.clientReference,
    serverIsland: options.serverIsland,
    actionState: options.actionState,
  }
  if (options.actionState) installActionStateEnvironment(owner, options.actionState)
  try {
    const plan = await runWithOwner(owner, () => component(options.props ?? {}))!
    await prefetch(owner)
    await runWithOwner(owner, () => plan(writer))
    return chunks.join('')
  } finally {
    disposeOwner(owner)
    const current =
      typeof state[serverRenderKey] === 'number' ? (state[serverRenderKey] as number) : 1
    if (current <= 1) delete state[serverRenderKey]
    else state[serverRenderKey] = current - 1
  }
}
export interface ServerStream extends ReadableStream<Uint8Array> {
  shellReady: Promise<void>
  allReady: Promise<void>
  html: Promise<string>
}

const enterServerRendering = (): (() => void) => {
  const state = globalThis as Record<string, unknown>
  const key = '__rue_is_server_rendering__'
  const count = typeof state[key] === 'number' ? (state[key] as number) : 0
  state[key] = count + 1
  let active = true
  return () => {
    if (!active) return
    active = false
    const current = typeof state[key] === 'number' ? (state[key] as number) : 1
    if (current <= 1) delete state[key]
    else state[key] = current - 1
  }
}

export const renderToReadableStream = async (
  component: ServerComponent,
  options: RenderToStringOptions = {},
): Promise<ServerStream> => {
  const leaveServerRendering = enterServerRendering()
  const owner = createOwner()
  if (options.actionState) installActionStateEnvironment(owner, options.actionState)
  const encoder = new TextEncoder()
  let cancelled = false
  const snapshot: string[] = []
  const pending: Promise<void>[] = []
  let resolve!: () => void
  let reject!: (reason: unknown) => void
  const allReady = new Promise<void>((yes, no) => {
    resolve = yes
    reject = no
  })
  let resolveShell!: () => void
  let rejectShell!: (reason: unknown) => void
  const shellReady = new Promise<void>((resolve, reject) => {
    resolveShell = resolve
    rejectShell = reject
  })
  void shellReady.catch(() => {})
  // Stream consumers can observe failures through read(); allReady is optional.
  void allReady.catch(() => {})
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const output = (html: string) => {
        if (cancelled) throw new Error('Rue server stream was cancelled')
        controller.enqueue(encoder.encode(html))
      }
      const writer: Writer = {
        owner,
        retainOwners: true,
        actionState: options.actionState,
        stream: {
          snapshot,
          pending,
          nextId: 0,
          output,
          nonce: options.nonce,
          onError: options.onError,
        },
        clientReference: options.clientReference,
        serverIsland: options.serverIsland,
        chunks: {
          push(...chunks) {
            snapshot.push(...chunks)
            output(chunks.join(''))
            return chunks.length
          },
        },
      }
      void (async () => {
        try {
          const plan = await runWithOwner(owner, () => component(options.props ?? {}))!
          if (cancelled) return
          await prefetch(owner)
          if (cancelled) return
          await runWithOwner(owner, () => plan(writer))
          resolveShell()
          for (let offset = 0; offset < pending.length; ) {
            const batch = pending.slice(offset)
            offset = pending.length
            await Promise.all(batch)
          }
          if (!cancelled) {
            controller.close()
            resolve()
          }
        } catch (error) {
          if (!cancelled) {
            controller.error(error)
            rejectShell(error)
            reject(error)
          }
        } finally {
          disposeOwner(owner)
          leaveServerRendering()
        }
      })()
    },
    cancel(reason) {
      cancelled = true
      disposeOwner(owner)
      leaveServerRendering()
      const error = reason ?? new Error('Rue server stream was cancelled')
      rejectShell(error)
      reject(error)
    },
  }) as ServerStream
  const html = allReady.then(() => snapshot.join(''))
  void html.catch(() => {})
  Object.defineProperties(stream, {
    shellReady: { value: shellReady },
    allReady: { value: allReady },
    html: { value: html },
  })
  return stream
}
