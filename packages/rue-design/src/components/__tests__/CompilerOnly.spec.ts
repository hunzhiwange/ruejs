import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { transformSync } from '@swc/core'
import { describe, expect, it } from 'vitest'

const componentsRoot = resolve('packages/rue-design/src/components')
const legacyHelpers =
  /\b(?:renderAnchor|renderStatic|normalizeChildren|materializeSlotChildren|_renderTransformedChildren|patchRenderable|RUE_COMPONENT_TYPE_KEY|renderNativePopup|renderLivePopup|cleanupStaleTreeNodes|cleanupStaleTags|syncLegacyInteractiveState|transientOpenKeys|treePersistedStateBySignature)\b/
const componentFiles = readdirSync(componentsRoot, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && entry.name !== '__tests__')
  .map(entry => resolve(componentsRoot, entry.name, 'index.tsx'))

// Compile every public component: a source-only scan cannot catch compiler fallbacks.
describe('Rue Design compiler-only boundary', () => {
  it('rejects legacy helpers in production source and generated component code', () => {
    expect(componentFiles.length).toBeGreaterThan(0)
    for (const filename of componentFiles) {
      const source = readFileSync(filename, 'utf8')
      expect(source, filename).not.toMatch(legacyHelpers)
      const { code } = transformSync(source, {
        filename,
        jsc: {
          parser: { syntax: 'typescript', tsx: true },
          target: 'es2020',
          experimental: {
            runPluginFirst: true,
            plugins: [
              [resolve('packages/swc-plugin-rue/swc-plugin-rue.wasm'), { target: 'client' }],
            ],
          },
        },
      })
      expect(code, filename).not.toMatch(legacyHelpers)
    }
  }, 30000)
})
