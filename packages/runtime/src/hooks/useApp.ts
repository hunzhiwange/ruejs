/*
应用管理 Hook 概述
- 目标：以极简 API 管理应用的插件安装与挂载/卸载流程，屏蔽运行时差异。
- 适配器保障：在缺少 DOMAdapter 时自动注入 BrowserDOMAdapter，确保 DOM 操作能力就绪。
- 组件包装：支持传入组件函数或 {setup, render} 选项对象，统一包装为 FC，以便挂载。
- 容器规范化：支持字符串选择器与元素容器，统一转为 DomElementLike。
- 生命周期：提供 use/mount/unmount 三个方法管理应用，链式调用更便捷。
*/
import type { FC, ComponentInstance, RenderOutput, Rue } from '../rue'
import { registerRuntimeComponent } from '../component-registry'
import { _$createComponent as createClosedComponent } from '../compiled-component-call'
import type { CompiledRootHandle } from '../compiled-root'
import type { DomElementLike } from '../dom'
import { appendChild, getParentNode, querySelector, settextContent, setAttribute } from '../dom'
import { shouldRetainRootMountError } from '../root-mount-error'
import {
  ensureRuntimeDOMBridge,
  getClientRuntime,
  runWithClientRuntime,
  runWithRootMountErrorRethrow,
} from '../client-runtime'
import {
  confirmAppContainer,
  failAppContainer,
  releaseAppContainer,
  reserveAppContainer,
  rollbackAppContainer,
} from './app-container-ownership'

/** 创建应用管理器
 * @param AppOrOptions 组件或 {setup, render} 配置
 * @param runtime 可选自定义 Rue 实例
 * @returns 含 use/component/mount/unmount 的应用控制对象
 */
export function useApp(
  AppOrOptions:
    | ComponentInstance
    | {
        /** 应用级 setup，返回值会传给 render。 */
        setup?: () => any
        /** 应用级 render，接收 setup 返回的上下文。 */
        render?: (ctx: any) => RenderOutput
      },
  runtime?: Rue,
) {
  let containerRef: DomElementLike | null = null
  let pendingContainerRef: DomElementLike | null = null
  let compiledRoot: CompiledRootHandle | null = null
  const pendingCompiledPlugins: Array<{ plugin: any; options: any[] }> = []
  const containerOwner = {}
  const useCompiledMount = runtime == null
  const appRue = (runtime as any) || getClientRuntime()
  ensureRuntimeDOMBridge(appRue)

  // 统一包装 App 为 FC
  const App: ComponentInstance =
    typeof AppOrOptions === 'function'
      ? (AppOrOptions as ComponentInstance)
      : (() => {
          const opts = (AppOrOptions || {}) as {
            setup?: () => any
            render?: (ctx: any) => RenderOutput
          }
          const Wrapper: FC = () => {
            // setup：计算上下文（例如依赖注入、状态初始化）
            const ctx = typeof opts.setup === 'function' ? opts.setup() : {}
            // render：若提供则使用，否则渲染空 div 作为占位
            return typeof opts.render === 'function'
              ? opts.render(ctx)
              : createClosedComponent('div', { children: '' })
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

  const flushCompiledPlugins = () => {
    const plugins = pendingCompiledPlugins.splice(0)
    for (const { plugin, options } of plugins) {
      const install = plugin?.install
      if (typeof install !== 'function') continue
      try {
        Reflect.apply(install, plugin, [undefined, options])
      } catch {
        // 与默认 runtime 的延迟插件安装保持一致：插件安装失败不阻断应用挂载。
      }
    }
  }

  return {
    /** 安装插件到应用，并返回 app 以支持链式调用。 */
    use(plugin: any, ...options: any[]) {
      // 透传到 Rue.use，支持多插件链式安装
      if (useCompiledMount) {
        pendingCompiledPlugins.push({
          plugin,
          options: options.length === 1 && Array.isArray(options[0]) ? options[0] : options,
        })
        return this
      }
      runWithClientRuntime(appRue, () => {
        appRue.use(plugin, ...options)
      })
      return this
    },
    /** 注册运行时组件名，供 <component is="Foo" /> 解析使用。 */
    component(name: string, component: ComponentInstance) {
      registerRuntimeComponent(appRue, name, component)
      return this
    },
    /** 挂载应用到容器，容器可以是选择器字符串或元素对象。 */
    mount(container: string | DomElementLike) {
      const el = normalizeContainer(container)
      if (!el) return

      const ownedContainer = containerRef || pendingContainerRef
      if (ownedContainer) {
        if (ownedContainer === el) return
        throw new Error('Rue app is already mounted on a different container.')
      }

      const reservation = reserveAppContainer(el, containerOwner)
      if (!reservation) return
      pendingContainerRef = el
      let runtimeMountStarted = false

      try {
        if ((el as any).nodeType === 1) {
          // 清空容器文本内容，避免遗留内容干扰渲染
          settextContent(el, '')
        }
        // 执行挂载：将 App 渲染到容器
        runtimeMountStarted = true
        if (useCompiledMount && typeof Node !== 'undefined' && el instanceof Node) {
          const root = createClosedComponent(App as any, {})
          runWithRootMountErrorRethrow(() =>
            runWithClientRuntime(
              appRue,
              () => {
                flushCompiledPlugins()
                const result = root.__rue_compiled_mount(el as ParentNode)
                if (result != null && getParentNode(result as any) !== el) {
                  appendChild(el, result as any)
                }
              },
              el,
            ),
          )
          compiledRoot = root
        } else {
          runWithClientRuntime(
            appRue,
            () => {
              appRue.mount(App, el)
            },
            el,
          )
        }
        // 为容器打标记，便于调试或样式定位
        if ((el as any).nodeType === 1) setAttribute(el, 'data-rue-app', '')
        confirmAppContainer(reservation)
        containerRef = el
      } catch (error) {
        if (shouldRetainRootMountError(error)) failAppContainer(el, error)
        if (runtimeMountStarted) {
          try {
            if (compiledRoot) {
              compiledRoot.dispose()
              compiledRoot = null
            } else {
              runWithClientRuntime(
                appRue,
                () => {
                  appRue.unmount(el)
                },
                el,
              )
            }
          } catch {}
        }
        rollbackAppContainer(reservation)
        throw error
      } finally {
        if (pendingContainerRef === el) pendingContainerRef = null
      }
    },
    /** 从上一次 mount 的容器卸载应用并释放容器引用。 */
    unmount() {
      const mountedContainer = containerRef
      if (mountedContainer) {
        containerRef = null
        try {
          if (compiledRoot) {
            compiledRoot.dispose()
            compiledRoot = null
          } else {
            // 显式传入的自定义 runtime 仍走它自己的挂载协议。
            runWithClientRuntime(
              appRue,
              () => {
                appRue.unmount(mountedContainer)
              },
              mountedContainer,
            )
          }
        } finally {
          releaseAppContainer(mountedContainer, containerOwner)
        }
      }
    },
  }
}
