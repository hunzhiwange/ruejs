import { formatStaticError, snapshotClientRoute } from '@rue-js/server-renderer/static'
import { readFile } from 'node:fs/promises'

const [outDir, route, outputFile] = process.argv.slice(2)
const clientTemplateFile = process.env.APP_STATIC_CLIENT_TEMPLATE_FILE
const snapshotSettleMs = Number(process.env.APP_STATIC_SNAPSHOT_SETTLE_MS || 750)
const snapshotWaitMs = Number(process.env.APP_STATIC_SNAPSHOT_WAIT_MS || 9000)

if (!outDir || !route || !outputFile) {
  console.error('Usage: node scripts/app-static-snapshot-route.mjs <out-dir> <route> <output-file>')
  process.exit(1)
}

try {
  const docHtmlFile = process.env.APP_STATIC_DOC_HTML_FILE
  await snapshotClientRoute({
    outDir,
    route,
    outputFile,
    templateFile: clientTemplateFile,
    settleMs: snapshotSettleMs,
    waitMs: snapshotWaitMs,
    ...(docHtmlFile
      ? {
          extraGlobals: {
            __RUE_STATIC_DOC_HTML_BY_ROUTE__: {
              [route]: await readFile(docHtmlFile, 'utf-8'),
            },
          },
        }
      : {}),
  })
} catch (error) {
  console.error(formatStaticError(error))
  process.exit(1)
}
