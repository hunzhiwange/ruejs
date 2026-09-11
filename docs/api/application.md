# 应用 API {#application-api}

## useApp() {#useapp}

创建一个应用实例。

Rue 当前公开的应用创建入口是 `useApp()`。

- **类型**

  ```ts
  function useApp(App: ComponentInstance, runtime?: Rue): App
  ```

- **详情**

  第一个参数必须是经过 Rue 编译器处理的静态根组件。第二个参数可选，用于传入自定义 Rue 运行时实例。

  `useApp()` 返回的应用实例目前提供以下方法：
  - `app.use()`：安装插件
  - `app.mount()`：挂载应用
  - `app.unmount()`：卸载应用

- **示例**

  使用导入的根组件：

  ```tsx
  import { useApp } from '@rue-js/rue'
  import App from './App'

  const app = useApp(App)
  ```

  使用内联根组件：

  ```tsx
  import { type FC, useApp } from '@rue-js/rue'

  const App: FC = () => {
    return <div>Hello Rue</div>
  }

  const app = useApp(App)
  ```

  不支持 `setup + render` 配置对象、任意根值或运行时全局组件注册；这些路径无法满足 closed ABI 的静态工厂要求。

- **参阅** [指南 - 创建一个 Rue 应用](/guide/guide/essentials/application)

## app.mount() {#app-mount}

将应用实例挂载到容器元素中。

- **类型**

  ```ts
  interface App {
    mount(rootContainer: Element | string): void
  }
  ```

- **详情**

  参数可以是一个实际的 DOM 元素或一个 CSS 选择器字符串。

  当传入选择器时，Rue 会使用第一个匹配到的元素作为容器；如果找不到匹配元素，则不会执行挂载。

  挂载时会清空容器的文本内容，然后把根组件渲染到容器中，并在元素容器上追加 `data-rue-app` 属性，便于调试和定位。

  同一个应用实例重复挂载到同一个容器是幂等操作：后续调用不会清空或重新渲染已有内容，也不会再次触发组件生命周期或挂载副作用。

  一个已挂载的应用实例不能直接迁移到其他容器；同一个容器也不能同时由另一个 Rue 应用实例挂载。发生这两类冲突时，`mount()` 会抛出错误，并保留当前应用和容器内容。需要迁移或交接容器时，应先调用当前应用的 `unmount()`，再调用目标应用的 `mount()`。默认与 Vapor 应用入口遵循相同的容器独占规则。

  `mount()` 当前不返回根组件实例。

- **示例**

  ```tsx
  import { useApp } from '@rue-js/rue'
  import App from './App'

  useApp(App).mount('#app')
  ```

  也可以挂载到实际的 DOM 元素：

  ```tsx
  const container = document.getElementById('app')

  if (container) {
    useApp(App).mount(container)
  }
  ```

## app.unmount() {#app-unmount}

卸载已挂载的应用实例。

- **类型**

  ```ts
  interface App {
    unmount(): void
  }
  ```

- **详情**

  `unmount()` 会从上一次 `mount()` 使用的容器中卸载应用，并清除应用内部保存的容器引用。

  重复调用 `unmount()` 是幂等操作，不会再次触发卸载生命周期。卸载完成后，原容器可由当前应用重新挂载，也可交给其他应用实例挂载。

- **示例**

  ```tsx
  import { useApp } from '@rue-js/rue'
  import App from './App'

  const app = useApp(App)

  app.mount('#app')
  app.unmount()
  ```

## app.use() {#app-use}

安装一个插件。

- **类型**

  ```ts
  interface App {
    use(plugin: Plugin, ...options: any[]): this
  }
  ```

- **详情**

  `app.use()` 会把插件透传给当前运行时的插件系统，并返回应用实例本身，因此可以链式调用。

  这也是安装路由等应用级能力的标准方式。

- **示例**

  ```tsx
  import { useApp } from '@rue-js/rue'
  import router from './router'
  import App from './App'

  useApp(App).use(router).mount('#app')
  ```

## app.component（已移除） {#app-component}

运行时全局组件注册已从 compiler-only 公共能力面移除。请直接导入静态组件；有限动态选择使用调用点的 `<Component registry={{ ... }}>`。
