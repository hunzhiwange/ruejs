# 测试 {#testing}

## 为什么要测试？ {#why-test}

自动化测试通过防止回归并鼓励你将应用分解成可测试的函数、模块、类和组件，帮助你快速、自信地构建复杂的 Rue 应用。与任何应用一样，你的新 Rue 应用可能以多种方式出现问题，重要的是你能够在发布前捕获这些问题并修复它们。

在本指南中，我们将介绍基本术语，并就为你的应用选择哪些工具提供我们的建议。

有一个关于 composables 的特定部分。有关更多详细信息，请参见下面的[测试 Composables](#testing-composables)。

## 何时测试？ {#when-to-test}

尽早开始测试！我们建议你在可能的情况下尽快开始编写测试。你为应用添加测试的时间越长，应用的依赖就越多，开始测试就越困难。

## 测试类型 {#testing-types}

在设计应用的测试策略时，你应该利用以下测试类型：

- **单元**：检查给定函数、类或 composable 的输入是否产生预期的输出或副作用。
- **组件**：检查你的组件是否挂载、渲染、可以交互，并按预期运行。这些测试比单元测试导入更多代码，更复杂，需要更多时间执行。
- **端到端**：检查跨多个页面的功能，并对生产构建的应用发出真实的网络请求。这些测试通常涉及建立数据库或其他后端。

每种测试类型在你的应用测试策略中都有其作用，每种都会保护你免受不同类型的问题。

## 概述 {#overview}

我们将简要讨论这些测试是什么，如何为 Rue 应用实现它们，并提供一些一般性建议。

## 单元测试 {#unit-testing}

单元测试用于验证小的、独立的代码单元是否按预期工作。单元测试通常覆盖单个函数、类、composable 或模块。单元测试关注逻辑正确性，只关心应用整体功能的一小部分。它们可能会模拟应用环境的大部分（例如初始状态、复杂类、第三方模块和网络请求）。

一般来说，单元测试会捕获函数的业务逻辑和逻辑正确性问题。

以这个 `increment` 函数为例：

```ts [helpers.ts]
export function increment(current: number, max = 10): number {
  if (current < max) {
    return current + 1
  }
  return current
}
```

因为它非常自包含，所以调用 increment 函数并断言它返回应有的值会很容易，因此我们将编写单元测试。

如果任何这些断言失败，问题就包含在 `increment` 函数中是明确的。

```ts [helpers.test.ts]
import { describe, test, expect } from 'vitest'
import { increment } from './helpers'

describe('increment', () => {
  test('将当前数字增加 1', () => {
    expect(increment(0, 10)).toBe(1)
  })

  test('不会超过最大值', () => {
    expect(increment(10, 10)).toBe(10)
  })

  test('默认最大值为 10', () => {
    expect(increment(10)).toBe(10)
  })
})
```

如前所述，单元测试通常应用于自包含的业务逻辑、不涉及 UI 渲染、网络请求或其他环境问题的组件、类、模块或函数。

这些通常是普通的 JavaScript / TypeScript 模块，与 Rue 无关。一般来说，为 Rue 应用中的业务逻辑编写单元测试与使用其他框架的应用没有显著不同。

有两种情况你确实需要测试 Rue 特定的功能：

1. Composables
2. 组件

### Composables {#composables}

Rue 应用中特定的一类函数是 [Composables](/guide/reusability/composables)，在测试期间可能需要特殊处理。
有关更多详细信息，请参见下面的[测试 Composables](#testing-composables)。

### 单元测试组件 {#unit-testing-components}

组件可以通过两种方式测试：

1. 白盒：单元测试

   "白盒测试"了解组件的实现细节和依赖关系。它们专注于**隔离**被测试的组件。这些测试通常会涉及模拟你组件的部分或全部子组件，以及设置插件状态和依赖项（例如 Pinia）。

2. 黑盒：组件测试

   "黑盒测试"不了解组件的实现细节。这些测试尽可能少地进行模拟，以测试组件与整个系统的集成。它们通常会渲染所有子组件，被认为是更多的"集成测试"。请参阅下面的[组件测试建议](#component-testing)。

### 推荐 {#recommendation}

- [Vitest](https://vitest.dev/)

  由于 `create-rue` 创建的官方设置基于 [Vite](https://vitejs.dev/)，我们推荐使用能够直接利用 Vite 相同配置和转换管道的单元测试框架。[Vitest](https://vitest.dev/) 是为此目的专门设计的单元测试框架，由 Rue / Vite 团队成员创建和维护。它以最小的努力与基于 Vite 的项目集成，速度极快。

### 其他选项 {#other-options}

- [Jest](https://jestjs.io/) 是一个流行的单元测试框架。但是，我们建议仅在你有现有的 Jest 测试套件需要迁移到基于 Vite 的项目时使用 Jest，因为 Vitest 提供了更无缝的集成和更好的性能。

## 组件测试 {#component-testing}

在 Rue 应用中，组件是 UI 的主要构建块。因此，组件是验证应用行为时自然的隔离单元。从粒度角度来看，组件测试位于单元测试之上，可以被视为一种集成测试。你的 Rue 应用的大部分应该被组件测试覆盖，我们建议每个 Rue 组件都有自己的测试文件。

组件测试应该捕获与你的组件 props、事件、提供的插槽、样式、类、生命周期钩子等相关的任何问题。

组件测试不应该模拟子组件，而应该通过与用户交互的方式来测试组件与其子组件之间的交互。例如，组件测试应该像用户一样点击元素，而不是以编程方式与组件交互。

组件测试应该关注组件的公共接口而不是内部实现细节。对于大多数组件，公共接口仅限于：触发的事件、props 和插槽。测试时，请记住**测试组件做什么，而不是它怎么做**。

**应该**

- 对于**视觉**逻辑：基于输入的 props 和插槽断言正确的渲染输出。
- 对于**行为**逻辑：断言对用户输入事件的正确渲染更新或触发的事件。

  在下面的示例中，我们演示了一个具有标记为"increment"的 DOM 元素并且可点击的 Stepper 组件。我们传递一个名为 `max` 的 prop，防止 Stepper 超过 `2`，所以如果我们点击按钮 3 次，UI 仍应显示 `2`。

  我们对 Stepper 的实现一无所知，只知道"输入"是 `max` prop，"输出"是用户将看到的 DOM 状态。

```tsx [Stepper.test.tsx]
import { describe, test, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/rue'
import Stepper from './Stepper'

describe('Stepper', () => {
  test('不应超过最大值', async () => {
    render(<Stepper max={2} />)

    const button = screen.getByRole('button', { name: /increment/i })
    const valueDisplay = screen.getByTestId('stepper-value')

    expect(valueDisplay).toHaveTextContent('0')

    await fireEvent.click(button)
    expect(valueDisplay).toHaveTextContent('1')

    await fireEvent.click(button)
    expect(valueDisplay).toHaveTextContent('2')

    // 再点一次不应超过最大值
    await fireEvent.click(button)
    expect(valueDisplay).toHaveTextContent('2')
  })
})
```

**不应该**

- 不要断言组件实例的私有状态或测试组件的私有方法。测试实现细节会使测试变得脆弱，因为当实现更改时，它们更有可能中断并需要更新。

  组件的最终工作是渲染正确的 DOM 输出，因此专注于 DOM 输出的测试提供相同水平的正确性保证（如果不是更多），同时更健壮、更能适应变化。

  不要完全依赖快照测试。断言 HTML 字符串并不能描述正确性。有意图地编写测试。

  如果一个方法需要彻底测试，请考虑将其提取为独立的实用函数并为其编写专门的单元测试。如果无法干净地提取，它可能作为组件、集成或端到端测试的一部分进行测试，覆盖它。

### 推荐 {#recommendation-1}

- [Vitest](https://vitest.dev/) 用于无头渲染的组件或 composables（例如 VueUse 中的 [`useFavicon`](https://vueuse.org/core/useFavicon/#usefavicon) 函数）。组件和 DOM 可以使用 [`rue-test-utils`](https://github.com/ruejs/test-utils) 进行测试。

- [Cypress Component Testing](https://on.cypress.io/component) 用于预期行为依赖于正确渲染样式或触发原生 DOM 事件的组件。它可以通过 [@testing-library/cypress](https://testing-library.com/docs/cypress-testing-library/intro) 与 Testing Library 一起使用。

Vitest 和基于浏览器的运行器之间的主要区别是速度和执行上下文。简而言之，基于浏览器的运行器（如 Cypress）可以捕获基于节点的运行器（如 Vitest）无法捕获的问题（例如样式问题、真正的原生 DOM 事件、cookie、local storage 和网络故障），但基于浏览器的运行器比 Vitest 慢几个数量级，因为它们需要打开浏览器、编译样式表等。Cypress 是一个支持组件测试的基于浏览器的运行器。请阅读 [Vitest 的比较页面](https://vitest.dev/guide/comparisons.html#cypress) 以获取比较 Vitest 和 Cypress 的最新信息。

### 挂载库 {#mounting-libraries}

组件测试通常涉及在隔离中挂载被测试的组件、触发模拟的用户输入事件，并对渲染的 DOM 输出进行断言。有一些专门的实用库可以简化这些任务。

- [`rue-test-utils`](https://github.com/ruejs/test-utils) 是官方的低级组件测试库，旨在为用户提供访问 Rue 特定 API 的能力。它也是 `@testing-library/rue` 构建的基础库。

- [`@testing-library/rue`](https://github.com/testing-library/rue-testing-library) 是一个专注于不依赖实现细节测试组件的 Rue 测试库。其指导原则是，测试越像软件的使用方式，它们就越能提供信心。

我们建议对应用中的组件测试使用 `rue-test-utils`。`@testing-library/rue` 在测试具有 Suspense 的异步组件时存在问题，因此应谨慎使用。

### 其他选项 {#other-options-1}

- [Nightwatch](https://nightwatchjs.org/) 是一个支持 Rue 组件测试的 E2E 测试运行器。

- [WebdriverIO](https://webdriver.io/docs/component-testing/vue) 用于依赖于基于标准化自动化的原生用户交互的跨浏览器组件测试。它也可以与 Testing Library 一起使用。

## E2E 测试 {#e2e-testing}

虽然单元测试为开发者提供了一定程度的信心，但单元和组件测试在提供应用部署到生产时的全面覆盖方面能力有限。因此，端到端（E2E）测试对应用中可以说最重要的方面提供覆盖：当用户实际使用你的应用时会发生什么。

端到端测试关注发出真实网络请求的多页应用行为。它们通常涉及建立数据库或其他后端，甚至可能针对实时暂存环境运行。

端到端测试通常会捕获与你的路由器、状态管理库、顶级组件（例如 App 或 Layout）、公共资源或任何请求处理相关的问题。如上所述，它们捕获单元测试或组件测试可能无法捕获的关键问题。

端到端测试不导入任何 Rue 应用代码，而是完全依赖于在真实浏览器中浏览整个页面来测试应用。

端到端测试验证应用中的许多层。它们可以针对本地构建的应用，甚至实时暂存环境。针对暂存环境测试不仅包括前端代码和静态服务器，还包括所有相关的后端服务和基础设施。

> 你的测试越像软件的使用方式，它们就越能给你信心。- [Kent C. Dodds](https://x.com/kentcdodds/status/977018512689455106) - Testing Library 的作者

通过测试用户操作如何影响应用，E2E 测试通常是确定应用是否正常运行的关键。

### 选择 E2E 测试解决方案 {#choosing-an-e2e-testing-solution}

虽然 Web 上的端到端（E2E）测试因不可靠（不稳定）的测试和减慢开发流程而获得了负面声誉，但现代 E2E 工具已经向前迈进，创造了更可靠、交互性更强、更有用的测试。在选择应用的测试框架时，以下部分提供了一些在选择测试框架时要记住的事项的指导。

#### 跨浏览器测试 {#cross-browser-testing}

端到端（E2E）测试的主要优势之一是能够跨多个浏览器测试应用。虽然 100% 跨浏览器覆盖似乎很可取，但重要的是要注意，由于需要额外的时间和机器能力来持续运行它们，跨浏览器测试对团队资源的回报是递减的。因此，在选择应用需要的跨浏览器测试量时，请注意这种权衡。

#### 更快的反馈循环 {#faster-feedback-loops}

端到端（E2E）测试和开发的主要问题之一是运行整个套件需要很长时间。通常，这只在持续集成和部署（CI/CD）管道中完成。现代 E2E 测试框架通过添加并行化等功能帮助解决了这个问题，这允许 CI/CD 管道比以前快几个数量级地运行。此外，在本地开发时，能够为你正在处理的页面选择性运行单个测试，同时提供测试的热重载，可以帮助提高开发者的工作效率和生产力。

#### 一流的调试体验 {#first-class-debugging-experience}

虽然开发者传统上依赖扫描终端窗口中的日志来帮助确定测试中出了什么问题，但现代端到端（E2E）测试框架允许开发者利用他们已经熟悉的工具，例如浏览器开发者工具。

#### 无头模式下的可见性 {#visibility-in-headless-mode}

当端到端（E2E）测试在连续集成/部署管道中运行时，它们通常在无头浏览器中运行（即，没有可见的浏览器为用户打开）。现代 E2E 测试框架的一个关键功能是能够查看测试期间应用的快照和/或视频，提供一些关于错误发生原因的见解。从历史上看，维护这些集成是乏味的。

### 推荐 {#recommendation-2}

- [Playwright](https://playwright.dev/) 是一个出色的 E2E 测试解决方案，支持 Chromium、WebKit 和 Firefox。在 Windows、Linux 和 macOS 上测试，本地或 CI，无头或有头，并原生模拟 Google Chrome for Android 和 Mobile Safari。它具有信息丰富的 UI、出色的可调试性、内置断言、并行化、跟踪，并旨在消除不稳定的测试。支持[组件测试](https://playwright.dev/docs/test-components)，但标记为实验性。Playwright 是开源的，由 Microsoft 维护。

- [Cypress](https://www.cypress.io/) 具有信息丰富的图形界面、出色的可调试性、内置断言、存根、防不稳定和快照。如上所述，它提供对[组件测试](https://docs.cypress.io/guides/component-testing/introduction)的稳定支持。Cypress 支持基于 Chromium 的浏览器、Firefox 和 Electron。WebKit 支持可用，但标记为实验性。Cypress 是 MIT 许可的，但并行化等功能需要订阅 Cypress Cloud。

### 其他选项 {#other-options-2}

- [Nightwatch](https://nightwatchjs.org/) 是一个基于 [Selenium WebDriver](https://www.npmjs.com/package/selenium-webdriver) 的 E2E 测试解决方案。这给它提供了最广泛的浏览器支持范围，包括原生移动测试。基于 Selenium 的解决方案将比 Playwright 或 Cypress 慢。

- [WebdriverIO](https://webdriver.io/) 是一个基于 WebDriver 协议的 Web 和移动测试自动化框架。

## 实践方案 {#recipes}

### 向项目添加 Vitest {#adding-vitest-to-a-project}

在基于 Vite 的 Rue 项目中，运行：

```sh
npm install -D vitest happy-dom @testing-library/rue
```

接下来，更新 Vite 配置以添加 `test` 选项块：

```ts{5-11} [vite.config.ts]
import { defineConfig } from 'vite'
import rue from '@rue-js/vite-plugin-rue'

export default defineConfig({
  plugins: [rue()],
  test: {
    // 启用类似 Jest 的全局测试 API
    globals: true,
    // 使用 happy-dom 模拟 DOM
    environment: 'happy-dom'
  }
})
```

:::tip
如果你使用 TypeScript，将 `vitest/globals` 添加到你的 `tsconfig.json` 中的 `types` 字段。

```json [tsconfig.json]
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

:::

然后，在你的项目中创建一个以 `*.test.ts` 或 `*.test.tsx` 结尾的文件。你可以将所有测试文件放在项目根目录的测试目录中，或放在源文件旁边的测试目录中。Vitest 将自动使用命名约定搜索它们。

```tsx [MyComponent.test.tsx]
import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/rue'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  test('应该工作', () => {
    render(<MyComponent title="测试" />)
    expect(screen.getByText('测试')).toBeInTheDocument()
  })
})
```

最后，更新 `package.json` 以添加测试脚本并运行它：

```json{4} [package.json]
{
  "scripts": {
    "test": "vitest"
  }
}
```

```sh
npm test
```

### 测试 Composables {#testing-composables}

> 本部分假设你已经阅读了 [Composables](/guide/reusability/composables) 部分。

在测试 composables 时，我们可以将它们分为两类：不依赖宿主组件实例的 composables 和依赖的 composables。

当 composable 使用以下 API 时，它就依赖于宿主组件实例：

- 生命周期钩子
- Provide / Inject

如果 composable 只使用响应式 API，那么可以通过直接调用它并断言其返回的状态/方法来测试它：

```ts [counter.ts]
import { ref } from '@rue-js/rue'

export function useCounter() {
  const count = ref(0)
  const increment = () => count.value++

  return {
    count,
    increment,
  }
}
```

```ts [counter.test.ts]
import { describe, test, expect } from 'vitest'
import { useCounter } from './counter'

describe('useCounter', () => {
  test('应该正确计数', () => {
    const { count, increment } = useCounter()
    expect(count.value).toBe(0)

    increment()
    expect(count.value).toBe(1)
  })
})
```

依赖于生命周期钩子或 Provide / Inject 的 composable 需要包装在宿主组件中才能进行测试。我们可以创建一个如下所示的辅助函数：

```ts [test-utils.ts]
import { createApp, h, type RenderOutput } from '@rue-js/rue'

export function withSetup<T>(composable: () => T): [T, ReturnType<typeof createApp>] {
  let result!: T
  const app = createApp({
    setup() {
      result = composable()
      return (): RenderOutput => h('div')
    },
  })
  app.mount(document.createElement('div'))
  // 返回结果和应用实例
  // 用于测试 provide/unmount
  return [result, app]
}
```

```ts [foo.test.ts]
import { describe, test, expect } from 'vitest'
import { withSetup } from './test-utils'
import { useFoo } from './foo'

describe('useFoo', () => {
  test('应该正确工作', () => {
    const [result, app] = withSetup(() => useFoo(123))
    // 为测试注入提供 mock
    // app.provide(...)
    // 运行断言
    // expect(result.foo.value).toBe(1)
    // 如果需要触发 onUnmounted 钩子
    app.unmount()
  })
})
```

对于更复杂的 composables，使用[组件测试](#component-testing)技术针对包装组件编写测试可能也会更容易。
