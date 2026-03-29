import type { FC } from '@rue-js/rue'

const APIIndex: FC = () => (
  <div className="card bg-base-100 border shadow">
    <div className="card-body">
      <h1 className="text-2xl font-semibold mb-4">API 参考</h1>
      <ul className="space-y-2">
        <li>
          <div className="font-mono text-sm">
            useState&lt;T&gt;(initial: T | () =&gt; T): [T, (updater: (prev: T) =&gt; T) | (next: T)
            =&gt; void]
          </div>
          <p className="text-sm text-base-content/70">创建状态，支持工厂函数初始化与函数式更新。</p>
        </li>
        <li>
          <div className="font-mono text-sm">
            useEffect(effect: () =&gt; void | (() =&gt; void), deps?: any[])
          </div>
          <p className="text-sm text-base-content/70">副作用处理，支持依赖数组。</p>
        </li>
        <li>
          <div className="font-mono text-sm">
            createRouter({'{'} history, routes {'}'})
          </div>
          <p className="text-sm text-base-content/70">
            创建路由实例，配合 <code>RouterView</code> 与 <code>RouterLink</code> 使用。
          </p>
        </li>
      </ul>
    </div>
  </div>
)

export default APIIndex
