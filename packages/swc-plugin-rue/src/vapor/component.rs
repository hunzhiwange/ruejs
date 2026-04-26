use swc_core::common::{DUMMY_SP, SyntaxContext};
use swc_core::ecma::ast::*;

use crate::emit::*;

use super::VaporTransform;

/*
组件块编译说明（中文）：
- 使用 DocumentFragment 作为组件片段根，并在其下插入 "rue:component:anchor" 注释锚点；
- 若存在内联 children，则复用 element_component 的共享改写逻辑，保持 TransitionGroup 原始 JSX children、简单字面量快路径与 children vapor 包裹语义一致；
- 静态组件直接一次性渲染（renderAnchor）；动态组件通过 watchEffect 包裹以支持响应式更新。
*/
/// 组件根渲染块：
/// - 根为 `DocumentFragment`，在其下插入组件占位注释
/// - 若组件存在内联 children，则复用普通组件元素路径的 children -> props 改写
/// - 使用 `watchEffect` + `renderBetween` 在占位注释之间渲染组件本身
///   参考测试：`tests/components.rs`、`tests/spec11.rs`
pub fn emit_component_root(transform: &mut VaporTransform, el: &JSXElement) -> BlockStmt {
    let root = ident("_root");
    let mut stmts: Vec<Stmt> = Vec::new();

    // 组件片段根创建
    let create_root = call_ident("_$createDocumentFragment", vec![]);
    stmts.push(const_decl(root.clone(), create_root));

    let mut comp_el = el.clone();
    let rewrite =
        crate::element_component::rewrite_component_children_to_props(transform, &mut comp_el);
    let slot_init_expr = rewrite
        .direct_render_expr
        .clone()
        .unwrap_or_else(|| Expr::JSXElement(Box::new(comp_el.clone())));

    // 静态判断：无动态 props/children 的组件直接一次性渲染（renderAnchor），否则走 watch 包裹
    let is_static = !crate::utils::is_transition_group_component(&comp_el)
        && (crate::utils::is_static_component_without_props(&comp_el)
            || crate::utils::component_has_no_dynamic_props_excluding_children(&comp_el)
            || crate::utils::is_static_component_children_ident(&comp_el));

    let anchor = transform.next_list_ident();
    let make_anchor = call_ident("_$createComment", vec![string_expr("rue:component:anchor")]);
    stmts.push(const_decl(anchor.clone(), make_anchor));
    stmts.push(append_child(root.clone(), Expr::Ident(anchor.clone())));

    if !rewrite.stmts.is_empty() {
        for s in rewrite.stmts {
            stmts.push(s);
        }
    }

    let slot_ident = transform.next_slot_ident();
    let render_call = Expr::Call(CallExpr {
        span: DUMMY_SP,
        callee: Callee::Expr(Box::new(Expr::Ident(ident("renderAnchor")))),
        args: vec![
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(slot_ident.clone())) },
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(root.clone())) },
            ExprOrSpread { spread: None, expr: Box::new(Expr::Ident(anchor.clone())) },
        ],
        type_args: None,
        ctxt: SyntaxContext::empty(),
    });

    if is_static {
        stmts.push(Stmt::Decl(Decl::Var(Box::new(VarDecl {
            span: DUMMY_SP,
            ctxt: SyntaxContext::empty(),
            decls: vec![VarDeclarator {
                span: DUMMY_SP,
                name: Pat::Ident(BindingIdent { id: slot_ident.clone(), type_ann: None }),
                init: Some(Box::new(slot_init_expr.clone())),
                definite: false,
            }],
            kind: VarDeclKind::Const,
            declare: false,
        }))));
        stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(render_call) }));
    } else {
        let decl_slot = const_decl(slot_ident.clone(), slot_init_expr.clone());
        let render_arrow = Expr::Arrow(ArrowExpr {
            span: DUMMY_SP,
            params: vec![],
            body: Box::new(BlockStmtOrExpr::BlockStmt(BlockStmt {
                span: DUMMY_SP,
                ctxt: SyntaxContext::empty(),
                stmts: vec![
                    decl_slot,
                    Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(render_call) }),
                ],
            })),
            is_async: false,
            is_generator: false,
            type_params: None,
            return_type: None,
            ctxt: SyntaxContext::empty(),
        });
        let watch = call_ident("watchEffect", vec![render_arrow]);
        stmts.push(Stmt::Expr(ExprStmt { span: DUMMY_SP, expr: Box::new(watch) }));
    }

    stmts.push(return_root(root.clone()));
    BlockStmt { span: DUMMY_SP, ctxt: SyntaxContext::empty(), stmts }
}
