use std::collections::HashSet;
// 原子字符串类型：更高效的字符串存储与比较（用于标识符/字符串字面量）
use swc_core::atoms::Atom;
// SWC 常量与上下文：
// - DUMMY_SP：稳定的“占位”源码位置信息
// - SyntaxContext：语义上下文（此处统一 empty()）
use swc_core::common::{DUMMY_SP, SyntaxContext};
// SWC ECMAScript AST 节点类型集合（Module/ImportDecl/Ident 等）
use swc_core::ecma::ast::*;
// SWC 只读访问器：
// - Visit：只读遍历接口
// - VisitWith：在节点上执行只读访问器
use swc_core::ecma::visit::{Visit, VisitWith};

/// 运行时导入收集与按需注入：
/// - `RuntimeUseCollector` 通过遍历表达式与类型引用，收集使用到的运行时符号与类型（如 `FC`）。
/// - `ensure_runtime_imports` 在模块级：
///   - 类型导入仍从 `@rue-js/rue` 注入，保持作者侧公开入口稳定；
///   - Vapor helper 值导入改为 `@rue-js/rue/vapor`，将编译产物依赖从默认入口收窄到专用子入口；
///   - 若对应 source 已存在 import，则仅追加缺失的 specifier；否则在顶部插入新的 import。
/// - 设计权衡：按需导入避免“全量导入”造成的未使用警告与打包体积波动，同时保证多次转换只产生一次导入。
struct RuntimeUseCollector {
    known_values: HashSet<&'static str>,
    used_values: HashSet<String>,
    used_types: HashSet<String>,
}

impl RuntimeUseCollector {
    fn new() -> Self {
        let known_values: HashSet<&'static str> = [
            "vapor",
            "onBeforeUnmount",
            "_$vaporWithHookId",
            "renderAnchor",
            "renderBetween",
            "_$createElement",
            "_$createComment",
            "_$createTextNode",
            "_$setStyle",
            "_$settextContent",
            "_$createDocumentFragment",
            "_$appendChild",
            "watchEffect",
            "_$vaporKeyedList",
            "_$createTextWrapper",
            "_$vaporWithKey",
            "_$vaporShowStyle",
            "_$vaporBindUseRef",
            "_$setAttribute",
            "_$addEventListener",
            "_$setClassName",
            "_$setInnerHTML",
            "_$setValue",
            "_$setChecked",
            "_$setDisabled",
            "useSetup",
        ]
        .into_iter()
        .collect();
        Self { known_values, used_values: HashSet::new(), used_types: HashSet::new() }
    }
}

impl Visit for RuntimeUseCollector {
    fn visit_expr(&mut self, e: &Expr) {
        if let Expr::Ident(i) = e {
            let name = i.sym.as_ref();
            if self.known_values.contains(name) {
                self.used_values.insert(name.to_string());
            }
        }
        e.visit_children_with(self);
    }

    fn visit_ts_type_ref(&mut self, t: &TsTypeRef) {
        if let TsEntityName::Ident(id) = &t.type_name {
            if id.sym.as_ref() == "FC" {
                self.used_types.insert("FC".to_string());
            }
        }
        t.visit_children_with(self);
    }
}

fn append_missing_specifiers(decl: &mut ImportDecl, specs: &[(String, bool)]) {
    for (name, is_type_only) in specs {
        let exists = decl.specifiers.iter().any(|s| match s {
            ImportSpecifier::Named(n) => n.local.sym.as_ref() == name,
            ImportSpecifier::Default(d) => d.local.sym.as_ref() == name,
            ImportSpecifier::Namespace(ns) => ns.local.sym.as_ref() == name,
        });
        if !exists {
            decl.specifiers.push(ImportSpecifier::Named(ImportNamedSpecifier {
                span: DUMMY_SP,
                local: Ident::new(Atom::from(name.as_str()), DUMMY_SP, SyntaxContext::empty()),
                imported: None,
                is_type_only: *is_type_only,
            }));
        }
    }
}

fn insert_import(m: &mut Module, import_source: &Str, specs: Vec<(String, bool)>) {
    let mut specifiers: Vec<ImportSpecifier> = Vec::new();
    for (name, is_type_only) in specs {
        specifiers.push(ImportSpecifier::Named(ImportNamedSpecifier {
            span: DUMMY_SP,
            local: Ident::new(Atom::from(name.as_str()), DUMMY_SP, SyntaxContext::empty()),
            imported: None,
            is_type_only,
        }));
    }
    let import = ModuleItem::ModuleDecl(ModuleDecl::Import(ImportDecl {
        span: DUMMY_SP,
        specifiers,
        src: Box::new(import_source.clone()),
        type_only: false,
        with: None,
        phase: Default::default(),
    }));
    m.body.insert(0, import);
}

/// 基于模块实际使用情况按需注入运行时导入。
/// 类型走 `@rue-js/rue`，值 helper 走 `@rue-js/rue/vapor`。
pub fn ensure_runtime_imports(m: &mut Module) {
    crate::log::debug("rue-swc: ensure_runtime_imports start");
    let type_import_source =
        Str { span: DUMMY_SP, value: Atom::from("@rue-js/rue").into(), raw: None };
    let helper_import_source =
        Str { span: DUMMY_SP, value: Atom::from("@rue-js/rue/vapor").into(), raw: None };

    let mut collector = RuntimeUseCollector::new();
    m.visit_with(&mut collector);

    let mut helper_specs: Vec<(String, bool)> =
        collector.used_values.iter().map(|s| (s.clone(), false)).collect();
    let type_specs: Vec<(String, bool)> =
        collector.used_types.iter().map(|s| (s.clone(), true)).collect();

    if helper_specs.is_empty() && type_specs.is_empty() {
        crate::log::debug("rue-swc: ensure_runtime_imports none");
        return;
    }

    // 为了稳定输出顺序，按预定义序列排序值导入
    // 说明：稳定的导入顺序有助于避免测试快照抖动，并提升读者的熟悉成本
    let order: Vec<&str> = vec![
        "vapor",
        "onBeforeUnmount",
        "renderAnchor",
        "renderBetween",
        "_$createElement",
        "_$createComment",
        "_$createTextNode",
        "_$setStyle",
        "_$settextContent",
        "_$createDocumentFragment",
        "_$appendChild",
        "watchEffect",
        "_$vaporKeyedList",
        "_$createTextWrapper",
        "_$vaporWithKey",
        "_$vaporShowStyle",
        "_$vaporBindUseRef",
        "_$vaporWithHookId",
        "_$setAttribute",
        "_$addEventListener",
        "_$setClassName",
        "_$setInnerHTML",
        "_$setValue",
        "_$setChecked",
        "_$setDisabled",
        "useSetup",
    ];
    let rank: std::collections::HashMap<&str, usize> =
        order.iter().enumerate().map(|(i, s)| (*s, i)).collect();
    helper_specs.sort_by_key(|(name, _)| rank.get(name.as_str()).cloned().unwrap_or(usize::MAX));

    let mut merged_type = type_specs.is_empty();
    let mut merged_helper = helper_specs.is_empty();
    for item in &mut m.body {
        if let ModuleItem::ModuleDecl(ModuleDecl::Import(ref mut decl)) = item {
            if !merged_type && decl.src.value.as_str() == Some("@rue-js/rue") {
                append_missing_specifiers(decl, &type_specs);
                merged_type = true;
                crate::log::debug("rue-swc: merge existing @rue-js/rue import");
            }
            if !merged_helper && decl.src.value.as_str() == Some("@rue-js/rue/vapor") {
                append_missing_specifiers(decl, &helper_specs);
                merged_helper = true;
                crate::log::debug("rue-swc: merge existing @rue-js/rue/vapor import");
            }
            if merged_type && merged_helper {
                break;
            }
        }
    }

    if !merged_helper {
        crate::log::debug("rue-swc: insert new @rue-js/rue/vapor import");
        insert_import(m, &helper_import_source, helper_specs);
    }

    if !merged_type {
        crate::log::debug("rue-swc: insert new @rue-js/rue import");
        insert_import(m, &type_import_source, type_specs);
    }
}
