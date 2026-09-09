type DOMHostNode = object & {
  parentNode?: DOMHostNode | null
}

export type DOMHostAdapter = {
  createComment(data: string): any
  createTextNode(data: string): any
  createDocumentFragment(): any
  createElement(tag: string, parent?: any): any
  appendChild(parent: any, child: any): void
  removeChild(parent: any, child: any): void
  insertBefore(parent: any, child: any, reference: any): void
  getParentNode(node: any): any
  cloneTemplate?(html: string): unknown
}

type DOMHostOperationContext = {
  adapter: DOMHostAdapter
  freshBrowser: boolean
}

type DOMHostOperationConfiguration = {
  getCurrentAdapter: () => DOMHostAdapter
  getFreshBrowserAdapter: () => DOMHostAdapter
  getGeneration: () => number
  isFreshBrowserParent: (parent: any, adapter: DOMHostAdapter) => boolean
}

let configuration: DOMHostOperationConfiguration | undefined
let runConfiguredHost: typeof withDOMHostOperations | undefined
let activeContext: DOMHostOperationContext | undefined
const contexts = new WeakMap<object, DOMHostOperationContext>()

export const configureDOMHostOperations = (next: DOMHostOperationConfiguration): void => {
  configuration = next
  runConfiguredHost = withConfiguredDOMHostOperations
}

export const resetDOMHostOperations = (): void => {
  activeContext = undefined
}

export function getDOMHostAdapter<T extends DOMHostAdapter>(fallback: T): T
export function getDOMHostAdapter(): DOMHostAdapter | undefined
export function getDOMHostAdapter(fallback?: DOMHostAdapter): DOMHostAdapter | undefined {
  return activeContext?.adapter ?? fallback
}

export const isFreshBrowserDOMHost = (): boolean => activeContext?.freshBrowser === true

export const cloneDOMHostTemplate = (html: string, adapter: DOMHostAdapter): unknown => {
  if (adapter.cloneTemplate) return adapter.cloneTemplate(html)
  throw new Error('Rue template cloning requires the active DOM adapter to implement cloneTemplate')
}

/** Whether compiled DOM work is currently running through an installed host context. */
export const hasActiveDOMHostOperations = (): boolean => activeContext !== undefined

export const rememberDOMHostContext = (value: object): void => {
  if (activeContext) contexts.set(value, activeContext)
}

export const getRememberedDOMHostAdapter = <T extends DOMHostAdapter>(
  value: object,
): T | undefined => contexts.get(value)?.adapter as T | undefined

const inheritedContextFor = (parent: any): DOMHostOperationContext | undefined => {
  if (parent == null || typeof parent !== 'object') return undefined
  let inherited = contexts.get(parent)
  let ancestor = parent.parentNode as DOMHostNode | null | undefined
  while (ancestor != null && inherited == null) {
    inherited = contexts.get(ancestor)
    ancestor = ancestor.parentNode
  }
  return inherited
}

export const withDOMHostOperations = <T>(parent: any, run: () => T): T =>
  activeContext || !runConfiguredHost ? run() : runConfiguredHost(parent, run)

// Host configuration installs this path; native compiler-only consumers retain
// only the synchronous fallback above.
const withConfiguredDOMHostOperations = <T>(parent: any, run: () => T): T => {
  if (!configuration) return run()

  const serverRenderingCount = (globalThis as Record<string, unknown>).__rue_is_server_rendering__
  const isServerRendering = typeof serverRenderingCount === 'number' && serverRenderingCount > 0
  const inherited = isServerRendering ? undefined : inheritedContextFor(parent)
  const adapter = inherited?.adapter ?? configuration.getCurrentAdapter()
  const generation = configuration.getGeneration()
  const previous = activeContext
  activeContext = inherited ?? {
    adapter,
    freshBrowser: !isServerRendering && configuration.isFreshBrowserParent(parent, adapter),
  }
  if (parent != null && typeof parent === 'object' && inherited == null) {
    contexts.set(parent, activeContext)
  }

  try {
    return run()
  } finally {
    if (generation === configuration.getGeneration()) activeContext = previous
  }
}

/** Preserve the current host adapter for work resumed after the render scope has unwound. */
export const captureDOMHostOperations = <Args extends unknown[], T>(
  parent: any,
  run: (...args: Args) => T,
): ((...args: Args) => T) => {
  const captured = activeContext ?? inheritedContextFor(parent)
  if (!captured) return run
  return (...args: Args) => {
    const previous = activeContext
    activeContext = captured
    try {
      return run(...args)
    } finally {
      activeContext = previous
    }
  }
}

export const withFreshBrowserDOMHostOperations = <T>(run: () => T): T => {
  if (activeContext || !configuration) return run()

  const generation = configuration.getGeneration()
  const previous = activeContext
  activeContext = {
    adapter: configuration.getFreshBrowserAdapter(),
    freshBrowser: true,
  }
  try {
    return run()
  } finally {
    if (generation === configuration.getGeneration()) activeContext = previous
  }
}

export const attachDOMHostResult = <T>(parent: any, result: T): T => {
  const context = activeContext
  if (context && result != null && typeof result === 'object') contexts.set(result, context)
  if (
    context &&
    !context.freshBrowser &&
    parent != null &&
    result != null &&
    typeof result === 'object' &&
    context.adapter.getParentNode(result) !== parent
  ) {
    context.adapter.appendChild(parent, result)
  }
  return result
}
