import { onOwnerCleanup } from './internal-reactive'
import { _$compiledSpreadAttributes } from './compiled-dom-bindings'
import { setValue as setDOMValue } from './dom'
import {
  appendChild,
  createComment,
  createDocumentFragment,
  createElement,
  createTextNode,
  insertBefore,
} from './compiler-runtime/dom.browser'

export const _$createElement = (tag: string, parent?: Node | null): Element =>
  createElement(tag, parent)
export const _$createComment = (value = ''): Comment => createComment(value)
export const _$createTextNode = (value = ''): Text => createTextNode(value)
export const _$createDocumentFragment = (parent?: Node | null): DocumentFragment =>
  createDocumentFragment(parent)
export const _$appendChild = (parent: Node, child: Node): Node => {
  appendChild(parent, child)
  return child
}
export const _$insertBefore = (parent: Node, child: Node, anchor: Node | null): Node => {
  insertBefore(parent, child, anchor)
  return child
}

export const _$setAttribute = (element: Element, name: string, value: unknown): void => {
  if (value == null || value === false || value === 'undefined') element.removeAttribute(name)
  else element.setAttribute(name, String(value))
}

export const _$setStyle = (element: HTMLElement | SVGElement, value: unknown): void => {
  if (typeof value === 'string') {
    element.setAttribute('style', value)
    return
  }
  element.removeAttribute('style')
  if (value && typeof value === 'object') {
    const style = (element as HTMLElement).style
    const usesNativeStyleDeclaration = typeof style.setProperty === 'function'
    const declarations: string[] = []
    for (const [name, entry] of Object.entries(value)) {
      if (entry == null || entry === false) continue
      const cssName = name.startsWith('--')
        ? name
        : name.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)
      const cssValue = String(entry)
      declarations.push(`${cssName}: ${cssValue}`)
      if ((name.startsWith('--') || name.includes('-')) && usesNativeStyleDeclaration) {
        style.setProperty(name, cssValue)
      } else {
        Reflect.set(style, name, entry)
      }
    }
    if (!usesNativeStyleDeclaration && declarations.length > 0) {
      element.setAttribute('style', declarations.join('; '))
    }
  }
}

export const _$setValue = (
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
  value: unknown,
): void => {
  if (element.tagName === 'SELECT') {
    setDOMValue(element, value)
    return
  }

  const textElement = element as HTMLInputElement | HTMLTextAreaElement
  const document = textElement.ownerDocument
  const wasFocused = document?.activeElement === textElement
  const selectionStart = wasFocused ? textElement.selectionStart : null
  const selectionEnd = wasFocused ? textElement.selectionEnd : null
  const selectionDirection = wasFocused ? textElement.selectionDirection : null
  textElement.value = value == null ? '' : String(value)
  if (wasFocused && document?.activeElement !== textElement) textElement.focus()
  if (wasFocused && selectionStart != null && selectionEnd != null) {
    const length = textElement.value.length
    textElement.setSelectionRange(
      Math.min(selectionStart, length),
      Math.min(selectionEnd, length),
      selectionDirection ?? undefined,
    )
  }
  if (wasFocused && typeof queueMicrotask === 'function') {
    queueMicrotask(() => {
      if (!textElement.isConnected || document == null) return
      const active = document.activeElement
      if (active != null && active !== document.body && active !== document.documentElement) return
      textElement.focus()
      if (selectionStart != null && selectionEnd != null) {
        const length = textElement.value.length
        textElement.setSelectionRange(
          Math.min(selectionStart, length),
          Math.min(selectionEnd, length),
          selectionDirection ?? undefined,
        )
      }
    })
  }
}
export const _$setChecked = (element: HTMLInputElement, value: unknown): void => {
  element.checked = Boolean(value)
}
export const _$setDisabled = (
  element: HTMLButtonElement | HTMLInputElement,
  value: unknown,
): void => {
  element.disabled = Boolean(value)
}

export const _$spreadAttributes = (
  element: Element,
  values: Record<string, unknown> | null | undefined,
  excluded: readonly string[] = [],
): void => {
  _$compiledSpreadAttributes(element, () => values, excluded)
}

export const _$compiledBindUseRef = (element: Element, readRef: () => unknown): void => {
  const target = readRef()
  if (typeof target === 'function') {
    const cleanup = target(element)
    if (typeof cleanup === 'function') onOwnerCleanup(cleanup)
  } else if (target && typeof target === 'object' && 'current' in target) {
    ;(target as { current: unknown }).current = element
    onOwnerCleanup(() => {
      ;(target as { current: unknown }).current = null
    })
  }
}

const compiledKeys = new WeakMap<object, unknown>()

export const _$compiledWithKey = <T>(value: T, key: unknown): T => {
  if ((typeof value === 'object' && value != null) || typeof value === 'function') {
    compiledKeys.set(value as object, key)
  }
  return value
}

export const getCompiledKey = (value: unknown): unknown =>
  (typeof value === 'object' && value != null) || typeof value === 'function'
    ? compiledKeys.get(value as object)
    : undefined

export const _$compiledShowStyle = (style: unknown, condition: unknown): unknown => {
  if (typeof style === 'string') return condition ? style : `${style}; display: none`
  return { ...(style && typeof style === 'object' ? style : {}), display: condition ? '' : 'none' }
}

export const _$compiledWithEventModifiers = <T extends (event: any) => unknown>(
  handler: T,
  modifiers: string[],
): T =>
  ((event: any) => {
    for (const modifier of modifiers) {
      if (modifier === 'stop') event.stopPropagation?.()
      else if (modifier === 'prevent') event.preventDefault?.()
      else if (modifier === 'self' && event.target !== event.currentTarget) return
      else if (['ctrl', 'shift', 'alt', 'meta'].includes(modifier) && !event[`${modifier}Key`])
        return
      else if (modifier === 'enter' && event.key !== 'Enter') return
      else if (/^\d+$/.test(modifier) && Number(modifier) !== (event.keyCode ?? event.which)) return
    }
    return handler(event)
  }) as T

export const _$compiledWithNativeEvents = <T>(value: T, _events: Record<string, unknown>): T =>
  value

export const _$addEventListener = (
  element: EventTarget,
  name: string,
  listener: EventListener,
  options?: AddEventListenerOptions,
): (() => void) => {
  element.addEventListener(name, listener, options)
  const cleanup = () => element.removeEventListener(name, listener, options)
  onOwnerCleanup(cleanup)
  return cleanup
}

export const _$setInnerHTML = (element: Element, value: unknown): void => {
  element.innerHTML = value == null ? '' : String(value)
}

export const _$setProperty = (element: object, name: PropertyKey, value: unknown): void => {
  Reflect.set(element, name, value)
}

export const _$settextContent = (element: Node, value: unknown): void => {
  element.textContent = value == null ? '' : String(value)
}

export const _$createTextWrapper = (value: unknown): Text =>
  document.createTextNode(value == null ? '' : String(value))

// Keep the runtime helper ABI aligned with the current SWC transform. The
// implementations retain their historical names for compatibility with older
// generated output, while current compiler output imports the compiled names.
