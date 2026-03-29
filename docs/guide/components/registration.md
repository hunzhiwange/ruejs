# 组件注册 {#component-registration}

> 本页面假设你已经阅读过[组件基础](/guide/essentials/component-basics)。如果你是组件的新手，请先阅读那部分内容。

Rue 组件需要被"注册"以便 Rue 知道在模板中遇到它们时去哪里找到其实现。组件注册有两种方式：全局注册和局部注册。

## 全局注册 {#global-registration}

我们可以使用 `app.component()` 方法使组件在当前 [Rue 应用](/guide/essentials/application) 中全局可用：

```tsx
import { createApp } from 'rue-js'

const app = createApp({})

app.component(
  // 注册名称
  'MyComponent',
  // 实现
  MyComponent,
)
```

如果使用的是 TSX 文件，你会注册导入的组件：

```tsx
import { MyComponent } from './MyComponent'

app.component('MyComponent', MyComponent)
```

`.component()` 方法可以链式调用：

```tsx
app
  .component('ComponentA', ComponentA)
  .component('ComponentB', ComponentB)
  .component('ComponentC', ComponentC)
```

全局注册的组件可以在应用内任何组件的模板中使用：

```tsx
// 这会在应用内任何组件中生效
<ComponentA />
<ComponentB />
<ComponentC />
```

这甚至适用于所有子组件，这意味着这三个组件在彼此内部也是可用的。

## 局部注册 {#local-registration}

虽然全局注册很方便，但也有一些缺点：

1. 全局注册会阻止构建系统移除未使用的组件（即"tree-shaking"）。如果你全局注册了一个组件但最终在应用中任何地方都没有使用它，它仍会被包含在最终的包中。

2. 全局注册在大型应用中会使依赖关系不那么明确。这使得很难从使用子组件的父组件中找到子组件的实现。这会影响长期可维护性，类似于使用过多的全局变量。

局部注册将注册组件的可用范围限制在当前组件内。它使依赖关系更加明确，并且更有利于 tree-shaking。

在 Rue 中，组件是以函数形式定义的，直接在父组件中导入和使用即可，无需显式注册：

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

局部注册的组件**不会**在后代组件中自动可用。在这种情况下，`ComponentA` 只对当前组件可用，对它的子组件或后代组件不可用。

## 组件名称大小写 {#component-name-casing}

在本指南中，我们在注册组件时使用 PascalCase 命名。这是因为：

1. PascalCase 名称是有效的 JavaScript 标识符。这使得在 JavaScript 中导入和注册组件更容易。它还有助于 IDE 进行自动补全。

2. `<PascalCase />` 在模板中更明显地表示这是一个 Rue 组件而不是原生 HTML 元素。它还能将 Rue 组件与自定义元素（Web Components）区分开来。

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
