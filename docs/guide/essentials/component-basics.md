# 组件基础 {#components-basics}

组件允许我们将 UI 拆分为独立且可复用的部分，并可以对每个部分进行独立思考。

应用通常由嵌套的组件树来组织，这与我们嵌套原生 HTML 元素的方式非常相似，但 Rue 实现了自己的组件模型，使我们能够在每个组件中封装自定义内容和逻辑。Rue 也能与原生 Web Components 良好协作。如果你对 Rue 组件与原生 Web Components 之间的关系感到好奇，请[点此阅读更多](/guide/guide/extras/web-components)。

## 定义一个组件 {#defining-a-component}

当使用构建步骤时，我们只支持函数组件 / TSX 风格：

```tsx
import { ref, type FC } from '@rue-js/rue'

const ButtonCounter: FC = () => {
  const count = ref(0)

  return (
    <button
      onClick={() => {
        count.value++
      }}
    >
      你点击了我 {count.value} 次。
    </button>
  )
}

export default ButtonCounter
```

## 使用组件 {#using-a-component}

要使用子组件，我们需要在父组件中导入它。假设我们将计数器组件放在名为 `ButtonCounter.Rue` 的文件中，该组件将作为文件的默认导出暴露出来：

```tsx
import type { FC } from '@rue-js/rue'
import ButtonCounter from './ButtonCounter'

const App: FC = () => (
  <div>
    <h1>这里有一个子组件！</h1>
    <ButtonCounter />
  </div>
)
```

在函数组件中，导入的组件可以直接在 JSX 中渲染。

注意，点击按钮时，每个按钮都维护着各自独立的 `count`。这是因为每次使用组件时，都会创建一个新的**实例**。

在 JSX / TSX 中，推荐使用 `PascalCase` 标签名来区分子组件与原生 HTML 元素。

虽然原生 HTML 标签名不区分大小写，因此我们可以在其中使用区分大小写的标签名，也可以使用 `/>` 来自闭合标签。

## 传递 Props {#passing-props}

如果我们正在构建一个博客，我们可能需要一个表示博客文章的组件。我们希望所有博客文章共享相同的视觉布局，但内容各不相同。只有当你能向组件传递数据时（例如要显示的文章标题和内容），该组件才会真正有用。这正是 props 的用武之地。

Props 是可以在组件上注册的自定义属性。要将标题传递给我们的博客文章组件，我们必须在该组件接受的 props 列表中声明它。

```tsx [BlogPost.tsx]
import type { FC } from '@rue-js/rue'

type BlogPostProps = {
  title: string
}

const BlogPost: FC<BlogPostProps> = props => <h4>{props.title}</h4>

export default BlogPost
```

在函数组件中，props 直接作为 `props` 参数接收。如果这样更易于阅读，也可以对其进行解构或内联类型标注：

```tsx
const BlogPost: FC<{ title: string }> = ({ title }) => <h4>{title}</h4>
```

一个组件可以拥有任意数量的 props，默认情况下任何值都可以传递给任何 prop。

prop 注册完成后，便可以像自定义属性一样向其传递数据：

```html
<BlogPost title="我与 Rue 的旅程" />
<BlogPost title="用 Rue 写博客" />
<BlogPost title="为什么 Rue 如此有趣" />
```

然而，在典型的应用中，父组件中通常会有一个文章数组：

```js
const posts = ref([
  { id: 1, title: '我与 Rue 的旅程' },
  { id: 2, title: '用 Rue 写博客' },
  { id: 3, title: '为什么 Rue 如此有趣' },
])
```

然后使用 `v-for` 为每篇文章渲染一个组件：

```tsx
<BlogPost v-for="post in posts" key={post.id} title={post.title} />
```

以上就是你目前需要了解的 props 知识。阅读完本页并对其内容感到熟悉后，我们建议稍后回来阅读完整的 [Props](/guide/guide/components/props) 指南。

## 监听事件 {#listening-to-events}

在开发 `<BlogPost>` 组件时，某些功能可能需要向父组件传递信息。例如，我们可能决定添加一个无障碍功能，允许放大博客文章的文字，同时保持页面其余部分的默认大小。

在父组件中，我们可以通过添加一个 `postFontSize` ref 来支持此功能：

```js
const posts = ref([
  /* ... */
])

const postFontSize = ref(1)
```

可以在 JSX 中用它来控制所有博客文章的字体大小：

```tsx
<div style={{ fontSize: postFontSize.value + 'em' }}>
  <BlogPost v-for="post in posts" key={post.id} title={post.title} />
</div>
```

现在我们来给 `<BlogPost>` 组件添加一个按钮：

```tsx
<div className="blog-post">
  <h4>{title}</h4>
  <button>放大文字</button>
</div>
```

这个按钮目前什么都做不了——我们希望点击该按钮时，能告知父组件应该放大所有文章的文字。在 Rue 中，推荐把这类子组件到父组件的通知建模成回调 prop，由父组件传入处理函数，子组件在合适的时机调用它：

```tsx [BlogPost.tsx]
import type { FC } from '@rue-js/rue'

type BlogPostProps = {
  title: string
  onEnlargeText?: () => void
}

const BlogPost: FC<BlogPostProps> = props => (
  <div className="blog-post">
    <h4>{props.title}</h4>
    <button onClick={() => props.onEnlargeText?.()}>放大文字</button>
  </div>
)

export default BlogPost
```

这使得子组件向父组件的通信更加明确，并让 TypeScript 能够直接感知回调契约。如果你使用对象形式的组件，`emits` 选项仍然可以记录并可选地[验证事件](/guide/guide/components/events#events-validation)。

<div class="composition-api">

父组件一侧则传递一个回调 prop，而不是监听自定义模板事件：

```tsx
<BlogPost
  title={post.title}
  onEnlargeText={() => {
    postFontSize.value += 0.1
  }}
/>
```

</div>

以上就是你目前需要了解的自定义组件事件。阅读完本页并对其内容感到熟悉后，我们建议稍后回来阅读完整的[自定义事件](/guide/guide/components/events)指南。

## 通过插槽分发内容 {#content-distribution-with-slots}

就像 HTML 元素一样，能够向组件传递内容通常很有用，例如：

```tsx
<AlertBox>发生了一些错误。</AlertBox>
```

渲染结果可能如下所示：

:::danger 这是一个演示用的错误提示
发生了一些错误。
:::

这可以通过 Rue 的特殊 `<Slot>` 元素来实现：

```tsx
<div class="alert-box">
  <strong>这是一个演示用的错误提示</strong>
  <slot />
</div>
```

如上所示，我们使用 `<Slot>` 作为内容放置的占位符——就这样，大功告成！

以上就是你目前需要了解的插槽知识。阅读完本页并对其内容感到熟悉后，我们建议稍后回来阅读完整的[插槽](/guide/guide/components/slots)指南。

## 动态组件 {#dynamic-components}

有时，根据条件在组件之间动态切换会很有用，例如在标签页界面中：

上述功能是通过 Rue 的 `Component` 运行时组件配合 `is` prop 实现的：

```tsx
import { Component, ref, type FC } from '@rue-js/rue'
import HomeTab from './HomeTab'
import PostsTab from './PostsTab'
import ArchiveTab from './ArchiveTab'

const tabs = {
  HomeTab,
  PostsTab,
  ArchiveTab,
}

const App: FC = () => {
  const currentTab = ref<keyof typeof tabs>('HomeTab')

  return <Component is={currentTab.value} registry={{ HomeTab, PostsTab, ArchiveTab }} />
}
```

在上面的示例中，`registry` 是字面量有限 registry，`is` 只能选择其中的静态组件工厂。任意组件函数、全局注册名和动态原生标签不受支持。

当使用 `<Component is={...} />` 在多个组件间切换时，被切换掉的组件将会被卸载。我们可以通过内置的 [`<KeepAlive>` 组件](/guide/guide/built-ins/keep-alive)强制不活跃的组件保持"存活"状态。

当你对刚刚消化的知识感到熟悉之后，请继续阅读指南，深入了解组件的更多内容。
