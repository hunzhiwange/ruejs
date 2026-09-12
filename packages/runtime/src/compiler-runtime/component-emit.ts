import { _$compiledPropsGet } from '../compiled-props'
import { CUSTOM_ELEMENT_EMIT_BRIDGE_KEY } from '../custom-elements.shared'

/** Emit calls the current prop handler or the Custom Element host bridge. */
export const useEmit =
  (props: object) =>
  (event: string, ...args: unknown[]): unknown => {
    const key = `on${event
      .split(/[-:]/g)
      .filter(Boolean)
      .map(part => part[0].toUpperCase() + part.slice(1))
      .join('')}`
    const handler = _$compiledPropsGet(props, key)
    if (typeof handler === 'function') return handler(...args)
    const bridge = _$compiledPropsGet(props, CUSTOM_ELEMENT_EMIT_BRIDGE_KEY)
    return typeof bridge === 'function' ? bridge(event, args) : undefined
  }
