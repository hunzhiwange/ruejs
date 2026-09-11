export type AppServerActionReferenceSet = unknown

export type AppServerActionReplyOptions = {
  references?: AppServerActionReferenceSet
}

export type AppServerProgressiveActionDecoder = (body: FormData) => Promise<unknown> | unknown

export type AppServerActionFormStateDecoder = (
  actionResult: unknown,
  body: FormData,
) => Promise<unknown> | unknown

export type AppServerActionReplyDecoder = (
  body: string | FormData,
  options?: AppServerActionReplyOptions,
) => Promise<unknown[]> | unknown[]

export type AppServerActionLoader = (actionId: string) => Promise<unknown>

export type AppServerActionProtocol = {
  createActionReferenceSet: () => AppServerActionReferenceSet
  decodeProgressiveAction: AppServerProgressiveActionDecoder
  decodeFormState: AppServerActionFormStateDecoder
  parseActionArgs: AppServerActionReplyDecoder
  loadServerAction: AppServerActionLoader
}

export function createAppServerActionProtocol(
  protocol: AppServerActionProtocol,
): AppServerActionProtocol {
  return protocol
}

const RUE_SERVER_ACTION_ENVELOPE_FIELD = '$RUE_ACTION'
export const RUE_PROGRESSIVE_ACTION_ID_PREFIX = '$RUE_ACTION_ID_'
const RUE_ACTION_INTERNAL_FIELD_PREFIX = '$RUE_ACTION_'

type RueServerActionEncodedValue =
  | { type: 'blob'; key: string; name?: string; contentType?: string }
  | { type: 'form-data'; entries: Array<[string, RueServerActionEncodedValue]> }
  | { type: 'json'; value: unknown }

type RueServerActionEnvelope = {
  args: RueServerActionEncodedValue[]
  protocol: 'rue-server-action'
  version: 1
}

function parseRueActionEnvelope(raw: string): RueServerActionEnvelope {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Invalid Rue server action payload')
  }

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    (parsed as { protocol?: unknown }).protocol !== 'rue-server-action' ||
    (parsed as { version?: unknown }).version !== 1 ||
    !Array.isArray((parsed as { args?: unknown }).args)
  ) {
    throw new Error('Invalid Rue server action payload')
  }

  return parsed as RueServerActionEnvelope
}

function decodeRueActionValue(value: RueServerActionEncodedValue, body?: FormData): unknown {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid Rue server action payload')
  }

  if (value.type === 'json') {
    return value.value
  }

  if (value.type === 'form-data') {
    const formData = new FormData()
    for (const [key, entry] of value.entries) {
      formData.append(key, decodeRueActionValue(entry, body) as FormDataEntryValue)
    }
    return formData
  }

  if (value.type === 'blob') {
    const entry = body?.get(value.key)
    if (!entry) {
      throw new Error('Invalid Rue server action payload')
    }
    return entry
  }

  throw new Error('Invalid Rue server action payload')
}

function cloneActionFormData(body: FormData): FormData {
  const formData = new FormData()
  for (const [key, value] of body.entries()) {
    if (
      key === RUE_SERVER_ACTION_ENVELOPE_FIELD ||
      key.startsWith(RUE_ACTION_INTERNAL_FIELD_PREFIX)
    ) {
      continue
    }
    formData.append(key, value)
  }
  return formData
}

export function decodeRueServerActionReply(body: string | FormData): unknown[] {
  const envelope =
    typeof body === 'string'
      ? parseRueActionEnvelope(body)
      : parseRueActionEnvelope(String(body.get(RUE_SERVER_ACTION_ENVELOPE_FIELD) ?? ''))
  return envelope.args.map(arg =>
    decodeRueActionValue(arg, typeof body === 'string' ? undefined : body),
  )
}

function readProgressiveActionId(body: FormData): string | null {
  for (const key of body.keys()) {
    if (key.startsWith(RUE_PROGRESSIVE_ACTION_ID_PREFIX)) {
      return key.slice(RUE_PROGRESSIVE_ACTION_ID_PREFIX.length)
    }
  }
  return null
}

export async function decodeRueProgressiveServerAction(
  body: FormData,
  loadServerAction: AppServerActionLoader,
): Promise<unknown> {
  const actionId = readProgressiveActionId(body)
  if (!actionId) return null

  const action = await loadServerAction(actionId)
  if (typeof action !== 'function') return action
  const state = readProgressiveFormState(body)
  if (state && state.actionId !== actionId) throw new Error('Invalid Rue action state reference')
  return () =>
    state ? action(state.state, cloneActionFormData(body)) : action(cloneActionFormData(body))
}

function readProgressiveFormState(
  body: FormData,
): { version: 1; key: string; actionId: string; state: unknown } | undefined {
  const encoded = body.get('$RUE_ACTION_STATE')
  if (encoded === null) return undefined
  if (typeof encoded !== 'string') throw new Error('Invalid Rue action state')
  let value: any
  try {
    value = JSON.parse(encoded)
  } catch {
    throw new Error('Invalid Rue action state')
  }
  if (
    !value ||
    value.version !== 1 ||
    typeof value.key !== 'string' ||
    typeof value.actionId !== 'string' ||
    !Object.hasOwn(value, 'state')
  )
    throw new Error('Invalid Rue action state')
  return value
}
export function decodeRueServerActionFormState(actionResult?: unknown, body?: FormData): unknown {
  const state = body && readProgressiveFormState(body)
  return state ? { ...state, state: actionResult } : undefined
}

export function createRueServerActionProtocol(
  loadServerAction: AppServerActionLoader,
): AppServerActionProtocol {
  return createAppServerActionProtocol({
    createActionReferenceSet() {
      return undefined
    },
    decodeProgressiveAction(body) {
      return decodeRueProgressiveServerAction(body, loadServerAction)
    },
    decodeFormState(actionResult, body) {
      return decodeRueServerActionFormState(actionResult, body)
    },
    parseActionArgs(body) {
      return decodeRueServerActionReply(body)
    },
    loadServerAction,
  })
}
