# 组件实例 {#component-instance}

Rue 当前的组件模型以 JSX / TSX 函数组件为主。公共 API 中出现的"组件实例"通常指可被渲染器消费的组件函数类型，而不是一个可随意读写的公开代理对象。

## ComponentInstance {#componentinstance}

- **类型**

  ```ts
  type FC<P = {}> = (props: PropsWithChildren<P>) => RenderableOutput
  type ComponentInstance<P = {}> = FC<P>
  ```

- **详情**

  `ComponentInstance` 是 Rue 对静态组件入口的类型别名。它可用于 `useApp()` 的根组件和 `<Component>` 字面量 registry 的值。

  组件通过 props 接收外部输入，并返回可渲染内容。状态、生命周期和上下文能力应通过 `ref()`、`useState()`、`onMounted()`、`createContext()` 等组合式 API 表达，而不是依赖公开实例对象上的可变字段。

  如果你需要从父组件命令式访问 DOM 或子组件暴露的能力，优先使用 `useRef()` 保存元素或组件引用；如果需要跨层级共享状态，优先使用 Context API。

- **示例**

  ```tsx
  import { type ComponentInstance, useApp } from '@rue-js/rue'

  type GreetingProps = {
    name: string
  }

  const Greeting: ComponentInstance<GreetingProps> = props => {
    return <p>Hello {props.name}</p>
  }

  const App: ComponentInstance = () => {
    return <Greeting name="Rue" />
  }

  useApp(App).mount('#app')
  ```

## getCurrentInstance() {#getcurrentinstance}

返回当前同步组件上下文中的内部 hook host。

- **类型**

  ```ts
  type HookHost =
    | (Record<string, any> & {
        __hooks?: {
          states: any[]
          index: number
          __forcedIndex?: number
        }
      })
    | null
    | undefined

  function getCurrentInstance(): HookHost
  ```

- **详情**

  `getCurrentInstance()` 主要服务于运行时、编译产物和少量高级调试场景。它只在组件同步执行、生命周期注册或运行时设置了当前实例的阶段有意义；跨过异步边界后，当前实例可能已经被清空。

  应用代码通常不需要直接读取这个对象。若目标是组件通信，请优先使用 props、事件、Context 或模板 ref；若目标是清理副作用，请使用 `onScopeDispose()`、`onUnmounted()` 或 watcher 自带的清理回调。

- **示例**

  ```tsx
  import { getCurrentInstance, onMounted } from '@rue-js/rue'

  export const DebugCurrentInstance = () => {
    const instance = getCurrentInstance()

    onMounted(() => {
      console.debug('mounted with instance', instance)
    })

    return <div>Debug current instance</div>
  }
  ```

- **另请参阅**
  - [组合式 API：生命周期钩子](/api/api/composition-api-lifecycle)
  - [组合式 API：辅助函数](/api/api/composition-api-helpers)
  - [Context API](/api/api/composition-api-dependency-injection)
