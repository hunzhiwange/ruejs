# 自定义渲染器 API {#custom-renderer-api}

## createRenderer() {#createrenderer}

compiler-only 公共能力面不提供通用自定义渲染器。应用只能通过 Rue 编译器生成 closed ABI DOM/SSR 产物；下面的旧 `createRenderer()` / 通用根渲染接口不再受支持。

- **迁移说明**

  非 DOM 平台需要实现专用编译目标及其窄 runtime entries，不能在应用层注入通用节点操作表。现有自定义渲染器应继续停留在旧版本，或迁移为独立编译后端。
