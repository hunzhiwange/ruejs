import {
  _$writeComponent,
  _$writeElement,
  _$writeSuspense,
  renderServerFrameStream,
  type ServerComponent,
  type ServerPlan,
  type ServerFrameStream,
  type Writer,
} from '@rue-js/runtime/internal/ssr'
import { resolveAppClientReferenceExport } from './app-client-reference-resolver.js'

export type AppServerRenderable = ServerPlan | null | undefined
export type AppServerComponent<P = Record<string, unknown>> = ServerComponent<P>
const PLAN = Symbol.for('text.compiled.server.plan')
const EXECUTION = Symbol.for('text.compiled.server.execution')
const PRELOAD = Symbol.for('text.compiled.server.preload')
const LAYOUT_ERROR_INDEX = Symbol.for('text.compiled.server.layoutErrorIndex')
const PAGE_ERROR = Symbol.for('text.compiled.server.pageError')
type AppPlan = ServerPlan & {
  [PLAN]: true
  [EXECUTION]?: Promise<ServerFrameStream>
  [PRELOAD]?: () => void
}

export function isAppServerPlan(value: unknown): value is AppPlan {
  return typeof value === 'function' && (value as AppPlan)[PLAN] === true
}

export const AppServerFragment: ServerComponent = props => props.children ?? (() => {})
export const AppServerSuspense: ServerComponent = props => writer =>
  _$writeSuspense(writer, 'text-suspense', () => props, props.children ?? (() => {}))
export const AppMeta: ServerComponent = props => writer =>
  _$writeElement(writer, 'text-meta', 'meta', () => props, null)
export const AppDiv: ServerComponent = props => writer =>
  _$writeElement(writer, 'text-div', 'div', () => props, props.children ?? null)

/** Compose only compiled factories and slots. No element objects or runtime tag dispatch. */
export function createAppServerElement<P>(
  component: AppServerComponent<P>,
  props?: (P & { key?: unknown }) | null,
  ...children: AppServerRenderable[]
): AppPlan {
  if (typeof component !== 'function') throw new Error('Text requires a compiled component factory')
  const slot: ServerPlan | null = children.length
    ? async writer => {
        for (const child of children) {
          if (child == null) continue
          await writeAppServerPlan(child, writer)
        }
      }
    : null
  const plan: ServerPlan = writer =>
    _$writeComponent(
      writer,
      `text:${encodeURIComponent(String(props?.key ?? component.name ?? 'component'))}`,
      component,
      () => props ?? {},
      slot,
    )
  return Object.defineProperty(plan, PLAN, { value: true }) as AppPlan
}

/** Route-owned layout identity excludes changing ancestor page/template keys. */
export function scopeAppServerPlan(
  plan: ServerPlan,
  identity: string,
  layoutIndex?: number,
): AppPlan {
  const scoped: ServerPlan = async writer => {
    try {
      await plan({ ...writer, path: identity })
    } catch (error) {
      if (
        layoutIndex !== undefined &&
        error &&
        typeof error === 'object' &&
        typeof (error as Record<symbol, unknown>)[LAYOUT_ERROR_INDEX] !== 'number' &&
        (error as Record<symbol, unknown>)[PAGE_ERROR] !== true
      ) {
        Object.defineProperty(error, LAYOUT_ERROR_INDEX, {
          configurable: true,
          value: layoutIndex,
        })
      }
      throw error
    }
  }
  return Object.defineProperty(scoped, PLAN, { value: true }) as AppPlan
}

export function markAppServerPlanAsPage(plan: AppServerRenderable): AppServerRenderable {
  if (plan == null) return plan
  const marked: ServerPlan = async writer => {
    try {
      await plan(writer)
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        typeof (error as Record<symbol, unknown>)[LAYOUT_ERROR_INDEX] !== 'number'
      ) {
        Object.defineProperty(error, PAGE_ERROR, { configurable: true, value: true })
      }
      throw error
    }
  }
  const markedPlan = Object.defineProperty(marked, PLAN, { value: true }) as AppPlan
  if (isAppServerPlan(plan) && plan[PRELOAD]) markedPlan[PRELOAD] = plan[PRELOAD]
  return markedPlan
}

export function setAppServerPlanPreloader(plan: AppPlan, preload: () => void): AppPlan {
  plan[PRELOAD] = preload
  return plan
}

export function preloadAppServerPlan(plan: unknown): void {
  if (isAppServerPlan(plan)) plan[PRELOAD]?.()
}

export async function writeAppServerPlan(plan: ServerPlan, writer: Writer): Promise<void> {
  if (!isAppServerPlan(plan) || !plan[EXECUTION]) {
    await plan(writer)
    return
  }

  const execution = await plan[EXECUTION]
  const reader = execution.stream.getReader()
  const decoder = new TextDecoder()
  try {
    for (;;) {
      const part = await reader.read()
      if (part.done) break
      writer.chunks.push(decoder.decode(part.value, { stream: true }))
    }
    const tail = decoder.decode()
    if (tail) writer.chunks.push(tail)
  } finally {
    reader.releaseLock()
  }
}

export function readAppServerPlanLayoutErrorIndex(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null
  const value = (error as Record<symbol, unknown>)[LAYOUT_ERROR_INDEX]
  return typeof value === 'number' ? value : null
}

/** One per-request execution supplies both the HTML stream and serializable frame. */
export function startAppServerPlan(
  plan: AppPlan,
  options: {
    formState?: import('@rue-js/runtime/internal/ssr').ActionFormState
    nonce?: string
    onError?: (error: unknown) => unknown
  } = {},
): Promise<ServerFrameStream> {
  return (plan[EXECUTION] ??= renderServerFrameStream(() => plan, {
    ...options,
    async resolve(key, name) {
      const component = await resolveAppClientReferenceExport(key, name)
      if (typeof component !== 'function')
        throw new Error(`Text missing compiled SSR export ${key}#${name}`)
      return component as ServerComponent
    },
  }))
}
