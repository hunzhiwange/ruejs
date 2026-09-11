import {
  createRequiredTextCompatContext,
  useTextCompatContext,
  type TextCompatContext,
} from './context-adapter.js'
import type { TextPropsWithChildren } from '../runtime/render-protocol.js'
export const ScriptNonceContext: TextCompatContext<string | undefined> =
  createRequiredTextCompatContext<string | undefined>(
    Symbol.for('text.scriptNonceContext'),
    undefined,
  )
export function ScriptNonceProvider(props: TextPropsWithChildren<{ nonce?: string }>) {
  return ScriptNonceContext.Provider({ value: props.nonce, children: props.children as any })
}
export function withScriptNonce(children: any, nonce?: string) {
  return ScriptNonceContext.Provider({ value: nonce, children })
}
export function useScriptNonce(): string | undefined {
  return useTextCompatContext(ScriptNonceContext)
}
