import { expect, it } from 'vite-plus/test'
import { preserveFrameSlots } from '../src/server/app-frame-slots.js'
import type { ServerFrame, ClientBoundary } from '@rue-js/runtime/internal/hydrate'
const slot = (html: string) =>
  `<!--text-slot:slot%3Ateam%3A%2F-->${html}<!--/text-slot:slot%3Ateam%3A%2F-->`
const boundary = (id: string) => `<!--r:b:rsc:${id}--><button>0</button><!--/r:b:rsc:${id}-->`
const ref = (id: string, identity: string): ClientBoundary => ({
  id,
  identity,
  referenceKey: '/counter.tsx',
  exportName: 'default',
  props: {},
})
const frame = (html: string, references: ClientBoundary[] = []): ServerFrame => ({
  version: 1,
  html,
  references,
})
it('preserves only approved compiled slot ranges and avoids reference id collisions', () => {
  const before = frame(slot(boundary('0')), [ref('0', 'team')])
  const incoming = frame(boundary('0') + slot(boundary('1')), [
    ref('0', 'page'),
    ref('1', 'default'),
  ])
  const result = preserveFrameSlots(before, incoming, ['slot:team:/'])
  expect(result.html).toContain(slot(boundary('2')))
  expect(result.references.map(ref => [ref.id, ref.identity])).toEqual([
    ['0', 'page'],
    ['2', 'team'],
  ])
  expect(incoming.references[1].identity).toBe('default')
  expect(preserveFrameSlots(before, incoming, [])).toBe(incoming)
})
it('keeps nested client children attached to their parent boundary', () => {
  const oldChild = frame(slot(boundary('1')), [ref('1', 'team')])
  const newChild = frame(slot('default'))
  const before = frame(slot(boundary('1')), [{ ...ref('0', 'layout'), children: oldChild }])
  const incoming = frame(slot('default'), [{ ...ref('0', 'layout'), children: newChild }])
  const result = preserveFrameSlots(before, incoming, ['slot:team:/'])
  expect(result.references).toHaveLength(1)
  expect(result.references[0].children?.references).toMatchObject([{ identity: 'team' }])
  const id = result.references[0].children!.references[0].id
  expect(result.html).toContain(boundary(id))
  expect(result.references[0].children!.html).toContain(boundary(id))
})
it('does not restore a slot that has no destination range', () => {
  const incoming = frame('<main>other route</main>')
  expect(preserveFrameSlots(frame(slot('previous')), incoming, ['slot:team:/'])).toEqual(incoming)
})
