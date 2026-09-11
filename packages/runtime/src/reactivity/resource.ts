import { signal, type CompiledSignalHandle as SignalHandle } from '../runtime-core/compiled'
import { useSetup } from '../compiler-runtime/hooks'
import { untrack, watchEffect } from '../internal-reactive'
import { getCurrentContainer } from '../runtime-context'
import {
  getCurrentSuspenseBoundary,
  RUE_SUSPENSE_BOUNDARY_KEY,
  type SuspenseBoundary,
} from '../components/suspenseContext'

/*
响应式公共出口概述
- 大部分 API 直接透传 ../runtime-core/reactive，保证 Block / Vapor 两条路径使用同一套信号实现。
- createResource 在底层 createResourceRaw 外包一层 Suspense 感知能力，读取 data 时会向最近 Suspense 边界登记 pending。
- Suspense 边界既可以来自组件渲染栈，也可以从当前容器 DOM 链上的隐藏字段查找。
*/

/** createResource 返回的响应式资源状态。 */
type Resource<TData = any> = {
  /** 已解析数据；读取时会把 pending promise 登记到当前 Suspense。 */
  data: SignalHandle<TData>
  /** 最近一次加载错误。 */
  error: SignalHandle<any>
  /** 当前是否处于加载中。 */
  loading: SignalHandle<boolean>
}

type BoundaryRef = SuspenseBoundary | WeakRef<SuspenseBoundary>

type SuspenseResourceState = {
  boundaries: Map<symbol, BoundaryRef>
  scheduled: Map<symbol, Promise<unknown>>
  pending: Promise<unknown> | null
}

const toBoundaryRef = (boundary: SuspenseBoundary): BoundaryRef => {
  if (typeof WeakRef === 'function') {
    return new WeakRef(boundary)
  }
  return boundary
}

const isWeakBoundaryRef = (ref: BoundaryRef): ref is WeakRef<SuspenseBoundary> => {
  return typeof WeakRef === 'function' && ref instanceof WeakRef
}

const resolveBoundaryRef = (ref: BoundaryRef): SuspenseBoundary | undefined => {
  if (isWeakBoundaryRef(ref)) {
    return ref.deref() ?? undefined
  }
  return ref
}

const rememberBoundary = (state: SuspenseResourceState, boundary: SuspenseBoundary) => {
  state.boundaries.set(boundary.id, toBoundaryRef(boundary))
}

const forEachBoundary = (
  state: SuspenseResourceState,
  visit: (boundary: SuspenseBoundary) => void,
) => {
  for (const [id, ref] of state.boundaries) {
    const boundary = resolveBoundaryRef(ref)
    if (!boundary) {
      state.boundaries.delete(id)
      continue
    }
    visit(boundary)
  }
}

const findSuspenseBoundary = (): SuspenseBoundary | null => {
  const currentBoundary = getCurrentSuspenseBoundary()
  if (currentBoundary) {
    return currentBoundary
  }

  let node: any = getCurrentContainer()
  while (node) {
    const boundary = node[RUE_SUSPENSE_BOUNDARY_KEY] as SuspenseBoundary | undefined
    if (boundary) {
      return boundary
    }
    node = node.parentNode
  }

  return null
}

const registerPendingForCurrentBoundary = (state: SuspenseResourceState) => {
  if (!state.pending) {
    return false
  }

  const currentBoundary = getCurrentSuspenseBoundary()
  if (currentBoundary) {
    rememberBoundary(state, currentBoundary)
    throw state.pending
  }

  const boundary = findSuspenseBoundary()
  if (!boundary) {
    return false
  }

  rememberBoundary(state, boundary)
  if (state.scheduled.get(boundary.id) === state.pending) {
    return true
  }

  const pending = state.pending
  state.scheduled.set(boundary.id, pending)
  queueMicrotask(() => {
    if (state.pending === pending) {
      boundary.register(pending)
    }
    if (state.scheduled.get(boundary.id) === pending) {
      state.scheduled.delete(boundary.id)
    }
  })
  return true
}

const createSuspenseAwareHandle = <T>(
  handle: SignalHandle<T>,
  state: SuspenseResourceState,
): SignalHandle<T> => {
  const read = handle.get.bind(handle)
  handle.get = () => (registerPendingForCurrentBoundary(state) ? (undefined as T) : read())
  Object.defineProperty(handle, 'value', {
    configurable: true,
    get: () => handle.get(),
    set: (value: T) => handle.set(value),
  })
  return handle
}

const createSuspenseResource = <TSrc, TData>(
  src: SignalHandle<TSrc>,
  fetcher: (src: TSrc) => Promise<TData>,
): Resource<TData> => {
  const state: SuspenseResourceState = {
    boundaries: new Map(),
    scheduled: new Map(),
    pending: null,
  }
  const data = signal<TData | undefined>(undefined) as SignalHandle<TData>
  const error = signal<any>(undefined)
  const loading = signal(true)
  let currentSource = untrack(() => src.get())
  let version = 0

  const load = (value: TSrc) => {
    const currentVersion = ++version
    loading.set(true)
    error.set(undefined)
    const pending = Promise.resolve().then(() => fetcher(value))
    state.pending = pending

    forEachBoundary(state, boundary => {
      boundary.register(pending)
    })

    void pending
      .then(
        value => {
          if (version !== currentVersion) {
            return
          }
          data.set(value)
          loading.set(false)
        },
        reason => {
          if (version !== currentVersion) {
            return
          }
          error.set(reason)
          loading.set(false)
        },
      )
      .finally(() => {
        if (state.pending === pending) {
          state.pending = null
        }
      })
  }

  load(currentSource)

  watchEffect(() => {
    const nextSource = src.get()
    if (Object.is(nextSource, currentSource)) {
      return
    }
    currentSource = nextSource
    load(nextSource)
  })

  return {
    data: createSuspenseAwareHandle(data, state),
    error,
    loading,
  }
}

/** 创建异步资源，并自动接入当前 Suspense 边界。 */
export function createResource<TSrc, TData>(
  src: SignalHandle<TSrc>,
  fetcher: (src: TSrc) => Promise<TData>,
): Resource<TData> {
  return useSetup(() => createSuspenseResource(src, fetcher)) as Resource<TData>
}
