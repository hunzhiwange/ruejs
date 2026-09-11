# 插件 {#plugins}

## 简介 {#introduction}

插件是自包含的代码，通常为应用添加全局级功能。以下是我们安装插件的方式：

```ts
import { useApp } from '@rue-js/rue'
import App from './App'

const app = useApp(App)

app.use(myPlugin, {
  /* 可选选项 */
})
```

插件被定义为一个暴露 `install()` 方法的对象，或者简单地作为一个充当安装函数本身的函数。安装函数接收[应用实例](/api/api/application)以及传递给 `app.use()` 的任何附加选项：

```ts
const myPlugin = {
  install(app, options) {
    // 配置应用
  },
}
```

插件没有严格定义的范围，但插件有用的常见场景包括：

1. 导出静态组件工厂，由使用方直接导入，或放入调用点的有限 `<Component registry={{ ... }}>`。

2. 通过导出 [Context](/guide/guide/components/create-context) Provider 和 `useContext()` 封装，让资源在组件树中共享访问。

3. 通过导出组合式函数或普通工具函数，向应用代码暴露插件能力。

4. 需要执行上述某些组合的库（例如 [@rue-js/router](https://github.com/hunzhiwange/ruejs/router)）。

## 编写插件 {#writing-a-plugin}

为了更好地理解如何创建自己的插件，我们将创建一个非常简化的 `i18n`（[国际化](https://en.wikipedia.org/wiki/Internationalization_and_localization) 的缩写）字符串显示插件版本。

让我们从设置插件对象开始。建议在一个单独的文件中创建并导出它，如下所示，以保持逻辑独立和分离。

```ts [plugins/i18n.ts]
export default {
  install(app: unknown, options: Record<string, any>) {
    // 插件代码放在这里
  },
}
```

我们想要创建一个翻译函数。该函数将接收一个点分隔的 `key` 字符串，我们将使用它在用户提供的选项中查找翻译后的字符串。这是在组件中的典型用法：

```tsx
<h1>{translate(messages, 'greetings.hello')}</h1>
```

Rue 当前没有 `app.config.globalProperties`。更稳妥的做法是把翻译函数作为普通工具函数显式导出：

```ts{1-6} [plugins/i18n.ts]
export const translate = (messages: Record<string, any>, key: string) => {
  return key.split('.').reduce((o, i) => {
    if (o && typeof o === 'object') return (o as Record<string, any>)[i]
  }, messages as Record<string, any>)
}
```

这个 `translate()` 函数会接受如 `greetings.hello` 这样的字符串，在用户提供的配置中查找并返回翻译后的值。

包含翻译键的对象应该通过附加参数传递给 `app.use()` 在插件安装期间传递：

```ts
import i18nPlugin from './plugins/i18n'

app.use(i18nPlugin, {
  greetings: {
    hello: 'Bonjour!',
  },
})
```

现在，我们最初的表达式 `$translate('greetings.hello')` 将在运行时被替换为 `Bonjour!`。

另请参见：[Create Context](/guide/guide/components/create-context)

:::tip
谨慎使用全局属性，因为如果太多不同的插件在整个应用中注入的全局属性，会很快变得混乱。
:::

### 插件中的 Context {#provide-inject-with-plugins}

如果插件需要让整棵组件树共享一份数据，推荐由插件导出 Context，并在应用根部显式渲染对应的 Provider。

```tsx [plugins/i18n.tsx]
import { createContext, type FC } from '@rue-js/rue'

export const I18nContext = createContext<Record<string, any>>({})

export const I18nProvider: FC<{ messages: Record<string, any>; children?: any }> = props => {
  return <I18nContext.Provider value={props.messages}>{props.children}</I18nContext.Provider>
}
```

在根组件或布局组件中用 `<I18nProvider messages={messages}>` 包裹应用子树即可。

插件用户随后可以在组件中通过 `useContext()` 读取共享的翻译对象：

```tsx
import { type FC, useContext } from '@rue-js/rue'
import { I18nContext, translate } from './plugins/i18n'

export const MyComponent: FC = () => {
  const messages = useContext(I18nContext)

  console.log(translate(messages, 'greetings.hello'))

  return <div>...</div>
}
```

这种模式把“插件安装”和“组件树内共享数据”分开处理：`app.use()` 负责安装插件，`Context.Provider` 负责把值传给后代组件。

### 打包发布到 NPM

如果你想进一步构建并发布你的插件供他人使用，请参见 [Vite 的库模式部分](https://vitejs.dev/guide/build.html#library-mode)。
