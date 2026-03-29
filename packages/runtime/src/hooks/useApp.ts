/*
应用管理 Hook 概述
- 目标：以极简 API 管理应用的插件安装与挂载/卸载流程，屏蔽运行时差异。
- 适配器保障：在缺少 DOMAdapter 时自动注入 BrowserDOMAdapter，确保 DOM 操作能力就绪。
- 组件包装：支持传入组件函数或 {setup, render} 选项对象，统一包装为 FC，以便挂载。
- 容器规范化：支持字符串选择器与元素容器，统一转为 DomElementLike。
- 生命周期：提供 use/mount/unmount 三个方法管理应用，链式调用更便捷。
*/
import rue, { FC, ComponentInstance, VNode, Rue } from '../rue'
import { BrowserDOMAdapter, setDOMAdapter } from '../dom'
import type { DomElementLike } from '../dom'
import { querySelector, settextContent, setAttribute } from '../dom'

/** 创建应用管理器
 * @param AppOrOptions 组件或 {setup, render} 配置
 * @param runtime 可选自定义 Rue 实例
 * @returns 含 use/mount/unmount 的应用控制对象
 */
export function useApp(
  AppOrOptions:
    | ComponentInstance
    | {
        setup?: () => any
        render?: (ctx: any) => VNode
      },
  runtime?: Rue,
) {
  let containerRef: DomElementLike | null = null
  const appRue = (runtime as any) || (rue as any)
  if (typeof appRue.setDOMAdapter === 'function') {
    if (!(globalThis as any).__rue_dom) {
      setDOMAdapter(new BrowserDOMAdapter())
    }
    appRue.setDOMAdapter((globalThis as any).__rue_dom)
  }

  // 统一包装 App 为 FC
  const App: ComponentInstance =
    typeof AppOrOptions === 'function'
      ? (AppOrOptions as ComponentInstance)
      : (() => {
          const opts = (AppOrOptions || {}) as { setup?: () => any; render?: (ctx: any) => VNode }
          const Wrapper: FC = () => {
            // setup：计算上下文（例如依赖注入、状态初始化）
            const ctx = typeof opts.setup === 'function' ? opts.setup() : {}
            // render：若提供则使用，否则渲染空 div 作为占位
            return typeof opts.render === 'function'
              ? opts.render(ctx)
              : appRue.createElement('div', null, '')
          }
          return Wrapper
        })()

  /** 规范化容器：支持选择器字符串或元素 */
  const normalizeContainer = (container: string | DomElementLike): DomElementLike | null => {
    if (typeof container === 'string') {
      const el = querySelector(container)
      return (el as DomElementLike) || null
    }
    return container as DomElementLike
  }
  return {
    /** 安装插件到应用 */
    use(plugin: any, ...options: any[]) {
      // 透传到 Rue.use，支持多插件链式安装
      appRue.use(plugin, ...options)
      return this
    },
    /** 挂载应用到容器 */
    mount(container: string | DomElementLike) {
      const el = normalizeContainer(container)
      if (!el) return
      if ((el as any).nodeType === 1) {
        // 清空容器文本内容，避免遗留内容干扰渲染
        settextContent(el, '')
      }
      // 执行挂载：将 App 渲染到容器
      appRue.mount(App, el)
      // 为容器打标记，便于调试或样式定位
      if ((el as any).nodeType === 1) setAttribute(el, 'data-rue-app', '')
      containerRef = el
    },
    /** 从容器卸载应用 */
    unmount() {
      if (containerRef) {
        // 执行卸载，释放容器引用
        appRue.unmount(containerRef)
        containerRef = null
      }
    },
  }
}
