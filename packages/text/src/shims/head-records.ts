/**
 * text/head shim
 *
 * In the Pages Router, <Head> manages document <head> elements.
 * - On the server: collects elements into a module-level array that the
 *   dev-server reads after render and injects into the HTML <head>.
 * - On the client: reduces all mounted <Head> instances into one deduped
 *   document.head projection and applies it with DOM manipulation.
 */

export type HeadRecord = {
  key: string | number | null
  props: Record<string, unknown>
  type: string
}

const RUE_HEAD_RECORD = Symbol.for('text.head.record')

export function createHeadRecord(
  type: string,
  props: Record<string, unknown> | null | undefined = {},
  key: string | number | null = null,
): HeadRecord {
  return {
    [RUE_HEAD_RECORD]: true,
    key,
    props: props ? { ...props } : {},
    type,
  } as HeadRecord & { [RUE_HEAD_RECORD]: true }
}

// --- SSR head collection ---
// State uses a registration pattern so this module can be bundled for the
// browser. The ALS-backed implementation lives in head-state.ts (server-only).

const HEAD_STATE_ACCESSORS = Symbol.for('text.head.stateAccessors')
type SharedHeadStateAccessors = {
  fallbackChildren: unknown[]
  getSSRHeadChildren: () => unknown[]
  resetSSRHead: () => void
}
const sharedHeadState = (() => {
  const target = globalThis as typeof globalThis & {
    [HEAD_STATE_ACCESSORS]?: SharedHeadStateAccessors
  }
  if (!target[HEAD_STATE_ACCESSORS]) {
    const state: SharedHeadStateAccessors = {
      fallbackChildren: [],
      getSSRHeadChildren: () => state.fallbackChildren,
      resetSSRHead: () => {
        state.fallbackChildren = []
      },
    }
    target[HEAD_STATE_ACCESSORS] = state
  }
  return target[HEAD_STATE_ACCESSORS]!
})()
export const _clientHeadChildren = new Map<symbol, unknown>()

export const _getSSRHeadChildren = (): unknown[] => sharedHeadState.getSSRHeadChildren()

/**
 * Register ALS-backed state accessors. Called by head-state.ts on import.
 * @internal
 */
export function _registerHeadStateAccessors(accessors: {
  getSSRHeadChildren: () => unknown[]
  resetSSRHead: () => void
}): void {
  sharedHeadState.getSSRHeadChildren = accessors.getSSRHeadChildren
  sharedHeadState.resetSSRHead = accessors.resetSSRHead
}

/** Reset the SSR head collector. Call before render. */
export function resetSSRHead(): void {
  sharedHeadState.resetSSRHead()
}

/** Get collected head HTML. Call after render. */
export function getSSRHeadHTML(): string {
  return reduceHeadChildren(_getSSRHeadChildren())
    .map(child => headChildToHTML(child.type, child.props, { includeTextHeadMarker: true }))
    .filter(Boolean)
    .join('\n  ')
}

export async function getSSRHeadHTMLAsync(): Promise<string> {
  return getSSRHeadHTML()
}

/**
 * Tags allowed inside <head>. Anything else is silently dropped.
 * This prevents injection of dangerous elements like <iframe>, <object>, etc.
 */
const ALLOWED_HEAD_TAGS = new Set(['title', 'meta', 'link', 'style', 'script', 'base', 'noscript'])
const ALLOWED_HEAD_TAGS_LIST = Array.from(ALLOWED_HEAD_TAGS).join(', ')
const META_TYPES = ['name', 'httpEquiv', 'charSet', 'itemProp'] as const

/** Self-closing tags: no inner content, emit as <tag ... /> */
const SELF_CLOSING_HEAD_TAGS = new Set(['meta', 'link', 'base'])

/** Tags whose content is raw text — closing-tag sequences must be escaped during SSR. */
const RAW_CONTENT_TAGS = new Set(['script', 'style'])

type HeadDOMElement = Pick<HTMLElement, 'innerHTML' | 'setAttribute' | 'textContent'>

function warnDisallowedHeadTag(tag: string): void {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      `[text] <Head> ignoring disallowed tag <${tag}>. ` +
        `Only ${ALLOWED_HEAD_TAGS_LIST} are allowed.`,
    )
  }
}

function isHeadRecord(value: unknown): value is HeadRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    Reflect.get(value, RUE_HEAD_RECORD) === true &&
    typeof Reflect.get(value, 'type') === 'string'
  )
}

function flattenHeadChildren(children: unknown, out: unknown[] = []): unknown[] {
  if (Array.isArray(children)) {
    for (const child of children) {
      flattenHeadChildren(child, out)
    }
    return out
  }

  out.push(children)
  return out
}

function collectHeadElements(list: HeadRecord[], child: unknown): HeadRecord[] {
  if (
    child == null ||
    typeof child === 'boolean' ||
    typeof child === 'string' ||
    typeof child === 'number'
  ) {
    return list
  }

  if (isHeadRecord(child)) {
    if (!ALLOWED_HEAD_TAGS.has(child.type)) {
      warnDisallowedHeadTag(child.type)
      return list
    }
    return list.concat(child)
  }

  return list
}

function normalizeHeadKey(key: string | number | null): string | null {
  if (key == null) return null
  const normalizedKey = String(key)
  const separatorIndex = normalizedKey.indexOf('$')
  return separatorIndex > 0 ? normalizedKey.slice(separatorIndex + 1) : normalizedKey
}

function createUniqueHeadFilter(): (child: HeadRecord) => boolean {
  const keys = new Set<string>()
  const tags = new Set<string>()
  const metaTypes = new Set<string>()
  const metaCategories = new Map<string, Set<string>>()

  return child => {
    let isUnique = true
    const normalizedKey = normalizeHeadKey(child.key)
    const hasKey = normalizedKey !== null
    if (normalizedKey) {
      if (keys.has(normalizedKey)) {
        isUnique = false
      } else {
        keys.add(normalizedKey)
      }
    }

    switch (child.type) {
      case 'title':
      case 'base':
        if (tags.has(child.type)) {
          isUnique = false
        } else {
          tags.add(child.type)
        }
        break
      case 'meta': {
        const props = child.props as Record<string, unknown>
        for (const metaType of META_TYPES) {
          if (!Object.prototype.hasOwnProperty.call(props, metaType)) continue
          if (metaType === 'charSet') {
            if (metaTypes.has(metaType)) {
              isUnique = false
            } else {
              metaTypes.add(metaType)
            }
            continue
          }

          const category = props[metaType]
          if (typeof category !== 'string') continue

          let categories = metaCategories.get(metaType)
          if (!categories) {
            categories = new Set<string>()
            metaCategories.set(metaType, categories)
          }

          if ((metaType !== 'name' || !hasKey) && categories.has(category)) {
            isUnique = false
          } else {
            categories.add(category)
          }
        }
        break
      }
      default:
        break
    }

    return isUnique
  }
}

export function reduceHeadChildren(headChildren: unknown[]): HeadRecord[] {
  return headChildren
    .reduce<unknown[]>(
      (flattenedChildren, child) => flattenHeadChildren(child, flattenedChildren),
      [],
    )
    .reduce(collectHeadElements, [])
    .reverse()
    .filter(createUniqueHeadFilter())
    .reverse()
}

/**
 * Validate an HTML attribute name. Rejects names that could break out of
 * the attribute context during SSR serialization, or that represent inline
 * event handlers (on*). Only allows alphanumeric characters, hyphens, and
 * common data-attribute patterns.
 */
const SAFE_ATTR_NAME_RE = /^[a-zA-Z][a-zA-Z0-9\-:.]*$/

export function isSafeAttrName(name: string): boolean {
  if (!SAFE_ATTR_NAME_RE.test(name)) return false
  // Block inline event handlers (onclick, onerror, etc.)
  if (name.length > 2 && name[0] === 'o' && name[1] === 'n' && name[2] >= 'A' && name[2] <= 'z')
    return false
  return true
}

/**
 * Convert props + tag to an HTML string for SSR head injection.
 * Callers must only pass tags that have already been validated against
 * ALLOWED_HEAD_TAGS (e.g. via reduceHeadChildren / collectHeadElements).
 */
export function headRecordToHTML(
  record: Pick<HeadRecord, 'props' | 'type'>,
  options: { includeTextHeadMarker?: boolean } = {},
): string {
  return headChildToHTML(record.type, record.props, options)
}

function headChildToHTML(
  tag: string,
  props: Record<string, unknown>,
  options: { includeTextHeadMarker?: boolean },
): string {
  const attrs: string[] = []
  let innerHTML = ''

  // dangerouslySetInnerHTML takes precedence over children, regardless of
  // prop iteration order. Check it first to match Text.js semantics.
  const rawHtml = getDangerouslySetInnerHTML(props.dangerouslySetInnerHTML)
  if (rawHtml != null) {
    // Intentionally raw — developer explicitly opted in.
    // SECURITY NOTE: This injects raw HTML. Developers must never pass
    // unsanitized user input here — it is a stored XSS vector.
    innerHTML = rawHtml
  } else if (typeof props.children === 'string') {
    innerHTML = escapeHTML(props.children)
  } else if (Array.isArray(props.children)) {
    innerHTML = escapeHTML(props.children.join(''))
  }

  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || key === 'dangerouslySetInnerHTML') {
      continue
    } else if (key === 'className') {
      attrs.push(`class="${escapeAttr(String(value))}"`)
    } else if (typeof value === 'string') {
      if (!isSafeAttrName(key)) continue
      attrs.push(`${normalizeHTMLAttrName(key)}="${escapeAttr(value)}"`)
    } else if (typeof value === 'boolean' && value) {
      if (!isSafeAttrName(key)) continue
      attrs.push(normalizeHTMLAttrName(key))
    }
  }

  const attrStr = attrs.length ? ' ' + attrs.join(' ') : ''
  const markerAttr = options.includeTextHeadMarker ? ' data-text-head=""' : ''

  if (SELF_CLOSING_HEAD_TAGS.has(tag)) {
    return `<${tag}${attrStr}${markerAttr} />`
  }

  // For raw-content tags (script, style), escape closing-tag sequences so the
  // HTML parser doesn't prematurely terminate the element.
  if (RAW_CONTENT_TAGS.has(tag) && innerHTML) {
    innerHTML = escapeInlineContent(innerHTML, tag)
  }

  return `<${tag}${attrStr}${markerAttr}>${innerHTML}</${tag}>`
}

function normalizeHTMLAttrName(name: string): string {
  if (name === 'hrefLang') return 'hreflang'
  if (name === 'httpEquiv') return 'http-equiv'
  return name
}

function escapeHTML(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Escape content that will be placed inside a raw <script> or <style> tag
 * during SSR. The HTML parser treats `</script>` (or `</style>`) as the end
 * of the block regardless of JavaScript string context, so any occurrence
 * of `</` followed by the tag name must be escaped.
 *
 * We replace `</script` and `</style` (case-insensitive) with `<\/script`
 * and `<\/style` respectively. The `<\/` form is harmless in JS/CSS string
 * context but prevents the HTML parser from seeing a closing tag.
 */
export function escapeInlineContent(content: string, tag: string): string {
  // Build a pattern like `<\/script` or `<\/style`, case-insensitive.
  // `tag` is always a literal developer-controlled value ("script" or "style")
  // guarded by the RAW_CONTENT_TAGS.has(tag) check at all call sites — never user input.
  const pattern = new RegExp(`<\\/(${tag})`, 'gi')
  return content.replace(pattern, '<\\/$1')
}

function getDangerouslySetInnerHTML(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined

  const html = Reflect.get(value, '__html')
  return typeof html === 'string' ? html : undefined
}

export function _applyHeadPropsToElement(
  domEl: HeadDOMElement,
  props: Record<string, unknown>,
): void {
  const rawHtml = getDangerouslySetInnerHTML(props.dangerouslySetInnerHTML)

  if (rawHtml != null) {
    domEl.innerHTML = rawHtml
  } else if (typeof props.children === 'string') {
    domEl.textContent = props.children
  } else if (Array.isArray(props.children)) {
    domEl.textContent = props.children.join('')
  }

  for (const [key, value] of Object.entries(props)) {
    if (key === 'children' || key === 'dangerouslySetInnerHTML') {
      continue
    } else if (key === 'className') {
      domEl.setAttribute('class', String(value))
    } else if (typeof value === 'boolean' && value) {
      if (!isSafeAttrName(key)) continue
      domEl.setAttribute(key, '')
    } else if (typeof value === 'string') {
      if (!isSafeAttrName(key)) continue
      domEl.setAttribute(key, value)
    }
  }
}

export function syncClientHead(): void {
  document.querySelectorAll('[data-text-head]').forEach(el => el.remove())

  for (const child of reduceHeadChildren([..._clientHeadChildren.values()])) {
    if (typeof child.type !== 'string') continue

    const domEl = document.createElement(child.type)
    const props = child.props as Record<string, unknown>
    _applyHeadPropsToElement(domEl, props)

    domEl.setAttribute('data-text-head', '')
    document.head.appendChild(domEl)
  }
}

export function isRueServerRender(): boolean {
  return typeof (globalThis as Record<string, unknown>).__rue_is_server_rendering__ === 'number'
}

/** Convert already-written head DOM into the explicit metadata record schema. */
export function headElementRecord(
  tag: string,
  attrs: ReadonlyArray<{ name: string; value: string }>,
  html: string,
  text: string,
  key: unknown,
): HeadRecord {
  const names: Record<string, string> = {
    charset: 'charSet',
    'http-equiv': 'httpEquiv',
    itemprop: 'itemProp',
  }
  const props: Record<string, unknown> = Object.fromEntries(
    attrs
      .filter(attr => attr.name !== 'data-text-head')
      .map(attr => [
        names[attr.name] ?? attr.name,
        ['async', 'defer', 'nomodule', 'disabled'].includes(attr.name) ? true : attr.value,
      ]),
  )
  if (tag === 'script' || tag === 'style' || tag === 'noscript')
    props.dangerouslySetInnerHTML = { __html: html }
  else props.children = text
  return createHeadRecord(
    tag,
    props,
    typeof key === 'string' || typeof key === 'number' ? key : null,
  )
}
