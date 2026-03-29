import type { FC } from '@rue-js/rue'
import { RouterLink } from '@rue-js/router'

const PluginsIndex: FC = () => (
  <>
    <h1 className="text-2xl font-semibold mb-4">插件</h1>
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card bg-base-100 border shadow">
        <div className="card-body">
          <h2 className="text-lg font-semibold">用 AI 自动生成插件</h2>
          <p className="text-base-content/70 mt-2">
            通过 AI 描述你的需求，自动生成 Rue 插件的骨架与核心逻辑，然后按需补充测试与文档。
            这种方式适合快速试验新能力、搭建内部工具或为团队定制公共能力。
          </p>
          <div className="mt-4 flex gap-3">
            <RouterLink to="/guide/guide/reusability/plugins" className="btn btn-primary btn-sm">
              插件基础
            </RouterLink>
            <RouterLink to="/guide/api/application#app-use" className="btn btn-outline btn-sm">
              app.use 参考
            </RouterLink>
          </div>
          <ul className="mt-4 text-sm space-y-2 list-disc pl-5">
            <li>约定 install 方法，接收应用实例与可选参数</li>
            <li>按需注册全局组件 / 指令或注入资源</li>
            <li>提供清晰的 README 与迁移说明，便于复用</li>
          </ul>
        </div>
      </div>

      <div className="card bg-base-100 border shadow">
        <div className="card-body">
          <h2 className="text-lg font-semibold">从 Vue / React 移植插件</h2>
          <p className="text-base-content/70 mt-2">
            你可以将已有的 Vue / React 插件迁移到
            Rue。大多数场景仅需调整安装入口与生命周期调用，保持原有功能与 API 设计不变。
          </p>
          <div className="mt-4 flex gap-3">
            <RouterLink
              to="/guide/guide/reusability/plugins#writing-a-plugin"
              className="btn btn-primary btn-sm"
            >
              编写插件
            </RouterLink>
            <RouterLink to="/page/routing" className="btn btn-outline btn-sm">
              路由与页面
            </RouterLink>
          </div>
          <ul className="mt-4 text-sm space-y-2 list-disc pl-5">
            <li>
              将 Vue 插件的 <code>install</code> 转换为 Rue 插件入口
            </li>
            <li>React 的 Context / Hook 能力映射到 Rue 的状态与副作用</li>
            <li>保持对外 API 不变，内部实现适配 Rue 运行时</li>
          </ul>
        </div>
      </div>
    </div>

    <div className="mt-8 card bg-base-100 border">
      <div className="card-body">
        <h3 className="text-base font-semibold">参考与下一步</h3>
        <ul className="mt-2 text-sm space-y-2 list-disc pl-5">
          <li>
            <RouterLink to="/guide/guide/scaling-up/tooling" className="link">
              工具链
            </RouterLink>
            ：使用 Vite 与 Rue 插件提升开发效率
          </li>
          <li>
            <RouterLink to="/guide/guide/testing" className="link">
              测试
            </RouterLink>
            ：用 Vitest 为插件编写单元与集成测试
          </li>
          <li>
            <RouterLink to="/guide/guide/best-practices/performance" className="link">
              性能优化
            </RouterLink>
            ：在真实场景中评估与优化插件
          </li>
        </ul>
      </div>
    </div>
  </>
)

export default PluginsIndex
