# Props {#props}

> 本页面假设你已经阅读过[组件基础](/guide/essentials/component-basics)。如果你是组件的新手，请先阅读那部分内容。

## Props 声明 {#props-declaration}

在 Rue 中，Props 通过 TypeScript 接口来声明，这样可以获得更好的类型支持和 IDE 自动补全：

```tsx
import { ref } from '@rue-js/rue'

// 使用 TypeScript 接口声明 props
interface BlogPostProps {
  title: string
  likes?: number
}

function BlogPost(props: BlogPostProps) {
  const { title, likes = 0 } = props

  return (
    <div>
      <h2>{title}</h2>
      <p>Likes: {likes}</p>
    </div>
  )
}
```

也可以使用解构语法来获得更简洁的代码：

```tsx
interface BlogPostProps {
  title: string
  likes?: number
}

function BlogPost({ title, likes = 0 }: BlogPostProps) {
  return (
    <div>
      <h2>{title}</h2>
      <p>Likes: {likes}</p>
    </div>
  )
}
```

### 使用类型别名

你也可以使用类型别名来定义 props：

```tsx
type BlogPostProps = {
  title: string
  likes?: number
}

const BlogPost: FC<BlogPostProps> = ({ title, likes = 0 }) => {
  return (
    <div>
      <h2>{title}</h2>
      <p>Likes: {likes}</p>
    </div>
  )
}
```

这不仅记录了组件的接口，还会在使用组件时提供类型检查。我们将在本节后面讨论更多关于 [prop 验证](#prop-validation) 的细节。

更多详情：[为组件 Props 添加类型](/guide/typescript/props) <sup class="vt-badge ts" />

## Props 传递细节 {#prop-passing-details}

### Props 名称大小写 {#prop-name-casing}

我们使用 camelCase 声明长 prop 名称，因为这可以避免在使用它们作为属性键时需要引号，并且允许我们在模板表达式中直接引用它们，因为它们是有效的 JavaScript 标识符：

```tsx
interface MyComponentProps {
  greetingMessage: string
}

function MyComponent({ greetingMessage }: MyComponentProps) {
  return <span>{greetingMessage}</span>
}
```

在 TSX 中传递 props 时，也使用 camelCase：

```tsx
function Parent() {
  return <MyComponent greetingMessage="hello" />
}
```

我们尽可能使用 [PascalCase 命名组件标签](/guide/components/registration#component-name-casing)，因为它通过区分 Rue 组件和原生元素提高了模板的可读性。

### 静态与动态 Props {#static-vs-dynamic-props}

到目前为止，你已经看到 props 作为静态值传递，例如：

```tsx
<BlogPost title="My journey with Vue" />
```

你也可以使用表达式动态赋值：

```tsx
// 动态赋值变量的值
<BlogPost title={post.title} />

// 动态赋值复杂表达式的值
<BlogPost title={post.title + ' by ' + post.author.name} />
```

### 传递不同类型的值 {#passing-different-value-types}

在上述例子中，我们恰好传递了字符串值，但**任何**类型的值都可以传递给 prop。

#### Number {#number}

```tsx
// 在 TSX 中，直接传递数字
<BlogPost likes={42} />

// 动态赋值变量的值
<BlogPost likes={post.likes} />
```

#### Boolean {#boolean}

```tsx
// 包含没有值的 prop 意味着 true
<BlogPost isPublished />

// 显式传递 false
<BlogPost isPublished={false} />

// 动态赋值变量的值
<BlogPost isPublished={post.isPublished} />
```

#### Array {#array}

```tsx
// 在 TSX 中，直接传递数组
<BlogPost commentIds={[234, 266, 273]} />

// 动态赋值变量的值
<BlogPost commentIds={post.commentIds} />
```

#### Object {#object}

```tsx
// 在 TSX 中，直接传递对象
<BlogPost
  author={{
    name: 'Veronica',
    company: 'Veridian Dynamics'
  }}
/>

// 动态赋值变量的值
<BlogPost author={post.author} />
```

### 使用对象绑定多个属性 {#binding-multiple-properties-using-an-object}

如果你想将一个对象的所有属性作为 props 传递，可以使用展开运算符。例如，给定一个 `post` 对象：

```tsx
const post = {
  id: 1,
  title: 'My Journey with Vue',
}
```

以下模板：

```tsx
<BlogPost {...post} />
```

等价于：

```tsx
<BlogPost id={post.id} title={post.title} />
```

## 单向数据流 {#one-way-data-flow}

所有 props 都形成子属性与父属性之间的**单向向下绑定**：当父属性更新时，它会向下流到子组件，但不会反过来。这防止了子组件意外改变父组件的状态，这可能会使你的应用的数据流更难理解。

此外，每次父组件更新时，子组件中的所有 props 都会刷新为最新值。这意味着你**不应该**尝试在子组件内部改变 prop：

```tsx
interface MyComponentProps {
  foo: string
}

function MyComponent(props: MyComponentProps) {
  // ❌ 警告，props 是只读的！
  props.foo = 'bar'
}
```

通常有两种情况会诱使你改变 prop：

1. **prop 用于传递初始值；子组件希望之后将其用作本地数据属性。** 在这种情况下，最好定义一个使用 prop 作为初始值的本地数据属性：

   ```tsx
   import { ref } from '@rue-js/rue'

   interface CounterProps {
     initialCounter: number
   }

   function Counter({ initialCounter }: CounterProps) {
     // counter 只使用 props.initialCounter 作为初始值；
     // 它与未来的 prop 更新断开连接。
     const counter = ref(initialCounter)

     return <button onClick={() => counter.value++}>{counter.value}</button>
   }
   ```

2. **prop 作为需要转换的原始值传递。** 在这种情况下，最好使用 prop 的值定义一个计算属性：

   ```tsx
   import { computed } from '@rue-js/rue'

   interface SizeProps {
     size: string
   }

   function MyComponent({ size }: SizeProps) {
     // 计算属性在 prop 变化时自动更新
     const normalizedSize = computed(() => size.trim().toLowerCase())

     return <div>{normalizedSize.value}</div>
   }
   ```

### 改变 Object / Array Props {#mutating-object-array-props}

当对象和数组作为 props 传递时，虽然子组件不能改变 prop 绑定，但它**可以**改变对象或数组的嵌套属性。这是因为 JavaScript 中的对象和数组是通过引用传递的，Vue 阻止这种改变是不合理的。

这种改变的主要缺点是它允许子组件以一种对父组件不明显的方式影响父组件状态，可能使未来的数据流更难推理。作为最佳实践，你应该避免这种改变，除非父组件和子组件在设计上是紧密耦合的。在大多数情况下，子组件应该 [触发事件](/guide/components/events) 让父组件执行改变。

## Prop 验证 {#prop-validation}

在 Rue 中，prop 验证通过 TypeScript 类型系统来实现。这提供了编译时的类型检查：

```tsx
interface MyComponentProps {
  // 基本类型检查
  propA: number
  // 多个可能的类型（使用联合类型）
  propB: string | number
  // 必需字符串
  propC: string
  // 必需但可为 null 的字符串
  propD: string | null
  // 带有默认值的 number
  propE?: number // 默认在解构时处理
  // 带有默认值的对象
  propF?: { message: string }
  // 自定义验证可以在运行时进行
  propG: 'success' | 'warning' | 'danger'
  // 函数类型
  propH?: () => string
}

function MyComponent({
  propA,
  propB,
  propC,
  propD,
  propE = 100,
  propF = { message: 'hello' },
  propG,
  propH = () => 'Default function',
}: MyComponentProps) {
  // 组件逻辑
}
```

额外细节：

- 所有 props 默认都是可选的，除非在接口中没有标记为可选（没有 `?`）。

- 可选 prop 如果未传递，将具有 `undefined` 值。

- `Boolean` 类型的可选 prop 默认为 `false`，可以通过设置默认值来改变这一点。

- 如果指定了 `default` 值，它将在解析的 prop 值为 `undefined` 时使用——这包括 prop 不存在或显式传递了 `undefined` 值的情况。

### 运行时类型检查 {#runtime-type-checks}

如果需要运行时验证，可以在组件内部手动实现：

```tsx
interface MyComponentProps {
  status: 'success' | 'warning' | 'danger'
  count: number
}

function MyComponent(props: MyComponentProps) {
  // 运行时验证
  if (!['success', 'warning', 'danger'].includes(props.status)) {
    console.warn('Invalid status prop:', props.status)
  }

  if (typeof props.count !== 'number') {
    console.warn('count prop must be a number')
  }

  // ...
}
```

### 使用类作为类型 {#using-class-types}

你也可以使用自定义类作为 prop 类型：

```tsx
class Person {
  constructor(
    public firstName: string,
    public lastName: string,
  ) {}
}

interface MyComponentProps {
  author: Person
}

function MyComponent({ author }: MyComponentProps) {
  return (
    <div>
      {author.firstName} {author.lastName}
    </div>
  )
}
```

### 可为 null 的类型 {#nullable-type}

如果类型是必需的但可为 null，可以使用联合类型：

```tsx
interface MyComponentProps {
  id: string | null
}

function MyComponent({ id }: MyComponentProps) {
  // id 是 string | null 类型
}
```

注意，如果类型只是 `null` 而不使用联合类型，它将允许任何类型。

## Boolean 转换 {#boolean-casting}

在 TSX 中，Boolean 类型的 props 有特殊的行为：

```tsx
interface MyComponentProps {
  disabled?: boolean
}

function MyComponent({ disabled = false }: MyComponentProps) {
  return <button disabled={disabled}>Click Me</button>
}
```

组件可以这样使用：

```tsx
// 相当于传递 disabled={true}
<MyComponent disabled />

// 相当于传递 disabled={false}
<MyComponent />
```
