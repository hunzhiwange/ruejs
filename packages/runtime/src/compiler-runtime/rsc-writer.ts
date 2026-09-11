import { type ActionFormState, type ActionStateEnvironment } from './action-state'
import { runWithOwner } from '../runtime-core/compiled'
import {
  _$writeComponent,
  renderToReadableStream,
  type ServerComponent,
  type ServerPlan,
  type ServerStream,
  type Writer,
  type ClientReferenceWriter,
} from './ssr-writer'
import type { ServerFrame, ClientBoundary, ComponentResolver } from './rsc-frame'

export interface ServerFrameStream {
  stream: ServerStream
  frame: Promise<ServerFrame>
}

/** HTML and transport metadata share one execution of the compiled component tree. */
export async function renderServerFrameStream(
  component: ServerComponent,
  options: {
    formState?: ActionFormState
    nonce?: string
    onError?: (error: unknown) => unknown
    props?: Record<string, unknown>
    resolve: ComponentResolver<ServerComponent>
  },
): Promise<ServerFrameStream> {
  let nextId = 0
  const finalizeSlots: Array<() => void> = []
  const createReferenceWriter =
    (references: ClientBoundary[]): ClientReferenceWriter =>
    async (writer, referenceKey, exportName, props) => {
      const id = String(nextId++)
      const { children, ...data } = props
      const boundary: ClientBoundary = {
        id,
        identity: `${writer.path ?? ''}/${referenceKey}#${exportName}`,
        referenceKey,
        exportName,
        props: data,
      }
      if (!writer.transient) references.push(boundary)
      const target = await options.resolve(referenceKey, exportName)
      if (typeof target !== 'function')
        throw new Error(`Rue missing compiled server export ${referenceKey}#${exportName}`)
      let written = false
      const slot: ServerPlan | null = children
        ? async targetWriter => {
            if (written) throw new Error('Rue RSC server slot must have one compiled placement')
            written = true
            const childFrame: ServerFrame = { version: 1, html: '', references: [] }
            boundary.children = childFrame
            const chunks: string[] = []
            const snapshot = targetWriter.stream?.snapshot
            const start = snapshot?.length ?? 0
            const slotWriter: Writer = {
              ...targetWriter,
              clientReference: createReferenceWriter(childFrame.references),
              chunks: {
                push(...pieces) {
                  chunks.push(...pieces)
                  return targetWriter.chunks.push(...pieces)
                },
              },
            }
            await runWithOwner(targetWriter.owner, () => (children as ServerPlan)(slotWriter))
            const end = snapshot?.length ?? 0
            finalizeSlots.push(() => {
              childFrame.html = snapshot ? snapshot.slice(start, end).join('') : chunks.join('')
            })
          }
        : null
      const actionState: ActionStateEnvironment = {
        scope: boundary.identity!,
        next: 0,
        formState: options.formState,
        states: [],
      }
      await _$writeComponent({ ...writer, actionState }, `rsc:${id}`, target, () => data, slot)
      if (actionState.states.length) boundary.actionStates = actionState.states
    }
  const frame: ServerFrame = { version: 1, html: '', references: [] }
  const source = await renderToReadableStream(component, {
    props: options.props,
    nonce: options.nonce,
    onError: options.onError,
    clientReference: createReferenceWriter(frame.references),
  })
  const result = source.html.then(html => {
    frame.html = html
    for (const finalize of finalizeSlots) finalize()
    return frame
  })
  void result.catch(() => {})
  return { stream: source, frame: result }
}

/** Executes only compiler-generated writer plans; the RSC transport receives data, never closures. */
export async function renderServerFrame(
  component: ServerComponent,
  options: {
    formState?: ActionFormState
    nonce?: string
    props?: Record<string, unknown>
    resolve: ComponentResolver<ServerComponent>
  },
): Promise<ServerFrame> {
  const result = await renderServerFrameStream(component, options)
  await new Response(result.stream).text()
  return result.frame
}
