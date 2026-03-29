# 安装

使用包管理器安装 Rue 与路由：

```bash
pnpm add rue-js @rue-js/router
```

在 Vite 配置中启用 Rue 的 JSX：

```ts
// vite.config.ts
export default defineConfig({
  esbuild: { jsxImportSource: 'rue-js' },
})
```
