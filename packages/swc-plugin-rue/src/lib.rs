// SWC ECMAScript AST 节点类型集合（Program/Module/Stmt/Expr/JSX* 等）
use swc_core::ecma::ast::*;
// SWC 访问器扩展方法：在 AST 上运行可变访问器（VisitMut 实现者）
use swc_core::ecma::visit::VisitMutWith;
// 标记函数为 SWC 插件入口：供编译器在转换阶段调用
use swc_core::plugin::plugin_transform;
// 插件上下文类型：保持 SWC 插件入口签名一致
use swc_core::plugin::proxies::TransformPluginProgramMetadata;

// AST 构造与常用助手
mod emit;
// Vapor 转换核心逻辑
mod vapor;
// 功能拆分模块
mod attrs;
mod element_children;
mod element_component;
mod element_expr;
mod element_fragment;
mod element_list;
mod element_node;
mod element_slot;
mod element_text;
mod elements;
mod imports;
pub mod log;
mod pre;
mod router_link;
mod text;
mod utils;

/*
总体架构与设计说明：
- 目标：将 TSX/JSX 在编译阶段转换为 Rue Vapor 的“原生 DOM 构造代码”，绕过运行时整树对象 Diff。
- 流程：
  1) 预处理阶段（PreTransform）：
    - 指令改写：`v-show/r-show` → 改写 `style`，`v-if/v-else-if/v-else` 与 `r-if/r-else-if/r-else` → 条件表达式
     - 组件 useSetup 注入：收集安全的声明与副作用，注入到返回 JSX 之前的块体中
     - Hook 包装：对 `useEffect/useMemo/useRef/reactive/ref/useState/watchEffect` 进行 `_$vaporWithHookId` 包装，注入可追踪的作用域与索引
  2) Vapor 深编译：
     - 将 `() => <JSX/>` 或 `return <JSX/>` 改写为 `vapor(() => { ... })`，在块体中生成原生 `createElement/appendChild` 等调用
     - 动态表达式与属性用 `watchEffect` 包裹，以微任务批量更新
     - 列表渲染使用 `_$vaporKeyedList` + `renderBetween`，通过注释锚点实现片段插入与复用
- Import 注入策略：仅在发生 Vapor 转换或预处理使用到运行时符号时，按需向模块顶部插入或合并来自 `@rue-js/rue` 的导入。
- 关键命名约定：
  - `_elX` 原生元素，`_listX` 注释锚点，`__childX` 组件 children 片段，`_mapX_*` 列表内部标识符

示例（输入 → 输出要点）：
  输入：`() => <div className={ok ? 'a' : 'b'}>{sha.slice(0, 7)}</div>`
  输出块体要点：
    - `const _root = _$createElement("div")`
    - `watchEffect(() => { _root.setAttribute('class', String(ok ? 'a' : 'b')) })`
    - 文本包装：`const _span1 = _$createTextWrapper(_root)` → `watchEffect(() => { _$settextContent(_span1, sha.slice(0,7)) })`
        - `return _root`
*/

// 本插件的职责：
// - 将 TSX/JSX 编译为 Rue Vapor 原生 DOM 构造代码，避免运行时整树对象 Diff
// - 主要转换路径包括：顶层 `() => <JSX />` 包裹为 `vapor(() => { ... })`，并在块内生成：
//   - `_$createElement` / `_$createTextNode` / `_$appendChild` 等原生 DOM 创建与插入
//   - `watchEffect` 对动态表达式建立响应更新
//   - 列表渲染使用 `_$vaporKeyedList` 与 `renderBetween` 进行片段插入与复用
// 参考测试：`tests/spec14.rs`（GitHub commits 列表）、`tests/lists_and_keys*.rs`（列表与 key）

#[plugin_transform]
// 插件入口：供 SWC 在编译时调用
pub fn transform(program: Program, _metadata: TransformPluginProgramMetadata) -> Program {
    let mut p = program;

    log::info("rue-swc: pre transform start");
    p.visit_mut_with(&mut pre::PreTransform::default());
    log::info("rue-swc: pre transform done");

    // 预处理完成后固定进入 Vapor 深编译。
    log::info("rue-swc: vapor transform start");
    // VaporTransform 初始化：计数器清零，did_transform 标记为 false
    p.visit_mut_with(&mut vapor::VaporTransform {
        next_el: 0,
        next_list: 0,
        next_map: 0,
        next_child: 0,
        did_transform: false,
        el_tag_by_ident: std::collections::HashMap::new(),
    });
    log::info("rue-swc: vapor transform done");
    p
}

// 测试入口：在单元测试中直接复用同样的转换逻辑
pub fn apply(program: Program) -> Program {
    let mut p = program;
    log::info("rue-swc: apply(pre+vapor) start");
    p.visit_mut_with(&mut pre::PreTransform::default());
    p.visit_mut_with(&mut vapor::VaporTransform {
        next_el: 0,
        next_list: 0,
        next_map: 0,
        next_child: 0,
        did_transform: false,
        el_tag_by_ident: std::collections::HashMap::new(),
    });
    log::info("rue-swc: apply(pre+vapor) done");
    p
}

/// 仅运行浅编译预处理（v-show/r-show、v-if/r-if），不进入 Vapor 深编译
pub fn apply_pre(program: Program) -> Program {
    let mut p = program;
    log::info("rue-swc: apply_pre start");
    p.visit_mut_with(&mut pre::PreTransform::default());
    log::info("rue-swc: apply_pre done");
    p
}
