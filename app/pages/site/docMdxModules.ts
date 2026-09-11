import type { FC } from '@rue-js/rue'

type DocMdxModule = {
  default?: FC
}

type DocMdxModuleLoader = () => Promise<DocMdxModule>
type DocMdxModuleLoaders = Record<string, DocMdxModuleLoader>
type DocMdxModules = Record<string, DocMdxModule>

const normalizeDocId = (docId: string) =>
  docId
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\.(?:md|mdx)$/, '')

export const toDocIdFromMdxPath = (modulePath: string) => {
  const normalized = modulePath.replace(/\\/g, '/')
  const docsMarker = '/docs/'
  const docsIndex = normalized.lastIndexOf(docsMarker)
  const relativePath =
    docsIndex >= 0
      ? normalized.slice(docsIndex + docsMarker.length)
      : normalized.replace(/^(?:\.\.\/)+docs\//, '').replace(/^docs\//, '')

  return normalizeDocId(relativePath)
}

export const createDocMdxResolver = (moduleLoaders: DocMdxModuleLoaders) => {
  const moduleLoadersByDocId = new Map<string, DocMdxModuleLoader>()

  for (const [modulePath, loader] of Object.entries(moduleLoaders)) {
    moduleLoadersByDocId.set(toDocIdFromMdxPath(modulePath), loader)
  }

  return async (docId: string): Promise<FC | null> => {
    const loader = moduleLoadersByDocId.get(normalizeDocId(docId))
    if (!loader) return null

    const mod = await loader()
    return typeof mod.default === 'function' ? mod.default : null
  }
}

export const createSyncDocMdxResolver = (modules: DocMdxModules) => {
  const modulesByDocId = new Map<string, DocMdxModule>()

  for (const [modulePath, mod] of Object.entries(modules)) {
    modulesByDocId.set(toDocIdFromMdxPath(modulePath), mod)
  }

  return (docId: string): FC | null => {
    const mod = modulesByDocId.get(normalizeDocId(docId))
    return typeof mod?.default === 'function' ? mod.default : null
  }
}

const docMdxModuleLoaders = (import.meta as any).glob(
  '../../../docs/**/*.mdx',
) as DocMdxModuleLoaders
const eagerDocMdxModules = import.meta.env.SSR
  ? ((import.meta as any).glob('../../../docs/**/*.mdx', { eager: true }) as DocMdxModules)
  : {}

export const loadDocMdxComponent = createDocMdxResolver(docMdxModuleLoaders)
export const readDocMdxComponent = createSyncDocMdxResolver(eagerDocMdxModules)
