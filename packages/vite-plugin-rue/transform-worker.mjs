import swc from '@swc/core'
import { parentPort, workerData } from 'node:worker_threads'

const createSwcTransformOptions = ({
  pluginPath,
  isProduction,
  target = 'client',
  id = 'rue.tsx',
}) => ({
  filename: id,
  jsc: {
    parser: { syntax: 'typescript', tsx: !/\.[cm]?[jt]s(?:\?.*)?$/.test(id) },
    target: 'es2020',
    experimental: {
      runPluginFirst: true,
      plugins: [[pluginPath, { target }]],
    },
  },
  minify: isProduction,
})

const serializeError = error => ({
  name: error?.name || 'Error',
  message: error?.message || String(error),
  stack: error?.stack,
})

try {
  const { code, pluginPath, isProduction, target, id } = workerData
  const out = swc.transformSync(
    code,
    createSwcTransformOptions({
      id,
      pluginPath,
      isProduction,
      target,
    }),
  )
  parentPort?.postMessage({ code: out.code })
} catch (error) {
  parentPort?.postMessage({ error: serializeError(error) })
}
