/*
异步组件 Hook 概述
- 使用动机：以最小成本接入动态导入与按需加载，同时保证渲染区间的稳定与错误兜底。
- 缓存策略：以 loader 函数为 key 建立 WeakMap 缓存，避免重复请求与状态重建。
- 状态管理：signal 存储目标组件与错误；watchEffect 驱动锚点区间的更新。
- 占位渲染：提供可覆盖的 Loading 与 Error 组件，满足不同产品形态的占位需求。
- 固定渲染：使用 vapor + render，会多一层 div。
*/
import rue, { FC, h, vapor, render } from '../rue'
import { createElement } from '../dom'
import { signal, watchEffect } from '../reactivity'
import { useSetup } from '@rue-js/runtime-vapor'

const asyncComponentCache = new WeakMap<Function, any>()

/** 异步组件加载 Hook
 * @param loader 返回组件或 { default } 的动态导入函数
 * @param opts 可选占位组件：loading / error
 * @returns 异步组件 FC
 */
export function useComponent<P = {}>(
  loader: () => Promise<{ default: FC<P> } | FC<P>>,
  opts?: { loading?: FC<any>; error?: FC<{ error: any }> },
): FC<P> {
  return (props: any) => {
    const appRue = rue as any
    let slot = asyncComponentCache.get(loader as any)
    if (!slot) {
      // 初始化状态槽位：目标组件与错误各自为独立信号
      const component = signal<FC<P> | null>(null, {}, true)
      const err = signal<any>(null, {}, true)
      /** 启动加载流程 */
      const start = () => {
        try {
          // 执行动态导入：兼容两种返回格式（模块对象或组件函数）
          loader()
            .then((m: any) => {
              component.set(m && (m as any).default ? ((m as any).default as FC<P>) : (m as FC<P>))
            })
            .catch((e: any) => {
              // 捕获错误并派发到框架统一错误处理
              err.set(e)
              appRue.handleError(e, null)
            })
        } catch (e: any) {
          // 同步错误（如 loader 内部抛错）
          err.set(e)
          appRue.handleError(e, null)
        }
      }

      /** 加载占位组件 */
      const Loading: FC<any> = opts?.loading ?? (() => h('div', {}, ''))

      /** 错误占位组件 */
      const ErrorComp: FC<any> =
        opts?.error ??
        ((p: any) => {
          // 提取错误消息：优先 message 字段；其次字符串化；兜底 'Error'
          const err = p && p.error
          const msg = err && err.message ? err.message : typeof err === 'string' ? err : 'Error'
          return h('div', null, msg)
        })
      // 缓存槽位，避免重复初始化
      slot = {
        component,
        err,
        start,
        Loading,
        ErrorComp,
        started: false,
      }
      asyncComponentCache.set(loader as any, slot)
    }

    const { component, err, start, Loading, ErrorComp } = slot as any

    if (!(slot as any).started) {
      ;(slot as any).started = true
      start()
    }

    // 为每个 Hook 实例创建独立的容器与 props 信号，
    // 同一 loader 下仅共享“加载状态”，但不共享渲染容器与副作用。
    const ctx = useSetup(() => {
      const container = createElement('div')
      const propsSig = signal<any>(null, {}, true)

      watchEffect(() => {
        const curProps = propsSig.get()
        if (curProps == null) return

        // 根据当前状态选择渲染内容：
        // - 有错误：渲染 ErrorComp 并展示错误信息
        // - 有组件：渲染目标异步组件
        // - 尚未就绪：渲染 Loading 占位
        let vnodeLike: any
        const e = err.get()
        if (e) {
          vnodeLike = h(ErrorComp, { error: e })
        } else {
          const comp = component.get()
          vnodeLike = comp ? h(comp as FC<P>, curProps) : h(Loading, {})
        }
        render(vnodeLike as any, container)
      })

      return { container, propsSig }
    })
    return vapor(() => {
      // 将 props 写入信号以驱动渲染，并把容器作为 vaporElement 暴露给 Vapor 渲染管线
      ctx.propsSig.set(props)
      return { vaporElement: ctx.container as any }
    })
  }
}
