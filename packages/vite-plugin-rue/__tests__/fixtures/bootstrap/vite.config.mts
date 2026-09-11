import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { defineConfig } from 'vite'
import Rue from '../../../index.mjs'

export default defineConfig({
  root: import.meta.dirname,
  plugins: [
    Rue(),
    {
      name: 'bootstrap-production-evidence',
      generateBundle(_options, bundle) {
        const chunks = Object.values(bundle).filter(item => item.type === 'chunk')
        const modules = chunks.flatMap(chunk => Object.keys(chunk.modules))
        const forbidden = modules.filter(id =>
          /js-runtime|js-reactive\/facade|compiled-legacy-dom|\/island\.|\/server\.|\/builtins\//.test(
            id,
          ),
        )
        const gzip = chunks.reduce((sum, chunk) => sum + gzipSync(chunk.code).length, 0)
        if (forbidden.length || gzip > 10240)
          this.error(
            `Bootstrap runtime budget/boundary failed: ${JSON.stringify({ gzip, forbidden })}`,
          )
        this.emitFile({
          type: 'asset',
          fileName: 'bootstrap-evidence.json',
          source: JSON.stringify(
            {
              gzip,
              budget: 10240,
              forbidden,
              modules,
              chunks: chunks.map(chunk => ({
                fileName: chunk.fileName,
                bytes: Buffer.byteLength(chunk.code),
              })),
            },
            null,
            2,
          ),
        })
      },
    },
  ],
  build: {
    outDir: path.resolve(import.meta.dirname, '../../../../../temp/size/bootstrap-production'),
    emptyOutDir: true,
    minify: true,
  },
})
