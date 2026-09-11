import { createIslandContainerHtml } from '../island'
import type { RueIslandDescriptorMetadata } from '../island-protocol'
import { runWithOwner } from '../runtime-core/compiled'
import {
  renderToString,
  type ServerComponent,
  type ServerPlan,
  type Writer,
} from '../compiler-runtime/ssr-writer'

const renderFallback = async (writer: Writer, plan?: ServerPlan | null) => {
  if (!plan) return ''
  const chunks: string[] = []
  await runWithOwner(writer.owner, () => plan({ ...writer, chunks }))
  return chunks.join('')
}

/** Explicit compiler factory: no descriptor detection or renderable normalization. */
export const CompiledIsland =
  (options: {
    component: ServerComponent
    props: Record<string, unknown>
    metadata: RueIslandDescriptorMetadata
    fallback?: ServerPlan
  }): ServerPlan =>
  async writer => {
    const { metadata, props } = options
    const html =
      metadata.hydrate === 'only'
        ? ''
        : await runWithOwner(writer.owner, () =>
            renderToString(options.component, { ...writer, props }),
          )!
    const fallback =
      metadata.hydrate === 'only' ? await renderFallback(writer, options.fallback) : ''
    writer.chunks.push(createIslandContainerHtml({ ...metadata, props, html, fallback }))
  }

export const CompiledServerIsland =
  (options: { id: string; props: Record<string, unknown>; fallback?: ServerPlan }): ServerPlan =>
  async writer => {
    if (!writer.serverIsland)
      throw new Error('Rue server:defer requires a serverIsland writer callback')
    const fallback = await renderFallback(writer, options.fallback)
    writer.chunks.push(await writer.serverIsland(options.id, options.props, fallback))
  }
