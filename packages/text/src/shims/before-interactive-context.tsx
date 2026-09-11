import {
  createRequiredTextCompatContext,
  useTextCompatContext,
  type TextCompatContext,
} from './context-adapter.js'

/**
 * Inline `<Script strategy="beforeInteractive">` content captured during SSR.
 *
 * The Script shim hands these records to the SSR pipeline through
 * `BeforeInteractiveContext` instead of rendering the `<script>` tag inline.
 * The pipeline then emits the captured tag immediately after `<head>` opens,
 * so the script runs before any renderer-hoisted stylesheets or modulepreload
 * links. Matches the standard no-flash dark-mode pattern.
 */
export type BeforeInteractiveInlineScript = {
  /** Optional id attribute. */
  id?: string
  /** Pre-escaped inline content (already passed through `escapeInlineContent`). */
  innerHTML: string
  /** Nonce to emit on the `<script>` tag, when CSP is enabled. */
  nonce?: string
  /**
   * Additional HTML attributes to emit on the tag. Booleans render as the
   * bare attribute name; strings render as `name="value"`. Reserved keys
   * (id, nonce, src, children, dangerouslySetInnerHTML, strategy) are
   * filtered out by the registrar.
   */
  attributes?: Record<string, string | boolean>
}

export type RegisterBeforeInteractiveInlineScript = (script: BeforeInteractiveInlineScript) => void

const BEFORE_INTERACTIVE_CONTEXT_KEY = Symbol.for('text.beforeInteractiveContext')

export const BeforeInteractiveContext: TextCompatContext<RegisterBeforeInteractiveInlineScript | null> =
  createRequiredTextCompatContext<RegisterBeforeInteractiveInlineScript | null>(
    BEFORE_INTERACTIVE_CONTEXT_KEY,
    null,
  )

export function useBeforeInteractiveRegister(): RegisterBeforeInteractiveInlineScript | null {
  return useTextCompatContext(BeforeInteractiveContext)
}
