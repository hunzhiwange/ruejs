pub mod children;
mod expr;
mod expr_container;
mod jsx;
mod utils;
/*
Vapor 块体编译（中文详解）：
- 目标：将 JSXElement/JSXFragment 编译为“块级 DOM 构建程序”，统一以 _root 为父节点，把所有子内容附加到其下，并返回 `return { vaporElement: _root }`。
- 模块划分：
  - jsx.rs：顶层入口，负责将单个 JSXElement 或 JSXFragment 转换为 BlockStmt；
  - children.rs：遍历并编译子节点，分派到文本/片段/表达式容器/JSX 元素等路径；
  - expr_container.rs：处理 JSXExprContainer（插槽、props.children 等），生成注释锚点与 renderBetween 调用；
  - expr.rs：将插槽内的表达式规范化为可渲染的 vnode 或稳定表达式（含条件/逻辑表达式的递归处理）；
  - utils.rs：工具函数，生成注释锚点与 watch-renderBetween 箭头函数等。
*/
