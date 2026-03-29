/*
架构设计总览
- 插件目标：在 Vite transform 阶段使用 SWC + 自研 wasm 插件对 TSX/JSX 进行转换，支持 Vapor 开关。
- 转换管线：transform 钩子判断文件类型与包含规则，调用 transformWithSwcPlugin 完成转换，并输出标记。
- vaporFlag 判定：首行注释是否为 '\/** @virtual *\/'，用于向 wasm 插件传递 vapor 布尔开关。
  - wasm 加载策略：优先使用项目默认路径，写入环境变量 RUE_SWC_PLUGIN。
  */
import swc from '@swc/core'
import { createRequire } from 'node:module'

/**
 * Rue 的 Vite 插件入口
 * @param {Object} options 插件配置项
 * @param {string[]} [options.include] 包含路径关键字（任一命中则处理）
 * @param {string[]} [options.exclude] 排除路径关键字（任一命中则跳过）
 * @param {boolean} [options.debug] 调试日志开关
 * @returns {import('vite').Plugin} Vite 插件对象
 */
export default function VitePluginRue(options = {}) {
  const { include = [], exclude = [], debug = false } = options

  /**
   * 判断文件是否需要被插件处理
   * @param {string} id 模块路径
   * @returns {boolean} 是否包含
   */
  const isIncluded = id => {
    if (exclude.some(x => id.includes(x))) return false
    if (include.length === 0) return true
    return include.some(x => id.includes(x))
  }

  /**
   * 使用 SWC + wasm 插件进行代码转换
   * @param {string} code 输入源码
   * @param {boolean} vaporFlag Vapor 模式开关
   * @returns {string} 转换后的源码（带标记头）
   */
  const transformWithSwcPlugin = (code, vaporFlag) => {
    const out = swc.transformSync(code, {
      filename: 'rue.tsx',
      jsc: {
        parser: { syntax: 'typescript', tsx: true },
        target: 'es2020',
        transform: {
          react: {
            runtime: 'automatic',
            importSource: '@rue-js',
            development: process.env.NODE_ENV !== 'production',
            throwIfNamespace: false,
          },
        },
        experimental: { plugins: [[process.env.RUE_SWC_PLUGIN, { vapor: !!vaporFlag }]] },
      },
      minify: process.env.NODE_ENV === 'production',
    })
    return '/* RUE_VAPOR_TRANSFORMED */\n' + out.code
  }

  return {
    /** 插件名称 */
    name: '@rue-js/vite-plugin-rue',
    /** 插件执行阶段：前置，优先于其他转换 */
    enforce: 'pre',
    /**
     * 控制插件应用范围（此处始终启用）
     * @returns {boolean} 是否应用
     */
    apply: (_config, { command: _command }) => true,
    /**
     * Vite 转换钩子：执行 wasm 插件转换
     * @param {string} code 源码
     * @param {string} id 模块路径
     * @returns {{code:string,map:null}|null} 转换结果或 null 跳过
     */
    async transform(code, id) {
      // 选择 wasm 插件路径：优先环境变量回退到默认路径
      if (!process.env.RUE_SWC_PLUGIN) {
        const req = createRequire(import.meta.url)
        process.env.RUE_SWC_PLUGIN = req.resolve('@rue-js/swc-plugin-rue')
      }

      // 匹配处理的文件类型：仅 TSX/JSX
      const isTsx = /(\.(tsx|jsx))(\?.*)?$/.test(id)
      if (!isTsx) return null
      // include/exclude 规则过滤
      if (!isIncluded(id)) return null
      // 已包含 RUE 头标记则直接跳过
      if (code.startsWith('/* RUE_VAPOR_TRANSFORMED */')) return null
      // 读取首行用于判定 Vapor 开关：首行为 '/** @virtual */' 则非 Vapor
      const firstLine = code.split(/\r?\n/, 1)[0]?.trim()
      const vaporFlag = firstLine !== '/** @virtual */'
      const base = code

      let out = null
      // 若找到 wasm 插件路径，则执行转换
      if (process.env.RUE_SWC_PLUGIN) {
        out = transformWithSwcPlugin(base, vaporFlag)
      }

      // 无输出或无变化时跳过
      if (!out || out === code) return null

      // 调试日志：提示已转换模块
      if (debug && out && out !== code) {
        console.log(`[rue-vapor] transformed: ${id}`)
      }
      // 返回转换后的代码与空映射
      return { code: out, map: null }
    },
    /** Vite 配置解析完成钩子（占位） */
    configResolved() {},
  }
}
