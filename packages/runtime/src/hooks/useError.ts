/*
错误处理 Hook 概述
- 能力目标：统一错误捕获与呈现（控制台 + 页面覆盖层），并提供主动触发接口。
- console：将错误堆栈以美化样式输出到控制台，突出显示标题与堆栈信息。
- overlay：在页面上显示可关闭的错误覆盖层（遮罩 + 对话框），开发阶段便于快速定位。
- emit：主动调用 Rue 框架的 handleError，支持传入实例上下文以便精确定位。
*/
import rue, { onError } from '../rue'
import { setInnerHTML } from '../dom'

/** 安装错误处理能力
 * @param opts overlay/console 开关
 * @returns 组合 API：on/emit/installConsole/installOverlay
 */
export function useError(opts?: { overlay?: boolean; console?: boolean }) {
  /** 安装控制台输出处理 */
  const installConsole = () => {
    onError((error: any) => {
      try {
        // 尝试读取错误堆栈；若不存在则为 ''
        const stack = (error && (error as any).stack) || ''
        ;(console as any).error?.(
          '%cRue Error - The Wasm Framework For Vapor Native DOM%c\n' + stack,
          // 标题样式：渐变背景 + 白色文字，以便在控制台中醒目显示
          'background:linear-gradient(to right, oklch(0.541 0.281 293.009) 0%, oklch(0.667 0.295 322.15) 50%, oklch(0.656 0.241 354.308) 100%);color:#fff;padding:5px 8px;font-size:15px;border-radius:5px;font-weight:900;letter-spacing:.02em;margin-bottom:0.5em',
          // 副标题样式：红色，强调错误性质
          'color:red;padding:3px 5px',
        )
      } catch {}
    })
  }

  /** 安装页面覆盖层处理 */
  const installOverlay = () => {
    onError((error: any) => {
      // 提取错误消息：优先使用 error.message，否则字符串化错误对象
      const message = (error && (error as any).message) || String(error)
      const id = 'rue-error-overlay'
      let root = document.getElementById(id)
      if (!root) {
        // 懒创建覆盖层根节点，挂载到 body
        root = document.createElement('div')
        root.id = id
        document.body.appendChild(root)
      }
      // 写入覆盖层结构（遮罩 + 对话框），内容含错误文案与关闭按钮
      setInnerHTML(
        root as any,
        `
        <div id="rue-error-backdrop" class="fixed inset-0 z-50 bg-black/50 flex items-center justifycenter p-4">
          <div id="rue-error-dialog" class="w-full max-w-md rounded-md overflow-hidden bg-gray-900 text-gray-100">
            <div id="rue-error-header" class="flex items-center justify-between px-3 py-2 border-b border-gray-700 text-white" style="background:linear-gradient(to right, oklch(0.541 0.281 293.009) 0%, oklch(0.667 0.295 322.15) 50%, oklch(0.656 0.241 354.308) 100%)">
              <span class="text-sm font-bold">Rue Error</span>
              <button id="rue-error-close" aria-label="close" class="text-xs font-medium cursor-pointer hover:opacity-80">close</button>
            </div>
            <div class="p-4 text-sm leading-relaxed">
              ${message}
            </div>
          </div>
        </div>
      `,
      )
      // 绑定关闭行为：点击后移除覆盖层
      const close = root.querySelector('#rue-error-close') as HTMLButtonElement | null
      if (close)
        close.onclick = e => {
          e.preventDefault()
          if (root) root.remove()
        }
    })
  }

  /** 主动触发错误处理 */
  const emit = (error: any, instance?: any) => {
    // 委托给 Rue 的统一错误处理逻辑；instance 可用于关联组件上下文
    ;(rue as any).handleError(error, instance ?? null)
  }

  if (opts?.console) installConsole()
  if (opts?.overlay) installOverlay()

  return { on: onError, emit, installConsole, installOverlay }
}
