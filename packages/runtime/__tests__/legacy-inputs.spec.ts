import { describe, expect, it } from 'vitest'

import { render, renderAnchor, renderBetween, renderStatic } from '../src'

const UNSUPPORTED_OBJECT_INPUT_ERROR = /Unsupported object inputs are no longer accepted/
const REMOVED_LEGACY_HANDLE_KEY = ['__rue_', 'vnode_id'].join('')

describe('default entry legacy input rejection', () => {
  it('rejects legacy host-node bridge objects on the default render entry', () => {
    const container = document.createElement('div')
    const hostNodeBridge = { __rue_host_node: document.createElement('span') }

    expect(() => render(hostNodeBridge as any, container as any)).toThrow(UNSUPPORTED_OBJECT_INPUT_ERROR)
  })

  it('rejects legacy vnode-like objects on the default render entry', () => {
    const container = document.createElement('div')
    const legacyObject = { type: 'div', props: { id: 'legacy' }, children: [] }

    expect(() => render(legacyObject as any, container as any)).toThrow(UNSUPPORTED_OBJECT_INPUT_ERROR)
  })

  it('rejects legacy vnode-handle objects on the default render entry', () => {
    const container = document.createElement('div')
    const legacyHandle = { [REMOVED_LEGACY_HANDLE_KEY]: 1 }

    expect(() => render(legacyHandle as any, container as any)).toThrow(UNSUPPORTED_OBJECT_INPUT_ERROR)
  })

  it('rejects legacy objects on the default range and anchor render entries', () => {
    const parent = document.createElement('div')
    const start = document.createComment('start')
    const end = document.createComment('end')
    const anchor = document.createComment('anchor')
    const legacyObject = { type: 'div', props: { id: 'legacy' }, children: [] }

    parent.append(start, end, anchor)

    expect(() => renderBetween(legacyObject as any, parent as any, start as any, end as any)).toThrow(
      UNSUPPORTED_OBJECT_INPUT_ERROR,
    )
    expect(() => renderAnchor(legacyObject as any, parent as any, anchor as any)).toThrow(
      UNSUPPORTED_OBJECT_INPUT_ERROR,
    )
    expect(() => renderStatic(legacyObject as any, parent as any, anchor as any)).toThrow(
      UNSUPPORTED_OBJECT_INPUT_ERROR,
    )
  })
})
