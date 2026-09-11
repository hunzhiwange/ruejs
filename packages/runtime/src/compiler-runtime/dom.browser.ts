type BrowserDOMNode = Node & {
  namespaceURI?: string | null
  localName?: string | null
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const SVG_TAGS = new Set([
  'animate',
  'animateMotion',
  'animateTransform',
  'circle',
  'clipPath',
  'defs',
  'desc',
  'ellipse',
  'feBlend',
  'feColorMatrix',
  'feComponentTransfer',
  'feComposite',
  'feConvolveMatrix',
  'feDiffuseLighting',
  'feDisplacementMap',
  'feDistantLight',
  'feDropShadow',
  'feFlood',
  'feFuncA',
  'feFuncB',
  'feFuncG',
  'feFuncR',
  'feGaussianBlur',
  'feImage',
  'feMerge',
  'feMergeNode',
  'feMorphology',
  'feOffset',
  'fePointLight',
  'feSpecularLighting',
  'feSpotLight',
  'feTile',
  'feTurbulence',
  'filter',
  'foreignObject',
  'g',
  'image',
  'line',
  'linearGradient',
  'marker',
  'mask',
  'metadata',
  'mpath',
  'path',
  'pattern',
  'polygon',
  'polyline',
  'radialGradient',
  'rect',
  'set',
  'stop',
  'svg',
  'switch',
  'symbol',
  'text',
  'textPath',
  'tspan',
  'use',
  'view',
])
const parentContexts = new WeakMap<Node, Node>()
let activeParent: Node | null | undefined
let activeHydrationAppendChild: ((parent: Node, child: Node) => void) | undefined
let activeHydrationInsertBefore:
  | ((parent: Node, child: Node, reference: Node | null) => void)
  | undefined
let formControlMutationSync: ((parent: Node, child?: Node) => void) | undefined

export type StaticTemplateGetter = () => HTMLTemplateElement

export const installFormControlMutationSync = (
  sync: (parent: Node, child?: Node) => void,
): void => {
  formControlMutationSync = sync
}

export const createComment = (data: string): Comment => document.createComment(data)

export const createTextNode = (data: string): Text => document.createTextNode(data)

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
  const fragment = document.createDocumentFragment()
  if (context != null) parentContexts.set(fragment, context)
  return fragment
}

export const createElement = (tag: string, parent?: Node | null): Element => {
  const compiledParent = resolveParentContext(parent ?? activeParent) as
    | BrowserDOMNode
    | null
    | undefined
  const svg =
    tag === 'svg' ||
    SVG_TAGS.has(tag) ||
    (compiledParent?.namespaceURI === SVG_NAMESPACE && compiledParent.localName !== 'foreignObject')
  return svg ? document.createElementNS(SVG_NAMESPACE, tag) : document.createElement(tag)
}

export const createTextWrapper = (parent: Node): Element => {
  const element = parent as BrowserDOMNode
  if (element.namespaceURI !== SVG_NAMESPACE || element.localName === 'foreignObject') {
    return createElement('span')
  }
  return createElement(
    element.localName === 'text' || element.localName === 'tspan' ? 'tspan' : 'text',
    parent,
  )
}

export const settextContent = (node: Node, value: unknown): void => {
  node.textContent = value == null || typeof value === 'boolean' ? '' : String(value)
}

export const appendChild = (parent: Node, child: Node): void => {
  if (activeHydrationAppendChild) return activeHydrationAppendChild(parent, child)
  parent.appendChild(child)
  formControlMutationSync?.(parent, child)
}

export const removeChild = (parent: Node, child: Node): void => {
  parent.removeChild(child)
}

export const insertBefore = (parent: Node, child: Node, reference: Node | null): void => {
  if (activeHydrationInsertBefore) {
    return activeHydrationInsertBefore(parent, child, reference)
  }
  parent.insertBefore(child, reference)
  formControlMutationSync?.(parent, child)
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
  return () => {
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
    return run()
  } finally {
    activeParent = previous
  }
}

export const captureDOMHostOperations = <Args extends unknown[], T>(
  parent: Node | null | undefined,
  run: (...args: Args) => T,
): ((...args: Args) => T) => {
  const context = resolveParentContext(parent)
  return (...args) => withDOMHostOperations(context, () => run(...args))
}
