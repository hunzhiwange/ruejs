import type { FC } from 'rue-js'
import { RouterLink } from '@rue-js/router'

const DocSidebar: FC = () => (
  <aside className="md:w-64 shrink-0">
    <div className="sticky top-20">
      <div className="text-xs font-semibold text-base-content/60 mb-2">文档</div>
      <ul className="menu menu-sm bg-base-100 rounded-box">
        <li>
          <RouterLink to="/page/intro" className="justify-start">
            介绍
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/page/installation" className="justify-start">
            安装
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/page/getting-started" className="justify-start">
            快速上手
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/page/routing" className="justify-start">
            路由
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/page/state" className="justify-start">
            状态与响应式
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/page/jsx" className="justify-start">
            JSX
          </RouterLink>
        </li>
        <li>
          <RouterLink to="/page/vapor" className="justify-start">
            Vapor 渲染
          </RouterLink>
        </li>
      </ul>
    </div>
  </aside>
)

const DocsIndex: FC = () => (
  <>
    <div className="md:flex md:items-start md:gap-6">
      <DocSidebar />
      <div className="card bg-base-100 border shadow flex-1">
        <div className="card-body">
          <h1 className="text-2xl font-semibold mb-4">Rue 文档</h1>
          <p className="text-base-content/70 mb-6">
            本章节介绍 Rue 的核心概念与用法，参考 VitePress 文档结构。左侧为目录，右侧为内容区。
          </p>
          <h2 id="getting-started" className="text-xl font-semibold mt-6 mb-3">
            快速上手
          </h2>
          <pre className="bg-base-200 rounded-box p-4 text-sm overflow-auto">
            <code>{`pnpm add rue @rue-js/router
import { mount, FC } from 'rue-js';
import { createRouter, createWebHashHistory } from '@rue-js/router';

// 创建路由与挂载
`}</code>
          </pre>
          <h2 id="routing" className="text-xl font-semibold mt-6 mb-3">
            路由与页面
          </h2>
          <p className="text-base-content/70">
            使用 <code className="bg-base-200 px-1 rounded">@rue-js/router</code>{' '}
            创建路由；每个页面为一个 JSX 组件。
          </p>
        </div>
      </div>
      <aside className="md:w-64 shrink-0">
        <div className="sticky top-20">
          <div className="card bg-base-100 border p-3 text-sm">
            <div className="text-xs font-semibold text-base-content/60 mb-2">本页大纲</div>
            <ul className="menu menu-sm bg-base-100 rounded-box">
              <li>
                <a href="#getting-started" className="justify-start">
                  快速上手
                </a>
              </li>
              <li>
                <a href="#routing" className="justify-start">
                  路由与页面
                </a>
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  </>
)

export default DocsIndex
