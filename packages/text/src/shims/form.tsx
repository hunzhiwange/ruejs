'use client'

/**
 * text/form shim
 *
 * Progressive enhancement form component. In Text.js, this replaces
 * the standard <form> element with one that intercepts submissions
 * and performs client-side navigation for GET forms (search forms).
 *
 * For POST forms with server actions, it delegates to the compiled form action runtime.
 *
 * Usage:
 *   import Form from 'text/form';
 *   <Form action="/search">
 *     <input name="q" />
 *     <button type="submit">Search</button>
 *   </Form>
 */

import { useActionState } from './hooks-adapter.js'
import { hasAppNavigationRuntime } from '../client/navigation-runtime.js'
import { navigateClientSide } from './navigation.js'
import { isDangerousScheme } from './url-safety.js'
import { toSameOriginPath, withBasePath } from './url-utils.js'
import { type RueElementProps, type RueRef, type RueSubmitEvent } from './rue-shim-types.js'

// Mirrors `__TEXT_ROUTER_BASEPATH` exposure in `text/link` / `text/router`.
// `addBasePath` is only applied to the form-level `action` prop. A submitter's
// `formAction` is intentionally untouched, matching Text.js (the comment in
// upstream `form.tsx` notes "this should not have basePath added, because we
// can't add it before hydration").
const __basePath: string = process.env.__TEXT_ROUTER_BASEPATH ?? ''

// Re-export the action-state hook to match Text.js's text/form module.
export { useActionState }

type FormSubmitter = HTMLButtonElement | HTMLInputElement
const SUPPORTED_FORM_ENCTYPE = 'application/x-www-form-urlencoded'
const SUPPORTED_FORM_METHOD = 'GET'
const SUPPORTED_FORM_TARGET = '_self'

function isSafeAction(action: string): boolean {
  // Block dangerous URI schemes
  if (isDangerousScheme(action)) return false
  // Block protocol-relative URLs (//evil.com/...)
  if (action.startsWith('//')) return false
  // Block absolute URLs to external origins (client-side: compare origins)
  if (/^https?:\/\//i.test(action)) {
    if (typeof window !== 'undefined') {
      try {
        const actionUrl = new URL(action)
        return actionUrl.origin === window.location.origin
      } catch {
        return false
      }
    }
    // Server-side: block all absolute URLs (can't compare origins)
    return false
  }
  return true
}

function getSubmitter(nativeEvent: unknown): FormSubmitter | null {
  const submitter =
    nativeEvent &&
    typeof nativeEvent === 'object' &&
    'submitter' in nativeEvent &&
    nativeEvent.submitter != null &&
    typeof nativeEvent.submitter === 'object'
      ? nativeEvent.submitter
      : null

  if (
    submitter &&
    typeof (submitter as { getAttribute?: unknown }).getAttribute === 'function' &&
    'disabled' in submitter &&
    'name' in submitter &&
    'value' in submitter
  ) {
    return submitter as FormSubmitter
  }
  return null
}

function getSubmitEventSubmitter(event: RueSubmitEvent<HTMLFormElement>): FormSubmitter | null {
  const nativeEvent =
    'nativeEvent' in event && event.nativeEvent ? event.nativeEvent : (event as SubmitEvent)
  return getSubmitter(nativeEvent)
}

function getEffectiveMethod(submitter: FormSubmitter | null, formMethod: unknown): string {
  const override = submitter?.getAttribute('formmethod')
  return String(override ?? formMethod ?? 'GET').toUpperCase()
}

function getEffectiveAction(submitter: FormSubmitter | null, formAction: string): string {
  return submitter?.getAttribute('formaction') ?? formAction
}

function checkFormActionUrl(action: string, source: 'action' | 'formAction'): void {
  const aPropName = source === 'action' ? 'an `action`' : 'a `formAction`'

  let testUrl: URL
  try {
    testUrl = new URL(action, 'http://n')
  } catch {
    console.error(`<Form> received ${aPropName} that cannot be parsed as a URL: "${action}".`)
    return
  }

  if (testUrl.searchParams.size) {
    console.warn(
      `<Form> received ${aPropName} that contains search params: "${action}". This is not supported, and they will be ignored. ` +
        `If you need to pass in additional search params, use an \`<input type="hidden" />\` instead.`,
    )
  }
}

function createFormSubmitDestinationUrl(
  action: string,
  form: HTMLFormElement,
  submitter: FormSubmitter | null,
): string {
  const targetUrl = new URL(action, window.location.href)
  if (targetUrl.searchParams.size) {
    targetUrl.search = ''
  }

  const formData = buildFormData(form, submitter)
  for (const [name, value] of formData) {
    targetUrl.searchParams.append(name, typeof value === 'string' ? value : value.name)
  }

  return toSameOriginPath(targetUrl.href) ?? targetUrl.href
}

function buildFormData(form: HTMLFormElement, submitter: FormSubmitter | null): FormData {
  if (!submitter) return new FormData(form)

  try {
    return new FormData(form, submitter)
  } catch {
    const formData = new FormData(form)
    if (!submitter.disabled && submitter.name) {
      formData.append(submitter.name, submitter.value)
    }
    return formData
  }
}

type FormProps = {
  /** Target URL for GET forms, or server action for POST forms */
  action: string | ((formData: FormData) => void | Promise<void>)
  /** Replace instead of push in history (default: false) */
  replace?: boolean
  /** Scroll to top after navigation (default: true) */
  scroll?: boolean
  method?: string
  onSubmit?: (event: RueSubmitEvent<HTMLFormElement>) => void
} & Omit<RueElementProps<HTMLFormElement>, 'action' | 'onSubmit'>

function Form({
  action,
  replace = false,
  scroll = true,
  onSubmit,
  ref,
  children,
  ...rest
}: FormProps & { ref?: RueRef<HTMLFormElement> }) {
  // Compiled forms attach the server action reference and submission handler.
  if (typeof action === 'function') {
    return (
      <form {...rest} ref={ref} action={action} onSubmit={onSubmit}>
        {children}
      </form>
    )
  }

  // Block dangerous action URLs. Render <form> without action attribute
  // so it submits to the current page (safe default).
  if (process.env.NODE_ENV !== 'production') {
    checkFormActionUrl(action, 'action')
  }

  if (!isSafeAction(action)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`<Form> blocked unsafe action: ${action}`)
    }
    return (
      <form {...rest} ref={ref} onSubmit={onSubmit}>
        {children}
      </form>
    )
  }

  // Prefix basePath to the navigating `action` prop (matches Text.js's
  // `addBasePath(actionProp)` in `client/form.tsx` and `client/app-dir/form.tsx`).
  // This becomes both the rendered `action=` attribute (so JS-disabled
  // submissions still hit the right URL) and the soft-navigation target.
  const actionHref = withBasePath(action, __basePath)

  async function handleSubmit(e: RueSubmitEvent<HTMLFormElement>) {
    // Call user's onSubmit first
    if (onSubmit) {
      onSubmit(e)
      if (e.defaultPrevented) return
    }

    const submitter = getSubmitEventSubmitter(e)
    if (submitter) {
      const formEncType = submitter.getAttribute('formenctype')
      if (formEncType !== null && formEncType !== SUPPORTED_FORM_ENCTYPE) {
        console.error(
          `<Form>'s \`encType\` was set to an unsupported value via \`formEncType="${formEncType}"\`. This will disable <Form>'s navigation functionality. If you need this, use a native <form> element instead.`,
        )
        return
      }
      const formMethod = submitter.getAttribute('formmethod')
      if (formMethod !== null && formMethod.toUpperCase() !== SUPPORTED_FORM_METHOD) {
        console.error(
          `<Form>'s \`method\` was set to an unsupported value via \`formMethod="${formMethod}"\`. This will disable <Form>'s navigation functionality. If you need this, use a native <form> element instead.`,
        )
        return
      }
      const formTarget = submitter.getAttribute('formtarget')
      if (formTarget !== null && formTarget !== SUPPORTED_FORM_TARGET) {
        console.error(
          `<Form>'s \`target\` was set to an unsupported value via \`formTarget="${formTarget}"\`. This will disable <Form>'s navigation functionality. If you need this, use a native <form> element instead.`,
        )
        return
      }
    }

    // Only intercept GET forms for client-side navigation
    const method = getEffectiveMethod(submitter, rest.method)
    if (method !== 'GET') return

    // NOTE: a submitter's `formAction` is intentionally NOT base-path-prefixed
    // here, matching Text.js. Upstream `form.tsx` notes: "this should not have
    // `basePath` added, because we can't add it before hydration".
    const effectiveAction = getEffectiveAction(submitter, actionHref)
    if (process.env.NODE_ENV !== 'production' && submitter?.getAttribute('formaction') !== null) {
      checkFormActionUrl(effectiveAction, 'formAction')
    }
    if (!isSafeAction(effectiveAction)) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`<Form> blocked unsafe action: ${effectiveAction}`)
      }
      e.preventDefault()
      return
    }

    e.preventDefault()
    const url = createFormSubmitDestinationUrl(effectiveAction, e.currentTarget, submitter)

    // Navigate client-side
    if (hasAppNavigationRuntime()) {
      // App Router: use the shared navigator so URL/history publish stays
      // aligned with the committed RSC tree.
      await navigateClientSide(url, replace ? 'replace' : 'push', scroll)
    } else {
      // Pages Router: delegate to the Router singleton so navigation flows
      // through `performNavigation` (route events, HTML fetch, scroll
      // handling). Mirrors what `<Link>` does at link.tsx:619-623.
      try {
        const routerModule = await import('./router.js')
        const Router = routerModule.default
        if (replace) {
          await Router.replace(url, undefined, { scroll })
        } else {
          await Router.push(url, undefined, { scroll })
        }
      } catch {
        // Fallback: pushState + popstate keeps the URL in sync even if the
        // Router singleton import fails (e.g. in test/SSR-only contexts).
        if (replace) {
          window.history.replaceState({}, '', url)
        } else {
          window.history.pushState({}, '', url)
        }
        window.dispatchEvent(new PopStateEvent('popstate'))
        if (scroll) {
          window.scrollTo(0, 0)
        }
      }
    }
  }

  return (
    <form {...rest} ref={ref} action={actionHref} onSubmit={handleSubmit}>
      {children}
    </form>
  )
}

export default Form
