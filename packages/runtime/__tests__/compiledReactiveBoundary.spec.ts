import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

describe('compiled reactive dependency boundary', () => {
  it('bundles state, computed, watch and effect without an object hook runtime', async () => {
    const inputs = JSON.parse(
      execFileSync(
        process.execPath,
        [
          '-e',
          `
      const { buildSync } = require('esbuild');
      const result = buildSync({
        stdin: { contents: "export { _$compiledUseState, _$compiledUseEffect, computed, watch, batch, createOwner, disposeOwner } from './packages/runtime/src/compiler-runtime/entries/reactive'", resolveDir: process.cwd() },
        bundle: true, write: false, metafile: true, format: 'esm', logLevel: 'silent'
      });
      console.log(JSON.stringify(Object.entries(Object.values(result.metafile.outputs)[0].inputs).filter(([,info]) => info.bytesInOutput > 0).map(([path]) => path)));
    `,
        ],
        { encoding: 'utf8' },
      ),
    ) as string[]
    expect(
      inputs.filter(path =>
        /js-reactive\/(?:facade|hooks)|reactive\.shared|compiled-hook-compat|runtime-context/.test(
          path,
        ),
      ),
    ).toEqual([])
  })
})
