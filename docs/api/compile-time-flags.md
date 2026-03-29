# 编译时标志 {#compile-time-flags}

:::tip
编译时标志仅在使用 Rue 的 `esm-bundler` 构建时适用（即 `@rue-js/rue/dist/rue.esm-bundler.js`）。
:::

使用 Rue 进行构建时，可以配置许多编译时标志以启用/禁用某些功能。使用编译时标志的好处是，通过这种方式禁用的功能可以通过 tree-shaking 从最终包中移除。

即使没有显式配置这些标志，Rue 也能正常工作。但是，建议始终配置它们，以便在可能时正确移除相关功能。

有关如何根据您的构建工具配置它们的说明，请参见[配置指南](#configuration-guides)。

## `__RUE_OPTIONS_API__` {#RUE_OPTIONS_API}

- **默认值：** `true`

  启用/禁用选项式 API 支持。禁用此选项将导致更小的包大小，但如果第三方库依赖选项式 API，可能会影响兼容性。

## `__RUE_PROD_DEVTOOLS__` {#RUE_PROD_DEVTOOLS}

- **默认值：** `false`

  在生产构建中启用/禁用 devtools 支持。这将导致包中包含更多代码，因此建议仅出于调试目的启用此选项。

## `__RUE_PROD_HYDRATION_MISMATCH_DETAILS__` {#RUE_PROD_HYDRATION_MISMATCH_DETAILS}

- **默认值：** `false`

  在生产构建中启用/禁用 hydration 不匹配的详细警告。这将导致包中包含更多代码，因此建议仅出于调试目的启用此选项。

- 仅在 3.4+ 中可用

## 配置指南 {#configuration-guides}

### Vite {#vite}

`@vitejs/plugin-rue` 自动为这些标志提供默认值。要更改默认值，请使用 Vite 的 [`define` 配置选项](https://vitejs.dev/config/shared-options.html#define)：

```js [vite.config.js]
import { defineConfig } from 'vite'

export default defineConfig({
  define: {
    // 在生产构建中启用 hydration 不匹配详细信息
    __RUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'true',
  },
})
```

### webpack {#webpack}

标志应使用 webpack 的 [DefinePlugin](https://webpack.js.org/plugins/define-plugin/) 定义：

```js [webpack.config.js]
module.exports = {
  // ...
  plugins: [
    new webpack.DefinePlugin({
      __RUE_OPTIONS_API__: 'true',
      __RUE_PROD_DEVTOOLS__: 'false',
      __RUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    }),
  ],
}
```

### Rollup {#rollup}

标志应使用 [@rollup/plugin-replace](https://github.com/rollup/plugins/tree/master/packages/replace) 定义：

```js [rollup.config.js]
import replace from '@rollup/plugin-replace'

export default {
  plugins: [
    replace({
      __RUE_OPTIONS_API__: 'true',
      __RUE_PROD_DEVTOOLS__: 'false',
      __RUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    }),
  ],
}
```
