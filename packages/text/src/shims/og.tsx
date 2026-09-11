import { ImageResponse as VercelImageResponse } from '@vercel/og'
import type { ImageResponseOptions } from '@vercel/og'
import { parseFragment } from 'parse5'
import { renderToString, type ServerPlan } from '@rue-js/runtime/server'

const CACHE_HEADERS = {
  noCache: 'no-cache, no-store',
  revalidate: 'public, max-age=0, must-revalidate',
} as const

/**
 * text/og shim.
 *
 * The text:og-inline-fetch-assets Vite plugin patches @vercel/og's runtime
 * asset fetches so this wrapper can delegate image generation while preserving
 * Text.js's public ImageResponse headers and option merging semantics.
 */
export class ImageResponse extends Response {
  static displayName = 'ImageResponse'

  constructor(element: ServerPlan, options?: ImageResponseOptions) {
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        const html = await renderToString(() => element)
        const nodes = parseFragment(html)
          .childNodes.map(toImageNode)
          .filter(value => value !== null)
        const imageResponse = new VercelImageResponse(
          (nodes.length === 1
            ? nodes[0]
            : { type: 'div', props: { style: { display: 'flex' }, children: nodes } }) as any,
          options,
        )
        if (!imageResponse.body) {
          controller.close()
          return
        }

        const reader = imageResponse.body.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            controller.close()
            return
          }
          controller.enqueue(value)
        }
      },
    })

    const headers = new Headers({
      'content-type': 'image/png',
      'cache-control':
        process.env.NODE_ENV === 'development' ? CACHE_HEADERS.noCache : CACHE_HEADERS.revalidate,
    })
    if (options?.headers) {
      new Headers(options.headers).forEach((value, key) => {
        headers.set(key, value)
      })
    }

    super(readable, {
      headers,
      status: options?.status,
      statusText: options?.statusText,
    })
  }
}

export type { ImageResponseOptions } from '@vercel/og'

/** Convert parsed HTML data to Satori's image input, never execute component objects. */
function toImageNode(node: ReturnType<typeof parseFragment>['childNodes'][number]): unknown {
  if (node.nodeName === '#text') return (node as { value: string }).value
  if (!('tagName' in node)) return null
  const props: Record<string, unknown> = {}
  for (const { name, value } of node.attrs) {
    if (name === 'style') {
      props.style = Object.fromEntries(
        value
          .split(';')
          .filter(Boolean)
          .map(declaration => {
            const colon = declaration.indexOf(':')
            const key = declaration
              .slice(0, colon)
              .trim()
              .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
            return [key, declaration.slice(colon + 1).trim()]
          }),
      )
    } else props[name === 'class' ? 'className' : name] = value
  }
  props.children = node.childNodes.map(toImageNode).filter(value => value !== null)
  return { type: node.tagName, props }
}
