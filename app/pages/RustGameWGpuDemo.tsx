import { type FC, useEffect } from 'rue-js'

const RustWebGpuDemo: FC = () => {
  // useEffect(() => {
  //   let canceled = false
  //     ; (async () => {
  //       try {
  //         const mod = await import('@rue-js/learn-wgpu')
  //         if (!canceled) {
  //           try {
  //             await mod.tutorial1()
  //           } catch (e) {
  //             console.error('加载 vertexAnimation 模块失败：', e)
  //           }
  //         }
  //       } catch (e) {
  //         console.error('加载模块失败：', e)
  //       }
  //     })()
  //   return () => {
  //     canceled = true
  //   }
  // }, [])

  return (
    <>
      <style>
        {`
    canvas {
        display: block;
        width: 100%;
        height: 100%;
        background-color: #454545;
    }
  `}
      </style>

      <div className="space-y-4">
        {/* <h2 className="text-lg font-semibold">Rust 业务（WebGPU / wgpu.rs）</h2>
        <p className="text-sm text-base-content/70">
          该区域由 Rust WASM 代码生成并调用浏览器 WebGPU API；页面其他部分仍使用 TSX 组件。
        </p>
        <div className="border border-base-300 rounded p-2">
          <div style={{ width: '900px', height: '900px', minWidth: '375px', minHeight: '375px' }}>
            <div id="tutorial1-window-wasm-app-container" />
          </div>
        </div> */}
      </div>
    </>
  )
}

export default RustWebGpuDemo
