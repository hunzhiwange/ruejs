import { CUSTOM_ELEMENT_SYNC_PROPS_KEY } from '../custom-elements.shared'
import {
  setFormControlProperty,
  setFormControlValue,
  syncFormControlAfterMutation,
} from '../compiler-runtime/form-controls'
import { installFormControlMutationSync } from '../compiler-runtime/dom.browser'

export type DOMProps = Record<string, unknown> | null | undefined

export type DOMEventOperations = {
  addEventListener?: (element: Element, event: string, listener: EventListener) => void
  removeEventListener?: (element: Element, event: string, listener: EventListener) => void
}

const isEventPropName = (name: string) =>
  name.length > 2 && name.startsWith('on') && /[A-Z]/.test(name[2] ?? '')

const toEventName = (name: string) => {
  const event = name.slice(2).toLowerCase()
  // JSX focus handlers are expected to observe focus changes from descendants.
  // Native focus/blur do not bubble, while focusin/focusout preserve that semantic.
  return event === 'focus' ? 'focusin' : event === 'blur' ? 'focusout' : event
}

const normalizeAttributeName = (name: string) =>
  name === 'className' ? 'class' : name === 'htmlFor' ? 'for' : name

const extractInnerHTML = (value: unknown) =>
  value && typeof value === 'object' && '__html' in (value as Record<string, unknown>)
    ? (value as Record<string, unknown>).__html
    : undefined

const isCustomElement = (element: Element) => element.tagName.includes('-')

const isObjectOrFunction = (value: unknown) =>
  value != null && (typeof value === 'object' || typeof value === 'function')

const shouldUseDOMProperty = (element: Element, key: string, value: unknown) => {
  if (key === 'list' || key === 'form') return false
  if (!isCustomElement(element)) return key in element
  if (key === 'props' || key === '__rue_slots' || key.startsWith('__rue_context_')) return true
  return key in element || isObjectOrFunction(value)
}

const notifyCustomElementPropertyChanged = (element: Element) => {
  const sync = (element as unknown as Record<string, unknown>)[CUSTOM_ELEMENT_SYNC_PROPS_KEY]
  if (typeof sync === 'function') sync.call(element)
}

export const applyDOMRef = (ref: unknown, value: Element | null): void => {
  if (typeof ref === 'function') ref(value)
  else if (ref && typeof ref === 'object') {
    if ('current' in ref) (ref as { current: unknown }).current = value
    else if ('value' in ref) (ref as { value: unknown }).value = value
  }
}

// HTML pattern values are compiled with the `v` flag by modern browsers. Under
// those rules a literal hyphen at either edge of a character class must be
// escaped, even though the same spelling was accepted by the former `u`-flag
// behavior. Keep ranges such as A-Z intact while accepting legacy edge literals.
export const normalizeHTMLPattern = (value: string): string => {
  let normalized = ''
  let inClass = false
  let firstClassToken = false

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (character === '\\') {
      normalized += character
      if (index + 1 < value.length) normalized += value[++index]
      firstClassToken = false
      continue
    }
    if (!inClass && character === '[') {
      inClass = true
      firstClassToken = true
      normalized += character
      continue
    }
    if (inClass && character === '^' && firstClassToken) {
      normalized += character
      continue
    }
    if (inClass && character === ']') {
      inClass = false
      firstClassToken = false
      normalized += character
      continue
    }
    if (inClass && character === '-' && (firstClassToken || value[index + 1] === ']')) {
      normalized += '\\-'
    } else {
      normalized += character
    }
    firstClassToken = false
  }

  return normalized
}

export const setDOMAttribute = (element: Element, name: string, value: unknown): void => {
  const stringValue = String(value)
  element.setAttribute(name, name === 'pattern' ? normalizeHTMLPattern(stringValue) : stringValue)
}

export const setDOMClassName = (element: Element, value: unknown): void => {
  const className = value == null || value === false ? '' : String(value)
  if (element instanceof SVGElement) element.setAttribute('class', className)
  else (element as HTMLElement).className = className
}

const setStyleField = (style: CSSStyleDeclaration, key: string, value: unknown): void => {
  if (key.startsWith('--') || key.includes('-')) {
    if (value == null || value === '') style.removeProperty(key)
    else style.setProperty(key, String(value))
    return
  }
  Reflect.set(style, key, value == null ? '' : value)
}

export const setDOMStyle = (element: Element, value: unknown): void => {
  const style = (element as HTMLElement).style
  style.cssText = ''
  if (value && typeof value === 'object') {
    for (const [key, field] of Object.entries(value)) setStyleField(style, key, field)
  } else if (value != null && value !== false) {
    style.cssText = String(value)
  }
}

export const patchDOMStyle = (element: Element, previous: unknown, value: unknown): void => {
  if (previous && value && typeof previous === 'object' && typeof value === 'object') {
    const style = (element as HTMLElement).style
    for (const key of Object.keys(previous)) {
      if (!(key in value)) setStyleField(style, key, '')
    }
    for (const [key, field] of Object.entries(value)) setStyleField(style, key, field)
    return
  }
  setDOMStyle(element, value)
}

export const setDOMInnerHTML = (element: Element, value: unknown): void => {
  element.innerHTML = value == null ? '' : String(value)
}

export const setDOMValue = (element: Element, value: unknown): void => {
  installFormControlMutationSync(syncFormControlAfterMutation)
  setFormControlValue(element, value)
}

export const setDOMChecked = (element: Element, value: boolean): void => {
  const target = element as Element & { checked?: boolean }
  if (target.checked !== undefined) target.checked = value
  else if (value) element.setAttribute('checked', '')
  else element.removeAttribute('checked')
}

export const setDOMDisabled = (element: Element, value: boolean): void => {
  const target = element as Element & { disabled?: boolean }
  if (target.disabled !== undefined) target.disabled = value
  else if (value) element.setAttribute('disabled', '')
  else element.removeAttribute('disabled')
}

export const setDOMProperty = (element: Element, name: string, value: unknown): void => {
  installFormControlMutationSync(syncFormControlAfterMutation)
  if (setFormControlProperty(element, name, value)) return

  const target = element as unknown as Record<string, unknown>
  if (name === 'pattern' && typeof value === 'string') value = normalizeHTMLPattern(value)
  if (isCustomElement(element)) {
    if (value == null || value === false) {
      try {
        delete target[name]
      } catch {
        target[name] = undefined
      }
    } else {
      target[name] = value
    }
    notifyCustomElementPropertyChanged(element)
    return
  }

  if (value == null || value === false) {
    const current = target[name]
    target[name] =
      typeof current === 'boolean' ? false : typeof current === 'string' ? '' : undefined
  } else {
    target[name] = value
  }
}

const addEvent = (
  operations: DOMEventOperations,
  element: Element,
  event: string,
  listener: EventListener,
) =>
  (
    operations.addEventListener ??
    ((target, name, handler) => target.addEventListener(name, handler))
  )(element, event, listener)

const removeEvent = (
  operations: DOMEventOperations,
  element: Element,
  event: string,
  listener: EventListener,
) =>
  (
    operations.removeEventListener ??
    ((target, name, handler) => target.removeEventListener(name, handler))
  )(element, event, listener)

export const cleanupDOMPropLifecycle = (
  element: Element,
  key: string,
  value: unknown,
  operations: DOMEventOperations = {},
): void => {
  if (key === 'ref') {
    if (value != null) applyDOMRef(value, null)
    return
  }
  if (isEventPropName(key) && typeof value === 'function') {
    removeEvent(operations, element, toEventName(key), value as EventListener)
  }
}

export const patchDOMProp = (
  element: Element,
  key: string,
  value: unknown,
  previous: unknown,
  operations: DOMEventOperations = {},
): boolean => {
  if (key === 'children' || key === 'key') return false

  if (key === 'ref') {
    if (!Object.is(previous, value)) {
      if (previous != null) applyDOMRef(previous, null)
      if (value != null) applyDOMRef(value, element)
    }
    return false
  }

  if (key === 'dangerouslySetInnerHTML') {
    setDOMInnerHTML(element, extractInnerHTML(value))
    return extractInnerHTML(value) != null
  }

  if (isEventPropName(key)) {
    const event = toEventName(key)
    if (typeof previous === 'function' && previous !== value) {
      removeEvent(operations, element, event, previous as EventListener)
    }
    if (typeof value === 'function' && previous !== value) {
      addEvent(operations, element, event, value as EventListener)
    }
    return false
  }

  if (key === 'className') {
    if (value == null || value === false) element.removeAttribute('class')
    else setDOMClassName(element, value)
    return false
  }

  if (key === 'style') {
    patchDOMStyle(element, previous, value)
    return false
  }

  if (key === 'value') {
    setDOMValue(element, value)
    return false
  }

  if (key === 'checked') {
    setDOMChecked(element, !!value)
    return false
  }

  if (key === 'disabled') {
    setDOMDisabled(element, !!value)
    return false
  }

  if (key === 'tabIndex') {
    ;(element as HTMLElement).tabIndex = value == null || value === false ? -1 : Number(value)
    if (value == null || value === false) element.removeAttribute('tabindex')
    return false
  }

  if (shouldUseDOMProperty(element, key, value) || shouldUseDOMProperty(element, key, previous)) {
    setDOMProperty(element, key, value)
    if (value == null || value === false) element.removeAttribute(normalizeAttributeName(key))
    return false
  }

  const attribute = normalizeAttributeName(key)
  if (value == null || value === false) element.removeAttribute(attribute)
  else setDOMAttribute(element, attribute, value === true ? '' : value)
  return false
}

export const patchDOMProps = (
  element: Element,
  next: DOMProps,
  previous: DOMProps = undefined,
  operations: DOMEventOperations = {},
): boolean => {
  const current = next && typeof next === 'object' ? next : {}
  const prior = previous && typeof previous === 'object' ? previous : {}
  let hasInnerHTML = false

  for (const key of Object.keys(prior)) {
    if (!(key in current)) patchDOMProp(element, key, undefined, prior[key], operations)
  }
  for (const key of Object.keys(current)) {
    if (!Object.is(current[key], prior[key]) || !(key in prior)) {
      hasInnerHTML =
        patchDOMProp(element, key, current[key], prior[key], operations) || hasInnerHTML
    }
  }
  return hasInnerHTML
}
