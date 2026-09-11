/** Types for compiled Text components; no runtime element or class adaptation. */
export type TextCompatNode = import('@rue-js/rue').RenderableOutput
export type TextCompatElement = TextCompatNode
export type TextCompatComponentType<P = Record<string, unknown>> = ((
  props: P,
) => TextCompatNode) & { displayName?: string }
