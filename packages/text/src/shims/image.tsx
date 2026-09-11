'use client'

/**
 * text/image shim
 *
 * Translates Text.js Image props to plain <img> output plus text's image
 * optimizer URL contract.
 * For local images (relative paths), routes through `/_text/image`
 * for server-side optimization (resize, format negotiation, quality).
 *
 * Remote images are validated against `images.remotePatterns` and
 * `images.domains` from text.config.js. Unmatched URLs are blocked
 * in production and warn in development, matching Text.js behavior.
 */

import { useEffect, useRef, useState } from '@rue-js/rue'
import type { TextCompatNode } from './component-adapter.js'
import { hasRemoteMatch, isPrivateIp, type RemotePattern } from './image-config.js'
import { useMergedRef } from './use-merged-ref.js'
import {
  type RueElementProps,
  type RueEvent,
  type RueEventHandler,
  type RueMouseEvent,
  type RueRef,
  type RueStyle,
} from './rue-shim-types.js'

export type StaticImageData = {
  src: string
  height: number
  width: number
  blurDataURL?: string
}

/**
 * Image config injected at build time via Vite define.
 * Serialized as JSON — parsed once at module level.
 */
const __imageRemotePatterns: RemotePattern[] = (() => {
  try {
    return JSON.parse(process.env.__TEXT_IMAGE_REMOTE_PATTERNS ?? '[]')
  } catch {
    return []
  }
})()
const __imageDomains: string[] = (() => {
  try {
    return JSON.parse(process.env.__TEXT_IMAGE_DOMAINS ?? '[]')
  } catch {
    return []
  }
})()
const __hasImageConfig = __imageRemotePatterns.length > 0 || __imageDomains.length > 0
const __isDev = process.env.NODE_ENV !== 'production'
const __imageDeviceSizes: number[] = (() => {
  try {
    return JSON.parse(
      process.env.__TEXT_IMAGE_DEVICE_SIZES ?? '[640,750,828,1080,1200,1920,2048,3840]',
    )
  } catch {
    return [640, 750, 828, 1080, 1200, 1920, 2048, 3840]
  }
})()
/**
 * Whether dangerouslyAllowSVG is enabled in text.config.js.
 * When false (default), .svg sources auto-skip the optimization endpoint
 * and are served directly, matching Text.js behavior.
 * When true, .svg sources are routed through the optimizer (served as-is
 * with security headers).
 */
const __dangerouslyAllowSVG = process.env.__TEXT_IMAGE_DANGEROUSLY_ALLOW_SVG === 'true'
/**
 * Whether dangerouslyAllowLocalIP is enabled in text.config.js.
 * When false (default), remote image URLs with literal private-IP hostnames
 * are blocked to mitigate SSRF risk.
 */
const __dangerouslyAllowLocalIP = process.env.__TEXT_IMAGE_DANGEROUSLY_ALLOW_LOCAL_IP === 'true'

/**
 * Validate that a remote URL is allowed by the configured remote patterns.
 * Returns true if the URL is allowed, false otherwise.
 *
 * When no remotePatterns/domains are configured, all remote URLs are allowed
 * (backwards-compatible — user hasn't opted into restriction).
 *
 * When patterns ARE configured, only matching URLs are allowed.
 * In development, non-matching URLs produce a console warning.
 * In production, non-matching URLs are blocked (src replaced with empty string).
 *
 * Private-IP hostnames are additionally rejected unless dangerouslyAllowLocalIP
 * is set, mirroring Text.js's fetchExternalImage guard.
 */
function validateRemoteUrl(src: string): { allowed: boolean; reason?: string } {
  let url: URL
  try {
    url = new URL(src, 'http://n')
  } catch {
    return { allowed: false, reason: `Invalid URL: ${src}` }
  }

  if (!__dangerouslyAllowLocalIP && isPrivateIp(url.hostname)) {
    // Best-effort guard for literal-IP hostnames only. Domain names resolving
    // to private IPs cannot be caught without server-side DNS resolution.
    // See: Text.js fetchExternalImage in packages/text/src/server/image-optimizer.ts
    return {
      allowed: false,
      reason: `Image URL "${src}" resolved to private IP. If this is expected and you understand SSRF risk, use images.dangerouslyAllowLocalIP = true to continue.`,
    }
  }

  if (!__hasImageConfig) {
    // No image config — allow everything (backwards-compatible)
    return { allowed: true }
  }

  if (hasRemoteMatch(__imageDomains, __imageRemotePatterns, url)) {
    return { allowed: true }
  }

  return {
    allowed: false,
    reason: `Image URL "${src}" is not configured in images.remotePatterns or images.domains in text.config.js. See: https://textjs.org/docs/messages/text-image-unconfigured-host`,
  }
}

/**
 * Create a synthetic image load event for replaying onLoad/onLoadingComplete
 * during hydration when the image already completed loading.
 *
 * This function creates a native Event("load") via the DOM Event constructor
 * and must only be called in a browser context (client-side layout effect).
 * It mirrors the pattern used in Text.js `handleLoading`.
 */
type ImageLoadEvent = RueEvent<HTMLImageElement> & {
  nativeEvent?: Event
  target: HTMLImageElement
  currentTarget: HTMLImageElement
  isDefaultPrevented?: () => boolean
  isPropagationStopped?: () => boolean
  persist?: () => void
}

type RueImageElementProps = RueElementProps<HTMLImageElement> & {
  alt?: string
  width?: number | string
  height?: number | string
  loading?: 'lazy' | 'eager'
  decoding?: 'async' | 'auto' | 'sync'
  src?: string
  srcSet?: string
  sizes?: string
  fetchPriority?: 'high' | 'low' | 'auto'
  'data-nimg'?: string
}

function createSyntheticLoadEvent(img: HTMLImageElement): ImageLoadEvent {
  const nativeEvent = new Event('load')
  Object.defineProperty(nativeEvent, 'target', { writable: false, value: img })
  let prevented = false
  let stopped = false
  return {
    bubbles: nativeEvent.bubbles,
    cancelable: nativeEvent.cancelable,
    currentTarget: img,
    defaultPrevented: false,
    eventPhase: nativeEvent.eventPhase,
    isTrusted: false,
    nativeEvent,
    target: img,
    timeStamp: nativeEvent.timeStamp,
    type: 'load',
    isDefaultPrevented: () => prevented,
    isPropagationStopped: () => stopped,
    persist: () => {},
    preventDefault: () => {
      prevented = true
      nativeEvent.preventDefault()
    },
    stopPropagation: () => {
      stopped = true
      nativeEvent.stopPropagation()
    },
  }
}

type ImageProps = {
  src: string | StaticImageData
  alt: string
  width?: number
  height?: number
  fill?: boolean
  preload?: boolean
  priority?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  loader?: (params: { src: string; width: number; quality?: number }) => string
  sizes?: string
  className?: string
  style?: RueStyle
  onLoad?: RueEventHandler<HTMLImageElement>
  /** @deprecated Use onLoad instead. Still supported for migration compat. */
  onLoadingComplete?: (img: HTMLImageElement) => void
  onError?: RueEventHandler<HTMLImageElement>
  onClick?: (event: RueMouseEvent<HTMLImageElement>) => void
  id?: string
  // Accept and ignore Text.js-specific props that don't apply
  unoptimized?: boolean
  overrideSrc?: string
  loading?: 'lazy' | 'eager'
} & Omit<
  RueElementProps<HTMLImageElement>,
  'src' | 'alt' | 'width' | 'height' | 'onLoad' | 'onError' | 'onClick' | 'style'
>

/**
 * Sanitize a blurDataURL to prevent CSS injection.
 *
 * A crafted data URL containing `)` can break out of the `url()` CSS function,
 * allowing injection of arbitrary CSS properties or rules. Characters like `{`,
 * `}`, and `\` can also assist in crafting injection payloads.
 *
 * This validates the URL starts with `data:image/` and rejects characters that
 * could escape the `url()` context. Semicolons are allowed since they're part
 * of valid data URLs (`data:image/png;base64,...`) and harmless inside `url()`.
 *
 * Returns undefined for invalid URLs, which causes the blur placeholder to be
 * skipped gracefully.
 */
function sanitizeBlurDataURL(url: string): string | undefined {
  // Must be a data: image URL
  if (!url.startsWith('data:image/')) return undefined
  // Reject characters that can break out of CSS url():
  //   ) - closes url()
  //   ( - could open nested functions
  //   { } - CSS rule boundaries
  //   \ - CSS escape sequences
  //   newlines - break CSS parsing
  if (/[)(}{\\'"\n\r]/.test(url)) return undefined
  return url
}

/**
 * Determine if a src is a remote URL (CDN-optimizable) or local.
 */
function isRemoteUrl(src: string): boolean {
  return src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')
}

function getFillStyle(style?: RueStyle, backgroundStyle?: RueStyle): RueStyle {
  return {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    ...backgroundStyle,
    ...style,
  }
}

/**
 * Resolve src, width, height, blurDataURL from Image props (string or StaticImageData).
 * Shared by the Image component and getImageProps to keep behavior in sync.
 */
function resolveImageSource(v: {
  src: string | StaticImageData
  width?: number
  height?: number
  blurDataURL?: string
}): { src: string; width?: number; height?: number; blurDataURL?: string } {
  const src = typeof v.src === 'string' ? v.src : v.src.src
  const imgWidth = v.width ?? (typeof v.src === 'object' ? v.src.width : undefined)
  const imgHeight = v.height ?? (typeof v.src === 'object' ? v.src.height : undefined)
  const imgBlurDataURL =
    v.blurDataURL ?? (typeof v.src === 'object' ? v.src.blurDataURL : undefined)
  return { src, width: imgWidth, height: imgHeight, blurDataURL: imgBlurDataURL }
}

/**
 * Responsive image widths matching Text.js's device sizes config.
 * These are the breakpoints used for srcSet generation.
 * Configurable via `images.deviceSizes` in text.config.js.
 */
const RESPONSIVE_WIDTHS = __imageDeviceSizes

/**
 * Build a `/_text/image` optimization URL.
 *
 * In production (Cloudflare Workers), the worker intercepts this path and uses
 * the Images binding to resize/transcode on the fly. In dev, the Vite dev
 * server handles it as a passthrough (serves the original file).
 */
export function imageOptimizationUrl(src: string, width: number, quality: number = 75): string {
  return `/_text/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`
}

function preloadImageResource(input: {
  shouldPreload: boolean
  src: string
  srcSet?: string
  sizes?: string
  fetchPriority?: 'high' | 'low' | 'auto'
}): void {
  if (!input.shouldPreload) return
  if (typeof document === 'undefined') return

  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'image'
  if (!input.srcSet) link.href = input.src
  if (input.srcSet) link.setAttribute('imagesrcset', input.srcSet)
  if (input.sizes) link.setAttribute('imagesizes', input.sizes)
  if (input.fetchPriority) link.setAttribute('fetchpriority', input.fetchPriority)
  document.head.appendChild(link)
}

function renderImagePreload(input: {
  shouldPreload: boolean
  src: string
  srcSet?: string
  sizes?: string
  fetchPriority?: 'high' | 'low' | 'auto'
}) {
  if (!input.shouldPreload) return null
  const props: Record<string, unknown> = {
    rel: 'preload',
    as: 'image',
  }
  if (!input.srcSet) props.href = input.src
  if (input.srcSet) props.imageSrcSet = input.srcSet
  if (input.sizes) props.imageSizes = input.sizes
  if (input.fetchPriority) props.fetchPriority = input.fetchPriority
  return <link {...props} />
}

function ImageWithPreload(props: { preload: TextCompatNode; children: TextCompatNode }) {
  const Preload = () => props.preload
  return (
    <>
      {props.preload ? <Preload /> : null}
      {props.children}
    </>
  )
}

/**
 * Generate a srcSet string for responsive images.
 *
 * Each width points to the `/_text/image` optimization endpoint so the
 * server can resize and transcode the image. Only includes widths that are
 * <= 2x the original image width to avoid pointless upscaling.
 */
function generateSrcSet(src: string, originalWidth: number, quality: number = 75): string {
  const widths = RESPONSIVE_WIDTHS.filter(w => w <= originalWidth * 2)
  if (widths.length === 0)
    return `${imageOptimizationUrl(src, originalWidth, quality)} ${originalWidth}w`
  return widths.map(w => `${imageOptimizationUrl(src, w, quality)} ${w}w`).join(', ')
}

function Image({
  src: srcProp,
  alt,
  width,
  height,
  fill,
  preload,
  priority,
  quality,
  placeholder,
  blurDataURL,
  loader,
  sizes,
  className,
  style,
  onLoad,
  onLoadingComplete,
  onError,
  unoptimized: _unoptimized,
  overrideSrc: _overrideSrc,
  loading,
  ref,
  ...rest
}: ImageProps & { ref?: RueRef<HTMLImageElement> }) {
  // Dedup refs: ensure onLoad and onError fire at most once per src per mount.
  // Matches Text.js behavior — prevents double-firing from compat re-renders,
  // strict-mode double-invocation, or state updates inside the handler itself.
  // Ported from Text.js: https://github.com/vercel/next.js/pull/93209
  const lastLoadedSrcRef = useRef<string | undefined>(undefined)
  const lastErrorSrcRef = useRef<string | undefined>(undefined)

  // Hydration-level onError replay: when an image fails to load during SSR
  // streaming or initial HTML parse (before client hydration), the native browser
  // error event is lost. Re-trigger it via `img.src = img.src` in a layout
  // effect once hydration completes, mirroring the upstream Text.js fix.
  // Ported from Text.js: https://github.com/vercel/next.js/pull/93209
  const didInsertRef = useRef(false)
  const imgElementRef = useRef<HTMLImageElement | null>(null)

  // Merge forwarded ref with internal img ref for layout effect access.
  const mergedRef = useMergedRef(ref, imgElementRef)

  // Stable refs for onLoad / onError / onLoadingComplete so the layout effect
  // does not re-run (and re-assign img.src) when handler identity changes.
  // Ported from Text.js: https://github.com/vercel/next.js/pull/93209
  //
  // IMPORTANT: The useRef+useEffect sync pattern has a subtle timing gap:
  // during the first render, onLoadRef.current holds the initial value from
  // useRef(onLoad), and the useEffect to sync it runs AFTER the layout effect.
  // This means on first mount the layout effect reads the correct initial
  // value (passed to useRef). If someone changes useRef(onLoad) to
  // useRef(undefined), the layout effect would read undefined on first mount.
  const onLoadRef = useRef(onLoad)
  useEffect(() => {
    onLoadRef.current = onLoad
  }, [onLoad])
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])
  const onLoadingCompleteRef = useRef(onLoadingComplete)
  useEffect(() => {
    onLoadingCompleteRef.current = onLoadingComplete
  }, [onLoadingComplete])

  const {
    src,
    width: imgWidth,
    height: imgHeight,
    blurDataURL: imgBlurDataURL,
  } = resolveImageSource({ src: srcProp, width, height, blurDataURL })
  const shouldPreload = preload === true || priority === true
  const priorityFetchPriority = priority ? 'high' : undefined
  const imageLoading = priority ? 'eager' : shouldPreload ? loading : (loading ?? 'lazy')

  const [completedBlurSrc, setCompletedBlurSrc] = useState<string | undefined>(undefined)
  const blurComplete = completedBlurSrc === src

  const markBlurComplete = () => {
    if (placeholder !== 'blur') return
    setCompletedBlurSrc(current => (current === src ? current : src))
  }

  useEffect(() => {
    if (!didInsertRef.current && imgElementRef.current !== null) {
      const img = imgElementRef.current
      // Replay error events lost during SSR/hydration.
      if (onErrorRef.current) {
        const currentSrc = img.src
        img.src = currentSrc
      }
      // Replay onLoad for images that completed loading before client hydration
      // (e.g. SSR streaming where the image arrives and renders before hydration
      // finishes). Without this, onLoad never fires for those images.
      //
      // img.complete is true for both successfully-loaded and errored images
      // (the HTML spec defines complete as true when the browser finished
      // fetching, regardless of outcome). We must check naturalWidth > 0 to
      // distinguish success from error — a failed image has naturalWidth === 0.
      // Ported from Text.js: https://github.com/vercel/next.js/pull/93209
      if (img.complete && img.naturalWidth > 0) {
        markBlurComplete()
        const currentOnLoad = onLoadRef.current
        const currentOnLoadingComplete = onLoadingCompleteRef.current
        if (currentOnLoad || currentOnLoadingComplete) {
          // Dedup — fire at most once per src per mount, matching onLoad dedup
          if (lastLoadedSrcRef.current !== src) {
            lastLoadedSrcRef.current = src
            // Create a synthetic load event with the expected shape.
            // text/image uses a similar pattern in `handleLoading`.
            const syntheticEvent = createSyntheticLoadEvent(img)
            currentOnLoad?.(syntheticEvent)
            currentOnLoadingComplete?.(img)
          }
        }
      }
      didInsertRef.current = true
    }
  }, [placeholder, sizes, _unoptimized])

  // Wire onLoadingComplete (deprecated) into onLoad — matches Text.js behavior.
  // onLoad fires first, then onLoadingComplete receives the HTMLImageElement.
  const handleLoad = onLoadingComplete
    ? (e: ImageLoadEvent) => {
        if (lastLoadedSrcRef.current === src) return
        lastLoadedSrcRef.current = src
        markBlurComplete()
        onLoad?.(e)
        onLoadingComplete(e.currentTarget)
      }
    : onLoad
      ? (e: ImageLoadEvent) => {
          if (lastLoadedSrcRef.current === src) return
          lastLoadedSrcRef.current = src
          markBlurComplete()
          onLoad(e)
        }
      : placeholder === 'blur'
        ? () => {
            if (lastLoadedSrcRef.current === src) return
            lastLoadedSrcRef.current = src
            markBlurComplete()
          }
        : undefined

  const handleError = onError
    ? (e: ImageLoadEvent) => {
        if (lastErrorSrcRef.current === src) return
        lastErrorSrcRef.current = src
        markBlurComplete()
        onError(e)
      }
    : placeholder === 'blur'
      ? () => {
          if (lastErrorSrcRef.current === src) return
          lastErrorSrcRef.current = src
          markBlurComplete()
        }
      : undefined

  // If a custom loader is provided, use basic img with loader URL
  if (loader) {
    const resolvedSrc = loader({ src, width: imgWidth ?? 0, quality: quality ?? 75 })
    const preloadElement = renderImagePreload({
      shouldPreload,
      src: resolvedSrc,
      sizes,
      fetchPriority: priorityFetchPriority,
    })
    preloadImageResource({
      shouldPreload,
      src: resolvedSrc,
      sizes,
      fetchPriority: priorityFetchPriority,
    })
    return (
      <ImageWithPreload preload={preloadElement}>
        <img
          ref={mergedRef}
          src={resolvedSrc}
          alt={alt}
          width={fill ? undefined : imgWidth}
          height={fill ? undefined : imgHeight}
          loading={imageLoading}
          decoding="async"
          sizes={sizes}
          className={className}
          onLoad={handleLoad}
          onError={handleError}
          style={fill ? getFillStyle(style) : style}
          {...rest}
        />
      </ImageWithPreload>
    )
  }

  // For remote URLs, validate against remotePatterns and render a plain image.
  if (isRemoteUrl(src)) {
    const validation = validateRemoteUrl(src)
    if (!validation.allowed) {
      if (__isDev) {
        console.warn(`[text/image] ${validation.reason}`)
        // In dev, render the image but with a warning — matches Text.js dev behavior
      } else {
        // In production, block the image entirely
        console.error(`[text/image] ${validation.reason}`)
        return null
      }
    }

    const sanitizedBlur = imgBlurDataURL ? sanitizeBlurDataURL(imgBlurDataURL) : undefined
    const showBlur = !blurComplete && placeholder === 'blur' && sanitizedBlur
    const blurStyle = showBlur
      ? {
          backgroundImage: `url(${sanitizedBlur})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }
      : undefined
    const bg = showBlur ? `url(${sanitizedBlur})` : undefined

    if (fill) {
      const fillSizes = sizes ?? '100vw'
      const preloadElement = renderImagePreload({
        shouldPreload,
        src,
        sizes: fillSizes,
        fetchPriority: priorityFetchPriority,
      })
      preloadImageResource({
        shouldPreload,
        src,
        sizes: fillSizes,
        fetchPriority: priorityFetchPriority,
      })
      return (
        <ImageWithPreload preload={preloadElement}>
          <img
            ref={mergedRef}
            src={src}
            alt={alt}
            // `priority` is a Text.js concept — translate it to HTML attributes so
            // it is never forwarded to the DOM as a non-boolean attribute, which
            // would trigger a non-boolean DOM attribute warning.
            // warning.
            loading={imageLoading}
            fetchPriority={priorityFetchPriority}
            decoding="async"
            sizes={fillSizes}
            className={className}
            data-nimg="fill"
            onLoad={handleLoad}
            onError={handleError}
            style={getFillStyle(style, blurStyle)}
            {...rest}
          />
        </ImageWithPreload>
      )
    }
    if (imgWidth && imgHeight) {
      const preloadElement = renderImagePreload({
        shouldPreload,
        src,
        sizes,
        fetchPriority: priorityFetchPriority,
      })
      preloadImageResource({
        shouldPreload,
        src,
        sizes,
        fetchPriority: priorityFetchPriority,
      })
      return (
        <ImageWithPreload preload={preloadElement}>
          <img
            ref={mergedRef}
            src={src}
            alt={alt}
            width={imgWidth}
            height={imgHeight}
            loading={imageLoading}
            fetchPriority={priorityFetchPriority}
            decoding="async"
            sizes={sizes}
            className={className}
            onLoad={handleLoad}
            onError={handleError}
            style={bg ? { ...style, backgroundImage: bg } : style}
            {...rest}
          />
        </ImageWithPreload>
      )
    }
    // Fall through to basic <img> if dimensions not provided
    // (unpic requires them for constrained layout)
  }

  // Route local images through the /_text/image optimization endpoint.
  // In production on Cloudflare Workers, this resizes and transcodes via
  // the Images binding. In dev, it serves the original file as a passthrough.
  // When `unoptimized` is true, bypass the endpoint entirely (Text.js compat).
  // SVG sources auto-skip unless dangerouslyAllowSVG is enabled, matching
  // Text.js behavior where .svg triggers unoptimized=true by default.
  const imgQuality = quality ?? 75
  const isSvg = src.endsWith('.svg')
  const skipOptimization = _unoptimized === true || (isSvg && !__dangerouslyAllowSVG)

  // Build srcSet for responsive local images (common breakpoints).
  // Each entry points to /_text/image with the appropriate width.
  const srcSet =
    imgWidth && !fill && !skipOptimization
      ? generateSrcSet(src, imgWidth, imgQuality)
      : imgWidth && !fill
        ? RESPONSIVE_WIDTHS.filter(w => w <= imgWidth * 2)
            .map(w => `${src} ${w}w`)
            .join(', ') || `${src} ${imgWidth}w`
        : undefined

  // The main `src` also goes through the optimization endpoint. Use the
  // declared width (or the first responsive width as fallback).
  const optimizedSrc = skipOptimization
    ? src
    : imgWidth
      ? imageOptimizationUrl(src, imgWidth, imgQuality)
      : imageOptimizationUrl(src, RESPONSIVE_WIDTHS[0], imgQuality)

  // Blur placeholder: show a low-quality background while the image loads.
  // Sanitize blurDataURL to prevent CSS injection via crafted data URLs.
  const sanitizedLocalBlur = imgBlurDataURL ? sanitizeBlurDataURL(imgBlurDataURL) : undefined
  const blurStyle =
    !blurComplete && placeholder === 'blur' && sanitizedLocalBlur
      ? {
          backgroundImage: `url(${sanitizedLocalBlur})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }
      : undefined

  const imageSizes = sizes ?? (fill ? '100vw' : undefined)
  const preloadElement = renderImagePreload({
    shouldPreload,
    src: optimizedSrc,
    srcSet,
    sizes: imageSizes,
    fetchPriority: priorityFetchPriority,
  })
  preloadImageResource({
    shouldPreload,
    src: optimizedSrc,
    srcSet,
    sizes: imageSizes,
    fetchPriority: priorityFetchPriority,
  })

  // For local images, render a standard <img> tag with srcSet and blur support.
  // The src and srcSet point to the /_text/image optimization endpoint.
  return (
    <ImageWithPreload preload={preloadElement}>
      <img
        ref={mergedRef}
        src={optimizedSrc}
        alt={alt}
        {...(fill ? {} : { width: imgWidth, height: imgHeight })}
        loading={imageLoading}
        {...(priorityFetchPriority ? { fetchPriority: priorityFetchPriority } : {})}
        decoding="async"
        {...(srcSet ? { srcSet } : {})}
        {...(imageSizes ? { sizes: imageSizes } : {})}
        className={className}
        data-nimg={fill ? 'fill' : '1'}
        onLoad={handleLoad}
        onError={handleError}
        style={fill ? getFillStyle(style, blurStyle) : { ...blurStyle, ...style }}
        {...rest}
      />
    </ImageWithPreload>
  )
}

/**
 * getImageProps — for advanced use cases (picture elements, background images).
 * Returns the props that would be passed to the underlying <img> element.
 */
export function getImageProps(props: ImageProps): {
  props: RueImageElementProps
} {
  const {
    src: srcProp,
    alt,
    width,
    height,
    fill,
    preload: _preload,
    priority,
    quality: _quality,
    placeholder,
    blurDataURL: blurDataURLProp,
    loader,
    sizes,
    className,
    style,
    onLoad: _onLoad,
    onLoadingComplete: _onLoadingComplete,
    unoptimized: _unoptimized,
    overrideSrc: _overrideSrc,
    loading,
    ...rest
  } = props

  const {
    src,
    width: imgWidth,
    height: imgHeight,
    blurDataURL: imgBlurDataURL,
  } = resolveImageSource({ src: srcProp, width, height, blurDataURL: blurDataURLProp })
  const shouldPreload = _preload === true || priority === true

  // Validate remote URLs against configured patterns
  let blockedInProd = false
  if (isRemoteUrl(src)) {
    const validation = validateRemoteUrl(src)
    if (!validation.allowed) {
      if (__isDev) {
        console.warn(`[text/image] ${validation.reason}`)
      } else {
        console.error(`[text/image] ${validation.reason}`)
        blockedInProd = true
      }
    }
  }

  // Resolve src through custom loader if provided
  const imgQuality = _quality ?? 75
  const resolvedSrc = blockedInProd
    ? ''
    : loader
      ? loader({ src, width: imgWidth ?? 0, quality: imgQuality })
      : src

  // For local images (no loader, not remote), route through optimization endpoint.
  // When `unoptimized` is true, bypass the endpoint entirely (Text.js compat).
  // SVG sources auto-skip unless dangerouslyAllowSVG is enabled.
  const isSvg = resolvedSrc.endsWith('.svg')
  const skipOpt =
    _unoptimized === true ||
    (isSvg && !__dangerouslyAllowSVG) ||
    blockedInProd ||
    !!loader ||
    isRemoteUrl(resolvedSrc)
  const optimizedSrc = skipOpt
    ? resolvedSrc
    : imgWidth
      ? imageOptimizationUrl(resolvedSrc, imgWidth, imgQuality)
      : imageOptimizationUrl(resolvedSrc, RESPONSIVE_WIDTHS[0], imgQuality)

  // Build srcSet for local images — each width points to /_text/image
  const srcSet =
    imgWidth && !fill && !isRemoteUrl(resolvedSrc) && !loader && !skipOpt
      ? generateSrcSet(resolvedSrc, imgWidth, imgQuality)
      : undefined

  // Blur placeholder styles — sanitize to prevent CSS injection
  const sanitizedBlurURL = imgBlurDataURL ? sanitizeBlurDataURL(imgBlurDataURL) : undefined
  const blurStyle =
    placeholder === 'blur' && sanitizedBlurURL
      ? {
          backgroundImage: `url(${sanitizedBlurURL})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat' as const,
          backgroundPosition: 'center' as const,
        }
      : undefined

  return {
    props: {
      src: optimizedSrc,
      alt,
      width: fill ? undefined : imgWidth,
      height: fill ? undefined : imgHeight,
      loading: priority ? 'eager' : shouldPreload ? loading : (loading ?? 'lazy'),
      fetchPriority: priority ? ('high' as const) : undefined,
      decoding: 'async' as const,
      srcSet,
      sizes: sizes ?? (fill ? '100vw' : undefined),
      className,
      'data-nimg': fill ? 'fill' : '1',
      style: fill ? getFillStyle(style, blurStyle) : { ...blurStyle, ...style },
      ...rest,
    } as RueImageElementProps,
  }
}

export default Image
