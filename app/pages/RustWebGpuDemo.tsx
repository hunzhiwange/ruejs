import { type FC, useComponent } from '@rue-js/rue'

// const RustWgpuComp = useComponent(async () => {
//   const mod: any = await import('@rue-js/app-rust')
//   return () => mod.makeWgpuElement(360, 240) as any
// })

// const RustWgpuRsComp = useComponent(async () => {
//   const mod: any = await import('@rue-js/app-rust')
//   return () =>
//     typeof mod.makeWgpuRsElement === 'function' ? (
//       mod.makeWgpuRsElement(360, 240) as any
//     ) : (
//       <div className="text-xs text-base-content/70">
//         wgpu.rs 后端未启用（app-rust Cargo 特性 wgpu_rs 关闭）
//       </div>
//     )
// })

const RustWebGpuDemo: FC = () => {
  return (
    <div className="space-y-4">
      {/* <h2 className="text-lg font-semibold">Rust 业务（WebGPU / wgpu.rs）</h2>
      <p className="text-sm text-base-content/70">
        该区域由 Rust 代码生成并调用浏览器 WebGPU API；页面其他部分仍使用 TSX 组件。
      </p>
      <div className="border border-base-300 rounded p-2">
        <RustWgpuComp />
      </div>
      <div className="border border-base-300 rounded p-2">
        <RustWgpuRsComp />
      </div> */}
    </div>
  )
}

export default RustWebGpuDemo
