/**
 * Shim for text/dist/shared/lib/router-context.shared-runtime
 *
 * Used by: some testing utilities and older libraries.
 * Provides the Pages Router context.
 */
import type { TextRouter } from '../router'
import { createRequiredTextCompatContext, type TextCompatContext } from '../context-adapter.js'

const ROUTER_CONTEXT_KEY = Symbol.for('text.pagesRouterContext')

export const RouterContext: TextCompatContext<TextRouter | null> =
  createRequiredTextCompatContext<TextRouter | null>(ROUTER_CONTEXT_KEY, null)
