#![allow(ambiguous_glob_reexports)]
/*
入口模块：导出日志与响应式能力

说明：
- 将响应式相关的全部 API 从 `reactive` 统一导出，便于 JS 侧以简洁路径调用。
- 同时导出 `log` 模块，让使用者可以控制运行时日志行为（如启用/级别）。

Rust 提示：
- `pub use reactive::*;` 会把 `reactive` 子模块中公开的符号“再导出”到顶层，
  这是一种常见的扁平化 API 的做法，外部调用时无需关心内部文件结构。
*/
// `reactive` 提供 Signal/Effect/Computed/Watch/Resource 等特性
// `log` 提供运行时日志（支持 localStorage 配置）
pub mod hook;
pub mod log;
pub mod reactive;
pub mod runtime;
// 便捷导出：直接将 reactive 内的公共 API 暴露到顶层
pub use hook::*;
pub use reactive::*;
pub use runtime::*;
