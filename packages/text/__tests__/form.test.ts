import { renderToString as writeHtml } from '@rue-js/runtime/server'
/**
 * text/form shim unit tests.
 *
 * Tests the Form component's SSR rendering for both string actions
 * (GET forms) and function actions (server actions), plus direct
 * submit interception behavior for client-side GET forms.
 */
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import Form from '../src/shims/form.js?text-ssr'
import { createElement, renderAppServerElementToHtml } from './app-server-protocol-test-utils.js'

type FormEntry = [string, string]

type FormTarget = {
  entries?: FormEntry[]
}

class FakeElement {}

class FakeSubmitterElement extends FakeElement {
  disabled: boolean
  name: string
  value: string
  private attributes: Record<string, string>

  constructor({
    attributes = {},
    disabled = false,
    name = '',
    value = '',
  }: {
    attributes?: Record<string, string>
    disabled?: boolean
    name?: string
    value?: string
  } = {}) {
    super()
    this.attributes = Object.fromEntries(
      Object.entries(attributes).map(([key, value]) => [key.toLowerCase(), value]),
    )
    this.disabled = disabled
    this.name = name
    this.value = value
  }

  getAttribute(name: string): string | null {
    return this.attributes[name.toLowerCase()] ?? null
  }
}

class FakeButtonElement extends FakeSubmitterElement {}

class FakeInputElement extends FakeSubmitterElement {}

function createFormDataClass({ supportsSubmitter }: { supportsSubmitter: boolean }) {
  return class FakeFormData implements Iterable<FormEntry> {
    private entries: FormEntry[] = []

    constructor(form?: FormTarget, submitter?: FakeSubmitterElement | null) {
      if (submitter !== undefined && submitter !== null && !supportsSubmitter) {
        throw new TypeError('submitter overload unavailable')
      }

      if (form?.entries) {
        this.entries.push(...form.entries)
      }

      if (supportsSubmitter && submitter && !submitter.disabled && submitter.name) {
        this.entries.push([submitter.name, submitter.value])
      }
    }

    append(name: string, value: string) {
      this.entries.push([name, value])
    }

    [Symbol.iterator](): Iterator<FormEntry> {
      return this.entries[Symbol.iterator]()
    }
  }
}

async function renderClientForm(props: Record<string, unknown>) {
  let captured: Record<string, unknown> | undefined
  const plan = createElement(Form, props)
  await writeHtml(
    () => writer =>
      plan({
        ...writer,
        onElement: (tag, attributes) => {
          if (tag === 'form') captured = { ...attributes }
        },
      }),
  )
  expect(captured).toBeDefined()
  return captured as { onSubmit: (event: any) => Promise<void> }
}

function createWindowStub() {
  const navigate = vi.fn(async () => {})
  const pushState = vi.fn()
  const replaceState = vi.fn()
  const scrollTo = vi.fn()

  return {
    navigate,
    pushState,
    replaceState,
    scrollTo,
    window: {
      [Symbol.for('text.navigationRuntime')]: {
        bootstrap: {
          routeManifest: null,
          rsc: undefined,
        },
        functions: {
          navigate,
        },
      },
      history: {
        pushState,
        replaceState,
        state: null,
      },
      location: {
        origin: 'http://localhost:3000',
        href: 'http://localhost:3000/current',
        pathname: '/current',
        search: '',
        hash: '',
        hostname: 'localhost',
      },
      scrollTo,
      scrollX: 0,
      scrollY: 0,
      addEventListener: () => {},
      dispatchEvent: () => {},
    },
  }
}

function createSubmitEvent({
  entries,
  submitter,
}: {
  entries: FormEntry[]
  submitter?: FakeSubmitterElement | null
}) {
  const event = {
    currentTarget: { entries },
    defaultPrevented: false,
    nativeEvent: { submitter },
    preventDefault: vi.fn(() => {
      event.defaultPrevented = true
    }),
  }

  return event
}

function installClientGlobals({ supportsSubmitter }: { supportsSubmitter: boolean }) {
  const windowStub = createWindowStub()
  vi.stubGlobal('window', windowStub.window)
  vi.stubGlobal('Element', FakeElement)
  vi.stubGlobal('HTMLButtonElement', FakeButtonElement)
  vi.stubGlobal('HTMLInputElement', FakeInputElement)
  vi.stubGlobal('FormData', createFormDataClass({ supportsSubmitter }))
  return windowStub
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// ─── SSR rendering ──────────────────────────────────────────────────────

describe('Form SSR rendering', () => {
  it('renders a <form> element with string action', async () => {
    const html = await renderAppServerElementToHtml(
      createElement(
        Form,
        { action: '/search' },
        createElement('input', { name: 'q', type: 'text' }),
        createElement('button', { type: 'submit' }, 'Search'),
      ),
    )
    expect(html).toContain('<form')
    expect(html).toContain('action="/search"')
    expect(html).toContain('name="q"')
    expect(html).toContain('Search')
    expect(html).toContain('</form>')
  })

  it('renders with function action (server action)', async () => {
    const serverAction = async (_formData: FormData) => {
      'use server'
    }

    // Function actions are passed through to the form protocol.
    const html = await renderAppServerElementToHtml(
      createElement(
        Form,
        { action: serverAction as any },
        createElement('button', { type: 'submit' }, 'Submit'),
      ),
    )
    expect(html).toContain('<form')
    expect(html).toContain('Submit')
  })

  it('renders with additional HTML form attributes', async () => {
    const html = await renderAppServerElementToHtml(
      createElement(
        Form,
        { action: '/submit', method: 'POST', className: 'my-form', id: 'contact-form' },
        createElement('input', { name: 'email', type: 'email' }),
      ),
    )
    expect(html).toContain('class="my-form"')
    expect(html).toContain('id="contact-form"')
  })

  it('renders children elements', async () => {
    const html = await renderAppServerElementToHtml(
      createElement(
        Form,
        { action: '/search' },
        createElement(
          'div',
          { className: 'form-group' },
          createElement('label', null, 'Query'),
          createElement('input', { name: 'q' }),
        ),
        createElement('button', null, 'Go'),
      ),
    )
    expect(html).toContain('class="form-group"')
    expect(html).toContain('Query')
    expect(html).toContain('Go')
  })

  it('renders without method (defaults to GET in behavior)', async () => {
    const html = await renderAppServerElementToHtml(
      createElement(Form, { action: '/search' }, createElement('input', { name: 'q' })),
    )
    // No explicit method attribute in HTML — browser defaults to GET
    expect(html).toContain('action="/search"')
  })
})

// ─── useActionState re-export ───────────────────────────────────────────

describe('Form useActionState', () => {
  it('exports useActionState from the module', async () => {
    const mod = await import('../src/shims/form.js?text-ssr')
    expect(typeof mod.useActionState).toBe('function')
  })
})

describe('Form client GET interception', () => {
  it('strips existing query params from the action URL and warns in development', async () => {
    const { navigate } = installClientGlobals({ supportsSubmitter: true })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { onSubmit } = await renderClientForm({ action: '/search?lang=en' })
    const event = createSubmitEvent({
      entries: [['q', 'rue']],
    })

    await onSubmit(event)

    expect(warn).toHaveBeenCalledWith(
      '<Form> received an `action` that contains search params: "/search?lang=en". This is not supported, and they will be ignored. If you need to pass in additional search params, use an `<input type="hidden" />` instead.',
    )
    expect(event.preventDefault).toHaveBeenCalledOnce()
    // navigateClientSide delegates URL push to the App Router navigation runtime.
    expect(navigate).toHaveBeenCalledWith('/search?q=rue', 0, 'navigate', 'push', undefined, false)
  })

  it('honors submitter formAction, formMethod, and submitter name/value', async () => {
    const { navigate } = installClientGlobals({ supportsSubmitter: true })
    const { onSubmit } = await renderClientForm({ action: '/search', method: 'POST' })
    const submitter = new FakeButtonElement({
      attributes: {
        formaction: '/search-alt',
        formmethod: 'GET',
      },
      name: 'source',
      value: 'submitter-action',
    })
    const event = createSubmitEvent({
      entries: [
        ['q', 'button'],
        ['lang', 'fr'],
      ],
      submitter,
    })

    await onSubmit(event)

    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith(
      '/search-alt?q=button&lang=fr&source=submitter-action',
      0,
      'navigate',
      'push',
      undefined,
      false,
    )
  })

  it('falls back to appending submitter name/value when FormData submitter overload is unavailable', async () => {
    const { navigate } = installClientGlobals({ supportsSubmitter: false })
    const { onSubmit } = await renderClientForm({ action: '/search' })
    const submitter = new FakeButtonElement({
      attributes: {
        formaction: '/search-alt',
      },
      name: 'source',
      value: 'fallback-submitter',
    })
    const event = createSubmitEvent({
      entries: [
        ['q', 'fallback'],
        ['lang', 'de'],
      ],
      submitter,
    })

    await onSubmit(event)

    expect(navigate).toHaveBeenCalledWith(
      '/search-alt?q=fallback&lang=de&source=fallback-submitter',
      0,
      'navigate',
      'push',
      undefined,
      false,
    )
  })

  it('does not intercept POST submissions without a submitter GET override', async () => {
    const { navigate } = installClientGlobals({ supportsSubmitter: true })
    const { onSubmit } = await renderClientForm({ action: '/search', method: 'POST' })
    const event = createSubmitEvent({
      entries: [['q', 'server-action']],
    })

    await onSubmit(event)

    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('strips submitter formAction query params and warns in development', async () => {
    const { navigate } = installClientGlobals({ supportsSubmitter: true })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { onSubmit } = await renderClientForm({ action: '/search' })
    const submitter = new FakeButtonElement({
      attributes: {
        formaction: '/search-alt?lang=fr',
      },
      name: 'source',
      value: 'submitter-action',
    })
    const event = createSubmitEvent({
      entries: [['q', 'button']],
      submitter,
    })

    await onSubmit(event)

    expect(warn).toHaveBeenCalledWith(
      '<Form> received a `formAction` that contains search params: "/search-alt?lang=fr". This is not supported, and they will be ignored. If you need to pass in additional search params, use an `<input type="hidden" />` instead.',
    )
    expect(navigate).toHaveBeenCalledWith(
      '/search-alt?q=button&source=submitter-action',
      0,
      'navigate',
      'push',
      undefined,
      false,
    )
  })

  it('does not intercept submitters with unsupported formTarget overrides', async () => {
    const { navigate } = installClientGlobals({ supportsSubmitter: true })
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { onSubmit } = await renderClientForm({ action: '/search' })
    const submitter = new FakeButtonElement({
      attributes: {
        formtarget: '_blank',
      },
    })
    const event = createSubmitEvent({
      entries: [['q', 'button']],
      submitter,
    })

    await onSubmit(event)

    expect(error).toHaveBeenCalledWith(
      `<Form>'s \`target\` was set to an unsupported value via \`formTarget="_blank"\`. This will disable <Form>'s navigation functionality. If you need this, use a native <form> element instead.`,
    )
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('respects onSubmit calling preventDefault — no client-side navigation', async () => {
    // Mirrors Text.js's `with-onsubmit-preventdefault` test:
    // .textjs-ref/test/e2e/text-form/default/shared-tests.util.ts:235
    // When the user's onSubmit handler calls preventDefault(), we must NOT
    // intercept for soft-navigation — let the user's logic own the submit.
    const { navigate } = installClientGlobals({ supportsSubmitter: true })
    const userOnSubmit = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault()
    })
    const { onSubmit } = await renderClientForm({ action: '/search', onSubmit: userOnSubmit })
    const event = createSubmitEvent({ entries: [['q', 'rue']] })

    await onSubmit(event)

    expect(userOnSubmit).toHaveBeenCalledOnce()
    expect(event.preventDefault).toHaveBeenCalledOnce()
    // Form's own preventDefault path (and navigate) should be skipped.
    expect(navigate).not.toHaveBeenCalled()
  })

  it('uses replace mode when `replace` prop is set', async () => {
    const { navigate } = installClientGlobals({ supportsSubmitter: true })
    const { onSubmit } = await renderClientForm({ action: '/search', replace: true })
    const event = createSubmitEvent({ entries: [['q', 'rue']] })

    await onSubmit(event)

    expect(navigate).toHaveBeenCalledWith(
      '/search?q=rue',
      0,
      'navigate',
      'replace',
      undefined,
      false,
    )
  })
})

describe('Form Pages Router soft navigation', () => {
  // When no App Router navigation runtime is present, the form must route via
  // the Pages Router singleton (`text/router`) so it triggers a real soft
  // navigation rather than a full MPA reload. This is the regression that
  // sub-issue #1355 calls out.
  //
  // We can't realistically boot the full Pages Router singleton inside a unit
  // test (it depends on `window.__TEXT_ROOT__` and a Vite-generated route
  // manifest). Instead, we assert the contract that matters at the shim
  // boundary: `preventDefault` was called, so the browser's native form
  // submission (which would be a hard MPA reload) is suppressed.

  function createPagesWindowStub() {
    const pushState = vi.fn()
    const replaceState = vi.fn()
    const scrollTo = vi.fn()
    const dispatched: Event[] = []

    return {
      pushState,
      replaceState,
      scrollTo,
      dispatched,
      window: {
        // Intentionally NO `text.navigationRuntime` — Pages Router context.
        history: {
          pushState,
          replaceState,
          state: null,
        },
        location: {
          origin: 'http://localhost:3000',
          href: 'http://localhost:3000/current',
          pathname: '/current',
          search: '',
          hash: '',
          hostname: 'localhost',
        },
        scrollTo,
        scrollX: 0,
        scrollY: 0,
        addEventListener: () => {},
        dispatchEvent: (event: Event) => {
          dispatched.push(event)
          return true
        },
      },
    }
  }

  function installPagesGlobals() {
    const stub = createPagesWindowStub()
    vi.stubGlobal('window', stub.window)
    vi.stubGlobal('Element', FakeElement)
    vi.stubGlobal('HTMLButtonElement', FakeButtonElement)
    vi.stubGlobal('HTMLInputElement', FakeInputElement)
    vi.stubGlobal('FormData', createFormDataClass({ supportsSubmitter: true }))
    vi.stubGlobal('PopStateEvent', class PopStateEvent extends Event {})
    return stub
  }

  it("calls preventDefault to suppress the browser's hard MPA submit", async () => {
    // Regression for #1355: without interception, the browser would submit
    // the form and trigger a full page reload (`didMpaNavigate` -> true).
    // Calling preventDefault is the only thing that can stop that.
    installPagesGlobals()
    const { onSubmit } = await renderClientForm({ action: '/results' })
    const event = createSubmitEvent({ entries: [['q', 'rue']] })

    await onSubmit(event)

    expect(event.preventDefault).toHaveBeenCalledOnce()
  })

  it('does not call preventDefault for non-GET forms (lets native submit run)', async () => {
    // POST forms (e.g. server actions) must not be intercepted by the Form's
    // navigation logic — Rue's own form-action handling owns them.
    installPagesGlobals()
    const { onSubmit } = await renderClientForm({ action: '/results', method: 'POST' })
    const event = createSubmitEvent({ entries: [['q', 'rue']] })

    await onSubmit(event)

    expect(event.preventDefault).not.toHaveBeenCalled()
  })
})

describe('Form function action (client/server action)', () => {
  it('passes a function `action` through for action handling', async () => {
    // Mirrors Text.js's `with-function/action-client` test path:
    // the action function must be wired up to the rendered <form>, not
    // intercepted as a navigation. The shim's job is just to thread it
    // through; the runtime owns the FormData dispatch.
    const actionFn = vi.fn(async (_formData: FormData) => {})
    const html = await renderAppServerElementToHtml(
      createElement(
        Form,
        { action: actionFn as any, id: 'search-form' },
        createElement('input', { name: 'query' }),
        createElement('button', { type: 'submit' }, 'Submit'),
      ),
    )
    expect(html).toContain('<form')
    expect(html).toContain('id="search-form"')
    // We never invoke the action during SSR — but we did successfully render
    // a form with the function attached for the client runtime.
    expect(actionFn).not.toHaveBeenCalled()
  })
})
