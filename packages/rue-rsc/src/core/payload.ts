export const RUE_RSC_PAYLOAD_PROTOCOL = 'rue-rsc-payload'
export const RUE_RSC_PAYLOAD_VERSION = 1
export const RUE_CLIENT_REFERENCE_SYMBOL: symbol = Symbol.for('rue.client.reference')
export const RUE_SERVER_REFERENCE_SYMBOL: symbol = Symbol.for('rue.server.reference')
export const RUE_ELEMENT_SYMBOL: symbol = Symbol.for('rue.element')
export const RUE_TRANSITIONAL_ELEMENT_SYMBOL: symbol = Symbol.for('rue.transitional.element')
export const RUE_FRAGMENT_SYMBOL: symbol = Symbol.for('rue.fragment')
export const RUE_SUSPENSE_SYMBOL: symbol = Symbol.for('rue.suspense')
const LEGACY_PROTOCOL_PREFIX = ['re', 'act'].join('')
const LEGACY_ELEMENT_SYMBOL: symbol = Symbol.for(
  [LEGACY_PROTOCOL_PREFIX, 'transitional', 'element'].join('.'),
)
const LEGACY_FRAGMENT_SYMBOL: symbol = Symbol.for([LEGACY_PROTOCOL_PREFIX, 'fragment'].join('.'))
const LEGACY_SUSPENSE_SYMBOL: symbol = Symbol.for([LEGACY_PROTOCOL_PREFIX, 'suspense'].join('.'))
const RUE_CONTEXT_PROVIDER_MARKER = '__rue_context_provider__'
const RUE_CONTEXT_PROVIDER_CONTEXT_PROP = '__rue_context_provider_context__'

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

type Thenable<T> = PromiseLike<T>

type RuePayloadHeaderFrame = {
  protocol: typeof RUE_RSC_PAYLOAD_PROTOCOL
  version: typeof RUE_RSC_PAYLOAD_VERSION
}

type RuePayloadRootFrame = {
  type: 'root'
  value: EncodedValue
}

type EncodedValue = null | string | number | boolean | EncodedValue[] | EncodedRecord | EncodedToken

type EncodedRecord = {
  [key: string]: EncodedValue
}

type EncodedToken =
  | { $rue: 'clientReference'; exportName: string; id: string; referenceKey: string }
  | { $rue: 'element'; key: string | null; props: EncodedValue; type: EncodedValue }
  | { $rue: 'error'; digest?: string; message: string; stack?: string }
  | { $rue: 'fragment' }
  | { $rue: 'notFound'; digest: string; message: string; stack?: string }
  | { $rue: 'redirect'; digest: string; message: string; stack?: string }
  | { $rue: 'serverAction'; bound?: EncodedValue; id: string }
  | { $rue: 'suspense' }
  | { $rue: 'text'; value: string }
  | { $rue: 'undefined' }

type ClientReferenceRecord = {
  $$typeof?: unknown
  $$id?: unknown
  $$referenceKey?: unknown
  $$exportName?: unknown
}

type ServerReferenceRecord = {
  $$typeof?: unknown
  $$id?: unknown
  $$bound?: unknown
}

type ServerProtocolElement = {
  $$typeof?: unknown
  key?: unknown
  props?: unknown
  type?: unknown
}

type RenderOptions = {
  onError?: (error: unknown, requestInfo?: unknown, errorContext?: unknown) => unknown
}

type RenderExtraOptions = {
  normalizeResolvedValue?: (value: unknown) => Promise<unknown> | unknown
  onClientReference?: (metadata: { id: string; name: string }) => void
}

export type DecodeRuePayloadOptions = {
  preserveClientReferences?: boolean
}

type ClientRequire = (id: string) => Promise<unknown> | unknown
type ServerCallback = (id: string, args: unknown[]) => Promise<unknown> | unknown

function isThenable<T = unknown>(value: unknown): value is Thenable<T> {
  return (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  )
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isServerProtocolElement(value: unknown): value is ServerProtocolElement {
  if (!isObjectRecord(value)) return false
  return (
    value.$$typeof === RUE_ELEMENT_SYMBOL ||
    value.$$typeof === RUE_TRANSITIONAL_ELEMENT_SYMBOL ||
    value.$$typeof === LEGACY_ELEMENT_SYMBOL
  )
}

function isRueContextProvider(value: unknown): boolean {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    record[RUE_CONTEXT_PROVIDER_MARKER] === true ||
    typeof record[RUE_CONTEXT_PROVIDER_CONTEXT_PROP] === 'object'
  )
}

function isClientReference(value: unknown): value is ClientReferenceRecord {
  return (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    (value as ClientReferenceRecord).$$typeof === RUE_CLIENT_REFERENCE_SYMBOL &&
    typeof (value as ClientReferenceRecord).$$id === 'string'
  )
}

function isServerReference(value: unknown): value is ServerReferenceRecord {
  return (
    typeof value === 'function' &&
    (value as ServerReferenceRecord).$$typeof === RUE_SERVER_REFERENCE_SYMBOL &&
    typeof (value as ServerReferenceRecord).$$id === 'string'
  )
}

function isPlainObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

async function resolveThenable<T>(thenable: Thenable<T>): Promise<T> {
  return Promise.resolve(thenable)
}

async function resolveRenderable(value: unknown): Promise<unknown> {
  let current = value

  while (true) {
    if (isThenable(current)) {
      current = await resolveThenable(current)
      continue
    }

    if (!isServerProtocolElement(current)) {
      return current
    }

    const type = current.type
    if (isRueContextProvider(type)) {
      current = (current.props as { children?: unknown } | null | undefined)?.children ?? null
      continue
    }

    if (typeof type !== 'function' || isClientReference(type) || isServerReference(type)) {
      return current
    }

    try {
      current = type(current.props ?? {})
    } catch (error) {
      if (isThenable(error)) {
        await resolveThenable(error)
        continue
      }
      throw error
    }
  }
}

async function encodeValue(
  value: unknown,
  options: {
    extraOptions?: RenderExtraOptions
    onError?: RenderOptions['onError']
    seen: WeakSet<object>
  },
): Promise<EncodedValue> {
  let resolved = await resolveRenderable(value)
  if (options.extraOptions?.normalizeResolvedValue) {
    const normalized = await options.extraOptions.normalizeResolvedValue(resolved)
    if (normalized !== resolved) {
      return encodeValue(normalized, options)
    }
    resolved = normalized
  }

  if (resolved === null) return null

  switch (typeof resolved) {
    case 'string':
      return { $rue: 'text', value: resolved }
    case 'boolean':
      return resolved
    case 'number':
      if (Number.isFinite(resolved)) return resolved
      throw new Error('[rue-rsc] Cannot encode non-finite numbers in a payload')
    case 'undefined':
      return { $rue: 'undefined' }
    case 'bigint':
      throw new Error('[rue-rsc] Cannot encode bigint values in a payload')
    case 'symbol':
      if (resolved === RUE_FRAGMENT_SYMBOL) return { $rue: 'fragment' }
      if (resolved === RUE_SUSPENSE_SYMBOL) return { $rue: 'suspense' }
      if (resolved === LEGACY_FRAGMENT_SYMBOL) return { $rue: 'fragment' }
      if (resolved === LEGACY_SUSPENSE_SYMBOL) return { $rue: 'suspense' }
      throw new Error(`[rue-rsc] Cannot encode unknown symbol ${String(resolved)} in a payload`)
    case 'function':
      if (isClientReference(resolved)) {
        return encodeClientReference(resolved, options.extraOptions)
      }
      if (isServerReference(resolved)) {
        return encodeServerReference(resolved, options)
      }
      throw new Error('[rue-rsc] Cannot encode function values in a payload')
    case 'object':
      break
  }

  if (isClientReference(resolved)) {
    return encodeClientReference(resolved, options.extraOptions)
  }

  if (isServerProtocolElement(resolved)) {
    try {
      return {
        $rue: 'element',
        key: resolved.key == null ? null : String(resolved.key),
        type: await encodeValue(resolved.type, options),
        props: await encodeValue(resolved.props ?? {}, options),
      }
    } catch (error) {
      return encodeError(error, options.onError)
    }
  }

  if (resolved instanceof Error) {
    return encodeError(resolved, options.onError)
  }

  if (options.seen.has(resolved)) {
    throw new Error('[rue-rsc] Cannot encode cyclic objects in a payload')
  }
  options.seen.add(resolved)

  try {
    if (Array.isArray(resolved)) {
      return Promise.all(resolved.map(item => encodeValue(item, options)))
    }

    if (!isPlainObject(resolved)) {
      throw new Error('[rue-rsc] Cannot encode non-plain objects in a payload')
    }

    const record: EncodedRecord = {}
    for (const [key, entryValue] of Object.entries(resolved)) {
      try {
        if (/^on[A-Z]/.test(key) && typeof entryValue === 'function') {
          continue
        }
        record[key] = await encodeValue(entryValue, options)
      } catch (error) {
        record[key] = encodeError(error, options.onError)
      }
    }
    return record
  } finally {
    options.seen.delete(resolved)
  }
}

function encodeClientReference(
  value: ClientReferenceRecord,
  extraOptions?: RenderExtraOptions,
): EncodedToken {
  const id = String(value.$$id)
  const separator = id.lastIndexOf('#')
  const referenceKey =
    typeof value.$$referenceKey === 'string'
      ? value.$$referenceKey
      : separator > 0
        ? id.slice(0, separator)
        : id
  const exportName =
    typeof value.$$exportName === 'string'
      ? value.$$exportName
      : separator > -1
        ? id.slice(separator + 1)
        : 'default'
  extraOptions?.onClientReference?.({ id: referenceKey, name: exportName })
  return { $rue: 'clientReference', id, referenceKey, exportName }
}

async function encodeServerReference(
  value: ServerReferenceRecord,
  options: {
    extraOptions?: RenderExtraOptions
    onError?: RenderOptions['onError']
    seen: WeakSet<object>
  },
): Promise<EncodedToken> {
  const token: EncodedToken = {
    $rue: 'serverAction',
    id: String(value.$$id),
  }
  if (value.$$bound !== undefined && value.$$bound !== null) {
    token.bound = await encodeValue(value.$$bound, options)
  }
  return token
}

function encodeError(error: unknown, onError?: RenderOptions['onError']): EncodedToken {
  const digest = onError?.(error)
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  if (typeof digest === 'string') {
    if (digest.startsWith('NEXT_REDIRECT;')) {
      return {
        $rue: 'redirect',
        digest,
        message,
        ...(typeof stack === 'string' ? { stack } : {}),
      }
    }
    if (digest === 'NEXT_NOT_FOUND' || digest === 'NEXT_HTTP_ERROR_FALLBACK;404') {
      return {
        $rue: 'notFound',
        digest,
        message,
        ...(typeof stack === 'string' ? { stack } : {}),
      }
    }
  }
  return {
    $rue: 'error',
    message,
    ...(typeof digest === 'string' ? { digest } : {}),
    ...(typeof stack === 'string' ? { stack } : {}),
  }
}

function createServerProtocolElement(
  type: unknown,
  props: Record<string, unknown> | null,
  key: string | null,
): unknown {
  return {
    $$typeof: RUE_ELEMENT_SYMBOL,
    type,
    key,
    props: props ?? {},
    _owner: null,
    ref: null,
    _store: {},
  }
}

async function decodeValue(
  value: EncodedValue,
  options: DecodeRuePayloadOptions = {},
): Promise<unknown> {
  if (value === null) return null

  switch (typeof value) {
    case 'string':
    case 'number':
    case 'boolean':
      return value
  }

  if (Array.isArray(value)) {
    return Promise.all(value.map(item => decodeValue(item, options)))
  }

  if ('$rue' in value) {
    const token = value as EncodedToken
    switch (token.$rue) {
      case 'undefined':
        return undefined
      case 'text':
        return token.value
      case 'fragment':
        return RUE_FRAGMENT_SYMBOL
      case 'suspense':
        return RUE_SUSPENSE_SYMBOL
      case 'clientReference':
        return decodeClientReference(token, options)
      case 'serverAction':
        return decodeServerReference(token, options)
      case 'redirect':
      case 'notFound':
      case 'error':
        return createErrorThrower(token)
      case 'element': {
        const [type, props] = await Promise.all([
          decodeValue(token.type, options),
          decodeValue(token.props, options),
        ])
        return createServerProtocolElement(type, isObjectRecord(props) ? props : null, token.key)
      }
    }
  }

  const record: Record<string, unknown> = {}
  await Promise.all(
    Object.entries(value).map(async ([key, entryValue]) => {
      record[key] = await decodeValue(entryValue, options)
    }),
  )
  return record
}

async function decodeClientReference(
  value: Extract<EncodedToken, { $rue: 'clientReference' }>,
  options: DecodeRuePayloadOptions,
) {
  if (options.preserveClientReferences) {
    return { ...value }
  }

  const globalState = globalThis as {
    __rue_rsc_client_require__?: ClientRequire
    __vite_rsc_client_require__?: ClientRequire
  }
  const clientRequire =
    globalState.__rue_rsc_client_require__ ?? globalState.__vite_rsc_client_require__
  if (clientRequire) {
    const mod = await clientRequire(value.referenceKey)
    if (isObjectRecord(mod) && Object.hasOwn(mod, value.exportName)) {
      return mod[value.exportName]
    }
  }
  return createClientReferenceStub(value.referenceKey, value.exportName)
}

function createClientReferenceStub(referenceKey: string, exportName: string): unknown {
  const stub = () => {
    throw new Error(`Unexpectedly client reference export '${exportName}' is called on server`)
  }
  return Object.defineProperties(stub, {
    $$typeof: { value: RUE_CLIENT_REFERENCE_SYMBOL },
    $$id: { value: `${referenceKey}#${exportName}` },
    $$referenceKey: { value: referenceKey },
    $$exportName: { value: exportName },
  })
}

async function decodeServerReference(
  value: Extract<EncodedToken, { $rue: 'serverAction' }>,
  options: DecodeRuePayloadOptions,
) {
  const bound = value.bound === undefined ? undefined : await decodeValue(value.bound, options)
  const serverReference = (...args: unknown[]) => {
    const callback = (globalThis as { __viteRscCallServer?: ServerCallback }).__viteRscCallServer
    if (!callback) {
      throw new Error('[rue-rsc] Server action callback is not configured')
    }
    return callback(value.id, Array.isArray(bound) ? [...bound, ...args] : args)
  }
  return Object.defineProperties(serverReference, {
    $$typeof: { value: RUE_SERVER_REFERENCE_SYMBOL },
    $$id: { value: value.id },
    $$bound: { value: bound ?? null },
    $$FORM_ACTION: {
      value() {
        if (bound !== undefined && bound !== null) return null
        return {
          action: '',
          data: null,
          encType: 'multipart/form-data',
          method: 'POST',
          name: `$RUE_ACTION_ID_${value.id}`,
        }
      },
    },
  })
}

function createErrorThrower(
  value: Extract<EncodedToken, { $rue: 'error' | 'notFound' | 'redirect' }>,
) {
  return function RueRscPayloadErrorThrower() {
    const error = new Error(value.message) as Error & { digest?: string }
    if (value.digest) error.digest = value.digest
    if (value.stack) error.stack = value.stack
    throw error
  }
}

async function readUtf8Stream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader()
  let text = ''
  try {
    while (true) {
      const result = await reader.read()
      if (result.done) {
        text += textDecoder.decode()
        return text
      }
      text += textDecoder.decode(result.value, { stream: true })
    }
  } finally {
    reader.releaseLock()
  }
}

function parsePayloadFrames(text: string): RuePayloadRootFrame {
  const lines = text.split('\n').filter(line => line.length > 0)
  const header = JSON.parse(lines[0] ?? 'null') as RuePayloadHeaderFrame | null
  if (
    !header ||
    header.protocol !== RUE_RSC_PAYLOAD_PROTOCOL ||
    header.version !== RUE_RSC_PAYLOAD_VERSION
  ) {
    throw new Error('[rue-rsc] Invalid Rue RSC payload header')
  }

  const root = JSON.parse(lines[1] ?? 'null') as RuePayloadRootFrame | null
  if (!root || root.type !== 'root') {
    throw new Error('[rue-rsc] Missing Rue RSC root payload frame')
  }
  return root
}

export function renderRuePayloadToReadableStream<T>(
  data: T,
  options?: RenderOptions,
  extraOptions?: RenderExtraOptions,
): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const header: RuePayloadHeaderFrame = {
          protocol: RUE_RSC_PAYLOAD_PROTOCOL,
          version: RUE_RSC_PAYLOAD_VERSION,
        }
        const root: RuePayloadRootFrame = {
          type: 'root',
          value: await encodeValue(data, {
            extraOptions,
            onError: options?.onError,
            seen: new WeakSet(),
          }),
        }
        controller.enqueue(textEncoder.encode(`${JSON.stringify(header)}\n`))
        controller.enqueue(textEncoder.encode(`${JSON.stringify(root)}\n`))
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })
}

export async function decodeRuePayloadReadableStream<T>(
  stream: ReadableStream<Uint8Array>,
  options: DecodeRuePayloadOptions = {},
): Promise<T> {
  const root = parsePayloadFrames(await readUtf8Stream(stream))
  return (await decodeValue(root.value, options)) as T
}

export async function decodeRuePayloadFetch<T>(
  promiseForResponse: Promise<Response>,
  options: DecodeRuePayloadOptions = {},
): Promise<T> {
  const response = await promiseForResponse
  if (!response.body) {
    throw new Error('[rue-rsc] Response does not contain a readable payload body')
  }
  return decodeRuePayloadReadableStream<T>(response.body, options)
}
