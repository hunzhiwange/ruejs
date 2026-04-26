import { describe, expect, it } from 'vitest'

import * as runtimeMain from '@rue-js/runtime'
import * as rueMain from '@rue-js/rue'

const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

const importRemovedSubpath = async (subpath: string) => import(/* @vite-ignore */ subpath)
const REMOVED_COMPAT_EXPORTS = [
  `render${'Compat'}`,
  `renderBetween${'Compat'}`,
  `renderAnchor${'Compat'}`,
  `renderStatic${'Compat'}`,
] as const
const REMOVED_CREATE_HELPER = ['_$vaporCreate', 'V', 'Node'].join('')
const REMOVED_RUE_VAPOR_HELPERS = [
  '_$createComment',
  '_$createTextNode',
  '_$createElement',
  '_$createTextWrapper',
  '_$setStyle',
  '_$settextContent',
  '_$createDocumentFragment',
  '_$appendChild',
  '_$removeChild',
  '_$insertBefore',
  '_$replaceChild',
  '_$querySelector',
  '_$setAttribute',
  '_$removeAttribute',
  '_$addEventListener',
  '_$removeEventListener',
  '_$setClassName',
  '_$setInnerHTML',
  '_$setValue',
  '_$setChecked',
  '_$setDisabled',
  '_$getTagName',
  '_$vaporKeyedList',
  '_$vaporBindUseRef',
  '_$vaporShowStyle',
  '_$vaporWithHookId',
] as const
const REMOVED_RUNTIME_COMPAT_SUBPATH = ['@rue-js/runtime', 'compat'].join('/')
const REMOVED_RUE_COMPAT_SUBPATH = ['@rue-js/rue', 'compat'].join('/')

describe('removed compat subpaths', () => {
  it('keeps removed compat helpers and legacy render-function helpers off the default public entry', () => {
    for (const removedExport of REMOVED_COMPAT_EXPORTS) {
      expect(runtimeMain).not.toHaveProperty(removedExport)
    }
    expect(runtimeMain).not.toHaveProperty(REMOVED_CREATE_HELPER)
    expect(runtimeMain).not.toHaveProperty('mergeProps')
    expect(runtimeMain).not.toHaveProperty('cloneVNode')
    expect(runtimeMain).not.toHaveProperty('isVNode')
    expect(runtimeMain).not.toHaveProperty('resolveComponent')
    expect(runtimeMain).not.toHaveProperty('resolveDirective')
    expect(runtimeMain).not.toHaveProperty('withDirectives')
    expect(runtimeMain).not.toHaveProperty('withModifiers')
    for (const removedExport of REMOVED_COMPAT_EXPORTS) {
      expect(rueMain).not.toHaveProperty(removedExport)
    }
    expect(rueMain).not.toHaveProperty(REMOVED_CREATE_HELPER)
    expect(rueMain).not.toHaveProperty('mergeProps')
    expect(rueMain).not.toHaveProperty('cloneVNode')
    expect(rueMain).not.toHaveProperty('isVNode')
    expect(rueMain).not.toHaveProperty('resolveComponent')
    expect(rueMain).not.toHaveProperty('resolveDirective')
    expect(rueMain).not.toHaveProperty('withDirectives')
    expect(rueMain).not.toHaveProperty('withModifiers')
    for (const removedHelper of REMOVED_RUE_VAPOR_HELPERS) {
      expect(rueMain).not.toHaveProperty(removedHelper)
    }
  })

  it('returns a tagged mount handle from the default public helper', () => {
    const fragment = document.createDocumentFragment()
    const runtimeHandle = runtimeMain.vapor(() => fragment as any) as Record<string, unknown>
    const rueHandle = rueMain.vapor(() => fragment as any) as Record<string, unknown>

    expect(runtimeHandle).toHaveProperty('__rue_mount_id')
    expect(runtimeHandle).not.toHaveProperty('type')
    expect(rueHandle).toHaveProperty('__rue_mount_id')
    expect(rueHandle).not.toHaveProperty('type')
  })

  it('renders a direct vapor handle through the default render entry', async () => {
    const fragment = document.createDocumentFragment()
    const strong = document.createElement('strong')

    strong.textContent = 'default-vapor-handle'
    fragment.appendChild(strong)

    const container = document.createElement('div')
    document.body.appendChild(container)

    runtimeMain.render(runtimeMain.vapor(() => fragment as any), container)
    await flush()

    expect(container.textContent).toBe('default-vapor-handle')
    expect(container.querySelectorAll('strong')).toHaveLength(1)
  })

  it('no longer resolves removed compat subpaths', async () => {
    await expect(importRemovedSubpath(REMOVED_RUNTIME_COMPAT_SUBPATH)).rejects.toThrow()
    await expect(importRemovedSubpath(REMOVED_RUE_COMPAT_SUBPATH)).rejects.toThrow()
  })
})