import { spawn } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export { createServerBundleRenderPool } from './static-worker-pool.mjs'

const linkTagRe = /\n?[ \t]*<link\b[^>]*\/?>/gi
const scriptTagRe = /\n?[ \t]*<script\b[^>]*>[\s\S]*?<\/script>/gi

const defaultStaticRenderHtml = '<!doctype html><html><body><div id="app"></div></body></html>'
const defaultStaticRenderBaseUrl = 'http://127.0.0.1'
const defaultStaticSnapshotAppSelector = '#app'
const defaultStaticSnapshotSettleMs = 750
const defaultStaticSnapshotWaitMs = 9000
const staticAssetHosts = new Set(['127.0.0.1', 'localhost', '::1', '[::1]'])

const defaultPreviewContentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.map': 'application/json',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

const assertStringPath = (value, label) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${label} must be a non-empty string.`)
  }
}

const assertObjectOptions = (value, label) => {
  if (!value || typeof value !== 'object') {
    throw new TypeError(`${label} must be an object.`)
  }
}

const resolveStaticDuration = (value, fallback, label) => {
  if (value === undefined || value === null) {
    return fallback
  }

  const duration = Number(value)
  if (!Number.isFinite(duration) || duration < 0) {
    throw new TypeError(`${label} must be a non-negative number.`)
  }

  return duration
}

const isInsideDir = (dir, file) => {
  const relative = path.relative(dir, file)
  return (
    relative === '' || (relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative))
  )
}

const getExistingStaticFile = async (staticDir, file) => {
  const resolvedFile = path.resolve(file)

  if (!isInsideDir(staticDir, resolvedFile)) {
    return null
  }

  try {
    const info = await stat(resolvedFile)
    return info.isFile() ? resolvedFile : null
  } catch {
    return null
  }
}

export const normalizeStaticRoute = route => {
  if (typeof route !== 'string' || route.trim() === '') return null
  const withoutHash = route.trim().split('#')[0]
  const withoutSearch = withoutHash.split('?')[0]
  const normalized = withoutSearch.startsWith('/') ? withoutSearch : `/${withoutSearch}`
  return normalized.length > 1 ? normalized.replace(/\/+$/g, '') : '/'
}

const assertStaticRoute = route => {
  const normalized = normalizeStaticRoute(route)

  if (!normalized) {
    throw new TypeError('route must be a non-empty string.')
  }

  return normalized
}

const createStaticRenderUrl = (route, baseUrl = defaultStaticRenderBaseUrl) => {
  return new URL(route.startsWith('/') ? route : `/${route}`, baseUrl).href
}

const getQuotedHtmlAttribute = (tag, name) => {
  const match = new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i').exec(tag)
  return match?.[1] || null
}

const findStaticClientModuleEntry = template => {
  const scriptRe = /<script\b[^>]*>/gi
  let match

  while ((match = scriptRe.exec(String(template)))) {
    const tag = match[0]
    const type = getQuotedHtmlAttribute(tag, 'type')
    const src = getQuotedHtmlAttribute(tag, 'src')

    if (type?.toLowerCase() === 'module' && src) {
      return src
    }
  }

  throw new Error('Could not find the client module entry in the static client template.')
}

const resolveOutDirFile = (outDir, pathname) => {
  let decodedPathname

  try {
    decodedPathname = decodeURIComponent(pathname)
  } catch {
    return null
  }

  const resolvedFile = path.resolve(outDir, decodedPathname.replace(/^\/+/, ''))
  return isInsideDir(outDir, resolvedFile) ? resolvedFile : null
}

const resolveStaticClientFile = (outDir, source) => {
  const rawSource = String(source || '')

  if (!rawSource) {
    return null
  }

  let parsed
  try {
    parsed = new URL(rawSource, defaultStaticRenderBaseUrl)
  } catch {
    return null
  }

  if (parsed.protocol === 'file:') {
    const file = fileURLToPath(parsed)
    return isInsideDir(outDir, file) ? file : null
  }

  if (
    (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
    !staticAssetHosts.has(parsed.hostname)
  ) {
    return null
  }

  return resolveOutDirFile(outDir, parsed.pathname)
}

const resolveStaticAssetFile = (outDir, input, baseUrl) => {
  const rawUrl =
    typeof input === 'string' ? input : typeof input?.href === 'string' ? input.href : input?.url

  if (!rawUrl) {
    return null
  }

  let parsed
  try {
    parsed = new URL(rawUrl, baseUrl)
  } catch {
    return null
  }

  if (parsed.protocol === 'file:') {
    const file = fileURLToPath(parsed)
    // Bundled preload helpers resolve root-based assets against import.meta.url in Node.
    if (!parsed.host && parsed.pathname.startsWith('/assets/')) {
      return resolveOutDirFile(outDir, parsed.pathname)
    }
    return isInsideDir(outDir, file) ? file : null
  }

  if (
    (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
    !staticAssetHosts.has(parsed.hostname) ||
    !parsed.pathname.startsWith('/assets/')
  ) {
    return null
  }

  return resolveOutDirFile(outDir, parsed.pathname)
}

const resolveStaticContentType = file => {
  return defaultPreviewContentTypes[path.extname(file).toLowerCase()] || 'application/octet-stream'
}

const createStaticAssetFetch = (outDir, baseUrl) => {
  const nativeFetch =
    typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null
  const NativeHeaders = globalThis.Headers
  const NativeResponse = globalThis.Response

  return async (input, init) => {
    const file = resolveStaticAssetFile(outDir, input, baseUrl)

    if (file) {
      if (typeof NativeResponse !== 'function' || typeof NativeHeaders !== 'function') {
        throw new Error('Static asset fetch requires global Response and Headers constructors.')
      }

      const body = await readFile(file)
      return new NativeResponse(body, {
        headers: new NativeHeaders({
          'content-type': resolveStaticContentType(file),
        }),
      })
    }

    if (nativeFetch) {
      return nativeFetch(input, init)
    }

    throw new TypeError('No native fetch is available for non-static assets.')
  }
}

const defineStaticGlobal = (snapshots, key, value) => {
  if (!snapshots.has(key)) {
    snapshots.set(key, Object.getOwnPropertyDescriptor(globalThis, key) || null)
  }

  Object.defineProperty(globalThis, key, {
    value,
    configurable: true,
    enumerable: true,
    writable: true,
  })
}

const restoreStaticGlobals = snapshots => {
  for (const [key, descriptor] of Array.from(snapshots.entries()).reverse()) {
    if (descriptor) {
      Object.defineProperty(globalThis, key, descriptor)
    } else {
      Reflect.deleteProperty(globalThis, key)
    }
  }
}

const createMatchMediaShim = query => ({
  matches: false,
  media: String(query),
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent() {
    return false
  },
})

const createCanvasContextShim = () => ({
  beginPath() {},
  clearRect() {},
  closePath() {},
  drawImage() {},
  fill() {},
  fillRect() {},
  fillText() {},
  measureText: text => ({ width: String(text).length * 8 }),
  moveTo() {},
  lineTo() {},
  quadraticCurveTo() {},
  rect() {},
  restore() {},
  rotate() {},
  save() {},
  scale() {},
  stroke() {},
  translate() {},
  set fillStyle(_value) {},
  set font(_value) {},
  set globalAlpha(_value) {},
  set lineWidth(_value) {},
  set strokeStyle(_value) {},
  set textAlign(_value) {},
  set textBaseline(_value) {},
})

const installStaticCanvasShim = window => {
  const canvasProto = window.HTMLCanvasElement?.prototype

  if (!canvasProto) return

  canvasProto.getContext = () => createCanvasContextShim()
  canvasProto.toDataURL = () => 'data:image/png;base64,'
}

const installStaticScrollShim = window => {
  for (const method of ['scroll', 'scrollBy', 'scrollTo']) {
    Object.defineProperty(window, method, {
      value() {},
      configurable: true,
      writable: true,
    })
  }
}

const installStaticRenderGlobals = (window, snapshots, options = {}) => {
  const timeoutHandles = new Set()
  const intervalHandles = new Set()
  const nativeSetTimeout = globalThis.setTimeout?.bind(globalThis)
  const nativeClearTimeout = globalThis.clearTimeout?.bind(globalThis)
  const nativeSetInterval = globalThis.setInterval?.bind(globalThis)
  const nativeClearInterval = globalThis.clearInterval?.bind(globalThis)
  const setTimeout =
    typeof nativeSetTimeout === 'function'
      ? (callback, delay, ...args) => {
          let handle
          const wrapped = (...callbackArgs) => {
            timeoutHandles.delete(handle)
            callback(...callbackArgs)
          }
          handle = nativeSetTimeout(wrapped, delay, ...args)
          timeoutHandles.add(handle)
          return handle
        }
      : undefined
  const clearTimeout =
    typeof nativeClearTimeout === 'function'
      ? handle => {
          timeoutHandles.delete(handle)
          nativeClearTimeout(handle)
        }
      : undefined
  const setInterval =
    typeof nativeSetInterval === 'function'
      ? (callback, delay, ...args) => {
          const handle = nativeSetInterval(callback, delay, ...args)
          intervalHandles.add(handle)
          return handle
        }
      : undefined
  const clearInterval =
    typeof nativeClearInterval === 'function'
      ? handle => {
          intervalHandles.delete(handle)
          nativeClearInterval(handle)
        }
      : undefined

  const globals = {
    window,
    self: window,
    document: window.document,
    navigator: window.navigator,
    location: window.location,
    history: window.history,
    Node: window.Node,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
    HTMLCanvasElement: window.HTMLCanvasElement,
    SVGElement: window.SVGElement,
    Text: window.Text,
    Comment: window.Comment,
    DocumentFragment: window.DocumentFragment,
    CustomEvent: window.CustomEvent,
    Event: window.Event,
    MouseEvent: window.MouseEvent,
    KeyboardEvent: window.KeyboardEvent,
    FocusEvent: window.FocusEvent,
    InputEvent: window.InputEvent,
    DOMRect: window.DOMRect,
    MutationObserver: window.MutationObserver,
    URL: window.URL,
    URLSearchParams: window.URLSearchParams,
    Blob: window.Blob,
    File: window.File,
    FormData: window.FormData,
    Headers: window.Headers,
    Request: window.Request,
    Response: window.Response,
    AbortController: window.AbortController,
    atob: window.atob.bind(window),
    btoa: window.btoa.bind(window),
    getComputedStyle: window.getComputedStyle.bind(window),
    localStorage: window.localStorage,
    sessionStorage: window.sessionStorage,
    // Client bundles resolve timer globals from globalThis in Node. Track those
    // timers so they cannot outlive the static DOM that created them.
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  }

  for (const [key, value] of Object.entries(globals)) {
    if (value !== undefined) {
      defineStaticGlobal(snapshots, key, value)
    }
  }

  if (typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      value: createMatchMediaShim,
      configurable: true,
      writable: true,
    })
  }
  defineStaticGlobal(snapshots, 'matchMedia', window.matchMedia.bind(window))

  if (typeof window.requestIdleCallback !== 'function') {
    Object.defineProperty(window, 'requestIdleCallback', {
      value: callback =>
        window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 }), 1),
      configurable: true,
      writable: true,
    })
    Object.defineProperty(window, 'cancelIdleCallback', {
      value: id => window.clearTimeout(id),
      configurable: true,
      writable: true,
    })
  }
  defineStaticGlobal(snapshots, 'requestIdleCallback', window.requestIdleCallback.bind(window))
  defineStaticGlobal(snapshots, 'cancelIdleCallback', window.cancelIdleCallback.bind(window))

  if (options.installObserverShims !== false) {
    if (typeof globalThis.ResizeObserver !== 'function') {
      defineStaticGlobal(
        snapshots,
        'ResizeObserver',
        class ResizeObserver {
          observe() {}
          unobserve() {}
          disconnect() {}
        },
      )
    }

    if (typeof globalThis.IntersectionObserver !== 'function') {
      defineStaticGlobal(
        snapshots,
        'IntersectionObserver',
        class IntersectionObserver {
          observe() {}
          unobserve() {}
          disconnect() {}
          takeRecords() {
            return []
          }
        },
      )
    }
  }

  if (options.installCanvasShim !== false) {
    installStaticCanvasShim(window)
  }

  installStaticScrollShim(window)

  if (options.extraGlobals && typeof options.extraGlobals === 'object') {
    for (const [key, value] of Object.entries(options.extraGlobals)) {
      defineStaticGlobal(snapshots, key, value)
    }
  }

  return () => {
    if (typeof nativeClearTimeout === 'function') {
      for (const handle of timeoutHandles) nativeClearTimeout(handle)
    }
    if (typeof nativeClearInterval === 'function') {
      for (const handle of intervalHandles) nativeClearInterval(handle)
    }
    timeoutHandles.clear()
    intervalHandles.clear()
  }
}

const importStaticServerBundle = specifier => {
  return import(/* @vite-ignore */ specifier)
}

const importStaticClientEntry = specifier => {
  return import(/* @vite-ignore */ specifier)
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

export const staticRouteToOutputFile = (route, outDir) => {
  assertStringPath(outDir, 'outDir')

  const normalized = normalizeStaticRoute(route)
  if (!normalized) {
    return null
  }

  const resolvedOutDir = path.resolve(outDir)
  const outputFile =
    normalized === '/'
      ? path.join(resolvedOutDir, 'index.html')
      : path.join(resolvedOutDir, ...normalized.split('/').filter(Boolean), 'index.html')

  return isInsideDir(resolvedOutDir, outputFile) ? outputFile : null
}

const readHtmlAttribute = (tag, name) => {
  const match = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))`,
    'i',
  ).exec(tag)
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null
}

const normalizeClientRuntimeAssets = clientRuntimeAssets => {
  if (
    clientRuntimeAssets == null ||
    typeof clientRuntimeAssets === 'string' ||
    typeof clientRuntimeAssets[Symbol.iterator] !== 'function'
  ) {
    throw new TypeError('clientRuntimeAssets must be an iterable of asset URLs')
  }

  return new Set([...clientRuntimeAssets].map(asset => String(asset)))
}

const normalizeStaticClientEntry = (entry, name) => {
  if (!entry || typeof entry !== 'object') {
    throw new TypeError(`clientEntries.${name} must describe a client entry`)
  }

  const entryUrl = String(entry.entry || '')
  if (!entryUrl) {
    throw new TypeError(`clientEntries.${name}.entry must be a non-empty asset URL`)
  }

  const assets = normalizeClientRuntimeAssets(entry.assets)
  assets.add(entryUrl)
  return { entry: entryUrl, assets }
}

const normalizeStaticClientEntries = clientEntries => {
  if (!clientEntries || typeof clientEntries !== 'object' || Array.isArray(clientEntries)) {
    throw new TypeError('clientEntries must be a named client entry record')
  }

  const entries = Object.fromEntries(
    Object.entries(clientEntries).map(([name, entry]) => [
      name,
      normalizeStaticClientEntry(entry, name),
    ]),
  )
  if (Object.keys(entries).length === 0) {
    throw new TypeError('clientEntries must contain at least one named client entry')
  }

  return entries
}

const escapeHtmlAttribute = value =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const injectStaticClientEntries = (html, entries) => {
  const entryUrls = new Set(entries.map(entry => entry.entry))
  const assets = new Set(entries.flatMap(entry => [...entry.assets]))
  const tags = [...assets]
    .filter(asset => !entryUrls.has(asset))
    .sort()
    .map(asset => `<link rel="modulepreload" crossorigin href="${escapeHtmlAttribute(asset)}">`)
  tags.push(
    ...entries.map(
      entry =>
        `<script type="module" crossorigin src="${escapeHtmlAttribute(entry.entry)}"></script>`,
    ),
  )

  const block = tags.map(tag => `    ${tag}`).join('\n')
  return /<\/head\s*>/i.test(html)
    ? html.replace(/<\/head\s*>/i, `${block}\n  </head>`)
    : `${html}\n${tags.join('\n')}`
}

export const stripStaticClientRuntime = (html, clientRuntimeAssets) => {
  const assets = normalizeClientRuntimeAssets(clientRuntimeAssets)
  return String(html)
    .replace(linkTagRe, tag =>
      readHtmlAttribute(tag, 'rel')?.toLowerCase().split(/\s+/).includes('modulepreload') &&
      assets.has(readHtmlAttribute(tag, 'href'))
        ? ''
        : tag,
    )
    .replace(scriptTagRe, tag =>
      readHtmlAttribute(tag, 'type')?.toLowerCase() === 'module' &&
      assets.has(readHtmlAttribute(tag, 'src'))
        ? ''
        : tag,
    )
}

export const createStaticRouteHtml = (template, appHtml, options = {}) => {
  const html = String(template).replace('<div id="app"></div>', `<div id="app">${appHtml}</div>`)

  if ('clientMode' in options || 'clientModes' in options || 'clientEntries' in options) {
    const clientEntries = normalizeStaticClientEntries(options.clientEntries)
    const rawModes = 'clientModes' in options ? options.clientModes : [options.clientMode || 'app']
    if (
      rawModes == null ||
      typeof rawModes === 'string' ||
      typeof rawModes[Symbol.iterator] !== 'function'
    ) {
      throw new TypeError('clientModes must be an iterable of named client entry modes')
    }

    const modes = [...new Set([...rawModes].map(mode => String(mode)))]
    if (modes.includes('none') && modes.length > 1) {
      throw new TypeError('client mode "none" cannot be combined with named client entries')
    }
    const selectedModes = modes.filter(mode => mode !== 'none')
    for (const mode of selectedModes) {
      if (!clientEntries[mode]) {
        throw new TypeError(`client mode "${mode}" has no matching client entry`)
      }
    }

    const ownedAssets = new Set(Object.values(clientEntries).flatMap(entry => [...entry.assets]))
    const strippedHtml = stripStaticClientRuntime(html, ownedAssets)
    return selectedModes.length === 0
      ? strippedHtml
      : injectStaticClientEntries(
          strippedHtml,
          selectedModes.map(mode => clientEntries[mode]),
        )
  }

  const { includeClientRuntime = true, clientRuntimeAssets } = options
  return includeClientRuntime ? html : stripStaticClientRuntime(html, clientRuntimeAssets)
}

export const runWithStaticRenderDom = async (route, callback, options = {}) => {
  const normalizedRoute = assertStaticRoute(route)

  if (typeof callback !== 'function') {
    throw new TypeError('callback must be a function.')
  }

  const { JSDOM } = await import('jsdom')
  const dom = new JSDOM(options.html || defaultStaticRenderHtml, {
    pretendToBeVisual: true,
    url: createStaticRenderUrl(normalizedRoute, options.baseUrl),
  })
  const snapshots = new Map()
  let cleanupTimers = () => {}

  try {
    cleanupTimers = installStaticRenderGlobals(dom.window, snapshots, options)
    return await callback({
      dom,
      window: dom.window,
      document: dom.window.document,
      route: normalizedRoute,
    })
  } finally {
    cleanupTimers()
    restoreStaticGlobals(snapshots)
    dom.window.close()
  }
}

export const waitForStaticAppHtml = async (window, options = {}) => {
  if (!window?.document || typeof window.document.querySelector !== 'function') {
    throw new TypeError('window must be a DOM window.')
  }

  const appSelector = options.appSelector || defaultStaticSnapshotAppSelector
  assertStringPath(appSelector, 'appSelector')

  const settleMs = resolveStaticDuration(
    options.settleMs,
    defaultStaticSnapshotSettleMs,
    'settleMs',
  )
  const waitMs = resolveStaticDuration(options.waitMs, defaultStaticSnapshotWaitMs, 'waitMs')
  const start = Date.now()
  let stableHtml = ''
  let stableSince = 0
  let contentSince = 0

  while (Date.now() - start < waitMs) {
    await delay(50)
    await Promise.resolve()

    const app = window.document.querySelector(appSelector)
    const html = app?.innerHTML?.trim() || ''
    const text = app?.textContent?.trim() || ''
    const hasContent = html && (app.children.length > 0 || text)

    if (!hasContent) {
      stableHtml = ''
      stableSince = 0
      contentSince = 0
      continue
    }

    // Some client routes intentionally keep updating their DOM (for example, a
    // countdown). Static snapshots still need a deterministic first rendered
    // state instead of waiting for a state that can never become stable.
    if (!contentSince) {
      contentSince = Date.now()
    }

    if (html !== stableHtml) {
      stableHtml = html
      stableSince = Date.now()
    }

    if (Date.now() - stableSince >= settleMs || Date.now() - contentSince >= settleMs) {
      return html
    }
  }

  throw new Error(`Static snapshot did not render ${appSelector} content within ${waitMs}ms.`)
}

export const snapshotClientRoute = async options => {
  assertObjectOptions(options, 'options')

  const { outDir, route, outputFile, templateFile, settleMs, waitMs, appSelector, ...domOptions } =
    options
  assertStringPath(outDir, 'outDir')
  assertStringPath(outputFile, 'outputFile')

  if (templateFile !== undefined) {
    assertStringPath(templateFile, 'templateFile')
  }

  const normalizedRoute = assertStaticRoute(route)
  const resolvedOutDir = path.resolve(outDir)
  const resolvedOutputFile = path.resolve(outputFile)
  const resolvedTemplateFile = templateFile
    ? path.resolve(templateFile)
    : path.join(resolvedOutDir, 'index.html')
  const template = await readFile(resolvedTemplateFile, 'utf-8')
  const clientEntry = findStaticClientModuleEntry(template)
  const clientEntryFile = resolveStaticClientFile(resolvedOutDir, clientEntry)

  if (!clientEntryFile) {
    throw new Error(`Client module entry "${clientEntry}" resolves outside outDir.`)
  }

  const baseUrl = domOptions.baseUrl || defaultStaticRenderBaseUrl
  const renderUrl = createStaticRenderUrl(normalizedRoute, baseUrl)
  const fileFetch = createStaticAssetFetch(resolvedOutDir, renderUrl)
  const extraGlobals = {
    ...domOptions.extraGlobals,
    fetch: fileFetch,
  }

  return runWithStaticRenderDom(
    normalizedRoute,
    async ({ window }) => {
      window.fetch = fileFetch
      await importStaticClientEntry(`${pathToFileURL(clientEntryFile).href}?snapshot=${Date.now()}`)

      const html = await waitForStaticAppHtml(window, {
        appSelector,
        settleMs,
        waitMs,
      })

      await mkdir(path.dirname(resolvedOutputFile), { recursive: true })
      await writeFile(resolvedOutputFile, html)

      return {
        route: normalizedRoute,
        outputFile: resolvedOutputFile,
        html,
      }
    },
    {
      ...domOptions,
      html: template,
      baseUrl,
      extraGlobals,
    },
  )
}

export const renderServerEntryRoute = async options => {
  assertObjectOptions(options, 'options')

  const { render, route, outputFile, ...domOptions } = options
  assertStringPath(outputFile, 'outputFile')
  if (typeof render !== 'function') {
    throw new Error('SSR bundle does not export render(route).')
  }

  const normalizedRoute = assertStaticRoute(route)
  const resolvedOutputFile = path.resolve(outputFile)

  return runWithStaticRenderDom(
    normalizedRoute,
    async () => {
      const html = await render(normalizedRoute)
      await mkdir(path.dirname(resolvedOutputFile), { recursive: true })
      await writeFile(resolvedOutputFile, html)

      return {
        route: normalizedRoute,
        outputFile: resolvedOutputFile,
        html,
      }
    },
    domOptions,
  )
}

export const renderServerBundleRoute = async options => {
  assertObjectOptions(options, 'options')

  const { serverBundleFile, ...renderOptions } = options
  assertStringPath(serverBundleFile, 'serverBundleFile')
  const serverEntry = await importStaticServerBundle(
    pathToFileURL(path.resolve(serverBundleFile)).href,
  )

  return renderServerEntryRoute({
    ...renderOptions,
    render: serverEntry.render,
  })
}

export const runWithStaticConcurrency = async (tasks, concurrency = tasks.length || 1) => {
  if (!Array.isArray(tasks)) {
    throw new TypeError('tasks must be an array.')
  }

  if (tasks.length === 0) {
    return []
  }

  const requestedConcurrency = Number(concurrency)
  const workerCount = Math.min(
    Number.isFinite(requestedConcurrency) && requestedConcurrency > 0
      ? Math.floor(requestedConcurrency)
      : 1,
    tasks.length,
  )
  const results = Array.from({ length: tasks.length })
  let nextIndex = 0
  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < tasks.length) {
      const currentIndex = nextIndex
      const task = tasks[currentIndex]
      nextIndex += 1

      if (typeof task !== 'function') {
        throw new TypeError(`tasks[${currentIndex}] must be a function.`)
      }

      results[currentIndex] = await task()
    }
  })

  await Promise.all(workers)
  return results
}

const defaultStaticRouteChildTimeoutMs = 30000
const defaultStaticRouteChildOutputLimit = 12000

const assertFunctionOption = (value, label) => {
  if (typeof value !== 'function') {
    throw new TypeError(`${label} must be a function.`)
  }
}

const normalizeStaticRouteItems = routes => {
  if (!Array.isArray(routes)) {
    throw new TypeError('routes must be an array.')
  }

  return routes.map((route, routeIndex) => {
    const normalizedRoute = normalizeStaticRoute(route)

    if (!normalizedRoute) {
      throw new TypeError(`routes[${routeIndex}] must be a non-empty string.`)
    }

    return {
      rawRoute: route,
      route: normalizedRoute,
      routeIndex,
    }
  })
}

const normalizeStaticRouteRenderValue = (value, label) => {
  if (typeof value === 'string') {
    return { html: value }
  }

  if (value && typeof value === 'object' && typeof value.html === 'string') {
    return value
  }

  throw new TypeError(`${label} must return a string or an object with an html string.`)
}

const defaultRenderStaticRouteHtml = ({ html }) => html

const writeStaticRouteOutput = async (outputFile, html) => {
  await mkdir(path.dirname(outputFile), { recursive: true })
  await writeFile(outputFile, html)
}

const resolveStaticRoutePipelineOutputFile = async (context, outDir, resolveOutputFile) => {
  const outputFile =
    typeof resolveOutputFile === 'function'
      ? await resolveOutputFile(context)
      : staticRouteToOutputFile(context.route, outDir)

  assertStringPath(outputFile, 'outputFile')
  return path.resolve(outputFile)
}

const createStaticRouteReportResult = ({ kind, outputFile, route, routeIndex }) => ({
  kind,
  outputFile,
  route,
  routeIndex,
})

const renderAndWriteStaticRoute = async ({ context, kind, label, renderHtml, renderValue }) => {
  const normalizedValue = normalizeStaticRouteRenderValue(renderValue, label)
  const html = await renderHtml({
    ...context,
    kind,
    html: normalizedValue.html,
    result: normalizedValue,
  })

  if (typeof html !== 'string') {
    throw new TypeError('renderHtml must return a string.')
  }

  await writeStaticRouteOutput(context.outputFile, html)

  return createStaticRouteReportResult({
    kind,
    outputFile: context.outputFile,
    route: context.route,
    routeIndex: context.routeIndex,
  })
}

export const renderStaticRoutes = async options => {
  assertObjectOptions(options, 'options')

  const {
    concurrency,
    onRouteComplete,
    outDir,
    preRenderRoute,
    renderHtml = defaultRenderStaticRouteHtml,
    renderRoute,
    resolveOutputFile,
    routes,
    shouldPrerenderRoute,
    snapshotRoute,
  } = options

  assertStringPath(outDir, 'outDir')
  assertFunctionOption(renderRoute, 'renderRoute')
  assertFunctionOption(renderHtml, 'renderHtml')

  if (preRenderRoute !== undefined) {
    assertFunctionOption(preRenderRoute, 'preRenderRoute')
  }

  if (shouldPrerenderRoute !== undefined) {
    assertFunctionOption(shouldPrerenderRoute, 'shouldPrerenderRoute')
  }

  if (snapshotRoute !== undefined) {
    assertFunctionOption(snapshotRoute, 'snapshotRoute')
  }

  if (resolveOutputFile !== undefined) {
    assertFunctionOption(resolveOutputFile, 'resolveOutputFile')
  }

  if (onRouteComplete !== undefined) {
    assertFunctionOption(onRouteComplete, 'onRouteComplete')
  }

  const resolvedOutDir = path.resolve(outDir)
  const routeItems = normalizeStaticRouteItems(routes)
  const routeResults = Array.from({ length: routeItems.length })
  const ssrFailures = []
  const snapshotFailures = []
  let completedRoutes = 0
  const summary = {
    totalRoutes: routeItems.length,
    staticRendered: 0,
    ssrRendered: 0,
    staticSnapshots: 0,
    skipped: 0,
    ssrFailures: 0,
    fatalFailures: 0,
  }

  const tasks = routeItems.map(routeItem => async () => {
    try {
      const baseContext = {
        ...routeItem,
        outDir: resolvedOutDir,
      }
      const outputFile = await resolveStaticRoutePipelineOutputFile(
        baseContext,
        resolvedOutDir,
        resolveOutputFile,
      )
      const context = {
        ...baseContext,
        outputFile,
      }

      if (preRenderRoute) {
        const preRendered = await preRenderRoute(context)

        if (preRendered !== undefined && preRendered !== null && preRendered !== false) {
          routeResults[routeItem.routeIndex] = await renderAndWriteStaticRoute({
            context,
            kind: 'static',
            label: 'preRenderRoute',
            renderHtml,
            renderValue: preRendered,
          })
          summary.staticRendered += 1
          return
        }
      }

      if (shouldPrerenderRoute && !(await shouldPrerenderRoute(context))) {
        routeResults[routeItem.routeIndex] = createStaticRouteReportResult({
          kind: 'skipped',
          outputFile,
          route: routeItem.route,
          routeIndex: routeItem.routeIndex,
        })
        summary.skipped += 1
        return
      }

      try {
        routeResults[routeItem.routeIndex] = await renderAndWriteStaticRoute({
          context,
          kind: 'ssr',
          label: 'renderRoute',
          renderHtml,
          renderValue: await renderRoute(context),
        })
        summary.ssrRendered += 1
      } catch (error) {
        summary.ssrFailures += 1
        ssrFailures.push({
          error,
          outputFile,
          route: routeItem.route,
          routeIndex: routeItem.routeIndex,
        })

        try {
          if (!snapshotRoute) {
            throw new Error('snapshotRoute must be a function to recover failed SSR routes.')
          }

          routeResults[routeItem.routeIndex] = await renderAndWriteStaticRoute({
            context,
            kind: 'snapshot',
            label: 'snapshotRoute',
            renderHtml,
            renderValue: await snapshotRoute(context),
          })
          summary.staticSnapshots += 1
        } catch (snapshotError) {
          summary.fatalFailures += 1
          snapshotFailures.push({
            outputFile,
            route: routeItem.route,
            routeIndex: routeItem.routeIndex,
            snapshotError,
            ssrError: error,
          })
          routeResults[routeItem.routeIndex] = createStaticRouteReportResult({
            kind: 'failed',
            outputFile,
            route: routeItem.route,
            routeIndex: routeItem.routeIndex,
          })
        }
      }
    } finally {
      const result = routeResults[routeItem.routeIndex]
      if (result && onRouteComplete) {
        completedRoutes += 1
        onRouteComplete({
          completedRoutes,
          totalRoutes: routeItems.length,
          route: result.route,
          routeIndex: result.routeIndex,
          kind: result.kind,
        })
      }
    }
  })

  await runWithStaticConcurrency(tasks, concurrency)

  return {
    routes: routeResults,
    snapshotFailures,
    ssrFailures,
    summary,
  }
}

export const resolveStaticPreviewFile = async (staticDir, requestUrl = '/', options = {}) => {
  assertStringPath(staticDir, 'staticDir')

  const resolvedStaticDir = path.resolve(staticDir)
  const baseUrl = options.baseUrl || `http://${options.host || '127.0.0.1'}`
  let pathname

  try {
    pathname = new URL(requestUrl || '/', baseUrl).pathname
  } catch {
    return null
  }

  let decodedPathname
  try {
    decodedPathname = decodeURIComponent(pathname)
  } catch {
    return null
  }

  const relativePath = decodedPathname.replace(/^\/+/, '')
  const requestedPath = path.resolve(resolvedStaticDir, relativePath)
  const extension = path.extname(decodedPathname)

  return (
    (await getExistingStaticFile(resolvedStaticDir, requestedPath)) ||
    (await getExistingStaticFile(resolvedStaticDir, path.join(requestedPath, 'index.html'))) ||
    (!extension
      ? await getExistingStaticFile(resolvedStaticDir, path.join(resolvedStaticDir, 'index.html'))
      : null)
  )
}

export const createStaticPreviewServer = ({ staticDir, contentTypes, onError } = {}) => {
  assertStringPath(staticDir, 'staticDir')

  const mergedContentTypes = {
    ...defaultPreviewContentTypes,
    ...contentTypes,
  }

  return createServer(async (request, response) => {
    try {
      const file = await resolveStaticPreviewFile(staticDir, request.url || '/')

      if (!file) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        response.end('404 not found')
        return
      }

      response.writeHead(200, {
        'Content-Type': mergedContentTypes[path.extname(file)] || 'application/octet-stream',
      })
      createReadStream(file).pipe(response)
    } catch (error) {
      if (typeof onError === 'function') {
        onError(error, request)
      }

      if (!response.headersSent) {
        response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      }

      response.end('internal server error')
    }
  })
}

export const formatStaticError = error => {
  if (error instanceof Error) {
    return error.stack || error.message
  }

  return String(error)
}

const formatStaticSummaryCount = (label, value) => `${label}: ${value}`

const renderStaticErrorSection = (title, entries, renderDetails) => {
  if (!entries.length) {
    return [`## ${title}`, '', 'None.', '']
  }

  const lines = [`## ${title}`, '']
  for (const [index, entry] of entries.entries()) {
    lines.push(`### ${index + 1}. ${entry.route}`, '')
    lines.push(renderDetails(entry).trimEnd(), '')
  }

  return lines
}

const normalizeStaticRenderReport = ({ generatedAt, result }) => {
  assertObjectOptions(result, 'result')
  assertObjectOptions(result.summary, 'result.summary')

  const snapshotFailureRoutes = new Set((result.snapshotFailures || []).map(entry => entry.route))

  return {
    generatedAt: generatedAt || new Date().toISOString(),
    summary: { ...result.summary },
    routes: (result.routes || []).map(route => ({
      kind: route.kind,
      outputFile: route.outputFile,
      route: route.route,
      routeIndex: route.routeIndex,
    })),
    ssrFailures: (result.ssrFailures || []).map(entry => ({
      route: entry.route,
      routeIndex: entry.routeIndex,
      outputFile: entry.outputFile,
      recoveredBy: snapshotFailureRoutes.has(entry.route) ? 'none' : 'static-snapshot',
      error: formatStaticError(entry.error),
    })),
    snapshotFailures: (result.snapshotFailures || []).map(entry => ({
      route: entry.route,
      routeIndex: entry.routeIndex,
      outputFile: entry.outputFile,
      ssrError: formatStaticError(entry.ssrError),
      snapshotError: formatStaticError(entry.snapshotError),
    })),
  }
}

export const renderStaticRenderLog = report => {
  assertObjectOptions(report, 'report')
  assertObjectOptions(report.summary, 'report.summary')

  const ssrFailures = Array.isArray(report.ssrFailures) ? report.ssrFailures : []
  const snapshotFailures = Array.isArray(report.snapshotFailures) ? report.snapshotFailures : []

  return [
    'Static render report',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    ...Object.entries(report.summary).map(([key, value]) => formatStaticSummaryCount(key, value)),
    '',
    ...renderStaticErrorSection(
      'SSR failures recovered by static snapshot',
      ssrFailures,
      entry => `Recovered by: ${entry.recoveredBy}\n\n${entry.error}`,
    ),
    ...renderStaticErrorSection(
      'Routes that could not be statically rendered',
      snapshotFailures,
      entry => `SSR error:\n${entry.ssrError}\n\nStatic snapshot error:\n${entry.snapshotError}`,
    ),
  ].join('\n')
}

export const writeStaticRenderReport = async options => {
  assertObjectOptions(options, 'options')

  const { errorLogFile, generatedAt, reportFile, result } = options
  assertStringPath(reportFile, 'reportFile')
  assertStringPath(errorLogFile, 'errorLogFile')

  const resolvedReportFile = path.resolve(reportFile)
  const resolvedErrorLogFile = path.resolve(errorLogFile)
  const report = normalizeStaticRenderReport({ generatedAt, result })

  await Promise.all([
    mkdir(path.dirname(resolvedReportFile), { recursive: true }),
    mkdir(path.dirname(resolvedErrorLogFile), { recursive: true }),
  ])
  await Promise.all([
    writeFile(resolvedReportFile, `${JSON.stringify(report, null, 2)}\n`),
    writeFile(resolvedErrorLogFile, `${renderStaticRenderLog(report)}\n`),
  ])

  return {
    errorLogFile: resolvedErrorLogFile,
    report,
    reportFile: resolvedReportFile,
  }
}

const limitStaticChildOutput = (value, maxLength) => {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength)}\n... truncated ...`
}

const assertStringArrayOption = (value, label) => {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new TypeError(`${label} must be an array of strings.`)
  }
}

export const renderStaticRouteInChild = options => {
  assertObjectOptions(options, 'options')

  const {
    args = [],
    cwd = process.cwd(),
    env = {},
    label = 'Static route render',
    maxOutputLength = defaultStaticRouteChildOutputLimit,
    nodeArgs = [],
    outputFile,
    route,
    scriptFile,
    timeoutMs = defaultStaticRouteChildTimeoutMs,
  } = options

  assertStringPath(scriptFile, 'scriptFile')
  assertStringPath(outputFile, 'outputFile')
  assertStringPath(cwd, 'cwd')
  assertStringArrayOption(args, 'args')
  assertStringArrayOption(nodeArgs, 'nodeArgs')

  if (env && typeof env !== 'object') {
    throw new TypeError('env must be an object.')
  }

  const normalizedRoute = assertStaticRoute(route)
  const resolvedScriptFile = path.resolve(scriptFile)
  const resolvedOutputFile = path.resolve(outputFile)
  const resolvedTimeoutMs = resolveStaticDuration(
    timeoutMs,
    defaultStaticRouteChildTimeoutMs,
    'timeoutMs',
  )
  const outputLimit = Math.floor(
    resolveStaticDuration(maxOutputLength, defaultStaticRouteChildOutputLimit, 'maxOutputLength'),
  )

  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [...nodeArgs, resolvedScriptFile, ...args, resolvedOutputFile],
      {
        cwd,
        env: {
          ...process.env,
          ...env,
          RUE_STATIC_RENDER_ROUTE: normalizedRoute,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )
    let stderr = ''
    let stdout = ''
    let timedOut = false
    const timer =
      resolvedTimeoutMs > 0
        ? setTimeout(() => {
            timedOut = true
            child.kill('SIGKILL')
          }, resolvedTimeoutMs)
        : null

    child.stdout.on('data', chunk => {
      stdout = limitStaticChildOutput(stdout + String(chunk), outputLimit)
    })

    child.stderr.on('data', chunk => {
      stderr = limitStaticChildOutput(stderr + String(chunk), outputLimit)
    })

    child.on('error', error => {
      if (timer) clearTimeout(timer)
      reject(error)
    })

    child.on('close', async (code, signal) => {
      if (timer) clearTimeout(timer)

      if (timedOut) {
        reject(new Error(`${label} timed out after ${resolvedTimeoutMs}ms`))
        return
      }

      if (code !== 0) {
        const fallbackMessage =
          signal && code === null
            ? `${label} child exited with signal ${signal}`
            : `${label} child exited with code ${code}`
        reject(new Error((stderr || stdout || fallbackMessage).trim()))
        return
      }

      try {
        resolve(await readFile(resolvedOutputFile, 'utf-8'))
      } catch (error) {
        reject(error)
      }
    })
  })
}
