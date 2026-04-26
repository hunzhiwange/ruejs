# 默认 Block / Vapor 路径迁移

Rue 当前默认的编译与运行时路径已经是 Block / Vapor / Renderable-first。对大多数应用来说，这只是内部实现升级，你仍然写模板或普通 JSX；但如果你维护的是旧的手写渲染 helper、库级桥接层或预编译产物，这一页就是你需要的迁移清单。

## 谁需要关注这次迁移

下面这些场景需要显式检查：

- 你从默认主入口导入过 `_$vaporCreateVNode`
- 你手写过依赖 VNode 内部字段的渲染 helper
- 你分发的是预编译后的组件、指令或运行时桥接代码
- 你在库内部手动拼接 children / slot 对象以模拟旧渲染路径

如果你的应用只是写模板、普通 JSX、`FC` 组件和响应式状态，通常无需改动。

## 需要修改的导入

默认主入口和显式 compat 子路径都已经不再提供这类 helper。历史导入现在属于 breaking removal：

```ts
import { _$vaporCreateVNode } from '@rue-js/runtime'
import { _$vaporCreateVNode as createCompatVNode } from '@rue-js/rue'
import { _$vaporCreateVNode } from '@rue-js/runtime/compat'
import { _$vaporCreateVNode as createCompatVNode } from '@rue-js/rue/compat'
```

以上导入都需要删除，而不是改到新的 compat 路径。

## 推荐迁移方式

### 1. 新代码不要继续扩 VNode-first 边界

新组件优先使用：

- 模板
- 普通 JSX
- `props.children`
- render prop / callback props

如果还存在历史 helper，请在升级时直接改写，不要继续保留 compat 壳层。

### 2. 不要继续依赖 VNode 内部结构

历史文档里仍可能看到 `VNode` 这个词，但默认主入口的公开输入口径已经围绕 RenderableOutput 组织。请不要继续假设所有输出都具备稳定的 `type / props / children / patchFlag` 内部布局。

如果你仍在维护 VNode-like 对象，请把这层桥接改写为默认 Renderable / children / raw node 模式，而不是继续向业务组件透出旧结构。

### 3. 子内容优先建模成 children / render prop

对默认内容，直接传 `children`。

```tsx
<Card>body</Card>
```

对作用域插槽，直接传函数：

```tsx
<List>{item => <span>{item.label}</span>}</List>
```

对具名内容，优先使用显式 props，而不是继续拼 slot 对象：

```tsx
<Layout footer={({ text }) => <small>{text}</small>}>body</Layout>
```

## 库作者还需要检查什么

- 编译器与运行时请保持同一小版本线
- 如果你分发预编译产物，请在 peer 依赖中声明最低运行时版本
- 如果你内部还有历史桥接文件，请在升级时一并改写，而不是继续保留 compat 壳层

## compat 的当前状态

显式 compat 子路径已经删除。迁移方向不是“换一个 compat 导入”，而是直接回到默认路径能力：

- 直接传 `children`
- 直接传 render prop / callback props
- 直接返回 raw node / fragment / mount handle
- 直接使用默认 `render*` 入口

## 迁移后的判断标准

完成迁移后，你的代码应尽量符合下面这些特征：

- 新组件不再从默认主入口期待 compat-only helper
- 业务组件不用感知 VNode 内部字段
- children / render prop / callback props 取代旧的手写 slot 对象桥接
- 历史桥接文件已经完成重写，而不是继续保留 compat 壳层