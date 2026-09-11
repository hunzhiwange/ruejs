import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../packages/text/src')
const forbidden =
  /\b(?:adaptAppServerRenderable(?:ForSsr|ForHtmlSsr)?|renderRueRenderableForRsc|renderAppSsrNodeToHtmlOnce|createRueTextElement|createTextElement|createServerProtocolElement|cloneServerProtocolElement|createSafeTextElement|createTextCompatProtocolElement|runWithServerElementRuntime(?:Stream)?|installServerElementRuntime|readAppRuntimeExport|readAppRuntimeCreateElement|__TEXT_RUE_RENDER_TO_STRING__|_\$createComponent|_\$createDynamic)\b/g
const results = []
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      await scan(file)
      continue
    }
    if (!/\.[cm]?[jt]sx?$/.test(file) || file.endsWith('.d.ts')) continue
    const source = await readFile(file, 'utf8')
    for (const match of source.matchAll(forbidden)) {
      results.push({
        file: path.relative(root, file),
        line: source.slice(0, match.index).split('\n').length,
        symbol: match[0],
      })
    }
    for (const match of source.matchAll(
      /import\s*\{([^}]+)\}\s*from\s*['"]@rue-js\/(?:rue|runtime)['"]/g,
    )) {
      for (const specifier of match[1].split(',')) {
        const name = specifier.trim().split(/\s+/)[0]
        if (['render', 'mount', 'hydrate', 'createElement'].includes(name)) {
          results.push({
            file: path.relative(root, file),
            line: source.slice(0, match.index).split('\n').length,
            symbol: name,
          })
        }
      }
    }
  }
}
await scan(root)
results.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
process.stdout.write(JSON.stringify({ failures: results, count: results.length }, null, 2) + '\n')
process.exitCode = results.length ? 1 : 0
