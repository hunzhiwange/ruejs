import type { Plugin } from 'vite'

export interface RueVitePluginOptions {
  include?: string[]
  exclude?: string[]
  debug?: boolean
  optimizeStaticSlots?: boolean
  optimizeComponentAnchors?: boolean
}

export default function VitePluginRue(options?: RueVitePluginOptions): Plugin
