// SWC ECMAScript AST 节点类型集合（Program/Module/Stmt/Expr/JSX* 等）
use swc_core::ecma::ast::*;
// SWC 访问器扩展方法：在 AST 上运行可变访问器（VisitMut 实现者）
use swc_core::common::Span;
use swc_core::ecma::visit::{Visit, VisitMutWith, VisitWith};
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
mod bootstrap;
mod compiled_capabilities;
mod compiled_component;
mod compiled_invariants;
mod compiled_props;
mod custom_element;
mod diagnostics;
mod element_builtin;
mod element_children;
mod element_component;
mod element_expr;
mod element_fragment;
mod element_list;
mod element_list_patch;
mod element_node;
mod element_slot;
mod element_text;
mod elements;
mod hydrate;
mod imports;
pub mod log;
mod pre;
mod reactive_provenance;
mod router_link;
mod server;
mod state_path;
#[cfg(test)]
mod state_path_tests;
mod text;
mod transition_identity;
mod utils;

#[cfg(test)]
#[path = "compiled_capabilities_tests.rs"]
mod compiled_capabilities_tests;

#[cfg(test)]
#[path = "compiled_invariants_tests.rs"]
mod compiled_invariants_tests;

#[cfg(test)]
#[path = "reactive_provenance_tests.rs"]
mod reactive_provenance_tests;

/*
总体架构与设计说明：
- 目标：将 TSX/JSX 在编译阶段转换为 Rue Vapor 的“原生 DOM 构造代码”，绕过运行时整树对象 Diff。
- 流程：
  1) 预处理阶段（PreTransform）：
    - 指令改写：`v-show/r-show` → 改写 `style`，`v-if/v-else-if/v-else` 与 `r-if/r-else-if/r-else` → 条件表达式
     - 组件 useSetup 注入：收集安全的声明与副作用，注入到返回 JSX 之前的块体中
     - Hook 包装：对 `useEffect/useRef/reactive/ref/useState/watchEffect` 进行 `_$compiledWithHookId` 包装，注入可追踪的作用域与索引
  2) Vapor 深编译：
     - 将 `() => <JSX/>` 或 `return <JSX/>` 改写为 `vapor(() => { ... })`，在块体中生成原生 `createElement/appendChild` 等调用
     - 动态表达式与属性用 `watchEffect` 包裹，以微任务批量更新
     - 列表渲染使用 `_$reconcileKeyed` 与 closed row factory，复用并移动显式 DOM range
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
//   - 列表渲染使用 `_$reconcileKeyed` 与 closed row factory 复用显式 DOM range
// 参考测试：`tests/spec14.rs`（GitHub commits 列表）、`tests/lists_and_keys*.rs`（列表与 key）

#[plugin_transform]
// 插件入口：供 SWC 在编译时调用
pub fn transform(mut program: Program, metadata: TransformPluginProgramMetadata) -> Program {
    use swc_core::common::SourceMapper;
    pre::pre_directive::preserve(
        &mut program,
        Some(&|span| metadata.source_map.span_to_snippet(span).ok()),
    );
    let config = metadata
        .get_transform_plugin_config()
        .and_then(|raw| serde_json::from_str::<serde_json::Value>(&raw).ok());
    let target = config
        .as_ref()
        .and_then(|config| config.get("target").and_then(serde_json::Value::as_str))
        .unwrap_or("client");
    match target {
        "server" => return run_server_transform(program),
        "hydrate" => return hydrate::run(program, metadata.comments),
        "client" => {}
        unknown => panic!("Unknown Rue JSX compiler target: {unknown}"),
    }
    run_full_transform_with_options(program, true, true, metadata.comments)
}

// 测试入口：在单元测试中直接复用同样的转换逻辑
pub fn apply(program: Program) -> Program {
    run_full_transform(program, true, None)
}

/// Test/static entry for the server JSX target.
pub fn apply_server(program: Program) -> Program {
    run_server_transform(program)
}

/// Test/static entry for the hydration JSX target.
pub fn apply_hydrate(program: Program) -> Program {
    hydrate::run(program, None)
}

fn run_server_transform(program: Program) -> Program {
    run_node_plan_transform(program, false)
}

pub(crate) fn run_node_plan_transform(program: Program, hydrate: bool) -> Program {
    let mut program = program;
    pre::pre_directive::preserve(&mut program, None);
    let props_components = compiled_props::components(&program);
    let default_exported_components = match &program {
        Program::Module(module) => compiled_component::default_exported_component_spans(module),
        Program::Script(_) => Vec::new(),
    };
    if let Program::Module(module) = &mut program {
        compiled_component::lower_custom_hooks(module);
        compiled_component::lower_node_plan_hooks(module);
    }
    let mut transform = server::ServerTransform {
        did_transform: false,
        hydrate,
        next_node: 0,
        builtins: server::builtin_bindings(&program),
        slot_props: Default::default(),
        component_spans: default_exported_components,
    };
    program.visit_mut_with(&mut transform);
    if let Program::Module(module) = &mut program {
        compiled_component::flatten_provider_child_plans(module);
        compiled_props::lower(module, props_components);
        element_expr::normalize_renderable_string_factories(module);
        compiled_component::finalize_hooks(module);
        server::route_context_imports(module, hydrate);
        imports::ensure_runtime_imports(module);
    }
    assert_no_residual_jsx(&program);
    program
}

fn run_full_transform(
    program: Program,
    static_templates: bool,
    comments: Option<swc_core::plugin::proxies::PluginCommentsProxy>,
) -> Program {
    run_full_transform_with_options(program, static_templates, false, comments)
}

fn run_full_transform_with_options(
    program: Program,
    static_templates: bool,
    static_component_props: bool,
    comments: Option<swc_core::plugin::proxies::PluginCommentsProxy>,
) -> Program {
    let mut program = program;
    pre::pre_directive::preserve(&mut program, None);
    if let Err(error) = bootstrap::lower(&mut program) {
        if swc_core::common::errors::HANDLER.is_set() {
            swc_core::common::errors::HANDLER.with(|handler| {
                handler.struct_span_err(error.span, error.message).emit();
            });
            return program;
        }
        panic!("{}", error.message);
    }
    compiled_component::assert_closed_component_shapes(&program);
    let props_components = compiled_props::components(&program);
    let mut p = program;
    if let Program::Module(module) = &mut p {
        transition_identity::preserve(module);
        compiled_component::lower_custom_hooks(module);
    }
    log::info("rue-swc: apply(pre+vapor) start");
    element_children::reset_compiled_list_safety_cache();
    let compiled_components = if static_component_props {
        match &p {
            Program::Module(module) => compiled_component::analyze_module(module),
            Program::Script(_) => Default::default(),
        }
    } else {
        Default::default()
    };
    let mut compiled_component_names =
        compiled_components.keys().cloned().collect::<std::collections::HashSet<_>>();
    if static_component_props && let Program::Module(module) = &p {
        compiled_component_names.extend(compiled_component::imported_component_names(module));
    }
    let static_factory_names = compiled_component::function_component_names(&p);
    let strict_diagnostics = if static_component_props { diagnostics::collect(&p) } else { vec![] };
    if let Program::Module(module) = &mut p {
        compiled_component::lower_unspecialized_hooks(module, &compiled_components);
    }
    p.visit_mut_with(&mut pre::PreTransform::with_compiled_components(
        comments,
        compiled_component_names.clone(),
    ));
    compiled_component_names.extend(static_factory_names);
    if let Program::Module(module) = &mut p {
        compiled_component::transform_module(module, &compiled_components);
    }
    let mut vapor_transform = vapor::VaporTransform {
        next_el: 0,
        next_list: 0,
        next_map: 0,
        next_child: 0,
        once_depth: 0,
        did_transform: false,
        static_templates,
        el_tag_by_ident: std::collections::HashMap::new(),
        renderable_local_scopes: Vec::new(),
        plain_local_scopes: Vec::new(),
    };
    element_builtin::register(&mut vapor_transform, &p);
    let mut compiled_scope = std::collections::HashSet::new();
    vapor::VaporTransform::register_compiled_components(
        &mut compiled_scope,
        compiled_component_names,
    );
    vapor_transform.plain_local_scopes.push(compiled_scope);
    // Preprocessing and slot lowering can synthesize render closures containing JSX after the
    // visitor has already passed their parent. Reuse the same allocator/state until the AST is
    // closed, so generated identifiers remain unique across rounds.
    for _ in 0..4 {
        p.visit_mut_with(&mut vapor_transform);
        if first_residual_jsx_span(&p).is_none() {
            break;
        }
    }
    if let Program::Module(module) = &mut p {
        compiled_component::flatten_provider_child_plans(module);
        compiled_component::rewrite_static_roots(module);
        compiled_props::lower(module, props_components);
        element_expr::normalize_renderable_string_factories(module);
        state_path::hoist(module);
        compiled_component::finalize_hooks(module);
        element_list::erase_key_metadata(module);
    }
    if let Err(violation) = compiled_invariants::validate(&p) {
        panic!("{}", violation.diagnostic());
    }
    if let Program::Module(module) = &mut p {
        imports::ensure_runtime_imports(module);
    }
    assert_no_residual_jsx(&p);
    diagnostics::append_markers(&mut p, &strict_diagnostics);
    log::info("rue-swc: apply(pre+vapor) done");
    p
}

#[derive(Default)]
struct ResidualJsxDetector {
    first_span: Option<Span>,
}

impl Visit for ResidualJsxDetector {
    fn visit_jsx_element(&mut self, element: &JSXElement) {
        self.first_span.get_or_insert(element.span);
    }

    fn visit_jsx_fragment(&mut self, fragment: &JSXFragment) {
        self.first_span.get_or_insert(fragment.span);
    }
}

fn assert_no_residual_jsx(program: &Program) {
    if let Some(span) = first_residual_jsx_span(program) {
        panic!("Rue compiler left residual JSX at source span {span:?}");
    }
}

fn first_residual_jsx_span(program: &Program) -> Option<Span> {
    let mut detector = ResidualJsxDetector::default();
    program.visit_with(&mut detector);
    detector.first_span
}

/// 仅运行浅编译预处理（v-show/r-show、v-if/r-if），不进入 Vapor 深编译
pub fn apply_pre(program: Program) -> Program {
    let mut p = program;
    log::info("rue-swc: apply_pre start");
    pre::pre_directive::preserve(&mut p, None);
    p.visit_mut_with(&mut pre::PreTransform::default());
    log::info("rue-swc: apply_pre done");
    p
}

#[cfg(test)]
#[path = "lib_tests.rs"]
mod tests;
