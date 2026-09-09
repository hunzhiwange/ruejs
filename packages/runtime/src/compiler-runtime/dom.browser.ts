import {
  attachDOMHostResult,
  captureDOMHostOperations as captureAdapterHostOperations,
  cloneDOMHostTemplate,
  getDOMHostAdapter,
  getRememberedDOMHostAdapter,
  isFreshBrowserDOMHost,
  withDOMHostOperations as withAdapterHostOperations,
} from './dom-host-operations'

type BrowserDOMNode = Node & {
  namespaceURI?: string | null
  localName?: string | null
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const parentContexts = new WeakMap<Node, Node>()
let activeParent: Node | null | undefined
let activeHydrationAppendChild: ((parent: Node, child: Node) => void) | undefined
let activeHydrationInsertBefore:
  | ((parent: Node, child: Node, reference: Node | null) => void)
  | undefined

export type StaticTemplateGetter = () => HTMLTemplateElement

const hostAdapterFor = (parent?: object | null) => {
  if (isFreshBrowserDOMHost()) return undefined
  if (typeof Node !== 'undefined' && parent instanceof Node) return undefined
  const activeAdapter = getDOMHostAdapter()
  const serverRenderingCount = (globalThis as Record<string, unknown>).__rue_is_server_rendering__
  if (
    activeAdapter !== undefined &&
    typeof serverRenderingCount === 'number' &&
    serverRenderingCount > 0
  ) {
    return activeAdapter
  }
  return parent == null ? activeAdapter : (getRememberedDOMHostAdapter(parent) ?? activeAdapter)
}

export const createComment = (data: string): Comment => {
  const adapter = hostAdapterFor(resolveParentContext(activeParent))
  return adapter ? adapter.createComment(data) : document.createComment(data)
}

export const createTextNode = (data: string): Text => {
  const adapter = hostAdapterFor(resolveParentContext(activeParent))
  return adapter ? adapter.createTextNode(data) : document.createTextNode(data)
}

const resolveParentContext = (parent: Node | null | undefined): Node | null | undefined => {
  let current = parent
  const visited = new Set<Node>()
  while (current != null && parentContexts.has(current) && !visited.has(current)) {
    visited.add(current)
    current = parentContexts.get(current)
  }
  return current
}

/** Resolve a staging fragment back to the stable browser parent that owns it. */
export const resolveDOMHostParentContext = (
  parent: Node | null | undefined,
): Node | null | undefined => resolveParentContext(parent)

export const createDocumentFragment = (parent?: Node | null): DocumentFragment => {
  const context = resolveParentContext(parent ?? activeParent)
  const adapter = hostAdapterFor(context)
  const fragment = (
    adapter ? adapter.createDocumentFragment() : document.createDocumentFragment()
  ) as DocumentFragment
  if (context != null) parentContexts.set(fragment, context)
  return fragment
}

export const createElement = (tag: string, parent?: Node | null): Element => {
  const compiledParent = resolveParentContext(parent ?? activeParent) as
    | BrowserDOMNode
    | null
    | undefined
  const adapter = hostAdapterFor(compiledParent)
  if (adapter) return adapter.createElement(tag, compiledParent) as Element
  const svg =
    tag === 'svg' ||
    (compiledParent?.namespaceURI === SVG_NAMESPACE && compiledParent.localName !== 'foreignObject')
  return svg ? document.createElementNS(SVG_NAMESPACE, tag) : document.createElement(tag)
}

export const appendChild = (parent: Node, child: Node): void => {
  if (activeHydrationAppendChild) return activeHydrationAppendChild(parent, child)
  const adapter = hostAdapterFor(parent)
  if (adapter) adapter.appendChild(parent, child)
  else parent.appendChild(child)
}

export const removeChild = (parent: Node, child: Node): void => {
  const adapter = hostAdapterFor(parent)
  if (adapter) adapter.removeChild(parent, child)
  else parent.removeChild(child)
}

export const insertBefore = (parent: Node, child: Node, reference: Node | null): void => {
  if (activeHydrationInsertBefore) {
    return activeHydrationInsertBefore(parent, child, reference)
  }
  const adapter = hostAdapterFor(parent)
  if (adapter) adapter.insertBefore(parent, child, reference)
  else parent.insertBefore(child, reference)
}

export const withHydrationDOMMutations = <T>(
  append: (parent: Node, child: Node) => void,
  insert: (parent: Node, child: Node, reference: Node | null) => void,
  run: () => T,
): T => {
  const previousAppend = activeHydrationAppendChild
  const previousInsert = activeHydrationInsertBefore
  activeHydrationAppendChild = append
  activeHydrationInsertBefore = insert
  try {
    return run()
  } finally {
    activeHydrationAppendChild = previousAppend
    activeHydrationInsertBefore = previousInsert
  }
}

export const template = (html: string): StaticTemplateGetter => {
  let cachedHTML: HTMLTemplateElement | undefined
  let cachedSVG: HTMLTemplateElement | undefined
  const cachedHostTemplates = new WeakMap<object, HTMLTemplateElement>()
  return () => {
    const adapter = hostAdapterFor(resolveParentContext(activeParent))
    if (adapter !== undefined && !isFreshBrowserDOMHost()) {
      let cachedServerTemplate = cachedHostTemplates.get(adapter)
      if (!cachedServerTemplate) {
        const content = {
          cloneNode: () => cloneDOMHostTemplate(html, adapter),
        }
        cachedServerTemplate = { content } as unknown as HTMLTemplateElement
        cachedHostTemplates.set(adapter, cachedServerTemplate)
      }
      return cachedServerTemplate
    }
    const context = resolveParentContext(activeParent) as BrowserDOMNode | null | undefined
    const useSVGNamespace =
      context?.namespaceURI === SVG_NAMESPACE && context.localName !== 'foreignObject'
    if (useSVGNamespace) {
      if (!cachedSVG) {
        cachedSVG = document.createElement('template')
        const svg = document.createElementNS(SVG_NAMESPACE, 'svg')
        svg.innerHTML = html
        cachedSVG.content.append(...Array.from(svg.childNodes))
      }
      return cachedSVG
    }
    if (!cachedHTML) {
      cachedHTML = document.createElement('template')
      cachedHTML.innerHTML = html
    }
    return cachedHTML
  }
}

/** Browser compiled output is already bound to the native DOM host. */
export const withDOMHostOperations = <T>(parent: Node | null | undefined, run: () => T): T => {
  const previous = activeParent
  activeParent = resolveParentContext(parent)
  try {
    return withAdapterHostOperations(activeParent, () => attachDOMHostResult(parent, run()))
  } finally {
    activeParent = previous
  }
}

export const captureDOMHostOperations = <Args extends unknown[], T>(
  parent: Node | null | undefined,
  run: (...args: Args) => T,
): ((...args: Args) => T) => captureAdapterHostOperations(resolveParentContext(parent), run)
