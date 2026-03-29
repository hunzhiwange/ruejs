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
///   - 若已有从 `@rue-js/rue` 的 import，则仅追加缺失的 specifier；
///   - 若不存在，则在顶部插入新的 import，并保持稳定的导入顺序以便测试断言与可读性。
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
            "h",
            "_$vaporWithHookId",
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
            "_$vaporCreateVNode",
            "_$vaporShowStyle",
            "_$vaporBindUseRef",
            "_$setAttribute",
            "_$removeAttribute",
            "_$addEventListener",
            "_$removeEventListener",
            "_$setClassName",
            "_$setInnerHTML",
            "_$setValue",
            "_$setChecked",
            "_$setDisabled",
            "useSetup",
            "signal",
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

/// 基于模块实际使用情况按需从 `@rue-js/rue` 注入运行时导入。
/// 若已存在相同源的 import，则仅追加缺失的 specifier；否则在模块顶部插入新的 import。
pub fn ensure_runtime_imports(m: &mut Module) {
    crate::log::debug("rue-swc: ensure_runtime_imports start");
    let import_source = Str { span: DUMMY_SP, value: Atom::from("@rue-js/rue").into(), raw: None };

    let mut collector = RuntimeUseCollector::new();
    m.visit_with(&mut collector);

    let mut need: Vec<(String, bool)> =
        collector.used_values.iter().map(|s| (s.clone(), false)).collect();
    let need_type: Vec<(String, bool)> =
        collector.used_types.iter().map(|s| (s.clone(), true)).collect();

    if need.is_empty() && need_type.is_empty() {
        crate::log::debug("rue-swc: ensure_runtime_imports none");
        return;
    }

    // 为了稳定输出顺序，按预定义序列排序值导入
    // 说明：稳定的导入顺序有助于避免测试快照抖动，并提升读者的熟悉成本
    let order: Vec<&str> = vec![
        "vapor",
        "onBeforeUnmount",
        "h",
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
        "_$vaporCreateVNode",
        "_$vaporShowStyle",
        "_$vaporBindUseRef",
        "_$vaporWithHookId",
        "_$setAttribute",
        "_$removeAttribute",
        "_$addEventListener",
        "_$removeEventListener",
        "_$setClassName",
        "_$setInnerHTML",
        "_$setValue",
        "_$setChecked",
        "_$setDisabled",
        "useSetup",
        "signal",
    ];
    let rank: std::collections::HashMap<&str, usize> =
        order.iter().enumerate().map(|(i, s)| (*s, i)).collect();
    need.sort_by_key(|(name, _)| rank.get(name.as_str()).cloned().unwrap_or(usize::MAX));

    let mut merged = false;
    for item in &mut m.body {
        if let ModuleItem::ModuleDecl(ModuleDecl::Import(ref mut decl)) = item {
            if decl.src.value.as_str() == Some("@rue-js/rue") {
                // 先追加类型导入，再按排序后的值导入
                // 去重策略：若已存在同名 specifier（默认/命名/命名空间），则跳过追加
                for (name, is_type_only) in need_type.iter().chain(need.iter()) {
                    let exists = decl.specifiers.iter().any(|s| match s {
                        ImportSpecifier::Named(n) => n.local.sym.as_ref() == name,
                        ImportSpecifier::Default(d) => d.local.sym.as_ref() == name,
                        ImportSpecifier::Namespace(ns) => ns.local.sym.as_ref() == name,
                    });
                    if !exists {
                        decl.specifiers.push(ImportSpecifier::Named(ImportNamedSpecifier {
                            span: DUMMY_SP,
                            local: Ident::new(
                                Atom::from(name.as_str()),
                                DUMMY_SP,
                                SyntaxContext::empty(),
                            ),
                            imported: None,
                            is_type_only: *is_type_only,
                        }));
                    }
                }
                merged = true;
                crate::log::debug("rue-swc: merge existing @rue-js/rue import");
                break;
            }
        }
    }

    if !merged {
        crate::log::debug("rue-swc: insert new @rue-js/rue import");
        let mut specifiers: Vec<ImportSpecifier> = Vec::new();
        // 先类型，再值导入（已排序）
        for (name, is_type_only) in need_type.into_iter().chain(need.into_iter()) {
            specifiers.push(ImportSpecifier::Named(ImportNamedSpecifier {
                span: DUMMY_SP,
                local: Ident::new(Atom::from(name.as_str()), DUMMY_SP, SyntaxContext::empty()),
                imported: None,
                is_type_only,
            }));
        }
        // 在模块顶部插入新的 import，保持导入源一致（'@rue-js/rue'）
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
}
