export {
  createActionReferenceSet,
  decodeProgressiveAction,
  decodeFormState,
  parseActionArgs,
  loadServerAction,
} from './app-rsc-server-action-protocol.js'
import { renderRuePayloadToReadableStream } from '@rue-js/rsc/core/payload'
import { isAppServerPlan, preloadAppServerPlan, startAppServerPlan } from './app-server-tree.js'
import { AppElementsWire, isAppElementsRecord } from './app-elements.js'
import { beginCurrentSsrAppElements, setCurrentSsrAppElements } from '../shims/slot-core.js'

export function renderAppRscPayloadToReadableStream(
  model: unknown,
  options?: unknown,
): ReadableStream<Uint8Array> {
  const transportValue = (value: unknown): unknown =>
    isAppServerPlan(value)
      ? startAppServerPlan(value, options as Parameters<typeof startAppServerPlan>[1]).then(
          result => result.frame,
        )
      : value
  let payload = model
  if (isAppElementsRecord(model) && typeof model[AppElementsWire.keys.route] === 'string') {
    beginCurrentSsrAppElements()
    setCurrentSsrAppElements(model)
    for (const [key, value] of Object.entries(model)) {
      if (AppElementsWire.parseElementKey(key)?.kind === 'page') preloadAppServerPlan(value)
    }
    const routeId = AppElementsWire.readMetadata(model).routeId
    payload = Object.fromEntries(
      Object.entries(model)
        .filter(
          ([key]) =>
            key === routeId ||
            AppElementsWire.isSlotId(key) ||
            AppElementsWire.parseElementKey(key) === null,
        )
        .map(([key, value]) => [
          key,
          AppElementsWire.isSlotId(key) && isAppServerPlan(value)
            ? { kind: 'compiled-slot', id: key }
            : value,
        ]),
    )
  }
  return renderRuePayloadToReadableStream(transportValue(payload), options as object, {
    normalizeResolvedValue: transportValue,
  })
}
