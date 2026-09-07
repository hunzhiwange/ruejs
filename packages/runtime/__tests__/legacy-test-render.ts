import type { ComponentInstance, ComponentProps, RenderOutput } from '../src/runtime-types'
import { Component } from '../src/components/Component'
import { createCompiledDynamic, createCompiledFragment } from '../src/compiled-dynamic'
import { _$createComponent as createCompiledComponent } from '../src/compiled-component-call'
import { _$compiledRoot, type CompiledRootHandle } from '../src/compiled-root'
import {
  _$compiledValue,
  renderAnchor as renderCompiledAnchor,
} from '../src/compiled-render-anchor'
import {
  _$createComment as createCompiledComment,
  _$createDocumentFragment as createCompiledDocumentFragment,
  _$createElement as createCompiledElement,
  _$createTextNode as createCompiledTextNode,
  _$compiledWithKey as compiledWithKey,
  vapor,
} from '../src/compiled-legacy-dom'
import {
  _$compiledWithEventModifiers,
  _$compiledWithNativeEvents,
} from '../src/compiled-legacy-dom'
import { _$reconcileKeyed, type CompiledKeyedRow } from '../src/compiled-keyed-list'
import {
  createOwner,
  disposeOwner,
  effect as createCompiledEffect,
  onOwnerCleanup,
  runWithOwner,
  signal as createCompiledSignal,
} from '../src/reactive-core'
import { effectScope, getCurrentScope, onScopeDispose } from '../src/reactivity'

export type RenderTarget =
  | { kind: 'container'; container: any }
  | { kind: 'between'; parent: any; start: any; end: any }
  | { kind: 'anchor' | 'static'; parent: any; anchor: any }
export interface BlockInstance {
  readonly kind: 'block'
  mount(target: RenderTarget): void
  cleanupBucket?: Array<() => void>
  unmount?(): void
}

/** Migrate an old block-shaped fixture onto the compiled root lifecycle without production support. */
export const createTestCompiledBlock = (
  block: BlockInstance,
): BlockInstance & CompiledRootHandle => {
  const handle = _$compiledRoot(parent => {
    if (parent == null) throw new Error('[rue:test] a compiled block requires a mount parent')
    let cleaned = false
    const cleanup = () => {
      if (cleaned) return
      cleaned = true
      let cleanupError: unknown
      try {
        for (const callback of block.cleanupBucket?.splice(0).reverse() ?? []) callback()
      } catch (error) {
        cleanupError = error
      } finally {
        block.unmount?.()
      }
      if (cleanupError !== undefined) throw cleanupError
    }
    onOwnerCleanup(cleanup)
    const previous = new Set(Array.from(parent.childNodes))
    block.mount({ kind: 'container', container: parent })
    return Array.from(parent.childNodes).find(node => !previous.has(node)) ?? null
  })
  return Object.assign(handle, { kind: 'block' as const, mount: block.mount })
}
import { useRef, useSetup, useState as useCompiledState } from '../src/compiler-runtime/hooks'
import {
  _$compiledMarkComponentRenderReactive,
  _$compiledWithHookId,
} from '../src/compiled-hook-compat'

export { vapor, useRef, useSetup }
export const _$createComponent = (type: ComponentInstance<any>, props?: ComponentProps | null) =>
  createCompiledComponent(type, props ?? {})
export const renderAnchor: any = renderCompiledAnchor
export const _$createElement = (tag: string, _parentContext?: unknown) => createCompiledElement(tag)
export const _$createComment = (value = '', _parentContext?: unknown) =>
  createCompiledComment(value)
export const _$createTextNode = (value = '', _parentContext?: unknown) =>
  createCompiledTextNode(value)
export const _$createDocumentFragment = (_parentContext?: unknown) =>
  createCompiledDocumentFragment()
export const useState: any = useCompiledState
export const vaporWithEventModifiers = _$compiledWithEventModifiers
export const vaporWithNativeEvents = _$compiledWithNativeEvents
export { createCompiledDynamic as _$createDynamic, createCompiledFragment as _$createFragment }
export { _$compiledWithHookId }
export { _$compiledMarkComponentRenderReactive }
export {
  _$appendChild,
  _$createTextWrapper,
  _$insertBefore,
  _$setAttribute,
  _$setChecked,
  _$setDisabled,
  _$setInnerHTML,
  _$setProperty,
  _$setStyle,
  _$setValue,
  _$settextContent,
  _$spreadAttributes,
} from '../src/compiled-legacy-dom'
export {
  _$compiledBindUseRef,
  _$compiledShowStyle,
  _$compiledWithEventModifiers,
  _$compiledWithKey,
  _$compiledWithNativeEvents,
} from '../src/compiled-legacy-dom'
export { watchEffect } from '../src/internal-reactive'
export {
  computed,
  reactive,
  readonly,
  ref,
  shallowReactive,
  shallowReadonly,
  signal,
  setReactiveScheduling,
  untrack,
} from '../src/reactivity'
export {
  getCurrentContainer,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  onUnmounted,
} from '../src/rue'
export { useApp } from '../src/hooks/useApp'
export { _$template } from '../src/internal'

/** Test-only renderable constructor; production entries expose no general element factory. */
const TEST_FRAGMENT = 'fragment'

export const createTestRenderable = <P = {}>(
  type: string | ComponentInstance<P>,
  props: ComponentProps | null,
  ...children: unknown[]
): RenderOutput | null => {
  const effectiveChildren =
    children.length > 0 ? (children.length === 1 ? children[0] : children) : props?.children

  if (type === TEST_FRAGMENT) {
    if (effectiveChildren == null) return createCompiledFragment([])
    return createCompiledFragment(
      Array.isArray(effectiveChildren) ? effectiveChildren : [effectiveChildren],
    )
  }

  const nextProps = props ? { ...props } : ({} as ComponentProps)
  if (effectiveChildren !== undefined) nextProps.children = effectiveChildren as any
  const resolvedType = type === 'component' ? Component : type
  const rendered = createCompiledComponent(
    resolvedType as ComponentInstance<any>,
    Object.keys(nextProps).length > 0 ? nextProps : ({} as ComponentProps),
  )
  return props != null && Object.hasOwn(props, 'key')
    ? compiledWithKey(rendered, props.key)
    : rendered
}

export const emptyCompiledValue = () => _$compiledValue(null)

export type VaporListItemRange = {
  start?: Node
  end: Node
  current?: ReturnType<typeof createCompiledSignal<{ item: any; index: number }>>
  renderState?: ReturnType<typeof createCompiledSignal<{ item: any; index: number }>>
  stop?: () => void
  cleanups: Array<() => void>
  refCleanups: Array<() => void>
  ownedMountCleanups: Array<() => void>
  opaqueRenderableCleanups: Array<() => void>
  pendingMounted: unknown[]
  scope?: ReturnType<typeof effectScope>
  generation: number
  disposed: boolean
}

type TestKeyedRow<T> = CompiledKeyedRow<T> & {
  cell: ReturnType<typeof createCompiledSignal<{ item: T; index: number }>>
  range: VaporListItemRange
}

const keyedRows = new WeakMap<Map<unknown, VaporListItemRange>, TestKeyedRow<any>[]>()
const registeredListStates = new WeakSet<object>()

/** Test adapter for old list call sites, backed by the production compiled keyed reconciler. */
const reconcileLegacyList = <T>(args: {
  items: T[]
  getKey: (item: T, index: number) => unknown
  elements?: Map<unknown, VaporListItemRange>
  state?: {
    elements: Map<unknown, VaporListItemRange>
    dispose?: () => void
    disposed?: boolean
    __debug?: { cleanupRegistrations: number; disposedRows: number }
  }
  parent: ParentNode | null
  before: Node | null
  start?: Node | null
  singleRoot?: boolean
  trackIndex?: boolean
  ownedMount?: boolean
  opaqueRenderable?: boolean
  asyncExternalRenderable?: boolean
  renderItem: (
    item: T,
    parent: ParentNode,
    start: Node,
    end: Node,
    index: number,
    registerRefCleanup: (cleanup: () => void) => void,
  ) => void
}) => {
  const elements = args.state?.elements ?? args.elements ?? new Map<unknown, VaporListItemRange>()
  if (args.parent == null || args.state?.disposed) return elements
  const outerScope = getCurrentScope()
  if (args.state && !registeredListStates.has(args.state)) {
    registeredListStates.add(args.state)
    args.state.__debug = { cleanupRegistrations: outerScope ? 1 : 0, disposedRows: 0 }
    if (outerScope) onScopeDispose(() => args.state?.dispose?.())
  }
  const previous = keyedRows.get(elements) ?? []
  const createdRows: TestKeyedRow<T>[] = []
  let next: TestKeyedRow<T>[]
  try {
    next = _$reconcileKeyed(
      args.parent as Node & ParentNode,
      args.before,
      previous,
      args.items,
      args.getKey,
      (item, index) => {
        const scope = effectScope(true)
        const owner = createOwner()
        const cell = createCompiledSignal({ item, index })
        const start = document.createComment('rue:compiled-row:start')
        const end = document.createComment('rue:compiled-row:end')
        const staging = document.createDocumentFragment()
        staging.append(start, end)
        const proxy =
          item != null && typeof item === 'object'
            ? new Proxy({} as T & object, {
                get: (_target, key) => Reflect.get(cell.get().item as object, key),
                has: (_target, key) => Reflect.has(cell.get().item as object, key),
                ownKeys: () => Reflect.ownKeys(cell.get().item as object),
                getOwnPropertyDescriptor: (_target, key) => ({
                  ...Reflect.getOwnPropertyDescriptor(cell.get().item as object, key),
                  configurable: true,
                }),
              })
            : item
        const refCleanups: Array<() => void> = []
        let rowScope: ReturnType<typeof getCurrentScope>
        let renderedValue: unknown
        try {
          scope.run(() => {
            const renderRow = () => {
              rowScope = getCurrentScope()
              const nextValue = (cell.get().item as { value?: unknown } | null)?.value
              if (args.asyncExternalRenderable && renderedValue !== undefined) {
                const readProps = (value: unknown) =>
                  value != null && typeof value === 'object'
                    ? (value as Record<string, unknown>).__rue_compiled_component_read_props__
                    : undefined
                const previousRead = readProps(renderedValue)
                const nextRead = readProps(nextValue)
                const previousProps =
                  typeof previousRead === 'function' ? previousRead() : undefined
                const nextProps = typeof nextRead === 'function' ? nextRead() : undefined
                if (
                  previousProps != null &&
                  nextProps != null &&
                  typeof previousProps === 'object' &&
                  typeof nextProps === 'object' &&
                  'to' in previousProps &&
                  'to' in nextProps &&
                  previousProps.to !== nextProps.to
                ) {
                  renderAnchor(null, (end.parentNode as ParentNode | null) ?? staging, end)
                }
              }
              renderedValue = nextValue
              args.renderItem(
                proxy as T,
                (end.parentNode as ParentNode | null) ?? staging,
                args.singleRoot ? end : start,
                end,
                cell.get().index,
                cleanup => refCleanups.push(cleanup),
              )
            }
            if (args.ownedMount || args.opaqueRenderable || args.asyncExternalRenderable) {
              runWithOwner(owner, () => createCompiledEffect(renderRow))
            } else {
              runWithOwner(owner, renderRow)
            }
          })
        } catch (error) {
          disposeOwner(owner)
          scope.stop()
          cell.dispose()
          throw error
        }
        const range: VaporListItemRange = {
          start,
          end,
          current: cell,
          cleanups: [],
          refCleanups,
          ownedMountCleanups: [],
          opaqueRenderableCleanups: [],
          pendingMounted: [],
          scope: rowScope ?? scope,
          generation: 0,
          disposed: false,
        }
        const dispose = () => {
          if (range.disposed) return
          range.disposed = true
          range.generation += 1
          for (const cleanup of refCleanups.splice(0).reverse()) cleanup()
          disposeOwner(owner)
          scope.stop()
          cell.dispose()
        }
        range.stop = dispose
        const row = {
          node: start,
          last: end,
          patch: (nextItem: T, nextIndex: number) => {
            const current = cell.peek()
            if (!args.trackIndex && Object.is(current.item, nextItem)) return
            cell.set({ item: nextItem, index: args.trackIndex ? nextIndex : current.index })
          },
          dispose,
          cell,
          range,
        } as unknown as TestKeyedRow<T>
        createdRows.push(row)
        return row
      },
    ) as TestKeyedRow<T>[]
  } catch (error) {
    for (const row of createdRows) row.dispose()
    throw error
  }

  for (const row of next) {
    if (row.range == null) {
      row.range = createdRows.find(created => created.node === row.node)!.range
    }
  }
  keyedRows.set(elements, next)
  elements.clear()
  next.forEach((row, index) => elements.set(args.getKey(args.items[index], index), row.range))
  if (args.state) {
    args.state.elements = elements
    args.state.dispose = () => {
      if (args.state!.disposed) return
      args.state!.disposed = true
      const rows = keyedRows.get(elements) ?? []
      if (args.state!.__debug) args.state!.__debug.disposedRows += rows.length
      _$reconcileKeyed(args.parent as Node & ParentNode, args.before, rows, [], args.getKey, () => {
        throw new Error('[rue:test] disposed keyed state cannot mount rows')
      })
      keyedRows.delete(elements)
      elements.clear()
    }
  }
  return elements
}

export type VaporKeyedList = <T>(args: {
  items: T[]
  getKey: (item: T, index: number) => unknown
  elements?: Map<any, any>
  state?: any
  parent: any
  before: any
  start?: any
  singleRoot?: boolean
  trackIndex?: boolean
  ownedMount?: boolean
  opaqueRenderable?: boolean
  asyncExternalRenderable?: boolean
  renderItem: (
    item: T,
    parent: any,
    start: any,
    end: any,
    index: number,
    registerRefCleanup: (cleanup: () => void) => void,
  ) => void
}) => any

export const vaporKeyedList = reconcileLegacyList as VaporKeyedList
export const _$compiledKeyedList = vaporKeyedList
