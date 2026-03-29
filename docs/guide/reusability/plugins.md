# 插件 {#plugins}

## 简介 {#introduction}

插件是自包含的代码，通常为应用添加全局级功能。以下是我们安装插件的方式：

```ts
import { createApp } from '@rue-js/rue'

const app = createApp({})

app.use(myPlugin, {
  /* 可选选项 */
})
```

插件被定义为一个暴露 `install()` 方法的对象，或者简单地作为一个充当安装函数本身的函数。安装函数接收[应用实例](/api/application)以及传递给 `app.use()` 的任何附加选项：

```ts
const myPlugin = {
  install(app, options) {
    // 配置应用
  },
}
```

插件没有严格定义的范围，但插件有用的常见场景包括：

1. 使用 [`app.component()`](/api/application#app-component) 和 [`app.directive()`](/api/application#app-directive) 注册一个或多个全局组件或自定义指令。

2. 通过调用 [`app.provide()`](/api/application#app-provide) 使资源在整个应用中可[注入](/guide/components/provide-inject)。

3. 通过将它们附加到 [`app.config.globalProperties`](/api/application#app-config-globalproperties) 来添加一些全局实例属性或方法。

4. 需要执行上述某些组合的库（例如 [@rue-js/router](https://github.com/ruejs/router)）。

## 编写插件 {#writing-a-plugin}

为了更好地理解如何创建自己的插件，我们将创建一个非常简化的 `i18n`（[国际化](https://en.wikipedia.org/wiki/Internationalization_and_localization) 的缩写）字符串显示插件版本。

让我们从设置插件对象开始。建议在一个单独的文件中创建并导出它，如下所示，以保持逻辑独立和分离。

```ts [plugins/i18n.ts]
import type { App } from '@rue-js/rue'

export default {
  install: (app: App, options: Record<string, any>) => {
    // 插件代码放在这里
  },
}
```

我们想要创建一个翻译函数。该函数将接收一个点分隔的 `key` 字符串，我们将使用它在用户提供的选项中查找翻译后的字符串。这是在模板中的预期用法：

```tsx
<h1>{$translate('greetings.hello')}</h1>
```

由于此函数应该在所有模板中全局可用，我们将在插件中将其附加到 `app.config.globalProperties`：

```ts{3-10} [plugins/i18n.ts]
export default {
  install: (app, options) => {
    // 注入一个全局可用的 $translate() 方法
    app.config.globalProperties.$translate = (key: string) => {
      // 使用 `key` 作为路径检索 `options` 中的嵌套属性
      return key.split('.').reduce((o, i) => {
        if (o) return o[i]
      }, options)
    }
  }
}
```

我们的 `$translate` 函数将接受如 `greetings.hello` 这样的字符串，在用户提供的配置中查找并返回翻译后的值。

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

另请参见：[扩展全局属性](/guide/typescript/options-api#augmenting-global-properties) <sup class="vt-badge ts" />

:::tip
谨慎使用全局属性，因为如果太多不同的插件在整个应用中注入的全局属性，会很快变得混乱。
:::

### 插件中的 Provide / Inject {#provide-inject-with-plugins}

插件还允许我们使用 `provide` 让插件用户访问函数或属性。例如，我们可以让应用程序访问 `options` 参数以使用翻译对象。

```ts{3} [plugins/i18n.ts]
export default {
  install: (app, options) => {
    app.provide('i18n', options)
  }
}
```

插件用户现在可以使用 `i18n` 键将插件选项注入到他们的组件中：

```tsx
import { inject, type FC } from '@rue-js/rue'

export const MyComponent: FC = () => {
  const i18n = inject<Record<string, any>>('i18n')

  console.log(i18n?.greetings?.hello)

  return () => <div>...</div>
}
```

### 打包发布到 NPM

如果你想进一步构建并发布你的插件供他人使用，请参见 [Vite 的库模式部分](https://vitejs.dev/guide/build.html#library-mode)。
