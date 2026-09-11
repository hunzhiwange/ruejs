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
describe('TextResponse.redirect() status codes', () => {
  it('defaults to 307 Temporary Redirect', async () => {
    const { TextResponse } = await import('../src/shims/server.js')
    const res = TextResponse.redirect('https://example.com')
    expect(res.status).toBe(307)
  })

  it('supports 301 Permanent Redirect', async () => {
    const { TextResponse } = await import('../src/shims/server.js')
    const res = TextResponse.redirect('https://example.com', 301)
    expect(res.status).toBe(301)
    // validateURL() normalizes via `new URL()`, adding a trailing slash for origin-only URLs.
    expect(res.headers.get('Location')).toBe('https://example.com/')
  })

  it('supports 302 Found', async () => {
    const { TextResponse } = await import('../src/shims/server.js')
    const res = TextResponse.redirect('https://example.com', 302)
    expect(res.status).toBe(302)
  })

  it('supports 308 Permanent Redirect', async () => {
    const { TextResponse } = await import('../src/shims/server.js')
    const res = TextResponse.redirect('https://example.com', 308)
    expect(res.status).toBe(308)
  })

  it('accepts URL object', async () => {
    const { TextResponse } = await import('../src/shims/server.js')
    const url = new URL('https://example.com/target')
    const res = TextResponse.redirect(url)
    expect(res.headers.get('Location')).toBe('https://example.com/target')
  })

  it('supports 303 See Other', async () => {
    const { TextResponse } = await import('../src/shims/server.js')
    const res = TextResponse.redirect('https://example.com', 303)
    expect(res.status).toBe(303)
  })

  // Ported from Text.js: packages/text/src/server/web/spec-extension/response.ts
  // Text.js validates redirect status codes and throws RangeError for invalid ones.
  it('throws RangeError for non-redirect status code 200', async () => {
    const { TextResponse } = await import('../src/shims/server.js')
    expect(() => TextResponse.redirect('https://example.com', 200)).toThrow(RangeError)
  })

  it('throws RangeError for non-redirect status code 418', async () => {
    const { TextResponse } = await import('../src/shims/server.js')
    expect(() => TextResponse.redirect('https://example.com', 418)).toThrow(RangeError)
  })

  it('throws RangeError with descriptive message for invalid status', async () => {
    const { TextResponse } = await import('../src/shims/server.js')
    expect(() => TextResponse.redirect('https://example.com', 200)).toThrow(
      /Failed to execute "redirect" on "response": Invalid status code/,
    )
  })
})

// ---------------------------------------------------------------------------
// matchConfigPattern unit tests (text.config.js redirects/rewrites)

describe('matchConfigPattern', () => {
  it('matches exact paths', async () => {
    const { matchConfigPattern } = await import('../src/config/config-matchers.js')
    expect(matchConfigPattern('/about', '/about')).toEqual({})
    expect(matchConfigPattern('/', '/')).toEqual({})
    expect(matchConfigPattern('/about', '/other')).toBeNull()
  })

  it('matches single :param segments', async () => {
    const { matchConfigPattern } = await import('../src/config/config-matchers.js')
    const result = matchConfigPattern('/blog/hello-world', '/blog/:slug')
    expect(result).toEqual({ slug: 'hello-world' })
  })

  it('matches multiple :param segments', async () => {
    const { matchConfigPattern } = await import('../src/config/config-matchers.js')
    const result = matchConfigPattern('/blog/2024/my-post', '/blog/:year/:slug')
    expect(result).toEqual({ year: '2024', slug: 'my-post' })
  })

  it('rejects when segment count differs for non-wildcard patterns', async () => {
    const { matchConfigPattern } = await import('../src/config/config-matchers.js')
    expect(matchConfigPattern('/blog/a/b', '/blog/:slug')).toBeNull()
    expect(matchConfigPattern('/blog', '/blog/:slug')).toBeNull()
  })

  it('matches :path* catch-all (zero or more segments)', async () => {
    const { matchConfigPattern } = await import('../src/config/config-matchers.js')
    // Zero segments
    expect(matchConfigPattern('/docs', '/docs/:path*')).toEqual({ path: '' })
    // One segment
    expect(matchConfigPattern('/docs/intro', '/docs/:path*')).toEqual({ path: 'intro' })
    // Multiple segments
    expect(matchConfigPattern('/docs/guide/getting-started', '/docs/:path*')).toEqual({
      path: 'guide/getting-started',
    })
  })

  it('matches :path+ catch-all (one or more segments)', async () => {
    const { matchConfigPattern } = await import('../src/config/config-matchers.js')
    // One segment
    expect(matchConfigPattern('/api/users', '/api/:path+')).toEqual({ path: 'users' })
    // Multiple segments
    expect(matchConfigPattern('/api/users/123', '/api/:path+')).toEqual({ path: 'users/123' })
    // Zero segments — should NOT match
    expect(matchConfigPattern('/api', '/api/:path+')).toBeNull()
  })

  it('matches regex group patterns', async () => {
    const { matchConfigPattern } = await import('../src/config/config-matchers.js')
    // Common Text.js pattern: /:path(\\d+) for numeric paths
    const result = matchConfigPattern('/123', '/:id(\\d+)')
    if (result) {
      expect(result.id).toBe('123')
    }
    // Non-numeric should not match
    expect(matchConfigPattern('/abc', '/:id(\\d+)')).toBeNull()
  })

  it('handles dots in patterns', async () => {
    const { matchConfigPattern } = await import('../src/config/config-matchers.js')
    expect(matchConfigPattern('/feed.xml', '/feed.xml')).toEqual({})
    // Dot should not match any character
    expect(matchConfigPattern('/feedXxml', '/feed.xml')).toBeNull()
  })

  it('matches :path* with literal suffix (e.g. /:path*.md)', async () => {
    const { matchConfigPattern } = await import('../src/config/config-matchers.js')
    // Should match URLs ending in .md
    expect(matchConfigPattern('/article.md', '/:path*.md')).toEqual({ path: 'article' })
    expect(matchConfigPattern('/news/my-article.md', '/:path*.md')).toEqual({
      path: 'news/my-article',
    })
    expect(matchConfigPattern('/docs/guide/intro.md', '/:path*.md')).toEqual({
      path: 'docs/guide/intro',
    })
    // Should NOT match URLs without .md suffix
    expect(matchConfigPattern('/', '/:path*.md')).toBeNull()
    expect(matchConfigPattern('/about', '/:path*.md')).toBeNull()
    expect(matchConfigPattern('/news', '/:path*.md')).toBeNull()
    expect(matchConfigPattern('/article.txt', '/:path*.md')).toBeNull()
  })

  it('matches :path+ with literal suffix (e.g. /:path+.json)', async () => {
    const { matchConfigPattern } = await import('../src/config/config-matchers.js')
    // Should match URLs ending in .json with at least one path segment
    expect(matchConfigPattern('/data.json', '/:path+.json')).toEqual({ path: 'data' })
    expect(matchConfigPattern('/api/users.json', '/:path+.json')).toEqual({ path: 'api/users' })
    // Should NOT match bare .json (zero segments before suffix)
    expect(matchConfigPattern('/.json', '/:path+.json')).toBeNull()
    // Should NOT match URLs without .json suffix
    expect(matchConfigPattern('/data', '/:path+.json')).toBeNull()
    expect(matchConfigPattern('/', '/:path+.json')).toBeNull()
  })

  it('matches :path* with prefix and suffix (e.g. /docs/:path*.md)', async () => {
    const { matchConfigPattern } = await import('../src/config/config-matchers.js')
    expect(matchConfigPattern('/docs/intro.md', '/docs/:path*.md')).toEqual({ path: 'intro' })
    expect(matchConfigPattern('/docs/guide/getting-started.md', '/docs/:path*.md')).toEqual({
      path: 'guide/getting-started',
    })
    // Should NOT match without .md
    expect(matchConfigPattern('/docs/intro', '/docs/:path*.md')).toBeNull()
    // Should NOT match different prefix
    expect(matchConfigPattern('/blog/intro.md', '/docs/:path*.md')).toBeNull()
  })

  it('matches :param with literal suffix (e.g. /:slug.md)', async () => {
    const { matchConfigPattern } = await import('../src/config/config-matchers.js')
    // Should match URLs with the .md suffix and extract the param
    expect(matchConfigPattern('/hello-world.md', '/:slug.md')).toEqual({ slug: 'hello-world' })
    expect(matchConfigPattern('/my-post.md', '/:slug.md')).toEqual({ slug: 'my-post' })
    // Should NOT match URLs without .md suffix
    expect(matchConfigPattern('/', '/:slug.md')).toBeNull()
    expect(matchConfigPattern('/hello-world', '/:slug.md')).toBeNull()
    expect(matchConfigPattern('/hello-world.txt', '/:slug.md')).toBeNull()
    // Should NOT match paths with extra segments
    expect(matchConfigPattern('/blog/hello-world.md', '/:slug.md')).toBeNull()
  })

  it('matches :param with literal suffix via config-matchers module', async () => {
    const { matchConfigPattern } = await import('../src/config/config-matchers.js')
    expect(matchConfigPattern('/hello-world.md', '/:slug.md')).toEqual({ slug: 'hello-world' })
    expect(matchConfigPattern('/', '/:slug.md')).toBeNull()
    expect(matchConfigPattern('/hello-world', '/:slug.md')).toBeNull()
  })

  it('still matches plain :path* catch-all (no suffix) correctly', async () => {
    const { matchConfigPattern } = await import('../src/config/config-matchers.js')
    // Ensure the fix doesn't regress existing catch-all behavior
    expect(matchConfigPattern('/docs', '/docs/:path*')).toEqual({ path: '' })
    expect(matchConfigPattern('/docs/intro', '/docs/:path*')).toEqual({ path: 'intro' })
    expect(matchConfigPattern('/docs/guide/getting-started', '/docs/:path*')).toEqual({
      path: 'guide/getting-started',
    })
  })

  // Regression test for: catch-all prefix overmatch
  // /foobar was incorrectly matched by /foo/:path* because startsWith("/foo")
  // passed without checking for a segment boundary after the prefix.
  // https://github.com/cloudflare/vinext/pull/368
  it('regression: does not overmatch catch-all when pathname shares a prefix but not a segment boundary', async () => {
    const { matchConfigPattern } = await import('../src/config/config-matchers.js')
    // Core regression case: /foobar must NOT match /foo/:path*
    expect(matchConfigPattern('/foobar', '/foo/:path*')).toBeNull()
    // Similarly for :path+
    expect(matchConfigPattern('/foobar', '/foo/:path+')).toBeNull()
    // A legitimate sub-path still matches
    expect(matchConfigPattern('/foo/bar', '/foo/:path*')).toEqual({ path: 'bar' })
    // An exact prefix (zero segments) still matches for :path*
    expect(matchConfigPattern('/foo', '/foo/:path*')).toEqual({ path: '' })
    // An exact prefix (zero segments) still does NOT match for :path+
    expect(matchConfigPattern('/foo', '/foo/:path+')).toBeNull()
    // Deeper false-prefix: /football must NOT match /foot/:path*
    expect(matchConfigPattern('/football', '/foot/:path*')).toBeNull()
    // But /foot/ball should match
    expect(matchConfigPattern('/foot/ball', '/foot/:path*')).toEqual({ path: 'ball' })
  })

  it('regression: catch-all prefix overmatch via config-matchers module', async () => {
    const { matchConfigPattern } = await import('../src/config/config-matchers.js')
    // Same cases exercised against the standalone config-matchers module
    expect(matchConfigPattern('/foobar', '/foo/:path*')).toBeNull()
    expect(matchConfigPattern('/foobar', '/foo/:path+')).toBeNull()
    expect(matchConfigPattern('/foo/bar', '/foo/:path*')).toEqual({ path: 'bar' })
    expect(matchConfigPattern('/foo', '/foo/:path*')).toEqual({ path: '' })
    expect(matchConfigPattern('/foo', '/foo/:path+')).toBeNull()
  })

  // Regression for #1331: a trailing slash on the request pathname must not
  // hide a config rewrite/redirect/header source written without one. This
  // mirrors Text.js's conditional `source + '(/)?'` suffix under
  // `trailingSlash: true` — see `stripTrailingSlashForConfigMatch`.
  it('strips a trailing slash on the incoming pathname before matching', async () => {
    const { matchConfigPattern } = await import('../src/config/config-matchers.js')
    // Exact match: trailing slash on the pathname is ignored.
    expect(matchConfigPattern('/about/', '/about')).toEqual({})
    // :param match across the segment with a trailing slash on the pathname.
    expect(matchConfigPattern('/blog/hello-world/', '/blog/:slug')).toEqual({
      slug: 'hello-world',
    })
    // Multi-segment :param with a trailing slash.
    expect(matchConfigPattern('/blog/2024/my-post/', '/blog/:year/:slug')).toEqual({
      year: '2024',
      slug: 'my-post',
    })
    // Regex-group pattern with a trailing slash.
    expect(matchConfigPattern('/123/', '/:id(\\d+)')).toEqual({ id: '123' })
  })

  it('preserves the root path and catch-all semantics under trailing slash', async () => {
    const { matchConfigPattern } = await import('../src/config/config-matchers.js')
    // The root pathname "/" stays "/" — never stripped to "".
    expect(matchConfigPattern('/', '/')).toEqual({})
    // Catch-alls already consume the trailing slash; the strip must not turn
    // `/docs/` into `/docs` in a way that breaks zero-segment matching.
    expect(matchConfigPattern('/docs/', '/docs/:path*')).toEqual({ path: '' })
    // One-segment catch-all with trailing slash on the pathname.
    expect(matchConfigPattern('/docs/intro/', '/docs/:path*')).toEqual({ path: 'intro' })
    // :path+ still requires at least one segment when the only "extra" was a slash.
    expect(matchConfigPattern('/api/', '/api/:path+')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// isSafeRegex / safeRegExp unit tests (ReDoS prevention)

describe('isSafeRegex', () => {
  it('accepts simple patterns', async () => {
    const { isSafeRegex } = await import('../src/config/config-matchers.js')
    expect(isSafeRegex('^/about$')).toBe(true)
    expect(isSafeRegex('^/blog/[^/]+$')).toBe(true)
    expect(isSafeRegex('^/docs/(.*)$')).toBe(true)
    expect(isSafeRegex('^/api/(.+)$')).toBe(true)
    expect(isSafeRegex('\\d+')).toBe(true)
    expect(isSafeRegex('^/feed\\.xml$')).toBe(true)
  })

  it('accepts non-nested quantifiers inside groups', async () => {
    const { isSafeRegex } = await import('../src/config/config-matchers.js')
    // A single quantifier inside a group without a quantifier on the group itself
    expect(isSafeRegex('(a+)')).toBe(true)
    expect(isSafeRegex('([^/]+)')).toBe(true)
    expect(isSafeRegex('(\\d{2,4})')).toBe(true)
  })

  it('rejects nested quantifiers: (a+)+', async () => {
    const { isSafeRegex } = await import('../src/config/config-matchers.js')
    expect(isSafeRegex('(a+)+')).toBe(false)
  })

  it('rejects nested quantifiers: (a+)*', async () => {
    const { isSafeRegex } = await import('../src/config/config-matchers.js')
    expect(isSafeRegex('(a+)*')).toBe(false)
  })

  it('rejects nested quantifiers: (.*)*', async () => {
    const { isSafeRegex } = await import('../src/config/config-matchers.js')
    expect(isSafeRegex('(.*)*')).toBe(false)
  })

  it('rejects nested quantifiers: (a*)+', async () => {
    const { isSafeRegex } = await import('../src/config/config-matchers.js')
    expect(isSafeRegex('(a*)+')).toBe(false)
  })

  it('rejects nested quantifiers: ([^/]+)+', async () => {
    const { isSafeRegex } = await import('../src/config/config-matchers.js')
    expect(isSafeRegex('([^/]+)+')).toBe(false)
  })

  it('rejects nested quantifiers with braces: (a+){2,}', async () => {
    const { isSafeRegex } = await import('../src/config/config-matchers.js')
    expect(isSafeRegex('(a+){2,}')).toBe(false)
  })

  it('accepts quantifier on group without inner quantifier', async () => {
    const { isSafeRegex } = await import('../src/config/config-matchers.js')
    // (ab)+ is fine — no inner quantifier
    expect(isSafeRegex('(ab)+')).toBe(true)
    expect(isSafeRegex('(foo|bar)*')).toBe(true)
  })

  it('treats escaped characters as safe', async () => {
    const { isSafeRegex } = await import('../src/config/config-matchers.js')
    // \\+ is a literal +, not a quantifier
    expect(isSafeRegex('(a\\+)+')).toBe(true)
  })

  it('treats quantifiers inside character classes as safe', async () => {
    const { isSafeRegex } = await import('../src/config/config-matchers.js')
    // [+*] is a character class, not a quantifier
    expect(isSafeRegex('([+*])+')).toBe(true)
  })

  it('rejects nested optional quantifiers: (a?)+', async () => {
    const { isSafeRegex } = await import('../src/config/config-matchers.js')
    // '?' inside group + quantifier on group = catastrophic backtracking
    expect(isSafeRegex('(a?)+')).toBe(false)
    expect(isSafeRegex('(a?)+b')).toBe(false)
  })

  it('rejects nested optional quantifiers: (.?)+', async () => {
    const { isSafeRegex } = await import('../src/config/config-matchers.js')
    expect(isSafeRegex('(.?)+')).toBe(false)
  })

  it('rejects nested optional quantifiers: (a?)*', async () => {
    const { isSafeRegex } = await import('../src/config/config-matchers.js')
    expect(isSafeRegex('(a?)*')).toBe(false)
  })

  it("accepts outer '?' on group (zero-or-one is not unbounded repetition)", async () => {
    const { isSafeRegex } = await import('../src/config/config-matchers.js')
    // '?' means zero or one — only 2 paths, not exponential backtracking
    // This is safe even with inner quantifiers (e.g. URL patterns like (?:/.*)?  )
    expect(isSafeRegex('(a+)?')).toBe(true)
    expect(isSafeRegex('(?:/.*)?')).toBe(true)
  })

  it('treats non-greedy modifier as safe, not as quantifier', async () => {
    const { isSafeRegex } = await import('../src/config/config-matchers.js')
    // a+? is non-greedy '+', not a nested quantifier
    expect(isSafeRegex('(a+?)')).toBe(true)
    // (a*?) is non-greedy '*', still just one quantifier
    expect(isSafeRegex('(a*?)')).toBe(true)
  })
})

describe('safeRegExp', () => {
  it('returns RegExp for safe patterns', async () => {
    const { safeRegExp } = await import('../src/config/config-matchers.js')
    const re = safeRegExp('^/about$')
    expect(re).toBeInstanceOf(RegExp)
    expect(re!.test('/about')).toBe(true)
  })

  it('returns null for pathological patterns', async () => {
    const { safeRegExp } = await import('../src/config/config-matchers.js')
    // lgtm[js/redos] — deliberate pathological regex to test safeRegExp guard
    const re = safeRegExp('(a+)+b')
    expect(re).toBeNull()
  })

  it('returns null for invalid regex syntax', async () => {
    const { safeRegExp } = await import('../src/config/config-matchers.js')
    const re = safeRegExp('(?P<name>')
    expect(re).toBeNull()
  })
})

describe('escapeHeaderSource', () => {
  it('passes through literal paths unchanged', async () => {
    const { escapeHeaderSource } = await import('../src/config/config-matchers.js')
    expect(escapeHeaderSource('/api/users')).toBe('/api/users')
  })

  it('escapes dots', async () => {
    const { escapeHeaderSource } = await import('../src/config/config-matchers.js')
    expect(escapeHeaderSource('/file.txt')).toBe('/file\\.txt')
  })

  it('converts named param to [^/]+', async () => {
    const { escapeHeaderSource } = await import('../src/config/config-matchers.js')
    expect(escapeHeaderSource('/user/:id')).toBe('/user/[^/]+')
  })

  it('converts glob * to .*', async () => {
    const { escapeHeaderSource } = await import('../src/config/config-matchers.js')
    expect(escapeHeaderSource('/api/*')).toBe('/api/.*')
  })

  it('escapes + and ?', async () => {
    const { escapeHeaderSource } = await import('../src/config/config-matchers.js')
    expect(escapeHeaderSource('/path+query')).toBe('/path\\+query')
    expect(escapeHeaderSource('/maybe?')).toBe('/maybe\\?')
  })

  it('handles constrained param :param(constraint)', async () => {
    const { escapeHeaderSource } = await import('../src/config/config-matchers.js')
    expect(escapeHeaderSource('/api/:version(\\d+)/users')).toBe('/api/(\\d+)/users')
  })

  it('handles constrained param with alternation', async () => {
    const { escapeHeaderSource } = await import('../src/config/config-matchers.js')
    expect(escapeHeaderSource('/:lang(en|fr)/page')).toBe('/(en|fr)/page')
  })

  it('preserves standalone regex groups', async () => {
    const { escapeHeaderSource } = await import('../src/config/config-matchers.js')
    expect(escapeHeaderSource('/api/(v1|v2)/users')).toBe('/api/(v1|v2)/users')
  })

  it('handles multiple groups and params', async () => {
    const { escapeHeaderSource } = await import('../src/config/config-matchers.js')
    expect(escapeHeaderSource('/:lang(en|fr)/:id(\\d+)/page')).toBe('/(en|fr)/(\\d+)/page')
  })
})
