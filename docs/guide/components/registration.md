# 组件注册 {#component-registration}

> 本页面假设你已经阅读过[组件基础](/guide/guide/essentials/component-basics)。如果你是组件的新手，请先阅读那部分内容。

在 JSX / TSX 中，Rue 组件通过普通的 ES 模块导入来使用。compiler-only 模式不提供运行时全局组件名称表。

## 全局注册 {#global-registration}

旧版 `app.component` 全局注册不受支持。有限动态选择应在调用点声明字面量 registry：

```tsx
import { Component } from '@rue-js/rue'
import { Card, Notice } from './surfaces'

;<Component is={kind.value} registry={{ card: Card, notice: Notice }} />
```

registry 的键集合和组件工厂都必须能在编译期静态证明。任意字符串名称、运行时函数值和未导入的 JSX 标签会导致构建失败。

## 局部注册 {#local-registration}

虽然运行时名称注册很方便，但也有一些缺点：

1. 全局注册会阻止构建系统移除未使用的组件（即"tree-shaking"）。如果你全局注册了一个组件但最终在应用中任何地方都没有使用它，它仍会被包含在最终的包中。

2. 全局注册在大型应用中会使依赖关系不那么明确。这使得很难从使用子组件的父组件中找到子组件的实现。这会影响长期可维护性，类似于使用过多的全局变量。

在 Rue 中，组件是以函数形式定义的，直接在父组件中导入和使用即可。普通导入使依赖关系更加明确，并且更有利于 tree-shaking：

```tsx
import { ComponentA } from './ComponentA'

function ParentComponent() {
  return (
    <div>
      <ComponentA />
    </div>
  )
}
```

导入的组件只在当前模块作用域内可用。在这种情况下，`ComponentA` 只对当前文件可用，对没有导入它的其他组件不可用。

## 组件名称大小写 {#component-name-casing}

在本指南中，我们在注册组件时使用 PascalCase 命名。这是因为：

1. PascalCase 名称是有效的 JavaScript 标识符。这使得在 JavaScript 中导入和注册组件更容易。它还有助于 IDE 进行自动补全。

2. `<PascalCase />` 在 JSX / TSX 中更明显地表示这是一个 Rue 组件而不是原生 HTML 元素。它还能将 Rue 组件与自定义元素（Web Components）区分开来。

这是在使用 TSX 时的推荐风格。在 JSX/TSX 中，组件必须使用 PascalCase 命名。

```tsx
// 在 TSX 中，组件名必须使用 PascalCase
function MyComponent() {
  return <div>Hello</div>
}

// 使用组件
function Parent() {
  return <MyComponent />
}
```
