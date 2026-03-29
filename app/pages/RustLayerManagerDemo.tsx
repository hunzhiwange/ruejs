import { type FC, useComponent } from 'rue-js'

// const RustLayerManagerComp = useComponent(async () => {
//   const mod: any = await import('@rue-js/app-rust')
//   return () => mod.makeLayerManagerElement(1200, 1200) as any
// })

const RustLayerManagerDemo: FC = () => {
  return (
    <div className="min-h-screen text-base-content">
      {/* <div className="h-12 px-4 flex items-center justify-between border-b border-base-300/20">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">原型设计 · 图层管理器</span>
          <span className="text-xs opacity-60">演示</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-xs">分享</button>
          <button className="btn btn-primary btn-xs">发布</button>
        </div>
      </div>
      <div className="p-4">
        <div className="rounded-xl border border-base-300/30 bg-base-100/5 backdrop-blur">
          <RustLayerManagerComp />
        </div>
      </div> */}
    </div>
  )
}

export default RustLayerManagerDemo
