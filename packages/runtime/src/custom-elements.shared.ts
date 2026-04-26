export const CUSTOM_ELEMENT_EMIT_BRIDGE_KEY = '__rue_custom_element_emit__'

export type CustomElementEmitBridge = (eventName: string, args: unknown[]) => void