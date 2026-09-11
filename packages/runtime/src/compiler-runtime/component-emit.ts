import { _$compiledPropsGet } from '../compiled-props'

/** Emit is a direct call to the current prop handler, with no runtime instance bridge. */
export const useEmit =
  (props: object) =>
  (event: string, ...args: unknown[]): unknown => {
    const key = `on${event
      .split(/[-:]/g)
      .filter(Boolean)
      .map(part => part[0].toUpperCase() + part.slice(1))
      .join('')}`
    const handler = _$compiledPropsGet(props, key)
    return typeof handler === 'function' ? handler(...args) : undefined
  }
