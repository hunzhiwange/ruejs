import type { ServerFrame, ClientBoundary } from '@rue-js/runtime/internal/hydrate'

function range(html: string, id: string) {
  const marker = `text-slot:${encodeURIComponent(id)}`
  const open = `<!--${marker}-->`,
    close = `<!--/${marker}-->`
  const start = html.indexOf(open)
  if (start < 0) return null
  const end = html.indexOf(close, start + open.length)
  return end < 0 ? null : { start: start + open.length, end }
}
function ids(html: string) {
  return new Set(Array.from(html.matchAll(/<!--r:b:rsc:(\d+)-->/g), match => match[1]!))
}
/** Merge only router-approved named ranges in already compiled server frames. */
export function preserveFrameSlots(
  previous: ServerFrame,
  incoming: ServerFrame,
  slotIds: readonly string[],
): ServerFrame {
  if (!slotIds.length) return incoming
  let nextId = 0
  const scan = (frame: ServerFrame) => {
    for (const ref of frame.references) {
      nextId = Math.max(nextId, Number(ref.id) + 1)
      if (ref.children) scan(ref.children)
    }
  }
  scan(incoming)
  const replacements = new Map<string, string>()
  const remapId = (id: string) => {
    let mapped = replacements.get(id)
    if (mapped === undefined) replacements.set(id, (mapped = String(nextId++)))
    return mapped
  }
  const remapHtml = (html: string) =>
    html.replace(
      /<!--(\/?)r:b:rsc:(\d+)-->/g,
      (_, close, id) => `<!--${close}r:b:rsc:${remapId(id)}-->`,
    )
  const copyReference = (ref: ClientBoundary): ClientBoundary => ({
    ...ref,
    id: remapId(ref.id),
    ...(ref.children ? { children: copyFrame(ref.children) } : {}),
  })
  const copyFrame = (frame: ServerFrame): ServerFrame => ({
    ...frame,
    html: remapHtml(frame.html),
    references: frame.references.map(copyReference),
  })
  const identity = (ref: ClientBoundary) =>
    `${ref.identity ?? ref.id}\0${ref.referenceKey}\0${ref.exportName}`
  const merge = (before: ServerFrame, next: ServerFrame): ServerFrame => {
    let html = next.html
    let references = next.references.map(ref => {
      const old = before.references.find(candidate => identity(candidate) === identity(ref))
      return old?.children && ref.children
        ? { ...ref, children: merge(old.children, ref.children) }
        : ref
    })
    for (const id of slotIds) {
      const oldRange = range(before.html, id),
        nextRange = range(html, id)
      if (!oldRange || !nextRange) continue
      const oldHtml = before.html.slice(oldRange.start, oldRange.end)
      const removed = ids(html.slice(nextRange.start, nextRange.end)),
        retained = ids(oldHtml)
      html = html.slice(0, nextRange.start) + remapHtml(oldHtml) + html.slice(nextRange.end)
      references = references
        .filter(ref => !removed.has(ref.id))
        .concat(before.references.filter(ref => retained.has(ref.id)).map(copyReference))
    }
    return { ...next, html, references }
  }
  return merge(previous, incoming)
}
