import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory()
      ? sources(resolve(dir, entry.name))
      : /\.[jt]sx?$/.test(entry.name)
        ? [resolve(dir, entry.name)]
        : [],
  )
describe('ecosystem closed ABI imports', () => {
  for (const pkg of ['router', 'store', 'i18n'])
    it(`${pkg} has no legacy rendering imports`, () => {
      for (const path of sources(resolve(import.meta.dirname, `../../${pkg}/src`))) {
        expect(readFileSync(path, 'utf8'), path).not.toMatch(
          /\b(?:renderAnchor|createCompiledDynamic|createCompiledFragment|getCurrentContainer)\b|['"]@rue-js\/(?:rue|runtime)\/internal['"]|jsx-runtime|portable|legacy/,
        )
      }
    })
})
