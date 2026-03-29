import { type FC, useComponent } from 'rue-js'

// const RustCanvasComp = useComponent(async () => {
//   const mod = await import('@rue-js/app-rust')
//   return () => mod.makeVectorElement(360, 240) as any
// })

const RustCanvasDemo: FC = () => {
  return (
    <div className="space-y-4">
      {/* <h2 className="text-lg font-semibold">Rust 业务（Canvas 矢量绘制）</h2>
      <p className="text-sm text-base-content/70">
        该区域由 Rust 代码生成并绘制，页面其他部分仍使用 TSX 组件。
      </p>
      <div className="border border-base-300 rounded p-2">
        <RustCanvasComp />
      </div> */}
    </div>
  )
}

export default RustCanvasDemo
