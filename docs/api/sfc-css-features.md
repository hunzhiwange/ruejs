# SFC CSS 特性 {#sfc-css-features}

## 作用域 CSS {#scoped-css}

当 `<style>` 标签具有 `scoped` 属性时，其 CSS 将仅应用于当前组件的元素。这类似于 Shadow DOM 中的样式封装。它带有一些注意事项，但不需要任何 polyfills。它是通过使用 PostCSS 转换以下内容来实现的：

```tsx
// MyComponent.tsx
import styles from './MyComponent.module.css'

export default function MyComponent() {
  return <div className={styles.example}>hi</div>
}
```

```css
/* MyComponent.module.css */
.example {
  color: red;
}
```

### 子组件根元素 {#child-component-root-elements}

使用 `scoped` 时，父组件的样式不会泄漏到子组件中。但是，子组件的根节点将同时受父组件的作用域 CSS 和子组件的作用域 CSS 影响。这是有意设计的，以便父组件可以为布局目的设置子根元素的样式。

### 深度选择器 {#deep-selectors}

如果您希望 `scoped` 样式中的选择器是"深度的"，即影响子组件，您可以使用全局 CSS 或 CSS-in-JS 解决方案：

```css
/* 全局样式 */
.a .b {
  /* ... */
}
```

:::tip
使用 `v-html` 创建的 DOM 内容不受作用域样式影响，但您仍然可以使用全局样式或 CSS 模块来设置它们的样式。
:::

### 插槽选择器 {#slotted-selectors}

默认情况下，作用域样式不影响由 `<slot/>` 渲染的内容，因为它们被视为由传递它们的父组件拥有。要明确定位插槽内容，请使用 CSS 模块或 CSS-in-JS：

```css
/* CSS 模块 */
.slotted {
  color: red;
}
```

### 全局选择器 {#global-selectors}

如果您希望仅一条规则全局应用，可以使用全局样式表或 CSS-in-JS 解决方案：

```css
/* 全局样式 */
.red {
  color: red;
}
```

### 混合本地和全局样式 {#mixing-local-and-global-styles}

您还可以在同一个组件中包含作用域和非作用域样式：

```tsx
// 导入全局样式
import './global.css'

// 导入 CSS 模块
import styles from './Component.module.css'
```

### 作用域样式技巧 {#scoped-style-tips}

- **作用域样式并不能消除对类的需求**。由于浏览器渲染各种 CSS 选择器的方式，当使用作用域时（即与属性选择器结合时），`p { color: red }` 会慢很多倍。如果您改用类或 id，例如 `.example { color: red }`，那么您实际上就消除了这种性能影响。

- **在递归组件中小心使用后代选择器！** 对于具有选择器 `.a .b` 的 CSS 规则，如果匹配 `.a` 的元素包含递归子组件，则该子组件中的所有 `.b` 都将被规则匹配。

## CSS 模块 {#css-modules}

Rue 支持使用 [CSS Modules](https://github.com/css-modules/css-modules)，它将生成的 CSS 类作为对象暴露给组件，通过 `$style` 键访问：

```tsx
// 使用 CSS 模块
import styles from './MyComponent.module.css'

export default function MyComponent() {
  return <p className={styles.red}>This should be red</p>
}
```

```css
/* MyComponent.module.css */
.red {
  color: red;
}
```

生成的类会被哈希处理以避免冲突，实现将 CSS 仅作用域于当前组件的相同效果。

有关更多详细信息，例如[全局例外](https://github.com/css-modules/css-modules/blob/master/docs/composition.md#exceptions)和[组合](https://github.com/css-modules/css-modules/blob/master/docs/composition.md#composition)，请参阅 [CSS Modules 规范](https://github.com/css-modules/css-modules)。

### 自定义注入名称 {#custom-inject-name}

您可以通过为导入的样式对象使用不同的变量名来自定义注入的类对象的属性键：

```tsx
import classes from './MyComponent.module.css'

export default function MyComponent() {
  return <p className={classes.red}>red</p>
}
```

### 与组合式 API 一起使用 {#usage-with-composition-api} @todo

> **@todo**: `useCssModule()` 尚未实现。

注入的类可以在 `setup()` 和 `<script setup>` 中通过直接导入 CSS 模块来访问：

```tsx
import { useCssModule } from '@rue-js/rue'

// 在 setup() 作用域内...
// 默认，返回 <style module> 的类
const styles = useCssModule()

// 命名，返回 <style module="classes"> 的类
const classes = useCssModule('classes')
```

- **示例**

```tsx
import { useCssModule } from '@rue-js/rue'

const classes = useCssModule()

export default function MyComponent() {
  return <p className={classes.red}>red</p>
}
```

```css
/* MyComponent.module.css */
.red {
  color: red;
}
```

## CSS 中的 `v-bind()` {#v-bind-in-css}

Rue SFC `<style>` 标签支持使用 CSS 变量将 CSS 值链接到动态组件状态：

```tsx
import { useState } from '@rue-js/rue'

export default function MyComponent() {
  const [color, setColor] = useState('red')

  return (
    <>
      <div className="text">hello</div>
      <style>{`
        .text {
          color: ${color};
        }
      `}</style>
    </>
  )
}
```

该语法适用于 [`<script setup>`](./sfc-script-setup)，并支持 JavaScript 表达式（必须包裹在引号中）：

```tsx
import { useState } from '@rue-js/rue'

export default function MyComponent() {
  const [theme, setTheme] = useState({ color: 'red' })

  return (
    <>
      <p>hello</p>
      <style>{`
        p {
          color: ${theme.color};
        }
      `}</style>
    </>
  )
}
```

实际值将被编译为哈希 CSS 自定义属性，因此 CSS 仍然是静态的。如果源值更改，自定义属性将通过内联样式应用于组件的根元素并响应式更新。
