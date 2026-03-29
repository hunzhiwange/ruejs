# 安全 (Security) {#security}

## 报告漏洞 (Reporting Vulnerabilities) {#reporting-vulnerabilities}

当报告漏洞时，它立即成为我们的首要关注点，全职贡献者会放下一切来研究它。要报告漏洞，请发送邮件至 [security@ruejs.org](mailto:security@ruejs.org)。

虽然发现新漏洞的情况很少见，但我们还建议始终使用最新版本的 Rue 及其官方配套库，以确保您的应用尽可能安全。

## 规则第1条：永远不要使用不受信任的模板 (Rule No.1: Never Use Non-trusted Templates) {#rule-no-1-never-use-non-trusted-templates}

使用 Rue 时最基本的安全规则是 **永远不要使用不受信任的内容作为组件模板**。这样做等同于允许在应用中执行任意 JavaScript - 更糟糕的是，如果在服务器端渲染期间执行代码，可能会导致服务器被入侵。此类用法的示例：

```tsx
// 永远不要这样做！
import { createApp } from 'rue-js'

const app = createApp({
  template: `<div>${userProvidedString}</div>`, // 永远不要这样做
})

app.mount('#app')
```

Rue 模板被编译成 JavaScript，模板内的表达式将作为渲染过程的一部分执行。虽然表达式是针对特定渲染上下文评估的，但由于潜在全局执行环境的复杂性，Rue 这样的框架在不产生不切实际的性能开销的情况下，完全保护您免受潜在恶意代码执行的影响是不切实际的。完全避免此类问题的最直接方法是确保 Rue 模板的内容始终受信任且完全由您控制。

## Rue 如何保护您 (What Rue Does to Protect You) {#what-rue-does-to-protect-you}

### HTML 内容 (HTML Content) {#html-content}

无论是使用模板还是渲染函数，内容都会自动转义。这意味着在此模板中：

```tsx
<h1>{userProvidedString}</h1>
```

如果 `userProvidedString` 包含：

```js
'<script>alert("hi")</script>'
```

那么它将被转义为以下 HTML：

```html
&lt;script&gt;alert(&quot;hi&quot;)&lt;/script&gt;
```

从而防止脚本注入。这种转义使用原生浏览器 API（如 `textContent`）完成，因此漏洞只有在浏览器本身存在漏洞时才可能存在。

### 属性绑定 (Attribute Bindings) {#attribute-bindings}

同样，动态属性绑定也会自动转义。这意味着在此模板中：

```tsx
<h1 title={userProvidedString}>hello</h1>
```

如果 `userProvidedString` 包含：

```js
'" onclick="alert(\'hi\')'
```

那么它将被转义为以下 HTML：

```html
&quot; onclick=&quot;alert('hi')
```

从而防止关闭 `title` 属性以注入新的任意 HTML。这种转义使用原生浏览器 API（如 `setAttribute`）完成，因此漏洞只有在浏览器本身存在漏洞时才可能存在。

## 潜在危险 (Potential Dangers) {#potential-dangers}

在任何 Web 应用中，允许未经消毒的、用户提供的内容作为 HTML、CSS 或 JavaScript 执行都是潜在危险的，因此应尽可能避免。不过，有时某些风险可能是可以接受的。

例如，CodePen 和 JSFiddle 等服务允许执行用户提供的内容，但这处于预期上下文中，并在某种程度上在 iframe 内进行了沙盒化。在重要功能固有地需要某种程度的漏洞的情况下，由您的团队权衡该功能的重要性与漏洞可能带来的最坏情况。

### HTML 注入 (HTML Injection) {#html-injection}

正如您之前了解到的，Rue 自动转义 HTML 内容，防止您意外地将可执行 HTML 注入应用。但是，**在您知道 HTML 是安全的情况下**，您可以显式渲染 HTML 内容：

- 使用 JSX：

  ```tsx
  <div dangerouslySetInnerHTML={{ __html: userProvidedHtml }} />
  ```

- 使用渲染函数：

  ```tsx
  h('div', {
    dangerouslySetInnerHTML: { __html: userProvidedHtml },
  })
  ```

:::warning 警告
用户提供的 HTML 永远不能被认为 100% 安全，除非它在沙盒化的 iframe 中，或者在只有编写该 HTML 的用户才能接触到的应用部分中。此外，允许用户编写自己的 Rue 模板也会带来类似的危险。
:::

### URL 注入 (URL Injection) {#url-injection}

在这样的 URL 中：

```tsx
<a href={userProvidedUrl}>点击我</a>
```

如果 URL 没有被 "消毒" 以防止使用 `javascript:` 执行 JavaScript，则存在潜在的安全问题。有一些库如 [sanitize-url](https://www.npmjs.com/package/@braintree/sanitize-url) 可以帮助解决这个问题，但请注意：如果您在前端进行 URL 消毒，您已经有了安全问题。**用户提供的 URL 应该始终在保存到数据库之前由后端进行消毒。** 这样就避免了 _每个_ 连接到您 API 的客户端（包括原生移动应用）的问题。另请注意，即使使用消毒后的 URL，Rue 也无法帮助您保证它们指向安全的目的地。

### 样式注入 (Style Injection) {#style-injection}

查看此示例：

```tsx
<a href={sanitizedUrl} style={userProvidedStyles}>
  点击我
</a>
```

假设 `sanitizedUrl` 已经过消毒，因此它肯定是一个真实的 URL 而不是 JavaScript。有了 `userProvidedStyles`，恶意用户仍然可以提供 CSS 进行 "点击劫持"，例如将链接样式化为覆盖 "登录" 按钮的透明框。然后，如果 `https://user-controlled-website.com/` 被构建为类似于应用的登录页面，他们可能刚刚捕获了用户的真实登录信息。

您可以想象允许用户提供的内容用于 `<style>` 元素会创建更大的漏洞，让该用户完全控制如何样式化整个页面。这就是为什么 Rue 阻止在模板内渲染 style 标签：

```tsx
// 这会报错或被阻止
<style>{userProvidedStyles}</style>
```

为了让您的用户完全免受点击劫持的保护，我们建议只允许在沙盒化的 iframe 内完全控制 CSS。或者，当通过样式绑定提供用户控制时，我们建议使用其 [对象语法](/guide/essentials/class-and-style#binding-to-objects-1) 并只允许用户提供他们可以安全控制的特定属性的值，如下所示：

```tsx
<a
  href={sanitizedUrl}
  style={{
    color: userProvidedColor,
    background: userProvidedBackground,
  }}
>
  点击我
</a>
```

### JavaScript 注入 (JavaScript Injection) {#javascript-injection}

我们强烈反对使用 Rue 渲染 `<script>` 元素，因为模板和渲染函数永远不应该有副作用。然而，这不是包含将在运行时作为 JavaScript 评估的字符串的唯一方式。

每个 HTML 元素都有接受 JavaScript 字符串作为值的属性，例如 `onclick`、`onfocus` 和 `onmouseenter`。将用户提供的 JavaScript 绑定到任何这些事件属性都是潜在的安全风险，因此应避免。

:::warning 警告
用户提供的 JavaScript 永远不能被认为 100% 安全，除非它在沙盒化的 iframe 中，或者在只有编写该 JavaScript 的用户才能接触到的应用部分中。
:::

有时我们会收到关于如何在 Rue 模板中进行跨站脚本 (XSS) 的漏洞报告。一般来说，我们不认为此类情况是实际的漏洞，因为没有实际的方法可以保护开发人员免受允许 XSS 的两种场景的影响：

1. 开发人员明确要求 Rue 将用户提供的、未经消毒的内容渲染为 Rue 模板。这本质上是危险的，Rue 无法知道其来源。

2. 开发人员将 Rue 挂载到包含服务器渲染和用户提供内容的整个 HTML 页面。这从根本上与 #1 是相同的问题，但有时开发人员可能会在没有意识到的情况下这样做。这可能导致攻击者提供作为纯 HTML 安全但作为 Rue 模板不安全的 HTML 的潜在漏洞。最佳做法是 **永远不要在可能包含服务器渲染和用户提供内容的节点上挂载 Rue**。

## 最佳实践 (Best Practices) {#best-practices}

一般规则是，如果您允许未经消毒的、用户提供的内容被执行（作为 HTML、JavaScript 甚至 CSS），您可能会使自己面临攻击。这个建议实际上无论使用 Rue、其他框架还是根本没有框架都适用。

除了上述关于 [潜在危险](#potential-dangers) 的建议外，我们还建议熟悉这些资源：

- [HTML5 安全备忘单](https://html5sec.org/)
- [OWASP 跨站脚本 (XSS) 预防备忘单](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

然后使用您学到的知识来审查依赖项的源代码中潜在的危险模式，如果它们包含第三方组件或以其他方式影响渲染到 DOM 的内容。

## 后端协调 (Backend Coordination) {#backend-coordination}

HTTP 安全漏洞，如跨站请求伪造 (CSRF/XSRF) 和跨站脚本包含 (XSSI)，主要在后端解决，因此不是 Rue 关注的问题。但是，与后端团队沟通以了解如何最好地与他们的 API 交互仍然是一个好主意，例如，通过表单提交提交 CSRF 令牌。

## 服务器端渲染 (SSR) {#server-side-rendering-ssr}

使用 SSR 时有一些额外的安全问题，因此请务必遵循 [我们的 SSR 文档](/guide/scaling-up/ssr) 中概述的最佳实践以避免漏洞。

## 内容安全策略 (CSP) {#content-security-policy}

实施内容安全策略 (CSP) 是保护您的应用免受 XSS 和其他代码注入攻击的重要步骤。

### 推荐的 CSP 配置 (Recommended CSP Configuration)

```http
Content-Security-Policy: default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://api.yoursite.com;
```

### 在 Rue 中实施 CSP (Implementing CSP in Rue)

对于使用 Vite 构建的 Rue 应用，您可以在 `vite.config.ts` 中配置 CSP：

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'",
    },
  },
})
```

## 依赖安全 (Dependency Security) {#dependency-security}

定期检查和更新您的依赖项：

```bash
# 检查漏洞
npm audit

# 修复漏洞
npm audit fix

# 更新依赖
npm update
```

使用工具如 [Snyk](https://snyk.io/) 或 [Dependabot](https://github.com/dependabot) 自动监控依赖项漏洞。
