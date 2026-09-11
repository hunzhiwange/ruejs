// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { PAGES_FIXTURE_DIR } from './helpers.js'
import {
  createElement,
  renderAppServerElementToHtml,
  renderAppServerElementToHtmlAsync,
} from './app-server-protocol-test-utils.js'
import {
  createElement as createRueElement,
  renderToString as renderRueToString,
} from './rue-ssr-test-utils.js'
import { isExternalUrl, isHashOnlyChange } from '../src/shims/router.js?text-ssr'
import { extractTextTextDataJson } from '../src/client/text-text-data.js'
import { isValidModulePath } from '../src/client/validate-module-path.js'
import text from '../src/index.js'
import { safeJsonStringify } from '../src/server/html.js'
import { buildPagesTextDataScript } from '../src/server/pages-page-response.js'
import type { Plugin } from 'vite-plus'
import type { TextRouter } from '../src/shims/router.js?text-ssr'
import type { CacheHandler, CacheHandlerValue, IncrementalCacheValue } from '../src/shims/cache.js'

const FIXTURE_DIR = PAGES_FIXTURE_DIR
describe('text/script SSR rendering', () => {
  it('beforeInteractive escapes </script> case-insensitively', async () => {
    const Script = (await import('../src/shims/script.js?text-ssr')).default

    const html = await renderRueToString(() =>
      createRueElement(Script, {
        strategy: 'beforeInteractive',
        id: 'case-test',
        dangerouslySetInnerHTML: {
          __html: 'var x = "</SCRIPT><img src=x onerror=alert(1)>";',
        },
      }),
    )
    // Mixed-case </SCRIPT> must also be escaped
    expect(html).not.toContain('</SCRIPT>')
    expect(html).toContain('<\\/SCRIPT>')
  })
})
