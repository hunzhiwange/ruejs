# 生产部署 (Production Deployment) {#production-deployment}

## 开发与生产 (Development vs. Production) {#development-vs-production}

在开发期间，Rue 提供了许多功能来改善开发体验：

- 常见错误和陷阱的警告
- Props / 事件验证
- 响应式调试钩子
- Devtools 集成

然而，这些功能在生产环境中变得无用。一些警告检查也会产生少量的性能开销。部署到生产环境时，我们应该删除所有未使用的、仅用于开发的代码分支，以获得更小的负载和更好的性能。

## 不使用构建工具 (Without Build Tools) {#without-build-tools}

如果您通过 CDN 或自托管脚本使用 Rue 而没有构建工具，请确保在部署到生产环境时使用生产构建（以 `.prod.js` 结尾的 dist 文件）。生产构建经过预压缩，所有仅用于开发的代码分支都已移除。

- 如果使用全局构建（通过 `Rue` 全局访问）：使用 `rue.global.prod.js`。
- 如果使用 ESM 构建（通过原生 ESM 导入访问）：使用 `rue.esm-browser.prod.js`。

查阅 [dist 文件指南](https://github.com/ruejs/core/tree/main/packages/rue#which-dist-file-to-use) 了解更多详情。

## 使用构建工具 (With Build Tools) {#with-build-tools}

通过 `create-rue`（基于 Vite）或 Rue CLI（基于 webpack）搭建的项目已预先配置为生产构建。

如果使用自定义设置，请确保：

1. `rue` 解析为 `rue.runtime.esm-bundler.js`。
2. [编译时功能标志](/api/compile-time-flags) 已正确配置。
3. <code>process.env<wbr>.NODE_ENV</code> 在构建期间替换为 `"production"`。

其他参考：

- [Vite 生产构建指南](https://vitejs.dev/guide/build.html)
- [Vite 部署指南](https://vitejs.dev/guide/static-deploy.html)

## 跟踪运行时错误 (Tracking Runtime Errors) {#tracking-runtime-errors}

可以使用 [应用级错误处理程序](/api/application#app-config-errorhandler) 向跟踪服务报告错误：

```tsx
import { createApp } from '@rue-js/rue'

const app = createApp(App)

app.config.errorHandler = (err, instance, info) => {
  // 向跟踪服务报告错误
  console.error('Rue Error:', err)
  console.error('Component:', instance)
  console.error('Error Info:', info)

  // 发送到错误跟踪服务
  // sentry.captureException(err)
}

app.mount('#app')
```

[Sentry](https://docs.sentry.io/platforms/javascript/guides/react/) 和 [Bugsnag](https://docs.bugsnag.com/platforms/javascript/react/) 等服务也为 Rue/React 提供官方集成。

## 生产优化检查清单 (Production Optimization Checklist) {#production-optimization-checklist}

部署到生产环境前，请检查以下事项：

### 构建配置 (Build Configuration)

- [ ] 确保 `NODE_ENV` 设置为 `"production"`
- [ ] 启用代码压缩 (minification)
- [ ] 启用 tree-shaking 以移除未使用的代码
- [ ] 配置 source maps（可选，用于生产调试）

### 性能优化 (Performance Optimizations)

- [ ] 启用代码分割和懒加载
- [ ] 优化图片和资源
- [ ] 配置适当的缓存策略
- [ ] 使用 CDN 托管静态资源

### 安全性 (Security)

- [ ] 移除所有开发工具和调试代码
- [ ] 配置 CSP (内容安全策略)
- [ ] 确保 HTTPS 已启用
- [ ] 验证环境变量不包含敏感信息

### 监控和日志 (Monitoring and Logging)

- [ ] 配置错误跟踪（如 Sentry）
- [ ] 设置性能监控
- [ ] 配置日志级别（生产环境使用 warn/error 级别）

## 部署示例 (Deployment Examples) {#deployment-examples}

### Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel --prod
```

### Netlify

```bash
# 安装 Netlify CLI
npm i -g netlify-cli

# 部署
netlify deploy --prod --dir=dist
```

### Docker

```dockerfile
# Dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

```bash
# 构建和运行
docker build -t my-rue-app .
docker run -p 8080:80 my-rue-app
```
