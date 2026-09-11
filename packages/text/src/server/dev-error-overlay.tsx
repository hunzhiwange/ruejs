// Dev-only runtime error overlay. Surfaces three error sources that
// otherwise only reach the console:
//   1. Render errors caught by an error.tsx boundary (onCaughtError)
//   2. Render errors with no boundary above them (onUncaughtError)
//   3. Plain script errors / unhandled promise rejections (window listeners)
//
// Rendered through a tiny DOM renderer mounted on a detached <div> appended to
// the body. That isolation keeps the overlay alive even when the app tree
// itself is torn down by the error we want to surface.

import { useSyncExternalStore } from '../shims/hooks-adapter.js'
import { useEffect } from '@rue-js/rue'
import { isNavigationSignalError } from '../utils/navigation-signal.js'
import {
  type OverlayState,
  type ReportedError,
  type Source,
  dismissOverlay,
  expandOverlay,
  getOverlaySnapshot,
  minimizeOverlay,
  reportToOverlay,
  setOverlayIndex,
  subscribeOverlay,
} from './dev-error-overlay-store.js'

// Re-export so callers (e.g. the HMR rsc:update handler) can clear the
// overlay when a new payload lands.
export { dismissOverlay } from './dev-error-overlay-store.js'

const MOUNT_NODE_ID = '__text_dev_error_overlay_root'

let installed = false
let overlayRoot: HTMLDivElement | null = null
let overlayKeyboardInstalled = false

type OverlayCssProperties = Record<string, string | number | undefined>

// Errors already routed through onCaughtError/onUncaughtError shouldn't
// also surface from the window listeners — otherwise the same throw appears
// twice in the dialog ("Runtime Error" + "Unhandled Script Error"). We track
// instances we've reported and skip them in the global handlers.
const reportedErrors = new WeakSet<object>()

function rememberReported(error: unknown): void {
  if (error && typeof error === 'object') reportedErrors.add(error)
}

function alreadyReported(error: unknown): boolean {
  return !!error && typeof error === 'object' && reportedErrors.has(error)
}

export function installDevErrorOverlay(): void {
  if (installed || typeof window === 'undefined') return
  installed = true

  window.addEventListener('error', (event: ErrorEvent) => {
    const err = event.error
    if (isNavigationSignalError(err)) return
    if (err instanceof Error) {
      if (alreadyReported(err)) return
      reportDevError(err, { source: 'window-error' })
    } else if (event.message) {
      reportDevError(new Error(event.message), { source: 'window-error' })
    }
  })

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason
    if (isNavigationSignalError(reason)) return
    if (reason instanceof Error) {
      if (alreadyReported(reason)) return
      reportDevError(reason, { source: 'unhandledrejection' })
    } else {
      reportDevError(new Error(String(reason)), { source: 'unhandledrejection' })
    }
  })
}

function reportDevError(
  error: unknown,
  options: { source: Source; componentStack?: string },
): void {
  if (typeof window === 'undefined') return

  rememberReported(error)

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : safeStringify(error)
  const stack = error instanceof Error ? error.stack : undefined

  ensureMounted()
  reportToOverlay({
    source: options.source,
    message,
    stack,
    componentStack: options.componentStack,
  })
}

// onCaughtError fires for boundary-caught errors. We log to the console
// (preserving the default behavior) and surface in the overlay. Sentinel errors
// (TEXT_NOT_FOUND, TEXT_REDIRECT, etc.) are re-thrown in getDerivedStateFromError
// before they reach onCaughtError, so they don't appear here in practice.
export function devOnCaughtError(
  error: unknown,
  errorInfo: { componentStack?: string; errorBoundary?: unknown },
): void {
  if (isNavigationSignalError(error)) return

  console.error(error)
  if (errorInfo?.componentStack) {
    console.error('The above error occurred in a component tree:\n' + errorInfo.componentStack)
  }
  reportDevError(error, { source: 'caught', componentStack: errorInfo?.componentStack })
}

// Dev variant of onUncaughtError. Surfaces the error in the overlay and stops
// — we deliberately do NOT perform the prod recovery navigation
// (window.location.assign) because in dev the overlay is the user-facing
// recovery; a hard navigation would blow it away along with the rest of the
// page. HMR or a manual refresh resumes the session once the bug is fixed.
export function devOnUncaughtError(
  error: unknown,
  errorInfo: { componentStack?: string; errorBoundary?: unknown },
): void {
  if (isNavigationSignalError(error)) return

  console.error(error)
  if (errorInfo?.componentStack) {
    console.error('The above error occurred in a component tree:\n' + errorInfo.componentStack)
  }
  reportDevError(error, { source: 'uncaught', componentStack: errorInfo?.componentStack })
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return Object.prototype.toString.call(value)
  }
}

function ensureMounted(): void {
  if (overlayRoot) return
  const node = document.createElement('div')
  node.id = MOUNT_NODE_ID
  // Fall back to documentElement in case body hasn't been parsed yet (e.g.
  // an extremely early hydration error firing before the body element is
  // attached). Either parent keeps the overlay outside the app-managed
  // root tree, which is what matters.
  ;(document.body ?? document.documentElement).appendChild(node)
  overlayRoot = node
  subscribeOverlay(renderOverlayDom)
  installOverlayKeyboardShortcuts()
  renderOverlayDom()
}

function installOverlayKeyboardShortcuts(): void {
  if (overlayKeyboardInstalled) return
  overlayKeyboardInstalled = true
  window.addEventListener('keydown', event => {
    const state = getOverlaySnapshot()
    if (state.errors.length === 0) return
    if (event.key === 'Escape') {
      minimizeOverlay()
    } else if (event.key === 'ArrowLeft' && state.errors.length > 1) {
      setOverlayIndex(state.index - 1)
    } else if (event.key === 'ArrowRight' && state.errors.length > 1) {
      setOverlayIndex(state.index + 1)
    }
  })
}

function applyStyle(element: HTMLElement, style: OverlayCssProperties): void {
  for (const [key, value] of Object.entries(style)) {
    if (value !== undefined) {
      element.style.setProperty(
        key.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`),
        String(value),
      )
    }
  }
}

function createStyledElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  style?: OverlayCssProperties,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag)
  if (style) applyStyle(element, style)
  return element
}

function createButton(
  label: string,
  options: {
    className: string
    testId: string
    ariaLabel: string
    title?: string
    disabled?: boolean
    onClick: () => void
  },
): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = options.className
  button.dataset.testid = options.testId
  button.ariaLabel = options.ariaLabel
  if (options.title) button.title = options.title
  button.disabled = options.disabled === true
  button.textContent = label
  button.addEventListener('click', event => {
    event.stopPropagation()
    options.onClick()
  })
  return button
}

function renderOverlayDom(): void {
  const root = overlayRoot
  if (!root) return

  const state = getOverlaySnapshot()
  root.replaceChildren()

  const style = document.createElement('style')
  style.textContent = overlayStylesheet
  root.appendChild(style)

  if (state.errors.length === 0) return

  const current = state.errors[state.index] ?? state.errors[0]!
  if (state.minimized) {
    const container = createStyledElement('div', indicatorContainerStyle)
    const button = createButton('', {
      className: 'text-overlay-indicator',
      testId: 'text-dev-error-indicator',
      ariaLabel: `${state.errors.length} runtime error${state.errors.length === 1 ? '' : 's'} - click to expand`,
      title: SOURCE_LABEL[current.source],
      onClick: expandOverlay,
    })
    const icon = createStyledElement('span', indicatorIconStyle)
    icon.ariaHidden = 'true'
    icon.textContent = '!'
    const count = createStyledElement('span', indicatorCountStyle)
    count.dataset.testid = 'text-dev-error-indicator-count'
    count.textContent = String(state.errors.length)
    button.append(icon, count)
    container.appendChild(button)
    root.appendChild(container)
    return
  }

  const backdrop = createStyledElement('div', backdropStyle)
  backdrop.dataset.testid = 'text-dev-error-backdrop'
  backdrop.addEventListener('click', minimizeOverlay)

  const dialog = createStyledElement('div', dialogStyle)
  dialog.dataset.testid = 'text-dev-error-overlay'
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')
  dialog.setAttribute('aria-label', SOURCE_LABEL[current.source])
  dialog.addEventListener('click', event => event.stopPropagation())

  const accent = createStyledElement('div', accentBarStyle)
  const header = createStyledElement('header', headerStyle)
  const headerLeft = createStyledElement('div', headerLeftStyle)
  const badge = createStyledElement('span', badgeStyle)
  badge.dataset.testid = 'text-dev-error-title'
  badge.textContent = SOURCE_LABEL[current.source]
  headerLeft.appendChild(badge)

  if (state.errors.length > 1) {
    const pagination = createStyledElement('div', paginationStyle)
    pagination.dataset.testid = 'text-dev-error-pagination'
    pagination.append(
      createButton('<', {
        className: 'text-overlay-nav',
        testId: 'text-dev-error-prev',
        ariaLabel: 'Previous error',
        disabled: state.index === 0,
        onClick: () => setOverlayIndex(state.index - 1),
      }),
    )
    const counter = createStyledElement('span', counterStyle)
    counter.dataset.testid = 'text-dev-error-counter'
    counter.textContent = `${state.index + 1} of ${state.errors.length}`
    pagination.append(counter)
    pagination.append(
      createButton('>', {
        className: 'text-overlay-nav',
        testId: 'text-dev-error-text',
        ariaLabel: 'Text error',
        disabled: state.index === state.errors.length - 1,
        onClick: () => setOverlayIndex(state.index + 1),
      }),
    )
    headerLeft.appendChild(pagination)
  }

  header.append(
    headerLeft,
    createButton('-', {
      className: 'text-overlay-minimize',
      testId: 'text-dev-error-minimize',
      ariaLabel: 'Minimize',
      title: 'Minimize (Esc)',
      onClick: minimizeOverlay,
    }),
    createButton('x', {
      className: 'text-overlay-close',
      testId: 'text-dev-error-dismiss',
      ariaLabel: 'Dismiss',
      onClick: dismissOverlay,
    }),
  )

  const body = createStyledElement('div', bodyStyle)
  const message = createStyledElement('pre', messageStyle)
  message.dataset.testid = 'text-dev-error-message'
  message.textContent = current.message
  body.appendChild(message)

  const frames = current.stack ? parseStack(current.stack) : []
  if (frames.length > 0) {
    const list = createStyledElement('ol', stackListStyle)
    list.dataset.testid = 'text-dev-error-stack'
    for (const frame of frames) {
      const item = createStyledElement('li', stackItemStyle)
      item.className = 'text-overlay-frame'
      const fn = createStyledElement('span', frameFnStyle)
      fn.textContent = frame.fn
      const loc = createStyledElement('span', frameLocStyle)
      loc.textContent = frame.loc
      item.append(fn, loc)
      list.appendChild(item)
    }
    body.appendChild(list)
  }

  if (current.componentStack) {
    const details = createStyledElement('details', detailsStyle)
    const summary = createStyledElement('summary', summaryStyle)
    summary.textContent = 'Component stack'
    const stack = createStyledElement('pre', componentStackStyle)
    stack.textContent = current.componentStack
    details.append(summary, stack)
    body.appendChild(details)
  }

  dialog.append(accent, header, body)
  backdrop.appendChild(dialog)
  root.appendChild(backdrop)
}

// ---------------------------------------------------------------------------
// Overlay component tree
// ---------------------------------------------------------------------------

const SOURCE_LABEL: Record<Source, string> = {
  uncaught: 'Unhandled Runtime Error',
  caught: 'Runtime Error',
  'window-error': 'Unhandled Script Error',
  unhandledrejection: 'Unhandled Promise Rejection',
}

function _DevErrorOverlayApp(): unknown {
  const state = useSyncExternalStore<OverlayState>(
    subscribeOverlay,
    getOverlaySnapshot,
    getOverlaySnapshot,
  )
  if (state.errors.length === 0) return null
  const current = state.errors[state.index] ?? state.errors[0]!

  // Render the stylesheet once at the root so it's not re-injected when
  // toggling between minimized and expanded states.
  return (
    <>
      <style>{overlayStylesheet}</style>
      {state.minimized ? (
        <DevErrorIndicator
          count={state.errors.length}
          source={current.source}
          onExpand={expandOverlay}
        />
      ) : (
        <DevErrorOverlay
          error={current}
          index={state.index}
          total={state.errors.length}
          // setOverlayIndex bounds-checks internally and the prev/text
          // buttons are disabled at the edges, so no clamp needed here.
          onPrev={() => setOverlayIndex(state.index - 1)}
          onText={() => setOverlayIndex(state.index + 1)}
          onMinimize={minimizeOverlay}
          onDismiss={dismissOverlay}
        />
      )}
    </>
  )
}

function DevErrorIndicator({
  count,
  source,
  onExpand,
}: {
  count: number
  source: Source
  onExpand: () => void
}): unknown {
  return (
    <div style={indicatorContainerStyle}>
      <button
        type="button"
        data-testid="text-dev-error-indicator"
        aria-label={`${count} runtime error${count === 1 ? '' : 's'} — click to expand`}
        title={SOURCE_LABEL[source]}
        onClick={onExpand}
        className="text-overlay-indicator"
      >
        <span aria-hidden="true" style={indicatorIconStyle}>
          ⚠
        </span>
        <span data-testid="text-dev-error-indicator-count" style={indicatorCountStyle}>
          {count}
        </span>
      </button>
    </div>
  )
}

function DevErrorOverlay({
  error,
  index,
  total,
  onPrev,
  onText,
  onMinimize,
  onDismiss,
}: {
  error: ReportedError
  index: number
  total: number
  onPrev: () => void
  onText: () => void
  onMinimize: () => void
  onDismiss: () => void
}): unknown {
  const frames = error.stack ? parseStack(error.stack) : []

  // Esc minimizes, ←/→ navigate between errors. Esc no longer dismisses
  // outright — once a developer wants the overlay gone they can hit the ×
  // button. Listener is attached on the window so it works regardless of
  // focus location inside the overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onMinimize()
      } else if (e.key === 'ArrowLeft' && total > 1) {
        onPrev()
      } else if (e.key === 'ArrowRight' && total > 1) {
        onText()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onMinimize, onPrev, onText, total])

  return (
    <div style={backdropStyle} data-testid="text-dev-error-backdrop" onClick={onMinimize}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={SOURCE_LABEL[error.source]}
        data-testid="text-dev-error-overlay"
        style={dialogStyle}
        onClick={e => e.stopPropagation()}
      >
        <div style={accentBarStyle} />

        <header style={headerStyle}>
          <div style={headerLeftStyle}>
            <span data-testid="text-dev-error-title" style={badgeStyle}>
              {SOURCE_LABEL[error.source]}
            </span>
            {total > 1 ? (
              <div data-testid="text-dev-error-pagination" style={paginationStyle}>
                <button
                  type="button"
                  data-testid="text-dev-error-prev"
                  onClick={onPrev}
                  disabled={index === 0}
                  className="text-overlay-nav"
                  aria-label="Previous error"
                >
                  ‹
                </button>
                <span data-testid="text-dev-error-counter" style={counterStyle}>
                  {index + 1} of {total}
                </span>
                <button
                  type="button"
                  data-testid="text-dev-error-text"
                  onClick={onText}
                  disabled={index === total - 1}
                  className="text-overlay-nav"
                  aria-label="Text error"
                >
                  ›
                </button>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            data-testid="text-dev-error-minimize"
            onClick={onMinimize}
            className="text-overlay-minimize"
            aria-label="Minimize"
            title="Minimize (Esc)"
          >
            –
          </button>
          <button
            type="button"
            data-testid="text-dev-error-close"
            onClick={onDismiss}
            className="text-overlay-close"
            aria-label="Dismiss"
            title="Dismiss all errors"
          >
            ×
          </button>
        </header>

        <div style={bodyStyle}>
          <h2 data-testid="text-dev-error-message" style={messageStyle}>
            {error.message}
          </h2>

          {frames.length > 0 ? (
            <ol data-testid="text-dev-error-stack" style={stackListStyle}>
              {frames.map(frame => (
                <li key={frame.key} className="text-overlay-frame" style={stackItemStyle}>
                  <span style={frameFnStyle}>{frame.fn}</span>
                  {frame.file ? (
                    <span style={frameLocStyle}>
                      {frame.file}
                      {frame.line ? `:${frame.line}` : ''}
                      {frame.col ? `:${frame.col}` : ''}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : null}

          {error.componentStack ? (
            <details style={detailsStyle}>
              <summary style={summaryStyle}>Component stack</summary>
              <pre data-testid="text-dev-error-component-stack" style={componentStackStyle}>
                {error.componentStack}
              </pre>
            </details>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stack parsing — handles V8 ("    at fn (file:line:col)") and SpiderMonkey/
// JavaScriptCore ("fn@file:line:col") formats. Lines that don't match either
// shape are kept verbatim as a function-name-only frame so the overlay still
// renders something useful in unfamiliar runtimes.
// ---------------------------------------------------------------------------

type Frame = { key: string; fn: string; file?: string; line?: string; col?: string }

const V8_PAREN_FRAME = /^(.*?)\s*\((.+):(\d+):(\d+)\)$/
const V8_BARE_FRAME = /^(.+):(\d+):(\d+)$/
const MOZ_FRAME = /^(.*?)@(.+):(\d+):(\d+)$/

function parseStack(stack: string): Frame[] {
  const frames: Frame[] = []
  // Suffix repeat occurrences with #2, #3 so frame keys stay unique even when
  // the same frame appears multiple times in a recursive stack.
  const seen = new Map<string, number>()
  const pushFrame = (fn: string, file?: string, line?: string, col?: string): void => {
    const base = `${fn}@${file ?? ''}:${line ?? ''}:${col ?? ''}`
    const count = (seen.get(base) ?? 0) + 1
    seen.set(base, count)
    const key = count === 1 ? base : `${base}#${count}`
    frames.push({ key, fn, file, line, col })
  }
  for (const raw of stack.split('\n')) {
    const line = raw.trim()
    if (!line) continue

    // V8 / Chromium: "    at fn (file:line:col)" or "    at file:line:col"
    if (line.startsWith('at ')) {
      const body = line.slice(3)
      const parenMatch = body.match(V8_PAREN_FRAME)
      if (parenMatch) {
        pushFrame(parenMatch[1] || '<anonymous>', parenMatch[2], parenMatch[3], parenMatch[4])
        continue
      }
      const bareMatch = body.match(V8_BARE_FRAME)
      if (bareMatch) {
        pushFrame('<anonymous>', bareMatch[1], bareMatch[2], bareMatch[3])
        continue
      }
      pushFrame(body)
      continue
    }

    // SpiderMonkey (Firefox) / JavaScriptCore (Safari): "fn@file:line:col".
    // The first line of a Firefox stack is the error message itself; skip it
    // by requiring the @-form match.
    const mozMatch = line.match(MOZ_FRAME)
    if (mozMatch) {
      pushFrame(mozMatch[1] || '<anonymous>', mozMatch[2], mozMatch[3], mozMatch[4])
      continue
    }

    // Unknown shape — preserve the line as a function-name-only frame so the
    // overlay shows something rather than dropping the line silently.
    pushFrame(line)
  }
  return frames
}

// ---------------------------------------------------------------------------
// Inline styles + a tiny stylesheet for hover/focus + entrance animation.
// Keeping it all in this file means the overlay has no external CSS
// dependency and works the same way in any host app.
// ---------------------------------------------------------------------------

const FONT_STACK =
  "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
const MONO_STACK = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

const overlayStylesheet = `
@keyframes textOverlayBackdropIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes textOverlayDialogIn {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes textOverlayIndicatorIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.text-overlay-nav {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 2px 8px;
  font-size: 14px;
  line-height: 1;
  border-radius: 6px;
  transition: background 0.12s ease;
}
.text-overlay-nav:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
}
.text-overlay-nav:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.text-overlay-minimize,
.text-overlay-close {
  background: transparent;
  border: none;
  color: #a1a1aa;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.12s ease, color 0.12s ease;
}
.text-overlay-minimize:hover,
.text-overlay-close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fafafa;
}
.text-overlay-close { font-size: 20px; }
.text-overlay-frame {
  padding: 8px 12px;
  border-radius: 6px;
  transition: background 0.12s ease;
}
.text-overlay-frame:hover {
  background: rgba(255, 255, 255, 0.04);
}
.text-overlay-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: #18181b;
  color: #fafafa;
  border: 1px solid rgba(239, 68, 68, 0.45);
  font: 600 13px ${FONT_STACK};
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease, transform 0.12s ease;
  animation: textOverlayIndicatorIn 0.18s ease-out;
}
.text-overlay-indicator:hover {
  background: #1f1f23;
  border-color: rgba(239, 68, 68, 0.7);
  transform: translateY(-1px);
}
`

const backdropStyle: OverlayCssProperties = {
  // The backdrop captures click-outside-to-minimize as a proper modal would —
  // a click on it dismisses the overlay rather than reaching the page
  // underneath. The dialog re-enables pointer events for itself via
  // dialogStyle.
  position: 'fixed',
  inset: 0,
  background: 'rgba(10, 10, 12, 0.55)',
  backdropFilter: 'blur(3px)',
  WebkitBackdropFilter: 'blur(3px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  zIndex: 2147483646,
  animation: 'textOverlayBackdropIn 0.15s ease-out',
}

const dialogStyle: OverlayCssProperties = {
  position: 'relative',
  pointerEvents: 'auto',
  width: 'min(640px, 100%)',
  maxHeight: 'min(80vh, 720px)',
  display: 'flex',
  flexDirection: 'column',
  background: '#0a0a0a',
  color: '#fafafa',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: 12,
  fontFamily: FONT_STACK,
  fontSize: 14,
  lineHeight: 1.5,
  overflow: 'hidden',
  animation: 'textOverlayDialogIn 0.18s ease-out',
}

const indicatorContainerStyle: OverlayCssProperties = {
  position: 'fixed',
  bottom: 16,
  left: 16,
  zIndex: 2147483646,
}

const indicatorIconStyle: OverlayCssProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ef4444',
  fontSize: 14,
}

const indicatorCountStyle: OverlayCssProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 18,
  padding: '0 6px',
  height: 18,
  borderRadius: 999,
  background: 'rgba(239, 68, 68, 0.18)',
  color: '#fca5a5',
  fontSize: 11,
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
}

const accentBarStyle: OverlayCssProperties = {
  height: 3,
  background: 'linear-gradient(90deg, #ef4444 0%, #f97316 100%)',
}

const headerStyle: OverlayCssProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '14px 16px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
}

const headerLeftStyle: OverlayCssProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minWidth: 0,
}

const badgeStyle: OverlayCssProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  background: 'rgba(239, 68, 68, 0.12)',
  color: '#fca5a5',
  border: '1px solid rgba(239, 68, 68, 0.25)',
  padding: '3px 10px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 0.2,
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
}

const paginationStyle: OverlayCssProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  color: '#a1a1aa',
  fontSize: 12,
}

const counterStyle: OverlayCssProperties = {
  padding: '0 4px',
  fontVariantNumeric: 'tabular-nums',
}

const bodyStyle: OverlayCssProperties = {
  padding: '16px 20px 20px',
  overflow: 'auto',
  flex: 1,
}

const messageStyle: OverlayCssProperties = {
  margin: '0 0 16px 0',
  fontFamily: MONO_STACK,
  fontSize: 16,
  fontWeight: 500,
  lineHeight: 1.45,
  color: '#fafafa',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}

const stackListStyle: OverlayCssProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  fontFamily: MONO_STACK,
  fontSize: 12,
}

const stackItemStyle: OverlayCssProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  cursor: 'default',
}

const frameFnStyle: OverlayCssProperties = {
  color: '#fafafa',
  fontWeight: 500,
}

const frameLocStyle: OverlayCssProperties = {
  color: '#71717a',
  fontSize: 11,
}

const detailsStyle: OverlayCssProperties = {
  marginTop: 16,
  paddingTop: 12,
  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  color: '#a1a1aa',
  fontSize: 12,
}

const summaryStyle: OverlayCssProperties = {
  cursor: 'pointer',
  userSelect: 'none',
  padding: '4px 0',
  color: '#a1a1aa',
  fontWeight: 500,
}

const componentStackStyle: OverlayCssProperties = {
  margin: '8px 0 0 0',
  fontFamily: MONO_STACK,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  color: '#a1a1aa',
}
