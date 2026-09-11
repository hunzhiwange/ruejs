# Rue.js

> The Compiler Framework For Native DOM

Languages: English | [简体中文](./README.zh-CN.md)

[![Website](https://img.shields.io/badge/website-ruejs.huododo.com-0f766e)](https://ruejs.huododo.com)
[![npm version](https://img.shields.io/npm/v/%40rue-js%2Frue.svg?style=flat)](https://www.npmjs.com/package/@rue-js/rue)
[![Build and Test](https://github.com/hunzhiwange/ruejs/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/hunzhiwange/ruejs/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Rue.js (pronounced /ruː/) is a lightweight frontend framework for JSX/TSX. It compiles JSX into native DOM operations and provides fine-grained reactive updates through a JavaScript runtime.

Build interfaces with familiar JSX syntax, manage state with `ref`, `reactive`, and `computed`, and add routing, components, and full-stack tooling as your application grows.

## Features

- **Native DOM compilation**: an SWC compiler plugin transforms JSX into DOM creation and update code
- **Fine-grained reactivity**: a JavaScript runtime handles dependency tracking, scheduling, and DOM updates
- **Familiar development experience**: JSX/TSX and Vue-style reactive APIs without an additional template syntax
- **Vite integration**: an official plugin configures JSX compilation for development and production builds
- **Companion libraries**: official routing, design system, and component library
- **Full-stack applications**: Text.js supports file-system routing, SSR, API routes, and Cloudflare Workers deployment

## Quick Start

Rue provides an official scaffolding tool and can also be added to an existing Vite project.

### Create a New Project

Prerequisite: Node.js >= 22.22.0

```sh
pnpm create rue@latest
npm create rue@latest
bun create rue@latest
yarn dlx create-rue@latest
```

After entering the project, install dependencies and start the development server:

```sh
cd your-project-name
pnpm install
pnpm run dev
```

### Add Rue to an Existing Project

```sh
pnpm add @rue-js/rue
pnpm add -D vite @rue-js/vite-plugin-rue
```

Enable Rue JSX with the compiler plugin in your Vite config:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import Rue from '@rue-js/vite-plugin-rue'

export default defineConfig({
  plugins: [Rue()],
})
```

## Example

Here is a minimal Rue application:

```tsx
import { type FC, ref, useApp } from '@rue-js/rue'

const Counter: FC = () => {
  const count = ref(0)

  return <button onClick={() => count.value++}>Count: {count}</button>
}

useApp(Counter).mount('#app')
```

For page-level routing, install `@rue-js/router`:

```sh
pnpm add @rue-js/router
```

```ts
import { useComponent } from '@rue-js/rue'
import { createRouter } from '@rue-js/router'

export default createRouter({
  history: 'hash',
  routes: [
    { path: '/', component: useComponent(() => import('./pages/Home')) },
    { path: '/about', component: useComponent(() => import('./pages/About')) },
  ],
})
```

## Text.js

Text.js is the full-stack application framework in the Rue ecosystem. Built on Vite, Rue, RSC, and file-system routing, it brings App Router, Pages Router, SSR, static generation, API routes, middleware, and Cloudflare Workers deployment into one lightweight workflow.

It is designed for developers familiar with the Next.js application model while keeping Rue's JSX/TSX runtime and Vite-first tooling path. Common CLI commands include `text dev`, `text build`, `text deploy`, `text typegen`, and `text check`.

## Documentation

- [Introduction](./docs/intro.md)
- [Installation](./docs/installation.md)
- [Getting Started](./docs/getting-started.md)
- [Routing](./docs/routing.md)
- [Guide](./docs/guide)
- [API](./docs/api)

This repository also includes a runnable documentation site and example pages under [app](./app) and [app/pages](./app/pages).

## Packages

This is a pnpm workspace-based monorepo. The main packages include:

- `@rue-js/rue`: framework core and JSX entry point
- `@rue-js/router`: official router
- `@rue-js/text`: Text.js full-stack application framework and CLI
- `@rue-js/runtime`: JavaScript reactivity and DOM rendering runtime
- `@rue-js/design`: design system and component library
- `@rue-js/vite-plugin-rue`: Vite integration
- `@rue-js/swc-plugin-rue`: Rust-based SWC plugin for build-time JSX compilation

## Local Development

This repository uses `pnpm` to manage dependencies.

```sh
pnpm install
make dev
pnpm run app-dev
pnpm run app-build
pnpm run app-preview
pnpm run dev
```

Common commands:

```sh
pnpm run build
pnpm run test
pnpm run check
pnpm run release-check
```

### Run js-framework-benchmark with the Local Development Build

When the current Rue version has not been published to npm yet, install the local workspace packages temporarily into the `rue-signal` implementation of `js-framework-benchmark`:

```sh
pnpm benchmark:js-framework:install-local -- \
  ../js-framework-benchmark/frameworks/keyed/rue-signal
```

You can also pass an absolute path to `rue-signal/package.json`. The command builds the Rue runtime and SWC compiler plugin, packs the related `@rue-js/*` workspace packages, installs them without changing `package.json` or `package-lock.json`, and runs `npm run build-prod`.

After installation, start the server from the `js-framework-benchmark` root:

```sh
npm start
```

Run the single-framework benchmark in another terminal:

```sh
npm run bench keyed/rue-signal
```

The published npm version can remain in `rue-signal/package.json`. Running `npm ci` in that directory replaces the local packages with the published version, so rerun the local installation command afterward.

## Contributing

Issues and pull requests are welcome. Before submitting changes, we recommend running at least the following checks:

```sh
pnpm run check
pnpm run test
```

If your changes involve builds, releases, or the compiler, please add the corresponding package-level verification.

## License

[MIT](./LICENSE)
