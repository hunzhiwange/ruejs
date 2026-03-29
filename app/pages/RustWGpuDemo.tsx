import { type FC, useEffect } from '@rue-js/rue'

const RustWebGpuDemo: FC = () => {
  // useEffect(() => {
  //   let canceled = false
  //     ; (async () => {
  //       try {
  //         const mod = await import('@rue-js/learn-wgpu')
  //         if (!canceled) {
  //           try {
  //             await mod.vertexAnimation()
  //           } catch (e) {
  //             console.error('加载 tutorial1 模块失败：', e)
  //           }
  //           try {
  //             await mod.rueDesign()
  //           } catch (e) {
  //             console.error('加载 rueDesign 模块失败：', e)
  //           }
  //           try {
  //             await mod.solarSystem()
  //           } catch (e) {
  //             console.error('加载 solarSystem 模块失败：', e)
  //           }
  //           try {
  //             await mod.ruedes()
  //           } catch (e) {
  //             console.error('加载 ruedes 模块失败：', e)
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
    #wgpu-app-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
    }
  `}
      </style>

      <div className="space-y-4">
        {/* <h2 className="text-lg font-semibold">Rust 业务（WebGPU / wgpu.rs）</h2>
        <p className="text-sm text-base-content/70">
          该区域由 Rust WASM 代码生成并调用浏览器 WebGPU API；页面其他部分仍使用 TSX 组件。
        </p>
        <div className="border border-base-300 rounded p-2">
          <div id="wgpu-app-container">
            <div style={{ width: '30vw', height: '30vw', minWidth: '375px', minHeight: '375px' }}>
              <div id="ruedes-wasm-app-container" />
            </div>
            <div style={{ width: '30vw', height: '30vw', minWidth: '375px', minHeight: '375px' }}>
              <div id="vertex-animation-wasm-app-container"></div>
            </div>
            <div style={{ width: '30vw', height: '30vw', minWidth: '375px', minHeight: '375px' }}>
              <div id="@rue-js/design-wasm-app-container" />
            </div>
            <div style={{ width: '30vw', height: '30vw', minWidth: '375px', minHeight: '375px' }}>
              <div id="solar-system-wasm-app-container" />
            </div>
          </div>
        </div> */}
      </div>
    </>
  )
}

export default RustWebGpuDemo
