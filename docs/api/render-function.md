# 编译渲染边界 {#render-function-apis}

Rue 不提供通用的手写建树 API。应用中的 JSX / TSX 必须先经过 Rue 编译器，再交给运行时挂载。编译器会根据源码结构生成窄 DOM、组件和动态挂载操作；这些生成的 helper 不是应用 API。

## 编译要求 {#compiler-requirement}

TypeScript 只负责类型检查并保留 JSX：

```json
{
  "compilerOptions": {
    "jsx": "preserve"
  }
}
```

Vite 项目必须在转换链中启用 Rue 插件：

```ts
import { defineConfig } from 'vite'
import rue from '@rue-js/vite-plugin-rue'

export default defineConfig({
  plugins: [rue()],
})
```

如果转换结束后仍有 JSX AST，构建会报告包含文件与语法位置的错误。由 TypeScript 或其他工具直接降低 JSX 的 automatic 模式不属于受支持的执行路径。

## 静态和组件输出 {#creating-render-output}

使用 TSX 描述原生节点和已知组件：

```tsx
import type { FC } from '@rue-js/rue'
import UserCard from './UserCard'

const Profile: FC<{ name: string }> = props => (
  <section className="profile">
    <h2>{props.name}</h2>
    <UserCard name={props.name} />
  </section>
)
```

组件 children 通过 `props.children` 接收；具名内容和 render prop 应建模为显式 props。

## 动态组件 {#dynamic-components}

组件身份必须来自调用点可枚举的有限集合，使用 `<Component>` 的字面量 `registry`：

```tsx
import { Component, type FC } from '@rue-js/rue'

const Card: FC<{ title: string }> = props => <article>{props.title}</article>
const Notice: FC<{ title: string }> = props => <aside>{props.title}</aside>

const DynamicSurface: FC<{ kind: 'card' | 'notice'; title: string }> = props => (
  <Component is={props.kind} registry={{ card: Card, notice: Notice }} title={props.title} />
)
```

不支持任意函数值、全局字符串组件注册表或没有字面量 `registry` 的动态组件。普通静态元素和已知组件应直接写成 TSX。

## 命令式挂载 {#imperative-mount}

需要挂载到既有容器时，使用静态根组件创建应用：

```tsx
import { useApp } from '@rue-js/rue'
import App from './App'

useApp(App).mount('#app')
```

Rue 不公开接受任意 JSX 值的 `render()`；根组件同样必须经过 Rue 编译器。

另请参阅：[编译 JSX 与动态渲染](/guide/guide/extras/render-function)和[渲染机制](/guide/guide/extras/rendering-mechanism)。
