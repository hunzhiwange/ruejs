type FormControlNodeLike = {
  firstChild?: FormControlNodeLike | null
}

const RUE_PENDING_SELECT_VALUE = Symbol('rue.pendingSelectValue')
const RUE_CONTROLLED_MULTI_SELECT_TOGGLE = Symbol('rue.controlledMultiSelectToggle')
const RUE_CONTROLLED_TEXT_VALUE = Symbol('rue.controlledTextValue')
const RUE_TEXT_CONTROL_COMPOSING_KEY = '__rue_is_composing__'
const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
])

type TextControl = {
  tagName?: unknown
  type?: unknown
  ownerDocument?: Document | null
}

let trackedTextControl: TextControl | null = null
let textControlTrackingInstalled = false
let textControlRestoreSuppressedByPointer = false
let trackedTextControlIdentity: {
  dataTestId?: string
  id?: string
  name?: string
  placeholder?: string
  tagName: string
  type?: string
} | null = null

const isTextControlElement = (value: unknown): value is TextControl => {
  if (!value || typeof value !== 'object') return false

  const tagName =
    typeof (value as { tagName?: unknown }).tagName === 'string'
      ? ((value as { tagName: string }).tagName as string).toUpperCase()
      : ''
  if (tagName === 'TEXTAREA') return true
  if (tagName !== 'INPUT') return false

  const inputType =
    typeof (value as { type?: unknown }).type === 'string'
      ? ((value as { type: string }).type as string).toLowerCase()
      : 'text'
  return !NON_TEXT_INPUT_TYPES.has(inputType)
}

const rememberTrackedTextControl = (event: Event) => {
  if (!isTextControlElement(event.target)) return

  textControlRestoreSuppressedByPointer = false
  trackedTextControl = event.target
  const target = event.target as {
    getAttribute?: (name: string) => string | null
    id?: string
    name?: string
    placeholder?: string
    tagName?: string
    type?: string
  }
  trackedTextControlIdentity = {
    dataTestId: target.getAttribute?.('data-testid') ?? undefined,
    id: typeof target.id === 'string' && target.id ? target.id : undefined,
    name: typeof target.name === 'string' && target.name ? target.name : undefined,
    placeholder:
      typeof target.placeholder === 'string' && target.placeholder ? target.placeholder : undefined,
    tagName: typeof target.tagName === 'string' ? target.tagName.toUpperCase() : 'INPUT',
    type: typeof target.type === 'string' && target.type ? target.type.toLowerCase() : undefined,
  }
}

const setTrackedTextControlComposing = (event: Event, composing: boolean) => {
  if (!isTextControlElement(event.target)) return
  textControlRestoreSuppressedByPointer = false
  trackedTextControl = event.target
  ;(event.target as unknown as Record<string, unknown>)[RUE_TEXT_CONTROL_COMPOSING_KEY] = composing
}

const updateTextControlRestoreSuppressionFromPointer = (event: Event) => {
  textControlRestoreSuppressedByPointer = !isTextControlElement(event.target)
}

const clearTrackedTextControl = (event: Event) => {
  if (!trackedTextControl || event.target !== trackedTextControl) return
  if (trackedTextControl.ownerDocument?.activeElement !== trackedTextControl) {
    trackedTextControl = null
  }
}

/** Keep form state current before delegated handlers can trigger reactive DOM writes. */
export const trackFormControlEvent = (event: Event) => {
  switch (event.type) {
    case 'pointerdown':
    case 'mousedown':
      updateTextControlRestoreSuppressionFromPointer(event)
      break
    case 'focusin':
    case 'input':
    case 'compositionupdate':
      rememberTrackedTextControl(event)
      break
    case 'compositionstart':
      setTrackedTextControlComposing(event, true)
      break
    case 'compositionend':
      setTrackedTextControlComposing(event, false)
      break
    case 'focusout':
      clearTrackedTextControl(event)
      break
  }
}

const ensureTextControlTracking = () => {
  if (textControlTrackingInstalled) return
  const ownerDocument = globalThis.document
  if (!ownerDocument) return

  textControlTrackingInstalled = true
  for (const type of [
    'pointerdown',
    'mousedown',
    'focusin',
    'input',
    'compositionstart',
    'compositionupdate',
    'compositionend',
    'focusout',
  ]) {
    ownerDocument.addEventListener(type, trackFormControlEvent, true)
  }
}

const escapeSelectorValue = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')

const resolveTrackedTextControlWithin = (parent: FormControlNodeLike | null | undefined) => {
  if (!parent) return null
  const contains = (parent as { contains?: (node: unknown) => boolean }).contains
  if (
    isTextControlElement(trackedTextControl) &&
    typeof contains === 'function' &&
    contains.call(parent, trackedTextControl)
  ) {
    return trackedTextControl
  }

  const querySelector = (parent as { querySelector?: (selector: string) => Element | null })
    .querySelector
  if (typeof querySelector !== 'function' || !trackedTextControlIdentity) return null

  const { dataTestId, id, name, placeholder, tagName, type } = trackedTextControlIdentity
  const selectors = [
    dataTestId ? `[data-testid="${escapeSelectorValue(dataTestId)}"]` : null,
    id ? `#${escapeSelectorValue(id)}` : null,
    name ? `${tagName.toLowerCase()}[name="${escapeSelectorValue(name)}"]` : null,
    placeholder
      ? `${tagName.toLowerCase()}[placeholder="${escapeSelectorValue(placeholder)}"]`
      : null,
    type ? `${tagName.toLowerCase()}[type="${escapeSelectorValue(type)}"]` : tagName.toLowerCase(),
  ]
  for (const selector of selectors) {
    if (!selector) continue
    const matched = querySelector.call(parent, selector)
    if (isTextControlElement(matched)) {
      trackedTextControl = matched
      return matched
    }
  }
  return null
}

const isConnectedNodeLike = (value: unknown) => {
  if (!value || typeof value !== 'object') return false
  const isConnected = (value as { isConnected?: unknown }).isConnected
  if (typeof isConnected === 'boolean') return isConnected
  const ownerDocument = (value as { ownerDocument?: Document | null }).ownerDocument
  return typeof ownerDocument?.contains === 'function'
    ? ownerDocument.contains(value as Node)
    : true
}

export const hasActiveTextControlWithin = (parent: FormControlNodeLike | null | undefined) => {
  ensureTextControlTracking()
  if (!parent || textControlRestoreSuppressedByPointer) return false
  const contains = (parent as { contains?: (node: unknown) => boolean }).contains
  if (typeof contains !== 'function') return false

  const active = globalThis.document?.activeElement
  if (isTextControlElement(active) && contains.call(parent, active)) return true
  const tracked = resolveTrackedTextControlWithin(parent)
  if (!isTextControlElement(tracked)) return false
  const currentActive = tracked.ownerDocument?.activeElement
  if (currentActive && currentActive !== tracked && currentActive !== tracked.ownerDocument?.body) {
    return false
  }
  return contains.call(parent, tracked)
}

export const hasActiveUncontrolledTextControlWithin = (
  parent: FormControlNodeLike | null | undefined,
) => {
  if (!hasActiveTextControlWithin(parent) || !parent) return false
  const contains = (parent as { contains?: (node: unknown) => boolean }).contains
  if (typeof contains !== 'function') return false
  const active = globalThis.document?.activeElement
  const candidate =
    isTextControlElement(active) && contains.call(parent, active)
      ? active
      : resolveTrackedTextControlWithin(parent)
  return (
    isTextControlElement(candidate) &&
    (candidate as Record<PropertyKey, unknown>)[RUE_CONTROLLED_TEXT_VALUE] !== true
  )
}

export const restoreTrackedTextControlWithin = (parent: FormControlNodeLike | null | undefined) => {
  ensureTextControlTracking()
  if (textControlRestoreSuppressedByPointer) return false
  const tracked = resolveTrackedTextControlWithin(parent)
  if (!parent || !isTextControlElement(tracked)) return false
  if (!isConnectedNodeLike(parent) || !isConnectedNodeLike(tracked)) {
    trackedTextControl = null
    return false
  }
  const contains = (parent as { contains?: (node: unknown) => boolean }).contains
  if (typeof contains !== 'function' || !contains.call(parent, tracked)) return false
  const activeElement = tracked.ownerDocument?.activeElement
  if (activeElement && activeElement !== tracked && activeElement !== tracked.ownerDocument?.body) {
    return false
  }
  if (activeElement === tracked) return true
  const focus = (tracked as { focus?: () => void }).focus
  if (typeof focus === 'function') focus.call(tracked)
  return tracked.ownerDocument?.activeElement === tracked
}

const getSelectOwner = (node: any): HTMLSelectElement | null => {
  const parent = node?.parentElement ?? null
  if (!parent || typeof parent.tagName !== 'string') return null
  const parentTag = parent.tagName.toUpperCase()
  if (parentTag === 'SELECT') return parent as HTMLSelectElement
  if (parentTag === 'OPTGROUP') {
    const select = parent.parentElement
    if (select?.tagName?.toUpperCase() === 'SELECT') return select as HTMLSelectElement
  }
  return null
}

const syncPendingSelectValue = (select: any) => {
  if (select?.tagName?.toUpperCase() !== 'SELECT') return
  const pendingValue = select[RUE_PENDING_SELECT_VALUE]
  if (pendingValue === undefined) return

  if (select.multiple) {
    const values = new Set(
      (Array.isArray(pendingValue) ? pendingValue : pendingValue == null ? [] : [pendingValue]).map(
        String,
      ),
    )
    installControlledMultiSelectToggle(select)
    for (const option of select.options as HTMLOptionsCollection) {
      option.selected = values.has(option.value)
    }
  } else {
    const value = Array.isArray(pendingValue) ? pendingValue[0] : pendingValue
    select.value = value == null ? '' : String(value)
  }
}

const installControlledMultiSelectToggle = (select: any) => {
  if (select[RUE_CONTROLLED_MULTI_SELECT_TOGGLE]) return
  select[RUE_CONTROLLED_MULTI_SELECT_TOGGLE] = true
  let handledOption: HTMLOptionElement | null = null
  select.addEventListener('mousedown', (event: MouseEvent) => {
    handledOption = null
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || select.disabled) {
      return
    }
    const option = event.target as HTMLOptionElement | null
    if (
      !option ||
      option.tagName?.toUpperCase() !== 'OPTION' ||
      option.disabled ||
      getSelectOwner(option) !== select
    ) {
      return
    }
    const controlledValue = select[RUE_PENDING_SELECT_VALUE]
    if (!Array.isArray(controlledValue)) return

    event.preventDefault()
    handledOption = option
    const nextValues = new Set(controlledValue.map(String))
    if (nextValues.has(option.value)) nextValues.delete(option.value)
    else nextValues.add(option.value)
    select[RUE_PENDING_SELECT_VALUE] = Array.from(
      select.options as HTMLOptionsCollection,
      (item: HTMLOptionElement) => item.value,
    ).filter((value: string) => nextValues.has(value))
    syncPendingSelectValue(select)
    select.focus()
    select.dispatchEvent(new Event('input', { bubbles: true }))
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
  select.addEventListener('click', (event: MouseEvent) => {
    if (!handledOption) return

    const option = handledOption
    handledOption = null
    if (event.target === option || event.target === select) {
      // Chromium can still run the native option click after a cancelled mousedown.
      // Cancel that second default toggle so the controlled value is not immediately undone.
      event.preventDefault()
    }
  })
}

export const syncFormControlForMutationParent = (parent: any) => {
  if (parent && typeof parent.tagName === 'string') {
    const parentTag = parent.tagName.toUpperCase()
    if (parentTag === 'SELECT') {
      syncPendingSelectValue(parent)
      return true
    }
    if (parentTag === 'OPTGROUP') {
      const owner = getSelectOwner(parent)
      if (owner) syncPendingSelectValue(owner)
      return true
    }
  }
  return false
}

export const syncFormControlAfterMutation = (parent: any, child?: any) => {
  if (syncFormControlForMutationParent(parent)) return
  const owner = getSelectOwner(child)
  if (owner) syncPendingSelectValue(owner)
}

export const setFormControlValue = (element: any, value: unknown) => {
  const tag = (element.tagName || '').toUpperCase()
  if (tag === 'SELECT') {
    element[RUE_PENDING_SELECT_VALUE] = value
    syncPendingSelectValue(element)
    return
  }
  if (tag === 'OPTION') {
    element.value = value == null ? '' : String(value)
    const owner = getSelectOwner(element)
    if (owner) syncPendingSelectValue(owner)
    return
  }
  if (tag === 'PROGRESS') {
    element.setAttribute('value', String(value))
    return
  }
  if (element.value !== undefined) {
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      ensureTextControlTracking()
      element[RUE_CONTROLLED_TEXT_VALUE] = true
      if (element[RUE_TEXT_CONTROL_COMPOSING_KEY] === true) return
    }
    const nextValue = value == null ? '' : value
    if (String(element.value ?? '') !== String(nextValue)) element.value = nextValue
  } else {
    element.setAttribute('value', String(value))
  }
}

export const setFormControlProperty = (element: any, name: string, value: unknown) => {
  if (element?.tagName?.toUpperCase() !== 'SELECT' || name !== 'multiple') return false
  element.multiple = !!value
  syncPendingSelectValue(element)
  return true
}
